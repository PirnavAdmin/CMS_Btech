import { validateTable, decorateEntries } from './timetableDomain.js'

export const REVISION_DEMO_KEY = 'pirnav-timetable-revision-demo-v1'

// Deliberately has no HTTP dependency. A preview never reopens an official record.
export function createRevisionDemo(source, storage, makeId = () => crypto.randomUUID()) {
  let table = { ...structuredClone(source), id: `demo:${makeId()}`, origin: 'local', sourceTimetableId: source.id,
    name: `${source.name} — revision preview`, publicationStatus: 'draft', revision: 1,
    entries: source.entries.map(row => {
      const copy = structuredClone(row)
      delete copy.timetableEntryId
      return { ...copy, sourceEntryId: row.timetableEntryId ?? row.id, id: `demo:${makeId()}` }
    }), updatedAt: new Date().toISOString() }
  const persist = next => { storage.setItem(REVISION_DEMO_KEY, JSON.stringify(next)); table = next; return table }
  persist(table)
  const update = entries => {
    if (table.publicationStatus !== 'draft') throw new Error('This demo preview is read-only. Start a new revision preview.')
    return persist({ ...table, entries, revision: table.revision + 1, updatedAt: new Date().toISOString() })
  }
  return {
    current: () => table,
    save: form => {
      const row = { ...form, sectionId: table.sectionId, id: form.id || `demo:${makeId()}` }
      return update(form.id ? table.entries.map(item => String(item.id) === String(form.id) ? row : item) : [...table.entries, row])
    },
    remove: id => update(table.entries.filter(row => String(row.id) !== String(id))),
    validate: (sources, occupied) => validateTable(table, sources, decorateEntries([
      ...occupied.filter(row => String(row.timetableId) !== String(source.id)),
      ...table.entries.map(row => ({ ...row, timetableId: table.id, calendar: table.planning.calendar })),
    ], sources)),
    previewPublication(sources, occupied) {
      const issues = this.validate(sources, occupied)
      if (issues.some(issue => issue.blocking !== false)) throw new Error('Resolve demo validation issues before preview publication.')
      return persist({ ...table, publicationStatus: 'published', revision: table.revision + 1 })
    },
  }
}
