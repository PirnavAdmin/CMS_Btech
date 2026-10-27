import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getAccessToken, getAuthStorage, getUserRole, isAuthenticated, isNonTeachingStaff, mustChangePassword, signOut } from './auth.js'
import { roleApi } from '../api/apiEndpoints.js'
import { requireAssignedPermissions, canViewScreen, isPersonalWorkspace } from './screenPermissions.js'
import './ScreenAccess.css'

const AccessContext = createContext({ loading: true, canView: () => false })
export const useScreenAccess = () => useContext(AccessContext)

export default function ScreenAccess({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const role = isNonTeachingStaff() ? 'staff' : getUserRole()
  const identity = `${getAccessToken()}:${getAuthStorage()?.getItem('btech-assigned-roles') || ''}`
  const [state, setState] = useState({ identity: '', permissions: {}, loading: true })
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!isAuthenticated() || role === 'admin' || isPersonalWorkspace(pathname, role) || (['faculty', 'staff'].includes(role) && ['/dashboard', '/unauthorized'].includes(pathname))) {
        setState({ identity, permissions: {}, loading: false }); return
      }
      if (active) setState({ identity, permissions: {}, loading: true, error: '' })
      try {
        const rows = await roleApi.getAll()
        let roles = []
        try { roles = JSON.parse(getAuthStorage()?.getItem('btech-assigned-roles') || '[]') } catch { /* Deny missing assignments. */ }
        const permissions = requireAssignedPermissions(rows, roles)
        if (active) setState({ identity, permissions, loading: false, error: '' })
      } catch (error) {
        if (active) setState({ identity, permissions: {}, loading: false, error: error.message || 'Screen permissions could not be loaded. Please retry.' })
      }
    }
    load()
    window.addEventListener('focus', load)
    window.addEventListener('btech-permissions-updated', load)
    return () => { active = false; window.removeEventListener('focus', load); window.removeEventListener('btech-permissions-updated', load) }
  }, [identity, role, pathname, attempt])
  const loading = role !== 'admin' && (state.identity !== identity || state.loading)
  const publicPage = ['/', '/login', '/register', '/activate-account', '/change-password', '/portal-preview'].includes(pathname)
  if (pathname === '/unauthorized' && isAuthenticated() && !mustChangePassword() && ['faculty', 'staff'].includes(role)) return <Navigate to={`/${role}-portal/dashboard`} replace />
  if (!publicPage && role !== 'admin' && isAuthenticated() && !mustChangePassword() && state.identity === identity && !loading && state.error) return <main className="access-configuration"><section role="alert"><h1>Access configuration unavailable</h1><p>Your session is signed in, but your assigned screen permissions could not be verified.</p><p className="access-configuration-reason">{state.error}</p><div><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry permissions</button><button type="button" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>Back to sign in</button></div></section></main>
  return <AccessContext.Provider value={{ loading, canView: path => !loading && canViewScreen(path, role, state.permissions) }}>{children}</AccessContext.Provider>
}
