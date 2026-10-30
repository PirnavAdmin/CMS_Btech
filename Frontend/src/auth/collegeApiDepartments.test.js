import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('./collegeApi.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/import\.meta\.env/g, 'env')
  .replace(/export const /g, 'const ')

const setup = collegeId => {
  const requests = []
  const context = vm.createContext({
    env: { DEV: true },
    URLSearchParams,
    FormData,
    selectedCollegeId: () => collegeId,
    localStorage: { getItem: () => null },
    sessionStorage: { getItem: () => null },
    fetch: async (url, options) => {
      requests.push({ url, options })
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [] }),
      }
    },
  })

  vm.runInContext(
    source + '\nthis.departmentMethods = { getDepartments, searchDepartments, getDepartmentsPaginated, getCourses };',
    context,
  )

  return { methods: context.departmentMethods, requests }
}

test('department list, search, and pagination requests include the selected college', async () => {
  const { methods, requests } = setup('42')

  await methods.getDepartments()
  await methods.searchDepartments('science')
  await methods.getDepartmentsPaginated(2, 10)

  assert.equal(new URL(requests[0].url, 'http://localhost').searchParams.get('collegeId'), '42')
  assert.equal(new URL(requests[1].url, 'http://localhost').searchParams.get('collegeId'), '42')
  assert.equal(new URL(requests[1].url, 'http://localhost').searchParams.get('search'), 'science')
  assert.equal(new URL(requests[2].url, 'http://localhost').searchParams.get('collegeId'), '42')
  assert.equal(new URL(requests[2].url, 'http://localhost').searchParams.get('page'), '2')
  assert.equal(new URL(requests[2].url, 'http://localhost').searchParams.get('pageSize'), '10')
})

test('department requests remain unscoped when no college is selected', async () => {
  const { methods, requests } = setup('')

  await methods.getDepartments()

  assert.equal(new URL(requests[0].url, 'http://localhost').search, '')
})

test('course list requests include the selected college and active status filter', async () => {
  const { methods, requests } = setup('42')
  await methods.getCourses({ status: 1 })
  const params = new URL(requests[0].url, 'http://localhost').searchParams
  assert.equal(params.get('collegeId'), '42')
  assert.equal(params.get('status'), '1')
})
