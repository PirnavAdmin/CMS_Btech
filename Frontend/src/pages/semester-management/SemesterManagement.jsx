import { useMemo, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import './SemesterManagement.css'

const KEY = 'btech-semesters'
const initial = [
  { id: 'semester-1', name: 'Semester 1', number: 1, academicYear: '2026-27', startDate: '2026-07-01', endDate: '2026-12-15', status: 'Active' },
  { id: 'semester-2', name: 'Semester 2', number: 2, academicYear: '2026-27', startDate: '2027-01-05', endDate: '2027-05-30', status: 'Inactive' },
]
const empty = { name: '', number: '', academicYear: '', startDate: '', endDate: '', status: 'Active' }
const load = () => { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) : initial }

export default function SemesterManagement() {
  const [rows, setRows] = useState(load)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const shown = useMemo(() => rows.filter((row) => `${row.name} ${row.academicYear} ${row.status}`.toLowerCase().includes(query.toLowerCase())), [rows, query])
  const commit = (next) => { setRows(next); localStorage.setItem(KEY, JSON.stringify(next)) }
  const reset = () => { setForm(empty); setEditing(null); setError('') }
  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.number || !form.academicYear.trim() || !form.startDate || !form.endDate) return setError('Complete all required fields.')
    if (form.endDate <= form.startDate) return setError('End date must be after the start date.')
    if (rows.some((row) => row.id !== editing && Number(row.number) === Number(form.number) && row.academicYear.toLowerCase() === form.academicYear.trim().toLowerCase())) return setError('This semester already exists for the academic year.')
    const record = { ...form, name: form.name.trim(), number: Number(form.number), academicYear: form.academicYear.trim(), id: editing || crypto.randomUUID() }
    commit(editing ? rows.map((row) => row.id === editing ? record : row) : [...rows, record])
    reset()
  }
  const edit = (row) => { setEditing(row.id); setForm(row); setError('') }
  const toggle = (row) => commit(rows.map((item) => item.id === row.id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item))
  return <DashboardLayout><main className="semester-management">
    <header className="semester-heading"><div><p>Academic Configuration</p><h1>Semester Management</h1><span>Create and maintain semester timelines for each academic year.</span></div><div className="semester-count"><strong>{rows.length}</strong><small>Total semesters</small></div></header>
    <section className="semester-card semester-form"><h2>{editing ? 'Edit Semester' : 'Add Semester'}</h2><form onSubmit={submit} noValidate>
      <label>Semester Name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Semester 1" /></label>
      <label>Semester Number *<input type="number" min="1" max="20" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></label>
      <label>Academic Year *<input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2026-27" /></label>
      <label>Start Date *<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
      <label>End Date *<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
      <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Inactive</option></select></label>
      {error && <p className="semester-error" role="alert">{error}</p>}<footer>{editing && <button type="button" onClick={reset}>Cancel</button>}<button className="primary">{editing ? 'Save Changes' : 'Add Semester'}</button></footer>
    </form></section>
    <section className="semester-card"><div className="semester-toolbar"><div><h2>Semester Directory</h2><p>All configured academic semesters.</p></div><input aria-label="Search semesters" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search semesters" /></div>
      <div className="semester-table"><table><thead><tr><th>Semester</th><th>Number</th><th>Academic Year</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shown.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.number}</td><td>{row.academicYear}</td><td>{row.startDate}</td><td>{row.endDate}</td><td><span className={`semester-status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><div className="semester-actions"><button onClick={() => edit(row)}>Edit</button><button onClick={() => toggle(row)}>{row.status === 'Active' ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}{!shown.length && <tr><td colSpan="7" className="semester-empty">No semesters found.</td></tr>}</tbody></table></div>
    </section>
  </main></DashboardLayout>
}
