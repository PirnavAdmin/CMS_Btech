import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AcademicStructureRedirect from './AcademicStructureRedirect'
import AcademicStructure from './AcademicStructure'
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  updateDepartmentStatus,
  deleteDepartment,
  getCourses,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  getBranches,
  createBranch,
  updateBranch,
  updateBranchStatus,
  deleteBranch,
  getSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
} from '../../auth/collegeApi'
import { academicYearApi } from '../../api/apiEndpoints'

const fixture = vi.hoisted(() => ({
  departments: [
    { departmentId: 1, departmentName: 'Computer Science', departmentCode: 'CSE', description: 'Computing Dept', status: 1 },
    { departmentId: 2, departmentName: 'Mechanical Engineering', departmentCode: 'ME', description: 'Mech Dept', status: 1 },
  ],
  courses: [
    { courseId: 10, courseName: 'B.Tech Computer Science', courseCode: 'BTECH-CSE', departmentId: 1, durationYears: 4, totalSemesters: 8, status: 1 },
    { courseId: 20, courseName: 'B.Tech Mechanical', courseCode: 'BTECH-ME', departmentId: 2, durationYears: 4, totalSemesters: 8, status: 1 },
  ],
  branches: [
    { branchId: 100, branchName: 'Artificial Intelligence', branchCode: 'AI-ML', courseId: 10, departmentId: 1, intakeCapacity: 60, status: 1 },
    { branchId: 200, branchName: 'Robotics', branchCode: 'ROBO', courseId: 20, departmentId: 2, intakeCapacity: 40, status: 1 },
  ],
  semesters: [
    { semesterId: 1000, semesterName: '1st Semester', semesterNumber: 1, courseId: 10, branchId: 100, academicYearId: 5, status: 1 },
    { semesterId: 2000, semesterName: '3rd Semester', semesterNumber: 3, courseId: 10, branchId: 100, academicYearId: 5, status: 1 },
  ],
  academicYears: [
    { academicYearId: 5, academicYearName: '2026-2027', status: 1 },
  ],
}))

test('legacy department bookmarks preserve their target, query, hash, and navigation state', async () => {
  function Destination() {
    const location = useLocation()
    return <output>{location.pathname + location.search + location.hash + ' ' + location.state?.from}</output>
  }
  render(<MemoryRouter initialEntries={[{ pathname: '/department-management/7/edit', search: '?source=dashboard', hash: '#leadership', state: { from: 'dashboard' } }]}>
    <Routes>
      <Route path="/department-management/*" element={<AcademicStructureRedirect step="departments" />} />
      <Route path="/academic-structure" element={<Destination />} />
    </Routes>
  </MemoryRouter>)
  expect(await screen.findByText('/academic-structure?source=dashboard&step=departments&departmentId=7&departmentAction=edit#leadership dashboard')).toBeTruthy()
})

vi.mock('../admin-management/AdminManagement', () => ({
  DepartmentManagement: ({ inlineCreate, onCreated }) => inlineCreate
    ? <div role="dialog" aria-label="Add Department"><button type="button" onClick={() => onCreated(3)}>Create Department</button></div>
    : <table aria-label="Department directory" />,
}))
vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => true }) }))

