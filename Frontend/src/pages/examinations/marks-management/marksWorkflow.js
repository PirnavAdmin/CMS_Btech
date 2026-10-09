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
