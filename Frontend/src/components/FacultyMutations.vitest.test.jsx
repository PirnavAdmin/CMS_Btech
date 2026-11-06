import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react'
import { FacultyDocuments, FacultyStatus } from '../pages/faculty/FacultyManagement'
import facultyService from '../services/facultyService'
import { saveFacultyRecord } from '../services/facultySaveWorkflow'
vi.mock('../services/facultyService', async original => ({ ...await original(), default: { getDocuments: vi.fn(), uploadDocument: vi.fn(), deleteDocument: vi.fn(), getStatusHistory: vi.fn(), updateStatus: vi.fn() } }))
beforeEach(() => { vi.clearAllMocks(); facultyService.getDocuments.mockResolvedValue([]); facultyService.getStatusHistory.mockResolvedValue([]) })
afterEach(cleanup)
test('photo failure preserves real identity and successful profile for retry', async () => {
  const api = { create: vi.fn(async () => ({ id: 9 })), update: vi.fn(async () => ({ id: 9 })), createProfile: vi.fn(async () => ({})), updateProfile: vi.fn(async () => ({})), uploadProfilePhoto: vi.fn().mockRejectedValueOnce(new Error('Upload offline')).mockResolvedValue({}) }
  const progress = {}, data = { fullName: 'Faculty', photoFile: new File(['photo'], 'photo.png') }
  await expect(saveFacultyRecord(api, data, 7, progress)).rejects.toThrow('Upload offline')
  expect(progress).toMatchObject({ id: '9', profileExists: true })
  await saveFacultyRecord(api, data, 7, progress)
  expect(api.create).toHaveBeenCalledOnce(); expect(api.createProfile).toHaveBeenCalledOnce(); expect(api.updateProfile).toHaveBeenCalledOnce()
  expect(api.uploadProfilePhoto).toHaveBeenCalledTimes(2)
})
test('profile failure retries the existing employee without creating a duplicate', async () => {
  const api = { create: vi.fn(async () => ({ facultyId: 8 })), update: vi.fn(async () => ({ id: 8 })), createProfile: vi.fn().mockRejectedValueOnce(new Error('Invalid profile')).mockResolvedValue({}), updateProfile: vi.fn(), uploadProfilePhoto: vi.fn() }
  const progress = {}
  await expect(saveFacultyRecord(api, {}, 7, progress)).rejects.toThrow('Invalid profile')
  await saveFacultyRecord(api, {}, 7, progress)
  expect(api.create).toHaveBeenCalledOnce(); expect(api.update).toHaveBeenCalledWith('8', {})
})
test('missing employee identity blocks another create attempt', async () => {
  const api = { create: vi.fn(async () => ({})) }, progress = {}
  await expect(saveFacultyRecord(api, {}, 7, progress)).rejects.toThrow('did not return its ID')
  await expect(saveFacultyRecord(api, {}, 7, progress)).rejects.toThrow('Verify the directory')
  expect(api.create).toHaveBeenCalledOnce()
})
test('document upload failure keeps selected file available for retry', async () => {
  facultyService.uploadDocument.mockRejectedValueOnce(new Error('Document offline')).mockResolvedValue({ id: 1 })
  render(<FacultyDocuments facultyId="9" canEdit />)
  await screen.findByText('No uploaded documents available for this faculty.')
  fireEvent.change(screen.getByLabelText('Document Title'), { target: { value: 'Degree' } })
  fireEvent.change(screen.getByLabelText('Select File'), { target: { files: [new File(['degree'], 'degree.pdf')] } })
  fireEvent.submit(document.querySelector('.fm-doc-upload-grid'))
  await screen.findByText('Document offline'); fireEvent.submit(document.querySelector('.fm-doc-upload-grid'))
  await waitFor(() => expect(facultyService.uploadDocument).toHaveBeenCalledTimes(2))
})
test('document deletion propagates failure and preserves the saved list', async () => {
  facultyService.getDocuments.mockResolvedValue([{ id: 1, documentName: 'Degree' }]); facultyService.deleteDocument.mockRejectedValue(new Error('Delete denied'))
  render(<FacultyDocuments facultyId="9" canEdit />); await screen.findByRole('button', { name: 'Delete document' })
  fireEvent.click(screen.getByRole('button', { name: 'Delete document' })); fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await screen.findByText('Delete denied'); expect(screen.getAllByText('Degree').length).toBeGreaterThan(0)
})
test('status API failure does not publish a successful status change', async () => {
  const changed = vi.fn(); facultyService.updateStatus.mockRejectedValueOnce(new Error('Status denied')).mockResolvedValue({})
  render(<FacultyStatus faculty={{ id: '9', employmentStatus: 'Working' }} canEdit onChanged={changed} />)
  fireEvent.change(screen.getByLabelText('Change Status'), { target: { value: 'On Leave' } })
  fireEvent.change(screen.getByLabelText('Reason for Status Change'), { target: { value: 'Approved leave' } })
  fireEvent.click(screen.getByRole('button', { name: 'Update Status' })); await screen.findByText('Status denied')
  expect(changed).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Update Status' }))
  await waitFor(() => expect(changed).toHaveBeenCalledWith('On Leave'))
  expect(facultyService.updateStatus).toHaveBeenLastCalledWith('9', { status: 'On Leave', reason: 'Approved leave' })
})
test('read-only document and status panels hide mutation forms', async () => {
  render(<><FacultyDocuments facultyId="9" /><FacultyStatus faculty={{ id: '9', employmentStatus: 'Working' }} onChanged={vi.fn()} /></>)
  expect(screen.queryByRole('button', { name: 'Upload Document' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Update Status' })).toBeNull()
})
