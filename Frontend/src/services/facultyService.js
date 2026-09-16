import { facultyApi, facultyAttendanceApi, facultyDocumentApi, facultyProfileApi, facultySubjectAllocationApi } from '../api/apiEndpoints'

const first = (source, keys, fallback = '') => keys.map(key => source?.[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback
const list = value => Array.isArray(value) ? value : []

// The UI historically used employeeId/employmentStatus while the API may use
// employeeCode/status. Normalising at this boundary keeps pages API-agnostic.
export const normalizeFaculty = (source = {}) => ({
  ...source,
  id: String(first(source, ['facultyId', 'id', 'employeeProfileId'], '')),
  facultyId: first(source, ['facultyId', 'id', 'employeeProfileId'], ''),
  employeeId: first(source, ['employeeId', 'employeeCode', 'employeeNumber'], ''),
  fullName: first(source, ['fullName', 'name', 'facultyName'], ''),
  email: first(source, ['email', 'officialEmail', 'workEmail'], ''),
  mobile: first(source, ['mobile', 'phone', 'mobileNumber'], ''),
  department: first(source, ['departmentName', 'department'], ''),
  departmentId: first(source, ['departmentId'], ''),
  designation: first(source, ['designation', 'title'], ''),
  qualification: first(source, ['qualification', 'highestQualification'], ''),
  experience: first(source, ['experience', 'teachingExperience'], ''),
  employmentType: first(source, ['employmentType', 'appointmentType'], ''),
  employmentStatus: first(source, ['employmentStatus', 'status'], 'Working'),
  employeeCategory: first(source, ['employeeCategory', 'category'], 'Teaching'),
  assignments: list(source.assignments ?? source.subjectAllocations),
})

const facultyPayload = faculty => ({ ...faculty, facultyId: faculty.facultyId || faculty.id })

export const facultyService = {
  list: async params => (await facultyApi.getAll(params)).map(normalizeFaculty),
  search: async params => (await facultyApi.search(params)).map(normalizeFaculty),
  getById: async id => normalizeFaculty(await facultyApi.getById(id)),
  create: async payload => normalizeFaculty(await facultyApi.create(facultyPayload(payload))),
  update: async (id, payload) => normalizeFaculty(await facultyApi.update(id, facultyPayload(payload))),
  getSummary: facultyApi.getSummary, getWorkload: facultyApi.getWorkload,
  updateStatus: facultyApi.updateStatus, getStatusHistory: facultyApi.getStatusHistory, uploadProfilePhoto: facultyApi.uploadProfilePhoto,
  getProfile: facultyProfileApi.get, createProfile: facultyProfileApi.create, updateProfile: facultyProfileApi.update,
  getDocuments: facultyDocumentApi.getAll, uploadDocument: facultyDocumentApi.upload, deleteDocument: facultyDocumentApi.remove,
  getSubjectAllocations: facultySubjectAllocationApi.getAll, createSubjectAllocation: facultySubjectAllocationApi.create,
  updateSubjectAllocation: facultySubjectAllocationApi.update, deleteSubjectAllocation: facultySubjectAllocationApi.remove,
  getAttendance: facultyAttendanceApi.getAll, getAttendanceById: facultyAttendanceApi.getById,
  createAttendance: facultyAttendanceApi.create, updateAttendance: facultyAttendanceApi.update,
  checkIn: facultyAttendanceApi.checkIn, checkOut: facultyAttendanceApi.checkOut,
  getAttendanceReports: facultyAttendanceApi.getReports, exportAttendance: facultyAttendanceApi.export,
}

export const facultyCapability = Object.freeze({ directory: true, details: true, facultyCrud: true, documents: true, subjectAllocation: true, workloadEndpoint: true, attendance: true })
export default facultyService
