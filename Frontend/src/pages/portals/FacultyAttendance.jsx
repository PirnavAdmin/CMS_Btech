import { useScreenAccess } from '../../auth/ScreenAccess'
import { useAcademic } from '../../context/AcademicContext'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import { FiAlertCircle, FiCalendar, FiCheck, FiCheckCircle, FiCheckSquare, FiClock, FiDownload, FiRefreshCw, FiSearch, FiTrash2, FiUsers, FiUserX, FiZap } from 'react-icons/fi'
import { teachingService as liveService } from '../../services/portals/teachingService.js'
import { PortalDialog } from '../../components/portals/PortalUI.jsx'
import './faculty-attendance.css'
import './faculty-attendance-selectors.css'

const statuses = [
  ['PRESENT', 'Present'],
  ['ABSENT', 'Absent'],
  ['LATE', 'Late'],
  ['LEAVE', 'On leave']
]
const same = (a, b) => String(a) === String(b)
const keyDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

function download(rows, marks, notes, a, date, saved) {
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
      saved ? 'Saved session' : 'Unsaved draft'
    ])
  ]
    .map(row => row.map(cell).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })),
    link = document.createElement('a')
  link.href = url
  link.download = `class-attendance-${date}${saved ? '' : '-draft'}.csv`
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
  const {selectedCollegeId,selectedAcademicYearId}=useAcademic()
  const {canAction}=useScreenAccess()
  const canEdit=canAction('/faculty-portal/attendance','edit'),canCreate=canAction('/faculty-portal/attendance','create')
  const [result,setResult]=useState(null),[attempt,setAttempt]=useState(0)
  const key=[selectedCollegeId,selectedAcademicYearId,attempt].join(':')
  const liveData=result?.key===key?result.data:null
  const liveError=result?.key===key?result.error:''
  useEffect(()=>{
    if(data)return
    let active=true
    liveService.getSnapshot().then(snapshot=>{if(active)setResult({key,data:snapshot,error:''})})
      .catch(error=>{if(active)setResult({key,data:null,error:error.message || 'Unable to load college attendance.'})})
    return()=>{active=false}
  },[data,key])

  if (!data && !liveData)
    return (
      <section className="fa-card">
        <Notice error={!!liveError}>{liveError || 'Loading college attendance records...'}</Notice>
        <div className="fa-header-actions">
          {liveError && (
            <button
              className="fa-button"
              onClick={() => {
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
      key={String(selectedCollegeId)+':'+String(selectedAcademicYearId)}
      data={data || liveData}
      year={selectedAcademicYearId} college={selectedCollegeId} canCreate={canCreate} canEdit={canEdit}
      service={liveService}
      summaryTarget={summaryTarget}
    />
  )
}

function AttendanceWorkspace({ data, service, year, college, canEdit, canCreate, summaryTarget }) {
  const [params] = useSearchParams()
  const assignments=data.assignments.filter(row=>(!year||same(row.academicYearId,year))&&(!college||!row.collegeId||same(row.collegeId,college)))
  const fields=[['branchId','Branch','branchName'],['semesterId','Semester','semesterName'],['sectionId','Section','sectionName'],['subjectId','Subject','subjectName']]
  const [scope,setScope]=useState(()=>{const linked=assignments.find(row=>same(row.id,params.get('assignment')));return linked?Object.fromEntries(fields.map(([key])=>[key,String(linked[key]??'')])):{}})
  const [date,setDate]=useState(()=>params.get('date')||keyDate(new Date()))
  const [dirty,setDirty]=useState(false),[pending,setPending]=useState(null),[busy,setBusy]=useState(false)
  const candidates=assignments.filter(row=>fields.every(([key])=>same(row[key],scope[key])))
  const a=fields.every(([key])=>scope[key]) && candidates.length===1 ? candidates[0] : null
  const guard=action=>{if(dirty)setPending(()=>action);else action()}
  return <div className="fa-workspace"><section className="fa-card fa-context"><header><div><h2>Choose your class</h2><p>Attendance is limited to your assigned classes in the working academic year.</p></div><FiCalendar/></header><div className="fa-context-fields">{fields.map(([key,label,name],index)=>{
    const parents=fields.slice(0,index)
    const options=[...new Map(assignments.filter(row=>parents.every(([parent])=>scope[parent]&&same(row[parent],scope[parent]))&&row[key]).map(row=>[String(row[key]),row])).values()]
    return <label key={key}>{label}<select value={scope[key]||''} disabled={busy||!options.length} onChange={event=>{const value=event.target.value;guard(()=>setScope({...Object.fromEntries(parents.map(([parent])=>[parent,scope[parent]])),[key]:value}))}}><option value="">Select {label.toLowerCase()}</option>{options.map(row=><option key={row[key]} value={row[key]}>{row[name]||label+' '+row[key]}</option>)}</select></label>
  })}<label>Attendance date<input type="date" value={date} max={keyDate(new Date())} disabled={busy} onChange={event=>{const value=event.target.value;if(value)guard(()=>setDate(value))}}/></label></div></section>
    {!a ? <section className="fa-card fa-start"><FiCheckSquare /><h2>Your class register, ready when you are</h2><p>Select an assigned class above to mark attendance, review saved sessions, and view your recent attendance history.</p><div><span><FiUsers />Assigned students only</span><span><FiCheckCircle />Review before submitting</span><span><FiClock />Recent session history</span></div>{!assignments.length && <Notice>No teaching allocations found. Contact your academic coordinator to assign a subject and section.</Notice>}</section> : <ClassRegister key={`${a.id}:${date}`} service={service} canCreate={canCreate} canEdit={canEdit} onDate={value=>guard(()=>setDate(value))} summaryTarget={summaryTarget} a={a} date={date} guard={guard} onDirty={setDirty} onBusy={setBusy} />}
    {pending && <PortalDialog title="Discard unsaved attendance?" onClose={() => setPending(null)}><p>Your current register has unsaved changes. Discard them and open the selected class or date?</p><div className="portal-actions"><button onClick={() => setPending(null)}>Keep editing</button><button className="primary" onClick={() => { const action = pending; setPending(null); setDirty(false); action() }}>Discard changes</button></div></PortalDialog>}
  </div>
}

function ClassRegister({ a, date, guard, onDirty, onBusy, service, canCreate, canEdit, onDate, summaryTarget }) {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [correction,setCorrection]=useState(false),[correctionError,setCorrectionError]=useState('')

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
    setError('');setHistoryError('')
    setLoading(true)
    setAttempt(v => v + 1)
  }
  const selectedSession=sessions.find(row=>same(row.attendanceSessionId,sessionId))
  const reopen=async()=>{if(!canEdit||saving||!selectedSession)return;setSaving(true);onBusy(true);setCorrectionError('');try{await service.reopenAttendance(a.id,date,sessionId);setCorrection(false);retry()}catch(error){setCorrectionError(error.message)}finally{setSaving(false);onBusy(false)}}
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

          {canEdit && selectedSession?.sessionStatus==='COMPLETED' && <button type="button" className="fa-button" onClick={()=>setCorrection(true)}>Reopen for correction</button>}{correction && <PortalDialog title="Reopen attendance?" onClose={()=>{if(!saving)setCorrection(false)}}><p>Reopen this completed session to correct its saved marks.</p>{correctionError && <Notice error>{correctionError}</Notice>}<button type="button" disabled={saving} onClick={reopen}>Confirm reopen</button></PortalDialog>}
          <RegisterSheet
            key={`${sessionId || 'new'}:${attempt}`}
            service={service}
            writable={selectedSession ? canEdit : canCreate}
            summaryTarget={summaryTarget}
            a={a}
            date={date}
            session={sessions.find(row => same(row.attendanceSessionId, sessionId))}
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
            <span>({history.length} sessions in the last 30 days)</span>
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
          <Notice error>{historyError} <button type="button" onClick={()=>guard(retry)}>Retry history</button></Notice>
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
                      <td><button type="button" onClick={()=>onDate(String(row.attendanceDate || '').slice(0,10))}>{String(row.attendanceDate || '').slice(0,10)}</button></td>
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
  onDirty,
  onBusy,
  onSaved,
  service,
  writable,
  summaryTarget
}) {
  const [roster, setRoster] = useState([])
  const [marks, setMarks] = useState({})
  const [notes, setNotes] = useState({})
  const [baseline, setBaseline] = useState({ marks: {}, notes: {} })
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [bulk, setBulk] = useState('PRESENT')
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [rosterAttempt,setRosterAttempt]=useState(0)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    const read=session?service.getSessionRoster(a.id,date,session.attendanceSessionId):service.getClassRoster(a.id).then(students=>({students}))
    read
      .then(result => {
        if (!active) return
        const rows = result.students.map(row => ({
          ...row,
          id: String(row.studentId ?? row.id),
          name: row.studentName || row.fullName || row.name || 'Student',
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
  }, [a.id, date, session, service, rosterAttempt])

  const locked = !writable || saved || (!!session && session.sessionStatus !== 'OPEN')
  const blocked = busy || loading || !!loadError
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
    if(locked || blocked || !roster.length || marked!==roster.length)return
    setBusy(true)
    onBusy(true)
    setError('')
    try {
      await service.saveAttendance({
        allocationId: a.id,
        date,
        sessionId: session?.attendanceSessionId,
        records: roster.map(row => ({
          studentId: Number(row.id),
          attendanceStatus: marks[row.id],
          remarks: notes[row.id] || null
        }))
      })
      setSaved(true)
      setDialog(null)
      setSelected([])
      onDirty(false)
      setNotice('Attendance submitted successfully. This session is locked.')
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
              onClick={() => download(roster, marks, notes, a, date, locked)}
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </header>

        {notice && <Notice>{notice}</Notice>}
        {error && !dialog && <Notice error>{error}</Notice>}
        {loadError && <Notice error>{loadError} <button type="button" onClick={()=>{setLoading(true);setLoadError('');setRosterAttempt(value=>value+1)}}>Retry roster</button></Notice>}
        {loading && <Notice>Loading saved attendance records...</Notice>}
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
                  Once submitted, this attendance session will be locked and finalized.
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
