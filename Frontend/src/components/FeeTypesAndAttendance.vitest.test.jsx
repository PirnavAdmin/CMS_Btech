import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FeeTypesConfiguration from '../pages/fees/FeeTypesConfiguration'
import { academicFeePlanApi, feeConfigurationApi } from '../api/apiEndpoints'
import { knownAttendanceRate, attendancePercentage } from '../utils/attendanceMetrics'

vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '7' }) }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => true }) }))
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button> }))
vi.mock('../api/apiEndpoints', async original => ({
  ...await original(),
  feeConfigurationApi: {
    categories: vi.fn(),
    manageCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    toggleStatus: vi.fn(),
    deleteCategory: vi.fn()
  },
  academicFeePlanApi: { list: vi.fn() }
}))

beforeEach(() => {
  vi.clearAllMocks()
  const defaultList = [
    { id: 1, code: 'TF', name: 'Tuition Fee', description: 'Academic tuition', status: 1 },
    { id: 2, code: 'HOSTEL', name: 'Hostel Fee', description: 'Hostel charges', status: 1 }
  ]
  feeConfigurationApi.categories.mockResolvedValue(defaultList)
  feeConfigurationApi.manageCategories.mockResolvedValue(defaultList)
  academicFeePlanApi.list.mockResolvedValue([{ feeCategoryId: 1 }, { feeCategoryId: 2 }])
})

afterEach(cleanup)

const renderFeeTypes = () => render(<MemoryRouter><FeeTypesConfiguration /></MemoryRouter>)

test('fee types use actual backend records without the unavailable mutation banner', async () => {
  renderFeeTypes()
  await waitFor(() => expect(screen.getAllByText('Hostel Fee').length).toBeGreaterThan(0))
  expect(screen.queryByText(/read-only fee category API/)).toBeNull()
  fireEvent.change(screen.getByLabelText('Search fee types'), { target: { value: 'Hostel' } })
  expect(screen.queryByText('Academic tuition')).toBeNull()
  expect(screen.getAllByText('Hostel Fee').length).toBeGreaterThan(0)
})

test('fee types are visible before a fee structure is saved', async () => {
  feeConfigurationApi.manageCategories.mockResolvedValueOnce([
    { id: 2, code: 'ADM', name: 'Admission Fee', status: 1 },
  ])
  renderFeeTypes()
  await screen.findByText('Admission Fee')
  expect(academicFeePlanApi.list).not.toHaveBeenCalled()
  expect(screen.getByText('Admission Fee')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Add Fee Type' }).disabled).toBe(false)
})

test('Add Fee Type automatically generates code from dropdown selection and saves', async () => {
  const saved = { id: 9, code: 'LAB', name: 'Laboratory Fee', description: 'Lab fees', status: 1 }
  feeConfigurationApi.createCategory.mockResolvedValueOnce(saved)
  renderFeeTypes()
  await waitFor(() => expect(screen.getAllByText('Tuition Fee').length).toBeGreaterThan(0))
  fireEvent.click(screen.getByRole('button', { name: 'Add Fee Type' }))

  const dialog = within(screen.getByRole('dialog', { name: 'Add Fee Type' }))
  // Select Laboratory Fee from dropdown
  fireEvent.change(dialog.getByLabelText(/Fee Type Name/), { target: { value: 'Laboratory Fee' } })
  // Automatically generated code should be LAB and read-only
  expect(dialog.getByLabelText(/Fee Type Code/).value).toBe('LAB')
  expect(dialog.getByLabelText(/Fee Type Code/).readOnly).toBe(true)

  fireEvent.change(dialog.getByLabelText('Description (Optional)'), { target: { value: 'Lab fees' } })

  feeConfigurationApi.manageCategories.mockResolvedValueOnce([saved])
  fireEvent.click(dialog.getByRole('button', { name: 'Save Fee Type' }))

  await waitFor(() => expect(feeConfigurationApi.createCategory).toHaveBeenCalledWith({
    code: 'LAB',
    name: 'Laboratory Fee',
    description: 'Lab fees',
    status: 1
  }))
  expect(await screen.findByText('Laboratory Fee')).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: 'Add Fee Type' })).toBeNull()
})

test('Add Fee Type supports Other option with custom name and auto-generated code', async () => {
  const saved = { id: 10, code: 'SPORTS_KIT', name: 'Sports Kit Fee', description: null, status: 1 }
  feeConfigurationApi.createCategory.mockResolvedValueOnce(saved)
  renderFeeTypes()
  await waitFor(() => expect(screen.getAllByText('Tuition Fee').length).toBeGreaterThan(0))
  fireEvent.click(screen.getByRole('button', { name: 'Add Fee Type' }))

  const dialog = within(screen.getByRole('dialog', { name: 'Add Fee Type' }))
  fireEvent.change(dialog.getByLabelText(/Fee Type Name/), { target: { value: 'Other' } })

  // Custom name input appears
  const customInput = dialog.getByLabelText(/Custom Fee Type Name/)
  fireEvent.change(customInput, { target: { value: 'Sports Kit' } })
  expect(dialog.getByLabelText(/Fee Type Code/).value).toBe('SPORTS_KIT')

  feeConfigurationApi.manageCategories.mockResolvedValueOnce([saved])
  fireEvent.click(dialog.getByRole('button', { name: 'Save Fee Type' }))

  await waitFor(() => expect(feeConfigurationApi.createCategory).toHaveBeenCalledWith({
    code: 'SPORTS_KIT',
    name: 'Sports Kit',
    description: null,
    status: 1
  }))
})

