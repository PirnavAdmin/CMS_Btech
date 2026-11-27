import ScreenPermissionBoundary from '../../auth/ScreenPermissionBoundary.jsx'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAuthStorage, getUserRole, isAuthenticated, isLibrarian, rememberUserDesignation } from '../../auth/auth.js'
import { profileApi } from '../../api/apiEndpoints.js'
import { isPortalPreview } from '../../auth/portalPreview.js'
import { portalHome } from './portalNavigation.js'

export default function PortalRoute({ roles, permissionCheckedByChild = false }) {
  const location = useLocation()
  const role = getUserRole()
  const needsDesignationLookup = ['faculty', 'staff'].includes(role) && !isLibrarian() && getAuthStorage()?.getItem('btech-designation-checked') !== 'true'
  const [designationLookup, setDesignationLookup] = useState(() => needsDesignationLookup ? 'loading' : 'done')
  useEffect(() => {
    if (!needsDesignationLookup) return undefined
    let active = true
    profileApi.getProfile()
      .then(profile => { if (active) { rememberUserDesignation(profile.designation); setDesignationLookup('done') } })
      .catch(() => { if (active) setDesignationLookup('done') })
    return () => { active = false }
  }, [needsDesignationLookup])
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (needsDesignationLookup && designationLookup === 'loading') return <main className="screen-access-loading" role="status" aria-busy="true"><span className="screen-access-loading__spinner" aria-hidden="true" />Loading your workspace...</main>
  if (isLibrarian() && roles.some(allowedRole => ['faculty', 'staff'].includes(allowedRole))) return <Outlet />
  if (!roles.includes(getUserRole())) return <Navigate to="/unauthorized" replace />
  return permissionCheckedByChild ? <Outlet /> : <ScreenPermissionBoundary><Outlet /></ScreenPermissionBoundary>
}
export function RoleDashboard({ children }) {
  const role = getUserRole()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (role === 'staff' && isLibrarian()) return <Navigate to="/staff-portal/dashboard" replace />
  if (role === 'admin') return isPortalPreview() ? <Navigate to="/user-access" replace /> : children
  if (!['faculty', 'student', 'staff'].includes(role)) return <Navigate to="/unauthorized" replace />
  return <Navigate to={portalHome(role)} replace />
}
export function RoleAlias({ screen }) {
  const role = getUserRole()
  return <Navigate to={`${role === 'faculty' ? '/faculty-portal' : '/student-portal'}/${screen}`} replace />
}
