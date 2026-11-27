import { useEffect, useMemo, useState } from 'react'
import { FiBarChart2, FiCalendar, FiCheckCircle, FiClock, FiDownload, FiEye, FiFileText, FiPrinter, FiSearch } from 'react-icons/fi'
import { profileApi, studentExaminationApi } from '../../api/apiEndpoints'
import './student-examinations.css'

const TABS = [['upcoming', 'Upcoming Exams'], ['timetable', 'Exam Timetable'], ['hall-ticket', 'Hall Ticket'], ['results', 'Results']]
const text = value => value == null || String(value).trim() === '' ? '—' : String(value)
const day = value => value ? new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : '—'
const date = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : '—'
const clock = value => value ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(`1970-01-01T${String(value).slice(0, 8)}`)) : '—'
const minutesBetween = (start, end) => {
  if (!start || !end) return null
  const parts = value => String(value).split(':').map(Number)
  const [sh, sm] = parts(start), [eh, em] = parts(end)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return mins > 0 ? mins : null
}
const durationLabel = mins => mins ? `${Math.floor(mins / 60) ? `${Math.floor(mins / 60)} hr ` : ''}${mins % 60 ? `${mins % 60} min` : ''}`.trim() : '—'
const statusFor = row => {
  const status = Number(row.statusValue ?? row.status)
  if (status === 0 || String(row.status).toLowerCase() === 'inactive') return 'Cancelled'
  const d = String(row.examDate || '').slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  return d < today ? 'Completed' : d === today ? 'Scheduled' : 'Upcoming'
}
const norm = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

function unwrapRows(value) {
  if (!Array.isArray(value)) throw new Error('The examination service returned an invalid response.')
  return value
}

function Status({ value }) { return <span className={`se-status se-status--${String(value).toLowerCase().replace(/\s+/g, '-')}`}>{value}</span> }

function SummaryCard({ icon: Icon, title, value, tone, caption }) {
  return <article className={`se-summary-card se-summary-card--${tone}`}><span className="se-summary-icon"><Icon aria-hidden="true" /></span><span className="se-summary-copy"><small>{title}</small><strong>{value}</strong><em>{caption}</em></span><span className="se-summary-arrow" aria-hidden="true">›</span></article>
}

