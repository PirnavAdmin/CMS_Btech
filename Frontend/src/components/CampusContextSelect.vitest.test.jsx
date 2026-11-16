import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CampusContextSelect from './CampusContextSelect.jsx'

const fixture = vi.hoisted(() => ({
  selectedCollegeId: '7', isSuperAdmin: true, loading: false, list: vi.fn(), refreshHierarchy: vi.fn(),
}))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => fixture }))
vi.mock('../api/apiEndpoints', () => ({ campusApi: { list: fixture.list } }))

beforeEach(() => {
  vi.clearAllMocks()
  fixture.selectedCollegeId = '7'
  fixture.isSuperAdmin = true
  fixture.loading = false
  fixture.refreshHierarchy.mockResolvedValue(undefined)
  localStorage.removeItem('pirnav-campus-selection')
  fixture.list.mockResolvedValue({
    items: [
      { campusId: 1, name: 'Active Campus', isActive: true },
      { campusId: 3, name: 'North Campus', isActive: true },
      { campusId: 2, name: 'Inactive Campus', isActive: false },
    ],
    hasNext: false,
  })
})
afterEach(cleanup)

test('header campus selector only offers active campuses for the selected college', async () => {
  render(<CampusContextSelect />)
  const selector = await screen.findByRole('button', { name: 'Campus' })
  expect(selector.textContent).toContain('Active Campus')
  expect(fixture.list).toHaveBeenCalledWith({
    collegeId: '7', isSuperAdmin: true, pageNumber: 1, pageSize: 100, isActive: true,
  })
  fireEvent.click(selector)
  expect(await screen.findByRole('option', { name: 'Active Campus' })).toBeTruthy()
  fireEvent.click(screen.getByRole('option', { name: 'North Campus' }))
  expect(screen.queryByRole('option', { name: 'Inactive Campus' })).toBeNull()
  await waitFor(() => expect(fixture.refreshHierarchy).toHaveBeenCalledOnce())
  expect(selector.textContent).toContain('North Campus')
  expect(JSON.parse(localStorage.getItem('pirnav-campus-selection'))).toEqual({ collegeId: '7', campusId: '3' })
})
