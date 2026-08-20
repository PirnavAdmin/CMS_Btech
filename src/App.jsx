import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roles'

import Attendance from './pages/Attendance'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import MySubjects from './pages/MySubjects'
import Unauthorized from './pages/Unauthorized'
import Users from './pages/Users'
<<<<<<< HEAD
import CourseList from './pages/courseManagement/CourseList'
import CourseFormPage from './pages/courseManagement/CourseFormPage'
import CourseDetails from './pages/courseManagement/CourseDetails'
import BranchList from './pages/courseManagement/BranchList'
import BranchFormPage from './pages/courseManagement/BranchFormPage'
import BranchDetails from './pages/courseManagement/BranchDetails'
import CourseStructure from './pages/courseManagement/CourseStructure'
=======
import CollegeInstitutionManagement from './pages/admin-management/CollegeInstitutionManagement'
import AcademicYearManagement from './pages/admin-management/AcademicYearManagement'
import DepartmentManagement from './pages/admin-management/DepartmentManagement'
import CourseBranchManagement from './pages/admin-management/CourseBranchManagement'
>>>>>>> 7f6aed3b7084791e2134b0f75aecad2265627675

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

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
      </Route>

      {/* Users - Admin Only */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          />
        }
      >
      <Route path="/users" element={<Users />} />
      <Route path="/college-institution-management" element={<CollegeInstitutionManagement />} />
      <Route path="/academic-year-management" element={<AcademicYearManagement />} />
      <Route path="/department-management" element={<DepartmentManagement />} />
      <Route path="/course-branch-management" element={<CourseBranchManagement />} />
      </Route>

      {/* Course & Branch Management - Admin Only */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path="/courses" element={<CourseList />} />
        <Route path="/courses/add" element={<CourseFormPage />} />
        <Route path="/courses/:id" element={<CourseDetails />} />
        <Route path="/courses/:id/edit" element={<CourseFormPage />} />
        <Route path="/branches" element={<BranchList />} />
        <Route path="/branches/add" element={<BranchFormPage />} />
        <Route path="/branches/:id" element={<BranchDetails />} />
        <Route path="/branches/:id/edit" element={<BranchFormPage />} />
        <Route path="/courses/:courseId/branches/:branchId/structure" element={<CourseStructure />} />
      </Route>

      {/* Attendance - Admin + Faculty */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.ADMIN,
              ROLES.FACULTY,
            ]}
          />
        }
      >
        <Route path="/attendance" element={<Attendance />} />
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
