import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { facultyCreatePayload, facultyEmployeeCode } from './facultyContracts.js'

const source = readFileSync(new URL('./facultyService.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/export default facultyService/, '').replace(/export const /g, 'const ')
function setup({ records = [], profiles = {}, cachedProfiles = {}, cachedFaculty = [], failProfile = false, colleges = [] } = {}) {
  const storage = new Map([
    ['pirnav-faculty-local-profiles-v1', JSON.stringify(cachedProfiles)],
    ['pirnav-faculty-local-records-v1', JSON.stringify(cachedFaculty)],
  ])
  let profileReads = 0
  const context = vm.createContext({
    API_BASE_URL: '', newestFirst: (_, rows) => rows, facultyCreatePayload, facultyEmployeeCode,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    facultyApi: { getAll: async () => [], getById: async id => records.find(row => String(row.facultyId) === String(id)) },
    facultyMasterApi: { getColleges: async () => colleges },
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

test('college information does not change EMP codes in list, detail and save', async () => {
  const app = setup({ colleges: [{ collegeId: 2, collegeCode: 'BTECH', collegeName: 'B Tech College' }], records: [{ facultyId: 9, collegeId: 2, facultyCode: 'FAC001' }], failProfile: true })
  const [member] = await app.service.list()
  assert.equal(member.employeeId, 'EMP000009')
  assert.equal(app.normalize(member).employeeId, member.employeeId)
  assert.equal((await app.service.getById(9)).employeeId, member.employeeId)
  app.facultyApi.create = async () => ({ facultyId: 10, collegeId: 2 })
  assert.equal((await app.service.create({ collegeId: 2, departmentId: 3 })).employeeId, 'EMP000010')
})
test('existing photo avoids profile requests and placeholder aliases do not mask it', async () => {
  const app = setup({ records: [{ facultyId: 9, profilePhotoUrl: 'string', photo: '/uploads/test.jpg' }] })
  assert.equal((await app.service.list())[0].photo, '/uploads/test.jpg')
  assert.equal(app.profileReads(), 0)
})
test('cached faculty matched by college and code preserves photo when remote ID differs', async () => {
  const app = setup({ records: [{ facultyId: 9, collegeId: 1, facultyCode: 'FAC009' }], cachedFaculty: [{ id: 'old', collegeId: 1, employeeId: 'FAC009', photo: '/uploads/test.jpg' }] })
  const rows = await app.service.list()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, '9')
  assert.equal(rows[0].photo, '/uploads/test.jpg')
})

test('faculty code and employee ID remain independent without changing the primary key', () => {
  const app = setup()
  const member = app.normalize({ facultyId: 9, facultyCode: 'FAC001', employeeId: 'EMP000003' })
  assert.equal(member.id, '9')
  assert.equal(member.facultyCode, 'FAC001')
  assert.equal(member.employeeId, 'EMP000009')
  const legacy = app.normalize({ facultyId: 10, employeeId: 'FAC002' })
  assert.equal(legacy.facultyCode, 'FAC002')
  assert.equal(legacy.employeeId, 'EMP000010')
  const snake = app.normalize({ id: 'uuid', college_id: 2, faculty_code: 'FAC001', employee_id: 'EMP000004' })
  assert.equal(snake.id, 'uuid')
  assert.equal(snake.collegeId, 2)
  assert.equal(snake.facultyCode, 'FAC001')
  assert.equal(snake.employeeId, '')
})

test('identical faculty codes in different colleges do not merge cached records or photos', async () => {
  const app = setup({ records: [{ facultyId: 9, collegeId: 2, facultyCode: 'FAC001', employeeId: 'EMP000002' }], cachedFaculty: [{ id: '8', collegeId: 1, facultyCode: 'FAC001', employeeId: 'EMP000001', photo: '/uploads/other.jpg' }], failProfile: true })
  const rows = await app.service.list()
  assert.equal(rows.length, 2)
  assert.equal(rows.find(row => row.id === '9').photo, '')
  assert.equal(rows.find(row => row.id === '8').photo, '/uploads/other.jpg')
})

test('legacy codes without a college do not merge unrelated records', async () => {
  const app = setup({ records: [{ facultyId: 9, facultyCode: 'FAC001' }], cachedFaculty: [{ id: '8', employeeId: 'FAC001' }], failProfile: true })
  assert.equal((await app.service.list()).length, 2)
})

test('employee display code uses the faculty primary key independently of API codes', () => {
  const app = setup()
  assert.equal(app.normalize({ facultyId: 12, employeeCode: 'EMP000010', employeeId: 'EMP000009' }).employeeId, 'EMP000012')
  assert.equal(app.normalize({ facultyId: 12, employee_code: 'FAC001' }).employeeId, 'EMP000012')
})

test('list and detail replace FAC display with the same stable EMP code', async () => {
  const app = setup({ records: [{ facultyId: 9, collegeId: 1, facultyCode: 'FAC001' }], failProfile: true })
  assert.equal((await app.service.list())[0].employeeId, 'EMP000009')
  assert.equal((await app.service.getById(9)).employeeId, 'EMP000009')
  assert.equal(app.normalize({ facultyId: 2, faculty_code: 'FAC002' }).employeeId, 'EMP000002')
  assert.equal(app.normalize({ facultyId: 3, employeeCode: 'FAC003' }).employeeId, 'EMP000003')
})

test('displaying FAC codes does not merge different colleges', async () => {
  const app = setup({ records: [{ facultyId: 9, collegeId: 2, facultyCode: 'FAC001' }], cachedFaculty: [{ id: '8', collegeId: 1, facultyCode: 'FAC001', photo: '/uploads/other.jpg' }], failProfile: true })
  const rows = await app.service.list()
  assert.equal(rows.length, 2)
  assert.equal(rows.find(row => row.id === '9').photo, '')
})

test('different employee IDs do not merge through a shared legacy faculty code', async () => {
  const app = setup({ records: [{ facultyId: 9, collegeId: 1, facultyCode: 'FAC001', employeeCode: 'EMP000002' }], cachedFaculty: [{ id: '8', collegeId: 1, facultyCode: 'FAC001', employeeId: 'EMP000001', photo: '/uploads/other.jpg' }], failProfile: true })
  const rows = await app.service.list()
  assert.equal(rows.length, 2)
  assert.equal(rows.find(row => row.id === '9').photo, '')
})

test('hidden API references never display as employee IDs, including cached and attendance records', async () => {
  const reference = 'ba62a38459ea413cb10f9e4a8cef3e70'
  const app = setup({ records: [{ facultyId: 9, facultyCode: reference }], cachedFaculty: [{ id: '9', employeeId: reference }], failProfile: true })
  assert.equal(app.normalize({ employeeId: reference }).employeeId, '')
  assert.equal(app.normalize({ employeeCode: reference }).employeeId, '')
  assert.equal(app.normalize({ facultyId: 9, employeeId: reference, employeeCode: 'EMP000009' }).employeeId, 'EMP000009')
  assert.equal((await app.service.list())[0].employeeId, 'EMP000009')
})

test('create uses only server-assigned identifiers, never values supplied by the form', async () => {
  const app = setup()
  app.facultyApi.create = async () => ({ facultyId: 11, facultyCode: 'FAC001', employeeId: 'EMP000003' })
  const payload = { collegeId: 2, departmentId: 3, facultyCode: 'FAC999', employeeId: 'EMP999999' }
  const member = await app.service.create(payload)
  assert.equal(member.id, '11')
  assert.equal(member.facultyCode, 'FAC001')
  assert.equal(member.employeeId, 'EMP000011')
  app.facultyApi.create = async () => ({ facultyId: 12 })
  const missing = await app.service.create(payload)
  assert.equal(missing.facultyCode, '')
  assert.equal(missing.employeeId, 'EMP000012')
})
