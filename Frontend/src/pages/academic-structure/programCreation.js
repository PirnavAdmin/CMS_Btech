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
  const normalize = row => {
    if (!row || typeof row !== 'object') return row
    const result = { ...row }
    for (const key of ['semesterId', 'courseId', 'branchId', 'academicYearId', 'semesterNumber', 'semesterName', 'startDate', 'endDate', 'status']) {
      if (result[key] === undefined) result[key] = row[key[0].toUpperCase() + key.slice(1)]
    }
    return result
  }
  const read = async () => records(await list()).map(normalize)
  const statusValue = value => value === true || String(value).toLowerCase() === 'active' ? '1' : value === false || String(value).toLowerCase() === 'inactive' ? '0' : String(value)
  assertScope()
  let rows = await read()
  const expected = []
  for (const branch of branches) for (const term of branch.terms) {
    assertScope()
    const saved = rows.find(row => String(row.courseId) === String(courseId) && String(row.branchId) === String(branch.id) &&
      String(row.academicYearId) === String(term.academicYearId) && Number(row.semesterNumber) === term.semesterNumber)
    const payload = { courseId: Number(courseId), branchId: Number(branch.id), academicYearId: Number(term.academicYearId),
      semesterNumber: term.semesterNumber, yearNumber: term.yearNumber, semesterName: term.semesterName.trim(),
      startDate: term.startDate || null, endDate: term.endDate || null, status: Number(term.status) }
    const equal = row => row && String(row.semesterName ?? '').trim() === payload.semesterName && statusValue(row.status) === statusValue(payload.status) &&
      dateOnly(row.startDate) === (payload.startDate || '') && dateOnly(row.endDate) === (payload.endDate || '')
    const matches = row => String(row.courseId) === String(courseId) && String(row.branchId) === String(branch.id) && String(row.academicYearId) === String(term.academicYearId) && Number(row.semesterNumber) === term.semesterNumber
    expected.push(row => matches(row) && entityId(row, 'semester') && equal(row))
    if (equal(saved)) continue
    if (saved && (saved.startDate || saved.endDate) && !confirmOverwrite(saved)) throw new Error('Saved schedule retained. Review the dates before submitting again.')
    try {
      const response = saved ? await update(entityId(saved, 'semester'), payload) : await create(payload)
      let result = response
      for (let depth = 0; depth < 5 && result && !entityId(normalize(result), 'semester'); depth++) result = result.data
      result = normalize(result)
      if (result && entityId(result, 'semester') && matches(result)) rows = [...rows.filter(row => !matches(row)), result]
      else rows = await read()
    } catch (reason) {
      rows = await read()
      if (!rows.some(row => matches(row) && equal(row))) throw reason
    }
    assertScope()
    let verified = rows.find(matches)
    // POST can idempotently return an existing definition without applying the
    // requested dates. Reuse that ID through the existing update endpoint.
    if (!saved && entityId(verified, 'semester') && !equal(verified)) {
      if ((verified.startDate || verified.endDate) && !confirmOverwrite(verified)) throw new Error('Saved schedule retained. Review the dates before submitting again.')
      assertScope()
      await update(entityId(verified, 'semester'), payload)
      rows = await read()
      assertScope()
      verified = rows.find(matches)
    }
    if (!entityId(verified, 'semester') || !equal(verified)) {
      const differences = !verified ? ['record missing from saved list'] : [
        dateOnly(verified.startDate) !== (payload.startDate || '') && 'start date',
        dateOnly(verified.endDate) !== (payload.endDate || '') && 'end date',
        statusValue(verified.status) !== statusValue(payload.status) && 'status',
        String(verified.semesterName ?? '').trim() !== payload.semesterName && 'semester name',
      ].filter(Boolean)
      throw new Error(`${term.semesterName}: saved ${differences.join(', ') || 'record ID'} did not match. Your entries are retained.`)
    }
  }
  const persisted = await read()
  assertScope()
  if (expected.some(matches => !persisted.some(matches))) throw new Error('Some saved schedules could not be verified. Your entries are retained; retry to check the saved records.')
}
