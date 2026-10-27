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

const NON_TEACHING_ROLE_REGEX = /\b(non[-\s_]?teaching|staff|lab[-\s_]?assistant|technical[-\s_]?assistant)\b/i

export function isNonTeachingRole(role, user = {}) {
  const values = [
    ...(Array.isArray(role) ? role : [role]),
    user?.role,
    user?.roles,
    user?.employeeCategory,
    user?.category,
    user?.designation,
    user?.facultyType,
  ].flat().filter(Boolean)

  return values.some(val => {
    const value = String(val).trim()
    if (/^teaching[\s_-]+(staff|faculty)$/i.test(value)) return false
    return NON_TEACHING_ROLE_REGEX.test(value)
  })
}

function normalizeStoredRole(role) {
  const roles = (Array.isArray(role) ? role : [role]).map(value => {
    const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (normalized === 'student_access') return 'student'
    if (['faculty_access', 'hod_role', 'hod_access', 'teaching', 'teaching_faculty', 'teaching_staff', 'non_teaching', 'non_teaching_faculty', 'non_teaching_staff', 'hod', 'principal'].includes(normalized)) return 'faculty'
    return ['admin', 'college_admin', 'collegeadmin', 'super_admin', 'superadmin'].includes(normalized) ? 'admin' : normalized
  })
  return ['admin', 'faculty', 'student'].find(value => roles.includes(value)) || (roles.some(Boolean) ? 'staff' : '')
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

  const nonTeaching = isNonTeachingRole(role, user)

  storage.setItem(AUTH_STORAGE_KEY, 'true')
  storage.setItem(ROLE_STORAGE_KEY, normalizeStoredRole(role))
  storage.setItem('btech-is-non-teaching', String(nonTeaching))
  if (nonTeaching) {
    storage.setItem('btech-user-type', 'non_teaching')
  } else if (normalizeStoredRole(role) === 'faculty') {
    storage.setItem('btech-user-type', 'teaching')
  }
  storage.setItem('btech-user-raw-role', Array.isArray(role) ? role.join(',') : String(role || ''))
  storage.setItem('btech-assigned-roles', JSON.stringify((Array.isArray(role) ? role : [role]).filter(Boolean)))
  storage.setItem('btech-access-token', accessToken)
  storage.setItem('btech-refresh-token', refreshToken)
  storage.setItem('btech-user-name', String(user.name || '').trim())
  storage.setItem('btech-user-id', String(user.id || '').trim())
  storage.setItem('btech-user-email', String(user.email || '').trim())
  storage.setItem('btech-user-mobile', String(user.mobile || '').trim())
  storage.setItem('btech-user-employee-id', String(user.employeeUserId || '').trim())
  storage.setItem('btech-must-change-password', String(user.mustChangePassword === true || user.mustChangePassword === 1 || user.mustChangePassword === 'true' || user.mustChangePassword === '1'))
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
  ;['btech-access-token', 'btech-refresh-token', 'btech-user-name', 'btech-user-id', 'btech-user-email', 'btech-user-mobile', 'btech-user-employee-id', 'btech-must-change-password', 'btech-jwt', 'btech-session', 'accessToken', 'refreshToken', 'jwt', 'token', 'btech-is-non-teaching', 'btech-user-type', 'btech-user-raw-role', 'btech-assigned-roles'].forEach((key) => {
    localStore?.removeItem(key)
    sessionStore?.removeItem(key)
  })
}

export function isNonTeachingStaff() {
  const storage = getAuthStorage()
  if (!isAuthenticated()) return false
  const userRole = getUserRole()
  if (userRole !== 'faculty') return false

  const flag = readStorageValue(storage, 'btech-is-non-teaching')
  if (flag === 'true') return true
  if (flag === 'false') return false

  const userType = readStorageValue(storage, 'btech-user-type')
  if (userType === 'non_teaching') return true
  if (userType === 'teaching') return false

  const rawRole = readStorageValue(storage, 'btech-user-raw-role')
  if (rawRole && NON_TEACHING_ROLE_REGEX.test(rawRole)) return true

  try {
    const token = getAccessToken()
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (payload) {
      const claims = JSON.parse(atob(payload))
      const allRoles = [
        claims.role,
        claims.roles,
        claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
        claims.employeeCategory,
        claims.category,
        claims.designation,
      ].flat().filter(Boolean)
      if (allRoles.some(r => NON_TEACHING_ROLE_REGEX.test(String(r)))) return true
    }
  } catch {}

  return false
}

export function mustChangePassword() {
  const required = value => value === true || value === 1 || value === 'true' || value === '1'
  if (required(getAuthStorage()?.getItem('btech-must-change-password'))) return true
  try {
    const payload = getAccessToken().split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    return required(payload && JSON.parse(atob(payload)).mustChangePassword)
  } catch { return false }
}

export function getUserRole() {
  const storage = getAuthStorage()
  const storedRole = readStorageValue(storage, ROLE_STORAGE_KEY)
  const normalizedRole = normalizeStoredRole(storedRole)

  if (storedRole && storedRole !== normalizedRole && storage) {
    storage.setItem(ROLE_STORAGE_KEY, normalizedRole)
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
