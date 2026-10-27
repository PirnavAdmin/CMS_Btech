import test from 'node:test'
import assert from 'node:assert/strict'
import { assignedPermissions, canViewScreen } from './screenPermissions.js'

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
  assert.equal(canViewScreen('/faculty-portal/materials', 'faculty', permissions), false)
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
