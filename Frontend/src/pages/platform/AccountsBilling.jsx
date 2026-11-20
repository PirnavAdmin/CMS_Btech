import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiAlertCircle, FiArrowUpRight, FiCalendar, FiCheckCircle,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiClock, FiDownload,
  FiFileText, FiFilter, FiSearch, FiX,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import ExportMenu from '../../components/ExportMenu.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { subscriptionsApi, userDirectoryApi } from '../../api/apiEndpoints.js'
import { fetchCollegeLogo, getCollegeLogoUrl, getColleges, isBackendCollegeLogo, unwrapCollegeRecord } from '../../auth/collegeApi.js'
import { collegeLogoValue } from '../../utils/collegeLogo.js'
import { buildBillingAccounts, filterBillingAccounts, summarizeBillingAccounts } from './accountsBillingData.js'
import './AccountsBilling.css'

const TABS = [
  ['overview', 'Overview'],
  ['accounts', 'College Accounts'],
  ['renewals', 'Renewals'],
  ['payments', 'Payments & Invoices'],
  ['reports', 'Reports'],
  ['audit', 'Audit History'],
]
const PAGE_SIZE = 5
const USER_PAGE_SIZE = 200
const MAX_USER_PAGES = 100
const DEFAULT_FILTERS = Object.freeze({ search: '', college: 'all', plan: 'all', status: 'all', expiry: 'all', cycle: 'all', sort: 'name', direction: 'asc' })
const ACCOUNT_EXPORT_COLUMNS = [
  { label: 'College', value: account => account.name },
  { label: 'College code', value: account => account.code },
  { label: 'Assigned admin', value: account => account.admin?.name || 'Not assigned' },
  { label: 'Admin email', value: account => account.admin?.email },
  { label: 'Plan', value: account => account.subscription?.planName || 'No plan' },
  { label: 'Billing cycle', value: account => account.subscription?.billingCycle },
  { label: 'Renewal date', value: account => account.subscription ? dateLabel(account.subscription.endDate) : 'Not set' },
  { label: 'Days remaining', value: account => account.subscription ? daysLabel(account.daysRemaining) : 'Not set' },
  { label: 'Status', value: account => account.subscription?.status || 'No subscription' },
  { label: 'Active users', value: account => account.activeUserCount },
  { label: 'User limit', value: account => account.subscription?.maximumUsers },
  { label: 'Usage', value: account => account.usagePercentage == null ? 'Unavailable' : `${account.usagePercentage}%` },
]

function listFrom(response) {
  let current = response
  for (let depth = 0; depth < 7 && current; depth += 1) {
    if (Array.isArray(current)) return current
    if (typeof current !== 'object') return []
    const collection = current.organizations ?? current.colleges ?? current.items ?? current.records ?? current.rows
    if (Array.isArray(collection)) return collection
    current = current.data ?? current.result ?? current.payload
  }
  return []
}

async function loadUsers() {
  const users = []
  for (let pageNumber = 1; pageNumber <= MAX_USER_PAGES; pageNumber += 1) {
    const page = await userDirectoryApi.getAll({ pageNumber, pageSize: USER_PAGE_SIZE })
    users.push(...page)
    if (page.length < USER_PAGE_SIZE) return { users, truncated: false }
  }
  return { users, truncated: true }
}

const dateLabel = value => {
  if (!value) return 'Not set'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const money = value => Number.isFinite(value)
  ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)
  : '—'
const safeCsv = value => {
  const text = String(value ?? '')
  const protectedText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${protectedText.replaceAll('"', '""')}"`
}
const statusClass = value => String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')
const daysLabel = value => value == null ? '—' : value < 0 ? `${Math.abs(value)} days overdue` : value === 0 ? 'Today' : `${value} days`

function CollegeLogo({ account, size = 'normal' }) {
  const [loadedImage, setLoadedImage] = useState(null)
  const [failedUrl, setFailedUrl] = useState('')
  const url = getCollegeLogoUrl(account.id, collegeLogoValue(account.source), [account.code, account.name])
  const backendImage = Boolean(url && isBackendCollegeLogo(url))
  const source = backendImage ? loadedImage?.url === url ? loadedImage.source : '' : url
  useEffect(() => {
    let active = true
    let objectUrl = ''
    if (!url || !backendImage) return undefined
    fetchCollegeLogo(url).then(blob => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setLoadedImage({ url, source: objectUrl })
    }).catch(() => {})
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, backendImage])

  return <span className={`ab-logo ab-logo--${size}`} aria-hidden="true">
    {source && failedUrl !== url ? <img src={source} alt="" onError={() => setFailedUrl(url)} /> : <span>{String(account.name || 'C').trim().charAt(0).toUpperCase()}</span>}
  </span>
}

function EmptyState({ icon: Icon = FiFileText, title, children }) {
  return <div className="ab-empty"><span><Icon aria-hidden="true" /></span><strong>{title}</strong><p>{children}</p></div>
}

function StatusBadge({ value }) {
  return <span className={`ab-status ab-status--${statusClass(value)}`}>{value || 'Unknown'}</span>
}

