import { useState } from 'react'
import { same } from '../../utils/timetableUtils'
import { localDate, weekday } from '../../utils/timetablePlanner'
import { publishedForFaculty } from '../../services/timetable/timetableDomain'
import TimetableGrid from './TimetableGrid'

export default function FacultyTimetable({ facultyId, sources, entries, tables, inspect }) {
  const [view, setView] = useState('today'), [date, setDate] = useState(localDate())
  const faculty = sources.faculty.find(row => same(row.id, facultyId))
  const rows = publishedForFaculty(facultyId, entries, tables, view === 'today' ? date : undefined)
  return <section className="tt-clean-step"><h2>{faculty?.name || 'My Timetable'}</h2><div className="tt-actions">{['today', 'week'].map(value => <button key={value} className={`tt-button ${view === value ? 'tt-primary' : ''}`} aria-pressed={view === value} onClick={() => setView(value)}>{value === 'today' ? 'Today' : 'Week'}</button>)}{view === 'today' && <label className="tt-field"><span>Schedule date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>}</div><p>{rows.length} teaching sessions · {new Set(rows.map(row => row.sectionId)).size} sections</p>
    {view === 'today' ? <div className="tt-faculty-agenda">{rows.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(row => <button className="tt-class" key={`${row.origin}-${row.id}`} onClick={() => inspect?.(row)}><strong>{row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)} · {row.subjectName}</strong><span>{row.sectionName} · {row.classroom}</span></button>)}{!rows.length && <p>No published classes on this date. Holidays and non-working days are skipped.</p>}</div> : <TimetableGrid rows={rows} inspect={inspect} occupancy />}
    {view === 'today' && <small>{weekday(date)} · Published weekly templates</small>}
  </section>
}
