import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

test('renders header, breadcrumbs, and 4-step workflow tabs with refresh button removed', async () => {
  renderPage()

  // Verify Header & Breadcrumbs
  expect(await screen.findByRole('heading', { level: 1, name: 'Academic Structure' })).toBeTruthy()
  expect(screen.getByText('College & Academic Setup')).toBeTruthy()

  // Verify Refresh button is completely removed
  expect(screen.queryByRole('button', { name: /Refresh/i })).toBeNull()

  // Verify Stepper buttons
  expect(screen.getByRole('button', { name: /1.*Departments/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /2.*Courses/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /3.*Branches/i })).toBeTruthy()
  expect(screen.getByRole('button', { name: /4.*Semesters/i })).toBeTruthy()
})

test('loads Departments view by default with data rows', async () => {
  renderPage()

  // Check default step shows department table
  expect(await screen.findByText('Computer Science')).toBeTruthy()
  expect(screen.getByText('CSE')).toBeTruthy()
  expect(screen.getByText('Mechanical Engineering')).toBeTruthy()
  expect(screen.getByText('ME')).toBeTruthy()
})

test('switching steps renders Courses, Branches, and Semesters sections', async () => {
  renderPage()
  await screen.findByText('Computer Science')

  // Switch to Courses step
  fireEvent.click(screen.getByRole('button', { name: /2.*Courses/i }))
  expect(await screen.findByText('B.Tech Computer Science')).toBeTruthy()
  expect(screen.getByText('BTECH-CSE')).toBeTruthy()
  expect(screen.getByText('B.Tech Mechanical')).toBeTruthy()

  // Switch to Branches step
  fireEvent.click(screen.getByRole('button', { name: /3.*Branches/i }))
  expect(await screen.findByText('Artificial Intelligence')).toBeTruthy()
  expect(screen.getByText('AI-ML')).toBeTruthy()
  expect(screen.getByText('Robotics')).toBeTruthy()

  // Switch to Semesters step
  fireEvent.click(screen.getByRole('button', { name: /4.*Semesters/i }))
  expect(await screen.findByText('1st Semester')).toBeTruthy()
  expect(screen.getByText('3rd Semester')).toBeTruthy()
})

test('opens Add Department modal and submits new department', async () => {
  renderPage()
  await screen.findByText('Computer Science')

  // Click Add Department
  fireEvent.click(screen.getByRole('button', { name: /Add Department/i }))

  // Verify modal is displayed
  expect(await screen.findByRole('heading', { level: 3, name: 'Add Department' })).toBeTruthy()

  // Fill in form
  fireEvent.change(screen.getByLabelText(/Department Name/i), { target: { value: 'Civil Engineering' } })
  fireEvent.change(screen.getByLabelText(/Department Code/i), { target: { value: 'CIVIL' } })
  fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Civil Infrastructure Dept' } })

  // Submit form
  fireEvent.click(screen.getByRole('button', { name: /Create Department/i }))

  await waitFor(() => {
    expect(createDepartment).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentName: 'Civil Engineering',
        departmentCode: 'CIVIL',
        description: 'Civil Infrastructure Dept',
        collegeId: 7,
      })
    )
  })
})

test('opens Add Course modal with department preselected and submits new course', async () => {
  renderPage('/academic-structure?step=courses')
  expect(await screen.findByText('B.Tech Computer Science')).toBeTruthy()

  // Click Add Course
  fireEvent.click(screen.getByRole('button', { name: /Add Course/i }))
  expect(await screen.findByRole('heading', { level: 3, name: 'Add Course' })).toBeTruthy()

  // Fill in form
  fireEvent.change(screen.getByLabelText(/Course Name/i), { target: { value: 'M.Tech Data Science' } })
  fireEvent.change(screen.getByLabelText(/Course Code/i), { target: { value: 'MTECH-DS' } })

  // Submit form
  fireEvent.click(screen.getByRole('button', { name: /Create Course/i }))

  await waitFor(() => {
    expect(createCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        courseName: 'M.Tech Data Science',
        courseCode: 'MTECH-DS',
        departmentId: 1,
      })
    )
  })
})

test('opens Add Branch modal with cascading selectors and submits new branch', async () => {
  renderPage('/academic-structure?step=branches')
  expect(await screen.findByText('Artificial Intelligence')).toBeTruthy()

  // Click Add Branch
  fireEvent.click(screen.getByRole('button', { name: /Add Branch/i }))
  expect(await screen.findByRole('heading', { level: 3, name: 'Add Branch' })).toBeTruthy()

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
      })
    )
  })
})

