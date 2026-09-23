import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarBounds, workingDate, calendarDays, classesOnDate, generateTimetable, planningErrors, entryPlanningErrors, schedulingIssues, subjectRequirements } from './timetablePlanner.js'
import { conflictsFor } from './timetableUtils.js'
import { automaticPeriods, DEFAULT_PERIOD_SETUP, isTeachingPeriod } from './timetablePeriods.js'

const scope = { academicYearId: '1', courseId: '2', branchId: '3', semesterId: '4', sectionId: '5' }
const sources = { years: [{ id: '1', startDate: '2026-01-01', endDate: '2026-12-31' }], semesters: [{ id: '4', startDate: '2026-09-01', endDate: '2026-12-15' }], sections: [{ ...scope, id: '5', room: 'Room 1' }], subjects: [{ ...scope, id: '6', name: 'DBMS' }], faculty: [{ id: '7', name: 'Faculty A' }], allocations: [{ ...scope, subjectId: '6', facultyId: '7', periodsPerWeek: 2 }] }
const config = { calendar: { startDate: '2026-09-01', endDate: '2026-12-15', workingDays: ['MONDAY', 'TUESDAY'], holidays: ['2026-09-07'], reviewed: true }, periods: [{ id: 'p1', startTime: '09:00', endTime: '10:00' }, { id: 'p2', startTime: '10:00', endTime: '11:00' }], rooms: ['text:room 1'], requirements: {} }
const generate = (options = {}) => { let n = 0; return generateTimetable({ scope, sources, config, makeId: () => `entry-${++n}`, ...options }) }

test('calendar uses intersection of year and semester and excludes holidays / weekends', () => {
  assert.deepEqual(calendarBounds(sources, scope), { startDate: '2026-09-01', endDate: '2026-12-15' })
  assert.equal(workingDate('2026-09-07', config.calendar).working, false)
  assert.equal(workingDate('2026-09-06', config.calendar).working, false)
  assert.equal(workingDate('2026-08-31', config.calendar).working, false)
  assert.equal(workingDate('2026-09-08', config.calendar).working, true)
  assert.equal(workingDate('2026-02-30', config.calendar).working, false)
  assert.equal(workingDate('2026-09-08', { ...config.calendar, reviewed: false }).working, false)
  assert.ok(!calendarDays(config.calendar).includes('2026-09-07'))
  const generated = generate()
  assert.equal(classesOnDate(generated.entries, '2026-09-07', () => config.calendar).length, 0)
  assert.equal(classesOnDate(generated.entries, '2026-09-08', () => config.calendar).length, 1)
})
test('deterministic generation uses configured demand and checks all resources', () => {
  const occupied = [{ id: 'other', facultyId: '7', sectionId: '99', classroom: 'Other', dayOfWeek: 'MONDAY', startTime: '09:30', endTime: '10:30' }]
  const result = generate({ occupied })
  assert.equal(result.added, 2); assert.equal(result.issues.length, 0)
  assert.deepEqual(result, generate({ occupied }))
  for (const row of result.entries) assert.equal(conflictsFor(row, [...occupied, ...result.entries]).length, 0)
  assert.ok(result.entries.every(row => row.dayOfWeek === 'TUESDAY'))
  for (const resources of [{ sectionId: '5', facultyId: '99', classroom: 'Other' }, { sectionId: '99', facultyId: '99', classroom: 'Room 1' }]) {
    const blocked = generate({ occupied: ['MONDAY', 'TUESDAY'].map(dayOfWeek => ({ id: dayOfWeek, dayOfWeek, startTime: '08:00', endTime: '12:00', ...resources })) })
    assert.equal(blocked.added, 0); assert.match(blocked.issues[0].reason, /unscheduled/)
  }
})
test('missing frequency and allocations are explicit issues, never fabricated', () => {
  const noFrequency = { ...sources, allocations: [{ ...scope, subjectId: '6', facultyId: '7' }] }
  assert.equal(generate({ sources: noFrequency }).added, 0)
  assert.match(generate({ sources: noFrequency }).issues[0].reason, /missing or ambiguous/)
  assert.match(generate({ sources: { ...sources, allocations: [] } }).issues[0].reason, /No allocated faculty/)
  const conflicting = { ...sources, allocations: [...sources.allocations, { ...sources.allocations[0], periodsPerWeek: 3 }] }
  assert.equal(subjectRequirements(conflicting, scope)[0].periodsPerWeek, 0)
  assert.equal(generate({ sources: noFrequency, config: { ...config, requirements: { 6: { periodsPerWeek: 1 } } } }).added, 1)
})
test('generate missing preserves manual records, IDs and adjustments', () => {
  const manual = { id: 'manual', subjectId: '6', facultyId: '7', sectionId: '5', dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '11:00', classroom: 'Room 1', generated: false }
  const result = generate({ existing: [manual] })
  assert.equal(result.added, 1); assert.deepEqual(result.entries[0], manual)
  assert.equal(generate({ existing: result.entries }).added, 0)
})
test('consecutive lab sessions respect period adjacency and room types', () => {
  const labs = { ...sources, subjects: [{ ...sources.subjects[0], subjectType: 'Practical' }], sections: [{ ...sources.sections[0], roomType: 'Lab' }] }
  const labConfig = { ...config, requirements: { 6: { blockSize: 2 } } }
  const result = generate({ sources: labs, config: labConfig })
  assert.equal(result.entries.length, 1); assert.equal(result.entries[0].endTime, '11:00')
  assert.equal(result.entries[0].periodIds.length, 2)
  assert.equal(generate({ sources: { ...labs, sections: [{ ...labs.sections[0], roomType: 'Classroom' }] }, config: labConfig }).added, 0)
  assert.equal(generate({ sources: labs, config: { ...labConfig, periods: [config.periods[0], { ...config.periods[1], startTime: '10:15' }] } }).added, 0)
})
test('all-holiday weekdays have no occurrences and invalid plans block generation', () => {
  const calendar = { ...config.calendar, startDate: '2026-09-07', endDate: '2026-09-08', holidays: ['2026-09-07'], workingDays: ['MONDAY', 'TUESDAY'] }
  assert.ok(generate({ config: { ...config, calendar } }).entries.every(row => row.dayOfWeek === 'TUESDAY'))
  const invalid = { ...config, periods: [config.periods[0], { id: 'bad', startTime: '09:30', endTime: '10:30' }] }
  assert.match(planningErrors(invalid, sources, scope).join(), /overlap/)
  assert.equal(generate({ config: invalid }).added, 0)
  assert.match(planningErrors({ ...config, calendar: { ...config.calendar, endDate: '2027-01-01' } }, sources, scope).join(), /within/)
})
test('manual edits outside periods, rooms or working weekdays are blocked', () => {
  const row = generate().entries[0]
  assert.equal(entryPlanningErrors(row, config, sources, scope).length, 0)
  assert.match(entryPlanningErrors({ ...row, dayOfWeek: 'SUNDAY' }, config, sources, scope).join(), /no working/)
  assert.match(entryPlanningErrors({ ...row, endTime: '10:15' }, config, sources, scope).join(), /Class times/)
  assert.match(entryPlanningErrors({ ...row, classroom: 'Invented' }, config, sources, scope).join(), /room/)
  assert.ok(schedulingIssues(sources, scope, config, [row]).length)
})

