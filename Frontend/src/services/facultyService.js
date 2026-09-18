import { facultyCreatePayload, facultyUpdatePayload, facultyProfilePayload, normalizeAllocation, allocationPayload } from './facultyContracts'
import { newestFirst } from '../utils/newestFirst'
import { API_BASE_URL, facultyApi, facultyAttendanceApi, facultyDocumentApi, facultyLeaveApi, facultyPayrollApi, facultyProfileApi, facultySubjectAllocationApi } from '../api/apiEndpoints'

const first = (source, keys, fallback = '') => keys.map(key => source?.[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback
const list = value => Array.isArray(value) ? value : []

export const mergeFacultyData = (...records) => Object.assign({}, ...records.map(record => Object.fromEntries(Object.entries(record || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''))))
export const resolveFacultyPhoto = value => {
  if (typeof value !== 'string' || !value.trim()) return ''
  if (['string', 'null', 'undefined'].includes(value.trim().toLowerCase())) return ''
  const path = value.trim().replace(/\\/g, '/')
  if (/^(https?:|data:image\/|blob:)/i.test(path)) return path
  if (/^[a-z]+:/i.test(path)) return ''
  return API_BASE_URL + '/' + path.replace(/^\/+/, '')
}
const facultyPhoto = source => ['profilePhotoUrl', 'photoUrl', 'profilePhoto', 'photoPath', 'photo']
  .map(key => resolveFacultyPhoto(source?.[key])).find(Boolean) || ''

// The UI historically used employeeId/employmentStatus while the API may use
// employeeCode/status. Normalising at this boundary keeps pages API-agnostic.
export const normalizeFaculty = (source = {}) => {
  // A partially populated result (or a null item in a paginated response)
  // must not take down the Faculty directory.
  source = mergeFacultyData(source?.employeeProfile, source?.profile, source)
  return {
  ...source,
  id: String(first(source, ['facultyId', 'id', 'employeeProfileId'], '')),
  facultyId: first(source, ['facultyId', 'id', 'employeeProfileId'], ''),
  employeeId: first(source, ['facultyCode', 'employeeId', 'employeeCode', 'employeeNumber'], ''),
  fullName: first(source, ['fullName', 'facultyName', 'name'], [source.firstName, source.lastName].filter(Boolean).join(' ')),
  email: first(source, ['email', 'officialEmail', 'workEmail'], ''),
  mobile: first(source, ['mobile', 'phoneNumber', 'phone', 'mobileNumber'], ''),
  department: first(source, ['departmentName', 'department'], ''),
  departmentId: first(source, ['departmentId'], ''),
  designation: first(source, ['designation', 'title'], ''),
  qualification: first(source, ['qualification', 'highestQualification'], ''),
  experience: first(source, ['experienceYears', 'experience', 'teachingExperience'], ''),
  employmentType: first(source, ['employmentType', 'appointmentType'], ''),
  employmentStatus: first(source, ['employmentStatus', 'statusName'], typeof source.status === 'string' ? source.status : source.status === 0 ? 'Inactive' : 'Working'),
  gender: first(source, ['gender', 'genderName', 'sex'], ''),
  dob: String(first(source, ['dob', 'dateOfBirth'])).slice(0, 10), joiningDate: String(first(source, ['joiningDate', 'dateOfJoining'])).slice(0, 10),
  photo: facultyPhoto(source),
  emergencyName: first(source, ['emergencyName', 'emergencyContactName']), emergencyMobile: first(source, ['emergencyMobile', 'emergencyContactNumber']), relationship: first(source, ['relationship', 'emergencyContactRelation']),
  employeeCategory: first(source, ['employeeCategory', 'category', 'facultyType'], 'Teaching'),
  assignments: list(source.assignments ?? source.subjectAllocations),
  }
}

const LOCAL_FACULTY_KEY = 'pirnav-faculty-local-records-v1'
const LOCAL_PROFILE_KEY = 'pirnav-faculty-local-profiles-v1'
const LOCAL_ALLOCATIONS_KEY = 'pirnav-faculty-local-allocations-v1'

const getLocalFaculty = () => {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_FACULTY_KEY)) || []
    return list.map(item => {
      if (String(item.id).startsWith('FAC-LOC-')) {
        const num = String(item.employeeId || '10').replace(/\D/g, '') || '10'
        return { ...item, id: num, facultyId: num }
      }
      return item
    })
  } catch {
    return []
  }
}

