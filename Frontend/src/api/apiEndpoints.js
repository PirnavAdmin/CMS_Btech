import { markApiResult } from '../utils/exportProvenance'
import { getAccessToken, getAuthStorage, getRefreshToken, signOut } from '../auth/auth'

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    ['pirnav-local-admissions-v2', 'pirnav-local-student-profiles-v2', 'pirnav-department-hod-names-v1'].forEach(key => {
      localStorage.removeItem(key)
    })
  } catch { /* ignore */ }
}

const normalizeBaseUrl = (value = '') => value.trim().replace(/\/+$/, '')
const DEFAULT_API_BASE_URL = 'https://movable-swampland-tinderbox.ngrok-free.dev'

export const API_BASE_URL = import.meta.env.DEV
  ? ''
  : normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)

// Keep local login on the same Vite /api proxy as the rest of the app. Using
// the old public tunnel directly in development makes login fail when that
// tunnel changes or is unavailable, even though the local proxy is configured.
const AUTH_LOGIN_URL = import.meta.env.DEV
  ? '/api/v1/auth/login'
  : normalizeBaseUrl(import.meta.env.VITE_AUTH_API_URL || `${DEFAULT_API_BASE_URL}/api/v1/auth/login`)
const hasConfiguredAuthLoginUrl = Boolean(AUTH_LOGIN_URL || API_BASE_URL)

const endpoint = (path) => `${API_BASE_URL}${path}`

export const SCREEN_EXPORT_ENDPOINTS = Object.freeze(Object.fromEntries([
  'colleges', 'college-settings', 'academic-years', 'academic-levels',
  'departments', 'courses', 'branches', 'semester', 'sections',
  'course-structures', 'students', 'student-profiles', 'student-admissions',
  'promotions', 'users', 'roles', 'faculty', 'fee-structures', 'hostel-fees', 'transport-fees',
].map(screen => {
  const prefix = ['college-settings', 'academic-levels', 'semester', 'roles'].includes(screen) ? '/api' : '/api/v1'
  return [screen, Object.freeze({ download: endpoint(`${prefix}/${screen}/download`), export: endpoint(`${prefix}/${screen}/export`) })]
})))

export class AuthRequestError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
  }
}

export const API_ENDPOINTS = Object.freeze({
  exports: Object.freeze({
    list: endpoint('/api/v1/exports'),
    screen: screen => endpoint(`/api/v1/exports/${encodeURIComponent(screen === 'semester' ? 'semesters' : screen)}`),
  }),
  auth: Object.freeze({
    login: AUTH_LOGIN_URL || endpoint('/api/v1/auth/login'),
    refresh: endpoint('/api/v1/auth/refresh'),
    changePassword: endpoint('/api/v1/auth/change-password'),
    forgotPassword: endpoint('/api/v1/auth/forgot-password'),
  }),
  profile: Object.freeze({
    get: endpoint('/api/v1/profile'),
    update: endpoint('/api/v1/profile'),
  }),
  academicYears: Object.freeze({
    create: endpoint('/api/v1/academic-years'),
    list: endpoint('/api/v1/academic-years'),
    detail: (id) => endpoint(`/api/v1/academic-years/${id}`),
    update: (id) => endpoint(`/api/v1/academic-years/${id}`),
    activate: (id) => endpoint(`/api/v1/academic-years/${id}/activate`),
    deactivate: (id) => endpoint(`/api/v1/academic-years/${id}/deactivate`),
  }),
  branches: Object.freeze({
    create: endpoint('/api/v1/branches'),
    list: endpoint('/api/v1/branches'),
    byCourse: (courseId) => endpoint(`/api/v1/branches/course/${courseId}`),
    detail: (id) => endpoint(`/api/v1/branches/${id}`),
    update: (id) => endpoint(`/api/v1/branches/${id}`),
    status: (id) => endpoint(`/api/v1/branches/${id}/status`),
  }),
  courses: Object.freeze({
    list: endpoint('/api/v1/courses'),
    detail: (id) => endpoint(`/api/v1/courses/${id}`),
  }),
  departments: Object.freeze({
    list: endpoint('/api/v1/departments'),
  }),
  courseStructures: Object.freeze({
    create: endpoint('/api/v1/course-structures'),
    list: endpoint('/api/v1/course-structures'),
    byCourse: (courseId) => endpoint(`/api/v1/course-structures/course/${courseId}`),
    detail: (id) => endpoint(`/api/v1/course-structures/${id}`),
    update: (id) => endpoint(`/api/v1/course-structures/${id}`),
  }),
  sectionAssignments: Object.freeze({
    list: endpoint('/api/v1/section-assignments'),
    assign: (sectionId) => endpoint(`/api/v1/sections/${sectionId}/students`),
    remove: (sectionId, assignmentId) => endpoint(`/api/v1/sections/${sectionId}/students/${assignmentId}`),
  }),
  sections: Object.freeze({
    create: endpoint('/api/v1/sections'),
    list: endpoint('/api/v1/sections'),
    detail: (id) => endpoint(`/api/v1/sections/${id}`),
    update: (id) => endpoint(`/api/v1/sections/${id}`),
    remove: (id) => endpoint(`/api/v1/sections/${id}`),
    search: endpoint('/api/v1/sections/search'),
    status: (id) => endpoint(`/api/v1/sections/${id}/status`),
    validateCapacity: endpoint('/api/v1/sections/validate-capacity'),
    summary: endpoint('/api/v1/sections/summary'),
    classTeacher: (id) => endpoint(`/api/v1/sections/${id}/class-teacher`),
    classTeacherCandidates: (id) => endpoint(`/api/v1/sections/${id}/class-teacher-candidates`),
    capacity: (id) => endpoint(`/api/v1/sections/${id}/capacity`),
    students: (id) => endpoint(`/api/v1/sections/${id}/students`),
    assignStudents: (id) => endpoint(`/api/v1/sections/${id}/students/assign`),
    student: (sectionId, studentId) => endpoint(`/api/v1/sections/${sectionId}/students/${studentId}`),
  }),
  studentAdmissions: Object.freeze({
    approve: (id) => endpoint(`/api/Admissions/${id}/approve`),
    list: endpoint('/api/v1/student-admissions'), create: endpoint('/api/v1/student-admissions'),
    detail: (id) => endpoint(`/api/v1/student-admissions/${id}`), update: (id) => endpoint(`/api/v1/student-admissions/${id}`),
    academicDetails: (id) => endpoint(`/api/v1/student-admissions/${id}/academic-details`),
    previousEducation: (id) => endpoint(`/api/v1/student-admissions/${id}/previous-education`),
    status: (id) => endpoint(`/api/v1/student-admissions/${id}/status`), submit: (id) => endpoint(`/api/v1/student-admissions/${id}/submit`),
    feeSummary: (id) => endpoint(`/api/v1/student-admissions/${id}/fee-summary`), feeStructure: (id) => endpoint(`/api/v1/student-admissions/${id}/fee-structure`),
  }),
  studentAcademicInformation: Object.freeze({ detail: (id) => endpoint(`/api/v1/student-academic-information/${id}`), update: (id) => endpoint(`/api/v1/student-academic-information/${id}`) }),
  students: Object.freeze({
    list: endpoint('/api/v1/students'), create: endpoint('/api/v1/students'), search: endpoint('/api/v1/students/search'),
    detail: (id) => endpoint(`/api/v1/students/${id}`), update: (id) => endpoint(`/api/v1/students/${id}`), status: (id) => endpoint(`/api/v1/students/${id}/status`),
    parent: (id) => endpoint(`/api/student-parents/${id}`), documents: (id) => endpoint(`/api/v1/students/${id}/documents`),
    document: (studentId, documentId) => endpoint(`/api/v1/students/${studentId}/documents/${documentId}`),
    downloadDocument: (studentId, documentId) => endpoint(`/api/v1/students/${studentId}/documents/${documentId}/download`),
    personalInformation: (id) => endpoint(`/api/v1/students/${id}/profile/personal-information`), examResults: (id) => endpoint(`/api/v1/students/${id}/profile/exam-results`),
  }),
  studentProfiles: Object.freeze({ list: endpoint('/api/v1/student-profiles'), preview: (id) => endpoint(`/api/v1/student-profiles/${id}/preview`), update: (id) => endpoint(`/api/v1/student-profiles/${id}`), myProfile: endpoint('/api/StudentProfile/my-profile') }),
  faculty: Object.freeze({
    list: endpoint('/api/v1/faculty'),
    create: endpoint('/api/v1/faculty'),
    search: endpoint('/api/v1/faculty/search'),
    detail: (id) => endpoint(`/api/v1/faculty/${id}`),
    update: (id) => endpoint(`/api/v1/faculty/${id}`),
    workload: (id) => endpoint(`/api/v1/faculty/${id}/workload`),
    profilePhoto: (id) => endpoint(`/api/v1/faculty/${id}/profile-photo`),
    status: (id) => endpoint(`/api/v1/faculty/${id}/status`),
    statusHistory: (id) => endpoint(`/api/v1/faculty/${id}/status-history`),
    summary: endpoint('/api/v1/faculty/summary'),
  }),
  facultyProfiles: Object.freeze({
    detail: (facultyId) => endpoint(`/api/v1/faculty-profile/${facultyId}`),
    create: (facultyId) => endpoint(`/api/v1/faculty-profile/${facultyId}`),
    update: (facultyId) => endpoint(`/api/v1/faculty-profile/${facultyId}`),
  }),
  facultyDocuments: Object.freeze({
    list: (facultyId) => endpoint(`/api/v1/faculty-documents/faculty/${facultyId}`),
    upload: (facultyId) => endpoint(`/api/v1/faculty-documents/faculty/${facultyId}`),
    detail: (documentId) => endpoint(`/api/v1/faculty-documents/${documentId}`),
  }),
  facultySubjectAllocations: Object.freeze({
    list: endpoint('/api/v1/faculty-subject-allocations'),
    create: endpoint('/api/v1/faculty-subject-allocations'),
    detail: (allocationId) => endpoint(`/api/v1/faculty-subject-allocations/${allocationId}`),
  }),
  facultyAttendance: Object.freeze({
    list: endpoint('/api/v1/faculty-attendance'),
    create: endpoint('/api/v1/faculty-attendance'),
    detail: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}`),
    update: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}`),
    checkIn: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}/check-in`),
    checkOut: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}/check-out`),
    daily: endpoint('/api/v1/faculty-attendance/daily'),
    bulk: endpoint('/api/v1/faculty-attendance/bulk'),
    weekly: endpoint('/api/v1/faculty-attendance/reports/weekly'),
    monthly: endpoint('/api/v1/faculty-attendance/reports/monthly'),
    reports: endpoint('/api/v1/faculty-attendance/reports'),
    export: endpoint('/api/v1/faculty-attendance/export'),
  }),
  facultyLeave: Object.freeze({
    requests: endpoint('/api/v1/faculty-leave/requests'),
    request: id => endpoint('/api/v1/faculty-leave/requests/' + id),
    approve: id => endpoint('/api/v1/faculty-leave/requests/' + id + '/approve'),
    reject: id => endpoint('/api/v1/faculty-leave/requests/' + id + '/reject'),
    history: endpoint('/api/v1/faculty-leave/history'),
    balances: endpoint('/api/v1/faculty-leave/balances'),
    types: endpoint('/api/v1/faculty-leave/types'),
    type: id => endpoint('/api/v1/faculty-leave/types/' + id),
    policies: endpoint('/api/v1/faculty-leave/policies'),
    policy: id => endpoint('/api/v1/faculty-leave/policies/' + id),
    activate: id => endpoint('/api/v1/faculty-leave/policies/' + id + '/activate'),
  }),
  facultyPayroll: Object.freeze({
    list: endpoint('/api/v1/faculty-payroll'),
    detail: id => endpoint('/api/v1/faculty-payroll/' + id),
    salaries: endpoint('/api/v1/faculty-payroll/salary-records'),
    payslips: endpoint('/api/v1/faculty-payroll/payslips'),
    hold: id => endpoint('/api/v1/faculty-payroll/' + id + '/hold'),
    export: endpoint('/api/v1/faculty-payroll/export'),
  }),
  studentAttendance: Object.freeze({
    list: endpoint('/api/v1/attendance'),
    create: endpoint('/api/v1/attendance'),
    studentStats: (studentId) => endpoint(`/api/v1/attendance/students/${studentId}/summary`),
  }),
  results: Object.freeze({
    list: endpoint('/api/v1/results'),
    create: endpoint('/api/v1/results'),
    transcript: (studentId) => endpoint(`/api/v1/results/students/${studentId}/transcript`),
  }),
  promotions: Object.freeze({
    dashboard: endpoint('/api/v1/promotions/dashboard'), directory: endpoint('/api/v1/promotions/directory'), history: endpoint('/api/v1/promotions/history'),
    eligibleStudents: endpoint('/api/v1/promotions/eligible-students'), eligibility: (id) => endpoint(`/api/v1/promotions/student-eligibility/${id}`), eligibilityStatus: (id) => endpoint(`/api/v1/promotions/eligibility-status/${id}`),
    promote: endpoint('/api/v1/promotions/promote'), promoteBulk: endpoint('/api/v1/promotions/promote-bulk'), promoteBulkAtomic: endpoint('/api/v1/promotions/promote-bulk-atomic'), promotedStudents: endpoint('/api/v1/promotions/promoted-students'),
    studentHistory: (id) => endpoint(`/api/v1/promotions/student/${id}/history`), historyByStudent: (id) => endpoint(`/api/v1/promotions/history/${id}`),
  }),
  authorizationTest: Object.freeze({
    authenticated: endpoint('/api/v1/authorization-test/authenticated'),
    admin: endpoint('/api/v1/authorization-test/admin'),
    faculty: endpoint('/api/v1/authorization-test/faculty'),
    student: endpoint('/api/v1/authorization-test/student'),
    adminFaculty: endpoint('/api/v1/authorization-test/admin-faculty'),
  }),
})

