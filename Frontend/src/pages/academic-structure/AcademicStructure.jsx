import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  FiLayers,
  FiBookOpen,
  FiGitBranch,
  FiCalendar,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiFilter,
  FiChevronDown,
  FiAlertCircle,
  FiX,
  FiInfo,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import { useAcademic } from '../../context/AcademicContext'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  updateDepartmentStatus,
  deleteDepartment,
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
  updateSemester,
  deleteSemester,
} from '../../auth/collegeApi'
import { academicYearApi } from '../../api/apiEndpoints'
import './AcademicStructure.css'

const STEP_DEPARTMENTS = 'departments'
const STEP_COURSES = 'courses'
const STEP_BRANCHES = 'branches'
const STEP_SEMESTERS = 'semesters'
const courseIdOf = (course = {}) => String(course.courseId ?? course.CourseId ?? course.CourseID ?? course.courseID ?? course.course_id ?? course.id ?? course.Id ?? course.ID ?? '')
const courseDepartmentIdOf = (course = {}) => String(course.departmentId ?? course.DepartmentId ?? course.DepartmentID ?? course.department_id ?? course.department?.departmentId ?? course.department?.DepartmentId ?? course.department?.id ?? '')
const branchIdOf = (branch = {}) => String(branch.branchId ?? branch.BranchId ?? branch.BranchID ?? branch.branch_id ?? branch.id ?? branch.Id ?? '')
const branchCourseIdOf = (branch = {}) => String(branch.courseId ?? branch.CourseId ?? branch.CourseID ?? branch.course_id ?? '')

const STEPS = [
  { id: STEP_COURSES, stepNumber: 1, label: 'Courses', icon: FiBookOpen, description: 'Degree Programs' },
  { id: STEP_DEPARTMENTS, stepNumber: 2, label: 'Departments', icon: FiLayers, description: 'Academic Units' },
  { id: STEP_BRANCHES, stepNumber: 3, label: 'Branches', icon: FiGitBranch, description: 'Specializations' },
  { id: STEP_SEMESTERS, stepNumber: 4, label: 'Semesters', icon: FiCalendar, description: 'Curriculum Terms' },
]

const courseNameOf = (course) => course?.courseName ?? course?.CourseName ?? course?.name ?? course?.Name
const courseCodeOf = (course) => course?.courseCode ?? course?.CourseCode ?? course?.code ?? course?.Code
const departmentIdOf = (department) => department?.departmentId ?? department?.DepartmentId ?? department?.id ?? department?.Id

