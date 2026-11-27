import { backendTimetableService as service, backendEntries } from '../backendTimetableService'
import { normalizeTimetableMasterRows } from '../timetableService'
import { departmentApi, subjectApi } from '../../api/apiEndpoints'
import { academicLevel, scopeSections } from './timetableDomain'
import { matchesScope, same } from '../../utils/timetableUtils'
import { planningErrors, subjectRequirements, entryPlanningErrors, roomOptions, suitableRoom } from '../../utils/timetablePlanner'
import { periodSessions } from '../../utils/timetablePeriods'
import { getUserRole } from '../../auth/auth'
import { selectedCollegeId } from '../../utils/collegeScope.js'
import { scopeTimetableData } from './timetableCollegeScope.js'

export async function loadBackendWorkflow() {
  const collegeId = selectedCollegeId()
  const [raw, departments, subjects, tables] = await Promise.all([service.getSources(), departmentApi.getAll(), subjectApi.list(), service.list()])
  const scoped = scopeTimetableData({ ...raw, departments: normalizeTimetableMasterRows(departments, 'department'), subjects: subjects.map(row => ({ ...row, id: row.subjectId ?? row.id, name: row.subjectName ?? row.name })) }, tables, collegeId)
  const sources = scoped.sources
  const contextual = scoped.tables.map(table => ({ ...table, departmentId: sources.branches.find(row => same(row.id, table.branchId))?.departmentId || '', level: academicLevel(sources.semesters.find(row => same(row.id, table.semesterId)) || {}) }))
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
const effectiveRequirements = (sources, scope, config) => Object.fromEntries(
  subjectRequirements(sources, scope, config.requirements).filter(row => row.periodsPerWeek > 0)
    .map(({ subject, periodsPerWeek, blockSize }) => [subject.id, { periodsPerWeek, blockSize }]))

export const backendWorkflow = {
  async generate({ scope, selected, config, expected, replace, draftOnly = false }) {
    authorize()
    const live = await loadBackendWorkflow()
    const sections = scopeSections(live.sources, scope)
    if (!selected.length || selected.some(id => !sections.some(row => same(row.id, id)))) throw new Error('Select valid active sections.')
    const rooms = roomOptions(live.sources, live.backend).filter(room => config.rooms.includes(room.value))
    for (const sectionId of selected) {
      const sectionScope = { ...scope, sectionId }
      const errors = planningErrors(config, live.sources, sectionScope, live.backend)
      for (const { subject, periodsPerWeek, blockSize } of subjectRequirements(live.sources, sectionScope, config.requirements)) {
        if (periodsPerWeek > 0 && (!Number.isInteger(blockSize) || blockSize < 1 || periodsPerWeek % blockSize !== 0))
          errors.push(subject.name + ': the weekly target must divide into full sessions of ' + blockSize + ' periods.')
        else if (!draftOnly && periodsPerWeek > 0 && !periodSessions(config.periods, blockSize).length)
          errors.push(subject.name + ': no uninterrupted block of ' + blockSize + ' periods fits between breaks.')
        if (!draftOnly && periodsPerWeek > 0 && !rooms.some(room => suitableRoom(subject, room)))
          errors.push(subject.name + ': select a suitable classroom or lab.')
      }
      if (errors.length) throw new Error([...new Set(errors)].join('\n'))
    }
    const saved = []
    for (const sectionId of selected) {
      const previous = (!draftOnly && expected.find(row => same(row.sectionId, sectionId)) || null) ?? live.tables.find(row =>
        row.publicationStatus === 'draft' && !row.entries.length &&
        matchesScope(row, { ...scope, sectionId }) &&
        row.planning?.calendar?.startDate === config.calendar.startDate &&
        row.planning?.calendar?.endDate === config.calendar.endDate)
      const current = previous ? await draft(previous) : null
      const sectionConfig = { ...config, requirements: effectiveRequirements(live.sources, { ...scope, sectionId }, config) }
      const name = current?.name || `${live.sources.branches.find(row => same(row.id, scope.branchId))?.name} / ${sections.find(row => same(row.id, sectionId))?.name} / ${config.calendar.startDate}`
      const initial = !current?.entries.length
      const table = initial ? await service.setup({ ...scope, sectionId }, name, sectionConfig, { tableId: current?.id }) : current
      if (draftOnly) {
        saved.push(table)
        continue
      }
      const generated = await service.generate(scope, table.name, config, { tableId: table.id, initial, replace })
      saved.push({ ...table, ...generated, planning: table.planning })
    }
    return saved
  },
  async saveSetup(tables, config) {
    const live = await loadBackendWorkflow()
    for (const table of tables) {
      await draft(table)
      const errors = planningErrors(config, live.sources, table, live.backend)
      if (errors.length) throw new Error([...new Set(errors)].join('\n'))

      const invalidClasses = table.entries.flatMap(row => {
        const issues = entryPlanningErrors(row, config, live.sources, table, live.backend)
        if (!issues.length) return []
        const subject = live.sources.subjects.find(item => same(item.id, row.subjectId))
        return [(subject?.name || 'Class') + ' (' + row.dayOfWeek + ' ' + row.startTime.slice(0, 5) + ' to ' + row.endTime.slice(0, 5) + '). ' + issues.join(' ')]
      })
      if (invalidClasses.length) {
        const remaining = invalidClasses.length - 3
        throw new Error([
          'Existing classes conflict with the new settings. Keep the previous settings or start with an empty draft.',
          ...invalidClasses.slice(0, 3),
          ...(remaining > 0 ? [remaining + ' more affected classes.'] : []),
        ].join('\n'))
      }
    }
    for (const table of tables) {
      await service.setup(table, table.name, { ...config, requirements: effectiveRequirements(live.sources, table, config) },
        { tableId: table.id })
    }
    return true
  },
  async deleteDraft(table) { await draft(table); await service.deleteDraft(table.id); return true },
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
    const pending = tables.filter(table => table.publicationStatus === 'draft')
    if (!pending.length) throw new Error('No draft timetable periods remain to publish.')
    for (const table of pending) await draft(table)
    const issues = await this.validate(pending)
    if (issues.some(row => row.blocking !== false)) throw new Error(issues.map(row => row.reason).join('\n'))
    for (const table of pending) await service.publish(table.id)
    return true
  },
  reopen() { throw new Error('The backend reopen API changes the published record in place. Create a new timetable period to preserve history.') },
}
