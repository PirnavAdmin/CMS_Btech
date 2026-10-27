import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAttendanceRecords, calculateLeaveDays, getAttendanceCounts, hasLeaveOverlap, validateMarks } from './validation.js'

test('marks validation accepts empty values and rejects values outside max marks', () => {
  assert.equal(validateMarks('', 30), true)
  assert.equal(validateMarks('0', 30), true)
  assert.equal(validateMarks('30', 30), true)
  assert.equal(validateMarks('-1', 30), false)
  assert.equal(validateMarks('31', 30), false)
  assert.equal(validateMarks('NaN', 30), false)
})

test('leave duration counts working days and handles half days', () => {
  assert.equal(calculateLeaveDays('2026-10-26', '2026-10-30'), 5)
  assert.equal(calculateLeaveDays('2026-10-24', '2026-10-25'), 0)
  assert.equal(calculateLeaveDays('2026-10-26', '2026-10-30', true), 0)
  assert.equal(calculateLeaveDays('2026-10-26', '2026-10-26', true), 0.5)
  assert.equal(calculateLeaveDays('2026-10-30', '2026-10-26'), 0)
})

test('leave overlap checks pending and approved ranges but ignores rejected requests', () => {
  const requests = [
    { status: 'Approved', fromDate: '2026-10-20', toDate: '2026-10-21' },
    { status: 'Pending', fromDate: '2026-10-28', toDate: '2026-10-29' },
    { status: 'Rejected', fromDate: '2026-11-02', toDate: '2026-11-03' },
  ]
  assert.equal(hasLeaveOverlap('2026-10-21', '2026-10-22', requests), true)
  assert.equal(hasLeaveOverlap('2026-10-29', '2026-10-30', requests), true)
  assert.equal(hasLeaveOverlap('2026-11-02', '2026-11-03', requests), false)
  assert.equal(hasLeaveOverlap('', '2026-11-03', requests), false)
})

test('attendance grid tracks status counts and refuses incomplete submission records', () => {
  const roster = [
    { id: 'std-1', rollNumber: '23CSE001', name: 'Student One' },
    { id: 'std-2', rollNumber: '23CSE002', name: 'Student Two' },
    { id: 'std-3', rollNumber: '23CSE003', name: 'Student Three' },
  ]
  const incomplete = { 'std-1': 'PRESENT', 'std-2': 'ABSENT' }
  assert.deepEqual(getAttendanceCounts(incomplete, roster.length), {
    present: 1, absent: 1, late: 0, marked: 2, complete: false,
  })
  assert.equal(buildAttendanceRecords(roster, incomplete), null)

  const complete = { ...incomplete, 'std-3': 'LATE' }
  assert.deepEqual(getAttendanceCounts(complete, roster.length), {
    present: 1, absent: 1, late: 1, marked: 3, complete: true,
  })
  assert.equal(buildAttendanceRecords(roster, complete)[2].status, 'LATE')
})
