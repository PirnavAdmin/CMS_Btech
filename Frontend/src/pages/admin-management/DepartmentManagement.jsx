import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiEye, FiLayers, FiEdit3, FiPlus, FiSave as Save, FiSearch, FiUserPlus, FiX as X } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import { getBranches } from '../courseManagement/Course'
import { createDepartment, getDepartmentById, getDepartments, updateDepartment, updateDepartmentStatus } from '../../auth/collegeApi'
import './DepartmentManagement.css'

const empty = { id: null, name: '', code: '', collegeId: '', hodUserId: '', status: 'Active' }
const apiError = (error, fallback) => {
  const status = error?.response?.status
  const raw = error?.response?.data
  let data = raw
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw) } catch { data = raw }
  }
  if (status >= 500) return 'Unable to save the department right now. Please check your entries and try again.'
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return "You don't have permission to manage departments."
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.entries(data.errors).flatMap(([field, values]) => (Array.isArray(values) ? values : [values]).map((value) => `${field}: ${value}`)).filter(Boolean)
    if (messages.length) return messages.join(' ')
  }
  return data?.message || data?.detail || (data?.title !== 'One or more validation errors occurred.' ? data?.title : '') || error?.message || fallback
}
const listFrom = (response) => { const data = response?.data ?? response; return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : data && typeof data === 'object' ? [data] : [] }
const recordFrom = (response) => response?.data?.data ?? response?.data ?? response
const mapDepartment = (record) => {
  const status = record.status ?? record.departmentStatus ?? (record.isActive === false ? 0 : 1)
  const active = status === true || Number(status) === 1 || String(status).toLowerCase() === 'active'
  const hodUserId = record.hodUserId ?? record.hodId ?? ''
  return { id: record.id ?? record.departmentId, name: record.departmentName ?? record.name ?? '', code: record.departmentCode ?? record.code ?? '', collegeId: record.collegeId ?? '', hodUserId, hod: record.hodName ?? record.hod?.fullName ?? (hodUserId !== '' ? `User #${hodUserId}` : 'Not assigned'), status: active ? 'Active' : 'Inactive' }
}
const payloadFor = (value) => ({
  departmentName: value.name.trim(),
  departmentCode: value.code.trim().toUpperCase() || null,
  ...(value.collegeId !== '' ? { collegeId: Number(value.collegeId) } : {}),
  ...(value.hodUserId !== '' ? { hodUserId: Number(value.hodUserId) } : {}),
})

