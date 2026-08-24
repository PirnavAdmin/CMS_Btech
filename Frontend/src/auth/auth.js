const AUTH_STORAGE_KEY = 'btech-authenticated'
const ROLE_STORAGE_KEY = 'btech-user-role'

export function isAuthenticated() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
}

export function signIn(role, accessToken, refreshToken) {
  localStorage.setItem(AUTH_STORAGE_KEY, 'true')
  localStorage.setItem(ROLE_STORAGE_KEY, role.toLowerCase())
  localStorage.setItem('btech-access-token', accessToken)
  localStorage.setItem('btech-refresh-token', refreshToken)
}

export function signOut() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(ROLE_STORAGE_KEY)
  ;['btech-access-token', 'btech-refresh-token', 'btech-jwt', 'btech-session', 'accessToken', 'refreshToken', 'jwt', 'token'].forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

export function getUserRole() {
  return localStorage.getItem(ROLE_STORAGE_KEY)
}

export function hasRole(allowedRoles = []) {
  const userRole = getUserRole()

  if (!userRole) {
    return false
  }

  return allowedRoles.includes(userRole)
}
