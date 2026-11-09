import { API_BASE_URL, authenticatedRequest, studentProfileApi } from '../api/apiEndpoints'
import { getUserCollegeId, getUserRole } from '../auth/auth'

export const unwrap = body => body?.data ?? body
export function record(row) {
  const result = Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), value]))
  return result.data && !Array.isArray(result.data) && typeof result.data === 'object'
    ? { ...result.data, ...result, data: undefined } : result
}
export function rows(body) {
  const value = unwrap(body)
  const list = Array.isArray(value) ? value : value?.items ?? value?.records ?? value?.rows ?? value?.results ?? value?.data
  if (!Array.isArray(list)) throw new Error('The server returned an unexpected list. Please refresh.')
  return list.map(record)
}
export function scoped(row, scope) {
  return (!scope.collegeId || String(row.collegeId) === String(scope.collegeId)) &&
    (!scope.academicYearId || String(row.academicYearId) === String(scope.academicYearId))
}
export function requireId(value, label = 'Record') {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) throw new Error(`Select a valid ${label}.`)
  return Number(value)
}
export async function call(path, { method = 'GET', body, query = {}, signal } = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== '' && value != null))
  try {
    return await authenticatedRequest(`${API_BASE_URL}/api/v1/${path}${params.size ? `?${params}` : ''}`, {
      method, signal, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    })
  } catch (error) {
    error.requestPath = `/api/v1/${path}`
    throw error
  }
}

