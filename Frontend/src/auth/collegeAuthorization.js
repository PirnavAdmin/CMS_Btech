const id = value => value == null ? '' : String(value).trim()
const validId = value => /^[1-9]\d*$/.test(id(value))

export function validateEffectiveAccess(access, collegeId) {
  if (!access || typeof access !== 'object' || Array.isArray(access)) throw new Error('Account access is unavailable.')
  if (collegeId && Object.hasOwn(access, 'collegeId') && id(access.collegeId) !== id(collegeId)) throw new Error('The access response belongs to another college.')
  if (access.isSuperAdmin !== true && (!access.permissions || typeof access.permissions !== 'object' || Array.isArray(access.permissions))) throw new Error('Account permissions are unavailable.')
  return access
}
export function hasModuleAction(access, module, action = 'view') {
  if (!module || !['view', 'create', 'edit', 'delete', 'export'].includes(action)) return false
  return access?.isSuperAdmin === true || (access?.permissions?.[module]?.view === true && access.permissions[module][action] === true)
}
export function authorizedCollegeIds(access, assignedCollegeId = '') {
  if (!access) return []
  if (access.isSuperAdmin === true) return null // Explicit server-confirmed platform scope, not a role-label bypass.
  const primary = Object.hasOwn(access, 'primaryCollegeId') ? access.primaryCollegeId : access.collegeId
  return [primary].filter(validId).map(id)
}
export function canSelectCollege(access, collegeId, assignedCollegeId = '') {
  if (!validId(collegeId)) return false
  const allowed = authorizedCollegeIds(access, assignedCollegeId)
  return allowed === null || allowed.includes(id(collegeId))
}
