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

test.each(['light', 'dark'])('add form uses the management stepper and validates before advancing in %s theme', async theme => {
  document.documentElement.dataset.theme = theme
  mount('/college-institution-management/add')
  expect(screen.getByRole('dialog', { name: 'Add New College' })).toBeTruthy()
  expect(screen.getByRole('tablist').classList.contains('erp-tabs-bar')).toBe(false)
  expect(screen.getAllByRole('tab')).toHaveLength(6)
  expect(screen.getByRole('tab', { name: 'College Information' }).getAttribute('aria-current')).toBe('step')
  fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
  expect(screen.getByText('College name is required.')).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Address' }).disabled).toBe(true)
  for (const [label, value] of [[/^College Name/, 'Crescent Engineering College'], [/^College Code/, 'CEC'], [/^College Type/, 'Engineering College'], [/^University Name/, 'Engineering University']]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
  expect(screen.getByRole('tab', { name: 'Address' }).getAttribute('aria-selected')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: /Previous/ }))
  expect(screen.getByLabelText(/^College Name/).value).toBe('Crescent Engineering College')
  expect(createCollege).not.toHaveBeenCalled(); expect(updateCollege).not.toHaveBeenCalled()
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

test('logo upload has a visible icon and drag-drop uses the existing preview workflow', async () => {
  const { container } = mount('/college-institution-management/add')
  expect(screen.getByRole('button', { name: /Upload college logo/ }).querySelector('svg')).toBeTruthy()
  fireEvent.drop(screen.getByRole('group', { name: 'College logo' }), { dataTransfer: { files: [new File(['image'], 'dropped.png', { type: 'image/png' })] } })
  await screen.findByAltText('College logo preview')
  expect(container.querySelector('.ac-logo-preview').textContent).toContain('dropped.png')
  expect(uploadCollegeLogo).not.toHaveBeenCalled()
})

test('logo validation preserves the chosen image and supports removal and replacement', async () => {
  mount('/college-institution-management/add')
  const input = screen.getByLabelText('Choose college logo')
  fireEvent.change(input, { target: { files: [new File(['image'], 'first.png', { type: 'image/png' })] } })
  await screen.findByAltText('College logo preview')
  fireEvent.change(input, { target: { files: [new File(['bad'], 'invalid.pdf', { type: 'application/pdf' })] } })
  expect(screen.getByText('Choose a PNG, JPG, JPEG, or WEBP image.')).toBeTruthy()
  expect(screen.getByAltText('College logo preview')).toBeTruthy()
  fireEvent.change(input, { target: { files: [new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })] } })
  expect(screen.getByText('Logo must be 2 MB or smaller. Save was stopped.')).toBeTruthy()
  expect(screen.getByAltText('College logo preview')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))
  expect(screen.queryByAltText('College logo preview')).toBeNull()
  fireEvent.change(input, { target: { files: [new File(['image'], 'replacement.png', { type: 'image/png' })] } })
  await screen.findByText('replacement.png')
  expect(uploadCollegeLogo).not.toHaveBeenCalled()
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

test('new college creation keeps the saved identifier when logo upload fails and retries without creating a duplicate', async () => {
  mount()
  const directory = await screen.findByRole('table', { name: 'Colleges' })
  fireEvent.click(screen.getByRole('button', { name: 'Add College' }))
  const modal = screen.getByRole('dialog', { name: 'Add New College' })
  const form = within(modal)
  expect(screen.getByRole('table', { name: 'Colleges' })).toBe(directory)
  expect(document.body.style.overflow).toBe('hidden')
  const change = (label,value) => fireEvent.change(form.getByLabelText(label), { target:{value} })
  const next = () => fireEvent.click(form.getByRole('button', { name: 'Next' }))
  change(/^College Name/,'New Engineering College'); change(/^College Code/,'NEC'); change(/^College Type/,'Engineering College'); change(/^University Name/,'Engineering University')
  fireEvent.change(document.querySelector('input[type=file]'), { target:{ files:[new File(['image'],'logo.png',{type:'image/png'})] } })
  await waitFor(() => expect(document.querySelector('.ac-logo-preview img')).toBeTruthy())
  next(); change(/^Address Line 1/,'Campus Road'); change(/^Pincode/,'560001'); change(/^City/,'Bengaluru'); change(/^State/,'Karnataka'); next()
  change(/^Official Contact Number/,'9876543299'); change(/^Official Email/,'newcollege@example.edu'); next()
  change(/^Principal Name/,'Principal Name'); change(/^Principal Email/,'newprincipal@example.edu'); change(/^Principal Contact Number/,'9876543298'); next()
  next()
  uploadCollegeLogo.mockRejectedValueOnce(new Error('Upload failed'))
  fireEvent.click(screen.getByRole('button', { name:'Submit College' }))
  await waitFor(() => expect(uploadCollegeLogo).toHaveBeenCalledOnce())
  expect(createCollege).toHaveBeenCalledOnce()
  await waitFor(() => expect(screen.getByRole('button', { name:'Submit College' }).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name:'Submit College' }))
  await form.findByText('College added successfully!')
  expect(modal.open).toBe(true)
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add New College' })).toBeNull(), { timeout: 3000 })
  expect(document.body.style.overflow).toBe('')
  expect(await screen.findByRole('button', { name: 'View details for New Engineering College' })).toBeTruthy()
  expect(createCollege).toHaveBeenCalledOnce(); expect(uploadCollegeLogo).toHaveBeenLastCalledWith(90, expect.any(File))
}, 10000)


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