export default function DepartmentManagement() {
  const [items, setItems] = useState([])
  const [screen, setScreen] = useState('list')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(empty)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const loadDepartments = async () => {
    setIsLoading(true); setError('')
    try { const response = await getDepartments(); setItems(listFrom(response.data).map(mapDepartment)) }
    catch (requestError) { setItems([]); setError(apiError(requestError, 'Unable to load departments. Please try again.')) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { loadDepartments() }, [])

  const visible = useMemo(() => items.filter((item) => `${item.name} ${item.code} ${item.hod}`.toLowerCase().includes(query.toLowerCase())), [items, query])
  const totalPages = Math.ceil(visible.length / itemsPerPage) || 1
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages)
  const pageItems = useMemo(() => visible.slice((currentPageClamped - 1) * itemsPerPage, currentPageClamped * itemsPerPage), [visible, currentPageClamped])
  const activeCount = items.filter((item) => item.status === 'Active').length
  const relatedBranches = getBranches().filter((branch) => String(branch.departmentId) === String(selected?.id))
  const closeToList = () => { setScreen('list'); setSelected(null); setError('') }

  const loadDetail = async (item, nextScreen) => {
    setScreen(nextScreen); setSelected(item); setForm(item); setError(''); setIsDetailsLoading(true)
    try { const response = await getDepartmentById(item.id); const detail = mapDepartment(recordFrom(response)); setSelected(detail); setForm(detail); setItems((current) => current.map((entry) => entry.id === detail.id ? detail : entry)) }
    catch (requestError) { setError(apiError(requestError, 'Unable to load department details. Please try again.')) }
    finally { setIsDetailsLoading(false) }
  }
  const toggleStatus = async (item) => {
    const status = item.status === 'Active' ? 'Inactive' : 'Active'; setError('')
    try { const response = await updateDepartmentStatus(item.id, status === 'Active' ? 1 : 0); const result = recordFrom(response); const updated = result?.id || result?.departmentId ? mapDepartment(result) : { ...item, status }; setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry)); if (selected?.id === item.id) setSelected(updated) }
    catch (requestError) { setError(apiError(requestError, 'Unable to update department status. Please try again.')) }
  }
  const save = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return setError('Department name is required.')
    if ([form.collegeId, form.hodUserId].some((value) => value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0))) return setError('College ID and HOD user ID must be valid numbers.')
    if (items.some((item) => item.code === form.code.trim().toUpperCase() && item.id !== form.id)) return setError('This department code already exists.')
    setIsSaving(true); setError('')
    try { const response = form.id ? await updateDepartment(form.id, payloadFor(form)) : await createDepartment(payloadFor(form)); const result = recordFrom(response); const id = result?.id ?? result?.departmentId ?? form.id; if (form.status === 'Inactive' && id) await updateDepartmentStatus(id, 0); await loadDepartments(); closeToList() }
    catch (requestError) { setError(apiError(requestError, `Unable to ${form.id ? 'update' : 'create'} this department. Please try again.`)) }
    finally { setIsSaving(false) }
  }
  const field = (name, label, extra = {}) => <label>{label}<input value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} {...extra} /></label>

  return <DashboardLayout><div className="management-page department-management">
    {screen === 'list' && <><div className="management-page__heading"><div><h1>Department Management</h1></div><div className="department-heading-stat" aria-label={`${activeCount} active departments`}><span><FiCheckCircle /></span><div><strong>{activeCount}</strong><small>Active departments</small></div></div></div>
      <section className="management-card department-list"><div className="department-list__top"><div className="department-section-title"><span><FiLayers /></span><h2>Department Directory</h2></div><button className="primary-button" onClick={() => { setForm(empty); setSelected(null); setError(''); setScreen('form') }}><FiPlus /> Add Department</button></div><div className="department-controls department-controls--toolbar"><div className="department-search"><FiSearch aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} placeholder="Search departments" aria-label="Search departments" /></div></div>
      {isLoading ? <p className="department-no-results">Loading departments...</p> : error ? <div className="department-no-results"><p className="department-error" role="alert">{error}</p><button type="button" className="secondary-button" onClick={loadDepartments}>Retry</button></div> : !items.length ? <div className="department-no-results"><p>No departments have been added yet.</p><button type="button" className="primary-button" onClick={() => { setForm(empty); setScreen('form') }}>Add Department</button></div> : <><div className="department-table-wrap"><table><thead><tr><th>Department</th><th>Code</th><th>Programme</th><th>HOD</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pageItems.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><span>College ID: {item.collegeId || 'Not specified'}</span></td><td><code>{item.code || '—'}</code></td><td>B.Tech</td><td>{item.hod}</td><td><button className={`status-pill ${item.status.toLowerCase()}`} onClick={() => toggleStatus(item)}>{item.status}</button></td><td className="department-actions-cell"><div className="row-actions"><button title={`View ${item.name}`} aria-label={`View ${item.name}`} onClick={() => loadDetail(item, 'details')}><FiEye /></button><button title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} onClick={() => loadDetail(item, 'form')}><FiEdit3 /></button><button title={`Edit HOD for ${item.name}`} onClick={() => loadDetail(item, 'form')}><FiUserPlus /> <span>HOD</span></button></div></td></tr>)}</tbody></table></div>{!visible.length ? <p className="department-no-results">No departments match your search.</p> : <Pagination page={currentPageClamped} total={totalPages} setPage={setCurrentPage} />}</>}</section></>}
    {screen === 'form' && <Popup close={closeToList}><section className="management-card department-form-card"><Header title={form.id ? 'Edit Department' : 'Add Department'} subtitle="Enter the department information below." back={closeToList} /><form onSubmit={save}><div className="department-form-grid">{field('name', 'Department Name *', { placeholder: 'e.g. Computer Science & Engineering', required: true })}{field('code', 'Department Code', { placeholder: 'e.g. CSE' })}{field('collegeId', 'College ID (Optional)', { type: 'text', inputMode: 'numeric', pattern: '\\d*', placeholder: 'Leave blank if not assigned' })}{field('hodUserId', 'HOD User ID (Optional)', { type: 'text', inputMode: 'numeric', pattern: '\\d*', placeholder: 'Leave blank if not assigned' })}<label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label></div>{isDetailsLoading && <p className="department-no-results">Loading department details...</p>}{error && <p className="department-error" role="alert">{error}</p>}<Actions cancel={closeToList} submit={isSaving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Department'} disabled={isSaving} /></form></section></Popup>}
    {screen === 'details' && selected && <section className="department-profile-view"><div className="department-profile-topbar"><button className="secondary-button" onClick={closeToList}>← Back to Departments List</button></div><article className="department-profile-card department-details department-details--professional"><Header title={selected.name} subtitle={`${selected.code || 'No code'} · B.Tech`} back={closeToList} showClose={false} />{isDetailsLoading ? <p className="department-no-results">Loading department details...</p> : <><div className="department-details__identity"><div className="department-details__monogram">{(selected.code || selected.name).slice(0, 3)}</div><div><span>Academic Department</span><strong>{selected.name}</strong><small>{selected.code || 'No code'} · B.Tech</small></div><button className={`status-pill ${selected.status.toLowerCase()}`} onClick={() => toggleStatus(selected)}>● {selected.status}</button></div><div className="detail-grid department-details__grid"><div><span>Department Code</span><strong>{selected.code || 'Not specified'}</strong></div><div><span>College ID</span><strong>{selected.collegeId || 'Not specified'}</strong></div><div><span>Head of Department</span><strong>{selected.hod}</strong></div><div><span>Department Status</span><strong className={`department-detail-status ${selected.status.toLowerCase()}`}>{selected.status}</strong></div></div><div className="department-branches"><div><div><span>Associated B.Tech Branches</span><small>Programmes mapped to this department</small></div><strong>{relatedBranches.length}</strong></div>{relatedBranches.length ? <div className="department-branch-list">{relatedBranches.map((branch) => <Link to={`/branches/${branch.id}`} key={branch.id}><strong>{branch.code}</strong><span>{branch.name}</span><small>View branch details →</small></Link>)}</div> : <p>No branches are assigned to this department yet.</p>}</div></>}{error && <p className="department-error" role="alert">{error}</p>}</article></section>}
  </div></DashboardLayout>
}
function Header({ title, subtitle, back, showClose = true }) { return <div className="screen-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{showClose && <button className="department-popup-close" type="button" onClick={back} aria-label="Close popup" title="Close"><X aria-hidden="true" /></button>}</div> }
function Actions({ cancel, submit, disabled }) { return <div className="form-actions"><button type="button" className="secondary-button" onClick={cancel} disabled={disabled}><X aria-hidden="true" /> Cancel</button><button type="submit" disabled={disabled}><Save aria-hidden="true" /> {submit}</button></div> }
function Pagination({ page, total, setPage }) { return <div className="department-pagination"><div className="pagination-controls"><button className="pagination-btn" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1}>Previous</button>{Array.from({ length: total }, (_, index) => index + 1).map((value) => <button key={value} className={`pagination-btn ${value === page ? 'active' : ''}`} onClick={() => setPage(value)}>{value}</button>)}<button className="pagination-btn" onClick={() => setPage((value) => Math.min(value + 1, total))} disabled={page === total}>Next</button></div></div> }
function Popup({ children, close }) { return <div className="department-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>{children}</div> }
