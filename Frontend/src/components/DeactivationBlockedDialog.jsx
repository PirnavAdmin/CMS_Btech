import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import './DeactivationBlockedDialog.css'

export const showDeactivationBlocked = (message) => {
  window.dispatchEvent(new CustomEvent('btech:deactivation-blocked', { detail: { message } }))
}

export default function DeactivationBlockedDialog() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const open = (event) => setMessage(event.detail?.message || 'This item cannot be deactivated while students are associated with it.')
    window.addEventListener('btech:deactivation-blocked', open)
    return () => window.removeEventListener('btech:deactivation-blocked', open)
  }, [])

  if (!message) return null
  const count = message.match(/(\d+)\s+students?\b/i)?.[1]
  return <div className="deactivation-blocked-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setMessage('')}>
    <section className="deactivation-blocked-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivation-blocked-title">
      <button type="button" className="deactivation-blocked-close" aria-label="Close" onClick={() => setMessage('')}><FiX /></button>
      <span className="deactivation-blocked-icon"><FiAlertTriangle /></span>
      <h2 id="deactivation-blocked-title">Deactivation not possible</h2>
      <p>{message}</p>
      {count && <div className="deactivation-blocked-count"><strong>{count}</strong><span>Associated student{count === '1' ? '' : 's'}</span></div>}
      <button type="button" className="deactivation-blocked-button" onClick={() => setMessage('')}>Okay</button>
    </section>
  </div>
}
