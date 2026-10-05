import { same, matchesScope, conflictsFor } from '../../utils/timetableUtils.js'
import { planningErrors, entryPlanningErrors, subjectRequirements } from '../../utils/timetablePlanner.js'
import { generateSections, validateTable, tableEntries, decorateEntries, scopeSections } from './timetableDomain.js'

// Missing master/slot/calendar/publish APIs only. No master data or synthetic HTTP routes.
// Browser-wide development store permits admin -> faculty login testing in the same browser.
// It is NOT a deployment-wide database. Production uses an explicit opt-in at the composition point.
export const DRAFT_STORAGE_KEY = 'pirnav-timetable-workflow-v2'
export function createDraftAdapter({ storage, loadLive, authorize, locks, makeId = () => crypto.randomUUID() }) {
  const read = () => {
    const rows = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY) || '[]')
    if (!Array.isArray(rows) || rows.some(row => !row.id || !Array.isArray(row.entries) || !row.planning || !['draft', 'published'].includes(row.publicationStatus))) throw new Error('Timetable draft storage is invalid. Existing records have not been reset.')
    return rows
  }
  const transaction = async (expected, action) => {
    authorize()
    const execute = async () => {
      const live = await loadLive() // Errors propagate; never fall back to demo/API snapshots.
      const tables = read()
      for (const item of expected) if (tables.find(row => same(row.id, item.id))?.revision !== item.revision) throw new Error('Timetable changed in another tab. Refresh before saving.')
      const next = await action(tables, live)
      storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next))
      return next
    }
    return locks ? locks.request(DRAFT_STORAGE_KEY, execute) : execute()
  }
  const selectedTables = (tables, expected) => tables.filter(table => expected.some(item => same(item.id, table.id)))
  return {
    list: async () => read(),
    saveSetup: (expected, config) => transaction(expected, (tables, { sources, backend }) => {
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      for (const table of selectedTables(tables, expected)) {
        if (table.publicationStatus !== 'draft') throw new Error('Only draft settings can be changed.')
        const errors = [...planningErrors(config, sources, table, occupied), ...table.entries.flatMap(row => entryPlanningErrors(row, config, sources, table, occupied))]
        if (errors.length) throw new Error(`Settings would invalidate existing classes: ${[...new Set(errors)].join(' ')}`)
      }
      return tables.map(table => expected.some(item => same(item.id, table.id)) ? { ...table, planning: config, revision: table.revision + 1, updatedAt: new Date().toISOString() } : table)
    }),
    generate: ({ scope, selected, config, expected, replace = false }) => transaction(expected, (tables, { sources, backend }) => {
      if (tables.some(table => matchesScope(table, scope) && selected.some(id => same(id, table.sectionId)) && !expected.some(item => same(item.id, table.id)))) throw new Error('A selected timetable was created in another tab. Refresh first.')
      return generateSections({ tables, selected, scope, sources, config, backend, replace, makeId })
    }),
    saveEntry: (table, form) => transaction([table], (tables, { sources, backend }) => {
      const current = tables.find(row => same(row.id, table.id))
      if (current.publicationStatus !== 'draft') throw new Error('Only draft timetables can be edited.')
      if (!scopeSections(sources, current).some(row => same(row.id, current.sectionId))) throw new Error('Section academic relationships changed. Refresh before editing.')
      if (form.id && !current.entries.some(row => same(row.id, form.id))) throw new Error('Class was removed. Refresh first.')
      const row = { id: form.id || makeId(), subjectId: form.subjectId, facultyId: form.facultyId, roomId: form.roomId || '', classroom: form.classroom, dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime, timetableSlotId: form.timetableSlotId, entryType: form.entryType, generated: false, sectionId: current.sectionId }
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      const requirement = subjectRequirements(sources, current, current.planning.requirements).find(item => same(item.subject.id, row.subjectId))
      if (!requirement?.faculty.some(faculty => same(faculty.id, row.facultyId))) throw new Error('Select a faculty member allocated to this section and subject.')
      const errors = [...entryPlanningErrors(row, current.planning, sources, current, occupied), ...conflictsFor(row, occupied).map(item => item.message)]
      if (errors.length) throw new Error(errors.join('\n'))
      return tables.map(item => item.id === current.id ? { ...item, entries: form.id ? item.entries.map(entry => same(entry.id, row.id) ? row : entry) : [...item.entries, row], revision: item.revision + 1, updatedAt: new Date().toISOString() } : item)
    }),
    removeEntry: (table, id) => transaction([table], tables => {
      if (tables.find(row => same(row.id, table.id)).publicationStatus !== 'draft') throw new Error('Only draft timetables can be edited.')
      return tables.map(item => item.id === table.id ? { ...item, entries: item.entries.filter(row => !same(row.id, id)), revision: item.revision + 1 } : item)
    }),
    validate: async expected => {
      authorize()
      const { sources, backend } = await loadLive(), tables = read()
      if (!expected.length || expected.some(item => tables.find(row => same(row.id, item.id))?.revision !== item.revision)) throw new Error('Refresh the selected timetables before validation.')
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      return selectedTables(tables, expected).flatMap(table => validateTable(table, sources, occupied))
    },
    publish: expected => transaction(expected, (tables, { sources, backend }) => {
      if (!expected.length) throw new Error('Select timetables to publish.')
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      const issues = selectedTables(tables, expected).flatMap(table => validateTable(table, sources, occupied))
      if (issues.length) throw new Error(issues.map(item => item.reason).join('\n'))
      return tables.map(table => expected.some(item => same(item.id, table.id)) ? { ...table, publicationStatus: 'published', revision: table.revision + 1, publishedAt: new Date().toISOString() } : table)
    }),
    reopen: table => transaction([table], tables => tables.map(item => same(item.id, table.id) ? { ...item, publicationStatus: 'draft', revision: item.revision + 1 } : item)),
  }
}
