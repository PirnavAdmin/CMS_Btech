import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2 } from 'react-icons/fi'
import { automaticPeriods, DEFAULT_PERIOD_SETUP, periodLabel, periodType, teachingPeriods } from '../../utils/timetablePeriods'
import { calendarBounds, roomOptions, WEEKDAYS } from '../../utils/timetablePlanner'

export default function PeriodSetupStep({ config, setConfig, sources, scope, entries, busy, readOnly, errors, back, continueSetup }) {
  const settings = config.automatic || DEFAULT_PERIOD_SETUP
  const automatic = config.periodMode !== 'manual'
  const bounds = calendarBounds(sources, scope), rooms = roomOptions(sources, entries)
  const changeCalendar = (field, value) => setConfig(old => ({ ...old, calendar: { ...old.calendar, [field]: value, ...(field === 'reviewed' ? {} : { reviewed: false }) } }))
  const rebuild = next => {
    const result = automaticPeriods(next, config.periods)
    setConfig(old => ({ ...old, automatic: next, periods: result.periods, automaticErrors: result.errors, unusedMinutes: result.unusedMinutes, adjusted: false }))
  }
  const edit = (id, field, value) => setConfig(old => ({ ...old, adjusted: true, periods: old.periods.map(row => row.id === id ? { ...row, [field]: value } : row) }))
  const move = (index, offset) => setConfig(old => {
    const periods = [...old.periods]
    ;[periods[index], periods[index + offset]] = [periods[index + offset], periods[index]]
    return { ...old, periods, adjusted: true }
  })
  return <section className="tt-period-step" aria-label="Period Setup">
    <div className="tt-period-step-heading"><div><h2>Build your college day</h2><p>Review the live preview, then continue to the timetable.</p></div><div className="tt-mode-switch" role="group" aria-label="Period setup mode">{['automatic', 'manual'].map(mode => <button key={mode} className={(automatic ? 'automatic' : 'manual') === mode ? 'active' : ''} aria-pressed={(automatic ? 'automatic' : 'manual') === mode} disabled={busy || readOnly} onClick={() => setConfig(old => ({ ...old, periodMode: mode }))}>{mode === 'automatic' ? 'Automatic Setup' : 'Manual Setup'}</button>)}</div></div>
    <div className="tt-period-layout">
      <fieldset className="tt-period-controls" disabled={busy || readOnly}>
        {automatic && <><div className="tt-form-grid">{[['startTime', 'College Start Time', 'time'], ['endTime', 'College End Time', 'time'], ['duration', 'Period Duration (minutes)', 'number'], ['breakDuration', 'Break Duration (minutes)', 'number'], ['lunchDuration', 'Lunch Duration (minutes)', 'number']].map(([field, label, type]) => <label key={field} className="tt-field"><span>{label}</span><input type={type} min={field === 'duration' ? 1 : 0} step={type === 'number' ? 1 : undefined} value={settings[field]} onChange={event => rebuild({ ...settings, [field]: event.target.value })} /></label>)}</div>
          <details><summary>Break / lunch placement</summary><div className="tt-form-grid">{[['breakAfter', 'Break after teaching period'], ['lunchAfter', 'Lunch after teaching period']].map(([field, label]) => <label key={field} className="tt-field"><span>{label}</span><input type="number" min="1" step="1" value={settings[field]} onChange={event => rebuild({ ...settings, [field]: event.target.value })} /></label>)}</div></details>
          {config.adjusted && <p className="tt-hint">Preview adjusted. Changing automatic inputs rebuilds it. <button type="button" className="tt-text-button" onClick={() => rebuild(settings)}>Rebuild preview</button></p>}
        </>}
        <h3>Working Days</h3><div className="tt-checks" role="group" aria-label="Working weekdays">{WEEKDAYS.map(day => <label key={day}><input type="checkbox" checked={config.calendar.workingDays.includes(day)} onChange={event => changeCalendar('workingDays', event.target.checked ? [...config.calendar.workingDays, day] : config.calendar.workingDays.filter(value => value !== day))} />{day.slice(0, 3)}</label>)}</div>
        <details className="tt-calendar-settings"><summary>Calendar & holidays</summary><p className="tt-hint">No holiday/calendar API is available. Enter approved exceptions here; the weekly template remains unchanged.</p><div className="tt-form-grid">{[['startDate', 'Timetable Start Date'], ['endDate', 'Timetable End Date']].map(([field, label]) => <label key={field} className="tt-field"><span>{label}</span><input type="date" min={bounds.startDate || undefined} max={bounds.endDate || undefined} value={config.calendar[field]} onChange={event => changeCalendar(field, event.target.value)} /></label>)}</div><label className="tt-field"><span>Holidays / Non-working Dates</span><textarea rows={3} placeholder="YYYY-MM-DD, one date per line" value={config.calendar.holidays.join('\n')} onChange={event => changeCalendar('holidays', event.target.value.split(/[\n,]/).map(value => value.trim()))} onBlur={() => changeCalendar('holidays', config.calendar.holidays.filter(Boolean))} /></label></details>
        <p className="tt-hint">{config.calendar.startDate || 'Start date needed'} — {config.calendar.endDate || 'End date needed'} · {config.calendar.holidays.filter(Boolean).length} holiday exceptions</p>
        <label className="tt-check"><input type="checkbox" checked={config.calendar.reviewed} onChange={event => changeCalendar('reviewed', event.target.checked)} />I have reviewed the working days and holiday dates.</label>
        <details><summary>Rooms ({config.rooms.length})</summary><p className="tt-hint">Available references from Sections and existing classes are selected automatically. No room master API is available.</p><div className="tt-checks">{rooms.map(room => <label key={room.value}><input type="checkbox" checked={config.rooms.includes(room.value)} onChange={event => setConfig(old => ({ ...old, rooms: event.target.checked ? [...old.rooms, room.value] : old.rooms.filter(value => value !== room.value) }))} />{room.name}</label>)}</div></details>
      </fieldset>
      <section className="tt-period-preview" aria-label="Period preview"><div className="tt-card-heading"><strong>Live preview · {teachingPeriods(config.periods).length} teaching periods/day</strong><button className="tt-button" disabled={busy || readOnly} onClick={() => setConfig(old => ({ ...old, adjusted: true, periods: [...old.periods, { id: crypto.randomUUID(), name: '', startTime: '', endTime: '', type: 'class', source: 'local' }] }))}><FiPlus /> Add Period</button></div>
        <div className="tt-period-preview-scroll"><table><thead><tr><th>Name</th><th>Start</th><th>End</th><th>Type</th><th>Actions</th></tr></thead><tbody>{config.periods.map((period, index) => <tr key={period.id} className={`tt-period-${periodType(period)}`}>
          <td><input aria-label={`Period ${index + 1} name`} maxLength={40} value={period.name ?? periodLabel(period, index)} disabled={busy || readOnly} onChange={event => edit(period.id, 'name', event.target.value)} /></td>
          <td><input type="time" aria-label={`Period ${index + 1} start`} value={period.startTime.slice(0, 5)} disabled={busy || readOnly} onChange={event => edit(period.id, 'startTime', event.target.value)} /></td>
          <td><input type="time" aria-label={`Period ${index + 1} end`} value={period.endTime.slice(0, 5)} disabled={busy || readOnly} onChange={event => edit(period.id, 'endTime', event.target.value)} /></td>
          <td><select aria-label={`Period ${index + 1} type`} value={periodType(period)} disabled={busy || readOnly} onChange={event => edit(period.id, 'type', event.target.value)}><option value="class">Class</option><option value="break">Break</option><option value="lunch">Lunch</option></select></td>
          <td><div className="tt-period-row-actions"><button className="tt-icon-button" aria-label={`Move period ${index + 1} up`} disabled={busy || readOnly || !index} onClick={() => move(index, -1)}><FiArrowUp /></button><button className="tt-icon-button" aria-label={`Move period ${index + 1} down`} disabled={busy || readOnly || index === config.periods.length - 1} onClick={() => move(index, 1)}><FiArrowDown /></button><button className="tt-icon-button" aria-label={`Delete period ${index + 1}`} disabled={busy || readOnly} onClick={() => setConfig(old => ({ ...old, adjusted: true, periods: old.periods.filter(row => row.id !== period.id) }))}><FiTrash2 /></button></div></td>
        </tr>)}</tbody></table></div>
        {automatic && config.unusedMinutes > 0 && !config.adjusted && <p className="tt-hint">{config.unusedMinutes} minutes before closing remain unassigned. No shortened teaching period was added.</p>}
      </section>
    </div>
    <div className="tt-step-footer">{errors.length > 0 && <details className="tt-setup-errors"><summary>{errors.length} setup items to review</summary><ul>{errors.map(message => <li key={message}>{message}</li>)}</ul></details>}<div className="tt-actions"><button className="tt-button" disabled={busy} onClick={back}>Back</button><button className="tt-button tt-primary" disabled={busy || readOnly || Boolean(errors.length)} onClick={continueSetup}>Continue to Generate & Manage</button></div></div>
  </section>
}
