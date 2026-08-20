import { ROLES } from './roles'

export class AuthRequestError extends Error {
  constructor(message = 'Invalid login credentials. Please check your details and try again.') {
    super(message)
    this.name = 'AuthRequestError'
  }
}

const authEndpoint = import.meta.env.VITE_AUTH_API_URL
const otpEndpoint = import.meta.env.VITE_OTP_API_URL || authEndpoint

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
 * Send OTP to registered Email or Mobile number
 */
export async function sendOtp({ contact }) {
  if (!otpEndpoint) {
    // Demo Mode: Generate mock 6-digit OTP
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString()
    return { 
      success: true, 
      message: `Verification code sent to ${contact}`, 
      demoOtp: mockOtp 
    }
  }

  try {
    const response = await fetch(`${otpEndpoint}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new AuthRequestError(data.message || 'Failed to send verification code. Please check your details.')
    }
    return data
  } catch (error) {
    if (error instanceof AuthRequestError) throw error
    throw new AuthRequestError('Network error. Unable to send verification code right now.')
  }
}

/**
 * Verify entered OTP code
 */
export async function verifyOtp({ contact, otp }) {
  if (!otpEndpoint) {
    // Demo Mode: Accept any 6-digit number
    if (/^\d{6}$/.test(otp)) {
      return { success: true, message: 'Verified successfully' }
    }
    throw new AuthRequestError('Invalid OTP code. Please enter a valid 6-digit code.')
  }

  try {
    const response = await fetch(`${otpEndpoint}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, otp })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new AuthRequestError(data.message || 'Invalid or expired OTP code.')
    }
    return data
  } catch (error) {
    if (error instanceof AuthRequestError) throw error
    throw new AuthRequestError('Unable to verify OTP right now. Please try again.')
  }
}