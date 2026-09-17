import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./facultyService.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/export default facultyService/, '').replace(/export const /g, 'const ')
function setup({ records = [], profiles = {}, cachedProfiles = {}, cachedFaculty = [], failProfile = false } = {}) {
  const storage = new Map([
    ['pirnav-faculty-local-profiles-v1', JSON.stringify(cachedProfiles)],
    ['pirnav-faculty-local-records-v1', JSON.stringify(cachedFaculty)],
  ])
  let profileReads = 0
  const context = vm.createContext({
    API_BASE_URL: '', newestFirst: (_, rows) => rows,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    facultyApi: { getAll: async () => [], getById: async id => records.find(row => String(row.facultyId) === String(id)) },
    facultyAttendanceApi: { getDaily: async () => records },
    facultyProfileApi: { get: async id => { profileReads++; if (failProfile) throw Error('404'); return profiles[id] } },
    facultyDocumentApi: {}, facultyLeaveApi: {}, facultyPayrollApi: {}, facultySubjectAllocationApi: {},
  })
  vm.runInContext(source + '\nthis.service = facultyService; this.normalize = normalizeFaculty;', context)
  return { ...context, profileReads: () => profileReads }
}

test('attendance fallback recovers a photo stored only in the local profile', async () => {
  const app = setup({ records: [{ facultyId: 9, facultyName: 'Test Faculty' }], cachedProfiles: { 9: { photo: 'data:image/png;base64,test' } }, failProfile: true })
  const [member] = await app.service.list()
  assert.equal(member.photo, 'data:image/png;base64,test')
  assert.equal(member.id, '9')
  assert.equal(app.profileReads(), 0)
})
test('list and detail obtain remote profile photo without replacing faculty ID', async () => {
  const app = setup({ records: [{ facultyId: 9, facultyName: 'Test Faculty' }], profiles: { 9: { id: 200, profilePhotoUrl: '/uploads/test.jpg' } } })
  assert.equal((await app.service.list())[0].photo, '/uploads/test.jpg')
  const member = await app.service.getById(9)
  assert.equal(member.id, '9')
  assert.equal(member.photo, '/uploads/test.jpg')
})
test('missing profile leaves the faculty row available', async () => {
  const app = setup({ records: [{ facultyId: 9 }], failProfile: true })
  assert.equal((await app.service.list())[0].id, '9')
})
test('existing photo avoids profile requests and placeholder aliases do not mask it', async () => {
  const app = setup({ records: [{ facultyId: 9, profilePhotoUrl: 'string', photo: '/uploads/test.jpg' }] })
  assert.equal((await app.service.list())[0].photo, '/uploads/test.jpg')
  assert.equal(app.profileReads(), 0)
})
test('cached faculty matched by code preserves photo when remote ID differs', async () => {
  const app = setup({ records: [{ facultyId: 9, facultyCode: 'FAC009' }], cachedFaculty: [{ id: 'old', employeeId: 'FAC009', photo: '/uploads/test.jpg' }] })
  const rows = await app.service.list()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, '9')
  assert.equal(rows[0].photo, '/uploads/test.jpg')
})
