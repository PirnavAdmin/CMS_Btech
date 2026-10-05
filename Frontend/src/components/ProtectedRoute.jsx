import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUserRole, isAuthenticated } from '../auth/auth'
import { useAcademic } from '../context/AcademicContext'

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation()
  const { selectedCollegeId } = useAcademic()

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

  return <Outlet key={selectedCollegeId} />
}
