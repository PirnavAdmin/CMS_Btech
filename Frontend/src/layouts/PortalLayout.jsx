import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiBookOpen, FiGrid, FiLogOut, FiMenu, FiMoon, FiSun, FiUser, FiX } from 'react-icons/fi'
import { getAuthStorage, getUserRole, signOut } from '../auth/auth.js'
import { facultyNavigation, studentNavigation } from '../components/portals/portalNavigation.js'
import { isPortalPreview } from '../auth/portalPreview.js'
import { PortalDialog } from '../components/portals/PortalUI.jsx'
import '../components/Sidebar.css'
import '../styles/portals.css'

export default function PortalLayout({ children, title }) {
  const role = getUserRole(), navigate = useNavigate()
  const [open, setOpen] = useState(false), [logout, setLogout] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('pirnav-theme') || 'light')
  const nav = role === 'faculty' ? facultyNavigation : role === 'student' ? studentNavigation : [['users', 'User Access Management']]
  const base = role === 'admin' ? '/user-access' : `/${role}-portal`
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('pirnav-theme', theme) }, [theme])
  return <div className="portal-shell">
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} onClick={() => setOpen(false)} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Portal navigation">
      <div className="sidebar-brand"><span className="sidebar-brand__mark"><FiBookOpen /></span><div className="sidebar-brand__copy"><strong>{isPortalPreview() ? 'Campus Preview' : 'Digital Campus'}</strong><span className="sidebar-brand__subtitle">{role} Portal</span></div><button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><FiX /></button></div>
      <nav className="sidebar-navigation"><p className="sidebar-section-label">My workspace</p>{nav.map(([key, label]) => <NavLink key={key} to={role === 'admin' ? base : `${base}/${key}`} onClick={() => setOpen(false)} className={({ isActive }) => `sidebar-link sidebar-link--blue ${isActive ? 'active' : ''}`}><FiGrid aria-hidden="true" /><span>{label}</span></NavLink>)}<button className="sidebar-link" onClick={() => setLogout(true)}><FiLogOut aria-hidden="true" />Sign out</button></nav>
    </aside>
    <div className="portal-content"><header className="portal-topbar"><button className="portal-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><FiMenu /></button><span>Digital Campus <span className="portal-topbar-divider">/</span> {title}</span><div className="portal-topbar-actions"><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? <FiSun /> : <FiMoon />}</button><Link to={role === 'admin' ? '/user-access' : `${base}/profile`}><FiUser /><span>{getAuthStorage()?.getItem('btech-user-name') || role}<small>{role}</small></span></Link></div></header>
      <div className="portal-workspace">{children}</div>
    </div>
    {logout && <PortalDialog title="Sign out?" onClose={() => setLogout(false)}><p>You can sign in again to return to your workspace.</p><div className="portal-actions"><button onClick={() => setLogout(false)}>Cancel</button><button className="primary" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>Sign out</button></div></PortalDialog>}
  </div>
}
