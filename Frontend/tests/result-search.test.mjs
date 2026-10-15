import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flattenResults, matchesResultSearch } from '../src/utils/gradeResultModel.js'

test('result search preserves student identifiers and separate department and branch fields', () => {
  const [row] = flattenResults([{ departmentName: 'Engineering', branchName: 'Computer Science', branchCode: 'CSE', records: [{ studentId: 'STU-102', idNumber: 'ID-701', studentName: 'Sai Reddy', registrationNumber: 'REG-205', rollNumber: 'ROLL-301', totalMarks: 85, maximumMarks: 100 }] }])
  for (const query of ['sai', 'REDDY', 'REG-205', 'roll-301', 'stu-102', 'id-701', 'engineering', 'computer science', 'cse', ' Sai   CSE ', '']) {
    assert.equal(matchesResultSearch(row, query), true, query)
  }
  for (const query of ['ECE', 'Sai ECE', '85', 'missing']) assert.equal(matchesResultSearch(row, query), false, query)
  assert.equal(matchesResultSearch({}, '   '), true)
  assert.equal(matchesResultSearch({}, 'Sai'), false)
})
