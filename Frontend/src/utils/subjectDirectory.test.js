import test from 'node:test'
import assert from 'node:assert/strict'
import { academicFilterOptions, changeAcademicFilter, departmentOfBranch, enrichSubject, eligibleForGroup, hasAcademicFilter, matchesSubject, subjectQuery } from './subjectDirectory.js'
import { mapApiSubject, readSubjectPages, subjectApiPayload } from './subjectApiData.js'

const masters = {
  departments: [{ departmentId: 10, departmentName: 'CSE' }, { departmentId: 20, departmentName: 'ECE' }],
  courses: [{ courseId: 1, courseName: 'B.Tech', departmentId: 10 }],
  branches: [{ branchId: 2, courseId: 1, departmentId: 10, branchName: 'CSE' }, { branchId: 3, courseId: 1, departmentId: 20, branchName: 'CSE' }],
  semesters: [{ semesterId: 5, courseId: 1, branchId: 2, semesterNumber: 5 }, { semesterId: 6, courseId: 1, branchId: 2, semesterNumber: 6 }],
  years: [{ academicYearId: 7, academicYearName: '2026-27' }],
}
const filters = { department: '10', course: '1', branch: '2', semester: '5', academicYear: '7', level: '3rd Year', electiveType: 'Elective' }
const form = { courseId: '1', branchId: '2', semesterId: '5', academicYearId: '7', subjectCode: ' CS501 ', subjectName: 'Artificial Intelligence', electiveType: 'Elective', credits: '3', status: 'Active' }
const rows = [
  { subjectId: 101, ...subjectApiPayload(form) },
  { subjectId: 102, ...subjectApiPayload({ ...form, subjectCode: 'CS502', subjectName: 'Machine Learning' }) },
  { subjectId: 103, ...subjectApiPayload({ ...form, subjectCode: 'CS503', subjectName: 'Operating Systems', electiveType: 'Non-Elective' }) },
]
const directory = records => records.map(mapApiSubject).map(subject => enrichSubject(subject, masters))
const matchingIds = (records, query) => directory(records).filter(subject => matchesSubject(subject, query)).map(subject => subject.id)

test('server queries use only verified subject parameters; department remains an ID-based local filter', () => {
  assert.deepEqual(subjectQuery(filters), { CourseId: '1', BranchId: '2', SemesterId: '5', AcademicYearId: '7', Level: '3rd Year', ElectiveType: 'Elective' })
  assert.deepEqual(subjectQuery({ department: '10', electiveType: 'All', status: 'All' }), {})
})

test('create payload preserves the existing classification and academic year with numeric IDs', () => {
  const payload = subjectApiPayload(form)
  assert.equal(payload.electiveType, 'Elective')
  assert.equal(payload.academicYearId, 7)
  assert.equal(payload.courseId, 1)
  assert.equal(payload.subjectCode, 'CS501')
  assert.equal('departmentId' in payload, false) // derived from the saved academic mapping
})

test('saved list shows AI/ML under Elective and only OS under Non-Elective', async () => {
  const saved = await readSubjectPages(async () => ({ success: true, data: { items: rows } }))
  assert.deepEqual(matchingIds(saved, filters), [101, 102])
  assert.deepEqual(matchingIds(saved, { ...filters, electiveType: 'Non-Elective' }), [103])
})

test('edit then refetch moves the same ID between classifications and semesters without duplicates', async () => {
  const stored = rows.map(row => ({ ...row }))
  stored[0] = { subjectId: 101, ...subjectApiPayload({ ...form, electiveType: 'Non-Elective' }) }
  let refreshed = await readSubjectPages(async () => ({ data: stored }))
  assert.deepEqual(matchingIds(refreshed, filters), [102])
  assert.deepEqual(matchingIds(refreshed, { ...filters, electiveType: 'Non-Elective' }), [101, 103])
  stored[2] = { ...stored[2], semesterId: 6 }
  refreshed = await readSubjectPages(async () => ({ data: stored }))
  assert.deepEqual(matchingIds(refreshed, { ...filters, electiveType: 'Non-Elective' }), [101])
  assert.deepEqual(matchingIds(refreshed, { ...filters, semester: '6', electiveType: 'Non-Elective' }), [103])
  assert.equal(new Set(refreshed.map(row => row.subjectId)).size, 3)
})

