import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import academicService, { filterActiveOnly } from '../services/academicService'
import eventBus, { ERP_EVENTS } from '../services/eventBus'
import { getActiveAcademicYears } from '../utils/academicYearUtils'

const AcademicContext = createContext(null)

export const AcademicProvider = ({ children }) => {
  const [colleges, setColleges] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [branches, setBranches] = useState([])
  const [semesters, setSemesters] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

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

      setColleges(cols || [])
      setAcademicYears(years || [])
      setDepartments(depts || [])
      setCourses(crss || [])
      setBranches(brns || [])
      setSemesters(sems || [])
      setSections(secs || [])
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
  // Some backend records use numeric status values. Normalize them through
  // the shared selector so operational screens still receive a usable
  // upcoming year when no year is marked active.
  const activeAcademicYears = getActiveAcademicYears(academicYears)
  const activeDepartments = filterActiveOnly(departments)
  const activeCourses = filterActiveOnly(courses)
  const activeBranches = filterActiveOnly(branches)
  const activeSemesters = filterActiveOnly(semesters)
  const activeSections = filterActiveOnly(sections)

  const currentAcademicYear = academicYears.find(y => y.isCurrent) || activeAcademicYears[0] || academicYears[0] || null

  // Cascading helpers
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
    if (!courseId) return list
    return list.filter(s => !s.courseId || String(s.courseId) === String(courseId))
  }, [semesters, activeSemesters])

  const getSectionsForScope = useCallback((scope = {}, activeOnly = true) => {
    const list = activeOnly ? activeSections : sections
    return list.filter(sec => {
      if (scope.academicYearId && String(sec.academicYearId) !== String(scope.academicYearId)) return false
      if (scope.departmentId && String(sec.departmentId) !== String(scope.departmentId)) return false
      if (scope.courseId && String(sec.courseId) !== String(scope.courseId)) return false
      if (scope.branchId && String(sec.branchId) !== String(scope.branchId)) return false
      if (scope.semesterId && String(sec.semesterId) !== String(scope.semesterId)) return false
      return true
    })
  }, [sections, activeSections])

  const resolveNames = useCallback((ids) => {
    return academicService.resolveHierarchyNames(ids)
  }, [])

  const value = {
    loading,
    colleges,
    activeColleges,
    academicYears,
    activeAcademicYears,
    currentAcademicYear,
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

export default AcademicContext
