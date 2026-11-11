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
  const collegeId = requireId(scope.collegeId, 'college')
  const { values, resourceErrors } = await readModuleResources({
    books: () => list('library/books', { collegeId }),
    issues: () => list('library/issues', { collegeId }),
    fines: () => list('library/fines', { collegeId }),
    categories: () => list('library/categories', { collegeId }),
    students: () => list('students', { collegeId }),
  })
  const belongs = row => Number(row.collegeId) === collegeId
  const borrowers = values.students.filter(belongs).map(row => ({
    ...row, id: String(row.studentId ?? row.id),
    code: row.rollNumber || row.admissionNumber || row.studentCode || String(row.studentId ?? row.id),
    name: row.studentName || row.fullName || row.name,
    department: row.departmentName || row.branchName, type: 'Student',
  }))
  const books = values.books.filter(belongs).map(row => ({
    ...row, id: String(row.bookId), category: row.categoryName, rack: row.shelfLocation || '',
    totalCopies: Number(row.totalCopies), availableCopies: Number(row.availableCopies),
    issuedCopies: Number(row.totalCopies) - Number(row.availableCopies),
  }))
  const bookById = new Map(books.map(book => [String(book.bookId), book]))
  const borrowerById = new Map(borrowers.map(row => [row.id, row]))
  const circulation = values.issues.filter(belongs).map(row => {
    const borrower = borrowerById.get(String(row.studentId))
    const book = bookById.get(String(row.bookId))
    return {
      ...row, id: String(row.issueId), borrowerId: String(row.studentId),
      borrowerName: borrower?.name || 'Student ' + row.studentId, borrowerCode: borrower?.code || String(row.studentId),
      department: borrower?.department, borrowerType: 'Student',
      category: book?.category, bookTitle: row.title || book?.title, accession: row.accessionNo || book?.accessionNo,
      issueDate: dateOnly(row.issueDate), dueDate: dateOnly(row.dueDate), returnDate: dateOnly(row.returnDate),
      status: ({ ISSUED: 'Issued', OVERDUE: 'Overdue', RETURNED: 'Returned', LOST: 'Lost', CANCELLED: 'Cancelled' })[row.effectiveStatus || row.status] || row.status,
    }
  })
  const issueById = new Map(circulation.map(row => [row.id, row]))
  const fines = values.fines.filter(belongs).map(row => {
    const issue = issueById.get(String(row.issueId))
    return {
      ...row, id: String(row.fineId), borrowerId: String(row.studentId),
      borrowerName: issue?.borrowerName || borrowerById.get(String(row.studentId))?.name || 'Student ' + row.studentId,
      borrowerCode: issue?.borrowerCode, department: issue?.department, borrowerType: 'Student',
      accession: issue?.accession, bookTitle: issue?.bookTitle, category: issue?.category,
      overdueDays: issue?.overdueDays, dueDate: issue?.dueDate,
      assessedDate: dateOnly(row.assessedDate), amount: Number(row.fineAmount), paidAmount: Number(row.paidAmount),
      balance: Number(row.balance), status: statusLabel(row.status),
    }
  })
  return { resourceErrors, books, borrowers, circulation, fines, categories: values.categories.filter(belongs) }
}