const readBody = async (response) => {
  try { return await response.json() } catch { return null }
}

const listResponse = (response) => {
  let current = response
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    if (Array.isArray(current)) return current
    const list = current.items ?? current.content ?? current.results ?? current.records ?? current.academicYears ?? current.years ?? current.rows
    if (Array.isArray(list)) return list
    current = current.data
  }
  return []
}

const validationMessage = (body) => {
  const errors = body?.errors || body?.data?.errors
  if (errors && typeof errors === 'object') {
    const messages = Object.entries(errors).flatMap(([field, value]) => (Array.isArray(value) ? value : [value]).filter((message) => typeof message === 'string').map((message) => field === '$' ? message : `${field}: ${message}`))
    if (messages.length) return messages.join(' ')
  }
  return body?.message || body?.detail || body?.title || body?.data?.message || body?.data?.detail || body?.data?.title || ''
}

let refreshRequestInFlight = null

const refreshAccessToken = async () => {
  if (refreshRequestInFlight) return refreshRequestInFlight

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    signOut()
    if (typeof window !== 'undefined') window.location.replace('/login')
    throw new AuthRequestError('Your session has expired. Please sign in again.', 401)
  }

  refreshRequestInFlight = (async () => {
    const response = await fetch(API_ENDPOINTS.auth.refresh, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ refreshToken }),
    })

    const body = await readBody(response)
    if (!response.ok || !body?.data?.accessToken) {
      signOut()
      if (typeof window !== 'undefined') window.location.replace('/login')
      throw new AuthRequestError(body?.message || 'Your session has expired. Please sign in again.', response.status || 401)
    }

    const storage = getAuthStorage()
    storage.setItem('btech-access-token', body.data.accessToken)
    if (body.data.refreshToken) storage.setItem('btech-refresh-token', body.data.refreshToken)

    return body.data.accessToken
  })()

  try {
    return await refreshRequestInFlight
  } finally {
    refreshRequestInFlight = null
  }
}

const pendingGetRequests = new Map()
const request = async (url, options = {}, retried = false, bypassDedupe = false) => {
  const method = String(options.method || 'GET').toUpperCase()
  if (method === 'GET' && !bypassDedupe) {
    const key = `${method}:${url}`
    if (pendingGetRequests.has(key)) return pendingGetRequests.get(key)
    const pending = request(url, options, retried, true).finally(() => pendingGetRequests.delete(key))
    pendingGetRequests.set(key, pending)
    return pending
  }
  const token = getAccessToken()
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: { 'ngrok-skip-browser-warning': 'true', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
  } catch {
    throw new Error('We’re having trouble connecting right now. Please try again shortly.')
  }
  if (response.status === 401 && !retried && url !== API_ENDPOINTS.auth.refresh) {
    await refreshAccessToken()
    return request(url, options, true, true)
  }
  const body = await readBody(response)
  if (!response.ok || body?.success === false) {
    // Some read APIs are deliberately optional. Their callers can provide the
    // statuses that mean "no related record yet" so an expected absence does
    // not look like a failed request in the browser console.
    const silentStatuses = Array.isArray(options.silentStatuses) ? options.silentStatuses : []
    if (!silentStatuses.includes(response.status)) {
      console.error('API request failed', { url, method: options.method || 'GET', status: response.status })
    }
    if (response.status >= 500) {
      const error = new Error('Something went wrong while completing your request. Please try again.')
      error.status = response.status
      error.correlationId = typeof body?.correlationId === 'string' ? body.correlationId : undefined
      throw error
    }
    const fallback = {
      400: 'Please check the submitted information.',
      401: 'Your session has expired. Please sign in again.',
      403: "You don't have permission to update this profile.",
      404: 'Profile not found.',
      409: 'The email or mobile number is already in use.',
      422: 'Some submitted values are invalid.',
      500: 'Something went wrong while completing your request. Please try again.',
    }[response.status] || 'The request could not be completed.'
    const error = new Error(validationMessage(body) || fallback)
    error.status = response.status
    throw error
  }
  return body
}

