import { collegeStorageKey } from '../../utils/collegeScope.js'
import useCollegeState from '../../hooks/useCollegeState'
import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import ExportMenu from '../../components/ExportMenu'
import CompactSummary from '../../components/CompactSummary'
import { FiRotateCcw } from 'react-icons/fi'
import { useAcademic } from '../../context/AcademicContext'
import { creditManagementApi, studentApi } from '../../api/apiEndpoints'
import subjectService from '../../services/subjectService'
import academicService from '../../services/academicService'
import { enrichSubject, idOf } from '../../utils/subjectDirectory'
import './CreditsManagement.css'

const STORAGE_KEYS = {
  students: 'cms-credit-students-v1',
  credits: 'cms-student-credits-v1',
  subjects: 'cms-credit-subjects-v1',
  framework: 'cms-credit-framework-v1',
  audit: 'cms-credit-audit-v1',
}

const BATCHES = [
  '2019-2023',
  '2020-2024',
  '2021-2025',
  '2022-2026',
  '2023-2027',
  '2024-2028',
  '2025-2029',
]

const ACADEMIC_YEARS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
]

const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
]

const BRANCHES = ['CSE', 'ECE', 'ME', 'EEE']

const COURSES = ['B.Tech', 'M.Tech', 'BCA', 'MCA']

const STUDENT_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
]

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

const DEFAULT_STUDENTS = []

const DEFAULT_SUBJECTS = []

const DEFAULT_CREDITS = []

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

const DEFAULT_AUDIT = []

