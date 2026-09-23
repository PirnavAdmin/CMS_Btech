import { academicYearApi, courseApi, branchApi, sectionApi, facultyApi, facultyMasterApi, facultySubjectAllocationApi, studentProfilesApi, studentAdmissionApi, timetableEntryApi } from '../api/apiEndpoints'
import { sectionStudentProfiles } from '../utils/sectionStudents'
import { getAuthStorage } from '../auth/auth'
import { active, same, completeScope, matchesScope, normalizeEntry, eligibleSubjects, eligibleFaculty, existingTimetables, existingSlots, entryPayload, conflictsFor, validTime } from '../utils/timetableUtils'
import { generateTimetable, planningErrors, entryPlanningErrors, schedulingIssues } from '../utils/timetablePlanner'
import { isTeachingPeriod } from '../utils/timetablePeriods'

const master = (rows, kind) => rows.map(row => ({ ...row, id: row[`${kind}Id`] ?? row.id, name: row[`${kind}Name`] ?? row.name ?? row.fullName ?? '' }))
export const timetableCapabilities = Object.freeze({ entries: true, createTimetable: false, createSlot: false, draft: false, publish: false, roomIds: false, calendar: false, facultyAvailability: false, storage: 'backend' })

export const timetableService = {
  async getSources() {
    const [years, courses, branches, semesters, sections, subjects, faculty, allocations] = await Promise.all([
      academicYearApi.getAll(), courseApi.getAll(), branchApi.getAll(), facultyMasterApi.getSemesters(), sectionApi.getAll(), facultyMasterApi.getSubjects(), facultyApi.getAll(), facultySubjectAllocationApi.getAll(),
    ])
    return { years: master(years, 'academicYear'), courses: master(courses, 'course'), branches: master(branches, 'branch'), semesters: master(semesters, 'semester'), sections: master(sections, 'section'), subjects: master(subjects, 'subject'), faculty: master(faculty, 'faculty'), allocations }
  },
  async getStudents() {
    const [profiles, admissions] = await Promise.all([studentProfilesApi.getAll(), studentAdmissionApi.getAll()])
    return sectionStudentProfiles(profiles, admissions)
  },
  async list() { return timetableEntryApi.list() },
  async save(form, scope) {
    // Fetch the full schedule immediately before writing: all sections/faculty/rooms participate.
    const [sources, raw] = await Promise.all([this.getSources(), this.list()])
    const entries = raw.map(row => normalizeEntry(row, sources.sections))
    if (!completeScope(scope)) throw new Error('Complete the academic context and section first.')
    const section = sources.sections.find(row => same(row.id, scope.sectionId) && matchesScope(row, scope) && active(row))
    if (!section || !same(form.sectionId, scope.sectionId)) throw new Error('The selected section no longer matches the academic context.')
    if (!existingTimetables(entries, scope).some(row => same(row.id, form.timetableId))) throw new Error('Select an existing timetable for this section. Timetable creation is not exposed by the backend.')
    const current = form.id ? entries.find(row => same(row.id, form.id)) : null
    if (form.id && (!current || !same(current.sectionId, form.sectionId) || !same(current.timetableId, form.timetableId))) throw new Error('This entry changed or was removed. Refresh before editing.')
    const slot = existingSlots(entries, form.timetableId).find(row => same(row.id, form.timetableSlotId))
    if (!slot) throw new Error('The selected period is unavailable. Refresh and choose an existing period.')
    if (!eligibleSubjects(sources.subjects, scope).some(row => same(row.id, form.subjectId))) throw new Error('The subject is no longer active or does not match this semester.')
    if (!eligibleFaculty(sources.faculty, sources.allocations, form.subjectId, scope).some(row => same(row.id, form.facultyId))) throw new Error('The faculty member has no matching active subject allocation.')
    const candidate = { ...form, ...scope, startTime: slot.startTime, endTime: slot.endTime }
    if (!validTime(candidate)) throw new Error('This period has invalid start/end times.')
    const conflicts = conflictsFor(candidate, entries)
    if (conflicts.length) throw new Error(conflicts.map(row => row.message).join('\n'))
    const payload = entryPayload(candidate, Boolean(form.id))
    return form.id ? timetableEntryApi.update(form.id, payload) : timetableEntryApi.create(payload)
  },
  async remove(id) { return timetableEntryApi.remove(id) },
}

