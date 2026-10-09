import ModuleAvailability from '../../../components/ModuleAvailability'
﻿import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import { useAcademic } from '../../../context/AcademicContext'
import resultsService from '../../../services/resultsService'
import { gradeScreens } from './gradeScreens'
import { backlogRows, defaultBands, flattenResults, gradeFor, summarize, validateBands, weightedGpa } from './gradeResultModel'
import { sortResultRows } from './gradeResultModel'
import GradePolicyLab from './GradePolicyLab'
import { PreviewComparison, ResultInsights, ResultQuality, StudentSemesterSummary } from './ResultInsights'
import './GradeResultWorkspace.css'

const resultColumns = [['studentName', 'Student'], ['registrationNumber', 'Registration No.'], ['semester', 'Semester'], ['department', 'Department'], ['subjectCode', 'Subject Code'], ['subjectName', 'Subject'], ['examType', 'Examination'], ['totalMarks', 'Marks'], ['maximumMarks', 'Maximum'], ['percentage', 'Score %'], ['grade', 'Grade'], ['gradePoint', 'Points'], ['status', 'Result']].map(([key, label]) => ({ key, label }))
const summaryColumns = [['group', 'Group'], ['students', 'Students'], ['subjects', 'Assessments'], ['passed', 'Passed'], ['failed', 'Failed'], ['pending', 'Pending'], ['passRate', 'Assessment Pass Rate']].map(([key, label]) => ({ key, label }))
const readBands = key => { try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(saved) && !validateBands(saved) ? saved : defaultBands.map(band => ({ ...band })) } catch { return defaultBands.map(band => ({ ...band })) } }
function LocalGradeResultWorkspace({ screen }) {
  const academic = useAcademic()
  const scope = `${academic.selectedCollegeId || 'none'}:${academic.selectedAcademicYearId || 'none'}`
  return <DashboardLayout><Workspace key={`${scope}:${screen}`} screen={screen} academic={academic} scope={scope} /></DashboardLayout>
}
function Workspace({ screen, academic, scope }) {
  const definition = gradeScreens.find(item => item.slug === screen)
  const policyKey = `cms-grade-policy:${scope}`
  const [bands, setBands] = useState(() => readBands(policyKey))
  const [savedBands, setSavedBands] = useState(() => readBands(policyKey))
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(screen !== 'grade-configuration' && Boolean(academic.selectedCollegeId))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [query, setQuery] = useState('')
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [exam, setExam] = useState('')
  const [student, setStudent] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState(false)
  const [sort, setSort] = useState('default')
  const [pageSize, setPageSize] = useState(10)
  const { selectedCollegeId, selectedAcademicYearId, scopeRecords } = academic
  const configuration = screen === 'grade-configuration'
  useEffect(() => {
    if (configuration || !selectedCollegeId) return
    let current = true
    resultsService.getResults({ collegeId: selectedCollegeId, academicYearId: selectedAcademicYearId || undefined }).then(data => { if (current) setSheets(Array.isArray(data) ? data : []) }).catch(() => { if (current) { setSheets([]); setError('Unable to load results. Retry or check your API connection.') } }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [configuration, selectedCollegeId, selectedAcademicYearId, refresh])
  const rows = useMemo(() => {
    // Use the existing hierarchy resolver as well as request filters to enforce college isolation.
    const scoped = scopeRecords(sheets)
    return flattenResults(scoped).filter(row => !selectedAcademicYearId || String(row.academicYearId) === String(selectedAcademicYearId))
  }, [sheets, scopeRecords, selectedAcademicYearId])
  const options = key => [...new Set(rows.map(row => row[key]).filter(Boolean))].sort()
  const students = [...new Map(rows.filter(row => row.studentId).map(row => [row.studentId, { id: row.studentId, name: `${row.studentName || row.studentId}${row.registrationNumber ? ` (${row.registrationNumber})` : ''}` }])).values()]
  const studentMode = screen === 'student-result' || screen === 'consolidated-marks-memo'
  const baseRows = screen === 'backlog-report' ? backlogRows(rows) : rows
  const filtered = baseRows.filter(row => (!semester || row.semester === semester) && (!department || row.department === department) && (!exam || row.examType === exam) && (!status || row.status.toLowerCase() === status.toLowerCase()) && (!studentMode || student && row.studentId === student) && (!query || Object.values(row).some(value => String(value ?? '').toLowerCase().includes(query.toLowerCase()))))
  const generated = preview ? filtered.map(row => {
    const valid = row.percentage !== null && row.totalMarks >= 0 && row.totalMarks <= row.maximumMarks
    const band = valid ? gradeFor(row.percentage, savedBands) : null
    return { ...row, grade: band?.grade || '-', gradePoint: band ? Number(band.points) : null, status: band ? band.pass ? 'Passed' : 'Failed' : 'Incomplete' }
  }) : []
  let report = filtered
  let columns = resultColumns
  if (screen === 'semester-result' || screen === 'department-result') { report = summarize(filtered, screen === 'semester-result' ? 'semester' : 'department'); columns = summaryColumns.map(column => column.key === 'group' ? { ...column, label: screen === 'semester-result' ? 'Semester' : 'Department' } : column) }
  if (screen === 'consolidated-marks-memo') columns = [...resultColumns, { key: 'credits', label: 'Credits' }]
  if (screen === 'backlog-report') columns = [...resultColumns, { key: 'examDate', label: 'Attempt Date' }]
  if (screen === 'result-generation') report = generated
  report = sortResultRows(report, sort)
  const pages = Math.max(1, Math.ceil(report.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = report.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const gpa = weightedGpa(filtered)
  const analyticsRows = screen === 'result-generation' ? generated : filtered
  const selectedStudent = students.find(item => item.id === student)
  const clear = () => { setQuery(''); setSemester(''); setDepartment(''); setExam(''); setStatus(''); setPage(1); setPreview(false) }
  const updateFilter = setter => event => { setter(event.target.value); setPage(1); setPreview(false) }
  const savePolicy = event => {
    event.preventDefault(); const problem = validateBands(bands)
    if (problem) { setError(problem); return }
    if (!selectedCollegeId) { setError('Select a college before saving a policy.'); return }
    const normalized = bands.map(band => ({ ...band, grade: band.grade.trim().toUpperCase(), min: Number(band.min), max: Number(band.max), points: Number(band.points) }))
    try { localStorage.setItem(policyKey, JSON.stringify(normalized)); setSavedBands(normalized); setError(''); setNotice('Grade policy saved locally for this college and academic year.') } catch { setError('Unable to save the grade policy in browser storage.') }
  }
  return <section className={`grm grm--${screen}`}>
    <PageHeader title={definition.label} subtitle="Grade System & Result Management" compactSummary={[
      { label: 'Available results', value: rows.length },
      { label: 'Students', value: students.length },
      { label: 'Grade bands', value: savedBands.length },
      { label: 'Scope', value: academic.selectedAcademicYear?.name || 'Selected college' },
    ]} breadcrumb={[{ label: 'Grade System & Result Management', link: '/grade-result-management' }, definition.label]} />
    <nav className="grm-nav" aria-label="Grade and results screens">{gradeScreens.map(item => <NavLink key={item.slug} to={`/grade-result-management/${item.slug}`}>{item.label}</NavLink>)}</nav>
    {!selectedCollegeId && <p className="grm-notice">Select a college in the sidebar to continue.</p>}
    {error && <p className="grm-error" role="alert">{error}</p>}{notice && <p className="grm-notice" role="status">{notice}</p>}
    {configuration && <GradePolicyLab bands={bands} savedBands={savedBands} />}
    {!configuration && !loading && !error && analyticsRows.length > 0 && <><ResultInsights rows={analyticsRows} title={studentMode ? 'Student performance insights' : 'Result analytics'} /><ResultQuality rows={filtered} /></>}
    {configuration ? <article className="erp-card grm-card"><header className="erp-card-header"><div><h2 className="erp-card-title">Grading policy</h2><p className="erp-card-subtitle">Local preview policy. Ranges include the minimum and exclude the maximum, except 100%. Official backend grading is unchanged.</p></div><button type="button" className="grm-button" onClick={() => { setBands(defaultBands.map(band => ({ ...band }))); setNotice('Default bands loaded. Save to apply them locally.'); setError('') }}>Load defaults</button></header><form onSubmit={savePolicy}><div className="grm-table-scroll"><table className="erp-table"><thead><tr>{['Grade', 'Minimum %', 'Maximum %', 'Grade Points', 'Passing Grade', 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{bands.map((band, index) => <tr key={index}>{['grade', 'min', 'max', 'points'].map(field => <td key={field}><input className="grm-band-input" aria-label={`${field} for band ${index + 1}`} required type={field === 'grade' ? 'text' : 'number'} min={field === 'grade' ? undefined : 0} max={field === 'points' ? 10 : field === 'grade' ? undefined : 100} step="any" value={band[field]} onChange={event => setBands(bands.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))} /></td>)}<td><input type="checkbox" aria-label={`Passing grade ${index + 1}`} checked={band.pass} onChange={event => setBands(bands.map((item, i) => i === index ? { ...item, pass: event.target.checked } : item))} /></td><td><button className="grm-button" type="button" aria-label={`Remove band ${index + 1}`} onClick={() => setBands(bands.filter((_, i) => i !== index))}><FiTrash2 /></button></td></tr>)}</tbody></table></div><footer className="grm-footer"><button type="button" className="grm-button" onClick={() => setBands([...bands, { grade: '', min: '', max: '', points: '', pass: true }])}><FiPlus />Add band</button><button className="grm-button grm-button--primary" disabled={!selectedCollegeId}>Save local policy</button></footer></form></article> : <article className="erp-card grm-card"><header className="erp-card-header"><div><h2 className="erp-card-title">{screen === 'consolidated-marks-memo' ? 'Consolidated academic record' : definition.label + ' records'}</h2><p className="erp-card-subtitle">{screen === 'result-generation' ? 'Calculate a preview from saved marks using your local grade policy. This does not publish or overwrite results.' : screen === 'backlog-report' ? 'Failed subjects from the latest available dated attempt in each assessment. Undated records cannot confirm attempt order; records without student or subject identifiers are excluded.' : 'View results for the selected college and academic year.'}</p></div><button className="grm-button" disabled={loading || !selectedCollegeId} onClick={() => { setPreview(false); setLoading(true); setError(''); setRefresh(refresh + 1) }}><FiRefreshCw />Refresh</button></header>
      {studentMode && <div className="grm-student-picker"><label>Student<select value={student} onChange={updateFilter(setStudent)}><option value="">Select a student</option>{students.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{selectedStudent && <strong>{selectedStudent.name}</strong>}</div>}
      <FilterPanel className="grm-filters" active={Boolean(query || semester || department || exam || status)} onClear={clear} actions={<ExportMenu rows={report} columns={columns} filename={`${screen}.csv`} title={definition.label} loading={loading} />}><label className="grm-search"><FiSearch /><input aria-label="Search result records" placeholder="Search student, registration or subject" value={query} onChange={updateFilter(setQuery)} /></label>{[['Semester', semester, setSemester, options('semester')], ['Department', department, setDepartment, options('department')], ['Examination', exam, setExam, options('examType')], ['Result', status, setStatus, ['Passed', 'Failed', 'Pending']]].map(([label, value, setter, values]) => <label className="grm-filter" key={label}>{label}<select value={value} onChange={updateFilter(setter)}><option value="">All {label.toLowerCase()}s</option>{values.map(item => <option key={item}>{item}</option>)}</select></label>)}</FilterPanel>
      {screen === 'result-generation' && <div className="grm-generation"><span>{filtered.length} assessment records / {savedBands.length} grade bands</span><button className="grm-button grm-button--primary" disabled={loading || !filtered.length || !!error} onClick={() => { setPreview(true); setPage(1) }}>Generate preview</button></div>}
      {screen === 'result-generation' && preview && !loading && <PreviewComparison before={filtered} after={generated} />}
      {studentMode && student && filtered.length > 0 && !loading && <StudentSemesterSummary rows={filtered} />}
      {screen === 'consolidated-marks-memo' && student && <div className="grm-memo"><div><small>Student</small><strong>{selectedStudent?.name}</strong></div><div><small>Assessments</small><strong>{filtered.length}</strong></div><div><small>Weighted grade point average</small><strong>{gpa === null ? 'Unavailable' : gpa.toFixed(2)}</strong></div><p>Informational memo from available assessment records. Credit weighting requires grade points and credits on every record; this is not an official CGPA.</p></div>}
      <div className="grm-register-tools"><span>{report.length} records / {Math.min((currentPage - 1) * pageSize + 1, report.length)}-{Math.min(currentPage * pageSize, report.length)} shown</span><div><label>Sort by<select value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}><option value="default">Default order</option><option value="name">Name A-Z</option>{screen !== 'semester-result' && screen !== 'department-result' && <><option value="score-desc">Highest score</option><option value="score-asc">Lowest score</option></>}</select></label><label>Rows<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label></div></div>
      {loading ? <p className="grm-empty" role="status">Loading results...</p> : <><div className="grm-table-scroll"><table className="erp-table grm-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row.id || row.group || index}>{columns.map(column => <td key={column.key}>{column.key === 'status' ? <span className={`grm-badge grm-badge--${row.status.toLowerCase()}`}>{row.status}</span> : column.key === 'percentage' ? row.percentage === null ? '-' : row.percentage.toFixed(2) : row[column.key] ?? '-'}</td>)}</tr>)}</tbody></table></div>{!report.length && <div className="grm-empty"><h3>{error ? 'Results could not be loaded' : studentMode && !student ? 'Select a student' : screen === 'result-generation' && !preview ? 'Ready to generate a preview' : 'No records found'}</h3><p>{error ? 'Use Refresh to retry.' : 'Records appear here when matching results are available.'}</p></div>}<TablePagination page={currentPage} totalPages={pages} onPageChange={setPage} /></>}
    </article>}
  </section>
}

export default function GradeResultWorkspace(props) { return <ModuleAvailability title="Results" dependency="Official result processing, approved grading policies, transcripts and publication APIs are unavailable. Local grade previews are not official results."><LocalGradeResultWorkspace {...props} /></ModuleAvailability> }
