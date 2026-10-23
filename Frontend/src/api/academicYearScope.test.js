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

function load(rows, selected = '7', changeCollege = false) {
  let college = selected
  const context = vm.createContext({
    selectedCollegeId: () => college,
    request: async () => { if (changeCollege) college = '8'; return rows },
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
test('reports missing mapping rather than assigning legacy years to arbitrary colleges', async () => {
  await assert.rejects(load([legacy]), /college mapping/)
})
