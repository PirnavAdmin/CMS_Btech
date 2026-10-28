import test from 'node:test'
import assert from 'node:assert/strict'
import { facultyService } from './facultyService.js'

test('attendance session edits update the existing local session rather than duplicating it', async () => {
  const sessionId = 'test-attendance-session'
  const baseSession = {
    sessionId,
    date: '2026-10-28',
    subjectId: 'sub-cs301',
    subjectCode: 'CS301',
    subjectName: 'Data Structures & Algorithms',
    sectionId: 'cse-3a',
    sectionName: 'CSE Sem 3 - Sec A',
    records: [
      { studentId: 'std-1', rollNumber: '23CSE001', name: 'Student One', status: 'PRESENT' },
      { studentId: 'std-2', rollNumber: '23CSE002', name: 'Student Two', status: 'ABSENT' },
    ],
  }

  await facultyService.saveAttendance(baseSession)
  const updated = await facultyService.saveAttendance({
    ...baseSession,
    records: baseSession.records.map(record => ({ ...record, status: 'LATE' })),
  })
  const matches = (await facultyService.getAttendanceSessions()).filter(row => row.id === sessionId)

  assert.equal(matches.length, 1)
  assert.equal(updated.presentCount, 0)
  assert.equal(updated.lateCount, 2)
  assert.equal(updated.records[0].status, 'LATE')
})
