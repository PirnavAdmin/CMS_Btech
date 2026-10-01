import test from 'node:test'
import assert from 'node:assert/strict'
import { createCollegeScope, collegeStorageKey } from './collegeScope.js'
import { collegeRequest } from './collegeRequest.js'
import { normalizeCollegeImpact, countCollegeFaculty } from './collegeImpact.js'

test('college ownership follows the hierarchy without leaking unknown records', () => {
  const scope = createCollegeScope(1, { courses: [{ id: 3, collegeId: 1 }], branches: [{ id: 4, courseId: 3 }] })
  const rows = [{ branchId: 4 }, { collegeId: 2, branchId: 4 }, { id: 5 }, { academic: { collegeId: 1 } }]
  assert.deepEqual(scope(rows), [rows[0], rows[3]])
  assert.deepEqual(createCollegeScope(99)(rows), [])
})

test('storage and requests retain college identity', () => {
  assert.notEqual(collegeStorageKey('rooms', 1), collegeStorageKey('rooms', 2))
  const result = collegeRequest('/api/v1/rooms?search=Lab', { method: 'POST', body: JSON.stringify({ roomName: 'Lab' }) }, '2')
  assert.equal(result.url, '/api/v1/rooms?search=Lab&collegeId=2')
  assert.equal(JSON.parse(result.options.body).collegeId, '2')
  assert.equal(collegeRequest('/api/v1/colleges', {}, '2').url, '/api/v1/colleges')
})

test('faculty records resolve through employee identities', () => {
  const scope = createCollegeScope(1, { faculty: [{ id: 4, employeeProfileId: 5, collegeId: 1 }] })
  assert.deepEqual(scope([{ employeeProfileId: 5 }, { employeeProfileId: 6 }]), [{ employeeProfileId: 5 }])
})

test('college impact includes faculty and rejects invalid verification responses', async () => {
  assert.equal(normalizeCollegeImpact({ studentCount: 2 }, 3).totalCount, 5)
  assert.throws(() => normalizeCollegeImpact(null))
  assert.throws(() => normalizeCollegeImpact({ facultyCount: -1 }))
  assert.equal(await countCollegeFaculty(async () => [{ collegeId: 1 }, { collegeId: 2 }], 1), 1)
})
