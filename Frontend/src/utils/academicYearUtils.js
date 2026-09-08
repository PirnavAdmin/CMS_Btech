const normalizeStatus = (year = {}) => {
  const statusValue = year?.status ?? year?.academicYearStatus ?? year?.state ?? year?.yearStatus ?? ''
  const rawText = String(statusValue ?? '').trim().toUpperCase()
  const isActiveFlag = year?.isActive === true || year?.active === true || Number(year?.isActive) === 1 || Number(year?.status) === 1
  const isArchivedFlag = year?.isArchived === true || Number(year?.isArchived) === 1 || rawText === 'ARCHIVED'

  if (isActiveFlag || rawText === 'ACTIVE') return 'ACTIVE'
  if (isArchivedFlag || rawText === 'INACTIVE' || rawText === 'ARCHIVED') return 'ARCHIVED'
  if (rawText === 'UPCOMING') return 'UPCOMING'

  const startDate = String(year?.startDate ?? '').slice(0, 10)
  const endDate = String(year?.endDate ?? '').slice(0, 10)
  if (!startDate || !endDate) return 'ACTIVE'

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

export const getActiveAcademicYears = (years = []) => {
  const rows = Array.isArray(years) ? years : []
  return rows
    .map(normalizeAcademicYear)
    .filter((year) => year.id && year.name && year.status === 'ACTIVE')
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
