import { Link } from 'react-router-dom'
import EmptyState from './EmptyState'

export default function DirectoryEmptyState({ title, actionLabel, to, onAction }) {
  return <EmptyState
    title={title}
    action={to
      ? <Link className="erp-btn erp-btn--primary" to={to}>{actionLabel}</Link>
      : <button type="button" className="erp-btn erp-btn--primary" onClick={onAction}>{actionLabel}</button>}
  />
}