const requiredId = (value, label) => {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error(`${label} is required.`)
  return encodeURIComponent(String(value).trim())
}
const withQuery = (url, params = {}) => {
  const query = new URLSearchParams(Object.entries(params || {}).filter(([, value]) => value !== '' && value !== undefined && value !== null))
  return query.size ? `${url}?${query}` : url
}
const dataResponse = (response) => response?.data?.data ?? response?.data ?? response ?? null
const listData = (response) => listResponse(response)

const blobRequest = async (url, options = {}, retried = false) => {
  const token = getAccessToken()
  let response
  try { response = await fetch(url, { ...options, headers: { 'ngrok-skip-browser-warning': 'true', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }) }
  catch { throw new Error('We’re having trouble connecting right now. Please try again shortly.') }
  if (response.status === 401 && !retried && url !== API_ENDPOINTS.auth.refresh) { await refreshAccessToken(); return blobRequest(url, options, true) }
  if (!response.ok) { const body = await readBody(response); throw new AuthRequestError(validationMessage(body) || 'The download request could not be completed.', response.status) }
  return { blob: await response.blob(), contentDisposition: response.headers.get('content-disposition') || '', contentType: response.headers.get('content-type') || '' }
}

export const screenExportsApi = {
  list: params => request(withQuery(API_ENDPOINTS.exports.list, params)),
  getScreen: (screen, params) => {
    if (!String(screen || '').trim()) throw new Error('Screen is required.')
    return readExportFile(withQuery(API_ENDPOINTS.exports.screen(screen), params))
  },
  download: (screen, params) => requestScreenFile(screen, 'download', params),
  export: (screen, params) => requestScreenFile(screen, 'export', params),
  save: async (screen, params) => {
    for (const action of ['export', 'download']) {
      try { return await requestScreenFile(screen, action, params) }
      catch (error) { if (![404, 405].includes(error.status)) throw error }
    }
    return screenExportsApi.getScreen(screen, params)
  },
}

async function requestScreenFile(screen, action, params) {
  const routes = SCREEN_EXPORT_ENDPOINTS[screen]
  if (!routes) throw new Error('This screen does not support server exports.')
  return readExportFile(withQuery(routes[action], params))
}

async function readExportFile(url) {
  const result = await blobRequest(url)
  if (/json|text\/html/i.test(result.contentType)) {
    let body
    try { body = JSON.parse(await result.blob.text()) } catch { /* Unexpected gateway page. */ }
    throw new Error(validationMessage(body) || 'The server did not return an export file.')
  }
  if (!result.blob.size) throw new Error('The server returned an empty export file.')
  return result
}

const normalizeFrontendRole = (roleValue) => {
  const rawRole = Array.isArray(roleValue) ? roleValue[0] : roleValue
  const normalized = String(rawRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

  if (['admin', 'college_admin', 'super_admin'].includes(normalized)) {
    return 'admin'
  }

  return normalized || 'student'
}

export async function login({ identifier, password, rememberMe = false }) {
  if (!hasConfiguredAuthLoginUrl) {
    throw new AuthRequestError('Sign in is temporarily unavailable. Please try again later.')
  }

  let response
  try {
    response = await fetch(API_ENDPOINTS.auth.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ loginId: identifier, password, rememberMe: Boolean(rememberMe) }),
    })
  } catch {
    throw new AuthRequestError('We’re having trouble signing you in right now. Please try again shortly.')
  }
  const body = await readBody(response)
  if (!response.ok || body?.success === false) {
    const message = response.status === 401
      ? 'The email, mobile number, or password is incorrect.'
      : response.status === 429
        ? 'Too many sign-in attempts. Please wait a moment and try again.'
        : 'We couldn’t sign you in right now. Please try again.'
    throw new AuthRequestError(message, response.status || 400)
  }
  const data = body?.data
  if (!data?.accessToken || !data?.refreshToken) throw new AuthRequestError('We couldn’t complete sign in. Please try again.')

  const roleValue = data.roles ?? data.role
  return {
    ...data,
    roles: Array.isArray(roleValue) ? roleValue : roleValue ? [roleValue] : [],
    user: {
      id: data.userId,
      name: data.fullName,
      role: normalizeFrontendRole(roleValue),
    },
  }
}

export async function changePassword({ currentPassword, newPassword, confirmNewPassword }) {
  return request(API_ENDPOINTS.auth.changePassword, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
  })
}

const normalizeProfile = (source) => {
  const data = source && typeof source === 'object' ? source : {}
  const academic = data.academic && typeof data.academic === 'object' ? data.academic : {}
  const application = data.application && typeof data.application === 'object' ? data.application : {}
  const lastLoginAt = data.lastLoginAt ?? data.last_login_at ?? data.LastLoginAt ?? data.lastLogin ?? data.last_login ?? ''
  return {
    id: data.userId ?? data.studentId ?? '', identifier: data.employeeUserId ?? data.studentCode ?? data.studentId ?? '', fullName: data.fullName ?? data.studentName ?? '',
    email: data.email ?? '', mobile: data.mobile ?? '', role: Array.isArray(data.roles) ? data.roles.join(', ') : String(data.role ?? ''),
    dateOfBirth: data.dateOfBirth ?? '', gender: data.gender ?? '', department: data.department ?? data.departmentName ?? '', departmentId: data.departmentId ?? '',
    designation: data.designation ?? '', houseNumber: data.houseNumber ?? data.currentHouseNumber ?? '', address: data.address ?? data.currentAddress ?? '', permanentHouseNumber: data.permanentHouseNumber ?? '', permanentAddress: data.permanentAddress ?? '', postalCode: data.postalCode ?? '',
    pincode: data.pincode ?? data.postalCode ?? '', city: data.city ?? '', district: data.district ?? '', state: data.state ?? '', permanentPincode: data.permanentPincode ?? '', permanentCity: data.permanentCity ?? '', permanentDistrict: data.permanentDistrict ?? '', permanentState: data.permanentState ?? '', bio: data.bio ?? data.aboutMe ?? '',
    lastLoginAt,
    updatedAt: data.updatedAt ?? '',
    status: data.status ?? data.accountStatus ?? 'Active',
    registrationNumber: data.registrationNumber ?? application.registrationNumber ?? application.number ?? '', admissionNumber: data.admissionNumber ?? application.admissionNumber ?? '',
    rollNumber: data.rollNumber ?? academic.rollNumber ?? '', course: data.course ?? data.courseName ?? academic.course ?? '', branch: data.branch ?? data.branchName ?? academic.branch ?? '',
    academicYear: data.academicYear ?? data.academicYearName ?? academic.academicYear ?? '', semester: data.semester ?? data.semesterName ?? academic.semester ?? '', section: data.section ?? data.sectionName ?? academic.section ?? '', batch: data.batch ?? academic.batch ?? '',
  }
}

