import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { MODULE_REGISTRY, MODULE_BY_ID, findModuleForPath } from './moduleRegistry.js'
import { NAVIGATION_SECTIONS } from './navigationSections.js'
import { permissionModuleForScreen } from '../auth/screenPermissions.js'
const frontend = new URL('../../', import.meta.url)
const source = path => readFileSync(new URL(path, frontend), 'utf8')
const inventory = JSON.parse(source('docs/stage-1/screen-inventory.json'))

test('registry has unique immutable IDs, paths, sections and valid component sources', () => {
 assert.equal(new Set(MODULE_REGISTRY.map(row => row.id)).size, MODULE_REGISTRY.length)
 assert.equal(new Set(MODULE_REGISTRY.map(row => row.path)).size, MODULE_REGISTRY.length)
 for (const module of MODULE_REGISTRY) {
  assert.equal(MODULE_BY_ID[module.id], module)
  assert.ok(Object.isFrozen(module)); assert.ok(Object.isFrozen(module.children))
  assert.ok(NAVIGATION_SECTIONS.some(section => section.id === module.section))
  assert.ok(existsSync(new URL(module.component, frontend)), module.component)
  assert.ok(Number.isFinite(module.order))
  assert.equal(module.availability.featureKey, null)
 }
})
test('visible module metadata uses existing permission keys; null never encodes an access grant', () => {
 for (const module of MODULE_REGISTRY) {
  if (module.navigation) assert.ok(module.permission?.module, module.id)
  if (module.permission) { assert.equal(permissionModuleForScreen(module.path), module.permission.module); assert.equal(module.permission.action, 'view') }
  else { assert.equal(module.navigation, false); assert.ok(['existing-role-guard', 'existing-public-route'].includes(module.authorization)) }
 }
 assert.equal(MODULE_BY_ID.fee_structures.permission.module, 'fees')
 assert.equal(MODULE_BY_ID.fee_management.permission.module, 'fees')
 assert.equal(MODULE_BY_ID.academic_levels, undefined)
})
test('descriptive ownership respects path boundaries, aliases and finance specificity', () => {
 for (const path of ['/fees/structures/create', '/fees/structures/hostel/1/edit', '/fees/components', '/fees/legacy']) assert.equal(findModuleForPath(path)?.id, 'fee_structures')
 for (const path of ['/fees', '/fees/collection', '/fees/ledger/1']) assert.equal(findModuleForPath(path)?.id, 'fee_management')
 assert.equal(findModuleForPath('/faculty/attendance/1')?.id, 'faculty_attendance')
 assert.equal(findModuleForPath('/rooms/1')?.id, 'rooms')
 assert.equal(findModuleForPath('/roles-permissions')?.id, 'roles_permissions')
 assert.equal(findModuleForPath('/results/semester-result')?.id, 'results')
 assert.equal(findModuleForPath('/courses/1/edit?from=list#form')?.id, 'courses')
 for (const path of ['/fees-other', '/faculty-other', '/unknown', null, 'courses']) assert.equal(findModuleForPath(path), null)
})
test('audit includes all literal App routes and resolves nested fee facility and portal configurations', () => {
 for (const [, path] of source('src/App.jsx').matchAll(/\bpath="([^"]+)"/g)) assert.ok(inventory.screens.some(row => row.route === path), path)
 for (const path of ['/fees/structures/hostel/create', '/fees/structures/transport/:facilityId/edit', '/faculty-portal/leave', '/student-portal/fees', '/staff-portal/documents', '/faculty/:id/edit']) assert.ok(inventory.screens.some(row => row.route === path), path)
 assert.ok(inventory.screens.every(row => row.moduleId))
 assert.ok(inventory.screens.every(row => !row.source.includes('.test.')))
 const fee = inventory.screens.find(row => row.route === '/fees/structures/create')
 assert.deepEqual(fee.roles, ['admin'])
 assert.deepEqual(inventory.screens.find(row => row.route === '/exam/student-schedule').roles, ['admin'])
 assert.deepEqual(inventory.duplicates.map(row => row.route), [])
})

// Stage 2 sidebar-only behavior. No route-guard or API authorization replacement.
import { sidebarEntries, navigationGroups, activeSidebarEntry, activeSidebarChild } from './sidebarNavigation.js'
const superAccess = { isSuperAdmin: true, collegeId: 7, permissions: {} }
const flatten = groups => groups.flatMap(group => group.items)

