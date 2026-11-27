import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { profileApi } from '../../api/apiEndpoints'
import MyAcademics from './MyAcademics'

vi.mock('../../api/apiEndpoints', () => ({ API_BASE_URL: '', profileApi: { getProfile: vi.fn() } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

test('shows authenticated academic details and honest unavailable states', async () => {
  profileApi.getProfile.mockResolvedValue({ fullName: 'Asha', registrationNumber: 'REG-01', course: 'BTech', department: 'Computing', academicYear: '2026-2027' })
  render(<MemoryRouter><MyAcademics /></MemoryRouter>)
  expect(await screen.findByText('Asha')).toBeTruthy()
  expect(screen.getByText('REG-01')).toBeTruthy()
  expect(screen.getAllByText('BTech')).toHaveLength(2)
  expect(within(screen.getByRole('region', { name: 'Subject Details' })).getByText(/subject list is not available/i)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Download List' }).disabled).toBe(true)
  expect(screen.getByRole('button', { name: 'View Curriculum' }).disabled).toBe(true)
})

test('shows an error when the profile cannot be loaded', async () => {
  profileApi.getProfile.mockRejectedValue(new Error('Profile unavailable'))
  render(<MemoryRouter><MyAcademics /></MemoryRouter>)
  expect((await screen.findByRole('alert')).textContent).toContain('Profile unavailable')
})
