import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUserRole, isAuthenticated, mustChangePassword } from '../../auth/auth.js'
import { isPortalPreview } from '../../auth/portalPreview.js'
import { portalHome, facultyNavigation, studentNavigation } from './portalNavigation.js'
import { additionalScreens } from '../../auth/screenPermissions.js'

export default function PortalRoute({ roles }) {
  const location = useLocation()
  const { loading, canView } = useScreenAccess()
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  if (loading) return <p role="status">Loading access permissions...</p>
  const role = getUserRole()
  if (location.pathname === `/${role}-portal` || location.pathname === `/${role}-portal/dashboard`) {
    if (!canView(location.pathname)) {
      const nav = role === 'faculty' ? facultyNavigation : role === 'student' ? studentNavigation : [['profile', 'My Profile']]
      const destinations = [...nav.map(([screen]) => `/${role}-portal/${screen}`), ...(role !== 'student' ? additionalScreens.map(([path]) => path) : [])]
      const firstAllowed = destinations.find(canView)
      return <Navigate to={firstAllowed || '/unauthorized'} replace />
    }
  }
  if (!roles.includes(getUserRole()) && !canView(location.pathname)) return <Navigate to="/unauthorized" replace />
  if (!canView(location.pathname) && !["/my-subjects", "/user-access"].includes(location.pathname)) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}
export function RoleDashboard({ children }) {
  const role = getUserRole()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  if (role === 'admin') return isPortalPreview() ? <Navigate to="/roles-designations" replace /> : children
  if (role === 'staff') return <Navigate to="/staff-portal/dashboard" replace />
  if (!['faculty', 'student'].includes(role)) return <Navigate to="/unauthorized" replace />
  return <Navigate to={portalHome(role)} replace />
}
export function RoleAlias({ screen }) {
  const role = getUserRole()
  return <Navigate to={`${role === 'faculty' ? '/faculty-portal' : '/student-portal'}/${screen}`} replace />
}
