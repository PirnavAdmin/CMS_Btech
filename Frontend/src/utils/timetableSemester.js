import { same } from './timetableUtils.js'

// API dates describe calendar days. Preserve their date part without timezone conversion.
export const semesterDate = value => typeof value === 'string' ? value.slice(0, 10) : ''
export const validSemesterDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

export function semesterPeriod(sources, scope) {
  const year = sources.years.find(row => same(row.id ?? row.academicYearId, scope.academicYearId))
  const semester = sources.semesters.find(row => same(row.id ?? row.semesterId, scope.semesterId))
  const startDate = semesterDate(semester?.startDate), endDate = semesterDate(semester?.endDate)
  const yearStart = semesterDate(year?.startDate), yearEnd = semesterDate(year?.endDate)
  const errors = []
  if (!year) errors.push('The selected Academic Year record is unavailable. Select an Academic Year.')
  else if (!validSemesterDate(yearStart) || !validSemesterDate(yearEnd) || yearStart >= yearEnd) errors.push('The selected Academic Year has missing or invalid startDate/endDate. Correct its configuration in Academic Year Management.')
  if (!semester) errors.push('The selected Semester record is unavailable. Select a Semester from this Academic Year.')
  else {
    if (!semester.academicYearId || !same(semester.academicYearId, scope.academicYearId)) errors.push('The selected Semester does not belong to the selected Academic Year. Correct the Semester academic-year mapping or select a matching Semester.')
    if (!validSemesterDate(startDate) || !validSemesterDate(endDate)) errors.push('The selected Semester has missing or invalid startDate/endDate. Configure both dates in Semester Management.')
    else if (startDate >= endDate) errors.push('The selected Semester startDate must be earlier than its endDate. Correct the dates in Semester Management.')
    else if (validSemesterDate(yearStart) && validSemesterDate(yearEnd) && yearStart < yearEnd && (startDate < yearStart || endDate > yearEnd)) errors.push(`Semester dates (${startDate} to ${endDate}) fall outside Academic Year dates (${yearStart} to ${yearEnd}). Correct the academic configuration.`)
  }
  return { startDate, endDate, errors, valid: errors.length === 0 }
}

export function semesterPlanning(config, sources, scope, strict = false) {
  const period = semesterPeriod(sources, scope)
  if (strict && !period.valid) throw new Error(period.errors.join('\n'))
  return { ...config, calendar: { ...config?.calendar, startDate: period.startDate, endDate: period.endDate, reviewed: period.valid && config?.calendar?.reviewed === true } }
}

export function formatSemesterPeriod(period) {
  if (!period.valid) return 'Timetable Period: Configuration required'
  const format = value => { const [year, month, day] = value.split('-'); return `${day}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1]}-${year}` }
  return `Timetable Period: ${format(period.startDate)} → ${format(period.endDate)}`
}
