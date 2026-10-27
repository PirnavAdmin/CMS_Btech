import { downloadMaterial } from '../../services/portals/downloadMaterial.js'
import { usePortalData } from '../../hooks/usePortalData.js'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import PortalLayout from '../../layouts/PortalLayout.jsx'
import { facultyService } from '../../services/portals/facultyService.js'
import { studentService } from '../../services/portals/studentService.js'
import { facultyNavigation, studentNavigation } from '../../components/portals/portalNavigation.js'
import { DataTable, Field, Feedback, MockNotice, PortalDialog, Stats, Status } from '../../components/portals/PortalUI.jsx'
import StudentDashboard from './StudentDashboard.jsx'
import TeachingPortal from './TeachingPortal.jsx'
import FacultyProfile from './FacultyProfile.jsx'

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const label = (data, assignmentId) => { const row = data.assignments.find(item => item.id === assignmentId); return row ? `${row.subject?.name || 'Subject'} · ${row.section?.name || 'Section'}` : 'Unassigned' }

export default function AcademicPortal({ role }) {
  const { screen = 'dashboard' } = useParams()
  const nav = role === 'faculty' ? facultyNavigation : studentNavigation
  const title = nav.find(([key]) => key === screen)?.[1]
  if (!title) return <Navigate to={`/${role}-portal/dashboard`} replace />
  if (role === 'faculty' && screen === 'profile') return <PortalLayout title={title}><FacultyProfile /></PortalLayout>
  if (role === 'faculty') return <TeachingPortal key={screen} screen={screen} title={title} />
  return <PortalLayout title={title}><PortalScreen key={`${role}:${screen}`} role={role} screen={screen} title={title} /></PortalLayout>
}

function PortalScreen({ role, screen, title }) {
  const service = role === 'faculty' ? facultyService : studentService
  const state = usePortalData(service), { data, act, busy } = state
  const retryWorkspace = async () => {
    try { await state.refresh() }
    catch (reason) { console.error('Could not reload the portal workspace:', reason) }
  }
  return <main className="portal-page"><header className="portal-page-heading"><div><p className="portal-eyebrow">{role} Portal / My Workspace</p><h1>{title}</h1><p>{screen === 'dashboard' ? `Welcome back${data?.me.name ? `, ${data.me.name}` : ''}. Here's your academic overview.` : 'Your college workspace, organized around you.'}</p></div><span className="portal-term">{role === 'student' && screen === 'dashboard' ? 'Mock workspace' : 'Academic Year 2026–2027 · Mock'}</span></header>
    <MockNotice /><Feedback {...state} />
    {!data ? !state.error ? <p role="status">Loading your workspace…</p> : screen === 'dashboard' && <button type="button" onClick={retryWorkspace} className="portal-retry">Retry loading workspace</button> : <>
      {screen === 'dashboard' && (role === 'student' ? <StudentDashboard data={data} role={role} onRetry={retryWorkspace} loading={state.busy} error={state.error} /> : <Dashboard data={data} role={role} />)}
      {screen === 'students' && <Students data={data} />}
      {screen === 'subjects' && <Subjects data={data} />}
      {screen === 'attendance' && (role === 'faculty' ? <AttendanceEntry data={data} act={act} busy={busy} /> : <StudentAttendance data={data} />)}
      {screen === 'marks' && <MarksEntry data={data} act={act} busy={busy} />}
      {screen === 'results' && <Results data={data} />}
      {screen === 'timetable' && <Timetable data={data} />}
      {screen === 'materials' && <Materials data={data} role={role} act={act} busy={busy} error={state.error} />}
      {screen === 'leave' && <LeaveManagement data={data} act={act} busy={busy} error={state.error} />}
      {screen === 'notifications' && <Notifications data={data} service={service} act={act} busy={busy} />}
      {screen === 'profile' && <Profile data={data} service={service} act={act} busy={busy} />}
      {screen === 'fees' && <Fees data={data} />}
    </>}
  </main>
}

