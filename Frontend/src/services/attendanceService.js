import { createStudentAttendanceWriter } from './studentAttendanceSaveWorkflow'
import { studentAttendanceApi, sectionAssignmentApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'


class AttendanceService {
  constructor(){this.saveSession=createStudentAttendanceWriter(studentAttendanceApi,result=>eventBus.emit(ERP_EVENTS.ATTENDANCE_RECORDED,result))}
  async getSessions(filter = {}) {
    const sessions = await studentAttendanceApi.list(filter)
    return sessions.map(session => ({
      ...session,
      id: session.attendanceSessionId,
      sessionId: session.attendanceSessionId,
      date: String(session.attendanceDate || '').slice(0, 10),
      subject: session.subjectName || session.subjectCode || '',
      course: session.courseName || '',
      branch: session.branchName || '',
      semester: session.semesterName || '',
      section: session.sectionName || '',
      faculty: session.facultyName || '',
      totalStudents: Number(session.markedCount || 0),
      presentCount: Number(session.presentCount || 0) + Number(session.lateCount || 0),
      absentCount: Number(session.absentCount || 0),
      records: [],
    }))
  }

  async getSessionStudents(sessionId) {
    const response = await studentAttendanceApi.getStudents(sessionId)
    const students = Array.isArray(response?.students) ? response.students : Array.isArray(response) ? response : []
    const statusLabels = {
      PRESENT: 'Present',
      ABSENT: 'Absent',
      LATE: 'Late',
      LEAVE: 'Excused',
      EXCUSED: 'Excused',
      UNMARKED: 'Unmarked',
    }
    return students.map(student => {
      const rawStatus = String(student.attendanceStatus ?? student.status ?? 'UNMARKED').toUpperCase()
      return {
        ...student,
        studentId: student.studentId ?? student.id,
        rollNumber: student.studentCode ?? student.rollNumber ?? student.registrationNumber ?? '',
        name: student.studentName ?? student.fullName ?? student.name ?? 'Student',
        status: statusLabels[rawStatus] || rawStatus,
      }
    })
  }

  async getStudentAttendanceSummary({ collegeId, academicYearId, semesterId, sectionIds = [] }) {
    const scopedSectionIds = [...new Set(sectionIds.filter(Boolean).map(String))]
    if (!scopedSectionIds.length) return new Map()

    const sessionsBySection = await Promise.all(scopedSectionIds.map(sectionId =>
      studentAttendanceApi.list({ collegeId, academicYearId, semesterId, sectionId })
    ))
    const subjectScopes = new Map()
    sessionsBySection.flat().forEach(session => {
      if (String(session.sessionStatus || '').toUpperCase() === 'CANCELLED') return
      const sectionId = session.sectionId
      const subjectId = session.subjectId
      if (sectionId && subjectId) subjectScopes.set(`${sectionId}:${subjectId}`, { sectionId, subjectId })
    })

    const reports = await Promise.all([...subjectScopes.values()].map(scope =>
      studentAttendanceApi.getSubjectReport({
        collegeId,
        academicYearId,
        semesterId,
        sectionId: scope.sectionId,
        subjectId: scope.subjectId,
      })
    ))

    const totalsByStudent = new Map()
    reports.forEach(report => {
      const students = Array.isArray(report?.students) ? report.students : []
      students.forEach(student => {
        const studentId = student.studentId ?? student.id
        const markedSessions = Number(student.markedSessions) || 0
        if (!studentId || markedSessions <= 0) return

        const totals = totalsByStudent.get(String(studentId)) || { markedSessions: 0, presentCount: 0 }
        totals.markedSessions += markedSessions
        totals.presentCount += Number(student.presentCount || 0) + Number(student.lateCount || 0)
        totalsByStudent.set(String(studentId), totals)
      })
    })

    return new Map([...totalsByStudent].map(([studentId, totals]) => [
      studentId,
      {
        ...totals,
        attendanceRate: Math.round((totals.presentCount / totals.markedSessions) * 100),
      },
    ]))
  }

  async getStudentsForAttendance(scope) {
    const sectionId = scope?.sectionId
    if (!sectionId) return []

    // Attendance must use the roster assigned to this exact section. Broad
    // branch/profile fallbacks can mix students from another college when
    // academic profile metadata is incomplete.
    const assigned = await sectionAssignmentApi.listBySection(sectionId)
    if (!Array.isArray(assigned) || assigned.length === 0) return []

    const profiles = await studentService.getAllProfiles().catch(() => [])
    const profileMap = new Map(profiles.map(profile => [
      String(profile.studentId ?? profile.id ?? profile.student_id ?? ''),
      profile,
    ]))
    const selectedCollegeId = String(scope?.collegeId ?? '')
    const collegeIdOf = item => item?.collegeId ?? item?.CollegeId ?? item?.college_id ??
      item?.academic?.collegeId ?? item?.academic?.college_id ??
      item?.admission?.collegeId ?? item?.admission?.college_id ?? ''

    return assigned.flatMap(item => {
      const studentId = item.studentId ?? item.StudentId ?? item.id
      const assignmentStatus = String(item.status ?? item.isActive ?? '').trim().toLowerCase()
      if (['0', 'false', 'inactive', 'withdrawn'].includes(assignmentStatus)) return []
      const profile = profileMap.get(String(studentId ?? '')) || {}
      const studentCollegeId = String(collegeIdOf(profile) || collegeIdOf(item) || '')
      if (selectedCollegeId && studentCollegeId && studentCollegeId !== selectedCollegeId) return []

      const personal = profile.personal || {}
      const academic = profile.academic || {}
      const name = item.fullName || item.FullName || item.studentName || personal.fullName || profile.name || item.name || 'Student'
      const rollNumber = item.studentCode || item.StudentCode || item.rollNumber || item.enrollmentNo || academic.rollNumber || profile.rollNumber || ''
      return [{
        studentId,
        id: studentId,
        name,
        rollNumber,
        admissionNumber: item.admissionNumber || academic.admissionNumber || profile.admissionNumber || '',
        registrationNumber: item.registrationNumber || profile.registrationNumber || rollNumber,
        status: '',
      }]
    })
  }

  async recordAttendance(session) { return this.saveSession(session) }

}

export const attendanceService = new AttendanceService()
export default attendanceService
