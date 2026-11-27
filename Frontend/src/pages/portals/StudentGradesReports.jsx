import { useEffect, useMemo, useState } from 'react'
import { FiAward, FiBarChart2, FiCheckCircle, FiDownload, FiEye, FiFileText, FiInfo, FiPrinter, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import { profileApi, studentExaminationApi } from '../../api/apiEndpoints'
import './student-grades-reports.css'

const text = value => value == null || String(value).trim() === '' ? '—' : String(value)
const number = value => Number.isFinite(Number(value)) ? Number(value) : null
const fmt = value => number(value) == null ? '—' : Number(value).toFixed(2).replace(/\.00$/, '')
const idOf = row => String(row.examId ?? row.id ?? '')
const rowsOf = value => { if (!Array.isArray(value)) throw new Error('The results service returned an invalid response.'); return value }
const options = (results, key) => [...new Set(results.map(row => row.exam?.[key]).filter(value => value != null && String(value).trim()))]
const resultTone = value => /pass|clear/i.test(value || '') ? 'pass' : /fail|backlog/i.test(value || '') ? 'fail' : 'neutral'

function Metric({ icon: Icon, label, value, hint, tone }) {
  return <article className={`sgr-metric sgr-metric--${tone}`}><span className="sgr-metric-icon"><Icon aria-hidden="true" /></span><span><small>{label}</small><strong>{value}</strong><em>{hint}</em></span></article>
}

function Status({ value }) { return <span className={`sgr-status sgr-status--${resultTone(value)}`}>{text(value)}</span> }

function ResultDetails({ result, exam, onClose }) {
  if (!result) return null
  return <div className="sgr-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="sgr-modal" role="dialog" aria-modal="true" aria-labelledby="sgr-modal-title">
    <header><div><small>Published academic record</small><h2 id="sgr-modal-title">{text(exam?.examName || exam?.name || `Exam ${result.examId}`)}</h2></div><button className="sgr-icon-button" onClick={onClose} aria-label="Close"><FiX /></button></header>
    <div className="sgr-detail-summary"><span><small>Academic year</small><strong>{text(exam?.academicYearName)}</strong></span><span><small>Semester</small><strong>{text(exam?.semesterName)}</strong></span><span><small>Percentage</small><strong>{fmt(result.percentage)}{number(result.percentage) == null ? '' : '%'}</strong></span><span><small>Grade / status</small><strong>{text(result.overallGrade)} · {text(result.resultStatus)}</strong></span></div>
    <div className="sgr-table-wrap"><table><thead><tr><th>Subject</th><th>Code</th><th>Credits</th><th>Marks</th><th>Maximum</th><th>%</th><th>Grade</th><th>Status</th></tr></thead><tbody>{(result.subjects || []).map((subject, index) => <tr key={subject.resultId ?? `${subject.subjectId}-${index}`}><td>{text(subject.subjectName)}</td><td>{text(subject.subjectCode)}</td><td>{fmt(subject.credits)}</td><td>{subject.isAbsent ? 'Absent' : fmt(subject.marksObtained)}</td><td>{fmt(subject.maximumMarks)}</td><td>{number(subject.percentage) == null ? '—' : `${fmt(subject.percentage)}%`}</td><td>{text(subject.grade)}</td><td><Status value={subject.resultStatus} /></td></tr>)}</tbody></table></div>
    <footer><span>Internal and external marks are not separately provided.</span><button className="sgr-button" onClick={() => window.dispatchEvent(new Event('student-result-print'))}><FiPrinter /> Print / Save PDF</button></footer>
  </section></div>
}

export default function StudentGradesReports() {
  const [state, setState] = useState({ loading: true, profile: null, results: [], error: '' })
  const [retry, setRetry] = useState(0)
  const [tab, setTab] = useState('reports')
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [type, setType] = useState('')
  const [filters, setFilters] = useState({ query: '', year: '', semester: '', type: '' })
  const [selected, setSelected] = useState(null)
  const [printRequested, setPrintRequested] = useState(false)

  useEffect(() => {
    let active = true
    setState(current => ({ ...current, loading: true, error: '' }))
    profileApi.getProfile().then(async profile => {
      if (!/^\d+$/.test(String(profile.studentId || '')) || Number(profile.studentId) < 1) throw new Error('Your student record is not linked to this account.')
      const [rawResults, rawExams] = await Promise.all([studentExaminationApi.getPublishedResults(profile.studentId), studentExaminationApi.getExams().catch(() => [])])
      const exams = rowsOf(rawExams)
      const byId = new Map(exams.map(exam => [idOf(exam), exam]))
      const results = rowsOf(rawResults).map(result => ({ ...result, exam: byId.get(String(result.examId)) || {} }))
        .filter(result => Array.isArray(result.subjects))
        .sort((a, b) => Number(b.examId) - Number(a.examId))
      if (active) setState({ loading: false, profile, results, error: '' })
    }).catch(error => { if (active) setState({ loading: false, profile: null, results: [], error: error.message || 'Unable to load published results.' }) })
    return () => { active = false }
  }, [retry])

  useEffect(() => {
    if (!selected || !printRequested) return undefined
    const timer = window.setTimeout(() => { window.print(); setPrintRequested(false) }, 120)
    return () => window.clearTimeout(timer)
  }, [selected, printRequested])

  useEffect(() => {
    const print = () => setPrintRequested(true)
    window.addEventListener('student-result-print', print)
    return () => window.removeEventListener('student-result-print', print)
  }, [])

  const years = options(state.results, 'academicYearName')
  const semesters = options(state.results, 'semesterName')
  const types = options(state.results, 'examTypeName')
  const filtered = useMemo(() => state.results.filter(result => {
    const haystack = `${result.exam?.examName || result.exam?.name || ''} ${result.exam?.examTypeName || ''} ${(result.subjects || []).map(subject => `${subject.subjectName || ''} ${subject.subjectCode || ''}`).join(' ')}`.toLowerCase()
    return (!filters.query || haystack.includes(filters.query.toLowerCase())) && (!filters.year || result.exam?.academicYearName === filters.year) && (!filters.semester || result.exam?.semesterName === filters.semester) && (!filters.type || result.exam?.examTypeName === filters.type)
  }), [state.results, filters])
  const latest = state.results[0]
  const creditSum = latest?.subjects?.reduce((sum, subject) => sum + (number(subject.credits) || 0), 0)
  const subjects = filtered.flatMap(result => (result.subjects || []).map(subject => ({ ...subject, exam: result.exam, examId: result.examId })))
  const reportRows = tab === 'semester' ? filtered : filtered

  const submitSearch = event => { event.preventDefault(); setFilters({ query: query.trim(), year, semester, type }) }
  const clearSearch = () => { setQuery(''); setYear(''); setSemester(''); setType(''); setFilters({ query: '', year: '', semester: '', type: '' }) }

  return <main className="portal-page sgr-page">
    <header className="sgr-heading"><span className="sgr-heading-icon"><FiAward /></span><div><h1>Grades &amp; Reports</h1><p>View your published academic results and print reports.</p></div></header>
    <section className="sgr-metrics" aria-label="Academic summary">
      <Metric icon={FiAward} label="Overall CGPA" value={fmt(latest?.cgpa)} hint="Latest published result" tone="blue" />
      <Metric icon={FiBarChart2} label="SGPA" value={fmt(latest?.sgpa)} hint={text(latest?.exam?.semesterName)} tone="purple" />
      <Metric icon={FiCheckCircle} label="Credits" value={creditSum == null ? '—' : fmt(creditSum)} hint="In latest published result" tone="green" />
      <Metric icon={FiFileText} label="Result Status" value={text(latest?.resultStatus)} hint={latest ? 'Published' : 'No published results'} tone="orange" />
    </section>
    <form className="sgr-filters" onSubmit={submitSearch}>
      <label className="sgr-query"><FiSearch /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search subject, code or examination…" aria-label="Search published results" /></label>
      <select value={year} onChange={event => setYear(event.target.value)} aria-label="Academic year"><option value="">All academic years</option>{years.map(value => <option key={value}>{value}</option>)}</select>
      <select value={semester} onChange={event => setSemester(event.target.value)} aria-label="Semester"><option value="">All semesters</option>{semesters.map(value => <option key={value}>{value}</option>)}</select>
      <select value={type} onChange={event => setType(event.target.value)} aria-label="Examination type"><option value="">All exam types</option>{types.map(value => <option key={value}>{value}</option>)}</select>
      <button className="sgr-button sgr-button--primary" type="submit"><FiSearch /> Search</button><button className="sgr-button" type="button" onClick={clearSearch}><FiRefreshCw /> Clear</button>
    </form>
    <nav className="sgr-tabs" aria-label="Grades and reports views">{[['reports', 'Grade Reports'], ['semester', 'Semester-wise Marks'], ['subject', 'Subject-wise Marks'], ['download', 'Download Reports']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{id === 'download' ? <FiDownload /> : id === 'subject' ? <FiFileText /> : <FiBarChart2 />}{label}</button>)}</nav>
    {state.loading ? <section className="sgr-message" role="status">Loading published grades…</section> : state.error ? <section className="sgr-message sgr-message--error" role="alert">{state.error}<button className="sgr-button" onClick={() => setRetry(value => value + 1)}>Retry</button></section> : !state.results.length ? <section className="sgr-message"><FiInfo /><div><strong>No published results are available.</strong><p>Results will appear here after the examination office publishes them.</p></div></section> : <>
      {tab === 'download' ? <section className="sgr-downloads"><div className="sgr-chart-title"><div><h2>Download Reports</h2><p>Print a report from your published result data. In the print dialog, choose Save as PDF.</p></div></div>{filtered.length ? filtered.map(result => <article key={result.examId} className="sgr-download-card"><span className="sgr-download-icon"><FiFileText /></span><span><strong>{text(result.exam?.examName || result.exam?.name || `Exam ${result.examId}`)}</strong><small>{text(result.exam?.academicYearName)} · {text(result.exam?.semesterName)} · {result.subjects.length} subjects</small></span><button className="sgr-button" onClick={() => { setSelected(result); setPrintRequested(true) }}><FiPrinter /> Print / Save PDF</button></article>) : <p className="sgr-empty">No published reports match these filters.</p>}</section> : <>
        {tab === 'reports' && <section className="sgr-chart"><div className="sgr-chart-title"><div><h2>Performance overview</h2><p>Percentage for each published examination</p></div></div>{filtered.length ? <div className="sgr-bars" role="img" aria-label="Published result percentages"><div className="sgr-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>{filtered.slice().reverse().map(result => { const pct = Math.max(0, Math.min(100, number(result.percentage) || 0)); return <div className="sgr-bar-column" key={result.examId}><span>{fmt(pct)}%</span><div className="sgr-bar-track"><i style={{ height: `${pct}%` }} /></div><small>{text(result.exam?.examName || result.exam?.name || `Exam ${result.examId}`)}</small></div> })}</div> : <p className="sgr-empty">No results match these filters.</p>}</section>}
        <section className="sgr-table-card"><header><div><h2>{tab === 'subject' ? 'Subject-wise Marks' : tab === 'semester' ? 'Semester-wise Marks' : 'Published Grade Reports'}</h2><p>{tab === 'subject' ? 'Published marks by subject' : 'Only published examination results are shown'}</p></div><button className="sgr-button" onClick={() => { if (filtered[0]) { setSelected(filtered[0]); setPrintRequested(true) } }}><FiPrinter /> Print</button></header><div className="sgr-table-wrap"><table><thead>{tab === 'subject' ? <tr><th>Subject</th><th>Code</th><th>Examination</th><th>Academic Year</th><th>Semester</th><th>Internal</th><th>External</th><th>Total</th><th>Maximum</th><th>Grade</th><th>Action</th></tr> : <tr><th>#</th><th>Academic Year</th><th>Semester</th><th>Examination</th><th>Result Date</th><th>Total Marks</th><th>Obtained</th><th>Percentage</th><th>Grade</th><th>Status</th><th>Action</th></tr>}</thead><tbody>{tab === 'subject' ? subjects.map((subject, index) => <tr key={`${subject.examId}-${subject.subjectId}-${index}`}><td>{text(subject.subjectName)}</td><td>{text(subject.subjectCode)}</td><td>{text(subject.exam?.examName || subject.exam?.name || `Exam ${subject.examId}`)}</td><td>{text(subject.exam?.academicYearName)}</td><td>{text(subject.exam?.semesterName)}</td><td>—</td><td>—</td><td>{subject.isAbsent ? 'Absent' : fmt(subject.marksObtained)}</td><td>{fmt(subject.maximumMarks)}</td><td>{text(subject.grade)}</td><td><button className="sgr-button sgr-button--small" onClick={() => setSelected(state.results.find(result => String(result.examId) === String(subject.examId)))}><FiEye /> View</button></td></tr>) : reportRows.map((result, index) => <tr key={result.examId}><td>{index + 1}</td><td>{text(result.exam?.academicYearName)}</td><td>{text(result.exam?.semesterName)}</td><td>{text(result.exam?.examName || result.exam?.name || `Exam ${result.examId}`)}</td><td>—</td><td>{fmt(result.totalMaximumMarks)}</td><td>{fmt(result.totalMarksObtained)}</td><td>{number(result.percentage) == null ? '—' : `${fmt(result.percentage)}%`}</td><td>{text(result.overallGrade)}</td><td><Status value={result.resultStatus} /></td><td><button className="sgr-button sgr-button--small" onClick={() => setSelected(result)}><FiEye /> View</button></td></tr>)}</tbody></table></div><footer>Showing {tab === 'subject' ? subjects.length : reportRows.length} published {tab === 'subject' ? 'subject records' : 'results'}</footer></section>
      </>}
      <aside className="sgr-note"><FiInfo /><div><strong>Important Information</strong><ul><li>Only examination results published for your student account are displayed.</li><li>Result dates and separate internal/external marks are not provided by the results service.</li><li>Contact the examination office if a published record appears incorrect.</li></ul></div></aside>
    </>}
    <ResultDetails result={selected} exam={selected?.exam} onClose={() => setSelected(null)} />
  </main>
}
