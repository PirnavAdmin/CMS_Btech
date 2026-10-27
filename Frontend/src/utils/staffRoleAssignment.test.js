import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveStaffAccount, planRoleAssignment } from './staffRoleAssignment.js'

const users = [{ userId: 91, collegeId: 2, email: 'staff@example.test', status: 1 }, { userId: 92, collegeId: 3, email: 'staff@example.test', status: 1 }]
test('role assignment resolves the login user instead of using faculty ID', () => {
  assert.equal(resolveStaffAccount({ id: 5, email: 'staff@example.test' }, users, 2), 91)
  assert.throws(() => resolveStaffAccount({ id: 91 }, users, 2))
  assert.throws(() => resolveStaffAccount({ userId: 92 }, users, 2))
  assert.throws(() => resolveStaffAccount({ email: 'staff@example.test' }, users, ''))
})
test('assignment creates or updates the backend mapping without leaving the old role active', () => {
  assert.equal(planRoleAssignment([], 91, 7).method, 'POST')
  assert.deepEqual(planRoleAssignment([{ userRoleId: 15, userId: 91, roleId: 5, status: 1 }], 91, 7), { method: 'PUT', id: 15, payload: { userId: 91, roleId: 7, status: 1 } })
  assert.equal(planRoleAssignment([{ userRoleId: 15, userId: 91, roleId: 7, status: 1 }], 91, 7).method, 'none')
  assert.throws(() => planRoleAssignment([], 91, 'ROLE-LOCAL'))
  assert.throws(() => planRoleAssignment([{ userId: 91, roleId: 5, status: 1 }, { userId: 91, roleId: 6, status: 1 }], 91, 7))
})
