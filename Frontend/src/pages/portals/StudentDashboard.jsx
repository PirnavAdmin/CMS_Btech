import Link from '../../components/portals/PermissionLink.jsx'
import { useState } from 'react'

import { FiArrowLeft, FiArrowRight, FiBookOpen, FiCalendar, FiCheckCircle, FiClock, FiFileText, FiStar, FiTrendingUp } from 'react-icons/fi'
import './student-dashboard.css'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const localDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseLocalDate = value => new Date(`${value}T12:00:00`)
const currency = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const firstName = name => String(name || '').trim().split(/\s+/)[0] || 'Student'

function publishedMarks(data) {
  return data.results.flatMap(result => {
    if (!result.published || !(Number(result.maxMarks) > 0)) return []
    const record = result.records.find(item => item.studentId === data.me.id)
    const marks = Number(record?.marks)
    return Number.isFinite(marks) && marks >= 0 && marks <= Number(result.maxMarks)
      ? [{ result, marks, maxMarks: Number(result.maxMarks) }]
      : []
  })
}

function attendanceSummary(data) {
  const records = data.attendance.flatMap(session => session.records)
  const attended = records.filter(record => record.status !== 'absent').length
  return { records, attended, percentage: records.length ? Math.round(attended / records.length * 100) : null }
}

function monthlyAttendance(data) {
  const months = new Map()
  data.attendance.forEach(session => {
    const record = session.records.find(item => item.studentId === data.me.id)
    if (!record || !/^\d{4}-\d{2}-\d{2}$/.test(session.date)) return
    const key = session.date.slice(0, 7)
    const bucket = months.get(key) || { key, total: 0, attended: 0 }
    bucket.total += 1
    if (record.status !== 'absent') bucket.attended += 1
    months.set(key, bucket)
  })
  const keys = [...months.keys()].sort()
  if (!keys.length) return []
  const start = parseLocalDate(`${keys[0]}-01`)
  const end = parseLocalDate(`${keys[keys.length - 1]}-01`)
  const output = []
  for (const cursor = new Date(start); cursor <= end; cursor.setMonth(cursor.getMonth() + 1)) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const bucket = months.get(key)
    output.push({
      key,
      label: new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(cursor),
      total: bucket?.total ?? 0,
      attended: bucket?.attended ?? 0,
      percentage: bucket ? Math.round(bucket.attended / bucket.total * 100) : null,
    })
  }
  return output
}

function SectionTitle({ title, to, children }) {
  return <header className="student-section-heading"><h2>{title}</h2>{to && <Link to={to}>View all</Link>}{children}</header>
}

function MetricCard({ icon: Icon, label, value, detail, to }) {
  const body = <><span className="student-metric-icon"><Icon aria-hidden="true" /></span><span className="student-metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></>
  return to
    ? <Link className="student-metric-card" to={to}>{body}</Link>
    : <article className="student-metric-card">{body}</article>
}

function AttendanceChart({ points }) {
  const width = 520, height = 230, left = 38, right = 12, top = 14, bottom = 42
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const x = index => left + (points.length > 1 ? index * plotWidth / (points.length - 1) : plotWidth / 2)
  const y = percentage => top + (100 - percentage) * plotHeight / 100
  let segments = [], segment = []
  points.forEach((point, index) => {
    if (point.percentage === null) {
      if (segment.length) segments.push(segment)
      segment = []
    } else segment.push(`${x(index)},${y(point.percentage)}`)
  })
  if (segment.length) segments.push(segment)
  return <div className="student-chart-scroll"><svg className="student-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly attendance percentage, from zero to one hundred percent">
    {[0, 50, 100].map(value => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="student-chart-gridline" /><text x={left - 8} y={y(value) + 4} textAnchor="end" className="student-chart-axis">{value}%</text></g>)}
    {segments.map((segmentPoints, index) => <polyline key={index} points={segmentPoints.join(' ')} className="student-chart-line" />)}
    {points.map((point, index) => <g key={point.key}>
      {point.percentage !== null && <><circle cx={x(index)} cy={y(point.percentage)} r="4" className="student-chart-point" aria-label={`${point.label}: ${point.percentage}% (${point.attended} of ${point.total} eligible classes attended)`}><title>{`${point.label}: ${point.percentage}% (${point.attended} of ${point.total} eligible classes attended)`}</title></circle></>}
      <text x={x(index)} y={height - 12} textAnchor="middle" className="student-chart-axis">{point.label}</text>
    </g>)}
  </svg></div>
}

function MarksDonut({ percentage }) {
  const radius = 38, circumference = 2 * Math.PI * radius
  return <div className="student-donut-wrap">
    <svg className="student-donut" viewBox="0 0 100 100" role="img" aria-label={`Published assessment marks: ${percentage}%`}>
      <circle cx="50" cy="50" r={radius} className="student-donut-track" />
      <circle cx="50" cy="50" r={radius} className="student-donut-value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percentage / 100)} />
      <text x="50" y="49" textAnchor="middle" className="student-donut-number">{percentage}%</text>
      <text x="50" y="62" textAnchor="middle" className="student-donut-caption">marks</text>
    </svg>
  </div>
}

