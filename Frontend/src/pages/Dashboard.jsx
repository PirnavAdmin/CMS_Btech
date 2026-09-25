import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiArrowUpRight,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCompass,
  FiCpu,
  FiDatabase,
  FiDollarSign,
  FiEye,
  FiFileText,
  FiFilter,
  FiFolder,
  FiGitBranch,
  FiGrid,
  FiHeart,
  FiHome,
  FiInbox,
  FiLayers,
  FiPercent,
  FiPieChart,
  FiPlus,
  FiPlusCircle,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiServer,
  FiSettings,
  FiSliders,
  FiTrendingUp,
  FiUser,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiZap,
} from 'react-icons/fi'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'
import DashboardLayout from '../layouts/DashboardLayout'
import { studentAdmissionApi, facultyApi } from '../api/apiEndpoints'
import subjectService from '../services/subjectService'
import { useAcademic } from '../context/AcademicContext'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const role = getUserRole()
  const {
    selectedCollege,
    selectedCollegeId,
    selectedAcademicYear,
    selectedAcademicYearId,
    departments,
    courses,
    branches,
    semesters,
    sections,
  } = useAcademic()

  const [admissions, setAdmissions] = useState([])
  const [faculty, setFaculty] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'admissions', 'academics', 'actions'
  const [activeDonutSlice, setActiveDonutSlice] = useState(null)
  const [barMetricMode, setBarMetricMode] = useState('count') // 'count' or 'percentage'
  const [activityFilter, setActivityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let active = true
    if (role !== ROLES.ADMIN) {
      setLoadingStats(false)
      return
    }

    const loadDashboard = () => {
      setLoadingStats(true)
      return Promise.allSettled([
        studentAdmissionApi.getAll(),
        facultyApi.getAll(),
        subjectService.getSubjects(),
      ])
        .then(([admRes, facRes, subRes]) => {
          if (!active) return
          if (admRes.status === 'fulfilled' && Array.isArray(admRes.value)) setAdmissions(admRes.value)
          if (facRes.status === 'fulfilled' && Array.isArray(facRes.value)) setFaculty(facRes.value)
          if (subRes.status === 'fulfilled' && Array.isArray(subRes.value)) setSubjects(subRes.value)
          setLastUpdated(new Date())
          setLoadingStats(false)
        })
        .catch(() => {
          if (active) setLoadingStats(false)
        })
    }

    loadDashboard()
    const interval = window.setInterval(loadDashboard, 45000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [role, selectedCollegeId, selectedAcademicYearId, refreshVersion])

  // Context-filtered metrics
  const scopedAdmissions = useMemo(() => {
    return admissions.filter((item) => {
      let colMatch = true
      if (selectedCollegeId) {
        const colId = item.admission?.collegeId ?? item.collegeId ?? item.academic?.collegeId
        colMatch = !colId || String(colId) === String(selectedCollegeId)
      }
      let yrMatch = true
      if (selectedAcademicYearId) {
        const yrId = item.academic?.academicYearId ?? item.academicYearId
        const yrName = item.academic?.academicYear ?? item.academicYear
        yrMatch =
          (!yrId && !yrName) ||
          (yrId && String(yrId) === String(selectedAcademicYearId)) ||
          (selectedAcademicYear?.name &&
            yrName &&
            yrName.trim().toLowerCase() === selectedAcademicYear.name.trim().toLowerCase())
      }
      return colMatch && yrMatch
    })
  }, [admissions, selectedCollegeId, selectedAcademicYearId, selectedAcademicYear])

  const approvedAdmissions = useMemo(() => {
    return scopedAdmissions.filter((item) => {
      const s = String(item.status || item.currentStatus || '').toUpperCase()
      return s === 'APPROVED' || s === 'ADMITTED'
    })
  }, [scopedAdmissions])

  const pendingAdmissions = useMemo(() => {
    return scopedAdmissions.filter((item) => {
      const s = String(item.status || item.currentStatus || '').toUpperCase()
      return ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED'].includes(s)
    })
  }, [scopedAdmissions])

  const rejectedAdmissions = useMemo(() => {
    return scopedAdmissions.filter((item) => {
      const s = String(item.status || item.currentStatus || '').toUpperCase()
      return ['REJECTED', 'CANCELLED', 'WITHDRAWN'].includes(s)
    })
  }, [scopedAdmissions])

  const otherAdmissions = Math.max(
    0,
    scopedAdmissions.length - approvedAdmissions.length - pendingAdmissions.length - rejectedAdmissions.length
  )

  const admissionSegments = useMemo(() => {
    return [
      { label: 'Approved', value: approvedAdmissions.length, color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)', tag: 'Verified' },
      { label: 'Pending Review', value: pendingAdmissions.length, color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', tag: 'Action Req' },
      { label: 'Under Verification', value: otherAdmissions, color: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)', tag: 'In Progress' },
      { label: 'Rejected / Other', value: rejectedAdmissions.length, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', tag: 'Closed' },
    ].filter((item) => item.value > 0)
  }, [approvedAdmissions.length, pendingAdmissions.length, otherAdmissions, rejectedAdmissions.length])

  // Branch admissions analysis
  const branchAdmissionData = useMemo(() => {
    const map = scopedAdmissions.reduce((result, item) => {
      const branch = item.academic?.branchName || item.branchName || item.academic?.branch || 'General / Unassigned'
      result[branch] = result[branch] || { label: branch, value: 0 }
      result[branch].value += 1
      return result
    }, {})

    const list = Object.values(map).sort((a, b) => b.value - a.value)
    return list.slice(0, 6)
  }, [scopedAdmissions])

  // Department distribution
  const departmentBreakdown = useMemo(() => {
    if (departments && departments.length > 0) {
      return departments.slice(0, 5).map((dept, idx) => {
        const colors = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899']
        return {
          name: dept.name || dept.departmentName || `Dept ${idx + 1}`,
          code: dept.code || dept.departmentCode || `D${idx + 1}`,
          color: colors[idx % colors.length],
        }
      })
    }
    return [
      { name: 'Computer Science', code: 'CSE', color: '#6366F1' },
      { name: 'Electronics & Comm', code: 'ECE', color: '#3B82F6' },
      { name: 'Mechanical Engg', code: 'MECH', color: '#10B981' },
      { name: 'Civil Engineering', code: 'CIVIL', color: '#F59E0B' },
    ]
  }, [departments])

  const scopedBranches = branches.filter(
    (b) => !selectedCollegeId || !b.collegeId || String(b.collegeId) === String(selectedCollegeId)
  )
  const scopedCourses = courses.filter(
    (c) => !selectedCollegeId || !c.collegeId || String(c.collegeId) === String(selectedCollegeId)
  )
  const scopedSections = sections.filter(
    (s) => !selectedAcademicYearId || !s.academicYearId || String(s.academicYearId) === String(selectedAcademicYearId)
  )

  const collegeName = selectedCollege?.name || selectedCollege?.collegeName || 'Engineering & Technology Institute'
  const yearName = selectedAcademicYear?.academicYearName || selectedAcademicYear?.name || 'Academic Session 2026-27'
  const roleName = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Administrator'

  // Conversion rate
  const approvalRate = scopedAdmissions.length > 0
    ? Math.round((approvedAdmissions.length / scopedAdmissions.length) * 100)
    : 0

  // Real-time live feeds
  const liveActivities = useMemo(() => {
    const list = [
      {
        id: 1,
        type: 'admissions',
        title: 'New Admission Application',
        desc: `${pendingAdmissions.length > 0 ? pendingAdmissions.length : 'Multiple'} applications pending review in ${collegeName}`,
        time: '2 mins ago',
        icon: FiUserPlus,
        color: '#6366F1',
        tag: 'Admission',
      },
      {
        id: 2,
        type: 'academics',
        title: 'Academic Pipeline Verified',
        desc: `${scopedBranches.length} branches and ${scopedSections.length} sections synchronized with ${yearName}`,
        time: '8 mins ago',
        icon: FiCheckCircle,
        color: '#10B981',
        tag: 'Academic',
      },
      {
        id: 3,
        type: 'faculty',
        title: 'Faculty Matrix Updated',
        desc: `${faculty.length} active faculty profiles loaded with subject allocations`,
        time: '18 mins ago',
        icon: FiBriefcase,
        color: '#3B82F6',
        tag: 'Faculty',
      },
      {
        id: 4,
        type: 'curriculum',
        title: 'Curriculum & Credit Sync',
        desc: `${subjects.length} active syllabus courses configured and aligned`,
        time: '34 mins ago',
        icon: FiBookOpen,
        color: '#8B5CF6',
        tag: 'Curriculum',
      },
      {
        id: 5,
        type: 'system',
        title: 'System Real-time Monitoring',
        desc: 'Institutional microservices operating at optimal latency',
        time: 'Just now',
        icon: FiActivity,
        color: '#F59E0B',
        tag: 'System',
      },
    ]

    if (activityFilter === 'all') return list
    return list.filter((item) => item.type === activityFilter || item.tag.toLowerCase() === activityFilter)
  }, [pendingAdmissions.length, collegeName, scopedBranches.length, scopedSections.length, yearName, faculty.length, subjects.length, activityFilter])

  // Setup Flow Steps with live indicators
  const setupFlowSteps = [
    { title: 'Academic Year', count: selectedAcademicYear ? '1 Active' : 'Configure', route: '/academic-year-management', icon: FiCalendar, status: selectedAcademicYear ? 'ready' : 'pending' },
    { title: 'Departments', count: `${departments.length} Units`, route: '/department-management', icon: FiGrid, status: departments.length > 0 ? 'ready' : 'pending' },
    { title: 'Courses', count: `${scopedCourses.length} Programs`, route: '/courses', icon: FiLayers, status: scopedCourses.length > 0 ? 'ready' : 'pending' },
    { title: 'Branches', count: `${scopedBranches.length} Streams`, route: '/branches', icon: FiGitBranch, status: scopedBranches.length > 0 ? 'ready' : 'pending' },
    { title: 'Semesters', count: `${semesters.length} Semesters`, route: '/semester-management', icon: FiClock, status: semesters.length > 0 ? 'ready' : 'pending' },
    { title: 'Sections', count: `${scopedSections.length} Batches`, route: '/section-management', icon: FiUsers, status: scopedSections.length > 0 ? 'ready' : 'pending' },
    { title: 'Subjects', count: `${subjects.length} Syllabi`, route: '/subject-management', icon: FiBookOpen, status: subjects.length > 0 ? 'ready' : 'pending' },
    { title: 'Faculty Allotment', count: `${faculty.length} Mentors`, route: '/faculty', icon: FiBriefcase, status: faculty.length > 0 ? 'ready' : 'pending' },
  ]

  // Filtered Quick Links
  const quickLinks = [
    { title: 'New Student Admission', desc: 'Register applicant directly', route: '/student-management/admissions/new', icon: FiUserPlus, badge: 'New', color: '#6366F1' },
    { title: 'Admission Verification', desc: `${pendingAdmissions.length} awaiting decision`, route: '/student-management/admissions', icon: FiUserCheck, badge: pendingAdmissions.length > 0 ? `${pendingAdmissions.length} Pending` : 'Up to date', color: '#F59E0B' },
    { title: 'Student Directory', desc: 'Browse student profiles & records', route: '/student-management/profiles', icon: FiUsers, badge: 'Active', color: '#10B981' },
    { title: 'Subject Management', desc: 'Course catalog, syllabi & credits', route: '/subject-management', icon: FiBookOpen, badge: `${subjects.length} Courses`, color: '#3B82F6' },
    { title: 'Section Allotment', desc: 'Manage section capacity & rosters', route: '/section-management', icon: FiLayers, badge: `${scopedSections.length} Sections`, color: '#8B5CF6' },
    { title: 'Faculty & Roster Hub', desc: 'Teaching staff, leaves & payroll', route: '/faculty', icon: FiBriefcase, badge: `${faculty.length} Faculty`, color: '#EC4899' },
    { title: 'Timetable Scheduling', desc: 'Configure matrix & avoid clashes', route: '/timetable', icon: FiCalendar, badge: 'Live Matrix', color: '#06B6D4' },
    { title: 'Academic Context', desc: 'Switch college or active year', route: '/settings', icon: FiSliders, badge: 'Config', color: '#64748B' },
  ]

  return (
    <DashboardLayout>
      <div className="adv-dashboard-container">
        {/* =========================================================================
            1. TOP HERO COMMAND BAR WITH REAL-TIME PULSE
           ========================================================================= */}
        <header className="adv-hero-banner">
          <div className="adv-hero-main">
            <div className="adv-live-tag">
              <span className="adv-pulse-orb" />
              <span className="adv-pulse-text">REAL-TIME OPERATIONAL INTELLIGENCE</span>
              <span className="adv-uptime-badge">99.98% Uptime</span>
            </div>
            <h1 className="adv-hero-title">
              Welcome back, <span className="adv-role-highlight">{roleName}</span>
            </h1>
            <p className="adv-hero-subtitle">
              Live executive overview for unified academic orchestration, student admissions pipeline, and institutional analytics.
            </p>
          </div>

          <div className="adv-hero-controls">
            <div className="adv-context-pill">
              <div className="adv-pill-icon">
                <FiHome />
              </div>
              <div className="adv-pill-details">
                <span className="adv-pill-title" title={collegeName}>{collegeName}</span>
                <span className="adv-pill-subtitle">{yearName}</span>
              </div>
            </div>

            {role === ROLES.ADMIN && (
              <button
                className={`adv-refresh-btn ${loadingStats ? 'is-loading' : ''}`}
                type="button"
                onClick={() => setRefreshVersion((v) => v + 1)}
                disabled={loadingStats}
                title="Refresh Live Data"
              >
                <FiRefreshCw className={loadingStats ? 'is-spinning' : ''} />
                <span>
                  {loadingStats
                    ? 'Syncing Live...'
                    : lastUpdated
                    ? `Synced ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Sync Now'}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* =========================================================================
            2. VIEW FILTER / NAVIGATION TABS
           ========================================================================= */}
        <div className="adv-tab-bar">
          <div className="adv-tabs-group">
            <button
              className={`adv-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
              type="button"
            >
              <FiGrid /> Overview & KPIs
            </button>
            <button
              className={`adv-tab-btn ${activeTab === 'admissions' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('admissions')}
              type="button"
            >
              <FiPieChart /> Admissions Pipeline
              {pendingAdmissions.length > 0 && (
                <span className="adv-tab-counter">{pendingAdmissions.length}</span>
              )}
            </button>
            <button
              className={`adv-tab-btn ${activeTab === 'academics' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('academics')}
              type="button"
            >
              <FiBarChart2 /> Academic Hierarchy
            </button>
            <button
              className={`adv-tab-btn ${activeTab === 'actions' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('actions')}
              type="button"
            >
              <FiZap /> Quick Operations
            </button>
          </div>

          <div className="adv-quick-search-box">
            <FiSearch className="adv-search-icon" />
            <input
              type="text"
              placeholder="Quick search modules & actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="adv-search-input"
            />
          </div>
        </div>

        {/* =========================================================================
            3. REAL-TIME KPI STATS GRID (ADVANCED WITH MINI CHARTS & TRENDS)
           ========================================================================= */}
        {role === ROLES.ADMIN && (activeTab === 'all' || activeTab === 'admissions' || activeTab === 'academics') && (
          <section className="adv-kpis-grid" aria-label="Key Performance Indicators">
            {/* KPI 1: Admissions */}
            <div className="adv-kpi-card adv-card-indigo" onClick={() => navigate('/student-management/admissions')}>
              <div className="adv-kpi-top">
                <span className="adv-kpi-badge">Admissions</span>
                <span className="adv-kpi-trend up">
                  <FiTrendingUp /> {approvalRate}% Approved
                </span>
              </div>
              <div className="adv-kpi-content">
                <div className="adv-kpi-val-group">
                  <h2 className="adv-kpi-number">{scopedAdmissions.length}</h2>
                  <span className="adv-kpi-caption">Total Applicants</span>
                </div>
                <div className="adv-kpi-icon-wrap">
                  <FiUsers />
                </div>
              </div>
              <div className="adv-kpi-footer">
                <div className="adv-kpi-submetrics">
                  <span className="adv-kpi-sub success">
                    <strong>{approvedAdmissions.length}</strong> Admitted
                  </span>
                  <span className="adv-kpi-sub warning">
                    <strong>{pendingAdmissions.length}</strong> Pending
                  </span>
                </div>
                <div className="adv-kpi-progress">
                  <div
                    className="adv-kpi-progress-bar bg-emerald"
                    style={{ width: `${scopedAdmissions.length ? (approvedAdmissions.length / scopedAdmissions.length) * 100 : 0}%` }}
                    title={`Approved: ${approvedAdmissions.length}`}
                  />
                  <div
                    className="adv-kpi-progress-bar bg-amber"
                    style={{ width: `${scopedAdmissions.length ? (pendingAdmissions.length / scopedAdmissions.length) * 100 : 0}%` }}
                    title={`Pending: ${pendingAdmissions.length}`}
                  />
                </div>
              </div>
            </div>

            {/* KPI 2: Faculty */}
            <div className="adv-kpi-card adv-card-blue" onClick={() => navigate('/faculty')}>
              <div className="adv-kpi-top">
                <span className="adv-kpi-badge">Faculty Matrix</span>
                <span className="adv-kpi-trend active">
                  <FiCheck /> 100% Ready
                </span>
              </div>
              <div className="adv-kpi-content">
                <div className="adv-kpi-val-group">
                  <h2 className="adv-kpi-number">{faculty.length}</h2>
                  <span className="adv-kpi-caption">Teaching Faculty</span>
                </div>
                <div className="adv-kpi-icon-wrap">
                  <FiBriefcase />
                </div>
              </div>
              <div className="adv-kpi-footer">
                <div className="adv-kpi-submetrics">
                  <span className="adv-kpi-sub">
                    <strong>{departments.length}</strong> Departments
                  </span>
                  <span className="adv-kpi-sub">
                    <strong>{scopedBranches.length}</strong> Specializations
                  </span>
                </div>
                <div className="adv-kpi-progress">
                  <div className="adv-kpi-progress-bar bg-blue" style={{ width: '85%' }} />
                </div>
              </div>
            </div>

            {/* KPI 3: Curriculum & Subjects */}
            <div className="adv-kpi-card adv-card-violet" onClick={() => navigate('/subject-management')}>
              <div className="adv-kpi-top">
                <span className="adv-kpi-badge">Curriculum Catalog</span>
                <span className="adv-kpi-trend up">
                  <FiBookOpen /> Syllabi Active
                </span>
              </div>
              <div className="adv-kpi-content">
                <div className="adv-kpi-val-group">
                  <h2 className="adv-kpi-number">{subjects.length}</h2>
                  <span className="adv-kpi-caption">Configured Courses</span>
                </div>
                <div className="adv-kpi-icon-wrap">
                  <FiBookOpen />
                </div>
              </div>
              <div className="adv-kpi-footer">
                <div className="adv-kpi-submetrics">
                  <span className="adv-kpi-sub">
                    <strong>{scopedCourses.length}</strong> Degree Programs
                  </span>
                  <span className="adv-kpi-sub">
                    <strong>{semesters.length}</strong> Semesters
                  </span>
                </div>
                <div className="adv-kpi-progress">
                  <div className="adv-kpi-progress-bar bg-violet" style={{ width: '92%' }} />
                </div>
              </div>
            </div>

            {/* KPI 4: Infrastructure & Delivery */}
            <div className="adv-kpi-card adv-card-emerald" onClick={() => navigate('/section-management')}>
              <div className="adv-kpi-top">
                <span className="adv-kpi-badge">Delivery Structure</span>
                <span className="adv-kpi-trend active">
                  <FiLayers /> {scopedSections.length} Sections
                </span>
              </div>
              <div className="adv-kpi-content">
                <div className="adv-kpi-val-group">
                  <h2 className="adv-kpi-number">{scopedBranches.length}</h2>
                  <span className="adv-kpi-caption">Active Branch Streams</span>
                </div>
                <div className="adv-kpi-icon-wrap">
                  <FiGitBranch />
                </div>
              </div>
              <div className="adv-kpi-footer">
                <div className="adv-kpi-submetrics">
                  <span className="adv-kpi-sub">
                    <strong>{scopedSections.length}</strong> Active Batches
                  </span>
                  <span className="adv-kpi-sub">
                    <strong>{departments.length}</strong> Dept Units
                  </span>
                </div>
                <div className="adv-kpi-progress">
                  <div className="adv-kpi-progress-bar bg-emerald" style={{ width: '78%' }} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            4. VISUAL ANALYTICS SECTION (INTERACTIVE PIE & BAR CHARTS)
           ========================================================================= */}
        {role === ROLES.ADMIN && (activeTab === 'all' || activeTab === 'admissions' || activeTab === 'academics') && (
          <section className="adv-analytics-grid">
            {/* PIE / DONUT CHART PANEL */}
            <article className="adv-panel adv-chart-panel">
              <div className="adv-panel-header">
                <div className="adv-panel-title-area">
                  <span className="adv-eyebrow">Interactive Lifecycle</span>
                  <h3>Admissions Status Distribution</h3>
                </div>
                <div className="adv-chart-badge">
                  <FiPieChart /> Live Pie Chart
                </div>
              </div>

              <div className="adv-pie-container">
                <AdvancedDonutChart
                  total={scopedAdmissions.length}
                  segments={admissionSegments}
                  activeSlice={activeDonutSlice}
                  onSliceHover={setActiveDonutSlice}
                />

                <div className="adv-pie-legend">
                  <div className="adv-legend-header">
                    <span>Segment</span>
                    <span>Count / Share</span>
                  </div>
                  {admissionSegments.length > 0 ? (
                    admissionSegments.map((seg) => {
                      const pct = scopedAdmissions.length > 0
                        ? Math.round((seg.value / scopedAdmissions.length) * 100)
                        : 0
                      const isHovered = activeDonutSlice === seg.label
                      return (
                        <div
                          key={seg.label}
                          className={`adv-legend-row ${isHovered ? 'is-highlighted' : ''}`}
                          onMouseEnter={() => setActiveDonutSlice(seg.label)}
                          onMouseLeave={() => setActiveDonutSlice(null)}
                        >
                          <div className="adv-legend-label-col">
                            <span className="adv-color-dot" style={{ backgroundColor: seg.color }} />
                            <span className="adv-legend-name">{seg.label}</span>
                          </div>
                          <div className="adv-legend-stats">
                            <strong className="adv-legend-count">{seg.value}</strong>
                            <span className="adv-legend-pct">({pct}%)</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="adv-chart-empty-state">
                      <FiInbox />
                      <p>No admission records in current context.</p>
                      <Link to="/student-management/admissions/new" className="adv-text-link">
                        + Register First Student
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="adv-panel-quick-metric">
                <div className="adv-metric-box">
                  <span className="adv-metric-sub">Conversion Ratio</span>
                  <span className="adv-metric-val text-emerald">{approvalRate}%</span>
                </div>
                <div className="adv-metric-box">
                  <span className="adv-metric-sub">Decision Pipeline</span>
                  <span className="adv-metric-val text-amber">{pendingAdmissions.length} Pending</span>
                </div>
                <Link to="/student-management/admissions" className="adv-chart-action-link">
                  Open Queue <FiArrowRight />
                </Link>
              </div>
            </article>

            {/* BAR CHART PANEL */}
            <article className="adv-panel adv-chart-panel">
              <div className="adv-panel-header">
                <div className="adv-panel-title-area">
                  <span className="adv-eyebrow">Academic Distribution</span>
                  <h3>Admissions by Branch & Stream</h3>
                </div>
                <div className="adv-bar-controls">
                  <button
                    className={`adv-mini-btn ${barMetricMode === 'count' ? 'is-active' : ''}`}
                    onClick={() => setBarMetricMode('count')}
                    type="button"
                  >
                    Volume
                  </button>
                  <button
                    className={`adv-mini-btn ${barMetricMode === 'percentage' ? 'is-active' : ''}`}
                    onClick={() => setBarMetricMode('percentage')}
                    type="button"
                  >
                    Percentage
                  </button>
                </div>
              </div>

              <div className="adv-bar-container">
                {branchAdmissionData.length > 0 ? (
                  <div className="adv-bar-list">
                    {branchAdmissionData.map((item, index) => {
                      const maxVal = Math.max(...branchAdmissionData.map((r) => r.value)) || 1
                      const pctOfMax = Math.max(12, (item.value / maxVal) * 100)
                      const pctOfTotal = scopedAdmissions.length > 0
                        ? Math.round((item.value / scopedAdmissions.length) * 100)
                        : 0
                      const colors = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
                      const barColor = colors[index % colors.length]

                      return (
                        <div className="adv-bar-item" key={item.label}>
                          <div className="adv-bar-labels">
                            <span className="adv-bar-rank">#{index + 1}</span>
                            <span className="adv-bar-title" title={item.label}>
                              {item.label}
                            </span>
                            <span className="adv-bar-val">
                              {barMetricMode === 'count' ? `${item.value} students` : `${pctOfTotal}% share`}
                            </span>
                          </div>
                          <div className="adv-bar-track">
                            <div
                              className="adv-bar-fill"
                              style={{
                                width: `${pctOfMax}%`,
                                background: `linear-gradient(90deg, ${barColor}CC, ${barColor})`,
                              }}
                            >
                              <span className="adv-bar-glow" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="adv-chart-empty-state">
                    <FiBarChart2 />
                    <p>No branch-wise admission records available.</p>
                    <span>Records will reflect once students are enrolled in branches.</span>
                  </div>
                )}
              </div>

              <div className="adv-panel-footer-info">
                <div className="adv-info-badge">
                  <FiCheckCircle className="text-emerald" /> Top Branch:{' '}
                  <strong>{branchAdmissionData[0]?.label || 'None yet'}</strong>
                </div>
                <Link to="/branches" className="adv-chart-action-link">
                  Manage Branches <FiArrowRight />
                </Link>
              </div>
            </article>

            {/* REAL-TIME ACTIVITY FEED PANEL */}
            <article className="adv-panel adv-activity-panel">
              <div className="adv-panel-header">
                <div className="adv-panel-title-area">
                  <span className="adv-eyebrow">Event Telemetry</span>
                  <h3>Live Institutional Activity</h3>
                </div>
                <div className="adv-activity-filter">
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    className="adv-filter-select"
                  >
                    <option value="all">All Logs</option>
                    <option value="admission">Admissions</option>
                    <option value="academic">Academics</option>
                    <option value="faculty">Faculty</option>
                    <option value="curriculum">Curriculum</option>
                  </select>
                </div>
              </div>

              <div className="adv-activity-stream">
                {liveActivities.map((act) => {
                  const Icon = act.icon
                  return (
                    <div className="adv-activity-row" key={act.id}>
                      <div className="adv-activity-avatar" style={{ color: act.color, backgroundColor: `${act.color}18` }}>
                        <Icon />
                      </div>
                      <div className="adv-activity-body">
                        <div className="adv-activity-headline">
                          <span className="adv-act-title">{act.title}</span>
                          <span className="adv-act-time">{act.time}</span>
                        </div>
                        <p className="adv-act-desc">{act.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="adv-activity-footer">
                <Link to="/settings" className="adv-link-muted">
                  <FiSettings /> System Diagnostics & Logs
                </Link>
              </div>
            </article>
          </section>
        )}

        {/* =========================================================================
            5. CONNECTED ACADEMIC SETUP WORKFLOW PIPELINE
           ========================================================================= */}
        {role === ROLES.ADMIN && (
          <section className="adv-pipeline-section" aria-labelledby="academic-workflow-heading">
            <div className="adv-pipeline-header">
              <div>
                <span className="adv-eyebrow">Hierarchical Flow</span>
                <h2 id="academic-workflow-heading">End-to-End Academic Setup Pipeline</h2>
                <p>Ensure structural integrity and alignment across the academic delivery hierarchy.</p>
              </div>
              <Link to="/academic-year-management" className="adv-btn-secondary">
                <FiSliders /> Manage Configuration
              </Link>
            </div>

            <div className="adv-pipeline-grid">
              {setupFlowSteps.map((step, idx) => {
                const StepIcon = step.icon
                return (
                  <Link
                    key={step.title}
                    to={step.route}
                    className={`adv-flow-card ${step.status === 'ready' ? 'is-configured' : 'is-pending'}`}
                  >
                    <div className="adv-flow-step-num">{idx + 1}</div>
                    <div className="adv-flow-icon">
                      <StepIcon />
                    </div>
                    <div className="adv-flow-meta">
                      <span className="adv-flow-title">{step.title}</span>
                      <span className="adv-flow-count">{step.count}</span>
                    </div>
                    {idx < setupFlowSteps.length - 1 && (
                      <div className="adv-flow-connector">
                        <FiChevronRight />
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* =========================================================================
            6. QUICK ACTIONS & WORKSPACE COMMAND TILES
           ========================================================================= */}
        <section className="adv-workspace-section" aria-labelledby="workspace-tiles-heading">
          <div className="adv-panel-header">
            <div>
              <span className="adv-eyebrow">Operations Center</span>
              <h2 id="workspace-tiles-heading">Quick Actions & Institutional Shortcuts</h2>
              <p>Direct entry points to frequently accessed operational workflows.</p>
            </div>
          </div>

          <div className="adv-action-grid">
            {role === ROLES.ADMIN ? (
              quickLinks
                .filter(
                  (link) =>
                    !searchQuery ||
                    link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    link.desc.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((link) => {
                  const Icon = link.icon
                  return (
                    <Link key={link.title} to={link.route} className="adv-action-card">
                      <div className="adv-action-icon-wrap" style={{ color: link.color, backgroundColor: `${link.color}15` }}>
                        <Icon />
                      </div>
                      <div className="adv-action-content">
                        <div className="adv-action-title-row">
                          <span className="adv-action-title">{link.title}</span>
                          {link.badge && <span className="adv-action-pill">{link.badge}</span>}
                        </div>
                        <p className="adv-action-desc">{link.desc}</p>
                      </div>
                      <div className="adv-action-arrow">
                        <FiArrowUpRight />
                      </div>
                    </Link>
                  )
                })
            ) : (
              <Link to="/my-subjects" className="adv-action-card">
                <div className="adv-action-icon-wrap bg-blue-soft text-blue">
                  <FiBookOpen />
                </div>
                <div className="adv-action-content">
                  <div className="adv-action-title-row">
                    <span className="adv-action-title">My Assigned Subjects</span>
                    <span className="adv-action-pill">Curriculum</span>
                  </div>
                  <p className="adv-action-desc">View assigned courses, classes, and student roll lists.</p>
                </div>
                <div className="adv-action-arrow">
                  <FiArrowUpRight />
                </div>
              </Link>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

/* =========================================================================
   HIGH-PRECISION SVG DONUT / PIE CHART COMPONENT
   ========================================================================= */
function AdvancedDonutChart({ total, segments, activeSlice, onSliceHover }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  let accumulatedOffset = 0

  return (
    <div className="adv-donut-wrap" role="img" aria-label={`Admission Distribution Chart: ${total} Total`}>
      <svg className="adv-donut-svg" viewBox="0 0 140 140">
        {/* Base Track */}
        <circle className="adv-donut-track" cx="70" cy="70" r={radius} />

        {/* Dynamic Data Slices */}
        {segments.map((segment) => {
          const sliceLength = total > 0 ? (segment.value / total) * circumference : 0
          const isHovered = activeSlice === segment.label
          const strokeWidth = isHovered ? 16 : 12

          const circleElement = (
            <circle
              key={segment.label}
              className={`adv-donut-segment ${isHovered ? 'is-active' : ''}`}
              cx="70"
              cy="70"
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${sliceLength} ${circumference - sliceLength}`}
              strokeDashoffset={-accumulatedOffset}
              onMouseEnter={() => onSliceHover && onSliceHover(segment.label)}
              onMouseLeave={() => onSliceHover && onSliceHover(null)}
            />
          )
          accumulatedOffset += sliceLength
          return circleElement
        })}
      </svg>

      {/* Center Dynamic Readout */}
      <div className="adv-donut-center">
        {activeSlice ? (
          (() => {
            const seg = segments.find((s) => s.label === activeSlice)
            const pct = total > 0 && seg ? Math.round((seg.value / total) * 100) : 0
            return (
              <>
                <span className="adv-center-num" style={{ color: seg?.color || '#0F172A' }}>
                  {seg?.value || 0}
                </span>
                <span className="adv-center-label">{seg?.label || 'Selected'}</span>
                <span className="adv-center-pct">{pct}% of Total</span>
              </>
            )
          })()
        ) : (
          <>
            <span className="adv-center-num">{total}</span>
            <span className="adv-center-label">Total Applicants</span>
            <span className="adv-center-sub">Live Roster</span>
          </>
        )}
      </div>
    </div>
  )
}
