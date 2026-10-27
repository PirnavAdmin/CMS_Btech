import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit2,
  FiLogIn,
  FiLogOut,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUserCheck
} from 'react-icons/fi'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import { PortalDialog } from '../../components/portals/PortalUI.jsx'
import { getAuthStorage } from '../../auth/auth.js'
import './faculty-self-attendance.css'
import {
  calculateDuration,
  formatKeyDate,
  formatMinutesToDuration,
  formatTime12,
  pad,
  timeToMinutes
} from './facultySelfAttendanceCalculations.js'

// Generate realistic seed records for September and October 2026
const generateDefaultAttendanceRecords = () => {
  const records = {}
  const populateMonth = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${pad(month)}-${pad(day)}`
      const d = new Date(year, month - 1, day)
      const dayOfWeek = d.getDay() // 0 is Sun, 6 is Sat
      const isSunday = dayOfWeek === 0
      const isSaturday = dayOfWeek === 6
      const satCount = isSaturday ? Math.ceil(day / 7) : 0
      const isWeekend = isSunday || (isSaturday && (satCount === 2 || satCount === 4))

      if (isWeekend) {
        records[dateStr] = {
          date: dateStr,
          status: 'Weekend',
          checkIn: '',
          checkOut: '',
          remarks: isSunday ? 'Sunday Weekly Off' : 'Saturday Off'
        }
        continue
      }

      // Future days in October (after 27th)
      if (year === 2026 && month === 10 && day > 27) {
        records[dateStr] = {
          date: dateStr,
          status: 'Scheduled',
          checkIn: '',
          checkOut: '',
          remarks: 'Upcoming Working Day'
        }
        continue
      }

      // Today (27 Oct 2026) default
      if (year === 2026 && month === 10 && day === 27) {
        records[dateStr] = {
          date: dateStr,
          status: 'Checked In',
          checkIn: '09:10',
          checkOut: '',
          remarks: 'Regular Teaching & Labs'
        }
        continue
      }

      // Leave days
      if (month === 10 && day === 14) {
        records[dateStr] = { date: dateStr, status: 'On Leave', checkIn: '', checkOut: '', remarks: 'Casual Leave (Approved)' }
        continue
      }
      if (month === 9 && day === 18) {
        records[dateStr] = { date: dateStr, status: 'On Leave', checkIn: '', checkOut: '', remarks: 'Medical Leave (Approved)' }
        continue
      }

      // Late days
      if (month === 10 && day === 8) {
        records[dateStr] = { date: dateStr, status: 'Late', checkIn: '09:35', checkOut: '17:35', remarks: 'Traffic Delay' }
        continue
      }
      if (month === 9 && day === 7) {
        records[dateStr] = { date: dateStr, status: 'Late', checkIn: '09:40', checkOut: '17:40', remarks: 'Road Maintenance Delay' }
        continue
      }

      // Normal working day
      const inMin = 8 * 60 + 50 + (day % 14) // 8:50 - 9:04
      const outMin = 17 * 60 + 10 + (day % 22) // 17:10 - 17:32
      const inH = Math.floor(inMin / 60), inM = inMin % 60
      const outH = Math.floor(outMin / 60), outM = outMin % 60

      records[dateStr] = {
        date: dateStr,
        status: 'Present',
        checkIn: `${pad(inH)}:${pad(inM)}`,
        checkOut: `${pad(outH)}:${pad(outM)}`,
        remarks: 'Lectures, classes & department work'
      }
    }
  }

  populateMonth(2026, 9)
  populateMonth(2026, 10)
  return records
}

const STORAGE_KEY = 'btech_faculty_self_attendance_v1'

const loadStoredAttendance = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load attendance from localStorage:', err)
  }
  const initial = generateDefaultAttendanceRecords()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  } catch {
    /* ignore storage quota errors */
  }
  return initial
}

const saveStoredAttendance = records => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.error('Failed to save attendance to localStorage:', err)
  }
}

export function FacultySelfAttendancePage() {
  const [summaryTarget, setSummaryTarget] = useState(null)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <PortalLayout title="My Attendance">
      <main className="portal-page tf-page fsa-page">
        <header className="tf-heading">
          <div>
            <p className="portal-eyebrow">DIGITAL CAMPUS / TEACHING FACULTY</p>
            <h1>My Attendance</h1>
            <p>Track your daily check-in, check-out times, working hours, and review weekly and monthly attendance records.</p>
          </div>
          <div className="fsa-summary-anchor" ref={setSummaryTarget} />
        </header>
        <FacultySelfAttendance summaryTarget={summaryTarget} />
      </main>
    </PortalLayout>
  )
}

export default function FacultySelfAttendance({ data, summaryTarget }) {
  const [records, setRecords] = useState(loadStoredAttendance)
  const [currentDate] = useState(() => new Date('2026-10-27T10:25:00'))
  const [activeTab, setActiveTab] = useState('weekly') // 'weekly' | 'month' | 'prev-month'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [notice, setNotice] = useState('')

  // Today reference (October 27, 2026)
  const todayKey = formatKeyDate(currentDate)
  const todayRecord = records[todayKey] || {
    date: todayKey,
    status: 'Not Marked',
    checkIn: '',
    checkOut: '',
    remarks: ''
  }

  // Today's calculated working duration (calculated once when check-in & check-out exist)
  const todayDuration = useMemo(() => {
    if (todayRecord.checkIn && todayRecord.checkOut) {
      return calculateDuration(todayRecord.checkIn, todayRecord.checkOut)
    }
    return null
  }, [todayRecord])

  // Shift progress (based on 8 hours = 480 mins)
  const targetMinutes = 480
  const workedMinutes = todayDuration?.totalMinutes || 0
  const isShiftInProgress = todayRecord.status === 'Checked In' && !todayRecord.checkOut
  const shiftProgress = todayDuration
    ? Math.min(100, Math.round((workedMinutes / targetMinutes) * 100))
    : isShiftInProgress
    ? 50
    : 0

  // Check In Handler
  const handleCheckIn = () => {
    const now = new Date()
    const checkInTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    const isLate = timeToMinutes(checkInTime) > 9 * 60 + 30 // After 9:30 AM is Late

    const updated = {
      ...records,
      [todayKey]: {
        ...todayRecord,
        checkIn: checkInTime,
        checkOut: '',
        status: isLate ? 'Late' : 'Checked In',
        remarks: todayRecord.remarks || (isLate ? 'Checked in after 09:30 AM' : 'Checked in on time')
      }
    }
    setRecords(updated)
    saveStoredAttendance(updated)
    setNotice(`Successfully checked in at ${formatTime12(checkInTime)}. Working hours timer is active.`)
    setTimeout(() => setNotice(''), 5000)
  }

  // Check Out Handler
  const handleCheckOut = () => {
    const now = new Date()
    const checkOutTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    const inTime = todayRecord.checkIn || '09:10'
    const duration = calculateDuration(inTime, checkOutTime)

    let finalStatus = 'Present'
    if (duration && duration.totalMinutes < 240) {
      finalStatus = 'Half Day'
    } else if (todayRecord.status === 'Late') {
      finalStatus = 'Late'
    }

    const updated = {
      ...records,
      [todayKey]: {
        ...todayRecord,
        checkIn: inTime,
        checkOut: checkOutTime,
        status: finalStatus,
        remarks: todayRecord.remarks || `Worked ${duration?.verbose || ''}`
      }
    }
    setRecords(updated)
    saveStoredAttendance(updated)
    setNotice(`Successfully checked out at ${formatTime12(checkOutTime)}. Total working duration: ${duration?.verbose || '—'}.`)
    setTimeout(() => setNotice(''), 5000)
  }

  // Save manual edit
  const handleSaveEdit = updatedRow => {
    const updated = {
      ...records,
      [updatedRow.date]: updatedRow
    }
    setRecords(updated)
    saveStoredAttendance(updated)
    setSelectedRecord(null)
    setNotice(`Attendance record for ${updatedRow.date} updated successfully.`)
    setTimeout(() => setNotice(''), 4000)
  }

  // Reset today
  const handleResetToday = () => {
    const updated = {
      ...records,
      [todayKey]: {
        date: todayKey,
        status: 'Not Marked',
        checkIn: '',
        checkOut: '',
        remarks: ''
      }
    }
    setRecords(updated)
    saveStoredAttendance(updated)
    setNotice("Today's check-in/out record reset. You can check in again.")
    setTimeout(() => setNotice(''), 4000)
  }

  // Date generators for tabs
  // Week days: Monday 2026-10-26 to Sunday 2026-11-01
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate)
    const day = curr.getDay()
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(curr.setDate(diff))
    const list = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      list.push(formatKeyDate(d))
    }
    return list
  }, [currentDate])

  // Current Month days: October 2026 (1 to 31)
  const currentMonthDays = useMemo(() => {
    const list = []
    for (let d = 1; d <= 31; d++) {
      list.push(`2026-10-${pad(d)}`)
    }
    return list
  }, [])

  // Previous Month days: September 2026 (1 to 30)
  const previousMonthDays = useMemo(() => {
    const list = []
    for (let d = 1; d <= 30; d++) {
      list.push(`2026-09-${pad(d)}`)
    }
    return list
  }, [])

  // Active dates based on current tab
  const activeDateKeys = useMemo(() => {
    if (activeTab === 'weekly') return weekDays
    if (activeTab === 'month') return currentMonthDays
    return previousMonthDays
  }, [activeTab, weekDays, currentMonthDays, previousMonthDays])

  // Filtered rows for the table
  const activeRows = useMemo(() => {
    return activeDateKeys.map(dateKey => {
      const row = records[dateKey] || {
        date: dateKey,
        status: 'Not Marked',
        checkIn: '',
        checkOut: '',
        remarks: ''
      }
      const dur = calculateDuration(row.checkIn, row.checkOut)
      return {
        ...row,
        duration: dur
      }
    })
  }, [activeDateKeys, records])

  // Apply search and status filter
  const displayedRows = useMemo(() => {
    return activeRows.filter(row => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesDate = row.date.includes(q)
        const matchesStatus = row.status.toLowerCase().includes(q)
        const matchesRemarks = (row.remarks || '').toLowerCase().includes(q)
        if (!matchesDate && !matchesStatus && !matchesRemarks) return false
      }
      return true
    })
  }, [activeRows, statusFilter, search])
  const pageCount = Math.max(1, Math.ceil(displayedRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * pageSize
  const pagedRows = displayedRows.slice(pageStart, pageStart + pageSize)


  // Summary Metrics calculations for active view
  const summaryMetrics = useMemo(() => {
    let workingDays = 0
    let presentDays = 0
    let lateDays = 0
    let leaveDays = 0
    let totalMinutesWorked = 0

    activeRows.forEach(row => {
      if (row.status !== 'Weekend' && row.status !== 'Scheduled') {
        workingDays++
      }
      if (row.status === 'Present' || row.status === 'Checked In') {
        presentDays++
      }
      if (row.status === 'Late') {
        lateDays++
      }
      if (row.status === 'On Leave' || row.status === 'Leave') {
        leaveDays++
      }
      if (row.duration?.totalMinutes) {
        totalMinutesWorked += row.duration.totalMinutes
      } else if (row.date === todayKey && todayDuration?.totalMinutes) {
        totalMinutesWorked += todayDuration.totalMinutes
      }
    })

    const countedPresent = presentDays + lateDays
    const avgDailyMinutes = countedPresent > 0 ? Math.round(totalMinutesWorked / countedPresent) : 0
    const attendancePercent = workingDays > 0 ? Math.min(100, Math.round((countedPresent / workingDays) * 100)) : 0

    return {
      workingDays,
      presentDays,
      lateDays,
      leaveDays,
      totalDurationFormatted: formatMinutesToDuration(totalMinutesWorked),
      avgDailyFormatted: formatMinutesToDuration(avgDailyMinutes),
      attendancePercent
    }
  }, [activeRows, todayKey, todayDuration])

  // CSV Export Handler
  const handleExportCsv = () => {
    const filename = `my-attendance-${activeTab === 'weekly' ? 'week' : activeTab === 'month' ? 'oct-2026' : 'sep-2026'}.csv`
    const headers = ['Date', 'Day', 'Status', 'Check In', 'Check Out', 'Working Duration', 'Remarks']
    const cell = v => `"${String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`

    const rows = displayedRows.map(row => {
      const d = new Date(`${row.date}T00:00:00`)
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
      return [
        row.date,
        dayName,
        row.status,
        formatTime12(row.checkIn),
        formatTime12(row.checkOut),
        row.duration?.verbose || (row.date === todayKey ? todayDuration?.verbose : '—') || '—',
        row.remarks || ''
      ].map(cell).join(',')
    })

    const csvContent = [headers.map(cell).join(','), ...rows].join('\r\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const facultyName = data?.me?.fullName || getAuthStorage()?.getItem('btech-user-name') || 'Dr. Kavya Sharma'
  const facultyDesignation = data?.me?.designation || 'Teaching Faculty'
  const facultyDept = data?.me?.department || 'Electrical & Electronics Engineering'
  const facultyEmpId = data?.me?.employeeId || (data?.me?.id ? `EMP-2026-${String(data.me.id).padStart(4, '0')}` : 'EMP-2024-8842')

  const getInitials = name => {
    if (!name) return 'KS'
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }

  const summary = (
    <section className="fsa-compact-summary" aria-label="Attendance summary">
      <div className="fsa-summary-item" title={`${summaryMetrics.attendancePercent}% attendance rate`}>
        <div className="fsa-summary-icon tone-green">
          <FiCheckCircle aria-hidden="true" />
        </div>
        <div className="fsa-summary-content">
          <strong className="fsa-summary-present">
            {summaryMetrics.presentDays + summaryMetrics.lateDays} / {summaryMetrics.workingDays}
          </strong>
          <small>Days Present ({summaryMetrics.attendancePercent}%)</small>
        </div>
      </div>

      <div className="fsa-summary-item" title="Total calculated working time">
        <div className="fsa-summary-icon tone-blue">
          <FiClock aria-hidden="true" />
        </div>
        <div className="fsa-summary-content">
          <strong>{summaryMetrics.totalDurationFormatted}</strong>
          <small>Hours Worked</small>
        </div>
      </div>

      <div className="fsa-summary-item" title="Target: 8 hours per day">
        <div className="fsa-summary-icon tone-amber">
          <FiTrendingUp aria-hidden="true" />
        </div>
        <div className="fsa-summary-content">
          <strong>{summaryMetrics.avgDailyFormatted}</strong>
          <small>Daily Average</small>
        </div>
      </div>

      <div className="fsa-summary-item" title="Late days and approved leaves">
        <div className="fsa-summary-icon tone-purple">
          <FiCalendar aria-hidden="true" />
        </div>
        <div className="fsa-summary-content">
          <strong>{summaryMetrics.lateDays} Late · {summaryMetrics.leaveDays} Leaves</strong>
          <small>Exceptions / Leave</small>
        </div>
      </div>
    </section>
  )

  return (
    <div className="fsa-container">
      {summaryTarget ? createPortal(summary, summaryTarget) : summary}
      {notice && (
        <div className="fa-notice" role="status">
          <FiCheckCircle aria-hidden="true" /> {notice}
        </div>
      )}

      {/* Hero Today Punch & Real-time Calculation Card */}
      <section className="fsa-punch-card">
        {/* Left Section: Faculty Details, Status and Actions */}
        <div className="fsa-punch-main">
          {/* Faculty Profile Banner */}
          <div className="fsa-faculty-strip">
            <div className="fsa-faculty-avatar" aria-hidden="true">
              {getInitials(facultyName)}
            </div>
            <div className="fsa-faculty-meta">
              <div className="fsa-faculty-name-row">
                <h3 className="fsa-faculty-name">{facultyName}</h3>
                <span className="fsa-faculty-badge">Faculty Verified</span>
              </div>
              <p className="fsa-faculty-role">
                <span>{facultyDesignation}</span>
                <span className="fsa-dot-sep">·</span>
                <span>{facultyDept}</span>
                <span className="fsa-dot-sep">·</span>
                <span className="fsa-empid">{facultyEmpId}</span>
              </p>
            </div>
          </div>

          {/* Attendance date and punch status */}
          <div className="fsa-clock-display-box">
            <div className="fsa-clock-top">
              <div className="fsa-clock-status">
                {todayRecord.status === 'Checked In' && <span className="fsa-pulse-dot" />}
                <span className={`fsa-status-pill status-${todayRecord.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  <FiUserCheck aria-hidden="true" />
                  {todayRecord.status === 'Checked In'
                    ? 'Checked In · Shift Active'
                    : todayRecord.status === 'Present'
                    ? 'Shift Completed'
                    : todayRecord.status}
                </span>
              </div>
            </div>

            <div className="fsa-clock-date-line">
              <span className="fsa-clock-today-date">Tuesday, 27 October 2026</span>
              <span className="fsa-dot-sep">·</span>
              <span className="fsa-shift-window">Standard Shift: 09:00 AM – 05:00 PM (8h)</span>
            </div>
          </div>

          {/* Punch Actions */}
          <div className="fsa-punch-actions">
            <button
              type="button"
              className="fsa-btn fsa-btn-checkin"
              disabled={Boolean(todayRecord.checkIn)}
              onClick={handleCheckIn}
            >
              <FiLogIn aria-hidden="true" />
              {todayRecord.checkIn ? `Checked In (${formatTime12(todayRecord.checkIn)})` : 'Check In Now'}
            </button>

            <button
              type="button"
              className="fsa-btn fsa-btn-checkout"
              disabled={!todayRecord.checkIn || Boolean(todayRecord.checkOut)}
              onClick={handleCheckOut}
            >
              <FiLogOut aria-hidden="true" />
              {todayRecord.checkOut ? `Checked Out (${formatTime12(todayRecord.checkOut)})` : 'Check Out Now'}
            </button>

            <button
              type="button"
              className="fsa-btn fsa-btn-outline"
              onClick={() => setSelectedRecord({ ...todayRecord })}
              title="Manually adjust check-in / check-out times or add remarks"
            >
              <FiEdit2 aria-hidden="true" />
              Adjust Entry
            </button>

            {todayRecord.checkIn && (
              <button
                type="button"
                className="fsa-btn fsa-btn-outline fsa-btn-reset"
                onClick={handleResetToday}
                title="Reset today's punch for testing"
              >
                <FiRefreshCw aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Today's Shift Metrics & Progress */}
        <div className="fsa-punch-analytics">
          <div className="fsa-analytics-heading">
            <h4>Today's Shift Tracking</h4>
            <span className="fsa-node-tag">Biometric Node #04 · Online</span>
          </div>

          <div className="fsa-metrics-grid">
            <div className="fsa-metric-tile">
              <div className="fsa-metric-tile-icon tone-green">
                <FiLogIn aria-hidden="true" />
              </div>
              <div className="fsa-metric-tile-body">
                <small>Check In Time</small>
                <strong>{formatTime12(todayRecord.checkIn)}</strong>
                <span className="fsa-metric-sub">{todayRecord.checkIn ? 'Terminal Punch' : 'Awaiting Check-in'}</span>
              </div>
            </div>

            <div className="fsa-metric-tile">
              <div className="fsa-metric-tile-icon tone-amber">
                <FiLogOut aria-hidden="true" />
              </div>
              <div className="fsa-metric-tile-body">
                <small>Check Out Time</small>
                <strong>{todayRecord.checkOut ? formatTime12(todayRecord.checkOut) : todayRecord.checkIn ? 'In Progress' : '—'}</strong>
                <span className="fsa-metric-sub">{todayRecord.checkOut ? 'Punch Completed' : todayRecord.checkIn ? 'Shift Active' : 'Pending'}</span>
              </div>
            </div>

            <div className="fsa-metric-tile highlight">
              <div className="fsa-metric-tile-icon tone-blue">
                <FiClock aria-hidden="true" />
              </div>
              <div className="fsa-metric-tile-body">
                <small>Calculated Work Time</small>
                <strong>{todayDuration ? todayDuration.formatted : isShiftInProgress ? 'Shift In Progress' : '0h 00m'}</strong>
                <span className="fsa-metric-sub">{todayDuration ? todayDuration.verbose : isShiftInProgress ? 'Check out to finalize' : '0 mins logged'}</span>
              </div>
            </div>

            <div className="fsa-metric-tile">
              <div className="fsa-metric-tile-icon tone-purple">
                <FiTrendingUp aria-hidden="true" />
              </div>
              <div className="fsa-metric-tile-body">
                <small>Daily Shift Goal</small>
                <strong>8 hrs 00 mins</strong>
                <span className="fsa-metric-sub">Standard Faculty Shift</span>
              </div>
            </div>
          </div>

          {/* Daily Shift Target Completion */}
          <div className="fsa-shift-progress-card">
            <div className="fsa-shift-progress-header">
              <span>Shift Target Progress</span>
              <strong>
                {todayDuration
                  ? `${workedMinutes}m / 480m (${shiftProgress}%)`
                  : isShiftInProgress
                  ? 'Shift In Progress · Live Active'
                  : '0m / 480m (0%)'}
              </strong>
            </div>
            <div className="fsa-progress-bar-bg">
              <div
                className="fsa-progress-bar-fill"
                style={{
                  width: `${shiftProgress}%`,
                  background: shiftProgress >= 100
                    ? 'linear-gradient(90deg, #16804e, #10b981)'
                    : 'linear-gradient(90deg, #174c88, #2563eb)'
                }}
              />
            </div>
            <div className="fsa-progress-bar-footer">
              <span>Standard Shift: 09:00 AM – 05:00 PM</span>
              <span>{shiftProgress >= 100 ? 'Full Shift Completed ✓' : `${Math.max(0, 480 - workedMinutes)}m remaining to target`}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Card with Tabs: Weekly, Month, Previous Month */}
      <section className="fsa-nav-card">
        <div className="fsa-tabs-row">
          <div className="fsa-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'weekly'}
              className={`fsa-tab-btn ${activeTab === 'weekly' ? 'is-active' : ''}`}
              onClick={() => { setPage(1); setActiveTab('weekly'); setSearch(''); setStatusFilter('ALL') }}
            >
              <FiCalendar aria-hidden="true" />
              <span>This Week</span>
              <span className="fsa-tab-badge">26 Oct – 01 Nov</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'month'}
              className={`fsa-tab-btn ${activeTab === 'month' ? 'is-active' : ''}`}
              onClick={() => { setPage(1); setActiveTab('month'); setSearch(''); setStatusFilter('ALL') }}
            >
              <FiClock aria-hidden="true" />
              <span>This Month</span>
              <span className="fsa-tab-badge">October 2026</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'prev-month'}
              className={`fsa-tab-btn ${activeTab === 'prev-month' ? 'is-active' : ''}`}
              onClick={() => { setPage(1); setActiveTab('prev-month'); setSearch(''); setStatusFilter('ALL') }}
            >
              <FiCalendar aria-hidden="true" />
              <span>Previous Month</span>
              <span className="fsa-tab-badge">September 2026</span>
            </button>
          </div>

          <div className="fsa-tab-actions">
            <button
              type="button"
              className="tf-button fa-button"
              onClick={() => window.print()}
              title="Print attendance report"
            >
              <FiPrinter aria-hidden="true" />
              Print
            </button>
            <button
              type="button"
              className="tf-button fa-button fa-button-primary"
              onClick={handleExportCsv}
              title="Download CSV report of current attendance records"
            >
              <FiDownload aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Weekly Day Cards (Only shown in Weekly tab) */}
        {activeTab === 'weekly' && (
          <div className="fsa-week-grid">
            {weekDays.map(dateKey => {
              const d = new Date(`${dateKey}T00:00:00`)
              const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
              const isToday = dateKey === todayKey
              const r = records[dateKey] || { status: 'Not Marked', checkIn: '', checkOut: '' }
              const dur = calculateDuration(r.checkIn, r.checkOut)

              return (
                <div key={dateKey} className={`fsa-week-day-card ${isToday ? 'is-today' : ''}`}>
                  <div className="fsa-week-day-header">
                    <span className="fsa-week-day-name">{dayName}</span>
                    <span className="fsa-week-day-num">
                      {d.getDate()} {isToday && <span className="fsa-week-today-tag">TODAY</span>}
                    </span>
                  </div>

                  <div className="fsa-week-day-times">
                    <div>
                      <span>In:</span>
                      <strong>{r.checkIn ? formatTime12(r.checkIn) : '—'}</strong>
                    </div>
                    <div>
                      <span>Out:</span>
                      <strong>{r.checkOut ? formatTime12(r.checkOut) : isToday && r.checkIn ? 'In Progress' : '—'}</strong>
                    </div>
                  </div>

                  <div className="fsa-week-day-footer">
                    <span className={`fsa-status-pill status-${r.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                      {r.status}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                      {dur?.formatted || (isToday && todayDuration?.formatted) || '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Search and Filters */}
        <div className="fsa-toolbar">
          <div className="fsa-search-filter">
            <div className="fsa-search-input-wrap">
              <FiSearch aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
              <input
                type="search"
                placeholder="Search date, status or remarks..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                aria-label="Search records"
              />
            </div>

            <select
              className="fsa-filter-select"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Checked In">Checked In</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="On Leave">On Leave</option>
              <option value="Weekend">Weekend</option>
            </select>
          </div>

          <div className="fsa-quick-filter-chips">
            {['ALL', 'Present', 'Late', 'On Leave'].map(st => (
              <button
                key={st}
                type="button"
                className={`fsa-chip-btn ${statusFilter === st ? 'is-active' : ''}`}
                onClick={() => { setStatusFilter(st); setPage(1) }}
              >
                {st === 'ALL' ? 'All Records' : st}
              </button>
            ))}
          </div>

          <span className="fsa-records-count">
            {displayedRows.length} matching records
          </span>
        </div>

        {/* Detailed Attendance Records Table */}
        <div className="fsa-table-wrap">
          <table className="fsa-table">
            <thead>
              <tr>
                <th scope="col">Date & Day</th>
                <th scope="col">Status</th>
                <th scope="col">Check In</th>
                <th scope="col">Check Out</th>
                <th scope="col">Working Hours</th>
                <th scope="col">Remarks</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.length > 0 ? (
                pagedRows.map(row => {
                  const d = new Date(`${row.date}T00:00:00`)
                  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
                  const isToday = row.date === todayKey
                  const effectiveDuration = row.duration || (isToday ? todayDuration : null)

                  return (
                    <tr key={row.date} className={isToday ? 'is-today-row' : ''}>
                      <td>
                        <div className="fsa-date-cell">
                          <strong>
                            {row.date}
                            {isToday && <span className="fsa-tag-today">TODAY</span>}
                          </strong>
                          <small>{dayName}</small>
                        </div>
                      </td>

                      <td>
                        <span className={`fsa-status-pill status-${row.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {row.status}
                        </span>
                      </td>

                      <td>
                        <span className="fsa-time-val">{formatTime12(row.checkIn)}</span>
                      </td>

                      <td>
                        <span className="fsa-time-val">
                          {row.checkOut ? formatTime12(row.checkOut) : isToday && row.checkIn ? 'In Progress' : '—'}
                        </span>
                      </td>

                      <td>
                        {effectiveDuration ? (
                          <span className={`fsa-duration-badge ${effectiveDuration.totalMinutes >= 480 ? 'is-full' : 'is-short'}`}>
                            <FiClock aria-hidden="true" />
                            {effectiveDuration.verbose}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      <td style={{ maxWidth: '240px', overflowWrap: 'break-word' }}>
                        {row.remarks || '—'}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="tf-button fa-button"
                          style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => setSelectedRecord({ ...row })}
                          title={`Edit attendance entry for ${row.date}`}
                        >
                          <FiEdit2 aria-hidden="true" /> Edit
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="fsa-empty">
                    No attendance records found matching your filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="fsa-pagination">
          <div className="fsa-pagination-info"><label>Rows per page<select aria-label="Attendance rows per page" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>{[5, 10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label><span role="status">{displayedRows.length ? pageStart + 1 : 0}?{Math.min(pageStart + pageSize, displayedRows.length)} of {displayedRows.length} records</span></div>
          <nav aria-label="Attendance table pages"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button type="button" key={number} aria-label={'Page ' + number} aria-current={currentPage === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}<button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></nav>
        </footer>
      </section>

      {/* Manual Entry / Adjustment Dialog */}
      {selectedRecord && (
        <PortalDialog
          title={`Edit Attendance Entry · ${selectedRecord.date}`}
          onClose={() => setSelectedRecord(null)}
        >
          <form
            className="fsa-edit-form"
            onSubmit={e => {
              e.preventDefault()
              handleSaveEdit(selectedRecord)
            }}
          >
            <div className="fsa-form-group">
              <label>Attendance Status</label>
              <select
                value={selectedRecord.status}
                onChange={e => setSelectedRecord({ ...selectedRecord, status: e.target.value })}
              >
                <option value="Present">Present</option>
                <option value="Checked In">Checked In</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Weekend">Weekend</option>
                <option value="Not Marked">Not Marked</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="fsa-form-group">
                <label>Check In Time (24h)</label>
                <input
                  type="time"
                  value={selectedRecord.checkIn || ''}
                  onChange={e => setSelectedRecord({ ...selectedRecord, checkIn: e.target.value })}
                />
              </div>

              <div className="fsa-form-group">
                <label>Check Out Time (24h)</label>
                <input
                  type="time"
                  value={selectedRecord.checkOut || ''}
                  onChange={e => setSelectedRecord({ ...selectedRecord, checkOut: e.target.value })}
                />
              </div>
            </div>

            {selectedRecord.checkIn && selectedRecord.checkOut && (
              <div className="fsa-calc-preview">
                <span>Calculated Working Hours:</span>
                <strong>
                  {calculateDuration(selectedRecord.checkIn, selectedRecord.checkOut)?.verbose || 'Invalid times'}
                </strong>
              </div>
            )}

            <div className="fsa-form-group">
              <label>Remarks / Notes</label>
              <textarea
                placeholder="e.g. Regular theory lectures & mentoring session"
                value={selectedRecord.remarks || ''}
                onChange={e => setSelectedRecord({ ...selectedRecord, remarks: e.target.value })}
              />
            </div>

            <div className="portal-actions">
              <button type="button" onClick={() => setSelectedRecord(null)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Save Attendance Record
              </button>
            </div>
          </form>
        </PortalDialog>
      )}
    </div>
  )
}
