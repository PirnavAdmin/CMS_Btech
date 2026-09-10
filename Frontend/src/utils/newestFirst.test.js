import test from 'node:test'
import assert from 'node:assert/strict'
import { newestFirst, rememberCreated, recordId } from './newestFirst.js'

test('created records lead refreshed lists without changing source data or duplicating rows', () => {
  const rows = Object.freeze([Object.freeze({ id: 1 }), Object.freeze({ id: 2 }), Object.freeze({ id: 3 })])
  rememberCreated('test-list', { data: { id: 2 } })
  assert.deepEqual(newestFirst('test-list', rows).map(x => x.id), [2, 1, 3])
  rememberCreated('test-list', 3)
  assert.deepEqual(newestFirst('test-list', rows).map(x => x.id), [3, 2, 1])
  assert.deepEqual(rows.map(x => x.id), [1, 2, 3])
  assert.deepEqual(newestFirst('unrelated-list', rows), rows)
})

test('server creation dates sort descending and missing dates preserve relative order', () => {
  const rows = [{ id: 1 }, { id: 2, createdAt: '2025-01-01' }, { id: 3, createdAt: '2026-01-01' }, { id: 4 }]
  assert.deepEqual(newestFirst('dated-list', rows).map(x => x.id), [3, 2, 1, 4])
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
