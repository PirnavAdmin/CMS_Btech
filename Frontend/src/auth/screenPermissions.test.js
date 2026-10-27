import test from 'node:test'
import assert from 'node:assert/strict'
import { assignedPermissions, canViewScreen, requireAssignedPermissions } from './screenPermissions.js'

test('employees can open only their own known workspace screens without admin permissions', () => {
  for (const screen of ['dashboard', 'students', 'subjects', 'attendance', 'my-attendance', 'marks', 'timetable', 'materials', 'leave', 'profile', 'notifications']) {
    assert.equal(canViewScreen(`/faculty-portal/${screen}`, 'faculty', {}), true)
    assert.equal(canViewScreen(`/faculty-portal/${screen}`, 'staff', {}), false)
  }
  for (const screen of ['dashboard', 'my-profile', 'my-attendance', 'leave', 'duty-roster', 'tasks', 'notices', 'meetings-events', 'documents']) {
    assert.equal(canViewScreen(`/staff-portal/${screen}`, 'staff', {}), true)
    assert.equal(canViewScreen(`/staff-portal/${screen}`, 'faculty', {}), false)
  }
  assert.equal(canViewScreen('/staff-portal/unknown', 'staff', {}), false)
  assert.equal(canViewScreen('/roles-designations', 'staff', {}), false)
  assert.equal(canViewScreen('/student-management/profiles', 'faculty', {}), false)
})

test('only assigned active roles grant explicit view access, including serialized matrices', () => {
  const rows = [
    { roleCode: 'FACULTY', permissions: '{"marks":{"view":true},"fees":{"view":false,"edit":true}}' },
    { roleCode: 'HOD', permissions: { student_profiles: { view: true } } },
    { roleCode: 'OTHER', permissions: { fees: { view: true } } },
    { roleCode: 'OLD', status: 0, permissions: { fees: { view: true } } },
  ]
  const permissions = assignedPermissions(rows, ['Faculty', 'HOD', 'OLD'])
  assert.equal(canViewScreen('/faculty-portal/marks', 'faculty', permissions), true)
  assert.equal(canViewScreen('/faculty-portal/students', 'faculty', permissions), true)
  assert.equal(canViewScreen('/fees', 'faculty', permissions), false)
  assert.equal(permissions.fees.edit, false)
  assert.equal(canViewScreen('/faculty-portal/materials', 'faculty', permissions), true)
})

test('students are restricted to their portal even when granted administrative module permissions', () => {
  const permissions = { student_profiles: { view: true }, subjects: { view: true }, fees: { view: true } }
  assert.equal(canViewScreen('/student-portal/subjects', 'student', permissions), true)
  assert.equal(canViewScreen('/student-portal/fees', 'student', permissions), true)
  assert.equal(canViewScreen('/student-management/profiles', 'student', permissions), false)
  assert.equal(canViewScreen('/faculty-portal/subjects', 'student', permissions), false)
  assert.equal(canViewScreen('/student-portal/results', 'student', permissions), false)
  assert.equal(canViewScreen('/student-portal/dashboard', 'student', {}), false)
  assert.equal(canViewScreen('/student-portal/dashboard', 'student', { dashboard: { view: true } }), true)
})

test('nested module URLs obey the same permissions and unknown routes are denied', () => {
  assert.equal(canViewScreen('/marks-management/edit-marks', 'faculty', { marks: { view: true } }), true)
  assert.equal(canViewScreen('/marks-management/edit-marks', 'faculty', {}), false)
  assert.equal(canViewScreen('/unknown', 'faculty', {}), false)
  assert.equal(canViewScreen('/roles-designations', 'admin', {}), true)
})

test('the current backend role DTO without permissions is identified as a configuration error', () => {
  const backendRoles = [{ role_id: 4, roleName: 'Teaching Faculty', roleCode: 'TEACHING_FACULTY', status: 1 }]
  assert.throws(() => requireAssignedPermissions(backendRoles, ['TEACHING_FACULTY']), /did not return screen permissions/)
})

test('empty administrative policies do not grant shared module access', () => {
  assert.throws(() => requireAssignedPermissions([{ roleCode: 'FACULTY', status: true, permissions: { dashboard: { view: false }, subjects: { view: false } } }], ['FACULTY']), /FACULTY.*no enabled screen permissions/)
  assert.throws(() => requireAssignedPermissions([{ roleCode: 'FACULTY', status: 1, permissions: {} }], ['FACULTY']), /no enabled screen permissions/)
  const permissions = assignedPermissions([{ roleCode: 'FACULTY', status: 1, permissions: {} }], ['FACULTY'])
  assert.equal(canViewScreen('/faculty-portal/dashboard', 'faculty', permissions), true)
  assert.equal(canViewScreen('/faculty-portal/marks', 'faculty', permissions), true)
  assert.equal(canViewScreen('/fees', 'faculty', permissions), false)
})

test('a valid policy and personal workspace access coexist', () => {
  const permissions = requireAssignedPermissions([{ roleCode: 'TEACHING_FACULTY', permissions: '{"dashboard":{"view":true},"my_profile":{"view":true}}' }], ['TEACHING_FACULTY'])
  assert.equal(canViewScreen('/faculty-portal/dashboard', 'faculty', permissions), true)
  assert.equal(canViewScreen('/faculty-portal/profile', 'faculty', permissions), true)
  assert.equal(canViewScreen('/faculty-portal/marks', 'faculty', permissions), true)
})

test('personal attendance belongs to the faculty workspace', () => {
  assert.equal(canViewScreen('/faculty-portal/my-attendance', 'faculty', { faculty_attendance: { view: true } }), true)
  assert.equal(canViewScreen('/faculty-portal/my-attendance', 'faculty', { student_attendance: { view: true } }), true)
})

test('unmapped and malformed assigned policies produce recoverable configuration errors', () => {
  assert.throws(() => requireAssignedPermissions([], ['FACULTY']), /No active role configuration/)
  assert.throws(() => requireAssignedPermissions([{ roleCode: 'FACULTY', permissions: 'invalid json' }], ['FACULTY']), /invalid permissions/)
})

