import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MyProfile from '../pages/profile/MyProfile'
import { profileApi } from '../api/apiEndpoints'

vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(), profileApi: { getProfile: vi.fn(), updateProfile: vi.fn(), uploadPhoto: vi.fn() } }))
vi.mock('./collegeApi', async original => ({ ...await original(), getDepartments: vi.fn(async () => ({ data: [] })) }))
const profile = { id: 41, identifier: 'ADMIN-41', fullName: 'College Administrator', email: 'admin@example.edu', mobile: '9876543210', houseNumber: '12', address: 'Campus Road', pincode: '560001', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', permanentHouseNumber: '12', permanentAddress: 'Campus Road', permanentPincode: '560001', permanentCity: 'Bengaluru', permanentDistrict: 'Bengaluru Urban', permanentState: 'Karnataka', dateOfBirth: '1990-01-01', collegeId: 7, collegeName: 'Test College', role: 'College Admin', profileCompleted: false }
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); profileApi.getProfile.mockReset().mockResolvedValue({ ...profile }); profileApi.updateProfile.mockReset().mockResolvedValue({ ...profile, profileCompleted: true }) })
afterEach(cleanup)
const mount = (path = '/my-profile?profileSetup=1') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/my-profile" element={<MyProfile />} /><Route path="/dashboard" element={<h1>Dashboard reached</h1>} /><Route path="/login" element={<h1>Sign in</h1>} /></Routes></MemoryRouter>)

test('profileSetup route renders the real profile screen and opens required setup without a hook crash', async () => {
 mount('/my-profile?profileSetup=1'); await screen.findByRole('heading', { name: 'My Profile' }); expect(await screen.findByRole('dialog')).toBeTruthy(); expect(screen.getByText(/Complete your profile setup to continue/)).toBeTruthy()
})
test('password setup does not open the profile form before the password stage completes', async () => {
 localStorage.setItem('btech-must-change-password', 'true'); mount('/my-profile?setup=1'); await screen.findByRole('heading', { name: 'My Profile' }); expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByText(/Complete your profile setup to continue/)).toBeNull()
})
test('ordinary completed profile remains viewable without opening the setup editor', async () => {
 profileApi.getProfile.mockResolvedValue({ ...profile, profileCompleted: true }); mount('/my-profile'); await screen.findByRole('heading', { name: 'My Profile' }); expect(screen.queryByRole('dialog')).toBeNull()
})
test('successful setup saves through the existing profile API and advances only after server completion', async () => {
 localStorage.setItem('btech-authenticated', 'true')
 profileApi.getProfile.mockResolvedValueOnce({ ...profile }).mockResolvedValueOnce({ ...profile, profileCompleted: true }); mount(); await screen.findByRole('dialog')
 fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await screen.findByRole('heading', { name: 'Dashboard reached' }); expect(profileApi.updateProfile).toHaveBeenCalledTimes(1); expect(profileApi.updateProfile.mock.calls[0][0]).toMatchObject({ fullName: profile.fullName, email: profile.email, houseNumber: '12' }); expect(localStorage.getItem('btech-profile-completed')).toBe('true')
})
test('an incomplete server response does not bypass the profile setup gate', async () => {
 mount(); await screen.findByRole('dialog'); fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await waitFor(() => expect(profileApi.getProfile).toHaveBeenCalledTimes(2)); expect(screen.queryByRole('heading', { name: 'Dashboard reached' })).toBeNull(); expect(localStorage.getItem('btech-profile-completed')).not.toBe('true')
})

test('missing backend completion status keeps mandatory setup open after a successful save', async () => {
 localStorage.setItem('btech-profile-completed', 'false')
 const statusUnknown = { ...profile }; delete statusUnknown.profileCompleted
 profileApi.getProfile.mockReset().mockResolvedValueOnce(statusUnknown).mockResolvedValueOnce(statusUnknown)
 mount(); await screen.findByRole('dialog'); expect(screen.getByRole('heading', { name: 'Complete Your Profile' })).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); await waitFor(() => expect(screen.getAllByText(/setup completion could not be confirmed/i).length).toBeGreaterThan(0)); expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.queryByRole('heading', { name: 'Dashboard reached' })).toBeNull(); expect(localStorage.getItem('btech-profile-completed')).toBe('false')
})

test('mandatory setup keeps logout available', async () => {
 mount(); await screen.findByRole('dialog'); fireEvent.click(screen.getByRole('button', { name: 'Log out' })); expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
})

test('profile load never displays raw endpoint instructions', async () => {
 profileApi.getProfile.mockRejectedValue(new Error('Complete your profile using PATCH /api/v1/profile or PUT /api/v1/account/profile.'))
 mount(); await screen.findByRole('heading', { name: 'Profile unavailable' }); expect(screen.getByText('Unable to load profile information.')).toBeTruthy(); expect(screen.queryByText(/PATCH \/api\/v1\/profile/)).toBeNull()
})