function Dashboard({ data, role }) {
  const base = `/${role}-portal`, unread = data.notifications.filter(row => !row.readBy.includes(data.me.id)).length
  const records = data.attendance.flatMap(row => row.records), attended = records.filter(row => row.status !== 'absent').length
  const attendance = records.length ? `${Math.round(attended / records.length * 100)}%` : '—'
  const balance = data.fees.reduce((sum, row) => sum + row.amount - row.paid, 0)
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
  const classes = data.timetable.filter(row => row.day === day)
  return <><Stats items={role === 'faculty' ? [['Assigned subjects', data.subjects.length], ['My students', data.students.filter(row => row.status === 'active').length], ["Today's classes", classes.length], ['Unread notices', unread]] : [['My subjects', data.subjects.length], ['Attendance', attendance, 'Present and late sessions'], ['Fee balance', money(balance)], ['Unread notices', unread]]} />
    <div className="portal-dashboard-grid"><section className="portal-card"><header className="portal-section-heading"><h2>Today’s schedule</h2><Link to={`${base}/timetable`}>View timetable</Link></header><DataTable caption="Classes today" rows={classes} empty="No classes scheduled today" columns={[["start", 'Time', row => `${row.start}–${row.end}`], ['subject', 'Subject', row => label(data, row.assignmentId)], ['room', 'Room']]} /></section><section className="portal-card"><h2>Quick actions</h2><div className="portal-quick-links">{(role === 'faculty' ? [['attendance', 'Record attendance'], ['marks', 'Enter assessment marks'], ['materials', 'Share study materials'], ['leave', 'Request leave']] : [['attendance', 'Review my attendance'], ['results', 'View published results'], ['materials', 'Download study materials'], ['fees', 'Check fee details']]).map(([path, name]) => <Link key={path} to={`${base}/${path}`}>{name}<span aria-hidden="true">→</span></Link>)}</div></section></div>
    <section className="portal-card"><header className="portal-section-heading"><h2>Latest notifications</h2><Link to={`${base}/notifications`}>View all</Link></header>{data.notifications.length ? data.notifications.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3).map(row => <article className="portal-notification" key={row.id}><h3>{row.title}</h3><p>{row.message}</p><small>{row.createdAt.slice(0, 10)}</small></article>) : <p>No notifications yet.</p>}</section>
  </>
}

function Students({ data }) {
  const [search, setSearch] = useState(''), [section, setSection] = useState('')
  const students = data.students.filter(row => (!section || row.sectionId === section) && `${row.name} ${row.rollNumber || ''} ${row.email}`.toLowerCase().includes(search.toLowerCase()))
  return <section className="portal-card"><h2>Assigned students</h2><div className="portal-filters"><Field label="Search students"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, roll number or email" /></Field><Field label="Section"><select value={section} onChange={event => setSection(event.target.value)}><option value="">All assigned sections</option>{data.sections.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field></div><DataTable caption="Students in your assigned sections" rows={students} columns={[["rollNumber", 'Roll number'], ['name', 'Name'], ['email', 'Email'], ['sectionId', 'Section', row => data.sections.find(item => item.id === row.sectionId)?.name], ['status', 'Account status', row => <Status>{row.status}</Status>]]} /></section>
}

function Subjects({ data }) {
  return <section className="portal-card"><h2>My subjects</h2><DataTable caption="Subjects and teaching assignments" rows={data.assignments} columns={[["code", 'Code', row => row.subject?.code], ['subject', 'Subject', row => row.subject?.name], ['section', 'Section', row => row.section?.name], ['credits', 'Credits', row => row.subject?.credits], ['faculty', 'Faculty', row => row.faculty?.name]]} /></section>
}

function AssignmentField({ data, value, onChange }) {
  return <Field label="Assigned subject & section"><select required value={value} onChange={event => onChange(event.target.value)}><option value="">Select subject and section</option>{data.assignments.map(row => <option key={row.id} value={row.id}>{label(data, row.id)}</option>)}</select></Field>
}

