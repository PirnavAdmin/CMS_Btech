import test from 'node:test'
import assert from 'node:assert/strict'
import { facultyForCollege } from './departmentFaculty.js'

test('assignment candidates exclude other colleges and ambiguous department names', () => {
  const departments = [
    { id: 10, collegeId: 1, name: 'CSE' },
    { id: 20, collegeId: 2, name: 'CSE' },
  ]
  const faculty = [
    { id: 1, collegeId: 1, department: 'CSE' },
    { id: 2, collegeId: 2, department: 'CSE' },
    { id: 3, departmentId: 10 },
    { id: 4, departmentId: 20 },
    { id: 5, department: 'CSE' },
    { id: 6, collegeId: 2, departmentId: 10 },
    { id: 7, CollegeId: 1 },
  ]
  assert.deepEqual(facultyForCollege(faculty, 1, departments).map(row => row.id), [1, 3, 7])
  assert.deepEqual(facultyForCollege(faculty, 2, departments).map(row => row.id), [2, 4, 6])
  assert.deepEqual(facultyForCollege(faculty, '', departments), [])
})
