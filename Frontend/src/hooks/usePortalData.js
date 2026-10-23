import { useEffect, useState } from 'react'

export function usePortalData(service) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const refresh = async () => {
    try {
      const next = await service.getSnapshot()
      setData(next)
      setError('')
      return next
    } catch (reason) {
      setError(reason.message)
      throw reason
    }
  }
  useEffect(() => { let active = true; service.getSnapshot().then(next => { if (active) setData(next) }).catch(reason => { if (active) setError(reason.message) }); return () => { active = false } }, [service])
  const act = async (action, message) => {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try { await action(); await refresh(); setNotice(message); return true }
    catch (reason) { setError(reason.message); return false }
    finally { setBusy(false) }
  }
  return { data, error, notice, busy, act, refresh }
}
