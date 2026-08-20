import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roles'

import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import MySubjects from './pages/MySubjects'
import Unauthorized from './pages/Unauthorized'
import CourseList from './pages/courseManagement/CourseList'
import CourseFormPage from './pages/courseManagement/CourseFormPage'
import CourseDetails from './pages/courseManagement/CourseDetails'
import BranchList from './pages/courseManagement/BranchList'
import BranchFormPage from './pages/courseManagement/BranchFormPage'
import BranchDetails from './pages/courseManagement/BranchDetails'
import CourseStructure from './pages/courseManagement/CourseStructure'
import CollegeInstitutionManagement from './pages/admin-management/CollegeInstitutionManagement'
import AcademicYearManagement from './pages/admin-management/AcademicYearManagement'
import DepartmentManagement from './pages/admin-management/DepartmentManagement'

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
      </Route>

<<<<<<< HEAD
      {/* Administration - Admin Only */}
=======
      {/* Admin Management - Admin Only */}
>>>>>>> 3ca0a3e710f8e4ff2117885595e9ba3f1e62fe48
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          />
        }
      >
<<<<<<< HEAD
      <Route path="/college-institution-management" element={<CollegeInstitutionManagement />} />
      <Route path="/academic-year-management" element={<AcademicYearManagement />} />
      <Route path="/department-management" element={<DepartmentManagement />} />
=======
        <Route path="/college-institution-management" element={<CollegeInstitutionManagement />} />
        <Route path="/academic-year-management" element={<AcademicYearManagement />} />
        <Route path="/department-management" element={<DepartmentManagement />} />
>>>>>>> 3ca0a3e710f8e4ff2117885595e9ba3f1e62fe48
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