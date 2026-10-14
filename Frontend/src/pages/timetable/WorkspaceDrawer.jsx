import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'

// Shared focus handling for timetable drawers and compact confirmations.
export default function WorkspaceDrawer({ title, subtitle, close, busy = false, modal = false, children, footer }) {
  const root = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.focus()
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<div className={`tt-overlay ${modal ? 'tt-confirm-overlay' : 'tt-drawer-overlay'}`} onMouseDown={event => { if (event.target === event.currentTarget && !busy) close() }}>
    <section ref={root} tabIndex={-1} className={`tt-dialog ${modal ? 'tt-confirm-dialog' : 'tt-drawer'}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={event => {
      if (event.key === 'Escape' && !busy && !document.querySelector('.searchable-select__menu')) { event.stopPropagation(); close() }
      if (event.key !== 'Tab' || document.querySelector('.searchable-select__menu')) return
      const elements = [...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(element => element.getClientRects().length)
      if (!elements.length) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === elements[0] || document.activeElement === root.current)) { event.preventDefault(); elements.at(-1).focus() }
      if (!event.shiftKey && (document.activeElement === elements.at(-1) || document.activeElement === root.current)) { event.preventDefault(); elements[0].focus() }
    }}>
      <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="tt-icon-button" aria-label={`Close ${title}`} disabled={busy} onClick={close}><FiX /></button></header>
      <div className="tt-drawer-content">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>, document.body)
}
