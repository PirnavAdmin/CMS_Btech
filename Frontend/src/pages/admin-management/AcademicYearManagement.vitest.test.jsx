import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AcademicYearManagement } from './AdminManagement'
import { academicYearApi, studentApi } from '../../api/apiEndpoints'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import { showDeactivationBlocked } from '../../components/DeactivationBlockedDialog'

const fixture = vi.hoisted(() => ({ collegeId: '7', rows: [], contextLoading: false }))
vi.mock('../../layouts/DashboardLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/ExportMenu', () => ({ default: ({ loading }) => <button type="button" disabled={loading}>Export</button>, PrintDetailsButton: () => null }))
vi.mock('../../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: fixture.collegeId, selectedCollege: { id: fixture.collegeId, name: `College ${fixture.collegeId}` }, loading: fixture.contextLoading }) }))
vi.mock('../../api/apiEndpoints', async original => ({ ...await original(), academicYearApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), activate: vi.fn(), deactivate: vi.fn() }, studentApi: { getAll: vi.fn() } }))
vi.mock('../../services/eventBus', async original => { const actual = await original(); return { ...actual, default: { subscribe: actual.default.subscribe.bind(actual.default), emit: vi.fn() } } })
vi.mock('../../components/DeactivationBlockedDialog', () => ({ showDeactivationBlocked: vi.fn() }))

const year = (id = 1, overrides = {}) => ({ academicYearId: id, collegeId: 7, academicYearName: '2030 - 2031', startDate: '2030-06-01', endDate: '2031-05-31', status: 'UPCOMING', autoActivate: false, ...overrides })
const writeCollege = value => { fixture.collegeId = value; localStorage.setItem('pirnav_academic_context', JSON.stringify({ collegeId: value, academicYearId: '' })) }
const deferred = () => { let resolve, reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail }); return { promise, resolve, reject } }
beforeEach(() => {
 vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); fixture.contextLoading = false; writeCollege('7'); fixture.rows = [year()]
 vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-03T06:00:00Z'))
 academicYearApi.getAll.mockReset().mockImplementation(async () => [...fixture.rows])
 academicYearApi.getById.mockReset().mockImplementation(async id => fixture.rows.find(row => String(row.academicYearId) === String(id)))
 academicYearApi.create.mockReset().mockImplementation(async payload => { const record = year(90, { ...payload, academicYearName: payload.academicYearName || payload.name }); fixture.rows.push(record); return record })
 academicYearApi.update.mockReset().mockImplementation(async (id, payload) => { const record = year(Number(id), { ...payload, academicYearName: payload.academicYearName || payload.name }); fixture.rows = fixture.rows.map(row => String(row.academicYearId) === String(id) ? record : row); return record })
 academicYearApi.activate.mockReset().mockResolvedValue({}); academicYearApi.deactivate.mockReset().mockResolvedValue({}); studentApi.getAll.mockReset().mockResolvedValue([])
})
afterEach(() => { cleanup(); vi.useRealTimers(); document.documentElement.removeAttribute('data-theme') })
const tree = () => <MemoryRouter><AcademicYearManagement /></MemoryRouter>
const mount = () => render(tree())
const directory = () => screen.findByRole('table', { name: 'Academic year directory' })
const openAdd = async () => { await directory(); fireEvent.click(screen.getByRole('button', { name: 'Add Academic Year' })); return screen.findByRole('dialog', { name: 'Add Academic Year' }) }
const fill = (name = '2032 - 2033', start = '2032-06-01', end = '2033-05-31') => {
 fireEvent.change(screen.getByRole('textbox', { name: 'Academic Year Title' }), { target: { value: name } })
 fireEvent.change(screen.getByLabelText(/Start Date/), { target: { value: start } }); fireEvent.change(screen.getByLabelText(/End Date/), { target: { value: end } })
}