export const profileApi = {
  getProfile: async () => {
    const response = await request(API_ENDPOINTS.profile.get)
    if (!response?.data) throw new Error('We couldn’t load your profile right now. Please try again.')
    return normalizeProfile(response.data)
  },
  updateProfile: async (profile) => {
    const response = await request(API_ENDPOINTS.profile.update, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: String(profile.fullName || '').trim(),
        email: String(profile.email || '').trim(),
        mobile: String(profile.mobile || '').trim(),
        dateOfBirth: profile.dateOfBirth || null,
        gender: profile.gender || null,
        departmentId: profile.departmentId ? Number(profile.departmentId) : null,
        department: String(profile.department || '').trim() || null,
        designation: String(profile.designation || '').trim() || null,
        houseNumber: String(profile.houseNumber || '').trim() || null,
        address: String(profile.address || '').trim() || null,
        permanentHouseNumber: String(profile.permanentHouseNumber || '').trim() || null,
        permanentAddress: String(profile.permanentAddress || '').trim() || null,
        permanentPincode: String(profile.permanentPincode || '').trim() || null,
        permanentCity: String(profile.permanentCity || '').trim() || null,
        permanentDistrict: String(profile.permanentDistrict || '').trim() || null,
        permanentState: String(profile.permanentState || '').trim() || null,
        pincode: String(profile.pincode || profile.postalCode || '').trim() || null,
        city: String(profile.city || '').trim() || null,
        district: String(profile.district || '').trim() || null,
        state: String(profile.state || '').trim() || null,
        aboutMe: String(profile.bio || profile.aboutMe || '').trim() || null,
      }),
    })
    return normalizeProfile(response?.data || {})
  },
}

const academicYearPayload = (year) => ({
  academicYearName: String(year.name || year.academicYearName || '').trim(),
  startDate: year.startDate,
  endDate: year.endDate,
})

export const academicYearApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.academicYears.list)
    return listResponse(response)
  },
  getById: async (id) => {
    const response = await request(API_ENDPOINTS.academicYears.detail(id))
    return response?.data
  },
  create: async (year) => {
    const response = await request(API_ENDPOINTS.academicYears.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(academicYearPayload(year)),
    })
    return response?.data
  },
  update: async (id, year) => {
    const response = await request(API_ENDPOINTS.academicYears.update(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(academicYearPayload(year)),
    })
    return response?.data
  },
  activate: async (id) => {
    const response = await request(API_ENDPOINTS.academicYears.activate(id), { method: 'PATCH' })
    return response?.data
  },
  deactivate: async (id) => {
    const response = await request(API_ENDPOINTS.academicYears.deactivate(id), { method: 'PATCH' })
    return response?.data
  },
}

const branchPayload = (branch) => ({
  courseId: Number(branch.courseId),
  branchCode: String(branch.code || branch.branchCode || '').trim().toUpperCase(),
  branchName: String(branch.name || branch.branchName || '').trim(),
  shortName: String(branch.shortName || '').trim() || null,
  specialization: branch.specialization || null,
  ...(branch.departmentId ? { departmentId: Number(branch.departmentId) } : {}),
  branchType: branch.branchType || 'Core',
  duration: branch.duration || branch.durationValue ? Number(branch.duration || branch.durationValue) : null,
  totalSemesters: branch.totalSemesters || branch.semesters ? Number(branch.totalSemesters || branch.semesters) : null,
  intakeCapacity: Number(branch.intakeCapacity ?? branch.intake),
  startingAcademicYearId: branch.startingAcademicYearId || null,
  description: String(branch.description || '').trim() || null,
  status: branch.status === 'Inactive' || Number(branch.status) === 0 ? 0 : 1,
})

export const branchApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.branches.list)
    return listResponse(response)
  },
  getByCourse: async (courseId) => {
    const response = await request(API_ENDPOINTS.branches.byCourse(courseId))
    return Array.isArray(response?.data) ? response.data : []
  },
  getById: async (id) => {
    const response = await request(API_ENDPOINTS.branches.detail(id))
    return response?.data
  },
  create: async (branch) => {
    const response = await request(API_ENDPOINTS.branches.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branchPayload(branch)) })
    return response?.data
  },
  update: async (id, branch) => {
    const response = await request(API_ENDPOINTS.branches.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branchPayload(branch)) })
    return response?.data
  },
  updateStatus: async (id, status) => request(API_ENDPOINTS.branches.status(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status === 'Active' || status === 1 || status === true }) }),
}

export const departmentApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.departments.list)
    return listResponse(response)
  },
}

export const courseApi = {
  getAll: async (params) => {
    const response = await request(withQuery(API_ENDPOINTS.courses.list, params))
    return listResponse(response)
  },
  getById: async (id) => (await request(API_ENDPOINTS.courses.detail(id)))?.data,
}

const courseStructurePayload = (structure) => ({
  courseId: Number(structure.courseId),
  branchId: Number(structure.branchId),
  academicYearId: Number(structure.academicYearId),
  yearNumber: Number(structure.yearNumber),
  semesterNumber: Number(structure.semesterNumber),
  semesterName: String(structure.semesterName || `Semester ${structure.semesterNumber}`).trim(),
  ...(structure.status !== undefined ? { status: Number(structure.status) === 0 || structure.status === 'Inactive' ? 0 : 1 } : {}),
})

export const courseStructureApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.courseStructures.list)
    return listResponse(response)
  },
  getByCourse: async (courseId) => {
    const response = await request(API_ENDPOINTS.courseStructures.byCourse(courseId))
    return listResponse(response)
  },
  getById: async (id) => (await request(API_ENDPOINTS.courseStructures.detail(id)))?.data,
  create: async (structure) => (await request(API_ENDPOINTS.courseStructures.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courseStructurePayload(structure)) }))?.data,
  update: async (id, structure) => (await request(API_ENDPOINTS.courseStructures.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courseStructurePayload(structure)) }))?.data,
}

export const sectionAssignmentApi = {
  list: async () => {
    const response = await request(API_ENDPOINTS.sectionAssignments.list)
    return listResponse(response)
  },
  assign: async (sectionId, assignment) => request(API_ENDPOINTS.sections.assignStudents(sectionId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds: [Number(assignment.studentId)] }) }),
  remove: async (sectionId, assignmentId) => {
    await request(API_ENDPOINTS.sections.student(sectionId, assignmentId), { method: 'DELETE' })
  },
  listBySection: async (sectionId) => listResponse(await request(API_ENDPOINTS.sections.students(sectionId))),
}

export const sectionAllocationApi = {
  getTeacher: async (sectionId) => (await request(API_ENDPOINTS.sections.classTeacher(sectionId)))?.data,
  getTeacherCandidates: async (sectionId) => listResponse(await request(API_ENDPOINTS.sections.classTeacherCandidates(sectionId))),
  getFormTeacherCandidates: async (sectionId, sections = []) => {
    if (sectionId) return sectionAllocationApi.getTeacherCandidates(sectionId)
    const sectionIds = [...new Set(sections.map((section) => section.sectionId ?? section.id).filter((id) => Number(id) > 0))]
    const results = await Promise.allSettled(sectionIds.map((id) => sectionAllocationApi.getTeacherCandidates(id)))
    const candidates = new Map()
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      for (const candidate of result.value) {
        if (candidate.employeeProfileId) candidates.set(String(candidate.employeeProfileId), candidate)
      }
    }
    if (results.length && results.every((result) => result.status === 'rejected')) throw results[0].reason
    return [...candidates.values()]
  },
  assignTeacher: async (sectionId, employeeProfileId) => (await request(API_ENDPOINTS.sections.classTeacher(sectionId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeProfileId: Number(employeeProfileId) }) }))?.data,
  removeTeacher: async (sectionId) => request(API_ENDPOINTS.sections.classTeacher(sectionId), { method: 'DELETE' }),
  getCapacity: async (sectionId) => (await request(API_ENDPOINTS.sections.capacity(sectionId)))?.data,
}

const sectionPayload = (section) => ({
  sectionCode: String(section.code || section.sectionCode || '').trim().toUpperCase(),
  sectionName: String(section.name || section.sectionName || '').trim(),
  capacity: Number(section.capacity),
  facultyAdvisorEmployeeProfileId: section.facultyAdvisorEmployeeProfileId || null,
  room: String(section.room || '').trim() || null,
  shift: section.shift || 'Morning',
  sectionType: section.type || section.sectionType || 'Regular',
})

const sectionUpdatePayload = (section) => ({
  sectionCode: String(section.code || section.sectionCode || '').trim().toUpperCase(),
  sectionName: String(section.name || section.sectionName || '').trim(),
  capacity: Number(section.capacity),
  facultyAdvisorEmployeeProfileId: section.facultyAdvisorEmployeeProfileId ? Number(section.facultyAdvisorEmployeeProfileId) : null,
  room: String(section.room || '').trim() || null,
  shift: section.shift || 'Morning',
  sectionType: section.type || section.sectionType || 'Regular',
})

