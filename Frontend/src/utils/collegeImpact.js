const fields = ['studentCount', 'facultyCount', 'departmentCount', 'courseCount', 'sectionCount', 'admissionCount']
export function normalizeCollegeImpact(impact, facultyCount) {
  if (!impact || typeof impact !== 'object') throw new Error('Unable to verify associated college data.')
  const result = Object.fromEntries(fields.map(field => {
    const raw = field === 'facultyCount' ? impact[field] ?? facultyCount : impact[field]
    const value = raw == null ? 0 : Number(raw)
    if (!Number.isFinite(value) || value < 0) throw new Error('Invalid college association count.')
    return [field, value]
  }))
  result.totalCount = Math.max(Number(impact.totalCount) || 0, fields.reduce((sum, field) => sum + result[field], 0))
  return result
}
export async function countCollegeFaculty(fetchRows, collegeId) {
  const rows = await fetchRows({ collegeId })
  if (!Array.isArray(rows)) throw new Error('Unable to verify associated faculty.')
  return rows.filter(row => String(row.collegeId ?? row.CollegeId ?? row.college_id ?? '') === String(collegeId) && !row.deletedAt && !row.DeletedAt).length
}