test('every academic filter is enforced by ID, including same-name branches and missing mappings', () => {
  for (const key of ['department', 'course', 'branch', 'semester', 'academicYear', 'level']) {
    assert.deepEqual(matchingIds(rows, { ...filters, [key]: '999' }), [], key)
  }
  assert.deepEqual(matchingIds([{ ...rows[0], branchId: 3 }], filters), [])
  assert.deepEqual(matchingIds([{ ...rows[0], academicYearId: null }], filters), [])
})

test('nested IDs and numeric/string IDs resolve to the same academic context', () => {
  const subject = { subjectId: 101, electiveType: 'ELECTIVE', course: { id: '1' }, branch: { id: 2 }, semester: { id: '5' }, academicYear: { id: 7 } }
  assert.deepEqual(matchingIds([subject], filters), [101])
  assert.equal(departmentOfBranch({ courseId: 1 }, masters.courses), '10')
})

test('dependent parent changes clear incompatible descendants, while classification preserves context', () => {
  const changed = changeAcademicFilter(filters, 'department', '20')
  assert.equal(changed.branch, 'All')
  assert.equal(changed.course, 'All')
  assert.equal(changed.semester, 'All')
  assert.equal(changed.level, 'All')
  assert.equal(changeAcademicFilter(filters, 'electiveType', 'Non-Elective').branch, '2')
  assert.equal(hasAcademicFilter({ electiveType: 'Elective', department: 'All' }), false)
  assert.equal(hasAcademicFilter(filters), true)
})

test('academic master options are dependent and do not collapse when classification returns no subjects', () => {
  assert.deepEqual(academicFilterOptions('branch', filters, masters).map(row => row.id), ['2'])
  assert.deepEqual(academicFilterOptions('branch', { ...filters, department: '20' }, masters).map(row => row.id), ['3'])
  assert.deepEqual(academicFilterOptions('semester', filters, masters).map(row => row.id), ['5', '6'])
  const duplicateSemesterMasters = { ...masters, semesters: [{ ...masters.semesters[0], semesterName: 'Semester 5' }, { ...masters.semesters[1], semesterName: 'Semester 6' }, { semesterId: 15, courseId: 1, branchId: 2, semesterName: 'Semester 5', semesterNumber: 5 }] }
  assert.deepEqual(academicFilterOptions('semester', filters, duplicateSemesterMasters), [{ id: '5', name: 'Semester 5' }, { id: '6', name: 'Semester 6' }])
  assert.deepEqual(academicFilterOptions('semester', { ...filters, branch: '3' }, masters), [])
  assert.deepEqual(academicFilterOptions('branch', filters, masters), academicFilterOptions('branch', { ...filters, electiveType: 'Non-Elective' }, masters))
})

test('elective-only workflows reject non-elective, unclassified, inactive and mismatched subjects', () => {
  const group = { courseId: 1, branchId: 2, semesterId: 5, academicYearId: 7 }
  const [ai, , os] = directory(rows)
  assert.equal(eligibleForGroup(ai, group), true)
  assert.equal(eligibleForGroup(os, group), false)
  assert.equal(eligibleForGroup({ ...ai, electiveType: null }, group), false)
  assert.equal(eligibleForGroup({ ...ai, status: 'Inactive' }, group), false)
  assert.equal(eligibleForGroup(ai, { ...group, semesterId: 6 }), false)
})

test('API failures remain failures, empty responses remain empty, malformed data is rejected', async () => {
  await assert.rejects(readSubjectPages(async () => { throw new Error('Database unavailable') }), /Database unavailable/)
  await assert.rejects(readSubjectPages(async () => ({ success: true, data: {} })), /invalid subject list/)
  assert.deepEqual(await readSubjectPages(async () => ({ data: [] })), [])
})

test('subjects on subsequent API pages remain filterable', async () => {
  const pages = []
  const all = await readSubjectPages(async query => {
    pages.push(query)
    return { data: { items: query.Page === 1 ? Array.from({ length: 500 }, (_, i) => ({ ...rows[2], subjectId: 1000 + i })) : [rows[0]] } }
  })
  assert.equal(all.length, 501)
  assert.deepEqual(matchingIds(all, filters), [101])
  assert.deepEqual(pages.map(page => page.Page), [1, 2])
})

test('a server ignoring pagination does not cause an endless loop or duplicate directory', async () => {
  const page = Array.from({ length: 500 }, (_, i) => ({ subjectId: i }))
  await assert.rejects(readSubjectPages(async () => page), /repeated a page/)
})
