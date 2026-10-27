import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiGrid,
  FiLock,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSearch,
  FiSun,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import '../../layouts/DashboardLayout.css'
import '../../layouts/AccountMenu.css'
import '../../components/Sidebar.css'
import '../../styles/portals.css'
import '../../styles/portalAdmin.css'
import '../../components/portals/FacultyNavbarActions.css'
import './staff-portal.css'

export const STAFF_NAVIGATION = [
  { key: 'dashboard', label: 'Dashboard', path: '/staff-portal/dashboard', icon: FiGrid, tone: 'blue', desc: 'Daily operations overview, duties and announcements.' },
  { key: 'my-profile', label: 'My Profile', path: '/staff-portal/my-profile', icon: FiUser, tone: 'purple', desc: 'Employment details, personal information and contact settings.' },
  { key: 'my-attendance', label: 'My Attendance', path: '/staff-portal/my-attendance', icon: FiCheckSquare, tone: 'green', desc: 'Punch-in records, monthly calendar and attendance trends.' },
  { key: 'leave', label: 'Leave Management', path: '/staff-portal/leave', icon: FiCalendar, tone: 'pink', desc: 'Apply for leave, check balances and track leave history.' },
  { key: 'duty-roster', label: 'Duty Roster', path: '/staff-portal/duty-roster', icon: FiClock, tone: 'orange', desc: 'Weekly shift schedule, lab assignments and hall duties.' },
  { key: 'tasks', label: 'My Tasks', path: '/staff-portal/tasks', icon: FiCheckCircle, tone: 'cyan', desc: 'Operational tasks, lab maintenance and equipment servicing.' },
  { key: 'notices', label: 'Notices', path: '/staff-portal/notices', icon: FiBell, tone: 'gold', desc: 'Official administrative circulars, drills and department memos.' },
  { key: 'meetings-events', label: 'Meetings and Events', path: '/staff-portal/meetings-events', icon: FiUsers, tone: 'teal', desc: 'Staff meetings, safety workshops and campus activities.' },
  { key: 'documents', label: 'My Documents', path: '/staff-portal/documents', icon: FiFileText, tone: 'blue', desc: 'Appointment letters, service registers, payslips and circulars.' },
]

