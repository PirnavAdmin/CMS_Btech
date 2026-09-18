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
  const statusText = String(row.statusName || row.attendanceStatus || row.status || 'Not Marked').trim()
  const statuses = { p: 'Present', present: 'Present', a: 'Absent', absent: 'Absent', l: 'Late', late: 'Late', hd: 'Half Day', halfday: 'Half Day', ol: 'On Leave', onleave: 'On Leave', leave: 'On Leave', lop: 'LOP', lossofpay: 'LOP', notmarked: 'Not Marked', unmarked: 'Not Marked', pending: 'Not Marked' }
  const attendanceId = row.attendanceId || row.facultyAttendanceId || (!daily ? row.id : null)
  const time = value => String(value || '').includes('T') ? String(value).split('T')[1].slice(0, 5) : value || ''
  return { ...row, id: attendanceId || '', attendanceId: attendanceId || null,
    facultyId: String(row.facultyId ?? row.faculty?.facultyId ?? row.faculty?.id ?? row.employeeProfileId ?? row.facultyProfileId ?? row.employeeProfile?.id ?? (daily ? row.id : '') ?? ''),
    date: String(row.attendanceDate || row.date || date).slice(0, 10),
    status: statuses[statusText.toLowerCase().replace(/[\s_-]/g, '')] || statusText,
    checkIn: time(row.checkIn ?? row.checkInTime), checkOut: time(row.checkOut ?? row.checkOutTime), synthetic: !attendanceId }
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
