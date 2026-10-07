import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const seeds = [{ id: 'sch-1', examination: 'Mid Semester Examination', subject: 'Data Structures', date: '2026-10-19', startTime: '09:30', endTime: '12:30', room: 'Exam Hall A', status: 'Scheduled' }, { id: 'sch-2', examination: 'Mid Semester Examination', subject: 'Database Systems', date: '2026-10-21', startTime: '13:30', endTime: '16:30', room: 'Block B · 204', status: 'Scheduled' }]
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }
const dateText = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function ExamSchedule() {
  const location = useLocation()
  const [rows, setRows] = useState(() => load().schedules || seeds)
  const [exams] = useState(() => load().examinations || [{ id: 1, name: 'Mid Semester Examination' }, { id: 2, name: 'Practical Assessment' }, { id: 3, name: 'End Semester Examination' }])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [examFilter, setExamFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const formRef = useRef(null)
  const blank = { examination: '', subject: '', date: '', startTime: '', endTime: '', room: '', status: 'Scheduled' }
  const [form, setForm] = useState(blank)
  const visible = useMemo(() => rows.filter(row => `${row.examination} ${row.subject} ${row.room}`.toLowerCase().includes(query.toLowerCase()) && (!statusFilter || row.status === statusFilter) && (!examFilter || row.examination === examFilter)), [rows, query, statusFilter, examFilter])
  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), schedules: next })) } catch { /* Keep the edited rows for this session. */ } }
  const save = event => { event.preventDefault(); const required = ['examination', 'subject', 'date', 'startTime', 'endTime', 'room']; const missing = required.find(name => !String(form[name] || '').trim()); if (missing) { setError('Complete all required schedule fields.'); return } if (form.endTime <= form.startTime) { setError('End time must be later than start time.'); return } const row = { ...form, id: editing || `sch-${Date.now()}` }; persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows]); setForm(blank); setEditing(null); setShowForm(false); setError('') }
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

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Plan examination dates, sessions and venues.</p></div></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM SCHEDULE</p><h2>Search and manage examination schedules.</h2></div><div className="examination-setup__header-actions"><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="examination-setup__primary" onClick={openAddForm}><FiPlus /> Add Schedule</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.map(([label, path]) => <Link key={path} to={path} className={path === location.pathname ? 'active' : ''}>{label}</Link>)}</nav>
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search schedules" placeholder="Search exam, subject or room..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {showFilters && <div className="examination-setup__filters"><label>Examination<select value={examFilter} onChange={event => setExamFilter(event.target.value)}><option value="">All Examinations</option>{exams.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All Statuses</option><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label><button type="button" onClick={() => { setQuery(''); setExamFilter(''); setStatusFilter('') }}>Clear Filters</button></div>}
    <p className="examination-setup__count">Showing {visible.length} schedule{visible.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Examination</th><th>Subject</th><th>Date</th><th>Start Time</th><th>End Time</th><th>Room / Hall</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.length ? visible.map(row => <tr key={row.id}><td>{row.examination}</td><td><strong>{row.subject}</strong></td><td>{dateText(row.date)}</td><td>{row.startTime}</td><td>{row.endTime}</td><td>{row.room}</td><td><span className={`examination-setup__status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><div className="examination-setup__actions"><button type="button" aria-label="Edit schedule" title="Edit schedule" onClick={() => edit(row)}><FiEdit2 /></button><button type="button" aria-label="Toggle schedule status" title="Toggle status" onClick={() => persist(rows.map(item => item.id === row.id ? { ...item, status: item.status === 'Cancelled' ? 'Scheduled' : 'Cancelled' } : item))}><FiPower /></button><button type="button" aria-label="Delete schedule" title="Delete schedule" onClick={() => persist(rows.filter(item => item.id !== row.id))}><FiTrash2 /></button></div></td></tr>) : <tr><td colSpan="8" className="examination-setup__empty">No schedules match your search and filters.</td></tr>}</tbody></table></div>
    {showForm && <div className="examination-setup__modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeForm() }}><section className="examination-setup__modal" role="dialog" aria-modal="true" aria-labelledby="examination-setup-schedule-modal-title" tabIndex={-1} ref={formRef}><header><div><h2 id="examination-setup-schedule-modal-title">{editing ? 'Edit Schedule' : 'Add Schedule'}</h2><p>Enter examination session and venue details.</p></div><button type="button" aria-label="Close" onClick={closeForm}><FiX /></button></header><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Examination <b>*</b></span><select value={form.examination} onChange={event => setForm(current => ({ ...current, examination: event.target.value }))}><option value="">Select examination</option>{exams.map(row => <option key={row.id}>{row.name}</option>)}</select></label><label><span>Subject <b>*</b></span><input value={form.subject} onChange={event => setForm(current => ({ ...current, subject: event.target.value }))} /></label><label><span>Date <b>*</b></span><input type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></label><label><span>Start Time <b>*</b></span><input type="time" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} /></label><label><span>End Time <b>*</b></span><input type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} /></label><label><span>Room / Hall <b>*</b></span><input value={form.room} onChange={event => setForm(current => ({ ...current, room: event.target.value }))} /></label><label><span>Status</span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button type="button" className="examination-setup__secondary" onClick={closeForm}>Cancel</button><button type="submit" className="examination-setup__primary">{editing ? 'Save Changes' : 'Add Schedule'}</button></footer></form></section></div>}
  </section></main></DashboardLayout>
}
