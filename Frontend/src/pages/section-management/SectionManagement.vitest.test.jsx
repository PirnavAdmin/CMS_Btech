import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectionManagement from './SectionManagement'

const data = vi.hoisted(() => ({
  courses: [{ courseId: 10, collegeId: 1, courseName: 'B.Tech', courseCode: 'BTECH', status: 1 }, { courseId: 20, collegeId: 1, courseName: 'Other Course', courseCode: 'OTHER', status: 1 }],
  branches: [{ branchId: 7, courseId: 10, branchName: 'Computer Science', branchCode: 'CSE', status: 1 }, { branchId: 8, courseId: 20, branchName: 'Electronics', branchCode: 'ECE', status: 1 }],
  years: Array.from({ length: 4 }, (_, index) => ({ academicYearId: index + 1, academicYearName: `${2026 + index}-${2027 + index}`, status: index === 0 ? 'ACTIVE' : 'UPCOMING' })),
  semesters: Array.from({ length: 8 }, (_, index) => ({ semesterId: 101 + index, courseId: 10, branchId: 7, semesterNumber: index + 1, academicYearId: Math.floor(index / 2) + 1, academicYearName: `${2026 + Math.floor(index / 2)}-${2027 + Math.floor(index / 2)}`, status: 0 })),
}))
vi.mock('../../layouts/DashboardLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/ExportMenu', () => ({ default: () => null, PrintDetailsButton: () => null }))
vi.mock('../../components/SearchableSelect', () => ({
  ProjectSelect: props => <select {...props} />,
  default: ({ label, value, options, onChange, disabled }) => <select aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
    <option value="">Select</option>
    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select>,
}))
vi.mock('../../context/AcademicContext', async () => {
  const { createCollegeScope } = await import('../../utils/collegeScope.js')
  const scopeRecords = (rows, related) => createCollegeScope('1', related)(rows)
  return { useAcademic: () => ({ scopeRecords, selectedCollegeId: '1', selectedAcademicYearId: '1', selectedAcademicYear: { id: '1', name: '2026-2027' } }) }
})
vi.mock('../../api/apiEndpoints', () => ({
  courseApi: { getAll: vi.fn(async () => data.courses) },
  branchApi: { getAll: vi.fn(async () => data.branches) },
  academicYearApi: { getAll: vi.fn(async () => data.years) },
  sectionApi: { getAll: vi.fn(async () => []), summary: vi.fn(async () => null), create: vi.fn(async payload => ({ ...payload, id: 500 })) },
  sectionAssignmentApi: { list: vi.fn(async () => []) },
  sectionAllocationApi: {}, studentAdmissionApi: {}, studentProfilesApi: {},
}))
vi.mock('../../auth/collegeApi', () => ({ getSemesters: vi.fn(async () => ({ data: { data: data.semesters } })) }))
vi.mock('../../services/facultyService', () => ({ default: { list: vi.fn(async () => []) }, normalizeFaculty: item => item }))
vi.mock('../../services/studentService', () => ({ default: {} }))
vi.mock('../../services/roomService', () => ({ default: {} }))
afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())
import { academicYearApi, sectionApi } from '../../api/apiEndpoints'

it('shows all saved branches and semesters 1–8, including upcoming semesters in later years', async () => {
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  const branchSelect = screen.getByRole('combobox', { name: 'Branch' })
  expect(within(branchSelect).getByRole('option', { name: 'Computer Science' })).toBeTruthy()
  expect(within(branchSelect).getByRole('option', { name: 'Electronics' })).toBeTruthy()
  expect(branchSelect.disabled).toBe(false)
  fireEvent.change(branchSelect, { target: { value: '7' } })
  expect(screen.getByRole('combobox', { name: 'Course' }).value).toBe('10')
  const semesterSelect = screen.getByRole('combobox', { name: 'Semester' })
  await waitFor(() => expect(within(semesterSelect).getByRole('option', { name: 'Semester 8' }).disabled).toBe(false))
  for (let number = 1; number <= 8; number += 1) {
    const option = within(semesterSelect).getByRole('option', { name: `Semester ${number}`, exact: true })
    expect(option.value).toBe(String(100 + number))
    expect(option.disabled).toBe(false)
  }
  fireEvent.change(semesterSelect, { target: { value: '108' } })
  expect(screen.getByRole('combobox', { name: 'Academic Year' }).value).toBe('4')
  expect(screen.getByRole('button', { name: /Next/ }).disabled).toBe(true)
  fireEvent.change(screen.getByRole('combobox', { name: 'Academic Year' }), { target: { value: '1' } })
  expect(screen.getByRole('button', { name: /Next/ }).disabled).toBe(false)
  fireEvent.change(branchSelect, { target: { value: '8' } })
  expect(screen.getByRole('combobox', { name: 'Course' }).value).toBe('20')
  expect(semesterSelect.value).toBe('')
})

it('rechecks the academic year before posting and preserves section details when it becomes inactive', async () => {
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Branch' }), { target: { value: '7' } })
  const semesterSelect = screen.getByRole('combobox', { name: 'Semester' })
  await waitFor(() => expect(within(semesterSelect).getByRole('option', { name: 'Semester 1', exact: true }).disabled).toBe(false))
  fireEvent.change(semesterSelect, { target: { value: '101' } })
  fireEvent.click(screen.getByRole('button', { name: /Next/ }))
  fireEvent.change(screen.getByLabelText(/Capacity/), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'Active' } })
  academicYearApi.getAll.mockResolvedValueOnce(data.years.map(year => ({ ...year, backendStatus: 0, status: 'INACTIVE' })))
  fireEvent.click(screen.getByRole('button', { name: 'Create Section' }))
  await screen.findByText(/The selected academic year is missing or inactive/)
  expect(sectionApi.create).not.toHaveBeenCalled()
  expect(screen.getByRole('combobox', { name: 'Academic Year' })).toBeTruthy()
})

it('submits the confirmed active year ID and name when creating a section', async () => {
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Branch' }), { target: { value: '7' } })
  const semesterSelect = screen.getByRole('combobox', { name: 'Semester' })
  await waitFor(() => expect(within(semesterSelect).getByRole('option', { name: 'Semester 1', exact: true }).disabled).toBe(false))
  fireEvent.change(semesterSelect, { target: { value: '101' } })
  fireEvent.click(screen.getByRole('button', { name: /Next/ }))
  fireEvent.change(screen.getByLabelText(/Capacity/), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'Active' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create Section' }))
  await waitFor(() => expect(sectionApi.create).toHaveBeenCalledWith(expect.objectContaining({ academicYearId: '1', academicYear: '2026-2027', semesterId: '101' })))
})

it('displays the existing selected academic year even when no years are active', async () => {
  academicYearApi.getAll.mockResolvedValueOnce(data.years.map(year => ({ ...year, backendStatus: 0, status: 'INACTIVE' })))
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  const field = screen.getByRole('combobox', { name: 'Academic Year' })
  expect(field.value).toBe('1')
  expect(within(field).getByRole('option', { name: '2026-2027' }).selected).toBe(true)
  expect(screen.getByRole('button', { name: /Next/ }).disabled).toBe(true)
})
