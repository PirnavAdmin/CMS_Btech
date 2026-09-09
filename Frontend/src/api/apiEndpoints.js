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

export const API_BASE_URL = import.meta.env.DEV
  ? ''
  : normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

const AUTH_LOGIN_URL = normalizeBaseUrl(import.meta.env.VITE_AUTH_API_URL)
// Development uses Vite's configured /api proxy, so an explicit absolute
// login URL is only mandatory for a production build.
const hasConfiguredAuthLoginUrl = import.meta.env.DEV || Boolean(AUTH_LOGIN_URL || API_BASE_URL)

const endpoint = (path) => `${API_BASE_URL}${path}`

export class AuthRequestError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
  }
}

export const API_ENDPOINTS = Object.freeze({
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
    list: endpoint('/api/v1/student-admissions'), create: endpoint('/api/v1/student-admissions'),
    detail: (id) => endpoint(`/api/v1/student-admissions/${id}`), update: (id) => endpoint(`/api/v1/student-admissions/${id}`),
    academicDetails: (id) => endpoint(`/api/v1/student-admissions/${id}/academic-details`),
    previousEducation: (id) => endpoint(`/api/v1/student-admissions/${id}/previous-education`),
    status: (id) => endpoint(`/api/admissions/${id}/status`), submit: (id) => endpoint(`/api/v1/student-admissions/${id}/submit`),
    approve: (id) => endpoint(`/api/Admissions/${id}/approve`),
    reject: (id) => endpoint(`/api/Admissions/${id}/reject`),
    history: (id) => endpoint(`/api/Admissions/${id}/history`),
    statusHistory: (id) => endpoint(`/api/admissions/${id}/status-history`),
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
  promotions: Object.freeze({
    dashboard: endpoint('/api/v1/promotions/dashboard'), directory: endpoint('/api/v1/promotions/directory'), history: endpoint('/api/v1/promotions/history'),
    eligibleStudents: endpoint('/api/v1/promotions/eligible-students'), eligibility: (id) => endpoint(`/api/v1/promotions/student-eligibility/${id}`), eligibilityStatus: (id) => endpoint(`/api/v1/promotions/eligibility-status/${id}`),
    promote: endpoint('/api/v1/promotions/promote'), promoteBulk: endpoint('/api/v1/promotions/promote-bulk'), promotedStudents: endpoint('/api/v1/promotions/promoted-students'),
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
    const list = current.items ?? current.content ?? current.results ?? current.records
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
    console.error('API request failed', { url, method: options.method || 'GET', status: response.status })
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
    throw new Error(validationMessage(body) || fallback)
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
  if (!response.ok) { const body = await readBody(response); throw new Error(validationMessage(body) || 'The document request could not be completed.') }
  return { blob: await response.blob(), contentDisposition: response.headers.get('content-disposition') || '', contentType: response.headers.get('content-type') || '' }
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
  departmentId: Number(branch.departmentId),
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

const studentAdmissionPayload = (form) => compact({
  registrationNumber: form.registrationNumber ?? form.application?.registrationNumber ?? form.application?.number,
  registrationDate: form.registrationDate ?? form.application?.date,
  firstName: form.firstName ?? form.personal?.firstName, middleName: form.middleName ?? form.personal?.middleName,
  lastName: form.lastName ?? form.personal?.lastName, gender: form.gender ?? form.personal?.gender,
  photo: form.photo ?? form.personal?.photo,
  dateOfBirth: form.dateOfBirth ?? form.personal?.dob, bloodGroup: form.bloodGroup ?? form.personal?.bloodGroup,
  nationality: form.nationality ?? form.personal?.nationality, aadhaarNumber: form.aadhaarNumber ?? form.personal?.aadhaar,
  mobile: form.mobile ?? form.contact?.mobile, alternateMobile: form.alternateMobile ?? form.contact?.alternateMobile,
  email: form.email ?? form.contact?.email, alternateEmail: form.alternateEmail ?? form.contact?.alternateEmail,
  currentAddress: form.currentAddress ?? form.contact?.currentAddress, permanentAddress: form.permanentAddress ?? form.contact?.permanentAddress,
  admissionType: form.admissionType ?? form.academic?.admissionType,
  collegeId: form.collegeId ?? form.admission?.collegeId,
  college: form.college ?? form.admission?.college,
  feeStructureId: form.feeStructureId ?? form.fees?.feeStructureId ?? form.fees?.structureId,
  admissionFee: form.admissionFee ?? form.fees?.admissionFee,
  paymentPlan: form.paymentPlan ?? form.fees?.paymentPlan,
  documentStatuses: form.documentStatuses ?? Object.fromEntries(Object.entries(form.documents || {}).filter(([, value]) => value && !Array.isArray(value)).map(([key, value]) => [key, typeof value === 'object' ? value.status ?? '' : value])),
})
const academicDetailsPayload = (form) => compact({
  collegeId: form.collegeId ?? form.academic?.collegeId, academicYearId: form.academicYearId ?? form.academic?.academicYearId,
  departmentId: form.departmentId ?? form.academic?.departmentId, courseId: form.courseId ?? form.academic?.courseId,
  branchId: form.branchId ?? form.academic?.branchId, semesterId: form.semesterId ?? form.academic?.semesterId,
  admissionType: form.admissionType ?? form.academic?.admissionType,
  quota: form.quota ?? form.academic?.quota,
  quotaOther: form.quotaOther ?? form.academic?.quotaOther,
  courseCode: form.courseCode ?? form.academic?.courseCode,
  branchCode: form.branchCode ?? form.academic?.branchCode,
  entryType: form.entryType ?? form.academic?.entryType,
  regulation: form.regulation ?? form.academic?.regulation, batch: form.batch ?? form.admission?.batch,
})
const previousEducationPayload = (form) => compact({
  tenth: form.tenth ?? form.previousEducation?.tenth, qualifyingEducation: form.qualifyingEducation ?? form.intermediate ?? form.previousEducation?.intermediate,
})
const parentPayload = (form) => compact({
  fatherName: form.fatherName ?? form.father?.name ?? form.parents?.father?.name, motherName: form.motherName ?? form.mother?.name ?? form.parents?.mother?.name,
  guardianName: form.guardianName ?? form.guardian?.name ?? form.parents?.guardian?.name, guardianRelationship: form.guardianRelationship ?? form.guardian?.relationship ?? form.parents?.guardian?.relationship,
  parentMobile: form.parentMobile ?? form.father?.mobile ?? form.parents?.father?.mobile,
  email: form.email ?? form.father?.email ?? form.parents?.father?.email, fatherOccupation: form.fatherOccupation ?? form.father?.occupation ?? form.parents?.father?.occupation,
  fatherQualification: form.fatherQualification ?? form.father?.qualification ?? form.parents?.father?.qualification, fatherIncome: form.fatherIncome ?? form.father?.income ?? form.parents?.father?.income,
  motherMobile: form.motherMobile ?? form.mother?.mobile ?? form.parents?.mother?.mobile, motherEmail: form.motherEmail ?? form.mother?.email ?? form.parents?.mother?.email,
  motherOccupation: form.motherOccupation ?? form.mother?.occupation ?? form.parents?.mother?.occupation, motherQualification: form.motherQualification ?? form.mother?.qualification ?? form.parents?.mother?.qualification, motherIncome: form.motherIncome ?? form.mother?.income ?? form.parents?.mother?.income,
  guardianMobile: form.guardianMobile ?? form.guardian?.mobile ?? form.parents?.guardian?.mobile, guardianEmail: form.guardianEmail ?? form.guardian?.email ?? form.parents?.guardian?.email,
  guardianOccupation: form.guardianOccupation ?? form.guardian?.occupation ?? form.parents?.guardian?.occupation, guardianQualification: form.guardianQualification ?? form.guardian?.qualification ?? form.parents?.guardian?.qualification, guardianIncome: form.guardianIncome ?? form.guardian?.income ?? form.parents?.guardian?.income, address: form.address ?? form.parents?.address,
})

const LOCAL_ADMISSIONS_KEY = 'pirnav-local-admissions-v2'
const readLocalAdmissions = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_ADMISSIONS_KEY)) || [] } catch { return [] }
}
const saveLocalAdmission = (item, baseForm = null) => {
  if (!item && !baseForm) return item
  const id = item?.admissionId ?? item?.id ?? baseForm?.admissionId ?? baseForm?.id
  if (!id) return item
  try {
    const list = readLocalAdmissions()
    const idStr = String(id)
    const regStr = String(item?.application?.registrationNumber || item?.registrationNumber || baseForm?.application?.registrationNumber || baseForm?.registrationNumber || '')
    const index = list.findIndex(x => String(x.admissionId ?? x.id) === idStr || (regStr && String(x.application?.registrationNumber || x.registrationNumber || '') === regStr))
    const existing = index >= 0 ? list[index] : {}

    const deepMerge = (target, source) => {
      if (!source || typeof source !== 'object') return target || {}
      if (!target || typeof target !== 'object') return source || {}
      const res = { ...target }
      for (const key of Object.keys(source)) {
        const sourceValue = source[key]
        const invalidObjectText = typeof sourceValue === 'string' && /^\s*\[object Object\]\s*$/i.test(sourceValue)
        if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '' && !invalidObjectText) {
          if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
            res[key] = deepMerge(target[key], source[key])
          } else {
            res[key] = source[key]
          }
        }
      }
      return res
    }

    let merged = deepMerge(existing, baseForm)
    merged = deepMerge(merged, item)
    merged.id = id
    merged.admissionId = id
    merged.updatedAt = new Date().toISOString()

    let nextList
    if (index >= 0) {
      nextList = list.map((x, i) => i === index ? merged : x)
    } else {
      nextList = [merged, ...list]
    }
    localStorage.setItem(LOCAL_ADMISSIONS_KEY, JSON.stringify(nextList))
    return merged
  } catch (err) {
    console.warn('Failed to persist local admission', err)
  }
  return item
}