vi.mock('../../layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}))

vi.mock('../../context/AcademicContext', () => ({
  useAcademic: () => ({
    selectedCollegeId: '7',
    selectedCollege: { id: '7', name: 'B.Tech Engineering College' },
  }),
}))

vi.mock('../../auth/collegeApi', () => ({
  getDepartments: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  updateDepartmentStatus: vi.fn(),
  deleteDepartment: vi.fn(),
  getCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  updateCourseStatus: vi.fn(),
  deleteCourse: vi.fn(),
  getBranches: vi.fn(),
  createBranch: vi.fn(),
  updateBranch: vi.fn(),
  updateBranchStatus: vi.fn(),
  deleteBranch: vi.fn(),
  getSemesters: vi.fn(),
  getSemesterById: vi.fn(),
  createSemester: vi.fn(),
  updateSemester: vi.fn(),
  deleteSemester: vi.fn(),
}))

vi.mock('../../api/apiEndpoints', () => ({
  academicYearApi: {
    getAll: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  getDepartments.mockResolvedValue({ data: fixture.departments })
  getCourses.mockResolvedValue({ data: fixture.courses })
  getBranches.mockResolvedValue({ data: fixture.branches })
  getSemesters.mockResolvedValue({ data: fixture.semesters })
  academicYearApi.getAll.mockResolvedValue(fixture.academicYears)

  createDepartment.mockResolvedValue({ data: { departmentId: 3, status: 1 } })
  createCourse.mockResolvedValue({ data: { courseId: 30, status: 1 } })
  createBranch.mockResolvedValue({ data: { branchId: 300, status: 1 } })
  createSemester.mockResolvedValue({ data: { semesterId: 3000, status: 1 } })

  deleteDepartment.mockResolvedValue({ success: true })
  deleteCourse.mockResolvedValue({ success: true })
  deleteBranch.mockResolvedValue({ success: true })
  deleteSemester.mockResolvedValue({ success: true })
})

afterEach(cleanup)

function renderPage(initialEntry = '/academic-structure') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AcademicStructure />
    </MemoryRouter>
  )
}

test('renders header, breadcrumbs, and Programs and Departments with refresh button removed', async () => {
  renderPage()

  // Verify Header & Breadcrumbs
  expect(await screen.findByRole('heading', { level: 1, name: 'Program Configuration' })).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()

  // Verify Refresh button is completely removed
  expect(screen.queryByRole('button', { name: /Refresh/i })).toBeNull()

  // Verify Stepper buttons
  expect(screen.getByRole('button', { name: /^Programs/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /^Departments/ })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /^Branches/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /^Semesters/ })).toBeNull()
})

test('loads Courses view by default with data rows', async () => {
  renderPage()

  // Check default step shows the course table
  expect(await screen.findByText('B.Tech Computer Science')).toBeTruthy()
  expect(screen.getByText(/BTECH-CSE/)).toBeTruthy()
  expect(screen.getByText('B.Tech Mechanical')).toBeTruthy()
})

test('Programs shows saved counts and opens branch and semester details', async () => {
  renderPage()
  const row = (await screen.findByText('B.Tech Computer Science')).closest('tr')
  expect(within(row).getByText('8 planned per branch')).toBeTruthy()
  expect(within(row).getByText('2 configured definitions')).toBeTruthy()
  expect(within(row).getByRole('progressbar').value).toBeLessThan(100)
  fireEvent.click(within(row).getByRole('button', { name: 'View B.Tech Computer Science' }))
  const dialog = screen.getByRole('dialog', { name: 'B.Tech Computer Science' })
  for (const label of ['Artificial Intelligence', '1st Semester', '3rd Semester']) {
    expect(within(dialog).getByText(label)).toBeTruthy()
  }
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close details' }))
  fireEvent.click(screen.getByRole('button', { name: /^Departments/ }))
  expect(await screen.findByRole('table', { name: 'Department directory' })).toBeTruthy()
})

test('Resume Setup opens Add Branch for an existing course and keeps the directory search', async () => {
  getCourses.mockResolvedValue({ data: [
    ...fixture.courses,
    { courseId: 32, courseName: 'B.Tech Civil', courseCode: 'BTECH-CIVIL', courseType: 'Undergraduate',
      departmentId: 2, durationYears: 4, totalSemesters: 8, status: 0 },
  ] })
  renderPage()
  await screen.findByText('B.Tech Civil')
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'CIVIL' } })
  const row = screen.getByText('B.Tech Civil').closest('tr')
  expect(within(row).getByText('0 configured definitions')).toBeTruthy()
  const trigger = within(row).getByRole('button', { name: 'More Actions for B.Tech Civil' })
  const actions = document.getElementById(trigger.getAttribute('popovertarget'))
  expect(actions.getAttribute('popover')).toBe('auto')
  expect(within(row).getByRole('button', { name: 'Edit Program' })).toBeTruthy()
  expect(within(row).getByRole('button', { name: 'Activate' })).toBeTruthy()
  expect(within(actions).getByText('Delete Program', { selector: 'button' })).toBeTruthy()
  fireEvent.click(within(row).getByRole('button', { name: 'Resume Setup' }))
  const dialog = screen.getByRole('dialog', { name: 'Add Branch' })
  expect(within(dialog).getByLabelText(/^Select Course/).value).toBe('32')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close details' }))
  expect(screen.getByLabelText('Search').value).toBe('CIVIL')
  expect(createCourse).not.toHaveBeenCalled()
})