export async function saveBook(form, old, scope, categories) {
  const category = categories.find(row => String(row.categoryId) === String(form.categoryId) ||
    (!form.categoryId && form.category && row.categoryName === form.category))
  const body = {
    collegeId: requireId(scope.collegeId, 'college'), categoryId: requireId(category?.categoryId, 'library category'),
    accessionNo: String(form.accessionNo || old?.accessionNo || '').trim(),
    title: String(form.title || '').trim(), author: String(form.author || '').trim(),
    isbn: form.isbn?.trim() || null, language: form.language?.trim() || 'English',
    publisher: form.publisher?.trim() || null, edition: form.edition?.trim() || null,
    publicationYear: form.publicationYear ? Number(form.publicationYear) : null,
    shelfLocation: form.rack?.trim() || null, description: form.description?.trim() || null,
    price: old?.price ?? null, totalCopies: Number(form.totalCopies),
    status: old?.status !== false && old?.status !== 0,
  }
  if (!body.accessionNo) throw new Error('Accession number is required.')
  return call('library/books' + (old ? '/' + requireId(old.id) : ''), { method: old ? 'PUT' : 'POST', body })
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
  const registrations = nested.values.registrations.flat()
  const countedEvents = events.map(event => ({ ...event, registeredCount: nested.resourceErrors.registrations ? null : registrations.filter(row => String(row.eventId) === String(event.id) && ['REGISTERED', 'CONFIRMED'].includes(statusCode(row.status))).length }))
  return { meetings, events: countedEvents, registrations, attendance: nested.values.attendance.flat(), minutes: nested.values.minutes.flat(), resourceErrors:{...resourceErrors,...nested.resourceErrors} }
}
export async function saveMeetingEvent(type, form, old, scope) {
  const assignedCollege = getUserCollegeId()
  if (type === 'meeting' && assignedCollege && String(assignedCollege) !== String(scope.collegeId)) throw new Error('Select your signed-in college before saving a meeting.')
  const query = { collegeId: requireId(scope.collegeId, 'college') }
  let path, body, method = old ? 'PUT' : 'POST'
  if (type === 'meeting') {
    if (dateOnly(form.start) !== dateOnly(form.end)) throw new Error('Meetings must start and end on the same date.')
    path = `meetings${old ? `/${requireId(old.meetingId || old.id)}` : ''}`
    body = { meetingCode: old?.meetingCode || `MTG-${Date.now()}`, title: form.title, meetingType: form.category, description: form.agenda ?? form.description, meetingDate: dateOnly(form.start), startTime: `${form.start.slice(11, 16)}:00`, endTime: `${form.end.slice(11, 16)}:00`, venue: form.venue, organizerId: form.organizerId ? requireId(form.organizerId, 'organizer') : null, remarks: old?.remarks || null, status: ({ Upcoming: 'SCHEDULED', 'In Progress': 'ONGOING' })[form.status] || statusCode(form.status || 'Scheduled') }
  } else if (type === 'event') {
    path = `events${old ? `/${requireId(old.eventId || old.id)}` : ''}`
    body = { collegeId: query.collegeId, academicYearId: requireId(scope.academicYearId, 'academic year'), departmentId: form.departmentId ? requireId(form.departmentId, 'department') : null, organizerUserId: form.organizerUserId ? requireId(form.organizerUserId, 'organizer') : null, eventCode: old?.eventCode || `EVT-${Date.now()}`, eventName: form.title, eventType: statusCode(form.category || 'OTHER'), startAt: dateTime(form.start), endAt: dateTime(form.end), venue: form.venue, description: form.description, maxParticipants: Number(form.capacity) || null, registrationOpensAt: old?.registrationOpensAt || null, registrationClosesAt: dateTime(form.deadline), registrationFee: Number(form.registrationFee) || 0, certificateEnabled: Boolean(form.certificateEnabled), bannerPath: old?.bannerPath || null, status: form.status === 'Upcoming' ? 'PUBLISHED' : statusCode(form.status || 'Draft') }
  } else if (type === 'registration') {
    path = `events/${requireId(form.eventId, 'event')}/registrations${old ? `/${requireId(old.apiId)}/status` : ''}`
    method = old ? 'PATCH' : 'POST'
    body = old ? { status: statusCode(form.status) } : { participantType: form.participantType || 'STUDENT', studentId: form.participantType === 'STAFF' ? null : requireId(form.studentId, 'student'), userId: form.participantType === 'STAFF' ? requireId(form.userId, 'faculty / staff user') : null, participantName: form.studentName, email: form.email || null, mobile: form.phone || null }
  } else if (type === 'minute') {
    path = `meetings/${requireId(form.meetingId, 'meeting')}/minutes${old ? `/${requireId(old.apiId)}` : ''}`
    body = { minutesTitle: form.title || form.meetingTitle, minutesText: form.minutes || form.actionItem, approvalStatus: statusCode(form.approvalStatus || 'Draft') }
  } else throw new Error('This action is not supported by the matching API.')
  await call(path, { method, body, query })
}

