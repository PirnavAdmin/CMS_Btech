import { studentAttendanceApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'

const clean = value => String(value ?? '').trim()
const same = (left, right) => clean(left).toLowerCase() === clean(right).toLowerCase()

class AttendanceService {
  async getSessions(filter = {}) { return studentAttendanceApi.list(filter) }

  async getStudentsForAttendance(scope) {
    const students = await studentService.getStudentsByScope(scope)
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
