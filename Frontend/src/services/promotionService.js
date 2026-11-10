import { collegeStorageKey } from '../utils/collegeScope.js'
import { studentPromotionApi } from '../api/apiEndpoints'
import eventBus, { ERP_EVENTS } from './eventBus'

const PROMOTION_ELIGIBILITY_KEY = 'pirnav-promotion-eligibility-v1'

const eligibilityKey = (studentId) => String(studentId ?? '').trim()
const explicitlyIneligible = (student) => ['ineligible', 'not eligible'].includes(
  String(student?.eligibilityStatus ?? student?.status ?? '').trim().toLowerCase()
)
const semesterNumber = (value) => parseInt(String(value ?? '').replace(/\D/g, ''), 10) || 0

class PromotionService {
  getEligibilityOverrides() {
    try {
      const saved = JSON.parse(localStorage.getItem(collegeStorageKey(PROMOTION_ELIGIBILITY_KEY)) || '{}')
      return saved && typeof saved === 'object' ? saved : {}
    } catch {
      return {}
    }
  }

  getEligibilityOverride(studentId) {
    return this.getEligibilityOverrides()[eligibilityKey(studentId)] || null
  }

  async setEligibilityStatus(studentId, eligibilityStatus) {
    const id = eligibilityKey(studentId)
    if (!id) throw new Error('A valid student is required to update promotion eligibility.')
    const normalized = String(eligibilityStatus || '').trim().toUpperCase()
    if (!['ELIGIBLE', 'INELIGIBLE'].includes(normalized)) throw new Error('Invalid promotion eligibility status.')

    // Persist through the API when it is available, while retaining the local
    // record for offline/demo mode so a reload cannot silently re-qualify them.
    try {
      await studentPromotionApi.updateEligibilityStatus(id, normalized)
    } catch (err) {
      console.warn('Eligibility status API unavailable; saving local override:', err)
    }

    try {
      localStorage.setItem(collegeStorageKey(PROMOTION_ELIGIBILITY_KEY), JSON.stringify({
        ...this.getEligibilityOverrides(),
        [id]: normalized,
      }))
    } catch { /* local persistence is a best-effort fallback */ }
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
    return studentPromotionApi.getHistory(params)
  }

  async promoteBulk(students, promotionScope) {
    if (!students || !students.length) {
      throw new Error('Select at least one valid student for promotion.')
    }

    const ineligibleStudents = students.filter((student) => {
      const studentId = student.studentId ?? student.id
      return explicitlyIneligible(student) || this.getEligibilityOverride(studentId) === 'INELIGIBLE'
    })
    if (ineligibleStudents.length) {
      throw new Error('Ineligible students cannot be promoted. Remove them from the promotion selection first.')
    }

    const currentSemester = semesterNumber(promotionScope.currentSemester)
    const degreeConferred = currentSemester === 8
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
