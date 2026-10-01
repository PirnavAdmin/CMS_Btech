import { FiInbox } from 'react-icons/fi'
import './EmptyState.css'

export default function EmptyState({
  icon: Icon = FiInbox,
  title = 'No records found',
  message,
  description,
  subtitle,
  action,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`erp-empty-state ${className}`}>
      <div className="erp-empty-state__icon" aria-hidden="true">
        <Icon />
      </div>
      <h3 className="erp-empty-state__title">{title}</h3>
      {(message || description || subtitle) && <p className="erp-empty-state__message">{message || description || subtitle}</p>}
      {(action || actionLabel) && <div className="erp-empty-state__action">
        {onAction ? <button type="button" className="erp-btn erp-btn--primary" onClick={onAction}>{actionLabel || action}</button> : action}
      </div>}
    </div>
  )
}
