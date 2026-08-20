import { useNavigate } from 'react-router-dom'
import { getUserRole, signOut } from '../auth/auth'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const userRole = getUserRole() || 'user'
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1)
  const handleSignOut = () => { signOut(); navigate('/login', { replace: true }) }

  return <div className="dashboard-layout">
    <Sidebar />
    <main>
      <header className="dashboard-header">
        <span>BTech Management System</span>
        <details className="account-menu">
          <summary aria-label="Open account menu"><span className="account-avatar">{roleLabel.charAt(0)}</span><span><strong>{roleLabel}</strong><small>Account</small></span><span aria-hidden="true">▾</span></summary>
          <div className="account-menu__panel">
            <button type="button" onClick={() => navigate('/my-profile')}>My Profile</button>
            <button type="button" onClick={() => navigate('/settings')}>Settings</button>
            <button type="button" className="account-menu__signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </details>
      </header>
      <section className="page-content">{children}</section>
    </main>
  </div>
}
