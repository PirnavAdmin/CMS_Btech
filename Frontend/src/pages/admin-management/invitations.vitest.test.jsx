import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { UserDirectory } from './UserAccessManagement'
import { canResendInvitation, resolveOnboardingConflict } from './invitationRecovery'
import { userDirectoryApi } from '../../api/apiEndpoints'
vi.mock('../../api/apiEndpoints', async original => ({ ...await original(), userDirectoryApi: { getAll: vi.fn(), invitations: vi.fn(), onboardCollege: vi.fn(), resendInvitation: vi.fn(), resetPassword: vi.fn() } }))
vi.mock('../../layouts/DashboardLayout.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../context/AcademicContext.jsx', () => ({ AcademicProvider: ({ children }) => <>{children}</> }))
const invitation = { invitationId: 71, userId: 71, fullName: 'College Admin', email: 'admin@example.test', mobile: '9876543210', collegeId: 9, collegeCode: 'ABC', collegeName: 'ABC College', invitationStatus: 'Pending Invitation', emailStatus: 'Failed', roleName: 'College Administrator', createdAt: '2026-11-03T06:00:00Z' }
const payload = { email: 'admin@example.test', mobile: '9876543210', collegeCode: 'ABC' }
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); userDirectoryApi.getAll.mockResolvedValue([]); userDirectoryApi.invitations.mockResolvedValue([invitation]); userDirectoryApi.resendInvitation.mockResolvedValue({ message: 'Provider accepted; delivery unconfirmed.' }) })
test('recovery requires an unambiguous email, mobile and server college-code association', () => {
 expect(resolveOnboardingConflict([invitation], payload).match).toEqual(invitation)
 for (const changed of [{ collegeCode: 'OTHER' }, { mobile: '0000000000' }, { invitationStatus: 'Accepted' }, { collegeId: null }, { invitationId: null }]) expect(resolveOnboardingConflict([{ ...invitation, ...changed }], payload).match).toBeUndefined()
 expect(resolveOnboardingConflict([invitation, { ...invitation, userId: 72 }], payload).match).toBeUndefined()
})
test('expired and failed invitations can be recovered; accepted and unavailable accounts cannot', () => {
 for (const invitationStatus of ['Expired', 'Email Failed', 'Not Created', 'Pending Invitation']) expect(canResendInvitation({ ...invitation, invitationStatus })).toBe(true)
 for (const invitationStatus of ['Accepted', 'Unavailable', 'Unknown']) expect(canResendInvitation({ ...invitation, invitationStatus })).toBe(false)
})
async function review() {
 render(<UserDirectory />); await screen.findByText('Live account data'); fireEvent.click(screen.getByRole('button', { name: /Invite User/ }));
 const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
 change('Full Name', 'College Admin'); change('Official Email Address', payload.email); change('Mobile Number', payload.mobile);
 fireEvent.click(screen.getByRole('button', { name: 'Next' }));
 for (const [label, value] of [['College Name', 'ABC College'], ['College Code', 'ABC'], ['University Name', 'University'], ['Address', 'College Road'], ['City', 'Hyderabad'], ['State', 'Telangana'], ['Pincode', '500001']]) change(label, value)
 fireEvent.click(screen.getByRole('button', { name: 'Next' })); fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }));
}
test('first onboarding makes one creation request and uses the server email status message', async () => {
 userDirectoryApi.onboardCollege.mockResolvedValue({ message: 'Provider accepted; delivery unconfirmed.' }); await review();
 await screen.findByText('Provider accepted; delivery unconfirmed.'); expect(userDirectoryApi.onboardCollege).toHaveBeenCalledTimes(1); expect(userDirectoryApi.resendInvitation).not.toHaveBeenCalled()
})
test.each([409, 502])('conflict or committed email failure %s requires explicit recovery, never automatic resend', async status => {
 userDirectoryApi.onboardCollege.mockRejectedValue(Object.assign(new Error('Onboarding conflict'), { status })); await review();
 const view = await screen.findByRole('button', { name: 'View Existing Invitation' }); expect(userDirectoryApi.resendInvitation).not.toHaveBeenCalled(); expect(userDirectoryApi.resetPassword).not.toHaveBeenCalled();
 fireEvent.click(view); const dialog = screen.getByRole('dialog', { name: 'Invitation details' }); expect(within(dialog).getByText('ABC')).toBeTruthy();
 fireEvent.click(within(dialog).getByRole('button', { name: 'Resend Invitation' })); await waitFor(() => expect(userDirectoryApi.resendInvitation).toHaveBeenCalledWith(71));
 expect(userDirectoryApi.onboardCollege).toHaveBeenCalledTimes(1)
})
test('unrelated college email conflict never exposes recovery or triggers password reset', async () => {
 userDirectoryApi.invitations.mockResolvedValue([{ ...invitation, collegeCode: 'OTHER' }]); userDirectoryApi.onboardCollege.mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
 await review(); await screen.findByText(/Its college association or invitation status does not match/); expect(screen.queryByRole('button', { name: 'View Existing Invitation' })).toBeNull(); expect(userDirectoryApi.resendInvitation).not.toHaveBeenCalled(); expect(userDirectoryApi.resetPassword).not.toHaveBeenCalled()
})
test('pending section shows metadata, prevents repeated clicks, and displays provider failure', async () => {
 let reject; userDirectoryApi.resendInvitation.mockImplementation(() => new Promise((_, fail) => { reject = fail }));
 render(<UserDirectory />); await screen.findByText('Live account data'); fireEvent.click(screen.getByRole('button', { name: 'Pending Invitations' }));
 expect(screen.getByRole('columnheader', { name: 'Last email attempt' })).toBeTruthy(); const button = screen.getByRole('button', { name: 'Resend Invitation' }); fireEvent.click(button); fireEvent.click(button);
 expect(userDirectoryApi.resendInvitation).toHaveBeenCalledTimes(1); expect(button.disabled).toBe(true); reject(new Error('Email provider failed'));
 await screen.findByText('Email provider failed'); await waitFor(() => expect(userDirectoryApi.invitations.mock.calls.length).toBeGreaterThan(1))
})

test('explicit saved-account delivery failure cannot recover a different user/college association', () => {
 expect(resolveOnboardingConflict([invitation], payload, { userId: 41, collegeId: 106 }).match).toBeUndefined();
 expect(resolveOnboardingConflict([invitation], payload, { userId: 71, collegeId: 9 }).match).toEqual(invitation);
})
test('delivery failure shows saved IDs and blocks repeat onboarding when invitation lookup is unavailable', async () => {
 userDirectoryApi.invitations.mockRejectedValue(new Error('Invitation lookup unavailable'));
 userDirectoryApi.onboardCollege.mockRejectedValue(Object.assign(new Error('Account saved (User ID 41, College ID 106); do not repeat onboarding. Reference: a212f14f2017446dacd443bca8be859e.'), { status: 502, invitationFailure: { userId: 41, collegeId: 106, accountSaved: true } }));
 await review();
 await screen.findByText(/Account saved \(User ID 41, College ID 106\)/);
 expect(screen.getByRole('button', { name: 'Send Invitation' }).disabled).toBe(true);
 expect(userDirectoryApi.onboardCollege).toHaveBeenCalledTimes(1);
 expect(userDirectoryApi.resendInvitation).not.toHaveBeenCalled();
})
