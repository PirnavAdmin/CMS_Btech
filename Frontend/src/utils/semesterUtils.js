// Backend status is an administrative flag, not evidence of a running semester.
export const dateOnly = (value) => {
  const text = String(value ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return ''
  const date = new Date(`${text}T12:00:00`)
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(text.slice(0, 4)) && date.getMonth() + 1 === Number(text.slice(5, 7)) && date.getDate() === Number(text.slice(8, 10)) ? text : ''
}

export const deriveLifecycleStatus = (item = {}, fallback = 'Upcoming', now = new Date()) => {
  const start = dateOnly(item.startDate)
  const end = dateOnly(item.endDate)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (start && end && start <= end) {
    if (today < start) return 'Upcoming'
    if (today > end) return 'Completed'
    return 'Active'
  }
  if (end && !start && today > end) return 'Completed'
  // A missing schedule cannot establish that a semester is current.
  // Numeric 0 is ambiguous: older clients used it for future semesters too.
  return 'Upcoming'
}

export const cohortStart = (item = {}) => {
  const match = String(item.academicYearName ?? '').match(/(\d{4})\D+\d{2,4}/)
  const number = Number(item.semesterNumber)
  return match && Number.isInteger(number) && number > 0 ? Number(match[1]) - Math.floor((number - 1) / 2) : null
}

export const sameCohort = (left, right) => Boolean(left && right && cohortStart(left) !== null && cohortStart(right) !== null && String(left.courseId) === String(right.courseId) && String(left.branchId) === String(right.branchId) && cohortStart(left) === cohortStart(right))

export const sameCourseCohort = (left, right) => Boolean(left && right && cohortStart(left) !== null && cohortStart(right) !== null && String(left.courseId) === String(right.courseId) && cohortStart(left) === cohortStart(right))

export const branchTypeLabel = (branch = {}) => {
  const raw = String(branch.branchType ?? branch.type ?? '').trim()
  if (raw.toLowerCase() === 'core') return 'Core'
  if (raw.toLowerCase() === 'specialization') return 'Specialization'
  return raw || (branch.specialization ? 'Specialization' : '')
}

export const isActiveBranch = (branch = {}) => {
  const raw = branch.status ?? branch.branchStatus ?? branch.isActive ?? branch.active
  return raw === true || String(raw).trim() === '1' || String(raw).trim().toLowerCase() === 'active'
}

export const branchAssignments = (plan, branches, existing = []) => branches.flatMap((branch) => plan.map((row) => ({
  ...row, branchId: branch.id, branchName: branch.name, branchCode: branch.code, branchType: branchTypeLabel(branch),
}))).filter((row) => !existing.some((item) => sameCohort(item, row) && Number(item.semesterNumber) === Number(row.semesterNumber)))

export const validateSchedule = (rows) => {
  let previousEnd = ''
  for (const row of [...rows].sort((a, b) => a.semesterNumber - b.semesterNumber)) {
    const start = dateOnly(row.startDate), end = dateOnly(row.endDate)
    if ((row.startDate && !start) || (row.endDate && !end)) return `${row.semesterName}: enter valid dates.`
    if (Boolean(start) !== Boolean(end)) return `${row.semesterName}: provide both start and end dates, or leave both blank.`
    if (start && start > end) return `${row.semesterName}: end date must be on or after start date.`
    if (start && previousEnd && start <= previousEnd) return `${row.semesterName}: schedule must follow the previous semester without overlap.`
    if (end) previousEnd = end
  }
  return ''
}