export default function StaffPortalLayout({ children, currentScreen = 'dashboard', title = 'Dashboard', subtitle }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pirnav-sidebar-collapsed') === 'true')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('pirnav-theme') || 'light')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pirnav-theme', theme)
  }, [theme])

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('pirnav-sidebar-collapsed', String(next))
      return next
    })
  }

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Filter modules for global search
  const filteredModules = query.trim()
    ? STAFF_NAVIGATION.filter(item =>
        item.label.toLowerCase().includes(query.trim().toLowerCase()) ||
        item.desc.toLowerCase().includes(query.trim().toLowerCase())
      )
    : []

  const closeMenu = () => {
    menuRef.current?.removeAttribute('open')
  }

  return (
    <div className={`dashboard-layout portal-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Backdrop Scrim */}
      <button
        type="button"
        className={`sidebar-scrim ${open ? 'is-visible' : ''}`}
        onClick={() => setOpen(false)}
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
      />

      {/* Left Navy Sidebar */}
      <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Staff Portal navigation">
        <div className="sidebar-brand">
          <span className="sidebar-brand__mark" aria-hidden="true">
            <FiBookOpen />
          </span>
          <div className="sidebar-brand__copy">
            <strong>DIGITAL CAMPUS</strong>
            <span className="sidebar-brand__subtitle">Staff Portal</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <FiX />
          </button>
        </div>

        <nav className="sidebar-navigation">
          <p className="sidebar-section-label">MY WORKSPACE</p>
          {STAFF_NAVIGATION.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={() => {
                  setOpen(false)
                  setQuery('')
                }}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => {
                  const isMatch = isActive || currentScreen === item.key || (item.key === 'my-profile' && currentScreen === 'profile') || (item.key === 'my-attendance' && currentScreen === 'attendance')
                  return `sidebar-link sidebar-link--${item.tone} ${isMatch ? 'active' : ''}`
                }}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="portal-content">
        {/* Top Bar */}
        <header className="dashboard-header">
          <button
            type="button"
            className="header-sidebar-toggle portal-menu"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <FiMenu />
          </button>

          {/* Search modules */}
          <div className="global-search">
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              aria-label="Search modules"
              placeholder="Search modules..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query.trim() && (
              <div className="global-search-results">
                {filteredModules.length ? (
                  filteredModules.map(item => (
                    <Link
                      key={item.key}
                      to={item.path}
                      onClick={() => setQuery('')}
                    >
                      <strong>{item.label}</strong>
                      <small style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {item.desc}
                      </small>
                    </Link>
                  ))
                ) : (
                  <p>No matching modules found</p>
                )}
              </div>
            )}
          </div>

          {/* Top Bar Actions */}
          <div className="dashboard-header__actions">
            <div className="faculty-navbar-actions">
              {/* Notification Bell */}
              <Link
                className={`faculty-navbar-icon ${currentScreen === 'notices' ? 'is-active' : ''}`}
                to="/staff-portal/notices"
                aria-label="Notices and Announcements"
                title="Notices"
              >
                <FiBell aria-hidden="true" />
              </Link>

              {/* Dark-mode toggle */}
              <button
                type="button"
                className="faculty-navbar-icon"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
              </button>

              {/* User Chip: sirisha / Non-Teaching Staff */}
              <details className="account-menu faculty-account-menu" ref={menuRef}>
                <summary aria-label="Open staff account menu">
                  <span className="account-avatar faculty-account-avatar">
                    <FiUser aria-hidden="true" />
                  </span>
                  <span className="faculty-account-identity">
                    <strong title="sirisha">sirisha</strong>
                    <small>Non-Teaching Staff</small>
                  </span>
                  <FiChevronDown className="faculty-account-chevron" aria-hidden="true" />
                </summary>
                <div className="account-menu__panel faculty-account-panel">
                  <Link to="/staff-portal/my-profile" onClick={closeMenu}>
                    <FiUser aria-hidden="true" />
                    My Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu()
                      setPasswordOpen(true)
                    }}
                  >
                    <FiLock aria-hidden="true" />
                    Change Password
                  </button>
                  <button
                    type="button"
                    className="faculty-account-signout"
                    onClick={() => {
                      closeMenu()
                      setLogoutOpen(true)
                    }}
                  >
                    <FiLogOut aria-hidden="true" />
                    Logout
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        {/* Workspace Container */}
        <div className="page-content portal-workspace">
          {/* Breadcrumb */}
          <nav className="app-breadcrumb" aria-label="Breadcrumb">
            <Link to="/staff-portal/dashboard">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Staff Portal</span>
            <span aria-hidden="true">/</span>
            <strong>{title}</strong>
          </nav>

          {children}
        </div>
      </div>

      {/* Change Password Modal Dialog */}
      {passwordOpen && (
        <dialog className="portal-dialog" open style={{ zIndex: 9999 }}>
          <header>
            <h2>Change Account Password</h2>
            <button
              type="button"
              onClick={() => setPasswordOpen(false)}
              aria-label="Close dialog"
            >
              <FiX />
            </button>
          </header>
          <p>Update your password to keep your staff account secure.</p>
          <form
            onSubmit={e => {
              e.preventDefault()
              setPasswordOpen(false)
              alert('Password updated successfully (UI simulation).')
            }}
          >
            <div className="portal-field">
              <label htmlFor="current-pw">Current Password</label>
              <input id="current-pw" type="password" required placeholder="Enter current password" />
            </div>
            <div className="portal-field">
              <label htmlFor="new-pw">New Password</label>
              <input id="new-pw" type="password" required minLength={8} placeholder="Minimum 8 characters" />
            </div>
            <div className="portal-field">
              <label htmlFor="confirm-pw">Confirm New Password</label>
              <input id="confirm-pw" type="password" required minLength={8} placeholder="Re-enter new password" />
            </div>
            <div className="portal-actions">
              <button type="button" onClick={() => setPasswordOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Update Password
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Logout Confirmation Dialog */}
      {logoutOpen && (
        <dialog className="portal-dialog" open style={{ zIndex: 9999 }}>
          <header>
            <h2>Sign Out from Staff Portal?</h2>
            <button
              type="button"
              onClick={() => setLogoutOpen(false)}
              aria-label="Close dialog"
            >
              <FiX />
            </button>
          </header>
          <p>Are you sure you want to log out of your session, sirisha?</p>
          <div className="portal-actions">
            <button type="button" onClick={() => setLogoutOpen(false)}>
              Stay Signed In
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setLogoutOpen(false)
                navigate('/login')
              }}
            >
              Confirm Sign Out
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}
