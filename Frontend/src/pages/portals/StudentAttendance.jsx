import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiCheckCircle, FiEye, FiSearch, FiTrendingUp, FiXCircle } from 'react-icons/fi'
import { profileApi, studentAttendanceApi } from '../../api/apiEndpoints'
import './student-attendance.css'

const text = value => value == null || String(value).trim() === '' ? '—' : String(value)
const normalize = value => String(value || '').trim().toLowerCase()
const dateLabel = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : '—'
const timeLabel = value => value ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(`1970-01-01T${String(value).slice(0, 8)}`)) : '—'
function attendanceStatus(rate, required) {
  if (required == null || !Number.isFinite(Number(required))) return 'Threshold unavailable'
  if (rate < Number(required)) return 'Shortage'
  return rate >= 100 ? 'Excellent' : 'Good'
}

function summarize(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.academicYearId}:${row.semesterId}:${row.subjectId}`
    if (!groups.has(key)) groups.set(key, { key, subjectId: row.subjectId, subject: row.subjectName, code: row.subjectCode, semesterId: row.semesterId, semester: row.semesterName, academicYearId: row.academicYearId, academicYear: row.academicYearName, course: row.courseName, branch: row.branchName, facultyNames: new Set(), records: [], requiredPercentage: row.requiredPercentage == null ? null : Number(row.requiredPercentage) })
    const group = groups.get(key)
    if (row.facultyName) group.facultyNames.add(row.facultyName)
    group.records.push(row)
  }
  return [...groups.values()].map(group => {
    const records = group.records
    const present = records.filter(row => String(row.attendanceStatus).toUpperCase() === 'PRESENT').length
    const late = records.filter(row => String(row.attendanceStatus).toUpperCase() === 'LATE').length
    const attended = present + late
    const absent = records.filter(row => String(row.attendanceStatus).toUpperCase() === 'ABSENT').length
    const leave = records.filter(row => String(row.attendanceStatus).toUpperCase() === 'LEAVE').length
    const rate = records.length ? attended * 100 / records.length : 0
    const threshold = group.requiredPercentage
    const needed = threshold != null && threshold < 100 && rate < threshold
      ? Math.max(0, Math.ceil((threshold * records.length / 100 - attended) / (1 - threshold / 100)))
      : 0
    return { ...group, records: records.slice().sort((a, b) => String(b.attendanceDate).localeCompare(String(a.attendanceDate))), faculty: [...group.facultyNames].join(', ') || '—', total: records.length, present, late, attended, absent, leave, rate, status: attendanceStatus(rate, threshold), needed }
  }).sort((a, b) => String(a.subject).localeCompare(String(b.subject)) || String(a.academicYear).localeCompare(String(b.academicYear)))
}

function Metric({ icon: Icon, title, value, detail, tone }) {
  return <article className={`sat-metric sat-metric--${tone}`}><span className="sat-metric-icon"><Icon aria-hidden="true" /></span><span className="sat-metric-copy"><small>{title}</small><strong>{value}</strong><em>{detail}</em></span></article>
}

function StatusBadge({ value }) { return <span className={`sat-status sat-status--${String(value).toLowerCase().replace(/\s+/g, '-')}`}>{value}</span> }

export default function StudentAttendance() {
  const [state, setState] = useState({ loading: true, rows: [], profile: null, error: '' })
  const [retry, setRetry] = useState(0)
  const [tab, setTab] = useState('records')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [semester, setSemester] = useState('')
  const [year, setYear] = useState('')
  const [subject, setSubject] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    setState(current => ({ ...current, loading: true, error: '' }))
    Promise.all([profileApi.getProfile(), studentAttendanceApi.getMine()]).then(([profile, rows]) => {
      if (!Array.isArray(rows)) throw new Error('The attendance service returned an invalid response.')
      if (active) setState({ loading: false, profile, rows, error: '' })
    }).catch(error => { if (active) setState({ loading: false, profile: null, rows: [], error: error.message || 'Unable to load your attendance.' }) })
    return () => { active = false }
  }, [retry])

  const summaries = useMemo(() => summarize(state.rows), [state.rows])
  const semesters = [...new Map(summaries.map(row => [String(row.semesterId), row.semester || `Semester ${row.semesterId}`])).entries()]
  const years = [...new Map(summaries.map(row => [String(row.academicYearId), row.academicYear || String(row.academicYearId)])).entries()]
  const subjects = [...new Map(summaries.map(row => [String(row.subjectId), { id: row.subjectId, label: `${row.subject} (${row.code})` }])).values()]
  const filtered = summaries.filter(row => {
    const search = normalize(appliedQuery)
    const match = `${row.subject || ''} ${row.code || ''} ${row.faculty || ''}`.toLowerCase().includes(search)
    return (!search || match) && (!semester || String(row.semesterId) === semester) && (!year || String(row.academicYearId) === year) && (!subject || String(row.subjectId) === subject)
  })
  const totals = filtered.reduce((sum, row) => ({ total: sum.total + row.total, present: sum.present + row.attended, absent: sum.absent + row.absent }), { total: 0, present: 0, absent: 0 })
  const rate = totals.total ? totals.present * 100 / totals.total : 0
  const pageSize = 5
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const changeFilter = setter => event => { setter(event.target.value); setPage(1) }
  const clear = () => { setQuery(''); setAppliedQuery(''); setSemester(''); setYear(''); setSubject(''); setPage(1) }

  return <main className="portal-page student-dashboard student-attendance-page">
    <header className="sat-heading"><span className="sat-heading-icon"><FiCheckCircle aria-hidden="true" /></span><div><h1>Attendance</h1><p>View your attendance records and subject-wise attendance details.</p></div></header>
    {state.loading ? <div className="sat-loading" role="status"><span className="sat-spinner" /> Loading your attendance records…</div> : state.error ? <div className="sat-error" role="alert"><span>{state.error}</span><button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div> : <>
      <section className="sat-metrics" aria-label="Attendance summary">
        <Metric icon={FiCalendar} title="Total Classes" value={totals.total} detail="Selected records" tone="blue" />
        <Metric icon={FiCheckCircle} title="Present" value={totals.present} detail={`${rate.toFixed(2)}% attendance`} tone="purple" />
        <Metric icon={FiXCircle} title="Absent" value={totals.absent} detail={`${totals.total ? (totals.absent * 100 / totals.total).toFixed(2) : '0.00'}% of classes`} tone="green" />
        <Metric icon={FiTrendingUp} title="Attendance Rate" value={`${rate.toFixed(2)}%`} detail={`${totals.present} of ${totals.total} classes`} tone="orange" />
      </section>

      <div className="sat-toolbar">
        <label className="sat-search"><FiSearch aria-hidden="true" /><span className="sat-sr-only">Search subject or faculty</span><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { setAppliedQuery(query); setPage(1) } }} placeholder="Search by Subject or Faculty Name..." /></label>
        <label><span className="sat-sr-only">Semester</span><select value={semester} onChange={changeFilter(setSemester)}><option value="">All Semesters</option>{semesters.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label><span className="sat-sr-only">Academic Year</span><select value={year} onChange={changeFilter(setYear)}><option value="">All Academic Years</option>{years.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label><span className="sat-sr-only">Subject</span><select value={subject} onChange={changeFilter(setSubject)}><option value="">All Subjects</option>{subjects.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
        <button className="sat-search-button" type="button" onClick={() => { setAppliedQuery(query); setPage(1) }}><FiSearch aria-hidden="true" /> Search</button><button className="sat-clear-button" type="button" onClick={clear}>Clear</button>
      </div>

      <nav className="sat-tabs" role="tablist" aria-label="Attendance views">{[['records', 'Attendance Records'], ['subjects', 'Subject-wise Attendance']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setPage(1) }}><FiCalendar aria-hidden="true" />{label}</button>)}</nav>

      {tab === 'records' ? <RecordsTable rows={paginated} count={filtered.length} page={currentPage} pageCount={pageCount} onPage={setPage} onView={setSelected} /> : <SubjectAttendance rows={paginated} count={filtered.length} page={currentPage} pageCount={pageCount} onPage={setPage} onView={setSelected} />}
      <AttendanceChart rows={filtered} />
      <aside className="sat-notes"><span aria-hidden="true">i</span><div><strong>Important Notes</strong><ul><li>Attendance is updated regularly by faculty.</li><li>Contact your academic coordinator for attendance discrepancies.</li><li>Minimum attendance requirements apply according to college regulations.</li><li>Check your attendance regularly.</li></ul></div></aside>
    </>}
    {selected && <AttendanceDetails group={selected} profile={state.profile} onClose={() => setSelected(null)} />}
  </main>
}

function RecordsTable({ rows, count, page, pageCount, onPage, onView }) {
  return <section className="sat-panel"><div className="sat-table-scroll"><table><thead><tr>{['#', 'Subject', 'Faculty Name', 'Total Classes', 'Attended', 'Absent', 'Attendance %', 'Status', 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.key}><td>{(page - 1) * 5 + index + 1}</td><td><strong>{text(row.subject)}</strong><small>{text(row.code)} · {text(row.semester)}</small></td><td>{row.faculty}</td><td>{row.total}</td><td>{row.attended}</td><td>{row.absent}</td><td><div className="sat-rate-cell"><span>{row.rate.toFixed(2)}%</span><progress max="100" value={row.rate} aria-label={`${row.subject} attendance ${row.rate.toFixed(2)} percent`} /></div></td><td><StatusBadge value={row.status} /></td><td><button type="button" className="sat-view-button" onClick={() => onView(row)}><FiEye aria-hidden="true" /> View</button></td></tr>)}{!rows.length && <tr><td colSpan={9}><EmptyAttendance /></td></tr>}</tbody></table></div><Pagination count={count} page={page} pageCount={pageCount} onPage={onPage} /></section>
}

function SubjectAttendance({ rows, count, page, pageCount, onPage, onView }) {
  return <section className="sat-panel"><header className="sat-panel-title"><h2>Subject-wise Attendance</h2><p>Select View to inspect date-wise attendance history.</p></header><div className="sat-subject-list">{rows.map(row => <article className="sat-subject-row" key={row.key}><div className="sat-subject-name"><strong>{text(row.subject)}</strong><small>{text(row.code)} · {text(row.semester)} · {text(row.academicYear)}</small></div><div className="sat-subject-numbers"><span>{row.attended}/{row.total} attended</span><strong>{row.rate.toFixed(2)}%</strong><progress max="100" value={row.rate} aria-label={`${row.subject} attendance`} /></div><StatusBadge value={row.status} /><button type="button" className="sat-view-button" onClick={() => onView(row)}><FiEye aria-hidden="true" /> View</button></article>)}{!rows.length && <EmptyAttendance />}</div><Pagination count={count} page={page} pageCount={pageCount} onPage={onPage} /></section>
}

function Pagination({ count, page, pageCount, onPage }) {
  if (!count) return <footer className="sat-pagination"><span>Showing 0 records</span></footer>
  return <footer className="sat-pagination"><span>Showing {(page - 1) * 5 + 1} to {Math.min(page * 5, count)} of {count} records</span><div><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>{Array.from({ length: pageCount }, (_, i) => i + 1).map(number => <button type="button" key={number} aria-current={number === page ? 'page' : undefined} onClick={() => onPage(number)}>{number}</button>)}<button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</button></div></footer>
}

function EmptyAttendance() { return <div className="sat-empty"><FiCalendar aria-hidden="true" /><strong>No attendance records found</strong><span>Your faculty's submitted attendance will appear here. Try clearing filters if you expected to see records.</span></div> }

function AttendanceChart({ rows }) {
  if (!rows.length) return null
  return <section className="sat-chart-panel"><header><h2>Subject attendance comparison</h2><p>Attendance rate is based on present and late marks.</p></header><div className="sat-chart">{rows.map(row => <div className="sat-chart-row" key={row.key}><span>{row.subject}</span><div><span style={{ width: `${row.rate}%` }} /></div><strong>{row.rate.toFixed(1)}%</strong></div>)}</div></section>
}

function AttendanceDetails({ group, profile, onClose }) {
  const info = [['Student Name', profile?.fullName], ['Registration Number', profile?.registrationNumber || profile?.identifier], ['Department', profile?.department], ['Course', profile?.course || group.course], ['Branch', profile?.branch || group.branch], ['Semester', group.semester], ['Academic Year', group.academicYear], ['Subject', group.subject], ['Subject Code', group.code], ['Faculty Name', group.faculty], ['Total Classes', group.total], ['Attended Classes', group.attended], ['Present Classes', group.present], ['Late Classes', group.late], ['Absent Classes', group.absent], ['Attendance Percentage', `${group.rate.toFixed(2)}%`]]
  return <div className="sat-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="sat-modal" role="dialog" aria-modal="true" aria-labelledby="sat-modal-title"><header><div><h2 id="sat-modal-title">Attendance Details</h2><p>{text(group.subject)} · {text(group.code)}</p></div><button type="button" onClick={onClose} aria-label="Close details">×</button></header><dl className="sat-profile-grid">{info.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl><div className="sat-detail-rate"><div><strong>Attendance Rate</strong><b>{group.rate.toFixed(2)}%</b></div><progress max="100" value={group.rate} aria-label="Attendance percentage" /></div>{group.requiredPercentage != null && <p className="sat-policy-note">College attendance requirement: {group.requiredPercentage}%. {group.needed > 0 ? `Attend at least ${group.needed} additional classes without absence to reach the requirement.` : 'You currently meet the recorded attendance requirement.'}</p>}{group.requiredPercentage == null && <p className="sat-policy-note">The college has not configured a minimum attendance percentage for this subject.</p>}<section className="sat-history"><h3>Date-wise Attendance</h3><div className="sat-table-scroll"><table><thead><tr>{['#', 'Date', 'Subject', 'Class Time', 'Faculty Name', 'Attendance Status', 'Remarks'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{group.records.map((row, index) => <tr key={row.attendanceSessionId}><td>{index + 1}</td><td>{dateLabel(row.attendanceDate)}</td><td>{text(row.subjectName)}</td><td>{timeLabel(row.startTime)} – {timeLabel(row.endTime)}</td><td>{text(row.facultyName)}</td><td><StatusBadge value={String(row.attendanceStatus || '').toLowerCase().replace(/^./, c => c.toUpperCase())} /></td><td>{text(row.remarks)}</td></tr>)}</tbody></table></div></section><footer><button type="button" onClick={onClose}>Close</button></footer></section></div>
}
