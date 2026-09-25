import { Component, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roles'

import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import ActivateAccount from './pages/ActivateAccount'
import Register from './pages/Register'
import MySubjects from './pages/MySubjects'
import Unauthorized from './pages/Unauthorized'
import Course, { CourseStructure } from './pages/courseManagement/Course'
import Branch from './pages/courseManagement/Branch'
import CollegeInstitutionManagement from './pages/admin-management/CollegeInstitutionManagement'
import AddCollege from './pages/admin-management/AddCollege'
import AcademicYearManagement from './pages/admin-management/AcademicYearManagement'
import DepartmentManagement from './pages/admin-management/DepartmentManagement'
import SemesterManagement from './pages/semester-management/SemesterManagement'
import SectionManagement from './pages/section-management/SectionManagement'
import MyProfile from './pages/profile/MyProfile'
import Settings from './pages/profile/Settings'
import StudentAdmission from './pages/student-management/StudentAdmission/StudentAdmission'
import StudentProfile from './pages/student-management/StudentProfile/StudentProfile'
import StudentPromotion from './pages/student-management/StudentPromotion/StudentPromotion'
import Fees from './pages/fees/FeeStructure'
import Attendance from './pages/attendance/Attendance'
import Marks from './pages/marks/Marks'
import Results from './pages/results/Results'
import FacultyManagement from './pages/faculty/FacultyManagement'
import FacultyLeaveManagement from './pages/faculty/FacultyLeaveManagement'
import Payroll from './pages/faculty/Payroll'
import SubjectManagement from './pages/subject-management/SubjectManagement'
import CreditsManagement from './pages/credits-management/CreditsManagement'
import TimetableManagement from './pages/timetable/TimetableManagement'
import ElectiveManagement from './pages/elective-management/ElectiveManagement'
import { AcademicProvider } from './context/AcademicContext'
import './styles/erp-theme.css'
import './App.css'
import './styles/details-layout.css'
import './styles/view-cards.css'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '500px', textAlign: 'center', background: '#fff', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)' }}>
            <h1 style={{ margin: '0 0 12px', color: '#0f172a' }}>Something went wrong</h1>
            <p style={{ margin: '0 0 12px', color: '#475569' }}>The app hit an unexpected error. Please reload the page or return home.</p>
            {this.state.error && (
              <pre style={{ margin: '0 0 20px', padding: '10px', background: '#F5F3FD', color: '#dc2626', borderRadius: '8px', fontSize: '13px', textAlign: 'left', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <button type="button" onClick={() => this.setState({ hasError: false, error: null })} style={{ border: 'none', background: '#8782BC', color: '#fff', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 700, marginRight: '8px' }}>
              Try again
            </button>
            <button type="button" onClick={() => window.location.href = '/'} style={{ border: 'none', background: '#475569', color: '#fff', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }}>
              Go to home
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

function TableOverflowTitles() {
  useEffect(() => {
    const actionSelector = '.erp-row-actions,.row-actions,.cm-actions,.cm-row-actions,.semester-row-actions,.section-actions,.course-actions,.branch-actions,.sa-icon-actions,.sa-row-actions'
    const showFullValue = (event) => {
      const cell = event.target.closest('td, th')
      if (!cell || cell.querySelector(actionSelector)) return

      const children = Array.from(cell.children)
      const isTruncated = cell.scrollWidth > cell.clientWidth || children.some((child) => child.scrollWidth > child.clientWidth)
      if (isTruncated && !cell.title) cell.title = cell.innerText.replace(/\s+/g, ' ').trim()
    }
    document.addEventListener('mouseover', showFullValue)
    return () => document.removeEventListener('mouseover', showFullValue)
  }, [])

  return null
}

/* Enforce consistent client-side checks even on older forms that use noValidate.
   Server validation remains authoritative; this prevents avoidable bad submits. */
function FormValidationGuard() {
  useEffect(() => {
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/
    const validate = (event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement) || form.noValidate === false && !form.querySelector('[required]')) return
      const controls = Array.from(form.querySelectorAll('input, select, textarea')).filter((control) => !control.disabled && control.type !== 'hidden' && control.type !== 'button' && control.type !== 'submit')
      let firstInvalid = null
      for (const control of controls) {
        control.setCustomValidity('')
        const value = String(control.value || '').trim()
        const label = control.closest('label')?.innerText || control.labels?.[0]?.innerText || ''
        const required = control.required || /\*/.test(label)
        const isEmail = control.type === 'email' || /email/i.test(`${control.name} ${control.id} ${label}`)
        const message = required && !value
          ? 'This field is required.'
          : value && isEmail && !emailPattern.test(value)
            ? 'Enter a valid email address.'
            : ''
        if (message) {
          control.setCustomValidity(message)
          firstInvalid ||= control
        }
      }
      const requiredSelect = Array.from(form.querySelectorAll('.searchable-select[data-required="true"][data-empty="true"]')).find((node) => !node.classList.contains('is-disabled'))
      if (requiredSelect) firstInvalid ||= requiredSelect.querySelector('button')
      if (!firstInvalid) return
      event.preventDefault()
      event.stopPropagation()
      if (firstInvalid instanceof HTMLInputElement || firstInvalid instanceof HTMLSelectElement || firstInvalid instanceof HTMLTextAreaElement) firstInvalid.reportValidity()
      else {
        firstInvalid.setAttribute('aria-invalid', 'true')
        firstInvalid.focus()
      }
    }
    document.addEventListener('submit', validate, true)
    return () => document.removeEventListener('submit', validate, true)
  }, [])
  return null
}

export default function App() {
  return (
    <AppErrorBoundary>
      <TableOverflowTitles />
      <FormValidationGuard />
      <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/activate-account" element={<ActivateAccount />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard - All Roles */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.ADMIN,
                  ROLES.FACULTY,
                  ROLES.STUDENT,
                ]}
              />
            }
          >
            <Route element={<AcademicProvider><Outlet /></AcademicProvider>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/academic-context" element={<Settings />} />

              {/* Faculty demo module */}
              <Route path="/faculty/*" element={<FacultyManagement />} />
              <Route path="/faculty/leave-management" element={<FacultyLeaveManagement />} />
              <Route path="/faculty/payroll" element={<Payroll />} />

              {/* Faculty / Operations backed modules */}
              {/* Retain the former URL as a safe bookmark redirect. */}
              <Route path="/attendance/*" element={<Navigate to="/student-management/attendance" replace />} />
              <Route path="/marks/*" element={<Marks />} />
              <Route path="/results/*" element={<Results />} />

              {/* Administration - Admin Only */}
              <Route path="/college-institution-management" element={<CollegeInstitutionManagement />} />
              <Route path="/college-institution-management/add" element={<AddCollege />} />
              <Route path="/academic-year-management" element={<AcademicYearManagement />} />
              <Route path="/academic-year-management/:id" element={<AcademicYearManagement />} />
              <Route path="/department-management" element={<DepartmentManagement />} />
              <Route path="/department-management/:id" element={<DepartmentManagement />} />
              <Route path="/courses" element={<Course />} />
              <Route path="/courses/add" element={<Course mode="form" />} />
              <Route path="/courses/:id/edit" element={<Course mode="form" />} />
              <Route path="/courses/:id" element={<Course mode="details" />} />
              <Route path="/courses/structure" element={<CourseStructure />} />
              <Route path="/branches" element={<Branch />} />
              <Route path="/branches/add" element={<Branch mode="form" />} />
              <Route path="/branches/:id/edit" element={<Branch mode="form" />} />
              <Route path="/branches/:id" element={<Branch mode="details" />} />
              <Route path="/semester-management" element={<SemesterManagement />} />
              <Route path="/semester-management/add" element={<SemesterManagement mode="form" />} />
              <Route path="/semester-management/:id/edit" element={<SemesterManagement mode="edit" />} />
              <Route path="/semester-management/:id" element={<SemesterManagement mode="details" />} />
              <Route path="/section-management" element={<SectionManagement />} />
              <Route path="/section-management/add" element={<SectionManagement mode="form" />} />
              <Route path="/section-management/:id/edit" element={<SectionManagement mode="edit" />} />
              <Route path="/section-management/:id" element={<SectionManagement mode="details" />} />
              <Route path="/subject-management" element={<SubjectManagement />} />
              <Route path="/credits-management" element={<CreditsManagement />} />
              <Route path="/timetable" element={<TimetableManagement />} />
              <Route path="/elective-management" element={<ElectiveManagement />} />
              <Route path="/student-management/admissions" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/new" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/add" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/:id/edit" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/:id/approval" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/:id" element={<StudentAdmission />} />
              <Route path="/student-management/profiles" element={<StudentProfile />} />
              <Route path="/student-management/profiles/:id" element={<StudentProfile />} />
              <Route path="/student-management/attendance/*" element={<Attendance />} />
              <Route path="/student-management/promotions" element={<StudentPromotion />} />
              <Route path="/fees/*" element={<Fees />} />
            </Route>
          </Route>

          {/* Faculty & Student */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.FACULTY,
                  ROLES.STUDENT,
                ]}
              />
            }
          >
            <Route path="/my-subjects" element={<MySubjects />} />
          </Route>

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Unknown route */}
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppErrorBoundary>
  )
}
