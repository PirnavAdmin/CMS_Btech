import { useMemo, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import './SectionManagement.css'

const KEY = 'btech-sections'
const initial = [
  { id: 'section-cse-a', name: 'Section A', code: 'CSE-A', course: 'B.Tech', branch: 'CSE', semester: 'Semester 1', capacity: 60, advisor: 'Dr. Ananya Rao', status: 'Active' },
  { id: 'section-cse-b', name: 'Section B', code: 'CSE-B', course: 'B.Tech', branch: 'CSE', semester: 'Semester 1', capacity: 60, advisor: '', status: 'Active' },
]
const empty = { name: '', code: '', course: '', branch: '', semester: '', capacity: 60, advisor: '', status: 'Active' }
const load = () => { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) : initial }

export default function SectionManagement() {
  const [rows, setRows] = useState(load)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const shown = useMemo(() => rows.filter((row) => `${row.name} ${row.code} ${row.course} ${row.branch} ${row.semester}`.toLowerCase().includes(query.toLowerCase())), [rows, query])
  const commit = (next) => { setRows(next); localStorage.setItem(KEY, JSON.stringify(next)) }
  const reset = () => { setForm(empty); setEditing(null); setError('') }
  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.code.trim() || !form.course.trim() || !form.branch.trim() || !form.semester.trim()) return setError('Complete all required fields.')
    if (Number(form.capacity) < 1) return setError('Capacity must be at least 1.')
    if (rows.some((row) => row.id !== editing && row.code.toLowerCase() === form.code.trim().toLowerCase() && row.semester === form.semester)) return setError('This section code already exists in the selected semester.')
    const record = { ...form, id: editing || crypto.randomUUID(), name: form.name.trim(), code: form.code.trim().toUpperCase(), capacity: Number(form.capacity) }
    commit(editing ? rows.map((row) => row.id === editing ? record : row) : [...rows, record])
    reset()
  }
  const edit = (row) => { setEditing(row.id); setForm(row); setError('') }
  const toggle = (row) => commit(rows.map((item) => item.id === row.id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item))
  return <DashboardLayout><main className="section-management">
    <header className="section-heading"><div><p>Academic Configuration</p><h1>Section Management</h1><span>Organize students into course, branch, and semester sections.</span></div><div className="section-count"><strong>{rows.length}</strong><small>Total sections</small></div></header>
    <section className="section-card section-form"><h2>{editing ? 'Edit Section' : 'Add Section'}</h2><form onSubmit={submit} noValidate>
      <label>Section Name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Section A" /></label>
      <label>Section Code *<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CSE-A" /></label>
      <label>Course *<input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="B.Tech" /></label>
      <label>Branch *<input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="CSE" /></label>
      <label>Semester *<input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="Semester 1" /></label>
      <label>Capacity *<input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></label>
      <label>Faculty Advisor<input value={form.advisor} onChange={(e) => setForm({ ...form, advisor: e.target.value })} placeholder="Advisor name" /></label>
      <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Inactive</option></select></label>
      {error && <p className="section-error" role="alert">{error}</p>}<footer>{editing && <button type="button" onClick={reset}>Cancel</button>}<button className="primary">{editing ? 'Save Changes' : 'Add Section'}</button></footer>
    </form></section>
    <section className="section-card"><div className="section-toolbar"><div><h2>Section Directory</h2><p>All configured student sections.</p></div><input aria-label="Search sections" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sections" /></div>
      <div className="section-table"><table><thead><tr><th>Section</th><th>Code</th><th>Course</th><th>Branch</th><th>Semester</th><th>Capacity</th><th>Faculty Advisor</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shown.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.code}</td><td>{row.course}</td><td>{row.branch}</td><td>{row.semester}</td><td>{row.capacity}</td><td>{row.advisor || 'Not assigned'}</td><td><span className={`section-status ${row.status.toLowerCase()}`}>{row.status}</span></td><td><div className="section-actions"><button onClick={() => edit(row)}>Edit</button><button onClick={() => toggle(row)}>{row.status === 'Active' ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}{!shown.length && <tr><td colSpan="9" className="section-empty">No sections found.</td></tr>}</tbody></table></div>
    </section>
  </main></DashboardLayout>
}
