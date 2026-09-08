import { useEffect, useRef } from 'react'
import { FiX } from 'react-icons/fi'
import './ViewDialog.css'

export default function ViewDialog({ title, onClose, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element.showModal()
    return () => { element.close(); previousFocus?.focus() }
  }, [])
  return <dialog ref={dialog} className="shared-view-dialog" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === dialog.current) onClose() }}><header><h2>{title}</h2><button type="button" aria-label="Close details" onClick={onClose}><FiX /></button></header>{children}</dialog>
}
