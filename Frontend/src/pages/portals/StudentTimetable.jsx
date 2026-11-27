import { useEffect, useState } from 'react'
import { profileApi, timetableManagementApi } from '../../api/apiEndpoints'
import './student-timetable.css'

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const value = v => v == null || v === '' ? 'Not available' : v
const isLab = row => /LAB|PRACTICAL|WORKSHOP/i.test(row.entryType || '')

export default function StudentTimetable() {
  const [state, setState] = useState({ loading: true })
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('class')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setState({ loading: true })
    Promise.all([profileApi.getProfile(), timetableManagementApi.get('/views/me')]).then(([profile, rows]) => {
      if (!Array.isArray(rows)) throw new Error('The timetable response was incomplete.')
      if (active) setState({ profile, rows, loading: false })
    }).catch(error => { if (active) setState({ loading: false, error: error.message || 'Unable to load your timetable.' }) })
    return () => { active = false }
  }, [retry])
  const rows = state.rows || []
  const search = query.trim().toLowerCase()
  const ownId = String(state.profile?.registrationNumber || state.profile?.identifier || '').toLowerCase()
  const matchId = search && ownId === search
  const matches = rows.filter(row => !search || matchId || [row.subjectName, row.subjectCode].some(v => String(v || '').toLowerCase().includes(search)))
  const filtered = matches.filter(row => days.includes(String(row.dayOfWeek).toUpperCase()) && (tab === 'lab' ? isLab(row) : !isLab(row)))
    .sort((a, b) => days.indexOf(String(a.dayOfWeek).toUpperCase()) - days.indexOf(String(b.dayOfWeek).toUpperCase()) || Number(a.slotNumber) - Number(b.slotNumber))
  const now = new Date()
  const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const todays = rows.filter(row => String(row.dayOfWeek).toUpperCase() === today)
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const next = todays.filter(row => String(row.startTime) > clock).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))[0]
  const p = state.profile || {}
  return <main className="portal-page student-dashboard student-timetable"><header><h1>My Timetable</h1><p>View your published class and lab schedule.</p></header>
    {state.loading ? <p role="status">Loading timetable…</p> : state.error ? <div role="alert">{state.error} <button onClick={() => setRetry(n => n + 1)}>Retry</button></div> : <>
      <div className="st-search"><label htmlFor="student-timetable-search">Search timetable</label><input id="student-timetable-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by Student ID or Subject Name or Subject Code" />{query && <button onClick={() => setQuery('')}>Clear search</button>}</div>
      <dl className="st-details">{[['Student', p.fullName], ['Registration ID', p.registrationNumber || p.identifier], ['Department', p.department], ['Course', p.course], ['Branch', p.branch], ['Academic year', p.academicYear], ['Semester', p.semester], ['Section', p.section]].map(([label, item]) => <div key={label}><dt>{label}</dt><dd>{value(item)}</dd></div>)}</dl>
      <section className="st-metrics" aria-label="Timetable summary"><article><span>Today's Classes</span><strong>{todays.length}</strong></article><article><span>Total Subjects</span><strong>{new Set(rows.map(r => r.subjectId).filter(Boolean)).size}</strong></article><article><span>Next Class Today</span><strong>{next ? value(next.subjectName) : 'None scheduled'}</strong></article><article><span>Free Periods</span><strong>Not available</strong></article></section>
      <div className="st-actions"><div role="tablist" aria-label="Timetable type">{[['class', 'Class Timetable'], ['lab', 'Lab Timetable'], ['exam', 'Exam Schedule']].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div><button onClick={() => window.print()}>Print Timetable / Save as PDF</button></div>
      {tab === 'exam' ? <p className="student-empty">Exam schedule information is not available yet.</p> : filtered.length ? <div className="st-scroll"><table><thead><tr>{(tab === 'lab' ? ['Day', 'Lab Session', 'Start Time', 'End Time', 'Lab Subject Name', 'Lab Name', 'Lab Room Number', 'Faculty Name'] : ['Day', 'Period Number', 'Start Time', 'End Time', 'Subject Name', 'Subject Code', 'Faculty Name', 'Classroom Number']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map((r, i) => <tr key={r.timetableEntryId ?? i}><td>{value(r.dayOfWeek)}</td><td>{value(tab === 'lab' ? (r.slotName || r.slotNumber) : r.slotNumber)}</td><td>{value(r.startTime)}</td><td>{value(r.endTime)}</td><td>{search && !matchId ? <mark>{value(r.subjectName)}</mark> : value(r.subjectName)}</td>{tab === 'lab' ? <><td>{value(r.classroomName)}</td><td>{value(r.classroomCode)}</td><td>{value(r.facultyName)}</td></> : <><td>{search && !matchId ? <mark>{value(r.subjectCode)}</mark> : value(r.subjectCode)}</td><td>{value(r.facultyName)}</td><td>{value(r.classroomCode || r.classroomName)}</td></>}</tr>)}</tbody></table></div> : <p className="student-empty" role="status">No Records Found</p>}
    </>}
  </main>
}
