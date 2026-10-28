// Faculty Service layer accessing mock data with simulated asynchronous latency
// Ready to be replaced by real API calls in future without UI changes.

import {
  facultyProfile,
  subjects,
  subjectAllocations,
  sections,
  students,
  weeklyTimetable,
  todayClassesSample,
  attendanceSessions,
  attendanceShortageAlerts,
  facultyMyAttendance,
  marksAssessments,
  examsList,
  examSchedule,
  invigilationDuties,
  examRules,
  examResultsSummary,
  pendingElectiveApprovals,
  studyMaterials,
  leaveBalances,
  leaveHistory,
  facultyDocuments,
  facultyMeetings,
  facultyEvents,
  facultyNotifications,
  dashboardPendingActions,
} from '../mock-data/index.js'

const DELAY_MS = 250

// Local simulated state for mutations
let inMemoryStudents = [...students]
let inMemoryAttendanceSessions = [...attendanceSessions]
let inMemoryMarksAssessments = [...marksAssessments]
let inMemoryElectiveApprovals = [...pendingElectiveApprovals]
let inMemoryMaterials = [...studyMaterials]
let inMemoryLeaves = [...leaveHistory]
let inMemoryLeaveBalances = leaveBalances.map(row => ({ ...row }))
let inMemoryNotifications = [...facultyNotifications]
let inMemoryDocuments = [...facultyDocuments]
let inMemoryMeetings = [...facultyMeetings]
let inMemoryEvents = [...facultyEvents]
let inMemoryProfile = { ...facultyProfile }

// Error simulation flag for testing error-with-retry states
let shouldSimulateError = false

export const setSimulateError = (val) => {
  shouldSimulateError = val
}

const sleep = (ms = DELAY_MS) => new Promise((resolve, reject) => {
  setTimeout(() => {
    if (shouldSimulateError) {
      reject(new Error('Unable to load the local faculty preview data. Please retry.'))
    } else {
      resolve()
    }
  }, ms)
})

