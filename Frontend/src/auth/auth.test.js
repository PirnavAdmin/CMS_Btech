import test from 'node:test'
import assert from 'node:assert/strict'
import { signIn, signOut, getUserCollegeId, getUserRole, mustChangePassword, isNonTeachingStaff } from './auth.js'
import { selectedCollegeId } from '../utils/collegeScope.js'

const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
}

test('teaching and non-teaching role variants use the faculty workspace', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    for (const role of ['Teaching Faculty', 'NON_TEACHING', 'Non-Teaching Staff', 'HOD', 'PRINCIPAL']) {
      signIn(role, 'opaque-token', 'refresh')
      assert.equal(getUserRole(), 'faculty')
    }
  } finally { delete globalThis.window }
})

test('assigned role templates open the correct workspace without administrative escalation', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    for (const role of ['ACADEMIC_DEAN', 'ACADEMIC_ADMIN', 'EXAM_CONTROLLER', 'FINANCE_OFFICER', 'ADMISSIONS_OFFICER', 'TPO_OFFICER', 'LIBRARIAN', 'CUSTOM_STAFF']) {
      signIn(role, 'opaque-token', 'refresh')
      assert.equal(getUserRole(), 'staff')
      assert.deepEqual(JSON.parse(window.sessionStorage.getItem('btech-assigned-roles')), [role])
    }
    for (const role of ['FACULTY_ACCESS', 'HOD_ACCESS', 'HOD_ROLE']) {
      signIn(role, 'opaque-token', 'refresh')
      assert.equal(getUserRole(), 'faculty')
    }
    signIn('STUDENT_ACCESS', 'opaque-token', 'refresh')
    assert.equal(getUserRole(), 'student')
    signIn(['HOD_ROLE', 'COLLEGE_ADMIN'], 'opaque-token', 'refresh')
    assert.equal(getUserRole(), 'admin')
    signOut()
    assert.equal(window.sessionStorage.getItem('btech-assigned-roles'), null)
  } finally { delete globalThis.window }
})

test('faculty role is recognized even when another assigned role comes first', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    signIn(['HOD', 'FACULTY'], 'opaque-token', 'refresh')
    assert.equal(getUserRole(), 'faculty')
    signOut()
    signIn(['UNKNOWN'], 'opaque-token', 'refresh')
    assert.equal(getUserRole(), 'staff')
  } finally { delete globalThis.window }
})

test('active faculty session ignores stale local role and normalizes in session storage', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    signIn('FACULTY', 'opaque-token', 'refresh', false)
    window.sessionStorage.setItem('btech-user-role', 'FACULTY')
    window.localStorage.setItem('btech-user-role', 'HOD')
    assert.equal(getUserRole(), 'faculty')
    assert.equal(window.sessionStorage.getItem('btech-user-role'), 'faculty')
    assert.equal(window.localStorage.getItem('btech-user-role'), 'HOD')
  } finally { delete globalThis.window }
})

test('temporary-password requirement persists per account and clears on logout', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    for (const remember of [false, true]) {
      signIn('student', 'opaque-token', 'refresh', remember, { mustChangePassword: true })
      assert.equal(mustChangePassword(), true)
      signOut()
      assert.equal(mustChangePassword(), false)
    }
    signIn('faculty', 'opaque-token', 'refresh', false, { mustChangePassword: 'false' })
    assert.equal(mustChangePassword(), false)
  } finally { delete globalThis.window }
})

test('signed token password-change claim is honored even without stored flag', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    const token = `header.${Buffer.from(JSON.stringify({ mustChangePassword: true })).toString('base64url')}.signature`
    signIn('faculty', token, 'refresh')
    window.sessionStorage.removeItem('btech-must-change-password')
    assert.equal(mustChangePassword(), true)
    signOut()
    assert.equal(mustChangePassword(), false)
  } finally { delete globalThis.window }
})

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

test('isNonTeachingStaff distinguishes non-teaching roles from teaching faculty and students', () => {
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    signIn('NON_TEACHING', 'opaque-token', 'refresh')
    assert.equal(isNonTeachingStaff(), true)
    signOut()

    signIn('Non-Teaching Staff', 'opaque-token', 'refresh')
    assert.equal(isNonTeachingStaff(), true)
    signOut()

    signIn('Teaching Faculty', 'opaque-token', 'refresh')
    assert.equal(isNonTeachingStaff(), false)
    signOut()

    signIn('Teaching Staff', 'opaque-token', 'refresh')
    assert.equal(getUserRole(), 'faculty')
    assert.equal(isNonTeachingStaff(), false)
    signOut()

    signIn('HOD', 'opaque-token', 'refresh')
    assert.equal(isNonTeachingStaff(), false)
    signOut()

    signIn('student', 'opaque-token', 'refresh')
    assert.equal(isNonTeachingStaff(), false)
    signOut()
  } finally { delete globalThis.window }
})