function subscriptionExplanation(account) {
  const subscription = account.subscription
  if (!subscription) return 'No subscription record is linked to this college in the subscription service.'
  const status = subscription.status.toLowerCase()
  if (status === 'cancelled' || status === 'suspended') return `The subscription record is marked ${status}. This saved status takes precedence over any date-based status calculation.`
  if (status === 'expired') return `The recorded expiry date was ${dateLabel(subscription.endDate)}. The dashboard classifies the subscription as expired once that date is before today.`
  if (status === 'scheduled') return `The recorded start date is ${dateLabel(subscription.startDate)}, which is later than today. The subscription is shown as scheduled until it starts.`
  if (status === 'trial') return `The subscription service reports a trial. Its recorded end date is ${dateLabel(subscription.endDate)}${account.daysRemaining === 0 ? ', which is today' : account.daysRemaining > 0 ? `, in ${account.daysRemaining} days` : ''}.`
  if (status === 'active') {
    if (account.daysRemaining === 0) return 'The subscription service reports Active and the recorded expiry date is today.'
    if (account.daysRemaining > 0) return `The subscription service reports Active and its recorded expiry date has not passed (${account.daysRemaining} days remaining).`
    return 'The subscription service reports Active, but no expiry date is available to calculate remaining time.'
  }
  return `The status “${subscription.status}” comes from the saved subscription record.`
}

function SnapshotCharts({ summary, loading }) {
  const metrics = [
    { key: 'totalAccounts', label: ['College', 'accounts'], value: summary.totalAccounts, color: 'var(--ab-chart-account)' },
    { key: 'activeSubscriptions', label: ['Active', 'subscriptions'], value: summary.activeSubscriptions, color: 'var(--ab-chart-active)' },
    { key: 'trials', label: ['Trial', 'accounts'], value: summary.trials, color: 'var(--ab-chart-trial)' },
    { key: 'expiring7', label: ['Expiring in', '7 days'], value: summary.expiring7, color: 'var(--ab-chart-expiring)' },
    { key: 'expiring30', label: ['Expiring in', '30 days'], value: summary.expiring30, color: 'var(--ab-chart-expiring-alt)' },
    { key: 'expired', label: ['Expired', 'subscriptions'], value: summary.expired, color: 'var(--ab-chart-expired)' },
  ]
  const maxValue = Math.max(...metrics.map(metric => metric.value), 0)
  const tickStep = Math.max(1, Math.ceil(maxValue / 5))
  const axisMax = tickStep * 5
  const chart = { width: 960, height: 270, left: 48, right: 16, top: 34, bottom: 218 }
  const plotHeight = chart.bottom - chart.top
  const slotWidth = (chart.width - chart.left - chart.right) / metrics.length
  const barWidth = Math.min(58, slotWidth * 0.42)
  return <article className="ab-dark-chart-card ab-count-chart" aria-labelledby="ab-snapshot-chart-heading">
    <header><div><h3 id="ab-snapshot-chart-heading">Account & subscription counts</h3><p>Current totals on a shared count scale. Expiry windows are subsets of active plans.</p></div><span className="ab-chart-tag">SNAPSHOT</span></header>
    {loading ? <div className="ab-chart-loading" role="status">Loading account analytics…</div> : <div className="ab-snapshot-chart-wrap">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby="ab-snapshot-chart-title ab-snapshot-chart-description">
        <title id="ab-snapshot-chart-title">Platform account and subscription counts</title>
        <desc id="ab-snapshot-chart-description">A bar chart comparing total organizations, active subscriptions, trials, subscriptions expiring in seven and thirty days, and expired subscriptions. Values are shown above every bar.</desc>
        {Array.from({ length: 6 }, (_, index) => {
          const value = tickStep * (5 - index)
          const y = chart.top + (index / 5) * plotHeight
          return <g key={value}><line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} className="ab-snapshot-gridline" /><text x={chart.left - 10} y={y + 4} textAnchor="end" className="ab-snapshot-axis-label">{value}</text></g>
        })}
        {metrics.map((metric, index) => {
          const centerX = chart.left + slotWidth * (index + 0.5)
          const barHeight = metric.value / axisMax * plotHeight
          const barY = chart.bottom - barHeight
          return <g key={metric.key}>
            <title>{`${metric.label.join(' ')}: ${metric.value}`}</title>
            {metric.value > 0
              ? <rect x={centerX - barWidth / 2} y={barY} width={barWidth} height={barHeight} rx="6" fill={metric.color} />
              : <circle cx={centerX} cy={chart.bottom - 1} r="4" fill={metric.color} />}
            <text x={centerX} y={Math.max(chart.top - 7, barY - 8)} textAnchor="middle" className="ab-snapshot-value">{metric.value}</text>
            {metric.label.map((line, lineIndex) => <text key={line} x={centerX} y={chart.bottom + 22 + lineIndex * 15} textAnchor="middle" className="ab-snapshot-category">{line}</text>)}
          </g>
        })}
      </svg>
    </div>}
  </article>
}

