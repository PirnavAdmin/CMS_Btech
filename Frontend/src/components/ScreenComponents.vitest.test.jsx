import React, { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DataTable from './DataTable'
import AsyncState from './AsyncState'
import FormLayout, { FormField, FormGroup } from './FormLayout'
import FilterPanel from './FilterPanel'
import PageHeader from './PageHeader'
import StatusBadge from './StatusBadge'
import ViewDialog from './ViewDialog'
import { DetailsField, DetailsGrid } from './EntityDetails'

const dialogMethods = Object.fromEntries(['showModal', 'close'].map(key => [key, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key)]))
afterEach(() => { cleanup(); document.documentElement.removeAttribute('data-theme') })
beforeEach(() => {
 Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function () { this.setAttribute('open', '') } })
 Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function () { this.removeAttribute('open') } })
})
afterEach(() => {
 vi.restoreAllMocks()
 for (const [key, descriptor] of Object.entries(dialogMethods)) {
  if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
  else delete HTMLDialogElement.prototype[key]
 }
})
const rows = [{ id: 'a', name: 'Room 10', capacity: 10 }, { id: 'b', name: 'Room 2', capacity: 2 }, { id: 'c', name: 'Room 1', capacity: 1 }]
const columns = [{ key: 'name', label: 'Name', sortable: true }, { key: 'capacity', label: 'Capacity', sortable: true }]
function TableHarness() {
 const [page, setPage] = useState(1)
 return <DataTable rows={rows} columns={columns} caption="Test directory" pagination={{ page, pageSize: 2, onPageChange: setPage }} rowActions={row => <button onClick={() => setPage(1)}>View {row.name}</button>} />
}
test('table sorts the complete filtered set before paging and preserves row action identity', () => {
 render(<TableHarness />)
 expect(screen.getByText('Page 1 of 2')).toBeTruthy(); expect(screen.queryByText('Room 1')).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: 'Next' })); expect(screen.getByRole('button', { name: 'View Room 1' })).toBeTruthy()
 fireEvent.click(screen.getByRole('button', { name: 'Capacity' })); expect(screen.getByText('Page 1 of 2')).toBeTruthy()
 expect(screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent)).toEqual(['Room 1','Room 2'])
 expect(screen.getByRole('columnheader', { name: 'Capacity' }).getAttribute('aria-sort')).toBe('ascending')
 fireEvent.click(screen.getByRole('button', { name: 'Capacity' })); expect(screen.getAllByRole('row')[1].textContent).toContain('Room 10')
 expect(rows.map(row => row.id)).toEqual(['a','b','c'])
})
test('table clamps a stale page after filtering and uses numeric text sorting', () => {
 const { rerender } = render(<DataTable rows={rows} columns={columns} pagination={{ page: 99, pageSize: 2, onPageChange: vi.fn() }} />)
 expect(screen.getByText('Page 2 of 2')).toBeTruthy()
 rerender(<DataTable rows={rows.slice(0, 1)} columns={columns} pagination={{ page: 99, pageSize: 2, onPageChange: vi.fn() }} />)
 expect(screen.getByText('Page 1 of 1')).toBeTruthy(); expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true)
 rerender(<DataTable rows={rows} columns={columns} />); fireEvent.click(screen.getByRole('button', { name: 'Name' }))
 expect(screen.getAllByRole('row').slice(1).map(row => row.textContent)).toEqual(['Room 11','Room 22','Room 1010'])
})
test('loading and error states hide stale table rows and retry only on user action', () => {
 const retry = vi.fn(), { rerender } = render(<DataTable rows={rows} columns={columns} loading />)
 expect(screen.getByRole('status')).toBeTruthy(); expect(screen.queryByRole('table')).toBeNull()
 rerender(<DataTable rows={rows} columns={columns} error="Service unavailable" onRetry={retry} />)
 expect(screen.getByRole('alert').textContent).toContain('Service unavailable'); expect(screen.queryByRole('table')).toBeNull(); expect(retry).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button', { name: 'Retry' })); expect(retry).toHaveBeenCalledTimes(1)
 rerender(<DataTable rows={[]} columns={columns} emptyState={<AsyncState status="empty" title="Nothing matches" />} />)
 expect(screen.getByRole('heading', { name: 'Nothing matches' })).toBeTruthy(); expect(screen.queryByRole('navigation')).toBeNull()
})
test('unauthorized state never exposes an automatic retry or grants an action', () => {
 const retry = vi.fn(); render(<AsyncState status="unauthorized" message="Contact your administrator." onRetry={retry} />)
 expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.queryByRole('button')).toBeNull(); expect(retry).not.toHaveBeenCalled()
})
test('form fields keep native required validation and connect labels, hints and inline errors', () => {
 const submit = vi.fn(event => event.preventDefault()), cancel = vi.fn()
 render(<FormLayout onSubmit={submit} error="Correct the highlighted field." actions={<><button type="button" onClick={cancel}>Cancel</button><button type="submit">Save</button></>}><FormGroup title="Record details"><FormField label="Code" required hint="Use the assigned code." error="Code already exists"><input defaultValue="" /></FormField></FormGroup></FormLayout>)
 const input = screen.getByRole('textbox', { name: 'Code' }); expect(input.required).toBe(true); expect(input.validity.valueMissing).toBe(true); expect(input.getAttribute('aria-invalid')).toBe('true')
 for (const id of input.getAttribute('aria-describedby').split(' ')) expect(document.getElementById(id)).toBeTruthy()
 fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(cancel).toHaveBeenCalledTimes(1); expect(submit).not.toHaveBeenCalled()
 fireEvent.change(input, { target: { value: 'CSE' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(submit).toHaveBeenCalledTimes(1)
})
function DependentForm() {
 const [course, setCourse] = useState(''), [branch, setBranch] = useState('')
 return <FormLayout><FormGroup title="Scope"><FormField label="Course"><select value={course} onChange={event => { setCourse(event.target.value); setBranch('') }}><option value="">Select</option><option value="course-id">Configured course</option></select></FormField><FormField label="Branch"><select disabled={!course} value={branch} onChange={event => setBranch(event.target.value)}><option value="">Select</option>{course && <option value="branch-id">Configured branch</option>}</select></FormField></FormGroup></FormLayout>
}
test('dependent controls remain owned by the caller and clear invalid selections', () => {
 render(<DependentForm />); expect(screen.getByLabelText('Branch').disabled).toBe(true)
 fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'course-id' } }); fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'branch-id' } })
 expect(screen.getByLabelText('Branch').value).toBe('branch-id'); fireEvent.change(screen.getByLabelText('Course'), { target: { value: '' } }); expect(screen.getByLabelText('Branch').value).toBe('')
})
test('explicit filter slots support selects, dates, applied indicators and clear while closed', () => {
 const clear = vi.fn()
 render(<FilterPanel search={<label>Search<input /></label>} filters={<><label>Status<select><option>Active</option></select></label><label>From date<input type="date" /></label></>} active appliedFilters={['Active']} onClear={clear} />)
 expect(screen.getByLabelText('Search')).toBeTruthy(); expect(screen.queryByLabelText('From date')).toBeNull()
 expect(screen.getByRole('status').textContent).toBe('Applied: Active'); fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' })); expect(clear).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('button', { name: /^Filters/ })); expect(screen.getByLabelText('From date').type).toBe('date'); expect(screen.getByLabelText('Status')).toBeTruthy()
})
test('legacy filter children keep their search input outside the disclosure', () => {
 render(<FilterPanel><div><label>Search<input /></label><label>Status<select><option>Active</option></select></label></div></FilterPanel>)
 expect(screen.getByLabelText('Search')).toBeTruthy(); expect(screen.queryByLabelText('Status')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: /^Filters/ })); expect(screen.getByLabelText('Status')).toBeTruthy()
})
test.each(['light','dark'])('existing header, badges and overflow components render in %s theme', theme => {
 document.documentElement.dataset.theme = theme
 const { container } = render(<MemoryRouter><PageHeader title="Directory" subtitle="Configured records" breadcrumb={[{ label: 'Home', link: '/dashboard' }, 'Directory']} primaryAction={<button>Add</button>} secondaryActions={<button>Export</button>} /><StatusBadge value={false} />{['Active','Inactive','Pending','Approved','Rejected','Completed','Cancelled'].map(status => <StatusBadge key={status} value={status} />)}<DataTable rows={rows} columns={columns} caption="Records" /></MemoryRouter>)
 expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/dashboard'); expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy(); expect(screen.getAllByText('Inactive')).toHaveLength(2)
 expect(screen.getByRole('region', { name: 'Records' }).classList.contains('erp-data-table')).toBe(true); expect(container.querySelectorAll('.erp-status-badge')).toHaveLength(8)
})
test('existing details dialog restores focus and handles close and Escape with read-only fields', () => {
 const close = vi.fn(); const { rerender } = render(<button>Open record</button>); const trigger = screen.getByRole('button'); trigger.focus()
 rerender(<><button>Open record</button><ViewDialog title="Record details" onClose={close}><DetailsGrid><DetailsField label="Code" value="CSE" /></DetailsGrid></ViewDialog></>)
 expect(screen.getByRole('dialog', { name: 'Record details' })).toBeTruthy(); expect(screen.getByText('CSE')).toBeTruthy(); expect(screen.queryByRole('textbox')).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: 'Close details' })); expect(close).toHaveBeenCalledTimes(1)
 fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true })); expect(close).toHaveBeenCalledTimes(2)
 rerender(<button>Open record</button>); expect(document.activeElement).toBe(trigger)
})
