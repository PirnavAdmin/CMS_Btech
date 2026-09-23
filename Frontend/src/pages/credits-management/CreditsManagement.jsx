import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import { useAcademic } from '../../context/AcademicContext'
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

const DEFAULT_STUDENTS = [
  {
    id: 'STU-001',
    name: 'Rahul Kumar',
    rollNo: '21CSE001',
    branch: 'CSE',
    course: 'B.Tech',
    batch: '2023-2027',
    academicYear: '2025-2026',
    semester: 'Semester 5',
    year: '3rd Year',
    status: 'Active',
  },
  {
    id: 'STU-002',
    name: 'Priya Sharma',
    rollNo: '21CSE002',
    branch: 'CSE',
    course: 'B.Tech',
    batch: '2023-2027',
    academicYear: '2025-2026',
    semester: 'Semester 5',
    year: '3rd Year',
    status: 'Active',
  },
  {
    id: 'STU-003',
    name: 'Arjun Reddy',
    rollNo: '21ECE001',
    branch: 'ECE',
    course: 'B.Tech',
    batch: '2023-2027',
    academicYear: '2025-2026',
    semester: 'Semester 6',
    year: '3rd Year',
    status: 'Active',
  },
  {
    id: 'STU-004',
    name: 'Sneha Reddy',
    rollNo: '21ME001',
    branch: 'ME',
    course: 'B.Tech',
    batch: '2023-2027',
    academicYear: '2025-2026',
    semester: 'Semester 6',
    year: '3rd Year',
    status: 'Active',
  },
  {
    id: 'STU-005',
    name: 'Kiran Kumar',
    rollNo: '22CSE015',
    branch: 'CSE',
    course: 'B.Tech',
    batch: '2024-2028',
    academicYear: '2025-2026',
    semester: 'Semester 3',
    year: '2nd Year',
    status: 'Active',
  },
]

const DEFAULT_SUBJECTS = [
  {
    id: 'SUB-001',
    code: 'CS501',
    name: 'Data Structures and Algorithms',
    shortName: 'DSA',
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
    maxMarks: 100,
    status: 'Active',
  },
  {
    id: 'SUB-002',
    code: 'CS502',
    name: 'Database Management Systems',
    shortName: 'DBMS',
    branch: 'CSE',
    course: 'B.Tech',
    semester: 'Semester 5',
    academicYear: '2025-2026',
    type: 'Core',
    category: 'PCC',
    credits: 4,
    maxMarks: 100,
    status: 'Active',
  },
  {
    id: 'SUB-003',
    code: 'CS503',
    name: 'Machine Learning',
    shortName: 'ML',
    branch: 'CSE',
    course: 'B.Tech',
    semester: 'Semester 5',
    academicYear: '2025-2026',
    type: 'Elective',
    category: 'PEC',
    credits: 3,
    maxMarks: 100,
    status: 'Active',
  },
  {
    id: 'SUB-004',
    code: 'CS504',
    name: 'Data Structures Lab',
    shortName: 'DS Lab',
    branch: 'CSE',
    course: 'B.Tech',
    semester: 'Semester 5',
    academicYear: '2025-2026',
    type: 'Lab',
    category: 'PCC',
    credits: 2,
    maxMarks: 100,
    status: 'Active',
  },
  {
    id: 'SUB-005',
    code: 'EC601',
    name: 'Digital Communication',
    shortName: 'DC',
    branch: 'ECE',
    course: 'B.Tech',
    semester: 'Semester 6',
    academicYear: '2025-2026',
    type: 'Core',
    category: 'PCC',
    credits: 4,
    maxMarks: 100,
    status: 'Active',
  },
  {
    id: 'SUB-006',
    code: 'ME601',
    name: 'Thermal Engineering',
    shortName: 'TE',
    branch: 'ME',
    course: 'B.Tech',
    semester: 'Semester 6',
    academicYear: '2025-2026',
    type: 'Core',
    category: 'PCC',
    credits: 4,
    maxMarks: 100,
    status: 'Active',
  },
]

