export const editableMark = row => ['DRAFT', 'REJECTED'].includes(row.workflowStatus)
const positiveId = value => /^[1-9]\d*$/.test(String(value ?? '').trim()) ? Number(value) : null
const firstValue = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '')
const textKey = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
const examParentSelections = new Set(['academicYear', 'course', 'branch', 'semester', 'section', 'subject', 'subjectCode', 'examType', 'examId'])

export function clearMarksAssessmentDependents(changedKey) {
  if (!examParentSelections.has(changedKey)) return {}
  return { examId: '', examType: '', assessmentType: '', registrationNumber: '', studentName: '', studentId: '' }
}

export function normalizeMarksExam(row = {}) {
  const relation = name => row[name] ?? row[`${name[0].toUpperCase()}${name.slice(1)}`]
  const relationId = (name, ...aliases) => firstValue(
    row[`${name}Id`], row[`${name[0].toUpperCase()}${name.slice(1)}Id`], ...aliases.map(alias => row[alias]),
    relation(name)?.[`${name}Id`], relation(name)?.[`${name[0].toUpperCase()}${name.slice(1)}Id`], relation(name)?.id, relation(name)?.Id,
  )
  const relationName = (name, ...aliases) => firstValue(
    row[`${name}Name`], row[`${name[0].toUpperCase()}${name.slice(1)}Name`], ...aliases.map(alias => row[alias]),
    typeof relation(name) === 'string' ? relation(name) : relation(name)?.name ?? relation(name)?.Name,
  )
  const examId = firstValue(row.examId, row.ExamId, row.id, row.Id)
  return {
    ...row,
    examId: examId == null ? '' : String(examId),
    collegeId: firstValue(row.collegeId, row.CollegeId, relation('college')?.collegeId, relation('college')?.CollegeId, relation('college')?.id, relation('college')?.Id),
    academicYearId: firstValue(row.academicYearId, row.AcademicYearId, relation('academicYear')?.academicYearId, relation('academicYear')?.AcademicYearId, relation('academicYear')?.id, relation('academicYear')?.Id),
    examName: firstValue(row.examName, row.ExamName, row.name, row.Name, ''),
    examTypeName: firstValue(row.examTypeName, row.ExamTypeName, typeof relation('examType') === 'string' ? relation('examType') : relation('examType')?.examTypeName ?? relation('examType')?.ExamTypeName ?? relation('examType')?.name ?? relation('examType')?.Name, ''),
    courseId: relationId('course', 'CourseID'),
    courseName: relationName('course', 'CourseName'),
    branchId: relationId('branch', 'BranchID'),
    branchName: relationName('branch', 'BranchName'),
    semesterId: relationId('semester', 'SemesterID'),
    semesterName: relationName('semester', 'SemesterName'),
    sectionId: relationId('section', 'SectionID'),
    sectionName: relationName('section', 'SectionName'),
    subjectId: relationId('subject', 'SubjectID'),
    subjectName: relationName('subject', 'SubjectName'),
  }
}

export function scopeMarksExams(records, { collegeId, academicYearId } = {}) {
  if (collegeId == null || String(collegeId).trim() === '' || academicYearId == null || String(academicYearId).trim() === '') return []
  return (Array.isArray(records) ? records : []).map(normalizeMarksExam).filter(exam => {
    const active = exam.isActive ?? exam.IsActive
    const hasActiveFlag = active !== undefined && active !== null && String(active).trim() !== ''
    const inactive = hasActiveFlag && (active === false || ['0', 'false'].includes(String(active).trim().toLowerCase()))
    return positiveId(exam.examId) !== null && String(exam.collegeId ?? '') === String(collegeId) &&
      String(exam.academicYearId ?? '') === String(academicYearId) && !inactive &&
      !['inactive', 'cancelled', 'canceled', 'deleted'].includes(textKey(exam.status ?? exam.Status))
  })
}

function sameExamDimension(exam, name, expectedId, expectedName) {
  const actualId = exam[`${name}Id`]
  const actualName = exam[`${name}Name`]
  if ((expectedId == null || String(expectedId).trim() === '') && !expectedName) return true
  if (actualId == null && !actualName) return true
  if (expectedId != null && String(expectedId).trim() && actualId != null) return String(actualId) === String(expectedId)
  if (expectedName && actualName) return textKey(expectedName) === textKey(actualName)
  return false
}

