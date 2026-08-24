import { ROLES } from './roles'

export class AuthRequestError extends Error {
  constructor(message = 'Invalid login credentials. Please check your details and try again.') {
    super(message)
    this.name = 'AuthRequestError'
  }
}

const authEndpoint = import.meta.env.VITE_AUTH_API_URL
const registrationEndpoint = import.meta.env.VITE_REGISTRATION_API_URL
const otpEndpoint = import.meta.env.VITE_OTP_API_URL || authEndpoint
const otpApiBaseUrl = (import.meta.env.VITE_OTP_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const otpAuthToken = import.meta.env.VITE_OTP_AUTH_TOKEN

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
  if (!otpApiBaseUrl) {
    throw new AuthRequestError('OTP service is not configured.')
  }

  const accessToken = otpAuthToken || localStorage.getItem('btech-access-token')
  let response
  try {
    response = await fetch(`${otpApiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new AuthRequestError('Network error. Unable to contact the OTP service right now.')
  }

  const data = await readResponseBody(response)
  if (!response.ok || data?.success === false) {
    throw new AuthRequestError(data?.message || 'The OTP request could not be completed.')
  }

  return data
}

// Set VITE_AUTH_API_URL when the backend login endpoint becomes available.
export async function login({ identifier, password }, fallbackRole = ROLES.ADMIN) {
  if (!authEndpoint) {
    return { user: { id: 'DEMO_USER', name: 'Demo User', role: fallbackRole } }
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
  if (!otpEndpoint) {
    // Demo Mode: Accept any valid-looking request
    if (password.length < 8) {
      throw new AuthRequestError('Password must contain at least 8 characters.')
    }
    return { success: true, message: 'Password has been reset successfully.' }
  }

  try {
    const response = await fetch(`${otpEndpoint}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, otp, password }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new AuthRequestError(data.message || 'Unable to reset your password. Please try again.')
    }
    return data
  } catch (error) {
    if (error instanceof AuthRequestError) throw error
    throw new AuthRequestError('Network error. Unable to reset your password right now.')
  }
}

// Set VITE_REGISTRATION_API_URL when the pending-registration endpoint is available.
export async function register({ fullName, email, mobile, password }) {
  if (!registrationEndpoint) {
    return { success: true, message: 'Registration request submitted successfully', status: 'PENDING' }
  }

  let response
  try {
    response = await fetch(registrationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, mobile, password }),
    })
  } catch {
    throw new AuthRequestError('Unable to submit your request right now. Please try again.')
  }

  if (!response.ok) {
    throw new AuthRequestError('Unable to submit your request. Please review your details and try again.')
  }

  try {
    const result = await response.json()
    if (!result?.success) throw new Error('Malformed registration response')
    return result
  } catch {
    throw new AuthRequestError('Unable to submit your request right now. Please try again.')
  }
}
