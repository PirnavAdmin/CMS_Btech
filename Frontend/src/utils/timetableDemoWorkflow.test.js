import test from 'node:test'
import assert from 'node:assert/strict'
import { demoAcademicData, defaultDemoSettings } from '../services/timetableMockData.js'
import { initialTimetableDemoState, timetableDemoService } from '../services/timetableDemoService.js'
import { buildDemoPeriods, demoEntryPeriodIndices, generateDemoTimetables } from './timetableDemoGenerator.js'
import { validateDemoEntry } from './timetableDemoValidator.js'

const scope = { branchId: 'branch-cse', semesterId: 'sem-3' }

test('builds common daily periods including the configured break and lunch', () => {
  const slots = buildDemoPeriods(defaultDemoSettings)
  assert.deepEqual(slots.filter(row => row.type === 'CLASS').map(row => [row.name, row.startTime, row.endTime]), [
    ['P1', '09:00', '09:50'], ['P2', '09:50', '10:40'], ['P3', '11:00', '11:50'], ['P4', '11:50', '12:40'], ['P5', '13:30', '14:20'], ['P6', '14:20', '15:10'], ['P7', '15:10', '16:00'],
  ])
  assert.deepEqual(slots.filter(row => row.type !== 'CLASS').map(row => row.name), ['BREAK', 'LUNCH'])
})

test('generates separate schedules for all three sections without faculty or room clashes', () => {
  const generated = generateDemoTimetables(initialTimetableDemoState(), scope)
  const sectionIds = ['sec-cse-a', 'sec-cse-b', 'sec-cse-c']
  assert.deepEqual(sectionIds.map(id => generated.schedules[id].entries.length), [19, 19, 19])
  assert.equal(generated.unscheduled.length, 0)
  const entries = sectionIds.flatMap(id => generated.schedules[id].entries)
  const labClasses = entries.filter(row => row.subjectId === 'sub-dbmsp')
  assert.equal(labClasses.length, 3)
  for (const lab of labClasses) assert.equal(demoEntryPeriodIndices(lab).length, 2)
  for (let left = 0; left < entries.length; left += 1) for (let right = left + 1; right < entries.length; right += 1) {
    const a = entries[left], b = entries[right]
    if (a.dayOfWeek !== b.dayOfWeek || !demoEntryPeriodIndices(a).some(index => demoEntryPeriodIndices(b).includes(index))) continue
    assert.notEqual(a.facultyId, b.facultyId)
    assert.notEqual(a.roomId, b.roomId)
    if (a.sectionId === b.sectionId) assert.fail('A section has overlapping classes')
  }
  assert.notDeepEqual(generated.schedules['sec-cse-a'].entries.map(row => row.periodIndex), generated.schedules['sec-cse-b'].entries.map(row => row.periodIndex))
})

test('blocks a cross-section faculty conflict and suggests free periods', () => {
  const generated = generateDemoTimetables(initialTimetableDemoState(), scope)
  const raviInC = generated.schedules['sec-cse-c'].entries.find(row => row.facultyId === 'fac-001')
  const dbmsInA = generated.schedules['sec-cse-a'].entries.find(row => row.subjectId === 'sub-dbms')
  const candidate = { ...dbmsInA, id: 'edited-candidate', dayOfWeek: raviInC.dayOfWeek, periodIndex: raviInC.periodIndex, periodIndices: [raviInC.periodIndex], roomId: 'room-202' }
  const result = validateDemoEntry(generated, candidate, dbmsInA.id)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(message => message.includes('Faculty conflict')))
  assert.ok(result.errors.some(message => message.includes('Section C')))
  assert.ok(result.suggestions.length > 0)
})

test('Generate Missing preserves manual entries and fills remaining requirements only', () => {
  const generated = generateDemoTimetables(initialTimetableDemoState(), scope)
  const state = { ...generated, schedules: { ...generated.schedules, 'sec-cse-a': { ...generated.schedules['sec-cse-a'], entries: generated.schedules['sec-cse-a'].entries.slice(1) } } }
  const manual = { ...state.schedules['sec-cse-a'].entries[0], generated: false, id: 'manual-entry' }
  state.schedules['sec-cse-a'].entries = [manual]
  const next = generateDemoTimetables(state, scope, { missingOnly: true })
  assert.ok(next.schedules['sec-cse-a'].entries.some(row => row.id === manual.id && row.generated === false))
  assert.equal(next.schedules['sec-cse-a'].entries.reduce((sum, row) => sum + demoEntryPeriodIndices(row).length, 0), 20)
  assert.equal(next.schedules['sec-cse-b'].entries.length, generated.schedules['sec-cse-b'].entries.length)
})

test('publishes only a valid scope locally and reset restores initial demo state', () => {
  const previous = globalThis.localStorage
  const records = new Map()
  globalThis.localStorage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) }
  try {
    let state = timetableDemoService.generateAll(initialTimetableDemoState(), scope)
    const validation = timetableDemoService.validate(state, scope)
    assert.equal(validation.valid, true, validation.errors.join('\n'))
    const published = timetableDemoService.publish(state, scope)
    assert.equal(published.validation.valid, true)
    assert.equal(published.state.schedules['sec-cse-a'].publicationStatus, 'PUBLISHED')
    assert.equal(timetableDemoService.load().schedules['sec-cse-b'].publicationStatus, 'PUBLISHED')
    const reset = timetableDemoService.reset()
    assert.deepEqual(reset.schedules, {})
    assert.equal(timetableDemoService.load().schedules['sec-cse-a'], undefined)
  } finally {
    if (previous === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previous
  }
})

test('fixture data connects CSE semester three to three sections and six subjects', () => {
  assert.equal(demoAcademicData.sections.filter(row => row.branchId === scope.branchId && row.semesterId === scope.semesterId).length, 3)
  assert.equal(demoAcademicData.subjects.filter(row => row.branchId === scope.branchId && row.semesterId === scope.semesterId).length, 6)
})