// Independent collections have independent permissions. A denied related lookup
// must not discard an otherwise successful screen response.
export async function readModuleResources(resources) {
  const entries = Object.entries(resources)
  const settled = await Promise.allSettled(entries.map(([,load]) => load()))
  const values = {}, resourceErrors = {}
  settled.forEach((result,index) => {
    const key = entries[index][0]
    if (result.status === 'fulfilled') values[key] = result.value
    else {
      values[key] = []
      resourceErrors[key] = {message:result.reason?.message || 'Unable to load records.',status:result.reason?.status || 0,path:result.reason?.requestPath || ''}
    }
  })
  return {values,resourceErrors}
}
export async function list(path, query = {}) {
  const all = [], size = 100
  let firstBatch
  for (let page = 1; page <= 1000; page++) {
    const body = await call(path, { query: { ...query, page, pageSize: size } })
    const batch = rows(body)
    if (page > 1 && JSON.stringify(batch) === firstBatch) return all
    if (page === 1) firstBatch = JSON.stringify(batch)
    all.push(...batch)
    const pages = body?.totalPages ?? body?.data?.totalPages
    const total = body?.totalCount ?? body?.data?.totalCount
    if ((pages != null && page >= pages) || (total != null && all.length >= total) || batch.length < size) return all
    // Several unpaginated endpoints ignore page. Never repeat their records.
  }
  throw new Error('Too many records. Narrow the selection and retry.')
}
export const dateOnly = value => String(value || '').slice(0, 10)
const dateTime = value => value ? String(value).replace(' ', 'T') : null
export const statusLabel = value => String(value || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
export const statusCode = value => String(value || '').trim().replace(/\s+/g, '_').toUpperCase()

export async function loadLibrary(scope) {
  requireId(scope.collegeId, 'college')
  const {values:{books,issues,fines,categories,students},resourceErrors} = await readModuleResources({
    books:()=>list('library/books', {collegeId:scope.collegeId}), issues:()=>list('library/issues', {collegeId:scope.collegeId}), fines:()=>list('library/fines', {collegeId:scope.collegeId}), categories:()=>list('library/categories', {collegeId:scope.collegeId}), students:()=>list('students', {collegeId:scope.collegeId}),
  })
  const borrowers = students.filter(s => String(s.collegeId) === String(scope.collegeId)).map(s => ({ ...s, id: String(s.studentId ?? s.id), code: s.rollNumber || s.admissionNumber || String(s.studentId ?? s.id), name: s.studentName || s.fullName || s.name, type: 'Student', status: 'Active', activeLoans: issues.filter(i => String(i.studentId) === String(s.studentId ?? s.id) && i.status !== 'RETURNED').length }))
  return {
    resourceErrors,
    categories,
    books: books.map(b => ({ ...b, id: String(b.bookId), category: b.categoryName, rack: b.shelfLocation || '', availableCopies: Number(b.availableCopies), issuedCopies: Number(b.totalCopies) - Number(b.availableCopies), coverColor: '#1e3a8a', accentColor: '#3b82f6' })),
    copies: [], reservations: [], reports: [], borrowers,
    circulation: issues.map(i => ({ ...i, id: String(i.issueId), borrowerId: String(i.studentId), borrowerName: borrowers.find(b => b.id === String(i.studentId))?.name || `Student ${i.studentId}`, borrowerType: 'Student', bookTitle: i.title, accession: i.accessionNo, issueDate: dateOnly(i.issueDate), dueDate: dateOnly(i.dueDate), status: ({ ISSUED: 'Active', OVERDUE: 'Overdue', RETURNED: 'Returned' })[i.effectiveStatus || i.status] || i.status, fineAccrued: fines.filter(f => String(f.issueId) === String(i.issueId)).reduce((sum, f) => sum + Number(f.balance || 0), 0) })),
    fines: fines.map(f => { const issue = issues.find(i => String(i.issueId) === String(f.issueId)); const paymentStatus = ({ PAID: 'Paid', UNPAID: 'Pending', PARTIALLY_PAID: 'Pending', WAIVED: 'Waived' })[f.status] || f.status; return { ...f, id: String(f.fineId), borrowerName: borrowers.find(b => b.id === String(f.studentId))?.name || `Student ${f.studentId}`, borrowerId: String(f.studentId), accession: issue?.accessionNo || '', bookTitle: issue?.title || '', overdueDays: issue?.overdueDays || 0, calculatedOn: dateOnly(f.assessedDate), amount: Number(f.fineAmount), paidAmount: Number(f.paidAmount), paymentStatus, status: paymentStatus } }),
  }
}
export async function saveBook(form, old, scope, categories) {
  const category = categories.find(c => c.categoryName === form.category || String(c.categoryId) === String(form.categoryId))
  const body = { ...old, ...form, collegeId: requireId(scope.collegeId, 'college'), categoryId: requireId(category?.categoryId, 'library category'), accessionNo: form.accessionNo || old?.accessionNo, language: form.language || old?.language || 'English', shelfLocation: form.rack, totalCopies: Number(form.totalCopies), status: old?.status !== false && old?.status !== 0 }
  if (!body.accessionNo) throw new Error('Accession number is required.')
  await call(`library/books${old ? `/${requireId(old.id)}` : ''}`, { method: old ? 'PUT' : 'POST', body })
}

export async function loadMeetingsEvents(scope) {
  requireId(scope.collegeId, 'college')
  const {values:{meetings:meetingRows,events:eventRows},resourceErrors} = await readModuleResources({meetings:()=>list('meetings',{collegeId:scope.collegeId}),events:()=>list('events',{collegeId:scope.collegeId})})
  const meetings = meetingRows.filter(m => String(m.collegeId) === String(scope.collegeId)).map(m => ({ ...m, id: String(m.meetingId), status: statusLabel(m.status), start: `${dateOnly(m.meetingDate)}T${m.startTime || '00:00:00'}`, end: `${dateOnly(m.meetingDate)}T${m.endTime || m.startTime || '00:00:00'}`, category: m.meetingType || '', organizer: m.organizerName || '', agenda: m.description || '' }))
  const events = eventRows.filter(e => !scope.academicYearId || String(e.academicYearId) === String(scope.academicYearId)).map(e => ({ ...e, id: String(e.eventId), title: e.eventName, start: dateTime(e.startAt), end: dateTime(e.endAt), category: e.eventType, capacity: e.maxParticipants, deadline: dateTime(e.registrationClosesAt), registeredCount: e.registrationCount || 0 }))
  const nested = await readModuleResources({
    registrations:()=>Promise.all(events.map(async e => (await list(`events/${e.id}/registrations`, {collegeId:scope.collegeId})).map(r => ({ ...r, id: `event-${e.id}-${r.registrationId}`, apiId: r.registrationId, eventId: e.id, eventTitle: e.title, studentName: r.participantName || r.studentName, registeredAt: r.registeredAt, status: statusLabel(r.registrationStatus || r.status) })))),
    attendance:()=>Promise.all(meetings.map(async m => (await list(`meetings/${m.id}/attendance`, {collegeId:scope.collegeId})).map(a => ({ ...a, id: `meeting-${m.id}-${a.attendanceId}`, apiId: a.attendanceId, meetingId: m.id, title: m.title, studentName: a.userName || a.participantName || a.fullName, status: statusLabel(a.attendanceStatus), checkInTime: a.checkInAt || '—' })))),
    minutes:()=>Promise.all(meetings.map(async m => (await list(`meetings/${m.id}/minutes`, {collegeId:scope.collegeId})).map(n => ({ ...n, id: `meeting-${m.id}-${n.minutesId}`, apiId: n.minutesId, meetingId: m.id, meetingTitle: m.title, title: n.minutesTitle, minutes: n.minutesText, actionItem: n.minutesText, status: n.approvalStatus })))),
  })
  if (resourceErrors.events) nested.resourceErrors.registrations = resourceErrors.events
  if (resourceErrors.meetings) { nested.resourceErrors.attendance = resourceErrors.meetings; nested.resourceErrors.minutes = resourceErrors.meetings }
  return { meetings, events, registrations: nested.values.registrations.flat(), attendance: nested.values.attendance.flat(), minutes: nested.values.minutes.flat(), resourceErrors:{...resourceErrors,...nested.resourceErrors} }
}
export async function saveMeetingEvent(type, form, old, scope) {
  const assignedCollege = getUserCollegeId()
  if (type === 'meeting' && assignedCollege && String(assignedCollege) !== String(scope.collegeId)) throw new Error('Select your signed-in college before saving a meeting.')
  const query = { collegeId: requireId(scope.collegeId, 'college') }
  let path, body, method = old ? 'PUT' : 'POST'
  if (type === 'meeting') {
    if (dateOnly(form.start) !== dateOnly(form.end)) throw new Error('Meetings must start and end on the same date.')
    path = `meetings${old ? `/${requireId(old.meetingId || old.id)}` : ''}`
    body = { meetingCode: old?.meetingCode || `MTG-${Date.now()}`, title: form.title, meetingType: form.category, description: form.agenda || form.description, meetingDate: dateOnly(form.start), startTime: `${form.start.slice(11, 16)}:00`, endTime: `${form.end.slice(11, 16)}:00`, venue: form.venue, organizerId: old?.organizerId || null, status: ({ Upcoming: 'SCHEDULED', 'In Progress': 'ONGOING' })[form.status] || statusCode(form.status || 'Scheduled') }
  } else if (type === 'event') {
    path = `events${old ? `/${requireId(old.eventId || old.id)}` : ''}`
    body = { collegeId: query.collegeId, academicYearId: requireId(scope.academicYearId, 'academic year'), eventCode: old?.eventCode || `EVT-${Date.now()}`, eventName: form.title, eventType: form.category, startAt: dateTime(form.start), endAt: dateTime(form.end), venue: form.venue, description: form.description, maxParticipants: Number(form.capacity) || null, registrationClosesAt: dateTime(form.deadline), registrationFee: Number(form.registrationFee) || 0, certificateEnabled: Boolean(form.certificateEnabled), status: form.status === 'Upcoming' ? 'PUBLISHED' : form.status || 'Draft' }
  } else if (type === 'registration') {
    path = `events/${requireId(form.eventId, 'event')}/registrations${old ? `/${requireId(old.apiId)}/status` : ''}`
    method = old ? 'PATCH' : 'POST'
    body = old ? { status: form.status } : { participantType: 'STUDENT', studentId: requireId(form.studentId, 'student'), participantName: form.studentName, email: form.email || null, mobile: form.phone || null }
  } else if (type === 'minute') {
    path = `meetings/${requireId(form.meetingId, 'meeting')}/minutes${old ? `/${requireId(old.apiId)}` : ''}`
    body = { minutesTitle: form.title || form.meetingTitle, minutesText: form.minutes || form.actionItem, approvalStatus: statusCode(form.approvalStatus || 'Draft') }
  } else throw new Error('This action is not supported by the matching API.')
  await call(path, { method, body, query })
}

export async function loadPlacements(scope) {
  requireId(scope.collegeId, 'college')
  const {values:{companies,drives,applications,interviews,offers,students},resourceErrors} = await readModuleResources({...Object.fromEntries(['companies','drives','applications','interviews'].map(key=>[key,()=>list(`placements/${key}`,{collegeId:scope.collegeId})])),offers:()=>list('placements/selections',{collegeId:scope.collegeId}),students:()=>list('students',{collegeId:scope.collegeId})})
  const scopedCompanies = companies.filter(c => String(c.collegeId) === String(scope.collegeId))
  const scopedDrives = drives.filter(d => String(d.collegeId) === String(scope.collegeId) && (!scope.academicYearId || String(d.academicYearId) === String(scope.academicYearId)))
  const driveIds = new Set(scopedDrives.map(d => String(d.driveId)))
  const appRows = applications.filter(a => driveIds.has(String(a.driveId)))
  const appIds = new Set(appRows.map(a => String(a.applicationId)))
  if (resourceErrors.drives) resourceErrors.applications = resourceErrors.drives
  if (resourceErrors.applications) { resourceErrors.interviews = resourceErrors.applications; resourceErrors.offers = resourceErrors.applications }
  const enrich = row => { const application = appRows.find(a => String(a.applicationId) === String(row.applicationId)) || row; const drive = scopedDrives.find(d => String(d.driveId) === String(application.driveId)); const student = students.find(s => String(s.studentId ?? s.id) === String(application.studentId)); return { studentName: student?.studentName || student?.fullName || student?.name || `Student ${application.studentId}`, rollNumber: student?.rollNumber || student?.admissionNumber || String(application.studentId), jobTitle: drive?.jobTitle || '', companyName: scopedCompanies.find(c => String(c.companyId) === String(drive?.companyId))?.companyName || '' } }
  const companyName = row => row.companyName || scopedCompanies.find(c => String(c.companyId) === String(row.companyId))?.companyName || enrich(row).companyName
  return {
    resourceErrors,
    companies: scopedCompanies.map(c => ({ ...c, id: String(c.companyId), name: c.companyName, contactEmail: c.email || '', contactPhone: c.phone || '', hq: c.address || '', status: c.status === 'Active' ? 'Active Partner' : c.status })),
    drives: scopedDrives.map(d => ({ ...d, id: String(d.driveId), status: statusLabel(d.driveStatus), eligibility: d.remarks || '', title: d.driveName, company: companyName(d), role: d.jobTitle, driveDate: dateOnly(d.driveStartAt), deadline: dateOnly(d.applicationCloseAt), ctcNum: Number(d.ctcMax || d.ctcMin || 0) / 100000, ctc: d.ctcMax ? `₹ ${(Number(d.ctcMax) / 100000).toFixed(1)} LPA` : '—', eligibleBranches: [], description: d.jobDescription || '', applicantsCount: d.applicationCount || 0, shortlistedCount: 0, selectedCount: d.selectionCount || 0 })),
    applications: appRows.map(a => ({ ...a, ...enrich(a), status: statusLabel(a.applicationStatus), id: String(a.applicationId), driveId: String(a.driveId), company: companyName(a), role: enrich(a).jobTitle, rollNo: enrich(a).rollNumber, appliedDate: dateOnly(a.appliedAt), resumeUrl: a.resumePath || '' })),
    interviews: interviews.filter(i => appIds.has(String(i.applicationId))).map(i => ({ ...i, ...enrich(i), id: String(i.interviewId), company: companyName(i), candidateName: enrich(i).studentName, rollNo: enrich(i).rollNumber, roundType: i.roundName, start: dateTime(i.scheduledAt), end: dateTime(i.scheduledAt), interviewer: i.interviewerName, meetLink: i.meetingUrl || '', status: i.interviewResult === 'PASSED' ? 'Cleared' : i.interviewResult === 'FAILED' ? 'Eliminated' : statusLabel(i.interviewStatus) })),
    offers: offers.filter(o => appIds.has(String(o.applicationId))).map(o => ({ ...o, ...enrich(o), id: String(o.selectionId), company: companyName(o), role: o.offeredJobTitle, rollNo: enrich(o).rollNumber, ctcNum: Number(o.offeredCtc || 0) / 100000, ctc: o.offeredCtc ? `₹ ${(Number(o.offeredCtc) / 100000).toFixed(1)} LPA` : '—', status: o.offerStatus === 'NOT_ISSUED' ? 'Pending' : statusLabel(o.offerStatus || o.selectionStatus), deadline: dateOnly(o.offerExpiresAt), offerDate: dateOnly(o.selectedAt), location: o.jobLocation })),
  }
}
export async function savePlacement(type, form, edit, scope, data) {
  const query = { collegeId: requireId(scope.collegeId, 'college') }
  let path, body
  const suffix = edit ? `/${requireId(form.id)}` : ''
  if (type === 'company') {
    if (!edit) {
      // This API assigns new companies to its first college and has no collegeId input.
      const colleges = await list('colleges')
      const firstCollegeId = Math.min(...colleges.map(c => Number(c.collegeId ?? c.id)).filter(id => id > 0))
      if (Number(scope.collegeId) !== firstCollegeId) throw new Error('The company creation API does not support this selected college. Select the institution’s primary college to create a company.')
    }
    path = `placements/companies${suffix}`
    body = { companyName: form.name, industry: form.industry, website: form.website, contactPerson: form.contactPerson, email: form.contactEmail, phone: form.contactPhone, address: form.hq, status: form.status === 'Inactive' ? 'Inactive' : 'Active' }
  } else if (type === 'drive') {
    const company = data.companies.find(c => c.name === form.company || c.id === String(form.companyId))
    path = `placements/drives${suffix}`
    body = { ...form, companyId: requireId(company?.id, 'company'), academicYearId: requireId(scope.academicYearId, 'academic year'), driveCode: form.driveCode || `DRV-${Date.now()}`, driveName: form.title, jobTitle: form.role, jobDescription: form.description, remarks: form.eligibility || null, driveStartAt: form.driveDate, applicationCloseAt: form.deadline || null, employmentType: form.employmentType || 'FULL_TIME', driveType: form.driveType || 'ON_CAMPUS', currencyCode: 'INR', ctcMax: Number(form.ctcNum || 0) * 100000 }
    if (!edit && form.status && form.status !== 'Draft') throw new Error('New drives must be saved as drafts before publishing.')
    if (edit) {
      const old = data.drives.find(d => d.id === form.id)
      const detailsChanged = ['title','company','role','description','eligibility','driveDate','deadline','venue','ctcNum'].some(key => String(old?.[key] ?? '') !== String(form[key] ?? ''))
      if (detailsChanged) await call(path, {method:'PUT',body,query})
      if (old?.status !== form.status) await call(`placements/drives/${requireId(form.id)}/status`,{method:'PATCH',query,body:{status:statusCode(form.status)}})
      return
    }
  } else {
    const application = data.applications.find(a => String(a.applicationId) === String(form.applicationId) || (a.rollNo === form.rollNo && a.company === form.company))
    if (type === 'application') {
      path = edit ? `placements/applications${suffix}` : `placements/drives/${requireId(form.driveId, 'drive')}/applications`
      body = { studentId: requireId(form.studentId, 'student'), resumePath: form.resumeUrl || null, remarks: form.remarks || null }
    } else if (type === 'interview') {
      path = edit ? `placements/interviews${suffix}` : `placements/applications/${requireId(application?.applicationId, 'application')}/interviews`
      body = { roundNumber: Number(form.roundNumber) || 1, roundName: form.roundType, roundType: 'TECHNICAL', interviewMode: form.meetLink ? 'ONLINE' : 'OFFLINE', scheduledAt: dateTime(form.start), venue: form.venue, meetingUrl: form.meetLink || null, interviewerName: form.interviewer || null }
    } else if (type === 'offer') {
      if (edit) {
        const old = data.offers?.find(o => o.id === form.id)
        if (old && ['role','ctcNum','location'].some(key => String(old[key] ?? '') !== String(form[key] ?? ''))) throw new Error('Issued selection details cannot be changed. This screen can update the offer status.')
        if (old?.status === form.status) return
        await call(`placements/selections/${requireId(form.id)}/offer`, {method:'PATCH',query,body:{offerStatus:statusCode(form.status),offerExpiresAt:form.deadline || null}})
        return
      }
      path = `placements/applications/${requireId(application?.applicationId, 'application')}/selection`
      body = { selectionStatus: form.selectionStatus || 'SELECTED', offeredJobTitle: form.role, offeredCtc: Number(form.ctcNum || 0) * 100000, currencyCode: 'INR', jobLocation: form.location }
    } else throw new Error('This action is not supported by the matching API.')
  }
  await call(path, { method: edit && type !== 'offer' ? 'PUT' : 'POST', body, query })
  if (edit && type === 'application') {
    const old = data.applications.find(a => a.id === form.id)
    if (old && old.status !== form.status) await call(`placements/applications/${requireId(form.id)}/status`, { method:'PATCH', query, body:{status:statusCode(form.status)} })
  }
}

export async function loadOfficialResults(scope) {
  requireId(scope?.collegeId, 'college')
  requireId(scope?.academicYearId, 'academic year')
  const records = await list('results',{collegeId:scope.collegeId})
  const sheets = records.filter(r => scoped(r, scope) && String(r.status).toLowerCase() === 'published').flatMap(r => Array.isArray(r.sheets) ? r.sheets.map(sheet => ({collegeId:r.collegeId,academicYearId:r.academicYearId,...sheet})).filter(sheet => scoped(sheet,scope)) : [r])
  if (getUserRole() !== 'student') return sheets
  const profile = await studentProfileApi.getMyProfile()
  const studentId = String(requireId(profile.studentId ?? profile.id, 'student profile'))
  return sheets.flatMap(sheet => {
    if (!Array.isArray(sheet.records)) return String(sheet.studentId) === studentId ? [sheet] : []
    const ownRecords = sheet.records.filter(row => String(row.studentId) === studentId)
    return ownRecords.length ? [{...sheet,records:ownRecords}] : []
  })
}

export async function loadResultExaminations(scope) {
  requireId(scope.collegeId, 'college')
  requireId(scope.academicYearId, 'academic year')
  return (await list('exams', scope)).filter(exam => scoped(exam, scope) && Number(exam.examId) > 0)
}

export async function loadResultCandidates(scope, exam) {
  if (!scoped(exam, scope)) throw new Error('Select an examination in the current college and academic year.')
  const examId = requireId(exam.examId, 'examination')
  const marks = await list('marks', { examId, workflowStatus: 'APPROVED' })
  return [...new Map(marks.filter(mark => Number(mark.examId) === examId &&
    String(mark.collegeId) === String(scope.collegeId) &&
    String(mark.workflowStatus).toUpperCase() === 'APPROVED' && Number(mark.studentId) > 0)
    .map(mark => [String(mark.studentId), mark])).values()]
}

export async function reviewExamResult(scope, exam, candidate) {
  if (!scoped(exam, scope) || String(candidate.collegeId) !== String(scope.collegeId) ||
      String(candidate.examId) !== String(exam.examId) || String(candidate.workflowStatus).toUpperCase() !== 'APPROVED') {
    throw new Error('Select an eligible student for the current examination.')
  }
  const body = { studentId: requireId(candidate.studentId, 'student'), examId: requireId(exam.examId, 'examination') }
  const result = unwrap(await call('results/calculate', { method: 'POST', body }))
  if (Number(result?.studentId) !== body.studentId || Number(result?.examId) !== body.examId || !Array.isArray(result.subjects)) {
    throw new Error('The server did not return a result for the selected student and examination.')
  }
  const validation = unwrap(await call('results/validate', { method: 'POST', body }))
  if (Number(validation?.studentId) !== body.studentId || Number(validation?.examId) !== body.examId ||
      typeof validation.isValid !== 'boolean' || !Array.isArray(validation.validations)) {
    throw new Error('The server did not return validation for the selected result.')
  }
  return { result, validation }
}

export async function loadStudentResultHistory(scope, examinations, studentId) {
  const id = requireId(studentId, 'student')
  const allowed = new Set(examinations.filter(exam => scoped(exam, scope)).map(exam => String(exam.examId)))
  if (!allowed.size) throw new Error('Load examinations for this college and academic year before opening result history.')
  return (await list(`results/student/${id}`)).filter(row => Number(row.studentId) === id && allowed.has(String(row.examId)))
}
export async function loadGradePolicy(scope) {
  requireId(scope?.collegeId, 'college')
  requireId(scope?.academicYearId, 'academic year')
  return (await list('grade-policies',{collegeId:scope.collegeId})).find(p => scoped(p, scope)) || null
}
export async function saveGradePolicy(scope, bands, policy) {
  const response = await call(`grade-policies${policy ? `/${requireId(policy.id)}` : ''}`, { method: policy ? 'PUT' : 'POST', body: { ...scope, bands } })
  return { ...scope, bands, id: requireId(response?.id, 'saved grade policy') }
}
