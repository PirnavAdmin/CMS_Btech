import { DAYS, key, same, active, matchesScope, eligibleSubjects, eligibleFaculty, validTime, timeMinutes, overlaps, conflictsFor, roomKey } from './timetableUtils.js'
import { isTeachingPeriod, teachingPeriods, periodSetupErrors, periodSessions } from './timetablePeriods.js'

export const WEEKDAYS = [...DAYS, 'SUNDAY']
export const dateKey = value => key(value).slice(0, 10)
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
export const weekday = date => ['SUNDAY', ...DAYS][new Date(`${date}T12:00:00Z`).getUTCDay()]

export function calendarBounds(sources, scope) {
  const year = sources.years.find(row => same(row.id, scope.academicYearId))
  const semester = sources.semesters.find(row => same(row.id, scope.semesterId))
  const starts = [year?.startDate, semester?.startDate].map(dateKey).filter(validDate).sort()
  const ends = [year?.endDate, semester?.endDate].map(dateKey).filter(validDate).sort()
  return { startDate: starts.at(-1) || '', endDate: ends[0] || '' }
}

// Explicit local exceptions are used until the backend supplies a calendar.
export function workingDate(date, calendar) {
  if (!validDate(date)) return { working: false, reason: 'Invalid date' }
  if (!calendar?.reviewed || !validDate(calendar.startDate) || !validDate(calendar.endDate)) return { working: false, reason: 'Calendar has not been configured and reviewed' }
  if (date < calendar.startDate || date > calendar.endDate) return { working: false, reason: 'Outside academic / semester dates' }
  if ((calendar.holidays || []).includes(date)) return { working: false, reason: 'Holiday / non-working date' }
  if (!(calendar.workingDays || []).includes(weekday(date))) return { working: false, reason: 'Non-working weekday' }
  return { working: true, reason: '' }
}

export function calendarDays(calendar) {
  if (!calendar?.reviewed || !validDate(calendar.startDate) || !validDate(calendar.endDate) || calendar.startDate > calendar.endDate) return []
  const result = [], end = Date.parse(`${calendar.endDate}T12:00:00Z`)
  // Protect the UI from accidentally configured multi-decade ranges.
  if ((end - Date.parse(`${calendar.startDate}T12:00:00Z`)) / 86400000 > 730) return []
  for (let time = Date.parse(`${calendar.startDate}T12:00:00Z`); time <= end; time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10)
    if (workingDate(date, calendar).working) result.push(date)
  }
  return result
}

export function roomOptions(sources, entries = []) {
  const rooms = [...(sources.classrooms || []).filter(row => row.active !== false).map(row => ({ classroom: row.classroomName, roomId: row.classroomId, roomType: row.roomType })), ...sources.sections.filter(active).filter(row => row.room).map(row => ({ classroom: row.room, roomId: row.roomId ?? row.classroomId, roomType: row.roomType })), ...entries.filter(active)]
  const result = new Map()
  for (const row of rooms.filter(row => key(row.classroom))) {
    const id = key(row.roomId ?? row.classroomId)
    const value = id ? `id:${id}` : `text:${roomKey(row)}`
    const previous = result.get(value)
    result.set(value, { value, name: key(row.classroom), classroom: key(row.classroom), ...(id ? { roomId: id } : {}), roomType: row.roomType || previous?.roomType || '' })
  }
  if (sources.classrooms) return [...result.values()].filter(room => sources.classrooms.some(row => row.active !== false && same(row.classroomId, room.roomId))).sort((a, b) => a.name.localeCompare(b.name))
  // When an authoritative ID exists, prefer it over a text-only alias.
  const all = [...result.values()]
  return all.filter(room => room.roomId || !all.some(other => other.roomId && roomKey(other) === roomKey(room))).sort((a, b) => a.name.localeCompare(b.name))
}

export function sourcePeriods(entries = []) {
  return [...new Map(entries.filter(row => active(row) && validTime(row) && row.timetableSlotId).map(row => [`${row.startTime.slice(0, 5)}-${row.endTime.slice(0, 5)}`, { id: key(row.timetableSlotId), startTime: row.startTime.slice(0, 5), endTime: row.endTime.slice(0, 5), source: row.origin === 'local' ? 'local' : 'backend' }])).values()].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
}

export function suitableRoom(subject, room) {
  if (!room.roomType) return true
  if (/lab|practical/i.test(subject.subjectType || '')) return /lab/i.test(room.roomType)
  if (/theory|lecture|tutorial/i.test(subject.subjectType || '')) return !/lab/i.test(room.roomType)
  return true
}

