import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiBell, FiBookOpen, FiCalendar, FiCheckSquare, FiClock, FiEdit3, FiFileText, FiGrid, FiLogOut, FiMenu, FiMoon, FiSun, FiUser, FiUsers, FiX } from 'react-icons/fi'
import { getAuthStorage, getUserRole, signOut } from '../auth/auth.js'
import { facultyNavigation, studentNavigation } from '../components/portals/portalNavigation.js'
import { isPortalPreview } from '../auth/portalPreview.js'
import { PortalDialog } from '../components/portals/PortalUI.jsx'
import '../components/Sidebar.css'
import '../styles/portals.css'
import FacultyNavbarActions from '../components/portals/FacultyNavbarActions.jsx'
import FacultySignOutDialog from '../components/portals/FacultySignOutDialog.jsx'

const teachingIcons = { dashboard: FiGrid, students: FiUsers, subjects: FiBookOpen, attendance: FiCheckSquare, 'my-attendance': FiClock, marks: FiEdit3, timetable: FiCalendar, materials: FiFileText, leave: FiCalendar, notifications: FiBell, profile: FiUser }
function NavigationIcon({ role, screen }) { const Icon = role === 'faculty' ? teachingIcons[screen] || FiGrid : FiGrid; return <Icon aria-hidden="true" /> }

export default function PortalLayout({ children, title }) {
  const role = getUserRole(), navigate = useNavigate()
  const [open, setOpen] = useState(false), [logout, setLogout] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('pirnav-theme') || 'light')
  const nav = role === 'faculty' ? facultyNavigation.filter(([key]) => !['profile', 'notifications'].includes(key)) : role === 'student' ? studentNavigation : [['users', 'User Access Management']]
  const base = role === 'admin' ? '/user-access' : `/${role}-portal`
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('pirnav-theme', theme) }, [theme])
  return <div className="portal-shell">
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} onClick={() => setOpen(false)} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Portal navigation">
      <div className="sidebar-brand"><span className="sidebar-brand__mark"><FiBookOpen /></span><div className="sidebar-brand__copy"><strong>{isPortalPreview() ? 'Campus Preview' : 'Digital Campus'}</strong><span className="sidebar-brand__subtitle">{role === 'faculty' ? 'Teaching Faculty' : role} Portal</span></div><button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><FiX /></button></div>
      <nav className="sidebar-navigation"><p className="sidebar-section-label">My workspace</p>{nav.map(([key, label]) => <NavLink key={key} to={role === 'admin' ? base : `${base}/${key}`} onClick={() => setOpen(false)} className={({ isActive }) => `sidebar-link sidebar-link--blue ${isActive ? 'active' : ''}`}><NavigationIcon role={role} screen={key} /><span>{label}</span></NavLink>)}{role !== 'faculty' && <button className="sidebar-link" onClick={() => setLogout(true)}><FiLogOut aria-hidden="true" />Sign out</button>}</nav>
    </aside>
    <div className="portal-content"><header className="portal-topbar"><button className="portal-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><FiMenu /></button><span>Digital Campus <span className="portal-topbar-divider">/</span> {title}</span><div className="portal-topbar-actions">{role === 'faculty' ? <FacultyNavbarActions name={getAuthStorage()?.getItem('btech-user-name')} theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onSignOut={() => setLogout(true)} /> : <><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? <FiSun /> : <FiMoon />}</button><Link to={role === 'admin' ? '/user-access' : `${base}/profile`}><FiUser /><span>{getAuthStorage()?.getItem('btech-user-name') || role}<small>{role === 'faculty' ? 'Teaching Faculty' : role}</small></span></Link></>}</div></header>
      <div className="portal-workspace">{children}</div>
    </div>
    {logout && role === 'faculty' && <FacultySignOutDialog onClose={() => setLogout(false)} onConfirm={() => { signOut(); sessionStorage.setItem('btech-logout-message', 'You have been signed out successfully.'); navigate('/login', { replace: true }) }} />}
    {logout && role !== 'faculty' && <PortalDialog title="Sign out?" onClose={() => setLogout(false)}><p>You can sign in again to return to your workspace.</p><div className="portal-actions"><button onClick={() => setLogout(false)}>Cancel</button><button className="primary" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>Sign out</button></div></PortalDialog>}
  </div>
}