export async function loadPlacements(scope) {
  const collegeId = requireId(scope.collegeId, 'college')
  const resources = await readModuleResources({
    companies: () => list('placements/companies', { collegeId }),
    drives: () => list('placements/drives', { collegeId, academicYearId: scope.academicYearId }),
    applications: () => list('placements/applications', { collegeId }),
    interviews: () => list('placements/interviews', { collegeId }),
    offers: () => list('placements/selections', { collegeId }),
    students: () => list('students', { collegeId }),
  })
  const { resourceErrors, values } = resources
  const companies = values.companies.filter(row => String(row.collegeId) === String(collegeId))
  const drives = values.drives.filter(row => String(row.collegeId) === String(collegeId) &&
    (!scope.academicYearId || String(row.academicYearId) === String(scope.academicYearId)))
  const driveIds = new Set(drives.map(row => String(row.driveId)))
  const applications = values.applications.filter(row => driveIds.has(String(row.driveId)))
  const applicationIds = new Set(applications.map(row => String(row.applicationId)))
  const students = values.students.filter(row => row.collegeId == null || String(row.collegeId) === String(collegeId))
  if (resourceErrors.drives) resourceErrors.applications = resourceErrors.drives
  if (resourceErrors.applications) {
    resourceErrors.interviews = resourceErrors.applications
    resourceErrors.offers = resourceErrors.applications
  }
  const related = await readModuleResources(Object.fromEntries(drives.flatMap(drive => [
    ['rules-' + drive.driveId, () => list('placements/drives/' + drive.driveId + '/eligibility-rules', { collegeId })],
    ['eligibility-' + drive.driveId, () => list('placements/drives/' + drive.driveId + '/eligibility', { collegeId })],
  ])))
  const rules = drives.flatMap(drive => (related.values['rules-' + drive.driveId] || []).map(row => ({ ...row, driveId: drive.driveId })))
  const eligibility = drives.flatMap(drive => (related.values['eligibility-' + drive.driveId] || []).map(row => ({ ...row, driveId: drive.driveId })))
  const enrich = row => {
    const application = applications.find(item => String(item.applicationId) === String(row.applicationId)) || row
    const drive = drives.find(item => String(item.driveId) === String(application.driveId))
    const student = students.find(item => String(item.studentId ?? item.id) === String(application.studentId))
    const company = companies.find(item => String(item.companyId) === String(drive?.companyId || row.companyId))
    const evaluation = eligibility.find(item => String(item.driveId) === String(application.driveId) && String(item.studentId) === String(application.studentId))
    return {
      studentId: application.studentId,
      studentName: student?.studentName || student?.fullName || student?.name || '',
      rollNumber: student?.rollNumber || student?.admissionNumber || student?.studentCode || '',
      branchId: student?.branchId,
      courseId: student?.courseId,
      semesterId: student?.semesterId || student?.currentSemesterId,
      batch: student?.graduationYear || student?.batchName || student?.admissionYear || '',
      companyId: drive?.companyId || row.companyId,
      companyName: row.companyName || company?.companyName || '',
      jobTitle: drive?.jobTitle || '',
      driveId: application.driveId,
      eligibilityStatus: evaluation?.eligibilityStatus || '',
      eligibilityReason: evaluation?.reason || '',
    }
  }
  return {
    resourceErrors,
    relatedErrors: related.resourceErrors,
    rules,
    eligibility,
    students,
    companies: companies.map(row => ({ ...row, id: String(row.companyId), name: row.companyName,
      contactEmail: row.email || '', contactPhone: row.phone || '', hq: row.address || '' })),
    drives: drives.map(row => ({ ...row, id: String(row.driveId), title: row.driveName, role: row.jobTitle,
      company: companies.find(item => String(item.companyId) === String(row.companyId))?.companyName || '',
      status: statusLabel(row.driveStatus), description: row.jobDescription || '',
      driveDate: dateOnly(row.driveStartAt), deadline: dateOnly(row.applicationCloseAt),
      ctcNum: row.ctcMax == null ? null : Number(row.ctcMax) / 100000,
      eligibleBranches: rules.filter(rule => String(rule.driveId) === String(row.driveId) && rule.status !== 0 && rule.status !== false).map(rule => rule.branchId).filter(Boolean),
      applicantsCount: resourceErrors.applications ? null : applications.filter(item => String(item.driveId) === String(row.driveId)).length,
    })),
    applications: applications.map(row => ({ ...row, ...enrich(row), id: String(row.applicationId),
      status: statusLabel(row.applicationStatus), driveId: String(row.driveId),
      role: enrich(row).jobTitle, rollNo: enrich(row).rollNumber, resumeUrl: row.resumePath || '' })),
    interviews: values.interviews.filter(row => applicationIds.has(String(row.applicationId))).map(row => ({ ...row, ...enrich(row),
      id: String(row.interviewId), status: statusLabel(row.interviewStatus), role: enrich(row).jobTitle,
      start: row.scheduledAt, interviewer: row.interviewerName, meetLink: row.meetingUrl || '' })),
    offers: values.offers.filter(row => applicationIds.has(String(row.applicationId))).map(row => ({ ...row, ...enrich(row),
      id: String(row.selectionId), role: row.offeredJobTitle, status: statusLabel(row.offerStatus || row.selectionStatus),
      ctcNum: row.offeredCtc == null ? null : Number(row.offeredCtc) / 100000,
      offerDate: row.offerIssuedAt, deadline: row.offerExpiresAt, location: row.jobLocation })),
  }
}

