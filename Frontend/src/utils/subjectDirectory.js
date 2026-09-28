export const idOf = (record, kind) => String(record?.[`${kind}Id`] ?? record?.id ?? '')
export const relationId = (record, kind) => String(record?.[`${kind}Id`] ?? record?.[kind]?.id ?? record?.[kind]?.[`${kind}Id`] ?? '')
export const classificationOf = subject => {
  const value = String(subject?.electiveType ?? '').trim().toLowerCase().replace(/[_\s]/g, '-')
  return value === 'elective' ? 'Elective' : value === 'non-elective' ? 'Non-Elective' : ''
}
export const departmentOfBranch = (branch, courses = []) => relationId(branch, 'department') || relationId(courses.find(course => idOf(course, 'course') === relationId(branch, 'course')), 'department')
export const isElectiveSubject = subject => classificationOf(subject) === 'Elective' && !['0', 'false', 'inactive'].includes(String(subject.status).toLowerCase())

export function enrichSubject(subject, masters = {}) {
  const { courses = [], branches = [], semesters = [], years = [], departments = [] } = masters
  const courseId = relationId(subject, 'course')
  const branchId = relationId(subject, 'branch')
  const semesterId = relationId(subject, 'semester')
  const academicYearId = relationId(subject, 'academicYear')
  const course = courses.find(item => idOf(item, 'course') === courseId)
  const branch = branches.find(item => idOf(item, 'branch') === branchId)
  const semester = semesters.find(item => idOf(item, 'semester') === semesterId)
  const year = years.find(item => idOf(item, 'academicYear') === academicYearId)
  const departmentId = relationId(subject, 'department') || departmentOfBranch(branch, courses) || relationId(course, 'department')
  const department = departments.find(item => idOf(item, 'department') === departmentId)
  const semesterNumber = Number(subject.semesterNumber ?? semester?.semesterNumber ?? String(subject.semesterName ?? subject.semester ?? semester?.semesterName ?? '').match(/\d+/)?.[0] ?? 0)
  const yearNumber = Math.ceil(semesterNumber / 2)
  return {
    ...subject, id: subject.subjectId ?? subject.id, courseId, branchId, semesterId, academicYearId, departmentId,
    electiveType: classificationOf(subject),
    department: subject.departmentName || department?.departmentName || department?.name || branch?.departmentName || course?.departmentName || '',
    course: subject.courseName || course?.courseName || course?.name || '',
    courseCode: subject.courseCode || course?.courseCode || course?.code || '',
    branchName: subject.branchName || branch?.branchName || branch?.name || (typeof subject.branch === 'string' ? subject.branch : ''),
    branchCode: subject.branchCode || branch?.branchCode || branch?.code || '',
    semesterName: subject.semesterName || semester?.semesterName || semester?.name || (typeof subject.semester === 'string' ? subject.semester : ''),
    academicYearName: subject.academicYearName || year?.academicYearName || year?.name || (typeof subject.academicYear === 'string' ? subject.academicYear : ''),
    level: yearNumber > 0 ? `${yearNumber}${yearNumber === 1 ? 'st' : yearNumber === 2 ? 'nd' : yearNumber === 3 ? 'rd' : 'th'} Year` : '',
    status: ['0', 'false', 'inactive'].includes(String(subject.status).toLowerCase()) ? 'Inactive' : 'Active',
  }
}

export const hasAcademicFilter = filters => ['department', 'course', 'branch', 'semester', 'academicYear', 'level'].some(key => filters[key] && filters[key] !== 'All')
// Names verified against the live Subject search contract. Department is
// derived from Branch/Course, so it is deliberately filtered locally.
export function subjectQuery(filters, search = '') {
  const names = { course: 'CourseId', branch: 'BranchId', semester: 'SemesterId', academicYear: 'AcademicYearId', level: 'Level', electiveType: 'ElectiveType', status: 'Status' }
  const query = Object.fromEntries(Object.entries(names).filter(([key]) => filters[key] && filters[key] !== 'All').map(([key, name]) => [name, filters[key]]))
  if (search.trim()) query.Search = search.trim()
  return query
}
export function matchesSubject(subject, filters, search = '') {
  const fields = { department: 'departmentId', course: 'courseId', branch: 'branchId', semester: 'semesterId', academicYear: 'academicYearId', level: 'level', electiveType: 'electiveType', status: 'status' }
  if (!Object.entries(fields).every(([filter, field]) => !filters[filter] || filters[filter] === 'All' || String(subject[field] ?? '') === String(filters[filter]))) return false
  const query = search.trim().toLowerCase()
  return !query || ['subjectCode', 'subjectName', 'department', 'course', 'courseCode', 'branchName', 'branchCode', 'semesterName', 'academicYearName'].some(field => String(subject[field] ?? '').toLowerCase().includes(query))
}

export function changeAcademicFilter(filters, key, value) {
  const resets = { department: ['course', 'branch', 'semester', 'level'], course: ['branch', 'semester', 'level'], branch: ['semester', 'level'], level: ['semester'] }
  return { ...filters, ...Object.fromEntries((resets[key] || []).map(field => [field, 'All'])), [key]: value }
}

export function academicFilterOptions(key, filters, masters) {
  const { departments, courses, branches, semesters, years } = masters
  const selected = value => value && value !== 'All'
  const validBranches = branches.filter(branch =>
    (!selected(filters.course) || relationId(branch, 'course') === String(filters.course)) &&
    (!selected(filters.department) || departmentOfBranch(branch, courses) === String(filters.department)))
  let rows = []
  switch (key) {
    case 'department': rows = departments; break
    case 'course':
      rows = courses.filter(course => !selected(filters.department) ||
        relationId(course, 'department') === String(filters.department) ||
        branches.some(branch => relationId(branch, 'course') === idOf(course, 'course') && departmentOfBranch(branch, courses) === String(filters.department)))
      break
    case 'branch': rows = validBranches; break
    case 'academicYear': rows = years; break
    case 'semester':
      rows = semesters.filter(semester =>
        (!selected(filters.course) || relationId(semester, 'course') === String(filters.course)) &&
        (!selected(filters.branch) || relationId(semester, 'branch') === String(filters.branch)) &&
        (!selected(filters.department) || validBranches.some(branch => idOf(branch, 'branch') === relationId(semester, 'branch'))) &&
        (!selected(filters.level) || enrichSubject({ semesterId: idOf(semester, 'semester') }, { semesters }).level === filters.level))
      break
    case 'status': return ['Active', 'Inactive'].map(value => ({ id: value, name: value }))
    case 'level': return ['1st Year', '2nd Year', '3rd Year', '4th Year'].map(value => ({ id: value, name: value }))
  }
  const options = rows.map(row => ({ id: idOf(row, key), name: row[`${key}Name`] || row.name || idOf(row, key) }))
  if (key !== 'semester') return options
  const seenNames = new Set()
  return options.filter(option => {
    const normalizedName = String(option.name).trim().toLowerCase()
    if (seenNames.has(normalizedName)) return false
    seenNames.add(normalizedName)
    return true
  })
}

export function eligibleForGroup(subject, group) {
  return isElectiveSubject(subject) && ['course', 'branch', 'semester', 'academicYear'].every(kind => !relationId(group, kind) || relationId(subject, kind) === relationId(group, kind))
}