test('opens Add Semester modal with course/branch selectors and submits', async () => {
  renderPage('/academic-structure?step=semesters')
  expect(await screen.findByText('1st Semester')).toBeTruthy()

  // Click Add Semester
  fireEvent.click(screen.getByRole('button', { name: /Add Semester/i }))
  expect(await screen.findByRole('heading', { level: 3, name: 'Add Semester' })).toBeTruthy()

  // Change semester number to 2 to avoid duplicate validation with semester 1
  fireEvent.change(screen.getByLabelText(/Semester Number/i), { target: { value: '2' } })

  // Submit form with Save Semester
  fireEvent.click(screen.getByRole('button', { name: /Save Semester/i }))

  await waitFor(() => {
    expect(createSemester).toHaveBeenCalledWith(
      expect.objectContaining({
        semesterNumber: 2,
        courseId: 10,
        branchId: 100,
      })
    )
  })
})

test('triggers delete confirmation modal and calls delete api on confirm', async () => {
  renderPage()
  await screen.findByText('Computer Science')

  // Find delete button for first department row
  const deleteButtons = screen.getAllByTitle('Delete Department')
  expect(deleteButtons.length).toBeGreaterThan(0)
  fireEvent.click(deleteButtons[0])

  // Verify delete confirmation dialog appears
  const modalHeading = await screen.findByRole('heading', { level: 4, name: 'Confirm Deletion' })
  expect(modalHeading).toBeTruthy()
  const modal = modalHeading.closest('.as-modal')
  expect(within(modal).getByText(/Are you sure you want to delete this department/i)).toBeTruthy()
  expect(within(modal).getByText(/Computer Science/i)).toBeTruthy()

  // Click Delete button in confirmation modal footer
  const confirmDeleteBtn = within(modal).getByRole('button', { name: /^Delete$/i })
  fireEvent.click(confirmDeleteBtn)

  await waitFor(() => {
    expect(deleteDepartment).toHaveBeenCalledWith(1)
  })
})

test('Filters button dropdown renders and search works dynamically across all four academic steps', async () => {
  renderPage()
  await screen.findByText('Computer Science')

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

  // 4. Search in Step 1 (Departments)
  fireEvent.change(searchInput, { target: { value: 'Mech' } })
  expect(screen.getByText('Mechanical Engineering')).toBeTruthy()
  expect(screen.queryByText('Computer Science')).toBeNull()

  // Clear search input via clear button
  const clearBtn = screen.getByTitle('Clear search')
  fireEvent.click(clearBtn)
  expect(await screen.findByText('Computer Science')).toBeTruthy()
  expect(screen.getByText('Mechanical Engineering')).toBeTruthy()

  // 5. Search in Step 2 (Courses)
  fireEvent.click(screen.getByRole('button', { name: /2.*Courses/i }))
  expect(await screen.findByText('B.Tech Computer Science')).toBeTruthy()
  expect(screen.getByText('B.Tech Mechanical')).toBeTruthy()

  fireEvent.change(screen.getByLabelText(/^Search$/i), { target: { value: 'BTECH-ME' } })
  expect(screen.getByText('B.Tech Mechanical')).toBeTruthy()
  expect(screen.queryByText('B.Tech Computer Science')).toBeNull()

  // 6. Search in Step 3 (Branches)
  fireEvent.click(screen.getByRole('button', { name: /3.*Branches/i }))
  expect(await screen.findByText('Artificial Intelligence')).toBeTruthy()
  expect(screen.getByText('Robotics')).toBeTruthy()

  fireEvent.change(screen.getByLabelText(/^Search$/i), { target: { value: 'Robo' } })
  expect(screen.getByText('Robotics')).toBeTruthy()
  expect(screen.queryByText('Artificial Intelligence')).toBeNull()

  // 7. Search in Step 4 (Semesters)
  fireEvent.click(screen.getByRole('button', { name: /4.*Semesters/i }))
  expect(await screen.findByText('1st Semester')).toBeTruthy()
  expect(screen.getByText('3rd Semester')).toBeTruthy()

  fireEvent.change(screen.getByLabelText(/^Search$/i), { target: { value: '3rd' } })
  expect(screen.getByText('3rd Semester')).toBeTruthy()
  expect(screen.queryByText('1st Semester')).toBeNull()

  // 8. Verify toggling Filters button closes and reopens the dropdown
  fireEvent.click(screen.getByRole('button', { name: /Filters/i }))
  expect(screen.queryByLabelText(/^Status$/i)).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /Filters/i }))
  expect(await screen.findByLabelText(/^Status$/i)).toBeTruthy()

  // Apply Status filter and verify Reset Filters clears active filter
  fireEvent.change(screen.getByLabelText(/^Status$/i), { target: { value: 'Inactive' } })
  // Scope to the dropdown menu to avoid matching the EmptyState "Reset Filters" button
  const dropdownMenu = document.querySelector('.as-filters-dropdown-menu')
  const resetBtn = within(dropdownMenu).getByRole('button', { name: /Reset Filters/i })
  fireEvent.click(resetBtn)
  expect(await screen.findByText('3rd Semester')).toBeTruthy()
})

