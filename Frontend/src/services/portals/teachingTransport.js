// Keep HTTP response handling testable without browser authentication/storage.
export function createTeachingTransport({ fetchResponse, baseUrl = '', getToken, authorize, report = () => {} }) {
  return async (path, options = {}) => {
    authorize()
    const token = getToken()
    if (!token) throw new Error('Your session has expired. Please sign in again.')
    let response
    try { response = await fetchResponse(`${baseUrl}${path}`, { ...options, headers: { Accept: 'application/json', ...options.headers, Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' } }) }
    catch { throw new Error('College information is temporarily unavailable. Please try again.') }
    const fail = (message, code) => {
      const error = new Error(message)
      error.status = response.status
      error.code = code
      report({ path: path.split('?')[0], status: response.status, code, contentType: response.headers?.get('content-type') || '' })
      throw error
    }
    // Handle authentication before parsing: gateways can return HTML errors.
    if (response.status === 401) fail('Your session has expired. Please sign in again.', 'UNAUTHENTICATED')
    if (response.status === 403) fail('Your faculty account does not have access to this information. Please contact your administrator.', 'FORBIDDEN')
    if (response.status === 404) fail('This information is not available from the college service yet.', 'NOT_FOUND')
    if (response.status === 204 && response.ok) return { success: true, data: null }
    let body
    try { body = await response.json() }
    catch { fail('This information is temporarily unavailable. Please try again later.', 'NON_JSON_RESPONSE') }
    if (!response.ok || body?.success === false) {
      const safeMessage = typeof body?.message === 'string' && body.message.length <= 350 && !/<[^>]*>|ngrok|https?:\/\//i.test(body.message) ? body.message : 'The request could not be completed. Please try again.'
      fail(response.status >= 500 ? 'College information is temporarily unavailable. Please try again later.' : safeMessage, 'API_ERROR')
    }
    return body
  }
}
