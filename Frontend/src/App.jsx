import { Component } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roles'

import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
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
import Faculty from './pages/faculty/Faculty'
import './styles/erp-theme.css'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '420px', textAlign: 'center', background: '#fff', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)' }}>
            <h1 style={{ margin: '0 0 12px', color: '#0f172a' }}>Something went wrong</h1>
            <p style={{ margin: '0 0 20px', color: '#475569' }}>The app hit an unexpected error. Please reload the page or return home.</p>
            <button type="button" onClick={() => window.location.href = '/'} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }}>
              Go to home
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FACULTY]} />}>
          <Route path="/faculty/*" element={<Faculty/>}/>
          <Route path="/attendance/*" element={<Attendance/>}/>
          <Route path="/marks/*" element={<Marks/>}/>
          <Route path="/results/*" element={<Results/>}/>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/fees/*" element={<Fees/>}/>
        </Route>

        {/* Administration - Admin Only */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMIN]}
            />
          }
        >
          <Route path="/college-institution-management" element={<CollegeInstitutionManagement />} />
          <Route path="/college-institution-management/add" element={<AddCollege />} />
          <Route path="/academic-year-management" element={<AcademicYearManagement />} />
          <Route path="/department-management" element={<DepartmentManagement />} />
          <Route path="/semester-management" element={<SemesterManagement />} />
          <Route path="/section-management" element={<SectionManagement />} />
        </Route>

        {/* Course Management - Admin Only */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/courses" element={<Course />} />
          <Route path="/courses/add" element={<Course mode="form" />} />
          <Route path="/courses/:id" element={<Course mode="details" />} />
          <Route path="/courses/:id/edit" element={<Course mode="form" />} />
          <Route path="/branches" element={<Branch />} />
          <Route path="/branches/add" element={<Branch mode="form" />} />
          <Route path="/branches/:id" element={<Branch mode="details" />} />
          <Route path="/branches/:id/edit" element={<Branch mode="form" />} />
          <Route path="/courses/:courseId/branches/:branchId/structure" element={<CourseStructure />} />
        </Route>

        {/* Student Admissions - Admin Only */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/student-management/admissions" element={<StudentAdmission />} />
          <Route path="/student-management/admissions/new" element={<StudentAdmission />} />
          <Route path="/student-management/admissions/:id" element={<StudentAdmission />} />
          <Route path="/student-management/admissions/:id/edit" element={<StudentAdmission />} />
          <Route path="/student-management/admissions/:id/documents" element={<StudentAdmission />} />
          <Route path="/student-management/admissions/:id/approval" element={<StudentAdmission />} />
          <Route path="/student-management/profiles" element={<StudentProfile />} />
          <Route path="/student-management/promotions" element={<StudentPromotion />} />
        </Route>

        {/* My Subjects - Faculty + Student */}
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
        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />

        {/* Unknown route */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </AppErrorBoundary>
  )
}
