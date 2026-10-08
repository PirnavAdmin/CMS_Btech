export const defaultBands = [
  { grade: 'O', min: 90, max: 100, points: 10, pass: true },
  { grade: 'A+', min: 80, max: 90, points: 9, pass: true },
  { grade: 'A', min: 70, max: 80, points: 8, pass: true },
  { grade: 'B+', min: 60, max: 70, points: 7, pass: true },
  { grade: 'B', min: 50, max: 60, points: 6, pass: true },
  { grade: 'C', min: 40, max: 50, points: 5, pass: true },
  { grade: 'F', min: 0, max: 40, points: 0, pass: false },
]
export function validateBands(bands) {
  if (!bands.length) return 'Add at least one grade band.'
  const sorted = [...bands].sort((a, b) => Number(a.min) - Number(b.min))
  const names = new Set()
  for (const [i, band] of sorted.entries()) {
    if (!band.grade.trim() || names.has(band.grade.trim().toUpperCase())) return 'Grade names must be unique and non-empty.'
    names.add(band.grade.trim().toUpperCase())
    if ([band.min, band.max, band.points].some(value => value === '' || !Number.isFinite(Number(value)))) return 'Complete all numeric fields.'
    if (Number(band.min) < 0 || Number(band.max) > 100 || Number(band.min) >= Number(band.max) || Number(band.points) < 0 || Number(band.points) > 10) return 'Use percentage ranges within 0-100 and grade points within 0-10.'
    if (i && Number(sorted[i - 1].max) !== Number(band.min)) return 'Grade bands must cover 0-100 without gaps or overlaps.'
  }
  if (Number(sorted[0].min) !== 0 || Number(sorted.at(-1).max) !== 100) return 'Grade bands must cover the entire range from 0 to 100.'
  return ''
}
export function gradeFor(percentage, bands) {
  return bands.find(band => percentage >= Number(band.min) && (percentage < Number(band.max) || percentage === 100 && Number(band.max) === 100))
}
const text = value => typeof value === 'object' && value ? String(value.name || value.label || '') : String(value ?? '')
const number = value => value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value)
export function flattenResults(sheets) {
  return sheets.flatMap((sheet, sheetIndex) => (Array.isArray(sheet.records) ? sheet.records : [sheet]).map((record, index) => {
    const max = number(record.maximumMarks ?? sheet.maximumMarks ?? sheet.maxMarks) ?? ((number(sheet.maxInternal) !== null && number(sheet.maxExternal) !== null) ? Number(sheet.maxInternal) + Number(sheet.maxExternal) : null)
    const total = number(record.totalMarks ?? record.marksObtained) ?? ((number(record.internalMarks) !== null && number(record.externalMarks) !== null) ? Number(record.internalMarks) + Number(record.externalMarks) : null)
    return { id: `${sheet.id || sheetIndex}:${record.studentId || index}:${index}`, collegeId: record.collegeId ?? sheet.collegeId, academicYearId: record.academicYearId ?? sheet.academicYearId, studentId: text(record.studentId ?? record.id), studentName: text(record.studentName ?? record.name), registrationNumber: text(record.registrationNumber ?? record.rollNumber), department: text(record.departmentName ?? sheet.departmentName ?? sheet.department ?? sheet.branchName ?? sheet.branch), semester: text(record.semesterName ?? sheet.semesterName ?? sheet.semester), subjectCode: text(record.subjectCode ?? sheet.subjectCode), subjectName: text(record.subjectName ?? sheet.subjectName), examType: text(record.examType ?? sheet.examType), totalMarks: total, maximumMarks: max, percentage: max > 0 && total !== null ? total / max * 100 : null, credits: number(record.credits ?? sheet.credits), grade: text(record.grade), gradePoint: number(record.gradePoint), status: text(record.status ?? record.resultStatus ?? 'Pending'), examDate: text(record.examDate ?? sheet.examDate ?? sheet.updatedAt ?? sheet.createdAt) }
  }))
}
export function summarize(rows, key) {
  const groups = new Map()
  rows.forEach(row => { const value = row[key] || 'Unassigned'; if (!groups.has(value)) groups.set(value, []); groups.get(value).push(row) })
  return [...groups].map(([group, records]) => {
    const graded = records.filter(row => /^(passed|failed)$/i.test(row.status))
    const passed = graded.filter(row => /^passed$/i.test(row.status)).length
    return { group, students: new Set(records.map(row => row.studentId || row.registrationNumber).filter(Boolean)).size, subjects: records.length, passed, failed: graded.length - passed, pending: records.length - graded.length, passRate: graded.length ? `${(passed / graded.length * 100).toFixed(1)}%` : '-', }
  })
}
export function weightedGpa(rows) {
  if (!rows.length || rows.some(row => !(row.credits > 0) || !Number.isFinite(row.gradePoint) || row.gradePoint < 0 || row.gradePoint > 10)) return null
  const credits = rows.reduce((sum, row) => sum + row.credits, 0)
  return rows.reduce((sum, row) => sum + row.credits * row.gradePoint, 0) / credits
}
export function backlogRows(rows) {
  // Preserve exam types as separate assessments; a pass in another assessment cannot clear a backlog.
  const latest = new Map()
  rows.forEach(row => {
    if (!(row.studentId || row.registrationNumber) || !row.subjectCode) return
    const key = JSON.stringify([row.studentId || row.registrationNumber, row.semester, row.subjectCode, row.examType])
    const old = latest.get(key)
    if (!old || (Date.parse(row.examDate) || 0) > (Date.parse(old.examDate) || 0)) latest.set(key, row)
  })
  return [...latest.values()].filter(row => /^failed$/i.test(row.status) || row.grade === 'F')
}