test('auto and manual classes never use or span explicit Break/Lunch periods', () => {
  const periods = automaticPeriods(DEFAULT_PERIOD_SETUP).periods
  const planned = { ...config, periods, requirements: { 6: { periodsPerWeek: 12 } } }
  const result = generate({ config: planned })
  assert.equal(result.entries.length, 12)
  assert.ok(result.entries.every(row => periods.some(period => isTeachingPeriod(period) && period.startTime === row.startTime && period.endTime === row.endTime)))
  for (const [startTime, endTime] of [['11:00', '11:15'], ['13:15', '14:00'], ['10:00', '12:15']]) {
    assert.match(entryPlanningErrors({ ...result.entries[0], startTime, endTime }, planned, sources, scope).join(), /Break or Lunch/)
  }
})

test('missing frequency warns without inventing demand for manually scheduled classes', () => {
  const noFrequency = { ...sources, allocations: [{ ...scope, facultyId: '7', subjectId: '6' }] }
  const manual = { ...generate().entries[0], generated: false }
  const warnings = schedulingIssues(noFrequency, scope, config, [manual])
  assert.equal(warnings[0].blocking, false)
  assert.equal(warnings[0].code, 'frequency')
  assert.equal(generate({ sources: noFrequency, existing: [manual] }).added, 0)
  assert.equal(schedulingIssues(noFrequency, scope, { ...config, requirements: { 6: { periodsPerWeek: 0 } } }, [manual])[0].blocking, true)
})

test('known classroom types distinguish theory rooms from laboratories', () => {
  const theory = { ...sources, subjects: [{ ...sources.subjects[0], subjectType: 'Theory' }], sections: [{ ...sources.sections[0], roomType: 'Lab' }] }
  assert.equal(generate({ sources: theory }).added, 0)
  const classroom = { ...theory, sections: [{ ...theory.sections[0], roomType: 'Classroom' }] }
  const result = generate({ sources: classroom })
  assert.equal(result.added, 2)
  assert.match(entryPlanningErrors(result.entries[0], config, theory, scope).join(), /suitable classroom or lab/)
})
