export const sameId = (a, b) => a != null && b != null && String(a) === String(b)
export const recordId = row => row.id ?? row.admissionId ?? row.applicationNumber ?? row.applicationNo
export const field = (row, key) => row[key] ?? row.academic?.[key] ?? row.admission?.[key]
export const statusOf = row => String(row.status ?? row.currentStatus ?? '').trim().toUpperCase().replace(/[ -]+/g, '_')
export const isEnrolled = row => ['APPROVED', 'ADMITTED'].includes(statusOf(row))
export const isPending = row => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(statusOf(row))
export const STATUS_GROUPS = [
  { label: 'Approved / Admitted', statuses: ['APPROVED', 'ADMITTED'], color: '#16815d', tone: 'success' },
  { label: 'Pending', statuses: ['PENDING'], color: '#b77913', tone: 'warning' },
  { label: 'Submitted', statuses: ['SUBMITTED'], color: '#2563eb', tone: 'info' },
  { label: 'Under Review', statuses: ['UNDER_REVIEW'], color: '#e49a21', tone: 'warning' },
  { label: 'Verified', statuses: ['VERIFIED'], color: '#7c60b3', tone: 'info' },
  { label: 'Rejected', statuses: ['REJECTED'], color: '#c24155', tone: 'danger' },
  { label: 'Other', statuses: [], color: '#64748b', tone: 'neutral' },
]
export const statusGroup = row => STATUS_GROUPS.find(group => group.statuses.includes(statusOf(row))) ?? STATUS_GROUPS.at(-1)
export function admissionDate(row) {
  for (const key of ['applicationDate', 'submittedAt', 'createdAt', 'admissionDate', 'registrationDate']) {
    const value = field(row, key)
    if (!value || String(value).startsWith('0001-')) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}
export function admissionsInScope(rows, collegeId, yearId, yearName) {
  return rows.filter(row => {
    if (collegeId && !sameId(field(row, 'collegeId'), collegeId)) return false
    if (!yearId) return true
    const id = field(row, 'academicYearId')
    if (id != null && id !== '') return sameId(id, yearId)
    const name = field(row, 'academicYearName') ?? field(row, 'academicYear')
    return typeof name === 'string' && !!yearName && name.trim().toLowerCase() === yearName.trim().toLowerCase()
  })
}
// Fixed calendar windows, anchored to today. Zero buckets represent real absence of records.
export function buildTrend(rows, timeframe, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const count = timeframe === 'Month' ? 12 : timeframe === 'Week' ? 8 : 14
  if (timeframe === 'Month') end.setDate(1)
  if (timeframe === 'Week') end.setDate(end.getDate() - (end.getDay() + 6) % 7)
  const buckets = Array.from({ length: count }, (_, index) => {
    const start = new Date(end)
    if (timeframe === 'Month') start.setMonth(start.getMonth() - count + index + 1)
    else start.setDate(start.getDate() - (count - index - 1) * (timeframe === 'Week' ? 7 : 1))
    const until = new Date(start)
    if (timeframe === 'Month') until.setMonth(until.getMonth() + 1)
    else until.setDate(until.getDate() + (timeframe === 'Week' ? 7 : 1))
    return { start, until, label: start.toLocaleDateString(undefined, timeframe === 'Month' ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' }), value: 0 }
  })
  let dated = 0
  rows.forEach(row => {
    const date = admissionDate(row)
    if (!date) return
    dated++
    const bucket = buckets.find(item => date >= item.start && date < item.until && date <= now)
    if (bucket) bucket.value++
  })
  return { buckets, dated, undated: rows.length - dated }
}
export function branchFor(row, branches) {
  const id = field(row, 'branchId')
  const match = branches.find(branch => sameId(branch.id ?? branch.branchId, id))
  const name = match?.name ?? match?.branchName ?? field(row, 'branchName') ?? field(row, 'branch')
  return { key: id != null ? `id:${id}` : `name:${name || 'Unassigned'}`, name: typeof name === 'string' ? name : 'Unassigned', id }
}
export function branchDistribution(rows, branches) {
  const groups = new Map()
  rows.filter(isEnrolled).forEach(row => {
    const branch = branchFor(row, branches)
    const existing = groups.get(branch.key)
    if (existing) existing.value++
    else groups.set(branch.key, { ...branch, value: 1 })
  })
  return [...groups.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}
export function departmentMetrics(dept, courses, branches, admissions) {
  const id = dept.id ?? dept.departmentId
  const deptCourses = courses.filter(row => sameId(row.departmentId, id))
  const deptBranches = branches.filter(row => sameId(row.departmentId, id) || deptCourses.some(course => sameId(course.id ?? course.courseId, row.courseId)))
  const capacities = deptBranches.map(row => row.intakeCapacity ?? row.intake)
  const capacity = capacities.length && capacities.every(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) ? capacities.reduce((sum, value) => sum + Number(value), 0) : null
  const enrolled = admissions.filter(isEnrolled)
  const belongs = row => sameId(field(row, 'departmentId'), id) || deptBranches.some(branch => sameId(branch.id ?? branch.branchId, field(row, 'branchId'))) || deptCourses.some(course => sameId(course.id ?? course.courseId, field(row, 'courseId')))
  const canResolve = row => {
    if (field(row, 'departmentId') != null) return true
    const branch = branches.find(item => sameId(item.id ?? item.branchId, field(row, 'branchId')))
    if (branch?.departmentId != null) return true
    const course = courses.find(item => sameId(item.id ?? item.courseId, field(row, 'courseId') ?? branch?.courseId))
    return course?.departmentId != null
  }
  const enrollment = enrolled.every(canResolve) ? enrolled.filter(belongs).length : null
  return { courses: deptCourses.length, branches: deptBranches.length, capacity, enrollment, utilization: capacity > 0 && enrollment !== null ? Math.round(enrollment / capacity * 100) : null }
}
