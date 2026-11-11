import { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiPlus, FiSearch } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import FilterPanel from '../../components/FilterPanel'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'
import ScopedModuleNotice from '../../components/ScopedModuleNotice'
import { useAcademic } from '../../context/AcademicContext'
import { useScreenAccess } from '../../auth/ScreenAccess'
import useScopedModule from '../../services/useScopedModule'
import * as api from '../../services/scopedModulesService'
import academicService from '../../services/academicService'
import roomService from '../../services/roomService'
import { localDay, validateActivity } from '../../utils/meetingSchedule'
import './MeetingsEventsWorkspace.css'

const empty = { meetings: [], events: [], registrations: [], attendance: [], minutes: [] }
const path = '/meetings-events'
const label = value => api.statusLabel(value)
const dateTime = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const time = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
const text = value => value == null || value === '' ? '—' : value
const isCancelled = row => api.statusCode(row.status) === 'CANCELLED'
const statusOptions = { meeting: ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'], event: ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'] }
const columns = {
  meetings: [['title', 'Meeting Title'], ['start', 'Date & Time'], ['department', 'Department'], ['venue', 'Venue'], ['organizer', 'Organizer'], ['status', 'Status']],
  events: [['title', 'Event Name'], ['category', 'Category'], ['start', 'Date & Time'], ['venue', 'Venue'], ['places', 'Registrations / Capacity'], ['status', 'Status']],
  registrations: [['studentName', 'Participant Name'], ['participantCode', 'Student / Faculty ID'], ['eventTitle', 'Event'], ['department', 'Department'], ['registeredAt', 'Registration Date'], ['status', 'Status']],
}

export default function MeetingsEventsWorkspace() {
  const academic = useAcademic()
  return <Workspace key={`${academic.selectedCollegeId}:${academic.selectedAcademicYearId}`} academic={academic} />
}

