import { authAccessApi } from '../api/apiEndpoints.js'
import { getAccessToken } from './auth.js'
import { validateEffectiveAccess } from './collegeAuthorization.js'

// Share only in-flight reads. Completed permissions are not cached indefinitely
// across role changes, retries, accounts or colleges.
const pending = new Map()
export function requestEffectiveAccess(collegeId) {
  const key = `${getAccessToken() || ''}:${collegeId || ''}`
  if (!pending.has(key)) {
    const request = Promise.resolve().then(() => authAccessApi.get(collegeId || undefined)).then(access => validateEffectiveAccess(access, collegeId))
    pending.set(key, request)
    request.finally(() => { if (pending.get(key) === request) pending.delete(key) }).catch(() => {})
  }
  return pending.get(key)
}
