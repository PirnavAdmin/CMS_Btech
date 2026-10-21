const AUTH_STORAGE_KEY = 'btech-authenticated'
const ROLE_STORAGE_KEY = 'btech-user-role'

const safeStorage = (storageName) => {
  try {
    return window?.[storageName]
  } catch {
    return null
  }
}

const readStorageValue = (storage, key) => {
  try {
    return storage?.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function normalizeStoredRole(role) {
  const rawRole = Array.isArray(role) ? role[0] : role
  const normalizedRole = String(rawRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

  if (['admin', 'college_admin', 'collegeadmin', 'super_admin', 'superadmin'].includes(normalizedRole)) return 'admin'
  return normalizedRole
}

export function getAuthStorage() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  if (localStore && readStorageValue(localStore, AUTH_STORAGE_KEY) === 'true') return localStore
  if (sessionStore && readStorageValue(sessionStore, AUTH_STORAGE_KEY) === 'true') return sessionStore

  if (localStore && readStorageValue(localStore, 'btech-remember-me') === 'true') return localStore
  return sessionStore || localStore || null
}

export function getAccessToken() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  return readStorageValue(localStore, 'btech-access-token')
    || readStorageValue(sessionStore, 'btech-access-token')
    || readStorageValue(localStore, 'accessToken')
    || readStorageValue(sessionStore, 'accessToken')
    || readStorageValue(localStore, 'token')
    || readStorageValue(sessionStore, 'token')
    || ''
}

export function getRefreshToken() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  return readStorageValue(localStore, 'btech-refresh-token')
    || readStorageValue(sessionStore, 'btech-refresh-token')
    || readStorageValue(localStore, 'refreshToken')
    || readStorageValue(sessionStore, 'refreshToken')
    || ''
}

// The signed-in college owns the context; a previous browser selection must not override it.
export function getUserCollegeId() {
  try {
    const token = getAccessToken()
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    const claims = payload ? JSON.parse(atob(payload)) : {}
    const roles = [claims.role, claims.roles, claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']].flat().filter(Boolean)
    if (roles.some(role => String(role).replace(/[\s_-]/g, '').toLowerCase() === 'superadmin')) return ''
    const value = claims.collegeId ?? claims.college_id ?? getAuthStorage()?.getItem('btech-user-college-id')
    return value && String(value) !== '0' ? String(value) : ''
  } catch { return getAuthStorage()?.getItem('btech-user-college-id') || '' }
}

export function setAccessToken(token, rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage
  if (token) storage.setItem('btech-access-token', token)
}

export function setRefreshToken(token, rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage
  if (token) storage.setItem('btech-refresh-token', token)
}

export function isAuthenticated() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  return readStorageValue(localStore, AUTH_STORAGE_KEY) === 'true' || readStorageValue(sessionStore, AUTH_STORAGE_KEY) === 'true'
}

export function signIn(role, accessToken, refreshToken, rememberMe = false, user = {}) {
  signOut()

  const storage = rememberMe ? safeStorage('localStorage') : safeStorage('sessionStorage')
  if (!storage) return

  storage.setItem(AUTH_STORAGE_KEY, 'true')
  storage.setItem(ROLE_STORAGE_KEY, normalizeStoredRole(role))
  storage.setItem('btech-access-token', accessToken)
  storage.setItem('btech-refresh-token', refreshToken)
  storage.setItem('btech-user-name', String(user.name || '').trim())
  storage.setItem('btech-user-id', String(user.id || '').trim())
  storage.setItem('btech-user-college-id', String(user.collegeId ?? user.college?.collegeId ?? user.college?.id ?? '').trim())
}

export function signOut() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')
  ;['pirnav_academic_context', 'pirnav-selected-college-id', 'selected_college_id', 'pirnav-selected-academic-year-id', 'btech-user-college-id', 'cms-portal-preview'].forEach(key => {
    localStore?.removeItem(key)
    sessionStore?.removeItem(key)
  })

  if (localStore) {
    localStore.removeItem(AUTH_STORAGE_KEY)
    localStore.removeItem(ROLE_STORAGE_KEY)
  }
  if (sessionStore) {
    sessionStore.removeItem(AUTH_STORAGE_KEY)
    sessionStore.removeItem(ROLE_STORAGE_KEY)
  }
  ;['btech-access-token', 'btech-refresh-token', 'btech-user-name', 'btech-user-id', 'btech-jwt', 'btech-session', 'accessToken', 'refreshToken', 'jwt', 'token'].forEach((key) => {
    localStore?.removeItem(key)
    sessionStore?.removeItem(key)
  })
}

export function getUserRole() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')
  const storedRole = readStorageValue(localStore, ROLE_STORAGE_KEY) || readStorageValue(sessionStore, ROLE_STORAGE_KEY)
  const normalizedRole = normalizeStoredRole(storedRole)

  if (storedRole && storedRole !== normalizedRole && localStore) {
    localStore.setItem(ROLE_STORAGE_KEY, normalizedRole)
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
