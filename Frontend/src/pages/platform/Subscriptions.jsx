import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiCheckCircle, FiCreditCard, FiFilter, FiPlus, FiRefreshCw, FiSearch, FiUsers, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { subscriptionsApi } from '../../api/apiEndpoints.js'
import { getColleges, unwrapCollegeRecord } from '../../auth/collegeApi.js'
import './PlatformManagement.css'

const emptyForm = () => ({ organizationId: '', planName: '', billingCycle: 'Monthly', price: '', maximumUsers: '', status: 'Active', startDate: '', endDate: '' })
const listFrom = response => {
  let current = response
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (Array.isArray(current)) return current
    if (typeof current !== 'object') return []
    const collection = current.organizations ?? current.colleges ?? current.items ?? current.records ?? current.rows
    if (Array.isArray(collection)) return collection
    current = current.data ?? current.result ?? current.payload
  }
  return []
}
const dateValue = value => {
  if (!value) return null
  const raw = String(value).slice(0, 10)
  const [year, month, day] = raw.split('-').map(Number)
  if (year && month && day) return new Date(year, month - 1, day)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const dateLabel = value => {
  if (!value) return 'Not set'
  const date = dateValue(value)
  return date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : String(value)
}
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0)
const statusKey = value => String(value || 'unknown').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
const remainingDays = value => {
  const date = dateValue(value)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
}

