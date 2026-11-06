import { beforeEach, expect, test, vi } from 'vitest'
import service from '../services/facultyService'
const api = vi.hoisted(() => ({
  facultyApi: { getAll: vi.fn(), update: vi.fn(), uploadProfilePhoto: vi.fn(), getStatusHistory: vi.fn() },
  facultyProfileApi: { create: vi.fn(), update: vi.fn() },
  facultySubjectAllocationApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn(), getAll: vi.fn() },
  facultyAttendanceApi: { getAll: vi.fn(), getDaily: vi.fn(), create: vi.fn(), update: vi.fn(), bulk: vi.fn(), checkIn: vi.fn(), checkOut: vi.fn() },
}))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(), ...api }))
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); Object.values(api).forEach(group => Object.values(group).forEach(method => method.mockRejectedValue(new Error('API unavailable')))) })
const allocation = { facultyId: 1, academicYearId: 2, courseId: 3, branchId: 4, semesterId: 5, subjectId: 6, assignmentType: 'Subject Faculty' }
for (const [name, call] of [
  ['directory', () => service.list()], ['employee update', () => service.update(1, { fullName: 'Faculty', departmentId:2, collegeId:7 })],
  ['photo upload', () => service.uploadProfilePhoto(1, new File(['photo'], 'photo.png'))],
  ['profile creation', () => service.createProfile(1, {})], ['profile update', () => service.updateProfile(1, {})],
  ['allocation creation', () => service.createSubjectAllocation(allocation)], ['allocation update', () => service.updateSubjectAllocation(1, allocation)], ['allocation removal', () => service.deleteSubjectAllocation(1)],
  ['attendance read', () => service.getAttendance({})], ['daily attendance', () => service.getDailyAttendance({})],
  ['attendance creation', () => service.createAttendance({ facultyId: 1 })], ['attendance update', () => service.updateAttendance(1,{})],
  ['bulk attendance', () => service.bulkAttendance({ facultyIds:[1] })], ['check in', () => service.checkIn(1,{})], ['check out', () => service.checkOut(1,{})],
]) test(`${name} rejects API failure instead of returning a local success`, async () => {
  await expect(call()).rejects.toThrow('API unavailable')
  expect(localStorage.length).toBe(0)
})
test('successful empty attendance does not import cached attendance records', async () => {
  localStorage.setItem('pirnav-faculty-local-attendance-v1', JSON.stringify([{ facultyId: 1, status:'Present' }]))
  api.facultyAttendanceApi.getAll.mockResolvedValue([])
  expect(await service.getAttendance({})).toEqual([])
})
