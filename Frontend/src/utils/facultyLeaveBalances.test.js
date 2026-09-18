import test from 'node:test'
import assert from 'node:assert/strict'
import { employeeLeaveBalances, leaveBalanceRules } from './facultyLeaveBalances.js'

const employee = { id: '7', employeeId: 'EMP007' }
test('employee summary totals display without leave type records', () => {
  const result = employeeLeaveBalances([{ facultyId: 7, entitled: '12', used: 2, pending: 0, available: 10 }], employee)
  assert.deepEqual(result.totals, { entitled: 12, used: 2, pending: 0, available: 10 })
  assert.deepEqual(result.details, [])
})
test('all matching groups are searched and policy scope is respected', () => {
  const rows = [
    { facultyId: 7, policyId: 'old', balances: [{ leaveTypeId: 'cl', entitled: 99 }] },
    { facultyId: 7, policyId: 'current', leaveBalances: [{ leaveTypeId: 'cl', entitled: 12, used: 1, pending: 0 }] },
    { facultyId: 7, policyId: 'current', leaveBalances: [{ leaveTypeId: 'sl', entitled: 6, used: 0, pending: 0 }] },
    { facultyId: 8, balances: [{ leaveTypeId: 'cl', entitled: 90 }] },
  ]
  const result = employeeLeaveBalances(rows, employee, { id: 'current' })
  assert.deepEqual(result.totals, { entitled: 18, used: 1, pending: 0, available: 17 })
  assert.deepEqual(leaveBalanceRules(result, null, []).map(row => row.typeId), ['cl', 'sl'])
})
test('flat balances and employee codes are supported without inventing missing usage', () => {
  const result = employeeLeaveBalances([{ employeeId: 'EMP007', leaveTypeId: 'cl', entitlement: 0, available: 0 }], employee)
  assert.deepEqual(result.totals, { entitled: 0, used: null, pending: null, available: 0 })
  assert.equal(employeeLeaveBalances([], employee).totals.entitled, null)
  assert.equal(employeeLeaveBalances([{ facultyId: 8, employeeId: 'EMP007', entitled: 99 }], employee).totals.entitled, null)
})
test('server summary wins over a partial breakdown and nested identity matches', () => {
  const result = employeeLeaveBalances([{ employee: { id: 7 }, totals: { totalEntitled: 20, totalUsed: 4, totalPending: 1, totalAvailable: 15 }, balances: [{ typeId: 'cl', entitled: 10, used: 0, pending: 0 }] }], employee)
  assert.equal(result.totals.entitled, 20)
  assert.equal(result.details[0].entitled, 10)
  assert.equal(leaveBalanceRules(result, { entitlements: [{ typeId: 'sl', entitlement: 10 }] }, []).length, 2)
})