export default function Subscriptions() {
  const { access, canView, canAction, loading: accessLoading } = useScreenAccess()
  const isSuperAdmin = access?.isSuperAdmin === true
  const permitted = isSuperAdmin && canView('/subscriptions')
  const canCreate = permitted && canAction('/subscriptions', 'create')
  const [organizations, setOrganizations] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [formOpen, setFormOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [cycleFilter, setCycleFilter] = useState('All billing cycles')

  const refresh = async () => {
    setRefreshing(true)
    try {
      const rows = await subscriptionsApi.list()
      setSubscriptions(rows)
      return rows
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!permitted) return
    let active = true
    setLoading(true)
    setError('')
    Promise.allSettled([getColleges(), subscriptionsApi.list()]).then(([organizationResult, subscriptionResult]) => {
      if (!active) return
      if (organizationResult.status === 'fulfilled') {
        setOrganizations(listFrom(organizationResult.value).map(item => unwrapCollegeRecord(item)).map(item => ({
          id: item.collegeId ?? item.CollegeId ?? item.id ?? item.organizationId,
          name: item.collegeName ?? item.CollegeName ?? item.name ?? item.organizationName,
        })).filter(item => item.id != null && item.name))
      } else {
        setError(organizationResult.reason?.message || 'Organizations could not be loaded.')
      }
      if (subscriptionResult.status === 'fulfilled') setSubscriptions(subscriptionResult.value)
      else setError(subscriptionResult.reason?.message || 'Subscriptions could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [permitted])

  const organizationOptions = useMemo(() => [...organizations].sort((a, b) => a.name.localeCompare(b.name)), [organizations])
  const selectedOrganization = organizationOptions.find(item => String(item.id) === String(form.organizationId))
  const activeCount = subscriptions.filter(item => String(item.status).toLowerCase() === 'active').length
  const trialCount = subscriptions.filter(item => String(item.status).toLowerCase() === 'trial').length
  const expiringCount = subscriptions.filter(item => {
    const days = remainingDays(item.endDate)
    return String(item.status).toLowerCase() === 'active' && days != null && days >= 0 && days <= 30
  }).length
  const visibleSubscriptions = useMemo(() => {
    const term = search.trim().toLowerCase()
    return subscriptions.filter(item => {
      const matchesSearch = !term || [item.organizationName, item.planName, item.billingCycle, item.status]
        .some(value => String(value ?? '').toLowerCase().includes(term))
      const matchesStatus = statusFilter === 'All statuses' || String(item.status || '').toLowerCase() === statusFilter.toLowerCase()
      const matchesCycle = cycleFilter === 'All billing cycles' || String(item.billingCycle || '').toLowerCase() === cycleFilter.toLowerCase()
      return matchesSearch && matchesStatus && matchesCycle
    })
  }, [subscriptions, search, statusFilter, cycleFilter])

  const updateField = event => {
    const { name, value } = event.target
    setForm(current => ({
      ...current,
      [name]: value,
      ...(name === 'startDate' && current.endDate && current.endDate < value ? { endDate: '' } : {}),
    }))
  }

  const submit = async event => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const created = await subscriptionsApi.create({
        ...form,
        organizationId: Number(form.organizationId),
        price: Number(form.price),
        maximumUsers: Number(form.maximumUsers),
      })
      if (created?.subscriptionId) setSubscriptions(current => [created, ...current])
      else await refresh()
      setForm(emptyForm())
      setNotice('Subscription created successfully.')
    } catch (reason) {
      setError(reason.message || 'The subscription could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return <DashboardLayout>
    <main className="platform-management platform-subscriptions">
      <PageHeader title="Subscriptions" subtitle="Manage organization plans, billing terms, and user capacity."
        breadcrumb={['Home', 'Platform', 'Subscriptions']}
        compactSummary={[
          { label: 'Total', value: subscriptions.length },
          { label: 'Active', value: activeCount, tone: 'active' },
          { label: 'Trial', value: trialCount, tone: 'warning' },
          { label: 'Expiring soon', value: expiringCount, tone: 'warning' },
        ]} />

      {!accessLoading && !permitted && <section className="platform-management__notice" role="alert">This workspace is available to Super Admins.</section>}
      {error && <section className="platform-management__notice platform-management__notice--error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><FiX /></button></section>}
      {notice && <section className="platform-management__notice platform-management__notice--success" role="status"><FiCheckCircle />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><FiX /></button></section>}

      {permitted && <>
        {canCreate && <section className="platform-management__card platform-subscriptions__create" aria-label="Create subscription">
          <div className="platform-management__toolbar platform-subscriptions__toolbar">
            <div className="platform-subscriptions__section-title">
              <span className="platform-subscriptions__icon"><FiCreditCard /></span>
              <div><span className="platform-subscriptions__eyebrow">PLAN SETUP</span><h2>Create subscription</h2><p>Assign a plan, billing term, and user limit to an organization.</p></div>
            </div>
            <button type="button" className="platform-subscriptions__toggle" onClick={() => setFormOpen(value => !value)} aria-expanded={formOpen}>
              {formOpen ? <FiX /> : <FiPlus />}{formOpen ? 'Hide form' : 'New subscription'}
            </button>
          </div>
          {formOpen && <div className="platform-subscriptions__form-layout">
            <form className="platform-management__form platform-subscriptions__form" onSubmit={submit}>
              <label><span>Organization <b>*</b></span><select name="organizationId" value={form.organizationId} onChange={updateField} required disabled={loading || organizationOptions.length === 0}>
                <option value="">Select organization</option>{organizationOptions.map(organization => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select></label>
              <label><span>Plan name <b>*</b></span><input name="planName" value={form.planName} onChange={updateField} maxLength="120" placeholder="e.g. Growth" required /></label>
              <label><span>Billing cycle <b>*</b></span><select name="billingCycle" value={form.billingCycle} onChange={updateField} required>
                <option>Monthly</option><option>Quarterly</option><option>Half-yearly</option><option>Yearly</option>
              </select></label>
              <label><span>Price (₹) <b>*</b></span><input name="price" type="number" min="0" step="0.01" value={form.price} onChange={updateField} placeholder="0.00" required /></label>
              <label><span>Maximum users <b>*</b></span><input name="maximumUsers" type="number" min="1" step="1" value={form.maximumUsers} onChange={updateField} placeholder="e.g. 500" required /></label>
              <label><span>Status <b>*</b></span><select name="status" value={form.status} onChange={updateField} required>
                <option>Active</option><option>Trial</option><option>Suspended</option><option>Cancelled</option>
              </select></label>
              <label><span>Start date <b>*</b></span><input name="startDate" type="date" value={form.startDate} onChange={updateField} required /></label>
              <label><span>End date <b>*</b></span><input name="endDate" type="date" value={form.endDate} onChange={updateField} min={form.startDate || undefined} required /></label>
              <div className="platform-management__form-actions platform-subscriptions__form-actions">
                <span>All fields are required.</span>
                <button type="submit" disabled={saving || loading || organizationOptions.length === 0}>{saving ? 'Saving…' : <><FiCheckCircle />Create subscription</>}</button>
              </div>
              {!loading && organizationOptions.length === 0 && <p className="platform-management__hint platform-subscriptions__empty-org">No organizations are available. Add an organization before creating a subscription.</p>}
            </form>
            <aside className="platform-subscriptions__preview" aria-label="Live subscription preview">
              <div className="platform-subscriptions__preview-heading"><span>LIVE PREVIEW</span><span className={`platform-management__status platform-management__status--${statusKey(form.status)}`}>{form.status}</span></div>
              <p className="platform-subscriptions__preview-org">{selectedOrganization?.name || 'Select an organization'}</p>
              <h3>{form.planName.trim() || 'Your plan name'}</h3>
              <div className="platform-subscriptions__price">{form.price === '' ? money(0) : money(form.price)}<small>/ {form.billingCycle.toLowerCase()}</small></div>
              <dl>
                <div><dt><FiUsers />Maximum users</dt><dd>{form.maximumUsers || '—'}</dd></div>
                <div><dt><FiCalendar />Starts</dt><dd>{dateLabel(form.startDate)}</dd></div>
                <div><dt><FiCalendar />Ends</dt><dd>{dateLabel(form.endDate)}</dd></div>
              </dl>
              <p className="platform-subscriptions__preview-note">You can review these terms in the directory after saving.</p>
            </aside>
          </div>}
        </section>}

        <section className="platform-management__card platform-subscriptions__directory" aria-label="Subscription directory">
          <div className="platform-management__toolbar platform-subscriptions__directory-heading">
            <div className="platform-subscriptions__section-title">
              <span className="platform-subscriptions__icon platform-subscriptions__icon--directory"><FiUsers /></span>
              <div><span className="platform-subscriptions__eyebrow">ORGANIZATION PLANS</span><h2>Subscription directory</h2><p>Review billing, capacity, and renewal dates across organizations.</p></div>
            </div>
            <span className="platform-management__count">{visibleSubscriptions.length} of {subscriptions.length} records</span>
          </div>
          <div className="platform-subscriptions__filters">
            <label className="platform-subscriptions__search">
              <span className="platform-management__sr-only">Search subscriptions</span><FiSearch />
              <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search organization or plan" />
            </label>
            <label><FiFilter /><span className="platform-management__sr-only">Filter by status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option>All statuses</option><option>Active</option><option>Trial</option><option>Suspended</option><option>Cancelled</option>
            </select></label>
            <label><FiCreditCard /><span className="platform-management__sr-only">Filter by billing cycle</span><select value={cycleFilter} onChange={event => setCycleFilter(event.target.value)}>
              <option>All billing cycles</option><option>Monthly</option><option>Quarterly</option><option>Half-yearly</option><option>Yearly</option>
            </select></label>
            <button type="button" className="platform-subscriptions__refresh" onClick={() => refresh().catch(reason => setError(reason.message || 'Subscriptions could not be refreshed.'))} disabled={refreshing || loading} aria-label="Refresh subscriptions" title="Refresh subscriptions">
              <FiRefreshCw className={refreshing ? 'is-spinning' : ''} />{refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
          {loading ? <p className="platform-management__state" role="status">Loading subscriptions…</p> :
            <div className="platform-management__table-wrap"><table className="platform-management__table platform-subscriptions__table">
              <thead><tr><th>Organization / plan</th><th>Billing</th><th>Price</th><th>Maximum users</th><th>Status</th><th>Subscription term</th></tr></thead>
              <tbody>{visibleSubscriptions.map((row, index) => {
                const days = remainingDays(row.endDate)
                const status = statusKey(row.status)
                const rowId = row.subscriptionId ?? row.id ?? `${row.organizationId}-${row.planName}-${index}`
                return <tr key={rowId}>
                  <td><strong>{row.organizationName || 'Unnamed organization'}</strong><small>{row.planName || 'Plan not named'}</small></td>
                  <td><span className="platform-subscriptions__cycle">{row.billingCycle || '—'}</span></td>
                  <td className="platform-subscriptions__price-cell"><strong>{money(row.price)}</strong></td>
                  <td><span className="platform-subscriptions__capacity"><FiUsers />{row.maximumUsers ?? '—'}<small>users</small></span></td>
                  <td><span className={`platform-management__status platform-management__status--${status}`}>{row.status || 'Unknown'}</span></td>
                  <td><strong>{dateLabel(row.startDate)} – {dateLabel(row.endDate)}</strong><small>{days == null ? 'Term not set' : days < 0 ? 'Expired' : days === 0 ? 'Ends today' : `Ends in ${days} day${days === 1 ? '' : 's'}`}</small></td>
                </tr>
              })}</tbody>
            </table>{!visibleSubscriptions.length && <div className="platform-subscriptions__empty-state">
              <span className="platform-subscriptions__empty-icon"><FiCreditCard /></span>
              <strong>{subscriptions.length ? 'No subscriptions match these filters' : 'No subscriptions yet'}</strong>
              <p>{subscriptions.length ? 'Clear a filter or try a different search.' : 'Create the first subscription to start tracking plans and renewals.'}</p>
              {subscriptions.length > 0 && <button type="button" className="platform-subscriptions__clear" onClick={() => { setSearch(''); setStatusFilter('All statuses'); setCycleFilter('All billing cycles') }}>Clear filters</button>}
              {!subscriptions.length && canCreate && !formOpen && <button type="button" className="platform-subscriptions__clear" onClick={() => setFormOpen(true)}>Create subscription</button>}
            </div>}</div>}
        </section>
      </>}
    </main>
  </DashboardLayout>
}
