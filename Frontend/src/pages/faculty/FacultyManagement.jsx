import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiArrowLeft, FiBriefcase, FiCheckCircle, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiFilter, FiPlus, FiSearch, FiUser, FiUsers, FiClock, FiBookOpen, FiMapPin, FiX, FiTrash2, FiFileText } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import ExportMenu from '../../components/ExportMenu'
import FilterPanel from '../../components/FilterPanel'
import StatusBadge from '../../components/StatusBadge'
import TablePagination from '../../components/TablePagination'
import SearchableSelect from '../../components/SearchableSelect'
import CompactSummary from '../../components/CompactSummary'
import { academicYearApi, branchApi, courseApi, departmentApi, facultyMasterApi, sectionApi } from '../../api/apiEndpoints'
import { attendancePayload, requiredNumber } from '../../services/facultyContracts'
import { downloadServerExport } from '../../utils/exportUtils'
import { getDefaultAcademicYear } from '../../utils/academicYearUtils'
import { FacultyDocuments, FacultyStatus, ApiAssignmentDialog } from './FacultyApiPanels'
import facultyService, { normalizeFaculty, mergeFacultyData } from '../../services/facultyService'
import './FacultyManagement.css'
import './FacultyAttendance.css'
import { localAttendanceDate, loadDailyAttendancePeriod, attendanceStatusLabel, normalizeAttendanceRow, combineAttendance } from '../../utils/facultyAttendance'

