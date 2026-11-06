import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import NavigationIcon from '../../config/NavigationIcon.jsx'
import { activeSidebarChild } from '../../config/sidebarNavigation.js'
import SidebarItem from './SidebarItem.jsx'

export default function SidebarGroup({ entry, active, pathname, collapsed, onToggleCollapse, onNavigate }) {
  const [manual, setManual] = useState({ pathname, open: active })
  // Reset a manual close on each navigation, including browser back to a path
  // previously closed by the user. Preserve other manually opened groups.
  if (manual.pathname !== pathname) setManual({ pathname, open: active || manual.open })
  const expanded = manual.pathname === pathname ? manual.open : active || manual.open
  const childId = activeSidebarChild(entry, pathname)
  const id = entry.disclosureId || `${entry.id}-links`
  return <>
    <button type="button" className={`sidebar-link sidebar-link--blue sidebar-disclosure ${entry.sidebarClass || ''} ${active ? 'is-module-active' : ''}`}
      title={entry.label} aria-label={entry.label} aria-expanded={!collapsed && expanded} aria-controls={!collapsed && expanded ? id : undefined}
      onClick={() => { if (collapsed) onToggleCollapse(); setManual({ pathname, open: collapsed ? true : !expanded }) }}>
      <NavigationIcon moduleId={entry.id} icon={entry.icon} /><span>{entry.label}</span><FiChevronDown className="sidebar-disclosure__chevron" aria-hidden="true" />
    </button>
    {!collapsed && expanded && <div className={`sidebar-submenu ${entry.submenuClass || ''}`} id={id}>
      {entry.children.map(child => <SidebarItem key={child.id} entry={child} active={active && child.id === childId} onNavigate={onNavigate} />)}
    </div>}
  </>
}
