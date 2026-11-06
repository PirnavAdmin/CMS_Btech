import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Course, Branch } from '../pages/courseManagement/Course.jsx'
import { courseApi } from '../api/apiEndpoints'
import { createCourse, updateCourseStatus } from '../auth/collegeApi'
const fixture = vi.hoisted(() => ({ rows: [], edit: true, scope: rows => rows.filter(row => !row.collegeId || String(row.collegeId) === '7') }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '7', selectedCollege: { id: '7', name: 'Selected college' }, scopeRecords: fixture.scope }) }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => fixture.edit }) }))
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button>, PrintDetailsButton: () => null }))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(), courseApi: { getAll: vi.fn(), getById: vi.fn() }, departmentApi: { getAll: vi.fn(async () => []) }, branchApi: { getAll: vi.fn(async () => []), getById: vi.fn(async () => ({ branchId: 2, courseId: 1, collegeId: 7, branchName: 'Mechanical Branch', branchCode: 'ME', branchType: 'Core', intakeCapacity: 60, status: 1 })) }, academicYearApi: { getAll: vi.fn(async () => []) } }))
vi.mock('../auth/collegeApi', async original => ({ ...await original(), getSemesters: vi.fn(async () => []), createCourse: vi.fn(), updateCourseStatus: vi.fn(), getCourseById: vi.fn() }))
const record = id => ({ id, collegeId: 7, courseName: `Engineering Course ${id}`, courseCode: `ENG${id}`, durationYears: 4, totalSemesters: 8, status: 1 })
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); fixture.edit = true; fixture.rows = [record(1)]; localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId: '7' })); courseApi.getAll.mockImplementation(async () => fixture.rows); courseApi.getById.mockImplementation(async id => fixture.rows.find(row => String(row.id) === String(id))); createCourse.mockResolvedValue({ data: { id: 90 } }); updateCourseStatus.mockResolvedValue({ data: {} }) })
afterEach(cleanup)
const mount = (path = '/courses') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/courses" element={<Course />} /><Route path="/courses/add" element={<Course mode="form" />} /><Route path="/courses/:id" element={<Course mode="details" />} /></Routes></MemoryRouter>)
test('directory searches, paginates and opens details without leaving the list', async () => {
  fixture.rows = Array.from({ length: 6 }, (_, index) => record(index + 1)); mount()
  await screen.findByRole('table', { name: 'Course directory' })
  fireEvent.click(screen.getByRole('button', { name: 'Next' })); expect(screen.getByText('Page 2 of 2')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Search courses'), { target: { value: 'Course 1' } })
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'View Engineering Course 1' }))
  const dialog = await screen.findByRole('dialog', { name: 'Course Details' }); await within(dialog).findByText('Basic Information')
  expect(screen.getByRole('table')).toBeTruthy(); fireEvent(dialog, new Event('cancel', { cancelable: true })); expect(screen.queryByRole('dialog')).toBeNull()
})
test('existing detail bookmarks open a dialog over the directory', async () => {
  mount('/courses/1'); await screen.findByRole('dialog'); await screen.findByRole('table')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close', exact: true })); expect(screen.queryByRole('dialog')).toBeNull()
})
test('read-only permissions preserve viewing and hide mutation controls', async () => {
  fixture.edit = false; mount(); await screen.findByRole('table')
  expect(screen.queryByRole('link', { name: 'Add Course' })).toBeNull(); expect(screen.queryByRole('link', { name: 'Edit Engineering Course 1' })).toBeNull()
  expect(screen.getByRole('button', { name: 'View Engineering Course 1' })).toBeTruthy()
})
test('course form submits through the existing create and status APIs with calculated semesters', async () => {
  mount('/courses/add'); const name = await screen.findByLabelText(/Course Name/)
  fireEvent.change(name, { target: { value: 'Mechanical Engineering' } })
  fireEvent.change(screen.getByLabelText(/Course Code/), { target: { value: 'MECH' } })
  fireEvent.change(screen.getByLabelText(/Duration/), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: 'Active' } })
  fireEvent.submit(document.querySelector('.course-reference-form'))
  await waitFor(() => expect(createCourse).toHaveBeenCalledOnce())
  expect(createCourse.mock.calls[0][0]).toMatchObject({ collegeId: 7, courseName: 'Mechanical Engineering', courseCode: 'MECH', durationYears: 4, totalSemesters: 8 })
  await waitFor(() => expect(updateCourseStatus).toHaveBeenCalledWith(90, 1))
  await screen.findByRole('table')
})

test('branch detail bookmarks retain saved structure information in a closable dialog', async () => {
  render(<MemoryRouter initialEntries={['/branches/2']}><Routes><Route path="/branches/:id" element={<Branch mode="details" />} /><Route path="/branches" element={<Branch />} /></Routes></MemoryRouter>)
  const dialog = await screen.findByRole('dialog', { name: 'Branch Details' })
  await within(dialog).findByText('Branch Information')
  expect(within(dialog).getByText('60')).toBeTruthy()
  expect(within(dialog).getByText('Academic Duration & Semester Structure')).toBeTruthy()
  fireEvent(dialog, new Event('cancel', { cancelable: true })); expect(screen.queryByRole('dialog')).toBeNull()
})
