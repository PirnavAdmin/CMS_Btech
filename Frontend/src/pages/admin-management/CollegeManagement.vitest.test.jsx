import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AddCollege, CollegeInstitutionManagement } from './AdminManagement.jsx'
import { getColleges, searchColleges, getCollegeById, createCollege, updateCollege, updateCollegeStatus, uploadCollegeLogo } from '../../auth/collegeApi'
import { showToast } from '../../utils/toast'

const fixture = vi.hoisted(() => ({ rows: [], edit: true, create: true, access: { isSuperAdmin: true, userId: 1 } }))
vi.mock('../../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../../components/ExportMenu', () => ({ default: () => <button>Export</button>, PrintDetailsButton: () => null }))
vi.mock('../../context/AcademicContext', () => ({ useAcademic: () => ({ collegeAccess: fixture.access, selectedCollegeId: '7', selectedCollege: { id: '7', name: 'Selected College' }, loading: false }) }))
vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ access: fixture.access, loading: false, canAction: (_path, action) => action === 'create' ? fixture.create : fixture.edit }) }))
vi.mock('../../utils/toast', async original => ({ ...await original(), showToast: vi.fn() }))
vi.mock('../../auth/collegeApi', async original => ({ ...await original(), getColleges: vi.fn(), searchColleges: vi.fn(), getCollegeById: vi.fn(), createCollege: vi.fn(), updateCollege: vi.fn(), updateCollegeStatus: vi.fn(), uploadCollegeLogo: vi.fn(), fetchCollegeLogo: vi.fn(async () => ''), getCollegeLogoEndpoint: () => '', getCollegeLogoUrl: () => '', readCachedCollegeLogo: () => '' }))
const college = (id = 7) => ({ id, name: `College ${String.fromCharCode(64 + id)}`, code: `COL${id}`, type: 'Engineering', university: 'Engineering University', addressLine1: 'Campus Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', contact: '9876543210', email: `office${id}@example.edu`, principal: 'Principal Name', principalEmail: 'principal@example.edu', principalContact: '9876543211', status: 1 })
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); fixture.rows = [college()]; fixture.edit = true; fixture.create = true; fixture.access = { isSuperAdmin: true, userId: 1 }
  getColleges.mockReset().mockImplementation(async () => ({ data: fixture.rows }))
  searchColleges.mockReset().mockImplementation(async () => ({ data: fixture.rows }))
  getCollegeById.mockReset().mockImplementation(async id => ({ data: fixture.rows.find(row => String(row.id) === String(id)) }))
  createCollege.mockReset().mockImplementation(async payload => { const created = { ...payload, id:90 }; fixture.rows.push(created); return { data:created } })
  updateCollege.mockReset().mockResolvedValue({}); uploadCollegeLogo.mockReset().mockResolvedValue({})
  updateCollegeStatus.mockReset().mockResolvedValue({ data: { success: true } })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Lookup unavailable')))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.documentElement.removeAttribute('data-theme') })
const mount = (path = '/college-institution-management') => render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/college-institution-management" element={<CollegeInstitutionManagement />} />
  <Route path="/college-institution-management/add" element={<AddCollege />} />
</Routes></MemoryRouter>)
test('college directory retains affiliation/contact fields and five-row pagination', async () => {
  fixture.rows = Array.from({ length: 6 }, (_, index) => college(index + 1)); mount()
  const table = await screen.findByRole('table', { name: 'Colleges' })
  expect(within(table).getAllByRole('row')).toHaveLength(6)
  expect(within(table).getByRole('columnheader', { name: 'Affiliation / University' })).toBeTruthy()
  expect(within(table).getAllByText('Engineering University')).toHaveLength(5)
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Filters', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Inactive', exact: true }))
  expect(await screen.findByRole('heading', { name: 'No matching colleges' })).toBeTruthy()
})

test.each(['light', 'dark'])('compact directory preserves full values and horizontal actions in %s theme', async theme => {
  document.documentElement.dataset.theme = theme
  const record = college(); record.name = 'A long engineering college name that must remain accessible'; fixture.rows = [record]
  const { container } = mount()
  const table = await screen.findByRole('table', { name: 'Colleges' })
  expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['College', 'College Code', 'Affiliation / University', 'Location', 'Contact', 'Status', 'Completion', 'Actions'])
  const summary = screen.getByLabelText('College summary')
  for (const label of ['Total Colleges', 'Active Colleges', 'Inactive Colleges']) expect(within(summary).getByText(label)).toBeTruthy()
  expect(container.querySelector('.college-config-context').textContent).toContain('Selected College')
  expect(within(table).getByRole('button', { name: `View details for ${record.name}` }).title).toBe(record.name)
  expect(within(table).getByText(record.email).title).toBe(record.email)
  const actions = container.querySelector('.college-config-row-actions')
  expect(within(actions).getAllByRole('button')).toHaveLength(4)
  for (const button of within(actions).getAllByRole('button')) expect(button.title).toBe(button.getAttribute('aria-label'))
  expect(within(screen.getByRole('region', { name: 'College Directory' })).getByRole('button', { name: 'Export' })).toBeTruthy()
  document.documentElement.removeAttribute('data-theme')
})