function AttendanceEntry({ data, act, busy }) {
  const [assignmentId, setAssignment] = useState(''), [date, setDate] = useState(today), [records, setRecords] = useState({}), [confirm, setConfirm] = useState(false)
  const assignment = data.assignments.find(row => row.id === assignmentId)
  const students = data.students.filter(row => row.sectionId === assignment?.sectionId && row.status === 'active')
  const existing = data.attendance.find(row => row.assignmentId === assignmentId && row.date === date)
  const complete = students.length > 0 && students.every(row => records[row.id])
  const save = async () => {
    const done = await act(() => facultyService.submitAttendance({ assignmentId, date, records: students.map(row => ({ studentId: row.id, status: records[row.id] })) }), 'Attendance submitted to the mock workspace.')
    setConfirm(false)
    if (done) setRecords({})
  }
  return <><section className="portal-card"><h2>Record attendance</h2><form onSubmit={event => { event.preventDefault(); setConfirm(true) }}><div className="portal-filters"><AssignmentField data={data} value={assignmentId} onChange={value => { setAssignment(value); setRecords({}) }} /><Field label="Attendance date"><input type="date" required max={today()} value={date} onChange={event => { setDate(event.target.value); setRecords({}) }} /></Field></div>
    {existing && <p className="portal-feedback success">Attendance already submitted for this date. Saved records are shown below.</p>}
    {students.length > 0 && !existing && <button type="button" onClick={() => setRecords(Object.fromEntries(students.map(row => [row.id, 'present'])))}>Mark all present</button>}
    <DataTable caption="Attendance register" rows={students} empty={assignmentId ? 'No active students in this section' : 'Select an assigned subject to begin'} columns={[["name", 'Student'], ['rollNumber', 'Roll number'], ['attendance', 'Attendance', row => existing ? <Status>{existing.records.find(record => record.studentId === row.id)?.status || 'unrecorded'}</Status> : <select required aria-label={`Attendance for ${row.name}`} value={records[row.id] || ''} onChange={event => setRecords(previous => ({ ...previous, [row.id]: event.target.value }))}><option value="">Choose status</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></select>]]} />
    <div className="portal-actions"><button className="primary" disabled={busy || !complete || Boolean(existing)}>Review & submit attendance</button></div></form></section>
    <section className="portal-card"><h2>Submitted attendance</h2><DataTable caption="Attendance submission history" rows={data.attendance.filter(row => !assignmentId || row.assignmentId === assignmentId).slice().sort((a, b) => b.date.localeCompare(a.date))} columns={[["date", 'Date'], ['subject', 'Subject & section', row => label(data, row.assignmentId)], ['present', 'Present / Late', row => row.records.filter(record => record.status !== 'absent').length], ['absent', 'Absent', row => row.records.filter(record => record.status === 'absent').length]]} /></section>
    {confirm && <PortalDialog title="Submit attendance?" onClose={() => { if (!busy) setConfirm(false) }}><p>Submit attendance for {students.length} students on {date}? A second submission for this subject and date will be blocked.</p><div className="portal-actions"><button disabled={busy} onClick={() => setConfirm(false)}>Cancel</button><button className="primary" disabled={busy} onClick={save}>{busy ? 'Submitting…' : 'Confirm submission'}</button></div></PortalDialog>}
  </>
}

