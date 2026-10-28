import { Link } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiLayers,
  FiUsers,
} from 'react-icons/fi'
import PortalLayout from '../../../../layouts/PortalLayout.jsx'
import FacultyCardSkeleton from '../../components/FacultyCardSkeleton.jsx'
import FacultyEmptyState from '../../components/FacultyEmptyState.jsx'
import { facultyService } from '../../services/facultyService.js'
import useFacultyDashboard from '../hooks/useFacultyDashboard.js'
import '../../dashboard.css'

const metrics = [
  { key: 'myStudents', label: 'My Students', description: 'Across assigned sections', path: 'students', Icon: FiUsers },
  { key: 'mySubjects', label: 'My Subjects', description: 'Active teaching subjects', path: 'subjects', Icon: FiBookOpen },
  { key: 'assignedSections', label: 'Assigned Sections', description: 'Classroom responsibilities', path: 'subjects', Icon: FiLayers },
  { key: 'todaysClasses', label: "Today's Classes", description: 'On your teaching schedule', path: 'timetable', Icon: FiCalendar },
]

function DashboardContent({ snapshot }) {
  const kpis = snapshot.kpis
  const hasRecords = Object.values(kpis).some(count => count > 0)
  return <div className="faculty-dashboard">
    <section className="faculty-dashboard-welcome">
      <div>
        <p className="faculty-dashboard-eyebrow">YOUR ACADEMIC WORKSPACE</p>
        <h1>Welcome back, {snapshot.faculty.fullName}</h1>
        <p>Keep track of your classes, students and daily academic work.</p>
        <div className="faculty-dashboard-tags">
          <span>{snapshot.faculty.designation}</span>
          <span>{snapshot.faculty.department}</span>
          {snapshot.academicYear && <span>Academic year {snapshot.academicYear}</span>}
        </div>
      </div>
      <Link to="/faculty-portal/timetable" className="faculty-dashboard-primary">
        View my timetable <FiArrowRight aria-hidden="true" />
      </Link>
    </section>

    {hasRecords ? <section className="faculty-dashboard-metrics" aria-label="Teaching summary">
      {metrics.map(({ key, label, description, path, Icon }) => {
        const value = kpis[key]
        return <Link className="faculty-dashboard-metric" to={`/faculty-portal/${path}`} key={key}>
          <span className="faculty-dashboard-metric-icon"><Icon aria-hidden="true" /></span>
          <span className="faculty-dashboard-metric-copy">
            <span className="faculty-dashboard-metric-label">{label}</span>
            <strong>{value > 0 ? value : '—'}</strong>
            <small>{value > 0 ? description : `No ${label.toLowerCase()} data available`}</small>
          </span>
          <FiArrowRight className="faculty-dashboard-metric-arrow" aria-hidden="true" />
        </Link>
      })}
    </section> : <section className="faculty-dashboard-empty-card">
      <FacultyEmptyState
        icon={FiBookOpen}
        title="No teaching assignments yet"
        description="Your dashboard totals will appear after your teaching sections and subjects are added."
      />
    </section>}

    <section className="faculty-dashboard-schedule">
      <header>
        <div>
          <p className="faculty-dashboard-eyebrow">TODAY</p>
          <h2>Class schedule</h2>
        </div>
        <Link to="/faculty-portal/timetable">Full timetable <FiArrowRight aria-hidden="true" /></Link>
      </header>
      {snapshot.todayClasses.length ? <ol>
        {snapshot.todayClasses.map(row => <li key={row.id}>
          <span className="faculty-dashboard-time"><FiClock aria-hidden="true" />{row.slotTime}</span>
          <span className="faculty-dashboard-class">
            <strong>{row.subjectName}</strong>
            <small>{row.sectionName} · {row.room}</small>
          </span>
          {row.attendanceMarked
            ? <span className="faculty-dashboard-status is-complete">Attendance marked</span>
            : <Link className="faculty-dashboard-action" to="/faculty-portal/attendance">Take attendance</Link>}
        </li>)}
      </ol> : <FacultyEmptyState title="No classes scheduled today" description="Your next scheduled class will appear here." />}
    </section>

    <div className="faculty-dashboard-lower">
      <section className="faculty-dashboard-panel"><header><div><p className="faculty-dashboard-eyebrow">UP NEXT</p><h2>Upcoming exams</h2></div><Link to="/faculty-portal/exams">All exams <FiArrowRight aria-hidden="true" /></Link></header>
        {snapshot.upcomingExams.length ? <ul>{snapshot.upcomingExams.map(row => <li key={row.id}><span className="faculty-dashboard-alert-icon"><FiCalendar aria-hidden="true" /></span><span><strong>{row.subjectName}</strong><small>{row.date} · {row.time} · {row.room}</small></span></li>)}</ul> : <FacultyEmptyState title="No upcoming exams" description="Published exam schedules will appear here." />}
      </section>
      <section className="faculty-dashboard-panel"><header><div><p className="faculty-dashboard-eyebrow">CAMPUS CALENDAR</p><h2>Upcoming meetings</h2></div><Link to="/faculty-portal/meetings">View calendar <FiArrowRight aria-hidden="true" /></Link></header>
        {snapshot.upcomingMeetings.length ? <ul>{snapshot.upcomingMeetings.map(row => <li key={row.id}><span className="faculty-dashboard-alert-icon"><FiClock aria-hidden="true" /></span><span><strong>{row.title}</strong><small>{row.date} · {row.time} · {row.venue}</small></span></li>)}</ul> : <FacultyEmptyState title="No upcoming meetings" description="Meeting invitations will appear here." />}
      </section>
    </div>

    <div className="faculty-dashboard-lower">
      <section className="faculty-dashboard-panel">
        <header><div><p className="faculty-dashboard-eyebrow">TO DO</p><h2>Pending actions</h2></div></header>
        {snapshot.pendingActions.length ? <ul>
          {snapshot.pendingActions.map(action => <li key={action.id}>
            <span className="faculty-dashboard-alert-icon"><FiAlertTriangle aria-hidden="true" /></span>
            <span><strong>{action.title}</strong><small>{action.description}</small></span>
            <Link to={action.actionUrl}>{action.actionLabel}<FiArrowRight aria-hidden="true" /></Link>
          </li>)}
        </ul> : <FacultyEmptyState title="All caught up" description="There are no pending teaching actions." />}
      </section>
      <section className="faculty-dashboard-panel faculty-dashboard-shortages">
        <header><div><p className="faculty-dashboard-eyebrow">STUDENT SUPPORT</p><h2>Attendance alerts</h2></div><Link to="/faculty-portal/attendance">Review <FiArrowRight aria-hidden="true" /></Link></header>
        {snapshot.shortageAlerts.length ? <ul>
          {snapshot.shortageAlerts.slice(0, 4).map(student => <li key={student.id}>
            <span><strong>{student.name}</strong><small>{student.rollNumber} · {student.sectionName}</small></span>
            <b>{student.attendancePct}%</b>
          </li>)}
        </ul> : <FacultyEmptyState title="No attendance alerts" description="Students requiring attendance support will appear here." />}
      </section>
    </div>
  </div>
}

