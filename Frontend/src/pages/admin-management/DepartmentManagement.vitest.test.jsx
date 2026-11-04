import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DepartmentManagement } from './AdminManagement'
import { createDepartment, getDepartments, getDepartmentById, searchDepartments, updateDepartment, updateDepartmentStatus } from '../../auth/collegeApi'

const fixture = vi.hoisted(() => ({ collegeId: '7', rows: [] }))
vi.mock('../../layouts/DashboardLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/ExportMenu', () => ({ default: () => <button type="button">Export</button>, PrintDetailsButton: () => null }))
vi.mock('../../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: fixture.collegeId, selectedCollege: { id: fixture.collegeId, name: 'Selected college' }, scopeRecords: rows => rows.filter(row => String(row.collegeNumericId ?? row.collegeId) === fixture.collegeId) }) }))
vi.mock('../../services/facultyService', async original => ({ ...await original(), normalizeFaculty: row => row, default: { list: vi.fn(async () => [{ id: 21, userId: 121, collegeId: 7, departmentId: 1, fullName: 'Configured faculty', status: 'Active' }]) } }))
vi.mock('../../auth/collegeApi', async original => ({ ...await original(), getColleges: vi.fn(async () => ({ data: [{ collegeId: 7, collegeName: 'Selected college', status: 1 }] })), getDepartments: vi.fn(), searchDepartments: vi.fn(), getDepartmentById: vi.fn(), createDepartment: vi.fn(), updateDepartment: vi.fn(), updateDepartmentStatus: vi.fn() }))
const record = (id = 1, overrides = {}) => ({ departmentId: id, departmentName: `Department ${String.fromCharCode(64 + id)}`, departmentCode: `D${id}`, collegeId: 7, status: 1, ...overrides })
beforeEach(() => {
 vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); fixture.collegeId = '7'; fixture.rows = [record()]
 getDepartments.mockReset().mockImplementation(async () => ({ data: fixture.rows }))
 searchDepartments.mockReset().mockImplementation(async () => ({ data: fixture.rows }))
 getDepartmentById.mockReset().mockImplementation(async id => ({ data: fixture.rows.find(row => String(row.departmentId) === String(id)) }))
 createDepartment.mockReset().mockImplementation(async payload => ({ data: { ...payload, departmentId: 90, status: 1 } }))
 updateDepartment.mockReset().mockImplementation(async (id, payload) => ({ data: { ...payload, departmentId: id, status: 1 } }))
 updateDepartmentStatus.mockReset().mockResolvedValue({ data: {} })
})
afterEach(cleanup)
const mount = () => render(<MemoryRouter><DepartmentManagement /></MemoryRouter>)
const openAdd = async () => { await screen.findByRole('button', { name: /Edit Department A/ }); fireEvent.click(screen.getByRole('button', { name: 'Add Department' })); return screen.findByRole('heading', { name: 'Add Department' }) }
const fill = () => {
 fireEvent.change(screen.getByLabelText(/Department Name/), { target: { value: 'Computer Science' } })
 fireEvent.change(screen.getByLabelText(/Department Code/), { target: { value: 'cse' } })
 fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'Active' } })
}

