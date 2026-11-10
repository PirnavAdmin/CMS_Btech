import { Link } from 'react-router-dom'

export default function FeeWorkspaceTabs({ tabs = [] }) {
  return (
    <nav className="fm-workspace-tabs fm-fee-workspace-nav" role="tablist" aria-label="Fee management sections">
      {tabs.map(tab => (
        <Link key={tab.to} to={tab.to} role="tab" aria-selected={tab.active} className={`fm-workspace-tab ${tab.active ? 'is-active' : ''}`}>
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
