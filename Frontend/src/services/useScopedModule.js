import { useCallback, useEffect, useRef, useState } from 'react'

export default function useScopedModule(loader, scope, empty) {
  const [data, setData] = useState(empty)
  const [state, setState] = useState({ loading: true, saving: false, error: '', saveError: '' })
  const generation = useRef(0)
  const emptyRef = useRef(empty)
  const busy = useRef(false)
  const collegeId = scope.collegeId, academicYearId = scope.academicYearId, area = scope.area
  const enabled = scope.enabled !== false
  const reload = useCallback(async () => {
    if (!enabled) return
    const current = ++generation.current
    setState(s => ({ ...s, loading: true, error: '' }))
    try {
      const value = await loader({ collegeId, academicYearId, area })
      if (generation.current === current) setData(value)
    } catch (error) {
      if (generation.current === current) setState(s => ({ ...s, error: error.message }))
      throw error
    } finally {
      if (generation.current === current) setState(s => ({ ...s, loading: false }))
    }
  }, [loader, collegeId, academicYearId, area, enabled])
  useEffect(() => {
    // A new college/year must never display the previous scope while loading.
    // eslint-disable-next-line react/set-state-in-effect
    setData(emptyRef.current)
    reload().catch(() => {})
    // This is a request-generation counter, not a DOM reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { generation.current++ }
  }, [reload]) // The caller supplies the initial shape; scope controls reloads.
  const clearSaveError = useCallback(() => setState(s => ({...s,saveError:''})), [])
  const mutate = async (action, { onError } = {}) => {
    if (!enabled || busy.current || state.loading || data.resourceErrors?.[scope.resource]) return false
    busy.current = true
    setState(s => ({ ...s, saving: true, saveError: '' }))
    try {
      await action()
      try { await reload() } catch { /* The write succeeded; the refresh error is visible. */ }
      return true
    } catch (error) {
      if (onError) onError(error)
      else setState(s => ({ ...s, saveError: error.message }))
      return false
    } finally {
      busy.current = false
      setState(s => ({ ...s, saving: false }))
    }
  }
  return { data, reload, state:{...state,loading:enabled && state.loading,waitingForContext:!enabled}, mutate, clearSaveError }
}
