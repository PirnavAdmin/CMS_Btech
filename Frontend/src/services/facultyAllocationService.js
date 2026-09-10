import { sectionAllocationApi } from '../api/apiEndpoints'

export const facultyAllocationCapability = Object.freeze({
  sectionAdvisor: true,
  subjectAllocation: false,
  workload: false,
})

const unsupported = (operation) => {
  throw new Error(`${operation} is not available because the backend exposes no faculty subject-allocation or workload endpoint.`)
}

export default {
  listCandidates: (sectionId) => sectionAllocationApi.getTeacherCandidates(sectionId),
  assignAdvisor: (sectionId, facultyId) => sectionAllocationApi.assignTeacher(sectionId, facultyId),
  removeAdvisor: (sectionId) => sectionAllocationApi.removeTeacher(sectionId),
  listSubjectAllocations: () => unsupported('Subject allocation'),
  getWorkload: () => unsupported('Faculty workload'),
}
