import { useState } from 'react'
import { same } from '../../utils/timetableUtils'
import { localDate, weekday } from '../../utils/timetablePlanner'
import { publishedForFaculty } from '../../services/timetable/timetableDomain'
import TimetableGrid from './TimetableGrid'

export default function FacultyTimetable({ facultyId, sources, entries, tables, inspect }) {
  const [view, setView] = useState('today'), [date, setDate] = useState(localDate())
  const faculty = sources.faculty.find(row => same(row.id, facultyId))
  const rows = publishedForFaculty(facultyId, entries, tables, view === 'today' ? date : undefined)
  const branchNames = row => [sources.departments.find(item => same(item.id, sources.branches.find(branch => same(branch.id, row.branchId))?.departmentId))?.name, sources.branches.find(item => same(item.id, row.branchId))?.name, sources.semesters.find(item => same(item.id, row.semesterId))?.name, row.sectionName].filter(Boolean).join(' · ')
  const now = new Date(), nowMinutes = now.getHours() * 60 + now.getMinutes()
  const current = date === localDate() ? rows.filter(row => { const start = row.startTime.slice(0, 5).split(':').map(Number), end = row.endTime.slice(0, 5).split(':').map(Number); return start[0] * 60 + start[1] <= nowMinutes && end[0] * 60 + end[1] > nowMinutes }) : []
  const next = date === localDate() ? [...rows].filter(row => row.startTime.slice(0, 5).split(':').map(Number).reduce((hours, minutes) => hours * 60 + minutes) > nowMinutes).sort((a, b) => a.startTime.localeCompare(b.startTime))[0] : null
  return <section className="tt-clean-step"><h2>{faculty?.name || 'My Timetable'}</h2><p>{faculty?.employeeId ? `Employee ID: ${faculty.employeeId} · ` : ''}{sources.departments.find(row => same(row.id, faculty?.departmentId))?.name || 'Department unavailable'}</p><div className="tt-actions">{['today', 'week'].map(value => <button key={value} className={`tt-button ${view === value ? 'tt-primary' : ''}`} aria-pressed={view === value} onClick={() => setView(value)}>{value === 'today' ? 'Today' : 'Week'}</button>)}{view === 'today' && <label className="tt-field"><span>Schedule date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>}</div><p>{rows.length} teaching sessions · {new Set(rows.map(row => row.sectionId)).size} sections</p>
    {view === 'today' && date === localDate() && <div className="tt-live-summary"><article><strong>{current.map(row => row.subjectName).join(', ') || 'No current class'}</strong><span>Current class</span></article><article><strong>{next ? `${next.subjectName} · ${next.startTime.slice(0, 5)}` : 'No upcoming class'}</strong><span>Next class</span></article></div>}
    {view === 'today' ? <div className="tt-faculty-agenda">{rows.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(row => <button className="tt-class" key={`${row.origin}-${row.id}`} onClick={() => inspect?.(row)}><strong>{row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)} · {row.subjectName}</strong><span>{branchNames(row)} · {row.classroom}</span></button>)}{!rows.length && <p>No published classes on this date. Holidays and non-working days are skipped.</p>}</div> : <TimetableGrid rows={rows} inspect={inspect} occupancy />}
    {view === 'today' && <small>{weekday(date)} · Published weekly templates</small>}
  </section>
}
