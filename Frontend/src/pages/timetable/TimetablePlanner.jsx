import { subjectRequirements, schedulingIssues } from '../../utils/timetablePlanner'
import { key } from '../../utils/timetableUtils'

export function SchedulingIssues({ issues = [], assign }) {
  if (!issues.length) return null
  return <section className="tt-card tt-issues" aria-label="Scheduling issues"><h2>Unscheduled / Attention Needed</h2><ul>{issues.map((item, index) => <li key={`${item.subjectId}-${index}`}><strong>{item.subjectName}</strong><span>{item.reason}</span>{assign && item.subjectId && <button className="tt-button" onClick={() => assign(item.subjectId)}>Assign manually</button>}</li>)}</ul></section>
}

export default function TimetablePlanner({ scope, sources, table, busy, frequency, setFrequency, assign }) {
  const requirements = subjectRequirements(sources, scope, frequency)
  const issues = schedulingIssues(sources, scope, { ...table.planning, requirements: frequency }, table.entries)
  const readOnly = table.publicationStatus === 'published'
  const update = (id, field, value) => setFrequency(old => ({ ...old, [id]: { ...old[id], [field]: value } }))
  return <section className="tt-planner"><p>Weekly repetitions use faculty allocation periodsPerWeek. Missing frequencies are never inferred from credits. Manual classes remain available without a frequency.</p>
    <div className="tt-requirements">{requirements.map(item => <article key={item.subject.id}>
      <div><strong>{item.subject.subjectCode} {item.subject.name}</strong><small>{item.faculty.map(row => row.name).join(', ') || 'No allocated faculty'}</small><small>{item.source}</small><p>{issues.find(issue => issue.subjectId === key(item.subject.id))?.reason || 'Scheduled'}</p></div>
      <label className="tt-field"><span>Periods / week</span><input aria-label={`${item.subject.name} periods per week`} type="number" min="1" step="1" disabled={busy || readOnly} value={frequency[key(item.subject.id)]?.periodsPerWeek ?? (item.periodsPerWeek || '')} onChange={event => update(key(item.subject.id), 'periodsPerWeek', event.target.value)} /></label>
      <label className="tt-field"><span>Consecutive / session</span><input aria-label={`${item.subject.name} consecutive periods`} type="number" min="1" step="1" disabled={busy || readOnly} value={item.blockSize} onChange={event => update(key(item.subject.id), 'blockSize', event.target.value)} /></label>
      {assign && <button className="tt-button" disabled={busy} onClick={() => assign(item.subject.id)}>Assign manually</button>}
    </article>)}</div>
  </section>
}
