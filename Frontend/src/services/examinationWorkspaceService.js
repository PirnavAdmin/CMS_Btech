import { call, list, readModuleResources, requireId, unwrap } from './scopedModulesService'

export const predefinedExamTypes = [
  'Mid Term Examination', 'Internal Assessment', 'Unit Test', 'Assignment Examination',
  'Practical Examination', 'Laboratory Examination', 'Model Examination',
  'Semester End Examination', 'Supplementary Examination', 'Revaluation Examination',
  'Improvement Examination', 'Others',
]

export async function ensureExamTypeId(collegeId, name) {
  const normalizedName = String(name || '').trim().replace(/\s+/g, ' ')
  if (!normalizedName) throw new Error('Enter a custom examination type.')
  const find = async () => (await list('exam-types', { collegeId })).find(type => String(type.name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase() === normalizedName.toLocaleLowerCase())
  const existing = await find()
  if (existing) {
    const id = requireId(existing.examTypeId ?? existing.id, 'exam type')
    if (existing.status === 'Inactive' || existing.statusValue === 0 || existing.statusValue === '0') {
      await call(`exam-types/${id}`, { method: 'PUT', body: { collegeId: requireId(collegeId, 'college'), code: existing.code, name: normalizedName, description: existing.description || null, defaultDurationMinutes: existing.defaultDurationMinutes || null, status: true } })
    }
    return id
  }
  const code = normalizedName.normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50).toUpperCase()
  try {
    const response = unwrap(await call('exam-types', { method: 'POST', body: { collegeId: requireId(collegeId, 'college'), name: normalizedName, code, status: true } }))
    const id = response?.examTypeId ?? response?.data?.examTypeId
    if (id) return requireId(id, 'exam type')
  } catch (error) {
    // A simultaneous create may win the unique-code/name constraint. Re-read
    // before surfacing the original API error so existing types never duplicate.
    const concurrent = await find().catch(() => null)
    if (concurrent) return requireId(concurrent.examTypeId ?? concurrent.id, 'exam type')
    throw error
  }
  const created = await find()
  if (!created) throw new Error('The exam type was not returned by the server after creation.')
  return requireId(created.examTypeId ?? created.id, 'exam type')
}

export async function ensurePredefinedExamTypes(collegeId) {
  const id = requireId(collegeId, 'college')
  let configured = await list('exam-types', { collegeId: id })
  const normalized = name => String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  for (const name of predefinedExamTypes.filter(value => value !== 'Others')) {
    const existing = configured.find(type => normalized(type.name) === normalized(name))
    if (existing) {
      if (existing.status === 'Inactive' || existing.statusValue === 0 || existing.statusValue === '0') {
        const typeId = requireId(existing.examTypeId ?? existing.id, 'exam type')
        await call(`exam-types/${typeId}`, { method: 'PUT', body: { collegeId: id, code: existing.code, name: existing.name, description: existing.description || null, defaultDurationMinutes: existing.defaultDurationMinutes || null, status: true } })
      }
      continue
    }
    const code = name.normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50).toUpperCase()
    try {
      await call('exam-types', { method: 'POST', body: { collegeId: id, code, name, status: true } })
    } catch (error) {
      configured = await list('exam-types', { collegeId: id })
      if (configured.some(type => normalized(type.name) === normalized(name))) continue
      throw error
    }
  }
  return list('exam-types', { collegeId: id })
}

export function scheduleConflict(body, schedules, currentId) {
  const start = String(body.startTime || '').slice(0, 5)
  const end = String(body.endTime || '').slice(0, 5)
  const other = schedules.find(row => String(row.scheduleId ?? row.examScheduleId) !== String(currentId) &&
    ![false, 0, 'Inactive', 'inactive'].includes(row.status) &&
    String(row.examDate).slice(0, 10) === body.examDate &&
    start < String(row.endTime).slice(0, 5) && String(row.startTime).slice(0, 5) < end &&
    ((body.classroomId && String(row.classroomId) === String(body.classroomId)) ||
      (body.sectionId && String(row.sectionId) === String(body.sectionId))))
  return other ? 'This time overlaps another schedule for the selected hall or section. Adjust the date, time or allocation.' : ''
}

