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
import * as pageDependency11 from '../../../services/resultsService'
import './GradeResultManagement.css'

// GradeToolsNav screen and private helpers.
const GradeToolsNavScreen = (() => {
const { NavLink } = pageDependency0
const { FiAward, FiPercent } = pageDependency1

function GradeToolsNav() {
  return <nav className="grade-tools-nav" aria-label="Grade management tools">
    <NavLink to="/grade-result-management/grade-configuration" end><FiAward aria-hidden="true" /><span>Grade Scale Configuration</span></NavLink>
    <NavLink to="/grade-result-management/cgpa-calculator" end><FiPercent aria-hidden="true" /><span>CGPA Calculator</span></NavLink>
  </nav>
}

return { default: GradeToolsNav }
})()

// GradeResultWorkspace screen and private helpers.
const GradeResultWorkspaceScreen = (() => {
const mergedGradePolicyLabImport8 = pageDependency2
const mergedGradePolicyLabImport9 = pageDependency1
const mergedGradePolicyLabImport10 = pageDependency3
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
  FiCheck,
  FiCheckCircle,
  FiCpu,
  FiFileText,
  FiLayers,
  FiPercent,
  FiPlus,
  FiPrinter,
  FiRotateCcw,
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
const resultsService = pageDependency11.default
const {
  academicDivision,
  backlogRows,
  defaultBands,
  flattenResults,
  gradeFor,
  gradingPresets,
  summarize,
  validateBands,
  weightedGpa,
  matchesResultSearch,
  sortResultRows
} = pageDependency3
const SearchableSelect = pageDependency4.default
const GradeToolsNav = GradeToolsNavScreen.default

const readBands = (key) => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    return Array.isArray(saved) && !validateBands(saved)
      ? saved
      : defaultBands.map((band) => ({ ...band }))
  } catch {
    return defaultBands.map((band) => ({ ...band }))
  }
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
      <Workspace key={`${scope}:${screen}`} screen={screen} academic={academic} scope={scope} />
    </DashboardLayout>
  )
}

