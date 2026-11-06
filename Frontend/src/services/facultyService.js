import { collegeStorageKey } from '../utils/collegeScope.js'
import { facultyCreatePayload, facultyUpdatePayload, facultyProfilePayload, normalizeAllocation, allocationPayload, facultyEmployeeCode } from './facultyContracts'
import { newestFirst } from '../utils/newestFirst'
import { API_BASE_URL, facultyApi, facultyAttendanceApi, facultyDocumentApi, facultyProfileApi, facultySubjectAllocationApi } from '../api/apiEndpoints'

const first = (source, keys, fallback = '') => keys.map(key => source?.[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback
const list = value => Array.isArray(value) ? value : []
const toCollegeKey = key => { try { return typeof collegeStorageKey === 'function' ? collegeStorageKey(key) : key } catch { return key } }
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

  const rawDob = first(source, ['dob', 'dateOfBirth', 'DateOfBirth', 'DOB'])
  const dob = rawDob && String(rawDob) !== 'undefined' ? String(rawDob).slice(0, 10) : ''
  const rawJoining = first(source, ['joiningDate', 'dateOfJoining', 'DateOfJoining', 'JoiningDate'])
  const joiningDate = rawJoining && String(rawJoining) !== 'undefined' ? String(rawJoining).slice(0, 10) : ''

  const isHexUUID = str => !str || /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(str).trim()) || /^[0-9a-f]{32}$/i.test(String(str).trim())

  const rawEmpId = first(source, ['employeeId', 'employeeCode', 'employee_code', 'EmployeeId', 'EmployeeCode'])
  const rawCode = first(source, ['facultyCode', 'faculty_code', 'FacultyCode'])
  const legacyIsFac = !isHexUUID(rawEmpId) && /^FAC/i.test(rawEmpId || '')
  const facultyCode = (!isHexUUID(rawCode) && rawCode) ? rawCode : (legacyIsFac ? rawEmpId : '')
  const isNumericId = /^[1-9]\d*$/.test(String(facultyId || id || '').trim())
  const validEmployeeId = isNumericId
    ? facultyEmployeeCode(facultyId || id)
    : (isHexUUID(rawEmpId) || legacyIsFac ? '' : (rawEmpId || ''))

  return {
    ...source,
    id,
    facultyId,
    collegeId: first(source, ['collegeId', 'college_id', 'CollegeId', 'collId', 'CollId'], ''),
    facultyCode,
    employeeId: validEmployeeId,
    fullName: first(source, ['fullName', 'facultyName', 'name', 'FullName', 'FacultyName', 'userName', 'username'], [source.firstName, source.lastName].filter(Boolean).join(' ')),
    email: first(source, ['email', 'officialEmail', 'workEmail', 'Email', 'OfficialEmail'], ''),
    mobile: first(source, ['mobile', 'phoneNumber', 'phone', 'mobileNumber', 'Mobile', 'PhoneNumber', 'Phone', 'MobileNumber'], ''),
    department: first(source, ['departmentName', 'department', 'DepartmentName', 'Department', 'deptName', 'DeptName'], ''),
    departmentId: first(source, ['departmentId', 'DepartmentId', 'department_id', 'deptId', 'DeptId'], ''),
    branch: first(source, ['branchName', 'branch', 'BranchName', 'Branch', 'branchCode', 'BranchCode'], ''),
    branchId: first(source, ['branchId', 'BranchId', 'branch_id'], ''),
    designation: first(source, ['designation', 'title', 'Designation', 'Title', 'designationName', 'DesignationName'], ''),
    qualification: first(source, ['qualification', 'highestQualification', 'Qualification'], ''),
    qualificationOther: first(source, ['qualificationOther', 'QualificationOther'], ''),
    specialization: first(source, ['specialization', 'Specialization'], ''),
    university: first(source, ['university', 'institution', 'University', 'Institution'], ''),
    passingYear: first(source, ['passingYear', 'yearOfPassing', 'PassingYear', 'YearOfPassing'], ''),
    experience: first(source, ['experienceYears', 'experience', 'teachingExperience', 'ExperienceYears', 'Experience'], ''),
    teachingExperience: first(source, ['teachingExperience', 'TeachingExperience'], ''),
    industryExperience: first(source, ['industryExperience', 'IndustryExperience'], ''),
    employmentType: first(source, ['employmentType', 'appointmentType', 'EmploymentType'], ''),
    employmentStatus: first(source, ['employmentStatus', 'statusName', 'EmploymentStatus', 'StatusName'], typeof source.status === 'string' ? source.status : source.status === 0 ? 'Inactive' : 'Working'),
    gender: first(source, ['gender', 'genderName', 'sex', 'Gender'], ''),
    dob,
    joiningDate,
    photo: facultyPhoto(source),
    address: first(source, ['address', 'Address', 'currentAddress', 'CurrentAddress', 'permanentAddress', 'PermanentAddress'], ''),
    city: first(source, ['city', 'City', 'currentCity', 'permanentCity'], ''),
    state: first(source, ['state', 'State', 'currentState', 'permanentState'], ''),
    pincode: first(source, ['pincode', 'Pincode', 'pinCode', 'zipCode', 'postalCode'], ''),
    alternateMobile: first(source, ['alternateMobile', 'altMobile', 'AlternateMobile', 'AltMobile'], ''),
    personalEmail: first(source, ['personalEmail', 'PersonalEmail'], ''),
    emergencyName: first(source, ['emergencyName', 'emergencyContactName', 'EmergencyContactName'], ''),
    emergencyMobile: first(source, ['emergencyMobile', 'emergencyContactNumber', 'EmergencyContactNumber'], ''),
    relationship: first(source, ['relationship', 'emergencyContactRelation', 'EmergencyContactRelation'], ''),
    employeeCategoryOther: first(source, ['employeeCategoryOther', 'EmployeeCategoryOther'], ''),
    documents: source.documents || {},
    employeeCategory: (() => {
      const raw = first(source, ['employeeCategory', 'category', 'facultyType', 'EmployeeCategory', 'Category', 'FacultyType'], '')
      if (raw) {
        if (/non/i.test(raw) || /other/i.test(raw)) return 'Non-Teaching'
        if (/teaching/i.test(raw)) return 'Teaching'
      }
      const des = String(first(source, ['designation', 'title', 'Designation', 'Title', 'designationName', 'DesignationName', 'role', 'Role'], '')).trim().toLowerCase()
      const teachingRoles = ['professor', 'associate professor', 'assistant professor', 'senior lecturer', 'lecturer', 'visiting faculty', 'guest faculty', 'hod', 'dean']
      if (teachingRoles.some(r => r === des)) return 'Teaching'
      const nonTeachingRoles = ['librarian', 'assistant librarian', 'lab assistant', 'lab technician', 'system administrator', 'network administrator', 'network engineer', 'accountant', 'administrative officer', 'office assistant', 'junior assistant', 'attender', 'store keeper', 'technical assistant', 'clerk', 'warden', 'security guard', 'electrician', 'driver', 'plumber']
      const isNonTeaching = nonTeachingRoles.includes(des) || /\b(librar|lab|system|network|account|administrat|office|junior assistant|store|technical assistant|clerk|attender|warden|security|driver|electrician|plumber|staff|non[-\s]?teaching)\b/i.test(des)
      return isNonTeaching ? 'Non-Teaching' : 'Teaching'
    })(),
    assignments: list(source.assignments ?? source.subjectAllocations),
  }
}

