import ViewDialog from '../../../components/ViewDialog'
import { FiAlertTriangle } from 'react-icons/fi'
import * as gradeApi from '../../../services/scopedModulesService'
import ScopedModuleNotice from '../../../components/ScopedModuleNotice'
import { useScreenAccess } from '../../../auth/ScreenAccess'
import ResultReview from './ResultReview'
import { loadExaminationResultSheets } from '../../../services/examinationResultsService'
import * as pageDependency0 from 'react-router-dom'
import * as pageDependency1 from 'react-icons/fi'
import * as pageDependency2 from 'react'
import * as pageDependency3 from '../../../utils/gradeResultModel'
import * as pageDependency4 from '../../../components/SearchableSelect'
import * as pageDependency5 from '../../../layouts/DashboardLayout'
import * as pageDependency6 from '../../../components/PageHeader'
import * as pageDependency7 from '../../../components/FilterPanel'
import * as pageDependency8 from '../../../components/ExportMenu'
import * as pageDependency9 from '../../../components/TablePagination'
import * as pageDependency10 from '../../../context/AcademicContext'
import './GradeResultManagement.css'

// GradeToolsNav screen and private helpers.
const GradeToolsNavScreen = (() => {
const { NavLink } = pageDependency0
const { FiAward, FiPercent, FiFileText } = pageDependency1

function GradeToolsNav() {
  return <nav className="grade-tools-nav" aria-label="Grades and results workspace">
    <NavLink to="/results"><FiFileText aria-hidden="true" /><span>Official Results</span></NavLink>
    <NavLink to="/grade-result-management/grade-configuration" end><FiAward aria-hidden="true" /><span>Grade Scale</span></NavLink>
    <NavLink to="/grade-result-management/cgpa-calculator" end><FiPercent aria-hidden="true" /><span>Student GPA</span></NavLink>
  </nav>
}

return { default: GradeToolsNav }
})()

