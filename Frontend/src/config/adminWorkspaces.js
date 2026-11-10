// Presentation grouping only. Filter existing leaf permissions before grouping.
export const ADMIN_WORKSPACES = Object.freeze([
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', modules: ['dashboard'] },
  { id: 'academic_structure', label: 'Program Configuration', icon: 'layers-3', modules: ['academic_structure'] },
  { id: 'academic', label: 'Academic Configuration', icon: 'network', modules: ['departments', 'courses', 'branches', 'semesters', 'sections', 'rooms'] },
  { id: 'fees', label: 'Fee Management', icon: 'wallet-cards', modules: ['fee_management'] },
  { id: 'students', label: 'Student Management', icon: 'contact-round', modules: ['student_admissions', 'student_profiles', 'student_promotions'] },
  { id: 'faculty', label: 'Faculty & Staff', icon: 'briefcase-business', modules: ['faculty_directory', 'faculty_leaves', 'faculty_payroll'] },
  { id: 'subjects', label: 'Subjects & Curriculum', icon: 'notebook-tabs', modules: ['subjects', 'electives', 'credits', 'timetable'] },
  { id: 'attendance', label: 'Attendance', icon: 'clipboard-check', modules: ['student_attendance', 'faculty_attendance'] },
  { id: 'exams', label: 'Exams & Results', icon: 'file-pen-line', modules: ['examinations', 'marks', 'results'] },
  { id: 'administration', label: 'Administration', icon: 'shield-check', modules: ['user_access', 'roles_permissions'] },
  { id: 'campus', label: 'Campus Services', icon: 'building-2', modules: ['library', 'meetings_events', 'placement'] },
  { id: 'settings', label: 'Global Settings', icon: 'settings', path: '/settings', modules: ['academic_settings', 'colleges', 'academic_years'] },
])
export const adminWorkspaceForModule = moduleId => ADMIN_WORKSPACES.find(workspace => workspace.modules.includes(moduleId))
export function groupAdminWorkspaces(groups) {
  const byId = new Map(groups.flatMap(group => group.items).map(entry => [entry.id, entry]))
  const items = ADMIN_WORKSPACES.flatMap(workspace => {
    const members = workspace.modules.map(id => byId.get(id)).filter(Boolean)
    if (!members.length) return []
    const paths = new Set()
    const children = members.flatMap(entry => entry.children.length ? entry.children.map(child => ({ ...entry, ...child, aliases: child.aliases || [], moduleId: entry.id, children: [] })) : [{ ...entry, children: [] }])
      .filter(entry => { if (paths.has(entry.path)) return false; paths.add(entry.path); return true })
    const spatialDirectory = workspace.id === 'academic'
      ? children.find(entry => entry.id === 'sections' || entry.id === 'rooms')
      : undefined
    const directPath = workspace.path || spatialDirectory?.path
    return [{
      ...members[0],
      id: `workspace_${workspace.id}`,
      label: workspace.label,
      icon: workspace.icon,
      children: !directPath && children.length > 1 ? children : [],
      path: directPath || children[0].path,
      aliases: members.flatMap(entry => [entry.path, ...entry.aliases]),
      members,
    }]
  })
  if (!items.length) return []
  const certificatesIndex = items.findIndex(item => ['workspace_administration', 'workspace_settings'].includes(item.id))
  items.splice(certificatesIndex === -1 ? items.length : certificatesIndex, 0, { id: 'workspace_certificates', label: 'Certificates', icon: 'file-check-2', children: [], unavailable: true })
  return [{ id: 'workspaces', label: 'Management', order: 10, items }]
}
