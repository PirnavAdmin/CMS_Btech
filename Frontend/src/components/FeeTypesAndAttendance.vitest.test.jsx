import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FeeTypesConfiguration from '../pages/fees/FeeTypesConfiguration'
import { academicFeePlanApi, feeConfigurationApi } from '../api/apiEndpoints'
import { knownAttendanceRate, attendancePercentage } from '../utils/attendanceMetrics'
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId:'7' }) }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => true }) }))
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button> }))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(), feeConfigurationApi: { categories:vi.fn(), createCategory:vi.fn() }, academicFeePlanApi: { list:vi.fn() } }))
beforeEach(() => { vi.clearAllMocks(); feeConfigurationApi.categories.mockResolvedValue([{id:1,code:'ACA',name:'Academic'},{id:2,code:'HOST',name:'Hostel'}]); academicFeePlanApi.list.mockResolvedValue([{ feeCategoryId: 1 }, { feeCategoryId: 2 }]) })
afterEach(cleanup)
const renderFeeTypes = () => render(<MemoryRouter><FeeTypesConfiguration /></MemoryRouter>)
test('fee types use actual backend records without the unavailable mutation banner', async () => {
  renderFeeTypes(); await screen.findByText('Hostel')
  expect(screen.queryByText(/read-only fee category API/)).toBeNull()
  fireEvent.change(screen.getByLabelText('Search fee types'), {target:{value:'Hostel'}})
  expect(screen.queryByText('Academic')).toBeNull(); expect(screen.getByText('Hostel')).toBeTruthy()
})
test('fee types are visible before a fee structure is saved', async () => {
  feeConfigurationApi.categories.mockResolvedValueOnce([
    { id: 2, code: 'ACA', name: 'Academic' },
  ])
  renderFeeTypes()
  await screen.findByText('Academic')
  expect(academicFeePlanApi.list).not.toHaveBeenCalled()
  expect(screen.getByText('Academic')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Add Fee Type' }).disabled).toBe(false)
})
test('Add Fee Type opens the popup, saves to the API and refreshes the directory', async () => {
  const saved = { id: 9, code: 'LAB', name: 'Laboratory', description: 'Lab fees' }
  feeConfigurationApi.createCategory.mockResolvedValueOnce(saved)
  renderFeeTypes(); await screen.findByText('Academic')
  fireEvent.click(screen.getByRole('button', { name: 'Add Fee Type' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Add Fee Type' }))
  fireEvent.change(dialog.getByLabelText('Fee Type Code'), { target: { value: 'lab' } })
  fireEvent.change(dialog.getByLabelText('Fee Type Name'), { target: { value: 'Laboratory' } })
  fireEvent.change(dialog.getByLabelText('Description'), { target: { value: 'Lab fees' } })
  feeConfigurationApi.categories.mockResolvedValueOnce([saved])
  fireEvent.click(dialog.getByRole('button', { name: 'Save Fee Type' }))
  await waitFor(() => expect(feeConfigurationApi.createCategory).toHaveBeenCalledWith({ code: 'LAB', name: 'Laboratory', description: 'Lab fees' }))
  expect(await screen.findByText('Laboratory')).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: 'Add Fee Type' })).toBeNull()
})
test('fee creation failure retains entries and shows the actual error', async () => {
  feeConfigurationApi.createCategory.mockRejectedValueOnce(new Error('Code already exists'))
  renderFeeTypes(); await screen.findByText('Academic')
  fireEvent.click(screen.getByRole('button', { name: 'Add Fee Type' }))
  fireEvent.change(screen.getByLabelText('Fee Type Code'), { target: { value: 'NEW' } })
  fireEvent.change(screen.getByLabelText('Fee Type Name'), { target: { value: 'New Fee' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Fee Type' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Code already exists')
  expect(screen.getByLabelText('Fee Type Name').value).toBe('New Fee')
})
test('empty fee types retain the table headers', async () => {
  feeConfigurationApi.categories.mockResolvedValueOnce([])
  renderFeeTypes()
  expect((await screen.findByText('No fee types found.')).closest('table')).toBe(screen.getByRole('table', { name: 'Fee types' }))
  expect(screen.getAllByRole('columnheader')).toHaveLength(4)
})
test('fee category read failure offers retry instead of a fallback list', async () => {
  feeConfigurationApi.categories.mockRejectedValueOnce(new Error('Fee categories offline'))
  renderFeeTypes(); await screen.findByText('Fee categories offline')
  expect(screen.queryByText('Academic')).toBeNull(); fireEvent.click(screen.getByRole('button',{name:'Retry fee types'}))
  await screen.findByText('Academic')
})
test('attendance zero is real only when recorded against a nonzero total', () => {
  expect(attendancePercentage(0,10)).toBe(0); expect(attendancePercentage(3,4)).toBe(75)
  expect(attendancePercentage(0,0)).toBeNull(); expect(attendancePercentage(undefined,4)).toBeNull()
  expect(knownAttendanceRate(null)).toBeNull(); expect(knownAttendanceRate('')).toBeNull()
  expect(knownAttendanceRate(0)).toBe(0); expect(knownAttendanceRate(101)).toBeNull()
})
