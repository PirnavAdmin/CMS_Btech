import { facultyCreatePayload, facultyUpdatePayload, facultyProfilePayload, normalizeAllocation, allocationPayload, facultyEmployeeCode } from './facultyContracts'
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

// Use the faculty primary key for a stable EMP display code across all screens.
export const normalizeFaculty = (source = {}) => {
  // A partially populated result (or a null item in a paginated response)
  // must not take down the Faculty directory.
  source = mergeFacultyData(source?.employeeProfile, source?.profile, source?.data, source)
  const id = String(first(source, ['facultyId', 'id', 'employeeProfileId', 'FacultyId', 'Id', 'EmployeeProfileId'], ''))
  const facultyId = first(source, ['facultyId', 'id', 'employeeProfileId', 'FacultyId', 'Id', 'EmployeeProfileId'], '')

  return {
    ...source,
    id,
    facultyId,
    collegeId: first(source, ['collegeId', 'college_id', 'CollegeId', 'collId', 'CollId'], ''),
    facultyCode: first(source, ['facultyCode', 'faculty_code', 'FacultyCode'], /^FAC\d+$/i.test(source.employeeId || '') ? source.employeeId : ''),
    employeeId: facultyEmployeeCode(first(source, ['facultyId', 'id', 'employeeProfileId', 'FacultyId', 'Id', 'EmployeeProfileId'], '')),
    fullName: first(source, ['fullName', 'facultyName', 'name', 'FullName', 'FacultyName', 'userName', 'username'], [source.firstName, source.lastName].filter(Boolean).join(' ')),
    email: first(source, ['email', 'officialEmail', 'workEmail', 'Email', 'OfficialEmail'], ''),
    mobile: first(source, ['mobile', 'phoneNumber', 'phone', 'mobileNumber', 'Mobile', 'PhoneNumber', 'Phone', 'MobileNumber'], ''),
    department: first(source, ['departmentName', 'department', 'DepartmentName', 'Department', 'deptName', 'DeptName'], ''),
    departmentId: first(source, ['departmentId', 'DepartmentId', 'department_id', 'deptId', 'DeptId'], ''),
    designation: first(source, ['designation', 'title', 'Designation', 'Title', 'designationName', 'DesignationName'], ''),
    qualification: first(source, ['qualification', 'highestQualification', 'Qualification'], ''),
    experience: first(source, ['experienceYears', 'experience', 'teachingExperience', 'ExperienceYears', 'Experience'], ''),
    employmentType: first(source, ['employmentType', 'appointmentType', 'EmploymentType'], ''),
    employmentStatus: first(source, ['employmentStatus', 'statusName', 'EmploymentStatus', 'StatusName'], typeof source.status === 'string' ? source.status : source.status === 0 ? 'Inactive' : 'Working'),
    gender: first(source, ['gender', 'genderName', 'sex', 'Gender'], ''),
    dob: String(first(source, ['dob', 'dateOfBirth', 'DateOfBirth', 'DOB'])).slice(0, 10),
    joiningDate: String(first(source, ['joiningDate', 'dateOfJoining', 'DateOfJoining', 'JoiningDate'])).slice(0, 10),
    photo: facultyPhoto(source),
    emergencyName: first(source, ['emergencyName', 'emergencyContactName', 'EmergencyContactName']),
    emergencyMobile: first(source, ['emergencyMobile', 'emergencyContactNumber', 'EmergencyContactNumber']),
    relationship: first(source, ['relationship', 'emergencyContactRelation', 'EmergencyContactRelation']),
    employeeCategory: first(source, ['employeeCategory', 'category', 'facultyType', 'EmployeeCategory', 'Category', 'FacultyType'], 'Teaching'),
    assignments: list(source.assignments ?? source.subjectAllocations),
  }
}

const LOCAL_FACULTY_KEY = 'pirnav-faculty-local-records-v1'
const LOCAL_PROFILE_KEY = 'pirnav-faculty-local-profiles-v1'
const LOCAL_ALLOCATIONS_KEY = 'pirnav-faculty-local-allocations-v1'
const LOCAL_ATTENDANCE_KEY = 'pirnav-faculty-local-attendance-v1'

