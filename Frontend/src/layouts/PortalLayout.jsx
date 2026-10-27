import Link from '../components/portals/PermissionLink.jsx'
import { useScreenAccess } from '../auth/ScreenAccess.jsx'
import { additionalScreens } from '../auth/screenPermissions.js'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiBell, FiBook, FiBookOpen, FiCalendar, FiCheckSquare, FiClock, FiChevronLeft, FiChevronRight, FiCreditCard, FiEdit3, FiFileText, FiGrid, FiLogOut, FiMenu, FiMoon, FiSearch, FiShield, FiSun, FiUser, FiUsers, FiX } from 'react-icons/fi'
import { getAuthStorage, getUserRole, signOut } from '../auth/auth.js'
import { facultyNavigation, studentNavigation } from '../components/portals/portalNavigation.js'
import { isPortalPreview } from '../auth/portalPreview.js'
import { PortalDialog } from '../components/portals/PortalUI.jsx'
import FacultyNavbarActions from '../components/portals/FacultyNavbarActions.jsx'
import FacultySignOutDialog from '../components/portals/FacultySignOutDialog.jsx'
import './DashboardLayout.css'
import './AccountMenu.css'
import '../components/Sidebar.css'
import '../styles/portals.css'
import '../styles/portalAdmin.css'

const navigationIcons = {
  dashboard: [FiGrid, 'blue'], students: [FiUsers, 'cyan'], subjects: [FiBook, 'purple'],
  attendance: [FiCheckSquare, 'green'], 'my-attendance': [FiClock, 'blue'], marks: [FiEdit3, 'gold'], results: [FiFileText, 'gold'],
  timetable: [FiCalendar, 'orange'], materials: [FiBookOpen, 'cyan'], leave: [FiCalendar, 'pink'],
  notifications: [FiBell, 'orange'], profile: [FiUser, 'purple'], fees: [FiCreditCard, 'green'], users: [FiShield, 'blue'],
}

export default function PortalLayout({ children, title }) {
  const role = getUserRole(), navigate = useNavigate()
  const { canView } = useScreenAccess()
  const [open, setOpen] = useState(false), [logout, setLogout] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pirnav-sidebar-collapsed') === 'true')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('pirnav-theme') || 'light')
  const allNav = role === 'faculty' ? facultyNavigation : role === 'student' ? studentNavigation : role === 'staff' ? [['dashboard', 'Dashboard'], ['profile', 'My Profile']] : [['users', 'Roles & Designations']]
  const nav = [...allNav.filter(([key]) => canView(`/${role}-portal/${key}`)), ...(['faculty', 'staff'].includes(role) ? additionalScreens.filter(([path]) => canView(path)) : [])]
  const sidebarNav = nav.filter(([key]) => key !== 'notifications' && !(role === 'faculty' && key === 'profile'))
  const base = role === 'admin' ? '/roles-designations' : `/${role}-portal`
  const storage = getAuthStorage()
  const name = storage?.getItem('btech-user-name') || role
  const profileUrl = role === 'admin' ? base : `${base}/profile`
  const destination = key => key.startsWith('/') ? key : role === 'admin' ? base : `${base}/${key}`
  const results = query.trim() ? nav.filter(([, label]) => label.toLowerCase().includes(query.trim().toLowerCase())) : []
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('pirnav-theme', theme) }, [theme])
  const toggleCollapse = () => setCollapsed(value => { localStorage.setItem('pirnav-sidebar-collapsed', String(!value)); return !value })

  return <div className={`dashboard-layout portal-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} onClick={() => setOpen(false)} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Portal navigation">
      <div className="sidebar-brand"><span className="sidebar-brand__mark" aria-hidden="true"><FiBookOpen /></span><div className="sidebar-brand__copy"><strong>{isPortalPreview() ? 'Campus Preview' : 'Digital Campus'}</strong><span className="sidebar-brand__subtitle">{role === 'faculty' ? 'Teaching Faculty' : role} Portal</span></div><button className="sidebar-collapse" onClick={toggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button><button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><FiX /></button></div>
      <nav className="sidebar-navigation"><p className="sidebar-section-label">My workspace</p>{sidebarNav.map(([key, label]) => {
        const [Icon, tone] = navigationIcons[key] || [FiGrid, 'blue']
        return <NavLink key={key} to={destination(key)} onClick={() => { setOpen(false); setQuery('') }} title={collapsed ? label : undefined} className={({ isActive }) => `sidebar-link sidebar-link--${tone} ${isActive ? 'active' : ''}`}><Icon aria-hidden="true" /><span>{label}</span></NavLink>
      })}</nav>
    </aside>
    <div className="portal-content"><header className="dashboard-header">
      <button className="header-sidebar-toggle portal-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><FiMenu /></button>
      <div className="global-search"><FiSearch aria-hidden="true" /><input aria-label="Search workspace" placeholder="Search modules" value={query} onChange={event => setQuery(event.target.value)} />{query.trim() && <div className="global-search-results">{results.length ? results.map(([key, label]) => <Link key={key} to={destination(key)} onClick={() => setQuery('')}>{label}</Link>) : <p>No matching modules</p>}</div>}</div>
      <div className="dashboard-header__actions">{role === 'faculty' ? <FacultyNavbarActions name={name} theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onSignOut={() => setLogout(true)} /> : <>{['faculty', 'student'].includes(role) && canView(destination('notifications')) && <Link className="portal-notification-link" to={destination('notifications')} aria-label="Notifications"><FiBell aria-hidden="true" /></Link>}<button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? <FiSun /> : <FiMoon />}</button><details className="account-menu"><summary aria-label="Open account menu"><span className="account-avatar"><FiUser aria-hidden="true" /></span><span><strong>{name}</strong><small>{role}</small></span><i className="account-menu__chevron" aria-hidden="true" /></summary><div className="account-menu__panel">{canView(profileUrl) && <button onClick={event => { event.currentTarget.closest('details').removeAttribute('open'); navigate(profileUrl) }}><FiUser />My Profile</button>}<button className="account-menu__signout" onClick={event => { event.currentTarget.closest('details').removeAttribute('open'); setLogout(true) }}><FiLogOut />Sign out</button></div></details></>}</div>
    </header>
      <div className="page-content portal-workspace"><nav className="app-breadcrumb" aria-label="Breadcrumb"><Link to={destination('dashboard')}>Home</Link><span aria-hidden="true">/</span><span>{role} Portal</span><span aria-hidden="true">/</span><strong>{title}</strong></nav>{children}</div>
    </div>
    {logout && role === 'faculty' && <FacultySignOutDialog onClose={() => setLogout(false)} onConfirm={() => { signOut(); sessionStorage.setItem('btech-logout-message', 'You have been signed out successfully.'); navigate('/login', { replace: true }) }} />}
    {logout && role !== 'faculty' && <PortalDialog title="Sign out?" onClose={() => setLogout(false)}><p>You can sign in again to return to your workspace.</p><div className="portal-actions"><button onClick={() => setLogout(false)}>Cancel</button><button className="primary" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>Sign out</button></div></PortalDialog>}
  </div>
}
