import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLeaveType, normalizeLeavePolicy, normalizeLeaveRequest, leavePolicyPayload } from './facultyContracts.js'

test('live summary-only policy response does not invent entitlement records', () => {
  const policy = normalizeLeavePolicy({ id: 'POL-2026', name: 'Faculty Leave Policy 2026-27', academicYear: '2026-27', applicableTo: 'Both', from: '2026-06-01T00:00:00', to: '2027-05-31T00:00:00', status: 'Active', leaveTypes: 0 })
  assert.equal(policy.id, 'POL-2026')
  assert.equal(policy.from, '2026-06-01')
  assert.equal(policy.to, '2027-05-31')
  assert.deepEqual(policy.entitlements, [])
})

test('policy relationship collections and embedded type labels survive normalization', () => {
  for (const key of ['entitlements', 'policyEntitlements', 'leaveTypes']) {
    const row = normalizeLeavePolicy({ [key]: [{ leaveTypeId: 'CL', leaveTypeName: 'Casual Leave', leaveTypeCode: 'CL', entitlement: 0.5 }] })
    assert.equal(row.entitlements.length, 1)
    assert.equal(row.entitlements[0].typeId, 'CL')
    assert.equal(row.entitlements[0].name, 'Casual Leave')
    assert.equal(row.entitlements[0].entitlement, 0.5)
  }
  assert.deepEqual(normalizeLeavePolicy({ entitlements: null }).entitlements, [])
})

test('policy saves preserve zero and fractional day limits accepted by the API', () => {
  const row = leavePolicyPayload({ name: 'Annual', entitlements: [{ typeId: 'CL', entitlement: 0, maxDays: 0.5, maxCarryForward: 0 }] })
  assert.equal(row.entitlements[0].entitlement, 0)
  assert.equal(row.entitlements[0].maxDays, 0.5)
  assert.equal(row.entitlements[0].maxCarryForward, 0)
})
test('leave types retain inactive records and normalize API labels', () => {
  const row = normalizeLeaveType({ leaveTypeId: 2, leaveTypeName: 'Casual Leave', leaveTypeCode: 'CL', isActive: false, isPaid: true })
  assert.equal(row.status, 'Inactive')
  assert.equal(row.code, 'CL')
  assert.equal(row.payCategory, 'Paid Leave')
})
test('policy aliases and status support applicable policy lookup', () => {
  const row = normalizeLeavePolicy({ policyId: 3, policyName: 'Annual', academicYearName: '2026-27', status: 'ACTIVE', fromDate: '2026-01-01T00:00:00', toDate: '2026-12-31T00:00:00', entitlements: [{ leaveTypeId: 2, entitlement: 0 }] })
  assert.equal(row.name, 'Annual')
  assert.equal(row.status, 'Active')
  assert.equal(row.from, '2026-01-01')
  assert.equal(row.entitlements[0].entitlement, 0)
})
test('request status, IDs and dates survive request/history formats', () => {
  const row = normalizeLeaveRequest({ id: 90, leaveRequestId: 8, requestStatus: 'approved', faculty: { facultyId: 3 }, totalDays: 0.5, appliedDate: '2026-09-18' })
  assert.equal(row.id, '8')
  assert.equal(row.facultyId, '3')
  assert.equal(row.status, 'Approved')
  assert.equal(row.days, 0.5)
  assert.equal(row.applied, '2026-09-18')
  assert.equal(normalizeLeaveRequest({}).days, null)
})
