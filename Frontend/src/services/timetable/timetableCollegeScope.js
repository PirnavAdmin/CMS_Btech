import { collegeField, createCollegeScope } from '../../utils/collegeScope.js'

function preferredAcademicYearId() {
  try {
    const context = JSON.parse(localStorage.getItem('pirnav_academic_context') || '{}')
    return String(context.academicYearId || localStorage.getItem('pirnav-selected-academic-year-id') || '')
  } catch {
    return ''
  }
}

// API collections may contain multiple colleges, especially for SuperAdmin.
// Resolve ownership through the complete hierarchy before exposing any records.
export function scopeTimetableData(sources, tables, collegeId) {
  const filter = createCollegeScope(collegeId, sources)
  const scoped = { ...sources }
  for (const field of ['years', 'departments', 'courses', 'branches', 'semesters', 'sections', 'subjects', 'faculty', 'allocations', 'classrooms']) {
    if (Array.isArray(sources[field])) scoped[field] = filter(sources[field])
  }
  // The academic-years endpoint is already requested in the selected college
  // context, but some API versions omit CollegeId on each year DTO. Keep those
  // rows so the active year remains available to the timetable builder.
  if (Array.isArray(sources.years)) {
    const preferredYearId = preferredAcademicYearId()
    const scopedYearIds = new Set((scoped.years || []).map(row => String(row.id ?? row.academicYearId)))
    scoped.years = sources.years.filter(row => {
      const yearId = String(row.id ?? row.academicYearId ?? '')
      return scopedYearIds.has(yearId) || yearId === preferredYearId || !collegeField(row, 'college')
    })
  }
  const yearIds = new Set((scoped.years || []).map(row => String(row.id ?? row.academicYearId)))
  scoped.yearSettings = Object.fromEntries(Object.entries(sources.yearSettings || {}).filter(([year]) => yearIds.has(year)))
  return { sources: scoped, tables: filter(tables) }
}