function MarksEntry({ data, act, busy }) {
  const [assignmentId, setAssignment] = useState(''), [assessment, setAssessment] = useState(''), [maxMarks, setMax] = useState(30), [marks, setMarks] = useState({}), [confirm, setConfirm] = useState(false)
  const section = data.assignments.find(row => row.id === assignmentId)?.sectionId
  const students = data.students.filter(row => row.sectionId === section && row.status === 'active')
  const valid = Number(maxMarks) > 0 && Number(maxMarks) <= 1000 && students.length > 0 && students.every(row => marks[row.id] !== undefined && marks[row.id] !== '' && Number(marks[row.id]) >= 0 && Number(marks[row.id]) <= Number(maxMarks))
  return <><section className="portal-card"><h2>Assessment marks</h2><p>Submissions are saved as mock drafts. Students see published results only.</p><form onSubmit={event => { event.preventDefault(); setConfirm(true) }}><div className="portal-filters"><AssignmentField data={data} value={assignmentId} onChange={value => { setAssignment(value); setMarks({}) }} /><Field label="Assessment name"><input required minLength={2} maxLength={80} value={assessment} onChange={event => setAssessment(event.target.value)} placeholder="e.g. Midterm 2" /></Field><Field label="Maximum marks"><input required type="number" min={1} max={1000} value={maxMarks} onChange={event => setMax(event.target.value)} /></Field></div><DataTable caption="Marks entry register" rows={students} empty="Select an assigned subject to enter marks" columns={[["name", 'Student'], ['rollNumber', 'Roll number'], ['marks', 'Marks', row => <input required type="number" min={0} max={maxMarks} step="0.5" aria-label={`Marks for ${row.name}`} value={marks[row.id] ?? ''} onChange={event => setMarks(previous => ({ ...previous, [row.id]: event.target.value }))} />]]} /><div className="portal-actions"><button disabled={busy || !valid} className="primary">Review & submit marks</button></div></form></section><section className="portal-card"><h2>Assessment history</h2><DataTable caption="Saved assessments" rows={data.results} columns={[["assessment", 'Assessment'], ['subject', 'Subject & section', row => label(data, row.assignmentId)], ['maxMarks', 'Maximum marks'], ['published', 'Status', row => <Status>{row.published ? 'published' : 'draft'}</Status>]]} /></section>
    {confirm && <PortalDialog title="Submit assessment marks?" onClose={() => { if (!busy) setConfirm(false) }}><p>Save {assessment} marks for {students.length} students as a mock draft?</p><div className="portal-actions"><button disabled={busy} onClick={() => setConfirm(false)}>Cancel</button><button className="primary" disabled={busy} onClick={async () => { const done = await act(() => facultyService.submitMarks({ assignmentId, assessment, maxMarks, records: students.map(row => ({ studentId: row.id, marks: marks[row.id] })) }), 'Marks saved as a mock draft.'); setConfirm(false); if (done) { setMarks({}); setAssessment('') } }}>{busy ? 'Submitting…' : 'Confirm submission'}</button></div></PortalDialog>}
  </>
}

function StudentAttendance({ data }) {
  const [assignment, setAssignment] = useState('')
  const sessions = data.attendance.filter(row => !assignment || row.assignmentId === assignment)
  const records = sessions.flatMap(row => row.records), attended = records.filter(row => row.status !== 'absent').length
  const percentage = records.length ? Math.round(attended / records.length * 100) : null
  const summaries = data.assignments.map(row => {
    const records = data.attendance.filter(item => item.assignmentId === row.id).flatMap(item => item.records)
    const present = records.filter(item => item.status !== 'absent').length
    return { ...row, total: records.length, present, percentage: records.length ? Math.round(present / records.length * 100) : null }
  })
  return <><Stats items={[["Sessions recorded", records.length], ['Present / Late', attended], ['Absent', records.length - attended], ['Attendance', percentage === null ? '—' : `${percentage}%`]]} /><section className="portal-card"><h2>Attendance by subject</h2><p>Late sessions count as attended in this mock workspace.</p><DataTable caption="Subject attendance summary" rows={summaries} columns={[["subject", 'Subject', row => row.subject?.name], ['present', 'Attended'], ['total', 'Total sessions'], ['percentage', 'Attendance', row => row.percentage === null ? 'No records' : <div className="portal-progress"><progress aria-label={`${row.subject?.name} attendance`} max={100} value={row.percentage} /><span>{row.percentage}%</span></div>]]} /></section><section className="portal-card"><h2>Attendance history</h2><AssignmentField data={data} value={assignment} onChange={setAssignment} /><button onClick={() => setAssignment('')}>Show all subjects</button><DataTable caption="My attendance records" rows={sessions.slice().sort((a, b) => b.date.localeCompare(a.date))} columns={[["date", 'Date'], ['subject', 'Subject & section', row => label(data, row.assignmentId)], ['status', 'Status', row => <Status>{row.records[0]?.status || 'unrecorded'}</Status>]]} /></section></>
}