test('Programs paginates saved rows and resets the page when searching', async () => {
  getCourses.mockResolvedValue({ data: Array.from({ length: 11 }, (_, index) => ({
    ...fixture.courses[0], courseId: 31 + index, courseName: 'Program ' + (index + 1), courseCode: 'P' + (index + 1),
  })) })
  renderPage()
  const table = await screen.findByRole('table', { name: 'Programs directory' })
  expect(within(table).getAllByRole('row')).toHaveLength(11)
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(within(table).getAllByRole('row')).toHaveLength(2)
  expect(within(table).getByText('Program 11')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'P2' } })
  expect(within(table).getByText('Program 2')).toBeTruthy()
  expect(within(table).queryByText('Program 11')).toBeNull()
})

test('More Actions uses the selected program for edit, status, and confirmed deletion', async () => {
  renderPage()
  const row = (await screen.findByText('B.Tech Computer Science')).closest('tr')
  const trigger = within(row).getByRole('button', { name: 'More Actions for B.Tech Computer Science' })
  expect(trigger.getAttribute('popovertarget')).toBe('program-actions-10-100')
  fireEvent.click(within(row).getByRole('button', { name: 'Edit Program' }))
  const dialog = screen.getByRole('dialog', { name: 'Edit Course' })
  expect(within(dialog).getByLabelText(/Course Name/).value).toBe('B.Tech Computer Science')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close details' }))
  fireEvent.click(within(row).getByRole('button', { name: 'Deactivate' }))
  await waitFor(() => expect(updateCourseStatus).toHaveBeenCalledWith(10, 0))
  fireEvent.click(await screen.findByText('Delete Program', { selector: '#program-actions-10-100 button' }))
  expect(deleteCourse).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(deleteCourse).toHaveBeenCalledWith(10))
})

test('branches get separate rows and dates can be set on a saved semester from that row', async () => {
  const extra = { ...fixture.branches[0], branchId: 101, branchName: 'Electrical Engineering', branchCode: 'EEE' }
  getBranches.mockResolvedValue({ data: [...fixture.branches, extra] })
  let term = { ...fixture.semesters[0] }
  getSemesterById.mockImplementation(async () => ({ data: term }))
  updateSemester.mockImplementationOnce(async (id, payload) => { term = { ...term, ...payload } })
  renderPage()
  const cse = await screen.findByRole('button', { name: /Artificial Intelligence/ })
  const eee = screen.getByRole('button', { name: /Electrical Engineering/ })
  expect(cse.closest('tr')).not.toBe(eee.closest('tr'))
  expect(within(eee.closest('tr')).getByText('0 configured definitions')).toBeTruthy()
  fireEvent.click(cse)
  fireEvent.click(screen.getByRole('button', { name: /Set dates for Semester 1/ }))
  const schedule = screen.getByRole('dialog', { name: 'Configure Schedule' })
  fireEvent.change(await within(schedule).findByLabelText(/start date/), { target: { value: '2026-08-01' } })
  fireEvent.change(within(schedule).getByLabelText(/end date/), { target: { value: '2026-11-01' } })
  fireEvent.click(within(schedule).getByRole('button', { name: 'Save Schedule' }))
  await waitFor(() => expect(updateSemester).toHaveBeenCalledWith('1000', expect.objectContaining({
    branchId: 100, startDate: '2026-08-01', endDate: '2026-11-01',
  })))
  expect(await screen.findByText(/2026-08-01 to 2026-11-01/)).toBeTruthy()
  expect(createSemester).not.toHaveBeenCalled()
})

