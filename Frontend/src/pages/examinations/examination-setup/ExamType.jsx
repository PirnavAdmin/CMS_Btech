import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiEdit2, FiFilter, FiPlus, FiPower, FiSearch, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import './ExaminationSetup.css'

const tabs = [['Examination List', '/examination-setup/examination-list'], ['Create Examination', '/examination-setup/create-examination'], ['Exam Type', '/examination-setup/exam-type'], ['Exam Schedule', '/examination-setup/exam-schedule'], ['Exam Rules', '/examination-setup/exam-rules']]
const key = 'cms-examination-setup-demo-v1'
const seeds = [{ id: 'type-mid', name: 'Mid Semester', code: 'MID', description: 'Mid term written assessment', status: 'Active' }, { id: 'type-end', name: 'End Semester', code: 'END', description: 'End term examination', status: 'Active' }, { id: 'type-practical', name: 'Practical', code: 'PRAC', description: 'Laboratory and practical assessment', status: 'Active' }]
const load = () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } }

export default function ExamType() {
  const location = useLocation()
  const [rows, setRows] = useState(() => load().types || seeds)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', status: 'Active' })
  const [error, setError] = useState('')
  const visible = useMemo(() => rows.filter(row => `${row.name} ${row.code} ${row.description}`.toLowerCase().includes(query.toLowerCase()) && (!status || row.status === status)), [rows, query, status])
  const persist = next => { setRows(next); try { localStorage.setItem(key, JSON.stringify({ ...load(), types: next })) } catch { /* Keep the edited rows for this session. */ } }
  const edit = row => { setForm({ ...row }); setEditing(row.id); setShowForm(true); setError('') }
  const save = event => { event.preventDefault(); if (!form.name.trim() || !form.code.trim()) { setError('Exam type name and type code are required.'); return } const row = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), id: editing || `type-${Date.now()}` }; persist(editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows]); setShowForm(false); setEditing(null); setForm({ name: '', code: '', description: '', status: 'Active' }); setError('') }
  const toggle = id => persist(rows.map(row => row.id === id ? { ...row, status: row.status === 'Active' ? 'Inactive' : 'Active' } : row))

  return <DashboardLayout><main className="examination-setup"><header className="examination-setup__header"><div><h1>Examination Setup</h1><p>Configure examination types used by examinations and schedules.</p></div></header><section className="examination-setup__card">
    <header className="examination-setup__card-header"><div><p>EXAM TYPE</p><h2>Search and manage examination types.</h2></div><div className="examination-setup__header-actions"><button type="button" className="examination-setup__filter-button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters</button><button type="button" className="examination-setup__primary" onClick={() => { setForm({ name: '', code: '', description: '', status: 'Active' }); setEditing(null); setShowForm(value => !value); setError('') }}><FiPlus /> Add Exam Type</button></div></header>
    <nav className="examination-setup__tabs" aria-label="Examination setup sections">{tabs.map(([label, path]) => <Link key={path} to={path} className={path === location.pathname ? 'active' : ''}>{label}</Link>)}</nav>
    <div className="examination-setup__toolbar"><label className="examination-setup__search"><FiSearch /><input aria-label="Search exam types" placeholder="Search exam type or code..." value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {showFilters && <div className="examination-setup__filters"><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label><button type="button" onClick={() => { setStatus(''); setQuery('') }}>Clear Filters</button></div>}
    <p className="examination-setup__count">Showing {visible.length} exam type{visible.length === 1 ? '' : 's'}</p><div className="examination-setup__table-wrap"><table><thead><tr><th>Exam Type</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.length ? visible.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.code}</td><td>{row.description || '—'}</td><td><span className={`examination-setup__status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><div className="examination-setup__actions"><button type="button" title="Edit exam type" aria-label="Edit exam type" onClick={() => edit(row)}><FiEdit2 /></button><button type="button" title={row.status === 'Active' ? 'Deactivate' : 'Activate'} aria-label={row.status === 'Active' ? 'Deactivate' : 'Activate'} onClick={() => toggle(row.id)}><FiPower /></button><button type="button" title="Delete exam type" aria-label="Delete exam type" onClick={() => persist(rows.filter(item => item.id !== row.id))}><FiTrash2 /></button></div></td></tr>) : <tr><td colSpan="5" className="examination-setup__empty">No exam types match your search and filters.</td></tr>}</tbody></table></div>
    {showForm && <div className="examination-setup__inline-form"><h3>{editing ? 'Edit Exam Type' : 'Add Exam Type'}</h3><form className="examination-setup__form" onSubmit={save} noValidate><label><span>Exam Type Name <b>*</b></span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label><label><span>Type Code <b>*</b></span><input value={form.code} onChange={event => setForm(current => ({ ...current, code: event.target.value }))} /></label><label className="wide"><span>Description</span><textarea rows="3" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label><label><span>Status</span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option>Active</option><option>Inactive</option></select></label>{error && <p className="examination-setup__error wide" role="alert">{error}</p>}<footer><button className="examination-setup__secondary" type="button" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>Cancel</button><button className="examination-setup__primary" type="submit">{editing ? 'Save Changes' : 'Add Exam Type'}</button></footer></form></div>}
  </section></main></DashboardLayout>
}
