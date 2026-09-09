import { isRenderableDetailValue } from '../utils/detailValues'

export function DetailsField({ label, value, className = '' }) {
  if (!isRenderableDetailValue(value)) return null
  return <div className={`erp-view-field ${className}`.trim()}><span className="erp-view-label">{label}</span><strong className="erp-view-value">{value}</strong></div>
}

export function DetailsGrid({ children, className = '' }) {
  const fields = Array.isArray(children) ? children.filter(Boolean) : children
  if (!fields) return null
  return <div className={`erp-view-grid ${className}`.trim()}>{fields}</div>
}

export function DetailsSection({ icon: Icon, title, description, children, className = '' }) {
  if (!children) return null
  return <section className={`erp-view-section ${className}`.trim()}><header className="erp-view-section-header">{Icon && <Icon aria-hidden="true" />}<div><h2>{title}</h2>{description && <p>{description}</p>}</div></header>{children}</section>
}

export function EntityDetailsPage({ children, className = '' }) {
  return <main className={`erp-view ${className}`.trim()}>{children}</main>
}

export function EntityHero({ avatar, title, meta, status, actions, children }) {
  return <section className="erp-view-hero"><div className="erp-view-avatar">{avatar}</div><div className="erp-view-identity"><h1>{title}</h1>{meta && <p>{meta}</p>}{children}</div>{(status || actions) && <div className="erp-view-hero-side">{status && <span className="erp-view-status">{status}</span>}{actions && <div className="erp-view-actions">{actions}</div>}</div>}</section>
}

export function EntityTabs({ children }) {
  return <nav className="erp-view-tabs" aria-label="Details sections">{children}</nav>
}
