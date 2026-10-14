import test from 'node:test'
import assert from 'node:assert/strict'
import { GENERIC_ERROR_MESSAGE, userErrorMessage } from './userError.js'
import { createApiUnavailableError } from '../api/apiFailureNotice.js'

test('server failures hide response details for every server status', () => {
  for (const status of [500, 502, 503, 504]) {
    assert.equal(userErrorMessage({ message: 'Private diagnostic details', status }), GENERIC_ERROR_MESSAGE)
    assert.equal(userErrorMessage({ response: { status, data: { message: 'Private details' } } }), GENERIC_ERROR_MESSAGE)
    const error = createApiUnavailableError(status)
    assert.equal(error.message, GENERIC_ERROR_MESSAGE)
    assert.equal(error.status, status)
    assert.equal(error.retryable, true)
  }
})

test('network failures and technical strings share the generic message', () => {
  for (const value of ['Failed to fetch', 'NetworkError when fetching', 'The backend server is unavailable.', '<html>Bad Gateway</html>', 'MySql exception']) {
    assert.equal(userErrorMessage(value), GENERIC_ERROR_MESSAGE)
  }
  assert.equal(createApiUnavailableError().message, GENERIC_ERROR_MESSAGE)
})

test('actionable validation and authentication messages are preserved', () => {
  for (const message of ['Please enter a valid email address.', 'Your session has expired. Please sign in again.', 'A branch with this code already exists.']) {
    assert.equal(userErrorMessage({ message, status: 400 }), message)
  }
  assert.equal(userErrorMessage(''), '')
})