export default function AcademicStructure() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentStep = searchParams.get('step') || STEP_COURSES
  const { selectedCollegeId, selectedCollege } = useAcademic()

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
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Modals state
  const [modalType, setModalType] = useState(null) // 'department' | 'course' | 'branch' | 'semester'
  const [editingItem, setEditingItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { type, item }

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', status: 'Active' })
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    departmentId: '',
    type: 'Undergraduate',
    durationYears: 4,
    totalSemesters: 8,
    eligibility: '',
    description: '',
    status: 'Active',
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
  const [semesterForm, setSemesterForm] = useState({
    departmentId: '',
    courseId: '',
    branchId: '',
    academicYearId: '',
    semesterNumber: 1,
    semesterName: '1st Semester',
    startDate: '',
    endDate: '',
    status: 'Upcoming',
  })

  const [formErrors, setFormErrors] = useState({})

  const selectedSemesterCourse = courses.find((course) => String(courseIdOf(course)) === String(semesterForm.courseId))
  const selectedSemesterCourseDepartmentId = courseDepartmentIdOf(selectedSemesterCourse)
  const semesterCourseHasDepartment = selectedSemesterCourseDepartmentId != null && String(selectedSemesterCourseDepartmentId) !== ''

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Load all academic data
  const loadAcademicData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [deptRes, courseRes, branchRes, semRes, yearRes] = await Promise.allSettled([
        getDepartments(),
        getCourses(),
        getBranches(),
        getSemesters(),
        academicYearApi.getAll().catch(() => []),
      ])

      const extractList = (res) => {
        if (res.status !== 'fulfilled') return []
        const raw = res.value?.data ?? res.value
        if (Array.isArray(raw)) return raw
        if (Array.isArray(raw?.data)) return raw.data
        if (Array.isArray(raw?.items)) return raw.items
        if (Array.isArray(raw?.semesters)) return raw.semesters
        if (Array.isArray(raw?.courses)) return raw.courses
        return []
      }

      setDepartments(extractList(deptRes))
      setCourses(extractList(courseRes))
      setBranches(extractList(branchRes))
      setSemesters(extractList(semRes))
      setAcademicYears(yearRes.status === 'fulfilled' && Array.isArray(yearRes.value) ? yearRes.value : [])
    } catch (err) {
      console.error('Failed loading academic structure data:', err)
      showToast('Error loading academic structure data. Please try again.', 'error')
    } finally {
      setIsLoading(false)
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
    loadAcademicData()
  }, [loadAcademicData, selectedCollegeId])

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
  const searchPlaceholder = useMemo(() => {
    switch (currentStep) {
      case STEP_COURSES:
        return 'Search courses by name, code...'
      case STEP_BRANCHES:
        return 'Search branches by name, code...'
      case STEP_SEMESTERS:
        return 'Search semesters by term, number...'
      case STEP_DEPARTMENTS:
      default:
        return 'Search departments by name, code...'
    }
  }, [currentStep])

  // Count active filters for badge and reset toggle
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedDeptFilter) count++
    if (selectedCourseFilter) count++
    if (selectedBranchFilter) count++
    if (statusFilter) count++
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
  }, [selectedDeptFilter, selectedCourseFilter, selectedBranchFilter, statusFilter])

  // Filtered lists for each step
  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return departments.filter((d) => {
      const name = String(d.departmentName ?? d.name ?? '').toLowerCase()
      const code = String(d.departmentCode ?? d.code ?? '').toLowerCase()
      const desc = String(d.description ?? '').toLowerCase()
      const matchesSearch = !q || name.includes(q) || code.includes(q) || desc.includes(q)
      const isRecordActive = String(d.status) === '1' || String(d.status).toLowerCase() === 'active' || d.status === true
      const matchesStatus = !statusFilter || (statusFilter === 'Active' ? isRecordActive : !isRecordActive)
      return matchesSearch && matchesStatus
    })
  }, [departments, searchQuery, statusFilter])

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return courses.filter((c) => {
      const name = String(c.courseName ?? c.name ?? '').toLowerCase()
      const code = String(c.courseCode ?? c.code ?? '').toLowerCase()
      const deptName = String(deptMap.get(String(c.departmentId ?? c.DepartmentId)) ?? '').toLowerCase()
      const matchesSearch = !q || name.includes(q) || code.includes(q) || deptName.includes(q)
      const isRecordActive = String(c.status) === '1' || String(c.status).toLowerCase() === 'active' || c.status === true
      const matchesStatus = !statusFilter || (statusFilter === 'Active' ? isRecordActive : !isRecordActive)
      const matchesDept = !selectedDeptFilter || String(c.departmentId ?? c.DepartmentId) === String(selectedDeptFilter)
      return matchesSearch && matchesStatus && matchesDept
    })
  }, [courses, searchQuery, statusFilter, selectedDeptFilter, deptMap])

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return branches.filter((b) => {
      const name = String(b.branchName ?? b.name ?? '').toLowerCase()
      const code = String(b.branchCode ?? b.code ?? '').toLowerCase()
      const spec = String(b.specialization ?? '').toLowerCase()
      const course = courseMap.get(String(b.courseId ?? b.CourseId))
      const courseName = String(course?.courseName ?? course?.name ?? '').toLowerCase()
      const matchesSearch = !q || name.includes(q) || code.includes(q) || spec.includes(q) || courseName.includes(q)
      const isRecordActive = String(b.status) === '1' || String(b.status).toLowerCase() === 'active' || b.status === true
      const matchesStatus = !statusFilter || (statusFilter === 'Active' ? isRecordActive : !isRecordActive)
      const matchesDept = !selectedDeptFilter || String(b.departmentId) === String(selectedDeptFilter)
      const matchesCourse = !selectedCourseFilter || String(b.courseId ?? b.CourseId) === String(selectedCourseFilter)
      return matchesSearch && matchesStatus && matchesDept && matchesCourse
    })
  }, [branches, searchQuery, statusFilter, selectedDeptFilter, selectedCourseFilter, courseMap])

  const filteredSemesters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return semesters.filter((s) => {
      const name = String(s.semesterName ?? s.name ?? '').toLowerCase()
      const num = String(s.semesterNumber ?? '')
      const branch = branchMap.get(String(s.branchId ?? s.BranchId))
      const branchName = String(branch?.branchName ?? branch?.name ?? '').toLowerCase()
      const course = courseMap.get(String(s.courseId ?? s.CourseId))
      const courseName = String(course?.courseName ?? course?.name ?? '').toLowerCase()
      const yearName = String(yearMap.get(String(s.academicYearId ?? s.AcademicYearId)) ?? '').toLowerCase()
      const matchesSearch =
        !q ||
        name.includes(q) ||
        num.includes(q) ||
        `semester ${num}`.includes(q) ||
        branchName.includes(q) ||
        courseName.includes(q) ||
        yearName.includes(q)
      const isRecordActive = String(s.status) === '1' || String(s.status).toLowerCase() === 'active' || s.status === true
      const matchesStatus = !statusFilter || (statusFilter === 'Active' ? isRecordActive : !isRecordActive)
      const matchesBranch = !selectedBranchFilter || String(s.branchId ?? s.BranchId) === String(selectedBranchFilter)
      const matchesCourse = !selectedCourseFilter || String(s.courseId ?? s.CourseId) === String(selectedCourseFilter)
      return matchesSearch && matchesStatus && matchesBranch && matchesCourse
    })
  }, [semesters, searchQuery, statusFilter, selectedBranchFilter, selectedCourseFilter, branchMap, courseMap, yearMap])

  // ==========================================
  // MODAL HANDLERS & CRUD OPERATIONS
  // ==========================================

  // Open Add Modals
  const openAddModal = (type) => {
    setModalType(type)
    setEditingItem(null)
    setFormErrors({})

    if (type === 'department') {
      setDeptForm({ name: '', code: '', description: '', status: 'Active' })
    } else if (type === 'course') {
      setCourseForm({
        name: '',
        code: '',
        departmentId: '',
        type: 'Undergraduate',
        durationYears: 4,
        totalSemesters: 8,
        eligibility: '',
        description: '',
        status: 'Active',
      })
    } else if (type === 'branch') {
      setBranchForm({
        name: '',
        code: '',
        departmentId: '',
        courseId: '',
        specialization: '',
        intakeCapacity: 60,
        status: 'Active',
      })
    } else if (type === 'semester') {
      const filteredCourse = courses.find((course) => String(courseIdOf(course)) === String(selectedCourseFilter))
      const filteredDepartmentCourse = courses.find((course) => selectedDeptFilter && String(courseDepartmentIdOf(course)) === String(selectedDeptFilter))
      const defaultCourseRecord = filteredCourse || filteredDepartmentCourse || courses[0]
      const defaultCourse = String(courseIdOf(defaultCourseRecord) ?? '')
      const courseDepartmentId = courseDepartmentIdOf(defaultCourseRecord)
      const defaultDept = String(courseDepartmentId ?? (selectedDeptFilter || ''))
      const courseBranches = branches.filter((branch) => String(branchCourseIdOf(branch)) === defaultCourse)
      const selectedBranch = courseBranches.find((branch) => String(branchIdOf(branch)) === String(selectedBranchFilter))
      const defaultBranch = String(branchIdOf(selectedBranch || courseBranches[0]) ?? '')

      setSemesterForm({
        departmentId: defaultDept,
        courseId: defaultCourse,
        branchId: defaultBranch,
        academicYearId: academicYears[0]?.academicYearId ?? academicYears[0]?.id ?? '',
        semesterNumber: 1,
        semesterName: '1st Semester',
        startDate: '',
        endDate: '',
        status: 'Upcoming',
      })
    }
  }

  // Open Edit Modals
  const openEditModal = (type, item) => {
    setModalType(type)
    setEditingItem(item)
    setFormErrors({})

    if (type === 'department') {
      setDeptForm({
        name: item.departmentName ?? item.name ?? '',
        code: item.departmentCode ?? item.code ?? '',
        description: item.description ?? '',
        status: String(item.status) === '1' || item.status === 'Active' || item.status === true ? 'Active' : 'Inactive',
      })
    } else if (type === 'course') {
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
    } else if (type === 'semester') {
      const course = courseMap.get(String(courseIdOf(item)))
      setSemesterForm({
        departmentId: String(courseDepartmentIdOf(course) ?? item.departmentId ?? item.DepartmentId ?? ''),
        courseId: String(courseIdOf(item) ?? ''),
        branchId: String(branchIdOf(item) ?? ''),
        academicYearId: String(item.academicYearId ?? item.AcademicYearId ?? ''),
        semesterNumber: item.semesterNumber ?? 1,
        semesterName: item.semesterName ?? item.name ?? '1st Semester',
        startDate: item.startDate ? String(item.startDate).slice(0, 10) : '',
        endDate: item.endDate ? String(item.endDate).slice(0, 10) : '',
        status: item.status === 1 || item.status === 'Active' ? 'Active' : item.status === 'Completed' ? 'Completed' : 'Upcoming',
      })
    }
  }

  // Close Modal
  const closeModal = () => {
    setModalType(null)
    setEditingItem(null)
    setFormErrors({})
  }

  // Submit Department Form
  const handleSubmitDepartment = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!deptForm.name.trim()) errors.name = 'Department Name is required'
    if (!deptForm.code.trim()) errors.code = 'Department Code is required'

    // Duplicate check
    const duplicate = departments.some(
      (d) =>
        String(d.departmentCode ?? d.code).toUpperCase() === deptForm.code.trim().toUpperCase() &&
        String(d.departmentId ?? d.id) !== String(editingItem?.departmentId ?? editingItem?.id)
    )
    if (duplicate) errors.code = 'Department code already exists'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        departmentName: deptForm.name.trim(),
        departmentCode: deptForm.code.trim().toUpperCase(),
        description: deptForm.description.trim() || null,
        collegeId: selectedCollegeId ? Number(selectedCollegeId) : 1,
        status: deptForm.status === 'Active' ? 1 : 0,
      }

      if (editingItem) {
        const id = editingItem.departmentId ?? editingItem.id
        await updateDepartment(id, payload)
        showToast('Department updated successfully.')
      } else {
        await createDepartment(payload)
        showToast('Department added successfully.')
      }
      closeModal()
      loadAcademicData()
    } catch (err) {
      console.error(err)
      showToast(err?.response?.data?.message || err?.message || 'Failed saving department.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Course Form
  const handleSubmitCourse = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!courseForm.name.trim()) errors.name = 'Course Name is required'
    if (!courseForm.code.trim()) errors.code = 'Course Code is required'

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
        collegeId: selectedCollegeId ? Number(selectedCollegeId) : 1,
        courseType: courseForm.type,
        durationYears: Number(courseForm.durationYears),
        totalSemesters: Number(courseForm.totalSemesters),
        eligibility: courseForm.eligibility.trim() || null,
        description: courseForm.description.trim() || null,
        status: courseForm.status === 'Active' ? 1 : 0,
      }

      if (editingItem) {
        const id = editingItem.courseId ?? editingItem.id
        await updateCourse(id, payload)
        showToast('Course updated successfully.')
      } else {
        await createCourse(payload)
        showToast('Course created successfully.')
      }
      closeModal()
      loadAcademicData()
    } catch (err) {
      console.error(err)
      showToast(err?.response?.data?.message || err?.message || 'Failed saving course.', 'error')
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
        await updateBranch(id, payload)
        showToast('Branch updated successfully.')
      } else {
        await createBranch(payload)
        showToast('Branch created successfully.')
      }
      closeModal()
      loadAcademicData()
    } catch (err) {
      console.error(err)
      showToast(err?.response?.data?.message || err?.message || 'Failed saving branch.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Semester Form
  const handleSubmitSemester = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!semesterForm.departmentId) errors.departmentId = 'Please select a Department'
    if (!semesterForm.courseId) errors.courseId = 'Please select a Course'
    if (!semesterForm.branchId) errors.branchId = 'Please select a Branch'
    if (!semesterForm.semesterNumber) errors.semesterNumber = 'Semester Number is required'

    // Duplicate check: same branch + same semester number
    const duplicate = semesters.some(
      (s) =>
        String(s.branchId ?? s.BranchId) === String(semesterForm.branchId) &&
        Number(s.semesterNumber) === Number(semesterForm.semesterNumber) &&
        String(s.semesterId ?? s.id) !== String(editingItem?.semesterId ?? editingItem?.id)
    )
    if (duplicate) errors.semesterNumber = 'This semester number already exists for the selected branch'

    if (semesterForm.startDate && semesterForm.endDate && semesterForm.startDate > semesterForm.endDate) {
      errors.endDate = 'End date cannot be earlier than start date'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        courseId: Number(semesterForm.courseId),
        branchId: Number(semesterForm.branchId),
        academicYearId: semesterForm.academicYearId ? Number(semesterForm.academicYearId) : 1,
        semesterNumber: Number(semesterForm.semesterNumber),
        semesterName: semesterForm.semesterName.trim() || `Semester ${semesterForm.semesterNumber}`,
        yearNumber: Math.ceil(Number(semesterForm.semesterNumber) / 2),
        startDate: semesterForm.startDate || null,
        endDate: semesterForm.endDate || null,
        status: semesterForm.status === 'Active' ? 1 : semesterForm.status === 'Completed' ? 2 : 0,
      }

      if (editingItem) {
        const id = editingItem.semesterId ?? editingItem.id
        await updateSemester(id, payload)
        showToast('Semester updated successfully.')
      } else {
        await createSemester(payload)
        showToast('Semester saved successfully.')
      }
      closeModal()
      loadAcademicData()
    } catch (err) {
      console.error(err)
      showToast(err?.response?.data?.message || err?.message || 'Failed saving semester.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle status handlers
  const handleToggleStatus = async (type, item) => {
    const isCurrentActive = String(item.status) === '1' || item.status === 'Active' || item.status === true
    const newStatus = isCurrentActive ? 0 : 1
    try {
      if (type === 'department') {
        const id = item.departmentId ?? item.id
        await updateDepartmentStatus(id, newStatus)
      } else if (type === 'course') {
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
      if (type === 'department') {
        const id = item.departmentId ?? item.id
        await deleteDepartment(id)
        showToast('Department deleted successfully.')
      } else if (type === 'course') {
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
          </div>
        </div>
      )}
    </div>
  )

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
          <nav className="as-breadcrumb" aria-label="Breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span className="as-breadcrumb__separator">/</span>
            <span>College & Academic Setup</span>
            <span className="as-breadcrumb__separator">/</span>
            <span className="as-breadcrumb__current">Academic Structure</span>
          </nav>
          <div className="as-header__main">
            <div className="as-title-group">
              <h1>Academic Structure</h1>
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
              const count =
                s.id === STEP_DEPARTMENTS
                  ? departments.length
                  : s.id === STEP_COURSES
                  ? courses.length
                  : s.id === STEP_BRANCHES
                  ? branches.length
                  : semesters.length

              return (
                <button
                  key={s.id}
                  type="button"
                  className={`as-tab-button ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleStepChange(s.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <StepIcon size={16} className="as-tab-icon" />
                  <span className="as-tab-label">{s.stepNumber}. {s.label}</span>
                  <span className="as-tab-count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Cascade Filter Context Banner */}
        {(selectedDeptFilter || selectedCourseFilter || selectedBranchFilter) && (
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

        {/* ========================================================
            STEP 1: DEPARTMENTS SECTION
            ======================================================== */}
        {currentStep === STEP_DEPARTMENTS && (
          <div className="as-content-card">
            <div className="as-card-header">
              <div className="as-card-header__left">
                <h2 className="as-card-header__title">ACADEMIC DEPARTMENTS DIRECTORY</h2>
                <span className="as-card-header__count">{filteredDepartments.length} records</span>
              </div>
              <div className="as-card-header__right">
                <button
                  type="button"
                  className="as-btn as-btn--primary"
                  onClick={() => openAddModal('department')}
                >
                  <FiPlus size={16} /> Add Department
                </button>
              </div>
            </div>

            {renderCardFilterBar()}

            {isLoading ? (
              <div className="as-loading-state">
                <div className="as-spinner" />
                <span>Loading departments...</span>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <EmptyState
                icon={FiLayers}
                title="No departments found"
                message={searchQuery || statusFilter ? 'Try clearing your search query or filters.' : 'Add your first academic department to begin.'}
                actionLabel={searchQuery || statusFilter ? 'Reset Filters' : '+ Add Department'}
                onAction={searchQuery || statusFilter ? handleResetFilters : () => openAddModal('department')}
              />
            ) : (
              <div className="as-table-container">
                <table className="as-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Department Code</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartments.map((dept) => {
                      const id = dept.departmentId ?? dept.id
                      const isActive = String(dept.status) === '1' || dept.status === 'Active' || dept.status === true
                      return (
                        <tr key={id}>
                          <td data-label="Department Name">
                            <div className="as-cell-hierarchy">
                              <span className="as-cell-hierarchy__main">{dept.departmentName ?? dept.name}</span>
                            </div>
                          </td>
                          <td data-label="Department Code">
                            <span className="as-badge-code">{dept.departmentCode ?? dept.code}</span>
                          </td>
                          <td data-label="Description">
                            <span style={{ color: '#475569', fontSize: '0.8125rem' }}>
                              {dept.description || '—'}
                            </span>
                          </td>
                          <td data-label="Status">
                            <StatusBadge status={isActive ? 'Active' : 'Inactive'} />
                          </td>
                          <td data-label="Actions">
                            <div className="as-actions-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className={`as-action-btn as-action-btn--status ${isActive ? 'is-active' : 'is-inactive'}`}
                                title={isActive ? 'Deactivate Department' : 'Activate Department'}
                                onClick={() => handleToggleStatus('department', dept)}
                              >
                                {isActive ? <FiCheckCircle /> : <FiXCircle />}
                              </button>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--edit"
                                title="Edit Department"
                                onClick={() => openEditModal('department', dept)}
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--delete"
                                title="Delete Department"
                                onClick={() => setDeleteConfirm({ type: 'department', item: dept })}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 2: COURSES SECTION
            ======================================================== */}
        {currentStep === STEP_COURSES && (
          <div className="as-content-card">
            <div className="as-card-header">
              <div className="as-card-header__left">
                <h2 className="as-card-header__title">DEGREE COURSES DIRECTORY</h2>
                <span className="as-card-header__count">{filteredCourses.length} records</span>
              </div>
              <div className="as-card-header__right">
                <button
                  type="button"
                  className="as-btn as-btn--primary"
                  onClick={() => openAddModal('course')}
                >
                  <FiPlus size={16} /> Add Course
                </button>
              </div>
            </div>

            {renderCardFilterBar()}

            {isLoading ? (
              <div className="as-loading-state">
                <div className="as-spinner" />
                <span>Loading courses...</span>
              </div>
            ) : filteredCourses.length === 0 ? (
              <EmptyState
                icon={FiBookOpen}
                title="No courses found"
                message={
                  selectedDeptFilter
                    ? `No courses found under ${deptMap.get(String(selectedDeptFilter)) || 'selected department'}.`
                    : 'Add your first course program linked to a department.'
                }
                actionLabel={searchQuery || selectedDeptFilter ? 'Reset Filters' : '+ Add Course'}
                onAction={searchQuery || selectedDeptFilter ? handleResetFilters : () => openAddModal('course')}
              />
            ) : (
              <div className="as-table-container">
                <table className="as-table">
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Course Code</th>
                      <th>Department</th>
                      <th>Course Level</th>
                      <th>Duration</th>
                      <th>Semesters</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => {
                      const id = course.courseId ?? course.id
                      const deptName = deptMap.get(String(course.departmentId ?? course.DepartmentId)) || '—'
                      const isActive = String(course.status) === '1' || course.status === 'Active' || course.status === true
                      return (
                        <tr key={id}>
                          <td data-label="Course Name">
                            <div className="as-cell-hierarchy">
                              <span className="as-cell-hierarchy__main">{course.courseName ?? course.name}</span>
                              {course.eligibility && (
                                <span className="as-cell-hierarchy__sub">Eligibility: {course.eligibility}</span>
                              )}
                            </div>
                          </td>
                          <td data-label="Course Code">
                            <span className="as-badge-code">{course.courseCode ?? course.code}</span>
                          </td>
                          <td data-label="Department">
                            <span style={{ fontWeight: 500, color: '#334155' }}>{deptName}</span>
                          </td>
                          <td data-label="Course Level">
                            <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                              {course.courseType ?? course.type ?? 'Undergraduate'}
                            </span>
                          </td>
                          <td data-label="Duration">{course.durationYears ?? course.DurationYears ?? 4} Years</td>
                          <td data-label="Semesters">{course.totalSemesters ?? course.TotalSemesters ?? 8} Sems</td>
                          <td data-label="Status">
                            <StatusBadge status={isActive ? 'Active' : 'Inactive'} />
                          </td>
                          <td data-label="Actions">
                            <div className="as-actions-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className={`as-action-btn as-action-btn--status ${isActive ? 'is-active' : 'is-inactive'}`}
                                title={isActive ? 'Deactivate Course' : 'Activate Course'}
                                onClick={() => handleToggleStatus('course', course)}
                              >
                                {isActive ? <FiCheckCircle /> : <FiXCircle />}
                              </button>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--edit"
                                title="Edit Course"
                                onClick={() => openEditModal('course', course)}
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--delete"
                                title="Delete Course"
                                onClick={() => setDeleteConfirm({ type: 'course', item: course })}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 3: BRANCHES SECTION
            ======================================================== */}
        {currentStep === STEP_BRANCHES && (
          <div className="as-content-card">
            <div className="as-card-header">
              <div className="as-card-header__left">
                <h2 className="as-card-header__title">ENGINEERING BRANCHES DIRECTORY</h2>
                <span className="as-card-header__count">{filteredBranches.length} records</span>
              </div>
              <div className="as-card-header__right">
                <button
                  type="button"
                  className="as-btn as-btn--primary"
                  onClick={() => openAddModal('branch')}
                >
                  <FiPlus size={16} /> Add Branch
                </button>
              </div>
            </div>

            {renderCardFilterBar()}

            {isLoading ? (
              <div className="as-loading-state">
                <div className="as-spinner" />
                <span>Loading branches...</span>
              </div>
            ) : filteredBranches.length === 0 ? (
              <EmptyState
                icon={FiGitBranch}
                title="No branches found"
                message={
                  selectedCourseFilter
                    ? `No branches found under selected course.`
                    : 'Add branches linked to their corresponding department and course.'
                }
                actionLabel={searchQuery || selectedCourseFilter ? 'Reset Filters' : '+ Add Branch'}
                onAction={searchQuery || selectedCourseFilter ? handleResetFilters : () => openAddModal('branch')}
              />
            ) : (
              <div className="as-table-container">
                <table className="as-table">
                  <thead>
                    <tr>
                      <th>Branch Name</th>
                      <th>Branch Code</th>
                      <th>Department</th>
                      <th>Course</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.map((branch) => {
                      const id = branch.branchId ?? branch.id
                      const course = courseMap.get(String(branch.courseId ?? branch.CourseId))
                      const deptName = deptMap.get(String(branch.departmentId ?? course?.departmentId)) || '—'
                      const courseName = course?.courseName ?? course?.name ?? '—'
                      const isActive = String(branch.status) === '1' || branch.status === 'Active' || branch.status === true
                      return (
                        <tr key={id}>
                          <td data-label="Branch Name">
                            <div className="as-cell-hierarchy">
                              <span className="as-cell-hierarchy__main">{branch.branchName ?? branch.name}</span>
                              {branch.specialization && (
                                <span className="as-cell-hierarchy__sub">Specialization: {branch.specialization}</span>
                              )}
                            </div>
                          </td>
                          <td data-label="Branch Code">
                            <span className="as-badge-code">{branch.branchCode ?? branch.code}</span>
                          </td>
                          <td data-label="Department">
                            <span style={{ fontWeight: 500, color: '#334155' }}>{deptName}</span>
                          </td>
                          <td data-label="Course">
                            <span style={{ color: '#475569' }}>{courseName}</span>
                          </td>
                          <td data-label="Status">
                            <StatusBadge status={isActive ? 'Active' : 'Inactive'} />
                          </td>
                          <td data-label="Actions">
                            <div className="as-actions-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className={`as-action-btn as-action-btn--status ${isActive ? 'is-active' : 'is-inactive'}`}
                                title={isActive ? 'Deactivate Branch' : 'Activate Branch'}
                                onClick={() => handleToggleStatus('branch', branch)}
                              >
                                {isActive ? <FiCheckCircle /> : <FiXCircle />}
                              </button>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--edit"
                                title="Edit Branch"
                                onClick={() => openEditModal('branch', branch)}
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--delete"
                                title="Delete Branch"
                                onClick={() => setDeleteConfirm({ type: 'branch', item: branch })}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 4: SEMESTERS SECTION
            ======================================================== */}
        {currentStep === STEP_SEMESTERS && (
          <div className="as-content-card">
            <div className="as-card-header">
              <div className="as-card-header__left">
                <h2 className="as-card-header__title">SEMESTER CURRICULUM DIRECTORY</h2>
                <span className="as-card-header__count">{filteredSemesters.length} records</span>
              </div>
              <div className="as-card-header__right">
                <button
                  type="button"
                  className="as-btn as-btn--primary"
                  onClick={() => openAddModal('semester')}
                >
                  <FiPlus size={16} /> Add Semester
                </button>
              </div>
            </div>

            {renderCardFilterBar()}

            {isLoading ? (
              <div className="as-loading-state">
                <div className="as-spinner" />
                <span>Loading semesters...</span>
              </div>
            ) : filteredSemesters.length === 0 ? (
              <EmptyState
                icon={FiCalendar}
                title="No semesters found"
                message={
                  selectedBranchFilter
                    ? `No semesters configured for selected branch.`
                    : 'Configure semesters (1 to 8) linked to their degree course and engineering branch.'
                }
                actionLabel={searchQuery || selectedBranchFilter ? 'Reset Filters' : '+ Add Semester'}
                onAction={searchQuery || selectedBranchFilter ? handleResetFilters : () => openAddModal('semester')}
              />
            ) : (
              <div className="as-table-container">
                <table className="as-table">
                  <thead>
                    <tr>
                      <th>Semester Name</th>
                      <th>Semester No.</th>
                      <th>Department</th>
                      <th>Course</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSemesters.map((sem) => {
                      const id = sem.semesterId ?? sem.id
                      const branch = branchMap.get(String(sem.branchId ?? sem.BranchId))
                      const course = courseMap.get(String(sem.courseId ?? sem.CourseId ?? branch?.courseId))
                      const deptName = deptMap.get(String(course?.departmentId ?? course?.DepartmentId ?? branch?.departmentId)) || '—'
                      const isActive = sem.status === 1 || sem.status === 'Active'
                      const isCompleted = sem.status === 2 || sem.status === 'Completed'

                      return (
                        <tr key={id}>
                          <td data-label="Semester Name">
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {sem.semesterName ?? sem.name ?? `Semester ${sem.semesterNumber}`}
                            </span>
                          </td>
                          <td data-label="Semester No.">
                            <span className="as-badge-code">Sem {sem.semesterNumber}</span>
                          </td>
                          <td data-label="Department">
                            <span style={{ fontWeight: 500, color: '#334155' }}>{deptName}</span>
                          </td>
                          <td data-label="Course">
                            <span style={{ color: '#475569', fontSize: '0.8125rem' }}>{course?.courseName ?? course?.name ?? '—'}</span>
                          </td>
                          <td data-label="Branch">
                            <span style={{ color: '#475569', fontSize: '0.8125rem' }}>{branch?.branchName ?? branch?.name ?? '—'}</span>
                          </td>
                          <td data-label="Status">
                            <StatusBadge
                              status={isActive ? 'Active' : isCompleted ? 'Completed' : 'Upcoming'}
                              tone={isActive ? 'active' : isCompleted ? 'processed' : 'warning'}
                            />
                          </td>
                          <td data-label="Actions">
                            <div className="as-actions-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--edit"
                                title="Edit Semester"
                                onClick={() => openEditModal('semester', sem)}
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                type="button"
                                className="as-action-btn as-action-btn--delete"
                                title="Delete Semester"
                                onClick={() => setDeleteConfirm({ type: 'semester', item: sem })}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            MODAL: ADD / EDIT DEPARTMENT
            ======================================================== */}
        {modalType === 'department' && (
          <div className="as-modal-backdrop" onClick={closeModal}>
            <div className="as-modal as-modal--enhanced" role="dialog" aria-modal="true" aria-labelledby="department-modal-title" onClick={(e) => e.stopPropagation()}>
              <div className="as-modal__header as-modal__header--enhanced">
                <div className="as-modal-heading">
                  <span className="as-modal-eyebrow"><FiLayers aria-hidden="true" /> Academic structure</span>
                  <h3 id="department-modal-title">{editingItem ? 'Edit Department' : 'Add Department'}</h3>
                  <p>Create an academic unit and set its directory status.</p>
                </div>
                <button type="button" className="as-modal__close" onClick={closeModal} aria-label="Close department dialog">
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleSubmitDepartment}>
                <div className="as-modal__body as-modal__body--enhanced">
                  <section className="as-modal-section" aria-labelledby="department-profile-heading">
                    <div className="as-modal-section__heading"><span>01</span><div><h4 id="department-profile-heading">Department profile</h4><p>Use a clear name and short code for campus records.</p></div></div>
                  <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="dept-name">
                        Department Name <span className="required">*</span>
                      </label>
                      <input
                        id="dept-name"
                        type="text"
                        className={`as-form-control ${formErrors.name ? 'is-invalid' : ''}`}
                        placeholder="e.g. Computer Science and Engineering"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        required
                      />
                      {formErrors.name && <span className="as-form-error">{formErrors.name}</span>}
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="dept-code">
                        Department Code <span className="required">*</span>
                      </label>
                      <input
                        id="dept-code"
                        type="text"
                        className={`as-form-control ${formErrors.code ? 'is-invalid' : ''}`}
                        placeholder="e.g. CSE"
                        value={deptForm.code}
                        onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                        required
                      />
                      {formErrors.code && <span className="as-form-error">{formErrors.code}</span>}
                    </div>
                  </div>

                  <div className="as-form-group">
                    <label htmlFor="dept-desc">Description</label>
                    <textarea
                      id="dept-desc"
                      className="as-form-control"
                      rows={3}
                      placeholder="Enter a brief overview of the department..."
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    />
                  </div>
                  </section>

                  <section className="as-modal-section" aria-labelledby="department-status-heading">
                    <div className="as-modal-section__heading"><span>02</span><div><h4 id="department-status-heading">Availability</h4><p>Set whether this department is currently active.</p></div></div>
                    <div className="as-form-group">
                    <label htmlFor="dept-status">Status</label>
                    <select
                      id="dept-status"
                      className="as-form-control"
                      value={deptForm.status}
                      onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    </div>
                  </section>
                </div>
                <div className="as-modal__footer">
                  <button type="button" className="as-btn as-btn--outline" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="as-btn as-btn--primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingItem ? 'Update Department' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: ADD / EDIT COURSE
            ======================================================== */}
        {modalType === 'course' && (
          <div className="as-modal-backdrop" onClick={closeModal}>
            <div className="as-modal as-modal--enhanced" role="dialog" aria-modal="true" aria-labelledby="course-modal-title" onClick={(e) => e.stopPropagation()}>
              <div className="as-modal__header as-modal__header--enhanced">
                <div className="as-modal-heading">
                  <span className="as-modal-eyebrow"><FiBookOpen aria-hidden="true" /> Academic structure</span>
                  <h3 id="course-modal-title">{editingItem ? 'Edit Course' : 'Add Course'}</h3>
                  <p>Define the program identity, duration, and semester structure.</p>
                </div>
                <button type="button" className="as-modal__close" onClick={closeModal} aria-label="Close course dialog">
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleSubmitCourse}>
                <div className="as-modal__body as-modal__body--enhanced">
                  <section className="as-modal-section" aria-labelledby="course-profile-heading">
                    <div className="as-modal-section__heading"><span>01</span><div><h4 id="course-profile-heading">Program identity</h4><p>Enter the course name and its official code.</p></div></div>
                  <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="course-name">
                        Course Name <span className="required">*</span>
                      </label>
                      <input
                        id="course-name"
                        type="text"
                        className={`as-form-control ${formErrors.name ? 'is-invalid' : ''}`}
                        placeholder="e.g. Bachelor of Technology"
                        value={courseForm.name}
                        onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                        required
                      />
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
                        value={courseForm.code}
                        onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                        required
                      />
                      {formErrors.code && <span className="as-form-error">{formErrors.code}</span>}
                    </div>
                  </div>
                  </section>

                  <section className="as-modal-section" aria-labelledby="course-structure-heading">
                    <div className="as-modal-section__heading"><span>02</span><div><h4 id="course-structure-heading">Program structure</h4><p>Set the course level, duration, and availability.</p></div></div>
                  <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="course-type">Course Type</label>
                      <select
                        id="course-type"
                        className="as-form-control"
                        value={courseForm.type}
                        onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
                      >
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
                        value={courseForm.durationYears}
                        onChange={(e) => {
                          const years = Number(e.target.value)
                          setCourseForm({
                            ...courseForm,
                            durationYears: years,
                            totalSemesters: years * 2,
                          })
                        }}
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
                        value={courseForm.totalSemesters}
                        onChange={(e) => setCourseForm({ ...courseForm, totalSemesters: Number(e.target.value) })}
                      />
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="course-status">Status</label>
                      <select
                        id="course-status"
                        className="as-form-control"
                        value={courseForm.status}
                        onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  </section>
                </div>
                <div className="as-modal__footer">
                  <button type="button" className="as-btn as-btn--outline" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="as-btn as-btn--primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingItem ? 'Update Course' : 'Create Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: ADD / EDIT BRANCH
            ======================================================== */}
        {modalType === 'branch' && (
          <div className="as-modal-backdrop" onClick={closeModal}>
            <div className="as-modal as-modal--branch" role="dialog" aria-modal="true" aria-labelledby="branch-modal-title" onClick={(e) => e.stopPropagation()}>
              <div className="as-modal__header as-modal__header--branch">
                <div className="as-branch-modal-heading">
                  <span className="as-branch-modal-eyebrow"><FiGitBranch aria-hidden="true" /> Academic structure</span>
                  <h3 id="branch-modal-title">{editingItem ? 'Edit Branch' : 'Add Branch'}</h3>
                  <p>Connect this branch to an existing course, then add its name and capacity.</p>
                </div>
                <button type="button" className="as-modal__close" onClick={closeModal} aria-label="Close branch dialog">
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleSubmitBranch}>
                <div className="as-modal__body as-modal__body--branch">
                  <section className="as-branch-form-section" aria-labelledby="branch-academic-heading">
                    <div className="as-branch-section-heading">
                      <span>01</span>
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
                          setBranchForm((current) => ({ ...current, courseId: e.target.value }))
                          setFormErrors((current) => ({ ...current, courseId: '' }))
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
                          setBranchForm((current) => ({ ...current, departmentId: e.target.value }))
                          setFormErrors((current) => ({ ...current, departmentId: '' }))
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

                  <section className="as-branch-form-section" aria-labelledby="branch-details-heading">
                    <div className="as-branch-section-heading">
                      <span>02</span>
                      <div><h4 id="branch-details-heading">Branch details</h4><p>Set the branch identity and admission capacity.</p></div>
                    </div>
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
                </div>
                <div className="as-modal__footer">
                  <button type="button" className="as-btn as-btn--outline" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="as-btn as-btn--primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingItem ? 'Update Branch' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: ADD / EDIT SEMESTER
            ======================================================== */}
        {modalType === 'semester' && (
          <div className="as-modal-backdrop" onClick={closeModal}>
            <div className="as-modal as-modal--enhanced as-modal--semester" role="dialog" aria-modal="true" aria-labelledby="semester-modal-title" onClick={(e) => e.stopPropagation()}>
              <div className="as-modal__header as-modal__header--enhanced">
                <div className="as-modal-heading">
                  <span className="as-modal-eyebrow"><FiCalendar aria-hidden="true" /> Academic structure</span>
                  <h3 id="semester-modal-title">{editingItem ? 'Edit Semester' : 'Add Semester'}</h3>
                  <p>Choose a course, confirm its department, then select a branch.</p>
                </div>
                <button type="button" className="as-modal__close" onClick={closeModal} aria-label="Close semester dialog">
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleSubmitSemester}>
                <div className="as-modal__body as-modal__body--enhanced">
                  <section className="as-modal-section" aria-labelledby="semester-mapping-heading">
                    <div className="as-modal-section__heading"><span>01</span><div><h4 id="semester-mapping-heading">Academic mapping</h4><p>Follow the course → department → branch sequence.</p></div></div>
                    <div className="as-semester-flow">
                      <div className="as-form-group">
                        <label htmlFor="sem-course">Select Course <span className="required">*</span></label>
                        <select
                          id="sem-course"
                          className={`as-form-control ${formErrors.courseId ? 'is-invalid' : ''}`}
                          value={semesterForm.courseId}
                          onChange={(e) => {
                            const course = courses.find((item) => String(courseIdOf(item)) === e.target.value)
                            const mappedDepartmentId = courseDepartmentIdOf(course)
                            setSemesterForm((current) => ({
                              ...current,
                              courseId: e.target.value,
                              departmentId: mappedDepartmentId == null ? '' : String(mappedDepartmentId),
                              branchId: '',
                            }))
                            setFormErrors((current) => ({ ...current, courseId: '', departmentId: '', branchId: '' }))
                          }}
                          required
                        >
                          <option value="">-- Choose Course --</option>
                          {courses.filter((course) => courseIdOf(course) != null).map((course) => {
                            const id = String(courseIdOf(course))
                            const name = courseNameOf(course) || `Course ${id}`
                            const code = courseCodeOf(course)
                            return <option key={id} value={id}>{name}{code ? ` (${code})` : ''}</option>
                          })}
                        </select>
                        {formErrors.courseId && <span className="as-form-error">{formErrors.courseId}</span>}
                        <span className="as-form-hint">Choose the course first. Its department will be filled in when it is configured.</span>
                      </div>

                      <div className="as-form-group">
                        <label htmlFor="sem-dept">Select Department <span className="required">*</span></label>
                        <select
                          id="sem-dept"
                          className={`as-form-control ${formErrors.departmentId ? 'is-invalid' : ''}`}
                          value={semesterForm.departmentId}
                          onChange={(e) => {
                            setSemesterForm((current) => ({ ...current, departmentId: e.target.value, branchId: '' }))
                            setFormErrors((current) => ({ ...current, departmentId: '', branchId: '' }))
                          }}
                          disabled={!semesterForm.courseId || semesterCourseHasDepartment}
                          required
                        >
                          <option value="">{semesterForm.courseId ? '-- Choose Department --' : 'Choose a course first'}</option>
                          {semesterCourseHasDepartment && !departments.some((department) => String(departmentIdOf(department)) === String(selectedSemesterCourseDepartmentId)) && (
                            <option value={String(selectedSemesterCourseDepartmentId)}>Department {selectedSemesterCourseDepartmentId}</option>
                          )}
                          {departments.map((department) => {
                            const id = String(departmentIdOf(department))
                            const name = department.departmentName ?? department.DepartmentName ?? department.name ?? department.Name ?? `Department ${id}`
                            return <option key={id} value={id}>{name}</option>
                          })}
                        </select>
                        {formErrors.departmentId && <span className="as-form-error">{formErrors.departmentId}</span>}
                        <span className="as-form-hint">
                          {!semesterForm.courseId
                            ? 'Select a course to continue.'
                            : semesterCourseHasDepartment
                              ? 'Department linked to the selected course.'
                              : 'Choose the department associated with this course.'}
                        </span>
                      </div>

                      <div className="as-form-group">
                        <label htmlFor="sem-branch">Select Branch <span className="required">*</span></label>
                        <select
                          id="sem-branch"
                          className={`as-form-control ${formErrors.branchId ? 'is-invalid' : ''}`}
                          value={semesterForm.branchId}
                          onChange={(e) => {
                            setSemesterForm((current) => ({ ...current, branchId: e.target.value }))
                            setFormErrors((current) => ({ ...current, branchId: '' }))
                          }}
                          disabled={!semesterForm.courseId || !semesterForm.departmentId}
                          required
                        >
                          <option value="">{!semesterForm.courseId ? 'Choose a course first' : !semesterForm.departmentId ? 'Choose a department first' : '-- Choose Branch --'}</option>
                          {branches.filter((branch) => String(branchCourseIdOf(branch)) === String(semesterForm.courseId) && branchIdOf(branch) != null).map((branch) => {
                            const id = String(branchIdOf(branch))
                            const name = branch.branchName ?? branch.BranchName ?? branch.name ?? branch.Name ?? `Branch ${id}`
                            const code = branch.branchCode ?? branch.BranchCode ?? branch.code ?? branch.Code
                            return <option key={id} value={id}>{name}{code ? ` (${code})` : ''}</option>
                          })}
                        </select>
                        {formErrors.branchId && <span className="as-form-error">{formErrors.branchId}</span>}
                        {semesterForm.courseId && semesterForm.departmentId && !branches.some((branch) => String(branchCourseIdOf(branch)) === String(semesterForm.courseId)) && <span className="as-form-hint">No branches are configured for this course yet.</span>}
                      </div>
                    </div>
                  </section>

                  <section className="as-modal-section" aria-labelledby="semester-term-heading">
                    <div className="as-modal-section__heading"><span>02</span><div><h4 id="semester-term-heading">Term details</h4><p>Name the term and select its academic year.</p></div></div>
                    <div className="as-semester-term-grid">
                    <div className="as-form-group">
                      <label htmlFor="sem-num">
                        Semester Number (1 to 8) <span className="required">*</span>
                      </label>
                      <select
                        id="sem-num"
                        className={`as-form-control ${formErrors.semesterNumber ? 'is-invalid' : ''}`}
                        value={semesterForm.semesterNumber}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
                          setSemesterForm({
                            ...semesterForm,
                            semesterNumber: n,
                            semesterName: `${ordinals[n - 1] || `${n}th`} Semester`,
                          })
                        }}
                        required
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
                      </select>
                      {formErrors.semesterNumber && <span className="as-form-error">{formErrors.semesterNumber}</span>}
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="sem-name">Semester Name</label>
                      <input
                        id="sem-name"
                        type="text"
                        className="as-form-control"
                        placeholder="e.g. 1st Semester"
                        value={semesterForm.semesterName}
                        onChange={(e) => setSemesterForm({ ...semesterForm, semesterName: e.target.value })}
                      />
                    </div>

                    <div className="as-form-group">
                      <label htmlFor="sem-year">Academic Year</label>
                      <select
                        id="sem-year"
                        className="as-form-control"
                        value={semesterForm.academicYearId}
                        onChange={(e) => setSemesterForm({ ...semesterForm, academicYearId: e.target.value })}
                      >
                        <option value="">Current Academic Year</option>
                        {academicYears.map((y) => {
                          const id = String(y.academicYearId ?? y.id)
                          return (
                            <option key={id} value={id}>
                              {y.academicYearName ?? y.name}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    </div>
                  </section>

                  <section className="as-modal-section" aria-labelledby="semester-dates-heading">
                    <div className="as-modal-section__heading"><span>03</span><div><h4 id="semester-dates-heading">Schedule</h4><p>Set the planned start and end dates.</p></div></div>
                  <div className="as-form-row">
                    <div className="as-form-group">
                      <label htmlFor="sem-start">Start Date</label>
                      <input
                        id="sem-start"
                        type="date"
                        className="as-form-control"
                        value={semesterForm.startDate}
                        onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })}
                      />
                    </div>
                    <div className="as-form-group">
                      <label htmlFor="sem-end">End Date</label>
                      <input
                        id="sem-end"
                        type="date"
                        className={`as-form-control ${formErrors.endDate ? 'is-invalid' : ''}`}
                        value={semesterForm.endDate}
                        onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })}
                      />
                      {formErrors.endDate && <span className="as-form-error">{formErrors.endDate}</span>}
                    </div>
                  </div>
                  </section>

                  <section className="as-modal-section" aria-labelledby="semester-status-heading">
                    <div className="as-modal-section__heading"><span>04</span><div><h4 id="semester-status-heading">Availability</h4><p>Control the current semester workflow status.</p></div></div>
                    <div className="as-form-row">
                      <div className="as-form-group">
                        <label htmlFor="sem-status">Semester Status</label>
                        <select
                          id="sem-status"
                          className="as-form-control"
                          value={semesterForm.status}
                          onChange={(e) => setSemesterForm({ ...semesterForm, status: e.target.value })}
                        >
                          <option value="Upcoming">Upcoming</option>
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
                <div className="as-modal__footer">
                  <button type="button" className="as-btn as-btn--outline" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="as-btn as-btn--primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingItem ? 'Update Semester' : 'Save Semester'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL: DELETE CONFIRMATION
            ======================================================== */}
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
