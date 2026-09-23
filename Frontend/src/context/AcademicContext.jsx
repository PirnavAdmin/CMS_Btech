import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import academicService, { filterActiveOnly } from '../services/academicService'
import eventBus, { ERP_EVENTS } from '../services/eventBus'
import { getActiveAcademicYears } from '../utils/academicYearUtils'

const CONTEXT_STORAGE_KEY = 'pirnav_academic_context'

const AcademicContext = createContext(null)

const readStoredContext = () => {
  try {
    const raw = localStorage.getItem(CONTEXT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return {
          collegeId: parsed.collegeId ? String(parsed.collegeId) : '',
          academicYearId: parsed.academicYearId ? String(parsed.academicYearId) : '',
        }
      }
    }
    // Fallback to legacy single-key storage if available
    const legacyYear = localStorage.getItem('pirnav-selected-academic-year-id')
    const legacyCollege = localStorage.getItem('selected_college_id') || localStorage.getItem('pirnav-selected-college-id')
    return {
      collegeId: legacyCollege ? String(legacyCollege) : '',
      academicYearId: legacyYear ? String(legacyYear) : '',
    }
  } catch {
    return { collegeId: '', academicYearId: '' }
  }
}

const saveStoredContext = (collegeId, academicYearId) => {
  try {
    const payload = {
      collegeId: collegeId ? String(collegeId) : '',
      academicYearId: academicYearId ? String(academicYearId) : '',
    }
    localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(payload))
    if (collegeId) localStorage.setItem('pirnav-selected-college-id', String(collegeId))
    if (academicYearId) localStorage.setItem('pirnav-selected-academic-year-id', String(academicYearId))
  } catch {}
}

