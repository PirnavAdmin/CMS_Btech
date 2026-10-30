import test from 'node:test'
import assert from 'node:assert/strict'
import { sectionSemesterOptions, isSectionYearActive } from './sectionMappingOptions.js'

test('section dropdown includes semesters 1–8 across academic years with real saved IDs', () => {
  const saved = Array.from({ length: 8 }, (_, index) => ({ id: 101 + index, courseId: 10, branchId: 7, number: index + 1, academicYearId: Math.floor(index / 2) + 1, status: 0 }))
  const options = sectionSemesterOptions(saved, { courseId: '10', branchId: '7', academicYearId: '1' })
  assert.deepEqual(options.map(item => item.name), Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`))
  assert.deepEqual(options.map(item => item.id), saved.map(item => item.id))
  assert.ok(options.every(item => item.configured))
})

test('missing semesters remain visible without inventing database IDs or using another branch', () => {
  const options = sectionSemesterOptions([{ id: 50, courseId: 10, branchId: 8, number: 1 }], { courseId: 10, branchId: 7 })
  assert.equal(options.length, 8)
  assert.ok(options.every(item => item.id === '' && !item.configured))
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