function LoadingDashboard() {
  return <div className="faculty-dashboard" aria-label="Loading faculty dashboard" aria-busy="true">
    <div className="faculty-dashboard-welcome-skeleton"><span /><span /><span /></div>
    <FacultyCardSkeleton count={4} height="132px" className="faculty-dashboard-skeleton-grid" />
    <div className="faculty-dashboard-content-skeleton"><span /><span /><span /></div>
  </div>
}

function DashboardError({ message, retry, loading }) {
  return <section className="faculty-dashboard-error" role="alert">
    <span className="faculty-dashboard-error-icon"><FiAlertTriangle aria-hidden="true" /></span>
    <div><p className="faculty-dashboard-eyebrow">DASHBOARD UNAVAILABLE</p><h2>We couldn’t load your teaching summary</h2><p>{message}</p>
      <button type="button" onClick={retry} disabled={loading}>{loading ? 'Retrying…' : 'Try again'}</button>
    </div>
  </section>
}

export default function FacultyDashboardPage() {
  const { snapshot, loading, error, retry } = useFacultyDashboard(facultyService)
  return <PortalLayout title="Dashboard">
    <main className="portal-page faculty-dashboard-page">
      <header className="faculty-dashboard-heading">
        <div><p className="portal-eyebrow">DIGITAL CAMPUS / TEACHING FACULTY</p><h1>Dashboard</h1><p>Your teaching schedule, assigned classes and daily academic work.</p></div>
        <span className="faculty-dashboard-live"><i />Mock college records</span>
      </header>
      {loading && !snapshot ? <LoadingDashboard /> : error && !snapshot ? <DashboardError message={error} retry={retry} loading={loading} /> : snapshot ? <>{error && <DashboardError message={error} retry={retry} loading={loading} />}<DashboardContent snapshot={snapshot} /></> : null}
    </main>
  </PortalLayout>
}
