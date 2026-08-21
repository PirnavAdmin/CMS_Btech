import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUserRole, isAuthenticated } from '../auth/auth'

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation()

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  const userRole = getUserRole()

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}