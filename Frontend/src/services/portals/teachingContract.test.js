import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeachingService, rows, assessmentOptions } from './teachingContract.js'

test('assessment options normalize exam identifiers and retain only matching scope', () => {
  const result = assessmentOptions({ data: { exams: [
    { ExamId: 2, ExamName: 'Mid Semester', AcademicYearId: 4, SemesterId: 2 },
    { exam_id: 3, exam_name: 'Practical', subject_id: 8 },
    { id: 4, name: 'Another year', academicYearId: 99 },
    { id: 5, name: 'Another subject', subjectId: 99 },
    { name: 'Missing identifier' },
  ] } }, allocation)
  assert.deepEqual(result.map(row => [row.examId, row.examName]), [[2, 'Mid Semester'], [3, 'Practical']])
  assert.deepEqual(assessmentOptions({ data: [] }, allocation), [])
})

const allocation = { allocationId: 20, facultyId: 7, sectionId: 3, subjectId: 8, semesterId: 2, academicYearId: 4, status: true, sectionName: 'CSE A' }
function setup({ profile = { facultyId: 7, fullName: 'Faculty' }, failRoster = false } = {}) {
  const calls = []
  let identity = 'user-1'
  const service = createTeachingService({ collegeId: () => '1', getIdentity: () => identity, getProfile: async () => profile, request: async (url, options = {}) => {
    calls.push({ url, options })
    const parsed = new URL(url, 'http://test'), path = parsed.pathname
    if (options.method === 'POST' && path.endsWith('/sessions')) return { data: { attendanceSessionId: 40 } }
    if (options.method) return { success: true }
    if (path.endsWith('/faculty-subject-allocations')) return { data: [allocation, { ...allocation, allocationId: 21, facultyId: 99 }, { ...allocation, allocationId: 22, collegeId: 2 }, { ...allocation, allocationId: 23, status: false }] }
    if (path.includes('/timetable-management/views/faculty/')) return { data: [{ facultyId: 7, subjectId: 8 }, { facultyId: 99 }] }
    if (path.endsWith('/students')) { if (failRoster) throw new Error('Forbidden'); return { data: [{ studentId: 10, fullName: 'Student', studentCode: 'ROLL10', sectionId: 3 }, { studentId: 11, sectionId: 99 }] } }
    if (path.includes('/subjects/')) return { data: { subjectName: 'Data Structures', subjectCode: 'CS201' } }
    return { data: [] }
  } })
  return { service, calls, switchIdentity: () => { identity = 'user-2' } }
}
test('normalizes API envelopes and refuses unknown list shapes', () => {
  assert.deepEqual(rows({ data: { items: [1] } }), [1])
  assert.throws(() => rows({ success: true }), /unexpected list/)
})
test('loads only this faculty allocations, published timetable and assigned students', async () => {
  const { service, calls } = setup(), data = await service.getSnapshot()
  assert.equal(data.mode, 'live')
  assert.equal(data.assignments.length, 1)
  assert.equal(data.assignments[0].subjectName, 'Data Structures')
  assert.equal(data.students.length, 1)
  assert.equal(data.students[0].rollNumber, 'ROLL10')
  assert.equal(data.timetable.length, 1)
  assert.ok(calls.every(call => call.url.includes('collegeId=1')))
  assert.ok(!calls.some(call => new URL(call.url, 'http://test').pathname === '/api/v1/students'))
})
test('missing faculty mapping stops all academic data requests', async () => {
  const { service, calls } = setup({ profile: { id: 7 } })
  await assert.rejects(service.getSnapshot(), /not linked/)
  assert.equal(calls.length, 0)
})
test('partial API failures remain visible instead of turning into fabricated records', async () => {
  const { service } = setup({ failRoster: true }), data = await service.getSnapshot()
  assert.equal(data.students.length, 0)
  assert.match(data.warnings[0], /Forbidden/)
  assert.equal(data.assignments.length, 1)
})
test('attendance validates full roster then sends actual backend DTOs', async () => {
  const { service, calls } = setup(); await service.getSnapshot()
  await assert.rejects(service.saveAttendance({ allocationId: 20, date: '2026-01-10', records: [] }), /every student/)
  await assert.rejects(service.saveAttendance({ allocationId: 99, date: '2026-01-10', records: [] }), /assigned/)
  await service.saveAttendance({ allocationId: 20, date: '2026-01-10', records: [{ studentId: 10, attendanceStatus: 'PRESENT' }] })
  const created = calls.find(c => c.options.method === 'POST')
  assert.equal(JSON.parse(created.options.body).facultyId, 7)
  const marked = calls.find(c => c.options.method === 'PUT')
  assert.match(marked.url, /sessions\/40\/mark/)
  assert.equal(JSON.parse(marked.options.body).completeSession, true)
})
test('marks reject invalid ranges and students outside assigned class', async () => {
  const { service, calls } = setup(); await service.getSnapshot()
  const form = { allocationId: 20, examId: 1, studentId: 10, marksObtained: '25', maxMarks: '30' }
  await assert.rejects(service.saveMark({ ...form, studentId: 99 }), /assigned student/)
  await assert.rejects(service.saveMark({ ...form, marksObtained: '31' }), /Marks must/)
  await assert.rejects(service.saveMark({ ...form, marksObtained: '' }), /Marks must/)
  await service.saveMark(form)
  const posted = calls.find(c => c.options.method === 'POST')
  assert.equal(JSON.parse(posted.options.body).subjectId, 8)
  assert.equal(JSON.parse(posted.options.body).marksObtained, 25)
})
test('switching accounts invalidates the previous faculty workspace', async () => {
  const { service, switchIdentity } = setup(); await service.getSnapshot(); switchIdentity()
  await assert.rejects(service.getMarks(20, 1), /current faculty account/)
  await assert.rejects(service.requestLeave({}), /Reload/)
})

