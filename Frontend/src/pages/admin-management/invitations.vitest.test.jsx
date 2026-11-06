import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { UserDirectory } from './UserAccessManagement'
import { canResendInvitation, resolveOnboardingConflict } from './invitationRecovery'
import { userDirectoryApi } from '../../api/apiEndpoints'
import { inviteCollegeAccount, readAccountDetails } from '../../services/clientOnboardingService'
vi.mock('../../api/apiEndpoints', async original => ({ ...await original(), userDirectoryApi: { getAll: vi.fn(), lookups: vi.fn(), update: vi.fn(), setStatus: vi.fn(), activity: vi.fn(), invitations: vi.fn(), onboardCollege: vi.fn(), resendInvitation: vi.fn(), resetPassword: vi.fn() } }))
const permissions = vi.hoisted(() => ({ create: true, edit: true, export: true, platform: true }))
vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ access: { isSuperAdmin: permissions.platform }, canAction: (_path, action) => permissions[action] ?? true }) }))
vi.mock('../../services/clientOnboardingService', async original => ({ ...await original(), inviteCollegeAccount: vi.fn(), readAccountDetails: vi.fn(), readAccountAccess: vi.fn(), saveAccountAccess: vi.fn() }))
vi.mock('../../components/ExportMenu', () => ({ default: ({ rows }) => <output data-testid="export-rows">{rows.map(row => row.userId || row.invitationId).join(',')}</output> }))
vi.mock('../../layouts/DashboardLayout.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../context/AcademicContext.jsx', () => ({ AcademicProvider: ({ children }) => <>{children}</> }))
const invitation = { invitationId: 71, userId: 71, fullName: 'College Admin', email: 'admin@example.test', mobile: '9876543210', collegeId: 9, collegeCode: 'ABC', collegeName: 'ABC College', invitationStatus: 'Pending Invitation', emailStatus: 'Failed', roleName: 'College Administrator', createdAt: '2026-11-03T06:00:00Z' }
const payload = { email: 'admin@example.test', mobile: '9876543210', collegeCode: 'ABC' }
test('a setup email failure preserves the saved account and closes the edit workflow', async () => {
 userDirectoryApi.getAll.mockResolvedValue([{ ...invitation, userId: 71, roleId: 2, designation: 'Administrator', accountStatus: 'Active' }])
 userDirectoryApi.update.mockResolvedValue({ userId: 71 })
 userDirectoryApi.resetPassword.mockRejectedValue(new Error('Provider unavailable'))
 render(<UserDirectory />)
 fireEvent.click(await screen.findByRole('button', { name: 'Edit College Admin' }))
 const dialog = screen.getByRole('dialog', { name: 'Edit College Admin' })
 fireEvent.click(within(dialog).getByRole('button', { name: 'Save and send setup link' }))
 await screen.findByText(/Account details were saved\. The password setup request could not be confirmed/)
 expect(screen.queryByRole('dialog', { name: 'Edit College Admin' })).toBeNull()
 expect(userDirectoryApi.update).toHaveBeenCalledOnce()
 expect(userDirectoryApi.resetPassword).toHaveBeenCalledWith(71)
 expect(screen.queryByText(/setup link sent/)).toBeNull()
})
afterEach(cleanup)
beforeEach(() => { vi.resetAllMocks(); userDirectoryApi.getAll.mockResolvedValue([]); userDirectoryApi.invitations.mockResolvedValue([invitation]); userDirectoryApi.resendInvitation.mockResolvedValue({ message: 'Provider accepted; delivery unconfirmed.' }) })
beforeEach(() => {
  Object.assign(permissions, { create: true, edit: true, export: true, platform: true })
  userDirectoryApi.lookups.mockResolvedValue({ colleges: [{ collegeId: 9, collegeCode: 'ABC', collegeName: 'ABC College' }], roles: [{ roleId: 2, collegeId: 9, roleName: 'College Administrator' }] })
})
test('recovery requires an unambiguous email, mobile and server college-code association', () => {
 expect(resolveOnboardingConflict([invitation], payload).match).toEqual(invitation)
 for (const changed of [{ collegeCode: 'OTHER' }, { mobile: '0000000000' }, { invitationStatus: 'Accepted' }, { collegeId: null }, { invitationId: null }]) expect(resolveOnboardingConflict([{ ...invitation, ...changed }], payload).match).toBeUndefined()
 expect(resolveOnboardingConflict([invitation, { ...invitation, userId: 72 }], payload).match).toBeUndefined()
})
test('expired and failed invitations can be recovered; accepted and unavailable accounts cannot', () => {
 for (const invitationStatus of ['Expired', 'Email Failed', 'Not Created', 'Pending Invitation']) expect(canResendInvitation({ ...invitation, invitationStatus })).toBe(true)
 for (const invitationStatus of ['Accepted', 'Unavailable', 'Unknown']) expect(canResendInvitation({ ...invitation, invitationStatus })).toBe(false)
})
test('backend resend restrictions and cooldowns cannot be overridden by a pending label', () => {
 expect(canResendInvitation({ ...invitation, canResend: false })).toBe(false)
 expect(canResendInvitation({ ...invitation, retryAfterSeconds: 30 })).toBe(false)
 expect(resolveOnboardingConflict([{ ...invitation, canResend: false }], payload).match?.userId).toBe(71)
})
async function review() {
 render(<UserDirectory />); await screen.findByRole('heading', { name: 'User Access Management' }); await waitFor(() => expect(userDirectoryApi.getAll).toHaveBeenCalled()); fireEvent.click(screen.getByRole('button', { name: /Invite User/ }));
 const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
 change('Full Name', 'College Admin'); change('Official Email Address', payload.email); change('Mobile Number', payload.mobile);
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Next' }));
 for (const [label, value] of [['College Name', 'ABC College'], ['College Code', 'ABC'], ['University Name', 'University'], ['Address', 'College Road'], ['City', 'Hyderabad'], ['State', 'Telangana'], ['Pincode', '500001']]) change(label, value)
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Next' })); fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }));
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
 render(<UserDirectory />); await screen.findByRole('heading', { name: 'User Access Management' }); await waitFor(() => expect(userDirectoryApi.getAll).toHaveBeenCalled()); fireEvent.click(screen.getByRole('button', { name: 'Pending Invitations' }));
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

test('existing-college invitation selects verified college and role without creating a college', async () => {
  inviteCollegeAccount.mockResolvedValue({ message: 'Provider accepted the setup request.' })
  render(<UserDirectory />)
  fireEvent.click(await screen.findByRole('button', { name: /Invite User/ }))
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Reviewer' } })
  fireEvent.change(screen.getByLabelText('Official Email Address'), { target: { value: 'reviewer@example.test' } })
  fireEvent.change(screen.getByLabelText('Mobile Number'), { target: { value: '9876543211' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Next' }))
  fireEvent.change(screen.getByLabelText('College setup'), { target: { value: 'existing' } })
  await screen.findByRole('option', { name: 'ABC College' })
  fireEvent.change(screen.getByLabelText('Existing College'), { target: { value: '9' } })
  fireEvent.change(screen.getByLabelText('Access Role'), { target: { value: '2' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Next' }))
  fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }))
  await screen.findByText('Provider accepted the setup request.')
  expect(inviteCollegeAccount).toHaveBeenCalledWith(expect.objectContaining({ collegeId: 9, roleId: 2, email: 'reviewer@example.test' }))
  expect(userDirectoryApi.onboardCollege).not.toHaveBeenCalled()
})

test('directory filters and export share all matching account records', async () => {
  userDirectoryApi.getAll.mockResolvedValue([
    { userId: 1, collegeId: 9, collegeName: 'ABC College', fullName: 'Reviewer One', roleName: 'Reviewer', accountStatus: 'Active' },
    { userId: 2, collegeId: 10, collegeName: 'Other College', fullName: 'Reviewer Two', roleName: 'Reviewer', accountStatus: 'Active' },
    { userId: 3, collegeId: 9, collegeName: 'ABC College', fullName: 'Faculty Three', roleName: 'Faculty', accountStatus: 'Active' },
  ])
  render(<UserDirectory />)
  await screen.findByRole('button', { name: 'Edit Reviewer One' })
  fireEvent.change(screen.getByLabelText('College'), { target: { value: '9' } })
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Reviewer' } })
  expect(screen.getByTestId('export-rows').textContent).toBe('1')
  expect(screen.queryByRole('button', { name: 'Edit Reviewer Two' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Edit Faculty Three' })).toBeNull()
})

test('status changes require confirmation and the numeric backend status contract', async () => {
  const account = { ...invitation, userId: 71, accountStatus: 'Active' }
  userDirectoryApi.getAll.mockResolvedValue([account])
  userDirectoryApi.setStatus.mockResolvedValue({ success: true })
  render(<UserDirectory />)
  const status = await screen.findByLabelText('Change College Admin status')
  fireEvent.change(status, { target: { value: 'deactivate' } })
  let dialog = screen.getByRole('dialog', { name: 'Confirm account status' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(userDirectoryApi.setStatus).not.toHaveBeenCalled()
  fireEvent.change(status, { target: { value: 'deactivate' } })
  dialog = screen.getByRole('dialog', { name: 'Confirm account status' })
  userDirectoryApi.getAll.mockResolvedValue([{ ...account, accountStatus: 'Suspended' }])
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(userDirectoryApi.setStatus).toHaveBeenCalledWith(71, 0))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

test('read-only users cannot invite, edit or change account status', async () => {
  Object.assign(permissions, { create: false, edit: false, export: false })
  userDirectoryApi.getAll.mockResolvedValue([{ ...invitation, accountStatus: 'Active' }])
  render(<UserDirectory />)
  expect((await screen.findByRole('button', { name: 'Edit College Admin' })).disabled).toBe(true)
  expect(screen.getByRole('button', { name: /Invite User/ }).disabled).toBe(true)
  expect(screen.getByLabelText('Change College Admin status').disabled).toBe(true)
  expect(screen.queryByTestId('export-rows')).toBeNull()
})

test('invitation history includes consumed records and does not enable resend', async () => {
  userDirectoryApi.invitations.mockResolvedValue([{ ...invitation, invitationStatus: 'Accepted' }])
  render(<UserDirectory />)
  await waitFor(() => expect(userDirectoryApi.invitations).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: 'Invitation History' }))
  expect(await screen.findByRole('cell', { name: 'Accepted' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Resend Invitation' }).disabled).toBe(true)
})

test('role replacement preserves omitted module grants and does not offer foreign-college roles', async () => {
  userDirectoryApi.getAll.mockResolvedValue([{ ...invitation, roleId: 2, accountStatus: 'Active' }])
  userDirectoryApi.lookups.mockResolvedValue({ roles: [{ roleId: 3, roleName: 'Global Reviewer', collegeId: null }, { roleId: 99, roleName: 'Foreign Role', collegeId: 10 }] })
  userDirectoryApi.update.mockResolvedValue({ userId: 71 })
  userDirectoryApi.resetPassword.mockResolvedValue({ message: 'Setup requested.' })
  render(<UserDirectory />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit College Admin' }))
  await screen.findByRole('option', { name: 'Global Reviewer' })
  expect(screen.queryByRole('option', { name: 'Foreign Role' })).toBeNull()
  fireEvent.change(screen.getByLabelText('Replace account role'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save and send setup link' }))
  await waitFor(() => expect(userDirectoryApi.update).toHaveBeenCalledOnce())
  expect(userDirectoryApi.update.mock.calls[0][1].roleIds).toEqual([3])
  expect(userDirectoryApi.update.mock.calls[0][1].permissions).toBeUndefined()
})
