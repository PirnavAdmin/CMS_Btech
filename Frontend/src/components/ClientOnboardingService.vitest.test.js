import { beforeEach, expect, test, vi } from 'vitest'
import { inviteCollegeAccount, readAccountAccess, saveAccountAccess } from '../services/clientOnboardingService'
import { call } from '../services/scopedModulesService'

vi.mock('../services/scopedModulesService', async original => ({ ...await original(), call: vi.fn() }))
const user = { userId: 5, collegeId: 7 }
const permissions = [{ moduleKey: 'fees', canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false }]
const response = { data: { user, permissions: permissions.map(row => ({ ...row, collegeId: 7 })) } }
beforeEach(() => vi.resetAllMocks())

test('existing-college invitation uses the verified endpoint and supported identity fields', async () => {
  call.mockResolvedValue({ data: { userId: 5 } })
  await inviteCollegeAccount({ collegeId: '7', roleId: '3', fullName: ' Reviewer ', email: ' a@example.test ', mobile: '' })
  expect(call).toHaveBeenCalledWith('admin/users/invite', { method: 'POST', body: { collegeId: 7, fullName: 'Reviewer', email: 'a@example.test', mobile: null, roleIds: [3] } })
})

test('permissions read refuses a different account or college', async () => {
  call.mockResolvedValue({ data: { user: { userId: 5, collegeId: 8 }, permissions: [] } })
  await expect(readAccountAccess(user)).rejects.toThrow('does not match')
})

test('verification retry reads without repeating an acknowledged grant update', async () => {
  const acknowledgement = { current: false }
  call.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(response)
  await expect(saveAccountAccess(user, permissions, acknowledgement)).rejects.toThrow('Offline')
  await expect(saveAccountAccess(user, permissions, acknowledgement)).resolves.toHaveLength(1)
  expect(call.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1)
})

test('ambiguous grant writes are reconciled rather than repeated', async () => {
  const acknowledgement = { current: false }
  call.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue(response)
  await expect(saveAccountAccess(user, permissions, acknowledgement)).rejects.toThrow('Connection lost')
  await saveAccountAccess(user, permissions, acknowledgement)
  expect(call.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1)
})
