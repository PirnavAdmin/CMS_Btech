import test from 'node:test'
import assert from 'node:assert/strict'
import { automaticPeriods, DEFAULT_PERIOD_SETUP, teachingPeriods, periodSessions, periodSetupErrors } from './timetablePeriods.js'

test('automatic setup matches the requested college day, with non-teaching break and lunch', () => {
  const result = automaticPeriods(DEFAULT_PERIOD_SETUP)
  assert.deepEqual(result.errors, [])
  assert.equal(result.unusedMinutes, 0)
  assert.equal(teachingPeriods(result.periods).length, 6)
  assert.deepEqual(result.periods.map(row => [row.name, row.startTime, row.endTime, row.type]), [
    ['P1', '09:00', '10:00', 'class'], ['P2', '10:00', '11:00', 'class'], ['Break', '11:00', '11:15', 'break'],
    ['P3', '11:15', '12:15', 'class'], ['P4', '12:15', '13:15', 'class'], ['Lunch', '13:15', '14:00', 'lunch'],
    ['P5', '14:00', '15:00', 'class'], ['P6', '15:00', '16:00', 'class'],
  ])
  assert.deepEqual(periodSetupErrors(result.periods), [])
  assert.equal(periodSessions(result.periods, 2).length, 3)
  assert.ok(periodSessions(result.periods, 2).every(block => block.every(row => row.type === 'class')))
})

test('live rebuild preserves period identity and never invents shortened classes', () => {
  const original = automaticPeriods(DEFAULT_PERIOD_SETUP).periods.map((row, index) => ({ ...row, id: `saved-${index}` }))
  const result = automaticPeriods({ ...DEFAULT_PERIOD_SETUP, endTime: '15:30' }, original)
  assert.equal(result.unusedMinutes, 30)
  assert.equal(result.periods.at(-1).endTime, '15:00')
  assert.equal(result.periods[0].id, 'saved-0')
  assert.equal(automaticPeriods({ ...DEFAULT_PERIOD_SETUP, duration: 30 }).periods[0].endTime, '09:30')
  assert.ok(automaticPeriods({ ...DEFAULT_PERIOD_SETUP, duration: 0 }).errors.length)
  assert.ok(automaticPeriods({ ...DEFAULT_PERIOD_SETUP, endTime: '08:00' }).errors.length)
  assert.ok(automaticPeriods({ ...DEFAULT_PERIOD_SETUP, lunchDuration: -1 }).errors.length)
})

test('manual periods reject duplicates, overlaps, invalid types and intervals', () => {
  const periods = automaticPeriods(DEFAULT_PERIOD_SETUP).periods
  assert.match(periodSetupErrors([...periods, { id: 'duplicate', name: 'p1', startTime: '17:00', endTime: '18:00', type: 'class' }]).join(), /duplicate/)
  assert.match(periodSetupErrors([{ ...periods[0], startTime: '10:00' }]).join(), /later end/)
  assert.match(periodSetupErrors([{ ...periods[0], name: '' }]).join(), /name/)
  assert.match(periodSetupErrors([{ ...periods[0], type: 'other' }]).join(), /Class, Break or Lunch/)
  assert.match(periodSetupErrors([...periods, { id: 'overlap', name: 'Extra', type: 'class', startTime: '11:00', endTime: '11:30' }]).join(), /overlap/)
  assert.equal(periodSetupErrors([{ id: 'legacy', startTime: '09:00', endTime: '10:00' }]).length, 0)
})
