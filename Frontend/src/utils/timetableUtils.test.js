import test from 'node:test'
import assert from 'node:assert/strict'
import { conflictsFor, conflictPairs, overlaps, validTime, eligibleFaculty, eligibleSubjects, entryPayload, normalizeEntry, publicationState } from './timetableUtils.js'

const base = { id: '1', facultyId: 2, sectionId: 3, classroom: 'Lab 1', dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '10:00:00', status: true }
test('overlap detects partial, contained and identical intervals but allows adjacent periods', () => {
  for (const [startTime, endTime] of [['08:30', '09:30'], ['09:30', '10:30'], ['09:15', '09:45'], ['08:00', '11:00'], ['09:00', '10:00']]) assert.equal(overlaps(base, { startTime, endTime }), true)
  assert.equal(overlaps(base, { startTime: '10:00', endTime: '11:00' }), false)
  assert.equal(overlaps(base, { startTime: '08:00', endTime: '09:00' }), false)
  for (const row of [{ startTime: '', endTime: '10:00' }, { startTime: '24:00', endTime: '25:00' }, { startTime: '10:00', endTime: '09:00' }]) assert.equal(validTime(row), false)
})
test('faculty, section and room conflicts are independent and edit excludes itself', () => {
  const candidate = { ...base, id: '2' }
  assert.deepEqual(conflictsFor(candidate, [base])[0].resources, ['Faculty', 'Section', 'Classroom'])
  assert.deepEqual(conflictsFor({ ...candidate, sectionId: 4, classroom: 'Lab 2' }, [base])[0].resources, ['Faculty'])
  assert.deepEqual(conflictsFor({ ...candidate, facultyId: 5, classroom: 'Lab 2' }, [base])[0].resources, ['Section'])
  assert.deepEqual(conflictsFor({ ...candidate, facultyId: 5, sectionId: 4, classroom: ' LAB  1 ' }, [base])[0].resources, ['Classroom'])
  assert.equal(conflictsFor(base, [base]).length, 0)
  assert.equal(conflictsFor({ ...candidate, dayOfWeek: 'TUESDAY' }, [base]).length, 0)
  assert.equal(conflictsFor(candidate, [{ ...base, status: false }]).length, 0)
  assert.equal(conflictPairs([base, candidate]).length, 1)
  assert.match(conflictsFor(candidate, [{ ...base, startTime: '' }])[0].message, /cannot be checked/)
})
test('real room IDs take priority when both records supply them', () => {
  assert.equal(conflictsFor({ ...base, id: '2', facultyId: 7, sectionId: 8, roomId: 9 }, [{ ...base, roomId: 10 }]).length, 0)
})
test('academic and subject allocation scopes never cross branches/semesters', () => {
  const scope = { academicYearId: 1, courseId: 2, branchId: 3, semesterId: 4, sectionId: 5 }
  const subjects = [{ ...scope, id: 10 }, { ...scope, id: 11, branchId: 9 }, { ...scope, id: 12, status: false }]
  assert.deepEqual(eligibleSubjects(subjects, scope).map(row => row.id), [10])
  const faculty = [{ id: 20 }, { id: 21, status: false }, { id: 22 }]
  const allocations = [{ ...scope, subjectId: 10, facultyId: 20 }, { ...scope, subjectId: 10, facultyId: 21 }, { ...scope, subjectId: 10, facultyId: 22, sectionId: 9 }]
  assert.deepEqual(eligibleFaculty(faculty, allocations, 10, scope).map(row => row.id), [20])
  assert.equal(eligibleFaculty(faculty, allocations, 11, scope).length, 0)
})
test('entry status never implies published; relationships resolve through section IDs', () => {
  assert.equal(publicationState({ status: true }), 'unavailable')
  assert.equal(publicationState({ publicationStatus: 'published' }), 'published')
  assert.equal(normalizeEntry({ timetableEntryId: 9, sectionId: 3, dayOfWeek: 'monday' }, [{ id: 3, academicYearId: 1 }]).academicYearId, 1)
})
test('backend payload contains only Swagger fields and refuses temporary IDs', () => {
  const payload = entryPayload({ ...base, timetableId: 1, timetableSlotId: 2, subjectId: 3, unexpected: 'hidden' }, true)
  assert.deepEqual(Object.keys(payload).sort(), ['timetableId', 'timetableSlotId', 'facultyId', 'subjectId', 'sectionId', 'dayOfWeek', 'classroom', 'entryType', 'status'].sort())
  assert.throws(() => entryPayload({ ...base, timetableId: 'local-uuid' }), /valid/)
})
