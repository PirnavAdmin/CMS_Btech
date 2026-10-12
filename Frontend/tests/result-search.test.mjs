import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/components/components.jsx', import.meta.url), 'utf8')
const start = source.indexOf('// #region pages/examinations/grade-result-management/gradeResultModel.js')
const end = source.indexOf('// #endregion pages/examinations/grade-result-management/gradeResultModel.js', start)
const { flattenResults, matchesResultSearch } = new Function(source.slice(start, end) + '\nreturn { flattenResults, matchesResultSearch };')()

test('result search preserves student identifiers and separate department and branch fields', () => {
  const [row] = flattenResults([{ departmentName: 'Engineering', branchName: 'Computer Science', branchCode: 'CSE', records: [{ studentId: 'STU-102', idNumber: 'ID-701', studentName: 'Sai Reddy', registrationNumber: 'REG-205', rollNumber: 'ROLL-301', totalMarks: 85, maximumMarks: 100 }] }])
  for (const query of ['sai', 'REDDY', 'REG-205', 'roll-301', 'stu-102', 'id-701', 'engineering', 'computer science', 'cse', ' Sai   CSE ', '']) {
    assert.equal(matchesResultSearch(row, query), true, query)
  }
  for (const query of ['ECE', 'Sai ECE', '85', 'missing']) assert.equal(matchesResultSearch(row, query), false, query)
  assert.equal(matchesResultSearch({}, '   '), true)
  assert.equal(matchesResultSearch({}, 'Sai'), false)
})
