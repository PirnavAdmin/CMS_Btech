import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCalendar, FiCheckCircle, FiAward, FiBarChart2, FiStar, FiArrowRight, FiBookOpen, FiClipboard, FiFileText, FiCreditCard, FiBell, FiClock } from 'react-icons/fi'
import { profileApi, timetableManagementApi } from '../../api/apiEndpoints'
import studentIllustration from '../../assets/student-dashboard-illustration.png'
import './student-dashboard.css'
import StudentTimetable from './StudentTimetable'

const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const display = value => value == null || String(value).trim() === '' ? 'Not available' : value

function Summary({ icon: Icon, title, value, description, to }) {
  const content = <><span className="student-metric-icon"><Icon aria-hidden="true" /></span><span className="live-metric-content"><span className="student-metric-label">{title}</span><strong>{value}</strong><small>{description}</small></span>{to && <FiArrowRight className="live-metric-arrow" aria-hidden="true" />}</>
  return to ? <Link className="student-metric-card" to={to}>{content}</Link> : <article className="student-metric-card">{content}</article>
}

function EmptyCard({ title, message, to, icon: Icon, action }) {
  return <section className="student-dashboard-card reference-info-card"><header className="student-section-heading"><h2>{title}</h2>{to && !action && <Link to={to}>View all</Link>}</header><div className="reference-empty-content">{Icon && <span className="reference-card-icon"><Icon aria-hidden="true" /></span>}<p className="student-empty">{message}</p></div>{to && action && <Link className="reference-card-action" to={to}>{action} <FiArrowRight aria-hidden="true" /></Link>}</section>
}

function FeeReminder() {
  return <section className="student-dashboard-card reference-fee-card" aria-labelledby="student-fee-reminder-title">
    <header className="student-section-heading"><h2 id="student-fee-reminder-title">Fee Reminder</h2></header>
    <div className="reference-fee-content"><div className="reference-fee-copy"><span>Next payment due</span><strong>Not available</strong><small>Payment details are not available yet.</small><Link className="reference-card-action" to="/student-portal/fees">View fee details <FiArrowRight aria-hidden="true" /></Link></div><span className="reference-fee-illustration" aria-hidden="true"><FiFileText /><FiCreditCard /></span></div>
  </section>
}

function ProgressOverview() {
  return <section className="student-dashboard-card live-progress"><header className="student-section-heading"><h2>Progress overview</h2><Link to="/student-portal/results">View detailed report</Link></header><div className="live-progress-grid">
    <div><h3>Overall academic performance</h3><div className="reference-progress-visual"><div className="reference-empty-ring" role="img" aria-label="Academic performance unavailable"><span>â€”<small>Unavailable</small></span></div><div className="reference-progress-copy"><strong>Subject performance</strong><div className="reference-empty-track" aria-hidden="true" /><p>No published performance data.</p></div></div></div>
    <div><h3>Monthly attendance trend</h3><div className="reference-empty-chart" role="img" aria-label="Monthly attendance history unavailable"><span>Attendance history is not available yet.</span></div></div>
    <div><h3>Grade distribution</h3><div className="reference-progress-visual"><div className="reference-empty-ring reference-empty-ring--small" role="img" aria-label="Grade distribution unavailable"><span>â€”</span></div><p>Grade data is not available yet.</p></div></div>
  </div></section>
}

