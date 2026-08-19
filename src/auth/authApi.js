import { ROLES } from './roles'

export class AuthRequestError extends Error {
  constructor(message = 'Invalid login credentials. Please check your details and try again.') {
    super(message)
    this.name = 'AuthRequestError'
  }
}

const authEndpoint = import.meta.env.VITE_AUTH_API_URL

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
