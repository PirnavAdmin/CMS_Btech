import { Fragment } from 'react'
import SidebarGroup from './SidebarGroup.jsx'
import SidebarItem from './SidebarItem.jsx'

export default function SidebarNavigation({ groups, activeId, pathname, collapsed, onToggleCollapse, onNavigate }) {
  return groups.map(section => <Fragment key={section.id}>
    <p className="sidebar-section-label">{section.label}</p>
    {section.items.map(entry => entry.children.length ?
      <SidebarGroup key={entry.id} entry={entry} active={entry.id === activeId} pathname={pathname} collapsed={collapsed} onToggleCollapse={onToggleCollapse} onNavigate={onNavigate} /> :
      <SidebarItem key={entry.id} entry={entry} active={entry.id === activeId} onNavigate={onNavigate} />)}
  </Fragment>)
}
