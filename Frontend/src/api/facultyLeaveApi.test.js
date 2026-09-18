import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, '')
  .replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { facultyLeaveApi } = await import(`data:text/javascript;base64,${Buffer.from(`const getAccessToken = () => 'test-token';\n${source}`).toString('base64')}`)

test('leave collections preserve records across plain, paged and named envelopes', async () => {
  const originalFetch = globalThis.fetch
  try {
    for (const [method, path, key] of [
      ['getRequests', 'requests', 'leaveRequests'],
      ['getHistory', 'history', 'history'],
      ['getBalances', 'balances', 'leaveBalances'],
      ['getTypes', 'types', 'leaveTypes'],
      ['getPolicies', 'policies', 'policies'],
    ]) {
      const rows = [{ id: '42' }]
      for (const body of [rows, { data: rows }, { data: { items: rows } }, { data: { [key]: rows } }, { data: { data: { [key]: rows } } }]) {
        globalThis.fetch = async (url, options) => {
          assert.equal(url, `https://example.test/api/v1/faculty-leave/${path}?search=A%26B`)
          assert.equal(options.headers.Authorization, 'Bearer test-token')
          return Response.json(body)
        }
        assert.deepEqual(await facultyLeaveApi[method]({ search: 'A&B' }), rows)
      }
      globalThis.fetch = async () => Response.json({ data: { [key]: [] } })
      assert.deepEqual(await facultyLeaveApi[method](), [])
    }
  } finally { globalThis.fetch = originalFetch }
})

test('malformed responses are errors instead of misleading empty leave lists', async () => {
  const originalFetch = globalThis.fetch
  try {
    for (const body of [null, {}, { data: { message: 'Unavailable' } }, { data: { leaveTypes: 'invalid' } }]) {
      globalThis.fetch = async () => Response.json(body)
      await assert.rejects(facultyLeaveApi.getTypes(), /unexpected response/)
    }
    globalThis.fetch = async () => new Response('<html>Tunnel unavailable</html>')
    await assert.rejects(facultyLeaveApi.getRequests(), /unexpected response/)
    globalThis.fetch = async () => Response.json({ success: false, message: 'Leave service unavailable' })
    await assert.rejects(facultyLeaveApi.getRequests(), /Leave service unavailable/)
  } finally { globalThis.fetch = originalFetch }
})
