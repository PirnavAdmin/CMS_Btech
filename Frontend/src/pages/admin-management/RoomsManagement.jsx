import { useState, useEffect, useMemo } from 'react'
import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiX,
  FiEye,
  FiCheck,
  FiHome,
  FiUsers,
  FiLayers,
  FiInfo,
  FiCheckCircle,
  FiBookmark,
  FiLink,
  FiUnlock,
  FiCpu,
  FiMonitor,
  FiMapPin,
  FiAlertTriangle,
  FiSlash,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import SearchableSelect from '../../components/SearchableSelect'
import { sectionApi, sectionAssignmentApi } from '../../api/apiEndpoints'
import roomService, {
  ROOM_TYPES,
  BUILDING_BLOCKS,
  FLOORS,
  ROOM_FACILITIES,
} from '../../services/roomService'
import { showSuccess, showError } from '../../utils/toast'
import './RoomsManagement.css'

// Export column definitions for ExportMenu
const roomExportColumns = [
  { label: 'Room Number', value: (r) => r.roomNumber },
  { label: 'Room Name', value: (r) => r.roomName },
  { label: 'Room Type', value: (r) => r.roomType },
  { label: 'Building Block', value: (r) => r.buildingBlock },
  { label: 'Floor Level', value: (r) => r.floor },
  { label: 'Capacity', value: (r) => r.capacity },
  { label: 'Allocated Section', value: (r) => r.assignedSection || 'None (Available)' },
  { label: 'Status', value: (r) => r.status },
  { label: 'Facilities', value: (r) => (r.facilities || []).join(', ') },
  { label: 'Remarks / Notes', value: (r) => r.description || '' },
]

