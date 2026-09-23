import { useState } from 'react'
import { FiCheckCircle, FiPlus, FiZap } from 'react-icons/fi'
import { planningErrors, entryPlanningErrors, schedulingIssues, subjectRequirements } from '../../utils/timetablePlanner'
import { teachingPeriods } from '../../utils/timetablePeriods'
import WorkspaceDrawer from './WorkspaceDrawer'
import TimetablePlanner, { SchedulingIssues } from './TimetablePlanner'

export default function TimetableWorkspace({ scope, sources, entries, table, validScope, busy, summary, conflicts, generate, savePlanning, validate, publish, reopen, add, editSetup, children }) {
  const [panel, setPanel] = useState(''), [confirmation, setConfirmation] = useState('')
  const [validation, setValidation] = useState(null), [error, setError] = useState('')
  const [frequency, setFrequency] = useState(table.planning.requirements || {})
  const config = table.planning
  const readOnly = table.publicationStatus === 'published'
  const frequencyDirty = JSON.stringify(frequency) !== JSON.stringify(config.requirements || {})
  const issues = schedulingIssues(sources, scope, config, table.entries)
  const blocking = issues.filter(item => item.blocking !== false), warnings = issues.filter(item => item.blocking === false)
  const requirements = subjectRequirements(sources, scope, config.requirements)
  const errors = [...planningErrors(config, sources, scope, entries), ...table.entries.flatMap(row => entryPlanningErrors(row, config, sources, scope, entries))]
  const canGenerate = requirements.some(item => item.periodsPerWeek > 0 && item.faculty.length > 0)
  const blocked = !table.entries.length || !validScope || frequencyDirty || blocking.length > 0 || conflicts.length > 0 || errors.length > 0
  const run = async (replace = false) => {
    setError('')
    try { await generate(table.name, config, { tableId: table.id, revision: table.revision, replace, confirmed: true }); setConfirmation('') }
    catch (reason) { setConfirmation(''); setPanel('validation'); setValidation({ valid: false, message: reason.message }) }
  }
  const check = async () => {
    setPanel('validation'); setValidation(null); setError('')
    try { setValidation(await validate()) }
    catch (reason) { setValidation({ valid: false, message: reason.message }) }
  }
  const confirmAction = async () => {
    if (confirmation === 'replace') { await run(true); return }
    try { await publish(); setConfirmation('') }
    catch (reason) { setConfirmation(''); setPanel('validation'); setValidation({ valid: false, message: reason.message }) }
  }
  const assign = subjectId => { setPanel(''); add({ subjectId }) }
  return <section className="tt-workspace tt-manage-step" aria-label="Timetable workspace">
    <div className="tt-workspace-summary"><div><strong>{summary}</strong><p>Working days: {config.calendar.workingDays.map(day => day.slice(0, 3)).join(', ')} | {teachingPeriods(config.periods).length} teaching periods/day</p></div><button className="tt-button" onClick={editSetup} disabled={busy}>Review setup</button></div>
    <div className="tt-workspace-toolbar"><div className="tt-actions">
      <button className="tt-button tt-primary" disabled={busy || readOnly || !canGenerate || frequencyDirty || Boolean(errors.length)} onClick={() => table.entries.length ? setConfirmation('replace') : run()}><FiZap />Auto Generate</button>
      <button className="tt-button" disabled={busy || readOnly || !validScope} onClick={() => add({})}><FiPlus />Add Class</button>
      <button className="tt-button" disabled={busy || readOnly || !canGenerate || frequencyDirty || Boolean(errors.length)} onClick={() => run()}>Generate Missing</button>
      <button className="tt-button" disabled={busy || frequencyDirty} onClick={check}><FiCheckCircle />Validate</button>
      {readOnly ? <button className="tt-button" disabled={busy} onClick={reopen}>Move to Draft</button> : <button className="tt-button" disabled={busy || blocked} onClick={() => setConfirmation('publish')}>Publish</button>}
    </div></div>
    <div className="tt-workspace-status" aria-label="Timetable status"><span className="tt-status">{readOnly ? 'Published' : 'Draft'}</span><span>{table.entries.length} Classes</span><button onClick={() => setPanel('issues')}>Unscheduled ({blocking.length})</button><button onClick={() => setPanel('conflicts')}>Conflicts ({conflicts.length})</button><button onClick={() => { setError(''); setPanel('subjects') }}>Subjects ({requirements.length})</button>{warnings.length > 0 && <button onClick={() => setPanel('subjects')}>Frequency unavailable ({warnings.length})</button>}</div>
    {!canGenerate && !readOnly && <p className="tt-workspace-help">Auto Generation needs weekly frequency and valid faculty allocations. Add classes manually, or review Subjects.</p>}
    {frequencyDirty && <p className="tt-workspace-help">Save frequency changes in Subjects before generating, validating or publishing.</p>}
    <div className="tt-workspace-grid">{children}</div>
    {panel && <WorkspaceDrawer title={{ issues: 'Unscheduled', conflicts: 'Conflicts', subjects: 'Subjects & frequency', validation: 'Validation results' }[panel]} subtitle={summary} busy={busy} close={() => setPanel('')} footer={panel === 'subjects' && !readOnly ? <button className="tt-button tt-primary" disabled={busy || !frequencyDirty} onClick={async () => { try { await savePlanning({ ...config, requirements: frequency }); setPanel('') } catch (reason) { setError(reason.message) } }}>Save frequencies</button> : undefined}>
      {panel === 'issues' && (blocking.length ? <SchedulingIssues issues={blocking} assign={readOnly ? undefined : assign} /> : <p className="tt-panel-message">No unresolved scheduling requirements.{warnings.length ? ' Weekly frequency is unknown for some subjects; only configured requirements can be checked.' : ''}</p>)}
      {panel === 'conflicts' && <div className="tt-panel-list">{conflicts.length ? conflicts.map((row, index) => <article key={index}><strong>{row.resources.join(' / ')} conflict</strong><p>{row.message}</p></article>) : <p>No conflicts in the loaded schedule. Validate to check the latest records.</p>}</div>}
      {panel === 'subjects' && <TimetablePlanner scope={scope} sources={sources} table={table} busy={busy} frequency={frequency} setFrequency={setFrequency} assign={readOnly ? undefined : assign} />}
      {panel === 'validation' && <div className="tt-panel-message" role="status">{busy ? 'Validating current data and schedules...' : validation?.valid ? <><h3>Validation passed</h3><ul className="tt-validation-checks">{validation.checks.map(label => <li key={label}><FiCheckCircle />{label}</li>)}</ul>{validation.warnings.length > 0 && <p>Weekly frequency is unavailable for {validation.warnings.length} subject(s). Their repetitions were not inferred; scheduled classes passed validation.</p>}</> : <p className="tt-error">{validation?.message || 'Validation could not complete.'}</p>}</div>}
      {error && <p className="tt-error" role="alert">{error}</p>}
    </WorkspaceDrawer>}
    {confirmation && <WorkspaceDrawer modal title={confirmation === 'publish' ? 'Publish Timetable' : 'Replace the existing draft?'} subtitle={summary} busy={busy} close={() => setConfirmation('')} footer={<><button className="tt-button" disabled={busy} onClick={() => setConfirmation('')}>Cancel</button><button className={`tt-button ${confirmation === 'publish' ? 'tt-primary' : 'tt-danger'}`} disabled={busy || (confirmation === 'publish' && blocked)} onClick={confirmAction}>{confirmation === 'publish' ? 'Confirm Publish' : 'Replace Draft & Regenerate'}</button></>}>
      <div className="tt-dialog-body">{confirmation === 'publish' ? <><p>{teachingPeriods(config.periods).length} teaching periods/day | {table.entries.length} scheduled classes</p><p>{conflicts.length} conflicts | {blocking.length} unresolved items</p>{warnings.length > 0 && <p>{warnings.length} subjects have no weekly frequency. Only their scheduled classes can be validated.</p>}<p>The same records will feed Faculty, Student and Classroom views from the backend. Final validation runs before publication.</p></> : <p>This replaces generated draft entries. Manual classes are retained by the backend. Generate Missing preserves your work. Review any issues returned by the backend before publishing.</p>}</div>
    </WorkspaceDrawer>}
  </section>
}
