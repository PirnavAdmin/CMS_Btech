import { demoAcademicData, demoWeekdays } from '../services/timetableMockData.js'
import { demoEntryOverlaps, demoEntryPeriodIndices, demoEntryTimes, demoTeachingPeriods } from './timetableDemoGenerator.js'

const entryRows = state => Object.values(state.schedules || {}).flatMap(schedule => schedule.entries || [])
const sectionFor = id => demoAcademicData.sections.find(row => row.id === id)
const subjectFor = id => demoAcademicData.subjects.find(row => row.id === id)
const samePeriods = (left, right) => demoEntryOverlaps({ ...left, periodIndices: demoEntryPeriodIndices(left) }, { ...right, periodIndices: demoEntryPeriodIndices(right) })
const sectionName = id => sectionFor(id)?.name || 'Unknown section'
const facultyName = id => demoAcademicData.faculty.find(row => row.id === id)?.name || 'Unknown faculty'

export function validateDemoSettings(settings) {
  const errors = []
  const count = Number(settings.periodsPerDay), duration = Number(settings.periodDuration)
  const start = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.startTime || '')
  if (!start) errors.push('Enter a valid college start time.')
  if (!Number.isInteger(count) || count < 1 || count > 12) errors.push('Periods per day must be between 1 and 12.')
  if (!Number.isInteger(duration) || duration < 25 || duration > 120) errors.push('Period duration must be between 25 and 120 minutes.')
  if (!Array.isArray(settings.workingDays) || !settings.workingDays.length || settings.workingDays.some(day => !demoWeekdays.includes(day))) errors.push('Select at least one valid working day.')
  if (Number(settings.breakAfter) < 0 || Number(settings.breakAfter) > count || Number(settings.lunchAfter) < 0 || Number(settings.lunchAfter) > count) errors.push('Break and lunch positions must be within the teaching day.')
  if (Number(settings.breakDuration) < 0 || Number(settings.lunchDuration) < 0) errors.push('Break and lunch durations cannot be negative.')
  return errors
}

export function validateDemoEntry(state, candidate, excludeId = '') {
  const errors = [], section = sectionFor(candidate.sectionId), subject = subjectFor(candidate.subjectId)
  const periods = demoTeachingPeriods(state.settings), indices = demoEntryPeriodIndices(candidate)
  const times = demoEntryTimes(state.settings, candidate.periodIndex, candidate.duration || subject?.blockSize || 1)
  if (!section) errors.push('Select a valid demo section.')
  if (!subject || subject.branchId !== section?.branchId || subject.semesterId !== section?.semesterId) errors.push('Select a subject available for this section.')
  if (!state.settings.workingDays.includes(candidate.dayOfWeek)) errors.push('Select an enabled working day.')
  if (!times || indices.some(index => !periods.some(period => period.index === index))) errors.push('Class must fit in teaching periods and cannot cross Break or Lunch.')
  if (!candidate.facultyId) errors.push('Select faculty for this class.')
  if (!candidate.roomId || !demoAcademicData.rooms.some(room => room.id === candidate.roomId)) errors.push('Select a demo classroom or lab.')
  const allocation = state.allocations.find(row => row.sectionId === candidate.sectionId && row.subjectId === candidate.subjectId && row.facultyId === candidate.facultyId)
  if (section && subject && !allocation) errors.push(`${facultyName(candidate.facultyId)} is not allocated to ${subject.name} in ${section.name}. Review Faculty Coverage first.`)
  const room = demoAcademicData.rooms.find(row => row.id === candidate.roomId)
  if (subject && room && ((subject.type === 'LAB' && room.type !== 'LAB') || (subject.type !== 'LAB' && room.type !== 'CLASSROOM'))) errors.push(subject.type === 'LAB' ? 'Lab subjects must use a lab room.' : 'Theory subjects must use a classroom.')

  const proposed = { ...candidate, ...times, periodIndices: indices }
  for (const existing of entryRows(state)) {
    if (existing.id === excludeId || !samePeriods(proposed, existing)) continue
    const collision = []
    if (existing.sectionId === candidate.sectionId) collision.push('Section')
    if (candidate.facultyId && existing.facultyId === candidate.facultyId) collision.push('Faculty')
    if (candidate.roomId && existing.roomId === candidate.roomId) collision.push('Room')
    if (collision.length) errors.push(`${collision.join(' / ')} conflict: ${facultyName(existing.facultyId)} is already scheduled for ${sectionName(existing.sectionId)} on ${existing.dayOfWeek} P${existing.periodIndex} (${existing.startTime}-${existing.endTime}).`)
  }
  const suggestions = errors.length && section && subject && candidate.facultyId ? findSuggestions(state, proposed, excludeId) : []
  return { valid: errors.length === 0, errors: [...new Set(errors)], suggestions }
}