export default function RoomsManagement() {
  const [rooms, setRooms] = useState([])
  const [sections, setSections] = useState([])
  const [assignments, setAssignments] = useState([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [viewingRoom, setViewingRoom] = useState(null)
  const [allocatingRoom, setAllocatingRoom] = useState(null)
  const [selectedSectionName, setSelectedSectionName] = useState('')
  const [deletingRoom, setDeletingRoom] = useState(null)
  const [deallocatingRoom, setDeallocatingRoom] = useState(null)

  // Load Rooms, Sections, and Student Assignments
  const loadRooms = () => {
    const list = roomService.getRooms()
    setRooms(list)
  }

  const loadData = async () => {
    try {
      const [secData, assignData] = await Promise.all([
        sectionApi.getAll().catch(() => []),
        sectionAssignmentApi.list().catch(() => []),
      ])
      if (Array.isArray(secData)) setSections(secData)
      if (Array.isArray(assignData)) setAssignments(assignData)
    } catch {
      setSections([])
      setAssignments([])
    }
  }

  useEffect(() => {
    loadRooms()
    loadData()
  }, [])

  // Section Student Count Map
  const sectionStudentCountMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(assignments)) {
      assignments.forEach((a) => {
        const secId = String(a.sectionId || a.section_id || '')
        if (secId) map.set(secId, (map.get(secId) || 0) + 1)
      })
    }
    if (Array.isArray(sections)) {
      sections.forEach((s) => {
        const id = String(s.id || s.sectionId || '')
        const name = String(s.sectionName || s.name || '').trim()
        const count = Math.max(
          map.get(id) || 0,
          Number(s.currentStrength ?? s.assignedStudents ?? s.studentCount ?? 0)
        )
        if (id) map.set(id, count)
        if (name) map.set(name, count)
      })
    }
    return map
  }, [assignments, sections])

  // Section Meta Map (Course, Branch, Semester Details)
  const sectionMetaMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(sections)) {
      sections.forEach((s) => {
        const name = String(s.sectionName || s.name || '').trim()
        const id = String(s.id || s.sectionId || '')
        const rawCourse = s.courseCode || s.courseName || s.course || ''
        const rawBranch = s.branchCode || s.branchName || s.branch || ''
        const sem = s.semesterName || s.semester || (s.semesterNumber ? `Sem ${s.semesterNumber}` : '')

        // Clean compact display (e.g. B.Tech • ECE • Sem 1)
        const compactCourse = /bachelor of technology/i.test(rawCourse) ? 'B.Tech' : rawCourse
        let compactBranch = rawBranch
        if (/electronics and communication/i.test(rawBranch)) compactBranch = 'ECE'
        else if (/computer science/i.test(rawBranch)) compactBranch = 'CSE'
        else if (/mechanical/i.test(rawBranch)) compactBranch = 'ME'
        else if (/civil/i.test(rawBranch)) compactBranch = 'Civil'
        else if (/electrical and electronics/i.test(rawBranch)) compactBranch = 'EEE'
        else if (/information technology/i.test(rawBranch)) compactBranch = 'IT'
        else if (/artificial intelligence/i.test(rawBranch)) compactBranch = 'AI&ML'

        const metaStr = [compactCourse, compactBranch, sem].filter(Boolean).join(' • ')
        const fullTitle = [s.courseName || rawCourse, s.branchName || rawBranch, sem].filter(Boolean).join(' • ')

        const info = {
          id,
          name,
          code: s.sectionCode || s.code || '',
          course: compactCourse,
          branch: compactBranch,
          sem,
          metaStr,
          fullTitle,
          capacity: s.capacity,
        }
        if (name) map.set(name.toLowerCase(), info)
        if (id) map.set(id, info)
      })
    }
    return map
  }, [sections])

  // Filtered Records
  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rooms.filter((r) => {
      const secMeta = r.assignedSection ? sectionMetaMap.get(r.assignedSection.toLowerCase()) : null
      const secMetaText = secMeta ? `${secMeta.course} ${secMeta.branch} ${secMeta.sem}`.toLowerCase() : ''

      const matchesSearch =
        !q ||
        (r.roomNumber && r.roomNumber.toLowerCase().includes(q)) ||
        (r.roomName && r.roomName.toLowerCase().includes(q)) ||
        (r.buildingBlock && r.buildingBlock.toLowerCase().includes(q)) ||
        (r.floor && r.floor.toLowerCase().includes(q)) ||
        (r.roomType && r.roomType.toLowerCase().includes(q)) ||
        (r.assignedSection && r.assignedSection.toLowerCase().includes(q)) ||
        secMetaText.includes(q)

      const matchesType = !typeFilter || r.roomType === typeFilter
      const matchesBlock = !blockFilter || r.buildingBlock === blockFilter
      const matchesStatus = !statusFilter || r.status === statusFilter

      return matchesSearch && matchesType && matchesBlock && matchesStatus
    })
  }, [rooms, query, typeFilter, blockFilter, statusFilter, sectionMetaMap])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE))
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRooms.slice(start, start + PAGE_SIZE)
  }, [filteredRooms, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [query, typeFilter, blockFilter, statusFilter])

  // Header Compact Summary
  const compactSummaryItems = useMemo(() => {
    const total = rooms.length
    const available = rooms.filter((r) => r.status === 'Available').length
    const allocated = rooms.filter((r) => r.status === 'Allocated' || r.assignedSection).length
    const labs = rooms.filter((r) => /lab|workshop/i.test(r.roomType)).length

    return [
      { label: 'TOTAL', value: total, tone: 'default' },
      { label: 'AVAILABLE', value: available, tone: 'active' },
      { label: 'ALLOCATED', value: allocated, tone: 'upcoming' },
      { label: 'LABS', value: labs, tone: 'default' },
    ]
  }, [rooms])

  // Helper to generate section dropdown options without allowing double-allocation
  const getSectionDropdownOptions = (currentRoomId) => {
    // Collect sections already assigned to other rooms
    const otherAllocatedMap = new Map()
    rooms.forEach((r) => {
      if (r.id !== currentRoomId && r.assignedSection) {
        otherAllocatedMap.set(r.assignedSection.trim().toLowerCase(), r.roomNumber)
      }
    })

    return sections
      .filter((s) => s.status !== 'Inactive' && s.status !== 0 && s.status !== false && s.isActive !== false)
      .map((s) => {
      const name = s.sectionName || s.name || `Section ${s.id}`
      const code = s.sectionCode || s.code || ''
      const branch = s.branchName || s.branch || ''
      const course = s.courseName || s.course || ''
      const sem = s.semesterName || s.semester || (s.semesterNumber ? `Sem ${s.semesterNumber}` : '')
      const count = sectionStudentCountMap.get(name) || sectionStudentCountMap.get(String(s.id)) || 0
      const allocatedRoomNum = otherAllocatedMap.get(name.trim().toLowerCase())

      const details = [course, branch, sem].filter(Boolean).join(' • ')
      const isAlreadyAllocated = Boolean(allocatedRoomNum)

      return {
        id: name,
        value: name,
        name: isAlreadyAllocated
          ? `${name} ${code ? `(${code})` : ''} — ${details} [${count} Students] (Already Allocated to ${allocatedRoomNum})`
          : `${name} ${code ? `(${code})` : ''} — ${details} [${count} Students]`,
        code: details || 'Section',
        disabled: isAlreadyAllocated,
      }
    })
  }

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingRoom({
      id: '',
      roomNumber: '',
      roomName: '',
      buildingBlock: BUILDING_BLOCKS[0] || 'Main Academic Block',
      floor: FLOORS[0] || 'Ground Floor',
      roomType: ROOM_TYPES[0] || 'Theory Classroom',
      capacity: 60,
      facilities: ['Projector & Screen', 'High-Speed WiFi', 'Audio Amplification'],
      department: 'General / Shared',
      status: 'Available',
      assignedSection: '',
      description: '',
    })
    setIsFormOpen(true)
  }

  const handleOpenEdit = (room) => {
    setEditingRoom({
      ...room,
      facilities: Array.isArray(room.facilities) ? [...room.facilities] : [],
    })
    setIsFormOpen(true)
  }

  const handleToggleFacility = (facility) => {
    setEditingRoom((prev) => {
      if (!prev) return prev
      const current = prev.facilities || []
      const exists = current.includes(facility)
      return {
        ...prev,
        facilities: exists ? current.filter((f) => f !== facility) : [...current, facility],
      }
    })
  }

  const handleSaveRoom = (e) => {
    e.preventDefault()
    if (!editingRoom.roomNumber?.trim()) return showError('Please enter a room number or code.')
    if (!editingRoom.roomName?.trim()) return showError('Please enter a room display name.')
    if (!editingRoom.buildingBlock) return showError('Please select a building block.')
    if (!editingRoom.floor) return showError('Please select a floor.')
    if (!editingRoom.roomType) return showError('Please select a room type.')
    if (!editingRoom.status) return showError('Please select room availability status.')

    // Rule 1: Prevent double allocation of the same section to multiple rooms
    if (editingRoom.assignedSection) {
      const conflictRoom = rooms.find(
        (r) => r.id !== editingRoom.id && r.assignedSection?.trim().toLowerCase() === editingRoom.assignedSection?.trim().toLowerCase()
      )
      if (conflictRoom) {
        return showError(
          `Cannot allocate section "${editingRoom.assignedSection}": It is already assigned to room "${conflictRoom.roomNumber} (${conflictRoom.roomName})". A section can only have one assigned classroom.`
        )
      }
    }

    // Rule 2: Cannot set room to Inactive/Maintenance if assigned section has active enrolled students
    if (editingRoom.assignedSection && (editingRoom.status === 'Inactive' || editingRoom.status === 'Maintenance')) {
      const studentCount = sectionStudentCountMap.get(editingRoom.assignedSection) || 0
      if (studentCount > 0) {
        return showError(
          `Cannot deactivate room: Section "${editingRoom.assignedSection}" currently has ${studentCount} enrolled student${studentCount === 1 ? '' : 's'}. Please reallocate or transfer the section first.`
        )
      }
    }

    try {
      if (editingRoom.id) {
        roomService.updateRoom(editingRoom.id, editingRoom)
        showSuccess(`Room "${editingRoom.roomNumber}" updated successfully.`)
      } else {
        roomService.createRoom(editingRoom)
        showSuccess(`Room "${editingRoom.roomNumber}" created successfully.`)
      }
      setIsFormOpen(false)
      setEditingRoom(null)
      loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to save room.')
    }
  }

  // Delete Room via Modal
  const handleConfirmDeleteRoom = () => {
    if (!deletingRoom) return
    if (deletingRoom.assignedSection && deletingRoom.assignedSection.trim()) {
      const studentCount = sectionStudentCountMap.get(deletingRoom.assignedSection) || 0
      return showError(
        `Cannot delete room "${deletingRoom.roomNumber}": Section "${deletingRoom.assignedSection}" is currently allocated to this room${studentCount > 0 ? ` (${studentCount} students)` : ''}. Please deallocate or transfer the section first.`
      )
    }
    try {
      roomService.deleteRoom(deletingRoom.id)
      showSuccess(`Room "${deletingRoom.roomNumber} - ${deletingRoom.roomName}" deleted successfully.`)
      setDeletingRoom(null)
      loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to delete room.')
    }
  }

  // Quick Allocation Handlers
  const handleOpenAllocate = (room) => {
    setAllocatingRoom(room)
    setSelectedSectionName(room.assignedSection || '')
  }

  const handleSaveAllocation = (e) => {
    e.preventDefault()
    if (!allocatingRoom) return

    // Rule: Prevent double allocation of the same section to multiple rooms
    if (selectedSectionName) {
      const conflictRoom = rooms.find(
        (r) => r.id !== allocatingRoom.id && r.assignedSection?.trim().toLowerCase() === selectedSectionName.trim().toLowerCase()
      )
      if (conflictRoom) {
        return showError(
          `Section "${selectedSectionName}" is already allocated to Room "${conflictRoom.roomNumber} (${conflictRoom.roomName})". Please choose an unallocated section.`
        )
      }
    }

    try {
      roomService.allocateRoom(allocatingRoom.id, selectedSectionName)
      showSuccess(
        selectedSectionName
          ? `Room "${allocatingRoom.roomNumber}" allocated to "${selectedSectionName}".`
          : `Room "${allocatingRoom.roomNumber}" is now unallocated and available.`
      )
      setAllocatingRoom(null)
      loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to update section allocation.')
    }
  }

  // Deallocate Room via Modal
  const handleConfirmDeallocate = () => {
    if (!deallocatingRoom) return
    try {
      roomService.allocateRoom(deallocatingRoom.id, '')
      showSuccess(`Room "${deallocatingRoom.roomNumber}" is now unallocated and available.`)
      setDeallocatingRoom(null)
      loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to free room.')
    }
  }

  const clearFilters = () => {
    setQuery('')
    setTypeFilter('')
    setBlockFilter('')
    setStatusFilter('')
  }

  const getRoomIcon = (type) => {
    const t = String(type || '').toLowerCase()
    if (t.includes('computer') || t.includes('computing')) return FiMonitor
    if (t.includes('electronic') || t.includes('dsp') || t.includes('vlsi')) return FiCpu
    if (t.includes('lab') || t.includes('workshop')) return FiLayers
    if (t.includes('seminar') || t.includes('auditorium')) return FiBookmark
    return FiHome
  }

  return (
    <DashboardLayout>
      <div className="rooms-page">
        {/* Page Header with Compact Top-Right Summary */}
        <PageHeader
          title="Rooms & Classrooms Management"
          subtitle="Manage campus classrooms, lecture halls, laboratories, seating capacities, and allocate sections to rooms."
          compactSummary={compactSummaryItems}
        />

        {/* Main Directory Card */}
        <div className="erp-directory-card rooms-directory-card">
          <div className="course-directory-heading rooms-heading">
            <div className="rooms-heading-left">
              <div className="rooms-heading-icon">
                <FiGrid />
              </div>
              <div>
                <span className="cm-eyebrow">CAMPUS SPATIAL DIRECTORY</span>
                <h2>Classrooms & Facilities</h2>
                <p>{filteredRooms.length} room{filteredRooms.length === 1 ? '' : 's'} configured in directory</p>
              </div>
            </div>
            <div className="directory-export-actions">
              <ExportMenu
                rows={filteredRooms}
                columns={roomExportColumns}
                filename="rooms_directory"
                title="Classrooms & Spatial Directory"
              />
              <button
                type="button"
                className="rooms-add-btn"
                onClick={handleOpenCreate}
              >
                <FiPlus /> Add Room / Classroom
              </button>
            </div>
          </div>

          {/* Controls Toolbar */}
          <div className="course-toolbar rooms-toolbar">
            <div className="sa-search rooms-search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                placeholder="Search room number, name, block, floor, section, branch, course..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="rooms-clear-search" onClick={() => setQuery('')}>
                  <FiX />
                </button>
              )}
            </div>

            <div className="rooms-filters-group">
              <select
                className="rooms-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Room Types</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                className="rooms-filter"
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
              >
                <option value="">All Building Blocks</option>
                {BUILDING_BLOCKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                className="rooms-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Allocated">Allocated</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>

              {(query || typeFilter || blockFilter || statusFilter) && (
                <button type="button" className="rooms-clear-btn" onClick={clearFilters}>
                  <FiFilter /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Rooms Data Table */}
          <div className="rooms-table-wrap">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th className="table-center" style={{ minWidth: '220px' }}>Room Identity & Name</th>
                  <th className="table-center" style={{ minWidth: '140px' }}>Room Type</th>
                  <th className="table-center" style={{ minWidth: '170px' }}>Building & Floor</th>
                  <th className="table-center" style={{ minWidth: '90px' }}>Capacity</th>
                  <th className="table-center" style={{ minWidth: '240px' }}>Section Allocation & Details</th>
                  <th className="table-center" style={{ minWidth: '110px' }}>Status</th>
                  <th className="table-center" style={{ width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={FiGrid}
                        title="No rooms found"
                        description="No rooms match your search or filter criteria. Create a new classroom or reset filters."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedRooms.map((room) => {
                    const RoomIcon = getRoomIcon(room.roomType)
                    const assignedStudentsCount = room.assignedSection ? (sectionStudentCountMap.get(room.assignedSection) || 0) : 0
                    const sectionMeta = room.assignedSection ? sectionMetaMap.get(room.assignedSection.toLowerCase()) : null

                    return (
                      <tr key={room.id}>
                        {/* Room Identity */}
                        <td className="table-center">
                          <div className="rooms-identity-cell">
                            <div className="rooms-icon-box">
                              <RoomIcon />
                            </div>
                            <div className="rooms-identity-info">
                              <div className="rooms-title-row">
                                <span className="room-code-badge">{room.roomNumber}</span>
                                <button
                                  type="button"
                                  className="room-name-link table-cell-truncate"
                                  onClick={() => setViewingRoom(room)}
                                  title={`Click to view details for ${room.roomName}`}
                                >
                                  {room.roomName}
                                </button>
                              </div>
                              <small className="room-dept-text">{room.department || 'General / Shared'}</small>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="table-center">
                          <span className={`room-type-tag ${/lab/i.test(room.roomType) ? 'is-lab' : /seminar/i.test(room.roomType) ? 'is-seminar' : 'is-class'}`}>
                            <RoomIcon /> {room.roomType}
                          </span>
                        </td>

                        {/* Building & Floor */}
                        <td className="table-center">
                          <div className="rooms-location-cell">
                            <div className="rooms-building-row">
                              <FiHome className="rooms-loc-icon" />
                              <span>{room.buildingBlock}</span>
                            </div>
                            <div className="rooms-floor-row">
                              <FiMapPin className="rooms-floor-icon" />
                              <small className="floor-badge">{room.floor}</small>
                            </div>
                          </div>
                        </td>

                        {/* Capacity */}
                        <td className="table-center">
                          <span className="rooms-capacity-badge">
                            <FiUsers /> {room.capacity}
                          </span>
                        </td>

                        {/* Section Allocation & Details (Course, Branch, Semester, Students) */}
                        <td className="table-center">
                          {room.assignedSection ? (
                            <div className="rooms-allocated-wrapper">
                              <div className="rooms-allocated-card">
                                <div className="rooms-allocated-top">
                                  <span className="rooms-allocated-badge" title={`Allocated to ${room.assignedSection}`}>
                                    <FiCheckCircle /> {room.assignedSection}
                                  </span>
                                  {assignedStudentsCount > 0 && (
                                    <span className="rooms-student-count-chip">
                                      <FiUsers /> {assignedStudentsCount}
                                    </span>
                                  )}
                                </div>
                                {sectionMeta?.metaStr && (
                                  <small className="rooms-allocated-meta" title={sectionMeta.fullTitle || sectionMeta.metaStr}>
                                    {sectionMeta.metaStr}
                                  </small>
                                )}
                              </div>
                              <button
                                type="button"
                                className="rooms-deallocate-link"
                                title="Deallocate / Free room"
                                onClick={() => setDeallocatingRoom(room)}
                              >
                                <FiUnlock /> Free
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="rooms-allocate-action-btn"
                              onClick={() => handleOpenAllocate(room)}
                            >
                              <FiLink /> Allocate Section
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="table-center">
                          <StatusBadge status={room.status} />
                        </td>

                        {/* Actions */}
                        <td className="table-center">
                          <div className="rooms-row-actions">
                            <button
                              type="button"
                              className="rooms-icon-btn is-edit"
                              title="Edit Room"
                              onClick={() => handleOpenEdit(room)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="rooms-icon-btn is-delete"
                              title="Delete Room"
                              onClick={() => setDeletingRoom(room)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={filteredRooms.length}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* ============================================================== */}
        {/* QUICK ALLOCATE SECTION MODAL */}
        {/* ============================================================== */}
        {allocatingRoom && (
          <div className="rooms-modal-backdrop" onClick={() => setAllocatingRoom(null)}>
            <div className="rooms-modal-card rooms-allocate-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rooms-modal-header">
                <div className="rooms-modal-header-icon">
                  <FiLink />
                </div>
                <div>
                  <h3 className="rooms-modal-title">Allocate Section to Room</h3>
                  <p className="rooms-modal-subtitle">
                    Assign {allocatingRoom.roomNumber} ({allocatingRoom.roomName}) to a B.Tech class section.
                  </p>
                </div>
                <button
                  type="button"
                  className="rooms-modal-close"
                  onClick={() => setAllocatingRoom(null)}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSaveAllocation}>
                <div className="rooms-modal-body">
                  <div className="rooms-room-preview-box">
                    <div className="rooms-preview-left">
                      <span className="room-code-badge">{allocatingRoom.roomNumber}</span>
                      <strong>{allocatingRoom.roomName}</strong>
                    </div>
                    <div className="room-preview-meta">
                      <span>{allocatingRoom.buildingBlock} • {allocatingRoom.floor}</span>
                      <span><FiUsers /> Capacity: {allocatingRoom.capacity} Seats</span>
                    </div>
                  </div>

                  <div className="rooms-form-group" style={{ marginTop: '16px' }}>
                    <label>Select Section to Allocate</label>
                    <SearchableSelect
                      label="Section"
                      value={selectedSectionName}
                      options={[
                        { id: '', value: '', name: '— None (Leave Available / Unallocated) —', code: 'Free Room' },
                        ...getSectionDropdownOptions(allocatingRoom.id),
                      ]}
                      onChange={(value) => setSelectedSectionName(value)}
                      placeholder="Select an unallocated class section..."
                      searchPlaceholder="Search section, course, or branch..."
                      noOptionsMessage="No matching sections available."
                    />
                  </div>
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => setAllocatingRoom(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="rooms-submit-btn">
                    <FiCheck /> Confirm Allocation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CREATE / EDIT ROOM MODAL */}
        {/* ============================================================== */}
        {isFormOpen && editingRoom && (
          <div className="rooms-modal-backdrop" onClick={() => setIsFormOpen(false)}>
            <div className="rooms-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="rooms-modal-header">
                <div className="rooms-modal-header-icon">
                  <FiGrid />
                </div>
                <div>
                  <h3 className="rooms-modal-title">
                    {editingRoom.id ? 'Edit Room / Classroom' : 'Add New Room / Classroom'}
                  </h3>
                  <p className="rooms-modal-subtitle">
                    Configure room identification, building location, seating capacity, equipment, and section allocation.
                  </p>
                </div>
                <button
                  type="button"
                  className="rooms-modal-close"
                  onClick={() => setIsFormOpen(false)}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSaveRoom}>
                <div className="rooms-modal-body">
                  <div className="rooms-form-grid">
                    {/* Room Number */}
                    <div className="rooms-form-group">
                      <label>
                        Room Code / Number <span className="req-mark">*</span>
                      </label>
                      <input
                        type="text"
                        className="rooms-input"
                        placeholder="e.g. LH-101, CSE-LAB-1"
                        value={editingRoom.roomNumber}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                        required
                      />
                    </div>

                    {/* Room Name */}
                    <div className="rooms-form-group">
                      <label>
                        Room Display Name <span className="req-mark">*</span>
                      </label>
                      <input
                        type="text"
                        className="rooms-input"
                        placeholder="e.g. Lecture Hall 101"
                        value={editingRoom.roomName}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomName: e.target.value })}
                        required
                      />
                    </div>

                    {/* Building Block */}
                    <div className="rooms-form-group">
                      <label>
                        Building Block <span className="req-mark">*</span>
                      </label>
                      <select
                        className="rooms-select"
                        value={editingRoom.buildingBlock}
                        onChange={(e) => setEditingRoom({ ...editingRoom, buildingBlock: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select Building Block</option>
                        {BUILDING_BLOCKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Floor */}
                    <div className="rooms-form-group">
                      <label>
                        Floor <span className="req-mark">*</span>
                      </label>
                      <select
                        className="rooms-select"
                        value={editingRoom.floor}
                        onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select Floor</option>
                        {FLOORS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    {/* Room Type */}
                    <div className="rooms-form-group">
                      <label>
                        Room Type <span className="req-mark">*</span>
                      </label>
                      <select
                        className="rooms-select"
                        value={editingRoom.roomType}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomType: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select Room Type</option>
                        {ROOM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Seating Capacity */}
                    <div className="rooms-form-group">
                      <label>
                        Seating Capacity <span className="req-mark">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        className="rooms-input"
                        placeholder="e.g. 60"
                        value={editingRoom.capacity}
                        onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) || '' })}
                        required
                      />
                    </div>

                    {/* Availability Status */}
                    <div className="rooms-form-group">
                      <label>
                        Availability Status <span className="req-mark">*</span>
                      </label>
                      <select
                        className="rooms-select"
                        value={editingRoom.status}
                        onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value })}
                        required
                      >
                        <option value="Available">Available</option>
                        <option value="Allocated">Allocated</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Section Allocation (Filtered to prevent double allocations) */}
                    <div className="rooms-form-group">
                      <label>Allocated Section (Optional)</label>
                      <select
                        className="rooms-select"
                        value={editingRoom.assignedSection || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setEditingRoom({
                            ...editingRoom,
                            assignedSection: val,
                            status: val ? 'Allocated' : (editingRoom.status === 'Allocated' ? 'Available' : editingRoom.status),
                          })
                        }}
                      >
                        <option value="">None (Available / Unallocated)</option>
                        {sections.map((s) => {
                          const name = s.sectionName || s.name || `Section ${s.id}`
                          const course = s.courseName || s.course || ''
                          const branch = s.branchName || s.branch || ''
                          const sem = s.semesterName || s.semester || ''
                          const count = sectionStudentCountMap.get(name) || sectionStudentCountMap.get(String(s.id)) || 0

                          // Check if allocated to other room
                          const otherAllocatedRoom = rooms.find(
                            (r) => r.id !== editingRoom.id && r.assignedSection?.trim().toLowerCase() === name.trim().toLowerCase()
                          )

                          const details = [course, branch, sem].filter(Boolean).join(' • ')

                          return (
                            <option
                              key={s.id || name}
                              value={name}
                              disabled={Boolean(otherAllocatedRoom)}
                            >
                              {name} {details ? `(${details})` : ''} {count > 0 ? `[${count} Students]` : ''} {otherAllocatedRoom ? `(Allocated to ${otherAllocatedRoom.roomNumber})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Facilities & Amenities */}
                  <div className="rooms-form-group" style={{ marginTop: '14px' }}>
                    <label>Available Facilities & Equipment</label>
                    <div className="rooms-facilities-picker">
                      {ROOM_FACILITIES.map((facility) => {
                        const isSelected = editingRoom.facilities?.includes(facility)
                        return (
                          <button
                            type="button"
                            key={facility}
                            className={`facility-chip-btn ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleToggleFacility(facility)}
                          >
                            {isSelected ? <FiCheck /> : <FiPlus />} {facility}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Description / Notes */}
                  <div className="rooms-form-group" style={{ marginTop: '12px' }}>
                    <label>Room Notes / Remarks</label>
                    <textarea
                      className="rooms-textarea"
                      rows={2}
                      placeholder="Special audio-visual equipment, teaching amenities, or layout notes..."
                      value={editingRoom.description || ''}
                      onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="rooms-submit-btn">
                    <FiCheck /> {editingRoom.id ? 'Save Changes' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW ROOM DETAILS MODAL */}
        {/* ============================================================== */}
        {viewingRoom && (
          <div className="rooms-modal-backdrop" onClick={() => setViewingRoom(null)}>
            <div className="rooms-modal-card rooms-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rooms-modal-header">
                <div className="rooms-modal-header-icon">
                  <FiInfo />
                </div>
                <div>
                  <h3 className="rooms-modal-title">{viewingRoom.roomNumber} - {viewingRoom.roomName}</h3>
                  <p className="rooms-modal-subtitle">
                    {viewingRoom.buildingBlock} • {viewingRoom.floor}
                  </p>
                </div>
                <button
                  type="button"
                  className="rooms-modal-close"
                  onClick={() => setViewingRoom(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="rooms-modal-body">
                <div className="room-details-grid">
                  <div className="detail-item">
                    <span>Room Number</span>
                    <strong>{viewingRoom.roomNumber}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Room Type</span>
                    <strong>{viewingRoom.roomType}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Building Block</span>
                    <strong>{viewingRoom.buildingBlock}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Floor Level</span>
                    <strong>{viewingRoom.floor}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Seating Capacity</span>
                    <strong>{viewingRoom.capacity} Students</strong>
                  </div>
                  <div className="detail-item">
                    <span>Current Status</span>
                    <strong><StatusBadge status={viewingRoom.status} /></strong>
                  </div>
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <span>Allocated Section & Details</span>
                    <strong>
                      {viewingRoom.assignedSection ? (
                        <>
                          {viewingRoom.assignedSection}
                          {sectionMetaMap.get(viewingRoom.assignedSection.toLowerCase())?.metaStr && (
                            <span style={{ color: '#64748B', fontWeight: 600, marginLeft: '8px' }}>
                              ({sectionMetaMap.get(viewingRoom.assignedSection.toLowerCase()).metaStr})
                            </span>
                          )}
                          {sectionStudentCountMap.get(viewingRoom.assignedSection) > 0 && (
                            <span className="rooms-student-count-chip" style={{ marginLeft: '8px' }}>
                              <FiUsers /> {sectionStudentCountMap.get(viewingRoom.assignedSection)} Enrolled Students
                            </span>
                          )}
                        </>
                      ) : (
                        'None (Available for allocation)'
                      )}
                    </strong>
                  </div>
                </div>

                {viewingRoom.facilities && viewingRoom.facilities.length > 0 && (
                  <div className="room-details-facilities">
                    <span>Equipped Facilities</span>
                    <div className="facility-tags-list">
                      {viewingRoom.facilities.map((f) => (
                        <span key={f} className="facility-tag-item">
                          <FiCheckCircle /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {viewingRoom.description && (
                  <div className="room-details-description">
                    <span>Remarks & Description</span>
                    <p>{viewingRoom.description}</p>
                  </div>
                )}
              </div>

              <div className="rooms-modal-footer">
                <button
                  type="button"
                  className="rooms-cancel-btn"
                  onClick={() => setViewingRoom(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rooms-submit-btn"
                  onClick={() => {
                    const r = viewingRoom
                    setViewingRoom(null)
                    handleOpenEdit(r)
                  }}
                >
                  <FiEdit2 /> Edit Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* DELETE CONFIRMATION MODAL POPUP */}
        {/* ============================================================== */}
        {deletingRoom && (() => {
          const studentCount = deletingRoom.assignedSection ? (sectionStudentCountMap.get(deletingRoom.assignedSection) || 0) : 0
          const hasAssignedSection = Boolean(deletingRoom.assignedSection && deletingRoom.assignedSection.trim())
          const isBlocked = hasAssignedSection
          return (
            <div className="rooms-modal-backdrop" onClick={() => setDeletingRoom(null)}>
              <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rooms-modal-header delete-header">
                  <div className="rooms-modal-header-icon delete-icon">
                    <FiAlertTriangle />
                  </div>
                  <div>
                    <h3 className="rooms-modal-title">{isBlocked ? 'Deletion Blocked' : 'Delete Room Confirmation'}</h3>
                    <p className="rooms-modal-subtitle">
                      Campus spatial directory deletion governance.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rooms-modal-close"
                    onClick={() => setDeletingRoom(null)}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="rooms-modal-body">
                  <div className="rooms-confirm-box">
                    <div className="rooms-confirm-room-info">
                      <span className="room-code-badge">{deletingRoom.roomNumber}</span>
                      <div>
                        <strong>{deletingRoom.roomName}</strong>
                        <p>{deletingRoom.buildingBlock} • {deletingRoom.floor} • {deletingRoom.roomType}</p>
                      </div>
                    </div>

                    {deletingRoom.assignedSection && (
                      <div className="rooms-confirm-section-tag">
                        <span>Allocated Section:</span>
                        <strong>
                          <FiCheckCircle /> {deletingRoom.assignedSection}
                          {studentCount > 0 ? (
                            <span className="rooms-student-count-chip">
                              <FiUsers /> {studentCount} Enrolled
                            </span>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginLeft: '6px' }}>
                              (Assigned Section)
                            </span>
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  {isBlocked ? (
                    <div className="rooms-confirm-blocked-banner">
                      <FiSlash className="blocked-icon" />
                      <div>
                        <strong>Deletion Blocked by Academic Governance</strong>
                        <p>
                          Room <strong>"{deletingRoom.roomName}"</strong> is currently allocated to Section <strong>"{deletingRoom.assignedSection}"</strong>{studentCount > 0 ? ` with ${studentCount} active enrolled student${studentCount === 1 ? '' : 's'}` : ''}.
                          You cannot delete this room while a section is allocated. Please deallocate or transfer the section to another room first.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="rooms-confirm-text">
                      Are you sure you want to permanently delete this room record? This action cannot be undone.
                    </p>
                  )}
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => setDeletingRoom(null)}
                  >
                    {isBlocked ? 'Close' : 'Cancel'}
                  </button>
                  {isBlocked ? (
                    <button
                      type="button"
                      className="rooms-save-btn"
                      onClick={() => {
                        const target = deletingRoom
                        setDeletingRoom(null)
                        handleOpenDeallocate(target)
                      }}
                    >
                      Deallocate Section First
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rooms-delete-btn"
                      title="Delete Room"
                      onClick={handleConfirmDeleteRoom}
                    >
                      <FiTrash2 /> Delete Room
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ============================================================== */}
        {/* DEALLOCATE / FREE CONFIRMATION MODAL POPUP */}
        {/* ============================================================== */}
        {deallocatingRoom && (() => {
          const studentCount = deallocatingRoom.assignedSection ? (sectionStudentCountMap.get(deallocatingRoom.assignedSection) || 0) : 0
          return (
            <div className="rooms-modal-backdrop" onClick={() => setDeallocatingRoom(null)}>
              <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rooms-modal-header">
                  <div className="rooms-modal-header-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    <FiUnlock />
                  </div>
                  <div>
                    <h3 className="rooms-modal-title">Free / Deallocate Room</h3>
                    <p className="rooms-modal-subtitle">
                      Release the assigned class section from this room.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rooms-modal-close"
                    onClick={() => setDeallocatingRoom(null)}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="rooms-modal-body">
                  <div className="rooms-confirm-box">
                    <div className="rooms-confirm-room-info">
                      <span className="room-code-badge">{deallocatingRoom.roomNumber}</span>
                      <div>
                        <strong>{deallocatingRoom.roomName}</strong>
                        <p>{deallocatingRoom.buildingBlock} • {deallocatingRoom.floor}</p>
                      </div>
                    </div>
                    <div className="rooms-confirm-section-tag">
                      <span>Currently Assigned to:</span>
                      <strong>
                        <FiCheckCircle /> {deallocatingRoom.assignedSection}
                        {studentCount > 0 && (
                          <span className="rooms-student-count-chip">
                            <FiUsers /> {studentCount} Students
                          </span>
                        )}
                      </strong>
                    </div>
                  </div>

                  {studentCount > 0 && (
                    <div className="rooms-confirm-warning" style={{ marginTop: '12px' }}>
                      <FiAlertTriangle />
                      <span>
                        Notice: <strong>{studentCount} students</strong> are currently taking classes in this section. Freeing the room will leave this section without a designated classroom until a new room is allocated.
                      </span>
                    </div>
                  )}

                  <p className="rooms-confirm-text">
                    Are you sure you want to free room <strong>{deallocatingRoom.roomNumber}</strong> from <strong>{deallocatingRoom.assignedSection}</strong>? The room status will return to Available.
                  </p>
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => setDeallocatingRoom(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rooms-submit-btn"
                    style={{ background: '#D97706', borderColor: '#D97706' }}
                    onClick={handleConfirmDeallocate}
                  >
                    <FiUnlock /> Confirm & Free Room
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </DashboardLayout>
  )
}
