import { Fragment } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { requiredActionForScreen } from './screenPermissions.js'
import { useScreenAccess } from './ScreenAccess.jsx'

export default function ScreenPermissionBoundary({ children }) {
  const { pathname } = useLocation()
  const { canAction, loading, error, retry, collegeId } = useScreenAccess()
  if (canAction(pathname, requiredActionForScreen(pathname))) return <Fragment key={collegeId || 'unselected'}>{children}</Fragment>
  if (loading) return <p role="status">Loading account access…</p>
  if (error) return (
    <main className="erp-message-page">
      <section className="erp-message-card" aria-labelledby="access-unavailable-title">
        <h1 id="access-unavailable-title">Unable to connect to your workspace</h1>
        <p role="alert">Account access could not be loaded. Please try again when the service is available.</p>
        <p>You can still visit the home page or open the login page.</p>
        <p><Link className="erp-primary-link" to="/">Go to home</Link></p>
        <p><Link className="erp-primary-link" to="/login">Go to login</Link></p>
        <button type="button" onClick={retry}>Retry account access</button>
      </section>
    </main>
  )
  return <Navigate to="/unauthorized" replace />
}
