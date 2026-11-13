import { Fragment, useContext } from 'react'
import AcademicContext from '../context/AcademicContext.jsx'
import { Navigate, useLocation } from 'react-router-dom'
import { requiredActionForScreen } from './screenPermissions.js'
import { useScreenAccess } from './ScreenAccess.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { MODULE_REGISTRY } from '../config/moduleRegistry.js'
import './ScreenPermissionBoundary.css'

export default function ScreenPermissionBoundary({ children }) {
  const academic = useContext(AcademicContext)
  const shell = content => academic ? <DashboardLayout>{content}</DashboardLayout> : content
  const { pathname } = useLocation()
  const { canAction, loading, error, retry, collegeId } = useScreenAccess()
  const page = MODULE_REGISTRY.filter(entry => pathname === entry.path || pathname.startsWith(entry.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0]
  if (canAction(pathname, requiredActionForScreen(pathname))) return <Fragment key={collegeId || 'unselected'}>{children}</Fragment>
  if (loading) return shell(<main className="workspace-unavailable">
    <h1>{page?.label || 'Workspace'}</h1>
    <section className="workspace-unavailable__data" aria-label="Page data">
      <p role="status">Loading page data…</p>
    </section>
  </main>)
  const settingsContextError = pathname.replace(/\/$/, '') === '/settings' ? academic?.error : null
  if (error || settingsContextError) return (
    shell(<main className="workspace-unavailable">
      <h1>{page?.label || 'Workspace'}</h1>
      <section className="workspace-unavailable__data" aria-label="Page data">
        <p role="status">{settingsContextError || 'Data is temporarily unavailable. Please try again.'}</p>
        <button type="button" aria-label={academic ? undefined : 'Retry account access'} onClick={settingsContextError ? academic.refreshHierarchy : retry}>Retry</button>
      </section>
    </main>)
  )
  return <Navigate to="/unauthorized" replace />
}