// Temporary workflow explicitly requested by the user after confirming missing setup/publish APIs.
// This is a separate adapter, never an HTTP-error fallback. No master records are persisted here.
const localKey = () => {
  const user = getAuthStorage()?.getItem('btech-user-id')
  if (!user) throw new Error('Sign in with a valid user identity to access local timetables.')
  return `pirnav-timetables-v1:${encodeURIComponent(user)}`
}
const readLocal = () => {
  const records = JSON.parse(localStorage.getItem(localKey()) || '[]')
  if (!Array.isArray(records) || records.some(row => !row.id || !Array.isArray(row.entries) || !completeScope(row) || !['draft', 'published'].includes(row.publicationStatus))) throw new Error('Local timetable storage is invalid. It has not been replaced or reset.')
  return records
}
const transaction = action => {
  const run = () => action(readLocal(), records => localStorage.setItem(localKey(), JSON.stringify(records)))
  return globalThis.navigator?.locks ? navigator.locks.request(localKey(), run) : Promise.resolve().then(run)
}
export const localEntries = tables => tables.flatMap(table => table.entries.map(row => ({ ...row, ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, table[field]])), timetableEntryId: row.id, timetableId: table.id, timetableName: table.name, publicationStatus: table.publicationStatus, origin: 'local', status: true })))
const checkVersion = (table, revision) => {
  if (!table || table.revision !== revision) throw new Error('This timetable changed in another tab. Refresh before saving.')
}
const validateSource = (row, scope, sources) => {
  validateScope(scope, sources)
  if (!sources.sections.some(section => same(section.id, scope.sectionId) && matchesScope(section, scope) && active(section))) throw new Error('Section mapping is no longer valid. Refresh the academic data.')
  if (!eligibleSubjects(sources.subjects, scope).some(subject => same(subject.id, row.subjectId))) throw new Error('Select an active subject matching the semester.')
  if (!eligibleFaculty(sources.faculty, sources.allocations, row.subjectId, scope).some(faculty => same(faculty.id, row.facultyId))) throw new Error('Select faculty with a matching active subject allocation.')
  if (!['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].includes(row.dayOfWeek) || !validTime(row)) throw new Error('Select a valid day and an end time later than the start time.')
  if (!String(row.classroom || '').trim()) throw new Error('Enter the classroom or lab reference.')
}
const validateScope = (scope, sources) => {
  if (!completeScope(scope) || !sources.years.some(row => same(row.id, scope.academicYearId)) || !sources.courses.some(row => same(row.id, scope.courseId) && active(row)) || !sources.branches.some(row => same(row.id, scope.branchId) && same(row.courseId, scope.courseId) && active(row)) || !sources.semesters.some(row => same(row.id, scope.semesterId) && active(row) && ['courseId', 'branchId', 'academicYearId'].every(field => !row[field] || same(row[field], scope[field]))) || !sources.sections.some(row => same(row.id, scope.sectionId) && active(row) && matchesScope(row, scope))) throw new Error('Academic references are missing, inactive or no longer match this section.')
}
const validatePlan = (config, table, sources, occupied, includeRequirements = false) => {
  const errors = planningErrors(config, sources, table, occupied)
  for (const row of table.entries) {
    validateSource(row, table, sources)
    errors.push(...entryPlanningErrors(row, config, sources, table, occupied))
    errors.push(...conflictsFor({ ...row, sectionId: table.sectionId }, occupied).map(item => item.message))
  }
  if (includeRequirements) errors.push(...schedulingIssues(sources, table, config, table.entries).filter(item => item.blocking !== false).map(item => `${item.subjectName}: ${item.reason}`))
  if (errors.length) throw new Error([...new Set(errors)].join('\n'))
}
export const localTimetableService = {
  async list() { return readLocal() },
  async setup(scope, name, config, options = {}) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    validateScope(scope, sources)
    if (!String(name || '').trim()) throw new Error('Enter a timetable name.')
    return transaction((tables, write) => {
      const current = options.tableId ? tables.find(row => same(row.id, options.tableId)) : null
      if (options.tableId) checkVersion(current, options.revision)
      if (current && (!matchesScope(current, scope) || !same(current.sectionId, scope.sectionId))) throw new Error('Timetable does not match the selected academic context.')
      if (current?.publicationStatus === 'published') throw new Error('Move this timetable to Draft before changing setup.')
      if (!current && tables.some(row => matchesScope(row, scope) && same(row.sectionId, scope.sectionId))) throw new Error('A timetable already exists for this section. Open it before changing setup.')
      const table = current || { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, String(scope[field])])), id: crypto.randomUUID(), name: name.trim(), publicationStatus: 'draft', revision: 0, entries: [] }
      const next = { ...table, planning: config, revision: table.revision + 1, updatedAt: new Date().toISOString(), issues: schedulingIssues(sources, table, config, table.entries) }
      validatePlan(config, next, sources, [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))])
      write(current ? tables.map(row => row.id === current.id ? next : row) : [...tables, next])
      return next
    })
  },
  async validate(tableId, revision) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction(tables => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (!table.entries.length) throw new Error('Add at least one class before publishing.')
      validateScope(table, sources)
      validatePlan(table.planning, table, sources, [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))], true)
      return { valid: true, revision: table.revision, checks: ['No Faculty Conflicts', 'No Room Conflicts', 'No Section Conflicts', 'Valid Periods', 'No Break/Lunch scheduling'], warnings: schedulingIssues(sources, table, table.planning, table.entries).filter(item => item.blocking === false) }
    })
  },
  async create(scope, name) {
    if (!completeScope(scope) || !String(name || '').trim()) throw new Error('Complete the academic mapping and timetable name.')
    const sources = await timetableService.getSources()
    validateScope(scope, sources)
    if (!sources.sections.some(row => same(row.id, scope.sectionId) && matchesScope(row, scope) && active(row))) throw new Error('Choose a valid active section.')
    return transaction((tables, write) => {
      if (tables.some(row => matchesScope(row, scope) && same(row.sectionId, scope.sectionId))) throw new Error('A local timetable already exists for this section. Open it in Create & Manage Timetable.')
      const table = { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, String(scope[field])])), id: crypto.randomUUID(), name: name.trim(), publicationStatus: 'draft', revision: 1, entries: [] }
      write([...tables, table]); return table
    })
  },
  async generate(scope, name, config, options = {}) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    validateScope(scope, sources)
    if (!String(name || '').trim()) throw new Error('Enter a timetable name.')
    return transaction((tables, write) => {
      const current = options.tableId ? tables.find(row => same(row.id, options.tableId)) : null
      if (options.tableId) checkVersion(current, options.revision)
      if (current && (!matchesScope(current, scope) || !same(current.sectionId, scope.sectionId))) throw new Error('The selected timetable does not match this section.')
      if (current?.publicationStatus === 'published') throw new Error('Move this timetable to Draft before generating.')
      if (!current && tables.some(row => matchesScope(row, scope) && same(row.sectionId, scope.sectionId))) throw new Error('A timetable already exists for this section. Select it before generating.')
      if (current?.entries.length && !options.confirmed) throw new Error('Confirm generation for this existing draft before continuing.')
      const table = current || { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, String(scope[field])])), id: crypto.randomUUID(), name: name.trim(), publicationStatus: 'draft', revision: 0, entries: [] }
      const occupied = [...localEntries(tables.filter(row => row.id !== table.id)), ...backend.map(row => normalizeEntry(row, sources.sections))]
      const errors = planningErrors(config, sources, table, [...occupied, ...localEntries([table])])
      if (errors.length) throw new Error(errors.join('\n'))
      const retained = options.replace ? [] : table.entries
      for (const row of retained) {
        validateSource(row, table, sources)
        const errors = entryPlanningErrors(row, config, sources, table, [...occupied, ...localEntries([table])])
        if (errors.length) throw new Error(`Existing entry needs review: ${errors.join(' ')}`)
      }
      const result = generateTimetable({ scope: table, sources, config, existing: retained, occupied, references: [...occupied, ...localEntries([table])] })
      const next = { ...table, entries: result.entries, planning: config, issues: result.issues, updatedAt: new Date().toISOString(), revision: table.revision + 1 }
      // Validate the complete result atomically against fresh backend and local records.
      validatePlan(config, next, sources, [...occupied, ...localEntries([next])])
      write(current ? tables.map(row => row.id === table.id ? next : row) : [...tables, next])
      return { ...next, added: result.added }
    })
  },
  async savePlanning(tableId, revision, config) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (table.publicationStatus !== 'draft') throw new Error('Move this timetable to Draft before changing its settings.')
      validateScope(table, sources)
      validatePlan(config, table, sources, [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))])
      const next = { ...table, planning: config, issues: schedulingIssues(sources, table, config, table.entries), revision: table.revision + 1, updatedAt: new Date().toISOString() }
      write(tables.map(row => row.id === table.id ? next : row)); return next
    })
  },
  async saveEntry(tableId, revision, form) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (table.publicationStatus !== 'draft') throw new Error('Move this timetable to Draft before editing.')
      if (form.id && !table.entries.some(row => same(row.id, form.id))) throw new Error('This schedule entry no longer exists.')
      const row = { id: form.id || crypto.randomUUID(), timetableSlotId: form.timetableSlotId || crypto.randomUUID(), subjectId: String(form.subjectId), facultyId: String(form.facultyId), dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime, classroom: form.classroom.trim(), ...(form.roomId ? { roomId: String(form.roomId) } : {}), entryType: form.entryType || '', generated: false }
      validateSource(row, table, sources)
      const occupied = [...localEntries(tables), ...backend.map(item => normalizeEntry(item, sources.sections))]
      const planErrors = entryPlanningErrors(row, table.planning, sources, table, occupied)
      if (planErrors.length) throw new Error(planErrors.join('\n'))
      if (table.planning) row.timetableSlotId = table.planning.periods.find(period => isTeachingPeriod(period) && period.startTime.slice(0, 5) === row.startTime.slice(0, 5))?.id || row.timetableSlotId
      const conflicts = conflictsFor({ ...row, sectionId: table.sectionId }, occupied)
      if (conflicts.length) throw new Error(conflicts.map(item => item.message).join('\n'))
      const entries = form.id ? table.entries.map(item => same(item.id, row.id) ? row : item) : [...table.entries, row]
      const next = { ...table, entries, issues: table.planning ? schedulingIssues(sources, table, table.planning, entries) : [], updatedAt: new Date().toISOString(), revision: table.revision + 1 }
      write(tables.map(item => item.id === table.id ? next : item)); return next
    })
  },
  async removeEntry(tableId, revision, entryId) {
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (table.publicationStatus !== 'draft') throw new Error('Move this timetable to Draft before removing classes.')
      write(tables.map(row => row.id === table.id ? { ...row, entries: row.entries.filter(entry => !same(entry.id, entryId)), revision: row.revision + 1 } : row))
    })
  },
  async publish(tableId, revision) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (!table.entries.length) throw new Error('Add at least one class before publishing.')
      const entries = [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))]
      validatePlan(table.planning, table, sources, entries, true)
      for (const row of table.entries) {
        validateSource(row, table, sources)
        const conflicts = conflictsFor({ ...row, sectionId: table.sectionId }, entries)
        if (conflicts.length) throw new Error(conflicts.map(item => item.message).join('\n'))
      }
      write(tables.map(row => row.id === table.id ? { ...row, publicationStatus: 'published', revision: row.revision + 1 } : row))
    })
  },
  async reopen(tableId, revision) {
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      write(tables.map(row => row.id === table.id ? { ...row, publicationStatus: 'draft', revision: row.revision + 1 } : row))
    })
  },
}
