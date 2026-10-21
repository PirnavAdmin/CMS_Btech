import { createCollegeScope } from '../../utils/collegeScope.js'

// API collections may contain multiple colleges, especially for SuperAdmin.
// Resolve ownership through the complete hierarchy before exposing any records.
export function scopeTimetableData(sources, tables, collegeId) {
  const filter = createCollegeScope(collegeId, sources)
  const scoped = { ...sources }
  for (const field of ['years', 'departments', 'courses', 'branches', 'semesters', 'sections', 'subjects', 'faculty', 'allocations', 'classrooms']) {
    if (Array.isArray(sources[field])) scoped[field] = filter(sources[field])
  }
  const yearIds = new Set((scoped.years || []).map(row => String(row.id ?? row.academicYearId)))
  scoped.yearSettings = Object.fromEntries(Object.entries(sources.yearSettings || {}).filter(([year]) => yearIds.has(year)))
  return { sources: scoped, tables: filter(tables) }
}
