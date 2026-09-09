import './StatusBadge.css'

const normalizeStatusKey = (value) => {
  if (value === null || value === undefined) return 'unknown'
  const str = String(value).trim().toLowerCase().replace(/[_\s-]+/g, '-')
  if (['1', 'true', 'active', 'admitted', 'success', 'successful', 'eligible'].includes(str)) return 'active'
  if (['0', 'false', 'inactive', 'deactive', 'archived', 'ineligible'].includes(str)) return 'inactive'
  if (['upcoming'].includes(str)) return 'upcoming'
  if (['completed'].includes(str)) return 'completed'
  if (['pending', 'submitted', 'under-review', 'application-submitted'].includes(str)) return 'pending'
  if (['approved', 'verified'].includes(str)) return 'approved'
  if (['rejected', 'failed', 'expired', 'shortage'].includes(str)) return 'rejected'
  if (['draft'].includes(str)) return 'draft'
  if (['correction-required'].includes(str)) return 'correction-required'
  return str
}

export default function StatusBadge({
  value,
  children,
  tone,
  className = '',
}) {
  const displayVal = children ?? value ?? ''
  if (!displayVal && displayVal !== 0) return null

  const key = tone ? String(tone).toLowerCase() : normalizeStatusKey(displayVal)
  const label = typeof displayVal === 'boolean'
    ? (displayVal ? 'Active' : 'Inactive')
    : String(displayVal)

  return (
    <span className={`erp-status-badge erp-status-badge--${key} ${className}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  )
}
