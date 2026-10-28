const key = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
const granted = value => value === true || value === 1 || value === 'true' || value === '1'

// Personal workspaces use the authenticated employee role. The role matrix
// controls access to shared administrative modules, not the workspace shell.
const workspaceScreens = {
  faculty: ['dashboard', 'students', 'subjects', 'attendance', 'my-attendance', 'marks', 'timetable', 'materials', 'leave', 'events', 'placements', 'notifications', 'profile'],
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
const routes = [
  ['/faculty/attendance', 'faculty_attendance'], ['/faculty/leave-management', 'faculty_leaves'], ['/faculty/payroll', 'faculty_payroll'], ['/faculty', 'faculty_directory'],
  ['/student-management/admissions', 'student_admissions'], ['/student-management/profiles', 'student_profiles'], ['/student-management/attendance', 'student_attendance'], ['/student-management/promotions', 'student_promotions'],
  ['/college-institution-management', 'colleges'], ['/academic-year-management', 'academic_years'], ['/department-management', 'departments'], ['/courses', 'courses'], ['/branches', 'branches'], ['/semester-management', 'semesters'], ['/section-management', 'sections'], ['/rooms-management', 'rooms'], ['/rooms', 'rooms'],
  ['/subject-management', 'subjects'], ['/credits-management', 'credits'], ['/elective-management', 'electives'], ['/timetable', 'timetable'], ['/marks-management', 'marks'], ['/grade-result-management', 'results'], ['/results', 'results'], ['/exam', 'examinations'], ['/exam-timetable', 'examinations'], ['/examination-setup', 'examinations'], ['/examination', 'examinations'], ['/fees', 'fees'], ['/roles-', 'roles_permissions'], ['/settings', 'academic_settings'], ['/library', 'library'], ['/meetings-events', 'meetings_events'], ['/placement', 'placement'],
]

export const additionalScreens = [
  ['/subject-management', 'Subject Management'], ['/timetable', 'Timetable Management'], ['/student-management/profiles', 'Student Profiles'], ['/student-management/attendance', 'Student Attendance'], ['/marks-management/marks-entry', 'Marks Management'], ['/faculty/leave-management', 'Faculty Leave Management'],
  ['/college-institution-management', 'Colleges'], ['/academic-year-management', 'Academic Years'], ['/department-management', 'Departments'], ['/courses', 'Courses'], ['/branches', 'Branches'], ['/semester-management', 'Semesters'], ['/section-management', 'Sections'], ['/rooms-management', 'Rooms & Classrooms'],
  ['/faculty', 'Faculty Directory'], ['/faculty/attendance', 'Faculty Attendance'], ['/faculty/payroll', 'Faculty Payroll'], ['/student-management/admissions', 'Student Admissions'], ['/student-management/promotions', 'Student Promotions'], ['/credits-management', 'Credits'], ['/elective-management', 'Electives'], ['/examination-setup', 'Examination Setup'], ['/exam-timetable', 'Exam Timetable'], ['/results', 'Official Results'], ['/grade-result-management', 'Grade Management'], ['/fees', 'Fee Management'], ['/library', 'Library'], ['/meetings-events', 'Meetings / Events'], ['/placement', 'Placement'], ['/roles-designations', 'Roles & Designations'], ['/settings', 'Settings'],
]

export function canViewScreen(path, role, permissions) {
  if (role === 'admin') return true
  if (isPersonalWorkspace(path, role)) return true
  const portal = path.match(/^\/(faculty|student|staff)-portal(?:\/([^/]+))?\/?$/)
  if (portal) {
    if (portal[1] !== role) return false
    const screen = portal[2] || 'dashboard'
    return permissions[portalModules[screen]]?.view === true
  }
  if (role === 'student') return false
  if (path === '/dashboard') return permissions.dashboard?.view === true
  if (path === '/my-profile') return permissions.my_profile?.view === true
  const module = routes.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`) || (prefix.endsWith('-') && path.startsWith(prefix)))?.[1]
  return Boolean(module && permissions[module]?.view === true)
}
