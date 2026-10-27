import test from 'node:test'
import assert from 'node:assert/strict'
import { createAttendanceDemo } from './attendanceDemo.js'

test('sample attendance supports marking, submitting and reading the saved demo register', async () => {
  const demo = createAttendanceDemo('2026-10-27'), allocationId = demo.data.assignments[0].id
  assert.equal(demo.data.students.length, 8)
  const records = demo.data.students.map((row, index) => ({ studentId: row.id, attendanceStatus: ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'][index % 4], remarks: index ? '' : 'Sample remark' }))
  assert.deepEqual(await demo.api.getSessions(allocationId, '2026-10-27'), [])
  assert.equal((await demo.api.saveAttendance({ allocationId, date: '2026-10-27', records })).demo, true)
  const sessions = await demo.api.getSessions(allocationId, '2026-10-27')
  assert.equal(sessions[0].sessionStatus, 'COMPLETED')
  const saved = await demo.api.getSessionRoster(allocationId, '2026-10-27', sessions[0].attendanceSessionId)
  assert.equal(saved.students[0].attendanceStatus, 'PRESENT')
  assert.equal(saved.students[1].attendanceStatus, 'ABSENT')
  assert.equal(saved.students[0].remarks, 'Sample remark')
  assert.equal((await demo.api.getSessionHistory(allocationId)).length, 1)
})
test('demo rejects partial and duplicate submissions, and never shares records between demo instances', async () => {
  const demo = createAttendanceDemo(), allocationId = demo.data.assignments[0].id
  await assert.rejects(demo.api.saveAttendance({ allocationId, date: '2026-10-27', records: [] }), /every demo student/)
  const records = demo.data.students.map(row => ({ studentId: row.id, attendanceStatus: 'PRESENT' }))
  await demo.api.saveAttendance({ allocationId, date: '2026-10-27', records })
  await assert.rejects(demo.api.saveAttendance({ allocationId, date: '2026-10-27', records }), /already completed/)
  assert.deepEqual(await createAttendanceDemo().api.getSessionHistory(allocationId), [])
  await assert.rejects(demo.api.getSessions('live-allocation', '2026-10-27'), /demo class/)
})
