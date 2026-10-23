import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiDownload, FiEye, FiPlus, FiRefreshCw, FiSearch, FiShield, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { AcademicProvider } from '../../context/AcademicContext.jsx'
import { userDirectoryApi } from '../../api/apiEndpoints.js'
import UserAccessMockWorkspace from './UserAccessMockWorkspace.jsx'
import './UserAccessManagement.css'

const PAGE_SIZE = 10
const accountId = user => user.userId ?? user.UserId ?? user.user_id ?? user.id ?? ''
const value = (user, ...keys) => keys.map(key => user?.[key]).find(item => item !== undefined && item !== null && item !== '')
const isActive = user => [1, true, '1', 'active', 'Active'].includes(value(user, 'status', 'Status'))
const statusLabel = user => isActive(user) ? 'Active' : 'Inactive'
const display = item => item === undefined || item === null || item === '' ? '—' : String(item)
const formatDate = item => {
  if (!item) return '—'
  const date = new Date(item)
  return Number.isNaN(date.getTime()) ? String(item) : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function UserDetailsDialog({ user, onClose }) {
  if (!user) return null
  const fields = [
    ['Account ID', accountId(user)], ['Employee User ID', value(user, 'employeeUserId', 'EmployeeUserId')],
    ['Full name', value(user, 'fullName', 'FullName')], ['Email', value(user, 'email', 'Email')],
    ['Phone', value(user, 'mobile', 'Mobile')], ['College ID', value(user, 'collegeId', 'CollegeId')],
    ['Account status', statusLabel(user)], ['Created', formatDate(value(user, 'createdAt', 'CreatedAt'))],
    ['Updated', formatDate(value(user, 'updatedAt', 'UpdatedAt'))],
  ]
  return <div className="user-directory__backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="user-directory__dialog" role="dialog" aria-modal="true" aria-labelledby="user-detail-title">
      <header><div><span className="user-directory__eyebrow">Account details</span><h2 id="user-detail-title">{display(value(user, 'fullName', 'FullName'))}</h2></div><button className="user-directory__icon-button" type="button" onClick={onClose} aria-label="Close details"><FiX /></button></header>
      <dl>{fields.map(([label, fieldValue]) => <div key={label}><dt>{label}</dt><dd>{display(fieldValue)}</dd></div>)}</dl>
      <p className="user-directory__hint"><FiShield aria-hidden="true" /> Roles, permissions, and department are not included in the backend user account response.</p>
      <footer><button type="button" className="user-directory__button user-directory__button--primary" onClick={onClose}>Close</button></footer>
    </section>
  </div>
}

function UserDirectory() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [notice, setNotice] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await userDirectoryApi.getAll())
    } catch (reason) {
      setError(reason?.message || 'Users could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    userDirectoryApi.getAll()
      .then(rows => { if (active) setUsers(rows) })
      .catch(reason => { if (active) setError(reason?.message || 'Users could not be loaded. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter(user => {
      const matchesSearch = !query || [accountId(user), value(user, 'employeeUserId', 'EmployeeUserId'), value(user, 'fullName', 'FullName'), value(user, 'email', 'Email'), value(user, 'collegeId', 'CollegeId')].some(item => String(item ?? '').toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? isActive(user) : !isActive(user))
      return matchesSearch && matchesStatus
    })
  }, [users, search, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const shownUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const activeCount = users.filter(isActive).length

  const exportUsers = async () => {
    setNotice('')
    try {
      const result = await userDirectoryApi.exportCsv({ Search: search, Status: statusFilter === 'all' ? '' : statusFilter })
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i)?.[1] || 'users.csv'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setNotice('User export downloaded.')
    } catch (reason) {
      setError(reason?.message || 'The user export could not be downloaded.')
    }
  }

  return <main className="user-directory">
    <header className="user-directory__header">
      <div><span className="user-directory__eyebrow">Administration / Access</span><h1>User Access Management</h1><p>View system login accounts and their college access details.</p></div>
      <div className="user-directory__header-actions">
        <button type="button" className="user-directory__button" onClick={exportUsers} disabled={loading || Boolean(error)}><FiDownload /> Export CSV</button>
        <button type="button" className="user-directory__button user-directory__button--primary" onClick={() => setNotice('Account creation is not available: the backend has no administrator user-creation endpoint. New login accounts currently come from the access-request approval workflow.') }><FiPlus /> Add User</button>
      </div>
    </header>

    {notice && <div className="user-directory__notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><FiX /></button></div>}
    <section className="user-directory__capability" aria-label="Available account management features">
      <FiShield aria-hidden="true" />
      <p><strong>Account management capabilities are limited by the current backend.</strong> The live API supports account listing and export only. Editing, activation, deactivation, password reset, unlock, role assignment, and department links are not exposed for this screen.</p>
    </section>

    <section className="user-directory__stats" aria-label="User totals">
      <article><span className="user-directory__stat-icon"><FiUsers /></span><div><span>Total accounts</span><strong>{loading ? '—' : users.length}</strong></div></article>
      <article><span className="user-directory__stat-icon user-directory__stat-icon--green">●</span><div><span>Active</span><strong>{loading ? '—' : activeCount}</strong></div></article>
      <article><span className="user-directory__stat-icon user-directory__stat-icon--gray">●</span><div><span>Inactive</span><strong>{loading ? '—' : users.length - activeCount}</strong></div></article>
    </section>

    <section className="user-directory__panel">
      <div className="user-directory__panel-heading"><div><h2>All accounts</h2><p>Search by account ID, employee ID, name, email, or college.</p></div><button type="button" className="user-directory__icon-button" onClick={loadUsers} disabled={loading} aria-label="Refresh users"><FiRefreshCw className={loading ? 'is-spinning' : ''} /></button></div>
      <div className="user-directory__filters">
        <label className="user-directory__search"><FiSearch aria-hidden="true" /><span className="sr-only">Search users</span><input type="search" value={search} placeholder="Search users…" onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
        <label><span>Account status</span><select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </div>

      {error && <div className="user-directory__error" role="alert"><strong>Unable to load users</strong><span>{error}</span><button type="button" className="user-directory__button" onClick={loadUsers}>Try again</button></div>}
      {!error && loading && <div className="user-directory__loading" role="status"><span className="user-directory__spinner" />Loading accounts…</div>}
      {!error && !loading && users.length === 0 && <div className="user-directory__empty"><span className="user-directory__empty-icon"><FiUsers /></span><h3>No user accounts found</h3><p>The backend returned no accounts for this college.</p></div>}
      {!error && !loading && users.length > 0 && filteredUsers.length === 0 && <div className="user-directory__empty"><h3>No matching accounts</h3><p>Try changing your search or status filter.</p><button type="button" className="user-directory__button" onClick={() => { setSearch(''); setStatusFilter('all') }}>Clear filters</button></div>}

      {!error && !loading && shownUsers.length > 0 && <>
        <div className="user-directory__table-wrap"><table><thead><tr><th scope="col">Account ID</th><th scope="col">Employee ID</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Mobile</th><th scope="col">College ID</th><th scope="col">Created</th><th scope="col">Updated</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>
          {shownUsers.map((user, index) => <tr key={accountId(user) || index}>
            <td data-label="Account ID"><strong>{display(accountId(user))}</strong></td>
            <td data-label="Employee ID"><strong>{display(value(user, 'employeeUserId', 'EmployeeUserId'))}</strong></td>
            <td data-label="Name">{display(value(user, 'fullName', 'FullName'))}</td>
            <td data-label="Email">{display(value(user, 'email', 'Email'))}</td>
            <td data-label="Mobile">{display(value(user, 'mobile', 'Mobile'))}</td>
            <td data-label="College ID">{display(value(user, 'collegeId', 'CollegeId'))}</td>
            <td data-label="Created">{formatDate(value(user, 'createdAt', 'CreatedAt'))}</td>
            <td data-label="Updated">{formatDate(value(user, 'updatedAt', 'UpdatedAt'))}</td>
            <td data-label="Status"><span className={`user-directory__status ${isActive(user) ? 'is-active' : 'is-inactive'}`}><i />{statusLabel(user)}</span></td>
            <td data-label="Actions"><button type="button" className="user-directory__view" onClick={() => setSelectedUser(user)}><FiEye /> View</button></td>
          </tr>)}
        </tbody></table></div>
        <footer className="user-directory__pagination"><span>Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredUsers.length)}–{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} accounts</span><div><button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}>Next</button></div></footer>
      </>}
    </section>
    <section className="user-directory__mock-panel" aria-label="Separate mock workspace">
      <UserAccessMockWorkspace />
    </section>
    <UserDetailsDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
  </main>
}

export default function UserAccessManagement() {
  return <AcademicProvider><DashboardLayout><UserDirectory /></DashboardLayout></AcademicProvider>
}
