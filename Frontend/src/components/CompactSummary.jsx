import './CompactSummary.css'

export default function CompactSummary({ items = [], label = 'Summary' }) {
  return (
    <div className="compact-summary" aria-label={label}>
      {items.map((item) => (
        <div key={item.label} className={`compact-summary__item compact-summary__item--${item.tone || 'default'}`}>
          <strong>{item.value ?? '\u2014'}</strong>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  )
}