export function subjectRequirements(sources, scope, overrides = {}) {
  return eligibleSubjects(sources.subjects, scope).map(subject => {
    const allocations = sources.allocations.filter(row => active(row) && same(row.subjectId, subject.id) && matchesScope(row, scope, ['branchId', 'semesterId']) && ['academicYearId', 'courseId', 'sectionId'].every(field => !row[field] || same(row[field], scope[field])))
    const counts = [...new Set(allocations.map(row => Number(row.periodsPerWeek)).filter(value => Number.isInteger(value) && value > 0))]
    const explicit = overrides[key(subject.id)] || {}
    const count = explicit.periodsPerWeek !== undefined && explicit.periodsPerWeek !== '' ? Number(explicit.periodsPerWeek) : counts.length === 1 ? counts[0] : 0
    const blockSize = explicit.blockSize !== undefined && explicit.blockSize !== '' ? Number(explicit.blockSize) : 1
    return { subject, faculty: eligibleFaculty(sources.faculty, sources.allocations, subject.id, scope), periodsPerWeek: count, blockSize, source: explicit.periodsPerWeek !== undefined && explicit.periodsPerWeek !== '' ? 'Planning setting' : counts.length === 1 ? 'Faculty allocation' : 'Not configured' }
  })
}

export function planningErrors(config, sources, scope, entries = []) {
  const errors = [], calendar = config?.calendar, periods = config?.periods || []
  const bounds = calendarBounds(sources, scope)
  if (!calendar?.reviewed) errors.push('Review the working calendar and confirm holidays before generation or publication.')
  if (!validDate(calendar?.startDate) || !validDate(calendar?.endDate) || calendar.startDate > calendar.endDate) errors.push('Enter a valid timetable start and end date.')
  else {
    if ((bounds.startDate && calendar.startDate < bounds.startDate) || (bounds.endDate && calendar.endDate > bounds.endDate)) errors.push('Timetable dates must stay within the academic year and semester dates.')
    if (!calendarDays(calendar).length) errors.push('No working dates exist in the reviewed calendar (maximum range: two years).')
  }
  if (!calendar?.workingDays?.length || calendar.workingDays.some(day => !WEEKDAYS.includes(day))) errors.push('Select valid working weekdays.')
  if ((calendar?.holidays || []).some(date => !validDate(date))) errors.push('Enter holidays as valid YYYY-MM-DD dates.')
  errors.push(...periodSetupErrors(periods))
  const rooms = roomOptions(sources, entries)
  if (!config?.rooms?.length || config.rooms.some(value => !rooms.some(room => room.value === value))) errors.push('Select an available classroom or lab.')
  return errors
}

export function entryPlanningErrors(row, config, sources, scope, allEntries = []) {
  if (!config) return [] // Legacy manual drafts are still readable; publish requires a reviewed plan.
  const errors = [], days = new Set(calendarDays(config.calendar).map(weekday))
  if (!days.has(row.dayOfWeek)) errors.push('This day has no working dates in the selected calendar.')
  const periods = teachingPeriods(config.periods).filter(period => timeMinutes(period.startTime) >= timeMinutes(row.startTime) && timeMinutes(period.endTime) <= timeMinutes(row.endTime)).sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
  if ((config.periods || []).some(period => !isTeachingPeriod(period) && overlaps(period, row))) errors.push('Classes cannot overlap Break or Lunch.')
  if (!periods.length || timeMinutes(periods[0].startTime) !== timeMinutes(row.startTime) || timeMinutes(periods.at(-1).endTime) !== timeMinutes(row.endTime) || periods.some((period, index) => index && timeMinutes(periods[index - 1].endTime) !== timeMinutes(period.startTime))) errors.push('Class times must match one period or consecutive configured periods.')
  const room = roomOptions(sources, allEntries).find(item => item.roomId && row.roomId ? same(item.roomId, row.roomId) : roomKey(item) === roomKey(row))
  if (!room || !config.rooms.includes(room.value)) errors.push('Choose a room selected in the planning settings.')
  const requirement = subjectRequirements(sources, scope, config.requirements).find(item => same(item.subject.id, row.subjectId))
  if (requirement && periods.length !== requirement.blockSize) errors.push('Class duration must match the configured consecutive periods per session.')
  if (requirement && room && !suitableRoom(requirement.subject, room)) errors.push('Subject type requires a suitable classroom or lab.')
  return errors
}

