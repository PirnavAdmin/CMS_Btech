import test from 'node:test'
import assert from 'node:assert/strict'
import { scopeTimetableData } from './timetableCollegeScope.js'

const sources = {
  years: [{ id: 1, collegeId: 1 }, { id: 2, collegeId: 2 }],
  departments: [{ id: 10, collegeId: 1 }, { id: 20, collegeId: 2 }],
  courses: [{ id: 11, departmentId: 10 }, { id: 21, departmentId: 20 }],
  branches: [{ id: 12, courseId: 11 }, { id: 22, courseId: 21 }],
  semesters: [{ id: 13, branchId: 12 }, { id: 23, branchId: 22 }],
  sections: [{ id: 14, semesterId: 13 }, { id: 24, semesterId: 23 }],
  subjects: [{ id: 15, semesterId: 13 }, { id: 25, semesterId: 23 }],
  faculty: [{ id: 16, departmentId: 10 }, { id: 26, departmentId: 20 }],
  allocations: [{ id: 17, sectionId: 14 }, { id: 27, sectionId: 24 }],
  classrooms: [{ id: 18, collegeId: 1 }, { id: 28, collegeId: 2 }],
  yearSettings: { 1: { periods: [] }, 2: { periods: [] } },
}
const tables = [{ id: 100, sectionId: 14, entries: [] }, { id: 200, sectionId: 24, entries: [] }, { id: 300, entries: [] }]

test('new college has no previous college hierarchy or timetables', () => {
  const result = scopeTimetableData(sources, tables, 3)
  for (const [field, rows] of Object.entries(result.sources)) {
    assert.deepEqual(rows, field === 'yearSettings' ? {} : [], field)
  }
  assert.deepEqual(result.tables, [])
})

test('switching colleges shows only their own added records and schedules', () => {
  for (const collegeId of [1, 2]) {
    const result = scopeTimetableData(sources, tables, collegeId)
    for (const field of ['departments', 'courses', 'branches', 'semesters', 'sections', 'subjects', 'faculty', 'allocations', 'classrooms', 'years']) {
      assert.deepEqual(result.sources[field], [sources[field][collegeId - 1]], field)
    }
    assert.deepEqual(result.tables, [tables[collegeId - 1]])
    assert.deepEqual(Object.keys(result.sources.yearSettings), [String(collegeId)])
  }
  assert.equal(tables.length, 3)
})

test('missing college selection exposes no records', () => {
  const result = scopeTimetableData(sources, tables, '')
  assert.deepEqual(result.sources.departments, [])
  assert.deepEqual(result.tables, [])
})
