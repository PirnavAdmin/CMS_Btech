import { dailyPeriods, DAILY_PERIOD_SETUP } from '../../utils/timetablePeriods'
import { calendarBounds, roomOptions, WEEKDAYS } from '../../utils/timetablePlanner'

export default function PeriodSetupStep({ config, setConfig, sources, scope, entries, busy, errors, back, continueSetup }) {
  const settings = config.automatic || DAILY_PERIOD_SETUP
  const bounds = calendarBounds(sources, scope), rooms = roomOptions(sources, entries)
  const rebuild = (field, value) => setConfig(old => {
    const automatic = { ...old.automatic, [field]: value }
    const result = dailyPeriods(automatic, old.periods)
    return { ...old, automatic, periods: result.periods, automaticErrors: result.errors }
  })
  const calendar = (field, value) => setConfig(old => ({ ...old, calendar: { ...old.calendar, [field]: value, reviewed: true } }))
  return <section className="tt-card tt-clean-step" aria-label="Daily Schedule Setup">
    <h2>Common daily schedule</h2><p>These timings apply to every selected section.</p>
    <div className="tt-period-layout"><fieldset className="tt-period-controls" disabled={busy}>
      <div className="tt-form-grid">{[['startTime', 'College Start Time', 'time'], ['periodsPerDay', 'Periods Per Day', 'number'], ['duration', 'Period Duration (minutes)', 'number'], ['breakDuration', 'Short Break (minutes, 0 to disable)', 'number'], ['breakAfter', 'Break after period', 'number'], ['lunchDuration', 'Lunch (minutes, 0 to disable)', 'number'], ['lunchAfter', 'Lunch after period', 'number']].map(([field, label, type]) => <label className="tt-field" key={field}><span>{label}</span><input type={type} min={field.includes('Duration') ? 0 : 1} step={1} value={settings[field]} onChange={event => rebuild(field, event.target.value)} /></label>)}</div>
      <h3>Working days</h3><div className="tt-checks">{WEEKDAYS.map(day => <label key={day}><input type="checkbox" checked={config.calendar.workingDays.includes(day)} onChange={event => calendar('workingDays', event.target.checked ? WEEKDAYS.filter(value => value === day || config.calendar.workingDays.includes(value)) : config.calendar.workingDays.filter(value => value !== day))} />{day.slice(0, 3)}</label>)}</div>
      <div className="tt-form-grid">{[['startDate', 'Timetable Start Date'], ['endDate', 'Timetable End Date']].map(([field, label]) => <label className="tt-field" key={field}><span>{label}</span><input type="date" min={bounds.startDate || undefined} max={bounds.endDate || undefined} value={config.calendar[field]} onChange={event => calendar(field, event.target.value)} /></label>)}</div>
      <details><summary>Available rooms ({config.rooms.length})</summary><div className="tt-checks">{rooms.map(room => <label key={room.value}><input type="checkbox" checked={config.rooms.includes(room.value)} onChange={event => setConfig(old => ({ ...old, rooms: event.target.checked ? [...old.rooms, room.value] : old.rooms.filter(value => value !== room.value) }))} />{room.name}</label>)}</div>{!rooms.length && <p>No room references were supplied by sections or existing timetable entries. Configure a section room in Section Management.</p>}</details>
    </fieldset><div className="tt-period-preview"><h3>Live preview</h3><p>College End Time: <strong>{config.periods.at(-1)?.endTime || 'Check settings'}</strong></p><table><thead><tr><th>Period</th><th>Start</th><th>End</th></tr></thead><tbody>{config.periods.map(period => <tr className={`tt-period-${period.type}`} key={period.id}><th>{period.name}</th><td>{period.startTime}</td><td>{period.endTime}</td></tr>)}</tbody></table></div></div>
    {errors.length > 0 && <div className="tt-error" role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
    <footer className="tt-actions"><button className="tt-button" onClick={back}>Back</button><button className="tt-button tt-primary" disabled={busy || Boolean(errors.length)} onClick={continueSetup}>Continue to Subjects</button></footer>
  </section>
}