const LOCAL_FACULTY_KEY = 'pirnav-faculty-local-records-v1'
const LOCAL_PROFILE_KEY = 'pirnav-faculty-local-profiles-v1'
const LOCAL_ALLOCATIONS_KEY = 'pirnav-faculty-local-allocations-v1'
const withFacultyPhoto = async (row, requestOptions) => {
  const member = normalizeFaculty(row)
  if (member.photo || !member.id) return member
  try {
    const profile = await facultyProfileApi.get(member.id, requestOptions)
    const photo = normalizeFaculty(profile).photo
    if (photo) return { ...member, photo }
  } catch { /* A missing profile must not hide the faculty row. */ }
  return member
}

const listFaculty = async (params, search = false, requestOptions) => {
  const rows = await (search ? facultyApi.search(params, requestOptions) : facultyApi.getAll(params, requestOptions))
  const members = []
  for (let index = 0; index < rows.length; index += 4) {
    members.push(...await Promise.all(rows.slice(index, index + 4).map(row => withFacultyPhoto(row, requestOptions))))
  }
  return newestFirst('faculty', members)
}

export const clearFacultyLocalStorage = () => {
  try {
    localStorage.removeItem(toCollegeKey(LOCAL_FACULTY_KEY))
    localStorage.removeItem(toCollegeKey(LOCAL_PROFILE_KEY))
    localStorage.removeItem(toCollegeKey(LOCAL_ALLOCATIONS_KEY))
    localStorage.removeItem(toCollegeKey('pirnav-faculty-local-attendance-v1'))
    localStorage.removeItem(toCollegeKey('pirnav-faculty-local-payroll-status-v1'))
    localStorage.removeItem(toCollegeKey('pirnav-faculty-local-salary-structures-v1'))
    localStorage.removeItem(toCollegeKey('pirnav-faculty-local-leave-decisions-v1'))
    localStorage.removeItem(toCollegeKey('pirnav-faculty-local-leave-policies-v1'))
    localStorage.removeItem(toCollegeKey('pirnav-faculty-local-leave-types-v1'))
  } catch { /* ignore */ }
}