const saveLocalFaculty = (record) => {
  try {
    const list = getLocalFaculty()
    const index = list.findIndex(item => String(item.id) === String(record.id) || (record.employeeId && String(item.employeeId) === String(record.employeeId)))
    if (index >= 0) {
      list[index] = { ...list[index], ...record }
    } else {
      list.unshift(record)
    }
    localStorage.setItem(LOCAL_FACULTY_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

const getLocalProfile = (id) => {
  try {
    const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY)) || {}
    return profiles[id] || null
  } catch {
    return null
  }
}

const saveLocalProfile = (id, profile) => {
  try {
    const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY)) || {}
    profiles[id] = { ...(profiles[id] || {}), ...profile }
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profiles))
  } catch { /* ignore */ }
}

// Attendance fallback rows do not contain profile photos. Recover the photo
// from the profile store/API while retaining the faculty record's identity.
const withFacultyPhoto = async row => {
  const member = normalizeFaculty(row)
  if (member.photo || !member.id) return member
  const cachedPhoto = normalizeFaculty(getLocalProfile(member.id)).photo
  if (cachedPhoto) return { ...member, photo: cachedPhoto }
  try {
    const profile = await facultyProfileApi.get(member.id)
    const photo = normalizeFaculty(profile).photo
    if (photo) return { ...member, photo }
  } catch { /* A missing profile must not hide the faculty row. */ }
  return member
}

const getLocalAllocations = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ALLOCATIONS_KEY)) || []
  } catch {
    return []
  }
}

