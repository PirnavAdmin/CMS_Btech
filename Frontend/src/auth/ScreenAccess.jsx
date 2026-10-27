import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccessToken, getAuthStorage, getUserRole, isAuthenticated } from './auth.js'
import { roleApi } from '../api/apiEndpoints.js'
import { assignedPermissions, canViewScreen } from './screenPermissions.js'

const AccessContext = createContext({ loading: true, canView: () => false })
export const useScreenAccess = () => useContext(AccessContext)

export default function ScreenAccess({ children }) {
  const { pathname } = useLocation()
  const role = getUserRole()
  const identity = `${getAccessToken()}:${getAuthStorage()?.getItem('btech-assigned-roles') || ''}`
  const [state, setState] = useState({ identity: '', permissions: {}, loading: true })
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!isAuthenticated() || role === 'admin') {
        setState({ identity, permissions: {}, loading: false }); return
      }
      try {
        const rows = await roleApi.getAll()
        let roles = []
        try { roles = JSON.parse(getAuthStorage()?.getItem('btech-assigned-roles') || '[]') } catch { /* Deny missing assignments. */ }
        if (active) setState({ identity, permissions: assignedPermissions(rows, roles), loading: false })
      } catch {
        if (active) setState({ identity, permissions: {}, loading: false })
      }
    }
    load()
    window.addEventListener('focus', load)
    window.addEventListener('btech-permissions-updated', load)
    return () => { active = false; window.removeEventListener('focus', load); window.removeEventListener('btech-permissions-updated', load) }
  }, [identity, role, pathname])
  const loading = role !== 'admin' && (state.identity !== identity || state.loading)
  return <AccessContext.Provider value={{ loading, canView: path => !loading && canViewScreen(path, role, state.permissions) }}>{children}</AccessContext.Provider>
}
