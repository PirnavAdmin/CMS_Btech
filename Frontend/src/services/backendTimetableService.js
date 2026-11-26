import { timetableManagementApi as api } from '../api/apiEndpoints'
import { timetableLifecycleApi as lifecycle } from '../api/timetableLifecycleApi'
import { timetableService } from './timetableService'
import { same, normalizeEntry, timeMinutes } from '../utils/timetableUtils'
import { timetableDateErrors } from '../utils/timetableSemester'
import { periodType, isTeachingPeriod } from '../utils/timetablePeriods'

const id = value => {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Select a valid backend record before continuing.')
  return number
}
const rows = value => {
  if (!Array.isArray(value)) throw new Error('The timetable API returned an invalid list.')
  return value
}
const path = value => `/timetables/${id(value)}`
const date = value => String(value || '').slice(0, 10)
const timestamp = value => value ? `${date(value)}T00:00:00` : null
const period = row => ({ ...row, id: String(row.timetableSlotId ?? row.periodId ?? row.id ?? row.displayOrder), periodId: row.periodId,
  name: row.periodName || row.slotName || row.name, type: String(row.periodType || row.type || 'CLASS').toLowerCase(),
  startTime: String(row.startTime || '').slice(0, 5), endTime: String(row.endTime || '').slice(0, 5), source: 'backend' })

export function normalizeTimetable(detail, periods, calendar, classrooms) {
  const table = detail.timetable
  if (!table?.timetableId || !Array.isArray(detail.entries) || !Array.isArray(detail.slots)) throw new Error('The timetable detail response is incomplete.')
  const publicationStatus = table.status.toUpperCase() === 'GENERATED' ? 'draft' : table.status.toLowerCase()
  const slots = detail.slots.filter(row => row.active !== false).map(period)
  const configured = periods.filter(row => row.active !== false).map(period)
  const planningPeriods = configured.length ? configured.map(row => {
    const slot = slots.find(item => item.startTime === row.startTime && item.endTime === row.endTime)
    return { ...row, id: isTeachingPeriod(row) && slot ? slot.id : `period:${row.id}`, timetableSlotId: slot?.id }
  }) : slots
  return { ...table, id: String(table.timetableId), name: table.timetableName, origin: 'backend',
    publicationStatus, revision: table.revision,
    entries: detail.entries.filter(row => row.active !== false).map(row => normalizeEntry({ ...table, ...row, id: row.timetableEntryId,
      roomId: row.classroomId, classroom: row.classroomName || row.classroom, status: row.active,
      publicationStatus, origin: 'backend' })),
    planning: { periodMode: 'manual', periods: planningPeriods, rooms: classrooms.filter(row => row.active !== false).map(row => `id:${row.classroomId}`),
      calendar: { startDate: date(table.effectiveFrom), endDate: date(table.effectiveTo),
        workingDays: (calendar.workingDays || []).map(day => day.toUpperCase()), holidays: (calendar.holidays || []).map(row => date(row.date)), reviewed: calendar.reviewed === true },
      requirements: Object.fromEntries((detail.requirements || []).filter(row => row.periodsPerWeek > 0).map(row => [row.subjectId, { periodsPerWeek: row.periodsPerWeek, blockSize: row.blockSize }])) },
  }
}

export const backendEntries = tables => tables.flatMap(table => table.entries.map(row => ({ ...row, timetableId: table.id, timetableName: table.name, publicationStatus: table.publicationStatus })))

