// Pages and helpers in this module retain their own isolated scopes.
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external2 from "react-dom";
import * as external3 from "react-icons/fi";
import { EmptyStateModule, SearchableSelectModule, ExportMenuModule, DashboardLayoutModule } from "../../components/components.jsx";
import { timetableUtilsModule, timetablePeriodsModule, timetableDomainModule, timetablePlannerModule, timetableWorkflowServiceModule, authModule, timetableBackendWorkflowModule, timetableServiceModule } from "../../API/apiendpoints.jsx";
import { toastModule } from "../../components/components.jsx";

export const WorkspaceDrawerModule = (() => {
const { useEffect } = external0;
const { useRef } = external0;
const { createPortal } = external2;
const { FiX } = external3;
/* Imports for isolated regression tests:
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
*/
// #region pages/timetable/WorkspaceDrawer.jsx
// Shared focus handling for timetable drawers and compact confirmations.
/* export default */ function WorkspaceDrawer({ title, subtitle, close, busy = false, modal = false, children, footer }) {
  const root = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.focus()
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<div className={`tt-overlay ${modal ? 'tt-confirm-overlay' : 'tt-drawer-overlay'}`} onMouseDown={event => { if (event.target === event.currentTarget && !busy) close() }}>
    <section ref={root} tabIndex={-1} className={`tt-dialog ${modal ? 'tt-confirm-dialog' : 'tt-drawer'}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={event => {
      if (event.key === 'Escape' && !busy && !document.querySelector('.searchable-select__menu')) { event.stopPropagation(); close() }
      if (event.key !== 'Tab' || document.querySelector('.searchable-select__menu')) return
      const elements = [...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(element => element.getClientRects().length)
      if (!elements.length) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === elements[0] || document.activeElement === root.current)) { event.preventDefault(); elements.at(-1).focus() }
      if (!event.shiftKey && (document.activeElement === elements.at(-1) || document.activeElement === root.current)) { event.preventDefault(); elements[0].focus() }
    }}>
      <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="tt-icon-button" aria-label={`Close ${title}`} disabled={busy} onClick={close}><FiX /></button></header>
      <div className="tt-drawer-content">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>, document.body)
}
// #endregion pages/timetable/WorkspaceDrawer.jsx
return {
  get default() { return WorkspaceDrawer; }
};
})();

export const TimetableGridModule = (() => {
const { useEffect } = external0;
const { useRef } = external0;
const { useState } = external0;
const { FiPlus } = external3;
const { default: EmptyState } = EmptyStateModule;
const { DAYS } = timetableUtilsModule;
const { overlaps } = timetableUtilsModule;
const { timeMinutes } = timetableUtilsModule;
const { isTeachingPeriod } = timetablePeriodsModule;
const { periodLabel } = timetablePeriodsModule;
const { periodType } = timetablePeriodsModule;
/* Imports for isolated regression tests:
import { useEffect, useRef, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import EmptyState from '../../components/EmptyState'
import { DAYS, overlaps, timeMinutes } from '../../utils/timetableUtils'
import { isTeachingPeriod, periodLabel, periodType } from '../../utils/timetablePeriods'
*/
// #region pages/timetable/TimetableGrid.jsx
function TimetableCell({ row, inspect, faculty, highlight }) {
  return <article data-entry-id={row.id} className={`tt-class ${highlight === row.id ? 'tt-highlight' : ''}`}>
    <button className="tt-class-details" onClick={() => inspect?.(row)}><strong>{row.subjectCode || row.subjectName || 'Subject unavailable'}</strong>{row.subjectCode && row.subjectName && row.subjectName !== row.subjectCode && <span>{row.subjectName}</span>}<small>{row.startTime?.slice(0, 5)} - {row.endTime?.slice(0, 5)}</small><small>{row.classroom || 'Room not assigned'}</small>{row.sectionName && <small>{row.sectionName}</small>}</button>
    {faculty ? <button className="tt-faculty-link" onClick={() => faculty(row.facultyId)}>{row.facultyName}</button> : <small>{row.facultyName || 'Faculty not assigned'}</small>}
  </article>
}

/* export default */ function TimetableGrid({ rows, periods: configured = [], workingDays, editable = false, add, inspect, occupancy = false, faculty, highlight, clearHighlight }) {
  const days = [...new Set([...(workingDays?.length ? workingDays : DAYS), ...rows.map(row => row.dayOfWeek)])]
  const [selectedDay, setSelectedDay] = useState('MONDAY')
  const root = useRef(null)
  useEffect(() => {
    if (!highlight) return
    requestAnimationFrame(() => [...(root.current?.querySelectorAll('[data-entry-id]') || [])].find(element => element.dataset.entryId === String(highlight) && element.getClientRects().length)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [highlight, rows])
  const day = rows.find(row => row.id === highlight)?.dayOfWeek || (days.includes(selectedDay) ? selectedDay : days[0])
  const candidates = [...configured.map((row, index) => ({ ...row, name: periodLabel(row, index) })), ...rows.filter(row => !configured.some(period => isTeachingPeriod(period) && overlaps(period, row))).map(row => ({ startTime: row.startTime, endTime: row.endTime, type: 'class', name: 'Class' }))]
  const periods = [...new Map(candidates.map(row => [`${row.startTime.slice(0, 5)}|${row.endTime.slice(0, 5)}|${periodType(row)}`, row])).values()]
    .filter(row => isTeachingPeriod(row) || (!rows.some(entry => overlaps(row, entry)) && !configured.some(period => isTeachingPeriod(period) && overlaps(row, period))))
    .sort((a, b) => (timeMinutes(a.startTime) ?? 1440) - (timeMinutes(b.startTime) ?? 1440))
  if (!periods.length && !editable) return <EmptyState title="No scheduled classes for this selection" message="Choose a timetable or publish a draft for this academic context." />
  const slots = periods.length ? periods : [{ startTime: '', endTime: '', name: 'Period', type: 'class' }]
  const empty = (slot, day) => <button className="tt-empty-cell" aria-label={`Add class ${day} ${slot.name} ${slot.startTime.slice(0, 5)}`} onClick={() => add({ dayOfWeek: day, startTime: slot.startTime, endTime: slot.endTime, timetableSlotId: slot.id })}><FiPlus /><span>Add class</span></button>
  const card = row => <TimetableCell key={`${row.origin}-${row.id}`} row={row} inspect={inspect} occupancy={occupancy} faculty={faculty} highlight={highlight} />
  const agenda = [
    ...rows.filter(row => row.dayOfWeek === day).map(row => ({ startTime: row.startTime, id: `entry-${row.origin}-${row.id}`, content: card(row) })),
    ...slots.filter(slot => !isTeachingPeriod(slot) || (editable && !rows.some(row => row.dayOfWeek === day && overlaps(row, slot)))).map(slot => ({ startTime: slot.startTime, id: `period-${slot.id || slot.startTime}-${periodType(slot)}`, content: isTeachingPeriod(slot) ? <div className="tt-agenda-slot"><small>{slot.name} · {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</small>{empty(slot, day)}</div> : <div className="tt-agenda-break"><strong>{slot.name}</strong><span>{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</span></div> })),
  ].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
  return <div ref={root} className="tt-grid-container">
    {!rows.length && <p className="tt-notice tt-grid-empty-note" role="status">{editable ? 'No classes have been scheduled yet. Add a class or use Generate Missing to fill this draft.' : 'No scheduled classes were returned for this timetable.'}</p>}
    <div className="tt-grid-scroll"><table className="tt-week" style={{ '--tt-day-count': days.length }}><caption>Weekly timetable</caption><thead><tr><th scope="col">Period</th>{days.map(day => <th scope="col" key={day}>{day.slice(0, 1) + day.slice(1).toLowerCase()}</th>)}</tr></thead><tbody>{slots.map(slot => <tr key={`${slot.startTime}-${slot.endTime}-${periodType(slot)}`} className={!isTeachingPeriod(slot) ? 'tt-break-row' : ''} data-period-type={periodType(slot)}>
      <th scope="row">{slot.name}<small>{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</small></th>
      {!isTeachingPeriod(slot) ? <td colSpan={days.length}>{slot.name} · No teaching</td> : days.map(day => {
        const matching = rows.filter(row => row.dayOfWeek === day && (overlaps(row, slot) || (!row.startTime && !slot.startTime)))
        return <td key={day}>{matching.map(card)}{!matching.length && (editable ? empty(slot, day) : <span className="tt-empty-slot">{occupancy ? 'No published booking' : 'No class scheduled'}</span>)}</td>
      })}
    </tr>)}</tbody></table></div>
    <div className="tt-day-view"><div className="tt-day-tabs" role="group" aria-label="Schedule Day">{days.map(value => <button key={value} className={value === day ? 'active' : ''} aria-pressed={value === day} onClick={() => { setSelectedDay(value); clearHighlight?.() }}>{value.slice(0, 3)}</button>)}</div>{agenda.map(item => <div key={item.id}>{item.content}</div>)}{!rows.some(row => row.dayOfWeek === day) && <p>No classes for this day.</p>}</div>
  </div>
}
// #endregion pages/timetable/TimetableGrid.jsx
return {
  get default() { return TimetableGrid; }
};
})();

export const TimetableComponentsModule = (() => {
const { useState } = external0;
const { availableSlots } = timetableDomainModule;
const { default: WorkspaceDrawer } = WorkspaceDrawerModule;
const { default: SearchableSelect } = SearchableSelectModule;
const { DAYS } = timetableUtilsModule;
const { key } = timetableUtilsModule;
const { same } = timetableUtilsModule;
const { eligibleSubjects } = timetableUtilsModule;
const { eligibleFaculty } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { periodSessions } = timetablePeriodsModule;
const { periodLabel } = timetablePeriodsModule;
const { entryPlanningErrors } = timetablePlannerModule;
const { roomOptions } = timetablePlannerModule;
const { subjectRequirements } = timetablePlannerModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import { availableSlots } from '../../services/timetable/timetableDomain'
import WorkspaceDrawer from './WorkspaceDrawer'
import SearchableSelect from '../../components/SearchableSelect'
import { DAYS, key, same, eligibleSubjects, eligibleFaculty, conflictsFor } from '../../utils/timetableUtils'
import { periodSessions, periodLabel } from '../../utils/timetablePeriods'
import { entryPlanningErrors, roomOptions, subjectRequirements } from '../../utils/timetablePlanner'
*/
// #region pages/timetable/TimetableComponents.jsx
/* export */ function TimetableSelect({ label, value, options, onChange, disabled = false, required = false }) {
  return <div className="tt-field"><span>{label}{required && ' *'}</span><SearchableSelect label={label} value={value} options={options} onChange={onChange} disabled={disabled} required={required} placeholder={`Select ${label.toLowerCase()}`} /></div>
}
/* export { default as WeeklyGrid } from './TimetableGrid' */

/* export */ function ScheduleDialog({ initial, table, sources, entries, save, remove, close, readOnly = false }) {
  const [form, setForm] = useState({ subjectId: '', facultyId: '', dayOfWeek: table.planning?.calendar.workingDays[0] || 'MONDAY', startTime: '', endTime: '', classroom: '', entryType: '', ...initial })
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmRemove, setConfirmRemove] = useState(false)
  const [mode, setMode] = useState('edit')
  const subjects = eligibleSubjects(sources.subjects, table).filter(row => table.planning?.requirements?.[key(row.id)]?.selected !== false)
  const faculty = eligibleFaculty(sources.faculty, sources.allocations, form.subjectId, table)
  const conflicts = conflictsFor({ ...form, calendar: table.planning?.calendar, sectionId: table.sectionId }, entries)
  const suggestions = conflicts.length && table.planning ? availableSlots(form, table, sources, entries) : []
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
    {details ? <div className="tt-dialog-body"><dl>{[['Subject', label(sources.subjects, form.subjectId)], ['Faculty', label(sources.faculty, form.facultyId)], ['Day', form.dayOfWeek], ['Period', sessions.find(session => session.startTime === form.startTime && session.endTime === form.endTime)?.name || 'Not supplied'], ['Time', `${form.startTime || 'Unavailable'} – ${form.endTime || 'Unavailable'}`], ['Classroom / Lab', form.classroom || 'Not assigned'], ['Source', table.publicationStatus === 'published' ? 'Published timetable' : 'Backend draft']].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>{readOnly ? <p>Published timetables are read-only. Create a new timetable period in the Builder for a changed schedule.</p> : <div className="tt-actions"><button className="tt-button tt-primary" onClick={() => setMode('edit')}>Edit</button><button className="tt-button" onClick={() => setMode('move')}>Move</button><button className="tt-button tt-danger" disabled={busy} onClick={() => confirmRemove ? execute(() => remove(form.id)) : setConfirmRemove(true)}>{confirmRemove ? 'Confirm removal' : 'Remove class'}</button></div>}{error && <p className="tt-error" role="alert">{error}</p>}</div> : <form onSubmit={event => { event.preventDefault(); if (!conflicts.length && !planErrors.length) execute(() => save(form)) }}>
      <div className="tt-dialog-body">{form.id && <p>To move this class, choose another day or teaching period. Every change is checked for conflicts before saving.</p>}<div className="tt-form-grid"><TimetableSelect label="Subject" value={form.subjectId} options={subjects.map(row => ({ ...row, name: `${row.subjectCode || ''} · ${row.name}` }))} onChange={value => { change('subjectId', value); setForm(old => ({ ...old, entryType: subjects.find(row => same(row.id, value))?.subjectType || '' })) }} disabled={busy || mode === 'move'} /><TimetableSelect label="Faculty" value={form.facultyId} options={faculty} onChange={value => change('facultyId', value)} disabled={busy || !form.subjectId || mode === 'move'} /><TimetableSelect label="Day" value={form.dayOfWeek} options={table.planning?.calendar.workingDays || [...DAYS, 'SUNDAY']} onChange={value => change('dayOfWeek', value)} disabled={busy} />
        {table.planning ? <TimetableSelect label="Classroom / Lab" value={rooms.find(room => form.roomId && room.roomId ? same(room.roomId, form.roomId) : room.classroom === form.classroom)?.value || ''} options={rooms} disabled={busy || mode === 'move'} onChange={value => { const room = rooms.find(row => row.value === value); setForm(old => ({ ...old, classroom: room?.classroom || '', roomId: room?.roomId || '' })) }} /> : <label className="tt-field"><span>Classroom / Lab</span><input required maxLength={120} value={form.classroom} disabled={busy} onChange={event => change('classroom', event.target.value)} /></label>}
        <TimetableSelect label="Period" value={sessions.find(session => session.startTime.slice(0, 5) === form.startTime.slice(0, 5) && session.endTime.slice(0, 5) === form.endTime.slice(0, 5))?.id || ''} options={sessions} disabled={busy} onChange={value => { const period = sessions.find(row => same(row.id, value)); if (period) setForm(old => ({ ...old, timetableSlotId: period.id, startTime: period.startTime, endTime: period.endTime })) }} />
        <label className="tt-field"><span>Subject Type</span><input value={subjects.find(row => same(row.id, form.subjectId))?.subjectType || form.entryType || 'Not supplied'} readOnly /></label></div>
        {!subjects.length && <p className="tt-notice">No active API subjects match this academic mapping. Local sample subjects cannot be used as backend subject IDs.</p>}
        {form.subjectId && !faculty.length && <p className="tt-notice">No active faculty allocation exists for this subject and academic context.</p>}

        {conflicts.length > 0 && <div className="tt-error" role="alert">{conflicts.map(row => <p key={key(row.id)}>{row.message}</p>)}</div>}
        {suggestions.length > 0 && <section><h3>Suggested available slots</h3>{suggestions.map(row => <button type="button" className="tt-button" key={`${row.dayOfWeek}-${row.startTime}`} onClick={() => setForm(row)}>{row.dayOfWeek} {row.startTime.slice(0, 5)} - {row.endTime.slice(0, 5)}</button>)}</section>}
        {form.id && mode !== 'move' && <button type="button" className="tt-button" onClick={() => setMode('move')}>Move class</button>}
        {planErrors.length > 0 && <div className="tt-planning-help">{planErrors.map(message => <p key={message}>{message}</p>)}</div>}
        {error && <p className="tt-error" role="alert">{error}</p>}
      </div><footer>{form.id && <button type="button" className="tt-button tt-danger" disabled={busy} onClick={() => confirmRemove ? execute(() => remove(form.id)) : setConfirmRemove(true)}>{confirmRemove ? 'Confirm removal' : 'Remove class'}</button>}<button type="button" className="tt-button" disabled={busy} onClick={close}>Cancel</button><button className="tt-button tt-primary" disabled={busy || Boolean(conflicts.length) || Boolean(planErrors.length) || !form.subjectId || !form.facultyId}>{busy ? 'Saving...' : 'Save Draft Entry'}</button></footer>
    </form>}
  </WorkspaceDrawer>
}
// #endregion pages/timetable/TimetableComponents.jsx
return {
  get TimetableSelect() { return TimetableSelect; },
  get WeeklyGrid() { return TimetableGridModule.default; },
  get ScheduleDialog() { return ScheduleDialog; }
};
})();

export const PeriodSetupStepModule = (() => {
const { dailyPeriods } = timetablePeriodsModule;
const { DAILY_PERIOD_SETUP } = timetablePeriodsModule;
const { roomOptions } = timetablePlannerModule;
const { WEEKDAYS } = timetablePlannerModule;
/* Imports for isolated regression tests:
import { dailyPeriods, DAILY_PERIOD_SETUP } from '../../utils/timetablePeriods'
import { roomOptions, WEEKDAYS } from '../../utils/timetablePlanner'
*/
// #region pages/timetable/PeriodSetupStep.jsx
/* export default */ function PeriodSetupStep({ config, setConfig, sources, entries, busy, errors, back, continueSetup }) {
  const settings = config.automatic || DAILY_PERIOD_SETUP
  const rooms = roomOptions(sources, entries)
  const startDate = String(config.calendar.startDate || '').slice(0, 10)
  const endDate = String(config.calendar.endDate || '').slice(0, 10)
  const visibleErrors = errors.filter(error => error !== 'Timetable start date and end date are required.')
  const rebuild = (field, value) => setConfig(old => {
    const automatic = { ...old.automatic, [field]: value }
    const result = dailyPeriods(automatic, old.periods)
    return { ...old, automatic, periods: result.periods, automaticErrors: result.errors }
  })
  const calendar = (field, value) => setConfig(old => ({ ...old, calendar: { ...old.calendar, startDate: String(old.calendar.startDate || '').slice(0, 10), endDate: String(old.calendar.endDate || '').slice(0, 10), [field]: value, reviewed: true } }))
  return <section className="tt-card tt-clean-step" aria-label="Daily Schedule Setup">
    <h2>Daily schedule</h2><p>These timings apply to every selected section.</p>
    <fieldset className="tt-period-controls" disabled={busy}>
      <div className="tt-form-grid">{[['startTime', 'College Start Time', 'time'], ['periodsPerDay', 'Periods Per Day', 'number'], ['duration', 'Period Duration (minutes)', 'number'], ['breakDuration', 'Short Break (minutes, 0 to disable)', 'number'], ['breakAfter', 'Break after period', 'number'], ['lunchDuration', 'Lunch (minutes, 0 to disable)', 'number'], ['lunchAfter', 'Lunch after period', 'number']].map(([field, label, type]) => <label className="tt-field" key={field}><span>{label}</span><input type={type} min={field.includes('Duration') ? 0 : 1} step={1} value={settings[field]} onChange={event => rebuild(field, event.target.value)} /></label>)}</div>
      <h3>Working days</h3><div className="tt-checks">{WEEKDAYS.map(day => <label key={day}><input type="checkbox" checked={config.calendar.workingDays.includes(day)} onChange={event => calendar('workingDays', event.target.checked ? WEEKDAYS.filter(value => value === day || config.calendar.workingDays.includes(value)) : config.calendar.workingDays.filter(value => value !== day))} />{day.slice(0, 3)}</label>)}</div>
      <h3>Timetable Validity Period</h3>
      <div className="tt-form-grid">{[['startDate', 'Timetable Start Date'], ['endDate', 'Timetable End Date']].map(([field, label]) => <label className="tt-field" key={field}><span>{label}</span><input type="date" value={field === 'startDate' ? startDate : endDate} onClick={event => { try { event.currentTarget.showPicker?.() } catch {} }} onChange={event => calendar(field, event.target.value)} /></label>)}</div>
      <details><summary>Available rooms ({config.rooms.length})</summary><div className="tt-checks">{rooms.map(room => <label key={room.value}><input type="checkbox" checked={config.rooms.includes(room.value)} onChange={event => setConfig(old => ({ ...old, rooms: event.target.checked ? [...old.rooms, room.value] : old.rooms.filter(value => value !== room.value) }))} />{room.name}</label>)}</div>{!rooms.length && <p>No room references were supplied by sections or existing timetable entries. Configure a section room in Section Management.</p>}</details>
    </fieldset>
    {visibleErrors.length > 0 && <div className="tt-error" role="alert">{visibleErrors.map(error => <p key={error}>{error}</p>)}</div>}
    <footer className="tt-actions"><button className="tt-button" onClick={back}>Back</button><button className="tt-button tt-primary" disabled={busy || Boolean(errors.length)} onClick={continueSetup}>Continue to Subjects</button></footer>
  </section>
}
// #endregion pages/timetable/PeriodSetupStep.jsx
return {
  get default() { return PeriodSetupStep; }
};
})();

export const SubjectCoverageModule = (() => {
const { useState } = external0;
const { eligibleSubjects } = timetableUtilsModule;
const { same } = timetableUtilsModule;
const { key } = timetableUtilsModule;
const { subjectRequirements } = timetablePlannerModule;
const { updateWeeklyRequirement } = timetableWorkflowServiceModule;
const { showToast } = toastModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import { eligibleSubjects, same, key } from '../../utils/timetableUtils'
import { subjectRequirements } from '../../utils/timetablePlanner'
import { updateWeeklyRequirement } from '../../services/timetable/timetableWorkflowService'
import { showToast } from '../../utils/toast'
*/
// #region pages/timetable/SubjectCoverage.jsx
function WeeklyRequirement({ allocation, refresh, disabled }) {
  const [value, setValue] = useState(allocation.periodsPerWeek || ''), [busy, setBusy] = useState(false)
  return <form className="tt-weekly-requirement" onSubmit={async event => {
    event.preventDefault(); setBusy(true)
    try { await updateWeeklyRequirement(allocation, value); await refresh(); showToast('Weekly requirement saved.', 'success') }
    catch (error) { showToast(error.message, 'error') }
    finally { setBusy(false) }
  }}><input aria-label={`Weekly periods for ${allocation.facultyName || allocation.facultyId}, section ${allocation.sectionId}`} type="number" min="1" step="1" value={value} disabled={busy || disabled} onChange={event => setValue(event.target.value)} /><span>/ week</span><button className="tt-button" disabled={busy || disabled || Number(value) === Number(allocation.periodsPerWeek)}>Save</button></form>
}
/* export default */ function SubjectCoverage({ sources, scope, selected, config, setConfig, refresh, faculty, disabled }) {
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
// #endregion pages/timetable/SubjectCoverage.jsx
return {
  get default() { return SubjectCoverage; }
};
})();

export const TimetableWorkspaceModule = (() => {
const { useState } = external0;
const { default: TimetableGrid } = TimetableGridModule;
const { ScheduleDialog } = TimetableComponentsModule;
const { default: WorkspaceDrawer } = WorkspaceDrawerModule;
const { same } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { schedulingIssues } = timetablePlannerModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import TimetableGrid from './TimetableGrid'
import { ScheduleDialog } from './TimetableComponents'
import WorkspaceDrawer from './WorkspaceDrawer'
import { same, conflictsFor } from '../../utils/timetableUtils'
import { schedulingIssues } from '../../utils/timetablePlanner'
*/
// #region pages/timetable/TimetableWorkspace.jsx
/* export default */ function TimetableWorkspace({ mockMode = false, table, tables, sources, entries, busy, section, faculty, generate, regenerate, save, remove, validate, publish, reopen }) {
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
// #endregion pages/timetable/TimetableWorkspace.jsx
return {
  get default() { return TimetableWorkspace; }
};
})();

export const TimetableBuilderModule = (() => {
const { useState } = external0;
const { TimetableSelect } = TimetableComponentsModule;
const { default: PeriodSetupStep } = PeriodSetupStepModule;
const { default: SubjectCoverage } = SubjectCoverageModule;
const { default: TimetableWorkspace } = TimetableWorkspaceModule;
const { default: WorkspaceDrawer } = WorkspaceDrawerModule;
const { dailyPeriods } = timetablePeriodsModule;
const { DAILY_PERIOD_SETUP } = timetablePeriodsModule;
const { roomOptions } = timetablePlannerModule;
const { planningErrors } = timetablePlannerModule;
const { same } = timetableUtilsModule;
const { matchesScope } = timetableUtilsModule;
const { contextOptions } = timetableDomainModule;
const { changeContext } = timetableDomainModule;
const { hierarchy } = timetableDomainModule;
const { scopeSections } = timetableDomainModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import { TimetableSelect } from './TimetableComponents'
import PeriodSetupStep from './PeriodSetupStep'
import SubjectCoverage from './SubjectCoverage'
import TimetableWorkspace from './TimetableWorkspace'
import WorkspaceDrawer from './WorkspaceDrawer'
import { dailyPeriods, DAILY_PERIOD_SETUP } from '../../utils/timetablePeriods'
import { roomOptions, planningErrors } from '../../utils/timetablePlanner'
import { same, matchesScope } from '../../utils/timetableUtils'
import { contextOptions, changeContext, hierarchy, scopeSections } from '../../services/timetable/timetableDomain'
*/
// #region pages/timetable/TimetableBuilder.jsx
const labels = ['Academic Year', 'Course', 'Department', 'Branch', 'Academic Level', 'Semester']
const initialPlanning = (sources, scope, entries) => ({
  automatic: { ...DAILY_PERIOD_SETUP },
  periods: sources.yearSettings?.[scope.academicYearId]?.periods?.length ? sources.yearSettings[scope.academicYearId].periods : dailyPeriods(DAILY_PERIOD_SETUP).periods,
  calendar: { ...(sources.yearSettings?.[scope.academicYearId]?.calendar || {}), startDate: '', endDate: '', workingDays: sources.yearSettings?.[scope.academicYearId]?.calendar?.workingDays?.length ? sources.yearSettings[scope.academicYearId].calendar.workingDays : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], reviewed: true, holidays: sources.yearSettings?.[scope.academicYearId]?.calendar?.holidays || [] },
  rooms: roomOptions(sources, entries).map(row => row.value),
  requirements: {},
})
const editablePlanning = planning => {
  if (!planning?.calendar) return planning
  const startDate = String(planning.calendar.startDate || '').slice(0, 10)
  const endDate = String(planning.calendar.endDate || '').slice(0, 10)
  return { ...planning, calendar: { ...planning.calendar, startDate, endDate } }
}
/* export default */ function TimetableBuilder({ mockMode = false, sources, entries, tables, initial, busy, enabled, refresh, faculty, generate, saveSetup, save, remove, validate, publish, reopen }) {
  const [scope, setScope] = useState(initial || Object.fromEntries(hierarchy.map(field => [field, ''])))
  const [origin, setOrigin] = useState(initial?.origin || (mockMode ? 'local' : 'backend'))
  const [step, setStep] = useState(initial?.id ? 4 : 1)
  const [selected, setSelected] = useState(initial?.sectionId ? [String(initial.sectionId)] : [])
  const [activeSection, setActiveSection] = useState(initial?.sectionId || '')
  const [config, setConfig] = useState(initial?.planning ? editablePlanning(initial.planning) : null)
  const [batchIds, setBatchIds] = useState(initial?.id ? [String(initial.id)] : [])
  const [impactOpen, setImpactOpen] = useState(false)
  const options = contextOptions(sources, scope), sections = scopeSections(sources, scope)
  const currentTables = tables.filter(table => (table.origin || 'local') === origin && matchesScope(table, scope) && selected.some(id => same(id, table.sectionId)) && (batchIds.length ? batchIds.some(id => same(id, table.id)) : table.publicationStatus === 'draft' && config && table.planning?.calendar?.startDate === config.calendar.startDate && table.planning?.calendar?.endDate === config.calendar.endDate))
  const table = currentTables.find(row => same(row.sectionId, activeSection)) || currentTables[0]
  const change = (field, value) => {
    const next = changeContext(scope, field, value)
    setScope(next); setConfig(null); setBatchIds([]); setOrigin(mockMode ? 'local' : 'backend')
    const all = scopeSections(sources, next).map(row => String(row.id))
    setSelected(all); setActiveSection(all[0] || '')
  }
  const setup = () => {
    const existing = initial?.id ? tables.find(table => same(table.id, initial.id)) : null
    if (existing && matchesScope(existing, scope) && selected.some(id => same(id, existing.sectionId))) {
      const existingOrigin = existing.origin || 'local'
      setOrigin(existingOrigin); setConfig(editablePlanning(existing.planning) || initialPlanning(sources, scope, entries)); setActiveSection(existing.sectionId)
      setStep(existing.publicationStatus === 'draft' ? 2 : 4)
      return
    }
    setConfig(initialPlanning(sources, scope, entries))
    setStep(2)
  }
  const errors = config ? [...planningErrors(config, sources, { ...scope, sectionId: selected[0] }, entries), ...(config.automaticErrors || [])] : []
  const runGeneration = async replace => { const result = await generate({ scope: Object.fromEntries(hierarchy.map(field => [field, scope[field]])), selected, config, expected: currentTables, replace }); if (result) { if (Array.isArray(result)) setBatchIds(result.filter(row => matchesScope(row, scope) && selected.some(id => same(id, row.sectionId)) && row.planning?.calendar?.startDate === config.calendar.startDate && row.planning?.calendar?.endDate === config.calendar.endDate).map(row => String(row.id))); setActiveSection(activeSection || selected[0]); setStep(4) }; return result }
  const applySetup = async () => { const result = await saveSetup(currentTables, config); if (result) { setImpactOpen(false); setStep(4) } }
  const setupChanged = currentTables.some(row => JSON.stringify(row.planning) !== JSON.stringify(config))
  const savedEntries = currentTables.flatMap(row => row.entries)
  return <section className="tt-clean-builder" aria-label="Timetable Builder">
    <nav className="tt-stepper" aria-label="Builder steps">{['Academic Setup', 'Daily Schedule', 'Subjects & Faculty', 'Review & Publish'].map((label, index) => <button key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'active' : ''} disabled={busy || (index > 0 && !config) || (index === 3 && !currentTables.length) || (currentTables.some(row => row.publicationStatus === 'published') && [1, 2].includes(index))} onClick={() => setStep(index + 1)}><span>{index + 1}</span>{label}</button>)}</nav>
    {step === 1 && <section className="tt-card tt-clean-step"><h2>Academic setup</h2><div className="tt-form-grid">{hierarchy.map((field, index) => <TimetableSelect key={field} label={labels[index]} value={scope[field]} options={options[field]} disabled={busy || Boolean(index && !scope[hierarchy[index - 1]])} onChange={value => change(field, value)} />)}</div>
      {scope.semesterId && <><h3>Sections ({sections.length})</h3><div className="tt-checks">{sections.map(section => <label key={section.id}><input type="checkbox" checked={selected.some(id => same(id, section.id))} onChange={event => setSelected(old => event.target.checked ? [...old, String(section.id)] : old.filter(id => !same(id, section.id)))} />{section.name}</label>)}</div>{!sections.length && <p>No active sections match this academic context.</p>}</>}
      <button className="tt-button tt-primary" disabled={!selected.length || busy} onClick={setup}>Continue</button></section>}
    {step === 2 && config && <PeriodSetupStep config={config} setConfig={setConfig} sources={sources} scope={scope} entries={entries} busy={busy} errors={errors} back={() => setStep(1)} continueSetup={() => setStep(3)} />}
    {step === 3 && config && <><SubjectCoverage sources={sources} scope={scope} selected={selected} config={config} setConfig={setConfig} refresh={refresh} faculty={faculty} disabled={busy} /><div className="tt-actions"><button className="tt-button" onClick={() => setStep(2)}>Back</button><button className="tt-button tt-primary" disabled={busy || !enabled || errors.length > 0} onClick={async () => { if (currentTables.length) { if (setupChanged && savedEntries.length) setImpactOpen(true); else await applySetup() } else await runGeneration(false) }}>{currentTables.length ? 'Save Settings' : busy ? 'Generating Timetablesâ€¦' : 'GENERATE ALL SELECTED SECTIONS'}</button></div>{busy && !currentTables.length && <p role="status">Generating coordinated section drafts and checking campus-wide conflictsâ€¦</p>}</>}
    {step === 4 && table && <TimetableWorkspace mockMode={mockMode} table={table} tables={currentTables} sources={sources} entries={entries} busy={busy} section={setActiveSection} faculty={faculty} generate={() => runGeneration(false)} regenerate={() => runGeneration(true)} save={save} remove={remove} validate={validate} publish={publish} reopen={reopen} />}
    {impactOpen && <WorkspaceDrawer modal title="Configuration change impact" busy={busy} close={() => setImpactOpen(false)}><div className="tt-clean-step"><p>Review the existing draft data before applying shared timing changes.</p><div className="tt-live-summary"><article><strong>{currentTables.length}</strong><span>affected sections</span></article><article><strong>{savedEntries.length}</strong><span>existing classes</span></article><article><strong>{new Set(savedEntries.map(row => String(row.facultyId)).filter(Boolean)).size}</strong><span>assigned faculty</span></article><article><strong>{new Set(savedEntries.map(row => row.roomId || row.classroom).filter(Boolean)).size}</strong><span>used rooms</span></article></div><p>Settings will be saved only if every existing class remains valid. No class will be regenerated or removed.</p><div className="tt-actions"><button className="tt-button" disabled={busy} onClick={() => setImpactOpen(false)}>Cancel</button><button className="tt-button tt-primary" disabled={busy} onClick={applySetup}>Review and Apply</button></div></div></WorkspaceDrawer>}
  </section>
}
// #endregion pages/timetable/TimetableBuilder.jsx
return {
  get default() { return TimetableBuilder; }
};
})();

export const TimetableDashboardModule = (() => {
const { FiClock } = external3;
const { FiUsers } = external3;
const { FiCheckCircle } = external3;
const { FiAlertTriangle } = external3;
const { FiLayers } = external3;
const { FiBookOpen } = external3;
const { FiClipboard } = external3;
const { FiUserCheck } = external3;
const { FiHome } = external3;
const { FiGrid } = external3;
const { useMemo } = external0;
const { useState } = external0;
const { schedulingIssues } = timetablePlannerModule;
const { subjectRequirements } = timetablePlannerModule;
const { roomOptions } = timetablePlannerModule;
const { planningErrors } = timetablePlannerModule;
const { suitableRoom } = timetablePlannerModule;
const { active } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { conflictPairs } = timetableUtilsModule;
const { same } = timetableUtilsModule;
const { academicLevel } = timetableDomainModule;
const { scopeSections } = timetableDomainModule;
const { default: ExportMenu } = ExportMenuModule;
/* Imports for isolated regression tests:
import { FiClock, FiUsers, FiCheckCircle, FiAlertTriangle, FiLayers, FiBookOpen, FiClipboard, FiUserCheck, FiHome, FiGrid } from 'react-icons/fi'
import { useMemo, useState } from 'react'
import { schedulingIssues, subjectRequirements, roomOptions, planningErrors, suitableRoom } from '../../utils/timetablePlanner'
import { active, conflictsFor, conflictPairs, same } from '../../utils/timetableUtils'
import { academicLevel, scopeSections } from '../../services/timetable/timetableDomain'
import ExportMenu from '../../components/ExportMenu'
*/
// #region pages/timetable/TimetableDashboard.jsx
const name = (rows, id) => rows.find(row => same(row.id, id))?.name || 'Unavailable'

function contextFor(section, sources) {
  const branch = sources.branches.find(row => same(row.id, section.branchId))
  const courseId = section.courseId || branch?.courseId || ''
  const course = sources.courses.find(row => same(row.id, courseId))
  const semester = sources.semesters.find(row => same(row.id, section.semesterId))
  return {
    academicYearId: section.academicYearId || semester?.academicYearId || '',
    departmentId: section.departmentId || branch?.departmentId || course?.departmentId || '',
    courseId, branchId: section.branchId || '', level: academicLevel(semester || {}), semesterId: section.semesterId || '', sectionId: section.id,
  }
}

function readiness(section, sources, entries, table) {
  const scope = contextFor(section, sources)
  const config = table?.planning
  const requirements = subjectRequirements(sources, scope, config?.requirements || {})
  const rooms = roomOptions(sources, entries)
  const issues = config ? [...planningErrors(config, sources, scope, entries), ...(config.automaticErrors || [])] : ['Save and review the timetable period settings before generation.']
  if (!scopeSections(sources, scope).some(row => same(row.id, section.id))) issues.push('Academic relationships are incomplete or changed. Review this section.')
  if (!requirements.length) issues.push('No active subjects match this section.')
  for (const item of requirements) {
    if (!item.faculty.length) issues.push(`${item.subject.name}: no allocated faculty available.`)
    if (!Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1) issues.push(`${item.subject.name}: weekly requirements are missing or ambiguous.`)
    if (!Number.isInteger(item.blockSize) || item.blockSize < 1 || item.periodsPerWeek % item.blockSize) issues.push(`${item.subject.name}: weekly periods must match the consecutive periods per session.`)
    if (!rooms.some(room => config?.rooms?.includes(room.value) && suitableRoom(item.subject, room))) issues.push(`${item.subject.name}: select a suitable classroom or lab.`)
  }
  if (!rooms.length) issues.push('Room references are unavailable.')
  if (entries.filter(row => same(row.sectionId, section.id)).some(row => conflictsFor(row, entries).length)) issues.push('Existing timetable conflicts need review.')
  return { ready: issues.length === 0, issues: [...new Set(issues)] }
}

/* export default */ function TimetableDashboard({ tables, sources, entries, today, open }) {
  const [attentionOpen, setAttentionOpen] = useState(false)
  const activeSections = useMemo(() => sources.sections.filter(active), [sources.sections])
  const departments = useMemo(() => sources.departments.filter(active), [sources.departments])
  const rooms = useMemo(() => roomOptions(sources, entries), [sources, entries])
  const readinessRows = useMemo(() => activeSections.map(section => {
    const table = tables.filter(item => same(item.sectionId, section.id)).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
    return { section, table, result: readiness(section, sources, entries, table) }
  }), [activeSections, sources, entries, tables])
  const readyCount = readinessRows.filter(row => row.result.ready).length
  const scopedRequirements = activeSections.flatMap(section => subjectRequirements(sources, contextFor(section, sources), readinessRows.find(row => same(row.section.id, section.id))?.table?.planning?.requirements || {}))
  const coveredRequirements = scopedRequirements.filter(item => item.faculty.length && item.periodsPerWeek > 0).length
  const configuredSections = readinessRows.filter(row => row.table?.planning?.periods?.some(period => !['break', 'lunch'].includes(String(period.type || '').toLowerCase()))).length
  const detectedConflicts = conflictPairs(entries).length
  const attention = tables.filter(table => table.planning && schedulingIssues(sources, table, table.planning, table.entries).length || entries.some(row => same(row.timetableId, table.id) && conflictsFor(row, entries).length)).length
  const lifecycleAvailable = tables.some(table => table.publicationStatus === 'draft' || table.publicationStatus === 'published')
  const exportRows = entries.map(row => {
    const table = tables.find(item => same(item.id, row.timetableId))
    return { ...row, timetableName: table?.name || row.timetableName || 'Backend timetable', academicYear: name(sources.years, table?.academicYearId || row.academicYearId), course: name(sources.courses, table?.courseId || row.courseId), branch: name(sources.branches, table?.branchId || row.branchId), semester: name(sources.semesters, table?.semesterId || row.semesterId), status: table?.publicationStatus || row.publicationStatus || 'unavailable' }
  })
  const exportColumns = [
    { key: 'timetableName', label: 'Timetable' }, { key: 'academicYear', label: 'Academic Year' }, { key: 'course', label: 'Course' },
    { key: 'branch', label: 'Branch' }, { key: 'semester', label: 'Semester' }, { key: 'sectionName', label: 'Section' },
    { key: 'dayOfWeek', label: 'Day' }, { key: 'startTime', label: 'Start Time' }, { key: 'endTime', label: 'End Time' },
    { key: 'subjectCode', label: 'Subject Code' }, { key: 'subjectName', label: 'Subject' }, { key: 'facultyName', label: 'Faculty' }, { key: 'classroom', label: 'Room' }, { key: 'status', label: 'Status' },
  ]

  const sectionButton = section => {
    const row = readinessRows.find(item => same(item.section.id, section.id))
    const table = row?.table
    const scope = contextFor(section, sources)
    const state = row.result
    return <button className="tt-recent-table" key={section.id} onClick={() => open(table || scope)}>
      <strong>{section.name || `Section ${section.id}`}</strong>
      <span>{table ? `${table.entries.length} classes Ã‚Â· ${table.publicationStatus === 'unavailable' ? 'Lifecycle status unavailable' : table.publicationStatus}` : `${state.ready ? 'Ready to configure' : 'Needs attention'} Ã‚Â· No timetable yet`}</span>
      {!state.ready && <small>{state.issues.join(' ')}</small>}
    </button>
  }

  return <div className="tt-dashboard-panel">
    <div className="tt-dashboard-stats" aria-label="Timetable summary">
      {[
        ['Total Sections', activeSections.length, FiUsers], ['Ready for Generation', readyCount, FiCheckCircle],
        ['Needs Attention', activeSections.length - readyCount, FiAlertTriangle],
        ['Draft / Published', lifecycleAvailable ? `${tables.filter(row => row.publicationStatus === 'draft').length} / ${tables.filter(row => row.publicationStatus === 'published').length}` : 'Not Available', FiLayers],
      ].map(([label, value, Icon]) => label === 'Needs Attention' ? <button type="button" className="tt-card tt-attention-card" key={label} aria-expanded={attentionOpen} aria-controls="tt-attention-details" onClick={() => setAttentionOpen(value => !value)}><strong><Icon aria-hidden="true" />{value}</strong><span>{label}</span><small>Review section issues</small></button> : <div className="tt-card" key={label}><strong><Icon aria-hidden="true" />{value}</strong><span>{label}</span><small>{label === 'Ready for Generation' ? 'Saved prerequisites validated' : label === 'Draft / Published' ? 'Timetables by saved status' : 'Active sections'}</small></div>)}
    </div>
    <section className="tt-card tt-validation-panel" aria-label="Validation summary">
      <header><h2>Validation summary</h2><span>Based on the latest loaded data</span></header>
      <dl className="tt-readiness-details">
        {[
          ['Active Subjects Loaded', sources.subjects.filter(active).length, FiBookOpen, 'info'],
          ['Subject Requirements Missing', scopedRequirements.filter(item => !Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1).length, FiClipboard, scopedRequirements.some(item => !Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1) ? 'warning' : 'success'],
          ['Requirement and Faculty Coverage', `${coveredRequirements}/${scopedRequirements.length}`, FiUserCheck, coveredRequirements === scopedRequirements.length && scopedRequirements.length ? 'success' : 'warning'],
          ['Room References Loaded', rooms.length, FiHome, rooms.length ? 'info' : 'warning'],
          ['Sections with Period Setup', `${configuredSections}/${activeSections.length}`, FiGrid, configuredSections === activeSections.length && activeSections.length ? 'success' : 'warning'],
          ['Conflicting Pairs in Loaded Entries', detectedConflicts, FiAlertTriangle, detectedConflicts ? 'warning' : 'success'],
        ].map(([label, value, Icon, tone]) => <div key={label} className={`tt-validation-status tt-validation-status--${tone}`}><Icon aria-hidden="true" /><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {!activeSections.length && <p>No active sections are available in the loaded academic data.</p>}
    </section>
    {attentionOpen && <section id="tt-attention-details" className="tt-card tt-clean-step" aria-label="Sections needing attention"><header className="tt-card-heading"><div><h2><FiAlertTriangle aria-hidden="true" />Sections needing attention</h2><p>Select a section to review its settings in the existing timetable workspace.</p></div><button className="tt-button" onClick={() => setAttentionOpen(false)}>Close details</button></header><div className="tt-recent-tables">{readinessRows.filter(row => !row.result.ready).map(row => sectionButton(row.section))}</div>{readyCount === activeSections.length && <p>{activeSections.length ? 'All loaded active sections satisfy the saved generation prerequisites.' : 'No active sections to validate.'}</p>}</section>}

    <section className="tt-card tt-clean-step">
      <header className="tt-card-heading"><div><h2><FiLayers aria-hidden="true" />Academic structure</h2><p>Choose a section to open its schedule or start configuration.</p></div><div className="tt-actions"><ExportMenu rows={exportRows} columns={exportColumns} title="Timetable Schedule" filename="timetable-schedule" scope="All timetable classes" /><button className="tt-button tt-primary" onClick={() => open(null)}>Open Builder</button></div></header>
      {!departments.length || !activeSections.length ? <p>Academic structure is not available from the loaded records.</p> : <div className="tt-structure-explorer">{departments.map(department => {
        const branches = sources.branches.filter(row => active(row) && same(row.departmentId ?? sources.courses.find(course => same(course.id, row.courseId))?.departmentId, department.id))
        return <details className="tt-structure-department" key={department.id}>
          <summary>{department.name} <small>{branches.length} branches</small></summary>
          {branches.map(branch => {
            const sections = activeSections.filter(section => same(section.branchId, branch.id))
            const semesterIds = [...new Set(sections.map(section => String(section.semesterId)).filter(Boolean))]
            return <div className="tt-structure-branch" key={branch.id}><h3>{branch.name}</h3>{semesterIds.length ? semesterIds.map(semesterId => {
              const semester = sources.semesters.find(row => same(row.id, semesterId))
              return <details key={semesterId} open><summary>{semester?.name || `Semester ${semesterId}`}</summary><div className="tt-recent-tables">{sections.filter(section => same(section.semesterId, semesterId)).map(sectionButton)}</div></details>
            }) : <p>No active sections.</p>}</div>
          })}
          {!branches.length && <p>No active branches.</p>}
        </details>
      })}</div>}
    </section>
    <section className="tt-card tt-clean-step">
      <header className="tt-card-heading"><h2><FiClock aria-hidden="true" />Recent timetables</h2><span>{today.length} published classes today</span></header>
      {!tables.length ? <p>No timetable records yet. Select a section above to configure one.</p> : <div className="tt-recent-tables">{[...tables].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(table => <button className="tt-recent-table" key={`${table.origin}-${table.id}`} onClick={() => open(table)}><strong>{table.name}</strong><span>{name(sources.years, table.academicYearId)} Ã‚Â· {name(sources.departments, table.departmentId)} Ã‚Â· {name(sources.courses, table.courseId)}</span><small>{table.publicationStatus === 'unavailable' ? 'STATUS UNAVAILABLE' : table.publicationStatus.toUpperCase()} Ã‚Â· {table.entries.length} classes{attention && ' Ã‚Â· Review attention items'}</small></button>)}</div>}
    </section>

  </div>
}
// #endregion pages/timetable/TimetableDashboard.jsx
return {
  get default() { return TimetableDashboard; }
};
})();

export const FacultyTimetableModule = (() => {
const { useState } = external0;
const { same } = timetableUtilsModule;
const { localDate } = timetablePlannerModule;
const { weekday } = timetablePlannerModule;
const { publishedForFaculty } = timetableDomainModule;
const { default: TimetableGrid } = TimetableGridModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import { same } from '../../utils/timetableUtils'
import { localDate, weekday } from '../../utils/timetablePlanner'
import { publishedForFaculty } from '../../services/timetable/timetableDomain'
import TimetableGrid from './TimetableGrid'
*/
// #region pages/timetable/FacultyTimetable.jsx
/* export default */ function FacultyTimetable({ facultyId, sources, entries, tables, inspect }) {
  const [view, setView] = useState('today'), [date, setDate] = useState(localDate())
  const faculty = sources.faculty.find(row => same(row.id, facultyId))
  const weekStart = new Date(`${date}T12:00:00Z`)
  weekStart.setUTCDate(weekStart.getUTCDate() - (weekStart.getUTCDay() + 6) % 7)
  const weekDates = Number.isNaN(weekStart.getTime()) ? [] : Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * 86400000).toISOString().slice(0, 10))
  const rows = view === 'today' ? publishedForFaculty(facultyId, entries, tables, date) : [...new Map(weekDates.flatMap(day => publishedForFaculty(facultyId, entries, tables, day)).map(row => [`${row.timetableId}:${row.id}`, row])).values()]
  const branchNames = row => [sources.departments.find(item => same(item.id, sources.branches.find(branch => same(branch.id, row.branchId))?.departmentId))?.name, sources.branches.find(item => same(item.id, row.branchId))?.name, sources.semesters.find(item => same(item.id, row.semesterId))?.name, row.sectionName].filter(Boolean).join(' · ')
  const now = new Date(), nowMinutes = now.getHours() * 60 + now.getMinutes()
  const current = date === localDate() ? rows.filter(row => { const start = row.startTime.slice(0, 5).split(':').map(Number), end = row.endTime.slice(0, 5).split(':').map(Number); return start[0] * 60 + start[1] <= nowMinutes && end[0] * 60 + end[1] > nowMinutes }) : []
  const next = date === localDate() ? [...rows].filter(row => row.startTime.slice(0, 5).split(':').map(Number).reduce((hours, minutes) => hours * 60 + minutes) > nowMinutes).sort((a, b) => a.startTime.localeCompare(b.startTime))[0] : null
  return <section className="tt-clean-step"><h2>{faculty?.name || 'My Timetable'}</h2><p>{faculty?.employeeId ? `Employee ID: ${faculty.employeeId} · ` : ''}{sources.departments.find(row => same(row.id, faculty?.departmentId))?.name || 'Department unavailable'}</p><div className="tt-actions">{['today', 'week'].map(value => <button key={value} className={`tt-button ${view === value ? 'tt-primary' : ''}`} aria-pressed={view === value} onClick={() => setView(value)}>{value === 'today' ? 'Today' : 'Week'}</button>)}{<label className="tt-field"><span>Schedule date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>}</div><p>{rows.length} teaching sessions · {new Set(rows.map(row => row.sectionId)).size} sections</p>
    {view === 'today' && date === localDate() && <div className="tt-live-summary"><article><strong>{current.map(row => row.subjectName).join(', ') || 'No current class'}</strong><span>Current class</span></article><article><strong>{next ? `${next.subjectName} · ${next.startTime.slice(0, 5)}` : 'No upcoming class'}</strong><span>Next class</span></article></div>}
    {view === 'today' ? <div className="tt-faculty-agenda">{rows.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(row => <button className="tt-class" key={`${row.origin}-${row.id}`} onClick={() => inspect?.(row)}><strong>{row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)} · {row.subjectName}</strong><span>{branchNames(row)} · {row.classroom}</span></button>)}{!rows.length && <p>No published classes on this date. Holidays and non-working days are skipped.</p>}</div> : <TimetableGrid rows={rows} inspect={inspect} occupancy />}
    {view === 'today' && <small>{weekday(date)} · Published weekly templates</small>}
  </section>
}
// #endregion pages/timetable/FacultyTimetable.jsx
return {
  get default() { return FacultyTimetable; }
};
})();

export const TimetableManagementModule = (() => {
const { useEffect } = external0;
const { useState } = external0;
const { Navigate } = external1;
const { default: DashboardLayout } = DashboardLayoutModule;
const { getUserRole } = authModule;
const { showToast } = toastModule;
const { backendWorkflow } = timetableBackendWorkflowModule;
const { loadBackendWorkflow } = timetableBackendWorkflowModule;
const { timetableService } = timetableServiceModule;
const { loadLive } = timetableWorkflowServiceModule;
const { resolveMyFaculty } = timetableWorkflowServiceModule;
const { workflowAdapter } = timetableWorkflowServiceModule;
const { draftCapabilityEnabled } = timetableWorkflowServiceModule;
const { saveBackendEntry } = timetableWorkflowServiceModule;
const { academicLevel } = timetableDomainModule;
const { decorateEntries } = timetableDomainModule;
const { tableEntries } = timetableDomainModule;
const { same } = timetableUtilsModule;
const { publicationState } = timetableUtilsModule;
const { existingSlots } = timetableUtilsModule;
const { DAYS } = timetableUtilsModule;
const { roomOptions } = timetablePlannerModule;
const { localDate } = timetablePlannerModule;
const { classesOnDate } = timetablePlannerModule;
const { default: TimetableBuilder } = TimetableBuilderModule;
const { default: TimetableDashboard } = TimetableDashboardModule;
const { default: FacultyTimetable } = FacultyTimetableModule;
const { default: WorkspaceDrawer } = WorkspaceDrawerModule;
const { TimetableSelect } = TimetableComponentsModule;
/* Imports for isolated regression tests:
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import { getUserRole } from '../../auth/auth'
import { showToast } from '../../utils/toast'
import { backendWorkflow, loadBackendWorkflow } from '../../services/timetable/timetableBackendWorkflow'
import { timetableService } from '../../services/timetableService'
import { loadLive, resolveMyFaculty, workflowAdapter, draftCapabilityEnabled, saveBackendEntry } from '../../services/timetable/timetableWorkflowService'
import { academicLevel, decorateEntries, tableEntries } from '../../services/timetable/timetableDomain'
import { same, publicationState, existingSlots, DAYS } from '../../utils/timetableUtils'
import { roomOptions, localDate, classesOnDate } from '../../utils/timetablePlanner'
import TimetableBuilder from './TimetableBuilder'
import TimetableDashboard from './TimetableDashboard'
import FacultyTimetable from './FacultyTimetable'
import WorkspaceDrawer from './WorkspaceDrawer'
import { TimetableSelect } from './TimetableComponents'
import './TimetableManagement.css'
import './TimetableWorkflow.css'
*/
// #region pages/timetable/TimetableManagement.jsx
function backendTables(backend, sources) {
  const groups = new Map()
  for (const row of decorateEntries(backend, sources)) {
    if (!row.timetableId) continue
    const id = String(row.timetableId)
    if (!groups.has(id)) {
      const branch = sources.branches.find(item => same(item.id, row.branchId))
      const semester = sources.semesters.find(item => same(item.id, row.semesterId))
      const periods = existingSlots(backend, row.timetableId).map((slot, index) => ({ ...slot, name: `P${index + 1}`, type: 'class' }))
      groups.set(id, { ...row, id, name: row.timetableName || `${branch?.name || 'Timetable'} / ${row.sectionName}`, level: academicLevel(semester || {}), departmentId: branch?.departmentId || '', publicationStatus: publicationState(row), origin: 'backend', entries: [], planning: { periods, requirements: {}, rooms: roomOptions(sources, backend).map(room => room.value), calendar: { startDate: row.effectiveFrom?.slice(0, 10) || '', endDate: row.effectiveTo?.slice(0, 10) || '', workingDays: DAYS, holidays: [], reviewed: true } } })
    }
    groups.get(id).entries.push(row)
  }
  return [...groups.values()]
}

/* export default */ function TimetableManagement() {
  const role = getUserRole(), admin = role === 'admin'
  const [tab, setTab] = useState(admin ? 'dashboard' : 'faculty'), [data, setData] = useState(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [initial, setInitial] = useState(null), [builderKey, setBuilderKey] = useState(0), [facultyId, setFacultyId] = useState(''), [facultyDrawer, setFacultyDrawer] = useState(''), [facultyError, setFacultyError] = useState('')
  const adapter = () => draftCapabilityEnabled ? workflowAdapter() : backendWorkflow
  const refresh = async () => {
    if (!draftCapabilityEnabled) { const live = await loadBackendWorkflow(); setData(live); return live }
    const live = await loadLive()
    const tables = draftCapabilityEnabled ? await workflowAdapter().list() : []
    setData({ ...live, tables })
    return live
  }
  useEffect(() => {
    if (!['admin', 'faculty'].includes(role)) return
    let cancelled = false
    Promise.resolve().then(refresh).then(async live => {
      if (role === 'faculty') {
        try { const id = await resolveMyFaculty(live.sources); if (!cancelled) setFacultyId(id) }
        catch (reason) { if (!cancelled) setFacultyError(reason.message) }
      }
    }).catch(reason => { if (!cancelled) { setError(reason.message); showToast(reason.message, 'error') } }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [role])
  const mutate = async (action, successMessage = 'Timetable saved.') => {
    setBusy(true); setError('')
    try { const result = await action(); await refresh(); showToast(successMessage, 'success'); return result || true }
    catch (reason) { try { await refresh() } catch { setData(null) }; setError(reason.message); showToast(reason.message, 'error'); throw reason }
    finally { setBusy(false) }
  }
  const run = async (action, successMessage) => { try { return await mutate(action, successMessage) } catch { return null } }
  const validate = async tables => {
    setBusy(true); setError('')
    try { const issues = await adapter().validate(tables); const blocking = issues.filter(issue => issue.blocking !== false).length; showToast(blocking ? `Validation found ${blocking} blocking issue(s).` : issues.length ? `Validation passed with ${issues.length} warning(s).` : 'Validation passed.', blocking ? 'warning' : issues.length ? 'warning' : 'success'); return issues }
    catch (reason) { setError(reason.message); showToast(reason.message, 'error'); return null }
    finally { setBusy(false) }
  }
  if (!['admin', 'faculty'].includes(role)) return <Navigate to="/unauthorized" replace />
  const sources = data?.sources
  const tables = data ? draftCapabilityEnabled ? [...data.tables, ...backendTables(data.backend, sources)] : data.tables : []
  const entries = data ? decorateEntries([...data.backend.map(row => ({ ...row, origin: 'backend' })), ...(draftCapabilityEnabled ? tableEntries(data.tables) : [])], sources) : []
  const published = entries.filter(row => publicationState(row) === 'published')
  const today = data ? classesOnDate(published, localDate(), row => tables.find(table => same(table.id, row.timetableId))?.planning.calendar) : []
  const open = table => { setInitial(table || null); setBuilderKey(value => value + 1); setTab('builder') }
  return <DashboardLayout><main className="tt-page tt-workflow"><header className="tt-page-header"><div><h1>{admin ? 'Timetable Management' : 'My Timetable'}</h1><p>{admin ? 'Plan, review and publish section timetables.' : 'Your published teaching schedule.'}</p></div></header>
    {admin && <nav className="tt-actions" aria-label="Timetable navigation">{[['dashboard', 'Timetable Dashboard'], ['builder', 'Timetable Builder'], ['faculty', 'Faculty My Timetable']].map(([value, label]) => <button className={`tt-button ${tab === value ? 'tt-primary' : ''}`} key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</nav>}
    {error && <p className="tt-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading academic data and timetables...</p> : data && <>
      {admin && draftCapabilityEnabled && <p className="tt-adapter-note"><strong>Mock Mode:</strong> timetable drafts and publication state are stored only in this browser. Academic records and allocations use the backend; this is not institution-wide publication.</p>}
      {admin && tab === 'dashboard' && <TimetableDashboard tables={tables} sources={sources} entries={entries} today={today} open={open} />}
      {admin && tab === 'builder' && <><button className="tt-button" disabled={busy} onClick={() => open(null)}>Create New Timetable Period</button><TimetableBuilder mockMode={draftCapabilityEnabled} key={builderKey} sources={sources} entries={entries} tables={tables} initial={initial} busy={busy} enabled={true} refresh={refresh} faculty={setFacultyDrawer} generate={args => run(() => adapter().generate(args))} saveSetup={(tables, config) => run(() => adapter().saveSetup(tables, config))} save={(table, form) => mutate(() => draftCapabilityEnabled ? table.origin === 'backend' ? saveBackendEntry(table, form) : workflowAdapter().saveEntry(table, form) : backendWorkflow.saveEntry(table, form))} remove={(table, id) => mutate(() => draftCapabilityEnabled ? table.origin === 'backend' ? timetableService.remove(id) : workflowAdapter().removeEntry(table, id) : backendWorkflow.removeEntry(table, id))} validate={validate} publish={expected => run(() => adapter().publish(expected), draftCapabilityEnabled ? 'Mock Mode: timetable published in this browser only.' : 'Timetable published.')} reopen={table => run(() => adapter().reopen(table))} /></>}
      {tab === 'faculty' && <section className="tt-card">{admin && <div className="tt-clean-step"><TimetableSelect label="Faculty" value={facultyId} options={sources.faculty} onChange={setFacultyId} /></div>}{facultyError && <p className="tt-error" role="alert">{facultyError}</p>}{facultyId ? <FacultyTimetable key={facultyId} facultyId={facultyId} sources={sources} entries={entries} tables={tables} /> : !facultyError && <p className="tt-clean-step">Select a faculty member to view published classes.</p>}</section>}
      {facultyDrawer && <WorkspaceDrawer title="Faculty schedule" close={() => setFacultyDrawer('')}><FacultyTimetable facultyId={facultyDrawer} sources={sources} entries={entries} tables={tables} /></WorkspaceDrawer>}
    </>}
  </main></DashboardLayout>
}
// #endregion pages/timetable/TimetableManagement.jsx
return {
  get default() { return TimetableManagement; }
};
})();

export function AcademicContextBarModule() {
const { FiFilter } = external3;
const { default: WorkspaceDrawer } = WorkspaceDrawerModule;
/* Imports for isolated regression tests:
import { FiFilter } from 'react-icons/fi'
import WorkspaceDrawer from './WorkspaceDrawer'
*/
// #region pages/timetable/AcademicContextBar.jsx
/* export default */ function AcademicContextBar({ children, summary, open, setOpen }) {
  return <div className="tt-context-bar">
    <div className="tt-context-desktop">{children}</div>
    <button type="button" className="tt-button tt-context-toggle" aria-expanded={open} onClick={() => setOpen(true)}><FiFilter /> Academic context</button>
    <p className="tt-context-summary" title={summary}>{summary || 'Select an academic context to begin'}</p>
    {open && <WorkspaceDrawer title="Academic context" close={() => setOpen(false)} footer={<button className="tt-button tt-primary" onClick={() => setOpen(false)}>Apply context</button>}>{children}</WorkspaceDrawer>}
  </div>
}
// #endregion pages/timetable/AcademicContextBar.jsx
return {
  get default() { return AcademicContextBar; }
};
}

export function AcademicSetupStepModule() {
const { calendarBounds } = timetablePlannerModule;
/* Imports for isolated regression tests:
import { calendarBounds } from '../../utils/timetablePlanner'
*/
// #region pages/timetable/AcademicSetupStep.jsx
/* export default */ function AcademicSetupStep({ fields, scope, sources, valid, busy, existing, next }) {
  const bounds = calendarBounds(sources, scope)
  return <section className="tt-academic-step" aria-label="Academic Setup">
    <h2>Choose your academic context</h2>
    <p>Choose the section once. Every class will use this academic mapping.</p>
    {fields}
    <div className="tt-setup-dates"><span>Semester Reference Period</span><strong>{bounds.startDate || 'Start date not supplied'} - {bounds.endDate || 'End date not supplied'}</strong><small>Reference dates are informational. Timetable validity is configured independently in the next step.</small></div>
    <footer><button className="tt-button tt-primary" disabled={busy || !valid} onClick={next}>{existing ? 'Open Timetable' : 'Continue to Period Setup'}</button></footer>
  </section>
}
// #endregion pages/timetable/AcademicSetupStep.jsx
return {
  get default() { return AcademicSetupStep; }
};
}

export function TimetablePlannerModule() {
const { subjectRequirements } = timetablePlannerModule;
const { schedulingIssues } = timetablePlannerModule;
const { key } = timetableUtilsModule;
/* Imports for isolated regression tests:
import { subjectRequirements, schedulingIssues } from '../../utils/timetablePlanner'
import { key } from '../../utils/timetableUtils'
*/
// #region pages/timetable/TimetablePlanner.jsx
/* export */ function SchedulingIssues({ issues = [], assign }) {
  if (!issues.length) return null
  return <section className="tt-card tt-issues" aria-label="Scheduling issues"><h2>Unscheduled / Attention Needed</h2><ul>{issues.map((item, index) => <li key={`${item.subjectId}-${index}`}><strong>{item.subjectName}</strong><span>{item.reason}</span>{assign && item.subjectId && <button className="tt-button" onClick={() => assign(item.subjectId)}>Assign manually</button>}</li>)}</ul></section>
}

/* export default */ function TimetablePlanner({ scope, sources, table, busy, frequency, setFrequency, assign }) {
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
// #endregion pages/timetable/TimetablePlanner.jsx
return {
  get SchedulingIssues() { return SchedulingIssues; },
  get default() { return TimetablePlanner; }
};
}

export const WorkspaceDrawer = WorkspaceDrawerModule.default;
export const TimetableGrid = TimetableGridModule.default;
export const TimetableComponents = TimetableComponentsModule.default;
export const PeriodSetupStep = PeriodSetupStepModule.default;
export const SubjectCoverage = SubjectCoverageModule.default;
export const TimetableWorkspace = TimetableWorkspaceModule.default;
export const TimetableBuilder = TimetableBuilderModule.default;
export const TimetableDashboard = TimetableDashboardModule.default;
export const FacultyTimetable = FacultyTimetableModule.default;
export const TimetableManagement = TimetableManagementModule.default;
