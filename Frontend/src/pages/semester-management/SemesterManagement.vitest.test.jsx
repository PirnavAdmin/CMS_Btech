import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SemesterManagement from './SemesterManagement'

const fixtures = vi.hoisted(() => ({
  selectedCollegeId: '1',
  semesters: [],
  course: { courseId: 10, collegeId: 1, courseName: 'B.Tech', courseCode: 'BTECH', durationYears: 4, totalSemesters: 8, academicSystem: 'Semester', status: 1 },
  branch: { branchId: 7, courseId: 10, branchName: 'Computer Science', branchCode: 'CSE', branchType: 'Core', status: 1 },
  year: { id: '1', academicYearId: 1, name: '2026-2027', academicYearName: '2026-2027', status: 'ACTIVE', isCurrent: true },
}))

vi.mock('../../layouts/DashboardLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/ExportMenu', () => ({ default: () => null, PrintDetailsButton: () => null }))
vi.mock('../../components/SearchableSelect', () => ({
  ProjectSelect: (props) => <select {...props} />,
  default: ({ label, value, options, onChange, disabled }) => <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
    <option value="">Select</option>
    {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select>,
}))
vi.mock('../../hooks/useToastState', async () => ({ default: (await import('react')).useState }))
vi.mock('../../auth/auth', () => ({ getUserRole: () => 'admin', getUserCollegeId: () => '' }))
vi.mock('../../context/AcademicContext', async () => {
  const { createCollegeScope } = await import('../../utils/collegeScope.js')
  return { useAcademic: () => ({
    selectedCollegeId: fixtures.selectedCollegeId,
    selectedAcademicYearId: '1',
    activeAcademicYears: [fixtures.year],
    currentAcademicYear: fixtures.year,
    scopeRecords: (rows, related) => createCollegeScope(fixtures.selectedCollegeId, related)(rows),
  }) }
})
vi.mock('../../api/apiEndpoints', () => ({
  courseApi: { getAll: vi.fn(async () => [fixtures.course]), getById: vi.fn(async () => fixtures.course) },
  branchApi: { getAll: vi.fn(async () => [fixtures.branch]) },
  academicYearApi: { getAll: vi.fn(async () => [fixtures.year]) },
}))
vi.mock('../../auth/collegeApi', () => ({
  getColleges: vi.fn(async () => ({ data: { data: [{ collegeId: 1, collegeName: 'Test College' }] } })),
  getSemesters: vi.fn(async () => ({ data: { success: true, data: [...fixtures.semesters] } })),
  createSemester: vi.fn(async (payload) => {
    const row = { ...payload, semesterId: 100 + payload.semesterNumber }
    fixtures.semesters.push(row)
    return { data: { success: true, data: row } }
  }),
  updateSemester: vi.fn(),
  getSemesterById: vi.fn(),
}))

import { createSemester, getSemesters, getSemesterById, updateSemester } from '../../auth/collegeApi'

function open(path) {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/semester-management" element={<SemesterManagement />} />
    <Route path="/semester-management/add" element={<SemesterManagement mode="form" />} />
    <Route path="/semester-management/:id/edit" element={<SemesterManagement mode="edit" />} />
  </Routes></MemoryRouter>)
}

async function generate() {
  await screen.findByRole('option', { name: 'Computer Science' })
  fireEvent.change(screen.getByRole('combobox', { name: 'Branch to recover' }), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Recover missing definitions' }))
  await screen.findByRole('heading', { name: 'Semester Overview & Academic Scheduling' }, { timeout: 4000 })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId: '1' }))
  fixtures.selectedCollegeId = '1'
  fixtures.semesters = []
  getSemesterById.mockImplementation(async id => ({ data: { data: fixtures.semesters.find(row => String(row.semesterId) === String(id)) } }))
  updateSemester.mockImplementation(async (id, payload) => {
    const row = fixtures.semesters.find(row => String(row.semesterId) === String(id))
    Object.assign(row, payload)
    return { data: { data: row } }
  })
})
afterEach(cleanup)

