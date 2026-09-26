import eventBus, { ERP_EVENTS } from './eventBus'

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

const DEFAULT_ROOMS = [
  {
    id: 'ROOM-101',
    roomNumber: 'LH-101',
    roomName: 'Lecture Hall 101',
    buildingBlock: 'Main Academic Block',
    floor: '1st Floor',
    roomType: 'Lecture Hall',
    capacity: 70,
    facilities: ['Projector & Screen', 'Smart Digital Board', 'High-Speed Wi-Fi', 'Audio & Microphone System'],
    department: 'General / Shared',
    status: 'Available',
    assignedSection: '',
    description: 'Primary lecture room with multimedia projector and amphitheater tiered seating.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ROOM-102',
    roomNumber: 'LH-102',
    roomName: 'Lecture Hall 102',
    buildingBlock: 'Main Academic Block',
    floor: '1st Floor',
    roomType: 'Lecture Hall',
    capacity: 70,
    facilities: ['Projector & Screen', 'High-Speed Wi-Fi'],
    department: 'General / Shared',
    status: 'Available',
    assignedSection: '',
    description: 'Standard tiered classroom suitable for first-year and core branch classes.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ROOM-201',
    roomNumber: 'CSE-LAB-1',
    roomName: 'Advanced Computing & AI Lab',
    buildingBlock: 'Science & Technology Block',
    floor: '2nd Floor',
    roomType: 'Computer Lab',
    capacity: 65,
    facilities: ['Computer Workstations', 'LAN Network Ports', 'Air Conditioned (AC)', 'Projector & Screen', 'High-Speed Wi-Fi'],
    department: 'Computer Science and Engineering',
    status: 'Available',
    assignedSection: '',
    description: 'Equipped with 65 high-end developer workstations and gigabit network switches.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ROOM-202',
    roomNumber: 'ECE-LAB-1',
    roomName: 'Digital Signal Processing & VLSI Lab',
    buildingBlock: 'Science & Technology Block',
    floor: '2nd Floor',
    roomType: 'Electronics Lab',
    capacity: 60,
    facilities: ['LAN Network Ports', 'Air Conditioned (AC)', 'Power Backup / UPS'],
    department: 'Electronics and Communication Engineering',
    status: 'Available',
    assignedSection: '',
    description: 'Equipped with FPGA development boards, oscilloscopes, and VLSI test benches.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ROOM-301',
    roomNumber: 'SEM-HALL-A',
    roomName: 'Auditorium & Seminar Hall A',
    buildingBlock: 'Central Administration Block',
    floor: '3rd Floor',
    roomType: 'Seminar Hall',
    capacity: 160,
    facilities: ['Projector & Screen', 'Smart Digital Board', 'Air Conditioned (AC)', 'Audio & Microphone System', 'High-Speed Wi-Fi'],
    department: 'General / Shared',
    status: 'Available',
    assignedSection: '',
    description: 'Executive conference and guest lecture hall with acoustic wall panelling.',
    createdAt: new Date().toISOString(),
  },
]

class RoomService {
  getRooms() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROOMS)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error('Error reading rooms from storage', e)
    }
    this.saveRooms(DEFAULT_ROOMS)
    return DEFAULT_ROOMS
  }

  saveRooms(rooms) {
    try {
      localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms))
      if (eventBus && ERP_EVENTS) {
        eventBus.emit(ERP_EVENTS.DATA_CHANGED, { entity: 'rooms', count: rooms.length })
      }
    } catch (e) {
      console.error('Error saving rooms to storage', e)
    }
  }

  getRoomById(id) {
    const rooms = this.getRooms()
    return rooms.find((r) => String(r.id) === String(id) || String(r.roomNumber) === String(id)) || null
  }

  createRoom(data) {
    const rooms = this.getRooms()
    const id = data.id || `ROOM-${String(Date.now()).slice(-4)}`
    const newRoom = {
      id,
      roomNumber: data.roomNumber ? data.roomNumber.trim().toUpperCase() : `RM-${id}`,
      roomName: data.roomName ? data.roomName.trim() : 'New Room',
      buildingBlock: data.buildingBlock || BUILDING_BLOCKS[0],
      floor: data.floor || FLOORS[0],
      roomType: data.roomType || ROOM_TYPES[0],
      capacity: Number(data.capacity) || 60,
      facilities: Array.isArray(data.facilities) ? data.facilities : [],
      department: data.department || 'General / Shared',
      status: data.status || 'Available',
      assignedSection: data.assignedSection || '',
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [newRoom, ...rooms]
    this.saveRooms(updated)
    return newRoom
  }

  updateRoom(id, data) {
    const rooms = this.getRooms()
    const index = rooms.findIndex((r) => String(r.id) === String(id))
    if (index === -1) throw new Error('Room not found.')

    const updatedRoom = {
      ...rooms[index],
      ...data,
      roomNumber: data.roomNumber ? data.roomNumber.trim().toUpperCase() : rooms[index].roomNumber,
      capacity: Number(data.capacity) || rooms[index].capacity,
      facilities: Array.isArray(data.facilities) ? data.facilities : rooms[index].facilities,
      updatedAt: new Date().toISOString(),
    }
    rooms[index] = updatedRoom
    this.saveRooms(rooms)
    return updatedRoom
  }

  deleteRoom(id) {
    const rooms = this.getRooms()
    const filtered = rooms.filter((r) => String(r.id) !== String(id))
    this.saveRooms(filtered)
    return true
  }

  allocateRoom(roomId, sectionName) {
    const rooms = this.getRooms()
    const index = rooms.findIndex((r) => String(r.id) === String(roomId) || String(r.roomNumber) === String(roomId))
    if (index !== -1) {
      rooms[index].assignedSection = sectionName || ''
      rooms[index].status = sectionName ? 'Allocated' : 'Available'
      this.saveRooms(rooms)
    }
  }
}

const roomService = new RoomService()
export default roomService