const getLocalAttendance = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY)) || []
  } catch {
    return []
  }
}

const saveLocalAttendanceRecord = (record) => {
  try {
    const list = getLocalAttendance()
    const facId = String(record.facultyId ?? record.faculty?.id ?? '')
    const date = String(record.date || record.attendanceDate || '').slice(0, 10)
    if (!facId || !date) return record
    const index = list.findIndex(item => String(item.facultyId) === facId && String(item.date || item.attendanceDate).slice(0, 10) === date)
    const normalized = {
      ...record,
      id: record.id || record.attendanceId || (index >= 0 ? list[index].id : `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
      attendanceId: record.attendanceId || record.id || (index >= 0 ? list[index].attendanceId : null),
      facultyId: facId,
      date,
      attendanceDate: date,
      status: record.status || record.attendanceStatus || 'Present',
      checkIn: record.checkIn || record.checkInTime || '',
      checkOut: record.checkOut || record.checkOutTime || '',
      remarks: record.remarks || '',
    }
    if (index >= 0) {
      list[index] = { ...list[index], ...normalized }
    } else {
      list.push(normalized)
    }
    localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(list))
    return normalized
  } catch {
    return record
  }
}

// Faculty codes are only unique within a college. Legacy caches stored them
// in employeeId; normalize before comparing and never match unscoped codes.
const sameFaculty = (left, right) => {
  const a = normalizeFaculty(left); const b = normalizeFaculty(right)
  if (a.id && b.id && a.id === b.id) return true
  if (a.employeeId && b.employeeId) return false
  return Boolean(a.collegeId && b.collegeId && String(a.collegeId) === String(b.collegeId)
    && a.facultyCode && a.facultyCode === b.facultyCode)
}

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
    const index = list.findIndex(item => sameFaculty(item, record))
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
            employeeId: row.employeeId,
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
            employeeId: row.employeeId,
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
        if (row?.facultyId && !records.some(r => String(r.facultyId ?? r.id) === String(row.facultyId))) {
          records.push(normalizeFaculty({
            ...row,
            id: String(row.facultyId),
            facultyId: row.facultyId,
            employeeId: row.employeeId,
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
    if (!records.some(r => sameFaculty(r, item))) {
      records.unshift(item)
    }
  }
  const members = records.filter(row => row && typeof row === 'object').map(row => {
    const cached = local.find(item => sameFaculty(item, row))
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
    // Only the server response owns identifiers; form/cache values must never
    // masquerade as an identifier allocated by the database.
    const details = Object.fromEntries(Object.entries(payload).filter(([key]) => !['facultyCode', 'faculty_code', 'employeeId', 'employee_id', 'employeeCode', 'employeeNumber'].includes(key)))
    const result = normalizeFaculty(mergeFacultyData(details, created))
    saveLocalFaculty(result)
    return result
  },
  update: async (id, payload) => {
    let response = null
    try {
      response = await facultyApi.update(id, facultyUpdatePayload(payload))
    } catch (err) {
      console.warn('Backend faculty update error, saving to local store:', err)
    }
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
    try {
      const result = await facultyApi.uploadProfilePhoto(id, file, metadata)
      const photo = resolveFacultyPhoto(typeof result === 'string' ? result : first(result, ['profilePhotoUrl', 'photoUrl', 'profilePhoto', 'photoPath', 'photo', 'fileUrl', 'url']))
      if (photo) {
        const cached = getLocalFaculty().find(item => String(item.id) === String(id))
        saveLocalFaculty({ ...cached, id: String(id), photo, profilePhotoUrl: photo })
      }
      return result
    } catch (err) {
      console.warn('Backend photo upload failed:', err)
      return null
    }
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
  getAttendance: async params => {
    let remote = []
    try {
      remote = await facultyAttendanceApi.getAll(params)
    } catch { /* ignore */ }
    const local = getLocalAttendance()
    const list = Array.isArray(remote) ? [...remote] : []
    for (const item of local) {
      const matchIndex = list.findIndex(r => String(r.facultyId ?? r.faculty?.id) === String(item.facultyId) && String(r.attendanceDate ?? r.date).slice(0, 10) === String(item.date).slice(0, 10))
      if (matchIndex >= 0) {
        list[matchIndex] = { ...item, ...list[matchIndex], status: list[matchIndex].status && list[matchIndex].status !== 'Not Marked' ? list[matchIndex].status : item.status, checkIn: list[matchIndex].checkIn || item.checkIn, checkOut: list[matchIndex].checkOut || item.checkOut }
      } else {
        list.push(item)
      }
    }
    return list
  },
  getAttendanceById: facultyAttendanceApi.getById,
  createAttendance: async payload => {
    let result = null
    try {
      result = await facultyAttendanceApi.create(payload)
    } catch (err) {
      console.warn('Backend create attendance failed, saving to local store:', err)
    }
    const local = saveLocalAttendanceRecord({
      ...payload,
      ...(result || {}),
      id: result?.attendanceId || result?.id || `ATT-${Date.now()}`,
      attendanceId: result?.attendanceId || result?.id || `ATT-${Date.now()}`,
      facultyId: String(payload.facultyId),
      date: payload.attendanceDate,
    })
    return result || local
  },
  updateAttendance: async (id, payload) => {
    let result = null
    try {
      result = await facultyAttendanceApi.update(id, payload)
    } catch (err) {
      console.warn('Backend update attendance failed, saving to local store:', err)
    }
    saveLocalAttendanceRecord({
      ...payload,
      id,
      attendanceId: id,
      date: payload.attendanceDate || payload.date,
    })
    return result || { id, ...payload }
  },
  checkIn: async (id, payload = {}) => {
    let result = null
    try {
      result = await facultyAttendanceApi.checkIn(id, payload)
    } catch { /* ignore */ }
    const timeVal = payload?.checkIn ? (payload.checkIn.includes('T') ? payload.checkIn.split('T')[1].slice(0, 5) : payload.checkIn) : '09:00'
    const list = getLocalAttendance()
    const item = list.find(r => String(r.id) === String(id) || String(r.attendanceId) === String(id))
    if (item) {
      item.checkIn = timeVal
      localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(list))
    }
    return result || { success: true }
  },
  checkOut: async (id, payload = {}) => {
    let result = null
    try {
      result = await facultyAttendanceApi.checkOut(id, payload)
    } catch { /* ignore */ }
    const timeVal = payload?.checkOut ? (payload.checkOut.includes('T') ? payload.checkOut.split('T')[1].slice(0, 5) : payload.checkOut) : '17:00'
    const list = getLocalAttendance()
    const item = list.find(r => String(r.id) === String(id) || String(r.attendanceId) === String(id))
    if (item) {
      item.checkOut = timeVal
      localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(list))
    }
    return result || { success: true }
  },
  getDailyAttendance: async params => {
    let remote = []
    try {
      remote = await facultyAttendanceApi.getDaily(params)
    } catch { /* ignore */ }
    const date = params?.date || new Date().toISOString().slice(0, 10)
    const local = getLocalAttendance().filter(item => String(item.date || item.attendanceDate).slice(0, 10) === date)
    const list = Array.isArray(remote) ? [...remote] : []
    for (const item of local) {
      const matchIndex = list.findIndex(r => String(r.facultyId ?? r.id) === String(item.facultyId))
      if (matchIndex >= 0) {
        list[matchIndex] = { ...list[matchIndex], ...item, attendanceId: list[matchIndex].attendanceId || item.attendanceId || item.id }
      } else {
        list.push(item)
      }
    }
    return list
  },
  bulkAttendance: async payload => {
    let result = null
    try {
      result = await facultyAttendanceApi.bulk(payload)
    } catch (err) {
      console.warn('Backend bulk attendance failed, saving to local store:', err)
    }
    const facultyIds = payload.facultyIds || []
    const date = String(payload.attendanceDate || new Date().toISOString().slice(0, 10)).slice(0, 10)
    const status = payload.status || 'Present'
    const remarks = payload.remarks || ''
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    for (const facId of facultyIds) {
      saveLocalAttendanceRecord({
        facultyId: String(facId),
        date,
        attendanceDate: date,
        status,
        checkIn: isWorking ? '09:00' : '',
        checkOut: isWorking ? '17:00' : '',
        remarks,
      })
    }
    return result || { success: true }
  },
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
