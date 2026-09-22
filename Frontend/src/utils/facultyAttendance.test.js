import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAttendanceRow, combineAttendance, localAttendanceDate, attendanceStatusLabel, attendanceFacultyMap } from './facultyAttendance.js'

test('attendance remains on its faculty when another employee profile has the same numeric ID', () => {
  const faculty = [{ id: '1', facultyId: 1, employeeProfileId: 9 }, { id: '9', facultyId: 9, employeeProfileId: 1 }]
  for (const members of [faculty, [...faculty].reverse()]) {
    const map = attendanceFacultyMap(members)
    assert.equal(map.get('1'), '1')
    assert.equal(map.get('9'), '9')
  }
})

test('attendance supports unique legacy aliases without mapping shared aliases to an arbitrary faculty', () => {
  const map = attendanceFacultyMap([{ id: '1', employeeProfileId: 20, employeeId: 'shared' }, { id: '2', employeeProfileId: 21, employeeId: 'shared' }])
  assert.equal(map.get('20'), '1')
  assert.equal(map.get('21'), '2')
  assert.equal(map.has('shared'), false)
})

test('saved status wins over stale daily status aliases after marking attendance', () => {
  for (const alias of ['statusName', 'attendanceStatus', 'StatusName', 'AttendanceStatus']) {
    const row = normalizeAttendanceRow({ facultyId: 9, status: 'Present', [alias]: 'Not Marked' }, { daily: true, date: '2026-09-22' })
    assert.equal(row.status, 'Present')
    assert.equal(normalizeAttendanceRow(row).status, 'Present')
  }
  assert.equal(normalizeAttendanceRow({ status: 1, statusName: 'Present' }).status, 'Present')
  assert.equal(normalizeAttendanceRow({ status: 'Absent', statusName: 'Present' }).status, 'Absent')
})

test('daily faculty ID must never become the attendance update ID', () => {
  const row = normalizeAttendanceRow({ id: 9, status: 'Not Marked' }, { daily: true, date: '2026-09-18' })
  assert.equal(row.facultyId, '9')
  assert.equal(row.attendanceId, null)
  assert.equal(row.synthetic, true)
})
test('saved attendance overrides missing daily rows after refresh and reports reuse the same record', () => {
  const daily = normalizeAttendanceRow({ facultyId: 9, status: 'Not Marked' }, { daily: true, date: '2026-09-18' })
  const saved = normalizeAttendanceRow({ id: 55, facultyId: 9, attendanceDate: '2026-09-18T00:00:00', status: 'Present', checkInTime: '2026-09-18T09:00:00' })
  const rows = combineAttendance([daily], [saved])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].status, 'Present')
  assert.equal(rows[0].attendanceId, 55)
  assert.equal(rows[0].checkIn, '09:00')
  assert.equal(combineAttendance([saved], [daily])[0].status, 'Present')
})
test('normalizes leave labels and preserves separate dates/faculty', () => {
  const row = normalizeAttendanceRow({ facultyId: 9, attendanceDate: '2026-09-18', attendanceStatus: 'Loss of Pay', attendanceId: 55 })
  assert.equal(row.status, 'LOP')
  assert.equal(attendanceStatusLabel(row.status), 'Loss of Pay')
  assert.equal(combineAttendance([row, { ...row, facultyId: '10' }, { ...row, date: '2026-09-17' }]).length, 3)
})
test('calendar dates stay local instead of shifting to the previous UTC day', () => {
  const date = new Date(2026, 8, 18)
  assert.equal(localAttendanceDate(date), '2026-09-18')
})

import { loadDailyAttendancePeriod } from './facultyAttendance.js'
test('weekly report includes saved daily statuses even when the range endpoint is empty', async () => {
  const requested = []
  const records = await loadDailyAttendancePeriod(async ({ date }) => {
    requested.push(date)
    return [{ facultyId: 9, status: date === '2026-09-18' ? 'Present' : 'Absent' }]
  }, '2026-09-14', '2026-09-20', '2026-09-18')
  assert.deepEqual(requested, ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'])
  assert.equal(combineAttendance(records, []).find(row => row.date === '2026-09-18').status, 'Present')
  assert.equal(records.filter(row => row.status === 'Absent').length, 4)
})
test('monthly report includes all elapsed dates across month boundaries', async () => {
  const records = await loadDailyAttendancePeriod(async ({ date }) => [{ facultyId: 9, status: 'Loss of Pay', date }], '2026-08-31', '2026-09-02', '2026-09-18')
  assert.deepEqual(records.map(row => row.date), ['2026-08-31', '2026-09-01', '2026-09-02'])
  assert.ok(records.every(row => row.status === 'LOP'))
})
test('failed date load is not converted to empty attendance', async () => {
  await assert.rejects(loadDailyAttendancePeriod(async () => { throw new Error('Unable to load attendance') }, '2026-09-18', '2026-09-18', '2026-09-18'), /Unable to load attendance/)
})
