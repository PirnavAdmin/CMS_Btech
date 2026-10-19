import { backendTimetableService as service, backendEntries } from '../backendTimetableService'
import { departmentApi, subjectApi } from '../../api/apiEndpoints'
import { academicLevel, scopeSections } from './timetableDomain'
import { same } from '../../utils/timetableUtils'
import { planningErrors, subjectRequirements, entryPlanningErrors } from '../../utils/timetablePlanner'
import { getUserRole } from '../../auth/auth'

export async function loadBackendWorkflow() {
  const [raw, departments, subjects, tables] = await Promise.all([service.getSources(), departmentApi.getAll(), subjectApi.list(), service.list()])
  const sources = { ...raw, departments: departments.map(row => ({ ...row, id: row.departmentId ?? row.id, name: row.departmentName ?? row.name })), subjects: subjects.map(row => ({ ...row, id: row.subjectId ?? row.id, name: row.subjectName ?? row.name })) }
  const contextual = tables.map(table => ({ ...table, departmentId: sources.branches.find(row => same(row.id, table.branchId))?.departmentId || '', level: academicLevel(sources.semesters.find(row => same(row.id, table.semesterId)) || {}) }))
  return { sources, tables: contextual, backend: backendEntries(contextual) }
}
const authorize = () => { if (getUserRole() !== 'admin') throw new Error('Administrator access is required.') }
const draft = async table => {
  authorize()
  const current = await service.detail(table.id)
  if (current.publicationStatus !== 'draft') throw new Error('Published timetable history cannot be edited. Create a new timetable period.')
  if (current.revision !== table.revision) throw new Error('Timetable changed. Refresh before saving.')
  return current
}
export const backendWorkflow = {
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
    const issues = []
    for (const table of tables) {
      const result = await service.validate(table.id)
      if (!result.valid) issues.push({ tableId: table.id, sectionId: table.sectionId, reason: result.message || 'Backend validation failed.' })
      issues.push(...result.warnings.map(reason => ({ tableId: table.id, sectionId: table.sectionId, reason, blocking: false })))
    }
    return issues
  },
  async publish(tables) {
    for (const table of tables) await draft(table)
    const issues = await this.validate(tables)
    if (issues.some(row => row.blocking !== false)) throw new Error(issues.map(row => row.reason).join('\n'))
    for (const table of tables) await service.publish(table.id)
    return true
  },
  reopen() { throw new Error('The backend reopen API changes the published record in place. Create a new timetable period to preserve history.') },
}
