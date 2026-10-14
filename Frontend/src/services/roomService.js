import { selectedCollegeId, collegeStorageKey, createCollegeScope } from '../utils/collegeScope.js'
import eventBus, { ERP_EVENTS } from './eventBus'
import { roomApi } from '../api/apiEndpoints'

const STORAGE_KEY_ROOMS = 'pirnav_academic_rooms'

export const ROOM_TYPES = [
  'Lecture Hall',
  'Classroom',
  'Computer Lab',
  'Electronics Lab',
  'Mechanical Workshop',
  'Physics / Chemistry Lab',
  'Seminar Hall',
  'Tutorial Room',
  'Auditorium',
  'Drawing Hall',
]

export const BUILDING_BLOCKS = [
  'Main Academic Block',
  'Science & Technology Block',
  'Engineering Block A',
  'Engineering Block B',
  'Central Administration Block',
  'R&D Innovation Hub',
  'Workshop Complex',
]

export const FLOORS = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
]

export const ROOM_FACILITIES = [
  'Projector & Screen',
  'Smart Digital Board',
  'Air Conditioned (AC)',
  'High-Speed Wi-Fi',
  'Audio & Microphone System',
  'LAN Network Ports',
  'Computer Workstations',
  'Power Backup / UPS',
  'CCTV Surveillance',
]

const DEFAULT_ROOMS = []


export const normalizeRoom = (r) => {
  if (!r || typeof r !== 'object') return null
  const rawId = r.classroomId ?? r.ClassroomId ?? r.ClassRoomId ?? r.id ?? r.Id ?? r.roomId ?? r.RoomId ?? ''
  const isNumericId = Number.isInteger(Number(rawId)) && Number(rawId) > 0
  const classroomId = isNumericId ? Number(rawId) : rawId
  const roomNumber = r.roomNumber ?? r.RoomNumber ?? r.roomCode ?? r.RoomCode ?? r.code ?? r.Code ?? ''
  const roomName = r.roomName ?? r.RoomName ?? r.name ?? r.Name ?? roomNumber
  const buildingBlock = r.buildingBlock ?? r.BuildingBlock ?? r.building ?? r.Building ?? r.block ?? r.Block ?? 'Main Academic Block'
  const floor = r.floor ?? r.Floor ?? r.floorLevel ?? r.FloorLevel ?? 'Ground Floor'
  const roomType = r.roomType ?? r.RoomType ?? r.type ?? r.Type ?? 'Lecture Hall'
  const capacity = Number(r.capacity ?? r.Capacity ?? r.seatingCapacity ?? r.SeatingCapacity ?? 60) || 60
  let facilities = r.facilities ?? r.Facilities ?? r.amenities ?? r.Amenities ?? []
  if (typeof facilities === 'string') {
    facilities = facilities.split(',').map(s => s.trim()).filter(Boolean)
  }
  const department = r.department ?? r.Department ?? r.departmentName ?? r.DepartmentName ?? 'General / Shared'
  const assignedSection = r.assignedSection ?? r.AssignedSection ?? r.sectionName ?? r.SectionName ?? r.section ?? r.Section ?? ''
  const sectionId = r.sectionId ?? r.SectionId ?? null
  let status = r.status ?? r.Status ?? (assignedSection ? 'Allocated' : 'Available')
  if (typeof status === 'number' || typeof status === 'boolean') {
    status = status === 1 || status === true ? (assignedSection ? 'Allocated' : 'Available') : 'Inactive'
  }
  const description = r.description ?? r.Description ?? r.notes ?? r.Notes ?? r.remarks ?? r.Remarks ?? ''
  const createdAt = r.createdAt ?? r.CreatedAt ?? r.created_at ?? new Date().toISOString()
  const updatedAt = r.updatedAt ?? r.UpdatedAt ?? r.updated_at ?? new Date().toISOString()

  return {
    collegeId: r.collegeId ?? r.CollegeId ?? r.college_id ?? null,
    departmentId: r.departmentId ?? r.DepartmentId ?? null,
    id: String(classroomId || roomNumber),
    classroomId: classroomId || roomNumber,
    sectionId: sectionId ? Number(sectionId) : null,
    roomNumber,
    roomName,
    buildingBlock,
    floor,
    roomType,
    capacity,
    facilities: Array.isArray(facilities) ? facilities : [],
    department,
    status,
    assignedSection,
    description,
    createdAt,
    updatedAt,
  }
}

