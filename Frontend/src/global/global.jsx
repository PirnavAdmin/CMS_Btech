// Application routes and bootstrap. Sidebar modules live in pages/.
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external5 from "react-dom/client";
import { ProtectedRouteModule, AcademicContextModule, ToastProviderModule } from "../components/components.jsx";
import { CampusWorkspaceModule } from "../pages/campus/campus.jsx";
import { rolesModule } from "../API/apiendpoints.jsx";
import { DashboardModule, LandingPageModule, LoginModule, ActivateAccountModule, RegisterModule, MySubjectsModule, UnauthorizedModule } from "../pages/portal/portal.jsx";
import { CourseModule, BranchModule } from "../pages/courseManagement/courseManagement.jsx";
import { CollegeInstitutionManagementModule, AddCollegeModule, AcademicYearManagementModule, DepartmentManagementModule, RolesAndDesignationsModule, RoomsManagementModule } from "../pages/admin-management/admin-management.jsx";
import { SemesterManagementModule } from "../pages/semester-management/semester-management.jsx";
import { SectionManagementModule } from "../pages/section-management/section-management.jsx";
import { MyProfileModule, SettingsModule } from "../pages/profile/profile.jsx";
import { StudentAdmissionModule } from "../pages/student-management/StudentAdmission/StudentAdmission.jsx";
import { StudentProfileModule } from "../pages/student-management/StudentProfile/StudentProfile.jsx";
import { StudentPromotionModule } from "../pages/student-management/StudentPromotion/StudentPromotion.jsx";
import { FeeManagementModule } from "../pages/fees/fees.jsx";
import { AttendanceModule, AttendanceSessionDetailsModule } from "../pages/attendance/attendance.jsx";
import { FacultyManagementModule, FacultyLeaveManagementModule, PayrollModule } from "../pages/faculty/faculty.jsx";
import { SubjectManagementModule } from "../pages/subject-management/subject-management.jsx";
import { CreditsManagementModule } from "../pages/credits-management/credits-management.jsx";
import { TimetableManagementModule } from "../pages/timetable/timetable.jsx";
import { ElectiveManagementModule } from "../pages/elective-management/elective-management.jsx";
import { ExaminationSetupModule, ExaminationListModule, CreateExaminationModule, ExamTypeModule, ExamScheduleModule, ExamRulesModule } from "../pages/examinations/examination-setup/examination-setup.jsx";
import { ExamTimetableModule, CreateExamTimetableModule, ExamScheduleListModule, DepartmentExamScheduleModule, StudentExamScheduleModule, HallAllocationModule, ExamConfigurationModule } from "../pages/examinations/exam-timetable/exam-timetable.jsx";
import { MarksManagementModule, MarksEntryModule, BulkMarksUploadModule, EditMarksModule, StudentMarksModule, SubjectMarksReportModule, MarksApprovalModule } from "../pages/examinations/marks-management/marks-management.jsx";
import { GradeResultManagementModule, GradeConfigurationModule, CGPACalculatorPageModule, ResultGenerationModule, SemesterResultModule, DepartmentResultModule, ConsolidatedMarksMemoModule, BacklogReportModule, StudentResultModule } from "../pages/examinations/grade-result-management/grade-result-management.jsx";
import './global.css';

