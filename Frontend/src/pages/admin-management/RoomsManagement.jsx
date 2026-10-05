import useCollegeState from '../../hooks/useCollegeState'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  FiArrowLeft
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

const clean = (value) => value !== null && value !== undefined && !['', 'null', 'undefined', 'not provided', 'not set', '?'].includes(String(value).trim().toLowerCase())

function InfoRows({ rows }) {
  const visible = rows.filter(([, value]) => clean(value))
  if (!visible.length) return null
  return (
    <div className="cm-info-rows sa-detail-kv-grid erp-view-grid">
      {visible.map(([label, value]) => (
        <div className="cm-info-row sa-kv-cell erp-view-field" key={label}>
          <span className="cm-info-label sa-kv-label erp-view-label">{label}</span>
          <strong className="cm-info-val sa-kv-val erp-view-value">{value}</strong>
        </div>
      ))}
    </div>
  )
}

function InfoCard({ icon: Icon, title, rows, children }) {
  const visible = rows ? rows.filter(([, value]) => clean(value)) : []
  return (
    <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section">
      <div className="cm-info-card-header sa-panel-header">
        <div className="sa-panel-title-wrap">
          {Icon && <span className="sa-panel-icon"><Icon aria-hidden="true" /></span>}
          <h2>{title}</h2>
        </div>
        {visible.length > 0 && <span className="sa-card-count-badge">{visible.length} items</span>}
      </div>
      {rows && <InfoRows rows={visible} />}
      {children}
    </section>
  )
}

