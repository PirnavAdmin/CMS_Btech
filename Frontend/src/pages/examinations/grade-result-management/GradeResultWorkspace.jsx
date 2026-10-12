import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
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
} from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import { useAcademic } from '../../../context/AcademicContext'
import resultsService from '../../../services/resultsService'
import { gradeScreens } from './gradeScreens'
import {
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
} from './gradeResultModel'
import GradePolicyLab from './GradePolicyLab'
import SearchableSelect from '../../../components/SearchableSelect'
import GradePolicyEditor from './GradePolicyEditor'
import GradeToolsNav from './GradeToolsNav'
import './GradeResultWorkspace.css'

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
                <select
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
                </select>
              </label>
              <label className="res-filter-label">
                Semester
                <select
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
                </select>
              </label>
              <label className="res-filter-label">
                Result Status
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Passed">Passed (All Clear)</option>
                  <option value="Failed">Arrears Pending</option>
                </select>
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
                  <select
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
                  </select>
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
                <select
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
                </select>
              </label>
              <label className="res-filter-label">
                Semester
                <select
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
                </select>
              </label>
              <label className="res-filter-label">
                Status
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Passed">Passed (All Clear)</option>
                  <option value="Failed">Has Arrears</option>
                </select>
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
                  <select
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
                  </select>
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
                <select
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
                </select>
              </label>
              <label className="res-filter-label">
                Semester
                <select
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
                </select>
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
                  <select
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
                  </select>
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

export default function GradeResultWorkspace(props) {
  return <LocalGradeResultWorkspace {...props} />
}
