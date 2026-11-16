import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { demoRequestsApi } from '../../api/apiEndpoints.js'
import './PlatformManagement.css'

const dateLabel = value => {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const statusLabel = value => String(value || 'Pending').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
const locationLabel = row => [row.city, row.state].filter(Boolean).join(', ') || '—'

export default function DemoRequests() {
  const { access, canView, loading: accessLoading } = useScreenAccess()
  const isSuperAdmin = access?.isSuperAdmin === true
  const permitted = isSuperAdmin && canView('/demo-requests')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All statuses')

  useEffect(() => {
    if (!permitted) return
    let active = true
    setLoading(true)
    setError('')
    demoRequestsApi.list()
      .then(rows => { if (active) setRequests(rows) })
      .catch(reason => { if (active) setError(reason.message || 'Demo requests could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [permitted])

  const visibleRequests = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return requests.filter(row => {
      const matchesStatus = status === 'All statuses' || String(row.status || '').toLowerCase() === status.toLowerCase()
      const matchesSearch = !needle || [row.fullName, row.email, row.mobile, row.institutionName, row.role, row.city, row.state, row.requestId]
        .some(value => String(value ?? '').toLowerCase().includes(needle))
      return matchesStatus && matchesSearch
    })
  }, [requests, search, status])

  const pendingCount = requests.filter(row => String(row.status).toLowerCase() === 'pending').length
  const scheduledCount = requests.filter(row => row.demoDate).length

  return <DashboardLayout>
    <main className="platform-management">
      <PageHeader title="Demo Requests" subtitle="Review demo requests submitted from the public landing page."
        compactSummary={[
          { label: 'Total requests', value: requests.length },
          { label: 'Pending', value: pendingCount },
          { label: 'Scheduled', value: scheduledCount },
        ]} />

      {!accessLoading && !permitted && <section className="platform-management__notice" role="alert">This workspace is available to Super Admins.</section>}
      {error && <section className="platform-management__notice platform-management__notice--error" role="alert">{error}</section>}

      {permitted && <section className="platform-management__card" aria-label="Demo request directory">
        <div className="platform-management__toolbar">
          <div>
            <h2>Landing page requests</h2>
            <p>Contact details, organization information, and requested demo schedules.</p>
          </div>
          <span className="platform-management__count">{visibleRequests.length} of {requests.length}</span>
        </div>
        <div className="platform-management__filters">
          <label className="platform-management__search">
            <span className="platform-management__sr-only">Search requests</span>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, organization, email, or phone" />
          </label>
          <label className="platform-management__select-label">
            <span>Status</span>
            <select value={status} onChange={event => setStatus(event.target.value)}>
              <option>All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONTACTED">Contacted</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>

        {loading ? <p className="platform-management__state" role="status">Loading demo requests…</p> :
          <div className="platform-management__table-wrap"><table className="platform-management__table">
            <thead><tr><th>Contact</th><th>Organization</th><th>Role</th><th>Students</th><th>Location</th><th>Requested demo</th><th>Status</th><th>Notes / consent</th><th>Submitted</th></tr></thead>
            <tbody>{visibleRequests.map(row => <tr key={row.requestId}>
              <td><strong>{row.fullName || 'Unnamed contact'}</strong><small>{row.email || '—'}{row.mobile ? ` · ${row.mobile}` : ''}</small></td>
              <td>{row.institutionName || '—'}</td>
              <td>{row.role || '—'}</td>
              <td>{row.numberOfStudents ?? '—'}</td>
              <td>{locationLabel(row)}</td>
              <td>{row.demoDate ? `${dateLabel(row.demoDate)}${row.demoTime ? ` · ${String(row.demoTime).slice(0, 5)}` : ''}` : 'Not scheduled'}</td>
              <td><span className={`platform-management__status platform-management__status--${String(row.status || 'pending').toLowerCase()}`}>{statusLabel(row.status)}</span></td>
              <td>{row.remarks || '—'}<small>{row.agreeToContact ? 'Contact consent given' : 'No contact consent'}</small></td>
              <td>{dateLabel(row.createdAt)}</td>
            </tr>)}</tbody>
          </table>{!visibleRequests.length && <p className="platform-management__state">{requests.length ? 'No requests match these filters.' : 'No demo requests have been submitted yet.'}</p>}</div>}
      </section>}
    </main>
  </DashboardLayout>
}
