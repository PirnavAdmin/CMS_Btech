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
