const normalizeStatus = (year = {}) => {
  const statusValue = year?.status ?? year?.academicYearStatus ?? year?.state ?? year?.yearStatus ?? ''
  const rawText = String(statusValue ?? '').trim().toUpperCase()
  const isActiveFlag = year?.isActive === true || year?.active === true || Number(year?.isActive) === 1 || Number(year?.status) === 1
  const isArchivedFlag = year?.isArchived === true || Number(year?.isArchived) === 1 || rawText === 'ARCHIVED'

  if (isActiveFlag || rawText === 'ACTIVE') return 'ACTIVE'
  if (isArchivedFlag || rawText === 'INACTIVE' || rawText === 'ARCHIVED') return 'ARCHIVED'
  const startDate = String(year?.startDate ?? '').slice(0, 10)
  const endDate = String(year?.endDate ?? '').slice(0, 10)
  if (!startDate || !endDate) return rawText === 'UPCOMING' ? 'UPCOMING' : 'ACTIVE'

  const today = new Date();
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59`)

  if (today < start) return 'UPCOMING'
  if (today > end) return 'ARCHIVED'
  return 'ACTIVE'
}

export const normalizeAcademicYear = (year = {}) => {
  const id = year?.academicYearId ?? year?.id ?? year?.yearId ?? ''
  const name = year?.academicYearName ?? year?.name ?? year?.academicYear ?? year?.code ?? ''
  return {
    ...year,
    id: id === null || id === undefined ? '' : String(id),
    name: String(name ?? '').trim(),
    status: normalizeStatus(year),
  }
}

const sortAcademicYears = (years) => [...years].sort((left, right) => {
  const statusRank = { ACTIVE: 0, UPCOMING: 1, ARCHIVED: 2 }
  const rank = (statusRank[left.status] ?? 3) - (statusRank[right.status] ?? 3)
  if (rank) return rank
  return String(left.startDate || left.name).localeCompare(String(right.startDate || right.name))
})

export const getSelectableAcademicYears = (years = []) => {
  const rows = Array.isArray(years) ? years : []
  return sortAcademicYears(rows
    .map(normalizeAcademicYear)
    .filter((year) => year.id && year.name && year.status !== 'ARCHIVED'))
}

export const getActiveAcademicYears = (years = []) => {
  const selectableYears = getSelectableAcademicYears(years)
  const activeYears = selectableYears.filter((year) => year.status === 'ACTIVE')

  // A newly configured college can legitimately have no active year yet. In
  // that case retain upcoming, non-archived years so dependent forms do not
  // render an empty academic-year dropdown.
  return activeYears.length ? activeYears : selectableYears
}

export const getDefaultAcademicYear = (years = []) => {
  const activeYears = getActiveAcademicYears(years)
  if (!activeYears.length) return null
  return activeYears[0]
}

export const resolveAcademicYearId = (years = [], selectedId = '') => {
  const activeYears = getActiveAcademicYears(years)
  if (!activeYears.length) return selectedId || ''
  if (selectedId && activeYears.some((year) => String(year.id) === String(selectedId))) {
    return String(selectedId)
  }
  return String(activeYears[0].id)
}

export const getOperationalAcademicYearOptions = (years = []) => {
  return getActiveAcademicYears(years).map((year) => ({
    id: year.id,
    name: year.name,
    academicYearId: year.id,
    academicYearName: year.name,
  }))
}