test('Add Program can select a saved course and continue without creating it again', async () => {
  renderPage()
  await screen.findByText('B.Tech Computer Science')
  fireEvent.click(screen.getByRole('button', { name: 'Add Program' }))
  const picker = screen.getByRole('button', { name: 'Use an existing course' })
  const options = document.getElementById(picker.getAttribute('popovertarget'))
  fireEvent.click(within(options).getByText('B.Tech Computer Science (BTECH-CSE)', { selector: 'button' }))
  expect(screen.getByRole('dialog', { name: 'Add Program' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Next: Branch' }))
  const dialog = screen.getByRole('dialog', { name: 'Add Branch' })
  expect(within(dialog).getByLabelText(/^Select Course/).value).toBe('10')
  expect(createCourse).not.toHaveBeenCalled()
})

test('inline department creation selects the saved department and preserves branch details', async () => {
  renderPage()
  await screen.findByText('B.Tech Computer Science')
  fireEvent.click(screen.getByRole('button', { name: 'Add Program' }))
  const picker = screen.getByRole('button', { name: 'Use an existing course' })
  fireEvent.click(within(document.getElementById(picker.getAttribute('popovertarget'))).getByText('B.Tech Computer Science (BTECH-CSE)', { selector: 'button' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next: Branch' }))
  const branch = within(screen.getByRole('dialog', { name: 'Add Branch' }))
  fireEvent.change(branch.getByLabelText(/^Branch Name/), { target: { value: 'Data Engineering' } })
  fireEvent.click(branch.getByRole('button', { name: '+ Add Department' }))
  const department = within(screen.getByRole('dialog', { name: 'Add Department' }))
  const saved = { departmentId: 3, departmentName: 'Data Science', departmentCode: 'DS', status: 1 }
  getDepartments.mockResolvedValueOnce({ data: [...fixture.departments, saved] })
  fireEvent.click(department.getByRole('button', { name: 'Create Department' }))
  await waitFor(() => expect(branch.getByLabelText(/^Select Department/).value).toBe('3'))
  expect(branch.getByLabelText(/^Branch Name/).value).toBe('Data Engineering')
  expect(screen.queryByRole('dialog', { name: 'Add Department' })).toBeNull()
})

test('opens Add Program modal without a department selector and submits an unassigned course', async () => {
  renderPage('/academic-structure?step=courses')
  expect(await screen.findByText('B.Tech Computer Science')).toBeTruthy()

  // Click Add Program
  fireEvent.click(screen.getByRole('button', { name: /Add Program/i }))
  expect(await screen.findByRole('heading', { level: 2, name: 'Add Program' })).toBeTruthy()
  expect(screen.queryByLabelText(/Select Department/i)).toBeNull()

  // Fill in form
  fireEvent.change(screen.getByLabelText(/Course Name/i), { target: { value: 'M.Tech Data Science' } })
  fireEvent.change(screen.getByLabelText(/Course Code/i), { target: { value: 'MTECH-DS' } })

  // Submit form
  for (const [label, value] of [['Course Type', 'Undergraduate'], ['Duration (Years)', '4'], ['Total Semesters', '8'], ['Status', 'Active']]) {
    const field = within(screen.getByRole('dialog', { name: 'Add Program' })).getByLabelText(label)
    expect(field.value).toBe('')
    fireEvent.change(field, { target: { value } })
  }
  fireEvent.click(screen.getByRole('button', { name: /Create Program/i }))

  await waitFor(() => {
    expect(createCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        courseName: 'M.Tech Data Science',
        courseCode: 'MTECH-DS',
        departmentId: null,
      })
    )
  })
})

test('opens Add Branch modal with cascading selectors and submits new branch', async () => {
  const savedBranches = [...fixture.branches]
  const savedSemesters = [...fixture.semesters]
  getBranches.mockImplementation(async () => ({ data: savedBranches }))
  getSemesters.mockImplementation(async () => ({ data: savedSemesters }))
  createBranch.mockImplementationOnce(async payload => {
    const branch = { ...payload, branchId: 300 }
    savedBranches.push(branch)
    return { data: branch }
  })
  createSemester.mockImplementation(async payload => {
    const semester = { ...payload, semesterId: 3000 + payload.semesterNumber, academicYearId: 5 }
    savedSemesters.push(semester)
    return { data: semester }
  })
  renderPage('/academic-structure?step=branches')
  await screen.findByText('B.Tech Computer Science')

  // Click Add Branch
  fireEvent.click(screen.getByRole('button', { name: 'View B.Tech Computer Science' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'B.Tech Computer Science' })).getByRole('button', { name: 'Add Branch' }))
  expect(await screen.findByRole('heading', { level: 2, name: 'Add Branch' })).toBeTruthy()

  const courseSelect = screen.getByLabelText(/Select Course/i)
  const departmentSelect = screen.getByLabelText(/Select Department/i)
  fireEvent.change(departmentSelect, { target: { value: '2' } })
  fireEvent.change(courseSelect, { target: { value: '10' } })
  expect(departmentSelect.value).toBe('2')
  expect(courseSelect.value).toBe('10')
  expect(screen.queryByText(/different department/i)).toBeNull()

  fireEvent.change(departmentSelect, { target: { value: '1' } })
  fireEvent.change(departmentSelect, { target: { value: '2' } })
  expect(departmentSelect.value).toBe('2')
  expect(courseSelect.value).toBe('10')

  // Fill in form
  fireEvent.change(screen.getByLabelText(/Branch Name/i), { target: { value: 'Cyber Security' } })
  fireEvent.change(screen.getByLabelText(/Branch Code/i), { target: { value: 'CSE-CS' } })

  // Submit form
  fireEvent.click(screen.getByRole('button', { name: /Create Branch/i }))

  await waitFor(() => {
    expect(createBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        branchName: 'Cyber Security',
        branchCode: 'CSE-CS',
        courseId: 10,
        departmentId: 2,
      })
    )
  })
  expect(await screen.findByText('8 of 8 saved · 0 to add')).toBeTruthy()
  expect(createSemester.mock.calls.map(([payload]) => payload.semesterNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  expect(savedSemesters.filter(row => row.branchId === 300).every(row => row.startDate === null && row.endDate === null)).toBe(true)
})

test('review generates only missing semester definitions', async () => {
  const saved = fixture.semesters.map(term => ({ ...term }))
  getSemesters.mockImplementation(async () => ({ data: saved }))
  createSemester.mockImplementation(async payload => {
    saved.push({ ...payload, semesterId: 3000 + payload.semesterNumber })
    return { data: saved.at(-1) }
  })
  renderPage('/academic-structure?step=semesters')
  fireEvent.click(await screen.findByRole('button', { name: 'View B.Tech Computer Science' }))
  const term = await screen.findByText('1st Semester')
  fireEvent.click(within(term.closest('.as-directory-branch')).getByRole('button', { name: 'Repair 6 missing semesters' }))
  expect(createSemester).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Semester 2 start date'), { target: { value: '2026-08-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'Generate Missing Semesters' }))
  expect(await screen.findByText(/provide both start and end dates/)).toBeTruthy()
  expect(createSemester).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Semester 2 end date'), { target: { value: '2026-11-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'Generate Missing Semesters' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(createSemester.mock.calls.map(([payload]) => payload.semesterNumber)).toEqual([2, 4, 5, 6, 7, 8])
  expect(createSemester).toHaveBeenCalledWith(expect.objectContaining({
    semesterNumber: 2, startDate: '2026-08-01', endDate: '2026-11-01',
  }))
  expect(createSemester).toHaveBeenCalledWith(expect.objectContaining({ courseId: 10, branchId: 100, academicYearId: 5, startDate: null }))
})

