import studentService from './studentService'
import academicService from './academicService'
import eventBus, { ERP_EVENTS } from './eventBus'

const ATTENDANCE_STORAGE_KEY = 'pirnav-attendance-records-v1'

const readAttendanceRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY)) || []
  } catch {
    return []
  }
}

const saveAttendanceRecords = (records) => {
  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('Failed to save attendance records:', err)
  }
}

class AttendanceService {
  // Query attendance sessions for a specific section and date/subject
  async getSessions(filter = {}) {
    const all = readAttendanceRecords()
    return all.filter((s) => {
      if (filter.academicYearId && String(s.academicYearId) !== String(filter.academicYearId)) return false
      if (filter.courseId && String(s.courseId) !== String(filter.courseId)) return false
      if (filter.branchId && String(s.branchId) !== String(filter.branchId)) return false
      if (filter.semesterId && String(s.semesterId) !== String(filter.semesterId)) return false
      if (filter.sectionId && String(s.sectionId) !== String(filter.sectionId)) return false
      if (filter.date && s.date !== filter.date) return false
      if (filter.subject && s.subject?.toLowerCase() !== filter.subject?.toLowerCase()) return false
      return true
    })
  }

  // Load students for marking attendance in a selected section
  async getStudentsForAttendance({ academicYearId, courseId, branchId, semesterId, sectionId, course, branch, semester, section }) {
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
        registrationNumber: s.registrationNumber || a.rollNumber || '',
        status: 'Present', // default marking
      }
    })
  }

  // Save attendance sheet for a session
  async recordAttendance({
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
    date = new Date().toISOString().slice(0, 10),
    subject = 'General Theory',
    faculty = 'Dr. Sharma',
    records = [], // [{ studentId, name, rollNumber, status: 'Present' | 'Absent' | 'Late' | 'Excused' }]
  }) {
    const sessionId = `ATT-${academicYearId || 'AY'}-${courseId || 'C'}-${branchId || 'B'}-${semesterId || 'S'}-${sectionId || 'SEC'}-${date}-${subject.replace(/\s+/g, '_')}`
    
    const existing = readAttendanceRecords()
    const sessionRecord = {
      sessionId,
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
      date,
      subject,
      faculty,
      totalStudents: records.length,
      presentCount: records.filter((r) => r.status === 'Present').length,
      absentCount: records.filter((r) => r.status === 'Absent').length,
      lateCount: records.filter((r) => r.status === 'Late').length,
      excusedCount: records.filter((r) => r.status === 'Excused').length,
      records,
      updatedAt: new Date().toISOString(),
    }

    const index = existing.findIndex((s) => s.sessionId === sessionId)
    let updated
    if (index >= 0) {
      updated = existing.map((s, i) => (i === index ? sessionRecord : s))
    } else {
      updated = [sessionRecord, ...existing]
    }

    saveAttendanceRecords(updated)
    eventBus.emit(ERP_EVENTS.ATTENDANCE_RECORDED, sessionRecord)
    return sessionRecord
  }

  // Calculate cumulative stats for a student or section
  async getStudentStats(studentId) {
    const all = readAttendanceRecords()
    let total = 0
    let attended = 0

    all.forEach((session) => {
      const rec = (session.records || []).find((r) => String(r.studentId) === String(studentId))
      if (rec) {
        total += 1
        if (rec.status === 'Present' || rec.status === 'Late') {
          attended += 1
        }
      }
    })

    const percentage = total > 0 ? Math.round((attended / total) * 100) : 85 // standard healthy fallback
    return {
      totalClasses: total,
      attendedClasses: attended,
      percentage,
      status: percentage >= 75 ? 'Eligible' : 'Shortage',
    }
  }
}

export const attendanceService = new AttendanceService()
export default attendanceService
