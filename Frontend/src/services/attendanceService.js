import { studentAttendanceApi, sectionAssignmentApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'

const clean = value => String(value ?? '').trim()
const same = (left, right) => clean(left).toLowerCase() === clean(right).toLowerCase()

class AttendanceService {
  async getSessions(filter = {}) {
    const sessions = await studentAttendanceApi.list(filter)
    return sessions.map(session => ({
      ...session,
      id: session.attendanceSessionId,
      sessionId: session.attendanceSessionId,
      date: String(session.attendanceDate || '').slice(0, 10),
      subject: session.subjectName || session.subjectCode || '',
      course: session.courseName || '',
      branch: session.sectionName || '',
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

  async getStudentsForAttendance(scope) {
    const sectionId = scope?.sectionId
    const courseId = scope?.courseId
    const courseCode = scope?.courseCode
    const courseName = scope?.course
    const branchId = scope?.branchId
    const branchCode = scope?.branchCode
    const branchName = scope?.branch
    const semesterId = scope?.semesterId
    const semesterName = scope?.semester

    // 1. If a sectionId is provided, load the assigned students for that section from section assignments
    if (sectionId) {
      try {
        const assigned = await sectionAssignmentApi.listBySection(sectionId)
        if (Array.isArray(assigned) && assigned.length > 0) {
          const profiles = await studentService.getAllProfiles().catch(() => [])
          const profileMap = new Map(profiles.map(p => [String(p.studentId || p.id), p]))

          return assigned.map((item) => {
            const studentId = item.studentId ?? item.id
            const profile = profileMap.get(String(studentId)) || {}
            const personal = profile.personal || {}
            const academic = profile.academic || {}
            const name = item.fullName || item.studentName || personal.fullName || profile.name || item.name || 'Student'
            const rollNumber = item.studentCode || item.rollNumber || item.enrollmentNo || academic.rollNumber || profile.rollNumber || ''
            const registrationNumber = item.registrationNumber || profile.registrationNumber || rollNumber

            return {
              studentId,
              id: studentId,
              name,
              rollNumber,
              registrationNumber,
              status: 'Present',
            }
          })
        }
      } catch (err) {
        console.warn('Unable to load students directly by sectionId, falling back to scope lookup:', err)
      }

      // 1b. Check all section assignments list if listBySection didn't find them
      try {
        const allAssigned = await sectionAssignmentApi.list().catch(() => [])
        const matchedAssigned = allAssigned.filter(item => String(item.sectionId) === String(sectionId))
        if (matchedAssigned.length > 0) {
          const profiles = await studentService.getAllProfiles().catch(() => [])
          const profileMap = new Map(profiles.map(p => [String(p.studentId || p.id), p]))

          return matchedAssigned.map((item) => {
            const studentId = item.studentId ?? item.id
            const profile = profileMap.get(String(studentId)) || {}
            const personal = profile.personal || {}
            const academic = profile.academic || {}
            const name = item.fullName || item.studentName || personal.fullName || profile.name || item.name || 'Student'
            const rollNumber = item.studentCode || item.rollNumber || item.enrollmentNo || academic.rollNumber || profile.rollNumber || ''
            const registrationNumber = item.registrationNumber || profile.registrationNumber || rollNumber

            return {
              studentId,
              id: studentId,
              name,
              rollNumber,
              registrationNumber,
              status: 'Present',
            }
          })
        }
      } catch (err) {
        console.warn('Unable to load all assignments fallback:', err)
      }
    }

    // 2. Query students matching the academic scope from studentService
    try {
      const students = await studentService.getStudentsByScope({ ...scope, forceRefresh: true })
      if (students && students.length > 0) {
        return students.map((student) => {
          const personal = student.personal || {}
          const academic = student.academic || {}
          return {
            studentId: student.studentId || student.id,
            id: student.studentId || student.id,
            name: personal.fullName || student.name || student.studentName || 'Student',
            rollNumber: academic.rollNumber || student.rollNumber || student.registrationNumber || '',
            registrationNumber: student.registrationNumber || academic.rollNumber || '',
            status: 'Present',
          }
        })
      }
    } catch (err) {
      console.warn('studentService.getStudentsByScope failed:', err)
    }

    // 3. Fallback: if student profiles lack section assignment metadata, load all branch/semester students
    if (sectionId || scope.section) {
      const branchStudents = await studentService.getStudentsByScope({
        ...scope,
        sectionId: undefined,
        section: undefined,
        forceRefresh: true,
      })
      if (branchStudents && branchStudents.length > 0) {
        return branchStudents.map((student) => {
          const personal = student.personal || {}
          const academic = student.academic || {}
          return {
            studentId: student.studentId || student.id,
            id: student.studentId || student.id,
            name: personal.fullName || student.name || student.studentName || 'Student',
            rollNumber: academic.rollNumber || student.rollNumber || student.registrationNumber || '',
            registrationNumber: student.registrationNumber || academic.rollNumber || '',
            status: 'Present',
          }
        })
      }
    }

    // 4. Final fallback: direct profile fetch and branch/sem match
    try {
      const allProfiles = await studentService.getAllProfiles({ forceRefresh: true }).catch(() => [])
      const targetBranchKey = clean(branchCode || branchName || branchId).toLowerCase().replace(/[^a-z0-9]/g, '')
      const targetSemDigits = String(semesterName || semesterId || '').match(/\d+/)?.[0] || ''

      const matched = allProfiles.filter(p => {
        const pBranch = clean(p.academic?.branch || p.academic?.branchCode || p.branch || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const pSemDigits = String(p.academic?.semester || p.academic?.semesterId || p.semester || '').match(/\d+/)?.[0] || ''

        const branchMatch = !targetBranchKey || !pBranch || pBranch.includes(targetBranchKey) || targetBranchKey.includes(pBranch)
        const semMatch = !targetSemDigits || !pSemDigits || pSemDigits === targetSemDigits
        return branchMatch && semMatch
      })

      if (matched.length > 0) {
        return matched.map(student => {
          const personal = student.personal || {}
          const academic = student.academic || {}
          return {
            studentId: student.studentId || student.id,
            id: student.studentId || student.id,
            name: personal.fullName || student.name || student.studentName || 'Student',
            rollNumber: academic.rollNumber || student.rollNumber || student.registrationNumber || '',
            registrationNumber: student.registrationNumber || academic.rollNumber || '',
            status: 'Present',
          }
        })
      }
    } catch (err) {
      console.warn('Final profile fallback failed:', err)
    }

    return []
  }

  async recordAttendance(session) {
    const required = ['academicYearId', 'semesterId', 'sectionId', 'subjectId', 'facultyId', 'date']
    const missing = required.find(key => !clean(session[key]))
    if (missing) throw new Error(`Select ${missing.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').toLowerCase()} before saving attendance.`)
    if (!Array.isArray(session.records) || !session.records.length) throw new Error('Load and mark at least one student before saving attendance.')
    if (session.records.some(record => !clean(record.studentId) || !['Present', 'Absent', 'Late', 'Excused'].includes(record.status))) throw new Error('Every student must have a valid attendance status.')
    const existing = await studentAttendanceApi.list({ academicYearId: session.academicYearId, semesterId: session.semesterId, sectionId: session.sectionId, subjectId: session.subjectId, fromDate: session.date, toDate: session.date })
    if (existing.some(item => same(item.subjectName || item.subjectCode, session.subject))) throw new Error('Attendance for this section, date, and subject already exists. Open the existing session to make corrections.')
    const rawSubId = Number(session.subjectId) || Number(String(session.subjectId).replace(/\D/g, '')) || 1
    const saved = await studentAttendanceApi.create({
      academicYearId: Number(session.academicYearId),
      semesterId: Number(session.semesterId),
      sectionId: Number(session.sectionId || 1),
      subjectId: rawSubId,
      facultyId: Number(session.facultyId),
      attendanceDate: session.date,
      remarks: session.remarks || null,
      ...(session.collegeId ? { collegeId: Number(session.collegeId) } : {}),
    })
    const sessionId = saved.attendanceSessionId || saved.sessionId || saved.id
    if (!sessionId) throw new Error('Session was created, but the API response did not include attendanceSessionId.')
    const rosterResponse = await studentAttendanceApi.getStudents(sessionId)
    const roster = Array.isArray(rosterResponse.students) ? rosterResponse.students : []
    if (!roster.length) throw new Error('The new session has no students in its backend roster. Check student section assignments before marking attendance.')
    const requestedMarks = new Map(session.records.map(record => [String(record.studentId), record]))
    const rosterMarks = roster.map(student => {
      const studentId = student.studentId ?? student.id
      const selected = requestedMarks.get(String(studentId))
      return { studentId, status: selected?.status || 'Absent', remarks: selected?.remarks || null }
    })
    const marked = await studentAttendanceApi.mark(sessionId, {
      students: rosterMarks.map(record => ({
        studentId: Number(record.studentId),
        attendanceStatus: ({ Present: 'PRESENT', Absent: 'ABSENT', Late: 'LATE', Excused: 'LEAVE' })[record.status],
        remarks: record.remarks || null,
      })), markUnlistedAsAbsent: false, completeSession: true,
    })
    const result = { ...saved, ...marked, attendanceSessionId: sessionId }
    eventBus.emit(ERP_EVENTS.ATTENDANCE_RECORDED, result)
    return result
  }

}

export const attendanceService = new AttendanceService()
export default attendanceService
