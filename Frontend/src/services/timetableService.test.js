import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { randomUUID } from 'node:crypto'
import * as utils from '../utils/timetableUtils.js'
import * as planner from '../utils/timetablePlanner.js'
import * as periods from '../utils/timetablePeriods.js'

const source = readFileSync(new URL('./timetableService.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replaceAll('export const ', 'const ')
const scope = { academicYearId: '1', courseId: '2', branchId: '3', semesterId: '4', sectionId: '5' }
const entry = { subjectId: '6', facultyId: '7', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00', classroom: 'Room 1' }
const config = { calendar: { startDate: '2026-09-01', endDate: '2026-12-01', workingDays: ['MONDAY', 'TUESDAY'], holidays: ['2026-09-07'], reviewed: true }, periods: [{ id: 'p1', startTime: '09:00', endTime: '10:00' }, { id: 'p2', startTime: '10:00', endTime: '11:00' }], rooms: ['text:room 1'], requirements: { 6: { periodsPerWeek: 1 } } }
function setup() {
  const storage = new Map(), backend = []
  let fail = false, quota = false, facultyActive = true
  const api = rows => ({ getAll: async () => rows })
  const context = vm.createContext({ ...utils, ...planner, ...periods, crypto: { randomUUID }, navigator: {}, getAuthStorage: () => ({ getItem: () => 'test-user' }),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (quota) throw new Error('Storage full'); storage.set(key, value) } },
    academicYearApi: api([{ id: 1, startDate: '2026-01-01', endDate: '2026-12-31' }]), courseApi: api([{ id: 2 }]), branchApi: api([{ id: 3, courseId: 2 }]), sectionApi: api([{ ...scope, sectionId: 5, room: 'Room 1' }]),
    facultyApi: { getAll: async () => [{ facultyId: 7, status: facultyActive }] },
    facultyMasterApi: { getSubjects: async () => [{ ...scope, subjectId: 6, subjectName: 'DBMS' }], getSemesters: async () => [{ ...scope, id: 4 }] },
    facultySubjectAllocationApi: api([{ ...scope, facultyId: 7, subjectId: 6 }]),
    timetableEntryApi: { list: async () => { if (fail) throw new Error('Backend unavailable'); return backend } },
  })
  vm.runInContext(`${source}\nthis.service = localTimetableService;`, context)
  return { service: context.service, storage, backend, fail: () => { fail = true }, quota: () => { quota = true }, deactivateFaculty: () => { facultyActive = false } }
}
test('create, save draft, edit, publish, reopen and remove operate on one set of records', async () => {
  const { service } = setup()
  const table = await service.create(scope, 'Section A')
  await assert.rejects(service.create(scope, 'Duplicate'), /already exists/)
  const saved = await service.saveEntry(table.id, table.revision, entry)
  assert.equal(saved.entries.length, 1)
  const edited = await service.saveEntry(table.id, saved.revision, { ...saved.entries[0], dayOfWeek: 'TUESDAY' })
  assert.equal(edited.entries.length, 1)
  assert.equal(edited.entries[0].id, saved.entries[0].id)
  const planned = await service.savePlanning(table.id, edited.revision, config)
  await service.publish(table.id, planned.revision)
  const published = (await service.list())[0]
  assert.equal(published.publicationStatus, 'published')
  await assert.rejects(service.saveEntry(table.id, published.revision, entry), /Draft/)
  await service.reopen(table.id, published.revision)
  const draft = (await service.list())[0]
  await service.removeEntry(table.id, draft.revision, draft.entries[0].id)
  assert.equal((await service.list())[0].entries.length, 0)
})
test('stale edits, failed backend reads, and failed storage writes never report persisted success', async () => {
  const fixture = setup(), { service } = fixture
  const table = await service.create(scope, 'Section A')
  await assert.rejects(service.saveEntry(table.id, 0, entry), /another tab/)
  fixture.quota()
  await assert.rejects(service.saveEntry(table.id, 1, entry), /Storage full/)
  assert.equal((await service.list())[0].entries.length, 0)
  fixture.fail()
  await assert.rejects(service.saveEntry(table.id, 1, entry), /Backend unavailable/)
  assert.equal((await service.list())[0].entries.length, 0)
})
test('new backend clashes and changed allocations block final publication', async () => {
  const fixture = setup(), { service } = fixture
  const table = await service.create(scope, 'Section A')
  const saved = await service.saveEntry(table.id, 1, entry)
  const planned = await service.savePlanning(table.id, saved.revision, config)
  fixture.backend.push({ ...entry, ...scope, timetableEntryId: 99, startTime: '09:30:00', endTime: '10:30:00' })
  await assert.rejects(service.publish(table.id, planned.revision), /conflict/)
  assert.equal((await service.list())[0].publicationStatus, 'draft')
  fixture.backend.length = 0; fixture.deactivateFaculty()
  await assert.rejects(service.publish(table.id, planned.revision), /faculty/)
})
test('corrupt timetable storage rejects instead of silently resetting schedules', async () => {
  const fixture = setup()
  fixture.storage.set('pirnav-timetables-v1:test-user', '{bad')
  await assert.rejects(fixture.service.list())
  assert.equal(fixture.storage.get('pirnav-timetables-v1:test-user'), '{bad')
})
test('generation saves one draft; missing slots preserve manual changes; full regeneration needs confirmation', async () => {
  const { service } = setup()
  const table = await service.generate(scope, 'Generated', config)
  assert.equal(table.entries.length, 1)
  const edited = await service.saveEntry(table.id, table.revision, { ...table.entries[0], dayOfWeek: 'TUESDAY' })
  await assert.rejects(service.generate(scope, table.name, config, { tableId: table.id, revision: edited.revision, replace: true }), /Confirm/)
  const missing = await service.generate(scope, table.name, { ...config, requirements: { 6: { periodsPerWeek: 2 } } }, { tableId: table.id, revision: edited.revision, confirmed: true })
  assert.equal(missing.added, 1)
  assert.equal(missing.entries[0].id, edited.entries[0].id)
  assert.equal(missing.entries[0].dayOfWeek, 'TUESDAY')
  assert.equal(missing.entries[0].generated, false)
  const replaced = await service.generate(scope, table.name, config, { tableId: table.id, revision: missing.revision, replace: true, confirmed: true })
  assert.equal(replaced.entries.length, 1)
  assert.notEqual(replaced.entries[0].id, edited.entries[0].id)
  await service.publish(table.id, replaced.revision)
  assert.equal((await service.list())[0].publicationStatus, 'published')
})
test('generation failures preserve drafts and never fallback after backend errors', async () => {
  const fixture = setup(), { service } = fixture
  const table = await service.generate(scope, 'Generated', config)
  const before = JSON.stringify(await service.list())
  await assert.rejects(service.generate(scope, table.name, { ...config, calendar: { ...config.calendar, reviewed: false } }, { tableId: table.id, revision: table.revision, replace: true, confirmed: true }), /Review/)
  assert.equal(JSON.stringify(await service.list()), before)
  fixture.fail()
  await assert.rejects(service.generate(scope, table.name, config, { tableId: table.id, revision: table.revision, replace: true, confirmed: true }), /Backend unavailable/)
  assert.equal(JSON.stringify(await service.list()), before)
})
test('incomplete requirements and unreviewed legacy drafts cannot publish', async () => {
  const { service } = setup()
  const table = await service.create(scope, 'Legacy')
  const saved = await service.saveEntry(table.id, table.revision, entry)
  await assert.rejects(service.publish(table.id, saved.revision), /Review/)
  const planned = await service.savePlanning(table.id, saved.revision, { ...config, requirements: { 6: { periodsPerWeek: 2 } } })
  await assert.rejects(service.publish(table.id, planned.revision), /unscheduled/)
})

test('Validate reads fresh records without saving or publishing; stale revisions and conflicts block it', async () => {
  const fixture = setup(), { service } = fixture
  const table = await service.generate(scope, 'Validate draft', config)
  const before = JSON.stringify(await service.list())
  assert.equal((await service.validate(table.id, table.revision)).valid, true)
  assert.equal(JSON.stringify(await service.list()), before)
  await assert.rejects(service.validate(table.id, table.revision - 1), /another tab/)
  fixture.backend.push({ ...table.entries[0], id: 'external', timetableEntryId: 'external', sectionId: 'other', timetableId: 'server' })
  await assert.rejects(service.validate(table.id, table.revision), /conflict/)
  assert.equal(JSON.stringify(await service.list()), before)
  fixture.fail()
  await assert.rejects(service.validate(table.id, table.revision), /Backend unavailable/)
})

test('manual setup creates an empty draft; break saves and unsafe setup edits are atomic', async () => {
  const { service } = setup()
  const plan = { ...config, periods: periods.automaticPeriods(periods.DEFAULT_PERIOD_SETUP).periods }
  const table = await service.setup(scope, 'Manual draft', plan)
  assert.equal(table.entries.length, 0)
  assert.equal(table.publicationStatus, 'draft')
  await assert.rejects(service.setup(scope, 'Duplicate', plan), /already exists/)
  await assert.rejects(service.saveEntry(table.id, table.revision, { ...entry, startTime: '11:00', endTime: '11:15' }), /Break or Lunch/)
  const saved = await service.saveEntry(table.id, table.revision, entry)
  const before = JSON.stringify(await service.list())
  await assert.rejects(service.setup(scope, table.name, { ...plan, periods: plan.periods.map((row, index) => index === 0 ? { ...row, type: 'break' } : row) }, { tableId: table.id, revision: saved.revision }), /Break or Lunch/)
  assert.equal(JSON.stringify(await service.list()), before)
  await service.publish(table.id, saved.revision)
  assert.equal((await service.list())[0].publicationStatus, 'published')
})

test('manual timetable without weekly frequency validates and publishes without guessing repetitions', async () => {
  const { service } = setup()
  const plan = { ...config, requirements: {} }
  const table = await service.setup(scope, 'Manual only', plan)
  const saved = await service.saveEntry(table.id, table.revision, entry)
  const result = await service.validate(table.id, saved.revision)
  assert.equal(result.checks.length, 5)
  assert.equal(result.warnings.length, 1)
  const missing = await service.generate(scope, table.name, plan, { tableId: table.id, revision: saved.revision, confirmed: true })
  assert.equal(missing.added, 0)
  assert.equal(missing.entries[0].id, saved.entries[0].id)
  await service.publish(table.id, missing.revision)
  assert.equal((await service.list())[0].entries.length, 1)
})