export const studentAdmissionApi = {
  getAll: async (params) => {
    let apiItems = []
    let apiSuccess = false
    try {
      const res = await request(withQuery(API_ENDPOINTS.studentAdmissions.list, params))
      apiItems = listData(res) || []
      apiSuccess = true
    } catch {
      apiItems = []
    }
    if (apiSuccess) {
      return markApiResult(apiItems.map(normalizeAdmission))
    }
    const localItems = readLocalAdmissions()
    return localItems.map(normalizeAdmission)
  },
  getById: async (id) => {
    const reqId = requiredId(id, 'Admission ID')
    try {
      const res = normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.detail(reqId)))
      saveLocalAdmission(res)
      return normalizeAdmission(res)
    } catch (err) {
      const localItems = readLocalAdmissions()
      const found = localItems.find(x => String(x.admissionId ?? x.id) === String(id) || String(x.application?.registrationNumber || x.registrationNumber || '') === String(id))
      if (found) return normalizeAdmission(found)
      throw err
    }
  },
  create: async (form) => {
    let res
    try {
      res = normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentAdmissionPayload(form)) }))
    } catch {
      res = normalizeAdmission({ ...form, id: form.id || `LOCAL-ADM-${Date.now()}`, status: 'DRAFT', createdAt: new Date().toISOString() })
    }
    const saved = saveLocalAdmission(res, form)
    return normalizeAdmission(saved || { ...form, ...res })
  },
  update: async (id, form) => {
    const reqId = requiredId(id, 'Admission ID')
    let res
    try {
      res = normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.update(reqId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentAdmissionPayload(form)) }))
    } catch {
      res = normalizeAdmission({ ...form, id, updatedAt: new Date().toISOString() })
    }
    const saved = saveLocalAdmission(res, form)
    return normalizeAdmission(saved || { ...form, ...res })
  },
  submit: async (id) => {
    const reqId = requiredId(id, 'Admission ID')
    let res
    try {
      res = normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.submit(reqId), { method: 'POST' }))
    } catch {
      res = { id, status: 'SUBMITTED', updatedAt: new Date().toISOString() }
    }
    const localItems = readLocalAdmissions()
    const found = localItems.find(x => String(x.admissionId ?? x.id) === String(id))
    const updated = saveLocalAdmission({ ...(found || {}), ...res, id, status: 'SUBMITTED', updatedAt: new Date().toISOString() })
    return normalizeAdmission(updated)
  },
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
  history: async (id) => listData(await request(API_ENDPOINTS.studentAdmissions.history(requiredId(id, 'Admission ID')), { cache: 'no-store' })),
  statusHistory: async (id) => listData(await request(API_ENDPOINTS.studentAdmissions.statusHistory(requiredId(id, 'Admission ID')), { cache: 'no-store' })),
  get: async (id) => {
    const reqId = requiredId(id, 'Admission ID')
    return normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.status(reqId), { cache: 'no-store' }))
  },
  update: async (id, payload) => {
    const reqId = requiredId(id, 'Admission ID')
    const newStatus = payload.newStatus ?? payload.status
    const body = { newStatus, remarks: payload.remarks, rejectionReason: payload.rejectionReason ?? (newStatus === 'REJECTED' ? payload.remarks : undefined) }
    const decision = newStatus === 'APPROVED' ? 'approve' : newStatus === 'REJECTED' ? 'reject' : null
    let res
    try {
      res = normalizeAdmission(await request(decision ? API_ENDPOINTS.studentAdmissions[decision](reqId) : API_ENDPOINTS.studentAdmissions.status(reqId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(decision ? { remarks: body.remarks, rejectionReason: body.rejectionReason } : { newStatus, actionType: payload.actionType, remarks: payload.remarks, reason: payload.reason ?? payload.rejectionReason, changedBy: payload.changedBy }) }))
    } catch (error) {
      if (error.status >= 500) {
        error.message = `The admission server failed to ${decision || 'update'} this application (HTTP ${error.status}). The decision could not be confirmed.${error.correlationId ? ` Reference: ${error.correlationId}.` : ''} Refresh to check its status and contact the administrator before retrying.`
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
    const localItems = readLocalAdmissions()
    const found = localItems.find(x => String(x.admissionId ?? x.id) === String(id))
    const updated = saveLocalAdmission({ ...(found || {}), ...res, ...latest, id, status: latest.status, remarks: latest.remarks ?? res.remarks ?? payload.remarks, updatedAt: new Date().toISOString() })
    return normalizeRecord(updated)
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

const LOCAL_PROFILES_KEY = 'pirnav-local-student-profiles-v2'
const readLocalStudentProfiles = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY)) || [] } catch { return [] }
}
const saveLocalStudentProfile = (id, item) => {
  if (!id || !item) return item
  try {
    const list = readLocalStudentProfiles()
    const idStr = String(id)
    const index = list.findIndex(x => String(x.studentId ?? x.id ?? x.admissionId) === idStr)
    const existing = index >= 0 ? list[index] : {}

    const deepMerge = (target, source) => {
      if (!source || typeof source !== 'object') return target || {}
      if (!target || typeof target !== 'object') return source || {}
      const res = { ...target }
      for (const key of Object.keys(source)) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
          if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
            res[key] = deepMerge(target[key], source[key])
          } else {
            res[key] = source[key]
          }
        }
      }
      return res
    }

    const merged = deepMerge(existing, item)
    merged.id = idStr
    merged.studentId = idStr
    merged.updatedAt = new Date().toISOString()

    let nextList
    if (index >= 0) {
      nextList = list.map((x, i) => i === index ? merged : x)
    } else {
      nextList = [merged, ...list]
    }
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(nextList))
    return merged
  } catch (err) {
    console.warn('Failed to persist local student profile', err)
  }
  return item
}

