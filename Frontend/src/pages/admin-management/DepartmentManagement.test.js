import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createCollegeScope } from '../../utils/collegeScope.js'

// Exercise the page's actual mapper without mounting its API-connected layout.
const source = readFileSync(new URL('./DepartmentManagement.jsx', import.meta.url), 'utf8')
const mapper = source.slice(source.indexOf('const mapDepartment ='), source.indexOf('const payloadFor ='))
const mapDepartment = new Function('resolveHodName', 'readCachedDeptDates', 'cacheDeptDates', `${mapper}; return mapDepartment;`)(
  (record, faculty) => faculty.find(member => member.id === record.hodUserId)?.name || record.hodName || '',
  () => null,
  () => {},
)

test('departments remain in their college after asynchronous HOD enrichment', () => {
  const rows = [
    { departmentId: 1, departmentName: 'Accounts', collegeId: 84, collegeName: 'BTech College of Engineering', hodUserId: 7, status: 1 },
    { departmentId: 2, departmentName: 'Civil', collegeId: 84, collegeName: 'BTech College of Engineering', status: 0 },
    { departmentId: 3, departmentName: 'Other college', collegeId: 99, collegeName: 'Other College', status: 1 },
  ].map(row => mapDepartment(row))
  const enriched = rows.map(row => mapDepartment(row, [{ id: 7, name: 'Tharun' }]))
  const scope = createCollegeScope(84)
  assert.deepEqual(scope(enriched).map(row => row.id), scope(rows).map(row => row.id))
  assert.deepEqual(scope(enriched).map(row => row.id), [1, 2])
  assert.equal(enriched[0].collegeId, 84)
  assert.equal(enriched[0].collegeNumericId, 84)
  assert.equal(enriched[0].hodName, 'Tharun')
  assert.equal(enriched[1].status, 'Inactive')
  assert.deepEqual(createCollegeScope(99)(enriched).map(row => row.id), [3])
})

test('previously normalized rows retain the numeric college ID when remapped', () => {
  const row = mapDepartment({ id: 1, collegeId: 'BTech College of Engineering', collegeNumericId: 84, collegeName: 'BTech College of Engineering' })
  assert.equal(row.collegeId, 84)
  assert.equal(mapDepartment(row).collegeNumericId, 84)
})
