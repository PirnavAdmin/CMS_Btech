import { call, requireId, unwrap } from './scopedModulesService'
// These routes and DTOs are implemented by AccessGovernanceController.
export const accessGovernance = {
  bootstrap: async collegeId => unwrap(await call('access-governance/bootstrap', {query:{collegeId:requireId(collegeId,'college')}})),
  saveDesignation: async (value,collegeId) => {
    const id=Number(value.id), body={collegeId:requireId(collegeId,'college'),title:value.title,code:value.code,category:value.category,level:value.level,department:value.department || null,defaultRoleId:value.defaultRole ? requireId(value.defaultRole,'default role') : null,status:value.status}
    return unwrap(await call(`access-governance/designations${Number.isSafeInteger(id)&&id>0?'/'+id:''}`,{method:Number.isSafeInteger(id)&&id>0?'PUT':'POST',body}))
  },
  deleteDesignation: (id,collegeId) => call(`access-governance/designations/${requireId(id,'designation')}`,{method:'DELETE',query:{collegeId:requireId(collegeId,'college')}}),
  assignStaff: async (employeeProfileId,value,collegeId) => unwrap(await call(`access-governance/staff-assignments/${requireId(employeeProfileId,'employee profile')}`,{method:'PUT',query:{collegeId:requireId(collegeId,'college')},body:{roleId:requireId(value.roleId,'role'),designationId:requireId(value.designationId,'designation'),scope:value.scope}})),
}
