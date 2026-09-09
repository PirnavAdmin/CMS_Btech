import { Link } from 'react-router-dom'
import CompactSummary from './CompactSummary'
import './PageHeader.css'

export default function PageHeader({
  breadcrumb,
  title,
  subtitle,
  compactSummary,
  children,
  className = '',
}) {
  const renderBreadcrumb = () => {
    if (!breadcrumb) return null
    if (typeof breadcrumb === 'string') return breadcrumb
    if (Array.isArray(breadcrumb)) {
      return breadcrumb.map((item, index) => {
        const isLast = index === breadcrumb.length - 1
        const label = typeof item === 'string' ? item : item.label
        const link = typeof item === 'object' ? item.link : null

        return (
          <span key={index} className="erp-page-header__breadcrumb-item">
            {index > 0 && <span className="erp-page-header__breadcrumb-sep"> / </span>}
            {link && !isLast ? (
              <Link to={link}>{label}</Link>
            ) : (
              <span>{label}</span>
            )}
          </span>
        )
      })
    }
    return breadcrumb
  }

  return (
    <header className={`erp-page-header ${className}`}>
      <div className="erp-page-header__left">
        {breadcrumb && <div className="erp-page-header__breadcrumb">{renderBreadcrumb()}</div>}
        <h1 className="erp-page-header__title">{title}</h1>
        {subtitle && <p className="erp-page-header__subtitle">{subtitle}</p>}
      </div>

      <div className="erp-page-header__right">
        {Array.isArray(compactSummary) ? (
          <CompactSummary items={compactSummary} />
        ) : (
          compactSummary
        )}
        {children && <div className="erp-page-header__actions">{children}</div>}
      </div>
    </header>
  )
}