function TimetableCard({ data, base, date, setDate }) {
  const day = DAY_NAMES[parseLocalDate(date).getDay()]
  const classes = data.timetable
    .filter(row => row.day === day && String(row.status || '').toLowerCase() !== 'cancelled')
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
  const moveDate = amount => {
    const next = parseLocalDate(date)
    next.setDate(next.getDate() + amount)
    setDate(localDateKey(next))
  }
  return <section className="student-dashboard-card">
    <SectionTitle title="Today's timetable" to={`${base}/timetable`} />
    <div className="student-date-control">
      <button type="button" onClick={() => moveDate(-1)} aria-label="Previous day"><FiArrowLeft /></button>
      <time dateTime={date}>{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parseLocalDate(date))}</time>
      <button type="button" onClick={() => moveDate(1)} aria-label="Next day"><FiArrowRight /></button>
    </div>
    {classes.length ? <div className="student-class-list">{classes.map(row => {
      const assignment = data.assignments.find(item => item.id === row.assignmentId)
      return <article className="student-class" key={row.id}>
        <time>{row.start}<span>{row.end}</span></time>
        <div><strong>{assignment?.subject?.name || 'Subject'}</strong><small>{assignment?.faculty?.name || 'Faculty not listed'}</small><small>{row.room || 'Room not listed'}</small></div>
      </article>
    })}</div> : <p className="student-empty">No classes scheduled for this date.</p>}
    <Link className="student-card-link" to={`${base}/timetable`}>View full timetable <span aria-hidden="true">→</span></Link>
  </section>
}

function FeeCard({ data, base, today }) {
  const outstanding = data.fees.map(row => ({ ...row, balance: Math.max(0, Number(row.amount) - Number(row.paid)) }))
    .filter(row => row.balance > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const next = outstanding[0]
  return <section className="student-dashboard-card">
    <SectionTitle title="Fee reminder" to={`${base}/fees`} />
    {next ? <>
      <p className="student-overline">{next.dueDate < today ? 'Overdue' : 'Next payment due'}</p>
      <strong className="student-fee-amount">{currency(next.balance)}</strong>
      <p className="student-fee-description">{next.description}</p>
      <p className="student-fee-date"><FiCalendar aria-hidden="true" /> Due {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parseLocalDate(next.dueDate))}</p>
    </> : <p className="student-empty">{data.fees.length ? 'No outstanding fees.' : 'No fee records are available.'}</p>}
    <Link className="student-card-link" to={`${base}/fees`}>View fee details <span aria-hidden="true">→</span></Link>
  </section>
}

function SubjectCard({ data, base, marks }) {
  return <section className="student-dashboard-card">
    <SectionTitle title="My subjects" to={`${base}/subjects`} />
    {data.assignments.length ? <div className="student-subject-list">{data.assignments.map(assignment => {
      const subject = assignment.subject
      const assessments = marks.filter(item => item.result.assignmentId === assignment.id)
      return <article className="student-subject" key={assignment.id}>
        <div className="student-subject-heading"><span><strong>{subject?.code || 'Subject'}</strong><small>{subject?.name || 'Subject name unavailable'}</small></span><FiBookOpen aria-hidden="true" /></div>
        {assessments.length ? assessments.map(({ result, marks: scored, maxMarks }) => {
          const percentage = Math.round(scored / maxMarks * 100)
          return <div className="student-subject-assessment" key={result.id}>
            <div><span>{result.assessment}</span><strong>{percentage}%</strong></div>
            <progress max="100" value={percentage} aria-label={`${subject?.name || 'Subject'} ${result.assessment} marks percentage`} />
          </div>
        }) : <p className="student-not-published">Marks not published</p>}
        {assignment.faculty?.name && <small className="student-faculty">Faculty: {assignment.faculty.name}</small>}
      </article>
    })}</div> : <p className="student-empty">No enrolled subjects are available.</p>}
  </section>
}

