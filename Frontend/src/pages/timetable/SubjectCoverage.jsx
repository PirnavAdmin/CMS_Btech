import { useState } from 'react'
import { eligibleSubjects, same, key } from '../../utils/timetableUtils'
import { subjectRequirements } from '../../utils/timetablePlanner'
import { updateWeeklyRequirement } from '../../services/timetable/timetableWorkflowService'
import { showToast } from '../../utils/toast'

function WeeklyRequirement({ allocation, refresh, disabled }) {
  const [value, setValue] = useState(allocation.periodsPerWeek || ''), [busy, setBusy] = useState(false)
  return <form className="tt-weekly-requirement" onSubmit={async event => {
    event.preventDefault(); setBusy(true)
    try { await updateWeeklyRequirement(allocation, value); await refresh(); showToast('Weekly requirement saved.', 'success') }
    catch (error) { showToast(error.message, 'error') }
    finally { setBusy(false) }
  }}><input aria-label={`Weekly periods for ${allocation.facultyName || allocation.facultyId}, section ${allocation.sectionId}`} type="number" min="1" step="1" value={value} disabled={busy || disabled} onChange={event => setValue(event.target.value)} /><span>/ week</span><button className="tt-button" disabled={busy || disabled || Number(value) === Number(allocation.periodsPerWeek)}>Save</button></form>
}
export default function SubjectCoverage({ sources, scope, selected, config, setConfig, refresh, faculty, disabled }) {
  const subjects = eligibleSubjects(sources.subjects, scope)
  const sections = sources.sections.filter(row => selected.some(id => same(id, row.id)))
  const change = (id, field, value) => setConfig(old => ({ ...old, requirements: { ...old.requirements, [id]: { ...old.requirements[id], [field]: value } } }))
  return <section className="tt-card tt-clean-step"><h2>Subjects & faculty coverage</h2><p>Select existing semester subjects. Weekly periods are saved to the existing faculty allocation.</p>
    {!subjects.length ? <p>No active subjects match this semester.</p> : <div className="tt-coverage-scroll"><table className="tt-coverage"><thead><tr><th>Subject</th><th>Periods per session</th>{sections.map(section => <th key={section.id}>{section.name}</th>)}</tr></thead><tbody>{subjects.map(subject => <tr key={subject.id}>
      <th><label><input type="checkbox" disabled={disabled} checked={config.requirements[key(subject.id)]?.selected !== false} onChange={event => change(key(subject.id), 'selected', event.target.checked)} /> {subject.name}</label></th>
      <td><input aria-label={`Consecutive periods for ${subject.name}`} type="number" min="1" step="1" disabled={disabled} value={config.requirements[key(subject.id)]?.blockSize || 1} onChange={event => change(key(subject.id), 'blockSize', event.target.value)} /></td>
      {sections.map(section => {
        const sectionScope = { ...scope, sectionId: section.id }
        const requirement = subjectRequirements(sources, sectionScope, {}) .find(item => same(item.subject.id, subject.id))
        const allocations = sources.allocations.filter(row => same(row.sectionId, section.id) && same(row.subjectId, subject.id) && (!row.academicYearId || same(row.academicYearId, scope.academicYearId)) && same(row.branchId, scope.branchId) && same(row.semesterId, scope.semesterId))
        return <td key={section.id}>{!requirement?.faculty.length ? <span className="tt-error">Faculty not assigned</span> : allocations.map(allocation => <div key={allocation.allocationId ?? allocation.id ?? allocation.facultyId}><button className="tt-text-button" onClick={() => faculty(allocation.facultyId)}>{sources.faculty.find(row => same(row.id, allocation.facultyId))?.name || 'Inactive faculty'}</button><WeeklyRequirement allocation={allocation} refresh={refresh} disabled={disabled} /></div>)}{requirement?.source === 'Not configured' && requirement?.faculty.length > 0 && <small>Set a consistent weekly requirement for this section.</small>}</td>
      })}
    </tr>)}</tbody></table></div>}
    <p className="tt-hint">Consecutive periods apply only when explicitly configured here; a session cannot cross Break or Lunch.</p>
  </section>
}
