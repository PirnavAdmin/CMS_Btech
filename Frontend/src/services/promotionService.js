import { studentPromotionApi } from '../api/apiEndpoints'
import eventBus, { ERP_EVENTS } from './eventBus'


const eligibilityKey = (studentId) => String(studentId ?? '').trim()
const isEligible = (student) =>
  String(student?.eligibilityStatus ?? student?.status ?? '').trim().toUpperCase() === 'ELIGIBLE'
const semesterNumber = (value) => parseInt(String(value ?? '').replace(/\D/g, ''), 10) || 0

class PromotionService {
  async setEligibilityStatus(studentId, eligibilityStatus) {
    const id = eligibilityKey(studentId)
    if (!id) throw new Error('A valid student is required to update promotion eligibility.')
    const normalized = String(eligibilityStatus || '').trim().toUpperCase()
    if (!['ELIGIBLE', 'INELIGIBLE'].includes(normalized)) throw new Error('Invalid promotion eligibility status.')

    await studentPromotionApi.updateEligibilityStatus(id, normalized)
    return normalized
  }

  async getDashboard() {
    try {
      return await studentPromotionApi.getDashboard()
    } catch {
      return null
    }
  }

  async getHistory(params = {}) {
    const pageSize = 100
    const history = []
    for (let pageNumber = 1; ; pageNumber += 1) {
      const rows = await studentPromotionApi.getHistory({ ...params, pageNumber, pageSize })
      history.push(...rows.map(row => ({
        ...row,
        status: String(row.promotionStatus || row.status).toUpperCase() === 'APPROVED'
          ? semesterNumber(row.fromSemester) > 0 && semesterNumber(row.fromSemester) === semesterNumber(row.toSemester) ? 'Completed' : 'Promoted'
          : row.promotionStatus || row.status,
      })))
      if (rows.length < pageSize) return history
    }
  }

  async promoteBulk(students, promotionScope) {
    if (!students || !students.length) {
      throw new Error('Select at least one valid student for promotion.')
    }

    if (!students.every(isEligible)) {
      throw new Error('Every selected student must be marked eligible before promotion.')
    }

    const currentSemester = semesterNumber(promotionScope.currentSemester)
    const degreeConferred = promotionScope.degreeConferred === true
    const studentIds = [...new Set(students.map(student => Number(student.studentId ?? student.id)))]
    const branchId = Number(promotionScope.branchId)
    const academicYearId = Number(promotionScope.currentAcademicYearId)
    const targetAcademicYearId = Number(promotionScope.targetAcademicYearId || academicYearId)
    const targetSemesterId = Number(promotionScope.targetSemesterId)
    const validId = value => Number.isSafeInteger(value) && value > 0
    if (![...studentIds, branchId, academicYearId, targetAcademicYearId, targetSemesterId, currentSemester].every(validId)) {
      throw new Error('Select saved students and a saved target semester before promoting.')
    }

    const result = await studentPromotionApi.promoteBulkAtomic({
      studentIds, branchId, academicYearId, targetAcademicYearId, targetSemesterId,
      targetSectionId: Number(promotionScope.targetSectionId) || null,
      currentSemester, nextSemester: degreeConferred ? currentSemester : currentSemester + 1,
      degreeConferred, eligibilityStatus: 'ELIGIBLE', remarks: promotionScope.remarks,
    })
    eventBus.emit(ERP_EVENTS.PROMOTION_EXECUTED, { studentIds })
    return result
  }
}

export const promotionService = new PromotionService()
export default promotionService
