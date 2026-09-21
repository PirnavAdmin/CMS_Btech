import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCheck, FiPlus, FiChevronDown, FiChevronUp, FiDownload, FiEdit2, FiEye, FiFileText, FiFilter, FiPrinter, FiSearch, FiSlash, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import TablePagination from '../../components/TablePagination'
import { facultyPayrollApi, facultyAttendanceApi, facultyLeaveApi } from '../../api/apiEndpoints'
import facultyService from '../../services/facultyService'
import { normalizePayroll } from '../../services/facultyContracts'
import { newestFirst } from '../../utils/newestFirst'
import { downloadServerExport, printEntityDetails } from '../../utils/exportUtils'
import './Payroll.css'

const LOCAL_PAYROLL_STATUS_KEY = 'pirnav-faculty-local-payroll-status-v1'
const LOCAL_SALARY_STRUCTURE_KEY = 'pirnav-faculty-local-salary-structures-v1'
const LOCAL_ATTENDANCE_KEY = 'pirnav-faculty-local-attendance-v1'
const LOCAL_LEAVE_DECISIONS_KEY = 'pirnav-faculty-local-leave-decisions-v1'
const LOCAL_LEAVE_TYPES_KEY = 'pirnav-faculty-local-leave-types-v1'

const getLocalPayrollStatuses = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_PAYROLL_STATUS_KEY)) || {} } catch { return {} }
}

const getLocalAttendanceList = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY)) || [] } catch { return [] }
}

const getLocalLeaveDecisions = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_LEAVE_DECISIONS_KEY)) || {} } catch { return {} }
}

const getLocalLeaveTypes = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_LEAVE_TYPES_KEY)) || {} } catch { return {} }
}

const saveLocalPayrollStatus = (item, status, reason = '', currentMonth = '') => {
  try {
    const data = getLocalPayrollStatuses()
    const id = String(item.id || item.payrollId || '')
    const facId = String(item.facultyId || '')
    const empId = String(item.employeeId || '')
    const m = currentMonth || item.month || item.payrollMonth || new Date().toISOString().slice(0, 7)
    
    const entry = { status, reason, updatedAt: new Date().toISOString(), month: m }
    if (id) data[id] = entry
    if (facId) {
      data[facId] = entry
      data[`${m}_${facId}`] = entry
    }
    if (empId) {
      data[empId] = entry
      data[`${m}_${empId}`] = entry
    }
    localStorage.setItem(LOCAL_PAYROLL_STATUS_KEY, JSON.stringify(data))
  } catch {}
}

const getLocalSalaryStructures = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_SALARY_STRUCTURE_KEY)) || {} } catch { return {} }
}

const saveLocalSalaryStructure = (item, salaryData) => {
  try {
    const data = getLocalSalaryStructures()
    const facId = String(item.facultyId || item.id || '')
    const empId = String(item.employeeId || '')
    const entry = { ...salaryData, updatedAt: new Date().toISOString() }
    if (facId) data[facId] = entry
    if (empId) data[empId] = entry
    if (item.id) data[String(item.id)] = entry
    localStorage.setItem(LOCAL_SALARY_STRUCTURE_KEY, JSON.stringify(data))
  } catch {}
}

const calculateDefaultSalaryBreakdown = (designation, type) => {
  const isNonTeaching = String(type || '').toLowerCase().includes('non-teaching')
  const desig = String(designation || '').toLowerCase()
  if (isNonTeaching) return { basicSalary: 20000, hra: 8000, da: 4000, allowances: 3000, grossSalary: 35000, pf: 2400, tax: 1100, deductions: 3500, netSalary: 31500 }
  if (desig.includes('hod') || desig.includes('head') || (desig.includes('professor') && !desig.includes('assistant') && !desig.includes('associate'))) {
    return { basicSalary: 70000, hra: 28000, da: 14000, allowances: 8000, grossSalary: 120000, pf: 8400, tax: 3600, deductions: 12000, netSalary: 108000 }
  }
  if (desig.includes('associate')) {
    return { basicSalary: 50000, hra: 20000, da: 10000, allowances: 5000, grossSalary: 85000, pf: 6000, tax: 2500, deductions: 8500, netSalary: 76500 }
  }
  if (desig.includes('assistant') || desig.includes('senior')) {
    return { basicSalary: 38000, hra: 15200, da: 7600, allowances: 4200, grossSalary: 65000, pf: 4560, tax: 1940, deductions: 6500, netSalary: 58500 }
  }
  return { basicSalary: 30000, hra: 12000, da: 5000, allowances: 3000, grossSalary: 50000, pf: 3600, tax: 1400, deductions: 5000, netSalary: 45000 }
}

const calculateEmployeeAttendanceAndLeaves = (fac, m, allAttendance = [], allRequests = [], allDecisions = {}, allTypes = []) => {
  const facId = String(fac.id || fac.facultyId || '')
  const empId = String(fac.employeeId || '')
  const facName = String(fac.fullName || fac.name || '').toLowerCase().trim()

  // 1. Calculate working days in the month (excluding Sundays)
  let workingDays = 26
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mon] = m.split('-').map(Number)
    const daysInMonth = new Date(y, mon, 0).getDate()
    let sundays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(y, mon - 1, d).getDay() === 0) sundays++
    }
    workingDays = daysInMonth - sundays
  }

  // 2. Attendance records for this employee in month m
  const empAttendance = allAttendance.filter(att => {
    const attFacId = String(att.facultyId ?? att.faculty?.id ?? att.id ?? '')
    const attDate = String(att.date || att.attendanceDate || '').slice(0, 7)
    const attName = String(att.fullName || att.facultyName || att.name || '').toLowerCase().trim()
    const matchesEmp = (facId && attFacId === facId) || (empId && (attFacId === empId || String(att.employeeId) === empId)) || (facName && attName === facName)
    return matchesEmp && attDate === m
  })

  let presentDays = 0
  let lateDays = 0
  let halfDays = 0
  let absentDays = 0
  let explicitLopDays = 0

  empAttendance.forEach(att => {
    const st = String(att.status || att.attendanceStatus || '').toLowerCase().replace(/[\s_-]/g, '')
    if (st === 'present' || st === 'p') {
      presentDays += 1
    } else if (st === 'late' || st === 'l') {
      presentDays += 1
      lateDays += 1
    } else if (st === 'halfday' || st === 'hd') {
      presentDays += 0.5
      halfDays += 1
    } else if (st === 'absent' || st === 'a') {
      absentDays += 1
    } else if (st === 'lop' || st === 'lossofpay') {
      explicitLopDays += 1
    }
  })

  // 3. Approved leave requests for this employee in month m
  const approvedLeaves = allRequests.filter(req => {
    const reqFacId = String(req.facultyId ?? req.employee?.id ?? '')
    const reqEmpId = String(req.employeeId ?? req.employee?.employeeId ?? '')
    const reqName = String(req.fullName || req.facultyName || req.employeeName || req.employee?.fullName || '').toLowerCase().trim()
    const matchesEmp = (facId && reqFacId === facId) || (empId && reqEmpId === empId) || (facName && reqName === facName)
    if (!matchesEmp) return false

    const decision = allDecisions[String(req.id)]
    const finalStatus = decision ? decision.status : req.status
    return finalStatus === 'Approved'
  })

  let paidLeaveDays = 0
  let unpaidLeaveDays = 0

  approvedLeaves.forEach(req => {
    const fromStr = String(req.fromDate || req.from || '').slice(0, 10)
    const toStr = String(req.toDate || req.to || '').slice(0, 10)
    
    if (!fromStr || !toStr) return
    const [y, mon] = m.split('-').map(Number)
    const monthStart = `${m}-01`
    const monthEnd = `${m}-${String(new Date(y, mon, 0).getDate()).padStart(2, '0')}`

    const start = fromStr > monthStart ? fromStr : monthStart
    const end = toStr < monthEnd ? toStr : monthEnd

    if (start <= end) {
      const d1 = new Date(start)
      const d2 = new Date(end)
      let daysCount = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
      if (req.days && Number(req.days) > 0 && daysCount > Number(req.days)) {
        daysCount = Number(req.days)
      }

      const typeObj = Array.isArray(allTypes)
        ? allTypes.find(t => String(t.id) === String(req.leaveTypeId) || String(t.code).toUpperCase() === String(req.leaveTypeCode || '').toUpperCase())
        : allTypes[String(req.leaveTypeId)]
      const isUnpaid = typeObj?.payCategory === 'Unpaid Leave' || typeObj?.payCategory === 'Loss of Pay' || /unpaid|lop|without pay/i.test(`${typeObj?.name || ''} ${req.leaveTypeName || ''}`)
      
      if (isUnpaid) {
        unpaidLeaveDays += daysCount
      } else {
        paidLeaveDays += daysCount
      }
    }
  })

  let finalLop = absentDays + explicitLopDays + unpaidLeaveDays
  let finalPresent = presentDays

  if (empAttendance.length === 0) {
    finalPresent = Math.max(0, workingDays - paidLeaveDays - finalLop)
  } else {
    const totalMarked = presentDays + paidLeaveDays + finalLop
    if (totalMarked < workingDays && (absentDays > 0 || explicitLopDays > 0)) {
      finalLop = Math.max(finalLop, workingDays - presentDays - paidLeaveDays)
    }
  }

  return {
    working: workingDays,
    present: Math.min(workingDays, finalPresent),
    late: lateDays,
    halfDay: halfDays,
    paidLeave: paidLeaveDays,
    lop: Math.min(workingDays, finalLop)
  }
}