export function resolveAuthorizedMarksExam(exams, scope = {}) {
  const examId = positiveId(scope.examId)
  if (examId === null || scope.collegeId == null || scope.academicYearId == null) return null
  const candidate = scopeMarksExams(exams, scope).find(exam => Number(exam.examId) === examId)
  if (!candidate) return null
  for (const name of ['course', 'branch', 'semester', 'section', 'subject']) {
    if (!sameExamDimension(candidate, name, scope[`${name}Id`], scope[`${name}Name`])) return null
  }
  return candidate
}

export function marksSaveErrorMessage(error) {
  const code = String(error?.code ?? error?.response?.data?.code ?? '').toUpperCase()
  if (code === 'RECORD_OUTSIDE_SCOPE') return 'The selected examination is not valid for your authorized college. Please select a valid examination.'
  if (code === 'MARK_SAVE_UNCONFIRMED') return error?.message || 'The server has not confirmed the mark. Retry to check Marks Records.'
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status)
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to save marks for this examination.'
  if (status === 404) return 'The selected examination or record is no longer available. Reload the examination list and try again.'
  if (status >= 500) return 'The server could not save marks right now. Retry to check the saved record and continue.'
  return error?.backendMessage || error?.message || 'Marks entry failed.'
}
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

export async function createOrVerifyMark(api, payload, pending, authorization) {
  const examId = positiveId(payload?.examId)
  const studentId = positiveId(payload?.studentId)
  const subjectId = positiveId(payload?.subjectId)
  if (examId === null || studentId === null || subjectId === null) throw new Error('Select a valid examination, student and subject before saving marks.')
  const authorizedExam = resolveAuthorizedMarksExam(authorization?.exams, {
    ...authorization,
    examId,
    courseName: authorization?.courseName,
    branchName: authorization?.branchName,
    semesterName: authorization?.semesterName,
    sectionName: authorization?.sectionName,
    subjectName: authorization?.subjectName,
  })
  if (!authorizedExam) throw new Error('Select an examination from the current authorized college and academic year before saving marks.')
  payload = { ...payload, examId, studentId, subjectId }
  const key = JSON.stringify([authorization?.collegeId, authorization?.academicYearId, examId, studentId, subjectId])
  const previous = pending.get(key)
  if (previous) {
    let records
    try { records = await api.list({ examId, studentId, subjectId }) }
    catch (error) {
      if (error.status >= 400 && error.status < 500 && ![408, 409].includes(error.status)) pending.delete(key)
      throw error
    }
    if (!Array.isArray(records)) throw new Error('Marks Records returned an unexpected response. Retry before another write.')
    const found = records.find(row => Number(row.markId) > 0 &&
      Number(row.examId) === examId && Number(row.studentId) === studentId && Number(row.subjectId) === subjectId)
    if (!found) {
      const error = new Error('The previous submission is still unconfirmed. Retry to check Marks Records before another write.')
      error.status = 503
      error.code = 'MARK_SAVE_UNCONFIRMED'
      throw error
    }
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
    if (!(Number(saved?.markId) > 0)) {
      const error = new Error('The server did not confirm the mark identity. Retry to check Marks Records.')
      error.status = 503
      error.code = 'MARK_SAVE_UNCONFIRMED'
      throw error
    }
    pending.delete(key)
    return saved
  } catch (error) {
    if (error.status >= 400 && error.status < 500 && ![408, 409].includes(error.status)) pending.delete(key)
    throw error
  }
}

export async function importVerifiedMarks(api, file, scope, pending, authorization) {
  const authorizedExam = resolveAuthorizedMarksExam(authorization?.exams, {
    examId: scope?.examId,
    collegeId: authorization?.collegeId,
    academicYearId: authorization?.academicYearId,
  })
  if (!authorizedExam) throw new Error('Choose an examination returned for the current authorized college and academic year before importing marks.')
  const key = JSON.stringify([authorization.collegeId, authorization.academicYearId, scope.examId, scope.sectionId || ''])
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