function SubscriptionDonut({ statusCounts, totalAccounts, loading }) {
  const colors = { active: 'var(--ab-chart-active)', trial: 'var(--ab-chart-trial)', expired: 'var(--ab-chart-expired)', scheduled: 'var(--ab-chart-expiring)', cancelled: 'var(--ab-chart-cancelled)', suspended: 'var(--ab-chart-expiring-alt)', 'no subscription': 'var(--ab-chart-neutral)' }
  const radius = 43
  const circumference = 2 * Math.PI * radius
  const { segments } = statusCounts.reduce((state, [status, count]) => {
    const length = totalAccounts ? count / totalAccounts * circumference : 0
    return {
      offset: state.offset + length,
      segments: [...state.segments, { status, count, length, offset: state.offset, color: colors[status.toLowerCase()] || 'var(--ab-chart-neutral)' }],
    }
  }, { offset: 0, segments: [] })
  return <article className="ab-dark-chart-card ab-donut-card">
    <header><div><h3>Subscription status mix</h3><p>Share of all college accounts by current status.</p></div><span className="ab-chart-tag">{totalAccounts} TOTAL</span></header>
    <div className="ab-donut-layout">
      <svg viewBox="0 0 120 120" role="img" aria-label={`Subscription status mix across ${totalAccounts} college accounts`}>
        <circle cx="60" cy="60" r={radius} fill="none" className="ab-donut-track" strokeWidth="12" />
        {segments.map(segment => <circle key={segment.status} cx="60" cy="60" r={radius} fill="none" stroke={segment.color} strokeWidth="12" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset} transform="rotate(-90 60 60)" />)}
        <text x="60" y="57" textAnchor="middle" className="ab-donut-total">{loading ? '—' : totalAccounts}</text>
        <text x="60" y="72" textAnchor="middle" className="ab-donut-caption">{loading ? 'LOADING' : 'COLLEGES'}</text>
      </svg>
      <ul>{segments.map(segment => <li key={segment.status}><i style={{ background: segment.color }} /><span>{segment.status}</span><strong>{segment.count}</strong></li>)}</ul>
    </div>
  </article>
}

