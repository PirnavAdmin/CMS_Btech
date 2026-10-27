import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiLogOut } from 'react-icons/fi'
import './FacultySignOutDialog.css'

export default function FacultySignOutDialog({ onClose, onConfirm }) {
  const dialog = useRef(null), stay = useRef(null), id = useId()
  useEffect(() => {
    const previous = document.activeElement
    dialog.current.showModal()
    stay.current?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<dialog ref={dialog} className="faculty-signout-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose() } }}>
    <div className="faculty-signout-icon" aria-hidden="true"><FiLogOut /></div>
    <p className="faculty-signout-eyebrow">Account access</p>
    <h2 id={`${id}-title`}>Sign out of your account?</h2>
    <p id={`${id}-description`}>You’ll need to sign in again to access your dashboard.</p>
    <div className="faculty-signout-actions"><button ref={stay} type="button" className="faculty-signout-cancel" onClick={onClose}>Stay signed in</button><button type="button" className="faculty-signout-confirm" onClick={onConfirm}>Sign out</button></div>
  </dialog>, document.body)
}
