import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '../pages/Pages.jsx'
import { studentAdmissionApi } from '../api/apiEndpoints'

vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../auth/auth', async original => ({ ...await original(), getUserRole: () => 'admin' }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ scopeRecords: rows => rows, selectedCollegeId: '7', selectedCollege: { id: '7', name: 'Selected college' }, selectedAcademicYearId: '9', selectedAcademicYear: { id: '9', name: 'Configured year' }, colleges: [], academicYears: [], departments: [], courses: [], branches: [], semesters: [], sections: [], loading: false, error: '' }) }))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(), studentAdmissionApi: { getAll: vi.fn() }, studentProfilesApi: { getAll: vi.fn(async () => []) }, profileApi: { getProfile: vi.fn(async () => ({ fullName: 'Administrator' })) } }))
vi.mock('../services/facultyService', () => ({ default: { list: vi.fn(async () => []) } }))
vi.mock('../services/subjectService', () => ({ default: { getSubjects: vi.fn(async () => []) } }))
beforeEach(() => { studentAdmissionApi.getAll.mockReset().mockResolvedValue([]) })
afterEach(cleanup)
const mount = () => render(<MemoryRouter><Dashboard /></MemoryRouter>)
test('empty backend collections show empty directories without sample applicants or capacities', async () => {
  mount()
  expect(await screen.findByText('No admissions found for this selection.')).toBeTruthy()
  expect(screen.getByText('No academic units found for this selection.')).toBeTruthy()
  expect(screen.queryByText('Siddharth Varma')).toBeNull()
  expect(screen.queryByText('240 Seats')).toBeNull()
  expect(screen.getByLabelText('Curriculum configuration')).toBeTruthy()
})
test('failed collection reads show a retry state instead of successful zero totals', async () => {
  studentAdmissionApi.getAll.mockRejectedValueOnce(new Error('Unavailable'))
  mount()
  expect(await screen.findByText('Dashboard data is unavailable.')).toBeTruthy()
  expect(screen.queryByText('No admissions found for this selection.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('No admissions found for this selection.')).toBeTruthy()
  expect(studentAdmissionApi.getAll).toHaveBeenCalledTimes(2)
})
