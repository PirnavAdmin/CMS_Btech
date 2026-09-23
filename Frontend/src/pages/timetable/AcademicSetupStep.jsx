import { calendarBounds } from '../../utils/timetablePlanner'

export default function AcademicSetupStep({ fields, scope, sources, valid, busy, existing, next }) {
  const bounds = calendarBounds(sources, scope)
  return <section className="tt-academic-step" aria-label="Academic Setup">
    <h2>Choose your academic context</h2>
    <p>Choose the section once. Every class will use this academic mapping.</p>
    {fields}
    <div className="tt-setup-dates"><span>Available dates</span><strong>{bounds.startDate || 'Start date not supplied'} — {bounds.endDate || 'End date not supplied'}</strong><small>Academic year and semester date ranges are combined. Approved working days and holidays are reviewed in the next step.</small></div>
    <footer><button className="tt-button tt-primary" disabled={busy || !valid} onClick={next}>{existing ? 'Open Timetable' : 'Continue to Period Setup'}</button></footer>
  </section>
}
