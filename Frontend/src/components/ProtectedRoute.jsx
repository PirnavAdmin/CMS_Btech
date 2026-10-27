import { useScreenAccess } from '../auth/ScreenAccess.jsx'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated, mustChangePassword } from '../auth/auth'

export default function ProtectedRoute() {
  const location = useLocation()
  const { loading, canView } = useScreenAccess()

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  if (loading) return <p role="status">Loading access permissions...</p>
  if (!canView(location.pathname)) return <Navigate to="/unauthorized" replace />

  return <Outlet />
}