test('active filters can be cleared while preserving the directory and pagination', async () => {
  fixture.rows = Array.from({ length: 6 }, (_, index) => college(index + 1)); mount()
  await screen.findByRole('table')
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  fireEvent.click(screen.getByRole('button', { name: 'Filters', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Inactive', exact: true }))
  expect(screen.getByText('Applied: Inactive')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }))
  expect(screen.getByRole('button', { name: 'All', exact: true }).getAttribute('aria-pressed')).toBe('true')
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6)
  expect(screen.queryByRole('button', { name: 'Clear Filters' })).toBeNull()
})
test('college details opens above the list, preserves fields, and closes with Escape', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'View College G' }))
  const dialog = await screen.findByRole('dialog', { name: 'College Details' })
  await within(dialog).findByText('principal@example.edu')
  expect(screen.getByRole('table')).toBeTruthy()
  expect(within(dialog).getByText('560001')).toBeTruthy()
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('table')).toBeTruthy()
})
test('read-only access hides create/edit/status actions and retains view', async () => {
  fixture.edit = false; fixture.create = false; mount()
  await screen.findByRole('button', { name: 'View College G' })
  expect(screen.queryByRole('button', { name: 'Add College' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Edit College G' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Deactivate College G' })).toBeNull()
})

test('status action requires confirmation, retains backend errors and allows retry', async () => {
  fixture.rows = [{ ...college(), status: 0 }]
  updateCollegeStatus.mockRejectedValueOnce(new Error('Status service unavailable'))
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Activate College G' }))
  let dialog = await screen.findByRole('alertdialog')
  expect(updateCollegeStatus).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('alertdialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Activate College G' }))
  dialog = await screen.findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Activate College', exact: true }))
  await within(dialog).findByText('Status service unavailable')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Activate College', exact: true }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  expect(updateCollegeStatus).toHaveBeenCalledTimes(2)
  expect(updateCollegeStatus).toHaveBeenLastCalledWith(7, 1)
})
test('failed reads offer retry without presenting an empty successful directory', async () => {
  getColleges.mockRejectedValueOnce(new Error('Unavailable')); mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
  await screen.findByRole('table'); expect(getColleges).toHaveBeenCalledTimes(2)
})
test('edit form retains entered values when context access refreshes and supports tab keyboard movement', async () => {
  const tree = <MemoryRouter initialEntries={['/college-institution-management/add?edit=7']}><AddCollege /></MemoryRouter>
  const { rerender } = render(tree)
  await waitFor(() => expect(screen.getByLabelText(/^College Name/).value).toBe('College G'))
  fireEvent.change(screen.getByLabelText(/^College Name/), { target: { value: 'Updated College' } })
  fixture.access = { ...fixture.access }; rerender(<MemoryRouter initialEntries={['/college-institution-management/add?edit=7']}><AddCollege /></MemoryRouter>)
  expect(screen.getByLabelText(/^College Name/).value).toBe('Updated College')
  const tabs = screen.getAllByRole('tab'); fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
  expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[1].id)
  expect(document.activeElement).toBe(tabs[1])
})

test.each(['light', 'dark'])('create form follows the Contact, Address, Administrators layout in %s theme', async theme => {
  document.documentElement.dataset.theme = theme
  mount('/college-institution-management/add')
  const dialog = within(screen.getByRole('dialog', { name: 'Create College' }))
  expect(dialog.getAllByRole('heading').map(heading => heading.textContent).slice(1, 4)).toEqual(['Contact Details', 'Address Details', 'Administrators'])
  expect(dialog.getByLabelText(/^Country/).value).toBe('India')
  expect(dialog.getByLabelText(/^Status/).value).toBe('1')
  fireEvent.click(dialog.getByRole('button', { name: 'Create College' }))
  expect(dialog.getByText('College name is required.')).toBeTruthy()
  expect(dialog.getByText('College code is required.')).toBeTruthy()
  expect(dialog.getByText('Full name is required.')).toBeTruthy()
  expect(createCollege).not.toHaveBeenCalled()
})

