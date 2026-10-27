import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUserRole, isAuthenticated, mustChangePassword, isNonTeachingStaff } from '../../auth/auth.js'
import { isPortalPreview } from '../../auth/portalPreview.js'
import { portalHome, facultyNavigation, studentNavigation } from './portalNavigation.js'
import { ROLES } from '../../auth/roles.js'
import { additionalScreens } from '../../auth/screenPermissions.js'

export default function PortalRoute({ roles }) {
  const location = useLocation()
  const { loading, canView } = useScreenAccess()
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  const userRole = getUserRole()
  const isNonTeaching = isNonTeachingStaff()

  if (roles.includes('staff') || roles.includes(ROLES.STAFF)) {
    if (!isNonTeaching && userRole !== ROLES.STAFF) {
      if (userRole === 'faculty') return <Navigate to="/faculty-portal/dashboard" replace />
      if (userRole === 'student') return <Navigate to="/student-portal/dashboard" replace />
      if (userRole === 'admin') return <Navigate to="/user-access" replace />
      return <Navigate to="/unauthorized" replace />
    }
    if (loading) return <p role="status">Loading access permissions...</p>
    return canView(location.pathname) ? <Outlet /> : <Navigate to="/unauthorized" replace />
  }

  if (isNonTeaching) {
    return <Navigate to="/staff-portal/dashboard" replace />
  }

  if (loading) return <p role="status">Loading access permissions...</p>
  const role = isNonTeachingStaff() ? 'staff' : getUserRole()
  if (location.pathname === `/${role}-portal` || location.pathname === `/${role}-portal/dashboard`) {
    if (!canView(location.pathname)) {
      const nav = role === 'faculty' ? facultyNavigation : role === 'student' ? studentNavigation : [['profile', 'My Profile']]
      const destinations = [...nav.map(([screen]) => `/${role}-portal/${screen}`), ...(role !== 'student' ? additionalScreens.map(([path]) => path) : [])]
      const firstAllowed = destinations.find(canView)
      return <Navigate to={firstAllowed || '/unauthorized'} replace />
    }
  }
  if (!roles.includes(userRole)) return <Navigate to="/unauthorized" replace />
  if (!canView(location.pathname) && !["/my-subjects", "/user-access"].includes(location.pathname)) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}

export function RoleDashboard({ children }) {
  const role = getUserRole()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (mustChangePassword()) return <Navigate to="/change-password" replace />
  if (role === 'admin') return isPortalPreview() ? <Navigate to="/roles-designations" replace /> : children
  if (role === 'staff' || isNonTeachingStaff()) return <Navigate to="/staff-portal/dashboard" replace />
  if (!['faculty', 'student'].includes(role)) return <Navigate to="/unauthorized" replace />
  return <Navigate to={portalHome(role)} replace />
}

export function RoleAlias({ screen }) {
  if (isNonTeachingStaff()) return <Navigate to="/staff-portal/dashboard" replace />
  const role = getUserRole()
  return <Navigate to={`${role === 'faculty' ? '/faculty-portal' : '/student-portal'}/${screen}`} replace />
}

