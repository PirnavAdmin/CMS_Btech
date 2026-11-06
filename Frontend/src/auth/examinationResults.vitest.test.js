import { beforeEach, expect, test, vi } from 'vitest'
import { loadExaminationResultSheets } from '../services/examinationResultsService'
import { list } from '../services/scopedModulesService'
import { studentProfileApi } from '../api/apiEndpoints'
import { getUserRole } from './auth'

vi.mock('../services/scopedModulesService', async original => ({ ...await original(), list: vi.fn() }))
vi.mock('../api/apiEndpoints', () => ({ studentProfileApi: { getMyProfile: vi.fn() } }))
vi.mock('./auth', () => ({ getUserRole: vi.fn(), getUserCollegeId: vi.fn() }))
const scope = { collegeId: 1, academicYearId: 10 }
const exam = { ...scope, examId: 7, semesterId: 3, examName: 'Semester 1' }
beforeEach(() => {
  vi.resetAllMocks()
  getUserRole.mockReturnValue('admin')
  list.mockImplementation(async path => {
    if (path === 'exams') return [exam, { ...exam, examId: 8, collegeId: 2 }]
    if (path === 'student-profiles') return [{ studentId: 5, collegeId: 1, fullName: 'Asha' }, { studentId: 6, collegeId: 2 }]
    if (path === 'results/student/5/backlogs') return [{ backlogId: 9, studentId: 5, sourceResultId: 1, backlogStatus: 'Open', attemptCount: 2 }, { backlogId: 10, studentId: 6, sourceResultId: 1 }]
    if (path === 'results/student/5') return [{ studentId: 5, examId: 7, cgpa: 0, resultStatus: 'FAIL', subjects: [{ resultId: 1, credits: 4, marksObtained: 0, maximumMarks: 80, gradePoint: 0, grade: 'F', resultStatus: 'FAIL' }] }, { studentId: 5, examId: 8, subjects: [] }]
    throw new Error('Unexpected API')
  })
})

test('directory uses examination results, preserves zero and excludes other colleges', async () => {
  const sheets = await loadExaminationResultSheets(scope)
  expect(sheets).toHaveLength(1)
  expect(sheets[0]).toMatchObject({ examId: 7, semesterId: 3, officialCgpa: 0, examResultStatus: 'Failed', records: [{ studentId: 5, studentName: 'Asha', totalMarks: 0, gradePoint: 0 }] })
  expect(sheets[0].studentBacklogs).toEqual([{ backlogId: 9, studentId: 5, sourceResultId: 1, backlogStatus: 'Open', attemptCount: 2 }])
  expect(list.mock.calls.map(([path]) => path)).toEqual(['exams', 'student-profiles', 'results/student/5', 'results/student/5/backlogs'])
})

test('student view obtains its identity from the signed-in profile', async () => {
  getUserRole.mockReturnValue('student')
  studentProfileApi.getMyProfile.mockResolvedValue({ studentId: 5, collegeId: 1 })
  expect(await loadExaminationResultSheets(scope)).toHaveLength(1)
  expect(list.mock.calls.some(([path]) => path === 'student-profiles')).toBe(false)
})

test('empty examination results stay empty and failures never use supplemental records', async () => {
  list.mockResolvedValueOnce([])
  expect(await loadExaminationResultSheets(scope)).toEqual([])
  list.mockRejectedValueOnce(new Error('Unavailable'))
  await expect(loadExaminationResultSheets(scope)).rejects.toThrow('Unavailable')
})
