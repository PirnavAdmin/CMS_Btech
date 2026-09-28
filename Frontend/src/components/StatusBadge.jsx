import './StatusBadge.css'

const normalizeStatusKey = (val) => {
  if (val === null || val === undefined) return 'unknown'
  const str = String(val).trim().toLowerCase().replace(/[_\s-]+/g, '-')
  if (['1', 'true', 'active', 'admitted', 'success', 'successful', 'eligible', 'working', 'permanent', 'regular', 'confirmed', 'available', 'present', 'passed', 'pass', 'open', 'enabled'].includes(str)) return 'active'
  if (['paid'].includes(str)) return 'paid'
  if (['0', 'false', 'inactive', 'deactive', 'archived', 'ineligible', 'resigned', 'relieved', 'terminated', 'retired', 'unpaid', 'unavailable', 'rejected', 'failed', 'fail', 'expired', 'shortage', 'suspended', 'absent', 'closed', 'disabled'].includes(str)) return 'inactive'
  if (['warning', 'upcoming', 'probation', 'on-probation', 'notice-period', 'contract'].includes(str)) return 'warning'
  if (['hold', 'on-hold'].includes(str)) return 'hold'
  if (['processed', 'processing', 'completed', 'transferred'].includes(str)) return 'processed'
  if (['pending', 'submitted', 'under-review', 'application-submitted', 'partial', 'in-progress'].includes(str)) return 'pending'
  if (['approved', 'verified'].includes(str)) return 'approved'
  if (['on-leave', 'leave'].includes(str)) return 'on-leave'
  if (['draft'].includes(str)) return 'draft'
  if (['correction-required'].includes(str)) return 'correction-required'
  return str
}

export default function StatusBadge({
  value,
  status,
  children,
  tone,
  className = '',
}) {
  const displayVal = children ?? value ?? status ?? ''
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
