import test from 'node:test'
import assert from 'node:assert/strict'
import { backlogRows, defaultBands, flattenResults, gradeFor, summarize, validateBands, weightedGpa } from './gradeResultModel.js'

test('grade boundaries include zero and 100 without overlap', () => {
  assert.equal(validateBands(defaultBands), '')
  assert.equal(gradeFor(0, defaultBands).grade, 'F')
  assert.equal(gradeFor(39.999, defaultBands).grade, 'F')
  assert.equal(gradeFor(40, defaultBands).grade, 'C')
  assert.equal(gradeFor(90, defaultBands).grade, 'O')
  assert.equal(gradeFor(100, defaultBands).grade, 'O')
})
test('grade policies reject gaps, overlapping and invalid grade points', () => {
  assert.match(validateBands(defaultBands.map((row, i) => i === 1 ? { ...row, min: 79 } : row)), /gaps or overlaps/)
  assert.match(validateBands(defaultBands.map((row, i) => i === 0 ? { ...row, points: 11 } : row)), /grade points/)
  assert.match(validateBands([{ grade: 'F', min: 1, max: 100, points: 0 }]), /entire range/)
})
test('sheet normalization preserves scope and distinguishes missing marks from zero', () => {
  const rows = flattenResults([{ collegeId: 1, academicYearId: 4, maxInternal: 40, maxExternal: 60, records: [{ studentId: 'a', internalMarks: 0, externalMarks: 0 }, { studentId: 'b', internalMarks: '', externalMarks: '' }] }])
  assert.equal(rows[0].percentage, 0)
  assert.equal(rows[1].percentage, null)
  assert.equal(rows[0].academicYearId, 4)
  assert.equal(rows[0].collegeId, 1)
})
test('weighted grade points require valid credits on every record', () => {
  assert.equal(weightedGpa([{ credits: 3, gradePoint: 8 }, { credits: 1, gradePoint: 4 }]), 7)
  assert.equal(weightedGpa([{ credits: null, gradePoint: 8 }]), null)
})
test('backlog clears only when the same assessment has a later passing attempt', () => {
  const base = { studentId: 'a', subjectCode: 'CS1', semester: 'I', examType: 'Final' }
  const fail = { ...base, status: 'Failed', grade: 'F', examDate: '2026-01-01' }
  const pass = { ...base, status: 'Passed', grade: 'A', examDate: '2026-06-01' }
  assert.equal(backlogRows([fail, pass]).length, 0)
  assert.equal(backlogRows([pass, fail]).length, 0)
  assert.equal(backlogRows([fail, { ...pass, examType: 'Internal' }]).length, 1)
  assert.equal(backlogRows([{ ...fail, subjectCode: '' }]).length, 0)
})
test('report pass rate excludes pending assessments', () => {
  const result = summarize([{ studentId: 'a', semester: 'I', status: 'Passed' }, { studentId: 'b', semester: 'I', status: 'Pending' }], 'semester')[0]
  assert.equal(result.passRate, '100.0%')
  assert.equal(result.pending, 1)
  assert.equal(result.students, 2)
})
import { resultAnalytics, resultIssues, sortResultRows } from './gradeResultModel.js'

test('analytics exclude invalid scores and pending records from assessment pass rate', () => {
  const records = [{ status: 'Passed', percentage: 80, grade: 'A' }, { status: 'Failed', percentage: 30, grade: 'F' }, { status: 'Pending', percentage: null, grade: '' }, { status: 'Pending', percentage: 200, grade: '' }]
  const stats = resultAnalytics(records)
  assert.equal(stats.average, 55)
  assert.equal(stats.highest, 80)
  assert.equal(stats.passRate, 50)
  assert.equal(stats.pending, 2)
  assert.equal(stats.distribution.find(item => item.grade === 'Ungraded').count, 2)
  assert.equal(resultAnalytics([]).average, null)
})
test('readiness distinguishes zero marks from missing marks and catches overmaximum scores', () => {
  const valid = { studentId: 's1', subjectCode: 'CS', totalMarks: 0, maximumMarks: 100, credits: 3 }
  assert.deepEqual(resultIssues(valid), [])
  assert.ok(resultIssues({ ...valid, totalMarks: null }).includes('Missing marks'))
  assert.ok(resultIssues({ ...valid, totalMarks: 101 }).includes('Marks outside range'))
  assert.ok(resultIssues({ ...valid, credits: null }).includes('Missing credits'))
})
test('score sort puts missing values last and does not mutate source records', () => {
  const rows = [{ id: 1, percentage: null }, { id: 2, percentage: 0 }, { id: 3, percentage: 90 }]
  assert.deepEqual(sortResultRows(rows, 'score-desc').map(row => row.id), [3, 2, 1])
  assert.deepEqual(sortResultRows(rows, 'score-asc').map(row => row.id), [2, 3, 1])
  assert.deepEqual(rows.map(row => row.id), [1, 2, 3])
})
test('weighted GPA rejects unavailable or out-of-range grade points', () => {
  assert.equal(weightedGpa([{ credits: 3, gradePoint: undefined }]), null)
  assert.equal(weightedGpa([{ credits: 3, gradePoint: 11 }]), null)
})