function getStoredData(key, fallback) {
  try {
    const value = localStorage.getItem(collegeStorageKey(key))

    if (!value) {
      return fallback
    }

    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function saveData(key, data) {
  localStorage.setItem(collegeStorageKey(key), JSON.stringify(data))
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

const FALLBACK_ACADEMIC_YEAR = '2026-2027'

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

function FilterIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 4.5H18L12.2 10.4V15.5L7.8 17V10.4L2 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div className="cm-filter-field">
      <label>{label}</label>

      <div className="cm-filter-select-wrap">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <span className="cm-filter-select-caret" aria-hidden="true">
          ▾
        </span>
      </div>
    </div>
  )
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
  const { activeAcademicYears, currentAcademicYear } = useAcademic()
  const activeTab = 'subjects'

  const activeAcademicYear =
    normalizeAcademicYear(
      activeAcademicYears[0]?.academicYearName ||
        activeAcademicYears[0]?.name ||
        currentAcademicYear?.academicYearName ||
        currentAcademicYear?.name ||
        FALLBACK_ACADEMIC_YEAR
    )

  const [students, setStudents] = useCollegeState([])

  const [subjects, setSubjects] = useCollegeState([])

  const [credits, setCredits] = useCollegeState([], { students, subjects })

  const [framework] = useState(() =>
    getStoredData(STORAGE_KEYS.framework, DEFAULT_FRAMEWORK)
  )

  const [auditLogs, setAuditLogs] = useCollegeState([])
  const [creditLoading, setCreditLoading] = useState(true)
  const [masterCourses, setMasterCourses] = useCollegeState([])
  const [masterBranches, setMasterBranches] = useCollegeState([])
  const [masterSemesters, setMasterSemesters] = useCollegeState([])
  const [masterYears, setMasterYears] = useState([])
  const [masterDepartments, setMasterDepartments] = useCollegeState([])
  const [subjectFilters, setSubjectFilters] = useState({ academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '' })
  const [subjectApiError, setSubjectApiError] = useState('')
  const [creditDashboard, setCreditDashboard] = useState(null)
  const [creditSummary, setCreditSummary] = useState(null)

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
    grade: 'A',
    attempt: 1,
  })

  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    shortName: '',
    branch: 'CSE',
    course: 'B.Tech',
    regulation: 'R22',
    semester: 'Semester 5',
    academicYear: '2025-2026',
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

  const reloadCreditData = async () => {
    setCreditLoading(true)
    try {
      const subjectRowsPromise = subjectService.getSubjects({ liveOnly: true })
        .then(rows => { setSubjectApiError(''); return rows })
        .catch(error => { setSubjectApiError(error.message || 'Unable to load subjects from the Subject API.'); return [] })
      const [studentRows, subjectRows, registrationRows, courseRows, branchRows, semesterRows, yearRows, departmentRows, dashboard] = await Promise.all([
        studentApi.getAll(), subjectRowsPromise,
        creditManagementApi.getRegistrations({ status: 1 }), academicService.getCourses(), academicService.getBranches(), academicService.getSemesters(),
        academicService.getAcademicYears(), academicService.getDepartments(), creditManagementApi.getDashboard().catch(() => null),
      ])
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
        const subjectStatus = row.status
        const isActive = subjectStatus === undefined || subjectStatus === null || subjectStatus === true || Number(subjectStatus) === 1 || String(subjectStatus).toLowerCase() === 'active'
        const enriched = enrichSubject(row, { courses: courseList, branches: branchList, semesters: semesterList, years: yearList, departments: departmentList })
        return { ...enriched, id, subjectId: id, code: row.subjectCode || row.code || '', name: row.subjectName || row.name || '', credits: row.credits ?? null, type: row.subjectType || row.type || '', status: isActive ? 'Active' : 'Inactive', shortName: row.shortName || '' }
      })
      const creditsLive = (registrationRows || []).map(row => {
        const subject = subjectById.get(String(row.subjectId)) || {}
        const student = studentsLive.find(item => String(item.id) === String(row.studentId)) || {}
        const registrationStatus = String(row.registrationStatus || '').toUpperCase()
        return { ...row, id: String(row.studentCreditRegistrationId ?? row.id), studentId: String(row.studentId), subjectId: String(row.subjectId), subjectCode: row.subjectCode || subject.subjectCode || subject.code || '', subjectName: row.subjectName || subject.subjectName || subject.name || '', credits: Number(row.registeredCredits || 0), semesterId: row.semesterId, semester: row.semesterName || semesterList.find(item => String(item.semesterId ?? item.id) === String(row.semesterId))?.semesterName || '', academicYearId: row.academicYearId, academicYear: row.academicYearName || activeAcademicYear, grade: row.grade || '', gradePoint: Number(row.gradePoints || 0), status: registrationStatus === 'COMPLETED' ? 'Completed' : registrationStatus === 'FAILED' ? 'Failed' : registrationStatus === 'DROPPED' ? 'Dropped' : 'Registered', type: subject.subjectType || subject.type || 'Core', attempt: Number(row.attempt || 1), studentName: row.studentName || student.name }
      }).filter(row => row.id && row.id !== 'undefined')
      setStudents(studentsLive); setSubjects(subjectsLive); setCredits(creditsLive)
      setMasterCourses(courseList); setMasterBranches(branchList); setMasterSemesters(semesterList); setMasterYears(yearList); setMasterDepartments(departmentList)
      setCreditDashboard(dashboard)
    } catch (error) { showNotice('error', error.message || 'Unable to load credit management data from the API.') }
    finally { setCreditLoading(false) }
  }
  useEffect(() => { reloadCreditData() }, [])
  useEffect(() => {
    if (!selectedStudent?.id) { setCreditSummary(null); return }
    creditManagementApi.getSummary({ studentId: Number(selectedStudent.id) }).then(setCreditSummary).catch(() => setCreditSummary(null))
  }, [selectedStudentId, students])

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

  const dashboardStats = useMemo(() => {
    const totalCredits = dashboardFilteredCredits.reduce(
      (sum, item) => sum + Number(item.credits || 0),
      0
    )

    const completedCredits = dashboardFilteredCredits
      .filter((item) => item.status === 'Completed')
      .reduce((sum, item) => sum + Number(item.credits || 0), 0)

    const failedCredits = dashboardFilteredCredits
      .filter((item) => item.status === 'Failed')
      .reduce((sum, item) => sum + Number(item.credits || 0), 0)

    const studentsWithCredits = new Set(
      dashboardFilteredCredits.map((item) => item.studentId)
    ).size

    return {
      students: dashboardFilteredStudents.length,
      studentsWithCredits,
      totalCredits,
      completedCredits,
      failedCredits,
      pendingStudents: Math.max(
        dashboardFilteredStudents.length - studentsWithCredits,
        0
      ),
    }
  }, [dashboardFilteredStudents, dashboardFilteredCredits])

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = studentSearch.trim().toLowerCase()

      const matchesSearch =
        !query ||
        student.name.toLowerCase().includes(query) ||
        student.rollNo.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query)

      const matchBatch =
        studentFilters.batch === 'All Batches' ||
        student.batch === studentFilters.batch

      const matchAcademicYear =
        studentFilters.academicYear === 'All Academic Years' ||
        normalizeAcademicYear(student.academicYear) ===
          normalizeAcademicYear(studentFilters.academicYear)

      const matchSemester =
        studentFilters.semester === 'All Semesters' ||
        student.semester === studentFilters.semester

      const matchBranch =
        studentFilters.branch === 'All Branches' ||
        student.branch === studentFilters.branch

      const matchYear =
        studentFilters.year === 'All Years' ||
        student.year === studentFilters.year

      const matchCourse =
        studentFilters.course === 'All Courses' ||
        student.course === studentFilters.course

      return (
        matchesSearch &&
        matchBatch &&
        matchAcademicYear &&
        matchSemester &&
        matchBranch &&
        matchYear &&
        matchCourse
      )
    })
  }, [students, studentSearch, studentFilters])

  const selectedStudent = useMemo(() => {
    return students.find((student) => student.id === selectedStudentId) || null
  }, [students, selectedStudentId])

  const selectedStudentCredits = useMemo(() => {
    if (!selectedStudentId) return []

    return credits.filter(
      (credit) => credit.studentId === selectedStudentId
    )
  }, [credits, selectedStudentId])

  const selectedStudentSummary = useMemo(() => {
    const localTotal = selectedStudentCredits.reduce(
      (sum, item) => sum + Number(item.credits || 0),
      0
    )

    const localCompleted = selectedStudentCredits
      .filter((item) => item.status === 'Completed')
      .reduce((sum, item) => sum + Number(item.credits || 0), 0)
    const total = Number(creditSummary?.registeredCredits ?? localTotal)
    const completed = Number(creditSummary?.completedCredits ?? localCompleted)

    const failed = selectedStudentCredits
      .filter((item) => item.status === 'Failed')
      .reduce((sum, item) => sum + Number(item.credits || 0), 0)

    const core = selectedStudentCredits
      .filter((item) => item.type === 'Core' && item.status === 'Completed')
      .reduce((sum, item) => sum + Number(item.credits || 0), 0)

    const elective = selectedStudentCredits
      .filter(
        (item) => item.type === 'Elective' && item.status === 'Completed'
      )
      .reduce((sum, item) => sum + Number(item.credits || 0), 0)

    const percentage =
      framework.totalProgramCredits > 0
        ? Math.min(
            Math.round((completed / framework.totalProgramCredits) * 100),
            100
          )
        : 0

    const shortage = Math.max(
      Number(framework.totalProgramCredits) - completed,
      0
    )

    const graduationEligible =
      completed >= Number(framework.totalProgramCredits) &&
      core >= Number(framework.requiredCoreCredits) &&
      elective >= Number(framework.requiredElectiveCredits) &&
      failed === 0

    return {
      total,
      completed,
      failed,
      core,
      elective,
      percentage,
      shortage,
      graduationEligible,
    }
  }, [selectedStudentCredits, framework, creditSummary])

  const selectedStudentSemesterCredits = useMemo(() => {
    return SEMESTERS.map((semester) => {
      const semesterRecords = selectedStudentCredits.filter(
        (credit) => credit.semester === semester
      )
      const registered = semesterRecords.reduce(
        (sum, item) => sum + Number(item.credits || 0),
        0
      )
      const completed = semesterRecords
        .filter((item) => item.status === 'Completed')
        .reduce((sum, item) => sum + Number(item.credits || 0), 0)
      const failed = semesterRecords
        .filter((item) => item.status === 'Failed')
        .reduce((sum, item) => sum + Number(item.credits || 0), 0)

      return { semester, registered, completed, failed }
    }).filter((item) => item.registered > 0)
  }, [selectedStudentCredits])

  const selectedStudentDuplicateRecords = useMemo(() => {
    const seen = new Set()

    return selectedStudentCredits.filter((credit) => {
      const key = [
        credit.subjectId,
        credit.academicYear,
        credit.semester,
      ].join('|')

      if (seen.has(key)) return true
      seen.add(key)
      return false
    })
  }, [selectedStudentCredits])

  const subjectContexts = useMemo(() => subjects.map(subject => enrichSubject(subject, {
    courses: masterCourses, branches: masterBranches, semesters: masterSemesters,
    years: masterYears, departments: masterDepartments,
  })), [subjects, masterCourses, masterBranches, masterSemesters, masterYears, masterDepartments])
  const contextSubjects = useMemo(() => subjectContexts.filter(subject =>
    Object.entries(subjectFilters).every(([key, value]) => !value || String(subject[key] ?? '') === String(value))
  ), [subjectContexts, subjectFilters])
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
      let filtered = masterSemesters
      if (subjectFilters.courseId) {
        filtered = filtered.filter(s => !s.courseId || String(s.courseId) === String(subjectFilters.courseId))
      }
      if (subjectFilters.branchId) {
        filtered = filtered.filter(s => !s.branchId || String(s.branchId) === String(subjectFilters.branchId))
      }
      if (subjectFilters.level) {
        filtered = filtered.filter(semester => getStudentYear(String(getSemesterNumber(semester))) === subjectFilters.level)
      }
      return filtered.map(semester => {
        const number = getSemesterNumber(semester)
        const name = semester.semesterName || semester.name
        const label = name && !/^\s*\d{4}\s*[-/]\s*\d{2,4}\s*$/.test(name)
          ? name
          : (number > 0 ? `Semester ${number}` : 'Semester')
        return {
          value: String(semester.semesterId || semester.id),
          label,
        }
      })
    }
    return []
  }
  const updateSubjectFilter = (field, value) => {
    const childFields = {
      academicYearId: [],
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

  const resetDashboardFilters = () => {
    const resetValues = emptyFilters(activeAcademicYear)
    setDashboardFilters(resetValues)
    setDashboardFilterDraft(resetValues)
  }

  const applyDashboardFilters = () => {
    setDashboardFilters(dashboardFilterDraft)
    setShowDashboardFilterMenu(false)
  }

  const resetDashboardFilterDraft = () => {
    const resetValues = emptyFilters(activeAcademicYear)
    setDashboardFilterDraft(resetValues)
    setDashboardFilters(resetValues)
    setShowDashboardFilterMenu(false)
  }

  const updateDashboardFilterDraft = (field, value) => {
    setDashboardFilterDraft((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const resetStudentFilters = () => {
    const resetValues = emptyFilters(activeAcademicYear)
    setStudentFilters(resetValues)
    setStudentFilterDraft(resetValues)
    setStudentSearch('')
    setSelectedStudentId('')
  }

  const applyStudentFilters = () => {
    setStudentFilters(studentFilterDraft)
    setSelectedStudentId('')
    setShowStudentFilterMenu(false)
  }

  const updateDashboardFilter = (field, value) => {
    setDashboardFilters((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const updateStudentFilterDraft = (field, value) => {
    setStudentFilterDraft((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const updateStudentFilter = (field, value) => {
    setStudentFilters((previous) => ({
      ...previous,
      [field]: value,
    }))

    setSelectedStudentId('')
  }

  const openAddCreditModal = () => {
    setEditingCreditId(null)

    setCreditForm({
      studentId: selectedStudentId || '',
      subjectId: '',
      grade: 'A',
      attempt: 1,
    })

    setShowCreditModal(true)
  }

  const openEditCreditModal = (credit) => {
    setEditingCreditId(credit.id)

    setCreditForm({
      studentId: credit.studentId,
      subjectId: credit.subjectId,
      grade: credit.grade,
      attempt: credit.attempt || 1,
    })

    setShowCreditModal(true)
  }

  const closeCreditModal = () => {
    setShowCreditModal(false)
    setEditingCreditId(null)
  }

  const handleCreditSubmit = async (event) => {
    event.preventDefault()

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

    if (!gradeInfo) {
      showNotice('error', 'Please select a valid grade.')
      return
    }

    const mappingValid =
      student.branch === subject.branch &&
      student.course === subject.course

    if (!mappingValid) {
      showNotice(
        'error',
        `Subject ${subject.code} is not mapped to ${student.branch} - ${student.course}.`
      )
      return
    }

    if (student.semester !== subject.semester) {
      showNotice(
        'error',
        `Semester mismatch. Student is in ${student.semester}, but the subject belongs to ${subject.semester}.`
      )
      return
    }

    const duplicate = credits.some((item) => {
      if (editingCreditId && item.id === editingCreditId) {
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
    if (!subject.configurationId) {
      showNotice('error', 'This subject has no active credit configuration. Configure the existing subject before registering credits.')
      return
    }
    try {
      let registrationId = editingCreditId
      if (!editingCreditId) {
        const created = await creditManagementApi.createRegistration({ studentId: Number(student.id), subjectId: Number(subject.id), semesterId: Number(semesterId) })
        registrationId = created.studentCreditRegistrationId || created.registrationId || created.id
        if (!registrationId) throw new Error('Credit registration was created but the API response did not include its ID.')
      }
      await creditManagementApi.updateRegistration(registrationId, { registrationStatus: gradeInfo.grade === 'F' ? 'FAILED' : 'COMPLETED', grade: gradeInfo.grade, gradePoints: gradeInfo.point, isCompleted: true, status: 1 })
      await reloadCreditData()
    } catch (error) {
      showNotice('error', error.message || 'Unable to save the credit registration.')
      return
    }

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
    try {
      await creditManagementApi.updateRegistration(credit.id, { registrationStatus: 'DROPPED', grade: credit.grade || null, gradePoints: Number(credit.gradePoint || 0), isCompleted: false, status: 1 })
      await reloadCreditData()
      showNotice('success', 'Credit registration marked as dropped.')
    } catch (error) { showNotice('error', error.message || 'Unable to drop this credit registration.') }
  }

  const openAddSubjectModal = () => {
    setEditingSubjectId(null)

    setSubjectForm({
      code: '',
      name: '',
      shortName: '',
      branch: 'CSE',
      course: 'B.Tech',
      regulation: 'R22',
      semester: 'Semester 5',
      academicYear: '2025-2026',
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

    setShowSubjectModal(true)
  }

  const openEditSubjectModal = (subject) => {
    setEditingSubjectId(subject.id)

    setSubjectForm({
      code: subject.code,
      name: subject.name,
      shortName: subject.shortName,
      branch: subject.branch,
      course: subject.course,
      regulation: subject.regulation || 'R22',
      semester: subject.semester,
      academicYear: subject.academicYear,
      type: subject.type,
      category: subject.category,
      lectureHours: subject.lectureHours ?? 0,
      tutorialHours: subject.tutorialHours ?? 0,
      practicalHours: subject.practicalHours ?? 0,
      credits: subject.credits,
      internalMarks: subject.internalMarks ?? 40,
      externalMarks: subject.externalMarks ?? 60,
      totalMarks: subject.totalMarks ?? subject.maxMarks ?? 100,
      status: subject.status || 'Active',
    })

    setShowSubjectModal(true)
  }

  const handleSubjectSubmit = async (event) => {
    event.preventDefault()

    const code = subjectForm.code.trim().toUpperCase()
    const name = subjectForm.name.trim()

    if (!code || !name || !subjectForm.shortName.trim()) {
      showNotice('error', 'Please fill all required subject fields.')
      return
    }

    if (Number(subjectForm.credits) <= 0) {
      showNotice('error', 'Subject credits must be greater than zero.')
      return
    }

    const duplicateCode = subjects.some((subject) => {
      if (editingSubjectId && String(subject.configurationId) === String(editingSubjectId)) {
        return false
      }

      return subject.configurationId && String(subject.code).toUpperCase() === code
    })

    if (duplicateCode) {
      showNotice('error', `Subject code ${code} already exists.`)
      return
    }

    const masterSubject = subjects.find(subject => String(subject.code).toUpperCase() === code)
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
    const configPayload = { subjectId: Number(subjectId), courseId: Number(courseId), branchId: Number(branchId), semesterId: Number(semesterId), credits: Number(subjectForm.credits), minimumCredits: 0, maximumCredits: null, status: subjectForm.status === 'Active' ? 1 : 0 }
    try {
      if (editingSubjectId) await creditManagementApi.updateConfiguration(editingSubjectId, configPayload)
      else await creditManagementApi.createConfiguration(configPayload)
      await reloadCreditData()
    } catch (error) {
      showNotice('error', error.message || 'Unable to save credit configuration.')
      return
    }
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

  const handleDeleteSubject = async (subject) => {
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

    const confirmed = window.confirm(
      `Delete subject ${subject.code}?`
    )

    if (!confirmed) return

    if (!subject.configurationId) return showNotice('error', 'This subject has no credit configuration to deactivate.')
    try {
      await creditManagementApi.updateConfiguration(subject.configurationId, { subjectId: Number(subject.subjectId || subject.id), courseId: Number(subject.courseId), branchId: Number(subject.branchId), semesterId: Number(subject.semesterId), credits: Number(subject.credits), minimumCredits: 0, maximumCredits: null, status: 0 })
      await reloadCreditData()
      showNotice('success', 'Credit configuration marked inactive.')
    } catch (error) { showNotice('error', error.message || 'Unable to deactivate this credit configuration.') }
  }

  const openFrameworkModal = () => {
    setFrameworkForm(framework)
    setShowFrameworkModal(true)
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
      .join('\n')

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

  return (
    <DashboardLayout>
      <div className="cm-page">
        {notice.message && (
          <div className={`cm-alert cm-alert-${notice.type}`}>
            <span>
              {notice.type === 'success' ? '✓' : '⚠'}
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

        {activeTab === 'students' && (
          <section className="cm-content">
            <div className="cm-section-heading">
              <div>
                <h2>Student Credit Management</h2>
                <p>
                  Select a student and manage registered, completed and
                  failed credits.
                </p>
              </div>

              <div className="cm-header-actions">
                <button
                  className="cm-btn cm-btn-primary"
                  onClick={openAddCreditModal}
                >
                  + Register Credit
                </button>

                <button
                  className="cm-btn cm-btn-secondary"
                  onClick={runValidation}
                >
                  Validate Credits
                </button>
              </div>
            </div>

            <div className="cm-filter-panel">
              <div className="cm-filter-panel-header">
                <div className="cm-filter-title">
                  <FilterIcon className="cm-filter-title-icon" />
                  Student Selection & Filters
                </div>

                <div
                  className="cm-filter-menu-wrap"
                  ref={studentFilterMenuRef}
                >
                  <button
                    type="button"
                    className="cm-btn cm-btn-light cm-filter-trigger"
                    onClick={() => {
                      setShowStudentFilterMenu((previous) => !previous)
                      setStudentFilterDraft(studentFilters)
                    }}
                  >
                    <FilterIcon className="cm-filter-trigger-icon" />
                    <span>Filters</span>
                    <span className="cm-filter-trigger-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  {showStudentFilterMenu && (
                    <div className="cm-filter-popover">
                      <div className="cm-filter-popover-grid">
                        <FilterSelect
                          label="Batch"
                          value={studentFilterDraft.batch}
                          onChange={(value) =>
                            updateStudentFilterDraft('batch', value)
                          }
                          options={['All Batches', ...BATCHES]}
                        />

                        <FilterSelect
                          label="Academic Year"
                          value={studentFilterDraft.academicYear}
                          onChange={(value) =>
                            updateStudentFilterDraft('academicYear', value)
                          }
                          options={[
                            'All Academic Years',
                            ...ACADEMIC_YEARS,
                          ]}
                        />

                        <FilterSelect
                          label="Semester"
                          value={studentFilterDraft.semester}
                          onChange={(value) =>
                            updateStudentFilterDraft('semester', value)
                          }
                          options={['All Semesters', ...SEMESTERS]}
                        />

                        <FilterSelect
                          label="Branch"
                          value={studentFilterDraft.branch}
                          onChange={(value) =>
                            updateStudentFilterDraft('branch', value)
                          }
                          options={['All Branches', ...BRANCHES]}
                        />

                        <FilterSelect
                          label="Student Year"
                          value={studentFilterDraft.year}
                          onChange={(value) =>
                            updateStudentFilterDraft('year', value)
                          }
                          options={['All Years', ...STUDENT_YEARS]}
                        />

                        <FilterSelect
                          label="Course"
                          value={studentFilterDraft.course}
                          onChange={(value) =>
                            updateStudentFilterDraft('course', value)
                          }
                          options={['All Courses', ...COURSES]}
                        />
                      </div>

                      <div className="cm-filter-popover-actions">
                        <button
                          type="button"
                          className="cm-btn cm-btn-light"
                          onClick={resetStudentFilters}
                        >
                          Reset
                        </button>

                        <button
                          type="button"
                          className="cm-btn cm-btn-primary"
                          onClick={applyStudentFilters}
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="cm-search-row">
                <div className="cm-search-field">
                  <label>Search Student</label>

                  <input
                    type="text"
                    placeholder="Search by name, ID or roll number..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value)
                      setSelectedStudentId('')
                    }}
                  />
                </div>

                <div className="cm-search-field cm-student-select">
                  <label>Select Student</label>

                  <select
                    value={selectedStudentId}
                    onChange={(e) =>
                      setSelectedStudentId(e.target.value)
                    }
                  >
                    <option value="">
                      Select a student
                    </option>

                    {filteredStudents.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.name} - {student.rollNo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {!selectedStudent ? (
              <div className="cm-card">
                <EmptyState
                  title="Select a Student"
                  message="Use the filters and student selector above to view and manage individual credit records."
                />
              </div>
            ) : (
              <>
                <div className="cm-student-profile">
                  <div className="cm-student-avatar">
                    {selectedStudent.name.charAt(0)}
                  </div>

                  <div className="cm-student-main">
                    <h2>{selectedStudent.name}</h2>

                    <div className="cm-student-meta">
                      <span>{selectedStudent.id}</span>
                      <span>{selectedStudent.rollNo}</span>
                      <span>{selectedStudent.branch}</span>
                      <span>{selectedStudent.course}</span>
                      <span>{selectedStudent.batch}</span>
                      <span>{selectedStudent.semester}</span>
                    </div>
                  </div>

                  <div className="cm-student-status">
                    <span className="cm-label">Student Status</span>
                    <StatusBadge status={selectedStudent.status} />
                  </div>
                </div>

                <div className="cm-stat-grid cm-stat-grid-four">
                  <StatCard
                    title="Registered"
                    value={selectedStudentSummary.total}
                    subtitle="All registered credits"
                    icon="▣"
                  />

                  <StatCard
                    title="Completed"
                    value={selectedStudentSummary.completed}
                    subtitle="Passed credits"
                    icon="✓"
                  />

                  <StatCard
                    title="Backlog"
                    value={selectedStudentSummary.failed}
                    subtitle="Failed credits"
                    icon="!"
                  />

                  <StatCard
                    title="Shortage"
                    value={selectedStudentSummary.shortage}
                    subtitle="Credits remaining"
                    icon="↗"
                  />
                </div>

                <div className="cm-student-insight-grid">
                  <div className="cm-card cm-student-status-card">
                    <div className="cm-card-header">
                      <div>
                        <h3>Credit Status</h3>
                        <p>Current standing for this student.</p>
                      </div>

                      <span
                        className={
                          selectedStudentSummary.graduationEligible
                            ? 'cm-counter cm-counter-success'
                            : 'cm-counter cm-counter-danger'
                        }
                      >
                        {selectedStudentSummary.graduationEligible
                          ? 'Eligible'
                          : 'Pending'}
                      </span>
                    </div>

                    <div className="cm-student-status-list">
                      <div>
                        <span>Required Credits</span>
                        <strong>{framework.totalProgramCredits}</strong>
                      </div>
                      <div>
                        <span>Earned Credits</span>
                        <strong className="cm-success-text">
                          {selectedStudentSummary.completed}
                        </strong>
                      </div>
                      <div>
                        <span>Failed Credits</span>
                        <strong className="cm-danger-text">
                          {selectedStudentSummary.failed}
                        </strong>
                      </div>
                      <div>
                        <span>Credit Shortage</span>
                        <strong>{selectedStudentSummary.shortage}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="cm-card cm-student-status-card">
                    <div className="cm-card-header">
                      <div>
                        <h3>Backlogs & Duplicates</h3>
                        <p>Records that need attention.</p>
                      </div>
                    </div>

                    <div className="cm-student-status-list">
                      <div>
                        <span>Backlog Records</span>
                        <strong className="cm-danger-text">
                          {selectedStudentCredits.filter(
                            (credit) => credit.status === 'Failed'
                          ).length}
                        </strong>
                      </div>
                      <div>
                        <span>Backlog Credits</span>
                        <strong className="cm-danger-text">
                          {selectedStudentSummary.failed}
                        </strong>
                      </div>
                      <div>
                        <span>Duplicate Records</span>
                        <strong
                          className={
                            selectedStudentDuplicateRecords.length
                              ? 'cm-danger-text'
                              : 'cm-success-text'
                          }
                        >
                          {selectedStudentDuplicateRecords.length}
                        </strong>
                      </div>
                      <div>
                        <span>Credit History</span>
                        <strong>{selectedStudentCredits.length} records</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cm-card">
                  <div className="cm-card-header">
                    <div>
                      <h3>Semester-wise Credits</h3>
                      <p>Registered, completed and failed credits by semester.</p>
                    </div>
                  </div>

                  {selectedStudentSemesterCredits.length === 0 ? (
                    <EmptyState
                      title="No Semester Credits"
                      message="Semester-wise credit details will appear after registration."
                    />
                  ) : (
                    <div className="cm-semester-credit-grid">
                      {selectedStudentSemesterCredits.map((item) => (
                        <div className="cm-semester-credit-item" key={item.semester}>
                          <strong>{item.semester}</strong>
                          <span>Registered: {item.registered}</span>
                          <span className="cm-success-text">Completed: {item.completed}</span>
                          <span className={item.failed ? 'cm-danger-text' : ''}>
                            Failed: {item.failed}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="cm-card">
                  <div className="cm-card-header">
                    <div>
                      <h3>Graduation Progress</h3>
                      <p>
                        Progress against configured program credit
                        requirements.
                      </p>
                    </div>

                    <div
                      className={
                        selectedStudentSummary.graduationEligible
                          ? 'cm-eligibility cm-eligible'
                          : 'cm-eligibility cm-not-eligible'
                      }
                    >
                      {selectedStudentSummary.graduationEligible
                        ? 'Eligible for Graduation'
                        : 'Requirements Pending'}
                    </div>
                  </div>

                  <div className="cm-progress-wrapper">
                    <div className="cm-progress-header">
                      <span>Program Credits</span>
                      <strong>
                        {selectedStudentSummary.completed} /{' '}
                        {framework.totalProgramCredits}
                      </strong>
                    </div>

                    <div className="cm-progress">
                      <div
                        style={{
                          width: `${selectedStudentSummary.percentage}%`,
                        }}
                      />
                    </div>

                    <div className="cm-progress-footer">
                      <span>
                        {selectedStudentSummary.percentage}% completed
                      </span>

                      <span>
                        Core: {selectedStudentSummary.core} /{' '}
                        {framework.requiredCoreCredits}
                      </span>

                      <span>
                        Elective: {selectedStudentSummary.elective} /{' '}
                        {framework.requiredElectiveCredits}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="cm-card">
                  <div className="cm-card-header">
                    <div>
                      <h3>Student Credit Records</h3>
                      <p>
                        Complete history of this student's academic
                        credits.
                      </p>
                    </div>

                    <button
                      className="cm-btn cm-btn-primary"
                      onClick={openAddCreditModal}
                    >
                      + Submit Credit
                    </button>
                  </div>

                  <div className="cm-table-wrap">
                    <table className="cm-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Semester</th>
                          <th>Academic Year</th>
                          <th>Type</th>
                          <th>Credits</th>
                          <th>Grade</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedStudentCredits.length === 0 ? (
                          <tr>
                            <td colSpan="8">
                              <EmptyState
                                title="No Credit Records"
                                message="No credit has been registered for this student yet."
                              />
                            </td>
                          </tr>
                        ) : (
                          selectedStudentCredits.map((credit) => (
                            <tr key={credit.id}>
                              <td>
                                <strong>
                                  {credit.subjectCode}
                                </strong>
                                <small>
                                  {credit.subjectName}
                                </small>
                              </td>

                              <td>{credit.semester}</td>

                              <td>{credit.academicYear}</td>

                              <td>
                                <span className="cm-type-badge">
                                  {credit.type}
                                </span>
                              </td>

                              <td>
                                <span className="cm-credit-number">
                                  {credit.credits}
                                </span>
                              </td>

                              <td>
                                <span className="cm-grade">
                                  {credit.grade}
                                </span>
                              </td>

                              <td>
                                <StatusBadge
                                  status={credit.status}
                                />
                              </td>

                              <td>
                                <div className="cm-action-group">
                                  <button
                                    className="cm-icon-btn"
                                    title="Edit"
                                    onClick={() =>
                                      openEditCreditModal(credit)
                                    }
                                  >
                                    ✎
                                  </button>

                                  <button
                                    className="cm-icon-btn cm-icon-danger"
                                    title="Delete"
                                    onClick={() =>
                                      handleDeleteCredit(credit)
                                    }
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

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
                <ExportMenu
                  rows={filteredSubjects}
                  columns={subjectCreditExportColumns}
                  title="Subject Credits"
                  filename="subject-credits"
                  scope="Matching subject credits"
                  loading={creditLoading || Boolean(subjectApiError) || !subjectFiltersReady}
                />
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
                        value={subjectFilters[field]}
                        options={[{ value: '', label: `Select ${label}` }, ...subjectFilterOptions(field)]}
                        onChange={value => updateSubjectFilter(field, value)}
                        placeholder={`Select ${label}`}
                        searchPlaceholder={`Search ${label.toLowerCase()}...`}
                        noOptionsMessage={`No ${label.toLowerCase()} options found.`}
                      />
                    </label>
                  ))}
                  {Object.values(subjectFilters).some(Boolean) && (
                    <button
                      type="button"
                      className="filter-disclosure__clear-btn cm-subject-clear-btn"
                      onClick={() => setSubjectFilters({ academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '' })}
                    >
                      <FiRotateCcw aria-hidden="true" /> Clear Filters
                    </button>
                  )}
              </div>
            </FilterPanel>

            <div className="cm-card">
              <div className="cm-table-wrap cm-subject-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Academic Mapping</th>
                      <th>Credits</th>
                    </tr>
                  </thead>

                  <tbody>
                    {creditLoading ? (
                      <tr><td colSpan="3">Loading subjects and credits...</td></tr>
                    ) : subjectApiError ? (
                      <tr><td colSpan="3"><div className="cm-empty cm-empty--error" role="alert"><p>{subjectApiError}</p><button type="button" className="cm-btn cm-btn-light" onClick={reloadCreditData}>Retry</button></div></td></tr>
                    ) : !subjectFiltersReady ? (
                      <tr>
                        <td colSpan="3">
                          <EmptyState
                            title="Select Academic Filters"
                            message="Choose an academic year, course, branch, and semester to view subject credits."
                          />
                        </td>
                      </tr>
                    ) : filteredSubjects.length === 0 ? (
                      <tr>
                        <td colSpan="3">
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
                icon="!"
              />

              <StatCard
                title="Warnings"
                value={validationSummary.warnings}
                subtitle="Requires review"
                icon="△"
              />

              <StatCard
                title="Passed Checks"
                value={validationSummary.success}
                subtitle="Successful validations"
                icon="✓"
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

        {showCreditModal && (
          <div className="cm-modal-overlay">
            <div className="cm-modal">
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

                    <select
                      value={creditForm.studentId}
                      onChange={(e) =>
                        setCreditForm((previous) => ({
                          ...previous,
                          studentId: e.target.value,
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
                    </select>
                  </div>

                  <div className="cm-form-field cm-field-full">
                    <label>Subject *</label>

                    <select
                      value={creditForm.subjectId}
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

                      {subjects.map((subject) => (
                        <option
                          key={subject.id}
                          value={subject.id}
                        >
                          {subject.code} - {subject.name} -{' '}
                          {subject.credits} Credits
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Grade *</label>

                    <select
                      value={creditForm.grade}
                      onChange={(e) =>
                        setCreditForm((previous) => ({
                          ...previous,
                          grade: e.target.value,
                        }))
                      }
                    >
                      {GRADE_OPTIONS.map((grade) => (
                        <option
                          key={grade.grade}
                          value={grade.grade}
                        >
                          {grade.grade} - {grade.point} Point
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Attempt</label>

                    <input
                      type="number"
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
            </div>
          </div>
        )}

        {showSubjectModal && (
          <div className="cm-modal-overlay">
            <div className="cm-modal cm-modal-large">
              <div className="cm-modal-header">
                <div>
                  <h2>
                    {editingSubjectId
                      ? 'Edit Subject Configuration'
                      : 'Add Subject Configuration'}
                  </h2>

                  <p>
                    Configure subject mapping and credit requirements.
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
                <div className="cm-form-grid">
                  <div className="cm-form-field">
                    <label>Subject Code *</label>
                    <input
                      value={subjectForm.code}
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
                      value={subjectForm.shortName}
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
                      value={subjectForm.name}
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
                    <select
                      value={subjectForm.course}
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
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Branch *</label>
                    <select
                      value={subjectForm.branch}
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
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Regulation *</label>
                    <select
                      value={subjectForm.regulation}
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
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Semester *</label>
                    <select
                      value={subjectForm.semester}
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
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Academic Year *</label>
                    <select
                      value={subjectForm.academicYear}
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
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Subject Type *</label>
                    <select
                      value={subjectForm.type}
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
                    </select>
                  </div>

                  <div className="cm-form-field">
                    <label>Category *</label>
                    <input
                      value={subjectForm.category}
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
                      value={subjectForm.lectureHours}
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
                      value={subjectForm.tutorialHours}
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
                      value={subjectForm.practicalHours}
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
                      value={subjectForm.internalMarks}
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
                      value={subjectForm.externalMarks}
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
                      value={subjectForm.totalMarks}
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
                    <select
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
                    </select>
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
            </div>
          </div>
        )}

        {showFrameworkModal && (
          <div className="cm-modal-overlay">
            <div className="cm-modal cm-modal-large">
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
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default CreditsManagement