function StudentDashboard({ data, role, onRetry, loading, error }) {
  const base = `/${role}-portal`
  const now = new Date()
  const [date, setDate] = useState(localDateKey(now))
  const [retrying, setRetrying] = useState(false)
  const today = localDateKey(now)
  const marks = publishedMarks(data)
  const attendance = attendanceSummary(data)
  const trend = monthlyAttendance(data)
  const totalMarks = marks.reduce((sum, item) => sum + item.marks, 0)
  const totalMaximum = marks.reduce((sum, item) => sum + item.maxMarks, 0)
  const marksPercentage = totalMaximum ? Math.round(totalMarks / totalMaximum * 100) : null
  const todayName = DAY_NAMES[now.getDay()]
  const classesToday = data.timetable.filter(row => row.day === todayName && String(row.status || '').toLowerCase() !== 'cancelled')
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const notifications = data.notifications.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  const retry = async () => {
    setRetrying(true)
    try { await onRetry() }
    catch (reason) { console.error('Could not reload the student workspace:', reason) }
    finally { setRetrying(false) }
  }

  return <div className="student-dashboard">
    {error && <div className="student-inline-error" role="alert"><span>{error}</span><button type="button" onClick={retry} disabled={retrying || loading}>{retrying ? 'Retrying…' : 'Retry'}</button></div>}
    <div className="student-dashboard-columns">
      <div className="student-dashboard-main">
        <section className="student-welcome">
          <div className="student-welcome-copy">
            <p className="student-welcome-eyebrow">{greeting}, {firstName(data.me.name)}</p>
            <h2>Your academic journey, at a glance.</h2>
            <p>Keep up your momentum: every class and every effort moves you forward.</p>
            <Link to={`${base}/subjects`}>View my classes <span aria-hidden="true">→</span></Link>
          </div>
          <div className="student-welcome-art" aria-hidden="true"><FiBookOpen /></div>
        </section>
        <section className="student-metrics" aria-label="Academic summary">
          <MetricCard icon={FiCalendar} label="Today's timetable" value={classesToday.length} detail="Classes scheduled today" to={`${base}/timetable`} />
          <MetricCard icon={FiCheckCircle} label="Attendance" value={attendance.percentage === null ? 'Not available' : `${attendance.percentage}%`} detail="Recorded sessions · late counts as attended" to={`${base}/attendance`} />
          <MetricCard icon={FiStar} label="Overall grade" value="Not available" detail="No overall grade rule in this workspace" to={`${base}/results`} />
          <MetricCard icon={FiTrendingUp} label="CGPA / GPA" value="Not available" detail="No published GPA data" to={`${base}/results`} />
          <MetricCard icon={FiFileText} label="Published marks" value={marksPercentage === null ? 'Not available' : `${marksPercentage}%`} detail="Available assessments only" to={`${base}/results`} />
        </section>
        <div className="student-content-grid">
          <SubjectCard data={data} base={base} marks={marks} />
          <section className="student-dashboard-card">
            <SectionTitle title="Exam schedule" />
            <div className="student-unavailable"><FiCalendar aria-hidden="true" /><p>Exam timetables are not available in this student workspace yet.</p></div>
          </section>
        </div>
        <section className="student-dashboard-card student-progress-overview">
          <SectionTitle title="Progress overview" />
          <div className="student-progress-grid">
            <article className="student-progress-panel">
              <h3>Published marks percentage</h3>
              <p>Combined points from published assessments only; this is not a final grade.</p>
              {marksPercentage === null ? <p className="student-empty">No published marks available.</p> : <MarksDonut percentage={marksPercentage} />}
            </article>
            <article className="student-progress-panel">
              <h3>Subject performance</h3>
              <p>Marks percentage by published assessment.</p>
              {marks.length ? <div className="student-performance-list">{marks.map(({ result, marks: scored, maxMarks }) => {
                const assignment = data.assignments.find(item => item.id === result.assignmentId)
                const percentage = Math.round(scored / maxMarks * 100)
                return <div className="student-performance-row" key={result.id}>
                  <div><span>{assignment?.subject?.code || 'Subject'} · {result.assessment}</span><strong>{percentage}%</strong></div>
                  <progress max="100" value={percentage} aria-label={`${assignment?.subject?.name || 'Subject'} ${result.assessment} marks percentage`} />
                </div>
              })}</div> : <p className="student-empty">No published subject marks available.</p>}
            </article>
            <article className="student-progress-panel">
              <h3>Monthly attendance</h3>
              <p>Attendance from recorded sessions; late counts as attended.</p>
              {trend.length ? <AttendanceChart points={trend} /> : <p className="student-empty">No attendance history available.</p>}
            </article>
            <article className="student-progress-panel">
              <h3>Grade distribution</h3>
              <p>Published individual grades.</p>
              <div className="student-unavailable"><FiStar aria-hidden="true" /><p>Grade categories are not included in this workspace.</p></div>
            </article>
          </div>
        </section>
      </div>
      <aside className="student-dashboard-sidebar" aria-label="Today's information">
        <TimetableCard data={data} base={base} date={date} setDate={setDate} />
        <FeeCard data={data} base={base} today={today} />
        <section className="student-dashboard-card">
          <SectionTitle title="Upcoming tasks" />
          <div className="student-unavailable"><FiClock aria-hidden="true" /><p>Assignments and task tracking are not available in this student workspace yet.</p></div>
        </section>
        <section className="student-dashboard-card">
          <SectionTitle title="Announcements" to={`${base}/notifications`} />
          {notifications.length ? <div className="student-announcement-list">{notifications.map(row => <article key={row.id}><strong>{row.title}</strong><p>{row.message}</p><small>{row.createdAt.slice(0, 10)}</small></article>)}</div> : <p className="student-empty">No announcements yet.</p>}
        </section>
      </aside>
    </div>
  </div>
}

export default StudentDashboard
