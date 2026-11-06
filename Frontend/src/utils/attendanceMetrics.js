export function knownAttendanceRate(value) {
  if (value == null || value === '') return null
  const rate = Number(value)
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null
}
export function attendancePercentage(present, total) {
  if (present == null || total == null || !Number.isFinite(Number(present)) || !Number.isFinite(Number(total)) || Number(total) <= 0 || Number(present) < 0 || Number(present) > Number(total)) return null
  return Math.round(Number(present) / Number(total) * 100)
}
