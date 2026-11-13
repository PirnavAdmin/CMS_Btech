import { FiCreditCard, FiFileText, FiSearch, FiUsers } from 'react-icons/fi'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import FilterPanel from '../../components/FilterPanel'
import TablePagination from '../../components/TablePagination'
import { useAcademic } from '../../context/AcademicContext'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { facultyPayrollApi } from '../../api/apiEndpoints'
import ExportMenu from '../../components/ExportMenu'
import './PayrollWorkspace.css'
import facultyService from '../../services/facultyService'

const amount = value => value == null || value === '' || !Number.isFinite(Number(value)) ? 'Unavailable' : new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).format(Number(value))
const display = value => value == null || value === '' ? 'Unavailable' : String(value)
const monthNow = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}` }
export function payslipReleased(row, now = new Date()) {
  if (String(row.status || '').trim().toLowerCase() !== 'paid') return false
  const value = row.payDate ?? row.paymentDate ?? row.paidAt
  if (!value) return false
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(String(value) + 'T00:00:00') : new Date(value)
  return Number.isFinite(date.getTime()) && date <= now
}
const tabs = ['Payroll Processing','Salary Records','Payslips']
export default function PayrollWorkspace() {
  const { selectedCollegeId, scopeRecords } = useAcademic(), { canAction } = useScreenAccess()
  const [tab,setTab] = useState(tabs[0]), [month,setMonth] = useState(monthNow)
  const [records,setRecords] = useState([]), [loading,setLoading] = useState(false), [error,setError] = useState('')
  const [query,setQuery] = useState(''), [type,setType] = useState(''), [status,setStatus] = useState(''), [page,setPage] = useState(1)
  const [selected,setSelected] = useState(null), [hold,setHold] = useState(null), [reason,setReason] = useState(''), [busy,setBusy] = useState(false), [notice,setNotice] = useState('')
  const generation = useRef(0), lock = useRef(false)
  const canHold = canAction('/faculty/payroll','edit')
  const load = useCallback(async () => {
    const version = ++generation.current
    setError(''); setRecords([]); setSelected(null); setLoading(true)
    try {
      if (!selectedCollegeId) return
      const fetchRows = tab === 'Salary Records' ? facultyPayrollApi.getSalaryRecords : tab === 'Payslips' ? facultyPayrollApi.getPayslips : facultyPayrollApi.getAll
      const [rows,members] = await Promise.all([fetchRows({month,collegeId:selectedCollegeId}), facultyService.list()])
      // Payroll feeds omit college IDs. Associate only by actual faculty identity/code.
      const scopedMembers = scopeRecords(members)
      const scoped = rows.filter(row => scopedMembers.some(member => row.facultyId != null ? String(member.facultyId || member.id) === String(row.facultyId) : row.employeeId && String(member.facultyCode || member.employeeId) === String(row.employeeId)))
      if (version === generation.current) setRecords(scoped
        .filter(row => tab !== 'Payroll Processing' || row.payrollId != null)
        .filter(row => tab !== 'Payslips' || payslipReleased(row))
        .map(row => ({...row, payrollRecordId:tab === 'Payroll Processing' ? row.payrollId : row.payrollId ?? row.id})))
    } catch (failure) { if (version === generation.current) setError(failure.message || 'Payroll could not be loaded.') }
    finally { if (version === generation.current) setLoading(false) }
  }, [selectedCollegeId, scopeRecords, month, tab])
  useEffect(() => { const controller = new AbortController(); queueMicrotask(() => { if (!controller.signal.aborted) load() }); return () => controller.abort() }, [load])
  const rows = useMemo(() => records.filter(row => (!query || [row.fullName,row.employeeId,row.department].join(' ').toLowerCase().includes(query.toLowerCase())) && (!type || row.type === type) && (!status || row.status === status)), [records,query,type,status])
  const pages = Math.max(1,Math.ceil(rows.length/10)), current = Math.min(page,pages)
  const saveHold = async event => {
    event.preventDefault()
    if (!canHold || lock.current || !hold?.payrollRecordId || !reason.trim()) return
    lock.current = true; setBusy(true); setError('')
    try { await facultyPayrollApi.hold(hold.payrollRecordId,reason.trim()); setHold(null); setNotice('Payroll placed on hold.'); await load() }
    catch (failure) { setError(failure.message || 'Payroll hold failed.') }
    finally { lock.current=false;setBusy(false) }
  }
  const exportColumns = [{label:'Employee',value:'fullName'},{label:'Employee code',value:'employeeId'},{label:'Department',value:'department'},{label:'Status',value:'status'},...['grossSalary','deductions','netSalary'].map(key=>({label:key,value:row=>row[key] == null ? 'Unavailable' : row[key]}))]
  const details=[['Employee',selected?.fullName],['Employee code',selected?.employeeId],['Department',selected?.department],['Payroll month',selected?.payrollMonth || month],['Status',selected?.status],['Working days',selected?.working],['Present',selected?.present],['Paid leave',selected?.paidLeave],['LOP',selected?.lop],['Gross salary',amount(selected?.grossSalary)],['Deductions',amount(selected?.deductions)],['Net salary',amount(selected?.netSalary)],['Hold reason',selected?.holdReason]]
  return <DashboardLayout><main className="faculty-payroll">
    <PageHeader title="Faculty Payroll" subtitle="Review payroll, salary records and payslips." compactSummary={[{label:'Records',value:loading || error?'—':rows.length}]} />
    <nav className="payroll-navigation" aria-label="Payroll sections">
      {tabs.map((value, index) => {
        const Icon = [FiCreditCard, FiUsers, FiFileText][index]
        return <button key={value} type="button" aria-pressed={tab === value} onClick={() => { setTab(value); setPage(1) }}>
          <Icon aria-hidden="true" />{value}
        </button>
      })}
    </nav>
    <p className="payroll-notice" role="status">
      <FiFileText aria-hidden="true" />
      <span>{tab === 'Salary Records' ? 'Salary creation requires a backend save API. Existing salary records are shown below.' : tab === 'Payslips' ? 'Payslips are released only for paid records with a confirmed payment date that has arrived.' : 'Only saved payroll records are shown. Processing and payment actions require backend support.'}</span>
    </p>

    <section className="payroll-directory" aria-labelledby="payroll-directory-title">
      <header className="payroll-directory-heading">
        <h2 id="payroll-directory-title">{tab === 'Payroll Processing' ? 'Payroll Directory' : tab}</h2>
      </header>

      <label className="payroll-month">Payroll month<input type="month" aria-label="Payroll month" value={month} onChange={event=>{ if (event.target.value) { setMonth(event.target.value);setPage(1) } }} /></label>
      <FilterPanel
        className="payroll-filters"
        active={Boolean(type || status)}
        onClear={() => { setQuery(''); setType(''); setStatus(''); setPage(1) }}
        search={<label className="payroll-search">
          <FiSearch aria-hidden="true" />
          <input type="search" aria-label="Search payroll" placeholder="Search employee or department…" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} />
        </label>}
        leadingActions={<ExportMenu rows={rows} columns={exportColumns} screen="faculty-payroll" filename={`faculty-payroll-${month}`} title={`Faculty payroll ${month}`} scope="Filtered college records" />}
        filters={<>
          <label>Employee type<select value={type} onChange={event => { setType(event.target.value); setPage(1) }}>
            <option value="">All types</option><option>Teaching</option><option>Non-Teaching</option>
          </select></label>
          <label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>{['Draft','Processed','Paid','Hold'].map(value => <option key={value}>{value}</option>)}
          </select></label>
        </>}
      />

      {notice && <p className="payroll-feedback" role="status">{notice}</p>}
      {error && <p className="payroll-feedback" role="alert">{error} <button type="button" className="erp-btn erp-btn--secondary" onClick={load}>Retry payroll</button></p>}
      {!selectedCollegeId ? <p className="payroll-empty">Select a college to view payroll.</p>
        : loading ? <p className="payroll-empty" role="status">Loading payroll…</p>
        : rows.length ? <>
          <div className="payroll-table" role="region" aria-label="Payroll records" tabIndex={0}>
            <table>
              <thead><tr>{['Employee','Department','Working days','LOP','Gross','Deductions','Net salary','Status','Actions'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{rows.slice((current - 1) * 10, current * 10).map((row, index) => <tr key={row.payrollRecordId || row.employeeId || index}>
                <td><strong>{row.fullName}</strong><small>{row.employeeId}</small></td>
                <td>{display(row.department)}</td>
                <td>{display(row.working)}</td>
                <td>{display(row.lop)}</td>
                <td>{amount(row.grossSalary)}</td>
                <td>{amount(row.deductions)}</td>
                <td>{amount(row.netSalary)}</td>
                <td><span className="payroll-status">{display(row.status)}</span></td>
                <td><div className="payroll-row-actions">
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={() => setSelected(row)}>View payroll</button>
                  {tab === 'Payroll Processing' && canHold && row.payrollRecordId && <button type="button" className="erp-btn erp-btn--secondary" disabled={busy || row.status === 'Paid'} onClick={() => { setHold(row); setReason(row.holdReason || '') }}>Place hold</button>}
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
          {pages > 1 && <TablePagination page={current} totalPages={pages} onPageChange={setPage} />}
        </> : !error && <div className="payroll-empty">
          <FiUsers aria-hidden="true" />
          <h3>{query || type || status ? 'No matching records' : 'No payroll records'}</h3>
          <p>{query || type || status ? 'Try a different search or filter.' : tab === 'Payslips' ? 'No released payslips for this college and month. Payment must be confirmed and its date must have arrived.' : 'No payroll records returned for this college and month.'}</p>
        </div>}
    </section>
    {selected && <ViewDialog title="Payroll details" subtitle={selected.fullName} onClose={()=>setSelected(null)} showExport={false} footerActions={<button onClick={()=>window.print()}>Print / Save PDF</button>}><dl className="view-modal-fields">{details.map(([label,value])=><div className="view-modal-field" key={label}><dt className="view-modal-label">{label}</dt><dd className="view-modal-value">{display(value)}</dd></div>)}</dl></ViewDialog>}
    {hold && <ViewDialog title="Place payroll on hold" onClose={()=>setHold(null)} busy={busy} showExport={false} hideFooter><form className="payroll-hold-form" onSubmit={saveHold}><label>Hold reason<textarea required value={reason} onChange={event=>setReason(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<div className="payroll-row-actions"><button type="button" className="erp-btn erp-btn--secondary" disabled={busy} onClick={()=>setHold(null)}>Cancel</button><button type="submit" className="erp-btn erp-btn--primary" disabled={busy}>{busy?'Saving…':'Confirm hold'}</button></div></form></ViewDialog>}
  </main></DashboardLayout>
}
