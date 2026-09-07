import { getAccessToken } from './auth'
import { ROLES } from './roles'

export class AuthRequestError extends Error {
  constructor(message = 'Invalid login credentials. Please check your details and try again.') {
    super(message)
    this.name = 'AuthRequestError'
  }
}

const authEndpoint = import.meta.env.VITE_AUTH_API_URL
const registrationBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const registrationEndpoint = import.meta.env.VITE_REGISTRATION_API_URL || (registrationBaseUrl ? `${registrationBaseUrl}/api/v1/access-requests` : import.meta.env.DEV ? '/api/v1/access-requests' : '')
const otpApiBaseUrl = (import.meta.env.VITE_OTP_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const hasOtpRoute = import.meta.env.DEV || Boolean(otpApiBaseUrl)
const otpAuthToken = import.meta.env.VITE_OTP_AUTH_TOKEN

const combineUrl = (base, path) => {
  const cleanBase = String(base || '').replace(/\/+$/, '')
  const cleanPath = String(path || '').replace(/^\/+/, '')

  if (!cleanBase) return `/${cleanPath}`
  return `${cleanBase}/${cleanPath}`
}

const resolveOtpUrl = (path) => {
  const normalizedPath = String(path || '').replace(/^\/+/, '')

  // Prevent accidental `/api/api/...` URLs when VITE_OTP_API_URL already ends with `/api`.
  if (otpApiBaseUrl.endsWith('/api') && normalizedPath.startsWith('api/')) {
    return combineUrl(otpApiBaseUrl, normalizedPath.slice(4))
  }

  return combineUrl(otpApiBaseUrl, normalizedPath)
}

const readResponseBody = async (response) => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

const otpPayload = ({ contact, otp, purpose = 'LOGIN' }) => {
  const value = contact.trim()
  const isMobile = /^\d+$/.test(value)

  return {
    email: isMobile ? '' : value,
    mobile: isMobile ? value : '',
    ...(otp ? { otpCode: otp } : {}),
    purpose,
  }
}

const otpRequest = async (path, payload) => {
  if (!hasOtpRoute) {
    throw new AuthRequestError('Verification is temporarily unavailable. Please try again later.')
  }

  const accessToken = otpAuthToken || localStorage.getItem('btech-access-token')
  let response
  try {
    response = await fetch(resolveOtpUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new AuthRequestError('We couldn’t send the verification code. Please try again shortly.')
  }

  const data = await readResponseBody(response)
  if (!response.ok || data?.success === false) {
    const fallback = response.status >= 500
      ? 'Verification is temporarily unavailable. Please try again later.'
      : response.status === 404
      ? 'Verification is temporarily unavailable. Please try again later.'
      : 'The OTP request could not be completed.'
    throw new AuthRequestError(response.status >= 500 ? fallback : data?.message || fallback)
  }

  return data
}

export async function login({ identifier, password }, fallbackRole = ROLES.ADMIN) {
  if (!authEndpoint) {
    throw new AuthRequestError('Sign in is temporarily unavailable. Please try again later.')
  }

  let response
  try {
    response = await fetch(authEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) })
  } catch {
    throw new AuthRequestError('Unable to sign in right now. Please try again.')
  }

  if (!response.ok) throw new AuthRequestError()

  try {
    const session = await response.json()
    if (!session?.user?.role) throw new Error('Malformed authentication response')
    return session
  } catch {
    throw new AuthRequestError('Unable to sign in right now. Please try again.')
  }
}

/**
 * Generate an OTP for an email address or mobile number.
 */
export async function generateOtp({ contact, purpose = 'LOGIN' }) {
  return otpRequest('/api/otp/generate', otpPayload({ contact, purpose }))
}

/** Resend a new OTP to the same email address or mobile number. */
export async function resendOtp({ contact, purpose = 'LOGIN' }) {
  return otpRequest('/api/otp/resend', otpPayload({ contact, purpose }))
}

// Retained for existing callers while the UI transitions to generateOtp.
export const sendOtp = generateOtp

/**
 * Verify entered OTP code
 */
