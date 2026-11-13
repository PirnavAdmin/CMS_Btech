import { ArrowLeft, ArrowRight, Banknote, BookOpen, FileText, GraduationCap, Hash, Landmark, LockKeyhole, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import './NumberSeriesSettings.css'

const configurationCards = [
  { id: 'college', title: 'College Configuration', description: 'Manage college details, affiliation, contact information, branding and status.', icon: Landmark, path: '/college-institution-management' },
  { id: 'academic-year', title: 'Academic Year Configuration', description: 'Manage academic year dates and activation for the selected college.', icon: GraduationCap, path: '/academic-year-management' },
  { id: 'number-series', title: 'ID & Number Series', description: 'Manage configurable ID formats, prefixes, sequence lengths, and starting numbers for institutional records.', icon: Hash, path: '/settings/number-series' },
  { id: 'roles', title: 'Roles & Permissions', description: 'Manage system roles and the permissions assigned to each role.', icon: Users, path: '/roles-permissions' },
  { id: 'login', title: 'Login Page Configuration', description: 'Login page configuration is not connected to an administrator settings screen.', icon: LockKeyhole },
  { id: 'landing', title: 'Landing Page Configuration', description: 'Landing page configuration is not connected to an administrator settings screen.', icon: BookOpen },
  { id: 'templates', title: 'Document Templates', description: 'Document template management is not connected to an administrator settings screen.', icon: FileText },
  { id: 'payments', title: 'Payment Settings', description: 'Payment gateway and bank account settings are not connected to an administrator settings screen.', icon: Banknote },
]

function Breadcrumbs({ current }) {
  return <nav className="ns-breadcrumbs" aria-label="Breadcrumb">
    <Link to="/settings">Global Settings</Link><span aria-hidden="true">/</span>
    {current === 'Settings Configuration' ? <span aria-current="page">{current}</span> : <><Link to="/settings/configuration">Settings Configuration</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></>}
  </nav>
}

export function SettingsConfiguration() {
  const { canView } = useScreenAccess()
  return <DashboardLayout><main className="configuration-workspace ns-workspace">
    <Breadcrumbs current="Settings Configuration" />
    <PageHeader title="Settings Configuration" subtitle="Manage college, academic, and institutional settings." />
    <div className="ns-configuration-grid">
      {configurationCards.map(({ id, title, description, icon: Icon, path }) => {
        const allowed = path && canView(path)
        return <section className="ns-configuration-card" key={id} aria-labelledby={`ns-card-${id}`}>
          <header><Icon aria-hidden="true" /><h2 id={`ns-card-${id}`}>{title}</h2></header>
          <p>{description}</p>
          <footer>{allowed
            ? <Link className="erp-btn erp-btn--primary" to={path}>{id === 'number-series' ? 'Manage Number Series' : title.startsWith('Academic') ? 'Manage Academic Years' : id === 'roles' ? 'Manage Roles' : 'Configure Colleges'} <ArrowRight aria-hidden="true" /></Link>
            : <><button className="erp-btn erp-btn--secondary" type="button" disabled>{path ? 'Access unavailable' : 'Not connected'}</button><small>{path ? 'Your current permissions do not allow access to this screen.' : 'No supported settings API or screen is available.'}</small></>}
          </footer>
        </section>
      })}
    </div>
    <Link className="erp-btn erp-btn--secondary ns-back-link" to="/settings"><ArrowLeft aria-hidden="true" /> Back to Global Settings</Link>
  </main></DashboardLayout>
}

