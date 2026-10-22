import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createCollegeScope } from './collegeScope.js'

const source = readFileSync(new URL('../pages/admin-management/AdminManagement.jsx', import.meta.url), 'utf8')
const loader = source.match(/  const loadYears = async \(\) => \{[\s\S]*?\n  \};/)[0]

test('academic year directory excludes old college records even when API ignores college query', async () => {
  const oldYear = { academicYearId: 1, collegeId: 1, academicYearName: '2026-2027' }
  for (const [collegeId, response, expected] of [
    ['2', [oldYear], []],
    ['2', [oldYear, { academicYearId: 2, collegeId: 2 }], [{ academicYearId: 2, collegeId: 2 }]],
    ['', [oldYear], []],
  ]) {
    let years, loading
    const context = vm.createContext({ selectedCollegeId: collegeId, readSelectedCollegeId: () => collegeId, createCollegeScope,
      academicYearApi: { getAll: async () => response }, newestFirst: (_key, rows) => rows, mapYear: row => row,
      setYears: rows => { years = rows }, setExportLoading: value => { loading = value },
      eventBus: { emit() {} }, ERP_EVENTS: { ACADEMIC_UPDATED: 'academic' }, setNotice: message => assert.fail(message),
    })
    vm.runInContext(loader + '\nthis.load = loadYears', context)
    await context.load()
    assert.deepEqual(Array.from(years), expected)
    assert.equal(loading, false)
  }
})
