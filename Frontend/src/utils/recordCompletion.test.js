import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateCompletion, completionSchemas, programCompletion, departmentDirectoryCompletion } from './recordCompletion.js'

test('program completion requires saved branch definitions and is independent of status', () => {
  const course = { courseName: 'B.Tech', courseCode: 'BTECH', collegeId: 7, courseType: 'Undergraduate', durationYears: 4, totalSemesters: 8, mapped: true }
  const plan = Array.from({ length: 8 }, (_, index) => ({ semesterNumber: index + 1, semesterName: 'Semester ' + (index + 1) }))
  const noBranches = programCompletion(course, [], plan)
  assert.equal(noBranches.percent, 78)
  assert.equal(programCompletion({ ...course, status: 1 }, [], plan).percent, noBranches.percent)
  assert.deepEqual(noBranches.sections.filter(section => !section.complete).map(section => section.id), ['branch', 'semester'])
  assert.equal(programCompletion(course, [], plan.slice(0, 4)).percent, noBranches.percent)
  const branch = { name: 'CSE', configured: true, terms: new Set([1, 2, 3]) }
  assert.equal(programCompletion(course, [branch], plan).percent, 93)
  assert.equal(programCompletion(course, [branch, { ...branch, name: 'ECE' }], plan).percent, 93)
  assert.equal(programCompletion(course, [{ ...branch, terms: new Set() }], plan).percent, 89)
  branch.terms = new Set(plan.map(term => term.semesterNumber))
  assert.equal(programCompletion({ ...course, hasBranches: true, status: 0 }, [branch], plan).percent, 100)
  assert.ok(programCompletion({ ...course, hasBranches: true }, [branch, { ...branch, name: 'ECE', terms: new Set() }], plan).percent < 100)
})

test('department completion does not require an HOD', () => {
  const department = { departmentName: 'Computer Science', departmentCode: 'CSE', collegeId: 7, description: 'Computing department' }
  assert.equal(departmentDirectoryCompletion(department).percent, 100)
  assert.equal(departmentDirectoryCompletion({ ...department, hodUserId: 22 }).percent, 100)
})

test('lifecycle and workflow status do not affect completion', () => {
  const saved = { collegeName: 'Engineering College', collegeCode: 'EC' }
  const results = ['Draft', 'Active', 'Inactive', 'Submitted', 'Approved'].map(status =>
    calculateCompletion(completionSchemas.college, { ...saved, status }).percent)
  assert.equal(new Set(results).size, 1)
  assert.ok(results[0] > 0 && results[0] < 100)
})

test('completion increases after a valid saved edit and decreases after clearing it', () => {
  const saved = { name: 'Engineering College', code: 'EC' }
  const percent = website => calculateCompletion(completionSchemas.college, { ...saved, website }).percent
  assert.equal(percent('invalid'), percent(''))
  assert.ok(percent('https://engineering.example.edu') > percent(''))
})

test('inapplicable specialization does not penalize a core branch', () => {
  const saved = { branchName: 'Civil', branchCode: 'CE', courseId: 1, branchType: 'Core', shortName: 'Civil', description: 'Civil engineering', intakeCapacity: 60, startingAcademicYearId: 2 }
  assert.equal(calculateCompletion(completionSchemas.branch, saved).percent, 100)
  const specialization = calculateCompletion(completionSchemas.branch, { ...saved, branchType: 'Specialization' })
  assert.ok(specialization.percent < 100)
  assert.equal(specialization.sections[0].missing[0].label, 'Specialization')
})

test('weighted fields reject placeholders, empty collections, and invalid dates', () => {
  const schema = [{ id: 'a', label: 'A', fields: [
    { key: 'identity', weight: 3 },
    { key: 'description' },
    { key: 'documents' },
  ] }]
  assert.equal(calculateCompletion(schema, { identity: 'College', description: 'Not provided', documents: [] }).percent, 60)
  const admission = calculateCompletion(completionSchemas.admission, { dateOfBirth: '2026-02-30' })
  assert.equal(admission.percent, 0)
})
