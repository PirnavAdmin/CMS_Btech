import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiEye, FiLayers, FiEdit3, FiPlus, FiSave as Save, FiSearch, FiToggleLeft, FiToggleRight, FiTrash2, FiUserPlus, FiX as X } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import StatusConfirmDialog from '../../components/StatusConfirmDialog'
import { branchApi } from '../../api/apiEndpoints'
import { normalize as normalizeBranch } from '../courseManagement/Branch'
import { createDepartment, getColleges, getDepartmentById, getDepartmentsPaginated, searchDepartments, updateDepartment, updateDepartmentStatus } from '../../auth/collegeApi'
import './DepartmentManagement.css'
import '../../styles/directory-search.css'

const empty = { id: null, name: '', code: '', collegeId: '', hodUserId: '', hodName: '', description: '', status: '' }
const HOD_NAMES_KEY = 'btech-department-hod-names'
const savedHodNames = () => { try { return JSON.parse(localStorage.getItem(HOD_NAMES_KEY) || '{}') } catch { return {} } }
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
  const departmentId = record.id ?? record.departmentId
  const hodName = record.hodName ?? record.hod?.fullName ?? savedHodNames()[departmentId] ?? ''
  const collegeId = record.collegeId ?? ''
  const collegeName = record.collegeName ?? record.college?.name ?? ''
  return { id: departmentId, name: record.departmentName ?? record.name ?? '', code: record.departmentCode ?? record.code ?? '', collegeId: collegeName || collegeId, collegeNumericId: collegeId, collegeName, hodUserId, hodName, description: record.description ?? '', hod: hodName || 'Not assigned', status: active ? 'Active' : 'Inactive' }
}
const payloadFor = (value) => ({
  departmentName: value.name.trim(),
  departmentCode: value.code.trim().toUpperCase() || null,
  ...((value.collegeNumericId ?? value.collegeId) !== '' ? { collegeId: Number(value.collegeNumericId ?? value.collegeId) } : {}),
  ...(value.hodUserId !== '' ? { hodUserId: Number(value.hodUserId) } : {}),
  description: value.description.trim() || null,
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
  const [isHodSaving, setIsHodSaving] = useState(false)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)
  const [colleges, setColleges] = useState([])
  const [branches, setBranches] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [isDeleting] = useState(false)
  const [serverTotalPages, setServerTotalPages] = useState(1)
  const itemsPerPage = 5

  const loadDepartments = async (searchTerm = query, page = currentPage) => {
    setIsLoading(true); setError('')
    try {
      const response = searchTerm.trim() ? await searchDepartments(searchTerm.trim()) : await getDepartmentsPaginated(page, itemsPerPage)
      const payload = response?.data?.data
      setItems(listFrom(response.data).map(mapDepartment))
      setServerTotalPages(searchTerm.trim() ? 1 : Number(payload?.totalPages || 1))
    }
    catch (requestError) { setItems([]); setError(apiError(requestError, 'Unable to load departments. Please try again.')) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { loadDepartments(query, currentPage) }, [query, currentPage])
  useEffect(() => {
    getColleges().then((response) => {
      const records = listFrom(response.data)
      setColleges(records.map((record) => ({ id: record.id ?? record.collegeId, name: record.name ?? record.collegeName ?? 'Unnamed college' })))
    }).catch(() => setColleges([]))
    branchApi.getAll().then((rows) => setBranches(rows.map(normalizeBranch))).catch(() => setBranches([]))
  }, [])

  const visible = useMemo(() => items.filter((item) => `${item.name} ${item.code} ${item.hod}`.toLowerCase().includes(query.toLowerCase())), [items, query])
  const totalPages = query.trim() ? 1 : serverTotalPages
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages)
  const pageItems = visible
  const activeCount = items.filter((item) => item.status === 'Active').length
  const relatedBranches = branches.filter((branch) => String(branch.departmentId) === String(selected?.id))
  const closeToList = () => { setScreen('list'); setSelected(null); setError('') }

  const loadDetail = async (item, nextScreen) => {
    setScreen(nextScreen); setSelected(item); setForm(nextScreen === 'form' ? { ...item, status: '' } : item); setError(''); setIsDetailsLoading(true)
    try { const response = await getDepartmentById(item.id); const detail = mapDepartment(recordFrom(response)); setSelected(detail); setForm({ ...detail, collegeId: detail.collegeNumericId ?? detail.collegeId, ...(nextScreen === 'form' ? { status: '' } : {}) }); setItems((current) => current.map((entry) => entry.id === detail.id ? detail : entry)) }
    catch (requestError) { setError(apiError(requestError, 'Unable to load department details. Please try again.')) }
    finally { setIsDetailsLoading(false) }
  }
  const toggleStatus = (item) => setPendingStatus({ item, nextStatus: item.status === 'Active' ? 'Inactive' : 'Active' })
  const confirmStatusChange = async () => {
    if (!pendingStatus || isStatusSaving) return
    const { item, nextStatus: status } = pendingStatus
    setIsStatusSaving(true); setError('')
    try { const response = await updateDepartmentStatus(item.id, status === 'Active' ? 1 : 0); const result = recordFrom(response); const updated = result?.id || result?.departmentId ? mapDepartment(result) : { ...item, status }; setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry)); if (selected?.id === item.id) setSelected(updated); setPendingStatus(null) }
    catch (requestError) { setError(apiError(requestError, 'Unable to update department status. Please try again.')) }
    finally { setIsStatusSaving(false) }
  }
  const removeDepartment = () => {}
  const save = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return setError('Department name is required.')
    if (!form.code.trim()) return setError('Department code is required.')
    if (!form.collegeId) return setError('Select a college for this department.')
    if (!form.status) return setError('Select a status for this department.')
    if (form.hodUserId !== '' && (!Number.isInteger(Number(form.hodUserId)) || Number(form.hodUserId) < 0)) return setError('HOD user ID must be a valid number.')
    if (items.some((item) => item.code === form.code.trim().toUpperCase() && item.id !== form.id)) return setError('This department code already exists.')
    setIsSaving(true); setError('')
    try { const response = form.id ? await updateDepartment(form.id, payloadFor(form)) : await createDepartment(payloadFor(form)); const result = recordFrom(response); const id = result?.id ?? result?.departmentId ?? form.id; if (form.status === 'Inactive' && id) await updateDepartmentStatus(id, 0); await loadDepartments(); closeToList() }
    catch (requestError) { setError(apiError(requestError, `Unable to ${form.id ? 'update' : 'create'} this department. Please try again.`)) }
    finally { setIsSaving(false) }
  }
  const saveHod = async (event) => {
    event.preventDefault()
    if (!String(form.hodName || '').trim()) return setError('Enter the HOD name.')
    setIsHodSaving(true); setError('')
    try { const names = savedHodNames(); names[form.id] = form.hodName.trim(); localStorage.setItem(HOD_NAMES_KEY, JSON.stringify(names)); let updated = mapDepartment({ ...form, hodName: form.hodName.trim() }); if (Number(form.hodUserId) > 0) { const response = await updateDepartment(form.id, payloadFor({ ...form, hodUserId: Number(form.hodUserId) })); const result = recordFrom(response); updated = mapDepartment({ ...form, ...(result || {}), id: form.id, hodUserId: result?.hodUserId ?? Number(form.hodUserId), hodName: form.hodName.trim() }); } setItems((current) => current.map((item) => item.id === form.id ? updated : item)); setSelected(updated); closeToList() }
    catch (requestError) { setError(apiError(requestError, 'Unable to assign the HOD. Please try again.')) }
    finally { setIsHodSaving(false) }
  }
  const field = (name, label, extra = {}) => <label className={name === 'description' ? 'full-width' : ''}><span>{label.endsWith(' *') ? <>{label.slice(0, -2)} <b className="required-mark">*</b></> : label}</span>{name === 'description' ? <textarea value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} {...extra} /> : <input value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} {...extra} />}</label>

  return <DashboardLayout><div className="management-page department-management">
    {screen === 'list' && <><div className="management-page__heading"><div><h1>Department Management</h1></div><div className="department-heading-stat" aria-label={`${activeCount} active departments`}><span><FiCheckCircle /></span><div><strong>{activeCount}</strong><small>Active departments</small></div></div></div>
      <section className="management-card department-list"><div className="department-list__top"><div className="department-section-title"><span><FiLayers /></span><h2>Department Directory</h2></div><button className="primary-button" onClick={() => { setForm(empty); setSelected(null); setError(''); setScreen('form') }}><FiPlus /> Add Department</button></div><FilterPanel active={Boolean(query)} onClear={() => { setQuery(''); setCurrentPage(1) }}><div className="department-controls department-controls--toolbar"><div className="department-search"><FiSearch aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} placeholder="Search departments" aria-label="Search departments" /></div></div></FilterPanel>
      {isLoading ? <p className="department-no-results">Loading departments...</p> : error ? <div className="department-no-results"><p className="department-error" role="alert">{error}</p><button type="button" className="secondary-button" onClick={() => loadDepartments(query, currentPage)}>Retry</button></div> : !items.length ? <div className="department-no-results"><p>No departments have been added yet.</p><button type="button" className="primary-button" onClick={() => { setForm(empty); setScreen('form') }}>Add Department</button></div> : <><div className="department-table-wrap"><table><thead><tr><th>Department</th><th>Code</th><th>Course</th><th>HOD</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pageItems.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td><code>{item.code || '—'}</code></td><td>B.Tech</td><td>{item.hod}</td><td><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span></td><td className="department-actions-cell"><div className="row-actions"><button title={`View ${item.name}`} aria-label={`View ${item.name}`} onClick={() => loadDetail(item, 'details')}><FiEye /></button><button title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} onClick={() => loadDetail(item, 'form')}><FiEdit3 /></button><button title={`Edit HOD for ${item.name}`} onClick={() => loadDetail(item, 'assign-hod')}><FiUserPlus /> <span>HOD</span></button><button className={`status-action ${item.status === 'Active' ? 'danger' : 'success'}`} title={item.status === 'Active' ? `Mark ${item.name} inactive` : `Mark ${item.name} active`} aria-label={item.status === 'Active' ? `Mark ${item.name} inactive` : `Mark ${item.name} active`} onClick={() => toggleStatus(item)}>{item.status === 'Active' ? <FiToggleRight /> : <FiToggleLeft />}</button><button title={`Delete ${item.name}`} aria-label={`Delete ${item.name}`} onClick={() => removeDepartment(item)} disabled={isDeleting}><FiTrash2 /></button></div></td></tr>)}</tbody></table></div>{!visible.length ? <p className="department-no-results">No departments match your search.</p> : <Pagination page={currentPageClamped} total={totalPages} setPage={setCurrentPage} />}</>}</section></>}
    {screen === 'form' && <Popup close={closeToList}><section className="management-card department-form-card"><Header title={form.id ? 'Edit Department' : 'Add Department'} subtitle="Enter the department information below." back={closeToList} /><form onSubmit={save}><div className="department-form-grid">{field('name', 'Department Name *', { placeholder: 'e.g. Computer Science & Engineering', required: true })}{field('code', 'Department Code *', { placeholder: 'e.g. CSE', required: true })}<label><span>College <b className="required-mark">*</b></span><select value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })} required><option value="">Select college</option>{colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label><label><span>Status <b className="required-mark">*</b></span><select required value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="" disabled>Select Status</option><option value="Active">Active</option><option value="Inactive">Deactive</option></select></label></div>{isDetailsLoading && <p className="department-no-results">Loading department details...</p>}{error && <p className="department-error" role="alert">{error}</p>}<Actions cancel={closeToList} submit={isSaving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Department'} disabled={isSaving} /></form></section></Popup>}
    {screen === 'assign-hod' && <Popup close={closeToList}><section className="management-card hod-card"><Header title="Assign HOD" subtitle={`Set the Head of Department for ${form.name || 'this department'}.`} back={closeToList} showClose={false} /><form onSubmit={saveHod}>{field('hodName', 'HOD Name *', { placeholder: 'e.g. Dr. Anitha Rao', required: true, autoFocus: true })}{isDetailsLoading && <p className="department-no-results">Loading department details...</p>}{error && <p className="department-error" role="alert">{error}</p>}<Actions cancel={closeToList} submit={isHodSaving ? 'Saving...' : 'Assign HOD'} disabled={isHodSaving} showCancelIcon={false} /></form></section></Popup>}
    {screen === 'details' && selected && <section className="department-profile-view"><div className="department-profile-topbar"><button className="secondary-button" onClick={closeToList}>← Back to Departments List</button></div><article className="department-profile-card department-details department-details--professional"><Header title={selected.name} subtitle={`${selected.code || 'No code'} · B.Tech`} back={closeToList} showClose={false} />{isDetailsLoading ? <p className="department-no-results">Loading department details...</p> : <><div className="department-details__identity"><div className="department-details__monogram">{(selected.code || selected.name).slice(0, 3)}</div><div><span>Academic Department</span><strong>{selected.name}</strong><small>{selected.code || 'No code'} · B.Tech</small></div><button className={`status-pill ${selected.status.toLowerCase()}`} onClick={() => toggleStatus(selected)}>● {selected.status}</button></div><div className="detail-grid department-details__grid"><div><span>Department Code</span><strong>{selected.code || 'Not specified'}</strong></div><div><span>College</span><strong>{selected.collegeName || selected.collegeId || 'Not specified'}</strong></div><div><span>Head of Department</span><strong>{selected.hod}</strong></div><div><span>Department Status</span><strong className={`department-detail-status ${selected.status.toLowerCase()}`}>{selected.status}</strong></div></div><div className="department-branches"><div><div><span>Associated B.Tech Branches</span><small>Courses mapped to this department</small></div><strong>{relatedBranches.length}</strong></div>{relatedBranches.length ? <div className="department-branch-list">{relatedBranches.map((branch) => <Link to={`/branches/${branch.id}`} key={branch.id}><strong>{branch.code}</strong><span>{branch.name}</span><small>View branch details →</small></Link>)}</div> : <p>No branches are assigned to this department yet.</p>}</div></>}{error && <p className="department-error" role="alert">{error}</p>}</article></section>}
    {pendingStatus && <StatusConfirmDialog entity="Department" name={`${pendingStatus.item.name} (${pendingStatus.item.code})`} nextStatus={pendingStatus.nextStatus} onCancel={() => setPendingStatus(null)} onConfirm={confirmStatusChange} busy={isStatusSaving} />}
  </div></DashboardLayout>
}
function Header({ title, subtitle, back, showClose = true }) { return <div className="screen-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{showClose && <button className="department-popup-close" type="button" onClick={back} aria-label="Close popup" title="Close"><X aria-hidden="true" /></button>}</div> }
function Actions({ cancel, submit, disabled, showCancelIcon = true }) { return <div className="form-actions"><button type="button" className="secondary-button" onClick={cancel} disabled={disabled}>{showCancelIcon && <X aria-hidden="true" />} Cancel</button><button type="submit" disabled={disabled}><Save aria-hidden="true" /> {submit}</button></div> }
function Pagination({ page, total, setPage }) { return <div className="department-pagination"><div className="pagination-controls"><button className="pagination-btn" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1}>Previous</button><span className="pagination-status">Page {page} of {total}</span><button className="pagination-btn" onClick={() => setPage((value) => Math.min(value + 1, total))} disabled={page === total}>Next</button></div></div> }
function Popup({ children, close }) { return <div className="department-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>{children}</div> }