export const AcademicProvider = ({ children }) => {
  const [colleges, setColleges] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [branches, setBranches] = useState([])
  const [semesters, setSemesters] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  // Stored working context IDs
  const [selectedCollegeId, setSelectedCollegeId] = useState(() => readStoredContext().collegeId)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(() => readStoredContext().academicYearId)

  const loadHierarchy = useCallback(async () => {
    try {
      setLoading(true)
      const [cols, years, depts, crss, brns, sems, secs] = await Promise.all([
        academicService.getColleges(),
        academicService.getAcademicYears(),
        academicService.getDepartments(),
        academicService.getCourses(),
        academicService.getBranches(),
        academicService.getSemesters(),
        academicService.getSections(),
      ])

      const safeColleges = cols || []
      const safeYears = years || []

      setColleges(safeColleges)
      setAcademicYears(safeYears)
      setDepartments(depts || [])
      setCourses(crss || [])
      setBranches(brns || [])
      setSemesters(sems || [])
      setSections(secs || [])

      // Validate or resolve default College
      const stored = readStoredContext()
      let resolvedColId = ''
      if (stored.collegeId && safeColleges.some(c => String(c.id ?? c.collegeId) === String(stored.collegeId))) {
        resolvedColId = String(stored.collegeId)
      } else {
        const defaultCol = safeColleges.find(c => String(c.status).toLowerCase() === 'active' || c.isActive) || safeColleges[0]
        resolvedColId = defaultCol ? String(defaultCol.id ?? defaultCol.collegeId) : ''
      }
      setSelectedCollegeId(resolvedColId)

      // Validate or resolve default Academic Year
      let resolvedYearId = ''
      if (stored.academicYearId && safeYears.some(y => String(y.id ?? y.academicYearId) === String(stored.academicYearId))) {
        resolvedYearId = String(stored.academicYearId)
      } else {
        const defaultYear = safeYears.find(y => y.isCurrent || String(y.status).toLowerCase() === 'active' || y.isActive) || safeYears[0]
        resolvedYearId = defaultYear ? String(defaultYear.id ?? defaultYear.academicYearId) : ''
      }
      setSelectedAcademicYearId(resolvedYearId)

      // Persist validated context
      if (resolvedColId || resolvedYearId) {
        saveStoredContext(resolvedColId, resolvedYearId)
      }
    } catch (err) {
      console.warn('Error loading academic hierarchy context:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHierarchy()
    const unsubscribe = eventBus.subscribe(ERP_EVENTS.ACADEMIC_UPDATED, () => {
      loadHierarchy()
    })
    return () => unsubscribe()
  }, [loadHierarchy])

  // Active items helpers
  const activeColleges = filterActiveOnly(colleges)
  const activeAcademicYears = getActiveAcademicYears(academicYears)
  const activeDepartments = filterActiveOnly(departments)
  const activeCourses = filterActiveOnly(courses)
  const activeBranches = filterActiveOnly(branches)
  const activeSemesters = filterActiveOnly(semesters)
  const activeSections = filterActiveOnly(sections)

  const currentAcademicYear = useMemo(() => {
    return academicYears.find(y => y.isCurrent) || activeAcademicYears[0] || academicYears[0] || null
  }, [academicYears, activeAcademicYears])

  const selectedCollege = useMemo(() => {
    return colleges.find(c => String(c.id ?? c.collegeId) === String(selectedCollegeId)) || colleges[0] || null
  }, [colleges, selectedCollegeId])

  const selectedAcademicYear = useMemo(() => {
    return academicYears.find(y => String(y.id ?? y.academicYearId) === String(selectedAcademicYearId)) || currentAcademicYear
  }, [academicYears, selectedAcademicYearId, currentAcademicYear])

  const isHistoricalYear = Boolean(
    currentAcademicYear &&
    selectedAcademicYear &&
    String(selectedAcademicYear.id ?? selectedAcademicYear.academicYearId) !== String(currentAcademicYear.id ?? currentAcademicYear.academicYearId) &&
    (selectedAcademicYear.name || '').replace(/\s+/g, '') !== (currentAcademicYear.name || '').replace(/\s+/g, '')
  )

  const isContextReady = Boolean(selectedCollege && selectedAcademicYear)

  // Atomically apply a new Global Academic Context
  const applyAcademicContext = useCallback(async (newCollegeId, newAcademicYearId) => {
    const colId = String(newCollegeId ?? '')
    const yrId = String(newAcademicYearId ?? '')

    setSelectedCollegeId(colId)
    setSelectedAcademicYearId(yrId)
    saveStoredContext(colId, yrId)

    const targetCol = colleges.find(c => String(c.id ?? c.collegeId) === colId) || null
    const targetYr = academicYears.find(y => String(y.id ?? y.academicYearId) === yrId) || null

    // Clear stale memory caches if needed
    academicService.clearCache?.()

    // Broadcast change
    eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, {
      collegeId: colId,
      college: targetCol,
      academicYearId: yrId,
      academicYear: targetYr,
    })
    eventBus.emit(ERP_EVENTS.ACADEMIC_YEAR_CHANGED, {
      academicYearId: yrId,
      academicYear: targetYr,
    })

    return {
      success: true,
      college: targetCol,
      academicYear: targetYr,
    }
  }, [colleges, academicYears])

  // Context-scoped Cascading helpers
  const getCoursesForDepartment = useCallback((departmentId, activeOnly = true) => {
    const list = activeOnly ? activeCourses : courses
    if (!departmentId) return list
    return list.filter(c => String(c.departmentId) === String(departmentId))
  }, [courses, activeCourses])

  const getBranchesForCourse = useCallback((courseId, activeOnly = true) => {
    const list = activeOnly ? activeBranches : branches
    if (!courseId) return list
    return list.filter(b => String(b.courseId) === String(courseId))
  }, [branches, activeBranches])

  const getSemestersForCourse = useCallback((courseId, activeOnly = true) => {
    const list = activeOnly ? activeSemesters : semesters
    const filtered = !courseId ? list : list.filter(s => !s.courseId || String(s.courseId) === String(courseId))
    const map = new Map()
    filtered.forEach(s => {
      const num = Number(s.semesterNumber ?? String(s.semesterName || s.name || s.id).match(/\d+/)?.[0] ?? s.id)
      const name = s.semesterName || s.name || (num ? `Semester ${num}` : `Semester ${s.id}`)
      const key = num || name
      if (!map.has(key)) {
        map.set(key, {
          ...s,
          id: s.id ?? key,
          semesterNumber: num || s.semesterNumber || key,
          semesterName: name,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => (Number(a.semesterNumber) || 0) - (Number(b.semesterNumber) || 0))
  }, [semesters, activeSemesters])

  const getSectionsForScope = useCallback((scope = {}, activeOnly = true) => {
    const list = activeOnly ? activeSections : sections
    return list.filter(sec => {
      const secYearId = String(sec.academicYearId ?? sec.academicYear ?? '')
      const targetYearId = String(scope.academicYearId || selectedAcademicYearId || '')
      if (targetYearId && secYearId && secYearId !== targetYearId) return false
      if (scope.departmentId && String(sec.departmentId) !== String(scope.departmentId)) return false
      if (scope.courseId && String(sec.courseId) !== String(scope.courseId)) return false
      if (scope.branchId && String(sec.branchId) !== String(scope.branchId)) return false
      if (scope.semesterId && String(sec.semesterId) !== String(scope.semesterId)) return false
      return true
    })
  }, [sections, activeSections, selectedAcademicYearId])

  const resolveNames = useCallback((ids) => {
    return academicService.resolveHierarchyNames(ids)
  }, [])

  const value = {
    loading,
    isContextReady,
    // Colleges
    colleges,
    activeColleges,
    selectedCollegeId,
    selectedCollege,
    college: selectedCollege,
    collegeId: selectedCollegeId,
    // Academic Years
    academicYears,
    activeAcademicYears,
    currentAcademicYear,
    selectedAcademicYear,
    selectedAcademicYearId,
    academicYear: selectedAcademicYear,
    academicYearId: selectedAcademicYearId,
    isHistoricalYear,
    // Actions
    applyAcademicContext,
    setContext: applyAcademicContext,
    setAcademicContext: applyAcademicContext,
    selectAcademicYear: (yearOrId) => {
      const yrId = typeof yearOrId === 'object' ? String(yearOrId?.id ?? yearOrId?.academicYearId ?? '') : String(yearOrId)
      applyAcademicContext(selectedCollegeId, yrId)
    },
    resetToActiveAcademicYear: () => {
      if (currentAcademicYear) {
        const yrId = String(currentAcademicYear.id ?? currentAcademicYear.academicYearId ?? '')
        applyAcademicContext(selectedCollegeId, yrId)
      }
    },
    // Hierarchy Entities
    departments,
    activeDepartments,
    courses,
    activeCourses,
    branches,
    activeBranches,
    semesters,
    activeSemesters,
    sections,
    activeSections,
    // Helpers
    getCoursesForDepartment,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
    resolveNames,
    refreshHierarchy: loadHierarchy,
  }

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  )
}

export const useAcademic = () => {
  const context = useContext(AcademicContext)
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider')
  }
  return context
}

export const useAcademicContext = useAcademic

export default AcademicContext
