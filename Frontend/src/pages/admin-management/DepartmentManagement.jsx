import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft as ArrowLeft, FiCheckCircle, FiEye, FiLayers, FiSliders, FiEdit3, FiPlus, FiSave as Save, FiSearch, FiUserPlus, FiX as X } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import { getBranches } from '../courseManagement/Course'
import './DepartmentManagement.css'

export const departmentSeed = [
  ['Computer Science & Engineering', 'CSE', 'Dr. Anjali Sharma', 'B.Tech'],
  ['CSE AI & ML', 'CSE-AIML', 'Dr. Rohan Verma', 'B.Tech'],
  ['CSE Data Science', 'CSE-DS', 'Not assigned', 'B.Tech'],
  ['Electronics & Communication Engineering', 'ECE', 'Dr. Priya Nair', 'B.Tech'],
  ['Electrical & Electronics Engineering', 'EEE', 'Not assigned', 'B.Tech'],
  ['Mechanical Engineering', 'MECH', 'Not assigned', 'B.Tech'],
  ['Civil Engineering', 'CIVIL', 'Not assigned', 'B.Tech'],
  ['B.Sc Computers', 'BSC-COMP', 'Not assigned', 'Degree'],
  ['B.Com General', 'BCOM-GEN', 'Not assigned', 'Degree'],
  ['B.Com Computers', 'BCOM-COMP', 'Not assigned', 'Degree'],
  ['BBA', 'BBA', 'Not assigned', 'Degree'],
  ['BA', 'BA', 'Not assigned', 'Degree'],
].map(([name, code, hod, type], index) => ({
  id: index + 1,
  name,
  code,
  hod,
  type,
  status: index === 4 ? 'Inactive' : 'Active',
  description: `${type} programme for ${name}.`,
}))

const empty = { name: '', code: '', hod: '', description: '', type: 'B.Tech', status: 'Active' }
const STORAGE_KEY = 'btech-departments'
const loadDepartments = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return Array.isArray(stored) && stored.length ? stored : departmentSeed
  } catch {
    return departmentSeed
  }
}

