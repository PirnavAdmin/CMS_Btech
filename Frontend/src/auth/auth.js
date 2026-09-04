const AUTH_STORAGE_KEY = 'btech-authenticated'
const ROLE_STORAGE_KEY = 'btech-user-role'

function normalizeStoredRole(role) {
  const rawRole = Array.isArray(role) ? role[0] : role
  const normalizedRole = String(rawRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

  if (['admin', 'college_admin', 'super_admin'].includes(normalizedRole)) return 'admin'
  return normalizedRole
}

export function isAuthenticated() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true' || sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true'
}

export function signIn(role, accessToken, refreshToken, rememberMe = false, user = {}) {
  signOut()
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(AUTH_STORAGE_KEY, 'true')
  storage.setItem(ROLE_STORAGE_KEY, normalizeStoredRole(role))
  storage.setItem('btech-access-token', accessToken)
  storage.setItem('btech-refresh-token', refreshToken)
  storage.setItem('btech-user-name', String(user.name || '').trim())
  storage.setItem('btech-user-id', String(user.id || '').trim())
}

export function signOut() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(ROLE_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(ROLE_STORAGE_KEY)
  ;['btech-access-token', 'btech-refresh-token', 'btech-user-name', 'btech-user-id', 'btech-jwt', 'btech-session', 'accessToken', 'refreshToken', 'jwt', 'token'].forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

export function getUserRole() {
  const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) || sessionStorage.getItem(ROLE_STORAGE_KEY)
  const normalizedRole = normalizeStoredRole(storedRole)

  if (storedRole && storedRole !== normalizedRole) {
    localStorage.setItem(ROLE_STORAGE_KEY, normalizedRole)
  }

  return normalizedRole || null
}

export function hasRole(allowedRoles = []) {
  const userRole = getUserRole()

  if (!userRole) {
    return false
  }

  return allowedRoles.includes(userRole)
}
