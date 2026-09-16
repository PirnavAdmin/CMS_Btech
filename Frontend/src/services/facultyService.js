import { facultyCreatePayload, facultyUpdatePayload, facultyProfilePayload, normalizeAllocation, allocationPayload } from './facultyContracts'
import { newestFirst } from '../utils/newestFirst'
import { facultyApi, facultyAttendanceApi, facultyDocumentApi, facultyProfileApi, facultySubjectAllocationApi } from '../api/apiEndpoints'

const first = (source, keys, fallback = '') => keys.map(key => source?.[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback
const list = value => Array.isArray(value) ? value : []

// The UI historically used employeeId/employmentStatus while the API may use
// employeeCode/status. Normalising at this boundary keeps pages API-agnostic.
export const normalizeFaculty = (source = {}) => {
  // A partially populated result (or a null item in a paginated response)
  // must not take down the Faculty directory.
  source = source || {}
  return {
  ...source,
  id: String(first(source, ['facultyId', 'id', 'employeeProfileId'], '')),
  facultyId: first(source, ['facultyId', 'id', 'employeeProfileId'], ''),
  employeeId: first(source, ['facultyCode', 'employeeId', 'employeeCode', 'employeeNumber'], ''),
  fullName: first(source, ['fullName', 'facultyName', 'name'], ''),
  email: first(source, ['email', 'officialEmail', 'workEmail'], ''),
  mobile: first(source, ['mobile', 'phoneNumber', 'phone', 'mobileNumber'], ''),
  department: first(source, ['departmentName', 'department'], ''),
  departmentId: first(source, ['departmentId'], ''),
  designation: first(source, ['designation', 'title'], ''),
  qualification: first(source, ['qualification', 'highestQualification'], ''),
  experience: first(source, ['experienceYears', 'experience', 'teachingExperience'], ''),
  employmentType: first(source, ['employmentType', 'appointmentType'], ''),
  employmentStatus: first(source, ['employmentStatus', 'statusName'], typeof source.status === 'string' ? source.status : source.status === 0 ? 'Inactive' : 'Working'),
  dob: first(source, ['dob', 'dateOfBirth']), joiningDate: first(source, ['joiningDate', 'dateOfJoining']),
  photo: first(source, ['photo', 'profilePhotoUrl', 'photoUrl']),
  emergencyName: first(source, ['emergencyName', 'emergencyContactName']), emergencyMobile: first(source, ['emergencyMobile', 'emergencyContactNumber']), relationship: first(source, ['relationship', 'emergencyContactRelation']),
  employeeCategory: first(source, ['employeeCategory', 'category'], 'Teaching'),
  assignments: list(source.assignments ?? source.subjectAllocations),
  }
}

const listFaculty = async (params, search = false) => {
  const records = []; let page = 1
  while (true) {
    const rows = await (search ? facultyApi.search : facultyApi.getAll)({ ...params, PageNumber: page, PageSize: 100 })
    const validRows = rows.filter(row => row && typeof row === 'object')
    const fresh = validRows.filter(row => !records.some(existing => String(existing.facultyId ?? existing.id) === String(row.facultyId ?? row.id)))
    records.push(...fresh)
    if (rows.length < 100 || !fresh.length) break
    page++
  }
  return newestFirst('faculty', records.filter(row => row && typeof row === 'object').map(normalizeFaculty))
}

export const facultyService = {
  list: params => listFaculty(params),
  search: params => listFaculty(params, true),
  getById: async id => normalizeFaculty(await facultyApi.getById(id)),
  create: async payload => normalizeFaculty(await facultyApi.create(facultyCreatePayload(payload))),
  update: async (id, payload) => normalizeFaculty(await facultyApi.update(id, facultyUpdatePayload(payload))),
  getSummary: facultyApi.getSummary, getWorkload: facultyApi.getWorkload,
  updateStatus: facultyApi.updateStatus, getStatusHistory: facultyApi.getStatusHistory, uploadProfilePhoto: facultyApi.uploadProfilePhoto,
  getProfile: facultyProfileApi.get, createProfile: (id, payload) => facultyProfileApi.create(id, facultyProfilePayload(payload)), updateProfile: (id, payload) => facultyProfileApi.update(id, facultyProfilePayload(payload)),
  getDocuments: facultyDocumentApi.getAll, uploadDocument: facultyDocumentApi.upload, deleteDocument: facultyDocumentApi.remove,
  getSubjectAllocations: async params => (await facultySubjectAllocationApi.getAll(params)).map(normalizeAllocation), createSubjectAllocation: async payload => normalizeAllocation(await facultySubjectAllocationApi.create(allocationPayload(payload))),
  updateSubjectAllocation: async (id, payload) => normalizeAllocation(await facultySubjectAllocationApi.update(id, allocationPayload(payload, true))), deleteSubjectAllocation: facultySubjectAllocationApi.remove,
  getAttendance: facultyAttendanceApi.getAll, getAttendanceById: facultyAttendanceApi.getById,
  createAttendance: facultyAttendanceApi.create, updateAttendance: facultyAttendanceApi.update,
  checkIn: facultyAttendanceApi.checkIn, checkOut: facultyAttendanceApi.checkOut,
  getDailyAttendance: facultyAttendanceApi.getDaily, bulkAttendance: facultyAttendanceApi.bulk, getWeeklyAttendance: facultyAttendanceApi.getWeekly, getMonthlyAttendance: facultyAttendanceApi.getMonthly, getAttendanceReports: facultyAttendanceApi.getReports, exportAttendance: facultyAttendanceApi.export,
}

export const facultyCapability = Object.freeze({ directory: true, details: true, facultyCrud: true, documents: true, subjectAllocation: true, workloadEndpoint: true, attendance: true })
export default facultyService