const AppModule = (() => {
const { Component } = external0;
const { useEffect } = external0;
const { Navigate } = external1;
const { Route } = external1;
const { Routes } = external1;
const { default: ProtectedRoute } = ProtectedRouteModule;
const { default: CampusWorkspace } = CampusWorkspaceModule;
const { ROLES } = rolesModule;
const { default: Dashboard } = DashboardModule;
const { default: LandingPage } = LandingPageModule;
const { default: Login } = LoginModule;
const { default: ActivateAccount } = ActivateAccountModule;
const { default: Register } = RegisterModule;
const { default: MySubjects } = MySubjectsModule;
const { default: Unauthorized } = UnauthorizedModule;
const { default: Course } = CourseModule;
const { CourseStructure } = CourseModule;
const { default: Branch } = BranchModule;
const { default: CollegeInstitutionManagement } = CollegeInstitutionManagementModule;
const { default: AddCollege } = AddCollegeModule;
const { default: AcademicYearManagement } = AcademicYearManagementModule;
const { default: DepartmentManagement } = DepartmentManagementModule;
const { default: RolesAndDesignations } = RolesAndDesignationsModule;
const { default: RoomsManagement } = RoomsManagementModule;
const { default: SemesterManagement } = SemesterManagementModule;
const { default: SectionManagement } = SectionManagementModule;
const { default: MyProfile } = MyProfileModule;
const { default: Settings } = SettingsModule;
const { default: StudentAdmission } = StudentAdmissionModule;
const { default: StudentProfile } = StudentProfileModule;
const { default: StudentPromotion } = StudentPromotionModule;
const { default: Fees } = FeeManagementModule;
const { default: Attendance } = AttendanceModule;
const { default: AttendanceSessionDetails } = AttendanceSessionDetailsModule;
const { default: FacultyManagement } = FacultyManagementModule;
const { default: FacultyLeaveManagement } = FacultyLeaveManagementModule;
const { default: Payroll } = PayrollModule;
const { default: SubjectManagement } = SubjectManagementModule;
const { SubjectDetailsPage } = SubjectManagementModule;
const { default: CreditsManagement } = CreditsManagementModule;
const { default: TimetableManagement } = TimetableManagementModule;
const { default: ElectiveManagement } = ElectiveManagementModule;
const { AcademicProvider } = AcademicContextModule;
const { default: ExaminationSetup } = ExaminationSetupModule;
const { default: ExaminationList } = ExaminationListModule;
const { default: CreateExamination } = CreateExaminationModule;
const { default: ExamType } = ExamTypeModule;
const { default: ExamSchedule } = ExamScheduleModule;
const { default: ExamRules } = ExamRulesModule;
const { default: ExamTimetable } = ExamTimetableModule;
const { default: CreateExamTimetable } = CreateExamTimetableModule;
const { default: ExamScheduleList } = ExamScheduleListModule;
const { default: DepartmentExamSchedule } = DepartmentExamScheduleModule;
const { default: StudentExamSchedule } = StudentExamScheduleModule;
const { default: HallAllocation } = HallAllocationModule;
const { default: ExamConfiguration } = ExamConfigurationModule;
const { default: MarksManagement } = MarksManagementModule;
const { default: MarksEntry } = MarksEntryModule;
const { default: BulkMarksUpload } = BulkMarksUploadModule;
const { default: EditMarks } = EditMarksModule;
const { default: StudentMarks } = StudentMarksModule;
const { default: SubjectMarksReport } = SubjectMarksReportModule;
const { default: MarksApproval } = MarksApprovalModule;
const { default: GradeResultManagement } = GradeResultManagementModule;
const { default: GradeConfiguration } = GradeConfigurationModule;
const { default: CGPACalculatorPage } = CGPACalculatorPageModule;
const { default: ResultGeneration } = ResultGenerationModule;
const { default: SemesterResult } = SemesterResultModule;
const { default: DepartmentResult } = DepartmentResultModule;
const { default: ConsolidatedMarksMemo } = ConsolidatedMarksMemoModule;
const { default: BacklogReport } = BacklogReportModule;
const { default: StudentResult } = StudentResultModule;
/* Imports for isolated regression tests:
import { Component, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import CampusWorkspace from './pages/campus/CampusWorkspace'
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
import CGPACalculatorPage from './pages/examinations/grade-result-management/CGPACalculatorPage'
import ResultGeneration from './pages/examinations/grade-result-management/ResultGeneration'
import SemesterResult from './pages/examinations/grade-result-management/SemesterResult'
import DepartmentResult from './pages/examinations/grade-result-management/DepartmentResult'
import ConsolidatedMarksMemo from './pages/examinations/grade-result-management/ConsolidatedMarksMemo'
import BacklogReport from './pages/examinations/grade-result-management/BacklogReport'
import StudentResult from './pages/examinations/grade-result-management/StudentResult'
import './App.css'
import './styles/details-layout.css'
import './styles/view-cards.css'
*/
// #region App.jsx
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

/* export default */ function App() {
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
              <Route path="/library" element={<CampusWorkspace module="library" />} />
              <Route path="/meetings-events" element={<CampusWorkspace module="meetings-events" />} />
              <Route path="/placement" element={<CampusWorkspace module="placement" />} />
              <Route path="/results" element={<ResultGeneration />} />
              <Route path="/results/semester-result" element={<SemesterResult />} />
              <Route path="/results/department-result" element={<DepartmentResult />} />
              <Route path="/results/consolidated-marks-memo" element={<ConsolidatedMarksMemo />} />
              <Route path="/results/backlog-report" element={<BacklogReport />} />
              <Route path="/results/student-result" element={<StudentResult />} />
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
              <Route path="/marks-management" element={<Navigate to="/marks-management/marks-entry" replace />} />
              <Route path="/marks-management/*" element={<MarksManagement />} />
              <Route path="/marks-management/marks-entry" element={<MarksEntry />} />
              <Route path="/marks-management/bulk-marks-upload" element={<BulkMarksUpload />} />
              <Route path="/marks-management/edit-marks" element={<EditMarks />} />
              <Route path="/marks-management/student-marks" element={<StudentMarks />} />
              <Route path="/marks-management/subject-marks-report" element={<SubjectMarksReport />} />
              <Route path="/marks-management/marks-approval" element={<MarksApproval />} />
              <Route path="/grade-result-management" element={<GradeResultManagement />} />
              <Route path="/grade-result-management/grade-configuration" element={<GradeConfiguration />} />
              <Route path="/grade-result-management/cgpa-calculator" element={<CGPACalculatorPage />} />
              <Route path="/grade-result-management/result-generation" element={<Navigate to="/results" replace />} />
              <Route path="/grade-result-management/semester-result" element={<Navigate to="/results/semester-result" replace />} />
              <Route path="/grade-result-management/department-result" element={<Navigate to="/results/department-result" replace />} />
              <Route path="/grade-result-management/consolidated-marks-memo" element={<Navigate to="/results/consolidated-marks-memo" replace />} />
              <Route path="/grade-result-management/backlog-report" element={<Navigate to="/results/backlog-report" replace />} />
              <Route path="/grade-result-management/student-result" element={<Navigate to="/results/student-result" replace />} />
              <Route path="/grade-result-management/*" element={<GradeResultManagement />} />
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
              <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}><Route path="/fees/*" element={<Fees />} /></Route>
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
// #endregion App.jsx
return {
  get default() { return App; }
};
})();

export function mountApp(rootElement) {
const { StrictMode } = external0;
const { createRoot } = external5;
const { BrowserRouter } = external1;
const { default: App } = AppModule;
const { default: ToastProvider } = ToastProviderModule;
createRoot(rootElement).render(
  <StrictMode>
    <ToastProvider><BrowserRouter><App /></BrowserRouter></ToastProvider>
  </StrictMode>,
)



}

const appRoot = document.getElementById('root');
if (appRoot?.hasAttribute('data-cms-app')) mountApp(appRoot);