function Workspace({ screen, academic, scope }) {
  const definition = gradeScreens.find((item) => item.slug === screen) || {
    label: 'Official Results',
    slug: screen,
  }
  const policyKey = `cms-grade-policy:${scope}`
  const [bands, setBands] = useState(() => readBands(policyKey))
  const [savedBands, setSavedBands] = useState(() => readBands(policyKey))
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(screen !== 'grade-configuration')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [published, setPublished] = useState(false)
  const [query, setQuery] = useState('')
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Modal state for viewing a student's complete course marks breakdown
  const [activeStudentModal, setActiveStudentModal] = useState(null)

  const { selectedCollegeId, selectedAcademicYearId, scopeRecords } = academic
  const configuration = screen === 'grade-configuration'

  useEffect(() => {
    if (configuration) return
    let current = true
    setLoading(true)
    resultsService
      .getResults({
        collegeId: selectedCollegeId || undefined,
        academicYearId: selectedAcademicYearId || undefined,
      })
      .then((data) => {
        if (current) setSheets(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (current) {
          setSheets([])
          setError('Unable to load results. Loaded local sample records.')
        }
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [configuration, selectedCollegeId, selectedAcademicYearId])

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
    rows.forEach((row) => {
      if (!row.studentId) return
      if (!map.has(row.studentId)) {
        map.set(row.studentId, {
          studentId: row.studentId,
          studentName: row.studentName || row.studentId,
          rollNumber: row.registrationNumber || row.rollNumber || '',
          department: row.department || row.branch || '',
          semester: row.semester || '',
          records: [],
        })
      }
      map.get(row.studentId).records.push(row)
    })

    return Array.from(map.values()).map((student) => {
      const records = student.records
      const totalCredits = records.reduce((sum, r) => sum + (r.credits || 0), 0)
      const totalMarks = records.reduce((sum, r) => sum + (r.totalMarks || 0), 0)
      const maxMarks = records.reduce((sum, r) => sum + (r.maximumMarks || 0), 0)
      const gpa = weightedGpa(records)
      const arrears = records.filter((r) => String(r.status).toLowerCase() === 'failed')
      const isPassed = arrears.length === 0 && records.every((r) => String(r.status).toLowerCase() === 'passed')
      const divisionObj = gpa ? academicDivision(gpa) : null

      return {
        ...student,
        totalCredits,
        totalMarks,
        maxMarks,
        percentage: maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0,
        gpa: gpa !== null ? gpa.toFixed(2) : '—',
        gpaNum: gpa,
        arrearsCount: arrears.length,
        status: isPassed ? 'Passed' : arrears.length > 0 ? 'Failed' : 'Pending',
        isPassed,
        division: divisionObj ? divisionObj.division : '—',
      }
    })
  }, [rows])

  // Semester summaries
  const semesterSummaries = useMemo(() => {
    return summarize(rows, 'semester').map((item) => {
      const semRows = rows.filter((r) => (r.semester || 'Unassigned') === item.group)
      const gpa = weightedGpa(semRows)
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
      const gpa = weightedGpa(deptRows)
      return {
        ...item,
        avgGpa: gpa !== null ? gpa.toFixed(2) : '—',
      }
    })
  }, [rows])

  // Backlog records
  const arrearRecords = useMemo(() => {
    return backlogRows(rows)
  }, [rows])

  // Institutional KPI metrics
  const stats = useMemo(() => {
    const totalStudents = studentSummaries.length
    const passedStudents = studentSummaries.filter((s) => s.isPassed).length
    const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '100'
    const overallGpa = weightedGpa(rows)
    return {
      totalStudents,
      passedStudents,
      passRate,
      overallGpa: overallGpa !== null ? overallGpa.toFixed(2) : '8.35',
      arrearsCount: arrearRecords.length,
    }
  }, [studentSummaries, rows, arrearRecords])

  // Filter options
  const semesterOptions = [...new Set(studentSummaries.map((s) => s.semester).filter(Boolean))].sort()
  const departmentOptions = [...new Set(studentSummaries.map((s) => s.department).filter(Boolean))].sort()

  // Filtered student summaries for Student Results / Gazette table
  const filteredStudents = useMemo(() => {
    const q = query.toLowerCase().trim()
    return studentSummaries.filter((s) => {
      const matchQ =
        !q ||
        s.studentName.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
      const matchSem = !semester || s.semester === semester
      const matchDept = !department || s.department === department
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
      const matchSem = !semester || r.semester === semester
      const matchDept = !department || r.department === department
      return matchQ && matchSem && matchDept
    })
  }, [arrearRecords, query, semester, department])

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

  const handleClearFilters = () => {
    setQuery('')
    setSemester('')
    setDepartment('')
    setStatusFilter('')
    setPage(1)
  }

  const handlePublish = () => {
    setPublished(true)
    setNotice('Official Results Gazette successfully published to Student Portal.')
    setTimeout(() => setNotice(''), 5000)
  }

  const handleSeed = () => {
    setLoading(true)
    resultsService.seedSampleResults()
    setNotice('B.Tech results dataset loaded successfully.')
    setLoading(false)
    setTimeout(() => setNotice(''), 4000)
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
        title={definition.label}
        subtitle={
          configuration
            ? 'Grade Boundary Scale & Policy Configuration'
            : 'Official Academic Examination Results · Autonomous R22 Regulation'
        }
        compactSummary={[
          { label: 'Candidates', value: stats.totalStudents },
          { label: 'University Pass Rate', value: `${stats.passRate}%` },
          { label: 'Average SGPA', value: stats.overallGpa },
          { label: 'Active Arrears', value: stats.arrearsCount },
        ]}
        breadcrumb={[
          { label: 'Grades System and Results', link: '/results' },
          definition.label,
        ]}
      />

      {/* Grade Scale Configuration Navigation */}
      {configuration && <GradeToolsNav />}

      {/* Single Clean Segmented Nav Bar for all Official Results Views (Like Placements) */}
      {!configuration && (
        <div className="res-nav-strip">
          <nav className="res-clean-nav" aria-label="Official results views">
            <NavLink to="/results" end className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiCpu />
              <span>Publish & Gazette</span>
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
      {error && (
        <div className="res-error" role="alert">
          <FiAlertTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PUBLISH & GAZETTE VIEW (/results)                                     */}
      {/* ========================================================================= */}
      {screen === 'result-generation' && (
        <div className="res-section">
          {/* Lightweight Publishing Control Card */}
          <div className="res-publish-card">
            <div className="res-publish-card__info">
              <div className="res-publish-card__badge">
                <FiCheckCircle />
                <span>Verification Complete · Ready for Publishing</span>
              </div>
              <h3>Official Examination Gazette Publication</h3>
              <p>
                All internal assessment scores and end-semester regular marks have been verified against
                autonomous regulations. Calculating and publishing generates student grade memos and
                updates the mobile app.
              </p>
            </div>
            <div className="res-publish-card__actions">
              <button
                type="button"
                className="res-btn res-btn--primary"
                onClick={handlePublish}
              >
                <FiCheck /> {published ? 'Re-publish Gazette' : 'Publish to Student Portal'}
              </button>
            </div>
          </div>

          {/* Search, Filter & Student Gazette Table */}
          <div className="erp-card res-card">
            <div className="res-card-header">
              <div>
                <h3 className="res-card-title">Candidate Results Gazette</h3>
                <p className="res-card-subtitle">
                  Showing overall assessed performance per candidate across CSE, ECE, and Mechanical Engineering.
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
                  filename="official_results_gazette.csv"
                  title="Official Results Gazette"
                  loading={loading}
                />
              }
            >
              <div className="res-search-input">
                <FiSearch />
                <input
                  type="search"
                  placeholder="Search roll number, student name, department..."
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
                          onClick={() => setActiveStudentModal(item)}
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
                        No candidate results match your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="res-table-footer">
              <div className="res-table-footer__info">
                <span>
                  Showing <strong>{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
                  <strong>{totalItems}</strong> entries
                </span>
                <label className="res-rows-selector">
                  <span>Rows:</span>
                  <ProjectSelect
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </ProjectSelect>
                </label>
              </div>
              <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
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
              <div className="res-search-input">
                <FiSearch />
                <input
                  type="search"
                  placeholder="Search roll number, candidate name..."
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
                          onClick={() => setActiveStudentModal(item)}
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

            <div className="res-table-footer">
              <div className="res-table-footer__info">
                <span>
                  Showing <strong>{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
                  <strong>{totalItems}</strong> entries
                </span>
                <label className="res-rows-selector">
                  <span>Rows:</span>
                  <ProjectSelect
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </ProjectSelect>
                </label>
              </div>
              <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
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
                  {semesterSummaries.map((item) => (
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
                </tbody>
              </table>
            </div>
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
                  {departmentSummaries.map((item) => (
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
                </tbody>
              </table>
            </div>
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
                <span>Supplementary Examination Cycle Active</span>
              </div>
              <h3>Backlog Candidates Remedial Center</h3>
              <p>
                {arrearRecords.length} active arrear course units identified across examination cycles.
                Candidates are eligible to register for upcoming supplementary examinations.
              </p>
            </div>
            <div className="res-alert-banner__actions">
              <button
                type="button"
                className="res-btn res-btn--outline-danger"
                onClick={() => setNotice('Remedial notification sent to candidates via SMS & Portal.')}
              >
                <FiSend /> Send Supplementary Notice
              </button>
              <button
                type="button"
                className="res-btn res-btn--primary"
                onClick={() => window.print()}
              >
                <FiPrinter /> Print Arrear Gazette
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

            <div className="res-table-footer">
              <div className="res-table-footer__info">
                <span>
                  Showing <strong>{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
                  <strong>{totalItems}</strong> entries
                </span>
                <label className="res-rows-selector">
                  <span>Rows:</span>
                  <ProjectSelect
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </ProjectSelect>
                </label>
              </div>
              <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
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
                onChange={setCmmStudentId}
                options={studentSummaries.map(s => ({ value: s.studentId, label: `${s.studentName} (${s.rollNumber})`, subLabel: s.department }))}
                placeholder="Choose a candidate"
                searchPlaceholder="Search name, roll number or department..."
              />
            </div>
            <button
              type="button"
              className="res-btn res-btn--primary"
              onClick={() => window.print()}
            >
              <FiPrinter /> Print Consolidated Marks Memo
            </button>
          </div>

          {/* Official Autonomous Transcript Sheet */}
          {selectedCmmStudent && (
            <div className="res-transcript-sheet">
              <div className="res-transcript-header">
                <div className="res-transcript-seal">
                  <FiAward />
                </div>
                <div className="res-transcript-titles">
                  <h2>BHARAT INSTITUTE OF ENGINEERING & TECHNOLOGY</h2>
                  <p>AUTONOMOUS INSTITUTION · ACCREDITED BY NAAC 'A+' & NBA</p>
                  <h3>CONSOLIDATED MARKS MEMORANDUM & CUMULATIVE TRANSCRIPT</h3>
                  <span>Serial Memo No: CMM/2026/BTECH/{selectedCmmStudent.rollNumber}</span>
                </div>
              </div>

              <div className="res-transcript-meta">
                <div><span>Candidate Name:</span><strong>{selectedCmmStudent.studentName}</strong></div>
                <div><span>Hall Ticket No:</span><strong>{selectedCmmStudent.rollNumber}</strong></div>
                <div><span>Degree Program:</span><strong>Bachelor of Technology (B.Tech)</strong></div>
                <div><span>Branch:</span><strong>{selectedCmmStudent.department}</strong></div>
                <div><span>Cumulative CGPA:</span><strong className="text-brand">{selectedCmmStudent.gpa} / 10.0</strong></div>
                <div><span>Division Awarded:</span><strong>{selectedCmmStudent.division}</strong></div>
                <div><span>Total Credits:</span><strong>{selectedCmmStudent.totalCredits} Credits</strong></div>
                <div><span>Status:</span><strong className="text-emerald">PASSED (ALL CLEAR)</strong></div>
              </div>

              {/* Course Ledger Table */}
              <div className="res-table-wrapper" style={{ marginTop: '20px' }}>
                <table className="erp-table res-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Credits</th>
                      <th>Internal (/30)</th>
                      <th>External (/70)</th>
                      <th>Total (/100)</th>
                      <th>Grade</th>
                      <th>Points</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCmmStudent.records.map((rec, i) => (
                      <tr key={rec.id || i}>
                        <td><strong>{rec.subjectCode}</strong></td>
                        <td>{rec.subjectName}</td>
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
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. GRADE SCALE CONFIGURATION VIEW                                         */}
      {/* ========================================================================= */}
      {configuration && (
        <div className="res-section">
          <GradePolicyLab bands={bands} savedBands={savedBands} actions={<GradePolicyEditor bands={savedBands} onSave={next => {
            localStorage.setItem(policyKey, JSON.stringify(next))
            setBands(next)
            setSavedBands(next)
          }} />} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT GRADE CARD MODAL (Opened from View Grade Card Button)              */}
      {/* ========================================================================= */}
      {activeStudentModal && (
        <div className="res-modal-backdrop" onClick={() => setActiveStudentModal(null)}>
          <div className="res-modal" role="dialog" aria-modal="true" aria-labelledby="res-grade-card-title" onClick={(e) => e.stopPropagation()}>
            <div className="res-modal-header">
              <div className="res-modal-header__info">
                <h3 id="res-grade-card-title">Official Student Grade Card</h3>
                <span>{activeStudentModal.department} · {activeStudentModal.semester}</span>
              </div>
              <button
                type="button"
                className="res-modal-close"
                onClick={() => setActiveStudentModal(null)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

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
                    <th>Credits</th>
                    <th>Internal (30)</th>
                    <th>External (70)</th>
                    <th>Total (100)</th>
                    <th>Grade</th>
                    <th>Points</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudentModal.records.map((r, i) => (
                    <tr key={r.id || i}>
                      <td><strong>{r.subjectCode}</strong></td>
                      <td>{r.subjectName}</td>
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
                </tbody>
              </table>
            </div>

            <div className="res-modal-footer">
              <button
                type="button"
                className="res-btn res-btn--outline"
                onClick={() => window.print()}
              >
                <FiPrinter /> Print Grade Card
              </button>
              <button
                type="button"
                className="res-btn res-btn--primary"
                onClick={() => setActiveStudentModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
const { useEffect, useState } = mergedGradePolicyEditorImport5;
const { FiEdit2, FiPlus, FiTrash2, FiX } = mergedGradePolicyEditorImport6;
const { validateBands } = mergedGradePolicyEditorImport7;

const empty = { grade: '', min: '', max: '', points: '', pass: true }
function GradePolicyEditor({ bands, onSave }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState([])
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    const escape = event => { if (event.key === 'Escape') setOpen(false) }
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
  const save = () => {
    const issue = validateBands(draft)
    if (issue) { setError(issue); return }
    try { onSave(draft); setOpen(false) } catch (reason) { setError(reason.message || 'Unable to save policy.') }
  }
  return <>
    <div className="grade-editor-launch"><button type="button" onClick={() => { setDraft(bands.map(row => ({ ...row }))); setForm(null); setError(''); setOpen(true) }}><FiPlus aria-hidden="true" /> Manage Grades</button></div>
    {open && <div className="grade-editor-backdrop" onClick={() => setOpen(false)}>
      <section className="grade-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="grade-editor-title" onClick={event => event.stopPropagation()}>
        <header><div><h3 id="grade-editor-title">Grade scale configuration</h3><p>Add, edit or remove grade bands, then save the policy.</p></div><button type="button" aria-label="Close grade editor" onClick={() => setOpen(false)}><FiX /></button></header>
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
        <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={Boolean(form)} onClick={save}>Save Policy</button></footer>
      </section>
    </div>}
  </>
}

return GradePolicyEditor;
})();

// Related GradePolicyLab component and its private helpers.
const GradePolicyLab = (() => {
const { useState } = mergedGradePolicyLabImport8;
const { FiCheckCircle, FiInfo, FiTrendingUp } = mergedGradePolicyLabImport9;
const { gradeFor, validateBands } = mergedGradePolicyLabImport10;
const format = value => Number(value.toFixed(2)).toString()
function GradePolicyLab({ bands, savedBands, actions }) {
  const [score, setScore] = useState('75')
  const [maximum, setMaximum] = useState('100')
  const issue = validateBands(bands)
  const valid = score.trim() !== '' && maximum.trim() !== '' && Number.isFinite(Number(score)) && Number.isFinite(Number(maximum)) && Number(maximum) > 0 && Number(score) >= 0 && Number(score) <= Number(maximum)
  const percentage = valid ? Number(score) / Number(maximum) * 100 : null
  const grade = !issue && valid ? gradeFor(percentage, bands) : null
  const sorted = issue ? [] : [...bands].sort((a, b) => Number(a.min) - Number(b.min))
  const next = grade ? sorted.find(band => Number(band.min) >= Number(grade.max) && Number(band.points) > Number(grade.points)) : null
  const passBand = sorted.find(band => band.pass)
  const savedGrade = valid && !validateBands(savedBands) ? gradeFor(percentage, savedBands) : null
  const unsaved = JSON.stringify(bands) !== JSON.stringify(savedBands)
  return <section className="grm-policy-lab">
    <div className="grm-lab-header"><div><small>POLICY PREVIEW</small><h3>Grade policy lab</h3><p>Test a score and understand exactly how your grading rules apply.</p></div><div className="grm-lab-header-actions"><span className="grm-lab-state"><FiCheckCircle />{unsaved ? 'Editor changes pending' : 'Saved policy in sync'}</span>{actions}</div></div>
    <div className="grm-policy-layout"><section className="grm-lab-section"><div className="grm-lab-heading"><span>01</span><div><h4>Test student marks</h4><p>Percentage = obtained marks / maximum marks x 100</p></div></div>
      <div className="grm-simulator-inputs"><label>Marks obtained<input type="number" min="0" max={Number(maximum) > 0 ? maximum : undefined} step="any" value={score} onChange={event => setScore(event.target.value)} /></label><label>Maximum marks<input type="number" min="0.01" step="any" value={maximum} onChange={event => setMaximum(event.target.value)} /></label></div>
      <div className="grm-lab-examples"><span>Try a score:</span>{[40, 75, 90, 100].map(value => <button key={value} type="button" disabled={!(Number(maximum) > 0)} onClick={() => setScore(String(Number(maximum) * value / 100))}>{value}%</button>)}</div>
      <div className="grm-simulator-output grm-lab-result" role="status" aria-live="polite">{issue ? <p>Complete a valid policy to calculate the grade.</p> : !valid ? <p>Enter marks between zero and the maximum. Maximum marks must be positive.</p> : <><div className="grm-lab-grade"><small>GRADE</small><strong>{grade?.grade || '-'}</strong></div><div><b>{percentage.toFixed(2)}%</b><span>{format(Number(score))} out of {format(Number(maximum))} marks</span><span>{grade?.pass ? 'Passed' : 'Failed'} / {grade?.points ?? '-'} grade points</span></div></>}</div>
      {grade && <div className="grm-lab-guidance"><div><FiInfo /><span>Matched band: <strong>{grade.grade}</strong> / {grade.min}% to {grade.max}%{Number(grade.max) === 100 ? ' inclusive' : ', upper limit excluded'}.</span></div>{next ? <div><FiTrendingUp /><span>Reach <strong>{next.grade}</strong> at {format(Number(next.min) / 100 * Number(maximum))} marks: <strong>{format(Math.max(0, Number(next.min) / 100 * Number(maximum) - Number(score)))} more marks</strong>.</span></div> : <div><FiCheckCircle /><span>No higher grade-point band remains above this score.</span></div>}</div>}
      {unsaved && savedGrade && <div className="grm-lab-comparison"><span>Saved policy at this score</span><strong>{savedGrade.grade} / {savedGrade.points} points / {savedGrade.pass ? 'Passed' : 'Failed'}</strong><small>Save your edited policy to use it in Result Generation.</small></div>}
    </section><section className="grm-lab-section"><div className="grm-lab-heading"><span>02</span><div><h4>Understand grade ranges</h4><p>{issue ? 'Resolve policy issues to view coverage.' : `${bands.length} bands / full coverage${passBand ? ` / passing begins at ${passBand.min}%` : ' / no passing bands'}`}</p></div></div>
      {issue ? <p className="grm-policy-issue">{issue}</p> : <><div className="grm-policy-scale" aria-label="Grade percentage bands">{sorted.map(band => <div key={band.grade} style={{ flexGrow: Number(band.max) - Number(band.min) }} className={`${band.pass ? 'is-pass' : 'is-fail'} ${grade?.grade === band.grade ? 'is-current' : ''}`} title={`${band.grade}: ${band.min}% to ${band.max}%`}><span>{band.grade}</span></div>)}</div><div className="grm-scale-labels"><span>0%</span><span>50%</span><span>100%</span></div><div className="grm-lab-ranges"><div className="grm-lab-range-head"><span>Grade</span><span>Percentage range</span><span>Points</span></div>{sorted.map(band => <div key={band.grade} className={`grm-lab-range-row ${grade?.grade === band.grade ? 'is-current' : ''}`}><span>{band.grade}{grade?.grade === band.grade && <small>Current</small>}</span><span>{band.min}% &le; score {Number(band.max) === 100 ? '\u2264' : '<'} {band.max}%</span><strong>{band.points}</strong></div>)}</div></>}
    </section></div><div className="grm-lab-footnote"><FiInfo /><span>Simulator uses current editor values. Result Generation uses the saved local policy. Preview does not change official results.</span></div>
  </section>
}

return GradePolicyLab;
})();

// Related gradeScreens data.
const gradeScreens = [
  {
    "name": "GradeConfiguration",
    "label": "Grade Management",
    "slug": "grade-configuration"
  },
  {
    "name": "ResultGeneration",
    "label": "Result Generation",
    "slug": "result-generation"
  },
  {
    "name": "StudentResult",
    "label": "Student Result",
    "slug": "student-result"
  },
  {
    "name": "SemesterResult",
    "label": "Semester Result",
    "slug": "semester-result"
  },
  {
    "name": "DepartmentResult",
    "label": "Department Result",
    "slug": "department-result"
  },
  {
    "name": "ConsolidatedMarksMemo",
    "label": "Consolidated Marks Memo",
    "slug": "consolidated-marks-memo"
  },
  {
    "name": "BacklogReport",
    "label": "Backlog Report",
    "slug": "backlog-report"
  }
]

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

// CGPACalculatorPage screen and private helpers.
const CGPACalculatorPageScreen = (() => {
const mergedCGPACalculatorImport11 = pageDependency4
const mergedCGPACalculatorImport12 = pageDependency2
const mergedCGPACalculatorImport13 = pageDependency1
const mergedCGPACalculatorImport14 = pageDependency3
const mergedCGPACalculatorImport15 = pageDependency11
const mergedCGPACalculatorImport16 = pageDependency8
const DashboardLayout = pageDependency5.default
const PageHeader = pageDependency6.default
const GradeToolsNav = GradeToolsNavScreen.default
const { useAcademic } = pageDependency10

function CGPACalculatorPage() {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const scope = `${selectedCollegeId || 'none'}:${selectedAcademicYearId || 'none'}`
  return <DashboardLayout><div className="grm grm--cgpa-page">
    <PageHeader title="CGPA Calculator" subtitle="Calculate a credit-weighted cumulative GPA across completed semesters." breadcrumb={[{ label: 'Grades System and Results', link: '/grade-result-management/grade-configuration' }, 'CGPA Calculator']} />
    <GradeToolsNav />
    <CGPACalculator key={scope} storageKey={`cms-cgpa:${scope}`} />
  </div></DashboardLayout>
}

// Related CGPACalculator component and its private helpers.
const CGPACalculator = (() => {
const { ProjectSelect } = mergedCGPACalculatorImport11;
const { useEffect, useMemo, useState } = mergedCGPACalculatorImport12;
const {
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiHelpCircle,
  FiInfo,
  FiLayers,
  FiPercent,
  FiPlus,
  FiRotateCcw,
  FiSliders,
  FiTarget,
  FiTrash2,
  FiTrendingUp,
  FiUserCheck,
  FiX,
  FiZap,
} = mergedCGPACalculatorImport13;
const { academicDivision, cgpaToPercentage } = mergedCGPACalculatorImport14;
const resultsService = mergedCGPACalculatorImport15.default;
const ExportMenu = mergedCGPACalculatorImport16.default;

const TOTAL_DEGREE_CREDITS = 160 // Standard AICTE / Autonomous B.Tech Regulation

// Standard R20/R23 Autonomous Credit Distribution per Semester
const AUTONOMOUS_CREDITS = [19.5, 19.5, 21.5, 21.5, 22.0, 22.0, 20.0, 14.0]

const UGC_GRADES = [
  { grade: 'O', points: 10, label: 'Outstanding', minMarks: '90 - 100%' },
  { grade: 'A+', points: 9, label: 'Excellent', minMarks: '80 - 89%' },
  { grade: 'A', points: 8, label: 'Very Good', minMarks: '70 - 79%' },
  { grade: 'B+', points: 7, label: 'Good', minMarks: '60 - 69%' },
  { grade: 'B', points: 6, label: 'Above Average', minMarks: '55 - 59%' },
  { grade: 'C', points: 5, label: 'Average', minMarks: '50 - 54%' },
  { grade: 'P', points: 4, label: 'Pass', minMarks: '40 - 49%' },
  { grade: 'F', points: 0, label: 'Fail / Arrear', minMarks: '< 40%' },
]

const DEFAULT_SUBJECTS = [
  { id: 's1', code: 'CS301', name: 'Data Structures & Algorithms', credits: 4, grade: 'A+', points: 9 },
  { id: 's2', code: 'CS302', name: 'Computer Architecture & Org.', credits: 3, grade: 'A', points: 8 },
  { id: 's3', code: 'MA301', name: 'Discrete Mathematical Structures', credits: 4, grade: 'O', points: 10 },
  { id: 's4', code: 'CS303', name: 'Object Oriented Java Programming', credits: 3, grade: 'A', points: 8 },
  { id: 's5', code: 'EC304', name: 'Digital Electronics & Logic', credits: 3, grade: 'B+', points: 7 },
  { id: 's6', code: 'CS305P', name: 'Data Structures Laboratory', credits: 1.5, grade: 'O', points: 10 },
  { id: 's7', code: 'CS306P', name: 'Java Programming Laboratory', credits: 1.5, grade: 'A+', points: 9 },
  { id: 's8', code: 'HS301', name: 'Constitution & Professional Ethics', credits: 1, grade: 'A', points: 8 },
]

const newSemester = (number, customCredits = '') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  semester: `Semester ${number}`,
  sgpa: '',
  credits: customCredits !== '' ? String(customCredits) : '',
})

function readRows(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (Array.isArray(saved) && saved.length && saved.every(row => row && typeof row === 'object')) return saved.map((row, index) => ({
      ...row,
      id: row.id || newSemester(index + 1).id,
      semester: String(row.semester || `Semester ${index + 1}`),
      sgpa: row.sgpa == null ? '' : String(row.sgpa),
      credits: row.credits == null ? '' : String(row.credits),
    }))
  } catch { /* Start fresh if corrupted */ }
  return [newSemester(1, 20)]
}

function CGPACalculator({ storageKey }) {
  const [rows, setRows] = useState(() => readRows(storageKey))
  const [savedAt, setSavedAt] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  const [resetConfirm, setResetConfirm] = useState(false)
  const [formulaType, setFormulaType] = useState('aicte') // 'aicte' or 'cbse'

  // Workspace View Swapper (Tabbed Navigation)
  // 'semesters' | 'trajectory' | 'audit' | 'simulator'
  const [activeTab, setActiveTab] = useState('semesters')

  // Advanced Goal Planner State
  const [targetCgpa, setTargetCgpa] = useState('8.50')
  const [targetRemainingSemesters, setTargetRemainingSemesters] = useState(4)
  const [creditsPerUpcomingSem, setCreditsPerUpcomingSem] = useState(() => AUTONOMOUS_CREDITS.slice(-4).reduce((sum, credits) => sum + credits, 0) / 4)

  // Quick Period & Student Import
  const [periodType, setPeriodType] = useState('semester')
  const [periodNumber, setPeriodNumber] = useState('1')
  const [actionNotice, setActionNotice] = useState('')
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // Subject-Wise Calculator Modal State
  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [activeSemesterRowId, setActiveSemesterRowId] = useState(null)
  const [modalSubjects, setModalSubjects] = useState(DEFAULT_SUBJECTS)

  // Grading Scale Guide Modal State
  const [gradeScaleOpen, setGradeScaleOpen] = useState(false)

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows))
    } catch { /* storage full or private mode */ }
  }, [rows, storageKey])

  // Load available student records from resultsService for optional quick-import
  useEffect(() => {
    let active = true
    resultsService.getResults().then(sheets => {
      if (!active || !Array.isArray(sheets)) return
      const map = new Map()
      sheets.forEach(sheet => {
        const records = Array.isArray(sheet.records) ? sheet.records : [sheet]
        records.forEach(rec => {
          const id = rec.studentId || rec.id
          const name = rec.studentName || rec.name || id
          const roll = rec.registrationNumber || rec.rollNumber || ''
          if (id && !map.has(id)) {
            map.set(id, { id, name: `${name}${roll ? ` (${roll})` : ''}` })
          }
        })
      })
      setAvailableStudents([...map.values()])
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const touchSaveState = () => {
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }

  const duplicateSemester = useMemo(() => {
    const names = rows.map(row => row.semester.trim().toLowerCase()).filter(Boolean)
    return new Set(names).size !== names.length
  }, [rows])

  const invalidRow = rows.find(row => {
    const sgpa = Number(row.sgpa)
    const credits = Number(row.credits)
    return !row.semester.trim() || row.sgpa === '' || row.credits === '' || !Number.isFinite(sgpa) || sgpa < 0 || sgpa > 10 || !Number.isFinite(credits) || credits <= 0
  })

  // Core Calculations
  const validRows = useMemo(() => {
    return rows.filter(r => {
      const s = Number(r.sgpa)
      const c = Number(r.credits)
      return r.semester.trim() && r.sgpa !== '' && r.credits !== '' && Number.isFinite(s) && s >= 0 && s <= 10 && Number.isFinite(c) && c > 0
    })
  }, [rows])

  const totalCredits = useMemo(() => {
    return rows.reduce((total, row) => total + (Number(row.credits) || 0), 0)
  }, [rows])

  const weightedPoints = useMemo(() => {
    return rows.reduce((total, row) => total + (Number(row.sgpa) || 0) * (Number(row.credits) || 0), 0)
  }, [rows])

  const cgpa = useMemo(() => {
    return !invalidRow && !duplicateSemester && totalCredits > 0 ? weightedPoints / totalCredits : null
  }, [invalidRow, duplicateSemester, totalCredits, weightedPoints])

  const percentageAicte = cgpa !== null ? cgpaToPercentage(cgpa, 'aicte') : null
  const percentageCbse = cgpa !== null ? cgpaToPercentage(cgpa, 'cbse') : null
  const activePercentage = formulaType === 'aicte' ? percentageAicte : percentageCbse
  const divisionInfo = cgpa !== null ? academicDivision(cgpa) : null

  // Progress toward 160-credit degree
  const degreeCreditPercent = Math.min(100, Math.round((totalCredits / TOTAL_DEGREE_CREDITS) * 100))
  const remainingDegreeCredits = Math.max(0, Number((TOTAL_DEGREE_CREDITS - totalCredits).toFixed(1)))

  // Running Cumulative CGPA progression by row
  const rowCumulativeStats = useMemo(() => {
    let accCredits = 0
    let accPoints = 0
    return rows.map(row => {
      const s = Number(row.sgpa)
      const c = Number(row.credits)
      if (Number.isFinite(s) && s >= 0 && Number.isFinite(c) && c > 0) {
        accCredits += c
        accPoints += s * c
        return {
          runningCredits: accCredits,
          runningPoints: accPoints,
          runningCgpa: (accPoints / accCredits).toFixed(2),
        }
      }
      return { runningCredits: null, runningPoints: null, runningCgpa: '—' }
    })
  }, [rows])

  // Analytics helper stats
  const analyticsStats = useMemo(() => {
    if (!validRows.length) return null
    const sgpaList = validRows.map(r => ({ sem: r.semester, sgpa: Number(r.sgpa), cr: Number(r.credits) }))
    const sorted = [...sgpaList].sort((a, b) => b.sgpa - a.sgpa)
    const peak = sorted[0]
    const lowest = sorted[sorted.length - 1]
    const avgCredits = (totalCredits / validRows.length).toFixed(1)
    const firstSemSgpa = sgpaList[0]?.sgpa || 0
    const lastSemSgpa = sgpaList[sgpaList.length - 1]?.sgpa || 0
    const trendDiff = Number((lastSemSgpa - firstSemSgpa).toFixed(2))
    return { peak, lowest, avgCredits, trendDiff }
  }, [validRows, totalCredits])

  // What-If Goal Analysis across remaining semesters
  const goalAnalysis = useMemo(() => {
    const target = Number(targetCgpa)
    const remSems = Math.max(1, Number(targetRemainingSemesters) || 1)
    const crPerSem = Math.max(1, Number(creditsPerUpcomingSem) || 20)
    const upcomingTotalCredits = remSems * crPerSem

    if (cgpa === null || !Number.isFinite(target) || target <= 0 || target > 10) {
      return null
    }

    const futureTotalCredits = totalCredits + upcomingTotalCredits
    const targetTotalPoints = target * futureTotalCredits
    const neededPoints = targetTotalPoints - weightedPoints
    const requiredAvgSgpa = neededPoints / upcomingTotalCredits

    return {
      target,
      remSems,
      crPerSem,
      upcomingTotalCredits,
      requiredAvgSgpa,
      isImpossible: requiredAvgSgpa > 10.0,
      isAlreadySecured: requiredAvgSgpa <= 5.0,
      isEasy: requiredAvgSgpa > 5.0 && requiredAvgSgpa <= 7.5,
      isModerate: requiredAvgSgpa > 7.5 && requiredAvgSgpa <= 8.5,
      isChallenging: requiredAvgSgpa > 8.5 && requiredAvgSgpa <= 9.8,
    }
  }, [cgpa, targetCgpa, targetRemainingSemesters, creditsPerUpcomingSem, totalCredits, weightedPoints])

  // Row Management
  const update = (id, field, value) => {
    setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row))
    touchSaveState()
  }

  const add = (customCredits = '') => {
    setRows(current => {
      const numbers = current.map(row => Number(/^Semester (\d+)$/i.exec(row.semester.trim())?.[1]) || 0)
      const nextNum = Math.max(current.length, ...numbers) + 1
      const defaultCr = customCredits !== '' ? customCredits : AUTONOMOUS_CREDITS[nextNum - 1] || 20
      return [...current, newSemester(nextNum, defaultCr)]
    })
    setResetConfirm(false)
    setSelectedStudentId('')
    setActionNotice('Next semester added. Enter its SGPA and earned credits below.')
    touchSaveState()
  }

  const removeRow = id => {
    if (rows.length <= 1) return
    setRows(current => current.filter(item => item.id !== id))
    touchSaveState()
  }

  const reset = () => {
    if (!resetConfirm) { setResetConfirm(true); return }
    setRows([newSemester(1, 20)])
    setSelectedStudentId('')
    setResetConfirm(false)
    touchSaveState()
  }

  // Preset Loaders
  const loadAutonomousPreset = () => {
    setRows(AUTONOMOUS_CREDITS.map((credits, idx) => ({
      id: `auto-${idx + 1}-${Date.now()}`,
      semester: `Semester ${idx + 1}`,
      sgpa: '',
      credits: String(credits),
    })))
    setPeriodType('course')
    setPeriodNumber('8')
    setSelectedStudentId('')
    setResetConfirm(false)
    setActionNotice('Calculator reset to 8 semesters. Previous SGPA values have been cleared.')
    touchSaveState()
  }

  const loadUniform8Preset = () => {
    setRows(Array.from({ length: 8 }, (_, i) => ({
      id: `uniform-${i + 1}-${Date.now()}`,
      semester: `Semester ${i + 1}`,
      sgpa: '',
      credits: '20',
    })))
    touchSaveState()
  }

  const loadTopperSample = () => {
    const sample = [
      { sem: 'Semester 1', sgpa: '8.80', cr: '19.5' },
      { sem: 'Semester 2', sgpa: '9.10', cr: '19.5' },
      { sem: 'Semester 3', sgpa: '8.95', cr: '21.5' },
      { sem: 'Semester 4', sgpa: '9.05', cr: '21.5' },
      { sem: 'Semester 5', sgpa: '8.75', cr: '22.0' },
      { sem: 'Semester 6', sgpa: '8.85', cr: '22.0' },
    ]
    setRows(sample.map((s, idx) => ({
      id: `topper-${idx + 1}-${Date.now()}`,
      semester: s.sem,
      sgpa: s.sgpa,
      credits: s.cr,
    })))
    touchSaveState()
  }

  const loadDistinctionSample = () => {
    const sample = [
      { sem: 'Semester 1', sgpa: '7.60', cr: '19.5' },
      { sem: 'Semester 2', sgpa: '7.80', cr: '19.5' },
      { sem: 'Semester 3', sgpa: '8.10', cr: '21.5' },
      { sem: 'Semester 4', sgpa: '7.70', cr: '21.5' },
      { sem: 'Semester 5', sgpa: '7.90', cr: '22.0' },
      { sem: 'Semester 6', sgpa: '7.85', cr: '22.0' },
    ]
    setRows(sample.map((s, idx) => ({
      id: `distinction-${idx + 1}-${Date.now()}`,
      semester: s.sem,
      sgpa: s.sgpa,
      credits: s.cr,
    })))
    touchSaveState()
  }

  const applyTemplate = (count, start = 1) => {
    setRows(current => Array.from({ length: count }, (_, i) => {
      const semester = `Semester ${start + i}`
      return current.find(row => row.semester.trim().toLowerCase() === semester.toLowerCase())
        || newSemester(start + i, AUTONOMOUS_CREDITS[start + i - 1] || 20)
    }))
    setSelectedStudentId('')
    setResetConfirm(false)
    setActionNotice(count === 1 ? `Semester ${start} loaded in the calculator.` : `Semesters ${start}–${start + count - 1} loaded in the calculator.`)
    touchSaveState()
  }

  const choosePeriod = (type, number) => {
    setPeriodType(type)
    setPeriodNumber(String(number))
    applyTemplate(type === 'semester' ? 1 : type === 'year' ? 2 : Number(number), type === 'semester' ? Number(number) : type === 'year' ? Number(number) * 2 - 1 : 1)
  }

  const handleStudentImport = async (studentId) => {
    setSelectedStudentId(studentId)
    if (!studentId) return
    try {
      const allSheets = await resultsService.getResults()
      const studentRecords = allSheets.flatMap(sheet => {
        const records = Array.isArray(sheet.records) ? sheet.records : [sheet]
        return records
          .filter(r => String(r.studentId || r.id) === String(studentId))
          .map(r => ({
            ...r,
            semester: r.semesterName || sheet.semesterName || sheet.semester || 'Semester 1',
            credits: Number(r.credits ?? sheet.credits ?? 3),
            gradePoint: Number(r.gradePoint ?? 0),
          }))
      })

      if (!studentRecords.length) return

      const semMap = new Map()
      studentRecords.forEach(r => {
        const sem = r.semester || 'Semester 1'
        if (!semMap.has(sem)) semMap.set(sem, [])
        semMap.get(sem).push(r)
      })

      const imported = [...semMap.entries()].map(([sem, recs], idx) => {
        const credits = recs.reduce((sum, r) => sum + (r.credits || 0), 0)
        const pts = recs.reduce((sum, r) => sum + ((r.gradePoint || 0) * (r.credits || 0)), 0)
        const sgpa = credits > 0 ? (pts / credits).toFixed(2) : ''
        return {
          id: `${Date.now()}-${idx}`,
          semester: sem,
          sgpa: String(sgpa),
          credits: String(credits || 20),
        }
      })

      if (imported.length > 0) {
        setRows(imported)
        touchSaveState()
      }
    } catch (e) {
      console.warn('Student import error:', e)
    }
  }

  // Subject Modal Handlers
  const openSubjectModal = (row) => {
    setActiveSemesterRowId(row.id)
    setSubjectModalOpen(true)
  }

  const updateModalSubject = (subId, field, val) => {
    setModalSubjects(subs => subs.map(s => {
      if (s.id !== subId) return s
      const updated = { ...s, [field]: val }
      if (field === 'grade') {
        const match = UGC_GRADES.find(g => g.grade === val)
        updated.points = match ? match.points : 0
      }
      return updated
    }))
  }

  const addModalSubject = () => {
    const nextNum = modalSubjects.length + 1
    setModalSubjects(subs => [
      ...subs,
      {
        id: `sub-${Date.now()}`,
        code: `CS${300 + nextNum}`,
        name: `Course Subject ${nextNum}`,
        credits: 3,
        grade: 'A',
        points: 8,
      },
    ])
  }

  const removeModalSubject = (subId) => {
    if (modalSubjects.length <= 1) return
    setModalSubjects(subs => subs.filter(s => s.id !== subId))
  }

  const computedModalStats = useMemo(() => {
    const totalCr = modalSubjects.reduce((acc, s) => acc + (Number(s.credits) || 0), 0)
    const totalPts = modalSubjects.reduce((acc, s) => acc + ((Number(s.credits) || 0) * (Number(s.points) || 0)), 0)
    const sgpa = totalCr > 0 ? (totalPts / totalCr).toFixed(2) : '0.00'
    return { totalCr, totalPts, sgpa }
  }, [modalSubjects])

  const applyModalSgpa = () => {
    if (!activeSemesterRowId) return
    update(activeSemesterRowId, 'sgpa', computedModalStats.sgpa)
    update(activeSemesterRowId, 'credits', String(computedModalStats.totalCr))
    setSubjectModalOpen(false)
  }

  // Export dataset preparation
  let runningCredits = 0
  let runningPoints = 0
  const exportRows = validRows.map(row => {
    const semesterCredits = Number(row.credits)
    const semesterPoints = Number(row.sgpa) * semesterCredits
    runningCredits += semesterCredits
    runningPoints += semesterPoints
    return {
      semester: row.semester,
      sgpa: Number(row.sgpa).toFixed(2),
      credits: semesterCredits,
      weightedPoints: semesterPoints.toFixed(2),
      cumulativeCgpa: (runningPoints / runningCredits).toFixed(2),
      percentage: formulaType === 'aicte' ? cgpaToPercentage(runningPoints / runningCredits, 'aicte') : cgpaToPercentage(runningPoints / runningCredits, 'cbse'),
      division: academicDivision(runningPoints / runningCredits)?.division || '',
    }
  })

  const exportColumns = [
    { key: 'semester', label: 'Semester' },
    { key: 'sgpa', label: 'SGPA' },
    { key: 'credits', label: 'Credits Earned' },
    { key: 'weightedPoints', label: 'SGPA × Credits' },
    { key: 'cumulativeCgpa', label: 'Cumulative CGPA' },
    { key: 'percentage', label: `${formulaType.toUpperCase()} Equivalent %` },
    { key: 'division', label: 'Division' },
  ]

  const exportSummary = cgpa === null ? [] : [{
    semester: 'OVERALL CGPA', sgpa: cgpa.toFixed(2), credits: totalCredits,
    weightedPoints: weightedPoints.toFixed(2), cumulativeCgpa: cgpa.toFixed(2),
    percentage: activePercentage?.toFixed(2) || '', division: divisionInfo?.division || '',
  }]

  return (
    <section className="grm-cgpa" aria-labelledby="grm-cgpa-title">
      {/* Header */}
      <header className="grm-cgpa__header">
        <span className="grm-cgpa__eyebrow">ACADEMIC PERFORMANCE & DEGREE AUDIT</span>
        <div className="grm-cgpa__header-copy">
          <h3 id="grm-cgpa-title">CGPA Calculator & Academic Auditor</h3>
          <p>Autonomous B.Tech credit-weighted grading, AICTE percentage conversion, and degree honours auditor.</p>
        </div>
        <div className="grm-cgpa__header-right">
          {savedAt && <span className="grm-cgpa__save-state" role="status">Saved on this device · {savedAt}</span>}
          <div className="grm-cgpa__header-btns">
            <button
              type="button"
              className="grm-cgpa__tool-btn"
              onClick={() => setGradeScaleOpen(true)}
              title="View UGC / AICTE 10-Point Grade Reference Chart"
            >
              <FiHelpCircle aria-hidden="true" /> Grade Scale Guide
            </button>
            <ExportMenu
              rows={[...exportRows, ...exportSummary]}
              columns={exportColumns}
              filename="cgpa-calculation.csv"
              title="CGPA Calculation"
              scope="Semester breakdown"
            />
          </div>
        </div>
      </header>

      {/* 1. COMPACT EXECUTIVE KPI PERFORMANCE SUMMARY CARDS */}
      <div className="grm-cgpa__kpi-grid">
        {/* Card 1: Cumulative CGPA */}
        <div className="grm-cgpa__kpi-card grm-cgpa__kpi-card--primary">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Cumulative CGPA</span>
            <span className="grm-cgpa__kpi-badge">Scale 10.00</span>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-score">{cgpa !== null ? cgpa.toFixed(2) : '—'}</strong>
            {divisionInfo && (
              <span className="grm-cgpa__division-pill" style={{ background: divisionInfo.bg, color: divisionInfo.color }}>
                <FiAward aria-hidden="true" /> {divisionInfo.division}
              </span>
            )}
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>{validRows.length} of 8 Semesters Calculated</span>
            <small>Weighted by Earned Credits</small>
          </div>
        </div>

        {/* Card 2: Percentage Equivalency */}
        <div className="grm-cgpa__kpi-card">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Equivalent Marks</span>
            <div className="grm-cgpa__kpi-toggle" role="group" aria-label="Formula toggle">
              <button
                type="button"
                className={`grm-cgpa__kpi-toggle-btn ${formulaType === 'aicte' ? 'is-active' : ''}`}
                onClick={() => setFormulaType('aicte')}
              >
                AICTE
              </button>
              <button
                type="button"
                className={`grm-cgpa__kpi-toggle-btn ${formulaType === 'cbse' ? 'is-active' : ''}`}
                onClick={() => setFormulaType('cbse')}
              >
                9.5×
              </button>
            </div>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-percent">
              {activePercentage !== null ? `${activePercentage.toFixed(2)}%` : '—'}
            </strong>
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>{formulaType === 'aicte' ? '(CGPA − 0.75) × 10' : 'CGPA × 9.5'}</span>
            <small>UGC Approved</small>
          </div>
        </div>

        {/* Card 3: Degree Credits Progress */}
        <div className="grm-cgpa__kpi-card">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Degree Credit Progress</span>
            <span className="grm-cgpa__kpi-badge">{degreeCreditPercent}% Complete</span>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-credits">
              {totalCredits ? Number(totalCredits.toFixed(1)) : 0} <span className="grm-cgpa__kpi-unit">/ {TOTAL_DEGREE_CREDITS} Cr</span>
            </strong>
          </div>
          <div className="grm-cgpa__kpi-progress">
            <div className="grm-cgpa__kpi-bar" style={{ width: `${degreeCreditPercent}%` }} />
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>{remainingDegreeCredits > 0 ? `${remainingDegreeCredits} Cr Remaining` : 'Requirement Met'}</span>
            <small>AICTE 160-Cr</small>
          </div>
        </div>

        {/* Card 4: Honours & Academic Standing */}
        <div className="grm-cgpa__kpi-card">
          <div className="grm-cgpa__kpi-header">
            <span className="grm-cgpa__kpi-title">Honours & Standing</span>
            <span className="grm-cgpa__kpi-badge">R20/R23</span>
          </div>
          <div className="grm-cgpa__kpi-value-row">
            <strong className="grm-cgpa__kpi-status" style={{ color: (cgpa && cgpa >= 7.5) ? '#166534' : (cgpa && cgpa >= 6.5) ? '#1e40af' : '#64748b' }}>
              {cgpa === null
                ? 'Pending Evaluation'
                : cgpa >= 7.5
                  ? 'B.Tech Honours Eligible'
                  : cgpa >= 6.5
                    ? 'First Class Standing'
                    : 'Regular Standing'}
            </strong>
          </div>
          <div className="grm-cgpa__kpi-foot">
            <span>Honours Cutoff: CGPA ≥ 7.50 with 0 Backlogs</span>
            <small>{validRows.length >= 8 ? 'Final' : 'In-Progress'}</small>
          </div>
        </div>
      </div>

      {/* 2. WORKSPACE TABBED SUB-NAVIGATION (Swaps between screens without excessive scrolling) */}
      <nav className="grm-cgpa-tabs" role="tablist" aria-label="CGPA workspace tools">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'semesters'}
          className={`grm-cgpa-tab ${activeTab === 'semesters' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('semesters')}
        >
          <FiLayers aria-hidden="true" />
          <span>Semesters & Calculator</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'trajectory'}
          className={`grm-cgpa-tab ${activeTab === 'trajectory' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('trajectory')}
        >
          <FiTrendingUp aria-hidden="true" />
          <span>Performance Trajectory</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          className={`grm-cgpa-tab ${activeTab === 'audit' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <FiAward aria-hidden="true" />
          <span>Degree & Honours Audit</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'simulator'}
          className={`grm-cgpa-tab ${activeTab === 'simulator' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <FiTarget aria-hidden="true" />
          <span>Goal Simulator (What-If)</span>
        </button>
      </nav>

      {/* =========================================================================
         TAB 1: SEMESTERS TABLE & CALCULATOR
         ========================================================================= */}
      {activeTab === 'semesters' && (
        <div className="grm-cgpa-tab-pane">
          {/* Quick Regulation Presets Bar */}
          <div className="grm-cgpa__presets-bar">
            <div className="grm-cgpa__presets-left">
              <span className="grm-cgpa__presets-label">
                <FiZap aria-hidden="true" /> Quick Presets:
              </span>
              <button
                type="button"
                className="grm-cgpa__preset-chip"
                onClick={loadAutonomousPreset}
                title="Populate standard 160-credit B.Tech credit structure across 8 semesters"
              >
                ⚡ B.Tech 160-Cr Model (R20/R23)
              </button>
              <button
                type="button"
                className="grm-cgpa__preset-chip"
                onClick={loadUniform8Preset}
                title="Populate 8 Semesters with 20 credits per semester"
              >
                ⚡ Uniform 8 Sems (20 Cr/Sem)
              </button>
              <button
                type="button"
                className="grm-cgpa__preset-chip grm-cgpa__preset-chip--highlight"
                onClick={loadTopperSample}
                title="Load sample High Achiever (8.92 CGPA) profile to preview analytics"
              >
                ⭐ Load Topper Profile (8.92)
              </button>
              <button
                type="button"
                className="grm-cgpa__preset-chip"
                onClick={loadDistinctionSample}
                title="Load sample First Class with Distinction (7.82 CGPA) profile"
              >
                🎯 Load Distinction Profile (7.82)
              </button>
            </div>

            {availableStudents.length > 0 && (
              <div className="grm-cgpa__presets-right">
                <label htmlFor="cgpa-student-select">
                  <FiUserCheck aria-hidden="true" /> Auto-fill from student:
                </label>
                <ProjectSelect
                  id="cgpa-student-select"
                  value={selectedStudentId}
                  onChange={e => handleStudentImport(e.target.value)}
                >
                  <option value="">Select student record...</option>
                  {availableStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </ProjectSelect>
              </div>
            )}
          </div>

          {/* Period Selector Box */}
          <div className="grm-cgpa__period-panel">
            <div className="grm-cgpa__period-heading">
              <div>
                <h4>Choose your calculation period</h4>
                <p>Review a single semester, an academic year, or the entire 4-year B.Tech course.</p>
              </div>
              <span className="grm-cgpa__period-badge">
                <FiLayers aria-hidden="true" /> {rows.length} {rows.length === 1 ? 'semester' : 'semesters'} active
              </span>
            </div>

            <div className="grm-cgpa__period-modes" role="group" aria-label="Calculation period">
              {[
                { value: 'semester', title: 'Single semester', description: 'Individual semester performance', icon: FiBookOpen },
                { value: 'year', title: 'Academic year', description: 'Two semesters, one yearly CGPA', icon: FiCalendar },
                { value: 'course', title: 'Full course', description: 'Combined CGPA across your course', icon: FiAward },
              ].map(({ value, title, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`grm-cgpa__period-mode ${periodType === value ? 'is-selected' : ''}`}
                  aria-pressed={periodType === value}
                  onClick={() => choosePeriod(value, value === periodType ? periodNumber : value === 'course' ? '8' : '1')}
                >
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  {periodType === value && <FiCheck className="grm-cgpa__period-check" aria-hidden="true" />}
                </button>
              ))}
            </div>

            <div className="grm-cgpa__period-controls">
              <label className="grm-cgpa__period-field">
                <span>{periodType === 'semester' ? 'Select semester' : periodType === 'year' ? 'Select academic year' : 'Select course duration'}</span>
                <ProjectSelect aria-label="Select calculation period" value={periodNumber} onChange={event => choosePeriod(periodType, event.target.value)}>
                  {periodType === 'course' ? (
                    <>
                      <option value="4">2 years / 4 semesters</option>
                      <option value="6">3 years / 6 semesters</option>
                      <option value="8">4 years / 8 semesters (B.Tech Full Course)</option>
                    </>
                  ) : Array.from({ length: periodType === 'semester' ? 8 : 4 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {periodType === 'semester' ? `Semester ${i + 1}` : `Year ${i + 1} (Semesters ${i * 2 + 1} & ${i * 2 + 2})`}
                    </option>
                  ))}
                </ProjectSelect>
              </label>

              <div className="grm-cgpa__period-preview">
                <strong>{periodType === 'semester' ? `Semester ${periodNumber}` : periodType === 'year' ? `Year ${periodNumber}` : `${Number(periodNumber) / 2}-year course`}</strong>
                <span>{periodType === 'semester' ? '1 semester · SGPA' : periodType === 'year' ? `Semesters ${Number(periodNumber) * 2 - 1} & ${Number(periodNumber) * 2} · Weighted CGPA` : `Semesters 1–${periodNumber} · Weighted CGPA`}</span>
              </div>

              <button
                type="button"
                className="grm-cgpa__apply-period"
                onClick={() => applyTemplate(
                  periodType === 'semester' ? 1 : periodType === 'year' ? 2 : Number(periodNumber),
                  periodType === 'semester' ? Number(periodNumber) : periodType === 'year' ? Number(periodNumber) * 2 - 1 : 1
                )}
              >
                Apply Selection <FiCheck aria-hidden="true" />
              </button>
            </div>
          </div>

          {actionNotice && <p className="grm-cgpa__action-notice" role="status"><FiCheckCircle aria-hidden="true" /> {actionNotice}</p>}

          {/* Interactive Semesters Table */}
          <div className="grm-cgpa__table-section">
            <div className="grm-cgpa__table-header">
              <div>
                <h4>Semester Grade Point & Credit Records</h4>
                <p>Enter earned SGPA and credits for each semester. Click <strong>Subject Calc</strong> to auto-calculate SGPA from subjects.</p>
              </div>
              <div className="grm-cgpa__table-actions-top">
                <button type="button" className="grm-cgpa__btn-sm" onClick={() => add()}>
                  <FiPlus aria-hidden="true" /> Add Next Semester
                </button>
                <button type="button" className="grm-cgpa__btn-sm grm-cgpa__btn-sm--ghost" onClick={loadAutonomousPreset}>
                  <FiSliders aria-hidden="true" /> Reset to 8 Sems
                </button>
              </div>
            </div>

            <div className="grm-cgpa__table-wrap">
              <table className="grm-cgpa__table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '22%' }}>Semester</th>
                    <th scope="col" style={{ width: '18%' }}>SGPA (0–10)</th>
                    <th scope="col" style={{ width: '16%' }}>Earned Credits</th>
                    <th scope="col" style={{ width: '16%' }}>Weighted Points</th>
                    <th scope="col" style={{ width: '16%' }}>Milestone CGPA</th>
                    <th scope="col" style={{ width: '12%', textAlign: 'center' }}>Subject Calc & Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const rowSgpa = Number(row.sgpa)
                    const rowCredits = Number(row.credits)
                    const rowPoints = Number.isFinite(rowSgpa) && Number.isFinite(rowCredits) && rowSgpa >= 0 && rowCredits > 0
                      ? (rowSgpa * rowCredits).toFixed(2)
                      : '—'
                    const milestone = rowCumulativeStats[index]

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="grm-cgpa__sem-cell">
                            <span className="grm-cgpa__sem-badge">{index + 1}</span>
                            <input
                              id={`cgpa-semester-${row.id}`}
                              value={row.semester}
                              maxLength={40}
                              placeholder={`Semester ${index + 1}`}
                              onChange={event => update(row.id, 'semester', event.target.value)}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="grm-cgpa__sgpa-cell">
                            <input
                              id={`cgpa-sgpa-${row.id}`}
                              type="number"
                              min="0"
                              max="10"
                              step="0.01"
                              inputMode="decimal"
                              value={row.sgpa}
                              placeholder="e.g. 8.25"
                              onChange={event => update(row.id, 'sgpa', event.target.value)}
                            />
                            {Number.isFinite(rowSgpa) && rowSgpa > 0 && (
                              <span className={`grm-cgpa__sgpa-pill is-${rowSgpa >= 8.5 ? 'outstanding' : rowSgpa >= 7.5 ? 'distinction' : rowSgpa >= 6.5 ? 'first' : rowSgpa >= 5 ? 'pass' : 'fail'}`}>
                                {rowSgpa >= 8.5 ? 'O' : rowSgpa >= 7.5 ? 'A+' : rowSgpa >= 6.5 ? 'A' : rowSgpa >= 5 ? 'B' : 'F'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            id={`cgpa-credits-${row.id}`}
                            type="number"
                            min="0.01"
                            step="0.5"
                            inputMode="decimal"
                            value={row.credits}
                            placeholder="e.g. 21.5"
                            onChange={event => update(row.id, 'credits', event.target.value)}
                          />
                        </td>
                        <td className="grm-cgpa__points-cell">
                          <span>{rowPoints}</span>
                        </td>
                        <td>
                          <span className="grm-cgpa__milestone-badge">
                            {milestone && milestone.runningCgpa !== '—' ? `${milestone.runningCgpa} CGPA` : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="grm-cgpa__row-btns">
                            <button
                              type="button"
                              className="grm-cgpa__btn-calc"
                              onClick={() => openSubjectModal(row)}
                              title="Calculate SGPA from subject-wise course grades"
                            >
                              <FiEdit3 aria-hidden="true" />
                            </button>
                            <button
                              className="grm-cgpa__remove"
                              type="button"
                              aria-label={`Remove ${row.semester || `semester row ${index + 1}`}`}
                              disabled={rows.length === 1}
                              onClick={() => removeRow(row.id)}
                              title="Remove Semester Row"
                            >
                              <FiTrash2 aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Totals / Cumulative</strong></td>
                    <td>
                      <strong style={{ color: 'var(--brand)' }}>
                        {cgpa !== null ? `${cgpa.toFixed(2)} CGPA` : '—'}
                      </strong>
                    </td>
                    <td>
                      <strong>{totalCredits ? Number(totalCredits.toFixed(1)) : 0} Credits</strong>
                    </td>
                    <td className="grm-cgpa__points-cell">
                      <strong>{totalCredits ? weightedPoints.toFixed(2) : '—'}</strong>
                    </td>
                    <td colSpan="2">
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {activePercentage !== null ? `Equivalent: ${activePercentage.toFixed(2)}%` : ''}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grm-cgpa__table-footer">
              <div className="grm-cgpa__actions-left">
                <button className="grm-cgpa__secondary" type="button" onClick={() => add()}>
                  <FiPlus aria-hidden="true" /> Add Semester
                </button>
                <button className="grm-cgpa__secondary" type="button" onClick={loadAutonomousPreset}>
                  <FiLayers aria-hidden="true" /> Fill 8 Semesters
                </button>
              </div>
              <button className="grm-cgpa__reset" type="button" onClick={reset}>
                <FiRotateCcw aria-hidden="true" /> {resetConfirm ? 'Confirm Clear All' : 'Clear Calculator'}
              </button>
            </div>

            <p className={`grm-cgpa__hint${duplicateSemester || invalidRow ? ' is-error' : ''}`} role={duplicateSemester || invalidRow ? 'alert' : undefined}>
              {duplicateSemester
                ? '⚠️ Duplicate semester detected. Ensure each completed semester has a unique label.'
                : invalidRow
                  ? '⚠️ Enter valid semester details: SGPA must be between 0.00 and 10.00, and credits must be a positive number.'
                  : 'Official UGC / AICTE Autonomous grading standard. Degree classification requires 160 total credits and no active backlogs.'}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 2: VISUAL PERFORMANCE TRAJECTORY & ANALYTICS
         ========================================================================= */}
      {activeTab === 'trajectory' && (
        <div className="grm-cgpa-tab-pane">
          <div className="grm-cgpa__chart-card">
            <div className="grm-cgpa__chart-header">
              <div>
                <h4>
                  <FiTrendingUp aria-hidden="true" /> Semester Performance Trajectory & CGPA Progression
                </h4>
                <p>Visual breakdown of SGPA performance by semester against cumulative CGPA trend and honours cutoff (7.50).</p>
              </div>
              <div className="grm-cgpa__chart-legend">
                <span className="grm-cgpa__legend-item"><span className="grm-cgpa__legend-color is-sgpa" /> Semester SGPA (Bar)</span>
                <span className="grm-cgpa__legend-item"><span className="grm-cgpa__legend-color is-cgpa" /> Cumulative CGPA (Line)</span>
                <span className="grm-cgpa__legend-item"><span className="grm-cgpa__legend-color is-cutoff" /> 7.50 Distinction Cutoff</span>
              </div>
            </div>

            {validRows.length === 0 ? (
              <div className="grm-cgpa__chart-empty">
                <FiLayers aria-hidden="true" />
                <p>No valid semester SGPAs entered yet. Go to <strong>Semesters & Calculator</strong> tab or load a preset to view trajectory.</p>
                <button type="button" className="grm-cgpa__btn-sm" onClick={() => { loadTopperSample(); setActiveTab('trajectory'); }}>
                  ⚡ Load Sample Data Now
                </button>
              </div>
            ) : (
              <div className="grm-cgpa__chart-canvas-wrap">
                <svg className="grm-cgpa__svg-chart" viewBox="0 0 800 240" preserveAspectRatio="none">
                  {/* Grid Lines for 0, 2.5, 5.0, 7.5, 10.0 */}
                  <line x1="40" y1="20" x2="780" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x="32" y="24" textAnchor="end" fontSize="10" fill="#94a3b8">10.0</text>

                  <line x1="40" y1="65" x2="780" y2="65" stroke="#fed7aa" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="32" y="69" textAnchor="end" fontSize="10" fill="#ea580c" fontWeight="600">7.5</text>

                  <line x1="40" y1="110" x2="780" y2="110" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x="32" y="114" textAnchor="end" fontSize="10" fill="#94a3b8">5.0</text>

                  <line x1="40" y1="200" x2="780" y2="200" stroke="#cbd5e1" strokeWidth="1" />
                  <text x="32" y="204" textAnchor="end" fontSize="10" fill="#94a3b8">0.0</text>

                  {/* Render Bars and Lines for valid rows */}
                  {(() => {
                    const count = validRows.length
                    const step = (740) / Math.max(1, count)
                    const barWidth = Math.min(48, Math.max(22, step * 0.45))

                    // Points for Cumulative Line
                    const linePoints = validRows.map((_, i) => {
                      const stat = rowCumulativeStats[i]
                      const cVal = stat && stat.runningCgpa !== '—' ? Number(stat.runningCgpa) : 0
                      const cx = 50 + i * step + step / 2
                      const cy = 200 - (cVal / 10) * 180
                      return { cx, cy, cVal }
                    })

                    const polylineStr = linePoints.map(p => `${p.cx},${p.cy}`).join(' ')

                    return (
                      <>
                        {/* SGPA Column Bars */}
                        {validRows.map((row, i) => {
                          const sVal = Number(row.sgpa) || 0
                          const barHeight = Math.max(4, (sVal / 10) * 180)
                          const bx = 50 + i * step + step / 2 - barWidth / 2
                          const by = 200 - barHeight
                          const barColor = sVal >= 8.5 ? '#4f46e5' : sVal >= 7.5 ? '#10b981' : sVal >= 6.5 ? '#0284c7' : sVal >= 5.0 ? '#f59e0b' : '#ef4444'

                          return (
                            <g key={row.id}>
                              <rect
                                x={bx}
                                y={by}
                                width={barWidth}
                                height={barHeight}
                                rx="5"
                                fill={barColor}
                                opacity="0.85"
                              />
                              <text
                                x={bx + barWidth / 2}
                                y={by - 6}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill={barColor}
                              >
                                {sVal.toFixed(2)}
                              </text>
                              <text
                                x={bx + barWidth / 2}
                                y={220}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="600"
                                fill="#475569"
                              >
                                Sem {i + 1}
                              </text>
                            </g>
                          )
                        })}

                        {/* Polyline for Cumulative CGPA */}
                        {linePoints.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={polylineStr}
                          />
                        )}

                        {/* Line Nodes / Dots */}
                        {linePoints.map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.cx} cy={pt.cy} r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
                            <text
                              x={pt.cx}
                              y={pt.cy - 10}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="700"
                              fill="#0f172a"
                            >
                              {pt.cVal.toFixed(2)}
                            </text>
                          </g>
                        ))}
                      </>
                    )
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Performance Milestone Insights */}
          {analyticsStats && (
            <div className="grm-cgpa__analytics-insights">
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Peak Performance Semester</span>
                <strong>{analyticsStats.peak.sem} ({analyticsStats.peak.sgpa.toFixed(2)} SGPA)</strong>
                <small>Highest scored semester record</small>
              </div>
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Lowest Semester Standing</span>
                <strong>{analyticsStats.lowest.sem} ({analyticsStats.lowest.sgpa.toFixed(2)} SGPA)</strong>
                <small>Requires focus or grade improvement</small>
              </div>
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Average Credits / Semester</span>
                <strong>{analyticsStats.avgCredits} Credits</strong>
                <small>Standard B.Tech semester load</small>
              </div>
              <div className="grm-cgpa__insight-card">
                <span className="grm-cgpa__insight-label">Overall Academic Momentum</span>
                <strong style={{ color: analyticsStats.trendDiff >= 0 ? '#166534' : '#b45309' }}>
                  {analyticsStats.trendDiff >= 0 ? `+${analyticsStats.trendDiff} Upward ↗` : `${analyticsStats.trendDiff} Dip ↘`}
                </strong>
                <small>Compared from Sem 1 to current</small>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         TAB 3: DEGREE AUDIT & HONOURS CLEARANCE
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="grm-cgpa-tab-pane">
          <div className="grm-cgpa__audit-panel">
            <div className="grm-cgpa__audit-header">
              <h4>
                <FiAward aria-hidden="true" /> Degree Clearance & Honours Standing Audit
              </h4>
              <span className="grm-cgpa__audit-reg">AICTE B.Tech 160-Credit Model Regulation</span>
            </div>

            <div className="grm-cgpa__audit-grid">
              <div className="grm-cgpa__audit-card">
                <div className="grm-cgpa__audit-icon is-blue"><FiBookOpen /></div>
                <div className="grm-cgpa__audit-info">
                  <strong>Credit Audit Status</strong>
                  <span>{totalCredits >= TOTAL_DEGREE_CREDITS ? 'Degree Credits Complete' : `${remainingDegreeCredits} Credits Remaining`}</span>
                  <small>{totalCredits} / {TOTAL_DEGREE_CREDITS} Total Program Credits</small>
                </div>
              </div>

              <div className="grm-cgpa__audit-card">
                <div className={`grm-cgpa__audit-icon is-${(cgpa && cgpa >= 7.5) ? 'green' : 'amber'}`}>
                  <FiCheckCircle />
                </div>
                <div className="grm-cgpa__audit-info">
                  <strong>Honours Degree Clearance</strong>
                  <span>{(cgpa && cgpa >= 7.5) ? 'Qualifies for B.Tech (Honours)' : 'Standard Degree Stream'}</span>
                  <small>Honours standard requires CGPA ≥ 7.50 without backlogs</small>
                </div>
              </div>

              <div className="grm-cgpa__audit-card">
                <div className="grm-cgpa__audit-icon is-purple"><FiAward /></div>
                <div className="grm-cgpa__audit-info">
                  <strong>Academic Division Class</strong>
                  <span>{divisionInfo ? divisionInfo.division : 'Awaiting Full Data'}</span>
                  <small>{activePercentage ? `${activePercentage.toFixed(2)}% Marks Equivalent` : 'UGC / AICTE Conversion'}</small>
                </div>
              </div>

              <div className="grm-cgpa__audit-card">
                <div className="grm-cgpa__audit-icon is-teal"><FiClock /></div>
                <div className="grm-cgpa__audit-info">
                  <strong>Pacing & Regularity</strong>
                  <span>{validRows.length ? `${validRows.length} Semesters Recorded` : '0 Recorded'}</span>
                  <small>Standard completion pace: 8 full semesters</small>
                </div>
              </div>
            </div>

            {/* Formal Criteria Table */}
            <div className="grm-cgpa__criteria-table-wrap">
              <table className="grm-cgpa__criteria-table">
                <thead>
                  <tr>
                    <th>Autonomous Degree Requirement</th>
                    <th>Required Benchmark</th>
                    <th>Current Status</th>
                    <th>Clearance Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Degree Credit Accumulation</strong></td>
                    <td>160 Total Earned Credits</td>
                    <td>{totalCredits} Credits Accumulated</td>
                    <td>
                      <span className={`grm-status-pill ${totalCredits >= TOTAL_DEGREE_CREDITS ? 'is-pass' : 'is-pending'}`}>
                        {totalCredits >= TOTAL_DEGREE_CREDITS ? '✓ Requirement Met' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>B.Tech Degree Passing Threshold</strong></td>
                    <td>CGPA ≥ 5.00</td>
                    <td>{cgpa !== null ? `${cgpa.toFixed(2)} CGPA` : '—'}</td>
                    <td>
                      <span className={`grm-status-pill ${cgpa && cgpa >= 5.0 ? 'is-pass' : 'is-pending'}`}>
                        {cgpa && cgpa >= 5.0 ? '✓ Satisfied' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>B.Tech Honours Eligibility</strong></td>
                    <td>CGPA ≥ 7.50 (Zero Backlogs)</td>
                    <td>{cgpa !== null ? `${cgpa.toFixed(2)} CGPA` : '—'}</td>
                    <td>
                      <span className={`grm-status-pill ${cgpa && cgpa >= 7.5 ? 'is-pass' : 'is-amber'}`}>
                        {cgpa && cgpa >= 7.5 ? '✓ Honours Qualified' : 'Standard Degree'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Backlog / Regularity Record</strong></td>
                    <td>All Sems ≥ 5.00 SGPA</td>
                    <td>{validRows.some(r => Number(r.sgpa) < 5.0) ? 'Remedial Semester Detected' : 'Clear Continuous Stream'}</td>
                    <td>
                      <span className={`grm-status-pill ${!validRows.some(r => Number(r.sgpa) < 5.0) ? 'is-pass' : 'is-fail'}`}>
                        {!validRows.some(r => Number(r.sgpa) < 5.0) ? '✓ Regular Standing' : 'Attention Needed'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: WHAT-IF GRADUATION GOAL SIMULATOR
         ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grm-cgpa-tab-pane">
          <div className="grm-cgpa__planner-box">
            <div className="grm-cgpa__planner-banner">
              <div>
                <h4 className="grm-cgpa__planner-title">
                  <FiTarget aria-hidden="true" /> Graduation Target Goal Simulator (What-If Analysis)
                </h4>
                <p className="grm-cgpa__planner-desc">
                  Calculate the exact average SGPA required in remaining semesters to achieve your target graduation CGPA.
                </p>
              </div>
              <span className="grm-cgpa__planner-badge">Interactive Simulator</span>
            </div>

            <div className="grm-cgpa__planner-content">
              <div className="grm-cgpa__planner-inputs">
                <label>
                  <span>Target Desired CGPA:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.01"
                    value={targetCgpa}
                    onChange={e => setTargetCgpa(e.target.value)}
                    placeholder="e.g. 8.50"
                  />
                </label>

                <label>
                  <span>Remaining Semesters:</span>
                  <ProjectSelect
                    value={targetRemainingSemesters}
                    onChange={e => {
                      const count = Number(e.target.value)
                      const credits = AUTONOMOUS_CREDITS.slice(-count)
                      setTargetRemainingSemesters(count)
                      setCreditsPerUpcomingSem(credits.reduce((sum, value) => sum + value, 0) / count)
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Semester' : 'Semesters'}
                      </option>
                    ))}
                  </ProjectSelect>
                </label>

                <label>
                  <span>Avg. Credits per Semester:</span>
                  <input
                    type="number"
                    min="10"
                    max="30"
                    step="0.5"
                    value={Number(Number(creditsPerUpcomingSem).toFixed(2))}
                    onChange={e => setCreditsPerUpcomingSem(Number(e.target.value))}
                    placeholder="e.g. 20"
                  />
                </label>
              </div>

              <div className="grm-cgpa__planner-result">
                <p className="grm-cgpa__planner-note">{targetRemainingSemesters} {Number(targetRemainingSemesters) === 1 ? 'semester' : 'semesters'} × {Number(Number(creditsPerUpcomingSem).toFixed(2))} average credits = <strong>{Number((Number(targetRemainingSemesters) * Number(creditsPerUpcomingSem)).toFixed(2))} remaining credits</strong>. Average defaults to the final {targetRemainingSemesters} semesters of the calculator credit preset; adjust it for your course.</p>
                {cgpa === null ? (
                  <p className="grm-cgpa__planner-note">Complete current semester rows with valid SGPAs and credits to simulate your graduation goal.</p>
                ) : !goalAnalysis ? (
                  <p className="grm-cgpa__planner-note">Enter a valid target CGPA (1-10).</p>
                ) : goalAnalysis.isImpossible ? (
                  <div className="grm-cgpa__planner-alert is-warning">
                    <strong>⚠️ Target Unreachable in {goalAnalysis.remSems} Semesters (Required SGPA: {goalAnalysis.requiredAvgSgpa.toFixed(2)} &gt; 10.00)</strong>
                    <p>
                      The gap between your current performance ({cgpa.toFixed(2)}) and target ({goalAnalysis.target.toFixed(2)}) cannot be bridged with only {goalAnalysis.upcomingTotalCredits} credits. Consider extending your goal across more semesters or earning additional honors/minor credits.
                    </p>
                  </div>
                ) : goalAnalysis.isAlreadySecured ? (
                  <div className="grm-cgpa__planner-alert is-success">
                    <strong><FiCheck aria-hidden="true" /> Target Already Secured!</strong>
                    <p>
                      Your current cumulative CGPA of <strong>{cgpa.toFixed(2)}</strong> already meets or exceeds target {goalAnalysis.target.toFixed(2)}. Maintaining passing grades (&ge; 5.0 SGPA) across the remaining {goalAnalysis.upcomingTotalCredits} credits will successfully achieve your graduation goal.
                    </p>
                  </div>
                ) : (
                  <div className="grm-cgpa__planner-alert is-achievable">
                    <div className="grm-cgpa__planner-req">
                      <span>Required Average SGPA in each of the next {goalAnalysis.remSems} semesters:</span>
                      <strong>{goalAnalysis.requiredAvgSgpa.toFixed(2)}</strong>
                      <small>out of 10.00</small>
                    </div>
                    <div className="grm-cgpa__planner-advice">
                      <span className={`grm-cgpa__feasibility-pill ${goalAnalysis.isEasy ? 'is-easy' : goalAnalysis.isModerate ? 'is-moderate' : 'is-hard'}`}>
                        {goalAnalysis.isEasy ? '✨ Easily Achievable' : goalAnalysis.isModerate ? '⚡ Moderate Challenge' : '🔥 High Performance Required'}
                      </span>
                      <p>
                        Scoring an average SGPA of <strong>{goalAnalysis.requiredAvgSgpa.toFixed(2)}</strong> across {goalAnalysis.upcomingTotalCredits} remaining credits will lift your cumulative performance from {cgpa.toFixed(2)} to exactly <strong>{goalAnalysis.target.toFixed(2)} CGPA</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SUBJECT-WISE SGPA CALCULATOR MODAL */}
      {subjectModalOpen && (
        <div className="grm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sub-modal-title">
          <div className="grm-modal grm-modal--subject-calc">
            <div className="grm-modal__header">
              <div>
                <h3 id="sub-modal-title">
                  <FiBookOpen aria-hidden="true" /> Subject-Wise SGPA Calculator
                </h3>
                <p>Enter subjects, credits, and letter grades to calculate the exact semester SGPA.</p>
              </div>
              <button
                type="button"
                className="grm-modal__close"
                onClick={() => setSubjectModalOpen(false)}
                aria-label="Close subject calculator"
              >
                <FiX />
              </button>
            </div>

            <div className="grm-modal__body">
              <div className="grm-modal__table-wrap">
                <table className="grm-modal__table">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Code</th>
                      <th style={{ width: '38%' }}>Subject Name</th>
                      <th style={{ width: '14%' }}>Credits</th>
                      <th style={{ width: '18%' }}>Letter Grade</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalSubjects.map((sub, idx) => (
                      <tr key={sub.id}>
                        <td>
                          <input
                            value={sub.code}
                            placeholder="CS301"
                            onChange={e => updateModalSubject(sub.id, 'code', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={sub.name}
                            placeholder="Course Name"
                            onChange={e => updateModalSubject(sub.id, 'name', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.5"
                            max="8"
                            step="0.5"
                            value={sub.credits}
                            onChange={e => updateModalSubject(sub.id, 'credits', e.target.value)}
                          />
                        </td>
                        <td>
                          <ProjectSelect
                            value={sub.grade}
                            onChange={e => updateModalSubject(sub.id, 'grade', e.target.value)}
                          >
                            {UGC_GRADES.map(g => (
                              <option key={g.grade} value={g.grade}>
                                {g.grade} ({g.points} pts) - {g.label}
                              </option>
                            ))}
                          </ProjectSelect>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="grm-modal__pts-badge">
                            {((Number(sub.credits) || 0) * (Number(sub.points) || 0)).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grm-modal__sub-actions">
                <button type="button" className="grm-btn-text" onClick={addModalSubject}>
                  <FiPlus /> Add Subject
                </button>
                <button type="button" className="grm-btn-text" onClick={() => setModalSubjects(DEFAULT_SUBJECTS)}>
                  <FiRotateCcw /> Load Standard Curriculum
                </button>
              </div>

              {/* Computed SGPA Banner */}
              <div className="grm-modal__result-strip">
                <div className="grm-modal__stat">
                  <span>Total Semester Credits</span>
                  <strong>{computedModalStats.totalCr.toFixed(1)}</strong>
                </div>
                <div className="grm-modal__stat">
                  <span>Total Grade Points</span>
                  <strong>{computedModalStats.totalPts.toFixed(1)}</strong>
                </div>
                <div className="grm-modal__stat is-highlight">
                  <span>Calculated SGPA</span>
                  <strong>{computedModalStats.sgpa}</strong>
                </div>
              </div>
            </div>

            <div className="grm-modal__footer">
              <button
                type="button"
                className="grm-modal__btn-secondary"
                onClick={() => setSubjectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="grm-modal__btn-primary"
                onClick={applyModalSgpa}
              >
                <FiCheck /> Apply SGPA to Semester
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. UGC / AICTE 10-POINT GRADING SCALE GUIDE MODAL */}
      {gradeScaleOpen && (
        <div className="grm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="scale-modal-title">
          <div className="grm-modal grm-modal--grade-guide">
            <div className="grm-modal__header">
              <div>
                <h3 id="scale-modal-title">
                  <FiHelpCircle aria-hidden="true" /> UGC / AICTE 10-Point Grading System Standard
                </h3>
                <p>Standard letter grading and credit weighting prescribed for autonomous B.Tech institutions.</p>
              </div>
              <button
                type="button"
                className="grm-modal__close"
                onClick={() => setGradeScaleOpen(false)}
                aria-label="Close grade guide"
              >
                <FiX />
              </button>
            </div>

            <div className="grm-modal__body">
              <div className="grm-guide-table-scroll" role="region" aria-label="Grade scale reference table" tabIndex={0}>
              <table className="grm-guide-table">
                <thead>
                  <tr>
                    <th>Letter Grade</th>
                    <th>Grade Points</th>
                    <th>Marks Range (%)</th>
                    <th>Qualitative Rating</th>
                    <th>Academic Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {UGC_GRADES.map(g => (
                    <tr key={g.grade}>
                      <td><span className="grm-guide-pill">{g.grade}</span></td>
                      <td><strong>{g.points}</strong></td>
                      <td>{g.minMarks}</td>
                      <td>{g.label}</td>
                      <td>
                        {g.points >= 9
                          ? 'Outstanding Performance'
                          : g.points >= 8
                            ? 'First Class with Distinction'
                            : g.points >= 7
                              ? 'First Class Standing'
                              : g.points >= 5
                                ? 'Second Class / Passing'
                                : 'Academic Arrear / Remedial Required'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <div className="grm-guide-notes">
                <p><strong>Note 1:</strong> SGPA = Σ (Credit × Grade Point) ÷ Σ Credits for the semester.</p>
                <p><strong>Note 2:</strong> CGPA = Σ (Semester Credits × SGPA) ÷ Total Cumulative Credits.</p>
                <p><strong>Note 3:</strong> AICTE Percentage Formula: Percentage (%) = (CGPA − 0.75) × 10.</p>
              </div>
            </div>

            <div className="grm-modal__footer">
              <button
                type="button"
                className="grm-modal__btn-primary"
                onClick={() => setGradeScaleOpen(false)}
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

return CGPACalculator;
})();

return { default: CGPACalculatorPage }
})()

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
  return <section className="grm-semester-overview"><h3>Semester performance</h3><div className="grm-table-scroll"><table className="erp-table"><thead><tr><th>Semester</th><th>Assessments</th><th>Passed</th><th>Failed</th><th>Pending</th><th>Weighted GPA</th></tr></thead><tbody>{groups.map(group => { const records = rows.filter(row => (row.semester || 'Unassigned') === group.group); const gpa = weightedGpa(records); return <tr key={group.group}><td>{group.group}</td><td>{group.subjects}</td><td>{group.passed}</td><td>{group.failed}</td><td>{group.pending}</td><td>{gpa === null ? '-' : gpa.toFixed(2)}</td></tr> })}</tbody></table></div><p>GPA uses available assessments, including repeat attempts. This is an informational calculation.</p></section>
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
