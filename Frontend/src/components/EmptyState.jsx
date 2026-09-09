import { FiInbox } from 'react-icons/fi'
import './EmptyState.css'

export default function EmptyState({
  icon: Icon = FiInbox,
  title = 'No records found',
  message,
  action,
  className = '',
}) {
  return (
    <div className={`erp-empty-state ${className}`}>
      <div className="erp-empty-state__icon" aria-hidden="true">
        <Icon />
      </div>
      <h3 className="erp-empty-state__title">{title}</h3>
      {message && <p className="erp-empty-state__message">{message}</p>}
      {action && <div className="erp-empty-state__action">{action}</div>}
    </div>
  )
}
