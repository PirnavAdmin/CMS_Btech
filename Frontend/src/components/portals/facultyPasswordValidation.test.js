import test from 'node:test'
import assert from 'node:assert/strict'
import { passwordRequirements, validateFacultyPassword } from './facultyPasswordValidation.js'

test('requires current, new, and confirmation passwords', () => {
  assert.deepEqual(Object.keys(validateFacultyPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })), ['currentPassword', 'newPassword', 'confirmPassword'])
})
test('matches admin strength policy and rejects reused or mismatched passwords', () => {
  const strong = 'Example123!'
  assert.ok(passwordRequirements(strong).every(([, met]) => met))
  assert.match(validateFacultyPassword({ currentPassword: 'Old123!', newPassword: 'weak', confirmPassword: 'weak' }).newPassword, /requirements/)
  assert.match(validateFacultyPassword({ currentPassword: strong, newPassword: strong, confirmPassword: strong }).newPassword, /different/)
  assert.match(validateFacultyPassword({ currentPassword: 'Old123!', newPassword: strong, confirmPassword: 'Other123!' }).confirmPassword, /do not match/)
})
test('accepts a strong distinct password with a matching confirmation', () => {
  assert.deepEqual(validateFacultyPassword({ currentPassword: 'Old123!', newPassword: 'Example123!', confirmPassword: 'Example123!' }), {})
})
