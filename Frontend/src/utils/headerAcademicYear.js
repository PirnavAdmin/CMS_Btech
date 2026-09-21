// Header selection must use backend status, never the date-based form fallback.
export function selectHeaderAcademicYear(years = []) {
  const active = years.filter(year => year.isActive === true || year.isActive === 1 || year.isActive === '1' || year.status === 1 || year.status === '1' || String(year.status).toUpperCase() === 'ACTIVE')
  if (active.length > 1) return { state: 'conflict', year: null }
  return { state: active.length ? 'ready' : 'empty', year: active[0] || null }
}

function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return NaN
  const day = value.slice(0, 10)
  const parsed = Date.parse(day + 'T00:00:00Z')
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === day ? parsed : NaN
}

export function calculateAcademicYearProgress(startDate, endDate, currentDate = new Date()) {
  const start = dateValue(startDate), end = dateValue(endDate)
  const current = currentDate instanceof Date ? currentDate : new Date(currentDate)
  if (!Number.isFinite(current.getTime()) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const now = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)))
}
