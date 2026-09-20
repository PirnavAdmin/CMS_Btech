import test from 'node:test'
import assert from 'node:assert/strict'
import { facultyCreatePayload, facultyUpdatePayload, facultyEmployeeCode, normalizePayroll } from './facultyContracts.js'

test('EMP display codes are stable, distinct and independent of FAC codes', () => {
  assert.equal(facultyEmployeeCode(9), 'EMP000009')
  assert.equal(facultyEmployeeCode('9'), 'EMP000009')
  const codes = Array.from({ length: 2000 }, (_, index) => facultyEmployeeCode(index + 1))
  assert.equal(new Set(codes).size, codes.length)
  assert.equal(facultyEmployeeCode(1000001), 'EMP1000001')
  for (const value of [null, '', 0, 'FAC001', '09', 'FAC-LOC-9']) assert.equal(facultyEmployeeCode(value), '')
})

test('payroll identifies the employee by faculty ID, never payroll ID', () => {
  assert.equal(normalizePayroll({ payrollId: 100, facultyId: 9, facultyCode: 'FAC001' }).employeeId, 'EMP000009')
  assert.equal(normalizePayroll({ payrollId: 101, facultyId: 9 }).employeeId, 'EMP000009')
  assert.equal(normalizePayroll({ payrollId: 100, id: 100 }).employeeId, '')
})

test('college names and codes do not prefix employee IDs', () => {
  assert.equal(facultyEmployeeCode(9, { collegeCode: 'btech' }), 'EMP000009')
  assert.equal(facultyEmployeeCode(9, { collegeName: 'Alpha College' }), 'EMP000009')
  assert.equal(facultyEmployeeCode(10, { collegeCode: 'btech' }), 'EMP000010')
  assert.equal(normalizePayroll({ facultyId: 9, collegeCode: 'btech' }).employeeId, 'EMP000009')
  assert.equal(facultyEmployeeCode(null, { collegeCode: 'btech' }), '')
})

test('create supplies the legacy API reference without accepting editable identifiers', () => {
  const member = { collegeId: 2, departmentId: 3, fullName: 'Test Faculty', email: 'faculty@example.test', mobile: '9999999999', facultyCode: 'FAC999', employeeId: 'EMP999999' }
  const create = facultyCreatePayload(member)
  assert.equal(create.collegeId, 2)
  assert.match(create.facultyCode, /^[0-9a-f]{32}$/)
  assert.notEqual(create.facultyCode, member.facultyCode)
  assert.notEqual(create.facultyCode, facultyCreatePayload(member).facultyCode)
  for (const payload of [create, facultyUpdatePayload(member)]) {
    assert.equal(Object.hasOwn(payload, 'employeeId'), false)
  }
  assert.equal(Object.hasOwn(facultyUpdatePayload(member), 'facultyCode'), false)
})
