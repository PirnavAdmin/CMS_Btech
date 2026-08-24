import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roles'

import Dashboard from './pages/Dashboard'
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
import MyProfile from './pages/profile/MyProfile'
import Settings from './pages/profile/Settings'

export default function App() {
  return (
    <Routes>
      {/* Public */}
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
      </Route>

      {/* Course & Branch Management - Admin Only */}
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
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  )
}
