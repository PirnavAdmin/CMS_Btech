const AUTH_STORAGE_KEY = 'btech-authenticated'
const ROLE_STORAGE_KEY = 'btech-user-role'
const DISPLAY_ROLE_STORAGE_KEY = 'btech-user-display-role'

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
  const roleValue = Array.isArray(role) ? role[0] : role
  const rawRole = roleValue && typeof roleValue === 'object'
    ? roleValue.roleName ?? roleValue.name ?? roleValue.roleCode ?? roleValue.code ?? roleValue.role
    : roleValue
  const normalizedRole = String(rawRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

  if (['admin', 'college_admin', 'collegeadmin', 'super_admin', 'superadmin'].includes(normalizedRole)) return 'admin'
  if (['staff', 'non_teaching', 'non_teaching_staff', 'nonteaching', 'nonteaching_staff', 'nonteachingstaff', 'principal', 'hod', 'accountant', 'librarian'].includes(normalizedRole)) return 'staff'
  return normalizedRole
}

function roleDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.map(roleDisplayValue).filter(Boolean).filter((role, index, roles) => roles.indexOf(role) === index).join(', ')
  }
  if (value && typeof value === 'object') {
    return roleDisplayValue(value.roleName ?? value.displayName ?? value.name ?? value.roleCode ?? value.code ?? value.role)
  }
  return String(value || '').trim()
}

function roleFromAccessToken() {
  try {
    const payload = getAccessToken().split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    const claims = payload ? JSON.parse(atob(payload)) : {}
    return roleDisplayValue([
      claims.role,
      claims.roles,
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
    ].filter(Boolean))
  } catch {
    return ''
  }
}

function librarianLabel(value) {
  return roleDisplayValue(value).split(/[,/|]/).some(role => role.trim().toLowerCase().replace(/[\s-]+/g, '_') === 'librarian')
}

function tokenHasLibrarianIdentity() {
  try {
    const payload = getAccessToken().split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    const claims = payload ? JSON.parse(atob(payload)) : {}
    return [claims.role, claims.roles, claims.roleName, claims.roleCode, claims.designation, claims.jobTitle, claims.position,
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']].some(librarianLabel)
  } catch { return false }
}

function storedLibrarianIdentity() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')
  return [
    readStorageValue(localStore, DISPLAY_ROLE_STORAGE_KEY), readStorageValue(sessionStore, DISPLAY_ROLE_STORAGE_KEY),
    readStorageValue(localStore, 'btech-user-designation'), readStorageValue(sessionStore, 'btech-user-designation'),
    readStorageValue(localStore, 'btech-user-assigned-role'), readStorageValue(sessionStore, 'btech-user-assigned-role'),
  ].some(librarianLabel) || tokenHasLibrarianIdentity()
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

export function rememberUserDesignation(designation) {
  const storage = getAuthStorage()
  const value = String(designation || '').trim()
  if (!storage) return
  storage.setItem('btech-user-designation', value)
  storage.setItem('btech-designation-checked', 'true')
  if (librarianLabel(value)) {
    storage.setItem(DISPLAY_ROLE_STORAGE_KEY, 'Librarian')
    storage.setItem('btech-user-assigned-role', 'Librarian')
  }
}

export function signIn(role, accessToken, refreshToken, rememberMe = false, user = {}) {
  signOut()

  const storage = rememberMe ? safeStorage('localStorage') : safeStorage('sessionStorage')
  if (!storage) return

  const assignedRole = user.assignedRole ?? user.assignedRoleName ?? user.roleName ?? user.roleCode ?? user.designation
  const isAssignedLibrarian = [role, user.roles, user.role, user.assignedRole, user.assignedRoleName, user.roleName, user.roleCode, user.designation, user.jobTitle, user.position].some(librarianLabel)
  const displayRole = isAssignedLibrarian ? 'Librarian' : roleDisplayValue(assignedRole) || roleDisplayValue(role) || roleDisplayValue(user.role)

  storage.setItem(AUTH_STORAGE_KEY, 'true')
  storage.setItem(ROLE_STORAGE_KEY, normalizeStoredRole(role))
  storage.setItem(DISPLAY_ROLE_STORAGE_KEY, displayRole)
  storage.setItem('btech-user-designation', String(user.designation ?? user.jobTitle ?? user.position ?? '').trim())
  storage.setItem('btech-designation-checked', String(user.designation != null || user.jobTitle != null || user.position != null))
  storage.setItem('btech-user-assigned-role', roleDisplayValue(assignedRole))
  storage.setItem('btech-access-token', accessToken)
  storage.setItem('btech-refresh-token', refreshToken)
  storage.setItem('btech-user-name', String(user.name || '').trim())
  storage.setItem('btech-user-id', String(user.id || '').trim())
  storage.setItem('btech-user-college-id', String(user.collegeId ?? user.college?.collegeId ?? user.college?.id ?? '').trim())
  storage.setItem('btech-must-change-password', String(Boolean(user.mustChangePassword)))
  storage.setItem('btech-profile-completed', String(user.profileCompleted !== false))
}

export function signOut() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')
  ;['pirnav_academic_context', 'pirnav-selected-college-id', 'selected_college_id', 'pirnav-selected-academic-year-id', 'btech-user-college-id', 'btech-user-designation', 'btech-designation-checked', 'btech-user-assigned-role', 'btech-must-change-password', 'btech-profile-completed', 'cms-portal-preview'].forEach(key => {
    localStore?.removeItem(key)
    sessionStore?.removeItem(key)
  })

  if (localStore) {
    localStore.removeItem(AUTH_STORAGE_KEY)
    localStore.removeItem(ROLE_STORAGE_KEY)
    localStore.removeItem(DISPLAY_ROLE_STORAGE_KEY)
  }
  if (sessionStore) {
    sessionStore.removeItem(AUTH_STORAGE_KEY)
    sessionStore.removeItem(ROLE_STORAGE_KEY)
    sessionStore.removeItem(DISPLAY_ROLE_STORAGE_KEY)
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

// Keep the assigned role label separate from the normalized value used by RBAC checks.
export function getUserRoleDisplayName() {
  if (isLibrarian()) return 'Librarian'
  const storage = getAuthStorage()
  const storedName = readStorageValue(storage, DISPLAY_ROLE_STORAGE_KEY)
    || readStorageValue(safeStorage('localStorage'), DISPLAY_ROLE_STORAGE_KEY)
    || readStorageValue(safeStorage('sessionStorage'), DISPLAY_ROLE_STORAGE_KEY)
  const assignedRole = storedName || roleFromAccessToken()
  if (assignedRole) return assignedRole

  const role = getUserRole() || ''
  if (role === 'admin') return 'Administrator'
  return role ? role.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'User'
}

export function isLibrarian() {
  const localRole = normalizeStoredRole(readStorageValue(safeStorage('localStorage'), ROLE_STORAGE_KEY))
  const sessionRole = normalizeStoredRole(readStorageValue(safeStorage('sessionStorage'), ROLE_STORAGE_KEY))
  if ([localRole, sessionRole].includes('admin')) return false
  return storedLibrarianIdentity()
}

export function hasRole(allowedRoles = []) {
  const userRole = getUserRole()

  if (!userRole) {
    return false
  }

  return allowedRoles.includes(userRole)
}
