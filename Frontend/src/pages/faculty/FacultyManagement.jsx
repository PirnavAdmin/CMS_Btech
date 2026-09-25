import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiBriefcase, FiCheckCircle, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiFilter, FiPlus, FiSearch, FiUser, FiUsers, FiClock, FiBookOpen, FiMapPin, FiX, FiTrash2, FiFileText } from 'react-icons/fi'
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
import facultyService, { normalizeFaculty, mergeFacultyData, clearFacultyLocalStorage, saveLocalAttendanceRecord } from '../../services/facultyService'
import subjectService from '../../services/subjectService'
import './FacultyManagement.css'
import './FacultyAttendance.css'
import { localAttendanceDate, loadDailyAttendancePeriod, attendanceStatusLabel, normalizeAttendanceRow, combineAttendance, attendanceFacultyMap } from '../../utils/facultyAttendance'
import { showSuccess, showError, showWarning, showInfo } from '../../utils/toast'

const PAGE_SIZE = 5
const WORKLOAD_LIMITS = { under: 12, normal: 20 }
const statuses = ['Working', 'On Leave', 'Resigned', 'Retired']
export const teachingDesignations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Senior Lecturer', 'Lecturer', 'Visiting Faculty', 'Guest Faculty', 'HOD', 'Dean']
export const nonTeachingDesignations = ['Librarian', 'Assistant Librarian', 'Lab Assistant', 'Lab Technician', 'System Administrator', 'Network Administrator', 'Accountant', 'Administrative Officer', 'Office Assistant', 'Junior Assistant', 'Store Keeper', 'Technical Assistant', 'Clerk', 'Attender']
const designations = [...teachingDesignations, ...nonTeachingDesignations]
const employmentTypes = ['Permanent', 'Contract', 'Visiting', 'Guest']
// employeeCategory is a UI-only value in the current API.  Always derive it
// from persisted data as well, so a non-teaching staff member never moves to
// the teaching directory after the page reloads.
const employeeCategoryOf = (row = {}) => {
  const raw = String(row.employeeCategory ?? row.employee_category ?? row.EmployeeCategory ?? row.category ?? row.facultyType ?? '').trim().toLowerCase()
  if (/non[-\s]?teaching/.test(raw) || raw === 'others' || raw === 'other') return 'Non-Teaching'
  if (raw === 'teaching') return 'Teaching'
  const designation = String(row.designation ?? row.Designation ?? row.designationName ?? row.DesignationName ?? row.role ?? '').trim().toLowerCase()
  const isTeaching = teachingDesignations.some(value => value.toLowerCase() === designation)
  if (isTeaching) return 'Teaching'
  const exactNonTeaching = nonTeachingDesignations.some(value => value.toLowerCase() === designation)
  if (exactNonTeaching) return 'Non-Teaching'
  return /\b(librar|lab|system|network|account|administrat|office|junior assistant|store|technical assistant|clerk|attender|warden|security|driver|electrician|plumber|staff|non[-\s]?teaching)\b/i.test(designation)
    ? 'Non-Teaching'
    : 'Teaching'
}
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'LOP', 'Not Marked']
const ATTENDANCE_PERCENTAGE_NOTE = 'Attendance percentage is calculated using marked attendance records only.'
const today = () => localAttendanceDate(new Date())
const formatMinutes = minutes => {
  const total = Number(minutes) || 0
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (!hours && !mins) return '0h'
  if (!mins) return `${hours}h`
  return `${hours}h ${mins}m`
}
export const formatTimeView = value => {
  if (!value || value === '—' || value === '') return '—'
  const str = String(value).trim()
  if (/^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM)$/i.test(str)) return str
  const [hourText, minuteText] = str.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText || 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
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
  const facultyMap = attendanceFacultyMap(faculty || [])
  const statusPriority = { Present: 5, Late: 4, 'Half Day': 4, 'On Leave': 3, LOP: 3, Absent: 2, 'Not Marked': 1 }

  const normalized = (Array.isArray(records) ? records : []).map(record => {
    const rawFacId = String(
      record.facultyId ??
      record.FacultyId ??
      record.faculty?.facultyId ??
      record.faculty?.FacultyId ??
      record.faculty?.id ??
      record.faculty?.Id ??
      record.employeeProfileId ??
      record.EmployeeProfileId ??
      ''
    )
    const matchedCanonicalId = facultyMap.get(rawFacId) || rawFacId
    const status = normalizeAttendanceStatus(record.status ?? record.attendanceStatus ?? record.Status ?? record.AttendanceStatus)
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defIn = status === 'Late' ? '09:30' : isWorking ? '09:00' : ''
    const defOut = status === 'Half Day' ? '13:00' : isWorking ? '17:00' : ''
    const checkIn = (record.checkIn && record.checkIn !== '—' && record.checkIn !== '') ? record.checkIn : (record.CheckIn || record.checkInTime || record.CheckInTime || (isWorking ? defIn : '—'))
    const checkOut = (record.checkOut && record.checkOut !== '—' && record.checkOut !== '') ? record.checkOut : (record.CheckOut || record.checkOutTime || record.CheckOutTime || (isWorking ? defOut : '—'))
    return {
      ...record,
      facultyId: matchedCanonicalId,
      date: normalizeAttendanceDate(record.attendanceDate ?? record.date ?? record.Date),
      status,
      checkIn,
      checkOut,
      remarks: record.remarks || record.Remarks || '—',
      source: record.source || 'Manual',
    }
  })

  const byFacultyAndDate = new Map()
  for (const record of normalized) {
    const key = `${record.facultyId}|${record.date}`
    const current = byFacultyAndDate.get(key)
    if (!current) {
      byFacultyAndDate.set(key, record)
    } else {
      const curPriority = statusPriority[current.status] || 0
      const recPriority = statusPriority[record.status] || 0
      const bestStatus = (record.status && record.status !== 'Not Marked') ? record.status : (current.status || record.status || 'Not Marked')
      const attId = record.attendanceId || current.attendanceId || null
      byFacultyAndDate.set(key, {
        ...current,
        ...record,
        attendanceId: attId,
        id: attId || record.id || current.id || '',
        status: bestStatus,
        checkIn: (record.checkIn && record.checkIn !== '—' && record.checkIn !== '') ? record.checkIn : current.checkIn,
        checkOut: (record.checkOut && record.checkOut !== '—' && record.checkOut !== '') ? record.checkOut : current.checkOut,
        remarks: (record.remarks && record.remarks !== '—' && record.remarks !== '') ? record.remarks : current.remarks,
      })
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
const parseTimeToMinutes = timeStr => {
  if (!timeStr || timeStr === '—' || timeStr === '') return null
  const str = String(timeStr).trim()
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let hour = parseInt(match12[1], 10)
    const minute = parseInt(match12[2], 10)
    const meridian = match12[3].toUpperCase()
    if (meridian === 'PM' && hour < 12) hour += 12
    if (meridian === 'AM' && hour === 12) hour = 0
    return hour * 60 + minute
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (match24) {
    const hour = parseInt(match24[1], 10)
    const minute = parseInt(match24[2], 10)
    return hour * 60 + minute
  }
  return null
}

const calculateWorkingMinutes = values => {
  if (!values || values.status === 'Not Marked' || ['Absent', 'On Leave', 'LOP'].includes(values.status)) return 0
  const checkInValue = values.rawCheckIn || values.checkIn || values.checkInTime || values.CheckInTime || ''
  const checkOutValue = values.rawCheckOut || values.checkOut || values.checkOutTime || values.CheckOutTime || ''
  const start = parseTimeToMinutes(checkInValue)
  const end = parseTimeToMinutes(checkOutValue)
  if (start !== null && end !== null && end > start) {
    return end - start
  }
  return 0
}

const getAttendanceDisplayHours = row => {
  if (!row || !['Present', 'Late', 'Half Day'].includes(row.status)) return '—'
  const explicitMinutes = Number(row.workingMinutes)
  const minutes = (Number.isFinite(explicitMinutes) && explicitMinutes > 0) ? explicitMinutes : calculateWorkingMinutes(row)
  return minutes > 0 ? formatMinutes(minutes) : '—'
}
const resolveAttendanceRecords = (records, faculty) => {
  const facultyMap = new Map((faculty || []).map(item => [String(item.id), item]))
  return mergeAttendanceRecords(faculty, records).map(record => {
    const matched = facultyMap.get(String(record.facultyId)) || (faculty || []).find(item =>
      String(item.id) === String(record.facultyId) ||
      String(item.facultyId) === String(record.facultyId) ||
      (item.employeeId && (record.employeeId === item.employeeId || record.facultyCode === item.employeeId || String(record.facultyId) === String(item.employeeId))) ||
      (item.facultyCode && (record.facultyCode === item.facultyCode || record.employeeId === item.facultyCode || String(record.facultyId) === String(item.facultyCode))) ||
      (item.employeeProfileId && (String(record.employeeProfileId) === String(item.employeeProfileId) || String(record.facultyId) === String(item.employeeProfileId)))
    ) || {
      id: record.facultyId,
      fullName: 'Unknown Faculty',
      employeeId: 'N/A',
      department: 'N/A',
      designation: 'N/A',
    }
    const status = normalizeAttendanceStatus(record.status ?? record.attendanceStatus)
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defaultCheckIn = status === 'Late' ? '09:30' : '09:00'
    const defaultCheckOut = status === 'Half Day' ? '13:00' : '17:00'
    const checkIn = isWorking ? (record.checkIn && record.checkIn !== '—' && record.checkIn !== '' ? record.checkIn : defaultCheckIn) : '—'
    const checkOut = isWorking ? (record.checkOut && record.checkOut !== '—' && record.checkOut !== '' ? record.checkOut : defaultCheckOut) : '—'
    const workingMinutes = typeof record.workingMinutes === 'number' && record.workingMinutes > 0 ? record.workingMinutes : calculateWorkingMinutes({ ...record, status, checkIn, checkOut })
    const hours = getAttendanceDisplayHours({ ...record, status, workingMinutes, checkIn, checkOut })
    return {
      ...record,
      faculty: matched,
      facultyId: String(record.facultyId),
      hours,
      workingMinutes,
      status,
      checkIn: formatTimeView(checkIn),
      checkOut: formatTimeView(checkOut),
      rawCheckIn: checkIn,
      rawCheckOut: checkOut,
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
  const filteredRecords = (Array.isArray(records) ? records : []).filter(record => normalizeAttendanceDate(record.date || record.attendanceDate) === targetDate)
  return (faculty || []).filter(item => !filters.department || item.department === filters.department).map(item => {
    const facultyId = String(item.id)
    const matchingRecords = filteredRecords.filter(record =>
      String(record.facultyId) === facultyId ||
      String(record.faculty?.id) === facultyId ||
      String(record.faculty?.facultyId) === facultyId ||
      (item.facultyId && String(record.facultyId) === String(item.facultyId)) ||
      (item.employeeId && (record.employeeId === item.employeeId || record.facultyCode === item.employeeId || String(record.facultyId) === String(item.employeeId))) ||
      (item.facultyCode && (record.facultyCode === item.facultyCode || record.employeeId === item.facultyCode || String(record.facultyId) === String(item.facultyCode))) ||
      (item.employeeProfileId && (String(record.employeeProfileId) === String(item.employeeProfileId) || String(record.facultyId) === String(item.employeeProfileId)))
    )
    const statusPriority = { Present: 5, Late: 4, 'Half Day': 4, 'On Leave': 3, LOP: 3, Absent: 2, 'Not Marked': 1 }
    const current = [...matchingRecords].reverse().find(r => r.status && r.status !== 'Not Marked') || matchingRecords[matchingRecords.length - 1] || matchingRecords[0]
    const status = current?.status || 'Not Marked'
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defaultCheckIn = status === 'Late' ? '09:30' : '09:00'
    const defaultCheckOut = status === 'Half Day' ? '13:00' : '17:00'
    const rawCheckIn = isWorking ? (current?.rawCheckIn || (current?.checkIn && current.checkIn !== '—' && current.checkIn !== '' ? current.checkIn : defaultCheckIn)) : '—'
    const rawCheckOut = isWorking ? (current?.rawCheckOut || (current?.checkOut && current.checkOut !== '—' && current.checkOut !== '' ? current.checkOut : defaultCheckOut)) : '—'
    const workingMinutes = current?.workingMinutes ?? calculateWorkingMinutes({ ...current, status, checkIn: rawCheckIn, checkOut: rawCheckOut })
    const hours = getAttendanceDisplayHours({ ...current, status, workingMinutes, checkIn: rawCheckIn, checkOut: rawCheckOut })
    const row = {
      id: current?.attendanceId || current?.id || '',
      attendanceId: current?.attendanceId || null,
      facultyId,
      faculty: item,
      date: targetDate,
      status,
      checkIn: formatTimeView(rawCheckIn),
      checkOut: formatTimeView(rawCheckOut),
      rawCheckIn,
      rawCheckOut,
      remarks: current?.remarks || '—',
      hours,
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
    ['collegeId', 'College Name', 'college', true], ['employeeId', 'Faculty ID', 'readonly'], ['fullName', 'Faculty Full Name', 'text', true],
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
    ['qualification', 'Highest Qualification', ['Ph.D', 'M.Tech', 'M.E', 'MCA', 'M.Sc', 'B.Tech', 'Other']],
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
const years = value => value === '' || value == null ? '—' : (parseFloat(value) || 0) + ' Years'
const normalize = (row = {}) => {
  const safeRow = row && typeof row === 'object' ? row : {}
  return { ...Object.fromEntries(sections.flatMap(s => s.fields.map(([key]) => [key, '']))), employeeCategoryOther: safeRow.employeeCategoryOther || '', qualificationOther: safeRow.qualificationOther || '', employmentStatus: 'Working', documents: safeRow.documents || {}, photo: '', assignments: [], ...safeRow, employeeCategory: employeeCategoryOf(safeRow), employmentStatus: safeRow.employmentStatus || 'Working', documents: safeRow.documents || {}, assignments: Array.isArray(safeRow.assignments) ? safeRow.assignments : [], collegeName: safeRow.collegeName || '', experience: safeRow.experience == null ? '' : String(parseFloat(safeRow.experience) || 0) }
}
const clean = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
const workload = row => {
  const assignments = Array.isArray(row?.assignments) ? row.assignments : []
  const count = assignments.length
  const subjects = new Set(assignments.filter(a => a.subjectCode || a.subjectName).map(a => (a.subjectCode || a.subjectName).toUpperCase())).size
  const hours = assignments.reduce((sum, item) => sum + Number(item.weeklyHours || item.credits || 4), 0)
  if (count === 0 && subjects === 0) {
    return { hours: 0, subjects: 0, status: 'Unassigned' }
  }
  const effectiveSubjects = Math.max(subjects, count)
  const status = hours <= WORKLOAD_LIMITS.under ? 'Assigned' : hours <= WORKLOAD_LIMITS.normal ? 'Normal Load' : 'Over Load'
  return { hours, subjects: effectiveSubjects, status }
}
const exportColumns = [['employeeId', 'Employee ID'], ['fullName', 'Faculty Name'], ['department', 'Department'], ['designation', 'Designation'], ['qualification', 'Qualification'], ['experience', 'Experience'], ['mobile', 'Mobile'], ['email', 'Email'], ['employmentType', 'Employment Type'], ['employmentStatus', 'Employment Status']].map(([value, label]) => ({ label, value: value === 'experience' ? row => years(row.experience) : value }))

function validateFaculty(data, rows) {
  const errors = {}
  sections.forEach(section => section.fields.forEach(([key, label, type, required]) => {
    if (required && !String(data[key] ?? '').trim()) errors[key] = label + ' is required.'
    if (data[key] && Array.isArray(type) && !type.includes(data[key])) errors[key] = 'Select a valid ' + label.toLowerCase() + '.'
  }))
  if (['Others', 'Other'].includes(data.employeeCategory) && !String(data.employeeCategoryOther || '').trim()) errors.employeeCategoryOther = 'Specify the employee category.'
  if (!data.employeeId || rows.some(row => row.id !== data.id && String(row.collegeId ?? row.college_id ?? '') === String(data.collegeId ?? '') && (row.employeeId || row.facultyCode) === data.employeeId)) errors.employeeId = 'Faculty Code must be unique for this college.'
  if (!data.fullName?.trim()) errors.fullName = 'Faculty full name is required.'
  else if (data.fullName.trim().length < 2 || !/^[\p{L}\p{M} .?'-]+$/u.test(data.fullName.trim())) errors.fullName = 'Enter a valid name using letters (at least 2 characters).'
  for (const key of ['collegeId', 'departmentId']) if (!Number.isSafeInteger(Number(data[key])) || Number(data[key]) <= 0) errors[key] = 'Select a valid ' + (key === 'collegeId' ? 'college.' : 'department.')
  for (const key of ['email', 'personalEmail']) if (data[key] && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(data[key].trim())) errors[key] = 'Enter a valid email address.'
  if (rows.some(row => row.id !== data.id && String(row.email || '').trim().toLowerCase() === data.email?.trim().toLowerCase())) errors.email = 'A faculty member with this email already exists.'
  for (const key of ['mobile', 'alternateMobile', 'emergencyMobile']) {
    const number = String(data[key] ?? '').trim()
    if (number && !/^[6-9]\d{9}$/.test(number)) errors[key] = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'
  }
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
function AttendanceEditor({ record, collegeOptions = [], departmentOptions = [], allFaculty = [], onClose, onSave, onReset }) {
  const initialStatus = record.status === 'Not Marked' ? 'Present' : record.status
  const isInitialWorking = ['Present', 'Late', 'Half Day'].includes(initialStatus)
  const defaultInitialCheckIn = initialStatus === 'Late' ? '09:30' : '09:00'
  const defaultInitialCheckOut = initialStatus === 'Half Day' ? '13:00' : '17:00'
  const initialCheckIn = record.rawCheckIn || (record.checkIn && record.checkIn !== '—' ? record.checkIn : '') || (isInitialWorking ? defaultInitialCheckIn : '')
  const initialCheckOut = record.rawCheckOut || (record.checkOut && record.checkOut !== '—' ? record.checkOut : '') || (isInitialWorking ? defaultInitialCheckOut : '')

  const [data, setData] = useState({
    status: initialStatus,
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    remarks: record.remarks === '—' ? '' : record.remarks,
  })
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmLop, setConfirmLop] = useState(false)
  const isLop = data.status === 'LOP'
  const isNonWorkingStatus = ['Absent', 'On Leave', 'LOP'].includes(data.status)
  const displayCode = formatFacultyDisplayCode(record.faculty, collegeOptions, allFaculty) || record.faculty.employeeId || '—'
  const departmentName = departmentOptions.find(d => String(d.value) === String(record.faculty.departmentId || record.faculty.department))?.label || record.faculty.department || record.faculty.departmentName || '—'
  const save = event => {
    event.preventDefault()
    if (['On Leave', 'LOP'].includes(data.status) && !confirmLop) return setConfirmLop(true)
    const isWorking = ['Present', 'Late', 'Half Day'].includes(data.status)
    const defCheckIn = data.status === 'Late' ? '09:30' : '09:00'
    const defCheckOut = data.status === 'Half Day' ? '13:00' : '17:00'
    const finalCheckIn = isWorking ? (data.checkIn || defCheckIn) : ''
    const finalCheckOut = isWorking ? (data.checkOut || defCheckOut) : ''
    if (!isLop && isWorking && !finalCheckIn) return setError('Check In is required for this attendance status.')
    if (!isLop && ['Present', 'Late'].includes(data.status) && !finalCheckOut) return setError('Check Out is required for Present and Late attendance.')
    if (!isLop && finalCheckIn && finalCheckOut && finalCheckOut <= finalCheckIn) return setError('Check Out must be later than Check In.')
    setError('')
    onSave({
      ...record,
      ...data,
      status: isLop ? 'LOP' : data.status,
      checkIn: isNonWorkingStatus ? '' : finalCheckIn,
      checkOut: isNonWorkingStatus ? '' : finalCheckOut,
      remarks: data.remarks || '',
      facultyId: record.faculty.id,
      date: record.date,
    })
  }
  return <div className="fm-modal-backdrop"><form className="fm-attendance-editor" onSubmit={save}><header><div><p className="fm-eyebrow">{record.status === 'Not Marked' ? 'MARK ATTENDANCE' : 'EDIT ATTENDANCE'}</p><h2>{record.faculty.fullName}</h2><p>{displayCode} · {departmentName}</p></div><button className="fm-icon-button" type="button" aria-label="Close attendance editor" onClick={onClose}><FiX /></button></header><div className="fm-form-grid"><label>Status<select value={data.status} onChange={event => {
    const status = event.target.value
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defIn = status === 'Late' ? '09:30' : '09:00'
    const defOut = status === 'Half Day' ? '13:00' : '17:00'
    setData({
      ...data,
      status,
      checkIn: isWorking ? (data.checkIn || defIn) : '',
      checkOut: isWorking ? (data.checkOut || defOut) : '',
    })
    setError('')
    setConfirmLop(false)
  }}>{['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map(value => <option key={value}>{value}</option>)}<option value="LOP">Loss of Pay</option></select></label><AttendanceTimeField label="Check In" value={data.checkIn} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkIn: value }); setError('') }} /><AttendanceTimeField label="Check Out" value={data.checkOut} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkOut: value }); setError('') }} /><label className="fm-wide">Remarks<textarea rows="2" value={data.remarks} onChange={event => setData({ ...data, remarks: event.target.value })} /></label></div>{error && <p className="fm-error" role="alert">{error}</p>}{confirmLop && <div className="fm-lop-confirm" role="alert"><div><strong>Confirm attendance status?</strong><p>You are marking {record.faculty.fullName} ({displayCode}) as {attendanceStatusLabel(data.status)} for {new Date(record.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmLop(false)}>Cancel</button><button className="fm-button" type="button" onClick={() => { setConfirmLop(false); onSave({ ...record, ...data, status: data.status, checkIn: isNonWorkingStatus ? '' : data.checkIn, checkOut: isNonWorkingStatus ? '' : data.checkOut, remarks: data.remarks || '', facultyId: record.faculty.id, date: record.date }) }}>{data.status === 'LOP' ? 'Mark Loss of Pay' : 'Mark On Leave'}</button></div></div>}{confirmReset && <div className="fm-reset-confirm" role="alert"><div><strong>Reset this attendance record?</strong><p>The current status, time, and remarks will be cleared.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmReset(false)}>Keep Editing</button><button className="fm-button danger" type="button" onClick={() => onReset(record)}>Reset Record</button></div></div>}<footer>{record.status !== 'Not Marked' && !confirmReset && <button className="fm-button danger" type="button" onClick={() => setConfirmReset(true)}>Reset to Not Marked</button>}<button className="fm-button secondary" type="button" onClick={onClose}>Cancel</button><button className="fm-button" type="submit">Save Attendance</button></footer></form></div>
}
function FacultyAttendanceScreen({ faculty, collegeOptions = [], departmentOptions = [], onNotify }) {
  const [tab, setTab] = useState('daily')
  const [reportType, setReportType] = useState('daily')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [bulkConfirmation, setBulkConfirmation] = useState(null)
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [todayRecords, setTodayRecords] = useState([])
  const [serverDaily, setServerDaily] = useState([]), [serverReport, setServerReport] = useState([])
  const [attendanceBusy, setAttendanceBusy] = useState(false), [attendanceError, setAttendanceError] = useState('')
  const attendanceLock = useRef(false), attendanceVersion = useRef(0)
  const [dailyPage, setDailyPage] = useState(1)
  const [registerPage, setRegisterPage] = useState(1)
  const [reportPage, setReportPage] = useState(1)
  const defaultDaily = () => ({ date: today(), facultyType: 'Teaching', department: '', status: '', search: '' })
  const defaultRegister = () => ({ from: '', to: today(), facultyType: 'Teaching', department: '', facultyId: '', status: '', search: '' })
  const defaultReport = () => ({ date: today(), weekStart: mondayOf(today()), month: today().slice(5, 7), year: today().slice(0, 4), facultyType: 'Teaching', department: '', facultyId: '', status: '', search: '' })
  const [dailyFilters, setDailyFilters] = useState(defaultDaily)
  const [registerFilters, setRegisterFilters] = useState(defaultRegister)
  const [reportFilters, setReportFilters] = useState(() => ({ daily: defaultReport(), weekly: defaultReport(), monthly: defaultReport() }))
  const currentReport = reportFilters[reportType]
  const getFacultyDept = f => {
    if (!f) return '—'
    const match = departmentOptions.find(d => String(d.value) === String(f.departmentId || f.department))
    return match ? match.label : f.department || f.departmentName || '—'
  }
  const getFacultyCode = f => {
    if (!f) return '—'
    const code = formatFacultyDisplayCode(f, collegeOptions, faculty)
    if (code && code !== '—') return code
    return f.employeeId || f.facultyCode || (f.id ? `FAC-${f.id}` : '—')
  }
  const normalizeAttendance = useCallback((rows, options) => mergeAttendanceRecords(faculty, rows.map(row => normalizeAttendanceRow(row, options))), [faculty])
  const loadAttendance = useCallback(async (expectedRecords = []) => {
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
      const combined = combineAttendance(
        mergeAttendanceRecords(faculty, periodDaily),
        normalizeAttendance(records),
        normalizeAttendance(daily, { daily: true, date: dailyDate })
      )
      const todayRows = params.fromDate === today() && params.toDate === today() && !params.facultyId && !params.status
        ? combined
        : normalizeAttendance(await facultyService.getAttendance({ fromDate: today(), toDate: today() }))
      if (version !== attendanceVersion.current) return
      setTodayRecords(todayRows)
      expectedRecords.forEach(exp => {
        const isExpWorking = ['Present', 'Late', 'Half Day'].includes(exp.status)
        const defIn = exp.status === 'Late' ? '09:30' : '09:00'
        const defOut = exp.status === 'Half Day' ? '13:00' : '17:00'
        const checkIn = isExpWorking ? (exp.checkIn || defIn) : ''
        const checkOut = isExpWorking ? (exp.checkOut || defOut) : ''
        const expDate = normalizeAttendanceDate(exp.date)
        const matchIndex = combined.findIndex(r => (String(r.facultyId) === String(exp.facultyId) || String(r.faculty?.id) === String(exp.facultyId)) && normalizeAttendanceDate(r.date) === expDate)
        if (matchIndex >= 0) {
          combined[matchIndex] = {
            ...combined[matchIndex],
            status: exp.status,
            checkIn: isExpWorking ? (checkIn || combined[matchIndex].checkIn) : '—',
            checkOut: isExpWorking ? (checkOut || combined[matchIndex].checkOut) : '—',
            remarks: exp.remarks !== undefined ? exp.remarks : combined[matchIndex].remarks,
          }
        } else {
          combined.push({
            facultyId: String(exp.facultyId),
            date: expDate,
            status: exp.status,
            checkIn,
            checkOut,
            remarks: exp.remarks || '—',
            source: 'Manual',
          })
        }
      })
      setAttendanceRecords([...combined])
      setServerDaily([...combined])
      setServerReport([])
      return true
    } catch (error) { if (version === attendanceVersion.current) { setAttendanceError(error.message); } return false }
  }, [faculty, normalizeAttendance, tab, dailyFilters, registerFilters, reportFilters, reportType])
  useEffect(() => { const timer = setTimeout(() => { loadAttendance() }, 200); return () => { clearTimeout(timer); attendanceVersion.current++ } }, [loadAttendance])

  // Missing attendance is displayed as Not Marked; only API records are persisted.
  const resolvedRecords = useMemo(() => resolveAttendanceRecords(attendanceRecords, faculty), [attendanceRecords, faculty])
  const matchesFacultyType = (row, facultyType) => !facultyType || employeeCategoryOf(row.faculty) === facultyType
  const dailyRows = useMemo(() => dailyAttendanceRows(serverDaily, faculty, dailyFilters).filter(row => matchesFacultyType(row, dailyFilters.facultyType)), [serverDaily, faculty, dailyFilters])
  const registerRows = useMemo(() => filterAttendanceRecords(resolvedRecords, registerFilters).filter(row => matchesFacultyType(row, registerFilters.facultyType)), [resolvedRecords, registerFilters])
  const period = useMemo(() => attendancePeriod(reportType, currentReport), [reportType, currentReport])
  const reportRecords = useMemo(() => period.from && period.to ? filterAttendanceRecords(reportType === 'daily' ? dailyAttendanceRows(resolvedRecords, faculty, { date: currentReport.date }) : resolvedRecords, { ...currentReport, ...period, status: reportType === 'daily' ? currentReport.status : '' }).filter(row => !currentReport.facultyType || employeeCategoryOf(row.faculty) === currentReport.facultyType) : [], [resolvedRecords, faculty, currentReport, period, reportType])
  const periodKey = reportType === 'monthly' ? period.from.slice(0, 7) : period.from === period.to ? period.from : period.from + '-to-' + period.to
  const periodLabel = reportType === 'monthly' ? period.from.slice(0, 7) : period.from === period.to ? period.from : period.from + ' – ' + period.to
  const reportRows = useMemo(() => reportType === 'daily' ? reportRecords : serverReport.map(row => ({ ...row, facultyId: String(row.facultyId), faculty: faculty.find(member => String(member.id) === String(row.facultyId)) || normalizeFaculty(row), totalDays: row.totalDays ?? row.workingDays ?? 0, present: row.present ?? row.presentDays ?? 0, absent: row.absent ?? row.absentDays ?? 0, late: row.late ?? row.lateDays ?? 0, halfDay: row.halfDay ?? row.halfDays ?? 0, onLeave: row.onLeave ?? row.leaveDays ?? 0, lop: row.lop ?? row.lopDays ?? 0, period: periodLabel })), [reportRecords, reportType, serverReport, faculty, periodLabel])
  const dailySummary = useMemo(() => summarizeAttendance(dailyRows), [dailyRows])
  const reportSummary = useMemo(() => summarizeAttendance(reportRecords), [reportRecords])
  const reportFaculty = useMemo(() => faculty.filter(item => !currentReport.facultyType || employeeCategoryOf(item) === currentReport.facultyType).filter(item => !currentReport.department || getFacultyDept(item) === currentReport.department || item.department === currentReport.department), [faculty, currentReport.facultyType, currentReport.department])
  const attendanceDepartmentOptions = useMemo(() => {
    if (departmentOptions && departmentOptions.length > 0) {
      return departmentOptions.map(d => typeof d === 'string' ? d : d.label || d.value)
    }
    return [...new Set((tab === 'reports' ? faculty.filter(item => !currentReport.facultyType || employeeCategoryOf(item) === currentReport.facultyType) : faculty).map(item => getFacultyDept(item)).filter(Boolean))]
  }, [faculty, tab, currentReport.facultyType, departmentOptions])
  const facultyOptions = useMemo(() => (tab === 'reports' ? reportFaculty : faculty).map(item => ({ value: String(item.id), label: getFacultyCode(item) + ' · ' + item.fullName })), [faculty, reportFaculty, tab, collegeOptions])
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
    if (!values.date || values.date > today()) {
      showError('Attendance cannot be recorded for a future date.')
      return
    }
    attendanceLock.current = true; setAttendanceBusy(true); setAttendanceError('')
    try {
      const targetFacultyId = values.facultyId || values.faculty?.id || values.faculty?.facultyId || values.id
      const numFacultyId = Number(targetFacultyId)
      const facultyIdParam = Number.isSafeInteger(numFacultyId) && numFacultyId > 0 ? numFacultyId : targetFacultyId
      const payload = attendancePayload(values)

      let id = values.attendanceId
      if (!id && values.id && !values.synthetic && String(values.id) !== String(targetFacultyId)) {
        id = values.id
      }
      if (!id) {
        const found = attendanceRecords.find(r =>
          (String(r.facultyId) === String(facultyIdParam) || String(r.faculty?.id) === String(facultyIdParam)) &&
          normalizeAttendanceDate(r.date) === normalizeAttendanceDate(values.date) &&
          (r.attendanceId || (!r.synthetic && r.id && String(r.id) !== String(facultyIdParam)))
        )
        if (found) {
          id = found.attendanceId || found.id
        }
      }

      // Always perform backend bulk upsert so database record is saved immediately
      if (Number.isSafeInteger(Number(facultyIdParam)) && Number(facultyIdParam) > 0) {
        try {
          await facultyAttendanceApi.bulk({
            facultyIds: [Number(facultyIdParam)],
            attendanceDate: values.date,
            status: values.status,
            remarks: values.remarks || null,
          })
        } catch (bulkErr) {
          console.warn('Attendance bulk upsert warning:', bulkErr)
        }
      }

      const isRealBackendId = Number.isSafeInteger(Number(id)) && Number(id) > 0 && !String(id).startsWith('ATT-')
      try {
        if (isRealBackendId) {
          await facultyService.updateAttendance(id, { ...payload, facultyId: facultyIdParam, status: values.status, remarks: values.remarks || null })
        } else {
          const created = await facultyService.createAttendance({
            facultyId: facultyIdParam,
            attendanceDate: values.date,
            status: values.status,
            remarks: values.remarks || null,
            checkIn: payload.checkIn,
            checkOut: payload.checkOut,
          })
          id = created?.attendanceId ?? created?.id
        }
        if (id && Number.isSafeInteger(Number(id)) && Number(id) > 0) {
          if (payload.checkIn) await facultyService.checkIn(id, { checkIn: payload.checkIn }).catch(() => {})
          if (payload.checkOut) await facultyService.checkOut(id, { checkOut: payload.checkOut }).catch(() => {})
        }
      } catch (apiErr) {
        console.warn('Attendance server API warning:', apiErr)
      }

      saveLocalAttendanceRecord({
        facultyId: String(facultyIdParam),
        date: values.date,
        attendanceDate: values.date,
        status: values.status,
        remarks: values.remarks || null,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
      })
      if (values.faculty?.employeeId) {
        saveLocalAttendanceRecord({
          facultyId: String(values.faculty.employeeId),
          date: values.date,
          attendanceDate: values.date,
          status: values.status,
          remarks: values.remarks || null,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
        })
      }
      setEditingRecord(null)
      await loadAttendance([{ facultyId: facultyIdParam, date: values.date, status: values.status, checkIn: payload.checkIn, checkOut: payload.checkOut, remarks: values.remarks }])
      showSuccess('Attendance saved successfully.')
    } catch (error) {
      await loadAttendance()
      showError(error.message || 'Failed to save attendance.')
    } finally {
      attendanceLock.current = false
      setAttendanceBusy(false)
    }
  }
  const applyBulkMark = async (status, selectedRows, remarks) => {
    if (attendanceLock.current || !selectedRows.length) return
    attendanceLock.current = true; setAttendanceBusy(true); setAttendanceError('')
    try {
      const ids = selectedRows.map(row => {
        const raw = row.facultyId || row.faculty?.id || row.faculty?.facultyId
        const num = Number(raw)
        return Number.isSafeInteger(num) && num > 0 ? num : raw
      })
      const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
      const defCheckIn = status === 'Late' ? '09:30' : isWorking ? '09:00' : ''
      const defCheckOut = status === 'Half Day' ? '13:00' : isWorking ? '17:00' : ''
      
      for (const row of selectedRows) {
        const facId = String(row.facultyId || row.faculty?.id || row.faculty?.facultyId)
        saveLocalAttendanceRecord({
          facultyId: facId,
          date: dailyFilters.date,
          attendanceDate: dailyFilters.date,
          status,
          remarks: remarks || null,
          checkIn: defCheckIn,
          checkOut: defCheckOut,
        })
        if (row.faculty?.employeeId) {
          saveLocalAttendanceRecord({
            facultyId: String(row.faculty.employeeId),
            date: dailyFilters.date,
            attendanceDate: dailyFilters.date,
            status,
            remarks: remarks || null,
            checkIn: defCheckIn,
            checkOut: defCheckOut,
          })
        }
      }

      try {
        await facultyService.bulkAttendance({ facultyIds: ids, attendanceDate: dailyFilters.date, status, remarks: remarks || null })
      } catch (bulkErr) {
        console.warn('Bulk API call fallback:', bulkErr)
      }

      for (const row of selectedRows) {
        const facId = row.facultyId || row.faculty?.id || row.faculty?.facultyId
        const existingAttId = row.attendanceId
        if (existingAttId) {
          await facultyService.updateAttendance(existingAttId, {
            facultyId: facId,
            attendanceDate: dailyFilters.date,
            status,
            remarks: remarks || null,
            checkIn: defCheckIn,
            checkOut: defCheckOut,
          }).catch(() => {})
        }
      }
      await loadAttendance(selectedRows.map(row => ({
        facultyId: row.facultyId || row.faculty?.id,
        date: dailyFilters.date,
        status,
        checkIn: defCheckIn,
        checkOut: defCheckOut,
        remarks: remarks || '—',
      })))
      setSelectedFacultyIds([])
      const msg = `${selectedRows.length} attendance record${selectedRows.length > 1 ? 's' : ''} saved.`
      showSuccess(msg)
    } catch (error) {
      await loadAttendance()
      showError(error.message || 'Failed to apply bulk attendance.')
    } finally {
      attendanceLock.current = false
      setAttendanceBusy(false)
    }
  }
  const openAttendance = async (row, edit = false) => {
    try {
      const id = row.attendanceId
      const detail = (id && Number.isSafeInteger(Number(id)) && Number(id) > 0 && !String(id).startsWith('ATT-')) ? (await facultyService.getAttendanceById(Number(id)).then(r => normalizeAttendance([r])[0]).catch(() => row)) : row
      const value = { ...row, ...detail, faculty: row.faculty || faculty.find(f => String(f.id) === String(row.facultyId)) || { fullName: 'Faculty Member', designation: 'Faculty' } }
      if (edit) setEditingRecord(value); else setSelected(value)
    } catch (error) { if (edit) setEditingRecord({ ...row, faculty: row.faculty || faculty.find(f => String(f.id) === String(row.facultyId)) || { fullName: 'Faculty Member', designation: 'Faculty' } }); else setSelected({ ...row, faculty: row.faculty || faculty.find(f => String(f.id) === String(row.facultyId)) || { fullName: 'Faculty Member', designation: 'Faculty' } }) }
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
  const contextualExport = <ExportMenu rows={exportRows} columns={columns} filename={filename} title={exportTitle} scope={exportScope} loading={attendanceBusy} unavailable={rangeInvalid || periodInvalid ? 'Select a valid date range.' : ''} onDownload={async () => {
    const params = tab === 'daily' ? { fromDate: dailyFilters.date, toDate: dailyFilters.date } : tab === 'register' ? { facultyId: registerFilters.facultyId, fromDate: registerFilters.from, toDate: registerFilters.to } : { facultyId: currentReport.facultyId, fromDate: period.from, toDate: period.to }
    downloadServerExport(await facultyService.exportAttendance(params), filename)
  }} />
  const attendanceBadge = value => <StatusBadge value={attendanceStatusLabel(value)} className={value === 'Not Marked' ? 'fm-attendance-pending' : value === 'Present' ? 'fm-attendance-present' : value === 'Absent' ? 'fm-attendance-absent' : value === 'Late' ? 'fm-attendance-late' : value === 'Half Day' ? 'fm-attendance-half-day' : value === 'On Leave' ? 'fm-attendance-leave' : value === 'LOP' ? 'fm-attendance-lop' : ''} />
  const dateControl = (key, label, options = {}) => <label className="fm-attendance-field"><span>{label}</span><input type="date" value={filters[key]} max={today()} onChange={event => updateFilter(key, event.target.value)} {...options} /></label>
  const selectControl = (key, label, options, placeholder) => <div className="fm-attendance-field"><span>{label}</span><SearchableSelect placement="bottom" label={label} value={filters[key]} options={[{ value: '', label: placeholder }, ...options.map(option => option === 'LOP' ? { value: 'LOP', label: 'Loss of Pay' } : option)]} onChange={value => updateFilter(key, value)} placeholder={placeholder} /></div>
  const todaySummary = summarizeAttendance(resolveAttendanceRecords(todayRecords.filter(row => normalizeAttendanceDate(row.date) === today()), faculty))
  const facultySummary = [
    { label: 'Total Faculty', value: faculty.length },
    { label: 'Present Today', value: todaySummary.Present || 0, tone: 'active' },
    { label: 'Absent Today', value: todaySummary.Absent || 0, tone: 'danger' },
    { label: 'Late Today', value: todaySummary.Late || 0, tone: 'danger' },
    { label: 'On Leave Today', value: todaySummary['On Leave'] || 0, tone: 'upcoming' },
  ]
  const searchControl = <div className="fm-attendance-search-row"><label className="fm-attendance-field fm-attendance-search-field"><span className="fm-attendance-input-label">Search</span><span className="fm-attendance-search"><FiSearch aria-hidden="true" /><input value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Search attendance..." /></span></label></div>
  const facultyCategoryControl = <div className="fm-attendance-category-toggle flm-category-toggle" role="group" aria-label="Filter attendance by faculty type"><button type="button" className={`flm-cat-btn ${filters.facultyType === 'Teaching' ? 'active' : ''}`} onClick={() => updateFilter('facultyType', 'Teaching')}>Teaching Faculty ({faculty.filter(item => employeeCategoryOf(item) === 'Teaching').length})</button><button type="button" className={`flm-cat-btn ${filters.facultyType === 'Non-Teaching' ? 'active' : ''}`} onClick={() => updateFilter('facultyType', 'Non-Teaching')}>Non-Teaching Staff ({faculty.filter(item => employeeCategoryOf(item) === 'Non-Teaching').length})</button></div>
  const filterControl = <button type="button" className="fm-attendance-filter-toggle" aria-expanded={showFilters} aria-controls="faculty-attendance-filters-panel" onClick={() => setShowFilters(value => !value)}><FiFilter aria-hidden="true" /><span>Filters</span>{showFilters ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}</button>
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
    const facultyMap = attendanceFacultyMap(faculty || [])
    return faculty.filter(member => (!currentReport.facultyType || employeeCategoryOf(member) === currentReport.facultyType) && (!currentReport.department || getFacultyDept(member) === currentReport.department || member.department === currentReport.department) && (!currentReport.facultyId || String(member.id) === String(currentReport.facultyId)) && (!search || `${getFacultyCode(member)} ${member.employeeId || ''} ${member.fullName}`.toLowerCase().includes(search))).map(member => {
      const memberId = String(member.id)
      const cells = matrixDates.map(date => resolvedRecords.find(record =>
        (String(record.facultyId) === memberId ||
         facultyMap.get(String(record.facultyId)) === memberId ||
         String(record.faculty?.id) === memberId ||
         (member.facultyId && String(record.facultyId) === String(member.facultyId)) ||
         (member.employeeId && (record.employeeId === member.employeeId || record.facultyCode === member.employeeId || String(record.facultyId) === String(member.employeeId))) ||
         (member.facultyCode && (record.facultyCode === member.facultyCode || String(record.facultyId) === String(member.facultyCode))) ||
         (member.employeeProfileId && (String(record.employeeProfileId) === String(member.employeeProfileId) || String(record.facultyId) === String(member.employeeProfileId)))
        ) && normalizeAttendanceDate(record.date) === date
      ) || { faculty: member, facultyId: member.id, date, status: 'Not Marked', checkIn: '—', checkOut: '—', hours: '—' })
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
    <thead><tr>{[...(tab === 'daily' ? [<th scope="col" key="select-header"><input type="checkbox" aria-label="Select all daily attendance rows" checked={allDailySelected} onChange={toggleSelectAllDaily} /></th>] : []), ...(showDate ? ['Date'] : []), 'Faculty Code', 'Faculty', 'Department', 'Status', 'Check In', 'Check Out', 'Working Hours', ...(showRemarks ? ['Remarks'] : []), ...(showAction ? ['Action'] : [])].map((label, index) => typeof label === 'string' ? <th scope="col" key={label}>{label}</th> : label)}</tr></thead>
    <tbody>{(aggregated ? [] : visibleRows).map(row => <tr key={`${row.facultyId}:${row.date}`}>
      {tab === 'daily' && <td><input type="checkbox" aria-label={'Select ' + row.faculty.fullName} checked={selectedFacultyIds.includes(String(row.facultyId))} onChange={event => setSelectedFacultyIds(current => event.target.checked ? [...new Set([...current, String(row.facultyId)])] : current.filter(id => id !== String(row.facultyId)))} /></td>}
      {showDate && <td>{displayDate(row.date)}</td>}
      <td><span className="fm-attendance-employee">{getFacultyCode(row.faculty)}</span></td>
      <td><div className="fm-attendance-identity"><Avatar faculty={row.faculty} /><div><strong>{row.faculty.fullName}</strong><small>{row.faculty.designation || 'Faculty'}</small></div></div></td>
      <td className="fm-department-cell">{getFacultyDept(row.faculty)}</td><td>{attendanceBadge(row.status)}</td><td>{row.checkIn}</td><td>{row.checkOut}</td><td>{row.hours}</td>
      {showRemarks && <td className="fm-remarks-cell"><span className="fm-attendance-remarks" title={row.remarks}>{row.remarks}</span></td>}
      {showAction && <td className="fm-action-cell"><div className="fm-table-actions"><button className="fm-icon-button" type="button" title="View Attendance" aria-label={'View attendance record for ' + row.faculty.fullName + ' on ' + row.date} onClick={() => openAttendance(row)}><FiEye /></button><button className="fm-icon-button" type="button" title="Edit attendance" aria-label={'Edit attendance for ' + row.faculty.fullName + ' on ' + row.date} onClick={() => openAttendance(row, true)}><FiEdit2 /></button></div></td>}
    </tr>)}</tbody>
  </table></div>
  const aggregatedTable = reportType === 'daily' ? <div className="fm-attendance-table fm-attendance-aggregate-table"><table><thead><tr>{['Faculty Code', 'Faculty', 'Department', 'Days With Data', 'Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Total Hours', 'Attendance %'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visibleReportRows.map(row => <tr key={row.facultyId}><td><span className="fm-attendance-employee">{getFacultyCode(row.faculty)}</span></td><td><strong>{row.faculty.fullName}</strong></td><td>{getFacultyDept(row.faculty)}</td><td>{row.total}</td>{['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map(status => <td key={status}>{row[status]}</td>)}<td>{row.hours}</td><td>{row.percentage}</td></tr>)}</tbody></table></div> : <><div className="fm-report-legend" aria-label="Attendance status legend">{Object.entries(statusMeta).map(([status, [code, tone]]) => <span key={status}>{statusCell({ status, date: period.from, checkIn: '—', checkOut: '—', hours: '—' })}<small>{attendanceStatusLabel(status)}</small></span>)}</div><div className="fm-attendance-table fm-attendance-matrix"><table><colgroup><col style={{ width: '130px', minWidth: '130px' }} /><col style={{ width: '220px', minWidth: '220px' }} />{matrixDates.map(date => <col key={date} style={{ width: '42px', minWidth: '42px' }} />)}{['P', 'A', 'L', 'HD', 'OL', 'LOP'].map(label => <col key={label} style={{ width: '40px', minWidth: '40px' }} />)}<col style={{ width: '55px', minWidth: '55px' }} /></colgroup><thead><tr><th>Faculty Code</th><th>Faculty</th>{matrixDates.map(date => <th key={date}><span>{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}</span><b>{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</b></th>)}{['P', 'A', 'L', 'HD', 'OL', 'LOP', '%'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{visibleMatrixRows.map(({ member, cells, totals }) => <tr key={member.id}><td>{getFacultyCode(member)}</td><td className="fm-matrix-faculty"><strong>{member.fullName}</strong><small>{getFacultyDept(member)}</small></td>{cells.map(cell => <td key={cell.date}>{statusCell(cell)}</td>)}{[['Present', 'present'], ['Absent', 'absent'], ['Late', 'late'], ['Half Day', 'half-day'], ['On Leave', 'leave'], ['LOP', 'lop']].map(([status, tone]) => <td className={`fm-report-total fm-report-total--${tone}`} key={status}>{totals[status]}</td>)}<td className="fm-report-total fm-report-total--percentage">{totals.percentage}</td></tr>)}</tbody></table></div></>
  const noSource = tab !== 'daily' && !attendanceRecords.length
  const empty = <EmptyState title={noSource ? 'No attendance records are available yet.' : 'No attendance records match the selected filters.'} description={noSource ? 'Daily Attendance shows missing records as Not Marked; these are not saved historical records.' : undefined} action={noSource ? 'Go to Daily Attendance' : 'Clear Filters'} onAction={noSource ? () => setTab('daily') : clearFilters} />
  return (
    <div className="fm-attendance-screen">
      <header className="faculty-page-header fm-attendance-header">
        <div>
          <h1>Faculty Attendance</h1>
          <p>Manage daily faculty attendance, working hours, and administrative attendance reports.</p>
        </div>
        <div className="fm-header-right">
          <CompactSummary label="Faculty attendance summary" items={facultySummary} />
        </div>
      </header>

      <section className="fm-attendance-workspace">
        <div className="fm-attendance-panel">
          <header className="fm-attendance-directory-header">
            <div className="fm-attendance-header-actions">{searchControl}{facultyCategoryControl}{filterControl}{contextualExport}</div>
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
              {selectControl('department', 'Department', attendanceDepartmentOptions, 'All Departments')}
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
            {selectControl('department', 'Department', attendanceDepartmentOptions, 'All Departments')}
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
                <p>{getFacultyCode(selected.faculty)}</p>
                <p>{selected.faculty.designation || 'Faculty'}</p>
                <p>{getFacultyDept(selected.faculty)}</p>
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

      {attendanceError && <p className="fm-error" role="alert" style={{ position: 'relative', zIndex: 1500 }}>{attendanceError}</p>}{tab !== 'reports' && editingRecord && <fieldset disabled={attendanceBusy} style={{ border: 0, margin: 0, padding: 0 }}><AttendanceEditor record={editingRecord} collegeOptions={collegeOptions} departmentOptions={departmentOptions} allFaculty={faculty} onClose={() => setEditingRecord(null)} onSave={saveAttendance} onReset={record => saveAttendance({ ...record, status: 'Not Marked' })} /></fieldset>}
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
function ProfileSections({ data, collegeOptions = [], departmentOptions = [], faculty = [] }) {
  const getFieldValue = (key, value) => {
    if (key === 'employeeId') {
      return formatFacultyDisplayCode(data, collegeOptions, faculty)
    }
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
    if (key === 'qualification' && data.qualification === 'Other') {
      return data.qualificationOther ? `Other (${data.qualificationOther})` : 'Other'
    }
    if (experienceKeys.includes(key)) {
      return years(value)
    }
    return value || '—'
  }

  const renderSectionCard = (section) => {
    const fields = section.fields.filter(([key, , , required]) => !(data.employeeCategory === 'Non-Teaching' && key === 'teachingExperience') && (required || key === 'employeeId' || (data[key] !== '' && data[key] != null)))
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
  }

  const leftColumnSections = [sections[0], sections[2]].filter(Boolean)
  const rightColumnSections = [sections[1], sections[3]].filter(Boolean)

  return (
    <>
      <div className="fm-profile-sections">
        <div className="fm-profile-col">
          {leftColumnSections.map(renderSectionCard)}
        </div>
        <div className="fm-profile-col">
          {rightColumnSections.map(renderSectionCard)}
        </div>
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
function Field({ field, data, errors, update, native = false, collegeOptions = [], departmentOptions = [], touched = {}, liveErrors = {}, markTouched }) {
  const [key, label, type, required] = field
  const id = 'fm-' + key
  const props = { id, value: data[key] ?? '', onChange: event => update(key, event.target.value), 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? id + '-error' : undefined, required: Boolean(required) }
  if (['mobile', 'alternateMobile', 'emergencyMobile'].includes(key)) {
    props.maxLength = 10
    props.pattern = '[6-9][0-9]{9}'
    props.title = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'
    props.onChange = event => {
      const value = event.target.value
      if (/^\d{0,10}$/.test(value)) update(key, value)
    }
  }
  if (experienceKeys.includes(key)) {
    props.onChange = event => {
      const value = event.target.value
      // Keep the controlled value non-negative even when a negative value is
      // pasted. A single decimal place matches the field's 0.5 step.
      if (/^\d*(?:\.\d{0,1})?$/.test(value)) update(key, value)
    }
    props.onKeyDown = event => {
      if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault()
    }
  }
  return (
    <>
      <div className={'fm-field ' + (type === 'textarea' ? 'fm-wide' : '') + (key === 'gender' ? ' fm-gender' : '')}><label htmlFor={Array.isArray(type) && !native ? undefined : id}>{label}{required && <span className="fm-required" aria-hidden="true"> *</span>}</label>
        {type === 'college' || type === 'department' ? <SearchableSelect placement="bottom" label={label} value={data[key] || ''} options={type === 'college' ? collegeOptions : departmentOptions} onChange={value => update(key, value)} required={required} error={Boolean(errors[key])} placeholder={'Select ' + label.toLowerCase()} /> : Array.isArray(type) ? (() => {
          const effectiveOptions = key === 'designation' ? (data.employeeCategory === 'Non-Teaching' ? nonTeachingDesignations : teachingDesignations) : type
          return native ? <select {...props}><option value="">Select {label.toLowerCase()}</option>{effectiveOptions.map(value => <option key={value}>{value}</option>)}</select> : <SearchableSelect placement="bottom" label={label} value={data[key] || ''} options={effectiveOptions} onChange={value => update(key, value)} required={required} error={Boolean(errors[key])} placeholder={'Select ' + label.toLowerCase()} hideSearch={key === 'gender'} />
        })() : type === 'textarea' ? <textarea {...props} rows={2} /> : <input {...props} type={type === 'readonly' ? 'text' : type} readOnly={type === 'readonly'} max={type === 'date' ? today() : key === 'passingYear' ? new Date().getFullYear() : key === 'weeklyHours' ? 60 : type === 'number' ? 80 : undefined} min={key === 'passingYear' ? 1950 : type === 'number' ? 0 : undefined} step={key === 'passingYear' ? 1 : type === 'number' ? 0.5 : undefined} inputMode={type === 'tel' || key === 'pincode' ? 'numeric' : undefined} />}
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
      {key === 'qualification' && data.qualification === 'Other' && (
        <div className="fm-field">
          <label htmlFor="fm-qualificationOther">Specify Highest Qualification</label>
          <input
            id="fm-qualificationOther"
            type="text"
            value={data.qualificationOther || ''}
            onChange={event => update('qualificationOther', event.target.value)}
            placeholder="Enter highest qualification"
            aria-invalid={Boolean(errors.qualificationOther)}
            aria-describedby={errors.qualificationOther ? 'fm-qualificationOther-error' : undefined}
          />
          {errors.qualificationOther && <small id="fm-qualificationOther-error" className="fm-error">{errors.qualificationOther}</small>}
        </div>
      )}
    </>
  )
}

const getCollegePrefix = (collegeId, collegeOptions = []) => {
  const selectedCollege = (collegeOptions || []).find(c => String(c.value) === String(collegeId) || String(c.id) === String(collegeId) || String(c.label) === String(collegeId))
  if (!selectedCollege) return 'FAC'

  let raw = String(selectedCollege.code || selectedCollege.collegeCode || selectedCollege.CollegeCode || '').trim()
  let collegeCode = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const alphaMatch = collegeCode.match(/^([A-Z]{2,})\d+$/)
  if (alphaMatch) {
    collegeCode = alphaMatch[1]
  }

  if (!collegeCode && selectedCollege.label) {
    const cleanLabel = selectedCollege.label.replace(/college|institute|engineering|technology|university/gi, '').trim()
    const targetLabel = cleanLabel || selectedCollege.label
    const words = targetLabel.trim().split(/[\s-]+/).filter(Boolean)
    collegeCode = (words.length > 1 ? words.map(w => w[0]).join('') : words[0]?.slice(0, 5) || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  if (!collegeCode) return 'FAC'
  if (collegeCode.endsWith('FAC')) return `${collegeCode}-`
  return `${collegeCode}-FAC`
}

export const formatFacultyDisplayCode = (item, collegeOptions = [], allFaculty = []) => {
  if (!item) return '—'

  const collegeId = item.collegeId ?? item.college_id ?? (collegeOptions.length === 1 ? collegeOptions[0].value : '')
  const prefix = collegeId ? getCollegePrefix(collegeId, collegeOptions) : 'FAC'

  if (collegeId && Array.isArray(allFaculty) && allFaculty.length > 0) {
    const sameCollegeFaculty = allFaculty
      .filter(f => {
        const cId = f.collegeId ?? f.college_id ?? (collegeOptions.length === 1 ? collegeOptions[0].value : '')
        return String(cId || '') === String(collegeId || '')
      })
      .sort((a, b) => {
        const idA = Number(a.id || a.facultyId || 0)
        const idB = Number(b.id || b.facultyId || 0)
        if (Number.isFinite(idA) && Number.isFinite(idB) && idA > 0 && idB > 0) return idA - idB
        return String(a.joiningDate || a.id || '').localeCompare(String(b.joiningDate || b.id || ''))
      })

    const index = sameCollegeFaculty.findIndex(f => String(f.id || f.facultyId) === String(item.id || item.facultyId))
    if (index >= 0) {
      return `${prefix}${String(index + 1).padStart(3, '0')}`
    }
  }

  const explicitCode = String(item.facultyCode || '').trim()
  if (explicitCode && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(explicitCode) && !/^[0-9a-f]{32}$/i.test(explicitCode)) {
    const numMatch = explicitCode.match(/(\d+)$/)
    if (numMatch) {
      return `${prefix}${numMatch[1].padStart(3, '0')}`
    }
    return explicitCode.toUpperCase()
  }

  const numMatch = String(item.id || item.employeeId || '').match(/(\d+)$/)
  if (numMatch) {
    return `${prefix}${numMatch[1].padStart(3, '0')}`
  }
  return `${prefix}001`
}

const getNextFacultyCode = (list = [], collegeId, collegeOptions = []) => {
  const prefix = getCollegePrefix(collegeId, collegeOptions)
  const collegeList = collegeId
    ? (list || []).filter(item => {
        const cId = item?.collegeId ?? item?.college_id ?? (collegeOptions.length === 1 ? collegeOptions[0].value : '')
        return String(cId || '') === String(collegeId || '')
      })
    : (list || [])

  let max = 0
  const prefixEscaped = prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const regex = new RegExp(`(?:${prefixEscaped}|FAC)-?(\\d+)`, 'i')

  for (const item of collegeList) {
    const raw = String(item?.facultyCode || item?.faculty_code || '').trim()
    if (raw) {
      const match = raw.match(regex) || raw.match(/FAC-?(\d+)/i)
      if (match) {
        const val = parseInt(match[1], 10)
        if (Number.isFinite(val) && val > max) max = val
      }
    }
  }

  const nextSeq = Math.max(max, collegeList.length) + 1
  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}

function FacultyForm({ initial, faculty, onSave, onCancel, collegeOptions, departmentOptions, saving }) {
  const [data, setData] = useState(() => {
    const base = normalize(initial)
    if (!base.employeeId && base.collegeId) {
      base.employeeId = getNextFacultyCode(faculty, base.collegeId, collegeOptions)
    }
    return base
  })
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const markTouched = key => setTouched(prev => ({ ...prev, [key]: true }))
  const liveErrors = useMemo(() => validateFaculty(clean(data), faculty), [data, faculty])
  const [photoBusy, setPhotoBusy] = useState(false)
  const readerRef = useRef(null)
  const formRef = useRef(null)
  useEffect(() => () => readerRef.current?.abort(), [])

  useEffect(() => {
    if (!initial?.id) {
      const activeCollegeId = data.collegeId || ''
      if (activeCollegeId) {
        const newCode = getNextFacultyCode(faculty, activeCollegeId, collegeOptions)
        const expectedPrefix = getCollegePrefix(activeCollegeId, collegeOptions)
        if (newCode && (!data.employeeId || data.employeeId === 'FAC001' || !data.employeeId.startsWith(expectedPrefix))) {
          setData(old => ({
            ...old,
            employeeId: newCode,
          }))
        }
      }
    }
  }, [collegeOptions, data.collegeId, faculty, initial?.id])

  const update = (key, value) => {
    setData(old => {
      const colId = typeof value === 'object' && value !== null ? (value.value ?? value.id ?? '') : String(value ?? '')
      const nextData = { ...old, [key]: value }
      if (key === 'collegeId' && !initial?.id) {
        nextData.employeeId = getNextFacultyCode(faculty, colId, collegeOptions)
      }
      return nextData
    })
    setErrors(old => ({ ...old, [key]: undefined }))
  }
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
    <form className={'fm-panel fm-form' + (isPreviewStep ? ' fm-form--preview' : '')} ref={formRef} onSubmit={next} noValidate>
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
          {section?.title || (isDocumentsStep ? 'Supporting Documents' : data.employeeCategory === 'Non-Teaching' ? 'Staff Profile Preview' : 'Faculty Profile Preview')}
        </h2>
        <p>
          {section?.description?.replace('Faculty designation', 'Employee designation') || (isDocumentsStep ? 'Mark submission status for essential verification documents (optional).' : 'Review all details and documents below before saving this record.')}
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
          {section.fields.filter(([key]) => !(data.employeeCategory === 'Non-Teaching' && key === 'teachingExperience')).map(field => (
            <Field key={field[0]} field={field[0] === 'employeeCategory' && ['Teaching', 'Non-Teaching'].includes(initial.employeeCategory) ? [field[0], field[1], 'readonly', field[3]] : field} data={data} errors={errors} update={update} collegeOptions={collegeOptions} departmentOptions={departmentOptions} touched={touched} liveErrors={liveErrors} markTouched={markTouched} />
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
              <p>{formatFacultyDisplayCode(data, collegeOptions, faculty)} · {data.designation}</p>
            </div>
          </div>
          <ProfileSections data={data} collegeOptions={collegeOptions} departmentOptions={departmentOptions} faculty={faculty} />
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
            {isPreviewStep ? <><FiCheckCircle /> {data.employeeCategory === 'Non-Teaching' ? 'Save Staff' : 'Save Faculty'}</> : 'Next'}
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
    academicYearId: '1',
    academicYear: '2026-2027',
    courseId: '1',
    course: 'Bachelor of Technology',
    courseCode: 'BTECH',
    branchId: '1',
    branch: faculty.department || 'Computer Science and Engineering',
    branchCode: 'CSE',
    semesterId: '1',
    semester: 'Semester 1',
    sectionId: '1',
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
      subjectService.getSubjects(),
      facultyMasterApi.getSubjects(),
    ]).then(([yearsRes, coursesRes, branchesRes, semRes, secRes, subMgmtRes, subRes]) => {
      if (!active) return
      const allYears = yearsRes.status === 'fulfilled' && Array.isArray(yearsRes.value) ? yearsRes.value : []
      const markedCurrentYear = allYears.find(year => year?.isCurrent === true || year?.current === true || Number(year?.isCurrent) === 1 || Number(year?.current) === 1)
      const currentYear = markedCurrentYear || getDefaultAcademicYear(allYears)
      const years = currentYear ? [currentYear] : (allYears.length ? [allYears[0]] : [{ id: '1', academicYearId: '1', academicYearName: '2026-2027' }])
      const courses = coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value) && coursesRes.value.length ? coursesRes.value : [{ id: '1', courseId: '1', courseName: 'Bachelor of Technology', courseCode: 'BTECH' }]
      const branches = branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value) && branchesRes.value.length ? branchesRes.value : [{ id: '1', branchId: '1', branchName: faculty.department || 'Computer Science and Engineering', branchCode: 'CSE' }]
      const semesters = semRes.status === 'fulfilled' && Array.isArray(semRes.value) && semRes.value.length ? semRes.value : Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), semesterId: String(i + 1), semesterName: `Semester ${i + 1}` }))
      const sections = secRes.status === 'fulfilled' && Array.isArray(secRes.value) && secRes.value.length ? secRes.value : ['Section A', 'Section B', 'Section C', 'Section D'].map((name, i) => ({ id: String(i + 1), sectionId: String(i + 1), sectionName: name }))
      
      const subMgmtList = subMgmtRes.status === 'fulfilled' && Array.isArray(subMgmtRes.value) ? subMgmtRes.value : []
      const subList = subRes.status === 'fulfilled' && Array.isArray(subRes.value) ? subRes.value : []
      
      const subjectsMap = new Map()
      for (const s of [...subMgmtList, ...subList]) {
        if (!s) continue
        const code = String(s.subjectCode || s.code || s.subject_code || '').trim()
        const name = String(s.subjectName || s.name || s.subject || s.title || '').trim()
        const id = String(s.id || s.subjectId || s.subjectMasterId || code || name)
        const mapKey = (code || name).toLowerCase()
        if (mapKey && !subjectsMap.has(mapKey)) {
          subjectsMap.set(mapKey, {
            id,
            subjectId: id,
            subjectCode: code,
            code,
            subjectName: name,
            name,
            courseId: s.courseId,
            branchId: s.branchId,
            semesterId: s.semesterId,
            academicYearId: s.academicYearId,
          })
        }
      }
      const subjects = [...subjectsMap.values()]

      setMasters({ years, courses, branches, semesters, sections, subjects })

      setData(prev => {
        const matchedYear = years[0]
        const matchedCourse = courses[0]
        const matchedBranch = branches.find(b =>
          String(b.branchName || b.name || '').toLowerCase() === String(faculty.department || '').toLowerCase() ||
          String(b.departmentId) === String(faculty.departmentId)
        ) || branches[0]

        const courseName = matchedCourse?.courseName || matchedCourse?.name || 'Bachelor of Technology'
        const courseCode = matchedCourse?.courseCode || matchedCourse?.code || 'BTECH'
        const branchName = matchedBranch?.branchName || matchedBranch?.name || faculty.department || 'Computer Science and Engineering'
        const branchCode = matchedBranch?.branchCode || matchedBranch?.code || (faculty.department ? faculty.department.split(/\s+/).map(w => w[0]).join('').toUpperCase() : 'CSE')

        return {
          ...prev,
          academicYearId: String(matchedYear?.academicYearId ?? matchedYear?.id ?? '1'),
          academicYear: matchedYear?.academicYearName ?? matchedYear?.name ?? '2026-2027',
          courseId: String(matchedCourse?.courseId ?? matchedCourse?.id ?? '1'),
          course: courseName,
          courseCode: courseCode,
          branchId: String(matchedBranch?.branchId ?? matchedBranch?.id ?? '1'),
          branch: branchName,
          branchCode: branchCode,
          semesterId: prev.semesterId || String(semesters[0]?.semesterId ?? semesters[0]?.id ?? '1'),
          semester: prev.semester || (semesters[0]?.semesterName ?? semesters[0]?.name ?? 'Semester 1'),
          sectionId: prev.sectionId || String(sections[0]?.sectionId ?? sections[0]?.id ?? '1'),
          section: prev.section || (sections[0]?.sectionName ?? sections[0]?.name ?? 'Section A'),
        }
      })
    })
    return () => { active = false }
  }, [faculty])

  const semesterOptions = useMemo(() => {
    const branchId = String(data.branchId || '')
    const list = masters.semesters || []
    let options = list.filter(s => {
      const mappedBranchId = s.branchId ?? s.branch?.branchId ?? s.branch?.id
      return branchId && mappedBranchId != null && String(mappedBranchId) === branchId
    })
    if (!options.length) options = list
    if (!options.length) {
      options = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), semesterId: String(i + 1), semesterName: `Semester ${i + 1}` }))
    }
    const formatted = options.map(s => ({
      value: String(s.semesterId ?? s.id),
      label: s.semesterName ?? s.name ?? `Semester ${s.semesterNumber ?? s.number ?? s.id}`,
    }))
    return [...new Map(formatted.map(opt => [opt.label.trim().toLowerCase(), opt])).values()]
  }, [masters.semesters, data.branchId])

  const sectionOptions = useMemo(() => {
    const branchId = String(data.branchId || '')
    const semesterId = String(data.semesterId || '')
    const list = masters.sections || []
    let options = list.filter(s => {
      const mappedBranchId = s.branchId ?? s.branch?.branchId ?? s.branch?.id
      const mappedSemesterId = s.semesterId ?? s.semester?.semesterId ?? s.semester?.id
      return (!branchId || mappedBranchId == null || String(mappedBranchId) === branchId) &&
             (!semesterId || mappedSemesterId == null || String(mappedSemesterId) === semesterId)
    })
    if (!options.length && list.length) options = list
    if (!options.length) {
      options = ['Section A', 'Section B', 'Section C', 'Section D'].map((name, i) => ({ id: String(i + 1), sectionId: String(i + 1), sectionName: name }))
    }
    const formatted = options.map(s => ({
      value: String(s.sectionId ?? s.id),
      label: s.sectionName ?? s.name ?? s.sectionCode ?? `Section ${s.id}`,
    }))
    return [...new Map(formatted.map(opt => [opt.label.trim().toLowerCase(), opt])).values()]
  }, [masters.sections, data.branchId, data.semesterId])

  const subjectOptions = useMemo(() => {
    const list = masters.subjects || []
    if (!list.length) return []
    const filtered = list.filter(s => {
      const matchCourse = !data.courseId || !s.courseId || String(s.courseId) === String(data.courseId)
      const matchBranch = !data.branchId || !s.branchId || String(s.branchId) === String(data.branchId) || String(s.branchId) === 'all'
      const matchSemester = !data.semesterId || !s.semesterId || String(s.semesterId) === String(data.semesterId)
      return matchCourse && matchBranch && matchSemester
    })
    const sourceList = filtered.length > 0 ? filtered : list
    return sourceList.map(subject => {
      const value = subject.subjectId ?? subject.id ?? subject.subjectMasterId ?? subject.courseSubjectId
      const code = subject.subjectCode ?? subject.code ?? subject.subject_code ?? subject.courseCode ?? ''
      const name = subject.subjectName ?? subject.name ?? subject.subject ?? subject.title ?? subject.subjectTitle ?? subject.subject_name ?? subject.courseName ?? ''
      const label = code ? `${name} (${code})` : name
      return {
        value: value == null ? '' : String(value),
        code: String(code || ''),
        name: String(name || ''),
        label: label || 'Unnamed subject',
      }
    }).filter(subject => subject.value && subject.name)
  }, [masters.subjects, data.courseId, data.branchId, data.semesterId])

  const assignmentTypeOptions = ['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'].map(t => ({ value: t, label: t }))

  const add = event => {
    event.preventDefault()
    if (inactive) return
    const issues = {}
    if (!data.semesterId && !data.semester) issues.semester = 'Select a semester.'
    if (!data.sectionId && !data.section) issues.section = 'Select a section.'
    if ((subjectRequired || data.subjectName) && !data.subjectCode?.trim()) issues.subjectCode = 'Subject code is required.'
    if ((subjectRequired || data.subjectCode) && !data.subjectName?.trim()) issues.subjectName = 'Subject name is required.'

    if ((faculty.assignments || []).some(existing =>
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
              {/* Course & Course Code (Default Readonly) */}
              <div className="fm-field">
                <label htmlFor="fm-assign-course">Course</label>
                <input
                  id="fm-assign-course"
                  type="text"
                  value={data.course}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-courseCode">Course Code</label>
                <input
                  id="fm-assign-courseCode"
                  type="text"
                  value={data.courseCode}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              {/* Branch & Branch Code (Default Readonly) */}
              <div className="fm-field">
                <label htmlFor="fm-assign-branch">Branch</label>
                <input
                  id="fm-assign-branch"
                  type="text"
                  value={data.branch}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-branchCode">Branch Code</label>
                <input
                  id="fm-assign-branchCode"
                  type="text"
                  value={data.branchCode}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              {/* Semester Dropdown */}
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

              {/* Section Dropdown */}
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

              {/* Assignment Type Dropdown */}
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
                  <option value="">Select Assignment Type</option>
                  {assignmentTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {/* 1. Subject Name Dropdown from Subject Management */}
              <div className="fm-field">
                <label htmlFor="fm-assign-subjectName">Subject Name {subjectRequired && <span className="fm-required">*</span>}</label>
                <select
                  id="fm-assign-subjectName"
                  value={data.subjectId || data.subjectName}
                  onChange={e => {
                    const val = e.target.value
                    const found = subjectOptions.find(s => String(s.value) === String(val) || String(s.name) === String(val))
                    if (found) {
                      setData({
                        ...data,
                        subjectId: found.value,
                        subjectName: found.name,
                        subjectCode: found.code || '',
                      })
                    } else {
                      setData({
                        ...data,
                        subjectId: '',
                        subjectName: val,
                      })
                    }
                    setErrors(old => ({ ...old, subjectName: undefined, subjectCode: undefined, duplicate: undefined }))
                  }}
                  required={subjectRequired}
                  aria-invalid={Boolean(errors.subjectName)}
                >
                  <option value="">Select Subject</option>
                  {subjectOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.subjectName && <small className="fm-error">{errors.subjectName}</small>}
              </div>

              {/* 2. Subject Code (Auto-populated upon selecting subject) */}
              <div className="fm-field">
                <label htmlFor="fm-assign-subjectCode">Subject Code {subjectRequired && <span className="fm-required">*</span>}</label>
                <input
                  id="fm-assign-subjectCode"
                  type="text"
                  placeholder="e.g. CS301"
                  value={data.subjectCode}
                  onChange={e => {
                    setData({ ...data, subjectCode: e.target.value })
                    setErrors(old => ({ ...old, subjectCode: undefined, duplicate: undefined }))
                  }}
                  required={subjectRequired}
                  aria-invalid={Boolean(errors.subjectCode)}
                />
                {errors.subjectCode && <small className="fm-error">{errors.subjectCode}</small>}
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
    Promise.all([
      facultyService.list().catch(() => []),
      facultyService.getSubjectAllocations().catch(() => [])
    ])
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
      .catch(() => {})
      .finally(() => { if (active) setLoadingFaculty(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([
      facultyMasterApi.getColleges().catch(() => []),
      departmentApi.getAll().catch(() => [])
    ]).then(([colleges, departments]) => {
      if (!active) return
      setCollegeOptions((colleges || []).map(row => ({
        value: String(row.collegeId ?? row.CollegeId ?? row.id ?? row.Id ?? ''),
        label: row.collegeName ?? row.CollegeName ?? row.name ?? row.Name ?? '',
        code: row.collegeCode ?? row.CollegeCode ?? row.code ?? row.Code ?? '',
      })))
      setDepartmentOptions((departments || []).map(row => ({
        value: String(row.departmentId ?? row.DepartmentId ?? row.id ?? row.Id ?? ''),
        label: row.departmentName ?? row.DepartmentName ?? row.name ?? row.Name ?? '',
      })))
    }).catch(() => {})
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
  const queryParams = new URLSearchParams(location.search)
  const categoryParam = queryParams.get('category')
  const [selectedCategory, setSelectedCategory] = useState(
    categoryParam === 'Teaching' || categoryParam === 'Non-Teaching' ? categoryParam : null
  )

  useEffect(() => {
    const cat = new URLSearchParams(location.search).get('category')
    if (cat === 'Non-Teaching' || cat === 'Teaching') {
      setSelectedCategory(cat)
    } else if (!cat && path === '/faculty') {
      setSelectedCategory(null)
    }
  }, [location.search, path])

  const teachingFaculty = useMemo(() => faculty.filter(f => employeeCategoryOf(f) === 'Teaching'), [faculty])
  const nonTeachingFaculty = useMemo(() => faculty.filter(f => employeeCategoryOf(f) === 'Non-Teaching'), [faculty])
  const activeCategory = selectedCategory || 'Teaching'
  const categoryFaculty = activeCategory === 'Non-Teaching' ? nonTeachingFaculty : teachingFaculty
  const currentDesignations = activeCategory === 'Non-Teaching' ? nonTeachingDesignations : teachingDesignations

  const listed = faculty.find(item => item.id === targetId)
  // The directory route must never render an old detail record. This can occur
  // while navigation is settling after a profile or edit screen is closed.
  const selected = targetId ? (detail?.id === targetId ? { ...listed, ...detail, assignments: listed?.assignments || detail?.assignments || [] } : listed) : null
  const assignedFaculty = faculty.find(item => item.id === assignmentId)
  const departments = [...new Set(departmentOptions.map(item => item.label).filter(Boolean))]
  const filtered = useMemo(() => categoryFaculty.filter(item => {
    const displayCode = formatFacultyDisplayCode(item, collegeOptions, faculty)
    return [item.fullName, item.employeeId, displayCode, item.email, item.mobile, item.department, item.designation].join(' ').toLowerCase().includes(query.trim().toLowerCase()) && Object.entries(filters).every(([key, value]) => !value || item[key] === value)
  }), [categoryFaculty, query, filters, collegeOptions, faculty])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const active = Boolean(query || Object.values(filters).some(Boolean))
  const clear = () => { setQuery(''); setFilters({ department: '', designation: '', employmentType: '', employmentStatus: '' }); setPage(1) }
  const back = (cat) => {
    setDetail(null)
    setAssignmentId(null)
    setLoadError('')
    const explicitCat = (typeof cat === 'string' && (cat === 'Teaching' || cat === 'Non-Teaching')) ? cat : null
    const returnCategory = explicitCat || selected?.employeeCategory || selectedCategory || categoryParam || activeCategory || 'Teaching'
    setSelectedCategory(returnCategory)
    navigate(`/faculty?category=${returnCategory}`, { replace: true })
  }
  const backToOverview = () => {
    setSelectedCategory(null)
    setPage(1)
    clear()
    navigate('/faculty')
  }
  const addFaculty = (category = activeCategory) => navigate(`/faculty/new?category=${category}`)
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
      const targetCat = data.employeeCategory || employeeCategoryOf(data) || employeeCategoryOf(refreshed) || 'Teaching'
      const normalizedRecord = normalize({
        ...mergeFacultyData(refreshed, data),
        id: savedId,
        facultyId: savedId,
        facultyCode: data.employeeId || refreshed.facultyCode,
        employeeCategory: targetCat
      })
      setFaculty(rows => data.id ? rows.map(row => row.id === data.id ? { ...row, ...normalizedRecord, assignments: row.assignments } : row) : [normalizedRecord, ...rows.filter(r => r.id !== savedId && r.employeeId !== normalizedRecord.employeeId)])
      notify(data.id ? (targetCat === 'Non-Teaching' ? 'Staff updated successfully' : 'Faculty updated successfully') : (targetCat === 'Non-Teaching' ? 'Staff created successfully' : 'Faculty created successfully'))
      clear()
      back(targetCat)
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
  const directoryActions = (
    <>
      <ExportMenu
        rows={filtered}
        columns={exportColumns}
        screen="faculty-local-directory"
        filename={activeCategory === 'Non-Teaching' ? 'non-teaching-roster' : 'teaching-faculty-roster'}
        title={activeCategory === 'Non-Teaching' ? 'Non-Teaching Staff Directory' : 'Teaching Faculty Directory'}
      />
      <button className="fm-button" type="button" onClick={() => addFaculty(activeCategory)}>
        <FiPlus /> {activeCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty'}
      </button>
    </>
  )
  let content
  if (path === '/faculty/advisors' || path === '/faculty/subjects') return <Navigate to="/faculty" replace />
  if (path === '/faculty/attendance') content = <FacultyAttendanceScreen faculty={faculty} collegeOptions={collegeOptions} departmentOptions={departmentOptions} onNotify={notify} />
  else if (((editId || detailId) && !selected) || (!['/faculty', '/faculty/new'].includes(path) && !editId && !detailId)) {
    content = <section className="fm-panel"><EmptyState title="Faculty record not found" action="Back to List" onAction={() => back()} /></section>
  } else if (path === '/faculty/new' || editId) {
    const defaultNewCategory = categoryParam || selected?.employeeCategory || selectedCategory || activeCategory || 'Teaching'
    content = (
      <>
        <header className="faculty-page-header">
          <div>
            <h1>{editId ? (defaultNewCategory === 'Non-Teaching' ? 'Edit Non-Teaching Staff' : 'Edit Teaching Faculty') : (defaultNewCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty')}</h1>
            <p>{editId ? 'Faculty employment and profile record' : (defaultNewCategory === 'Non-Teaching' ? 'Non-teaching staff registration and employment record' : 'Teaching faculty registration and employment record')}</p>
          </div>
          <button type="button" className="fm-button secondary" onClick={() => back()}><FiArrowLeft /> Back</button>
        </header>
        <FacultyForm
          key={location.key + ':' + Boolean(detail) + ':' + (collegeOptions[0]?.value || '') + ':' + defaultNewCategory}
          initial={selected || { employmentStatus: 'Working', employeeCategory: defaultNewCategory }}
          faculty={faculty}
          collegeOptions={collegeOptions}
          departmentOptions={departmentOptions}
          saving={saving}
          onSave={save}
          onCancel={() => back()}
        />
      </>
    )
  } else if (selected) {
    const load = workload(selected)
    const departmentName = departmentOptions.find(d => String(d.value) === String(selected.departmentId || selected.department))?.label || selected.department || '—'
    content = (
      <div className="fm-profile-view">
        <div className="fm-breadcrumb">
          <Link to="/dashboard">Home</Link> / <Link to={'/faculty?category=' + (selected.employeeCategory || 'Teaching')}>{selected.employeeCategory === 'Non-Teaching' ? 'Non-Teaching Staff' : 'Teaching Faculty'}</Link> / <strong aria-current="page">Profile</strong>
        </div>

        <div className="fm-profile-hero-card">
          <header className="fm-panel fm-profile-header">
            <div className="fm-identity">
              <Avatar faculty={selected} large />
              <div>
                <p className="fm-eyebrow">{selected.employeeCategory === 'Non-Teaching' ? 'STAFF PROFILE' : 'FACULTY PROFILE'} · {formatFacultyDisplayCode(selected, collegeOptions, faculty)}</p>
                <h1>{selected.fullName}</h1>
                <p>{selected.designation} · {departmentName}</p>
                <StatusBadge value={selected.employmentStatus} />
              </div>
            </div>
            <div className="fm-actions">
              <button type="button" className="fm-button secondary" onClick={() => navigate('/faculty/' + selected.id + '/edit?category=' + (selected.employeeCategory || activeCategory))}>
                <FiEdit2 /> {selected.employeeCategory === 'Non-Teaching' ? 'Edit Staff' : 'Edit Faculty'}
              </button>
              <button type="button" className="fm-button secondary" onClick={() => back()}>
                <FiArrowLeft /> Back to List
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
            {selected.employeeCategory !== 'Non-Teaching' && <div className="fm-summary-col">
              <small>Workload</small>
              <strong className="text-primary">{load.subjects} Subject{load.subjects === 1 ? '' : 's'} · {load.status}</strong>
            </div>}
          </div>
        </div>

        <div className="fm-profile-main-layout" style={selected.employeeCategory === 'Non-Teaching' ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
          <div className="fm-profile-content-col">
            <ProfileSections
              data={selected}
              collegeOptions={collegeOptions}
              departmentOptions={departmentOptions}
              faculty={faculty}
            />
          </div>

          {selected.employeeCategory !== 'Non-Teaching' && <section className="fm-panel fm-responsibilities-sidebar">
            <header className="fm-sidebar-header">
              <h2><FiBriefcase /> Current Academic Responsibilities</h2>
              <span className={'erp-status-badge ' + (load.status === 'Unassigned' ? 'pending' : 'working active')}>
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
          </section>}
        </div>
      </div>
    )
  } else if (!selectedCategory) {
    // Overview Hub Cards view (when user visits /faculty without picking a category)
    content = (
      <>
        <header className="faculty-page-header">
          <div>
            <p className="fm-eyebrow">ACADEMIC RESOURCES</p>
            <h1>Faculty & Staff Management</h1>
            <p>Select a category below to access member directories, manage teaching workloads, staff assignments, and employment profiles.</p>
          </div>
        </header>

        <div className="fm-category-hub-grid">
          {[
            {
              category: 'Teaching',
              title: 'Teaching Faculty',
              description: 'Academic staff, professors, workload & subject allocations',
              members: teachingFaculty,
              icon: FiUsers,
              contractLabel: 'Contract/Guest',
              countLabel: 'Total Faculty',
              viewLabel: 'View Teaching Directory',
              addLabel: 'Add Teaching Faculty',
              addPath: '/faculty/new?category=Teaching',
            },
            {
              category: 'Non-Teaching',
              title: 'Non-Teaching Staff',
              description: 'Administrative officers, librarians, lab tech & campus staff',
              members: nonTeachingFaculty,
              icon: FiBriefcase,
              contractLabel: 'Contract/Temp',
              countLabel: 'Total Staff',
              viewLabel: 'View Staff Directory',
              addLabel: 'Add Non-Teaching Staff',
              addPath: '/faculty/new?category=Non-Teaching',
            },
          ].map(({ category, title, description, members, icon: Icon, contractLabel, countLabel, viewLabel, addLabel, addPath }) => {
            const workingCount = members.filter(member => member.employmentStatus === 'Working').length
            const leaveCount = members.filter(member => member.employmentStatus === 'On Leave').length
            const permanentCount = members.filter(member => member.employmentType === 'Permanent').length
            const contractCount = members.filter(member => member.employmentType && member.employmentType !== 'Permanent').length

            return (
              <article className="fm-hub-card" key={category}>
                <header className="fm-hub-card-header">
                  <div className="fm-hub-card-icon-wrap" aria-hidden="true">
                    <Icon className="fm-hub-card-icon" />
                  </div>
                  <div className="fm-hub-card-meta">
                    <h2>
                      <Link to={`/faculty?category=${category}`}>{title}</Link>
                    </h2>
                    <p>{description}</p>
                  </div>
                  <div className="fm-hub-card-total" aria-label={`${members.length} ${countLabel}`}>
                    <strong>{members.length}</strong>
                    <small>{countLabel}</small>
                  </div>
                </header>

                <div className="fm-hub-metrics-grid" role="region" aria-label={`${title} status breakdown`}>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{workingCount}</span>
                    <span className="fm-hub-metric-lbl">Working</span>
                  </div>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{leaveCount}</span>
                    <span className="fm-hub-metric-lbl">On Leave</span>
                  </div>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{permanentCount}</span>
                    <span className="fm-hub-metric-lbl">Permanent</span>
                  </div>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{contractCount}</span>
                    <span className="fm-hub-metric-lbl">{contractLabel}</span>
                  </div>
                </div>

                {members.length === 0 && (
                  <p className="fm-hub-empty-hint">No {category === 'Non-Teaching' ? 'staff' : 'faculty'} records created yet.</p>
                )}

                <footer className="fm-hub-card-footer">
                  <Link className="fm-hub-btn-primary" to={`/faculty?category=${category}`}>
                    {viewLabel} <FiArrowRight aria-hidden="true" />
                  </Link>
                  <Link className="fm-hub-btn-secondary" to={addPath}>
                    <FiPlus aria-hidden="true" /> {addLabel}
                  </Link>
                </footer>
              </article>
            )
          })}
        </div>
      </>
    )
  } else {
    // Directory View for the selected category (Teaching or Non-Teaching)
    const summary = [
      { label: selectedCategory === 'Non-Teaching' ? 'Total Staff' : 'Total Faculty', value: categoryFaculty.length },
      { label: 'Working', value: categoryFaculty.filter(row => row.employmentStatus === 'Working').length, tone: 'active' },
      { label: 'On Leave', value: categoryFaculty.filter(row => row.employmentStatus === 'On Leave').length, tone: 'danger' },
      { label: 'Permanent', value: categoryFaculty.filter(row => row.employmentType === 'Permanent').length, tone: 'upcoming' }
    ]
    content = (
      <>
        <header className="faculty-page-header">
          <div>
            <h1>{selectedCategory === 'Non-Teaching' ? 'Non-Teaching Staff Directory' : 'Teaching Faculty Directory'}</h1>
            <p>{selectedCategory === 'Non-Teaching' ? 'Manage administrative officers, librarians, lab technicians, accountants, and support staff.' : 'Manage professors, associate & assistant professors, lecturers, academic workload, and subject allocations.'}</p>
          </div>
          <div className="fm-header-right">
            <div className="fm-directory-summary-stack">
              <CompactSummary label={`${selectedCategory} summary`} items={summary} />
              <button type="button" className="fm-back-to-hub-btn" onClick={backToOverview}>
                <FiArrowLeft /> Back
              </button>
            </div>
          </div>
        </header>

        <section className="faculty-directory">
          <header className="fm-section-bar">
            <div>
              <p className="fm-eyebrow">{selectedCategory === 'Non-Teaching' ? 'NON-TEACHING STAFF DIRECTORY' : 'TEACHING FACULTY DIRECTORY'}</p>
              <p className="fm-muted">{filtered.length} {selectedCategory === 'Non-Teaching' ? 'staff' : 'faculty'} records</p>
            </div>
            <div className="fm-actions">{directoryActions}</div>
          </header>
          <FilterPanel active={active} onClear={clear}>
            <div className="faculty-filters">
              <label className="faculty-search">
                <FiSearch />
                <input
                  aria-label={`Search ${selectedCategory.toLowerCase()}`}
                  value={query}
                  onChange={event => { setQuery(event.target.value); setPage(1) }}
                  placeholder={`Search ${selectedCategory === 'Non-Teaching' ? 'staff' : 'faculty'} by name, employee ID, email or mobile`}
                />
              </label>
              {[['department', 'Department', departments], ['designation', 'Designation', currentDesignations], ['employmentType', 'Employment Type', employmentTypes], ['employmentStatus', 'Employment Status', statuses]].map(([key, label, options]) => (
                <SearchableSelect key={key} label={label} value={filters[key]} options={options} placeholder={label} onChange={value => { setFilters(old => ({ ...old, [key]: value })); setPage(1) }} />
              ))}
            </div>
          </FilterPanel>
          {filtered.length ? (
            <>
              <div className="faculty-table-wrap">
                <table>
                  <caption className="fm-sr-only">{selectedCategory} directory and records</caption>
                  <thead>
                    <tr>
                      {['Employee ID', 'Name', 'Department', 'Designation', 'Experience', 'Employment Type', 'Status', 'Actions'].map(label => (
                        <th scope="col" key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(item => (
                      <tr key={item.id}>
                        <td><span className="fm-employee-id">{formatFacultyDisplayCode(item, collegeOptions, faculty)}</span></td>
                        <td>
                          <div className="fm-identity">
                            <Avatar faculty={item} />
                            <div>
                              <strong title={item.fullName}>{item.fullName}</strong>
                              <small title={item.email}>{item.email}</small>
                            </div>
                          </div>
                        </td>
                        <td className="fm-department">{departmentOptions.find(d => String(d.value) === String(item.departmentId || item.department))?.label || item.department || '—'}</td>
                        <td>{item.designation || '—'}</td>
                        <td>{years(item.experience)}</td>
                        <td>{item.employmentType || '—'}</td>
                        <td><StatusBadge value={item.employmentStatus} /></td>
                        <td>
                          <div className="fm-actions">
                            <button type="button" className="fm-icon-button" title={`View ${selectedCategory === 'Non-Teaching' ? 'staff member' : 'faculty'}`} aria-label={'View: ' + item.fullName} onClick={() => navigate('/faculty/' + item.id + '?category=' + activeCategory)}>
                              <FiEye />
                            </button>
                            {selectedCategory === 'Teaching' && (
                              <button type="button" className="fm-icon-button" title="Assign Academic Work" aria-label={'Assign academic work: ' + item.fullName} onClick={() => setAssignmentId(item.id)}>
                                <FiBriefcase />
                              </button>
                            )}
                            <button type="button" className="fm-icon-button" title={`Edit ${selectedCategory === 'Non-Teaching' ? 'staff member' : 'faculty'}`} aria-label={'Edit: ' + item.fullName} onClick={() => navigate('/faculty/' + item.id + '/edit?category=' + activeCategory)}>
                              <FiEdit2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </>
          ) : (
            <EmptyState
              title={categoryFaculty.length ? `No ${selectedCategory === 'Non-Teaching' ? 'staff' : 'faculty'} found` : `No ${selectedCategory === 'Non-Teaching' ? 'non-teaching staff' : 'teaching faculty'} records available`}
              description={categoryFaculty.length ? 'Try changing your search or filters.' : `Add ${selectedCategory === 'Non-Teaching' ? 'staff members' : 'faculty members'} to start managing records.`}
              action={categoryFaculty.length ? 'Clear Filters' : (selectedCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty')}
              onAction={categoryFaculty.length ? clear : () => addFaculty(selectedCategory)}
            />
          )}
        </section>
      </>
    )
  }
  return (
    <DashboardLayout>
      {path === '/faculty' && (
        <nav className="app-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard">Home</Link>
          <span aria-hidden="true">/</span>
          {selectedCategory ? (
            <>
              <Link to="/faculty">Faculty Directory</Link>
              <span aria-hidden="true">/</span>
              <strong aria-current="page">{selectedCategory === 'Non-Teaching' ? 'Non-Teaching Staff' : 'Teaching Faculty'}</strong>
            </>
          ) : <strong aria-current="page">Faculty Directory</strong>}
        </nav>
      )}
      <main className={`faculty-management${path === '/faculty' && !selectedCategory ? ' faculty-management--overview' : ''}`}>
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
