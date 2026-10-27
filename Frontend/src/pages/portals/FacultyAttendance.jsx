import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import {
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiDownload,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUserCheck,
  FiUsers,
  FiUserX,
  FiZap
} from 'react-icons/fi'
import { teachingService as liveService } from '../../services/portals/teachingService.js'
import { PortalDialog } from '../../components/portals/PortalUI.jsx'
import './faculty-attendance.css'
import { createAttendanceDemo } from '../../services/portals/attendanceDemo.js'

const statuses = [
  ['PRESENT', 'Present'],
  ['ABSENT', 'Absent'],
  ['LATE', 'Late'],
  ['LEAVE', 'On leave']
]
const same = (a, b) => String(a) === String(b)
const keyDate = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const label = a => `${a.subjectName} · ${a.sectionName} · ${a.semesterName || `Semester ${a.semesterId}`}`
const statusLabel = value => statuses.find(([key]) => key === value)?.[1] || 'Unmarked'

function Notice({ children, error = false }) {
  return (
    <div className={`fa-notice${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>
      {error ? <FiAlertCircle aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}
      <span>{children}</span>
    </div>
  )
}

function Badge({ value }) {
  return (
    <span className={`fa-badge fa-status-${String(value || 'UNMARKED').toLowerCase()}`}>
      {statusLabel(value)}
    </span>
  )
}

function download(rows, marks, notes, a, date, saved, demo) {
  const cell = v => `"${String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`
  const csv = [
    ['Date', 'Subject', 'Section', 'Roll number', 'Student', 'Attendance', 'Remarks', 'Record type'],
    ...rows.map(row => [
      date,
      a.subjectName,
      a.sectionName,
      row.rollNumber,
      row.name,
      statusLabel(marks[row.id]),
      notes[row.id] || '',
      demo ? 'Demo record only' : saved ? 'Saved session' : 'Unsaved draft'
    ])
  ]
    .map(row => row.map(cell).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })),
    link = document.createElement('a')
  link.href = url
  link.download = `${demo ? 'demo-' : ''}class-attendance-${date}${saved ? '' : '-draft'}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function FacultyAttendancePage() {
  const [summaryTarget, setSummaryTarget] = useState(null)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <PortalLayout title="Student Attendance">
      <main className="portal-page tf-page fa-attendance-page">
        <header className="tf-heading">
          <div>
            <p className="portal-eyebrow">DIGITAL CAMPUS / TEACHING FACULTY</p>
            <h1>Student Attendance</h1>
            <p>Record, manage and review daily classroom attendance for your assigned sections.</p>
          </div>
          <div className="fa-summary-anchor" ref={setSummaryTarget} />
        </header>
        <FacultyAttendance summaryTarget={summaryTarget} />
      </main>
    </PortalLayout>
  )
}

export default function FacultyAttendance({ data, summaryTarget }) {
  const [demo, setDemo] = useState(() => createAttendanceDemo(keyDate(new Date())))
  const [liveData, setLiveData] = useState(data || null)
  const [liveError, setLiveError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (demo || data) return
    let active = true
    liveService
      .getSnapshot()
      .then(result => {
        if (active) {
          setLiveData(result)
          setLiveError('')
        }
      })
      .catch(error => {
        if (active) setLiveError(error.message)
      })
    return () => {
      active = false
    }
  }, [demo, data, attempt])

  if (!demo && !liveData)
    return (
      <section className="fa-card">
        <Notice error={!!liveError}>{liveError || 'Loading college attendance records...'}</Notice>
        <div className="fa-header-actions">
          <button className="fa-button" onClick={() => setDemo(createAttendanceDemo(keyDate(new Date())))}>
            Back to mock students
          </button>
          {liveError && (
            <button
              className="fa-button"
              onClick={() => {
                setLiveError('')
                setAttempt(v => v + 1)
              }}
            >
              Retry college records
            </button>
          )}
        </div>
      </section>
    )

  return (
    <AttendanceWorkspace
      key={demo ? 'demo' : 'live'}
      data={demo?.data || liveData}
      service={demo?.api || liveService}
      demo={!!demo}
      summaryTarget={summaryTarget}
      onToggleDemo={() => setDemo(demo ? null : createAttendanceDemo(keyDate(new Date())))}
    />
  )
}

function AttendanceWorkspace({ data, service, demo, onToggleDemo, summaryTarget }) {
  const [params] = useSearchParams()
  const [allocationId, setAllocation] = useState(demo ? data.assignments[0]?.id : params.get('assignment') || '')
  const [date, setDate] = useState(() => keyDate(new Date()))
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  const a = data.assignments.find(row => same(row.id, allocationId))
  const guard = action => {
    if (dirty) setPending(() => action)
    else action()
  }

  const setTodayDate = () => {
    guard(() => setDate(keyDate(new Date())))
  }

  return (
    <div className="fa-workspace" data-demo={demo}>
      <div className={`fa-demo-bar ${demo ? 'is-demo' : 'is-live'}`}>
        <div>
          <span className="fa-mode-tag">{demo ? 'DEMO REGISTER' : 'COLLEGE ATTENDANCE'}</span>
          <span>
            {demo
              ? 'Practice marking and attendance submission with 8 sample students.'
              : 'Official attendance register connected to university records.'}
          </span>
        </div>
        <button
          type="button"
          className="fa-button fa-btn-mode"
          disabled={busy}
          onClick={() => guard(onToggleDemo)}
        >
          {demo ? 'Use college records' : 'Use mock students'}
        </button>
      </div>

      {/* Classroom Selection Card */}
      <section className="fa-card fa-context">
        <div className="fa-context-header">
          <div className="fa-context-icon">
            <FiBookOpen />
          </div>
          <div>
            <span className="fa-eyebrow">CLASSROOM SELECTION</span>
            <h2>Select Class &amp; Date</h2>
          </div>
        </div>

        <div className="fa-context-fields">
          <label>
            <span>Assigned Subject &amp; Section</span>
            <select
              disabled={busy}
              value={a ? allocationId : ''}
              onChange={e => {
                const value = e.target.value
                guard(() => setAllocation(value))
              }}
            >
              <option value="">Select an assigned class</option>
              {data.assignments.map(row => (
                <option key={row.id} value={row.id}>
                  {label(row)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="fa-label-with-action">
              <span>Attendance Date</span>
              <button type="button" className="fa-text-btn" onClick={setTodayDate}>
                Today
              </button>
            </div>
            <input
              disabled={busy}
              type="date"
              max={keyDate(new Date())}
              value={date}
              onChange={e => {
                const value = e.target.value
                if (value) guard(() => setDate(value))
              }}
            />
          </label>
        </div>

        {a && (
          <div className="fa-context-tags">
            <span className="fa-tag-subject">{a.subjectCode || a.subjectName}</span>
            <span className="fa-tag-section">{a.sectionName}</span>
            <span className="fa-tag-year">{a.academicYearName || '2026-2027'}</span>
            <span className="fa-tag-sem">{a.semesterName || 'Semester 1'}</span>
          </div>
        )}
      </section>

      {!a ? (
        <section className="fa-card fa-start">
          <div className="fa-start-icon-wrap">
            <FiCheckSquare />
          </div>
          <h2>Ready to Take Attendance?</h2>
          <p>
            Please select your assigned subject and section above to open the interactive student attendance
            register.
          </p>
          <div className="fa-start-features">
            <span>
              <FiUsers /> Assigned Students Roster
            </span>
            <span>
              <FiCheckCircle /> 1-Click Batch Marking
            </span>
            <span>
              <FiClock /> Verified Session Logs
            </span>
          </div>
          {!data.assignments.length && (
            <Notice>
              No teaching allocations found. Contact your academic coordinator to assign a subject and section.
            </Notice>
          )}
        </section>
      ) : (
        <ClassRegister
          key={`${a.id}:${date}`}
          service={service}
          demo={demo}
          summaryTarget={summaryTarget}
          a={a}
          data={data}
          date={date}
          guard={guard}
          onDirty={setDirty}
          onBusy={setBusy}
        />
      )}

      {pending && (
        <PortalDialog title="Discard unsaved attendance?" onClose={() => setPending(null)}>
          <p>Your current register has unsaved changes. Discard them and open the selected class or date?</p>
          <div className="portal-actions">
            <button onClick={() => setPending(null)}>Keep editing</button>
            <button
              className="primary"
              onClick={() => {
                const action = pending
                setPending(null)
                setDirty(false)
                action()
              }}
            >
              Discard changes
            </button>
          </div>
        </PortalDialog>
      )}
    </div>
  )
}

function ClassRegister({ a, data, date, guard, onDirty, onBusy, service, demo, summaryTarget }) {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.allSettled([service.getSessions(a.id, date), service.getSessionHistory(a.id)]).then(
      ([current, recent]) => {
        if (!active) return
        if (current.status === 'fulfilled') {
          setSessions(current.value)
          setSessionId(
            String(
              (current.value.find(row => row.sessionStatus === 'OPEN') || current.value[0])?.attendanceSessionId || ''
            )
          )
        } else setError(current.reason.message)
        if (recent.status === 'fulfilled')
          setHistory(
            recent.value.slice().sort((x, y) => String(y.attendanceDate).localeCompare(String(x.attendanceDate)))
          )
        else setHistoryError(recent.reason.message)
        setLoading(false)
      }
    )
    return () => {
      active = false
    }
  }, [a.id, date, attempt, service])

  const retry = () => {
    setError('')
    setLoading(true)
    setAttempt(v => v + 1)
  }
  const saved = async () => {
    onDirty(false)
    try {
      setHistory(await service.getSessionHistory(a.id))
      setHistoryError('')
    } catch {
      setHistoryError('Attendance was saved. Recent session history is temporarily unavailable.')
    }
  }

  return (
    <>
      {loading ? (
        <section className="fa-card fa-loading" role="status">
          <FiRefreshCw className="fa-spin" /> Loading class sessions and student roster...
        </section>
      ) : error ? (
        <section className="fa-card">
          <Notice error>{error}</Notice>
          <button type="button" className="fa-button" onClick={retry}>
            Retry loading register
          </button>
        </section>
      ) : (
        <>
          {sessions.length > 1 && (
            <section className="fa-card fa-session-card">
              <label className="fa-session-picker">
                <span>Select Attendance Period / Session</span>
                <select
                  disabled={saving}
                  value={sessionId}
                  onChange={e => {
                    const value = e.target.value
                    guard(() => setSessionId(value))
                  }}
                >
                  {sessions.map(row => (
                    <option key={row.attendanceSessionId} value={row.attendanceSessionId}>
                      {row.slotName || `Session #${row.attendanceSessionId}`} · Status: {row.sessionStatus}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          )}

          <RegisterSheet
            key={`${sessionId || 'new'}:${attempt}`}
            service={service}
            demo={demo}
            summaryTarget={summaryTarget}
            a={a}
            date={date}
            session={sessions.find(row => same(row.attendanceSessionId, sessionId))}
            students={data.students.filter(row => same(row.sectionId, a.sectionId))}
            rosterUnavailable={data.warnings.some(
              message =>
                message.startsWith(`Students in section ${a.sectionId}:`) || message.startsWith('Students:')
            )}
            onDirty={onDirty}
            onBusy={value => {
              setSaving(value)
              onBusy(value)
            }}
            onSaved={saved}
          />
        </>
      )}

      {/* History Accordion */}
      <details className="fa-card fa-history">
        <summary>
          <div className="fa-history-summary-title">
            <FiClock />
            <strong>Recent Attendance Sessions</strong>
            <span>({history.length} completed sessions in the last 30 days)</span>
          </div>
          <span className="fa-history-badge">{history.length} sessions</span>
        </summary>
        <header>
          <div>
            <h2>Recent Attendance Sessions</h2>
            <p>Historical sessions for this assigned class.</p>
          </div>
        </header>
        {historyError ? (
          <Notice error>{historyError}</Notice>
        ) : (
          <div className="fa-table-scroll">
            <table className="fa-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Session</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length ? (
                  history.map(row => (
                    <tr key={row.attendanceSessionId}>
                      <td>{String(row.attendanceDate || '').slice(0, 10)}</td>
                      <td>{row.subjectName || a.subjectName}</td>
                      <td>{row.sectionName || a.sectionName}</td>
                      <td>{row.slotName || `#${row.attendanceSessionId}`}</td>
                      <td>
                        <span
                          className={`fa-session-status ${
                            row.sessionStatus === 'COMPLETED' ? 'is-complete' : ''
                          }`}
                        >
                          {row.sessionStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="fa-empty-row">
                      No attendance sessions found for this class in the last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </>
  )
}

function RegisterSheet({
  a,
  date,
  session,
  students,
  rosterUnavailable,
  onDirty,
  onBusy,
  onSaved,
  service,
  demo,
  summaryTarget
}) {
  const [roster, setRoster] = useState(students)
  const [marks, setMarks] = useState({})
  const [notes, setNotes] = useState({})
  const [baseline, setBaseline] = useState({ marks: {}, notes: {} })
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [bulk, setBulk] = useState('PRESENT')
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(!!session)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!session) return
    let active = true
    service
      .getSessionRoster(a.id, date, session.attendanceSessionId)
      .then(result => {
        if (!active) return
        const rows = result.students.map(row => ({
          ...row,
          id: String(row.studentId),
          name: row.studentName || row.fullName || 'Student',
          rollNumber: row.studentCode || row.rollNumber || '—'
        }))
        const values = Object.fromEntries(
          rows
            .filter(row => statuses.some(([status]) => status === row.attendanceStatus))
            .map(row => [row.id, row.attendanceStatus])
        )
        const remarks = Object.fromEntries(rows.map(row => [row.id, row.remarks || '']))
        setRoster(rows)
        setMarks(values)
        setNotes(remarks)
        setBaseline({ marks: values, notes: remarks })
        setLoading(false)
      })
      .catch(e => {
        if (active) {
          setLoadError(e.message)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [a.id, date, session, retry, service])

  const locked = saved || (!!session && session.sessionStatus !== 'OPEN')
  const blocked = busy || loading || !!loadError || (!session && rosterUnavailable)
  const marked = roster.filter(row => marks[row.id]).length
  const count = status => roster.filter(row => marks[row.id] === status).length
  const filtered = roster.filter(
    row =>
      `${row.name} ${row.rollNumber}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'ALL' || filter === 'UNMARKED' ? filter === 'ALL' || !marks[row.id] : marks[row.id] === filter)
  )
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pages)
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize)
  const completion = roster.length ? Math.round((marked / roster.length) * 100) : 0

  const changeMark = (studentId, value) => {
    setMarks(previous => ({ ...previous, [studentId]: value }))
    onDirty(true)
    setNotice('')
  }

  // 1-Click Quick Batch Actions
  const markAll = status => {
    setMarks(Object.fromEntries(roster.map(r => [r.id, status])))
    onDirty(true)
    setNotice(`All ${roster.length} students marked as ${statusLabel(status)}.`)
  }

  const clearAllMarks = () => {
    setMarks({})
    onDirty(true)
    setNotice('Attendance marks cleared.')
  }

  const markRemaining = () => {
    setMarks(previous => ({
      ...previous,
      ...Object.fromEntries(roster.filter(row => !previous[row.id]).map(row => [row.id, 'PRESENT']))
    }))
    onDirty(true)
  }

  const applyBulk = () => {
    setMarks(previous => ({
      ...previous,
      ...Object.fromEntries(selected.map(studentId => [studentId, bulk]))
    }))
    onDirty(true)
    setDialog(null)
    setSelected([])
  }

  const submit = async () => {
    setBusy(true)
    onBusy(true)
    setError('')
    try {
      await service.saveAttendance({
        allocationId: a.id,
        date,
        sessionId: session?.attendanceSessionId,
        records: roster.map(row => ({
          studentId: demo ? row.id : Number(row.id),
          attendanceStatus: marks[row.id],
          remarks: notes[row.id] || null
        }))
      })
      setSaved(true)
      setDialog(null)
      setSelected([])
      onDirty(false)
      setNotice(
        demo
          ? 'Demo attendance saved locally.'
          : 'Attendance submitted successfully. This session is locked.'
      )
      await onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      onBusy(false)
    }
  }

  // Top Statistics Cards
  const summary = (
    <div className="fa-stats">
      <article className="fa-stat fa-stat-neutral">
        <span className="fa-stat-icon">
          <FiUsers />
        </span>
        <div>
          <small>Total Strength</small>
          <strong>{roster.length}</strong>
        </div>
      </article>

      <article className="fa-stat fa-stat-present">
        <span className="fa-stat-icon">
          <FiCheckCircle />
        </span>
        <div>
          <small>Present</small>
          <strong>{count('PRESENT')}</strong>
        </div>
      </article>

      <article className="fa-stat fa-stat-absent">
        <span className="fa-stat-icon">
          <FiUserX />
        </span>
        <div>
          <small>Absent</small>
          <strong>{count('ABSENT')}</strong>
        </div>
      </article>

      <article className="fa-stat fa-stat-late">
        <span className="fa-stat-icon">
          <FiClock />
        </span>
        <div>
          <small>Late / Leave</small>
          <strong>
            {count('LATE')} / {count('LEAVE')}
          </strong>
        </div>
      </article>
    </div>
  )

  return (
    <>
      {summaryTarget ? createPortal(summary, summaryTarget) : summary}

      <section className="fa-card fa-register">
        <header className="fa-register-header">
          <div>
            <span className="fa-eyebrow">{locked ? 'COMPLETED REGISTER' : 'CLASS ATTENDANCE REGISTER'}</span>
            <h2>{a.subjectName}</h2>
            <p>
              {a.sectionName} · Date: <strong>{date}</strong> · {roster.length} Enrolled Students
            </p>
          </div>

          <div className="fa-header-actions">
            <span className={`fa-session-status ${locked ? 'is-complete' : ''}`}>
              {saved ? 'COMPLETED' : session?.sessionStatus || 'NEW REGISTER'}
            </span>
            <button
              className="fa-button"
              disabled={loading || !roster.length || !!loadError}
              onClick={() => download(roster, marks, notes, a, date, locked, demo)}
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </header>

        {notice && <Notice>{notice}</Notice>}
        {error && <Notice error>{error}</Notice>}
        {loadError && <Notice error>{loadError}</Notice>}
        {loading && <Notice>Loading saved attendance records...</Notice>}
        {!session && rosterUnavailable && (
          <Notice error>
            Student records could not be loaded. Submission is unavailable until the roster is restored.
          </Notice>
        )}
        {locked && !notice && (
          <Notice>This attendance session is finalized and read-only. Editing is disabled.</Notice>
        )}

        {/* Live Interactive Progress Bar */}
        <div className="fa-progress-card">
          <div className="fa-progress-meta">
            <span>
              <strong>{marked}</strong> of <strong>{roster.length}</strong> marked
            </span>
            <span className={`fa-progress-status ${completion === 100 ? 'is-complete' : ''}`}>
              {completion}% Complete · {roster.length - marked} Unmarked
            </span>
          </div>
          <div className="fa-progress-bar-wrap">
            <div className="fa-progress-bar-fill" style={{ width: `${completion}%` }} />
          </div>
        </div>

        {/* Quick Batch Action Power-Bar */}
        {!locked && (
          <div className="fa-power-bar">
            <div className="fa-quick-btns">
              <button
                type="button"
                className="fa-btn-quick fa-btn-present"
                disabled={blocked}
                onClick={() => markAll('PRESENT')}
                title="Mark all students in this class as Present"
              >
                <FiCheckCircle /> Mark All Present
              </button>

              <button
                type="button"
                className="fa-btn-quick fa-btn-absent"
                disabled={blocked}
                onClick={() => markAll('ABSENT')}
                title="Mark all students as Absent"
              >
                <FiUserX /> Mark All Absent
              </button>

              <button
                type="button"
                className="fa-btn-quick fa-btn-remaining"
                disabled={blocked || !roster.some(row => !marks[row.id])}
                onClick={markRemaining}
                title="Mark only unmarked students as Present"
              >
                <FiZap /> Mark Remaining Present
              </button>

              {marked > 0 && (
                <button
                  type="button"
                  className="fa-btn-quick fa-btn-clear"
                  disabled={blocked}
                  onClick={clearAllMarks}
                  title="Clear all marks"
                >
                  <FiTrash2 /> Clear All
                </button>
              )}
            </div>

            <div className="fa-bulk-actions">
              <span>{selected.length} selected</span>
              <select
                aria-label="Bulk attendance status"
                disabled={blocked || !selected.length}
                value={bulk}
                onChange={e => setBulk(e.target.value)}
              >
                {statuses.map(([key, title]) => (
                  <option key={key} value={key}>
                    {title}
                  </option>
                ))}
              </select>
              <button
                className="fa-button"
                disabled={blocked || !selected.length}
                onClick={() => setDialog('bulk')}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="fa-toolbar">
          <label className="fa-search">
            <FiSearch />
            <input
              type="search"
              value={search}
              placeholder="Search student name or roll number..."
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              aria-label="Search students"
            />
          </label>

          <label className="fa-status-filter">
            <span>Filter</span>
            <select
              value={filter}
              onChange={e => {
                setFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="ALL">All Students</option>
              <option value="UNMARKED">Unmarked Only</option>
              {statuses.map(([key, title]) => (
                <option key={key} value={key}>
                  {title}
                </option>
              ))}
            </select>
          </label>

          <label className="fa-page-size">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[10, 25, 50].map(n => (
                <option key={n} value={n}>
                  {n} Rows
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Student Roster Table */}
        <div className="fa-table-scroll">
          <table className="fa-table">
            <thead>
              <tr>
                {!locked && (
                  <th className="fa-checkbox">
                    <input
                      type="checkbox"
                      aria-label="Select all filtered students"
                      disabled={blocked || !filtered.length}
                      checked={filtered.length > 0 && filtered.every(row => selected.includes(row.id))}
                      onChange={e =>
                        setSelected(
                          e.target.checked
                            ? [...new Set([...selected, ...filtered.map(row => row.id)])]
                            : selected.filter(studentId => !filtered.some(row => row.id === studentId))
                        )
                      }
                    />
                  </th>
                )}
                <th style={{ width: '150px' }}>Roll Number</th>
                <th>Student</th>
                <th style={{ width: '280px' }}>Attendance Status</th>
                <th style={{ width: '200px' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {visible.length && !loading ? (
                visible.map(row => {
                  const initials = row.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(word => word[0])
                    .join('')
                  const isMarked = Boolean(marks[row.id])

                  return (
                    <tr
                      key={row.id}
                      className={`${selected.includes(row.id) ? 'is-selected' : ''} ${
                        isMarked ? 'is-marked-row' : ''
                      }`}
                    >
                      {!locked && (
                        <td className="fa-checkbox">
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.name}`}
                            checked={selected.includes(row.id)}
                            disabled={blocked}
                            onChange={e =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, row.id]
                                  : selected.filter(studentId => studentId !== row.id)
                              )
                            }
                          />
                        </td>
                      )}
                      <td>
                        <span className="fa-roll">{row.rollNumber}</span>
                      </td>
                      <td>
                        <div className="fa-student">
                          <span className="fa-student-avatar">{initials}</span>
                          <strong className="fa-student-name">{row.name}</strong>
                        </div>
                      </td>
                      <td>
                        {locked ? (
                          <Badge value={marks[row.id]} />
                        ) : (
                          <div
                            className="fa-segmented-toggle"
                            role="group"
                            aria-label={`Attendance for ${row.name}`}
                          >
                            {statuses.map(([status, title]) => {
                              const active = marks[row.id] === status
                              return (
                                <button
                                  type="button"
                                  key={status}
                                  className={`fa-toggle-btn fa-btn-${status.toLowerCase()} ${
                                    active ? 'is-active' : ''
                                  }`}
                                  aria-pressed={active}
                                  disabled={blocked}
                                  onClick={() => changeMark(row.id, status)}
                                >
                                  {status === 'PRESENT' && <FiCheck className="toggle-icon" />}
                                  {status === 'ABSENT' && <FiUserX className="toggle-icon" />}
                                  {status === 'LATE' && <FiClock className="toggle-icon" />}
                                  {status === 'LEAVE' && <FiCalendar className="toggle-icon" />}
                                  <span>{title}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      <td>
                        {locked ? (
                          <span className="fa-remark-value">{notes[row.id] || '—'}</span>
                        ) : (
                          <input
                            className="fa-remarks"
                            aria-label={`Remarks for ${row.name}`}
                            placeholder="Add note..."
                            maxLength={500}
                            disabled={blocked}
                            value={notes[row.id] || ''}
                            onChange={e => {
                              setNotes({ ...notes, [row.id]: e.target.value })
                              onDirty(true)
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={locked ? 4 : 5} className="fa-empty-row">
                    {loading
                      ? 'Loading attendance register...'
                      : roster.length
                      ? 'No students match your search or status filter.'
                      : 'No enrolled students found for this section.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="fa-pagination">
          <span>
            Showing {filtered.length ? (current - 1) * pageSize + 1 : 0}–
            {Math.min(current * pageSize, filtered.length)} of {filtered.length} students
          </span>
          <div className="fa-page-btns">
            <button disabled={current <= 1} onClick={() => setPage(current - 1)}>
              Previous
            </button>
            <span className="fa-page-indicator">
              {current} / {pages}
            </span>
            <button disabled={current >= pages} onClick={() => setPage(current + 1)}>
              Next
            </button>
          </div>
        </div>

        {/* Bottom Submission Action Bar */}
        {!locked && (
          <footer className="fa-submit-bar">
            <div className="fa-submit-meta">
              <strong>
                {marked === roster.length && roster.length
                  ? '✓ Register fully marked and ready for review'
                  : `${roster.length - marked} student${roster.length - marked === 1 ? '' : 's'} remaining to mark`}
              </strong>
              <span>Attendance submission will finalize this class session.</span>
            </div>

            <div className="fa-submit-btns">
              <button
                type="button"
                className="fa-button"
                disabled={blocked || !marked}
                onClick={() => setDialog('reset')}
              >
                Reset
              </button>

              <button
                type="button"
                className="fa-button fa-primary fa-btn-submit"
                disabled={blocked || !roster.length || marked !== roster.length}
                onClick={() => {
                  setError('')
                  setDialog('submit')
                }}
              >
                <FiCheckSquare /> Review &amp; Submit Attendance
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* Confirmation Modals */}
      {dialog && (
        <PortalDialog
          title={
            dialog === 'submit'
              ? 'Review Attendance Submission'
              : dialog === 'bulk'
              ? 'Apply Bulk Attendance?'
              : 'Reset Attendance Changes?'
          }
          onClose={() => {
            if (!busy) setDialog(null)
          }}
        >
          <div className="fa-review">
            {dialog === 'submit' ? (
              <>
                <p>
                  Confirm attendance submission for <strong>{a.subjectName}</strong> ({a.sectionName}) on{' '}
                  <strong>{date}</strong>?
                </p>
                <div className="fa-review-counts">
                  {statuses.map(([status, title]) => (
                    <div key={status} className={`count-${status.toLowerCase()}`}>
                      <span>{title}</span>
                      <strong>{count(status)}</strong>
                    </div>
                  ))}
                </div>
                <p className="fa-review-disclaimer">
                  {demo
                    ? 'Demo submission only. Records are stored in this preview session.'
                    : 'Once submitted, this attendance session will be locked and finalized.'}
                </p>
              </>
            ) : (
              <p>
                {dialog === 'bulk'
                  ? `Mark ${selected.length} selected students as ${statusLabel(bulk)}?`
                  : 'Restore previously saved attendance? Unsaved marks will be discarded.'}
              </p>
            )}
            {error && <Notice error>{error}</Notice>}
            <div className="portal-actions">
              <button disabled={busy} onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={
                  dialog === 'submit'
                    ? submit
                    : dialog === 'bulk'
                    ? applyBulk
                    : () => {
                        setMarks({ ...baseline.marks })
                        setNotes({ ...baseline.notes })
                        setSelected([])
                        onDirty(false)
                        setDialog(null)
                      }
                }
              >
                {busy ? 'Submitting...' : dialog === 'submit' ? 'Confirm & Submit' : 'Confirm'}
              </button>
            </div>
          </div>
        </PortalDialog>
      )}
    </>
  )
}
