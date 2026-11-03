import test from 'node:test'
import assert from 'node:assert/strict'
import { scopeSemesterDirectory, sameSemesterRecord } from './semesterDirectory.js'

const courses = [{ id: 10, collegeId: 1 }, { id: 20, collegeId: 2 }]
const rows = [{ id: 101, courseId: 10 }, { id: 102, courseId: 20 }]

test('administrator semester directory shows fetched rows without a selected college', () => {
  assert.deepEqual(scopeSemesterDirectory(rows, { isAdmin: true, courses }), rows)
})

test('selecting a college limits the semester directory through fresh course ownership', () => {
  assert.deepEqual(scopeSemesterDirectory(rows, { collegeId: '1', isAdmin: true, courses }), [rows[0]])
})

test('assigned college remains the fallback and unknown non-admin scope stays empty', () => {
  assert.deepEqual(scopeSemesterDirectory(rows, { assignedCollegeId: '2', isAdmin: false, courses }), [rows[1]])
  assert.deepEqual(scopeSemesterDirectory(rows, { isAdmin: false, courses }), [])
})

test('saved semesters match the backend key even when cohort display years differ', () => {
  const planned = { branchId: '7', academicYearId: '3', semesterNumber: 3, academicYearName: '2027-2028' }
  const saved = { id: 42, branchId: 7, academicYearId: 3, semesterNumber: 3, academicYearName: '2026-2027' }
  assert.equal(sameSemesterRecord(saved, planned), true)
  assert.equal(sameSemesterRecord({ ...saved, academicYearName: '' }, planned), true)
  for (const change of [{ branchId: 8 }, { academicYearId: 4 }, { semesterNumber: 4 }]) {
    assert.equal(sameSemesterRecord({ ...saved, ...change }, planned), false)
  }
  assert.equal(sameSemesterRecord({}, {}), false)
})
