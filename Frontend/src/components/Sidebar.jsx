import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiAward, FiBarChart2, FiBook, FiBookOpen, FiBriefcase, FiCalendar, FiCheckCircle, FiCheckSquare, FiChevronLeft, FiChevronRight, FiCreditCard, FiEdit3, FiFileText, FiGitBranch, FiGrid, FiHome, FiLayers, FiSliders, FiTrendingUp, FiUser, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'
import { useAcademic } from '../context/AcademicContext'

const academicLinks = [
  { label: 'Academic Years', to: '/academic-year-management', icon: FiCalendar, tone: 'green' },
  { label: 'Departments', to: '/department-management', icon: FiGrid, tone: 'cyan' },
  { label: 'Courses', to: '/courses', icon: FiBookOpen, tone: 'blue' },
  { label: 'Branches', to: '/branches', icon: FiGitBranch, tone: 'purple' },
  { label: 'Semesters', to: '/semester-management', icon: FiLayers, tone: 'orange' },
  { label: 'Sections', to: '/section-management', icon: FiUsers, tone: 'pink' },
  { label: 'Colleges & Institutions', to: '/college-institution-management', icon: FiHome, tone: 'gold' },
]

const curriculumLinks = [
  { label: 'Timetable Management', to: '/timetable', icon: FiCalendar, tone: 'orange' },
  { label: 'Subject Management', to: '/subject-management', icon: FiBook, tone: 'blue' },
  { label: 'Credits Management', to: '/credits-management', icon: FiAward, tone: 'green' },
  { label: 'Elective Management', to: '/elective-management', icon: FiCheckCircle, tone: 'purple' },
]

function Item({ to, icon: Icon, children, onNavigate, tone = 'blue', activeWhen }) {
  const location = useLocation()
  return <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `sidebar-link sidebar-link--${tone} ${(activeWhen ? activeWhen(location.pathname) : isActive) ? 'active' : ''}`}><Icon aria-hidden="true" /><span>{children}</span></NavLink>
}

export default function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
  const userRole = getUserRole()
  const { pathname } = useLocation()
  const navigationRef = useRef(null)
  const { selectedCollege } = useAcademic()

  const collegeDisplayName = selectedCollege?.name || selectedCollege?.collegeName || 'Pirnav Engineering College'

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
        <span className="sidebar-brand__copy"><strong>{collegeDisplayName}</strong><small>Digital Campus</small></span>
        <button className="sidebar-collapse" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><FiX /></button>
      </div>
      <nav ref={navigationRef} onScroll={rememberScrollPosition} className="sidebar-navigation">
        <p className="sidebar-section-label">Overview</p>
        <Item to="/dashboard" icon={FiHome} tone="blue" onNavigate={onClose}>Dashboard</Item>
        {userRole === ROLES.ADMIN && <>
          <p className="sidebar-section-label">Academic Management</p>
          {academicLinks.map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Student Management</p>
          <Item to="/student-management/admissions" icon={FiUserPlus} tone="orange" onNavigate={onClose}>Admissions</Item>
          <Item to="/student-management/profiles" icon={FiUser} tone="cyan" onNavigate={onClose}>Student Profiles</Item>
          <Item to="/student-management/promotions" icon={FiTrendingUp} tone="green" onNavigate={onClose}>Student Promotions</Item>
          <p className="sidebar-section-label">Faculty Management</p>
          <Item to="/faculty" icon={FiBriefcase} tone="cyan" onNavigate={onClose} activeWhen={pathname => !['attendance', 'leave-management', 'payroll', 'advisors', 'subjects'].includes(pathname.split('/')[2]) && pathname.startsWith('/faculty')}>Faculty Directory</Item>
          <Item to="/faculty/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose} activeWhen={pathname => pathname === '/faculty/attendance' || pathname.startsWith('/faculty/attendance/')}>Faculty Attendance</Item>
          <Item to="/faculty/leave-management" icon={FiCalendar} tone="orange" onNavigate={onClose}>Leave Management</Item>
          <Item to="/faculty/payroll" icon={FiCreditCard} tone="gold" onNavigate={onClose}>Faculty Payroll</Item>
          <p className="sidebar-section-label">Curriculum & Subjects</p>
          {curriculumLinks.map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Campus Operations</p>
          <Item to="/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Attendance</Item>
          <Item to="/marks" icon={FiEdit3} tone="orange" onNavigate={onClose}>Marks</Item>
          <Item to="/results" icon={FiBarChart2} tone="purple" onNavigate={onClose}>Results</Item>
          <p className="sidebar-section-label">Finance</p>
          <Item to="/fees" icon={FiCreditCard} tone="gold" onNavigate={onClose}>Fee Structure</Item>
          <p className="sidebar-section-label">Settings</p>
          <Item to="/settings" icon={FiSliders} tone="blue" onNavigate={onClose}>Academic Context</Item>
          <Item to="/my-profile" icon={FiUser} tone="cyan" onNavigate={onClose}>My Profile</Item>
        </>}
        {[ROLES.FACULTY, ROLES.STUDENT].includes(userRole) && <><p className="sidebar-section-label">Academics</p><Item to="/my-subjects" icon={FiBookOpen} tone="blue" onNavigate={onClose}>My Subjects</Item>{userRole===ROLES.FACULTY&&<><Item to="/attendance/take" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Take Attendance</Item><Item to="/marks/entry" icon={FiEdit3} tone="orange" onNavigate={onClose}>Enter Marks</Item></>}</>}
      </nav>
    </aside>
  </>
}
