const sameId = (left, right) => String(left ?? '') === String(right ?? '')

export const admissionSemesterOptions = (semesters, academic, collegeId) => semesters
  .filter(item => ![true, 1, '1'].includes(item.isArchived) && String(item.status ?? '').toLowerCase() !== 'archived')
  .filter(item => (!item.collegeId || sameId(item.collegeId, collegeId)) &&
    ['courseId', 'branchId', 'academicYearId'].every(key => academic[key] && sameId(item[key], academic[key])))
  .map(item => ({ id: item.semesterId ?? item.id, name: item.semesterName ?? item.name ?? `Semester ${item.semesterNumber}` }))
  .filter(item => item.id)

export const resetAdmissionAcademicDependents = (next, previous, path) => {
  if (!['academic.courseId', 'academic.branchId', 'academic.academicYearId'].includes(path)) return next
  const key = path.split('.')[1]
  if (sameId(next.academic[key], previous.academic[key])) return next
  const academic = { ...next.academic,
    requiresSemesterSelection: Boolean(previous.academic.semesterId || previous.academic.requiresSemesterSelection),
    semesterId: '', semester: '', sectionId: '', section: '',
  }
  if (key === 'courseId') Object.assign(academic, { departmentId: '', branchId: '', branch: '', branchCode: '' })
  return { ...next, academic }
}

export const admissionSemesterError = (academic, options) => {
  if (academic.requiresSemesterSelection && !academic.semesterId) return 'Select a semester for the updated course, branch and academic year.'
  if (academic.semesterId && !options.some(item => sameId(item.id, academic.semesterId))) {
    return 'The saved semester does not match this course, branch and academic year. Select a matching semester.'
  }
  return ''
}
