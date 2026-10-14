const id = value => value == null ? '' : String(value).trim()
const present = value => id(value) !== '' && id(value) !== '0'
const containers = ['academic', 'academicDetails', 'academicInformation', 'admission', 'employment', 'profile', 'personalInformation']
const collections = { department: 'departments', course: 'courses', branch: 'branches', semester: 'semesters', section: 'sections', subject: 'subjects', student: 'students', faculty: 'faculty', group: 'groups' }
const aliases = { faculty: ['employeeProfileId', 'facultyProfileId', 'employeeId'], student: ['studentProfileId', 'admissionId'], group: ['electiveGroupId'] }
export const collegeField = (row, name) => {
  if (!row || typeof row !== 'object') return undefined
  for (const key of [name + 'Id', ...(aliases[name] || [])]) {
    const value = Object.entries(row).find(([field, value]) => field.replaceAll('_', '').toLowerCase() === key.toLowerCase() && present(value))?.[1]
    if (value !== undefined) return value
  }
  const nested = row[name]
  if (nested && typeof nested === 'object') return nested[name + 'Id'] ?? nested.id
  for (const key of containers) {
    const nested = row[key]
    if (nested && nested !== row && typeof nested === 'object') {
      const value = nested[name + 'Id'] ?? nested[name[0].toUpperCase() + name.slice(1) + 'Id']
      if (present(value)) return value
    }
  }
}
export const createCollegeScope = (collegeId, hierarchy = {}) => {
  const target = id(collegeId)
  const indexes = Object.fromEntries(Object.entries(collections).map(([type, collection]) => {
    const index = new Map()
    for (const row of hierarchy[collection] || []) {
      for (const value of [collegeField(row, type), row.id, ...(aliases[type] || []).map(key => row[key])]) {
        if (present(value)) index.set(id(value), row)
      }
    }
    return [type, index]
  }))
  const owner = (row, seen = new Set()) => {
    if (!row || typeof row !== 'object' || seen.has(row)) return undefined
    const direct = row.collegeNumericId || collegeField(row, 'college')
    if (present(direct)) return id(direct)
    const next = new Set(seen).add(row), owners = new Set()
    for (const type of ['section', 'semester', 'branch', 'course', 'department', 'subject', 'student', 'faculty', 'group']) {
      const parent = indexes[type].get(id(collegeField(row, type)))
      const resolved = parent && parent !== row ? owner(parent, next) : undefined
      if (resolved) owners.add(resolved)
    }
    for (const key of ['faculty', 'employee', 'student', 'subject', ...containers]) {
      const resolved = owner(row[key], next)
      if (resolved) owners.add(resolved)
    }
    return owners.size === 1 ? [...owners][0] : undefined
  }
  return rows => (Array.isArray(rows) ? rows : []).filter(row => target && owner(row) === target)
}
export const selectedCollegeId = () => {
  try {
    const context = JSON.parse(localStorage.getItem('pirnav_academic_context') || 'null')
    return context ? id(context.collegeId) : id(localStorage.getItem('pirnav-selected-college-id') || localStorage.getItem('selected_college_id'))
  } catch { return '' }
}
export const collegeStorageKey = (key, collegeId = selectedCollegeId()) => key + ':college:' + encodeURIComponent(id(collegeId) || 'unselected')