export const facultyService = {
  list: (params, requestOptions) => listFaculty(params, false, requestOptions),
  search: (params, requestOptions) => listFaculty(params, true, requestOptions),
  getById: async id => withFacultyPhoto(await facultyApi.getById(id)),
  create: async (payload, collegeId = payload.collegeId) => {
    const createCollegeId = Number(collegeId)
    const createData = { ...payload, collegeId: createCollegeId }
    const created = await facultyApi.create(facultyCreatePayload(createData), createCollegeId)
    if (!created?.id && !created?.facultyId) throw new Error('The server did not return the saved faculty record.')
    const result = normalizeFaculty({
      ...payload,
      ...created,
      id: String(created.id || created.facultyId),
      facultyId: String(created.id || created.facultyId),
      facultyCode: created.facultyCode ?? '',
      employeeCategory: created.employeeCategory || payload.employeeCategory || 'Teaching',
    })
    return result
  },
  update: async (id,payload) => { const result = await facultyApi.update(id,facultyUpdatePayload(payload)); return normalizeFaculty({ ...payload,...result,id:String(id),facultyId:String(id) }) },
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
  getStatusHistory: id => facultyApi.getStatusHistory(id),
  uploadProfilePhoto: (id,file,metadata={}) => facultyApi.uploadProfilePhoto(id,file,metadata),
  getProfile: id => facultyProfileApi.get(id),
  createProfile: (id,payload) => facultyProfileApi.create(id,facultyProfilePayload(payload)),
  updateProfile: (id,payload) => facultyProfileApi.update(id,facultyProfilePayload(payload)),
  getDocuments: id => facultyDocumentApi.getAll(id),
  uploadDocument: facultyDocumentApi.upload,
  deleteDocument: facultyDocumentApi.remove,
  getSubjectAllocations: async params => (await facultySubjectAllocationApi.getAll(params)).map(normalizeAllocation),
  createSubjectAllocation: async payload => normalizeAllocation(await facultySubjectAllocationApi.create(allocationPayload(payload))),
  updateSubjectAllocation: async (id,payload) => normalizeAllocation(await facultySubjectAllocationApi.update(id,allocationPayload(payload,true))),
  deleteSubjectAllocation: id => facultySubjectAllocationApi.remove(id),
  getAttendance: params => facultyAttendanceApi.getAll(params),
  getAttendanceById: facultyAttendanceApi.getById,
  createAttendance: payload => facultyAttendanceApi.create(payload),
  updateAttendance: (id,payload) => facultyAttendanceApi.update(id,payload),
  checkIn: (id,payload={}) => facultyAttendanceApi.checkIn(id,payload),
  checkOut: (id,payload={}) => facultyAttendanceApi.checkOut(id,payload),
  getDailyAttendance: params => facultyAttendanceApi.getDaily(params),
  bulkAttendance: payload => facultyAttendanceApi.bulk(payload),
  getWeeklyAttendance: params => facultyAttendanceApi.getWeekly(params),
  getMonthlyAttendance: params => facultyAttendanceApi.getMonthly(params),
  getAttendanceReports: params => facultyAttendanceApi.getReports(params),
  exportAttendance: facultyAttendanceApi.export,
}

export const facultyCapability = Object.freeze({ directory: true, details: true, facultyCrud: true, documents: true, subjectAllocation: true, workloadEndpoint: true, attendance: true })
export default facultyService
