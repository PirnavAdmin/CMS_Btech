export function sectionSemesterOptions(semesters, { courseId, branchId, academicYearId, selectedId } = {}) {
  const matching = semesters.filter(item =>
    (!item.courseId || String(item.courseId) === String(courseId)) &&
    (!item.branchId || String(item.branchId) === String(branchId))
  )
  return Array.from({ length: 8 }, (_, index) => {
    const number = index + 1
    const candidates = matching.filter(item => Number(item.number ?? item.semesterNumber) === number)
    const saved = candidates.find(item => selectedId && String(item.id) === String(selectedId))
      || candidates.find(item => academicYearId && String(item.academicYearId) === String(academicYearId))
      || candidates[0]
    return { ...saved, number, name: `Semester ${number}`, id: saved?.id || '', configured: Boolean(saved?.id) }
  })
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

