import test from 'node:test'
import assert from 'node:assert/strict'
import { admissionSemesterOptions, admissionSemesterError, resetAdmissionAcademicDependents } from './admissionAcademicMapping.js'

test('semester choices require matching course, branch, year and college, and exclude archived rows', () => {
  const scope = { collegeId: 9, courseId: 1, branchId: 2, academicYearId: 3 }
  const rows = [
    { ...scope, semesterId: 4, semesterName: 'Semester 1' },
    ...['collegeId', 'courseId', 'branchId', 'academicYearId'].map((key, i) => ({ ...scope, [key]: 99, semesterId: 10 + i })),
    { ...scope, semesterId: 20, isArchived: true },
  ]
  const options = admissionSemesterOptions(rows, scope, '9')
  assert.deepEqual(options, [{ id: 4, name: 'Semester 1' }])
  assert.equal(admissionSemesterError({ semesterId: '4' }, options), '')
  assert.match(admissionSemesterError({ semesterId: 10 }, options), /does not match/)
})

test('changing a parent selection clears dependent IDs and requires a new semester when one was assigned', () => {
  const previous = { academic: { courseId: '1', branchId: '2', semesterId: '4', sectionId: '5' } }
  const next = { academic: { ...previous.academic, courseId: '9' } }
  const result = resetAdmissionAcademicDependents(next, previous, 'academic.courseId')
  assert.equal(result.academic.branchId, '')
  assert.equal(result.academic.semesterId, '')
  assert.equal(result.academic.sectionId, '')
  assert.match(admissionSemesterError(result.academic, []), /Select a semester/)
  assert.equal(previous.academic.semesterId, '4')
  assert.equal(next.academic.semesterId, '4')
  assert.equal(resetAdmissionAcademicDependents(previous, previous, 'academic.courseId'), previous)
})

test('new drafts can be saved before selecting an optional semester', () => {
  assert.equal(admissionSemesterError({ semesterId: '' }, []), '')
})
