import { useEffect, useState } from 'react'
import { requestEffectiveAccess } from '../auth/accessRequests.js'
import { validateEffectiveAccess } from '../auth/collegeAuthorization.js'

export default function useCollegeAccess({ token, collegeId, collegeLoading = false, providedAccess = null }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const key = `${token || ''}:${collegeId || ''}:${collegeLoading}:${attempt}`
  let supplied = null
  if (providedAccess && token && !collegeLoading && attempt === 0) {
    try { supplied = validateEffectiveAccess(providedAccess, collegeId) } catch { /* Fetch the current scope instead. */ }
  }
  useEffect(() => {
    if (!token || collegeLoading || supplied) return undefined
    let active = true
    requestEffectiveAccess(collegeId).then(access => {
      if (active) setResult({ key, status: 'ready', access })
    }).catch(() => { if (active) setResult({ key, status: 'error', access: null }) })
    return () => { active = false }
  }, [token, collegeId, collegeLoading, key, supplied])
  const current = !token ? { status: 'signed-out', access: null } : supplied ? { status: 'ready', access: supplied } : result?.key === key ? result : { status: 'loading', access: null }
  return { ...current, retry: () => setAttempt(value => value + 1) }
}
