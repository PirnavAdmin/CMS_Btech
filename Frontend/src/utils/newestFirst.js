// Session-only display priority; IDs and timestamps always come from existing records.
const created = new Map()
let sequence = 0
const idKeys = { colleges: 'collegeId', departments: 'departmentId', courses: 'courseId', branches: 'branchId', 'academic-years': 'academicYearId', semesters: 'semesterId', sections: 'sectionId', admissions: 'admissionId', 'college-settings': 'collegeSettingsId' }
export function recordId(record, module) {
  if (record == null) return ''
  if (typeof record !== 'object') return String(record)
  if (module === 'admissions' && record.studentAdmissionId != null) return String(record.studentAdmissionId)
  if (record[idKeys[module]] != null) return String(record[idKeys[module]])
  if (record.id != null) return String(record.id)
  for (const key of ['data', 'item', 'record', 'result', 'college', 'course', 'department']) {
    if (record[key]) { const id = recordId(record[key], module); if (id) return id }
  }
  return ''
}
export function rememberCreated(module, record) {
  const id = recordId(record, module)
  if (!id) return
  if (!created.has(module)) created.set(module, new Map())
  created.get(module).set(id, ++sequence)
}
export function newestFirst(module, rows) {
  const priority = created.get(module)
  const timestamp = row => Date.parse(row.createdAt ?? row.createdDate ?? row.createdOn ?? '') || 0
  return [...rows].sort((a, b) => (priority?.get(recordId(b, module)) || 0) - (priority?.get(recordId(a, module)) || 0) || timestamp(b) - timestamp(a))
}
