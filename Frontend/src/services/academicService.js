import {
  getColleges,
  unwrapCollegeRecord,
  getDepartments,
  getCourses as getCoursesAcademic,
  getSemesters as getSemestersAcademic,
} from '../auth/collegeApi'
import {
  academicYearApi,
  branchApi,
  courseApi,
  courseStructureApi,
  departmentApi,
  sectionApi,
} from '../api/apiEndpoints'
import eventBus, { ERP_EVENTS } from './eventBus'

/**
 * Academic Service
 * Centralizes academic hierarchy queries, active-only filters, caching,
 * and ID-to-entity resolution across the entire Digital Campus ERP.
 */

// Helper to determine active status across varied schemas
export const isRecordActive = (record) => {
  if (!record) return false
  if (record.status !== undefined) {
    if (typeof record.status === 'boolean') return record.status
    if (typeof record.status === 'number') return record.status === 1
    const s = String(record.status).trim().toLowerCase()
    return s === 'active' || s === '1' || s === 'true' || s === 'current'
  }
  if (record.isActive !== undefined) {
    return Boolean(record.isActive)
  }
  if (record.isCurrent !== undefined) {
    return Boolean(record.isCurrent)
  }
  // Default to true if not specified
  return true
}

export const filterActiveOnly = (list) => {
  if (!Array.isArray(list)) return []
  return list.filter(isRecordActive)
}

class AcademicService {
  constructor() {
    this._cache = new Map()
    this._ttl = 30000 // 30 seconds

    // Invalidate cache on academic updates
    eventBus.subscribe(ERP_EVENTS.ACADEMIC_UPDATED, () => {
      this.clearCache()
    })
  }

  clearCache() {
    this._cache.clear()
  }

  async _fetchCached(key, fetcher) {
    const cached = this._cache.get(key)
    const now = Date.now()
    if (cached && now - cached.timestamp < this._ttl) {
      return cached.data
    }
    const data = await fetcher()
    this._cache.set(key, { data, timestamp: now })
    return data
  }

