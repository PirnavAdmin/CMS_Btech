export const driveTransitions = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
}

export const applicationTransitions = {
  APPLIED: ['UNDER_REVIEW', 'ON_HOLD', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'ON_HOLD', 'WITHDRAWN'],
  SHORTLISTED: ['ON_HOLD', 'WITHDRAWN'],
  INTERVIEW_SCHEDULED: ['ON_HOLD', 'WITHDRAWN'],
  IN_PROGRESS: ['ON_HOLD', 'WITHDRAWN'],
  ON_HOLD: ['UNDER_REVIEW', 'SHORTLISTED', 'WITHDRAWN'],
}

export const offerTransitions = {
  NOT_ISSUED: ['ISSUED'],
  ISSUED: ['ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'],
  ACCEPTED: ['REVOKED'],
}

// Placement DTOs use UTC, while datetime-local controls use the browser timezone.
export function placementDate(value) {
  if (!value) return null
  const string = String(value)
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(string) ? string : `${string}Z`)
  return Number.isFinite(date.getTime()) ? date : null
}

export function placementLocalInput(value) {
  const date = placementDate(value)
  if (!date) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function placementUtc(value) {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid date and time.')
  return date.toISOString()
}

export function placementDateLabel(value) {
  return placementDate(value)?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) || '—'
}

export function placementMoney(value, currency = 'INR') {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(value))
}

export function validatePlacementForm(type, form, data = {}, edit = false) {
  const errors = {}
  const required = (key, message) => { if (!String(form[key] ?? '').trim()) errors[key] = message }
  if (type === 'company') {
    required('name', 'Enter the company name.')
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) errors.contactEmail = 'Enter a valid email address.'
  }
  if (type === 'drive') {
    required('title', 'Enter a drive title.')
    required('role', 'Enter the job role.')
    required('companyId', 'Select a saved company.')
    required('driveStartAt', 'Select the drive date and time.')
    if (form.driveEndAt && new Date(form.driveEndAt) < new Date(form.driveStartAt)) errors.driveEndAt = 'End must be on or after the start.'
    if (form.applicationCloseAt && new Date(form.applicationCloseAt) > new Date(form.driveEndAt || form.driveStartAt)) errors.applicationCloseAt = 'Deadline must be on or before the drive ends.'
    if (form.applicationOpenAt && new Date(form.applicationOpenAt) > new Date(form.driveStartAt)) errors.applicationOpenAt = 'Applications must open before the drive starts.'
    if (form.applicationOpenAt && form.applicationCloseAt && new Date(form.applicationOpenAt) > new Date(form.applicationCloseAt)) errors.applicationCloseAt = 'Deadline must follow the opening date.'
    if (form.ctcMin !== '' && form.ctcMin != null && form.ctcMax !== '' && form.ctcMax != null && Number(form.ctcMin) > Number(form.ctcMax)) errors.ctcMax = 'Maximum CTC must be at least the minimum.'
    if (form.driveType === 'VIRTUAL') required('meetingUrl', 'Enter the online meeting URL.')
  }
  if (type === 'application') {
    required('driveId', 'Select a drive.')
    required('studentId', 'Select a saved student.')
    if (!edit && data.applications?.some(row => String(row.driveId) === String(form.driveId) && String(row.studentId) === String(form.studentId))) errors.studentId = 'This student already has an application for this drive.'
  }
  if (type === 'interview') {
    required('applicationId', 'Select an application.')
    required('roundName', 'Enter the round name.')
    required('scheduledAt', 'Select the interview date and time.')
    if (form.scheduledAt && new Date(form.scheduledAt) <= new Date()) errors.scheduledAt = 'Schedule the interview in the future.'
    const application = data.applications?.find(row => String(row.id) === String(form.applicationId))
    const drive = data.drives?.find(row => String(row.id) === String(application?.driveId))
    const scheduled = new Date(form.scheduledAt)
    if (drive && (scheduled < placementDate(drive.driveStartAt) || (drive.driveEndAt && scheduled > placementDate(drive.driveEndAt)))) errors.scheduledAt = 'Schedule the interview within the drive dates.'
    if (data.interviews?.some(row => String(row.id) !== String(form.id) && String(row.applicationId) === String(form.applicationId) && Number(row.roundNumber) === Number(form.roundNumber))) errors.roundNumber = 'This application already has that round number.'
    if (form.interviewMode === 'ONLINE') required('meetingUrl', 'Enter the meeting URL.')
    if (form.interviewMode === 'OFFLINE') required('venue', 'Enter the venue.')
  }
  if (type === 'offer') required('applicationId', 'Select an application.')
  return errors
}
