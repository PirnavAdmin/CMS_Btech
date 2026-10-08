import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'

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
const dateText = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const initialForm = { name: '', academicYear: '', examType: '', term: '', startDate: '', endDate: '', description: '', status: 'Draft' }

export default function ExaminationSetup() {
  const { pathname, state: routeState } = useLocation()
  const navigate = useNavigate()
  const activePath = tabs.some(([, path]) => path === pathname) ? pathname : tabs[0][1]
  const activeTab = tabs.find(([, path]) => path === activePath)?.[0]
  const [data, setData] = useState(readData)
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ status: '', year: '', examination: '', examType: '' })
  const [form, setForm] = useState(initialForm)
  const [editing, setEditing] = useState(null)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch { /* Demo data remains available for this session. */ } }, [data])
  useEffect(() => {
    setQuery(''); setShowFilters(false); setShowEntryForm(false)
    if (activePath === tabs[1][1] && routeState?.exam) { setEditing(routeState.exam.id); setForm({ ...initialForm, ...routeState.exam }); setErrors({}) }
    else if (activePath === tabs[1][1]) { setEditing(null); setForm(initialForm); setErrors({}); setMessage('') }
    if ([tabs[2][1], tabs[3][1], tabs[4][1]].includes(activePath)) { setEditing(null); setForm({}); setErrors({}); setMessage('') }
  }, [activePath, routeState])

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
    setForm(kind === 'examination' ? initialForm : {})
    setEditing(null)
    setShowEntryForm(false)
  }
  const editExam = exam => navigate('/examination-setup/create-examination', { state: { exam } })
  const remove = (collection, id) => setData(current => ({ ...current, [collection]: current[collection].filter(row => row.id !== id) }))
  const toggleStatus = (collection, id) => setData(current => ({ ...current, [collection]: current[collection].map(row => row.id === id ? { ...row, status: row.status === 'Inactive' ? 'Active' : 'Inactive' } : row) }))
  const types = data.types.filter(row => row.status === 'Active')
  const years = [...new Set(data.examinations.map(row => row.academicYear))]
  const filteredExams = useMemo(() => data.examinations.filter(row => `${row.name} ${row.academicYear} ${row.examType} ${row.term}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.year || row.academicYear === filters.year)), [data.examinations, query, filters])
  const filteredTypes = data.types.filter(row => `${row.name} ${row.code} ${row.description}`.toLowerCase().includes(query.toLowerCase()))
  const filteredSchedules = data.schedules.filter(row => `${row.examination} ${row.subject} ${row.room}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.examination || row.examination === filters.examination))
  const filteredRules = data.rules.filter(row => `${row.name} ${row.description} ${row.examType}`.toLowerCase().includes(query.toLowerCase()) && (!filters.status || row.status === filters.status) && (!filters.examType || row.examType === filters.examType))
  const collectionInfo = activePath === tabs[2][1] ? { name: 'types', title: 'Exam Type', fields: [['name', 'Exam Type Name', 'text'], ['code', 'Type Code', 'text'], ['description', 'Description', 'textarea'], ['status', 'Status', 'status']], required: ['name', 'code'], kind: 'type' }
    : activePath === tabs[3][1] ? { name: 'schedules', title: 'Exam Schedule', fields: [['examination', 'Examination', 'select-exam'], ['subject', 'Subject', 'text'], ['date', 'Date', 'date'], ['startTime', 'Start Time', 'time'], ['endTime', 'End Time', 'time'], ['room', 'Room / Hall', 'text'], ['status', 'Status', 'status']], required: ['examination', 'subject', 'date', 'startTime', 'endTime', 'room'], kind: 'schedule' }
      : { name: 'rules', title: 'Exam Rules', fields: [['name', 'Rule Name', 'text'], ['description', 'Description', 'textarea'], ['examType', 'Exam Type', 'select-type'], ['passingMarks', 'Passing Marks', 'number'], ['attendance', 'Minimum Attendance (%)', 'number'], ['attempts', 'Attempts', 'number'], ['status', 'Status', 'status']], required: ['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts'], kind: 'rule' }

  const field = ([key, label, type]) => <label className={type === 'textarea' ? 'wide' : ''} key={key}><span>{label}{collectionInfo.required.includes(key) && <b> *</b>}</span>{type === 'textarea' ? <textarea rows="3" value={form[key] || ''} aria-invalid={Boolean(errors[key])} onChange={event => change(key, event.target.value)} /> : type === 'status' ? <select value={form[key] || 'Active'} onChange={event => change(key, event.target.value)}><option>Active</option><option>Inactive</option></select> : type === 'select-exam' ? <select value={form[key] || ''} onChange={event => change(key, event.target.value)}><option value="">Select examination</option>{data.examinations.map(row => <option key={row.id}>{row.name}</option>)}</select> : type === 'select-type' ? <select value={form[key] || ''} onChange={event => change(key, event.target.value)}><option value="">Select exam type</option>{data.types.map(row => <option key={row.id}>{row.name}</option>)}</select> : <input type={type} min={type === 'number' ? 0 : undefined} value={form[key] || ''} aria-invalid={Boolean(errors[key])} onChange={event => change(key, event.target.value)} />}{errors[key] && <small className="examination-setup__field-error">{errors[key]}</small>}</label>

  const actions = (row, collection) => <div className="examination-setup__actions"><button type="button" title="Edit" aria-label="Edit" onClick={() => { setForm({ ...row }); setEditing(row.id); setShowEntryForm(true); setMessage('') }}><FiEdit2 /></button><button type="button" title={row.status === 'Inactive' ? 'Activate' : 'Deactivate'} aria-label={row.status === 'Inactive' ? 'Activate' : 'Deactivate'} onClick={() => toggleStatus(collection, row.id)}><FiPower /></button><button type="button" title="Delete" aria-label="Delete" onClick={() => remove(collection, row.id)}><FiTrash2 /></button></div>

  return <DashboardLayout><main className="examination-setup">
    <header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Configure examinations, types, schedules and rules.</p></div><div className="examination-setup__summary">{[['Examinations', data.examinations.length], ['Exam Types', data.types.length], ['Schedules', data.schedules.length]].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header>
    <section className="examination-setup__card">
      <header className="examination-setup__card-header"><div><p>{activeTab.toUpperCase()}</p><h2>{activeTab === 'Examination List' ? 'Search and manage examination cycles.' : activeTab === 'Create Examination' ? 'Enter examination details and academic period.' : `Manage ${activeTab.toLowerCase()} records.`}</h2></div>{activePath !== tabs[1][1] && <div className="examination-setup__header-actions"><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button>{activePath !== tabs[0][1] && <button type="button" className="examination-setup__primary" onClick={() => { setForm({}); setEditing(null); setShowEntryForm(true); setMessage('') }}><FiPlus /> Add {activeTab === 'Exam Type' ? 'Exam Type' : activeTab === 'Exam Schedule' ? 'Schedule' : 'Rule'}</button>}</div>}</header>
      <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.map(([label, path]) => <Link key={path} to={path} className={activePath === path ? 'active' : ''} aria-current={activePath === path ? 'page' : undefined}>{label}</Link>)}</nav>

      {activePath === tabs[1][1] ? <div className="examination-setup__form-wrap"><form className="examination-setup__form" onSubmit={event => save(event, 'examinations', ['name', 'academicYear', 'examType', 'term', 'startDate', 'endDate'], 'examination')} noValidate>
        <label><span>Examination Name <b>*</b></span><input value={form.name} aria-invalid={Boolean(errors.name)} onChange={event => change('name', event.target.value)} />{errors.name && <small className="examination-setup__field-error">{errors.name}</small>}</label>
        <label><span>Academic Year <b>*</b></span><select value={form.academicYear} onChange={event => change('academicYear', event.target.value)}><option value="">Select academic year</option>{['2025-26', '2026-27', '2027-28'].map(year => <option key={year}>{year}</option>)}</select>{errors.academicYear && <small className="examination-setup__field-error">{errors.academicYear}</small>}</label>
        <label><span>Exam Type <b>*</b></span><select value={form.examType} onChange={event => change('examType', event.target.value)}><option value="">Select exam type</option>{types.map(row => <option key={row.id}>{row.name}</option>)}</select>{errors.examType && <small className="examination-setup__field-error">{errors.examType}</small>}</label>
        <label><span>Semester / Term <b>*</b></span><select value={form.term} onChange={event => change('term', event.target.value)}><option value="">Select semester / term</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Annual'].map(term => <option key={term}>{term}</option>)}</select>{errors.term && <small className="examination-setup__field-error">{errors.term}</small>}</label>
        <label><span>Start Date <b>*</b></span><input type="date" value={form.startDate} aria-invalid={Boolean(errors.startDate)} onChange={event => change('startDate', event.target.value)} />{errors.startDate && <small className="examination-setup__field-error">{errors.startDate}</small>}</label>
        <label><span>End Date <b>*</b></span><input type="date" value={form.endDate} aria-invalid={Boolean(errors.endDate)} onChange={event => change('endDate', event.target.value)} />{errors.endDate && <small className="examination-setup__field-error">{errors.endDate}</small>}</label>
        <label><span>Status</span><select value={form.status} onChange={event => change('status', event.target.value)}><option>Draft</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>
        <label className="wide"><span>Description</span><textarea rows="3" value={form.description} onChange={event => change('description', event.target.value)} /></label>
        <footer><button type="button" className="examination-setup__secondary" onClick={() => navigate('/examination-setup/examination-list')}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : 'Save Examination'}</button></footer>
      </form></div> : <>
        <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label={`Search ${activeTab.toLowerCase()}`} placeholder={`Search ${activeTab.toLowerCase()}...`} value={query} onChange={event => setQuery(event.target.value)} /></label></div>
        {showFilters && <div className="examination-setup__filters">
          {activePath === tabs[0][1] && <><label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option>{['Draft', 'Scheduled', 'Completed', 'Cancelled'].map(value => <option key={value}>{value}</option>)}</select></label><label>Academic Year<select value={filters.year} onChange={event => setFilters(current => ({ ...current, year: event.target.value }))}><option value="">All Academic Years</option>{years.map(year => <option key={year}>{year}</option>)}</select></label></>}
          {activePath === tabs[2][1] && <label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label>}
          {activePath === tabs[3][1] && <><label>Examination<select value={filters.examination} onChange={event => setFilters(current => ({ ...current, examination: event.target.value }))}><option value="">All Examinations</option>{data.examinations.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>Active</option><option>Inactive</option></select></label></>}
          {activePath === tabs[4][1] && <><label>Exam Type<select value={filters.examType} onChange={event => setFilters(current => ({ ...current, examType: event.target.value }))}><option value="">All Exam Types</option>{data.types.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label>Status<select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label></>}
          <button type="button" onClick={() => { setQuery(''); setFilters({ status: '', year: '', examination: '', examType: '' }) }}>Clear Filters</button>
        </div>}
        {activePath === tabs[0][1] && <><p className="examination-setup__count">Showing {filteredExams.length} examination{filteredExams.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Examination Name</th><th>Academic Year</th><th>Exam Type</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredExams.length ? filteredExams.map(row => <tr key={row.id}><td><strong>{row.name}</strong><small className="examination-setup__subtext">{row.term}</small></td><td>{row.academicYear}</td><td>{row.examType}</td><td>{dateText(row.startDate)}</td><td>{dateText(row.endDate)}</td><td><span className={`examination-setup__status ${statusClass(row.status)}`}>{row.status}</span></td><td><div className="examination-setup__actions"><button title="Edit examination" aria-label="Edit examination" onClick={() => editExam(row)}><FiEdit2 /></button><button title="Delete examination" aria-label="Delete examination" onClick={() => remove('examinations', row.id)}><FiTrash2 /></button></div></td></tr>) : <tr><td colSpan="7" className="examination-setup__empty">No examinations match your search and filters.</td></tr>}</tbody></table></div></>}
        {activePath === tabs[2][1] && <DataTable headers={['Exam Type', 'Code', 'Description', 'Status', 'Actions']} rows={filteredTypes.filter(row => !filters.status || row.status === filters.status)} columns={['name', 'code', 'description']} actions={actions} collection="types" />}
        {activePath === tabs[3][1] && <DataTable headers={['Examination', 'Subject', 'Date', 'Start Time', 'End Time', 'Room / Hall', 'Status', 'Actions']} rows={filteredSchedules} columns={['examination', 'subject', 'date', 'startTime', 'endTime', 'room', 'status']} actions={actions} collection="schedules" />}
        {activePath === tabs[4][1] && <DataTable headers={['Rule Name', 'Description', 'Exam Type', 'Passing Marks', 'Min. Attendance', 'Attempts', 'Status', 'Actions']} rows={filteredRules} columns={['name', 'description', 'examType', 'passingMarks', 'attendance', 'attempts', 'status']} actions={actions} collection="rules" />}
        {message && <p className="examination-setup__success" role="status">{message}</p>}
        {activePath !== tabs[0][1] && showEntryForm && <div className="examination-setup__inline-form"><h3>{editing ? `Edit ${collectionInfo.title}` : `Add ${collectionInfo.title}`}</h3><form className="examination-setup__form" onSubmit={event => save(event, collectionInfo.name, collectionInfo.required, collectionInfo.kind)} noValidate>{collectionInfo.fields.map(field)}<footer><button type="button" className="examination-setup__secondary" onClick={() => { setForm({}); setErrors({}); setEditing(null); setShowEntryForm(false) }}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : `Add ${collectionInfo.title}`}</button></footer></form></div>}
      </>}
    </section>
  </main></DashboardLayout>
}

function DataTable({ headers, rows, columns, actions, collection }) {
  return <><p className="examination-setup__count">Showing {rows.length} record{rows.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.id}>{columns.map(key => <td key={key}>{key === 'date' ? dateText(row[key]) : key === 'status' ? <span className={`examination-setup__status ${statusClass(row[key])}`}>{row[key]}</span> : row[key] || '—'}</td>)}<td>{actions(row, collection)}</td></tr>) : <tr><td className="examination-setup__empty" colSpan={headers.length}>No records found.</td></tr>}</tbody></table></div></>
}