export async function savePlacement(type, form, edit, scope, data) {
  const query = { collegeId: requireId(scope.collegeId, 'college') }
  const suffix = edit ? '/' + requireId(form.id) : ''
  const optionalNumber = value => value === '' || value == null ? null : Number(value)
  if (type === 'company') {
    return unwrap(await call('placements/companies' + suffix, {
      method: edit ? 'PUT' : 'POST', query,
      body: { collegeId: query.collegeId, companyName: form.name, industry: form.industry || null,
        website: form.website || null, contactPerson: form.contactPerson || null,
        email: form.contactEmail || null, phone: form.contactPhone || null, address: form.hq || null,
        status: form.status === 'Inactive' ? 'Inactive' : 'Active' },
    }))
  }
  if (type === 'drive') {
    const company = data.companies.find(row => String(row.id) === String(form.companyId) || row.name === form.company)
    const body = {
      companyId: requireId(company?.id, 'company'), academicYearId: requireId(form.academicYearId || scope.academicYearId, 'academic year'),
      driveCode: form.driveCode || 'DRV-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
      driveName: form.title, jobTitle: form.role, jobDescription: form.description || null,
      employmentType: form.employmentType || 'FULL_TIME', driveType: form.driveType || 'ON_CAMPUS',
      jobLocation: form.jobLocation || null, ctcMin: optionalNumber(form.ctcMin),
      ctcMax: form.ctcMax !== undefined ? optionalNumber(form.ctcMax) : form.ctcNum == null ? null : Number(form.ctcNum) * 100000,
      monthlyStipend: optionalNumber(form.monthlyStipend), currencyCode: form.currencyCode || 'INR', vacancies: optionalNumber(form.vacancies),
      driveStartAt: form.driveStartAt || form.driveDate, driveEndAt: form.driveEndAt || null,
      applicationOpenAt: form.applicationOpenAt || null, applicationCloseAt: form.applicationCloseAt || form.deadline || null,
      venue: form.venue || null, meetingUrl: form.meetingUrl || null,
      coordinatorUserId: optionalNumber(form.coordinatorUserId), remarks: form.remarks ?? form.eligibility ?? null,
    }
    return unwrap(await call('placements/drives' + suffix, { method: edit ? 'PUT' : 'POST', query, body }))
  }
  if (type === 'application') {
    const body = { resumePath: form.resumeUrl || null, coverLetter: form.coverLetter || null, remarks: form.remarks || null }
    if (!edit) body.studentId = requireId(form.studentId, 'student')
    const path = edit ? 'placements/applications' + suffix : 'placements/drives/' + requireId(form.driveId, 'drive') + '/applications'
    return unwrap(await call(path, { method: edit ? 'PUT' : 'POST', query, body }))
  }
  const application = data.applications?.find(row => String(row.applicationId || row.id) === String(form.applicationId))
  if (type === 'interview') {
    const path = edit ? 'placements/interviews' + suffix : 'placements/applications/' + requireId(application?.applicationId || application?.id, 'application') + '/interviews'
    return unwrap(await call(path, { method: edit ? 'PUT' : 'POST', query, body: {
      roundNumber: Number(form.roundNumber), roundName: form.roundName || form.roundType,
      roundType: form.interviewRoundType || 'TECHNICAL', interviewMode: form.interviewMode || (form.meetLink ? 'ONLINE' : 'OFFLINE'),
      scheduledAt: form.scheduledAt || form.start, venue: form.venue || null, meetingUrl: form.meetingUrl || form.meetLink || null,
      interviewerUserId: optionalNumber(form.interviewerUserId), interviewerName: form.interviewerName || form.interviewer || null,
    } }))
  }
  if (type === 'offer') {
    if (edit) {
      const old = data.offers?.find(row => String(row.id) === String(form.id))
      const status = statusCode(form.offerStatus || form.status)
      if (old && statusCode(old.offerStatus || old.status) === status) return old
      const body = { offerStatus: status, expectedJoiningDate: form.expectedJoiningDate || null }
      if (status === 'ISSUED') { body.offerLetterPath = form.offerLetterPath || null; body.offerExpiresAt = form.offerExpiresAt || form.deadline || null }
      return unwrap(await call('placements/selections/' + requireId(form.id) + '/offer', { method: 'PATCH', query, body }))
    }
    return unwrap(await call('placements/applications/' + requireId(application?.applicationId || application?.id, 'application') + '/selection', {
      method: 'PUT', query, body: { selectionStatus: form.selectionStatus || 'SELECTED', offeredJobTitle: form.role || null,
        offeredCtc: form.offeredCtc !== undefined ? optionalNumber(form.offeredCtc) : form.ctcNum == null ? null : Number(form.ctcNum) * 100000,
        monthlyStipend: optionalNumber(form.monthlyStipend), currencyCode: form.currencyCode || 'INR',
        jobLocation: form.location || null, expectedJoiningDate: form.expectedJoiningDate || null, remarks: form.remarks || null },
    }))
  }
  throw new Error('This operation is unavailable.')
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