  // Colleges
  async getColleges(activeOnly = false) {
    const data = await this._fetchCached('colleges', async () => {
      try {
        const res = await getColleges()
        const raw = res?.data?.data ?? res?.data?.colleges ?? res?.data ?? []
        const list = Array.isArray(raw) ? raw : [raw]
        return list.map(c => {
          const unwrapped = unwrapCollegeRecord(c)
          return {
            id: unwrapped.collegeId ?? unwrapped.id,
            collegeId: unwrapped.collegeId ?? unwrapped.id,
            name: unwrapped.collegeName ?? unwrapped.name ?? 'Pirnav Engineering College',
            code: unwrapped.collegeCode ?? unwrapped.code ?? 'PEC',
            status: unwrapped.status ?? 'Active',
            ...unwrapped
          }
        })
      } catch (err) {
        console.warn('Fallback loading colleges:', err)
        return [{
          id: 1,
          collegeId: 1,
          name: 'Pirnav Engineering College',
          code: 'PEC',
          status: 'Active'
        }]
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Academic Years
  async getAcademicYears(activeOnly = false) {
    const data = await this._fetchCached('academicYears', async () => {
      try {
        const list = await academicYearApi.getAll()
        return (Array.isArray(list) ? list : []).map(y => {
          const status = String(y.status ?? '').trim().toLowerCase()
          const start = y.startDate ? new Date(y.startDate) : null
          const end = y.endDate ? new Date(y.endDate) : null
          const today = new Date()
          const dateCurrent = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && today >= start && today <= end
          const isCurrent = Boolean(y.isCurrent || y.isActive === true || Number(y.isActive) === 1 || status === 'active' || status === 'current' || Number(y.status) === 1 || dateCurrent)
          return {
            ...y,
            id: y.academicYearId ?? y.id,
            academicYearId: y.academicYearId ?? y.id,
            name: y.academicYearName ?? y.name ?? '',
            academicYearName: y.academicYearName ?? y.name ?? '',
            startDate: y.startDate,
            endDate: y.endDate,
            status: isCurrent ? 'Active' : (y.status ?? 'Inactive'),
            isCurrent,
          }
        })
      } catch (err) {
        console.warn('Fallback loading academic years:', err)
        return []
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Departments
  async getDepartments(activeOnly = false) {
    const data = await this._fetchCached('departments', async () => {
      try {
        let list = []
        try {
          const res = await getDepartments()
          list = res?.data?.data ?? res?.data ?? []
        } catch {
          list = await departmentApi.getAll()
        }
        return (Array.isArray(list) ? list : []).map(d => ({
          id: d.departmentId ?? d.id,
          departmentId: d.departmentId ?? d.id,
          name: d.departmentName ?? d.name ?? '',
          code: d.departmentCode ?? d.code ?? '',
          collegeId: d.collegeId ?? 1,
          status: d.status ?? 'Active',
          ...d
        }))
      } catch (err) {
        console.warn('Fallback loading departments:', err)
        return []
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Courses
  async getCourses(params = {}, activeOnly = false) {
    const cacheKey = `courses:${JSON.stringify(params)}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        try {
          const res = await getCoursesAcademic()
          list = res?.data?.data ?? res?.data ?? []
        } catch {
          list = await courseApi.getAll(params)
        }
        return (Array.isArray(list) ? list : []).map(c => ({
          id: c.courseId ?? c.id,
          courseId: c.courseId ?? c.id,
          name: c.courseName ?? c.name ?? '',
          code: c.courseCode ?? c.code ?? '',
          departmentId: c.departmentId,
          collegeId: c.collegeId ?? 1,
          status: c.status ?? 'Active',
          durationYears: c.durationYears ?? 4,
          totalSemesters: c.totalSemesters ?? 8,
          ...c
        }))
      } catch (err) {
        console.warn('Fallback loading courses:', err)
        return []
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Branches (Optionally filtered by courseId)
  async getBranches(courseId = null, activeOnly = false) {
    const cacheKey = `branches:${courseId || 'all'}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        if (courseId) {
          list = await branchApi.getByCourse(courseId)
        } else {
          list = await branchApi.getAll()
        }
        return (Array.isArray(list) ? list : []).map(b => ({
          id: b.branchId ?? b.id,
          branchId: b.branchId ?? b.id,
          name: b.branchName ?? b.name ?? '',
          code: b.branchCode ?? b.code ?? '',
          courseId: b.courseId,
          departmentId: b.departmentId,
          status: b.status ?? (b.status === 0 ? 'Inactive' : 'Active'),
          totalSemesters: b.totalSemesters ?? 8,
          intakeCapacity: b.intakeCapacity ?? 60,
          ...b
        }))
      } catch (err) {
        console.warn('Fallback loading branches:', err)
        return []
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Semesters / Course Structure (Optionally filtered by courseId)
  async getSemesters(courseId = null, activeOnly = false) {
    const cacheKey = `semesters:${courseId || 'all'}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        if (courseId) {
          list = await courseStructureApi.getByCourse(courseId)
        } else {
          try {
            const res = await getSemestersAcademic()
            list = res?.data?.data ?? res?.data ?? []
          } catch {
            list = await courseStructureApi.getAll()
          }
        }
        if (!Array.isArray(list) || list.length === 0) {
          // Standard 8 Semesters fallback if structure is not yet seeded
          list = Array.from({ length: 8 }, (_, i) => ({
            semesterId: i + 1,
            id: i + 1,
            semesterNumber: i + 1,
            semesterName: `Semester ${i + 1}`,
            status: 'Active',
          }))
        }
        return list.map(s => ({
          id: s.semesterId ?? s.id ?? s.semesterNumber,
          semesterId: s.semesterId ?? s.id ?? s.semesterNumber,
          semesterNumber: s.semesterNumber ?? s.id,
          semesterName: s.semesterName ?? s.name ?? `Semester ${s.semesterNumber ?? s.id}`,
          courseId: s.courseId,
          branchId: s.branchId,
          status: s.status ?? 'Active',
          ...s
        }))
      } catch (err) {
        console.warn('Fallback loading semesters:', err)
        return Array.from({ length: 8 }, (_, i) => ({
          semesterId: i + 1,
          id: i + 1,
          semesterNumber: i + 1,
          semesterName: `Semester ${i + 1}`,
          status: 'Active',
        }))
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Sections (Optionally filtered by params: { courseId, branchId, semesterId, academicYearId })
  async getSections(params = {}, activeOnly = false) {
    const cacheKey = `sections:${JSON.stringify(params)}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        if (params && Object.keys(params).length > 0) {
          list = await sectionApi.search(params)
        } else {
          list = await sectionApi.getAll()
        }
        return (Array.isArray(list) ? list : []).map(sec => ({
          id: sec.sectionId ?? sec.id,
          sectionId: sec.sectionId ?? sec.id,
          name: sec.sectionName ?? sec.name ?? '',
          code: sec.sectionCode ?? sec.code ?? '',
          collegeId: sec.collegeId,
          academicYearId: sec.academicYearId,
          departmentId: sec.departmentId,
          courseId: sec.courseId,
          branchId: sec.branchId,
          semesterId: sec.semesterId,
          capacity: sec.capacity ?? 60,
          status: sec.status ?? 'Active',
          shift: sec.shift ?? 'Morning',
          room: sec.room ?? '',
          ...sec
        }))
      } catch (err) {
        console.warn('Fallback loading sections:', err)
        return []
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Resolve Names from IDs for consistent display across modules
  async resolveHierarchyNames(ids = {}) {
    const { collegeId, academicYearId, departmentId, courseId, branchId, semesterId, sectionId } = ids

    const [colleges, years, departments, courses, branches, semesters, sections] = await Promise.all([
      collegeId ? this.getColleges() : Promise.resolve([]),
      academicYearId ? this.getAcademicYears() : Promise.resolve([]),
      departmentId ? this.getDepartments() : Promise.resolve([]),
      courseId ? this.getCourses() : Promise.resolve([]),
      branchId ? this.getBranches(courseId) : Promise.resolve([]),
      semesterId ? this.getSemesters(courseId) : Promise.resolve([]),
      sectionId ? this.getSections() : Promise.resolve([]),
    ])

    const college = colleges.find(c => String(c.id) === String(collegeId))
    const academicYear = years.find(y => String(y.id) === String(academicYearId))
    const department = departments.find(d => String(d.id) === String(departmentId))
    const course = courses.find(c => String(c.id) === String(courseId))
    const branch = branches.find(b => String(b.id) === String(branchId))
    const semester = semesters.find(s => String(s.id) === String(semesterId) || String(s.semesterNumber) === String(semesterId))
    const section = sections.find(sec => String(sec.id) === String(sectionId))

    return {
      collegeName: college?.name || 'Pirnav Engineering College',
      academicYearName: academicYear?.name || '',
      departmentName: department?.name || '',
      courseName: course?.name || '',
      branchName: branch?.name || '',
      semesterName: semester?.semesterName || (semesterId ? `Semester ${semesterId}` : ''),
      sectionName: section?.name || '',
    }
  }
}

export const academicService = new AcademicService()
export default academicService
