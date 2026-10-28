import { useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEye,
  FiFileText,
  FiFilter,
  FiInfo,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiUserCheck,
  FiX,
} from 'react-icons/fi'
import {
  MONTHLY_ATTENDANCE_DATA,
  STAFF_USER,
  computeAttendanceStats,
} from './staffSampleData.js'
import './staff-portal.css'

export default function StaffAttendance() {
  // Selected Month: '2026-10' | '2026-09'
  const [selectedMonthKey, setSelectedMonthKey] = useState('2026-10')

  // Today Card interactive punch state
  const [todayPunch, setTodayPunch] = useState({
    checkedIn: true,
    checkInTime: '08:28 AM',
    checkedOut: false,
    checkOutTime: '',
    workedHours: '',
  })

  // Selected day for modal dialog
  const [selectedDayRecord, setSelectedDayRecord] = useState(null)

  // Status Filter for daily records table: 'ALL' | 'Present' | 'Late' | 'Absent' | 'Leave' | 'Holiday'
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('')

  const showToast = msg => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Active Month Data
  const currentMonthData = MONTHLY_ATTENDANCE_DATA[selectedMonthKey] || MONTHLY_ATTENDANCE_DATA['2026-10']

  // Summary stats computed dynamically from counts
  const summaryStats = useMemo(() => {
    return computeAttendanceStats(currentMonthData.counts)
  }, [currentMonthData])

  // Month navigation
  const availableMonths = Object.keys(MONTHLY_ATTENDANCE_DATA)
  const currentMonthIdx = availableMonths.indexOf(selectedMonthKey)

  const handlePrevMonth = () => {
    if (currentMonthIdx < availableMonths.length - 1) {
      setSelectedMonthKey(availableMonths[currentMonthIdx + 1])
    }
  }

  const handleNextMonth = () => {
    if (currentMonthIdx > 0) {
      setSelectedMonthKey(availableMonths[currentMonthIdx - 1])
    }
  }

  // Today Card Handlers
  const handleCheckIn = () => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    setTodayPunch(prev => ({
      ...prev,
      checkedIn: true,
      checkInTime: timeStr,
    }))
    showToast(`Checked in successfully at ${timeStr} (Chemistry Lab 102).`)
  }

  const handleCheckOut = () => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    setTodayPunch(prev => ({
      ...prev,
      checkedOut: true,
      checkOutTime: timeStr,
      workedHours: '8h 04m',
    }))
    showToast(`Checked out at ${timeStr}. Today's worked hours: 8h 04m.`)
  }

  // Calendar Day Status helper
  const getDayStatusClass = status => {
    switch (status) {
      case 'Present':
        return 'status-present'
      case 'Late':
        return 'status-late'
      case 'Absent':
        return 'status-absent'
      case 'Leave':
        return 'status-leave'
      case 'Holiday':
        return 'status-holiday'
      case 'Weekly off':
        return 'status-weekly-off'
      default:
        return ''
    }
  }

  // Filtered daily records
  const filteredRecords = useMemo(() => {
    if (statusFilter === 'ALL') return currentMonthData.records
    return currentMonthData.records.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase())
  }, [currentMonthData, statusFilter])

  // Calendar Days generator (Empty placeholders + days of month)
  const calendarCells = useMemo(() => {
    const cells = []
    // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // We want Monday as column 0, so (firstDayOfWeek + 6) % 7
    const offset = (currentMonthData.firstDayOfWeek + 6) % 7

    for (let i = 0; i < offset; i++) {
      cells.push({ empty: true, key: `empty-${i}` })
    }

    for (let day = 1; day <= currentMonthData.totalDays; day++) {
      const record = currentMonthData.records.find(r => r.dayNum === day)
      cells.push({
        empty: false,
        key: `day-${day}`,
        dayNum: day,
        record: record || {
          date: `${currentMonthData.monthKey}-${String(day).padStart(2, '0')}`,
          day: 'Day',
          dayNum: day,
          checkIn: '—',
          checkOut: '—',
          hours: '—',
          status: 'Present',
          remarks: 'Scheduled regular duty',
        },
      })
    }
    return cells
  }, [currentMonthData])

  return (
    <div className="sp-page">
      {/* Page Header */}
      <header className="sp-heading">
        <div>
          <p className="sp-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>My Attendance</h1>
          <p>
            Review biometric punch-in logs, track shift hours, inspect the monthly
            calendar, and verify attendance percentages.
          </p>
        </div>

      </header>

      <div className="sp-dashboard">
          {/* 1. Today Card */}
          <section className="sp-today-card">
            <div className="sp-today-left">
              <span className="sp-today-badge">
                <FiClock /> Today's Shift
              </span>
              <h2 className="sp-today-date">Tuesday, 27 October 2026</h2>
              <div className="sp-today-shift">
                <FiMapPin />
                <span>Morning Shift (08:30 AM – 04:30 PM) · Chemistry Lab 102</span>
              </div>
            </div>

            <div className="sp-today-right">
              {/* Live punch state display */}
              <div className="sp-punch-status-box">
                <span>Check-in Status</span>
                <strong>
                  {todayPunch.checkedIn ? `Checked In · ${todayPunch.checkInTime}` : 'Not Checked In'}
                </strong>
                {todayPunch.checkedOut && (
                  <span style={{ color: 'var(--brand)', fontWeight: '600' }}>
                    Checked Out · {todayPunch.checkOutTime}
                  </span>
                )}
              </div>

              {/* Worked hours pill */}
              {todayPunch.checkedOut && (
                <div className="sp-worked-hours-pill">
                  <FiClock />
                  <span>Worked: {todayPunch.workedHours}</span>
                </div>
              )}

              {/* Punch Actions: Check-in / Check-out */}
              <div className="sp-punch-actions">
                <button
                  type="button"
                  className="sp-btn-punch-in"
                  disabled={todayPunch.checkedIn}
                  onClick={handleCheckIn}
                >
                  <FiLogIn />
                  {todayPunch.checkedIn ? 'Checked In' : 'Check In'}
                </button>

                <button
                  type="button"
                  className="sp-btn-punch-out"
                  disabled={!todayPunch.checkedIn || todayPunch.checkedOut}
                  onClick={handleCheckOut}
                  title={!todayPunch.checkedIn ? 'Complete Check-In first' : todayPunch.checkedOut ? 'Already checked out today' : 'Check out now'}
                >
                  <FiLogOut />
                  {todayPunch.checkedOut ? 'Checked Out' : 'Check Out'}
                </button>
              </div>
            </div>
          </section>

          {/* 2. Month Selector Toolbar */}
          <div className="sp-month-toolbar">
            <div className="sp-month-controls">
              <button
                type="button"
                className="sp-month-btn"
                onClick={handlePrevMonth}
                disabled={currentMonthIdx >= availableMonths.length - 1}
                aria-label="Previous Month"
                title="Previous Month"
              >
                <FiChevronLeft />
              </button>

              <select
                className="sp-month-select"
                value={selectedMonthKey}
                onChange={e => setSelectedMonthKey(e.target.value)}
                aria-label="Select month"
              >
                {availableMonths.map(key => (
                  <option key={key} value={key}>
                    {MONTHLY_ATTENDANCE_DATA[key].monthLabel}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="sp-month-btn"
                onClick={handleNextMonth}
                disabled={currentMonthIdx <= 0}
                aria-label="Next Month"
                title="Next Month"
              >
                <FiChevronRight />
              </button>
            </div>

            {/* Attendance Percentage calculated from counts for selected month */}
            <div className="sp-month-pct-chip">
              <FiUserCheck />
              <span>{currentMonthData.monthLabel} Attendance:</span>
              <strong>{summaryStats.percentage}</strong>
            </div>
          </div>

          {/* 3. Four Summary Cards */}
          <div className="sp-att-summary-grid">
            {/* Present Card */}
            <article className="sp-att-card is-present">
              <div className="sp-att-card-icon">
                <FiCheckCircle />
              </div>
              <div className="sp-att-card-body">
                <span className="sp-att-card-label">Present</span>
                <strong className="sp-att-card-value">
                  {currentMonthData.counts.present}
                </strong>
                <span className="sp-att-card-sub">Regular working days</span>
              </div>
            </article>

            {/* Late Card */}
            <article className="sp-att-card is-late">
              <div className="sp-att-card-icon">
                <FiClock />
              </div>
              <div className="sp-att-card-body">
                <span className="sp-att-card-label">Late Arrival</span>
                <strong className="sp-att-card-value">
                  {currentMonthData.counts.late}
                </strong>
                <span className="sp-att-card-sub">Recorded after 08:40 AM</span>
              </div>
            </article>

            {/* Absent Card */}
            <article className="sp-att-card is-absent">
              <div className="sp-att-card-icon">
                <FiAlertCircle />
              </div>
              <div className="sp-att-card-body">
                <span className="sp-att-card-label">Absent</span>
                <strong className="sp-att-card-value">
                  {currentMonthData.counts.absent}
                </strong>
                <span className="sp-att-card-sub">Unrecorded absences</span>
              </div>
            </article>

            {/* Leave Card */}
            <article className="sp-att-card is-leave">
              <div className="sp-att-card-icon">
                <FiCalendar />
              </div>
              <div className="sp-att-card-body">
                <span className="sp-att-card-label">Approved Leave</span>
                <strong className="sp-att-card-value">
                  {currentMonthData.counts.leave}
                </strong>
                <span className="sp-att-card-sub">Casual / Sick / Earned</span>
              </div>
            </article>
          </div>

          {/* 4. Monthly Calendar Grid */}
          <section className="sp-calendar-box">
            <header className="sp-card-header">
              <div>
                <h3>
                  <FiCalendar style={{ color: 'var(--brand)' }} /> Monthly Attendance Calendar
                </h3>
                <p>
                  Color-coded daily status for {currentMonthData.monthLabel}. Click any day to view details.
                </p>
              </div>
              <span className="sp-profile-id-chip">
                {currentMonthData.records.length} Recorded Days
              </span>
            </header>

                {/* Weekday Labels (Mon - Sun) */}
                <div className="sp-calendar-header-row">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="sp-cal-weekday">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 7-column Calendar Cells */}
                <div className="sp-cal-grid">
                  {calendarCells.map(cell => {
                    if (cell.empty) {
                      return <div key={cell.key} className="sp-cal-day-cell is-empty" />
                    }

                    const rec = cell.record
                    const statusClass = getDayStatusClass(rec.status)
                    const isToday = rec.date === '2026-10-27'

                    return (
                      <div
                        key={cell.key}
                        className={`sp-cal-day-cell ${statusClass} ${isToday ? 'is-today-marker' : ''}`}
                        onClick={() => setSelectedDayRecord(rec)}
                        title={`Day ${cell.dayNum}: ${rec.status} · Click for details`}
                      >
                        <div className="sp-cal-day-top">
                          <span className="sp-cal-day-num">{cell.dayNum}</span>
                          <span className="sp-cal-status-dot" aria-hidden="true" />
                        </div>
                        <span className="sp-cal-day-meta">{rec.status}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="sp-cal-legend">
                  <div className="sp-legend-item">
                    <span className="sp-legend-dot is-present" />
                    <span>Present</span>
                  </div>
                  <div className="sp-legend-item">
                    <span className="sp-legend-dot is-late" />
                    <span>Late</span>
                  </div>
                  <div className="sp-legend-item">
                    <span className="sp-legend-dot is-absent" />
                    <span>Absent</span>
                  </div>
                  <div className="sp-legend-item">
                    <span className="sp-legend-dot is-leave" />
                    <span>Leave</span>
                  </div>
                  <div className="sp-legend-item">
                    <span className="sp-legend-dot is-holiday" />
                    <span>Holiday</span>
                  </div>
                  <div className="sp-legend-item">
                    <span className="sp-legend-dot is-weekly-off" />
                    <span>Weekly Off</span>
                  </div>
                </div>
          </section>

          {/* 5. Daily Records Table with Status Filter */}
          <section className="sp-card">
            <header className="sp-card-header">
              <div>
                <h3>
                  <FiFileText style={{ color: 'var(--brand)' }} /> Daily Attendance Records
                </h3>
                <p>Complete log of punch times, worked hours and session remarks</p>
              </div>
              <span className="sp-profile-id-chip">
                {filteredRecords.length} Entries
              </span>
            </header>

            {/* Filter Pills */}
            <div className="sp-filter-toolbar">
              <div className="sp-filter-pills">
                {['ALL', 'Present', 'Late', 'Absent', 'Leave', 'Holiday'].map(st => (
                  <button
                    key={st}
                    type="button"
                    className={`sp-filter-pill ${statusFilter === st ? 'is-active' : ''}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {filteredRecords.length === 0 ? (
              <div className="sp-empty-box">
                <FiClock />
                <h4>No Records Found</h4>
                <p>No daily records match the selected status filter for {currentMonthData.monthLabel}.</p>
              </div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Day</th>
                      <th scope="col">Check-In</th>
                      <th scope="col">Check-Out</th>
                      <th scope="col">Hours</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(row => (
                      <tr key={row.date}>
                        <td>
                          <strong>{row.date}</strong>
                        </td>
                        <td>{row.day}</td>
                        <td>{row.checkIn}</td>
                        <td>{row.checkOut}</td>
                        <td>{row.hours}</td>
                        <td>
                          <span
                            className={`sp-status-chip is-${row.status
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="sp-doc-action-btn"
                            onClick={() => setSelectedDayRecord(row)}
                            title="View punch session details"
                          >
                            <FiEye /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
      </div>

      {/* Day Attendance Detail Dialog Modal */}
      {selectedDayRecord && (
        <dialog className="portal-dialog" open style={{ zIndex: 9999 }}>
          <header>
            <h2>Attendance Record Details</h2>
            <button
              type="button"
              onClick={() => setSelectedDayRecord(null)}
              aria-label="Close dialog"
            >
              <FiX />
            </button>
          </header>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span
              className={`sp-status-chip is-${selectedDayRecord.status
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              style={{ fontSize: '11px', padding: '4px 12px' }}
            >
              {selectedDayRecord.status}
            </span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              {selectedDayRecord.day}, {selectedDayRecord.date}
            </strong>
          </div>

          <div className="portal-profile" style={{ margin: '14px 0' }}>
            <div>
              <dt>Check-In Timestamp</dt>
              <dd>{selectedDayRecord.checkIn}</dd>
            </div>
            <div>
              <dt>Check-Out Timestamp</dt>
              <dd>{selectedDayRecord.checkOut}</dd>
            </div>
            <div>
              <dt>Total Worked Duration</dt>
              <dd>{selectedDayRecord.hours}</dd>
            </div>
            <div>
              <dt>Assigned Work Shift</dt>
              <dd>Morning (08:30 AM – 04:30 PM)</dd>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <dt>Session Remarks & Justification</dt>
              <dd>{selectedDayRecord.remarks}</dd>
            </div>
          </div>

          <div className="portal-actions">
            <button
              type="button"
              className="primary"
              onClick={() => setSelectedDayRecord(null)}
            >
              Close
            </button>
          </div>
        </dialog>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="sp-toast" role="status">
          <FiCheck />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
