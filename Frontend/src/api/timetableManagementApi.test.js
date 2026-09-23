import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8')).replace(/^import .*$/gm, '').replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { timetableManagementApi: api } = await import(`data:text/javascript;base64,${Buffer.from(`const getAccessToken = () => 'test-token';\n${source}`).toString('base64')}`)

test('timetable API uses configured base, bearer token, query and documented HTTP methods', async () => {
  const previous = globalThis.fetch
  const calls = []
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options })
      assert.equal(options.headers.Authorization, 'Bearer test-token')
      assert.equal(options.headers['ngrok-skip-browser-warning'], 'true')
      return Response.json({ success: true, data: { periodId: 7 } }, { status: options.method === 'POST' ? 201 : 200 })
    }
    await api.get('/periods', { academicYearId: 2, unused: undefined })
    assert.equal(calls[0].url, 'https://example.test/api/v1/timetable-management/periods?academicYearId=2')
    assert.deepEqual(await api.post('/periods', { academicYearId: 2 }), { periodId: 7 })
    await api.put('/timetables/8/entries/11', { classroomId: 5 })
    await api.remove('/timetables/8/entries/11')
    assert.equal(calls[1].options.method, 'POST'); assert.equal(calls[2].options.method, 'PUT'); assert.equal(calls[3].options.method, 'DELETE')
    assert.deepEqual(JSON.parse(calls[2].options.body), { classroomId: 5 })
  } finally { globalThis.fetch = previous }
})

test('conflicts retain the real HTTP status and backend reason', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async () => Response.json({ success: false, message: 'Faculty overlaps an existing class.' }, { status: 409 })
    await assert.rejects(api.post('/timetables/8/publish'), error => error.status === 409 && error.message.includes('Faculty overlaps'))
  } finally { globalThis.fetch = previous }
})
