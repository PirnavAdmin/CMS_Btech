import { ensureBranchSemesters, inspectBranchSemesters, semesterRecords, semesterStructure } from '../../services/branchSemesterWorkflow'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
﻿import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  FiLayers,
  FiBookOpen,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiFilter,
  FiChevronDown,
  FiAlertCircle,
  FiX,
  FiInfo,
  FiMoreHorizontal,
  FiEye,
  FiToggleRight,
  FiToggleLeft,
  FiPlayCircle,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import ViewDialog from '../../components/ViewDialog'
import { useAcademic } from '../../context/AcademicContext'
import { useScreenAccess } from '../../auth/ScreenAccess'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import DataTable from '../../components/DataTable'
import { ScheduleDialog } from '../semester-management/SemesterManagement'
import { DepartmentManagement } from '../admin-management/AdminManagement'
import { CompletionIndicator, CompletionSummary } from '../../components/RecordCompletion'
import { meaningfulText, programCompletion } from '../../utils/recordCompletion'
import {
  getDepartments,
  getCourses,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  getBranches,
  createBranch,
  updateBranch,
  updateBranchStatus,
  deleteBranch,
  getSemesters,
  createSemester,
  deleteSemester,
} from '../../auth/collegeApi'
import { academicYearApi } from '../../api/apiEndpoints'
import './AcademicStructure.css'

const STEP_DEPARTMENTS = 'departments'
const STEP_PROGRAMS = 'programs'
const PROGRAMS_PAGE_SIZE = 10
const courseIdOf = (course = {}) => String(course.courseId ?? course.CourseId ?? course.CourseID ?? course.courseID ?? course.course_id ?? course.id ?? course.Id ?? course.ID ?? '')
const courseDepartmentIdOf = (course = {}) => String(course.departmentId ?? course.DepartmentId ?? course.DepartmentID ?? course.department_id ?? course.department?.departmentId ?? course.department?.DepartmentId ?? course.department?.id ?? '')
const branchIdOf = (branch = {}) => String(branch.branchId ?? branch.BranchId ?? branch.BranchID ?? branch.branch_id ?? branch.id ?? branch.Id ?? '')
const branchCourseIdOf = (branch = {}) => String(branch.courseId ?? branch.CourseId ?? branch.CourseID ?? branch.course_id ?? '')

const STEPS = [
  { id: STEP_PROGRAMS, label: 'Programs', icon: FiBookOpen },
  { id: STEP_DEPARTMENTS, label: 'Departments', icon: FiLayers },
]

const courseNameOf = (course) => course?.courseName ?? course?.CourseName ?? course?.name ?? course?.Name
const courseCodeOf = (course) => course?.courseCode ?? course?.CourseCode ?? course?.code ?? course?.Code
const departmentIdOf = (department) => department?.departmentId ?? department?.DepartmentId ?? department?.id ?? department?.Id

const SETUP_TABS = [
  { id: 'course', label: 'Course', subtitle: 'Set the course identity, duration, and semester count.' },
  { id: 'branch', label: 'Branch', subtitle: 'Link the branch to a course and set its intake.' },
  { id: 'semester', label: 'Semester Structure', subtitle: 'Set semester dates for a branch.' },
  { id: 'review', label: 'Review & Save', subtitle: 'Verify the plan and generate missing semesters.' },
]

