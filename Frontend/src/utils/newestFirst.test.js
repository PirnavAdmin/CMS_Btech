import test from 'node:test'
import assert from 'node:assert/strict'
import { newestFirst, rememberCreated, recordId } from './newestFirst.js'

test('created records lead refreshed lists without changing source data or duplicating rows', () => {
  const rows = Object.freeze([Object.freeze({ id: 1 }), Object.freeze({ id: 2 }), Object.freeze({ id: 3 })])
  rememberCreated('test-list', { data: { id: 2 } })
  assert.deepEqual(newestFirst('test-list', rows).map(x => x.id), [2, 3, 1])
  rememberCreated('test-list', 3)
  assert.deepEqual(newestFirst('test-list', rows).map(x => x.id), [3, 2, 1])
  assert.deepEqual(rows.map(x => x.id), [1, 2, 3])
  assert.deepEqual(newestFirst('unrelated-list', rows).map(x => x.id), [3, 2, 1])
})

test('server creation dates sort descending and missing dates use descending numeric IDs', () => {
  const rows = [{ id: 1 }, { id: 2, createdAt: '2025-01-01' }, { id: 3, createdAt: '2026-01-01' }, { id: 4 }]
  assert.deepEqual(newestFirst('dated-list', rows).map(x => x.id), [3, 2, 4, 1])
  assert.equal('createdAt' in rows[0], false)
})

test('entity IDs take precedence over parent IDs and response envelopes are supported', () => {
  for (const [module, key] of Object.entries({ colleges: 'collegeId', courses: 'courseId', departments: 'departmentId', branches: 'branchId', semesters: 'semesterId', sections: 'sectionId', admissions: 'admissionId' })) {
    const record = { collegeId: 90, departmentId: 91, courseId: 92, [key]: 7 }
    assert.equal(recordId({ data: { data: record } }, module), '7')
    rememberCreated(module, { data: record })
    assert.equal(newestFirst(module, [{ id: 1 }, { id: 7 }])[0].id, 7)
  }
  assert.equal(recordId({ collegeId: 90 }, 'courses'), '')
  assert.equal(recordId({ success: true }, 'courses'), '')
})

test('creation dates override names, update dates, and numeric IDs', () => {
  const rows = [{ id: 90, name: 'Alpha', createdAt: '2025-01-01', updatedAt: '2027-01-01' }, { id: 2, name: 'Zebra', created_at: '2026-01-01' }]
  assert.deepEqual(newestFirst('dates', rows).map(x => x.id), [2, 90])
})
test('numeric IDs retain precision and UUIDs retain source order without dates', () => {
  assert.deepEqual(newestFirst('large', [{ id: '9007199254740992' }, { id: '9007199254740993' }]).map(x => x.id), ['9007199254740993', '9007199254740992'])
  const rows = [{ id: 'z-uuid' }, { id: 'a-uuid' }]
  assert.deepEqual(newestFirst('uuid', rows), rows)
})
test('newest rows appear before pagination and invalid dates fall through to valid aliases', () => {
  const rows = [{ id: 1 }, { id: 9 }, { id: 4, createdAt: '', createdOn: '2026-02-01' }]
  assert.deepEqual(newestFirst('pagination', rows).slice(0, 2).map(x => x.id), [4, 9])
})