export default function DepartmentManagement() {
  const [items, setItems] = useState(loadDepartments)
  const [screen, setScreen] = useState('list')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(empty)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const persist = (updater) => {
    setItems((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          `${item.name} ${item.code} ${item.hod}`.toLowerCase().includes(query.toLowerCase()) &&
          (type === 'All' || item.type === type)
      ),
    [items, query, type]
  )

  const totalPages = Math.ceil(visible.length / itemsPerPage) || 1
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages)
  const activeCount = items.filter((item) => item.status === 'Active').length
  const relatedBranches = getBranches().filter((branch) => String(branch.departmentId) === String(selected?.id))

  const paginatedItems = useMemo(() => {
    const start = (currentPageClamped - 1) * itemsPerPage
    return visible.slice(start, start + itemsPerPage)
  }, [visible, currentPageClamped, itemsPerPage])

  const edit = (item) => {
    setSelected(item)
    setForm({ ...item })
    setError('')
    setScreen('form')
  }

  const details = (item) => {
    setSelected(item)
    setScreen('details')
  }

  const openAssignHod = (item) => {
    setSelected(item)
    setForm({ hod: item.hod === 'Not assigned' ? '' : item.hod })
    setError('')
    setScreen('hod')
  }

  const toggleStatus = (item) => {
    const changed = { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' }
    persist((all) => all.map((entry) => (entry.id === item.id ? changed : entry)))
    if (selected?.id === item.id) setSelected(changed)
  }

  const save = (event) => {
    event.preventDefault()
    const code = form.code.trim().toUpperCase()
    if (!form.name.trim() || !code) return setError('Department name and department code are required.')
    if (items.some((item) => item.code === code && item.id !== form.id))
      return setError('This department code already exists.')

    const next = {
      ...form,
      name: form.name.trim(),
      code,
      hod: form.hod.trim() || 'Not assigned',
      description: form.description.trim(),
    }
    persist((all) => (form.id ? all.map((item) => (item.id === form.id ? next : item)) : [...all, { ...next, id: Date.now() }]))
    setScreen('list')
  }

  const assignHod = (event) => {
    event.preventDefault()
    if (!form.hod.trim()) return setError('Enter the Head of Department name.')
    const next = { ...selected, hod: form.hod.trim() }
    persist((all) => all.map((item) => (item.id === next.id ? next : item)))
    setSelected(next)
    setScreen('list')
  }

  const field = (name, label, extra = {}) => (
    <label>
      {label}
      <input
        value={form[name]}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        {...extra}
      />
    </label>
  )

  return (
    <DashboardLayout>
      <div className="management-page department-management">
        <div className="management-page__heading">
          <div>
            <h1>Department Management</h1>
          </div>
          <div className="department-heading-stat" aria-label={`${activeCount} active departments`}>
            <span><FiCheckCircle /></span>
            <div><strong>{activeCount}</strong><small>Active departments</small></div>
          </div>
        </div>

        {screen === 'list' && (
          <section className="management-card department-list">
            <div className="department-list__top">
              <div>
                <div className="department-section-title"><span><FiLayers /></span><h2>Department Directory</h2></div>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setForm(empty)
                  setError('')
                  setScreen('form')
                }}
              >
                <FiPlus /> Add Department
              </button>
            </div>
            <div className="department-controls department-controls--toolbar">
                  <div className="department-search">
                    <FiSearch aria-hidden="true" />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Search departments"
                      aria-label="Search departments"
                    />
                  </div>
                  <div className="department-filter">
                    <FiSliders aria-hidden="true" />
                    <select
                      value={type}
                      onChange={(event) => {
                        setType(event.target.value)
                        setCurrentPage(1)
                      }}
                      aria-label="Filter by programme"
                    >
                      <option>All</option>
                      <option>B.Tech</option>
                      <option>Degree</option>
                    </select>
                  </div>
            </div>

            <div className="department-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                    <th>Programme</th>
                    <th>HOD</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <span>{item.description}</span>
                      </td>
                      <td><code>{item.code}</code></td>
                      <td>{item.type}</td>
                      <td>{item.hod}</td>
                      <td>
                        <button
                          className={`status-pill ${item.status.toLowerCase()}`}
                          onClick={() => toggleStatus(item)}
                        >
                          {item.status}
                        </button>
                      </td>
                      <td className="department-actions-cell">
                        <div className="row-actions">
                          <button title={`View ${item.name}`} aria-label={`View ${item.name}`} onClick={() => details(item)}><FiEye /></button>
                          <button title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} onClick={() => edit(item)}><FiEdit3 /></button>
                          <button className="assign-hod" title={`Assign HOD for ${item.name}`} onClick={() => openAssignHod(item)}><FiUserPlus /> <span>HOD</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!visible.length ? (
              <p className="department-no-results">No departments match your search.</p>
            ) : (
              <div className="department-pagination">
                <div className="pagination-info">
                  Showing {Math.min((currentPageClamped - 1) * itemsPerPage + 1, visible.length)} to{' '}
                  {Math.min(currentPageClamped * itemsPerPage, visible.length)} of {visible.length} departments
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPageClamped === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${page === currentPageClamped ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPageClamped === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {screen === 'form' && (
          <section className="management-card department-form-card">
            <Header
              title={form.id ? 'Edit Department' : 'Add Department'}
              subtitle="Enter the department information below."
              back={() => setScreen('list')}
            />
            <form onSubmit={save}>
              <div className="department-form-grid">
                {field('name', 'Department Name *', { placeholder: 'e.g. Computer Science & Engineering', required: true })}
                {field('code', 'Department Code *', { placeholder: 'e.g. CSE', required: true })}
                <label>
                  Programme
                  <select
                    value={form.type}
                    onChange={(event) => setForm({ ...form, type: event.target.value })}
                  >
                    <option>B.Tech</option>
                    <option>Degree</option>
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
                <label className="full-width">
                  HOD
                  <input
                    value={form.hod}
                    onChange={(event) => setForm({ ...form, hod: event.target.value })}
                    placeholder="Enter Head of Department name"
                  />
                </label>
                <label className="full-width">
                  Description
                  <textarea
                    rows="4"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Brief department description"
                  />
                </label>
              </div>
              {error && <p className="department-error">{error}</p>}
              <Actions cancel={() => setScreen('list')} submit={form.id ? 'Save Changes' : 'Create Department'} />
            </form>
          </section>
        )}

        {screen === 'details' && selected && (
          <section className="management-card department-details">
            <Header
              title={selected.name}
              subtitle={`${selected.code} · ${selected.type}`}
              back={() => setScreen('list')}
            />
            <div className="detail-grid">
              <div>
                <span>Department Code</span>
                <strong>{selected.code}</strong>
              </div>
              <div>
                <span>Status</span>
                <button
                  className={`status-pill ${selected.status.toLowerCase()}`}
                  onClick={() => toggleStatus(selected)}
                >
                  {selected.status}
                </button>
              </div>
              <div>
                <span>Head of Department</span>
                <strong>{selected.hod}</strong>
              </div>
              <div>
                <span>Programme</span>
                <strong>{selected.type}</strong>
              </div>
              <div className="detail-description">
                <span>Description</span>
                <p>{selected.description || 'No description added.'}</p>
              </div>
            </div>
            <div className="department-branches">
              <div><span>Associated B.Tech Branches</span><strong>{relatedBranches.length}</strong></div>
              {relatedBranches.length ? <div className="department-branch-list">{relatedBranches.map((branch) => <Link to={`/branches/${branch.id}`} key={branch.id}><strong>{branch.code}</strong><span>{branch.name}</span></Link>)}</div> : <p>No branches are assigned to this department.</p>}
            </div>
          </section>
        )}

        {screen === 'hod' && selected && (
          <section className="management-card hod-card">
            <Header
              title="Assign HOD"
              subtitle={`Assign a Head of Department for ${selected.name}.`}
              back={() => setScreen('list')}
            />
            <form onSubmit={assignHod}>
              {field('hod', 'Head of Department', { autoFocus: true, placeholder: 'Enter HOD name' })}
              {error && <p className="department-error">{error}</p>}
              <Actions cancel={() => setScreen('list')} submit="Assign HOD" />
            </form>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}

function Header({ title, subtitle, back }) {
  return (
    <div className="screen-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <button className="secondary-button" onClick={back}>
        <ArrowLeft aria-hidden="true" /> Back to List
      </button>
    </div>
  )
}

function Actions({ cancel, submit }) {
  return (
    <div className="form-actions">
      <button type="button" className="secondary-button" onClick={cancel}>
        <X aria-hidden="true" /> Cancel
      </button>
      <button type="submit"><Save aria-hidden="true" /> {submit}</button>
    </div>
  )
}