export default function StudentExaminations() {
  const [state, setState] = useState({ loading: true, profile: null, rows: [], exams: [], results: [], error: '', resultError: '' })
  const [retry, setRetry] = useState(0)
  const [tab, setTab] = useState('upcoming')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [semester, setSemester] = useState('')
  const [examType, setExamType] = useState('')
  const [status, setStatus] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    setState(current => ({ ...current, loading: true, error: '', resultError: '' }))
    Promise.all([profileApi.getProfile(), studentExaminationApi.getSchedule(), studentExaminationApi.getExams()]).then(async ([profile, scheduleRows, exams]) => {
      const section = norm(profile.section)
      if (!section) throw new Error('Your student profile is not linked to an examination section.')
      const scoped = unwrapRows(scheduleRows).filter(row => Number(row.statusValue ?? row.status) === 1 && norm(row.sectionName) === section || Number(row.statusValue ?? row.status) === 1 && norm(row.sectionCode) === section)
      const activeExams = unwrapRows(exams)
      const byExam = new Map(activeExams.map(exam => [String(exam.examId ?? exam.id), exam]))
      const rows = scoped.map(row => {
        const exam = byExam.get(String(row.examId)) || {}
        return { ...row, examTypeName: exam.examTypeName, examTypeCode: exam.examTypeCode, semesterName: exam.semesterName, academicYearName: exam.academicYearName, examDescription: exam.description }
      })
      let results = [], resultError = ''
      try {
        if (!profile.studentId || !/^\d+$/.test(String(profile.studentId))) throw new Error('Your student record is not linked to this account.')
        results = unwrapRows(await studentExaminationApi.getPublishedResults(profile.studentId))
      } catch (error) { resultError = error.message || 'Published results could not be loaded.' }
      if (active) setState({ loading: false, profile, rows, exams: activeExams, results, error: '', resultError })
    }).catch(error => { if (active) setState(current => ({ ...current, loading: false, error: error.message || 'Unable to load examination information.' })) })
    return () => { active = false }
  }, [retry])

  const rows = useMemo(() => state.rows.map(row => ({ ...row, computedStatus: statusFor(row), durationMinutes: minutesBetween(row.startTime, row.endTime) })), [state.rows])
  const semesters = [...new Map(rows.map(row => [String(row.semesterId || ''), row.semesterName || `Semester ${row.semesterId}`])).entries()].filter(([id]) => id)
  const types = [...new Set(rows.map(row => row.examTypeName).filter(Boolean))]
  const years = [...new Set(rows.map(row => row.academicYearName).filter(Boolean))]
  const filtered = rows.filter(row => {
    const haystack = `${row.subjectName || ''} ${row.subjectCode || ''} ${row.examName || ''}`.toLowerCase()
    return (!submittedQuery.trim() || haystack.includes(submittedQuery.trim().toLowerCase())) && (!semester || String(row.semesterId) === semester) && (!examType || row.examTypeName === examType) && (!status || row.computedStatus === status) && (!academicYear || row.academicYearName === academicYear)
  }).sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)) || String(a.startTime).localeCompare(String(b.startTime)))
  const today = new Date().toISOString().slice(0, 10)
  const future = rows.filter(row => row.examDate >= today && row.computedStatus !== 'Cancelled')
  const completed = rows.filter(row => row.computedStatus === 'Completed')
  const publishedResultsCount = state.results.length
  const clearFilters = () => { setQuery(''); setSubmittedQuery(''); setSemester(''); setExamType(''); setStatus(''); setAcademicYear('') }
  const showRows = tab === 'upcoming' ? filtered.filter(row => ['Upcoming', 'Scheduled'].includes(row.computedStatus)) : filtered

  return <main className="portal-page student-dashboard student-examinations">
    <header className="se-heading"><span className="se-heading-icon"><FiFileText aria-hidden="true" /></span><div><h1>Examinations</h1><p>View your examination schedule, hall tickets and results.</p></div></header>
    <div className="se-toolbar">
      <label className="se-search"><FiSearch aria-hidden="true" /><span className="se-visually-hidden">Search examinations</span><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') setSubmittedQuery(query) }} placeholder="Search by Subject Name, Subject Code or Exam Name" /></label>
      <label><span className="se-visually-hidden">Semester</span><select value={semester} onChange={event => setSemester(event.target.value)}><option value="">All Semesters</option>{semesters.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label><span className="se-visually-hidden">Examination type</span><select value={examType} onChange={event => setExamType(event.target.value)}><option value="">All Types</option>{types.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="se-visually-hidden">Examination status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All Statuses</option>{['Upcoming', 'Scheduled', 'Completed', 'Postponed', 'Cancelled'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="se-visually-hidden">Academic year</span><select value={academicYear} onChange={event => setAcademicYear(event.target.value)}><option value="">All Academic Years</option>{years.map(value => <option key={value}>{value}</option>)}</select></label>
      <button className="se-search-button" type="button" onClick={() => setSubmittedQuery(query)}><FiSearch aria-hidden="true" /> Search</button><button className="se-clear-button" type="button" onClick={clearFilters}>Clear</button>
    </div>

    {state.loading ? <div className="se-state" role="status"><span className="se-spinner" /> Loading your examination information…</div> : state.error ? <div className="se-error" role="alert"><span>{state.error}</span><button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div> : <>
      <section className="se-summary" aria-label="Examination summary">
        <SummaryCard icon={FiCalendar} title="Total Exams" value={rows.length} tone="blue" caption="Your current schedule" />
        <SummaryCard icon={FiClock} title="Upcoming Exams" value={future.length} tone="purple" caption="Scheduled ahead" />
        <SummaryCard icon={FiCheckCircle} title="Completed Exams" value={completed.length} tone="green" caption="This academic year" />
        <SummaryCard icon={FiBarChart2} title="Results Published" value={publishedResultsCount} tone="orange" caption={state.resultError ? 'Results unavailable' : 'Officially released'} />
      </section>
      <nav className="se-tabs" role="tablist" aria-label="Examination sections">{TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{id === 'hall-ticket' ? <FiFileText /> : id === 'results' ? <FiBarChart2 /> : <FiCalendar />}{label}</button>)}</nav>

      {tab === 'hall-ticket' ? <HallTicket profile={state.profile} /> : tab === 'results' ? <Results rows={state.results} error={state.resultError} /> : <section className="se-panel">
        <header className="se-panel-heading"><div><h2>{tab === 'upcoming' ? 'Upcoming Examinations' : 'Examination Timetable'}</h2><p>{showRows.length} examination{showRows.length === 1 ? '' : 's'}</p></div><div className="se-panel-actions"><button type="button" onClick={() => window.print()}><FiDownload aria-hidden="true" /> Save as PDF</button><button type="button" onClick={() => window.print()}><FiPrinter aria-hidden="true" /> Print</button></div></header>
        <div className="se-table-scroll"><table className="se-table"><thead><tr>{(tab === 'upcoming' ? ['#', 'Subject', 'Subject Code', 'Exam Name', 'Exam Date', 'Day', 'Time', 'Duration', 'Type', 'Centre', 'Status', 'Action'] : ['#', 'Subject', 'Subject Code', 'Exam Date', 'Day', 'Start Time', 'End Time', 'Duration', 'Type', 'Room', 'Status', 'Action']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{showRows.map((row, index) => <tr key={row.examScheduleId}><td>{index + 1}</td><td>{text(row.subjectName)}</td><td>{text(row.subjectCode)}</td>{tab === 'upcoming' && <td>{text(row.examName)}</td>}<td>{date(row.examDate)}</td><td>{day(row.examDate)}</td>{tab === 'upcoming' ? <td>{clock(row.startTime)} – {clock(row.endTime)}</td> : <><td>{clock(row.startTime)}</td><td>{clock(row.endTime)}</td></>}<td>{durationLabel(row.durationMinutes)}</td><td>{text(row.examTypeName)}</td><td>{text(row.classroomName || row.classroomCode)}</td><td><Status value={row.computedStatus} /></td><td><button type="button" className="se-view" onClick={() => setSelected(row)}><FiEye aria-hidden="true" /> View</button></td></tr>)}{showRows.length === 0 && <tr><td colSpan={12}><div className="se-empty"><FiCalendar aria-hidden="true" /><strong>No examination records found</strong><span>{rows.length ? 'Try changing or clearing your search and filters.' : 'No examination schedule has been published for your section.'}</span></div></td></tr>}</tbody></table></div>
        <footer className="se-table-footer"><span>Showing {showRows.length} examination{showRows.length === 1 ? '' : 's'}</span></footer>
      </section>}
      <Instructions rows={rows} />
    </>}
    {selected && <Details row={selected} onClose={() => setSelected(null)} />}
  </main>
}

function HallTicket({ profile }) {
  return <section className="se-panel se-hall-ticket"><div className="se-empty"><FiFileText aria-hidden="true" /><strong>Hall tickets are not available yet</strong><span>The college has not published a student hall-ticket download service. This page will show your ticket only when the official service is connected.</span></div><dl className="se-profile-strip">{[['Student', profile.fullName], ['Registration Number', profile.registrationNumber || profile.identifier], ['Department', profile.department], ['Course', profile.course], ['Branch', profile.branch], ['Semester', profile.semester]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl><button className="se-disabled-download" type="button" disabled><FiDownload aria-hidden="true" /> Download Hall Ticket PDF</button></section>
}

function Results({ rows, error }) {
  if (error) return <section className="se-panel"><div className="se-error" role="alert">{error}</div></section>
  const subjects = rows.flatMap(result => (result.subjects || []).map(subject => ({ ...subject, examName: result.examName, sgpa: result.sgpa, cgpa: result.cgpa, overallStatus: result.resultStatus })))
  return <section className="se-panel"><header className="se-panel-heading"><div><h2>Published Results</h2><p>Officially published marks only</p></div></header>{subjects.length ? <><div className="se-result-summary">{[['Total Marks', rows.reduce((sum, row) => sum + Number(row.totalMarksObtained || 0), 0)], ['Maximum Marks', rows.reduce((sum, row) => sum + Number(row.totalMaximumMarks || 0), 0)], ['SGPA', text(rows.at(-1)?.sgpa)], ['CGPA', text(rows.at(-1)?.cgpa)], ['Result', text(rows.at(-1)?.resultStatus)]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="se-table-scroll"><table className="se-table"><thead><tr>{['Examination', 'Subject', 'Subject Code', 'Internal Marks', 'External Marks', 'Total Marks', 'Maximum Marks', 'Grade', 'Credits', 'Result Status'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{subjects.map((subject, index) => <tr key={`${subject.subjectId}-${index}`}><td>{text(subject.examName)}</td><td>{text(subject.subjectName)}</td><td>{text(subject.subjectCode)}</td><td>—</td><td>—</td><td>{text(subject.marksObtained)}</td><td>{text(subject.maximumMarks)}</td><td>{text(subject.grade)}</td><td>{text(subject.credits)}</td><td><Status value={subject.status || 'Published'} /></td></tr>)}</tbody></table></div></> : <div className="se-empty"><FiBarChart2 aria-hidden="true" /><strong>No published results</strong><span>Your official results will appear here after they are released by the examination office.</span></div>}</section>
}

function Instructions({ rows }) {
  const instructions = [...new Set(rows.map(row => row.instructions).filter(value => value && String(value).trim()))]
  return <aside className="se-instructions"><FiCheckCircle aria-hidden="true" /><div><strong>Important Examination Instructions</strong>{instructions.length ? <ul>{instructions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>No examination instructions have been published by your college.</p>}</div></aside>
}

function Details({ row, onClose }) {
  const fields = [['Examination Name', row.examName], ['Subject', row.subjectName], ['Subject Code', row.subjectCode], ['Examination Type', row.examTypeName], ['Semester', row.semesterName], ['Examination Date', date(row.examDate)], ['Day', day(row.examDate)], ['Reporting Time', clock(row.reportingTime)], ['Start Time', clock(row.startTime)], ['End Time', clock(row.endTime)], ['Duration', durationLabel(minutesBetween(row.startTime, row.endTime))], ['Examination Centre', row.classroomName || row.classroomCode], ['Room Number', row.classroomCode], ['Status', row.computedStatus]]
  return <div className="se-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="se-modal" role="dialog" aria-modal="true" aria-labelledby="se-modal-title"><header><div><h2 id="se-modal-title">Examination Details</h2><p>Official schedule information for this subject.</p></div><button type="button" aria-label="Close details" onClick={onClose}>×</button></header><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl><section className="se-detail-instructions"><strong>Important Instructions</strong><p>{text(row.instructions)}</p></section><footer><button type="button" onClick={onClose}>Close</button></footer></section></div>
}
