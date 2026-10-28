export function validateMarks(value, maximum) {
  if (value === '' || value === null || value === undefined) return true
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 && score <= Number(maximum)
}

export function getAttendanceCounts(statuses, rosterSize) {
  const values = Object.values(statuses)
  return {
    present: values.filter(value => value === 'PRESENT').length,
    absent: values.filter(value => value === 'ABSENT').length,
    late: values.filter(value => value === 'LATE').length,
    marked: values.length,
    complete: values.length === rosterSize,
  }
}

export function buildAttendanceRecords(roster, statuses) {
  if (!roster.length || roster.some(student => !['PRESENT', 'ABSENT', 'LATE'].includes(statuses[student.id]))) return null
  return roster.map(student => ({
    studentId: student.id,
    rollNumber: student.rollNumber,
    name: student.name,
    status: statuses[student.id],
  }))
}

export function calculateLeaveDays(fromDate, toDate, halfDay = false) {
  if (!fromDate || !toDate || fromDate > toDate) return 0
  if (halfDay) return fromDate === toDate ? 0.5 : 0
  const start = new Date(`${fromDate}T00:00:00`)
  const end = new Date(`${toDate}T00:00:00`)
  let count = 0
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (date.getDay() !== 0 && date.getDay() !== 6) count += 1
  }
  return count
}

export function hasLeaveOverlap(fromDate, toDate, requests) {
  if (!fromDate || !toDate || fromDate > toDate) return false
  return requests.some(row =>
    row.status !== 'Rejected'
    && row.status !== 'Cancelled'
    && fromDate <= row.toDate
    && toDate >= row.fromDate,
  )
}
