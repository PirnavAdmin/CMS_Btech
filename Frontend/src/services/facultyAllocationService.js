import { facultySubjectAllocationApi } from '../api/apiEndpoints'
import { facultyService } from './facultyService'

export const facultyAllocationCapability = Object.freeze({ sectionAdvisor: false, subjectAllocation: true, workload: true })

export default {
  listSubjectAllocations: facultySubjectAllocationApi.getAll,
  createSubjectAllocation: facultySubjectAllocationApi.create,
  updateSubjectAllocation: facultySubjectAllocationApi.update,
  removeSubjectAllocation: facultySubjectAllocationApi.remove,
  getWorkload: facultyService.getWorkload,
}