function findSuggestions(state, candidate, excludeId) {
  const rooms = demoAcademicData.rooms.filter(room => subjectFor(candidate.subjectId)?.type === 'LAB' ? room.type === 'LAB' : room.type === 'CLASSROOM')
  const options = []
  for (const day of state.settings.workingDays) for (const period of demoTeachingPeriods(state.settings)) for (const room of rooms) {
    const times = demoEntryTimes(state.settings, period.index, candidate.duration || 1)
    if (!times) continue
    const option = { ...candidate, dayOfWeek: day, periodIndex: period.index, periodIndices: Array.from({ length: candidate.duration || 1 }, (_, index) => period.index + index), roomId: room.id, ...times }
    if (entryRows(state).some(row => row.id !== excludeId && samePeriods(option, row) && (row.sectionId === option.sectionId || row.facultyId === option.facultyId || row.roomId === option.roomId))) continue
    options.push({ dayOfWeek: day, periodIndex: period.index, periodName: `P${period.index}`, startTime: times.startTime, endTime: times.endTime, roomId: room.id, roomName: room.name })
    if (options.length === 3) return options
  }
  return options
}

export function validateDemoSchedules(state, scope) {
  const sections = demoAcademicData.sections.filter(row => row.branchId === scope.branchId && row.semesterId === scope.semesterId)
  const errors = validateDemoSettings(state.settings), rows = sections.flatMap(section => state.schedules[section.id]?.entries || [])
  rows.forEach(row => {
    const validation = validateDemoEntry(state, row, row.id)
    errors.push(...validation.errors.map(message => `${sectionName(row.sectionId)} · ${message}`))
  })
  const selected = Object.entries(state.subjectConfig || {}).filter(([, value]) => value.selected)
  const unscheduled = state.unscheduled.filter(item => {
    if (!sections.some(section => section.id === item.sectionId) || !state.subjectConfig[item.subjectId]?.selected) return false
    const required = Number(state.subjectConfig[item.subjectId]?.periodsPerWeek || 0)
    const scheduled = (state.schedules[item.sectionId]?.entries || []).filter(row => row.subjectId === item.subjectId).reduce((sum, row) => sum + demoEntryPeriodIndices(row).length, 0)
    return scheduled < required
  })
  const missing = sections.flatMap(section => selected.filter(([subjectId]) => subjectFor(subjectId)?.branchId === scope.branchId && subjectFor(subjectId)?.semesterId === scope.semesterId).map(([subjectId, config]) => {
    const count = (state.schedules[section.id]?.entries || []).filter(row => row.subjectId === subjectId).reduce((sum, row) => sum + demoEntryPeriodIndices(row).length, 0)
    if (count < Number(config.periodsPerWeek)) return `${section.name} · ${subjectFor(subjectId).name}: ${count}/${config.periodsPerWeek} periods scheduled`
    if (count > Number(config.periodsPerWeek)) return `${section.name} · ${subjectFor(subjectId).name}: ${count}/${config.periodsPerWeek} periods scheduled (over requirement)`
    return ''
  }).filter(Boolean))
  errors.push(...unscheduled.map(item => `${sectionName(item.sectionId)} · ${subjectFor(item.subjectId)?.name || 'Subject'}: ${item.remaining} unscheduled. ${item.reason}`))
  errors.push(...missing)
  return { valid: errors.length === 0, errors: [...new Set(errors)], checks: ['Section availability', 'Faculty across all sections', 'Room across all sections', 'Working days', 'Break and lunch boundaries', 'Lab blocks', 'Weekly subject requirements'] }
}
