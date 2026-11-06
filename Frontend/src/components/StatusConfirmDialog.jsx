import './StatusConfirmDialog.css'
import { useEffect, useRef } from 'react'

export default function StatusConfirmDialog({ entity, name, nextStatus, onCancel, onConfirm, busy = false, blocked = false, description = '', error = '', details = [], confirmLabel = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  const activate = String(nextStatus).toLowerCase() === 'active'
  const action = activate ? 'Activate' : 'Deactivate'
  return <dialog ref={ref} className="status-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="status-confirm-title" aria-describedby="status-confirm-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}>
      <button type="button" className="status-confirm-close" aria-label="Close dialog" onClick={onCancel} disabled={busy}>×</button>
      <i aria-hidden="true">!</i>
      <h2 id="status-confirm-title">{blocked ? `${entity} cannot be deactivated` : `${action} ${entity}?`}</h2>
      <p id="status-confirm-description">{blocked ? <><strong>{name}</strong> has associated student records.</> : <>Are you sure you want to {action.toLowerCase()} <strong>{name}</strong>?</>}</p>
      {details.length > 0 && <dl className="status-confirm-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      {description && <p>{description}</p>}
      {error && <p role="alert">{error}</p>}
      <footer>
        <button type="button" onClick={onCancel} disabled={busy}>{blocked ? 'Close' : 'Cancel'}</button>
        {!blocked && <button type="button" className={activate ? 'confirm-active' : 'confirm-inactive'} onClick={onConfirm} disabled={busy}>{busy ? 'Updating...' : confirmLabel || action}</button>}
      </footer>
  </dialog>
}
