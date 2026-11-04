import LiveExaminationWorkspace from '../LiveExaminationWorkspace'
import { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../../components/SearchableSelect'
import { useEffect as reactImports_useEffect, useState as reactImports_useState, useMemo as reactImports_useMemo, useRef as reactImports_useRef, useCallback as reactImports_useCallback } from 'react'
import { Link as react_router_domImports_Link, useLocation as react_router_domImports_useLocation, useNavigate as react_router_domImports_useNavigate } from 'react-router-dom'
import DashboardLayoutImports_default from '../../../layouts/DashboardLayout'
import ModuleAvailabilityImports_default from '../../../components/ModuleAvailability'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2, FiChevronDown, FiChevronUp, FiX, FiToggleLeft, FiToggleRight } from 'react-icons/fi'
import ExportMenuImports_default from '../../../components/ExportMenu'
import { fetchExams as collegeApiImports_fetchExams, hasExamSetup as collegeApiImports_hasExamSetup, fetchScheduleRows as collegeApiImports_fetchScheduleRows, deleteScheduleApi as collegeApiImports_deleteScheduleApi } from '../../../auth/collegeApi'
import { useAcademic as useAcademicImports_useAcademic } from '../../../context/AcademicContext'
import TablePaginationImports_default from '../../../components/TablePagination'
import StatusBadgeImports_default from '../../../components/StatusBadge'
import './ExaminationSetup.css'

const fetchExams = collegeApiImports_fetchExams
const hasExamSetup = collegeApiImports_hasExamSetup
const fetchScheduleRows = collegeApiImports_fetchScheduleRows

// Keep guessed API field names centralized for easy backend mapping changes.
function normalize(schedule, index = 0) {
  const scheduleId = schedule.scheduleId ?? schedule.id ?? index
  const rawDate = schedule.examDate ?? schedule.scheduleDate ?? schedule.date ?? ''
  const examDate = rawDate ? String(rawDate).split('T')[0].split(' ')[0].trim() : ''
  let status = schedule.statusName ?? schedule.status ?? 'Scheduled'
  if (status === '1' || status === 1) status = 'Active'
  if (status === '0' || status === 0) status = 'Inactive'
  if (examDate && (status === 'Scheduled' || status === 'Active')) {
    const today = new Date().toISOString().slice(0, 10)
    if (examDate < today) {
      status = 'Completed'
    }
  }
  return { ...schedule, id: scheduleId, scheduleId,
    examId: schedule.examId ?? schedule.examinationId,
    examination: schedule.examName ?? schedule.examinationName ?? schedule.examination ?? '',
    examSession: schedule.examSession ?? schedule.sessionType ?? schedule.regularSupply ?? 'Regular',
    subject: schedule.subjectName ?? schedule.subject ?? '',
    date: examDate,
    startTime: schedule.startTime ?? '', endTime: schedule.endTime ?? '',
    room: schedule.roomName ?? schedule.hallName ?? schedule.room ?? schedule.venue ?? '',
    status,
  }
}

function ExaminationSummary({ examCount }) {
  const [apiCounts, setApiCounts] = reactImports_useState({ totalCount: null, loading: true, error: '' })
  reactImports_useEffect(() => {
    let active = true
    Promise.all([
      fetchExams({ Page: 1, PageSize: 1 }),
      hasExamSetup(),
    ]).then(([examResult, setupExists]) => {
      if (active) setApiCounts({ totalCount: setupExists ? examResult.totalCount : 0, loading: false, error: '' })
    }).catch(error => {
      if (active) setApiCounts(current => ({ ...current, loading: false, error: error?.message || 'Unable to load examination totals.' }))
    })
    return () => { active = false }
  }, [])

  const examinationTotal = examCount ?? (apiCounts.loading ? '…' : apiCounts.error ? '—' : apiCounts.totalCount)
  return <div className="examination-setup__summary" aria-label="Examination setup totals">
    <div title={apiCounts.error}><strong>{examinationTotal}</strong><small>Examinations</small></div>
  </div>
}

// CreateExamination screen and private helpers.
const CreateExaminationScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useEffect = reactImports_useEffect
const useState = reactImports_useState
const Link = react_router_domImports_Link
const useLocation = react_router_domImports_useLocation
const useNavigate = react_router_domImports_useNavigate
const DashboardLayout = DashboardLayoutImports_default
const useAcademic = useAcademicImports_useAcademic

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination']]
const key = 'cms-examination-setup-demo-v1'
const blank = { name: '', academicYear: '', term: '', startDate: '', endDate: '', description: '', status: 'Draft' }
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

function CreateExamination() {
  const { currentAcademicYear } = useAcademic()
  const activeYearName = currentAcademicYear?.name || currentAcademicYear?.academicYearName || ''
  const location = useLocation()
  const navigate = useNavigate()
  const summaryData = load()
  const existing = location.state?.exam
  const [form, setForm] = useState(() => ({ ...blank, academicYear: activeYearName, ...(existing || {}) }))
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  useEffect(() => { setForm({ ...blank, academicYear: activeYearName, ...(location.state?.exam || {}) }); setErrors({}); setSaved(false) }, [location.state, activeYearName])
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 5000)
    return () => clearTimeout(timer)
  }, [saved])
  const change = (name, value) => { setForm(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })); setSaved(false) }
  const submit = event => {
    event.preventDefault()
    const next = Object.fromEntries(['name', 'academicYear', 'term', 'startDate', 'endDate'].filter(name => !String(form[name] || '').trim()).map(name => [name, 'This field is required.']))
    if (form.startDate && form.endDate && form.endDate < form.startDate) next.endDate = 'End date must be on or after the start date.'
    setErrors(next)
    if (Object.keys(next).length) return
    const data = load()
    const row = { ...form, id: existing?.id || `ex-${Date.now()}` }
    const examinations = data.examinations || []
    data.examinations = existing ? examinations.map(item => item.id === existing.id ? row : item) : [row, ...examinations]
    try { localStorage.setItem(key, JSON.stringify(data)); setSaved(true) } catch { setSaved(false) }
  }

  return <DashboardLayout><main className="examination-setup">
    <header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Create and manage examination cycles.</p></div><ExaminationSummary examCount={summaryData.examinations?.length || 0} /></header>
    <section className="examination-setup__card"><header className="examination-setup__card-header"><div><p>CREATE EXAMINATION</p><h2>Enter examination details and academic period.</h2></div></header>
      <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination').map(([label, path]) => { const isCurrent = path === location.pathname || (path === '/examination-setup/examination-list' && location.pathname === '/examination-setup'); return <Link key={path} to={path} className={isCurrent ? 'active' : ''} aria-current={isCurrent ? 'page' : undefined}>{label}</Link> })}</nav>
      {saved && <div className="examination-setup__success examination-setup__toast" role="status"><span>Examination saved successfully.</span><button type="button" className="examination-setup__toast-close" onClick={() => setSaved(false)} aria-label="Dismiss notification">×</button></div>}
      <div className="examination-setup__form-wrap"><form className="examination-setup__form" onSubmit={submit} noValidate>
        <label><span>Examination Name <b>*</b></span><input value={form.name} aria-invalid={Boolean(errors.name)} onChange={event => change('name', event.target.value)} />{errors.name && <small className="examination-setup__field-error">{errors.name}</small>}</label>
        <label><span>Active Academic Year</span><input value={form.academicYear || activeYearName || 'No active academic year configured'} readOnly aria-label="Active academic year" />{!activeYearName && <small className="examination-setup__field-error">Configure an active academic year before creating examinations.</small>}</label>
        <label><span>Semester / Term <b>*</b></span><ProjectSelect value={form.term} aria-invalid={Boolean(errors.term)} onChange={event => change('term', event.target.value)}><option value="">Select semester / term</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Annual'].map(term => <option key={term}>{term}</option>)}</ProjectSelect>{errors.term && <small className="examination-setup__field-error">{errors.term}</small>}</label>
        <label><span>Start Date <b>*</b></span><input type="date" value={form.startDate} aria-invalid={Boolean(errors.startDate)} onChange={event => change('startDate', event.target.value)} />{errors.startDate && <small className="examination-setup__field-error">{errors.startDate}</small>}</label>
        <label><span>End Date <b>*</b></span><input type="date" value={form.endDate} aria-invalid={Boolean(errors.endDate)} onChange={event => change('endDate', event.target.value)} />{errors.endDate && <small className="examination-setup__field-error">{errors.endDate}</small>}</label>
        <label><span>Status</span><ProjectSelect value={form.status} onChange={event => change('status', event.target.value)}><option>Draft</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></ProjectSelect></label>
        <label className="wide"><span>Description</span><textarea rows="3" value={form.description} onChange={event => change('description', event.target.value)} /></label>
        <footer><button type="button" className="examination-setup__secondary" onClick={() => navigate('/examination-setup/examination-list')}>Cancel</button><button className="examination-setup__primary" type="submit">{existing ? 'Save Changes' : 'Save Examination'}</button></footer>
      </form></div>
    </section>
  </main></DashboardLayout>
}

