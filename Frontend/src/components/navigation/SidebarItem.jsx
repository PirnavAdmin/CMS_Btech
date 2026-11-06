import { Link } from 'react-router-dom'
import NavigationIcon from '../../config/NavigationIcon.jsx'

export default function SidebarItem({ entry, active, onNavigate }) {
  if (entry.unavailable) return <span className="sidebar-link" aria-disabled="true" title="The certificate workflow requires a verified B-Tech API contract."><NavigationIcon moduleId={entry.id} icon={entry.icon} /><span>{entry.label} · Unavailable</span></span>
  return <Link to={entry.path} onClick={onNavigate} title={entry.label} aria-current={active ? 'page' : false}
    className={`sidebar-link sidebar-link--blue ${active ? 'active' : ''}`}>
    <NavigationIcon moduleId={entry.id} icon={entry.icon} /><span>{entry.label}</span>
  </Link>
}
