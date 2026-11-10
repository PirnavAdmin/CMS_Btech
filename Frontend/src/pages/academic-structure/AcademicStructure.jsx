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
      setGenerationCourseId(courseIdOf(preferredCourse))                        }}
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
                      {branchForm.courseId && branchForm.departmentId && (() => {
                        const selectedCourse = courses.find((course) => String(courseIdOf(course)) === String(branchForm.courseId))
                        const mappedDepartmentId = courseDepartmentIdOf(selectedCourse)
                        return mappedDepartmentId != null && String(mappedDepartmentId) !== String(branchForm.departmentId)
                          ? <span className="as-form-hint">The selected course is linked to a different department. Choose its matching department or select another course.</span>
                          : null
                      })()}
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
