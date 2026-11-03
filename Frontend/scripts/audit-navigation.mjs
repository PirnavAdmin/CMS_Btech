import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULE_REGISTRY, findModuleForPath } from '../src/config/moduleRegistry.js'
import { facultyRoutes } from '../src/features/faculty/routeConfig.js'
import { studentNavigation } from '../src/components/portals/portalNavigation.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(resolve(root, file), 'utf8')
const files = dir => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
// Read JSX opening tags without ending at a nested element or an arrow in a prop.
function openingEnd(source, start) {
  let braces = 0, quote = ''
  for (let index = start; index < source.length; index++) {
    const char = source[index]
    if (quote) { if (char === '\\') index++; else if (char === quote) quote = ''; continue }
    if (['"', "'", '`'].includes(char)) { quote = char; continue }
    if (char === '{') braces++
    if (char === '}') braces--
    if (char === '>' && braces === 0) return index + 1
  }
  throw new Error('Unterminated Route opening tag')
}
function attribute(tag, name) {
  const found = new RegExp(`\\b${name}\\s*=\\s*`).exec(tag)
  if (!found) return null
  const start = found.index + found[0].length, first = tag[start]
  if (first === '"' || first === "'") return tag.slice(start + 1, tag.indexOf(first, start + 1))
  let depth = 0, quote = ''
  for (let index = start; index < tag.length; index++) {
    const char = tag[index]
    if (quote) { if (char === '\\') index++; else if (char === quote) quote = ''; continue }
    if (['"', "'", '`'].includes(char)) { quote = char; continue }
    if (char === '{') depth++
    if (char === '}' && --depth === 0) return tag.slice(start + 1, index)
  }
  return null
}
function imports(source, file) {
  const result = {}
  const target = value => value.startsWith('.') ? relative(root, resolve(root, dirname(file), value)).replaceAll('\\', '/') + (/\.[jt]sx?$/.test(value) ? '' : '.jsx') : value
  for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)) for (const name of match[1].split(',')) result[name.trim().split(/\s+as\s+/).at(-1)] = target(match[2])
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)) result[match[1]] = target(match[2])
  for (const match of source.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g)) result[match[1]] = target(match[2])
  return result
}
function pathsFor(value) {
  if (value == null) return null
  if (value.includes('${type}')) return ['hostel', 'transport'].map(type => value.replaceAll('`', '').replace('${type}', type))
  if (value.startsWith('facultyRouteByPath')) return [value.match(/\['([^']+)'\]/)?.[1]].filter(Boolean)
  return [value]
}
const join = (base, path) => !base && path === '*' ? '*' : path.startsWith('/') ? path : `${base.replace(/\/$/, '')}/${path}`.replace(/\/{2,}/g, '/')
const pattern = (path, element) => element.includes('<Navigate') || element.includes('<RoleAlias') ? 'Redirect' : /create|\/add$|\/new$|\/edit$|\/take$|\/approval$/.test(path) || /mode="(?:form|edit)"|formMode|<MarksEntry|<BulkMarksUpload/.test(element) ? 'Form' : /report|memo|result|payroll/.test(path) ? 'Report / List' : /dashboard|overview/.test(path) ? 'Dashboard' : /:[^/]+$|\/view$/.test(path) ? 'View / route-dependent' : 'List / Workspace'
const screenPermissionSource = read('src/auth/screenPermissions.js')
const portalPermissionObject = screenPermissionSource.match(/const portalModules = (\{[^\n]+\})/)?.[1] || ''
const portalPermissions = Object.fromEntries([...portalPermissionObject.matchAll(/(?:'([^']+)'|(\w+)):\s*'([^']+)'/g)].map(match => [match[1] || match[2], match[3]]))
const portalIcons = Object.fromEntries([...read('src/layouts/PortalLayout.jsx').matchAll(/(?:'([^']+)'|(\w+)):\s*\[(Fi\w+),/g)].map(match => [match[1] || match[2], match[3]]))
const inventory = []
for (const file of files('src').filter(file => file.endsWith('.jsx') && !/\.(?:vitest\.)?test\./.test(file))) {
  const source = read(file)
  if (!/<Route\b/.test(source)) continue
  const imported = imports(source, file), stack = [], matcher = /<\/?Route\b/g
  for (let match; (match = matcher.exec(source));) {
    if (match[0].startsWith('</')) { stack.pop(); continue }
    const end = openingEnd(source, match.index), tag = source.slice(match.index, end)
    matcher.lastIndex = end
    const own = pathsFor(attribute(tag, 'path')), base = stack.at(-1)?.paths || [file.includes('/fees/') ? '/fees' : '']
    const paths = own ? base.flatMap(parent => own.map(path => join(parent, path))) : base
    const declaredRoles = [...tag.matchAll(/ROLES\.(ADMIN|FACULTY|STUDENT|STAFF)/g)].map(row => row[1].toLowerCase())
    const inherited = stack.at(-1)?.roles || (file.includes('/fees/') ? ['admin'] : [])
    const roles = declaredRoles.length ? inherited.length ? inherited.filter(role => declaredRoles.includes(role)) : [...new Set(declaredRoles)] : inherited
    const element = attribute(tag, 'element') || ''
    const names = [...element.matchAll(/<([A-Z]\w*)\b/g)].map(row => row[1])
    const component = names.filter(name => !['AcademicProvider', 'FacultyRouteErrorBoundary', 'ProtectedRoute', 'RoleDashboard', 'PortalRoute'].includes(name))[0] || names[0] || null
    if (own || /\bindex\b/.test(tag)) for (const path of paths) {
      const module = path === '*' ? MODULE_REGISTRY.find(module => module.id === 'landing') : findModuleForPath(path)
      inventory.push({ moduleId: module?.id || null, moduleName: module?.label || 'Unclassified / system route', route: path || '/', component,
        componentFile: imported[component] || (component ? file : null), source: `${file}:${source.slice(0, match.index).split('\n').length}`,
        permission: module?.permission?.module || null, roles: path === '/dashboard' ? ['admin', 'faculty', 'student', 'staff'] : roles,
        guard: (file.includes('/fees/') ? ['App.jsx PortalRoute + ProtectedRoute (admin)'] : []).concat(stack.map(row => row.guard).filter(Boolean)).concat(names.filter(name => ['RoleDashboard', 'ProtectedRoute', 'PortalRoute'].includes(name))).join(' → ') || 'No role guard declared here',
        scope: module?.scope || 'unclassified', dependencies: /\/fees\/structures\/(hostel|transport)(?:\/|$)/.test(path) ? ['college', 'academicYear'] : module?.prerequisites || [], icon: module?.icon || null,
        uiPattern: pattern(path, element), redirect: component === 'Navigate' ? attribute(element.slice(element.indexOf('<Navigate')), 'to') : null,
        kind: component ? 'screen-or-redirect' : 'nested-container' })
    }
    if (!tag.endsWith('/>')) stack.push({ paths, roles, guard: names.filter(name => ['ProtectedRoute', 'PortalRoute'].includes(name)).join('+') })
  }
}
// Concrete screens behind parameterized portal routes, from their existing definitions.
for (const route of facultyRoutes) inventory.push({ moduleId: 'faculty_portal', moduleName: 'Faculty Portal', route: route.path, component: route.screen === 'dashboard' ? 'FacultyDashboardPage' : 'FacultyWorkspacePage', componentFile: route.screen === 'dashboard' ? 'src/features/faculty/dashboard/pages/FacultyDashboardPage.jsx' : 'src/features/faculty/FacultyWorkspacePage.jsx', source: 'src/features/faculty/routeConfig.js', permission: portalPermissions[route.screen] || null, roles: ['faculty'], guard: 'PortalRoute + existing useScreenAccess/personal-workspace rules', scope: 'assigned-college', dependencies: [], icon: portalIcons[route.screen] || 'FiGrid', uiPattern: route.screen === 'dashboard' ? 'Dashboard' : 'Workspace', kind: 'configured-screen', title: route.title })
for (const [screen, title] of studentNavigation) inventory.push({ moduleId: 'student_portal', moduleName: 'Student Portal', route: `/student-portal/${screen}`, component: 'AcademicPortal', componentFile: 'src/pages/portals/AcademicPortal.jsx', source: 'src/components/portals/portalNavigation.js', permission: portalPermissions[screen] || null, roles: ['student'], guard: 'PortalRoute + existing useScreenAccess screen mapping; no invented blanket permission', scope: 'assigned-college', dependencies: [], icon: portalIcons[screen] || 'FiGrid', uiPattern: screen === 'dashboard' ? 'Dashboard' : 'Workspace', kind: 'configured-screen', title })
const staffSource = read('src/pages/staff-portal/StaffPortalLayout.jsx')
for (const match of staffSource.matchAll(/\{ key: '([^']+)', label: '([^']+)', path: '([^']+)', icon: (Fi\w+)/g)) inventory.push({ moduleId: 'staff_portal', moduleName: 'Staff Portal', route: match[3], component: 'StaffPortal', componentFile: 'src/pages/staff-portal/StaffPortal.jsx', source: 'src/pages/staff-portal/StaffPortalLayout.jsx', permission: null, roles: ['staff'], guard: 'PortalRoute + existing personal-workspace rules', scope: 'assigned-college', dependencies: [], icon: match[4], uiPattern: match[1] === 'dashboard' ? 'Dashboard' : 'Workspace', kind: 'configured-screen', title: match[2] })
// Existing wildcard-dispatched administrator faculty screens and staff aliases.
for (const [route, component, file] of [
  ['/faculty/new', 'FacultyManagement', 'src/pages/faculty/FacultyManagement.jsx'], ['/faculty/:id', 'FacultyManagement', 'src/pages/faculty/FacultyManagement.jsx'], ['/faculty/:id/edit', 'FacultyManagement', 'src/pages/faculty/FacultyManagement.jsx'], ['/faculty/attendance', 'FacultyManagement', 'src/pages/faculty/FacultyManagement.jsx'], ['/faculty/advisors', 'Navigate', 'src/pages/faculty/FacultyManagement.jsx'], ['/faculty/subjects', 'Navigate', 'src/pages/faculty/FacultyManagement.jsx'], ['/student-management/attendance/take', 'Attendance', 'src/pages/attendance/Attendance.jsx'], ['/staff-portal/profile', 'StaffPortal', 'src/pages/staff-portal/StaffPortal.jsx'], ['/staff-portal/attendance', 'StaffPortal', 'src/pages/staff-portal/StaffPortal.jsx'],
]) { const module = findModuleForPath(route); inventory.push({ moduleId: module.id, moduleName: module.label, route, component, componentFile: file, source: file, permission: module.permission?.module || null, roles: route.startsWith('/staff-portal') ? ['staff'] : ['admin'], guard: 'Inherited App.jsx route guard + pathname dispatcher', scope: module.scope, dependencies: module.prerequisites, icon: module.icon, uiPattern: pattern(route, component === 'Navigate' ? '<Navigate' : ''), kind: 'pathname-dispatch' }) }
const duplicates = Object.entries(Object.groupBy(inventory.filter(row => row.kind === 'screen-or-redirect' && row.source.startsWith('src/App.jsx:')), row => row.route)).filter(([, rows]) => rows.length > 1).map(([route, rows]) => ({ route, sources: rows.map(row => row.source) }))
const output = resolve(root, 'docs/stage-1'); mkdirSync(output, { recursive: true })
const pageFiles = files('src/pages').filter(file => file.endsWith('.jsx') && !/\.(?:vitest\.)?test\./.test(file)).map(file => ({ file, referencedByInventory: inventory.some(row => row.componentFile === file || row.source === file), note: 'A source file is not necessarily a distinct routed screen; private panels/dialogs remain in their owning workspace.' }))
writeFileSync(resolve(output, 'page-files.json'), JSON.stringify(pageFiles, null, 2) + '\n')
writeFileSync(resolve(output, 'screen-inventory.json'), JSON.stringify({ method: 'JSX Route source scan plus existing portal configs and audited pathname dispatchers; not a runtime reachability assertion. Rows retain redirect aliases and duplicate declarations.', duplicates, screens: inventory }, null, 2) + '\n')
const escape = value => String(value ?? 'Unmapped; existing guard only').replaceAll('|', '\\|').replaceAll('\n', ' ')
const lines = ['# Stage 1 screen inventory', '', 'Generated with `node scripts/audit-navigation.mjs`. This is observed source metadata, not a new permission policy. Dependencies summarize record configuration; each screen validator remains authoritative. Container and redirect rows are included deliberately. Unknown mappings remain null.', '', `**${inventory.length} source/configuration entries; ${new Set(inventory.map(row => row.route)).size} distinct route patterns.**`, '', '| Module ID / current name | Route | Component / file | Icon | Permission | Effective route roles / guard | Scope | Record dependencies | UI pattern | Source |', '|---|---|---|---|---|---|---|---|---|---|']
for (const row of inventory) lines.push(`| ${[`${row.moduleId} / ${row.title || row.moduleName}`, row.route, `${row.component || 'Container'} — ${row.componentFile || 'No component'}`, row.icon, row.permission, `${row.roles.join(', ') || 'Public or wrapper-dependent'}; ${row.guard}`, row.scope, row.dependencies.join(', ') || 'None observed at route level', row.uiPattern, row.source].map(escape).join(' | ')} |`)
writeFileSync(resolve(output, 'screen-inventory.md'), lines.join('\n') + '\n')
const moduleLines = ['# Module, icon and permission registry', '', 'Stage 1 records existing labels and URLs. Academic Levels is excluded because no standalone route exists. Role portal modules do not imply a blanket backend permission. Null permissions never authorize access; the registry does not implement authorization.', '', '| ID | Current label | Existing path | Section | Lucide icon ID | Existing permission key | App role eligibility | Scope |', '|---|---|---|---|---|---|---|---|']
for (const module of MODULE_REGISTRY) moduleLines.push(`| ${[module.id, module.label, module.path, module.section, module.icon, module.permission?.module, module.roles.join(', ') || 'Public / special-purpose route', module.scope].map(escape).join(' | ')} |`)
writeFileSync(resolve(output, 'module-inventory.md'), moduleLines.join('\n') + '\n')
console.log(JSON.stringify({ modules: MODULE_REGISTRY.length, inventoryEntries: inventory.length, distinctRoutes: new Set(inventory.map(row => row.route)).size, duplicateDeclarations: duplicates, unclassified: inventory.filter(row => !row.moduleId).map(row => row.route) }, null, 2))
