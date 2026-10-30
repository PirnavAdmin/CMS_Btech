import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createSemester, getSemesters } from '../../auth/collegeApi'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('btech-user-role', 'admin')
  localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId: '12' }))
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => ({ success: true, data: [] }),
  })))
})
afterEach(() => vi.unstubAllGlobals())

it('fetches saved semesters for the selected college without reusing a cached response', async () => {
  await getSemesters()
  const [url, options] = fetch.mock.calls[0]
  expect(new URL(url, 'http://localhost').pathname).toBe('/api/semester')
  expect(new URL(url, 'http://localhost').searchParams.get('collegeId')).toBe('12')
  expect(options.cache).toBe('no-store')
})

it('saves and fetches semesters with the same college context', async () => {
  await createSemester({ courseId: 10, branchId: 7, academicYearId: 1, semesterNumber: 1 })
  const [url, options] = fetch.mock.calls[0]
  expect(new URL(url, 'http://localhost').searchParams.get('collegeId')).toBe('12')
  expect(JSON.parse(options.body).collegeId).toBe('12')
})
