import test from 'node:test'
import assert from 'node:assert/strict'
import { facultyDateErrors, joiningDateMinimum } from './facultyDates.js'

test('valid joining dates work independently of month/day display order', () => {
  assert.deepEqual(facultyDateErrors({ dob: '2002-10-11', joiningDate: '2026-07-30' }, '2026-11-04'), {})
})
test('correcting either date clears the dependent joining error', () => {
  assert.ok(facultyDateErrors({ dob: '2026-10-11', joiningDate: '2026-07-30' }, '2026-11-04').joiningDate)
  assert.deepEqual(facultyDateErrors({ dob: '2026-10-11', joiningDate: '2026-10-12' }, '2026-11-04'), {})
  assert.deepEqual(facultyDateErrors({ dob: '2002-10-11', joiningDate: '2026-07-30' }, '2026-11-04'), {})
})
test('invalid and future dates are not misreported as a birth-date comparison error', () => {
  assert.match(facultyDateErrors({ dob: '2026-02-30', joiningDate: '2026-01-01' }, '2026-11-04').dob, /valid date/)
  assert.match(facultyDateErrors({ dob: '2002-10-11', joiningDate: '2027-01-01' }, '2026-11-04').joiningDate, /future/)
})
test('date picker starts after DOB across month and year boundaries', () => {
  assert.equal(joiningDateMinimum('2000-02-28'), '2000-02-29')
  assert.equal(joiningDateMinimum('2002-12-31'), '2003-01-01')
  assert.equal(joiningDateMinimum(''), undefined)
})