export default function AcademicStructure() {
  const [semesterListVerified, setSemesterListVerified] = useState(false)
  const [relationsVerified, setRelationsVerified] = useState(false)
  const [repairOnly, setRepairOnly] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const { state: navigationState } = useLocation()
  const legacyStep = searchParams.get('step')
  const currentStep = legacyStep === STEP_DEPARTMENTS ? STEP_DEPARTMENTS : STEP_PROGRAMS
  const { selectedCollegeId, selectedCollege } = useAcademic()
  const { canAction } = useScreenAccess()

  // Data states
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [branches, setBranches] = useState([])
  const [semesters, setSemesters] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Global & Step Filter states
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [completionFilter, setCompletionFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [programPage, setProgramPage] = useState(1)
  const [generationBranchId, setGenerationBranchId] = useState('')
  const [generationCourseId, setGenerationCourseId] = useState('')
  const [semesterDates, setSemesterDates] = useState({})
  const [chooseDatesFirst, setChooseDatesFirst] = useState(false)
  const [savedCourseChoice, setSavedCourseChoice] = useState('')
  const loadRequest = useRef(0)
  const loadedCollege = useRef(null)
  const collegeScope = useRef(selectedCollegeId)
  collegeScope.current = selectedCollegeId

  // Modals state
  const [modalType, setModalType] = useState(null) // 'department' | 'course' | 'branch' | 'semester'
  const setupDrafts = useRef(new Set())
  const setupCourse = useRef(null)
  const generationBusy = useRef(false)
  const setupBody = useRef(null)
  const [editingItem, setEditingItem] = useState(null)
  const [programDetailsId, setProgramDetailsId] = useState('')
  const [semesterSchedule, setSemesterSchedule] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { type, item }

  // Form states
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    departmentId: '',
    type: '',
    durationYears: '',
    totalSemesters: '',
    eligibility: '',
    description: '',
    status: '',
  })
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    departmentId: '',
    courseId: '',
    specialization: '',
    intakeCapacity: 60,
    status: 'Active',
  })

  const [formErrors, setFormErrors] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Load all academic data
  const loadAcademicData = useCallback(async () => {
    const request = ++loadRequest.current
    const collegeId = collegeScope.current
    setIsLoading(true)
    setSemesterListVerified(false)
    try {
      const [deptRes, courseRes, branchRes, semRes, yearRes] = await Promise.allSettled([
        getDepartments(),
        getCourses(),
        getBranches(),
        getSemesters(),
        academicYearApi.getAll().catch(() => []),
      ])

      const extractList = (res) => {
        if (res.status !== 'fulfilled') return null
        const raw = res.value?.data ?? res.value
        if (Array.isArray(raw)) return raw
        if (Array.isArray(raw?.data)) return raw.data
        if (Array.isArray(raw?.items)) return raw.items
        if (Array.isArray(raw?.semesters)) return raw.semesters
        if (Array.isArray(raw?.courses)) return raw.courses
        return null
      }

      if (request !== loadRequest.current || collegeScope.current !== collegeId) return
      loadedCollege.current = collegeId
      const loadedCourses = extractList(courseRes) || []
      const loadedBranches = extractList(branchRes)
      const loadedDepartments = extractList(deptRes)
      setRelationsVerified(Boolean(loadedBranches && loadedDepartments))
      setDepartments([...(loadedDepartments || [])])
      setCourses([...loadedCourses])
      setBranches([...(loadedBranches || [])])
      let savedSemesters = []
      try {
        if (semRes.status === 'fulfilled') {
          savedSemesters = semesterRecords(semRes.value)
          setSemesterListVerified(true)
        }
      } catch { /* An unreadable response is not proof of missing records. */ }
      setSemesters([...savedSemesters])
      setAcademicYears(yearRes.status === 'fulfilled' && Array.isArray(yearRes.value) ? yearRes.value : [])
      return { courses: loadedCourses, branches: loadedBranches || [] }
    } catch (err) {
      console.error('Failed loading academic structure data:', err)
      showToast('Error loading academic structure data. Please try again.', 'error')
    } finally {
      if (request === loadRequest.current && collegeScope.current === collegeId) setIsLoading(false)
    }
  }, [])

  // Scoped class for page-specific layout adjustments (e.g. header college dropdown)
  useEffect(() => {
    document.body.classList.add('page-academic-structure')
    return () => {
      document.body.classList.remove('page-academic-structure')
    }
  }, [])

  useEffect(() => {
    if (currentStep === STEP_PROGRAMS) loadAcademicData()
  }, [loadAcademicData, selectedCollegeId, currentStep])

  // Change active step
  const handleStepChange = (stepId) => {
    setSearchParams({ step: stepId })
    setSearchQuery('')
  }

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedDeptFilter('')
    setSelectedCourseFilter('')
    setSelectedBranchFilter('')
    setStatusFilter('')
    setCompletionFilter('')
    setSearchQuery('')
  }

  // Derived filtered options for cascading dropdowns in filter bar
  const filterCoursesOptions = useMemo(() => {
    if (!selectedDeptFilter) return courses
    return courses.filter((c) => String(c.departmentId ?? c.DepartmentId) === String(selectedDeptFilter))
  }, [courses, selectedDeptFilter])

  const filterBranchesOptions = useMemo(() => {
    if (!selectedCourseFilter) {
      if (!selectedDeptFilter) return branches
      const courseIds = new Set(filterCoursesOptions.map((c) => String(c.courseId ?? c.id)))
      return branches.filter((b) => courseIds.has(String(b.courseId ?? b.CourseId)) || String(b.departmentId) === String(selectedDeptFilter))
    }
    return branches.filter((b) => String(b.courseId ?? b.CourseId) === String(selectedCourseFilter))
  }, [branches, selectedCourseFilter, selectedDeptFilter, filterCoursesOptions])

  // Reset child filters when parent changes
  useEffect(() => {
    if (selectedDeptFilter && selectedCourseFilter) {
      const match = filterCoursesOptions.some((c) => String(c.courseId ?? c.id) === String(selectedCourseFilter))
      if (!match) setSelectedCourseFilter('')
    }
  }, [selectedDeptFilter, selectedCourseFilter, filterCoursesOptions])

  useEffect(() => {
    if (selectedCourseFilter && selectedBranchFilter) {
      const match = filterBranchesOptions.some((b) => String(b.branchId ?? b.id) === String(selectedBranchFilter))
      if (!match) setSelectedBranchFilter('')
    }
  }, [selectedCourseFilter, selectedBranchFilter, filterBranchesOptions])

  // Helper map lookups
  const deptMap = useMemo(() => {
    const map = new Map()
    departments.forEach((d) => {
      const id = String(departmentIdOf(d))
      map.set(id, d.departmentName ?? d.DepartmentName ?? d.name ?? d.Name)
    })
    return map
  }, [departments])

  const courseMap = useMemo(() => {
    const map = new Map()
    courses.forEach((c) => {
      const id = String(courseIdOf(c))
      map.set(id, c)
    })
    return map
  }, [courses])

  const branchMap = useMemo(() => {
    const map = new Map()
    branches.forEach((b) => {
      const id = String(branchIdOf(b))
      map.set(id, b)
    })
    return map
  }, [branches])

  const yearMap = useMemo(() => {
    const map = new Map()
    academicYears.forEach((y) => {
      const id = String(y.academicYearId ?? y.id)
      map.set(id, y.academicYearName ?? y.name)
    })
    return map
  }, [academicYears])

  // Dynamic search placeholder based on current step
  const searchPlaceholder = currentStep === STEP_PROGRAMS ? 'Search courses, branches, or semesters...' : 'Search departments by name, code...'

  // Count active filters for badge and reset toggle
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedDeptFilter) count++
    if (selectedCourseFilter) count++
    if (selectedBranchFilter) count++
    if (statusFilter) count++
    if (completionFilter) count++
    if (searchQuery.trim()) count++
    return count
  }, [selectedDeptFilter, selectedCourseFilter, selectedBranchFilter, statusFilter, searchQuery])

  // Count active dropdown filters specifically for the Filter button badge
  const activeDropdownFilterCount = useMemo(() => {
    let count = 0
    if (selectedDeptFilter) count++
    if (selectedCourseFilter) count++
    if (selectedBranchFilter) count++
    if (statusFilter) count++
    return count
  }, [selectedDeptFilter, selectedCourseFilter, selectedBranchFilter, statusFilter, completionFilter])

  // Filtered lists for each step
  const matchesCompletion = completion => {
    const percent = completion?.percent
    if (!completionFilter) return true
    if (completionFilter === 'unavailable') return percent == null
    if (percent == null) return false
    if (completionFilter === 'complete') return percent === 100
    return completionFilter === 'early' ? percent < 50 : percent >= 50 && percent < 100
  }
  const branchesFor = course => branches.filter(branch => String(branchCourseIdOf(branch)) === String(courseIdOf(course)))
  const semestersFor = branch => semesters.filter(semester => String(semester.branchId ?? semester.BranchId) === branchIdOf(branch))
    .sort((left, right) => Number(left.semesterNumber) - Number(right.semesterNumber))
  const savedProgram = course => {
    const children = branchesFor(course)
    const departmentIds = [courseDepartmentIdOf(course), ...children.map(courseDepartmentIdOf)]
    const linkedDepartments = departments.filter(department => departmentIds.includes(String(departmentIdOf(department))))
    let plan = []
    try { plan = semesterStructure(course) } catch { /* A missing or invalid plan is incomplete. */ }
    const academicBranches = children.map(branch => ({
      name: branch.branchName ?? branch.name ?? 'Branch',
      configured: meaningfulText(branch.branchName ?? branch.name) && meaningfulText(branch.branchCode ?? branch.code) &&
        linkedDepartments.some(department => String(departmentIdOf(department)) === courseDepartmentIdOf(branch)),
      terms: new Set(semestersFor(branch).filter(term => (term.semesterId ?? term.id) && String(term.courseId ?? term.CourseId) === courseIdOf(course)).map(term => Number(term.semesterNumber))),
    }))
    const completion = relationsVerified && semesterListVerified ? programCompletion({
      ...course, courseName: courseNameOf(course), courseCode: courseCodeOf(course), collegeId: course.collegeId ?? course.CollegeId ?? selectedCollegeId,
      totalSemesters: plan.length,
      mapped: linkedDepartments.length > 0,
    }, academicBranches, plan) : null
    return { children, linkedDepartments, completion, academicBranches }
  }
  const programsById = new Map(courses.map(course => [courseIdOf(course), savedProgram(course)]))
  const programRows = courses.flatMap(course => {
    const children = branchesFor(course)
    const query = searchQuery.trim().toLowerCase()
    const matches = (...values) => values.some(value => String(value ?? '').toLowerCase().includes(query))
    const active = course.status === true || ['1', 'active'].includes(String(course.status).toLowerCase())
    if ((statusFilter && active !== (statusFilter === 'Active')) ||
      !matchesCompletion(programsById.get(courseIdOf(course)).completion) ||
      (selectedCourseFilter && courseIdOf(course) !== String(selectedCourseFilter))) return []
    const programMatch = !query || matches(courseNameOf(course), courseCodeOf(course), deptMap.get(courseDepartmentIdOf(course)))
    return (children.length ? children : [null]).filter(branch =>
      (!selectedBranchFilter || (branch && branchIdOf(branch) === String(selectedBranchFilter))) &&
      (!selectedDeptFilter || [course, branch].some(item => item && courseDepartmentIdOf(item) === String(selectedDeptFilter))) &&
      (programMatch || (branch && (matches(branch.branchName, branch.name, branch.branchCode) ||
        semestersFor(branch).some(term => matches(term.semesterName, 'Semester ' + term.semesterNumber)))))
    ).map(branch => ({ id: courseIdOf(course) + ':' + (branch ? branchIdOf(branch) : ''), course, branch }))
  })
  useEffect(() => { setProgramPage(1) }, [currentStep, searchQuery, statusFilter, completionFilter, selectedDeptFilter, selectedCourseFilter, selectedBranchFilter])

  // Open Add Modals
  const openAddModal = (type, switchingTab = false) => {
    if (!switchingTab) {
      setSavedCourseChoice('')
      setRepairOnly(false)
      setupDrafts.current.clear()
      setupCourse.current = null
      setGenerationBranchId('')
      setGenerationCourseId('')
      setSemesterDates({})
      setChooseDatesFirst(false)
    }
    setModalType(type)
    setEditingItem(null)
    setFormErrors({})
    if (setupBody.current) setupBody.current.scrollTop = 0
    if (setupDrafts.current.has(type)) return
    setupDrafts.current.add(type)

    if (type === 'course') {
      setCourseForm({
        name: '',
        code: '',
        departmentId: '',
        type: '',
        durationYears: '',
        totalSemesters: '',
        eligibility: '',
        description: '',
        status: '',
      })
    } else if (type === 'branch') {
      const preferredCourse = setupCourse.current || (switchingTab && courseMap.get(savedCourseChoice)) || courses.find((course) => String(courseIdOf(course)) === String(selectedCourseFilter))
        || courses.find((course) => selectedDeptFilter && String(courseDepartmentIdOf(course)) === String(selectedDeptFilter))
        || courses[0]
      const defaultDept = courseDepartmentIdOf(preferredCourse)
        ?? selectedDeptFilter
        ?? departments[0]?.departmentId
        ?? departments[0]?.id
        ?? ''
      setGenerationCourseId(courseIdOf(preferredCourse))
      setBranchForm({
        name: '',
        code: '',
        departmentId: String(defaultDept || ''),
        courseId: String(courseIdOf(preferredCourse) ?? ''),
        specialization: '',
        intakeCapacity: 60,
        status: 'Active',
      })
    }
  }

  // Open Edit Modals
  const openEditModal = (type, item) => {
    setSavedCourseChoice('')
    setModalType(type)
    setEditingItem(item)
    setFormErrors({})

    if (type === 'course') {
      setCourseForm({
        name: item.courseName ?? item.name ?? '',
        code: item.courseCode ?? item.code ?? '',
        departmentId: String(item.departmentId ?? item.DepartmentId ?? ''),
        type: item.courseType ?? item.type ?? 'Undergraduate',
        durationYears: item.durationYears ?? item.DurationYears ?? 4,
        totalSemesters: item.totalSemesters ?? item.TotalSemesters ?? 8,
        eligibility: item.eligibility ?? '',
        description: item.description ?? '',
        status: String(item.status) === '1' || item.status === 'Active' || item.status === true ? 'Active' : 'Inactive',
      })
    } else if (type === 'branch') {
      setBranchForm({
        name: item.branchName ?? item.name ?? '',
        code: item.branchCode ?? item.code ?? '',
        departmentId: String(item.departmentId ?? ''),
        courseId: String(item.courseId ?? item.CourseId ?? ''),
        specialization: item.specialization ?? '',
        intakeCapacity: item.intakeCapacity ?? 60,
        status: String(item.status) === '1' || item.status === 'Active' || item.status === true ? 'Active' : 'Inactive',
      })
    }
  }

  // Close Modal
  const setupTab = SETUP_TABS.find(tab => tab.id === modalType)

  const closeModal = () => {
    setModalType(null)
    setEditingItem(null)
    setFormErrors({})
  }

  // Submit Course Form
  const handleSubmitCourse = async (e) => {
    e.preventDefault()
    const savedCourse = !editingItem && courseMap.get(savedCourseChoice)
    if (savedCourse) {
      if (canAction('/branches', 'create')) addBranchFor(savedCourse)
      return
    }
    const errors = {}
    if (!courseForm.name.trim()) errors.name = 'Course Name is required'
    if (!courseForm.code.trim()) errors.code = 'Course Code is required'
    if (!selectedCollegeId) errors.submit = 'Select a college before saving a course.'
    try { semesterStructure(courseForm) } catch (error) { errors.submit ||= error.message }

    const duplicate = courses.some(
      (c) =>
        String(c.courseCode ?? c.code).toUpperCase() === courseForm.code.trim().toUpperCase() &&
        String(c.courseId ?? c.id) !== String(editingItem?.courseId ?? editingItem?.id)
    )
    if (duplicate) errors.code = 'Course code already exists'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        courseName: courseForm.name.trim(),
        courseCode: courseForm.code.trim().toUpperCase(),
        departmentId: courseForm.departmentId ? Number(courseForm.departmentId) : null,
        collegeId: Number(selectedCollegeId),
        courseType: courseForm.type,
        durationYears: Number(courseForm.durationYears),
        totalSemesters: Number(courseForm.totalSemesters),
        eligibility: courseForm.eligibility.trim() || null,
        description: courseForm.description.trim() || null,
        status: courseForm.status === 'Active' ? 1 : 0,
      }

      if (editingItem) {
        const id = editingItem.courseId ?? editingItem.id
        await updateCourse(id, { ...payload, courseShortName: editingItem.courseShortName ?? editingItem.shortName })
        showToast('Course updated successfully.')
      } else {
        await createCourse(payload)
        showToast('Course created successfully.')
        const refreshed = await loadAcademicData()
        const saved = refreshed?.courses.find(course => String(courseCodeOf(course)).toUpperCase() === payload.courseCode)
        if (saved) {
          setupCourse.current = saved
          setupDrafts.current.delete('course')
          setupDrafts.current.delete('branch')
          openAddModal('branch', true)
          return
        }
      }
      closeModal()
      loadAcademicData()
    } catch (err) {
      console.error(err)
      setFormErrors({ submit: err?.response?.data?.message || err?.message || 'Failed saving course.' })
      if (setupBody.current) setupBody.current.scrollTop = 0
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Branch Form
  const handleSubmitBranch = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!branchForm.name.trim()) errors.name = 'Branch Name is required'
    if (!branchForm.code.trim()) errors.code = 'Branch Code is required'
    if (!branchForm.departmentId) errors.departmentId = 'Please select a Department'
    if (!branchForm.courseId) errors.courseId = 'Please select a Course'
    const collegeAtSave = selectedCollegeId
    const courseForBranch = courses.find(course => String(courseIdOf(course)) === String(branchForm.courseId))
    if (!editingItem) {
      if (!collegeAtSave || loadedCollege.current !== collegeAtSave) errors.submit = 'Select a college and wait for its courses to load.'
      try { semesterStructure(courseForBranch) } catch (error) { errors.submit ||= error.message }
    }

    const duplicate = branches.some(
      (b) =>
        String(b.branchCode ?? b.code).toUpperCase() === branchForm.code.trim().toUpperCase() &&
        String(b.branchId ?? b.id) !== String(editingItem?.branchId ?? editingItem?.id)
    )
    if (duplicate) errors.code = 'Branch code already exists'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        branchName: branchForm.name.trim(),
        branchCode: branchForm.code.trim().toUpperCase(),
        departmentId: Number(branchForm.departmentId),
        courseId: Number(branchForm.courseId),
        specialization: branchForm.specialization.trim() || null,
        intakeCapacity: Number(branchForm.intakeCapacity) || 60,
        status: branchForm.status === 'Active' ? 1 : 0,
      }

      if (editingItem) {
        const id = editingItem.branchId ?? editingItem.id
        const { shortName, branchType, duration, totalSemesters, startingAcademicYearId, description } = editingItem
        await updateBranch(id, { ...payload, shortName, branchType, duration, totalSemesters, startingAcademicYearId, description })
        showToast('Branch updated successfully.')
      } else {
        await createBranch(payload)
        const refreshed = await loadAcademicData()
        const saved = refreshed?.branches.find(branch => String(branch.branchCode ?? branch.code).toUpperCase() === payload.branchCode && String(branchCourseIdOf(branch)) === String(payload.courseId))
        if (saved) {
          setupCourse.current = refreshed.courses.find(course => String(courseIdOf(course)) === String(payload.courseId))
          setGenerationCourseId(String(payload.courseId))
          setupDrafts.current.delete('branch')
          openAddModal('semester', true)
          setGenerationBranchId(branchIdOf(saved))
          setSemesterDates({})
          if (chooseDatesFirst) {
            showToast('Branch saved. Choose semester dates, then create the definitions.')
            return
          }
          try {
            await saveBranchSemesters(saved, courseForBranch, collegeAtSave)
            showToast('Branch and semester definitions saved.')
          } catch (error) {
            setFormErrors({ submit: 'The branch is saved. ' + error.message })
          } finally {
            if (String(collegeScope.current) === String(collegeAtSave)) await loadAcademicData()
          }
          return
        }
        showToast('The branch was submitted, but its saved ID could not be verified. Refresh Programs before retrying.', 'error')
      }
      closeModal()
      loadAcademicData()
    } catch (err) {
      console.error(err)
      setFormErrors({ submit: err?.response?.data?.message || err?.message || 'Failed saving branch.' })
      if (setupBody.current) setupBody.current.scrollTop = 0
    } finally {
      setIsSubmitting(false)
    }
  }

  const generationBranch = branches.find(branch => branchIdOf(branch) === generationBranchId)
  const generationCourse = generationBranch && courseMap.get(String(branchCourseIdOf(generationBranch)))
  const inspectBranch = (branch, course) => {
    if (!semesterListVerified) return { error: 'Saved semester records could not be verified. Reload before checking for missing definitions.' }
    try { return inspectBranchSemesters({ branchId: branchIdOf(branch), courseId: courseIdOf(course), course, rows: semesters }) }
    catch (error) { return { error: error.message } }
  }
  const structure = generationCourse ? inspectBranch(generationBranch, generationCourse) : {}
  const generationPlan = structure.expected || []
  const missingTerms = structure.missing || []
  const saveBranchSemesters = async (branch, course, collegeId, approvedNumbers, datesByNumber) => {
    await ensureBranchSemesters({
      branchId: branchIdOf(branch), courseId: branchCourseIdOf(branch), course, approvedNumbers, datesByNumber,
      list: () => getSemesters(), create: createSemester,
      assertScope: () => {
        if (!collegeId || String(collegeScope.current) !== String(collegeId)) throw new Error('The working college changed. Reload Programs before continuing.')
      },
    })
    eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { branchId: branchIdOf(branch) })
  }

  const generateStructure = async event => {
    event.preventDefault()
    if (generationBusy.current || !generationBranch || !missingTerms.length || !canAction('/semester-management', 'create')) return
    if (loadedCollege.current !== selectedCollegeId) {
      setFormErrors({ submit: 'Reload the selected college before generating semesters.' })
      return
    }
    generationBusy.current = true
    setIsSubmitting(true)
    setFormErrors({})
    const collegeId = selectedCollegeId
    try {
      await saveBranchSemesters(generationBranch, generationCourse, collegeId, missingTerms.map(term => term.semesterNumber),
        canAction('/semester-management', 'edit') ? semesterDates : {})
      setSemesterDates({})
      if (repairOnly) closeModal()
      else openAddModal('semester', true)
      showToast('Semester structure verified and saved.')
    } catch (error) {
      setFormErrors({ submit: 'Course and branch records remain saved. Retry to create only missing semesters. ' + error.message })
    } finally {
      if (String(collegeScope.current) === String(collegeId)) await loadAcademicData()
      generationBusy.current = false
      setIsSubmitting(false)
    }
  }

  // Toggle status handlers
  const handleToggleStatus = async (type, item) => {
    const isCurrentActive = String(item.status) === '1' || item.status === 'Active' || item.status === true
    const newStatus = isCurrentActive ? 0 : 1
    try {
      if (type === 'course') {
        const id = item.courseId ?? item.id
        await updateCourseStatus(id, newStatus)
      } else if (type === 'branch') {
        const id = item.branchId ?? item.id
        await updateBranchStatus(id, newStatus)
      }
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} status updated.`)
      loadAcademicData()
    } catch (err) {
      console.error(err)
      showToast(err?.response?.data?.message || 'Unable to update status.', 'error')
    }
  }

  // Delete Action Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    const { type, item } = deleteConfirm
    setIsSubmitting(true)
    try {
      if (type === 'course') {
        const id = item.courseId ?? item.id
        await deleteCourse(id)
        showToast('Course deleted successfully.')
      } else if (type === 'branch') {
        const id = item.branchId ?? item.id
        await deleteBranch(id)
        showToast('Branch deleted successfully.')
      } else if (type === 'semester') {
        const id = item.semesterId ?? item.id
        await deleteSemester(id)
        showToast('Semester deleted successfully.')
      }
      setDeleteConfirm(null)
      loadAcademicData()
    } catch (err) {
      console.error(err)
      showToast(err?.response?.data?.message || 'Unable to delete item.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ref for click outside to close filter dropdown
  const filterDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFilterOpen])

  // Render Search Bar & Inline Expandable Filter Drawer for the card
  const renderCardFilterBar = () => (
    <div className="as-filter-container" ref={filterDropdownRef}>
      <div className="as-card-filter-bar">
        <div className="as-search-box">
          <FiSearch size={16} className="as-search-box__icon" aria-hidden="true" />
          <input
            id="as-search-query"
            type="text"
            className="as-search-box__input"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
          />
          {searchQuery && (
            <button
              type="button"
              className="as-search-box__clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        <div className="as-filters-dropdown-wrapper">
          <button
            type="button"
            className={`as-filters-btn ${isFilterOpen ? 'is-active' : ''} ${activeDropdownFilterCount > 0 ? 'has-active' : ''}`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
            aria-haspopup="true"
          >
            <FiFilter size={14} className="as-filters-btn__icon" aria-hidden="true" />
            <span>Filters</span>
            {activeDropdownFilterCount > 0 && (
              <span className="as-filter-count-badge">{activeDropdownFilterCount}</span>
            )}
            <FiChevronDown size={14} className={`as-chevron ${isFilterOpen ? 'is-rotated' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="as-filters-drawer" role="region" aria-label="Filter Options">
          <div className="as-filters-drawer__header">
            <div className="as-filters-drawer__title">
              <FiFilter size={13} aria-hidden="true" />
              <span className="as-filter-title">Connected Academic Filters</span>
              {activeDropdownFilterCount > 0 && (
                <span className="as-filter-active-pill">{activeDropdownFilterCount} active</span>
              )}
            </div>
            {activeDropdownFilterCount > 0 && (
              <button
                type="button"
                className="as-filter-reset"
                onClick={() => {
                  setSelectedDeptFilter('')
                  setSelectedCourseFilter('')
                  setSelectedBranchFilter('')
                  setStatusFilter('')
                }}
                title="Reset all dropdown filters"
              >
                <FiX size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="as-filters-drawer__body">
            {/* Department Filter */}
            <div className="as-filter-control">
              <label htmlFor="as-dept-filter" className="as-control-label visually-hidden">
                Department
              </label>
              <select
                id="as-dept-filter"
                aria-label="Department"
                className="as-control-select"
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => {
                  const id = String(d.departmentId ?? d.id)
                  return (
                    <option key={id} value={id}>
                      {d.departmentName ?? d.name} ({d.departmentCode ?? d.code})
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Course Filter */}
            <div className="as-filter-control">
              <label htmlFor="as-course-filter" className="as-control-label visually-hidden">
                Course
              </label>
              <select
                id="as-course-filter"
                aria-label="Course"
                className="as-control-select"
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
              >
                <option value="">All Courses</option>
                {filterCoursesOptions.map((c) => {
                  const id = String(c.courseId ?? c.id)
                  return (
                    <option key={id} value={id}>
                      {c.courseName ?? c.name} ({c.courseCode ?? c.code})
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="as-filter-control">
              <label htmlFor="as-branch-filter" className="as-control-label visually-hidden">
                Branch
              </label>
              <select
                id="as-branch-filter"
                aria-label="Branch"
                className="as-control-select"
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {filterBranchesOptions.map((b) => {
                  const id = String(b.branchId ?? b.id)
                  return (
                    <option key={id} value={id}>
                      {b.branchName ?? b.name} ({b.branchCode ?? b.code})
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Status Filter */}
            <div className="as-filter-control">
              <label htmlFor="as-status-filter" className="as-control-label visually-hidden">
                Status
              </label>
              <select
                id="as-status-filter"
                aria-label="Status"
                className="as-control-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
            <div className="as-filter-control">
              <select aria-label="Setup completion" className="as-control-select" value={completionFilter} onChange={event => setCompletionFilter(event.target.value)}>
                <option value="">All completion ranges</option>
                <option value="early">0–49%</option>
                <option value="pending">50–99%</option>
                <option value="complete">100%</option>
                <option value="unavailable">Completion unavailable</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const programStatus = item => item.status === true || ['1', 'active'].includes(String(item.status).toLowerCase()) ? 'Active' : 'Inactive'
  const renderCompletion = completion => completion?.percent == null ? 'Completion unavailable' : <>
    <CompletionIndicator completion={completion} />
    {!completion.complete && <small>{completion.sections.filter(section => !section.complete).length} pending sections</small>}
  </>
  const addBranchFor = course => {
    setProgramDetailsId('')
    openAddModal('branch')
    setupCourse.current = course
    setGenerationCourseId(courseIdOf(course))
    setBranchForm(form => ({ ...form, courseId: courseIdOf(course), departmentId: courseDepartmentIdOf(course) }))
  }
  const openRepair = branch => {
    setProgramDetailsId('')
    openAddModal('review')
    setRepairOnly(true)
    setGenerationBranchId(branchIdOf(branch))
  }
  const openSemesterStructure = (course, branch) => {
    openAddModal('semester')
    setupCourse.current = course
    setGenerationCourseId(courseIdOf(course))
    setGenerationBranchId(branchIdOf(branch))
  }
  const programResumeAction = course => {
    const { completion, children, academicBranches } = programsById.get(courseIdOf(course))
    const pending = completion?.sections.find(section => !section.complete)?.id
    if (!pending) return
    if (pending === 'identity' || pending === 'structure' || pending === 'department') {
      return canAction('/courses', 'edit') ? () => openEditModal('course', course) : undefined
    }
    if (pending === 'branch') {
      const index = academicBranches.findIndex(branch => !branch.configured)
      if (index < 0) return canAction('/branches', 'create') ? () => addBranchFor(course) : undefined
      return canAction('/branches', 'edit') ? () => openEditModal('branch', children[index]) : undefined
    }
    const branch = children.find(item => inspectBranch(item, course).missing?.length)
    if (branch && canAction('/semester-management', 'create')) return () => openRepair(branch)
  }
  const viewedCourse = courseMap.get(programDetailsId)
  const viewedProgram = programsById.get(programDetailsId)
  useEffect(() => {
    if (currentStep !== STEP_PROGRAMS || isLoading || loadedCollege.current !== selectedCollegeId) return
    for (const type of ['course', 'branch']) {
      const action = searchParams.get(type + 'Action')
      const id = searchParams.get(type + 'Id')
      if (!action || !canAction(type === 'course' ? '/courses' : '/branches', action === 'add' ? 'create' : action)) continue
      const item = (type === 'course' ? courseMap : branchMap).get(id)
      if (action === 'add') openAddModal(type)
      else if (item && action === 'edit') openEditModal(type, item)
      else if (item && action === 'view') setProgramDetailsId(type === 'course' ? courseIdOf(item) : branchCourseIdOf(item))
      else continue
      const next = new URLSearchParams(searchParams)
      next.delete(type + 'Action')
      next.delete(type + 'Id')
      setSearchParams(next, { replace: true, state: navigationState })
      break
    }
  }, [currentStep, isLoading, selectedCollegeId, searchParams, navigationState, canAction, courseMap, branchMap])
  const programActions = (type, item) => {
    const label = type[0].toUpperCase() + type.slice(1)
    return <div className="as-actions-cell">
      {type === 'semester' ? <Link className="table-action-btn action-edit" title="Configure semester dates" aria-label="Configure semester dates" to={'/semester-management/' + (item.semesterId ?? item.id) + '/edit'}><FiEdit2 /></Link> : <button type="button" className="table-action-btn action-edit" title={'Edit ' + label} aria-label={'Edit ' + label} onClick={() => { setProgramDetailsId(''); openEditModal(type, item) }}><FiEdit2 /></button>}
      {type !== 'semester' && <button type="button" className="table-action-btn" title={(programStatus(item) === 'Active' ? 'Deactivate ' : 'Activate ') + label} aria-label={(programStatus(item) === 'Active' ? 'Deactivate ' : 'Activate ') + label} onClick={() => handleToggleStatus(type, item)}><FiCheckCircle /></button>}
      <button type="button" className="table-action-btn" title={'Delete ' + label} aria-label={'Delete ' + label} onClick={() => { setProgramDetailsId(''); setDeleteConfirm({ type, item }) }}><FiTrash2 /></button>
    </div>
  }

  const renderProgramActions = ({ course, branch }) => {
    const name = courseNameOf(course)
    const id = 'program-actions-' + courseIdOf(course) + (branch ? '-' + branchIdOf(branch) : '')
    const resume = programResumeAction(course)
    const canEdit = canAction('/courses', 'edit')
    const canDelete = canAction('/courses', 'delete')
    const active = programStatus(course) === 'Active'
    const statusAction = active ? 'Deactivate' : 'Activate'
    return <div className="table-inline-actions">
      <button type="button" className="table-action-btn action-view" title="View Program" aria-label={'View ' + name} onClick={() => setProgramDetailsId(courseIdOf(course))}><FiEye aria-hidden="true" /></button>
      {canEdit && <button type="button" className="table-action-btn action-edit" title="Edit Program" aria-label="Edit Program" onClick={() => openEditModal('course', course)}><FiEdit2 aria-hidden="true" /></button>}
      {resume && <button type="button" className="table-action-btn" title="Resume Setup" aria-label="Resume Setup" onClick={resume}><FiPlayCircle aria-hidden="true" /></button>}
      {canEdit && <button type="button" className={`table-action-btn ${active ? 'action-activate' : 'action-deactivate'}`} title={statusAction} aria-label={statusAction} onClick={() => handleToggleStatus('course', course)}>{active ? <FiToggleRight aria-hidden="true" /> : <FiToggleLeft aria-hidden="true" />}</button>}
      {canDelete && <>
        <button type="button" className="table-action-btn" aria-label={'More Actions for ' + name} title="More Actions" popoverTarget={id}><FiMoreHorizontal aria-hidden="true" /></button>
        <div id={id} popover="auto" className="table-action-popover" role="group" aria-label={'Actions for ' + name}
          onToggle={event => { if (event.newState === 'open') event.currentTarget.querySelector('button')?.focus() }}>
          <button type="button" onClick={event => {
            event.currentTarget.parentElement.hidePopover?.()
            setDeleteConfirm({ type: 'course', item: course })
          }}>Delete Program</button>
        </div>
      </>}
    </div>
  }

  return (
    <DashboardLayout>
      <div className="academic-structure">
        {/* Toast Alert */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '1.5rem',
              right: '1.5rem',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              background: toast.type === 'error' ? '#ef4444' : '#10b981',
              color: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            {toast.type === 'error' ? <FiAlertCircle size={18} /> : <FiCheckCircle size={18} />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem' }}
            >
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="as-header">
          <div className="as-header__main">
            <div className="as-title-group">
              <h1>Program Configuration</h1>
              <p>
                Configure departments, courses, branches, and semesters in one unified B.Tech academic workflow
                {selectedCollege?.name ? ` for ${selectedCollege.name}` : ''}.
              </p>
            </div>
          </div>
        </div>

        {/* Connected Step Navigation */}
        <div className="as-tabs-container">
          <div className="as-tabs-list">
            {STEPS.map((s) => {
              const StepIcon = s.icon
              const isActive = currentStep === s.id

              return (
                <button
                  key={s.id}
                  type="button"
                  className={`as-tab-button ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleStepChange(s.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <StepIcon size={16} className="as-tab-icon" />
                  <span className="as-tab-label">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Cascade Filter Context Banner */}
        {currentStep === STEP_PROGRAMS && (selectedDeptFilter || selectedCourseFilter || selectedBranchFilter) && (
          <div className="as-context-banner">
            <span>
              <FiInfo style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Active Cascade Filter:
              {selectedDeptFilter && (
                <>
                  {' '}
                  Department: <strong>{deptMap.get(String(selectedDeptFilter)) || selectedDeptFilter}</strong>
                </>
              )}
              {selectedCourseFilter && (
                <>
                  {' '}
                  → Course: <strong>{courseMap.get(String(selectedCourseFilter))?.courseName || selectedCourseFilter}</strong>
                </>
              )}
              {selectedBranchFilter && (
                <>
                  {' '}
                  → Branch: <strong>{branchMap.get(String(selectedBranchFilter))?.branchName || selectedBranchFilter}</strong>
                </>
              )}
            </span>
            <button type="button" className="as-context-clear" onClick={handleResetFilters}>
              Clear Context
            </button>
          </div>
        )}

        {currentStep === STEP_DEPARTMENTS && <DepartmentManagement />}

        {currentStep === STEP_PROGRAMS && (
          <section className="as-programs" aria-label="Programs directory">
            <div className="as-card-header">
              <h2>Programs</h2>
              <Link className="erp-btn erp-btn--secondary" to="/semester-management">Academic Scheduling</Link>
              <button type="button" className="erp-btn erp-btn--primary" onClick={() => openAddModal('course')}><FiPlus /> Add Program</button>
            </div>
            {renderCardFilterBar()}
            <DataTable caption="Programs directory" rows={programRows} tableClassName="erp-table programs-table" actionsClassName="table-actions-end"
              loading={isLoading && 'Loading programs…'}
              emptyState={<EmptyState title="No programs found" message="Add a course or clear the filters." />}
              pagination={{ page: programPage, pageSize: PROGRAMS_PAGE_SIZE, onPageChange: setProgramPage }}
              columns={[
                { key: 'program', label: 'Program', className: 'table-left', width: '21%', render: ({ course }) => {
                  const duration = course.durationYears ?? course.DurationYears ?? course.durationValue
                  return <div className="as-program-identity">
                    <span className="as-program-mark"><FiBookOpen aria-hidden="true" /></span>
                    <div className="as-directory-record"><strong>{courseNameOf(course)}</strong>
                      {duration > 0 && <small>{duration} {Number(duration) === 1 ? 'year' : 'years'}</small>}
                    </div>
                  </div>
                } },
                { key: 'code', label: 'Program Code', className: 'table-center', width: '11%', render: ({ course }) => courseCodeOf(course) || '—' },
                { key: 'structure', label: 'Academic Structure', className: 'table-left', width: '20%', render: ({ course, branch }) => {
                  const definitions = branch ? semestersFor(branch).filter(term => String(term.courseId ?? term.CourseId) === courseIdOf(course)) : []
                  const count = new Set(definitions.map(term => term.semesterId ?? term.id).filter(Boolean).map(String)).size
                  const name = branch?.branchName ?? branch?.name
                  const code = branch?.branchCode ?? branch?.code
                  return <div className="as-directory-record">
                    {branch ? <button type="button" className="as-program-link" onClick={() => openSemesterStructure(course, branch)}>
                      <strong>{name || code || 'Unnamed branch'}</strong>{name && code && name.toLowerCase() !== code.toLowerCase() && <small> · {code}</small>}
                    </button> : <strong>{relationsVerified ? 'No branch configured' : 'Branches unavailable'}</strong>}
                    <small className="as-program-term-counts">
                      <span>{course.totalSemesters ?? course.TotalSemesters ?? course.semesters ?? '—'} planned per branch</span>
                      <span>{semesterListVerified && relationsVerified ? count + ' configured definitions' : 'Definitions unavailable'}</span>
                    </small>
                  </div>
                } },
                { key: 'status', label: 'Status', className: 'table-center', width: '10%', render: ({ course }) => <StatusBadge status={programStatus(course)} /> },
                { key: 'completion', label: 'Completion', className: 'table-center', width: '15%', render: ({ course }) => <div className="as-directory-record">{renderCompletion(programsById.get(courseIdOf(course)).completion)}</div> },
              ]}
              rowActions={renderProgramActions}
            />
          </section>
        )}

        {viewedCourse && viewedProgram && <ViewDialog title={courseNameOf(viewedCourse)} subtitle={courseCodeOf(viewedCourse)} onClose={() => setProgramDetailsId('')} showExport={false}>
          <div className="as-directory-details">
            <p>{viewedCourse.courseType ?? viewedCourse.type ?? 'Type unconfigured'} · {viewedCourse.durationYears ?? viewedCourse.DurationYears ?? viewedCourse.durationValue ?? '—'} years · {programStatus(viewedCourse)}</p>
            {viewedProgram.completion ? <CompletionSummary completion={viewedProgram.completion} name={courseNameOf(viewedCourse)} /> : <p>Completion unavailable</p>}
            <h3>Linked departments</h3>
            <p>{relationsVerified ? viewedProgram.linkedDepartments.map(item => item.departmentName ?? item.name).join(', ') || 'None configured' : 'Unavailable'}</p>
            <div className="as-directory-actions">
              <h3>Branches and semester structure</h3>
              {canAction('/branches', 'create') && <button type="button" className="erp-btn erp-btn--secondary" onClick={() => addBranchFor(viewedCourse)}>Add Branch</button>}
            </div>
            <p>{viewedCourse.totalSemesters ?? viewedCourse.TotalSemesters ?? viewedCourse.semesters ?? '—'} planned per branch. Schedule dates are managed separately.</p>
            {!viewedProgram.children.length && <p>{relationsVerified ? 'No branches configured.' : 'Branches unavailable.'}</p>}
            {viewedProgram.children.map(branch => {
              const check = inspectBranch(branch, viewedCourse)
              const terms = semestersFor(branch)
              return <section className="as-directory-branch" key={branchIdOf(branch)}>
                <div className="as-directory-actions">
                  <strong>{branch.branchName ?? branch.name}</strong><span>{branch.branchCode ?? branch.code}</span>
                  {programActions('branch', branch)}
                  {!!check.missing?.length && <button type="button" className="erp-btn erp-btn--secondary" onClick={() => openRepair(branch)}>Repair {check.missing.length} missing semesters</button>}
                </div>
                {check.error && <p>{check.error}</p>}
                {terms.length ? <ul className="as-program-terms">{terms.map(term => <li key={term.semesterId ?? term.id}>
                  <strong>{term.semesterName ?? 'Semester ' + term.semesterNumber}</strong>
                  <span>{term.startDate && term.endDate ? (yearMap.get(String(term.academicYearId)) || 'Scheduled') : 'Not Scheduled'}</span>
                  {programActions('semester', term)}
                </li>)}</ul> : <p>{semesterListVerified ? 'No saved definitions.' : 'Definitions unavailable.'}</p>}
              </section>
            })}
          </div>
        </ViewDialog>}

        {setupTab && (
          <ViewDialog
            title={repairOnly ? 'Repair Missing Semesters' : modalType === 'review' || (!editingItem && modalType === 'semester') ? setupTab.label : (editingItem ? 'Edit ' : 'Add ') + (modalType === 'semester' ? 'Semester' : modalType === 'course' && !editingItem ? 'Program' : setupTab.label)}
            subtitle={repairOnly ? generationBranch?.branchName ?? generationBranch?.name : setupTab.subtitle}
            className="as-setup-dialog"
            maxWidth={repairOnly ? '520px' : '700px'}
            onClose={closeModal}
            busy={isSubmitting}
            showExport={false}
            bodyRef={setupBody}
            footerContent={<div className="as-setup-actions">
              <button type="button" className="erp-btn erp-btn--secondary" onClick={closeModal} disabled={isSubmitting}>{!editingItem && (modalType === 'branch' && setupCourse.current || ['semester', 'review'].includes(modalType)) ? 'Done' : 'Cancel'}</button>
              {(!['semester', 'review'].includes(modalType) || missingTerms.length > 0) && <button type="submit" form="academic-setup-form" className="erp-btn erp-btn--primary" disabled={isSubmitting || (['semester', 'review'].includes(modalType) && !canAction('/semester-management', 'create'))}>
                {isSubmitting ? 'Saving...' : editingItem ? 'Update ' + (modalType === 'semester' ? 'Semester' : setupTab.label) : modalType === 'semester' ? 'Review' : modalType === 'review' ? 'Generate Missing Semesters' : modalType === 'course' && savedCourseChoice ? 'Next: Branch' : 'Create ' + (modalType === 'course' ? 'Program' : setupTab.label)}
              </button>}
            </div>}
          >
            {!editingItem && !repairOnly && <div className="as-setup-tabs" role="tablist" aria-label="Academic setup">
              {SETUP_TABS.map((tab, index) => (
                <button key={tab.id} type="button" role="tab" id={`academic-setup-${tab.id}`}
                  aria-controls="academic-setup-form" aria-selected={modalType === tab.id}
                  tabIndex={modalType === tab.id ? 0 : -1} disabled={isSubmitting}
                  onClick={() => openAddModal(tab.id, true)}
                  onKeyDown={event => {
                    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
                    if (!keys.includes(event.key)) return
                    event.preventDefault()
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? SETUP_TABS.length - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + SETUP_TABS.length) % SETUP_TABS.length
                    openAddModal(SETUP_TABS[next].id, true)
                    event.currentTarget.parentElement.children[next]?.focus()
                  }}>
                  <span aria-hidden="true">{index + 1}</span>{tab.label}
                </button>
              ))}
            </div>}
            <form id="academic-setup-form" className="as-setup-form"
              role={editingItem || repairOnly ? undefined : 'tabpanel'} aria-labelledby={editingItem || repairOnly ? undefined : `academic-setup-${modalType}`}
              onSubmit={{ course: handleSubmitCourse, branch: handleSubmitBranch, semester: event => { event.preventDefault(); openAddModal('review', true) }, review: generateStructure }[modalType]}>
              {formErrors.submit && <p className="as-setup-error" role="alert">{formErrors.submit}</p>}
              {!editingItem && modalType === 'branch' && setupCourse.current && <p className="as-form-hint">Course saved or selected. Add a branch to this program without creating the course again.</p>}
              {!editingItem && ['semester', 'review'].includes(modalType) && <section className="as-setup-section as-semester-setup">
                {!repairOnly && <div className="as-form-row">
                  <label className="as-form-group">Course
                    <select className="as-form-control" value={generationCourseId} onChange={event => {
                      setGenerationCourseId(event.target.value)
                      setGenerationBranchId('')
                      setSemesterDates({})
                    }} required>
                      <option value="" disabled>Select a saved course</option>
                      {courses.filter(course => courseIdOf(course)).map(course => <option key={courseIdOf(course)} value={courseIdOf(course)}>{courseNameOf(course)} ({courseCodeOf(course)})</option>)}
                    </select>
                  </label>
                  <label className="as-form-group">Branch
                  <select className="as-form-control" value={generationBranchId} onChange={event => {
                    setGenerationBranchId(event.target.value)
                    setSemesterDates({})
                  }} disabled={!generationCourseId} required>
                    <option value="">Select a branch</option>
                    {branches.filter(branch => branchCourseIdOf(branch) === generationCourseId).map(branch =>
                      <option key={branchIdOf(branch)} value={branchIdOf(branch)}>{branch.branchName ?? branch.name}</option>
                    )}
                  </select>
                </label></div>}
                {structure.error && <p role="alert">{structure.error}</p>}
                {generationPlan.length > 0 && <>
                  <p>{generationPlan.length - missingTerms.length} of {generationPlan.length} saved · {missingTerms.length} to add</p>
                  {missingTerms.length > 0 && canAction('/semester-management', 'create') && canAction('/semester-management', 'edit') &&
                    <>
                      <p className="as-form-hint">Add both dates or leave both blank.</p>
                      <div className="as-semester-date-heading" aria-hidden="true">
                        <span>Semester</span><span>Start date</span><span>End date</span>
                      </div>
                    </>}
                  <ol className="as-program-terms">{generationPlan.map(term => {
                    const savedTerms = semestersFor(generationBranch).filter(saved => Number(saved.semesterNumber) === term.semesterNumber &&
                      String(saved.courseId ?? saved.CourseId) === courseIdOf(generationCourse))
                    return <li key={term.semesterNumber}>
                      <strong>{term.semesterName}</strong>
                      {!savedTerms.length && <>
                        {canAction('/semester-management', 'create') && canAction('/semester-management', 'edit') && <div className="as-semester-date-fields">
                          {['startDate', 'endDate'].map(key => {
                            const label = key === 'startDate' ? 'Start date' : 'End date'
                            return <input key={key} type="date" className="as-form-control" aria-label={term.semesterName + ' ' + label.toLowerCase()}
                                value={semesterDates[term.semesterNumber]?.[key] || ''} disabled={isSubmitting}
                                onChange={event => {
                                  const value = event.target.value
                                  setSemesterDates(current => ({ ...current, [term.semesterNumber]: { ...current[term.semesterNumber], [key]: value } }))
                                }} />
                          })}
                        </div>}
                      </>}
                      {savedTerms.map(saved => {
                        const id = saved.semesterId ?? saved.id
                        const year = yearMap.get(String(saved.academicYearId))
                        const scheduled = saved.startDate && saved.endDate
                        return <div className="as-directory-actions" key={id}>
                          <span>{year && year + ' · '}{scheduled ? String(saved.startDate).slice(0, 10) + ' to ' + String(saved.endDate).slice(0, 10) : 'Not scheduled'}</span>
                          {id && canAction('/semester-management', 'edit') && <button type="button" className="erp-btn erp-btn--secondary"
                            aria-label={(scheduled ? 'Edit dates for ' : 'Set dates for ') + term.semesterName + (year ? ' ' + year : '')}
                            disabled={isSubmitting} onClick={() => setSemesterSchedule({
                              row: { ...saved, id, courseId: courseIdOf(generationCourse), branchId: generationBranchId, name: saved.semesterName || term.semesterName },
                              collegeId: selectedCollegeId,
                            })}>{scheduled ? 'Edit dates' : 'Set dates'}</button>}
                        </div>
                      })}
                    </li>
                  })}</ol>
                </>}
              </section>}
            {modalType === 'course' && <>
                  {editingItem && <label className="as-form-group">Department
                    <select className="as-form-control" value={courseForm.departmentId} onChange={event => setCourseForm({ ...courseForm, departmentId: event.target.value })}>
                      <option value="">No direct department</option>
                      {departments.map(department => <option key={departmentIdOf(department)} value={departmentIdOf(department)}>{department.departmentName ?? department.name}</option>)}
                    </select>
                  </label>}
                  <section className="as-setup-section" aria-labelledby="course-profile-heading">
                    <div className="as-setup-heading"><div><h4 id="course-profile-heading">Program identity</h4><p>Enter the course name and its official code.</p></div></div>
                  <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="course-name">
                        Course Name <span className="required">*</span>
                      </label>
                      <div className="as-course-name-control">
                      <input
                        id="course-name"
                        type="text"
                        className={`as-form-control ${formErrors.name ? 'is-invalid' : ''}`}
                        placeholder="e.g. Bachelor of Technology"
                        value={savedCourseChoice ? courseNameOf(courseMap.get(savedCourseChoice)) ?? '' : courseForm.name}
                        onChange={(e) => {
                          setSavedCourseChoice('')
                          setCourseForm({ ...courseForm, name: e.target.value })
                        }}
                        required
                      />
                      {!editingItem && courses.some(course => courseIdOf(course)) && canAction('/branches', 'create') &&
                        <>
                          <button type="button" className="as-form-control as-course-picker" aria-label="Use an existing course"
                            title="Select a saved course" popoverTarget="saved-course-options">
                            <FiChevronDown aria-hidden="true" />
                          </button>
                          <div id="saved-course-options" className="table-action-popover as-course-options" popover="auto"
                            role="group" aria-label="Saved courses" onToggle={event => {
                              if (event.newState === 'open') event.currentTarget.querySelector('button')?.focus()
                            }}>
                            {courses.filter(course => courseIdOf(course)).map(course => (
                              <button type="button" key={courseIdOf(course)} onClick={event => {
                                event.currentTarget.parentElement.hidePopover?.()
                                setSavedCourseChoice(courseIdOf(course))
                                setFormErrors({})
                              }}>{courseNameOf(course)} ({courseCodeOf(course)})</button>
                            ))}
                          </div>
                        </>}
                      </div>
                      {formErrors.name && <span className="as-form-error">{formErrors.name}</span>}
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="course-code">
                        Course Code <span className="required">*</span>
                      </label>
                      <input
                        id="course-code"
                        type="text"
                        className={`as-form-control ${formErrors.code ? 'is-invalid' : ''}`}
                        placeholder="e.g. BTECH"
                        value={savedCourseChoice ? courseCodeOf(courseMap.get(savedCourseChoice)) ?? '' : courseForm.code}
                        readOnly={Boolean(savedCourseChoice)}
                        onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                        required
                      />
                      {formErrors.code && <span className="as-form-error">{formErrors.code}</span>}
                    </div>
                  </div>
                  </section>

                  {!savedCourseChoice && <section className="as-setup-section" aria-labelledby="course-structure-heading">
                    <div className="as-setup-heading"><div><h4 id="course-structure-heading">Program structure</h4><p>Set the course level, duration, and availability.</p></div></div>
                  <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="course-type">Course Type</label>
                      <select
                        id="course-type"
                        className="as-form-control"
                        value={courseForm.type} required
                        onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
                      >
                        <option value="" disabled>Select course type</option>
                        <option value="Undergraduate">Undergraduate (UG)</option>
                        <option value="Postgraduate">Postgraduate (PG)</option>
                        <option value="Diploma">Diploma</option>
                      </select>
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="course-duration">Duration (Years)</label>
                      <input
                        id="course-duration"
                        type="number"
                        min="1"
                        max="6"
                        className="as-form-control"
                        value={courseForm.durationYears} required
                        onChange={(e) => setCourseForm({ ...courseForm, durationYears: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="course-semesters">Total Semesters</label>
                      <input
                        id="course-semesters"
                        type="number"
                        min="1"
                        max="12"
                        className="as-form-control"
                        value={courseForm.totalSemesters} required
                        onChange={(e) => setCourseForm({ ...courseForm, totalSemesters: e.target.value })}
                      />
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="course-status">Status</label>
                      <select
                        id="course-status"
                        className="as-form-control"
                        value={courseForm.status} required
                        onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                      >
                        <option value="" disabled>Select status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  </section>}

            </>}
            {modalType === 'branch' && <>
                  <section className="as-setup-section" aria-labelledby="branch-academic-heading">
                    <div className="as-setup-heading">
                      <div><h4 id="branch-academic-heading">Academic mapping</h4><p>Select the course this branch belongs to.</p></div>
                    </div>
                    <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="branch-course">
                        Select Course <span className="required">*</span>
                      </label>
                      <select
                        id="branch-course"
                        className={`as-form-control ${formErrors.courseId ? 'is-invalid' : ''}`}
                        value={branchForm.courseId}
                        onChange={(e) => {
                          const selectedCourse = courses.find((course) => String(courseIdOf(course)) === e.target.value)
                          setGenerationCourseId(e.target.value)
                          setGenerationBranchId('')
                          setBranchForm((current) => ({
                            ...current,
                            courseId: e.target.value,
                            departmentId: String(courseDepartmentIdOf(selectedCourse) ?? current.departmentId ?? ''),
                          }))
                        }}
                        disabled={isLoading || !courses.some((course) => courseIdOf(course) != null)}
                        required
                      >
                        <option value="">{isLoading ? 'Loading existing courses...' : courses.some((course) => courseIdOf(course) != null) ? '-- Choose an existing course --' : 'No courses available'}</option>
                        {courses.filter((course) => courseIdOf(course) != null).slice().sort((a, b) => String(courseNameOf(a) || '').localeCompare(String(courseNameOf(b) || ''))).map((c) => {
                          const id = String(courseIdOf(c))
                          const courseName = courseNameOf(c) || `Course ${id}`
                          const courseCode = courseCodeOf(c)
                          return (
                            <option key={id} value={id}>
                              {courseName}{courseCode ? ` (${courseCode})` : ''}
                            </option>
                          )
                        })}
                      </select>
                      {formErrors.courseId && <span className="as-form-error">{formErrors.courseId}</span>}
                      {!isLoading && !courses.some((course) => courseIdOf(course) != null) && <span className="as-form-hint">Create a course in the Courses section before adding a branch.</span>}
                    </div>

                    <div className="as-form-group">
                      <label htmlFor="branch-dept">
                        Select Department <span className="required">*</span>
                      </label>
                      <select
                        id="branch-dept"
                        className={`as-form-control ${formErrors.departmentId ? 'is-invalid' : ''}`}
                        value={branchForm.departmentId}
                        onChange={(e) => {
                          const newDeptId = e.target.value
                          const deptCourses = courses.filter((c) => String(courseDepartmentIdOf(c)) === String(newDeptId))
                          const selectedCourse = courses.find(course => String(courseIdOf(course)) === String(branchForm.courseId))
                          const selectedDepartment = courseDepartmentIdOf(selectedCourse)
                          const keepCourse = selectedCourse && (!selectedDepartment || String(selectedDepartment) === newDeptId)
                          setBranchForm({
                            ...branchForm,
                            departmentId: newDeptId,
                            courseId: keepCourse ? branchForm.courseId : String(courseIdOf(deptCourses[0]) ?? ''),
                          })
                        }}
                        required
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map((d) => {
                          const id = String(d.departmentId ?? d.id)
                          return (
                            <option key={id} value={id}>
                              {d.departmentName ?? d.name} ({d.departmentCode ?? d.code})
                            </option>
                          )
                        })}
                      </select>
                      {formErrors.departmentId && <span className="as-form-error">{formErrors.departmentId}</span>}
                    </div>
                    </div>
                  </section>

                  <section className="as-setup-section" aria-labelledby="branch-details-heading">
                    <div className="as-setup-heading">
                      <div><h4 id="branch-details-heading">Branch details</h4><p>Set the branch identity and admission capacity.</p></div>
                    </div>
                    {!editingItem && canAction('/semester-management', 'create') && canAction('/semester-management', 'edit') &&
                      <label className="as-semester-date-choice">
                        <input type="checkbox" checked={chooseDatesFirst} onChange={event => setChooseDatesFirst(event.target.checked)} />
                        Choose semester dates before creating definitions
                      </label>}
                    <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="branch-name">
                        Branch Name <span className="required">*</span>
                      </label>
                      <input
                        id="branch-name"
                        type="text"
                        className={`as-form-control ${formErrors.name ? 'is-invalid' : ''}`}
                        placeholder="e.g. Computer Science and Engineering"
                        value={branchForm.name}
                        onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                        required
                      />
                      {formErrors.name && <span className="as-form-error">{formErrors.name}</span>}
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="branch-code">
                        Branch Code <span className="required">*</span>
                      </label>
                      <input
                        id="branch-code"
                        type="text"
                        className={`as-form-control ${formErrors.code ? 'is-invalid' : ''}`}
                        placeholder="e.g. CSE"
                        value={branchForm.code}
                        onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                        required
                      />
                      {formErrors.code && <span className="as-form-error">{formErrors.code}</span>}
                    </div>
                    </div>

                    <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="branch-intake">Intake Capacity</label>
                      <input
                        id="branch-intake"
                        type="number"
                        min="1"
                        max="1000"
                        className="as-form-control"
                        placeholder="e.g. 60 or 120"
                        value={branchForm.intakeCapacity}
                        onChange={(e) => setBranchForm({ ...branchForm, intakeCapacity: e.target.value })}
                      />
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="branch-status">Status</label>
                      <select
                        id="branch-status"
                        className="as-form-control"
                        value={branchForm.status}
                        onChange={(e) => setBranchForm({ ...branchForm, status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    </div>
                  </section>
            </>}
            </form>
          </ViewDialog>
        )}

        {/* ========================================================
            MODAL: DELETE CONFIRMATION
            ======================================================== */}
        {semesterSchedule && <ScheduleDialog row={semesterSchedule.row}
          yearName={yearMap.get(String(semesterSchedule.row.academicYearId)) || 'Academic year'}
          onClose={() => setSemesterSchedule(null)}
          context={() => {
            if (String(collegeScope.current) !== String(semesterSchedule.collegeId) || !canAction('/semester-management', 'edit')) {
              throw new Error('The scheduling context changed. Reopen the semester before saving.')
            }
          }}
          onSaved={saved => {
            setSemesters(current => current.map(term => String(term.semesterId ?? term.id) === String(saved.id) ? { ...term, ...saved } : term))
            setSemesterSchedule(null)
            showToast('Schedule saved.')
          }} />}
        {deleteConfirm && (
          <div className="as-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
            <div className="as-modal as-modal--sm" onClick={(e) => e.stopPropagation()}>
              <div className="as-modal__body">
                <div className="as-delete-modal-content">
                  <div className="as-delete-icon-wrap">
                    <FiTrash2 />
                  </div>
                  <h4>Confirm Deletion</h4>
                  <p>
                    Are you sure you want to delete this {deleteConfirm.type} (
                    <strong>
                      {deleteConfirm.item.departmentName ??
                        deleteConfirm.item.courseName ??
                        deleteConfirm.item.branchName ??
                        deleteConfirm.item.semesterName ??
                        deleteConfirm.item.name}
                    </strong>
                    )? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="as-modal__footer">
                <button
                  type="button"
                  className="as-btn as-btn--outline"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="as-btn as-btn--danger"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
