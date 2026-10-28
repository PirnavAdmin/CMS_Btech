import { Navigate, useNavigate } from 'react-router-dom'
import { portalPreviewEnabled, signInPortalPreview } from '../../auth/portalPreview.js'
import '../../styles/portals.css'

export default function PortalPreview() {
  const navigate = useNavigate()
  if (!portalPreviewEnabled) return <Navigate to="/login" replace />
  return <main className="portal-preview"><section className="portal-card portal-page"><p className="portal-eyebrow">Development only</p><h1>Explore the portals</h1><p>Use a sample identity to review the frontend. This preview creates no real accounts and uses no backend authentication.</p><div className="portal-actions">{['admin', 'faculty', 'student'].map(role => <button className="primary" key={role} onClick={() => { signInPortalPreview(role); navigate(role === 'admin' ? '/user-access' : `/${role}-portal/dashboard`, { replace: true }) }}>Preview {role}</button>)}</div></section></main>
}
