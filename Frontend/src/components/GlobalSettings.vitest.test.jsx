import { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AcademicContext from '../context/AcademicContext'
import GlobalSettings from '../pages/settings/GlobalSettings.jsx'
import AcademicContextSelect from './AcademicContextSelect.jsx'
import HeaderAcademicYear from './HeaderAcademicYear.jsx'
const access = vi.hoisted(() => ({ view: true, create: false, apply: vi.fn(), retry: vi.fn() }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../context/AcademicContext', async () => { const { createContext, useContext } = await import('react'); const context = createContext(null); return { default: context, useAcademic: () => useContext(context) } })
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canView: () => access.view, canAction: () => access.create, access: {isSuperAdmin:true} }) }))
const colleges = [{ id: '7', name: 'College A' }, { id: '8', name: 'College B' }]
const years = [{ id: '9', name: 'Configured year A' }, { id: '10', name: 'Configured year B' }]
function Harness({ overrides = {}, withHeader = false }) {
  const [selection, setSelection] = useState({ selectedCollegeId: '7', selectedAcademicYearId: '9' })
  const value = { isSuperAdmin: true, ...selection, activeColleges: colleges, academicYears: years, selectedCollege: colleges.find(row => row.id === selection.selectedCollegeId), selectedAcademicYear: years.find(row => row.id === selection.selectedAcademicYearId), loading: false, error: '', refreshHierarchy: access.retry,
    applyAcademicContext: async (collegeId, yearId) => { access.apply(collegeId, yearId); setSelection({ selectedCollegeId: collegeId, selectedAcademicYearId: collegeId === selection.selectedCollegeId ? yearId : '' }) }, ...overrides }
  return <MemoryRouter><AcademicContext.Provider value={value}>{withHeader && <header aria-label="Application context"><AcademicContextSelect kind="college" compact /><HeaderAcademicYear /></header>}<GlobalSettings /></AcademicContext.Provider></MemoryRouter>
}
beforeEach(() => { vi.clearAllMocks(); access.view = true; access.create = false })
afterEach(cleanup)

test('settings and header selectors share changes in both directions', async () => {
  render(<Harness withHeader />)
  const header = within(screen.getByRole('banner', { name: 'Application context' }))
  const main = within(screen.getByRole('main'))
  fireEvent.change(main.getByLabelText('Change academic year'), { target: { value: '10' } })
  await waitFor(() => expect(header.getByLabelText('Change academic year').textContent).toContain('Configured year B'))
  fireEvent.click(header.getByLabelText('Change academic year'))
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Configured year A' }))
  await waitFor(() => expect(main.getByText(/Selected: College A · Configured year A/)).toBeTruthy())
  fireEvent.click(header.getByLabelText('Change college'))
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'College B' }))
  await waitFor(() => expect(main.getByLabelText('Change college').value).toBe('8'))
  expect(main.getByLabelText('Change academic year').value).toBe('')
})
test('working selectors update without reload and stay separate from backend activation', async () => {
  render(<Harness />)
  fireEvent.change(screen.getByLabelText('Change academic year'), { target: { value: '10' } })
  await waitFor(() => expect(screen.getByText(/Selected: College A · Configured year B/)).toBeTruthy())
  expect(access.apply).toHaveBeenCalledWith('7', '10')
  fireEvent.change(screen.getByLabelText('Change college'), { target: { value: '8' } })
  await waitFor(() => expect(screen.getByText(/Selected: College B · No academic year/)).toBeTruthy())
  expect(screen.getByText(/does not activate or deactivate/)).toBeTruthy()
})
test('configuration links and create actions respect supplied permissions', () => {
  const { rerender } = render(<Harness />)
  expect(screen.getByRole('link', { name: 'View college profile' }).getAttribute('href')).toBe('/college-profile')
  expect(screen.queryByRole('link', { name: 'Add college' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Add academic year' })).toBeNull()
  access.create = true; rerender(<Harness />)
  expect(screen.queryByRole('link', { name: 'Add college' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Add academic year' }).getAttribute('href')).toBe('/academic-year-management?action=add')
  access.view = false; rerender(<Harness />)
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.getByText('No configuration access')).toBeTruthy()
})

test('three configuration areas reuse existing management routes and require a college for year creation', () => {
  access.create = true
  render(<Harness overrides={{ selectedCollegeId: '', selectedCollege: null }} />)
  for (const name of ['Working Context', 'College Profile', 'Academic Year Configuration']) expect(screen.getByRole('region', { name })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Configure academic years' }).getAttribute('href')).toBe('/academic-year-management')
  expect(screen.queryByRole('link', { name: 'Add academic year' })).toBeNull()
})
test('loading, empty and failed context are distinct and failed context can retry', () => {
  const { rerender } = render(<Harness overrides={{ loading: true }} />)
  expect(screen.getByText('Loading authorized academic context…')).toBeTruthy()
  expect(screen.queryByLabelText('Change college')).toBeNull()
  rerender(<Harness overrides={{ activeColleges: [], academicYears: [] }} />)
  expect(screen.getByText('No colleges available.')).toBeTruthy()
  expect(screen.getByText('No academic years available.')).toBeTruthy()
  rerender(<Harness overrides={{ error: 'Context unavailable' }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(access.retry).toHaveBeenCalledOnce()
})