function Workspace({ academic }) {
  const { selectedCollegeId: collegeId, selectedAcademicYearId: academicYearId } = academic
  const scope = { collegeId, academicYearId, enabled: Boolean(collegeId) }
  const { data, state, reload, mutate } = useScopedModule(api.loadMeetingsEvents, scope, empty)
  const { canAction } = useScreenAccess()
  const [tab, setTab] = useState('calendar')
  const [filters, setFilters] = useState({ query: '', kind: '', department: '', status: '', from: '', to: '', eventId: '' })
  const [selectedDate, setSelectedDate] = useState(() => localDay(new Date()))
  const [view, setView] = useState('month')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState(null)
  const [detail, setDetail] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [notice, setNotice] = useState('')
  const [departments, setDepartments] = useState([])
  const [rooms, setRooms] = useState([])
  const [people, setPeople] = useState({ students: [], faculty: [] })
  const [lookupError, setLookupError] = useState('')
  const changeFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  useEffect(() => {
    if (!collegeId) return
    let active = true
    Promise.allSettled([academicService.getDepartments(true), roomService.getRooms(), api.list('students', { collegeId }), api.list('faculty', { collegeId })]).then(results => {
      if (!active) return
      const values = results.map(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [])
      setDepartments(values[0]); setRooms(values[1]); setPeople({ students: values[2], faculty: values[3] })
      if (results.some(result => result.status === 'rejected')) setLookupError('Some department, room or participant choices could not be loaded. Try refreshing the page.')
    })
    return () => { active = false }
  }, [collegeId])
  const all = [...data.meetings.map(row => ({ ...row, kind: 'meeting' })), ...data.events.map(row => ({ ...row, kind: 'event' }))]
  const enriched = all.map(row => ({ ...row,
    department: row.department || departments.find(item => String(item.departmentId || item.id) === String(row.departmentId))?.name || '',
    organizer: row.organizer || people.faculty.find(item => String(item.userId) === String(row.organizerId || row.organizerUserId))?.fullName || '',
    places: `${row.registeredCount ?? '—'} / ${row.capacity || '—'}`,
  }))
  const registrations = data.registrations.map(row => {
    const person = (row.studentId ? people.students : people.faculty).find(item => String(row.studentId || row.userId) === String(row.studentId ? item.studentId || item.id : item.userId))
    return { ...row, participantCode: row.rollNumber || person?.rollNumber || person?.employeeId || row.studentId || row.userId,
      department: row.department || person?.departmentName || person?.branchName }
  })
  const matches = row => {
    const activity = row.kind ? row : enriched.find(item => item.kind === 'event' && String(item.id) === String(row.eventId))
    const start = activity?.start?.slice(0, 10) || ''
    return (!filters.query || [row.title, row.studentName, row.participantCode, row.eventTitle, row.venue, row.organizer].some(value => String(value || '').toLowerCase().includes(filters.query.toLowerCase()))) &&
      (!filters.kind || activity?.kind === filters.kind) && (!filters.department || activity?.department === filters.department) &&
      (!filters.status || row.status === filters.status) && (!filters.from || (activity?.end || activity?.start || '').slice(0, 10) >= filters.from) &&
      (!filters.to || start <= filters.to) && (!filters.eventId || String(row.eventId) === filters.eventId)
  }
  const activities = enriched.filter(matches).sort((a, b) => String(a.start).localeCompare(String(b.start)))
  const records = tab === 'registrations' ? registrations.filter(matches) : activities.filter(row => row.kind === (tab === 'meetings' ? 'meeting' : 'event'))
  const resource = tab === 'calendar' ? 'meetings' : tab
  const ready = key => !state.loading && !state.waitingForContext && !state.error && !data.resourceErrors?.[key]
  const upcoming = kind => ready(kind === 'meeting' ? 'meetings' : 'events') ? all.filter(row => row.kind === kind && !isCancelled(row) && new Date(row.start) >= new Date()).length : '—'
  const create = kind => {
    if (!canAction(path, 'create')) return
    setEditor({ kind, form: { title: '', start: `${selectedDate}T09:00`, end: `${selectedDate}T10:00`, category: kind === 'event' ? 'OTHER' : '', status: kind === 'event' ? 'DRAFT' : 'SCHEDULED', eventId: filters.eventId || '', participantType: 'STUDENT' } })
  }
  const edit = row => { if (canAction(path, 'edit')) setEditor({ kind: row.kind, old: row, form: { ...row, start: row.start?.slice(0, 16), end: row.end?.slice(0, 16), deadline: row.deadline?.slice(0, 16), status: api.statusCode(row.status) } }) }
  const save = async (kind, form, old) => {
    const allowed = canAction(path, old ? 'edit' : 'create')
    if (!allowed) throw new Error('You do not have permission to save this record.')
    const ok = await mutate(() => api.saveMeetingEvent(kind, form, old, scope), { onError: error => { throw error } })
    if (ok) { setEditor(null); setNotice('Record saved.'); if (form.start) setSelectedDate(form.start.slice(0, 10)) }
  }
  const cancel = async () => {
    const row = confirmation
    if (!row || !canAction(path, 'edit')) return
    const ok = await mutate(() => row.eventId && !row.kind
      ? api.call(`events/${row.eventId}/registrations/${row.apiId}/status`, { method: 'PATCH', query: { collegeId }, body: { status: 'CANCELLED' } })
      : api.saveMeetingEvent(row.kind, { ...row, status: 'CANCELLED' }, row, scope))
    if (ok) { setConfirmation(null); setNotice('Record cancelled.') }
  }
  const showRegistrations = row => { setTab('registrations'); setFilters({ query: '', kind: '', department: '', status: '', from: '', to: '', eventId: String(row.id) }); setPage(1) }
  const createMenu = <CreateMenu disabled={state.loading || state.saving} onCreate={create} visible={canAction(path, 'create')} />
  const filterFields = <>
    {tab === 'calendar' && <Select label="Activity Type" value={filters.kind} onChange={value => changeFilter('kind', value)} options={['meeting', 'event']} />}
    <Select label="Department" value={filters.department} onChange={value => changeFilter('department', value)} options={[...new Set(enriched.map(row => row.department).filter(Boolean))]} />
    <Select label="Status" value={filters.status} onChange={value => changeFilter('status', value)} options={[...new Set((tab === 'registrations' ? registrations : enriched).map(row => row.status))]} />
    {tab === 'registrations' && <Select label="Event" value={filters.eventId} onChange={value => changeFilter('eventId', value)} options={data.events.map(row => ({ value: String(row.id), label: row.title }))} />}
    <label>From<input type="date" value={filters.from} max={filters.to} onChange={event => changeFilter('from', event.target.value)} /></label>
    <label>To<input type="date" value={filters.to} min={filters.from} onChange={event => changeFilter('to', event.target.value)} /></label>
  </>
  return <DashboardLayout><div className="meetings-workspace">
    <PageHeader title="Meetings & Events" subtitle="Schedule meetings, organize campus events and manage participants." compactSummary={[
      { label: 'Upcoming Meetings', value: upcoming('meeting') }, { label: 'Upcoming Events', value: upcoming('event') },
      { label: 'Total Registrations', value: ready('registrations') ? registrations.length : '—' },
    ]} />
    <ScopedModuleNotice state={state} data={data} resource={resource} onRetry={reload} showRelated={false} />
    {notice && <p className="meetings-notice" role="status">{notice}</p>}
    <nav className="meetings-tabs" aria-label="Workspace views">{['calendar', 'meetings', 'events', 'registrations'].map(item => <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => { setTab(item); setPage(1); setFilters(current => ({ ...current, status: '', eventId: '' })) }}>{label(item)}</button>)}</nav>
    <section className="meetings-panel">
      <FilterPanel className="meetings-filters" active={Object.entries(filters).some(([key, value]) => key !== 'query' && value)} onClear={() => { setFilters({ query: '', kind: '', department: '', status: '', from: '', to: '', eventId: '' }); setPage(1) }}
        search={tab === 'calendar' ? <div className="meetings-calendar-nav">
          <button aria-label="Previous period" onClick={() => setSelectedDate(shiftDate(selectedDate, view, -1))}><FiChevronLeft /></button>
          <button aria-label="Next period" onClick={() => setSelectedDate(shiftDate(selectedDate, view, 1))}><FiChevronRight /></button>
          <button onClick={() => setSelectedDate(localDay(new Date()))}>Today</button>
          <strong>{new Date(`${selectedDate}T12:00`).toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong>
        </div> : <label className="meetings-search"><FiSearch aria-hidden="true" /><input aria-label="Search records" placeholder={tab === 'registrations' ? 'Search participant or event' : 'Search title, venue or organizer'} value={filters.query} onChange={event => changeFilter('query', event.target.value)} /></label>}
        filters={filterFields} actions={<>
          {tab === 'calendar' && <div className="meetings-tabs meetings-view" aria-label="Calendar view">{['month', 'week', 'agenda'].map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{label(item)}</button>)}</div>}
          {canAction(path, 'export') && tab !== 'calendar' && <ExportMenu rows={records} columns={columns[tab].map(([key, name]) => ({ key, label: name }))} title={label(tab)} filename={tab} />}
          {tab === 'registrations' ? canAction(path, 'create') && <button className="meetings-primary" disabled={!ready('events')} onClick={() => create('registration')}><FiPlus /> Register Participant</button> : createMenu}
        </>} />
      {tab === 'calendar' ? <Calendar date={selectedDate} onDate={setSelectedDate} view={view} items={activities} onView={setDetail} /> : <>
        <div className="meetings-table-scroll"><table className="meetings-table"><thead><tr>{columns[tab].map(([key, name]) => <th key={key} scope="col">{name}</th>)}<th scope="col">Actions</th></tr></thead>
          <tbody>{records.slice((Math.min(page, Math.max(1, Math.ceil(records.length / 10))) - 1) * 10, Math.min(page, Math.max(1, Math.ceil(records.length / 10))) * 10).map(row => <tr key={row.id}>
            {columns[tab].map(([key]) => <td key={key}>{['start', 'registeredAt'].includes(key) ? <>{dateTime(row[key])}{key === 'start' && <small>Ends {dateTime(row.end)}</small>}</> : text(row[key])}</td>)}
            <td><div className="meetings-row-actions"><button onClick={() => setDetail(row)}>View</button>
              <select aria-label={`More actions for ${row.title || row.studentName}`} value="" onChange={event => { const action = event.target.value; if (action === 'edit') edit(row); if (action === 'cancel') setConfirmation(row); if (action === 'registrations') showRegistrations(row); if (action === 'minutes') setEditor({ kind: 'minute', form: { meetingId: row.id, title: '', minutes: '' } }) }}>
                <option value="">More actions</option>{row.kind && canAction(path, 'edit') && <option value="edit">Edit</option>}
                {canAction(path, 'edit') && !isCancelled(row) && <option value="cancel">Cancel</option>}
                {row.kind === 'event' && <option value="registrations">Manage registrations</option>}
                {row.kind === 'meeting' && canAction(path, 'create') && <option value="minutes">Add minutes</option>}
              </select></div></td>
          </tr>)}{!records.length && <tr><td colSpan={columns[tab].length + 1} className="meetings-empty">{state.loading ? 'Loading records…' : ready(resource) ? 'No matching records.' : 'Records unavailable. Retry loading.'}</td></tr>}</tbody></table></div>
        <footer className="meetings-pagination"><span>{ready(resource) ? `${records.length} records` : 'Records unavailable'}</span><TablePagination page={Math.min(page, Math.max(1, Math.ceil(records.length / 10)))} totalPages={Math.max(1, Math.ceil(records.length / 10))} onPageChange={setPage} /></footer>
      </>}
    </section>
    {editor && <ActivityEditor editor={editor} departments={departments} rooms={rooms} people={people} events={data.events} registrations={registrations} lookupError={lookupError} busy={state.saving} onClose={() => setEditor(null)} onSave={save} scope={scope} />}
    {detail && <ViewDialog title={detail.title || detail.studentName || 'Registration'} className="meetings-dialog" showExport={false} onClose={() => setDetail(null)} footerActions={detail.kind && canAction(path, 'edit') && <button onClick={() => { edit(detail); setDetail(null) }}>Edit</button>}><dl className="meetings-details">
      {(detail.kind ? [['Date & Time', dateTime(detail.start)], ['Ends', dateTime(detail.end)], ['Category', detail.category], ['Department', detail.department], ['Venue', detail.venue], ['Organizer', detail.organizer], ['Status', detail.status], ['Agenda / Description', detail.agenda || detail.description]] : [['Participant', detail.studentName], ['Event', detail.eventTitle], ['Registered', dateTime(detail.registeredAt)], ['Status', detail.status]]).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{text(value)}</dd></div>)}
      {detail.kind === 'meeting' && data.minutes.filter(row => String(row.meetingId) === String(detail.id)).map(row => <div key={row.id}><dt>{row.title || 'Minutes'}</dt><dd>{row.minutes}</dd>{canAction(path, 'edit') && <button onClick={() => { setDetail(null); setEditor({ kind: 'minute', old: row, form: row }) }}>Edit minutes</button>}</div>)}
    </dl></ViewDialog>}
    {confirmation && <ViewDialog title="Cancel record" className="meetings-dialog" busy={state.saving} showExport={false} onClose={() => setConfirmation(null)} footerContent={<><button disabled={state.saving} onClick={() => setConfirmation(null)}>Keep record</button><button className="meetings-primary" disabled={state.saving} onClick={cancel}>{state.saving ? 'Saving…' : 'Confirm cancellation'}</button></>}><p>Cancel {confirmation.title || confirmation.studentName}?</p>{state.saveError && <p role="alert">{state.saveError}</p>}</ViewDialog>}
  </div></DashboardLayout>
}

