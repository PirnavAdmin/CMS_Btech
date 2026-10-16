import test from 'node:test'
import assert from 'node:assert/strict'
import { minimumTimetableEndDate, timetableDateErrors } from './timetableSemester.js'

test('six working weekdays cannot fit inside a one-day validity range', () => {
  const calendar = { startDate: '2026-10-16', endDate: '2026-10-17', workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] }
  assert.equal(minimumTimetableEndDate(calendar), '2026-10-22')
  assert.match(timetableDateErrors(calendar)[0], /every selected working weekday/)
  assert.deepEqual(timetableDateErrors({ ...calendar, endDate: '2026-10-22' }), [])
})

test('minimum end date follows actual weekdays and skips holidays', () => {
  const calendar = { startDate: '2026-10-16', workingDays: ['MONDAY', 'FRIDAY'], holidays: ['2026-10-19'] }
  assert.equal(minimumTimetableEndDate(calendar), '2026-10-26')
  assert.equal(minimumTimetableEndDate({ ...calendar, holidays: [] }), '2026-10-19')
})

test('equal/reversed dates stay invalid and changing weekday selection recalculates the limit', () => {
  const calendar = { startDate: '2026-10-16', endDate: '2026-10-16', workingDays: ['FRIDAY'] }
  assert.match(timetableDateErrors(calendar)[0], /after the start date/)
  assert.equal(minimumTimetableEndDate(calendar), '2026-10-17')
  assert.equal(minimumTimetableEndDate({ ...calendar, workingDays: ['THURSDAY'] }), '2026-10-22')
})
