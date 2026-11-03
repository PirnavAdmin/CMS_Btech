import { call, list, readModuleResources, requireId, unwrap } from './scopedModulesService'

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
  if (area === 'halls') {
    const halls = await readModuleResources({halls:()=>list('exam-schedules/hall-allocations',{collegeId:scope.collegeId})})
    const ids = new Set(data.schedules.map(row=>String(row.scheduleId)))
    data.halls = halls.values.halls.filter(row=>ids.has(String(row.examScheduleId))).map(row=>({...row,roomName:row.classroomName || row.roomName}))
    Object.assign(data.resourceErrors,halls.resourceErrors)
    if (!halls.resourceErrors.halls) data.loaded.push('halls')
  }
  return data
}
