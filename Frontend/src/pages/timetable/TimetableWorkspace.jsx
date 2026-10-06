import { useState } from 'react'
import TimetableGrid from './TimetableGrid'
import { ScheduleDialog } from './TimetableComponents'
import WorkspaceDrawer from './WorkspaceDrawer'
import { same, conflictsFor } from '../../utils/timetableUtils'
import { schedulingIssues } from '../../utils/timetablePlanner'

export default function TimetableWorkspace({ mockMode = false, table, tables, sources, entries, busy, section, faculty, generate, regenerate, save, remove, validate, publish, reopen }) {
  const [drawer, setDrawer] = useState(null), [issues, setIssues] = useState([]), [validatedRevision, setValidatedRevision] = useState(''), [highlight, setHighlight] = useState('')
  const rows = entries.filter(row => same(row.timetableId, table.id)), draft = table.publicationStatus === 'draft'
  const local = !mockMode || table.origin !== 'backend'
  const revisionKey = JSON.stringify(tables.map(row => [String(row.id), row.revision, row.entries, row.planning]).sort(([a], [b]) => a.localeCompare(b)))
  const validationCurrent = Boolean(validatedRevision) && validatedRevision === revisionKey
  const blockingIssues = issues.filter(issue => issue.blocking !== false)
  const canPublish = local && draft && validationCurrent && blockingIssues.length === 0
  const unscheduled = schedulingIssues(sources, table, table.planning, table.entries)
  const conflicts = rows.flatMap(row => conflictsFor(row, entries).map(item => ({ ...item, reason: item.message, sectionId: table.sectionId, entryId: row.id })))
  const review = async () => {
    setValidatedRevision('')
    const result = await validate(tables)
    if (result) {
      setIssues(result)
      setValidatedRevision(revisionKey)
      setDrawer({ kind: 'validation' })
    }
  }
  const categoryCounts = [
    ['Section conflicts', issue => /section conflict|section is already|section overlap/i.test(issue.reason)],
    ['Faculty conflicts', issue => /faculty conflict|faculty is already|faculty overlap/i.test(issue.reason)],
    ['Room conflicts', issue => /classroom|room conflict|room is already|room overlap/i.test(issue.reason)],
    ['Period conflicts', issue => /period|break|lunch|time range|overlap|invalid slot/i.test(issue.reason)],
    ['Subject requirements', issue => /requirement|weekly|allocation|unscheduled/i.test(issue.reason)],
  ].map(([label, matches]) => [label, issues.filter(matches).length])
  const focus = issue => { section(issue.sectionId || table.sectionId); setHighlight(issue.entryId || ''); setDrawer(null) }
  return <section className="tt-card tt-clean-workspace">
    <nav className="tt-section-tabs" aria-label="Sections">{tables.map(item => {
      const missing = schedulingIssues(sources, item, item.planning, item.entries).length
      const count = entries.filter(row => same(row.timetableId, item.id)).filter(row => conflictsFor(row, entries).length).length
      return <button className={`tt-button ${item.id === table.id ? 'tt-primary' : ''}`} key={item.id} onClick={() => { section(item.sectionId); setHighlight('') }}><strong>{sources.sections.find(row => same(row.id, item.sectionId))?.name}</strong><small>{item.entries.length} classes | {missing} unscheduled | {count} conflicts</small></button>
    })}</nav>
    <header className="tt-card-heading"><div><h2>{table.name}</h2><span className="tt-status">{table.publicationStatus === 'published' ? 'PUBLISHED' : !local ? 'STATUS UNAVAILABLE' : validationCurrent ? blockingIssues.length ? 'VALIDATION FAILED' : 'READY TO PUBLISH' : 'DRAFT · NEEDS VALIDATION'}</span></div><div className="tt-actions">
      {draft && local && <button className="tt-button" disabled={busy} onClick={generate}>Generate Missing</button>}
      <button className="tt-button" onClick={() => { setIssues(unscheduled); setDrawer({ kind: 'unscheduled' }) }}>{unscheduled.length} Unscheduled</button><button className="tt-button" onClick={() => { setIssues(conflicts); setDrawer({ kind: 'conflicts' }) }}>{conflicts.length} Conflicts</button>
      {local && (draft || mockMode) && <details className="tt-more-actions"><summary>More Actions</summary>{draft ? <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'regenerate' })}>Regenerate</button> : <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'reopen' })}>Open as Draft</button>}</details>}
    </div></header>
    <div className="tt-review-actions" aria-label="Timetable validation and publishing">
      <span>Review this timetable before sharing it with faculty.</span>
      <div className="tt-actions">
        <button className="tt-button" disabled={busy || !local} title={!local ? 'Validation is unavailable for backend timetables.' : undefined} onClick={review}>Validate</button>
        <button className="tt-button tt-primary" disabled={busy || !canPublish} title={!local ? 'Publishing requires a timetable lifecycle API.' : !draft ? 'This timetable is already published.' : !validationCurrent ? 'Validate this exact timetable revision before publishing.' : blockingIssues.length ? 'Resolve blocking validation issues before publishing.' : undefined} onClick={() => setDrawer({ kind: 'publish', revisions: tables.map(row => ({ id: row.id, revision: row.revision })) })}>Publish</button>
      </div>
    </div>
    {!local && <p className="tt-notice">Backend entries use existing timetable and slot IDs. Publication status is not supplied by the entry API; publish and generation require a timetable lifecycle API.</p>}
    <p>Timetable Validity Period: {table.planning.calendar.startDate || 'Not configured'} ? {table.planning.calendar.endDate || 'Not configured'}</p>
    <TimetableGrid rows={rows} periods={table.planning.periods} workingDays={table.planning.calendar.workingDays} editable={draft || (!local && table.publicationStatus === 'unavailable')} add={row => setDrawer({ kind: 'entry', initial: row })} inspect={row => setDrawer({ kind: 'entry', initial: row })} faculty={faculty} highlight={highlight} clearHighlight={() => setHighlight('')} />
    {drawer?.kind === 'entry' && <ScheduleDialog key={`${table.id}-${drawer.initial.id || 'new'}`} initial={drawer.initial} table={table} sources={sources} entries={entries} save={form => save(table, form)} remove={id => remove(table, id)} close={() => setDrawer(null)} readOnly={table.publicationStatus === 'published'} />}
    {['validation', 'unscheduled', 'conflicts'].includes(drawer?.kind) && <WorkspaceDrawer title={drawer.kind === 'validation' ? 'Validation result' : drawer.kind === 'unscheduled' ? 'Unscheduled requirements' : 'Conflicts'} close={() => setDrawer(null)}><div className="tt-clean-step">{drawer.kind === 'validation' && <><h3>{blockingIssues.length ? 'VALIDATION FAILED' : 'READY TO PUBLISH'}</h3><div className="tt-validation-summary">{categoryCounts.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div><p>{validationCurrent ? 'Checked against the current timetable revision and loaded campus schedule.' : 'Timetable changed after validation. Validate again before publishing.'}</p></>}{!issues.length ? <p>No issues found.</p> : issues.map((issue, index) => <button className="tt-issue" key={`${issue.tableId || ''}-${issue.entryId || ''}-${index}`} onClick={() => focus(issue)}><strong>{issue.blocking === false ? 'Warning · ' : ''}{sources.sections.find(row => same(row.id, issue.sectionId || table.sectionId))?.name || `Section ${issue.sectionId || table.sectionId}`} · {issue.subjectName || ''}</strong><span>{issue.reason}</span>{issue.entryId && <small>View Issue</small>}</button>)}</div></WorkspaceDrawer>}
    {['publish', 'regenerate', 'reopen'].includes(drawer?.kind) && <WorkspaceDrawer modal title={drawer.kind === 'publish' ? 'Publish timetable' : drawer.kind === 'regenerate' ? 'Regenerate selected sections?' : 'Open published timetable as draft?'} busy={busy} close={() => setDrawer(null)}><div className="tt-clean-step"><p>{table.name}</p>{drawer.kind === 'publish' ? <><p>Academic scope: {sources.years.find(row => same(row.id, table.academicYearId))?.name || 'Unavailable'} · {sources.branches.find(row => same(row.id, table.branchId))?.name || 'Unavailable'} · {tables.length} section(s)</p><p>Current status: {table.publicationStatus.toUpperCase()} · Validation: READY TO PUBLISH · Blocking conflicts: 0</p><p className="tt-notice">{mockMode ? "Mock Mode: this publishes only to this browser's timetable view." : 'This publishes the selected timetable period through the backend. Existing published timetables are retained.'}</p></> : <p>{drawer.kind === 'regenerate' ? 'Generated scheduling may be replaced across the selected sections. Manual additions, edits and moves will be preserved.' : 'This section will stop appearing in published faculty schedules until it is published again.'}</p>}<div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setDrawer(null)}>Cancel</button><button className="tt-button tt-primary" disabled={busy || (drawer.kind === 'publish' && !canPublish)} onClick={async () => { const result = drawer.kind === 'publish' ? await publish(tables) : drawer.kind === 'regenerate' ? await regenerate() : await reopen(table); if (result) setDrawer(null) }}>Confirm {drawer.kind === 'publish' ? 'Publish Timetable' : drawer.kind === 'regenerate' ? 'Regenerate' : 'Open Draft'}</button></div></div></WorkspaceDrawer>}
  </section>
}
