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

export default function InfoCard({
  icon: Icon,
  title,
  rows = [],
  children,
  className = '',
}) {
  const visibleRows = rows.filter((item) => {
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
    <section className={`cm-info-card ${className}`}>
      {(Icon || title) && (
        <div className="cm-info-card-header">
          {Icon && <Icon aria-hidden="true" />}
          {title && <h2>{title}</h2>}
        </div>
      )}

      {visibleRows.length > 0 && (
        <div className="cm-info-rows">
          {visibleRows.map((item, idx) => {
            const label = Array.isArray(item) ? item[0] : item.label
            const value = Array.isArray(item) ? item[1] : item.value
            return (
              <div className="cm-info-row" key={label || idx}>
                <span className="cm-info-label">{label}</span>
                <span className="cm-info-val">{value}</span>
              </div>
            )
          })}
        </div>
      )}

      {children}
    </section>
  )
}
