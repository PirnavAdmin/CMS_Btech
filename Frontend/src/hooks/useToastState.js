import { useCallback, useRef, useState } from 'react'
import { showToast } from '../utils/toast'

// Preserve useful inline errors and existing form state, while the global host
// owns all popup rendering and timing. Setters run from UI handlers, not effects
// watching rendered messages, so navigation and StrictMode do not replay toasts.
export default function useToastState(initial, defaultType = 'info') {
  const [value, setValue] = useState(initial)
  const current = useRef(value)
  const setFeedback = useCallback((next, type = defaultType) => {
    const resolved = typeof next === 'function' ? next(current.current) : next
    const previousMessage = current.current?.message || current.current?.form
    current.current = resolved
    setValue(resolved)
    const message = typeof resolved === 'string' ? resolved : resolved?.message || resolved?.form
    if (message && (typeof next !== 'function' || message !== previousMessage)) showToast(message, resolved?.tone || resolved?.type || type)
  }, [defaultType])
  return [value, setFeedback]
}