export const sectionApi = {
  getAll: async () => listResponse(await request(API_ENDPOINTS.sections.list)),
  getById: async (id) => (await request(API_ENDPOINTS.sections.detail(id)))?.data,
  create: async (section) => {
    let academicYearId = Number(section.academicYearId || 0)
    if (!academicYearId && section.academicYear) {
      const yearRows = listResponse(await request(API_ENDPOINTS.academicYears.list))
      const selectedYear = yearRows.find((year) => String(year.academicYearName ?? year.name ?? '').trim().toLowerCase() === String(section.academicYear).trim().toLowerCase())
      academicYearId = Number(selectedYear?.academicYearId ?? selectedYear?.id ?? 0)
    }
    const ids = { collegeId: Number(section.collegeId), academicYearId, departmentId: Number(section.departmentId), courseId: Number(section.courseId), branchId: Number(section.branchId), semesterId: Number(section.semesterId) }
    if (Object.values(ids).some((value) => !Number.isInteger(value) || value <= 0)) throw new Error('Select a valid college, academic year, department, course, branch, and semester.')
    const response = await request(API_ENDPOINTS.sections.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sectionPayload(section), ...ids }) })
    const id = response?.data?.sectionId ?? response?.sectionId
    return { ...section, ...(response?.data || {}), id: id || response?.data?.id || section.id }
  },
  update: async (id, section) => { const response = await request(API_ENDPOINTS.sections.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sectionUpdatePayload(section)) }); return { ...section, ...(response?.data || {}), id } },
  remove: async (id) => request(API_ENDPOINTS.sections.remove(id), { method: 'DELETE' }),
  updateStatus: async (id, status) => request(API_ENDPOINTS.sections.status(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status === 'Active' }) }),
  search: async (params) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)); return listResponse(await request(`${API_ENDPOINTS.sections.search}?${query}`)) },
  summary: async () => { const response = await request(API_ENDPOINTS.sections.summary); return response?.data?.data ?? response?.data ?? null },
  validateCapacity: async (sectionId, capacity) => (await request(`${API_ENDPOINTS.sections.validateCapacity}?sectionId=${sectionId}&capacity=${capacity}`))?.data,
}

const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
// API DTOs define academic references as nullable Int64 values.  Form controls
// use an empty string while no option is selected, which cannot be deserialized
// by ASP.NET as a nullable number.  Omit empty values and normalize valid IDs.
const nullableNumericId = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
const normalizeRecord = (source) => dataResponse(source) || {}
export const normalizeAdmission = (source) => {
  const { currentStatus, admissionStatus, applicationStatus, ...record } = normalizeRecord(source)
  return { ...record, status: currentStatus ?? admissionStatus ?? applicationStatus ?? record.status }
}
export const normalizeStudent = (source) => normalizeRecord(source)
export const normalizeStudentProfile = (source) => normalizeRecord(source)
export const normalizeAcademicDetails = (source) => normalizeRecord(source)
export const normalizePreviousEducation = (source) => normalizeRecord(source)
export const normalizeParent = (source) => normalizeRecord(source)
export const normalizeDocument = (source) => normalizeRecord(source)
export const normalizePromotion = (source) => normalizeRecord(source)

// Faculty APIs deliberately keep payloads transparent: the faculty module has
// several independently versioned DTOs (master, profile, attendance, and
// allocations), so callers can pass the schema supplied by the API contract.
const jsonRequest = (url, method, payload) => request(url, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const multipartRequest = (url, form) => request(url, { method: 'POST', body: form })

export const facultyApi = {
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.faculty.list, params))),
  search: async (params) => listData(await request(withQuery(API_ENDPOINTS.faculty.search, params))),
  getById: async (facultyId) => normalizeRecord(await request(API_ENDPOINTS.faculty.detail(requiredId(facultyId, 'Faculty ID')))),
  create: async (payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.faculty.create, 'POST', payload)),
  update: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.faculty.update(requiredId(facultyId, 'Faculty ID')), 'PUT', payload)),
  getWorkload: async (facultyId, params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.faculty.workload(requiredId(facultyId, 'Faculty ID')), params))),
  uploadProfilePhoto: async (facultyId, file, metadata = {}) => {
    if (!(file instanceof File)) throw new Error('Choose a profile photo to upload.')
    const form = new FormData()
    form.append('file', file)
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '').forEach(([key, value]) => form.append(key, String(value)))
    return normalizeRecord(await multipartRequest(API_ENDPOINTS.faculty.profilePhoto(requiredId(facultyId, 'Faculty ID')), form))
  },
  updateStatus: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.faculty.status(requiredId(facultyId, 'Faculty ID')), 'PATCH', typeof payload === 'object' ? payload : { status: payload })),
  getStatusHistory: async (facultyId, params) => listData(await request(withQuery(API_ENDPOINTS.faculty.statusHistory(requiredId(facultyId, 'Faculty ID')), params))),
  getSummary: async (params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.faculty.summary, params))),
}

export const facultyProfileApi = {
  // The faculty master record may exist before its optional extended profile.
  // The current API returns 409 for that state in some deployments; treat it
  // like a normal missing profile while keeping all other failures visible.
  get: async (facultyId) => normalizeRecord(await request(API_ENDPOINTS.facultyProfiles.detail(requiredId(facultyId, 'Faculty ID')), { silentStatuses: [404, 409] })),
  create: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyProfiles.create(requiredId(facultyId, 'Faculty ID')), 'POST', payload)),
  update: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyProfiles.update(requiredId(facultyId, 'Faculty ID')), 'PUT', payload)),
}

export const facultyDocumentApi = {
  getAll: async (facultyId, params) => listData(await request(withQuery(API_ENDPOINTS.facultyDocuments.list(requiredId(facultyId, 'Faculty ID')), params))),
  upload: async (facultyId, file, metadata = {}) => {
    if (!(file instanceof File)) throw new Error('Choose a document to upload.')
    const form = new FormData()
    form.append('file', file)
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '').forEach(([key, value]) => form.append(key, String(value)))
    return normalizeRecord(await multipartRequest(API_ENDPOINTS.facultyDocuments.upload(requiredId(facultyId, 'Faculty ID')), form))
  },
  remove: async (facultyDocumentId) => request(API_ENDPOINTS.facultyDocuments.detail(requiredId(facultyDocumentId, 'Faculty document ID')), { method: 'DELETE' }),
}

export const facultySubjectAllocationApi = {
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.facultySubjectAllocations.list, params))),
  create: async (payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultySubjectAllocations.create, 'POST', payload)),
  update: async (allocationId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultySubjectAllocations.detail(requiredId(allocationId, 'Allocation ID')), 'PUT', payload)),
  remove: async (allocationId) => request(API_ENDPOINTS.facultySubjectAllocations.detail(requiredId(allocationId, 'Allocation ID')), { method: 'DELETE' }),
}

export const facultyAttendanceApi = {
  getDaily: async params => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.daily, params))),
  bulk: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.bulk, 'POST', payload)),
  getWeekly: async params => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.weekly, params))),
  getMonthly: async params => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.monthly, params))),
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.list, params))),
  getById: async (attendanceId) => normalizeRecord(await request(API_ENDPOINTS.facultyAttendance.detail(requiredId(attendanceId, 'Attendance ID')))),
  create: async (payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.create, 'POST', payload)),
  update: async (attendanceId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.update(requiredId(attendanceId, 'Attendance ID')), 'PUT', payload)),
  checkIn: async (attendanceId, payload = {}) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.checkIn(requiredId(attendanceId, 'Attendance ID')), 'POST', payload)),
  checkOut: async (attendanceId, payload = {}) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.checkOut(requiredId(attendanceId, 'Attendance ID')), 'POST', payload)),
  getReports: async (params) => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.reports, params))),
  export: async (params) => blobRequest(withQuery(API_ENDPOINTS.facultyAttendance.export, params)),
}

export const apiAssetUrl = (value) => {
  if (!value || ['string', 'null', 'undefined'].includes(String(value).trim().toLowerCase())) return ''
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  return import.meta.env.DEV ? value : `${base}/${String(value).replace(/^\/+/, '')}`
}

const addressText = (address) => {
  if (typeof address === 'string') return address.trim()
  if (!address || typeof address !== 'object') return undefined
  return [address.line1 ?? address.addressLine1, address.line2 ?? address.addressLine2, address.town ?? address.village, address.city, address.district, address.state, address.pincode ?? address.postalCode].filter(value => value !== undefined && value !== null && String(value).trim() !== '').join(', ')
}

