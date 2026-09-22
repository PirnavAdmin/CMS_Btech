export const localAttendanceDate = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
export const attendanceStatusLabel = status => status === 'LOP' ? 'Loss of Pay' : status
export const attendanceFacultyMap = (faculty = []) => {
  const map = new Map()
  const aliases = new Map()
  // Reserve every faculty primary key before considering IDs from other tables.
  for (const member of faculty) {
    const id = String(member.id ?? member.facultyId ?? '')
    if (!id) continue
    map.set(id, id)
    if (member.facultyId) map.set(String(member.facultyId), id)
    for (const value of [
      member.employeeProfileId,
      member.EmployeeProfileId,
      member.employeeId,
      member.EmployeeId,
      member.facultyCode,
      member.FacultyCode,
      member.employeeCode,
      member.EmployeeCode,
      member.code,
      member.Code,
      member.employeeNo,
      member.EmployeeNo,
    ]) {
      if (!value) continue
      const alias = String(value).trim()
      if (!alias) continue
      if (!aliases.has(alias)) aliases.set(alias, id)
      else if (aliases.get(alias) !== id) aliases.set(alias, null)

      const numMatch = alias.match(/(\d+)$/)
      if (numMatch) {
        const num = String(parseInt(numMatch[1], 10))
        if (!aliases.has(num)) aliases.set(num, id)
      }
    }
  }
  for (const [alias, id] of aliases) if (id && !map.has(alias)) map.set(alias, id)
  return map
}
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
  const statuses = { p: 'Present', present: 'Present', a: 'Absent', absent: 'Absent', l: 'Late', late: 'Late', hd: 'Half Day', halfday: 'Half Day', ol: 'On Leave', onleave: 'On Leave', leave: 'On Leave', lop: 'LOP', lossofpay: 'LOP', notmarked: 'Not Marked', unmarked: 'Not Marked', pending: 'Not Marked' }
  // A merged/saved canonical status takes precedence over stale API aliases.
  // Numeric API statuses still use the accompanying readable status name.
  const statusValues = [row.status, row.Status, row.statusName, row.StatusName, row.attendanceStatus, row.AttendanceStatus]
  const statusText = String(statusValues.find(value => statuses[String(value ?? '').trim().toLowerCase().replace(/[\s_-]/g, '')]) ?? 'Not Marked').trim()
  const rawFacultyId = row.facultyId ?? row.FacultyId ?? row.faculty?.facultyId ?? row.faculty?.FacultyId ?? row.faculty?.id ?? row.faculty?.Id ?? row.employeeProfileId ?? row.EmployeeProfileId ?? row.facultyProfileId ?? row.FacultyProfileId ?? row.employeeProfile?.id ?? row.employeeProfile?.Id ?? (daily ? (row.id ?? row.Id) : '') ?? ''
  const hasExplicitFacultyId = Boolean(row.facultyId ?? row.FacultyId ?? row.faculty?.facultyId ?? row.faculty?.FacultyId ?? row.faculty?.id ?? row.faculty?.Id ?? row.employeeProfileId ?? row.EmployeeProfileId ?? row.facultyProfileId ?? row.FacultyProfileId ?? row.employeeProfile?.id ?? row.employeeProfile?.Id)
  const attendanceId = row.attendanceId ?? row.AttendanceId ?? row.facultyAttendanceId ?? row.FacultyAttendanceId ?? (hasExplicitFacultyId && row.id && String(row.id) !== String(rawFacultyId) ? (row.id ?? row.Id) : null) ?? (!daily ? (row.id ?? row.Id) : null)
  const time = value => {
    if (!value || value === '—') return ''
    const str = String(value).trim()
    return str.includes('T') ? str.split('T')[1].slice(0, 5) : str.length >= 5 ? str.slice(0, 5) : str
  }
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
  const statusPriority = { Present: 5, Late: 4, 'Half Day': 4, 'On Leave': 3, LOP: 3, Absent: 2, 'Not Marked': 1 }
  const rows = new Map()
  for (const collection of collections) {
    for (const row of (collection || [])) {
      if (!row || !row.facultyId || !row.date) continue
      const date = String(row.date || row.attendanceDate || '').slice(0, 10)
      const key = `${row.facultyId}:${date}`
      const previous = rows.get(key)
      if (!previous) {
        rows.set(key, { ...row, date })
      } else {
        const prevPriority = statusPriority[previous.status] || 0
        const rowPriority = statusPriority[row.status] || 0
        const bestStatus = rowPriority >= prevPriority ? row.status : previous.status
        const attId = row.attendanceId || previous.attendanceId || null
        rows.set(key, {
          ...previous,
          ...row,
          date,
          status: bestStatus,
          attendanceId: attId,
          id: attId || row.id || previous.id || '',
          checkIn: (row.checkIn && row.checkIn !== '—' && row.checkIn !== '') ? row.checkIn : previous.checkIn,
          checkOut: (row.checkOut && row.checkOut !== '—' && row.checkOut !== '') ? row.checkOut : previous.checkOut,
          remarks: (row.remarks && row.remarks !== '—' && row.remarks !== '') ? row.remarks : previous.remarks,
          synthetic: !attId,
        })
      }
    }
  }
  return [...rows.values()]
}
