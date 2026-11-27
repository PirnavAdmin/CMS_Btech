import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiAward, FiBarChart2, FiBookOpen, FiCalendar, FiDownload, FiSearch, FiUser } from 'react-icons/fi'
import { API_BASE_URL, profileApi } from '../../api/apiEndpoints'
import './my-academics.css'

const text = value => value == null || String(value).trim() === '' ? '—' : String(value)
const photoUrl = path => !path || /^(data:|https?:\/\/)/i.test(path) ? path : `${import.meta.env.DEV ? '' : API_BASE_URL}/${String(path).replace(/^\/+/, '')}`

function Detail({ label, value }) {
  return <div className="my-academics-detail"><dt>{label}</dt><dd>{text(value)}</dd></div>
}

function AcademicMetric({ icon: Icon, title, description, tone }) {
  return <article className={`my-academics-metric my-academics-metric--${tone}`}><span className="my-academics-metric-icon"><Icon aria-hidden="true" /></span><div><span>{title}</span><strong>—</strong><small>{description}</small></div><FiArrowRight className="my-academics-metric-arrow" aria-hidden="true" /></article>
}

export default function MyAcademics() {
  const [state, setState] = useState({ loading: true, profile: null, error: '' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setState({ loading: true, profile: null, error: '' })
    profileApi.getProfile().then(profile => { if (active) setState({ loading: false, profile, error: '' }) })
      .catch(error => { if (active) setState({ loading: false, profile: null, error: error.message || 'Unable to load your academic information.' }) })
    return () => { active = false }
  }, [retry])
  if (state.loading) return <main className="my-academics"><p role="status">Loading academic information…</p></main>
  if (state.error) return <main className="my-academics"><div role="alert" className="my-academics-alert">{state.error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div></main>
  const profile = state.profile
  return <main className="my-academics">
    <nav className="my-academics-breadcrumb" aria-label="Breadcrumb"><Link to="/student-portal/dashboard">Dashboard</Link><span aria-hidden="true">›</span><strong>My Academics</strong></nav>
    <header className="my-academics-header"><span className="my-academics-header-icon"><FiAward aria-hidden="true" /></span><div><h1>My Academics</h1><p>Your academic details and performance overview.</p></div></header>
    <section className="my-academics-card my-academics-overview" aria-labelledby="academic-overview-title">
      <h2 id="academic-overview-title"><FiUser aria-hidden="true" /> Student Academic Overview</h2>
      <div className="my-academics-overview-grid"><div className="my-academics-person"><div className="my-academics-avatar">{profile.profileImagePath ? <img src={photoUrl(profile.profileImagePath)} alt={`${profile.fullName || 'Student'} profile`} /> : <FiUser aria-label="Profile photo unavailable" />}</div><div><strong>{text(profile.fullName)}</strong><dl><Detail label="Registration number" value={profile.registrationNumber} /><Detail label="Roll number" value={profile.rollNumber} /><Detail label="Admission number" value={profile.admissionNumber} /></dl></div></div>
        <dl><Detail label="Course" value={profile.course} /><Detail label="Department" value={profile.department} /><Detail label="Branch" value={profile.branch} /><Detail label="Academic year" value={profile.academicYear} /></dl>
        <dl><Detail label="Current semester" value={profile.semester} /><Detail label="Section" value={profile.section} /><Detail label="Admission year" value={profile.admissionYear} /><Detail label="Status" value={profile.academicStatus} /></dl>
      </div>
    </section>
    <section className="my-academics-metrics" aria-label="Academic summary"><AcademicMetric icon={FiBookOpen} title="Total Subjects" description="Current semester" tone="blue" /><AcademicMetric icon={FiAward} title="Total Credits" description="Registered credits" tone="green" /><AcademicMetric icon={FiBarChart2} title="Current SGPA" description="Not published" tone="purple" /><AcademicMetric icon={FiCalendar} title="Attendance" description="This semester" tone="orange" /></section>
    <section className="my-academics-card my-academics-subjects" aria-labelledby="subject-details-title"><header className="my-academics-section-header"><h2 id="subject-details-title"><FiBookOpen aria-hidden="true" /> Subject Details</h2><div className="my-academics-controls"><label><span className="my-academics-sr">Semester</span><select disabled><option>Semester</option></select></label><label><span className="my-academics-sr">Subject type</span><select disabled><option>Subject type</option></select></label><label className="my-academics-search"><FiSearch aria-hidden="true" /><span className="my-academics-sr">Search subjects</span><input placeholder="Search subjects" disabled /></label><button type="button" disabled title="Subject data is unavailable"><FiDownload aria-hidden="true" /> Download List</button></div></header>
      <div className="my-academics-table-scroll"><table><thead><tr>{['S.No', 'Subject Code', 'Subject Name', 'Type', 'Credits', 'Faculty', 'Internal Marks', 'Status', 'Action'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody><tr><td colSpan={9} className="my-academics-empty">Your assigned subject list is not available yet.</td></tr></tbody></table></div>
    </section>
    <div className="my-academics-bottom"><section className="my-academics-card" aria-labelledby="academic-history-title"><h2 id="academic-history-title"><FiBarChart2 aria-hidden="true" /> Semester-wise Academic History</h2><div className="my-academics-table-scroll"><table><thead><tr>{['Semester', 'Academic Year', 'Total Subjects', 'Total Credits', 'SGPA', 'Result', 'Backlogs'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody><tr><td colSpan={7} className="my-academics-empty">Published semester history is not available yet.</td></tr></tbody></table></div></section>
      <section className="my-academics-card my-academics-course" aria-labelledby="course-overview-title"><h2 id="course-overview-title"><FiBookOpen aria-hidden="true" /> Course Overview</h2><dl><Detail label="Degree" value={profile.course} /><Detail label="Department" value={profile.department} /><Detail label="Branch" value={profile.branch} /><Detail label="Duration" /><Detail label="Total semesters" /><Detail label="Curriculum" /></dl><button type="button" disabled title="Curriculum data is unavailable">View Curriculum</button></section>
    </div>
  </main>
}
