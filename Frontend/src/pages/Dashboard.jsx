import { Link } from 'react-router-dom'
import { FiArrowRight, FiBookOpen, FiCalendar, FiGitBranch, FiGrid, FiHome, FiLayers, FiSettings, FiUser, FiUsers } from 'react-icons/fi'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'
import DashboardLayout from '../layouts/DashboardLayout'
import { getBranches, getCourses, getDepartments } from './courseManagement/Course'
import './Dashboard.css'

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
  const departments = role === ROLES.ADMIN ? getDepartments() : []
  const courses = role === ROLES.ADMIN ? getCourses() : []
  const branches = role === ROLES.ADMIN ? getBranches() : []
  const activeBranches = branches.filter((branch) => branch.status === 'Active').length
  const activeCourses = courses.filter((course) => course.status === 'Active').length
  const roleName = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'User'

  return <DashboardLayout><div className="erp-page dashboard-home">
    <header className="erp-page-heading dashboard-hero"><div><p className="erp-eyebrow">Institution overview</p><h1>Good day, {roleName}</h1><p>Keep your academic operations moving from one connected workspace.</p></div><div className="dashboard-hero-mark"><FiHome aria-hidden="true" /><span>Pirnav Engineering College</span></div></header>
    {role === ROLES.ADMIN && <section className="dashboard-kpis" aria-label="Academic overview"><article><span className="dashboard-kpi-icon"><FiHome /></span><div><small>Departments</small><strong>{departments.length}</strong><em>Configured units</em></div></article><article><span className="dashboard-kpi-icon"><FiBookOpen /></span><div><small>Active courses</small><strong>{activeCourses}</strong><em>{courses.length} total programmes</em></div></article><article><span className="dashboard-kpi-icon"><FiGitBranch /></span><div><small>Active branches</small><strong>{activeBranches}</strong><em>{branches.length} total branches</em></div></article><article><span className="dashboard-kpi-icon"><FiUsers /></span><div><small>Academic coverage</small><strong>{new Set(branches.map((branch) => String(branch.departmentId))).size}</strong><em>Departments with branches</em></div></article></section>}
    <section className="dashboard-workspace" aria-labelledby="quick-access-title"><div className="erp-panel dashboard-actions"><div className="erp-panel-heading"><div><p className="erp-eyebrow">Workspace</p><h2 id="quick-access-title">Quick access</h2></div><span className="dashboard-panel-note">{links.length} modules available</span></div><div className="erp-link-grid">
      {links.map(({ to, label, icon: Icon }) => <Link className="erp-link-card" to={to} key={to}><span className="erp-link-card__icon"><Icon aria-hidden="true" /></span><span><strong>{label}</strong><small>Open module</small></span><FiArrowRight aria-hidden="true" /></Link>)}
      <Link className="erp-link-card" to="/my-profile"><span className="erp-link-card__icon"><FiUser aria-hidden="true" /></span><span><strong>My profile</strong><small>Review personal details</small></span><FiArrowRight aria-hidden="true" /></Link>
      <Link className="erp-link-card" to="/settings"><span className="erp-link-card__icon"><FiSettings aria-hidden="true" /></span><span><strong>Settings</strong><small>Manage preferences</small></span><FiArrowRight aria-hidden="true" /></Link>
    </div></div><aside className="dashboard-side-panel"><p className="erp-eyebrow">Academic flow</p><h2>From setup to delivery</h2><p>Keep the academic hierarchy connected as your institution grows.</p><div className="dashboard-flow"><span>Department</span><FiArrowRight /><span>Course</span><FiArrowRight /><span>Branch</span><FiArrowRight /><span>Sections</span></div><Link className="dashboard-outline-link" to={role === ROLES.ADMIN ? '/branches' : '/my-subjects'}>{role === ROLES.ADMIN ? 'Review branches' : 'Open my subjects'} <FiArrowRight /></Link></aside></section>
  </div></DashboardLayout>
}
