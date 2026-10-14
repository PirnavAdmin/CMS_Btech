import { calendarBounds } from '../../utils/timetablePlanner'

export default function AcademicSetupStep({ fields, scope, sources, valid, busy, existing, next }) {
  const bounds = calendarBounds(sources, scope)
  return <section className="tt-academic-step" aria-label="Academic Setup">
    <h2>Choose your academic context</h2>
    <p>Choose the section once. Every class will use this academic mapping.</p>
    {fields}
    <div className="tt-setup-dates"><span>Semester Reference Period</span><strong>{bounds.startDate || 'Start date not supplied'} - {bounds.endDate || 'End date not supplied'}</strong><small>Reference dates are informational. Timetable validity is configured independently in the next step.</small></div>
    <footer><button className="tt-button tt-primary" disabled={busy || !valid} onClick={next}>{existing ? 'Open Timetable' : 'Continue to Period Setup'}</button></footer>
  </section>
}
