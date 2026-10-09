import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { FiRefreshCw } from 'react-icons/fi'
import { feeCollectionApi } from '../../api/apiEndpoints'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'
import { printSingleRecord } from '../../utils/exportUtils'
import { showError, showSuccess } from '../../utils/toast'
import { cents, feeLedger, feeMoney, feeToday, rupees } from './feeStructureService'
import { FeeBadge, FeeDialog, FeeInput, FeeSelect, FeeStats, FeeTable } from './FeeStructureWizard'

const modes = [{ id: 'CASH', name: 'Cash' }, { id: 'UPI', name: 'UPI' }, { id: 'CARD', name: 'Card' }, { id: 'BANK_TRANSFER', name: 'Bank Transfer' }, { id: 'CHEQUE', name: 'Cheque' }]
const masterOptions = (rows, type) => (rows || []).map(r => ({ ...r, id: String(r[`${type}Id`] ?? r.id), name: r[`${type}Name`] || r.name }))
const date = value => value ? String(value).slice(0, 10) : '—'
const baseColumns = [{ label: 'Student ID', key: 'studentCode' }, { label: 'Student Name', key: 'studentName' }]
const historyColumns = [{ label: 'Receipt No', key: 'receiptNumber' }, { label: 'Student', render: r => <>{r.studentName}<small>{r.studentCode}</small></> }, { label: 'Date', render: r => date(r.paymentDate) }, { label: 'Payment Mode', key: 'paymentMode' }, { label: 'Transaction ID', key: 'transactionReference' }, { label: 'Payment Code', key: 'paymentCode' }, { label: 'Amount', align: 'right', render: r => feeMoney(r.totalAmount) }]
const pendingColumns = [...baseColumns, { label: 'Course / Branch', render: r => <>{r.courseName}<small>{r.branchName}</small></> }, { label: 'Component', key: 'feeCategory' }, { label: 'Installment', key: 'installmentNumber' }, { label: 'Due Date', render: r => date(r.dueDate) }, { label: 'Fee Payable', align: 'right', render: r => feeMoney(r.payableAmount) }, { label: 'Paid', align: 'right', render: r => feeMoney(r.paidAmount) }, { label: 'Balance', align: 'right', render: r => feeMoney(r.balanceAmount) }, { label: 'Status', render: r => <FeeBadge value={r.overdue ? 'Overdue' : r.paidAmount > 0 ? 'Partially Paid' : 'Pending'} /> }]
function serverDueAmounts(row) {
  return { outstanding: Math.max(0, cents(row.payableAmount) - cents(row.paidAmount)), overdue: row.overdue ? cents(row.balanceAmount) : 0, penalty: cents(row.finePending), total: cents(row.balanceAmount) }
}
const duesColumns = [
  { label: 'Student', render: r => <>{r.studentName}<small>{r.feeCategory} · {r.feeCode} · Installment {r.installmentNumber}</small></> },
  { label: 'Student ID', key: 'studentCode' },
  { label: 'Outstanding', align: 'right', render: r => feeMoney(rupees(serverDueAmounts(r).outstanding)) },
  { label: 'Overdue', align: 'right', render: r => feeMoney(rupees(serverDueAmounts(r).overdue)) },
  { label: 'Days Overdue', key: 'daysOverdue' },
  { label: 'Penalty', align: 'right', render: r => feeMoney(rupees(serverDueAmounts(r).penalty)) },
  { label: 'Total Due', align: 'right', render: r => feeMoney(rupees(serverDueAmounts(r).total)) },
  { label: 'Status', render: r => <FeeBadge value={r.overdue ? 'Overdue' : r.paidAmount > 0 ? 'Partially Paid' : 'Pending'} /> },
]
const duesExportColumns = [
  { label: 'Student', value: 'studentName' }, { label: 'Student ID', value: 'studentCode' },
  { label: 'Fee Code', value: 'feeCode' }, { label: 'Component', value: 'feeCategory' }, { label: 'Installment', value: 'installmentNumber' },
  ...[['Outstanding', 'outstanding'], ['Overdue', 'overdue'], ['Penalty', 'penalty'], ['Total Due', 'total']].map(([label, key]) => ({ label, value: row => rupees(serverDueAmounts(row)[key]) })),
  { label: 'Days Overdue', value: 'daysOverdue' }, { label: 'Status', value: r => r.overdue ? 'Overdue' : r.paidAmount > 0 ? 'Partially Paid' : 'Pending' },
]

export default function ServerFeeCollection(props) {
  return props.page === 'reports' && !props.overview ? <FeeReports academic={props.academic} configuration={props.configuration} reportHeaderSlot={props.reportHeaderSlot} /> : <FinancialWorkspace key={`${props.page}:${props.academic.selectedCollegeId}`} {...props} />
}

