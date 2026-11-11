import { dateOnly, validateSchedule } from '../../utils/semesterUtils'

export const entityId = (row, kind) => row?.[kind + 'Id'] ?? row?.id
export function records(response) {
  let value = response
  for (let i = 0; i < 7; i++) {
    if (Array.isArray(value)) return value
    value = value?.data ?? value?.items ?? value?.records ?? value?.$values
  }
  throw new Error('Saved records could not be verified. Retry before continuing.')
}
export const belongsToCollege = (row, collegeId) => !(row.collegeId ?? row.CollegeId) || String(row.collegeId ?? row.CollegeId) === String(collegeId)
export function scheduleYear(term, years, selectedYearId) {
  const matches = years.filter(year => dateOnly(year.startDate) && dateOnly(year.endDate) && term.startDate && term.endDate && term.startDate >= dateOnly(year.startDate) && term.endDate <= dateOnly(year.endDate))
  if (matches.length === 1) return String(entityId(matches[0], 'academicYear'))
  if (years.some(year => String(entityId(year, 'academicYear')) === String(selectedYearId))) return String(selectedYearId)
  return years.length === 1 ? String(entityId(years[0], 'academicYear')) : ''
}
export function validateSemesterSchedules(branches, years, existing = []) {
  for (const branch of branches) {
    for (const term of branch.terms) {
      const label = branch.name + ' / ' + term.semesterName
      if (!term.semesterName.trim() || !term.academicYearId) return label + ': select an academic year and name.'
      if (term.status === '1' && (!term.startDate || !term.endDate)) return label + ': both dates are required to activate a schedule.'
      if (term.startDate && term.endDate && term.endDate <= term.startDate) return label + ': end date must be after start date.'
      const year = years.find(row => String(entityId(row, 'academicYear')) === String(term.academicYearId))
      const start = dateOnly(year?.startDate), end = dateOnly(year?.endDate)
      if ((start && term.startDate && term.startDate < start) || (end && term.endDate && term.endDate > end)) return label + ': dates must fall within the selected academic year.'
    }
    const error = validateSchedule(branch.terms)
    if (error) return branch.name + ': ' + error
    for (const term of branch.terms.filter(row => row.startDate && row.endDate)) {
      if (existing.some(row => String(row.branchId) === String(branch.id) &&
        String(row.academicYearId) === String(term.academicYearId) && Number(row.semesterNumber) !== term.semesterNumber &&
        !branch.terms.some(item => item.semesterNumber === Number(row.semesterNumber) && String(item.academicYearId) === String(row.academicYearId)) &&
        dateOnly(row.startDate) && dateOnly(row.endDate) && term.startDate <= dateOnly(row.endDate) && term.endDate >= dateOnly(row.startDate))) return branch.name + ': dates overlap a saved semester.'
    }
  }
  return ''
}

// The caller retains branch/program IDs. Each retry reads the server first, so
// an interrupted POST cannot cause duplicate semester instances.
export async function saveSemesterSchedules({ courseId, branches, list, create, update, assertScope, confirmOverwrite }) {
  for (const branch of branches) for (const term of branch.terms) {
    assertScope()
    const rows = records(await list())
    assertScope()
    const saved = rows.find(row => String(row.courseId) === String(courseId) && String(row.branchId) === String(branch.id) &&
      String(row.academicYearId) === String(term.academicYearId) && Number(row.semesterNumber) === term.semesterNumber)
    const payload = { courseId: Number(courseId), branchId: Number(branch.id), academicYearId: Number(term.academicYearId),
      semesterNumber: term.semesterNumber, yearNumber: term.yearNumber, semesterName: term.semesterName.trim(),
      startDate: term.startDate || null, endDate: term.endDate || null, status: Number(term.status) }
    const equal = row => row && ['semesterName', 'status'].every(key => String(row[key]) === String(payload[key])) &&
      dateOnly(row.startDate) === (payload.startDate || '') && dateOnly(row.endDate) === (payload.endDate || '')
    if (equal(saved)) continue
    if (saved && (saved.startDate || saved.endDate) && !confirmOverwrite(saved)) throw new Error('Saved schedule retained. Review the dates before submitting again.')
    try {
      if (saved) await update(entityId(saved, 'semester'), payload)
      else await create(payload)
    } catch (reason) {
      const refreshed = records(await list())
      if (!refreshed.some(row => String(row.branchId) === String(branch.id) && String(row.academicYearId) === String(term.academicYearId) && Number(row.semesterNumber) === term.semesterNumber && equal(row))) throw reason
    }
    assertScope()
    const verified = records(await list()).find(row => String(row.branchId) === String(branch.id) && String(row.academicYearId) === String(term.academicYearId) && Number(row.semesterNumber) === term.semesterNumber)
    if (!entityId(verified, 'semester') || !equal(verified)) throw new Error('The saved semester dates could not be verified. Your entries are retained; retry to check the saved records.')
  }
}