function Select({ label: name, value, options, onChange }) {
  return <label>{name}<select value={value || ''} onChange={event => onChange(event.target.value)}><option value="">All</option>{options.map(item => <option key={item.value ?? item} value={item.value ?? item}>{item.label ?? label(item)}</option>)}</select></label>
}

function CreateMenu({ visible, disabled, onCreate }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  useEffect(() => {
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  if (!visible) return null
  return <div ref={root} className="meetings-create" onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); root.current.querySelector('button')?.focus() } }}>
    <button className="meetings-primary" aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}><FiPlus /> Create</button>
    {open && <div className="meetings-create-options">{[['meeting', 'Meeting'], ['event', 'Campus Event']].map(([kind, name]) => <button key={kind} onClick={() => { setOpen(false); onCreate(kind) }}>{name}</button>)}</div>}
  </div>
}

function shiftDate(value, view, amount) {
  const date = new Date(`${value}T12:00`)
  if (view === 'month') { date.setDate(1); date.setMonth(date.getMonth() + amount) }
  else date.setDate(date.getDate() + amount * 7)
  return localDay(date)
}

function Calendar({ date, onDate, view, items, onView }) {
  const selected = new Date(`${date}T12:00`)
  const start = new Date(selected)
  if (view === 'month') start.setDate(1)
  start.setDate(start.getDate() - start.getDay())
  const days = Array.from({ length: view === 'week' ? 7 : 42 }, (_, index) => { const next = new Date(start); next.setDate(next.getDate() + index); return localDay(next) })
  const forDay = day => items.filter(item => item.start?.slice(0, 10) <= day && (item.end || item.start)?.slice(0, 10) >= day)
  const agenda = view === 'agenda' ? items.filter(item => (item.end || item.start)?.slice(0, 10) >= date) : forDay(date)
  return <div className="meetings-calendar">
    <div className="meetings-legend"><span className="meeting">● Meeting</span><span className="event">● Event</span><span>Cancelled activities are muted</span></div>
    {view !== 'agenda' && <div className="meetings-month">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="meetings-weekday" key={day}>{day}</div>)}{days.map(day => <button key={day} aria-label={day} aria-pressed={day === date} className={`meetings-day${day.slice(0, 7) !== date.slice(0, 7) ? ' outside' : ''}`} onClick={() => onDate(day)}><strong>{Number(day.slice(-2))}</strong>{forDay(day).slice(0, 2).map(item => <span key={`${item.kind}-${item.id}`} title={item.title} className={`${item.kind}${isCancelled(item) ? ' cancelled' : ''}`}>{time(item.start)} {item.title}</span>)}{forDay(day).length > 2 && <small>+{forDay(day).length - 2} more</small>}</button>)}</div>}
    <section className="meetings-agenda" aria-label="Daily agenda"><h2>{view === 'agenda' ? 'Upcoming activities' : selected.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      {agenda.map(item => <button key={`${item.kind}-${item.id}`} className={`meetings-agenda-item ${item.kind}${isCancelled(item) ? ' cancelled' : ''}`} onClick={() => onView(item)}><span>{view === 'agenda' ? dateTime(item.start) : time(item.start)}</span><strong>{item.title}</strong><span>{text(item.venue)}</span><span>{item.status}</span></button>)}
      {!agenda.length && <p>No activities scheduled.</p>}
    </section>
  </div>
}

