import { useState } from 'react'
import WorkspaceDrawer from './WorkspaceDrawer'
import SearchableSelect from '../../components/SearchableSelect'
import { DAYS, key, same, eligibleSubjects, eligibleFaculty, conflictsFor } from '../../utils/timetableUtils'
import { periodSessions, periodLabel } from '../../utils/timetablePeriods'
import { entryPlanningErrors, roomOptions, subjectRequirements } from '../../utils/timetablePlanner'

export function TimetableSelect({ label, value, options, onChange, disabled = false, required = false }) {
  return <div className="tt-field"><span>{label}{required && ' *'}</span><SearchableSelect label={label} value={value} options={options} onChange={onChange} disabled={disabled} required={required} placeholder={`Select ${label.toLowerCase()}`} /></div>
}
export { default as WeeklyGrid } from './TimetableGrid'

export function ScheduleDialog({ initial, table, sources, entries, save, remove, close, readOnly = false }) {
  const [form, setForm] = useState({ subjectId: '', facultyId: '', dayOfWeek: table.planning?.calendar.workingDays[0] || 'MONDAY', startTime: '', endTime: '', classroom: '', entryType: '', ...initial })
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmRemove, setConfirmRemove] = useState(false)
  const [mode, setMode] = useState(initial.id ? 'details' : 'edit')
  const subjects = eligibleSubjects(sources.subjects, table)
  const faculty = eligibleFaculty(sources.faculty, sources.allocations, form.subjectId, table)
  const conflicts = conflictsFor({ ...form, sectionId: table.sectionId }, entries)
  const planErrors = entryPlanningErrors(form, table.planning, sources, table, entries)
  const requirement = subjectRequirements(sources, table, table.planning?.requirements).find(item => same(item.subject.id, form.subjectId))
  const sessions = periodSessions(table.planning?.periods || [], requirement?.blockSize || 1).map(block => ({ id: block[0].id, name: `${block.map(periodLabel).join(' + ')} | ${block[0].startTime.slice(0, 5)}-${block.at(-1).endTime.slice(0, 5)}`, startTime: block[0].startTime, endTime: block.at(-1).endTime }))
  const rooms = roomOptions(sources, entries).filter(room => !table.planning || table.planning.rooms.includes(room.value))
  const change = (field, value) => { setForm(old => ({ ...old, [field]: value, ...(field === 'subjectId' ? { facultyId: '' } : {}) })); setError(''); setConfirmRemove(false) }
  const execute = async action => { setBusy(true); setError(''); try { await action(); close() } catch (reason) { setError(reason.message || 'Unable to save this schedule.') } finally { setBusy(false) } }
  const label = (list, id) => list.find(row => same(row.id, id))?.name || 'Unavailable'
  const details = readOnly || mode === 'details'
  const title = details ? 'Schedule details' : mode === 'move' ? 'Move schedule' : form.id ? 'Edit schedule' : 'Add Class'
  return <WorkspaceDrawer title={title} subtitle={table.name || table.timetableName} busy={busy} close={close}>
    {details ? <div className="tt-dialog-body"><dl>{[['Subject', label(sources.subjects, form.subjectId)], ['Faculty', label(sources.faculty, form.facultyId)], ['Day', form.dayOfWeek], ['Period', sessions.find(session => session.startTime === form.startTime && session.endTime === form.endTime)?.name || 'Not supplied'], ['Time', `${form.startTime || 'Unavailable'} – ${form.endTime || 'Unavailable'}`], ['Classroom / Lab', form.classroom || 'Not assigned'], ['Source', table.publicationStatus === 'published' ? 'Published timetable' : 'Backend draft']].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>{readOnly ? <p>Published timetables must be moved to Draft in Create & Manage before editing.</p> : <div className="tt-actions"><button className="tt-button tt-primary" onClick={() => setMode('edit')}>Edit</button><button className="tt-button" onClick={() => setMode('move')}>Move</button><button className="tt-button tt-danger" disabled={busy} onClick={() => confirmRemove ? execute(() => remove(form.id)) : setConfirmRemove(true)}>{confirmRemove ? 'Confirm removal' : 'Remove class'}</button></div>}{error && <p className="tt-error" role="alert">{error}</p>}</div> : <form onSubmit={event => { event.preventDefault(); if (!conflicts.length && !planErrors.length) execute(() => save(form)) }}>
      <div className="tt-dialog-body">{form.id && <p>To move this class, choose another day or teaching period. Every change is checked for conflicts before saving.</p>}<div className="tt-form-grid"><TimetableSelect label="Subject" value={form.subjectId} options={subjects.map(row => ({ ...row, name: `${row.subjectCode || ''} · ${row.name}` }))} onChange={value => { change('subjectId', value); setForm(old => ({ ...old, entryType: subjects.find(row => same(row.id, value))?.subjectType || '' })) }} disabled={busy || mode === 'move'} /><TimetableSelect label="Faculty" value={form.facultyId} options={faculty} onChange={value => change('facultyId', value)} disabled={busy || !form.subjectId || mode === 'move'} /><TimetableSelect label="Day" value={form.dayOfWeek} options={table.planning?.calendar.workingDays || [...DAYS, 'SUNDAY']} onChange={value => change('dayOfWeek', value)} disabled={busy} />
        {table.planning ? <TimetableSelect label="Classroom / Lab" value={rooms.find(room => form.roomId && room.roomId ? same(room.roomId, form.roomId) : room.classroom === form.classroom)?.value || ''} options={rooms} disabled={busy || mode === 'move'} onChange={value => { const room = rooms.find(row => row.value === value); setForm(old => ({ ...old, classroom: room?.classroom || '', roomId: room?.roomId || '' })) }} /> : <label className="tt-field"><span>Classroom / Lab</span><input required maxLength={120} value={form.classroom} disabled={busy} onChange={event => change('classroom', event.target.value)} /></label>}
        <TimetableSelect label="Period" value={sessions.find(session => session.startTime.slice(0, 5) === form.startTime.slice(0, 5) && session.endTime.slice(0, 5) === form.endTime.slice(0, 5))?.id || ''} options={sessions} disabled={busy} onChange={value => { const period = sessions.find(row => same(row.id, value)); if (period) setForm(old => ({ ...old, timetableSlotId: period.id, startTime: period.startTime, endTime: period.endTime })) }} />
        <label className="tt-field"><span>Subject Type</span><input value={subjects.find(row => same(row.id, form.subjectId))?.subjectType || form.entryType || 'Not supplied'} readOnly /></label></div>
        {!subjects.length && <p className="tt-notice">No active API subjects match this academic mapping. Local sample subjects cannot be used as backend subject IDs.</p>}
        {form.subjectId && !faculty.length && <p className="tt-notice">No active faculty allocation exists for this subject and academic context.</p>}

        {conflicts.length > 0 && <div className="tt-error" role="alert">{conflicts.map(row => <p key={key(row.id)}>{row.message}</p>)}</div>}
        {planErrors.length > 0 && <div className="tt-planning-help">{planErrors.map(message => <p key={message}>{message}</p>)}</div>}
        {error && <p className="tt-error" role="alert">{error}</p>}
      </div><footer>{form.id && <button type="button" className="tt-button tt-danger" disabled={busy} onClick={() => confirmRemove ? execute(() => remove(form.id)) : setConfirmRemove(true)}>{confirmRemove ? 'Confirm removal' : 'Remove class'}</button>}<button type="button" className="tt-button" disabled={busy} onClick={close}>Cancel</button><button className="tt-button tt-primary" disabled={busy || Boolean(conflicts.length) || Boolean(planErrors.length) || !form.subjectId || !form.facultyId}>{busy ? 'Saving…' : 'Save Draft Entry'}</button></footer>
    </form>}
  </WorkspaceDrawer>
}