function admissionToProfile(admission) {
  if (!admission) return null
  const studentId = String(admission.studentId || admission.admissionId || admission.id)
  const p = admission.personal || admission.personalInformation || {}
  const c = admission.contact || admission.contactInformation || {}
  const parents = admission.parents || admission.parentDetails || {}
  const academic = admission.academic || admission.academicDetails || {}
  const app = admission.application || {}
  return {
    ...admission,
    id: studentId,
    studentId: studentId,
    admissionId: String(admission.admissionId || admission.id),
    status: 'APPROVED',
    personal: {
      firstName: p.firstName || '',
      middleName: p.middleName || '',
      lastName: p.lastName || '',
      fullName: p.fullName || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || admission.studentName || '',
      gender: p.gender || '',
      dob: p.dob || p.dateOfBirth || '',
      bloodGroup: p.bloodGroup || '',
      nationality: p.nationality || 'Indian',
      aadhaar: p.aadhaar || p.aadhaarNumber || '',
      photo: p.photo || ''
    },
    contact: {
      mobile: c.mobile || admission.mobile || '',
      alternateMobile: c.alternateMobile || '',
      email: c.email || admission.email || '',
      alternateEmail: c.alternateEmail || '',
      sameAddress: c.sameAddress ?? true,
      currentAddress: c.currentAddress || {},
      permanentAddress: c.permanentAddress || {}
    },
    parents: {
      father: parents.father || {},
      mother: parents.mother || {},
      guardian: parents.guardian || {},
      primaryContact: parents.primaryContact || 'Father',
      emergencyMobile: parents.emergencyMobile || ''
    },
    academic: {
      academicYear: academic.academicYear || '',
      admissionType: academic.admissionType || '',
      course: academic.course || '',
      department: academic.department || '',
      branch: academic.branch || '',
      semester: academic.semester || '',
      section: academic.section || '',
      regulation: academic.regulation || 'R26',
      quota: academic.quota || '',
      entryType: academic.entryType || 'Regular',
      studentCategory: academic.studentCategory || ''
    },
    application: {
      registrationNumber: app.registrationNumber || app.number || admission.registrationNumber || '',
      admissionNumber: app.admissionNumber || admission.admissionNumber || `ADM-${studentId.slice(-4)}`,
      date: app.date || admission.registrationDate || new Date().toISOString().slice(0, 10),
      admissionDate: app.admissionDate || admission.admissionDate || new Date().toISOString().slice(0, 10)
    },
    previousEducation: admission.previousEducation || {},
    admission: admission.admission || {},
    fees: admission.fees || admission.feeSummary || {},
    documents: admission.documents || {}
  }
}

