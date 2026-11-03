import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createCollegeScope, collegeField } from '../utils/collegeScope.js'

const source = readFileSync(new URL('./apiEndpoints.js', import.meta.url), 'utf8')
const loader = source.match(/export const academicYearApi = \{\s+getAll: (async \(options = \{\}\) => \{[\s\S]*?)\n  \},/)[1] + '\n}'
const own = { academicYearId: 1, collegeId: 7, name: '2026-2027' }
const other = { academicYearId: 2, collegeId: 8, name: '2026-2027' }
const legacy = { academicYearId: 3, name: '2025-2026' }

function load(rows, selected = '7', changeCollege = false, calls = []) {
  let college = selected
  const context = vm.createContext({
    selectedCollegeId: () => college,
    request: async url => { calls.push(url); if (changeCollege) college = '8'; return rows },
    withQuery: (url, params) => `${url}?collegeId=${params.collegeId}`,
    API_ENDPOINTS: { academicYears: { list: '/academic-years' } },
    listResponse: value => value, normalizeAcademicYearRecord: value => value,
    createCollegeScope, collegeField,
  })
  return vm.runInContext(`(${loader})()`, context)
}
test('keeps selected college years even when unrelated legacy rows lack ownership', async () => {
  assert.deepEqual(Array.from(await load([own, other, legacy])), [own])
})
test('does not expose another college years or stale responses after switching', async () => {
  assert.equal((await load([other])).length, 0)
  assert.equal((await load([own], '7', true)).length, 0)
})
test('requests years for the selected college', async () => {
  const calls = []
  assert.deepEqual(Array.from(await load([own], '7', false, calls)), [own])
  assert.deepEqual(calls, ['/academic-years?collegeId=7'])
})
test('keeps fully unmapped results from the selected-college endpoint', async () => {
  assert.deepEqual(Array.from(await load([legacy])), [legacy])
})