describe('saved semester directory', () => {
  it('fetches and displays semesters in the administrator table without a selected college', async () => {
    fixtures.selectedCollegeId = ''
    fixtures.semesters = [{ semesterId: 101, branchId: 7, courseId: 10, academicYearId: 1, semesterNumber: 1, semesterName: 'Semester 1' }]
    open('/semester-management')
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('link', { name: 'Semester 1' })).toBeTruthy()
    expect(within(table).getByText('Computer Science')).toBeTruthy()
    expect(getSemesters).toHaveBeenCalled()
  })

  it('creates the structure, fetches all saved rows, and displays the table after navigation', async () => {
    open('/semester-management/add')
    await generate()
    expect(createSemester).toHaveBeenCalledTimes(8)
    expect(getSemesters.mock.calls.length).toBeGreaterThan(2)
    expect(await screen.findByText('8 configured semesters')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(within(screen.getByRole('table')).getByRole('link', { name: 'Semester 8' })).toBeTruthy()
  })

  it('allows clearing a search without a manual refresh button', async () => {
    fixtures.semesters = [{ semesterId: 101, branchId: 7, courseId: 10, academicYearId: 1, semesterNumber: 1, semesterName: 'Semester 1' }]
    open('/semester-management')
    await screen.findByRole('table')
    fireEvent.change(screen.getByRole('textbox', { name: 'Search semesters' }), { target: { value: 'no match' } })
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search semesters' }), { target: { value: '' } })
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('link', { name: 'Semester 1' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Search semesters' }).value).toBe('')
  })

  it('opens an already saved structure without duplicate creation or relying on calculated year labels', async () => {
    fixtures.semesters = Array.from({ length: 8 }, (_, index) => ({ semesterId: 101 + index, branchId: 7, courseId: 10, academicYearId: 1, semesterNumber: index + 1, semesterName: `Semester ${index + 1}` }))
    open('/semester-management/add')
    await generate()
    expect(createSemester).not.toHaveBeenCalled()
    expect(await screen.findByText('8 configured semesters')).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
  })

  it('edits dates on the same saved ID and verifies them through GET', async () => {
    fixtures.semesters = [{ semesterId: 101, branchId: 7, courseId: 10, academicYearId: 1, semesterNumber: 1, yearNumber: 1, semesterName: 'Semester 1', status: 0 }]
    open('/semester-management/101/edit')
    const start = await screen.findByLabelText('Semester 1 start date')
    fireEvent.change(start, { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('Semester 1 end date'), { target: { value: '2026-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Schedule' }))
    await screen.findByRole('heading', { name:'Semester Overview & Academic Scheduling' })
    expect(updateSemester).toHaveBeenCalledWith('101', expect.objectContaining({ startDate: '2026-06-01', endDate: '2026-10-31', status: 0, yearNumber: 1 }))
    expect(getSemesterById.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(createSemester).not.toHaveBeenCalled()
    expect(fixtures.semesters[0].semesterId).toBe(101)
    cleanup()
    open('/semester-management/101/edit')
    expect((await screen.findByLabelText('Semester 1 start date')).value).toBe('2026-06-01')
  })

  it('rejects overlapping dates without writing a semester', async () => {
    fixtures.semesters = [
      { semesterId:101, branchId:7, courseId:10, academicYearId:1, semesterNumber:1, semesterName:'Semester 1', yearNumber:1, startDate:'2026-06-01', endDate:'2026-10-31' },
      { semesterId:102, branchId:7, courseId:10, academicYearId:1, semesterNumber:2, semesterName:'Semester 2', yearNumber:1 },
    ]
    open('/semester-management/102/edit')
    fireEvent.change(await screen.findByLabelText('Semester 2 start date'), { target: { value:'2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Semester 2 end date'), { target: { value:'2027-01-31' } })
    fireEvent.click(screen.getByRole('button', { name:'Save Schedule' }))
    expect(await screen.findByText(/without overlap/)).toBeTruthy()
    expect(updateSemester).not.toHaveBeenCalled()
  })
})
