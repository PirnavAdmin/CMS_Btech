import { useCallback, useEffect, useRef, useState } from 'react'
import { FiCheck, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiFilter, FiPlus, FiPower, FiSearch, FiSlash, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'
import { academicYearApi, facultyLeaveApi } from '../../api/apiEndpoints'
import facultyService, { normalizeFaculty } from '../../services/facultyService'
import { normalizeLeaveType, normalizeLeavePolicy, normalizeLeaveRequest, leavePolicyPayload } from '../../services/facultyContracts'
import { newestFirst, rememberCreated } from '../../utils/newestFirst'
import './FacultyLeaveManagement.css'

const PAGE_SIZE = 5
const TABS = ['Leave Requests', 'Leave History', 'Leave Balances', 'Leave Types', 'Leave Policies']
const today = () => new Date().toISOString().slice(0, 10)
const typeOf = employee => employee?.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'
const statusClass = value => String(value || '').toLowerCase().replace(/\s+/g, '-')
const dateLabel = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const range = (from, to) => !from || !to ? '?' : from === to ? dateLabel(from) : `${new Date(`${from}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${dateLabel(to)}`
const initials = value => String(value || 'Employee').replace(/^(Dr|Prof|Mr|Ms|Mrs)\.\s*/i, '').split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
const hasOverlap = (left, right) => left.from <= right.to && left.to >= right.from
const policyScopesOverlap = (left, right) => {
  const categoryOverlaps = left.applicableTo === 'Both' || right.applicableTo === 'Both' || left.applicableTo === right.applicableTo
  const departmentOverlaps = !left.departments?.length || !right.departments?.length || left.departments.some(department => right.departments.includes(department))
  return categoryOverlaps && departmentOverlaps && hasOverlap(left, right)
}
const exportColumns = [{ label: 'Employee ID', value: 'employeeId' }, { label: 'Employee', value: 'employee' }, { label: 'Department', value: 'department' }, { label: 'Status', value: 'status' }]

export default function FacultyLeaveManagement() {
  const [faculty, setFaculty] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const mutationLock = useRef(false)
  const [tab, setTab] = useState(TABS[0])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [policies, setPolicies] = useState([])
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ type: '', department: '', status: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [academicYears, setAcademicYears] = useState([])

  const reload = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const [members, types, policyRows, pending, history, balanceRows] = await Promise.all([
        facultyService.list(), facultyLeaveApi.getTypes(), facultyLeaveApi.getPolicies(),
        facultyLeaveApi.getRequests(), facultyLeaveApi.getHistory(), facultyLeaveApi.getBalances(),
      ])
      const activeTypes = types.map(normalizeLeaveType).filter(t => t.status === 'Active' || !t.status)
      setFaculty(members); setLeaveTypes(newestFirst('leave-types', activeTypes))
      setPolicies(newestFirst('leave-policies', policyRows.map(normalizeLeavePolicy)))
      setRequests(newestFirst('leave-requests', [...new Map([...pending, ...history].map(normalizeLeaveRequest).map(row => [row.id, row])).values()]))
      setBalances(balanceRows)
    } catch (error) { setLoadError(error.message || 'Unable to load leave records.'); throw error }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { reload().catch(() => {}) }, [reload])
  useEffect(() => { let active = true; academicYearApi.getAll().then(rows => { if (active) setAcademicYears(rows.map(row => row.academicYearName || row.name).filter(Boolean)) }).catch(error => { if (active) setNotice(error.message) }); return () => { active = false } }, [])
  const mutate = async (action, message, module) => {
    if (mutationLock.current) return
    mutationLock.current = true; setBusy(true)
    try {
      const saved = await action()
      if (module) { rememberCreated(module, saved); setPage(1); setQuery(''); setFilters({ type: '', department: '', status: '' }) }
      setDialog(null); setNotice(message)
      await reload().catch(() => {})
    } catch (error) { setNotice(error.message || 'Could not save the change.') }
    finally { mutationLock.current = false; setBusy(false) }
  }
  const getApplicablePolicy = (employee, targetDate = today()) => {
    if (!employee) return null
    const matches = policies.filter(policy => policy.status === 'Active' && policy.from <= targetDate && policy.to >= targetDate && (policy.applicableTo === 'Both' || policy.applicableTo === typeOf(employee)) && (!policy.departments?.length || policy.departments.includes(employee?.department)))
    return matches.length === 1 ? matches[0] : null
  }
  const getBalance = (employee, policy, typeId) => {
    if (!employee) return null
    const group = balances.find(row => String(row.facultyId ?? row.employee?.id ?? row.id) === String(employee.id))
    const entries = group?.balances ?? group?.leaveBalances ?? group?.leaveTypes ?? (group?.leaveTypeId ? [group] : [])
    const row = entries.find(item => String(item.leaveTypeId ?? item.typeId) === String(typeId) && (!item.policyId || String(item.policyId) === String(policy?.id)))
      ?? balances.find(item => String(item.facultyId) === String(employee.id) && String(item.leaveTypeId ?? item.typeId) === String(typeId))
    if (!row) return null
    const entitled = row.entitled ?? row.entitlement ?? null
    const used = Number(row.used ?? row.usedDays ?? 0)
    const pending = Number(row.pending ?? row.pendingDays ?? 0)
    const rawAvailable = row.available ?? row.availableDays
    const available = rawAvailable != null ? Number(rawAvailable) : (entitled != null ? Math.max(0, Number(entitled) - used - pending) : null)
    return { entitled, used, pending, available }
  }
  const requestRows = requests.map(request => ({ ...request, employee: faculty.find(item => String(item.id) === String(request.facultyId)) || normalizeFaculty(request.employee || { ...request, facultyName: request.facultyName || request.employeeName, facultyId: request.facultyId }) })).filter(row => row.employee)
  const sourceRows = tab === 'Leave Requests' ? requestRows.filter(row => row.status === 'Pending') : tab === 'Leave History' ? requestRows.filter(row => ['Approved', 'Rejected', 'Cancelled'].includes(row.status)) : tab === 'Leave Balances' ? faculty.filter(Boolean).map(employee => ({ employee, policy: getApplicablePolicy(employee) })).filter(row => Boolean(row.employee)) : tab === 'Leave Types' ? leaveTypes : policies
  const filtered = sourceRows.filter(item => {
    const employee = item.employee?.fullName ? item.employee : item.employee || item
    const text = `${item.id || ''} ${item.name || ''} ${item.code || ''} ${employee?.fullName || ''} ${employee?.employeeId || ''} ${employee?.department || ''}`.toLowerCase()
    return (!query || text.includes(query.toLowerCase())) && (!filters.type || typeOf(employee) === filters.type) && (!filters.department || employee?.department === filters.department) && (!filters.status || item.status === filters.status)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const departments = [...new Set(faculty.map(item => item.department).filter(Boolean))]
  const summary = [['Total Requests', requests.length], ['Pending', requests.filter(item => item.status === 'Pending').length], ['Approved', requests.filter(item => item.status === 'Approved').length], ['On Leave', requests.filter(item => item.status === 'Approved' && item.from <= today() && item.to >= today()).length]]
  const title = tab.toUpperCase()
  const description = { 'Leave Requests': 'Review pending faculty and staff leave requests.', 'Leave History': 'Review completed leave decisions.', 'Leave Balances': 'Review individual employee leave entitlement and usage.', 'Leave Types': 'Configure leave categories available to college employees.', 'Leave Policies': 'Configure leave entitlement and employee eligibility rules.' }[tab]
  const switchTab = value => { setTab(value); setPage(1); setQuery(''); setFilters({ type: '', department: '', status: '' }); setShowFilters(false) }
  const changeFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const saveType = value => {
    const payload = { name: value.name.trim(), code: value.code.trim().toUpperCase(), category: value.category || 'Regular', payCategory: value.payCategory, description: value.description, status: value.status }
    if (!payload.name || !payload.code) { setNotice('Leave Type Name and Leave Code are required.'); return }
    return mutate(() => value.id ? facultyLeaveApi.updateType(value.id, payload) : facultyLeaveApi.createType(payload), 'Leave type saved.', value.id ? null : 'leave-types')
  }
  const toggleType = type => {
    const isActivating = type.status === 'Inactive'
    const newStatus = isActivating ? 'Active' : 'Inactive'
    const payload = {
      name: type.name.trim(),
      code: type.code.trim().toUpperCase(),
      category: type.category || 'Regular',
      payCategory: type.payCategory || 'Paid Leave',
      description: type.description || '',
      status: newStatus
    }
    return mutate(
      () => facultyLeaveApi.updateType(type.id, payload),
      `Leave type "${type.name}" ${isActivating ? 'activated' : 'deactivated / deleted'}.`,
      'leave-types'
    )
  }
  const savePolicy = policy => mutate(() => policy.id ? facultyLeaveApi.updatePolicy(policy.id, leavePolicyPayload(policy)) : facultyLeaveApi.createPolicy(leavePolicyPayload(policy)), 'Leave policy saved.', policy.id ? null : 'leave-policies')
  const activatePolicy = policy => mutate(() => facultyLeaveApi.activatePolicy(policy.id), 'Leave policy activated.')
  const decideRequest = (request, status, reason = '') => mutate(() => status === 'Approved' ? facultyLeaveApi.approve(request.id) : facultyLeaveApi.reject(request.id, reason.trim()), 'Leave request ' + status.toLowerCase() + '.')
  const saveRequest = req => mutate(() => facultyLeaveApi.createRequest({
    facultyId: Number(req.facultyId),
    leaveTypeId: String(req.leaveTypeId),
    policyId: String(req.policyId),
    fromDate: req.fromDate,
    toDate: req.toDate,
    reason: req.reason.trim(),
    days: Number(req.days) || 1,
  }), 'Leave request submitted.', 'leave-requests')
  const viewRecord = async item => {
    if (!item.typeId) { setDialog({ kind: 'view', item }); return }
    try { const detail = normalizeLeaveRequest(await facultyLeaveApi.getRequest(item.id)); setDialog({ kind: 'view', item: { ...item, ...detail, employee: item.employee } }) }
    catch (error) { setNotice(error.message) }
  }
  return <DashboardLayout><main className="flm-page">{loadError && <p className="flm-error" role="alert">{loadError} <button onClick={() => reload().catch(() => {})}>Retry</button></p>}{loading && <p role="status">Loading leave records?</p>}<header className="flm-header"><div><p>FACULTY / LEAVE MANAGEMENT</p><h1>Faculty Leave Management</h1><span>Configure leave policies, manage employee balances and process faculty and staff leave requests.</span></div><div className="flm-summary">{summary.map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header><section className="flm-card"><header className="flm-card-header"><div><p>{title}</p><h2>{description}</h2></div><div className="flm-header-actions"><ExportMenu rows={filtered} columns={exportColumns} screen="faculty-leave-local" filename={`faculty-leave-${tab.toLowerCase().replace(/\s+/g, '-')}`} title={tab} scope="All filtered results" />{['Leave Requests', 'Leave History'].includes(tab) && <button className="flm-primary" onClick={() => setDialog({ kind: 'request' })}><FiPlus /> Apply Leave</button>}{tab === 'Leave Types' && <button className="flm-primary" onClick={() => setDialog({ kind: 'type' })}><FiPlus /> Add Leave Type</button>}{tab === 'Leave Policies' && <button className="flm-primary" onClick={() => setDialog({ kind: 'policy' })}><FiPlus /> Create Leave Policy</button>}</div></header><nav className="flm-tabs">{TABS.map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => switchTab(value)}>{value}</button>)}</nav><div className="flm-toolbar"><label className="flm-search"><FiSearch /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder={tab === 'Leave Types' ? 'Search leave type or code...' : tab === 'Leave Policies' ? 'Search leave policy...' : tab === 'Leave Balances' ? 'Search employee...' : 'Search request, employee or leave type...'} /></label><button className="flm-filter-toggle" onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button></div>{showFilters && <div className="flm-filter-panel">{['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab) && <><FilterSelect label="Faculty Type" value={filters.type} values={['Teaching', 'Non-Teaching']} onChange={value => changeFilter('type', value)} /><FilterSelect label="Department" value={filters.department} values={departments} onChange={value => changeFilter('department', value)} /></>}{['Leave History', 'Leave Types', 'Leave Policies'].includes(tab) && <FilterSelect label="Status" value={filters.status} values={tab === 'Leave Types' ? ['Active', 'Inactive'] : tab === 'Leave Policies' ? ['Draft', 'Active', 'Inactive', 'Expired'] : ['Approved', 'Rejected', 'Cancelled']} onChange={value => changeFilter('status', value)} />}<button className="flm-clear" onClick={() => { setQuery(''); setFilters({ type: '', department: '', status: '' }); setPage(1) }}>Clear Filters</button></div>}<p className="flm-count">Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records</p><LeaveList tab={tab} rows={visible} leaveTypes={leaveTypes} getBalance={getBalance} onView={viewRecord} onEdit={item => setDialog({ kind: Array.isArray(item.entitlements) ? 'policy' : 'type', item })} onActivate={item => setDialog({ kind: 'activate', item })} onDecision={(item, status) => setDialog({ kind: 'decision', item, status })} onToggleType={item => setDialog({ kind: 'toggleType', item })} />{filtered.length > PAGE_SIZE && <TablePagination currentPage={currentPage} totalPages={pages} onPageChange={setPage} />}</section>{dialog && <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><LeaveDialog dialog={dialog} faculty={faculty} leaveTypes={leaveTypes} policies={policies} requests={requests} academicYears={academicYears} getBalance={getBalance} onClose={() => setDialog(null)} onSaveType={saveType} onToggleType={toggleType} onSavePolicy={savePolicy} onActivate={activatePolicy} onDecision={decideRequest} onSaveRequest={saveRequest} /></fieldset>}{notice && <div className="flm-toast">{notice}<button onClick={() => setNotice('')}><FiX /></button></div>}</main></DashboardLayout>
}

function LeaveList({ tab, rows, leaveTypes, getBalance, onView, onEdit, onActivate, onDecision, onToggleType }) {
  if (!rows.length) return <div className="flm-empty"><FiFilter /><h3>No Records Found</h3><p>Create configuration records to begin this workflow.</p></div>
  if (tab === 'Leave Types') return (
    <DataTable headers={['Leave Type', 'Code', 'Category', 'Pay Type', 'Description', 'Status', 'Action']}>
      {rows.map(row => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.code}</td>
          <td>{row.category || 'Regular'}</td>
          <td>{row.payCategory}</td>
          <td>{row.description || '—'}</td>
          <td><Status value={row.status} /></td>
          <td>
            <Actions>
              <Action title="View leave type" onClick={() => onView(row)}><FiEye /></Action>
              <Action title="Edit leave type" onClick={() => onEdit(row)}><FiEdit2 /></Action>
              {row.status === 'Active' ? (
                <Action title="Deactivate / Delete leave type" onClick={() => onToggleType(row)}>
                  <FiSlash style={{ color: '#dc2626' }} />
                </Action>
              ) : (
                <Action title="Activate leave type" onClick={() => onToggleType(row)}>
                  <FiCheck style={{ color: '#16a34a' }} />
                </Action>
              )}
            </Actions>
          </td>
        </tr>
      ))}
    </DataTable>
  )
  if (tab === 'Leave Policies') return <DataTable headers={['Policy Name', 'Academic Year', 'Applicable To', 'Effective Period', 'Leave Types', 'Status', 'Action']}>{rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.academicYear}</td><td>{row.applicableTo}</td><td>{range(row.from, row.to)}</td><td>{row.leaveTypes ?? row.entitlements?.length ?? 0}</td><td><Status value={row.status} /></td><td><Actions><Action title="View leave policy" onClick={() => onView(row)}><FiEye /></Action>{['Draft', 'Inactive'].includes(row.status) && <Action title="Edit leave policy" onClick={() => onEdit(row)}><FiEdit2 /></Action>}{['Draft', 'Inactive'].includes(row.status) && <Action title="Activate leave policy" onClick={() => onActivate(row)}><FiCheck /></Action>}</Actions></td></tr>)}</DataTable>
  if (tab === 'Leave Balances') return <DataTable headers={['Employee ID', 'Employee', 'Faculty Type', 'Department', 'Applicable Policy', 'Entitled', 'Used', 'Pending', 'Available', 'Action']}>{rows.map(({ employee, policy }) => { if (!employee) return null; const activeRules = (policy?.entitlements && policy.entitlements.length) ? policy.entitlements : leaveTypes.map(t => ({ typeId: t.id })); const balances = activeRules.map(rule => getBalance(employee, policy, rule.typeId)).filter(Boolean) || []; const hasUnlimited = balances.some(item => item.available === null); const totals = balances.reduce((sum, item) => ({ entitled: sum.entitled + (Number(item.entitled) || 0), used: sum.used + item.used, pending: sum.pending + item.pending, available: sum.available + (Number(item.available) || 0) }), { entitled: 0, used: 0, pending: 0, available: 0 }); return <tr key={employee.id}><td>{employee.employeeId || employee.id}</td><td><Employee employee={employee} /></td><td>{typeOf(employee)}</td><td>{employee.department || '—'}</td><td>{policy ? policy.name : <span className="flm-unassigned">Not Assigned</span>}</td><td>{policy ? totals.entitled : '—'}</td><td>{policy ? totals.used : '—'}</td><td>{policy ? totals.pending : '—'}</td><td>{policy ? `${totals.available}${hasUnlimited ? ' + Unlimited' : ''}` : '—'}</td><td><Actions><Action title="View leave balance" onClick={() => onView({ employee, policy })}><FiEye /></Action></Actions></td></tr> })}</DataTable>
  return <DataTable headers={['Request ID', 'Employee', 'Faculty Type', 'Department', 'Leave Type', 'Duration', 'Days', 'Applied On', 'Status', 'Action']}>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td><Employee employee={row.employee || {}} /></td><td>{typeOf(row.employee)}</td><td>{row.employee?.department || '—'}</td><td>{leaveTypes.find(type => type.id === row.typeId)?.name || 'Unavailable'}</td><td>{range(row.from, row.to)}</td><td>{row.days}</td><td>{dateLabel(row.applied)}</td><td><Status value={row.status} /></td><td><Actions><Action title="View request" onClick={() => onView(row)}><FiEye /></Action>{row.status === 'Pending' && <><Action title="Approve request" onClick={() => onDecision(row, 'Approved')}><FiCheck /></Action><Action title="Reject request" onClick={() => onDecision(row, 'Rejected')}><FiX /></Action></>}</Actions></td></tr>)}</DataTable>
}

function LeaveDialog({ dialog, faculty, leaveTypes, policies, academicYears, getBalance, onClose, onSaveType, onToggleType, onSavePolicy, onActivate, onDecision, onSaveRequest }) {
  if (dialog.kind === 'view') return <ViewDialog item={dialog.item} leaveTypes={leaveTypes} policies={policies} getBalance={getBalance} onClose={onClose} />
  if (dialog.kind === 'type') return <TypeDialog item={dialog.item} onClose={onClose} onSave={onSaveType} />
  if (dialog.kind === 'toggleType') return <ToggleTypeDialog item={dialog.item} onClose={onClose} onConfirm={onToggleType} />
  if (dialog.kind === 'policy') return <PolicyDialog item={dialog.item} leaveTypes={leaveTypes} academicYears={academicYears} onClose={onClose} onSave={onSavePolicy} />
  if (dialog.kind === 'activate') return <ActivationDialog policy={dialog.item} onClose={onClose} onActivate={onActivate} />
  if (dialog.kind === 'request') return <RequestLeaveDialog faculty={faculty} leaveTypes={leaveTypes} policies={policies} onClose={onClose} onSave={onSaveRequest} />
  return <DecisionDialog request={dialog.item} status={dialog.status} onClose={onClose} onSave={onDecision} />
}

function ViewDialog({ item, leaveTypes, policies, getBalance, onClose }) {
  const isBalance = item.employee && Object.hasOwn(item, 'policy')
  const isPolicy = Array.isArray(item.entitlements) || item.leaveTypes !== undefined || Object.hasOwn(item, 'applicableTo')
  const isType = Object.hasOwn(item, 'payCategory')
  const employee = item.employee
  const policyEntitlements = (item.entitlements && item.entitlements.length > 0)
    ? item.entitlements
    : leaveTypes.filter(type => type.status === 'Active' || !type.status).map(type => ({
        typeId: type.id,
        entitlement: 12,
        maxDays: '—',
        carryForward: false,
        documentRequired: false
      }))

  return (
    <View title={isBalance ? 'Leave Balance Details' : isPolicy ? 'Leave Policy Details' : isType ? 'Leave Type Details' : 'Leave Request Details'} onClose={onClose}>
      {employee && <Identity employee={employee} status={item.status} />}
      {isBalance ? (
        <>
          {item.policy ? (
            <>
              <Info title="Applicable Policy" rows={[['Policy', item.policy.name], ['Academic Year', item.policy.academicYear], ['Effective Period', range(item.policy.from, item.policy.to)]]} />
              <BalanceTable employee={employee} policy={item.policy} leaveTypes={leaveTypes} getBalance={getBalance} />
            </>
          ) : (
            <Info title="Applicable Policy" rows={[['Not Assigned', 'No active leave policy is applicable to this employee.']]} />
          )}
        </>
      ) : isPolicy ? (
        <>
          <h2>{item.name} <Status value={item.status} /></h2>
          <Info title="Policy Information" rows={[['Academic Year', item.academicYear], ['Applicable To', item.applicableTo], ['Department Scope', item.departments?.length ? item.departments.join(', ') : 'All Departments'], ['Effective Period', range(item.from, item.to)]]} />
          <section className="flm-view-section">
            <h3>Leave Entitlements</h3>
            <table className="flm-dialog-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Code</th>
                  <th>Pay Type</th>
                  <th>Entitled</th>
                  <th>Max / Request</th>
                  <th>Carry Forward</th>
                  <th>Document</th>
                </tr>
              </thead>
              <tbody>
                {policyEntitlements.map(rule => {
                  const leaveType = leaveTypes.find(type => String(type.id) === String(rule.typeId))
                  return (
                    <tr key={rule.typeId}>
                      <td>{leaveType?.name || rule.name || 'Unavailable'}</td>
                      <td>{leaveType?.code || rule.code || '—'}</td>
                      <td>{leaveType?.payCategory || rule.payCategory || 'Paid Leave'}</td>
                      <td>{rule.entitlement ?? 12}</td>
                      <td>{rule.maxDays || '—'}</td>
                      <td>{rule.carryForward ? 'Yes' : 'No'}</td>
                      <td>{rule.documentRequired ? 'Yes' : 'No'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </>
      ) : isType ? (
        <>
          <h2>{item.name} <Status value={item.status} /></h2>
          <Info title="General Information" rows={[['Leave Type', item.name], ['Leave Code', item.code], ['Category', item.category || 'Regular'], ['Pay Category', item.payCategory], ['Status', item.status], ['Description', item.description || 'No description provided.']]} />
        </>
      ) : (
        <>
          <Info title="Request Information" rows={[['Request ID', item.id], ['Leave Type', leaveTypes.find(type => type.id === item.typeId)?.name || 'Unavailable'], ['Applied On', dateLabel(item.applied)], ['Policy', policies.find(policy => policy.id === item.policyId)?.name || 'Not Assigned']]} />
          <Info title="Leave Period" columns={3} rows={[['From', dateLabel(item.from)], ['To', dateLabel(item.to)], ['Duration', `${item.days} Days`]]} />
          <section className="flm-view-section">
            <h3>Reason</h3>
            <p className="flm-view-reason">{item.reason}</p>
          </section>
          {item.decisionDate && <Info title="Decision Details" rows={[['Decision Date', dateLabel(item.decisionDate)], ...(item.rejectionReason ? [['Rejection Reason', item.rejectionReason]] : [])]} />}
        </>
      )}
    </View>
  )
}

function TypeDialog({ item = {}, onClose, onSave }) { const [data, setData] = useState({ name: item.name || '', code: item.code || '', payCategory: item.payCategory || 'Paid Leave', description: item.description || '', status: item.status || 'Active' }); const [error, setError] = useState(''); const save = async () => { setError(''); await onSave({ ...item, ...data }) }; return <Modal title={item.id ? 'Edit Leave Type' : 'Add Leave Type'} onClose={onClose}><Form><Input label="Leave Type Name *" value={data.name} onChange={value => setData({ ...data, name: value })} /><Input label="Leave Code *" value={data.code} onChange={value => setData({ ...data, code: value })} /><Select label="Pay Category" value={data.payCategory} values={['Paid Leave', 'Unpaid Leave']} onChange={value => setData({ ...data, payCategory: value })} /><Select label="Status" value={data.status} values={['Active', 'Inactive']} onChange={value => setData({ ...data, status: value })} /><label>Description<textarea value={data.description} onChange={event => setData({ ...data, description: event.target.value })} /></label></Form>{error && <p className="flm-error">{error}</p>}<Footer><button onClick={onClose}>Cancel</button><button className="approve-action" onClick={save}>Save Leave Type</button></Footer></Modal> }

function ToggleTypeDialog({ item, onClose, onConfirm }) {
  const isDeactivating = item.status === 'Active'
  return (
    <Modal title={isDeactivating ? 'Deactivate / Delete Leave Type' : 'Activate Leave Type'} onClose={onClose}>
      <p style={{ margin: '14px 0', fontSize: '13px', lineHeight: 1.5 }}>
        {isDeactivating ? (
          <>Are you sure you want to deactivate/delete <strong>{item.name} ({item.code})</strong>? It will no longer be available for faculty leave requests.</>
        ) : (
          <>Activate <strong>{item.name} ({item.code})</strong> for faculty leave policies and requests?</>
        )}
      </p>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button className={isDeactivating ? 'reject-action' : 'approve-action'} onClick={() => onConfirm(item)}>
          {isDeactivating ? 'Deactivate / Delete' : 'Activate'}
        </button>
      </Footer>
    </Modal>
  )
}

function PolicyDialog({ item = {}, leaveTypes, academicYears, onClose, onSave }) {
  const initialEntitlements = (item.entitlements && item.entitlements.length > 0)
    ? item.entitlements
    : leaveTypes.filter(type => type.status === 'Active').map(type => ({
        typeId: type.id,
        entitlement: 12,
        maxDays: '',
        carryForward: false,
        maxCarryForward: '',
        documentRequired: false
      }))
  const [data, setData] = useState({
    name: item.name || '',
    academicYear: item.academicYear || '',
    applicableTo: item.applicableTo || 'Teaching',
    from: item.from || '',
    to: item.to || '',
    departments: item.departments || [],
    entitlements: initialEntitlements
  })
  const toggle = type => setData(current => ({
    ...current,
    entitlements: current.entitlements.some(rule => rule.typeId === type.id)
      ? current.entitlements.filter(rule => rule.typeId !== type.id)
      : [...current.entitlements, { typeId: type.id, entitlement: 12, maxDays: '', carryForward: false, maxCarryForward: '', documentRequired: false }]
  }))
  return (
    <Modal title={item.id ? 'Edit Leave Policy' : 'Create Leave Policy'} onClose={onClose}>
      <Form>
        <Input label="Policy Name *" value={data.name} onChange={value => setData({ ...data, name: value })} />
        <label>
          Academic Year *
          <select value={data.academicYear} onChange={event => setData({ ...data, academicYear: event.target.value })}>
            <option value="">{academicYears.length ? 'Select academic year' : 'No academic years available'}</option>
            {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <Select label="Applicable To" value={data.applicableTo} values={['Teaching', 'Non-Teaching', 'Both']} onChange={value => setData({ ...data, applicableTo: value })} />
        <Input label="Effective From *" type="date" value={data.from} onChange={value => setData({ ...data, from: value })} />
        <Input label="Effective To *" type="date" value={data.to} onChange={value => setData({ ...data, to: value })} />
      </Form>
      <h3>Leave Entitlements</h3>
      {leaveTypes.filter(type => type.status === 'Active').map(type => {
        const rule = data.entitlements.find(value => value.typeId === type.id)
        return (
          <label className="flm-rule" key={type.id}>
            <input type="checkbox" checked={Boolean(rule)} onChange={() => toggle(type)} />
            <span>{type.name} ({type.payCategory})</span>
            {rule && (
              <input
                type="number"
                min="0"
                placeholder="Annual entitlement"
                value={rule.entitlement}
                onChange={event => setData({
                  ...data,
                  entitlements: data.entitlements.map(value => value.typeId === type.id ? { ...value, entitlement: Number(event.target.value) } : value)
                })}
              />
            )}
          </label>
        )
      })}
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button className="approve-action" disabled={!data.name || !data.academicYear || !data.from || !data.to || data.from > data.to || !data.entitlements.length} onClick={() => onSave({ ...item, ...data })}>
          {item.id ? 'Save Changes' : 'Create Policy'}
        </button>
      </Footer>
    </Modal>
  )
}
function RequestLeaveDialog({ faculty, leaveTypes, policies, onClose, onSave }) {
  const [data, setData] = useState({
    facultyId: faculty[0]?.id || '',
    leaveTypeId: leaveTypes.find(t => t.status === 'Active')?.id || leaveTypes[0]?.id || '',
    policyId: policies.find(p => p.status === 'Active')?.id || policies[0]?.id || '',
    fromDate: today(),
    toDate: today(),
    days: 1,
    reason: ''
  })
  const [error, setError] = useState('')

  const handleDateChange = (key, val) => {
    setData(prev => {
      const updated = { ...prev, [key]: val }
      if (updated.fromDate && updated.toDate && updated.toDate >= updated.fromDate) {
        const d1 = new Date(`${updated.fromDate}T00:00:00`)
        const d2 = new Date(`${updated.toDate}T00:00:00`)
        const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1)
        updated.days = diff
      }
      return updated
    })
  }

  const handleFacultyChange = (id) => {
    const selected = faculty.find(f => String(f.id) === String(id))
    const applicablePolicy = selected ? policies.find(p => p.status === 'Active' && (p.applicableTo === 'Both' || p.applicableTo === (selected.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'))) : null
    setData(prev => ({
      ...prev,
      facultyId: id,
      policyId: applicablePolicy?.id || prev.policyId || policies[0]?.id || ''
    }))
  }

  const handleSubmit = async () => {
    if (!data.facultyId) { setError('Please select a faculty member.'); return }
    if (!data.leaveTypeId) { setError('Please select a leave type.'); return }
    if (!data.fromDate || !data.toDate) { setError('Please enter valid dates.'); return }
    if (data.fromDate > data.toDate) { setError('From date must be before or equal to To date.'); return }
    if (!data.reason.trim()) { setError('Please enter a reason for leave.'); return }
    setError('')
    await onSave(data)
  }

  return (
    <Modal title="Apply for Leave" onClose={onClose}>
      <Form>
        <label>
          <span>Faculty Member *</span>
          <select value={data.facultyId} onChange={e => handleFacultyChange(e.target.value)}>
            <option value="">Select Faculty</option>
            {faculty.map(f => (
              <option key={f.id} value={f.id}>
                {f.fullName || f.name} ({f.employeeId || f.code || f.id})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Leave Type *</span>
          <select value={data.leaveTypeId} onChange={e => setData({ ...data, leaveTypeId: e.target.value })}>
            <option value="">Select Leave Type</option>
            {leaveTypes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code || t.category || t.payCategory})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Policy</span>
          <select value={data.policyId} onChange={e => setData({ ...data, policyId: e.target.value })}>
            <option value="">Select Policy</option>
            {policies.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.academicYear || p.status})
              </option>
            ))}
          </select>
        </label>
        <Input label="From Date *" type="date" value={data.fromDate} onChange={v => handleDateChange('fromDate', v)} />
        <Input label="To Date *" type="date" value={data.toDate} onChange={v => handleDateChange('toDate', v)} />
        <Input label="Total Days *" type="number" value={data.days} onChange={v => setData({ ...data, days: Number(v) || 1 })} />
        <label>
          <span>Reason *</span>
          <textarea value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} placeholder="Reason for leave request..." />
        </label>
      </Form>
      {error && <p className="flm-error">{error}</p>}
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button className="approve-action" onClick={handleSubmit}>Submit Request</button>
      </Footer>
    </Modal>
  )
}

function ActivationDialog({ policy, onClose, onActivate }) { const [error, setError] = useState(''); return <Modal title="Activate Leave Policy" onClose={onClose}><p>Activate <strong>{policy.name}</strong> for {policy.applicableTo} employees?</p>{error && <p className="flm-error">{error}</p>}<Footer><button onClick={onClose}>Cancel</button><button className="approve-action" onClick={() => onActivate(policy)}>Activate Policy</button></Footer></Modal> }
function DecisionDialog({ request, status, onClose, onSave }) { const [reason, setReason] = useState(''); const reject = status === 'Rejected'; return <Modal title={reject ? 'Reject Leave Request' : 'Approve Leave Request?'} onClose={onClose}>{reject && <label>Reason for Rejection *<textarea value={reason} onChange={event => setReason(event.target.value)} /></label>}<Footer><button onClick={onClose}>Cancel</button><button className={reject ? 'reject-action' : 'approve-action'} disabled={reject && reason.trim().length < 3} onClick={() => onSave(request, status, reason)}>Confirm</button></Footer></Modal> }
function BalanceTable({ employee, policy, leaveTypes, getBalance }) {
  const rules = (policy?.entitlements && policy.entitlements.length > 0)
    ? policy.entitlements
    : leaveTypes.map(type => ({ typeId: type.id }))

  return (
    <section className="flm-view-section">
      <h3>Leave Type Balances</h3>
      <table className="flm-dialog-table">
        <thead>
          <tr>
            <th>Leave Type</th>
            <th>Entitled</th>
            <th>Used</th>
            <th>Pending</th>
            <th>Available</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(rule => {
            const totals = getBalance(employee, policy, rule.typeId)
            const typeInfo = leaveTypes.find(type => String(type.id) === String(rule.typeId))
            const typeName = typeInfo?.name || rule.leaveTypeName || rule.typeId
            const entitled = totals?.entitled ?? 12
            const used = totals?.used ?? 0
            const pending = totals?.pending ?? 0
            const available = totals?.available ?? (entitled != null ? Math.max(0, entitled - used - pending) : 'Unlimited')
            return (
              <tr key={rule.typeId}>
                <td>{typeName} ({typeInfo?.code || '—'})</td>
                <td>{entitled}</td>
                <td>{used}</td>
                <td>{pending}</td>
                <td>{available}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
function View({ title, children, onClose }) { return <div className="flm-overlay"><section className="flm-view-dialog" role="dialog" aria-modal="true"><button className="flm-close" aria-label="Close" onClick={onClose}><FiX /></button><p className="flm-eyebrow">{title.toUpperCase()}</p>{children}</section></div> }
function Identity({ employee, status }) { return <div className="flm-view-identity"><span>{initials(employee?.fullName)}</span><div><h2>{employee?.fullName}</h2><p className="flm-view-meta">{employee?.employeeId} <b>•</b> {typeOf(employee)}</p><p className="flm-view-meta">{employee?.designation} <b>•</b> {employee?.department}</p></div>{status && <Status value={status} />}</div> }
function Info({ title, rows, columns = 2 }) { return <section className="flm-view-section"><h3>{title}</h3><div className={`flm-info-grid flm-info-grid--${columns}`}>{rows.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></section> }
function DataTable({ headers, children }) { return <div className="flm-table-wrap"><table className="flm-table"><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div> }
function Employee({ employee }) { return <div className="flm-employee"><span>{initials(employee.fullName)}</span><div><strong>{employee.fullName}</strong><small>{employee.employeeId}</small></div></div> }
function Actions({ children }) { return <div className="flm-actions">{children}</div> }
function Action({ title, children, onClick }) { return <button type="button" title={title} aria-label={title} onClick={onClick}>{children}</button> }
function Status({ value }) { return <span className={`flm-status ${statusClass(value)}`}>{value}</span> }
function FilterSelect({ label, value, values, onChange }) { return <label className="flm-filter-field"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">All {label}s</option>{values.map(item => <option key={item}>{item}</option>)}</select></label> }
function Select({ label, value, values, onChange }) { return <label><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}>{values.map(item => <option key={item}>{item}</option>)}</select></label> }
function Modal({ title, children, onClose }) { return <div className="flm-overlay"><section className="flm-decision-dialog flm-config-dialog" role="dialog" aria-modal="true"><button className="flm-close" aria-label="Close" onClick={onClose}><FiX /></button><p className="flm-eyebrow">FACULTY LEAVE</p><h2>{title}</h2>{children}</section></div> }
function Form({ children }) { return <div className="flm-config-form">{children}</div> }
function Input({ label, type = 'text', value, onChange }) { return <label>{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} /></label> }
function Footer({ children }) { return <footer>{children}</footer> }

