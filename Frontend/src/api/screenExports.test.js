import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, '')
  .replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test/" })')
const api = await import(`data:text/javascript;base64,${Buffer.from(`const getAccessToken = () => 'test-token';\n${source}`).toString('base64')}`)

test('all screen aliases use the specified routes, auth, and encoded filters', async () => {
  assert.equal(Object.keys(api.SCREEN_EXPORT_ENDPOINTS).length, 20)
  const originalFetch = globalThis.fetch
  try {
    for (const screen of Object.keys(api.SCREEN_EXPORT_ENDPOINTS)) {
      const prefix = ['college-settings', 'academic-levels', 'semester', 'roles'].includes(screen) ? '/api' : '/api/v1'
      for (const action of ['download', 'export']) {
        globalThis.fetch = async (url, options) => {
          assert.equal(url, `https://example.test${prefix}/${screen}/${action}?search=A%26B`)
          assert.equal(options.headers.Authorization, 'Bearer test-token')
          return new Response('name\r\nExample', { headers: { 'content-type': 'text/csv' } })
        }
        const result = await api.screenExportsApi[action](screen, { search: 'A&B', unused: '' })
        assert.equal(await result.blob.text(), 'name\r\nExample')
      }
    }
    for (const contentType of ['application/json', 'text/html']) {
      globalThis.fetch = async () => new Response('{}', { headers: { 'content-type': contentType } })
      await assert.rejects(api.screenExportsApi.download('colleges'), /did not return an export file/)
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Access denied' }), { status: 403 })
    await assert.rejects(api.screenExportsApi.download('colleges'), /Access denied/)
    await assert.rejects(api.screenExportsApi.download('unknown'), /does not support/)
    globalThis.fetch = async url => {
      assert.equal(url, 'https://example.test/api/v1/exports/academic%20years')
      return new Response('name\r\nExample', { headers: { 'content-type': 'text/csv' } })
    }
    assert.equal(await (await api.screenExportsApi.getScreen('academic years')).blob.text(), 'name\r\nExample')
    globalThis.fetch = async url => {
      assert.equal(url, 'https://example.test/api/v1/exports/semesters')
      return new Response('SemesterId\r\n1', { headers: { 'content-type': 'text/csv' } })
    }
    await api.screenExportsApi.getScreen('semester')
    const attempted = []
    globalThis.fetch = async url => {
      attempted.push(url)
      return url.includes('/exports/')
        ? new Response('name\r\nExample', { headers: { 'content-type': 'text/csv' } })
        : new Response(null, { status: 404 })
    }
    await api.screenExportsApi.save('colleges', { Format: 'csv' })
    assert.deepEqual(attempted, [
      'https://example.test/api/v1/colleges/export?Format=csv',
      'https://example.test/api/v1/colleges/download?Format=csv',
      'https://example.test/api/v1/exports/colleges?Format=csv',
    ])
    let deniedCalls = 0
    globalThis.fetch = async () => { deniedCalls += 1; return new Response(null, { status: 403 }) }
    await assert.rejects(api.screenExportsApi.save('colleges'), error => error.status === 403)
    assert.equal(deniedCalls, 1)
    globalThis.fetch = async url => {
      assert.equal(url, 'https://example.test/api/v1/exports')
      return Response.json({ data: ['colleges'] })
    }
    assert.deepEqual(await api.screenExportsApi.list(), { data: ['colleges'] })
  } finally {
    globalThis.fetch = originalFetch
  }
})