test('legacy profile resolves faculty ID through an exact user and college mapping', async () => {
  const searches = []
  const service = createTeachingService({ collegeId: () => '1', getProfile: async () => ({ id: 500, identifier: 'BTECH-FAC-013' }), request: async url => {
    if (url.includes('/faculty/search')) { searches.push(url); return { data: [{ facultyId: 9, userId: 999, collegeId: 1 }, { facultyId: 7, userId: 500, collegeId: 1 }, { facultyId: 8, userId: 500, collegeId: 2 }] } }
    return { data: [] }
  } })
  const data = await service.getSnapshot()
  assert.equal(data.facultyId, 7)
  assert.equal(searches.length, 1)
  assert.match(searches[0], /search=BTECH-FAC-013/)
})

test('ambiguous user mappings are rejected instead of selecting another faculty', async () => {
  const service = createTeachingService({ collegeId: () => '1', getProfile: async () => ({ id: 500, identifier: 'EMP1' }), request: async () => ({ data: [{ facultyId: 7, userId: 500, collegeId: 1 }, { facultyId: 8, userId: 500, collegeId: 1 }] }) })
  await assert.rejects(service.getSnapshot(), /Multiple faculty records/)
})

test('faculty timetable falls back to the scoped legacy route only when the modern route is absent', async () => {
  const calls = []
  const service = createTeachingService({ collegeId: () => '1', getProfile: async () => ({ facultyId: 7 }), request: async url => {
    calls.push(url)
    if (url.includes('/timetable-management/')) throw Object.assign(new Error('Unavailable'), { status: 404 })
    if (url.includes('/timetables/view/faculty')) return { data: [{ facultyId: 7, subjectName: 'Subject' }] }
    return { data: [] }
  } })
  const data = await service.getSnapshot()
  assert.equal(data.timetable.length, 1)
  assert.ok(calls.some(url => url.includes('view/faculty?facultyId=7')))
})

test('faculty timetable permission failures never fall back to another route', async () => {
  const calls = []
  const service = createTeachingService({ collegeId: () => '1', getProfile: async () => ({ facultyId: 7 }), request: async url => {
    calls.push(url)
    if (url.includes('/timetable-management/')) throw Object.assign(new Error('Forbidden'), { status: 403 })
    return { data: [] }
  } })
  const data = await service.getSnapshot()
  assert.match(data.timetableError, /Forbidden/)
  assert.ok(!calls.some(url => url.includes('/timetables/view/faculty')))
})