test('migrated directory keeps college isolation, five-row paging, sorting and row actions', async () => {
 fixture.rows = [...Array.from({ length: 6 }, (_, index) => record(index + 1)), record(20, { collegeId: 8, departmentName: 'Other college' })]
 mount(); const table = await screen.findByRole('table', { name: 'Department directory' }); expect(within(table).getAllByRole('row')).toHaveLength(6); expect(screen.queryByText('Other college')).toBeNull()
 expect(screen.getByText('Page 1 of 2')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Next' })); expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
 fireEvent.click(screen.getByRole('button', { name: 'Department' })); expect(screen.getByText('Page 1 of 2')).toBeTruthy(); expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toContain('Department A')
 fireEvent.click(screen.getByRole('button', { name: 'Edit Department A' })); await screen.findByRole('heading', { name: 'Edit Department' }); expect(getDepartmentById).toHaveBeenCalledWith(1)
})
test('search and status filters retain server search, applied indicators and clear behavior', async () => {
 fixture.rows = [record(), record(2, { status: 0 })]; mount(); await screen.findByRole('table')
 fireEvent.change(screen.getByLabelText('Search departments'), { target: { value: 'Department B' } }); await waitFor(() => expect(searchDepartments).toHaveBeenCalledWith('Department B')); await screen.findByRole('button', { name: 'Edit Department B' })
 fireEvent.click(screen.getByRole('button', { name: /^Filters/ })); fireEvent.change(screen.getByLabelText(/Status/), { target: { value: 'Active' } }); await screen.findByRole('heading', { name: 'No departments found.' })
 fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' })); await screen.findByRole('button', { name: 'Edit Department A' }); expect(screen.getByLabelText('Search departments').value).toBe('')
})
test('failed directory loads expose retry and no stale records', async () => {
 getDepartments.mockRejectedValueOnce({ response: { status: 403 } }); mount(); const retry = await screen.findByRole('button', { name: 'Retry' }); expect(screen.queryByRole('table')).toBeNull()
 fireEvent.click(retry); await screen.findByRole('table'); expect(getDepartments).toHaveBeenCalledTimes(2)
})
test('empty directory retains Add Department and selected college when opening a form', async () => {
 fixture.rows = []; mount(); await screen.findByRole('heading', { name: 'No departments have been added yet.' })
 const empty = screen.getByRole('heading', { name: 'No departments have been added yet.' }).closest('.erp-empty-state'); fireEvent.click(within(empty).getByRole('button', { name: 'Add Department' }))
 fill(); fireEvent.click(screen.getByRole('button', { name: 'Create Department' })); await waitFor(() => expect(createDepartment).toHaveBeenCalled()); expect(createDepartment.mock.calls[0][0].collegeId).toBe(7)
})
test('new form retains required controls without a preview, native field transforms and exact create DTO', async () => {
 mount(); await openAdd(); expect(screen.getByLabelText(/Department Name/).required).toBe(true); fill()
 fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-01' } }); fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Configured department' } })
 expect(screen.queryByLabelText('Department preview')).toBeNull(); expect(screen.queryByText('Real-time sync')).toBeNull()
 expect(document.querySelector('.erp-form-page [data-without-live-preview="true"]')).toBeTruthy(); expect(screen.getByLabelText(/Department Code/).value).toBe('CSE')
 fireEvent.click(screen.getByRole('button', { name: 'Create Department' })); await waitFor(() => expect(createDepartment).toHaveBeenCalledTimes(1))
 expect(createDepartment.mock.calls[0][0]).toEqual({ departmentName: 'Computer Science', departmentCode: 'CSE', collegeId: 7, description: 'Configured department', startDate: '2026-08-01', endDate: null, StartDate: '2026-08-01', EndDate: null, start_date: '2026-08-01', end_date: null })
 await screen.findByRole('heading', { name: 'Department Management' })
})
test('edit and cancel preserve existing update identifier and avoid unintended saves', async () => {
 mount(); fireEvent.click(await screen.findByRole('button', { name: 'Edit Department A' })); await screen.findByDisplayValue('Department A')
 fireEvent.change(screen.getByLabelText(/Department Name/), { target: { value: 'Updated department' } }); fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await waitFor(() => expect(updateDepartment).toHaveBeenCalledTimes(1)); expect(updateDepartment.mock.calls[0][0]).toBe(1); expect(updateDepartment.mock.calls[0][1].departmentName).toBe('Updated department')
 await screen.findByRole('button', { name: 'Edit Department A' }); fireEvent.click(screen.getByRole('button', { name: 'Add Department' })); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(createDepartment).not.toHaveBeenCalled()
})
test('duplicate validation remains visible and does not submit a new record', async () => {
 mount(); await openAdd(); fill(); fireEvent.change(screen.getByLabelText(/Department Code/), { target: { value: 'D1' } }); fireEvent.click(screen.getByRole('button', { name: 'Create Department' }))
 await screen.findByText('This department code already exists for this college.'); expect(createDepartment).not.toHaveBeenCalled()
})
test('existing details and HOD actions remain connected after table migration', async () => {
 mount(); fireEvent.click(await screen.findByRole('button', { name: 'Department A' })); await screen.findByRole('heading', { name: 'Department A' }); expect(getDepartmentById).toHaveBeenCalledWith(1)
 fireEvent.click(screen.getByRole('button', { name: /Back/ })); fireEvent.click(await screen.findByRole('button', { name: 'Assign Head for Department A' })); await screen.findByRole('dialog', { name: 'Assign Head / In-Charge' }); expect(screen.getByRole('button', { name: 'Assign Head' }).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button', { name: 'Select Faculty Member' })); fireEvent.click(await screen.findByRole('option', { name: /Configured faculty/ })); fireEvent.click(screen.getByRole('button', { name: 'Assign Head' }))
 await waitFor(() => expect(updateDepartment).toHaveBeenCalledTimes(1)); expect(updateDepartment.mock.calls[0][0]).toBe(1); expect(updateDepartment.mock.calls[0][1].hodUserId).toBe(121)
})
test('existing activation confirmation uses the same status API and identifier', async () => {
 fixture.rows = [record(1, { status: 0 })]; mount(); fireEvent.click(await screen.findByRole('button', { name: 'Activate Department A' })); await screen.findByRole('alertdialog'); expect(updateDepartmentStatus).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button', { name: 'Activate Department' })); await waitFor(() => expect(updateDepartmentStatus).toHaveBeenCalledWith(1, 1)); await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
})
