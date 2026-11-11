import ScopedModuleNotice from '../../components/ScopedModuleNotice'
import * as campusApi from '../../services/scopedModulesService'
import useScopedModule from '../../services/useScopedModule'
import { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../components/SearchableSelect'
import { createPortal } from 'react-dom'
import { useState as reactImports_useState, useMemo as reactImports_useMemo, useEffect as reactImports_useEffect } from 'react'
import { NavLink as react_router_domImports_NavLink, useSearchParams as react_router_domImports_useSearchParams } from 'react-router-dom'
import { FiPlus, FiSearch, FiFileText, FiBook, FiBookOpen, FiGrid, FiList, FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiClock, FiUser, FiUsers, FiTag, FiDownload, FiTrash2, FiEdit3, FiEye, FiMapPin, FiX, FiCheck, FiBookmark, FiBarChart2, FiTrendingUp, FiDollarSign, FiCalendar, FiEdit2, FiActivity, FiCheckSquare, FiBriefcase, FiAward, FiExternalLink, FiMail, FiPhone, FiGlobe } from 'react-icons/fi'
import DashboardLayoutImports_default from '../../layouts/DashboardLayout'
import PageHeaderImports_default from '../../components/PageHeader'
import EmptyStateImports_default from '../../components/EmptyState'
import TablePaginationImports_default from '../../components/TablePagination'
import { useAcademic as AcademicContextImports_useAcademic } from '../../context/AcademicContext'
import { getUserRole as authImports_getUserRole } from '../../auth/auth'
import { ROLES as rolesImports_ROLES } from '../../auth/roles'
import { campusModules as campusModulesImports_campusModules, validateCampusDraft as campusModulesImports_validateCampusDraft } from '../../utils/campusModules'
import { printResults as exportUtilsImports_printResults } from '../../utils/exportUtils'
import FilterPanelImports_default from '../../components/FilterPanel'
import ExportMenuImports_default from '../../components/ExportMenu'
import academicServiceImports_default from '../../services/academicService'
import roomServiceImports_default from '../../services/roomService'
import * as SearchableSelectImports from '../../components/SearchableSelect'
import * as reactImports from 'react'
import * as fiImports from 'react-icons/fi'
import * as FilterPanelImports from '../../components/FilterPanel'
import './CampusWorkspace.css'
import CompanyLogo from '../../components/CompanyLogo'

// CampusWorkspace screen and private helpers.
const CampusWorkspaceScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useState = reactImports_useState
const NavLink = react_router_domImports_NavLink
const useSearchParams = react_router_domImports_useSearchParams
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const EmptyState = EmptyStateImports_default
const TablePagination = TablePaginationImports_default
const useAcademic = AcademicContextImports_useAcademic
const getUserRole = authImports_getUserRole
const ROLES = rolesImports_ROLES
const campusModules = campusModulesImports_campusModules
const validateCampusDraft = campusModulesImports_validateCampusDraft

function CampusWorkspace({ module }) {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  return <DashboardLayout><Workspace key={`${module}:${selectedCollegeId}:${selectedAcademicYearId}`} module={module} collegeId={selectedCollegeId} /></DashboardLayout>
}

function Workspace({ module, collegeId }) {
  const definition = campusModules[module]
  const [params] = useSearchParams()
  const area = definition.areas.find(item => item.key === params.get('tab')) || definition.areas[0]
  const admin = getUserRole() === ROLES.ADMIN
  const [drafts, setDrafts] = useState({})
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleting, setDeleting] = useState(null)
  const records = drafts[area.key] || []
  const filtered = records.filter(row => status !== 'official' && Object.values(row.values).some(value => String(value).toLowerCase().includes(query.toLowerCase().trim())))
  const reset = () => { setQuery(''); setStatus('all'); setPage(1); setEditor(null); setDetail(null); setError(''); setNotice(''); setDeleting(null) }
  function save(event) {
    event.preventDefault()
    const values = Object.fromEntries(Object.entries(editor.values).map(([key, value]) => [key, String(value).trim()]))
    const validation = validateCampusDraft(area, values)
    const duplicate = area.key === 'copies' && records.some(row => row.id !== editor.id && (row.values.accession.toLowerCase() === values.accession?.toLowerCase() || row.values.barcode.toLowerCase() === values.barcode?.toLowerCase()))
    if (validation || duplicate) { setError(validation || 'Accession number and barcode must be unique among these drafts.'); return }
    const record = { id: editor.id || crypto.randomUUID(), values }
    setDrafts(previous => ({ ...previous, [area.key]: editor.id ? records.map(row => row.id === editor.id ? record : row) : [...records, record] }))
    setEditor(null); setError(''); setQuery(''); setStatus('all'); setPage(1)
    setNotice('Draft prepared for review. It has not been submitted and will be cleared when you leave this page or change academic context.')
  }
  const summary = <div className="campus-summary">
    <div><span>Workspace</span><strong>{area.label}</strong></div>
    <div><span>{module === 'results' ? 'Publication' : 'Institutional records'}</span><strong>Not connected</strong></div>
    <div><span>{module === 'results' ? 'Grading policy' : 'Drafts on this page'}</span><strong>{module === 'results' ? 'Institution approved only' : records.length}</strong></div>
  </div>
  return <div className={`campus-workspace${module === 'library' ? ' campus-workspace--library' : ''}`}>
    {module === 'library' ? <div className="campus-overview"><PageHeader breadcrumb={['Campus Services', definition.title]} title={definition.title} subtitle={definition.subtitle} />{summary}</div> : <PageHeader breadcrumb={['Campus Services', definition.title]} title={definition.title} subtitle={definition.subtitle} />}
    <div className="campus-notice"><FiFileText aria-hidden="true" /><span>{module === 'results' ? 'Published institutional results are not connected yet. Official grades and marks memos will be shown only after publication is available.' : 'Planning workspace · Drafts stay on this page only. Institutional records and submission are not connected yet.'}</span></div>
    <nav className="campus-tabs" aria-label={`${definition.title} sections`}>
      {definition.areas.map(item => <NavLink key={item.key} to={`/${module}?tab=${item.key}`} onClick={reset} className={area.key === item.key ? 'is-selected' : ''} aria-current={area.key === item.key ? 'page' : undefined}>{item.label}</NavLink>)}
    </nav>
    {module !== 'library' && summary}
    {notice && <p className="campus-notice" role="status">{notice}</p>}
    {!collegeId && <p className="campus-notice">Select a college from the sidebar to prepare drafts.</p>}
    {editor ? <section className={`campus-panel${module === 'library' ? ' erp-card' : ''}`}>
      <h2>{editor.id ? 'Edit' : 'Prepare'} {area.label.toLowerCase()} draft</h2>
      <p className="campus-muted">Review the details below. This form does not create an institutional record.</p>
      <form onSubmit={save}>
        <div className="campus-form">
          {area.fields.map(field => <label key={field.key}>{field.label}{field.required ? ' *' : ''}
            {field.type === 'select' ? <ProjectSelect required={field.required} value={editor.values[field.key] || ''} onChange={e => setEditor({ ...editor, values: { ...editor.values, [field.key]: e.target.value } })}><option value="">Select {field.label.toLowerCase()}</option>{field.options.map(option => <option key={option}>{option}</option>)}</ProjectSelect>
              : field.type === 'textarea' ? <textarea required={field.required} maxLength={4000} value={editor.values[field.key] || ''} onChange={e => setEditor({ ...editor, values: { ...editor.values, [field.key]: e.target.value } })} />
                : <input type={field.type} required={field.required} min={field.type === 'number' ? 1 : undefined} step={field.type === 'number' ? 1 : undefined} maxLength={250} value={editor.values[field.key] || ''} onChange={e => setEditor({ ...editor, values: { ...editor.values, [field.key]: e.target.value } })} />}
          </label>)}
        </div>
        {error && <p role="alert" className="campus-error">{error}</p>}
        <div className="campus-actions"><button className="erp-btn erp-btn--secondary" type="button" onClick={() => { setEditor(null); setError('') }}>Cancel</button><button className="erp-btn erp-btn--primary" type="submit">Keep draft on this page</button></div>
      </form>
    </section> : detail ? <section className={`campus-panel${module === 'library' ? ' erp-card' : ''}`}>
      <div className="campus-panel-heading"><h2>Draft details</h2><button className="erp-btn erp-btn--secondary" onClick={() => setDetail(null)}>Back to list</button></div>
      <p className="campus-muted">Unsubmitted draft · Not an institutional record</p>
      <dl className="campus-form">{area.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{detail.values[field.key] || '—'}</dd></div>)}</dl>
    </section> : <section className={`campus-panel${module === 'library' ? ' erp-card' : ''}`}>
      <div className="campus-panel-heading"><div>{module === 'library' && <span className="campus-section-kicker">Library workspace</span>}<h2>{area.label}</h2><p className="campus-muted">{area.description || (module === 'results' ? 'Only approved and published institutional records belong in this view.' : 'Review records and prepare details for your institution.')}</p></div>
        {admin && area.fields.length > 0 && <button disabled={!collegeId} className="erp-btn erp-btn--primary" onClick={() => { setEditor({ values: {} }); setError(''); setNotice('') }}><FiPlus /> Prepare draft</button>}
      </div>
      <div className="campus-filters"><label><span>Search {area.label.toLowerCase()}</span><div className="campus-search"><FiSearch aria-hidden="true" /><input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder={module === 'results' ? 'Student, roll number or subject' : module === 'library' ? area.key === 'catalog' ? 'Search title, author or ISBN' : area.key === 'copies' ? 'Search title, accession number or barcode' : 'Search borrower, book or reference' : 'Search by name or reference'} /></div></label>
        <label>Record type<ProjectSelect value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="all">All records</option>{module !== 'results' && <option value="draft">Page drafts</option>}<option value="official">Institutional records</option></ProjectSelect></label>
        <button className="erp-btn erp-btn--secondary" onClick={() => { setQuery(''); setStatus('all'); setPage(1) }}>Reset filters</button>
      </div>
      {deleting && <div className="campus-notice" role="alert"><span>Remove this unsubmitted draft?</span><button className="erp-btn erp-btn--secondary" onClick={() => setDeleting(null)}>Keep</button><button className="erp-btn erp-btn--secondary" onClick={() => { setDrafts(previous => ({ ...previous, [area.key]: records.filter(row => row.id !== deleting) })); setDeleting(null); setPage(1) }}>Remove draft</button></div>}
      <div className={`campus-table${module === 'library' ? ' erp-table-responsive' : ''}`}><table className={module === 'library' ? 'erp-table' : undefined}><caption className={module === 'library' ? 'campus-table-caption' : 'campus-muted'}>{module === 'library' ? <><span className="campus-table-caption__title">Draft records</span><span className="campus-table-caption__count">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</span><span className="campus-table-caption__note">Institutional records are not connected</span></> : `${filtered.length} page drafts · Institutional records unavailable`}</caption><thead><tr>{area.columns.map(column => <th key={column}>{column}</th>)}{area.fields.length > 0 && <><th>Status</th><th>Actions</th></>}</tr></thead><tbody>
        {filtered.slice((page - 1) * 10, page * 10).map(row => <tr key={row.id}>{area.fields.slice(0, area.columns.length).map(field => <td key={field.key}>{row.values[field.key] || '—'}</td>)}<td><span className="campus-badge">Unsubmitted draft</span></td><td><div className="campus-actions"><button onClick={() => setDetail(row)}>View</button>{admin && <><button onClick={() => setEditor(row)}>Edit</button><button onClick={() => setDeleting(row.id)}>Remove</button></>}</div></td></tr>)}
      </tbody></table></div>
      {!filtered.length && <EmptyState title={query || status !== 'all' ? 'No matching records' : `No ${area.label.toLowerCase()} to display`} message={module === 'results' ? 'Published results are not yet available in this portal. Contact the examination office for your official statement.' : records.length ? 'Try another search or reset the filters.' : area.fields.length && admin ? 'Prepare a draft to review the details here. Submission will be available when institutional services are connected.' : 'Institutional records will appear here once this service is connected.'} />}
      <TablePagination page={page} totalPages={Math.ceil(filtered.length / 10)} onPageChange={setPage} />
    </section>}
  </div>
}

return { default: CampusWorkspace }
})()