test('fee creation failure retains entries and shows the actual error', async () => {
  feeConfigurationApi.createCategory.mockRejectedValueOnce(new Error('This fee type code already exists.'))
  renderFeeTypes()
  await waitFor(() => expect(screen.getAllByText('Tuition Fee').length).toBeGreaterThan(0))
  fireEvent.click(screen.getByRole('button', { name: 'Add Fee Type' }))

  const dialog = within(screen.getByRole('dialog', { name: 'Add Fee Type' }))
  fireEvent.change(dialog.getByLabelText(/Fee Type Name/), { target: { value: 'Library Fee' } })
  expect(dialog.getByLabelText(/Fee Type Code/).value).toBe('LIB')

  fireEvent.click(dialog.getByRole('button', { name: 'Save Fee Type' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This fee type code already exists.')
})

test('empty fee types retain the 4 table headers', async () => {
  feeConfigurationApi.manageCategories.mockResolvedValueOnce([])
  renderFeeTypes()
  expect((await screen.findByText('No fee types found.')).closest('table')).toBe(screen.getByRole('table', { name: 'Fee types' }))
  expect(screen.getAllByRole('columnheader')).toHaveLength(4)
})

test('Delete Fee Type confirms and calls deleteCategory', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  feeConfigurationApi.deleteCategory.mockResolvedValueOnce({ success: true })
  renderFeeTypes()
  await waitFor(() => expect(screen.getAllByText('Tuition Fee').length).toBeGreaterThan(0))

  fireEvent.click(screen.getByRole('button', { name: 'Delete Tuition Fee' }))
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Tuition Fee'))
  await waitFor(() => expect(feeConfigurationApi.deleteCategory).toHaveBeenCalledWith(1))
  await waitFor(() => expect(screen.getByText('Fee type "Tuition Fee" deleted successfully.')).toBeTruthy())
})

test('fee category read failure offers retry instead of a fallback list', async () => {
  feeConfigurationApi.manageCategories.mockRejectedValueOnce(new Error('Fee categories offline'))
  feeConfigurationApi.categories.mockRejectedValueOnce(new Error('Fee categories offline'))
  renderFeeTypes()
  await screen.findByText('Fee categories offline')
  expect(screen.queryByText('Academic tuition')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry fee types' }))
  await waitFor(() => expect(screen.getAllByText('Tuition Fee').length).toBeGreaterThan(0))
})

test('attendance zero is real only when recorded against a nonzero total', () => {
  expect(attendancePercentage(0, 10)).toBe(0)
  expect(attendancePercentage(3, 4)).toBe(75)
  expect(attendancePercentage(0, 0)).toBeNull()
  expect(attendancePercentage(undefined, 4)).toBeNull()
  expect(knownAttendanceRate(null)).toBeNull()
  expect(knownAttendanceRate('')).toBeNull()
  expect(knownAttendanceRate(0)).toBe(0)
  expect(knownAttendanceRate(101)).toBeNull()
})

test('Edit Fee Type preserves code and updates name and description', async () => {
  renderFeeTypes()
  await waitFor(() => expect(screen.getAllByText('Tuition Fee').length).toBeGreaterThan(0))
  fireEvent.click(screen.getByRole('button', { name: 'Edit Tuition Fee' }))

  const dialog = within(screen.getByRole('dialog', { name: 'Edit Fee Type' }))
  // Existing code is loaded and read-only
  expect(dialog.getByLabelText(/Fee Type Code/).value).toBe('TF')
  expect(dialog.getByLabelText(/Fee Type Code/).readOnly).toBe(true)

  fireEvent.change(dialog.getByLabelText('Description (Optional)'), { target: { value: 'Updated tuition description' } })

  feeConfigurationApi.updateCategory.mockResolvedValueOnce({ id: 1, code: 'TF', name: 'Tuition Fee', description: 'Updated tuition description', status: 1 })
  fireEvent.click(dialog.getByRole('button', { name: 'Save Fee Type' }))

  await waitFor(() => expect(feeConfigurationApi.updateCategory).toHaveBeenCalledWith(1, {
    code: 'TF',
    name: 'Tuition Fee',
    description: 'Updated tuition description',
    status: 1
  }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Fee Type' })).toBeNull())
})