const PAGE_SIZE = 5
const WORKLOAD_LIMITS = { under: 12, normal: 20 }
const departments = ['Computer Science & Engineering', 'Electronics & Communication', 'Electrical & Electronics', 'Mechanical Engineering', 'Civil Engineering']
// Kept as an empty export for older screens; faculty data must come from the API.
export const readStoredFaculty = () => []
export const readStoredAttendanceRecords = () => []
export const facultySeed = []
const statuses = ['Working', 'On Leave', 'Resigned', 'Retired']
const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Senior Lecturer', 'Lecturer', 'Lab Instructor', 'Visiting Faculty']
const employmentTypes = ['Permanent', 'Contract', 'Visiting', 'Guest']
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'LOP', 'Not Marked']
const ATTENDANCE_PERCENTAGE_NOTE = 'Attendance percentage is calculated using marked attendance records only.'
const DEFAULT_ATTENDANCE_WINDOW = { checkIn: '09:00', checkOut: '17:00' }
const formatMinutes = minutes => {
  const total = Number(minutes) || 0
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (!hours && !mins) return '0h'
  if (!mins) return `${hours}h`
  return `${hours}h ${mins}m`
}
const normalizeAttendanceDate = value => {
  if (!value) return ''
  const valueString = String(value).trim()
  if (!valueString) return ''
  const clean = valueString.includes('T') ? valueString.split('T')[0] : valueString
  const [year, month, day] = clean.split('-')
  if (!year || !month || !day) return clean
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
const normalizeAttendanceStatus = value => {
  const key = String(value ?? '').trim().replace(/[\s_-]+/g, '').toLowerCase()
  const statuses = {
    p: 'Present', present: 'Present',
    a: 'Absent', absent: 'Absent',
    l: 'Late', late: 'Late',
    hd: 'Half Day', halfday: 'Half Day',
    ol: 'On Leave', onleave: 'On Leave', leave: 'On Leave',
    lop: 'LOP', lossofpay: 'LOP',
    notmarked: 'Not Marked', unmarked: 'Not Marked', pending: 'Not Marked',
  }
  return statuses[key] || 'Not Marked'
}
const mergeAttendanceRecords = (faculty, records = []) => {
  const validFaculty = new Set((faculty || []).map(item => String(item.id)))
  const normalized = (Array.isArray(records) ? records : []).filter(record => validFaculty.has(String(record.facultyId))).map(record => ({
    ...record,
    facultyId: String(record.facultyId),
    date: normalizeAttendanceDate(record.date),
    status: normalizeAttendanceStatus(record.status ?? record.attendanceStatus),
    checkIn: record.checkIn || '—',
    checkOut: record.checkOut || '—',
    remarks: record.remarks || '—',
    source: record.source || 'Manual',
  }))
  // The list and daily views can both contain the same faculty/date. Keep one
  // record per cell and always prefer the saved marked status over a generated
  // "Not Marked" daily placeholder.
  const byFacultyAndDate = new Map()
  for (const record of normalized) {
    const key = `${record.facultyId}|${record.date}`
    const current = byFacultyAndDate.get(key)
    if (!current || (current.status === 'Not Marked' && record.status !== 'Not Marked') || (!current.attendanceId && record.attendanceId)) {
      byFacultyAndDate.set(key, record)
    }
  }
  return [...byFacultyAndDate.values()]
}
const attendanceDatesInRange = (from, to) => {
  if (!from || !to || from > to) return []
  const values = []
  for (const value = new Date(`${from}T00:00:00`); value <= new Date(`${to}T00:00:00`); value.setDate(value.getDate() + 1)) {
    values.push(normalizeAttendanceDate(value.toISOString().slice(0, 10)))
  }
  return values
}
const mondayOf = value => {
  const date = new Date(String(value || today()) + 'T00:00:00')
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
const calculateWorkingMinutes = values => {
  if (!values || values.status === 'Not Marked' || ['Absent', 'On Leave'].includes(values.status)) return 0
  const defaultWindow = DEFAULT_ATTENDANCE_WINDOW
  const checkInValue = values.checkIn && values.checkIn !== '—' ? values.checkIn : defaultWindow.checkIn
  const checkOutValue = values.checkOut && values.checkOut !== '—' ? values.checkOut : defaultWindow.checkOut
  const checkIn = checkInValue ? checkInValue.split(':').map(Number) : null
  const checkOut = checkOutValue ? checkOutValue.split(':').map(Number) : null
  if (checkIn && checkOut && ((checkOut[0] > checkIn[0]) || (checkOut[0] === checkIn[0] && checkOut[1] > checkIn[1]))) {
    const start = checkIn[0] * 60 + checkIn[1]
    const end = checkOut[0] * 60 + checkOut[1]
    return Math.max(0, end - start)
  }
  if (values.status === 'Half Day') return 240
  if (['Present', 'Late'].includes(values.status)) return 480
  return 0
}
const getAttendanceDisplayHours = row => {
  if (!row || !['Present', 'Late', 'Half Day'].includes(row.status)) return '—'
  const minutes = Number(row.workingMinutes ?? calculateWorkingMinutes(row) ?? 0)
  return minutes > 0 ? formatMinutes(minutes) : '—'
}
const resolveAttendanceRecords = (records, faculty) => {
  const facultyMap = new Map((faculty || []).map(item => [String(item.id), item]))
  return mergeAttendanceRecords(faculty, records).map(record => {
    const matched = facultyMap.get(String(record.facultyId)) || {
      id: record.facultyId,
      fullName: 'Unknown Faculty',
      employeeId: 'N/A',
      department: 'N/A',
      designation: 'N/A',
    }
    const workingMinutes = typeof record.workingMinutes === 'number' ? record.workingMinutes : calculateWorkingMinutes(record)
    const status = normalizeAttendanceStatus(record.status ?? record.attendanceStatus)
    const normalizedCheckIn = ['Present', 'Late', 'Half Day'].includes(status) && record.checkIn && record.checkIn !== '—' ? record.checkIn : (['Present', 'Late', 'Half Day'].includes(status) ? DEFAULT_ATTENDANCE_WINDOW.checkIn : '—')
    const normalizedCheckOut = ['Present', 'Late', 'Half Day'].includes(status) && record.checkOut && record.checkOut !== '—' ? record.checkOut : (['Present', 'Late', 'Half Day'].includes(status) ? DEFAULT_ATTENDANCE_WINDOW.checkOut : '—')
    return {
      ...record,
      faculty: matched,
      facultyId: String(record.facultyId),
      hours: getAttendanceDisplayHours({ ...record, status, workingMinutes, checkIn: normalizedCheckIn, checkOut: normalizedCheckOut }),
      workingMinutes,
      status,
      checkIn: ['Present', 'Late', 'Half Day'].includes(status) ? normalizedCheckIn : '—',
      checkOut: ['Present', 'Late', 'Half Day'].includes(status) ? normalizedCheckOut : '—',
      remarks: record.remarks || '—',
      source: record.source || 'Manual',
      synthetic: false,
    }
  })
}
const matchingDate = (rowDate, from, to) => {
  if (!rowDate) return true
  if (from && rowDate < from) return false
  if (to && rowDate > to) return false
  return true
}
const dailyAttendanceRows = (records, faculty, filters = {}) => {
  const targetDate = normalizeAttendanceDate(filters.date || today())
  const filteredRecords = (Array.isArray(records) ? records : []).filter(record => String(record.date) === targetDate)
  return (faculty || []).filter(item => !filters.department || item.department === filters.department).map(item => {
    const facultyId = String(item.id)
    const current = filteredRecords.find(record => String(record.facultyId) === facultyId)
    const status = current?.status || 'Not Marked'
    const workingMinutes = current?.workingMinutes ?? calculateWorkingMinutes(current || {})
    const row = {
      id: current?.attendanceId || current?.id || '',
      attendanceId: current?.attendanceId || null,
      facultyId,
      faculty: item,
      date: targetDate,
      status,
      checkIn: ['Present', 'Late', 'Half Day'].includes(status) ? (current?.checkIn && current.checkIn !== '—' ? current.checkIn : DEFAULT_ATTENDANCE_WINDOW.checkIn) : '—',
      checkOut: ['Present', 'Late', 'Half Day'].includes(status) ? (current?.checkOut && current.checkOut !== '—' ? current.checkOut : DEFAULT_ATTENDANCE_WINDOW.checkOut) : '—',
      remarks: current?.remarks || '—',
      hours: getAttendanceDisplayHours({ ...current, status, workingMinutes, checkIn: ['Present', 'Late', 'Half Day'].includes(status) ? (current?.checkIn && current.checkIn !== '—' ? current.checkIn : DEFAULT_ATTENDANCE_WINDOW.checkIn) : '—', checkOut: ['Present', 'Late', 'Half Day'].includes(status) ? (current?.checkOut && current.checkOut !== '—' ? current.checkOut : DEFAULT_ATTENDANCE_WINDOW.checkOut) : '—' }),
      synthetic: !current?.attendanceId,
      source: current?.source || 'Manual',
    }
    return row
  }).filter(row => {
    const statusOk = !filters.status || row.status === filters.status
    const search = (filters.search || '').trim().toLowerCase()
    const text = `${row.faculty.employeeId} ${row.faculty.fullName}`.toLowerCase()
    const searchOk = !search || text.includes(search)
    return statusOk && searchOk
  })
}
const filterAttendanceRecords = (records, filters = {}) => {
  const search = (filters.search || '').trim().toLowerCase()
  return (Array.isArray(records) ? records : []).filter(row => {
    const faculty = row.faculty || {}
    const statusOk = !filters.status || row.status === filters.status
    const departmentOk = !filters.department || (faculty.department || '').toLowerCase() === String(filters.department).toLowerCase()
    const facultyOk = !filters.facultyId || String(row.facultyId) === String(filters.facultyId)
    const dateOk = matchingDate(String(row.date), filters.from, filters.to)
    const searchOk = !search || `${faculty.employeeId || ''} ${faculty.fullName || ''}`.toLowerCase().includes(search)
    return statusOk && departmentOk && facultyOk && dateOk && searchOk
  }).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
}
const attendancePeriod = (reportType, report) => {
  const dateValue = report?.date || today()
  if (reportType === 'daily') return { from: normalizeAttendanceDate(dateValue), to: normalizeAttendanceDate(dateValue) }
  if (reportType === 'weekly') {
    const start = new Date((report?.weekStart || mondayOf(today())) + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { from: normalizeAttendanceDate(localAttendanceDate(start)), to: normalizeAttendanceDate(localAttendanceDate(end)) }
  }
  const year = Number(report?.year || new Date().getFullYear())
  const month = Number(report?.month || new Date().getMonth() + 1)
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  return { from: normalizeAttendanceDate(localAttendanceDate(first)), to: normalizeAttendanceDate(localAttendanceDate(last)) }
}
const summarizeAttendance = rows => {
  const base = { total: rows.length, Present: 0, Absent: 0, Late: 0, 'Half Day': 0, 'On Leave': 0, LOP: 0, 'Not Marked': 0 }
  for (const row of rows || []) {
    const key = row.status || 'Not Marked'
    base[key] = (base[key] || 0) + 1
  }
  const marked = rows.filter(row => row.status && row.status !== 'Not Marked').length
  const counted = rows.filter(row => ['Present', 'Late', 'Half Day'].includes(row.status)).length
  const percentage = marked ? Math.round((counted / marked) * 100) : 0
  return { ...base, percentage: `${percentage}%`, hours: rows.reduce((sum, row) => sum + (Number(row.workingMinutes || 0) || 0), 0) }
}
const aggregateFacultyAttendance = (rows, label = '') => {
  const groups = new Map()
  for (const row of rows || []) {
    const key = String(row.facultyId)
    if (!groups.has(key)) {
      groups.set(key, {
        facultyId: key,
        faculty: row.faculty,
        total: 0,
        Present: 0,
        Absent: 0,
        Late: 0,
        'Half Day': 0,
        'On Leave': 0,
        LOP: 0,
        hours: 0,
      })
    }
    const group = groups.get(key)
    group.total += 1
    const status = row.status || 'Not Marked'
    if (status in group) group[status] += 1
    group.hours += Number(row.workingMinutes || 0)
  }
  return [...groups.values()].map(group => {
    const marked = group.total
    const counted = group.Present + group.Late + group['Half Day']
    const percentage = marked ? Math.round((counted / marked) * 100) : 0
    return {
      ...group,
      percentage: `${percentage}%`,
      hours: formatMinutes(group.hours),
      total: group.total,
    }
  })
}
const attendanceExportRows = (rows, aggregated = false) => {
  if (aggregated) {
    return (rows || []).map(row => ({
      employeeId: row.faculty?.employeeId || row.employeeId || '',
      faculty: row.faculty?.fullName || row.facultyName || '',
      department: row.faculty?.department || '',
      present: row.Present || 0,
      absent: row.Absent || 0,
      late: row.Late || 0,
      halfDay: row['Half Day'] || 0,
      onLeave: row['On Leave'] || 0,
      totalHours: row.hours || '0h',
      attendancePercentage: row.percentage || '0%',
    }))
  }
  return (rows || []).map(row => ({
    date: row.date || '',
    employeeId: row.faculty?.employeeId || row.employeeId || '',
    faculty: row.faculty?.fullName || row.facultyName || '',
    department: row.faculty?.department || '',
    status: row.status || 'Not Marked',
    checkIn: row.checkIn || '—',
    checkOut: row.checkOut || '—',
    workingHours: row.hours || '0h',
    remarks: row.remarks || '—',
    source: row.source || 'Manual',
  }))
}
const attendanceExportColumns = dailyMode => [
  { label: 'Date', value: row => row.date || '' },
  { label: 'Employee ID', value: row => row.employeeId || '' },
  { label: 'Faculty', value: row => row.faculty || '' },
  { label: 'Department', value: row => row.department || '' },
  { label: 'Status', value: row => row.status || 'Not Marked' },
  { label: 'Check In', value: row => row.checkIn || '—' },
  { label: 'Check Out', value: row => row.checkOut || '—' },
  { label: 'Working Hours', value: row => row.workingHours || row.hours || '0h' },
  { label: 'Remarks', value: row => row.remarks || '—' },
  ...(dailyMode ? [{ label: 'Source', value: row => row.source || 'Manual' }] : []),
]
const aggregateExportColumns = reportType => [
  { label: 'Employee ID', value: row => row.employeeId || '' },
  { label: 'Faculty', value: row => row.faculty || '' },
  { label: 'Department', value: row => row.department || '' },
  { label: 'Days With Data', value: row => row.total || 0 },
  { label: 'Present', value: row => row.present || 0 },
  { label: 'Absent', value: row => row.absent || 0 },
  { label: 'Late', value: row => row.late || 0 },
  { label: 'Half Day', value: row => row.halfDay || 0 },
  { label: 'On Leave', value: row => row.onLeave || 0 },
  { label: 'Total Hours', value: row => row.totalHours || row.hours || '0h' },
  { label: 'Attendance %', value: row => row.attendancePercentage || row.percentage || '0%' },
]
const attendanceFilename = (prefix, period, department) => {
  const cleanPrefix = String(prefix || 'attendance').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') || 'attendance'
  const cleanPeriod = String(period || 'all').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().replace(/^-|-$/g, '')
  const cleanDept = String(department || '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().replace(/^-|-$/g, '')
  return [cleanPrefix, cleanPeriod, cleanDept].filter(Boolean).join('-') || 'attendance'
}
const sections = [
  { title: 'Personal Details', heading: 'Personal Information', icon: FiUser, description: 'Identity, photograph and primary contact information.', fields: [
    ['collegeId', 'College Name', 'college', true], ['employeeId', 'Faculty Code', 'readonly'], ['fullName', 'Faculty Full Name', 'text', true],
    ['gender', 'Gender', ['Male', 'Female', 'Other'], true], ['dob', 'Date of Birth', 'date', true],
    ['mobile', 'Mobile Number', 'tel', true], ['email', 'Email', 'email', true],
  ] },
  { title: 'Employment', heading: 'Employment Information', icon: FiBriefcase, description: 'Faculty designation, department and employment information.', fields: [
    ['departmentId', 'Department', 'department', true], ['designation', 'Designation', designations, true],
    ['employmentType', 'Employment Type', employmentTypes, true],
    ['joiningDate', 'Date of Joining', 'date', true], ['employeeCategory', 'Employee Category', ['Teaching', 'Non-Teaching', 'Others']],
    ['experience', 'Total Experience (Years)', 'number'],
  ] },
  { title: 'Academic Details', heading: 'Academic Information', icon: FiBookOpen, description: 'Qualifications, specialization and professional experience.', fields: [
    ['qualification', 'Highest Qualification', ['Ph.D', 'M.Tech', 'M.E', 'MCA', 'M.Sc', 'B.Tech', 'Other'], true],
    ['specialization', 'Specialization', 'text'], ['university', 'University / Institution', 'text'],
    ['passingYear', 'Year of Passing', 'number'], ['teachingExperience', 'Teaching Experience (Years)', 'number'], ['industryExperience', 'Industry Experience (Years)', 'number'],
  ] },
  { title: 'Contact', heading: 'Contact Information', icon: FiMapPin, description: 'Address and emergency contacts. These details are optional.', fields: [
    ['alternateMobile', 'Alternate Mobile', 'tel'], ['personalEmail', 'Personal Email', 'email'],
    ['address', 'Address', 'textarea'], ['city', 'City', 'text'], ['state', 'State', 'text'], ['pincode', 'Pincode', 'text'],
    ['emergencyName', 'Emergency Contact Name', 'text'], ['emergencyMobile', 'Emergency Contact Number', 'tel'], ['relationship', 'Relationship', 'text'],
  ] },
]
const FACULTY_DOCUMENTS = [
  ['aadhaar', 'Aadhaar Card'],
  ['pan', 'PAN Card'],
  ['qualificationCert', 'Highest Qualification / Degree Certificate'],
  ['experienceCert', 'Previous Experience / Relieving Certificate'],
  ['resume', 'Resume / Curriculum Vitae (CV)'],
  ['photoId', 'Passport Size Photo / ID Proof'],
  ['joiningReport', 'Joining Report / Appointment Order'],
]
const experienceKeys = ['experience', 'teachingExperience', 'industryExperience']
const today = () => {
  const date = new Date()
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
const years = value => value === '' || value == null ? '—' : (parseFloat(value) || 0) + ' Years'
const normalize = (row = {}) => {
  const safeRow = row && typeof row === 'object' ? row : {}
  return { ...Object.fromEntries(sections.flatMap(s => s.fields.map(([key]) => [key, '']))), employeeCategoryOther: safeRow.employeeCategoryOther || '', employmentStatus: 'Working', documents: safeRow.documents || {}, photo: '', assignments: [], ...safeRow, employmentStatus: safeRow.employmentStatus || 'Working', documents: safeRow.documents || {}, assignments: Array.isArray(safeRow.assignments) ? safeRow.assignments : [], collegeName: safeRow.collegeName || '', experience: safeRow.experience == null ? '' : String(parseFloat(safeRow.experience) || 0) }
}
const clean = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
const workload = row => {
  const assignments = row?.assignments || []
  const hours = assignments.reduce((sum, item) => sum + Number(item.weeklyHours || 0), 0)
  const subjects = new Set(assignments.filter(a => a.subjectCode).map(a => a.subjectCode.toUpperCase())).size
  return { hours, subjects, status: hours === 0 ? 'Unassigned' : hours <= WORKLOAD_LIMITS.under ? 'Under Load' : hours <= WORKLOAD_LIMITS.normal ? 'Normal Load' : 'Over Load' }
}
const exportColumns = [['employeeId', 'Employee ID'], ['fullName', 'Faculty Name'], ['department', 'Department'], ['designation', 'Designation'], ['qualification', 'Qualification'], ['experience', 'Experience'], ['mobile', 'Mobile'], ['email', 'Email'], ['employmentType', 'Employment Type'], ['employmentStatus', 'Employment Status']].map(([value, label]) => ({ label, value: value === 'experience' ? row => years(row.experience) : value }))

function validateFaculty(data, rows) {
  const errors = {}
  sections.forEach(section => section.fields.forEach(([key, label, type, required]) => {
    if (required && !String(data[key] ?? '').trim()) errors[key] = label + ' is required.'
    if (data[key] && Array.isArray(type) && !type.includes(data[key])) errors[key] = 'Select a valid ' + label.toLowerCase() + '.'
  }))
  if (['Others', 'Other'].includes(data.employeeCategory) && !String(data.employeeCategoryOther || '').trim()) errors.employeeCategoryOther = 'Specify the employee category.'
  if (!data.employeeId || rows.some(row => row.id !== data.id && (row.employeeId || row.facultyCode) === data.employeeId)) errors.employeeId = 'Faculty Code must be unique.'
  if (!data.fullName?.trim()) errors.fullName = 'Faculty full name is required.'
  else if (data.fullName.trim().length < 2 || !/^[\p{L}\p{M} .?'-]+$/u.test(data.fullName.trim())) errors.fullName = 'Enter a valid name using letters (at least 2 characters).'
  for (const key of ['collegeId', 'departmentId']) if (!Number.isSafeInteger(Number(data[key])) || Number(data[key]) <= 0) errors[key] = 'Select a valid ' + (key === 'collegeId' ? 'college.' : 'department.')
  for (const key of ['email', 'personalEmail']) if (data[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[key].trim())) errors[key] = 'Enter a valid email address.'
  if (rows.some(row => row.id !== data.id && String(row.email || '').trim().toLowerCase() === data.email?.trim().toLowerCase())) errors.email = 'A faculty member with this email already exists.'
  for (const key of ['mobile', 'alternateMobile', 'emergencyMobile']) if (data[key] && !/^\d{10}$/.test(String(data[key]).trim())) errors[key] = 'Enter exactly 10 numeric digits.'
  for (const key of ['dob', 'joiningDate']) if (data[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(data[key]) || !Number.isFinite(Date.parse(data[key])) || new Date(data[key]).toISOString().slice(0, 10) !== data[key] || data[key] > today())) errors[key] = 'Enter a valid date that is not in the future.'
  if (data.dob && data.joiningDate && data.joiningDate <= data.dob) errors.joiningDate = 'Joining date must be after date of birth.'
  for (const key of experienceKeys) if (data[key] !== '' && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0 || Number(data[key]) > 80)) errors[key] = 'Enter experience between 0 and 80 years.'
  if (data.passingYear && (!/^\d{4}$/.test(data.passingYear) || Number(data.passingYear) < 1950 || Number(data.passingYear) > new Date().getFullYear())) errors.passingYear = 'Enter a four-digit year from 1950 to the current year.'
  if (data.pincode && !/^\d{6}$/.test(String(data.pincode).trim())) errors.pincode = 'Enter a 6-digit numeric pincode.'
  const address = String(data.address || '').trim()
  if (address && (address.length < 10 || address.length > 250)) errors.address = 'Address must be between 10 and 250 characters.'
  if (address && !/^[A-Za-z0-9\s,./#'()\-]+$/.test(address)) errors.address = 'Address contains unsupported characters.'
  return errors
}

function Avatar({ faculty, large = false }) {
  const [failedPhoto, setFailedPhoto] = useState('')
  const initials = (faculty.fullName || '').replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, i, all) => i === 0 || i === all.length - 1).join('').slice(0, 2) || 'FM'
  return <span className={'fm-avatar ' + (large ? 'fm-avatar-large' : '')}>{faculty.photo && failedPhoto !== faculty.photo ? <img onError={() => setFailedPhoto(faculty.photo)} src={faculty.photo} alt={(faculty.fullName || 'Faculty') + ' profile'} /> : initials}</span>
}
function EmptyState({ title, description, action, onAction }) {
  return <div className="fm-empty"><FiUsers aria-hidden="true" /><h3>{title}</h3>{description && <p>{description}</p>}{action && <button type="button" className="fm-button secondary" onClick={onAction}>{action}</button>}</div>
}
function AttendanceTimeField({ label, value, disabled, onChange }) {
  const [hourText, minuteText] = String(value || '').split(':')
  const hour = Number(hourText)
  const [parts, setParts] = useState(() => ({
    hour: Number.isFinite(hour) && hour > 0 ? String(hour % 12 || 12).padStart(2, '0') : '',
    minute: minuteText || '',
    period: Number.isFinite(hour) && hourText ? (hour >= 12 ? 'PM' : 'AM') : '',
  }))
  useEffect(() => {
    setParts({
      hour: Number.isFinite(hour) && hour > 0 ? String(hour % 12 || 12).padStart(2, '0') : '',
      minute: minuteText || '',
      period: Number.isFinite(hour) && hourText ? (hour >= 12 ? 'PM' : 'AM') : '',
    })
  }, [value])
  const update = (part, nextValue) => {
    const nextParts = { ...parts, [part]: nextValue }
    setParts(nextParts)
    const { hour: nextHour, minute: nextMinute, period: nextPeriod } = nextParts
    if (!nextHour || !nextMinute || !nextPeriod) return
    let numericHour = Number(nextHour) % 12
    if (nextPeriod === 'PM') numericHour += 12
    onChange(`${String(numericHour).padStart(2, '0')}:${nextMinute}`)
  }
  return <div className="fm-attendance-time-field"><span>{label}</span><span className="fm-attendance-time-controls">{disabled ? <span className="fm-attendance-disabled-value">—</span> : <><select aria-label={`${label} hour`} value={parts.hour} onChange={event => update('hour', event.target.value)}><option value="">HH</option>{Array.from({ length: 12 }, (_, index) => { const item = String(index + 1).padStart(2, '0'); return <option key={item} value={item}>{item}</option> })}</select><span>:</span><select aria-label={`${label} minute`} value={parts.minute} onChange={event => update('minute', event.target.value)}><option value="">MM</option>{Array.from({ length: 60 }, (_, index) => { const item = String(index).padStart(2, '0'); return <option key={item} value={item}>{item}</option> })}</select><select aria-label={`${label} period`} value={parts.period} onChange={event => update('period', event.target.value)}><option value="">AM/PM</option><option value="AM">AM</option><option value="PM">PM</option></select></>}</span></div>
}
function AttendanceEditor({ record, onClose, onSave, onReset }) {
  const [data, setData] = useState({ status: record.status === 'Not Marked' ? 'Present' : record.status, checkIn: record.checkIn === '—' ? '' : record.checkIn, checkOut: record.checkOut === '—' ? '' : record.checkOut, remarks: record.remarks === '—' ? '' : record.remarks })
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmLop, setConfirmLop] = useState(false)
  const isLop = data.status === 'LOP'
  const isNonWorkingStatus = ['Absent', 'On Leave', 'LOP'].includes(data.status)
  const save = event => { event.preventDefault(); if (['On Leave', 'LOP'].includes(data.status) && !confirmLop) return setConfirmLop(true); if (!isLop && ['Present', 'Late', 'Half Day'].includes(data.status) && !data.checkIn) return setError('Check In is required for this attendance status.'); if (!isLop && ['Present', 'Late'].includes(data.status) && !data.checkOut) return setError('Check Out is required for Present and Late attendance.'); if (!isLop && data.checkIn && data.checkOut && data.checkOut <= data.checkIn) return setError('Check Out must be later than Check In.'); setError(''); onSave({ ...record, ...data, status: isLop ? 'LOP' : data.status, checkIn: isNonWorkingStatus ? '' : data.checkIn, checkOut: isNonWorkingStatus ? '' : data.checkOut, remarks: data.remarks || '', facultyId: record.faculty.id, date: record.date }) }
  return <div className="fm-modal-backdrop"><form className="fm-attendance-editor" onSubmit={save}><header><div><p className="fm-eyebrow">{record.status === 'Not Marked' ? 'MARK ATTENDANCE' : 'EDIT ATTENDANCE'}</p><h2>{record.faculty.fullName}</h2><p>{record.faculty.employeeId} · {record.faculty.department}</p></div><button className="fm-icon-button" type="button" aria-label="Close attendance editor" onClick={onClose}><FiX /></button></header><div className="fm-form-grid"><label>Status<select value={data.status} onChange={event => { const status = event.target.value; const clearTimes = ['Absent', 'On Leave', 'LOP'].includes(status); setData({ ...data, status, checkIn: clearTimes ? '' : data.checkIn, checkOut: clearTimes ? '' : data.checkOut }); setError(''); setConfirmLop(false) }}>{['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map(value => <option key={value}>{value}</option>)}<option value="LOP">Loss of Pay</option></select></label><AttendanceTimeField label="Check In" value={data.checkIn} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkIn: value }); setError('') }} /><AttendanceTimeField label="Check Out" value={data.checkOut} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkOut: value }); setError('') }} /><label className="fm-wide">Remarks<textarea rows="2" value={data.remarks} onChange={event => setData({ ...data, remarks: event.target.value })} /></label></div>{error && <p className="fm-error" role="alert">{error}</p>}{confirmLop && <div className="fm-lop-confirm" role="alert"><div><strong>Confirm attendance status?</strong><p>You are marking {record.faculty.fullName} ({record.faculty.employeeId}) as {attendanceStatusLabel(data.status)} for {new Date(record.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmLop(false)}>Cancel</button><button className="fm-button" type="button" onClick={() => { setConfirmLop(false); onSave({ ...record, ...data, status: data.status, checkIn: isNonWorkingStatus ? '' : data.checkIn, checkOut: isNonWorkingStatus ? '' : data.checkOut, remarks: data.remarks || '', facultyId: record.faculty.id, date: record.date }) }}>{data.status === 'LOP' ? 'Mark Loss of Pay' : 'Mark On Leave'}</button></div></div>}{confirmReset && <div className="fm-reset-confirm" role="alert"><div><strong>Reset this attendance record?</strong><p>The current status, time, and remarks will be cleared.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmReset(false)}>Keep Editing</button><button className="fm-button danger" type="button" onClick={() => onReset(record)}>Reset Record</button></div></div>}<footer>{record.status !== 'Not Marked' && !confirmReset && <button className="fm-button danger" type="button" onClick={() => setConfirmReset(true)}>Reset to Not Marked</button>}<button className="fm-button secondary" type="button" onClick={onClose}>Cancel</button><button className="fm-button" type="submit">Save Attendance</button></footer></form></div>
}
function FacultyAttendanceScreen({ faculty, onNotify }) {
  const [tab, setTab] = useState('daily')
  const [reportType, setReportType] = useState('daily')
  const [showFilters, setShowFilters] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [bulkConfirmation, setBulkConfirmation] = useState(null)
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [attendanceSuccess, setAttendanceSuccess] = useState(null)
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [todayRecords, setTodayRecords] = useState([])
  const [serverDaily, setServerDaily] = useState([]), [serverReport, setServerReport] = useState([])
  const [attendanceBusy, setAttendanceBusy] = useState(false), [attendanceError, setAttendanceError] = useState('')
  const attendanceLock = useRef(false), attendanceVersion = useRef(0)
  const [dailyPage, setDailyPage] = useState(1)
  const [registerPage, setRegisterPage] = useState(1)
  const [reportPage, setReportPage] = useState(1)
  const defaultDaily = () => ({ date: today(), department: '', status: '', search: '' })
  const defaultRegister = () => ({ from: '', to: today(), department: '', facultyId: '', status: '', search: '' })
  const defaultReport = () => ({ date: today(), weekStart: mondayOf(today()), month: today().slice(5, 7), year: today().slice(0, 4), facultyType: '', department: '', facultyId: '', status: '', search: '' })
  const [dailyFilters, setDailyFilters] = useState(defaultDaily)
  const [registerFilters, setRegisterFilters] = useState(defaultRegister)
  const [reportFilters, setReportFilters] = useState(() => ({ daily: defaultReport(), weekly: defaultReport(), monthly: defaultReport() }))
  const currentReport = reportFilters[reportType]
  const normalizeAttendance = useCallback((rows, options) => mergeAttendanceRecords(faculty, rows.map(row => normalizeAttendanceRow(row, options))), [faculty])
  const loadAttendance = useCallback(async () => {
    const version = ++attendanceVersion.current; setAttendanceError('')
    try {
      const reportFilter = reportFilters[reportType]
      const dates = attendancePeriod(reportType, reportFilter)
      const params = tab === 'register' ? { facultyId: registerFilters.facultyId, fromDate: registerFilters.from, toDate: registerFilters.to, status: registerFilters.status } : tab === 'reports' ? { facultyId: reportFilter.facultyId, fromDate: dates.from, toDate: dates.to } : { fromDate: dailyFilters.date, toDate: dailyFilters.date }
      const records = await facultyService.getAttendance(params)
      const dailyDate = tab === 'reports' && reportType === 'daily' ? reportFilter.date : dailyFilters.date
      const needsDaily = tab === 'daily' || (tab === 'reports' && reportType === 'daily')
      const daily = needsDaily ? await facultyService.getDailyAttendance({ date: dailyDate }) : []
      const periodDaily = tab === 'reports' && reportType !== 'daily'
        ? await loadDailyAttendancePeriod(facultyService.getDailyAttendance, dates.from, dates.to, today())
        : []
      const combined = combineAttendance(mergeAttendanceRecords(faculty, periodDaily), normalizeAttendance(daily, { daily: true, date: dailyDate }), normalizeAttendance(records))
      const todayRows = params.fromDate === today() && params.toDate === today() && !params.facultyId && !params.status
        ? combined
        : normalizeAttendance(await facultyService.getAttendance({ fromDate: today(), toDate: today() }))
      if (version !== attendanceVersion.current) return
      setTodayRecords(todayRows)
      setAttendanceRecords(combined); setServerDaily(combined); setServerReport([])
      return true
    } catch (error) { if (version === attendanceVersion.current) { setAttendanceError(error.message); } return false }
  }, [faculty, normalizeAttendance, tab, dailyFilters, registerFilters, reportFilters, reportType])
  useEffect(() => { const timer = setTimeout(() => { loadAttendance() }, 200); return () => { clearTimeout(timer); attendanceVersion.current++ } }, [loadAttendance])

  // Missing attendance is displayed as Not Marked; only API records are persisted.
  const resolvedRecords = useMemo(() => resolveAttendanceRecords(attendanceRecords, faculty), [attendanceRecords, faculty])
  const dailyRows = useMemo(() => dailyAttendanceRows(serverDaily, faculty, dailyFilters), [serverDaily, faculty, dailyFilters])
  const registerRows = useMemo(() => filterAttendanceRecords(resolvedRecords, registerFilters), [resolvedRecords, registerFilters])
  const period = useMemo(() => attendancePeriod(reportType, currentReport), [reportType, currentReport])
  const reportRecords = useMemo(() => period.from && period.to ? filterAttendanceRecords(reportType === 'daily' ? dailyAttendanceRows(resolvedRecords, faculty, { date: currentReport.date }) : resolvedRecords, { ...currentReport, ...period, status: reportType === 'daily' ? currentReport.status : '' }).filter(row => !currentReport.facultyType || (row.faculty.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching') === currentReport.facultyType) : [], [resolvedRecords, faculty, currentReport, period, reportType])
  const periodKey = reportType === 'monthly' ? period.from.slice(0, 7) : period.from === period.to ? period.from : period.from + '-to-' + period.to
  const periodLabel = reportType === 'monthly' ? period.from.slice(0, 7) : period.from === period.to ? period.from : period.from + ' – ' + period.to
  const reportRows = useMemo(() => reportType === 'daily' ? reportRecords : serverReport.map(row => ({ ...row, facultyId: String(row.facultyId), faculty: faculty.find(member => String(member.id) === String(row.facultyId)) || normalizeFaculty(row), totalDays: row.totalDays ?? row.workingDays ?? 0, present: row.present ?? row.presentDays ?? 0, absent: row.absent ?? row.absentDays ?? 0, late: row.late ?? row.lateDays ?? 0, halfDay: row.halfDay ?? row.halfDays ?? 0, onLeave: row.onLeave ?? row.leaveDays ?? 0, lop: row.lop ?? row.lopDays ?? 0, period: periodLabel })), [reportRecords, reportType, serverReport, faculty, periodLabel])
  const dailySummary = useMemo(() => summarizeAttendance(dailyRows), [dailyRows])
  const reportSummary = useMemo(() => summarizeAttendance(reportRecords), [reportRecords])
  const reportFaculty = useMemo(() => faculty.filter(item => !currentReport.facultyType || (item.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching') === currentReport.facultyType).filter(item => !currentReport.department || item.department === currentReport.department), [faculty, currentReport.facultyType, currentReport.department])
  const departmentOptions = useMemo(() => [...new Set((tab === 'reports' ? faculty.filter(item => !currentReport.facultyType || (item.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching') === currentReport.facultyType) : faculty).map(item => item.department).filter(Boolean))], [faculty, tab, currentReport.facultyType])
  const facultyOptions = useMemo(() => (tab === 'reports' ? reportFaculty : faculty).map(item => ({ value: String(item.id), label: item.employeeId + ' · ' + item.fullName })), [faculty, reportFaculty, tab])
  const filters = tab === 'daily' ? dailyFilters : tab === 'register' ? registerFilters : currentReport
  const updateFilter = (key, value) => {
    if (tab === 'daily') { setDailyFilters(old => ({ ...old, [key]: value })); setDailyPage(1) }
    else if (tab === 'register') { setRegisterFilters(old => ({ ...old, [key]: value })); setRegisterPage(1) }
    else setReportFilters(old => ({ ...old, [reportType]: { ...old[reportType], [key]: value, ...(key === 'facultyType' ? { department: '', facultyId: '' } : key === 'department' ? { facultyId: '' } : {}) } })); setReportPage(1)
  }
  const clearFilters = () => {
    if (tab === 'daily') { setDailyFilters(defaultDaily()); setSelectedFacultyIds([]); setDailyPage(1) }
    else if (tab === 'register') { setRegisterFilters(defaultRegister()); setRegisterPage(1) }
    else { setReportFilters(old => ({ ...old, [reportType]: defaultReport() })); setReportPage(1) }
  }
  const saveAttendance = async values => {
    if (attendanceLock.current) return
    if (!values.date || values.date > today()) { setAttendanceError('Attendance cannot be recorded for a future date.'); return }
    attendanceLock.current = true; setAttendanceBusy(true); setAttendanceError('')
    try {
      let id = values.attendanceId
      const payload = attendancePayload(values)
      if (id) await facultyService.updateAttendance(id, payload)
      else {
        const created = await facultyService.createAttendance({ facultyId: requiredNumber(values.facultyId, 'Faculty'), attendanceDate: values.date, status: values.status, remarks: values.remarks || null })
        id = created.attendanceId ?? created.id
        if (!id) throw new Error('Attendance was saved without an ID. Reload before editing its times.')
        if (payload.checkIn) await facultyService.checkIn(id, { checkIn: payload.checkIn })
        if (payload.checkOut) await facultyService.checkOut(id, { checkOut: payload.checkOut })
      }
      setEditingRecord(null); if (!await loadAttendance()) return; setAttendanceSuccess({ title: 'Attendance Updated', message: 'Attendance saved successfully.' })
    } catch (error) { await loadAttendance(); setAttendanceError(error.message) }
    finally { attendanceLock.current = false; setAttendanceBusy(false) }
  }
  const applyBulkMark = async (status, selectedRows, remarks) => {
    if (attendanceLock.current || !selectedRows.length) return
    attendanceLock.current = true; setAttendanceBusy(true); setAttendanceError('')
    try {
      await facultyService.bulkAttendance({ facultyIds: selectedRows.map(row => requiredNumber(row.facultyId, 'Faculty')), attendanceDate: dailyFilters.date, status, remarks: remarks || null })
      if (!await loadAttendance()) return; setSelectedFacultyIds([]); setAttendanceSuccess({ title: 'Attendance Updated', message: selectedRows.length + ' attendance records saved.' })
    } catch (error) { setAttendanceError(error.message) }
    finally { attendanceLock.current = false; setAttendanceBusy(false) }
  }
  const openAttendance = async (row, edit = false) => {
    try {
      const id = row.attendanceId
      const detail = id ? normalizeAttendance([await facultyService.getAttendanceById(id)])[0] : row
      const value = { ...row, ...detail, faculty: row.faculty }
      if (edit) setEditingRecord(value); else setSelected(value)
    } catch (error) { setAttendanceError(error.message) }
  }
  const bulkMark = status => {
    const selectedRows = dailyRows.filter(row => selectedFacultyIds.includes(String(row.facultyId)))
    const overwrites = selectedRows.filter(row => !row.synthetic)
    if (!selectedRows.length) return
    setBulkRemarks('')
    setBulkConfirmation({ status, selectedCount: selectedRows.length, overwriteCount: overwrites.length })
  }
  const confirmBulkMark = () => {
    if (!bulkConfirmation) return
    const selectedRows = dailyRows.filter(row => selectedFacultyIds.includes(String(row.facultyId)))
    const remarks = bulkRemarks.trim()
    setBulkConfirmation(null)
    setBulkRemarks('')
    applyBulkMark(bulkConfirmation.status, selectedRows, remarks)
  }
  const rangeInvalid = tab === 'register' && registerFilters.from && registerFilters.to && registerFilters.from > registerFilters.to
  const periodInvalid = tab === 'reports' && (!period.from || !period.to)
  const resultRows = tab === 'daily' ? dailyRows : tab === 'register' ? registerRows : reportRows
  const aggregated = tab === 'reports' && reportType !== 'daily'
  const exportRows = useMemo(() => attendanceExportRows(resultRows, aggregated), [resultRows, aggregated])
  const columns = useMemo(() => aggregated ? aggregateExportColumns(reportType) : attendanceExportColumns(tab === 'daily'), [aggregated, reportType, tab])
  const exportTitle = tab === 'daily' ? 'Attendance' : tab === 'register' ? 'Register' : reportType[0].toUpperCase() + reportType.slice(1) + ' Report'
  const title = tab === 'daily' ? 'Daily Attendance' : tab === 'register' ? 'Attendance Register' : 'Attendance Reports'
  const exportPeriod = tab === 'daily' ? dailyFilters.date : tab === 'register' ? (registerFilters.from || 'all-dates') + '-to-' + (registerFilters.to || 'latest') : periodKey
  const filename = attendanceFilename(tab === 'daily' ? '' : tab === 'register' ? 'register' : reportType === 'daily' ? 'daily-report' : reportType, exportPeriod, filters.department)
  const displayDate = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All dates'
  const rangeLabel = tab === 'daily' ? displayDate(dailyFilters.date) : tab === 'register' ? displayDate(registerFilters.from) + ' – ' + (registerFilters.to ? displayDate(registerFilters.to) : 'Latest') : period.from && period.to ? displayDate(period.from) + (period.from === period.to ? '' : ' – ' + displayDate(period.to)) : 'Select a valid period'
  const exportScope = ['All filtered results', rangeLabel, filters.department, faculty.find(item => String(item.id) === filters.facultyId)?.fullName, (!aggregated && filters.status), filters.search && 'Search: ' + filters.search, tab === 'reports' && ATTENDANCE_PERCENTAGE_NOTE].filter(Boolean).join(' · ')
  const contextualExport = <button className="export-button" disabled={attendanceBusy} onClick={async () => { setAttendanceBusy(true); try { const params = tab === 'daily' ? { fromDate: dailyFilters.date, toDate: dailyFilters.date } : tab === 'register' ? { facultyId: registerFilters.facultyId, fromDate: registerFilters.from, toDate: registerFilters.to } : { facultyId: currentReport.facultyId, fromDate: period.from, toDate: period.to }; downloadServerExport(await facultyService.exportAttendance(params), filename) } catch (error) { setAttendanceError(error.message) } finally { setAttendanceBusy(false) } }}>Export {exportTitle}</button>
  const attendanceBadge = value => <StatusBadge value={attendanceStatusLabel(value)} className={value === 'Not Marked' ? 'fm-attendance-pending' : value === 'Present' ? 'fm-attendance-present' : value === 'Absent' ? 'fm-attendance-absent' : value === 'Late' ? 'fm-attendance-late' : value === 'Half Day' ? 'fm-attendance-half-day' : value === 'On Leave' ? 'fm-attendance-leave' : value === 'LOP' ? 'fm-attendance-lop' : ''} />
  const dateControl = (key, label, options = {}) => <label className="fm-attendance-field"><span>{label}</span><input type="date" value={filters[key]} max={today()} onChange={event => updateFilter(key, event.target.value)} {...options} /></label>
  const selectControl = (key, label, options, placeholder) => <div className="fm-attendance-field"><span>{label}</span><SearchableSelect label={label} value={filters[key]} options={[{ value: '', label: placeholder }, ...options.map(option => option === 'LOP' ? { value: 'LOP', label: 'Loss of Pay' } : option)]} onChange={value => updateFilter(key, value)} placeholder={placeholder} /></div>
  const todaySummary = summarizeAttendance(resolveAttendanceRecords(todayRecords.filter(row => row.date === today()), faculty))
  const facultySummary = [
    { label: 'Total Faculty', value: faculty.length },
    { label: 'Present Today', value: todaySummary.Present || 0, tone: 'active' },
    { label: 'Absent Today', value: todaySummary.Absent || 0, tone: 'danger' },
    { label: 'Late Today', value: todaySummary.Late || 0, tone: 'danger' },
    { label: 'On Leave Today', value: todaySummary['On Leave'] || 0, tone: 'upcoming' },
  ]
  const searchControl = <div className="fm-attendance-search-row"><label className="fm-attendance-field fm-attendance-search-field"><span className="fm-attendance-input-label">Search</span><span className="fm-attendance-search"><FiSearch aria-hidden="true" /><input value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Search attendance..." /></span></label>{tab !== 'reports' && <button type="button" className="fm-attendance-filter-toggle" aria-expanded={showFilters} aria-controls="faculty-attendance-filters-panel" onClick={() => setShowFilters(value => !value)}>{showFilters ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />} <span>Filters</span></button>}</div>
  const formatTimeView = value => {
    if (!value || value === '—') return '—'
    const [hourText, minuteText] = String(value).split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText || 0)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
    const suffix = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
  }
  const normalizeViewRemark = value => {
    const clean = String(value || '').trim()
    if (!clean || clean === '—') return '—'
    const blocked = ['Bulk marked', 'Bulk marked Present', 'Bulk marked Absent', 'Bulk marked On Leave', 'Bulk mark', 'Bulk update', 'Manual bulk', 'Generated record']
    return blocked.includes(clean) ? '—' : clean
  }
  const dailyPageCount = Math.max(1, Math.ceil(dailyRows.length / PAGE_SIZE))
  const currentDailyPage = Math.min(dailyPage, dailyPageCount)
  const pageCount = Math.max(1, Math.ceil(registerRows.length / PAGE_SIZE))
  const currentPage = Math.min(registerPage, pageCount)
  const visibleRows = tab === 'register' ? registerRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : tab === 'daily' ? dailyRows.slice((currentDailyPage - 1) * PAGE_SIZE, currentDailyPage * PAGE_SIZE) : reportType === 'daily' ? reportRows.slice((reportPage - 1) * PAGE_SIZE, reportPage * PAGE_SIZE) : resultRows
  const statusMeta = {
    Present: ['P', 'present'], Absent: ['A', 'absent'], Late: ['L', 'late'], 'Half Day': ['HD', 'half-day'], 'On Leave': ['OL', 'leave'], LOP: ['LOP', 'lop'], 'Not Marked': ['—', 'pending'],
  }
  const matrixDates = useMemo(() => {
    if (reportType === 'daily' || !period.from || !period.to) return []
    const dates = []
    for (const date = new Date(period.from + 'T00:00:00'); date <= new Date(period.to + 'T00:00:00'); date.setDate(date.getDate() + 1)) dates.push(normalizeAttendanceDate(localAttendanceDate(date)))
    return dates
  }, [period.from, period.to, reportType])
  const matrixRows = useMemo(() => {
    if (!matrixDates.length) return []
    const search = currentReport.search.trim().toLowerCase()
    return faculty.filter(member => (!currentReport.facultyType || (member.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching') === currentReport.facultyType) && (!currentReport.department || member.department === currentReport.department) && (!currentReport.facultyId || String(member.id) === String(currentReport.facultyId)) && (!search || `${member.employeeId} ${member.fullName}`.toLowerCase().includes(search))).map(member => {
      const cells = matrixDates.map(date => resolvedRecords.find(record => String(record.facultyId) === String(member.id) && record.date === date) || { faculty: member, facultyId: member.id, date, status: 'Not Marked', checkIn: '—', checkOut: '—', hours: '—' })
      const totals = summarizeAttendance(cells)
      return { member, cells, totals }
    }).filter(row => !currentReport.status || row.cells.some(cell => cell.status === currentReport.status))
  }, [currentReport, faculty, matrixDates, resolvedRecords])
  const reportEmployeeRows = aggregated ? matrixRows : reportRows
  const reportPageCount = Math.max(1, Math.ceil(reportEmployeeRows.length / PAGE_SIZE))
  const currentReportPage = Math.min(reportPage, reportPageCount)
  const visibleReportRows = reportRows.slice((currentReportPage - 1) * PAGE_SIZE, currentReportPage * PAGE_SIZE)
  const visibleMatrixRows = matrixRows.slice((currentReportPage - 1) * PAGE_SIZE, currentReportPage * PAGE_SIZE)
  const statusCell = cell => {
    const [code, tone] = statusMeta[cell.status] || statusMeta['Not Marked']
    const detail = [displayDate(cell.date), cell.status === 'LOP' ? 'Loss of Pay' : cell.status, ...(['Present', 'Late', 'Half Day'].includes(cell.status) ? [`Check In: ${formatTimeView(cell.checkIn)}`, `Check Out: ${formatTimeView(cell.checkOut)}`, `Working Hours: ${cell.hours || '—'}`] : [])].join('\n')
    return <span className={`fm-report-status fm-report-status--${tone}`} title={detail} aria-label={detail}>{code}</span>
  }
  const allDailySelected = dailyRows.length > 0 && dailyRows.every(row => selectedFacultyIds.includes(String(row.facultyId)))
  const dailySummaryCards = [
    ['Total Active', dailyRows.length, FiUsers, 'brand'],
    ['Present', dailySummary.Present, FiCheckCircle, 'success'],
    ['Absent', dailySummary.Absent, FiX, 'danger'],
    ['Late', dailySummary.Late, FiClock, 'warning'],
    ['Half Day', dailySummary['Half Day'], FiClock, 'warning'],
    ['On Leave', dailySummary['On Leave'], FiBriefcase, 'info'],
    ['Loss of Pay', dailySummary.LOP, FiBriefcase, 'danger'],
    ['Not Marked', dailySummary['Not Marked'], FiEdit2, 'muted']
  ].map(([label, value, Icon, tone]) => (
    <article className={'fm-attendance-kpi fm-attendance-kpi--' + tone} key={label}>
      <span className="fm-attendance-kpi-icon"><Icon aria-hidden="true" /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {label === 'Not Marked' && <p>Pending records</p>}
      </div>
    </article>
  ))
  const toggleSelectAllDaily = () => {
    const ids = dailyRows.map(row => String(row.facultyId))
    setSelectedFacultyIds(current => {
      const nextSet = new Set(current)
      if (ids.every(id => nextSet.has(id))) {
        ids.forEach(id => nextSet.delete(id))
        return [...nextSet]
      }
      ids.forEach(id => nextSet.add(id))
      return [...nextSet]
    })
  }
  const showDate = tab === 'register'
  const showRemarks = true
  const showAction = tab !== 'reports'
  const recordTable = <div key={tab} className={'fm-attendance-table' + (showDate ? ' fm-attendance-history-table' : '')}><table>
    {tab === 'daily' ? <colgroup>
      <col className="fm-col-select" style={{ width: '50px' }} />
      <col className="fm-col-employee" style={{ width: '120px' }} />
      <col className="fm-col-faculty" style={{ width: '270px' }} />
      <col className="fm-col-department" style={{ width: '270px' }} />
      <col className="fm-col-status" style={{ width: '120px' }} />
      <col className="fm-col-time" style={{ width: '105px' }} />
      <col className="fm-col-time" style={{ width: '105px' }} />
      <col className="fm-col-hours" style={{ width: '135px' }} />
      <col className="fm-col-remarks" style={{ width: '150px' }} />
      <col className="fm-col-action" style={{ width: '80px' }} />
    </colgroup> : (showDate ? <colgroup>{[10, 8, 20, 17, 10, 7, 7, 8, 7, 6].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup> : showAction ? <colgroup>{[8, 23, 19, 11, 7, 7, 9, 9, 7].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup> : <colgroup>{[9, 22, 19, 11, 9, 9, 9, 12].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup>)}
    <thead><tr>{[...(tab === 'daily' ? [<th scope="col" key="select-header"><input type="checkbox" aria-label="Select all daily attendance rows" checked={allDailySelected} onChange={toggleSelectAllDaily} /></th>] : []), ...(showDate ? ['Date'] : []), 'Employee ID', 'Faculty', 'Department', 'Status', 'Check In', 'Check Out', 'Working Hours', ...(showRemarks ? ['Remarks'] : []), ...(showAction ? ['Action'] : [])].map((label, index) => typeof label === 'string' ? <th scope="col" key={label}>{label}</th> : label)}</tr></thead>
    <tbody>{(aggregated ? [] : visibleRows).map(row => <tr key={`${row.facultyId}:${row.date}`}>
      {tab === 'daily' && <td><input type="checkbox" aria-label={'Select ' + row.faculty.fullName} checked={selectedFacultyIds.includes(String(row.facultyId))} onChange={event => setSelectedFacultyIds(current => event.target.checked ? [...new Set([...current, String(row.facultyId)])] : current.filter(id => id !== String(row.facultyId)))} /></td>}
      {showDate && <td>{displayDate(row.date)}</td>}
      <td><span className="fm-attendance-employee">{row.faculty.employeeId}</span></td>
      <td><div className="fm-attendance-identity"><Avatar faculty={row.faculty} /><div><strong>{row.faculty.fullName}</strong><small>{row.faculty.designation}</small></div></div></td>
      <td className="fm-department-cell">{row.faculty.department}</td><td>{attendanceBadge(row.status)}</td><td>{row.checkIn}</td><td>{row.checkOut}</td><td>{row.hours}</td>
      {showRemarks && <td className="fm-remarks-cell"><span className="fm-attendance-remarks" title={row.remarks}>{row.remarks}</span></td>}
      {showAction && <td className="fm-action-cell"><div className="fm-table-actions"><button className="fm-icon-button" type="button" title="View Attendance" aria-label={'View attendance record for ' + row.faculty.fullName + ' on ' + row.date} onClick={() => openAttendance(row)}><FiEye /></button><button className="fm-icon-button" type="button" title="Edit attendance" aria-label={'Edit attendance for ' + row.faculty.fullName + ' on ' + row.date} onClick={() => openAttendance(row, true)}><FiEdit2 /></button></div></td>}
    </tr>)}</tbody>
  </table></div>
  const aggregatedTable = reportType === 'daily' ? <div className="fm-attendance-table fm-attendance-aggregate-table"><table><thead><tr>{['Employee ID', 'Faculty', 'Department', 'Days With Data', 'Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Total Hours', 'Attendance %'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visibleReportRows.map(row => <tr key={row.facultyId}><td><span className="fm-attendance-employee">{row.faculty.employeeId}</span></td><td><strong>{row.faculty.fullName}</strong></td><td>{row.faculty.department}</td><td>{row.total}</td>{['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map(status => <td key={status}>{row[status]}</td>)}<td>{row.hours}</td><td>{row.percentage}</td></tr>)}</tbody></table></div> : <><div className="fm-report-legend" aria-label="Attendance status legend">{Object.entries(statusMeta).map(([status, [code, tone]]) => <span key={status}>{statusCell({ status, date: period.from, checkIn: '—', checkOut: '—', hours: '—' })}<small>{attendanceStatusLabel(status)}</small></span>)}</div><div className="fm-attendance-table fm-attendance-matrix"><table><thead><tr><th>Employee ID</th><th>Faculty</th>{matrixDates.map(date => <th key={date}><span>{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}</span><b>{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</b></th>)}{['P', 'A', 'L', 'HD', 'OL', 'LOP', '%'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{visibleMatrixRows.map(({ member, cells, totals }) => <tr key={member.id}><td>{member.employeeId}</td><td className="fm-matrix-faculty"><strong>{member.fullName}</strong><small>{member.department}</small></td>{cells.map(cell => <td key={cell.date}>{statusCell(cell)}</td>)}{[['Present', 'present'], ['Absent', 'absent'], ['Late', 'late'], ['Half Day', 'half-day'], ['On Leave', 'leave'], ['LOP', 'lop']].map(([status, tone]) => <td className={`fm-report-total fm-report-total--${tone}`} key={status}>{totals[status]}</td>)}<td className="fm-report-total fm-report-total--percentage">{totals.percentage}</td></tr>)}</tbody></table></div></>
  const noSource = tab !== 'daily' && !attendanceRecords.length
  const empty = <EmptyState title={noSource ? 'No attendance records are available yet.' : 'No attendance records match the selected filters.'} description={noSource ? 'Daily Attendance shows missing records as Not Marked; these are not saved historical records.' : undefined} action={noSource ? 'Go to Daily Attendance' : 'Clear Filters'} onAction={noSource ? () => setTab('daily') : clearFilters} />
  return (
    <div className="fm-attendance-screen">
      <header className="faculty-page-header fm-attendance-header">
        <div>
          <h1>Faculty Attendance</h1>
          <p>Manage daily faculty attendance, working hours, and administrative attendance reports.</p>
        </div>
      </header>
      <div className="faculty-header-summary"><CompactSummary label="Faculty attendance summary" items={facultySummary} /></div>

      <section className="fm-attendance-workspace">
        <div className="fm-attendance-panel">
          <header className="fm-attendance-directory-header">
            <div className="fm-attendance-header-actions">{searchControl}{contextualExport}</div>
          </header>

          {showFilters && tab !== 'reports' && (
            <div id="faculty-attendance-filters-panel" className={'fm-attendance-filters' + (tab !== 'daily' ? ' fm-attendance-extended-filters' : '')}>
              {tab === 'daily' && dateControl('date', 'Date')}
              {tab === 'reports' && reportType === 'daily' && dateControl('date', 'Date')}
              {tab === 'reports' && reportType === 'weekly' && dateControl('weekStart', 'Week Start')}
              {tab === 'reports' && reportType === 'monthly' && (
                <>
                  {selectControl('month', 'Month', Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2, '0'), label: new Date(2000, index, 1).toLocaleDateString('en-GB', { month: 'long' }) })), 'Select month')}
                  <label className="fm-attendance-field">
                    <span>Year</span>
                    <input type="number" min="1900" max="9999" step="1" value={filters.year} aria-invalid={Boolean(periodInvalid)} onChange={event => updateFilter('year', event.target.value)} />
                  </label>
                </>
              )}
              {selectControl('department', 'Department', departmentOptions, 'All Departments')}
              {tab !== 'daily' && selectControl('facultyId', 'Faculty', facultyOptions, 'All Faculty')}
              {(!aggregated) && selectControl('status', 'Status', ATTENDANCE_STATUSES, 'All Statuses')}
              <button className="fm-attendance-clear" type="button" onClick={clearFilters}>Clear Filters</button>
            </div>
          )}

          <nav className="fm-attendance-tabs" aria-label="Faculty attendance views">
            {[['daily', 'Daily Attendance'], ['reports', 'Reports']].map(([key, label]) => (
              <button type="button" key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </nav>

          {tab === 'reports' && (
            <div className="fm-attendance-report-tabs" aria-label="Report period">
              {['daily', 'weekly', 'monthly'].map(type => (
                <button type="button" key={type} className={reportType === type ? 'active' : ''} aria-pressed={reportType === type} onClick={() => setReportType(type)}>
                  {type[0].toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}
          {tab === 'reports' && <div className="fm-attendance-filters fm-attendance-extended-filters fm-report-direct-filters">
            {reportType === 'daily' && dateControl('date', 'Date')}
            {reportType === 'weekly' && dateControl('weekStart', 'Week Start')}
            {reportType === 'monthly' && <>{selectControl('month', 'Month', Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2, '0'), label: new Date(2000, index, 1).toLocaleDateString('en-GB', { month: 'long' }) })), 'Select month')}<label className="fm-attendance-field"><span>Year</span><input type="number" min="1900" max="9999" value={filters.year} onChange={event => updateFilter('year', event.target.value)} /></label></>}
            {selectControl('facultyType', 'Faculty Type', ['Teaching', 'Non-Teaching'], 'All Faculty')}
            {selectControl('department', 'Department', departmentOptions, 'All Departments')}
            {selectControl('facultyId', 'Faculty', facultyOptions, 'All Employees')}
            {selectControl('status', 'Status', ATTENDANCE_STATUSES, 'All Statuses')}
            <button className="fm-attendance-clear" type="button" onClick={clearFilters}>Clear Filters</button>
          </div>}

          {rangeInvalid && <p className="fm-error" role="alert">From Date must be on or before To Date.</p>}
          {periodInvalid && <p className="fm-error" role="alert">Select a valid reporting period.</p>}

          <section className="fm-attendance-register">
            <header className="fm-attendance-register-heading">
              <div>
                <h2>{tab === 'daily' ? 'Faculty Attendance' : exportTitle}</h2>
                <p>{tab === 'reports' ? reportEmployeeRows.length : resultRows.length} employee records</p>
              </div>
            </header>

            {tab === 'daily' && selectedFacultyIds.length > 0 && (
              <div className="fm-attendance-bulkbar">
                <strong>{selectedFacultyIds.length} selected</strong>
                <button type="button" className="fm-button" onClick={() => bulkMark('Present')}>Mark Present</button>
                <button type="button" className="fm-button secondary" onClick={() => bulkMark('Absent')}>Mark Absent</button>
              </div>
            )}

            {(aggregated ? matrixRows.length : resultRows.length) ? aggregated ? aggregatedTable : recordTable : empty}
            {tab === 'daily' && dailyRows.length > PAGE_SIZE && <TablePagination currentPage={currentDailyPage} totalPages={dailyPageCount} onPageChange={setDailyPage} />}
            {tab === 'reports' && reportEmployeeRows.length > PAGE_SIZE && <TablePagination currentPage={currentReportPage} totalPages={reportPageCount} onPageChange={setReportPage} />}
          </section>
        </div>
      </section>

      {tab !== 'reports' && selected && (
        <div className="fm-modal-backdrop">
          <section className="fm-attendance-detail" role="dialog" aria-modal="true" aria-label="Attendance details">
            <div className="fm-attendance-detail-header">
              <div><p className="fm-eyebrow">ATTENDANCE DETAILS</p></div>
              <button className="fm-detail-close" type="button" aria-label="Close attendance details" onClick={() => setSelected(null)}><FiX /></button>
            </div>

            <div className="fm-attendance-identity-row">
              <span className="fm-attendance-detail-avatar">{(selected.faculty.fullName || 'FM').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase().slice(0, 2) || 'FM'}</span>
              <div className="fm-attendance-detail-identity">
                <h2>{selected.faculty.fullName}</h2>
                <p>{selected.faculty.employeeId}</p>
                <p>{selected.faculty.designation}</p>
                <p>{selected.faculty.department}</p>
              </div>
              <div className="fm-attendance-detail-status">{attendanceBadge(selected.status)}</div>
            </div>

            <div className="fm-attendance-summary-block">
              <h3>Attendance Summary</h3>
              <div className="fm-attendance-summary-grid">
                <div><span>Date</span><strong>{displayDate(selected.date)}</strong></div>
                <div><span>Check In</span><strong>{['Present', 'Late', 'Half Day'].includes(selected.status) ? formatTimeView(selected.checkIn) : '—'}</strong></div>
                <div><span>Check Out</span><strong>{['Present', 'Late', 'Half Day'].includes(selected.status) ? formatTimeView(selected.checkOut) : '—'}</strong></div>
                <div><span>Working Hours</span><strong>{['Present', 'Late', 'Half Day'].includes(selected.status) ? (selected.hours || '—') : '—'}</strong></div>
                <div className="fm-attendance-summary-wide"><span>Remarks</span><strong>{normalizeViewRemark(selected.remarks)}</strong></div>
              </div>
            </div>
          </section>
        </div>
      )}

      {attendanceError && <p className="fm-error" role="alert" style={{ position: 'relative', zIndex: 1500 }}>{attendanceError}</p>}{tab !== 'reports' && editingRecord && <fieldset disabled={attendanceBusy} style={{ border: 0, margin: 0, padding: 0 }}><AttendanceEditor record={editingRecord} onClose={() => setEditingRecord(null)} onSave={saveAttendance} onReset={record => saveAttendance({ ...record, status: 'Not Marked' })} /></fieldset>}
      {attendanceSuccess && (
        <div className="fm-modal-backdrop fm-success-backdrop" role="presentation">
          <section className="fm-attendance-success" role="dialog" aria-modal="true" aria-labelledby="attendance-success-title">
            <div className="fm-attendance-success-icon"><FiCheckCircle aria-hidden="true" /></div>
            <h2 id="attendance-success-title">{attendanceSuccess.title}</h2>
            <p>{attendanceSuccess.message}</p>
            <button type="button" className="fm-button" onClick={() => setAttendanceSuccess(null)}>Done</button>
          </section>
        </div>
      )}
      {bulkConfirmation && (
        <div className="fm-modal-backdrop" role="presentation">
          <section className="fm-attendance-confirm" role="dialog" aria-modal="true" aria-labelledby="bulk-attendance-confirm-title">
            <div className="fm-attendance-confirm-icon"><FiAlertCircle aria-hidden="true" /></div>
            <div className="fm-attendance-confirm-content">
              <p className="fm-eyebrow">BULK ATTENDANCE UPDATE</p>
              <h2 id="bulk-attendance-confirm-title">Mark {bulkConfirmation.status} attendance?</h2>
              <p>{bulkConfirmation.selectedCount} faculty selected for the current date.</p>
              {bulkConfirmation.overwriteCount > 0 && <p className="fm-attendance-confirm-note">{bulkConfirmation.overwriteCount} existing records will be overwritten.</p>}
              <label className="fm-attendance-confirm-remarks">
                <span>Remarks</span>
                <textarea value={bulkRemarks} onChange={event => setBulkRemarks(event.target.value)} rows="3" placeholder="Enter remarks for the selected faculty..." />
              </label>
            </div>
            <footer className="fm-attendance-confirm-actions">
              <button type="button" className="fm-button secondary" onClick={() => { setBulkConfirmation(null); setBulkRemarks('') }}>Cancel</button>
              <button type="button" className="fm-button" onClick={confirmBulkMark}>Continue</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
function ProfileSections({ data, collegeOptions = [], departmentOptions = [] }) {
  const getFieldValue = (key, value) => {
    if (key === 'collegeName' || key === 'collegeId') {
      const match = collegeOptions.find(c => String(c.value) === String(value))
      return match ? match.label : value || '—'
    }
    if (key === 'department' || key === 'departmentId') {
      const match = departmentOptions.find(d => String(d.value) === String(value))
      return match ? match.label : value || '—'
    }
    if (key === 'employeeCategory' && ['Others', 'Other'].includes(data.employeeCategory)) {
      return data.employeeCategoryOther ? `Other (${data.employeeCategoryOther})` : 'Other'
    }
    if (experienceKeys.includes(key)) {
      return years(value)
    }
    return value || '—'
  }

  return (
    <>
      <div className="fm-profile-sections">
        {sections.map(section => {
          const fields = section.fields.filter(([key, , , required]) => required || key === 'employeeId' || (data[key] !== '' && data[key] != null))
          return (
            <section className="fm-panel" key={section.title}>
              <h2><section.icon />{section.heading}</h2>
              {fields.length ? (
                <dl className="fm-info-grid">
                  {fields.map(([key, label]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{getFieldValue(key, data[key])}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="fm-muted">No optional contact information provided.</p>
              )}
            </section>
          )
        })}
      </div>
      <section className="fm-panel fm-docs-verification">
        <h2><FiFileText /> Supporting Documents</h2>
        <div className="fm-document-grid">
          {FACULTY_DOCUMENTS.map(([key, label]) => {
            const doc = data.documents?.[key] || {}
            const status = typeof doc === 'string' ? doc : doc.status || 'Not Submitted'
            const isSubmitted = status === 'Submitted'
            return (
              <article className={'fm-document-card ' + (isSubmitted ? 'submitted' : '')} key={key}>
                <div className="fm-document-icon">
                  {isSubmitted ? <FiCheckCircle aria-hidden="true" /> : <FiFileText aria-hidden="true" />}
                </div>
                <div className="fm-document-info">
                  <strong title={label}>{label}</strong>
                  <span className={'fm-doc-status ' + (isSubmitted ? 'active' : 'muted')}>
                    {status}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
function FacultyDocumentsForm({ documents = {}, onChange }) {
  const count = FACULTY_DOCUMENTS.filter(([key]) => {
    const val = documents[key]
    const status = typeof val === 'string' ? val : val?.status
    return status === 'Submitted'
  }).length

  return (
    <div className="fm-documents-form">
      <div className="fm-documents-header">
        <p className="fm-muted">Mark submission status for each faculty document. Document submission is optional and can be updated anytime.</p>
        <span className="fm-doc-summary-pill">{count} of {FACULTY_DOCUMENTS.length} Submitted</span>
      </div>
      <div className="fm-document-grid">
        {FACULTY_DOCUMENTS.map(([key, label]) => {
          const doc = documents[key] || {}
          const status = typeof doc === 'string' ? doc : doc.status || 'Not Submitted'
          const isSubmitted = status === 'Submitted'
          return (
            <article className={'fm-document-card ' + (isSubmitted ? 'submitted' : '')} key={key}>
              <div className="fm-document-icon">
                {isSubmitted ? <FiCheckCircle aria-hidden="true" /> : <FiFileText aria-hidden="true" />}
              </div>
              <div className="fm-document-info">
                <strong title={label}>{label}</strong>
                <span className={'fm-doc-status ' + (isSubmitted ? 'active' : 'muted')}>
                  {status}
                </span>
              </div>
              <div className="fm-document-actions">
                <select
                  aria-label={`${label} submission status`}
                  value={status}
                  onChange={e => onChange(key, { ...(typeof doc === 'object' ? doc : {}), status: e.target.value })}
                >
                  <option value="Not Submitted">Not Submitted</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
function Field({ field, data, errors, update, native = false, collegeOptions = [], departmentOptions = [] }) {
  const [key, label, type, required] = field
  const id = 'fm-' + key
  const props = { id, value: data[key] ?? '', onChange: event => update(key, event.target.value), 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? id + '-error' : undefined, required: Boolean(required) }
  return (
    <>
      <div className={'fm-field ' + (type === 'textarea' ? 'fm-wide' : '') + (key === 'gender' ? ' fm-gender' : '')}><label htmlFor={Array.isArray(type) && !native ? undefined : id}>{label}{required && <span className="fm-required" aria-hidden="true"> *</span>}</label>
        {type === 'college' || type === 'department' ? <SearchableSelect label={label} value={data[key] || ''} options={type === 'college' ? collegeOptions : departmentOptions} onChange={value => update(key, value)} required={required} error={Boolean(errors[key])} placeholder={'Select ' + label.toLowerCase()} /> : Array.isArray(type) ? native ? <select {...props}><option value="">Select {label.toLowerCase()}</option>{type.map(value => <option key={value}>{value}</option>)}</select> : <SearchableSelect label={label} value={data[key] || ''} options={type} onChange={value => update(key, value)} required={required} error={Boolean(errors[key])} placeholder={'Select ' + label.toLowerCase()} hideSearch={key === 'gender'} /> : type === 'textarea' ? <textarea {...props} rows={2} /> : <input {...props} type={type === 'readonly' ? 'text' : type} readOnly={type === 'readonly'} max={type === 'date' ? today() : key === 'passingYear' ? new Date().getFullYear() : key === 'weeklyHours' ? 60 : type === 'number' ? 80 : undefined} min={key === 'passingYear' ? 1950 : type === 'number' ? 0 : undefined} step={key === 'passingYear' ? 1 : type === 'number' ? 0.5 : undefined} inputMode={type === 'tel' || key === 'pincode' ? 'numeric' : undefined} />}
        {errors[key] && <small id={id + '-error'} className="fm-error">{errors[key]}</small>}
      </div>
      {key === 'employeeCategory' && ['Others', 'Other'].includes(data.employeeCategory) && (
        <div className="fm-field">
          <label htmlFor="fm-employeeCategoryOther">Specify Other Category <span className="fm-required" aria-hidden="true"> *</span></label>
          <input
            id="fm-employeeCategoryOther"
            type="text"
            value={data.employeeCategoryOther || ''}
            onChange={event => update('employeeCategoryOther', event.target.value)}
            placeholder="Enter custom category name"
            required
            aria-invalid={Boolean(errors.employeeCategoryOther)}
            aria-describedby={errors.employeeCategoryOther ? 'fm-employeeCategoryOther-error' : undefined}
          />
          {errors.employeeCategoryOther && <small id="fm-employeeCategoryOther-error" className="fm-error">{errors.employeeCategoryOther}</small>}
        </div>
      )}
    </>
  )
}

const getNextFacultyCode = (list = []) => {
  let max = 0
  for (const item of list || []) {
    const raw = String(item?.employeeId || item?.facultyCode || '').trim()
    const match = raw.match(/FAC-?(\d+)/i) || raw.match(/(\d+)/)
    if (match) {
      const val = parseInt(match[1], 10)
      if (Number.isFinite(val) && val > max) max = val
    }
  }
  return 'FAC' + String(max + 1).padStart(3, '0')
}

function FacultyForm({ initial, faculty, onSave, onCancel, collegeOptions, departmentOptions, saving }) {
  const [data, setData] = useState(() => {
    const base = normalize(initial)
    if (!base.employeeId) {
      base.employeeId = getNextFacultyCode(faculty)
    }
    return base
  })
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [photoBusy, setPhotoBusy] = useState(false)
  const readerRef = useRef(null)
  const formRef = useRef(null)
  useEffect(() => () => readerRef.current?.abort(), [])
  const update = (key, value) => { setData(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined })) }
  const focusError = () => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())

  const stepTitles = [...sections.map(s => s.title), 'Documents', 'Preview']
  const totalSteps = stepTitles.length

  const next = event => {
    event.preventDefault()
    const checked = validateFaculty(clean(data), faculty)
    if (step < sections.length) {
      const keys = [...sections[step].fields.map(([key]) => key), ...(step === 1 ? ['employeeCategoryOther'] : [])]
      const currentErrors = Object.fromEntries(Object.entries(checked).filter(([key]) => keys.includes(key)))
      setErrors(currentErrors)
      if (Object.keys(currentErrors).length) { focusError(); return }
      setStep(step + 1)
    } else if (step === sections.length) {
      setErrors({})
      setStep(step + 1)
    } else {
      setErrors(checked)
      if (Object.keys(checked).length) {
        setStep(checked.employeeCategoryOther ? 1 : Math.max(0, sections.findIndex(section => section.fields.some(([key]) => checked[key]))))
        focusError()
        return
      }
      onSave(clean(data))
    }
  }

  const skipStep = () => {
    setErrors({})
    setStep(step + 1)
  }

  const photo = event => {
    const file = event.target.files?.[0]
    if (!file) return
    readerRef.current?.abort()
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setErrors(old => ({ ...old, photo: 'Choose an image smaller than 3 MB.' })); return }
    const reader = new FileReader()
    readerRef.current = reader
    setPhotoBusy(true)
    reader.onload = () => { update('photo', reader.result); update('photoFile', file); setPhotoBusy(false) }
    reader.onerror = () => { setErrors(old => ({ ...old, photo: 'Could not read this image. Please choose another.' })); setPhotoBusy(false) }
    reader.onabort = () => setPhotoBusy(false)
    reader.readAsDataURL(file)
  }

  const section = step < sections.length ? sections[step] : null
  const isDocumentsStep = step === sections.length
  const isPreviewStep = step === totalSteps - 1
  const isStepOptional = (section && !section.fields.some(([, , , required]) => required)) || isDocumentsStep

  return (
    <form className="fm-panel fm-form" ref={formRef} onSubmit={next} noValidate>
      <ol className="fm-stepper">
        {stepTitles.map((title, index) => (
          <li key={title} className={step === index ? 'active' : step > index ? 'complete' : ''} aria-current={step === index ? 'step' : undefined}>
            <span>{step > index ? <FiCheckCircle /> : index + 1}</span>{title}
          </li>
        ))}
      </ol>
      <div className="fm-section-heading">
        <h2>
          {section ? <section.icon /> : isDocumentsStep ? <FiFileText /> : <FiCheckCircle />}
          {section?.title || (isDocumentsStep ? 'Supporting Documents' : 'Faculty Profile Preview')}
        </h2>
        <p>
          {section?.description || (isDocumentsStep ? 'Mark submission status for essential faculty verification documents (optional).' : 'Review all details and documents below before saving this faculty record.')}
        </p>
      </div>
      {step === 0 && (
        <div className="fm-photo-picker">
          <Avatar faculty={data} large />
          <div>
            <span className="fm-photo-label">Profile Photo</span>
            <label className="fm-photo-button" htmlFor="fm-photo">
              {data.photo ? 'Change Photo' : 'Choose Photo'}
              <input id="fm-photo" type="file" accept="image/*" onChange={photo} />
            </label>
            <small className="fm-muted">JPG, PNG or WebP · Maximum 3 MB</small>
            {errors.photo && <small className="fm-error" role="alert">{errors.photo}</small>}
          </div>
        </div>
      )}
      {section ? (
        <div className="fm-form-grid">
          {section.fields.map(field => (
            <Field key={field[0]} field={field} data={data} errors={errors} update={update} collegeOptions={collegeOptions} departmentOptions={departmentOptions} />
          ))}
        </div>
      ) : isDocumentsStep ? (
        <FacultyDocumentsForm
          documents={data.documents || {}}
          onChange={(docKey, docVal) => update('documents', { ...(data.documents || {}), [docKey]: docVal })}
        />
      ) : (
        <>
          <div className="fm-identity">
            <Avatar faculty={data} large />
            <div>
              <h2>{data.fullName}</h2>
              <p>{data.employeeId} · {data.designation}</p>
            </div>
          </div>
          <ProfileSections data={data} collegeOptions={collegeOptions} departmentOptions={departmentOptions} />
        </>
      )}
      <footer className="fm-form-footer">
        <button type="button" className="fm-button secondary" onClick={onCancel}>Cancel</button>
        <span className="fm-muted">Step {step + 1} of {totalSteps}</span>
        <div className="fm-actions">
          {step > 0 && (
            <button type="button" className="fm-button secondary" onClick={() => { setErrors({}); setStep(step - 1) }}>
              Previous
            </button>
          )}
          {isStepOptional && !isPreviewStep && (
            <button type="button" className="fm-button secondary" onClick={skipStep}>
              Skip
            </button>
          )}
          <button type="submit" className="fm-button" disabled={photoBusy || saving}>
            {isPreviewStep ? <><FiCheckCircle /> Save Faculty</> : 'Next'}
          </button>
        </div>
      </footer>
    </form>
  )
}
function AssignmentList({ faculty, onRemove }) {
  const [pending, setPending] = useState(null)
  return (
    <div className="fm-assignment-list">
      {(faculty?.assignments || []).map(item => (
        <article key={item.id} className="fm-assignment-card">
          <div>
            <strong>{item.subjectCode ? item.subjectCode + ' · ' + item.subjectName : item.assignmentType}</strong>
            <p>{item.academicYear} · {item.course} · {item.branch}</p>
            <p>{item.semester} · {item.section} · {item.assignmentType}</p>
          </div>
          <div className="fm-assignment-end">
            {onRemove && (pending === item.id ? (
              <div className="fm-confirm" role="group" aria-label="Confirm assignment removal">
                <span>Remove assignment?</span>
                <button type="button" className="fm-button danger" onClick={() => { onRemove(item.id); setPending(null) }}>Remove</button>
                <button type="button" className="fm-button secondary" onClick={() => setPending(null)}>Keep</button>
              </div>
            ) : (
              <button type="button" className="fm-icon-button" title="Remove assignment" aria-label={'Remove ' + (item.subjectName || item.assignmentType)} onClick={() => setPending(item.id)}>
                <FiTrash2 />
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}
function AssignmentDialog({ faculty, onClose, onAdd, onRemove, toast }) {
  const dialog = useRef(null)
  const [masters, setMasters] = useState({
    years: [],
    courses: [],
    branches: [],
    semesters: [],
    sections: [],
    subjects: [],
  })
  const [data, setData] = useState({
    academicYearId: '',
    academicYear: '',
    courseId: '',
    course: 'B.Tech',
    branchId: '',
    branch: faculty.department || 'Computer Science & Engineering',
    semesterId: '',
    semester: 'Semester 1',
    sectionId: '',
    section: 'Section A',
    assignmentType: 'Subject Faculty',
    subjectId: '',
    subjectCode: '',
    subjectName: '',
    remarks: '',
  })
  const [errors, setErrors] = useState({})
  const [acknowledged, setAcknowledged] = useState(false)
  const load = workload(faculty)
  const inactive = ['Resigned', 'Retired'].includes(faculty.employmentStatus)
  const subjectRequired = ['Subject Faculty', 'Lab Faculty'].includes(data.assignmentType)

  useEffect(() => {
    const returnTo = document.activeElement
    const element = dialog.current
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; returnTo?.focus() }
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      academicYearApi.getAll(),
      courseApi.getAll(),
      branchApi.getAll(),
      facultyMasterApi.getSemesters(),
      sectionApi.getAll(),
      facultyMasterApi.getSubjects(),
    ]).then(([yearsRes, coursesRes, branchesRes, semRes, secRes, subRes]) => {
      if (!active) return
      const allYears = yearsRes.status === 'fulfilled' && Array.isArray(yearsRes.value) ? yearsRes.value : []
      // Academic assignments can only be created in the configured current
      // year. Prefer the explicit current marker; older API responses that
      // do not expose it fall back to the single operational year selector.
      const markedCurrentYear = allYears.find(year => year?.isCurrent === true || year?.current === true || Number(year?.isCurrent) === 1 || Number(year?.current) === 1)
      const currentYear = markedCurrentYear || getDefaultAcademicYear(allYears)
      const years = currentYear ? [currentYear] : []
      const courses = coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value) ? coursesRes.value : []
      const branches = branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value) ? branchesRes.value : []
      const semesters = semRes.status === 'fulfilled' && Array.isArray(semRes.value) ? semRes.value : []
      const sections = secRes.status === 'fulfilled' && Array.isArray(secRes.value) ? secRes.value : []
      const subjects = subRes.status === 'fulfilled' && Array.isArray(subRes.value) ? subRes.value : []

      setMasters({ years, courses, branches, semesters, sections, subjects })

      setData(prev => {
        const matchedYear = years.find(y => String(y.academicYearName || y.name).toLowerCase() === String(prev.academicYear).toLowerCase()) || years[0]
        const matchedCourse = courses.find(c => String(c.courseName || c.name || c.courseCode).toLowerCase() === String(prev.course).toLowerCase()) || courses[0]
        const matchedBranch = branches.find(b => String(b.branchName || b.name).toLowerCase() === String(prev.branch).toLowerCase() || String(b.departmentId) === String(faculty.departmentId)) || branches[0]
        return {
          ...prev,
          academicYearId: matchedYear?.academicYearId ?? matchedYear?.id ?? prev.academicYearId,
          academicYear: matchedYear?.academicYearName ?? matchedYear?.name ?? prev.academicYear,
          courseId: matchedCourse?.courseId ?? matchedCourse?.id ?? prev.courseId,
          course: matchedCourse?.courseName ?? matchedCourse?.name ?? matchedCourse?.courseCode ?? prev.course,
          branchId: matchedBranch?.branchId ?? matchedBranch?.id ?? prev.branchId,
          branch: matchedBranch?.branchName ?? matchedBranch?.name ?? prev.branch,
        }
      })
    })
    return () => { active = false }
  }, [faculty])

  const yearOptions = useMemo(() => {
    if (masters.years.length) return masters.years.map(y => ({ value: String(y.academicYearId ?? y.id), label: y.academicYearName ?? y.name }))
    return []
  }, [masters.years])

  const courseOptions = useMemo(() => {
    if (masters.courses.length) return masters.courses.map(c => ({ value: String(c.courseId ?? c.id), label: c.courseName ?? c.name ?? c.courseCode }))
    return []
  }, [masters.courses])

  const branchOptions = useMemo(() => {
    if (masters.branches.length) {
      const list = data.courseId ? masters.branches.filter(b => !b.courseId || String(b.courseId) === String(data.courseId)) : masters.branches
      return list.map(b => ({ value: String(b.branchId ?? b.id), label: b.branchName ?? b.name }))
    }
    return []
  }, [masters.branches, data.courseId])

  const semesterOptions = useMemo(() => {
    const branchId = String(data.branchId || '')
    const options = masters.semesters.filter(s => {
      const mappedBranchId = s.branchId ?? s.branch?.branchId ?? s.branch?.id
      return branchId && mappedBranchId != null && String(mappedBranchId) === branchId
    }).map(s => ({ value: String(s.semesterId ?? s.id), label: s.semesterName ?? s.name ?? `Semester ${s.semesterNumber ?? s.number}` }))
    return [...new Map(options.map(option => [option.label.trim().toLowerCase(), option])).values()]
  }, [masters.semesters, data.branchId])

  const sectionOptions = useMemo(() => {
    const branchId = String(data.branchId || '')
    const semesterId = String(data.semesterId || '')
    const options = masters.sections.filter(s => {
      const mappedBranchId = s.branchId ?? s.branch?.branchId ?? s.branch?.id
      const mappedSemesterId = s.semesterId ?? s.semester?.semesterId ?? s.semester?.id
      return branchId && semesterId && String(mappedBranchId) === branchId && String(mappedSemesterId) === semesterId
    }).map(s => ({ value: String(s.sectionId ?? s.id), label: s.sectionName ?? s.name ?? s.sectionCode }))
    return [...new Map(options.map(option => [option.label.trim().toLowerCase(), option])).values()]
  }, [masters.sections, data.branchId, data.semesterId])

  const subjectOptions = useMemo(() => {
    if (masters.subjects.length) {
      return masters.subjects.map(subject => {
        // Subject master APIs have used both SubjectCode/SubjectName and
        // Code/Name (plus a few legacy variants). Normalise them here so a
        // schema variation can never render the literal text "undefined".
        const value = subject.subjectId ?? subject.id ?? subject.subjectMasterId ?? subject.courseSubjectId
        const code = subject.subjectCode ?? subject.code ?? subject.subject_code ?? subject.courseCode ?? ''
        const name = subject.subjectName ?? subject.name ?? subject.subject ?? subject.title ?? subject.subjectTitle ?? subject.subject_name ?? subject.courseName ?? ''
        const label = [code, name].filter(value => value !== undefined && value !== null && String(value).trim() !== '').join(' - ')
        return { value: value == null ? '' : String(value), code: String(code || ''), name: String(name || ''), label: label || 'Unnamed subject' }
      }).filter(subject => subject.value)
    }
    return []
  }, [masters.subjects])

  const assignmentTypeOptions = ['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'].map(t => ({ value: t, label: t }))

  const add = event => {
    event.preventDefault()
    if (inactive) return
    const issues = {}
    const hasId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0
    if (!hasId(data.academicYearId)) issues.academicYear = 'Select an academic year from the master list.'
    if (!hasId(data.courseId)) issues.course = 'Select a course from the master list.'
    if (!hasId(data.branchId)) issues.branch = 'Select a branch from the master list.'
    if (!hasId(data.semesterId)) issues.semester = 'Select a semester from the master list.'
    if (!hasId(data.sectionId)) issues.section = 'Select a section from the master list.'
    if ((subjectRequired || data.subjectName) && !data.subjectCode?.trim()) issues.subjectCode = 'Subject code is required.'
    if ((subjectRequired || data.subjectCode) && !data.subjectName?.trim()) issues.subjectName = 'Subject name is required.'

    if ((faculty.assignments || []).some(existing =>
      String(existing.academicYear || '').trim().toLowerCase() === String(data.academicYear || '').trim().toLowerCase() &&
      String(existing.branch || '').trim().toLowerCase() === String(data.branch || '').trim().toLowerCase() &&
      String(existing.semester || '').trim().toLowerCase() === String(data.semester || '').trim().toLowerCase() &&
      String(existing.section || '').trim().toLowerCase() === String(data.section || '').trim().toLowerCase() &&
      String(existing.subjectCode || '').trim().toLowerCase() === String(data.subjectCode || '').trim().toLowerCase() &&
      String(existing.assignmentType || '').trim().toLowerCase() === String(data.assignmentType || '').trim().toLowerCase()
    )) {
      issues.duplicate = data.assignmentType === 'Class Advisor'
        ? 'This section already has a Class Advisor for the selected academic mapping.'
        : 'This academic assignment already exists for this faculty.'
    }

    if (faculty.employmentStatus === 'On Leave' && !acknowledged) {
      issues.leave = 'Acknowledge the leave warning before assigning work.'
    }

    setErrors(issues)
    if (Object.keys(issues).length) {
      requestAnimationFrame(() => dialog.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const item = {
      ...clean(data),
      subjectCode: data.subjectCode.trim().toUpperCase(),
      subjectName: data.subjectName.trim(),
      facultyId: faculty.id,
      id: crypto.randomUUID(),
    }
    onAdd(item)
    setData(old => ({ ...old, subjectId: '', subjectCode: '', subjectName: '', remarks: '' }))
    setAcknowledged(false)
  }

  return (
    <dialog className="fm-modal" ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} aria-labelledby="fm-assignment-title">
      <header className="fm-modal-header">
        <div>
          <p className="fm-eyebrow">ACADEMIC RESPONSIBILITIES</p>
          <h2 id="fm-assignment-title">Academic Assignment</h2>
        </div>
        <button type="button" className="fm-icon-button" title="Close academic assignment" aria-label="Close academic assignment" onClick={onClose}>
          <FiX />
        </button>
      </header>
      <div className="fm-modal-body">
        <div className="fm-identity">
          <Avatar faculty={faculty} />
          <div>
            <strong>{faculty.fullName}</strong>
            <p>{faculty.employeeId} · {faculty.department} · {faculty.designation}</p>
          </div>
          <StatusBadge value={faculty.employmentStatus} />
        </div>
        <div className="fm-load-strip">
          <span>{load.subjects} Subjects</span>
          <span className="fm-load-status">{load.status}</span>
        </div>
        {inactive ? (
          <p className="fm-warning">Academic assignments cannot be added for inactive faculty.</p>
        ) : (
          <form onSubmit={add} noValidate>
            {faculty.employmentStatus === 'On Leave' && (
              <div className="fm-warning">
                <strong>This faculty member is on leave.</strong>
                <label className="fm-checkbox">
                  <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
                  I have reviewed their availability and want to assign new academic work.
                </label>
                {errors.leave && <small className="fm-error" role="alert">{errors.leave}</small>}
              </div>
            )}
            <div className="fm-form-grid">
              <div className="fm-field">
                <label htmlFor="fm-assign-academicYear">Academic Year <span className="fm-required">*</span></label>
                <select
                  id="fm-assign-academicYear"
                  value={data.academicYearId || data.academicYear}
                  onChange={e => {
                    const val = e.target.value
                    const found = yearOptions.find(o => String(o.value) === String(val))
                    setData({ ...data, academicYearId: val, academicYear: found?.label || val })
                    setErrors(old => ({ ...old, academicYear: undefined, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {yearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.academicYear && <small className="fm-error">{errors.academicYear}</small>}
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-course">Course <span className="fm-required">*</span></label>
                <select
                  id="fm-assign-course"
                  value={data.courseId || data.course}
                  onChange={e => {
                    const val = e.target.value
                    const found = courseOptions.find(o => String(o.value) === String(val))
                    setData({ ...data, courseId: val, course: found?.label || val })
                    setErrors(old => ({ ...old, course: undefined, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Course</option>
                  {courseOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.course && <small className="fm-error">{errors.course}</small>}
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-branch">Branch <span className="fm-required">*</span></label>
                <select
                  id="fm-assign-branch"
                  value={data.branchId || data.branch}
                  onChange={e => {
                    const val = e.target.value
                    const found = branchOptions.find(o => String(o.value) === String(val))
                    setData({ ...data, branchId: val, branch: found?.label || val, semesterId: '', semester: '', sectionId: '', section: '' })
                    setErrors(old => ({ ...old, branch: undefined, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Branch</option>
                  {branchOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.branch && <small className="fm-error">{errors.branch}</small>}
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-semester">Semester <span className="fm-required">*</span></label>
                <select
                  id="fm-assign-semester"
                  value={data.semesterId || data.semester}
                  onChange={e => {
                    const val = e.target.value
                    const found = semesterOptions.find(o => String(o.value) === String(val))
                    setData({ ...data, semesterId: val, semester: found?.label || val, sectionId: '', section: '' })
                    setErrors(old => ({ ...old, semester: undefined, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Semester</option>
                  {semesterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.semester && <small className="fm-error">{errors.semester}</small>}
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-section">Section <span className="fm-required">*</span></label>
                <select
                  id="fm-assign-section"
                  value={data.sectionId || data.section}
                  onChange={e => {
                    const val = e.target.value
                    const found = sectionOptions.find(o => String(o.value) === String(val))
                    setData({ ...data, sectionId: val, section: found?.label || val })
                    setErrors(old => ({ ...old, section: undefined, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Section</option>
                  {sectionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.section && <small className="fm-error">{errors.section}</small>}
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-type">Assignment Type <span className="fm-required">*</span></label>
                <select
                  id="fm-assign-type"
                  value={data.assignmentType}
                  onChange={e => {
                    setData({ ...data, assignmentType: e.target.value })
                    setErrors(old => ({ ...old, duplicate: undefined }))
                  }}
                  required
                >
                  {assignmentTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {subjectOptions.length > 0 && (
                <div className="fm-field">
                  <label htmlFor="fm-assign-subject-pick">Select Subject (Catalog)</label>
                  <select
                    id="fm-assign-subject-pick"
                    value={data.subjectId}
                    onChange={e => {
                      const val = e.target.value
                      const found = subjectOptions.find(s => String(s.value) === String(val))
                      if (found) {
                        setData({ ...data, subjectId: val, subjectCode: found.code, subjectName: found.name })
                      } else {
                        setData({ ...data, subjectId: '' })
                      }
                      setErrors(old => ({ ...old, subjectCode: undefined, subjectName: undefined }))
                    }}
                  >
                    <option value="">-- Choose from subjects --</option>
                    {subjectOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              )}

              <div className="fm-field">
                <label htmlFor="fm-assign-subjectCode">Subject Code {subjectRequired && <span className="fm-required">*</span>}</label>
                <input
                  id="fm-assign-subjectCode"
                  type="text"
                  placeholder="e.g. CS301"
                  value={data.subjectCode}
                  onChange={e => {
                    // Subject Management is not available yet.  A faculty
                    // allocation can therefore use a manually entered code
                    // and name; do not retain an unrelated catalog id after
                    // the user changes either value.
                    setData({ ...data, subjectId: '', subjectCode: e.target.value })
                    setErrors(old => ({ ...old, subjectCode: undefined, duplicate: undefined }))
                  }}
                  required={subjectRequired}
                  aria-invalid={Boolean(errors.subjectCode)}
                />
                {errors.subjectCode && <small className="fm-error">{errors.subjectCode}</small>}
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-subjectName">Subject Name {subjectRequired && <span className="fm-required">*</span>}</label>
                <input
                  id="fm-assign-subjectName"
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={data.subjectName}
                  onChange={e => {
                    // See the matching Subject Code handler above.
                    setData({ ...data, subjectId: '', subjectName: e.target.value })
                    setErrors(old => ({ ...old, subjectName: undefined, duplicate: undefined }))
                  }}
                  required={subjectRequired}
                  aria-invalid={Boolean(errors.subjectName)}
                />
                {errors.subjectName && <small className="fm-error">{errors.subjectName}</small>}
              </div>

              <div className="fm-field fm-wide">
                <label htmlFor="fm-assign-remarks">Remarks</label>
                <input
                  id="fm-assign-remarks"
                  type="text"
                  placeholder="Optional allocation notes / classroom reference"
                  value={data.remarks}
                  onChange={e => setData({ ...data, remarks: e.target.value })}
                />
              </div>
            </div>
            {errors.duplicate && <p className="fm-error" role="alert">{errors.duplicate}</p>}
            <div className="fm-assignment-submit">
              <button type="submit" className="fm-button"><FiPlus /> Add Assignment</button>
            </div>
          </form>
        )}
        <section className="fm-current-assignments">
          <h2>Current Assignments <span className="fm-muted">({faculty.assignments?.length || 0})</span></h2>
          {faculty.assignments?.length ? <AssignmentList faculty={faculty} onRemove={onRemove} /> : <EmptyState title="No academic responsibilities assigned." description={inactive ? 'Historical assignments will remain visible here.' : 'Complete the form above to assign academic work.'} />}
        </section>
      </div>
      <div className={'fm-toast ' + (toast ? 'visible' : '')} role="status" aria-live="polite">
        {toast && <><FiCheckCircle />{toast}</>}
      </div>
    </dialog>
  )
}

export default function FacultyManagement() {
  const location = useLocation()
  const navigate = useNavigate()
  const [faculty, setFaculty] = useState([])
  const [loadingFaculty, setLoadingFaculty] = useState(true)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ department: '', designation: '', employmentType: '', employmentStatus: '' })
  const [page, setPage] = useState(1)
  const [assignmentId, setAssignmentId] = useState(null)
  const [collegeOptions, setCollegeOptions] = useState([])
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [detail, setDetail] = useState(null)
  const saveLock = useRef(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  useEffect(() => {
    let active = true
    Promise.all([facultyService.list(), facultyService.getSubjectAllocations()])
      .then(([members, allocations]) => {
        if (!active) return
        const allocationMap = new Map()
        allocations.forEach(item => {
          const facultyId = String(item.facultyId ?? item.employeeProfileId ?? '')
          if (facultyId) allocationMap.set(facultyId, [...(allocationMap.get(facultyId) || []), { ...item, id: item.allocationId ?? item.id }])
        })
        setFaculty(members
          .filter(member => member && typeof member === 'object')
          .map(member => normalize({ ...normalizeFaculty(member), assignments: allocationMap.get(String(member.id)) || member.assignments || [] })))
      })
      .catch(error => setLoadError(error.message || 'Could not load faculty records.'))
      .finally(() => { if (active) setLoadingFaculty(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([facultyMasterApi.getColleges(), departmentApi.getAll()]).then(([colleges, departments]) => {
      if (!active) return
      setCollegeOptions(colleges.map(row => ({ value: String(row.collegeId ?? row.id), label: row.collegeName ?? row.name })))
      setDepartmentOptions(departments.map(row => ({ value: String(row.departmentId ?? row.id), label: row.departmentName ?? row.name })))
    }).catch(error => { if (active) setLoadError(error.message) })
    return () => { active = false }
  }, [])
  const notify = useCallback(message => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }, [])
  const path = location.pathname.replace(/\/$/, '')
  const editId = path.match(/^\/faculty\/([^/]+)\/edit$/)?.[1]
  const detailId = path !== '/faculty/new' ? path.match(/^\/faculty\/([^/]+)$/)?.[1] : null
  const targetId = editId || (detailId === 'attendance' ? null : detailId)
  useEffect(() => {
    setDetail(null); if (!targetId) return
    let active = true
    Promise.all([
      facultyService.getById(targetId).catch(() => null),
      facultyService.getProfile(targetId).catch(() => null),
      facultyService.getWorkload(targetId).catch(() => null),
      facultyService.getSubjectAllocations({ FacultyId: targetId }).catch(() => [])
    ])
      .then(([member, profile, work, allocations]) => {
        if (active) {
          const safeMember = member && typeof member === 'object' ? member : {}
          const matchedListed = faculty.find(f => String(f.id) === String(targetId))
          const existingAssignments = (allocations && allocations.length) ? allocations : (matchedListed?.assignments || safeMember.assignments || [])
          setDetail(normalize({
            ...safeMember,
            ...normalizeFaculty({ ...mergeFacultyData(matchedListed, safeMember, profile), facultyId: safeMember.id || targetId }),
            profileExists: Boolean(profile),
            apiWorkload: work,
            assignments: existingAssignments
          }))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [targetId, faculty])
  const listed = faculty.find(item => item.id === targetId)
  // The directory route must never render an old detail record. This can occur
  // while navigation is settling after a profile or edit screen is closed.
  const selected = targetId ? (detail?.id === targetId ? { ...listed, ...detail, assignments: listed?.assignments || detail?.assignments || [] } : listed) : null
  const assignedFaculty = faculty.find(item => item.id === assignmentId)
  const filtered = useMemo(() => faculty.filter(item => [item.fullName, item.employeeId, item.email, item.mobile, item.department, item.designation].join(' ').toLowerCase().includes(query.trim().toLowerCase()) && Object.entries(filters).every(([key, value]) => !value || item[key] === value)), [faculty, query, filters])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const active = Boolean(query || Object.values(filters).some(Boolean))
  const clear = () => { setQuery(''); setFilters({ department: '', designation: '', employmentType: '', employmentStatus: '' }); setPage(1) }
  const back = () => {
    setDetail(null)
    setAssignmentId(null)
    setLoadError('')
    navigate('/faculty', { replace: true })
  }
  const addFaculty = () => navigate('/faculty/new')
  const nextId = getNextFacultyCode(faculty)
  const save = async data => {
    if (saveLock.current) return
    saveLock.current = true; setSaving(true); setLoadError('')
    let savedId = data.id
    try {
      const saved = data.id ? await facultyService.update(data.id, data) : await facultyService.create(data)
      savedId = String(saved?.id || saved?.facultyId || data.id || '')
      if (!savedId) throw new Error('Faculty saved, but the server did not return its ID. Reload the directory before retrying.')
      if (data.profileExists) await facultyService.updateProfile(savedId, data).catch(() => {})
      else await facultyService.createProfile(savedId, data).catch(() => {})
      if (data.photoFile) await facultyService.uploadProfilePhoto(savedId, data.photoFile)
      const refreshed = await facultyService.getById(savedId).catch(() => saved)
      const normalizedRecord = normalize({ ...mergeFacultyData(data, refreshed), id: savedId, facultyId: savedId })
      setFaculty(rows => data.id ? rows.map(row => row.id === data.id ? { ...row, ...normalizedRecord, assignments: row.assignments } : row) : [normalizedRecord, ...rows.filter(r => r.id !== savedId && r.employeeId !== normalizedRecord.employeeId)])
      notify(data.id ? 'Faculty updated successfully' : 'Faculty created successfully'); clear(); back()
    } catch (error) {
      setLoadError(error.message || 'Faculty could not be saved.')
      if (!data.id && savedId) navigate('/faculty/' + savedId + '/edit')
    } finally { saveLock.current = false; setSaving(false) }
  }
  const refreshAssignments = async () => {
    const assignments = await facultyService.getSubjectAllocations({ FacultyId: assignmentId })
    setFaculty(rows => rows.map(row => row.id === assignmentId ? { ...row, assignments } : row))
  }
  const addAssignment = async item => {
    try {
      const targetFacId = assignmentId || item.facultyId
      const saved = await facultyService.createSubjectAllocation({ ...item, facultyId: targetFacId })
      setFaculty(rows => rows.map(row => String(row.id) === String(targetFacId) ? {
        ...row,
        assignments: [...(row.assignments || []).filter(a => String(a.id) !== String(saved.id)), saved]
      } : row))
      if (detail && String(detail.id) === String(targetFacId)) {
        setDetail(prev => ({
          ...prev,
          assignments: [...(prev.assignments || []).filter(a => String(a.id) !== String(saved.id)), saved]
        }))
      }
      notify('Academic assignment added')
    } catch (error) { notify(error.message || 'Academic assignment could not be added.') }
  }
  const removeAssignment = async id => {
    try {
      await facultyService.deleteSubjectAllocation(id)
      setFaculty(rows => rows.map(row => ({
        ...row,
        assignments: (row.assignments || []).filter(item => String(item.id) !== String(id))
      })))
      if (detail) {
        setDetail(prev => ({
          ...prev,
          assignments: (prev.assignments || []).filter(item => String(item.id) !== String(id))
        }))
      }
      notify('Academic assignment removed')
    } catch (error) { notify(error.message || 'Academic assignment could not be removed.') }
  }
  // Explicit local scope prevents ExportMenu's faculty filename alias using a server endpoint.
  const directoryActions = <><ExportMenu rows={filtered} columns={exportColumns} screen="faculty-local-directory" filename="faculty-roster" title="Faculty Directory" /><button className="fm-button" type="button" onClick={addFaculty}><FiPlus /> Add Faculty</button></>
  let content
  if (path === '/faculty/advisors' || path === '/faculty/subjects') return <Navigate to="/faculty" replace />
  if (path === '/faculty/attendance') content = <FacultyAttendanceScreen faculty={faculty} onNotify={notify} />
  else if (((editId || detailId) && !selected) || (!['/faculty', '/faculty/new'].includes(path) && !editId && !detailId)) {
    content = <section className="fm-panel"><EmptyState title="Faculty record not found" action="Back to Faculty Directory" onAction={back} /></section>
  } else if (path === '/faculty/new' || editId) {
    content = <><header className="faculty-page-header"><div><h1>{editId ? 'Edit Faculty' : 'Add Faculty'}</h1><p>Faculty registration and employment record</p></div><button type="button" className="fm-button secondary" onClick={back}><FiArrowLeft /> Back</button></header><FacultyForm key={location.key + ':' + Boolean(detail)} initial={selected || { employeeId: nextId, employmentType: 'Permanent', employmentStatus: 'Working', employeeCategory: 'Teaching' }} faculty={faculty} collegeOptions={collegeOptions} departmentOptions={departmentOptions} saving={saving} onSave={save} onCancel={back} /></>
  } else if (selected) {
    const load = workload(selected)
    const departmentName = departmentOptions.find(d => String(d.value) === String(selected.departmentId || selected.department))?.label || selected.department || '—'
    content = (
      <>
        <div className="fm-breadcrumb">
          <span>HOME</span> / <span>FACULTY</span> / <strong>FACULTY MANAGEMENT</strong>
        </div>

        <div className="fm-profile-top-row">
          <header className="fm-panel fm-profile-header">
            <div className="fm-identity">
              <Avatar faculty={selected} large />
              <div>
                <p className="fm-eyebrow">FACULTY PROFILE · {selected.employeeId}</p>
                <h1>{selected.fullName}</h1>
                <p>{selected.designation} · {departmentName}</p>
                <StatusBadge value={selected.employmentStatus} />
              </div>
            </div>
            <div className="fm-actions">
              <button type="button" className="fm-button secondary" onClick={() => navigate('/faculty/' + selected.id + '/edit')}>
                <FiEdit2 /> Edit
              </button>
              <button type="button" className="fm-button secondary" onClick={back}>
                <FiArrowLeft /> Back
              </button>
            </div>
          </header>

          <div className="fm-profile-summary-strip">
            <div className="fm-summary-col">
              <small>Total Experience</small>
              <strong>{years(selected.experience)}</strong>
            </div>
            <div className="fm-summary-col">
              <small>Employment Type</small>
              <strong className="text-success">{selected.employmentType || '—'}</strong>
            </div>
            <div className="fm-summary-col">
              <small>Qualification</small>
              <strong className="text-danger">{selected.qualification || '—'}</strong>
            </div>
            <div className="fm-summary-col">
              <small>Workload</small>
              <strong className="text-primary">{load.subjects} Subjects</strong>
            </div>
          </div>
        </div>

        <div className="fm-profile-main-layout">
          <div className="fm-profile-sections">
            {sections.map(section => {
              const fields = section.fields.filter(([key, , , required]) => required || key === 'employeeId' || (selected[key] !== '' && selected[key] != null))
              return (
                <section className="fm-panel" key={section.title}>
                  <h2><section.icon />{section.heading}</h2>
                  {fields.length ? (
                    <dl className="fm-info-grid">
                      {fields.map(([key, label]) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{
                            key === 'collegeName' || key === 'collegeId'
                              ? collegeOptions.find(c => String(c.value) === String(selected[key]))?.label || selected.collegeName || selected[key] || '—'
                              : key === 'department' || key === 'departmentId'
                                ? departmentOptions.find(d => String(d.value) === String(selected[key]))?.label || selected.department || selected[key] || '—'
                                : key === 'employeeCategory' && ['Others', 'Other'].includes(selected.employeeCategory)
                                  ? (selected.employeeCategoryOther ? `Other (${selected.employeeCategoryOther})` : 'Other')
                                  : experienceKeys.includes(key)
                                    ? years(selected[key])
                                    : selected[key] || '—'
                          }</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="fm-muted">No optional contact information provided.</p>
                  )}
                </section>
              )
            })}
          </div>

          <section className="fm-panel fm-responsibilities-sidebar">
            <header className="fm-sidebar-header">
              <h2><FiBriefcase /> Current Academic Responsibilities</h2>
              <span className={'erp-status-badge ' + (load.status === 'Unassigned' ? 'pending' : 'working')}>
                {load.status}
              </span>
            </header>
            {selected.assignments?.length ? (
              <div className="fm-sidebar-assignments">
                <AssignmentList faculty={selected} onRemove={removeAssignment} />
              </div>
            ) : (
              <div className="fm-sidebar-empty">
                <div className="fm-sidebar-empty-icon">
                  <FiUsers />
                </div>
                <h3>No academic responsibilities assigned.</h3>
              </div>
            )}
          </section>
        </div>
      </>
    )
  } else {
    const summary = [{ label: 'Total Faculty', value: faculty.length }, { label: 'Working', value: faculty.filter(row => row.employmentStatus === 'Working').length, tone: 'active' }, { label: 'On Leave', value: faculty.filter(row => row.employmentStatus === 'On Leave').length, tone: 'danger' }, { label: 'Permanent', value: faculty.filter(row => row.employmentType === 'Permanent').length, tone: 'upcoming' }]
    content = <><header className="faculty-page-header"><div><p className="fm-eyebrow">ACADEMIC RESOURCES</p><h1>Faculty Management</h1><p>Manage faculty profiles, employment records, academic responsibilities and workload.</p></div><div className="fm-actions">{directoryActions}</div></header><div className="faculty-header-summary"><CompactSummary label="Faculty management summary" items={summary} /></div><section className="faculty-directory"><header className="fm-section-bar"><div><p className="fm-eyebrow">FACULTY DIRECTORY</p><p className="fm-muted">{filtered.length} faculty records</p></div></header><FilterPanel active={active} onClear={clear}><div className="faculty-filters"><label className="faculty-search"><FiSearch /><input aria-label="Search faculty" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search faculty by name, employee ID, email or mobile" /></label>{[['department', 'Department', departments], ['designation', 'Designation', designations], ['employmentType', 'Employment Type', employmentTypes], ['employmentStatus', 'Employment Status', statuses]].map(([key, label, options]) => <SearchableSelect key={key} label={label} value={filters[key]} options={options} placeholder={label} onChange={value => { setFilters(old => ({ ...old, [key]: value })); setPage(1) }} />)}</div></FilterPanel>{filtered.length ? <><div className="faculty-table-wrap"><table><caption className="fm-sr-only">Faculty directory and records</caption><thead><tr>{['Faculty Code', 'Faculty Name', 'Department', 'Designation', 'Total Experience', 'Employment Type', 'Status', 'Actions'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(item => <tr key={item.id}><td><span className="fm-employee-id">{item.employeeId}</span></td><td><div className="fm-identity"><Avatar faculty={item} /><div><strong>{item.fullName}</strong><small>{item.email}</small></div></div></td><td className="fm-department">{departmentOptions.find(d => String(d.value) === String(item.departmentId || item.department))?.label || item.department || '—'}</td><td>{item.designation || '—'}</td><td>{years(item.experience)}</td><td>{item.employmentType || '—'}</td><td><StatusBadge value={item.employmentStatus} /></td><td><div className="fm-actions"><button type="button" className="fm-icon-button" title="View faculty" aria-label={'View: ' + item.fullName} onClick={() => navigate('/faculty/' + item.id)}><FiEye /></button><button type="button" className="fm-icon-button" title="Assign Academic Work" aria-label={'Assign academic work: ' + item.fullName} onClick={() => setAssignmentId(item.id)}><FiBriefcase /></button></div></td></tr>)}</tbody></table></div><TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} /></> : <EmptyState title={faculty.length ? 'No faculty found' : 'No faculty records available'} description={faculty.length ? 'Try changing your search or filters.' : 'Add faculty members to start managing academic resources.'} action={faculty.length ? 'Clear Filters' : 'Add Faculty'} onAction={faculty.length ? clear : addFaculty} />}</section></>
  }
  return (
    <DashboardLayout>
      <main className="faculty-management">
        {loadError && <p className="fm-error" role="alert">{loadError}</p>}
        {loadingFaculty ? <section className="fm-panel">Loading faculty records…</section> : content}
        {assignedFaculty && (
          <AssignmentDialog
            faculty={assignedFaculty}
            onClose={() => setAssignmentId(null)}
            onAdd={addAssignment}
            onRemove={removeAssignment}
            toast={toast}
          />
        )}
        <div className={'fm-toast ' + (toast ? 'visible' : '')} role="status" aria-live="polite">{toast && <><FiCheckCircle />{toast}</>}</div>
      </main>
    </DashboardLayout>
  )
}
