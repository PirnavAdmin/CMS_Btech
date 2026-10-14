import { demoAcademicData, defaultDemoSettings } from '../services/timetableMockData.js'

const toMinutes = value => { const [hours, minutes] = String(value || '09:00').split(':').map(Number); return hours * 60 + minutes }
const fromMinutes = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
export const buildDemoPeriods = (settings = defaultDemoSettings) => {
  const periods = []; let minute = toMinutes(settings.startTime)
  for (let index = 1; index <= Number(settings.periodsPerDay); index += 1) {
    const startTime = fromMinutes(minute), endTime = fromMinutes(minute + Number(settings.periodDuration))
    periods.push({ index, name: `P${index}`, startTime, endTime, type: 'CLASS' }); minute += Number(settings.periodDuration)
    if (index === Number(settings.breakAfter) && Number(settings.breakDuration) > 0) {
      periods.push({ index: `break-${index}`, name: 'BREAK', startTime: fromMinutes(minute), endTime: fromMinutes(minute + Number(settings.breakDuration)), type: 'BREAK' }); minute += Number(settings.breakDuration)
    }
    if (index === Number(settings.lunchAfter) && Number(settings.lunchDuration) > 0) {
      periods.push({ index: `lunch-${index}`, name: 'LUNCH', startTime: fromMinutes(minute), endTime: fromMinutes(minute + Number(settings.lunchDuration)), type: 'LUNCH' }); minute += Number(settings.lunchDuration)
    }
  }
  return periods
}

const teaching = settings => buildDemoPeriods(settings).filter(period => period.type === 'CLASS')
const eligibleRoom = (subject, room) => subject?.type === 'LAB' ? room.type === 'LAB' : room.type === 'CLASSROOM'
const timesFor = (settings, startIndex, duration) => {
  const periods = teaching(settings), block = Array.from({ length: duration }, (_, offset) => periods.find(period => period.index === startIndex + offset))
  if (block.some(period => !period) || block.slice(1).some((period, index) => period.startTime !== block[index].endTime)) return null
  return { startTime: block[0].startTime, endTime: block.at(-1).endTime }
}
const overlapsSlots = (left, right) => left.dayOfWeek === right.dayOfWeek && left.periodIndices.some(index => right.periodIndices.includes(index))
const entrySlots = entry => entry.periodIndices || Array.from({ length: entry.duration || 1 }, (_, offset) => Number(entry.periodIndex) + offset)
const normalizedEntry = entry => ({ ...entry, periodIndices: entrySlots(entry) })

export const scheduleScopeSections = scope => demoAcademicData.sections.filter(section => section.branchId === scope.branchId && section.semesterId === scope.semesterId)

export function generateDemoTimetables(state, scope, { missingOnly = false } = {}) {
  const settings = state.settings, sections = scheduleScopeSections(scope), days = settings.workingDays
  const selected = new Set(Object.entries(state.subjectConfig || {}).filter(([, config]) => config.selected).map(([id]) => id))
  const schedules = { ...state.schedules }
  const sectionIds = new Set(sections.map(section => section.id))
  const retained = missingOnly ? sections.flatMap(section => schedules[section.id]?.entries || []) : []
  const outsideExisting = Object.entries(schedules).filter(([sectionId]) => !sectionIds.has(sectionId)).flatMap(([, schedule]) => schedule.entries || [])
  for (const section of sections) {
    const existing = missingOnly ? [...(schedules[section.id]?.entries || [])] : []
    schedules[section.id] = { sectionId: section.id, entries: existing, publicationStatus: 'DRAFT' }
  }
  const occupied = [...outsideExisting, ...retained].map(normalizedEntry)
  const unscheduled = state.unscheduled.filter(item => !sectionIds.has(item.sectionId))
  const subjects = demoAcademicData.subjects.filter(subject => subject.branchId === scope.branchId && subject.semesterId === scope.semesterId && selected.has(subject.id))
  const requests = sections.flatMap(section => subjects.map(subject => {
    const allocation = state.allocations.find(row => row.sectionId === section.id && row.subjectId === subject.id)
    const required = Number(state.subjectConfig[subject.id]?.periodsPerWeek ?? subject.periodsPerWeek)
    const done = (schedules[section.id].entries || []).filter(entry => entry.subjectId === subject.id).reduce((total, entry) => total + entrySlots(entry).length, 0)
    return { section, subject, allocation, required, remaining: Math.max(0, required - done) }
  })).filter(row => row.remaining > 0).sort((a, b) => b.subject.blockSize - a.subject.blockSize || a.remaining - b.remaining || a.section.id.localeCompare(b.section.id))

  for (const request of requests) {
    const { section, subject, allocation } = request
    const duration = Number(subject.blockSize || 1)
    if (!allocation?.facultyId || request.remaining % duration) {
      unscheduled.push({ sectionId: section.id, subjectId: subject.id, required: request.required, remaining: request.remaining, reason: !allocation?.facultyId ? 'Faculty is not allocated for this section.' : `Remaining periods must fit a ${duration}-period block.` })
      continue
    }
    for (let done = 0; done < request.remaining; done += duration) {
      const candidates = []
      days.forEach((day, dayIndex) => teaching(settings).forEach(period => {
        if (!timesFor(settings, period.index, duration)) return
        candidates.push({ day, dayIndex, periodIndex: period.index })
      }))
      const rotation = demoAcademicData.sections.findIndex(item => item.id === section.id)
      candidates.sort((a, b) => ((a.dayIndex + rotation) % Math.max(days.length, 1)) - ((b.dayIndex + rotation) % Math.max(days.length, 1)) || ((a.periodIndex + rotation * 2) % Number(settings.periodsPerDay)) - ((b.periodIndex + rotation * 2) % Number(settings.periodsPerDay)))
      let placed = false
      for (const candidate of candidates) {
        const periodIndices = Array.from({ length: duration }, (_, offset) => candidate.periodIndex + offset)
        const time = timesFor(settings, candidate.periodIndex, duration)
        const rooms = demoAcademicData.rooms.filter(room => eligibleRoom(subject, room))
        for (let roomOffset = 0; roomOffset < rooms.length; roomOffset += 1) {
          const room = rooms[(roomOffset + rotation) % rooms.length]
          const entry = { id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`, sectionId: section.id, subjectId: subject.id, facultyId: allocation.facultyId, roomId: room.id, dayOfWeek: candidate.day, periodIndex: candidate.periodIndex, periodIndices, duration, ...time, generated: true }
          const busy = occupied.some(other => overlapsSlots(normalizedEntry(other), normalizedEntry(entry)) && (other.facultyId === entry.facultyId || other.roomId === entry.roomId || other.sectionId === entry.sectionId))
          if (busy) continue
          schedules[section.id].entries.push(entry); occupied.push(entry); placed = true; break
        }
        if (placed) break
      }
      if (!placed) {
        const remaining = request.remaining - done
        unscheduled.push({ sectionId: section.id, subjectId: subject.id, required: request.required, remaining, reason: 'No conflict-free day, period, faculty, and suitable room were available.' })
        break
      }
    }
  }
  return { ...state, schedules, unscheduled, lastGeneratedAt: new Date().toISOString() }
}

export const demoEntryTimes = (settings, periodIndex, duration = 1) => timesFor(settings, Number(periodIndex), Number(duration))
export const demoTeachingPeriods = settings => teaching(settings)
export const demoEntryPeriodIndices = entrySlots
export const demoEntryOverlaps = overlapsSlots