const studentAdmissionPayload = (form = {}) => {
  const currentAddress = form.currentAddress ?? form.contact?.currentAddress
  const permanentAddress = form.permanentAddress ?? form.contact?.permanentAddress
  const parents = form.parents ?? {}
  const personal = form.personal ?? {}
  const contact = form.contact ?? {}
  const academic = form.academic ?? {}
  const admission = form.admission ?? {}
  const fees = form.fees ?? {}
  const previous = form.previousEducation ?? {}
  const application = form.application ?? {}

  return compact({
    registrationNumber: form.registrationNumber ?? application.registrationNumber ?? application.number ?? form.number,
    registrationDate: form.registrationDate ?? application.registrationDate ?? application.date,
    admissionNumber: form.admissionNumber ?? application.admissionNumber,
    admissionDate: form.admissionDate ?? application.admissionDate,
    firstName: form.firstName ?? personal.firstName,
    middleName: form.middleName ?? personal.middleName,
    lastName: form.lastName ?? personal.lastName,
    fullName: form.fullName ?? personal.fullName,
    gender: form.gender ?? personal.gender,
    // Student-admissions Swagger accepts `photo` (not the legacy
    // `profilePhoto` field). Keep the selected data URL in that one
    // contract field so an image upload cannot trigger model validation on
    // deployments that reject unknown JSON properties.
    photo: form.photo ?? personal.photo ?? personal.photoUrl,
    dateOfBirth: form.dateOfBirth ?? form.dob ?? personal.dob ?? personal.dateOfBirth,
    bloodGroup: form.bloodGroup ?? personal.bloodGroup,
    nationality: form.nationality ?? personal.nationality,
    aadhaarNumber: form.aadhaarNumber ?? form.aadhaar ?? personal.aadhaar ?? personal.aadhaarNumber,
    mobile: form.mobile ?? contact.mobile,
    alternateMobile: form.alternateMobile ?? contact.alternateMobile,
    email: form.email ?? contact.email,
    alternateEmail: form.alternateEmail ?? contact.alternateEmail,
    sameAddress: form.sameAddress ?? contact.sameAddress,
    currentAddress,
    permanentAddress,
    currentAddressLine1: currentAddress?.line1 ?? currentAddress?.addressLine1,
    currentAddressLine2: currentAddress?.line2 ?? currentAddress?.addressLine2,
    currentTown: currentAddress?.town ?? currentAddress?.village ?? currentAddress?.townVillage,
    currentCity: currentAddress?.city,
    currentDistrict: currentAddress?.district,
    currentState: currentAddress?.state,
    currentCountry: currentAddress?.country,
    currentPincode: currentAddress?.pincode ?? currentAddress?.postalCode,
    permanentAddressLine1: permanentAddress?.line1 ?? permanentAddress?.addressLine1,
    permanentAddressLine2: permanentAddress?.line2 ?? permanentAddress?.addressLine2,
    permanentTown: permanentAddress?.town ?? permanentAddress?.village ?? permanentAddress?.townVillage,
    permanentCity: permanentAddress?.city,
    permanentDistrict: permanentAddress?.district,
    permanentState: permanentAddress?.state,
    permanentCountry: permanentAddress?.country,
    permanentPincode: permanentAddress?.pincode ?? permanentAddress?.postalCode,
    addressLine1: currentAddress?.line1 ?? currentAddress?.addressLine1,
    addressLine2: currentAddress?.line2 ?? currentAddress?.addressLine2,
    town: currentAddress?.town ?? currentAddress?.village,
    address: form.address ?? addressText(currentAddress),
    city: form.city ?? currentAddress?.city,
    district: form.district ?? currentAddress?.district,
    state: form.state ?? currentAddress?.state,
    country: form.country ?? currentAddress?.country ?? 'India',
    pincode: form.pincode ?? currentAddress?.pincode ?? currentAddress?.postalCode,
    admissionType: form.admissionType ?? academic.admissionType,
    academicYearId: nullableNumericId(form.academicYearId ?? academic.academicYearId),
    departmentId: nullableNumericId(form.departmentId ?? academic.departmentId),
    courseId: nullableNumericId(form.courseId ?? academic.courseId),
    branchId: nullableNumericId(form.branchId ?? academic.branchId),
    semesterId: nullableNumericId(form.semesterId ?? academic.semesterId),
    sectionId: nullableNumericId(form.sectionId ?? academic.sectionId),
    quota: form.quota ?? academic.quota,
    quotaOther: form.quotaOther ?? academic.quotaOther,
    courseCode: form.courseCode ?? academic.courseCode,
    branchCode: form.branchCode ?? academic.branchCode,
    entryType: form.entryType ?? academic.entryType,
    regulation: form.regulation ?? academic.regulation,
    studentCategory: form.studentCategory ?? academic.studentCategory,
    collegeId: nullableNumericId(form.collegeId ?? admission.collegeId),
    college: form.college ?? admission.college,
    batch: form.batch ?? admission.batch,
    fatherName: form.fatherName ?? parents.father?.name ?? form.father?.name,
    parentMobile: form.parentMobile ?? form.fatherMobile ?? parents.father?.mobile ?? form.father?.mobile,
    fatherMobile: form.fatherMobile ?? form.parentMobile ?? parents.father?.mobile ?? form.father?.mobile,
    fatherEmail: form.fatherEmail ?? parents.father?.email ?? form.father?.email,
    fatherOccupation: form.fatherOccupation ?? form.occupation ?? parents.father?.occupation ?? form.father?.occupation,
    fatherQualification: form.fatherQualification ?? parents.father?.qualification ?? form.father?.qualification,
    fatherIncome: form.fatherIncome ?? form.annualIncome ?? parents.father?.income ?? form.father?.income,
    motherName: form.motherName ?? parents.mother?.name ?? form.mother?.name,
    motherMobile: form.motherMobile ?? parents.mother?.mobile ?? form.mother?.mobile,
    motherEmail: form.motherEmail ?? parents.mother?.email ?? form.mother?.email,
    motherOccupation: form.motherOccupation ?? parents.mother?.occupation ?? form.mother?.occupation,
    motherQualification: form.motherQualification ?? parents.mother?.qualification ?? form.mother?.qualification,
    motherIncome: form.motherIncome ?? parents.mother?.income ?? form.mother?.income,
    guardianName: form.guardianName ?? parents.guardian?.name ?? form.guardian?.name,
    guardianRelationship: form.guardianRelationship ?? parents.guardian?.relationship ?? form.guardian?.relationship,
    guardianRelationshipOther: form.guardianRelationshipOther ?? parents.guardian?.relationshipOther ?? form.guardian?.relationshipOther,
    guardianMobile: form.guardianMobile ?? parents.guardian?.mobile ?? form.guardian?.mobile,
    guardianEmail: form.guardianEmail ?? parents.guardian?.email ?? form.guardian?.email,
    guardianOccupation: form.guardianOccupation ?? parents.guardian?.occupation ?? form.guardian?.occupation,
    guardianQualification: form.guardianQualification ?? parents.guardian?.qualification ?? form.guardian?.qualification,
    guardianIncome: form.guardianIncome ?? parents.guardian?.income ?? form.guardian?.income,
    primaryContact: form.primaryContact ?? parents.primaryContact,
    emergencyMobile: form.emergencyMobile ?? form.emergencyContact ?? parents.emergencyMobile,
    tenth: educationRecordPayload(form.tenth ?? previous.tenth),
    qualifyingEducation: educationRecordPayload(form.qualifyingEducation ?? form.intermediate ?? previous.intermediate),
    scholarship: form.scholarship ?? admission.scholarship,
    scholarshipType: form.scholarshipType ?? admission.scholarshipType,
    hostel: form.hostel ?? admission.hostel,
    hostelPreference: form.hostelPreference ?? admission.hostelPreference,
    hostelRoomType: form.hostelRoomType ?? admission.hostelRoomType,
    transport: form.transport ?? admission.transport,
    transportRoute: form.transportRoute ?? admission.transportRoute,
    feeStructureId: form.feeStructureId ?? fees.feeStructureId ?? fees.structureId,
    tuitionFee: form.tuitionFee ?? fees.tuitionFee,
    admissionFee: form.admissionFee ?? fees.admissionFee,
    scholarshipAmount: form.scholarshipAmount ?? fees.scholarshipAmount,
    hostelFee: form.hostelFee ?? fees.hostelFee,
    transportFee: form.transportFee ?? fees.transportFee,
    totalFee: form.totalFee ?? fees.totalFee,
    paymentPlan: form.paymentPlan ?? fees.paymentPlan,
    paymentStatus: form.paymentStatus ?? fees.paymentStatus,
    documentStatuses: form.documentStatuses ?? (form.documents ? Object.fromEntries(Object.entries(form.documents).filter(([, value]) => value && !Array.isArray(value)).map(([key, value]) => [key, typeof value === 'object' ? value.status ?? '' : value])) : undefined),
  })
}

