import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AcademicContext from '../context/AcademicContext.jsx'
import { SettingsConfiguration } from '../pages/settings/SettingsConfiguration.jsx'
import { NumberSeriesEdit, NumberSeriesManagement } from '../pages/settings/NumberSeriesManagement.jsx'

vi.mock('../layouts/DashboardLayout.jsx', () => ({ default: ({ children }) => children }))
vi.mock('../auth/ScreenAccess.jsx', () => ({ useScreenAccess: () => ({ canView: path => !['/fees', '/templates'].includes(path), canAction: () => false }) }))

const context = {
  selectedCollege: { id: 4, name: 'Test College' },
  selectedAcademicYear: { id: 7, name: '2026-27' },
}

function mount(path = '/settings/number-series') {
  return render(<MemoryRouter initialEntries={[path]}><AcademicContext.Provider value={context}><Routes>
    <Route path="/settings/configuration" element={<SettingsConfiguration />} />
    <Route path="/settings/number-series" element={<NumberSeriesManagement />} />
    <Route path="/settings/number-series/:seriesId/edit" element={<NumberSeriesEdit />} />
  </Routes></AcademicContext.Provider></MemoryRouter>)
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

test('configuration dashboard links supported settings and labels unsupported screens', () => {
  mount('/settings/configuration')
  expect(screen.getByRole('link', { name: /Manage Number Series/ }).getAttribute('href')).toBe('/settings/number-series')
  expect(screen.getByRole('link', { name: /Manage Academic Years/ }).getAttribute('href')).toBe('/academic-year-management')
  expect(screen.getAllByRole('button', { name: 'Not connected' }).every(button => button.disabled)).toBe(true)
  expect(screen.getAllByText('No supported settings API or screen is available.')).toHaveLength(4)
})

test('series directory lists the requested categories without inventing status or next number values', () => {
  mount()
  for (const name of ['Student Admission Number', 'Teaching Staff ID', 'Non-Teaching Staff ID']) expect(screen.getByRole('heading', { name })).toBeTruthy()
  expect(screen.getAllByText('Not connected')).toHaveLength(3)
  expect(screen.getAllByText('Not available from current API')).toHaveLength(3)
  expect(screen.getByText(/Test College/)).toBeTruthy()
  expect(screen.getByText(/2026-27/)).toBeTruthy()
})

test('series search, category and unknown status filters remain clear about unavailable data', () => {
  mount()
  fireEvent.change(screen.getByPlaceholderText('Search series'), { target: { value: 'teaching' } })
  expect(screen.getByRole('heading', { name: 'Teaching Staff ID' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Student Admission Number' })).toBeNull()
  fireEvent.change(screen.getByPlaceholderText('Search series'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'Staff' } })
  expect(screen.getByRole('heading', { name: 'Teaching Staff ID' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Non-Teaching Staff ID' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Student Admission Number' })).toBeNull()
  fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'active' } })
  expect(screen.getByRole('heading', { name: 'No matching number series' })).toBeTruthy()
  expect(screen.getByText(/does not return Active or Inactive status/)).toBeTruthy()
})

test('Edit opens a read-only form and cannot claim persistence without an API', () => {
  mount()
  fireEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0])
  expect(screen.getByRole('heading', { name: 'Configure Student Admission Number' })).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toMatch(/cannot be loaded or saved/)
  expect(screen.getByRole('button', { name: 'Save Configuration' }).disabled).toBe(true)
  expect(screen.getByLabelText('Prefix').closest('fieldset').disabled).toBe(true)
  expect(screen.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe('/settings/number-series')
})

