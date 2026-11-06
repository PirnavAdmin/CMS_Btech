import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { MODULE_REGISTRY } from '../src/config/moduleRegistry.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reference = resolve(process.argv.find(arg => arg.startsWith('--reference='))?.slice(12) || 'C:/Users/ADMIN/Desktop/cms inter/CMS_Inter/Frontend')
const output = resolve(root, 'docs/inter-reference')
mkdirSync(output, { recursive: true })
const read = path => readFileSync(path, 'utf8')
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)])
const rel = (base, path) => relative(base, path).replaceAll('\\', '/')
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const sources = base => walk(resolve(base, 'src')).filter(path => /\.(?:jsx?|css)$/.test(path))
const candidates = (text, expression) => [...new Set([...text.matchAll(expression)].map(match => match[1]))]
const inspect = base => sources(base).map(path => {
  const text = read(path)
  return { path: rel(base, path), bytes: Buffer.byteLength(text), sha256: hash(path),
    imports: candidates(text, /(?:from\s*|import\s*)['"]([^'"]+)['"]/g),
    routes: candidates(text, /\bpath=["']([^"']+)["']/g),
    fieldCandidates: candidates(text, /(?:name|htmlFor)=["']([^"']+)["']/g),
    exports: candidates(text, /export\s+(?:(?:async\s+)?function|const|class)\s+(\w+)/g),
    validationEvidence: text.split(/\r?\n/).flatMap((line, i) => /required|validate|\.min\(|\.max\(|\.refine\(|duplicate|already exists/i.test(line) ? [{ line: i + 1, source: line.trim().slice(0, 600) }] : []),
    requestEvidence: text.split(/\r?\n/).flatMap((line, i, lines) => /\b(?:request|apiRequest|fetch|authenticatedRequest)\(|\b\w+(?:Api|Client|API)\.(?:get|post|put|patch|delete)\(/.test(line) ? [{ line: i + 1, source: line.trim(), context: lines.slice(Math.max(0, i - 2), i + 8).join('\n') }] : []),
  }
})
const target = inspect(root), inter = inspect(reference)
const json = (name, value) => writeFileSync(resolve(output, name), JSON.stringify(value, null, 2) + '\n')
const md = (name, value) => writeFileSync(resolve(output, name), value)
const cell = value => String(value || 'No direct equivalent established').replaceAll('|', '\\|').replace(/\r?\n/g, ' ')
const table = (headers, rows) => `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(row => `| ${row.map(cell).join(' | ')} |`).join('\n')}\n`
const admin = name => `src/modules/admin/${name}`
const equivalents = {
 dashboard: admin('AdminDashboard/DashboardPage.jsx'), colleges: admin('AdminSettings/CampusConfigurationPage.jsx'), academic_years: admin('AdminAcademicYears/AcademicYearPage.jsx'),
 departments: admin('AdminDepartments/DepartmentManagementPage.jsx'), courses: admin('AdminCourses/CourseGroupPage.jsx'), branches: admin('AdminCourses/CourseGroupPage.jsx'), semesters: admin('AdminAcademicYears/AcademicYearPage.jsx'), sections: admin('AdminSections/SectionManagementPage.jsx'), rooms: admin('AdminSections/SectionAllocationPage.jsx'),
 fee_structures: admin('AdminFees/FeeManagementPage.jsx'), fee_management: admin('AdminFees/FeeManagementPage.jsx'), faculty_directory: admin('AdminFaculty/StaffManagementPage.jsx'), faculty_attendance: admin('AdminAttendance/AttendancePage.jsx'), faculty_leaves: admin('AdminLeave/LeaveManagementPage.jsx'), faculty_payroll: admin('AdminPayroll/PayrollPage.jsx'),
 student_admissions: admin('AdminAdmissions/AdmissionPage.jsx'), student_profiles: admin('AdminStudents/StudentManagementPage.jsx'), student_attendance: admin('AdminAttendance/AttendancePage.jsx'), student_promotions: admin('AdminPromotion/PromotionPage.jsx'),
 subjects: admin('AdminSubjects/SubjectManagementPage.jsx'), electives: admin('AdminSubjects/SubjectManagementPage.jsx'), credits: admin('AdminResults/ResultProcessingPage.jsx'), timetable: admin('AdminTimetable/TimetablePage.jsx'), examinations: admin('AdminExaminations/ExaminationPage.jsx'), marks: admin('AdminMarksEntry/MarksEntryPage.jsx'), results: admin('AdminResults/ResultProcessingPage.jsx'),
 user_access: admin('AdminRolesPermissions/RolesPermissionsPage.jsx'), roles_permissions: admin('AdminRolesPermissions/RolesPermissionsPage.jsx'), my_profile: admin('AdminProfile/AdminProfilePage.jsx'), academic_settings: admin('AdminSettings/SettingsPage.jsx'),
 authentication: 'src/modules/auth/pages/Login.jsx', landing: 'src/modules/landing/LandingPage.jsx',
}
const byPath = rows => new Map(rows.map(row => [row.path, row]))
const targetByPath = byPath(target), interByPath = byPath(inter)
json('SOURCE_INVENTORY.json', { reference, target: root, referenceFiles: inter, targetFiles: target })
const declarations = target.flatMap(file => read(resolve(root, file.path)).split(/\r?\n/).flatMap((line, index) => /['"`]\/api\//.test(line) ? [{ file: file.path, line: index + 1, declaration: line.trim() }] : []))
const calls = target.flatMap(file => file.requestEvidence.map(evidence => ({ file: file.path, ...evidence })))
json('API_INVENTORY.json', { note: 'Static request/declaration evidence. Dynamic helper, method, payload, response and pagination traces require the indicated source context; unresolved expressions are not verified contracts.', declarations, calls })
md('API_INVENTORY.md', '# B-Tech API evidence inventory\n\nExisting B-Tech services remain authoritative. CMS Inter endpoints, DTOs, role names, storage keys, and local-row fallbacks must not replace them. This static index records every matching request expression and API literal found in source, with full neighboring payload/response context in API_INVENTORY.json. It is not a claim of backend execution.\n\n' + table(['Source', 'Existing endpoint declaration'], declarations.map(row => [`${row.file}:${row.line}`, row.declaration])) + '\n## Request calls\n\n' + table(['Source', 'Request expression'], calls.map(row => [`${row.file}:${row.line}`, row.source])))
md('MODULE_COMPARISON.md', '# CMS Inter vs B-Tech: source comparison\n\nReference: `' + reference.replaceAll('\\', '/') + '`. Target: `' + root.replaceAll('\\', '/') + '`. Both source trees were recursively read. Field and validation lists are static evidence, not proof that every runtime variant has been exercised.\n\nActive reference chain: `src/app/main.jsx` → `app/App.jsx` → `routes/AppRoutes.jsx` → `modules/admin/*` → `shared/layouts/DashboardLayout/DashboardLayout.jsx` and `shared/components/*`. The older `components/pages` tree is not treated as the primary reference.\n\n' + table(['B-Tech module / screen', 'CMS Inter implementation', 'Screen structure / interaction', 'API and validation disposition', 'B-Tech academic requirements / action'], MODULE_REGISTRY.map(module => {
 const t = targetByPath.get(module.component), refPath = equivalents[module.id], r = interByPath.get(refPath)
 return [`${module.label}: ${module.component}#${module.exportName}; ${module.path}`, r ? refPath : '', `B-Tech imports: ${(t?.imports || []).filter(value => /component|Layout|service|api|auth/.test(value)).join(', ')}. Inter imports: ${(r?.imports || []).filter(value => /shared|api|service|context/.test(value)).join(', ')}`, `Retain existing B-Tech service and validation. Source validator evidence lines: ${(t?.validationEvidence || []).map(row => row.line).join(', ')}. No backend contract copied.`, /branch|semester|credit|elective/.test(module.id) ? 'Retain B-Tech-specific structure; reference has no equivalent engineering semester/credit contract. Adapt presentation only.' : 'Retain functional implementation; adapt verified reference presentation and consolidate related navigation.']
 })) + '\n## Missing equivalent / unsupported target features\n\nCMS Inter certificates use `modules/admin/AdminCertificates/CertificatesPage.jsx` and `components/CertificatesManagementView.jsx`. B-Tech currently has no registered certificate module. Its verified state-transition/PDF/verification contracts must be identified before enabling writes. CMS Inter Campus Configuration is only a presentation analogue for College Management. Inter Boards/Course Groups are not B-Tech Departments/Courses/Branches.\n\n## Shared patterns observed\n\nReference tables own responsive wrappers, pagination and row actions; common list/form routes keep API adapters in their configs; complex admissions have a separate implementation. Both generic reference ListPage/FormPage support local-row fallbacks. Do not port those fallbacks. Reference useTheme has role/path-based administration heuristics; do not port those authorization rules. Preserve B-Tech effective-access guards.\n')
md('SCREEN_PLAN.md', '# Final screen and component plan\n\n## Preservation\n\nAll registered B-Tech screens and existing deep links are retained. No screen is removed at audit time. Unique B-Tech workflows remain in their existing implementations until their replacement is verified. Public and faculty/student/staff routes remain intact.\n\n## Navigation destinations\n\nDashboard; Global Settings (context, colleges, academic years); Academic Configuration (departments, courses, branches, semesters, sections, rooms); Student Management (admissions, profiles, promotions); Faculty & Staff (directory, leave, payroll); Subjects (subjects, electives, credits, timetable); Attendance (student/faculty entry and reports); Fees (types, structures, assignment, collection, receipts, dues, reports through existing fee routes); Exams & Results; Administration (access, roles, onboarding); retained Campus Services. Certificates remains a documented API dependency until verified.\n\n## Shared implementation owners\n\nKeep B-Tech DataTable, FormLayout/FormField, FilterPanel, PageHeader, ViewDialog, StatusConfirmDialog, StatusBadge, TablePagination, ToastProvider and AsyncState interfaces. Adapt their owned styles and interactions from the active Inter shared components instead of importing a new generic application or changing their data contracts. DashboardLayout and Sidebar remain the authenticated shell. Token ownership moves to one reference-derived token file; no new cascade override layer is permitted. Legacy module styles require verified removal or migration, never blind deletion.\n\n## Dispositions\n\nRetain: every API service, authentication/refresh/scoping/permission contract and unique screen. Merge: related sidebar destinations only after checking their registered child routes. Redesign: shared presentation owners using reference evidence. Remove: none at this checkpoint. Unused/duplicate-file candidates in SOURCE_INVENTORY.json are not deemed dead without reachability and runtime verification.\n')
const css = rows => rows.filter(row => row.path.endsWith('.css'))
md('AUDIT_SUMMARY.md', '# Source audit summary\n\n' + table(['Property', 'CMS Inter', 'B-Tech', 'Action'], [
 ['React / dependencies', read(resolve(reference, 'package.json')), read(resolve(root, 'package.json')), 'Keep B-Tech dependency graph; do not copy database/role/auth dependencies.'],
 ['Source inventory', `${inter.length} JS/JSX/CSS files; ${css(inter).length} CSS files`, `${target.length} JS/JSX/CSS files; ${css(target).length} CSS files`, 'Full file hashes/imports/fields/routes/validator evidence recorded in SOURCE_INVENTORY.json.'],
 ['Tokens / density', 'cms.css olive palettes and gradient surfaces; shared layout width 218px / collapsed 70px; controls 38px; buttons 34–36px; tables compact clamp typography', 'erp-theme.css blue tokens; Sidebar.css fixes 260px while erp-theme.css uses 248px; multiple global/dark styles', 'Consolidate token ownership and actual shell/component styles; do not append another theme override.'],
 ['Styling entry', 'styles.css imports cms.css and shared CSS', 'main.jsx imports index.css, App.css, global.css, dark sheets; App.jsx imports erp-theme.css plus module CSS', 'Audit cascade before removing imports; retain role/public layouts.'],
 ['API / permissions', 'api/apiClient.js via axios.js; effective permissions plus module-specific services', 'api/apiEndpoints.js, auth/collegeApi.js and college-scoped transport; effective-access guards', 'Keep B-Tech contracts; never copy Inter local-row fallback or path-based permissions.'],
 ]))
const protectedPaths = [...sources(reference), ...walk(resolve(root, '../Backend')).filter(path => /\.(cs|sql|json|csproj)$/.test(path))]
const baselinePath = resolve(output, 'PROTECTED_SOURCE_HASHES.json')
if (!existsSync(baselinePath)) json('PROTECTED_SOURCE_HASHES.json', protectedPaths.map(path => ({ path, sha256: hash(path) })))
else {
 const changed = JSON.parse(read(baselinePath)).filter(row => !existsSync(row.path) || hash(row.path) !== row.sha256)
 if (changed.length) { console.error(`Protected source changed: ${changed.map(row => row.path).join(', ')}`); process.exitCode = 1 }
}
console.log(JSON.stringify({ referenceFiles: inter.length, targetFiles: target.length, registeredModules: MODULE_REGISTRY.length, apiDeclarations: declarations.length, requestExpressions: calls.length }))
