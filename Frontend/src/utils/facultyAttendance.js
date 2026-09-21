export const localAttendanceDate = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
export const attendanceStatusLabel = status => status === 'LOP' ? 'Loss of Pay' : status
// Weekly/monthly cells need dated daily records, not aggregate totals.
export const loadDailyAttendancePeriod = async (getDaily, from, to, lastDate = localAttendanceDate(new Date())) => {
  const dates = []
  const end = to < lastDate ? to : lastDate
  for (const day = new Date(`${from}T00:00:00`); localAttendanceDate(day) <= end; day.setDate(day.getDate() + 1)) {
    dates.push(localAttendanceDate(day))
  }
  const records = []
  for (let offset = 0; offset < dates.length; offset += 4) {
    const batches = await Promise.all(dates.slice(offset, offset + 4).map(async date => {
      const rows = await getDaily({ date })
      return rows.map(row => normalizeAttendanceRow(row, { daily: true, date }))
    }))
    records.push(...batches.flat())
  }
  return records
}
export const normalizeAttendanceRow = (row, { daily = false, date = '' } = {}) => {
  if (!row || typeof row !== 'object') return row
  const statusText = String(row.statusName || row.attendanceStatus || row.status || row.StatusName || row.AttendanceStatus || row.Status || 'Not Marked').trim()
  const statuses = { p: 'Present', present: 'Present', a: 'Absent', absent: 'Absent', l: 'Late', late: 'Late', hd: 'Half Day', halfday: 'Half Day', ol: 'On Leave', onleave: 'On Leave', leave: 'On Leave', lop: 'LOP', lossofpay: 'LOP', notmarked: 'Not Marked', unmarked: 'Not Marked', pending: 'Not Marked' }
  const attendanceId = row.attendanceId ?? row.AttendanceId ?? row.facultyAttendanceId ?? row.FacultyAttendanceId ?? (!daily ? (row.id ?? row.Id) : null)
  const time = value => {
    if (!value || value === '—') return ''
    const str = String(value).trim()
    return str.includes('T') ? str.split('T')[1].slice(0, 5) : str.length >= 5 ? str.slice(0, 5) : str
  }
  const rawFacultyId = row.facultyId ?? row.FacultyId ?? row.faculty?.facultyId ?? row.faculty?.FacultyId ?? row.faculty?.id ?? row.faculty?.Id ?? row.employeeProfileId ?? row.EmployeeProfileId ?? row.facultyProfileId ?? row.FacultyProfileId ?? row.employeeProfile?.id ?? row.employeeProfile?.Id ?? (daily ? (row.id ?? row.Id) : '') ?? ''
  const attendanceDate = String(row.attendanceDate ?? row.AttendanceDate ?? row.date ?? row.Date ?? date).slice(0, 10)
  const remarks = row.remarks ?? row.Remarks ?? ''

  return {
    ...row,
    id: attendanceId || '',
    attendanceId: attendanceId || null,
    facultyId: String(rawFacultyId),
    date: attendanceDate,
    status: statuses[statusText.toLowerCase().replace(/[\s_-]/g, '')] || statusText,
    checkIn: time(row.checkIn ?? row.CheckIn ?? row.checkInTime ?? row.CheckInTime),
    checkOut: time(row.checkOut ?? row.CheckOut ?? row.checkOutTime ?? row.CheckOutTime),
    remarks: remarks || '—',
    synthetic: !attendanceId,
  }
}
export const combineAttendance = (...collections) => {
  const rows = new Map()
  for (const collection of collections) for (const row of collection) {
    if (!row.facultyId || !row.date) continue
    const key = `${row.facultyId}:${row.date}`
    const previous = rows.get(key)
    if (!previous || row.status !== 'Not Marked' || previous.status === 'Not Marked') rows.set(key, row)
  }
  return [...rows.values()]
}
