import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserRole, signOut } from '../auth/auth'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const userRole = getUserRole() || 'user'
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1)
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const accountMenuRef = useRef(null)
  const requestSignOut = () => { accountMenuRef.current?.removeAttribute('open'); setShowLogoutConfirmation(true) }
  const handleSignOut = () => { signOut(); sessionStorage.setItem('btech-logout-message', 'Successfully signed out.'); navigate('/login', { replace: true }) }

  return <div className="dashboard-layout">
    <Sidebar />
    <main>
      <header className="dashboard-header">
        <span>BTech Management System</span>
        <details className="account-menu" ref={accountMenuRef}>
          <summary aria-label="Open account menu"><span className="account-avatar">{roleLabel.charAt(0)}</span><span><strong>{roleLabel}</strong><small>Account</small></span><span aria-hidden="true">▾</span></summary>
          <div className="account-menu__panel">
            <button type="button" onClick={() => navigate('/my-profile')}>My Profile</button>
            <button type="button" onClick={() => navigate('/settings')}>Settings</button>
            <button type="button" className="account-menu__signout" onClick={requestSignOut}>Sign Out</button>
          </div>
        </details>
      </header>
      <section className="page-content">{children}</section>
      {showLogoutConfirmation && <div className="logout-confirmation" role="dialog" aria-modal="true" aria-labelledby="logout-confirmation-title">
        <p className="logout-confirmation__eyebrow">Sign out</p>
        <h2 id="logout-confirmation-title">Ready to leave?</h2>
        <p>Your session will be cleared securely and you will need to sign in again.</p>
        <div className="logout-confirmation__actions">
          <button type="button" className="logout-confirmation__cancel" onClick={() => setShowLogoutConfirmation(false)}>Cancel</button>
          <button type="button" className="logout-confirmation__confirm" onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>}
    </main>
  </div>
}
