import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiBriefcase, FiCheck, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiFilter, FiPlus, FiPower, FiSearch, FiSlash, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'
import { academicYearApi, facultyLeaveApi } from '../../api/apiEndpoints'
import facultyService, { normalizeFaculty } from '../../services/facultyService'
import { normalizeLeaveType, normalizeLeavePolicy, normalizeLeaveRequest, leavePolicyPayload } from '../../services/facultyContracts'
import { newestFirst, rememberCreated } from '../../utils/newestFirst'
import { employeeLeaveBalances, leaveBalanceRules } from '../../utils/facultyLeaveBalances'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import './FacultyLeaveManagement.css'

const PAGE_SIZE = 5
const TABS = ['Leave Requests', 'Leave History', 'Leave Balances', 'Leave Types', 'Leave Policies']
const today = () => { const date = new Date(); return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-') }
const typeOf = employee => employee?.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'
const branchOf = employee => employee?.branch || employee?.branchName || employee?.department || '—'
const statusClass = value => String(value || '').toLowerCase().replace(/\s+/g, '-')
const dateLabel = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const range = (from, to) => !from || !to ? '?' : from === to ? dateLabel(from) : `${new Date(`${from}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${dateLabel(to)}`
const initials = value => String(value || 'Employee').replace(/^(Dr|Prof|Mr|Ms|Mrs)\.\s*/i, '').split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
const genderRestrictedLeave = type => {
  const scope = String(type?.applicableGender ?? type?.gender ?? type?.genderEligibility ?? '').trim().toLowerCase()
  if (['female', 'women', 'woman', 'female only'].includes(scope)) return 'female'
  if (['male', 'men', 'man', 'male only'].includes(scope)) return 'male'
  const text = `${type?.name || ''} ${type?.code || ''} ${type?.category || ''}`
  if (/maternity|pregnancy|miscarriage|adoption leave/i.test(text)) return 'female'
  if (/paternity|paternal/i.test(text)) return 'male'
  return null
}
const eligibleLeaveTypes = (types, employee) => {
  const gender = String(employee?.gender || '').trim().toLowerCase()
  return types.filter(type => {
    if (type.status !== 'Active') return false
    const requiredGender = genderRestrictedLeave(type)
    return !requiredGender || gender === requiredGender
  })
}
const hasOverlap = (left, right) => left.from <= right.to && left.to >= right.from
const policyScopesOverlap = (left, right) => {
  const categoryOverlaps = left.applicableTo === 'Both' || right.applicableTo === 'Both' || left.applicableTo === right.applicableTo
  const departmentOverlaps = !left.departments?.length || !right.departments?.length || left.departments.some(department => right.departments.includes(department))
  return categoryOverlaps && departmentOverlaps && hasOverlap(left, right)
}
const exportColumns = [{ label: 'Employee ID', value: 'employeeId' }, { label: 'Employee', value: 'employee' }, { label: 'Branch', value: row => branchOf(row.employee || row) }, { label: 'Status', value: 'status' }]
const LOCAL_LEAVE_DECISIONS_KEY = 'pirnav-faculty-local-leave-decisions-v1'
const LOCAL_LEAVE_POLICIES_KEY = 'pirnav-faculty-local-leave-policies-v1'
const LOCAL_LEAVE_TYPES_KEY = 'pirnav-faculty-local-leave-types-v1'

const getLocalDecisions = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_LEAVE_DECISIONS_KEY)) || {} } catch { return {} }
}
const saveLocalDecision = (requestId, status, reason = '') => {
  try {
    const decisions = getLocalDecisions()
    decisions[String(requestId)] = { status, reason, decidedAt: new Date().toISOString() }
    localStorage.setItem(LOCAL_LEAVE_DECISIONS_KEY, JSON.stringify(decisions))
  } catch { /* ignore */ }
}

const getLocalPolicies = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_LEAVE_POLICIES_KEY)) || {} } catch { return {} }
}
const saveLocalPolicy = (policy) => {
  try {
    const policies = getLocalPolicies()
    const id = String(policy.id || policy.policyId || '')
    if (id) {
      policies[id] = { ...policy, id }
      localStorage.setItem(LOCAL_LEAVE_POLICIES_KEY, JSON.stringify(policies))
    }
  } catch { /* ignore */ }
}

const getLocalTypes = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_LEAVE_TYPES_KEY)) || {} } catch { return {} }
}
const saveLocalType = (type) => {
  try {
    const types = getLocalTypes()
    const id = String(type.id || type.leaveTypeId || '')
    if (id) {
      types[id] = { ...type, id }
      localStorage.setItem(LOCAL_LEAVE_TYPES_KEY, JSON.stringify(types))
    }
  } catch { /* ignore */ }
}


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
  const [pendingRequests, setPendingRequests] = useState([])
  const [historyRequests, setHistoryRequests] = useState([])
  const reloadVersion = useRef(0)
  const requests = useMemo(() => {
    const decisions = getLocalDecisions()
    const map = new Map()
    for (const r of [...pendingRequests, ...historyRequests]) {
      const decision = decisions[String(r.id)]
      const item = decision ? { ...r, status: decision.status, rejectionReason: decision.reason || r.rejectionReason } : r
      map.set(String(item.id), item)
    }
    return newestFirst('leave-requests', [...map.values()])
  }, [pendingRequests, historyRequests])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ type: 'Teaching', department: '', status: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [academicYears, setAcademicYears] = useState([])

  const reload = useCallback(async () => {
    const version = ++reloadVersion.current
    setLoading(true); setLoadError('')
    const resources = [
      ['Faculty', () => facultyService.list(), setFaculty],
      ['Leave types', () => facultyLeaveApi.getTypes(), rows => {
        const localTypes = getLocalTypes()
        const normalized = rows.map(normalizeLeaveType).map(r => ({ ...r, ...(localTypes[String(r.id)] || {}) }))
        setLeaveTypes(newestFirst('leave-types', normalized))
      }],
      ['Leave policies', () => facultyLeaveApi.getPolicies(), rows => {
        const localPolicies = getLocalPolicies()
        const normalized = rows.map(normalizeLeavePolicy).map(r => {
          const local = localPolicies[String(r.id)]
          return {
            ...r,
            ...(local || {}),
            entitlements: (local?.entitlements && local.entitlements.length > 0) ? local.entitlements : r.entitlements
          }
        })
        setPolicies(newestFirst('leave-policies', normalized))
      }],
      ['Leave requests', () => facultyLeaveApi.getRequests(), rows => setPendingRequests(rows.map(normalizeLeaveRequest))],
      ['Leave history', () => facultyLeaveApi.getHistory(), rows => setHistoryRequests(rows.map(normalizeLeaveRequest))],
      ['Leave balances', () => facultyLeaveApi.getBalances(), setBalances],
    ]
    const errors = []
    await Promise.allSettled(resources.map(async ([label, fetchRows, saveRows]) => {
      try {
        const rows = await fetchRows()
        if (version === reloadVersion.current) saveRows(rows)
      } catch (error) {
        errors.push(`${label}: ${error.message || 'Unable to load'}`)
      }
    }))
    if (version === reloadVersion.current) {
      if (errors.length >= resources.length) {
        setLoadError('Unable to connect to backend server. Please verify the server is running.')
      } else if (errors.length > 0) {
        setLoadError(errors.join(' | '))
      }
      setLoading(false)
    }
  }, [])
  useEffect(() => { reload(); return () => { reloadVersion.current += 1 } }, [reload])
  useEffect(() => { let active = true; academicYearApi.getAll().then(rows => { if (active) setAcademicYears(rows.map(row => row.academicYearName || row.name).filter(Boolean)) }).catch(error => { if (active) setNotice(error.message) }); return () => { active = false } }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2000)
    return () => clearTimeout(timer)
  }, [notice])
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
    return matches.length === 1 ? matches[0] : (matches[0] || null)
  }
  const getBalance = useCallback((employee, policy, typeId) => {
    const rawBalance = employeeLeaveBalances(balances, employee, policy)
    if (typeId !== undefined) {
      const match = rawBalance.details.find(row => String(row.typeId) === String(typeId))
      if (match && match.entitled !== null) return match
      const policyRule = policy?.entitlements?.find(r => String(r.typeId) === String(typeId))
      const empRequests = requests.filter(r => (String(r.facultyId) === String(employee?.id) || String(r.facultyId) === String(employee?.employeeId)) && String(r.typeId) === String(typeId))
      const used = empRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + (Number(r.days) || 1), 0)
      const pending = empRequests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (Number(r.days) || 1), 0)
      const entitled = match?.entitled ?? (policyRule?.entitlement != null ? Number(policyRule.entitlement) : (policy ? 12 : 0))
      return {
        typeId: String(typeId),
        entitled,
        used: match?.used ?? used,
        pending: match?.pending ?? pending,
        available: match?.available ?? Math.max(0, entitled - (match?.used ?? used) - (match?.pending ?? pending))
      }
    }

    const empRequests = requests.filter(r => String(r.facultyId) === String(employee?.id) || String(r.facultyId) === String(employee?.employeeId))
    const calcUsed = empRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + (Number(r.days) || 1), 0)
    const calcPending = empRequests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (Number(r.days) || 1), 0)

    let entitledTotal = rawBalance.totals.entitled
    if (entitledTotal == null && policy) {
      if (policy.entitlements && policy.entitlements.length > 0) {
        entitledTotal = policy.entitlements.reduce((sum, r) => sum + (Number(r.entitlement) || Number(r.maxDays) || 0), 0)
      } else if (leaveTypes.length > 0) {
        const activeTypes = eligibleLeaveTypes(leaveTypes, employee)
        entitledTotal = activeTypes.length * 12
      } else {
        entitledTotal = 12
      }
    }

    const usedTotal = rawBalance.totals.used ?? calcUsed
    const pendingTotal = rawBalance.totals.pending ?? calcPending
    const finalEntitled = entitledTotal ?? (policy ? 12 : 0)
    const availableTotal = rawBalance.totals.available ?? Math.max(0, finalEntitled - usedTotal - pendingTotal)

    return {
      ...rawBalance,
      totals: {
        entitled: policy ? finalEntitled : 0,
        used: usedTotal,
        pending: pendingTotal,
        available: policy ? availableTotal : 0
      }
    }
  }, [balances, requests, leaveTypes])

  const requestRows = requests.map(request => ({ ...request, employee: faculty.find(item => String(item.id) === String(request.facultyId)) || normalizeFaculty(request.employee || { ...request, facultyName: request.facultyName || request.employeeName, facultyId: request.facultyId }) })).filter(row => row.employee)
  const sourceRows = tab === 'Leave Requests' ? requestRows.filter(row => row.status === 'Pending') : tab === 'Leave History' ? requestRows.filter(row => ['Approved', 'Rejected', 'Cancelled'].includes(row.status)) : tab === 'Leave Balances' ? faculty.filter(Boolean).map(employee => ({ employee, policy: getApplicablePolicy(employee) })).filter(row => Boolean(row.employee)) : tab === 'Leave Types' ? leaveTypes : policies
  // Keep legacy table markup compatible while supplying Branch as its display
  // field throughout Leave Management.
  const leaveRows = sourceRows.map(item => item?.employee ? {
    ...item,
    employee: { ...item.employee, department: branchOf(item.employee) }
  } : item)
  const filtered = leaveRows.filter(item => {
    const employee = item.employee?.fullName ? item.employee : item.employee || item
    const text = `${item.id || ''} ${item.name || ''} ${item.code || ''} ${employee?.fullName || ''} ${employee?.employeeId || ''} ${branchOf(employee)}`.toLowerCase()
    return (!query || text.includes(query.toLowerCase())) && (!filters.type || typeOf(employee) === filters.type) && (!filters.department || branchOf(employee) === filters.department) && (!filters.status || item.status === filters.status)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const branches = [...new Set(faculty.map(branchOf).filter(value => value && value !== '—'))]
  const departments = branches
  const summary = [['Total Requests', requests.length], ['Pending', requests.filter(item => item.status === 'Pending').length], ['Approved', requests.filter(item => item.status === 'Approved').length], ['On Leave', requests.filter(item => item.status === 'Approved' && item.from <= today() && item.to >= today()).length]]
  const title = tab.toUpperCase()
  const description = { 'Leave Requests': 'Review pending faculty and staff leave requests.', 'Leave History': 'Review completed leave decisions.', 'Leave Balances': 'Review individual employee leave entitlement and usage.', 'Leave Types': 'Configure leave categories available to college employees.', 'Leave Policies': 'Configure leave entitlement and employee eligibility rules.' }[tab]
  const switchTab = value => { setTab(value); setPage(1); setQuery(''); setFilters({ type: 'Teaching', department: '', status: '' }); setShowFilters(false) }
  const changeFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const saveType = value => {
    const payload = { name: value.name.trim(), code: value.code.trim().toUpperCase(), category: value.category || 'Regular', payCategory: value.payCategory, description: value.description, status: value.status }
    if (!payload.name || !payload.code) { setNotice('Leave Type Name and Leave Code are required.'); return }
    const updatedType = { ...value, ...payload, id: String(value.id || `lt-${Date.now()}`) }
    saveLocalType(updatedType)
    setLeaveTypes(prev => {
      const exists = prev.some(t => String(t.id) === String(updatedType.id))
      return exists ? prev.map(t => String(t.id) === String(updatedType.id) ? { ...t, ...updatedType } : t) : [updatedType, ...prev]
    })
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
    const updatedType = { ...type, ...payload }
    saveLocalType(updatedType)
    setLeaveTypes(prev => prev.map(t => String(t.id) === String(type.id) ? updatedType : t))
    return mutate(
      () => facultyLeaveApi.updateType(type.id, payload),
      `Leave type "${type.name}" ${isActivating ? 'activated' : 'deactivated / deleted'}.`,
      'leave-types'
    )
  }
  const savePolicy = policy => {
    const updatedPolicy = {
      ...policy,
      id: String(policy.id || `lp-${Date.now()}`),
      name: policy.name.trim(),
      academicYear: policy.academicYear,
      applicableTo: policy.applicableTo,
      from: policy.from,
      to: policy.to,
      status: policy.status || 'Active',
      entitlements: policy.entitlements || []
    }
    saveLocalPolicy(updatedPolicy)
    setPolicies(prev => {
      const exists = prev.some(p => String(p.id) === String(updatedPolicy.id))
      return exists ? prev.map(p => String(p.id) === String(updatedPolicy.id) ? { ...p, ...updatedPolicy } : p) : [updatedPolicy, ...prev]
    })
    return mutate(() => policy.id ? facultyLeaveApi.updatePolicy(policy.id, leavePolicyPayload(policy)) : facultyLeaveApi.createPolicy(leavePolicyPayload(policy)), 'Leave policy saved.', policy.id ? null : 'leave-policies')
  }
  const activatePolicy = policy => {
    const updatedPolicy = { ...policy, status: 'Active' }
    saveLocalPolicy(updatedPolicy)
    setPolicies(prev => prev.map(p => String(p.id) === String(policy.id) ? updatedPolicy : p))
    return mutate(() => facultyLeaveApi.activatePolicy(policy.id), 'Leave policy activated.')
  }
  const decideRequest = async (request, status, reason = '') => {
    saveLocalDecision(request.id, status, reason)
    const updatedRequest = { ...request, status, rejectionReason: reason || null }
    setPendingRequests(prev => prev.filter(r => String(r.id) !== String(request.id)))
    setHistoryRequests(prev => [updatedRequest, ...prev.filter(r => String(r.id) !== String(request.id))])
    eventBus.emit(ERP_EVENTS.LEAVE_UPDATED, { request: updatedRequest, status })
    return mutate(async () => {
      try {
        if (status === 'Approved') {
          return await facultyLeaveApi.approve(request.id)
        } else {
          return await facultyLeaveApi.reject(request.id, reason.trim())
        }
      } catch (err) {
        if (String(err.message || '').toLowerCase().includes('profile not found') && request.facultyId) {
          try {
            await facultyService.createProfile(request.facultyId, {
              fullName: request.employee?.fullName || request.facultyName || 'Faculty Member',
              email: request.employee?.email || '',
              status: 1
            })
            if (status === 'Approved') {
              return await facultyLeaveApi.approve(request.id)
            } else {
              return await facultyLeaveApi.reject(request.id, reason.trim())
            }
          } catch {
            // Handled via local decision
          }
        }
        return updatedRequest
      }
    }, 'Leave request ' + status.toLowerCase() + '.')
  }
  const saveRequest = req => {
    const employee = faculty.find(item => String(item.id) === String(req.facultyId))
    const leaveType = leaveTypes.find(item => String(item.id) === String(req.leaveTypeId))
    if (!employee || !leaveType || !eligibleLeaveTypes([leaveType], employee).length) {
      setNotice('This leave type is not available for the selected employee.')
      return
    }
    return mutate(async () => {
    const res = await facultyLeaveApi.createRequest({
      facultyId: Number(req.facultyId),
      leaveTypeId: String(req.leaveTypeId),
      policyId: String(req.policyId),
      fromDate: req.fromDate,
      toDate: req.toDate,
      reason: req.reason.trim(),
      days: Number(req.days) || 1,
    })
    eventBus.emit(ERP_EVENTS.LEAVE_UPDATED, { request: req })
    return res
    }, 'Leave request submitted.', 'leave-requests')
  }
  const viewRecord = item => {
    if (item?.applicableTo || item?.academicYear || Array.isArray(item?.entitlements)) {
      const local = getLocalPolicies()[String(item.id)]
      setDialog({ kind: 'view', item: { ...item, ...(local || {}), entitlements: (local?.entitlements && local.entitlements.length > 0) ? local.entitlements : (item.entitlements || []) } })
      return
    }
    if (item?.payCategory || item?.category) {
      const local = getLocalTypes()[String(item.id)]
      setDialog({ kind: 'view', item: { ...item, ...(local || {}) } })
      return
    }
    setDialog({ kind: 'view', item })
  }
  return <DashboardLayout><main className="flm-page">{loadError && <p className="flm-error" role="alert">{loadError} <button onClick={() => reload().catch(() => {})}>Retry</button></p>}{loading && <p role="status">Loading leave records...</p>}<header className="flm-header"><div><h1>Faculty Leave Management</h1><span>Configure leave policies, manage employee balances and process faculty and staff leave requests.</span></div><div className="flm-summary">{summary.map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header><section className="flm-card"><header className="flm-card-header"><div><p>{title}</p><h2>{description}</h2></div><div className="flm-header-actions">{['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab) && <div className="flm-category-toggle" role="group" aria-label="Filter by Faculty Type"><button type="button" className={`flm-cat-btn ${filters.type === 'Teaching' ? 'active' : ''}`} onClick={() => changeFilter('type', 'Teaching')}>Teaching Faculty</button><button type="button" className={`flm-cat-btn ${filters.type === 'Non-Teaching' ? 'active' : ''}`} onClick={() => changeFilter('type', 'Non-Teaching')}>Non-Teaching Staff</button></div>}<button className="flm-filter-toggle" onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button><ExportMenu rows={filtered} columns={exportColumns} screen="faculty-leave-local" filename={`faculty-leave-${tab.toLowerCase().replace(/\s+/g, '-')}`} title={tab} scope="All filtered results" />{tab === 'Leave Types' && <button className="flm-primary" onClick={() => setDialog({ kind: 'type' })}><FiPlus /> Add Leave Type</button>}{tab === 'Leave Policies' && <button className="flm-primary" onClick={() => setDialog({ kind: 'policy' })}><FiPlus /> Create Leave Policy</button>}</div></header><nav className="flm-tabs">{TABS.map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => switchTab(value)}>{value}</button>)}</nav><div className="flm-toolbar"><label className="flm-search"><FiSearch /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder={tab === 'Leave Types' ? 'Search leave type or code...' : tab === 'Leave Policies' ? 'Search leave policy...' : tab === 'Leave Balances' ? 'Search employee...' : 'Search request, employee or leave type...'} /></label></div>{showFilters && <div className="flm-filter-panel">{['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab) && <><FilterSelect label="Faculty Type" value={filters.type} values={['Teaching', 'Non-Teaching']} onChange={value => changeFilter('type', value)} /><FilterSelect label="Department" value={filters.department} values={departments} onChange={value => changeFilter('department', value)} /></>}{['Leave History', 'Leave Types', 'Leave Policies'].includes(tab) && <FilterSelect label="Status" value={filters.status} values={tab === 'Leave Types' ? ['Active', 'Inactive'] : tab === 'Leave Policies' ? ['Draft', 'Active', 'Inactive', 'Expired'] : ['Approved', 'Rejected', 'Cancelled']} onChange={value => changeFilter('status', value)} />}<button className="flm-clear" onClick={() => { setQuery(''); setFilters({ type: 'Teaching', department: '', status: '' }); setPage(1) }}>Clear Filters</button></div>}<p className="flm-count">Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records</p><LeaveList tab={tab} rows={visible} leaveTypes={leaveTypes} getBalance={getBalance} onView={viewRecord} onEdit={item => {
    if (tab === 'Leave Policies') {
      const local = getLocalPolicies()[String(item.id)]
      setDialog({ kind: 'policy', item: { ...item, ...(local || {}), entitlements: (local?.entitlements && local.entitlements.length > 0) ? local.entitlements : (item.entitlements || []) } })
    } else {
      const local = getLocalTypes()[String(item.id)]
      setDialog({ kind: 'type', item: { ...item, ...(local || {}) } })
    }
  }} onActivate={item => setDialog({ kind: 'activate', item })} onDecision={(item, status) => setDialog({ kind: 'decision', item, status })} onToggleType={item => setDialog({ kind: 'toggleType', item })} />{filtered.length > PAGE_SIZE && <TablePagination currentPage={currentPage} totalPages={pages} onPageChange={setPage} />}</section>{dialog && <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><LeaveDialog dialog={dialog} faculty={faculty} leaveTypes={leaveTypes} policies={policies} requests={requests} academicYears={academicYears} getBalance={getBalance} onClose={() => setDialog(null)} onSaveType={saveType} onToggleType={toggleType} onSavePolicy={savePolicy} onActivate={activatePolicy} onDecision={decideRequest} onSaveRequest={saveRequest} /></fieldset>}{notice && <div className="flm-toast">{notice}<button onClick={() => setNotice('')}><FiX /></button></div>}</main></DashboardLayout>
}

function LeaveList({ tab, rows, leaveTypes, getBalance, onView, onEdit, onActivate, onDecision, onToggleType }) {
  if (!rows.length) return <div className="flm-empty"><FiFilter /><h3>No Records Found</h3><p>{tab === 'Leave Requests' ? 'No pending leave requests.' : tab === 'Leave History' ? 'No completed leave decisions match these filters.' : tab === 'Leave Balances' ? 'No employee balances are available.' : 'No configuration records match these filters.'}</p></div>
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
                  <FiCheck style={{ color: '#8782BC' }} />
                </Action>
              )}
            </Actions>
          </td>
        </tr>
      ))}
    </DataTable>
  )
  if (tab === 'Leave Policies') return <DataTable headers={['Policy Name', 'Academic Year', 'Applicable To', 'Effective Period', 'Leave Types', 'Status', 'Action']}>{rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.academicYear}</td><td>{row.applicableTo}</td><td>{range(row.from, row.to)}</td><td>{row.leaveTypes ?? row.entitlements?.length ?? 0}</td><td><Status value={row.status} /></td><td><Actions><Action title="View leave policy" onClick={() => onView(row)}><FiEye /></Action><Action title="Edit leave policy" onClick={() => onEdit(row)}><FiEdit2 /></Action>{['Draft', 'Inactive'].includes(row.status) && <Action title="Activate leave policy" onClick={() => onActivate(row)}><FiCheck /></Action>}</Actions></td></tr>)}</DataTable>
  if (tab === 'Leave Balances') return <DataTable headers={['Employee ID', 'Employee', 'Faculty Type', 'Department', 'Applicable Policy', 'Entitled', 'Used', 'Pending', 'Available', 'Action']}>{rows.map(({ employee, policy }) => {
    if (!employee) return null
    const { totals } = getBalance(employee, policy)
    return <tr key={employee.id}><td>{employee.employeeId || employee.id}</td><td><Employee employee={employee} /></td><td>{typeOf(employee)}</td><td>{employee.department || '—'}</td><td>{policy ? policy.name : <span className="flm-unassigned">Not Assigned</span>}</td>{['entitled', 'used', 'pending', 'available'].map(key => <td key={key}>{totals[key] ?? 0}</td>)}<td><Actions><Action title="View leave balance" onClick={() => onView({ employee, policy })}><FiEye /></Action></Actions></td></tr>
  })}</DataTable>
  return <DataTable headers={['Request ID', 'Employee', 'Faculty Type', 'Department', 'Leave Type', 'Duration', 'Days', 'Applied On', 'Status', 'Action']}>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td><Employee employee={row.employee || {}} /></td><td>{typeOf(row.employee)}</td><td>{row.employee?.department || '—'}</td><td>{leaveTypes.find(type => type.id === row.typeId)?.name || row.leaveTypeName || 'Unavailable'}</td><td>{range(row.from, row.to)}</td><td>{row.days ?? 1}</td><td>{dateLabel(row.applied)}</td><td><Status value={row.status} /></td><td><Actions><Action title="View request" onClick={() => onView(row)}><FiEye /></Action>{row.status === 'Pending' && <><Action title="Approve request" onClick={() => onDecision(row, 'Approved')}><FiCheck /></Action><Action title="Reject request" onClick={() => onDecision(row, 'Rejected')}><FiX /></Action></>}</Actions></td></tr>)}</DataTable>
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
  const policyEntitlements = item.entitlements || []

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
            <><Info title="Applicable Policy" rows={[['Not Assigned', 'No active leave policy is applicable to this employee.']]} /><BalanceTable employee={employee} policy={null} leaveTypes={leaveTypes} getBalance={getBalance} /></>
          )}
        </>
      ) : isPolicy ? (
        <>
          <h2>{item.name} <Status value={item.status} /></h2>
          <Info title="Policy Information" rows={[['Academic Year', item.academicYear], ['Applicable To', item.applicableTo], ['Branch Scope', item.departments?.length ? item.departments.join(', ') : 'All Branches'], ['Effective Period', range(item.from, item.to)]]} />
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
                {(() => {
                  const displayRules = policyEntitlements.length > 0
                    ? policyEntitlements
                    : leaveTypes.filter(type => type.status === 'Active').map(type => ({
                        typeId: type.id,
                        name: type.name,
                        code: type.code,
                        payCategory: type.payCategory,
                        entitlement: 12,
                        maxDays: '—',
                        carryForward: false,
                        documentRequired: false
                      }))
                  if (!displayRules.length) {
                    return <tr><td colSpan={7}>No leave entitlements are configured for this policy.</td></tr>
                  }
                  return displayRules.map(rule => {
                    const leaveType = leaveTypes.find(type => String(type.id) === String(rule.typeId))
                    return (
                      <tr key={rule.typeId || rule.name}>
                        <td>{leaveType?.name || rule.name || 'Unavailable'}</td>
                        <td>{leaveType?.code || rule.code || '—'}</td>
                        <td>{leaveType?.payCategory || rule.payCategory || 'Paid Leave'}</td>
                        <td>{rule.entitlement ?? 12}</td>
                        <td>{rule.maxDays != null && rule.maxDays !== '' ? rule.maxDays : '—'}</td>
                        <td>{rule.carryForward ? 'Yes' : 'No'}</td>
                        <td>{rule.documentRequired ? 'Yes' : 'No'}</td>
                      </tr>
                    )
                  })
                })()}
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
          <Info title="Request Information" rows={[['Request ID', item.id], ['Leave Type', leaveTypes.find(type => type.id === item.typeId)?.name || item.leaveTypeName || 'Unavailable'], ['Applied On', dateLabel(item.applied)], ['Policy', policies.find(policy => policy.id === item.policyId)?.name || 'Not Assigned']]} />
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
    ? item.entitlements.map(e => ({ ...e, typeId: String(e.typeId || e.leaveTypeId || '') }))
    : leaveTypes.filter(type => type.status === 'Active').map(type => ({
        typeId: type.id,
        entitlement: '',
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
    entitlements: current.entitlements.some(rule => String(rule.typeId) === String(type.id))
      ? current.entitlements.filter(rule => String(rule.typeId) !== String(type.id))
      : [...current.entitlements, { typeId: String(type.id), entitlement: '', maxDays: '', carryForward: false, maxCarryForward: '', documentRequired: false }]
  }))
  return (
    <Modal title={item.id ? 'Edit Leave Policy' : 'Create Leave Policy'} onClose={onClose}>
      <Form>
        <Input label="Policy Name *" value={data.name} onChange={value => setData({ ...data, name: value })} />
        <label>
          <span>Academic Year <b className="required-mark">*</b></span>
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
      <div className="flm-table-wrap" style={{ margin: '10px 0 15px', border: '1px solid var(--flm-line)', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="flm-dialog-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>Enable</th>
              <th>Leave Type</th>
              <th style={{ width: '120px' }}>Entitled (Days)</th>
              <th style={{ width: '120px' }}>Max / Request</th>
              <th style={{ width: '100px' }}>Carry Forward</th>
              <th style={{ width: '110px' }}>Document</th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes.filter(type => type.status === 'Active').map(type => {
              const rule = data.entitlements.find(value => String(value.typeId) === String(type.id))
              const isEnabled = Boolean(rule)
              return (
                <tr key={type.id} style={{ background: isEnabled ? 'transparent' : 'var(--flm-soft)' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={isEnabled} onChange={() => toggle(type)} />
                  </td>
                  <td>
                    <strong>{type.name}</strong> <small style={{ color: 'var(--text-muted)' }}>({type.code || type.payCategory})</small>
                  </td>
                  <td>
                    {isEnabled ? (
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 12"
                        value={rule.entitlement ?? ''}
                        style={{ width: '100%', height: '32px', padding: '0 8px', border: '1px solid var(--border-strong)', borderRadius: '5px' }}
                        onChange={event => setData({
                          ...data,
                          entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, entitlement: event.target.value === '' ? '' : Number(event.target.value) } : value)
                        })}
                      />
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {isEnabled ? (
                      <input
                        type="number"
                        min="0"
                        placeholder="Max days"
                        value={rule.maxDays ?? ''}
                        style={{ width: '100%', height: '32px', padding: '0 8px', border: '1px solid var(--border-strong)', borderRadius: '5px' }}
                        onChange={event => setData({
                          ...data,
                          entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, maxDays: event.target.value === '' ? '' : Number(event.target.value) } : value)
                        })}
                      />
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {isEnabled ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(rule.carryForward)}
                          onChange={event => setData({
                            ...data,
                            entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, carryForward: event.target.checked } : value)
                          })}
                        />
                        <span>Yes</span>
                      </label>
                    ) : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                  </td>
                  <td>
                    {isEnabled ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(rule.documentRequired)}
                          onChange={event => setData({
                            ...data,
                            entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, documentRequired: event.target.checked } : value)
                          })}
                        />
                        <span>Required</span>
                      </label>
                    ) : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
    facultyId: '',
    leaveTypeId: '',
    policyId: '',
    fromDate: '',
    toDate: '',
    days: '',
    reason: ''
  })
  const [error, setError] = useState('')
  const selectedFaculty = faculty.find(f => String(f.id) === String(data.facultyId))
  const availableLeaveTypes = selectedFaculty ? eligibleLeaveTypes(leaveTypes, selectedFaculty) : []

  useEffect(() => {
    if (!data.leaveTypeId) return
    if (availableLeaveTypes.some(type => String(type.id) === String(data.leaveTypeId))) return
    setData(current => ({ ...current, leaveTypeId: '' }))
  }, [data.facultyId, data.leaveTypeId, availableLeaveTypes])

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
          <span>Faculty Member <b className="required-mark">*</b></span>
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
          <span>Leave Type <b className="required-mark">*</b></span>
          <select value={data.leaveTypeId} onChange={e => setData({ ...data, leaveTypeId: e.target.value })}>
            <option value="">Select Leave Type</option>
            {availableLeaveTypes.map(t => (
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
          <span>Reason <b className="required-mark">*</b></span>
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
function DecisionDialog({ request, status, onClose, onSave }) { const [reason, setReason] = useState(''); const reject = status === 'Rejected'; return <Modal title={reject ? 'Reject Leave Request' : 'Approve Leave Request?'} onClose={onClose}>{reject && <label><span>Reason for Rejection <b className="required-mark">*</b></span><textarea value={reason} onChange={event => setReason(event.target.value)} /></label>}<Footer><button onClick={onClose}>Cancel</button><button className={reject ? 'reject-action' : 'approve-action'} disabled={reject && reason.trim().length < 3} onClick={() => onSave(request, status, reason)}>Confirm</button></Footer></Modal> }
function BalanceTable({ employee, policy, leaveTypes, getBalance }) {
  const balance = getBalance(employee, policy)
  const rules = leaveBalanceRules(balance, policy, leaveTypes).filter(rule => {
    const leaveType = leaveTypes.find(type => String(type.id) === String(rule.typeId)) || rule
    return !genderRestrictedLeave(leaveType) || String(employee?.gender || '').trim().toLowerCase() === genderRestrictedLeave(leaveType)
  })

  return (
    <section className="flm-view-section">
      <Info title="Balance Totals" rows={['entitled', 'used', 'pending', 'available'].map(key => [key[0].toUpperCase() + key.slice(1), balance.totals[key] ?? 'Not provided'])} />
      <h3>Leave Type Balances</h3>
      {!balance.details.length && <p>The API has not provided a breakdown by leave type.</p>}
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
            const typeName = typeInfo?.name || rule.leaveTypeName || rule.name || rule.typeId
            // A missing type-level balance means no usage was supplied by the
            // API. Render a consistent zero balance instead of ambiguous ?.
            const entitled = totals?.entitled ?? rule.entitlement ?? 0
            const used = totals?.used ?? 0
            const pending = totals?.pending ?? 0
            const available = totals?.available ?? Math.max(0, Number(entitled) - Number(used) - Number(pending))
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
function View({ title, children, onClose }) {
  return (
    <div className="flm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="flm-view-dialog shared-view-dialog" role="dialog" aria-modal="true" style={{ maxWidth: '860px' }}>
        <header className="shared-view-dialog__header">
          <div className="shared-view-dialog__heading">
            <div className="shared-view-dialog__icon-badge">
              <FiBriefcase />
            </div>
            <div>
              <h2 className="shared-view-dialog__title">{title}</h2>
              <p className="shared-view-dialog__subtitle">Faculty Leave Management & Records</p>
            </div>
          </div>
          <div className="shared-view-dialog__actions">
            <button type="button" className="shared-view-dialog__close-btn" aria-label="Close" title="Close" onClick={onClose}>
              <FiX size={18} />
            </button>
          </div>
        </header>
        <div className="shared-view-dialog__body flm-view-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {children}
        </div>
      </section>
    </div>
  )
}

function Identity({ employee, status }) {
  return (
    <div className="view-modal-banner">
      <div className="view-modal-avatar">
        {initials(employee?.fullName)}
      </div>
      <div className="view-modal-header-info">
        <div className="view-modal-badges">
          {employee?.employeeId && <span className="view-modal-badge">{employee.employeeId}</span>}
          {typeOf(employee) && <span className="view-modal-badge">{typeOf(employee)}</span>}
          {status && <span className={`view-modal-badge-status ${status === 'Approved' ? 'active' : status === 'Pending' ? 'warning' : 'inactive'}`}>{status}</span>}
        </div>
        <h1 className="view-modal-title">{employee?.fullName}</h1>
        <p className="view-modal-subtitle">{employee?.designation || 'Faculty'} · {branchOf(employee)}</p>
      </div>
    </div>
  )
}
function Info({ title, rows, columns = 2 }) { return <section className="flm-view-section"><h3>{title}</h3><div className={`flm-info-grid flm-info-grid--${columns}`}>{rows.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></section> }
function DataTable({ headers, children }) { return <div className="flm-table-wrap"><table className="flm-table"><thead><tr>{headers.map(header => { const label = header === 'Department' ? 'Branch' : header; return <th key={label}>{label}</th> })}</tr></thead><tbody>{children}</tbody></table></div> }
function Employee({ employee }) { return <div className="flm-employee"><span>{initials(employee.fullName)}</span><div><strong>{employee.fullName}</strong><small>{employee.employeeId}</small></div></div> }
function Actions({ children }) { return <div className="flm-actions">{children}</div> }
function Action({ title, children, onClick }) { return <button type="button" title={title} aria-label={title} onClick={onClick}>{children}</button> }
function Status({ value }) { return <span className={`flm-status ${statusClass(value)}`}>{value}</span> }
const renderFlmLabel = label => {
  if (typeof label === 'string' && label.endsWith(' *')) {
    return <>{label.slice(0, -2)} <b className="required-mark" aria-hidden="true">*</b></>
  }
  if (typeof label === 'string' && label.endsWith('*')) {
    return <>{label.slice(0, -1).trim()} <b className="required-mark" aria-hidden="true">*</b></>
  }
  return label
}
function FilterSelect({ label, value, values, onChange }) { const displayLabel = label === 'Department' ? 'Branch' : label; const plural = displayLabel === 'Branch' ? 'Branches' : `${displayLabel}s`; return <label className="flm-filter-field"><span>{displayLabel}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">All {plural}</option>{values.map(item => <option key={item}>{item}</option>)}</select></label> }
function Select({ label, value, values, onChange }) { return <label><span>{renderFlmLabel(label)}</span><select value={value} onChange={event => onChange(event.target.value)}>{values.map(item => <option key={item}>{item}</option>)}</select></label> }
function Modal({ title, children, onClose }) { return <div className="flm-overlay"><section className="flm-decision-dialog flm-config-dialog" role="dialog" aria-modal="true"><button className="flm-close" aria-label="Close" onClick={onClose}><FiX /></button><p className="flm-eyebrow">FACULTY LEAVE</p><h2>{title}</h2>{children}</section></div> }
function Form({ children }) { return <div className="flm-config-form">{children}</div> }
function Input({ label, type = 'text', value, onChange }) { return <label><span>{renderFlmLabel(label)}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} /></label> }
function Footer({ children }) { return <footer>{children}</footer> }
