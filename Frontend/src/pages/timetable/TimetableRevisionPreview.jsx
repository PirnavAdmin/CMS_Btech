import { useState } from 'react'
import { decorateEntries } from '../../services/timetable/timetableDomain'
import TimetableWorkspace from './TimetableWorkspace'

export default function TimetableRevisionPreview({ demo, sources, entries, faculty }) {
  const [table, setTable] = useState(demo.current)
  const [error, setError] = useState('')
  const previewEntries = decorateEntries(table.entries.map(row => ({ ...row, timetableId: table.id, calendar: table.planning.calendar })), sources)
  const run = action => { try { setError(''); setTable(action()); return true } catch (failure) { setError(failure.message); return false } }
  return <div><p className="tt-adapter-note"><strong>Demo Mode — Revision Preview.</strong> Changes are isolated in this browser. The official published timetable stays unchanged. This preview is excluded from student and faculty views.</p>{error && <p role="alert" className="tt-error">{error}</p>}<TimetableWorkspace revisionPreview mockMode table={table} tables={[table]} sources={sources} entries={previewEntries} busy={false} section={() => {}} faculty={faculty}
    generate={() => {}} regenerate={() => {}} reopen={() => { setError('Start a new preview to preserve the reviewed copy.'); return false }}
    save={async (_, form) => { if (!run(() => demo.save(form))) throw new Error('Demo save failed.') }}
    remove={async (_, id) => { if (!run(() => demo.remove(id))) throw new Error('Demo removal failed.') }}
    validate={async () => demo.validate(sources, entries)} publish={async () => run(() => demo.previewPublication(sources, entries))} />
  </div>
}