const academicDetailsPayload = (form = {}) => compact({
  collegeId: nullableNumericId(form.collegeId ?? form.academic?.collegeId ?? form.admission?.collegeId),
  academicYearId: nullableNumericId(form.academicYearId ?? form.academic?.academicYearId),
  departmentId: nullableNumericId(form.departmentId ?? form.academic?.departmentId),
  courseId: nullableNumericId(form.courseId ?? form.academic?.courseId),
  branchId: nullableNumericId(form.branchId ?? form.academic?.branchId),
  semesterId: nullableNumericId(form.semesterId ?? form.academic?.semesterId),
  sectionId: nullableNumericId(form.sectionId ?? form.academic?.sectionId),
  admissionType: form.admissionType ?? form.academic?.admissionType,
  quota: form.quota ?? form.academic?.quota,
  quotaOther: form.quotaOther ?? form.academic?.quotaOther,
  courseCode: form.courseCode ?? form.academic?.courseCode,
  branchCode: form.branchCode ?? form.academic?.branchCode,
  entryType: form.entryType ?? form.academic?.entryType,
  regulation: form.regulation ?? form.academic?.regulation,
  studentCategory: form.studentCategory ?? form.academic?.studentCategory,
  batch: form.batch ?? form.academic?.batch ?? form.admission?.batch,
})

const educationRecordPayload = (record) => {
  if (!record || typeof record !== 'object') return record
  const score = record.score
  // ASP.NET nullable Decimal fields accept null, but cannot deserialize an
  // empty form-control string (e.g. an optional SSC percentage).
  return {
    ...record,
    score: score === undefined || score === null || String(score).trim() === '' ? null : Number(score),
  }
}

const previousEducationPayload = (form = {}) => compact({
  tenth: educationRecordPayload(form.tenth ?? form.previousEducation?.tenth),
  qualifyingEducation: educationRecordPayload(form.qualifyingEducation ?? form.intermediate ?? form.previousEducation?.intermediate),
  intermediate: educationRecordPayload(form.intermediate ?? form.qualifyingEducation ?? form.previousEducation?.intermediate),
})

const parentPayload = (form = {}) => compact({
  fatherName: form.fatherName ?? form.father?.name ?? form.parents?.father?.name,
  motherName: form.motherName ?? form.mother?.name ?? form.parents?.mother?.name,
  guardianName: form.guardianName ?? form.guardian?.name ?? form.parents?.guardian?.name,
  guardianRelationship: form.guardianRelationship ?? form.guardian?.relationship ?? form.parents?.guardian?.relationship,
  guardianRelationshipOther: form.guardianRelationshipOther ?? form.guardian?.relationshipOther ?? form.parents?.guardian?.relationshipOther,
  primaryContact: form.primaryContact ?? form.parents?.primaryContact,
  emergencyMobile: form.emergencyMobile ?? form.emergencyContact ?? form.parents?.emergencyMobile,
  parentMobile: form.parentMobile ?? form.fatherMobile ?? form.father?.mobile ?? form.parents?.father?.mobile,
  fatherMobile: form.fatherMobile ?? form.parentMobile ?? form.father?.mobile ?? form.parents?.father?.mobile,
  email: form.email ?? form.fatherEmail ?? form.father?.email ?? form.parents?.father?.email,
  fatherEmail: form.fatherEmail ?? form.email ?? form.father?.email ?? form.parents?.father?.email,
  fatherOccupation: form.fatherOccupation ?? form.occupation ?? form.father?.occupation ?? form.parents?.father?.occupation,
  fatherQualification: form.fatherQualification ?? form.father?.qualification ?? form.parents?.father?.qualification,
  fatherIncome: form.fatherIncome ?? form.annualIncome ?? form.father?.income ?? form.parents?.father?.income,
  motherMobile: form.motherMobile ?? form.mother?.mobile ?? form.parents?.mother?.mobile,
  motherEmail: form.motherEmail ?? form.mother?.email ?? form.parents?.mother?.email,
  motherOccupation: form.motherOccupation ?? form.mother?.occupation ?? form.parents?.mother?.occupation,
  motherQualification: form.motherQualification ?? form.mother?.qualification ?? form.parents?.mother?.qualification,
  motherIncome: form.motherIncome ?? form.mother?.income ?? form.parents?.mother?.income,
  guardianMobile: form.guardianMobile ?? form.guardian?.mobile ?? form.parents?.guardian?.mobile,
  guardianEmail: form.guardianEmail ?? form.guardian?.email ?? form.parents?.guardian?.email,
  guardianOccupation: form.guardianOccupation ?? form.guardian?.occupation ?? form.parents?.guardian?.occupation,
  guardianQualification: form.guardianQualification ?? form.guardian?.qualification ?? form.parents?.guardian?.qualification,
  guardianIncome: form.guardianIncome ?? form.guardian?.income ?? form.parents?.guardian?.income,
  address: form.address ?? form.parents?.address,
})