function AnalyticsCharts({ accounts, usersUnavailable, usersTruncated, loading }) {
  const planCounts = new Map()
  accounts.forEach(account => {
    const plan = account.subscription?.planName || 'No plan assigned'
    planCounts.set(plan, (planCounts.get(plan) || 0) + 1)
  })
  const plans = [...planCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const usage = accounts.filter(account => account.usagePercentage != null && account.subscription?.maximumUsers)
    .sort((a, b) => b.usagePercentage - a.usagePercentage).slice(0, 8)
  const shownPlans = plans.slice(0, 7)
  const total = Math.max(accounts.length, 1)
  const planChart = { width: 720, height: 256, left: 44, right: 14, top: 22, bottom: 183 }
  const planTick = Math.max(1, Math.ceil(Math.max(...plans.map(([, count]) => count), 1) / 4))
  const planAxisMax = planTick * 4
  const planPlotHeight = planChart.bottom - planChart.top
  const planSlotWidth = (planChart.width - planChart.left - planChart.right) / Math.max(shownPlans.length, 1)
  const planBarWidth = Math.min(48, planSlotWidth * 0.52)
  const capacityChart = { width: 760, left: 178, right: 112, top: 28, rowHeight: 38 }
  const capacityPlotWidth = capacityChart.width - capacityChart.left - capacityChart.right
  const capacityPlotBottom = capacityChart.top + usage.length * capacityChart.rowHeight
  const capacityChartHeight = capacityPlotBottom + 30
  const capacityTicks = [0, 25, 50, 75, 100]

  return <div className="ab-dashboard-secondary-grid">
      <article className="ab-dark-chart-card">
        <header><div><h3>Plan mix</h3><p>Organizations by plan, with each plan’s share of all accounts.</p></div></header>
        {loading ? <div className="ab-chart-loading" role="status">Loading organization records…</div> : plans.length ? <>
          {plans.length > 7 && <p className="ab-chart-note">Showing the 7 most common plans.</p>}
          <div className="ab-plan-chart-wrap">
            <svg viewBox={`0 0 ${planChart.width} ${planChart.height}`} role="img" aria-labelledby="ab-plan-chart-title ab-plan-chart-description">
              <title id="ab-plan-chart-title">Organizations by subscription plan</title>
              <desc id="ab-plan-chart-description">A column chart showing the count and percentage of organizations in each plan.</desc>
              {Array.from({ length: 5 }, (_, index) => {
                const value = planTick * (4 - index)
                const y = planChart.top + (index / 4) * planPlotHeight
                return <g key={value}><line x1={planChart.left} x2={planChart.width - planChart.right} y1={y} y2={y} className="ab-snapshot-gridline" /><text x={planChart.left - 9} y={y + 4} textAnchor="end" className="ab-snapshot-axis-label">{value}</text></g>
              })}
              {shownPlans.map(([plan, count], index) => {
                const centerX = planChart.left + planSlotWidth * (index + 0.5)
                const barHeight = count / planAxisMax * planPlotHeight
                const barY = planChart.bottom - barHeight
                const percentage = Math.round(count / total * 100)
                const displayName = plan.length > 14 ? `${plan.slice(0, 13)}…` : plan
                return <g key={plan}>
                  <title>{`${plan}: ${count} organizations (${percentage}%)`}</title>
                  <rect x={centerX - planBarWidth / 2} y={barY} width={planBarWidth} height={Math.max(barHeight, 2)} rx="5" fill="var(--ab-chart-account)" />
                  <text x={centerX} y={Math.max(planChart.top - 6, barY - 7)} textAnchor="middle" className="ab-snapshot-value">{count}</text>
                  <text x={centerX} y={planChart.bottom + 19} textAnchor="middle" className="ab-snapshot-category">{displayName}</text>
                  <text x={centerX} y={planChart.bottom + 34} textAnchor="middle" className="ab-plan-chart-percent">{percentage}%</text>
                </g>
              })}
            </svg>
          </div>
        </> : <EmptyState title="No organization records">Plan mix will appear when organization records are available.</EmptyState>}
      </article>
      <article className="ab-dark-chart-card">
        <header><div><h3>Highest user-cap usage</h3><p>Ranked against a 0–100% scale of each subscription’s user limit.</p></div></header>
        {loading ? <div className="ab-chart-loading" role="status">Loading directory and subscription records…</div> : usersUnavailable ? <EmptyState title="Usage data unavailable">The user directory could not be loaded, so capacity cannot be calculated.</EmptyState> : usage.length ? <>
          {usersTruncated && <p className="ab-chart-note">Directory paging was incomplete; these counts may be understated.</p>}
          <div className="ab-capacity-chart-wrap">
            <svg viewBox={`0 0 ${capacityChart.width} ${capacityChartHeight}`} role="img" aria-labelledby="ab-capacity-chart-title ab-capacity-chart-description">
              <title id="ab-capacity-chart-title">Colleges with the highest user-cap usage</title>
              <desc id="ab-capacity-chart-description">A ranked horizontal bar chart comparing active users to each college’s maximum user limit, on a scale from zero to one hundred percent.</desc>
              {capacityTicks.map(tick => {
                const x = capacityChart.left + capacityPlotWidth * tick / 100
                return <g key={tick}><line x1={x} x2={x} y1={capacityChart.top - 10} y2={capacityPlotBottom} className="ab-snapshot-gridline" /><text x={x} y={capacityPlotBottom + 19} textAnchor="middle" className="ab-snapshot-axis-label">{tick}%</text></g>
              })}
              {usage.map((account, index) => {
                const centerY = capacityChart.top + capacityChart.rowHeight * (index + 0.5)
                const percentage = account.usagePercentage
                const limit = Number(account.subscription.maximumUsers)
                const displayName = account.name.length > 24 ? `${account.name.slice(0, 23)}…` : account.name
                return <g key={account.id}>
                  <title>{`${account.name}: ${account.activeUserCount} of ${limit} active users (${percentage}%)`}</title>
                  <text x={capacityChart.left - 12} y={centerY + 4} textAnchor="end" className="ab-capacity-chart-label">{displayName}</text>
                  <rect x={capacityChart.left} y={centerY - 5} width={capacityPlotWidth} height="10" rx="5" fill="var(--surface-soft)" />
                  <rect x={capacityChart.left} y={centerY - 5} width={Math.max(capacityPlotWidth * percentage / 100, 2)} height="10" rx="5" fill={percentage >= 90 ? 'var(--ab-chart-expired)' : 'var(--ab-chart-active)'} />
                  <text x={capacityChart.width - capacityChart.right + 12} y={centerY + 4} className="ab-capacity-chart-value">{account.activeUserCount}/{limit} · {percentage}%</text>
                </g>
              })}
            </svg>
          </div>
        </> : <EmptyState title="No configured user caps">A capacity graph needs a subscription maximum-user limit and directory user data.</EmptyState>}
      </article>
  </div>
}

function AccountDetails({ account, onClose, onManage, usersUnavailable }) {
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const subscription = account.subscription
  return <div className="ab-drawer-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="ab-drawer" role="dialog" aria-modal="true" aria-labelledby="ab-drawer-title">
      <header className="ab-drawer__header">
        <div className="ab-drawer__identity"><CollegeLogo account={account} size="large" /><div><span>College account</span><h2 id="ab-drawer-title">{account.name}</h2><small>{account.code || 'No college code'}</small></div></div>
        <button type="button" className="ab-icon-button" onClick={onClose} aria-label="Close account details"><FiX /></button>
      </header>
      <div className="ab-drawer__body">
        <section className="ab-detail-section">
          <div className="ab-section-heading"><div><h3>Subscription</h3><p>Current plan and usage from the subscription record.</p></div><StatusBadge value={subscription?.status || 'No subscription'} /></div>
          <p className="ab-status-explanation">{subscriptionExplanation(account)}</p>
          {subscription ? <div className="ab-detail-grid">
            <Detail label="Plan" value={subscription.planName} />
            <Detail label="Billing cycle" value={subscription.billingCycle || 'Not set'} />
            <Detail label="Subscription price" value={money(subscription.price)} />
            <Detail label="Tax details" value="Unavailable — no tax source" />
            <Detail label="Start date" value={dateLabel(subscription.startDate)} />
            <Detail label="Expiry date" value={dateLabel(subscription.endDate)} />
            <Detail label="Days remaining" value={daysLabel(account.daysRemaining)} />
            <Detail label="Active users / limit" value={`${usersUnavailable ? 'Unavailable' : account.activeUserCount} / ${subscription.maximumUsers ?? 'Not set'}`} />
          </div> : <EmptyState title="No subscription record">Create or assign a plan from the existing Subscriptions module.</EmptyState>}
          <button type="button" className="ab-button ab-button--primary" onClick={onManage}>Manage subscription <FiArrowUpRight /></button>
        </section>
        <section className="ab-detail-section">
          <h3>College and administrator</h3>
          <div className="ab-detail-grid">
            <Detail label="College email" value={account.email || 'Not available'} />
            <Detail label="Contact number" value={account.phone || 'Not available'} />
            <Detail label="Assigned administrator" value={account.admin?.name || 'Not assigned'} />
            <Detail label="Administrator email" value={account.admin?.email || 'Not available'} />
          </div>
        </section>
        <section className="ab-detail-section">
          <h3>Subscription history</h3>
          {account.subscriptionHistory.length ? <div className="ab-history-list">{account.subscriptionHistory.map((item, index) => <article key={item.subscriptionId ?? item.SubscriptionId ?? item.id ?? `${item.planName}-${index}`}>
            <span className="ab-history-list__dot" aria-hidden="true" /><div><strong>{item.planName}</strong><small>{dateLabel(item.startDate)} – {dateLabel(item.endDate)} · {item.billingCycle || 'Cycle not set'}</small></div><StatusBadge value={item.status} />
          </article>)}</div> : <p className="ab-muted">No subscription history is available.</p>}
          <p className="ab-data-note">Renewal events and previous plan changes are not separately recorded by the available API.</p>
          <div className="ab-explanation-copy"><strong>How usage is calculated</strong><p>Active users are directory accounts marked Active or Profile Pending. Suspended accounts and pending invitations are excluded. Usage is active users divided by the subscription’s maximum user count, capped at 100%. Student and Faculty are role-based counts; separate quotas are not available.</p></div>
        </section>
        <UnavailableSection title="Payment history and invoices" text="No payment or invoice ledger is connected. Payment status, tax, balances, transaction references, and downloads cannot be shown." />
        <UnavailableSection title="Billing audit log" text="No billing audit history API is available for this account." />
      </div>
    </aside>
  </div>
}

function Detail({ label, value }) {
  return <div className="ab-detail"><span>{label}</span><strong>{value}</strong></div>
}

function UnavailableSection({ title, text }) {
  return <section className="ab-detail-section ab-unavailable-section"><h3>{title}</h3><p><FiAlertCircle aria-hidden="true" />{text}</p></section>
}

function AccountsTable({ accounts, onOpen, page, setPage, loading, usersUnavailable = false, emptyMessage = 'No college accounts match these filters.' }) {
  const pageCount = Math.max(1, Math.ceil(accounts.length / PAGE_SIZE))
  const rows = accounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount, setPage])

  return <>
    <div className="ab-table-scroll" role="region" aria-label="College accounts table" tabIndex={0}>
      <table className="ab-table">
        <thead><tr>
          <th>College</th><th>Code</th><th>Assigned admin</th><th>Plan</th><th>Renewal</th><th>Status</th><th>Usage</th><th>Actions</th>
        </tr></thead>
        <tbody>{rows.map(account => <tr key={account.id}>
          <td><button type="button" className="ab-college-cell" onClick={() => onOpen(account)}><CollegeLogo account={account} /><span><strong>{account.name}</strong><small>{account.email || 'College details'}</small></span></button></td>
          <td>{account.code || '—'}</td>
          <td>{account.admin ? <><strong>{account.admin.name}</strong><small>{account.admin.email || 'Email not available'}</small></> : <span className="ab-muted">Not assigned</span>}</td>
          <td>{account.subscription ? <><strong>{account.subscription.planName || 'Plan not named'}</strong><small>{account.subscription.billingCycle || 'Cycle not set'}</small></> : <span className="ab-muted">No plan</span>}</td>
          <td>{account.subscription ? <><strong>{dateLabel(account.subscription.endDate)}</strong><small className={account.daysRemaining != null && account.daysRemaining <= 7 ? 'ab-days--urgent' : ''}>{daysLabel(account.daysRemaining)}</small></> : <span className="ab-muted">Not set</span>}</td>
          <td><StatusBadge value={account.subscription?.status || 'No subscription'} /></td>
          <td>{usersUnavailable || account.usagePercentage == null ? <span className="ab-muted">{usersUnavailable ? 'Unavailable' : '—'}</span> : <div className="ab-usage-cell"><span>{account.usagePercentage}%</span><i><b style={{ width: `${account.usagePercentage}%` }} /></i><small>{account.activeUserCount} / {account.subscription.maximumUsers}</small></div>}</td>
          <td><button type="button" className="ab-button ab-button--quiet" onClick={() => onOpen(account)}>View details <FiArrowUpRight /></button></td>
        </tr>)}</tbody>
      </table>
      {loading && <div className="ab-table-loading" role="status"><span /> Loading account records…</div>}
      {!loading && !rows.length && <EmptyState icon={FiSearch} title="No results">{emptyMessage}</EmptyState>}
    </div>
    <footer className="ab-pagination"><span>{accounts.length ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, accounts.length)} of ${accounts.length}` : 'No records'}</span><div>
      <button type="button" className="ab-button ab-button--quiet" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><FiChevronLeft /> Previous</button><span>Page {page} of {pageCount}</span><button type="button" className="ab-button ab-button--quiet" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Next <FiChevronRight /></button>
    </div></footer>
  </>
}

export default function AccountsBilling() {
  const navigate = useNavigate()
  const { access, canView, loading: accessLoading } = useScreenAccess()
  const isSuperAdmin = access?.isSuperAdmin === true
  const permitted = isSuperAdmin && canView('/accounts-billing')
  const [organizations, setOrganizations] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [users, setUsers] = useState([])
  const [usersUnavailable, setUsersUnavailable] = useState(false)
  const [usersTruncated, setUsersTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [page, setPage] = useState(1)
  const [reportPeriod, setReportPeriod] = useState('month')

  useEffect(() => {
    if (!permitted) return undefined
    let active = true
    Promise.allSettled([getColleges(), subscriptionsApi.list(), loadUsers()]).then(results => {
      if (!active) return
      const [organizationResult, subscriptionResult, userResult] = results
      if (organizationResult.status === 'fulfilled') {
        const rows = listFrom(organizationResult.value).map(unwrapCollegeRecord)
        setOrganizations(rows)
      } else {
        setError(organizationResult.reason?.message || 'College accounts could not be loaded.')
      }
      if (subscriptionResult.status === 'fulfilled') setSubscriptions(subscriptionResult.value)
      else setError(current => [current, subscriptionResult.reason?.message || 'Subscriptions could not be loaded.'].filter(Boolean).join(' '))
      if (userResult.status === 'fulfilled') {
        setUsers(userResult.value.users)
        setUsersTruncated(userResult.value.truncated)
        setUsersUnavailable(false)
      } else {
        setUsers([])
        setUsersTruncated(false)
        setUsersUnavailable(true)
      }
    }).finally(() => { if (active) { setLoading(false); setLastRefreshed(new Date()) } })
    return () => { active = false }
  }, [permitted, refreshKey])

  const accounts = useMemo(() => buildBillingAccounts(organizations, subscriptions, users), [organizations, subscriptions, users])
  const summary = useMemo(() => summarizeBillingAccounts(accounts), [accounts])
  const visibleAccounts = useMemo(() => filterBillingAccounts(accounts, filters), [accounts, filters])
  const plans = useMemo(() => [...new Set(accounts.map(account => account.subscription?.planName).filter(Boolean))].sort(), [accounts])
  const cycles = useMemo(() => [...new Set(accounts.map(account => account.subscription?.billingCycle).filter(Boolean))].sort(), [accounts])
  const statusCounts = useMemo(() => {
    const counts = new Map()
    accounts.forEach(account => {
      const status = account.subscription?.status || 'No subscription'
      counts.set(status, (counts.get(status) || 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [accounts])
  const renewalAccounts = useMemo(() => accounts.filter(account => {
    const status = account.subscription?.status?.toLowerCase()
    return status === 'expired' || ['active', 'trial'].includes(status) && account.daysRemaining != null && account.daysRemaining >= 0 && account.daysRemaining <= 30
  }).sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0)), [accounts])

  const setFilter = (name, value) => {
    setPage(1)
    setFilters(current => ({ ...current, [name]: value }))
  }
  const clearFilters = () => { setPage(1); setFilters(DEFAULT_FILTERS) }
  const refresh = () => {
    setLoading(true)
    setError('')
    setRefreshKey(value => value + 1)
  }
  const openAccount = account => setSelectedAccount(account)
  const goManageSubscription = () => navigate('/subscriptions')
  const exportReport = () => {
    const headers = ['College', 'College Code', 'Administrator', 'Admin Email', 'Plan', 'Billing Cycle', 'Subscription Start', 'Expiry', 'Days Remaining', 'Status', 'Active Users', 'User Limit', 'Usage Percentage', 'Payment Status']
    const rows = visibleAccounts.map(account => [account.name, account.code, account.admin?.name, account.admin?.email, account.subscription?.planName, account.subscription?.billingCycle, account.subscription?.startDate, account.subscription?.endDate, account.daysRemaining, account.subscription?.status || 'No subscription', usersUnavailable ? 'Unavailable' : account.activeUserCount, account.subscription?.maximumUsers, usersUnavailable || account.usagePercentage == null ? 'Unavailable' : `${account.usagePercentage}%`, 'Not tracked'])
    const csv = [headers, ...rows].map(row => row.map(safeCsv).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `accounts-billing-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const showLoading = accessLoading || permitted && loading
  return <DashboardLayout>
    <main className="accounts-billing">
      <PageHeader title="Accounts & Billing" />

      {!accessLoading && !permitted && <section className="ab-alert ab-alert--error" role="alert">This platform dashboard is available to verified Super Admins only.</section>}
      {error && <section className="ab-alert ab-alert--error" role="alert"><FiAlertCircle />{error}<button type="button" className="ab-alert__action" onClick={refresh}>Retry</button></section>}
      {permitted && usersUnavailable && <section className="ab-alert" role="status"><FiAlertCircle />User directory data is unavailable. Administrator and usage counts are incomplete; organization and subscription records remain available.</section>}
      {permitted && usersTruncated && <section className="ab-alert" role="status"><FiAlertCircle />The user directory reached its paging safety limit. Usage totals may be incomplete.</section>}

      {permitted && <>
        <nav className="ab-tabs" aria-label="Accounts and billing sections" role="tablist">
          {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'is-active' : ''} onClick={() => { setActiveTab(id); setPage(1) }}>{label}{id === 'renewals' && renewalAccounts.length > 0 && <span>{renewalAccounts.length}</span>}</button>)}
        </nav>

        {activeTab === 'overview' && <>
          <section className="ab-portfolio-dashboard" aria-labelledby="ab-portfolio-title">
            <header className="ab-portfolio-header">
              <div><span className="ab-portfolio-eyebrow">ACCOUNTS & BILLING</span><h2 id="ab-portfolio-title">Portfolio overview</h2><p>Live organization, subscription, and capacity snapshot.</p></div>
              <div className="ab-portfolio-controls">
                <label><span>Revenue period</span><select className="ab-dark-select" value={reportPeriod} onChange={event => setReportPeriod(event.target.value)}><option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option></select></label>
                <div><small>{lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Loading data'}</small><button type="button" className="ab-dashboard-export" onClick={exportReport}><FiDownload /> Export</button></div>
              </div>
            </header>
            <div className="ab-dashboard-primary-grid">
              <SnapshotCharts summary={summary} loading={showLoading && !accounts.length} />
              <SubscriptionDonut statusCounts={statusCounts} totalAccounts={accounts.length} loading={showLoading && !accounts.length} />
            </div>
            <AnalyticsCharts accounts={accounts} usersUnavailable={usersUnavailable} usersTruncated={usersTruncated} loading={showLoading && !accounts.length} />
          </section>
          <div className="ab-overview-grid">
            <section className="ab-card">
              <div className="ab-card__heading"><div><h2>Renewal alerts</h2><p>Expired and active subscriptions expiring within 30 days.</p></div><FiCalendar aria-hidden="true" /></div>
              {renewalAccounts.length ? <div className="ab-renewal-list">{renewalAccounts.slice(0, 5).map(account => <button type="button" key={account.id} onClick={() => openAccount(account)}><CollegeLogo account={account} /><span><strong>{account.name}</strong><small>{account.subscription?.planName || 'No plan'} · {dateLabel(account.subscription?.endDate)}</small></span><b className={account.daysRemaining < 0 ? 'is-overdue' : ''}>{daysLabel(account.daysRemaining)}</b></button>)}</div> : <EmptyState icon={FiCheckCircle} title="No renewals need attention">No active plan expires within the next 30 days.</EmptyState>}
              <div className="ab-info-strip"><FiAlertCircle />Grace periods, reminders, and renewal confirmation are not available in the connected billing API.</div>
            </section>
          </div>
        </>}

        {activeTab === 'accounts' && <section className="ab-card ab-card--directory">
          <div className="ab-card__heading"><div><h2>College accounts</h2><p>Search and compare organization plans, renewals, and user limits.</p></div><span className="ab-count">{visibleAccounts.length} accounts</span></div>
          <TableControls filters={filters} setFilter={setFilter} rows={visibleAccounts} loading={showLoading} filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(value => !value)} activeFilterCount={activeDropdownFilterCount(filters)} filterPanelId="ab-account-filter-panel" />
          {filtersOpen && <div className="ab-filter-panel" id="ab-account-filter-panel" role="region" aria-label="College account filters"><FilterPanelHeader activeCount={activeDropdownFilterCount(filters)} onClear={clearFilters} /><FilterBar filters={filters} setFilter={setFilter} accounts={accounts} plans={plans} cycles={cycles} oneLine /></div>}
          <AccountsTable accounts={visibleAccounts} onOpen={openAccount} page={page} setPage={setPage} loading={showLoading} usersUnavailable={usersUnavailable} />
        </section>}

        {activeTab === 'renewals' && <section className="ab-card">
          <div className="ab-card__heading"><div><h2>Renewals</h2><p>Renewal attention is derived from the subscription end date.</p></div><span className="ab-count">{renewalAccounts.length} to review</span></div>
          <div className="ab-info-strip ab-info-strip--wide"><FiAlertCircle />No grace-period field or reminder / renewal workflow is connected. No subscription is renewed or charged automatically. Use Manage subscriptions for existing plan configuration.</div>
          <AccountsTable accounts={renewalAccounts} onOpen={openAccount} page={page} setPage={setPage} loading={showLoading} usersUnavailable={usersUnavailable} emptyMessage="No upcoming or expired subscriptions need review." />
        </section>}

        {activeTab === 'payments' && <section className="ab-card">
          <div className="ab-card__heading"><div><h2>Payments & invoices</h2><p>Financial records require a connected billing ledger.</p></div></div>
          <EmptyState icon={FiFileText} title="No payment or invoice records are connected">The backend currently provides subscription plan records only. Invoice numbers, payment status, amounts paid, balances, transaction references, tax, and downloadable invoices are unavailable.</EmptyState>
        </section>}

        {activeTab === 'reports' && <section className="ab-card ab-card--directory">
          <div className="ab-card__heading"><div><h2>Accounts report</h2><p>Export organization, subscription, expiry, and usage fields available from connected APIs.</p></div></div>
          <div className="ab-report-controls"><label><span>Revenue period</span><select value={reportPeriod} onChange={event => setReportPeriod(event.target.value)}><option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option></select></label><p><FiAlertCircle />Revenue for {reportPeriod === 'month' ? 'this month' : reportPeriod === 'quarter' ? 'this quarter' : 'this year'} is unavailable because payment records are not connected.</p></div>
          <TableControls filters={filters} setFilter={setFilter} rows={visibleAccounts} loading={showLoading} filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(value => !value)} activeFilterCount={activeDropdownFilterCount(filters)} filterPanelId="ab-report-filter-panel" />
          {filtersOpen && <div className="ab-filter-panel" id="ab-report-filter-panel" role="region" aria-label="College account filters"><FilterPanelHeader activeCount={activeDropdownFilterCount(filters)} onClear={clearFilters} /><FilterBar filters={filters} setFilter={setFilter} accounts={accounts} plans={plans} cycles={cycles} oneLine /></div>}
          <AccountsTable accounts={visibleAccounts} onOpen={openAccount} page={page} setPage={setPage} loading={showLoading} usersUnavailable={usersUnavailable} />
        </section>}

        {activeTab === 'audit' && <section className="ab-card">
          <div className="ab-card__heading"><div><h2>Audit history</h2><p>Subscription and billing changes should be read from a server audit trail.</p></div></div>
          <EmptyState icon={FiClock} title="No billing audit history API is connected">Subscription mutations are handled in the existing Subscriptions module, but its audit records are not exposed to this dashboard.</EmptyState>
        </section>}
      </>}

      {selectedAccount && <AccountDetails account={selectedAccount} onClose={() => setSelectedAccount(null)} onManage={goManageSubscription} usersUnavailable={usersUnavailable} />}
    </main>
  </DashboardLayout>
}