export default function LiveStudentDashboard() {
  const [state, setState] = useState({ loading: true, profile: null, timetable: null, error: '', timetableError: '' })
  const [retry, setRetry] = useState(0)
  const load = useCallback(async (isActive) => {
    setState({ loading: true, profile: null, timetable: null, error: '', timetableError: '' })
    try {
      const profile = await profileApi.getProfile()
      if (!isActive()) return
      setState(current => ({ ...current, profile, loading: false }))
      if (!/^\d+$/.test(String(profile.studentId)) || Number(profile.studentId) < 1) {
        setState(current => ({ ...current, timetableError: 'Your student record is not linked to this account.' }))
        return
      }
      try {
        const rows = await timetableManagementApi.get('/views/me', { date: localDate(new Date()) })
        if (!Array.isArray(rows)) throw new Error('The timetable response was incomplete.')
        if (isActive()) setState(current => ({ ...current, timetable: rows }))
      } catch (error) {
        if (isActive()) setState(current => ({ ...current, timetableError: error.message || 'Could not load your timetable.' }))
      }
    } catch (error) {
      if (isActive()) setState(current => ({ ...current, loading: false, error: error.message || 'Could not load your profile.' }))
    }
  }, [])
  useEffect(() => { let active = true; load(() => active); return () => { active = false } }, [load, retry])
  if (state.loading) return <main className="portal-page"><p role="status">Loading your dashboardâ€¦</p></main>
  if (state.error) return <main className="portal-page"><div className="student-inline-error" role="alert"><span>{state.error}</span><button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div></main>
  const profile = state.profile
  const timetable = state.timetable?.slice().sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return <main className="portal-page student-dashboard live-student-dashboard">
    <div className="reference-dashboard-main">
    <header className="reference-dashboard-heading"><h1>Student Dashboard</h1><p>Here's what's happening in your academic journey today.</p></header>
    <section className="student-welcome live-student-welcome">
      <div className="student-welcome-copy"><p className="student-welcome-eyebrow">{greeting},</p><h1>{display(profile.fullName)}!</h1><p>Stay focused, keep learning,<br />and achieve your goals.</p><Link to="/student-portal/subjects">View my academics <span aria-hidden="true">â†’</span></Link></div>
      <img className="reference-student-illustration" src={studentIllustration} alt="" />
    </section>
    <section className="live-student-metrics" aria-label="Academic summary">
      <Summary icon={FiCalendar} title="Today's timetable" value={timetable ? timetable.length : 'Unavailable'} description={state.timetableError ? 'Unable to load timetable' : 'Classes scheduled today'} to="/student-portal/timetable" />
      <Summary icon={FiCheckCircle} title="Attendance percentage" value="Unavailable" description="Attendance data not available" to="/student-portal/attendance" />
      <Summary icon={FiStar} title="Overall grade" value="Unavailable" description="Grade not available" to="/student-portal/results" />
      <Summary icon={FiAward} title="Class rank" value="Unavailable" description="Rank not available" to="/student-portal/results" />
      <Summary icon={FiBarChart2} title="GPA" value="Unavailable" description="GPA not available" to="/student-portal/results" />
    </section>
    <div className="live-student-grid">
      <EmptyCard title="Subjects" message="Subject information is not available yet." to="/student-portal/subjects" icon={FiBookOpen} />
      <EmptyCard title="Assignment overview" message="Assignment information is not available yet." to="/student-portal/assignments" icon={FiClipboard} />
      <EmptyCard title="Exam schedule" message="Examination information is not available yet." to="/student-portal/exams" icon={FiCalendar} />
      <EmptyCard title="Study materials" message="Study materials are not available yet." to="/student-portal/materials" icon={FiFileText} />
    </div>
    <ProgressOverview />
    </div>
    <aside className="reference-dashboard-aside" aria-label="Today's information">
      <section className="student-dashboard-card live-student-timetable"><header className="student-section-heading"><h2>Today's timetable</h2></header><time className="reference-date">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}</time>
        {state.timetableError ? <p className="student-empty" role="alert">{state.timetableError}</p> : !timetable ? <p className="student-empty" role="status">Loading timetableâ€¦</p> : !timetable.length ? <p className="student-empty">No classes scheduled for today.</p> : <div className="student-class-list">{timetable.map((row, index) => <article className="student-class" key={row.timetableEntryId ?? index}><time>{display(row.startTime)}<span>{row.endTime || ''}</span></time><div><strong>{display(row.subjectName)}</strong><small>{row.facultyName || 'Faculty not listed'}</small><small>{row.classroomName || row.classroomCode || 'Room not listed'}</small></div></article>)}</div>}
        <Link className="student-card-link" to="/student-portal/timetable">View full timetable <FiArrowRight aria-hidden="true" /></Link>
      </section>
      <FeeReminder />
      <EmptyCard title="Teacher announcements" message="College notices are not available yet." to="/student-portal/notifications" icon={FiBell} />
      <EmptyCard title="Upcoming tasks" message="Upcoming tasks are not available yet." to="/student-portal/assignments" icon={FiClock} />
    </aside>
  </main>
}