export async function loadScheduleLookups(scope, exam, signal) {
  const query = {
    collegeId: requireId(scope.collegeId, 'college'),
    academicYearId: requireId(exam.academicYearId, 'examination academic year'),
    courseId: requireId(exam.courseId, 'examination course'),
    branchId: requireId(exam.branchId, 'examination branch'),
    semesterId: requireId(exam.semesterId, 'examination semester'),
  }
  const data = unwrap(await call('exams/lookups', { query, signal }))
  if (!Array.isArray(data?.subjects) || !Array.isArray(data?.sections)) throw new Error('The examination did not return valid subject and section mappings.')
  return data
}

export async function loadExaminationData(scope) {
  requireId(scope.collegeId,'college')
  const area = scope.area || 'overview'
  const query = {collegeId:scope.collegeId,...(scope.academicYearId ? {academicYearId:scope.academicYearId} : {})}
  const resources = area === 'types' ? {types:()=>list('exam-types',{collegeId:scope.collegeId})} : {
    examinations:()=>list('exams',query),
    ...(area === 'examinations' || area === 'create-examination' || area === 'overview' ? {types:()=>list('exam-types',{collegeId:scope.collegeId})} : {}),
    lookups:()=>call('exams/lookups',{query}).then(unwrap),
  }
  const result = await readModuleResources(resources)
  const data = {examinations:[],types:[],schedules:[],rules:[],halls:[],lookups:{},...result.values,resourceErrors:result.resourceErrors,loaded:Object.keys(resources).filter(key=>!result.resourceErrors[key])}
  data.examinations = data.examinations.filter(e=>String(e.collegeId)===String(scope.collegeId) && (!scope.academicYearId || String(e.academicYearId)===String(scope.academicYearId)))
  data.types = data.types.filter(t=>String(t.collegeId)===String(scope.collegeId))
  if (area === 'types' || area === 'examinations' || area === 'create-examination') return data
  if (data.resourceErrors.examinations) {
    data.resourceErrors[area] = data.resourceErrors.examinations
    return data
  }
  const nested = {}
  if (area === 'schedules' || area === 'halls' || area === 'overview') nested.schedules = async()=> (await Promise.all(data.examinations.map(async exam=>(await list(`exams/${exam.examId}/schedules`,{collegeId:scope.collegeId})).map(row=>({...row,scheduleId:row.scheduleId ?? row.examScheduleId,examId:exam.examId,examName:exam.examName,roomName:row.classroomName || row.roomName}))))).flat()
  if (area === 'rules' || area === 'overview') nested.rules = async()=> (await Promise.all(data.examinations.map(async exam=>(await list(`exams/${exam.examId}/rules`,{collegeId:scope.collegeId})).map(row=>({...row,ruleId:row.ruleId ?? row.examRuleId,examId:exam.examId,examName:exam.examName}))))).flat()
  const children = await readModuleResources(nested)
  Object.assign(data,children.values)
  Object.assign(data.resourceErrors,children.resourceErrors)
  data.loaded.push(...Object.keys(nested).filter(key=>!children.resourceErrors[key]))
  if (area === 'halls' || area === 'overview') {
    const halls = await readModuleResources({halls:()=>list('exam-schedules/hall-allocations',{collegeId:scope.collegeId})})
    const ids = new Set(data.schedules.map(row=>String(row.scheduleId)))
    data.halls = halls.values.halls.filter(row=>ids.has(String(row.examScheduleId))).map(row=>({...row,roomName:row.classroomName || row.roomName}))
    Object.assign(data.resourceErrors,halls.resourceErrors)
    if (!halls.resourceErrors.halls) data.loaded.push('halls')
  }
  return data
}
