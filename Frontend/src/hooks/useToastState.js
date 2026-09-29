import { useCallback, useRef, useState } from 'react'
import { showToast } from '../utils/toast'

// Preserve the local form/page state and publish feedback through the shared
// notification store. The UI host decides where each notification is shown.
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
