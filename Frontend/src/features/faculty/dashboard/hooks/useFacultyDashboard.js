import { useCallback, useEffect, useState } from 'react'

export default function useFacultyDashboard(service) {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSnapshot(await service.getDashboardSnapshot())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    let active = true
    service.getDashboardSnapshot()
      .then(result => { if (active) setSnapshot(result) })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [service])

  return { snapshot, loading, error, retry: load }
}