test('Filters button dropdown renders and search works dynamically for Programs', async () => {
  renderPage()
  await screen.findByText('B.Tech Computer Science')

  // 1. Verify search input exists in the card filter bar
  const searchInput = screen.getByLabelText(/^Search$/i)
  expect(searchInput).toBeTruthy()

  // 2. Open Filters dropdown menu by clicking the Filters button
  const filtersBtn = screen.getByRole('button', { name: /Filters/i })
  expect(filtersBtn).toBeTruthy()
  fireEvent.click(filtersBtn)

  // 3. Verify Connected Academic Filters dropdown title and controls
  expect(await screen.findByText('Connected Academic Filters')).toBeTruthy()
  const deptSelect = screen.getByLabelText(/^Department$/i)
  const courseSelect = screen.getByLabelText(/^Course$/i)
  const branchSelect = screen.getByLabelText(/^Branch$/i)
  const statusSelect = screen.getByLabelText(/^Status$/i)

  expect(deptSelect).toBeTruthy()
  expect(courseSelect).toBeTruthy()
  expect(branchSelect).toBeTruthy()
  expect(statusSelect).toBeTruthy()

  // 4. Search in Step 1 (Courses)
  fireEvent.change(searchInput, { target: { value: 'Mech' } })
  expect(screen.getByText('B.Tech Mechanical')).toBeTruthy()
  expect(screen.queryByText('B.Tech Computer Science')).toBeNull()

  // Clear search input via clear button
  const clearBtn = screen.getByTitle('Clear search')
  fireEvent.click(clearBtn)
  expect(await screen.findByText('B.Tech Computer Science')).toBeTruthy()
  expect(screen.getByText('B.Tech Mechanical')).toBeTruthy()

  fireEvent.change(screen.getByLabelText(/^Search$/i), { target: { value: 'Robo' } })
  expect(screen.getByText('B.Tech Mechanical')).toBeTruthy()
  expect(screen.queryByText('B.Tech Computer Science')).toBeNull()
  fireEvent.change(screen.getByLabelText(/^Search$/i), { target: { value: '3rd' } })
  expect(screen.getByText('B.Tech Computer Science')).toBeTruthy()
  expect(screen.queryByText('B.Tech Mechanical')).toBeNull()

  // 8. Verify toggling Filters button closes and reopens the dropdown
  fireEvent.click(screen.getByRole('button', { name: /Filters/i }))
  expect(screen.queryByLabelText(/^Status$/i)).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /Filters/i }))
  expect(await screen.findByLabelText(/^Status$/i)).toBeTruthy()

  // Apply Status filter and verify Reset Filters clears active filter
  fireEvent.change(screen.getByLabelText(/^Status$/i), { target: { value: 'Inactive' } })
  // Scope to the dropdown menu to avoid matching the EmptyState "Reset Filters" button
  const dropdownMenu = document.querySelector('.as-filters-drawer')
  const resetBtn = within(dropdownMenu).getByRole('button', { name: /Reset Filters/i })
  fireEvent.click(resetBtn)
  expect(await screen.findByText('B.Tech Computer Science')).toBeTruthy()
})