function FinancialWorkspace({ page: screen, academic, overview = false, academicYearId, configuration }) {
  const { state: routeState } = useLocation()
  const [filters, setFilters] = useState({ academicYearId: routeState?.academicYearId ?? academic.selectedAcademicYearId ?? '', courseId: '', branchId: '', semesterId: '', search: routeState?.studentSearch || '', paymentMode: '', fromDate: '', toDate: '', overdueOnly: routeState?.overdueOnly || false }), [page, setPage] = useState(1), [query, setQuery] = useState(routeState?.studentSearch || ''), [tab, setTab] = useState('pending')
  const [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [refresh, setRefresh] = useState(0), [payment, setPayment] = useState(null), [receipt, setReceipt] = useState(null), [fine, setFine] = useState(null)
  const [moreFilters, setMoreFilters] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(null)
  const [busy, setBusy] = useState(false), locked = useRef(false), generation = useRef(0)
  useEffect(() => { const timer = setTimeout(() => setFilters(f => ({ ...f, search: query })), 300); return () => clearTimeout(timer) }, [query])
  useEffect(() => setFilters(f => ({ ...f, academicYearId: routeState?.academicYearId ?? academic.selectedAcademicYearId ?? '' })), [academic.selectedAcademicYearId, routeState?.academicYearId])
  useEffect(() => { if (overview) setFilters(f => ({ ...f, academicYearId: academicYearId ?? academic.selectedAcademicYearId ?? '' })) }, [overview, academicYearId, academic.selectedAcademicYearId])
  const filterKey = JSON.stringify(filters)
  useEffect(() => setPage(1), [filterKey, screen, tab])
  useEffect(() => {
    const token = ++generation.current
    setLoading(true); setError(''); setResult(null)
    const academicQuery = { academicYearId: filters.academicYearId, courseId: filters.courseId, branchId: filters.branchId, semesterId: filters.semesterId }
    const request = screen === 'reports' ? feeCollectionApi.dashboard({ ...academicQuery, fromDate: filters.fromDate, toDate: filters.toDate }) : screen === 'receipts' ? feeCollectionApi.history({ search: filters.search, paymentMode: filters.paymentMode, fromDate: filters.fromDate, toDate: filters.toDate, page, pageSize: 10 }) : screen === 'dues' && tab === 'fines' ? feeCollectionApi.fines({ page, pageSize: 10 }) : feeCollectionApi.pending({ ...academicQuery, search: filters.search, overdueOnly: filters.overdueOnly, page, pageSize: 10 })
    request.then(data => { if (token === generation.current) { if (!data) throw new Error('Fee data could not be loaded.'); setResult(data) } }).catch(e => { if (token === generation.current) setError(e.message) }).finally(() => { if (token === generation.current) setLoading(false) })
    return () => { generation.current++ }
  }, [filterKey, page, screen, tab, refresh, academic.selectedCollegeId]) // scalar filterKey keeps requests stable
  const mutate = async work => { if (locked.current) return; locked.current = true; setBusy(true); try { await work() } catch (e) { showError(e.message) } finally { locked.current = false; setBusy(false) } }
  const openReceipt = id => mutate(async () => { const data = await feeCollectionApi.receipt(id); if (!data) throw new Error('Receipt not found.'); setPaymentSuccess(null); setReceipt(data) })
  const update = change => setFilters(f => ({ ...f, ...change }))
  const isFines = screen === 'dues' && tab === 'fines', rows = result?.items || []
  const columns = screen === 'receipts' ? [...historyColumns, { label: 'Actions', render: r => <button disabled={busy} onClick={() => openReceipt(r.receiptId)}>View / Print</button> }] : isFines ? [...baseColumns, { label: 'Fine', key: 'fineCode' }, { label: 'Reason', key: 'reason' }, { label: 'Assessed', render: r => feeMoney(r.amount) }, { label: 'Waived', render: r => feeMoney(r.waivedAmount) }, { label: 'Pending', render: r => feeMoney(r.pendingAmount) }, { label: 'Status', render: r => <FeeBadge value={r.status} /> }, { label: 'Actions', render: r => <button disabled={busy || !r.pendingAmount} onClick={() => setFine({ mode: 'waive', row: r })}>Waive</button> }] : [...(screen === 'dues' ? duesColumns : pendingColumns), { label: 'Actions', render: r => screen === 'collection' ? <button className="primary" disabled={busy || Number(r.balanceAmount) <= 0} onClick={() => setPayment(r)}>Collect</button> : <button disabled={busy} onClick={() => setFine({ mode: 'create', row: r })}>Assess Fine</button> }]
  return <>
    {screen === 'receipts' && <CollectionDailySummary collegeId={academic.selectedCollegeId} refresh={refresh} />}
    {screen === 'dues' && <div className="fm-toolbar"><button className={tab === 'pending' ? 'primary' : ''} onClick={() => setTab('pending')}>Dues</button><button className={tab === 'fines' ? 'primary' : ''} onClick={() => setTab('fines')}>Assessed Fines</button></div>}
    {!overview && <div className="fm-filter-toolbar" role="group" aria-label="Fee filters">
      <div className="fm-filter-row">
        {screen !== 'receipts' && !isFines && <>
          <FeeSelect label="Academic Year" value={filters.academicYearId} options={[{ id: '', name: 'All years' }, ...masterOptions(academic.academicYears, 'academicYear')]} onChange={academicYearId => update({ academicYearId })} />
          <FeeSelect label="Course" value={filters.courseId} options={[{ id: '', name: 'All courses' }, ...masterOptions(academic.courses, 'course')]} onChange={courseId => update({ courseId, branchId: '', semesterId: '' })} />
          <FeeSelect label="Branch" value={filters.branchId} options={[{ id: '', name: 'All branches' }, ...masterOptions(academic.branches, 'branch').filter(b => !filters.courseId || String(b.courseId) === filters.courseId)]} onChange={branchId => update({ branchId, semesterId: '' })} />
          <FeeSelect label="Semester" value={filters.semesterId} options={[{ id: '', name: 'All semesters' }, ...masterOptions(academic.semesters, 'semester').filter(s => (!filters.courseId || String(s.courseId) === filters.courseId) && (!filters.branchId || !s.branchId || String(s.branchId) === filters.branchId))]} onChange={semesterId => update({ semesterId })} />
        </>}
        {screen !== 'reports' && !isFines && <FeeInput label={screen === 'receipts' ? 'Search Transactions' : 'Search Student'} value={query} onChange={setQuery} placeholder={screen === 'receipts' ? 'Student, receipt or payment code' : 'Name or student ID'} />}
        {screen === 'receipts' && <FeeSelect label="Payment Mode" value={filters.paymentMode} options={[{ id: '', name: 'All modes' }, ...modes]} onChange={paymentMode => update({ paymentMode })} />}
        <div className="fm-filter-actions">
          {['reports', 'receipts'].includes(screen) && <button aria-expanded={moreFilters} onClick={() => setMoreFilters(v => !v)}>More Filters{filters.fromDate || filters.toDate ? ' (active)' : ''}</button>}
          <button disabled={loading} onClick={() => setRefresh(n => n + 1)}><FiRefreshCw /> Refresh</button>
        </div>
      </div>
      {['reports', 'receipts'].includes(screen) && moreFilters && <div className="fm-filter-extra">
        <FeeInput label="From Date" type="date" value={filters.fromDate} onChange={fromDate => update({ fromDate })} />
        <FeeInput label="To Date" type="date" min={filters.fromDate} value={filters.toDate} onChange={toDate => update({ toDate })} />
      </div>}
    </div>}
    {screen === 'dues' && !isFines && <label className="fm-checks fm-pad"><input type="checkbox" checked={filters.overdueOnly} onChange={e => update({ overdueOnly: e.target.checked })} />Overdue only</label>}
    {loading ? <FinanceSkeleton /> : error ? <div role="alert" className="fm-error">{error}<button onClick={() => setRefresh(n => n + 1)}>Retry</button></div> : screen === 'reports' ? <ServerDashboard data={result} configuration={configuration} filters={filters} refresh={refresh} collegeId={academic.selectedCollegeId} openReceipt={openReceipt} busy={busy} onRefresh={() => setRefresh(n => n + 1)} /> : <section className="fm-panel"><header><h2>{screen === 'receipts' ? 'Recent Collections' : isFines ? 'Assessed Fines' : 'Student Fee Dues'}</h2><span>{result?.totalCount || 0} records</span><ExportMenu rows={rows} columns={screen === 'receipts' ? [{ label: 'Receipt', value: 'receiptNumber' }, { label: 'Student', value: 'studentName' }, { label: 'Date', value: 'paymentDate' }, { label: 'Amount', align: 'right', value: 'totalAmount' }] : screen === 'dues' && !isFines ? duesExportColumns : [{ label: 'Student', value: 'studentName' }, { label: 'Code', value: 'studentCode' }, { label: 'Amount', align: 'right', value: isFines ? 'pendingAmount' : 'balanceAmount' }]} title={`Fee ${screen}`} filename={`server-fees-${screen}`} scope="Current page" /></header><FeeTable pageSize={10} rows={rows} rowKey={r => r.paymentId ?? r.fineId ?? r.studentFeeId} columns={columns} empty="No matching fee records." /><TablePagination currentPage={page} totalPages={result?.totalPages || 0} onPageChange={setPage} /></section>}
    {payment && <ServerPayment row={payment} busy={busy} close={() => { if (!busy) setPayment(null) }} submit={form => mutate(async () => {
      const response = await feeCollectionApi.collect(form)
      setPayment(null); setRefresh(n => n + 1)
      if (!response?.receiptId) { showError('Payment response is incomplete. Check Receipts before collecting again.'); return }
      setPaymentSuccess(response); showSuccess(`Payment collected. Receipt ${response.receiptNumber}.`)
      try { const data = await feeCollectionApi.receipt(response.receiptId); if (!data) throw new Error('Receipt unavailable.'); setReceipt(data) } catch { showError('Payment succeeded. Receipt could not be loaded; open it from Receipts. Do not collect again.') }
    })} />}
    {receipt && <ServerReceipt data={receipt} successful={paymentSuccess?.receiptId === receipt.receiptId} close={() => setReceipt(null)} />}
    {fine && <FineForm config={fine} busy={busy} close={() => { if (!busy) setFine(null) }} submit={form => mutate(async () => { if (fine.mode === 'create') await feeCollectionApi.createFine(form); else await feeCollectionApi.waiveFine(fine.row.fineId, form); setFine(null); setRefresh(n => n + 1); showSuccess('Fine updated on server.') })} />}
  </>
}
function FinanceSkeleton() {
  return <div className="fm-skeleton" role="status" aria-label="Loading financial data"><div /><div /><div /><span className="fm-sr-only">Loading financial data...</span></div>
}
function CollectionDailySummary({ collegeId, refresh }) {
  const [result, setResult] = useState(null), [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setResult(null); setError('')
    feeCollectionApi.dashboard({ fromDate: feeToday(), toDate: feeToday() }).then(data => { if (!data) throw new Error('Could not load today’s collection summary.'); if (active) setResult(data) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [collegeId, refresh])
  return error ? <p className="fm-error" role="alert">{error}</p> : !result ? <FinanceSkeleton /> : <div className="fm-transaction-summary"><div><span>Today's Collection</span><strong>{feeMoney(result.totalCollected)}</strong></div><div><span>Transactions Today</span><strong>{result.paymentsCount}</strong></div><div><span>Receipts Today</span><strong>{result.receiptsCount}</strong></div><small>All academic years · Posted payments only</small></div>
}
const reportTypes = [
  { id: 'summary', name: 'Collection Summary' }, { id: 'outstanding', name: 'Outstanding Analysis' },
  { id: 'overdue', name: 'Overdue Analysis' }, { id: 'category', name: 'Fee Category Analysis' },
  { id: 'mode', name: 'Payment Mode Analysis' }, { id: 'concessions', name: 'Scholarship & Concession (device-local)' },
  { id: 'refunds', name: 'Refund Analysis (device-local)' }, { id: 'ledger', name: 'Student Ledger (device-local)' },
]
const reportDefaults = academicYearId => ({ type: 'summary', academicYearId: academicYearId || '', courseId: '', branchId: '', semesterId: '', fromDate: '', toDate: '', status: '', search: '', sort: 'name' })
function FeeReports({ academic, configuration, reportHeaderSlot }) {
  const [draft, setDraft] = useState(() => reportDefaults(academic.selectedAcademicYearId)), [applied, setApplied] = useState(() => reportDefaults(academic.selectedAcademicYearId))
  const [result, setResult] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [page, setPage] = useState(1), [retry, setRetry] = useState(0)
  const key = JSON.stringify(applied), collegeId = academic.selectedCollegeId
  useEffect(() => {
    const initial = reportDefaults(academic.selectedAcademicYearId)
    setDraft(initial); setApplied(initial); setPage(1)
  }, [academic.selectedAcademicYearId, collegeId])
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setResult(null)
    const f = JSON.parse(key), local = ['concessions', 'refunds', 'ledger'].includes(f.type), pending = ['outstanding', 'overdue'].includes(f.type)
    const scope = { academicYearId: f.academicYearId, courseId: f.courseId, branchId: f.branchId, semesterId: f.semesterId }
    const request = local ? Promise.resolve({ local: true }) : pending
      ? feeCollectionApi.pending({ ...scope, dueFrom: f.fromDate, dueTo: f.toDate, overdueOnly: f.type === 'overdue', search: f.search, page, pageSize: 10 })
      : feeCollectionApi.dashboard({ ...scope, fromDate: f.fromDate, toDate: f.toDate })
    request.then(data => { if (!data) throw new Error('No report data was returned.'); if (active) setResult(data) }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [key, page, retry, collegeId])
  const pending = ['outstanding', 'overdue'].includes(applied.type), local = ['concessions', 'refunds', 'ledger'].includes(applied.type)
  const draftLocal = ['concessions', 'refunds'].includes(draft.type), draftPending = ['outstanding', 'overdue'].includes(draft.type)
  const update = values => setDraft(f => ({ ...f, ...values }))
  const title = reportTypes.find(r => r.id === applied.type)?.name
  let rows = [], columns = [], exportColumns = [], chart = []
  const amountColumn = (label, key) => ({ label, align: 'right', render: r => feeMoney(r[key]) })
  if (result && applied.type === 'ledger') {
    rows = (configuration?.assignments || []).filter(a => !['academicYearId', 'courseId', 'branchId', 'semesterId'].some(k => applied[k] && String(a.structure[k]) !== String(applied[k]))).map(a => {
      const ledger = feeLedger(configuration, a)
      return { id: a.id, name: a.student.name, studentCode: a.student.code, roll: a.student.roll, original: rupees(ledger.total), concession: rupees(ledger.concession), payable: rupees(ledger.total - ledger.concession), paid: rupees(ledger.paid), balance: rupees(ledger.outstanding) }
    })
    columns = [{ label: 'Student', render: r => <Link to={`/fees/ledger/${r.id}`}>{r.name}</Link> }, { label: 'Roll No.', key: 'roll' }, amountColumn('Original Fee', 'original'), amountColumn('Concession', 'concession'), amountColumn('Net Payable', 'payable'), amountColumn('Paid', 'paid'), amountColumn('Outstanding', 'balance')]
    exportColumns = ['name', 'studentCode', 'roll', 'original', 'concession', 'payable', 'paid', 'balance'].map((value, i) => ({ label: ['Student', 'Student ID', 'Roll No.', 'Original Fee', 'Concession', 'Net Payable', 'Paid', 'Outstanding'][i], value }))
  } else if (result && local) {
    rows = (configuration?.[applied.type] || []).flatMap(r => {
      const assignment = configuration.assignments.find(a => a.id === r.assignmentId)
      if (!assignment || ['academicYearId', 'courseId', 'branchId', 'semesterId'].some(k => applied[k] && String(assignment.structure[k]) !== String(applied[k]))) return []
      const issued = date(r.at)
      if ((applied.fromDate && issued < applied.fromDate) || (applied.toDate && issued > applied.toDate) || (applied.status && r.status !== applied.status)) return []
      return [{ id: r.id, name: assignment.student.name, studentCode: assignment.student.code, date: issued, type: r.type, reason: r.reason, value: r.value, unit: r.unit || 'Amount', approvedAmount: r.status === 'Approved' ? Number(r.amount) / 100 : null, status: r.status, assignmentId: assignment.id }]
    })
    columns = [{ label: 'Student', render: r => <Link to={`/fees/ledger/${r.assignmentId}`}>{r.name}</Link> }, { label: 'Student ID', key: 'studentCode' }, { label: 'Date', key: 'date' }, { label: 'Request Value', render: r => r.unit === 'Percentage' ? `${r.value}%` : feeMoney(r.value) }, { label: 'Approved Amount', render: r => r.approvedAmount === null ? '—' : feeMoney(r.approvedAmount) }, { label: 'Reason', key: 'reason' }, { label: 'Status', render: r => <FeeBadge value={r.status} /> }]
    exportColumns = ['name', 'studentCode', 'date', 'value', 'unit', 'approvedAmount', 'reason', 'status'].map((value, i) => ({ label: ['Student', 'Student ID', 'Date', 'Request Value', 'Unit', 'Approved Amount', 'Reason', 'Status'][i], value }))
  } else if (result && pending) {
    rows = (result.items || []).map(r => ({ ...r, name: r.studentName, id: r.studentFeeId }))
    columns = pendingColumns
    exportColumns = ['studentName', 'studentCode', 'courseName', 'branchName', 'feeCategory', 'dueDate', 'payableAmount', 'paidAmount', 'balanceAmount', 'overdue'].map((value, i) => ({ label: ['Student', 'Student ID', 'Program', 'Branch', 'Category', 'Due Date', 'Payable', 'Paid', 'Outstanding', 'Overdue'][i], value }))
  } else if (result && applied.type === 'mode') {
    rows = (result.byPaymentMode || []).map(r => ({ ...r, id: r.paymentMode, name: r.paymentMode }))
    columns = [{ label: 'Payment Mode', key: 'name' }, { label: 'Transactions', key: 'paymentCount' }, amountColumn('Collected', 'amount')]
    exportColumns = [{ label: 'Payment Mode', value: 'name' }, { label: 'Transactions', value: 'paymentCount' }, { label: 'Collected', value: 'amount' }]
    chart = rows.map(r => ({ name: r.name, amount: r.amount }))
  } else if (result) {
    rows = (result.byCategory || []).map(r => ({ ...r, id: r.feeCategoryId, name: r.categoryName }))
    columns = [{ label: 'Fee Category', key: 'name' }, amountColumn('Assigned', 'assigned'), amountColumn('Collected', 'collected'), amountColumn('Outstanding', 'pending')]
    exportColumns = [{ label: 'Fee Category', value: 'name' }, { label: 'Assigned', value: 'assigned' }, { label: 'Collected', value: 'collected' }, { label: 'Outstanding', value: 'pending' }]
    if (applied.type === 'summary') {
      const months = new Map()
      for (const r of result.collectionTrend || []) { const month = date(r.date).slice(0, 7), previous = months.get(month) || { amount: 0, paymentCount: 0 }; months.set(month, { amount: previous.amount + Number(r.amount), paymentCount: previous.paymentCount + Number(r.paymentCount) }) }
      chart = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([name, totals]) => ({ id: name, name, ...totals }))
      rows = chart
      columns = [{ label: 'Month', key: 'name' }, { label: 'Transactions', key: 'paymentCount' }, amountColumn('Collected', 'amount')]
      exportColumns = [{ label: 'Month', value: 'name' }, { label: 'Transactions', value: 'paymentCount' }, { label: 'Collected', value: 'amount' }]
    } else chart = rows.map(r => ({ name: r.name, amount: r.collected }))
  }
  const [search, setSearch] = useState(''), [sort, setSort] = useState('name')
  const visible = rows.filter(r => `${r.name} ${r.studentCode || ''} ${r.reason || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'amount' ? Number(b.amount ?? b.balanceAmount ?? b.balance ?? b.collected ?? b.approvedAmount ?? 0) - Number(a.amount ?? a.balanceAmount ?? a.balance ?? a.collected ?? a.approvedAmount ?? 0) : a.name.localeCompare(b.name))
  const apply = () => {
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) { showError('From date must not be after To date.'); return }
    setApplied({ ...draft }); setPage(1); setSearch(''); setSort('name'); setRetry(n => n + 1)
  }
  const exportControl = <ExportMenu rows={visible} columns={exportColumns} loading={loading} title={title} filename={`fee-report-${applied.type}`} scope={`${pending ? 'Current page, filtered and sorted' : 'Filtered report rows'} · ${applied.fromDate || 'All dates'} to ${applied.toDate || 'Present'}`} />
  return <div className="fm-report-workspace">
    {reportHeaderSlot && createPortal(exportControl, reportHeaderSlot)}
    <section className="fm-panel fm-report-filter-panel" aria-label="Report builder"><header><h2>Report Builder</h2><span>Select one report and apply its filters</span></header><div className="fm-report-filter-grid">
      <FeeSelect label="Report" value={draft.type} options={reportTypes} onChange={type => update({ type, academicYearId: ['mode', 'category'].includes(type) ? '' : academic.selectedAcademicYearId || '', courseId: '', branchId: '', semesterId: '', fromDate: '', toDate: '', status: '', search: '' })} />
      {!['mode', 'category'].includes(draft.type) && <>
      <FeeSelect label="Academic Year" value={draft.academicYearId} options={[{ id: '', name: 'All years' }, ...masterOptions(academic.academicYears, 'academicYear')]} onChange={academicYearId => update({ academicYearId })} />
      <FeeSelect label="Program" value={draft.courseId} options={[{ id: '', name: 'All programs' }, ...masterOptions(academic.courses, 'course')]} onChange={courseId => update({ courseId, branchId: '', semesterId: '' })} />
      <FeeSelect label="Branch" value={draft.branchId} options={[{ id: '', name: 'All branches' }, ...masterOptions(academic.branches, 'branch').filter(r => !draft.courseId || String(r.courseId) === String(draft.courseId))]} onChange={branchId => update({ branchId, semesterId: '' })} />
      <FeeSelect label="Semester" value={draft.semesterId} options={[{ id: '', name: 'All semesters' }, ...masterOptions(academic.semesters, 'semester').filter(r => (!draft.courseId || String(r.courseId) === String(draft.courseId)) && (!draft.branchId || !r.branchId || String(r.branchId) === String(draft.branchId)))]} onChange={semesterId => update({ semesterId })} />
      </>}
      {!['category', 'ledger'].includes(draft.type) && <>
      <FeeInput label={`${draftPending ? 'Due' : draftLocal ? 'Request' : 'Payment'} From`} type="date" value={draft.fromDate} onChange={fromDate => update({ fromDate })} />
      <FeeInput label={`${draftPending ? 'Due' : draftLocal ? 'Request' : 'Payment'} To`} type="date" min={draft.fromDate} value={draft.toDate} onChange={toDate => update({ toDate })} />
      </>}
      {draftPending && <FeeInput label="Student / Code" value={draft.search} onChange={search => update({ search })} />}
      {draftLocal && <FeeSelect label="Request Status" value={draft.status} options={[{ id: '', name: 'All statuses' }, ...['Draft', 'Submitted', 'Approved', 'Rejected'].map(id => ({ id, name: id }))]} onChange={status => update({ status })} />}
      <div className="fm-filter-actions"><button disabled={loading} className="primary" onClick={apply}>Apply Filters</button><button onClick={() => { const f = reportDefaults(academic.selectedAcademicYearId); setDraft(f); setApplied(f); setPage(1); setSearch(''); setSort('name'); setRetry(n => n + 1) }}>Reset</button></div>
    </div></section>
    {loading ? <FinanceSkeleton /> : error ? <p className="fm-error" role="alert">{error}<button onClick={() => setRetry(n => n + 1)}>Retry</button></p> : result && <><div className="fm-report-result-header"><div><h2>{title}</h2><p>{applied.fromDate || 'All dates'} – {applied.toDate || 'Present'} · {masterOptions(academic.academicYears, 'academicYear').find(r => r.id === applied.academicYearId)?.name || 'All years'} · {masterOptions(academic.courses, 'course').find(r => r.id === applied.courseId)?.name || 'All programs'} · {masterOptions(academic.branches, 'branch').find(r => r.id === applied.branchId)?.name || 'All branches'}</p></div>{!reportHeaderSlot && exportControl}</div>
      {local ? <p className="fm-notice">Device-local records only. These figures are not combined with posted institutional accounts.</p> : pending ? <p className="fm-muted">{result.totalCount} matching dues · Paginated results · Search and sort below apply to the current page.</p> : <div className="fm-analytics-metrics">{(applied.type === 'summary' ? [['Gross Receivable', result.totalAssigned], ['Concessions', result.totalConcession], ['Net Receivable', result.totalPayable], ['Collected', result.totalCollected], ['Outstanding', result.totalPending], ['Collection Rate', result.totalPayable > 0 ? `${(result.totalCollected / result.totalPayable * 100).toFixed(1)}%` : '0.0%']] : applied.type === 'mode' ? [['Payment Modes', String(rows.length)], ['Transactions', String(rows.reduce((n, r) => n + Number(r.paymentCount), 0))], ['Collected', rows.reduce((n, r) => n + Number(r.amount), 0)]] : [['Fee Categories', String(rows.length)], ['Assigned', rows.reduce((n, r) => n + Number(r.assigned), 0)], ['Collected', rows.reduce((n, r) => n + Number(r.collected), 0)], ['Outstanding', rows.reduce((n, r) => n + Number(r.pending), 0)]]).map(([label, amount]) => <div key={label}><span>{label}</span><strong>{typeof amount === 'string' ? amount : feeMoney(amount)}</strong></div>)}<p className="fm-muted">{applied.type === 'category' ? 'Institution-wide category totals across all dates and academic periods.' : applied.type === 'mode' ? 'Payment modes across all academic periods, filtered by payment dates.' : 'Academic filters apply to headline receivables. Monthly collections are institution-wide. Payment dates filter collections; receivables and outstanding are current balances.'}</p></div>}
      {!!chart.length && <section className="fm-panel"><header><h2>{applied.type === 'summary' ? 'Collection by Month' : applied.type === 'mode' ? 'Collection by Payment Mode' : 'Collection by Fee Category'}</h2><span>Institution-wide</span></header><div className="fm-report-bars">{chart.map((r, i) => <div key={i}><span>{r.name}</span><progress aria-label={`${r.name}: ${feeMoney(r.amount)}`} max={Math.max(1, ...chart.map(r => r.amount))} value={Math.max(0, r.amount)} /><strong>{feeMoney(r.amount)}</strong></div>)}</div></section>}
      <section className="fm-panel"><header><h2>Detailed Results</h2><span>{visible.length} rows shown</span></header><div className="fm-toolbar fm-pad"><FeeInput label={pending ? 'Search current page' : 'Search results'} value={search} onChange={setSearch} placeholder="Student, category or mode" /><FeeSelect label="Sort" value={sort} options={[{ id: 'name', name: 'Name (A–Z)' }, { id: 'amount', name: 'Amount (highest first)' }]} onChange={setSort} /></div><FeeTable rows={visible} columns={columns} pageSize={10} empty={search ? 'No matching search results.' : 'No data for the selected report filters.'} />{pending && <TablePagination currentPage={page} totalPages={result.totalPages || 0} onPageChange={setPage} />}</section>
    </>}
  </div>
}
function ServerDashboard({ data: d, filters, refresh, collegeId, openReceipt, busy, configuration, onRefresh }) {
  if (!d) return null
  const percentage = d.totalPayable > 0 ? (d.totalCollected / d.totalPayable * 100).toFixed(1) : '0.0'
  const stats = [['Total Receivable', d.totalPayable, 'Net assigned fees'], ['Collected', d.totalCollected, `${percentage}% collected`], ['Outstanding', d.totalPending, `${d.studentsWithPending} students · college-wide`], ['Overdue', d.totalOverdue, `${d.studentsOverdue} students · college-wide`]]
  return <><div className="fs-kpis fm-overview-stats" role="group" aria-label="Financial snapshot">{stats.map(([label, amount, note]) => <article key={label}><div><span>{label}</span><strong>{feeMoney(amount)}</strong><small>{note}</small></div></article>)}</div>
    <section className="fm-panel fm-progress-panel"><div><h2>Collection Progress</h2><span>Collected <strong>{feeMoney(d.totalCollected)}</strong></span><span>Outstanding <strong>{feeMoney(d.totalPending)}</strong></span></div><progress aria-label="Collection progress" max="100" value={Math.min(100, Math.max(0, Number(percentage)))} /><small>{percentage}% collected · Collection target {feeMoney(d.totalPayable)}</small></section>
    <div className="fm-dashboard-grid fm-command-charts">
      <OperationalTrend rows={d.collectionTrend || []} />
      <section className="fm-panel"><header><h2>Fee Status</h2><span>Receivable balance</span></header><div className="fm-status-summary"><div><span>Collected</span><strong>{feeMoney(d.totalCollected)}</strong></div><div className="fm-balance-segments" role="img" aria-label={`${percentage}% collected; ${feeMoney(d.totalOverdue)} overdue`}><i style={{ flex: Math.max(0, d.totalCollected) }} /><i style={{ flex: Math.max(0, d.totalPending - d.totalOverdue) }} /><i style={{ flex: Math.max(0, d.totalOverdue) }} /></div><div><span>Outstanding, not overdue</span><strong>{feeMoney(Math.max(0, d.totalPending - d.totalOverdue))}</strong></div><div><span>Overdue</span><strong>{feeMoney(d.totalOverdue)}</strong></div><p className="fm-muted">Student payment-status distribution is not available. These figures represent balances, not student counts.</p></div></section>
    </div>
    <OverviewActivity filters={filters} refresh={refresh} collegeId={collegeId} openReceipt={openReceipt} busy={busy} dashboard={d} configuration={configuration} onRefresh={onRefresh} />
  </>
}
function OperationalTrend({ rows }) {
  const [period, setPeriod] = useState('30')
  const today = feeToday(), cutoff = new Date(`${today}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - (Number(period) - 1))
  const daily = new Map(rows.map(r => [date(r.date), r]))
  const visible = period === 'year' ? [...rows].sort((a, b) => date(a.date).localeCompare(date(b.date))) : Array.from({ length: Number(period) }, (_, i) => {
    const day = new Date(cutoff); day.setUTCDate(day.getUTCDate() + i)
    const key = day.toISOString().slice(0, 10)
    return daily.get(key) || { date: key, amount: 0 }
  })
  const max = Math.max(1, ...visible.map(r => Number(r.amount)))
  const points = (visible.some(r => Number(r.amount) !== 0) ? visible : []).map((r, i) => ({ ...r, x: visible.length === 1 ? 320 : 48 + i / (visible.length - 1) * 544, y: 142 - Number(r.amount) / max * 110 }))
  const line = points.map(r => `${r.x},${r.y}`).join(' ')
  return <section className="fm-panel"><header><h2>Collection Trend</h2><div className="fm-segmented" aria-label="Trend period">{[['7', '7 Days'], ['30', '30 Days'], ['year', 'All Dates']].map(([key, label]) => <button key={key} aria-pressed={period === key} onClick={() => setPeriod(key)}>{label}</button>)}</div></header><div className="fm-trend">{points.length ? <><svg viewBox="0 0 640 180" role="img" aria-label={`Collection trend: ${visible.map(r => `${date(r.date)} ${feeMoney(r.amount)}`).join('; ')}`}><line x1="48" y1="142" x2="592" y2="142" className="fm-chart-axis" /><polygon points={`${points[0].x},142 ${line} ${points.at(-1).x},142`} className="fm-chart-area" /><polyline points={line} className="fm-chart-line" />{points.map((r, i) => <circle key={i} cx={r.x} cy={r.y} r="3"><title>{date(r.date)}: {feeMoney(r.amount)}</title></circle>)}<text x="48" y="168">{date(points[0].date)}</text><text x="592" y="168" textAnchor="end">{date(points.at(-1).date)}</text><text x="48" y="18">{feeMoney(max)}</text></svg><p className="fm-muted">Institution-wide daily collections · Hover a point for the amount</p></> : <p className="fm-muted fm-pad">No collections in this period.</p>}</div></section>
}
function OverviewActivity({ filters, refresh, collegeId, openReceipt, busy, dashboard, configuration, onRefresh }) {
  const [activity, setActivity] = useState(null)
  const { academicYearId, courseId, branchId, semesterId, fromDate, toDate } = filters
  useEffect(() => {
    let active = true
    Promise.allSettled([
      feeCollectionApi.history({ fromDate, toDate, page: 1, pageSize: 5 }),
      feeCollectionApi.pending({ academicYearId, courseId, branchId, semesterId, page: 1, pageSize: 5 }),
    ]).then(results => { if (active) setActivity(results) })
    return () => { active = false }
  }, [academicYearId, courseId, branchId, semesterId, fromDate, toDate, refresh, collegeId])
  const content = (index, columns, rowKey) => !activity ? <p className="fm-muted fm-pad" role="status">Loading...</p> : activity[index].status === 'rejected' ? <p className="fm-error" role="alert">Could not load records. Use Refresh to retry.</p> : <FeeTable rows={activity[index].value?.items || []} rowKey={rowKey} columns={columns} empty="No matching records." />
  const localPending = kind => (configuration?.[kind] || []).filter(r => r.status === 'Submitted' && configuration.assignments.some(a => a.id === r.assignmentId && (!academicYearId || String(a.structure.academicYearId) === String(academicYearId)))).length
  return <>
    <div className="fm-dashboard-grid">
      <section className="fm-panel"><header><h2>Action Required</h2><button onClick={onRefresh}><FiRefreshCw /> Refresh</button></header>
        <div className="fm-attention-list">
          <Link to="/fees/dues" state={{ academicYearId: '', overdueOnly: true }}><FeeBadge value="Overdue" /><span>{dashboard.studentsOverdue} students have overdue fees</span><strong>{feeMoney(dashboard.totalOverdue)}</strong></Link>
          <Link to="/fees/concessions"><FeeBadge value="Pending" /><span>{localPending('concessions')} concession requests awaiting approval</span></Link>
          <Link to="/fees/refunds"><FeeBadge value="Pending" /><span>{localPending('refunds')} refund requests awaiting approval</span></Link>
          <small className="fm-muted">Concession and refund requests are saved on this device; they are not posted financial records.</small>
        </div>
      </section>
      <section className="fm-panel"><header><h2>Upcoming / Overdue Due Dates</h2><Link to="/fees/dues" state={{ academicYearId }}>View Dues →</Link></header>
        <p className="fm-scope-caption">First five matching fee dues; open View Dues for the full list.</p>
        {content(1, [{ label: 'Student / Installment', render: r => <>{r.studentName}<small>{r.feeCategory} · Installment {r.installmentNumber}</small></> }, { label: 'Due', render: r => date(r.dueDate) }, { label: 'Balance', align: 'right', render: r => feeMoney(r.balanceAmount) }, { label: 'Status', render: r => <FeeBadge value={r.overdue ? 'Overdue' : 'Upcoming'} /> }], r => r.studentFeeId)}
      </section>
    </div>
    <section className="fm-panel"><header><h2>Recent Collections</h2><Link to="/fees/receipts">View All →</Link></header>
      <p className="fm-scope-caption">Latest five payments across all academic years.</p>
      {content(0, [{ label: 'Student', render: r => <>{r.studentName}<small>{r.studentCode}</small></> }, { label: 'Receipt', render: r => <button disabled={busy} onClick={() => openReceipt(r.receiptId)}>{r.receiptNumber}</button> }, { label: 'Mode', key: 'paymentMode' }, { label: 'Amount', align: 'right', render: r => feeMoney(r.totalAmount) }, { label: 'Time / Date', key: 'paymentDate' }], r => r.paymentId)}
    </section>
  </>
}
function ServerPayment({ row, close, submit, busy }) {
  const [form, set] = useState({ studentFeeId: row.studentFeeId, feeAmount: '', fineAmount: 0, paymentMode: 'CASH', transactionReference: '', remarks: '', paymentDate: feeToday() }), [error, setError] = useState(''), [confirm, setConfirm] = useState(false), [fines, setFines] = useState([]), [fineError, setFineError] = useState('')
  useEffect(() => { let active = true; feeCollectionApi.fines({ studentFeeId: row.studentFeeId, pendingOnly: true, pageSize: 100 }).then(r => { if (active) setFines(r?.items || []) }).catch(e => { if (active) setFineError(e.message) }); return () => { active = false } }, [row.studentFeeId])
  const validate = () => {
    const fee = Number(form.feeAmount), fine = Number(form.fineAmount)
    if (!Number.isFinite(fee) || fee <= 0 || cents(fee) > serverDueAmounts(row).outstanding || Math.abs(fee * 100 - cents(fee)) > 0.00001) return 'Payment must be positive, have at most two decimal places, and not exceed fee balance.'
    if (!Number.isFinite(fine) || fine < 0 || (fine > 0 && (!form.fineId || cents(fine) > cents(fines.find(f => String(f.fineId) === String(form.fineId))?.pendingAmount))) || Math.abs(fine * 100 - cents(fine)) > 0.00001) return 'Select a fine and enter no more than its pending balance.'
    if (form.paymentMode !== 'CASH' && !form.transactionReference.trim()) return 'Transaction reference is required for non-cash payments.'
    if (!form.paymentDate || form.paymentDate > feeToday()) return 'Select a payment date that is not in the future.'
    return ''
  }
  return <FeeDialog title={confirm ? 'Confirm Payment' : 'Collect Fee Payment'} close={close} footer={<><button disabled={busy} onClick={confirm ? () => setConfirm(false) : close}>{confirm ? 'Back' : 'Cancel'}</button><button disabled={busy} className="primary" onClick={() => { const issue = validate(); setError(issue); if (issue) return; if (!confirm) { setConfirm(true); return } submit({ ...form, feeAmount: Number(form.feeAmount), fineAmount: Number(form.fineAmount), fineId: form.fineId ? Number(form.fineId) : null }) }}>{busy ? 'Collecting…' : confirm ? 'Confirm & Collect Payment' : 'Review Payment'}</button></>}><div className="fs-editor-body">{error && <p role="alert" className="fm-error">{error}</p>}<p><strong>{row.studentName}</strong> · {row.studentCode} · {row.feeCategory} · Installment {row.installmentNumber}</p><p className="fm-muted">Due {date(row.dueDate)} · {row.courseName} / {row.branchName}</p><FeeStats items={[[ 'Fee Payable', feeMoney(row.payableAmount)], ['Paid', feeMoney(row.paidAmount)], ['Outstanding', feeMoney(row.balanceAmount)], ['Overdue', feeMoney(row.overdue ? row.balanceAmount : 0)]]} />{confirm ? <><p>Collect <strong>{feeMoney(Number(form.feeAmount) + Number(form.fineAmount))}</strong> by {form.paymentMode} on {form.paymentDate}.</p><p>Reference: {form.transactionReference || 'Cash payment'}</p><p>This records a payment in the institution's accounts and generates a receipt.</p></> : <div className="fs-grid"><FeeInput label="Amount Being Paid *" value={form.feeAmount} type="number" min="0.01" max={rupees(serverDueAmounts(row).outstanding)} step="0.01" onChange={feeAmount => set({ ...form, feeAmount })} /><FeeSelect label="Payment Mode" value={form.paymentMode} options={modes} onChange={paymentMode => set({ ...form, paymentMode })} /><FeeInput label="Payment Date *" type="date" max={feeToday()} value={form.paymentDate} onChange={paymentDate => set({ ...form, paymentDate })} /><FeeInput label="Transaction Reference" value={form.transactionReference} maxLength={150} onChange={transactionReference => set({ ...form, transactionReference })} /><FeeInput label="Remarks" value={form.remarks} maxLength={500} onChange={remarks => set({ ...form, remarks })} /><FeeSelect label="Assessed Fine (optional)" value={form.fineId || ''} options={[{ id: '', name: 'No fine payment' }, ...fines.map(f => ({ id: String(f.fineId), name: `${f.fineCode} · Pending ${feeMoney(f.pendingAmount)}` }))]} onChange={fineId => set({ ...form, fineId, fineAmount: 0 })} />{form.fineId && <FeeInput label="Fine Amount" type="number" min="0" step="0.01" value={form.fineAmount} onChange={fineAmount => set({ ...form, fineAmount })} />}</div>}{fineError && <p role="alert" className="fm-error">Could not load fines: {fineError}</p>}<p className="fm-muted">Online Gateway is unavailable. Cash, UPI, Card, Bank Transfer and Cheque are supported. If submission fails, check Receipts before retrying.</p></div></FeeDialog>
}
function FineForm({ config, close, submit, busy }) {
  const waive = config.mode === 'waive', [amount, setAmount] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('')
  return <FeeDialog title={waive ? 'Waive Fine' : 'Assess Fine'} close={close} footer={<><button disabled={busy} onClick={close}>Cancel</button><button disabled={busy} className="primary" onClick={() => { if (!reason.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Math.abs(Number(amount) * 100 - cents(amount)) > 0.00001 || (waive && cents(amount) > cents(config.row.pendingAmount))) { setError('Enter a reason and a positive amount within the pending fine balance.'); return } submit(waive ? { waivedAmount: Number(amount), reason } : { studentFeeId: config.row.studentFeeId, amount: Number(amount), reason, fineType: 'LATE_PAYMENT', assessedOn: feeToday() }) }}>{busy ? 'Saving…' : 'Confirm'}</button></>}><div className="fs-editor-body"><p>{config.row.studentName} · {config.row.feeCode}</p>{error && <p role="alert" className="fm-error">{error}</p>}<div className="fs-grid"><FeeInput label="Amount *" type="number" step="0.01" min="0.01" value={amount} onChange={setAmount} /><FeeInput label="Reason *" value={reason} maxLength={500} onChange={setReason} /></div></div></FeeDialog>
}
function ServerReceipt({ data: r, close, successful = false }) {
  const rows = [['Receipt Number', r.receiptNumber], ['Student', r.studentName], ['Student ID', r.studentCode], ['Issued At', r.issuedAt], ['Component', r.feeCategory], ['Payment Mode', r.paymentMode], ['Transaction Reference', r.transactionReference || '—'], ['Fee Amount', feeMoney(r.feeAmount)], ['Fine Amount', feeMoney(r.fineAmount)], ['Total Amount', feeMoney(r.totalAmount)], ['Collected By', r.issuedByName || '—'], ['Remarks', r.remarks || '—']]
  return <FeeDialog title={successful ? 'Payment Successful' : `Receipt ${r.receiptNumber}`} close={close} footer={<><button onClick={close}>{successful ? 'Done' : 'Close'}</button><button className="primary" onClick={() => { try { printSingleRecord({ title: `Fee Receipt ${r.receiptNumber}`, sections: [{ title: 'Payment Details', rows }] }) } catch (e) { showError(e.message) } }}>Print / Save as PDF</button></>}><div className="fs-editor-body">{successful && <p className="fm-notice">Receipt {r.receiptNumber} · {feeMoney(r.totalAmount)} recorded successfully.</p>}<dl className="fs-preview">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></FeeDialog>
}
