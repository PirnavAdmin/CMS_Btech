import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { FacultyManagement } from '../pages/faculty/FacultyManagement'
import facultyService from '../services/facultyService'
import { academicYearApi } from '../api/apiEndpoints'
const fixture = vi.hoisted(() => ({ edit: true, rows: [], scope: rows => rows.filter(row => String(row.collegeId) === '7') }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '7', selectedAcademicYearId: '2', scopeRecords: fixture.scope }) }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => fixture.edit }) }))
vi.mock('../hooks/useCollegeState', async () => { const { useState } = await import('react'); return { default: useState } })
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button> }))
vi.mock('../services/facultyService', async original => ({ ...await original(), default: { list: vi.fn(), getSubjectAllocations: vi.fn(async () => []), getById: vi.fn(), getProfile: vi.fn(async () => null), getWorkload: vi.fn(async () => null), create: vi.fn(), update: vi.fn(), createProfile: vi.fn(), updateProfile: vi.fn(), uploadProfilePhoto: vi.fn() } }))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(),
  academicYearApi: { getAll: vi.fn(async () => [{ academicYearId: 2, collegeId: 7, academicYearName: '2026-2027' }]) },
  courseApi: { getAll: vi.fn(async () => [{ courseId: 3, collegeId: 7, courseName: 'Engineering' }]) },
  branchApi: { getAll: vi.fn(async () => [{ branchId: 4, courseId: 3, collegeId: 7, branchName: 'Computer Science' }]) },
  sectionApi: { getAll: vi.fn(async () => []) },
  facultyMasterApi: { getColleges: vi.fn(async () => [{ collegeId: 7, collegeName: 'Engineering College', status: 1 }]), getSemesters: vi.fn(async () => []), getSubjects: vi.fn(async () => []) }, departmentApi: { getAll: vi.fn(async () => [{ departmentId: 2, collegeId: 7, departmentName: 'Engineering', status: 1 }]) } }))
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); fixture.edit = true
  fixture.rows = [{ id: '1', facultyId: '1', collegeId: 7, fullName: 'Teaching Member', employeeCategory: 'Teaching', department: 'Engineering', employmentStatus: 'Working', employmentType: 'Permanent' }, { id: '2', facultyId: '2', collegeId: 7, fullName: 'Library Staff', employeeCategory: 'Non-Teaching', employmentStatus: 'Working' }]
  facultyService.list.mockImplementation(async () => fixture.rows)
  facultyService.getById.mockImplementation(async id => fixture.rows.find(row => row.id === id))
})
afterEach(cleanup)
const mount = (path = '/faculty') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/faculty/*" element={<FacultyManagement />} /></Routes></MemoryRouter>)
test('faculty opens configuration cards, then shows the selected directory and search', async () => {
  mount(); expect(await screen.findByRole('button', { name: 'Teaching Faculty' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'View details for Teaching Member' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Teaching Faculty' }))
  await screen.findByRole('button', { name: 'View details for Teaching Member' })
  expect(screen.queryByText('View Teaching Directory')).toBeNull()
  fireEvent.change(screen.getByLabelText('Search teaching'), { target: { value: 'missing member' } })
  expect(screen.queryByRole('button', { name: 'View details for Teaching Member' })).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: 'Faculty Directory' }))
  await screen.findByRole('button', { name: 'Non-Teaching Staff' })
  fireEvent.click(screen.getByRole('button', { name: 'Non-Teaching Staff', exact: true }))
  await screen.findByRole('button', { name: 'View details for Library Staff' })
})
test('directory API errors are visible and retry restores real data', async () => {
  facultyService.list.mockRejectedValueOnce(new Error('Faculty offline'))
  mount('/faculty?category=Teaching'); await screen.findByText('Faculty offline')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByRole('button', { name: 'View details for Teaching Member' })
})
test('read-only faculty access hides mutation controls', async () => {
  fixture.edit = false; mount('/faculty?category=Teaching'); await screen.findByRole('button', { name: 'View details for Teaching Member' })
  expect(screen.queryByRole('button', { name: 'Add Teaching Faculty' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Edit: Teaching Member' })).toBeNull()
})
test('faculty details use a cancellable native dialog with the original route', async () => {
  mount('/faculty/1?category=Teaching')
  const dialog = await screen.findByRole('dialog', { name: 'Faculty Details' })
  expect(within(dialog).getAllByText('Teaching Member').length).toBeGreaterThan(0)
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).toBeNull()
  await screen.findByRole('button', { name: 'View details for Teaching Member' })
})

test('faculty registration validates before creating an employee', async () => {
  mount('/faculty/new?category=Teaching')
  const dialog = await screen.findByRole('dialog', { name: 'Add Teaching Faculty' })
  fireEvent.submit(dialog.querySelector('form'))
  expect(within(dialog).getByRole('alert').textContent).toMatch(/full name is required/i)
  expect(facultyService.create).not.toHaveBeenCalled()
})

test('teaching registration exposes all steps and can skip optional details', async () => {
  mount('/faculty/new?category=Teaching')
  const dialog = within(await screen.findByRole('dialog', { name: 'Add Teaching Faculty' }))
  const steps = within(dialog.getByRole('navigation', { name: 'Faculty form steps' }))
  expect(steps.getAllByRole('button')).toHaveLength(5)
  fireEvent.click(steps.getByRole('button', { name: /Academic Details/ }))
  fireEvent.click(dialog.getByRole('button', { name: 'Skip for Now' }))
  expect(steps.getByRole('button', { name: /Contact/ }).getAttribute('aria-current')).toBe('step')
  fireEvent.click(dialog.getByRole('button', { name: 'Skip for Now' }))
  fireEvent.click(dialog.getByRole('button', { name: 'Skip Documents & Save' }))
  expect(facultyService.create).not.toHaveBeenCalled()
  expect(steps.getByRole('button', { name: /Personal Details/ }).getAttribute('aria-current')).toBe('step')
})

test('allocation options fail visibly without fabricated academic choices', async () => {
  academicYearApi.getAll.mockRejectedValueOnce(new Error('Academic options offline'))
  mount('/faculty?category=Teaching'); fireEvent.click(await screen.findByRole('button', { name: 'Assign academic work: Teaching Member' }))
  const dialog = await screen.findByRole('dialog', { name: 'Teaching Member - Subject Allocations' })
  await within(dialog).findByText('Academic options offline')
  expect(within(dialog).queryByText('Section A')).toBeNull()
  expect(within(dialog).getByRole('button', { name: 'Retry options' })).toBeTruthy()
  fireEvent(dialog, new Event('cancel', { cancelable: true })); expect(screen.queryByRole('dialog')).toBeNull()
})