function activeDropdownFilterCount(filters) {
  return Object.keys(DEFAULT_FILTERS).filter(key => key !== 'search' && filters[key] !== DEFAULT_FILTERS[key]).length
}

function TableControls({ filters, setFilter, rows, loading, filtersOpen, onToggleFilters, activeFilterCount, filterPanelId }) {
  return <div className="ab-table-toolbar">
    <label className="ab-table-search"><FiSearch aria-hidden="true" /><span className="ab-sr-only">Search accounts</span><input value={filters.search} onChange={event => setFilter('search', event.target.value)} placeholder="Search college, code, admin, or plan" />{filters.search && <button type="button" className="ab-table-search__clear" onClick={() => setFilter('search', '')} aria-label="Clear search"><FiX /></button>}</label>
    <div className="ab-table-toolbar__actions">
      <ExportMenu rows={rows} columns={ACCOUNT_EXPORT_COLUMNS} title="College Accounts" filename="college-accounts" loading={loading} scope="Current filtered results" />
      <button type="button" className={`ab-filters-btn ${filtersOpen ? 'is-active' : ''} ${activeFilterCount > 0 ? 'has-active' : ''}`} onClick={onToggleFilters} aria-expanded={filtersOpen} aria-controls={filterPanelId}>
        <FiFilter aria-hidden="true" /><span>Filters</span>{activeFilterCount > 0 && <span className="ab-filter-count">{activeFilterCount}</span>}<FiChevronDown className={`ab-filter-chevron ${filtersOpen ? 'is-rotated' : ''}`} aria-hidden="true" />
      </button>
    </div>
  </div>
}

