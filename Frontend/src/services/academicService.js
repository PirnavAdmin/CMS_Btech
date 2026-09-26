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
  const rawStatus = record.status ?? record.courseStatus ?? record.departmentStatus ?? record.academicYearStatus ?? record.state
  if (rawStatus !== undefined && rawStatus !== null && rawStatus !== '') {
    if (typeof rawStatus === 'boolean') return rawStatus
    if (typeof rawStatus === 'number') return rawStatus === 1
    const s = String(rawStatus).trim().toLowerCase()
    if (s === 'inactive' || s === '0' || s === 'false' || s === 'deactive' || s === 'deactivated' || s === 'disabled' || s === 'archived') return false
    if (s === 'active' || s === '1' || s === 'true' || s === 'current') return true
  }
  if (record.isActive !== undefined && record.isActive !== null) {
    if (typeof record.isActive === 'boolean') return record.isActive
    if (typeof record.isActive === 'number') return record.isActive === 1
    const s = String(record.isActive).trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'active'
  }
  if (record.is_active !== undefined && record.is_active !== null) {
    if (typeof record.is_active === 'boolean') return record.is_active
    if (typeof record.is_active === 'number') return record.is_active === 1
    const s = String(record.is_active).trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'active'
  }
  if (record.isCurrent !== undefined && record.isCurrent !== null) {
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
    if (!data?.loadError) this._cache.set(key, { data, timestamp: now })
    return data
  }

  // Colleges
  async getColleges(activeOnly = true) {
    const data = await this._fetchCached('colleges', async () => {
      try {
        const res = await getColleges()
        let raw = res?.data ?? res
        let list = []
        if (Array.isArray(raw)) {
          list = raw
        } else if (Array.isArray(raw?.colleges)) {
          list = raw.colleges
        } else if (Array.isArray(raw?.items)) {
          list = raw.items
        } else if (Array.isArray(raw?.records)) {
          list = raw.records
        } else if (Array.isArray(raw?.results)) {
          list = raw.results
        } else if (Array.isArray(raw?.data)) {
          list = raw.data
        } else if (raw && typeof raw === 'object' && (raw.id || raw.collegeId || raw.name || raw.collegeName)) {
          list = [raw]
        }

        const mapped = list.map(c => {
          const unwrapped = unwrapCollegeRecord(c)
          const id = String(unwrapped.collegeId ?? unwrapped.id ?? unwrapped.CollegeId ?? unwrapped.Id ?? '')
          const name = unwrapped.collegeName ?? unwrapped.name ?? unwrapped.CollegeName ?? unwrapped.institutionName ?? ''
          const code = unwrapped.collegeCode ?? unwrapped.code ?? unwrapped.CollegeCode ?? ''
          const status = unwrapped.status ?? unwrapped.collegeStatus ?? unwrapped.isActive ?? 'Active'
          return {
            ...unwrapped,
            id: id || name,
            collegeId: id || name,
            name,
            code,
            status,
          }
        }).filter(c => Boolean(c.name))

        return mapped
      } catch (err) {
        console.warn('Fallback loading colleges:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Academic Years
  async getAcademicYears(activeOnly = true) {
    const data = await this._fetchCached('academicYears', async () => {
      try {
        const list = await academicYearApi.getAll()
        const mapped = (Array.isArray(list) ? list : []).map(y => {
          const status = String(y.status ?? '').trim().toLowerCase()
          const start = y.startDate ? new Date(y.startDate) : null
          const end = y.endDate ? new Date(y.endDate) : null
          const today = new Date()
          const dateCurrent = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && today >= start && today <= end
          const isCurrent = Boolean(y.isCurrent || y.isActive === true || Number(y.isActive) === 1 || status === 'active' || status === 'current' || Number(y.status) === 1 || dateCurrent)
          return {
            ...y,
            id: String(y.academicYearId ?? y.id),
            academicYearId: String(y.academicYearId ?? y.id),
            name: y.academicYearName ?? y.name ?? '',
            academicYearName: y.academicYearName ?? y.name ?? '',
            startDate: y.startDate,
            endDate: y.endDate,
            status: isCurrent ? 'Active' : (y.status ?? 'Archived'),
            isCurrent,
          }
        }).filter(y => Boolean(y.name))

        return mapped.sort((a, b) => {
          if (a.isCurrent && !b.isCurrent) return -1
          if (!a.isCurrent && b.isCurrent) return 1
          return String(b.name || '').localeCompare(String(a.name || ''))
        })
      } catch (err) {
        console.warn('Fallback loading academic years:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Departments
  async getDepartments(activeOnly = true) {
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
          collegeId: d.collegeId,
          status: d.status,
          ...d
        }))
      } catch (err) {
        console.warn('Fallback loading departments:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Courses
  async getCourses(params = {}, activeOnly = true) {
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
          collegeId: c.collegeId,
          status: c.status,
          durationYears: c.durationYears,
          totalSemesters: c.totalSemesters,
          ...c
        }))
      } catch (err) {
        console.warn('Fallback loading courses:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Branches (Optionally filtered by courseId)
  async getBranches(courseId = null, activeOnly = true) {
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
          status: b.status,
          totalSemesters: b.totalSemesters,
          intakeCapacity: b.intakeCapacity,
          ...b
        }))
      } catch (err) {
        console.warn('Fallback loading branches:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Semesters / Course Structure (Optionally filtered by courseId)
  async getSemesters(courseId = null, activeOnly = true) {
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
        return (Array.isArray(list) ? list : []).map(s => ({
          id: s.semesterId ?? s.id ?? s.semesterNumber,
          semesterId: s.semesterId ?? s.id ?? s.semesterNumber,
          semesterNumber: s.semesterNumber ?? s.id,
          semesterName: s.semesterName ?? s.name ?? '',
          courseId: s.courseId,
          branchId: s.branchId,
          status: s.status,
          ...s
        }))
      } catch (err) {
        console.warn('Unable to load semesters:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Sections (Optionally filtered by params: { courseId, branchId, semesterId, academicYearId })
  async getSections(params = {}, activeOnly = true) {
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
          capacity: sec.capacity,
          status: sec.status,
          shift: sec.shift,
          room: sec.room ?? '',
          ...sec
        }))
      } catch (err) {
        console.warn('Fallback loading sections:', err)
        return Object.assign([], { loadError: true })
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
      collegeName: college?.name || '',
      academicYearName: academicYear?.name || '',
      departmentName: department?.name || '',
      courseName: course?.name || '',
      branchName: branch?.name || '',
      semesterName: semester?.semesterName || '',
      sectionName: section?.name || '',
    }
  }
}

export const academicService = new AcademicService()
export default academicService
