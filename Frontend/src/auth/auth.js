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

  if (['admin', 'college_admin', 'super_admin'].includes(normalizedRole)) return 'admin'
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
}

export function signOut() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

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
