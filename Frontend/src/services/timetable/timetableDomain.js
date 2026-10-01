import { active, same, key, matchesScope, eligibleSubjects, conflictsFor, normalizeEntry, publicationState } from '../../utils/timetableUtils.js'
import { planningErrors, entryPlanningErrors, schedulingIssues, subjectRequirements, roomOptions, suitableRoom, generateTimetable, classesOnDate } from '../../utils/timetablePlanner.js'
import { periodSessions } from '../../utils/timetablePeriods.js'

export const hierarchy = ['academicYearId', 'departmentId', 'courseId', 'branchId', 'level', 'semesterId']
export const academicLevel = row => key(row.academicLevel ?? row.yearOfStudy ?? row.studyYear ?? row.yearNumber ?? (Number(row.semesterNumber) > 0 ? Math.ceil(Number(row.semesterNumber) / 2) : ''))
const related = (row, scope, fields) => fields.every(field => !row[field] || same(row[field], scope[field]))
export function contextOptions(sources, scope) {
  const branches = sources.branches.filter(row => active(row) && same(row.courseId, scope.courseId) && same(row.departmentId ?? sources.courses.find(course => same(course.id, row.courseId))?.departmentId, scope.departmentId))
  const semesters = sources.semesters.filter(row => active(row) && related(row, scope, ['academicYearId', 'courseId', 'branchId']))
  return {
    academicYearId: sources.years.filter(active), departmentId: sources.departments.filter(active),
    courseId: sources.courses.filter(row => active(row) && (row.departmentId ? same(row.departmentId, scope.departmentId) : sources.branches.some(branch => active(branch) && same(branch.courseId, row.id) && same(branch.departmentId, scope.departmentId)))),
    branchId: branches,
    level: [...new Set(semesters.map(academicLevel).filter(Boolean))].sort().map(id => ({ id, name: /^\d+$/.test(id) ? `Year ${id}` : id })),
    semesterId: semesters.filter(row => academicLevel(row) === scope.level),
  }
}
export function scopeSections(sources, scope) {
  if (hierarchy.some(field => !scope[field])) return []
  const options = contextOptions(sources, scope)
  if (hierarchy.some(field => !options[field].some(row => same(row.id, scope[field])))) return []
  return sources.sections.filter(row => active(row) && matchesScope(row, scope) && (!row.departmentId || same(row.departmentId, scope.departmentId)))
}
export function changeContext(scope, field, value) {
  return Object.fromEntries(hierarchy.map((name, index) => [name, index > hierarchy.indexOf(field) ? '' : name === field ? key(value) : scope[name] || '']))
}
export function decorateEntries(raw, sources) {
  const name = (kind, id) => sources[kind].find(row => same(row.id, id))?.name || key(id)
  return raw.map(row => ({ ...normalizeEntry(row, sources.sections), subjectName: name('subjects', row.subjectId), facultyName: name('faculty', row.facultyId), sectionName: name('sections', row.sectionId), subjectCode: sources.subjects.find(subject => same(subject.id, row.subjectId))?.subjectCode || '' }))
}
export function tableEntries(tables) {
  return tables.flatMap(table => table.entries.map(row => ({ ...row, ...Object.fromEntries(['academicYearId', 'departmentId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, table[field]])), timetableId: table.id, publicationStatus: table.publicationStatus, origin: 'local' })))
}
export function validateTable(table, sources, occupied) {
  const issues = planningErrors(table.planning, sources, table, occupied).map(reason => ({ reason }))
  if (!scopeSections(sources, table).some(row => same(row.id, table.sectionId))) issues.push({ reason: 'Academic relationships changed. Review this section.' })
  if (!table.entries.length) issues.push({ reason: 'No classes have been scheduled.' })
  for (const row of table.entries) {
    const requirement = subjectRequirements(sources, table, table.planning?.requirements).find(item => same(item.subject.id, row.subjectId))
    const errors = [...entryPlanningErrors(row, table.planning, sources, table, occupied), ...conflictsFor({ ...row, sectionId: table.sectionId }, occupied).map(item => item.message)]
    if (!requirement?.faculty.some(faculty => same(faculty.id, row.facultyId))) errors.push('Faculty allocation is missing or inactive for this section and subject.')
    for (const reason of errors) issues.push({ reason, entryId: row.id, dayOfWeek: row.dayOfWeek, startTime: row.startTime, subjectId: row.subjectId })
  }
  issues.push(...schedulingIssues(sources, table, table.planning, table.entries))
  return issues.map(issue => ({ ...issue, sectionId: table.sectionId, tableId: table.id }))
}
export function availableSlots(form, table, sources, occupied, limit = 5) {
  const requirement = subjectRequirements(sources, table, table.planning.requirements).find(item => same(item.subject.id, form.subjectId))
  if (!requirement || !requirement.faculty.some(row => same(row.id, form.facultyId))) return []
  const room = roomOptions(sources, occupied).find(row => form.roomId && row.roomId ? same(row.roomId, form.roomId) : row.classroom === form.classroom)
  if (!room || !suitableRoom(requirement.subject, room)) return []
  const result = []
  for (const dayOfWeek of table.planning.calendar.workingDays) for (const block of periodSessions(table.planning.periods, requirement.blockSize)) {
    const candidate = { ...form, sectionId: table.sectionId, dayOfWeek, timetableSlotId: block[0].id, startTime: block[0].startTime, endTime: block.at(-1).endTime }
    if (!conflictsFor(candidate, occupied).length && !entryPlanningErrors(candidate, table.planning, sources, table, occupied).length) result.push(candidate)
    if (result.length === limit) return result
  }
  return result
}
// Pure coordinated batch: each result is part of occupancy before scheduling the next section.
export function generateSections({ tables, selected, scope, sources, config, backend, replace = false, makeId = () => crypto.randomUUID() }) {
  const selectedIds = new Set(selected.map(key))
  const valid = scopeSections(sources, scope)
  if (!selected.length || selected.some(id => !valid.some(section => same(section.id, id)))) throw new Error('Select valid active sections.')
  if (!eligibleSubjects(sources.subjects, scope).some(row => config.requirements?.[key(row.id)]?.selected !== false)) throw new Error('Select at least one existing subject.')
  let next = tables.map(table => ({ ...table, entries: [...table.entries] }))
  for (const sectionId of selectedIds) {
    const previous = next.find(table => matchesScope(table, scope) && same(table.sectionId, sectionId))
    if (previous?.publicationStatus === 'published') throw new Error('Selected timetables include a published section. Open its draft before generation.')
    if (previous && JSON.stringify(previous.planning) !== JSON.stringify(config) && previous.entries.length) throw new Error('Existing classes use different settings. Open the saved timetable before generating missing classes.')
    const table = previous || { ...scope, sectionId, id: makeId(), name: `${sources.branches.find(row => same(row.id, scope.branchId))?.name} / ${sources.semesters.find(row => same(row.id, scope.semesterId))?.name} / ${valid.find(row => same(row.id, sectionId))?.name}`, publicationStatus: 'draft', revision: 0, entries: [] }
    const retained = replace ? table.entries.filter(row => !row.generated) : table.entries
    const occupied = decorateEntries([...backend, ...tableEntries(next.filter(row => row.id !== table.id))], sources)
    const errors = planningErrors(config, sources, table, occupied)
    if (errors.length) throw new Error(errors.join('\n'))
    const result = generateTimetable({ scope: table, sources, config, occupied, existing: retained, references: [...occupied, ...tableEntries([table])], makeId })
    const updated = { ...table, entries: result.entries, planning: config, issues: result.issues, revision: table.revision + 1, updatedAt: new Date().toISOString() }
    next = previous ? next.map(row => row.id === table.id ? updated : row) : [...next, updated]
  }
  return next
}
export function publishedForFaculty(facultyId, entries, tables, date) {
  const rows = entries.filter(row => active(row) && publicationState(row) === 'published' && same(row.facultyId, facultyId))
  return date ? classesOnDate(rows, date, row => tables.find(table => same(table.id, row.timetableId))?.planning?.calendar || row.calendar || { reviewed: true, startDate: row.effectiveFrom?.slice(0, 10), endDate: row.effectiveTo?.slice(0, 10), workingDays: [row.dayOfWeek], holidays: [] }) : rows
}