export const studentAdmissionApi = {
  getAll: async (params) => markApiResult((listData(await request(withQuery(API_ENDPOINTS.studentAdmissions.list, params))) || []).map(normalizeAdmission)),
  getById: async (id) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.detail(requiredId(id, 'Admission ID')))),
  create: async (form) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentAdmissionPayload(form)) })),
  update: async (id, form) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.update(requiredId(id, 'Admission ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentAdmissionPayload(form)) })),
  submit: async (id) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.submit(requiredId(id, 'Admission ID')), { method: 'POST' })),
}
export const studentAcademicDetailsApi = {
  get: async (id) => normalizeAcademicDetails(await request(API_ENDPOINTS.studentAdmissions.academicDetails(requiredId(id, 'Admission ID')))),
  update: async (id, form) => {
    const admissionId = requiredId(id, 'Admission ID')
    const payload = academicDetailsPayload(form)
    return normalizeAcademicDetails(await request(API_ENDPOINTS.studentAdmissions.academicDetails(admissionId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))
  },
}
export const studentAcademicInformationApi = {
  getById: async (id) => normalizeAcademicDetails(await request(API_ENDPOINTS.studentAcademicInformation.detail(requiredId(id, 'Academic ID')))),
  update: async (id, payload) => normalizeAcademicDetails(await request(API_ENDPOINTS.studentAcademicInformation.update(requiredId(id, 'Academic ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
}
export const studentAdmissionStatusApi = {
  get: async (id) => {
    const reqId = requiredId(id, 'Admission ID')
    return normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.status(reqId), { cache: 'no-store' }))
  },
  update: async (id, payload) => {
    const reqId = requiredId(id, 'Admission ID')
    const newStatus = payload.newStatus ?? payload.status
    const body = { newStatus, remarks: payload.remarks, rejectionReason: payload.rejectionReason ?? (newStatus === 'REJECTED' ? payload.remarks : undefined) }
    let res
    try {
      const approving = newStatus === 'APPROVED'
      res = normalizeAdmission(await request(approving ? API_ENDPOINTS.studentAdmissions.approve(reqId) : API_ENDPOINTS.studentAdmissions.status(reqId), { method: approving ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approving ? { remarks: payload.remarks } : body) }))
    } catch (error) {
      if (error.status >= 500) {
        error.message = `The admission server failed to update this application (HTTP ${error.status}). The decision could not be confirmed.${error.correlationId ? ` Reference: ${error.correlationId}.` : ''} Refresh to check its status and contact the administrator before retrying.`
      }
      throw error
    }
    let latest
    try {
      latest = await studentAdmissionStatusApi.get(reqId)
    } catch (error) {
      error.message = `The server accepted the admission decision, but the updated status could not be loaded. Refresh to verify before retrying. ${error.message}`
      throw error
    }
    if (String(latest.status || '').trim().replaceAll(' ', '_').toUpperCase() !== newStatus) {
      throw new Error(`Admission status was not confirmed as ${newStatus}. Current backend status: ${latest.status || 'unknown'}. Refresh and try again.`)
    }
    return normalizeRecord({ ...res, ...latest })
  },
}
export const studentPreviousEducationApi = {
  get: async (id) => normalizePreviousEducation(await request(API_ENDPOINTS.studentAdmissions.previousEducation(requiredId(id, 'Admission ID')))),
  update: async (id, form) => normalizePreviousEducation(await request(API_ENDPOINTS.studentAdmissions.previousEducation(requiredId(id, 'Admission ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previousEducationPayload(form)) })),
}
export const studentFeeApi = {
  getSummary: async (id) => normalizeRecord(await request(API_ENDPOINTS.studentAdmissions.feeSummary(requiredId(id, 'Admission ID')))),
  getStructure: async (id) => normalizeRecord(await request(API_ENDPOINTS.studentAdmissions.feeStructure(requiredId(id, 'Admission ID')))),
}
export const studentApi = {
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.students.list, params))), search: async (params) => listData(await request(withQuery(API_ENDPOINTS.students.search, params))),
  getById: async (id) => normalizeStudent(await request(API_ENDPOINTS.students.detail(requiredId(id, 'Student ID')))),
  create: async (payload) => normalizeStudent(await request(API_ENDPOINTS.students.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  update: async (id, payload) => normalizeStudent(await request(API_ENDPOINTS.students.update(requiredId(id, 'Student ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  updateStatus: async (id, status) => normalizeStudent(await request(API_ENDPOINTS.students.status(requiredId(id, 'Student ID')), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(typeof status === 'object' ? status : { status }) })),
}
export const studentParentApi = { get: async (id) => normalizeParent(await request(API_ENDPOINTS.students.parent(requiredId(id, 'Student ID')))), update: async (id, form) => normalizeParent(await request(API_ENDPOINTS.students.parent(requiredId(id, 'Student ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parentPayload(form)) })) }
export const studentDocumentApi = {
  getAll: async (id) => listData(await request(API_ENDPOINTS.students.documents(requiredId(id, 'Student ID')))),
  upload: async (id, file, metadata = {}) => { if (!(file instanceof File)) throw new Error('Choose a document to upload.'); const form = new FormData(); form.append('file', file); Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '').forEach(([key, value]) => form.append(key, String(value))); return normalizeDocument(await request(API_ENDPOINTS.students.documents(requiredId(id, 'Student ID')), { method: 'POST', body: form })) },
  get: async (studentId, documentId) => blobRequest(API_ENDPOINTS.students.document(requiredId(studentId, 'Student ID'), requiredId(documentId, 'Document ID'))),
  remove: async (studentId, documentId) => request(API_ENDPOINTS.students.document(requiredId(studentId, 'Student ID'), requiredId(documentId, 'Document ID')), { method: 'DELETE' }),
  download: async (studentId, documentId) => blobRequest(API_ENDPOINTS.students.downloadDocument(requiredId(studentId, 'Student ID'), requiredId(documentId, 'Document ID'))),
}
export const studentProfileApi = {
  getPersonalInformation: async (id) => normalizeStudentProfile(await request(API_ENDPOINTS.students.personalInformation(requiredId(id, 'Student ID')))),
  updatePersonalInformation: async (id, payload) => normalizeStudentProfile(await request(API_ENDPOINTS.students.personalInformation(requiredId(id, 'Student ID')), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getExamResults: async (id) => listData(await request(API_ENDPOINTS.students.examResults(requiredId(id, 'Student ID')))), getMyProfile: async () => normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.myProfile)),
}

export const studentProfilesApi = {
  getAll: async (params) => markApiResult((listData(await request(withQuery(API_ENDPOINTS.studentProfiles.list, params))) || []).map(normalizeStudentProfile)),
  preview: async (id) => markApiResult(normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.preview(requiredId(id, 'Student ID'))))),
  update: async (id, payload) => normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.update(requiredId(id, 'Student ID')), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
}
export const studentPromotionApi = {
  getDashboard: async () => normalizePromotion(await request(API_ENDPOINTS.promotions.dashboard)), getDirectory: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.directory, params))), getHistory: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.history, params))),
  getEligibleStudents: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.eligibleStudents, params))), getEligibility: async (id) => normalizePromotion(await request(API_ENDPOINTS.promotions.eligibility(requiredId(id, 'Student ID')))),
  updateEligibilityStatus: async (id, eligibilityStatus) => normalizePromotion(await request(withQuery(API_ENDPOINTS.promotions.eligibilityStatus(requiredId(id, 'Student ID')), { eligibilityStatus }), { method: 'PUT' })),
  promote: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promote, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  promoteBulk: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promoteBulk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  promoteBulkAtomic: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promoteBulkAtomic, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getPromotedStudents: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.promotedStudents, params))), getStudentHistory: async (id) => listData(await request(API_ENDPOINTS.promotions.studentHistory(requiredId(id, 'Student ID')))), getHistoryByStudent: async (id) => listData(await request(API_ENDPOINTS.promotions.historyByStudent(requiredId(id, 'Student ID')))),
}
export const studentAttendanceApi = {
  list: async (params) => listData(await request(withQuery(API_ENDPOINTS.studentAttendance.list, params))),
  create: async (payload) => normalizeRecord(await request(API_ENDPOINTS.studentAttendance.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getStudentStats: async (studentId) => normalizeRecord(await request(API_ENDPOINTS.studentAttendance.studentStats(requiredId(studentId, 'Student ID')))),
}
export const resultsApi = {
  list: async (params) => listData(await request(withQuery(API_ENDPOINTS.results.list, params))),
  create: async (payload) => normalizeRecord(await request(API_ENDPOINTS.results.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getTranscript: async (studentId) => normalizeRecord(await request(API_ENDPOINTS.results.transcript(requiredId(studentId, 'Student ID')))),
}

export async function lookupIndianPincode(pincode) {
  let response
  try {
    const base = import.meta.env.DEV ? '/postal-lookup' : 'https://api.postalpincode.in'
    response = await fetch(`${base}/pincode/${encodeURIComponent(pincode)}`)
  } catch {
    throw new Error('PIN-code lookup is unavailable. Enter the address manually.')
  }
  if (!response.ok) throw new Error('Unable to verify this PIN code.')
  const [result] = await response.json()
  const offices = result?.PostOffice
  if (result?.Status !== 'Success' || !offices?.length) throw new Error('No Indian postal location was found for this PIN code.')
  const primary = offices[0]
  return { town: primary.Name || '', city: primary.Block || primary.District || primary.Name || '', district: primary.District || '', state: primary.State || '' }
}

export default API_ENDPOINTS

export const facultyLeaveApi = {
  getRequests: async params => listData(await request(withQuery(API_ENDPOINTS.facultyLeave.requests, params))),
  createRequest: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.requests, 'POST', payload)),
  getRequest: async id => normalizeRecord(await request(API_ENDPOINTS.facultyLeave.request(requiredId(id, 'Request ID')))),
  approve: async id => request(API_ENDPOINTS.facultyLeave.approve(requiredId(id, 'Request ID')), { method: 'PUT' }),
  reject: async (id, rejectionReason) => jsonRequest(API_ENDPOINTS.facultyLeave.reject(requiredId(id, 'Request ID')), 'PUT', { rejectionReason }),
  getHistory: async params => listData(await request(withQuery(API_ENDPOINTS.facultyLeave.history, params))),
  getBalances: async params => listData(await request(withQuery(API_ENDPOINTS.facultyLeave.balances, params))),
  getTypes: async params => listData(await request(withQuery(API_ENDPOINTS.facultyLeave.types, params))),
  createType: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.types, 'POST', payload)),
  updateType: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.type(requiredId(id, 'Leave type ID')), 'PUT', payload)),
  getPolicies: async params => listData(await request(withQuery(API_ENDPOINTS.facultyLeave.policies, params))),
  createPolicy: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.policies, 'POST', payload)),
  updatePolicy: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.policy(requiredId(id, 'Policy ID')), 'PUT', payload)),
  activatePolicy: async id => request(API_ENDPOINTS.facultyLeave.activate(requiredId(id, 'Policy ID')), { method: 'POST' }),
}
export const facultyPayrollApi = {
  getAll: async params => listData(await request(withQuery(API_ENDPOINTS.facultyPayroll.list, params))),
  getById: async id => normalizeRecord(await request(API_ENDPOINTS.facultyPayroll.detail(requiredId(id, 'Payroll ID')))),
  getSalaryRecords: async params => listData(await request(withQuery(API_ENDPOINTS.facultyPayroll.salaries, params))),
  getPayslips: async params => listData(await request(withQuery(API_ENDPOINTS.facultyPayroll.payslips, params))),
  hold: async (id, reason) => jsonRequest(API_ENDPOINTS.facultyPayroll.hold(requiredId(id, 'Payroll ID')), 'PUT', { reason }),
  export: async params => blobRequest(withQuery(API_ENDPOINTS.facultyPayroll.export, params)),
}

export const facultyMasterApi = {
  getSemesters: async () => listData(await request(endpoint('/api/semester'))),
  getColleges: async () => listData(await request(endpoint('/api/v1/colleges'))),
  getSubjects: async params => listData(await request(withQuery(endpoint('/api/v1/subjects'), params))),
}