test('leaving a dirty modal preserves the existing draft and can resume it over the directory', async () => {
  mount()
  await screen.findByRole('table', { name: 'Colleges' })
  fireEvent.click(screen.getByRole('button', { name: 'Add College' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Add New College' }))
  fireEvent.change(dialog.getByLabelText(/^College Name/), { target: { value: 'Draft College' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(dialog.getByRole('button', { name: 'Stay' }))
  expect(dialog.getByLabelText(/^College Name/).value).toBe('Draft College')
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(dialog.getByRole('button', { name: 'Leave' }))
  fireEvent.click(screen.getByRole('button', { name: 'Resume draft' }))
  expect(within(screen.getByRole('dialog', { name: 'Add New College' })).getByLabelText(/^College Name/).value).toBe('Draft College')
})

test('minimum college setup skips optional sections, persists, and recalculates after an authorized edit', async () => {
  fixture.rows = [{ ...college(), email: '', contact: '' }]
  updateCollege.mockImplementation(async (id, payload) => {
    fixture.rows = fixture.rows.map(row => String(row.id) === String(id) ? { ...row, ...payload } : row)
    return {}
  })
  const view = mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add College' }))
  const add = within(screen.getByRole('dialog', { name: 'Add New College' }))
  expect(add.queryByRole('button', { name: 'Skip' })).toBeNull()
  fireEvent.click(add.getByRole('button', { name: 'Save & Continue Later' }))
  expect(createCollege).not.toHaveBeenCalled()
  fireEvent.change(add.getByLabelText(/^College Name/), { target: { value: 'Minimal Engineering College' } })
  fireEvent.change(add.getByLabelText(/^College Code/), { target: { value: 'MEC' } })
  fireEvent.click(add.getByRole('button', { name: 'Next' }))
  fireEvent.click(add.getByRole('button', { name: 'Skip' }))
  expect(add.getByRole('tab', { name: 'Contact Information' }).getAttribute('aria-selected')).toBe('true')
  fireEvent.click(add.getByRole('button', { name: 'Save & Continue Later' }))
  await add.findByText('College added successfully!')
  expect(createCollege).toHaveBeenCalledWith(expect.objectContaining({ code: 'MEC', name: 'Minimal Engineering College', email: '', addressLine1: '' }))
  await screen.findByRole('button', { name: 'Resume setup for Minimal Engineering College' }, { timeout: 3500 })

  view.unmount()
  mount()
  const resume = await screen.findByRole('button', { name: 'Resume setup for Minimal Engineering College' })
  const score = () => Number(within(screen.getByRole('button', { name: 'Resume setup for Minimal Engineering College' }).closest('tr')).getByRole('progressbar').value)
  const initial = score()
  expect(initial).toBeGreaterThan(0)
  expect(initial).toBeLessThan(100)
  fireEvent.click(resume)
  const edit = within(screen.getByRole('dialog', { name: 'Edit College' }))
  await waitFor(() => expect(edit.getByLabelText(/^College Name/).value).toBe('Minimal Engineering College'))
  fireEvent.click(edit.getByRole('tab', { name: 'Address' }))
  fireEvent.change(edit.getByLabelText(/^Address Line 1/), { target: { value: 'Campus Road' } })
  fireEvent.click(edit.getByRole('button', { name: 'Save & Continue Later' }))
  await waitFor(() => expect(score()).toBeGreaterThan(initial), { timeout: 3500 })
  const updated = score()

  fireEvent.click(screen.getByRole('button', { name: 'View details for Minimal Engineering College' }))
  const details = within(screen.getByRole('dialog', { name: 'College Details' }))
  const detailScore = await details.findByRole('progressbar')
  expect(Number(detailScore.value)).toBe(updated)
  fireEvent.click(details.getByRole('button', { name: 'Continue setup for Minimal Engineering College' }))
  const clear = within(screen.getByRole('dialog', { name: 'Edit College' }))
  await waitFor(() => expect(clear.getByLabelText(/^College Name/).value).toBe('Minimal Engineering College'))
  fireEvent.click(clear.getByRole('tab', { name: 'Address' }))
  fireEvent.change(clear.getByLabelText(/^Address Line 1/), { target: { value: '' } })
  fireEvent.click(clear.getByRole('button', { name: 'Save & Continue Later' }))
  await waitFor(() => expect(score()).toBe(initial), { timeout: 3500 })
}, 20000)

test('conditional rendering of college type other in add, edit and review forms', async () => {
  mount('/college-institution-management/add')
  const nameInput = screen.getByLabelText(/^College Name/)
  const codeInput = screen.getByLabelText(/^College Code/)
  const typeSelect = screen.getByLabelText(/^College Type/)

  fireEvent.change(nameInput, { target: { value: 'Horizon Engineering College' } })
  fireEvent.change(codeInput, { target: { value: 'HEC' } })
  fireEvent.change(typeSelect, { target: { value: 'Engineering College' } })

  // "Specify College Type" should not appear for predefined college type
  expect(screen.queryByLabelText(/Specify College Type/i)).toBeNull()

  // Advance through steps to Review
  fireEvent.click(screen.getByRole('button', { name: /^Next/ })) // Step 1 -> Step 2
  fireEvent.click(screen.getByRole('button', { name: /^Next/ })) // Step 2 -> Step 3
  fireEvent.click(screen.getByRole('button', { name: /^Next/ })) // Step 3 -> Step 4
  fireEvent.click(screen.getByRole('button', { name: /^Next/ })) // Step 4 -> Step 5
  fireEvent.click(screen.getByRole('button', { name: /^Next/ })) // Step 5 -> Step 6 (Review)

  const review = screen.getByRole('region', { name: 'Review college details' })
  const collegeSection = within(review).getByRole('heading', { name: 'College Information' }).closest('section')

  // Predefined College Type displayed
  expect(within(collegeSection).getByText('Engineering College')).toBeTruthy()
  // "College Type Other: Not provided" must NOT appear
  expect(within(collegeSection).queryByText(/College Type Other/i)).toBeNull()
  expect(within(collegeSection).getAllByRole('term').map(dt => dt.textContent)).toEqual([
    'College Name', 'College Code', 'College Type', 'University Name'
  ])

  // Go back to College Information tab
  fireEvent.click(screen.getByRole('tab', { name: 'College Information' }))

  // Select "Others" -> dynamically displays required "Specify College Type"
  fireEvent.change(screen.getByLabelText(/^College Type/), { target: { value: 'Others' } })

  const customTypeInput = screen.getByLabelText(/Specify College Type/i)
  expect(customTypeInput).toBeTruthy()
  expect(customTypeInput.required).toBe(true)

  // Validate that empty custom type shows error when attempting to advance
  fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
  expect(screen.getByText('Enter the college type.')).toBeTruthy()

  // Enter custom type
  fireEvent.change(customTypeInput, { target: { value: 'Community College' } })

  // Navigate between steps using Next and Previous -> preserves values
  fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
  expect(screen.getByRole('tab', { name: 'Address' }).getAttribute('aria-selected')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: /Previous/ }))
  expect(screen.getByLabelText(/^College Type/).value).toBe('Others')
  expect(screen.getByLabelText(/Specify College Type/i).value).toBe('Community College')

  // Advance to Review step
  fireEvent.click(screen.getByRole('tab', { name: 'Review & Submit' }))
  const reviewOthers = screen.getByRole('region', { name: 'Review college details' })
  const collegeSectionOthers = within(reviewOthers).getByRole('heading', { name: 'College Information' }).closest('section')
  expect(within(collegeSectionOthers).getByText('Others')).toBeTruthy()
  expect(within(collegeSectionOthers).getByText('Community College')).toBeTruthy()

  // Switching from "Others" to predefined clears custom college type value
  fireEvent.click(screen.getByRole('tab', { name: 'College Information' }))
  fireEvent.change(screen.getByLabelText(/^College Type/), { target: { value: 'Degree College' } })
  expect(screen.queryByLabelText(/Specify College Type/i)).toBeNull()

  fireEvent.click(screen.getByRole('tab', { name: 'Review & Submit' }))
  const reviewDegree = screen.getByRole('region', { name: 'Review college details' })
  const collegeSectionDegree = within(reviewDegree).getByRole('heading', { name: 'College Information' }).closest('section')
  expect(within(collegeSectionDegree).getByText('Degree College')).toBeTruthy()
  expect(within(collegeSectionDegree).queryByText('Community College')).toBeNull()
  expect(within(collegeSectionDegree).queryByText(/College Type Other/i)).toBeNull()
  expect(within(collegeSectionDegree).getAllByRole('term').map(dt => dt.textContent)).toEqual([
    'College Name', 'College Code', 'College Type', 'University Name'
  ])
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
