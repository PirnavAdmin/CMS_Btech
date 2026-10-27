import { FiInbox } from 'react-icons/fi'
import './FacultyComponents.css'

export default function FacultyEmptyState({
  icon: Icon = FiInbox,
  title = 'No records found',
  description = 'There are currently no items to display for the selected criteria.',
  actionLabel,
  onAction,
  actionLink,
  className = '',
}) {
  return (
    <div className={`faculty-empty-state ${className}`}>
      <div className="faculty-empty-icon-wrap" aria-hidden="true">
        <Icon className="faculty-empty-icon" />
      </div>
      <h3 className="faculty-empty-title">{title}</h3>
      <p className="faculty-empty-description">{description}</p>
      {actionLabel && (
        <div className="faculty-empty-action">
          {actionLink ? (
            <a href={actionLink} className="faculty-btn-secondary">{actionLabel}</a>
          ) : (
            <button type="button" onClick={onAction} className="faculty-btn-secondary">
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
