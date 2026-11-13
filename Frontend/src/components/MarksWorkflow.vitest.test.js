import { expect, test, vi } from 'vitest'
import { clearMarksAssessmentDependents, createOrVerifyMark, importVerifiedMarks, marksSaveErrorMessage, resolveAuthorizedMarksExam, scopeMarksExams } from '../utils/marksWorkflow.js'

const records = [
  { ExamId: 5, CollegeId: 7, AcademicYearId: 2026, CourseId: 10, CourseName: 'BTECH', BranchId: 20, BranchName: 'CSE', SemesterId: 1, SemesterName: '1', ExamTypeName: 'Mid Semester' },
  { ExamId: 6, CollegeId: 8, AcademicYearId: 2026 },
  { ExamId: 7, CollegeId: 7, AcademicYearId: 2025 },
  { ExamId: 8, CollegeId: 7, AcademicYearId: 2026, Status: 'Inactive' },
]

const authorization = (overrides = {}) => ({ exams: scopeMarksExams(records, { collegeId: 7, academicYearId: 2026 }), collegeId: 7, academicYearId: 2026, courseId: 10, courseName: 'BTECH', branchId: 20, branchName: 'CSE', semesterId: 1, semesterName: '1', ...overrides })

test.each(['academicYear', 'course', 'branch', 'semester', 'section', 'subject', 'subjectCode'])('changing %s clears old exam and student selections', changedKey => {
  expect(clearMarksAssessmentDependents(changedKey)).toEqual({ examId: '', examType: '', assessmentType: '', registrationNumber: '', studentName: '', studentId: '' })
})

test('authorized exam directory normalizes field casing and strictly scopes college and academic year', () => {
  expect(scopeMarksExams(records, { collegeId: 7, academicYearId: 2026 }).map(row => row.examId)).toEqual(['5'])
  expect(resolveAuthorizedMarksExam(authorization().exams, { ...authorization(), examId: '5' })?.examId).toBe('5')
  expect(resolveAuthorizedMarksExam(authorization().exams, { ...authorization(), examId: '6' })).toBeNull()
  expect(resolveAuthorizedMarksExam(authorization().exams, { ...authorization(), examId: '7' })).toBeNull()
  expect(resolveAuthorizedMarksExam(authorization().exams, { ...authorization(), examId: '5', courseId: 11 })).toBeNull()
  expect(resolveAuthorizedMarksExam(authorization().exams, { ...authorization(), examId: '5', semesterId: 2, semesterName: '2' })).toBeNull()
})

test('mark creation blocks invalid or out-of-scope IDs before making an API request', async () => {
  const api = { create: vi.fn(), list: vi.fn() }
  const pending = new Map()
  await expect(createOrVerifyMark(api, { examId: 6, studentId: 4, subjectId: 2 }, pending, authorization())).rejects.toThrow(/current authorized college and academic year/)
  await expect(createOrVerifyMark(api, { examId: 5, studentId: '', subjectId: 2 }, pending, authorization())).rejects.toThrow(/valid examination, student and subject/)
  expect(api.create).not.toHaveBeenCalled()
  expect(api.list).not.toHaveBeenCalled()
})

test('mark creation sends only validated IDs and accepts only the server-confirmed mark record', async () => {
  const api = { create: vi.fn(async payload => ({ markId: 51, ...payload })) }
  const pending = new Map()
  const saved = await createOrVerifyMark(api, { examId: '5', studentId: '4', subjectId: '2', marksObtained: 18, maxMarks: 25 }, pending, authorization())
  expect(api.create).toHaveBeenCalledOnce()
  expect(api.create.mock.calls[0][0]).toMatchObject({ examId: 5, studentId: 4, subjectId: 2, marksObtained: 18 })
  expect(saved.markId).toBe(51)
  expect(pending.size).toBe(0)
})

test('bulk import requires a current authorized examination without changing the API scope', async () => {
  const api = { upload: vi.fn(async () => ({ uploadId: 1, totalRows: 1, validRows: 1, insertedRows: 1, updatedRows: 0, rejectedRows: 0, errors: [] })) }
  const pending = new Map()
  await expect(importVerifiedMarks(api, new File(['x'], 'marks.csv'), { examId: 6, sectionId: 2 }, pending, authorization())).rejects.toThrow(/current authorized college and academic year/)
  expect(api.upload).not.toHaveBeenCalled()
  await importVerifiedMarks(api, new File(['x'], 'marks.csv'), { examId: 5, sectionId: 2 }, pending, authorization())
  expect(api.upload.mock.calls[0][1]).toEqual({ examId: 5, sectionId: 2 })
})

test('record scope errors have the required message and server failures remain retryable', () => {
  expect(marksSaveErrorMessage({ code: 'RECORD_OUTSIDE_SCOPE', status: 400, message: 'backend text' })).toBe('The selected examination is not valid for your authorized college. Please select a valid examination.')
  expect(marksSaveErrorMessage({ status: 401 })).toMatch(/session has expired/i)
  expect(marksSaveErrorMessage({ status: 403 })).toMatch(/permission/i)
  expect(marksSaveErrorMessage({ status: 404 })).toMatch(/no longer available/i)
  expect(marksSaveErrorMessage({ status: 500 })).toMatch(/Retry/)
})
