import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { resolveCollegeLogo } from '../utils/collegeLogo.js'

const source = readFileSync(new URL('./collegeApi.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/import\.meta\.env/g, 'env').replace(/export const /g, 'const ')
const setup = () => {
  const requests = []
  const context = vm.createContext({ env: { DEV: true }, resolveCollegeLogo, URL,
    getAccessToken: () => 'test-token',
    window: { location: { origin: 'http://localhost:5173' } },
    localStorage: { getItem: key => key === 'btech-access-token' ? 'test-token' : null },
    sessionStorage: { getItem: () => null },
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, blob: async () => ({ type: 'image/png' }) } },
  })
  vm.runInContext(source + '\nthis.logoUrl = getCollegeLogoUrl; this.fetchLogo = fetchCollegeLogo;', context)
  return { context, requests }
}

test('missing list logo loads the documented college logo endpoint with authentication', async () => {
  const { context, requests } = setup()
  const url = context.logoUrl(2, '')
  assert.equal(url, '/api/College/logo/2')
  await context.fetchLogo(url)
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token')
  assert.equal(requests[0].options.headers['ngrok-skip-browser-warning'], 'true')
  assert.equal(context.logoUrl(null, ''), '')
})

test('existing upload paths remain preferred over endpoint fallback', () => {
  assert.equal(setup().context.logoUrl(2, '/uploads/logo.png'), '/uploads/logo.png')
})
