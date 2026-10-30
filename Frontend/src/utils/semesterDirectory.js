import { createCollegeScope } from './collegeScope.js'

export function sameSemesterRecord(left, right) {
  return ['branchId', 'academicYearId', 'semesterNumber'].every(key =>
    left?.[key] != null && String(left[key]) !== '' && String(left[key]) === String(right?.[key])
  )
}

export function scopeSemesterDirectory(rows, { collegeId, assignedCollegeId, isAdmin, courses = [], branches = [] }) {
  const target = collegeId || assignedCollegeId
  if (target) return createCollegeScope(target, { courses, branches })(rows)
  return isAdmin && Array.isArray(rows) ? rows : []
}
