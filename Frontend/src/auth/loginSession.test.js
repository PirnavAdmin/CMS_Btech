import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLoginSession } from './loginSession.js'
import { signIn, signOut, getUserRole, getAuthStorage } from './auth.js'

test('backend login envelope opens a faculty session with the returned identity', () => {
  const storage = () => {
    const values = new Map()
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
  }
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    const session = normalizeLoginSession({ success: true, data: { accessToken: 'token', refreshToken: 'refresh', userId: 21, fullName: 'Faculty Member', email: 'faculty@example.test', mobile: '9876543210', employeeUserId: 'FAC021', roles: ['HOD', 'FACULTY'] } })
    signIn(session.roles, session.accessToken, session.refreshToken, false, session.user)
    assert.equal(getUserRole(), 'faculty')
    assert.equal(getAuthStorage().getItem('btech-user-id'), '21')
    assert.equal(getAuthStorage().getItem('btech-user-name'), 'Faculty Member')
    assert.equal(getAuthStorage().getItem('btech-user-email'), 'faculty@example.test')
    assert.equal(getAuthStorage().getItem('btech-user-employee-id'), 'FAC021')
    signOut()
    assert.equal(getAuthStorage().getItem('btech-user-email'), null)
  } finally { delete globalThis.window }
})

test('direct login response retains user details and assigned roles', () => {
  const session = normalizeLoginSession({ accessToken: 'token', roles: ['FACULTY'], user: { id: 2, name: 'Faculty', role: 'HOD', collegeId: 5, mustChangePassword: true } })
  assert.equal(session.user.id, 2)
  assert.equal(session.user.collegeId, 5)
  assert.equal(session.user.mustChangePassword, true)
  assert.ok(session.roles.includes('FACULTY'))
})

test('invalid sessions cannot use a default role', () => {
  for (const response of [{ success: false }, { user: { role: 'faculty' } }, { accessToken: 'token' }]) {
    assert.throws(() => normalizeLoginSession(response))
  }
})
