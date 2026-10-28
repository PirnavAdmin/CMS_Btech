import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiAlertCircle,
  FiArrowRight,
  FiBell,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiInbox,
  FiMapPin,
  FiUser,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import {
  getDashboardMetrics,
  RECENT_NOTICES,
  STAFF_USER,
  TODAY_DUTIES,
  UPCOMING_MEETINGS,
} from './staffSampleData.js'
import './staff-portal.css'

export default function StaffDashboard() {
  const navigate = useNavigate()

  // Interactive local states
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [quickLeaveOpen, setQuickLeaveOpen] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const showToast = msg => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleMarkAttendance = () => {
    if (attendanceMarked) {
      showToast('Attendance already recorded for today at 08:30 AM.')
      return
    }
    setAttendanceMarked(true)
    showToast('Success: Check-in recorded at 08:30 AM (Chemistry Lab 102).')
  }

  return (
    <div className="sp-page">
      {/* Page Header */}
      <header className="sp-heading">
        <div>
          <p className="sp-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>Dashboard</h1>
          <p>
            Welcome back, {STAFF_USER.name}. Review your shifts, pending lab
            operations, circulars and campus meetings.
          </p>
        </div>
      </header>

      <div className="sp-dashboard">
          {/* Welcome Card */}
          <section className="sp-welcome-card">
            <div className="sp-welcome-content">
              <div className="sp-welcome-greeting">
                <h2>Welcome back, {STAFF_USER.name}</h2>
                <span className="sp-chip-role">{STAFF_USER.designation}</span>
              </div>

              <div className="sp-welcome-line">
                <FiClock aria-hidden="true" />
                <span>Chemistry Lab · Morning shift</span>
              </div>

              <div className="sp-welcome-actions">
                <button
                  type="button"
                  className="sp-btn-primary"
                  onClick={handleMarkAttendance}
                >
                  <FiCheckCircle />
                  {attendanceMarked ? 'Attendance Marked (08:30 AM)' : 'Mark Attendance'}
                </button>

                <button
                  type="button"
                  className="sp-btn-secondary"
                  onClick={() => setQuickLeaveOpen(true)}
                >
                  <FiCalendar />
                  Apply Leave
                </button>

                <Link className="sp-link-action" to="/staff-portal/duty-roster">
                  View my duty roster <FiArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>

            <img
              src="/university-campus.svg"
              alt=""
              aria-hidden="true"
              className="sp-welcome-art"
            />
          </section>

          {/* Four Metric Tiles */}
          <div className="sp-tiles">
            {getDashboardMetrics().map(tile => {
              const Icon =
                tile.key === 'duties'
                  ? FiClock
                  : tile.key === 'tasks'
                  ? FiCheckCircle
                  : tile.key === 'leave'
                  ? FiCalendar
                  : FiUserCheck

              return (
                <Link
                  key={tile.key}
                  to={tile.link}
                  className={`sp-tile sp-tone-${tile.tone}`}
                >
                  <div className="sp-tile-icon">
                    <Icon aria-hidden="true" />
                  </div>
                  <div className="sp-tile-body">
                    <span className="sp-tile-title">{tile.title}</span>
                    <div className="sp-tile-value">
                      <strong>{tile.value}</strong>
                      {tile.unit && <span>{tile.unit}</span>}
                    </div>
                    <span className="sp-tile-subtext" title={tile.subtext}>
                      {tile.subtext}
                    </span>
                  </div>
                  <FiArrowRight className="sp-tile-arrow" aria-hidden="true" />
                </Link>
              )
            })}
          </div>

          {/* Three Lists */}
          <div className="sp-lists-grid">
            {/* List 1: Today's Duty Roster */}
            <section className="sp-card">
              <header className="sp-card-header">
                <div>
                  <h3>
                    <FiClock style={{ color: 'var(--brand)' }} /> Today's Duty Roster
                  </h3>
                  <p>Scheduled lab duties, practicals & store checks</p>
                </div>
                <Link to="/staff-portal/duty-roster" className="sp-card-link">
                  Full Roster <FiArrowRight />
                </Link>
              </header>

                <div className="sp-duty-list">
                  {TODAY_DUTIES.map(duty => (
                    <article key={duty.id} className="sp-duty-item">
                      <div className="sp-duty-time">
                        <span>{duty.time.split('–')[0].trim()}</span>
                        <small>to {duty.time.split('–')[1]?.trim()}</small>
                      </div>

                      <div className="sp-duty-info">
                        <h4>{duty.title}</h4>
                        <div className="sp-duty-meta">
                          <span>
                            <FiMapPin /> {duty.room}
                          </span>
                          <span>
                            <FiUser /> In-charge: {duty.inCharge}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`sp-duty-badge is-${duty.status
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        {duty.status}
                      </span>
                    </article>
                  ))}
                </div>
            </section>

            {/* List 2: Recent Notices */}
            <section className="sp-card">
              <header className="sp-card-header">
                <div>
                  <h3>
                    <FiBell style={{ color: '#d97706' }} /> Recent Notices
                  </h3>
                  <p>Administrative and safety circulars</p>
                </div>
                <Link to="/staff-portal/notices" className="sp-card-link">
                  View All <FiArrowRight />
                </Link>
              </header>

                <div className="sp-notice-list">
                  {RECENT_NOTICES.map(notice => (
                    <article
                      key={notice.id}
                      className="sp-notice-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedNotice(notice)}
                      title="Click to view details"
                    >
                      <div className="sp-notice-top">
                        <h4>{notice.title}</h4>
                        <span className="sp-notice-date">{notice.date}</span>
                      </div>
                      <p className="sp-notice-preview">{notice.preview}</p>
                      <div className="sp-notice-footer">
                        <span className="sp-notice-dept">{notice.department}</span>
                        <span
                          className={`sp-priority-tag is-${notice.priority.toLowerCase()}`}
                        >
                          {notice.priority}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
            </section>

            {/* List 3: Upcoming Meetings and Events */}
            <section className="sp-card sp-full-card">
              <header className="sp-card-header">
                <div>
                  <h3>
                    <FiUsers style={{ color: '#0d9488' }} /> Upcoming Meetings and Events
                  </h3>
                  <p>Staff briefings, workshops, and college committee events</p>
                </div>
                <Link to="/staff-portal/meetings-events" className="sp-card-link">
                  All Events <FiArrowRight />
                </Link>
              </header>

                <div className="sp-event-list">
                  {UPCOMING_MEETINGS.map(evt => (
                    <article
                      key={evt.id}
                      className="sp-event-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedEvent(evt)}
                      title="Click to view meeting agenda"
                    >
                      <div className="sp-event-date-box">
                        <strong>{evt.day}</strong>
                        <small>{evt.month}</small>
                      </div>

                      <div className="sp-event-info">
                        <h4>{evt.title}</h4>
                        <div className="sp-event-meta">
                          <span>
                            <FiClock /> {evt.time}
                          </span>
                          <span>
                            <FiMapPin /> {evt.room}
                          </span>
                          <span>
                            <FiUser /> {evt.organizer}
                          </span>
                        </div>
                      </div>

                      <span className="sp-event-type-badge">{evt.type}</span>
                    </article>
                  ))}
                </div>
            </section>
          </div>
      </div>

      {/* Quick Apply Leave Dialog */}
      {quickLeaveOpen && (
        <dialog className="portal-dialog" open style={{ zIndex: 9999 }}>
          <header>
            <h2>Apply for Leave</h2>
            <button
              type="button"
              onClick={() => setQuickLeaveOpen(false)}
              aria-label="Close dialog"
            >
              <FiX />
            </button>
          </header>
          <p>Submit a leave application for approval by your reporting officer.</p>
          <form
            onSubmit={e => {
              e.preventDefault()
              setQuickLeaveOpen(false)
              showToast('Leave application submitted for approval.')
            }}
          >
            <div className="portal-field">
              <label htmlFor="leave-type">Leave Type</label>
              <select id="leave-type" required defaultValue="Casual Leave">
                <option value="Casual Leave">Casual Leave (Balance: 6)</option>
                <option value="Sick Leave">Sick Leave (Balance: 5)</option>
                <option value="Earned Leave">Earned Leave (Balance: 3)</option>
              </select>
            </div>
            <div className="portal-filters">
              <div className="portal-field">
                <label htmlFor="leave-from">From Date</label>
                <input id="leave-from" type="date" required defaultValue="2026-10-28" />
              </div>
              <div className="portal-field">
                <label htmlFor="leave-to">To Date</label>
                <input id="leave-to" type="date" required defaultValue="2026-10-28" />
              </div>
            </div>
            <div className="portal-field">
              <label htmlFor="leave-reason">Reason</label>
              <textarea
                id="leave-reason"
                required
                rows={3}
                placeholder="Brief reason for leave request..."
              />
            </div>
            <div className="portal-actions">
              <button type="button" onClick={() => setQuickLeaveOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Submit Application
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Notice Detail Dialog */}
      {selectedNotice && (
        <dialog className="portal-dialog" open style={{ zIndex: 9999 }}>
          <header>
            <h2>{selectedNotice.title}</h2>
            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              aria-label="Close dialog"
            >
              <FiX />
            </button>
          </header>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>{selectedNotice.date}</span>
            <span>·</span>
            <span>{selectedNotice.department}</span>
            <span>·</span>
            <span className={`sp-priority-tag is-${selectedNotice.priority.toLowerCase()}`}>
              {selectedNotice.priority}
            </span>
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
            {selectedNotice.preview}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
            All non-teaching technical staff must sign the acknowledgment register at the department office before Friday noon.
          </p>
          <div className="portal-actions">
            <button type="button" className="primary" onClick={() => setSelectedNotice(null)}>
              Understood & Close
            </button>
          </div>
        </dialog>
      )}

      {/* Meeting Detail Dialog */}
      {selectedEvent && (
        <dialog className="portal-dialog" open style={{ zIndex: 9999 }}>
          <header>
            <h2>{selectedEvent.title}</h2>
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close dialog"
            >
              <FiX />
            </button>
          </header>
          <div className="portal-profile" style={{ margin: '14px 0' }}>
            <div>
              <dt>Date & Time</dt>
              <dd>{selectedEvent.day} {selectedEvent.month} · {selectedEvent.time}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{selectedEvent.room}</dd>
            </div>
            <div>
              <dt>Organized By</dt>
              <dd>{selectedEvent.organizer}</dd>
            </div>
            <div>
              <dt>Event Type</dt>
              <dd>{selectedEvent.type}</dd>
            </div>
          </div>
          <div className="portal-actions">
            <button type="button" className="primary" onClick={() => setSelectedEvent(null)}>
              Close
            </button>
          </div>
        </dialog>
      )}

      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className="sp-toast" role="status">
          <FiCheck />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
