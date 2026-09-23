import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiArrowRight,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiGitBranch,
  FiGrid,
  FiHome,
  FiLayers,
  FiPlus,
  FiSettings,
  FiSliders,
  FiTrendingUp,
  FiUser,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
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

  useEffect(() => {
    let active = true
    if (role !== ROLES.ADMIN) {
      setLoadingStats(false)
      return
    }

    Promise.allSettled([
      studentAdmissionApi.getAll(),
      facultyApi.getAll(),
      subjectService.getSubjects(),
    ]).then(([admRes, facRes, subRes]) => {
      if (!active) return
      if (admRes.status === 'fulfilled' && Array.isArray(admRes.value)) {
        setAdmissions(admRes.value)
      }
      if (facRes.status === 'fulfilled' && Array.isArray(facRes.value)) {
        setFaculty(facRes.value)
      }
      if (subRes.status === 'fulfilled' && Array.isArray(subRes.value)) {
        setSubjects(subRes.value)
      }
      setLoadingStats(false)
    }).catch(() => {
      if (active) setLoadingStats(false)
    })

    return () => { active = false }
  }, [role, selectedCollegeId, selectedAcademicYearId])

  // Context-filtered metrics
  const scopedAdmissions = admissions.filter((item) => {
    let colMatch = true
    if (selectedCollegeId) {
      const colId = item.admission?.collegeId ?? item.collegeId ?? item.academic?.collegeId
      colMatch = !colId || String(colId) === String(selectedCollegeId)
    }
    let yrMatch = true
    if (selectedAcademicYearId) {
      const yrId = item.academic?.academicYearId ?? item.academicYearId
      const yrName = item.academic?.academicYear ?? item.academicYear
      yrMatch = (!yrId && !yrName) ||
        (yrId && String(yrId) === String(selectedAcademicYearId)) ||
        (selectedAcademicYear?.name && yrName && yrName.trim().toLowerCase() === selectedAcademicYear.name.trim().toLowerCase())
    }
    return colMatch && yrMatch
  })

  const approvedAdmissions = scopedAdmissions.filter((item) => {
    const s = String(item.status || item.currentStatus || '').toUpperCase()
    return s === 'APPROVED' || s === 'ADMITTED'
  })
  const pendingAdmissions = scopedAdmissions.filter((item) => {
    const s = String(item.status || item.currentStatus || '').toUpperCase()
    return ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED'].includes(s)
  })

  const scopedBranches = branches.filter((b) => !selectedCollegeId || !b.collegeId || String(b.collegeId) === String(selectedCollegeId))
  const scopedCourses = courses.filter((c) => !selectedCollegeId || !c.collegeId || String(c.collegeId) === String(selectedCollegeId))
  const scopedSections = sections.filter((s) => !selectedAcademicYearId || !s.academicYearId || String(s.academicYearId) === String(selectedAcademicYearId))

  const collegeName = selectedCollege?.name || selectedCollege?.collegeName || 'Pirnav Engineering College'
  const yearName = selectedAcademicYear?.academicYearName || selectedAcademicYear?.name || 'Active Academic Session'
  const roleName = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Administrator'

  return (
    <DashboardLayout>
      <div className="erp-page dashboard-home">
        {/* Working Context Hero */}
        <header className="erp-page-heading dashboard-hero">
          <div>
            <p className="erp-eyebrow">Enterprise Command Center</p>
            <h1>Welcome back, {roleName}</h1>
            <p>Unified institutional operations, student lifecycle management, and academic delivery.</p>
          </div>
          <div className="dashboard-hero-mark">
            <FiHome aria-hidden="true" />
            <div>
              <strong>{collegeName}</strong>
              <small>{yearName}</small>
            </div>
          </div>
        </header>

        {/* Real-time KPI Cards */}
        {role === ROLES.ADMIN && (
          <section className="dashboard-kpis" aria-label="Academic overview">
            <article>
              <span className="dashboard-kpi-icon"><FiUsers /></span>
              <div>
                <small>Total Admissions</small>
                <strong>{scopedAdmissions.length}</strong>
                <em>{approvedAdmissions.length} approved · {pendingAdmissions.length} pending</em>
              </div>
            </article>
            <article>
              <span className="dashboard-kpi-icon"><FiBriefcase /></span>
              <div>
                <small>Faculty Directory</small>
                <strong>{faculty.length}</strong>
                <em>Active teaching faculty</em>
              </div>
            </article>
            <article>
              <span className="dashboard-kpi-icon"><FiBookOpen /></span>
              <div>
                <small>Curriculum Subjects</small>
                <strong>{subjects.length}</strong>
                <em>Configured syllabus courses</em>
              </div>
            </article>
            <article>
              <span className="dashboard-kpi-icon"><FiGitBranch /></span>
              <div>
                <small>Academic Units</small>
                <strong>{scopedBranches.length} Branches</strong>
                <em>{scopedCourses.length} Courses · {departments.length} Depts</em>
              </div>
            </article>
          </section>
        )}

        {/* Quick Operational Actions & Academic Flow */}
        <section className="dashboard-workspace" aria-labelledby="quick-access-title">
          <div className="erp-panel dashboard-actions">
            <div className="erp-panel-heading">
              <div>
                <p className="erp-eyebrow">Workspace</p>
                <h2 id="quick-access-title">Quick Actions & Shortcuts</h2>
              </div>
              <span className="dashboard-panel-note">Direct entry points</span>
            </div>

            <div className="erp-link-grid">
              {role === ROLES.ADMIN ? (
                <>
                  <Link className="erp-link-card" to="/student-management/admissions/new">
                    <span className="erp-link-card__icon"><FiUserPlus aria-hidden="true" /></span>
                    <span><strong>New Student Admission</strong><small>Register applicant</small></span>
                    <FiArrowRight aria-hidden="true" />
                  </Link>

                  <Link className="erp-link-card" to="/student-management/admissions">
                    <span className="erp-link-card__icon"><FiUserCheck aria-hidden="true" /></span>
                    <span><strong>Review Admissions</strong><small>{pendingAdmissions.length} awaiting decision</small></span>
                    <FiArrowRight aria-hidden="true" />
                  </Link>

                  <Link className="erp-link-card" to="/subject-management">
                    <span className="erp-link-card__icon"><FiBookOpen aria-hidden="true" /></span>
                    <span><strong>Subject Management</strong><small>Course catalog & credits</small></span>
                    <FiArrowRight aria-hidden="true" />
                  </Link>

                  <Link className="erp-link-card" to="/section-management">
                    <span className="erp-link-card__icon"><FiUsers aria-hidden="true" /></span>
                    <span><strong>Section Management</strong><small>{scopedSections.length} sections active</small></span>
                    <FiArrowRight aria-hidden="true" />
                  </Link>

                  <Link className="erp-link-card" to="/faculty">
                    <span className="erp-link-card__icon"><FiBriefcase aria-hidden="true" /></span>
                    <span><strong>Faculty Directory</strong><small>Faculty & allocations</small></span>
                    <FiArrowRight aria-hidden="true" />
                  </Link>

                  <Link className="erp-link-card" to="/settings">
                    <span className="erp-link-card__icon"><FiSliders aria-hidden="true" /></span>
                    <span><strong>Academic Context</strong><small>Switch college / year</small></span>
                    <FiArrowRight aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <Link className="erp-link-card" to="/my-subjects">
                  <span className="erp-link-card__icon"><FiBookOpen aria-hidden="true" /></span>
                  <span><strong>My Subjects</strong><small>View assigned curriculum</small></span>
                  <FiArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          {/* Academic Delivery Structure side card */}
          <aside className="dashboard-side-panel">
            <p className="erp-eyebrow">Academic Architecture</p>
            <h2>Connected Setup Flow</h2>
            <p>Maintain structural alignment across the academic delivery pipeline.</p>
            <div className="dashboard-flow">
              {['Academic Year', 'Department', 'Course', 'Branch', 'Semester', 'Section', 'Subject'].map((step, index, steps) => (
                <div className="dashboard-flow-step" key={step}>
                  <span>{step}</span>
                  {index < steps.length - 1 && <FiArrowRight aria-hidden="true" />}
                </div>
              ))}
            </div>
            <Link className="dashboard-outline-link" to={role === ROLES.ADMIN ? '/academic-year-management' : '/my-subjects'}>
              {role === ROLES.ADMIN ? 'Manage Academic Setup' : 'View Curriculum'} <FiArrowRight />
            </Link>
          </aside>
        </section>
      </div>
    </DashboardLayout>
  )
}
