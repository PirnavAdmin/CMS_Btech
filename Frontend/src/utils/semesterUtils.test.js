import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateOnly, deriveLifecycleStatus, cohortStart, sameCohort, validateSchedule } from './semesterUtils.js'
import { sameCourseCohort, branchAssignments, branchTypeLabel, isActiveBranch } from './semesterUtils.js'

test('course cohort duplicate scope crosses branch boundaries but allows next batch', () => {
  const row = { courseId: 1, branchId: 10, academicYearName: '2026-2027', semesterNumber: 1 }
  assert.equal(sameCourseCohort(row, { ...row, branchId: 20 }), true)
  assert.equal(sameCourseCohort(row, { ...row, academicYearName: '2027-2028' }), false)
  assert.equal(sameCourseCohort(row, { ...row, courseId: 2 }), false)
})

test('core and specialization inherit identical course schedules and counts', () => {
  for (const count of [6, 8]) {
    const plan = Array.from({ length: count }, (_, index) => ({ courseId: 1, semesterNumber: index + 1, academicYearName: `${2026 + Math.floor(index / 2)}-${2027 + Math.floor(index / 2)}`, startDate: '', endDate: '' }))
    const branches = [{ id: 10, branchType: 'Core', status: 1 }, { id: 20, branchType: 'Specialization', status: 'Active' }, { id: 30, status: 0 }]
    const assignments = branchAssignments(plan, branches.filter(isActiveBranch))
    assert.equal(assignments.length, count * 2)
    for (const branch of branches.slice(0, 2)) {
      const inherited = assignments.filter((row) => row.branchId === branch.id)
      assert.equal(inherited.length, count)
      assert.deepEqual(inherited.map((row) => row.semesterNumber), plan.map((row) => row.semesterNumber))
      assert.ok(inherited.every((row) => deriveLifecycleStatus(row) === 'Upcoming'))
    }
    assert.equal(branchAssignments(plan, branches.filter(isActiveBranch), assignments.slice(0, 3)).length, count * 2 - 3)
    assert.equal(branchAssignments(plan, branches.filter(isActiveBranch), assignments).length, 0)
  }
})

test('branch classification uses API data without inventing Core for missing types', () => {
  assert.equal(branchTypeLabel({ branchType: 'core' }), 'Core')
  assert.equal(branchTypeLabel({ branchType: 'Specialization' }), 'Specialization')
  assert.equal(branchTypeLabel({}), '')
  assert.equal(isActiveBranch({}), false)
  assert.equal(isActiveBranch({ status: 'Inactive' }), false)
})

const schedule = [
  { startDate: '2026-07-01', endDate: '2026-12-31' },
  { startDate: '2027-01-01', endDate: '2027-05-31' },
  { startDate: '2027-07-01', endDate: '2027-12-31' },
]
test('lifecycle progresses through the requested September and February scenarios', () => {
  for (const [today, expected] of [['2026-09-08', ['Active', 'Upcoming', 'Upcoming']], ['2027-02-01', ['Completed', 'Active', 'Upcoming']]]) {
    assert.deepEqual(schedule.map((row) => deriveLifecycleStatus(row, 'Upcoming', new Date(`${today}T12:00:00`))), expected)
  }
})
test('date boundaries include the entire start and end day', () => {
  assert.equal(deriveLifecycleStatus(schedule[0], '', new Date('2026-07-01T00:00:00')), 'Active')
  assert.equal(deriveLifecycleStatus(schedule[0], '', new Date('2026-12-31T23:59:59')), 'Active')
  assert.equal(deriveLifecycleStatus(schedule[0], '', new Date('2027-01-01T00:00:00')), 'Completed')
})
test('backend flags and missing or invalid dates never make all semesters active', () => {
  for (const status of [0, 1, true, false, 'Active', undefined]) assert.equal(deriveLifecycleStatus({ status }), 'Upcoming')
  assert.equal(dateOnly('2026-02-30'), '')
  assert.equal(deriveLifecycleStatus({ startDate: '2026-12-31', endDate: '2026-01-01' }), 'Upcoming')
})
test('duplicates use cohort, allowing new batches with overlapping academic years', () => {
  const first = { courseId: 1, branchId: 2, academicYearName: '2026-2027', semesterNumber: 1 }
  const third = { ...first, academicYearName: '2027-2028', semesterNumber: 3 }
  const nextBatch = { ...third, semesterNumber: 1 }
  assert.equal(cohortStart(third), 2026)
  assert.equal(sameCohort(first, third), true)
  assert.equal(sameCohort(first, { ...first, courseId: '1' }), true)
  assert.equal(sameCohort(first, nextBatch), false)
  assert.equal(sameCohort(first, { ...first, branchId: 3 }), false)
  assert.equal(sameCohort(first, { ...first, academicYearName: '' }), false)
})
test('schedule validation blocks invalid, partial, reversed and overlapping dates', () => {
  assert.equal(validateSchedule(schedule.map((row, i) => ({ ...row, semesterNumber: i + 1 }))), '')
  assert.equal(validateSchedule([{ semesterNumber: 1 }]), '')
  for (const row of [{ startDate: '2026-02-30' }, { startDate: '2026-07-01' }, { startDate: '2026-12-31', endDate: '2026-01-01' }]) assert.ok(validateSchedule([row]))
  assert.ok(validateSchedule([{ ...schedule[0], semesterNumber: 1 }, { ...schedule[0], semesterNumber: 2 }]))
})