export function schedulingIssues(sources, scope, config, scheduled) {
  const issues = []
  const requirements = subjectRequirements(sources, scope, config?.requirements)
  if (!requirements.length) issues.push({ subjectId: '', subjectName: 'Subjects', reason: 'No active API subjects match this academic mapping.' })
  for (const item of requirements) {
    const count = scheduled.filter(row => same(row.subjectId, item.subject.id)).reduce((total, row) => total + teachingPeriods(config?.periods).filter(period => timeMinutes(period.startTime) >= timeMinutes(row.startTime) && timeMinutes(period.endTime) <= timeMinutes(row.endTime)).length, 0)
    let reason = ''
    const missingFrequency = !Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1
    if (missingFrequency) reason = `${item.faculty.length ? '' : 'No allocated faculty available. '}Required weekly periods are missing or ambiguous. Auto Generation cannot determine repetitions. Add classes manually or configure a weekly frequency.`
    else if (!item.faculty.length) reason = 'No allocated faculty available.'
    else if (!Number.isInteger(item.blockSize) || item.blockSize < 1 || item.periodsPerWeek % item.blockSize) reason = 'Weekly periods must be divisible by the consecutive periods per session.'
    else if (count < item.periodsPerWeek) reason = `${item.periodsPerWeek - count} of ${item.periodsPerWeek} weekly periods remain unscheduled. No valid conflict-free slot, faculty or room may be available.`
    else if (count > item.periodsPerWeek) reason = `${count} periods scheduled; requirement is ${item.periodsPerWeek}. Review manual entries.`
    if (reason) issues.push({ subjectId: key(item.subject.id), subjectName: item.subject.name, reason, blocking: !missingFrequency || item.source === 'Planning setting', code: missingFrequency ? 'frequency' : 'unscheduled' })
  }
  return issues
}

// Deterministic constrained-first placement, preserving every existing manual row.
// Exhaustion is reported, never interpreted as proof that no solution can exist.
export function generateTimetable({ scope, sources, config, existing = [], occupied = [], references = occupied, makeId = () => crypto.randomUUID() }) {
  const errors = planningErrors(config, sources, scope, references)
  if (errors.length) return { entries: existing, added: 0, issues: errors.map(reason => ({ subjectId: '', subjectName: 'Planning settings', reason })) }
  const entries = [...existing], rooms = roomOptions(sources, references).filter(row => config.rooms.includes(row.value))
  const days = [...new Set(calendarDays(config.calendar).map(weekday))].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
  const requirements = subjectRequirements(sources, scope, config.requirements).sort((a, b) => a.faculty.length - b.faculty.length || b.blockSize - a.blockSize || key(a.subject.id).localeCompare(key(b.subject.id)))
  for (const item of requirements) {
    if (!Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1 || !Number.isInteger(item.blockSize) || item.blockSize < 1 || item.periodsPerWeek % item.blockSize || !item.faculty.length) continue
    const already = entries.filter(row => same(row.subjectId, item.subject.id)).reduce((total, row) => total + teachingPeriods(config.periods).filter(period => timeMinutes(period.startTime) >= timeMinutes(row.startTime) && timeMinutes(period.endTime) <= timeMinutes(row.endTime)).length, 0)
    const missing = Math.max(0, item.periodsPerWeek - already)
    const blocks = periodSessions(config.periods, item.blockSize)
    for (let count = 0; count + item.blockSize <= missing; count += item.blockSize) {
      let chosen = null
      const balancedDays = [...days].sort((a, b) => entries.filter(row => row.dayOfWeek === a).length - entries.filter(row => row.dayOfWeek === b).length || WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
      for (const dayOfWeek of balancedDays) {
        for (const block of blocks) {
          for (const faculty of item.faculty) {
            for (const room of rooms) {
              if (!suitableRoom(item.subject, room)) continue
              const candidate = { subjectId: key(item.subject.id), facultyId: key(faculty.id), sectionId: scope.sectionId, dayOfWeek, startTime: block[0].startTime, endTime: block.at(-1).endTime, timetableSlotId: block[0].id, periodIds: block.map(row => row.id), classroom: room.classroom, ...(room.roomId ? { roomId: room.roomId } : {}), entryType: item.subject.subjectType || '', generated: true }
              if (!conflictsFor(candidate, [...occupied, ...entries.map(row => ({ ...row, sectionId: scope.sectionId }))]).length) { chosen = candidate; break }
            }
            if (chosen) break
          }
          if (chosen) break
        }
        if (chosen) break
      }
      if (!chosen) break
      entries.push({ ...chosen, id: makeId() })
    }
  }
  return { entries, added: entries.length - existing.length, issues: schedulingIssues(sources, scope, config, entries) }
}

export function classesOnDate(entries, date, calendarForEntry) {
  return entries.filter(row => row.dayOfWeek === weekday(date) && workingDate(date, calendarForEntry(row)).working)
}
