import { timetableService } from '../timetableService'
import { departmentApi, profileApi, facultySubjectAllocationApi, subjectApi } from '../../api/apiEndpoints'
import { getUserRole } from '../../auth/auth'
import { same, active, conflictsFor, existingSlots } from '../../utils/timetableUtils'
import { createDraftAdapter, DRAFT_STORAGE_KEY } from './timetableDraftAdapter'
import { decorateEntries, tableEntries } from './timetableDomain'

export const draftCapabilityEnabled = import.meta.env.DEV || import.meta.env.VITE_TIMETABLE_DRAFT_ADAPTER === 'true'
export async function loadLive() {
  const [sources, departments, backend, subjects] = await Promise.all([timetableService.getSources(), departmentApi.getAll(), timetableService.list(), subjectApi.list()])
  return { sources: { ...sources, subjects: subjects.map(row => ({ ...row, id: row.subjectId ?? row.id, name: row.subjectName ?? row.name })), departments: departments.map(row => ({ ...row, id: row.departmentId ?? row.id, name: row.departmentName ?? row.name })), allocations: sources.allocations.filter(row => active(row) && row.sectionId && (!row.allocationType || row.allocationType.toUpperCase() === 'TEACHING')) }, backend }
}
export async function resolveMyFaculty(sources) {
  const profile = await profileApi.getProfile()
  const matches = sources.faculty.filter(row => active(row) && (profile.facultyId ? same(row.id, profile.facultyId) : same(row.userId, profile.id)))
  if (matches.length !== 1) throw new Error('Your authenticated account is not linked to exactly one active faculty record. Ask the administrator to correct the faculty user mapping.')
  return matches[0].id
}
export async function updateWeeklyRequirement(allocation, periodsPerWeek) {
  if (getUserRole() !== 'admin') throw new Error('Administrator access is required.')
  if (!Number.isInteger(Number(periodsPerWeek)) || Number(periodsPerWeek) < 1) throw new Error('Weekly periods must be a positive whole number.')
  const payload = Object.fromEntries(['facultyId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'subjectId', 'academicYearId', 'allocationType', 'isPrimaryFaculty', 'status', 'remarks'].map(field => [field, allocation[field] ?? (field === 'isPrimaryFaculty' || field === 'status' ? true : field === 'allocationType' ? 'TEACHING' : null)]))
  return facultySubjectAllocationApi.update(allocation.allocationId ?? allocation.id, { ...payload, periodsPerWeek: Number(periodsPerWeek) })
}
export async function saveBackendEntry(table, form) {
  if (getUserRole() !== 'admin') throw new Error('Administrator access is required.')
  const save = async () => {
    const { sources, backend } = await loadLive()
    const drafts = draftCapabilityEnabled ? await workflowAdapter().list() : []
    const slot = existingSlots(backend, table.id).find(row => same(row.id, form.timetableSlotId))
    if (!slot) throw new Error('This backend slot is no longer available. Refresh the timetable.')
    const scope = Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, table[field]]))
    const candidate = { ...form, ...scope, timetableId: table.id, startTime: slot.startTime, endTime: slot.endTime }
    const conflicts = conflictsFor(candidate, decorateEntries([...backend, ...tableEntries(drafts)], sources))
    if (conflicts.length) throw new Error(conflicts.map(row => row.message).join('\n'))
    return timetableService.save(candidate, scope)
  }
  return draftCapabilityEnabled && navigator.locks ? navigator.locks.request(DRAFT_STORAGE_KEY, save) : save()
}
let adapter
export function workflowAdapter() {
  if (!draftCapabilityEnabled) throw new Error('Timetable setup and publication APIs are unavailable. The temporary draft adapter is enabled only in development or by explicit deployment configuration.')
  adapter ||= createDraftAdapter({ storage: localStorage, locks: navigator.locks, loadLive, authorize: () => { if (getUserRole() !== 'admin') throw new Error('Administrator access is required.') } })
  return adapter
}
