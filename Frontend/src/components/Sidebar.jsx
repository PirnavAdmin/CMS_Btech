import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { FiBookOpen, FiCalendar, FiChevronLeft, FiChevronRight, FiGitBranch, FiGrid, FiHome, FiLayers, FiTrendingUp, FiUser, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'

const academicLinks = [
  { label: 'College', to: '/college-institution-management', icon: FiHome, tone: 'gold' },
  { label: 'Academic Years', to: '/academic-year-management', icon: FiCalendar, tone: 'green' },
  { label: 'Courses', to: '/courses', icon: FiBookOpen, tone: 'blue' },
  { label: 'Departments', to: '/department-management', icon: FiGrid, tone: 'cyan' },
  { label: 'Branches', to: '/branches', icon: FiGitBranch, tone: 'purple' },
  { label: 'Semesters', to: '/semester-management', icon: FiLayers, tone: 'orange' },
  { label: 'Sections', to: '/section-management', icon: FiUsers, tone: 'pink' },
]

function Item({ to, icon: Icon, children, onNavigate, tone = 'blue' }) {
  return <NavLink to={to} onClick={onNavigate} className={`sidebar-link sidebar-link--${tone}`}><Icon aria-hidden="true" /><span>{children}</span></NavLink>
}

export default function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
  const userRole = getUserRole()
  const navigationRef = useRef(null)

  useEffect(() => {
    const navigation = navigationRef.current
    if (!navigation) return
    navigation.scrollTop = Number(sessionStorage.getItem('pirnav-sidebar-scroll') || 0)
  }, [])

  const rememberScrollPosition = (event) => {
    sessionStorage.setItem('pirnav-sidebar-scroll', String(event.currentTarget.scrollTop))
  }

  return <>
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} onClick={onClose} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand__mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M4 12 16 5l12 7H4Z"/><path d="M7 14v10M12 14v10M20 14v10M25 14v10"/><path d="M4 25h24M2.5 28h27"/></svg></span>
        <span className="sidebar-brand__copy"><strong>Pirnav Engineering College</strong><small>Digital Campus</small></span>
        <button className="sidebar-collapse" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><FiX /></button>
      </div>
      <nav ref={navigationRef} onScroll={rememberScrollPosition} className="sidebar-navigation">
        <p className="sidebar-section-label">Overview</p>
        <Item to="/dashboard" icon={FiHome} tone="blue" onNavigate={onClose}>Dashboard</Item>
        {userRole === ROLES.ADMIN && <>
          <p className="sidebar-section-label">Academics</p>
          {academicLinks.map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Student Management</p>
          <Item to="/student-management/admissions" icon={FiUserPlus} tone="orange" onNavigate={onClose}>Student Admissions</Item>
          <Item to="/student-management/profiles" icon={FiUser} tone="cyan" onNavigate={onClose}>Student Profiles</Item>
          <Item to="/student-management/promotions" icon={FiTrendingUp} tone="green" onNavigate={onClose}>Student Promotions</Item>
        </>}
        {[ROLES.FACULTY, ROLES.STUDENT].includes(userRole) && <><p className="sidebar-section-label">Academics</p><Item to="/my-subjects" icon={FiBookOpen} tone="blue" onNavigate={onClose}>My Subjects</Item></>}
      </nav>
    </aside>
  </>
}
