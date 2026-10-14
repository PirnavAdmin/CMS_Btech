// Creation timestamps take precedence; numeric record IDs break ties when dates are unavailable.
const created = new Map()
let sequence = 0
const idKeys = { colleges: 'collegeId', departments: 'departmentId', courses: 'courseId', branches: 'branchId', 'academic-years': 'academicYearId', semesters: 'semesterId', sections: 'sectionId', admissions: 'admissionId', 'college-settings': 'collegeSettingsId', 'student-profiles': 'studentId', 'course-mappings': 'courseSemesterMappingId', attendance: 'sessionId', results: 'sheetId', promotions: 'promotionId' }
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
  const timestamp = row => {
    for (const key of ['createdAt', 'createdDate', 'createdOn', 'created_at', 'CreatedAt', 'CreatedDate', 'CreatedOn']) {
      const value = Date.parse(row[key]); if (Number.isFinite(value)) return value
    }
    return 0
  }
  const compareIds = (a, b) => {
    const left = recordId(a, module), right = recordId(b, module)
    if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return 0
    return BigInt(right) > BigInt(left) ? 1 : BigInt(right) < BigInt(left) ? -1 : 0
  }
  return [...rows].sort((a, b) => (priority?.get(recordId(b, module)) || 0) - (priority?.get(recordId(a, module)) || 0) || timestamp(b) - timestamp(a) || compareIds(a, b))
}