export const studentProfilesApi = {
  getAll: async (params) => {
    let apiItems = []
    let apiSuccess = false
    try {
      const res = await request(withQuery(API_ENDPOINTS.studentProfiles.list, params))
      apiItems = listData(res) || []
      apiSuccess = true
    } catch {
      apiItems = []
    }

    if (apiSuccess) {
      return markApiResult(apiItems.map(normalizeStudentProfile))
    }

    const localAdmissions = readLocalAdmissions()
    const approvedAdmissions = localAdmissions.filter(x => {
      const st = String(x.status || '').toUpperCase()
      return st === 'APPROVED' || st === 'ENROLLED'
    }).map(admissionToProfile).filter(Boolean)

    const localProfiles = readLocalStudentProfiles()

    const map = new Map()

    for (const item of apiItems) {
      const norm = normalizeStudentProfile(item)
      const id = String(norm.studentId || norm.id || norm.admissionId)
      if (id) map.set(id, norm)
    }

    for (const item of approvedAdmissions) {
      const id = String(item.studentId || item.id || item.admissionId)
      if (!map.has(id)) {
        map.set(id, item)
      } else {
        const existing = map.get(id)
        map.set(id, {
          ...existing,
          ...item,
          personal: { ...(item.personal || {}), ...(existing.personal || {}) },
          academic: { ...(item.academic || {}), ...(existing.academic || {}) },
          contact: { ...(item.contact || {}), ...(existing.contact || {}) },
          parents: { ...(item.parents || {}), ...(existing.parents || {}) }
        })
      }
    }

    for (const localProf of localProfiles) {
      if (!localProf) continue
      const id = String(localProf.studentId || localProf.id || localProf.admissionId)
      if (map.has(id)) {
        const existing = map.get(id)
        map.set(id, {
          ...existing,
          ...localProf,
          personal: { ...(existing.personal || {}), ...(localProf.personal || {}) },
          contact: { ...(existing.contact || {}), ...(localProf.contact || {}) },
          parents: { ...(existing.parents || {}), ...(localProf.parents || {}) }
        })
      } else {
        map.set(id, localProf)
      }
    }

    return Array.from(map.values()).map(normalizeStudentProfile)
  },

  preview: async (id) => {
    const reqId = requiredId(id, 'Student ID')
    try {
      const res = normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.preview(reqId)))
      if (res) return markApiResult(res)
    } catch {
      /* fallback to local if backend fails */
    }

    const localProfiles = readLocalStudentProfiles()
    const localProf = localProfiles.find(x => String(x.studentId || x.id) === String(id) || String(x.admissionId) === String(id))

    const localAdmissions = readLocalAdmissions()
    const approvedAdm = localAdmissions.find(x => String(x.studentId || x.id || x.admissionId) === String(id) && ['APPROVED', 'ENROLLED'].includes(String(x.status || '').toUpperCase()))
    const admProf = approvedAdm ? admissionToProfile(approvedAdm) : null

    const combined = {
      ...(admProf || {}),
      ...(localProf || {})
    }

    if (Object.keys(combined).length > 0) {
      return normalizeStudentProfile(combined)
    }

    throw new Error('Student profile not found.')
  },

  update: async (id, payload) => {
    const reqId = requiredId(id, 'Student ID')
    let res = null
    try {
      res = normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.update(reqId), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))
    } catch {
      res = null
    }

    const studentObj = payload.student || payload
    const saved = saveLocalStudentProfile(id, {
      ...res,
      ...studentObj,
      personal: {
        ...(res?.personal || {}),
        ...(studentObj?.personal || {}),
        ...(studentObj?.personal?.photo ? { photo: studentObj.personal.photo } : {}),
      },
    })
    return normalizeStudentProfile(saved)
  },
}
export const studentPromotionApi = {
  getDashboard: async () => normalizePromotion(await request(API_ENDPOINTS.promotions.dashboard)), getDirectory: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.directory, params))), getHistory: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.history, params))),
  getEligibleStudents: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.eligibleStudents, params))), getEligibility: async (id) => normalizePromotion(await request(API_ENDPOINTS.promotions.eligibility(requiredId(id, 'Student ID')))),
  updateEligibilityStatus: async (id, eligibilityStatus) => normalizePromotion(await request(withQuery(API_ENDPOINTS.promotions.eligibilityStatus(requiredId(id, 'Student ID')), { eligibilityStatus }), { method: 'PUT' })),
  promote: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promote, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  promoteBulk: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promoteBulk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getPromotedStudents: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.promotedStudents, params))), getStudentHistory: async (id) => listData(await request(API_ENDPOINTS.promotions.studentHistory(requiredId(id, 'Student ID')))), getHistoryByStudent: async (id) => listData(await request(API_ENDPOINTS.promotions.historyByStudent(requiredId(id, 'Student ID')))),
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
