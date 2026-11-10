import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    <Route path="/semester-management/:id" element={<SemesterManagement mode="details" />} />
  </Routes></MemoryRouter>)
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
    expect(within(table).getByRole('rowheader', { name: 'Semester 1' })).toBeTruthy()
    expect(within(table).getByText('Computer Science')).toBeTruthy()
    expect(getSemesters).toHaveBeenCalled()
  })

  it('opens the overview from a legacy creation link without creating records', async () => {
    open('/semester-management/add')
    expect(await screen.findByText(/No semester definitions are saved/)).toBeTruthy()
    expect(createSemester).not.toHaveBeenCalled()
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
    expect(within(table).getByRole('rowheader', { name: 'Semester 1' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Search semesters' }).value).toBe('')
  })

  it('shows unscheduled records across saved academic years and filters by year', async () => {
    fixtures.semesters = [
      { semesterId: 101, branchId: 7, courseId: 10, academicYearId: 1, semesterNumber: 1, semesterName: 'Semester 1' },
      { semesterId: 102, branchId: 7, courseId: 10, academicYearId: 2, academicYearName: '2027-2028', semesterNumber: 2, semesterName: 'Semester 2' },
    ]
    open('/semester-management')
    expect(await screen.findAllByText('Not Scheduled')).toHaveLength(2)
    fireEvent.change(screen.getByRole('combobox', { name: 'Academic year' }), { target: { value: '2' } })
    expect(screen.queryByRole('rowheader', { name: 'Semester 1' })).toBeNull()
    expect(screen.getByRole('rowheader', { name: 'Semester 2' })).toBeTruthy()
    expect(createSemester).not.toHaveBeenCalled()
  })

  it('edits dates on the same saved ID and verifies them through GET', async () => {
    fixtures.semesters = [{ semesterId: 101, branchId: 7, courseId: 10, academicYearId: 1, semesterNumber: 1, yearNumber: 1, semesterName: 'Semester 1', status: 0 }]
    open('/semester-management/101/edit')
    const start = await screen.findByLabelText('Semester 1 start date')
    fireEvent.change(start, { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('Semester 1 end date'), { target: { value: '2026-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Schedule' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
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

it('opens semester details above the directory and restores the list on Escape', async () => {
  fixtures.semesters = [{ semesterId:101, branchId:7, courseId:10, academicYearId:1, semesterNumber:1, yearNumber:1, semesterName:'Semester 1' }]
  open('/semester-management/101')
  const dialog = await screen.findByRole('dialog', { name:'Semester Details' })
  await within(dialog).findByText('Academic Mapping')
  expect(screen.getByRole('table')).toBeTruthy()
  fireEvent(dialog, new Event('cancel', { cancelable:true }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('table')).toBeTruthy()
})
