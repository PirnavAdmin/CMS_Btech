import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLoginSession } from './loginSession.js'
test('administrator login preserves the server profile completion gate', () => {
 const result = normalizeLoginSession({ data: { accessToken: 'test', roles: ['COLLEGE_ADMIN'], userId: 1, profileCompleted: false, mustChangePassword: false } })
 assert.equal(result.user.profileCompleted, false)
 assert.equal(result.user.mustChangePassword, false)
})
test('nested profile completion flags retain precedence over outer flags', () => {
 const result = normalizeLoginSession({ accessToken: 'test', roles: ['COLLEGE_ADMIN'], profileCompleted: true, user: { profileCompleted: false } })
 assert.equal(result.user.profileCompleted, false)
})
