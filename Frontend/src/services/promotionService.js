import { studentPromotionApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'

const PROMOTION_HISTORY_KEY = 'pirnav-promotion-history-v1'

class PromotionService {
  getLocalHistory() {
    try {
      const raw = localStorage.getItem(PROMOTION_HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  saveLocalHistory(entry) {
    try {
      const existing = this.getLocalHistory()
      const updated = [entry, ...existing.filter((h) => (h.promotionId || h.id) !== (entry.promotionId || entry.id))]
      localStorage.setItem(PROMOTION_HISTORY_KEY, JSON.stringify(updated))
    } catch { /* storage fallback */ }
  }

  async getDashboard() {
    try {
      return await studentPromotionApi.getDashboard()
    } catch {
      return null
    }
  }

  async getHistory(params = {}) {
    try {
      const apiHist = await studentPromotionApi.getHistory(params)
      const localHist = this.getLocalHistory()
      const map = new Map()
      for (const item of Array.isArray(apiHist) ? apiHist : []) {
        const key = item.promotionId || item.id || `${item.studentId}_${item.toSemester}`
        map.set(key, item)
      }
      for (const item of localHist) {
        const key = item.promotionId || item.id || `${item.studentId}_${item.toSemester}`
        if (!map.has(key)) {
          map.set(key, item)
        }
      }
      return Array.from(map.values())
    } catch {
      return this.getLocalHistory()
    }
  }

  async promoteStudent({
    studentId,
    studentName,
    registrationNumber,
    rollNumber,
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
    branchId,
    skipBackend = false,
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
      branchId: Number(branchId) || branchId,
      academicYearId: Number(isDegreeCompletion ? currentAcademicYearId : (targetAcademicYearId || currentAcademicYearId)),
      currentSemester: currentSemNum,
      nextSemester: isDegreeCompletion ? currentSemNum : currentSemNum + 1,
      eligibilityStatus: 'ELIGIBLE',
      remarks,
    }

    let backendResult = null
    if (!skipBackend) {
      try {
        backendResult = await studentPromotionApi.promote(payload)
      } catch (err) {
        console.warn('Backend promote API unavailable, continuing locally:', err)
      }
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
      promotionId: backendResult?.promotionId || backendResult?.id || `PROM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId,
      studentName,
      registrationNumber: registrationNumber || rollNumber,
      rollNumber: rollNumber || registrationNumber,
      fromAcademicYear: currentAcademicYear,
      toAcademicYear: isDegreeCompletion ? currentAcademicYear : targetAcademicYear,
      fromSemester: currentSemester,
      toSemester: targetSemName,
      fromSection: existingProfile?.academic?.section || '',
      toSection: isDegreeCompletion ? 'N/A' : (targetSection || 'Unallocated'),
      promotionDate,
      status: isDegreeCompletion ? 'Graduated' : 'Promoted',
      remarks,
      ...backendResult,
    }

    this.saveLocalHistory(historyEntry)

    eventBus.emit(ERP_EVENTS.PROMOTION_EXECUTED, historyEntry)
    eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { studentId })

    return historyEntry
  }

  async promoteBulk(students, promotionScope) {
    if (!students || !students.length) {
      throw new Error('Select at least one valid student for promotion.')
    }

    const currentSemester = parseInt(String(promotionScope.currentSemester || promotionScope.currentSemesterId).replace(/\D/g, ''), 10) || 1
    const isDegreeCompletion = currentSemester >= 8

    const studentIds = students
      .map((student) => student.studentId ?? student.id ?? student.rollNumber ?? student.registrationNumber)
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')

    if (!studentIds.length) {
      throw new Error('Select at least one valid student for promotion.')
    }

    const branchId = promotionScope.branchId
    const currentAcademicYearId = promotionScope.currentAcademicYearId
    const targetAcademicYearId = promotionScope.targetAcademicYearId || currentAcademicYearId

    // Attempt backend atomic bulk promotion if endpoint is available
    try {
      const numericIds = studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      const numericBranchId = Number(branchId)
      const numericYearId = Number(isDegreeCompletion ? currentAcademicYearId : targetAcademicYearId)

      if (numericIds.length && Number.isInteger(numericBranchId) && Number.isInteger(numericYearId)) {
        await studentPromotionApi.promoteBulkAtomic({
          studentIds: numericIds,
          branchId: numericBranchId,
          academicYearId: numericYearId,
          currentSemester,
          nextSemester: isDegreeCompletion ? currentSemester : currentSemester + 1,
          eligibilityStatus: 'ELIGIBLE',
          remarks: promotionScope.remarks || 'Bulk batch promotion',
        })
      }
    } catch (err) {
      console.warn('Backend atomic bulk promotion unavailable, continuing with individual updates:', err)
    }

    const results = []
    for (const student of students) {
      const res = await this.promoteStudent({
        studentId: student.studentId || student.id,
        studentName: student.studentName || student.fullName || student.name || student.personal?.fullName,
        registrationNumber: student.registrationNumber || student.application?.registrationNumber || student.rollNumber,
        rollNumber: student.rollNumber || student.academic?.rollNumber || student.registrationNumber,
        branchId: promotionScope.branchId,
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
        skipBackend: false,
      })
      results.push(res)
    }
    return results
  }
}

export const promotionService = new PromotionService()
export default promotionService