export const facultyService = {
  async getDashboardSnapshot() {
    await sleep()
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = (rows, dateOf) => rows
      .filter(row => dateOf(row) >= today)
      .slice()
      .sort((a, b) => dateOf(a).localeCompare(dateOf(b)))

    return {
      faculty: { ...facultyProfile },
      academicYear: subjectAllocations.find(row => row.academicYear)?.academicYear || '',
      kpis: {
        myStudents: new Set(inMemoryStudents.map(student => student.id)).size,
        mySubjects: new Set(subjectAllocations.map(row => row.subjectId)).size,
        assignedSections: new Set(subjectAllocations.map(row => row.sectionId)).size,
        todaysClasses: todayClassesSample.length,
      },
      todayClasses: [...todayClassesSample],
      pendingActions: dashboardPendingActions.map(row => ({ ...row })),
      upcomingExams: upcoming(examSchedule, row => row.date).slice(0, 3),
      upcomingMeetings: upcoming(facultyMeetings, row => row.date).slice(0, 3),
      shortageAlerts: [...attendanceShortageAlerts],
    }
  },

  // --- Dashboard ---
  async getDashboardKPIs() {
    await sleep()
    const uniqueStudents = new Set(inMemoryStudents.map(s => s.id)).size
    const uniqueSubjects = new Set(subjectAllocations.map(row => row.subjectId)).size
    const uniqueSections = new Set(subjectAllocations.map(row => row.sectionId)).size
    const todaysClassesCount = todayClassesSample.length

    return {
      myStudents: uniqueStudents,
      mySubjects: uniqueSubjects,
      assignedSections: uniqueSections,
      todaysClasses: todaysClassesCount,
      pendingActionsCount: dashboardPendingActions.length,
      shortageCount: attendanceShortageAlerts.length,
    }
  },

  async getTodayClasses() {
    await sleep()
    return [...todayClassesSample]
  },

  async getPendingActions() {
    await sleep()
    return [
      {
        id: 'act-1',
        type: 'attendance',
        title: 'Attendance Not Marked',
        description: 'DBMS Lab (Batch 1) on 26 Oct 2026',
        priority: 'High',
        actionLabel: 'Mark Attendance',
        actionUrl: '/faculty-portal/attendance?assignment=alloc-3',
      },
      {
        id: 'act-2',
        type: 'marks-draft',
        title: 'Marks in Draft Mode',
        description: 'Mid-Term Examination 1 (CS301 - Sec A) pending final submission',
        priority: 'Medium',
        actionLabel: 'Review & Submit',
        actionUrl: '/faculty-portal/marks?evalId=eval-1',
      },
      {
        id: 'act-3',
        type: 'marks-rejected',
        title: 'Marks Rejected by Admin',
        description: 'Quiz 1 (CS303 - Sec C): "Please verify question 4 scoring for student 23CSE015"',
        priority: 'High',
        actionLabel: 'Edit & Resubmit',
        actionUrl: '/faculty-portal/marks?evalId=eval-3',
      },
      {
        id: 'act-4',
        type: 'elective',
        title: 'Elective Approvals Waiting',
        description: '3 students awaiting faculty endorsement for CS-EL301 & CS-EL502',
        priority: 'Medium',
        actionLabel: 'View Requests',
        actionUrl: '/faculty-portal/electives',
      },
    ]
  },

  async getUpcomingSchedule() {
    await sleep()
    return {
      exams: examSchedule.slice(0, 2),
      meetings: facultyMeetings.slice(0, 2),
    }
  },

  async getAttendanceShortageAlerts() {
    await sleep()
    return [...attendanceShortageAlerts]
  },

  // --- Profile ---
  async getProfile() {
    await sleep()
    return { ...inMemoryProfile }
  },

  async updateProfile(changes) {
    await sleep(250)
    inMemoryProfile = { ...inMemoryProfile, ...changes }
    return { ...inMemoryProfile }
  },

  async changePassword({ currentPassword, newPassword }) {
    await sleep(250)
    if (!currentPassword || String(newPassword || '').length < 8) throw new Error('Enter your current password and a new password with at least 8 characters.')
    return { success: true }
  },

  // --- Subjects ---
  async getSubjects() {
    await sleep()
    return {
      subjects: [...subjects],
      allocations: [...subjectAllocations],
      workload: {
        totalHoursPerWeek: 16,
        capacityHoursPerWeek: 18,
        allocatedSubjectsCount: subjects.length,
        allocatedSectionsCount: sections.length,
      },
    }
  },

  async getSubjectById(id) {
    await sleep()
    const sub = subjects.find(s => s.id === id || s.code === id)
    if (!sub) throw new Error(`Subject with ID ${id} not found`)
    const allocs = subjectAllocations.filter(a => a.subjectId === sub.id)
    return {
      ...sub,
      allocations: allocs,
    }
  },

  // --- Sections ---
  async getSections() {
    await sleep()
    return [...sections]
  },

  // --- Students ---
  async getStudents({ sectionId, search = '', page = 1, pageSize = 10, sortBy = 'rollNumber', sortOrder = 'asc' } = {}) {
    await sleep()
    let filtered = [...inMemoryStudents]

    if (sectionId) {
      filtered = filtered.filter(s => s.sectionId === sectionId)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let valA = a[sortBy] ?? ''
      let valB = b[sortBy] ?? ''
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    const totalRecords = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startIndex = (currentPage - 1) * pageSize
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize)

    return {
      items: paginatedItems,
      totalRecords,
      totalPages,
      currentPage,
      pageSize,
    }
  },

  async getStudentById(id) {
    await sleep()
    const student = inMemoryStudents.find(s => s.id === id || s.rollNumber === id)
    if (!student) throw new Error(`Student ${id} not found`)
    return { ...student }
  },

  // --- Timetable ---
  async getTimetable() {
    await sleep()
    return {
      weekly: [...weeklyTimetable],
      today: [...todayClassesSample],
    }
  },

  // --- Attendance ---
  async getAttendanceSessions() {
    await sleep()
    return [...inMemoryAttendanceSessions]
  },

  async submitAttendance(sessionData) {
    await sleep(400)
    if (!Array.isArray(sessionData.records) || !sessionData.records.length || sessionData.records.some(record => !['PRESENT', 'ABSENT', 'LATE'].includes(record.status))) {
      throw new Error('Mark each student as present, absent or late before saving attendance.')
    }
    const newSession = {
      id: sessionData.sessionId || `att-sess-${Date.now()}`,
      date: sessionData.date,
      subjectId: sessionData.subjectId,
      subjectCode: sessionData.subjectCode,
      subjectName: sessionData.subjectName,
      sectionId: sessionData.sectionId,
      sectionName: sessionData.sectionName,
      records: sessionData.records.map(record => ({ ...record })),
      totalStudents: sessionData.records.length,
      presentCount: sessionData.records.filter(r => r.status === 'PRESENT').length,
      absentCount: sessionData.records.filter(r => r.status === 'ABSENT').length,
      lateCount: sessionData.records.filter(r => r.status === 'LATE').length,
      status: 'COMPLETED',
      takenAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const existingIndex = inMemoryAttendanceSessions.findIndex(row => row.id === newSession.id)
    if (existingIndex >= 0) {
      inMemoryAttendanceSessions = inMemoryAttendanceSessions.map((row, index) => index === existingIndex ? newSession : row)
    } else {
      inMemoryAttendanceSessions = [newSession, ...inMemoryAttendanceSessions]
    }
    return newSession
  },

  async saveAttendance(sessionData) {
    return this.submitAttendance(sessionData)
  },

  async getMyAttendance() {
    await sleep()
    return { ...facultyMyAttendance }
  },

  // --- Marks ---
  async getMarksAssessments() {
    await sleep()
    return [...inMemoryMarksAssessments]
  },

  async saveMarksEntry(evalId, studentMarks) {
    await sleep(400)
    const idx = inMemoryMarksAssessments.findIndex(m => m.id === evalId)
    if (idx !== -1) {
      inMemoryMarksAssessments[idx] = {
        ...inMemoryMarksAssessments[idx],
        status: 'Submitted',
        submissionDate: new Date().toISOString().split('T')[0],
      }
    }
    return { success: true, count: studentMarks.length }
  },

  async updateAssessmentMarks(evalId, studentMarks, status = 'Draft') {
    await sleep(350)
    const assessment = inMemoryMarksAssessments.find(row => row.id === evalId)
    if (!assessment) throw new Error('The selected assessment is unavailable.')
    if (assessment.status === 'Approved') throw new Error('Approved marks are locked and cannot be changed.')
    inMemoryMarksAssessments = inMemoryMarksAssessments.map(row => row.id === evalId ? {
      ...row,
      status,
      submissionDate: status === 'Submitted' ? new Date().toISOString().slice(0, 10) : row.submissionDate,
      enteredMarks: studentMarks.map(mark => ({ ...mark })),
    } : row)
    return { success: true, count: studentMarks.length }
  },

  async requestMarksEdit(evalId, reason) {
    await sleep(250)
    const assessment = inMemoryMarksAssessments.find(row => row.id === evalId)
    if (!assessment) throw new Error('The selected assessment is unavailable.')
    if (!String(reason || '').trim()) throw new Error('Provide a reason for the edit request.')
    return { success: true, evalId, reason: String(reason).trim() }
  },

  // --- Exams ---
  async getExams() {
    await sleep()
    return {
      exams: [...examsList],
      schedule: [...examSchedule],
      invigilationDuties: [...invigilationDuties],
      rules: [...examRules],
      results: {
        ...examResultsSummary,
        toppers: examResultsSummary.toppers.map(row => ({ ...row })),
        backlogs: examResultsSummary.backlogs.map(row => ({ ...row })),
      },
    }
  },

  // --- Electives ---
  async getElectives() {
    await sleep()
    return [...inMemoryElectiveApprovals]
  },

  async updateElectiveApproval(id, status, remarks) {
    await sleep(300)
    if (!inMemoryElectiveApprovals.some(row => row.id === id)) throw new Error('This elective request is no longer available.')
    inMemoryElectiveApprovals = inMemoryElectiveApprovals.map(e =>
      e.id === id ? { ...e, status, remarks } : e
    )
    return { success: true, id, status }
  },

  async updateElectiveApprovals(updates) {
    await sleep(300)
    const unknown = updates.find(update => !inMemoryElectiveApprovals.some(row => row.id === update.id))
    if (unknown) throw new Error('One or more selected requests are no longer available.')
    inMemoryElectiveApprovals = inMemoryElectiveApprovals.map(row => {
      const update = updates.find(item => item.id === row.id)
      return update ? { ...row, status: update.status, remarks: update.remarks || '' } : row
    })
    return { success: true }
  },

  // --- Materials ---
  async getStudyMaterials() {
    await sleep()
    return [...inMemoryMaterials]
  },

  async uploadStudyMaterial(material) {
    await sleep(400)
    const newMat = {
      id: `mat-${Date.now()}`,
      ...material,
      uploadedAt: new Date().toISOString().split('T')[0],
      downloadsCount: 0,
    }
    inMemoryMaterials = [newMat, ...inMemoryMaterials]
    return newMat
  },

  async updateStudyMaterial(id, changes) {
    await sleep(250)
    const material = inMemoryMaterials.find(row => row.id === id)
    if (!material) throw new Error('This material is no longer available.')
    inMemoryMaterials = inMemoryMaterials.map(row => row.id === id ? { ...row, ...changes } : row)
    return { ...inMemoryMaterials.find(row => row.id === id) }
  },

  async deleteStudyMaterial(id) {
    await sleep(200)
    const exists = inMemoryMaterials.some(row => row.id === id)
    if (!exists) throw new Error('This material is no longer available.')
    inMemoryMaterials = inMemoryMaterials.filter(row => row.id !== id)
    return { success: true }
  },

  // --- Leave ---
  async getLeaveData() {
    await sleep()
    return {
      balances: inMemoryLeaveBalances.map(row => ({ ...row })),
      history: [...inMemoryLeaves],
    }
  },

  async applyLeave(leaveRequest) {
    await sleep(400)
    const balanceIndex = inMemoryLeaveBalances.findIndex(row => row.type === leaveRequest.leaveType)
    if (balanceIndex < 0) throw new Error('Choose a valid leave category.')
    if (Number(leaveRequest.daysCount) > inMemoryLeaveBalances[balanceIndex].available) throw new Error('The requested duration exceeds the available leave balance.')
    const newLeave = {
      id: `leave-${Date.now()}`,
      ...leaveRequest,
      appliedOn: new Date().toISOString().split('T')[0],
      status: 'Pending',
      approvedBy: null,
      approvalRemarks: null,
    }
    inMemoryLeaveBalances = inMemoryLeaveBalances.map((row, index) => index === balanceIndex
      ? { ...row, available: row.available - Number(leaveRequest.daysCount), taken: row.taken + Number(leaveRequest.daysCount) }
      : row)
    inMemoryLeaves = [newLeave, ...inMemoryLeaves]
    return newLeave
  },

  async cancelLeave(id) {
    await sleep(250)
    const leave = inMemoryLeaves.find(row => row.id === id)
    if (!leave || leave.status !== 'Pending') throw new Error('Only pending leave requests can be cancelled.')
    inMemoryLeaves = inMemoryLeaves.filter(row => row.id !== id)
    inMemoryLeaveBalances = inMemoryLeaveBalances.map(row => row.type === leave.leaveType
      ? { ...row, available: row.available + Number(leave.daysCount), taken: row.taken - Number(leave.daysCount) }
      : row)
    return { success: true }
  },

  // --- Documents ---
  async getDocuments() {
    await sleep()
    return [...inMemoryDocuments]
  },

  async uploadDocument(document) {
    await sleep(300)
    const row = { id: `doc-${Date.now()}`, status: 'Active', uploadedOn: new Date().toISOString().slice(0, 10), ...document }
    inMemoryDocuments = [row, ...inMemoryDocuments]
    return row
  },

  // --- Meetings & Events ---
  async getMeetingsAndEvents() {
    await sleep()
    return {
      meetings: [...inMemoryMeetings],
      events: [...inMemoryEvents],
    }
  },

  async updateMeetingAttendance(id, myAttendance) {
    await sleep(200)
    inMemoryMeetings = inMemoryMeetings.map(row => row.id === id ? { ...row, myAttendance } : row)
    return { success: true }
  },

  async registerForEvent(id) {
    await sleep(200)
    const event = inMemoryEvents.find(row => row.id === id)
    if (!event) throw new Error('This event is no longer available.')
    inMemoryEvents = inMemoryEvents.map(row => row.id === id ? { ...row, registered: true, registrationsCount: row.registrationsCount + 1 } : row)
    return { success: true }
  },

  async updateMeetingMinutes(id, minutes) {
    await sleep(200)
    inMemoryMeetings = inMemoryMeetings.map(row => row.id === id ? { ...row, minutes } : row)
    return { success: true }
  },

  // --- Notifications ---
  async getNotifications() {
    await sleep()
    return [...inMemoryNotifications]
  },

  async markNotificationRead(id) {
    await sleep(150)
    inMemoryNotifications = inMemoryNotifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
    return { success: true }
  },

  async markAllNotificationsRead() {
    await sleep(150)
    inMemoryNotifications = inMemoryNotifications.map(n => ({ ...n, read: true }))
    return { success: true }
  },

  async sendAttendanceNotification(ids, message) {
    await sleep(200)
    if (!ids.length || !String(message || '').trim()) throw new Error('Choose students and enter a notification message.')
    return { success: true, sent: ids.length }
  },
}