// MeetingsEventsWorkspace screen and private helpers.
const MeetingsEventsWorkspaceScreen = (() => {
const mergedMeetingsEventsCalendarImport0 = SearchableSelectImports
const mergedMeetingsEventsCalendarImport1 = reactImports
const mergedMeetingsEventsCalendarImport2 = fiImports
const mergedMeetingsEventsCalendarImport3 = FilterPanelImports
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useState = reactImports_useState
const useMemo = reactImports_useMemo
const useEffect = reactImports_useEffect
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const ExportMenu = ExportMenuImports_default
const FilterPanel = FilterPanelImports_default
const TablePagination = TablePaginationImports_default
const useAcademic = AcademicContextImports_useAcademic
const academicService = academicServiceImports_default
const roomService = roomServiceImports_default

// Export column definitions matching ERP export standard
const meetingExportColumns = [
  { label: 'Meeting Title', value: 'title' },
  { label: 'Category', value: 'category' },
  { label: 'Starts At', value: 'start' },
  { label: 'Ends At', value: 'end' },
  { label: 'Venue', value: 'venue' },
  { label: 'Organizer', value: 'organizer' },
  { label: 'Audience', value: 'audience' },
  { label: 'Status', value: 'status' },
  { label: 'Agenda', value: 'agenda' },
]

const eventExportColumns = [
  { label: 'Event Title', value: 'title' },
  { label: 'Category', value: 'category' },
  { label: 'Starts At', value: 'start' },
  { label: 'Ends At', value: 'end' },
  { label: 'Venue', value: 'venue' },
  { label: 'Organizer', value: 'organizer' },
  { label: 'Capacity', value: 'capacity' },
  { label: 'Registered Count', value: 'registeredCount' },
  { label: 'Deadline', value: 'deadline' },
  { label: 'Status', value: 'status' },
]

const registrationExportColumns = [
  { label: 'Participant Name', value: 'studentName' },
  { label: 'Roll Number', value: 'rollNumber' },
  { label: 'Department', value: 'department' },
  { label: 'Year', value: 'year' },
  { label: 'Event Title', value: 'eventTitle' },
  { label: 'Ticket Code', value: 'ticketCode' },
  { label: 'Registration Date', value: 'registeredAt' },
  { label: 'Status', value: 'status' },
]

const attendanceExportColumns = [
  { label: 'Participant Name', value: 'participantName' },
  { label: 'Role / Designation', value: 'participantRole' },
  { label: 'Department', value: 'department' },
  { label: 'Activity Type', value: 'activityType' },
  { label: 'Activity Title', value: 'activityTitle' },
  { label: 'Check-in Mode', value: 'mode' },
  { label: 'Check-in Timestamp', value: 'checkInTime' },
  { label: 'Attendance Status', value: 'status' },
]

const minuteExportColumns = [
  { label: 'Meeting Title', value: 'meetingTitle' },
  { label: 'Meeting Date', value: 'meetingDate' },
  { label: 'Action Item', value: 'actionItem' },
  { label: 'Assigned Owner', value: 'owner' },
  { label: 'Due Date', value: 'dueDate' },
  { label: 'Priority', value: 'priority' },
  { label: 'Status', value: row => row.completed ? 'Resolved' : 'Pending' },
  { label: 'Decision Summary', value: 'decisionSummary' },
]

const calendarExportColumns = [
  { label: 'Activity Type', value: 'activityType' },
  { label: 'Title', value: 'title' },
  { label: 'Category', value: 'category' },
  { label: 'Starts At', value: 'start' },
  { label: 'Ends At', value: 'end' },
  { label: 'Venue', value: 'venue' },
  { label: 'Organizer', value: 'organizer' },
  { label: 'Status', value: 'status' },
]

function removeMeetingsEventsDemoRecords(data) {
  const demoIds = new Set([
    ...defaultMeetings,
    ...defaultEvents,
    ...defaultRegistrations,
    ...defaultAttendance,
    ...defaultMinutes,
  ].map(record => record.id))

  return Object.fromEntries(
    Object.entries(data).map(([key, records]) => [
      key,
      Array.isArray(records) ? records.filter(record => !demoIds.has(record.id)) : records,
    ])
  )
}

function MeetingsEventsWorkspace() {
  const [activeTab, setActiveTab] = useState('calendar')
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const scope = `${selectedCollegeId || '1'}:${selectedAcademicYearId || '1'}`
  const storageKey = `cms-meetings-events-data:${scope}`

  const apiScope = { collegeId: selectedCollegeId, academicYearId: selectedAcademicYearId, enabled: Boolean(selectedCollegeId), resource: activeTab === 'calendar' ? undefined : activeTab }
  const { data, reload: reloadApi, state: apiState, mutate: mutateApi } = useScopedModule(campusApi.loadMeetingsEvents, apiScope, { meetings: [], events: [], registrations: [], attendance: [], minutes: [] })

  const [departmentOptions, setDepartmentOptions] = useState([])
  const [roomOptions, setRoomOptions] = useState([])

  useEffect(() => {
    let active = true
    Promise.all([academicService.getDepartments(true), roomService.getRooms()]).then(([departments, rooms]) => {
      if (!active) return
      setDepartmentOptions([...new Set((Array.isArray(departments) ? departments : []).filter(item => item.status !== 'Inactive').map(item => item.name || item.departmentName).filter(Boolean))])
      setRoomOptions((Array.isArray(rooms) ? rooms : []).filter(item => item.status !== 'Inactive').map(room => ({ value: room.roomNumber ? `${room.roomName} (${room.roomNumber})` : room.roomName, label: `${room.roomName || room.roomNumber}${room.roomNumber && room.roomName ? ` · ${room.roomNumber}` : ''} — ${room.buildingBlock || room.building || 'Campus'} · ${room.floor || 'Floor not set'}` })).filter(room => room.value))
    }).catch(() => { if (active) { setDepartmentOptions([]); setRoomOptions([]) } })
    return () => { active = false }
  }, [scope])



  // Active tab: 'meetings' | 'events' | 'registrations' | 'attendance' | 'minutes'

  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [notice, setNotice] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, statusFilter, categoryFilter])

  // Modal State for Create / Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalType, setModalType] = useState('meeting')
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({})

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, type, title }

  // Quick KPI metrics calculation
  const totalScheduled = data.meetings.length + data.events.length
  const upcomingCount = useMemo(() => {
    const upcomingMeetings = data.meetings.filter(m => m.status === 'Upcoming' || m.status === 'In Progress').length
    const upcomingEvents = data.events.filter(e => e.status === 'Upcoming').length
    return upcomingMeetings + upcomingEvents
  }, [data.meetings, data.events])

  const totalRegistrations = data.registrations.length

  // Filtered dataset for active tab
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    if (activeTab === 'meetings') {
      return data.meetings.filter(item => {
        const matchQ = !q || String(item.title ?? "").toLowerCase().includes(q) || String(item.venue ?? "").toLowerCase().includes(q) || String(item.organizer ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter
        return matchQ && matchStatus && matchCat
      })
    }

    if (activeTab === 'events') {
      return data.events.filter(item => {
        const matchQ = !q || String(item.title ?? "").toLowerCase().includes(q) || String(item.venue ?? "").toLowerCase().includes(q) || String(item.organizer ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter
        return matchQ && matchStatus && matchCat
      })
    }

    if (activeTab === 'registrations') {
      return data.registrations.filter(item => {
        const matchQ = !q || String(item.studentName ?? "").toLowerCase().includes(q) || String(item.rollNumber ?? "").toLowerCase().includes(q) || String(item.eventTitle ?? "").toLowerCase().includes(q) || String(item.department ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        return matchQ && matchStatus
      })
    }

    if (activeTab === 'attendance') {
      return data.attendance.filter(item => {
        const matchQ = !q || String(item.participantName ?? "").toLowerCase().includes(q) || String(item.activityTitle ?? "").toLowerCase().includes(q) || String(item.department ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        return matchQ && matchStatus
      })
    }

    if (activeTab === 'minutes') {
      return data.minutes.filter(item => {
        const matchQ = !q || String(item.meetingTitle ?? "").toLowerCase().includes(q) || String(item.actionItem ?? "").toLowerCase().includes(q) || String(item.owner ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || (statusFilter === 'COMPLETED' ? item.completed : !item.completed)
        return matchQ && matchStatus
      })
    }

    return []
  }, [activeTab, data, searchQuery, statusFilter, categoryFilter])

  const calendarExportRows = useMemo(() => [
    ...data.meetings.map(item => ({ ...item, activityType: 'Meeting' })),
    ...data.events.map(item => ({ ...item, activityType: 'Event' })),
  ], [data.meetings, data.events])

  // Paginated dataset
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  // Current export columns
  const currentExportColumns = useMemo(() => {
    switch (activeTab) {
      case 'calendar': return calendarExportColumns
      case 'meetings': return meetingExportColumns
      case 'events': return eventExportColumns
      case 'registrations': return registrationExportColumns
      case 'attendance': return attendanceExportColumns
      case 'minutes': return minuteExportColumns
      default: return []
    }
  }, [activeTab])
  const currentExportRows = activeTab === 'calendar' ? calendarExportRows : filteredList

  // Open modal for Create or Edit
  const openCreateModal = (type) => {
    setModalError('')
    setModalType(type)
    setEditingItem(null)
    if (type === 'meeting') {
      setFormData({
        title: '',
        category: 'Academic Council',
        department: '',
        start: new Date().toISOString().slice(0, 16),
        end: new Date(Date.now() + 7200000).toISOString().slice(0, 16),
        venue: '',
        organizer: '',
        audience: 'Faculty',
        agenda: '',
        status: 'Upcoming',
      })
    } else if (type === 'event') {
      setFormData({
        title: '',
        category: 'Technical',
        department: '',
        organizer: '',
        start: new Date().toISOString().slice(0, 16),
        end: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        venue: '',
        capacity: 100,
        registeredCount: 0,
        deadline: new Date(Date.now() + 43200000).toISOString().slice(0, 16),
        description: '',
        status: 'Upcoming',
      })
    } else if (type === 'registration') {
      setFormData({
        eventId: data.events[0]?.id || '',
        eventTitle: data.events[0]?.title || '',
        studentName: '',
        rollNumber: '', studentId: '',
        department: 'Computer Science and Engineering',
        year: '3rd Year',
        status: 'Confirmed',
        ticketCode: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      })
    } else if (type === 'minute') {
      setFormData({
        meetingId: data.meetings[0]?.id || '',
        meetingTitle: data.meetings[0]?.title || '',
        meetingDate: new Date().toISOString().slice(0, 10),
        decisionSummary: '',
        actionItem: '',
        owner: '',
        dueDate: new Date(Date.now() + 604800000).toISOString().slice(0, 10),
        priority: 'High',
        completed: false,
      })
    }
    setModalOpen(true)
  }

  const openEditModal = (item, type) => {
    setModalError('')
    setModalType(type)
    setEditingItem(item)
    setFormData({ ...item })
    setModalOpen(true)
  }

  const handleSaveModal = async e => {
    e.preventDefault()
    if (modalType === 'meeting' || modalType === 'event') {
      setModalError('Meetings and campus events cannot be saved because the date and time fields have been removed. Contact an administrator to schedule them.')
      return
    }
    setModalError('')
    if (await mutateApi(() => campusApi.saveMeetingEvent(modalType, formData, editingItem, apiScope))) { setModalOpen(false); setNotice('Record saved successfully.') }
  }

  // Request Delete with popup
  const requestDelete = (id, type, title) => {
    setDeleteTarget({ id, type, title })
  }

  // Confirm delete from popup
  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id, type } = deleteTarget
    const collection = { meeting: 'meetings', event: 'events', registration: 'registrations', attendance: 'attendance', minute: 'minutes' }[type]
    const item = data[collection]?.find(r => r.id === id)
    if (!item) return
    const path = type === 'meeting' ? `meetings/${item.id}` : type === 'event' ? `events/${item.id}` : type === 'registration' ? `events/${item.eventId}/registrations/${item.apiId}` : `meetings/${item.meetingId}/${type === 'minute' ? 'minutes' : 'attendance'}/${item.apiId}`
    if (await mutateApi(() => campusApi.call(path, { method: 'DELETE', query: { collegeId: selectedCollegeId } }))) { setDeleteTarget(null); setNotice('Record deleted successfully.') }
  }

  // Direct attendance status setter
  const saveAttendance = (item, status) => campusApi.call(`meetings/${item.meetingId}/attendance`, { method: 'PUT', body: { participantId: item.participantId, attendanceStatus: status.toUpperCase(), checkInAt: ['Present','Late'].includes(status) ? new Date().toISOString() : null } })
  const handleSetAttendanceStatus = (id, status) => { const item = data.attendance.find(a => a.id === id); if (item) mutateApi(() => saveAttendance(item, status)) }
  const markAllAttendance = status => mutateApi(async () => { for (const item of data.attendance) await saveAttendance(item, status) })
  const toggleActionItemDone = () => setNotice('Action completion has no matching API; minutes can be edited and saved.')

  const formatDateBadge = (dateStr) => {
    if (!dateStr) return { month: 'OCT', day: '15' }
    const d = new Date(dateStr)
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    const day = d.getDate().toString().padStart(2, '0')
    return { month, day }
  }

  const formatTimeRange = (startStr, endStr) => {
    if (!startStr) return 'TBA'
    const s = new Date(startStr)
    const sTime = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (!endStr) return sTime
    const e = new Date(endStr)
    const eTime = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${sTime} - ${eTime}`
  }

  const handleSwitchTab = (tab) => {
    setActiveTab(tab)
    setSearchQuery('')
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(
    (statusFilter && statusFilter !== 'ALL') ||
    (categoryFilter && categoryFilter !== 'ALL')
  )

  const handleClearFilters = () => {
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setSearchQuery('')
    setCurrentPage(1)
  }

  return (
    <DashboardLayout><ScopedModuleNotice state={apiState} data={data} resource={activeTab === 'calendar' ? 'meetings' : activeTab} onRetry={reloadApi} />
      <div className="mew-workspace">
        {/* Page Header (Stats in right top corner compactSummary) */}
        <PageHeader
          title="Meetings & Campus Events"
          subtitle="Plan institutional meetings, manage campus events, and coordinate participant registrations."
          breadcrumb={[
            { label: 'Digital Campus', link: '/meetings-events' },
            'Meetings & Events'
          ]}
          compactSummary={[
            { label: 'Scheduled Gatherings', value: totalScheduled },
            { label: 'Upcoming This Month', value: upcomingCount },
            { label: 'Total Registrations', value: totalRegistrations },
          ]}
        />

        {notice && (
          <div className="campus-notice" role="status">
            <FiCheckCircle style={{ color: 'var(--brand)' }} />
            <span>{notice}</span>
          </div>
        )}

        {/* Segmented Sub-navigation Tabs */}
        <div className="mew-top-bar">
          <nav className="mew-nav" aria-label="Workspace views">
            <button
              type="button"
              className={activeTab === 'calendar' ? 'active' : ''}
              onClick={() => handleSwitchTab('calendar')}
            >
              <FiCalendar />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              className={activeTab === 'meetings' ? 'active' : ''}
              onClick={() => handleSwitchTab('meetings')}
            >
              <FiCalendar />
              <span>Meetings</span>
              <span className="mew-badge-count">{data.resourceErrors?.meetings ? '—' : data.meetings.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'events' ? 'active' : ''}
              onClick={() => handleSwitchTab('events')}
            >
              <FiActivity />
              <span>Events</span>
              <span className="mew-badge-count">{data.resourceErrors?.events ? '—' : data.events.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'registrations' ? 'active' : ''}
              onClick={() => handleSwitchTab('registrations')}
            >
              <FiUsers />
              <span>Registrations</span>
              <span className="mew-badge-count">{data.resourceErrors?.registrations ? '—' : data.registrations.length}</span>
            </button>

          </nav>

          <div className="mew-actions">
            {activeTab === 'meetings' && (
              <button
                type="button"
                className="mew-button mew-button--primary mew-action-meeting"
                onClick={() => openCreateModal('meeting')}
              >
                <FiPlus /> Schedule Meeting
              </button>
            )}

            {activeTab === 'events' && (
              <button
                type="button"
                className="mew-button mew-button--primary mew-action-event"
                onClick={() => openCreateModal('event')}
              >
                <FiPlus /> Create Event
              </button>
            )}

            {activeTab === 'registrations' && (
              <button
                type="button"
                className="mew-button mew-button--primary"
                onClick={() => openCreateModal('registration')}
              >
                <FiPlus /> Register Participant
              </button>
            )}

            {activeTab === 'minutes' && (
              <button
                type="button"
                className="mew-button mew-button--primary"
                onClick={() => openCreateModal('minute')}
              >
                <FiPlus /> Add Action Item
              </button>
            )}

            {activeTab === 'attendance' && (
              <>
                <button
                  type="button"
                  className="mew-button mew-button--secondary"
                  onClick={() => markAllAttendance('Present')}
                  title="Mark all participants as Present"
                >
                  ✓ Mark All Present
                </button>
                <button
                  type="button"
                  className="mew-button mew-button--secondary"
                  onClick={() => markAllAttendance('Absent')}
                  title="Mark all participants as Absent"
                >
                  ✗ Mark All Absent
                </button>
              </>
            )}

            {/* Standard ERP ExportMenu component with CSV and Print / PDF options */}
            <ExportMenu
              rows={currentExportRows}
              columns={currentExportColumns}
              filename={`meetings_events_${activeTab}`}
              title={`Meetings & Events - ${activeTab.toUpperCase()}`}
              directDownload
            />
          </div>
        </div>

        {/* Standard ERP Collapsible Filter Panel with 'Filters' button */}
        {activeTab !== 'calendar' && <FilterPanel
          active={hasActiveFilters}
          onClear={handleClearFilters}
          className="mew-filter-panel"
          actions={
            <div className="mew-toolbar-right">
              {(activeTab === 'meetings' || activeTab === 'events') && (
                <div className="mew-view-switch">
                  <button
                    type="button"
                    className={`mew-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Card Grid View"
                    aria-label="Card Grid View"
                  >
                    <FiGrid />
                  </button>
                  <button
                    type="button"
                    className={`mew-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table View"
                    aria-label="Table View"
                  >
                    <FiList />
                  </button>
                </div>
              )}

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Rows:
                <ProjectSelect
                  className="mew-filter-select"
                  style={{ minWidth: '60px', height: '34px', padding: '0 6px' }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </ProjectSelect>
              </label>

              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {filteredList.length > 0
                  ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredList.length)} of ${filteredList.length} shown`
                  : '0 records'}
              </span>
            </div>
          }
        >
          <div className="course-toolbar">
            <label className="course-search">
              <FiSearch />
              <input
                type="search"
                placeholder={
                  activeTab === 'meetings' ? 'Search by meeting title, venue or organizer...' :
                  activeTab === 'events' ? 'Search by event title, hall or topic...' :
                  activeTab === 'registrations' ? 'Search student name, roll no, or branch...' :
                  activeTab === 'attendance' ? 'Search participant or activity...' :
                  'Search meeting title or action item...'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Search"
              />
            </label>

            {/* Status Filter */}
            <ProjectSelect
              className="mew-filter-select"
              aria-label="Filter by Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="ALL">All Statuses</option>
              {activeTab === 'meetings' && (
                <>
                  <option value="Upcoming">Upcoming</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </>
              )}
              {activeTab === 'events' && (
                <>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                </>
              )}
              {activeTab === 'registrations' && (
                <>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Waitlisted">Waitlisted</option>
                </>
              )}
              {activeTab === 'attendance' && (
                <>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </>
              )}
              {activeTab === 'minutes' && (
                <>
                  <option value="PENDING">Pending Actions</option>
                  <option value="COMPLETED">Resolved Actions</option>
                </>
              )}
            </ProjectSelect>

            {/* Category Filter for Meetings & Events */}
            {(activeTab === 'meetings' || activeTab === 'events') && (
              <ProjectSelect
                className="mew-filter-select"
                aria-label="Filter by Category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Categories</option>
                {activeTab === 'meetings' && (
                  <>
                    <option value="Academic Council">Academic Council</option>
                    <option value="Department">Department</option>
                    <option value="Committee">Committee</option>
                    <option value="Industry Relations">Industry Relations</option>
                    <option value="IQAC">IQAC</option>
                  </>
                )}
                {activeTab === 'events' && (
                  <>
                    <option value="Technical">Technical</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Career">Career</option>
                    <option value="Networking">Networking</option>
                    <option value="Sports">Sports</option>
                    <option value="Special Occasion">Special Occasion</option>
                  </>
                )}
              </ProjectSelect>
            )}
          </div>
        </FilterPanel>}

        {activeTab === 'calendar' && (
          <MeetingsEventsCalendar
            meetings={data.meetings}
            events={data.events}
            onCreateMeeting={() => openCreateModal('meeting')}
            onCreateEvent={() => openCreateModal('event')}
            onEditMeeting={meeting => openEditModal(meeting, 'meeting')}
            onEditEvent={event => openEditModal(event, 'event')}
          />
        )}

        {/* Tab 1: Meetings View */}
        {activeTab === 'meetings' && (
          viewMode === 'grid' ? (
            <>
              <div className="mew-card-grid">
                {paginatedList.map(meet => {
                  const dateBadge = formatDateBadge(meet.start)
                  return (
                    <div key={meet.id} className="mew-card">
                      <div className="mew-card-header">
                        <div className="mew-card-date-badge">
                          <span className="mew-card-date-month">{dateBadge.month}</span>
                          <span className="mew-card-date-day">{dateBadge.day}</span>
                        </div>
                        <div className="mew-card-title-group">
                          <span className="mew-card-category">{meet.category}</span>
                          <h4 className="mew-card-title">{meet.title}</h4>
                        </div>
                        <span className={`mew-status-chip mew-status--${meet.status.toLowerCase().replace(' ', '')}`}>
                          {meet.status}
                        </span>
                      </div>

                      <p className="mew-card-description">{meet.agenda || 'No agenda outlined.'}</p>

                      <div className="mew-card-details">
                        <div className="mew-card-detail-item">
                          <FiClock />
                          <span>{formatTimeRange(meet.start, meet.end)}</span>
                        </div>
                        <div className="mew-card-detail-item">
                          <FiMapPin />
                          <span>{meet.venue}</span>
                        </div>
                        <div className="mew-card-detail-item">
                          <FiUser />
                          <span>{meet.organizer}</span>
                        </div>
                        <div className="mew-card-detail-item">
                          <FiUsers />
                          <span>Audience: <strong>{meet.audience}</strong></span>
                        </div>
                      </div>

                      <div className="mew-card-footer">
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {meet.id}</span>
                        <div className="mew-card-actions">
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--edit action-edit"
                            onClick={() => openEditModal(meet, 'meeting')}
                            title="Edit Meeting Details"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--danger action-delete"
                            onClick={() => requestDelete(meet.id, 'meeting', meet.title)}
                            title="Remove Meeting"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {!filteredList.length && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <FiCalendar style={{ fontSize: '32px', marginBottom: '8px' }} />
                    <p>No meetings matching current filters.</p>
                  </div>
                )}
              </div>
              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <div className="mew-table-wrapper">
              <div className="mew-table-scroll">
                <table className="mew-table">
                  <thead>
                    <tr>
                      <th>Title & Category</th>
                      <th>Schedule & Time</th>
                      <th>Venue</th>
                      <th>Organizer</th>
                      <th>Audience</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(meet => (
                      <tr key={meet.id}>
                        <td>
                          <strong>{meet.title}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{meet.category}</div>
                        </td>
                        <td>
                          <div>{new Date(meet.start).toLocaleDateString()}</div>
                          <small style={{ color: 'var(--text-secondary)' }}>{formatTimeRange(meet.start, meet.end)}</small>
                        </td>
                        <td>{meet.venue}</td>
                        <td>{meet.organizer}</td>
                        <td><span className="campus-badge">{meet.audience}</span></td>
                        <td>
                          <span className={`mew-status-chip mew-status--${meet.status.toLowerCase().replace(' ', '')}`}>
                            {meet.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="mew-table-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="mew-btn-icon mew-btn-icon--edit action-edit"
                              onClick={() => openEditModal(meet, 'meeting')}
                              title="Edit Meeting"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="mew-btn-icon mew-btn-icon--danger action-delete"
                              onClick={() => requestDelete(meet.id, 'meeting', meet.title)}
                              title="Remove Meeting"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredList.length && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                          No meetings matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          )
        )}

        {/* Tab 2: Events View */}
        {activeTab === 'events' && (
          viewMode === 'grid' ? (
            <>
              <div className="mew-card-grid">
                {paginatedList.map(ev => {
                  const dateBadge = formatDateBadge(ev.start)
                  const percent = Math.min(100, Math.round(((ev.registeredCount || 0) / (ev.capacity || 1)) * 100))
                  return (
                    <div key={ev.id} className="mew-card">
                      <div className="mew-card-header">
                        <div className="mew-card-date-badge">
                          <span className="mew-card-date-month">{dateBadge.month}</span>
                          <span className="mew-card-date-day">{dateBadge.day}</span>
                        </div>
                        <div className="mew-card-title-group">
                          <span className="mew-card-category">{ev.category}</span>
                          <h4 className="mew-card-title">{ev.title}</h4>
                        </div>
                        <span className={`mew-status-chip mew-status--${ev.status.toLowerCase()}`}>
                          {ev.status}
                        </span>
                      </div>

                      <p className="mew-card-description">{ev.description}</p>

                      <div className="mew-card-details">
                        <div className="mew-card-detail-item">
                          <FiClock />
                          <span>{new Date(ev.start).toLocaleDateString()} ({formatTimeRange(ev.start, ev.end)})</span>
                        </div>
                        <div className="mew-card-detail-item">
                          <FiMapPin />
                          <span>{ev.venue}</span>
                        </div>
                        <div className="mew-card-detail-item">
                          <FiUser />
                          <span>{ev.organizer}</span>
                        </div>
                      </div>

                      <div className="mew-capacity-bar">
                        <div className="mew-capacity-labels">
                          <span>Registrations: <strong>{ev.registeredCount} / {ev.capacity}</strong></span>
                          <span>{percent}% full</span>
                        </div>
                        <div className="mew-capacity-track">
                          <div
                            className="mew-capacity-fill"
                            style={{
                              width: `${percent}%`,
                              background: percent >= 95 ? '#ef4444' : percent >= 80 ? '#f59e0b' : 'var(--brand)',
                            }}
                          />
                        </div>
                      </div>

                      <div className="mew-card-footer">
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Deadline: {new Date(ev.deadline).toLocaleDateString()}
                        </span>
                        <div className="mew-card-actions">
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--edit action-edit"
                            onClick={() => openEditModal(ev, 'event')}
                            title="Edit Event"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--danger action-delete"
                            onClick={() => requestDelete(ev.id, 'event', ev.title)}
                            title="Remove Event"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {!filteredList.length && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <FiActivity style={{ fontSize: '32px', marginBottom: '8px' }} />
                    <p>No events found for selected criteria.</p>
                  </div>
                )}
              </div>
              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <div className="mew-table-wrapper">
              <div className="mew-table-scroll">
                <table className="mew-table">
                  <thead>
                    <tr>
                      <th>Event Title</th>
                      <th>Dates & Time</th>
                      <th>Venue</th>
                      <th>Organizer</th>
                      <th>Capacity / Roster</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(ev => (
                      <tr key={ev.id}>
                        <td>
                          <strong>{ev.title}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.category}</div>
                        </td>
                        <td>
                          <div>{new Date(ev.start).toLocaleDateString()}</div>
                          <small style={{ color: 'var(--text-secondary)' }}>{formatTimeRange(ev.start, ev.end)}</small>
                        </td>
                        <td>{ev.venue}</td>
                        <td>{ev.organizer}</td>
                        <td>
                          <strong>{ev.registeredCount}</strong> / {ev.capacity} seats
                        </td>
                        <td>
                          <span className={`mew-status-chip mew-status--${ev.status.toLowerCase()}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="mew-table-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="mew-btn-icon mew-btn-icon--edit action-edit"
                              onClick={() => openEditModal(ev, 'event')}
                              title="Edit Event"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="mew-btn-icon mew-btn-icon--danger action-delete"
                              onClick={() => requestDelete(ev.id, 'event', ev.title)}
                              title="Remove Event"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredList.length && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                          No events found for selected criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          )
        )}

        {/* Tab 3: Registrations Table */}
        {activeTab === 'registrations' && (
          <div className="mew-table-wrapper">
            <div className="mew-table-scroll">
              <table className="mew-table">
                <thead>
                  <tr>
                    <th>Participant Name</th>
                    <th>Roll / Reg No.</th>
                    <th>Department & Year</th>
                    <th>Registered Event</th>
                    <th>Ticket / Pass Code</th>
                    <th>Registration Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(reg => (
                    <tr key={reg.id}>
                      <td><strong>{reg.studentName}</strong></td>
                      <td><code>{reg.rollNumber}</code></td>
                      <td>{reg.department} <small style={{ color: 'var(--text-muted)' }}>({reg.year})</small></td>
                      <td>{reg.eventTitle}</td>
                      <td><span className="campus-badge">{reg.ticketCode}</span></td>
                      <td>{reg.registeredAt}</td>
                      <td>
                        <span className={`mew-status-chip mew-status--${reg.status.toLowerCase()}`}>
                          {reg.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="mew-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--edit action-edit"
                            onClick={() => openEditModal(reg, 'registration')}
                            title="Edit Registration"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--danger action-delete"
                            onClick={() => requestDelete(reg.id, 'registration', `${reg.studentName} (${reg.eventTitle})`)}
                            title="Remove Registration"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No registrations matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}

        {/* Tab 4: Attendance & Live Check-in Table */}
        {activeTab === 'attendance' && (
          <div className="mew-table-wrapper">
            <div className="mew-table-scroll">
              <table className="mew-table">
                <thead>
                  <tr>
                    <th>Participant Name</th>
                    <th>Designation / Role</th>
                    <th>Department</th>
                    <th>Meeting / Event Activity</th>
                    <th>Check-in Mode</th>
                    <th>Check-in Timestamp</th>
                    <th>Live Attendance</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(att => (
                    <tr key={att.id}>
                      <td><strong>{att.participantName}</strong></td>
                      <td>{att.participantRole}</td>
                      <td>{att.department}</td>
                      <td>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>[{att.activityType}]</span> {att.activityTitle}
                      </td>
                      <td><span className="campus-badge">{att.mode}</span></td>
                      <td>{att.checkInTime}</td>
                      <td>
                        <div className="mew-attendance-radio-group" role="radiogroup" aria-label={`Attendance for ${att.participantName}`}>
                          {['Present', 'Absent', 'Late'].map((option) => (
                            <label
                              key={option}
                              className={`mew-radio-chip mew-radio-chip--${option.toLowerCase()} ${att.status === option ? 'is-selected' : ''}`}
                              title={`Mark as ${option}`}
                            >
                              <input
                                type="radio"
                                name={`attendance-status-${att.id}`}
                                value={option}
                                checked={att.status === option}
                                onChange={() => handleSetAttendanceStatus(att.id, option)}
                              />
                              <span className="mew-radio-circle" />
                              <span className="mew-radio-text">{option}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="mew-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--danger action-delete"
                            onClick={() => requestDelete(att.id, 'attendance', `${att.participantName} - ${att.activityTitle}`)}
                            title="Remove Record"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No attendance records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}

        {/* Tab 5: Minutes of Meetings & Action Items */}
        {activeTab === 'minutes' && (
          <div className="mew-table-wrapper">
            <div className="mew-table-scroll">
              <table className="mew-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>Done</th>
                    <th>Action Item & Description</th>
                    <th>Meeting Title</th>
                    <th>Assigned Owner</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(min => (
                    <tr key={min.id} style={{ opacity: min.completed ? 0.75 : 1 }}>
                      <td>
                        <input
                          type="checkbox"
                          className="mew-action-checkbox"
                          checked={min.completed}
                          onChange={() => toggleActionItemDone(min.id)}
                          title="Mark action item resolved"
                        />
                      </td>
                      <td>
                        <strong className={min.completed ? 'mew-action-text--done' : ''}>
                          {min.actionItem}
                        </strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {min.decisionSummary}
                        </div>
                      </td>
                      <td>
                        <div>{min.meetingTitle}</div>
                        <small style={{ color: 'var(--text-muted)' }}>{min.meetingDate}</small>
                      </td>
                      <td><strong>{min.owner}</strong></td>
                      <td>
                        <span style={{ fontSize: '12px', color: new Date(min.dueDate) < new Date() && !min.completed ? '#dc2626' : 'var(--text-primary)' }}>
                          {min.dueDate}
                        </span>
                      </td>
                      <td>
                        <span className={`mew-priority--${min.priority.toLowerCase()}`}>
                          {min.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`mew-status-chip ${min.completed ? 'mew-status--completed' : 'mew-status--upcoming'}`}>
                          {min.completed ? 'Resolved' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="mew-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--edit action-edit"
                            onClick={() => openEditModal(min, 'minute')}
                            title="Edit Action Item"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="mew-btn-icon mew-btn-icon--danger action-delete"
                            onClick={() => requestDelete(min.id, 'minute', min.actionItem)}
                            title="Remove Action Item"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No action items matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}

        {/* Modal: Schedule Meeting / Create Event / Register Participant / Add Action Item */}
        {modalOpen && (
          <div className="mew-modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="mew-modal" onClick={e => e.stopPropagation()}>
              <div className="mew-modal-header">
                <h3>
                  {editingItem ? 'Edit ' : 'New '}
                  {modalType === 'meeting' ? 'Meeting' : modalType === 'event' ? 'Campus Event' : modalType === 'registration' ? 'Participant Registration' : 'Action Item'}
                </h3>
                <button
                  type="button"
                  className="mew-modal-close"
                  onClick={() => setModalOpen(false)}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSaveModal}>
                <div className="mew-modal-body">
                  {(modalType === 'meeting' || modalType === 'event') && <p role="status" className="campus-notice">Meetings and campus events cannot be saved because the date and time fields have been removed. Contact an administrator to schedule them.</p>}
                  {/* Meeting Form */}
                  {modalType === 'meeting' && (
                    <>
                      <label className="mew-form-field">
                        Meeting Title *
                        <input
                          type="text"
                          required
                          list="mew-meeting-title-options"
                          value={formData.title || ''}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Department Faculty Council Meeting"
                        />
                      </label>
                      <datalist id="mew-meeting-title-options">{[...new Set(data.meetings.map(item => item.title).filter(Boolean))].map(title => <option key={title} value={title} />)}</datalist>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Category
                          <ProjectSelect
                            value={formData.category || 'Academic Council'}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                          >
                            <option value="Academic Council">Academic Council</option>
                            <option value="Department">Department Review</option>
                            <option value="Committee">Discipline / Committee</option>
                            <option value="Industry Relations">Industry Relations</option>
                            <option value="IQAC">IQAC</option>
                          </ProjectSelect>
                        </label>

                        <label className="mew-form-field">
                          Target Audience
                          <ProjectSelect
                            value={formData.audience || 'Faculty'}
                            onChange={e => setFormData({ ...formData, audience: e.target.value })}
                          >
                            <option value="Faculty">Faculty Only</option>
                            <option value="Students">Students Only</option>
                            <option value="Both">Both Faculty & Students</option>
                          </ProjectSelect>
                        </label>
                      </div>

                      <label className="mew-form-field">
                        Responsible Department *
                        <ProjectSelect required value={formData.department || ''} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                          <option value="">Select responsible department</option>
                          {formData.department && !departmentOptions.includes(formData.department) && <option value={formData.department}>{formData.department}</option>}
                          {departmentOptions.map(name => <option key={name} value={name}>{name}</option>)}
                        </ProjectSelect>
                      </label>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Venue / Room *
                          <ProjectSelect required value={formData.venue || ''} onChange={e => setFormData({ ...formData, venue: e.target.value })}>
                            <option value="">Select venue / room</option>
                            {formData.venue && !roomOptions.some(room => room.value === formData.venue) && <option value={formData.venue}>{formData.venue} (current venue)</option>}
                            {roomOptions.map(room => <option key={room.value} value={room.value}>{room.label}</option>)}
                          </ProjectSelect>
                        </label>

                        <label className="mew-form-field">
                          Organizer / Chair *
                          <input
                            type="text"
                            required
                            value={formData.organizer || ''}
                            onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                            placeholder="e.g. Prof. Ananya Sen"
                          />
                        </label>
                      </div>

                      <label className="mew-form-field">
                        Agenda & Discussion Topics
                        <textarea
                          rows="3"
                          value={formData.agenda || ''}
                          onChange={e => setFormData({ ...formData, agenda: e.target.value })}
                          placeholder="Key points, resolutions to discuss, and agenda items..."
                        />
                      </label>
                    </>
                  )}

                  {/* Event Form */}
                  {modalType === 'event' && (
                    <>
                      <label className="mew-form-field">
                        Event Title *
                        <input
                          type="text"
                          required
                          list="mew-event-title-options"
                          value={formData.title || ''}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. TechNovation 2026: 36-Hr Hackathon"
                        />
                      </label>
                      <datalist id="mew-event-title-options">{[...new Set(data.events.map(item => item.title).filter(Boolean))].map(title => <option key={title} value={title} />)}</datalist>

                      <div className="mew-form-row">
                        <label className="mew-form-field">Responsible Department *<ProjectSelect forceCustom menuPlacement="bottom" required value={formData.department || ''} onChange={e => setFormData({ ...formData, department: e.target.value })}><option value="">Select responsible department</option>{formData.department && !departmentOptions.includes(formData.department) && <option value={formData.department}>{formData.department}</option>}{departmentOptions.map(name => <option key={name} value={name}>{name}</option>)}</ProjectSelect></label>
                        <label className="mew-form-field">Organizer<input value={formData.organizer || ''} onChange={e => setFormData({ ...formData, organizer: e.target.value })} placeholder="Organizer or coordinating unit" /></label>
                      </div>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Category
                          <ProjectSelect
                            forceCustom
                            menuPlacement="bottom"
                            value={formData.category || 'Technical'}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                          >
                            <option value="Technical">Technical</option>
                            <option value="Workshop">Workshop</option>
                            <option value="Career">Career / Placement</option>
                            <option value="Networking">Networking / Alumni</option>
                            <option value="Sports">Sports</option>
                            <option value="Special Occasion">Special Occasion</option>
                          </ProjectSelect>
                        </label>

                        <label className="mew-form-field">
                          Max Capacity (Seats) *
                          <input
                            type="number"
                            min="1"
                            required
                            value={formData.capacity || 100}
                            onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Venue *
                          <ProjectSelect forceCustom menuPlacement="bottom" required value={formData.venue || ''} onChange={e => setFormData({ ...formData, venue: e.target.value })}>
                            <option value="">Select venue / room</option>
                            {formData.venue && !roomOptions.some(room => room.value === formData.venue) && <option value={formData.venue}>{formData.venue} (current venue)</option>}
                            {roomOptions.map(room => <option key={room.value} value={room.value}>{room.label}</option>)}
                          </ProjectSelect>
                        </label>

                        <label className="mew-form-field">
                          Registration Deadline *
                          <input
                            type="datetime-local"
                            required
                            value={formData.deadline || ''}
                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                          />
                        </label>
                      </div>

                      <label className="mew-form-field">
                        Event Description & Overview
                        <textarea
                          rows="3"
                          value={formData.description || ''}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Overview, guest speakers, guidelines, eligibility..."
                        />
                      </label>
                    </>
                  )}

                  {/* Registration Form */}
                  {modalType === 'registration' && (
                    <><label className="mew-form-field">Student ID *<input type="number" min="1" required value={formData.studentId || ''} onChange={e => setFormData({...formData,studentId:e.target.value})} /></label>
                      <label className="mew-form-field">
                        Select Campus Event *
                        <ProjectSelect
                          required
                          value={formData.eventId || ''}
                          onChange={e => setFormData({ ...formData, eventId: e.target.value })}
                        >
                          {data.events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                          ))}
                        </ProjectSelect>
                      </label>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Student Name *
                          <input
                            type="text"
                            required
                            value={formData.studentName || ''}
                            onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                            placeholder="Full Name"
                          />
                        </label>

                        <label className="mew-form-field">
                          Roll / Registration Number *
                          <input
                            type="text"
                            required
                            value={formData.rollNumber || ''}
                            onChange={e => setFormData({ ...formData, rollNumber: e.target.value })}
                            placeholder="e.g. 22CS054"
                          />
                        </label>
                      </div>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Department *
                          <ProjectSelect
                            value={formData.department || 'Computer Science and Engineering'}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                          >
                            <option value="Computer Science and Engineering">CSE</option>
                            <option value="Electronics and Communication Engineering">ECE</option>
                            <option value="Electrical and Electronics Engineering">EEE</option>
                            <option value="Mechanical Engineering">MECH</option>
                            <option value="Civil Engineering">CIVIL</option>
                            <option value="Information Technology">IT</option>
                          </ProjectSelect>
                        </label>

                        <label className="mew-form-field">
                          Year of Study
                          <ProjectSelect
                            value={formData.year || '3rd Year'}
                            onChange={e => setFormData({ ...formData, year: e.target.value })}
                          >
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </ProjectSelect>
                        </label>
                      </div>
                    </>
                  )}

                  {/* Minutes Form */}
                  {modalType === 'minute' && (
                    <><label className="mew-form-field">Meeting *<ProjectSelect required value={formData.meetingId || ''} onChange={e => setFormData({...formData,meetingId:e.target.value,meetingTitle:data.meetings.find(m => m.id===e.target.value)?.title || ''})}><option value="">Select meeting</option>{data.meetings.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</ProjectSelect></label>
                      <label className="mew-form-field">
                        Related Meeting *
                        <input
                          type="text"
                          required
                          value={formData.meetingTitle || ''}
                          onChange={e => setFormData({ ...formData, meetingTitle: e.target.value })}
                          placeholder="e.g. Academic Council Quarterly Review"
                        />
                      </label>

                      <label className="mew-form-field">
                        Action Item *
                        <input
                          type="text"
                          required
                          value={formData.actionItem || ''}
                          onChange={e => setFormData({ ...formData, actionItem: e.target.value })}
                          placeholder="Clear task description"
                        />
                      </label>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Assigned Owner *
                          <input
                            type="text"
                            required
                            value={formData.owner || ''}
                            onChange={e => setFormData({ ...formData, owner: e.target.value })}
                            placeholder="Person / Role in charge"
                          />
                        </label>

                        <label className="mew-form-field">
                          Due Date *
                          <input
                            type="date"
                            required
                            value={formData.dueDate || ''}
                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Priority
                          <ProjectSelect
                            value={formData.priority || 'High'}
                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </ProjectSelect>
                        </label>

                        <label className="mew-form-field">
                          Meeting Date
                          <input
                            type="date"
                            value={formData.meetingDate || ''}
                            onChange={e => setFormData({ ...formData, meetingDate: e.target.value })}
                          />
                        </label>
                      </div>

                      <label className="mew-form-field">
                        Decision Summary / Context
                        <textarea
                          rows="2"
                          value={formData.decisionSummary || ''}
                          onChange={e => setFormData({ ...formData, decisionSummary: e.target.value })}
                          placeholder="Background details and minutes resolution..."
                        />
                      </label>
                    </>
                  )}
                </div>

                <div className="mew-modal-footer">
                  {modalError && <p className="mew-form-error" role="alert">{modalError}</p>}
                  <button
                    type="button"
                    className="mew-button"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="mew-button mew-button--primary"
                    disabled={modalType === 'meeting' || modalType === 'event'}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Advanced Custom Delete Confirmation Popup Modal */}
        {deleteTarget && (
          <div className="mew-modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div
              className="mew-delete-modal"
              onClick={e => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-desc"
            >
              <div className="mew-delete-icon">
                <FiTrash2 />
              </div>
              <h3 id="delete-dialog-title" className="mew-delete-title">Delete Record?</h3>
              <p id="delete-dialog-desc" className="mew-delete-desc">
                Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>? This action cannot be undone.
              </p>
              <div className="mew-delete-actions">
                <button
                  type="button"
                  className="mew-button"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="mew-button mew-btn-delete-confirm"
                  onClick={confirmDelete}
                  autoFocus
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Related MeetingsEventsCalendar component and its private helpers.
const MeetingsEventsCalendar = (() => {
const { ProjectSelect } = mergedMeetingsEventsCalendarImport0;
const { useMemo, useState } = mergedMeetingsEventsCalendarImport1;
const { FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiPlus, FiUsers } = mergedMeetingsEventsCalendarImport2;
const FilterPanel = mergedMeetingsEventsCalendarImport3.default;

const asDate = value => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const dayKey = value => {
  const date = value instanceof Date ? value : asDate(value)
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
}
const localDateInput = date => dayKey(date)
const sameDay = (left, right) => dayKey(left) === dayKey(right)
const formatTime = value => asDate(value)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Time TBA'
const formatDate = value => asDate(value)?.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) || 'Date TBA'

function MeetingsEventsCalendar({ meetings, events, onCreateMeeting, onCreateEvent, onEditMeeting, onEditEvent }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [view, setView] = useState('month')
  const [kind, setKind] = useState('all')
  const [department, setDepartment] = useState('all')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [details, setDetails] = useState(null)
  const today = new Date()
  const items = useMemo(() => [
    ...meetings.map(item => ({ ...item, kind: 'meeting', startAt: item.start, endAt: item.end })),
    ...events.map(item => ({ ...item, kind: 'event', startAt: item.start, endAt: item.end })),
  ].filter(item => kind === 'all' || item.kind === kind)
    .filter(item => department === 'all' || item.department === department)
    .filter(item => category === 'all' || item.category === category)
    .filter(item => status === 'all' || item.status === status)
    .filter(item => asDate(item.startAt))
    .sort((a, b) => asDate(a.startAt) - asDate(b.startAt)), [meetings, events, kind, department, category, status])
  const departments = [...new Set(items.map(item => item.department).filter(Boolean))].sort()
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort()
  const statuses = [...new Set(items.map(item => item.status).filter(Boolean))].sort()
  const selectedItems = items.filter(item => {
    const start = asDate(item.startAt)
    const end = asDate(item.endAt) || start
    const selected = dayKey(selectedDate)
    return dayKey(start) <= selected && dayKey(end) >= selected
  })
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay())
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + index)
    return date
  })
  const shift = amount => setSelectedDate(current => {
    const next = new Date(current)
    if (view === 'month') next.setMonth(next.getMonth() + amount)
    else if (view === 'week') next.setDate(next.getDate() + amount * 7)
    else next.setDate(next.getDate() + amount)
    return next
  })
  const chooseToday = () => setSelectedDate(new Date())
  const setDate = value => { const next = asDate(`${value}T12:00:00`); if (next) setSelectedDate(next) }
  const periodHeading = view === 'month'
    ? selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${formatDate(monthDays.find(date => dayKey(date) === dayKey(selectedDate)) || selectedDate)} · Week`
      : formatDate(selectedDate)
  const daysToShow = view === 'week' ? Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selectedDate)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - date.getDay() + index)
    return date
  }) : [selectedDate]
  const openItem = item => setDetails(item)
  const activeFilters = kind !== 'all' || department !== 'all' || category !== 'all' || status !== 'all' || dayKey(selectedDate) !== dayKey(today)
  const clearFilters = () => { setKind('all'); setDepartment('all'); setCategory('all'); setStatus('all'); setSelectedDate(new Date()) }

  return <section className="mew-calendar" aria-label="Meetings and events calendar">
    <div className="mew-calendar__toolbar">
      <div className="mew-calendar__period">
        <button type="button" aria-label="Previous period" onClick={() => shift(-1)}><FiChevronLeft /></button>
        <button type="button" aria-label="Next period" onClick={() => shift(1)}><FiChevronRight /></button>
        <button type="button" className="mew-calendar__today" onClick={chooseToday}>Today</button>
        <h2>{periodHeading}</h2>
      </div>
    </div>
    <FilterPanel className="mew-calendar__filters" toggleClassName="mew-calendar__filter-toggle" active={activeFilters} onClear={clearFilters}>
      <div className="mew-calendar__filter-label">Calendar filters</div>
      <label className="mew-calendar__date">Jump to date <input type="date" value={localDateInput(selectedDate)} onChange={event => setDate(event.target.value)} /></label>
      <label className="mew-calendar__date">Type <ProjectSelect value={kind} onChange={event => setKind(event.target.value)}><option value="all">Meetings & events</option><option value="meeting">Meetings</option><option value="event">Events</option></ProjectSelect></label>
      <label className="mew-calendar__date">Department <ProjectSelect value={department} onChange={event => setDepartment(event.target.value)}><option value="all">All departments</option>{departments.map(name => <option key={name}>{name}</option>)}</ProjectSelect></label>
      <label className="mew-calendar__date">Category <ProjectSelect value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(name => <option key={name}>{name}</option>)}</ProjectSelect></label>
      <label className="mew-calendar__date">Status <ProjectSelect value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map(name => <option key={name}>{name}</option>)}</ProjectSelect></label>
    </FilterPanel>
    <div className="mew-calendar__quick-actions"><span><i className="mew-calendar__legend-dot meeting" /> Meeting <i className="mew-calendar__legend-dot event" /> Event</span><div className="mew-calendar__views" role="group" aria-label="Calendar view">{['month', 'week', 'day', 'agenda'].map(option => <button key={option} type="button" className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option[0].toUpperCase() + option.slice(1)}</button>)}</div><div className="mew-calendar__quick-actions-right"><div className="mew-calendar__create-actions"><button type="button" className="mew-action-meeting" onClick={onCreateMeeting}><FiPlus /> Create meeting</button><button type="button" className="mew-action-event" onClick={onCreateEvent}><FiPlus /> Create event</button></div></div></div>
    <div className="mew-calendar__layout">
      <div className="mew-calendar__main">
        {view === 'month' && <div className="mew-calendar__month-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="mew-calendar__weekday">{day}</div>)}
          {monthDays.map(date => {
            const dayItems = items.filter(item => {
              const start = asDate(item.startAt); const end = asDate(item.endAt) || start
              return dayKey(start) <= dayKey(date) && dayKey(end) >= dayKey(date)
            })
            return <button type="button" key={dayKey(date)} className={`mew-calendar__day${date.getMonth() === selectedDate.getMonth() ? '' : ' outside'}${sameDay(date, selectedDate) ? ' selected' : ''}${sameDay(date, today) ? ' today' : ''}`} onClick={() => setSelectedDate(date)}>
              <span className="mew-calendar__day-number">{date.getDate()}</span>
              <span className="mew-calendar__day-items">{dayItems.slice(0, 3).map(item => <span key={`${item.kind}-${item.id}`} className={`mew-calendar__event ${item.kind}`}><b>{formatTime(item.startAt)}</b> {item.title}</span>)}{dayItems.length > 3 && <small>+{dayItems.length - 3} more</small>}</span>
            </button>
          })}
        </div>}
        {(view === 'week' || view === 'day') && <div className={`mew-calendar__time-grid ${view}`}>
          {daysToShow.map(date => <div key={dayKey(date)} className="mew-calendar__time-day"><button type="button" className={sameDay(date, selectedDate) ? 'selected' : ''} onClick={() => setSelectedDate(date)}>{date.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}</button>
            {Array.from({ length: 14 }, (_, index) => index + 7).map(hour => <div className="mew-calendar__hour" key={hour}><span>{String(hour).padStart(2, '0')}:00</span><div>{items.filter(item => sameDay(item.startAt, date) && asDate(item.startAt).getHours() === hour).map(item => <button type="button" key={`${item.kind}-${item.id}`} className={`mew-calendar__timed-event ${item.kind}`} onClick={() => openItem(item)}><strong>{item.title}</strong><span>{formatTime(item.startAt)}–{formatTime(item.endAt)} · {item.venue}</span></button>)}</div></div>)}
          </div>)}
        </div>}
        {view === 'agenda' && <div className="mew-calendar__agenda">{items.filter(item => dayKey(item.startAt) >= dayKey(selectedDate)).map(item => <CalendarItem key={`${item.kind}-${item.id}`} item={item} onClick={() => openItem(item)} />)}{!items.some(item => dayKey(item.startAt) >= dayKey(selectedDate)) && <p className="mew-calendar__empty">No upcoming activities match these filters.</p>}</div>}
      </div>
      <aside className="mew-calendar__daily"><header><div><small>DAILY SCHEDULE</small><h3>{selectedDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</h3></div><FiCalendar /></header><div className="mew-calendar__daily-list">{selectedItems.length ? selectedItems.map(item => <CalendarItem key={`${item.kind}-${item.id}`} item={item} onClick={() => openItem(item)} />) : <p className="mew-calendar__empty">No meetings or events scheduled for this day.</p>}</div><footer><strong>{selectedItems.length}</strong> activities</footer></aside>
    </div>
    {details && <div className="mew-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDetails(null) }}><section className="mew-modal mew-calendar__details" role="dialog" aria-modal="true" aria-labelledby="mew-calendar-details-title"><header className="mew-modal-header"><div><span className="mew-calendar__kind">{details.kind} · {details.category || 'General'}</span><h2 id="mew-calendar-details-title">{details.title}</h2></div><button type="button" className="mew-modal-close" aria-label="Close details" onClick={() => setDetails(null)}>×</button></header><div className="mew-modal-body"><p>{details.description || details.agenda || 'No description has been added.'}</p><dl><div><dt>Date</dt><dd>{formatDate(details.startAt)}</dd></div><div><dt>Time</dt><dd>{formatTime(details.startAt)}–{formatTime(details.endAt)}</dd></div><div><dt>Venue</dt><dd>{details.venue || 'Not set'}</dd></div><div><dt>Department</dt><dd>{details.department || 'Not set'}</dd></div><div><dt>Organizer</dt><dd>{details.organizer || 'Not set'}</dd></div><div><dt>Status</dt><dd>{details.status || 'Scheduled'}</dd></div></dl></div><footer className="mew-modal-footer"><button type="button" className="grm-button" onClick={() => setDetails(null)}>Close</button><button type="button" className="grm-button grm-button--primary" onClick={() => { const item = details; setDetails(null); if (item.kind === 'meeting') onEditMeeting(item); else onEditEvent(item) }}>Edit activity</button></footer></section></div>}
  </section>
}

function CalendarItem({ item, onClick }) {
  return <article className={`mew-calendar__agenda-item ${item.kind}`}><div className="mew-calendar__agenda-date"><strong>{formatTime(item.startAt)}</strong><span>{formatDate(item.startAt)}</span></div><div className="mew-calendar__agenda-content"><span className="mew-calendar__kind">{item.kind}</span><h4>{item.title}</h4><p><FiClock /> {formatTime(item.startAt)}–{formatTime(item.endAt)} <FiMapPin /> {item.venue || 'Venue not set'}</p><small><FiUsers /> {item.department || item.organizer || 'Organizer not set'} · {item.status}</small></div><button type="button" onClick={onClick}>View details</button></article>
}

return MeetingsEventsCalendar;
})();

// Related sampleMeetingsEvents data.
const defaultMeetings = [
  {
    id: 'meet-001',
    title: 'Academic Council Quarterly Review (Q1)',
    category: 'Academic Council',
    start: '2026-10-15T10:00',
    end: '2026-10-15T12:30',
    venue: 'Executive Boardroom, Admin Block',
    organizer: 'Dr. K. V. Raman (Dean Academics)',
    audience: 'Faculty',
    agenda: 'Review of R22 regulation electives, NEP 2020 credit allocation, and finalization of odd semester exam schedule.',
    status: 'Upcoming',
  },
  {
    id: 'meet-002',
    title: 'CSE Department Faculty & Curriculum Review',
    category: 'Department',
    start: '2026-10-12T14:30',
    end: '2026-10-12T16:00',
    venue: 'Seminar Hall 1, CSE Block',
    organizer: 'Prof. Ananya Sen (HOD CSE)',
    agenda: 'AI/ML lab equipment procurement, final year capstone project guidelines, and NBA accreditation mock audit.',
    audience: 'Faculty',
    status: 'Upcoming',
  },
  {
    id: 'meet-003',
    title: 'Anti-Ragging & Campus Discipline Committee',
    category: 'Committee',
    start: '2026-10-09T11:00',
    end: '2026-10-09T12:00',
    venue: 'Conference Room 2',
    organizer: 'Prof. R. M. Reddy (Chief Proctor)',
    agenda: 'Hostel inspection report review, student squad duties assignment, and orientation helpline readiness.',
    audience: 'Both',
    status: 'In Progress',
  },
  {
    id: 'meet-004',
    title: 'Industry Advisory Board (IAB) Annual Meet',
    category: 'Industry Relations',
    start: '2026-10-22T10:30',
    end: '2026-10-22T13:30',
    venue: 'Auditorium Hall B & Hybrid Webex',
    organizer: 'Dr. S. K. Murthy (Director, Placements & IIPC)',
    agenda: 'Curriculum industry-alignment, mandatory 8th semester internships, and corporate guest lecture calendar.',
    audience: 'Faculty',
    status: 'Upcoming',
  },
  {
    id: 'meet-005',
    title: 'IQAC Internal Quality Audit Preparation',
    category: 'IQAC',
    start: '2026-10-04T15:00',
    end: '2026-10-04T17:00',
    venue: 'IQAC Meeting Room, 2nd Floor',
    organizer: 'Dr. P. Swaminathan (IQAC Coordinator)',
    agenda: 'Department files verification, student feedback score consolidation, and NAAC metric tracking.',
    audience: 'Faculty',
    status: 'Completed',
  },
]

const defaultEvents = [
  {
    id: 'evt-001',
    title: 'TechNovation 2026: National 36-Hr Hackathon',
    category: 'Technical',
    start: '2026-10-24T09:00',
    end: '2026-10-25T21:00',
    venue: 'Main Campus Auditorium & Innovation Hub',
    organizer: 'Centre for Innovation & Incubation (CII)',
    capacity: 250,
    registeredCount: 218,
    deadline: '2026-10-20T23:59',
    description: 'Premier inter-college coding marathon solving real-world challenges in AI, CleanTech, Web3, and Smart Mobility with cash prizes of ₹1.5 Lakhs.',
    status: 'Upcoming',
  },
  {
    id: 'evt-002',
    title: 'Hands-on Workshop: Generative AI & Cloud Native Microservices',
    category: 'Workshop',
    start: '2026-10-18T09:30',
    end: '2026-10-18T16:30',
    venue: 'Advanced Computing Lab 3',
    organizer: 'Dept. of CSE & Google Developer Student Club',
    capacity: 120,
    registeredCount: 114,
    deadline: '2026-10-16T18:00',
    description: 'Deep dive into LLM deployment, Docker containerization, Kubernetes orchestration, and vector search with expert engineers from AWS and Google Cloud.',
    status: 'Upcoming',
  },
  {
    id: 'evt-003',
    title: 'Campus Placement Orientation & Mock Technical Drives',
    category: 'Career',
    start: '2026-10-14T10:00',
    end: '2026-10-14T17:00',
    venue: 'Open Air Amphitheatre',
    organizer: 'Training & Placement Cell (T&P)',
    capacity: 500,
    registeredCount: 480,
    deadline: '2026-10-13T12:00',
    description: 'Comprehensive orientation for 3rd and 4th-year B.Tech students on campus recruitment patterns, ATS resumes, and mock HR rounds.',
    status: 'Upcoming',
  },
  {
    id: 'evt-004',
    title: 'Alumni Conclave & Mentorship Summit 2026',
    category: 'Networking',
    start: '2026-10-28T11:00',
    end: '2026-10-28T16:00',
    venue: 'Silver Jubilee Auditorium',
    organizer: 'Alumni Relations Committee',
    capacity: 350,
    registeredCount: 295,
    deadline: '2026-10-25T18:00',
    description: 'Engage with distinguished alumni working across global tech leaders. Interactive panel discussions and 1-on-1 career guidance.',
    status: 'Upcoming',
  },
  {
    id: 'evt-005',
    title: 'AURA 2026 - Inter-Collegiate Annual Sports Meet',
    category: 'Sports',
    start: '2026-10-02T08:00',
    end: '2026-10-04T18:00',
    venue: 'University Sports Complex & Athletics Ground',
    organizer: 'Dept. of Physical Education',
    capacity: 600,
    registeredCount: 590,
    deadline: '2026-09-30T17:00',
    description: 'Annual flagship athletics, cricket, football, basketball, and badminton championships spanning 3 days of competitive spirit.',
    status: 'Completed',
  },
]

const defaultRegistrations = [
  {
    id: 'reg-101',
    eventId: 'evt-001',
    eventTitle: 'TechNovation 2026: National 36-Hr Hackathon',
    studentName: 'Aarav Varma',
    rollNumber: '22CS014',
    department: 'Computer Science and Engineering',
    year: '3rd Year',
    registeredAt: '2026-10-06 14:22',
    status: 'Confirmed',
    ticketCode: 'TNV-2026-014',
  },
  {
    id: 'reg-102',
    eventId: 'evt-001',
    eventTitle: 'TechNovation 2026: National 36-Hr Hackathon',
    studentName: 'Pooja Hegde',
    rollNumber: '22IT045',
    department: 'Information Technology',
    year: '3rd Year',
    registeredAt: '2026-10-06 15:10',
    status: 'Confirmed',
    ticketCode: 'TNV-2026-045',
  },
  {
    id: 'reg-103',
    eventId: 'evt-002',
    eventTitle: 'Hands-on Workshop: Generative AI & Cloud Native Microservices',
    studentName: 'Karthik Rao',
    rollNumber: '23EC089',
    department: 'Electronics and Communication Engineering',
    year: '2nd Year',
    registeredAt: '2026-10-07 09:45',
    status: 'Confirmed',
    ticketCode: 'GAI-2026-089',
  },
  {
    id: 'reg-104',
    eventId: 'evt-002',
    eventTitle: 'Hands-on Workshop: Generative AI & Cloud Native Microservices',
    studentName: 'Sneha Patel',
    rollNumber: '22CS112',
    department: 'Computer Science and Engineering',
    year: '3rd Year',
    registeredAt: '2026-10-07 11:20',
    status: 'Confirmed',
    ticketCode: 'GAI-2026-112',
  },
  {
    id: 'reg-105',
    eventId: 'evt-003',
    eventTitle: 'Campus Placement Orientation & Mock Technical Drives',
    studentName: 'Rohan Deshmukh',
    rollNumber: '21ME032',
    department: 'Mechanical Engineering',
    year: '4th Year',
    registeredAt: '2026-10-08 10:05',
    status: 'Confirmed',
    ticketCode: 'CPO-2026-032',
  },
  {
    id: 'reg-106',
    eventId: 'evt-001',
    eventTitle: 'TechNovation 2026: National 36-Hr Hackathon',
    studentName: 'Divya Nair',
    rollNumber: '22EE021',
    department: 'Electrical and Electronics Engineering',
    year: '3rd Year',
    registeredAt: '2026-10-08 16:30',
    status: 'Waitlisted',
    ticketCode: 'TNV-2026-W02',
  },
]

const defaultAttendance = [
  {
    id: 'att-201',
    activityType: 'Meeting',
    activityTitle: 'CSE Department Faculty & Curriculum Review',
    participantName: 'Dr. Suresh Chandra',
    participantRole: 'Faculty (Associate Prof)',
    department: 'CSE',
    status: 'Present',
    checkInTime: '2026-10-12 14:25',
    mode: 'RFID Tap',
  },
  {
    id: 'att-202',
    activityType: 'Meeting',
    activityTitle: 'Anti-Ragging & Campus Discipline Committee',
    participantName: 'Prof. R. M. Reddy',
    participantRole: 'Faculty (HOD EEE)',
    department: 'EEE',
    status: 'Present',
    checkInTime: '2026-10-09 10:55',
    mode: 'Manual Verification',
  },
  {
    id: 'att-203',
    activityType: 'Meeting',
    activityTitle: 'Anti-Ragging & Campus Discipline Committee',
    participantName: 'Kavya Madhavan',
    participantRole: 'Student Representative',
    department: 'ECE',
    status: 'Present',
    checkInTime: '2026-10-09 11:02',
    mode: 'QR Scan',
  },
  {
    id: 'att-204',
    activityType: 'Event',
    activityTitle: 'AURA 2026 - Inter-Collegiate Annual Sports Meet',
    participantName: 'Aarav Varma',
    participantRole: 'Student Athlete',
    department: 'CSE',
    status: 'Present',
    checkInTime: '2026-10-02 08:15',
    mode: 'Biometric Pass',
  },
  {
    id: 'att-205',
    activityType: 'Event',
    activityTitle: 'AURA 2026 - Inter-Collegiate Annual Sports Meet',
    participantName: 'Naveen Kumar',
    participantRole: 'Student',
    department: 'MECH',
    status: 'Absent',
    checkInTime: '—',
    mode: 'Unreported',
  },
  {
    id: 'att-206',
    activityType: 'Meeting',
    activityTitle: 'IQAC Internal Quality Audit Preparation',
    participantName: 'Dr. Priya V.',
    participantRole: 'Faculty (Assistant Prof)',
    department: 'Civil Engg',
    status: 'Present',
    checkInTime: '2026-10-04 14:58',
    mode: 'RFID Tap',
  },
]

const defaultMinutes = [
  {
    id: 'mom-301',
    meetingTitle: 'Academic Council Quarterly Review (Q1)',
    meetingDate: '2026-10-15',
    decisionSummary: 'Approved 2 credits mandatory industry certification for 6th-semester CSE/IT students. Finalized lab exam dates before semester end.',
    actionItem: 'Draft AICTE compliant curriculum matrix and circulate to all Department HODs.',
    owner: 'Dean Academics Office',
    dueDate: '2026-10-25',
    priority: 'High',
    completed: false,
  },
  {
    id: 'mom-302',
    meetingTitle: 'CSE Department Faculty & Curriculum Review',
    meetingDate: '2026-10-12',
    decisionSummary: 'Recommended purchase of 40 GPU workstations for new Deep Learning lab. Formed student mentoring committees for weak learners.',
    actionItem: 'Submit lab vendor quotation and power backup requirements to Principal Office.',
    owner: 'Prof. Ananya Sen (HOD CSE)',
    dueDate: '2026-10-20',
    priority: 'High',
    completed: true,
  },
  {
    id: 'mom-303',
    meetingTitle: 'Anti-Ragging & Campus Discipline Committee',
    meetingDate: '2026-10-09',
    decisionSummary: 'Zero incidents recorded for fresh batch 2026-27. Hostel security squads to maintain daily evening logbooks.',
    actionItem: 'Install 4 additional CCTV cameras near junior hostel cafeteria entrance.',
    owner: 'Estate Officer & Chief Proctor',
    dueDate: '2026-10-18',
    priority: 'Medium',
    completed: false,
  },
  {
    id: 'mom-304',
    meetingTitle: 'Industry Advisory Board (IAB) Annual Meet',
    meetingDate: '2026-10-22',
    decisionSummary: 'Industry partners agreed to offer 150+ internship slots for winter break. Finalized guest speaker lineup for semester.',
    actionItem: 'Consolidate student skill profiles and share with signed partner companies.',
    owner: 'Training & Placement Officer',
    dueDate: '2026-11-05',
    priority: 'Medium',
    completed: false,
  },
  {
    id: 'mom-305',
    meetingTitle: 'IQAC Internal Quality Audit Preparation',
    meetingDate: '2026-10-04',
    decisionSummary: 'All departments scored over 88% in internal documentation audit. Identified 3 departments requiring course-file updates.',
    actionItem: 'Upload revised faculty course files to CMS digital repository before external NAAC visit.',
    owner: 'All Department NAAC Coordinators',
    dueDate: '2026-10-14',
    priority: 'Low',
    completed: true,
  },
]

return { default: MeetingsEventsWorkspace }
})()

// PlacementWorkspace screen and private helpers.
const PlacementWorkspaceScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useState = reactImports_useState
const useMemo = reactImports_useMemo
const useEffect = reactImports_useEffect
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const ExportMenu = ExportMenuImports_default
const FilterPanel = FilterPanelImports_default
const TablePagination = TablePaginationImports_default

// Export column definitions
const driveExportColumns = [
  { label: 'Drive Title', value: 'title' },
  { label: 'Company', value: 'company' },
  { label: 'Tier', value: 'tier' },
  { label: 'Role', value: 'role' },
  { label: 'CTC Package', value: 'ctc' },
  { label: 'Drive Date', value: 'driveDate' },
  { label: 'Application Deadline', value: 'deadline' },
  { label: 'Venue / Mode', value: 'venue' },
  { label: 'Eligibility', value: 'eligibility' },
  { label: 'Status', value: 'status' },
  { label: 'Applicants', value: 'applicantsCount' },
  { label: 'Shortlisted', value: 'shortlistedCount' },
  { label: 'Selected', value: 'selectedCount' },
]

const companyExportColumns = [
  { label: 'Company Name', value: 'name' },
  { label: 'Industry Domain', value: 'industry' },
  { label: 'Hiring Tier', value: 'tier' },
  { label: 'HQ Location', value: 'hq' },
  { label: 'HR Contact Person', value: 'contactPerson' },
  { label: 'Contact Email', value: 'contactEmail' },
  { label: 'Contact Phone', value: 'contactPhone' },
  { label: 'Website', value: 'website' },
  { label: 'Past Hires', value: 'pastHires' },
  { label: 'Average CTC', value: 'avgPackage' },
  { label: 'Partner Status', value: 'status' },
]

const applicationExportColumns = [
  { label: 'Student Name', value: 'studentName' },
  { label: 'Roll Number', value: 'rollNo' },
  { label: 'Branch', value: 'branch' },
  { label: 'CGPA', value: 'cgpa' },
  { label: 'Recruiter Company', value: 'company' },
  { label: 'Job Role', value: 'role' },
  { label: 'Applied Date', value: 'appliedDate' },
  { label: 'Current Round', value: 'currentRound' },
  { label: 'Application Status', value: 'status' },
  { label: 'Student Email', value: 'email' },
  { label: 'Student Phone', value: 'phone' },
]

const interviewExportColumns = [
  { label: 'Candidate Name', value: 'candidateName' },
  { label: 'Roll Number', value: 'rollNo' },
  { label: 'Branch', value: 'branch' },
  { label: 'Company', value: 'company' },
  { label: 'Role', value: 'role' },
  { label: 'Round Type', value: 'roundType' },
  { label: 'Start Time', value: 'start' },
  { label: 'End Time', value: 'end' },
  { label: 'Venue / Link', value: 'venue' },
  { label: 'Interviewer', value: 'interviewer' },
  { label: 'Evaluation Status', value: 'status' },
  { label: 'Feedback Notes', value: 'feedback' },
]

function emptyPlacementStats() {
  return {
    totalEligible: 0,
    totalPlaced: 0,
    placementRate: 0,
    averagePackage: '—',
    highestPackage: '—',
    medianPackage: '—',
    totalOffers: 0,
    branchStats: [],
    tierBreakdown: [],
  }
}

function removePlacementDemoRecords(data) {
  const demoIds = new Set([
    ...defaultDrives,
    ...defaultCompanies,
    ...defaultApplications,
    ...defaultInterviews,
    ...defaultOffers,
  ].map(record => record.id))

  return {
    ...data,
    drives: (Array.isArray(data.drives) ? data.drives : []).filter(record => !demoIds.has(record.id)),
    companies: (Array.isArray(data.companies) ? data.companies : []).filter(record => !demoIds.has(record.id)),
    applications: (Array.isArray(data.applications) ? data.applications : []).filter(record => !demoIds.has(record.id)),
    interviews: (Array.isArray(data.interviews) ? data.interviews : []).filter(record => !demoIds.has(record.id)),
    offers: (Array.isArray(data.offers) ? data.offers : []).filter(record => !demoIds.has(record.id)),
    stats: emptyPlacementStats(),
  }
}

function PlacementWorkspace() {
  const [activeTab, setActiveTab] = useState('drives')
  const { selectedCollegeId, selectedAcademicYearId } = AcademicContextImports_useAcademic()
  const apiScope = { collegeId: selectedCollegeId, academicYearId: selectedAcademicYearId, enabled: Boolean(selectedCollegeId), resource: activeTab }
 // drives | companies | applications | interviews | offers | reports
  const [viewMode, setViewMode] = useState('grid') // grid | table (for drives)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [notice, setNotice] = useState('')

  const { data, reload: reloadApi, state: apiState, mutate: mutateApi } = useScopedModule(campusApi.loadPlacements, apiScope, { drives: [], companies: [], applications: [], interviews: [], offers: [] })

  // Modals state
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit'
  const [modalType, setModalType] = useState(null) // 'drive' | 'company' | 'application' | 'interview' | 'offer'
  const [activeItem, setActiveItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Tab switcher
  const handleSwitchTab = (tabKey) => {
    setActiveTab(tabKey)
    setSearchQuery('')
    setStatusFilter('ALL')
    setTierFilter('ALL')
    setBranchFilter('ALL')
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(
    (statusFilter && statusFilter !== 'ALL') ||
    (tierFilter && tierFilter !== 'ALL') ||
    (branchFilter && branchFilter !== 'ALL')
  )

  const handleClearFilters = () => {
    setStatusFilter('ALL')
    setTierFilter('ALL')
    setBranchFilter('ALL')
    setSearchQuery('')
    setCurrentPage(1)
  }

  // Filtered lists
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    if (activeTab === 'drives') {
      return data.drives.filter(item => {
        const matchQ = !q ||
          String(item.title ?? "").toLowerCase().includes(q) ||
          String(item.company ?? "").toLowerCase().includes(q) ||
          String(item.role ?? "").toLowerCase().includes(q) ||
          String(item.venue ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchTier = tierFilter === 'ALL' || item.tier === tierFilter
        return matchQ && matchStatus && matchTier
      })
    }

    if (activeTab === 'companies') {
      return data.companies.filter(item => {
        const matchQ = !q ||
          String(item.name ?? "").toLowerCase().includes(q) ||
          String(item.industry ?? "").toLowerCase().includes(q) ||
          String(item.contactPerson ?? "").toLowerCase().includes(q) ||
          String(item.contactEmail ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchTier = tierFilter === 'ALL' || item.tier === tierFilter
        return matchQ && matchStatus && matchTier
      })
    }

    if (activeTab === 'applications') {
      return data.applications.filter(item => {
        const matchQ = !q ||
          String(item.studentName ?? "").toLowerCase().includes(q) ||
          String(item.rollNo ?? "").toLowerCase().includes(q) ||
          String(item.company ?? "").toLowerCase().includes(q) ||
          String(item.role ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchBranch = branchFilter === 'ALL' || item.branch === branchFilter
        return matchQ && matchStatus && matchBranch
      })
    }

    if (activeTab === 'interviews') {
      return data.interviews.filter(item => {
        const matchQ = !q ||
          String(item.candidateName ?? "").toLowerCase().includes(q) ||
          String(item.rollNo ?? "").toLowerCase().includes(q) ||
          String(item.company ?? "").toLowerCase().includes(q) ||
          String(item.roundType ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchBranch = branchFilter === 'ALL' || item.branch === branchFilter
        return matchQ && matchStatus && matchBranch
      })
    }

    if (activeTab === 'offers') {
      return data.offers.filter(item => {
        const matchQ = !q ||
          String(item.studentName ?? "").toLowerCase().includes(q) ||
          String(item.rollNo ?? "").toLowerCase().includes(q) ||
          String(item.company ?? "").toLowerCase().includes(q) ||
          String(item.role ?? "").toLowerCase().includes(q) ||
          String(item.offerLetterRef ?? "").toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchBranch = branchFilter === 'ALL' || item.branch === branchFilter
        return matchQ && matchStatus && matchBranch
      })
    }

    return []
  }, [activeTab, data, searchQuery, statusFilter, tierFilter, branchFilter])

  // Pagination slice
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))

  // Export Columns based on active tab
  const currentExportColumns = useMemo(() => {
    switch (activeTab) {
      case 'drives': return driveExportColumns
      case 'companies': return companyExportColumns
      case 'applications': return applicationExportColumns
      case 'interviews': return interviewExportColumns
      default: return driveExportColumns
    }
  }, [activeTab])

  // Modal Handlers
  const openCreateModal = (type) => {
    setModalType(type)
    setModalMode('create')
    if (type === 'drive') {
      setActiveItem({
        id: `DRV-${Date.now().toString().slice(-4)}`,
        title: '',
        company: '',
        tier: 'Super Dream',
        role: '',
        ctc: '₹ 12.0 LPA',
        ctcNum: 12.0,
        driveDate: new Date().toISOString().slice(0, 10),
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        venue: 'Campus Auditorium & Virtual',
        eligibility: 'B.Tech CSE, IT, ECE · Min 7.5 CGPA',
        rounds: 'Online Coding Test, Technical Interview, HR Round',
        status: 'Draft',
        eligibleBranches: ['CSE', 'IT'],
        applicantsCount: 0,
        shortlistedCount: 0,
        selectedCount: 0,
        minCgpa: 7.5,
        description: '',
      })
    } else if (type === 'company') {
      setActiveItem({
        id: `CMP-${Date.now().toString().slice(-4)}`,
        name: '',
        industry: 'Software & Technology',
        tier: 'Dream',
        hq: 'Hyderabad',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        website: 'https://',
        mouSigned: true,
        pastHires: 0,
        avgPackage: '₹ 8.5 LPA',
        status: 'Active Partner',
        notes: '',
      })
    } else if (type === 'application') {
      setActiveItem({
        id: `APP-${Date.now().toString().slice(-4)}`,
        studentName: '', studentId: '',
        rollNo: '21B81A0501',
        branch: 'CSE',
        cgpa: 8.0,
        driveId: data.drives[0]?.id || 'DRV-101',
        company: data.drives[0]?.company || 'Microsoft',
        role: data.drives[0]?.role || 'Software Engineer',
        appliedDate: new Date().toISOString().slice(0, 10),
        status: 'Applied',
        email: '',
        phone: '',
        resumeUrl: 'Resume.pdf',
        currentRound: 'Aptitude Test',
      })
    } else if (type === 'interview') {
      setActiveItem({
        id: `INT-${Date.now().toString().slice(-4)}`,
        candidateName: '',
        rollNo: '',
        branch: 'CSE',
        company: data.companies[0]?.name || 'Microsoft',
        role: 'Software Development Engineer',
        roundType: 'Technical Round 1',
        start: new Date().toISOString().slice(0, 16),
        end: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        venue: 'Placement Cell Lab 1 & G-Meet',
        interviewer: '',
        meetLink: 'https://meet.google.com/new',
        status: 'Scheduled',
        feedback: '',
      })
    } else if (type === 'offer') {
      setActiveItem({
        id: `OFR-${Date.now().toString().slice(-4)}`,
        studentName: '',
        rollNo: '',
        branch: 'CSE',
        company: data.companies[0]?.name || 'Amazon',
        role: 'Software Development Engineer',
        ctc: '₹ 14.0 LPA',
        ctcNum: 14.0,
        offerDate: new Date().toISOString().slice(0, 10),
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        offerLetterRef: `OFF-${Date.now().toString().slice(-6)}`,
        status: 'Pending',
        location: 'Hyderabad',
      })
    }
  }

  const openEditModal = (item, type) => {
    setModalType(type)
    setModalMode('edit')
    setActiveItem({ ...item })
  }

  const handleSaveModal = async e => {
    e.preventDefault()
    if (!activeItem) return
    if (modalType === 'interview') {
      setNotice('Interview rounds cannot be saved because the date and time fields have been removed. Contact an administrator to schedule interviews.')
      return
    }
    if (await mutateApi(() => campusApi.savePlacement(modalType, activeItem, modalMode === 'edit', apiScope, data))) { setModalMode(null); setActiveItem(null); setNotice('Record saved successfully.') }
  }

  // Delete Handlers
  const requestDelete = (id, type, label) => {
    setDeleteTarget({ id, type, label })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id, type } = deleteTarget
    if (!['drive', 'company', 'interview'].includes(type)) { setNotice('This record has no matching delete API.'); setDeleteTarget(null); return }
    const key = { drive: 'drives', company: 'companies', interview: 'interviews' }[type]
    if (await mutateApi(() => campusApi.call(`placements/${key}/${campusApi.requireId(id)}`, { method: 'DELETE', query: { collegeId: selectedCollegeId } }))) { setDeleteTarget(null); setNotice('Record deleted successfully.') }
  }
  const saveInterviewStatus = (id, status) => {
    if (!['Cleared','Eliminated'].includes(status)) throw new Error('Only interview results can be recorded here. Edit a scheduled interview to change its details.')
    return campusApi.call(`placements/interviews/${campusApi.requireId(id)}/result`,{method:'POST',query:{collegeId:selectedCollegeId},body:{interviewResult:status==='Cleared'?'PASSED':'FAILED',completedAt:new Date().toISOString()}})
  }
  const saveOfferStatus = (id, status) => campusApi.call(`placements/selections/${campusApi.requireId(id)}/offer`, { method: 'PATCH', body: { offerStatus: campusApi.statusCode(status) }, query: { collegeId: selectedCollegeId } })
  const handleSetInterviewStatus = (id, status) => mutateApi(() => saveInterviewStatus(id, status))
  const handleSetOfferStatus = (id, status) => mutateApi(() => saveOfferStatus(id, status))
  const markAllInterviews = status => mutateApi(async () => { for (const row of data.interviews) await saveInterviewStatus(row.id, status) })
  const markAllOffers = status => mutateApi(async () => { for (const row of data.offers) await saveOfferStatus(row.id, status) })

  // KPI Calculations
  const totalDrives = data.drives.length
  const activeDrivesCount = data.drives.filter(d => ['Published','Registration Open','Registration Closed','Ongoing'].includes(d.status)).length
  const totalCompaniesCount = data.companies.length

  return (
    <DashboardLayout><ScopedModuleNotice state={apiState} data={data} resource={activeTab} onRetry={reloadApi} />
      <div className="plw-workspace">
        {/* Page Header (Stats in compactSummary top-right corner) */}
        <PageHeader
          className="plw-page-header"
          title="Campus Placements & Corporate Relations"
          subtitle="Coordinate campus recruitment drives, manage partner employers, monitor student applications, and schedule interview rounds."
          breadcrumb={[
            { label: 'Digital Campus', link: '/placement' },
            'Training & Placement Cell'
          ]}
          compactSummary={[
            { label: 'Active Drives', value: data.resourceErrors?.drives ? '—' : activeDrivesCount },
            { label: 'Corporate Partners', value: data.resourceErrors?.companies ? '—' : totalCompaniesCount },
          ]}
        />

        {notice && (
          <div className="campus-notice" role="status">
            <FiCheckCircle style={{ color: 'var(--brand)' }} />
            <span>{notice}</span>
          </div>
        )}

        {/* Segmented Sub-navigation Tabs with Badge Counts */}
        <div className="plw-top-bar">
          <nav className="plw-nav" aria-label="Placement workspace views">
            <button
              type="button"
              className={activeTab === 'drives' ? 'active' : ''}
              onClick={() => handleSwitchTab('drives')}
            >
              <FiBriefcase />
              <span>Drives</span>
              <span className="plw-badge-count">{data.resourceErrors?.drives ? '—' : data.drives.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'companies' ? 'active' : ''}
              onClick={() => handleSwitchTab('companies')}
            >
              <FiGlobe />
              <span>Companies</span>
              <span className="plw-badge-count">{data.resourceErrors?.companies ? '—' : data.companies.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'applications' ? 'active' : ''}
              onClick={() => handleSwitchTab('applications')}
            >
              <FiUsers />
              <span>Applications</span>
              <span className="plw-badge-count">{data.resourceErrors?.applications ? '—' : data.applications.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'interviews' ? 'active' : ''}
              onClick={() => handleSwitchTab('interviews')}
            >
              <FiClock />
              <span>Interviews</span>
              <span className="plw-badge-count">{data.resourceErrors?.interviews ? '—' : data.interviews.length}</span>
            </button>

          </nav>

          <div className="plw-actions">
            {activeTab === 'drives' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('drive')}
              >
                <FiPlus /> Schedule Recruitment Drive
              </button>
            )}

            {activeTab === 'companies' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('company')}
              >
                <FiPlus /> Add Partner Company
              </button>
            )}

            {activeTab === 'applications' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('application')}
              >
                <FiPlus /> New Student Application
              </button>
            )}

            {activeTab === 'interviews' && (
              <>
                <button
                  type="button"
                  className="grm-button grm-button--secondary"
                  onClick={() => markAllInterviews('Cleared')}
                  title="Mark all participants as Cleared"
                >
                  ✓ Mark All Cleared
                </button>
                <button
                  type="button"
                  className="grm-button grm-button--primary"
                  onClick={() => openCreateModal('interview')}
                >
                  <FiPlus /> Schedule Interview
                </button>
              </>
            )}

            {/* Standard ERP ExportMenu component with CSV and Print / PDF options */}
            <ExportMenu
              rows={filteredList}
              columns={currentExportColumns}
              filename={`placement_${activeTab}`}
              title={`Campus Placements - ${activeTab.toUpperCase()}`}
              directDownload
            />
          </div>
        </div>

        {/* Collapsible FilterPanel with Filters toggle button (Standard ERP) */}
        {activeTab !== 'reports' && (
          <FilterPanel
            active={hasActiveFilters}
            onClear={handleClearFilters}
            className="plw-filter-panel"
            actions={
              <div className="plw-toolbar-right">
                {activeTab === 'drives' && (
                  <div className="plw-view-switch">
                    <button
                      type="button"
                      className={viewMode === 'grid' ? 'active' : ''}
                      onClick={() => setViewMode('grid')}
                      title="Card Grid View"
                      aria-label="Card Grid View"
                    >
                      <FiGrid />
                    </button>
                    <button
                      type="button"
                      className={viewMode === 'table' ? 'active' : ''}
                      onClick={() => setViewMode('table')}
                      title="Table View"
                      aria-label="Table View"
                    >
                      <FiList />
                    </button>
                  </div>
                )}

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Rows:
                  <ProjectSelect
                    className="plw-filter-select"
                    style={{ minWidth: '60px', height: '34px', padding: '0 6px' }}
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </ProjectSelect>
                </label>

                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {filteredList.length > 0
                    ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredList.length)} of ${filteredList.length} shown`
                    : '0 records'}
                </span>
              </div>
            }
          >
            <div className="course-toolbar">
              <label className="course-search">
                <FiSearch />
                <input
                  type="search"
                  placeholder={
                    activeTab === 'drives' ? 'Search drive title, company or role...' :
                    activeTab === 'companies' ? 'Search company name, industry, HR contact...' :
                    activeTab === 'applications' ? 'Search student name, roll no, company...' :
                    activeTab === 'interviews' ? 'Search candidate name, roll no, company...' :
                    'Search student name, roll no, company or offer ref...'
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  aria-label="Search"
                />
              </label>

              {/* Status Filter */}
              <ProjectSelect
                className="plw-filter-select"
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Statuses</option>
                {activeTab === 'drives' && (
                  <>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </>
                )}
                {activeTab === 'companies' && (
                  <>
                    <option value="Active Partner">Active Partner</option>
                    <option value="Prospective">Prospective</option>
                  </>
                )}
                {activeTab === 'applications' && (
                  <>
                    <option value="Applied">Applied</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
                {activeTab === 'interviews' && (
                  <>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Eliminated">Eliminated</option>
                  </>
                )}
                {activeTab === 'offers' && (
                  <>
                    <option value="Accepted">Accepted</option>
                    <option value="Pending">Pending</option>
                    <option value="Declined">Declined</option>
                  </>
                )}
              </ProjectSelect>

              {/* Tier Filter for Drives and Companies */}
              {(activeTab === 'drives' || activeTab === 'companies') && (
                <ProjectSelect
                  className="plw-filter-select"
                  aria-label="Filter by Tier"
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="ALL">All Tiers</option>
                  <option value="Super Dream">Super Dream (&gt; 15 LPA)</option>
                  <option value="Dream">Dream (8 - 15 LPA)</option>
                  <option value="Core">Core / Standard (4 - 8 LPA)</option>
                </ProjectSelect>
              )}

              {/* Branch Filter for Applications, Interviews, Offers */}
              {(activeTab === 'applications' || activeTab === 'interviews' || activeTab === 'offers') && (
                <ProjectSelect
                  className="plw-filter-select"
                  aria-label="Filter by Branch"
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="ALL">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="EEE">EEE</option>
                </ProjectSelect>
              )}
            </div>
          </FilterPanel>
        )}

        {/* TAB 1: Recruitment Drives */}
        {activeTab === 'drives' && (
          viewMode === 'grid' ? (
            <>
              <div className="plw-card-grid">
                {paginatedList.map(drive => (
                  <div key={drive.id} className="plw-card">
                    <div className="plw-card-header">
                      <div className="plw-card-company-group">
                        <CompanyLogo name={drive.company} className="plw-company-avatar" />
                        <div className="plw-card-title-group">
                          <h4 className="plw-card-title">{drive.company}</h4>
                          <p className="plw-card-role">{drive.role}</p>
                        </div>
                      </div>
                      <span className={`plw-tier-chip plw-tier--${String(drive.tier || '').toLowerCase().replace(' ', '-')}`}>
                        {drive.tier}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span className="plw-ctc-pill">
                        <FiDollarSign /> {drive.ctc}
                      </span>
                      <span className={`plw-status-chip plw-status--${String(drive.status ?? "").toLowerCase()}`}>
                        {drive.status}
                      </span>
                    </div>

                    <div className="plw-card-details">
                      <div className="plw-card-detail-item">
                        <FiCalendar />
                        <span>Drive Date: <strong>{drive.driveDate}</strong></span>
                      </div>
                      <div className="plw-card-detail-item">
                        <FiClock />
                        <span>Deadline: <strong>{drive.deadline}</strong></span>
                      </div>
                      <div className="plw-card-detail-item">
                        <FiMapPin />
                        <span>Venue: {drive.venue}</span>
                      </div>
                      <div className="plw-card-detail-item">
                        <FiCheckSquare />
                        <span title={drive.eligibility}>Eligibility: {drive.eligibility}</span>
                      </div>
                    </div>

                    {/* Funnel conversion stats */}
                    <div className="plw-funnel-bar">
                      <div className="plw-funnel-labels">
                        <span>Applicants: <strong>{drive.applicantsCount}</strong></span>
                        <span>Shortlisted: <strong>{drive.shortlistedCount}</strong></span>
                        <span>Selected: <strong style={{ color: '#047857' }}>{drive.selectedCount}</strong></span>
                      </div>
                    </div>

                    <div className="plw-card-footer">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {drive.id}</span>
                      <div className="plw-card-actions">
                        <button
                          type="button"
                          className="plw-btn-icon plw-btn-icon--edit action-edit"
                          onClick={() => openEditModal(drive, 'drive')}
                          title="Edit Recruitment Drive"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="plw-btn-icon plw-btn-icon--danger action-delete"
                          onClick={() => requestDelete(drive.id, 'drive', `${drive.company} - ${drive.role}`)}
                          title="Remove Recruitment Drive"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!filteredList.length && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <FiBriefcase style={{ fontSize: '32px', marginBottom: '8px' }} />
                    <p>No recruitment drives matching current filters.</p>
                  </div>
                )}
              </div>

              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <>
              <div className="plw-table-wrap">
                <table className="plw-table">
                  <thead>
                    <tr>
                      <th>Company & Drive</th>
                      <th>Tier & Role</th>
                      <th>CTC Package</th>
                      <th>Drive Date</th>
                      <th>Deadline</th>
                      <th>Applicants / Shortlisted / Selected</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(drive => (
                      <tr key={drive.id}>
                        <td>
                          <div className="plw-company-identity">
                            <CompanyLogo name={drive.company} compact />
                            <div><strong>{drive.company}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{drive.title}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div><strong>{drive.role}</strong></div>
                          <span className={`plw-tier-chip plw-tier--${String(drive.tier || '').toLowerCase().replace(' ', '-')}`}>
                            {drive.tier}
                          </span>
                        </td>
                        <td>
                          <span className="plw-ctc-pill">{drive.ctc}</span>
                        </td>
                        <td>{drive.driveDate}</td>
                        <td>{drive.deadline}</td>
                        <td>
                          <div style={{ fontSize: '12px' }}>
                            <span>App: <strong>{drive.applicantsCount}</strong></span> ·{' '}
                            <span>Shortlist: <strong>{drive.shortlistedCount}</strong></span> ·{' '}
                            <span style={{ color: '#047857' }}>Select: <strong>{drive.selectedCount}</strong></span>
                          </div>
                        </td>
                        <td>
                          <span className={`plw-status-chip plw-status--${String(drive.status ?? "").toLowerCase()}`}>
                            {drive.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="plw-btn-icon plw-btn-icon--edit action-edit"
                              onClick={() => openEditModal(drive, 'drive')}
                              title="Edit Drive"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="plw-btn-icon plw-btn-icon--danger action-delete"
                              onClick={() => requestDelete(drive.id, 'drive', `${drive.company} - ${drive.role}`)}
                              title="Remove Drive"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredList.length && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                          No recruitment drives matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )
        )}

        {/* TAB 2: Partner Companies */}
        {activeTab === 'companies' && (
          <>
            <div className="plw-table-wrap">
              <table className="plw-table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Industry Domain</th>
                    <th>Hiring Tier</th>
                    <th>HR Contact Person</th>
                    <th>Contact Email / Phone</th>
                    <th>Past Hires</th>
                    <th>Avg Package</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(comp => (
                    <tr key={comp.id}>
                      <td>
                        <div className="plw-company-identity">
                          <CompanyLogo name={comp.name} compact />
                          <strong>{comp.name}</strong>
                        </div>
                        {comp.website && (
                          <div style={{ fontSize: '11px' }}>
                            <a href={comp.website} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              Visit Website <FiExternalLink style={{ fontSize: '10px' }} />
                            </a>
                          </div>
                        )}
                      </td>
                      <td>{comp.industry}</td>
                      <td>
                        <span className={`plw-tier-chip plw-tier--${String(comp.tier || '').toLowerCase().replace(' ', '-')}`}>
                          {comp.tier}
                        </span>
                      </td>
                      <td>
                        <div><strong>{comp.contactPerson}</strong></div>
                        <small style={{ color: 'var(--text-muted)' }}>{comp.hq}</small>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}><FiMail style={{ verticalAlign: 'middle', marginRight: '4px' }} />{comp.contactEmail}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}><FiPhone style={{ verticalAlign: 'middle', marginRight: '4px' }} />{comp.contactPhone}</div>
                      </td>
                      <td>
                        <strong>{comp.pastHires}</strong> hires
                      </td>
                      <td>
                        <span className="plw-ctc-pill">{comp.avgPackage}</span>
                      </td>
                      <td>
                        <span className="plw-status-chip plw-status--active">
                          {comp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--edit action-edit"
                            onClick={() => openEditModal(comp, 'company')}
                            title="Edit Company Details"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--danger action-delete"
                            onClick={() => requestDelete(comp.id, 'company', comp.name)}
                            title="Remove Company"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No partner companies found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

        {/* TAB 3: Student Applications */}
        {activeTab === 'applications' && (
          <>
            <div className="plw-table-wrap">
              <table className="plw-table">
                <thead>
                  <tr>
                    <th>Student Name & Roll No</th>
                    <th>Branch</th>
                    <th>CGPA</th>
                    <th>Company & Role</th>
                    <th>Applied Date</th>
                    <th>Current Round</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(app => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.studentName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{app.rollNo}</div>
                      </td>
                      <td><span className="campus-badge">{app.branch}</span></td>
                      <td><strong>{app.cgpa}</strong></td>
                      <td>
                        <div><strong>{app.company}</strong></div>
                        <small style={{ color: 'var(--text-secondary)' }}>{app.role}</small>
                      </td>
                      <td>{app.appliedDate}</td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af' }}>{app.currentRound}</span>
                      </td>
                      <td>
                        <span className={`plw-status-chip plw-status--${String(app.status ?? "").toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--edit action-edit"
                            onClick={() => openEditModal(app, 'application')}
                            title="Edit Application Status"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--danger action-delete"
                            onClick={() => requestDelete(app.id, 'application', `${app.studentName} - ${app.company}`)}
                            title="Remove Application"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No student applications matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

        {/* TAB 4: Interviews & Assessments */}
        {activeTab === 'interviews' && (
          <>
            <div className="plw-table-wrap">
              <table className="plw-table">
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Company & Role</th>
                    <th>Assessment Round</th>
                    <th>Schedule Window</th>
                    <th>Venue / Meeting Link</th>
                    <th>Interviewer</th>
                    <th className="plw-th-status">Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(intw => (
                    <tr key={intw.id}>
                      <td>
                        <strong>{intw.candidateName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{intw.rollNo} ({intw.branch})</div>
                      </td>
                      <td>
                        <div><strong>{intw.company}</strong></div>
                        <small style={{ color: 'var(--text-secondary)' }}>{intw.role}</small>
                      </td>
                      <td>
                        <span className="campus-badge" style={{ fontWeight: '600' }}>{intw.roundType}</span>
                      </td>
                      <td>
                        <div>{new Date(intw.start).toLocaleDateString()}</div>
                        <small style={{ color: 'var(--text-secondary)' }}>
                          {new Date(intw.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(intw.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>{intw.venue}</div>
                        {intw.meetLink && intw.meetLink !== '—' && (
                          <a href={intw.meetLink} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--brand)' }}>
                            Join Call <FiExternalLink style={{ fontSize: '10px' }} />
                          </a>
                        )}
                      </td>
                      <td>{intw.interviewer || 'TBA'}</td>
                      <td className="plw-td-status">
                        <div className="plw-status-radio-group" role="radiogroup" aria-label={`Status for ${intw.candidateName}`}>
                          {['Scheduled', 'Cleared', 'Eliminated'].map((option) => (
                            <label
                              key={option}
                              className={`plw-radio-chip plw-radio-chip--${option.toLowerCase()} ${intw.status === option ? 'is-selected' : ''}`}
                              title={`Mark as ${option}`}
                            >
                              <input
                                type="radio"
                                name={`interview-status-${intw.id}`}
                                value={option}
                                checked={intw.status === option}
                                onChange={() => handleSetInterviewStatus(intw.id, option)}
                              />
                              <span className="plw-radio-circle" />
                              <span className="plw-radio-text">{option}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--edit action-edit"
                            onClick={() => openEditModal(intw, 'interview')}
                            title="Edit Interview"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--danger action-delete"
                            onClick={() => requestDelete(intw.id, 'interview', `${intw.candidateName} (${intw.roundType})`)}
                            title="Remove Round"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No interview rounds matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}


        {/* Modal Dialog for Create/Edit */}
        {modalMode && activeItem && (
          <div className="plw-modal-backdrop" onClick={() => setModalMode(null)}>
            <div className="plw-modal" onClick={(e) => e.stopPropagation()}>
              <div className="plw-modal-header">
                <h3>
                  {modalMode === 'create' ? 'Schedule New' : 'Edit'}{' '}
                  {modalType === 'drive' ? 'Recruitment Drive' :
                   modalType === 'company' ? 'Partner Company' :
                   modalType === 'application' ? 'Student Application' :
                   modalType === 'interview' ? 'Interview Round' : 'Job Offer'}
                </h3>
                <button
                  type="button"
                  className="plw-modal-close"
                  onClick={() => setModalMode(null)}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSaveModal}>
                <div className="plw-modal-body">
                  {modalType === 'interview' && <p role="status" className="campus-notice">Interview rounds cannot be saved because the date and time fields have been removed. Contact an administrator to schedule interviews.</p>}
                  {/* DRIVE FORM */}
                  {modalType === 'drive' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Drive Title *
                          <input
                            required
                            type="text"
                            value={activeItem.title}
                            onChange={e => setActiveItem({ ...activeItem, title: e.target.value })}
                            placeholder="e.g. Microsoft Campus Hiring 2026-27"
                          />
                        </label>
                        <label className="plw-form-field">
                          Company Name *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                            placeholder="e.g. Microsoft India"
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Role Title *
                          <input
                            required
                            type="text"
                            value={activeItem.role}
                            onChange={e => setActiveItem({ ...activeItem, role: e.target.value })}
                            placeholder="e.g. Software Engineer - Cloud & AI"
                          />
                        </label>
                        <label className="plw-form-field">
                          Hiring Tier *
                          <ProjectSelect
                            value={activeItem.tier}
                            onChange={e => setActiveItem({ ...activeItem, tier: e.target.value })}
                          >
                            <option value="Super Dream">Super Dream (&gt; 15 LPA)</option>
                            <option value="Dream">Dream (8 - 15 LPA)</option>
                            <option value="Core">Core (4 - 8 LPA)</option>
                          </ProjectSelect>
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          CTC Package (LPA) *
                          <input
                            required
                            type="text"
                            value={activeItem.ctcNum}
                            onChange={e => setActiveItem({ ...activeItem, ctcNum: e.target.value, ctc: `₹ ${e.target.value} LPA` })}
                            placeholder="e.g. ₹ 44.0 LPA"
                          />
                        </label>
                        <label className="plw-form-field">
                          Drive Date *
                          <input
                            required
                            type="date"
                            value={activeItem.driveDate}
                            onChange={e => setActiveItem({ ...activeItem, driveDate: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Application Deadline *
                          <input
                            required
                            type="date"
                            value={activeItem.deadline}
                            onChange={e => setActiveItem({ ...activeItem, deadline: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Drive Status *
                          <ProjectSelect
                            value={activeItem.status}
                            onChange={e => setActiveItem({ ...activeItem, status: e.target.value })}
                          >
                            {['Draft','Published','Registration Open','Registration Closed','Ongoing','Completed','Cancelled'].map(value => <option key={value} value={value}>{value}</option>)}
                          </ProjectSelect>
                        </label>
                      </div>

                      <label className="plw-form-field">
                        Venue / Mode
                        <input
                          type="text"
                          value={activeItem.venue}
                          onChange={e => setActiveItem({ ...activeItem, venue: e.target.value })}
                          placeholder="e.g. Virtual Assessment & Campus Auditorium"
                        />
                      </label>

                      <label className="plw-form-field">
                        Eligibility Criteria
                        <textarea
                          rows={2}
                          value={activeItem.eligibility}
                          onChange={e => setActiveItem({ ...activeItem, eligibility: e.target.value })}
                          placeholder="e.g. B.Tech CSE, IT, ECE · Min 8.0 CGPA · No active backlogs"
                        />
                      </label>
                    </>
                  )}

                  {/* COMPANY FORM */}
                  {modalType === 'company' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Company Name *
                          <input
                            required
                            type="text"
                            value={activeItem.name}
                            onChange={e => setActiveItem({ ...activeItem, name: e.target.value })}
                            placeholder="e.g. Google India"
                          />
                        </label>
                        <label className="plw-form-field">
                          Industry Domain *
                          <input
                            required
                            type="text"
                            value={activeItem.industry}
                            onChange={e => setActiveItem({ ...activeItem, industry: e.target.value })}
                            placeholder="e.g. Cloud & AI / Fintech"
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Tier *
                          <ProjectSelect
                            value={activeItem.tier}
                            onChange={e => setActiveItem({ ...activeItem, tier: e.target.value })}
                          >
                            <option value="Super Dream">Super Dream</option>
                            <option value="Dream">Dream</option>
                            <option value="Core">Core</option>
                          </ProjectSelect>
                        </label>
                        <label className="plw-form-field">
                          Average Package (LPA)
                          <input
                            type="text"
                            value={activeItem.avgPackage}
                            onChange={e => setActiveItem({ ...activeItem, avgPackage: e.target.value })}
                            placeholder="e.g. ₹ 42.0 LPA"
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          HR Contact Person
                          <input
                            type="text"
                            value={activeItem.contactPerson}
                            onChange={e => setActiveItem({ ...activeItem, contactPerson: e.target.value })}
                            placeholder="e.g. Radhika Sharma"
                          />
                        </label>
                        <label className="plw-form-field">
                          Contact Email
                          <input
                            type="email"
                            value={activeItem.contactEmail}
                            onChange={e => setActiveItem({ ...activeItem, contactEmail: e.target.value })}
                            placeholder="e.g. hr@company.com"
                          />
                        </label>
                      </div>

                      <label className="plw-form-field">
                        Careers Website
                        <input
                          type="url"
                          value={activeItem.website}
                          onChange={e => setActiveItem({ ...activeItem, website: e.target.value })}
                          placeholder="https://careers.google.com"
                        />
                      </label>
                    </>
                  )}

                  {/* APPLICATION FORM */}
                  {modalType === 'application' && (
                    <>
                      <div className="plw-form-row">
                        <label><span>Student ID *</span><input type="number" min="1" required value={activeItem.studentId || ''} onChange={e => setActiveItem(prev => ({ ...prev, studentId: e.target.value }))} /></label><label className="plw-form-field">
                          Student Full Name *
                          <input
                            required
                            type="text"
                            value={activeItem.studentName}
                            onChange={e => setActiveItem({ ...activeItem, studentName: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Roll Number *
                          <input
                            required
                            type="text"
                            value={activeItem.rollNo}
                            onChange={e => setActiveItem({ ...activeItem, rollNo: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Branch *
                          <ProjectSelect
                            value={activeItem.branch}
                            onChange={e => setActiveItem({ ...activeItem, branch: e.target.value })}
                          >
                            <option value="CSE">CSE</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                            <option value="EEE">EEE</option>
                          </ProjectSelect>
                        </label>
                        <label className="plw-form-field">
                          CGPA *
                          <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            value={activeItem.cgpa}
                            onChange={e => setActiveItem({ ...activeItem, cgpa: parseFloat(e.target.value) || 0 })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Recruiter Company *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Status *
                          <ProjectSelect
                            value={activeItem.status}
                            onChange={e => setActiveItem({ ...activeItem, status: e.target.value })}
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interviewing">Interviewing</option>
                            <option value="Selected">Selected</option>
                            <option value="Rejected">Rejected</option>
                          </ProjectSelect>
                        </label>
                      </div>
                    </>
                  )}

                  {/* INTERVIEW FORM */}
                  {modalType === 'interview' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Candidate Name *
                          <input
                            required
                            type="text"
                            value={activeItem.candidateName}
                            onChange={e => setActiveItem({ ...activeItem, candidateName: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Roll Number *
                          <input
                            required
                            type="text"
                            value={activeItem.rollNo}
                            onChange={e => setActiveItem({ ...activeItem, rollNo: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Company *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Round Type *
                          <ProjectSelect
                            value={activeItem.roundType}
                            onChange={e => setActiveItem({ ...activeItem, roundType: e.target.value })}
                          >
                            <option value="Online Coding Test">Online Coding Test</option>
                            <option value="Technical Round 1">Technical Round 1</option>
                            <option value="Technical Round 2">Technical Round 2</option>
                            <option value="System Design Round">System Design Round</option>
                            <option value="Managerial Round">Managerial Round</option>
                            <option value="HR & Leadership">HR & Leadership</option>
                          </ProjectSelect>
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Venue / Link
                          <input
                            type="text"
                            value={activeItem.venue}
                            onChange={e => setActiveItem({ ...activeItem, venue: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Interviewer Name
                          <input
                            type="text"
                            value={activeItem.interviewer}
                            onChange={e => setActiveItem({ ...activeItem, interviewer: e.target.value })}
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {/* OFFER FORM */}
                  {modalType === 'offer' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Student Name *
                          <input
                            required
                            type="text"
                            value={activeItem.studentName}
                            onChange={e => setActiveItem({ ...activeItem, studentName: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Roll Number *
                          <input
                            required
                            type="text"
                            value={activeItem.rollNo}
                            onChange={e => setActiveItem({ ...activeItem, rollNo: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Recruiter Company *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Job Role *
                          <input
                            required
                            type="text"
                            value={activeItem.role}
                            onChange={e => setActiveItem({ ...activeItem, role: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Offered CTC (LPA) *
                          <input
                            required
                            type="text"
                            value={activeItem.ctcNum}
                            onChange={e => setActiveItem({ ...activeItem, ctcNum: e.target.value, ctc: `₹ ${e.target.value} LPA` })}
                            placeholder="e.g. ₹ 16.5 LPA"
                          />
                        </label>
                        <label className="plw-form-field">
                          Offer Status *
                          <ProjectSelect
                            value={activeItem.status}
                            onChange={e => setActiveItem({ ...activeItem, status: e.target.value })}
                          >
                            <option value="Accepted">Accepted</option>
                            <option value="Pending">Pending</option>
                            <option value="Declined">Declined</option>
                          </ProjectSelect>
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Offer Letter Reference *
                          <input
                            required
                            type="text"
                            value={activeItem.offerLetterRef}
                            onChange={e => setActiveItem({ ...activeItem, offerLetterRef: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Posting Location
                          <input
                            type="text"
                            value={activeItem.location}
                            onChange={e => setActiveItem({ ...activeItem, location: e.target.value })}
                            placeholder="e.g. Hyderabad"
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="plw-modal-footer">
                  <button
                    type="button"
                    className="grm-button grm-button--secondary"
                    onClick={() => setModalMode(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="grm-button grm-button--primary"
                    disabled={modalType === 'interview'}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Confirmation Popup Modal for Delete (NO window.confirm) */}
        {deleteTarget && (
          <div className="plw-modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="plw-modal plw-modal--sm" onClick={(e) => e.stopPropagation()}>
              <div className="plw-modal-header" style={{ borderBottomColor: '#fee2e2' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
                  <FiAlertTriangle /> Confirm Deletion
                </h3>
                <button
                  type="button"
                  className="plw-modal-close"
                  onClick={() => setDeleteTarget(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="plw-modal-body">
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                  Are you sure you want to permanently remove this record?
                </p>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
                  <strong>Record:</strong> {deleteTarget.label}
                </div>
                <small style={{ color: 'var(--text-muted)' }}>
                  This action cannot be undone. Placement stats and reports will update accordingly.
                </small>
              </div>

              <div className="plw-modal-footer">
                <button
                  type="button"
                  className="grm-button grm-button--secondary"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="grm-button"
                  style={{ background: '#dc2626', color: '#ffffff', borderColor: '#dc2626' }}
                  onClick={confirmDelete}
                >
                  <FiTrash2 /> Yes, Delete Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Related samplePlacementData data.
// Sample placement data for B.Tech Institutional Training & Placement Cell

const defaultDrives = [
  {
    id: 'DRV-101',
    title: 'Microsoft Campus Hiring 2026-27',
    company: 'Microsoft India',
    tier: 'Super Dream',
    role: 'Software Engineer - Cloud & AI',
    ctc: '₹ 44.0 LPA',
    ctcNum: 44.0,
    driveDate: '2026-10-25',
    deadline: '2026-10-20',
    venue: 'Virtual Assessment & Campus Auditorium',
    eligibility: 'B.Tech CSE, IT, ECE · Min 8.0 CGPA · No active backlogs',
    rounds: 'Online Coding Test, Tech Round 1, Tech Round 2, AA/HR Round',
    status: 'Upcoming',
    eligibleBranches: ['CSE', 'IT', 'ECE'],
    applicantsCount: 148,
    shortlistedCount: 32,
    selectedCount: 8,
    minCgpa: 8.0,
    description: 'Microsoft campus hiring for university graduates. Roles in Azure Infrastructure, Microsoft 365, and Applied AI core teams.',
  },
  {
    id: 'DRV-102',
    title: 'Google University Graduate SWE',
    company: 'Google',
    tier: 'Super Dream',
    role: 'Software Development Engineer',
    ctc: '₹ 42.0 LPA',
    ctcNum: 42.0,
    driveDate: '2026-11-04',
    deadline: '2026-10-28',
    venue: 'Google Meet & Hyderabad Campus',
    eligibility: 'B.Tech All Branches · Min 8.5 CGPA · Strong DSA proficiency',
    rounds: 'Online Assessment, Technical Interview 1, Technical Interview 2, Googliness & Leadership',
    status: 'Upcoming',
    eligibleBranches: ['CSE', 'IT', 'ECE', 'EEE'],
    applicantsCount: 210,
    shortlistedCount: 45,
    selectedCount: 6,
    minCgpa: 8.5,
    description: 'Full-time graduate engineering positions across Google Cloud, Search, and Android Core operating system teams.',
  },
  {
    id: 'DRV-103',
    title: 'TCS Digital & Prime National Drive',
    company: 'Tata Consultancy Services',
    tier: 'Dream',
    role: 'Digital Engineer / Full Stack Developer',
    ctc: '₹ 7.5 LPA',
    ctcNum: 7.5,
    driveDate: '2026-10-14',
    deadline: '2026-10-11',
    venue: 'TCS iON Center & Main Seminar Hall',
    eligibility: 'B.Tech All Branches · Min 6.5 CGPA · Max 1 active backlog permitted',
    rounds: 'TCS NQT Advanced, Technical Interview, HR & Managerial',
    status: 'Active',
    eligibleBranches: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
    applicantsCount: 340,
    shortlistedCount: 110,
    selectedCount: 42,
    minCgpa: 6.5,
    description: 'High-volume national hiring drive for digital and cloud transformation projects across banking, automotive, and retail domains.',
  },
  {
    id: 'DRV-104',
    title: 'Qualcomm Hardware & Firmware Engineering',
    company: 'Qualcomm',
    tier: 'Super Dream',
    role: 'Firmware & Embedded Systems Engineer',
    ctc: '₹ 24.5 LPA',
    ctcNum: 24.5,
    driveDate: '2026-10-18',
    deadline: '2026-10-15',
    venue: 'Placement Cell Lab 2 & Hyderabad Office',
    eligibility: 'B.Tech ECE, CSE, EEE · Min 7.5 CGPA · VLSI/C proficiency',
    rounds: 'Domain Test (C/Verilog), Technical Round 1, System Architecture, HR',
    status: 'Active',
    eligibleBranches: ['ECE', 'CSE', 'EEE'],
    applicantsCount: 95,
    shortlistedCount: 28,
    selectedCount: 10,
    minCgpa: 7.5,
    description: 'Snapdragon SoC design, 5G modem firmware development, and Linux kernel device driver software.',
  },
  {
    id: 'DRV-105',
    title: 'Amazon SDE-1 University Graduate',
    company: 'Amazon',
    tier: 'Super Dream',
    role: 'Software Development Engineer - 1',
    ctc: '₹ 32.0 LPA',
    ctcNum: 32.0,
    driveDate: '2026-09-28',
    deadline: '2026-09-22',
    venue: 'Amazon Chime & Virtual Platform',
    eligibility: 'B.Tech CSE, IT, ECE · Min 7.5 CGPA · 0 backlogs',
    rounds: 'Amazon OA (DSA + Work Style), 3 Rounds of Technical Video Interviews',
    status: 'Completed',
    eligibleBranches: ['CSE', 'IT', 'ECE'],
    applicantsCount: 180,
    shortlistedCount: 42,
    selectedCount: 12,
    minCgpa: 7.5,
    description: 'Hiring for AWS Distributed Computing, Prime Video infrastructure, and Retail e-commerce checkout backend.',
  },
  {
    id: 'DRV-106',
    title: 'L&T Technology Core Graduate Engineer',
    company: 'L&T Technology Services',
    tier: 'Core',
    role: 'Graduate Engineer Trainee (GET)',
    ctc: '₹ 6.5 LPA',
    ctcNum: 6.5,
    driveDate: '2026-10-30',
    deadline: '2026-10-24',
    venue: 'Mechanical Workshop Hall & Placement Cell',
    eligibility: 'B.Tech MECH, CIVIL, EEE, ECE · Min 6.0 CGPA',
    rounds: 'Aptitude Test, Core Technical Round, Director Interview',
    status: 'Upcoming',
    eligibleBranches: ['MECH', 'CIVIL', 'EEE', 'ECE'],
    applicantsCount: 130,
    shortlistedCount: 40,
    selectedCount: 16,
    minCgpa: 6.0,
    description: 'Industrial automation, structural robotics, CAD/CAM simulation, and green energy infrastructure projects.',
  },
  {
    id: 'DRV-107',
    title: 'Deloitte Analyst - Consulting & Cyber',
    company: 'Deloitte USI',
    tier: 'Dream',
    role: 'Technology Analyst - Cloud Security',
    ctc: '₹ 9.2 LPA',
    ctcNum: 9.2,
    driveDate: '2026-10-12',
    deadline: '2026-10-09',
    venue: 'Campus Conference Hall & Zoom',
    eligibility: 'B.Tech All Branches · Min 7.0 CGPA · Excellent communication',
    rounds: 'Cognitive & Technical Assessment, Case Study Interview, Partner Round',
    status: 'Active',
    eligibleBranches: ['CSE', 'IT', 'ECE', 'EEE', 'MECH'],
    applicantsCount: 220,
    shortlistedCount: 65,
    selectedCount: 24,
    minCgpa: 7.0,
    description: 'Risk advisory, cybersecurity defense, cloud transformation, and enterprise architecture consulting.',
  },
  {
    id: 'DRV-108',
    title: 'Infosys Power Programmer & Specialist',
    company: 'Infosys',
    tier: 'Dream',
    role: 'Specialist Programmer (SP)',
    ctc: '₹ 9.5 LPA',
    ctcNum: 9.5,
    driveDate: '2026-09-18',
    deadline: '2026-09-12',
    venue: 'Virtual Platform (Infosys Springboard)',
    eligibility: 'B.Tech CSE, IT, ECE · Min 7.0 CGPA',
    rounds: 'InfyTQ Advanced Coding, Technical Interview, HR Round',
    status: 'Completed',
    eligibleBranches: ['CSE', 'IT', 'ECE'],
    applicantsCount: 165,
    shortlistedCount: 52,
    selectedCount: 18,
    minCgpa: 7.0,
    description: 'High-performance coding role working directly on deep-tech innovation labs, fintech platforms, and generative AI apps.',
  },
]

const defaultCompanies = [
  {
    id: 'CMP-01',
    name: 'Microsoft India',
    industry: 'Cloud & Enterprise Software',
    tier: 'Super Dream',
    hq: 'Hyderabad / Bengaluru / Redmond',
    contactPerson: 'Radhika Sharma',
    contactEmail: 'r.sharma@microsoft.com',
    contactPhone: '+91 98450 11223',
    website: 'https://careers.microsoft.com',
    mouSigned: true,
    pastHires: 36,
    avgPackage: '₹ 44.0 LPA',
    status: 'Active Partner',
    notes: 'Primary recruiter for Tier-1 coding talent. Prefers hands-on cloud projects.',
  },
  {
    id: 'CMP-02',
    name: 'Google',
    industry: 'Internet & Artificial Intelligence',
    tier: 'Super Dream',
    hq: 'Bengaluru / Mountain View',
    contactPerson: 'Arunav Sengupta',
    contactEmail: 'arunav.s@google.com',
    contactPhone: '+91 98200 44321',
    website: 'https://careers.google.com',
    mouSigned: true,
    pastHires: 18,
    avgPackage: '₹ 42.0 LPA',
    status: 'Active Partner',
    notes: 'Recruits annually for core SWE. Focuses on data structures and algorithms.',
  },
  {
    id: 'CMP-03',
    name: 'Amazon',
    industry: 'E-commerce & Cloud Computing',
    tier: 'Super Dream',
    hq: 'Hyderabad / Seattle',
    contactPerson: 'Deepika Nair',
    contactEmail: 'nairdeep@amazon.com',
    contactPhone: '+91 97411 88990',
    website: 'https://amazon.jobs',
    mouSigned: true,
    pastHires: 48,
    avgPackage: '₹ 32.0 LPA',
    status: 'Active Partner',
    notes: 'Regular on-campus visits. Emphasizes leadership principles and system scalability.',
  },
  {
    id: 'CMP-04',
    name: 'Qualcomm',
    industry: 'Semiconductors & Telecommunications',
    tier: 'Super Dream',
    hq: 'Hyderabad / San Diego',
    contactPerson: 'K. V. Subbarao',
    contactEmail: 'subbarao.kv@qualcomm.com',
    contactPhone: '+91 94401 55667',
    website: 'https://www.qualcomm.com/careers',
    mouSigned: true,
    pastHires: 24,
    avgPackage: '₹ 24.5 LPA',
    status: 'Active Partner',
    notes: 'Key partner for ECE & EEE embedded systems and FPGA design.',
  },
  {
    id: 'CMP-05',
    name: 'Deloitte USI',
    industry: 'Consulting & Technology Services',
    tier: 'Dream',
    hq: 'Hyderabad / New York',
    contactPerson: 'Farhan Akhtar',
    contactEmail: 'fa.recruiter@deloitte.com',
    contactPhone: '+91 99887 66554',
    website: 'https://www2.deloitte.com/careers',
    mouSigned: true,
    pastHires: 72,
    avgPackage: '₹ 9.2 LPA',
    status: 'Active Partner',
    notes: 'Multi-stream recruitment across CSE, IT, ECE, MECH for digital consulting.',
  },
  {
    id: 'CMP-06',
    name: 'Tata Consultancy Services',
    industry: 'IT Services & Consulting',
    tier: 'Dream',
    hq: 'Mumbai / Hyderabad',
    contactPerson: 'Sudhakar Rao',
    contactEmail: 'sudhakar.r@tcs.com',
    contactPhone: '+91 94900 22334',
    website: 'https://www.tcs.com/careers',
    mouSigned: true,
    pastHires: 180,
    avgPackage: '₹ 7.5 LPA',
    status: 'Active Partner',
    notes: 'Largest single recruiter. Offers Digital, Prime, and Ninja hiring bands.',
  },
  {
    id: 'CMP-07',
    name: 'L&T Technology Services',
    industry: 'Engineering R&D Services',
    tier: 'Core',
    hq: 'Vadodara / Chennai',
    contactPerson: 'B. Maheshwar',
    contactEmail: 'b.maheshwar@ltts.com',
    contactPhone: '+91 98334 11229',
    website: 'https://www.ltts.com/careers',
    mouSigned: true,
    pastHires: 55,
    avgPackage: '₹ 6.5 LPA',
    status: 'Active Partner',
    notes: 'Core recruiter for Mechanical, Civil, and Electrical streams.',
  },
  {
    id: 'CMP-08',
    name: 'Infosys',
    industry: 'IT Services & Digital Platforms',
    tier: 'Dream',
    hq: 'Bengaluru / Hyderabad',
    contactPerson: 'Sneha Kulkarni',
    contactEmail: 'sneha_k@infosys.com',
    contactPhone: '+91 98112 33445',
    website: 'https://www.infosys.com/careers',
    mouSigned: true,
    pastHires: 125,
    avgPackage: '₹ 9.5 LPA',
    status: 'Active Partner',
    notes: 'Specialist Programmer (SP) and Digital Specialist Engineer (DSE) hires.',
  },
]

const defaultApplications = [
  {
    id: 'APP-501',
    studentName: 'Venkata Sai Kumar',
    rollNo: '21B81A0501',
    branch: 'CSE',
    cgpa: 8.92,
    driveId: 'DRV-101',
    company: 'Microsoft India',
    role: 'Software Engineer - Cloud & AI',
    appliedDate: '2026-10-05',
    status: 'Shortlisted',
    email: 'saikumar.v@college.edu',
    phone: '+91 98765 43210',
    resumeUrl: 'Venkata_Sai_Resume.pdf',
    currentRound: 'Tech Round 1',
  },
  {
    id: 'APP-502',
    studentName: 'Kavitha Ranganathan',
    rollNo: '21B81A0518',
    branch: 'CSE',
    cgpa: 9.35,
    driveId: 'DRV-101',
    company: 'Microsoft India',
    role: 'Software Engineer - Cloud & AI',
    appliedDate: '2026-10-06',
    status: 'Shortlisted',
    email: 'kavitha.r@college.edu',
    phone: '+91 98765 43211',
    resumeUrl: 'Kavitha_R_Resume.pdf',
    currentRound: 'Tech Round 2',
  },
  {
    id: 'APP-503',
    studentName: 'Naveen Krishna M',
    rollNo: '21B81A0412',
    branch: 'ECE',
    cgpa: 8.45,
    driveId: 'DRV-104',
    company: 'Qualcomm',
    role: 'Firmware & Embedded Systems Engineer',
    appliedDate: '2026-10-08',
    status: 'Interviewing',
    email: 'naveen.k@college.edu',
    phone: '+91 98765 43212',
    resumeUrl: 'Naveen_Krishna_Resume.pdf',
    currentRound: 'System Architecture',
  },
  {
    id: 'APP-504',
    studentName: 'B. Harish Varma',
    rollNo: '21B81A1205',
    branch: 'IT',
    cgpa: 7.85,
    driveId: 'DRV-107',
    company: 'Deloitte USI',
    role: 'Technology Analyst - Cloud Security',
    appliedDate: '2026-10-07',
    status: 'Applied',
    email: 'harish.v@college.edu',
    phone: '+91 98765 43213',
    resumeUrl: 'Harish_Varma_Resume.pdf',
    currentRound: 'Aptitude Test',
  },
  {
    id: 'APP-505',
    studentName: 'Ananya Reddy',
    rollNo: '21B81A0512',
    branch: 'CSE',
    cgpa: 9.15,
    driveId: 'DRV-105',
    company: 'Amazon',
    role: 'Software Development Engineer - 1',
    appliedDate: '2026-09-20',
    status: 'Selected',
    email: 'ananya.r@college.edu',
    phone: '+91 98765 43214',
    resumeUrl: 'Ananya_Reddy_Resume.pdf',
    currentRound: 'Offer Released',
  },
  {
    id: 'APP-506',
    studentName: 'Rohit Balaji S',
    rollNo: '21B81A0322',
    branch: 'MECH',
    cgpa: 7.60,
    driveId: 'DRV-106',
    company: 'L&T Technology Services',
    role: 'Graduate Engineer Trainee (GET)',
    appliedDate: '2026-10-09',
    status: 'Applied',
    email: 'rohit.b@college.edu',
    phone: '+91 98765 43215',
    resumeUrl: 'Rohit_Balaji_Resume.pdf',
    currentRound: 'Aptitude Test',
  },
  {
    id: 'APP-507',
    studentName: 'Sanjay Dutt T',
    rollNo: '21B81A0589',
    branch: 'CSE',
    cgpa: 8.10,
    driveId: 'DRV-103',
    company: 'Tata Consultancy Services',
    role: 'Digital Engineer / Full Stack Developer',
    appliedDate: '2026-10-07',
    status: 'Interviewing',
    email: 'sanjay.d@college.edu',
    phone: '+91 98765 43216',
    resumeUrl: 'Sanjay_Dutt_Resume.pdf',
    currentRound: 'Tech Interview',
  },
  {
    id: 'APP-508',
    studentName: 'Sneha Madhav',
    rollNo: '21B81A0434',
    branch: 'ECE',
    cgpa: 8.70,
    driveId: 'DRV-104',
    company: 'Qualcomm',
    role: 'Firmware & Embedded Systems Engineer',
    appliedDate: '2026-10-08',
    status: 'Shortlisted',
    email: 'sneha.m@college.edu',
    phone: '+91 98765 43217',
    resumeUrl: 'Sneha_Madhav_Resume.pdf',
    currentRound: 'Tech Round 1',
  },
]

const defaultInterviews = [
  {
    id: 'INT-301',
    candidateName: 'Priya Nambiar',
    rollNo: '21B81A0545',
    branch: 'CSE',
    company: 'Qualcomm',
    role: 'Firmware & Embedded Systems Engineer',
    roundType: 'Technical Round 1',
    start: '2026-10-18T10:30',
    end: '2026-10-18T11:15',
    venue: 'Placement Cell Lab 2 & G-Meet',
    interviewer: 'K. Srinivasan (Sr. Firmware Lead)',
    meetLink: 'https://meet.google.com/xyz-qcom-plc',
    status: 'Scheduled',
    feedback: 'Scheduled for Linux kernel device driver questions',
  },
  {
    id: 'INT-302',
    candidateName: 'Venkata Sai Kumar',
    rollNo: '21B81A0501',
    branch: 'CSE',
    company: 'Microsoft India',
    role: 'Software Engineer - Cloud & AI',
    roundType: 'Technical Round 1',
    start: '2026-10-25T11:00',
    end: '2026-10-25T11:45',
    venue: 'Microsoft Teams Link',
    interviewer: 'Amitav Das (Azure Principal SWE)',
    meetLink: 'https://teams.microsoft.com/l/meetup-join/101',
    status: 'Scheduled',
    feedback: 'High scoring in preliminary OA (100% test cases)',
  },
  {
    id: 'INT-303',
    candidateName: 'Kavitha Ranganathan',
    rollNo: '21B81A0518',
    branch: 'CSE',
    company: 'Microsoft India',
    role: 'Software Engineer - Cloud & AI',
    roundType: 'Technical Round 2',
    start: '2026-10-25T14:00',
    end: '2026-10-25T15:00',
    venue: 'Microsoft Teams Link',
    interviewer: 'S. Chandrasekar (Partner Architect)',
    meetLink: 'https://teams.microsoft.com/l/meetup-join/102',
    status: 'Scheduled',
    feedback: 'System Design: Distributed Cache & Event Store',
  },
  {
    id: 'INT-304',
    candidateName: 'B. Harish Varma',
    rollNo: '21B81A1205',
    branch: 'IT',
    company: 'Deloitte USI',
    role: 'Technology Analyst - Cloud Security',
    roundType: 'Managerial Round',
    start: '2026-10-12T15:30',
    end: '2026-10-12T16:15',
    venue: 'Seminar Hall 2 & Zoom',
    interviewer: 'Deepak Joshi (Director, Cyber Risk)',
    meetLink: 'https://deloitte.zoom.us/j/988776655',
    status: 'Cleared',
    feedback: 'Strong grasp of ISO 27001 and cloud IAM policies. Recommended for offer.',
  },
  {
    id: 'INT-305',
    candidateName: 'Sanjay Dutt T',
    rollNo: '21B81A0589',
    branch: 'CSE',
    company: 'Tata Consultancy Services',
    role: 'Digital Engineer / Full Stack Developer',
    roundType: 'HR & Managerial',
    start: '2026-10-14T16:00',
    end: '2026-10-14T16:30',
    venue: 'Placement Interview Room 1',
    interviewer: 'P. Meenakshi (TCS Talent Acquisition)',
    meetLink: '—',
    status: 'Cleared',
    feedback: 'Clear communication, positive attitude, open to relocation.',
  },
]

const defaultOffers = [
  {
    id: 'OFR-201',
    studentName: 'Ananya Reddy',
    rollNo: '21B81A0512',
    branch: 'CSE',
    company: 'Amazon',
    role: 'Software Development Engineer - 1',
    ctc: '₹ 32.0 LPA',
    ctcNum: 32.0,
    offerDate: '2026-10-02',
    deadline: '2026-10-22',
    offerLetterRef: 'AMZ-HYD-2026-0419',
    status: 'Accepted',
    location: 'Hyderabad',
  },
  {
    id: 'OFR-202',
    studentName: 'M. Tarun Teja',
    rollNo: '21B81A0529',
    branch: 'CSE',
    company: 'Amazon',
    role: 'Software Development Engineer - 1',
    ctc: '₹ 32.0 LPA',
    ctcNum: 32.0,
    offerDate: '2026-10-02',
    deadline: '2026-10-22',
    offerLetterRef: 'AMZ-HYD-2026-0420',
    status: 'Accepted',
    location: 'Bengaluru',
  },
  {
    id: 'OFR-203',
    studentName: 'Sravani Gottipati',
    rollNo: '21B81A1211',
    branch: 'IT',
    company: 'Infosys',
    role: 'Specialist Programmer (SP)',
    ctc: '₹ 9.5 LPA',
    ctcNum: 9.5,
    offerDate: '2026-09-24',
    deadline: '2026-10-14',
    offerLetterRef: 'INFY-SP-2026-1082',
    status: 'Accepted',
    location: 'Pune',
  },
  {
    id: 'OFR-204',
    studentName: 'Rahul Dev Verma',
    rollNo: '21B81A0419',
    branch: 'ECE',
    company: 'Infosys',
    role: 'Specialist Programmer (SP)',
    ctc: '₹ 9.5 LPA',
    ctcNum: 9.5,
    offerDate: '2026-09-24',
    deadline: '2026-10-14',
    offerLetterRef: 'INFY-SP-2026-1083',
    status: 'Pending',
    location: 'Hyderabad',
  },
  {
    id: 'OFR-205',
    studentName: 'B. Harish Varma',
    rollNo: '21B81A1205',
    branch: 'IT',
    company: 'Deloitte USI',
    role: 'Technology Analyst - Cloud Security',
    ctc: '₹ 9.2 LPA',
    ctcNum: 9.2,
    offerDate: '2026-10-13',
    deadline: '2026-10-30',
    offerLetterRef: 'DEL-USI-2026-8841',
    status: 'Accepted',
    location: 'Hyderabad',
  },
  {
    id: 'OFR-206',
    studentName: 'Sanjay Dutt T',
    rollNo: '21B81A0589',
    branch: 'CSE',
    company: 'Tata Consultancy Services',
    role: 'Digital Engineer / Full Stack Developer',
    ctc: '₹ 7.5 LPA',
    ctcNum: 7.5,
    offerDate: '2026-10-15',
    deadline: '2026-10-29',
    offerLetterRef: 'TCS-DIG-2026-9041',
    status: 'Accepted',
    location: 'Chennai',
  },
]


return { default: PlacementWorkspace }
})()

export const CampusWorkspace = CampusWorkspaceScreen.default
export { default as LibraryWorkspace } from './LibraryWorkspace'
export function MeetingsEventsWorkspace() {
  const a = AcademicContextImports_useAcademic(); const Screen = MeetingsEventsWorkspaceScreen.default; return <Screen key={`${a.selectedCollegeId}:${a.selectedAcademicYearId}`} /> }
export function PlacementWorkspace() {
  const a = AcademicContextImports_useAcademic(); const Screen = PlacementWorkspaceScreen.default; return <Screen key={`${a.selectedCollegeId}:${a.selectedAcademicYearId}`} /> }
export default CampusWorkspace
