import { useEffect, useMemo, useState } from 'react'
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
const dateLabel = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0)

export default function Subscriptions() {
  const { access, canView, canAction, loading: accessLoading } = useScreenAccess()
  const isSuperAdmin = access?.isSuperAdmin === true
  const permitted = isSuperAdmin && canView('/subscriptions')
  const canCreate = permitted && canAction('/subscriptions', 'create')
  const [organizations, setOrganizations] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    const rows = await subscriptionsApi.list()
    setSubscriptions(rows)
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

  const activeCount = subscriptions.filter(item => String(item.status).toLowerCase() === 'active').length
  const trialCount = subscriptions.filter(item => String(item.status).toLowerCase() === 'trial').length
  const organizationOptions = useMemo(() => [...organizations].sort((a, b) => a.name.localeCompare(b.name)), [organizations])
  const updateField = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

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
    <main className="platform-management">
      <PageHeader title="Subscriptions" subtitle="Create and review organization plans, billing periods, and user limits."
        compactSummary={[
          { label: 'Total subscriptions', value: subscriptions.length },
          { label: 'Active', value: activeCount },
          { label: 'Trial', value: trialCount },
        ]} />

      {!accessLoading && !permitted && <section className="platform-management__notice" role="alert">This workspace is available to Super Admins.</section>}
      {error && <section className="platform-management__notice platform-management__notice--error" role="alert">{error}</section>}
      {notice && <section className="platform-management__notice platform-management__notice--success" role="status">{notice}</section>}

      {permitted && <>
        {canCreate && <section className="platform-management__card platform-management__form-card">
          <div className="platform-management__toolbar"><div><h2>Create subscription</h2><p>Assign a plan and billing term to an organization.</p></div></div>
          <form className="platform-management__form" onSubmit={submit}>
            <label><span>Organization name <b>*</b></span><select name="organizationId" value={form.organizationId} onChange={updateField} required>
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
            <div className="platform-management__form-actions"><button type="submit" disabled={saving || loading || organizationOptions.length === 0}>{saving ? 'Saving…' : 'Create subscription'}</button></div>
          </form>
          {!loading && organizationOptions.length === 0 && <p className="platform-management__hint">No organizations are available. Add an organization before creating a subscription.</p>}
        </section>}

        <section className="platform-management__card" aria-label="Subscription directory">
          <div className="platform-management__toolbar"><div><h2>Organization subscriptions</h2><p>Saved subscription terms and current status.</p></div><span className="platform-management__count">{subscriptions.length} records</span></div>
          {loading ? <p className="platform-management__state" role="status">Loading subscriptions…</p> :
            <div className="platform-management__table-wrap"><table className="platform-management__table">
              <thead><tr><th>Organization</th><th>Plan</th><th>Billing cycle</th><th>Price</th><th>Maximum users</th><th>Status</th><th>Start date</th><th>End date</th></tr></thead>
              <tbody>{subscriptions.map(row => <tr key={row.subscriptionId}>
                <td><strong>{row.organizationName || '—'}</strong></td><td>{row.planName}</td><td>{row.billingCycle}</td><td>{money(row.price)}</td><td>{row.maximumUsers}</td>
                <td><span className={`platform-management__status platform-management__status--${String(row.status || '').toLowerCase()}`}>{row.status}</span></td>
                <td>{dateLabel(row.startDate)}</td><td>{dateLabel(row.endDate)}</td>
              </tr>)}</tbody>
            </table>{!subscriptions.length && <p className="platform-management__state">No subscriptions have been created yet.</p>}</div>}
        </section>
      </>}
    </main>
  </DashboardLayout>
}
