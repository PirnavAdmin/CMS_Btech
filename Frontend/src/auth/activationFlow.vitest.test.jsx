import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ActivateAccount, Login } from '../pages/Pages'
import { completeAccountSetup, login } from '../api/apiEndpoints'
import { signIn } from './auth'

vi.mock('../api/apiEndpoints', async original => ({ ...await original(), login: vi.fn() }))
vi.mock('./auth', async original => ({ ...await original(), signIn: vi.fn() }))
const token = 'test-invitation-token-'.repeat(2)
const link = `/activate-account?loginId=COLLEGE-ADMIN-41&token=${token}`
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
beforeEach(() => {
 vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear()
 vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener() {}, removeListener() {} })))
 vi.stubGlobal('fetch', vi.fn(async () => response({ success: true, message: 'Account activated' })))
 login.mockReset().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', roles: ['COLLEGE_ADMIN'], user: { role: 'admin', profileCompleted: false }, mustChangePassword: false })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.documentElement.removeAttribute('data-theme') })
function Location() { const current = useLocation(); return <output data-testid="location">{current.pathname + current.search}</output> }
const mount = (url = link) => render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/activate-account" element={<><ActivateAccount /><Location /></>} /><Route path="/login" element={<><Login /><Location /></>} /><Route path="/my-profile" element={<Location />} /><Route path="/dashboard" element={<Location />} /></Routes></MemoryRouter>)
const fill = (password = 'CorrectHorse123!', confirmation = password) => {
 fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } })
 fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirmation } })
}

test.each(['light', 'dark'])('invitation uses the login form structure and readable fields in %s theme', theme => {
 localStorage.setItem('pirnav-theme', theme); const { container } = mount()
 expect(container.querySelector('form.login-form.account-setup__form')).toBeTruthy(); expect(screen.getByLabelText('Login ID').value).toBe('COLLEGE-ADMIN-41'); expect(screen.getByLabelText('Login ID').readOnly).toBe(true)
 expect(screen.getByText('At least 12 characters; maximum 72 UTF-8 bytes.')).toBeTruthy(); expect(document.documentElement.dataset.theme).toBe(theme)
 expect(screen.queryByLabelText('Invitation token')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Show new password' })); expect(screen.getByLabelText('New password').type).toBe('text')
})
test('missing invitation credentials provide a recovery state rather than an unusable form', () => {
 mount('/activate-account?loginId=COLLEGE-ADMIN-41'); expect(screen.getByRole('heading', { name: 'Open your invitation link' })).toBeTruthy(); expect(screen.queryByRole('button', { name: /Activate/ })).toBeNull(); expect(fetch).not.toHaveBeenCalled()
})
test.each([
 ['short', 'short', 'Use at least 12 characters for your password.'],
 ['CorrectHorse123!', 'DifferentPassword123', 'Passwords do not match.'],
 ['é'.repeat(37), 'é'.repeat(37), 'Password must not exceed 72 UTF-8 bytes. Use fewer characters.'],
])('password policy errors are visible and block submission (%s)', (password, confirmation, message) => {
 mount(); fill(password, confirmation); fireEvent.click(screen.getByRole('button', { name: 'Set Password & Activate' })); expect(screen.getByRole('alert').textContent).toBe(message); expect(fetch).not.toHaveBeenCalled()
})
test('activation sends the exact anonymous contract, locks repeated clicks and clears the used URL token', async () => {
 const pending = deferred(); fetch.mockReturnValueOnce(pending.promise); localStorage.setItem('btech-access-token', 'unrelated-session'); mount(); fill()
 fireEvent.click(screen.getByRole('button', { name: 'Set Password & Activate' })); fireEvent.click(screen.getByRole('button', { name: 'Activating account...' })); expect(fetch).toHaveBeenCalledTimes(1)
 const [url, options] = fetch.mock.calls[0]; expect(url).toContain('/api/v1/auth/complete-account-setup'); expect(options.headers.Authorization).toBeUndefined(); expect(JSON.parse(options.body)).toEqual({ loginId: 'COLLEGE-ADMIN-41', token, newPassword: 'CorrectHorse123!', confirmNewPassword: 'CorrectHorse123!' })
 await act(async () => pending.resolve(response({ success: true }))); await screen.findByRole('heading', { name: 'Account activated' }); expect(screen.getByTestId('location').textContent).toBe('/activate-account'); expect(signIn).not.toHaveBeenCalled(); expect(localStorage.getItem('btech-access-token')).toBe('unrelated-session')
})
test('a rejected or expired invitation retains feedback without refreshing another session', async () => {
 fetch.mockResolvedValueOnce(response({ success: false, message: 'Setup link is invalid or expired.' }, 401)); mount(); fill(); fireEvent.click(screen.getByRole('button', { name: 'Set Password & Activate' }))
 await screen.findByText('Setup link is invalid or expired.'); expect(fetch).toHaveBeenCalledTimes(1); expect(screen.queryByRole('heading', { name: 'Account activated' })).toBeNull(); expect(screen.getByTestId('location').textContent).toContain('/activate-account?')
})
test('unconfirmed or non-JSON responses never report successful activation', async () => {
 fetch.mockResolvedValueOnce(response({ message: 'Proxy response' })); mount(); fill(); fireEvent.click(screen.getByRole('button', { name: 'Set Password & Activate' })); await screen.findByText(/Account activation was not confirmed/); expect(screen.queryByRole('heading', { name: 'Account activated' })).toBeNull()
 await expect(completeAccountSetup({ loginId: 'id', token, newPassword: 'password', confirmNewPassword: 'password' })).resolves.toEqual({ success: true, message: 'Account activated' })
})
test('HTML and network failures are recoverable and cannot activate an account', async () => {
 const payload = { loginId: 'COLLEGE-ADMIN-41', token, newPassword: 'CorrectHorse123!', confirmNewPassword: 'CorrectHorse123!' }
 fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError('Not JSON') } })
 await expect(completeAccountSetup(payload)).rejects.toThrow('Account activation was not confirmed')
 fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
 await expect(completeAccountSetup(payload)).rejects.toThrow('Account setup could not be reached')
 expect(signIn).not.toHaveBeenCalled()
})
test.each(['COLLEGE-ADMIN-41', 'admin@example.edu'])('activation supports password sign-in with %s without OTP and preserves the profile-completion redirect', async identifier => {
 mount(); fill(); fireEvent.click(screen.getByRole('button', { name: 'Set Password & Activate' })); fireEvent.click(await screen.findByRole('button', { name: 'Continue to Sign In' }))
 expect(screen.getByLabelText(/Email.*Mobile.*ID/i).value).toBe('COLLEGE-ADMIN-41')
 fireEvent.change(screen.getByLabelText(/Email.*Mobile.*ID/i), { target: { value: identifier } })
 fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'CorrectHorse123!' } }); fireEvent.click(screen.getByRole('button', { name: 'Login to Digital Campus' }))
 await waitFor(() => expect(login).toHaveBeenCalledWith({ identifier, password: 'CorrectHorse123!', rememberMe: false })); expect(signIn).toHaveBeenCalledTimes(1); await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/my-profile?profileSetup=1'))
 expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][0]).toContain('/complete-account-setup')
})
