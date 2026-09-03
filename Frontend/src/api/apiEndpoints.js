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

const validationMessage = (body) => {
  if (body?.message || body?.title) return body.message || body.title
  const errors = body?.errors
  if (!errors || typeof errors !== 'object') return ''
  return Object.values(errors).flat().find((message) => typeof message === 'string') || ''
}

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('btech-refresh-token') || sessionStorage.getItem('btech-refresh-token')
  if (!refreshToken) throw new AuthRequestError('Your session has expired. Please sign in again.', 401)
  const response = await fetch(API_ENDPOINTS.auth.refresh, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const body = await readBody(response)
  if (!response.ok || !body?.data?.accessToken) throw new AuthRequestError(body?.message || 'Your session has expired. Please sign in again.', response.status)
  const storage = localStorage.getItem('btech-authenticated') === 'true' ? localStorage : sessionStorage
  storage.setItem('btech-access-token', body.data.accessToken)
  storage.setItem('btech-refresh-token', body.data.refreshToken || refreshToken)
  return body.data.accessToken
}

const clearInvalidSession = () => {
  localStorage.removeItem('btech-authenticated')
  localStorage.removeItem('btech-user-role')
  localStorage.removeItem('btech-access-token')
  localStorage.removeItem('btech-refresh-token')
}

const request = async (url, options = {}, retried = false) => {
  const token = localStorage.getItem('btech-access-token') || sessionStorage.getItem('btech-access-token') || localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token')
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
  } catch {
    throw new Error('We’re having trouble connecting right now. Please try again shortly.')
  }
  if (response.status === 401 && !retried) {
    try {
      await refreshAccessToken()
      return request(url, options, true)
    } catch (error) {
      // Keep the current UI session intact when an individual page request
      // cannot refresh its API token. Protected navigation should not behave
      // like an explicit sign-out; the requesting page can show the API error.
      throw error
    }
  }
  const body = await readBody(response)
  if (!response.ok || body?.success === false) {
    if (response.status >= 500) throw new Error('Something went wrong while completing your request. Please try again.')
    const fallback = {
      400: 'Please check the submitted profile information.',
      401: 'Your session has expired. Please sign in again.',
      403: "You don't have permission to update this profile.",
      404: 'Profile not found.',
      409: 'The email or mobile number is already in use.',
      500: 'Something went wrong while completing your request. Please try again.',
    }[response.status] || 'The request could not be completed.'
    throw new Error(validationMessage(body) || fallback)
  }
  return body
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
    designation: data.designation ?? '', address: data.address ?? '', postalCode: data.postalCode ?? '',
    pincode: data.pincode ?? data.postalCode ?? '', city: data.city ?? '', district: data.district ?? '', state: data.state ?? '', bio: data.bio ?? data.aboutMe ?? '',
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
        address: String(profile.address || '').trim() || null,
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
    return Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : []
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
  duration: Number(branch.duration || branch.durationValue || 4),
  totalSemesters: Number(branch.totalSemesters || branch.semesters || 8),
  intakeCapacity: Number(branch.intakeCapacity ?? branch.intake),
  startingAcademicYearId: branch.startingAcademicYearId || null,
  description: String(branch.description || '').trim() || null,
  status: branch.status === 'Inactive' || Number(branch.status) === 0 ? 0 : 1,
})

export const branchApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.branches.list)
    return Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : []
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
    const response = await request(endpoint('/api/v1/departments'))
    return Array.isArray(response?.data) ? response.data : []
  },
}

export const courseApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.courses.list)
    return Array.isArray(response?.data) ? response.data : []
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
    return Array.isArray(response?.data) ? response.data : []
  },
  getByCourse: async (courseId) => {
    const response = await request(API_ENDPOINTS.courseStructures.byCourse(courseId))
    return Array.isArray(response?.data) ? response.data : []
  },
  getById: async (id) => (await request(API_ENDPOINTS.courseStructures.detail(id)))?.data,
  create: async (structure) => (await request(API_ENDPOINTS.courseStructures.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courseStructurePayload(structure)) }))?.data,
  update: async (id, structure) => (await request(API_ENDPOINTS.courseStructures.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courseStructurePayload(structure)) }))?.data,
}

export const sectionAssignmentApi = {
  list: async () => {
    const response = await request(API_ENDPOINTS.sectionAssignments.list)
    return Array.isArray(response?.data) ? response.data : []
  },
  assign: async (sectionId, assignment) => request(API_ENDPOINTS.sections.assignStudents(sectionId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds: [Number(assignment.studentId)] }) }),
  remove: async (sectionId, assignmentId) => {
    await request(API_ENDPOINTS.sections.student(sectionId, assignmentId), { method: 'DELETE' })
  },
  listBySection: async (sectionId) => (await request(API_ENDPOINTS.sections.students(sectionId)))?.data || [],
}

export const sectionAllocationApi = {
  getTeacher: async (sectionId) => (await request(API_ENDPOINTS.sections.classTeacher(sectionId)))?.data,
  getTeacherCandidates: async (sectionId) => (await request(API_ENDPOINTS.sections.classTeacherCandidates(sectionId)))?.data || [],
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

export const sectionApi = {
  getAll: async () => (await request(API_ENDPOINTS.sections.list))?.data || [],
  getById: async (id) => (await request(API_ENDPOINTS.sections.detail(id)))?.data,
  create: async (section) => {
    const response = await request(API_ENDPOINTS.sections.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sectionPayload(section), collegeId: Number(section.collegeId || 1), academicYearId: Number(section.academicYearId || 0), departmentId: Number(section.departmentId || 0), courseId: Number(section.courseId || 0), branchId: Number(section.branchId || 0), semesterId: Number(section.semesterId || 0) }) })
    const id = response?.data?.sectionId ?? response?.sectionId
    return id ? sectionApi.getById(id) : response?.data
  },
  update: async (id, section) => { await request(API_ENDPOINTS.sections.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sectionPayload(section)) }); return sectionApi.getById(id) },
  remove: async (id) => request(API_ENDPOINTS.sections.remove(id), { method: 'DELETE' }),
  updateStatus: async (id, status) => request(API_ENDPOINTS.sections.status(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status === 'Active' }) }),
  search: async (params) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)); return (await request(`${API_ENDPOINTS.sections.search}?${query}`))?.data || [] },
  summary: async () => (await request(API_ENDPOINTS.sections.summary))?.data,
  validateCapacity: async (sectionId, capacity) => (await request(`${API_ENDPOINTS.sections.validateCapacity}?sectionId=${sectionId}&capacity=${capacity}`))?.data,
}

export async function lookupIndianPincode(pincode) {
  let response
  try {
    response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`)
  } catch {
    throw new Error('PIN-code lookup is unavailable. Enter the address manually.')
  }
  if (!response.ok) throw new Error('Unable to verify this PIN code.')
  const [result] = await response.json()
  const offices = result?.PostOffice
  if (result?.Status !== 'Success' || !offices?.length) throw new Error('No Indian postal location was found for this PIN code.')
  const primary = offices[0]
  return { city: primary.Block || primary.Name || '', district: primary.District || '', state: primary.State || '' }
}

export default API_ENDPOINTS
