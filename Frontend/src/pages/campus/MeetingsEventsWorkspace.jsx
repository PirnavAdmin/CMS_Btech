import { useState, useMemo, useEffect } from 'react'
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUser,
  FiUsers,
  FiCheckCircle,
  FiPlus,
  FiSearch,
  FiGrid,
  FiList,
  FiTrash2,
  FiEdit2,
  FiActivity,
  FiCheckSquare,
  FiX
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import FilterPanel from '../../components/FilterPanel'
import TablePagination from '../../components/TablePagination'
import { useAcademic } from '../../context/AcademicContext'
import {
  defaultMeetings,
  defaultEvents,
  defaultRegistrations,
  defaultAttendance,
  defaultMinutes,
} from './sampleMeetingsEvents'
import './MeetingsEventsWorkspace.css'

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

export default function MeetingsEventsWorkspace() {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  const scope = `${selectedCollegeId || '1'}:${selectedAcademicYearId || '1'}`
  const storageKey = `cms-meetings-events-data:${scope}`

  // Persistent state per college & academic year
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      meetings: defaultMeetings,
      events: defaultEvents,
      registrations: defaultRegistrations,
      attendance: defaultAttendance,
      minutes: defaultMinutes,
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      // ignore quota
    }
  }, [data, storageKey])

  // Active tab: 'meetings' | 'events' | 'registrations' | 'attendance' | 'minutes'
  const [activeTab, setActiveTab] = useState('meetings')
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
  const actionItemsCompleted = data.minutes.filter(m => m.completed).length
  const actionItemsTotal = data.minutes.length
  const actionRate = actionItemsTotal ? Math.round((actionItemsCompleted / actionItemsTotal) * 100) : 100

  // Filtered dataset for active tab
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    if (activeTab === 'meetings') {
      return data.meetings.filter(item => {
        const matchQ = !q || item.title.toLowerCase().includes(q) || item.venue.toLowerCase().includes(q) || item.organizer.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter
        return matchQ && matchStatus && matchCat
      })
    }

    if (activeTab === 'events') {
      return data.events.filter(item => {
        const matchQ = !q || item.title.toLowerCase().includes(q) || item.venue.toLowerCase().includes(q) || item.organizer.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter
        return matchQ && matchStatus && matchCat
      })
    }

    if (activeTab === 'registrations') {
      return data.registrations.filter(item => {
        const matchQ = !q || item.studentName.toLowerCase().includes(q) || item.rollNumber.toLowerCase().includes(q) || item.eventTitle.toLowerCase().includes(q) || item.department.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        return matchQ && matchStatus
      })
    }

    if (activeTab === 'attendance') {
      return data.attendance.filter(item => {
        const matchQ = !q || item.participantName.toLowerCase().includes(q) || item.activityTitle.toLowerCase().includes(q) || item.department.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        return matchQ && matchStatus
      })
    }

    if (activeTab === 'minutes') {
      return data.minutes.filter(item => {
        const matchQ = !q || item.meetingTitle.toLowerCase().includes(q) || item.actionItem.toLowerCase().includes(q) || item.owner.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || (statusFilter === 'COMPLETED' ? item.completed : !item.completed)
        return matchQ && matchStatus
      })
    }

    return []
  }, [activeTab, data, searchQuery, statusFilter, categoryFilter])

  // Paginated dataset
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  // Current export columns
  const currentExportColumns = useMemo(() => {
    switch (activeTab) {
      case 'meetings': return meetingExportColumns
      case 'events': return eventExportColumns
      case 'registrations': return registrationExportColumns
      case 'attendance': return attendanceExportColumns
      case 'minutes': return minuteExportColumns
      default: return []
    }
  }, [activeTab])

  // Open modal for Create or Edit
  const openCreateModal = (type) => {
    setModalType(type)
    setEditingItem(null)
    if (type === 'meeting') {
      setFormData({
        title: '',
        category: 'Academic Council',
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
        start: new Date().toISOString().slice(0, 16),
        end: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        venue: '',
        organizer: '',
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
        rollNumber: '',
        department: 'Computer Science and Engineering',
        year: '3rd Year',
        status: 'Confirmed',
        ticketCode: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      })
    } else if (type === 'minute') {
      setFormData({
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
    setModalType(type)
    setEditingItem(item)
    setFormData({ ...item })
    setModalOpen(true)
  }

  const handleSaveModal = (e) => {
    e.preventDefault()
    if (modalType === 'meeting') {
      const itemToSave = {
        ...formData,
        id: editingItem ? editingItem.id : `meet-${Date.now()}`,
      }
      setData(prev => ({
        ...prev,
        meetings: editingItem
          ? prev.meetings.map(m => m.id === editingItem.id ? itemToSave : m)
          : [itemToSave, ...prev.meetings],
      }))
      setNotice(`Meeting "${itemToSave.title}" ${editingItem ? 'updated' : 'scheduled'} successfully.`)
    } else if (modalType === 'event') {
      const itemToSave = {
        ...formData,
        id: editingItem ? editingItem.id : `evt-${Date.now()}`,
        capacity: Number(formData.capacity) || 100,
        registeredCount: Number(formData.registeredCount) || 0,
      }
      setData(prev => ({
        ...prev,
        events: editingItem
          ? prev.events.map(ev => ev.id === editingItem.id ? itemToSave : ev)
          : [itemToSave, ...prev.events],
      }))
      setNotice(`Event "${itemToSave.title}" ${editingItem ? 'updated' : 'created'} successfully.`)
    } else if (modalType === 'registration') {
      const targetEvent = data.events.find(ev => ev.id === formData.eventId)
      const itemToSave = {
        ...formData,
        id: editingItem ? editingItem.id : `reg-${Date.now()}`,
        eventTitle: targetEvent ? targetEvent.title : formData.eventTitle,
        registeredAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      }
      setData(prev => ({
        ...prev,
        registrations: editingItem
          ? prev.registrations.map(r => r.id === editingItem.id ? itemToSave : r)
          : [itemToSave, ...prev.registrations],
      }))
      setNotice(`Participant "${itemToSave.studentName}" registered successfully.`)
    } else if (modalType === 'minute') {
      const itemToSave = {
        ...formData,
        id: editingItem ? editingItem.id : `mom-${Date.now()}`,
      }
      setData(prev => ({
        ...prev,
        minutes: editingItem
          ? prev.minutes.map(m => m.id === editingItem.id ? itemToSave : m)
          : [itemToSave, ...prev.minutes],
      }))
      setNotice(`Action item "${itemToSave.actionItem.slice(0, 30)}..." saved.`)
    }

    setModalOpen(false)
    setTimeout(() => setNotice(''), 4000)
  }

  // Request Delete with popup
  const requestDelete = (id, type, title) => {
    setDeleteTarget({ id, type, title })
  }

  // Confirm delete from popup
  const confirmDelete = () => {
    if (!deleteTarget) return
    const { id, type, title } = deleteTarget
    if (type === 'meeting') {
      setData(prev => ({ ...prev, meetings: prev.meetings.filter(m => m.id !== id) }))
    } else if (type === 'event') {
      setData(prev => ({ ...prev, events: prev.events.filter(ev => ev.id !== id) }))
    } else if (type === 'registration') {
      setData(prev => ({ ...prev, registrations: prev.registrations.filter(r => r.id !== id) }))
    } else if (type === 'attendance') {
      setData(prev => ({ ...prev, attendance: prev.attendance.filter(a => a.id !== id) }))
    } else if (type === 'minute') {
      setData(prev => ({ ...prev, minutes: prev.minutes.filter(m => m.id !== id) }))
    }
    setDeleteTarget(null)
    setNotice(`"${title || 'Record'}" deleted successfully.`)
    setTimeout(() => setNotice(''), 4000)
  }

  // Direct attendance status setter
  const handleSetAttendanceStatus = (attId, newStatus) => {
    setData(prev => ({
      ...prev,
      attendance: prev.attendance.map(a => {
        if (a.id !== attId) return a
        const checkIn = newStatus === 'Present' || newStatus === 'Late'
          ? (a.checkInTime && a.checkInTime !== '—' ? a.checkInTime : new Date().toISOString().slice(0, 16).replace('T', ' '))
          : '—'
        return { ...a, status: newStatus, checkInTime: checkIn }
      }),
    }))
  }

  const markAllAttendance = (statusToSet) => {
    setData(prev => ({
      ...prev,
      attendance: prev.attendance.map(a => {
        const checkIn = statusToSet === 'Present' || statusToSet === 'Late'
          ? new Date().toISOString().slice(0, 16).replace('T', ' ')
          : '—'
        return { ...a, status: statusToSet, checkInTime: checkIn }
      }),
    }))
    setNotice(`All participants marked as "${statusToSet}".`)
    setTimeout(() => setNotice(''), 4000)
  }

  // Quick 1-click toggle action item completed
  const toggleActionItemDone = (minId) => {
    setData(prev => ({
      ...prev,
      minutes: prev.minutes.map(m => {
        if (m.id !== minId) return m
        return { ...m, completed: !m.completed }
      }),
    }))
  }

  // Helper date formatter
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
    <DashboardLayout>
      <div className="mew-workspace">
        {/* Page Header (Stats in right top corner compactSummary) */}
        <PageHeader
          title="Meetings & Campus Events"
          subtitle="Plan institutional council meets, manage campus hackathons & fests, monitor check-in attendance, and track action minutes."
          breadcrumb={[
            { label: 'Digital Campus', link: '/meetings-events' },
            'Meetings & Events'
          ]}
          compactSummary={[
            { label: 'Scheduled Gatherings', value: totalScheduled },
            { label: 'Upcoming This Month', value: upcomingCount },
            { label: 'Total Registrations', value: totalRegistrations },
            { label: 'MoM Resolution', value: `${actionRate}%` },
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
              className={activeTab === 'meetings' ? 'active' : ''}
              onClick={() => handleSwitchTab('meetings')}
            >
              <FiCalendar />
              <span>Meetings</span>
              <span className="mew-badge-count">{data.meetings.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'events' ? 'active' : ''}
              onClick={() => handleSwitchTab('events')}
            >
              <FiActivity />
              <span>Events</span>
              <span className="mew-badge-count">{data.events.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'registrations' ? 'active' : ''}
              onClick={() => handleSwitchTab('registrations')}
            >
              <FiUsers />
              <span>Registrations</span>
              <span className="mew-badge-count">{data.registrations.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'attendance' ? 'active' : ''}
              onClick={() => handleSwitchTab('attendance')}
            >
              <FiClock />
              <span>Attendance & Check-in</span>
              <span className="mew-badge-count">{data.attendance.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'minutes' ? 'active' : ''}
              onClick={() => handleSwitchTab('minutes')}
            >
              <FiCheckSquare />
              <span>Minutes & Actions</span>
              <span className="mew-badge-count">{data.minutes.length}</span>
            </button>
          </nav>

          <div className="mew-actions">
            {activeTab === 'meetings' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('meeting')}
              >
                <FiPlus /> Schedule Meeting
              </button>
            )}

            {activeTab === 'events' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('event')}
              >
                <FiPlus /> Create Event
              </button>
            )}

            {activeTab === 'registrations' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('registration')}
              >
                <FiPlus /> Register Participant
              </button>
            )}

            {activeTab === 'minutes' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('minute')}
              >
                <FiPlus /> Add Action Item
              </button>
            )}

            {activeTab === 'attendance' && (
              <>
                <button
                  type="button"
                  className="grm-button grm-button--secondary"
                  onClick={() => markAllAttendance('Present')}
                  title="Mark all participants as Present"
                >
                  ✓ Mark All Present
                </button>
                <button
                  type="button"
                  className="grm-button grm-button--secondary"
                  onClick={() => markAllAttendance('Absent')}
                  title="Mark all participants as Absent"
                >
                  ✗ Mark All Absent
                </button>
              </>
            )}

            {/* Standard ERP ExportMenu component with CSV and Print / PDF options */}
            <ExportMenu
              rows={filteredList}
              columns={currentExportColumns}
              filename={`meetings_events_${activeTab}`}
              title={`Meetings & Events - ${activeTab.toUpperCase()}`}
            />
          </div>
        </div>

        {/* Standard ERP Collapsible Filter Panel with 'Filters' button */}
        <FilterPanel
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
                <select
                  className="mew-filter-select"
                  style={{ minWidth: '60px', height: '34px', padding: '0 6px' }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
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
            <select
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
            </select>

            {/* Category Filter for Meetings & Events */}
            {(activeTab === 'meetings' || activeTab === 'events') && (
              <select
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
                  </>
                )}
              </select>
            )}
          </div>
        </FilterPanel>

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
                  {/* Meeting Form */}
                  {modalType === 'meeting' && (
                    <>
                      <label className="mew-form-field">
                        Meeting Title *
                        <input
                          type="text"
                          required
                          value={formData.title || ''}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Department Faculty Council Meeting"
                        />
                      </label>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Category
                          <select
                            value={formData.category || 'Academic Council'}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                          >
                            <option value="Academic Council">Academic Council</option>
                            <option value="Department">Department Review</option>
                            <option value="Committee">Discipline / Committee</option>
                            <option value="Industry Relations">Industry Relations</option>
                            <option value="IQAC">IQAC</option>
                          </select>
                        </label>

                        <label className="mew-form-field">
                          Target Audience
                          <select
                            value={formData.audience || 'Faculty'}
                            onChange={e => setFormData({ ...formData, audience: e.target.value })}
                          >
                            <option value="Faculty">Faculty Only</option>
                            <option value="Students">Students Only</option>
                            <option value="Both">Both Faculty & Students</option>
                          </select>
                        </label>
                      </div>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Starts At *
                          <input
                            type="datetime-local"
                            required
                            value={formData.start || ''}
                            onChange={e => setFormData({ ...formData, start: e.target.value })}
                          />
                        </label>

                        <label className="mew-form-field">
                          Ends At *
                          <input
                            type="datetime-local"
                            required
                            value={formData.end || ''}
                            onChange={e => setFormData({ ...formData, end: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Venue / Room *
                          <input
                            type="text"
                            required
                            value={formData.venue || ''}
                            onChange={e => setFormData({ ...formData, venue: e.target.value })}
                            placeholder="e.g. Seminar Hall 1, CSE Block"
                          />
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
                          value={formData.title || ''}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. TechNovation 2026: 36-Hr Hackathon"
                        />
                      </label>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Category
                          <select
                            value={formData.category || 'Technical'}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                          >
                            <option value="Technical">Technical</option>
                            <option value="Workshop">Workshop</option>
                            <option value="Career">Career / Placement</option>
                            <option value="Networking">Networking / Alumni</option>
                            <option value="Sports">Sports</option>
                          </select>
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
                          Starts At *
                          <input
                            type="datetime-local"
                            required
                            value={formData.start || ''}
                            onChange={e => setFormData({ ...formData, start: e.target.value })}
                          />
                        </label>

                        <label className="mew-form-field">
                          Ends At *
                          <input
                            type="datetime-local"
                            required
                            value={formData.end || ''}
                            onChange={e => setFormData({ ...formData, end: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="mew-form-row">
                        <label className="mew-form-field">
                          Venue *
                          <input
                            type="text"
                            required
                            value={formData.venue || ''}
                            onChange={e => setFormData({ ...formData, venue: e.target.value })}
                            placeholder="e.g. Main Auditorium"
                          />
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
                    <>
                      <label className="mew-form-field">
                        Select Campus Event *
                        <select
                          required
                          value={formData.eventId || ''}
                          onChange={e => setFormData({ ...formData, eventId: e.target.value })}
                        >
                          {data.events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                          ))}
                        </select>
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
                          <select
                            value={formData.department || 'Computer Science and Engineering'}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                          >
                            <option value="Computer Science and Engineering">CSE</option>
                            <option value="Electronics and Communication Engineering">ECE</option>
                            <option value="Electrical and Electronics Engineering">EEE</option>
                            <option value="Mechanical Engineering">MECH</option>
                            <option value="Civil Engineering">CIVIL</option>
                            <option value="Information Technology">IT</option>
                          </select>
                        </label>

                        <label className="mew-form-field">
                          Year of Study
                          <select
                            value={formData.year || '3rd Year'}
                            onChange={e => setFormData({ ...formData, year: e.target.value })}
                          >
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </select>
                        </label>
                      </div>
                    </>
                  )}

                  {/* Minutes Form */}
                  {modalType === 'minute' && (
                    <>
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
                          <select
                            value={formData.priority || 'High'}
                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
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
                  <button
                    type="button"
                    className="grm-button"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="grm-button grm-button--primary"
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
                  className="grm-button"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="grm-button mew-btn-delete-confirm"
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
