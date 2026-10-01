import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyPeriods, DAILY_PERIOD_SETUP } from '../../utils/timetablePeriods.js'
import { conflictsFor } from '../../utils/timetableUtils.js'
import { generateSections, tableEntries, availableSlots, validateTable, changeContext, scopeSections, publishedForFaculty } from './timetableDomain.js'
import { createDraftAdapter, DRAFT_STORAGE_KEY } from './timetableDraftAdapter.js'

const scope = { academicYearId: '1', departmentId: '2', courseId: '3', branchId: '4', level: '2', semesterId: '5' }
const sources = {
  years: [{ id: '1', name: '2026', startDate: '2026-01-01', endDate: '2026-12-31' }], departments: [{ id: '2', name: 'CSE' }], courses: [{ id: '3', name: 'BTech' }], branches: [{ id: '4', name: 'CSE', courseId: '3', departmentId: '2' }], semesters: [{ id: '5', semesterNumber: 3, name: 'Sem3' }],
  sections: ['6', '7'].map(id => ({ ...scope, id, name: `Section ${id}`, room: `Room ${id}` })),
  subjects: ['8', '9'].map(id => ({ ...scope, id, name: `Subject ${id}`, subjectType: 'THEORY' })),
  faculty: [{ id: '10', name: 'Faculty', userId: '99' }],
  allocations: ['6', '7'].flatMap(sectionId => ['8', '9'].map(subjectId => ({ ...scope, sectionId, subjectId, facultyId: '10', periodsPerWeek: 2 }))),
}
const config = { automatic: DAILY_PERIOD_SETUP, periods: dailyPeriods(DAILY_PERIOD_SETUP).periods, rooms: ['text:room 6', 'text:room 7'], calendar: { reviewed: true, startDate: '2026-01-01', endDate: '2026-12-31', holidays: ['2026-09-28'], workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY'] }, requirements: { 9: { selected: false } } }
const generate = (overrides = {}) => { let i = 0; return generateSections({ tables: [], selected: ['6', '7'], scope, sources, config, backend: [], makeId: () => `id-${++i}`, ...overrides }) }
test('daily count computes the requested end time and rejects invalid counts, placements and midnight overflow', () => {
  const result = dailyPeriods(DAILY_PERIOD_SETUP)
  assert.equal(result.endTime, '16:00')
  assert.equal(result.periods.filter(row => row.type === 'class').length, 7)
  assert.deepEqual(result.periods.map(row => row.startTime), ['09:00', '09:50', '10:40', '11:00', '11:50', '12:40', '13:30', '14:20', '15:10'])
  for (const invalid of [{ periodsPerDay: 0 }, { duration: -1 }, { startTime: '23:00' }, { breakAfter: 8 }, { lunchDuration: -2 }]) assert.ok(dailyPeriods({ ...DAILY_PERIOD_SETUP, ...invalid }).errors.length)
})
test('hierarchy defaults all valid active sections and clears descendants by IDs', () => {
  assert.equal(scopeSections(sources, scope).length, 2)
  assert.equal(scopeSections(sources, { ...scope, departmentId: 'wrong' }).length, 0)
  assert.deepEqual(changeContext(scope, 'courseId', '33'), { academicYearId: '1', departmentId: '2', courseId: '33', branchId: '', level: '', semesterId: '' })
})
test('coordinated generation excludes deselected subjects, spreads theory, and checks other departments', () => {
  const backend = [{ id: 'external', sectionId: '100', facultyId: '10', dayOfWeek: 'MONDAY', startTime: '09:20', endTime: '10:10', classroom: 'Elsewhere' }]
  const result = generate({ backend })
  assert.deepEqual(result.map(table => table.entries.map(row => [row.dayOfWeek, row.startTime])), generate({ backend }).map(table => table.entries.map(row => [row.dayOfWeek, row.startTime])))
  assert.equal(result.length, 2)
  assert.ok(result.every(table => table.publicationStatus === 'draft' && table.entries.length === 2 && new Set(table.entries.map(row => row.dayOfWeek)).size === 2))
  const all = [...backend, ...tableEntries(result)]
  assert.ok(tableEntries(result).every(row => row.subjectId === '8' && !conflictsFor(row, all).length))
})
test('manual moves, generated classes and IDs survive Generate Missing; Regenerate preserves manual work', () => {
  const original = generate(), row = { ...original[0].entries[0], generated: false }
  original[0].entries[0] = row
  const missing = generate({ tables: original })
  assert.deepEqual(missing.map(table => table.entries), original.map(table => table.entries))
  const regenerated = generate({ tables: original, replace: true, makeId: (() => { let i = 100; return () => `regen-${i++}` })() })
  assert.deepEqual(regenerated[0].entries.find(item => item.id === row.id), row)
})
test('unmet allocation demand is explicit, validation identifies exact cells and suggestions avoid collisions', () => {
  const noFaculty = generate({ sources: { ...sources, allocations: [] } })
  assert.ok(noFaculty.every(table => !table.entries.length && table.issues.length))
  const tables = generate(), row = tables[0].entries[0]
  const occupied = [...tableEntries(tables), { ...row, id: 'other', sectionId: '44', subjectId: '9' }]
  const issues = validateTable(tables[0], sources, occupied)
  assert.ok(issues.some(issue => issue.entryId === row.id && issue.sectionId === '6'))
  const alternatives = availableSlots(row, tables[0], sources, occupied)
  assert.ok(alternatives.length)
  assert.ok(alternatives.every(candidate => !conflictsFor(candidate, occupied).length))
})
test('published faculty schedules aggregate sections, exclude drafts and skip holiday occurrences without mutating templates', () => {
  const tables = generate().map(table => ({ ...table, publicationStatus: 'published' }))
  const entries = tableEntries(tables), before = JSON.stringify(tables)
  assert.equal(publishedForFaculty('10', entries, tables).length, 4)
  assert.equal(publishedForFaculty('10', entries, tables, '2026-09-28').length, 0)
  assert.equal(publishedForFaculty('different', entries, tables).length, 0)
  assert.equal(JSON.stringify(tables), before)
  assert.equal(publishedForFaculty('10', tableEntries(generate()), tables).length, 0)
})
test('adapter is atomic, revalidates fresh backend state, rejects stale writes and propagates API failures', async () => {
  const storage = new Map(); let backend = [], failed = false, authorized = true, counter = 0
  const adapter = createDraftAdapter({ storage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }, authorize: () => { if (!authorized) throw new Error('Forbidden') }, loadLive: async () => { if (failed) throw new Error('API 500'); return { sources, backend } }, makeId: () => `adapter-${++counter}` })
  const tables = await adapter.generate({ scope, selected: ['6', '7'], config, expected: [] })
  const before = storage.get(DRAFT_STORAGE_KEY)
  failed = true
  await assert.rejects(adapter.publish(tables), /API 500/)
  assert.equal(storage.get(DRAFT_STORAGE_KEY), before)
  failed = false
  backend = [{ ...tables[0].entries[0], id: 'new-backend', sectionId: '99' }]
  await assert.rejects(adapter.publish(tables), /conflict/)
  assert.equal(storage.get(DRAFT_STORAGE_KEY), before)
  backend = []
  assert.deepEqual(await adapter.validate(tables), [])
  await adapter.publish(tables)
  await assert.rejects(adapter.saveEntry(tables[0], tables[0].entries[0]), /another tab/)
  assert.ok((await adapter.list()).every(table => table.publicationStatus === 'published'))
  authorized = false
  await assert.rejects(adapter.generate({ scope, selected: ['6'], config, expected: [] }), /Forbidden/)
})
test('draft settings cannot invalidate saved manual work; edits and removal use current revisions', async () => {
  let saved = null, index = 0
  const adapter = createDraftAdapter({ storage: { getItem: () => saved, setItem: (_, value) => { saved = value } }, authorize: () => {}, loadLive: async () => ({ sources, backend: [] }), makeId: () => `edit-${++index}` })
  let tables = await adapter.generate({ scope, selected: ['6'], config, expected: [] })
  const first = tables[0].entries[0]
  tables = await adapter.saveEntry(tables[0], { ...first, dayOfWeek: 'WEDNESDAY' })
  assert.equal(tables[0].entries[0].generated, false)
  const before = saved
  await assert.rejects(adapter.saveSetup(tables, { ...config, requirements: { 8: { selected: false }, 9: { selected: false } } }), /invalidate existing classes/)
  assert.equal(saved, before)
  tables = await adapter.saveSetup(tables, { ...config, calendar: { ...config.calendar, endDate: '2026-12-01' } })
  assert.equal(tables[0].planning.calendar.endDate, '2026-12-01')
  const oldRevision = tables[0]
  tables = await adapter.removeEntry(tables[0], first.id)
  assert.equal(tables[0].entries.length, 1)
  await assert.rejects(adapter.removeEntry(oldRevision, first.id), /another tab/)
})
