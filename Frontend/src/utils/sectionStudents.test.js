import test from 'node:test'
import assert from 'node:assert/strict'
import { sectionStudentProfiles, matchesSectionStudent } from './sectionStudents.js'

const section = { id: 7, name: 'Section A', branchId: 2, branch: 'Computer Science', courseId: 1, semesterId: 3, academicYearId: 4 }
test('nested student profile academic data populates assignment candidates', () => {
  const rows = sectionStudentProfiles([{ studentId: 10, admissionId: 100, personalInformation: { firstName: 'Test', lastName: 'Student' }, academicInformation: { branchId: 2, sectionId: 7, rollNumber: 'R10' } }], [{ admissionId: 100, studentId: 10, status: 'APPROVED' }])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].name, 'Test Student')
  assert.equal(rows[0].enrollmentNo, 'R10')
  assert.equal(matchesSectionStudent(rows[0], section), true)
})
test('branch and existing section must match; missing optional academic IDs do not hide profiles', () => {
  assert.equal(matchesSectionStudent({ branchId: '2' }, section), true)
  assert.equal(matchesSectionStudent({ branchId: 99 }, section), false)
  assert.equal(matchesSectionStudent({ branchId: 2, sectionId: 8 }, section), false)
  assert.equal(matchesSectionStudent({ branchId: 2, sectionId: '7' }, section), true)
  assert.equal(matchesSectionStudent({ branchId: 2, semesterId: 9 }, section), false)
  assert.equal(matchesSectionStudent({}, section), false)
})
test('label-only profiles match branch and section but cannot override conflicting IDs', () => {
  assert.equal(matchesSectionStudent({ branch: ' computer science ', section: 'A' }, section), true)
  assert.equal(matchesSectionStudent({ branchId: 99, branch: 'Computer Science' }, section), false)
  assert.equal(matchesSectionStudent({ branchId: 2, section: 'B' }, section), false)
})
test('approval filtering and admission fallback use only real student IDs without duplicates', () => {
  const profiles = [{ studentId: 1, admissionId: 11 }, { studentId: 2, admissionId: 12 }]
  const admissions = [{ admissionId: 11, studentId: 1, status: 'APPROVED' }, { admissionId: 12, studentId: 2, status: 'REJECTED' }, { admissionId: 13, studentId: 3, status: 'APPROVED', branchId: 2 }, { admissionId: 14, status: 'APPROVED' }]
  assert.deepEqual(sectionStudentProfiles(profiles, admissions).map(row => row.id), ['1', '3'])
})
test('approved admission is eligible without a profile and remains authoritative for academic mapping', () => {
  const admissions = [{ admissionId: 21, studentId: 42, status: 'APPROVED', academicInformation: { academicYearId: 4, courseId: 1, branchId: 2, semesterId: 3, sectionId: '' }, personalInformation: { firstName: 'Ravi', lastName: 'Kumar' } }]
  const profiles = [{ studentId: 42, academicInformation: { academicYearId: 99, courseId: 99, branchId: 99, semesterId: 99 } }]
  const [student] = sectionStudentProfiles(profiles, admissions)
  assert.equal(student.id, '42')
  assert.equal(student.name, 'Ravi Kumar')
  assert.equal(matchesSectionStudent(student, section), true)
})
