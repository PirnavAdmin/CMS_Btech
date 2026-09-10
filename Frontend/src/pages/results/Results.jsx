import { showError } from '../../utils/toast'
import useToastState from '../../hooks/useToastState'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FiAward,
  FiBookOpen,
  FiClock,
  FiEdit2,
  FiEye,
  FiFilter,
  FiLayers,
  FiPlus,
  FiSearch,
  FiUsers,
  FiSave,
  FiTrendingUp,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import InfoCard from '../../components/InfoCard'
import TablePagination from '../../components/TablePagination'
import ExportMenu from '../../components/ExportMenu'
import ViewDialog from '../../components/ViewDialog'
import { useAcademic } from '../../context/AcademicContext'
import resultsService, { calculateGrade } from '../../services/resultsService'
import studentService from '../../services/studentService'
import './Results.css'

const RESULTS_COLUMNS = [
  { key: 'subjectCode', label: 'Subject Code' },
  { key: 'subjectName', label: 'Subject Name' },
  { key: 'examType', label: 'Exam Type' },
  { key: 'course', label: 'Course' },
  { key: 'branch', label: 'Branch' },
  { key: 'semester', label: 'Semester' },
  { key: 'section', label: 'Section' },
  { key: 'totalStudents', label: 'Students' },
  { key: 'passedCount', label: 'Passed' },
  { key: 'failedCount', label: 'Failed' },
  { key: 'passRate', label: 'Pass Rate' },
]