function Results({ data }) {
  const [assignment, setAssignment] = useState('')
  const results = data.results.filter(row => !assignment || row.assignmentId === assignment)
  return <section className="portal-card"><h2>Published results</h2><p>Academic records are read-only. Contact your college for corrections.</p><AssignmentField data={data} value={assignment} onChange={setAssignment} /><button onClick={() => setAssignment('')}>Show all subjects</button><DataTable caption="My published assessment results" rows={results} empty="No published results yet" columns={[["assessment", 'Assessment'], ['subject', 'Subject', row => label(data, row.assignmentId)], ['marks', 'Marks', row => `${row.records[0]?.marks ?? '—'} / ${row.maxMarks}`], ['percentage', 'Percentage', row => row.records[0] ? `${Math.round(row.records[0].marks / row.maxMarks * 100)}%` : '—'], ['status', 'Status', () => <Status>published</Status>]]} /></section>
}

function Timetable({ data }) {
  const [day, setDay] = useState('')
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return <section className="portal-card"><h2>Weekly timetable</h2><Field label="Day"><select value={day} onChange={event => setDay(event.target.value)}><option value="">All days</option>{days.map(value => <option key={value}>{value}</option>)}</select></Field><DataTable caption="My weekly class schedule" rows={data.timetable.filter(row => !day || row.day === day).slice().sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.start.localeCompare(b.start))} columns={[["day", 'Day'], ['time', 'Time', row => `${row.start}–${row.end}`], ['subject', 'Subject & section', row => label(data, row.assignmentId)], ['faculty', 'Faculty', row => data.assignments.find(item => item.id === row.assignmentId)?.faculty?.name], ['room', 'Room']]} /></section>
}

function Materials({ data, role, act, busy, error }) {
  const [assignment, setAssignment] = useState(''), [open, setOpen] = useState(false), [form, setForm] = useState({}), [fileError, setFileError] = useState(''), [fileBusy, setFileBusy] = useState(false), [remove, setRemove] = useState(null)
  const update = name => ({ value: form[name] || '', onChange: event => setForm(previous => ({ ...previous, [name]: event.target.value })) })
  const loadFile = async event => {
    const file = event.target.files[0]; setFileError('')
    if (!file) return
    if (file.size > 200000 || !/\.(txt|md)$/i.test(file.name)) { setFileError('Choose a .txt or .md file up to 200 KB.'); event.target.value = ''; return }
    setFileBusy(true)
    try { const content = await file.text(); setForm(previous => ({ ...previous, content, fileName: file.name })) }
    catch { setFileError('Unable to read this file. Try another text file.') }
    finally { setFileBusy(false) }
  }
  return <><section className="portal-card"><header className="portal-section-heading"><h2>Study materials</h2>{role === 'faculty' && <button className="primary" onClick={() => { setOpen(true); setForm({}); setFileError('') }}>Share material</button>}</header><AssignmentField data={data} value={assignment} onChange={setAssignment} /><button onClick={() => setAssignment('')}>Show all subjects</button><DataTable caption="Available learning resources" rows={data.materials.filter(row => !assignment || row.assignmentId === assignment)} columns={[["title", 'Title'], ['subject', 'Subject & section', row => label(data, row.assignmentId)], ['description', 'Description'], ['createdAt', 'Shared on', row => row.createdAt.slice(0, 10)], ['actions', 'Actions', row => <div className="portal-row-actions"><button onClick={() => downloadMaterial(row)}>Download notes</button>{role === 'faculty' && <button onClick={() => setRemove(row)}>Remove</button>}</div>]]} /></section>
    {open && <PortalDialog title="Share study material" onClose={() => { if (!busy) setOpen(false) }}><form onSubmit={async event => { event.preventDefault(); const done = await act(() => facultyService.addMaterial(form), 'Study material shared in the mock workspace.'); if (done) setOpen(false) }}><AssignmentField data={data} value={form.assignmentId || ''} onChange={value => setForm(previous => ({ ...previous, assignmentId: value }))} /><Field label="Title"><input required minLength={2} maxLength={120} {...update('title')} /></Field><Field label="Description"><textarea maxLength={1000} {...update('description')} /></Field><Field label="Import text notes (.txt / .md, up to 200 KB)"><input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={loadFile} /></Field><Feedback error={fileError || error} /><Field label="Study text"><textarea required maxLength={200000} rows={8} {...update('content')} /></Field><div className="portal-actions"><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button><button disabled={busy || fileBusy} className="primary">{busy || fileBusy ? 'Please wait…' : 'Share notes'}</button></div></form></PortalDialog>}
    {remove && <PortalDialog title="Remove study material?" onClose={() => { if (!busy) setRemove(null) }}><p>Remove “{remove.title}” from the mock workspace?</p><div className="portal-actions"><button disabled={busy} onClick={() => setRemove(null)}>Cancel</button><button disabled={busy} className="primary" onClick={async () => { await act(() => facultyService.removeMaterial(remove.id), 'Mock material removed.'); setRemove(null) }}>Remove material</button></div></PortalDialog>}
  </>
}

