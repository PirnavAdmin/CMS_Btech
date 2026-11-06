import PageHeader from '../../components/PageHeader'
import TablePagination from '../../components/TablePagination'
import ViewDialog from '../../components/ViewDialog'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { ProjectSelect } from '../../components/SearchableSelect'
import { collegeStorageKey } from '../../utils/collegeScope.js'
import useCollegeState from '../../hooks/useCollegeState'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import ExportMenu from '../../components/ExportMenu'
import CompactSummary from '../../components/CompactSummary'
import { useAcademic } from '../../context/AcademicContext'
import { creditManagementApi, studentApi } from '../../api/apiEndpoints'
import subjectService from '../../services/subjectService'
import academicService from '../../services/academicService'
import { enrichSubject } from '../../utils/subjectDirectory'
import './CreditsManagement.css'
import { FiAlertCircle, FiAlertTriangle, FiCheck, FiCheckCircle } from 'react-icons/fi'

const SUBJECT_TYPES = [
  'Core',
  'Elective',
  'Lab',
  'Project',
  'Mandatory',
]

const REGULATIONS = ['R20', 'R22', 'R24']

const SUBJECT_STATUSES = ['Active', 'Inactive']

const GRADE_OPTIONS = [
  { grade: 'O', point: 10 },
  { grade: 'A+', point: 9 },
  { grade: 'A', point: 8 },
  { grade: 'B+', point: 7 },
  { grade: 'B', point: 6 },
  { grade: 'C', point: 5 },
  { grade: 'P', point: 4 },
  { grade: 'F', point: 0 },
]



const DEFAULT_FRAMEWORK = {
  totalProgramCredits: 160,
  minSemesterCredits: 18,
  maxSemesterCredits: 26,
  passingGradePoint: 4,
  requiredCoreCredits: 100,
  requiredElectiveCredits: 18,
  requiredProjectCredits: 15,
  requiredMandatoryCredits: 12,
}

function normalizeAcademicYear(value) {
  return String(value || '').replace(/[--]/g, '-').trim()
}

function getStudentYear(semester) {
  const number = Number(semester.replace(/\D/g, ''))

  if ([1, 2].includes(number)) return '1st Year'
  if ([3, 4].includes(number)) return '2nd Year'
  if ([5, 6].includes(number)) return '3rd Year'
  if ([7, 8].includes(number)) return '4th Year'

  return ''
}

function getSemesterNumber(semester) {
  const configured = Number(semester.semesterNumber ?? semester.semesterNo)
  if (Number.isInteger(configured) && configured > 0) return configured
  return Number(String(semester.semesterName || semester.name || '').match(/semester\s*(\d+)/i)?.[1] || 0)
}

function createId(prefix) {
  return `${prefix}-${Date.now()}`
}

const FALLBACK_ACADEMIC_YEAR = ''

function emptyFilters(academicYear = FALLBACK_ACADEMIC_YEAR) {
  return {
    batch: 'All Batches',
    academicYear,
    semester: 'All Semesters',
    branch: 'All Branches',
    year: 'All Years',
    course: 'All Courses',
  }
}

function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="cm-stat-card">
      <div className="cm-stat-top">
        <span className="cm-stat-icon">{icon}</span>
        <span className="cm-stat-title">{title}</span>
      </div>

      <div className="cm-stat-value">{value}</div>

      {subtitle && (
        <div className="cm-stat-subtitle">{subtitle}</div>
      )}
    </div>
  )
}

