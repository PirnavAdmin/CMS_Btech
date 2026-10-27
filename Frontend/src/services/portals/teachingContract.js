export const unwrap = value => value?.data ?? value
export function rows(value) {
  const data = unwrap(value)
  if (Array.isArray(data)) return data
  for (const key of ['items', 'records', 'students', 'sessions', 'entries', 'exams']) if (Array.isArray(data?.[key])) return data[key]
  if (data?.data) return rows(data)
  throw new Error('The backend returned an unexpected list format. Please contact support.')
}
const id = value => String(value ?? '')
const same = (a, b) => id(a) === id(b)
const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0
const enabled = value => ![false, 0, '0', 'Inactive', 'inactive', 'false'].includes(value)
export function createTeachingService({ request, getProfile, collegeId, getIdentity = () => '' }) {
  let workspace, revision = 0
  const scoped = (path, params = {}) => {
    const query = new URLSearchParams(Object.entries({ ...params, collegeId: collegeId() }).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    return `${path}?${query}`
  }
  const get = (path, params) => request(scoped(path, params))
  const facultyTimetable = async facultyId => {
    try { return await get(`/api/v1/timetable-management/views/faculty/${facultyId}`) }
    catch (error) {
      if (error.status !== 404 && error.code !== 'NON_JSON_RESPONSE') throw error
      return get('/api/v1/timetables/view/faculty', { facultyId })
    }
  }
  const send = (path, method, body) => request(scoped(path), { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
  const assignment = allocationId => {
    const row = workspace?.assignments.find(a => same(a.id, allocationId))
    if (!row || !same(workspace.collegeId, collegeId()) || !same(workspace.identity, getIdentity())) throw new Error('Choose a subject assigned to your current faculty account.')
    return row
  }
  const roster = a => workspace.students.filter(s => same(s.sectionId, a.sectionId))
  return {
    async getSnapshot() {
      workspace = null
      const version = ++revision, identity = getIdentity()
      const college = collegeId()
      if (!positive(college)) throw new Error('Your login is missing a college mapping. Please contact your administrator.')
      const profile = await getProfile()
      let facultyId = profile.facultyId
      // The current shared profile DTO omits facultyId. Resolve only an exact
      // authenticated user/college mapping from a targeted employee search.
      if (!positive(facultyId) && positive(profile.id)) {
        const terms = [...new Set([profile.identifier, profile.email].filter(Boolean))]
        for (const search of terms) {
          const matches = rows(await get('/api/v1/faculty/search', { search, pageNumber: 1, pageSize: 100 })).filter(r => same(r.userId, profile.id) && same(r.collegeId, college))
          if (matches.length > 1) throw new Error('Multiple faculty records are linked to your account. Contact your administrator to correct the mapping.')
          if (matches.length === 1 && positive(matches[0].facultyId)) { facultyId = matches[0].facultyId; break }
        }
      }
      if (!positive(facultyId)) throw new Error('Your login profile is not linked to a faculty record. Ask your administrator to map your user account to your faculty ID.')
      const allocations = rows(await get('/api/v1/faculty-subject-allocations', { facultyId })).filter(r => same(r.facultyId, facultyId) && enabled(r.status) && (!r.collegeId || same(r.collegeId, college)))
      const assignments = allocations.filter(r => positive(r.sectionId) && positive(r.subjectId)).map(r => ({ ...r, id: id(r.allocationId ?? r.id), subjectName: r.subjectName || `Subject ${r.subjectId}`, sectionName: r.sectionName || `Section ${r.sectionId}` }))
      const warnings = []
      const sectionIds = [...new Set(assignments.map(r => id(r.sectionId)))]
      const subjectIds = [...new Set(assignments.map(r => id(r.subjectId)))]
      const requests = [facultyTimetable(facultyId), ...sectionIds.map(sectionId => get(`/api/v1/sections/${sectionId}/students`)), ...subjectIds.map(subjectId => get(`/api/v1/subjects/${subjectId}`))]
      const results = await Promise.allSettled(requests)
      const students = [], subjects = new Map()
      let timetable = [], timetableError = ''
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          const message = `${i === 0 ? 'Timetable' : i <= sectionIds.length ? `Students in section ${sectionIds[i - 1]}` : `Subject ${subjectIds[i - sectionIds.length - 1]}`}: ${result.reason.message}`
          warnings.push(message)
          if (!i) timetableError = message
          return
        }
        try {
          if (i === 0) timetable = rows(result.value).filter(r => same(r.facultyId, facultyId) && (!r.collegeId || same(r.collegeId, college)))
          else if (i <= sectionIds.length) {
            const sectionId = sectionIds[i - 1]
            rows(result.value).filter(r => (!r.sectionId || same(r.sectionId, sectionId)) && (!r.collegeId || same(r.collegeId, college))).forEach(r => students.push({ ...r, id: id(r.studentId ?? r.id), sectionId, name: r.fullName || r.studentName || r.name || 'Name unavailable', rollNumber: r.rollNumber || r.studentCode || 'Not assigned', sectionName: assignments.find(a => same(a.sectionId, sectionId))?.sectionName }))
          } else subjects.set(subjectIds[i - sectionIds.length - 1], unwrap(result.value))
        } catch (error) { warnings.push(`${i === 0 ? 'Timetable' : i <= sectionIds.length ? 'Students' : 'Subject'}: ${error.message}`); if (!i) timetableError = error.message }
      })
      assignments.forEach(a => { const subject = subjects.get(id(a.subjectId)); if (subject) Object.assign(a, { subjectName: subject.subjectName || subject.name || a.subjectName, subjectCode: subject.subjectCode || subject.code || '', credits: subject.credits, subjectType: subject.subjectType || subject.type }) })
      if (!same(college, collegeId()) || !same(identity, getIdentity()) || version !== revision) throw new Error('Account context changed. Reload your workspace.')
      workspace = { me: profile, facultyId, collegeId: college, identity, assignments, students: [...new Map(students.filter(s => positive(s.id)).map(s => [`${s.id}:${s.sectionId}`, s])).values()], timetable, timetableError, warnings, mode: 'live' }
      return workspace
    },
    async getSessions(allocationId, date) {
      const a = assignment(allocationId)
      return rows(await get('/api/v1/student-attendance/sessions', { facultyId: workspace.facultyId, sectionId: a.sectionId, subjectId: a.subjectId, academicYearId: a.academicYearId, fromDate: date, toDate: date })).filter(r => same(r.facultyId, workspace.facultyId) && same(r.sectionId, a.sectionId) && same(r.subjectId, a.subjectId))
    },
    async getSessionRoster(allocationId, date, sessionId) {
      assignment(allocationId)
      const sessions = await this.getSessions(allocationId, date)
      if (!sessions.some(row => same(row.attendanceSessionId, sessionId))) throw new Error('Select an attendance session belonging to your assigned class.')
      const response = unwrap(await get(`/api/v1/student-attendance/sessions/${sessionId}/students`))
      if (!same(response.attendanceSessionId, sessionId)) throw new Error('The server returned a different attendance session. Please retry.')
      return { ...response, students: rows(response.students) }
    },
    async getSessionHistory(allocationId) {
      const a = assignment(allocationId), end = new Date(), start = new Date(end)
      start.setDate(start.getDate() - 29)
      const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return rows(await get('/api/v1/student-attendance/sessions', { facultyId: workspace.facultyId, sectionId: a.sectionId, subjectId: a.subjectId, academicYearId: a.academicYearId, fromDate: key(start), toDate: key(end) })).filter(row => same(row.facultyId, workspace.facultyId) && same(row.sectionId, a.sectionId) && same(row.subjectId, a.subjectId))
    },
    async saveAttendance({ allocationId, date, records, sessionId }) {
      const a = assignment(allocationId), students = roster(a)
      const today = new Date(); today.setHours(23, 59, 59, 999)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || new Date(date) > today) throw new Error('Select a valid attendance date, today or earlier.')
      if (!students.length || records.length !== students.length || new Set(records.map(r => id(r.studentId))).size !== students.length || records.some(r => !students.some(s => same(s.id, r.studentId)) || !['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].includes(r.attendanceStatus))) throw new Error('Mark attendance for every student in the assigned section.')
      const sessions = await this.getSessions(allocationId, date)
      if (sessionId && !sessions.some(s => same(s.attendanceSessionId, sessionId) && s.sessionStatus === 'OPEN')) throw new Error('This session is no longer open. Reload attendance.')
      if (!sessionId) {
        if (sessions.length) {
          if (sessions.length !== 1 || sessions[0].sessionStatus !== 'OPEN') throw new Error('A session already exists for this date. Open the existing session to continue.')
          // Resume a session created by a previous attempt whose marking failed.
          sessionId = sessions[0].attendanceSessionId
        } else {
          const created = unwrap(await send('/api/v1/student-attendance/sessions', 'POST', { academicYearId: Number(a.academicYearId), semesterId: Number(a.semesterId), sectionId: Number(a.sectionId), subjectId: Number(a.subjectId), facultyId: Number(workspace.facultyId), attendanceDate: date }))
          sessionId = created.attendanceSessionId
        }
      }
      if (!positive(sessionId)) throw new Error('The backend did not return a valid attendance session ID.')
      return send(`/api/v1/student-attendance/sessions/${sessionId}/mark`, 'PUT', { students: records, markUnlistedAsAbsent: false, completeSession: true })
    },
    async getExams(allocationId) { const a = assignment(allocationId); return rows(await get('/api/v1/exams', { academicYearId: a.academicYearId, semesterId: a.semesterId, branchId: a.branchId })).filter(r => ['academicYearId', 'semesterId', 'branchId'].every(key => !r[key] || !a[key] || same(r[key], a[key]))) },
    async getMarks(allocationId, examId) { const a = assignment(allocationId); if (!positive(examId)) return []; return rows(await get('/api/v1/marks', { examId, sectionId: a.sectionId, subjectId: a.subjectId })).filter(r => same(r.subjectId, a.subjectId) && (!r.sectionId || same(r.sectionId, a.sectionId)) && roster(a).some(s => same(s.id, r.studentId))) },
    async saveMark({ allocationId, examId, studentId, marksObtained, maxMarks }) {
      const a = assignment(allocationId)
      if (!positive(examId) || !roster(a).some(s => same(s.id, studentId))) throw new Error('Select a valid examination and assigned student.')
      if (marksObtained === '' || maxMarks === '' || !Number.isFinite(Number(marksObtained)) || !Number.isFinite(Number(maxMarks)) || Number(maxMarks) <= 0 || Number(marksObtained) < 0 || Number(marksObtained) > Number(maxMarks)) throw new Error('Marks must be between zero and the maximum marks.')
      return send('/api/v1/marks', 'POST', { examId: Number(examId), subjectId: Number(a.subjectId), sectionId: Number(a.sectionId), studentId: Number(studentId), marksObtained: Number(marksObtained), maxMarks: Number(maxMarks) })
    },
    async leaveOptions() {
      const [types, policies] = await Promise.all([get('/api/v1/faculty-leave/types'), get('/api/v1/faculty-leave/policies', { status: 'Active' })])
      return { types: rows(types).filter(r => enabled(r.status) && String(r.status).toLowerCase() !== 'inactive'), policies: rows(policies).filter(r => ['teaching', 'both'].includes(String(r.applicableTo).toLowerCase())) }
    },
    async requestLeave(form) {
      if (!workspace || !same(workspace.collegeId, collegeId()) || !same(workspace.identity, getIdentity())) throw new Error('Reload your faculty workspace.')
      const from = new Date(`${form.from}T00:00:00Z`), to = new Date(`${form.to}T00:00:00Z`)
      if (!Number.isFinite(+from) || !Number.isFinite(+to) || to < from || String(form.reason || '').trim().length < 10) throw new Error('Choose a valid leave period and enter a reason of at least 10 characters.')
      const options = await this.leaveOptions()
      if (!options.types.some(r => same(r.id ?? r.leaveTypeId, form.typeId)) || !options.policies.some(r => same(r.id ?? r.policyId, form.policyId) && String(r.from).slice(0, 10) <= form.from && String(r.to).slice(0, 10) >= form.to)) throw new Error('Choose an active leave type and a policy covering the requested dates.')
      return send('/api/v1/faculty-leave/requests', 'POST', { facultyId: Number(workspace.facultyId), policyId: form.policyId, leaveTypeId: form.typeId, fromDate: form.from, toDate: form.to, days: Math.round((to - from) / 86400000) + 1, reason: form.reason.trim() })
    },
  }
}