test('dynamic sidebar generates the existing ERP order from registry entries with no duplicates', () => {
 const groups = navigationGroups({ role: 'admin', access: superAccess, selectedCollegeId: '7' })
 assert.deepEqual(groups.map(group => group.id), ['dashboard', 'collegeSetup', 'finance', 'faculty', 'students', 'curriculum', 'examinations', 'campus', 'access'])
 assert.equal(flatten(groups).length, 31)
 assert.equal(new Set(flatten(groups).map(row => row.path)).size, 31)
 assert.deepEqual(groups.find(group => group.id === 'finance').items.map(row => row.label), ['Fee Structure', 'Fee Management'])
 const added = { ...MODULE_BY_ID.rooms, id: 'test_configured_module', path: '/test-configured-module', label: 'Configured module', order: 5 }
 const extended = navigationGroups({ role: 'admin', access: superAccess, modules: [...MODULE_REGISTRY, added] })
 assert.equal(extended.find(group => group.id === 'collegeSetup').items[0].id, added.id)
})
test('sidebar denies missing, malformed and false permissions, including null mappings for Super Admin', () => {
 for (const access of [null, {}, { permissions: {} }, { permissions: { fees: { view: 'false' } } }, { permissions: { fees: { view: 'true' } } }]) assert.deepEqual(navigationGroups({ role: 'admin', access }), [])
 const fees = flatten(navigationGroups({ role: 'admin', access: { permissions: { fees: { view: true } } } }))
 assert.deepEqual(fees.map(row => row.id), ['fee_structures', 'fee_management'])
 assert.deepEqual(navigationGroups({ role: 'unknown', access: superAccess }), [])
 const unmapped = { ...MODULE_BY_ID.rooms, permission: null }
 assert.deepEqual(navigationGroups({ role: 'admin', access: superAccess, modules: [unmapped] }), [])
})
test('sidebar separates a missing setup context from unauthorized college responses', () => {
 assert.equal(flatten(navigationGroups({ role: 'admin', access: superAccess })).length, 31)
 assert.deepEqual(navigationGroups({ role: 'admin', access: superAccess, selectedCollegeId: '8' }), [])
 const rooms = { permissions: { rooms: { view: true } }, collegeId: 7 }
 assert.deepEqual(flatten(navigationGroups({ role: 'admin', access: rooms, selectedCollegeId: '7' })).map(row => row.id), ['rooms'])
})
test('feature filtering uses explicit configured flags without inventing a live API contract', () => {
 const feature = { ...MODULE_BY_ID.rooms, availability: { featureKey: 'test_feature' } }
 assert.deepEqual(navigationGroups({ role: 'admin', access: superAccess, modules: [feature] }), [])
 assert.equal(flatten(navigationGroups({ role: 'admin', access: superAccess, modules: [feature], features: { test_feature: true } })).length, 1)
 assert.deepEqual(navigationGroups({ role: 'admin', access: superAccess, modules: [feature], features: { test_feature: false } }), [])
})
test('active ownership handles deep links, old aliases and role-specific variants', () => {
 for (const path of ['/fees/structures/hostel/2/edit', '/fees/legacy', '/fees/components']) assert.equal(activeSidebarEntry(path, 'admin'), 'fee_structures')
 assert.equal(activeSidebarEntry('/fees/collection', 'admin'), 'fee_management')
 assert.equal(activeSidebarEntry('/faculty/attendance', 'admin'), 'faculty_attendance')
 assert.equal(activeSidebarEntry('/faculty/advisors', 'admin'), null)
 assert.equal(activeSidebarEntry('/fees-other', 'admin'), null)
 assert.equal(activeSidebarEntry('/rooms/4', 'admin'), 'rooms')
 assert.equal(activeSidebarEntry('/roles-permissions', 'admin'), 'roles_permissions')
 assert.equal(activeSidebarEntry('/exam/hall-allocation', 'admin'), 'examinations')
 assert.equal(activeSidebarEntry('/exam/hall-allocation', 'admin'), 'examinations')
 assert.equal(activeSidebarEntry('/grade-result-management/cgpa-calculator', 'admin'), 'results')
 assert.equal(activeSidebarEntry('/timetable', 'faculty'), 'my_timetable')
 assert.equal(activeSidebarEntry('/student-management/attendance/take', 'faculty'), 'record_attendance')
})
test('role-specific sidebar links preserve existing destinations under explicit permissions', () => {
 const access = { permissions: { subjects: { view: true }, timetable: { view: true }, student_attendance: { view: true }, library: { view: true } } }
 const faculty = flatten(navigationGroups({ role: 'faculty', access }))
 assert.deepEqual(faculty.map(row => row.id), ['my_subjects', 'my_timetable', 'record_attendance', 'library'])
 assert.deepEqual(faculty.map(row => row.path), ['/my-subjects', '/timetable', '/student-management/attendance/take', '/library'])
 assert.deepEqual(flatten(navigationGroups({ role: 'student', access })).map(row => row.id), ['my_subjects', 'library'])
 assert.deepEqual(flatten(navigationGroups({ role: 'staff', access })).map(row => row.id), ['library'])
 assert.ok(sidebarEntries().every(entry => entry.permission?.module))
})
test('children inherit explicit parent permissions, and null child permissions never grant access', () => {
 const parent = { ...MODULE_BY_ID.examinations, children: [
  { id: 'inherit', path: '/test/inherit', label: 'Inherited' },
  { id: 'deny', path: '/test/deny', label: 'Denied', permission: null },
 ] }
 const groups = navigationGroups({ role: 'admin', access: superAccess, modules: [parent] })
 assert.deepEqual(groups[0].items[0].children.map(child => child.id), ['inherit'])
})