test('directory retains college isolation, five-row paging, stable sort and row action identity', async () => {
 fixture.rows = [...Array.from({ length: 6 }, (_, index) => year(index + 1, { academicYearName: `${2030 + index} - ${2031 + index}`, startDate: `${2030 + index}-06-01`, endDate: `${2031 + index}-05-31` })), year(99, { collegeId: 8, academicYearName: 'Other college year' })]
 mount(); const table = await directory(); expect(within(table).getAllByRole('row')).toHaveLength(6); expect(screen.queryByText('Other college year')).toBeNull(); expect(eventBus.emit).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button', { name: 'Next' })); expect(screen.getByText('Page 2 of 2')).toBeTruthy()
 fireEvent.click(screen.getByRole('button', { name: 'Start Date' })); expect(screen.getByText('Page 1 of 2')).toBeTruthy(); expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toContain('2030 - 2031')
 fireEvent.click(screen.getByRole('button', { name: 'Edit 2030 - 2031' })); await screen.findByRole('dialog', { name: 'Edit Academic Year' }); expect(screen.getByRole('textbox', { name: 'Academic Year Title' }).value).toBe('2030 - 2031')
})
test('search, status pills, applied indicators and clear retain existing filter semantics', async () => {
 fixture.rows.push(year(2, { academicYearName: '2020 - 2021', startDate: '2020-06-01', endDate: '2021-05-31', status: 'ARCHIVED' }))
 mount(); await directory(); fireEvent.click(screen.getByRole('button', { name: /^Filters/ })); fireEvent.click(screen.getByRole('button', { name: 'Archived' }))
 expect(screen.queryByRole('button', { name: 'Edit 2030 - 2031' })).toBeNull(); expect(screen.getByRole('status').textContent).toContain('ARCHIVED')
 fireEvent.change(screen.getByLabelText('Search academic years'), { target: { value: 'No match' } }); await screen.findByRole('heading', { name: 'No academic years found.' })
 fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' })); await directory(); expect(screen.getByLabelText('Search academic years').value).toBe('')
})
test('loading is distinct from empty and errors expose manual retry without enabling generation', async () => {
 const pending = deferred(); academicYearApi.getAll.mockReturnValueOnce(pending.promise); mount()
 expect(screen.getByRole('status').textContent).toContain('Loading academic years'); expect(screen.queryByRole('table')).toBeNull()
 await act(async () => pending.reject(new Error('Unable to read years.'))); expect(screen.getByRole('alert').textContent).toContain('Unable to read years.'); expect(screen.getByRole('button', { name: 'Generate Academic Year' }).disabled).toBe(true)
 expect(screen.queryByText('No academic years found.')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await directory(); expect(academicYearApi.getAll).toHaveBeenCalledTimes(2)
})
test('missing college blocks reads and setup mutations', async () => {
 writeCollege(''); mount(); await screen.findByRole('heading', { name: 'Select a college to view academic years.' }); expect(academicYearApi.getAll).not.toHaveBeenCalled()
 expect(screen.getByRole('button', { name: 'Add Academic Year' }).disabled).toBe(true); expect(screen.getByRole('button', { name: 'Generate Academic Year' }).disabled).toBe(true)
})
test.each(['success', 'failure'])('late %s responses cannot replace the new college or finish its loading state', async outcome => {
 const old = deferred(), next = deferred(); academicYearApi.getAll.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
 const { rerender } = mount(); await waitFor(() => expect(academicYearApi.getAll).toHaveBeenCalledTimes(1)); writeCollege('8'); rerender(tree()); await waitFor(() => expect(academicYearApi.getAll).toHaveBeenCalledTimes(2))
 await act(async () => outcome === 'success' ? old.resolve([year()]) : old.reject(new Error('Old college failure')))
 expect(screen.getByRole('status').textContent).toContain('Loading academic years'); expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryByRole('alert')).toBeNull()
 await act(async () => next.resolve([year(8, { collegeId: 8, academicYearName: 'New college year' })])); await directory(); expect(screen.getByRole('button', { name: 'New college year' })).toBeTruthy(); expect(screen.queryByRole('button', { name: '2030 - 2031' })).toBeNull()
})
test('shared form retains explicit validation, required fields and associated inline errors', async () => {
 mount(); const dialog = await openAdd(); fireEvent.click(within(dialog).getByRole('button', { name: 'Add Academic Year' }))
 expect(screen.getByRole('textbox', { name: 'Academic Year Title' }).required).toBe(true); expect(screen.getByText('Academic year title is required.')).toBeTruthy(); expect(screen.getByRole('textbox', { name: 'Academic Year Title' }).getAttribute('aria-invalid')).toBe('true')
 expect(screen.getByText('Start date is required.')).toBeTruthy(); expect(screen.getByText('End date is required.')).toBeTruthy(); expect(academicYearApi.create).not.toHaveBeenCalled()
})
test.each([
 ['duplicate title', '2030 - 2031', '2032-06-01', '2033-05-31', 'This academic year already exists.'],
 ['overlap', 'Overlapping year', '2030-08-01', '2031-08-01', 'This date range overlaps an existing academic year.'],
 ['reversed dates', 'Invalid range', '2032-06-01', '2032-05-31', 'End date must be after start date.'],
])('existing %s validation prevents API submission', async (_case, name, start, end, message) => {
 mount(); const dialog = await openAdd(); fill(name, start, end); fireEvent.click(within(dialog).getByRole('button', { name: 'Add Academic Year' })); await screen.findByText(message); expect(academicYearApi.create).not.toHaveBeenCalled()
})
test('create retains the existing payload and prevents double submission while saving', async () => {
 const pending = deferred(); academicYearApi.create.mockReturnValueOnce(pending.promise); mount(); const dialog = await openAdd(); fill(); fireEvent.click(screen.getByRole('checkbox', { name: /Enable auto activation/ }))
 fireEvent.click(within(dialog).getByRole('button', { name: 'Add Academic Year' })); expect(screen.getByRole('button', { name: 'Saving...' }).disabled).toBe(true); fireEvent.click(screen.getByRole('button', { name: 'Saving...' })); expect(academicYearApi.create).toHaveBeenCalledTimes(1)
 expect(academicYearApi.create.mock.calls[0][0]).toEqual({ name: '2032 - 2033', academicYearName: '2032 - 2033', startDate: '2032-06-01', endDate: '2033-05-31', StartDate: '2032-06-01', EndDate: '2033-05-31', autoActivate: true })
 await act(async () => pending.resolve(year(90, { academicYearName: '2032 - 2033', startDate: '2032-06-01', endDate: '2033-05-31' }))); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(eventBus.emit).toHaveBeenCalledExactlyOnceWith(ERP_EVENTS.ACADEMIC_UPDATED)
})
test('save failures retain the edited values and display API feedback inside the form', async () => {
 academicYearApi.create.mockRejectedValueOnce(new Error('Academic year could not be saved.')); mount(); const dialog = await openAdd(); fill(); fireEvent.click(within(dialog).getByRole('button', { name: 'Add Academic Year' }))
 await screen.findByText('Academic year could not be saved.'); expect(screen.getByRole('textbox', { name: 'Academic Year Title' }).value).toBe('2032 - 2033'); expect(screen.getByRole('dialog')).toBeTruthy()
})
test('edit uses the existing identifier and cancel closes without creating a record', async () => {
 mount(); await directory(); fireEvent.click(screen.getByRole('button', { name: 'Edit 2030 - 2031' })); fill('Renamed year', '2030-06-01', '2031-05-31'); fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
 await waitFor(() => expect(academicYearApi.update).toHaveBeenCalledTimes(1)); expect(academicYearApi.update.mock.calls[0][0]).toBe('1'); expect(academicYearApi.update.mock.calls[0][1].academicYearName).toBe('Renamed year')
 await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); const dialog = await openAdd(); fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' })); expect(academicYearApi.create).not.toHaveBeenCalled()
})
test('present and archived cycles retain their edit restrictions and read-only details flow', async () => {
 fixture.rows = [year(1, { academicYearName: '2026 - 2027', startDate: '2026-06-01', endDate: '2027-05-31', status: 'ACTIVE' }), year(2, { academicYearName: '2020 - 2021', startDate: '2020-06-01', endDate: '2021-05-31', status: 'ARCHIVED' })]
 mount(); await directory(); expect(screen.getByRole('button', { name: 'Edit 2026 - 2027' }).disabled).toBe(true); expect(screen.getByRole('button', { name: 'Edit 2020 - 2021' }).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button', { name: '2026 - 2027' })); await waitFor(() => expect(academicYearApi.getById).toHaveBeenCalledWith('1')); expect(screen.queryByRole('textbox')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: /Back/ })); await directory()
})
test('activation remains explicit and calls the existing status endpoint by year ID', async () => {
 mount(); await directory(); fireEvent.click(screen.getByRole('button', { name: 'Activate 2030 - 2031' })); await screen.findByRole('alertdialog'); expect(academicYearApi.activate).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button', { name: 'Activate' })); await waitFor(() => expect(academicYearApi.activate).toHaveBeenCalledWith('1')); await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
})
test.each(['students', 'lookup failure', 'clear'])('archiving preserves the %s dependency check', async outcome => {
 fixture.rows = [year(1, { academicYearName: '2026 - 2027', startDate: '2026-06-01', endDate: '2027-05-31', status: 'ACTIVE' })]
 if (outcome === 'students') studentApi.getAll.mockResolvedValue([{ studentId: 1 }])
 if (outcome === 'lookup failure') studentApi.getAll.mockRejectedValue(new Error('Lookup unavailable'))
 mount(); await directory(); fireEvent.click(screen.getByRole('button', { name: 'Deactivate 2026 - 2027' })); await waitFor(() => expect(studentApi.getAll).toHaveBeenCalledWith({ AcademicYearId: 1 }))
 if (outcome === 'clear') { fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' })); await waitFor(() => expect(academicYearApi.deactivate).toHaveBeenCalledWith('1')) }
 else { await act(async () => {}); expect(screen.queryByRole('alertdialog')).toBeNull(); expect(academicYearApi.deactivate).not.toHaveBeenCalled(); if (outcome === 'students') expect(showDeactivationBlocked).toHaveBeenCalled() }
})
test('first-cycle generation retains its existing annual DTO and manual confirmation', async () => {
 fixture.rows = []; mount(); await screen.findByRole('heading', { name: 'No academic years found.' }); fireEvent.click(screen.getByRole('button', { name: 'Generate Academic Year' }))
 fireEvent.change(screen.getByLabelText('Academic year start date'), { target: { value: '2032-06-01' } }); expect(academicYearApi.create).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Generate Cycle' }))
 await waitFor(() => expect(academicYearApi.create).toHaveBeenCalledWith({ name: '2032 - 2033', startDate: '2032-06-01', endDate: '2033-05-31', autoActivate: false })); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})
test('next-cycle generation retains its annual dates, state and API contract', async () => {
 mount(); await directory(); fireEvent.click(screen.getByRole('button', { name: 'Generate Next Year' })); expect(screen.getByRole('dialog').textContent).toContain('2031 - 2032'); fireEvent.click(screen.getByRole('button', { name: 'Generate Cycle' }))
 await waitFor(() => expect(academicYearApi.create).toHaveBeenCalledTimes(1)); expect(academicYearApi.create.mock.calls[0][0]).toEqual({ name: '2031 - 2032', startDate: '2031-06-01', endDate: '2032-05-31', status: 'UPCOMING', autoActivate: false })
})
test('generation failure keeps the dialog open with existing college-specific 403 feedback', async () => {
 academicYearApi.create.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 })); mount(); await directory(); fireEvent.click(screen.getByRole('button', { name: 'Generate Next Year' })); fireEvent.click(screen.getByRole('button', { name: 'Generate Cycle' }))
 await screen.findByText(/Access denied for College 7 \(ID: 7\)/); expect(screen.getByRole('dialog')).toBeTruthy()
})
test.each(['light', 'dark'])('shared form and overflow table retain theme compatibility in %s mode', async theme => {
 document.documentElement.dataset.theme = theme; mount(); await directory(); expect(screen.getByRole('region', { name: 'Academic year directory' }).classList.contains('erp-data-table')).toBe(true)
 const dialog = await openAdd(); expect(dialog.querySelector('.erp-form-layout.ay-editor')).toBeTruthy(); expect(dialog.querySelector('.erp-form-group__fields')).toBeTruthy(); expect(dialog.querySelectorAll('input[required]')).toHaveLength(3)
})
