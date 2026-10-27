import { createPortalFixtures, emptyPortalWorkspace } from '../../mocks/portals.js'

const copy = value => structuredClone(value)
const required = (value, message) => { if (!value) throw new Error(message) }
const clean = value => String(value ?? '').trim()
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
const uid = () => globalThis.crypto.randomUUID()

// Dependency injection keeps storage/auth out of the UI and makes the contract testable.
// Nothing here sends HTTP, creates real accounts, or stores passwords.
export function createMockPortalService({ storage, actor, collegeId, preview = false }) {
  required(collegeId, 'Select a college before opening the mock workspace.')
  const key = `cms-portal-mock:v1:${encodeURIComponent(collegeId)}`
  const read = () => {
    const raw = storage.getItem(key)
    if (!raw) return preview ? createPortalFixtures() : emptyPortalWorkspace()
    const data = JSON.parse(raw)
    // Upgrade the previous sample schema without resetting any saved accounts or submissions.
    const samples = createPortalFixtures()
    if (!data.courses && data.sections?.some(row => samples.sections.some(sample => sample.id === row.id))) {
      for (const field of ['courses', 'branches', 'academicLevels']) data[field] = samples[field]
      data.sections = data.sections.map(row => ({ ...samples.sections.find(sample => sample.id === row.id), ...row }))
    }
    for (const field of ['courses', 'branches', 'academicLevels']) data[field] ||= []
    required(Object.keys(emptyPortalWorkspace()).every(field => Array.isArray(data[field])), 'Mock workspace is invalid. It has not been reset.')
    return data
  }
  const authorize = (...roles) => {
    required(actor.id, 'Your account needs a user identity before opening this workspace.')
    required(roles.includes(actor.role), 'This action is unavailable for your role.')
    const account = read().users.find(user => user.id === actor.id)
    required(!account || (account.status === 'active' && account.role === actor.role), 'This mock account is inactive or its role changed. Sign in again.')
  }
  const write = action => {
    const data = read(), result = action(data)
    storage.setItem(key, JSON.stringify(data))
    return copy(result)
  }
  const self = data => data.users.find(user => user.id === actor.id) || { status: 'active', departmentId: '', phone: '', ...actor }
  const assignmentsFor = data => actor.role === 'faculty' ? data.assignments.filter(row => row.facultyId === actor.id) : data.assignments.filter(row => row.sectionId === self(data).sectionId)
  const assignmentForFaculty = (data, id) => {
    const assignment = data.assignments.find(row => row.id === id && row.facultyId === actor.id)
    required(assignment, 'Choose a subject and section assigned to your account.')
    return assignment
  }
  const studentsFor = (data, assignment) => data.users.filter(row => row.role === 'student' && row.status === 'active' && row.sectionId === assignment.sectionId)
  const currentDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const decorate = (data, row) => ({ ...row, subject: data.subjects.find(item => item.id === row.subjectId), section: data.sections.find(item => item.id === row.sectionId), faculty: data.users.find(item => item.id === row.facultyId) })
  const getSnapshot = async () => {
    authorize('admin', 'faculty', 'student')
    const data = read(), me = self(data)
    if (actor.role === 'admin') return copy({ ...data, me, collegeId, mode: 'mock' })
    const assignments = assignmentsFor(data), ids = new Set(assignments.map(row => row.id))
    const attendance = data.attendance.filter(row => ids.has(row.assignmentId)).map(row => ({ ...row, records: row.records.filter(record => actor.role === 'faculty' || record.studentId === actor.id) }))
    const results = data.results.filter(row => ids.has(row.assignmentId) && (actor.role === 'faculty' || row.published)).map(row => ({ ...row, records: row.records.filter(record => actor.role === 'faculty' || record.studentId === actor.id) }))
    return copy({ me, collegeId, mode: 'mock', departments: data.departments, sections: data.sections.filter(row => assignments.some(item => item.sectionId === row.id)), assignments: assignments.map(row => decorate(data, row)), subjects: data.subjects.filter(row => assignments.some(item => item.subjectId === row.id)), students: actor.role === 'faculty' ? data.users.filter(row => row.role === 'student' && assignments.some(item => item.sectionId === row.sectionId)) : [], attendance, results, timetable: data.timetable.filter(row => ids.has(row.assignmentId)), materials: data.materials.filter(row => ids.has(row.assignmentId)), leaves: data.leaves.filter(row => actor.role === 'faculty' && row.facultyId === actor.id), notifications: data.notifications.filter(row => row.roles.includes(actor.role)), fees: data.fees.filter(row => actor.role === 'student' && row.studentId === actor.id) })
  }
  return {
    getSnapshot,
    async createUser(input) {
      authorize('admin')
      return write(data => {
        const user = { id: uid(), name: clean(input.name), email: clean(input.email).toLowerCase(), departmentId: clean(input.departmentId), role: input.role, sectionId: clean(input.sectionId), phone: '', status: 'active' }
        required(user.name.length >= 2 && user.name.length <= 100, 'Name must contain 2–100 characters.')
        required(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email), 'Enter a valid email address.')
        required(!data.users.some(row => row.email.toLowerCase() === user.email), 'An account with this email already exists.')
        required(['faculty', 'student'].includes(user.role), 'Choose Faculty or Student.')
        required(data.departments.some(row => row.id === user.departmentId), 'Choose a valid department.')
        if (user.role === 'student') {
          required(data.courses.some(row => row.id === input.courseId), 'Choose a valid course.')
          required(data.branches.some(row => row.id === input.branchId && row.courseId === input.courseId && row.departmentId === user.departmentId), 'Choose a branch in the selected course and department.')
          required(data.academicLevels.some(row => row.id === input.academicLevelId && row.courseId === input.courseId), 'Choose a valid academic level for this course.')
          const section = data.sections.find(row => row.id === user.sectionId && row.departmentId === user.departmentId && row.courseId === input.courseId && row.branchId === input.branchId && row.academicLevelId === input.academicLevelId)
          required(section, 'Choose a section matching the selected department, course, branch and academic level.')
          Object.assign(user, { courseId: input.courseId, branchId: input.branchId, academicLevelId: input.academicLevelId })
        }
        else user.sectionId = ''
        data.users.push(user)
        return user
      })
    },
    async updateUser(userId, input) {
      authorize('admin')
      return write(data => {
        const user = data.users.find(row => row.id === userId)
        required(user && user.role !== 'admin' && user.id !== actor.id, 'Administrator accounts cannot be modified here.')
        const name = clean(input.name), email = clean(input.email).toLowerCase(), phone = clean(input.phone)
        required(name.length >= 2 && name.length <= 100, 'Name must contain 2–100 characters.')
        required(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address.')
        required(!data.users.some(row => row.id !== userId && row.email.toLowerCase() === email), 'An account with this email already exists.')
        required(!phone || /^[6-9]\d{9}$/.test(phone), 'Enter a valid 10-digit Indian mobile number.')
        Object.assign(user, { name, email, phone })
        return user
      })
    },
    async assignRole(userId, role, sectionId = '') {
      authorize('admin')
      return write(data => {
        const user = data.users.find(row => row.id === userId)
        required(user && user.role !== 'admin' && user.id !== actor.id, 'Administrator accounts cannot be modified here.')
        required(['faculty', 'student'].includes(role), 'Choose Faculty or Student.')
        if (role === 'student') required(data.sections.some(row => row.id === sectionId && row.departmentId === user.departmentId), 'Choose a section in this department.')
        if (user.role !== role) required(!data.assignments.some(row => row.facultyId === userId), 'Remove unused teaching assignments before changing this faculty role. Academic history must be preserved.')
        Object.assign(user, { role, sectionId: role === 'student' ? sectionId : '' })
        const section = data.sections.find(row => row.id === user.sectionId)
        for (const field of ['courseId', 'branchId', 'academicLevelId']) user[field] = role === 'student' ? section[field] : ''
        return user
      })
    },
    async updateUserStatus(userId, status) {
      authorize('admin')
      return write(data => {
        const user = data.users.find(row => row.id === userId)
        required(user && user.role !== 'admin' && user.id !== actor.id, 'Administrator accounts cannot be modified here.')
        required(['active', 'inactive'].includes(status), 'Choose a valid account status.')
        user.status = status
        return user
      })
    },
    async resetPassword(userId) {
      authorize('admin')
      return write(data => {
        const user = data.users.find(row => row.id === userId && row.role !== 'admin')
        required(user, 'Choose a faculty or student account.')
        user.resetRequestedAt = new Date().toISOString()
        return { userId, mode: 'mock', delivery: 'simulated', requestedAt: user.resetRequestedAt }
      })
    },
    async assignFaculty({ facultyId, subjectId, sectionId }) {
      authorize('admin')
      return write(data => {
        const faculty = data.users.find(row => row.id === facultyId && row.role === 'faculty' && row.status === 'active')
        required(faculty, 'Choose an active faculty account.')
        required(data.subjects.some(row => row.id === subjectId && row.departmentId === faculty.departmentId), 'Choose a subject in the faculty department.')
        required(data.sections.some(row => row.id === sectionId && row.departmentId === faculty.departmentId), 'Choose a section in the faculty department.')
        required(!data.assignments.some(row => row.facultyId === facultyId && row.subjectId === subjectId && row.sectionId === sectionId), 'This assignment already exists.')
        const assignment = { id: uid(), facultyId, subjectId, sectionId }
        data.assignments.push(assignment)
        return assignment
      })
    },
    async removeAssignment(id) {
      authorize('admin')
      return write(data => {
        required(data.assignments.some(row => row.id === id), 'Assignment not found.')
        required(![...data.attendance, ...data.results, ...data.materials, ...data.timetable].some(row => row.assignmentId === id), 'This assignment has academic records and cannot be removed.')
        data.assignments = data.assignments.filter(row => row.id !== id)
        return { id }
      })
    },
    async submitAttendance({ assignmentId, date, records }) {
      authorize('faculty')
      return write(data => {
        const assignment = assignmentForFaculty(data, assignmentId), students = studentsFor(data, assignment)
        required(validDate(date) && date <= currentDate(), 'Choose a valid attendance date that is not in the future.')
        required(students.length && records.length === students.length && new Set(records.map(row => row.studentId)).size === students.length && students.every(student => records.some(row => row.studentId === student.id && ['present', 'absent', 'late'].includes(row.status))), 'Mark attendance for every assigned student.')
        required(!data.attendance.some(row => row.assignmentId === assignmentId && row.date === date), 'Attendance for this subject, section and date was already submitted.')
        const session = { id: uid(), assignmentId, date, records: copy(records) }
        data.attendance.push(session)
        return session
      })
    },
    async submitMarks({ assignmentId, assessment, maxMarks, records }) {
      authorize('faculty')
      return write(data => {
        const assignment = assignmentForFaculty(data, assignmentId), students = studentsFor(data, assignment)
        required(clean(assessment).length >= 2 && clean(assessment).length <= 80, 'Enter an assessment name of 2–80 characters.')
        required(Number.isFinite(Number(maxMarks)) && Number(maxMarks) > 0 && Number(maxMarks) <= 1000, 'Maximum marks must be between 1 and 1000.')
        required(students.length && records.length === students.length && new Set(records.map(row => row.studentId)).size === students.length && students.every(student => records.some(row => row.studentId === student.id && row.marks !== '' && row.marks != null && Number.isFinite(Number(row.marks)) && Number(row.marks) >= 0 && Number(row.marks) <= Number(maxMarks))), 'Enter valid marks for every student, from zero to the maximum.')
        required(!data.results.some(row => row.assignmentId === assignmentId && row.assessment.toLowerCase() === clean(assessment).toLowerCase()), 'This assessment already has marks. Choose a different assessment name.')
        const result = { id: uid(), assignmentId, assessment: clean(assessment), maxMarks: Number(maxMarks), published: false, records: records.map(row => ({ studentId: row.studentId, marks: Number(row.marks) })) }
        data.results.push(result)
        return result
      })
    },
    async addMaterial({ assignmentId, title, description, content, fileName }) {
      authorize('faculty')
      return write(data => {
        assignmentForFaculty(data, assignmentId)
        required(clean(title).length >= 2 && clean(title).length <= 120, 'Enter a material title of 2–120 characters.')
        required(clean(content) && content.length <= 200000, 'Add study text or a text file up to 200 KB.')
        const material = { id: uid(), assignmentId, title: clean(title), description: clean(description).slice(0, 1000), content, fileName: clean(fileName).replace(/[^a-zA-Z0-9._-]/g, '_') || 'study-notes.txt', createdAt: new Date().toISOString() }
        data.materials.push(material)
        return material
      })
    },
    async removeMaterial(id) {
      authorize('faculty')
      return write(data => {
        const material = data.materials.find(row => row.id === id)
        required(material, 'Material not found.')
        assignmentForFaculty(data, material.assignmentId)
        data.materials = data.materials.filter(row => row.id !== id)
        return { id }
      })
    },
    async requestLeave(input) {
      authorize('faculty')
      return write(data => {
        required(validDate(input.from) && validDate(input.to) && input.from >= currentDate() && input.to >= input.from, 'Choose valid leave dates starting today or later.')
        required(['Casual', 'Medical', 'Earned'].includes(input.type), 'Choose a valid leave type.')
        required(clean(input.reason).length >= 10 && clean(input.reason).length <= 500, 'Leave reason must contain 10–500 characters.')
        required(!data.leaves.some(row => row.facultyId === actor.id && row.status !== 'cancelled' && input.from <= row.to && input.to >= row.from), 'These dates overlap an existing leave request.')
        const leave = { id: uid(), facultyId: actor.id, from: input.from, to: input.to, type: input.type, reason: clean(input.reason), status: 'pending' }
        data.leaves.push(leave)
        return leave
      })
    },
    async cancelLeave(id) {
      authorize('faculty')
      return write(data => {
        const leave = data.leaves.find(row => row.id === id && row.facultyId === actor.id && row.status === 'pending')
        required(leave, 'Only your pending leave requests can be cancelled.')
        leave.status = 'cancelled'
        return leave
      })
    },
    async markNotificationRead(id) {
      authorize('faculty', 'student')
      return write(data => {
        const notification = data.notifications.find(row => row.id === id && row.roles.includes(actor.role))
        required(notification, 'Notification not found.')
        if (!notification.readBy.includes(actor.id)) notification.readBy.push(actor.id)
        return notification
      })
    },
    async updateProfile(input) {
      authorize('faculty', 'student')
      return write(data => {
        const user = self(data), phone = clean(input.phone)
        required(!phone || /^[6-9]\d{9}$/.test(phone), 'Enter a valid 10-digit Indian mobile number.')
        user.phone = phone
        if (!data.users.some(row => row.id === user.id)) data.users.push(user)
        return user
      })
    },
    async loadSamples() {
      authorize('admin')
      const data = read()
      required(!data.users.length && !data.assignments.length, 'Samples can only be loaded into an empty mock workspace.')
      const fixtures = createPortalFixtures()
      storage.setItem(key, JSON.stringify(fixtures))
      return { mode: 'mock' }
    },
  }
}
