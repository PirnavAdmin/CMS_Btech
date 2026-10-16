import TimetableReview from './TimetableReview'
import { validationCategory } from '../../services/timetable/timetableDomain'
import { useState } from 'react'
import TimetableGrid from './TimetableGrid'
import { ScheduleDialog } from './TimetableComponents'
import WorkspaceDrawer from './WorkspaceDrawer'
import { same, conflictsFor } from '../../utils/timetableUtils'
import { schedulingIssues } from '../../utils/timetablePlanner'

export default function TimetableWorkspace({ revisionPreview = false, mockMode = false, table, tables, sources, entries, busy, section, faculty, generate, regenerate, save, remove, validate, publish, reopen, createRevision }) {
  const [drawer, setDrawer] = useState(null), [issues, setIssues] = useState([]), [validatedRevision, setValidatedRevision] = useState(''), [validationIssues, setValidationIssues] = useState([]), [reviewedRevision, setReviewedRevision] = useState(''), [highlight, setHighlight] = useState('')
  const [actionError, setActionError] = useState('')
  const [revisionReason, setRevisionReason] = useState('')
  const rows = entries.filter(row => same(row.timetableId, table.id)), draft = table.publicationStatus === 'draft'
  const occupied = table.sourceTimetableId ? entries.filter(row => !same(row.timetableId, table.sourceTimetableId)) : entries
  const local = !mockMode || table.origin !== 'backend'
  const revisionKey = JSON.stringify([tables.map(row => [String(row.id), row.revision, row.entries, row.planning]).sort(([a], [b]) => a.localeCompare(b)), entries, sources.allocations, sources.faculty, sources.subjects])
  const validationCurrent = Boolean(validatedRevision) && validatedRevision === revisionKey
  const blockingIssues = validationIssues.filter(issue => issue.blocking !== false)
  const canPublish = local && draft && validationCurrent && reviewedRevision === revisionKey && blockingIssues.length === 0
  const unscheduled = schedulingIssues(sources, table, table.planning, table.entries)
  const conflicts = rows.flatMap(row => conflictsFor(row, occupied).map(item => ({ ...item, reason: item.message, sectionId: table.sectionId, entryId: row.id })))
  const review = async () => {
    setValidatedRevision('')
    setReviewedRevision('')
    const result = await validate(tables)
    if (result) {
      setIssues(result)
      setValidationIssues(result)
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
    {actionError && <p role="alert" className="tt-error">{actionError}</p>}
    <nav className="tt-section-tabs" aria-label="Sections">{tables.map(item => {
      const missing = schedulingIssues(sources, item, item.planning, item.entries).length
      const count = entries.filter(row => same(row.timetableId, item.id)).filter(row => conflictsFor(row, occupied).length).length
      return <button className={`tt-button ${item.id === table.id ? 'tt-primary' : ''}`} key={item.id} onClick={() => { section(item.sectionId); setHighlight('') }}><strong>{sources.sections.find(row => same(row.id, item.sectionId))?.name}</strong><small>{item.entries.length} classes | {missing} unscheduled | {count} conflicts</small></button>
    })}</nav>
    <header className="tt-card-heading"><div><h2>{table.name}</h2><span className="tt-status">{table.publicationStatus === 'published' ? mockMode ? 'DEMO PREVIEW PUBLICATION' : 'PUBLISHED' : !local || !['draft', 'published'].includes(table.publicationStatus) ? 'STATUS UNAVAILABLE' : validationCurrent ? blockingIssues.length ? 'VALIDATION PENDING' : reviewedRevision === revisionKey ? 'READY TO PUBLISH' : 'REVIEW REQUIRED' : 'DRAFT · NEEDS VALIDATION'}</span></div><div className="tt-actions">
      {!revisionPreview && draft && local && <button className="tt-button" disabled={busy} onClick={generate}>Generate Missing</button>}
      <button className="tt-button" onClick={() => { setIssues(unscheduled); setDrawer({ kind: 'unscheduled' }) }}>{unscheduled.length} Unscheduled</button><button className="tt-button" onClick={() => { setIssues(conflicts); setDrawer({ kind: 'conflicts' }) }}>{conflicts.length} Conflicts</button>
      {!revisionPreview && local && (draft || mockMode) && <details className="tt-more-actions"><summary>More Actions</summary>{draft ? <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'regenerate' })}>Regenerate</button> : <button className="tt-button" disabled={busy} onClick={() => setDrawer({ kind: 'reopen' })}>Open as Draft</button>}</details>}
      {!revisionPreview && !mockMode && table.publicationStatus === 'published' && <button className="tt-button" disabled={busy} onClick={() => { setActionError(''); setRevisionReason(''); setDrawer({ kind: 'revision' }) }}>Create Revision Draft</button>}
    </div></header>
    <div className="tt-review-actions" aria-label="Timetable validation and publishing">
      <span>Draft / Validation Pending / Ready to Publish / Published{table.updatedAt ? ` | Last saved ${new Date(table.updatedAt).toLocaleString()}` : ' | Last saved time not supplied by backend'}</span>
      <div className="tt-actions">
        <button className="tt-button" disabled={busy || !local} title={!local ? 'Validation is unavailable for backend timetables.' : undefined} onClick={review}>Validate</button>
        <button className="tt-button" disabled={busy || !local} onClick={() => setDrawer({ kind: 'review' })}>Review</button>
        <button className="tt-button tt-primary" disabled={busy || !canPublish} title={!local ? 'Publishing requires a timetable lifecycle API.' : !draft ? 'This timetable is already published.' : !validationCurrent ? 'Validate this exact timetable revision before publishing.' : blockingIssues.length ? 'Resolve blocking validation issues before publishing.' : undefined} onClick={() => setDrawer({ kind: 'publish', revisions: tables.map(row => ({ id: row.id, revision: row.revision })) })}>{mockMode ? 'Preview Publication' : 'Publish'}</button>
      </div>
    </div>
    {!local && <p className="tt-notice">Backend entries use existing timetable and slot IDs. Publication status is not supplied by the entry API; publish and generation require a timetable lifecycle API.</p>}
    <p>Timetable Validity Period: {table.planning.calendar.startDate || 'Not configured'} ? {table.planning.calendar.endDate || 'Not configured'}</p>
    <TimetableGrid rows={rows} periods={table.planning.periods} workingDays={table.planning.calendar.workingDays} editable={draft && local} add={row => setDrawer({ kind: 'entry', initial: row })} inspect={row => setDrawer({ kind: 'entry', initial: row })} faculty={faculty} highlight={highlight} clearHighlight={() => setHighlight('')} />
    {drawer?.kind === 'entry' && <ScheduleDialog key={`${table.id}-${drawer.initial.id || 'new'}`} initial={drawer.initial} table={table} sources={sources} entries={occupied} save={form => save(table, form)} remove={id => remove(table, id)} close={() => setDrawer(null)} readOnly={!local || !draft} />}
    {['validation', 'unscheduled', 'conflicts'].includes(drawer?.kind) && <WorkspaceDrawer title={drawer.kind === 'validation' ? 'Validation result' : drawer.kind === 'unscheduled' ? 'Unscheduled requirements' : 'Conflicts'} close={() => setDrawer(null)}><div className="tt-clean-step">{drawer.kind === 'validation' && <><h3>{blockingIssues.length ? 'VALIDATION FAILED' : 'READY TO PUBLISH'}</h3><div className="tt-validation-summary">{categoryCounts.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div><p>{validationCurrent ? 'Checked against the current timetable revision and loaded campus schedule.' : 'Timetable changed after validation. Validate again before publishing.'}</p></>}{!issues.length ? <p>No issues found.</p> : issues.map((issue, index) => <button className="tt-issue" key={`${issue.tableId || ''}-${issue.entryId || ''}-${index}`} onClick={() => focus(issue)}><strong>{issue.blocking === false ? 'Warning · ' : ''}{sources.sections.find(row => same(row.id, issue.sectionId || table.sectionId))?.name || `Section ${issue.sectionId || table.sectionId}`} · {issue.subjectName || ''}</strong><span><strong>{validationCategory(issue)}</strong> - {issue.reason}</span><small>{[issue.dayOfWeek, issue.startTime && `${issue.startTime}-${issue.endTime || '?'}`, issue.timetableSlotId && `Period ${issue.timetableSlotId}`, issue.facultyId && `Faculty ${sources.faculty.find(row => same(row.id, issue.facultyId))?.name || issue.facultyId}`, issue.classroom || issue.roomId && `Room ${issue.roomId}`].filter(Boolean).join(' | ')}</small>{issue.entryId && <small>View Issue</small>}</button>)}</div></WorkspaceDrawer>}
    {drawer?.kind === 'revision' && <WorkspaceDrawer modal title="Create revision draft" busy={busy} close={() => setDrawer(null)}><div className="tt-clean-step"><p>Create an editable backend draft copied from this published timetable. The current official timetable remains published.</p><label className="tt-field"><span>Reason for revision (optional)</span><textarea rows={3} value={revisionReason} onChange={event => setRevisionReason(event.target.value)} disabled={busy} /></label>{actionError && <p className="tt-error" role="alert">{actionError}</p>}<div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setDrawer(null)}>Cancel</button><button className="tt-button tt-primary" disabled={busy} onClick={async () => { try { setActionError(''); const result = await createRevision(table, revisionReason); if (result) setDrawer(null) } catch (error) { setActionError(error.message) } }}>{busy ? 'Creating...' : 'Confirm Create Revision Draft'}</button></div></div></WorkspaceDrawer>}
    {drawer?.kind === 'review' && <WorkspaceDrawer title="Timetable publication review" close={() => setDrawer(null)}><TimetableReview preview={mockMode} tables={tables} sources={sources} issues={validationIssues} ready={validationCurrent && !blockingIssues.length} /><div className="tt-clean-step"><button className="tt-button tt-primary" disabled={busy || !validationCurrent || Boolean(blockingIssues.length)} onClick={() => { setReviewedRevision(revisionKey); setDrawer(null) }}>Confirm Review</button></div></WorkspaceDrawer>}
    {['publish', 'regenerate', 'reopen'].includes(drawer?.kind) && <WorkspaceDrawer modal title={drawer.kind === 'publish' ? 'Publish timetable' : drawer.kind === 'regenerate' ? 'Regenerate selected sections?' : 'Open published timetable as draft?'} busy={busy} close={() => setDrawer(null)}><div className="tt-clean-step"><p>{table.name}</p>{drawer.kind === 'publish' ? <><p>Academic scope: {sources.years.find(row => same(row.id, table.academicYearId))?.name || 'Unavailable'} · {sources.branches.find(row => same(row.id, table.branchId))?.name || 'Unavailable'} · {tables.length} section(s)</p><p>Current status: {table.publicationStatus.toUpperCase()} · Validation: READY TO PUBLISH · Blocking conflicts: 0</p><p className="tt-notice">{mockMode ? "Demo Mode: Preview Publication changes this browser only. It does not publish to the backend." : 'This makes the selected timetable official and visible in student/faculty views through the backend. Existing published timetables are retained.'}</p></> : <p>{drawer.kind === 'regenerate' ? 'Generated scheduling may be replaced across the selected sections. Manual additions, edits and moves will be preserved.' : 'This section will stop appearing in published faculty schedules until it is published again.'}</p>}<div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setDrawer(null)}>Cancel</button><button className="tt-button tt-primary" disabled={busy || (drawer.kind === 'publish' && !canPublish)} onClick={async () => { const result = drawer.kind === 'publish' ? await publish(tables) : drawer.kind === 'regenerate' ? await regenerate() : await reopen(table); if (result) setDrawer(null) }}>Confirm {drawer.kind === 'publish' ? mockMode ? 'Preview Publication' : 'Publish Timetable' : drawer.kind === 'regenerate' ? 'Regenerate' : 'Open Draft'}</button></div></div></WorkspaceDrawer>}
  </section>
}