const DEFAULT_CREDITS = [
  {
    id: 'CR-001',
    studentId: 'STU-001',
    subjectId: 'SUB-001',
    subjectCode: 'CS501',
    subjectName: 'Data Structures and Algorithms',
    credits: 4,
    semester: 'Semester 5',
    academicYear: '2025-2026',
    grade: 'A',
    gradePoint: 8,
    status: 'Completed',
    type: 'Core',
    attempt: 1,
  },
  {
    id: 'CR-002',
    studentId: 'STU-001',
    subjectId: 'SUB-002',
    subjectCode: 'CS502',
    subjectName: 'Database Management Systems',
    credits: 4,
    semester: 'Semester 5',
    academicYear: '2025-2026',
    grade: 'A+',
    gradePoint: 9,
    status: 'Completed',
    type: 'Core',
    attempt: 1,
  },
  {
    id: 'CR-003',
    studentId: 'STU-002',
    subjectId: 'SUB-001',
    subjectCode: 'CS501',
    subjectName: 'Data Structures and Algorithms',
    credits: 4,
    semester: 'Semester 5',
    academicYear: '2025-2026',
    grade: 'B+',
    gradePoint: 7,
    status: 'Completed',
    type: 'Core',
    attempt: 1,
  },
  {
    id: 'CR-004',
    studentId: 'STU-003',
    subjectId: 'SUB-005',
    subjectCode: 'EC601',
    subjectName: 'Digital Communication',
    credits: 4,
    semester: 'Semester 6',
    academicYear: '2025-2026',
    grade: 'A',
    gradePoint: 8,
    status: 'Completed',
    type: 'Core',
    attempt: 1,
  },
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

const DEFAULT_AUDIT = [
  {
    id: 'AUD-001',
    action: 'Credit Configuration',
    description: 'Initial credit framework configured',
    user: 'Admin',
    date: new Date().toISOString(),
  },
]

function getStoredData(key, fallback) {
  try {
    const value = localStorage.getItem(key)

    if (!value) {
      return fallback
    }

    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function alignDemoAcademicYear(data, academicYear) {
  if (!Array.isArray(data)) return data

  return data.map((item) => {
    const isDemoRecord = String(item.id || '').match(/^(STU|SUB|CR)-00\d$/)
    const isLegacyDemoYear = item.academicYear === '2025-2026'

    return isDemoRecord && isLegacyDemoYear
      ? { ...item, academicYear }
      : item
  })
}

function normalizeAcademicYear(value) {
  return String(value || '').replace(/[–—]/g, '-').trim()
}

function getStudentYear(semester) {
  const number = Number(semester.replace(/\D/g, ''))

  if ([1, 2].includes(number)) return '1st Year'
  if ([3, 4].includes(number)) return '2nd Year'
  if ([5, 6].includes(number)) return '3rd Year'
  if ([7, 8].includes(number)) return '4th Year'

  return ''
}

function createId(prefix) {
  return `${prefix}-${Date.now()}`
}

function calculateStatus(grade) {
  return grade === 'F' ? 'Failed' : 'Completed'
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
  const [activeTab, setActiveTab] = useState('dashboard')

  const activeAcademicYear =
    normalizeAcademicYear(
      activeAcademicYears[0]?.academicYearName ||
        activeAcademicYears[0]?.name ||
        currentAcademicYear?.academicYearName ||
        currentAcademicYear?.name ||
        FALLBACK_ACADEMIC_YEAR
    )

  const [students, setStudents] = useState(() =>
    alignDemoAcademicYear(
      getStoredData(STORAGE_KEYS.students, DEFAULT_STUDENTS),
      activeAcademicYear
    )
  )

  const [subjects, setSubjects] = useState(() =>
    alignDemoAcademicYear(
      getStoredData(STORAGE_KEYS.subjects, DEFAULT_SUBJECTS),
      activeAcademicYear
    )
  )

  const [credits, setCredits] = useState(() =>
    alignDemoAcademicYear(
      getStoredData(STORAGE_KEYS.credits, DEFAULT_CREDITS),
      activeAcademicYear
    )
  )

  const [framework, setFramework] = useState(() =>
    getStoredData(STORAGE_KEYS.framework, DEFAULT_FRAMEWORK)
  )

  const [auditLogs, setAuditLogs] = useState(() =>
    getStoredData(STORAGE_KEYS.audit, DEFAULT_AUDIT)
  )

  const [dashboardFilters, setDashboardFilters] = useState(emptyFilters())
  const [studentFilters, setStudentFilters] = useState(emptyFilters())

  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const [subjectSearch, setSubjectSearch] = useState('')
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('All Types')

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

  useEffect(() => {
    saveData(STORAGE_KEYS.students, students)
  }, [students])

  useEffect(() => {
    saveData(STORAGE_KEYS.subjects, subjects)
  }, [subjects])

  useEffect(() => {
    saveData(STORAGE_KEYS.credits, credits)
  }, [credits])

  useEffect(() => {
    saveData(STORAGE_KEYS.framework, framework)
  }, [framework])

  useEffect(() => {
    saveData(STORAGE_KEYS.audit, auditLogs)
  }, [auditLogs])

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

  const showNotice = (type, message) => {
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
    const total = selectedStudentCredits.reduce(
      (sum, item) => sum + Number(item.credits || 0),
      0
    )

    const completed = selectedStudentCredits
      .filter((item) => item.status === 'Completed')
      .reduce((sum, item) => sum + Number(item.credits || 0), 0)

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
  }, [selectedStudentCredits, framework])

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

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const query = subjectSearch.trim().toLowerCase()

      const matchSearch =
        !query ||
        subject.code.toLowerCase().includes(query) ||
        subject.name.toLowerCase().includes(query) ||
        subject.shortName.toLowerCase().includes(query)

      const matchType =
        subjectTypeFilter === 'All Types' ||
        subject.type === subjectTypeFilter

      return matchSearch && matchType
    })
  }, [subjects, subjectSearch, subjectTypeFilter])

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

  const handleCreditSubmit = (event) => {
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

    const creditRecord = {
      id: editingCreditId || createId('CR'),
      studentId: student.id,
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      credits: Number(subject.credits),
      semester: student.semester,
      academicYear: student.academicYear,
      grade: gradeInfo.grade,
      gradePoint: gradeInfo.point,
      status: calculateStatus(gradeInfo.grade),
      type: subject.type,
      attempt: Number(creditForm.attempt) || 1,
    }

    if (editingCreditId) {
      setCredits((previous) =>
        previous.map((item) =>
          item.id === editingCreditId ? creditRecord : item
        )
      )

      addAudit(
        'Credit Updated',
        `${student.name} - ${subject.code} credit record updated`
      )

      showNotice('success', 'Credit record updated successfully.')
    } else {
      setCredits((previous) => [...previous, creditRecord])

      addAudit(
        'Credit Registered',
        `${student.name} - ${subject.code} credit registered`
      )

      showNotice('success', 'Credit submitted successfully.')
    }

    closeCreditModal()
    setSelectedStudentId(student.id)
  }

  const handleDeleteCredit = (credit) => {
    const student = students.find(
      (item) => item.id === credit.studentId
    )

    const confirmed = window.confirm(
      `Delete ${credit.subjectCode} credit for ${student?.name || 'student'}?`
    )

    if (!confirmed) return

    setCredits((previous) =>
      previous.filter((item) => item.id !== credit.id)
    )

    addAudit(
      'Credit Deleted',
      `${credit.subjectCode} credit removed from ${student?.name || credit.studentId}`
    )

    showNotice('success', 'Credit record deleted successfully.')
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

  const handleSubjectSubmit = (event) => {
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
      if (editingSubjectId && subject.id === editingSubjectId) {
        return false
      }

      return subject.code.toUpperCase() === code
    })

    if (duplicateCode) {
      showNotice('error', `Subject code ${code} already exists.`)
      return
    }

    const subjectRecord = {
      id: editingSubjectId || createId('SUB'),
      code,
      name,
      shortName: subjectForm.shortName.trim(),
      branch: subjectForm.branch,
      course: subjectForm.course,
      regulation: subjectForm.regulation,
      semester: subjectForm.semester,
      academicYear: subjectForm.academicYear,
      type: subjectForm.type,
      category: subjectForm.category.trim() || 'PCC',
      lectureHours: Number(subjectForm.lectureHours) || 0,
      tutorialHours: Number(subjectForm.tutorialHours) || 0,
      practicalHours: Number(subjectForm.practicalHours) || 0,
      credits: Number(subjectForm.credits),
      internalMarks: Number(subjectForm.internalMarks) || 0,
      externalMarks: Number(subjectForm.externalMarks) || 0,
      totalMarks: Number(subjectForm.totalMarks) || 0,
      status: subjectForm.status,
    }

    if (editingSubjectId) {
      setSubjects((previous) =>
        previous.map((subject) =>
          subject.id === editingSubjectId ? subjectRecord : subject
        )
      )

      addAudit(
        'Subject Updated',
        `${code} subject credit configuration updated`
      )

      showNotice('success', 'Subject configuration updated successfully.')
    } else {
      setSubjects((previous) => [...previous, subjectRecord])

      addAudit(
        'Subject Created',
        `${code} subject credit configuration created`
      )

      showNotice('success', 'Subject configuration created successfully.')
    }

    setShowSubjectModal(false)
    setEditingSubjectId(null)
  }

  const handleDeleteSubject = (subject) => {
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

    setSubjects((previous) =>
      previous.filter((item) => item.id !== subject.id)
    )

    addAudit(
      'Subject Deleted',
      `${subject.code} subject configuration deleted`
    )

    showNotice('success', 'Subject deleted successfully.')
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

    setFramework(nextFramework)

    addAudit(
      'Framework Updated',
      'Academic credit framework rules updated'
    )

    showNotice('success', 'Credit framework updated successfully.')
    setShowFrameworkModal(false)
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

  const handleResetDemoData = () => {
    const confirmed = window.confirm(
      'Reset Credit Management data to the default demo data?'
    )

    if (!confirmed) return

    setStudents(alignDemoAcademicYear(DEFAULT_STUDENTS, activeAcademicYear))
    setSubjects(alignDemoAcademicYear(DEFAULT_SUBJECTS, activeAcademicYear))
    setCredits(alignDemoAcademicYear(DEFAULT_CREDITS, activeAcademicYear))
    setFramework(DEFAULT_FRAMEWORK)
    setAuditLogs(DEFAULT_AUDIT)

    setSelectedStudentId('')
    setValidationResults([])

    showNotice('success', 'Credit Management demo data reset successfully.')
  }

  return (
    <DashboardLayout>
      <div className="cm-page">
        <header className="cm-header">
          <div>
            <div className="cm-breadcrumb">
              Administration <span>/</span> Academic Management
            </div>

            <h1>Credit Management</h1>

            <p>
              Manage academic credits, subject mappings, student
              registrations, validation and graduation requirements.
            </p>
          </div>

          <div className="cm-header-actions">
            <button
              className="cm-btn cm-btn-primary"
              onClick={openAddCreditModal}
            >
              + Add Credit
            </button>

            <button
              className="cm-btn cm-btn-secondary"
              onClick={runValidation}
            >
              Validate Credits
            </button>
          </div>
        </header>

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

        <nav className="cm-tabs">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>

          <button
            className={activeTab === 'students' ? 'active' : ''}
            onClick={() => setActiveTab('students')}
          >
            Student Credits
          </button>

          <button
            className={activeTab === 'subjects' ? 'active' : ''}
            onClick={() => setActiveTab('subjects')}
          >
            Subject Configuration
          </button>

          <button
            className={activeTab === 'framework' ? 'active' : ''}
            onClick={() => setActiveTab('framework')}
          >
            Credit Framework
          </button>

          <button
            className={activeTab === 'validation' ? 'active' : ''}
            onClick={() => setActiveTab('validation')}
          >
            Validation
            {duplicateRecords.length > 0 && (
              <span className="cm-tab-badge">
                {duplicateRecords.length}
              </span>
            )}
          </button>

          <button
            className={activeTab === 'reports' ? 'active' : ''}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>

          <button
            className={activeTab === 'audit' ? 'active' : ''}
            onClick={() => setActiveTab('audit')}
          >
            Audit History
          </button>
        </nav>

        {activeTab === 'dashboard' && (
          <section className="cm-content">
            <div className="cm-section-heading">
              <div>
                <h2>Credit Dashboard</h2>
                <p>
                  Monitor credit registration and academic credit status.
                </p>
              </div>
            </div>

            <div className="cm-filter-panel">
              <div className="cm-filter-panel-header">
                <div className="cm-filter-title">
                  <FilterIcon className="cm-filter-title-icon" />
                  Dashboard Filters
                </div>

                <div
                  className="cm-filter-menu-wrap"
                  ref={dashboardFilterMenuRef}
                >
                  <button
                    type="button"
                    className="cm-btn cm-btn-light cm-filter-trigger"
                    onClick={() => {
                      setShowDashboardFilterMenu((previous) => !previous)
                      setDashboardFilterDraft(dashboardFilters)
                    }}
                  >
                    <FilterIcon className="cm-filter-trigger-icon" />
                    <span>Filters</span>
                    <span className="cm-filter-trigger-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  {showDashboardFilterMenu && (
                    <div className="cm-filter-popover">
                      <div className="cm-filter-popover-grid">
                        <FilterSelect
                          label="Batch"
                          value={dashboardFilterDraft.batch}
                          onChange={(value) =>
                            updateDashboardFilterDraft('batch', value)
                          }
                          options={['All Batches', ...BATCHES]}
                        />

                        <FilterSelect
                          label="Academic Year"
                          value={dashboardFilterDraft.academicYear}
                          onChange={(value) =>
                            updateDashboardFilterDraft('academicYear', value)
                          }
                          options={[
                            'All Academic Years',
                            ...ACADEMIC_YEARS,
                          ]}
                        />

                        <FilterSelect
                          label="Semester"
                          value={dashboardFilterDraft.semester}
                          onChange={(value) =>
                            updateDashboardFilterDraft('semester', value)
                          }
                          options={['All Semesters', ...SEMESTERS]}
                        />

                        <FilterSelect
                          label="Branch"
                          value={dashboardFilterDraft.branch}
                          onChange={(value) =>
                            updateDashboardFilterDraft('branch', value)
                          }
                          options={['All Branches', ...BRANCHES]}
                        />

                        <FilterSelect
                          label="Student Year"
                          value={dashboardFilterDraft.year}
                          onChange={(value) =>
                            updateDashboardFilterDraft('year', value)
                          }
                          options={['All Years', ...STUDENT_YEARS]}
                        />

                        <FilterSelect
                          label="Course"
                          value={dashboardFilterDraft.course}
                          onChange={(value) =>
                            updateDashboardFilterDraft('course', value)
                          }
                          options={['All Courses', ...COURSES]}
                        />
                      </div>

                      <div className="cm-filter-popover-actions">
                        <button
                          type="button"
                          className="cm-btn cm-btn-light"
                          onClick={resetDashboardFilterDraft}
                        >
                          Reset
                        </button>

                        <button
                          type="button"
                          className="cm-btn cm-btn-primary"
                          onClick={applyDashboardFilters}
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="cm-stat-grid">
              <StatCard
                title="Students"
                value={dashboardStats.students}
                subtitle="Students matching filters"
                icon="◎"
              />

              <StatCard
                title="Registered Students"
                value={dashboardStats.studentsWithCredits}
                subtitle="Students with credits"
                icon="✓"
              />

              <StatCard
                title="Total Credits"
                value={dashboardStats.totalCredits}
                subtitle="Registered credits"
                icon="▣"
              />

              <StatCard
                title="Completed Credits"
                value={dashboardStats.completedCredits}
                subtitle="Successfully completed"
                icon="◉"
              />

              <StatCard
                title="Failed Credits"
                value={dashboardStats.failedCredits}
                subtitle="Backlog / failed"
                icon="!"
              />

              <StatCard
                title="Pending Students"
                value={dashboardStats.pendingStudents}
                subtitle="No credit records"
                icon="◌"
              />
            </div>

            <div className="cm-two-column">
              <div className="cm-card">
                <div className="cm-card-header">
                  <div>
                    <h3>Recent Credit Records</h3>
                    <p>Latest student credit registrations.</p>
                  </div>

                  <button
                    className="cm-link-btn"
                    onClick={() => setActiveTab('students')}
                  >
                    View All
                  </button>
                </div>

                <div className="cm-table-wrap">
                  <table className="cm-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Subject</th>
                        <th>Credits</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboardFilteredCredits
                        .slice(-8)
                        .reverse()
                        .map((credit) => {
                          const student = students.find(
                            (item) => item.id === credit.studentId
                          )

                          return (
                            <tr key={credit.id}>
                              <td>
                                <strong>
                                  {student?.name || credit.studentId}
                                </strong>
                                <small>
                                  {student?.rollNo || '-'}
                                </small>
                              </td>

                              <td>
                                <strong>{credit.subjectCode}</strong>
                                <small>{credit.subjectName}</small>
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
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cm-card">
                <div className="cm-card-header">
                  <div>
                    <h3>Credit Health</h3>
                    <p>Current academic credit indicators.</p>
                  </div>
                </div>

                <div className="cm-health-list">
                  <div className="cm-health-row">
                    <span>Completed</span>
                    <strong>
                      {dashboardStats.completedCredits}
                    </strong>
                  </div>

                  <div className="cm-health-row">
                    <span>Failed / Backlog</span>
                    <strong className="cm-danger-text">
                      {dashboardStats.failedCredits}
                    </strong>
                  </div>

                  <div className="cm-health-row">
                    <span>Program Requirement</span>
                    <strong>
                      {framework.totalProgramCredits}
                    </strong>
                  </div>

                  <div className="cm-health-row">
                    <span>Maximum Semester Credits</span>
                    <strong>
                      {framework.maxSemesterCredits}
                    </strong>
                  </div>

                  <div className="cm-health-row">
                    <span>Duplicate Records</span>
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

                <button
                  className="cm-full-btn"
                  onClick={() => setActiveTab('validation')}
                >
                  Open Validation Center
                </button>
              </div>
            </div>
          </section>
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
                        {student.name} — {student.rollNo}
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
            <div className="cm-section-heading">
              <div>
                <h2>Subject Credit Configuration</h2>
                <p>
                  Configure subject credits, mappings, categories and
                  academic requirements.
                </p>
              </div>

              <button
                className="cm-btn cm-btn-primary"
                onClick={openAddSubjectModal}
              >
                + Add Subject
              </button>
            </div>

            <div className="cm-toolbar">
              <div className="cm-search-field">
                <label>Search Subject</label>

                <input
                  type="text"
                  placeholder="Search code, name or short name..."
                  value={subjectSearch}
                  onChange={(e) =>
                    setSubjectSearch(e.target.value)
                  }
                />
              </div>

              <div className="cm-search-field">
                <label>Subject Type</label>

                <select
                  value={subjectTypeFilter}
                  onChange={(e) =>
                    setSubjectTypeFilter(e.target.value)
                  }
                >
                  <option>All Types</option>

                  {SUBJECT_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cm-card">
              <div className="cm-table-wrap cm-subject-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Course</th>
                      <th>Branch</th>
                      <th>Regulation</th>
                      <th>Semester</th>
                      <th>Academic Year</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Hours</th>
                      <th>Credits</th>
                      <th>Marks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSubjects.length === 0 ? (
                      <tr>
                        <td colSpan="13">
                          <EmptyState
                            title="No Subjects Found"
                            message="No subject configuration matches your search."
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

                          <td>{subject.course}</td>

                          <td>{subject.branch}</td>

                          <td>{subject.regulation || 'R22'}</td>

                          <td>{subject.semester}</td>

                          <td>{subject.academicYear}</td>

                          <td>
                            <span className="cm-type-badge">
                              {subject.type}
                            </span>
                          </td>

                          <td>{subject.category}</td>

                          <td>
                            {subject.lectureHours ?? 0} /{' '}
                            {subject.tutorialHours ?? 0} /{' '}
                            {subject.practicalHours ?? 0}
                          </td>

                          <td>
                            <span className="cm-credit-number">
                              {subject.credits}
                            </span>
                          </td>

                          <td>
                            {subject.internalMarks ?? 40} /{' '}
                            {subject.externalMarks ?? 60} /{' '}
                            {subject.totalMarks ?? subject.maxMarks ?? 100}
                          </td>

                          <td>
                            <StatusBadge status={subject.status} />
                          </td>

                          <td>
                            <div className="cm-action-group">
                              <button
                                className="cm-icon-btn"
                                onClick={() =>
                                  openEditSubjectModal(subject)
                                }
                                title="Edit subject"
                              >
                                ✎
                              </button>

                              <button
                                className="cm-icon-btn cm-icon-danger"
                                onClick={() =>
                                  handleDeleteSubject(subject)
                                }
                                title="Delete subject"
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
                              {credit.subjectCode} ·{' '}
                              {credit.semester} ·{' '}
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
                                {credit.subjectCode} ·{' '}
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
                <h3>Development Data</h3>
                <p>
                  Reset the local demo data while developing the
                  Credit Management module.
                </p>
              </div>

              <button
                className="cm-btn cm-btn-danger"
                onClick={handleResetDemoData}
              >
                Reset Demo Data
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
                          {student.name} — {student.rollNo} —{' '}
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
                          {subject.code} — {subject.name} —{' '}
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
                          {grade.grade} — {grade.point} Point
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