return { default: CreateExamination }
})()

// ExaminationSetup screen and private helpers.
const ExaminationSetupScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const TablePagination = TablePaginationImports_default
const ModuleAvailability = ModuleAvailabilityImports_default
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const Link = react_router_domImports_Link
const useLocation = react_router_domImports_useLocation
const useNavigate = react_router_domImports_useNavigate
const StatusBadge = StatusBadgeImports_default
const ExportMenu = ExportMenuImports_default
const DashboardLayout = DashboardLayoutImports_default
const useAcademic = useAcademicImports_useAcademic

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const storageKey = 'cms-examination-setup-demo-v1'
const seeds = {
  examinations: [
    { id: 'ex-2026-mid', name: 'Mid Semester Examination', academicYear: '2026-27', examType: 'Mid Semester', term: 'Semester 1', startDate: '2026-10-19', endDate: '2026-10-30', description: 'Mid semester assessment for Semester 1.', status: 'Scheduled' },
    { id: 'ex-2026-prac', name: 'Practical Assessment', academicYear: '2026-27', examType: 'Practical', term: 'Semester 1', startDate: '2026-11-02', endDate: '2026-11-07', description: 'Laboratory practical assessment.', status: 'Draft' },
    { id: 'ex-2025-end', name: 'End Semester Examination', academicYear: '2025-26', examType: 'End Semester', term: 'Semester 2', startDate: '2026-04-06', endDate: '2026-04-24', description: 'End semester examinations.', status: 'Completed' },
  ],
  types: [
    { id: 'type-mid', name: 'Mid Semester', code: 'MID', description: 'Mid term written assessment', status: 'Active' },
    { id: 'type-end', name: 'End Semester', code: 'END', description: 'End term examination', status: 'Active' },
    { id: 'type-practical', name: 'Practical', code: 'PRAC', description: 'Laboratory and practical assessment', status: 'Active' },
  ],
  schedules: [
    { id: 'sch-1', examination: 'Mid Semester Examination', subject: 'Data Structures', date: '2026-10-19', startTime: '09:30', endTime: '12:30', room: 'Exam Hall A', status: 'Scheduled' },
    { id: 'sch-2', examination: 'Mid Semester Examination', subject: 'Database Systems', date: '2026-10-21', startTime: '13:30', endTime: '16:30', room: 'Block B · 204', status: 'Scheduled' },
  ],
  rules: [
    { id: 'rule-1', name: 'Standard Written Exam', description: 'Standard rules for written examinations.', examType: 'End Semester', passingMarks: '40', attendance: '75', attempts: '3', status: 'Active' },
    { id: 'rule-2', name: 'Practical Assessment Rule', description: 'Practical assessment and viva requirements.', examType: 'Practical', passingMarks: '50', attendance: '80', attempts: '2', status: 'Active' },
  ],
}
const readData = () => { try { const value = JSON.parse(localStorage.getItem(storageKey)); return value ? { ...seeds, ...value } : seeds } catch { return seeds } }
const statusClass = status => String(status || '').toLowerCase().replace(/\s+/g, '-')
const dateText = value => {
  if (!value) return '—'
  const clean = String(value).trim()
  const datePart = clean.includes('T') ? clean.split('T')[0] : clean.split(' ')[0]
  const parsed = new Date(`${datePart}T00:00:00`)
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const fallback = new Date(clean)
  return !isNaN(fallback.getTime())
    ? fallback.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : clean
}
const initialForm = { name: '', academicYear: '', examType: '', examSession: 'Regular', term: '', startDate: '', endDate: '', description: '', status: 'Draft' }

