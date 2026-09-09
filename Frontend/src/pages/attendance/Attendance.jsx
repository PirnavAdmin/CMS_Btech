import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFilter,
  FiLayers,
  FiPlus,
  FiSearch,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiAlertTriangle,
  FiSave,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import InfoCard from '../../components/InfoCard'
import TablePagination from '../../components/TablePagination'
import ExportMenu from '../../components/ExportMenu'
import SearchableSelect from '../../components/SearchableSelect'
import ViewDialog from '../../components/ViewDialog'
import { useAcademic } from '../../context/AcademicContext'
import attendanceService from '../../services/attendanceService'
import studentService from '../../services/studentService'
import './Attendance.css'

const ATTENDANCE_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'subject', label: 'Subject' },
  { key: 'course', label: 'Course' },
  { key: 'branch', label: 'Branch' },
  { key: 'semester', label: 'Semester' },
  { key: 'section', label: 'Section' },
  { key: 'totalStudents', label: 'Total' },
  { key: 'presentCount', label: 'Present' },
  { key: 'absentCount', label: 'Absent' },
  { key: 'attendanceRate', label: 'Attendance %' },
  { key: 'faculty', label: 'Faculty' },
]

export default function Attendance() {
  const {
    activeAcademicYears,
    activeDepartments,
    activeCourses,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [activeTab, setActiveTab] = useState('register') // 'register' | 'take' | 'shortage'
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)

  // Scope Filters for Register
  const [filterQuery, setFilterQuery] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterBranchId, setFilterBranchId] = useState('')
  const [filterSemesterId, setFilterSemesterId] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // "Take Attendance" Form State
  const [takeScope, setTakeScope] = useState({
    academicYearId: '',
    departmentId: '',
    courseId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    date: new Date().toISOString().slice(0, 10),
    subject: 'Data Structures & Algorithms',
    faculty: 'Dr. S. K. Raman',
  })
  const [markingStudents, setMarkingStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingSession, setSavingSession] = useState(false)

  // Shortage list state
  const [allProfiles, setAllProfiles] = useState([])

  const notify = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await attendanceService.getSessions()
      setSessions(data || [])
    } catch (err) {
      console.warn('Error loading attendance sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProfiles = useCallback(async () => {
    try {
      const profiles = await studentService.getAllProfiles()
      setAllProfiles(profiles || [])
    } catch (err) {
      console.warn('Error loading profiles for shortage:', err)
    }
  }, [])

  useEffect(() => {
    loadSessions()
    loadProfiles()
  }, [loadSessions, loadProfiles])

  // Cascading lists for Take Attendance
  const takeBranches = useMemo(() => {
    return getBranchesForCourse(takeScope.courseId, true)
  }, [getBranchesForCourse, takeScope.courseId])

  const takeSemesters = useMemo(() => {
    return getSemestersForCourse(takeScope.courseId, true)
  }, [getSemestersForCourse, takeScope.courseId])

  const takeSections = useMemo(() => {
    return getSectionsForScope({
      academicYearId: takeScope.academicYearId,
      departmentId: takeScope.departmentId,
      courseId: takeScope.courseId,
      branchId: takeScope.branchId,
      semesterId: takeScope.semesterId,
    }, true)
  }, [getSectionsForScope, takeScope])

  // Load students to mark attendance
  const handleFetchStudentsForMarking = async () => {
    if (!takeScope.courseId || !takeScope.branchId || !takeScope.semesterId) {
      notify('Please select Course, Branch, and Semester first.')
      return
    }

    try {
      setLoadingStudents(true)
      const selectedCourse = activeCourses.find(c => String(c.id) === String(takeScope.courseId))
      const selectedBranch = takeBranches.find(b => String(b.id) === String(takeScope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(takeScope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(takeScope.sectionId))

      const list = await attendanceService.getStudentsForAttendance({
        academicYearId: takeScope.academicYearId,
        courseId: takeScope.courseId,
        branchId: takeScope.branchId,
        semesterId: takeScope.semesterId,
        sectionId: takeScope.sectionId,
        course: selectedCourse?.name,
        branch: selectedBranch?.name,
        semester: selectedSemester?.semesterName,
        section: selectedSection?.name,
      })

      if (!list.length) {
        // Generate mock class roll if students haven't been enrolled yet for this section
        const branchCode = selectedBranch?.code || 'CS'
        const semNum = selectedSemester?.semesterNumber || 1
        const sectionName = selectedSection?.name || 'A'
        const fallbackList = Array.from({ length: 15 }, (_, i) => ({
          studentId: `STU-${branchCode}-${semNum}-${101 + i}`,
          id: `STU-${branchCode}-${semNum}-${101 + i}`,
          name: `Student ${101 + i} (${branchCode})`,
          rollNumber: `26${branchCode}${String(101 + i).slice(-3)}`,
          status: 'Present',
        }))
        setMarkingStudents(fallbackList)
      } else {
        setMarkingStudents(list)
      }
    } catch (err) {
      notify('Failed to load students for attendance.')
    } finally {
      setLoadingStudents(false)
    }
  }

  // Quick action: Mark All Present
  const handleMarkAll = (status) => {
    setMarkingStudents(prev => prev.map(s => ({ ...s, status })))
  }

  // Toggle individual student status
  const handleStudentStatusChange = (studentId, status) => {
    setMarkingStudents(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)))
  }

  // Save session
  const handleSaveAttendance = async () => {
    if (!markingStudents.length) {
      notify('No students to record attendance for.')
      return
    }

    try {
      setSavingSession(true)
      const selectedCourse = activeCourses.find(c => String(c.id) === String(takeScope.courseId))
      const selectedBranch = takeBranches.find(b => String(b.id) === String(takeScope.branchId))
      const selectedSemester = takeSemesters.find(s => String(s.id) === String(takeScope.semesterId))
      const selectedSection = takeSections.find(sec => String(sec.id) === String(takeScope.sectionId))
      const selectedYear = activeAcademicYears.find(y => String(y.id) === String(takeScope.academicYearId))

      await attendanceService.recordAttendance({
        academicYearId: takeScope.academicYearId,
        courseId: takeScope.courseId,
        branchId: takeScope.branchId,
        semesterId: takeScope.semesterId,
        sectionId: takeScope.sectionId,
        academicYear: selectedYear?.name || '2026-2027',
        course: selectedCourse?.name || 'B.Tech',
        branch: selectedBranch?.name || 'Computer Science & Engineering',
        semester: selectedSemester?.semesterName || 'Semester 1',
        section: selectedSection?.name || 'Section A',
        date: takeScope.date,
        subject: takeScope.subject,
        faculty: takeScope.faculty,
        records: markingStudents,
      })

      notify('Attendance recorded and saved successfully!')
      loadSessions()
      setActiveTab('register')
    } catch (err) {
      notify('Failed to save attendance.')
    } finally {
      setSavingSession(false)
    }
  }

  // Filtered Sessions for Register Tab
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchQuery = !filterQuery || `${s.subject} ${s.course} ${s.branch} ${s.section} ${s.faculty}`.toLowerCase().includes(filterQuery.toLowerCase())
      const matchCourse = !filterCourseId || String(s.courseId) === String(filterCourseId)
      const matchBranch = !filterBranchId || String(s.branchId) === String(filterBranchId)
      const matchSemester = !filterSemesterId || String(s.semesterId) === String(filterSemesterId)
      const matchDate = !filterDate || s.date === filterDate
      return matchQuery && matchCourse && matchBranch && matchSemester && matchDate
    })
  }, [sessions, filterQuery, filterCourseId, filterBranchId, filterSemesterId, filterDate])

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSessions.slice(start, start + pageSize)
  }, [filteredSessions, currentPage])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalSessions = sessions.length
    const totalPresent = sessions.reduce((acc, s) => acc + (s.presentCount || 0), 0)
    const totalHeadcount = sessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0)
    const avgPercentage = totalHeadcount > 0 ? Math.round((totalPresent / totalHeadcount) * 100) : 92

    return {
      totalSessions,
      totalPresent,
      avgPercentage: `${avgPercentage}%`,
      shortageCount: allProfiles.filter(p => (p.attendanceRate || 82) < 75).length,
    }
  }, [sessions, allProfiles])

  return (
    <DashboardLayout>
      <div className="attendance-page">
        <PageHeader
          title="Attendance Management"
          subtitle="Daily class attendance registers, session entry, and student shortage monitoring."
          breadcrumb={[
            { label: 'Attendance' },
          ]}
          actions={
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={() => setActiveTab('take')}
            >
              <FiPlus /> Take Attendance
            </button>
          }
        />

        {toast && (
          <div className="erp-toast erp-toast--success" role="status">
            <FiCheckCircle /> {toast}
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="attendance-tabs">
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <FiCalendar /> Attendance Register
          </button>
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'take' ? 'active' : ''}`}
            onClick={() => setActiveTab('take')}
          >
            <FiUserCheck /> Take Attendance
          </button>
          <button
            type="button"
            className={`attendance-tab ${activeTab === 'shortage' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortage')}
          >
            <FiAlertTriangle /> Shortage List (&lt;75%)
          </button>
        </nav>

        {/* TAB 1: Attendance Register */}
        {activeTab === 'register' && (
          <section className="attendance-content">
            {/* KPI Summary Strip */}
            <div className="erp-kpi-strip">
              <div className="erp-kpi-card">
                <span className="erp-kpi-label">Recorded Sessions</span>
                <span className="erp-kpi-value">{summaryMetrics.totalSessions}</span>
              </div>
              <div className="erp-kpi-card">
                <span className="erp-kpi-label">Avg Attendance Rate</span>
                <span className="erp-kpi-value erp-kpi-value--success">{summaryMetrics.avgPercentage}</span>
              </div>
              <div className="erp-kpi-card">
                <span className="erp-kpi-label">Total Student Entries</span>
                <span className="erp-kpi-value">{summaryMetrics.totalPresent}</span>
              </div>
              <div className="erp-kpi-card">
                <span className="erp-kpi-label">Shortage Risk Students</span>
                <span className="erp-kpi-value erp-kpi-value--warning">{summaryMetrics.shortageCount}</span>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="erp-card erp-filter-card">
              <div className="erp-filter-grid">
                <div className="erp-form-group">
                  <label>Search Subject / Faculty</label>
                  <div className="erp-input-icon-wrap">
                    <FiSearch className="erp-input-icon" />
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Search..."
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

                <div className="erp-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="erp-input"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>

                <div className="erp-form-group erp-filter-actions">
                  <label>&nbsp;</label>
                  <ExportMenu
                    rows={filteredSessions.map(s => ({
                      ...s,
                      attendanceRate: `${Math.round(((s.presentCount || 0) / (s.totalStudents || 1)) * 100)}%`,
                    }))}
                    columns={ATTENDANCE_COLUMNS}
                    title="Attendance Register"
                    filename="attendance-register"
                  />
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="erp-card erp-table-card">
              {loading ? (
                <div className="erp-loading-state"><FiClock /> Loading attendance sessions...</div>
              ) : paginatedSessions.length === 0 ? (
                <EmptyState
                  icon={FiCalendar}
                  title="No Attendance Sessions Found"
                  subtitle="Start by recording daily class attendance using the 'Take Attendance' workspace."
                  actionLabel="Take Attendance Now"
                  onAction={() => setActiveTab('take')}
                />
              ) : (
                <>
                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Subject</th>
                          <th>Academic Scope</th>
                          <th>Section</th>
                          <th>Strength</th>
                          <th>Present / Absent</th>
                          <th>Attendance Rate</th>
                          <th>Faculty</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSessions.map((session) => {
                          const rate = session.totalStudents > 0
                            ? Math.round((session.presentCount / session.totalStudents) * 100)
                            : 0

                          return (
                            <tr key={session.sessionId}>
                              <td><strong>{session.date}</strong></td>
                              <td><strong>{session.subject}</strong></td>
                              <td>{session.course} · {session.branch} · {session.semester}</td>
                              <td><span className="erp-badge erp-badge--neutral">{session.section}</span></td>
                              <td>{session.totalStudents}</td>
                              <td>
                                <span className="text-success font-semibold">{session.presentCount} P</span> /{' '}
                                <span className="text-danger font-semibold">{session.absentCount} A</span>
                              </td>
                              <td>
                                <StatusBadge
                                  status={rate >= 75 ? 'Active' : 'Warning'}
                                  label={`${rate}%`}
                                />
                              </td>
                              <td>{session.faculty}</td>
                              <td>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn--icon"
                                  title="View Session Details"
                                  onClick={() => setSelectedSession(session)}
                                >
                                  <FiEye />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={currentPage}
                    totalItems={filteredSessions.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: Take Attendance Workspace */}
        {activeTab === 'take' && (
          <section className="attendance-content">
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Class Attendance Workspace</h2>
                  <p className="erp-card-subtitle">Select academic scope, load student roster, and mark session attendance.</p>
                </div>
              </div>

              {/* Scope Selection Form */}
              <div className="erp-form-grid">
                <div className="erp-form-group">
                  <label>Academic Year *</label>
                  <select
                    className="erp-select"
                    value={takeScope.academicYearId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, academicYearId: e.target.value }))}
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
                    value={takeScope.departmentId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, departmentId: e.target.value }))}
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
                    value={takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, courseId: e.target.value, branchId: '', semesterId: '', sectionId: '' }))}
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
                    value={takeScope.branchId}
                    disabled={!takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, branchId: e.target.value }))}
                  >
                    <option value="">Select Branch</option>
                    {takeBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Semester *</label>
                  <select
                    className="erp-select"
                    value={takeScope.semesterId}
                    disabled={!takeScope.courseId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, semesterId: e.target.value }))}
                  >
                    <option value="">Select Semester</option>
                    {takeSemesters.map(s => (
                      <option key={s.id} value={s.id}>{s.semesterName}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Section</label>
                  <select
                    className="erp-select"
                    value={takeScope.sectionId}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, sectionId: e.target.value }))}
                  >
                    <option value="">All Sections / Unspecified</option>
                    {takeSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Session Date *</label>
                  <input
                    type="date"
                    className="erp-input"
                    value={takeScope.date}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="erp-form-group">
                  <label>Subject / Course Module *</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={takeScope.subject}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Distributed Systems"
                  />
                </div>

                <div className="erp-form-group">
                  <label>Faculty In-Charge</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={takeScope.faculty}
                    onChange={(e) => setTakeScope(prev => ({ ...prev, faculty: e.target.value }))}
                  />
                </div>
              </div>

              <div className="attendance-fetch-action">
                <button
                  type="button"
                  className="erp-btn erp-btn--primary"
                  disabled={loadingStudents || !takeScope.courseId || !takeScope.branchId || !takeScope.semesterId}
                  onClick={handleFetchStudentsForMarking}
                >
                  {loadingStudents ? 'Fetching Roster...' : 'Load Student Roster'}
                </button>
              </div>

              {/* Roster Marking Grid */}
              {markingStudents.length > 0 && (
                <div className="attendance-marking-section">
                  <div className="attendance-marking-header">
                    <h3>Student Roster ({markingStudents.length} Students)</h3>
                    <div className="attendance-bulk-buttons">
                      <button
                        type="button"
                        className="erp-btn erp-btn--secondary"
                        onClick={() => handleMarkAll('Present')}
                      >
                        <FiUserCheck /> Mark All Present
                      </button>
                      <button
                        type="button"
                        className="erp-btn erp-btn--secondary"
                        onClick={() => handleMarkAll('Absent')}
                      >
                        <FiUserX /> Mark All Absent
                      </button>
                    </div>
                  </div>

                  <div className="erp-table-responsive">
                    <table className="erp-table attendance-marking-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Status Marking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {markingStudents.map((s, idx) => (
                          <tr key={s.studentId || idx}>
                            <td>{idx + 1}</td>
                            <td><strong>{s.rollNumber || s.id}</strong></td>
                            <td>{s.name}</td>
                            <td>
                              <div className="attendance-status-radios">
                                {['Present', 'Absent', 'Late', 'Excused'].map((statusOption) => (
                                  <label
                                    key={statusOption}
                                    className={`attendance-radio-chip ${s.status === statusOption ? `active active--${statusOption.toLowerCase()}` : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`status-${s.studentId}`}
                                      value={statusOption}
                                      checked={s.status === statusOption}
                                      onChange={() => handleStudentStatusChange(s.studentId, statusOption)}
                                    />
                                    {statusOption}
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="attendance-save-footer">
                    <button
                      type="button"
                      className="erp-btn erp-btn--primary erp-btn--lg"
                      disabled={savingSession}
                      onClick={handleSaveAttendance}
                    >
                      <FiSave /> {savingSession ? 'Saving Session...' : 'Save & Publish Attendance'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: Shortage List */}
        {activeTab === 'shortage' && (
          <section className="attendance-content">
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Attendance Shortage List (&lt; 75% Threshold)</h2>
                  <p className="erp-card-subtitle">Students ineligible or at risk for semester-end examinations based on minimum AICTE/UGC attendance criteria.</p>
                </div>
                <ExportMenu
                  rows={allProfiles.filter(p => (p.attendanceRate || 80) < 75).map(p => ({
                    studentId: p.studentId || p.id,
                    name: p.personal?.fullName || p.name,
                    rollNumber: p.academic?.rollNumber || p.rollNumber,
                    course: p.academic?.course || 'B.Tech',
                    branch: p.academic?.branch || 'CSE',
                    semester: p.academic?.semester || 'Semester 1',
                    attendancePercentage: `${p.attendanceRate || 68}%`,
                    status: 'Shortage (Exam Ineligible)',
                  }))}
                  columns={[
                    { key: 'rollNumber', label: 'Roll No' },
                    { key: 'name', label: 'Student Name' },
                    { key: 'course', label: 'Course' },
                    { key: 'branch', label: 'Branch' },
                    { key: 'semester', label: 'Semester' },
                    { key: 'attendancePercentage', label: 'Attendance' },
                    { key: 'status', label: 'Eligibility Status' },
                  ]}
                  title="Attendance Shortage"
                  filename="attendance-shortage-list"
                />
              </div>

              <div className="erp-table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Course / Branch</th>
                      <th>Semester</th>
                      <th>Recorded Attendance</th>
                      <th>Deficit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProfiles.filter(p => (p.attendanceRate || 80) < 75).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6">
                          <FiCheckCircle className="text-success text-2xl mb-2" />
                          <p>All active students meet the 75% minimum attendance requirement.</p>
                        </td>
                      </tr>
                    ) : (
                      allProfiles.filter(p => (p.attendanceRate || 80) < 75).map((p) => {
                        const rate = p.attendanceRate || 68
                        return (
                          <tr key={p.studentId || p.id}>
                            <td><strong>{p.academic?.rollNumber || p.rollNumber || p.id}</strong></td>
                            <td>{p.personal?.fullName || p.name}</td>
                            <td>{p.academic?.course || 'B.Tech'} · {p.academic?.branch || 'CSE'}</td>
                            <td>{p.academic?.semester || 'Semester 1'}</td>
                            <td><strong className="text-danger">{rate}%</strong></td>
                            <td>{75 - rate}% required</td>
                            <td><StatusBadge status="Danger" label="Shortage (Ineligible)" /></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* View Details Dialog */}
        {selectedSession && (
          <ViewDialog
            title={`Session Details: ${selectedSession.subject}`}
            onClose={() => setSelectedSession(null)}
          >
            <div className="attendance-session-detail">
              <div className="erp-detail-grid">
                <InfoCard
                  icon={FiCalendar}
                  title="Session Information"
                  items={[
                    { label: 'Date', value: selectedSession.date },
                    { label: 'Subject', value: selectedSession.subject },
                    { label: 'Faculty', value: selectedSession.faculty },
                    { label: 'Academic Year', value: selectedSession.academicYear },
                  ]}
                />
                <InfoCard
                  icon={FiLayers}
                  title="Academic Scope"
                  items={[
                    { label: 'Course', value: selectedSession.course },
                    { label: 'Branch', value: selectedSession.branch },
                    { label: 'Semester', value: selectedSession.semester },
                    { label: 'Section', value: selectedSession.section },
                  ]}
                />
              </div>

              <div className="erp-detail-section">
                <h3 className="erp-detail-heading">Student Attendance Breakdown ({selectedSession.totalStudents} Students)</h3>
                <div className="erp-table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSession.records || []).map((r, idx) => (
                        <tr key={r.studentId || idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{r.rollNumber || r.studentId}</strong></td>
                          <td>{r.name}</td>
                          <td>
                            <StatusBadge
                              status={r.status === 'Present' ? 'Active' : r.status === 'Late' ? 'Warning' : 'Danger'}
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
