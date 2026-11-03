import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'

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

test.each([
  ['Go to home', /Your engineering journey/i],
  ['Go to login', /Welcome back/i],
])('an unavailable dashboard allows navigation using %s', async (link, heading) => {
  localStorage.setItem('btech-authenticated', 'true')
  localStorage.setItem('btech-user-role', 'admin')
  localStorage.setItem('btech-access-token', 'offline-test-token')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
  await userEvent.click(await screen.findByRole('link', { name: link }))
  expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
})
