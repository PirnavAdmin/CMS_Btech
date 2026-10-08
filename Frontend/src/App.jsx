import { Component, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
import RolesAndDesignations from './pages/admin-management/RolesAndDesignations'
import RoomsManagement from './pages/admin-management/RoomsManagement'
import SemesterManagement from './pages/semester-management/SemesterManagement'
import SectionManagement from './pages/section-management/SectionManagement'
import MyProfile from './pages/profile/MyProfile'
import Settings from './pages/profile/Settings'
import StudentAdmission from './pages/student-management/StudentAdmission/StudentAdmission'
import StudentProfile from './pages/student-management/StudentProfile/StudentProfile'
import StudentPromotion from './pages/student-management/StudentPromotion/StudentPromotion'
import Fees from './pages/fees/FeeManagement'
import Attendance from './pages/attendance/Attendance'
import AttendanceSessionDetails from './pages/attendance/AttendanceSessionDetails'
import FacultyManagement from './pages/faculty/FacultyManagement'
import FacultyLeaveManagement from './pages/faculty/FacultyLeaveManagement'
import Payroll from './pages/faculty/Payroll'
import SubjectManagement, { SubjectDetailsPage } from './pages/subject-management/SubjectManagement'
import CreditsManagement from './pages/credits-management/CreditsManagement'
import TimetableManagement from './pages/timetable/TimetableManagement'
import ElectiveManagement from './pages/elective-management/ElectiveManagement'
import { AcademicProvider } from './context/AcademicContext'
import './styles/erp-theme.css'
import ExaminationSetup from './pages/examinations/examination-setup/ExaminationSetup'
import ExaminationList from './pages/examinations/examination-setup/ExaminationList'
import CreateExamination from './pages/examinations/examination-setup/CreateExamination'
import ExamType from './pages/examinations/examination-setup/ExamType'
import ExamSchedule from './pages/examinations/examination-setup/ExamSchedule'
import ExamRules from './pages/examinations/examination-setup/ExamRules'
import ExamTimetable from './pages/examinations/exam-timetable/ExamTimetable'
import CreateExamTimetable from './pages/examinations/exam-timetable/CreateExamTimetable'
import ExamScheduleList from './pages/examinations/exam-timetable/ExamScheduleList'
import DepartmentExamSchedule from './pages/examinations/exam-timetable/DepartmentExamSchedule'
import StudentExamSchedule from './pages/examinations/exam-timetable/StudentExamSchedule'
import HallAllocation from './pages/examinations/exam-timetable/HallAllocation'
import ExamConfiguration from './pages/examinations/exam-timetable/ExamConfiguration'
import MarksManagement from './pages/examinations/marks-management/MarksManagement'
import MarksEntry from './pages/examinations/marks-management/MarksEntry'
import BulkMarksUpload from './pages/examinations/marks-management/BulkMarksUpload'
import EditMarks from './pages/examinations/marks-management/EditMarks'
import StudentMarks from './pages/examinations/marks-management/StudentMarks'
import SubjectMarksReport from './pages/examinations/marks-management/SubjectMarksReport'
import MarksApproval from './pages/examinations/marks-management/MarksApproval'
import GradeResultManagement from './pages/examinations/grade-result-management/GradeResultManagement'
import GradeConfiguration from './pages/examinations/grade-result-management/GradeConfiguration'
import ResultGeneration from './pages/examinations/grade-result-management/ResultGeneration'
import StudentResult from './pages/examinations/grade-result-management/StudentResult'
import './App.css'
import './styles/details-layout.css'
import './styles/view-cards.css'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
    this.setState({ error, info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '700px', width: '100%', textAlign: 'center', background: '#fff', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)' }}>
            <h1 style={{ margin: '0 0 12px', color: '#0f172a' }}>Something went wrong</h1>
            <p style={{ margin: '0 0 12px', color: '#475569' }}>The app hit an unexpected error. Please reload the page or return home.</p>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13px' }}>Please retry. If the problem continues, contact your administrator. Technical details were saved for support.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ border: 'none', background: '#1769C2', color: '#fff', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 700, marginRight: '8px' }}>
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
      const target = event.target.closest('td, th, .cm-info-val, .sa-kv-val, .sa-kv-value, .erp-view-value, .kv-val, .sp-panel-val, .meta-val, .cm-info-row, .sa-kv-cell, .preview-kv-item, .table-cell-truncate, .rbac-profile-subtitle, .detail-item strong')
      if (!target) return
      if (target.hasAttribute('data-no-overflow-tooltip')) {
        target.title = ''
        return
      }
      if (target.querySelector(actionSelector)) return

      const isTruncated = target.scrollWidth > target.clientWidth || (target.children.length > 0 && Array.from(target.children).some((child) => child.scrollWidth > child.clientWidth))
      if (isTruncated && !target.title) {
        target.title = target.innerText.replace(/\s+/g, ' ').trim()
      }
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
        const isIdentifier = /identifier|username|login|mobile.*id|id.*mobile|email.*mobile/i.test(`${control.name} ${control.id} ${label}`)
        const isEmail = !isIdentifier && (control.type === 'email' || (/\bemail\b/i.test(`${control.name} ${control.id} ${label}`) && !/mobile|id|identifier|username/i.test(`${control.name} ${control.id} ${label}`)))
        const mobilePattern = /^[6-9]\d{9}$/
        const idPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,}$/
        const message = required && !value
          ? 'This field is required.'
          : value && isEmail && !emailPattern.test(value)
            ? 'Enter a valid email address.'
            : value && isIdentifier && !(emailPattern.test(value) || mobilePattern.test(value) || idPattern.test(value))
              ? 'Enter a valid email, mobile number or ID.'
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
              <AcademicProvider>
                <ProtectedRoute
                  allowedRoles={[
                    ROLES.ADMIN,
                    ROLES.FACULTY,
                    ROLES.STUDENT,
                  ]}
                />
              </AcademicProvider>
            }
          >
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

              <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STUDENT]} />}>
                <Route path="/exam/student-schedule" element={<StudentExamSchedule />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
              <Route path="/exam/create" element={<CreateExamTimetable />} />
              <Route path="/exam/department-schedule" element={<DepartmentExamSchedule />} />
              <Route path="/exam/schedules" element={<ExamScheduleList />} />
              <Route path="/exam/timetable" element={<ExamTimetable />} />
              <Route path="/exam/hall-allocation" element={<HallAllocation />} />
              <Route path="/exam/configuration" element={<ExamConfiguration />} />
              <Route path="/examination-setup/*" element={<ExaminationSetup />} />
              <Route path="/examination-setup/examination-list" element={<ExaminationList />} />
              <Route path="/examination-setup/create-examination" element={<CreateExamination />} />
              <Route path="/examination-setup/exam-type" element={<ExamType />} />
              <Route path="/examination-setup/exam-schedule" element={<ExamSchedule />} />
              <Route path="/examination-setup/exam-rules" element={<ExamRules />} />
              <Route path="/exam-timetable/*" element={<ExamTimetable />} />
              <Route path="/exam-timetable/create-exam-timetable" element={<CreateExamTimetable />} />
              <Route path="/exam-timetable/exam-schedule-list" element={<ExamScheduleList />} />
              <Route path="/exam-timetable/department-exam-schedule" element={<DepartmentExamSchedule />} />
              <Route path="/exam-timetable/student-exam-schedule" element={<StudentExamSchedule />} />
              <Route path="/exam-timetable/hall-allocation" element={<HallAllocation />} />
              <Route path="/marks-management/*" element={<MarksManagement />} />
              <Route path="/marks-management/marks-entry" element={<MarksEntry />} />
              <Route path="/marks-management/bulk-marks-upload" element={<BulkMarksUpload />} />
              <Route path="/marks-management/edit-marks" element={<EditMarks />} />
              <Route path="/marks-management/student-marks" element={<StudentMarks />} />
              <Route path="/marks-management/subject-marks-report" element={<SubjectMarksReport />} />
              <Route path="/marks-management/marks-approval" element={<MarksApproval />} />
              <Route path="/grade-result-management/*" element={<GradeResultManagement />} />
              <Route path="/grade-result-management/grade-configuration" element={<GradeConfiguration />} />
              <Route path="/grade-result-management/result-generation" element={<ResultGeneration />} />
              <Route path="/grade-result-management/student-result" element={<StudentResult />} />
              </Route>

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
              <Route path="/rooms-management" element={<RoomsManagement />} />
              <Route path="/rooms-management/add" element={<RoomsManagement key="room-add" formMode />} />
              <Route path="/rooms-management/:roomId/edit" element={<RoomsManagement key="room-edit" formMode />} />
              <Route path="/rooms-management/:roomId" element={<RoomsManagement key="room-view" viewMode />} />
              <Route path="/rooms" element={<RoomsManagement />} />
              <Route path="/rooms/:roomId" element={<RoomsManagement key="room-view-alias" viewMode />} />
              <Route path="/roles-designations" element={<RolesAndDesignations />} />
              <Route path="/subject-management" element={<SubjectManagement />} />
              <Route path="/subject-management/:id" element={<SubjectDetailsPage />} />
              <Route path="/credits-management" element={<CreditsManagement />} />
              <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FACULTY]} />}><Route path="/timetable" element={<TimetableManagement />} /></Route>
              <Route path="/elective-management" element={<ElectiveManagement />} />
              <Route path="/student-management/admissions" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/new" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/add" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/:id/edit" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/:id/approval" element={<StudentAdmission />} />
              <Route path="/student-management/admissions/:id" element={<StudentAdmission />} />
              <Route path="/student-management/profiles" element={<StudentProfile />} />
              <Route path="/student-management/profiles/:id" element={<StudentProfile />} />
              <Route path="/student-management/attendance/sessions/:sessionId" element={<AttendanceSessionDetails />} />
              <Route path="/student-management/attendance/*" element={<Attendance />} />
              <Route path="/student-management/promotions" element={<StudentPromotion />} />
              <Route path="/fees/*" element={<Fees />} />
              <Route path="/roles-designations" element={<RolesAndDesignations />} />
              <Route path="/roles-permissions" element={<RolesAndDesignations />} />
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
