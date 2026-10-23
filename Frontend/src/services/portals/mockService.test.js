import test from 'node:test'
import assert from 'node:assert/strict'
import { createMockPortalService } from './mockService.js'

function fixture() {
  const records = new Map()
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) }
  const api = (role, id, collegeId = 'preview', preview = true) => createMockPortalService({ storage, actor: { role, id }, collegeId, preview })
  return { api, records, admin: api('admin', 'admin-1'), faculty: api('faculty', 'faculty-1'), student: api('student', 'student-1') }
}
test('real colleges start empty and mock data never crosses college boundaries', async () => {
  const { api, faculty } = fixture()
  assert.equal((await faculty.getSnapshot()).subjects.length, 2)
  const empty = await api('admin', 'real-admin', 'new-college', false).getSnapshot()
  assert.deepEqual(empty.users, [])
  assert.deepEqual(empty.attendance, [])
  assert.deepEqual(empty.timetable, [])
})
test('student accounts require matching course, branch, academic level and section', async () => {
  const { admin } = fixture()
  const input = { name: 'Mapped Student', email: 'mapped@preview.invalid', role: 'student', departmentId: 'cse', sectionId: 'cse-a', courseId: 'btech', branchId: 'btech-cse', academicLevelId: 'year-2' }
  await assert.rejects(admin.createUser({ ...input, courseId: '' }), /course/)
  await assert.rejects(admin.createUser({ ...input, branchId: 'btech-ece' }), /branch/)
  await assert.rejects(admin.createUser({ ...input, academicLevelId: 'year-1' }), /section matching/)
  const user = await admin.createUser(input)
  assert.equal(user.courseId, 'btech')
  assert.equal(user.branchId, 'btech-cse')
  assert.equal(user.academicLevelId, 'year-2')
})
test('older sample workspaces gain academic references without losing records', async () => {
  const { admin, api, records } = fixture()
  const snapshot = await admin.getSnapshot()
  delete snapshot.courses; delete snapshot.branches; delete snapshot.academicLevels
  snapshot.sections = snapshot.sections.map(({ id, name, departmentId }) => ({ id, name, departmentId }))
  records.set('cms-portal-mock:v1:preview', JSON.stringify(snapshot))
  const loaded = await api('admin', 'admin-1').getSnapshot()
  assert.equal(loaded.users.length, snapshot.users.length)
  assert.equal(loaded.attendance.length, snapshot.attendance.length)
  assert.equal(loaded.sections[0].academicLevelId, 'year-2')
  assert.equal(loaded.courses[0].name, 'B.Tech')
})
test('faculty attendance submission is complete, scoped, unique and visible only to its students', async () => {
  const { faculty, student, api } = fixture()
  await assert.rejects(faculty.submitAttendance({ assignmentId: 'assignment-3', date: '2026-09-01', records: [] }), /assigned/)
  await assert.rejects(faculty.submitAttendance({ assignmentId: 'assignment-1', date: '2026-09-01', records: [{ studentId: 'student-1', status: 'present' }] }), /every/)
  const input = { assignmentId: 'assignment-1', date: '2026-09-01', records: [{ studentId: 'student-1', status: 'present' }, { studentId: 'student-2', status: 'absent' }] }
  await faculty.submitAttendance(input)
  await assert.rejects(faculty.submitAttendance(input), /already submitted/)
  const sessions = (await student.getSnapshot()).attendance
  assert.ok(sessions.every(session => session.records.every(row => row.studentId === 'student-1')))
  assert.equal((await api('student', 'student-3').getSnapshot()).attendance.length, 0)
  await assert.rejects(student.submitAttendance(input), /role/)
})
test('marks validate ranges and draft marks never appear in student results', async () => {
  const { faculty, student } = fixture()
  const input = { assignmentId: 'assignment-1', assessment: 'Quiz 2', maxMarks: 20, records: [{ studentId: 'student-1', marks: 18 }, { studentId: 'student-2', marks: 21 }] }
  await assert.rejects(faculty.submitMarks(input), /valid marks/)
  input.records[1].marks = 0
  await faculty.submitMarks(input)
  await assert.rejects(faculty.submitMarks(input), /already has marks/)
  assert.equal((await faculty.getSnapshot()).results.length, 2)
  assert.equal((await student.getSnapshot()).results.length, 1)
})
test('admin validates accounts, role mapping, resets and active account enforcement', async () => {
  const { admin, faculty, records } = fixture()
  await assert.rejects(admin.createUser({ name: 'X', email: 'bad', role: 'student' }), /Name/)
  const user = await admin.createUser({ name: 'New Student', email: 'new@preview.invalid', role: 'student', departmentId: 'cse', sectionId: 'cse-a', courseId: 'btech', branchId: 'btech-cse', academicLevelId: 'year-2' })
  await assert.rejects(admin.createUser({ name: 'New Student', email: 'NEW@preview.invalid', role: 'faculty', departmentId: 'cse' }), /already exists/)
  await assert.rejects(admin.assignRole(user.id, 'student', 'ece-a'), /section/)
  await admin.assignRole(user.id, 'faculty')
  const reset = await admin.resetPassword(user.id)
  assert.equal(reset.delivery, 'simulated')
  assert.ok(!JSON.stringify([...records.values()]).includes('passwordHash'))
  await admin.updateUserStatus('faculty-1', 'inactive')
  await assert.rejects(faculty.getSnapshot(), /inactive/)
  await assert.rejects(admin.updateUserStatus('admin-1', 'inactive'), /Administrator/)
  await assert.rejects(faculty.createUser({}), /role/)
})
test('mock account detail edits validate names, unique email and mobile without editing administrators', async () => {
  const { admin } = fixture()
  await assert.rejects(admin.updateUser('faculty-1', { name: 'A', email: 'ananya@preview.invalid', phone: '' }), /Name/)
  await assert.rejects(admin.updateUser('faculty-1', { name: 'Updated Faculty', email: 'aarav@preview.invalid', phone: '' }), /already exists/)
  await assert.rejects(admin.updateUser('faculty-1', { name: 'Updated Faculty', email: 'updated@preview.invalid', phone: '123' }), /mobile/)
  await assert.rejects(admin.updateUser('admin-1', { name: 'Changed Admin', email: 'admin@preview.invalid', phone: '' }), /Administrator/)
  const updated = await admin.updateUser('faculty-1', { name: 'Updated Faculty', email: 'updated@preview.invalid', phone: '9876543212' })
  assert.equal(updated.name, 'Updated Faculty')
  assert.equal(updated.email, 'updated@preview.invalid')
  assert.equal(updated.phone, '9876543212')
})
test('teaching assignments reject wrong departments, duplicates and removal of academic history', async () => {
  const { admin } = fixture()
  await assert.rejects(admin.assignFaculty({ facultyId: 'faculty-1', subjectId: 'circuits', sectionId: 'ece-a' }), /department/)
  await assert.rejects(admin.assignFaculty({ facultyId: 'faculty-1', subjectId: 'dbms', sectionId: 'cse-a', courseId: 'btech', branchId: 'btech-cse', academicLevelId: 'year-2' }), /already exists/)
  await assert.rejects(admin.removeAssignment('assignment-1'), /academic records/)
  const faculty = await admin.createUser({ name: 'New Faculty', email: 'newfac@preview.invalid', role: 'faculty', departmentId: 'cse' })
  const assignment = await admin.assignFaculty({ facultyId: faculty.id, subjectId: 'dbms', sectionId: 'cse-a', courseId: 'btech', branchId: 'btech-cse', academicLevelId: 'year-2' })
  await admin.removeAssignment(assignment.id)
  assert.ok(!(await admin.getSnapshot()).assignments.some(row => row.id === assignment.id))
})
test('materials are scoped and student academic data has no write access', async () => {
  const { faculty, student, api } = fixture()
  const material = await faculty.addMaterial({ assignmentId: 'assignment-2', title: 'Trees revision', content: 'Binary trees and traversals.' })
  assert.ok((await student.getSnapshot()).materials.some(row => row.id === material.id))
  assert.ok(!(await api('student', 'student-3').getSnapshot()).materials.some(row => row.id === material.id))
  await assert.rejects(student.removeMaterial(material.id), /role/)
  await faculty.removeMaterial(material.id)
  const snapshot = await student.getSnapshot()
  assert.ok(snapshot.fees.every(row => row.studentId === 'student-1'))
  assert.ok(snapshot.results.every(row => row.records.every(record => record.studentId === 'student-1')))
})
test('notifications and profile changes are limited to the current user', async () => {
  const { student, api } = fixture()
  await student.markNotificationRead('notice-1')
  assert.ok((await student.getSnapshot()).notifications[0].readBy.includes('student-1'))
  assert.ok(!(await api('student', 'student-2').getSnapshot()).notifications[0].readBy.includes('student-2'))
  await assert.rejects(student.updateProfile({ phone: '123' }), /mobile/)
  await student.updateProfile({ phone: '9876543299', name: 'Ignored', role: 'admin' })
  const me = (await student.getSnapshot()).me
  assert.equal(me.role, 'student')
  assert.equal(me.name, 'Aarav Reddy')
  assert.equal(me.phone, '9876543299')
})
test('leave validates dates and overlap, then allows cancelling pending requests', async () => {
  const { faculty } = fixture()
  await assert.rejects(faculty.requestLeave({ from: '2099-02-30', to: '2099-03-01', type: 'Casual', reason: 'A family commitment' }), /valid leave dates/)
  const input = { from: '2099-12-01', to: '2099-12-02', type: 'Casual', reason: 'A family commitment' }
  const leave = await faculty.requestLeave(input)
  await assert.rejects(faculty.requestLeave(input), /overlap/)
  await faculty.cancelLeave(leave.id)
  await assert.rejects(faculty.cancelLeave(leave.id), /pending/)
})
