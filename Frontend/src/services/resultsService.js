import { resultsApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'

export const calculateGrade = (totalMarks) => {
  const marks = Number(totalMarks) || 0
  if (marks >= 90) return { grade: 'O', gradePoint: 10, status: 'Passed' }
  if (marks >= 80) return { grade: 'A+', gradePoint: 9, status: 'Passed' }
  if (marks >= 70) return { grade: 'A', gradePoint: 8, status: 'Passed' }
  if (marks >= 60) return { grade: 'B+', gradePoint: 7, status: 'Passed' }
  if (marks >= 50) return { grade: 'B', gradePoint: 6, status: 'Passed' }
  if (marks >= 40) return { grade: 'C', gradePoint: 5, status: 'Passed' }
  return { grade: 'F', gradePoint: 0, status: 'Failed' }
}

const clean = value => String(value ?? '').trim()
const same = (left, right) => clean(left).toLowerCase() === clean(right).toLowerCase()

class ResultsService {
  async getResults(filter = {}) { return resultsApi.list(filter) }

  async getStudentsForResults(scope) {
    const students = await studentService.getStudentsByScope(scope)
    return students.map((student) => {
      const personal = student.personal || {}
      const academic = student.academic || {}
      return { studentId: student.studentId || student.id, id: student.studentId || student.id, name: personal.fullName || student.name || student.studentName || '', rollNumber: academic.rollNumber || student.rollNumber || student.registrationNumber || '', internalMarks: '', externalMarks: '', totalMarks: '', grade: '', status: 'Pending' }
    })
  }

  async recordResults(sheet) {
    const required = ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'examType', 'subjectCode', 'subjectName']
    const missing = required.find(key => !clean(sheet[key]))
    if (missing) throw new Error(`Complete ${missing.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').toLowerCase()} before publishing results.`)
    const maxInternal = Number(sheet.maxInternal)
    const maxExternal = Number(sheet.maxExternal)
    if (!(maxInternal > 0) || !(maxExternal > 0) || !(Number(sheet.credits) > 0)) throw new Error('Maximum marks and credits must be positive numbers.')
    if (!Array.isArray(sheet.records) || !sheet.records.length) throw new Error('Load students and enter marks before publishing results.')
    const records = sheet.records.map((record) => {
      const internal = Number(record.internalMarks)
      const external = Number(record.externalMarks)
      if (!clean(record.studentId) || !Number.isFinite(internal) || !Number.isFinite(external) || internal < 0 || external < 0 || internal > maxInternal || external > maxExternal) throw new Error('Enter valid marks for every student; marks cannot exceed their maximum.')
      const total = internal + external
      return { ...record, internalMarks: internal, externalMarks: external, totalMarks: total, ...calculateGrade(total), credits: Number(sheet.credits) }
    })
    const existing = await this.getResults({ academicYearId: sheet.academicYearId, courseId: sheet.courseId, branchId: sheet.branchId, semesterId: sheet.semesterId, sectionId: sheet.sectionId, examType: sheet.examType, subjectCode: sheet.subjectCode })
    if (existing.some(item => same(item.subjectCode, sheet.subjectCode) && same(item.examType, sheet.examType))) throw new Error('Results for this section, exam, and subject already exist. Use the existing result sheet to correct marks.')
    const saved = await resultsApi.create({ ...sheet, records, totalStudents: records.length, passedCount: records.filter(record => record.status === 'Passed').length, failedCount: records.filter(record => record.status === 'Failed').length })
    eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, saved)
    return saved
  }

  async getStudentTranscript(studentId) {
    if (!clean(studentId)) throw new Error('Select a student to view a transcript.')
    return resultsApi.getTranscript(studentId)
  }
}

export const resultsService = new ResultsService()
export default resultsService