const roomPayload = (data, collegeId = selectedCollegeId()) => ({
  collegeId,
  departmentId: data.departmentId || null,
  roomNumber: String(data.roomNumber || data.code || '').trim().toUpperCase(),
  roomName: String(data.roomName || data.name || '').trim(),
  buildingBlock: data.buildingBlock || data.building || 'Main Academic Block',
  floor: data.floor || 'Ground Floor',
  roomType: data.roomType || 'Lecture Hall',
  capacity: Number(data.capacity) || 60,
  facilities: Array.isArray(data.facilities) ? data.facilities : typeof data.facilities === 'string' ? data.facilities.split(',').map(s => s.trim()).filter(Boolean) : [],
  department: data.department || 'General / Shared',
  status: data.status || 'Available',
  assignedSection: data.assignedSection || null,
  description: data.description || null,
})

class RoomService {
  getStoredRooms(collegeId = selectedCollegeId()) {
    try {
      const stored = localStorage.getItem(collegeStorageKey(STORAGE_KEY_ROOMS, collegeId))
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return createCollegeScope(collegeId)(parsed.map(normalizeRoom).filter(Boolean))
        }
      }
    } catch (e) {
      console.error('Error reading rooms from storage', e)
    }
    this.saveRooms(DEFAULT_ROOMS, collegeId)
    return DEFAULT_ROOMS.map(normalizeRoom)
  }

  async getRooms(params = {}) {
    const collegeId = selectedCollegeId()
    if (!collegeId) return []
    try {
      const apiRooms = await roomApi.getAll({ ...params, collegeId })
      if (!Array.isArray(apiRooms)) throw new Error('Invalid rooms response.')
      const cached = this.getStoredRooms(collegeId)
      const normalized = apiRooms.map(normalizeRoom).filter(Boolean).map(room => {
        // Preserve ownership confirmed when this college created the room.
        const known = cached.find(item => item.id === room.id)
        if (!known) return room

        const apiHasAllocation = Boolean(room.assignedSection || room.sectionId)
        const cachedHasAllocation = Boolean(known.assignedSection || known.sectionId)
        const mergedRoom = !apiHasAllocation && cachedHasAllocation
          ? {
              ...room,
              assignedSection: known.assignedSection,
              sectionId: known.sectionId,
              status: 'Allocated',
              updatedAt: known.updatedAt || room.updatedAt,
            }
          : room

        return mergedRoom.collegeId || !known.collegeId
          ? mergedRoom
          : { ...mergedRoom, collegeId: known.collegeId }
      })
      const scoped = createCollegeScope(collegeId)(normalized)
      this.saveRooms(scoped, collegeId)
      return scoped
    } catch (err) {
      console.warn('Backend rooms API unavailable, using this college cache:', err?.message || err)
      return this.getStoredRooms(collegeId)
    }
  }

  async getOptions() {
    try {
      const options = await roomApi.getOptions()
      if (options && typeof options === 'object') return options
    } catch (err) {
      console.warn('Backend room options API unavailable, using default options:', err?.message || err)
    }
    return {
      buildingBlocks: BUILDING_BLOCKS,
      roomTypes: ROOM_TYPES,
      floors: FLOORS,
      facilities: ROOM_FACILITIES,
    }
  }

  saveRooms(rooms, collegeId = selectedCollegeId()) {
    try {
      localStorage.setItem(collegeStorageKey(STORAGE_KEY_ROOMS, collegeId), JSON.stringify(createCollegeScope(collegeId)(rooms)))
      if (eventBus && ERP_EVENTS) {
        eventBus.emit(ERP_EVENTS.DATA_CHANGED, { entity: 'rooms', count: rooms.length })
      }
    } catch (e) {
      console.error('Error saving rooms to storage', e)
    }
  }

  async getRoomById(id) {
    const collegeId = selectedCollegeId()
    try {
      const res = await roomApi.getById(id)
      if (res) {
        const room = normalizeRoom(res)
        const known = this.getStoredRooms(collegeId).find(item => item.id === room.id)
        return createCollegeScope(collegeId)([{ ...room, collegeId: room.collegeId || known?.collegeId }])[0] || null
      }
    } catch (err) {
      console.warn(`Backend room ${id} detail failed, falling back to local:`, err?.message || err)
    }
    const rooms = this.getStoredRooms(collegeId)
    return rooms.find((r) => String(r.id) === String(id) || String(r.roomNumber) === String(id)) || null
  }

  async createRoom(data) {
    const collegeId = selectedCollegeId()
    const payload = roomPayload(data, collegeId)
    let createdRoom = null
    try {
      const apiRes = await roomApi.create(payload)
      if (apiRes) createdRoom = normalizeRoom({ ...payload, ...apiRes, collegeId })
    } catch (err) {
      console.warn('Backend create room API failed or fallback:', err?.message || err)
    }

    if (!createdRoom) {
      const id = data.id || `ROOM-${String(Date.now()).slice(-4)}`
      createdRoom = normalizeRoom({
        ...payload,
        id,
        classroomId: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    const rooms = this.getStoredRooms(collegeId)
    const updated = [createdRoom, ...rooms.filter(r => r.id !== createdRoom.id && r.roomNumber !== createdRoom.roomNumber)]
    this.saveRooms(updated, collegeId)
    return createdRoom
  }

  async updateRoom(id, data) {
    const collegeId = selectedCollegeId()
    const payload = roomPayload(data, collegeId)
    let updatedRoom = null
    try {
      const apiRes = await roomApi.update(id, payload)
      if (apiRes) updatedRoom = normalizeRoom({ ...payload, ...apiRes, collegeId })
    } catch (err) {
      console.warn(`Backend update room ${id} failed or fallback:`, err?.message || err)
    }

    const rooms = this.getStoredRooms(collegeId)
    const index = rooms.findIndex((r) => String(r.id) === String(id) || String(r.roomNumber) === String(id))

    if (!updatedRoom) {
      if (index === -1) throw new Error('Room not found.')
      updatedRoom = normalizeRoom({
        ...rooms[index],
        ...payload,
        updatedAt: new Date().toISOString(),
      })
    }

    if (index !== -1) {
      rooms[index] = updatedRoom
    } else {
      rooms.unshift(updatedRoom)
    }
    this.saveRooms(rooms, collegeId)
    return updatedRoom
  }

  async deleteRoom(id) {
    const collegeId = selectedCollegeId()
    try {
      await roomApi.delete(id)
    } catch (err) {
      console.warn(`Backend delete room ${id} failed or fallback:`, err?.message || err)
    }
    const rooms = this.getStoredRooms(collegeId)
    const filtered = rooms.filter((r) => String(r.id) !== String(id) && String(r.classroomId) !== String(id) && String(r.roomNumber) !== String(id))
    this.saveRooms(filtered, collegeId)
    return true
  }

  async allocateRoom(roomId, sectionName, sectionId) {
    const collegeId = selectedCollegeId()
    try {
      if (sectionName && sectionName.trim()) {
        const payload = sectionId ? { sectionId: Number(sectionId), sectionName: sectionName.trim() } : { sectionName: sectionName.trim() }
        await roomApi.allocate(roomId, payload)
      } else {
        await roomApi.deallocate(roomId)
      }
    } catch (err) {
      console.warn(`Backend allocate room ${roomId} failed or fallback:`, err?.message || err)
    }

    const rooms = this.getStoredRooms(collegeId)
    const index = rooms.findIndex((r) => String(r.id) === String(roomId) || String(r.roomNumber) === String(roomId) || String(r.classroomId) === String(roomId))
    if (index !== -1) {
      rooms[index].assignedSection = sectionName || ''
      rooms[index].sectionId = sectionId ? Number(sectionId) : null
      rooms[index].status = sectionName ? 'Allocated' : 'Available'
      rooms[index].updatedAt = new Date().toISOString()
      this.saveRooms(rooms, collegeId)
    }
  }
}

const roomService = new RoomService()
export default roomService

