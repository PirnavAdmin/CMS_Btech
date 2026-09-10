import { sectionApi } from '../api/apiEndpoints'
import facultyAllocationService from './facultyAllocationService'

const valueOf = (source, keys, fallback = '') => keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback

const normalizeCandidate = (candidate, index = 0) => ({
  id: valueOf(candidate, ['employeeProfileId', 'facultyId', 'id'], `candidate-${index}`),
  employeeProfileId: valueOf(candidate, ['employeeProfileId', 'facultyId', 'id']),
  employeeCode: valueOf(candidate, ['employeeCode', 'employeeId', 'employeeNumber'], 'Not assigned'),
  fullName: valueOf(candidate, ['fullName', 'name', 'facultyName'], 'Faculty Member'),
  email: valueOf(candidate, ['email', 'officialEmail', 'workEmail']),
  mobile: valueOf(candidate, ['mobile', 'phone', 'mobileNumber']),
  departmentId: valueOf(candidate, ['departmentId', 'department?.id']),
  department: valueOf(candidate, ['departmentName', 'department']),
  designation: valueOf(candidate, ['designation', 'title'], 'Faculty'),
  qualification: valueOf(candidate, ['qualification', 'highestQualification']),
  experience: valueOf(candidate, ['experience', 'teachingExperience']),
  status: valueOf(candidate, ['status', 'employmentStatus'], 'Active'),
})

const normalizeSection = (section) => ({
  id: valueOf(section, ['sectionId', 'id']),
  name: valueOf(section, ['sectionName', 'name', 'sectionCode']),
  code: valueOf(section, ['sectionCode', 'code']),
  academicYearId: valueOf(section, ['academicYearId']),
  academicYear: valueOf(section, ['academicYearName', 'academicYear']),
  courseId: valueOf(section, ['courseId']),
  course: valueOf(section, ['courseName', 'course']),
  branchId: valueOf(section, ['branchId']),
  branch: valueOf(section, ['branchName', 'branch']),
  semesterId: valueOf(section, ['semesterId']),
  semester: valueOf(section, ['semesterName', 'semester']),
  facultyAdvisorEmployeeProfileId: valueOf(section, ['facultyAdvisorEmployeeProfileId']),
  advisor: valueOf(section, ['advisor', 'facultyAdvisorName']),
  status: valueOf(section, ['status'], 'Active'),
})

export const facultyService = {
  async list() {
    const sections = (await sectionApi.getAll()).map(normalizeSection).filter((section) => section.id)
    const results = await Promise.allSettled(sections.map((section) => facultyAllocationService.listCandidates(section.id)))
    const faculty = new Map()
    results.forEach((result) => {
      if (result.status !== 'fulfilled') return
      result.value.forEach((candidate, index) => {
        const normalized = normalizeCandidate(candidate, index)
        if (normalized.employeeProfileId) faculty.set(String(normalized.employeeProfileId), normalized)
      })
    })
    return { faculty: [...faculty.values()], sections }
  },

  async getById(id) {
    const { faculty, sections } = await this.list()
    const profile = faculty.find((item) => String(item.id) === String(id) || String(item.employeeProfileId) === String(id))
    return profile ? { ...profile, allocations: sections.filter((section) => String(section.facultyAdvisorEmployeeProfileId) === String(id)) } : null
  },

  async assignAdvisor(sectionId, facultyId) {
    return facultyAllocationService.assignAdvisor(sectionId, facultyId)
  },

  async removeAdvisor(sectionId) {
    return facultyAllocationService.removeAdvisor(sectionId)
  },

  unsupported(operation) {
    throw new Error(`${operation} is not available because the backend exposes no faculty CRUD or subject-allocation endpoint yet.`)
  },
}

export const facultyCapability = Object.freeze({
  directory: true,
  details: true,
  advisorAssignment: true,
  facultyCrud: false,
  documents: false,
  subjectAllocation: false,
  workloadEndpoint: false,
})
