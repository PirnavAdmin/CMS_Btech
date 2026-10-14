import test from 'node:test'
import assert from 'node:assert/strict'
import { admissionDate, admissionsInScope, buildTrend, branchDistribution, departmentMetrics, statusGroup } from './dashboardData.js'

test('empty and undated admissions do not create analytics', () => {
  assert.equal(buildTrend([], 'Month').dated, 0)
  assert.equal(buildTrend([{ createdAt: 'invalid' }, {}], 'Day').undated, 2)
  assert.equal(buildTrend([], 'Week').buckets.reduce((sum, bucket) => sum + bucket.value, 0), 0)
  assert.equal(admissionDate({ createdAt: '0001-01-01', admissionDate: '2026-09-02' })?.getFullYear(), 2026)
})

test('day, week and month bucket actual dates at calendar boundaries', () => {
  const now = new Date(2026, 8, 25, 12)
  const rows = [
    { applicationDate: new Date(2026, 8, 25, 10).toISOString() },
    { createdAt: new Date(2026, 8, 21).toISOString() },
    { submittedAt: new Date(2026, 8, 20).toISOString() },
    { admissionDate: new Date(2026, 7, 30).toISOString() },
    { createdAt: new Date(2026, 8, 26).toISOString() },
  ]
  assert.equal(buildTrend(rows, 'Day', now).buckets.at(-1).value, 1)
  assert.equal(buildTrend(rows, 'Week', now).buckets.at(-1).value, 2)
  assert.equal(buildTrend(rows, 'Week', now).buckets.at(-2).value, 1)
  assert.equal(buildTrend(rows, 'Month', now).buckets.at(-1).value, 3)
  assert.equal(buildTrend(rows, 'Month', now).buckets.at(-2).value, 1)
})

test('scope rejects missing college and mismatching year IDs even if names match', () => {
  const rows = [
    { collegeId: 1, academicYearId: 2 },
    { admission: { collegeId: '1' }, academic: { academicYear: '2026-27' } },
    { collegeId: 1, academicYearId: 3, academicYearName: '2026-27' },
    { academicYearId: 2 },
  ]
  assert.equal(admissionsInScope(rows, '1', '2', '2026-27').length, 2)
})

test('pipeline keeps distinct statuses and unknown values under Other', () => {
  for (const [status, expected] of [['pending', 'Pending'], ['submitted', 'Submitted'], ['under review', 'Under Review'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['draft', 'Other'], ['ADMITTED', 'Approved / Admitted']]) {
    assert.equal(statusGroup({ status }).label, expected)
  }
})

test('enrollment uses approved records, preserves all branches and unassigned students', () => {
  const rows = Array.from({ length: 6 }, (_, index) => ({ status: 'APPROVED', branchId: index, branchName: `Branch ${index}` }))
  rows.push({ status: 'ADMITTED' }, { status: 'PENDING', branchId: 1 })
  const distribution = branchDistribution(rows, [])
  assert.equal(distribution.length, 7)
  assert.equal(distribution.reduce((sum, group) => sum + group.value, 0), 7)
  assert.equal(branchDistribution([], [{ id: 1, intakeCapacity: 120 }]).length, 0)
})

test('capacity and utilization require complete real data', () => {
  const dept = { id: 1 }, courses = [{ id: 2, departmentId: 1 }]
  const branches = [{ id: 3, courseId: 2, intakeCapacity: 4 }]
  const admissions = [{ status: 'APPROVED', branchId: 3 }]
  assert.deepEqual(departmentMetrics(dept, courses, branches, admissions), { courses: 1, branches: 1, capacity: 4, enrollment: 1, utilization: 25 })
  assert.equal(departmentMetrics(dept, courses, [{ id: 3, courseId: 2 }], admissions).utilization, null)
  assert.equal(departmentMetrics(dept, courses, branches, [{ status: 'APPROVED' }]).enrollment, null)
  assert.equal(departmentMetrics(dept, courses, [{ id: 3, courseId: 2, intakeCapacity: 0 }], admissions).utilization, null)
})
