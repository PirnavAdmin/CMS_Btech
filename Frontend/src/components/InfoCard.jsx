import './InfoCard.css'

const isCleanValue = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === '—' || trimmed === '-' || trimmed.toLowerCase() === 'not provided' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return false
    }
    return true
  }
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

const isStatusLabel = (label = '') => /status|state|eligibility/i.test(String(label))

function DetailsValue({ label, value }) {
  if (isStatusLabel(label)) {
    const statusClass = String(value).trim().toLowerCase().replace(/\s+/g, '-')
    return <span className={`details-status-badge ${statusClass}`}>{value}</span>
  }
  return value
}

export default function InfoCard({
  icon: Icon,
  title,
  rows = [],
  items = [],
  children,
  className = '',
}) {
  const combinedRows = rows.length > 0 ? rows : items
  const visibleRows = combinedRows.filter((item) => {
    if (!item) return false
    if (Array.isArray(item)) {
      return isCleanValue(item[1])
    }
    return isCleanValue(item.value)
  })

  if (!visibleRows.length && !children) {
    return null
  }

  return (
    <section className={`cm-info-card erp-view-section ${className}`}>
      {(Icon || title) && (
        <div className="cm-info-card-header">
          {Icon && <Icon aria-hidden="true" />}
          {title && <h2>{title}</h2>}
        </div>
      )}

      {visibleRows.length > 0 && (
        <div className="cm-info-rows erp-view-grid">
          {visibleRows.map((item, idx) => {
            const label = Array.isArray(item) ? item[0] : item.label
            const value = Array.isArray(item) ? item[1] : item.value
            return (
              <div className="cm-info-row erp-view-field" key={label || idx}>
                <span className="cm-info-label erp-view-label">{label}</span>
                <span className="cm-info-val erp-view-value"><DetailsValue label={label} value={value} /></span>
              </div>
            )
          })}
        </div>
      )}

      {children}
    </section>
  )
}