test('academic setup tabs share one dialog and retain entered values', async () => {
  renderPage()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Program' }))
  const dialog = screen.getByRole('dialog', { name: 'Add Program' })
  fireEvent.change(screen.getByLabelText(/Course Name/), { target: { value: 'Draft course' } })
  fireEvent.click(screen.getByRole('tab', { name: 'Branch' }))
  expect(screen.getByRole('dialog', { name: 'Add Branch' })).toBe(dialog)
  fireEvent.click(screen.getByRole('tab', { name: 'Semester Structure' }))
  expect(screen.getByRole('dialog', { name: 'Semester Structure' })).toBe(dialog)
  fireEvent.click(screen.getByRole('tab', { name: 'Course' }))
  expect(screen.getByLabelText(/Course Name/).value).toBe('Draft course')
})

test('one saved course can receive two branches through the unified setup', async () => {
  const savedCourses = [...fixture.courses]
  const savedBranches = [...fixture.branches]
  const savedSemesters = [...fixture.semesters]
  getSemesters.mockImplementation(async () => ({ data: savedSemesters }))
  createSemester.mockImplementation(async payload => {
    const row = { ...payload, academicYearId: 5, semesterId: 3000 + savedSemesters.length }
    savedSemesters.push(row)
    return { data: row }
  })
  getCourses.mockImplementation(async () => ({ data: savedCourses }))
  getBranches.mockImplementation(async () => ({ data: savedBranches }))
  createCourse.mockImplementation(async payload => {
    savedCourses.push({ ...payload, courseId: 30 })
    return { data: savedCourses.at(-1) }
  })
  createBranch.mockImplementation(async payload => {
    savedBranches.push({ ...payload, branchId: 300 + savedBranches.length })
    return { data: savedBranches.at(-1) }
  })
  renderPage()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Program' }))
  fireEvent.change(screen.getByLabelText(/Course Name/), { target: { value: 'Engineering Design' } })
  fireEvent.change(screen.getByLabelText(/Course Code/), { target: { value: 'ED' } })
  for (const [label, value] of [['Course Type', 'Undergraduate'], ['Duration (Years)', '4'], ['Total Semesters', '8'], ['Status', 'Active']]) {
    const field = within(screen.getByRole('dialog', { name: 'Add Program' })).getByLabelText(label)
    expect(field.value).toBe('')
    fireEvent.change(field, { target: { value } })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Create Program' }))
  for (const [name, code] of [['Engineering Systems', 'ES'], ['Product Design', 'PD']]) {
    await screen.findByRole('dialog', { name: 'Add Branch' })
    expect(screen.getByLabelText(/^Select Course/).value).toBe('30')
    fireEvent.change(screen.getByLabelText(/^Select Department/), { target: { value: '1' } })
    expect(screen.getByLabelText(/^Select Course/).value).toBe('30')
    fireEvent.change(screen.getByLabelText(/Branch Name/), { target: { value: name } })
    fireEvent.change(screen.getByLabelText(/Branch Code/), { target: { value: code } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Branch' }))
    const structure = await screen.findByRole('dialog', { name: 'Semester Structure' })
    await within(structure).findByText('8 of 8 saved · 0 to add')
    if (code === 'ES') fireEvent.click(screen.getByRole('tab', { name: 'Branch' }))
  }
  expect(createCourse).toHaveBeenCalledTimes(1)
  expect(createBranch.mock.calls.map(([branch]) => branch.courseId)).toEqual([30, 30])
  expect(createSemester).toHaveBeenCalledTimes(16)
})
