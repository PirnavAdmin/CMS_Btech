const AUTH_STORAGE_KEY = 'btech-authenticated'
const ROLE_STORAGE_KEY = 'btech-user-role'

export function isAuthenticated() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
}

export function signIn(role) {
  localStorage.setItem(AUTH_STORAGE_KEY, 'true')
  localStorage.setItem(ROLE_STORAGE_KEY, role)
}

export function signOut() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(ROLE_STORAGE_KEY)
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