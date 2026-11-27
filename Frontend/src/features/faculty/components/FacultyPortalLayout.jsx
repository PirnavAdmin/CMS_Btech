import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiBell, FiBook, FiBookOpen, FiBriefcase, FiCalendar, FiCheckSquare, FiChevronLeft, FiChevronRight, FiClock, FiCreditCard, FiEdit3, FiFileText, FiGrid, FiMessageSquare, FiMenu, FiSearch, FiSettings, FiShield, FiUser, FiUsers, FiX } from 'react-icons/fi'
import { useScreenAccess } from '../../../auth/ScreenAccess.jsx'
import { getAuthStorage, getUserRoleDisplayName, signOut } from '../../../auth/auth.js'
import { facultyNavigation, facultySidebarKeys } from '../../../components/portals/portalNavigation.js'
import { additionalScreens } from '../../../auth/screenPermissions.js'
import FacultyNavbarActions from '../../../components/portals/FacultyNavbarActions.jsx'
import FacultySignOutDialog from '../../../components/portals/FacultySignOutDialog.jsx'
import ThemeColorPicker from '../../../components/ThemeColorPicker.jsx'
import FacultyBreadcrumbs from './FacultyBreadcrumbs.jsx'
import './FacultyPortalLayout.css'

const SIDEBAR_STORAGE_KEY = 'pirnav-faculty-sidebar-collapsed'
const sidebarIcons = {
  dashboard: FiGrid, students: FiUsers, subjects: FiBook, syllabus: FiBookOpen,
  attendance: FiCheckSquare, 'my-attendance': FiClock, marks: FiEdit3,
  timetable: FiCalendar, materials: FiBookOpen, leave: FiCalendar,
  meetings: FiCalendar, placements: FiBriefcase, exams: FiFileText,
  electives: FiFileText, documents: FiFileText, notifications: FiBell,
  profile: FiUser, fees: FiCreditCard, users: FiShield, assignments: FiFileText,
  library: FiBookOpen, messages: FiMessageSquare, settings: FiSettings,
}

export default function FacultyPortalLayout({ children, title = 'Teaching Faculty' }) {
  const navigate = useNavigate()
  const { canView } = useScreenAccess()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
  const [query, setQuery] = useState('')
  const name = getAuthStorage()?.getItem('btech-user-name') || 'Faculty'
  const roleLabel = getUserRoleDisplayName()
  const nav = [
    ...facultyNavigation.filter(([key]) => canView(`/faculty-portal/${key}`)),
    ...additionalScreens.filter(([path]) => canView(path)),
  ]
  const sidebarNav = nav.filter(([key]) => facultySidebarKeys.has(key))
  const results = query.trim()
    ? nav.filter(([, label]) => label.toLowerCase().includes(query.trim().toLowerCase()))
    : []
  const toggleCollapsed = () => setCollapsed(value => {
    const next = !value
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
    return next
  })

  return <div className={`faculty-portal-shell${collapsed ? ' is-sidebar-collapsed' : ''}`}>
    <button className={`faculty-shell-scrim${menuOpen ? ' is-visible' : ''}`} type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" tabIndex={menuOpen ? 0 : -1} />
    <aside className={`faculty-shell-sidebar${menuOpen ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="Teaching Faculty navigation">
      <div className="faculty-shell-brand">
        <span className="faculty-shell-brand-mark" aria-hidden="true"><FiBookOpen /></span>
        <div className="faculty-shell-brand-copy"><strong>Digital Campus</strong><span>Teaching Faculty Portal</span></div>
        <button className="faculty-shell-collapse" type="button" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button className="faculty-shell-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><FiX /></button>
      </div>
      <nav className="faculty-shell-navigation">
        <p className="faculty-shell-section-label">My workspace</p>
        {sidebarNav.map(([key, label]) => { const Icon = sidebarIcons[key] || FiGrid; return <NavLink key={key} to={`/faculty-portal/${key}`} onClick={() => { setMenuOpen(false); setQuery('') }} title={collapsed ? label : undefined} className={({ isActive }) => `faculty-shell-link${isActive ? ' is-active' : ''}`}><Icon aria-hidden="true" /><span>{label}</span></NavLink> })}
      </nav>
    </aside>
    <div className="faculty-shell-main">
      <header className="faculty-shell-header">
        <button className="faculty-shell-menu-toggle" type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><FiMenu /></button>
        <div className="faculty-shell-search"><FiSearch aria-hidden="true" /><input aria-label="Search modules" placeholder="Search modules" value={query} onChange={event => setQuery(event.target.value)} />{query.trim() && <div className="faculty-shell-search-results">{results.length ? results.map(([key, label]) => <Link key={key} to={key.startsWith('/') ? key : `/faculty-portal/${key}`} onClick={() => setQuery('')}>{label}</Link>) : <p>No matching modules</p>}</div>}</div>
        <div className="faculty-shell-actions"><FacultyNavbarActions name={name} roleLabel={roleLabel} onSignOut={() => setSignedOut(true)} /><ThemeColorPicker /></div>
      </header>
      <main className="faculty-shell-workspace">
        <FacultyBreadcrumbs crumbs={[{ label: title }]} />
        {children}
      </main>
    </div>
    {signedOut && <FacultySignOutDialog onClose={() => setSignedOut(false)} onConfirm={() => { signOut(); sessionStorage.setItem('btech-logout-message', 'You have been signed out successfully.'); navigate('/login', { replace: true }) }} />}
  </div>
}
