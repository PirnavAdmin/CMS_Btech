import { useState } from 'react'
import TimetableGrid from './TimetableGrid'
import { ScheduleDialog } from './TimetableComponents'
import WorkspaceDrawer from './WorkspaceDrawer'
import { same, conflictsFor } from '../../utils/timetableUtils'
import { schedulingIssues } from '../../utils/timetablePlanner'

export default function TimetableWorkspace({ table, tables, sources, entries, busy, section, faculty, generate, regenerate, save, remove, validate, publish, reopen }) {
  const [drawer, setDrawer] = useState(null), [issues, setIssues] = useState([]), [highlight, setHighlight] = useState('')
  const rows = entries.filter(row => same(row.timetableId, table.id)), draft = table.publicationStatus === 'draft'
  const local = table.origin !== 'backend'
  const unscheduled = schedulingIssues(sources, table, table.planning, table.entries)
  const conflicts = rows.flatMap(row => conflictsFor(row, entries).map(item => ({ ...item, reason: item.message, sectionId: table.sectionId, entryId: row.id })))
  const review = async publishing => {
    const result = await validate(tables)
    if (result) { setIssues(result); setDrawer({ kind: publishing && !result.length ? 'publish' : 'validation', revisions: tables.map(row => ({ id: row.id, revision: row.revision })) }) }
  }
  const focus = issue => { section(issue.sectionId || table.sectionId); setHighlight(issue.entryId || ''); setDrawer(null) }
  return <section className="tt-card tt-clean-workspace">
    <nav className="tt-section-tabs" aria-label="Sections">{tables.map(item => {
      const missing = schedulingIssues(sources, item, item.planning, item.entries).length
      const count = entries.filter(row => same(row.timetableId, item.id)).filter(row => conflictsFor(row, entries).length).length
      return <button className={`tt-button ${item.id === table.id ? 'tt-primary' : ''}`} key={item.id} onClick={() => { section(item.sectionId); setHighlight('') }}><strong>{sources.sections.find(row => same(row.id, item.sectionId))?.name}</strong><small>{item.entries.length} classes | {missing} unscheduled | {count} conflicts</small></button>
    })}</nav>
    <header className="tt-card-heading"><div><h2>{table.name}</h2><span className="tt-status">{table.publicationStatus.toUpperCase()}</span></div><div className="tt-actions">
      {draft && local && <button className="tt-button" disabled={busy} onClick={generate}>Generate Missing</button>}
      <button className="tt-button" onClick={() => { setIssues(unscheduled); setDrawer({ kind: 'unscheduled' }) }}>{unscheduled.length} Unscheduled</button><button className="tt-button" onClick={() => { setIssues(conflicts); setDrawer({ kind: 'conflicts' }) }}>{conflicts.length} Conflicts</button>
      {local && <><button className="tt-button" disabled={busy} onClick={() => review(false)}>Validate</button>{draft && <button className="tt-button tt-primary" disabled={busy} onClick={() => review(true)}>Publish</button>}</>}
      {local && <details className="tt-more-actions"><summary>More Actions</summary>{draft ? <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'regenerate' })}>Regenerate</button> : <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'reopen' })}>Open as Draft</button>}</details>}
    </div></header>
    {!local && <p className="tt-notice">Backend entries use existing timetable and slot IDs. Publication status is not supplied by the entry API; publish and generation require a timetable lifecycle API.</p>}
    <TimetableGrid rows={rows} periods={table.planning.periods} workingDays={table.planning.calendar.workingDays} editable={draft || (!local && table.publicationStatus === 'unavailable')} add={row => setDrawer({ kind: 'entry', initial: row })} inspect={row => setDrawer({ kind: 'entry', initial: row })} faculty={faculty} highlight={highlight} clearHighlight={() => setHighlight('')} />
    {drawer?.kind === 'entry' && <ScheduleDialog key={`${table.id}-${drawer.initial.id || 'new'}`} initial={drawer.initial} table={table} sources={sources} entries={entries} save={form => save(table, form)} remove={id => remove(table, id)} close={() => setDrawer(null)} readOnly={table.publicationStatus === 'published'} />}
    {['validation', 'unscheduled', 'conflicts'].includes(drawer?.kind) && <WorkspaceDrawer title={drawer.kind === 'validation' ? 'Validation' : drawer.kind === 'unscheduled' ? 'Unscheduled requirements' : 'Conflicts'} close={() => setDrawer(null)}><div className="tt-clean-step">{!issues.length ? <p>No issues found.</p> : issues.map((issue, index) => <button className="tt-issue" key={index} onClick={() => focus(issue)}><strong>{sources.sections.find(row => same(row.id, issue.sectionId || table.sectionId))?.name} | {issue.subjectName || ''}</strong><span>{issue.reason}</span>{issue.entryId && <small>Show class in timetable</small>}</button>)}</div></WorkspaceDrawer>}
    {['publish', 'regenerate', 'reopen'].includes(drawer?.kind) && <WorkspaceDrawer modal title={drawer.kind === 'publish' ? 'Confirm publication' : drawer.kind === 'regenerate' ? 'Regenerate selected sections?' : 'Open published timetable as draft?'} busy={busy} close={() => setDrawer(null)}><div className="tt-clean-step"><p>{table.name}</p>{drawer.kind === 'publish' ? <><p>Academic year: {sources.years.find(row => same(row.id, table.academicYearId))?.name}</p><p>{tables.map(row => sources.sections.find(section => same(section.id, row.sectionId))?.name).join(', ')}</p><p>{tables.reduce((sum, row) => sum + row.entries.length, 0)} classes | 0 validation conflicts</p><p>Publish these weekly templates for faculty viewing?</p></> : <p>{drawer.kind === 'regenerate' ? 'Generated scheduling may be replaced across the selected sections. Manual additions, edits and moves will be preserved.' : 'This section will stop appearing in published faculty schedules until it is published again.'}</p>}<div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setDrawer(null)}>Cancel</button><button className="tt-button tt-primary" disabled={busy} onClick={async () => { const result = drawer.kind === 'publish' ? await publish(drawer.revisions) : drawer.kind === 'regenerate' ? await regenerate() : await reopen(table); if (result) setDrawer(null) }}>Confirm {drawer.kind === 'publish' ? 'Publish' : drawer.kind === 'regenerate' ? 'Regenerate' : 'Open Draft'}</button></div></div></WorkspaceDrawer>}
  </section>
}
