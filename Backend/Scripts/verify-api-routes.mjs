import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(process.argv[2] || '.')
const baselineRoot = process.argv[3] ? path.resolve(process.argv[3]) : null

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const item = path.join(directory, entry.name)
  return entry.isDirectory() ? walk(item) : [item]
})

const normalizeRoute = (value) => {
  let route = `/${String(value || '').replace(/^~?\/+/, '').replace(/\/+$/, '')}`
  route = route.replace(/\{[^}]+\}/g, '{}')
  return route === '/' ? '/' : route.toLowerCase()
}

const inventory = (root) => {
  const controllerRoot = path.join(root, 'Controllers')
  const routes = new Set()

  for (const file of walk(controllerRoot).filter((name) => name.endsWith('Controller.cs'))) {
    const source = fs.readFileSync(file, 'utf8')
    const classMatch = source.match(/\bclass\s+(\w+)Controller\b/)
    const classIndex = classMatch?.index ?? -1
    if (classIndex < 0) continue

    const classPrefix = source.slice(0, classIndex)
    const classRoutes = [...classPrefix.matchAll(/\[Route\("([^"]+)"\)\]/g)]
    const controllerName = classMatch[1]
    const baseRoute = (classRoutes.at(-1)?.[1] || '')
      .replace(/\[controller\]/gi, controllerName)

    for (const match of source.matchAll(/\[Http(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?\]/g)) {
      const method = match[1].toUpperCase()
      const actionRoute = match[2] || ''
      const combined = actionRoute.startsWith('~/') || actionRoute.startsWith('/')
        ? actionRoute
        : [baseRoute, actionRoute].filter(Boolean).join('/')
      routes.add(`${method} ${normalizeRoute(combined)}`)
    }
  }

  return routes
}

// Routes invoked or explicitly exposed by the supplied frontend API clients.
const frontendRoutes = [
  ['POST', '/api/v1/auth/login'],
  ['POST', '/api/v1/auth/refresh'],
  ['POST', '/api/v1/auth/change-password'],
  ['POST', '/api/v1/auth/forgot-password'],
  ['GET', '/api/v1/profile'],
  ['PATCH', '/api/v1/profile'],
  ['GET', '/api/v1/academic-years'],
  ['POST', '/api/v1/academic-years'],
  ['GET', '/api/v1/academic-years/dashboard'],
  ['POST', '/api/v1/academic-years/generate-next-year'],
  ['GET', '/api/v1/academic-years/{}'],
  ['PUT', '/api/v1/academic-years/{}'],
  ['PATCH', '/api/v1/academic-years/{}/activate'],
  ['PATCH', '/api/v1/academic-years/{}/deactivate'],
  ['GET', '/api/v1/branches'],
  ['POST', '/api/v1/branches'],
  ['GET', '/api/v1/branches/course/{}'],
  ['GET', '/api/v1/branches/{}'],
  ['PUT', '/api/v1/branches/{}'],
  ['GET', '/api/v1/courses'],
  ['POST', '/api/v1/courses'],
  ['GET', '/api/v1/courses/{}'],
  ['PUT', '/api/v1/courses/{}'],
  ['PATCH', '/api/v1/courses/{}/status'],
  ['GET', '/api/v1/course-structures'],
  ['POST', '/api/v1/course-structures'],
  ['GET', '/api/v1/course-structures/course/{}'],
  ['GET', '/api/v1/course-structures/{}'],
  ['PUT', '/api/v1/course-structures/{}'],
  ['GET', '/api/v1/departments'],
  ['POST', '/api/v1/departments'],
  ['GET', '/api/v1/departments/search'],
  ['GET', '/api/v1/departments/paginated'],
  ['GET', '/api/v1/departments/{}'],
  ['PUT', '/api/v1/departments/{}'],
  ['PATCH', '/api/v1/departments/{}/status'],
  ['DELETE', '/api/v1/departments/{}'],
  ['GET', '/api/semester'],
  ['POST', '/api/semester'],
  ['GET', '/api/semester/search'],
  ['GET', '/api/semester/summary'],
  ['GET', '/api/semester/{}'],
  ['PUT', '/api/semester/{}'],
  ['GET', '/api/v1/sections'],
  ['POST', '/api/v1/sections'],
  ['GET', '/api/v1/sections/search'],
  ['GET', '/api/v1/sections/summary'],
  ['GET', '/api/v1/sections/validate-capacity'],
  ['GET', '/api/v1/sections/{}'],
  ['PUT', '/api/v1/sections/{}'],
  ['DELETE', '/api/v1/sections/{}'],
  ['PATCH', '/api/v1/sections/{}/status'],
  ['GET', '/api/v1/section-assignments'],
  ['GET', '/api/v1/sections/{}/class-teacher'],
  ['PUT', '/api/v1/sections/{}/class-teacher'],
  ['DELETE', '/api/v1/sections/{}/class-teacher'],
  ['GET', '/api/v1/sections/{}/class-teacher-candidates'],
  ['GET', '/api/v1/sections/{}/capacity'],
  ['GET', '/api/v1/sections/{}/students'],
  ['POST', '/api/v1/sections/{}/students'],
  ['POST', '/api/v1/sections/{}/students/assign'],
  ['DELETE', '/api/v1/sections/{}/students/{}'],
  ['GET', '/api/v1/colleges'],
  ['POST', '/api/v1/colleges'],
  ['GET', '/api/v1/colleges/search'],
  ['GET', '/api/v1/colleges/{}'],
  ['PUT', '/api/v1/colleges/{}'],
  ['PATCH', '/api/v1/colleges/{}/status'],
  ['POST', '/api/college/logo'],
  ['GET', '/api/college/logo/{}'],
  ['GET', '/api/v1/course-semester-mappings'],
  ['POST', '/api/v1/course-semester-mappings'],
  ['GET', '/api/v1/course-semester-mappings/{}'],
  ['PUT', '/api/v1/course-semester-mappings/{}'],
  ['PATCH', '/api/v1/course-semester-mappings/{}/status'],
  ['GET', '/api/college-settings'],
  ['POST', '/api/college-settings'],
  ['GET', '/api/college-settings/{}'],
  ['PUT', '/api/college-settings/{}'],
  ['GET', '/api/college-settings/college/{}'],
  ['POST', '/api/otp/generate'],
  ['POST', '/api/otp/resend'],
  ['POST', '/api/otp/verify'],
  ['POST', '/api/otp/reset-password'],
  ['POST', '/api/v1/access-requests'],
  ['GET', '/api/v1/authorization-test/authenticated'],
  ['GET', '/api/v1/authorization-test/admin'],
  ['GET', '/api/v1/authorization-test/faculty'],
  ['GET', '/api/v1/authorization-test/student'],
  ['GET', '/api/v1/authorization-test/admin-faculty'],
  ['GET', '/api/v1/students'],
  ['GET', '/api/v1/students/search'],
  ['GET', '/api/v1/students/{}'],
  ['GET', '/api/v1/students/{}/documents'],
  ['POST', '/api/v1/students'],
  ['PUT', '/api/v1/students/{}'],
  ['PATCH', '/api/v1/students/{}/status'],
  ['GET', '/api/v1/student-admissions'],
  ['POST', '/api/v1/student-admissions'],
  ['GET', '/api/v1/student-admissions/{}'],
  ['PUT', '/api/v1/student-admissions/{}'],
  ['POST', '/api/v1/students/{}/documents'],
  ['GET', '/api/v1/students/{}/documents/{}'],
  ['GET', '/api/v1/students/{}/documents/{}/download'],
  ['DELETE', '/api/v1/students/{}/documents/{}'],
  ['POST', '/api/v1/student-admissions/{}/submit'],
  ['GET', '/api/v1/student-admissions/{}/fee-summary'],
  ['PUT', '/api/v1/student-admissions/{}/fee-structure'],
  ['GET', '/api/v1/student-admissions/{}/previous-education'],
  ['PUT', '/api/v1/student-admissions/{}/previous-education'],
  ['GET', '/api/v1/student-profiles'],
  ['GET', '/api/v1/student-profiles/{}/preview'],
  ['PATCH', '/api/v1/student-profiles/{}'],
  ['GET', '/api/v1/students/{}/profile/personal-information'],
  ['PATCH', '/api/v1/students/{}/profile/personal-information'],
  ['GET', '/api/v1/students/{}/profile/exam-results'],
  ['GET', '/api/v1/promotions/dashboard'],
  ['GET', '/api/v1/promotions/directory'],
  ['GET', '/api/v1/promotions/history'],
  ['GET', '/api/v1/promotions/eligible-students'],
  ['POST', '/api/v1/promotions/promote'],
  ['POST', '/api/v1/promotions/promote-bulk'],
  ['GET', '/api/v1/promotions/student/{}/history']
].map(([method, route]) => `${method} ${normalizeRoute(route)}`)

const current = inventory(projectRoot)
const missingFrontend = frontendRoutes.filter((route) => !current.has(route))

let removed = []
let added = []
let baselineCount = null
if (baselineRoot) {
  const baseline = inventory(baselineRoot)
  baselineCount = baseline.size
  removed = [...baseline].filter((route) => !current.has(route)).sort()
  added = [...current].filter((route) => !baseline.has(route)).sort()
}

const result = {
  currentRouteCount: current.size,
  baselineRouteCount: baselineCount,
  frontendContractCount: frontendRoutes.length,
  missingFrontendRoutes: missingFrontend,
  removedBaselineRoutes: removed,
  addedRoutes: added
}

console.log(JSON.stringify(result, null, 2))
if (missingFrontend.length || removed.length) process.exitCode = 1
