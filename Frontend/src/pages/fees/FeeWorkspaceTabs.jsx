import { Link } from 'react-router-dom'

export default function FeeWorkspaceTabs({ tabs = [] }) {
  return (
    <nav className="fm-workspace-tabs fm-fee-workspace-nav" role="tablist" aria-label="Fee management sections">
      {tabs.map(({ to, label, active, icon: Icon }) => (
        <Link key={to} to={to} role="tab" aria-selected={active} className={`fm-workspace-tab ${active ? 'is-active' : ''}`}>
          {Icon && <Icon aria-hidden="true" />}
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
