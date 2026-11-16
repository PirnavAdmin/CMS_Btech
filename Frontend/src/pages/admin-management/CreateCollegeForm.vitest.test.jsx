import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import CreateCollegeForm from './CreateCollegeForm.jsx'
import { collegeUserMappingsApi, userDirectoryApi } from '../../api/apiEndpoints'
import { createCollege, getCollegeSettingsByCollegeId, getColleges, updateCollegeStatus } from '../../auth/collegeApi'

const mocks = vi.hoisted(() => ({ saved: vi.fn(), dismiss: vi.fn() }))
vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ access: { isSuperAdmin: true }, loading: false }) }))
vi.mock('../../api/apiEndpoints', () => ({
  collegeUserMappingsApi: { getAll: vi.fn(), getByUser: vi.fn(), assign: vi.fn() },
  userDirectoryApi: { getAll: vi.fn(), lookups: vi.fn(), create: vi.fn(), setStatus: vi.fn() },
}))
vi.mock('../../auth/collegeApi', () => ({
  createCollege: vi.fn(),
  createCollegeSettings: vi.fn(),
  getCollegeSettingsByCollegeId: vi.fn(),
  getColleges: vi.fn(),
  updateCollegeStatus: vi.fn(),
  unwrapCollegeRecord: response => response?.data ?? response,
}))
vi.mock('../../services/academicService', () => ({ default: { registerNewCollege: vi.fn(), clearCache: vi.fn() } }))
vi.mock('../../services/eventBus', () => ({ default: { emit: vi.fn() }, ERP_EVENTS: { ACADEMIC_UPDATED: 'academic-updated' } }))
vi.mock('../../utils/newestFirst', () => ({ rememberCreated: vi.fn() }))
vi.mock('../../utils/toast', () => ({ showSuccess: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.saved = vi.fn()
  mocks.dismiss = vi.fn()
  getColleges.mockResolvedValue({ data: [] })
  createCollege.mockResolvedValue({ data: { id: 41 } })
  getCollegeSettingsByCollegeId.mockResolvedValue({ data: { data: { id: 501 } } })
  updateCollegeStatus.mockResolvedValue({})
  collegeUserMappingsApi.getAll.mockResolvedValue([])
  collegeUserMappingsApi.getByUser.mockResolvedValue([])
  collegeUserMappingsApi.assign.mockResolvedValue({ success: true })
  userDirectoryApi.getAll.mockResolvedValue([])
  userDirectoryApi.lookups.mockResolvedValue({ roles: [{ roleId: 7, roleCode: 'COLLEGE_ADMIN', collegeId: null }] })
  userDirectoryApi.create.mockResolvedValue({ data: { userId: 91 } })
  userDirectoryApi.setStatus.mockResolvedValue({ success: true })
})
afterEach(cleanup)

const renderForm = () => render(<CreateCollegeForm onDismiss={mocks.dismiss} onSaved={mocks.saved} />)
const fillCollege = () => {
  fireEvent.change(screen.getByLabelText(/^College Name/), { target: { value: 'North College' } })
  fireEvent.change(screen.getByLabelText(/^College Code/), { target: { value: 'NC01' } })
}

test('creates a College with a new setup-link administrator and prevents repeat submissions', async () => {
  let finishCreate
  createCollege.mockImplementationOnce(() => new Promise(resolve => { finishCreate = resolve }))
  renderForm()
  expect(screen.getByRole('heading', { name: 'Create College' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Contact Details' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Address Details' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Administrators' })).toBeTruthy()
  expect(screen.getByLabelText(/^Country/).value).toBe('India')
  fillCollege()
  const adminRow = within(screen.getByRole('group', { name: 'New administrator 1' }))
  fireEvent.change(adminRow.getByLabelText(/^Full Name/), { target: { value: 'New Admin' } })
  fireEvent.change(adminRow.getByLabelText(/^Phone Number/), { target: { value: '9876543210' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Email/), { target: { value: 'new.admin@example.test' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Password/), { target: { value: 'CollegeAdmin123!' } })
  const createButton = screen.getByRole('button', { name: 'Create College' })
  fireEvent.click(createButton)
  fireEvent.click(createButton)
  await waitFor(() => expect(createCollege).toHaveBeenCalledOnce())
  finishCreate({ data: { id: 41 } })
  await waitFor(() => expect(mocks.saved).toHaveBeenCalledWith({ created: true }))
  expect(createCollege).toHaveBeenCalledWith(expect.objectContaining({
    name: 'North College',
    code: 'NC01',
    country: 'India',
  }))
  expect(userDirectoryApi.create).toHaveBeenCalledWith({
    collegeId: 41,
    fullName: 'New Admin',
    email: 'new.admin@example.test',
    roleIds: [7],
    mobile: '9876543210',
    initialPassword: 'CollegeAdmin123!',
  })
  expect(userDirectoryApi.setStatus).not.toHaveBeenCalled()
  expect(updateCollegeStatus).not.toHaveBeenCalled()
})

test('requires a backend-compatible password for each new administrator', async () => {
  renderForm()
  fillCollege()
  const adminRow = within(screen.getByRole('group', { name: 'New administrator 1' }))
  fireEvent.change(adminRow.getByLabelText(/^Full Name/), { target: { value: 'New Admin' } })
  fireEvent.change(adminRow.getByLabelText(/^Phone Number/), { target: { value: '9876543210' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Email/), { target: { value: 'new.admin@example.test' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Password/), { target: { value: 'short' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create College' }))
  expect(await screen.findByText('Password must be at least 12 characters.')).toBeTruthy()
  fireEvent.change(adminRow.getByLabelText(/^Admin Password/), { target: { value: 'é'.repeat(40) } })
  fireEvent.click(screen.getByRole('button', { name: 'Create College' }))
  expect(await screen.findByText('Password must not exceed 72 UTF-8 bytes.')).toBeTruthy()
  expect(createCollege).not.toHaveBeenCalled()
  expect(userDirectoryApi.create).not.toHaveBeenCalled()
})

test('searches and assigns an eligible existing administrator by user ID', async () => {
  userDirectoryApi.getAll.mockResolvedValue([{
    userId: 12,
    fullName: 'Existing Admin',
    email: 'existing.admin@example.test',
    mobile: '9876543211',
    roleCodes: ['COLLEGE_ADMIN'],
    status: 1,
    collegeId: null,
  }])
  renderForm()
  fillCollege()
  fireEvent.click(screen.getByRole('button', { name: 'Assign Admin' }))
  const selection = await screen.findByRole('button', { name: /Existing Admin.*existing\.admin@example\.test/ })
  fireEvent.click(selection)
  expect(screen.getByText('Existing Admin', { selector: 'strong' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Create College' }))
  await waitFor(() => expect(mocks.saved).toHaveBeenCalled())
  expect(collegeUserMappingsApi.assign).toHaveBeenCalledWith({ userId: 12, collegeSettingId: 501 })
  expect(userDirectoryApi.create).not.toHaveBeenCalled()
})

test('prevents assigning the same existing administrator twice and Remove clears the selection', async () => {
  userDirectoryApi.getAll.mockResolvedValue([{
    userId: 12,
    fullName: 'Existing Admin',
    email: 'existing.admin@example.test',
    roleCodes: ['COLLEGE_ADMIN'],
    status: 1,
    collegeId: null,
  }])
  renderForm()
  fireEvent.click(screen.getByRole('button', { name: 'Assign Admin' }))
  fireEvent.click(await screen.findByRole('button', { name: /Existing Admin.*existing\.admin@example\.test/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Assign Admin' }))
  expect(await screen.findByText('No additional active College Admins match your search.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(await screen.findByRole('button', { name: /Existing Admin.*existing\.admin@example\.test/ })).toBeTruthy()
})

test('shows active administrators already assigned elsewhere as unavailable in the dropdown', async () => {
  userDirectoryApi.getAll.mockResolvedValue([{
    userId: 14,
    fullName: 'Assigned Admin',
    email: 'assigned.admin@example.test',
    roleCodes: ['COLLEGE_ADMIN'],
    status: 1,
    collegeId: 8,
  }])
  collegeUserMappingsApi.getAll.mockResolvedValue([{
    userId: 14,
    collegeSettingId: 81,
    collegeName: 'Existing College',
    status: 1,
    removedAt: null,
  }])
  renderForm()
  fireEvent.click(screen.getByRole('button', { name: 'Assign Admin' }))
  const option = await screen.findByRole('button', { name: /Assigned Admin.*assigned\.admin@example\.test/ })
  expect(option.disabled).toBe(true)
  expect(option.textContent).toContain('Already assigned to Existing College')
})

test('persists inactive College and administrator status with existing status APIs', async () => {
  renderForm()
  fillCollege()
  fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: '0' } })
  const adminRow = within(screen.getByRole('group', { name: 'New administrator 1' }))
  fireEvent.change(adminRow.getByLabelText(/^Full Name/), { target: { value: 'Inactive Admin' } })
  fireEvent.change(adminRow.getByLabelText(/^Phone Number/), { target: { value: '9876543213' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Email/), { target: { value: 'inactive@example.test' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Password/), { target: { value: 'CollegeAdmin123!' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Status/), { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create College' }))
  await waitFor(() => expect(mocks.saved).toHaveBeenCalled())
  expect(updateCollegeStatus).toHaveBeenCalledWith(41, 0)
  expect(userDirectoryApi.setStatus).toHaveBeenCalledWith(91, 0)
})

test('keeps entered values and displays API errors for retry', async () => {
  createCollege.mockRejectedValueOnce(new Error('College code already exists.'))
  renderForm()
  fillCollege()
  const adminRow = within(screen.getByRole('group', { name: 'New administrator 1' }))
  fireEvent.change(adminRow.getByLabelText(/^Full Name/), { target: { value: 'Retry Admin' } })
  fireEvent.change(adminRow.getByLabelText(/^Phone Number/), { target: { value: '9876543212' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Email/), { target: { value: 'retry@example.test' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Password/), { target: { value: 'CollegeAdmin123!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create College' }))
  await screen.findByRole('alert')
  expect(screen.getByLabelText(/^College Name/).value).toBe('North College')
  expect(screen.getByLabelText(/^Admin Email/).value).toBe('retry@example.test')
  expect(mocks.saved).not.toHaveBeenCalled()
})
