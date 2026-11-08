import { findModuleForPath } from '../config/moduleRegistry.js'
import { hasModuleAction } from './collegeAuthorization.js'
const key = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
const granted = value => value === true || value === 1 || value === 'true' || value === '1'

// Personal workspaces use the authenticated employee role. The role matrix
// controls access to shared administrative modules, not the workspace shell.
const workspaceScreens = {
  faculty: ['dashboard', 'students', 'subjects', 'attendance', 'my-attendance', 'marks', 'timetable', 'materials', 'leave', 'events', 'meetings', 'placements', 'notifications', 'profile'],
  staff: ['dashboard', 'profile', 'my-profile', 'attendance', 'my-attendance', 'leave', 'duty-roster', 'tasks', 'notices', 'notifications', 'meetings-events', 'documents'],
}

export function isPersonalWorkspace(path, role) {
  const match = path.match(/^\/(faculty|staff)-portal(?:\/([^/]+))?\/?$/)
  return Boolean(match && match[1] === role && workspaceScreens[role]?.includes(match[2] || 'dashboard'))
}

export function requireAssignedPermissions(rows, roles) {
  const assigned = new Set(roles.map(key))
  const matches = rows.filter(row => [row.roleCode, row.RoleCode, row.code, row.roleName, row.RoleName, row.name].some(value => value && assigned.has(key(value))) && ![false, 0, '0', 'Inactive'].includes(row.status ?? row.Status ?? row.isActive ?? row.IsActive))
  if (!matches.length) throw new Error('No active role configuration matches your login roles. Ask your administrator to check your role assignment.')
  for (const row of matches) {
    let permissions = row.permissions ?? row.Permissions
    if (typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions) } catch { throw new Error('Your assigned role has an invalid permissions configuration. Contact your administrator.') }
    }
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) throw new Error('The role service did not return screen permissions for your assigned role. Contact your administrator.')
  }
  const permissions = assignedPermissions(rows, roles)
  if (!Object.values(permissions).some(actions => actions.view === true)) {
    const names = matches.map(row => row.roleCode || row.RoleCode || row.code || row.roleName || row.name).join(', ')
    throw new Error(`Your active role (${names}) has no enabled screen permissions. Ask your administrator to enable the required screens for this role, then retry.`)
  }
  return permissions
}

export function assignedPermissions(rows, roles) {
  const assigned = new Set(roles.map(key))
  const result = {}
  for (const row of rows) {
    if (![row.roleCode, row.RoleCode, row.code, row.roleName, row.RoleName, row.name].some(value => assigned.has(key(value)))) continue
    if ([false, 0, '0', 'Inactive'].includes(row.status ?? row.Status ?? row.isActive ?? row.IsActive)) continue
    let permissions = row.permissions ?? row.Permissions ?? {}
    if (typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions) } catch { continue }
    }
    for (const [module, actions] of Object.entries(permissions || {})) {
      result[module] ||= {}
      for (const action of ['view', 'create', 'edit', 'delete', 'export']) {
        result[module][action] ||= granted(actions?.view) && granted(actions?.[action])
      }
    }
  }
  return result
}

const portalModules = { dashboard: 'dashboard', profile: 'my_profile', notifications: 'notifications', students: 'student_profiles', subjects: 'subjects', attendance: 'student_attendance', 'my-attendance': 'faculty_attendance', marks: 'marks', results: 'results', timetable: 'timetable', materials: 'materials', leave: 'faculty_leaves', fees: 'fees' }
export const additionalScreens = [
  ['/subject-management', 'Subject Management'], ['/timetable', 'Timetable Management'], ['/student-management/profiles', 'Student Profiles'], ['/student-management/attendance', 'Student Attendance'], ['/marks-management/marks-entry', 'Marks Management'], ['/faculty/leave-management', 'Faculty Leave Management'],
  ['/college-institution-management', 'Colleges'], ['/academic-year-management', 'Academic Years'], ['/department-management', 'Departments'], ['/courses', 'Courses'], ['/branches', 'Branches'], ['/semester-management', 'Semesters'], ['/section-management', 'Sections'], ['/rooms-management', 'Rooms & Classrooms'],
  ['/faculty', 'Faculty Directory'], ['/faculty/attendance', 'Faculty Attendance'], ['/faculty/payroll', 'Faculty Payroll'], ['/student-management/admissions', 'Student Admissions'], ['/student-management/promotions', 'Student Promotions'], ['/credits-management', 'Credits'], ['/elective-management', 'Electives'], ['/examination-setup', 'Exam Management'], ['/results', 'Grades & Results'], ['/fees', 'Fee Management'], ['/library', 'Library'], ['/meetings-events', 'Meetings / Events'], ['/placement', 'Placement'], ['/roles-designations', 'Roles & Designations'], ['/settings', 'Settings'],
]

export function permissionModuleForScreen(path) {
  const portal = path.match(/^\/(faculty|student|staff)-portal(?:\/([^/]+))?\/?$/)
  return portal ? portalModules[portal[2] || 'dashboard'] || null : findModuleForPath(path)?.permission?.module || null
}
export function canViewScreen(path, role, permissions = {}, access = {}) {
  if (!['admin', 'faculty', 'student', 'staff'].includes(role)) return false
  if (isPersonalWorkspace(path, role)) return true
  // Own-profile access is necessary for the existing first-login completion flow.
  if (path === '/my-profile') return true
  if (role === 'admin' && /^\/(?:settings(?:\/academic-context)?|global-settings)\/?$/.test(path)) {
    return ['academic_settings', 'colleges', 'academic_years'].some(module => hasModuleAction({ ...access, permissions }, module))
  }
  const portal = path.match(/^\/(faculty|student|staff)-portal(?:\/([^/]+))?\/?$/)
  if (portal && portal[1] !== role) return false
  if (!portal && role === 'student' && path !== '/my-subjects') return false
  if (path === '/my-subjects') return ['faculty', 'student'].includes(role) && hasModuleAction({ ...access, permissions }, 'subjects')
  return hasModuleAction({ ...access, permissions }, permissionModuleForScreen(path))
}

export function requiredActionForScreen(path) {
  const pathname = String(path || '').split(/[?#]/)[0]
  if (/\/(?:create(?:-[^/]+)?|add|new)(?:\/|$)/.test(pathname)) return 'create'
  if (/\/(?:edit(?:-[^/]+)?)(?:\/|$)/.test(pathname)) return 'edit'
  return 'view'
}