function ActivityEditor({ editor, onClose, onSave, busy: saving, departments, rooms, people, events, registrations, lookupError, scope }) {
  const { kind, old } = editor
  const [form, setForm] = useState(editor.form)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = saving || submitting
  const lock = useRef(false)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const field = (key, name, attributes = {}) => <label>{name}<input {...attributes} value={form[key] ?? ''} onChange={event => set(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `activity-${key}-error` : undefined} />{errors[key] && <small id={`activity-${key}-error`} role="alert">{errors[key]}</small>}</label>
  const submit = async event => {
    event.preventDefault()
    if (lock.current) return
    const found = kind === 'meeting' || kind === 'event' ? validateActivity(form, kind) : {}
    if (kind === 'registration' && registrations.some(row => String(row.eventId) === String(form.eventId) && !isCancelled(row) && (form.participantType === 'STUDENT' ? String(row.studentId) === String(form.studentId) : String(row.userId) === String(form.userId)))) found.participant = 'This participant is already registered.'
    setErrors(found)
    if (Object.keys(found).length) return
    lock.current = true; setSubmitting(true); setError('')
    try {
      if (kind === 'meeting' || kind === 'event') {
        const result = api.unwrap(await api.call('meeting-event-validation/schedules/validate', { method: 'POST', body: { collegeId: Number(scope.collegeId), title: form.title, startAt: form.start, endAt: form.end, classroomId: form.roomId ? Number(form.roomId) : null, excludeMeetingId: kind === 'meeting' && old ? Number(old.id) : null, excludeEventId: kind === 'event' && old ? Number(old.id) : null } }))
        if (result?.isValid === false) throw new Error(result.issues?.map(item => item.message).join(' ') || 'This schedule conflicts with another activity.')
      }
      await onSave(kind, form, old)
    } catch (failure) { setError(failure.message || 'Unable to save. Please retry.') }
    finally { lock.current = false; setSubmitting(false) }
  }
  const title = kind === 'registration' ? 'Register Participant' : kind === 'minute' ? `${old ? 'Edit' : 'Add'} Minutes` : `${old ? 'Edit' : 'Create'} ${kind === 'event' ? 'Campus Event' : 'Meeting'}`
  return <ViewDialog title={title} maxWidth="820px" className="meetings-dialog" busy={busy} showExport={false} onClose={onClose} footerContent={<><button disabled={busy} onClick={onClose}>Cancel</button><button className="meetings-primary" disabled={busy} type="submit" form="meeting-event-form">{busy ? 'Saving…' : old ? 'Save Changes' : kind === 'meeting' ? 'Save Meeting' : kind === 'event' ? 'Create Event' : 'Save'}</button></>}>
    <form id="meeting-event-form" onSubmit={submit} className="meetings-form"><fieldset disabled={busy}>
      {['meeting', 'event'].includes(kind) && <>
        <div className="meetings-full">{field('title', `${kind === 'event' ? 'Event' : 'Meeting'} Title *`, { required: true, maxLength: kind === 'event' ? 200 : 250 })}</div>
        {field('start', 'Start Date & Time *', { type: 'datetime-local', required: true })}{field('end', 'End Date & Time *', { type: 'datetime-local', required: true, min: form.start })}
        {kind === 'event' ? <label>Category<select value={form.category || 'OTHER'} onChange={event => set('category', event.target.value)}>{['TECHNICAL', 'CULTURAL', 'SPORTS', 'WORKSHOP', 'SEMINAR', 'OTHER'].map(item => <option key={item}>{item}</option>)}</select></label> : field('category', 'Meeting Category', { maxLength: 50 })}
        {kind === 'event' && <label>Responsible Department<select value={form.departmentId || ''} onChange={event => set('departmentId', event.target.value)}><option value="">Select department</option>{departments.map(item => <option key={item.departmentId || item.id} value={item.departmentId || item.id}>{item.name || item.departmentName}</option>)}</select></label>}
        <label>Venue / Room<input list="meeting-rooms" value={form.venue || ''} maxLength={250} onChange={event => { const room = rooms.find(item => (item.roomName || item.roomNumber) === event.target.value); setForm(current => ({ ...current, venue: event.target.value, roomId: room?.roomId || room?.id || '' })) }} /><datalist id="meeting-rooms">{rooms.map(item => <option key={item.roomId || item.id} value={item.roomName || item.roomNumber} />)}</datalist></label>
        <label>Organizer / Chair<select value={form.organizerId || form.organizerUserId || ''} onChange={event => set(kind === 'meeting' ? 'organizerId' : 'organizerUserId', event.target.value)}><option value="">Select faculty / staff</option>{people.faculty.filter(item => item.userId).map(item => <option key={item.userId} value={item.userId}>{item.fullName || item.facultyName || item.name}</option>)}</select></label>
        {kind === 'event' && <>{field('capacity', 'Maximum Capacity', { type: 'number', min: 1, step: 1 })}{field('deadline', 'Registration Deadline', { type: 'datetime-local', max: form.start })}</>}
        <label>Status<select value={form.status} onChange={event => set('status', event.target.value)}>{statusOptions[kind].map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label className="meetings-full">{kind === 'meeting' ? 'Agenda / Discussion Topics' : 'Event Description'}<textarea rows={3} maxLength={kind === 'meeting' ? 1000 : 16000} value={form[kind === 'meeting' ? 'agenda' : 'description'] || ''} onChange={event => set(kind === 'meeting' ? 'agenda' : 'description', event.target.value)} /></label>
      </>}
      {kind === 'registration' && <>
        <label>Event *<select required value={form.eventId || ''} onChange={event => set('eventId', event.target.value)}><option value="">Select event</option>{events.filter(row => ['PUBLISHED', 'ONGOING'].includes(api.statusCode(row.status))).map(row => <option key={row.id} value={row.id}>{row.title} · {row.registeredCount} / {row.capacity || '—'}</option>)}</select></label>
        <label>Participant Type<select value={form.participantType} onChange={event => setForm(current => ({ ...current, participantType: event.target.value, studentId: '', userId: '' }))}><option value="STUDENT">Student</option><option value="STAFF">Faculty / Staff</option></select></label>
        <label className="meetings-full">Participant *<select required value={form.participantType === 'STUDENT' ? form.studentId || '' : form.userId || ''} onChange={event => set(form.participantType === 'STUDENT' ? 'studentId' : 'userId', event.target.value)}><option value="">Select saved participant</option>{(form.participantType === 'STUDENT' ? people.students : people.faculty.filter(item => item.userId)).map(item => <option key={item.studentId || item.userId || item.id} value={form.participantType === 'STUDENT' ? item.studentId || item.id : item.userId}>{item.fullName || item.studentName || item.facultyName || item.name} · {item.rollNumber || item.employeeId || item.studentId || item.userId}</option>)}</select>{errors.participant && <small role="alert">{errors.participant}</small>}</label>
      </>}
      {kind === 'minute' && <>{field('title', 'Minutes Title', { maxLength: 250 })}<label className="meetings-full">Minutes *<textarea required rows={5} value={form.minutes || ''} onChange={event => set('minutes', event.target.value)} /></label></>}
    </fieldset>{lookupError && <p className="meetings-hint">{lookupError}</p>}{error && <p className="meetings-error" role="alert">{error}</p>}</form>
  </ViewDialog>
}