export function LiveStudentModule({ screen, title }) {
  if (screen === 'timetable') return <StudentTimetable />
  return <OtherStudentModule screen={screen} title={title} />
}

function OtherStudentModule({ screen, title }) {
  const [state, setState] = useState({ loading: true, profile: null, timetable: null, error: '' })
  const [dayFilter, setDayFilter] = useState('all')
  useEffect(() => {
    let active = true
    setState({ loading: true, profile: null, timetable: null, error: '' })
    profileApi.getProfile().then(async profile => {
      if (!active) return
      if (screen !== 'timetable') { setState({ loading: false, profile, timetable: null, error: '' }); return }
      if (!/^\d+$/.test(String(profile.studentId)) || Number(profile.studentId) < 1) throw new Error('Your student record is not linked to this account.')
      const timetable = await timetableManagementApi.get('/views/me')
      if (!Array.isArray(timetable)) throw new Error('The timetable response was incomplete.')
      if (active) setState({ loading: false, profile, timetable, error: '' })
    }).catch(error => { if (active) setState({ loading: false, profile: null, timetable: null, error: error.message || 'Unable to load this page.' }) })
    return () => { active = false }
  }, [screen])
  const timetable = state.timetable?.filter(row => dayFilter === 'all' || String(row.dayOfWeek).toLowerCase() === dayFilter)
  return <main className="portal-page student-dashboard"><section className="student-dashboard-card"><header className="student-section-heading"><h1>{title}</h1></header>{state.loading ? <p role="status">Loadingâ€¦</p> : state.error ? <p role="alert">{state.error}</p> : ['profile', 'subjects'].includes(screen) ? <><dl className="live-student-details">{[['Name', state.profile.fullName], ['Registration number', state.profile.registrationNumber || state.profile.identifier], ['Roll number', state.profile.rollNumber], ['Course', state.profile.course], ['Department', state.profile.department], ['Branch', state.profile.branch], ['Academic year', state.profile.academicYear], ['Semester', state.profile.semester], ['Section', state.profile.section], ['Status', state.profile.status]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl>{screen === 'profile' ? <Link to="/my-profile">Manage profile</Link> : <><h2>Subjects</h2><p className="student-empty">Your assigned subject list is not available yet.</p></>}</> : screen === 'timetable' ? <><label className="live-timetable-filter">Day <select value={dayFilter} onChange={event => setDayFilter(event.target.value)}><option value="all">All days</option>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day} value={day.toLowerCase()}>{day}</option>)}</select></label>{timetable.length ? <div className="live-timetable-list">{timetable.map((row, index) => <article className="live-timetable-row" key={row.timetableEntryId ?? index}><strong>{display(row.dayOfWeek)}</strong><span>{display(row.startTime)} â€“ {display(row.endTime)}</span><span>{display(row.subjectName)}{row.subjectCode ? ` (${row.subjectCode})` : ''}</span><span>{row.facultyName || 'Faculty not listed'}</span><span>{row.classroomName || row.classroomCode || 'Room not listed'}</span></article>)}</div> : <p className="student-empty">No published timetable entries are available for this selection.</p>}</> : <p className="student-empty">{title} information is not available yet.</p>}</section></main>
}

