import { studentAttendanceApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'

const clean = value => String(value ?? '').trim()
const same = (left, right) => clean(left).toLowerCase() === clean(right).toLowerCase()

// Read-only sample rows make the attendance workspace demonstrable before the
// institution has recorded its first live session. They are never POSTed or
// persisted; live API data always takes precedence.
const DEMO_SESSIONS = [
  { sessionId: 'demo-att-001', date: '2026-09-22', subject: 'Data Structures', courseId: '1', course: 'Bachelor of Technology', branchId: '1', branch: 'Computer Science and Engineering', semesterId: '3', semester: 'Semester 3', sectionId: '1', section: 'A', faculty: 'Dr. Suresh Kumar', totalStudents: 60, presentCount: 55, absentCount: 5, records: [{ studentId: 'DEMO-001', rollNumber: '23BTECHCSE001', name: 'Aarav Reddy', status: 'Present' }, { studentId: 'DEMO-002', rollNumber: '23BTECHCSE002', name: 'Bhavana Reddy', status: 'Absent' }] },
  { sessionId: 'demo-att-002', date: '2026-09-21', subject: 'Object Oriented Programming', courseId: '1', course: 'Bachelor of Technology', branchId: '1', branch: 'Computer Science and Engineering', semesterId: '3', semester: 'Semester 3', sectionId: '1', section: 'A', faculty: 'Prof. Ramesh Chandra', totalStudents: 60, presentCount: 51, absentCount: 9, records: [{ studentId: 'DEMO-001', rollNumber: '23BTECHCSE001', name: 'Aarav Reddy', status: 'Present' }, { studentId: 'DEMO-002', rollNumber: '23BTECHCSE002', name: 'Bhavana Reddy', status: 'Absent' }] },
  { sessionId: 'demo-att-003', date: '2026-09-18', subject: 'Data Structures Lab', courseId: '1', course: 'Bachelor of Technology', branchId: '1', branch: 'Computer Science and Engineering', semesterId: '3', semester: 'Semester 3', sectionId: '1', section: 'A', faculty: 'Dr. Suresh Kumar', totalStudents: 60, presentCount: 57, absentCount: 3, records: [{ studentId: 'DEMO-001', rollNumber: '23BTECHCSE001', name: 'Aarav Reddy', status: 'Present' }, { studentId: 'DEMO-002', rollNumber: '23BTECHCSE002', name: 'Bhavana Reddy', status: 'Late' }] },
  { sessionId: 'demo-att-004', date: '2026-08-28', subject: 'Data Structures', courseId: '1', course: 'Bachelor of Technology', branchId: '1', branch: 'Computer Science and Engineering', semesterId: '3', semester: 'Semester 3', sectionId: '1', section: 'A', faculty: 'Dr. Suresh Kumar', totalStudents: 60, presentCount: 48, absentCount: 12, records: [{ studentId: 'DEMO-001', rollNumber: '23BTECHCSE001', name: 'Aarav Reddy', status: 'Present' }, { studentId: 'DEMO-002', rollNumber: '23BTECHCSE002', name: 'Bhavana Reddy', status: 'Absent' }] },
]

class AttendanceService {
  async getSessions(filter = {}) {
    try {
      const sessions = await studentAttendanceApi.list(filter)
      return sessions.length ? sessions : DEMO_SESSIONS
    } catch (error) {
      // Some current backend deployments resolve an empty attendance register
      // through a profile lookup and return 404 "Profile not found". For the
      // attendance dashboard this is an empty-state, not a user-facing error.
      const message = String(error?.message || '').toLowerCase()
      if (error?.status === 404 && message.includes('profile not found')) return DEMO_SESSIONS
      throw error
    }
  }

  async getStudentsForAttendance(scope) {
    // Do not use the short-lived directory cache here. A coordinator may have
    // just created or updated a student profile and the roster must reflect it
    // immediately when attendance is taken.
    const students = await studentService.getStudentsByScope({ ...scope, forceRefresh: true })
    return students.map((student) => {
      const personal = student.personal || {}
      const academic = student.academic || {}
      return { studentId: student.studentId || student.id, id: student.studentId || student.id, name: personal.fullName || student.name || student.studentName || '', rollNumber: academic.rollNumber || student.rollNumber || student.registrationNumber || '', registrationNumber: student.registrationNumber || academic.rollNumber || '', status: 'Present' }
    })
  }

  async recordAttendance(session) {
    const required = ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'date', 'subject']
    const missing = required.find(key => !clean(session[key]))
    if (missing) throw new Error(`Select ${missing.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').toLowerCase()} before saving attendance.`)
    if (!Array.isArray(session.records) || !session.records.length) throw new Error('Load and mark at least one student before saving attendance.')
    if (session.records.some(record => !clean(record.studentId) || !['Present', 'Absent', 'Late', 'Excused'].includes(record.status))) throw new Error('Every student must have a valid attendance status.')
    const existing = await this.getSessions({ academicYearId: session.academicYearId, courseId: session.courseId, branchId: session.branchId, semesterId: session.semesterId, sectionId: session.sectionId, date: session.date })
    if (existing.some(item => same(item.subject, session.subject))) throw new Error('Attendance for this section, date, and subject already exists. Open the existing session to make corrections.')
    const saved = await studentAttendanceApi.create(session)
    eventBus.emit(ERP_EVENTS.ATTENDANCE_RECORDED, saved)
    return saved
  }

  async getStudentStats(studentId) {
    if (!clean(studentId)) throw new Error('Student ID is required.')
    return studentAttendanceApi.getStudentStats(studentId)
  }
}

export const attendanceService = new AttendanceService()
export default attendanceService
