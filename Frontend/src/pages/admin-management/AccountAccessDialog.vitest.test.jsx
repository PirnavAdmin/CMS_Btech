import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AccountAccessDialog from './AccountAccessDialog'
import { readAccountAccess, saveAccountAccess } from '../../services/clientOnboardingService'

vi.mock('../../services/clientOnboardingService', () => ({ readAccountAccess: vi.fn(), saveAccountAccess: vi.fn() }))
const user = { userId: 5, collegeId: 7, fullName: 'Reviewer' }
const grant = { collegeId: 7, moduleKey: 'fees', canView: true, canCreate: true, canEdit: false, canDelete: false, canExport: false }
beforeEach(() => { vi.resetAllMocks(); readAccountAccess.mockResolvedValue([grant]); saveAccountAccess.mockResolvedValue([]) })
afterEach(cleanup)

test('account overrides preserve inherited modules and enforce action dependencies', async () => {
  const close = vi.fn(), saved = vi.fn()
  render(<AccountAccessDialog user={user} canEdit onClose={close} onSaved={saved} />)
  const view = await screen.findByLabelText('Fee Management View')
  fireEvent.click(view)
  expect(screen.getByLabelText('Fee Management Create').checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Save module access' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(saveAccountAccess.mock.calls[0][1]).toEqual([{ moduleKey: 'fees', canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false }])
  expect(saved).toHaveBeenCalledOnce()
})

test('read-only access cannot edit grants or save', async () => {
  render(<AccountAccessDialog user={user} canEdit={false} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect((await screen.findByLabelText('Fee Management View')).disabled).toBe(true)
  expect(screen.queryByRole('button', { name: 'Save module access' })).toBeNull()
})

test('acknowledged save failures lock editing while allowing verification retry', async () => {
  saveAccountAccess.mockImplementationOnce(async (_user, _grants, acknowledgement) => { acknowledgement.current = true; throw new Error('Verification offline') }).mockResolvedValue([])
  const close = vi.fn()
  render(<AccountAccessDialog user={user} canEdit onClose={close} onSaved={vi.fn()} />)
  await screen.findByLabelText('Fee Management View')
  fireEvent.click(screen.getByRole('button', { name: 'Save module access' }))
  await screen.findByText('Verification offline')
  expect(screen.getByLabelText('Fee Management View').disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Retry verification' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})