const calculateEmployeePayrollFigures = (salaryStructure, workingDays = 26, lopDays = 0) => {
  const basic = Number(salaryStructure?.basicSalary) || 0
  const hra = Number(salaryStructure?.hra) || 0
  const da = Number(salaryStructure?.da) || 0
  const allowances = Number(salaryStructure?.allowances) || 0
  const pf = Number(salaryStructure?.pf) || Math.round(basic * 0.12)
  const tax = Number(salaryStructure?.tax) || (basic > 50000 ? 2500 : 1000)

  const grossSalary = basic + hra + da + allowances
  const working = Number(workingDays) || 26
  const lop = Number(lopDays) || 0
  const perDayRate = working > 0 ? Math.round(grossSalary / working) : 0
  const lopAmount = (lop > 0 && working > 0) ? Math.round(perDayRate * lop) : 0
  const totalDeductions = pf + tax + lopAmount
  const netSalary = Math.max(0, grossSalary - totalDeductions)

  return {
    basicSalary: basic,
    hra,
    da,
    allowances,
    pf,
    tax,
    perDayRate,
    lopAmount,
    grossSalary,
    deductions: totalDeductions,
    netSalary
  }
}



const printSalarySlip = (item, month) => {
  const basic = Number(item.basicSalary) || 0
  const hra = Number(item.hra) || 0
  const da = Number(item.da) || 0
  const allowances = Number(item.allowances) || 0
  const pf = Number(item.pf) || 0
  const tax = Number(item.tax) || 0
  const working = Number(item.working) || 26
  const lop = Number(item.lop) || 0
  const gross = basic + hra + da + allowances
  const perDayRate = working > 0 ? Math.round(gross / working) : 0
  const lopAmount = (lop > 0 && working > 0) ? Math.round(perDayRate * lop) : 0
  const totalDeductions = pf + tax + lopAmount
  const netPay = Math.max(0, gross - totalDeductions)
  const mLabel = monthLabel(month)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Salary Slip - ${item.fullName} - ${mLabel}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; background: #fff; }
    .payslip-wrapper { border: 2px solid #0f766e; border-radius: 8px; padding: 24px; max-width: 800px; margin: 0 auto; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
    .college-title { font-size: 22px; font-weight: 800; color: #0f766e; margin: 0 0 4px; letter-spacing: 0.5px; }
    .college-sub { font-size: 11px; color: #475569; margin: 0 0 8px; }
    .slip-badge { display: inline-block; padding: 4px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; }
    
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
    .info-table .lbl { font-weight: 700; color: #475569; background: #f8fafc; width: 22%; }
    .info-table .val { font-weight: 600; color: #0f172a; width: 28%; }
    
    .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .salary-table th { background: #0f766e; color: #ffffff; padding: 8px 12px; text-align: left; font-weight: 700; border: 1px solid #0f766e; }
    .salary-table th.num { text-align: right; }
    .salary-table td { padding: 7px 12px; border: 1px solid #cbd5e1; }
    .salary-table td.num { text-align: right; font-weight: 600; }
    .salary-table .deduct-val { color: #b91c1c; }
    .salary-table .total-row { background: #f8fafc; font-weight: 800; }
    .salary-table .total-row td { border-top: 2px solid #0f766e; border-bottom: 2px solid #0f766e; padding: 9px 12px; }
    
    .net-box { display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .net-title { font-size: 12px; font-weight: 800; color: #065f46; text-transform: uppercase; margin-bottom: 4px; }
    .net-words { font-size: 13px; color: #047857; font-weight: 600; }
    .net-amount { font-size: 24px; font-weight: 900; color: #047857; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; color: #475569; }
    .sig-block { text-align: center; width: 28%; }
    .sig-line { border-top: 1px dashed #64748b; padding-top: 6px; font-weight: 600; }
    
    .note { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="payslip-wrapper">
    <div class="header">
      <div class="college-title">PIRNAV ENGINEERING COLLEGE</div>
      <div class="college-sub">Approved by AICTE, Affiliated to JNTUH · Hyderabad, Telangana - 500075</div>
      <div class="slip-badge">MONTHLY SALARY SLIP — ${mLabel.toUpperCase()}</div>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="lbl">Employee Name</td>
        <td class="val"><strong>${item.fullName}</strong></td>
        <td class="lbl">Employee ID</td>
        <td class="val"><strong>${item.employeeId}</strong></td>
      </tr>
      <tr>
        <td class="lbl">Designation</td>
        <td class="val">${item.designation || 'Faculty'}</td>
        <td class="lbl">Department</td>
        <td class="val">${item.department || 'General'}</td>
      </tr>
      <tr>
        <td class="lbl">Faculty Category</td>
        <td class="val">${item.type || 'Teaching'}</td>
        <td class="lbl">Pay Period</td>
        <td class="val">${mLabel}</td>
      </tr>
      <tr>
        <td class="lbl">Working / Paid Days</td>
        <td class="val">${working} Days / ${item.present != null ? item.present + (item.paidLeave || 0) : working} Days</td>
        <td class="lbl">LOP Days / Daily Rate</td>
        <td class="val">${lop} Day${lop === 1 ? '' : 's'} (${money(perDayRate)}/day)</td>
      </tr>
    </table>
    
    <table class="salary-table">
      <thead>
        <tr>
          <th style="width:35%;">EARNINGS</th>
          <th class="num" style="width:15%;">AMOUNT (₹)</th>
          <th style="width:35%;">DEDUCTIONS</th>
          <th class="num" style="width:15%;">AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Basic Salary</td>
          <td class="num">${money(basic)}</td>
          <td>Provident Fund (PF)</td>
          <td class="num deduct-val">${money(pf)}</td>
        </tr>
        <tr>
          <td>House Rent Allowance (HRA)</td>
          <td class="num">${money(hra)}</td>
          <td>Professional Tax / TDS</td>
          <td class="num deduct-val">${money(tax)}</td>
        </tr>
        <tr>
          <td>Dearness Allowance (DA)</td>
          <td class="num">${money(da)}</td>
          <td>Loss of Pay (${lop} Day${lop === 1 ? '' : 's'} @ ${money(perDayRate)}/day)</td>
          <td class="num deduct-val">${money(lopAmount)}</td>
        </tr>
        <tr>
          <td>Special Allowances</td>
          <td class="num">${money(allowances)}</td>
          <td>—</td>
          <td class="num" style="color:#94a3b8;">—</td>
        </tr>
        <tr class="total-row">
          <td style="color:#0f766e;">TOTAL GROSS EARNINGS</td>
          <td class="num" style="color:#0f766e;">${money(gross)}</td>
          <td style="color:#b91c1c;">TOTAL DEDUCTIONS</td>
          <td class="num" style="color:#b91c1c;">- ${money(totalDeductions)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="net-box">
      <div>
        <div class="net-title">NET SALARY PAYABLE</div>
        <div class="net-words">Amount in Words: ${numberToWordsIndian(netPay)}</div>
      </div>
      <div class="net-amount">${money(netPay)}</div>
    </div>
    
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">Employee Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Accounts / HR Officer</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Principal / Director</div>
      </div>
    </div>
    
    <div class="note">This is a system-generated salary slip and is valid without physical seal if digitally approved.</div>
  </div>
</body>
</html>`;

  const target = window.open('', '_blank');
  if (!target) {
    alert('Please allow pop-ups to print or download the salary slip.');
    return;
  }
  target.document.open();
  target.document.write(html);
  target.document.close();
  const ready = () => { target.focus(); target.print(); };
  if (target.document.readyState === 'complete') ready();
  else target.addEventListener('load', ready, { once: true });
};

const numberToWordsIndian = (num) => {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only'
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const inWords = (n) => {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '')
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '')
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '')
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '')
  }

  return inWords(Math.floor(num)).trim() + ' Rupees Only'
}

const PAGE_SIZE = 5
const getDefaultPayrollMonth = () => {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const y = lastMonth.getFullYear()
  const m = String(lastMonth.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
const monthLabel = value => value ? new Date(`${value}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Select payroll month'
const money = value => (value == null || isNaN(Number(value))) ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
const statusClass = value => String(value || 'Draft').toLowerCase().replace(/\s+/g, '-')
export default function Payroll() {
  const [tab, setTab] = useState('Payroll Processing'), [month, setMonth] = useState(getDefaultPayrollMonth), [selectedIds, setSelectedIds] = useState([]), [query, setQuery] = useState(''), [filters, setFilters] = useState({ type: '', department: '', status: '' }), [showFilters, setShowFilters] = useState(false), [page, setPage] = useState(1), [selected, setSelected] = useState(null), [hold, setHold] = useState(false), [holdReason, setHoldReason] = useState(''), [editingSalary, setEditingSalary] = useState(null), [payslipItem, setPayslipItem] = useState(null)
  const [payroll, setPayroll] = useState([]), [facultyList, setFacultyList] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const requestVersion = useRef(0), holdLock = useRef(false)
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true); setError('')
    try {
      const fetchRows = tab === 'Salary Records' ? facultyPayrollApi.getSalaryRecords : tab === 'Payslips' ? facultyPayrollApi.getPayslips : facultyPayrollApi.getAll
      const [payrollRes, facultyRes, attendanceRes, leaveRequestsRes, leaveHistoryRes, leaveTypesRes] = await Promise.allSettled([
        fetchRows({ month }),
        facultyService.list(),
        facultyAttendanceApi.getAll({ month }).catch(() => facultyService.getAttendance({ month })).catch(() => []),
        facultyLeaveApi.getRequests().catch(() => []),
        facultyLeaveApi.getHistory().catch(() => []),
        facultyLeaveApi.getTypes().catch(() => [])
      ])
      const data = payrollRes.status === 'fulfilled' && Array.isArray(payrollRes.value) ? payrollRes.value : []
      const faculty = facultyRes.status === 'fulfilled' && Array.isArray(facultyRes.value) ? facultyRes.value : []
      const remoteAttendance = attendanceRes.status === 'fulfilled' && Array.isArray(attendanceRes.value) ? attendanceRes.value : []
      const remotePending = leaveRequestsRes.status === 'fulfilled' && Array.isArray(leaveRequestsRes.value) ? leaveRequestsRes.value : []
      const remoteHistory = leaveHistoryRes.status === 'fulfilled' && Array.isArray(leaveHistoryRes.value) ? leaveHistoryRes.value : []
      const remoteTypes = leaveTypesRes.status === 'fulfilled' && Array.isArray(leaveTypesRes.value) ? leaveTypesRes.value : []

      setFacultyList(faculty)

      const localStatuses = getLocalPayrollStatuses()
      const localSalaries = getLocalSalaryStructures()
      const localAttendance = getLocalAttendanceList()
      const localDecisions = getLocalLeaveDecisions()
      const localTypes = getLocalLeaveTypes()

      // Merge attendance records
      const allAttendance = [...remoteAttendance]
      for (const att of localAttendance) {
        if (!allAttendance.some(a => String(a.id || a.attendanceId) === String(att.id || att.attendanceId))) {
          allAttendance.push(att)
        }
      }

      // Merge leave requests & history
      const allRequests = [...remotePending, ...remoteHistory]

      // Merge leave types
      const allTypes = [...remoteTypes]
      Object.values(localTypes).forEach(lt => {
        if (!allTypes.some(t => String(t.id) === String(lt.id))) {
          allTypes.push(lt)
        }
      })

      let combined = []
      if (data.length > 0) {
        combined = data.map((row, index) => {
          const fac = faculty.find(f => 
            (row.facultyId && (String(f.id) === String(row.facultyId) || String(f.facultyId) === String(row.facultyId))) ||
            (row.fullName && (String(f.fullName || f.name).toLowerCase().trim() === String(row.fullName).toLowerCase().trim())) ||
            (row.facultyName && (String(f.fullName || f.name).toLowerCase().trim() === String(row.facultyName).toLowerCase().trim()))
          ) || faculty[index] || {}

          const resolvedFacultyId = row.facultyId || fac.facultyId || fac.id
          const resolvedEmpId = row.employeeId || fac.employeeId || (resolvedFacultyId ? `EMP${String(resolvedFacultyId).padStart(6, '0')}` : '') || (fac.id ? `EMP${String(fac.id).padStart(6, '0')}` : '')
          const statusOverride = localStatuses[`${month}_${resolvedFacultyId}`]?.status ||
            localStatuses[`${month}_${resolvedEmpId}`]?.status ||
            localStatuses[String(row.id)]?.status ||
            localStatuses[String(resolvedFacultyId)]?.status
          
          const attMetrics = calculateEmployeeAttendanceAndLeaves(
            { id: resolvedFacultyId, employeeId: resolvedEmpId, fullName: row.fullName || fac.fullName || fac.name },
            month,
            allAttendance,
            allRequests,
            localDecisions,
            allTypes
          )

          const savedSalary = localSalaries[String(resolvedFacultyId)] || localSalaries[String(resolvedEmpId)] || localSalaries[String(row.id)]
          const fallbackSalary = calculateDefaultSalaryBreakdown(row.designation || fac.designation, row.type || fac.employeeCategory)
          const salaryStruct = savedSalary || fallbackSalary

          const workingDays = row.workingDays || row.working || attMetrics.working
          const lopDays = (row.lopDays != null && row.lopDays !== 0) ? row.lopDays : attMetrics.lop
          const presentDays = (row.presentDays != null) ? row.presentDays : attMetrics.present
          const paidLeaveDays = (row.paidLeaveDays != null && row.paidLeaveDays !== 0) ? row.paidLeaveDays : attMetrics.paidLeave

          const figures = calculateEmployeePayrollFigures(salaryStruct, workingDays, lopDays)

          return normalizePayroll({
            ...row,
            facultyId: resolvedFacultyId,
            employeeId: resolvedEmpId,
            fullName: row.fullName || fac.fullName || fac.name || row.facultyName,
            designation: row.designation || fac.designation,
            department: row.department || fac.department,
            type: row.type || fac.employeeCategory || (fac.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'),
            workingDays,
            presentDays,
            lateDays: attMetrics.late,
            halfDays: attMetrics.halfDay,
            paidLeaveDays,
            lopDays,
            status: statusOverride || row.status || (tab === 'Salary Records' ? 'Paid' : 'Draft'),
            basicSalary: figures.basicSalary,
            hra: figures.hra,
            da: figures.da,
            allowances: figures.allowances,
            pf: figures.pf,
            tax: figures.tax,
            grossSalary: figures.grossSalary,
            deductions: figures.deductions,
            netSalary: figures.netSalary
          })
        })
      } else if (faculty.length > 0) {
        combined = faculty.map(fac => {
          const statusOverride = localStatuses[`${month}_${fac.id}`]?.status ||
            localStatuses[`pr-${fac.id}-${month}`]?.status ||
            localStatuses[String(fac.id)]?.status

          const attMetrics = calculateEmployeeAttendanceAndLeaves(
            fac,
            month,
            allAttendance,
            allRequests,
            localDecisions,
            allTypes
          )

          const savedSalary = localSalaries[String(fac.id)] || localSalaries[String(fac.employeeId)]
          const fallbackSalary = calculateDefaultSalaryBreakdown(fac.designation, fac.employeeCategory)
          const salaryStruct = savedSalary || fallbackSalary

          const figures = calculateEmployeePayrollFigures(salaryStruct, attMetrics.working, attMetrics.lop)

          return normalizePayroll({
            id: `pr-${fac.id}-${month}`,
            payrollId: fac.id,
            facultyId: fac.id,
            employeeId: fac.employeeId || `EMP${String(fac.id).padStart(6, '0')}`,
            fullName: fac.fullName || fac.name,
            designation: fac.designation,
            department: fac.department,
            type: fac.employeeCategory || 'Teaching',
            workingDays: attMetrics.working,
            presentDays: attMetrics.present,
            lateDays: attMetrics.late,
            halfDays: attMetrics.halfDay,
            paidLeaveDays: attMetrics.paidLeave,
            lopDays: attMetrics.lop,
            status: statusOverride || (tab === 'Salary Records' ? 'Paid' : 'Draft'),
            payrollMonth: month,
            basicSalary: figures.basicSalary,
            hra: figures.hra,
            da: figures.da,
            allowances: figures.allowances,
            pf: figures.pf,
            tax: figures.tax,
            grossSalary: figures.grossSalary,
            deductions: figures.deductions,
            netSalary: figures.netSalary
          })
        })
      }

      if (version === requestVersion.current) setPayroll(newestFirst('payroll', combined))
    } catch (reason) { if (version === requestVersion.current) { setPayroll([]); setError(reason.message) } }
    finally { if (version === requestVersion.current) setLoading(false) }
  }, [month, tab])
  useEffect(() => { load(); return () => { requestVersion.current++ } }, [load])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2000)
    return () => clearTimeout(timer)
  }, [notice])
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
  
  const getFullBreakdownForRow = (row) => {
    const facBreakdown = calculateDefaultSalaryBreakdown(row.designation, row.type)
    const savedBreakdown = getLocalSalaryStructures()[String(row.facultyId || row.id)] ||
      getLocalSalaryStructures()[String(row.employeeId)] || {}
    const salaryStruct = {
      basicSalary: row.basicSalary ?? savedBreakdown.basicSalary ?? facBreakdown.basicSalary,
      hra: row.hra ?? savedBreakdown.hra ?? facBreakdown.hra,
      da: row.da ?? savedBreakdown.da ?? facBreakdown.da,
      allowances: row.allowances ?? savedBreakdown.allowances ?? facBreakdown.allowances,
      pf: row.pf ?? savedBreakdown.pf ?? Math.round((Number(row.basicSalary || savedBreakdown.basicSalary || facBreakdown.basicSalary) || 0) * 0.12),
      tax: row.tax ?? savedBreakdown.tax ?? (Number(row.basicSalary || savedBreakdown.basicSalary || facBreakdown.basicSalary) > 50000 ? 2500 : 1000),
    }
    const working = Number(row.working || row.workingDays) || 26
    const lop = Number(row.lop || row.lopDays) || 0
    const figures = calculateEmployeePayrollFigures(salaryStruct, working, lop)
    return { ...row, ...figures, working, lop }
  }

  const handleOpenPayslip = (row) => {
    const fullRow = getFullBreakdownForRow(row)
    setPayslipItem(fullRow)
  }

  const handlePrintPayslipDirect = (row) => {
    handleOpenPayslip(row)
  }

  const handleSaveSalaryStructure = (facultyItem, salaryData) => {
    saveLocalSalaryStructure(facultyItem, salaryData)
    setPayroll(prev => {
      const exists = prev.some(item => 
        (String(item.id) === String(facultyItem.id)) ||
        (facultyItem.facultyId && String(item.facultyId) === String(facultyItem.facultyId)) ||
        (facultyItem.employeeId && String(item.employeeId) === String(facultyItem.employeeId))
      )
      if (exists) {
        return prev.map(item => {
          const match = (String(item.id) === String(facultyItem.id)) ||
            (facultyItem.facultyId && String(item.facultyId) === String(facultyItem.facultyId)) ||
            (facultyItem.employeeId && String(item.employeeId) === String(facultyItem.employeeId))
          if (!match) return item
          const working = Number(item.working || item.workingDays) || 26
          const lop = Number(item.lop || item.lopDays) || 0
          const figures = calculateEmployeePayrollFigures(salaryData, working, lop)
          return { ...item, ...salaryData, ...figures }
        })
      } else {
        const resolvedEmpId = facultyItem.employeeId || (facultyItem.id ? `EMP${String(facultyItem.id).padStart(6, '0')}` : '')
        const figures = calculateEmployeePayrollFigures(salaryData, 26, 0)
        const newRecord = normalizePayroll({
          id: facultyItem.id ? `pr-${facultyItem.id}-${month}` : `pr-${Date.now()}-${month}`,
          facultyId: facultyItem.id || facultyItem.facultyId,
          employeeId: resolvedEmpId,
          fullName: facultyItem.fullName || facultyItem.name,
          designation: facultyItem.designation || 'Faculty',
          department: facultyItem.department || 'General',
          type: facultyItem.employeeCategory || facultyItem.type || 'Teaching',
          workingDays: 26,
          presentDays: 26,
          paidLeaveDays: 0,
          lopDays: 0,
          status: tab === 'Salary Records' ? 'Paid' : 'Draft',
          payrollMonth: month,
          ...salaryData,
          ...figures
        })
        return [newRecord, ...prev]
      }
    })
    setEditingSalary(null)
    setNotice(`Salary structure configured for ${facultyItem.fullName || facultyItem.name}.`)
  }

  const handleApprove = async (row) => {
    saveLocalPayrollStatus(row, 'Processed', '', month)
    setPayroll(prev => prev.map(item => (String(item.id) === String(row.id) || (row.facultyId && String(item.facultyId) === String(row.facultyId))) ? { ...item, status: 'Processed' } : item))
    if (selected && (String(selected.id) === String(row.id) || String(selected.facultyId) === String(row.facultyId))) {
      setSelected(prev => ({ ...prev, status: 'Processed' }))
    }
    setNotice(`Payroll for ${row.fullName} processed successfully.`)
  }


  const toggleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return Array.from(next)
    })
  }

  const toggleSelectAll = () => {
    const visibleIds = visible.map(r => String(r.id))
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleBulkApprove = async (targetRows = null) => {
    let rowsToApprove = targetRows
    if (!rowsToApprove) {
      if (selectedIds.length > 0) {
        rowsToApprove = rows.filter(r => selectedIds.includes(String(r.id)) && (r.status === 'Draft' || r.status === 'Hold'))
      } else {
        rowsToApprove = rows.filter(r => r.status === 'Draft' || r.status === 'Hold')
      }
    }
    if (!rowsToApprove || !rowsToApprove.length) {
      setNotice('No pending (Draft / Hold) payroll records to approve.')
      return
    }
    setBusy(true)
    rowsToApprove.forEach(row => {
      saveLocalPayrollStatus(row, 'Processed', '', month)
    })
    const idsToUpdate = new Set(rowsToApprove.map(r => String(r.id)))
    const facIdsToUpdate = new Set(rowsToApprove.map(r => String(r.facultyId)).filter(Boolean))
    setPayroll(prev => prev.map(item => {
      if (idsToUpdate.has(String(item.id)) || (item.facultyId && facIdsToUpdate.has(String(item.facultyId)))) {
        return { ...item, status: 'Processed' }
      }
      return item
    }))
    setSelectedIds([])
    setBusy(false)
    setNotice(`Successfully approved payroll for ${rowsToApprove.length} employee(s).`)
  }

  const handleBulkMarkPaid = async () => {
    const rowsToPay = rows.filter(r => selectedIds.includes(String(r.id)) && r.status === 'Processed')
    if (!rowsToPay.length) {
      setNotice('No Processed payroll records selected to mark as Paid.')
      return
    }
    setBusy(true)
    rowsToPay.forEach(row => {
      saveLocalPayrollStatus(row, 'Paid', '', month)
    })
    const idsToUpdate = new Set(rowsToPay.map(r => String(r.id)))
    const facIdsToUpdate = new Set(rowsToPay.map(r => String(r.facultyId)).filter(Boolean))
    setPayroll(prev => prev.map(item => {
      if (idsToUpdate.has(String(item.id)) || (item.facultyId && facIdsToUpdate.has(String(item.facultyId)))) {
        return { ...item, status: 'Paid' }
      }
      return item
    }))
    setSelectedIds([])
    setBusy(false)
    setNotice(`Marked ${rowsToPay.length} payroll record(s) as Paid.`)
  }

  const handleMarkPaid = async (row) => {
    saveLocalPayrollStatus(row, 'Paid', '', month)
    setPayroll(prev => prev.map(item => (String(item.id) === String(row.id) || (row.facultyId && String(item.facultyId) === String(row.facultyId))) ? { ...item, status: 'Paid' } : item))
    if (selected && (String(selected.id) === String(row.id) || String(selected.facultyId) === String(row.facultyId))) {
      setSelected(prev => ({ ...prev, status: 'Paid' }))
    }
    setNotice(`Payroll for ${row.fullName} marked as Paid.`)
  }

  const handleOpenHold = (row) => {
    setSelected(row)
    setHoldReason(row.holdReason || '')
    setHold(true)
  }

  const placeHold = async event => {
    event.preventDefault(); if (!holdReason.trim() || holdLock.current) return
    holdLock.current = true; setBusy(true); setError('')
    saveLocalPayrollStatus(selected, 'Hold', holdReason.trim(), month)
    setPayroll(prev => prev.map(item => (String(item.id) === String(selected.id) || (selected.facultyId && String(item.facultyId) === String(selected.facultyId))) ? { ...item, status: 'Hold', holdReason: holdReason.trim() } : item))
    try {
      await facultyPayrollApi.hold(selected.id, holdReason.trim())
    } catch {}
    finally {
      holdLock.current = false
      setBusy(false)
      setHold(false)
      setSelected(null)
      setNotice(`Payroll for ${selected.fullName} placed on hold.`)
    }
  }
  const download = async () => { setBusy(true); setError(''); try { downloadServerExport(await facultyPayrollApi.export({ month }), 'faculty-payroll-' + month) } catch (reason) { setError(reason.message) } finally { setBusy(false) } }
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)), currentPage = Math.min(page, totalPages), visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const updateFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const clear = () => { setQuery(''); setFilters({ type: '', department: '', status: '' }); setPage(1) }
  const columns = [['employeeId', 'Employee ID'], ['fullName', 'Employee'], ['type', 'Type'], ['department', 'Department'], ['working', 'Working Days'], ['present', 'Present'], ['paidLeave', 'Paid Leave'], ['lop', 'LOP'], ['status', 'Status']].map(([value, label]) => ({ label, value }))
  const processed = rows.filter(row => row.status === 'Processed').length, onHold = rows.filter(row => row.status === 'Hold').length, lop = rows.reduce((sum, row) => sum + row.lop, 0)
  const title = tab === 'Payroll Processing' ? 'Payroll Processing' : tab
  const emptyText = tab === 'Payroll Processing' ? `No payroll records found for ${monthLabel(month)}.` : tab === 'Salary Records' ? 'No salary records found.' : 'No payslips found for the selected filters.'
  return <DashboardLayout><main className="faculty-payroll">{error && <p className="flm-error" role="alert">{error} <button onClick={load}>Retry</button></p>}<header className="fp-header"><div><p>HOME / FACULTY / PAYROLL</p><h1>Faculty Payroll</h1><span>Process faculty salaries using attendance, leave and payroll data.</span></div><div className="fp-summary">{[['Total Employees', rows.length], ['Processed', processed], ['On Hold', onHold], ['LOP Days', lop]].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header><section className="fp-card"><header><div><p>{title.toUpperCase()}</p><h2>{tab === 'Payroll Processing' ? monthLabel(month) : title}</h2></div><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {tab === 'Payroll Processing' && (
            <label className="fp-payroll-period">
              <span>Payroll Period</span>
              <input type="month" value={month} onChange={event => { setMonth(event.target.value); setPage(1) }} aria-label="Payroll Period" />
            </label>
          )}
          {tab === 'Salary Records' && (
            <button
              type="button"
              className="fp-add-salary-btn"
              onClick={() => setEditingSalary({ isNew: true })}
              title="Add / Define Salary Structure for an Employee"
            >
              <FiPlus /> Add Salary Structure
            </button>
          )}
          <button type="button" className="export-button" disabled={busy || loading} onClick={download}>Export Payroll</button>
        </div></header><nav>{['Payroll Processing', 'Salary Records', 'Payslips'].map(item => <button type="button" className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setPage(1); setSelectedIds([]) }} key={item}>{item}</button>)}</nav><div className="fp-tools"><label><FiSearch /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} aria-label="Search payroll employees" placeholder="Search employee..." /></label><button type="button" className="fp-filter-button" onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button></div>{showFilters && <div className="fp-filters"><label>Payroll Month<input type="month" value={month} onChange={event => { setMonth(event.target.value); setPage(1) }} /></label><label>Faculty Type<select value={filters.type} onChange={event => updateFilter('type', event.target.value)}><option value="">All Faculty</option><option>Teaching</option><option>Non-Teaching</option></select></label><label>Department<select value={filters.department} onChange={event => updateFilter('department', event.target.value)}><option value="">All Departments</option>{departments.map(item => <option key={item}>{item}</option>)}</select></label>{tab !== 'Payslips' && <label>Payroll Status<select value={filters.status} onChange={event => updateFilter('status', event.target.value)}><option value="">All Statuses</option>{['Draft', 'Processed', 'Paid', 'Hold'].map(item => <option key={item}>{item}</option>)}</select></label>}<button type="button" onClick={clear}>Clear Filters</button></div>}
      {tab === 'Payroll Processing' && selectedIds.length > 0 && (
        <div className="fp-bulkbar">
          <strong>{selectedIds.length} employee(s) selected</strong>
          <button
            type="button"
            className="fp-bulkbar-btn primary"
            onClick={() => handleBulkApprove()}
          >
            <FiCheck /> Approve Selected ({selectedIds.length})
          </button>
          <button
            type="button"
            className="fp-bulkbar-btn pay"
            onClick={handleBulkMarkPaid}
          >
            <FiCheck /> Mark Selected as Paid
          </button>
          <button
            type="button"
            className="fp-bulkbar-btn secondary"
            onClick={() => setSelectedIds([])}
          >
            Clear Selection
          </button>
        </div>
      )}
<div className="fp-table">{loading ? (
  <div className="fp-empty" role="status" style={{ padding: '36px 16px', textAlign: 'center' }}>
    <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #0f766e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '8px' }} />
    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Loading payroll records...</p>
  </div>
) : rows.length ? <table><thead><tr>{tab === 'Payroll Processing' && (
      <th style={{ width: '40px', textAlign: 'center' }}>
        <input
          type="checkbox"
          aria-label="Select all employees"
          checked={visible.length > 0 && visible.every(r => selectedIds.includes(String(r.id)))}
          onChange={toggleSelectAll}
        />
      </th>
    )}{(tab === 'Payroll Processing' ? ['Employee ID', 'Employee', 'Type', 'Department', 'Working Days', 'Present', 'Paid Leave', 'LOP', 'Gross Salary', 'Deductions', 'Net Salary', 'Status', 'Action'] : tab === 'Salary Records' ? ['Employee ID', 'Employee', 'Type', 'Department', 'Basic Salary', 'Gross Salary', 'Deductions', 'Net Salary', 'Action'] : ['Payroll Month', 'Employee ID', 'Employee', 'Type', 'Department', 'Gross Salary', 'Deductions', 'Net Salary', 'Status', 'Action']).map(item => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id}>
      {tab === 'Payroll Processing' && (
        <td style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            aria-label={`Select ${row.fullName}`}
            checked={selectedIds.includes(String(row.id))}
            onChange={() => toggleSelectRow(String(row.id))}
          />
        </td>
      )}
      {tab === 'Payslips' && <td>{monthLabel(month)}</td>}
      <td>{row.employeeId}</td>
      <td><strong>{row.fullName}</strong><small>{row.designation}</small></td>
      <td>{row.type}</td>
      <td>{row.department}</td>
      {tab === 'Payroll Processing' && (
        <>
          <td>{row.working}</td>
          <td>{row.present}</td>
          <td>{row.paidLeave}</td>
          <td><span className={row.lop ? 'fp-lop' : ''}>{row.lop}</span></td>
        </>
      )}
      {tab === 'Salary Records' && <td>{money(row.basicSalary)}</td>}
      <td>{money(row.grossSalary)}</td>
      <td>{money(row.deductions)}</td>
      <td>{money(row.netSalary)}</td>
      {tab !== 'Salary Records' && <td><span className={`fp-status ${statusClass(row.status)}`}>{row.status}</span></td>}
      <td>
  <div className="fp-actions">
    {tab !== 'Payslips' && (
      <button type="button" title="View details" aria-label={`View details for ${row.fullName}`} onClick={() => view(row)}>
        <FiEye />
      </button>
    )}
    {tab === 'Payroll Processing' && (
      <>
        {row.status === 'Hold' && (
          <button type="button" className="fp-approve-btn" title="Approve / Release Hold" aria-label={`Approve payroll for ${row.fullName}`} onClick={() => handleApprove(row)}>
            <FiCheck />
          </button>
        )}
        {row.status === 'Draft' && (
          <>
            <button type="button" className="fp-approve-btn" title="Process Payroll" aria-label={`Process payroll for ${row.fullName}`} onClick={() => handleApprove(row)}>
              <FiCheck />
            </button>
            <button type="button" className="fp-hold-btn" title="Place on Hold" aria-label={`Place payroll on hold for ${row.fullName}`} onClick={() => handleOpenHold(row)}>
              <FiSlash />
            </button>
          </>
        )}
        {row.status === 'Processed' && (
          <>
            <button type="button" className="fp-pay-btn" title="Mark as Paid" aria-label={`Mark as paid for ${row.fullName}`} onClick={() => handleMarkPaid(row)}>
              <FiCheck />
            </button>
            <button type="button" className="fp-hold-btn" title="Place on Hold" aria-label={`Place payroll on hold for ${row.fullName}`} onClick={() => handleOpenHold(row)}>
              <FiSlash />
            </button>
          </>
        )}
      </>
    )}
    {tab === 'Salary Records' && (
      <button type="button" className="fp-edit-btn" title="Configure / Edit Salary" aria-label={`Configure salary for ${row.fullName}`} onClick={() => setEditingSalary(row)}>
        <FiEdit2 />
      </button>
    )}
    {tab === 'Payslips' && (
      <>
        <button
          type="button"
          className="fp-view-payslip-btn"
          title="View Official Salary Slip"
          aria-label={`View salary slip for ${row.fullName}`}
          onClick={() => handleOpenPayslip(row)}
        >
          <FiEye />
        </button>
        <button
          type="button"
          className="fp-print-payslip-btn"
          title="Print / View Salary Slip"
          aria-label={`Print salary slip for ${row.fullName}`}
          onClick={() => handleOpenPayslip(row)}
        >
          <FiPrinter />
        </button>
      </>
    )}
  </div>
</td></tr>)}</tbody></table> : <p className="fp-empty">{emptyText}</p>}</div>{rows.length > PAGE_SIZE && <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />}</section>{selected && (() => {
  const full = getFullBreakdownForRow(selected)
  const basic = full.basicSalary
  const hra = full.hra
  const da = full.da
  const allowances = full.allowances
  const pf = full.pf
  const tax = full.tax
  const lopAmount = full.lopAmount || 0
  const gross = full.grossSalary
  const deductions = full.deductions
  const net = full.netSalary

  return (
    <div className="fp-overlay">
      <section className="fp-dialog fp-view-dialog" role="dialog" aria-modal="true" aria-label="Payroll details" style={{ maxWidth: '640px' }}>
        <button className="fp-close" type="button" aria-label="Close payroll details" onClick={() => setSelected(null)}><FiX /></button>
        <p>{tab === 'Salary Records' ? 'SALARY STRUCTURE DETAILS' : 'PAYROLL DETAILS'}</p>
        <h2>{selected.fullName}</h2>
        <span>{selected.employeeId} · {selected.designation} · {selected.department} · {selected.type}</span>
        {tab !== 'Salary Records' && <b className={`fp-status ${statusClass(selected.status)}`}>{selected.status}</b>}

        {tab !== 'Salary Records' && (
          <>
            <h3 style={{ marginTop: '16px' }}>Payroll Period</h3>
            <dl>
              <div><dt>Payroll Month</dt><dd>{monthLabel(month)}</dd></div>
              <div><dt>Working Days</dt><dd>{selected.working}</dd></div>
            </dl>

            <h3>Attendance Summary</h3>
            <dl className="fp-attendance-summary">
              {[['Present', selected.present, 'present'], ['Late', selected.late, 'late'], ['Half Day', selected.halfDay, 'half-day'], ['Paid Leave', selected.paidLeave, 'leave'], ['LOP Days', selected.lop, 'lop']].map(([label, value, tone]) => (
                <div className={tone} key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </>
        )}

        <h3 style={{ marginTop: '18px' }}>Salary Breakdown & Structure</h3>
        <div className="fp-salary-breakdown-card">
          <h4 style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '800', color: 'var(--brand, #0f766e)', textTransform: 'uppercase' }}>Earnings & Allowances</h4>
          <dl className="fp-breakdown-grid">
            <div><dt>Basic Salary</dt><dd>{money(basic)}</dd></div>
            <div><dt>HRA (House Rent)</dt><dd>{money(hra)}</dd></div>
            <div><dt>DA (Dearness Allowance)</dt><dd>{money(da)}</dd></div>
            <div><dt>Special Allowances</dt><dd>{money(allowances)}</dd></div>
          </dl>

          <h4 style={{ margin: '14px 0 8px', fontSize: '11px', fontWeight: '800', color: 'var(--danger, #b42318)', textTransform: 'uppercase' }}>Deductions & Adjustments</h4>
          <dl className="fp-breakdown-grid">
            <div><dt>Provident Fund (PF)</dt><dd>{money(pf)}</dd></div>
            <div><dt>Professional Tax / TDS</dt><dd>{money(tax)}</dd></div>
            <div>
              <dt>Daily Pay Rate</dt>
              <dd>{money(full.perDayRate || Math.round(gross / (selected.working || 26)))} / day</dd>
            </div>
            {selected.lop > 0 ? (
              <div>
                <dt>Loss of Pay ({selected.lop} Day{selected.lop === 1 ? '' : 's'} @ {money(full.perDayRate || Math.round(gross / (selected.working || 26)))}/day)</dt>
                <dd style={{ color: '#b91c1c', fontWeight: '700' }}>- {money(lopAmount)}</dd>
              </div>
            ) : (
              <div>
                <dt>Loss of Pay (0 LOP Days)</dt>
                <dd style={{ color: '#64748b' }}>₹0</dd>
              </div>
            )}
          </dl>

          <div className="fp-breakdown-summary">
            <div className="item">
              <span>Gross Salary:</span>
              <strong>{money(gross)}</strong>
            </div>
            <div className="item deductions">
              <span>Total Deductions:</span>
              <strong>- {money(deductions)}</strong>
            </div>
            <div className="item net">
              <span>Net Take-Home Pay:</span>
              <strong>{money(net)}</strong>
            </div>
          </div>
        </div>

        <footer>
          <button type="button" onClick={() => setSelected(null)}>Close</button>
        </footer>
      </section>
    </div>
  )
})()}{notice && <div className="flm-toast">{notice}<button onClick={() => setNotice('')}><FiX /></button></div>}
{payslipItem && <SalarySlipModal item={payslipItem} month={month} onClose={() => setPayslipItem(null)} />}
{editingSalary && <SalaryConfigModal item={editingSalary} facultyList={facultyList} onClose={() => setEditingSalary(null)} onSave={handleSaveSalaryStructure} />}
{hold && selected && <div className="fp-overlay"><form className="fp-dialog fp-hold" onSubmit={placeHold}><h2>Place Payroll on Hold</h2><p>{selected.fullName} · {monthLabel(month)}</p><label><span>Reason <b className="required-mark">*</b></span><textarea value={holdReason} onChange={event => setHoldReason(event.target.value)} required /></label><footer><button type="button" onClick={() => setHold(false)}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place on Hold'}</button></footer></form></div>}</main></DashboardLayout>
}


function SalaryConfigModal({ item, facultyList = [], onClose, onSave }) {
  const isNew = Boolean(item?.isNew)
  const [selectedFacultyId, setSelectedFacultyId] = useState(isNew ? '' : (item?.facultyId || item?.id || ''))
  const [activeFaculty, setActiveFaculty] = useState(isNew ? null : item)

  const [basic, setBasic] = useState(isNew ? '' : (item?.basicSalary ?? ''))
  const [hra, setHra] = useState(isNew ? '' : (item?.hra ?? ''))
  const [da, setDa] = useState(isNew ? '' : (item?.da ?? ''))
  const [allowances, setAllowances] = useState(isNew ? '' : (item?.allowances ?? ''))
  const [pf, setPf] = useState(isNew ? '' : (item?.pf ?? ''))
  const [tax, setTax] = useState(isNew ? '' : (item?.tax ?? ''))

  const handleSelectFaculty = (facId) => {
    setSelectedFacultyId(facId)
    const found = facultyList.find(f => String(f.id) === String(facId)) || null
    setActiveFaculty(found)
    if (found) {
      const saved = getLocalSalaryStructures()[String(found.id)] || getLocalSalaryStructures()[String(found.employeeId)]
      if (saved) {
        setBasic(saved.basicSalary ?? '')
        setHra(saved.hra ?? '')
        setDa(saved.da ?? '')
        setAllowances(saved.allowances ?? '')
        setPf(saved.pf ?? '')
        setTax(saved.tax ?? '')
      } else {
        setBasic('')
        setHra('')
        setDa('')
        setAllowances('')
        setPf('')
        setTax('')
      }
    } else {
      setBasic('')
      setHra('')
      setDa('')
      setAllowances('')
      setPf('')
      setTax('')
    }
  }

  const numBasic = Number(basic) || 0
  const numHra = Number(hra) || 0
  const numDa = Number(da) || 0
  const numAllowances = Number(allowances) || 0
  const numPf = Number(pf) || 0
  const numTax = Number(tax) || 0

  const gross = numBasic + numHra + numDa + numAllowances
  const deductions = numPf + numTax
  const net = Math.max(0, gross - deductions)

  const handleBasicChange = val => {
    if (val === '') {
      setBasic('')
      setHra('')
      setDa('')
      setPf('')
      return
    }
    const b = Number(val) || 0
    setBasic(b)
    setHra(Math.round(b * 0.40))
    setDa(Math.round(b * 0.20))
    setPf(Math.round(b * 0.12))
  }

  const handleSubmit = e => {
    e.preventDefault()
    const targetEmployee = activeFaculty || item
    if (!targetEmployee || (!targetEmployee.id && !targetEmployee.fullName && !targetEmployee.name)) {
      alert('Please select an employee.')
      return
    }
    onSave(targetEmployee, {
      basicSalary: numBasic,
      hra: numHra,
      da: numDa,
      allowances: numAllowances,
      grossSalary: gross,
      pf: numPf,
      tax: numTax,
      deductions: deductions,
      netSalary: net
    })
  }

  const displayName = activeFaculty?.fullName || activeFaculty?.name || item?.fullName || 'New Employee'
  const displayEmpId = activeFaculty?.employeeId || (activeFaculty?.id ? `EMP${String(activeFaculty.id).padStart(6, '0')}` : '') || item?.employeeId || ''
  const displayDesignation = activeFaculty?.designation || item?.designation || 'Faculty'
  const displayDept = activeFaculty?.department || item?.department || 'General'
  const displayType = activeFaculty?.employeeCategory || activeFaculty?.type || item?.type || 'Teaching'

  return (
    <div className="fp-overlay">
      <div className="fp-dialog fp-salary-modal" style={{ maxWidth: '640px' }}>
        <button className="fp-close" type="button" aria-label="Close" onClick={onClose}><FiX /></button>
        <p>{isNew ? 'DEFINE EMPLOYEE SALARY STRUCTURE' : 'FACULTY SALARY CONFIGURATION'}</p>
        <h2>{displayName}</h2>
        {Boolean(displayEmpId || displayDesignation) && (
          <span>{displayEmpId} · {displayDesignation} · {displayDept} ({displayType})</span>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          {isNew && (
            <div style={{ marginBottom: '16px' }}>
              <label className="fp-field">
                <span>Select Employee <b className="required-mark">*</b></span>
                <select
                  value={selectedFacultyId}
                  onChange={e => handleSelectFaculty(e.target.value)}
                  required
                >
                  <option value="">-- Choose Employee / Faculty --</option>
                  {facultyList.map(f => {
                    const code = f.employeeId || (f.id ? `EMP${String(f.id).padStart(6, '0')}` : '')
                    return (
                      <option key={f.id} value={f.id}>
                        {code} — {f.fullName || f.name} ({f.department || 'General'}) — {f.designation || 'Faculty'}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
          )}

          <h3 style={{ margin: '14px 0 8px', fontSize: '12px', fontWeight: '800', color: 'var(--brand, #0f766e)', textTransform: 'uppercase' }}>Earnings / Allowances</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="fp-field">
              <span>Basic Salary (₹) <b className="required-mark">*</b></span>
              <input type="number" min="0" value={basic} onChange={e => handleBasicChange(e.target.value)} required />
            </label>
            <label className="fp-field">
              <span>HRA (House Rent) (₹)</span>
              <input type="number" min="0" value={hra} onChange={e => setHra(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label className="fp-field">
              <span>DA (Dearness Allowance) (₹)</span>
              <input type="number" min="0" value={da} onChange={e => setDa(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label className="fp-field">
              <span>Special / Other Allowances (₹)</span>
              <input type="number" min="0" value={allowances} onChange={e => setAllowances(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
          </div>

          <h3 style={{ margin: '18px 0 8px', fontSize: '12px', fontWeight: '800', color: 'var(--danger, #b42318)', textTransform: 'uppercase' }}>Statutory Deductions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="fp-field">
              <span>Provident Fund (PF) (₹)</span>
              <input type="number" min="0" value={pf} onChange={e => setPf(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label className="fp-field">
              <span>Professional Tax / TDS (₹)</span>
              <input type="number" min="0" value={tax} onChange={e => setTax(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
          </div>

          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: 'var(--surface-soft, #f8fafc)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
              <span>Gross Salary:</span>
              <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(gross)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>
              <span>Daily Pay Rate (Per Day):</span>
              <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(gross / 26))} / day <small style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Basis for Loss of Pay / LOP)</small></strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--danger, #b42318)' }}>
              <span>Standard Deductions (PF + Tax):</span>
              <strong>- {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(deductions)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '14px', fontWeight: '700', color: 'var(--brand, #0f766e)' }}>
              <span>Base Net Take-Home:</span>
              <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(net)}</span>
            </div>
          </div>

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="primary" type="submit" disabled={isNew && !selectedFacultyId}>
              {isNew ? 'Save Salary Structure' : 'Update Salary Structure'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function SalarySlipModal({ item, month, onClose }) {
  const handlePrint = () => {
    printSalarySlip(item, month)
  }

  const basic = Number(item.basicSalary) || 0
  const hra = Number(item.hra) || 0
  const da = Number(item.da) || 0
  const allowances = Number(item.allowances) || 0
  const pf = Number(item.pf) || 0
  const tax = Number(item.tax) || 0
  const working = Number(item.working) || 26
  const lop = Number(item.lop) || 0
  const gross = basic + hra + da + allowances
  const perDayRate = working > 0 ? Math.round(gross / working) : 0
  const lopAmount = (lop > 0 && working > 0) ? Math.round(perDayRate * lop) : 0
  const totalDeductions = pf + tax + lopAmount
  const netPay = Math.max(0, gross - totalDeductions)

  return (
    <div className="fp-overlay">
      <div className="fp-dialog fp-payslip-modal-container" style={{ maxWidth: '860px', width: 'min(860px, 96vw)', padding: '20px 24px' }}>
        <button className="fp-close" type="button" aria-label="Close" onClick={onClose}><FiX /></button>

        <div className="fp-payslip-document" data-print-scope style={{ background: '#ffffff', padding: '20px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', boxSizing: 'border-box' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f766e', paddingBottom: '12px', marginBottom: '14px' }}>
            <h1 style={{ margin: '0 0 3px', fontSize: '20px', fontWeight: '800', color: '#0f766e', letterSpacing: '0.04em' }}>PIRNAV ENGINEERING COLLEGE</h1>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#475569' }}>Approved by AICTE, Affiliated to JNTUH · Hyderabad, Telangana - 500075</p>
            <div style={{ display: 'inline-block', marginTop: '4px', padding: '3px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
              SALARY SLIP — {monthLabel(month).toUpperCase()}
            </div>
          </div>

          {/* Employee & Pay Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 20px', background: '#f8fafc', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', boxSizing: 'border-box' }}>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Employee Name:</span> <strong style={{ color: '#0f172a' }}>{item.fullName}</strong></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Employee ID:</span> <strong style={{ color: '#0f172a' }}>{item.employeeId}</strong></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Designation:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.designation}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Department:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.department}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Faculty Category:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.type}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Pay Month / Year:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{monthLabel(month)}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Working / Paid Days:</span> <strong style={{ color: '#0f172a' }}>{working} Days</strong> / <strong style={{ color: '#15803d' }}>{item.present != null ? item.present + (item.paidLeave || 0) : working} Days</strong></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>LOP Days / Daily Rate:</span> <strong style={{ color: lop > 0 ? '#b91c1c' : '#64748b' }}>{lop} Day{lop === 1 ? '' : 's'}</strong> ({money(perDayRate)}/day)</div>
          </div>

          {/* Side-by-side Earnings and Deductions Table */}
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#0f766e', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', width: '32%' }}>EARNINGS</th>
                <th style={{ padding: '8px 10px', width: '18%', textAlign: 'right' }}>AMOUNT (₹)</th>
                <th style={{ padding: '8px 10px', width: '32%', borderLeft: '1px solid #14b8a6' }}>DEDUCTIONS</th>
                <th style={{ padding: '8px 10px', width: '18%', textAlign: 'right' }}>AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '7px 10px' }}>Basic Salary</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(basic)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>Provident Fund (PF)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', color: '#b91c1c' }}>{money(pf)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '7px 10px' }}>House Rent Allowance (HRA)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(hra)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>Professional Tax / TDS</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', color: '#b91c1c' }}>{money(tax)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '7px 10px' }}>Dearness Allowance (DA)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(da)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>Loss of Pay ({lop} Day{lop === 1 ? '' : 's'} @ {money(perDayRate)}/day)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', color: lopAmount > 0 ? '#b91c1c' : '#64748b' }}>{money(lopAmount)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '7px 10px' }}>Special / Other Allowances</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(allowances)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>—</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', color: '#64748b' }}>—</td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: '800', borderBottom: '2px solid #cbd5e1' }}>
                <td style={{ padding: '8px 10px', color: '#0f766e' }}>TOTAL GROSS EARNINGS</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0f766e' }}>{money(gross)}</td>
                <td style={{ padding: '8px 10px', color: '#b91c1c', borderLeft: '1px solid #e2e8f0' }}>TOTAL DEDUCTIONS</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b91c1c' }}>- {money(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>

          {/* Net Pay Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', padding: '12px 16px', border: '1px solid #a7f3d0', borderRadius: '8px', marginBottom: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NET SALARY PAYABLE</span>
              <strong style={{ fontSize: '11px', color: '#047857' }}>Amount in Words: {numberToWordsIndian(netPay)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '22px', fontWeight: '900', color: '#047857' }}>{money(netPay)}</span>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '28px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
            <div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '5px', margin: '0 12px' }}>Employee Signature</div>
            </div>
            <div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '5px', margin: '0 12px' }}>Accounts / HR Officer</div>
            </div>
            <div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '5px', margin: '0 12px' }}>Principal / Director</div>
            </div>
          </div>
        </div>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" className="primary" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0f766e', color: '#fff' }}>
            <FiPrinter /> Print / Save as PDF
          </button>
        </footer>
      </div>
    </div>
  )
}
