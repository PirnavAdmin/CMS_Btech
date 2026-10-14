import ExportMenu from './ExportMenu'
import { useEffect, useRef } from 'react'
import { FiX } from 'react-icons/fi'
import './ViewDialog.css'

export default function ViewDialog({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  exportFilename,
  recordSections,
  footerActions,
  maxWidth = '860px',
  hideFooter = false,
}) {
  const dialog = useRef(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousFocus = document.activeElement
    if (!element.open) {
      element.showModal()
    }
    return () => {
      element.close()
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      className="shared-view-dialog"
      data-export-record
      aria-label={title}
      style={{ maxWidth }}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose?.()
      }}
    >
      <header className="shared-view-dialog__header">
        <div className="shared-view-dialog__heading">
          {Icon && (
            <div className="shared-view-dialog__icon-badge">
              <Icon />
            </div>
          )}
          <div>
            <h2 className="shared-view-dialog__title">{title}</h2>
            {subtitle && <p className="shared-view-dialog__subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="shared-view-dialog__actions">
          <ExportMenu
            mode="single"
            title={title}
            filename={exportFilename || title}
            recordSections={recordSections}
          />
          <button
            type="button"
            className="shared-view-dialog__close-btn"
            aria-label="Close details"
            title="Close"
            onClick={onClose}
          >
            <FiX size={18} />
          </button>
        </div>
      </header>

      <div className="shared-view-dialog__body">
        {children}
      </div>

      {!hideFooter && (
        <footer className="shared-view-dialog__footer">
          <button
            type="button"
            className="erp-btn erp-btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
          {footerActions && (
            <div className="shared-view-dialog__footer-actions">
              {footerActions}
            </div>
          )}
        </footer>
      )}
    </dialog>
  )
}
