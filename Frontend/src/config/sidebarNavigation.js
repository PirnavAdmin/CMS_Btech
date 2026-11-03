import { MODULE_REGISTRY } from './moduleRegistry.js'
import { NAVIGATION_SECTIONS } from './navigationSections.js'
import { hasModuleAction } from '../auth/collegeAuthorization.js'

const cleanPath = pathname => typeof pathname === 'string' ? (pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/') : ''
const matches = (pathname, prefix) => typeof prefix === 'string' && (pathname === prefix || (prefix !== '/' && pathname.startsWith(prefix + '/')))
const ordered = (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id)

// Flatten only explicit sidebar entries; route-only/system registry rows stay out.
export function sidebarEntries(modules = MODULE_REGISTRY) {
  return modules.flatMap(module => [
    ...(module.navigation ? [{ ...module, roles: module.sidebarRoles || module.roles }] : []),
    ...(module.sidebarVariants || []).map(variant => ({ ...module, ...variant, moduleId: module.id, navigation: true })),
  ])
}

// Sidebar visibility only. Existing route guards and backend checks remain authoritative.
export function canDisplaySidebarEntry(entry, access, role, features) {
  if (!entry.roles?.includes(role) || !entry.permission?.module || entry.permission.action !== 'view') return false
  if (!access || typeof access !== 'object') return false
  const featureKey = entry.availability?.featureKey
  if (featureKey && features?.[featureKey] !== true) return false
  if (entry.availability?.status === 'unavailable') return false
  return hasModuleAction(access, entry.permission.module, 'view')
}

export function navigationGroups({ role, access, selectedCollegeId, features, modules = MODULE_REGISTRY, sections = NAVIGATION_SECTIONS }) {
  if (!access || (selectedCollegeId && Object.hasOwn(access, 'collegeId') && String(access.collegeId) !== String(selectedCollegeId))) return []
  const seen = new Set()
  const visible = sidebarEntries(modules).filter(entry => canDisplaySidebarEntry(entry, access, role, features)).sort(ordered)
    .filter(entry => {
      if (seen.has(entry.id) || seen.has(entry.path)) return false
      seen.add(entry.id); seen.add(entry.path); return true
    }).map(entry => ({ ...entry, children: (entry.children || []).filter(child => canDisplaySidebarEntry({
      ...entry, ...child,
      permission: Object.hasOwn(child, 'permission') ? child.permission : entry.permission,
    }, access, role, features)).sort(ordered) }))
  return [...sections].sort(ordered).map(section => ({ ...section, items: visible.filter(entry => entry.section === section.id) })).filter(section => section.items.length)
}

// Compare all role-eligible entries, including denied ones, to avoid selecting a
// broad parent such as Faculty Directory for an attendance route it does not own.
export function activeSidebarEntry(pathname, role, entries = sidebarEntries()) {
  const path = cleanPath(pathname)
  return entries.filter(entry => entry.roles?.includes(role) && !(entry.activeExcludes || []).some(prefix => matches(path, prefix)))
    .flatMap(entry => [entry.path, ...(entry.aliases || []), ...(entry.children || []).flatMap(child => [child.path, ...(child.aliases || [])])]
      .filter(prefix => matches(path, prefix)).map(prefix => ({ entry, length: prefix.length })))
    .sort((a, b) => b.length - a.length || ordered(a.entry, b.entry))[0]?.entry.id || null
}

export function activeSidebarChild(entry, pathname) {
  const path = cleanPath(pathname)
  return (entry.children || []).flatMap(child => [child.path, ...(child.aliases || [])]
    .filter(prefix => matches(path, prefix)).map(prefix => ({ child, length: prefix.length })))
    .sort((a, b) => b.length - a.length)[0]?.child.id || null
}
