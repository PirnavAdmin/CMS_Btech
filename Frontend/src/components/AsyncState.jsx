import EmptyState from './EmptyState'
import './ScreenComponents.css'

// Callers decide authorization and supply safe API messages; this component
// never infers permissions, creates data or retries automatically.
export default function AsyncState({ status, title, message, onRetry, action, className = '' }) {
  if (status === 'empty') return <EmptyState title={title || 'No records found'} message={message} action={action} className={className} />
  if (!['loading', 'error', 'unauthorized'].includes(status)) return null
  const loading = status === 'loading'
  return <div className={`erp-async-state ${className}`} role={loading ? 'status' : 'alert'} aria-busy={loading || undefined}>
    <p>{title || (loading ? 'Loading records...' : status === 'unauthorized' ? 'Access unavailable' : 'Records could not be loaded.')}</p>
    {message && <p>{message}</p>}
    {status === 'error' && onRetry && <button type="button" className="erp-btn erp-btn--secondary" onClick={onRetry}>Retry</button>}
    {action}
  </div>
}
