import { useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { FiAlertCircle, FiBell, FiBookOpen, FiBriefcase, FiCheckSquare, FiChevronDown, FiChevronLeft, FiChevronRight, FiClock, FiGrid, FiLayers, FiLogOut, FiMenu, FiSearch, FiSettings, FiTag, FiUser, FiUsers, FiX } from 'react-icons/fi'
import { getAuthStorage, getUserRoleDisplayName, signOut } from '../../auth/auth.js'
import ThemeColorPicker from '../../components/ThemeColorPicker.jsx'
import './LibrarianPortal.css'

const groups = [
  { label: 'Book management', items: [['all-books', 'All Books', FiBookOpen], ['book-categories', 'Book Categories', FiTag], ['authors-publishers', 'Authors & Publishers', FiUsers], ['book-copies', 'Book Copies / Stock', FiLayers]] },
  { label: 'Circulation', items: [['issue-books', 'Issue Books', FiBookOpen], ['return-books', 'Return Books', FiCheckSquare], ['renew-books', 'Renew Books', FiClock], ['issued-books', 'Issued Books', FiBookOpen], ['reservations', 'Reservation Requests', FiClock]] },
  { label: 'Students & members', items: [['members', 'All Members', FiUsers], ['student-accounts', 'Student Library Accounts', FiUser], ['faculty-accounts', 'Faculty Library Accounts', FiBriefcase], ['member-history', 'Member History', FiClock]] },
  { label: 'Fine management', items: [['pending-fines', 'Pending Fines', FiAlertCircle], ['paid-fines', 'Paid Fines', FiCheckSquare], ['fine-rules', 'Fine Rules', FiSettings]] },
  { label: 'Inventory', items: [['inventory', 'Inventory Overview', FiLayers], ['damaged-books', 'Damaged Books', FiAlertCircle], ['lost-books', 'Lost Books', FiAlertCircle], ['stock-verification', 'Stock Verification', FiCheckSquare]] },
  { label: 'Reports & analytics', items: [['reports', 'Reports & Analytics', FiGrid], ['overdue-report', 'Overdue Books Report', FiAlertCircle], ['member-activity', 'Member Activity', FiUsers], ['most-borrowed', 'Most Borrowed Books', FiBookOpen]] },
  { label: 'Account', items: [['notifications', 'Notifications', FiBell], ['settings', 'Library Settings', FiSettings], ['profile', 'My Profile', FiUser]] },
]

export default function LibrarianPortalLayout({ children, title, basePath = '/faculty-portal' }) {
  const { screen = 'dashboard' } = useParams()
  const navigate = useNavigate()
  const currentGroup = groups.find(group => group.items.some(([key]) => key === screen) || (group.label === 'Book management' && screen === 'add-book'))?.label
  const navigationRef = useRef(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({ route: null, values: {} })
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pirnav-librarian-sidebar-collapsed') === 'true')
  const [query, setQuery] = useState('')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const name = getAuthStorage()?.getItem('btech-user-name') || 'Librarian'
  const roleLabel = getUserRoleDisplayName() || 'Librarian'
  const visibleGroups = groups.map(group => ({ ...group, items: group.items.filter(([, label]) => !query.trim() || label.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.items.length)
  const toggleCollapsed = () => setCollapsed(value => { localStorage.setItem('pirnav-librarian-sidebar-collapsed', String(!value)); return !value })
  const screenInGroup = group => group.items.some(([key]) => key === screen) || (group.label === 'Book management' && screen === 'add-book')
  const groupIsExpanded = group => Boolean(query.trim() || (expandedGroups.route === currentGroup ? expandedGroups.values[group.label] : screenInGroup(group)))
  const toggleGroup = group => setExpandedGroups({ route: currentGroup, values: { [group.label]: !groupIsExpanded(group) } })
  useLayoutEffect(() => {
    const navigation = navigationRef.current
    const activeLink = navigation?.querySelector('.sidebar-link.active')
    if (!navigation || !activeLink) return
    const navigationRect = navigation.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()
    if (linkRect.top < navigationRect.top) navigation.scrollTop -= navigationRect.top - linkRect.top
    else if (linkRect.bottom > navigationRect.bottom) navigation.scrollTop += linkRect.bottom - navigationRect.bottom
  }, [screen, expandedGroups])
  const href = screen => `${basePath}/${screen}`
  const finishLogout = () => { signOut(); sessionStorage.setItem('btech-logout-message', 'You have been signed out successfully.'); navigate('/login', { replace: true }) }
  return <div className={`dashboard-layout portal-shell librarian-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
    <button className={`sidebar-scrim ${mobileOpen ? 'is-visible' : ''}`} type="button" onClick={() => setMobileOpen(false)} aria-label="Close library navigation" tabIndex={mobileOpen ? 0 : -1} />
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Librarian navigation">
      <div className="sidebar-brand"><span className="sidebar-brand__mark"><FiBookOpen /></span><div className="sidebar-brand__copy"><strong>Digital Campus</strong><span className="sidebar-brand__subtitle">Library Management</span></div>
        <button type="button" className="sidebar-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button type="button" className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close library navigation"><FiX /></button>
      </div>
      <nav ref={navigationRef} className="sidebar-navigation librarian-navigation">
        <section className="librarian-nav-group librarian-nav-group--main" aria-label="Main menu">
          <p className="sidebar-section-label">Main menu</p>
          <NavLink to={href('dashboard')} end onClick={() => { setMobileOpen(false); setQuery('') }} title={collapsed ? 'Dashboard' : undefined} className={({ isActive }) => `sidebar-link sidebar-link--blue ${isActive || screen === 'dashboard' ? 'active' : ''}`}><FiGrid aria-hidden="true" /><span>Dashboard</span></NavLink>
        </section>
        {visibleGroups.map(group => <section className="librarian-nav-group" key={group.label}>
          <button type="button" className={`sidebar-section-label librarian-nav-toggle${screenInGroup(group) ? ' is-current' : ''}`} aria-expanded={groupIsExpanded(group)} aria-controls={`librarian-nav-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} onClick={() => toggleGroup(group)}>
            <span>{group.label}</span><FiChevronDown aria-hidden="true" />
          </button>
          <div className="librarian-nav-items" id={`librarian-nav-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} hidden={!groupIsExpanded(group)}>
            {group.items.map(([key, label, Icon]) => <NavLink key={key} to={href(key)} end onClick={() => { setMobileOpen(false); setQuery('') }} title={collapsed ? label : undefined} className={({ isActive }) => `sidebar-link sidebar-link--blue ${isActive || screen === key || (key === 'all-books' && screen === 'add-book') ? 'active' : ''}`}><Icon aria-hidden="true" /><span>{label}</span></NavLink>)}
          </div>
        </section>)}
        <button className="sidebar-link librarian-logout" type="button" onClick={() => setConfirmLogout(true)}><FiLogOut aria-hidden="true" /><span>Logout</span></button>
      </nav>
      {!collapsed && <div className="librarian-sidebar-card"><FiBookOpen aria-hidden="true" /><strong>Central Library</strong><span>Knowledge is Power</span></div>}
    </aside>
    <div className="portal-content"><header className="dashboard-header">
      <button className="header-sidebar-toggle portal-menu" type="button" aria-label="Open library navigation" onClick={() => setMobileOpen(true)}><FiMenu /></button>
      <div className="global-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search library screens" placeholder="Search library menu..." value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="dashboard-header__actions"><Link className="portal-notification-link" to={href('notifications')} aria-label="Notifications"><FiBell aria-hidden="true" /></Link><ThemeColorPicker />
        <details className="account-menu faculty-account-menu"><summary aria-label="Open librarian account menu"><span className="account-avatar faculty-account-avatar"><FiUser aria-hidden="true" /></span><span className="faculty-account-identity"><strong>{name}</strong><small>{roleLabel}</small></span><FiChevronDown className="faculty-account-chevron" aria-hidden="true" /></summary>
          <div className="account-menu__panel"><Link to={href('profile')}><FiUser aria-hidden="true" />My Profile</Link><button type="button" className="account-menu__signout" onClick={() => setConfirmLogout(true)}><FiLogOut aria-hidden="true" />Logout</button></div>
        </details>
      </div>
    </header>
      <div className="page-content portal-workspace"><nav className="app-breadcrumb" aria-label="Breadcrumb"><Link to={href('dashboard')}>Home</Link><span aria-hidden="true">/</span><span>Library Management</span><span aria-hidden="true">/</span><strong>{title}</strong></nav>{children}</div>
    </div>
    {confirmLogout && <div className="librarian-confirm-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setConfirmLogout(false) }}><section className="librarian-confirm" role="alertdialog" aria-modal="true" aria-labelledby="librarian-logout-title"><h2 id="librarian-logout-title">Sign out of the library portal?</h2><p>You can sign in again to continue managing library operations.</p><div><button type="button" onClick={() => setConfirmLogout(false)}>Cancel</button><button type="button" className="is-primary" onClick={finishLogout}>Sign out</button></div></section></div>}
  </div>
}
