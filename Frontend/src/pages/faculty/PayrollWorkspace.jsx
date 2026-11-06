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
import './FacultyManagement.css'
import facultyService from '../../services/facultyService'

const amount = value => value == null || value === '' || !Number.isFinite(Number(value)) ? 'Unavailable' : new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' }).format(Number(value))
const display = value => value == null || value === '' ? 'Unavailable' : String(value)
const monthNow = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}` }
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
      const [rows,members] = await Promise.all([fetchRows({month}), facultyService.list()])
      // Payroll feeds omit college IDs. Associate only by actual faculty identity/code.
      const scopedMembers = scopeRecords(members)
      const scoped = rows.filter(row => scopedMembers.some(member => row.facultyId != null ? String(member.facultyId || member.id) === String(row.facultyId) : row.employeeId && String(member.facultyCode || member.employeeId) === String(row.employeeId)))
      if (version === generation.current) setRecords(scoped.map(row => ({...row, payrollRecordId:tab === 'Payroll Processing' ? row.payrollId : row.payrollId ?? row.id})))
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
    <PageHeader title="Faculty Payroll" subtitle="Review payroll, salary records and payslips." compactSummary={[{label:'Records',value:loading?'—':rows.length}]} />
    <nav className="flm-tabs" aria-label="Payroll sections">{tabs.map(value=><button key={value} className={tab===value?'active':''} onClick={()=>{setTab(value);setPage(1)}}>{value}</button>)}</nav>
    <p role="status">Salary configuration, processing and marking payments require backend capabilities that are not available. These actions cannot be saved here.</p>
    <FilterPanel active={Boolean(type || status)} onClear={()=>{setQuery('');setType('');setStatus('');setPage(1)}} actions={<ExportMenu rows={rows} columns={exportColumns} screen="faculty-payroll" filename={`faculty-payroll-${month}`} title={`Faculty payroll ${month}`} scope="Filtered college records" />}>
      <label>Search payroll<input value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} /></label>
      <label>Payroll month<input type="month" required value={month} onChange={event=>{setMonth(event.target.value);setPage(1)}} /></label>
      <label>Employee type<select value={type} onChange={event=>{setType(event.target.value);setPage(1)}}><option value="">All types</option><option>Teaching</option><option>Non-Teaching</option></select></label>
      <label>Status<select value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}}><option value="">All statuses</option>{['Draft','Processed','Paid','Hold'].map(value=><option key={value}>{value}</option>)}</select></label>
    </FilterPanel>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error} <button onClick={load}>Retry payroll</button></p>}
    {!selectedCollegeId ? <p>Select a college to view payroll.</p> : loading ? <p role="status">Loading payroll…</p> : <div className="fp-table"><table ><thead><tr>{['Employee','Department','Working days','LOP','Gross','Deductions','Net salary','Status','Actions'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.slice((current-1)*10,current*10).map((row,index)=><tr key={row.payrollRecordId || row.employeeId || index}><td>{row.fullName}<small> {row.employeeId}</small></td><td>{display(row.department)}</td><td>{display(row.working)}</td><td>{display(row.lop)}</td><td>{amount(row.grossSalary)}</td><td>{amount(row.deductions)}</td><td>{amount(row.netSalary)}</td><td>{display(row.status)}</td><td><button onClick={()=>setSelected(row)}>View payroll</button>{canHold && row.payrollRecordId && <button disabled={busy || row.status==='Paid'} onClick={()=>{setHold(row);setReason(row.holdReason || '')}}>Place hold</button>}</td></tr>)}{!rows.length && <tr><td colSpan="9">No payroll records returned for this college and month.</td></tr>}</tbody></table></div>}
    <TablePagination page={current} totalPages={pages} onPageChange={setPage} />
    {selected && <ViewDialog title="Payroll details" subtitle={selected.fullName} onClose={()=>setSelected(null)} showExport={false} footerActions={<button onClick={()=>window.print()}>Print / Save PDF</button>}><dl className="view-modal-fields">{details.map(([label,value])=><div className="view-modal-field" key={label}><dt className="view-modal-label">{label}</dt><dd className="view-modal-value">{display(value)}</dd></div>)}</dl></ViewDialog>}
    {hold && <ViewDialog title="Place payroll on hold" onClose={()=>setHold(null)} busy={busy} showExport={false} hideFooter><form onSubmit={saveHold}><label>Hold reason<textarea required value={reason} onChange={event=>setReason(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<button type="button" disabled={busy} onClick={()=>setHold(null)}>Cancel</button><button disabled={busy}>{busy?'Saving…':'Confirm hold'}</button></form></ViewDialog>}
  </main></DashboardLayout>
}
