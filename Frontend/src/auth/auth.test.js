import test from 'node:test'
import assert from 'node:assert/strict'
import { signIn, signOut, getUserCollegeId, getUserRole } from './auth.js'
import { selectedCollegeId } from '../utils/collegeScope.js'

const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
}

test('switching accounts clears prior academic context and uses the token college', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    window.localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId: '1', academicYearId: '9' }))
    window.localStorage.setItem('selected_college_id', '1')
    const token = `header.${Buffer.from(JSON.stringify({ collegeId: '2' })).toString('base64url')}.signature`
    signIn('college_admin', token, 'refresh', false, { id: 7, collegeId: 2 })
    assert.equal(window.localStorage.getItem('pirnav_academic_context'), null)
    assert.equal(window.localStorage.getItem('selected_college_id'), null)
    assert.equal(getUserCollegeId(), '2')
    assert.equal(selectedCollegeId(), '2')
    signOut()
    assert.equal(getUserCollegeId(), '')
  } finally { delete globalThis.window }
})

test('login response supplies college identity when the token cannot be decoded', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    signIn('admin', 'opaque-token', '', true, { collegeId: 3 })
    assert.equal(getUserCollegeId(), '3')
  } finally { delete globalThis.window }
})

test('SuperAdmin can select colleges despite a college in the login response', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  globalThis.localStorage = window.localStorage
  try {
    const claims = { 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['SuperAdmin', 'Admin'] }
    const token = `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
    signIn(['SuperAdmin'], token, '', false, { collegeId: 1 })
    window.localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId: '8' }))
    assert.equal(getUserRole(), 'admin')
    assert.equal(getUserCollegeId(), '')
    assert.equal(selectedCollegeId(), '8')
  } finally { delete globalThis.window; delete globalThis.localStorage }
})

test('non-teaching role aliases open the canonical staff workspace', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    for (const role of ['staff', 'Non-Teaching', 'Non-Teaching Staff', 'NonTeachingStaff']) {
      signIn(role, 'opaque-token', '')
      assert.equal(getUserRole(), 'staff')
    }

    window.sessionStorage.setItem('btech-user-role', 'non_teaching_staff')
    assert.equal(getUserRole(), 'staff')
  } finally { delete globalThis.window }
})