function LocalExaminationSetup() {
  const { academicYears = [], currentAcademicYear } = useAcademic()
  const activeYearName = currentAcademicYear?.name || currentAcademicYear?.academicYearName || ''
  const yearOptions = [...new Set([...academicYears.map(year => year.name || year.academicYearName), ...readData().examinations.map(row => row.academicYear)].filter(Boolean))]
  const blankExam = useMemo(() => ({ ...initialForm, academicYear: activeYearName }), [activeYearName])
  const { pathname, state: routeState } = useLocation()
  const navigate = useNavigate()
  const activePath = tabs.some(([, path]) => path === pathname) ? pathname : tabs[0][1]
  const activeTab = tabs.find(([, path]) => path === activePath)?.[0]
  const [data, setData] = useState(readData)
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ status: '', year: '', examination: '', examType: '' })
  const [form, setForm] = useState(blankExam)
  const [editing, setEditing] = useState(null)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch { /* Demo data remains available for this session. */ } }, [data])
  useEffect(() => {
    setQuery(''); setShowFilters(false); setShowEntryForm(false)
    if (activePath === tabs[1][1] && routeState?.exam) { setEditing(routeState.exam.id); setForm({ ...blankExam, ...routeState.exam }); setErrors({}) }
    else if (activePath === tabs[1][1]) { setEditing(null); setForm(blankExam); setErrors({}); setMessage('') }
    if ([tabs[2][1], tabs[3][1], tabs[4][1]].includes(activePath)) { setEditing(null); setForm({}); setErrors({}); setMessage('') }
  }, [activePath, routeState, blankExam])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  const change = (key, value) => { setForm(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: '' })); setMessage('') }
  const save = (event, collection, required, kind) => {
    event.preventDefault()
    const next = Object.fromEntries(required.filter(key => !String(form[key] || '').trim()).map(key => [key, 'This field is required.']))
    if (kind === 'examination' && form.startDate && form.endDate && form.endDate < form.startDate) next.endDate = 'End date must be on or after the start date.'
    if (kind === 'schedule' && form.startTime && form.endTime && form.endTime <= form.startTime) next.endTime = 'End time must be later than start time.'
    if (kind === 'rule' && form.passingMarks && Number(form.passingMarks) < 0) next.passingMarks = 'Enter a non-negative value.'
    if (kind === 'rule' && form.attendance && (Number(form.attendance) < 0 || Number(form.attendance) > 100)) next.attendance = 'Enter a percentage from 0 to 100.'
    if (kind === 'rule' && form.attempts && Number(form.attempts) < 1) next.attempts = 'At least one attempt is required.'
    setErrors(next)
    if (Object.keys(next).length) return
    const item = { ...form, status: form.status || (kind === 'examination' ? 'Draft' : 'Active'), id: editing || `${kind}-${Date.now()}` }
    setData(current => ({ ...current, [collection]: editing ? current[collection].map(row => row.id === editing ? item : row) : [item, ...current[collection]] }))
    setMessage(`${kind === 'examination' ? 'Examination' : kind === 'type' ? 'Exam type' : kind === 'schedule' ? 'Schedule' : 'Rule'} ${editing ? 'updated' : 'added'} successfully.`)
    setForm(kind === 'examination' ? blankExam : {})
    setEditing(null)
    setShowEntryForm(false)
  }
  const editExam = exam => navigate('/examination-setup/create-examination', { state: { exam } })
  const remove = (collection, id) => setData(current => ({ ...current, [collection]: current[collection].filter(row => row.id !== id) }))
  const toggleStatus = (collection, id) => setData(current => ({
    ...current,
    [collection]: current[collection].map(row => {
      if (row.id !== id) return row
      const isCurrentlyActive = row.status === 'Active' || row.status === 'Scheduled'
      const nextStatus = isCurrentlyActive ? (collection === 'examinations' ? 'Cancelled' : 'Inactive') : (collection === 'examinations' ? 'Scheduled' : 'Active')
      return { ...row, status: nextStatus }
    })
  }))
  const types = data.types.filter(row => row.status === 'Active')

  const years = yearOptions
  const filteredExams = useMemo(() => data.examinations.filter(row => `${row.name} ${row.academicYear} ${row.examType} ${row.examSession || 'Regular'} ${row.term}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.year || row.academicYear === filters.year)), [data.examinations, query, filters])

  const [examPage, setExamPage] = useState(1)
  const examPageSize = 10
  const examTotalPages = Math.ceil(filteredExams.length / examPageSize)
  useEffect(() => { setExamPage(1) }, [query, filters])
  const paginatedExams = useMemo(() => {
    const start = (examPage - 1) * examPageSize
    return filteredExams.slice(start, start + examPageSize)
  }, [filteredExams, examPage, examPageSize])

  const examinationColumns = [{ label: 'Examination Name', value: row => row.name }, { label: 'Academic Year', value: row => row.academicYear }, { label: 'Exam Type', value: row => row.examType }, { label: 'Semester / Term', value: row => row.term }, { label: 'Start Date', value: row => row.startDate }, { label: 'End Date', value: row => row.endDate }, { label: 'Status', value: row => row.status }]
  const filteredTypes = data.types.filter(row => `${row.name} ${row.code} ${row.description}`.toLowerCase().includes(query.toLowerCase()))
  const filteredSchedules = data.schedules.filter(row => `${row.examination} ${row.subject} ${row.room}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.examination || row.examination === filters.examination))
  const filteredRules = data.rules.filter(row => `${row.name} ${row.description} ${row.examType}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.examType || row.examType === filters.examType))
  const collectionInfo = activePath === tabs[2][1] ? { name: 'types', title: 'Exam Type', fields: [['name', 'Exam Type Name', 'text'], ['code', 'Type Code', 'text'], ['description', 'Description', 'textarea'], ['status', 'Status', 'status']], required: ['name', 'code'], kind: 'type' }
    : activePath === tabs[3][1] ? { name: 'schedules', title: 'Exam Schedule', fields: [['examination', 'Examination', 'select-exam'], ['subject', 'Subject', 'text'], ['date', 'Date', 'date'], ['startTime', 'Start Time', 'time'], ['endTime', 'End Time', 'time'], ['room', 'Room / Hall', 'text'], ['status', 'Status', 'status']], required: ['examination', 'subject', 'date', 'startTime', 'endTime', 'room'], kind: 'schedule' }
      : { name: 'rules', title: 'Exam Rules', fields: [['name', 'Rule Name', 'text'], ['description', 'Description', 'textarea'], ['examType', 'Exam Type', 'select-type'], ['passingMarks', 'Passing Marks', 'number'], ['attendance', 'Minimum Attendance (%)', 'number'], ['attempts', 'Attempts', 'number'], ['status', 'Status', 'status']], required: ['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts'], kind: 'rule' }

  const field = ([key, label, type]) => <label className={type === 'textarea' ? 'wide' : ''} key={key}><span>{label}{collectionInfo.required.includes(key) && <b> *</b>}</span>{type === 'textarea' ? <textarea rows="3" value={form[key] || ''} aria-invalid={Boolean(errors[key])} onChange={event => change(key, event.target.value)} /> : type === 'status' ? <ProjectSelect value={form[key] || 'Active'} onChange={event => change(key, event.target.value)}><option>Active</option><option>Inactive</option></ProjectSelect> : type === 'select-exam' ? <ProjectSelect value={form[key] || ''} onChange={event => change(key, event.target.value)}><option value="">Select examination</option>{data.examinations.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect> : type === 'select-type' ? <ProjectSelect value={form[key] || ''} onChange={event => change(key, event.target.value)}><option value="">Select exam type</option>{data.types.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect> : <input type={type} min={type === 'number' ? 0 : undefined} value={form[key] || ''} aria-invalid={Boolean(errors[key])} onChange={event => change(key, event.target.value)} />}{errors[key] && <small className="examination-setup__field-error">{errors[key]}</small>}</label>

  const actions = (row, collection) => {
    const isActive = row.status === 'Active' || row.status === 'Scheduled'
    const label = row.name || row.examination || row.subject || collection
    return <div className="examination-setup__actions"><button type="button" className="table-action-btn action-edit" title={`Edit ${label}`} aria-label={`Edit ${label}`} onClick={() => { setForm({ ...row }); setEditing(row.id); setShowEntryForm(true); setMessage('') }}><FiEdit2 /></button><button type="button" className={`table-action-btn ${isActive ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`} title={isActive ? `Deactivate ${label}` : `Activate ${label}`} aria-label={isActive ? `Deactivate ${label}` : `Activate ${label}`} onClick={() => toggleStatus(collection, row.id)}>{isActive ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button></div>
  }

  return <DashboardLayout><main className="examination-setup">
    <header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Configure and manage examination cycles.</p></div><ExaminationSummary types={data.types} /></header>
    <section className="examination-setup__card">
      <header className="examination-setup__card-header"><div><p>{activeTab.toUpperCase()}</p><h2>{activeTab === 'Examination List' ? 'Search and manage examination cycles.' : activeTab === 'Create Examination' ? 'Enter examination details and academic period.' : `Manage ${activeTab.toLowerCase()} records.`}</h2></div>{activePath !== tabs[1][1] && <div className="examination-setup__header-actions">{activePath === tabs[0][1] && <><ExportMenu rows={filteredExams} columns={examinationColumns} title="Examination List" filename="examinations" scope="All matching examinations" allowEmpty /><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="examination-setup__primary" onClick={() => { setForm(blankExam); setEditing(null); setErrors({}); setShowEntryForm(true); setMessage('') }}><FiPlus /> Create Examination</button></>}{activePath !== tabs[0][1] && <><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="examination-setup__primary" onClick={() => { setForm({}); setEditing(null); setShowEntryForm(true); setMessage('') }}><FiPlus /> Add {activeTab === 'Exam Type' ? 'Exam Type' : activeTab === 'Exam Schedule' ? 'Schedule' : 'Rule'}</button></>}</div>}</header>
      <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== tabs[1][1]).map(([label, path]) => { const isCurrent = activePath === path || (path === tabs[0][1] && (pathname === '/examination-setup' || pathname === tabs[0][1])); return <Link key={path} to={path} className={isCurrent ? 'active' : ''} aria-current={isCurrent ? 'page' : undefined}>{label}</Link> })}</nav>
      {message && <div className="examination-setup__success examination-setup__toast" role="status"><span>{message}</span><button type="button" className="examination-setup__toast-close" onClick={() => setMessage('')} aria-label="Dismiss notification">×</button></div>}

      {activePath === tabs[1][1] ? <div className="examination-setup__form-wrap"><form className="examination-setup__form" onSubmit={event => save(event, 'examinations', ['name', 'academicYear', 'examType', 'term', 'startDate', 'endDate'], 'examination')} noValidate>
        <label><span>Examination Name <b>*</b></span><input value={form.name} aria-invalid={Boolean(errors.name)} onChange={event => change('name', event.target.value)} />{errors.name && <small className="examination-setup__field-error">{errors.name}</small>}</label>
        <label><span>Active Academic Year</span><input value={form.academicYear || activeYearName || 'No active academic year configured'} readOnly aria-label="Active academic year" />{!activeYearName && <small className="examination-setup__field-error">Configure an active academic year before creating examinations.</small>}</label>
        <label><span>Exam Type <b>*</b></span><ProjectSelect value={form.examType} onChange={event => change('examType', event.target.value)}><option value="">Select exam type</option>{types.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect>{errors.examType && <small className="examination-setup__field-error">{errors.examType}</small>}</label>
        <label><span>Semester / Term <b>*</b></span><ProjectSelect value={form.term} onChange={event => change('term', event.target.value)}><option value="">Select semester / term</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Annual'].map(term => <option key={term}>{term}</option>)}</ProjectSelect>{errors.term && <small className="examination-setup__field-error">{errors.term}</small>}</label>
        <label><span>Start Date <b>*</b></span><input type="date" value={form.startDate} aria-invalid={Boolean(errors.startDate)} onChange={event => change('startDate', event.target.value)} />{errors.startDate && <small className="examination-setup__field-error">{errors.startDate}</small>}</label>
        <label><span>End Date <b>*</b></span><input type="date" value={form.endDate} aria-invalid={Boolean(errors.endDate)} onChange={event => change('endDate', event.target.value)} />{errors.endDate && <small className="examination-setup__field-error">{errors.endDate}</small>}</label>
        <label><span>Status</span><ProjectSelect value={form.status} onChange={event => change('status', event.target.value)}><option>Draft</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></ProjectSelect></label>
        <label className="wide"><span>Description</span><textarea rows="3" value={form.description} onChange={event => change('description', event.target.value)} /></label>
        <footer><button type="button" className="examination-setup__secondary" onClick={() => navigate('/examination-setup/examination-list')}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : 'Save Examination'}</button></footer>
      </form></div> : <>
        <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label={`Search ${activeTab.toLowerCase()}`} placeholder={`Search ${activeTab.toLowerCase()}...`} value={query} onChange={event => setQuery(event.target.value)} /></label></div>
        {showFilters && <div className="examination-setup__filters">
          {activePath === tabs[0][1] && <><label>Status<ProjectSelect value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option>{['Draft', 'Scheduled', 'Completed', 'Cancelled'].map(value => <option key={value}>{value}</option>)}</ProjectSelect></label><label>Academic Year<ProjectSelect value={filters.year} onChange={event => setFilters(current => ({ ...current, year: event.target.value }))}><option value="">All Academic Years</option>{years.map(year => <option key={year}>{year}</option>)}</ProjectSelect></label></>}
          {activePath === tabs[2][1] && <label>Status<ProjectSelect value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></ProjectSelect></label>}
          {activePath === tabs[3][1] && <><label>Examination<ProjectSelect value={filters.examination} onChange={event => setFilters(current => ({ ...current, examination: event.target.value }))}><option value="">All Examinations</option>{data.examinations.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect></label><label>Status<ProjectSelect value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>Active</option><option>Inactive</option></ProjectSelect></label></>}
          {activePath === tabs[4][1] && <><label>Exam Type<ProjectSelect value={filters.examType} onChange={event => setFilters(current => ({ ...current, examType: event.target.value }))}><option value="">All Exam Types</option>{data.types.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect></label><label>Status<ProjectSelect value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></ProjectSelect></label></>}
          <button type="button" onClick={() => { setQuery(''); setFilters({ status: '', year: '', examination: '', examType: '' }) }}>Clear Filters</button>
        </div>}
        {activePath === tabs[0][1] && <><p className="examination-setup__count">Showing {filteredExams.length === 0 ? 0 : (examPage - 1) * examPageSize + 1}–{Math.min(examPage * examPageSize, filteredExams.length)} of {filteredExams.length} examination{filteredExams.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Examination Name</th><th>Academic Year</th><th>Regular / Supply</th><th>Exam Type</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{paginatedExams.length ? paginatedExams.map(row => { const isActive = row.status === 'Active' || row.status === 'Scheduled'; return <tr key={row.id}><td><strong>{row.name}</strong><small className="examination-setup__subtext">{row.term}</small></td><td>{row.academicYear}</td><td>{row.examSession || 'Regular'}</td><td>{row.examType}</td><td>{dateText(row.startDate)}</td><td>{dateText(row.endDate)}</td><td><StatusBadge value={row.status} /></td><td><div className="examination-setup__actions"><button type="button" className="table-action-btn action-edit" title={`Edit ${row.name}`} aria-label={`Edit ${row.name}`} onClick={() => editExam(row)}><FiEdit2 /></button><button type="button" className={`table-action-btn ${isActive ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`} title={isActive ? `Deactivate ${row.name}` : `Activate ${row.name}`} aria-label={isActive ? `Deactivate ${row.name}` : `Activate ${row.name}`} onClick={() => toggleStatus('examinations', row.id)}>{isActive ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button></div></td></tr> }) : <tr><td colSpan="8" className="examination-setup__empty">No examinations match your search and filters.</td></tr>}</tbody></table></div><TablePagination page={examPage} totalPages={examTotalPages} onPageChange={setExamPage} /></>}
        {activePath === tabs[2][1] && <DataTable headers={['Exam Type', 'Code', 'Description', 'Status', 'Actions']} rows={filteredTypes.filter(row => !filters.status || row.status === filters.status)} columns={['name', 'code', 'description']} actions={actions} collection="types" />}
        {activePath === tabs[3][1] && <DataTable headers={['Examination', 'Subject', 'Date', 'Start Time', 'End Time', 'Room / Hall', 'Status', 'Actions']} rows={filteredSchedules} columns={['examination', 'subject', 'date', 'startTime', 'endTime', 'room', 'status']} actions={actions} collection="schedules" />}
        {activePath === tabs[4][1] && <DataTable headers={['Rule Name', 'Description', 'Exam Type', 'Passing Marks', 'Min. Attendance', 'Attempts', 'Status', 'Actions']} rows={filteredRules} columns={['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts', 'status']} actions={actions} collection="rules" />}
        {activePath === tabs[0][1] && showEntryForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowEntryForm(false); setErrors({}) } }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="examination-create-title"><header><div><h2 id="examination-create-title">Create Examination</h2><p>Enter examination details and academic period.</p></div><button type="button" aria-label="Close" onClick={() => { setShowEntryForm(false); setErrors({}) }}>×</button></header><form className="examination-setup__form" onSubmit={event => save(event, 'examinations', ['name', 'academicYear', 'examType', 'term', 'startDate', 'endDate'], 'examination')} noValidate>
          <label><span>Examination Name <b>*</b></span><input value={form.name || ''} aria-invalid={Boolean(errors.name)} onChange={event => change('name', event.target.value)} />{errors.name && <small className="examination-setup__field-error">{errors.name}</small>}</label>
          <label><span>Active Academic Year</span><input value={form.academicYear || activeYearName || 'No active academic year configured'} readOnly aria-label="Active academic year" />{!activeYearName && <small className="examination-setup__field-error">Configure an active academic year before creating examinations.</small>}</label>
          <label><span>Exam Type <b>*</b></span><ProjectSelect value={form.examType || ''} onChange={event => change('examType', event.target.value)}><option value="">Select exam type</option>{types.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect>{errors.examType && <small className="examination-setup__field-error">{errors.examType}</small>}</label>
          <label><span>Exam Category <b>*</b></span><ProjectSelect value={form.examSession || 'Regular'} onChange={event => change('examSession', event.target.value)}><option value="Regular">Regular Exam</option><option value="Supply">Supply Exam</option></ProjectSelect></label>
          <label><span>Semester / Term <b>*</b></span><ProjectSelect value={form.term || ''} onChange={event => change('term', event.target.value)}><option value="">Select semester / term</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Annual'].map(term => <option key={term}>{term}</option>)}</ProjectSelect>{errors.term && <small className="examination-setup__field-error">{errors.term}</small>}</label>
          <label><span>Start Date <b>*</b></span><input type="date" value={form.startDate || ''} aria-invalid={Boolean(errors.startDate)} onChange={event => change('startDate', event.target.value)} />{errors.startDate && <small className="examination-setup__field-error">{errors.startDate}</small>}</label>
          <label><span>End Date <b>*</b></span><input type="date" value={form.endDate || ''} aria-invalid={Boolean(errors.endDate)} onChange={event => change('endDate', event.target.value)} />{errors.endDate && <small className="examination-setup__field-error">{errors.endDate}</small>}</label>
          <label><span>Status</span><ProjectSelect value={form.status || 'Draft'} onChange={event => change('status', event.target.value)}><option>Draft</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></ProjectSelect></label>
          <label className="wide"><span>Description</span><textarea rows="3" value={form.description || ''} onChange={event => change('description', event.target.value)} /></label>
          <footer><button type="button" className="examination-setup__secondary" onClick={() => { setShowEntryForm(false); setErrors({}) }}>Cancel</button><button className="examination-setup__primary" type="submit">Create Examination</button></footer>
        </form></section></div>}
        {activePath !== tabs[0][1] && showEntryForm && <div className="examination-setup__inline-form"><h3>{editing ? `Edit ${collectionInfo.title}` : `Add ${collectionInfo.title}`}</h3><form className="examination-setup__form" onSubmit={event => save(event, collectionInfo.name, collectionInfo.required, collectionInfo.kind)} noValidate>{collectionInfo.fields.map(field)}<footer><button type="button" className="examination-setup__secondary" onClick={() => { setForm({}); setErrors({}); setEditing(null); setShowEntryForm(false) }}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : `Add ${collectionInfo.title}`}</button></footer></form></div>}
      </>}
    </section>
  </main></DashboardLayout>
}

function DataTable({ headers, rows, columns, actions, collection }) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(rows.length / pageSize)
  useEffect(() => { setPage(1) }, [rows.length])
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  const startIdx = rows.length === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = Math.min(page * pageSize, rows.length)

  return <><p className="examination-setup__count">Showing {startIdx}–{endIdx} of {rows.length} record{rows.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{paginatedRows.length ? paginatedRows.map(row => <tr key={row.id}>{columns.map(key => <td key={key}>{key === 'date' ? dateText(row[key]) : key === 'status' ? <StatusBadge value={row[key]} /> : row[key] || '—'}</td>)}<td>{actions(row, collection)}</td></tr>) : <tr><td className="examination-setup__empty" colSpan={headers.length}>No records found.</td></tr>}</tbody></table></div><TablePagination page={page} totalPages={totalPages} onPageChange={setPage} /></>
}

function ExaminationSetup(props) { return <ModuleAvailability title="Examination Management" dependency="Exam configuration, academic scope and lifecycle APIs are required before examinations can be created or published."><LocalExaminationSetup {...props} /></ModuleAvailability> }

return { default: ExaminationSetup }
})()

// ExaminationList screen and private helpers.
const ExaminationListScreen = (() => {
const ReExportedScreen = ExaminationSetupScreen.default



return { default: ReExportedScreen }
})()

// ExamRules screen and private helpers.
const ExamRulesScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const TablePagination = TablePaginationImports_default
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const Link = react_router_domImports_Link
const useLocation = react_router_domImports_useLocation
const StatusBadge = StatusBadgeImports_default
const DashboardLayout = DashboardLayoutImports_default

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const seeds = [{ id: 'rule-1', name: 'Standard Written Exam', description: 'Standard rules for written examinations.', examType: 'End Semester', passingMarks: '40', attendance: '75', attempts: '3', status: 'Active' }, { id: 'rule-2', name: 'Practical Assessment Rule', description: 'Practical assessment and viva requirements.', examType: 'Practical', passingMarks: '50', attendance: '80', attempts: '2', status: 'Active' }]
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

function ExamRules() {
  const location = useLocation()
  const [rows, setRows] = useState(() => load().rules || seeds)
  const [types] = useState(() => load().types || [{ id: 'type-mid', name: 'Mid Semester' }, { id: 'type-end', name: 'End Semester' }, { id: 'type-practical', name: 'Practical' }])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const blank = { name: '', description: '', examType: '', passingMarks: '', attendance: '', attempts: '', status: '' }
  const [form, setForm] = useState(blank)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  const visible = useMemo(() => rows.filter(row => `${row.name} ${row.description} ${row.examType}`.toLowerCase().includes(query.toLowerCase()) && (!statusFilter || row.status === statusFilter) && (!typeFilter || row.examType === typeFilter)), [rows, query, statusFilter, typeFilter])

  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(visible.length / pageSize)
  useEffect(() => { setPage(1) }, [query, statusFilter, typeFilter])
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return visible.slice(start, start + pageSize)
  }, [visible, page, pageSize])

  const startIdx = visible.length === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = Math.min(page * pageSize, visible.length)

  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), rules: next })) } catch { /* Keep the edited rows for this session. */ } }
  const save = event => {
    event.preventDefault()
    const missing = ['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts', 'status'].some(name => !String(form[name] || '').trim())
    if (missing) { setError('Complete all required rule fields.'); return }
    if (Number(form.passingMarks) < 0 || Number(form.attendance) < 0 || Number(form.attendance) > 100 || Number(form.attempts) < 1) { setError('Enter valid marks, attendance (0–100), and at least one attempt.'); return }
    const row = { ...form, id: editing || `rule-${Date.now()}` }
    persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows])
    setMessage(`Rule ${editing ? 'updated' : 'added'} successfully.`)
    setForm(blank)
    setShowForm(false)
    setEditing(null)
    setError('')
  }
  const edit = row => { setForm({ ...row }); setEditing(row.id); setShowForm(true); setError('') }

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Define the assessment requirements and eligibility rules.</p></div><ExaminationSummary types={types} /></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM RULES</p><h2>Search and manage examination rules.</h2></div><div className="examination-setup__header-actions"><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="examination-setup__primary" onClick={() => { setForm(blank); setEditing(null); setShowForm(value => !value); setError('') }}><FiPlus /> Add Rule</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination').map(([label, path]) => { const isCurrent = path === location.pathname || (path === '/examination-setup/examination-list' && location.pathname === '/examination-setup'); return <Link key={path} to={path} className={isCurrent ? 'active' : ''} aria-current={isCurrent ? 'page' : undefined}>{label}</Link> })}</nav>
    {message && <div className="examination-setup__success examination-setup__toast" role="status"><span>{message}</span><button type="button" className="examination-setup__toast-close" onClick={() => setMessage('')} aria-label="Dismiss notification">×</button></div>}
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search exam rules" placeholder="Search rule or exam type..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {showFilters && <div className="examination-setup__filters"><label>Exam Type<ProjectSelect value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="">All Exam Types</option>{types.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect></label><label>Status<ProjectSelect value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></ProjectSelect></label><button type="button" onClick={() => { setQuery(''); setTypeFilter(''); setStatusFilter('') }}>Clear Filters</button></div>}
    <p className="examination-setup__count">Showing {startIdx}–{endIdx} of {visible.length} rule{visible.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Rule Name</th><th>Description</th><th>Exam Type</th><th>Passing Marks</th><th>Minimum Attendance</th><th>Attempts</th><th>Status</th><th>Actions</th></tr></thead><tbody>{paginatedRows.length ? paginatedRows.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.description}</td><td>{row.examType}</td><td>{row.passingMarks}</td><td>{row.attendance}%</td><td>{row.attempts}</td><td><StatusBadge value={row.status} /></td><td><div className="examination-setup__actions"><button type="button" className="table-action-btn action-edit" aria-label={`Edit ${row.name}`} title={`Edit ${row.name}`} onClick={() => edit(row)}><FiEdit2 /></button><button type="button" className={`table-action-btn ${row.status === 'Active' ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`} aria-label={row.status === 'Active' ? `Deactivate ${row.name}` : `Activate ${row.name}`} title={row.status === 'Active' ? `Deactivate ${row.name}` : `Activate ${row.name}`} onClick={() => { const nextStatus = row.status === 'Active' ? 'Inactive' : 'Active'; const updated = rows.map(item => item.id === row.id ? { ...item, status: nextStatus } : item); persist(updated); setMessage(`Rule marked as ${nextStatus}.`) }}>{row.status === 'Active' ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button></div></td></tr>) : <tr><td colSpan="8" className="examination-setup__empty">No rules match your search and filters.</td></tr>}</tbody></table></div>
    <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    {showForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowForm(false); setEditing(null); setError('') } }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="exam-rule-modal-title"><header><div><h2 id="exam-rule-modal-title">{editing ? 'Edit Exam Rule' : 'Add Exam Rule'}</h2><p>Set the requirements and eligibility rules for this exam.</p></div><button type="button" aria-label="Close" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>×</button></header><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Rule Name <b>*</b></span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label><span>Exam Type <b>*</b></span><ProjectSelect value={form.examType} onChange={event => setForm(current => ({ ...current, examType: event.target.value }))}><option value="">Select exam type</option>{types.map(row => <option key={row.id}>{row.name}</option>)}</ProjectSelect></label><label className="wide"><span>Description <b>*</b></span><textarea rows="3" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label><label><span>Passing Marks <b>*</b></span><input type="number" min="0" value={form.passingMarks} onChange={event => setForm(current => ({ ...current, passingMarks: event.target.value }))} /></label><label><span>Minimum Attendance (%) <b>*</b></span><input type="number" min="0" max="100" value={form.attendance} onChange={event => setForm(current => ({ ...current, attendance: event.target.value }))} /></label><label><span>Attempts <b>*</b></span><input type="number" min="1" value={form.attempts} onChange={event => setForm(current => ({ ...current, attempts: event.target.value }))} /></label><label><span>Status <b>*</b></span><ProjectSelect value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="">Select status</option><option>Active</option><option>Inactive</option></ProjectSelect></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button type="button" className="examination-setup__secondary" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>Cancel</button><button type="submit" className="examination-setup__primary">{editing ? 'Save Changes' : 'Add Rule'}</button></footer></form></section></div>}
  </section></main></DashboardLayout>
}

return { default: ExamRules }
})()

// ExamSchedule screen and private helpers.
const ExamScheduleScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const TablePagination = TablePaginationImports_default
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useRef = reactImports_useRef
const useState = reactImports_useState
const fetchExams = collegeApiImports_fetchExams
const hasExamSetup = collegeApiImports_hasExamSetup
const fetchScheduleRows = collegeApiImports_fetchScheduleRows
const deleteScheduleApi = collegeApiImports_deleteScheduleApi
const Link = react_router_domImports_Link
const useLocation = react_router_domImports_useLocation
const StatusBadge = StatusBadgeImports_default
const DashboardLayout = DashboardLayoutImports_default

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }
const dateText = value => {
  if (!value) return '—'
  const clean = String(value).trim()
  const datePart = clean.includes('T') ? clean.split('T')[0] : clean.split(' ')[0]
  const parsed = new Date(`${datePart}T00:00:00`)
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const fallback = new Date(clean)
  return !isNaN(fallback.getTime())
    ? fallback.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : clean
}

function ExamSchedule() {
  const location = useLocation()
  const [rows, setRows] = useState(() => (load().schedules || []).map(normalize))
  const [exams, setExams] = useState([])
  const [examCount, setExamCount] = useState(null)
  const [setupExists, setSetupExists] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [types] = useState(() => load().types || [{ id: 'type-mid', name: 'Mid Semester' }, { id: 'type-end', name: 'End Semester' }, { id: 'type-practical', name: 'Practical' }])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [examFilter, setExamFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const blank = { examination: '', subject: '', date: '', startTime: '', endTime: '', room: '', examSession: 'Regular', status: 'Scheduled' }
  const [form, setForm] = useState(blank)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  const reload = reactImports_useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [examResult, exists, schedules] = await Promise.all([
        fetchExams({ Page: 1, PageSize: 500 }),
        hasExamSetup(),
        fetchScheduleRows({ Page: 1, PageSize: 500 }),
      ])
      const fetchedExams = Array.isArray(examResult?.items) ? examResult.items : []
      setExams(fetchedExams)
      setExamCount(exists ? (examResult?.totalCount ?? 0) : 0)
      setSetupExists(exists)
      const fetchedSchedules = Array.isArray(schedules) && schedules.length > 0
        ? schedules.map(normalize)
        : (load().schedules || []).map(normalize)
      setRows(fetchedSchedules)
    } catch (requestError) {
      setLoadError(requestError?.message || 'Unable to load examination schedules.')
      const local = load().schedules || []
      if (local.length > 0) {
        setRows(local.map(normalize))
      }
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void reload() }, [reload])
  const visible = useMemo(() => rows.filter(row => {
    const matchesQuery = `${row.examination} ${row.subject} ${row.room}`.toLowerCase().includes(query.toLowerCase())
    let matchesStatus = true
    if (statusFilter) {
      if (statusFilter === 'Active') {
        matchesStatus = row.status === 'Active' || row.status === 'Scheduled'
      } else if (statusFilter === 'Inactive') {
        matchesStatus = row.status === 'Inactive' || row.status === 'Cancelled'
      } else {
        matchesStatus = String(row.status || '').toLowerCase() === statusFilter.toLowerCase()
      }
    }
    const matchesExam = !examFilter || row.examination === examFilter
    return matchesQuery && matchesStatus && matchesExam
  }), [rows, query, statusFilter, examFilter])

  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(visible.length / pageSize)
  useEffect(() => { setPage(1) }, [query, statusFilter, examFilter])
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return visible.slice(start, start + pageSize)
  }, [visible, page, pageSize])

  const startIdx = visible.length === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = Math.min(page * pageSize, visible.length)

  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), schedules: next })) } catch { /* Keep the edited rows for this session. */ } }
  const removeSchedule = async row => {
    if (row.examId == null || row.scheduleId == null) { setLoadError('This schedule is missing its examination or schedule ID, so it could not be deleted.'); return }
    setLoadError('')
    try {
      await deleteScheduleApi(row.examId, row.scheduleId)
      setMessage('Schedule deleted successfully.')
      await reload()
    }
    catch (requestError) { setLoadError(requestError?.message || 'Unable to delete this schedule.') }
  }
  const save = event => {
    event.preventDefault()
    const required = ['examination', 'subject', 'date', 'startTime', 'endTime', 'room']
    const missing = required.find(name => !String(form[name] || '').trim())
    if (missing) { setError('Complete all required schedule fields.'); return }
    if (form.endTime <= form.startTime) { setError('End time must be later than start time.'); return }
    const row = { ...form, id: editing || `sch-${Date.now()}` }
    persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows])
    setMessage(`Schedule ${editing ? 'updated' : 'added'} successfully.`)
    setForm(blank)
    setEditing(null)
    setShowForm(false)
    setError('')
  }
  const edit = row => { setForm({ ...row }); setEditing(row.id); setShowForm(true); setError('') }
  const openAddForm = () => { setForm(blank); setEditing(null); setError(''); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null); setError('') }
  useEffect(() => {
    if (!showForm) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') closeForm() }
    window.addEventListener('keydown', onKeyDown)
    formRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showForm])

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Plan examination dates, sessions and venues.</p></div><ExaminationSummary types={types} examCount={examCount ?? undefined} scheduleCount={loading ? undefined : rows.length} /></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM SCHEDULE</p><h2>Search and manage examination schedules.</h2></div><div className="examination-setup__header-actions"><button type="button" className="examination-setup__primary" onClick={openAddForm}><FiPlus /> Add Schedule</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination').map(([label, path]) => { const isCurrent = path === location.pathname || (path === '/examination-setup/examination-list' && location.pathname === '/examination-setup'); return <Link key={path} to={path} className={isCurrent ? 'active' : ''} aria-current={isCurrent ? 'page' : undefined}>{label}</Link> })}</nav>
    {message && <div className="examination-setup__success examination-setup__toast" role="status"><span>{message}</span><button type="button" className="examination-setup__toast-close" onClick={() => setMessage('')} aria-label="Dismiss notification">×</button></div>}
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search schedules" placeholder="Search exam, subject or room..." value={query} onChange={event => setQuery(event.target.value)} /></label><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button></div>
    {showFilters && <div className="examination-setup__filters"><label>Examination<ProjectSelect value={examFilter} onChange={event => setExamFilter(event.target.value)}><option value="">All Examinations</option>{exams.map(row => { const examId = row.examId ?? row.id; const examName = row.examName ?? row.name; return <option key={examId} value={examName}>{examName}</option> })}</ProjectSelect></label><label>Status<ProjectSelect value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All Statuses</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>Active</option><option>Inactive</option></ProjectSelect></label><button type="button" onClick={() => { setQuery(''); setExamFilter(''); setStatusFilter('') }}>Clear Filters</button></div>}
    {loadError && <p className="examination-setup__error" role="alert">{loadError} <button type="button" onClick={() => void reload()}>Retry</button></p>}
    <p className="examination-setup__count">{loading ? 'Loading schedules…' : `Showing ${startIdx}–${endIdx} of ${visible.length} schedule${visible.length === 1 ? '' : 's'}`}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Examination</th><th>Regular / Supply</th><th>Subject</th><th>Date</th><th>Start Time</th><th>End Time</th><th>Room / Hall</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="9" className="examination-setup__empty">Loading schedules…</td></tr> : paginatedRows.length ? paginatedRows.map(row => <tr key={row.id}><td>{row.examination}</td><td>{row.examSession || 'Regular'}</td><td><strong>{row.subject}</strong></td><td>{dateText(row.date)}</td><td>{row.startTime}</td><td>{row.endTime}</td><td>{row.room}</td><td><StatusBadge value={row.status} /></td><td><div className="examination-setup__actions"><button type="button" className="table-action-btn action-edit" aria-label={`Edit ${row.subject || 'schedule'}`} title={`Edit ${row.subject || 'schedule'}`} onClick={() => edit(row)}><FiEdit2 /></button><button type="button" className={`table-action-btn ${row.status !== 'Cancelled' && row.status !== 'Inactive' ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`} aria-label={row.status !== 'Cancelled' && row.status !== 'Inactive' ? `Deactivate ${row.subject || 'schedule'}` : `Activate ${row.subject || 'schedule'}`} title={row.status !== 'Cancelled' && row.status !== 'Inactive' ? `Deactivate ${row.subject || 'schedule'}` : `Activate ${row.subject || 'schedule'}`} onClick={() => { const isCurrentlyActive = row.status !== 'Cancelled' && row.status !== 'Inactive'; const nextStatus = isCurrentlyActive ? 'Inactive' : 'Scheduled'; const updated = rows.map(item => item.id === row.id ? { ...item, status: nextStatus } : item); persist(updated); setMessage(`Schedule marked as ${nextStatus}.`) }}>{row.status !== 'Cancelled' && row.status !== 'Inactive' ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button></div></td></tr>) : <tr><td colSpan="9" className="examination-setup__empty">{setupExists === false ? 'No examination setup found.' : 'No schedules match your search and filters.'}</td></tr>}</tbody></table></div>
    <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    {showForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeForm() }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="examination-setup-schedule-modal-title" tabIndex={-1} ref={formRef}><header><div><h2 id="examination-setup-schedule-modal-title">{editing ? 'Edit Schedule' : 'Add Schedule'}</h2><p>Enter examination session and venue details.</p></div><button type="button" aria-label="Close" onClick={closeForm}><FiX /></button></header><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Examination <b>*</b></span><ProjectSelect value={form.examination} onChange={event => setForm(current => ({ ...current, examination: event.target.value }))}><option value="">Select examination</option>{exams.map(row => { const examId = row.examId ?? row.id; const examName = row.examName ?? row.name; return <option key={examId}>{examName}</option> })}</ProjectSelect></label><label><span>Regular / Supply <b>*</b></span><ProjectSelect value={form.examSession || 'Regular'} onChange={event => setForm(current => ({ ...current, examSession: event.target.value }))}><option>Regular</option><option>Supply</option></ProjectSelect></label><label><span>Subject <b>*</b></span><input value={form.subject} onChange={event => setForm(current => ({ ...current, subject: event.target.value }))} /></label><label><span>Date <b>*</b></span><input type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></label><label><span>Start Time <b>*</b></span><input type="time" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} /></label><label><span>End Time <b>*</b></span><input type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} /></label><label><span>Room / Hall <b>*</b></span><input value={form.room} onChange={event => setForm(current => ({ ...current, room: event.target.value }))} /></label><label><span>Status</span><ProjectSelect value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></ProjectSelect></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button type="button" className="examination-setup__secondary" onClick={closeForm}>Cancel</button><button type="submit" className="examination-setup__primary">{editing ? 'Save Changes' : 'Add Schedule'}</button></footer></form></section></div>}
  </section></main></DashboardLayout>
}

return { default: ExamSchedule }
})()

// ExamType screen and private helpers.
const ExamTypeScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const TablePagination = TablePaginationImports_default
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const Link = react_router_domImports_Link
const useLocation = react_router_domImports_useLocation
const StatusBadge = StatusBadgeImports_default
const DashboardLayout = DashboardLayoutImports_default

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const seeds = [{ id: 'type-mid', name: 'Mid Semester', code: 'MID', description: 'Mid term written assessment', status: 'Active' }, { id: 'type-end', name: 'End Semester', code: 'END', description: 'End term examination', status: 'Active' }, { id: 'type-practical', name: 'Practical', code: 'PRAC', description: 'Laboratory and practical assessment', status: 'Active' }]
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

function ExamType() {
  const location = useLocation()
  const [rows, setRows] = useState(() => load().types || seeds)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', status: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  const visible = useMemo(() => rows.filter(row => `${row.name} ${row.code} ${row.description}`.toLowerCase().includes(query.toLowerCase()) && (!status || row.status === status)), [rows, query, status])

  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(visible.length / pageSize)
  useEffect(() => { setPage(1) }, [query, status])
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return visible.slice(start, start + pageSize)
  }, [visible, page, pageSize])

  const startIdx = visible.length === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = Math.min(page * pageSize, visible.length)

  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), types: next })) } catch { /* Keep the edited rows for this session. */ } }
  const edit = row => { setForm({ ...row }); setEditing(row.id); setShowForm(true); setError('') }
  const save = event => {
    event.preventDefault()
    if (!form.name.trim() || !form.code.trim() || !form.status) {
      setError('Complete the exam type name, type code, and status.')
      return
    }
    const row = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), id: editing || `type-${Date.now()}` }
    persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows])
    setMessage(`Exam type ${editing ? 'updated' : 'added'} successfully.`)
    setShowForm(false)
    setEditing(null)
    setForm({ name: '', code: '', description: '', status: '' })
    setError('')
  }
  const toggle = id => {
    const next = rows.map(row => row.id === id ? { ...row, status: row.status === 'Active' ? 'Inactive' : 'Active' } : row)
    persist(next)
    const target = next.find(row => row.id === id)
    setMessage(`Exam type marked as ${target?.status || 'updated'}.`)
  }

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Configure examination types used by examinations and schedules.</p></div><ExaminationSummary types={rows} /></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM TYPE</p><h2>Search and manage examination types.</h2></div><div className="examination-setup__header-actions"><button type="button" className="erp-btn erp-btn--secondary examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="erp-btn erp-btn--primary examination-setup__primary" onClick={() => { setForm({ name: '', code: '', description: '', status: '' }); setEditing(null); setShowForm(true); setError('') }}><FiPlus /> Add Exam Type</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.filter(([, path]) => path !== '/examination-setup/create-examination').map(([label, path]) => { const isCurrent = path === location.pathname || (path === '/examination-setup/examination-list' && location.pathname === '/examination-setup'); return <Link key={path} to={path} className={isCurrent ? 'active' : ''} aria-current={isCurrent ? 'page' : undefined}>{label}</Link> })}</nav>
    {message && <div className="examination-setup__success examination-setup__toast" role="status"><span>{message}</span><button type="button" className="examination-setup__toast-close" onClick={() => setMessage('')} aria-label="Dismiss notification">×</button></div>}
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search exam types" placeholder="Search exam type or code..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {showFilters && <div className="examination-setup__filters"><label>Status<ProjectSelect value={status} onChange={event => setStatus(event.target.value)}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></ProjectSelect></label><button type="button" onClick={() => { setStatus(''); setQuery('') }}>Clear Filters</button></div>}
    <p className="examination-setup__count">Showing {startIdx}–{endIdx} of {visible.length} exam type{visible.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Exam Type</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>{paginatedRows.length ? paginatedRows.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.code}</td><td>{row.description || '—'}</td><td><StatusBadge value={row.status} /></td><td><div className="examination-setup__actions"><button type="button" className="table-action-btn action-edit" title={`Edit ${row.name}`} aria-label={`Edit ${row.name}`} onClick={() => edit(row)}><FiEdit2 /></button><button type="button" className={`table-action-btn ${row.status === 'Active' ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`} title={row.status === 'Active' ? `Deactivate ${row.name}` : `Activate ${row.name}`} aria-label={row.status === 'Active' ? `Deactivate ${row.name}` : `Activate ${row.name}`} onClick={() => toggle(row.id)}>{row.status === 'Active' ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}</button></div></td></tr>) : <tr><td colSpan="5" className="examination-setup__empty">No exam types match your search and filters.</td></tr>}</tbody></table></div>
    <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
    {showForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowForm(false); setEditing(null); setError('') } }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="exam-type-modal-title"><header><div><h2 id="exam-type-modal-title">{editing ? 'Edit Exam Type' : 'Add Exam Type'}</h2><p>Enter the examination type details.</p></div><button type="button" aria-label="Close" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>×</button></header><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Exam Type Name <b>*</b></span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label><span>Type Code <b>*</b></span><input value={form.code} onChange={event => setForm(current => ({ ...current, code: event.target.value }))} /></label><label className="wide"><span>Description</span><textarea rows="3" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label><label><span>Status <b>*</b></span><ProjectSelect value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="">Select status</option><option>Active</option><option>Inactive</option></ProjectSelect></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button className="examination-setup__secondary" type="button" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : 'Add Exam Type'}</button></footer></form></section></div>}
  </section></main></DashboardLayout>
}

return { default: ExamType }
})()

export const CreateExamination = () => <LiveExaminationWorkspace screen="create-examination" />
export const ExaminationSetup = () => <LiveExaminationWorkspace screen="examination-list" />
export const ExaminationList = () => <LiveExaminationWorkspace screen="examination-list" />
export const ExamRules = () => <LiveExaminationWorkspace screen="exam-rules" />
export const ExamSchedule = () => <LiveExaminationWorkspace screen="exam-schedule" />
export const ExamType = () => <LiveExaminationWorkspace screen="exam-type" />
export default ExaminationSetup
