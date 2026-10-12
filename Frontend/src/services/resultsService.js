import { RESULTS_API_ENABLED, resultsApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'
import { getSampleBTechSheets } from '../pages/examinations/grade-result-management/sampleBTechResults'

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
const LOCAL_RESULTS_KEY = 'cms_local_results_sheets'

function readLocalSheets() {
  try {
    const raw = localStorage.getItem(LOCAL_RESULTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

function saveLocalSheets(sheets) {
  try {
    localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify(sheets))
  } catch { /* ignore */ }
}

class ResultsService {
  get integrationEnabled() { return RESULTS_API_ENABLED }

  async getResults(filter = {}) {
    if (RESULTS_API_ENABLED) {
      try {
        const apiData = await resultsApi.list(filter)
        if (Array.isArray(apiData) && apiData.length > 0) return apiData
      } catch (err) {
        console.warn('Backend results API unavailable, falling back to local storage:', err)
      }
    }

    // Local storage fallback
    const local = readLocalSheets()
    if (!filter || Object.keys(filter).length === 0) return local

    return local.filter(sheet => {
      if (filter.collegeId && String(sheet.collegeId) !== String(filter.collegeId)) return false
      if (filter.academicYearId && String(sheet.academicYearId) !== String(filter.academicYearId)) return false
      if (filter.semesterId && String(sheet.semesterId) !== String(filter.semesterId)) return false
      if (filter.sectionId && String(sheet.sectionId) !== String(filter.sectionId)) return false
      if (filter.examType && !same(sheet.examType, filter.examType)) return false
      if (filter.subjectCode && !same(sheet.subjectCode, filter.subjectCode)) return false
      return true
    })
  }

  seedSampleResults(collegeId = '1', academicYearId = '1') {
    const samples = getSampleBTechSheets(collegeId, academicYearId)
    saveLocalSheets(samples)
    eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, samples)
    return samples
  }

  clearLocalResults() {
    try {
      localStorage.removeItem(LOCAL_RESULTS_KEY)
      eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, [])
    } catch { /* ignore */ }
  }

  hasLocalResults() {
    return readLocalSheets().length > 0
  }

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

    const newSheet = {
      ...sheet,
      records,
      totalStudents: records.length,
      passedCount: records.filter(record => record.status === 'Passed').length,
      failedCount: records.filter(record => record.status === 'Failed').length,
      createdAt: new Date().toISOString(),
    }

    let saved = newSheet
    if (RESULTS_API_ENABLED) {
      try {
        saved = await resultsApi.create(newSheet)
      } catch (err) {
        console.warn('Could not post result sheet to backend, storing locally:', err)
      }
    }

    // Persist locally as well
    const currentLocal = readLocalSheets()
    saveLocalSheets([...currentLocal, saved])
    eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, saved)
    return saved
  }

  async getStudentTranscript(studentId) {
    if (!clean(studentId)) throw new Error('Select a student to view a transcript.')
    if (RESULTS_API_ENABLED) {
      try {
        return await resultsApi.getTranscript(studentId)
      } catch (err) {
        console.warn('API transcript error, falling back to local calculation:', err)
      }
    }
    const all = await this.getResults()
    const studentRecords = all.flatMap(sheet => (Array.isArray(sheet.records) ? sheet.records : []).filter(r => String(r.studentId) === String(studentId)))
    return { studentId, records: studentRecords }
  }
}

export const resultsService = new ResultsService()
export default resultsService