function LeaveManagement({ data, act, busy, error }) {
  const [open, setOpen] = useState(false), [form, setForm] = useState({ type: 'Casual' }), [cancel, setCancel] = useState(null)
  const update = name => ({ value: form[name] || '', onChange: event => setForm(previous => ({ ...previous, [name]: event.target.value })) })
  return <><section className="portal-card"><header className="portal-section-heading"><h2>My leave requests</h2><button className="primary" onClick={() => { setForm({ type: 'Casual' }); setOpen(true) }}>Request leave</button></header><DataTable caption="Leave request history" rows={data.leaves} columns={[["type", 'Type'], ['from', 'From'], ['to', 'To'], ['reason', 'Reason'], ['status', 'Status', row => <Status>{row.status}</Status>], ['actions', 'Actions', row => row.status === 'pending' ? <button onClick={() => setCancel(row)}>Cancel request</button> : '—']]} /></section>
    {open && <PortalDialog title="Request leave" onClose={() => { if (!busy) setOpen(false) }}><form onSubmit={async event => { event.preventDefault(); const done = await act(() => facultyService.requestLeave(form), 'Leave request saved as pending in the mock workspace.'); if (done) setOpen(false) }}><Feedback error={error} /><Field label="Leave type"><select required {...update('type')}><option>Casual</option><option>Medical</option><option>Earned</option></select></Field><Field label="From date"><input required type="date" min={today()} {...update('from')} /></Field><Field label="To date"><input required type="date" min={form.from || today()} {...update('to')} /></Field><Field label="Reason"><textarea required minLength={10} maxLength={500} rows={4} {...update('reason')} /></Field><div className="portal-actions"><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button><button className="primary" disabled={busy}>Submit leave request</button></div></form></PortalDialog>}
    {cancel && <PortalDialog title="Cancel leave request?" onClose={() => { if (!busy) setCancel(null) }}><p>Cancel your pending request for {cancel.from} to {cancel.to}?</p><div className="portal-actions"><button disabled={busy} onClick={() => setCancel(null)}>Keep request</button><button className="primary" disabled={busy} onClick={async () => { await act(() => facultyService.cancelLeave(cancel.id), 'Leave request cancelled in the mock workspace.'); setCancel(null) }}>Confirm cancellation</button></div></PortalDialog>}
  </>
}

