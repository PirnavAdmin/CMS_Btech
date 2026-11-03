import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'

beforeEach(() => { vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false }))) })

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })

test.each(['/', '/login'])('%s stays accessible with a saved session and unavailable backend', async path => {
  localStorage.setItem('btech-authenticated', 'true')
  localStorage.setItem('btech-user-role', 'admin')
  localStorage.setItem('btech-access-token', 'offline-test-token')
  const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  vi.stubGlobal('fetch', fetch)
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
  expect(screen.queryByText(/Account access could not be loaded/)).toBeNull()
  expect(fetch).not.toHaveBeenCalled()
})

test('an unavailable workspace preserves navigation and hides protected page data', async () => {
  localStorage.setItem('btech-authenticated', 'true')
  localStorage.setItem('btech-user-role', 'admin')
  localStorage.setItem('btech-access-token', 'offline-test-token')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
  await screen.findByText('Data is temporarily unavailable. Please try again.')
  expect(await screen.findByRole('link', { name: 'Colleges' })).toBeTruthy()
  expect(screen.getByRole('complementary', { name: 'Primary navigation' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: /Welcome back, / })).toBeNull()
  expect(screen.queryByText('Unable to connect to your workspace')).toBeNull()
  await userEvent.click(screen.getByRole('link', { name: 'Departments' }))
  expect(await screen.findByRole('heading', { name: 'Departments' })).toBeTruthy()
  expect(screen.queryByRole('table')).toBeNull()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
})
