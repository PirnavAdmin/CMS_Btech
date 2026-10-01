export const API_FAILURE_EVENT = 'app:api-failure'

export function notifyApiUnavailable(error = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return

  const status = Number(error.status) || 0
  const detail = {
    kind: status >= 500 ? 'server' : 'connection',
    status,
    message: status >= 500
      ? 'The backend server is having trouble. Please retry in a moment.'
      : 'Unable to connect to the backend server. Check that it is running and try again.',
    occurredAt: Date.now(),
  }

  window.dispatchEvent(new CustomEvent(API_FAILURE_EVENT, { detail }))
}

export function createApiUnavailableError(status = 0) {
  const error = new Error(status >= 500
    ? 'The server is temporarily unavailable. Please try again shortly.'
    : 'Unable to connect to the server. Check that the backend is running and try again.')
  error.name = 'ApiUnavailableError'
  error.status = status || undefined
  error.code = status >= 500 ? 'API_SERVER_ERROR' : 'API_CONNECTION_ERROR'
  error.retryable = true
  notifyApiUnavailable(error)
  return error
}