export async function verifyOtp({ contact, otp, purpose = 'LOGIN' }) {
  return otpRequest('/api/otp/verify', otpPayload({ contact, otp, purpose }))
}

/**
 * Reset password after OTP verification
 */
export async function resetPassword({ contact, otp, password }) {
  if (!hasOtpRoute) {
    throw new AuthRequestError('Password reset is temporarily unavailable. Please try again later.')
  }

  try {
    const response = await fetch(resolveOtpUrl('/api/otp/reset-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        contact: contact.trim(),
        otp,
        password,
      }),
    })

    const data = await readResponseBody(response)
    if (!response.ok || data?.success === false) {
      const validationMessage = data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat().find((message) => typeof message === 'string')
        : ''
      throw new AuthRequestError(validationMessage || data?.message || data?.detail || 'Unable to reset your password. Please try again.')
    }
    return data
  } catch (error) {
    if (error instanceof AuthRequestError) throw error
    throw new AuthRequestError('We couldn’t reset your password right now. Please try again shortly.')
  }
}

// Set VITE_REGISTRATION_API_URL when the pending-registration endpoint is available.
export async function register({ fullName, email, mobile, password, confirmPassword, agreeToTerms }) {
  if (!registrationEndpoint) {
    throw new AuthRequestError('Registration is temporarily unavailable. Please try again later.')
  }

  let response
  try {
    response = await fetch(registrationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ fullName, email, mobile, password, confirmPassword, agreeToTerms: Boolean(agreeToTerms) }),
    })
  } catch {
    throw new AuthRequestError('Unable to submit your request right now. Please try again.')
  }

  const result = await readResponseBody(response)
  if (!response.ok || result?.success === false) {
    const validationMessage = result?.errors && typeof result.errors === 'object'
      ? Object.values(result.errors).flat().find((message) => typeof message === 'string')
      : ''
    const fallback = response.status === 409
      ? 'An access request already exists for this email or mobile number.'
      : response.status >= 500
        ? 'Registration is temporarily unavailable. Please try again later.'
        : 'Unable to submit your request. Please review your details and try again.'
    throw new AuthRequestError(validationMessage || result?.message || result?.detail || fallback)
  }

  return result
}

const accessRequestUrl = (path = '') => `${registrationEndpoint.replace(/\/+$/, '')}${path}`

const accessRequestAdminCall = async (path, method = 'GET') => {
  const token = getAccessToken()
  if (!token) throw new AuthRequestError('Please sign in to manage access requests.')

  let response
  try {
    const requestOptions = (requestMethod) => ({
      method: requestMethod,
      headers: {
        Accept: 'application/json',
        ...(requestMethod !== 'GET' ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      ...(requestMethod !== 'GET' ? { body: JSON.stringify({}) } : {}),
    })
    response = await fetch(accessRequestUrl(path), requestOptions(method))
    if ((response.status === 405 || response.status === 415) && method === 'POST') {
      response = await fetch(accessRequestUrl(path), requestOptions('PUT'))
      if (response.status === 405 || response.status === 415) {
        response = await fetch(accessRequestUrl(path), requestOptions('PATCH'))
      }
    }
  } catch {
    throw new AuthRequestError('Unable to connect to the access-request service.')
  }

  const result = await readResponseBody(response)
  if (!response.ok || result?.success === false) {
    const message = result?.message || `Unable to complete the access-request action (${response.status}).`
    if (/invalid or inactive college/i.test(message)) {
      throw new AuthRequestError('This request is not linked to an active college. Activate the college and assign it to the access request before approving.')
    }
    throw new AuthRequestError(message)
  }
  return result.data ?? result
}

export const getAccessRequestStatus = (requestId) => accessRequestAdminCall(`/${encodeURIComponent(requestId)}/status`)
export const getPendingAccessRequests = () => accessRequestAdminCall('/pending')
export const approveAccessRequest = (requestId) => accessRequestAdminCall(`/${encodeURIComponent(requestId)}/approve`, 'POST')
export const rejectAccessRequest = (requestId) => accessRequestAdminCall(`/${encodeURIComponent(requestId)}/reject`, 'POST')
