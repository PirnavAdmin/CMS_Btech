import { afterEach, expect, it, vi } from 'vitest'
import { academicYearApi } from '../../api/apiEndpoints'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })

it('does not promote an inactive API year to active because its dates or isCurrent flag match', async () => {
  localStorage.setItem('btech-user-role', 'admin')
  localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId: '1' }))
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: [
    { academicYearId: 8, collegeId: 1, academicYearName: '2026-2027', status: 0, isCurrent: true, startDate: '2020-01-01', endDate: '2099-12-31' },
  ] }) })))
  const years = await academicYearApi.getAll()
  expect(years[0].status).toBe('Inactive')
  expect(years[0].isCurrent).toBe(false)
  expect(years[0].backendStatus).toBe(0)
})
