import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import './DeactivationBlockedDialog.css'

export const showDeactivationBlocked = (message, details = {}) => {
  const payload = typeof message === 'object' && message !== null
    ? message
    : { message, ...details }
  window.dispatchEvent(new CustomEvent('btech:deactivation-blocked', { detail: payload }))
}

export default function DeactivationBlockedDialog() {
  const [details, setDetails] = useState(null)

  useEffect(() => {
    const open = event => setDetails({
      message: event.detail?.message || 'This item cannot be deactivated while students are associated with it.',
      count: event.detail?.count,
      name: event.detail?.name,
      entity: event.detail?.entity,
    })
    window.addEventListener('btech:deactivation-blocked', open)
    return () => window.removeEventListener('btech:deactivation-blocked', open)
  }, [])

  if (!details) return null
  const { message } = details
  const parsedCount = Number(message.match(/(\d+)\s+students?\b/i)?.[1])
  const count = Number.isFinite(Number(details.count)) ? Number(details.count) : Number.isFinite(parsedCount) ? parsedCount : undefined
  const name = details.name || message.match(/cannot deactivate\s+(.+?)\./i)?.[1] || 'This item'
  const entity = details.entity || message.match(/this\s+(college|department|course|branch|academic year|semester|section)/i)?.[1] || 'item'
  const entityLabel = entity.replace(/\b\w/g, letter => letter.toUpperCase())
  const close = () => setDetails(null)
  return <div className="deactivation-blocked-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="deactivation-blocked-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivation-blocked-title">
      <button type="button" className="deactivation-blocked-close" aria-label="Close dialog" onClick={close}><FiX /></button>
      <span className="deactivation-blocked-icon"><FiAlertTriangle /></span>
      <h2 id="deactivation-blocked-title">{entityLabel} cannot be deactivated</h2>
      <p><strong>{name}</strong> has associated student records.</p>
      <dl className="deactivation-blocked-count"><div><dt>Associated Students</dt><dd>{count === undefined ? 'Associated students' : `${count} student${count === 1 ? '' : 's'}`}</dd></div></dl>
      <p className="deactivation-blocked-help">Deactivate is unavailable until all associated students are moved or removed from this {entity}.</p>
      <button type="button" className="deactivation-blocked-button" onClick={close}>Close</button>
    </section>
  </div>
}
