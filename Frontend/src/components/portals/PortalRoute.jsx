import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUserRole, isAuthenticated, mustChangePassword, isNonTeachingStaff } from '../../auth/auth.js'
import { isPortalPreview } from '../../auth/portalPreview.js'
import { portalHome } from './portalNavigation.js'
import { ROLES } from '../../auth/roles.js'

export default function PortalRoute({ roles }) {
  const location = useLocation()
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />

  const userRole = getUserRole()
  const isNonTeaching = isNonTeachingStaff()

  if (roles.includes('staff') || roles.includes(ROLES.STAFF)) {
    if (!isNonTeaching) {
      if (userRole === 'faculty') return <Navigate to="/faculty-portal/dashboard" replace />
      if (userRole === 'student') return <Navigate to="/student-portal/dashboard" replace />
      if (userRole === 'admin') return <Navigate to="/user-access" replace />
      return <Navigate to="/unauthorized" replace />
    }
    return <Outlet />
  }

  if (isNonTeaching) {
    if (
      location.pathname.startsWith('/faculty-portal') ||
      location.pathname.startsWith('/faculty') ||
      location.pathname === '/my-subjects' ||
      roles.includes(ROLES.FACULTY)
    ) {
      return <Navigate to="/staff-portal/dashboard" replace />
    }
    return <Navigate to="/staff-portal/dashboard" replace />
  }

  if (!roles.includes(userRole)) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}

export function RoleDashboard({ children }) {
  const role = getUserRole()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  if (role === 'admin') return isPortalPreview() ? <Navigate to="/user-access" replace /> : children
  if (isNonTeachingStaff()) return <Navigate to="/staff-portal/dashboard" replace />
  if (!['faculty', 'student'].includes(role)) return <Navigate to="/unauthorized" replace />
  return <Navigate to={portalHome(role)} replace />
}

export function RoleAlias({ screen }) {
  if (isNonTeachingStaff()) return <Navigate to="/staff-portal/dashboard" replace />
  const role = getUserRole()
  return <Navigate to={`${role === 'faculty' ? '/faculty-portal' : '/student-portal'}/${screen}`} replace />
}

