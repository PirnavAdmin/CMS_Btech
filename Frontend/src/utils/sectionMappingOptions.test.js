import test from 'node:test'
import assert from 'node:assert/strict'
import { sectionSemesterOptions, isSectionYearActive } from './sectionMappingOptions.js'

test('section dropdown only includes saved semesters for the selected academic year', () => {
  const saved = Array.from({ length: 8 }, (_, index) => ({ id: 101 + index, courseId: 10, branchId: 7, number: index + 1, academicYearId: Math.floor(index / 2) + 1, status: 0 }))
  const options = sectionSemesterOptions(saved, { courseId: '10', branchId: '7', academicYearId: '1' })
  assert.deepEqual(options.map(item => item.name), ['Semester 1', 'Semester 2'])
  assert.deepEqual(options.map(item => item.id), [101, 102])
  assert.ok(options.every(item => item.configured))
})

test('missing semesters are not shown and another branch is never used', () => {
  const options = sectionSemesterOptions([{ id: 50, courseId: 10, branchId: 8, number: 1 }], { courseId: 10, branchId: 7 })
  assert.equal(options.length, 0)
})

test('duplicate semester numbers prefer the selected record, then the selected academic year', () => {
  const saved = [{ id: 50, courseId: 10, branchId: 7, number: 1, academicYearId: 1 }, { id: 60, courseId: 10, branchId: 7, number: 1, academicYearId: 2 }]
  assert.equal(sectionSemesterOptions(saved, { courseId: 10, branchId: 7, academicYearId: 2 })[0].id, 60)
  assert.equal(sectionSemesterOptions(saved, { courseId: 10, branchId: 7, academicYearId: 2, selectedId: 50 })[0].id, 50)
})

test('section creation requires a real active year rather than date or current-year inference', () => {
  assert.equal(isSectionYearActive({ id: 1, status: 'ACTIVE', backendStatus: 0, isCurrent: true }), false)
  assert.equal(isSectionYearActive({ id: 1, status: 'UPCOMING' }), false)
  assert.equal(isSectionYearActive({ id: 1, status: 1, isArchived: 1 }), false)
  assert.equal(isSectionYearActive({ status: 1 }), false)
  assert.equal(isSectionYearActive({ id: 1, status: 1 }), true)
  assert.equal(isSectionYearActive({ id: '1', status: 'ACTIVE' }), true)
})
