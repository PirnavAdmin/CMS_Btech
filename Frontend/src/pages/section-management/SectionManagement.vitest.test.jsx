import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SectionManagement from './SectionManagement'

const data = vi.hoisted(() => ({
  sections: [],
  courses: [{ courseId: 10, collegeId: 1, courseName: 'B.Tech', courseCode: 'BTECH', status: 1 }, { courseId: 20, collegeId: 1, courseName: 'Other Course', courseCode: 'OTHER', status: 1 }],
  branches: [{ branchId: 7, courseId: 10, branchName: 'Computer Science', branchCode: 'CSE', status: 1 }, { branchId: 8, courseId: 20, branchName: 'Electronics', branchCode: 'ECE', status: 1 }],
  years: Array.from({ length: 4 }, (_, index) => ({ academicYearId: index + 1, academicYearName: `${2026 + index}-${2027 + index}`, status: index === 0 ? 'ACTIVE' : 'UPCOMING' })),
  semesters: Array.from({ length: 8 }, (_, index) => ({ semesterId: 101 + index, courseId: 10, branchId: 7, semesterNumber: index + 1, academicYearId: Math.floor(index / 2) + 1, academicYearName: `${2026 + Math.floor(index / 2)}-${2027 + Math.floor(index / 2)}`, status: 0 })),
  rooms: [{ id: 'room-1', roomNumber: 'R101', roomName: 'Main Room', capacity: 60, status: 'Available' }],
}))
vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => true }) }))
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
  sectionApi: { getAll: vi.fn(async () => data.sections), getById: vi.fn(async id => data.sections.find(row => String(row.sectionId) === String(id))), summary: vi.fn(async () => null), create: vi.fn(async payload => ({ ...payload, id: 500 })) },
  sectionAssignmentApi: { list: vi.fn(async () => []), listBySection: vi.fn(async () => []) },
  sectionAllocationApi: {}, studentAdmissionApi: {}, studentProfilesApi: {},
}))
vi.mock('../../auth/collegeApi', () => ({ getSemesters: vi.fn(async () => ({ data: { data: data.semesters } })) }))
vi.mock('../../services/facultyService', () => ({ default: { list: vi.fn(async () => []) }, normalizeFaculty: item => item }))
vi.mock('../../services/studentService', () => ({ default: {} }))
vi.mock('../../services/roomService', () => ({ default: { getRooms: vi.fn(async () => data.rooms), allocateRoom: vi.fn(async () => {}) } }))
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); data.sections = [] })
import { academicYearApi, sectionApi } from '../../api/apiEndpoints'

it('shows only saved semesters for the selected academic year', async () => {
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), { target: { value: '10' } })
  const branchSelect = screen.getByRole('combobox', { name: 'Branch' })
  expect(within(branchSelect).getByRole('option', { name: 'Computer Science' })).toBeTruthy()
  expect(within(branchSelect).queryByRole('option', { name: 'Electronics' })).toBeNull()
  expect(branchSelect.disabled).toBe(false)
  fireEvent.change(branchSelect, { target: { value: '7' } })
  expect(screen.getByRole('combobox', { name: 'Course' }).value).toBe('10')
  const semesterSelect = screen.getByRole('combobox', { name: 'Semester' })
  await waitFor(() => expect(within(semesterSelect).getByRole('option', { name: 'Semester 1' }).disabled).toBe(false))
  for (let number = 1; number <= 2; number += 1) {
    const option = within(semesterSelect).getByRole('option', { name: `Semester ${number}`, exact: true })
    expect(option.value).toBe(String(100 + number))
    expect(option.disabled).toBe(false)
  }
  expect(screen.queryByRole('option', { name: 'Semester 8', exact: true })).toBeNull()
})

it('rechecks the academic year before posting and preserves section details when it becomes inactive', async () => {
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), { target: { value: '10' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Branch' }), { target: { value: '7' } })
  const semesterSelect = screen.getByRole('combobox', { name: 'Semester' })
  await waitFor(() => expect(within(semesterSelect).getByRole('option', { name: 'Semester 1', exact: true }).disabled).toBe(false))
  fireEvent.change(semesterSelect, { target: { value: '101' } })
  fireEvent.change(screen.getByLabelText(/Capacity/), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'Active' } })
  fireEvent.change(screen.getByLabelText(/Room \/ Classroom/), { target: { value: 'R101' } })
  academicYearApi.getAll.mockResolvedValueOnce(data.years.map(year => ({ ...year, backendStatus: 0, status: 'INACTIVE' })))
  fireEvent.click(screen.getByRole('button', { name: 'Create Section' }))
  await screen.findByText(/The selected academic year is missing or inactive/)
  expect(sectionApi.create).not.toHaveBeenCalled()
  expect(screen.getByRole('combobox', { name: 'Academic year' })).toBeTruthy()
})

it('submits the confirmed active year ID and name when creating a section', async () => {
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), { target: { value: '10' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Branch' }), { target: { value: '7' } })
  const semesterSelect = screen.getByRole('combobox', { name: 'Semester' })
  await waitFor(() => expect(within(semesterSelect).getByRole('option', { name: 'Semester 1', exact: true }).disabled).toBe(false))
  fireEvent.change(semesterSelect, { target: { value: '101' } })
  fireEvent.change(screen.getByLabelText(/Capacity/), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'Active' } })
  fireEvent.change(screen.getByLabelText(/Room \/ Classroom/), { target: { value: 'R101' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create Section' }))
  await waitFor(() => expect(sectionApi.create).toHaveBeenCalledWith(expect.objectContaining({ academicYearId: '1', academicYear: '2026-2027', semesterId: '101' })))
})

it('does not offer an inactive academic year for a new section', async () => {
  academicYearApi.getAll.mockResolvedValueOnce(data.years.map(year => ({ ...year, backendStatus: 0, status: 'INACTIVE' })))
  render(<MemoryRouter><SectionManagement mode="form" /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Add Section' })
  const field = screen.getByRole('combobox', { name: 'Academic year' })
  expect(field.value).toBe('')
  expect(screen.getByText(/No active academic year is configured/)).toBeTruthy()
})

it('opens the assignment dialog directly from the compact directory action', async () => {
  data.sections = [{ sectionId:5, sectionName:'Section Alpha', sectionCode:'CSE-A', collegeId:1, courseId:10, branchId:7, semesterId:101, academicYearId:1, capacity:30, status:1 }]
  render(<MemoryRouter><SectionManagement /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name:'Assign Students to Section Alpha' }))
  const allocation = await screen.findByRole('dialog', { name:'Assign teacher or student' })
  expect(within(allocation).getByRole('button', { name:/Assign Teacher/ })).toBeTruthy()
  fireEvent(allocation, new Event('cancel', { cancelable:true }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('enables Add Section when the room service returns an available room without a collegeId', async () => {
  data.rooms = [{ id: 'room-api-1', roomNumber: 'LH-101', roomName: 'Lecture Hall 101', capacity: 60, status: 'Available' }]
  render(<MemoryRouter><SectionManagement /></MemoryRouter>)
  expect(await screen.findByRole('link', { name: /Add Section/ })).toBeTruthy()
})
