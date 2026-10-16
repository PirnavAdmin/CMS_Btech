import { same } from './timetableUtils.js'

// API dates describe calendar days; preserve the date part without timezone conversion.
export const semesterDate = value => typeof value === 'string' ? value.slice(0, 10) : ''
export const validSemesterDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

// Academic identity is required. Reference dates never determine timetable validity.
export function semesterPeriod(sources, scope) {
  const year = sources.years.find(row => same(row.id ?? row.academicYearId, scope.academicYearId))
  const semester = sources.semesters.find(row => same(row.id ?? row.semesterId, scope.semesterId))
  const startDate = semesterDate(semester?.startDate), endDate = semesterDate(semester?.endDate)
  const errors = []
  if (!year) errors.push('The selected Academic Year record is unavailable. Select an Academic Year.')
  if (!semester) errors.push('The selected Semester record is unavailable. Select a Semester from this Academic Year.')
  else if (semester.academicYearId && !same(semester.academicYearId, scope.academicYearId)) errors.push('The selected Semester does not belong to the selected Academic Year. Select a matching Semester.')
  return { startDate, endDate, errors, valid: errors.length === 0, referenceAvailable: validSemesterDate(startDate) && validSemesterDate(endDate) && startDate < endDate }
}

export function formatSemesterPeriod(period) {
  return period.referenceAvailable ? `Semester Reference Period: ${period.startDate} ? ${period.endDate}` : 'Semester dates are not configured. Timetable validity is controlled by the selected timetable date range.'
}

export function minimumTimetableEndDate(calendar) {
  if (!validSemesterDate(calendar?.startDate)) return ''
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  const remaining = new Set((calendar.workingDays || []).filter(day => days.includes(day)))
  const holidays = new Set(calendar.holidays || [])
  const date = new Date(`${calendar.startDate}T12:00:00Z`)
  for (let offset = 0; offset <= 732; offset++) {
    const key = date.toISOString().slice(0, 10)
    if (!holidays.has(key)) remaining.delete(days[date.getUTCDay()])
    // Existing validity rules require the end date to follow the start date.
    if (offset > 0 && !remaining.size) return key
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return ''
}

export function timetableDateErrors(calendar) {
  if (!calendar?.startDate || !calendar?.endDate) return ['Timetable start date and end date are required.']
  if (!validSemesterDate(calendar.startDate) || !validSemesterDate(calendar.endDate)) return ['Enter valid timetable dates in YYYY-MM-DD format.']
  if (calendar.startDate >= calendar.endDate) return ['Timetable end date must be after the start date.']
  const minimum = minimumTimetableEndDate(calendar)
  if (minimum && calendar.endDate < minimum) return [`The date range must include every selected working weekday at least once. Choose an end date on or after ${minimum}.`]
  return []
}
