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

        const standardColleges = [
          { id: '1', collegeId: '1', name: 'Pirnav Engineering College', code: 'PEC', status: 'Active' },
          { id: '2', collegeId: '2', name: 'VNR VJIET', code: 'VNR', status: 'Active' },
        ]

        const combined = [...mapped]
        for (const std of standardColleges) {
          const normStdName = std.name.toLowerCase().replace(/\s+/g, '')
          const exists = combined.some(c => (c.name || '').toLowerCase().replace(/\s+/g, '') === normStdName || String(c.id) === String(std.id))
          if (!exists) {
            combined.push(std)
          }
        }

        return combined
      } catch (err) {
        console.warn('Fallback loading colleges:', err)
        return [
          { id: '1', collegeId: '1', name: 'Pirnav Engineering College', code: 'PEC', status: 'Active' },
          { id: '2', collegeId: '2', name: 'VNR VJIET', code: 'VNR', status: 'Active' },
        ]
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Academic Years
  async getAcademicYears(activeOnly = false) {
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
        })

        // Standard historical & upcoming academic years to ensure complete historical access
        const standardYears = [
          { id: 'ay-2026-2027', academicYearId: 'ay-2026-2027', name: '2026-2027', academicYearName: '2026-2027', startDate: '2026-06-01', endDate: '2027-05-31', status: 'Active', isCurrent: true },
          { id: 'ay-2025-2026', academicYearId: 'ay-2025-2026', name: '2025-2026', academicYearName: '2025-2026', startDate: '2025-06-01', endDate: '2026-05-31', status: 'Archived', isCurrent: false },
          { id: 'ay-2024-2025', academicYearId: 'ay-2024-2025', name: '2024-2025', academicYearName: '2024-2025', startDate: '2024-06-01', endDate: '2025-05-31', status: 'Archived', isCurrent: false },
          { id: 'ay-2027-2028', academicYearId: 'ay-2027-2028', name: '2027-2028', academicYearName: '2027-2028', startDate: '2027-06-01', endDate: '2028-05-31', status: 'Upcoming', isCurrent: false },
        ]

        const combined = [...mapped]
        for (const std of standardYears) {
          const normStdName = std.name.replace(/\s+/g, '')
          const exists = combined.some(y => (y.name || '').replace(/\s+/g, '') === normStdName)
          if (!exists) {
            combined.push(std)
          }
        }

        // Sort: Active first, then by year descending
        return combined.sort((a, b) => {
          if (a.isCurrent && !b.isCurrent) return -1
          if (!a.isCurrent && b.isCurrent) return 1
          return String(b.name || '').localeCompare(String(a.name || ''))
        })
      } catch (err) {
        console.warn('Fallback loading academic years:', err)
        return [
          { id: 'ay-2026-2027', academicYearId: 'ay-2026-2027', name: '2026-2027', academicYearName: '2026-2027', startDate: '2026-06-01', endDate: '2027-05-31', status: 'Active', isCurrent: true },
          { id: 'ay-2025-2026', academicYearId: 'ay-2025-2026', name: '2025-2026', academicYearName: '2025-2026', startDate: '2025-06-01', endDate: '2026-05-31', status: 'Archived', isCurrent: false },
          { id: 'ay-2024-2025', academicYearId: 'ay-2024-2025', name: '2024-2025', academicYearName: '2024-2025', startDate: '2024-06-01', endDate: '2025-05-31', status: 'Archived', isCurrent: false },
        ]
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
          collegeId: d.collegeId,
          status: d.status,
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
          collegeId: c.collegeId,
          status: c.status,
          durationYears: c.durationYears,
          totalSemesters: c.totalSemesters,
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
          status: b.status,
          totalSemesters: b.totalSemesters,
          intakeCapacity: b.intakeCapacity,
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
        return []
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
          capacity: sec.capacity,
          status: sec.status,
          shift: sec.shift,
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
