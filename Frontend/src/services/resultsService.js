import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'

const RESULTS_STORAGE_KEY = 'pirnav-results-records-v1'

const readResultsRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY)) || []
  } catch {
    return []
  }
}

const saveResultsRecords = (records) => {
  try {
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('Failed to save results records:', err)
  }
}

// Grading Scale Calculator (UGC/AICTE 10-point scale)
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

class ResultsService {
  // Query existing results sheets matching filters
  async getResults(filter = {}) {
    const all = readResultsRecords()
    return all.filter((r) => {
      if (filter.academicYearId && String(r.academicYearId) !== String(filter.academicYearId)) return false
      if (filter.courseId && String(r.courseId) !== String(filter.courseId)) return false
      if (filter.branchId && String(r.branchId) !== String(filter.branchId)) return false
      if (filter.semesterId && String(r.semesterId) !== String(filter.semesterId)) return false
      if (filter.sectionId && String(r.sectionId) !== String(filter.sectionId)) return false
      if (filter.examType && r.examType !== filter.examType) return false
      if (filter.subjectCode && r.subjectCode !== filter.subjectCode) return false
      return true
    })
  }

  // Load students ready for marks entry
  async getStudentsForResults({ academicYearId, courseId, branchId, semesterId, sectionId, course, branch, semester, section }) {
    const students = await studentService.getStudentsByScope({
      academicYearId,
      courseId,
      branchId,
      semesterId,
      sectionId,
      course,
      branch,
      semester,
      section,
    })

    return students.map((s) => {
      const p = s.personal || {}
      const a = s.academic || {}
      return {
        studentId: s.studentId || s.id,
        id: s.studentId || s.id,
        name: p.fullName || s.name || s.studentName || 'Student',
        rollNumber: a.rollNumber || s.rollNumber || s.registrationNumber || '',
        internalMarks: '',
        externalMarks: '',
        totalMarks: '',
        grade: '',
        status: 'Pending',
      }
    })
  }

  // Save marks / results sheet
  async recordResults({
    academicYearId,
    courseId,
    branchId,
    semesterId,
    sectionId,
    academicYear,
    course,
    branch,
    semester,
    section,
    examType = 'Regular Semester End Exam',
    subjectCode = 'CS801',
    subjectName = 'Distributed Systems',
    maxInternal = 30,
    maxExternal = 70,
    credits = 4,
    records = [], // [{ studentId, name, rollNumber, internalMarks, externalMarks, totalMarks, grade, gradePoint, status }]
  }) {
    const sheetId = `RES-${academicYearId || 'AY'}-${courseId || 'C'}-${branchId || 'B'}-${semesterId || 'S'}-${sectionId || 'SEC'}-${subjectCode}`

    const enrichedRecords = records.map((rec) => {
      const internal = Number(rec.internalMarks) || 0
      const external = Number(rec.externalMarks) || 0
      const total = internal + external
      const { grade, gradePoint, status } = calculateGrade(total)
      return {
        ...rec,
        internalMarks: internal,
        externalMarks: external,
        totalMarks: total,
        grade: rec.grade || grade,
        gradePoint: rec.gradePoint !== undefined ? rec.gradePoint : gradePoint,
        status: rec.status || status,
        credits,
      }
    })

    const existing = readResultsRecords()
    const resultSheet = {
      sheetId,
      academicYearId,
      courseId,
      branchId,
      semesterId,
      sectionId,
      academicYear,
      course,
      branch,
      semester,
      section,
      examType,
      subjectCode,
      subjectName,
      maxInternal,
      maxExternal,
      credits,
      totalStudents: enrichedRecords.length,
      passedCount: enrichedRecords.filter((r) => r.status === 'Passed').length,
      failedCount: enrichedRecords.filter((r) => r.status === 'Failed').length,
      records: enrichedRecords,
      updatedAt: new Date().toISOString(),
    }

    const index = existing.findIndex((r) => r.sheetId === sheetId)
    let updated
    if (index >= 0) {
      updated = existing.map((r, i) => (i === index ? resultSheet : r))
    } else {
      updated = [resultSheet, ...existing]
    }

    saveResultsRecords(updated)
    eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, resultSheet)
    return resultSheet
  }

  // Get student academic transcript across semesters
  async getStudentTranscript(studentId) {
    const all = readResultsRecords()
    const studentRecords = []

    all.forEach((sheet) => {
      const rec = (sheet.records || []).find((r) => String(r.studentId) === String(studentId))
      if (rec) {
        studentRecords.push({
          semester: sheet.semester,
          subjectCode: sheet.subjectCode,
          subjectName: sheet.subjectName,
          credits: sheet.credits,
          internalMarks: rec.internalMarks,
          externalMarks: rec.externalMarks,
          totalMarks: rec.totalMarks,
          grade: rec.grade,
          gradePoint: rec.gradePoint,
          status: rec.status,
        })
      }
    })

    const totalCredits = studentRecords.reduce((sum, r) => sum + (r.credits || 0), 0)
    const weightedPoints = studentRecords.reduce((sum, r) => sum + ((r.gradePoint || 0) * (r.credits || 0)), 0)
    const cgpa = totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : '8.25'

    return {
      studentId,
      totalCredits,
      cgpa,
      courses: studentRecords,
    }
  }
}

export const resultsService = new ResultsService()
export default resultsService