export function resultIssues(row) {
  const issues = []
  if (!row.studentId && !row.registrationNumber) issues.push('Missing student ID')
  if (!row.subjectCode) issues.push('Missing subject code')
  if (row.totalMarks === null || !Number.isFinite(row.totalMarks)) issues.push('Missing marks')
  if (!(row.maximumMarks > 0)) issues.push('Missing maximum marks')
  if (row.totalMarks !== null && (row.totalMarks < 0 || row.maximumMarks > 0 && row.totalMarks > row.maximumMarks)) issues.push('Marks outside range')
  if (!(row.credits > 0)) issues.push('Missing credits')
  return issues
}
export function resultAnalytics(rows) {
  const valid = rows.filter(row => Number.isFinite(row.percentage) && row.percentage >= 0 && row.percentage <= 100)
  const passed = rows.filter(row => /^passed$/i.test(row.status)).length
  const failed = rows.filter(row => /^failed$/i.test(row.status)).length
  const distribution = new Map()
  rows.forEach(row => { const grade = row.grade || 'Ungraded'; distribution.set(grade, (distribution.get(grade) || 0) + 1) })
  return { passed, failed, pending: rows.length - passed - failed, average: valid.length ? valid.reduce((sum, row) => sum + row.percentage, 0) / valid.length : null, highest: valid.length ? valid.reduce((highest, row) => Math.max(highest, row.percentage), 0) : null, passRate: passed + failed ? passed / (passed + failed) * 100 : null, distribution: [...distribution].map(([grade, count]) => ({ grade, count })), issues: rows.filter(row => resultIssues(row).length).length }
}
export function sortResultRows(rows, sort) {
  return [...rows].sort((a, b) => {
    if (sort === 'score-desc' || sort === 'score-asc') {
      if (a.percentage === null || a.percentage === undefined) return b.percentage == null ? 0 : 1
      if (b.percentage === null || b.percentage === undefined) return -1
      return sort === 'score-desc' ? b.percentage - a.percentage : a.percentage - b.percentage
    }
    if (sort === 'name') return String(a.studentName || a.group || '').localeCompare(String(b.studentName || b.group || ''), undefined, { numeric: true })
    return 0
  })
}
