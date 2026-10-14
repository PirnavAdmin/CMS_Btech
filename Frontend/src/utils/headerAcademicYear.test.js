import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAcademicYearProgress as progress, selectHeaderAcademicYear as select } from './headerAcademicYear.js'
test('selects only explicit active backend status', () => {
  const year = { academicYearId: 2, academicYearName: '2026-2027', status: 1 }
  assert.equal(select([{ status: 0 }, year]).year, year)
  assert.equal(select([{ status: 'ACTIVE' }]).state, 'ready')
  assert.equal(select([{ isActive: true }]).state, 'ready')
  assert.equal(select([{ startDate: '2020-01-01', endDate: '2090-01-01' }]).state, 'empty')
})
test('handles no active and multiple active years without choosing arbitrarily', () => {
  assert.equal(select([]).state, 'empty')
  assert.deepEqual(select([{ status: 1 }, { status: 1 }]), { state: 'conflict', year: null })
})
test('progress uses dates and clamps boundaries', () => {
  assert.equal(progress('2026-01-01', '2026-01-11', new Date(2026, 0, 6)), 50)
  assert.equal(progress('2026-01-01', '2026-01-11', new Date(2025, 11, 31)), 0)
  assert.equal(progress('2026-01-01', '2026-01-11', new Date(2026, 0, 12)), 100)
})
test('invalid, missing, reversed and zero duration dates have no progress', () => {
  for (const dates of [[null, null], ['2026-02-30', '2027-01-01'], ['2026-01-01', '2026-01-01'], ['2027-01-01', '2026-01-01']]) assert.equal(progress(...dates), null)
  assert.equal(progress('2026-01-01', '2027-01-01', new Date('invalid')), null)
})
