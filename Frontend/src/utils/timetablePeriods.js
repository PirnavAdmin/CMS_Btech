import { key, same, timeMinutes, validTime, overlaps } from './timetableUtils.js'

export const periodType = period => key(period.type || 'class').toLowerCase()
export const isTeachingPeriod = period => periodType(period) === 'class'
export const teachingPeriods = periods => (periods || []).filter(isTeachingPeriod)
export const periodLabel = (period, index = 0) => period.name || (isTeachingPeriod(period) ? `P${index + 1}` : periodType(period) === 'lunch' ? 'Lunch' : 'Break')
const clockTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function periodSetupErrors(periods = []) {
  const errors = []
  if (!teachingPeriods(periods).length) errors.push('Add at least one teaching period.')
  if (periods.some(row => row.name !== undefined && !key(row.name))) errors.push('Enter a name for every period.')
  if (periods.some(row => !key(row.id) || !validTime(row))) errors.push('Configure valid periods with a start time and a later end time.')
  if (periods.some(row => !['class', 'break', 'lunch'].includes(periodType(row)))) errors.push('Period type must be Class, Break or Lunch.')
  if (periods.some((row, index) => periods.slice(index + 1).some(other => same(row.id, other.id) || (key(row.name) && key(row.name).toLowerCase() === key(other.name).toLowerCase())))) errors.push('Periods must not have duplicate IDs or names.')
  if (periods.some((row, index) => periods.slice(index + 1).some(other => overlaps(row, other)))) errors.push('Periods must not overlap, including Break and Lunch.')
  return errors
}

// Proposed local times only: no institutional period API exists in the inspected contract.
export const DEFAULT_PERIOD_SETUP = Object.freeze({ startTime: '09:00', endTime: '16:00', duration: 60, breakDuration: 15, lunchDuration: 45, breakAfter: 2, lunchAfter: 4 })
export function automaticPeriods(settings, previous = []) {
  const errors = [], periods = []
  const start = timeMinutes(settings.startTime), end = timeMinutes(settings.endTime)
  const duration = Number(settings.duration), shortBreak = Number(settings.breakDuration), lunch = Number(settings.lunchDuration)
  if (start == null || end == null || start >= end) errors.push('College end time must be later than its start time.')
  if (!Number.isInteger(duration) || duration < 1 || duration > 720) errors.push('Period duration must be 1–720 minutes.')
  if (![shortBreak, lunch].every(value => Number.isInteger(value) && value >= 0 && value <= 240)) errors.push('Break and lunch durations must be 0–240 minutes.')
  if (![settings.breakAfter, settings.lunchAfter].every(value => Number.isInteger(Number(value)) && Number(value) > 0)) errors.push('Break and lunch placement must follow a positive teaching period number.')
  if (errors.length) return { periods, errors, unusedMinutes: 0 }
  let cursor = start, count = 0
  const append = (name, type, minutes) => {
    const startTime = clockTime(cursor), endTime = clockTime(cursor + minutes)
    const old = previous.find(row => periodType(row) === type && row.name === name)
      || previous.find(row => periodType(row) === type && row.startTime === startTime && row.endTime === endTime)
    periods.push({ id: old?.id || `auto-${type}-${count}`, name, type, startTime, endTime, source: old?.source || 'local' })
    cursor += minutes
  }
  while (cursor + duration <= end) {
    count += 1
    append(`P${count}`, 'class', duration)
    if (count === Number(settings.breakAfter) && shortBreak && cursor + shortBreak <= end) append('Break', 'break', shortBreak)
    if (count === Number(settings.lunchAfter) && lunch && cursor + lunch <= end) append('Lunch', 'lunch', lunch)
  }
  if (!count) errors.push('The college day is shorter than one teaching period.')
  return { periods, errors, unusedMinutes: end - cursor }
}

// Consecutive teaching sessions cannot cross a non-teaching interval.
export function periodSessions(periods = [], size = 1) {
  const sorted = teachingPeriods(periods).filter(validTime).sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
  return sorted.map((_, index) => sorted.slice(index, index + size))
    .filter(block => block.length === size && block.every((row, index) => !index || timeMinutes(block[index - 1].endTime) === timeMinutes(row.startTime))
      && !periods.some(row => !isTeachingPeriod(row) && overlaps(row, { startTime: block[0].startTime, endTime: block.at(-1).endTime })))
}