function EmptyState({ title, message }) {
  return (
    <div className="cm-empty">
      <div className="cm-empty-icon">⌁</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}

function CreditsManagement() {
  const { activeAcademicYears = [], currentAcademicYear, selectedAcademicYear, selectedCollegeId, selectedAcademicYearId, scopeRecords } = useAcademic()
  const { canAction } = useScreenAccess()
  const canEdit = canAction('/credits-management','edit'), canCreate = canAction('/credits-management','create')
  const [creditSaving, setCreditSaving] = useState(false)
  const [creditLoadError,setCreditLoadError] = useState('')
  const creditRequest = useRef(0)
  const workingScope = useRef('')
  const scopeKey = String(selectedCollegeId)+':'+String(selectedAcademicYearId)
  workingScope.current = scopeKey
  const [activeTab, setActiveTab] = useState('subjects')
  const [registrationPage, setRegistrationPage] = useState(1)
  const [registrationStatus, setRegistrationStatus] = useState('')
  const registrationLock = useRef(false), registrationProgress = useRef({})
  const [dropTarget,setDropTarget] = useState(null)
  const [viewRegistration,setViewRegistration] = useState(null)
  const configProgress = useRef({})

  const activeAcademicYear =
    normalizeAcademicYear(
      selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || activeAcademicYears[0]?.academicYearName ||
        activeAcademicYears[0]?.name ||
        currentAcademicYear?.academicYearName ||
        currentAcademicYear?.name ||
        FALLBACK_ACADEMIC_YEAR
    )

  const [students, setStudents] = useCollegeState([])

  const [subjects, setSubjects] = useCollegeState([])

  const [credits, setCredits] = useCollegeState([], { students, subjects })

  const [framework] = useState(() =>
    Object.fromEntries(Object.keys(DEFAULT_FRAMEWORK).map(key => [key, '']))
  )

  const [auditLogs, setAuditLogs] = useCollegeState([])
  const [creditLoading, setCreditLoading] = useState(true)
  const [masterCourses, setMasterCourses] = useCollegeState([])
  const [masterBranches, setMasterBranches] = useCollegeState([])
  const [masterSemesters, setMasterSemesters] = useCollegeState([])
  const [masterYears, setMasterYears] = useState([])
  const [masterDepartments, setMasterDepartments] = useCollegeState([])
  const values = (rows, keys) => [...new Set(rows.map(row => keys.map(key => row[key]).find(value => value != null && value !== '')).filter(Boolean))]
  const ACADEMIC_YEARS = values(masterYears,['academicYearName','name'])
  const SEMESTERS = values(masterSemesters,['semesterName','name'])
  const BRANCHES = values(masterBranches,['branchName','name'])
  const COURSES = values(masterCourses,['courseName','name'])
  const [subjectFilters, setSubjectFilters] = useState({ academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '' })
  const [subjectApiError, setSubjectApiError] = useState('')
  const [creditDashboard, setCreditDashboard] = useState(null)
  const [creditSummary, setCreditSummary] = useState(null)
  const [creditSummaryError,setCreditSummaryError] = useState('')
  const [summaryAttempt,setSummaryAttempt] = useState(0)

  const [dashboardFilters, setDashboardFilters] = useState(emptyFilters())
  const [studentFilters, setStudentFilters] = useState(emptyFilters())

  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const [subjectSearch, setSubjectSearch] = useState('')

  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showFrameworkModal, setShowFrameworkModal] = useState(false)

  const [editingCreditId, setEditingCreditId] = useState(null)
  const [editingSubjectId, setEditingSubjectId] = useState(null)

  const [creditForm, setCreditForm] = useState({
    studentId: '',
    subjectId: '',
    grade: '',
      registrationStatus: 'REGISTERED',
    attempt: 1,
  })

  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    shortName: '',
    branch: '',
    course: '',
    regulation: '',
    semester: '',
    academicYear: activeAcademicYear,
    type: 'Core',
    category: 'PCC',
    lectureHours: 3,
    tutorialHours: 1,
    practicalHours: 0,
    credits: 4,
    internalMarks: 40,
    externalMarks: 60,
    totalMarks: 100,
    status: 'Active',
  })

  const [frameworkForm, setFrameworkForm] = useState(framework)

  const [validationResults, setValidationResults] = useState([])

  const [notice, setNotice] = useState({
    type: '',
    message: '',
  })

  const [showReportMenu, setShowReportMenu] = useState(false)
  const [showDashboardFilterMenu, setShowDashboardFilterMenu] = useState(false)
  const [showStudentFilterMenu, setShowStudentFilterMenu] = useState(false)
  const [dashboardFilterDraft, setDashboardFilterDraft] = useState(emptyFilters())
  const [studentFilterDraft, setStudentFilterDraft] = useState(emptyFilters())
  const reportMenuRef = useRef(null)
  const dashboardFilterMenuRef = useRef(null)
  const studentFilterMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        reportMenuRef.current &&
        !reportMenuRef.current.contains(event.target)
      ) {
        setShowReportMenu(false)
      }

      if (
        dashboardFilterMenuRef.current &&
        !dashboardFilterMenuRef.current.contains(event.target)
      ) {
        setShowDashboardFilterMenu(false)
      }

      if (
        studentFilterMenuRef.current &&
        !studentFilterMenuRef.current.contains(event.target)
      ) {
        setShowStudentFilterMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const reloadCreditData = async ({ propagate = false } = {}) => {
    if(workingScope.current !== scopeKey)return
    const requestVersion = ++creditRequest.current
    setCreditLoading(true);setCreditLoadError('')
    let subjectLoadError = ''
    let subjectRowsPromise = Promise.resolve([])
    try {
      subjectRowsPromise = subjectService.getSubjects({ liveOnly: true })
        .then(rows => { if(requestVersion===creditRequest.current && workingScope.current===scopeKey)setSubjectApiError(''); return rows })
        .catch(error => { subjectLoadError = error.message || 'Unable to load subjects from the Subject API.'; if(requestVersion===creditRequest.current && workingScope.current===scopeKey)setSubjectApiError(subjectLoadError); return [] })
      const [studentRows, subjectRows, registrationRows, courseRows, branchRows, semesterRows, yearRows, departmentRows, dashboard, configurations] = await Promise.all([
        studentApi.getAll(), subjectRowsPromise,
        creditManagementApi.getRegistrations({ status: 1, academicYearId: selectedAcademicYearId || undefined }), academicService.getCourses(), academicService.getBranches(), academicService.getSemesters(),
        academicService.getAcademicYears(), academicService.getDepartments(), creditManagementApi.getDashboard({academicYearId:selectedAcademicYearId || undefined}).catch(() => null), creditManagementApi.getConfigurations(),
      ])
      if (requestVersion !== creditRequest.current || workingScope.current !== scopeKey) return
      const courseList = Array.isArray(courseRows) ? courseRows : []
      const branchList = Array.isArray(branchRows) ? branchRows : []
      const semesterList = Array.isArray(semesterRows) ? semesterRows : []
      const yearList = Array.isArray(yearRows) ? yearRows : []
      const departmentList = Array.isArray(departmentRows) ? departmentRows : []
      const studentsLive = (studentRows || []).map(row => {
        const academic = row.academic || row.academicInformation || {}
        const personal = row.personal || {}
        const courseId = row.courseId ?? academic.courseId
        const branchId = row.branchId ?? academic.branchId
        const semesterId = row.semesterId ?? academic.semesterId
        const yearId = row.academicYearId ?? academic.academicYearId
        return { ...row, id: String(row.studentId ?? row.id), name: row.fullName || row.studentName || personal.fullName || row.name || '', rollNo: row.studentCode || row.rollNumber || academic.rollNumber || '', courseId, branchId, semesterId, academicYearId: yearId, course: row.courseName || academic.courseName || academic.course || courseList.find(item => String(item.courseId ?? item.id) === String(courseId))?.courseName || '', branch: row.branchName || academic.branchName || academic.branch || branchList.find(item => String(item.branchId ?? item.id) === String(branchId))?.branchName || '', semester: row.semesterName || academic.semesterName || semesterList.find(item => String(item.semesterId ?? item.id) === String(semesterId))?.semesterName || '', academicYear: row.academicYearName || academic.academicYearName || activeAcademicYear, status: row.status ?? 'Active' }
      }).filter(row => row.id && row.id !== 'undefined')
      const subjectById = new Map((subjectRows || []).map(row => [String(row.subjectId ?? row.id), row]))
      const subjectsLive = [...subjectById.entries()].map(([id, row]) => {
        const config = (configurations || []).find(item => String(item.subjectId) === id && ['courseId','branchId','semesterId'].every(key => String(item[key]) === String(row[key])))
        const subjectStatus = row.status
        const isActive = subjectStatus === undefined || subjectStatus === null || subjectStatus === true || Number(subjectStatus) === 1 || String(subjectStatus).toLowerCase() === 'active'
        const enriched = enrichSubject(row, { courses: courseList, branches: branchList, semesters: semesterList, years: yearList, departments: departmentList })
        return { ...enriched, id, subjectId: id, minimumCredits: config?.minimumCredits ?? 0, maximumCredits: config?.maximumCredits ?? null, configurationId: config?.creditConfigurationId ?? config?.configurationId ?? config?.id, code: row.subjectCode || row.code || '', name: row.subjectName || row.name || '', configurationActive: config ? Number(config.status) === 1 || config.status === true || String(config.status).toLowerCase() === 'active' : false, credits: config?.credits ?? row.credits ?? null, type: row.subjectType || row.type || '', status: isActive ? 'Active' : 'Inactive', shortName: row.shortName || '' }
      })
      const creditsLive = (registrationRows || []).map(row => {
        const subject = subjectById.get(String(row.subjectId)) || {}
        const student = studentsLive.find(item => String(item.id) === String(row.studentId)) || {}
        const registrationStatus = String(row.registrationStatus || '').toUpperCase()
        return { ...row, id: String(row.studentCreditRegistrationId ?? row.id), studentId: String(row.studentId), subjectId: String(row.subjectId), subjectCode: row.subjectCode || subject.subjectCode || subject.code || '', subjectName: row.subjectName || subject.subjectName || subject.name || '', credits: row.registeredCredits == null ? null : Number(row.registeredCredits), semesterId: row.semesterId, semester: row.semesterName || semesterList.find(item => String(item.semesterId ?? item.id) === String(row.semesterId))?.semesterName || '', academicYearId: row.academicYearId, academicYear: row.academicYearName || activeAcademicYear, grade: row.grade || '', gradePoint: row.gradePoints == null ? null : Number(row.gradePoints), status: registrationStatus === 'COMPLETED' ? 'Completed' : registrationStatus === 'FAILED' ? 'Failed' : registrationStatus === 'DROPPED' ? 'Dropped' : registrationStatus === 'REGISTERED' ? 'Registered' : 'Not provided', type: subject.subjectType || subject.type || 'Core', attempt: row.attempt == null ? null : Number(row.attempt), studentName: row.studentName || student.name }
      }).filter(row => row.id && row.id !== 'undefined')
      setStudents(scopeRecords(studentsLive).filter(row=>!selectedAcademicYearId || String(row.academicYearId)===String(selectedAcademicYearId))); setSubjects(scopeRecords(subjectsLive)); setCredits(creditsLive)
      setMasterCourses(courseList); setMasterBranches(branchList); setMasterSemesters(semesterList); setMasterYears(yearList); setMasterDepartments(departmentList)
      setCreditDashboard(dashboard)
      if (propagate && subjectLoadError) throw new Error(subjectLoadError)
    } catch (error) {
      // The subject table already shows its own retry state; don't repeat the same
      // backend failure in the page-level alert when that request also failed.
      await subjectRowsPromise
      if (requestVersion !== creditRequest.current || workingScope.current!==scopeKey) return
      setCreditLoadError(error.message || 'Unable to load credit data.');setCredits([]);setSubjects([])
      if (!subjectLoadError || activeTab !== 'subjects') showNotice('error', error.message || 'Unable to load credit management data from the API.')
      if (propagate) throw error
    }
    finally { if (requestVersion === creditRequest.current) setCreditLoading(false) }
  }
  const invalidateCreditRequests=useCallback(()=>{creditRequest.current++},[])
  useEffect(() => { setShowSubjectModal(false); setShowCreditModal(false); setViewRegistration(null); setDropTarget(null); setSelectedStudentId(''); reloadCreditData(); return invalidateCreditRequests }, [selectedCollegeId, selectedAcademicYearId,invalidateCreditRequests])
  useEffect(() => {
    let current=true
    setCreditSummary(null);setCreditSummaryError('')
    if(selectedStudentId) creditManagementApi.getSummary({studentId:Number(selectedStudentId),academicYearId:selectedAcademicYearId || undefined}).then(value=>{if(current)setCreditSummary(value)}).catch(error=>{if(current)setCreditSummaryError(error.message || 'Credit summary unavailable.')})
    return ()=>{current=false}
  }, [selectedStudentId, selectedAcademicYearId, selectedCollegeId, summaryAttempt])

  useEffect(() => {
    if (!notice.message) return

    const timer = setTimeout(() => {
      setNotice({
        type: '',
        message: '',
      })
    }, 3500)

    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    setDashboardFilters((previous) => ({
      ...previous,
      academicYear: activeAcademicYear,
    }))
    setDashboardFilterDraft((previous) => ({
      ...previous,
      academicYear: activeAcademicYear,
    }))
    setStudentFilters((previous) => ({
      ...previous,
      academicYear: activeAcademicYear,
    }))
    setStudentFilterDraft((previous) => ({
      ...previous,
      academicYear: activeAcademicYear,
    }))
  }, [activeAcademicYear])

  const addAudit = (action, description) => {
    const entry = {
      id: createId('AUD'),
      action,
      description,
      user: 'Admin',
      date: new Date().toISOString(),
    }

    setAuditLogs((previous) => [entry, ...previous])
  }

  function showNotice(type, message) {
    setNotice({ type, message })
  }

  const dashboardFilteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchBatch =
        dashboardFilters.batch === 'All Batches' ||
        student.batch === dashboardFilters.batch

      const matchAcademicYear =
        dashboardFilters.academicYear === 'All Academic Years' ||
        normalizeAcademicYear(student.academicYear) ===
          normalizeAcademicYear(dashboardFilters.academicYear)

      const matchSemester =
        dashboardFilters.semester === 'All Semesters' ||
        student.semester === dashboardFilters.semester

      const matchBranch =
        dashboardFilters.branch === 'All Branches' ||
        student.branch === dashboardFilters.branch

      const matchYear =
        dashboardFilters.year === 'All Years' ||
        student.year === dashboardFilters.year

      const matchCourse =
        dashboardFilters.course === 'All Courses' ||
        student.course === dashboardFilters.course

      return (
        matchBatch &&
        matchAcademicYear &&
        matchSemester &&
        matchBranch &&
        matchYear &&
        matchCourse
      )
    })
  }, [students, dashboardFilters])

  const dashboardStudentIds = useMemo(
    () => new Set(dashboardFilteredStudents.map((student) => student.id)),
    [dashboardFilteredStudents]
  )

  const dashboardFilteredCredits = useMemo(() => {
    return credits.filter((credit) => dashboardStudentIds.has(credit.studentId))
  }, [credits, dashboardStudentIds])

  const selectedStudentCredits = useMemo(() => {
    if (!selectedStudentId) return []

    return credits.filter(
      (credit) => credit.studentId === selectedStudentId
    )
  }, [credits, selectedStudentId])

  const subjectContexts = useMemo(() => subjects.map(subject => enrichSubject(subject, {
    courses: masterCourses, branches: masterBranches, semesters: masterSemesters,
    years: masterYears, departments: masterDepartments,
  })), [subjects, masterCourses, masterBranches, masterSemesters, masterYears, masterDepartments])
  const contextSubjects = useMemo(() => subjectContexts.filter(subject =>
    Object.entries(subjectFilters).every(([key, value]) => {
      if (!value) return true
      if (key === 'semesterId' && value.startsWith('semester:')) {
        const semester = masterSemesters.find(row => String(row.semesterId ?? row.id) === String(subject.semesterId))
        return getSemesterNumber(semester || subject) === Number(value.slice(9))
      }
      return String(subject[key] ?? '') === String(value)
    })
  ), [subjectContexts, subjectFilters, masterSemesters])
  const subjectFiltersReady = Boolean(subjectFilters.academicYearId && subjectFilters.courseId && subjectFilters.branchId && subjectFilters.semesterId)
  const filteredSubjects = useMemo(() => {
    if (!subjectFiltersReady) return []
    const query = subjectSearch.trim().toLowerCase()
    return contextSubjects.filter(subject => !query || `${subject.subjectCode || ''} ${subject.subjectName || ''}`.toLowerCase().includes(query))
  }, [contextSubjects, subjectSearch, subjectFiltersReady])
  const subjectCreditExportColumns = [
    { label: 'Subject Code', value: subject => subject.subjectCode || subject.code || '' },
    { label: 'Subject Name', value: subject => subject.subjectName || subject.name || '' },
    { label: 'Academic Year', value: subject => subject.academicYearName || '' },
    { label: 'Course', value: subject => subject.course || '' },
    { label: 'Branch', value: subject => subject.branchName || '' },
    { label: 'Academic Level', value: subject => subject.level || '' },
    { label: 'Semester', value: subject => subject.semesterName || '' },
    { label: 'Credits', value: subject => subject.credits == null || subject.credits === '' ? 'Not Configured' : subject.credits },
  ]
  const subjectFilterOptions = (field) => {
    if (field === 'level') {
      return ['1st Year', '2nd Year', '3rd Year', '4th Year'].map(l => ({ value: l, label: l }))
    }
    if (field === 'academicYearId') {
      return masterYears.map(year => ({
        value: String(year.academicYearId || year.id),
        label: year.academicYearName || year.name || String(year.academicYearId || year.id),
      }))
    }
    if (field === 'courseId') {
      return masterCourses.map(course => ({
        value: String(course.courseId || course.id),
        label: course.courseName || course.name || String(course.courseId || course.id),
      }))
    }
    if (field === 'branchId') {
      const filtered = subjectFilters.courseId
        ? masterBranches.filter(b => String(b.courseId || b.course?.id || '') === String(subjectFilters.courseId))
        : masterBranches
      return filtered.map(branch => ({
        value: String(branch.branchId || branch.id),
        label: branch.branchName || branch.name || String(branch.branchId || branch.id),
      }))
    }
    if (field === 'semesterId') {
      if (!subjectFilters.level) return []
      let filtered = masterSemesters
      if (subjectFilters.academicYearId) {
        filtered = filtered.filter(s => !s.academicYearId || String(s.academicYearId) === String(subjectFilters.academicYearId))
      }
      if (subjectFilters.courseId) {
        filtered = filtered.filter(s => !s.courseId || String(s.courseId) === String(subjectFilters.courseId))
      }
      if (subjectFilters.branchId) {
        filtered = filtered.filter(s => !s.branchId || String(s.branchId) === String(subjectFilters.branchId))
      }
      if (subjectFilters.level) {
        filtered = filtered.filter(semester => getStudentYear(String(getSemesterNumber(semester))) === subjectFilters.level)
      }
      // Display each semester number once, while matching every backend ID
      // for that number within the selected academic context.
      return [...new Set(filtered.map(getSemesterNumber).filter(number => number > 0))]
        .sort((a, b) => a - b)
        .map(number => ({ value: `semester:${number}`, label: `Semester ${number}` }))
    }
    return []
  }
  const updateSubjectFilter = (field, value) => {
    const childFields = {
      academicYearId: ['semesterId'],
      courseId: ['branchId', 'semesterId'],
      branchId: ['semesterId'],
      level: ['semesterId'],
      semesterId: [],
    }
    setSubjectFilters(previous => ({ ...previous, ...Object.fromEntries((childFields[field] || []).map(child => [child, ''])), [field]: value }))
  }

  const duplicateRecords = useMemo(() => {
    const map = new Map()

    credits.forEach((credit) => {
      const key = [
        credit.studentId,
        credit.subjectId,
        credit.academicYear,
        credit.semester,
      ].join('|')

      if (!map.has(key)) {
        map.set(key, [])
      }

      map.get(key).push(credit)
    })

    const duplicates = []

    map.forEach((items) => {
      if (items.length > 1) {
        duplicates.push(...items)
      }
    })

    return duplicates
  }, [credits])

  const validationSummary = useMemo(() => {
    const errors = validationResults.filter(
      (item) => item.type === 'error'
    ).length

    const warnings = validationResults.filter(
      (item) => item.type === 'warning'
    ).length

    const success = validationResults.filter(
      (item) => item.type === 'success'
    ).length

    return {
      errors,
      warnings,
      success,
    }
  }, [validationResults])

  const openAddCreditModal = () => {
    if (!canCreate) return
    registrationProgress.current = {}
    setEditingCreditId(null)

    setCreditForm({
      studentId: selectedStudentId || '',
      subjectId: '',
      grade: '',
      registrationStatus: 'REGISTERED',
      attempt: 1,
    })

    setShowCreditModal(true)
  }

  const openEditCreditModal = (credit) => {
    if (!canEdit) return
    registrationProgress.current = {}
    setEditingCreditId(credit.id)

    setCreditForm({
      studentId: credit.studentId,
      subjectId: credit.subjectId,
      grade: credit.grade,
      registrationStatus: String(credit.registrationStatus || credit.status || 'REGISTERED').toUpperCase(),
      attempt: credit.attempt ?? '',
    })

    setShowCreditModal(true)
  }

  const closeCreditModal = () => {
    setShowCreditModal(false)
    setEditingCreditId(null)
  }

  const handleCreditSubmit = async (event) => {
    event.preventDefault()
    if (creditLoading || creditLoadError || registrationLock.current || !(editingCreditId ? canEdit : canCreate)) return

    const student = students.find(
      (item) => item.id === creditForm.studentId
    )

    const subject = subjects.find(
      (item) => item.id === creditForm.subjectId
    )

    const gradeInfo = GRADE_OPTIONS.find(
      (item) => item.grade === creditForm.grade
    )

    if (!student) {
      showNotice('error', 'Please select a valid student.')
      return
    }

    if (!subject) {
      showNotice('error', 'Please select a valid subject.')
      return
    }

    if (creditForm.registrationStatus !== 'REGISTERED' && !gradeInfo) {
      showNotice('error', 'Please select a valid grade.')
      return
    }

    if (['courseId','branchId','semesterId'].some(key => !(Number(student[key]) > 0) || !(Number(subject[key]) > 0))) return showNotice('error', 'Student and subject need valid course, branch and semester mappings.')
    if (creditForm.registrationStatus === 'FAILED' && gradeInfo?.grade !== 'F') return showNotice('error', 'A failed registration requires the failing grade.')
    if (creditForm.registrationStatus === 'COMPLETED' && gradeInfo?.grade === 'F') return showNotice('error', 'A failing grade must use Failed registration status.')
    const mappingValid =
      String(student.branchId) === String(subject.branchId) &&
      String(student.courseId) === String(subject.courseId)

    if (!mappingValid) {
      showNotice(
        'error',
        `Subject ${subject.code} is not mapped to ${student.branch} - ${student.course}.`
      )
      return
    }

    if (String(student.semesterId) !== String(subject.semesterId)) {
      showNotice(
        'error',
        `Semester mismatch. Student is in ${student.semester}, but the subject belongs to ${subject.semester}.`
      )
      return
    }

    const duplicate = credits.some((item) => {
      if (editingCreditId && String(item.id) === String(editingCreditId)) {
        return false
      }

      return (
        item.studentId === student.id &&
        item.subjectId === subject.id &&
        item.academicYear === student.academicYear &&
        item.semester === student.semester
      )
    })

    if (duplicate) {
      showNotice(
        'error',
        `Duplicate credit detected for ${student.name} - ${subject.code}.`
      )
      return
    }

    const semesterId = student.semesterId || subject.semesterId
    if (!Number.isInteger(Number(student.id)) || !Number.isInteger(Number(subject.id)) || !Number.isInteger(Number(semesterId))) {
      showNotice('error', 'Select a student, configured subject, and semester with valid backend IDs.')
      return
    }
    if (!subject.configurationId || subject.configurationActive === false) {
      showNotice('error', 'This subject has no active credit configuration. Configure the existing subject before registering credits.')
      return
    }
    registrationLock.current = true; setCreditSaving(true)
    try {
      if (registrationProgress.current.uncertain) throw new Error('Verify registrations before another creation; the previous response did not include an identity.')
      let registrationId = editingCreditId || registrationProgress.current.id
      if (!registrationId) {
        const created = await creditManagementApi.createRegistration({ studentId: Number(student.id), subjectId: Number(subject.id), semesterId: Number(semesterId) })
        registrationId = created.studentCreditRegistrationId || created.registrationId || created.id
        if (!registrationId) { registrationProgress.current.uncertain = true; throw new Error('Credit registration was created but the API response did not include its ID. Verify registrations before creating another.') }
        registrationProgress.current.id = registrationId
        setEditingCreditId(registrationId)
      }
      const update = { registrationStatus: creditForm.registrationStatus, grade: gradeInfo?.grade || null, gradePoints: gradeInfo?.point ?? null, isCompleted: creditForm.registrationStatus !== 'REGISTERED', status: 1 }
      const signature = JSON.stringify(update)
      if (registrationProgress.current.signature !== signature) { await creditManagementApi.updateRegistration(registrationId, update); registrationProgress.current.signature = signature }
      await reloadCreditData({ propagate: true })
    } catch (error) {
      showNotice('error', error.message || 'Unable to save the credit registration.')
      return
    } finally { registrationLock.current = false; setCreditSaving(false) }

    if (editingCreditId) {

      addAudit(
        'Credit Updated',
        `${student.name} - ${subject.code} credit record updated`
      )

      showNotice('success', 'Credit record updated successfully.')
    } else {
      addAudit(
        'Credit Registered',
        `${student.name} - ${subject.code} credit registered`
      )

      showNotice('success', 'Credit submitted successfully.')
    }

    closeCreditModal()
    setSelectedStudentId(student.id)
  }

  const handleDeleteCredit = async (credit) => {
    if (!canEdit || registrationLock.current) return
    registrationLock.current = true; setCreditSaving(true)
    try {
      await creditManagementApi.updateRegistration(credit.id, { registrationStatus: 'DROPPED', grade: credit.grade || null, gradePoints: credit.gradePoint ?? null, isCompleted: false, status: 1 })
      await reloadCreditData({ propagate: true })
      setDropTarget(null); showNotice('success', 'Credit registration marked as dropped.')
    } catch (error) { showNotice('error', error.message || 'Unable to drop this credit registration.') } finally { registrationLock.current=false; setCreditSaving(false) }
  }

  const openEditSubjectModal = (subject) => {
    configProgress.current = {}
    setEditingSubjectId(subject.configurationId || null)

    setSubjectForm({
      subjectId: subject.subjectId || subject.id,
      minimumCredits: subject.minimumCredits ?? 0, maximumCredits: subject.maximumCredits ?? '',
      code: subject.code,
      name: subject.name,
      shortName: subject.shortName,
      branch: subject.branch,
      course: subject.course,
      regulation: subject.regulation || '',
      semester: subject.semester,
      academicYear: subject.academicYear,
      type: subject.type,
      category: subject.category,
      lectureHours: subject.lectureHours ?? 0,
      tutorialHours: subject.tutorialHours ?? 0,
      practicalHours: subject.practicalHours ?? 0,
      credits: subject.credits,
      internalMarks: subject.internalMarks ?? '',
      externalMarks: subject.externalMarks ?? '',
      totalMarks: subject.totalMarks ?? subject.maxMarks ?? '',
      status: subject.configurationId ? subject.configurationActive ? 'Active' : 'Inactive' : 'Active',
    })

    setShowSubjectModal(true)
  }

  const handleSubjectSubmit = async (event) => {
    event.preventDefault()
    if (creditLoading || creditLoadError || creditSaving || !(editingSubjectId ? canEdit : canCreate)) return

    const code = subjectForm.code.trim().toUpperCase()
    const name = subjectForm.name.trim()

    if (!code || !name) {
      showNotice('error', 'Please fill all required subject fields.')
      return
    }

    if (!Number.isFinite(Number(subjectForm.credits)) || Number(subjectForm.credits) <= 0) {
      showNotice('error', 'Subject credits must be greater than zero.')
      return
    }

    const duplicateCode = subjects.some((subject) => {
      if (editingSubjectId && String(subject.configurationId) === String(editingSubjectId)) {
        return false
      }

      return subject.configurationId && String(subject.id) === String(subjectForm.subjectId) && String(subject.code).toUpperCase() === code
    })

    if (duplicateCode) {
      showNotice('error', `Subject code ${code} already exists.`)
      return
    }

    const masterSubject = subjects.find(subject => String(subject.subjectId || subject.id) === String(subjectForm.subjectId))
    const masterCourse = masterCourses.find(item => String(item.courseName || item.name || item.courseCode || item.code).toLowerCase() === String(subjectForm.course).toLowerCase())
    const masterBranch = masterBranches.find(item => String(item.branchName || item.name || item.branchCode || item.code).toLowerCase() === String(subjectForm.branch).toLowerCase())
    const masterSemester = masterSemesters.find(item => String(item.semesterName || item.name || '').toLowerCase() === String(subjectForm.semester).toLowerCase() || String(item.semesterNumber) === String(subjectForm.semester).replace(/\D/g, ''))
    const subjectId = masterSubject?.subjectId || masterSubject?.id
    const courseId = masterSubject?.courseId || masterCourse?.courseId || masterCourse?.id
    const branchId = masterSubject?.branchId || masterBranch?.branchId || masterBranch?.id
    const semesterId = masterSubject?.semesterId || masterSemester?.semesterId || masterSemester?.id
    if (!subjectId || !courseId || !branchId || !semesterId) {
      showNotice('error', 'Credit configuration needs an existing backend subject, course, branch, and semester. Subject master creation is not available in the credits API.')
      return
    }
    const configPayload = { subjectId: Number(subjectId), courseId: Number(courseId), branchId: Number(branchId), semesterId: Number(semesterId), credits: Number(subjectForm.credits), minimumCredits: Number(subjectForm.minimumCredits || 0), maximumCredits: subjectForm.maximumCredits === '' || subjectForm.maximumCredits == null ? null : Number(subjectForm.maximumCredits), status: subjectForm.status === 'Active' ? 1 : 0 }
    if (!Number.isFinite(configPayload.minimumCredits) || configPayload.minimumCredits < 0 || (configPayload.maximumCredits != null && (!Number.isFinite(configPayload.maximumCredits) || configPayload.maximumCredits < configPayload.minimumCredits))) return showNotice('error', 'Maximum credits must be at least minimum credits.')
    setCreditSaving(true)
    try {
      if(configProgress.current.uncertain) throw new Error('Verify credit configurations before another creation; the previous response did not include an identity.')
      const signature=JSON.stringify(configPayload)
      if(configProgress.current.signature !== signature) {
        const id=editingSubjectId || configProgress.current.id
        if(id) await creditManagementApi.updateConfiguration(id,configPayload)
        else {const created=await creditManagementApi.createConfiguration(configPayload);const savedId=created?.creditConfigurationId ?? created?.configurationId ?? created?.id;if(!savedId){configProgress.current.uncertain=true;throw new Error('Configuration was created without an identity. Verify configurations before submitting again.')}configProgress.current.id=savedId;setEditingSubjectId(savedId)}
        configProgress.current.signature=signature
      }
      await reloadCreditData({ propagate: true })
    } catch (error) {
      showNotice('error', error.message || 'Unable to save credit configuration.')
      return
    } finally { setCreditSaving(false) }
    if (editingSubjectId) {
      addAudit(
        'Subject Updated',
        `${code} subject credit configuration updated`
      )

      showNotice('success', 'Subject configuration updated successfully.')
    } else {
      addAudit(
        'Subject Created',
        `${code} subject credit configuration created`
      )

      showNotice('success', 'Subject configuration created successfully.')
    }

    setShowSubjectModal(false)
    setEditingSubjectId(null)
  }

  const [deactivation, setDeactivation] = useState(null)
  const [deactivationError, setDeactivationError] = useState('')
  const deactivationSaved = useRef(false)
  const handleDeleteSubject = async (subject) => {
    if (!canEdit || creditSaving) return
    const used = credits.some(
      (credit) => credit.subjectId === subject.id
    )

    if (used) {
      showNotice(
        'error',
        `${subject.code} cannot be deleted because student credit records exist.`
      )
      return
    }

    deactivationSaved.current = false; setDeactivationError(''); setDeactivation(subject)
  }
  const confirmDeactivation = async () => {
    const subject = deactivation
    if (!subject || !canEdit || creditSaving) return
    if (!subject.configurationId) return showNotice('error', 'This subject has no credit configuration to deactivate.')
    setCreditSaving(true); setDeactivationError('')
    try {
      if (!deactivationSaved.current) await creditManagementApi.updateConfiguration(subject.configurationId, { subjectId: Number(subject.subjectId || subject.id), courseId: Number(subject.courseId), branchId: Number(subject.branchId), semesterId: Number(subject.semesterId), credits: Number(subject.credits), minimumCredits: Number(subject.minimumCredits || 0), maximumCredits: subject.maximumCredits ?? null, status: 0 })
      deactivationSaved.current = true
      await reloadCreditData({ propagate: true })
      setDeactivation(null)
      showNotice('success', 'Credit configuration marked inactive.')
    } catch (error) { setDeactivationError(error.message || 'Unable to deactivate this credit configuration.') } finally { setCreditSaving(false) }
  }

  const openFrameworkModal = () => {
    setFrameworkForm(framework)
    showNotice('error', 'Program-wide credit framework configuration is unavailable: the backend exposes subject credit configuration only.')
  }

  const handleFrameworkSubmit = (event) => {
    event.preventDefault()

    const numericFields = [
      'totalProgramCredits',
      'minSemesterCredits',
      'maxSemesterCredits',
      'passingGradePoint',
      'requiredCoreCredits',
      'requiredElectiveCredits',
      'requiredProjectCredits',
      'requiredMandatoryCredits',
    ]

    const nextFramework = { ...frameworkForm }

    for (const field of numericFields) {
      nextFramework[field] = Number(nextFramework[field])

      if (nextFramework[field] < 0) {
        showNotice('error', 'Framework values cannot be negative.')
        return
      }
    }

    if (
      nextFramework.minSemesterCredits >
      nextFramework.maxSemesterCredits
    ) {
      showNotice(
        'error',
        'Minimum semester credits cannot exceed maximum semester credits.'
      )
      return
    }

    showNotice('error', 'The backend does not expose an academic credit framework endpoint, so this configuration cannot be saved to the server.')
  }

  const runValidation = () => {
    const results = []

    if (duplicateRecords.length > 0) {
      results.push({
        type: 'error',
        title: 'Duplicate Credits',
        message: `${duplicateRecords.length} duplicate credit record(s) detected.`,
      })
    } else {
      results.push({
        type: 'success',
        title: 'Duplicate Check',
        message: 'No duplicate student credit records detected.',
      })
    }

    let mappingErrors = 0

    credits.forEach((credit) => {
      const student = students.find(
        (item) => item.id === credit.studentId
      )

      const subject = subjects.find(
        (item) => item.id === credit.subjectId
      )

      if (!student) {
        mappingErrors += 1

        results.push({
          type: 'error',
          title: 'Student Mapping',
          message: `Student ${credit.studentId} does not exist.`,
        })

        return
      }

      if (!subject) {
        mappingErrors += 1

        results.push({
          type: 'error',
          title: 'Subject Mapping',
          message: `${credit.subjectCode} is no longer available in subject configuration.`,
        })

        return
      }

      if (
        student.branch !== subject.branch ||
        student.course !== subject.course
      ) {
        mappingErrors += 1

        results.push({
          type: 'error',
          title: 'Branch/Course Mapping',
          message: `${student.name} is not mapped to ${subject.code}.`,
        })
      }

      if (student.semester !== subject.semester) {
        mappingErrors += 1

        results.push({
          type: 'error',
          title: 'Semester Mapping',
          message: `${student.name} has ${student.semester}, but ${subject.code} belongs to ${subject.semester}.`,
        })
      }
    })

    if (mappingErrors === 0) {
      results.push({
        type: 'success',
        title: 'Mapping Validation',
        message: 'Student, course, branch and semester mappings are valid.',
      })
    }

    const studentsOverLimit = []

    students.forEach((student) => {
      const semesterCredits = credits
        .filter(
          (credit) =>
            credit.studentId === student.id &&
            credit.semester === student.semester &&
            credit.status === 'Completed'
        )
        .reduce((sum, item) => sum + Number(item.credits || 0), 0)

      if (semesterCredits > Number(framework.maxSemesterCredits)) {
        studentsOverLimit.push({
          student,
          credits: semesterCredits,
        })
      }
    })

    if (studentsOverLimit.length > 0) {
      studentsOverLimit.forEach((item) => {
        results.push({
          type: 'warning',
          title: 'Semester Credit Limit',
          message: `${item.student.name} has ${item.credits} credits, exceeding the maximum ${framework.maxSemesterCredits}.`,
        })
      })
    } else {
      results.push({
        type: 'success',
        title: 'Credit Limit',
        message: 'No student exceeds the configured semester credit limit.',
      })
    }

    const failedRecords = credits.filter(
      (credit) => credit.status === 'Failed'
    )

    if (failedRecords.length > 0) {
      results.push({
        type: 'warning',
        title: 'Backlog Detection',
        message: `${failedRecords.length} failed/backlog credit record(s) require attention.`,
      })
    } else {
      results.push({
        type: 'success',
        title: 'Backlog Check',
        message: 'No failed credit records detected.',
      })
    }

    setValidationResults(results)

    addAudit(
      'Credit Validation',
      `Validation completed with ${results.filter((item) => item.type === 'error').length} errors`
    )

    showNotice('success', 'Credit validation completed.')
  }

  const exportReport = () => {
    const headers = [
      'Student ID',
      'Student Name',
      'Roll No',
      'Branch',
      'Batch',
      'Semester',
      'Subject Code',
      'Subject Name',
      'Credits',
      'Grade',
      'Grade Point',
      'Status',
    ]

    const rows = credits.map((credit) => {
      const student = students.find(
        (item) => item.id === credit.studentId
      )

      return [
        student?.id || '',
        student?.name || '',
        student?.rollNo || '',
        student?.branch || '',
        student?.batch || '',
        credit.semester,
        credit.subjectCode,
        credit.subjectName,
        credit.credits,
        credit.grade,
        credit.gradePoint,
        credit.status,
      ]
    })

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\r\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'credit-management-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)

    addAudit(
      'Report Exported',
      'Credit management CSV report exported'
    )

    showNotice('success', 'Credit report exported successfully.')
  }

  const printReport = () => {
    window.print()

    addAudit(
      'Report Printed',
      'Credit management report print requested'
    )
  }

  const handleRefreshData = () => {
    reloadCreditData().then(() => showNotice('success', 'Credit data refreshed from backend.')).catch(error => showNotice('error', error.message || 'Unable to refresh credit data.'))
  }

  const filteredRegistrations = useMemo(() => credits.filter(row=>(!selectedStudentId||String(row.studentId)===String(selectedStudentId))&&(!registrationStatus||row.status===registrationStatus)&&(!studentSearch||[row.studentName,row.subjectCode,row.subjectName].join(' ').toLowerCase().includes(studentSearch.toLowerCase()))), [credits, selectedStudentId, registrationStatus, studentSearch])
  const creditPage=Math.min(registrationPage,Math.max(1,Math.ceil(filteredRegistrations.length/10)))
  return (
    <DashboardLayout>
      <div className="cm-page">
        {notice.message && (
          <div className={`cm-alert cm-alert-${notice.type}`}>
            <span>
              {notice.type === 'success' ? <FiCheck aria-hidden="true" /> : <FiAlertTriangle aria-hidden="true" />}
            </span>

            <div>{notice.message}</div>

            <button
              onClick={() =>
                setNotice({
                  type: '',
                  message: '',
                })
              }
            >
              ×
            </button>
          </div>
        )}

        <PageHeader title="Credit Management" subtitle="Configure subject credits and manage student registrations using current academic records." compactSummary={[{label:'Configurations',value:creditDashboard?.totalConfigurations ?? 'Unavailable'},{label:'Active configurations',value:creditDashboard?.activeConfigurations ?? 'Unavailable'}]} />
        <nav className="cm-header-actions" aria-label="Credit management sections">{[['subjects','Credit Configurations'],['students','Student Credit Registrations']].map(([key,label])=><button key={key} className={activeTab===key?'cm-btn cm-btn-primary':'cm-btn cm-btn-light'} aria-pressed={activeTab===key} onClick={()=>setActiveTab(key)}>{label}</button>)}</nav>
        {creditLoading && <p role="status">Loading credit records…</p>}{creditLoadError && <p role="alert">{creditLoadError} <button onClick={()=>reloadCreditData()}>Retry credit data</button></p>}
        {activeTab === 'students' && <section className="cm-card"><FilterPanel actions={<>{canCreate && <button className="cm-btn cm-btn-primary" onClick={openAddCreditModal}>Register Credit</button>}<ExportMenu rows={filteredRegistrations} columns={[{label:'Student',value:'studentName'},{label:'Subject',value:'subjectCode'},{label:'Semester',value:'semester'},{label:'Credits',value:'credits'},{label:'Status',value:'status'},{label:'Grade',value:'grade'}]} title="Student Credit Registrations" filename="student-credit-registrations"/></>} search={<label>Search registrations<input value={studentSearch} onChange={e=>{setStudentSearch(e.target.value);setRegistrationPage(1)}} /></label>} filters={<><label>Student<select value={selectedStudentId} onChange={e=>{setSelectedStudentId(e.target.value);setRegistrationPage(1)}}><option value="">All students</option>{students.map(row=><option key={row.id} value={row.id}>{row.name} · {row.rollNo}</option>)}</select></label><label>Registration status<select value={registrationStatus} onChange={e=>{setRegistrationStatus(e.target.value);setRegistrationPage(1)}}><option value="">All statuses</option>{['Registered','Completed','Failed','Dropped'].map(value=><option key={value}>{value}</option>)}</select></label></>} active={Boolean(selectedStudentId || registrationStatus)} onClear={()=>{setStudentSearch('');setSelectedStudentId('');setRegistrationStatus('');setRegistrationPage(1)}} />
        {creditSummaryError && <p role="alert">{creditSummaryError} <button type="button" onClick={()=>setSummaryAttempt(value=>value+1)}>Retry credit summary</button></p>}{selectedStudentId && <CompactSummary items={[{label:'Registered credits',value:creditSummary?.registeredCredits ?? 'Unavailable'},{label:'Completed credits',value:creditSummary?.completedCredits ?? 'Unavailable'}]}/>}<p>Only returned registration credits are shown. Graduation eligibility requires an institutional credit framework and is not inferred here.</p>
        <div className="cm-table-wrap"><table className="cm-table"><thead><tr>{['Student','Subject','Semester','Credits','Grade','Grade points','Status','Actions'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{filteredRegistrations.slice((creditPage-1)*10,creditPage*10).map(row=><tr key={row.id}><td>{row.studentName}</td><td>{row.subjectCode} · {row.subjectName}</td><td>{row.semester}</td><td>{row.credits ?? 'Not provided'}</td><td>{row.grade || 'Not provided'}</td><td>{row.gradePoint ?? 'Not provided'}</td><td><StatusBadge value={row.status}/></td><td><button className="cm-btn cm-btn-light" onClick={()=>setViewRegistration(row)}>View registration</button>{canEdit && row.status !== 'Dropped' && <><button className="cm-btn cm-btn-light" onClick={()=>openEditCreditModal(row)}>Edit registration</button><button className="cm-btn cm-btn-light" onClick={()=>setDropTarget(row)}>Drop registration</button></>}</td></tr>)}</tbody></table></div>{!filteredRegistrations.length && !creditLoading && <p>No student credit registrations were returned.</p>}<TablePagination page={creditPage} totalPages={Math.max(1,Math.ceil(filteredRegistrations.length/10))} onPageChange={setRegistrationPage}/></section>}
        {viewRegistration && <ViewDialog title="Credit Registration Details" onClose={()=>setViewRegistration(null)} showExport={false}><dl className="view-modal-fields">{[['Student',viewRegistration.studentName],['Subject',viewRegistration.subjectCode+' · '+viewRegistration.subjectName],['Semester',viewRegistration.semester],['Credits',viewRegistration.credits],['Grade',viewRegistration.grade || 'Not provided'],['Grade points',viewRegistration.gradePoint ?? 'Not provided'],['Status',viewRegistration.status]].map(([label,value])=><div className="view-modal-field" key={label}><dt className="view-modal-label">{label}</dt><dd className="view-modal-value">{value}</dd></div>)}</dl></ViewDialog>}
        {dropTarget && <ViewDialog title="Drop Credit Registration" onClose={()=>setDropTarget(null)} busy={creditSaving} showExport={false} hideFooter><p>Drop {dropTarget.subjectCode} for {dropTarget.studentName}? The existing registration is retained as dropped.</p><button disabled={creditSaving} onClick={()=>setDropTarget(null)}>Cancel</button><button disabled={creditSaving} onClick={()=>handleDeleteCredit(dropTarget)}>Confirm drop</button></ViewDialog>}
        {activeTab === 'subjects' && (
          <section className="cm-content">
            <div className="cm-section-heading cm-subject-section-heading">
              <div>
                <h2>Subject Credits</h2>
                <p>Subject credits and academic mapping are synced from Subject Management.</p>
              </div>
              <div className="cm-subject-heading-summary">
                <CompactSummary
                  label="Subject credit summary"
                  items={[
                    { label: 'Total Subjects', value: contextSubjects.length },
                    { label: 'Total Credits', value: contextSubjects.reduce((total, subject) => total + (subject.credits == null || subject.credits === '' ? 0 : Number(subject.credits)), 0), tone: 'active' },
                  ]}
                />
              </div>
            </div>

            <FilterPanel
              className="cm-subject-filter-panel"
              active={Object.values(subjectFilters).some(Boolean)}
              onClear={() => setSubjectFilters({ academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '' })}
              hideClear
              actions={(
                <>
                <ExportMenu
                  rows={filteredSubjects}
                  columns={subjectCreditExportColumns}
                  title="Subject Credits"
                  filename="subject-credits"
                  scope="Matching subject credits"
                  loading={creditLoading || Boolean(subjectApiError) || !subjectFiltersReady}
                />
                {Object.values(subjectFilters).some(Boolean) && <button type="button" className="filter-disclosure__clear-btn cm-subject-clear-btn" onClick={() => setSubjectFilters({ academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '' })}>Clear Filters</button>}
                </>
              )}
            >
              <div className="cm-subject-search">
                <input aria-label="Search subject code or name" placeholder="Search subject code or name..." value={subjectSearch} onChange={event => setSubjectSearch(event.target.value)} />
              </div>
              <div className="cm-subject-filter-grid">
                  {[
                    ['academicYearId', 'Academic Year'],
                    ['courseId', 'Course'],
                    ['branchId', 'Branch'],
                    ['level', 'Academic Level'],
                    ['semesterId', 'Semester'],
                  ].map(([field, label]) => (
                    <label className="cm-academic-filter" key={field}>
                      <span>{label}</span>
                      <SearchableSelect
                        label={`Select ${label}`}
                        disabled={field === 'semesterId' && !subjectFilters.level}
                        value={subjectFilters[field]}
                        options={[{ value: '', label: `Select ${label}` }, ...subjectFilterOptions(field)]}
                        onChange={value => updateSubjectFilter(field, value)}
                        placeholder={`Select ${label}`}
                        searchPlaceholder={`Search ${label.toLowerCase()}...`}
                        noOptionsMessage={`No ${label.toLowerCase()} options found.`}
                      />
                    </label>
                  ))}

              </div>
            </FilterPanel>

            <div className="cm-card">
              <div className="cm-table-wrap cm-subject-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Academic Mapping</th>
                      <th>Credits</th><th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {creditLoading ? (
                      <tr><td colSpan="4">Loading subjects and credits...</td></tr>
                    ) : subjectApiError ? (
                      <tr><td colSpan="4"><div className="cm-empty cm-empty--error" role="alert"><p>{subjectApiError}</p><button type="button" className="cm-btn cm-btn-light" onClick={reloadCreditData}>Retry</button></div></td></tr>
                    ) : !subjectFiltersReady ? (
                      <tr>
                        <td colSpan="4">
                          <EmptyState
                            title="Select Academic Filters"
                            message="Choose an academic year, course, branch, and semester to view subject credits."
                          />
                        </td>
                      </tr>
                    ) : filteredSubjects.length === 0 ? (
                      <tr>
                        <td colSpan="4">
                          <EmptyState
                            title="No Subjects Found"
                            message="No subjects found for the selected academic configuration."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredSubjects.map((subject) => (
                        <tr key={subject.id}>
                          <td>
                            <strong>{subject.code}</strong>
                            <small>{subject.name}</small>
                          </td>

                          <td>{[subject.academicYearName, subject.course, subject.branchName, subject.level, subject.semesterName].filter(Boolean).join(' - ')}</td>

                          <td>
                            <span className="cm-credit-number">
                              {subject.credits == null || subject.credits === '' ? 'Not Configured' : `${subject.credits} Credits`}
                            </span>
                          </td>

                          <td>{(subject.configurationId ? canEdit : canCreate) && <button type="button" className="cm-btn cm-btn-light" onClick={() => openEditSubjectModal(subject)}>{subject.configurationId ? 'Edit Credits' : 'Configure Credits'}</button>}{canEdit && subject.configurationId && subject.configurationActive && <button type="button" className="cm-btn cm-btn-light" onClick={() => handleDeleteSubject(subject)}>Deactivate Credits</button>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'framework' && (
          <section className="cm-content">
            <div className="cm-section-heading">
              <div>
                <h2>Credit Framework</h2>
                <p>
                  Configure program-level academic credit rules.
                </p>
              </div>

              <button
                className="cm-btn cm-btn-primary"
                onClick={openFrameworkModal}
              >
                Edit Framework
              </button>
            </div>

            <div className="cm-framework-grid">
              <div className="cm-framework-card">
                <span>Total Program Credits</span>
                <strong>{framework.totalProgramCredits}</strong>
                <small>Required for graduation</small>
              </div>

              <div className="cm-framework-card">
                <span>Minimum Semester Credits</span>
                <strong>{framework.minSemesterCredits}</strong>
                <small>Minimum registration load</small>
              </div>

              <div className="cm-framework-card">
                <span>Maximum Semester Credits</span>
                <strong>{framework.maxSemesterCredits}</strong>
                <small>Maximum registration load</small>
              </div>

              <div className="cm-framework-card">
                <span>Passing Grade Point</span>
                <strong>{framework.passingGradePoint}</strong>
                <small>Minimum passing point</small>
              </div>
            </div>

            <div className="cm-card">
              <div className="cm-card-header">
                <div>
                  <h3>Credit Category Requirements</h3>
                  <p>
                    Minimum credits required by academic category.
                  </p>
                </div>
              </div>

              <div className="cm-requirement-grid">
                <div className="cm-requirement">
                  <span>Core Credits</span>
                  <strong>
                    {framework.requiredCoreCredits}
                  </strong>
                </div>

                <div className="cm-requirement">
                  <span>Elective Credits</span>
                  <strong>
                    {framework.requiredElectiveCredits}
                  </strong>
                </div>

                <div className="cm-requirement">
                  <span>Project Credits</span>
                  <strong>
                    {framework.requiredProjectCredits}
                  </strong>
                </div>

                <div className="cm-requirement">
                  <span>Mandatory Credits</span>
                  <strong>
                    {framework.requiredMandatoryCredits}
                  </strong>
                </div>
              </div>
            </div>

            <div className="cm-card">
              <div className="cm-card-header">
                <div>
                  <h3>Semester Credit Rules</h3>
                  <p>
                    Student year is automatically derived from semester.
                  </p>
                </div>
              </div>

              <div className="cm-semester-grid">
                {SEMESTERS.map((semester) => (
                  <div
                    className="cm-semester-card"
                    key={semester}
                  >
                    <span>{semester}</span>
                    <strong>{getStudentYear(semester)}</strong>
                    <small>
                      {framework.minSemesterCredits} -{' '}
                      {framework.maxSemesterCredits} credits
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'validation' && (
          <section className="cm-content">
            <div className="cm-section-heading">
              <div>
                <h2>Credit Validation Center</h2>
                <p>
                  Validate duplicates, mappings, credit limits and
                  backlog records.
                </p>
              </div>

              <button
                className="cm-btn cm-btn-primary"
                onClick={runValidation}
              >
                Run Full Validation
              </button>
            </div>

            <div className="cm-stat-grid cm-stat-grid-three">
              <StatCard
                title="Validation Errors"
                value={validationSummary.errors}
                subtitle="Critical issues"
                icon={<FiAlertCircle />}
              />

              <StatCard
                title="Warnings"
                value={validationSummary.warnings}
                subtitle="Requires review"
                icon={<FiAlertTriangle />}
              />

              <StatCard
                title="Passed Checks"
                value={validationSummary.success}
                subtitle="Successful validations"
                icon={<FiCheckCircle />}
              />
            </div>

            <div className="cm-validation-grid">
              <div className="cm-card">
                <div className="cm-card-header">
                  <div>
                    <h3>Duplicate Detection</h3>
                    <p>
                      Student + subject + academic year + semester
                      uniqueness check.
                    </p>
                  </div>

                  <span
                    className={
                      duplicateRecords.length
                        ? 'cm-counter cm-counter-danger'
                        : 'cm-counter cm-counter-success'
                    }
                  >
                    {duplicateRecords.length}
                  </span>
                </div>

                {duplicateRecords.length === 0 ? (
                  <div className="cm-validation-success">
                    ✓ No duplicate credit registrations detected.
                  </div>
                ) : (
                  <div className="cm-duplicate-list">
                    {duplicateRecords.map((credit) => {
                      const student = students.find(
                        (item) => item.id === credit.studentId
                      )

                      return (
                        <div
                          className="cm-duplicate-item"
                          key={credit.id}
                        >
                          <div>
                            <strong>
                              {student?.name || credit.studentId}
                            </strong>

                            <span>
                              {credit.subjectCode} |{' '}
                              {credit.semester} |{' '}
                              {credit.academicYear}
                            </span>
                          </div>

                          <span className="cm-danger-pill">
                            Duplicate
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="cm-card">
                <div className="cm-card-header">
                  <div>
                    <h3>Backlog Management</h3>
                    <p>
                      Failed credit records requiring completion.
                    </p>
                  </div>

                  <span className="cm-counter cm-counter-danger">
                    {
                      credits.filter(
                        (item) => item.status === 'Failed'
                      ).length
                    }
                  </span>
                </div>

                <div className="cm-backlog-list">
                  {credits.filter(
                    (item) => item.status === 'Failed'
                  ).length === 0 ? (
                    <div className="cm-validation-success">
                      ✓ No failed credit records.
                    </div>
                  ) : (
                    credits
                      .filter(
                        (item) => item.status === 'Failed'
                      )
                      .map((credit) => {
                        const student = students.find(
                          (item) =>
                            item.id === credit.studentId
                        )

                        return (
                          <div
                            className="cm-backlog-item"
                            key={credit.id}
                          >
                            <div>
                              <strong>
                                {student?.name || credit.studentId}
                              </strong>

                              <span>
                                {credit.subjectCode} |{' '}
                                {credit.credits} Credits
                              </span>
                            </div>

                            <button
                              className="cm-small-btn"
                              onClick={() => {
                                setSelectedStudentId(
                                  credit.studentId
                                )
                                setActiveTab('students')
                              }}
                            >
                              Manage
                            </button>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            </div>

            <div className="cm-card">
              <div className="cm-card-header">
                <div>
                  <h3>Validation Results</h3>
                  <p>
                    Results generated from the latest validation run.
                  </p>
                </div>
              </div>

              {validationResults.length === 0 ? (
                <EmptyState
                  title="Validation Not Run"
                  message="Click Run Full Validation to check the credit data."
                />
              ) : (
                <div className="cm-validation-results">
                  {validationResults.map((result, index) => (
                    <div
                      className={`cm-validation-result cm-result-${result.type}`}
                      key={`${result.title}-${index}`}
                    >
                      <span className="cm-result-icon">
                        {result.type === 'success'
                          ? '✓'
                          : result.type === 'warning'
                            ? '!'
                            : '×'}
                      </span>

                      <div>
                        <strong>{result.title}</strong>
                        <p>{result.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="cm-content">
            <div className="cm-section-heading">
              <div>
                <h2>Credit Reports</h2>
                <p>
                  Generate and export academic credit management
                  reports.
                </p>
              </div>

              <div
                className="cm-header-actions cm-reports-actions"
                ref={reportMenuRef}
              >
                <div className="cm-export-dropdown">
                  <button
                    className="cm-btn cm-btn-primary"
                    onClick={() => setShowReportMenu((state) => !state)}
                  >
                    Export
                  </button>

                  {showReportMenu && (
                    <div className="cm-export-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReportMenu(false)
                          exportReport()
                        }}
                      >
                        Download CSV
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowReportMenu(false)
                          printReport()
                        }}
                      >
                        Print / Save as PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="cm-report-grid">
              <div className="cm-report-card">
                <span className="cm-report-icon">▣</span>
                <h3>Credit Registration Report</h3>
                <p>
                  Complete student-wise subject and credit
                  registration data.
                </p>

                <button
                  onClick={exportReport}
                  className="cm-btn cm-btn-light"
                >
                  Export
                </button>
              </div>

              <div className="cm-report-card">
                <span className="cm-report-icon">!</span>
                <h3>Backlog Report</h3>
                <p>
                  Identify students with failed or incomplete credits.
                </p>

                <button
                  onClick={() => setActiveTab('validation')}
                  className="cm-btn cm-btn-light"
                >
                  View Backlogs
                </button>
              </div>

              <div className="cm-report-card">
                <span className="cm-report-icon">✓</span>
                <h3>Graduation Eligibility</h3>
                <p>
                  Review students against program credit requirements.
                </p>

                <button
                  onClick={() => setActiveTab('students')}
                  className="cm-btn cm-btn-light"
                >
                  Review Students
                </button>
              </div>

              <div className="cm-report-card">
                <span className="cm-report-icon">⌁</span>
                <h3>Validation Report</h3>
                <p>
                  Review duplicate, mapping and credit-limit
                  validation results.
                </p>

                <button
                  onClick={() => setActiveTab('validation')}
                  className="cm-btn cm-btn-light"
                >
                  Validate
                </button>
              </div>
            </div>

            <div className="cm-card cm-report-preview">
              <div className="cm-card-header">
                <div>
                  <h3>Report Summary</h3>
                  <p>Current credit management data.</p>
                </div>
              </div>

              <div className="cm-report-summary">
                <div>
                  <span>Total Students</span>
                  <strong>{students.length}</strong>
                </div>

                <div>
                  <span>Total Subjects</span>
                  <strong>{subjects.length}</strong>
                </div>

                <div>
                  <span>Credit Records</span>
                  <strong>{credits.length}</strong>
                </div>

                <div>
                  <span>Completed Credits</span>
                  <strong>
                    {credits
                      .filter(
                        (item) => item.status === 'Completed'
                      )
                      .reduce(
                        (sum, item) =>
                          sum + Number(item.credits || 0),
                        0
                      )}
                  </strong>
                </div>

                <div>
                  <span>Backlog Records</span>
                  <strong className="cm-danger-text">
                    {
                      credits.filter(
                        (item) => item.status === 'Failed'
                      ).length
                    }
                  </strong>
                </div>

                <div>
                  <span>Duplicates</span>
                  <strong
                    className={
                      duplicateRecords.length
                        ? 'cm-danger-text'
                        : 'cm-success-text'
                    }
                  >
                    {duplicateRecords.length}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'audit' && (
          <section className="cm-content">
            <div className="cm-section-heading">
              <div>
                <h2>Credit Audit History</h2>
                <p>
                  Track administrative changes made to credit
                  configurations and student records.
                </p>
              </div>

              <button
                className="cm-btn cm-btn-danger-outline"
                onClick={() => {
                  if (
                    window.confirm(
                      'Clear audit history?'
                    )
                  ) {
                    setAuditLogs([])
                  }
                }}
              >
                Clear History
              </button>
            </div>

            <div className="cm-card">
              <div className="cm-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Performed By</th>
                    </tr>
                  </thead>

                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4">
                          <EmptyState
                            title="No Audit Records"
                            message="No administrative credit-management actions have been recorded."
                          />
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            {new Date(
                              log.date
                            ).toLocaleString('en-IN')}
                          </td>

                          <td>
                            <span className="cm-type-badge">
                              {log.action}
                            </span>
                          </td>

                          <td>{log.description}</td>

                          <td>
                            <strong>{log.user}</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="cm-danger-zone">
              <div>
                <h3>Data Refresh</h3>
                <p>
                  Reload the latest Credit Management records from the API.
                </p>
              </div>

              <button
                className="cm-btn cm-btn-danger"
                onClick={handleRefreshData}
              >
                Refresh API Data
              </button>
            </div>
          </section>
        )}

        {deactivation && <ViewDialog title="Deactivate Credit Configuration" onClose={() => setDeactivation(null)} busy={creditSaving} showExport={false} hideFooter><p>Deactivate credits for <strong>{deactivation.name || deactivation.code}</strong>? Subject master records remain available.</p>{deactivationError && <p role="alert">{deactivationError}</p>}<button disabled={creditSaving} onClick={() => setDeactivation(null)}>Cancel</button><button disabled={creditSaving} onClick={confirmDeactivation}>{creditSaving ? 'Saving…' : 'Confirm deactivation'}</button></ViewDialog>}
        {showCreditModal && (
          <ViewDialog title={editingCreditId ? 'Edit Credit Registration' : 'Register Student Credits'} onClose={() => setShowCreditModal(false)} busy={creditSaving} showExport={false} hideFooter maxWidth="1000px">
              <div className="cm-modal-header">
                <div>
                  <h2>
                    {editingCreditId
                      ? 'Update Credit'
                      : 'Submit Credit'}
                  </h2>

                  <p>
                    Register or update a student's academic credit.
                  </p>
                </div>

                <button
                  className="cm-modal-close"
                  onClick={closeCreditModal}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreditSubmit}>
                <div className="cm-form-grid">
                  <div className="cm-form-field cm-field-full">
                    <label>Student *</label>

                    <ProjectSelect
                      aria-label="Credit student" disabled={Boolean(editingCreditId) || creditSaving} value={creditForm.studentId}
                      onChange={(e) =>
                        setCreditForm((previous) => ({
                          ...previous,
                          studentId: e.target.value, subjectId: '',
                        }))
                      }
                      required
                    >
                      <option value="">
                        Select Student
                      </option>

                      {students.map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.name} - {student.rollNo} -{' '}
                          {student.branch}
                        </option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field cm-field-full">
                    <label>Subject *</label>

                    <ProjectSelect
                      aria-label="Credit subject" disabled={Boolean(editingCreditId) || creditSaving} value={creditForm.subjectId}
                      onChange={(e) =>
                        setCreditForm((previous) => ({
                          ...previous,
                          subjectId: e.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">
                        Select Subject
                      </option>

                      {subjects.filter(subject => { const student=students.find(row=>row.id===creditForm.studentId); return student && subject.configurationActive && ['courseId','branchId','semesterId'].every(key=>String(student[key])===String(subject[key])) }).map((subject) => (
                        <option
                          key={subject.id}
                          value={subject.id}
                        >
                          {subject.code} - {subject.name} -{' '}
                          {subject.credits} Credits
                        </option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Grade</label>

                    <ProjectSelect
                      aria-label="Credit grade" value={creditForm.grade}
                      onChange={(e) =>
                        setCreditForm((previous) => ({
                          ...previous,
                          grade: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select grade when completing</option>
                      {GRADE_OPTIONS.map((grade) => (
                        <option
                          key={grade.grade}
                          value={grade.grade}
                        >
                          {grade.grade} - {grade.point} Point
                        </option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Registration Status</label><ProjectSelect aria-label="Registration status" value={creditForm.registrationStatus} onChange={e=>setCreditForm(previous=>({...previous,registrationStatus:e.target.value}))}><option value="REGISTERED">Registered</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></ProjectSelect><label>Attempt (reported value)</label>

                    <input
                      type="number"
                      readOnly
                      min="1"
                      max="10"
                      value={creditForm.attempt}
                      onChange={(e) =>
                        setCreditForm((previous) => ({
                          ...previous,
                          attempt: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="cm-form-info">
                  <strong>Validation applied automatically:</strong>

                  <span>
                    Student mapping
                  </span>

                  <span>
                    Subject mapping
                  </span>

                  <span>
                    Semester mapping
                  </span>

                  <span>
                    Duplicate detection
                  </span>
                </div>

                <div className="cm-modal-footer">
                  <button
                    type="button"
                    className="cm-btn cm-btn-light"
                    onClick={closeCreditModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="cm-btn cm-btn-primary"
                  >
                    {editingCreditId
                      ? 'Update Credit'
                      : 'Submit Credit'}
                  </button>
                </div>
              </form>

          </ViewDialog>
        )}

        {showSubjectModal && (
          <ViewDialog title={editingSubjectId ? 'Edit Credit Configuration' : 'Configure Subject Credits'} onClose={() => setShowSubjectModal(false)} busy={creditSaving} showExport={false} hideFooter maxWidth="1000px">
              <div className="cm-modal-header">
                <div>
                  <h2>
                    {editingSubjectId
                      ? 'Edit Subject Configuration'
                      : 'Add Subject Configuration'}
                  </h2>

                  <p>
                    Existing Subject Management owns the academic mapping, hours and marks. This form saves credit configuration and status.
                  </p>
                </div>

                <button
                  className="cm-modal-close"
                  onClick={() => setShowSubjectModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubjectSubmit}>
                <div className="cm-form-grid"><label>Minimum Credits<input type="number" min="0" step="0.01" value={subjectForm.minimumCredits ?? 0} onChange={e=>setSubjectForm(value=>({...value,minimumCredits:e.target.value}))}/></label><label>Maximum Credits<input type="number" min="0" step="0.01" value={subjectForm.maximumCredits ?? ''} onChange={e=>setSubjectForm(value=>({...value,maximumCredits:e.target.value}))}/></label>
                  <div className="cm-form-field">
                    <label>Subject Code *</label>
                    <input
                      readOnly value={subjectForm.code}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          code: e.target.value,
                        }))
                      }
                      placeholder="CS501"
                      required
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Short Name *</label>
                    <input
                      readOnly value={subjectForm.shortName}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          shortName: e.target.value,
                        }))
                      }
                      placeholder="DSA"
                      required
                    />
                  </div>

                  <div className="cm-form-field cm-field-full">
                    <label>Subject Name *</label>
                    <input
                      readOnly value={subjectForm.name}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Data Structures and Algorithms"
                      required
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Course *</label>
                    <ProjectSelect
                      disabled value={subjectForm.course}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          course: e.target.value,
                        }))
                      }
                    >
                      {COURSES.map((course) => (
                        <option key={course}>{course}</option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Branch *</label>
                    <ProjectSelect
                      disabled value={subjectForm.branch}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          branch: e.target.value,
                        }))
                      }
                    >
                      {BRANCHES.map((branch) => (
                        <option key={branch}>{branch}</option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Regulation *</label>
                    <ProjectSelect
                      readOnly value={subjectForm.regulation}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          regulation: e.target.value,
                        }))
                      }
                    >
                      {REGULATIONS.map((regulation) => (
                        <option key={regulation}>{regulation}</option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Semester *</label>
                    <ProjectSelect
                      disabled value={subjectForm.semester}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          semester: e.target.value,
                        }))
                      }
                    >
                      {SEMESTERS.map((semester) => (
                        <option key={semester}>{semester}</option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Academic Year *</label>
                    <ProjectSelect
                      disabled value={subjectForm.academicYear}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          academicYear: e.target.value,
                        }))
                      }
                    >
                      {ACADEMIC_YEARS.map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Subject Type *</label>
                    <ProjectSelect
                      disabled value={subjectForm.type}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          type: e.target.value,
                        }))
                      }
                    >
                      {SUBJECT_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="cm-form-field">
                    <label>Category *</label>
                    <input
                      disabled value={subjectForm.category}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          category: e.target.value,
                        }))
                      }
                      placeholder="PCC"
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Lecture Hours</label>
                    <input
                      type="number"
                      min="0"
                      readOnly value={subjectForm.lectureHours}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          lectureHours: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Tutorial Hours</label>
                    <input
                      type="number"
                      min="0"
                      readOnly value={subjectForm.tutorialHours}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          tutorialHours: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Practical Hours</label>
                    <input
                      type="number"
                      min="0"
                      readOnly value={subjectForm.practicalHours}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          practicalHours: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Credits *</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={subjectForm.credits}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          credits: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Internal Marks</label>
                    <input
                      type="number"
                      min="0"
                      readOnly value={subjectForm.internalMarks}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          internalMarks: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>External Marks</label>
                    <input
                      type="number"
                      min="0"
                      readOnly value={subjectForm.externalMarks}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          externalMarks: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Total Marks</label>
                    <input
                      type="number"
                      min="0"
                      readOnly value={subjectForm.totalMarks}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          totalMarks: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Subject Status *</label>
                    <ProjectSelect
                      value={subjectForm.status}
                      onChange={(e) =>
                        setSubjectForm((previous) => ({
                          ...previous,
                          status: e.target.value,
                        }))
                      }
                    >
                      {SUBJECT_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </ProjectSelect>
                  </div>
                </div>

                <div className="cm-modal-footer">
                  <button
                    type="button"
                    className="cm-btn cm-btn-light"
                    onClick={() =>
                      setShowSubjectModal(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="cm-btn cm-btn-primary"
                  >
                    {editingSubjectId
                      ? 'Update Subject'
                      : 'Save Subject'}
                  </button>
                </div>
              </form>

          </ViewDialog>
        )}

        {showFrameworkModal && (
          <ViewDialog title={'Credit Framework'} onClose={() => setShowFrameworkModal(false)} busy={creditSaving} showExport={false} hideFooter maxWidth="1000px">
              <div className="cm-modal-header">
                <div>
                  <h2>Configure Credit Framework</h2>
                  <p>
                    Define program-level credit rules and
                    requirements.
                  </p>
                </div>

                <button
                  className="cm-modal-close"
                  onClick={() =>
                    setShowFrameworkModal(false)
                  }
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleFrameworkSubmit}>
                <div className="cm-form-grid">
                  <div className="cm-form-field">
                    <label>Total Program Credits</label>
                    <input
                      type="number"
                      min="1"
                      value={frameworkForm.totalProgramCredits}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          totalProgramCredits:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Minimum Semester Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={frameworkForm.minSemesterCredits}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          minSemesterCredits:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Maximum Semester Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={frameworkForm.maxSemesterCredits}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          maxSemesterCredits:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Passing Grade Point</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={frameworkForm.passingGradePoint}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          passingGradePoint:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Required Core Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={frameworkForm.requiredCoreCredits}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          requiredCoreCredits:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Required Elective Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={frameworkForm.requiredElectiveCredits}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          requiredElectiveCredits:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Required Project Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={frameworkForm.requiredProjectCredits}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          requiredProjectCredits:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cm-form-field">
                    <label>Required Mandatory Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={frameworkForm.requiredMandatoryCredits}
                      onChange={(e) =>
                        setFrameworkForm((previous) => ({
                          ...previous,
                          requiredMandatoryCredits:
                            e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="cm-modal-footer">
                  <button
                    type="button"
                    className="cm-btn cm-btn-light"
                    onClick={() =>
                      setShowFrameworkModal(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="cm-btn cm-btn-primary"
                  >
                    Save Framework
                  </button>
                </div>
              </form>
          </ViewDialog>
        )}
      </div>
    </DashboardLayout>
  )
}

export default CreditsManagement