export const backendTimetableService = {
  async getSources() {
    const [sources, classrooms] = await Promise.all([timetableService.getSources(), api.get('/classrooms')])
    const yearSettings = Object.fromEntries(await Promise.all(sources.years.map(async year => {
      const academicYearId = id(year.id)
      const [periods, calendar] = await Promise.all([api.get('/periods', { academicYearId }), api.get('/calendar', { academicYearId })])
      return [year.id, { periods: rows(periods).filter(row => row.active !== false).map(period), calendar: {
        workingDays: (calendar.workingDays || []).map(day => day.toUpperCase()), holidays: (calendar.holidays || []).map(row => date(row.date)), reviewed: calendar.reviewed === true,
      } }]
    })))
    return { ...sources, classrooms: rows(classrooms), yearSettings }
  },
  async detail(tableId, classrooms) {
    const detail = await api.get(path(tableId))
    const academicYearId = id(detail?.timetable?.academicYearId)
    const planning = detail.planning
    const [periods, calendar, rooms] = await Promise.all([
      planning?.periods ?? api.get('/periods', { academicYearId }),
      planning?.calendar ?? api.get('/calendar', { academicYearId }),
      classrooms || api.get('/classrooms'),
    ])
    return normalizeTimetable(detail, rows(periods), calendar, rows(rooms))
  },
  async list() {
    const [tables, classrooms] = await Promise.all([api.get('/timetables'), api.get('/classrooms')])
    return Promise.all(rows(tables).map(table => this.detail(table.timetableId, rows(classrooms))))
  },
  async setup(scope, name, config, options = {}) {
    const dateErrors = timetableDateErrors(config?.calendar)
    if (dateErrors.length) throw new Error(dateErrors.join('\n'))
    if (options.tableId && (await this.detail(options.tableId)).publicationStatus !== 'draft') throw new Error('Only draft timetable settings can be changed.')
    const payload = {
      timetableName: name,
      effectiveFrom: timestamp(config.calendar.startDate),
      effectiveTo: timestamp(config.calendar.endDate),
      planning: {
        periods: [...config.periods].sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((row, index) => ({ periodName: row.name, startTime: row.startTime.slice(0, 5),
            endTime: row.endTime.slice(0, 5), periodType: periodType(row).toUpperCase(), displayOrder: index + 1 })),
        calendar: { reviewed: config.calendar.reviewed, workingDays: config.calendar.workingDays,
          holidays: config.calendar.holidays.filter(Boolean).map(value => ({ date: timestamp(value), type: 'HOLIDAY', description: 'Non-working date' })) },
      },
    }
    let tableId = options.tableId
    if (tableId) await api.put(path(tableId), payload)
    else {
      const created = await api.post('/timetables', { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, id(scope[field])])), ...payload })
      tableId = created?.timetableId ?? created?.timetable?.timetableId
    }
    await this.saveRequirements(tableId, config.requirements)
    return this.detail(tableId)
  },
  async saveRequirements(tableId, requirements = {}) {
    return api.put(`${path(tableId)}/requirements`, { requirements: Object.entries(requirements).filter(([, value]) => value.periodsPerWeek !== '' && value.periodsPerWeek != null).map(([subjectId, value]) => ({ subjectId: id(subjectId), periodsPerWeek: Number(value.periodsPerWeek), blockSize: Number(value.blockSize || 1) })) })
  },
  async savePlanning(tableId, revision, config) {
    await this.saveRequirements(tableId, config.requirements)
    return this.detail(tableId)
  },
  async generate(scope, name, config, options = {}) {
    const tableId = id(options.tableId)
    const operation = options.replace ? 'regenerate' : options.initial ? 'generate' : 'generateMissing'
    const result = await lifecycle[operation]({ timetableId: tableId }, {
      replaceGenerated: Boolean(options.replace), classroomIds: config.rooms.map(value => id(value.replace(/^id:/, ''))) })
    const table = await this.detail(tableId)
    return { ...table, added: result?.added ?? result?.generatedCount ?? 0, issues: result?.issues || [] }
  },
  async saveEntry(tableId, revision, form) {
    const table = await this.detail(tableId)
    const slots = table.planning.periods.filter(row => isTeachingPeriod(row) && timeMinutes(row.startTime) >= timeMinutes(form.startTime) && timeMinutes(row.endTime) <= timeMinutes(form.endTime))
    if (!slots.length || slots[0].startTime !== form.startTime.slice(0, 5) || slots.at(-1).endTime !== form.endTime.slice(0, 5)) throw new Error('Choose a valid teaching period.')
    const payload = { dayOfWeek: form.dayOfWeek, subjectId: id(form.subjectId), facultyId: id(form.facultyId), classroomId: id(form.roomId),
      timetableSlotId: id(slots[0].id), timetableSlotIds: slots.map(row => id(row.id)), entryType: form.entryType || 'LECTURE' }
    return form.id ? api.put(`${path(tableId)}/entries/${id(form.id)}`, payload) : api.post(`${path(tableId)}/entries`, payload)
  },
  removeEntry: (tableId, revision, entryId) => api.remove(`${path(tableId)}/entries/${id(entryId)}`),
  async validate(tableId) {
    const result = await api.post(`${path(tableId)}/validate`)
    return { ...result, valid: result?.valid === true || result?.isValid === true, checks: result?.checks || ['Backend conflict and scheduling validation completed'], warnings: result?.warnings || [], message: result?.message || [...(result?.errors || []), ...(result?.conflicts || []), ...(result?.unscheduled || [])].map(row => typeof row === 'string' ? row : row.message).filter(Boolean).join('\n') }
  },
  publish: tableId => api.post(`${path(tableId)}/publish`),
  reopen: tableId => api.post(`${path(tableId)}/reopen`),
  // Preserve opaque responses until authenticated examples establish their shape.
  status: tableId => lifecycle.status({ timetableId: tableId }),
  validateGlobal: tableId => lifecycle.validateGlobal({ timetableId: tableId }),
  roomAvailability: (tableId, timetableSlotId, dayOfWeek) => lifecycle.roomAvailability({ timetableId: tableId, timetableSlotId, dayOfWeek }),
  async moveEntry(tableId, entryId, { dayOfWeek, timetableSlotId, classroomId }) {
    await lifecycle.moveEntry({ timetableId: tableId, entryId }, { dayOfWeek, timetableSlotId: id(timetableSlotId), ...(classroomId == null ? {} : { classroomId: id(classroomId) }) })
    return this.detail(tableId)
  },
  occurrences: query => lifecycle.occurrences(query),
  view: (kind, recordId, query) => api.get(`/views/${kind}/${id(recordId)}`, query).then(rows),
}
