import test from 'node:test'
import assert from 'node:assert/strict'
import { MODULE_REGISTRY, findModuleForPath } from '../../config/moduleRegistry.js'
import { ADMIN_WORKSPACES, groupAdminWorkspaces } from '../../config/adminWorkspaces.js'
import { navigationGroups, sidebarEntries } from '../../config/sidebarNavigation.js'
import { SYSTEM_MODULES } from '../admin-management/systemPermissionModules.js'
import { permissionModuleForScreen } from '../../auth/screenPermissions.js'
import { hasModuleAction } from '../../auth/collegeAuthorization.js'
import { isPersonalWorkspace } from '../../auth/screenPermissions.js'
import { facultyRouteByPath } from '../../features/faculty/routeConfig.js'
import { facultyNavigation, studentNavigation } from '../../components/portals/portalNavigation.js'

test('syllabus workspace has a college-scoped route and role-matrix permission', () => {
  const module = MODULE_REGISTRY.find(entry => entry.id === 'syllabus_management')
  assert.equal(module.path, '/syllabus-management')
  assert.equal(module.scope, 'college')
  assert.equal(module.permission.module, 'syllabus_management')
  assert.equal(findModuleForPath('/syllabus-management/12'), module)
  assert.equal(permissionModuleForScreen('/syllabus-management/12'), 'syllabus_management')
  assert.ok(SYSTEM_MODULES.some(entry => entry.id === 'syllabus_management'))
})

test('syllabus appears below Subjects & Curriculum only when view permission is granted', () => {
  assert.ok(ADMIN_WORKSPACES.find(workspace => workspace.id === 'subjects').modules.includes('syllabus_management'))
  const permissions = {
    subjects: { view: true }, syllabus_management: { view: true },
    electives: { view: true }, timetable: { view: true },
  }
  const granted = navigationGroups({ role: 'admin', access: { permissions } })
  const denied = navigationGroups({ role: 'admin', access: { permissions: { syllabus_management: { view: false } } } })
  const workspace = groupAdminWorkspaces(granted)[0].items.find(entry => entry.id === 'workspace_subjects')
  const links = sidebarEntries(MODULE_REGISTRY)
  assert.ok(links.some(entry => entry.path === '/syllabus-management'))
  assert.ok(workspace.children.some(entry => entry.path === '/syllabus-management'))
  assert.equal(denied.flatMap(group => group.items).some(entry => entry.path === '/syllabus-management'), false)
  const legacySubjectView = { permissions: { subjects: { view: true } } }
  assert.equal(hasModuleAction(legacySubjectView, 'syllabus_management', 'view'), true)
  assert.equal(hasModuleAction(legacySubjectView, 'syllabus_management', 'create'), false)
  assert.equal(hasModuleAction({ permissions: { subjects: { view: true }, syllabus_management: { view: false } } }, 'syllabus_management', 'view'), false)
  const legacyWorkspace = groupAdminWorkspaces(navigationGroups({ role: 'admin', access: legacySubjectView }))[0].items.find(entry => entry.id === 'workspace_subjects')
  assert.ok(legacyWorkspace.children.some(entry => entry.path === '/syllabus-management'))
})

test('faculty and student portals expose their published syllabus library', () => {
  assert.ok(facultyNavigation.some(([screen]) => screen === 'syllabus'))
  assert.ok(studentNavigation.some(([screen]) => screen === 'syllabus'))
  assert.equal(facultyRouteByPath['/faculty-portal/syllabus'].screen, 'syllabus')
  assert.equal(isPersonalWorkspace('/faculty-portal/syllabus', 'faculty'), true)
  assert.equal(isPersonalWorkspace('/student-portal/syllabus', 'student'), true)
})
