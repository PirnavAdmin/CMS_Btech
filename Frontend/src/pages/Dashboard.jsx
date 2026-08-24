import { Link } from 'react-router-dom'
import { FiArrowRight, FiBookOpen, FiCalendar, FiGitBranch, FiGrid, FiHome, FiLayers, FiSettings, FiUser, FiUsers } from 'react-icons/fi'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'
import DashboardLayout from '../layouts/DashboardLayout'

const adminLinks = [
  { to: '/college-institution-management', label: 'College / institution', icon: FiHome },
  { to: '/academic-year-management', label: 'Academic years', icon: FiCalendar },
  { to: '/department-management', label: 'Departments', icon: FiGrid },
  { to: '/semester-management', label: 'Semesters', icon: FiLayers },
  { to: '/courses', label: 'Courses', icon: FiBookOpen },
  { to: '/branches', label: 'Branches', icon: FiGitBranch },
  { to: '/section-management', label: 'Sections', icon: FiUsers },
]

export default function Dashboard() {
  const role = getUserRole()
  const links = role === ROLES.ADMIN ? adminLinks : [{ to: '/my-subjects', label: 'My subjects', icon: FiBookOpen }]

  return <DashboardLayout><div className="erp-page dashboard-home">
    <header className="erp-page-heading"><div><p className="erp-eyebrow">Digital campus</p><h1>Welcome to Pirnav Engineering College</h1><p>Access the academic tools available for your role from one clear workspace.</p></div></header>
    <section className="erp-panel" aria-labelledby="quick-access-title"><div className="erp-panel-heading"><div><p className="erp-eyebrow">Workspace</p><h2 id="quick-access-title">Quick access</h2></div></div><div className="erp-link-grid">
      {links.map(({ to, label, icon: Icon }) => <Link className="erp-link-card" to={to} key={to}><span className="erp-link-card__icon"><Icon aria-hidden="true" /></span><span><strong>{label}</strong><small>Open module</small></span><FiArrowRight aria-hidden="true" /></Link>)}
      <Link className="erp-link-card" to="/my-profile"><span className="erp-link-card__icon"><FiUser aria-hidden="true" /></span><span><strong>My profile</strong><small>Review personal details</small></span><FiArrowRight aria-hidden="true" /></Link>
      <Link className="erp-link-card" to="/settings"><span className="erp-link-card__icon"><FiSettings aria-hidden="true" /></span><span><strong>Settings</strong><small>Manage preferences</small></span><FiArrowRight aria-hidden="true" /></Link>
    </div></section>
  </div></DashboardLayout>
}
