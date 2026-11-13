const sameId = (left, right) => String(left ?? '') === String(right ?? '')

export const admissionSemesterOptions = (semesters, academic, collegeId) => semesters
  .filter(item => ![true, 1, '1'].includes(item.isArchived) && String(item.status ?? '').toLowerCase() !== 'archived')
  .filter(item => (!item.collegeId || sameId(item.collegeId, collegeId)) &&
    ['courseId', 'branchId', 'academicYearId'].every(key => academic[key] && sameId(item[key], academic[key])))
  .map(item => ({ id: item.semesterId ?? item.id, name: item.semesterName ?? item.name ?? `Semester ${item.semesterNumber}` }))
  .filter(item => item.id)

export const resetAdmissionAcademicDependents = (next, previous, path) => {
  if (!['admission.collegeId', 'academic.departmentId', 'academic.courseId', 'academic.branchId', 'academic.academicYearId'].includes(path)) return next
  const key = path.split('.')[1]
  if (sameId(path === 'admission.collegeId' ? next.admission?.collegeId : next.academic[key], path === 'admission.collegeId' ? previous.admission?.collegeId : previous.academic[key])) return next
  const academic = { ...next.academic,
    requiresSemesterSelection: Boolean(previous.academic.semesterId || previous.academic.requiresSemesterSelection),
    semesterId: '', semester: '', sectionId: '', section: '',
  }
  if (key === 'courseId') Object.assign(academic, { branchId: '', branch: '', branchCode: '' })
  if (key === 'departmentId' || path === 'admission.collegeId') Object.assign(academic, { courseId:'', course:'', courseCode:'', branchId:'', branch:'', branchCode:'' })
  if (path === 'admission.collegeId') Object.assign(academic, { departmentId:'', department:'' })
  return { ...next, academic }
}

export const admissionSemesterError = (academic, options) => {
  if (academic.requiresSemesterSelection && !academic.semesterId) return 'Select a semester for the updated course, branch and academic year.'
  if (academic.semesterId && !options.some(item => sameId(item.id, academic.semesterId))) {
    return 'The saved semester does not match this course, branch and academic year. Select a matching semester.'
  }
  return ''
}

export function currentAdmissionSemester(rows, academic, collegeId, today = new Date().toLocaleDateString('en-CA')) {
  const options = admissionSemesterOptions(rows, academic, collegeId)
  const candidates = rows.filter(row => options.some(option => sameId(option.id, row.semesterId ?? row.id))).filter(row => {
    const status = String(row.status ?? row.isActive ?? '').toLowerCase()
    const start = String(row.startDate ?? row.semesterStartDate ?? '').slice(0, 10)
    const end = String(row.endDate ?? row.semesterEndDate ?? '').slice(0, 10)
    if (start && end) return start <= today && today <= end && !['inactive','0','false','completed'].includes(status)
    return row.isCurrent === true || row.isCurrentSemester === true || ['active','1','true','current'].includes(status)
  })
  return candidates.length === 1 ? options.find(option => sameId(option.id, candidates[0].semesterId ?? candidates[0].id)) : null
}

export function resolveAdmissionAcademicIds(academic, courses = [], branches = [], collegeId) {
  const name = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  const id = value => Number.isInteger(Number(value)) && Number(value) > 0
  const result = {...academic}
  const programs = courses.filter(row => !row.collegeId || sameId(row.collegeId, collegeId))
  const matchingPrograms = programs.filter(row => id(academic.courseId) ? sameId(row.courseId ?? row.id, academic.courseId) :
    Boolean(name(academic.course)) && [row.courseName, row.name, row.courseCode, row.code].some(value => name(value) === name(academic.course)))
  if (matchingPrograms.length !== 1) return academic
  const program = matchingPrograms[0]
  if (!id(result.courseId)) result.courseId = String(program.courseId ?? program.id)
  const matchingBranches = [...new Map(branches.map(row => [String(row.branchId ?? row.id), row])).values()].filter(row => sameId(row.courseId ?? row.course?.courseId ?? row.course?.id, result.courseId) && (!row.collegeId || sameId(row.collegeId, collegeId))).filter(row => id(academic.branchId) ? sameId(row.branchId ?? row.id, academic.branchId) :
    Boolean(name(academic.branch)) && [row.branchName, row.name, row.branchCode, row.code].some(value => name(value) === name(academic.branch)))
  if (matchingBranches.length === 1) {
    const branch = matchingBranches[0]
    if (!id(result.branchId)) result.branchId = String(branch.branchId ?? branch.id)
    if (!id(result.departmentId) && id(branch.departmentId ?? program.departmentId)) result.departmentId = String(branch.departmentId ?? program.departmentId)
  }
  return result
}
