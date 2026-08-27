import './StatusConfirmDialog.css'

export default function StatusConfirmDialog({ entity, name, nextStatus, onCancel, onConfirm, busy = false }) {
  const activate = String(nextStatus).toLowerCase() === 'active'
  const action = activate ? 'Activate' : 'Deactivate'
  return <div className="status-confirm-backdrop" onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}>
    <section className="status-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="status-confirm-title" aria-describedby="status-confirm-description">
      <i aria-hidden="true">!</i>
      <h2 id="status-confirm-title">{action} {entity}?</h2>
      <p id="status-confirm-description">Are you sure you want to {action.toLowerCase()} <strong>{name}</strong>?</p>
      <footer>
        <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={activate ? 'confirm-active' : 'confirm-inactive'} onClick={onConfirm} disabled={busy}>{busy ? 'Updating...' : action}</button>
      </footer>
    </section>
  </div>
}
