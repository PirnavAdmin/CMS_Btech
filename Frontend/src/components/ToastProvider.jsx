import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi'
import { dismissToast, getToasts, subscribeToToasts } from '../utils/toast'
import './ToastProvider.css'

const icons = { success: FiCheckCircle, error: FiAlertCircle, warning: FiAlertTriangle, info: FiInfo }

export default function ToastProvider({ children }) {
  const toasts = useSyncExternalStore(subscribeToToasts, getToasts, getToasts)
  return <>{children}{createPortal(<aside className="global-toasts" aria-label="Notifications" data-no-print>
    {toasts.map(toast => {
      const Icon = icons[toast.type]
      return <div key={toast.id} className={`global-toast global-toast--${toast.type}`}>
        <Icon aria-hidden="true" />
        <span role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'} aria-atomic="true">{toast.message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}><FiX aria-hidden="true" /></button>
      </div>
    })}
  </aside>, document.body)}</>
}
