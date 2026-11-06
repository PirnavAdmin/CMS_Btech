import { studentAdmissionApi, studentFeeApi } from '../api/apiEndpoints'
import { normalizeCanonicalStudent } from '../utils/studentCanonicalModel'
import { studentIntegrationFees } from '../utils/studentIntegrationFees'

const comparable = value => String(value ?? '').trim().toLowerCase()
const assignedPlanId = structure => structure?.feeStructureId ?? structure?.academicFeePlan?.feeStructureId

export function matchesPublishedFeeScope(student, plan) {
  if (plan?.status !== 'Published') return false
  return ['collegeId', 'academicYearId', 'courseId', 'branchId', 'semesterId', 'batch', 'quota', 'studentCategory', 'admissionType']
    .every(field => !plan[field] || comparable(student[field]) === comparable(plan[field]))
}

// The existing admission update assigns the published academic-plan snapshot.
// Student Integration confirms the resulting assignment and authoritative totals.
export async function assignPublishedStudentFees(plan, students, progress = new Map(), { replacementReason = '' } = {}) {
  if (!/^\d+$/.test(String(plan?.id)) || plan.status !== "Published" || !students.length) throw new Error('Select a backend-published plan and eligible students.')
  const reason = replacementReason.trim()
  if (reason.length > 500) throw new Error('The replacement reason must be at most 500 characters.')
  let admissions
  const verified = []
  for (const student of students) {
    const key = `${plan.id}:${student.id}`
    let admissionId = student.admissionId || progress.get(key)
    if (!admissionId) {
      admissions ||= await studentAdmissionApi.getAll()
      const admission = admissions.find(row => String(row.studentId ?? row.student?.studentId ?? row.student?.id) === String(student.id))
      admissionId = admission?.admissionId ?? admission?.id
    }
    if (!admissionId) throw new Error(`No admission identity is available for ${student.name || student.id}. Saved assignments are retained.`)
    if (!progress.has(key)) {
      const saved = await studentAdmissionApi.getById(admissionId)
      const form = normalizeCanonicalStudent(saved)
      const [summary, structure] = await Promise.all([studentFeeApi.getSummary(admissionId), studentFeeApi.getStructure(admissionId)])
      if (String(form.studentId) !== String(student.id) || !matchesPublishedFeeScope({ ...form.academic, collegeId: form.admission.collegeId, batch: form.admission.batch, quota: form.academic.quotaOther || form.academic.quota }, plan)) {
        throw new Error("The admission identity or academic scope does not match the published fee plan.")
      }
      const existing = assignedPlanId(structure)
      if (String(existing) === String(plan.id)) {
        verified.push({ studentId: student.id, admissionId, fees: studentIntegrationFees(summary, structure) })
        continue
      }
      const replacing = Number(existing) > 0
      if (replacing && !['DRAFT', 'REGISTERED'].includes(form.status)) {
        throw new Error('An existing fee plan can only be replaced for a Draft or Registered admission.')
      }
      if (replacing && !reason) throw new Error('This student already has a different fee plan. Confirm replacement and enter a reason to proceed.')
      form.feeStructureId = String(plan.id)
      form.fees = { ...studentIntegrationFees(summary, structure), structureId:String(plan.id), feeStructureId:String(plan.id), paymentPlan:plan.plan || structure.paymentPlan || summary.paymentPlan || '' }
      progress.set(key, admissionId)
      try {
        await studentAdmissionApi.update(admissionId, form, {
          preserveAcademicMapping: true,
          ...(replacing ? { feePlanChangeReason: reason } : {}),
        })
      } catch (error) {
        if (error.status >= 400 && error.status < 500 && error.status !== 408) progress.delete(key)
        throw error
      }
    }
    const [summary, structure] = await Promise.all([studentFeeApi.getSummary(admissionId), studentFeeApi.getStructure(admissionId)])
    if (String(assignedPlanId(structure)) !== String(plan.id)) throw new Error(`The Student Integration API has not confirmed the plan for ${student.name || student.id}. Saved assignments are retained; retry verification.`)
    verified.push({ studentId:student.id, admissionId, fees:studentIntegrationFees(summary, structure) })
  }
  return verified
}
