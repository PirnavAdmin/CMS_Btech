import { Link } from 'react-router-dom'
import ModuleIcon from '../../config/ModuleIcon.jsx'

export default function SidebarItem({ entry, active, onNavigate }) {
  return <Link to={entry.path} onClick={onNavigate} title={entry.label} aria-current={active ? 'page' : false}
    className={`sidebar-link sidebar-link--blue ${active ? 'active' : ''}`}>
    <ModuleIcon icon={entry.icon} /><span>{entry.label}</span>
  </Link>
}
