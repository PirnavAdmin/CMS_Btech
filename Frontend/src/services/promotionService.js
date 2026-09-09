import { studentPromotionApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'

const PROMOTION_HISTORY_KEY = 'pirnav-promotion-history-v1'

const readPromotionHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(PROMOTION_HISTORY_KEY)) || []
  } catch {
    return []
  }
}

const savePromotionRecord = (record) => {
  try {
    const list = readPromotionHistory()
    const updated = [record, ...list]
    localStorage.setItem(PROMOTION_HISTORY_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Failed to save local promotion history:', err)
  }
}

class PromotionService {
  async getDashboard() {
    try {
      return await studentPromotionApi.getDashboard()
    } catch {
      return null
    }
  }

  async getHistory(params = {}) {
    let apiList = []
    try {
      apiList = await studentPromotionApi.getHistory(params)
    } catch {
      apiList = []
    }
    const localList = readPromotionHistory()
    const combined = [...(Array.isArray(apiList) ? apiList : []), ...localList]
    
    // Deduplicate by promotionId or studentId + timestamp
    const seen = new Set()
    return combined.filter((item) => {
      const key = item.promotionId || `${item.studentId}_${item.promotionDate || item.date || item.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  async promoteStudent({
    studentId,
    studentName,
    registrationNumber,
    currentAcademicYearId,
    currentAcademicYear,
    currentSemesterId,
    currentSemester,
    targetAcademicYearId,
    targetAcademicYear,
    targetSemesterId,
    targetSemester,
    targetSectionId = null,
    targetSection = null,
    promotionDate = new Date().toISOString().slice(0, 10),
    remarks = 'Promoted to next academic term',
  }) {
    const currentSemNum = parseInt(String(currentSemester || currentSemesterId).replace(/\D/g, ''), 10) || 1
    const isDegreeCompletion = currentSemNum >= 8

    let targetSemName = targetSemester || `Semester ${currentSemNum + 1}`
    let nextStatus = 'Active'

    if (isDegreeCompletion) {
      targetSemName = 'Graduated (Degree Conferred)'
      nextStatus = 'Graduated'
    }

    const payload = {
      studentId: Number(studentId) || studentId,
      currentAcademicYearId,
      currentSemesterId,
      targetAcademicYearId: isDegreeCompletion ? currentAcademicYearId : targetAcademicYearId,
      targetSemesterId: isDegreeCompletion ? currentSemesterId : targetSemesterId,
      targetSectionId: isDegreeCompletion ? null : targetSectionId,
      promotionDate,
      remarks,
      isGraduated: isDegreeCompletion,
    }

    let backendResult = null
    try {
      backendResult = await studentPromotionApi.promote(payload)
    } catch (err) {
      console.warn('Backend promote endpoint fallback:', err)
    }

    // Update the student profile in memory / storage
    let existingProfile = null
    try {
      existingProfile = await studentService.getProfileById(studentId)
      if (existingProfile) {
        const updatedAcademic = {
          ...(existingProfile.academic || {}),
          academicYearId: isDegreeCompletion ? existingProfile.academic?.academicYearId : (targetAcademicYearId || existingProfile.academic?.academicYearId),
          academicYear: isDegreeCompletion ? existingProfile.academic?.academicYear : (targetAcademicYear || existingProfile.academic?.academicYear),
          semesterId: isDegreeCompletion ? existingProfile.academic?.semesterId : (targetSemesterId || currentSemNum + 1),
          semester: isDegreeCompletion ? existingProfile.academic?.semester : targetSemName,
          sectionId: isDegreeCompletion ? null : (targetSectionId || null),
          section: isDegreeCompletion ? null : (targetSection || ''),
        }

        await studentService.updateProfile(studentId, {
          ...existingProfile,
          status: nextStatus,
          academic: updatedAcademic,
        })
      }
    } catch (err) {
      console.warn('Could not update student profile during promotion:', err)
    }

    const historyEntry = {
      promotionId: `PROM-${Date.now()}-${studentId}`,
      studentId,
      studentName,
      registrationNumber,
      fromAcademicYear: currentAcademicYear,
      toAcademicYear: isDegreeCompletion ? currentAcademicYear : targetAcademicYear,
      fromSemester: currentSemester,
      toSemester: targetSemName,
      fromSection: existingProfile?.academic?.section || '',
      toSection: isDegreeCompletion ? 'N/A' : (targetSection || 'Unallocated'),
      promotionDate,
      status: isDegreeCompletion ? 'Graduated' : 'Promoted',
      remarks,
      ...(backendResult || {}),
    }

    savePromotionRecord(historyEntry)

    eventBus.emit(ERP_EVENTS.PROMOTION_EXECUTED, historyEntry)
    eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { studentId })

    return historyEntry
  }

  async promoteBulk(students, promotionScope) {
    const results = []
    for (const student of students) {
      const res = await this.promoteStudent({
        studentId: student.studentId || student.id,
        studentName: student.name || student.studentName || student.personal?.fullName,
        registrationNumber: student.registrationNumber || student.rollNumber,
        currentAcademicYearId: promotionScope.currentAcademicYearId,
        currentAcademicYear: promotionScope.currentAcademicYear,
        currentSemesterId: promotionScope.currentSemesterId,
        currentSemester: promotionScope.currentSemester,
        targetAcademicYearId: promotionScope.targetAcademicYearId,
        targetAcademicYear: promotionScope.targetAcademicYear,
        targetSemesterId: promotionScope.targetSemesterId,
        targetSemester: promotionScope.targetSemester,
        targetSectionId: promotionScope.targetSectionId,
        targetSection: promotionScope.targetSection,
        promotionDate: promotionScope.promotionDate || new Date().toISOString().slice(0, 10),
        remarks: promotionScope.remarks || 'Bulk batch promotion',
      })
      results.push(res)
    }
    return results
  }
}

export const promotionService = new PromotionService()
export default promotionService
