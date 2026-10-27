import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUserRole, isAuthenticated, mustChangePassword } from '../../auth/auth.js'
import { isPortalPreview } from '../../auth/portalPreview.js'
import { portalHome } from './portalNavigation.js'

export default function PortalRoute({ roles }) {
  const location = useLocation()
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  if (!roles.includes(getUserRole())) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}
export function RoleDashboard({ children }) {
  const role = getUserRole()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  if (role === 'admin') return isPortalPreview() ? <Navigate to="/user-access" replace /> : children
  if (!['faculty', 'student'].includes(role)) return <Navigate to="/unauthorized" replace />
  return <Navigate to={portalHome(role)} replace />
}
export function RoleAlias({ screen }) {
  const role = getUserRole()
  return <Navigate to={`${role === 'faculty' ? '/faculty-portal' : '/student-portal'}/${screen}`} replace />
}
