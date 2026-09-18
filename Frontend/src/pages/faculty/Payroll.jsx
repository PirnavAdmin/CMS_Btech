import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiEye, FiFilter, FiSearch, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import TablePagination from '../../components/TablePagination'
import { facultyPayrollApi } from '../../api/apiEndpoints'
import { normalizePayroll } from '../../services/facultyContracts'
import { newestFirst } from '../../utils/newestFirst'
import { downloadServerExport } from '../../utils/exportUtils'
import './Payroll.css'

const PAGE_SIZE = 5
const monthLabel = value => value ? new Date(`${value}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Select payroll month'
const money = value => value == null ? '?' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
const statusClass = value => String(value || 'Draft').toLowerCase().replace(/\s+/g, '-')
export default function Payroll() {
  const [tab, setTab] = useState('Payroll Processing'), [month, setMonth] = useState(new Date().toISOString().slice(0, 7)), [query, setQuery] = useState(''), [filters, setFilters] = useState({ type: '', department: '', status: '' }), [showFilters, setShowFilters] = useState(false), [page, setPage] = useState(1), [selected, setSelected] = useState(null), [hold, setHold] = useState(false), [holdReason, setHoldReason] = useState('')
  const [payroll, setPayroll] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const requestVersion = useRef(0), holdLock = useRef(false)
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true); setError('')
    try {
      const fetchRows = tab === 'Salary Records' ? facultyPayrollApi.getSalaryRecords : tab === 'Payslips' ? facultyPayrollApi.getPayslips : facultyPayrollApi.getAll
      const data = await fetchRows({ month })
      if (version === requestVersion.current) setPayroll(newestFirst('payroll', data.map(normalizePayroll)))
    } catch (reason) { if (version === requestVersion.current) { setPayroll([]); setError(reason.message) } }
    finally { if (version === requestVersion.current) setLoading(false) }
  }, [month, tab])
  useEffect(() => { load(); return () => { requestVersion.current++ } }, [load])
  const departments = [...new Set(payroll.map(item => item.department).filter(Boolean))]
  const rows = useMemo(() => payroll.filter(row => (!query || (row.employeeId + ' ' + row.fullName + ' ' + row.department).toLowerCase().includes(query.toLowerCase())) && (!filters.type || row.type === filters.type) && (!filters.department || row.department === filters.department) && (!filters.status || row.status === filters.status)), [payroll, query, filters])
  const view = async row => {
    // A new faculty member can have a draft processing row before a separate
    // payroll detail record exists. The row itself is enough for View.
    setError('')
    setSelected(normalizePayroll(row))
    setHoldReason('')
    try {
      const detail = await facultyPayrollApi.getById(row.id)
      setSelected(normalizePayroll({ ...row, ...detail }))
    } catch {
      // Keep the list row open when the optional detail record is unavailable.
    }
  }
  const placeHold = async event => {
    event.preventDefault(); if (!holdReason.trim() || holdLock.current) return
    holdLock.current = true; setBusy(true); setError('')
    try { await facultyPayrollApi.hold(selected.id, holdReason.trim()); setHold(false); setSelected(null); await load() }
    catch (reason) { setError(reason.message) }
    finally { holdLock.current = false; setBusy(false) }
  }
  const download = async () => { setBusy(true); setError(''); try { downloadServerExport(await facultyPayrollApi.export({ month }), 'faculty-payroll-' + month) } catch (reason) { setError(reason.message) } finally { setBusy(false) } }
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)), currentPage = Math.min(page, totalPages), visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const updateFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const clear = () => { setQuery(''); setFilters({ type: '', department: '', status: '' }); setPage(1) }
  const columns = [['employeeId', 'Employee ID'], ['fullName', 'Employee'], ['type', 'Type'], ['department', 'Department'], ['working', 'Working Days'], ['present', 'Present'], ['paidLeave', 'Paid Leave'], ['lop', 'LOP'], ['status', 'Status']].map(([value, label]) => ({ label, value }))
  const processed = rows.filter(row => row.status === 'Processed').length, onHold = rows.filter(row => row.status === 'Hold').length, lop = rows.reduce((sum, row) => sum + row.lop, 0)
  const title = tab === 'Payroll Processing' ? 'Payroll Processing' : tab
  const emptyText = tab === 'Payroll Processing' ? `No payroll records found for ${monthLabel(month)}.` : tab === 'Salary Records' ? 'No salary records found.' : 'No payslips found for the selected filters.'
  return <DashboardLayout><main className="faculty-payroll">{error && <p className="flm-error" role="alert">{error} <button onClick={load}>Retry</button></p>}<header className="fp-header"><div><p>HOME / FACULTY / PAYROLL</p><h1>Faculty Payroll</h1><span>Process faculty salaries using attendance, leave and payroll data.</span></div><div className="fp-summary">{[['Total Employees', rows.length], ['Processed', processed], ['On Hold', onHold], ['LOP Days', lop]].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header><section className="fp-card"><header><div><p>{title.toUpperCase()}</p><h2>{tab === 'Payroll Processing' ? monthLabel(month) : title}</h2></div><button type="button" className="export-button" disabled={busy || loading} onClick={download}>Export Payroll</button></header><nav>{['Payroll Processing', 'Salary Records', 'Payslips'].map(item => <button type="button" className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setPage(1) }} key={item}>{item}</button>)}</nav><div className="fp-tools"><label><FiSearch /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search employee..." /></label><button type="button" className="fp-filter-button" onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button></div>{showFilters && <div className="fp-filters"><label>Payroll Month<input type="month" value={month} onChange={event => { setMonth(event.target.value); setPage(1) }} /></label><label>Faculty Type<select value={filters.type} onChange={event => updateFilter('type', event.target.value)}><option value="">All Faculty</option><option>Teaching</option><option>Non-Teaching</option></select></label><label>Department<select value={filters.department} onChange={event => updateFilter('department', event.target.value)}><option value="">All Departments</option>{departments.map(item => <option key={item}>{item}</option>)}</select></label>{tab !== 'Payslips' && <label>Payroll Status<select value={filters.status} onChange={event => updateFilter('status', event.target.value)}><option value="">All Statuses</option>{['Draft', 'Processed', 'Paid', 'Hold'].map(item => <option key={item}>{item}</option>)}</select></label>}<button type="button" onClick={clear}>Clear Filters</button></div>}<div className="fp-table">{loading ? <p className="fp-empty" role="status">Loading payroll records?</p> : rows.length ? <table><thead><tr>{(tab === 'Payroll Processing' ? ['Employee ID', 'Employee', 'Type', 'Department', 'Working Days', 'Present', 'Paid Leave', 'LOP', 'Gross Salary', 'Deductions', 'Net Salary', 'Status', 'Action'] : ['Payroll Month', 'Employee ID', 'Employee', 'Type', 'Department', 'Gross Salary', 'Deductions', 'Net Salary', 'Status', 'Action']).map(item => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id}>{tab !== 'Payroll Processing' && <td>{monthLabel(month)}</td>}<td>{row.employeeId}</td><td><strong>{row.fullName}</strong><small>{row.designation}</small></td><td>{row.type}</td><td>{row.department}</td>{tab === 'Payroll Processing' && <><td>{row.working}</td><td>{row.present}</td><td>{row.paidLeave}</td><td><span className={row.lop ? 'fp-lop' : ''}>{row.lop}</span></td></>}<td>{money(row.grossSalary)}</td><td>{money(row.deductions)}</td><td>{money(row.netSalary)}</td><td><span className={`fp-status ${statusClass(row.status)}`}>{row.status}</span></td><td><button type="button" title="View payroll details" aria-label={`View payroll for ${row.fullName}`} onClick={() => view(row)}><FiEye /></button></td></tr>)}</tbody></table> : <p className="fp-empty">{emptyText}</p>}</div>{rows.length > PAGE_SIZE && <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />}</section>{selected && <div className="fp-overlay"><section className="fp-dialog" role="dialog" aria-modal="true" aria-label="Payroll details"><button className="fp-close" type="button" aria-label="Close payroll details" onClick={() => setSelected(null)}><FiX /></button><p>PAYROLL DETAILS</p><h2>{selected.fullName}</h2><span>{selected.employeeId} · {selected.designation} · {selected.department} · {selected.type}</span><b className={`fp-status ${statusClass(selected.status)}`}>{selected.status}</b><h3>Payroll Period</h3><dl><div><dt>Payroll Month</dt><dd>{monthLabel(month)}</dd></div><div><dt>Working Days</dt><dd>{selected.working}</dd></div></dl><h3>Attendance Summary</h3><dl className="fp-attendance-summary">{[['Present', selected.present, 'present'], ['Late', selected.late, 'late'], ['Half Day', selected.halfDay, 'half-day'], ['Paid Leave', selected.paidLeave, 'leave'], ['LOP Days', selected.lop, 'lop']].map(([label, value, tone]) => <div className={tone} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><h3>Salary Structure</h3><dl><div><dt>Gross Salary</dt><dd>{money(selected.grossSalary)}</dd></div><div><dt>Deductions</dt><dd>{money(selected.deductions)}</dd></div><div><dt>Net Salary</dt><dd>{money(selected.netSalary)}</dd></div></dl>{selected.status === 'Draft' && <footer><button type="button" onClick={() => setHold(true)}>Hold</button></footer>}</section></div>}{hold && selected && <div className="fp-overlay"><form className="fp-dialog fp-hold" onSubmit={placeHold}><h2>Place Payroll on Hold</h2><p>{selected.fullName} · {monthLabel(month)}</p><label>Reason *<textarea value={holdReason} onChange={event => setHoldReason(event.target.value)} required /></label><footer><button type="button" onClick={() => setHold(false)}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Saving?' : 'Place on Hold'}</button></footer></form></div>}</main></DashboardLayout>
}
