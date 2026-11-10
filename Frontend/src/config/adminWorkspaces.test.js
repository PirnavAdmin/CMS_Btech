import test from 'node:test'
import assert from 'node:assert/strict'
import { MODULE_REGISTRY } from './moduleRegistry.js'
import { navigationGroups, activeSidebarChild } from './sidebarNavigation.js'
import { ADMIN_WORKSPACES, groupAdminWorkspaces } from './adminWorkspaces.js'

const modules = MODULE_REGISTRY.map(entry => entry.id === 'academic_settings' ? { ...entry, navigation: true } : entry)
const grouped = permissions => groupAdminWorkspaces(navigationGroups({ role: 'admin', access: { collegeId: 7, ...permissions }, selectedCollegeId: 7, modules }))
test('every existing admin destination belongs to a workspace', () => {
  const ids = ADMIN_WORKSPACES.flatMap(workspace => workspace.modules)
  assert.equal(new Set(ids).size, ids.length)
  for (const module of modules.filter(entry => entry.navigation && (entry.sidebarRoles || entry.roles).includes('admin'))) assert.ok(ids.includes(module.id), module.id)
  const old = navigationGroups({ role: 'admin', access: { isSuperAdmin: true }, modules }).flatMap(group => group.items).flatMap(entry => entry.children.length ? entry.children : [entry])
  const next = grouped({ isSuperAdmin: true }).flatMap(group => group.items).filter(entry => !entry.unavailable).flatMap(entry => entry.children.length ? entry.children : [entry])
  const configurationRoutes = ['/college-institution-management', '/academic-year-management', '/rooms-management']
  const expectedExisting = old.map(entry => entry.path).filter(path => !configurationRoutes.includes(path) && !path.startsWith('/fees'))
  assert.deepEqual(new Set(next.map(entry => entry.path).filter(path => !path.startsWith('/fees/'))), new Set(expectedExisting))
  for (const path of ['/fees/types', '/fees/structures', '/fees/students']) assert.ok(next.some(entry => entry.path === path))
  for (const path of configurationRoutes) assert.ok(MODULE_REGISTRY.some(entry => entry.path === path && entry.component))
})
test('Student Fees and its receipts route belong to Fee Management', () => {
  const items = grouped({ isSuperAdmin: true })[0].items
  const fees = items.find(entry => entry.id === 'workspace_fees')
  assert.equal(items.some(entry => entry.id === 'workspace_student_fees'), false)
  assert.deepEqual(fees.children.map(entry => entry.path), ['/fees/types', '/fees/structures', '/fees/students'])
  assert.equal(activeSidebarChild(fees, '/fees/structures/create'), 'fee_structures')
  assert.equal(activeSidebarChild(fees, '/fees/students/receipts'), 'workspace_student_fees')
})
test('grouping cannot add a denied configuration or fee action', () => {
  const items = grouped({ permissions: { rooms: { view: true }, fees: { view: true } } }).flatMap(group => group.items)
  assert.equal(items.some(entry => entry.id === 'workspace_settings'), false)
  const paths = items.filter(entry => !entry.unavailable).flatMap(entry => entry.children.length ? entry.children.map(child => child.path) : [entry.path])
  assert.ok(paths.includes('/rooms-management'))
  assert.equal(paths.includes('/college-institution-management'), false)
  assert.equal(paths.includes('/subject-management'), false)
})
test('Global Settings is one direct entry even with only a permitted configuration module', () => {
  for (const permissions of [{ isSuperAdmin: true }, { permissions: { colleges: { view: true } } }, { permissions: { academic_years: { view: true } } }, { permissions: { academic_settings: { view: true } } }]) {
    const { items } = grouped(permissions)[0]
    assert.equal(items.at(-1).id, 'workspace_settings')
    const settings = items.filter(entry => entry.id === 'workspace_settings')
    assert.equal(settings.length, 1)
    assert.equal(settings[0].path, '/settings')
    assert.deepEqual(settings[0].children, [])
  }
})
test('the merged exam workspace stays active on setup and timetable deep links', () => {
  const exams = grouped({ isSuperAdmin: true })[0].items.find(entry => entry.id === 'workspace_exams')
  assert.equal(activeSidebarChild(exams, '/exam/hall-allocation'), 'examinations')
  assert.equal(activeSidebarChild(exams, '/results/backlog-report'), 'results')
  assert.equal(activeSidebarChild(exams, '/examination-setup'), 'examinations')
})
test('certificates is explicitly unavailable and has no fabricated route', () => {
  const certificates = grouped({ isSuperAdmin: true })[0].items.find(entry => entry.id === 'workspace_certificates')
  assert.equal(certificates.unavailable, true)
  assert.equal(certificates.path, undefined)
  assert.deepEqual(groupAdminWorkspaces([]), [])
})

test('Academic Configuration opens the directory directly and preserves room-only access', () => {
  const academic = grouped({ isSuperAdmin: true })[0].items.find(entry => entry.id === 'workspace_academic')
  assert.deepEqual(academic.children, [])
  assert.equal(academic.path, '/section-management')
  assert.ok(academic.aliases.includes('/rooms-management'))
  const roomsOnly = grouped({ permissions: { rooms: { view: true } } })[0].items.find(entry => entry.id === 'workspace_academic')
  assert.equal(roomsOnly.path, '/rooms-management')
  assert.ok(!roomsOnly.aliases.includes('/section-management'))
})
