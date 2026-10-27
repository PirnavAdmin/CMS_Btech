import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeachingTransport } from './teachingTransport.js'
const make = response => createTeachingTransport({ getToken: () => 'test-token', authorize() {}, fetchResponse: async () => response })

test('requests JSON using the authenticated faculty session', async () => {
  let headers
  const request = createTeachingTransport({ authorize() {}, getToken: () => 'test-token', fetchResponse: async (_, options) => { headers = options.headers; return { ok: true, status: 200, json: async () => ({ data: [] }) } } })
  assert.deepEqual(await request('/api/v1/subjects/1'), { data: [] })
  assert.equal(headers.Accept, 'application/json')
  assert.equal(headers.Authorization, 'Bearer test-token')
})
test('HTML gateway responses become friendly errors with a diagnostic code', async () => {
  await assert.rejects(make({ ok: true, status: 200, json: async () => { throw new SyntaxError('HTML response') } })('/api/v1/subjects/1'), error => error.code === 'NON_JSON_RESPONSE' && !error.message.includes('tunnel'))
})
test('HTML authentication errors preserve their status instead of triggering route fallback', async () => {
  for (const status of [401, 403]) await assert.rejects(make({ ok: false, status })('/api/v1/subjects/1'), error => error.status === status && ['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.code))
})
test('missing routes and server errors do not become empty data', async () => {
  await assert.rejects(make({ status: 404, ok: false })('/api/missing'), error => error.code === 'NOT_FOUND')
  await assert.rejects(make({ status: 500, ok: false, json: async () => ({ message: '<html>ngrok</html>' }) })('/api/failing'), /temporarily unavailable/)
})