// GradeResultWorkspace screen and private helpers.
const GradeResultWorkspaceScreen = (() => {
const mergedGradePolicyEditorImport4 = pageDependency4
const mergedGradePolicyEditorImport5 = pageDependency2
const mergedGradePolicyEditorImport6 = pageDependency1
const mergedGradePolicyEditorImport7 = pageDependency3
const { ProjectSelect } = pageDependency4
const { useEffect, useMemo, useState } = pageDependency2
const { NavLink } = pageDependency0
const {
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiCpu,
  FiFileText,
  FiLayers,
  FiPrinter,
  FiSearch,
  FiSend,
  FiTrash2,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
  FiEye,
  FiAlertTriangle
} = pageDependency1
const DashboardLayout = pageDependency5.default
const PageHeader = pageDependency6.default
const FilterPanel = pageDependency7.default
const ExportMenu = pageDependency8.default
const TablePagination = pageDependency9.default
const { useAcademic } = pageDependency10
const {
  recordedBacklogs,
  latestSubjectAttempts,
  meanReportedGpa,
  defaultBands,
  flattenResults,
  gradeFor,
  gradingPresets,
  summarize,
  validateBands,
  matchesResultSearch,
  sortResultRows
} = pageDependency3
const SearchableSelect = pageDependency4.default
const GradeToolsNav = GradeToolsNavScreen.default

function ResultsTableFooter({ totalItems, page, pageSize, totalPages, onPageChange, onPageSizeChange }) {
  const firstItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0
  const lastItem = Math.min(page * pageSize, totalItems)
  return (
    <div className="res-table-footer">
      <div className="res-table-footer__info">
        <span>
          Showing <strong>{firstItem}</strong> to <strong>{lastItem}</strong> of <strong>{totalItems}</strong> entries
        </span>
        <label className="res-rows-selector">
          <span>Rows:</span>
          <ProjectSelect value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            <option value={5}>5</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </ProjectSelect>
        </label>
      </div>
      <TablePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}

function renderGradePill(grade) {
  if (!grade || grade === '-') return <span className="res-pill res-pill--neutral">-</span>
  const g = String(grade).toUpperCase()
  if (g === 'O') return <span className="res-pill res-pill--gold">O (Outstanding)</span>
  if (g === 'A+') return <span className="res-pill res-pill--emerald">A+ (Excellent)</span>
  if (g === 'A') return <span className="res-pill res-pill--teal">A (Very Good)</span>
  if (g === 'B+') return <span className="res-pill res-pill--blue">B+ (Good)</span>
  if (g === 'B') return <span className="res-pill res-pill--slate">B (Above Avg)</span>
  if (g === 'C' || g === 'P') return <span className="res-pill res-pill--amber">C (Pass)</span>
  if (g === 'F') return <span className="res-pill res-pill--rose">F (Fail)</span>
  return <span className="res-pill res-pill--neutral">{grade}</span>
}

function LocalGradeResultWorkspace({ screen }) {
  const academic = useAcademic()
  const scope = `${academic.selectedCollegeId || 'none'}:${academic.selectedAcademicYearId || 'none'}`
  return (
    <DashboardLayout>
      <Workspace key={`${scope}:${screen}`} screen={screen} academic={academic} />
    </DashboardLayout>
  )
}

const resultLabel = (value) => {
  if (value && typeof value === 'object') return String(value.name || value.departmentName || value.semesterName || value.label || '')
  return String(value ?? '').trim()
}
const resultId = (value, idKeys) => {
  if (value && typeof value === 'object') {
    for (const key of idKeys) if (value[key] !== undefined && value[key] !== null) return value[key]
  }
  return value
}
function resultDepartmentName(row, departments, branches) {
  const departmentId = resultId(row.departmentId, ['departmentId', 'id'])
  const matchingDepartment = departmentId !== undefined && departmentId !== null && departmentId !== ''
    ? departments.find((item) => String(item.departmentId ?? item.id) === String(departmentId))
    : null
  if (matchingDepartment) return resultLabel(matchingDepartment.departmentName ?? matchingDepartment.name)

  const branchId = resultId(row.branchId, ['branchId', 'id'])
  const branchName = resultLabel(row.branch)
  const branch = branches.find((item) =>
    (branchId && String(item.branchId ?? item.id) === String(branchId)) ||
    (branchName && resultLabel(item.branchName ?? item.name).toLowerCase() === branchName.toLowerCase())
  )
  if (branch) {
    const branchDepartmentId = resultId(branch.departmentId ?? branch.department, ['departmentId', 'id'])
    const branchDepartment = branchDepartmentId !== undefined && branchDepartmentId !== null && branchDepartmentId !== ''
      ? departments.find((item) => String(item.departmentId ?? item.id) === String(branchDepartmentId))
      : null
    const name = resultLabel(branch.departmentName ?? branch.department?.departmentName ?? branch.department?.name ?? branchDepartment?.departmentName ?? branchDepartment?.name)
    if (name) return name
  }
  return resultLabel(row.department) || branchName
}
function resultSemesterName(row, semesters) {
  const semesterId = resultId(row.semesterId, ['semesterId', 'id'])
  const matchingSemester = semesterId !== undefined && semesterId !== null && semesterId !== ''
    ? semesters.find((item) => String(item.semesterId ?? item.id) === String(semesterId))
    : null
  return resultLabel(matchingSemester?.semesterName ?? matchingSemester?.name) || resultLabel(row.semester) || (semesterId ? `Semester ${semesterId}` : '')
}
const sameResultLabel = (left, right) => resultLabel(left).toLowerCase().replace(/\s+/g, ' ') === resultLabel(right).toLowerCase().replace(/\s+/g, ' ')
const normalizedSemester = (value) => resultLabel(value).toLowerCase().replace(/^(semester|sem)\s*/, '').replace(/\s+/g, ' ')
const sameResultSemester = (left, right) => normalizedSemester(left) === normalizedSemester(right)
const compareResultSemesters = (left, right) => {
  const leftNumber = Number(normalizedSemester(left))
  const rightNumber = Number(normalizedSemester(right))
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber
  return String(left).localeCompare(String(right))
}

function Workspace({ screen, academic }) {
  const [searchParams] = pageDependency0.useSearchParams()
  const linkedExamId = searchParams.get('examId') || ''
  const linkedStudentId = searchParams.get('studentId') || ''
  const [bands, setBands] = useState(defaultBands)
  const [gpaStudentId, setGpaStudentId] = useState('')
  const [backendPolicy, setBackendPolicy] = useState(null)
  const [policyLoading, setPolicyLoading] = useState(true)
  const [policyLoaded, setPolicyLoaded] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(screen !== 'grade-configuration')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { canAction } = useScreenAccess()
  const canReview = canAction('/results', 'create') || canAction('/results', 'edit')
  const canSavePolicy = canAction('/grade-result-management/grade-configuration', backendPolicy ? 'edit' : 'create')
  const [query, setQuery] = useState('')
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [semesterPage, setSemesterPage] = useState(1)
  const [departmentPage, setDepartmentPage] = useState(1)
  const [cmmPage, setCmmPage] = useState(1)
  const [gradeCardPage, setGradeCardPage] = useState(1)

  // Modal state for viewing a student's complete course marks breakdown
  const [activeStudentModal, setActiveStudentModal] = useState(null)

  const { selectedCollegeId, selectedAcademicYearId, scopeRecords } = academic
  const departments = academic.activeDepartments || academic.departments || []
  const branches = academic.activeBranches || academic.branches || []
  const semesters = academic.activeSemesters || academic.semesters || []
  const configuration = screen === 'grade-configuration'
  const gpaHistory = screen === 'student-gpa'
  const resultReport = !configuration && !gpaHistory
  const ready = !academic.loading && Boolean(selectedCollegeId && selectedAcademicYearId)
  useEffect(() => {
    if (!configuration) return
    if (academic.loading || !selectedCollegeId || !selectedAcademicYearId) {
      setPolicyLoading(false)
      setPolicyLoaded(false)
      return
    }
    let current = true
    setError('')
    setPolicyLoading(true)
    setPolicyLoaded(false)
    gradeApi.loadGradePolicy({ collegeId: selectedCollegeId, academicYearId: selectedAcademicYearId }).then(policy => {
      if (!current) return
      if (policy && (!Array.isArray(policy.bands) || validateBands(policy.bands))) {
        throw new Error('The saved grade scale has invalid bands. Contact your administrator.')
      }
      setBackendPolicy(policy)
      setBands(policy?.bands || defaultBands)
      setPolicyLoaded(true)
    }).catch(reason => { if (current) setError(reason.status >= 500 ? 'The grade scale service could not load the policy. Retry or contact your administrator.' : reason.message) }).finally(() => { if (current) setPolicyLoading(false) })
    return () => { current = false }
  }, [configuration, academic.loading, selectedCollegeId, selectedAcademicYearId, refreshVersion])

  useEffect(() => {
    setPage(1)
    setSemesterPage(1)
    setDepartmentPage(1)
    setCmmPage(1)
    setDepartment('')
    setSemester('')
  }, [selectedCollegeId, selectedAcademicYearId])

  useEffect(() => {
    if (configuration) return
    if (academic.loading || !selectedCollegeId || !selectedAcademicYearId) {
      setLoading(false)
      setSheets([])
      return
    }
    let current = true
    setError('')
    setLoading(true)
    loadExaminationResultSheets({
        collegeId: selectedCollegeId || undefined,
        academicYearId: selectedAcademicYearId || undefined,
      })
      .then((data) => {
        if (current) setSheets(Array.isArray(data) ? data : [])
      })
      .catch(reason => {
        if (current) {
          setSheets([])
          setError(reason.message || 'Unable to load institutional results. Please refresh and try again.')
        }
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [configuration, academic.loading, selectedCollegeId, selectedAcademicYearId, refreshVersion])

  const rows = useMemo(() => {
    const scoped = scopeRecords(sheets)
    const all = flattenResults(scoped)
    return selectedAcademicYearId
      ? all.filter((row) => String(row.academicYearId) === String(selectedAcademicYearId))
      : all
  }, [sheets, scopeRecords, selectedAcademicYearId])

  // Aggregate student-level summaries (1 clean row per candidate)
  const studentSummaries = useMemo(() => {
    const map = new Map()
    const relevantRows = semester ? rows.filter(row => sameResultSemester(resultSemesterName(row, semesters), semester)) : rows
    relevantRows.forEach((row) => {
      if (!row.studentId) return
      if (!map.has(row.studentId)) {
        map.set(row.studentId, {
          studentId: row.studentId,
          studentName: row.studentName || row.studentId,
          rollNumber: row.registrationNumber || row.rollNumber || '',
          department: resultDepartmentName(row, departments, branches),
          semester: resultSemesterName(row, semesters),
          records: [],
        })
      }
      map.get(row.studentId).records.push(row)
    })

    return Array.from(map.values()).map((student) => {
      const records = student.records
      const attempts = latestSubjectAttempts(records)
      const totalCredits = attempts.reduce((sum, r) => sum + (r.credits || 0), 0)
      const totalMarks = attempts.reduce((sum, r) => sum + (r.totalMarks || 0), 0)
      const maxMarks = attempts.reduce((sum, r) => sum + (r.maximumMarks || 0), 0)
      const latest = records.reduce((chosen, row) => String(row.examDate) >= String(chosen.examDate) ? row : chosen)
      const gpa = semester ? latest.officialSgpa : latest.officialCgpa
      const status = latest.examResultStatus || 'Unavailable'
      const isPassed = status === 'Passed'

      return {
        ...student,
        semester: resultSemesterName(latest, semesters),
        totalCredits,
        totalMarks,
        maxMarks,
        percentage: maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0,
        gpa: gpa !== null ? gpa.toFixed(2) : '—',
        gpaNum: gpa,
        arrearsCount: latest.officialBacklogCount,
        status,
        isPassed,
        division: '—',
      }
    })
  }, [rows, departments, branches, semesters, semester])

  // Semester summaries
  const semesterSummaries = useMemo(() => {
    return summarize(rows, 'semester').map((item) => {
      const semRows = rows.filter((r) => (r.semester || 'Unassigned') === item.group)
      const gpa = meanReportedGpa(semRows)
      return {
        ...item,
        avgGpa: gpa !== null ? gpa.toFixed(2) : '—',
      }
    })
  }, [rows])

  // Department summaries
  const departmentSummaries = useMemo(() => {
    return summarize(rows, 'department').map((item) => {
      const deptRows = rows.filter((r) => (r.department || 'Unassigned') === item.group)
      const gpa = meanReportedGpa(deptRows)
      return {
        ...item,
        avgGpa: gpa !== null ? gpa.toFixed(2) : '—',
      }
    })
  }, [rows])

  // Backlog records
  const arrearRecords = useMemo(() => {
    return recordedBacklogs(sheets, rows)
  }, [sheets, rows])

  // Institutional KPI metrics
  const stats = useMemo(() => {
    const totalStudents = studentSummaries.length
    const passedStudents = studentSummaries.filter((s) => s.isPassed).length
    const decidedStudents = studentSummaries.filter(student => ['Passed', 'Failed'].includes(student.status)).length
    const passRate = decidedStudents ? `${((passedStudents / decidedStudents) * 100).toFixed(1)}%` : '—'
    const overallGpa = meanReportedGpa(rows, 'officialCgpa')
    return {
      totalStudents,
      passedStudents,
      passRate,
      overallGpa: overallGpa !== null ? overallGpa.toFixed(2) : '—',
      arrearsCount: studentSummaries.every(student => Number.isInteger(student.arrearsCount)) ? studentSummaries.reduce((sum, student) => sum + student.arrearsCount, 0) : '—',
    }
  }, [studentSummaries, rows, arrearRecords])

  // Filter options
  const semesterOptions = [...new Set([
    ...semesters.map((item) => item.semesterName || item.name || item.label).filter(Boolean),
    ...studentSummaries.map((student) => student.semester).filter(Boolean),
  ])].sort(compareResultSemesters)
  const departmentOptions = [...new Set([
    ...departments.map((item) => item.departmentName || item.name || item.label).filter(Boolean),
    ...studentSummaries.map((student) => student.department).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b))

  // Filtered student summaries for Student Results / Gazette table
  const filteredStudents = useMemo(() => {
    const q = query.toLowerCase().trim()
    return studentSummaries.filter((s) => {
      const matchQ =
        !q ||
        matchesResultSearch(s, q) ||
        s.records.some((record) => matchesResultSearch(record, q))
      const matchSem = !semester || sameResultSemester(s.semester, semester)
      const matchDept = !department || sameResultLabel(s.department, department)
      const matchStatus = !statusFilter || s.status.toLowerCase() === statusFilter.toLowerCase()
      return matchQ && matchSem && matchDept && matchStatus
    })
  }, [studentSummaries, query, semester, department, statusFilter])

  // Filtered arrear records for Backlog report
  const filteredArrears = useMemo(() => {
    const q = query.toLowerCase().trim()
    return arrearRecords.filter((r) => {
      const matchQ =
        !q ||
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.registrationNumber || '').toLowerCase().includes(q) ||
        (r.subjectCode || '').toLowerCase().includes(q) ||
        (r.subjectName || '').toLowerCase().includes(q)
      const matchSem = !semester || sameResultSemester(resultSemesterName(r, semesters), semester)
      const matchDept = !department || sameResultLabel(resultDepartmentName(r, departments, branches), department)
      return matchQ && matchSem && matchDept
    })
  }, [arrearRecords, query, semester, department, departments, branches, semesters])

  // Selected student for CMM transcript
  const [cmmStudentId, setCmmStudentId] = useState('')
  useEffect(() => {
    if (screen === 'consolidated-marks-memo' && !cmmStudentId && studentSummaries.length > 0) {
      setCmmStudentId(studentSummaries[0].studentId)
    }
  }, [screen, cmmStudentId, studentSummaries])

  const selectedCmmStudent = studentSummaries.find((s) => s.studentId === cmmStudentId)

  // Pagination for student list
  const totalItems = screen === 'backlog-report' ? filteredArrears.length : filteredStudents.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const visibleArrears = filteredArrears.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const semesterTotalPages = Math.max(1, Math.ceil(semesterSummaries.length / pageSize))
  const currentSemesterPage = Math.min(semesterPage, semesterTotalPages)
  const visibleSemesterSummaries = semesterSummaries.slice(
    (currentSemesterPage - 1) * pageSize,
    currentSemesterPage * pageSize,
  )
  const departmentTotalPages = Math.max(1, Math.ceil(departmentSummaries.length / pageSize))
  const currentDepartmentPage = Math.min(departmentPage, departmentTotalPages)
  const visibleDepartmentSummaries = departmentSummaries.slice(
    (currentDepartmentPage - 1) * pageSize,
    currentDepartmentPage * pageSize,
  )
  const cmmRecords = selectedCmmStudent?.records || []
  const cmmTotalPages = Math.max(1, Math.ceil(cmmRecords.length / pageSize))
  const currentCmmPage = Math.min(cmmPage, cmmTotalPages)
  const visibleCmmRecords = cmmRecords.slice(
    (currentCmmPage - 1) * pageSize,
    currentCmmPage * pageSize,
  )
  const gradeCardRecords = activeStudentModal?.records || []
  const gradeCardTotalPages = Math.max(1, Math.ceil(gradeCardRecords.length / pageSize))
  const currentGradeCardPage = Math.min(gradeCardPage, gradeCardTotalPages)
  const visibleGradeCardRecords = gradeCardRecords.slice(
    (currentGradeCardPage - 1) * pageSize,
    currentGradeCardPage * pageSize,
  )
  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setPage(1)
    setSemesterPage(1)
    setDepartmentPage(1)
    setCmmPage(1)
    setGradeCardPage(1)
  }

  const handleClearFilters = () => {
    setQuery('')
    setSemester('')
    setDepartment('')
    setStatusFilter('')
    setPage(1)
  }

  // Export columns
  const exportColumns = [
    { label: 'Roll Number', key: 'rollNumber' },
    { label: 'Candidate Name', key: 'studentName' },
    { label: 'Department', key: 'department' },
    { label: 'Semester', key: 'semester' },
    { label: 'Total Marks', key: 'totalMarks' },
    { label: 'SGPA', key: 'gpa' },
    { label: 'Division', key: 'division' },
    { label: 'Result Status', key: 'status' },
  ]

  return (
    <section className="res-workspace">
      {/* Sleek Standard Page Header with Institutional Stats */}
      <PageHeader
        title="Grades & Results"
        subtitle="Review official results, student GPA and grade scales for the selected academic year."
        compactSummary={resultReport && ready && !loading && !error ? [
          { label: 'Candidates', value: stats.totalStudents },
          { label: 'Result Pass Rate', value: stats.passRate },
          { label: 'Average CGPA', value: stats.overallGpa },
          { label: 'Latest Exam Backlogs', value: stats.arrearsCount },
        ] : undefined}
      />
      <GradeToolsNav />

      {resultReport && (
        <div className="res-nav-strip">
          <nav className="res-clean-nav" aria-label="Official results views">
            <NavLink to="/results" end className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiCpu />
              <span>Result Review & Directory</span>
            </NavLink>
            <NavLink
              to="/results/student-result"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <FiUser />
              <span>Student Results</span>
              <span className="res-nav-count">{studentSummaries.length}</span>
            </NavLink>
            <NavLink
              to="/results/semester-result"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <FiLayers />
              <span>Semester Summary</span>
              <span className="res-nav-count">{semesterSummaries.length}</span>
            </NavLink>
            <NavLink
              to="/results/department-result"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <FiBarChart2 />
              <span>Department Performance</span>
              <span className="res-nav-count">{departmentSummaries.length}</span>
            </NavLink>
            <NavLink
              to="/results/backlog-report"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <FiAlertCircle />
              <span>Backlogs & Arrears</span>
              {arrearRecords.length > 0 && (
                <span className="res-nav-count res-nav-count--danger">{arrearRecords.length}</span>
              )}
            </NavLink>
            <NavLink
              to="/results/consolidated-marks-memo"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <FiFileText />
              <span>Consolidated Memo (CMM)</span>
            </NavLink>
          </nav>
        </div>
      )}

      {notice && (
        <div className="res-notice" role="status">
          <FiCheckCircle />
          <span>{notice}</span>
        </div>
      )}
      {(!selectedCollegeId || !selectedAcademicYearId || academic.loading) && <p className="campus-notice" role="status">{academic.loading ? 'Loading college configuration…' : 'Select a college and active academic year to load institutional records.'}</p>}
      {error && (configuration ? (
        <div className="page-error-notice scoped-module-notice" role="alert">
          <FiAlertTriangle aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => setRefreshVersion(value => value + 1)}>Retry</button>
        </div>
      ) : <ScopedModuleNotice state={{ error, loading }} onRetry={async () => setRefreshVersion(value => value + 1)} />)}

      {/* ========================================================================= */}
      {/* 1. PUBLISH & GAZETTE VIEW (/results)                                     */}
      {/* ========================================================================= */}
      {screen === 'result-generation' && (
        <div className="res-section">
          {canReview && !academic.loading && selectedCollegeId && selectedAcademicYearId &&
            <ResultReview onReviewed={() => setRefreshVersion(value => value + 1)} key={JSON.stringify([selectedCollegeId, selectedAcademicYearId, linkedExamId, linkedStudentId])} initialExamId={linkedExamId} initialStudentId={linkedStudentId} collegeId={selectedCollegeId} academicYearId={selectedAcademicYearId} />}
          {canReview && <p className="campus-notice">Examination results can be reviewed here. Official publication requires a workflow that issues validated examination results.</p>}

          {/* Search, Filter & Student Gazette Table */}
          <div className="erp-card res-card">
            <div className="res-card-header">
              <div>
                <h3 className="res-card-title">Candidate Examination Results</h3>
                <p className="res-card-subtitle">
                  Review backend examination results for the selected college and academic year.
                </p>
              </div>
            </div>

            <FilterPanel
              className="results-filter-panel"
              active={Boolean(query || semester || department || statusFilter)}
              onClear={handleClearFilters}
              actions={
                <ExportMenu
                  rows={filteredStudents}
                  columns={exportColumns}
                  filename="official_results_gazette.csv"
                  title="Examination Results Report"
                  loading={loading}
                />
              }
            >
              <label className="res-search-input">
                <FiSearch />
                <input
                  type="search"
                  aria-label="Search candidates by name, roll number, or admission number"
                  placeholder="Search by student name, roll number, or admission number..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                />
              </label>
              <label className="res-filter-label">
                Department
                <ProjectSelect
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </ProjectSelect>
              </label>
              <label className="res-filter-label">
                Semester
                <ProjectSelect
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Semesters</option>
                  {semesterOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </ProjectSelect>
              </label>
              <label className="res-filter-label">
                Result Status
                <ProjectSelect
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Passed">Passed (All Clear)</option>
                  <option value="Failed">Arrears Pending</option>
                </ProjectSelect>
              </label>
            </FilterPanel>

            <div className="res-table-wrapper">
              <table className="erp-table res-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Candidate Name</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Marks Scored</th>
                    <th>Credits</th>
                    <th>SGPA</th>
                    <th>Division</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((item) => (
                    <tr key={item.studentId}>
                      <td>
                        <strong className="res-roll-badge">{item.rollNumber}</strong>
                      </td>
                      <td>
                        <div className="res-student-name">
                          <span className="res-avatar-sm">{item.studentName.charAt(0)}</span>
                          <strong>{item.studentName}</strong>
                        </div>
                      </td>
                      <td>{item.department}</td>
                      <td>{item.semester}</td>
                      <td>
                        <strong>{item.totalMarks}</strong> / {item.maxMarks}
                        <span className="res-pct-text"> ({item.percentage.toFixed(1)}%)</span>
                      </td>
                      <td>{item.totalCredits}</td>
                      <td>
                        <span className="res-gpa-badge">{item.gpa}</span>
                      </td>
                      <td>
                        <span className="res-division-text">{item.division}</span>
                      </td>
                      <td>
                        <span
                          className={`res-status-badge ${
                            item.status === 'Passed'
                              ? 'res-status-badge--pass'
                              : 'res-status-badge--fail'
                          }`}
                        >
                          {item.status === 'Passed'
                            ? 'PASSED'
                            : `${item.arrearsCount} ARREAR`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="res-action-btn res-action-btn--icon"
                          onClick={() => {
                            setActiveStudentModal(item)
                            setGradeCardPage(1)
                          }}
                          title="View complete course grade breakdown"
                          aria-label={`View grade card for ${item.studentName}`}
                        >
                          <FiEye aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleStudents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="res-empty-row">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <ResultsTableFooter
              totalItems={totalItems}
              page={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STUDENT RESULTS VIEW (/results/student-result)                          */}
      {/* ========================================================================= */}
      {screen === 'student-result' && (
        <div className="res-section">
          <div className="erp-card res-card">
            <div className="res-card-header">
              <div>
                <h3 className="res-card-title">Student Semester Grade Ledger</h3>
                <p className="res-card-subtitle">
                  Browse candidate results, verify individual course letter grades, or print official grade memos.
                </p>
              </div>
            </div>

            <FilterPanel
              active={Boolean(query || semester || department || statusFilter)}
              onClear={handleClearFilters}
              actions={
                <ExportMenu
                  rows={filteredStudents}
                  columns={exportColumns}
                  filename="student_results_ledger.csv"
                  title="Student Results Ledger"
                  loading={loading}
                />
              }
            >
              <label className="res-search-input">
                <FiSearch />
                <input
                  type="search"
                  aria-label="Search candidates by name, roll number, or admission number"
                  placeholder="Search by student name, roll number, or admission number..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                />
              </label>
              <label className="res-filter-label">
                Department
                <ProjectSelect
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </ProjectSelect>
              </label>
              <label className="res-filter-label">
                Semester
                <ProjectSelect
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Semesters</option>
                  {semesterOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </ProjectSelect>
              </label>
              <label className="res-filter-label">
                Status
                <ProjectSelect
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Passed">Passed (All Clear)</option>
                  <option value="Failed">Has Arrears</option>
                </ProjectSelect>
              </label>
            </FilterPanel>

            <div className="res-table-wrapper">
              <table className="erp-table res-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Candidate Name</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Marks</th>
                    <th>Credits</th>
                    <th>SGPA</th>
                    <th>Division</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Grade Card</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((item) => (
                    <tr key={item.studentId}>
                      <td>
                        <strong className="res-roll-badge">{item.rollNumber}</strong>
                      </td>
                      <td>
                        <div className="res-student-name">
                          <span className="res-avatar-sm">{item.studentName.charAt(0)}</span>
                          <strong>{item.studentName}</strong>
                        </div>
                      </td>
                      <td>{item.department}</td>
                      <td>{item.semester}</td>
                      <td>
                        <strong>{item.totalMarks}</strong> / {item.maxMarks}
                      </td>
                      <td>{item.totalCredits}</td>
                      <td>
                        <span className="res-gpa-badge">{item.gpa}</span>
                      </td>
                      <td>
                        <span className="res-division-text">{item.division}</span>
                      </td>
                      <td>
                        <span
                          className={`res-status-badge ${
                            item.isPassed ? 'res-status-badge--pass' : 'res-status-badge--fail'
                          }`}
                        >
                          {item.isPassed ? 'PASSED' : `${item.arrearsCount} ARREAR`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="res-action-btn res-action-btn--icon"
                          onClick={() => {
                            setActiveStudentModal(item)
                            setGradeCardPage(1)
                          }}
                          title="View grade card"
                          aria-label={`View grade card for ${item.studentName}`}
                        >
                          <FiEye aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleStudents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="res-empty-row">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <ResultsTableFooter
              totalItems={totalItems}
              page={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEMESTER SUMMARY VIEW (/results/semester-result)                       */}
      {/* ========================================================================= */}
      {screen === 'semester-result' && (
        <div className="res-section">
          {/* Clean Comparative Cards */}
          <div className="res-comp-grid">
            {semesterSummaries.map((sem) => {
              const passPct = parseFloat(sem.passRate) || 0
              return (
                <div key={sem.group} className="res-comp-card">
                  <div className="res-comp-card__top">
                    <h4>{sem.group}</h4>
                    <span className="res-comp-badge">{sem.passRate} Pass Rate</span>
                  </div>
                  <div className="res-comp-card__stats">
                    <div>
                      <span>Enrolled</span>
                      <strong>{sem.students}</strong>
                    </div>
                    <div>
                      <span>Passed</span>
                      <strong className="text-emerald">{sem.passed}</strong>
                    </div>
                    <div>
                      <span>Arrears</span>
                      <strong className="text-rose">{sem.failed}</strong>
                    </div>
                    <div>
                      <span>Average SGPA</span>
                      <strong>{sem.avgGpa}</strong>
                    </div>
                  </div>
                  <div className="res-comp-card__bar">
                    <div
                      className="res-comp-card__fill"
                      style={{ width: `${Math.min(100, passPct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Clean Summary Ledger */}
          <div className="erp-card res-card">
            <div className="res-card-header">
              <h3 className="res-card-title">Semester Performance Ledger</h3>
            </div>
            <div className="res-table-wrapper">
              <table className="erp-table res-table">
                <thead>
                  <tr>
                    <th>Semester Cycle</th>
                    <th>Enrolled Candidates</th>
                    <th>Assessment Units</th>
                    <th>Passed Units</th>
                    <th>Arrear Units</th>
                    <th>Pass Rate (%)</th>
                    <th>Average SGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSemesterSummaries.map((item) => (
                    <tr key={item.group}>
                      <td><strong>{item.group}</strong></td>
                      <td>{item.students}</td>
                      <td>{item.subjects}</td>
                      <td className="text-emerald"><strong>{item.passed}</strong></td>
                      <td className="text-rose"><strong>{item.failed}</strong></td>
                      <td>
                        <span className="res-status-badge res-status-badge--pass">{item.passRate}</span>
                      </td>
                      <td><strong>{item.avgGpa}</strong></td>
                    </tr>
                  ))}
                  {visibleSemesterSummaries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="res-empty-row">
                        No semester result records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ResultsTableFooter
              totalItems={semesterSummaries.length}
              page={currentSemesterPage}
              pageSize={pageSize}
              totalPages={semesterTotalPages}
              onPageChange={setSemesterPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DEPARTMENT PERFORMANCE VIEW (/results/department-result)               */}
      {/* ========================================================================= */}
      {screen === 'department-result' && (
        <div className="res-section">
          {/* Clean Comparative Cards */}
          <div className="res-comp-grid">
            {departmentSummaries.map((dept) => {
              const passPct = parseFloat(dept.passRate) || 0
              return (
                <div key={dept.group} className="res-comp-card">
                  <div className="res-comp-card__top">
                    <h4>{dept.group}</h4>
                    <span className="res-comp-badge">{dept.passRate} Pass Rate</span>
                  </div>
                  <div className="res-comp-card__stats">
                    <div>
                      <span>Enrolled</span>
                      <strong>{dept.students}</strong>
                    </div>
                    <div>
                      <span>Passed</span>
                      <strong className="text-emerald">{dept.passed}</strong>
                    </div>
                    <div>
                      <span>Arrears</span>
                      <strong className="text-rose">{dept.failed}</strong>
                    </div>
                    <div>
                      <span>Average SGPA</span>
                      <strong>{dept.avgGpa}</strong>
                    </div>
                  </div>
                  <div className="res-comp-card__bar">
                    <div
                      className="res-comp-card__fill"
                      style={{ width: `${Math.min(100, passPct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Clean Summary Table */}
          <div className="erp-card res-card">
            <div className="res-card-header">
              <h3 className="res-card-title">Engineering Department Performance Ledger</h3>
            </div>
            <div className="res-table-wrapper">
              <table className="erp-table res-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Enrolled Candidates</th>
                    <th>Assessment Units</th>
                    <th>Passed Units</th>
                    <th>Arrear Units</th>
                    <th>Pass Rate (%)</th>
                    <th>Average SGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDepartmentSummaries.map((item) => (
                    <tr key={item.group}>
                      <td><strong>{item.group}</strong></td>
                      <td>{item.students}</td>
                      <td>{item.subjects}</td>
                      <td className="text-emerald"><strong>{item.passed}</strong></td>
                      <td className="text-rose"><strong>{item.failed}</strong></td>
                      <td>
                        <span className="res-status-badge res-status-badge--pass">{item.passRate}</span>
                      </td>
                      <td><strong>{item.avgGpa}</strong></td>
                    </tr>
                  ))}
                  {visibleDepartmentSummaries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="res-empty-row">
                        No department result records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ResultsTableFooter
              totalItems={departmentSummaries.length}
              page={currentDepartmentPage}
              pageSize={pageSize}
              totalPages={departmentTotalPages}
              onPageChange={setDepartmentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BACKLOG & ARREARS VIEW (/results/backlog-report)                       */}
      {/* ========================================================================= */}
      {screen === 'backlog-report' && (
        <div className="res-section">
          {/* Clean Alert Banner */}
          <div className="res-alert-banner">
            <div className="res-alert-banner__content">
              <div className="res-alert-badge">
                <FiAlertTriangle />
                <span>Recorded Backlog History</span>
              </div>
              <h3>Backlog Candidates Remedial Center</h3>
              <p>
                {arrearRecords.length} backlog records returned for the selected academic scope.
                Review each record and its examination history.
              </p>
            </div>
            <div className="res-alert-banner__actions">
              <button
                type="button"
                className="res-btn res-btn--outline-danger"
                disabled
                title="No verified supplementary-notice delivery API is available."
              >
                <FiSend /> Supplementary Notices Unavailable
              </button>
              <button
                type="button"
                className="res-btn res-btn--primary"
                onClick={() => window.print()}
              >
                <FiPrinter /> Print Backlog Report
              </button>
            </div>
          </div>

          {/* Clean Backlog Table */}
          <div className="erp-card res-card">
            <div className="res-card-header">
              <h3 className="res-card-title">Candidates with Pending Arrears</h3>
              <p className="res-card-subtitle">
                Showing failed course attempts requiring remedial assessment clearance.
              </p>
            </div>

            <FilterPanel
              active={Boolean(query || semester || department)}
              onClear={handleClearFilters}
              actions={
                <ExportMenu
                  rows={filteredArrears}
                  columns={[
                    { label: 'Roll Number', key: 'registrationNumber' },
                    { label: 'Student Name', key: 'studentName' },
                    { label: 'Semester', key: 'semester' },
                    { label: 'Department', key: 'department' },
                    { label: 'Subject Code', key: 'subjectCode' },
                    { label: 'Subject Name', key: 'subjectName' },
                    { label: 'Marks Scored', key: 'totalMarks' },
                    { label: 'Attempt Date', key: 'examDate' },
                  ]}
                  filename="backlog_arrears_report.csv"
                  title="Backlog & Arrears Report"
                  loading={loading}
                />
              }
            >
              <div className="res-search-input">
                <FiSearch />
                <input
                  type="search"
                  placeholder="Search student, roll number, course code..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <label className="res-filter-label">
                Department
                <ProjectSelect
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </ProjectSelect>
              </label>
              <label className="res-filter-label">
                Semester
                <ProjectSelect
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Semesters</option>
                  {semesterOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </ProjectSelect>
              </label>
            </FilterPanel>

            <div className="res-table-wrapper">
              <table className="erp-table res-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Candidate Name</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Arrear Course</th>
                    <th>Course Title</th>
                    <th>Scored</th>
                    <th>Pass Min</th>
                    <th>Last Attempt</th>
                    <th>Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleArrears.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td><strong className="res-roll-badge">{item.registrationNumber}</strong></td>
                      <td><strong>{item.studentName}</strong></td>
                      <td>{item.department}</td>
                      <td>{item.semester}</td>
                      <td><span className="res-code-badge">{item.subjectCode}</span></td>
                      <td>{item.subjectName}</td>
                      <td className="text-rose"><strong>{item.totalMarks}</strong> / {item.maximumMarks}</td>
                      <td>40</td>
                      <td>{item.examDate || '2026-05-12'}</td>
                      <td>
                        <span className="res-status-badge res-status-badge--fail">
                          Supplementary Eligible
                        </span>
                      </td>
                    </tr>
                  ))}
                  {visibleArrears.length === 0 && (
                    <tr>
                      <td colSpan={10} className="res-empty-row">
                        No active backlogs found. All candidates have passed!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <ResultsTableFooter
              totalItems={totalItems}
              page={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CONSOLIDATED MARKS MEMO (CMM) (/results/consolidated-marks-memo)        */}
      {/* ========================================================================= */}
      {screen === 'consolidated-marks-memo' && (
        <div className="res-section">
          {/* Candidate Selection Toolbar */}
          <div className="res-cmm-bar">
            <div className="res-cmm-selector">
              <SearchableSelect
                label="Select Candidate for CMM Transcript"
                value={cmmStudentId}
                onChange={(value) => {
                  setCmmStudentId(value)
                  setCmmPage(1)
                }}
                options={studentSummaries.map(s => ({ value: s.studentId, label: `${s.studentName} (${s.rollNumber})`, subLabel: s.department }))}
                placeholder="Choose a candidate"
                searchPlaceholder="Search name, roll number or department..."
              />
            </div>
            <p className="res-card-subtitle">Official memo printing requires an issued document from the institution.</p>
          </div>

          {/* Official Autonomous Transcript Sheet */}
          {selectedCmmStudent && (
            <div className="res-transcript-sheet">
              <div className="res-transcript-header">
                <div className="res-transcript-seal">
                  <FiAward />
                </div>
                <div className="res-transcript-titles">
                  <h2>Consolidated Marks Preview</h2>
                  <p>Examination records for the selected academic year</p>
                </div>
              </div>

              <div className="res-transcript-meta">
                <div><span>Candidate Name:</span><strong>{selectedCmmStudent.studentName}</strong></div>
                <div><span>Hall Ticket No:</span><strong>{selectedCmmStudent.rollNumber}</strong></div>
                <div><span>Branch:</span><strong>{selectedCmmStudent.department}</strong></div>
                <div><span>Latest-attempt credits:</span><strong>{selectedCmmStudent.totalCredits}</strong></div>
                <div><span>Latest examination result:</span><strong>{selectedCmmStudent.status}</strong></div>
              </div>

              {/* Course Ledger Table */}
              <div className="res-table-wrapper" style={{ marginTop: '20px' }}>
                <table className="erp-table res-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Examination / Date</th>
                      <th>SGPA / CGPA</th>
                      <th>Credits</th>
                      <th>Internal</th>
                      <th>External</th>
                      <th>Total</th>
                      <th>Grade</th>
                      <th>Points</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCmmRecords.map((rec, i) => (
                      <tr key={rec.id || i}>
                        <td><strong>{rec.subjectCode}</strong></td>
                        <td>{rec.subjectName}</td>
                        <td>{rec.examType || '—'} / {rec.examDate || '—'}</td>
                        <td>{rec.officialSgpa ?? '—'} / {rec.officialCgpa ?? '—'}</td>
                        <td>{rec.credits}</td>
                        <td>{rec.internalMarks ?? '—'}</td>
                        <td>{rec.externalMarks ?? '—'}</td>
                        <td><strong>{rec.totalMarks}</strong></td>
                        <td>{renderGradePill(rec.grade)}</td>
                        <td>{rec.gradePoint ?? '—'}</td>
                        <td>
                          <span
                            className={`res-status-badge ${
                              String(rec.status).toLowerCase() === 'passed'
                                ? 'res-status-badge--pass'
                                : 'res-status-badge--fail'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {visibleCmmRecords.length === 0 && (
                      <tr>
                        <td colSpan={11} className="res-empty-row">
                          No course results are available for this candidate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <ResultsTableFooter
                totalItems={cmmRecords.length}
                page={currentCmmPage}
                pageSize={pageSize}
                totalPages={cmmTotalPages}
                onPageChange={setCmmPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. GRADE SCALE CONFIGURATION VIEW                                         */}
      {/* ========================================================================= */}
      {configuration && ready && policyLoading && <p role="status">Loading grade scale…</p>}
      {configuration && ready && policyLoaded && !policyLoading && !error && (
        <GradePolicyLab bands={bands} saved={Boolean(backendPolicy)} actions={canSavePolicy && <GradePolicyEditor bands={bands} onSave={async next => {
          const policy = await gradeApi.saveGradePolicy({ collegeId: selectedCollegeId, academicYearId: selectedAcademicYearId }, next, backendPolicy)
          setBackendPolicy(policy)
          setBands(policy.bands)
          setNotice('Preview scale saved.')
        }} />} />
      )}
      {gpaHistory && ready && loading && <p role="status">Loading student results…</p>}
      {gpaHistory && ready && !loading && !error && (
        <section className="erp-card res-card grade-workspace-panel" aria-labelledby="student-gpa-title">
          <h2 id="student-gpa-title">Student GPA</h2>
          <p>SGPA and CGPA recorded by the result engine for this academic year.</p>
          {studentSummaries.length ? <label className="grade-workspace-field">Student
            <ProjectSelect value={gpaStudentId} onChange={event => setGpaStudentId(event.target.value)}>
              <option value="">Select a student</option>
              {studentSummaries.map(student => <option key={student.studentId} value={student.studentId}>
                {student.studentName}{student.rollNumber ? ` (${student.rollNumber})` : ''}
              </option>)}
            </ProjectSelect>
          </label> : <p role="status">No calculated results are available for this academic year.</p>}
          {gpaStudentId && <div className="res-table-wrapper"><table className="erp-table">
            <thead><tr><th>Examination</th><th>Semester</th><th>SGPA</th><th>CGPA</th><th>Result</th></tr></thead>
            <tbody>{sheets.filter(sheet => String(sheet.records[0]?.studentId) === gpaStudentId).map(sheet => <tr key={sheet.id}>
              <td>{sheet.examType}</td><td>{resultSemesterName(sheet, semesters)}</td>
              <td>{sheet.officialSgpa ?? '—'}</td><td>{sheet.officialCgpa ?? '—'}</td><td>{sheet.examResultStatus || '—'}</td>
            </tr>)}</tbody>
          </table></div>}
        </section>
      )}

      {/* ========================================================================= */}
      {/* STUDENT GRADE CARD MODAL (Opened from View Grade Card Button)              */}
      {/* ========================================================================= */}
      {activeStudentModal && (
        <ViewDialog title="Student Grade Card Preview" subtitle={activeStudentModal.department+' · '+activeStudentModal.semester} onClose={() => setActiveStudentModal(null)} showExport={false} hideFooter maxWidth="1080px">
          <div className="res-grade-card-content">
            <div className="res-modal-profile">
              <div className="res-avatar-lg">{activeStudentModal.studentName.charAt(0)}</div>
              <div className="res-modal-profile__details">
                <h4>{activeStudentModal.studentName}</h4>
                <div className="res-modal-badges">
                  <span className="res-roll-badge">HT No: {activeStudentModal.rollNumber}</span>
                  <span className="res-code-badge">{activeStudentModal.department}</span>
                </div>
              </div>
              <div className="res-modal-scorecard">
                <div>
                  <small>SGPA</small>
                  <strong>{activeStudentModal.gpa}</strong>
                </div>
                <div>
                  <small>Credits</small>
                  <strong>{activeStudentModal.totalCredits}</strong>
                </div>
                <div>
                  <small>Total Marks</small>
                  <strong>{activeStudentModal.totalMarks} / {activeStudentModal.maxMarks}</strong>
                </div>
                <div>
                  <small>Result</small>
                  <span
                    className={`res-status-badge ${
                      activeStudentModal.isPassed ? 'res-status-badge--pass' : 'res-status-badge--fail'
                    }`}
                  >
                    {activeStudentModal.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="res-table-wrapper res-grade-card-table">
              <table className="erp-table res-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Title</th>
                    <th>Examination / Date</th>
                    <th>SGPA / CGPA</th>
                    <th>Credits</th>
                    <th>Internal</th>
                    <th>External</th>
                    <th>Total</th>
                    <th>Grade</th>
                    <th>Points</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGradeCardRecords.map((r, i) => (
                    <tr key={r.id || i}>
                      <td><strong>{r.subjectCode}</strong></td>
                      <td>{r.subjectName}</td>
                      <td>{r.examType || '—'} / {r.examDate || '—'}</td>
                      <td>{r.officialSgpa ?? '—'} / {r.officialCgpa ?? '—'}</td>
                      <td>{r.credits}</td>
                      <td>{r.internalMarks ?? '—'}</td>
                      <td>{r.externalMarks ?? '—'}</td>
                      <td><strong>{r.totalMarks}</strong></td>
                      <td>{renderGradePill(r.grade)}</td>
                      <td>{r.gradePoint ?? '—'}</td>
                      <td>
                        <span
                          className={`res-status-badge ${
                            String(r.status).toLowerCase() === 'passed'
                              ? 'res-status-badge--pass'
                              : 'res-status-badge--fail'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {visibleGradeCardRecords.length === 0 && (
                    <tr>
                      <td colSpan={11} className="res-empty-row">
                        No course results are available for this candidate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ResultsTableFooter
              totalItems={gradeCardRecords.length}
              page={currentGradeCardPage}
              pageSize={pageSize}
              totalPages={gradeCardTotalPages}
              onPageChange={setGradeCardPage}
              onPageSizeChange={handlePageSizeChange}
            />

            <div className="res-modal-footer">
              <p className="res-card-subtitle">Official grade card printing requires an issued document from the institution.</p>
              <button
                type="button"
                className="res-btn res-btn--primary"
                onClick={() => setActiveStudentModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </ViewDialog>
      )}
    </section>
  )
}

function GradeResultWorkspace(props) {
  return <LocalGradeResultWorkspace {...props} />
}

// Related GradePolicyEditor component and its private helpers.
const GradePolicyEditor = (() => {
const { ProjectSelect } = mergedGradePolicyEditorImport4;
const { useEffect, useRef, useState } = mergedGradePolicyEditorImport5;
const { FiEdit2, FiPlus, FiTrash2, FiX } = mergedGradePolicyEditorImport6;
const { validateBands } = mergedGradePolicyEditorImport7;

const empty = { grade: '', min: '', max: '', points: '', pass: true }
function GradePolicyEditor({ bands, onSave }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState([])
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const saveInFlight = useRef(false)
  const closeEditor = () => { if (!saveInFlight.current) setOpen(false) }
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    const escape = event => { if (event.key === 'Escape' && !saveInFlight.current) setOpen(false) }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])
  const submit = event => {
    event.preventDefault()
    const row = { ...form, grade: form.grade.trim().toUpperCase(), min: Number(form.min), max: Number(form.max), points: Number(form.points) }
    if (!row.grade || row.min < 0 || row.max > 100 || row.min >= row.max || row.points < 0 || row.points > 10 || draft.some((item, index) => index !== editing && item.grade.toUpperCase() === row.grade)) {
      setError('Enter a unique grade, a valid 0–100 range and 0–10 points.'); return
    }
    setDraft(current => editing === null ? [...current, row] : current.map((item, index) => index === editing ? row : item))
    setForm(null); setEditing(null); setError('')
  }
  const save = async () => {
    if (saveInFlight.current) return
    const issue = validateBands(draft)
    if (issue) { setError(issue); return }
    saveInFlight.current = true
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setOpen(false)
    } catch (reason) {
      setError(reason.message || 'Unable to save policy.')
    } finally {
      saveInFlight.current = false
      setSaving(false)
    }
  }
  return <>
    <div className="grade-editor-launch"><button type="button" onClick={() => { setDraft(bands.map(row => ({ ...row }))); setForm(null); setError(''); setOpen(true) }}><FiPlus aria-hidden="true" /> Manage Preview Scale</button></div>
    {open && <div className="grade-editor-backdrop" onClick={closeEditor}>
      <section className="grade-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="grade-editor-title" onClick={event => event.stopPropagation()}>
        <header><div><h3 id="grade-editor-title">Grade scale configuration</h3><p>Add, edit or remove grade bands, then save the policy.</p></div><button type="button" aria-label="Close grade editor" disabled={saving} onClick={closeEditor}><FiX /></button></header>
        <div className="grade-editor-body">
          <div className="grade-editor-toolbar"><strong>{draft.length} grade bands</strong><button type="button" onClick={() => { setEditing(null); setForm({ ...empty }); setError('') }}><FiPlus /> Add Grade</button></div>
          {error && <p className="grade-editor-error" role="alert">{error}</p>}
          {form && <form className="grade-editor-form" onSubmit={submit}>
            { [['grade', 'Grade'], ['min', 'Minimum %'], ['max', 'Maximum %'], ['points', 'Grade points']].map(([key, label]) => <label key={key}>{label}<input required type={key === 'grade' ? 'text' : 'number'} min="0" max={key === 'points' ? '10' : '100'} step="any" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
            <label>Result<ProjectSelect value={String(form.pass)} onChange={event => setForm({ ...form, pass: event.target.value === 'true' })}><option value="true">Pass</option><option value="false">Fail</option></ProjectSelect></label>
            <div><button type="submit">{editing === null ? 'Add Grade' : 'Update Grade'}</button><button type="button" onClick={() => setForm(null)}>Cancel</button></div>
          </form>}
          <div className="grade-editor-table"><table><thead><tr><th>Grade</th><th>Minimum %</th><th>Maximum %</th><th>Points</th><th>Result</th><th>Actions</th></tr></thead><tbody>
            {draft.map((row, index) => <tr key={index}><td><strong>{row.grade}</strong></td><td>{row.min}</td><td>{row.max}</td><td>{row.points}</td><td>{row.pass ? 'Pass' : 'Fail'}</td><td><button type="button" aria-label={`Edit grade ${row.grade}`} title="Edit grade" onClick={() => { setEditing(index); setForm({ ...row }); setError('') }}><FiEdit2 /></button><button type="button" aria-label={`Delete grade ${row.grade}`} title="Delete grade" onClick={() => { setDraft(draft.filter((_, i) => i !== index)); setForm(null); setError('') }}><FiTrash2 /></button></td></tr>)}
          </tbody></table></div>
          <p>Ranges must cover 0–100% without gaps or overlaps. Maximum is excluded except at 100%.</p>
        </div>
        <footer><button type="button" onClick={closeEditor} disabled={saving}>Cancel</button><button type="button" disabled={Boolean(form) || saving} onClick={save}>{saving ? 'Saving…' : 'Save Policy'}</button></footer>
      </section>
    </div>}
  </>
}

return GradePolicyEditor;
})();

function GradePolicyLab({ bands, saved, actions }) {
  const [score, setScore] = useState('')
  const grade = score !== '' && Number(score) >= 0 && Number(score) <= 100
    ? pageDependency3.gradeFor(Number(score), bands)
    : null
  return <section className="erp-card res-card grade-workspace-panel" aria-labelledby="grade-scale-title">
    <header className="grade-workspace-panel__header">
      <div>
        <h2 id="grade-scale-title">Grade scale preview</h2>
        <p>{saved ? 'Saved preview scale' : 'Default preview scale'} · Official grades come from the result engine.</p>
      </div>
      {actions}
    </header>
    <div className="res-table-wrapper"><table className="erp-table">
      <thead><tr><th>Grade</th><th>Minimum %</th><th>Maximum %</th><th>Points</th><th>Result</th></tr></thead>
      <tbody>{[...bands].sort((left, right) => right.min - left.min).map(band => <tr key={band.grade}>
        <td>{renderGradePill(band.grade)}</td><td>{band.min}</td><td>{band.max}</td>
        <td>{band.points}</td><td>{band.pass ? 'Pass' : 'Fail'}</td>
      </tr>)}</tbody>
    </table></div>
    <details className="grade-workspace-preview">
      <summary>Test a percentage</summary>
      <label className="grade-workspace-field">Score (%)
        <input type="number" min="0" max="100" step="any" value={score} onChange={event => setScore(event.target.value)} />
      </label>
      {grade && <p role="status">{grade.grade} · {grade.points} points · {grade.pass ? 'Pass' : 'Fail'}</p>}
    </details>
  </section>
}

return { default: GradeResultWorkspace }
})()

// BacklogReport screen and private helpers.
const BacklogReportScreen = (() => {
const GradeResultWorkspace = GradeResultWorkspaceScreen.default

function BacklogReport() {
  return <GradeResultWorkspace screen="backlog-report" />
}

return { default: BacklogReport }
})()

const CGPACalculatorPageScreen = {
  default: () => <GradeResultWorkspaceScreen.default screen="student-gpa" />,
}

// ConsolidatedMarksMemo screen and private helpers.
const ConsolidatedMarksMemoScreen = (() => {
const GradeResultWorkspace = GradeResultWorkspaceScreen.default

function ConsolidatedMarksMemo() {
  return <GradeResultWorkspace screen="consolidated-marks-memo" />
}

return { default: ConsolidatedMarksMemo }
})()

// DepartmentResult screen and private helpers.
const DepartmentResultScreen = (() => {
const GradeResultWorkspace = GradeResultWorkspaceScreen.default

function DepartmentResult() {
  return <GradeResultWorkspace screen="department-result" />
}

return { default: DepartmentResult }
})()

// GradeConfiguration screen and private helpers.
const GradeConfigurationScreen = (() => {
const GradeResultWorkspace = GradeResultWorkspaceScreen.default

function GradeConfiguration() {
  return <GradeResultWorkspace screen="grade-configuration" />
}

return { default: GradeConfiguration }
})()

// GradeResultManagement screen and private helpers.
const GradeResultManagementScreen = (() => {
const { Navigate } = pageDependency0

function GradeResultManagement() {
  return <Navigate to="/grade-result-management/grade-configuration" replace />
}

return { default: GradeResultManagement }
})()

// ResultGeneration screen and private helpers.
const ResultGenerationScreen = (() => {
const GradeResultWorkspace = GradeResultWorkspaceScreen.default

function ResultGeneration() {
  return <GradeResultWorkspace screen="result-generation" />
}

return { default: ResultGeneration }
})()

// ResultInsights screen and private helpers.
const ResultInsightsScreen = (() => {
const { resultAnalytics, resultIssues, summarize, weightedGpa } = pageDependency3

function ResultInsights({ rows, title = 'Performance insights' }) {
  const stats = resultAnalytics(rows)
  return <section className="grm-insights" aria-label={title}>
    <div className="grm-insights-heading"><h3>{title}</h3><span>{rows.length} assessment records in this view</span></div>
    <div className="grm-insight-metrics">{[['Pass rate', stats.passRate === null ? '-' : `${stats.passRate.toFixed(1)}%`], ['Average score', stats.average === null ? '-' : `${stats.average.toFixed(1)}%`], ['Highest score', stats.highest === null ? '-' : `${stats.highest.toFixed(1)}%`], ['Pending', stats.pending]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
    <div className="grm-insight-grid"><div><h4>Grade distribution</h4>{stats.distribution.length ? stats.distribution.map(({ grade, count }) => <div className="grm-grade-bar" key={grade}><span>{grade}</span><div role="img" aria-label={`${grade}: ${count} of ${rows.length} assessments`}><i style={{ width: `${count / rows.length * 100}%` }} /></div><strong>{count}</strong></div>) : <p>No grades in the current view.</p>}</div><div><h4>Data readiness</h4><div className="grm-readiness"><strong>{rows.length - stats.issues}<small>complete records</small></strong><strong>{stats.issues}<small>need review</small></strong></div><p>Readiness checks student/subject IDs, marks, maximum marks and credits. Pass rate uses completed assessments only; averages exclude invalid scores.</p></div></div>
  </section>
}

function ResultQuality({ rows }) {
  const issues = rows.map(row => ({ row, issues: resultIssues(row) })).filter(item => item.issues.length)
  if (!issues.length) return null
  const counts = new Map()
  issues.forEach(item => item.issues.forEach(issue => counts.set(issue, (counts.get(issue) || 0) + 1)))
  return <details className="grm-quality"><summary>Data quality review: {issues.length} assessment records need attention</summary><div className="grm-quality-content"><div className="grm-quality-tags">{[...counts].map(([label, count]) => <span key={label}>{label} <strong>{count}</strong></span>)}</div><ul>{issues.slice(0, 8).map(({ row, issues: labels }) => <li key={row.id}><strong>{row.studentName || row.studentId || 'Unknown student'} / {row.subjectCode || 'Unknown subject'}</strong><span>{labels.join(' · ')}</span></li>)}</ul>{issues.length > 8 && <p>Showing the first 8 of {issues.length} records requiring review.</p>}<p>Correct source records in Marks Management. These reports do not modify stored marks.</p></div></details>
}

function PreviewComparison({ before, after }) {
  const changed = after.filter((row, index) => row.grade !== before[index]?.grade || row.status !== before[index]?.status)
  const incomplete = after.filter(row => row.status === 'Incomplete').length
  return <div className="grm-preview-review"><div><small>Preview impact</small><strong>{changed.length} grade/result changes</strong><span>{incomplete} incomplete assessments</span></div><details><summary>Compare saved results with preview</summary><div className="grm-table-scroll"><table className="erp-table"><thead><tr><th>Student / Subject</th><th>Saved grade</th><th>Preview grade</th><th>Saved result</th><th>Preview result</th></tr></thead><tbody>{after.slice(0, 10).map((row, index) => <tr key={row.id}><td>{row.studentName || row.studentId} / {row.subjectCode}</td><td>{before[index]?.grade || '-'}</td><td>{row.grade}</td><td>{before[index]?.status || '-'}</td><td>{row.status}</td></tr>)}</tbody></table></div><p>Comparison shows the first 10 assessments. Export the preview for all calculated records.</p></details></div>
}

function StudentSemesterSummary({ rows }) {
  const groups = summarize(rows, 'semester')
  return <section className="grm-semester-overview"><h3>Semester performance</h3><div className="grm-table-scroll"><table className="erp-table"><thead><tr><th>Semester</th><th>Assessments</th><th>Passed</th><th>Failed</th><th>Pending</th><th>Average Reported SGPA</th></tr></thead><tbody>{groups.map(group => { const records = rows.filter(row => (row.semester || 'Unassigned') === group.group); const gpa = meanReportedGpa(records); return <tr key={group.group}><td>{group.group}</td><td>{group.subjects}</td><td>{group.passed}</td><td>{group.failed}</td><td>{group.pending}</td><td>{gpa === null ? '-' : gpa.toFixed(2)}</td></tr> })}</tbody></table></div><p>Semester averages use the latest backend-reported SGPA for each student.</p></section>
}

return { ResultInsights, ResultQuality, PreviewComparison, StudentSemesterSummary }
})()

// SemesterResult screen and private helpers.
const SemesterResultScreen = (() => {
const GradeResultWorkspace = GradeResultWorkspaceScreen.default

function SemesterResult() {
  return <GradeResultWorkspace screen="semester-result" />
}

return { default: SemesterResult }
})()

// StudentResult screen and private helpers.
const StudentResultScreen = (() => {
const GradeResultWorkspace = GradeResultWorkspaceScreen.default

function StudentResult() {
  return <GradeResultWorkspace screen="student-result" />
}

return { default: StudentResult }
})()

export const GradeToolsNav = GradeToolsNavScreen.default
export const GradeResultWorkspace = GradeResultWorkspaceScreen.default
export const BacklogReport = BacklogReportScreen.default
export const CGPACalculatorPage = CGPACalculatorPageScreen.default
export const ConsolidatedMarksMemo = ConsolidatedMarksMemoScreen.default
export const DepartmentResult = DepartmentResultScreen.default
export const GradeConfiguration = GradeConfigurationScreen.default
export const GradeResultManagement = GradeResultManagementScreen.default
export const ResultGeneration = ResultGenerationScreen.default
export const ResultInsights = ResultInsightsScreen.ResultInsights
export const ResultQuality = ResultInsightsScreen.ResultQuality
export const PreviewComparison = ResultInsightsScreen.PreviewComparison
export const StudentSemesterSummary = ResultInsightsScreen.StudentSemesterSummary
export const SemesterResult = SemesterResultScreen.default
export const StudentResult = StudentResultScreen.default
export default GradeResultManagement
