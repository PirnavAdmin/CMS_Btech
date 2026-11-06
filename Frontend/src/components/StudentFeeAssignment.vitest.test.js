import { beforeEach, expect, test, vi } from 'vitest'
import { assignPublishedStudentFees } from '../services/studentFeeAssignmentWorkflow'
import { studentAdmissionApi, studentFeeApi } from '../api/apiEndpoints'
vi.mock('../api/apiEndpoints',()=>({studentAdmissionApi:{getAll:vi.fn(),getById:vi.fn(),update:vi.fn()},studentFeeApi:{getSummary:vi.fn(),getStructure:vi.fn()}}))
beforeEach(()=>{
  vi.resetAllMocks()
  studentAdmissionApi.getAll.mockResolvedValue([{admissionId:2,studentId:1}])
  studentAdmissionApi.getById.mockResolvedValue({admissionId:2,studentId:1,firstName:'Student',lastName:'One',collegeId:7,academicYearId:3,courseId:4,branchId:5,semesterId:6,status:'APPROVED'})
  studentAdmissionApi.update.mockResolvedValue({admissionId:2,studentId:1})
  studentFeeApi.getSummary.mockResolvedValue({firstYearTotal:100,amountPaid:10,balanceAmount:90})
  studentFeeApi.getStructure.mockResolvedValueOnce({}).mockResolvedValue({feeStructureId:9,academicContextValid:true})
})
const students=[{id:1,name:'Student One'}],plan={id:9,status:'Published',plan:'Full Payment'}
test('assignment uses the existing admission workflow and confirms Student Integration balances',async()=>{
  const result=await assignPublishedStudentFees(plan,students)
  expect(studentAdmissionApi.update).toHaveBeenCalledWith(2,expect.objectContaining({fees:expect.objectContaining({structureId:'9',feeStructureId:'9'})}),{preserveAcademicMapping:true})
  expect(result[0]).toMatchObject({studentId:1,admissionId:2,fees:{totalFee:100,paidAmount:10,balanceAmount:90}})
})
test('verification retry does not repeat an already saved admission update',async()=>{
  const progress=new Map()
  studentFeeApi.getStructure.mockReset().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Verification offline')).mockResolvedValue({feeStructureId:9})
  await expect(assignPublishedStudentFees(plan,students,progress)).rejects.toThrow('Verification offline')
  await assignPublishedStudentFees(plan,students,progress)
  expect(studentAdmissionApi.update).toHaveBeenCalledOnce()
})
test('backend rejection cannot return a successful assignment',async()=>{
  studentAdmissionApi.update.mockRejectedValue(new Error('Plan does not match semester'))
  await expect(assignPublishedStudentFees(plan,students)).rejects.toThrow('Plan does not match semester')
})
test('a browser-only fee plan ID cannot be assigned as a real backend plan',async()=>{
  await expect(assignPublishedStudentFees({id:'LOCAL-PLAN'},students)).rejects.toThrow('backend-published plan')
  expect(studentAdmissionApi.getAll).not.toHaveBeenCalled()
})

test('an existing assignment is verified without another write', async () => {
  studentFeeApi.getStructure.mockReset().mockResolvedValue({ feeStructureId: 9 })
  await expect(assignPublishedStudentFees(plan, students)).resolves.toHaveLength(1)
  expect(studentAdmissionApi.update).not.toHaveBeenCalled()
})

test.each(['Draft', 'Registered'])('replaces a %s plan only with a reason and confirms the new identity', async status => {
  studentAdmissionApi.getById.mockResolvedValue({ admissionId: 2, studentId: 1, status, feeStructureId: 4 })
  studentFeeApi.getStructure.mockReset().mockResolvedValue({ feeStructureId: 4 })
  await expect(assignPublishedStudentFees(plan, students)).rejects.toThrow('enter a reason')
  expect(studentAdmissionApi.update).not.toHaveBeenCalled()
  studentFeeApi.getStructure.mockReset().mockResolvedValueOnce({ feeStructureId: 4 }).mockResolvedValue({ feeStructureId: 9 })
  await expect(assignPublishedStudentFees(plan, students, new Map(), { replacementReason: '  Corrected selection  ' })).resolves.toHaveLength(1)
  expect(studentAdmissionApi.update).toHaveBeenCalledWith(2, expect.objectContaining({ feeStructureId: '9' }), {
    preserveAcademicMapping: true, feePlanChangeReason: 'Corrected selection',
  })
})

test('a reason cannot authorize replacing an approved admission plan', async () => {
  studentFeeApi.getStructure.mockReset().mockResolvedValue({ feeStructureId: 4 })
  await expect(assignPublishedStudentFees(plan, students, new Map(), { replacementReason: 'Corrected selection' })).rejects.toThrow('Draft or Registered')
  expect(studentAdmissionApi.update).not.toHaveBeenCalled()
})