export default function Results() {
  const {
    activeAcademicYears,
    activeDepartments,
    activeCourses,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [activeTab, setActiveTab] = useState('directory') // 'directory' | 'entry' | 'transcripts'
  const [resultSheets, setResultSheets] = useState([])
  const [loading, setLoading] = useState(false)
  const [, setToast] = useToastState('', 'success')
  const [selectedSheet, setSelectedSheet] = useState(null)

  // Scope Filters for Directory
  const [filterQuery, setFilterQuery] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterBranchId, setFilterBranchId] = useState('')
  const [filterSemesterId, setFilterSemesterId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // "Marks Entry" Form State
  const [entryScope, setEntryScope] = useState({
    academicYearId: '',
    departmentId: '',
    courseId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    examType: 'End Semester Regular Exam',
    subjectCode: 'CS801',
    subjectName: 'Distributed Systems & Cloud Computing',
    credits: 4,
    maxInternal: 30,
    maxExternal: 70,
  })
  const [entryStudents, setEntryStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingResults, setSavingResults] = useState(false)

  // Transcripts State
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentTranscript, setStudentTranscript] = useState(null)
  const [allProfiles, setAllProfiles] = useState([])

  const notify = (msg, type = 'success') => setToast(msg, type)

  const loadResultSheets = useCallback(async () => {
    try {
      setLoading(true)
      const data = await resultsService.getResults()
      setResultSheets(data || [])
    } catch (err) {
      showError(err.message || 'Error loading results sheets:')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProfiles = useCallback(async () => {
    try {
      const profiles = await studentService.getAllProfiles()
      setAllProfiles(profiles || [])
      if (profiles.length > 0 && !selectedStudentId) {
        setSelectedStudentId(profiles[0].studentId || profiles[0].id)
      }
    } catch (err) {
      showError(err.message || 'Error loading student profiles for results:')
    }
  }, [selectedStudentId])

  useEffect(() => {
    loadResultSheets()
    loadProfiles()
  }, [loadResultSheets, loadProfiles])

  // Cascading lists for Marks Entry
  const entryBranches = useMemo(() => {
    return getBranchesForCourse(entryScope.courseId, true)
  }, [getBranchesForCourse, entryScope.courseId])

  const entrySemesters = useMemo(() => {
    return getSemestersForCourse(entryScope.courseId, true)
  }, [getSemestersForCourse, entryScope.courseId])

  const entrySections = useMemo(() => {
    return getSectionsForScope({
      academicYearId: entryScope.academicYearId,
      departmentId: entryScope.departmentId,
      courseId: entryScope.courseId,
      branchId: entryScope.branchId,
      semesterId: entryScope.semesterId,
    }, true)
  }, [getSectionsForScope, entryScope])

  // Load students for marks entry
  const handleFetchStudentsForEntry = async () => {
    if (!entryScope.courseId || !entryScope.branchId || !entryScope.semesterId) {
      notify('Please select Course, Branch, and Semester first.', 'warning')
      return
    }

    try {
      setLoadingStudents(true)
      const selectedCourse = activeCourses.find(c => String(c.id) === String(entryScope.courseId))
      const selectedBranch = entryBranches.find(b => String(b.id) === String(entryScope.branchId))
      const selectedSemester = entrySemesters.find(s => String(s.id) === String(entryScope.semesterId))
      const selectedSection = entrySections.find(sec => String(sec.id) === String(entryScope.sectionId))

      const list = await resultsService.getStudentsForResults({
        academicYearId: entryScope.academicYearId,
        courseId: entryScope.courseId,
        branchId: entryScope.branchId,
        semesterId: entryScope.semesterId,
        sectionId: entryScope.sectionId,
        course: selectedCourse?.name,
        branch: selectedBranch?.name,
        semester: selectedSemester?.semesterName,
        section: selectedSection?.name,
      })

      setEntryStudents(list)
    } catch (err) {
      notify(err.message || 'Failed to load students for marks entry.', 'error')
    } finally {
      setLoadingStudents(false)
    }
  }

  // Handle student marks changes with real-time grade calculations
  const handleMarksChange = (studentId, field, value) => {
    const numVal = value === '' ? '' : Math.max(0, Number(value) || 0)
    setEntryStudents(prev => prev.map(s => {
      if (s.studentId !== studentId) return s

      const internal = field === 'internalMarks' ? numVal : (Number(s.internalMarks) || 0)
      const external = field === 'externalMarks' ? numVal : (Number(s.externalMarks) || 0)
      const total = (typeof internal === 'number' ? internal : 0) + (typeof external === 'number' ? external : 0)
      const { grade, gradePoint, status } = calculateGrade(total)

      return {
        ...s,
        [field]: numVal,
        totalMarks: total,
        grade,
        gradePoint,
        status,
      }
    }))
  }

  // Save Marks & Publish Results
  const handleSaveResults = async () => {
    if (!entryStudents.length) {
      notify('No student marks to save.', 'warning')
      return
    }

    try {
      setSavingResults(true)
      const selectedCourse = activeCourses.find(c => String(c.id) === String(entryScope.courseId))
      const selectedBranch = entryBranches.find(b => String(b.id) === String(entryScope.branchId))
      const selectedSemester = entrySemesters.find(s => String(s.id) === String(entryScope.semesterId))
      const selectedSection = entrySections.find(sec => String(sec.id) === String(entryScope.sectionId))
      const selectedYear = activeAcademicYears.find(y => String(y.id) === String(entryScope.academicYearId))

      await resultsService.recordResults({
        academicYearId: entryScope.academicYearId,
        courseId: entryScope.courseId,
        branchId: entryScope.branchId,
        semesterId: entryScope.semesterId,
        sectionId: entryScope.sectionId,
        academicYear: selectedYear?.name || '2026-2027',
        course: selectedCourse?.name || 'B.Tech',
        branch: selectedBranch?.name || 'Computer Science & Engineering',
        semester: selectedSemester?.semesterName || 'Semester 1',
        section: selectedSection?.name || 'Section A',
        examType: entryScope.examType,
        subjectCode: entryScope.subjectCode,
        subjectName: entryScope.subjectName,
        maxInternal: entryScope.maxInternal,
        maxExternal: entryScope.maxExternal,
        credits: entryScope.credits,
        records: entryStudents,
      })

      notify('Marks recorded and semester results published successfully!')
      loadResultSheets()
      setActiveTab('directory')
    } catch (err) {
      notify(err.message || 'Failed to save results.', 'error')
    } finally {
      setSavingResults(false)
    }
  }

  // Load Transcript for Selected Student
  useEffect(() => {
    if (activeTab === 'transcripts' && selectedStudentId) {
      resultsService.getStudentTranscript(selectedStudentId).then(setStudentTranscript)
    }
  }, [activeTab, selectedStudentId])

  // Filtered Sheets for Directory Tab
  const filteredSheets = useMemo(() => {
    return resultSheets.filter(r => {
      const matchQuery = !filterQuery || `${r.subjectCode} ${r.subjectName} ${r.course} ${r.branch} ${r.examType}`.toLowerCase().includes(filterQuery.toLowerCase())
      const matchCourse = !filterCourseId || String(r.courseId) === String(filterCourseId)
      const matchBranch = !filterBranchId || String(r.branchId) === String(filterBranchId)
      const matchSemester = !filterSemesterId || String(r.semesterId) === String(filterSemesterId)
      return matchQuery && matchCourse && matchBranch && matchSemester
    })
  }, [resultSheets, filterQuery, filterCourseId, filterBranchId, filterSemesterId])

  const paginatedSheets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSheets.slice(start, start + pageSize)
  }, [filteredSheets, currentPage])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalSheets = resultSheets.length
    const totalStudentsEvaluated = resultSheets.reduce((acc, r) => acc + (r.totalStudents || 0), 0)
    const totalPassed = resultSheets.reduce((acc, r) => acc + (r.passedCount || 0), 0)
    const passRate = totalStudentsEvaluated > 0 ? Math.round((totalPassed / totalStudentsEvaluated) * 100) : 94

    return {
      totalSheets,
      totalStudentsEvaluated,
      passRate: `${passRate}%`,
    }
  }, [resultSheets])

  return (
    <DashboardLayout>
      <div className="results-page">
        <PageHeader
          title="Results & Marks Management"
          subtitle="Examination grading, marks entry registers, pass/fail publication, and student transcripts."
          breadcrumb={[
            { label: 'Results' },
          ]}
          actions={
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={() => setActiveTab('entry')}
            >
              <FiPlus /> New Marks Entry
            </button>
          }
        />



        {/* Tab Navigation */}
        <nav className="results-tabs">
          <button
            type="button"
            className={`results-tab ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            <FiLayers /> Results Directory
          </button>
          <button
            type="button"
            className={`results-tab ${activeTab === 'entry' ? 'active' : ''}`}
            onClick={() => setActiveTab('entry')}
          >
            <FiEdit2 /> Marks Entry Workspace
          </button>
          <button
            type="button"
            className={`results-tab ${activeTab === 'transcripts' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcripts')}
          >
            <FiAward /> Academic Transcripts & CGPA
          </button>
        </nav>

        {/* TAB 1: Results Directory */}
        {activeTab === 'directory' && (
          <section className="results-content">
            {/* KPI Strip */}
            <div className="erp-kpi-strip">
              <div className="erp-kpi-card">
                <span className="erp-kpi-label">Published Sheets</span>
                <span className="erp-kpi-value">{summaryMetrics.totalSheets}</span>
              </div>
              <div className="erp-kpi-card">
                <span className="erp-kpi-label">Overall Pass Rate</span>
                <span className="erp-kpi-value erp-kpi-value--success">{summaryMetrics.passRate}</span>
              </div>
              <div className="erp-kpi-card">
                <span className="erp-kpi-label">Students Evaluated</span>
                <span className="erp-kpi-value">{summaryMetrics.totalStudentsEvaluated}</span>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="erp-card erp-filter-card">
              <div className="erp-filter-grid">
                <div className="erp-form-group">
                  <label>Search Subject / Exam</label>
                  <div className="erp-input-icon-wrap">
                    <FiSearch className="erp-input-icon" />
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Search subject..."
                      value={filterQuery}
                      onChange={(e) => {
                        setFilterQuery(e.target.value)
                        setCurrentPage(1)
                      }}
                    />
                  </div>
                </div>

                <div className="erp-form-group">
                  <label>Course</label>
                  <select
                    className="erp-select"
                    value={filterCourseId}
                    onChange={(e) => {
                      setFilterCourseId(e.target.value)
                      setFilterBranchId('')
                      setCurrentPage(1)
                    }}
                  >
                    <option value="">All Courses</option>
                    {activeCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group erp-filter-actions">
                  <label>&nbsp;</label>
                  <ExportMenu
                    rows={filteredSheets.map(s => ({
                      ...s,
                      passRate: `${Math.round(((s.passedCount || 0) / (s.totalStudents || 1)) * 100)}%`,
                    }))}
                    columns={RESULTS_COLUMNS}
                    title="Results Directory"
                    filename="results-directory"
                  />
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="erp-card erp-table-card">
              {loading ? (
                <div className="erp-loading-state"><FiClock /> Loading results sheets...</div>
              ) : paginatedSheets.length === 0 ? (
                <EmptyState
                  icon={FiAward}
                  title="No Published Results Found"
                  subtitle="Record subject marks and publish semester results using the 'Marks Entry Workspace'."
                  actionLabel="Enter Subject Marks"
                  onAction={() => setActiveTab('entry')}
                />
              ) : (
                <>
                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Exam Type</th>
                          <th>Academic Scope</th>
                          <th>Section</th>
                          <th>Students</th>
                          <th>Passed / Failed</th>
                          <th>Pass %</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSheets.map((sheet) => {
                          const rate = sheet.totalStudents > 0
                            ? Math.round((sheet.passedCount / sheet.totalStudents) * 100)
                            : 0

                          return (
                            <tr key={sheet.sheetId}>
                              <td><strong>{sheet.subjectCode}</strong></td>
                              <td><strong>{sheet.subjectName}</strong></td>
                              <td>{sheet.examType}</td>
                              <td>{sheet.course} · {sheet.branch} · {sheet.semester}</td>
                              <td><span className="erp-badge erp-badge--neutral">{sheet.section}</span></td>
                              <td>{sheet.totalStudents}</td>
                              <td>
                                <span className="text-success font-semibold">{sheet.passedCount} Pass</span> /{' '}
                                <span className="text-danger font-semibold">{sheet.failedCount} Fail</span>
                              </td>
                              <td>
                                <StatusBadge
                                  status={rate >= 75 ? 'Active' : 'Warning'}
                                  label={`${rate}%`}
                                />
                              </td>
                              <td className="table-center">
                                <div className="table-actions-group">
                                  <button
                                    type="button"
                                    className="table-action-btn action-view"
                                    title="View Grade Breakdown"
                                    onClick={() => setSelectedSheet(sheet)}
                                  >
                                    <FiEye />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={currentPage}
                    totalItems={filteredSheets.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: Marks Entry Workspace */}
        {activeTab === 'entry' && (
          <section className="results-content">
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Subject Marks Entry & Grading Roster</h2>
                  <p className="erp-card-subtitle">Enter internal (out of 30) and external (out of 70) marks with live UGC/AICTE 10-point grade computation.</p>
                </div>
              </div>

              {/* Scope Selection Form */}
              <div className="erp-form-grid">
                <div className="erp-form-group">
                  <label>Academic Year *</label>
                  <select
                    className="erp-select"
                    value={entryScope.academicYearId}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, academicYearId: e.target.value }))}
                  >
                    <option value="">Select Academic Year</option>
                    {activeAcademicYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Department *</label>
                  <select
                    className="erp-select"
                    value={entryScope.departmentId}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, departmentId: e.target.value }))}
                  >
                    <option value="">Select Department</option>
                    {activeDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Course *</label>
                  <select
                    className="erp-select"
                    value={entryScope.courseId}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, courseId: e.target.value, branchId: '', semesterId: '', sectionId: '' }))}
                  >
                    <option value="">Select Course</option>
                    {activeCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Branch *</label>
                  <select
                    className="erp-select"
                    value={entryScope.branchId}
                    disabled={!entryScope.courseId}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, branchId: e.target.value }))}
                  >
                    <option value="">Select Branch</option>
                    {entryBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Semester *</label>
                  <select
                    className="erp-select"
                    value={entryScope.semesterId}
                    disabled={!entryScope.courseId}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, semesterId: e.target.value }))}
                  >
                    <option value="">Select Semester</option>
                    {entrySemesters.map(s => (
                      <option key={s.id} value={s.id}>{s.semesterName}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Section</label>
                  <select
                    className="erp-select"
                    value={entryScope.sectionId}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, sectionId: e.target.value }))}
                  >
                    <option value="">All Sections / Unspecified</option>
                    {entrySections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Exam Type</label>
                  <select
                    className="erp-select"
                    value={entryScope.examType}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, examType: e.target.value }))}
                  >
                    <option value="End Semester Regular Exam">End Semester Regular Exam</option>
                    <option value="Supplementary Exam">Supplementary Exam</option>
                    <option value="Improvement Exam">Improvement Exam</option>
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Subject Code *</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={entryScope.subjectCode}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, subjectCode: e.target.value }))}
                  />
                </div>

                <div className="erp-form-group">
                  <label>Subject Name *</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={entryScope.subjectName}
                    onChange={(e) => setEntryScope(prev => ({ ...prev, subjectName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="results-fetch-action">
                <button
                  type="button"
                  className="erp-btn erp-btn--primary"
                  disabled={loadingStudents || !entryScope.courseId || !entryScope.branchId || !entryScope.semesterId}
                  onClick={handleFetchStudentsForEntry}
                >
                  {loadingStudents ? 'Fetching Roster...' : 'Load Student Roster'}
                </button>
              </div>

              {/* Roster Entry Grid */}
              {entryStudents.length > 0 && (
                <div className="results-entry-section">
                  <div className="results-entry-header">
                    <h3>Student Grading Roster ({entryStudents.length} Students)</h3>
                    <span className="results-badge-info">Max: Internal (30) + External (70) = Total (100)</span>
                  </div>

                  <div className="erp-table-responsive">
                    <table className="erp-table results-entry-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Internal (Max 30)</th>
                          <th>External (Max 70)</th>
                          <th>Total (100)</th>
                          <th>Grade</th>
                          <th>Grade Point</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryStudents.map((s, idx) => (
                          <tr key={s.studentId || idx}>
                            <td>{idx + 1}</td>
                            <td><strong>{s.rollNumber || s.id}</strong></td>
                            <td>{s.name}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                className="erp-input results-num-input"
                                value={s.internalMarks}
                                onChange={(e) => handleMarksChange(s.studentId, 'internalMarks', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="70"
                                className="erp-input results-num-input"
                                value={s.externalMarks}
                                onChange={(e) => handleMarksChange(s.studentId, 'externalMarks', e.target.value)}
                              />
                            </td>
                            <td><strong>{s.totalMarks || 0}</strong></td>
                            <td><span className={`results-grade results-grade--${(s.grade || 'F').toLowerCase()}`}>{s.grade || '—'}</span></td>
                            <td>{s.gradePoint !== undefined ? s.gradePoint : '—'}</td>
                            <td>
                              <StatusBadge
                                status={s.status === 'Passed' ? 'Active' : 'Danger'}
                                label={s.status || 'Pending'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="results-save-footer">
                    <button
                      type="button"
                      className="erp-btn erp-btn--primary erp-btn--lg"
                      disabled={savingResults}
                      onClick={handleSaveResults}
                    >
                      <FiSave /> {savingResults ? 'Publishing Results...' : 'Save & Publish Semester Results'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: Academic Transcripts */}
        {activeTab === 'transcripts' && (
          <section className="results-content">
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Cumulative Academic Transcript & CGPA</h2>
                  <p className="erp-card-subtitle">Official multi-semester course performance, cumulative credits earned, and CGPA calculation.</p>
                </div>

                <div className="results-student-select">
                  <label>Select Student:</label>
                  <select
                    className="erp-select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                  >
                    {allProfiles.map(p => (
                      <option key={p.studentId || p.id} value={p.studentId || p.id}>
                        {p.personal?.fullName || p.name} ({p.academic?.rollNumber || p.rollNumber || p.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {studentTranscript && (
                <div className="results-transcript-body">
                  <div className="results-cgpa-banner">
                    <div className="results-cgpa-box">
                      <span>Cumulative GPA</span>
                      <strong>{studentTranscript.cgpa} / 10.0</strong>
                    </div>
                    <div className="results-credits-box">
                      <span>Total Earned Credits</span>
                      <strong>{studentTranscript.totalCredits} Credits</strong>
                    </div>
                  </div>

                  <h3 className="results-section-heading">Course Grade Sheet</h3>
                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Semester</th>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Credits</th>
                          <th>Internal</th>
                          <th>External</th>
                          <th>Total</th>
                          <th>Grade</th>
                          <th>Grade Point</th>
                          <th>Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentTranscript.courses.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-4 text-muted">
                              No examination records found for this student.
                            </td>
                          </tr>
                        ) : (
                          studentTranscript.courses.map((c, idx) => (
                            <tr key={idx}>
                              <td>{c.semester}</td>
                              <td><strong>{c.subjectCode}</strong></td>
                              <td>{c.subjectName}</td>
                              <td>{c.credits}</td>
                              <td>{c.internalMarks}</td>
                              <td>{c.externalMarks}</td>
                              <td><strong>{c.totalMarks}</strong></td>
                              <td><strong className="text-primary">{c.grade}</strong></td>
                              <td>{c.gradePoint}</td>
                              <td>
                                <StatusBadge
                                  status={c.status === 'Passed' ? 'Active' : 'Danger'}
                                  label={c.status}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* View Details Dialog */}
        {selectedSheet && (
          <ViewDialog
            exportFilename={`result_${selectedSheet.id || selectedSheet.subjectCode}`}
            title={`Result Sheet: ${selectedSheet.subjectName}`}
            onClose={() => setSelectedSheet(null)}
          >
            <div className="results-sheet-detail">
              <div className="erp-detail-grid">
                <InfoCard
                  icon={FiBookOpen}
                  title="Subject Information"
                  items={[
                    { label: 'Subject Code', value: selectedSheet.subjectCode },
                    { label: 'Subject Name', value: selectedSheet.subjectName },
                    { label: 'Exam Type', value: selectedSheet.examType },
                    { label: 'Credits', value: selectedSheet.credits },
                  ]}
                />
                <InfoCard
                  icon={FiLayers}
                  title="Academic Scope"
                  items={[
                    { label: 'Course', value: selectedSheet.course },
                    { label: 'Branch', value: selectedSheet.branch },
                    { label: 'Semester', value: selectedSheet.semester },
                    { label: 'Section', value: selectedSheet.section },
                  ]}
                />
              </div>

              <div className="erp-detail-section">
                <h3 className="erp-detail-heading">Student Score Roster ({selectedSheet.totalStudents} Students)</h3>
                <div className="erp-table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Internal</th>
                        <th>External</th>
                        <th>Total</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSheet.records || []).map((r, idx) => (
                        <tr key={r.studentId || idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{r.rollNumber || r.studentId}</strong></td>
                          <td>{r.name}</td>
                          <td>{r.internalMarks}</td>
                          <td>{r.externalMarks}</td>
                          <td><strong>{r.totalMarks}</strong></td>
                          <td><strong>{r.grade}</strong></td>
                          <td>
                            <StatusBadge
                              status={r.status === 'Passed' ? 'Active' : 'Danger'}
                              label={r.status}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ViewDialog>
        )}
      </div>
    </DashboardLayout>
  )
}
