import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8'))
  .replace(/^\uFEFF/, '')
  .replace(/^import .*$/gm, '')
  .replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { profileApi } = await import(`data:text/javascript;base64,${Buffer.from(
  `const getAccessToken = () => 'profile-access-token'; const getAuthStorage = () => null; const collegeRequest = (url, options) => ({ url, options });\n${source}`
).toString('base64')}`)

test('profile update uses authenticated PATCH /api/v1/profile with supported DTO fields', async () => {
  const originalFetch = globalThis.fetch
  let call
  try {
    globalThis.fetch = async (url, options) => { call = [url, options]; return Response.json({ success: true, data: { userId: 41, fullName: 'College Administrator' } }) }
    const updatedProfile = await profileApi.updateProfile({
      fullName: 'College Administrator', email: 'admin@example.edu', mobile: '9876543210',
      houseNumber: '12', address: 'Campus Road', pincode: '560001', city: 'Bengaluru',
      district: 'Bengaluru Urban', state: 'Karnataka', permanentHouseNumber: '12',
      permanentAddress: 'Campus Road', permanentPincode: '560001', permanentCity: 'Bengaluru',
      permanentDistrict: 'Bengaluru Urban', permanentState: 'Karnataka',
      sameAsCurrentAddress: true, bio: 'College administrator',
    })
    const [url, options] = call
    assert.match(url, /\/api\/v1\/profile$/)
    assert.equal(options.method, 'PATCH')
    assert.equal(options.headers.Authorization, 'Bearer profile-access-token')
    const payload = JSON.parse(options.body)
    assert.equal(payload.pincode, '560001')
    assert.equal(payload.permanentPincode, '560001')
    assert.equal(payload.aboutMe, 'College administrator')
    assert.equal('sameAsCurrentAddress' in payload, false)
    assert.equal('bio' in payload, false)
    assert.equal(updatedProfile.profileCompleted, undefined)
  } finally { globalThis.fetch = originalFetch }
})

test('profile GET preserves an absent backend completion status as unknown', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => Response.json({ success: true, data: { userId: 41, fullName: 'College Administrator' } })
    const profile = await profileApi.getProfile()
    assert.equal(profile.profileCompleted, undefined)
  } finally { globalThis.fetch = originalFetch }
})