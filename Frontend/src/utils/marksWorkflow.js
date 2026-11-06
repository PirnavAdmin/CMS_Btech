export const editableMark = row => ['DRAFT', 'REJECTED'].includes(row.workflowStatus)
export function markValueError(row) {
  if (String(row.marksObtained ?? '').trim() === '') return 'Enter marks; blank is not zero.'
  const marks = Number(row.marksObtained), maximum = Number(row.maxMarks)
  if (!Number.isFinite(marks) || !Number.isFinite(maximum) || maximum <= 0 || marks < 0 || marks > maximum) return 'Marks must be between zero and the positive maximum.'
  return ''
}
export function marksWorkflowPayload(action, rows, remarks = '') {
  if (!rows.length) throw new Error('Select at least one mark.')
  const allowed = action === 'submit' ? ['DRAFT', 'REJECTED'] : ['SUBMITTED']
  if (!['submit', 'approve', 'reject'].includes(action) || rows.some(row => !allowed.includes(row.workflowStatus))) throw new Error('Selection contains marks that cannot enter this transition. Reload and review their status.')
  const examId = Number(rows[0].examId)
  if (!Number.isSafeInteger(examId) || examId <= 0 || rows.some(row => Number(row.examId) !== examId)) throw new Error('Select marks from one examination.')
  if (action === 'reject' && !remarks.trim()) throw new Error('Remarks are required when returning marks for correction.')
  const markIds = [...new Set(rows.map(row => Number(row.markId)))]
  if (markIds.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('The selected marks have invalid identifiers.')
  return { examId, markIds, remarks: remarks.trim() || null }
}
export function workflowSummary(result) {
  if (!result || !Number.isInteger(result.processedCount)) throw new Error('The server did not confirm the workflow result. Reload before retrying.')
  return `${result.processedCount} processed; ${result.rejectedCount || 0} rejected.`
}

export async function createOrVerifyMark(api, payload, pending) {
  const { examId, studentId, subjectId } = payload
  const key = JSON.stringify([examId, studentId, subjectId])
  const previous = pending.get(key)
  if (previous) {
    const records = await api.list({ examId, studentId, subjectId })
    const found = records.find(row => Number(row.markId) > 0 &&
      Number(row.examId) === examId && Number(row.studentId) === studentId && Number(row.subjectId) === subjectId)
    if (!found) throw new Error('The previous submission is still unconfirmed. Check Marks Records before trying again.')
    if (Number(found.marksObtained) !== previous.marksObtained || Number(found.maxMarks) !== previous.maxMarks ||
      (found.grade ?? null) !== (previous.grade ?? null) || (found.remarks ?? null) !== (previous.remarks ?? null) ||
      (found.sectionId ?? null) !== (previous.sectionId ?? null) ||
      payload.marksObtained !== previous.marksObtained || payload.maxMarks !== previous.maxMarks ||
      payload.grade !== previous.grade || payload.remarks !== previous.remarks || payload.sectionId !== previous.sectionId) {
      throw new Error('A mark already exists. Open it from Marks Records to review or edit it.')
    }
    pending.delete(key)
    return found
  }
  pending.set(key, payload)
  try {
    const saved = await api.create(payload)
    if (!(Number(saved?.markId) > 0)) throw new Error('The server did not confirm the mark identity. Retry to check Marks Records.')
    pending.delete(key)
    return saved
  } catch (error) {
    if (error.status >= 400 && error.status < 500 && ![408, 409].includes(error.status)) pending.delete(key)
    throw error
  }
}

export async function importVerifiedMarks(api, file, scope, pending) {
  const key = `${scope.examId}:${scope.sectionId || ''}`
  if (pending.has(key)) throw new Error('A previous import is unconfirmed. Review Marks Records before another import for this examination.')
  pending.set(key, true)
  try {
    const result = await api.upload(file, scope, false)
    const counts = ['totalRows', 'validRows', 'insertedRows', 'updatedRows', 'rejectedRows']
    if (!(Number(result?.uploadId) > 0) || counts.some(field => !Number.isInteger(result[field]) || result[field] < 0) ||
      result.totalRows < 1 || result.insertedRows + result.updatedRows + result.rejectedRows !== result.totalRows || !Array.isArray(result.errors)) {
      throw new Error('The server did not confirm this import. Review Marks Records before another import.')
    }
    pending.delete(key)
    return result
  } catch (error) {
    if (error.status >= 400 && error.status < 500 && ![408, 409].includes(error.status)) pending.delete(key)
    throw error
  }
}
