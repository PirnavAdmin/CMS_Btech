import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import './DeactivationBlockedDialog.css'

export const showDeactivationBlocked = (message) => {
  window.dispatchEvent(new CustomEvent('btech:deactivation-blocked', { detail: { message } }))
}

export default function DeactivationBlockedDialog() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const open = event => setMessage(event.detail?.message || 'This item cannot be deactivated while students are associated with it.')
    window.addEventListener('btech:deactivation-blocked', open)
    return () => window.removeEventListener('btech:deactivation-blocked', open)
  }, [])

  if (!message) return null
  const count = message.match(/(\d+)\s+students?\b/i)?.[1] || 'Associated'
  const name = message.match(/cannot deactivate\s+(.+?)\./i)?.[1] || 'This item'
  const entity = message.match(/this\s+(college|department|course|branch|academic year|semester|section)/i)?.[1] || 'item'
  const entityLabel = entity.replace(/\b\w/g, letter => letter.toUpperCase())
  return <div className="deactivation-blocked-backdrop" onMouseDown={event => event.target === event.currentTarget && setMessage('')}>
    <section className="deactivation-blocked-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivation-blocked-title">
      <button type="button" className="deactivation-blocked-close" aria-label="Close dialog" onClick={() => setMessage('')}><FiX /></button>
      <span className="deactivation-blocked-icon"><FiAlertTriangle /></span>
      <h2 id="deactivation-blocked-title">{entityLabel} cannot be deactivated</h2>
      <p><strong>{name}</strong> has associated student records.</p>
      <dl className="deactivation-blocked-count"><div><dt>Associated Students</dt><dd>{count} student{count === '1' ? '' : 's'}</dd></div></dl>
      <p className="deactivation-blocked-help">Deactivate is unavailable until all associated students are moved or removed from this {entity}.</p>
      <button type="button" className="deactivation-blocked-button" onClick={() => setMessage('')}>Close</button>
    </section>
  </div>
}
