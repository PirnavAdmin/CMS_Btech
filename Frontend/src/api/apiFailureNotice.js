import { GENERIC_ERROR_MESSAGE } from '../utils/userError.js'
export const API_FAILURE_EVENT = 'app:api-failure'

export function notifyApiUnavailable(error = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return

  const status = Number(error.status) || 0
  const detail = {
    kind: status >= 500 ? 'server' : 'connection',
    status,
    message: GENERIC_ERROR_MESSAGE,
    occurredAt: Date.now(),
  }

  window.dispatchEvent(new CustomEvent(API_FAILURE_EVENT, { detail }))
}

export function createApiUnavailableError(status = 0) {
  const error = new Error(GENERIC_ERROR_MESSAGE)
  error.name = 'ApiUnavailableError'
  error.status = status || undefined
  error.code = status >= 500 ? 'API_SERVER_ERROR' : 'API_CONNECTION_ERROR'
  error.retryable = true
  notifyApiUnavailable(error)
  return error
}