function Notifications({ data, service, act, busy }) {
  const [unread, setUnread] = useState(false)
  return <section className="portal-card"><h2>Notifications</h2><label className="portal-checkbox"><input type="checkbox" checked={unread} onChange={event => setUnread(event.target.checked)} />Unread only</label><DataTable caption="My notifications" rows={data.notifications.filter(row => !unread || !row.readBy.includes(data.me.id)).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))} columns={[["title", 'Title'], ['message', 'Message'], ['createdAt', 'Date', row => row.createdAt.slice(0, 10)], ['actions', 'Status', row => row.readBy.includes(data.me.id) ? <Status>read</Status> : <button disabled={busy} onClick={() => act(() => service.markNotificationRead(row.id), 'Notification marked as read.')}>Mark as read</button>]]} /></section>
}

function Profile({ data, service, act, busy }) {
  const [phone, setPhone] = useState(data.me.phone || '')
  const initials = (data.me.name || 'Faculty').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()
  const department = data.departments.find(row => row.id === data.me.departmentId)?.name || 'Not configured'
  const fields = [['User ID', data.me.id], ['Employee ID', data.me.employeeUserId || 'Not configured'], ['Full name', data.me.name], ['Email address', data.me.email || 'Not configured'], ['Role', data.me.role], ['Department', department], ['Section', data.sections.find(row => row.id === data.me.sectionId)?.name || 'Not assigned'], ['Account status', data.me.status]]
  return <>
    <section className="portal-card portal-profile-overview"><div className="portal-profile-identity"><span className="portal-profile-avatar" aria-hidden="true">{initials}</span><div><h2>{data.me.name || 'My profile'}</h2><p>{data.me.email || 'Email not configured'}</p><span className="portal-status">{data.me.role}</span></div></div><dl className="portal-profile-facts"><div><dt>Employee ID</dt><dd>{data.me.employeeUserId || data.me.id}</dd></div><div><dt>Department</dt><dd>{department}</dd></div><div><dt>Account status</dt><dd><Status>{data.me.status}</Status></dd></div></dl></section>
    <div className="portal-profile-columns"><section className="portal-card"><header className="portal-card-heading"><span className="portal-section-mark" aria-hidden="true">01</span><div><h2>Personal & account information</h2><p>Your saved identity and academic details.</p></div></header><dl className="portal-profile">{fields.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><p className="portal-profile-help">Contact your administrator to update identity or academic information.</p></section>
    <section className="portal-card portal-contact-card"><header className="portal-card-heading"><span className="portal-section-mark" aria-hidden="true">02</span><div><h2>Contact details</h2><p>Keep your mobile number up to date.</p></div></header><form onSubmit={event => { event.preventDefault(); act(() => service.updateProfile({ phone }), 'Contact details saved in the mock workspace.') }}><Field label="Mobile number"><input type="tel" pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={event => setPhone(event.target.value)} placeholder="10-digit Indian mobile number" /></Field><div className="portal-actions"><button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save contact details'}</button></div></form></section></div>
  </>
}

function Fees({ data }) {
  const total = data.fees.reduce((sum, row) => sum + row.amount, 0), paid = data.fees.reduce((sum, row) => sum + row.paid, 0)
  return <><Stats items={[["Total fees", money(total)], ['Paid', money(paid)], ['Outstanding balance', money(total - paid)]]} /><section className="portal-card"><h2>Fee details</h2><p>Read-only fee information. Contact your college finance office for payment or correction requests.</p>{total > 0 && <div className="portal-progress"><progress aria-label="Fees paid" max={total} value={paid} /><span>{Math.round(paid / total * 100)}% paid</span></div>}<DataTable caption="My fee statement" rows={data.fees} columns={[["description", 'Fee component'], ['amount', 'Amount', row => money(row.amount)], ['paid', 'Paid', row => money(row.paid)], ['balance', 'Balance', row => money(row.amount - row.paid)], ['dueDate', 'Due date'], ['status', 'Status', row => <Status>{row.amount === row.paid ? 'paid' : 'pending'}</Status>]]} /></section></>
}
