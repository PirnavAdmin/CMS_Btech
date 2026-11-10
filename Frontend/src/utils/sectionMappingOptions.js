export function sectionSemesterOptions(semesters, { courseId, branchId, academicYearId, selectedId } = {}) {
  // A section can only be mapped to a semester definition that was actually
  // saved. Do not manufacture the usual 1–8 records here: doing so makes an
  // incomplete academic structure look selectable.
  return semesters.filter(item =>
    (!item.courseId || String(item.courseId) === String(courseId)) &&
    (!item.branchId || String(item.branchId) === String(branchId)) &&
    (!academicYearId || !item.academicYearId || String(item.academicYearId) === String(academicYearId) || String(item.id) === String(selectedId))
  ).filter(item => item.id).sort((left, right) =>
    Number(left.number ?? left.semesterNumber ?? 0) - Number(right.number ?? right.semesterNumber ?? 0)
  ).map(item => ({
    ...item,
    number: Number(item.number ?? item.semesterNumber ?? 0),
    name: item.name || `Semester ${item.number ?? item.semesterNumber}`,
    configured: true,
  }))
}
export function isSectionYearActive(year) {
  if (!year || Number(year.isArchived ?? year.IsArchived) === 1 || year.deletedAt || year.DeletedAt) return false
  const id = Number(year.id ?? year.academicYearId)
  if (!Number.isInteger(id) || id <= 0) return false
  const status = year.backendStatus ?? year.status ?? year.academicYearStatus
  if (status !== undefined && status !== null && String(status).trim() !== '') {
    return ['1', 'true', 'active', 'current'].includes(String(status).trim().toLowerCase())
  }
  return year.isActive === true || year.isActive === 1
}