test('direct entry uses the compact dialog and stepper focus does not scroll its body', async () => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  try {
    mount('/college-institution-management/add?edit=7')
    await waitFor(() => expect(screen.getByLabelText(/^College Name/).value).toBe('College G'))
    expect(screen.getByRole('dialog', { name: 'Edit College' })).toBeTruthy()
    expect(scroll).not.toHaveBeenCalled()
    const address = screen.getByRole('tab', { name: 'Address' })
    const focus = vi.spyOn(address, 'focus')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'College Information' }), { key: 'ArrowRight' })
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(screen.getByText('Step 2 of 6')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Next/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Save.*Next/ })).toBeNull()
  } finally { scroll.mockRestore() }
})

test('create form keeps its additional College API fields', async () => {
  mount('/college-institution-management/add')
  fireEvent.change(screen.getByLabelText(/^College Type/), { target: { value: 'Others' } })
  expect(screen.getByLabelText(/Specify College Type/)).toBeTruthy()
  expect(screen.getByLabelText(/^University Name/)).toBeTruthy()
})

test('final review retains backend values and save errors can be retried without duplicate writes', async () => {
  mount('/college-institution-management/add?edit=7')
  await waitFor(() => expect(screen.getByLabelText(/^College Name/).value).toBe('College G'))
  fireEvent.click(screen.getByRole('tab', { name: 'Accreditation Details' }))
  expect(screen.getByLabelText('Accreditation Body')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
  const review = screen.getByRole('region', { name: 'Review college details' })
  expect(within(review).getByText('College G')).toBeTruthy()
  expect(within(review).getByText('office7@example.edu')).toBeTruthy()
  expect(updateCollege).not.toHaveBeenCalled()
  updateCollege.mockRejectedValueOnce(new Error('College update unavailable'))
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  await screen.findByText('College update unavailable')
  let finish; updateCollege.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Saving...' }))
  await waitFor(() => expect(updateCollege).toHaveBeenCalledTimes(2))
  finish({})
  await screen.findByRole('heading', { name: 'College Configuration' })
})
test('failed logo upload does not navigate or publish a success notification', async () => {
  mount('/college-institution-management/add?edit=7')
  await waitFor(() => expect(screen.getByLabelText(/^College Name/).value).toBe('College G'))
  fireEvent.change(document.querySelector('input[type=file]'), { target: { files: [new File(['image'], 'logo.png', { type: 'image/png' })] } })
  await waitFor(() => expect(document.querySelector('.ac-logo-preview img')).toBeTruthy())
  fireEvent.click(screen.getByRole('tab', { name: 'Accreditation Details' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  uploadCollegeLogo.mockRejectedValueOnce(new Error('Upload failed'))
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(uploadCollegeLogo).toHaveBeenCalledOnce())
  expect(updateCollege).toHaveBeenCalledOnce()
  await waitFor(() => expect(showToast.mock.calls.some(([, type]) => type === 'error')).toBe(true))
  expect(showToast.mock.calls.some(([message, type]) => type === 'success' && String(message).includes('successfully'))).toBe(false)
  expect(screen.getByRole('heading', { name: 'Edit College' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  await screen.findByRole('heading', { name: 'College Configuration' })
  expect(uploadCollegeLogo).toHaveBeenCalledTimes(2)
})

test('Cancel closes the create dialog without replacing the College directory', async () => {
  mount()
  const directory = await screen.findByRole('table', { name: 'Colleges' })
  fireEvent.click(screen.getByRole('button', { name: 'Add College' }))
  const modal = screen.getByRole('dialog', { name: 'Create College' })
  expect(screen.getByRole('table', { name: 'Colleges' })).toBe(directory)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create College' })).toBeNull())
  expect(document.body.style.overflow).toBe('')
  expect(screen.getByRole('table', { name: 'Colleges' })).toBe(directory)
  expect(createCollege).not.toHaveBeenCalled()
})


test('view opens the shared edit dialog and cancel keeps the directory mounted', async () => {
  mount()
  const directory = await screen.findByRole('table', { name: 'Colleges' })
  fireEvent.click(screen.getByRole('button', { name: 'View College G' }))
  const view = await screen.findByRole('dialog', { name: 'College Details' })
  fireEvent.click(within(view).getByRole('button', { name: 'Edit college' }))
  const edit = screen.getByRole('dialog', { name: 'Edit College' })
  await waitFor(() => expect(within(edit).getByLabelText(/^College Name/).value).toBe('College G'))
  expect(screen.queryByRole('dialog', { name: 'College Details' })).toBeNull()
  fireEvent.click(within(edit).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('table', { name: 'Colleges' })).toBe(directory)
  expect(document.body.style.overflow).toBe('')
})

test('create form retains its values after an API failure', async () => {
  mount()
  await screen.findByRole('table', { name: 'Colleges' })
  fireEvent.click(screen.getByRole('button', { name: 'Add College' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Create College' }))
  fireEvent.change(dialog.getByLabelText(/^College Name/), { target: { value: 'Draft College' } })
  fireEvent.change(dialog.getByLabelText(/^College Code/), { target: { value: 'DRAFT1' } })
  const adminRow = within(dialog.getByRole('group', { name: 'New administrator 1' }))
  fireEvent.change(adminRow.getByLabelText(/^Full Name/), { target: { value: 'Draft Admin' } })
  fireEvent.change(adminRow.getByLabelText(/^Phone Number/), { target: { value: '9876543210' } })
  fireEvent.change(adminRow.getByLabelText(/^Admin Email/), { target: { value: 'draft@example.edu' } })
  createCollege.mockRejectedValueOnce(new Error('Creation service unavailable'))
  fireEvent.click(dialog.getByRole('button', { name: 'Create College' }))
  await dialog.findByText('Creation service unavailable')
  expect(dialog.getByLabelText(/^College Name/).value).toBe('Draft College')
  expect(adminRow.getByLabelText(/^Admin Email/).value).toBe('draft@example.edu')
})

test('college account cannot open creation despite a create permission grant',async()=>{fixture.access={isSuperAdmin:false,isCollegeAdmin:true,primaryCollegeId:7,collegeId:7,permissions:{colleges:{view:true,create:true,edit:true}}};mount('/college-institution-management/add');expect(await screen.findByText(/Only the platform Super Admin/)).toBeTruthy();expect(createCollege).not.toHaveBeenCalled();expect(screen.queryByLabelText(/^College Name/)).toBeNull();});

test('create form validates and clears the custom College Type when a predefined type is chosen', async () => {
  mount('/college-institution-management/add')
  fireEvent.change(screen.getByLabelText(/^College Type/), { target: { value: 'Others' } })
  const customTypeInput = screen.getByLabelText(/Specify College Type/i)
  expect(customTypeInput).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Create College' }))
  expect(screen.getByText('Enter the college type.')).toBeTruthy()
  fireEvent.change(customTypeInput, { target: { value: 'Community College' } })
  fireEvent.change(screen.getByLabelText(/^College Type/), { target: { value: 'Degree College' } })
  expect(screen.queryByLabelText(/Specify College Type/i)).toBeNull()
})

test('edit college correctly populates predefined and custom college types and payloads', async () => {
  const predefinedCollege = { ...college(10), type: 'Degree College', collegeTypeOther: '' }
  fixture.rows = [predefinedCollege]

  mount('/college-institution-management/add?edit=10')
  await waitFor(() => expect(screen.getByLabelText(/^College Name/).value).toBe(predefinedCollege.name))

  expect(screen.getByLabelText(/^College Type/).value).toBe('Degree College')
  expect(screen.queryByLabelText(/Specify College Type/i)).toBeNull()

  fireEvent.click(screen.getByRole('tab', { name: 'Review & Submit' }))
  const review = screen.getByRole('region', { name: 'Review college details' })
  const collegeSection = within(review).getByRole('heading', { name: 'College Information' }).closest('section')
  expect(within(collegeSection).getByText('Degree College')).toBeTruthy()
  expect(within(collegeSection).queryByText(/College Type Other/i)).toBeNull()
  expect(within(collegeSection).queryByText('Not provided')).toBeNull()

  cleanup()
  const customCollege = { ...college(11), type: 'Vocational Training Institute' }
  fixture.rows = [customCollege]

  mount('/college-institution-management/add?edit=11')
  await waitFor(() => expect(screen.getByLabelText(/^College Name/).value).toBe(customCollege.name))

  expect(screen.getByLabelText(/^College Type/).value).toBe('Others')
  const customInput = screen.getByLabelText(/Specify College Type/i)
  expect(customInput.value).toBe('Vocational Training Institute')

  fireEvent.click(screen.getByRole('tab', { name: 'Review & Submit' }))
  const reviewCustom = screen.getByRole('region', { name: 'Review college details' })
  const collegeSectionCustom = within(reviewCustom).getByRole('heading', { name: 'College Information' }).closest('section')
  expect(within(collegeSectionCustom).getByText('Others')).toBeTruthy()
  expect(within(collegeSectionCustom).getByText('Vocational Training Institute')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(updateCollege).toHaveBeenCalledWith(
    '11',
    expect.objectContaining({ type: 'Vocational Training Institute' })
  ))
})
