import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LiveStudentDashboard, { LiveStudentModule } from './LiveStudentDashboard'
import { profileApi, timetableManagementApi } from '../../api/apiEndpoints'

vi.mock('../../api/apiEndpoints', () => ({
  API_BASE_URL: '',
  profileApi: { getProfile: vi.fn() },
  timetableManagementApi: { get: vi.fn() },
}))

afterEach(() => { cleanup(); vi.resetAllMocks() })

test('displays the authenticated student and their timetable without inventing missing data', async () => {
  profileApi.getProfile.mockResolvedValue({ studentId: 42, identifier: 'ST42', fullName: 'Asha', department: 'Computing', course: 'BTech', academicYear: '2026-2027', semester: 'Semester 1', section: 'A' })
  timetableManagementApi.get.mockResolvedValue([{ timetableEntryId: 7, subjectName: 'Mathematics', startTime: '09:00', endTime: '10:00' }])
  render(<MemoryRouter><LiveStudentDashboard /></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'Asha!' })).toBeTruthy()
  expect(await screen.findByText('Mathematics')).toBeTruthy()
  expect(timetableManagementApi.get).toHaveBeenCalledWith('/views/me', expect.objectContaining({ date: expect.any(String) }))
  expect(within(screen.getByLabelText('Academic summary')).getAllByText('Unavailable')).toHaveLength(4)
  expect(screen.getByRole('link', { name: /Today's timetable/ }).getAttribute('href')).toBe('/student-portal/timetable')
  expect(screen.getByRole('img', { name: 'Monthly attendance history unavailable' })).toBeTruthy()
  expect(screen.getByRole('link', { name: /View fee details/ }).getAttribute('href')).toBe('/student-portal/fees')
})

test('does not use a user ID as a student ID when the account is not linked', async () => {
  profileApi.getProfile.mockResolvedValue({ id: 99, fullName: 'Asha' })
  render(<MemoryRouter><LiveStudentDashboard /></MemoryRouter>)
  expect((await screen.findByRole('alert')).textContent).toContain('not linked')
  expect(timetableManagementApi.get).not.toHaveBeenCalled()
})

test('loads the student timetable module using the linked student ID', async () => {
  profileApi.getProfile.mockResolvedValue({ studentId: 42, fullName: 'Asha' })
  timetableManagementApi.get.mockResolvedValue([{ timetableEntryId: 7, dayOfWeek: 'Monday', subjectName: 'Mathematics', startTime: '09:00', endTime: '10:00' }])
  render(<MemoryRouter><LiveStudentModule screen="timetable" title="My Timetable" /></MemoryRouter>)
  expect(await screen.findByText('Mathematics')).toBeTruthy()
  expect(timetableManagementApi.get).toHaveBeenCalledWith('/views/me')
  fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'tuesday' } })
  expect(screen.queryByText('Mathematics')).toBeNull()
  expect(screen.getByText(/No published timetable entries/)).toBeTruthy()
})

test('displays academic context from the authenticated profile without inventing subjects', async () => {
  profileApi.getProfile.mockResolvedValue({ studentId: 42, fullName: 'Asha', course: 'BTech', branch: 'Computing', academicYear: '2026-2027' })
  render(<MemoryRouter><LiveStudentModule screen="subjects" title="My Academics" /></MemoryRouter>)
  expect(await screen.findByText('BTech')).toBeTruthy()
  expect(screen.getByText('Computing')).toBeTruthy()
  expect(screen.getByText(/assigned subject list is not available/)).toBeTruthy()
  expect(timetableManagementApi.get).not.toHaveBeenCalled()
})
