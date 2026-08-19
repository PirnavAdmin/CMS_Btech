import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './auth/roles'

import Attendance from './pages/Attendance'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import MySubjects from './pages/MySubjects'
import Unauthorized from './pages/Unauthorized'
import Users from './pages/Users'

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