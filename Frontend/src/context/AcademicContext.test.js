import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('./AcademicContext.jsx', import.meta.url), 'utf8')
const loader = source.match(/const loadHierarchy = useCallback\((async \(\) => \{[\s\S]*?)\n  \}, \[\]\)/)[1] + '\n}'

test('resolves college before scoped requests and retains details when academic years fail', async () => {
  let stored = '', colleges, departments, error, loading
  const college = { id: '7', name: 'College', status: 'Active' }
  const department = { id: '8', collegeId: '7' }
  const scoped = async (rows = []) => { assert.equal(stored, '7'); return rows }
  const context = vm.createContext({
    storedCollegeId: () => stored, hierarchyRequest: { current: 0 },
    academicService: {
      getColleges: async () => [college],
      getAcademicYears: async () => { assert.equal(stored, '7'); throw new Error('Unavailable') },
      getDepartments: () => scoped([department]), getCourses: () => scoped(),
      getBranches: () => scoped(), getSemesters: () => scoped(), getSections: () => scoped(),
    },
    getUserRole: () => 'admin', getUserCollegeId: () => '',
    filterActiveOnly: rows => rows, createCollegeScope: () => rows => rows,
    readStoredContext: () => ({ collegeId: stored, academicYearId: '' }),
    saveStoredContext: id => { stored = id },
    setColleges: rows => { colleges = rows }, setDepartments: rows => { departments = rows },
    setCourses() {}, setBranches() {}, setSemesters() {}, setSections() {},
    setAcademicYears() {}, setSelectedAcademicYearId() {}, setSelectedCollegeId() {},
    setError: value => { error = value }, setLoading: value => { loading = value }, console,
  })
  await vm.runInContext(`(${loader})()`, context)
  assert.equal(colleges[0], college)
  assert.equal(departments[0], department)
  assert.match(error, /Academic years/)
  assert.equal(loading, false)
})