export default function RoomsManagement({ formMode = false, viewMode = false }) {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [roomsLoaded, setRoomsLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const closeForm = () => navigate('/rooms-management')
  const [rooms, setRooms] = useCollegeState([])
  const [sections, setSections] = useCollegeState([])
  const [assignments, setAssignments] = useCollegeState([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [editingRoom, setEditingRoom] = useState(null)
  const [customRoomType, setCustomRoomType] = useState(false)
  const [customBuildingBlock, setCustomBuildingBlock] = useState(false)
  const [viewingRoom, setViewingRoom] = useState(null)
  const [allocatingRoom, setAllocatingRoom] = useState(null)
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [deletingRoom, setDeletingRoom] = useState(null)
  const [deallocatingRoom, setDeallocatingRoom] = useState(null)

  // Load Rooms, Sections, and Student Assignments
  const loadRooms = async () => {
    try {
      const list = await roomService.getRooms()
      setRooms(Array.isArray(list) ? list : [])
    } catch {
      setRooms(roomService.getStoredRooms())
    } finally {
      setRoomsLoaded(true)
    }
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

        // Clean compact display (e.g. B.Tech - ECE - Sem 1)
        const compactCourse = /bachelor of technology/i.test(rawCourse) ? 'B.Tech' : rawCourse
        let compactBranch = rawBranch
        if (/electronics and communication/i.test(rawBranch)) compactBranch = 'ECE'
        else if (/computer science/i.test(rawBranch)) compactBranch = 'CSE'
        else if (/mechanical/i.test(rawBranch)) compactBranch = 'ME'
        else if (/civil/i.test(rawBranch)) compactBranch = 'Civil'
        else if (/electrical and electronics/i.test(rawBranch)) compactBranch = 'EEE'
        else if (/information technology/i.test(rawBranch)) compactBranch = 'IT'
        else if (/artificial intelligence/i.test(rawBranch)) compactBranch = 'AI&ML'

        const metaStr = [compactCourse, compactBranch, sem].filter(Boolean).join(' - ')
        const fullTitle = [s.courseName || rawCourse, s.branchName || rawBranch, sem].filter(Boolean).join(' - ')

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
  // Helper to generate section dropdown options without allowing double-allocation
  const getSectionDropdownOptions = (currentRoomId) => {
    // Collect sections already assigned to other rooms
    const otherAllocatedMap = new Map()
    rooms.forEach((r) => {
      if (r.id !== currentRoomId && r.assignedSection) {
        otherAllocatedMap.set(r.assignedSection.trim().toLowerCase(), r.roomNumber)
        if (r.sectionId) {
          otherAllocatedMap.set(String(r.sectionId), r.roomNumber)
        }
      }
    })

    return sections
      .filter((s) => s.status !== 'Inactive' && s.status !== 0 && s.status !== false && s.isActive !== false)
      .map((s) => {
        const secId = s.sectionId ?? s.id
        const name = s.sectionName || s.name || `Section ${secId}`
        const code = s.sectionCode || s.code || ''
        const branch = s.branchName || s.branch || ''
        const course = s.courseName || s.course || ''
        const sem = s.semesterName || s.semester || (s.semesterNumber ? `Sem ${s.semesterNumber}` : '')
        const count = sectionStudentCountMap.get(name) || sectionStudentCountMap.get(String(secId)) || 0
        const allocatedRoomNum = otherAllocatedMap.get(name.trim().toLowerCase()) || (secId ? otherAllocatedMap.get(String(secId)) : null)

        const details = [course, branch, sem].filter(Boolean).join(' - ')
        const isAlreadyAllocated = Boolean(allocatedRoomNum)

        return {
          id: String(secId || name),
          value: String(secId || name),
          name: isAlreadyAllocated
            ? `${name} ${code ? `(${code})` : ''} - ${details} [${count} Students] (Already Allocated to ${allocatedRoomNum})`
            : `${name} ${code ? `(${code})` : ''} - ${details} [${count} Students]`,
          code: details || 'Section',
          disabled: isAlreadyAllocated,
        }
      })
  }

  // Form Handlers
  const handleOpenCreate = () => navigate('/rooms-management/add')
  const initializeCreate = useCallback(() => {
    setCustomBuildingBlock(false)
    setCustomRoomType(false)
    setEditingRoom({
      id: '',
      roomNumber: '',
      roomName: '',
      buildingBlock: '',
      floor: '',
      roomType: '',
      capacity: '',
      facilities: [],
      department: 'General / Shared',
      status: '',
      assignedSection: '',
      sectionId: null,
      description: '',
    })
  }, [])

  const handleOpenEdit = (room) => navigate(`/rooms-management/${room.id}/edit`)
  const initializeEdit = useCallback((room) => {
    setCustomBuildingBlock(Boolean(room.buildingBlock && !BUILDING_BLOCKS.includes(room.buildingBlock)))
    setCustomRoomType(Boolean(room.roomType && !ROOM_TYPES.includes(room.roomType)))
    const foundSec = sections.find((s) => {
      const sId = s.sectionId ?? s.id
      if (room.sectionId && String(sId) === String(room.sectionId)) return true
      const sName = String(s.sectionName || s.name || '').trim().toLowerCase()
      const rName = String(room.assignedSection || '').trim().toLowerCase()
      return sName && rName && sName === rName
    })
    setEditingRoom({
      ...room,
      sectionId: foundSec ? (foundSec.sectionId ?? foundSec.id) : (room.sectionId || null),
      facilities: Array.isArray(room.facilities) ? [...room.facilities] : [],
    })
  }, [sections])

  useEffect(() => {
    if (!formMode || editingRoom) return
    if (!roomId) initializeCreate()
    else if (roomsLoaded) {
      const room = rooms.find(item => String(item.id) === String(roomId))
      if (room) initializeEdit(room)
    }
  }, [formMode, roomId, roomsLoaded, rooms, editingRoom, initializeCreate, initializeEdit])

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

  const handleSaveRoom = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!editingRoom.roomNumber?.trim()) return showError('Please enter a room number or code.')
    if (!editingRoom.roomName?.trim()) return showError('Please enter a room display name.')
    if (!editingRoom.buildingBlock?.trim()) return showError(customBuildingBlock ? 'Please enter the building block.' : 'Please select a building block.')
    if (!editingRoom.floor) return showError('Please select a floor.')
    if (!editingRoom.roomType?.trim()) return showError(customRoomType ? 'Please enter the room type.' : 'Please select a room type.')
    if (!editingRoom.status) return showError('Please select room availability status.')

    // Rule 1: Prevent double allocation of the same section to multiple rooms
    if (editingRoom.assignedSection) {
      const conflictRoom = rooms.find(
        (r) => r.id !== editingRoom.id && (
          (r.sectionId && editingRoom.sectionId && Number(r.sectionId) === Number(editingRoom.sectionId)) ||
          (r.assignedSection?.trim().toLowerCase() === editingRoom.assignedSection?.trim().toLowerCase())
        )
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

    setSaving(true)
    try {
      let savedRoom = null
      if (editingRoom.id) {
        savedRoom = await roomService.updateRoom(editingRoom.id, editingRoom)
      } else {
        savedRoom = await roomService.createRoom(editingRoom)
      }

      const targetRoomId = savedRoom?.classroomId || savedRoom?.id || editingRoom.id
      if (editingRoom.sectionId) {
        const secId = Number(editingRoom.sectionId)
        if (secId > 0) {
          try {
            await roomService.allocateRoom(targetRoomId, editingRoom.assignedSection, secId)
          } catch (allocErr) {
            console.warn('Room saved, but section allocation API fallback:', allocErr)
          }
        }
      }

      showSuccess(`Room "${editingRoom.roomNumber}" saved successfully.`)
      await loadRooms()
      closeForm()
    } catch (err) {
      showError(err.message || 'Failed to save room.')
    } finally {
      setSaving(false)
    }
  }

  // Delete Room via Modal
  const handleConfirmDeleteRoom = async () => {
    if (!deletingRoom) return
    if (deletingRoom.assignedSection && deletingRoom.assignedSection.trim()) {
      const studentCount = sectionStudentCountMap.get(deletingRoom.assignedSection) || 0
      return showError(
        `Cannot delete room "${deletingRoom.roomNumber}": Section "${deletingRoom.assignedSection}" is currently allocated to this room${studentCount > 0 ? ` (${studentCount} students)` : ''}. Please deallocate or transfer the section first.`
      )
    }
    try {
      const targetRoomId = deletingRoom.classroomId || deletingRoom.id
      await roomService.deleteRoom(targetRoomId)
      showSuccess(`Room "${deletingRoom.roomNumber} - ${deletingRoom.roomName}" deleted successfully.`)
      setDeletingRoom(null)
      await loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to delete room.')
    }
  }

  // Quick Allocation Handlers
  const handleOpenAllocate = (room) => {
    setAllocatingRoom(room)
    const foundSec = sections.find((s) => {
      const sId = s.sectionId ?? s.id
      if (room.sectionId && String(sId) === String(room.sectionId)) return true
      const sName = String(s.sectionName || s.name || '').trim().toLowerCase()
      const rName = String(room.assignedSection || '').trim().toLowerCase()
      return sName && rName && sName === rName
    })
    const secIdVal = foundSec ? (foundSec.sectionId ?? foundSec.id) : (room.sectionId || '')
    setSelectedSectionId(secIdVal ? String(secIdVal) : '')
  }

  const handleSaveAllocation = async (e) => {
    e.preventDefault()
    if (!allocatingRoom) return

    const targetRoomId = allocatingRoom.classroomId || allocatingRoom.id

    if (!selectedSectionId) {
      try {
        await roomService.allocateRoom(targetRoomId, '', null)
        showSuccess(`Room "${allocatingRoom.roomNumber}" is now unallocated and available.`)
        setAllocatingRoom(null)
        await loadRooms()
      } catch (err) {
        showError(err.message || 'Failed to update section allocation.')
      }
      return
    }

    const secObj = sections.find((s) => String(s.sectionId ?? s.id) === String(selectedSectionId) || String(s.sectionName || s.name) === String(selectedSectionId))
    const secId = Number(secObj?.sectionId ?? secObj?.id ?? selectedSectionId)
    const secName = secObj?.sectionName || secObj?.name || `Section ${secId}`

    if (!secId || isNaN(secId) || secId <= 0) {
      return showError('A valid section ID is required.')
    }

    // Rule: Prevent double allocation of the same section to multiple rooms
    const conflictRoom = rooms.find(
      (r) => r.id !== allocatingRoom.id && (
        (r.sectionId && Number(r.sectionId) === secId) ||
        (r.assignedSection?.trim().toLowerCase() === secName.trim().toLowerCase())
      )
    )
    if (conflictRoom) {
      return showError(
        `Section "${secName}" is already allocated to Room "${conflictRoom.roomNumber} (${conflictRoom.roomName})". Please choose an unallocated section.`
      )
    }

    try {
      await roomService.allocateRoom(targetRoomId, secName, secId)
      showSuccess(`Room "${allocatingRoom.roomNumber}" allocated to "${secName}".`)
      setAllocatingRoom(null)
      await loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to update section allocation.')
    }
  }

  // Deallocate Room via Modal
  const handleConfirmDeallocate = async () => {
    if (!deallocatingRoom) return
    try {
      const targetRoomId = deallocatingRoom.classroomId || deallocatingRoom.id
      await roomService.allocateRoom(targetRoomId, '', null)
      showSuccess(`Room "${deallocatingRoom.roomNumber}" is now unallocated and available.`)
      setDeallocatingRoom(null)
      await loadRooms()
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

  const isDetailsView = viewMode || (Boolean(roomId) && !formMode)
  const targetRoom = isDetailsView
    ? (rooms.find((r) => String(r.id) === String(roomId) || String(r.classroomId) === String(roomId)) || viewingRoom)
    : viewingRoom

  if (isDetailsView) {
    const RoomIcon = getRoomIcon(targetRoom?.roomType)
    const assignedStudentsCount = targetRoom?.assignedSection ? (sectionStudentCountMap.get(targetRoom.assignedSection) || 0) : 0
    const sectionMeta = targetRoom?.assignedSection ? sectionMetaMap.get(targetRoom.assignedSection.toLowerCase()) : null

    return (
      <DashboardLayout>
        <div className="rooms-page cm-profile-view" data-export-record>
          {/* Top Actions Bar */}
          <div className="cm-profile-top-bar">
            {targetRoom && (
              <ExportMenu
                mode="single"
                title={`Room Details - ${targetRoom.roomNumber}`}
                filename={`room_${targetRoom.roomNumber}`}
                rows={[targetRoom]}
                columns={roomExportColumns}
              />
            )}
            <button
              type="button"
              className="cm-button secondary"
              onClick={() => navigate('/rooms-management')}
            >
              &larr; Back 
            </button>
            {targetRoom && (
              <button
                type="button"
                className="rooms-submit-btn"
                onClick={() => handleOpenEdit(targetRoom)}
              >
                <FiEdit2 /> Edit Room
              </button>
            )}
          </div>

          {!targetRoom ? (
            <div className="erp-directory-card" style={{ padding: '40px' }}>
              <EmptyState
                icon={FiGrid}
                title={roomsLoaded ? 'Room Not Found' : 'Loading Room Details...'}
                description={roomsLoaded ? 'The requested classroom record does not exist in the spatial directory.' : 'Retrieving classroom information from campus directory...'}
              />
            </div>
          ) : (
            <article className="cm-profile-card">
              {/* Hero Banner with Lavender Palette & Gold Emblem */}
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  <div className="cm-profile-placeholder">
                    <RoomIcon />
                  </div>
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">ROOM {targetRoom.roomNumber}</span>
                    <span className="cm-badge cm-badge-type">{targetRoom.roomType}</span>
                    <StatusBadge status={targetRoom.status} />
                  </div>
                  <h1 className="cm-profile-title">{targetRoom.roomNumber} - {targetRoom.roomName}</h1>
                  <p className="cm-profile-subtitle">
                    {[targetRoom.buildingBlock, targetRoom.floor, targetRoom.department || 'General / Shared Campus Facility'].filter(Boolean).join(' - ')}
                  </p>
                </div>
              </div>

              {/* Metric Summary Cards Bar */}
              <div className="rooms-detail-summary-bar">
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-lavender">
                    <FiUsers />
                  </div>
                  <div>
                    <span className="metric-label">SEATING CAPACITY</span>
                    <strong className="metric-val">{targetRoom.capacity} Students</strong>
                  </div>
                </div>
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-amber">
                    <FiLink />
                  </div>
                  <div>
                    <span className="metric-label">ALLOCATED SECTION</span>
                    <strong className="metric-val">{targetRoom.assignedSection || 'None (Available)'}</strong>
                  </div>
                </div>
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-emerald">
                    <FiCheckCircle />
                  </div>
                  <div>
                    <span className="metric-label">ENROLLED STUDENTS</span>
                    <strong className="metric-val">{assignedStudentsCount} Enrolled</strong>
                  </div>
                </div>
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-indigo">
                    <FiLayers />
                  </div>
                  <div>
                    <span className="metric-label">FACILITIES EQUIPPED</span>
                    <strong className="metric-val">{targetRoom.facilities?.length || 0} Amenities</strong>
                  </div>
                </div>
              </div>

              {/* Information Panels Grid */}
              <div className="cm-profile-grid" style={{ padding: '24px' }}>
                {/* 1. Spatial & Location Details */}
                <InfoCard
                  icon={FiHome}
                  title="Spatial & Location Details"
                  rows={[
                    ['Room Code / Number', targetRoom.roomNumber],
                    ['Display Name', targetRoom.roomName],
                    ['Room Classification', targetRoom.roomType],
                    ['Building Block', targetRoom.buildingBlock],
                    ['Floor Level', targetRoom.floor],
                    ['Managing Department', targetRoom.department || 'General / Shared'],
                    ['Seating Capacity', `${targetRoom.capacity} Seats`],
                    ['Operational Status', targetRoom.status],
                  ]}
                />

                {/* 2. Academic Section Allocation */}
                <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section">
                  <div className="cm-info-card-header sa-panel-header">
                    <div className="sa-panel-title-wrap">
                      <span className="sa-panel-icon"><FiLink aria-hidden="true" /></span>
                      <h2>Academic Section Allocation</h2>
                    </div>
                    <span className="sa-card-count-badge">
                      {targetRoom.assignedSection ? 'Allocated' : 'Unallocated'}
                    </span>
                  </div>

                  <div className="cm-info-rows sa-detail-kv-grid erp-view-grid">
                    <div className="cm-info-row sa-kv-cell erp-view-field">
                      <span className="cm-info-label sa-kv-label erp-view-label">Assigned Section</span>
                      <strong className="cm-info-val sa-kv-val erp-view-value">
                        {targetRoom.assignedSection ? (
                          <span className="rooms-allocated-badge" style={{ fontSize: '13px', padding: '4px 10px' }}>
                            <FiCheckCircle /> {targetRoom.assignedSection}
                          </span>
                        ) : (
                          <span style={{ color: '#64748B' }}>None (Available for allocation)</span>
                        )}
                      </strong>
                    </div>

                    {sectionMeta?.metaStr && (
                      <div className="cm-info-row sa-kv-cell erp-view-field">
                        <span className="cm-info-label sa-kv-label erp-view-label">Academic Program Mapping</span>
                        <strong className="cm-info-val sa-kv-val erp-view-value">{sectionMeta.metaStr}</strong>
                      </div>
                    )}

                    <div className="cm-info-row sa-kv-cell erp-view-field">
                      <span className="cm-info-label sa-kv-label erp-view-label">Active Enrolled Students</span>
                      <strong className="cm-info-val sa-kv-val erp-view-value">
                        {assignedStudentsCount > 0 ? (
                          <span className="rooms-student-count-chip" style={{ fontSize: '12px', padding: '3px 10px' }}>
                            <FiUsers /> {assignedStudentsCount} Enrolled Students
                          </span>
                        ) : (
                          '0 Students'
                        )}
                      </strong>
                    </div>

                    <div className="cm-info-row sa-kv-cell erp-view-field">
                      <span className="cm-info-label sa-kv-label erp-view-label">Allocation Actions</span>
                      <div className="cm-info-val sa-kv-val erp-view-value" style={{ marginTop: '4px' }}>
                        {targetRoom.assignedSection ? (
                          <button
                            type="button"
                            className="rooms-deallocate-link"
                            onClick={() => setDeallocatingRoom(targetRoom)}
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
                          >
                            <FiUnlock /> Free / Deallocate Room
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rooms-allocate-action-btn"
                            onClick={() => handleOpenAllocate(targetRoom)}
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
                          >
                            <FiLink /> Allocate Class Section
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Equipped Facilities & Amenities */}
                <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section" style={{ gridColumn: '1 / -1' }}>
                  <div className="cm-info-card-header sa-panel-header">
                    <div className="sa-panel-title-wrap">
                      <span className="sa-panel-icon"><FiCheckCircle aria-hidden="true" /></span>
                      <h2>Equipped Facilities & Amenities</h2>
                    </div>
                    <span className="sa-card-count-badge">
                      {targetRoom.facilities?.length || 0} Equipped
                    </span>
                  </div>

                  <div style={{ padding: '16px 20px' }}>
                    {targetRoom.facilities && targetRoom.facilities.length > 0 ? (
                      <div className="facility-tags-list" style={{ gap: '10px' }}>
                        {targetRoom.facilities.map((f) => (
                          <span key={f} className="facility-tag-item" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px' }}>
                            <FiCheckCircle /> {f}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: '#64748B', fontSize: '13px' }}>
                        No specific facilities or special equipment tagged for this classroom.
                      </p>
                    )}
                  </div>
                </section>

                {/* 4. Description & Remarks */}
                {targetRoom.description && (
                  <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section" style={{ gridColumn: '1 / -1' }}>
                    <div className="cm-info-card-header sa-panel-header">
                      <div className="sa-panel-title-wrap">
                        <span className="sa-panel-icon"><FiInfo aria-hidden="true" /></span>
                        <h2>Room Remarks & Equipment Notes</h2>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.6, background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        {targetRoom.description}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </article>
          )}

          {/* Quick Allocate Modal */}
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
                        <span>{allocatingRoom.buildingBlock} | {allocatingRoom.floor}</span>
                        <span><FiUsers /> Capacity: {allocatingRoom.capacity} Seats</span>
                      </div>
                    </div>

                    <div className="rooms-form-group" style={{ marginTop: '16px' }}>
                      <label>Select Section to Allocate</label>
                      <SearchableSelect
                        label="Section"
                        value={selectedSectionId}
                        options={[
                          { id: '', value: '', name: '- None (Leave Available / Unallocated) -', code: 'Free Room' },
                          ...getSectionDropdownOptions(allocatingRoom.id),
                        ]}
                        onChange={(value) => setSelectedSectionId(value)}
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

          {/* Delete confirmation modal */}
          {deletingRoom && (() => {
            const studentCount = deletingRoom.assignedSection ? (sectionStudentCountMap.get(deletingRoom.assignedSection) || 0) : 0
            const hasAssignedSection = Boolean(deletingRoom.assignedSection && deletingRoom.assignedSection.trim())
            const isBlocked = hasAssignedSection
            return (
              <div className="rooms-modal-backdrop" onClick={() => setDeletingRoom(null)}>
                <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="rooms-modal-header delete-header">
                    <div className="rooms-modal-header-icon delete-icon">
                      <FiTrash2 />
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
                          <p>{deletingRoom.buildingBlock} | {deletingRoom.floor} | {deletingRoom.roomType}</p>
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
                        <div className="rooms-blocked-icon-box">
                          <FiSlash className="blocked-icon" />
                        </div>
                        <div className="rooms-blocked-text-content">
                          <strong>Deletion Blocked by Academic Governance</strong>
                          <p>
                            Room <strong>"{deletingRoom.roomName}"</strong> is currently allocated to Section <strong>"{deletingRoom.assignedSection}"</strong>{studentCount > 0 ? ` with ${studentCount} active enrolled student${studentCount === 1 ? '' : 's'}` : ''}.
                            You cannot delete this room while a section is allocated. Please deallocate or transfer the section to another room first.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="rooms-confirm-text">
                        Are you sure you want to permanently delete room <strong>"{deletingRoom.roomName}"</strong> ({deletingRoom.roomNumber})? This action cannot be undone.
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
                        className="rooms-submit-btn"
                        onClick={() => {
                          const target = deletingRoom
                          setDeletingRoom(null)
                          handleOpenDeallocate(target)
                        }}
                      >
                        <FiUnlock /> Deallocate Section First
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rooms-submit-btn is-delete-confirm"
                        title="Delete Room"
                        onClick={async () => {
                          await handleConfirmDeleteRoom()
                          navigate('/rooms-management')
                        }}
                      >
                        <FiTrash2 /> Confirm & Delete Room
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Deallocate confirmation modal */}
          {deallocatingRoom && (() => {
            const studentCount = deallocatingRoom.assignedSection ? (sectionStudentCountMap.get(deallocatingRoom.assignedSection) || 0) : 0
            return (
              <div className="rooms-modal-backdrop" onClick={() => setDeallocatingRoom(null)}>
                <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="rooms-modal-header">
                    <div className="rooms-modal-header-icon">
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
                          <p>{deallocatingRoom.buildingBlock} | {deallocatingRoom.floor}</p>
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

  if (formMode) return (
    <DashboardLayout>
      <div className="rooms-page rooms-form-page">
        <PageHeader title={roomId ? 'Edit Room / Classroom' : 'Add New Room / Classroom'} subtitle="Configure room identification, location, capacity, facilities, and section allocation.">
          <button type="button" className="rooms-cancel-btn rooms-form-back-btn" onClick={closeForm}><FiArrowLeft aria-hidden="true" />Back</button>
        </PageHeader>
        {!editingRoom ? <EmptyState title={roomsLoaded ? 'Room not found' : 'Loading room...'} /> : (
          <div className="rooms-form-layout">
            <section className="rooms-editor-panel" aria-label="Room details">
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
                      <SearchableSelect
                        label="Building Block"
                        value={customBuildingBlock ? '__other__' : editingRoom.buildingBlock}
                        options={[...BUILDING_BLOCKS, { value: '__other__', label: 'Others' }]}
                        placeholder="Select Building Block"
                        searchPlaceholder="Search building blocks..."
                        noOptionsMessage="No matching building blocks. Clear the search and select Others to enter a custom block."
                        onChange={(value) => {
                          const other = value === '__other__'
                          setCustomBuildingBlock(other)
                          setEditingRoom({ ...editingRoom, buildingBlock: other ? '' : value })
                        }}
                        required
                      />
                    </div>

                    {customBuildingBlock && <div className="rooms-form-group">
                      <label htmlFor="other-building-block">Other Building Block <span className="req-mark">*</span></label>
                      <input
                        id="other-building-block"
                        className="rooms-input"
                        type="text"
                        value={editingRoom.buildingBlock}
                        onChange={(e) => setEditingRoom({ ...editingRoom, buildingBlock: e.target.value })}
                        onBlur={() => setEditingRoom((room) => ({ ...room, buildingBlock: room.buildingBlock.trim() }))}
                        placeholder="Enter building block"
                        required
                      />
                    </div>}

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
                      <SearchableSelect
                        label="Room Type"
                        value={customRoomType ? '__other__' : editingRoom.roomType}
                        options={[...ROOM_TYPES, { value: '__other__', label: 'Others' }]}
                        placeholder="Select Room Type"
                        searchPlaceholder="Search room types..."
                        noOptionsMessage="No matching room types. Select Others to enter a custom type."
                        onChange={(value) => {
                          const other = value === '__other__'
                          setCustomRoomType(other)
                          setEditingRoom({ ...editingRoom, roomType: other ? '' : value })
                        }}
                        required
                      />
                    </div>

                    {customRoomType && <div className="rooms-form-group">
                      <label htmlFor="other-room-type">Other Room Type <span className="req-mark">*</span></label>
                      <input
                        id="other-room-type"
                        className="rooms-input"
                        type="text"
                        value={editingRoom.roomType}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomType: e.target.value })}
                        onBlur={() => setEditingRoom((room) => ({ ...room, roomType: room.roomType.trim() }))}
                        placeholder="Enter room type"
                        required
                      />
                    </div>}

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
                        <option value="" disabled>Select Availability Status</option>
                        <option value="Available">Available</option>
                        <option value="Allocated">Allocated</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Inactive">Inactive</option>
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
                    onClick={() => closeForm()}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="rooms-submit-btn" disabled={saving}>
                    <FiCheck /> {saving ? 'Saving...' : editingRoom.id ? 'Save Changes' : 'Create Room'}
                  </button>
                </div>
              </form>
            </section>
            <aside className="rooms-live-preview" aria-label="Room live preview">
              <header><span className="rooms-preview-dot" /> LIVE PREVIEW</header>
              <div className="rooms-preview-content">
                <div className="rooms-preview-identity">
                  {(editingRoom.roomName?.trim() || editingRoom.roomNumber?.trim() || editingRoom.roomType) && <div className="rooms-preview-icon"><FiGrid /></div>}
                  <div>
                    {editingRoom.roomName?.trim() && <h2>{editingRoom.roomName.trim()}</h2>}
                    {[editingRoom.roomNumber, editingRoom.roomType].some(value => String(value || '').trim()) && <p>{[editingRoom.roomNumber, editingRoom.roomType].filter(value => String(value || '').trim()).join(' · ')}</p>}
                  </div>
                </div>
                {editingRoom.status && <div className="rooms-preview-status"><StatusBadge status={editingRoom.status} /></div>}
                <dl>{[
                  ['Building Block', editingRoom.buildingBlock],
                  ['Floor', editingRoom.floor],
                  ['Seating Capacity', editingRoom.capacity ? editingRoom.capacity + ' seats' : ''],
                  ['Allocated Section', editingRoom.assignedSection],
                ].filter(([, value]) => String(value || '').trim()).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                {editingRoom.facilities?.length > 0 && <><h3>Facilities & Equipment</h3><div className="rooms-preview-facilities">{editingRoom.facilities.map(item => <span key={item}><FiCheck /> {item}</span>)}</div></>}
                {editingRoom.description?.trim() && <><h3>Remarks / Notes</h3><p className="rooms-preview-notes">{editingRoom.description}</p></>}
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  )

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
                <FiPlus /> Add Classroom
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
                  <th className="table-center" style={{ minWidth: '200px' }}>Room</th>
                  <th className="table-center" style={{ minWidth: '130px' }}>Room Type</th>
                  <th className="table-center" style={{ minWidth: '160px' }}>Building & Floor</th>
                  <th className="table-center" style={{ minWidth: '105px' }}>Capacity</th>
                  <th className="table-center" style={{ minWidth: '220px' }}>Section Allocation</th>
                  <th className="table-center" style={{ minWidth: '100px' }}>Status</th>
                  <th className="table-center" style={{ width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={FiGrid}
                        title="No rooms found"
                        description="Add a room or classroom to get started."
                        action="Add Room / Classroom"
                        onAction={handleOpenCreate}
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
                                  onClick={() => navigate(`/rooms-management/${room.id}`)}
                                  title={room.roomName}
                                  aria-label={`View details for ${room.roomName}`}
                                >
                                  {room.roomName}
                                </button>
                              </div>
                              <small className="room-dept-text" title={room.department || 'General / Shared'}>{room.department || 'General / Shared'}</small>
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
                        <td className="table-center" data-no-overflow-tooltip title="">
                          {room.assignedSection ? (
                            <div className="rooms-allocated-wrapper">
                              <div className="rooms-allocated-details">
                                <div className="rooms-allocated-top">
                                  <span className="rooms-allocated-badge">
                                    <FiCheckCircle /> {room.assignedSection}
                                  </span>
                                  {assignedStudentsCount > 0 && (
                                    <span className="rooms-student-count-chip">
                                      <FiUsers /> {assignedStudentsCount}
                                    </span>
                                  )}
                                </div>
                                {sectionMeta?.metaStr && (
                                  <small className="rooms-allocated-meta">
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
                      <span>{allocatingRoom.buildingBlock} | {allocatingRoom.floor}</span>
                      <span><FiUsers /> Capacity: {allocatingRoom.capacity} Seats</span>
                    </div>
                  </div>

                  <div className="rooms-form-group" style={{ marginTop: '16px' }}>
                    <label>Select Section to Allocate</label>
                    <SearchableSelect
                      label="Section"
                      value={selectedSectionId}
                      options={[
                        { id: '', value: '', name: '- None (Leave Available / Unallocated) -', code: 'Free Room' },
                        ...getSectionDropdownOptions(allocatingRoom.id),
                      ]}
                      onChange={(value) => setSelectedSectionId(value)}
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
                    <FiTrash2 />
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
                        <p>{deletingRoom.buildingBlock} | {deletingRoom.floor} | {deletingRoom.roomType}</p>
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
                      <div className="rooms-blocked-icon-box">
                        <FiSlash className="blocked-icon" />
                      </div>
                      <div className="rooms-blocked-text-content">
                        <strong>Deletion Blocked by Academic Governance</strong>
                        <p>
                          Room <strong>"{deletingRoom.roomName}"</strong> is currently allocated to Section <strong>"{deletingRoom.assignedSection}"</strong>{studentCount > 0 ? ` with ${studentCount} active enrolled student${studentCount === 1 ? '' : 's'}` : ''}.
                          You cannot delete this room while a section is allocated. Please deallocate or transfer the section to another room first.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="rooms-confirm-text">
                      Are you sure you want to permanently delete room <strong>"{deletingRoom.roomName}"</strong> ({deletingRoom.roomNumber})? This action cannot be undone.
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
                      className="rooms-submit-btn"
                      onClick={() => {
                        const target = deletingRoom
                        setDeletingRoom(null)
                        handleOpenDeallocate(target)
                      }}
                    >
                      <FiUnlock /> Deallocate Section First
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rooms-submit-btn is-delete-confirm"
                      title="Delete Room"
                      onClick={handleConfirmDeleteRoom}
                    >
                      <FiTrash2 /> Confirm & Delete Room
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
                  <div className="rooms-modal-header-icon">
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
                        <p>{deallocatingRoom.buildingBlock} | {deallocatingRoom.floor}</p>
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
