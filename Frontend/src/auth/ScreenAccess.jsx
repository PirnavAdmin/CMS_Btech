import { useCallback, useContext, useEffect, useState } from 'react'
import AcademicContext from '../context/AcademicContext.jsx'
import { getAccessToken, getUserRole } from './auth.js'
import { isPortalPreview } from './portalPreview.js'
import { canViewScreen, isPersonalWorkspace, permissionModuleForScreen } from './screenPermissions.js'
import { hasModuleAction } from './collegeAuthorization.js'
import { selectedCollegeId as storedCollegeId } from '../utils/collegeScope.js'
import eventBus, { ERP_EVENTS } from '../services/eventBus.js'
import useCollegeAccess from '../hooks/useCollegeAccess.js'
const EMPTY_PERMISSIONS = Object.freeze({})

export function useScreenAccess() {
  const academic = useContext(AcademicContext)
  const [stored, setStored] = useState(() => storedCollegeId())
  useEffect(() => {
    const update = () => setStored(storedCollegeId())
    const unsubscribe = eventBus.subscribe(ERP_EVENTS.ACADEMIC_UPDATED, update)
    window.addEventListener('storage', update)
    return () => { unsubscribe(); window.removeEventListener('storage', update) }
  }, [])
  const role = getUserRole()
  const collegeId = academic?.selectedCollegeId ?? stored
  const result = useCollegeAccess({ token: getAccessToken(), collegeId, collegeLoading: academic?.loading || false, providedAccess: academic?.collegeAccess || null })
  const access = result.access
  const permissions = access?.permissions || EMPTY_PERMISSIONS
  const preview = isPortalPreview()
  const canView = useCallback(path => {
    path = String(path || '')
    if (isPersonalWorkspace(path, role) || (path === '/my-profile' && role)) return true
    // Retain the existing explicit development preview for known personal portal
    // pages only. Preview never grants a shared administrative module or action.
    if (preview && path.startsWith(`/${role}-portal/`)) return Boolean(permissionModuleForScreen(path))
    return result.status === 'ready' && canViewScreen(path, role, permissions, access)
  }, [role, preview, result.status, permissions, access])
  const canAction = useCallback((path, action = 'view') => action === 'view' ? canView(path) :
    !(permissionModuleForScreen(path) === 'colleges' && ['create', 'delete'].includes(action) && access?.isSuperAdmin !== true) && !preview && result.status === 'ready' && canView(path) && hasModuleAction(access, permissionModuleForScreen(path), action), [canView, preview, result.status, access])
  return { ...result, canView, canAction, permissions, collegeId, loading: result.status === 'loading', error: result.status === 'error' ? new Error('Account access could not be loaded.') : null }
}
