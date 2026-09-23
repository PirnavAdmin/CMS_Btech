export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
export const key = value => String(value ?? '').trim()
export const same = (a, b) => Boolean(key(a) && key(b) && key(a) === key(b))
export const active = row => ![false, 0, '0', 'false', 'inactive'].includes(typeof row?.status === 'string' ? row.status.toLowerCase() : row?.status)
export const academicFields = ['academicYearId', 'courseId', 'branchId', 'semesterId']
export const matchesScope = (row, scope, fields = academicFields) => fields.every(field => !key(scope[field]) || same(row[field], scope[field]))
export const completeScope = scope => [...academicFields, 'sectionId'].every(field => key(scope[field]))

export function timeMinutes(value) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(key(value))
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) return null
  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] || 0) / 60
}
export const validTime = row => timeMinutes(row.startTime) != null && timeMinutes(row.endTime) != null && timeMinutes(row.startTime) < timeMinutes(row.endTime)
export const overlaps = (a, b) => validTime(a) && validTime(b) && timeMinutes(a.startTime) < timeMinutes(b.endTime) && timeMinutes(a.endTime) > timeMinutes(b.startTime)
export const roomKey = row => key(row.classroom).replace(/\s+/g, ' ').toLowerCase()
export const sameRoom = (a, b) => (a.roomId ?? a.classroomId) && (b.roomId ?? b.classroomId) ? same(a.roomId ?? a.classroomId, b.roomId ?? b.classroomId) : Boolean(roomKey(a) && roomKey(a) === roomKey(b))

export function normalizeEntry(row, sections = []) {
  const section = sections.find(section => same(section.id, row.sectionId))
  return { ...row, ...Object.fromEntries(academicFields.map(field => [field, row[field] ?? section?.[field] ?? ''])), id: row.timetableEntryId ?? row.id, dayOfWeek: key(row.dayOfWeek).toUpperCase(), startTime: row.startTime ?? row.timetableSlot?.startTime ?? '', endTime: row.endTime ?? row.timetableSlot?.endTime ?? '', classroom: key(row.classroom) }
}

export function conflictsFor(candidate, entries) {
  const conflicts = []
  for (const row of entries) {
    if (!active(row) || same(row.id, candidate.id) || key(row.dayOfWeek).toUpperCase() !== key(candidate.dayOfWeek).toUpperCase()) continue
    const resources = []
    if (same(row.facultyId, candidate.facultyId)) resources.push('Faculty')
    if (same(row.sectionId, candidate.sectionId)) resources.push('Section')
    if (sameRoom(row, candidate)) resources.push('Classroom')
    if (!resources.length) continue
    if (!validTime(row)) { conflicts.push({ id: row.id, resources, message: `${resources.join(' / ')} conflict cannot be checked: an existing ${row.dayOfWeek} entry has missing or invalid period times.` }); continue }
    if (overlaps(candidate, row)) conflicts.push({ id: row.id, resources, message: `${resources.join(' / ')} conflict on ${row.dayOfWeek}: ${row.startTime}–${row.endTime}${row.classroom ? `, ${row.classroom}` : ''}. ${row.facultyName || `Faculty ${row.facultyId || 'unavailable'}`} · ${row.sectionName || `Section ${row.sectionId || 'unavailable'}`} · ${row.subjectName || `Subject ${row.subjectId || 'unavailable'}`}${row.timetableName ? ` · ${row.timetableName}` : ''}.` })
  }
  return conflicts
}
export function conflictPairs(entries) {
  const seen = new Set(), result = []
  entries.filter(active).forEach(row => conflictsFor(row, entries).forEach(conflict => {
    const pair = [key(row.id), key(conflict.id)].sort().join(':')
    if (!seen.has(pair)) { seen.add(pair); result.push({ ...conflict, entryId: row.id }) }
  }))
  return result
}

export function eligibleSubjects(subjects, scope) {
  // Subject Swagger maps course/branch/semester; academic year is optional on this master.
  return subjects.filter(row => active(row) && ['courseId', 'branchId', 'semesterId'].every(field => same(row[field], scope[field])) && (!row.academicYearId || same(row.academicYearId, scope.academicYearId)))
}
export function eligibleFaculty(faculty, allocations, subjectId, scope) {
  const ids = new Set(allocations.filter(row => active(row) && same(row.subjectId, subjectId) && ['branchId', 'semesterId'].every(field => same(row[field], scope[field])) && ['academicYearId', 'courseId', 'sectionId'].every(field => !row[field] || same(row[field], scope[field]))).map(row => key(row.facultyId)))
  return faculty.filter(row => active(row) && ids.has(key(row.id)))
}
export function existingTimetables(entries, scope) {
  const rows = entries.filter(row => matchesScope(row, scope) && (!scope.sectionId || same(row.sectionId, scope.sectionId)))
  return [...new Map(rows.filter(row => row.timetableId).map(row => [key(row.timetableId), { id: row.timetableId, name: row.timetableName || `Timetable ${row.timetableId}` }])).values()]
}
export function existingSlots(entries, timetableId) {
  const rows = entries.filter(row => same(row.timetableId, timetableId) && row.timetableSlotId && validTime(row))
  return [...new Map(rows.map(row => [key(row.timetableSlotId), { id: row.timetableSlotId, name: `${row.slotName || 'Period'} · ${row.startTime.slice(0, 5)}–${row.endTime.slice(0, 5)}`, startTime: row.startTime, endTime: row.endTime }])).values()].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
}
export function entryPayload(row, updating = false) {
  const result = {}
  for (const field of ['timetableId', 'timetableSlotId', 'facultyId', 'subjectId', 'sectionId']) {
    const value = Number(row[field])
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Select a valid ${field.replace(/Id$/, '')} record.`)
    result[field] = value
  }
  if (![...DAYS, 'SUNDAY'].includes(row.dayOfWeek)) throw new Error('Select a valid day.')
  result.dayOfWeek = row.dayOfWeek
  result.classroom = key(row.classroom) || null
  result.entryType = key(row.entryType) || null
  if (updating) result.status = active(row)
  return result
}

// Administrative entry status is not a draft/published timetable status.
export const publicationState = row => {
  const status = key(row.publicationStatus ?? row.timetable?.publicationStatus).toLowerCase()
  return ['draft', 'published'].includes(status) ? status : 'unavailable'
}