function FilterPanelHeader({ activeCount, onClear }) {
  return <div className="ab-filter-panel__header">
    <div><FiFilter aria-hidden="true" /><strong>College account filters</strong>{activeCount > 0 && <span>{activeCount} active</span>}</div>
    {activeCount > 0 && <button type="button" onClick={onClear}><FiX aria-hidden="true" /> Reset filters</button>}
  </div>
}

function FilterBar({ filters, setFilter, accounts, plans, cycles, oneLine = false }) {
  return <div className={`ab-filters ${oneLine ? 'ab-filters--one-line' : ''}`}>
    <label><span>College</span><select value={filters.college} onChange={event => setFilter('college', event.target.value)}><option value="all">All colleges</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
    <label><span>Plan</span><select value={filters.plan} onChange={event => setFilter('plan', event.target.value)}><option value="all">All plans</option>{plans.map(plan => <option key={plan}>{plan}</option>)}</select></label>
    <label><span>Status</span><select value={filters.status} onChange={event => setFilter('status', event.target.value)}><option value="all">All statuses</option>{['Active', 'Trial', 'Scheduled', 'Expired', 'Suspended', 'Cancelled', 'No subscription'].map(status => <option key={status}>{status}</option>)}</select></label>
    <label><span>Expiry</span><select value={filters.expiry} onChange={event => setFilter('expiry', event.target.value)}><option value="all">Any expiry</option><option value="7">Within 7 days</option><option value="30">Within 30 days</option><option value="expired">Expired</option><option value="no-plan">No subscription</option></select></label>
    <label><span>Cycle</span><select value={filters.cycle} onChange={event => setFilter('cycle', event.target.value)}><option value="all">All cycles</option>{cycles.map(cycle => <option key={cycle}>{cycle}</option>)}</select></label>
    <label><span>Sort by</span><select value={filters.sort} onChange={event => setFilter('sort', event.target.value)}><option value="name">College name</option><option value="plan">Plan</option><option value="expiry">Expiry</option><option value="usage">Usage</option></select></label>
    <label><span>Order</span><select value={filters.direction} onChange={event => setFilter('direction', event.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
  </div>
}
