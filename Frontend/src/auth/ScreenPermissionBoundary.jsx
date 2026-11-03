import { Fragment } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { requiredActionForScreen } from './screenPermissions.js'
import { useScreenAccess } from './ScreenAccess.jsx'

export default function ScreenPermissionBoundary({ children }) {
  const { pathname } = useLocation()
  const { canAction, loading, error, retry, collegeId } = useScreenAccess()
  if (canAction(pathname, requiredActionForScreen(pathname))) return <Fragment key={collegeId || 'unselected'}>{children}</Fragment>
  if (loading) return <p role="status">Loading account access…</p>
  if (error) return <div role="alert"><p>Account access could not be loaded. Your current screen has not been opened.</p><button type="button" onClick={retry}>Retry account access</button></div>
  return <Navigate to="/unauthorized" replace />
}
