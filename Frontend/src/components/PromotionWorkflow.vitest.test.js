import { expect, test, vi } from 'vitest'
import promotionService from '../services/promotionService'
import { studentPromotionApi } from '../api/apiEndpoints'

vi.mock('../api/apiEndpoints', () => ({
  studentPromotionApi: { updateEligibilityStatus: vi.fn(), promoteBulkAtomic: vi.fn() },
}))
vi.mock('../services/eventBus', () => ({ default: { emit: vi.fn() }, ERP_EVENTS: { PROMOTION_EXECUTED: 'promotion' } }))

const scope = { branchId: 3, currentAcademicYearId: 4, targetAcademicYearId: 5, targetSemesterId: 17, currentSemester: 'Semester 4' }

test('promotion submits the saved target semester and academic year', async () => {
  const result = [{ studentId: 11 }]
  studentPromotionApi.promoteBulkAtomic.mockResolvedValueOnce(result)
  await expect(promotionService.promoteBulk([{ studentId: 11, eligibilityStatus: 'Eligible' }], scope)).resolves.toBe(result)
  expect(studentPromotionApi.promoteBulkAtomic).toHaveBeenCalledWith(expect.objectContaining({
    studentIds: [11], targetSemesterId: 17, targetAcademicYearId: 5, nextSemester: 5, degreeConferred: false,
  }))
})

test('an eligibility update failure remains an API failure', async () => {
  studentPromotionApi.updateEligibilityStatus.mockRejectedValueOnce(new Error('Eligibility update denied'))
  await expect(promotionService.setEligibilityStatus(11, 'Eligible')).rejects.toThrow('Eligibility update denied')
})

test('completion uses the configured final semester rather than assuming semester eight', async () => {
  studentPromotionApi.promoteBulkAtomic.mockResolvedValueOnce([{ studentId: 11 }])
  await promotionService.promoteBulk([{ studentId: 11, eligibilityStatus: 'Eligible' }], {
    ...scope, currentSemester: 'Semester 6', degreeConferred: true,
  })
  expect(studentPromotionApi.promoteBulkAtomic).toHaveBeenLastCalledWith(expect.objectContaining({
    currentSemester: 6, nextSemester: 6, degreeConferred: true,
  }))
})
