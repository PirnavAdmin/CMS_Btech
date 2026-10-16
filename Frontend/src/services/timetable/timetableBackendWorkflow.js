import { backendTimetableService as service, backendEntries } from '../backendTimetableService'
import { departmentApi, subjectApi } from '../../api/apiEndpoints'
import { academicLevel, scopeSections, validateTable, decorateEntries } from './timetableDomain'
import { same } from '../../utils/timetableUtils'
import { planningErrors, subjectRequirements, entryPlanningErrors } from '../../utils/timetablePlanner'
import { getUserRole } from '../../auth/auth'

export async function loadBackendWorkflow() {
  const [raw, departments, subjects, tables] = await Promise.all([service.getSources(), departmentApi.getAll(), subjectApi.list(), service.list()])
  const sources = { ...raw, departments: departments.map(row => ({ ...row, id: row.departmentId ?? row.id, name: row.departmentName ?? row.name })), subjects: subjects.map(row => ({ ...row, id: row.subjectId ?? row.id, name: row.subjectName ?? row.name })) }
  const contextual = tables.map(table => ({ ...table, planning: { ...table.planning, requirements: { ...Object.fromEntries(sources.subjects.map(subject => [subject.id, { selected: false }])), ...table.planning.requirements } }, departmentId: sources.branches.find(row => same(row.id, table.branchId))?.departmentId || '', level: academicLevel(sources.semesters.find(row => same(row.id, table.semesterId)) || {}) }))
  return { sources, tables: contextual, backend: backendEntries(contextual) }
}
const authorize = () => { if (getUserRole() !== 'admin') throw new Error('Administrator access is required.') }
const publishing = new Set()
const revising = new Set()
const contentKey = table => JSON.stringify({
  scope: ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(key => String(table[key] ?? '')),
  calendar: table.planning?.calendar,
  periods: table.planning?.periods,
  requirements: Object.entries(table.planning?.requirements || {}).filter(([, value]) => value.selected !== false).sort(([a], [b]) => a.localeCompare(b)),
  entries: table.entries.map(row => ['id', 'subjectId', 'facultyId', 'roomId', 'classroom', 'dayOfWeek', 'startTime', 'endTime', 'timetableSlotId', 'entryType'].map(key => String(row[key] ?? ''))).sort((a, b) => a[0].localeCompare(b[0])),
})
const draft = async table => {
  authorize()
  const current = await service.detail(table.id)
  if (current.publicationStatus !== 'draft') throw new Error('Published timetable history cannot be edited. Create a new timetable period.')
  if (current.revision !== table.revision || contentKey(current) !== contentKey(table)) throw new Error('Timetable changed. Refresh before saving.')
  return current
}
export const backendWorkflow = {
  async createRevision(table, reason) {
    authorize()
    const sourceId = String(table.id)
    if (revising.has(sourceId)) throw new Error('A revision request is already in progress.')
    revising.add(sourceId)
    try {
    const current = await service.detail(table.id)
    if (current.publicationStatus !== 'published') throw new Error('Only a published timetable can be copied into a revision draft.')
    if (current.revision !== table.revision || contentKey(current) !== contentKey(table)) throw new Error('Timetable changed. Refresh before creating a revision.')
    const beforeIds = new Set((await service.list()).map(row => String(row.id)))
    const result = await service.createRevision(current.id, current.revision, reason)
    const after = (await loadBackendWorkflow()).tables
    const resultId = result?.timetableId ?? result?.timetable?.timetableId
    const candidates = after.filter(row => row.publicationStatus === 'draft' && !beforeIds.has(String(row.id)) && ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].every(key => same(row[key], current[key])) && (!resultId || same(row.id, resultId)))
    if (candidates.length !== 1) throw new Error('The backend accepted the revision request, but its new draft could not be uniquely identified. Refresh the timetable list before trying again.')
    service.rememberRevisionSource?.(candidates[0].id, current.id)
    return { ...candidates[0], sourceTimetableId: current.id }
    } finally { revising.delete(sourceId) }
  },
  async saveDraft({ scope, selected, config, expected = [] }) {
    authorize()
    const live = await loadBackendWorkflow()
    const sections = scopeSections(live.sources, scope)
    if (!selected.length || selected.some(id => !sections.some(row => same(row.id, id)))) throw new Error('Select valid active sections.')
    const saved = []
    for (const sectionId of selected) {
      const previous = expected.find(row => same(row.sectionId, sectionId))
      if (previous) await draft(previous)
      // Drafts can be incomplete. Only publication requires complete mappings.
      saved.push(await service.setup({ ...scope, sectionId }, previous?.name || `${sections.find(row => same(row.id, sectionId)).name} draft`, config, previous ? { tableId: previous.id } : {}))
    }
    return saved
  },
  async generate({ scope, selected, config, expected, replace }) {
    authorize()
    const live = await loadBackendWorkflow()
    const sections = scopeSections(live.sources, scope)
    if (!selected.length || selected.some(id => !sections.some(row => same(row.id, id)))) throw new Error('Select valid active sections.')
    for (const sectionId of selected) {
      const errors = planningErrors(config, live.sources, { ...scope, sectionId }, live.backend)
      if (errors.length) throw new Error(errors.join('\n'))
    }
    const saved = []
    for (const sectionId of selected) {
      const previous = expected.find(row => same(row.sectionId, sectionId))
      if (previous) await draft(previous)
      const sectionConfig = { ...config, requirements: Object.fromEntries(subjectRequirements(live.sources, { ...scope, sectionId }, config.requirements).filter(row => row.periodsPerWeek > 0).map(row => [row.subject.id, { periodsPerWeek: row.periodsPerWeek, blockSize: row.blockSize }])) }
      const table = previous || await service.setup({ ...scope, sectionId }, `${live.sources.branches.find(row => same(row.id, scope.branchId))?.name} / ${sections.find(row => same(row.id, sectionId))?.name} / ${config.calendar.startDate}`, sectionConfig)
      const generated = await service.generate(scope, table.name, config, { tableId: table.id, initial: !previous, replace })
      saved.push({ ...table, ...generated, planning: table.planning })
    }
    return saved
  },
  async saveSetup(tables, config) {
    const live = await loadBackendWorkflow()
    for (const table of tables) {
      await draft(table)
      const errors = [...planningErrors(config, live.sources, table, live.backend), ...table.entries.flatMap(row => entryPlanningErrors(row, config, live.sources, table, live.backend))]
      if (errors.length) throw new Error(errors.join('\n'))
    }
    for (const table of tables) await service.setup(table, table.name, config, { tableId: table.id })
    return true
  },
  async saveEntry(table, form) { await draft(table); return service.saveEntry(table.id, table.revision, form) },
  async removeEntry(table, id) { await draft(table); return service.removeEntry(table.id, table.revision, id) },
  async validate(tables) {
    authorize()
    if (!tables.length) throw new Error('Select at least one timetable to validate.')
    const live = await loadBackendWorkflow()
    const issues = []
    for (const table of tables) {
      const current = live.tables.find(row => same(row.id, table.id))
      if (!current || current.revision !== table.revision || contentKey(current) !== contentKey(table)) throw new Error('Timetable changed. Refresh before validating.')
      const original = live.tables.find(row => same(row.id, current.sourceTimetableId) && ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].every(key => same(row[key], current[key])))
      const occupied = original ? live.backend.filter(row => !same(row.timetableId, original.id)) : live.backend
      issues.push(...validateTable(current, live.sources, decorateEntries(occupied, live.sources)))
      const result = await service.validate(table.id)
      if (!result.valid) issues.push({ tableId: table.id, sectionId: table.sectionId, reason: result.message || 'Backend validation did not confirm readiness.' })
      issues.push(...(result.issues || []).map(issue => ({ ...issue, tableId: table.id, sectionId: issue.sectionId || table.sectionId })))
      issues.push(...result.warnings.map(reason => ({ tableId: table.id, sectionId: table.sectionId, reason, blocking: false })))
      const global = await service.validateGlobal(table.id)
      if (global?.valid !== true && global?.isValid !== true) issues.push({ tableId: table.id, sectionId: table.sectionId, reason: global?.message || 'Global validation did not confirm campus-wide availability.' })
      for (const issue of [...(global?.conflicts || []), ...(global?.errors || [])]) issues.push({ ...(typeof issue === 'object' ? issue : {}), tableId: table.id, sectionId: table.sectionId, reason: typeof issue === 'string' ? issue : issue.message || issue.reason || 'Global scheduling conflict.' })
    }
    return issues
  },
  async publish(tables) {
    if (!tables.length) throw new Error('Select timetables to publish.')
    const ids = tables.map(table => String(table.id))
    if (ids.some(id => publishing.has(id))) throw new Error('Publication is already in progress.')
    ids.forEach(id => publishing.add(id))
    try {
      for (const table of tables) await draft(table)
      const issues = await this.validate(tables)
      if (issues.some(row => row.blocking !== false)) throw new Error(issues.map(row => row.reason).join('\n'))
      for (const table of tables) await draft(table)
      await service.publishBatch(tables)
      const published = await service.list()
      if (tables.some(table => !published.some(current => same(current.id, table.id) && current.publicationStatus === 'published'))) throw new Error('The backend has not confirmed publication of every selected timetable. Refresh and review the actual statuses before retrying.')
      return true
    } finally { ids.forEach(id => publishing.delete(id)) }
  },
  reopen() { throw new Error('The backend reopen API changes the published record in place. Create a new timetable period to preserve history.') },
}
