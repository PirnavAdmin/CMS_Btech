import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateDuration,
  timeToMinutes,
  formatTime12,
  formatMinutesToDuration
} from './facultySelfAttendanceCalculations.js'

test('timeToMinutes correctly converts 24-hour and 12-hour strings', () => {
  assert.equal(timeToMinutes('09:15'), 555)
  assert.equal(timeToMinutes('17:30'), 1050)
  assert.equal(timeToMinutes('09:15 AM'), 555)
  assert.equal(timeToMinutes('05:30 PM'), 1050)
  assert.equal(timeToMinutes('12:00 PM'), 720)
  assert.equal(timeToMinutes('12:00 AM'), 0)
  assert.equal(timeToMinutes(''), null)
  assert.equal(timeToMinutes(null), null)
})

test('formatTime12 formats times into 12-hour AM/PM correctly', () => {
  assert.equal(formatTime12('09:15'), '09:15 AM')
  assert.equal(formatTime12('17:30'), '05:30 PM')
  assert.equal(formatTime12('00:00'), '12:00 AM')
  assert.equal(formatTime12('12:00'), '12:00 PM')
  assert.equal(formatTime12(''), '—')
  assert.equal(formatTime12('—'), '—')
})

test('calculateDuration accurately calculates working hours and minutes', () => {
  const result = calculateDuration('09:10', '17:30')
  assert.notEqual(result, null)
  assert.equal(result.hours, 8)
  assert.equal(result.minutes, 20)
  assert.equal(result.totalMinutes, 500)
  assert.equal(result.formatted, '8h 20m')
  assert.equal(result.verbose, '8 hrs 20 mins')
  assert.equal(result.decimal, 8.33)
})

test('calculateDuration handles invalid or reverse ranges gracefully', () => {
  assert.equal(calculateDuration('17:30', '09:10'), null)
  assert.equal(calculateDuration('', '17:30'), null)
  assert.equal(calculateDuration('09:10', ''), null)
})

test('formatMinutesToDuration formats minutes into readable hours', () => {
  assert.equal(formatMinutesToDuration(495), '8 hrs 15 mins')
  assert.equal(formatMinutesToDuration(60), '1 hrs 00 mins')
  assert.equal(formatMinutesToDuration(0), '0 hrs 00 mins')
})
