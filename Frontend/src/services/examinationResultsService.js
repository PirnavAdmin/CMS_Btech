import { studentProfileApi } from '../api/apiEndpoints'
import { getUserRole } from '../auth/auth'
import { list, requireId, scoped } from './scopedModulesService'

const resultStatus = value => ({ PASS: 'Passed', FAIL: 'Failed', ABSENT: 'Absent' }[String(value).toUpperCase()] || value || '')

// Examination results are independent of supplemental publication records.
export async function loadExaminationResultSheets(scope) {
  requireId(scope.collegeId, 'college')
  requireId(scope.academicYearId, 'academic year')
  const exams = (await list('exams', scope)).filter(exam => scoped(exam, scope))
  if (!exams.length) return []
  const examMap = new Map(exams.map(exam => [String(exam.examId), exam]))
  const profiles = getUserRole() === 'student'
    ? [await studentProfileApi.getMyProfile()]
    : await list('student-profiles', { collegeId: scope.collegeId })
  const students = [...new Map(profiles.filter(profile => String(profile.collegeId ?? profile.academic?.collegeId ?? profile.admission?.collegeId) === String(scope.collegeId))
    .map(profile => [String(requireId(profile.studentId ?? profile.id, 'student')), profile])).values()]
  const sheets = []
  // Limit simultaneous student requests in large directories.
  for (let offset = 0; offset < students.length; offset += 6) {
    const groups = await Promise.all(students.slice(offset, offset + 6).map(async student => {
      const studentId = requireId(student.studentId ?? student.id, 'student')
      const [summaries, backlogs] = await Promise.all([
        list(`results/student/${studentId}`), list(`results/student/${studentId}/backlogs`),
      ])
      return summaries.filter(summary => Number(summary.studentId) === studentId && examMap.has(String(summary.examId))).map(summary => {
        if (!Array.isArray(summary.subjects)) throw new Error('The examination result has no valid subject breakdown. Retry loading results.')
        const exam = examMap.get(String(summary.examId))
        const studentName = student.fullName || student.studentName || student.personal?.fullName || [student.firstName, student.lastName].filter(Boolean).join(' ')
        return {
          id: `${studentId}:${summary.examId}`,
          collegeId: scope.collegeId,
          academicYearId: scope.academicYearId,
          examId: summary.examId,
          courseId: exam.courseId,
          branchId: exam.branchId,
          branchName: exam.branchName,
          semesterId: exam.semesterId,
          semesterName: exam.semesterName,
          examType: exam.examName,
          examDate: exam.startDate,
          officialSgpa: summary.sgpa,
          officialCgpa: summary.cgpa,
          officialBacklogCount: summary.backlogCount,
          examResultStatus: resultStatus(summary.resultStatus),
          studentBacklogs: backlogs.filter(backlog => Number(backlog.studentId) === studentId && summary.subjects.some(subject => Number(subject.resultId) === Number(backlog.sourceResultId))),
          records: summary.subjects.map(subject => ({
            ...subject,
            studentId,
            studentName,
            registrationNumber: student.registrationNumber || student.studentCode || '',
            rollNumber: student.rollNumber || student.academic?.rollNumber || '',
            totalMarks: subject.marksObtained,
            status: subject.isAbsent ? 'Absent' : resultStatus(subject.resultStatus),
          })),
        }
      })
    }))
    sheets.push(...groups.flat())
  }
  return sheets
}