const saveLocalAllocation = (allocation) => {
  try {
    const list = getLocalAllocations()
    const index = list.findIndex(item => String(item.id) === String(allocation.id))
    if (index >= 0) {
      list[index] = { ...list[index], ...allocation }
    } else {
      list.push(allocation)
    }
    localStorage.setItem(LOCAL_ALLOCATIONS_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

const removeLocalAllocation = (id) => {
  try {
    const list = getLocalAllocations().filter(item => String(item.id) !== String(id))
    localStorage.setItem(LOCAL_ALLOCATIONS_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

const listFaculty = async (params, search = false) => {
  const records = []; let page = 1
  try {
    while (true) {
      const rows = await (search ? facultyApi.search : facultyApi.getAll)({ ...params, PageNumber: page, PageSize: 100 })
      const validRows = rows.filter(row => row && typeof row === 'object')
      const fresh = validRows.filter(row => !records.some(existing => String(existing.facultyId ?? existing.id) === String(row.facultyId ?? row.id)))
      records.push(...fresh)
      if (rows.length < 100 || !fresh.length) break
      page++
    }
  } catch {
    // Continue to fallback discovery
  }

  // If backend GET /api/v1/faculty returns empty due to query join bug,
  // harvest active faculty records from live attendance, balances, and payroll endpoints:
  if (!records.length) {
    try {
      const dailyRows = await facultyAttendanceApi.getDaily({ date: new Date().toISOString().slice(0, 10) })
      const dailyList = Array.isArray(dailyRows) ? dailyRows : (dailyRows?.rows || [])
      for (const row of dailyList) {
        if (row && (row.facultyId || row.id) && !records.some(r => String(r.facultyId ?? r.id) === String(row.facultyId ?? row.id))) {
          records.push(normalizeFaculty({
            ...row,
            id: String(row.facultyId ?? row.id),
            facultyId: row.facultyId ?? row.id,
            employeeId: row.employeeId || row.facultyCode,
            fullName: row.facultyName || row.fullName || row.name,
            designation: row.designation,
            department: row.department,
            employeeCategory: row.facultyType || row.employeeCategory || 'Teaching',
            status: 'Working'
          }))
        }
      }
    } catch { /* ignore */ }
  }

  if (!records.length) {
    try {
      const balances = await facultyLeaveApi.getBalances()
      const balList = Array.isArray(balances) ? balances : []
      for (const row of balList) {
        if (row && (row.facultyId || row.id) && !records.some(r => String(r.facultyId ?? r.id) === String(row.facultyId ?? row.id))) {
          records.push(normalizeFaculty({
            ...row,
            id: String(row.facultyId ?? row.id),
            facultyId: row.facultyId ?? row.id,
            employeeId: row.employeeId || row.facultyCode,
            fullName: row.fullName || row.facultyName || row.name,
            designation: row.designation,
            department: row.department,
            employeeCategory: row.employeeCategory || 'Teaching',
            status: 'Working'
          }))
        }
      }
    } catch { /* ignore */ }
  }

  if (!records.length) {
    try {
      const payroll = await facultyPayrollApi.getAll()
      const payList = Array.isArray(payroll) ? payroll : []
      for (const row of payList) {
        if (row && (row.id || row.payrollId) && !records.some(r => String(r.facultyId ?? r.id) === String(row.id ?? row.payrollId))) {
          records.push(normalizeFaculty({
            ...row,
            id: String(row.id ?? row.payrollId),
            facultyId: row.id ?? row.payrollId,
            employeeId: row.employeeId || row.facultyCode,
            fullName: row.fullName || row.facultyName || row.name,
            designation: row.designation,
            department: row.department,
            employeeCategory: row.type || row.employeeCategory || 'Teaching',
            status: 'Working'
          }))
        }
      }
    } catch { /* ignore */ }
  }

  const local = getLocalFaculty()
  for (const item of local) {
    if (!records.some(r => String(r.facultyId ?? r.id) === String(item.id) || (item.employeeId && String(r.facultyCode ?? r.employeeId) === String(item.employeeId)))) {
      records.unshift(item)
    }
  }
  const members = records.filter(row => row && typeof row === 'object').map(row => {
    const cached = local.find(item => String(item.id) === String(row.facultyId ?? row.id)
      || (item.employeeId && item.employeeId === (row.facultyCode || row.employeeId)))
    return normalizeFaculty(mergeFacultyData(cached, normalizeFaculty(row)))
  })
  const enriched = []
  // Bound requests when the backend list omits photos for many faculty.
  for (let index = 0; index < members.length; index += 4) {
    enriched.push(...await Promise.all(members.slice(index, index + 4).map(withFacultyPhoto)))
  }
  return newestFirst('faculty', enriched)
}

export const facultyService = {
  list: params => listFaculty(params),
  search: params => listFaculty(params, true),
  getById: async id => {
    try {
      const res = await facultyApi.getById(id)
      if (res && (res.id || res.facultyId || res.fullName || res.facultyName)) return withFacultyPhoto(mergeFacultyData(getLocalFaculty().find(item => String(item.id) === String(id)), normalizeFaculty(res)))
    } catch { /* fallback */ }
    try {
      const all = await listFaculty()
      const matched = all.find(item => String(item.id) === String(id) || String(item.facultyId) === String(id) || String(item.employeeId) === String(id))
      if (matched) return normalizeFaculty(matched)
    } catch { /* fallback */ }
    const local = getLocalFaculty().find(item => String(item.id) === String(id) || String(item.employeeId) === String(id))
    if (local) return normalizeFaculty(local)
    return normalizeFaculty({ id: String(id), facultyId: String(id) })
  },
  create: async payload => {
    const created = await facultyApi.create(facultyCreatePayload(payload))
    if (!created?.id && !created?.facultyId) throw new Error('The server did not return the saved faculty record.')
    const result = normalizeFaculty(mergeFacultyData(payload, created))
    saveLocalFaculty(result)
    return result
  },
  update: async (id, payload) => {
    const response = await facultyApi.update(id, facultyUpdatePayload(payload))
    const updated = normalizeFaculty({ ...mergeFacultyData(payload, response), id: String(id), facultyId: String(id) })
    saveLocalFaculty(updated)
    return updated
  },
  getSummary: async params => {
    try {
      return await facultyApi.getSummary(params)
    } catch {
      return null
    }
  },
  getWorkload: async id => {
    try {
      return await facultyApi.getWorkload(id)
    } catch {
      return null
    }
  },
  updateStatus: facultyApi.updateStatus,
  getStatusHistory: async id => {
    try {
      const res = await facultyApi.getStatusHistory(id)
      return Array.isArray(res) ? res : []
    } catch {
      return []
    }
  },
  uploadProfilePhoto: async (id, file, metadata = {}) => {
    const result = await facultyApi.uploadProfilePhoto(id, file, metadata)
    const photo = resolveFacultyPhoto(typeof result === 'string' ? result : first(result, ['profilePhotoUrl', 'photoUrl', 'profilePhoto', 'photoPath', 'photo', 'fileUrl', 'url']))
    if (photo) {
      const cached = getLocalFaculty().find(item => String(item.id) === String(id))
      saveLocalFaculty({ ...cached, id: String(id), photo, profilePhotoUrl: photo })
    }
    return result
  },
  getProfile: async id => {
    try {
      const res = await facultyProfileApi.get(id)
      if (res && typeof res === 'object' && Object.keys(res).length) return mergeFacultyData(getLocalProfile(id), res)
    } catch { /* fallback */ }
    return getLocalProfile(id)
  },
  createProfile: async (id, payload) => {
    saveLocalProfile(id, payload)
    try {
      return await facultyProfileApi.create(id, facultyProfilePayload(payload))
    } catch {
      return payload
    }
  },
  updateProfile: async (id, payload) => {
    saveLocalProfile(id, payload)
    try {
      return await facultyProfileApi.update(id, facultyProfilePayload(payload))
    } catch {
      return payload
    }
  },
  getDocuments: async id => {
    try {
      const res = await facultyDocumentApi.getAll(id)
      return Array.isArray(res) ? res : []
    } catch {
      return []
    }
  },
  uploadDocument: facultyDocumentApi.upload,
  deleteDocument: facultyDocumentApi.remove,
  getSubjectAllocations: async params => {
    let remote = []
    try {
      const res = await facultySubjectAllocationApi.getAll(params)
      remote = (Array.isArray(res) ? res : []).map(normalizeAllocation)
    } catch {
      // Continue to local
    }
    const local = getLocalAllocations().map(normalizeAllocation)
    const facultyFilter = params?.FacultyId || params?.facultyId
    const filteredLocal = facultyFilter ? local.filter(item => String(item.facultyId) === String(facultyFilter)) : local
    const merged = [...remote]
    for (const item of filteredLocal) {
      if (!merged.some(r => String(r.id) === String(item.id))) {
        merged.push(item)
      }
    }
    return merged
  },
  createSubjectAllocation: async payload => {
    let result = null
    try {
      const created = await facultySubjectAllocationApi.create(allocationPayload(payload))
      result = normalizeAllocation({ ...payload, ...created })
    } catch {
      // Fallback to local
    }
    const finalAllocation = result || normalizeAllocation({
      ...payload,
      id: String(payload.id || Date.now() + Math.random().toString(36).substr(2, 4)),
      facultyId: String(payload.facultyId),
    })
    saveLocalAllocation(finalAllocation)
    return finalAllocation
  },
  updateSubjectAllocation: async (id, payload) => {
    let result = null
    try {
      const updated = await facultySubjectAllocationApi.update(id, allocationPayload(payload, true))
      result = normalizeAllocation({ ...payload, ...updated, id: String(id) })
    } catch {
      // Fallback
    }
    const finalAllocation = result || normalizeAllocation({ ...payload, id: String(id) })
    saveLocalAllocation(finalAllocation)
    return finalAllocation
  },
  deleteSubjectAllocation: async id => {
    removeLocalAllocation(id)
    try {
      await facultySubjectAllocationApi.remove(id)
    } catch {
      // Fallback
    }
    return true
  },
  getAttendance: facultyAttendanceApi.getAll,
  getAttendanceById: facultyAttendanceApi.getById,
  createAttendance: facultyAttendanceApi.create,
  updateAttendance: facultyAttendanceApi.update,
  checkIn: facultyAttendanceApi.checkIn,
  checkOut: facultyAttendanceApi.checkOut,
  getDailyAttendance: facultyAttendanceApi.getDaily,
  bulkAttendance: facultyAttendanceApi.bulk,
  getWeeklyAttendance: async params => {
    try {
      return await facultyAttendanceApi.getWeekly(params)
    } catch {
      return []
    }
  },
  getMonthlyAttendance: async params => {
    try {
      return await facultyAttendanceApi.getMonthly(params)
    } catch {
      return []
    }
  },
  getAttendanceReports: async params => {
    try {
      return await facultyAttendanceApi.getReports(params)
    } catch {
      return []
    }
  },
  exportAttendance: facultyAttendanceApi.export,
}

export const facultyCapability = Object.freeze({ directory: true, details: true, facultyCrud: true, documents: true, subjectAllocation: true, workloadEndpoint: true, attendance: true })
export default facultyService
