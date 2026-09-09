import {
  studentProfilesApi,
  studentApi,
  studentAdmissionApi,
  sectionAssignmentApi,
} from '../api/apiEndpoints'
import eventBus, { ERP_EVENTS } from './eventBus'

/**
 * Student Service
 * Centralizes student profile queries, section allocations, admissions,
 * and unified student data model across Pirnav ERP.
 */

class StudentService {
  constructor() {
    this._cache = new Map()
    this._ttl = 20000 // 20s

    eventBus.subscribe(ERP_EVENTS.STUDENT_UPDATED, () => this.clearCache())
    eventBus.subscribe(ERP_EVENTS.PROMOTION_EXECUTED, () => this.clearCache())
  }

  clearCache() {
    this._cache.clear()
  }

  async getAllProfiles(params = {}) {
    const key = `profiles:${JSON.stringify(params)}`
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)
      if (Date.now() - entry.timestamp < this._ttl) return entry.data
    }

    try {
      const data = await studentProfilesApi.getAll(params)
      const list = Array.isArray(data) ? data : []
      this._cache.set(key, { data: list, timestamp: Date.now() })
      return list
    } catch (err) {
      console.warn('Fallback fetching student profiles:', err)
      return []
    }
  }

  async getProfileById(id) {
    if (!id) return null
    try {
      return await studentProfilesApi.preview(id)
    } catch (err) {
      console.warn(`Fallback fetching profile for ID ${id}:`, err)
      return null
    }
  }

  async updateProfile(id, payload) {
    const result = await studentProfilesApi.update(id, payload)
    eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { studentId: id, payload: result })
    return result
  }

  // Query students matching academic scope (for Section Allocation, Attendance, Marks/Results, Promotions)
  async getStudentsByScope({ academicYearId, courseId, branchId, semesterId, sectionId, course, branch, semester, section } = {}) {
    const all = await this.getAllProfiles()

    return all.filter((s) => {
      const acad = s.academic || {}

      if (academicYearId && acad.academicYearId && String(acad.academicYearId) !== String(academicYearId)) return false
      if (courseId && acad.courseId && String(acad.courseId) !== String(courseId)) return false
      if (branchId && acad.branchId && String(acad.branchId) !== String(branchId)) return false
      if (semesterId && acad.semesterId && String(acad.semesterId) !== String(semesterId)) return false
      if (sectionId && acad.sectionId && String(acad.sectionId) !== String(sectionId)) return false

      // Fallback name matching if IDs not populated on profile
      if (course && acad.course && String(acad.course).trim().toLowerCase() !== String(course).trim().toLowerCase()) return false
      if (branch && acad.branch && String(acad.branch).trim().toLowerCase() !== String(branch).trim().toLowerCase()) return false
      if (semester && acad.semester && String(acad.semester).trim().toLowerCase() !== String(semester).trim().toLowerCase()) return false
      if (section && acad.section && String(acad.section).trim().toLowerCase() !== String(section).trim().toLowerCase()) return false

      return true
    })
  }

  // Get students assigned to a specific section ID
  async getStudentsForSection(sectionId) {
    if (!sectionId) return []
    try {
      // First check backend section assignment endpoint
      const list = await sectionAssignmentApi.listBySection(sectionId)
      if (Array.isArray(list) && list.length > 0) return list
    } catch (err) {
      console.warn(`Section assignment endpoint fallback for section ${sectionId}:`, err)
    }
    // Fallback to searching profiles by sectionId
    return this.getStudentsByScope({ sectionId })
  }
}

export const studentService = new StudentService()
export default studentService
