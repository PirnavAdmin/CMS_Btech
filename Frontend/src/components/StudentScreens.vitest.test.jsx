import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StudentAdmission from '../pages/student-management/StudentAdmission/StudentAdmission'
import StudentProfile from '../pages/student-management/StudentProfile/StudentProfile'
import { studentAdmissionApi, studentProfilesApi, studentFeeApi, studentAdmissionStatusApi } from '../api/apiEndpoints'
import { createEmptyCanonicalStudent } from '../utils/studentCanonicalModel'
import { uploadAdmissionDocuments, admissionDecisionAllowed } from '../utils/admissionDocumentWorkflow'
import { studentIntegrationFees } from '../utils/studentIntegrationFees'
import { resetAdmissionAcademicDependents } from '../utils/admissionAcademicMapping'
import StudentDocumentActions from './StudentDocumentActions'
import { studentDocumentApi } from '../api/apiEndpoints'
const state = vi.hoisted(() => ({ edit: true, rows: [] }))
vi.mock('../layouts/DashboardLayout', () => ({ default: ({ children }) => children }))
vi.mock('../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => state.edit }) }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '7', selectedCollege: { name: 'Engineering College' }, selectedAcademicYearId: '2', selectedAcademicYear: { name: '2026-2027' } }) }))
vi.mock('../hooks/useCollegeState', async () => { const { useState } = await import('react'); return { default: useState } })
vi.mock('../hooks/useToastState', async () => { const { useState } = await import('react'); return { default: useState } })
vi.mock('../utils/exportProvenance', () => ({ isApiResult: () => true }))
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button>, PrintDetailsButton: () => null }))
vi.mock('../components/SearchableSelect', () => ({ ProjectSelect: props => <select {...props} /> }))
vi.mock('../auth/collegeApi', async original => ({ ...await original(), getColleges: vi.fn(async () => []), getSemesters: vi.fn(async () => []) }))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(),
  studentAdmissionApi: { getAll: vi.fn(), getById: vi.fn(), update: vi.fn(async () => ({})), create: vi.fn(), submit: vi.fn() },
  studentProfilesApi: { getAll: vi.fn(), preview: vi.fn(), update: vi.fn() },
  studentAcademicDetailsApi: { get: vi.fn(async () => null), update: vi.fn(async () => ({})) },
  studentPreviousEducationApi: { get: vi.fn(async () => null), update: vi.fn(async () => ({})) },
  studentParentApi: { get: vi.fn(async () => null), update: vi.fn(async () => ({})) },
  studentDocumentApi: { getAll: vi.fn(async () => []), upload: vi.fn(), download: vi.fn() },
  studentFeeApi: { getSummary: vi.fn(async () => ({})), getStructure: vi.fn(async () => ({})) },
  studentAdmissionStatusApi: { get: vi.fn(async () => ({ status: 'SUBMITTED' })), update: vi.fn() },
  feeCollectionApi: { allPending: vi.fn(async () => []), allHistory: vi.fn(async () => []) },
  admissionFeePlanApi: { getMatching: vi.fn(async () => []) },
  academicYearApi: { getAll: vi.fn(async () => []) }, courseApi: { getAll: vi.fn(async () => []) }, branchApi: { getAll: vi.fn(async () => []), getByCourse: vi.fn(async () => []) },
}))
const record = (id = 1, status = 'DRAFT') => {
  const row = createEmptyCanonicalStudent()
  return { ...row, id, admissionId: id, studentId: 10 + id, status,
    personal: { ...row.personal, firstName: `Student ${id}`, lastName: 'Kumar', gender: 'Male', dob: '2005-01-01', aadhaar: `23456789012${id}` },
    contact: { ...row.contact, mobile: '9876543210', email: 'student@example.com', sameAddress: true, currentAddress: { line1: 'College Road', town: 'Hyderabad', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500001' } },
    academic: { ...row.academic, academicYearId: 2, academicYear: '2026-2027', course: 'B.Tech', courseId: 3, branch: 'CSE', branchId: 4, admissionType: 'Regular / Counselling' },
    admission: { ...row.admission, collegeId: 7, college: 'Engineering College' },
  }
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); state.edit = true; state.rows = [record()]
  window.history.replaceState({}, '', '/')
  global.ResizeObserver = class { observe() {} disconnect() {} }
  studentAdmissionApi.getAll.mockImplementation(async () => state.rows)
  studentAdmissionApi.getById.mockImplementation(async id => state.rows.find(row => String(row.admissionId) === String(id)))
  studentProfilesApi.getAll.mockImplementation(async () => state.rows)
  studentProfilesApi.preview.mockImplementation(async () => state.rows[0])
  studentFeeApi.getSummary.mockResolvedValue({}); studentFeeApi.getStructure.mockResolvedValue({})
  studentAdmissionStatusApi.get.mockResolvedValue({ status: 'SUBMITTED' })
})
afterEach(cleanup)
const mount = (path = '/student-management/admissions') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/student-management/admissions/new" element={<StudentAdmission />} /><Route path="/student-management/admissions/*" element={<StudentAdmission />} /><Route path="/student-management/admissions/:id" element={<StudentAdmission />} /><Route path="/student-management/admissions/:id/edit" element={<StudentAdmission />} /><Route path="/student-management/admissions/:id/approval" element={<StudentAdmission />} /><Route path="/student-management/profiles" element={<StudentProfile />} /></Routes></MemoryRouter>)

test('admission directory searches, sorts and reports API failures with retry', async () => {
  studentAdmissionApi.getAll.mockRejectedValueOnce(new Error('Directory unavailable'))
  mount(); await screen.findByText('Directory unavailable'); fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByRole('button', { name: /View details for Student 1/ })
  fireEvent.change(screen.getByPlaceholderText(/Search name/), { target: { value: 'no match' } })
  expect(screen.getByText('No admission applications found')).toBeTruthy()
})
test('read-only directory hides create, edit and approval actions', async () => {
  state.edit = false; state.rows = [record(1, 'SUBMITTED')]; mount()
  await screen.findByRole('button', { name: /View details for/ })
  expect(screen.queryByRole('button', { name: 'New Admission' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Review application' })).toBeNull()
})
test('direct admission detail links open a cancellable shared dialog above the list', async () => {
  mount('/student-management/admissions/1'); const dialog = await screen.findByRole('dialog', { name: 'Admission Details' })
  await within(dialog).findByText('Student 1 Kumar')
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByRole('button', { name: /View details for/ })).toBeTruthy()
})
test('new admission validates required personal fields before creation', async () => {
  mount('/student-management/admissions/new'); fireEvent.click(await screen.findByRole('button', { name: /Save & Continue/ }))
  await waitFor(() => expect(screen.getAllByText('This field is required.').length).toBeGreaterThan(0))
  expect(studentAdmissionApi.create).not.toHaveBeenCalled()
})
test('loaded personal values persist while navigating backward and forward', async () => {
  mount('/student-management/admissions/1/edit')
  const first = await screen.findByLabelText(/First Name/)
  await waitFor(() => expect(first.value).toBe('Student 1'))
  fireEvent.change(first, { target: { value: 'Updated' } }); fireEvent.click(screen.getByRole('button', { name: /Save & Continue/ }))
  await screen.findByText('Academic Enrollment'); fireEvent.click(screen.getByRole('button', { name: 'Go to previous admission step' }))
  expect(screen.getByLabelText(/First Name/).value).toBe('Updated')
  expect(studentAdmissionApi.create).not.toHaveBeenCalled()
})
test('direct form load failure blocks saving and offers retry', async () => {
  studentAdmissionApi.getById.mockRejectedValueOnce(new Error('Record unavailable'))
  mount('/student-management/admissions/1/edit'); await screen.findByText('Record unavailable')
  expect(screen.queryByRole('button', { name: /Save & Continue/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await screen.findByLabelText(/First Name/)
})
test('document partial failure preserves successful uploads and retry skips them', async () => {
  const documents = { first: { file: new File(['a'], 'first.pdf') }, second: { file: new File(['b'], 'second.pdf') } }
  const upload = vi.fn().mockResolvedValueOnce({ id: 1, fileName: 'first.pdf' }).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ id: 2 })
  const save = (item, saved) => { documents[item.key] = saved }
  await expect(uploadAdmissionDocuments(11, documents, [['first','First'],['second','Second']], upload, save)).rejects.toThrow('Second: Offline')
  expect(documents.first.id).toBe(1); expect(documents.first.file).toBeUndefined(); expect(documents.second.file).toBeInstanceOf(File)
  await uploadAdmissionDocuments(11, documents, [['first','First'],['second','Second']], upload, save)
  expect(upload).toHaveBeenCalledTimes(3)
})
test('documents without student identity remain pending and cannot report upload success', async () => {
  const upload = vi.fn()
  await expect(uploadAdmissionDocuments(null, { proof: { file: new File(['x'],'proof.pdf') } }, [['proof','Proof']], upload, vi.fn())).rejects.toThrow('student identity')
  expect(upload).not.toHaveBeenCalled()
})
test('Student Integration fee values preserve zero and authoritative totals', () => {
  const fees = studentIntegrationFees({ firstYearTotal: 100, amountPaid: 0, balanceAmount: 100, tuitionFee: 80, admissionFee: 20 }, { feeStructureId: 8 })
  expect(fees).toMatchObject({ totalFee: 100, paidAmount: 0, balanceAmount: 100, configured: true, balanceVerified: true })
  expect(studentIntegrationFees({})).toMatchObject({ configured: false, balanceVerified: false, totalFee: 0, paidAmount: null })
})
test('approval transitions require permissions and a reviewable backend status', () => {
  expect(admissionDecisionAllowed('SUBMITTED','APPROVED',true)).toBe(true)
  expect(admissionDecisionAllowed('APPROVED','APPROVED',true)).toBe(false)
  expect(admissionDecisionAllowed('SUBMITTED','APPROVED',false)).toBe(false)
  expect(admissionDecisionAllowed('DRAFT','APPROVED',true)).toBe(false)
})
test('student directory opens details without dropping the directory and closes cleanly', async () => {
  state.rows = [record(1,'APPROVED')]; mount('/student-management/profiles')
  fireEvent.click(await screen.findByRole('button', { name: /View profile for Student 1/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Student Details' })
  expect(screen.getByRole('region', { name: 'Student directory' })).toBeTruthy()
  fireEvent(dialog, new Event('cancel', { cancelable: true })); expect(screen.queryByRole('dialog')).toBeNull()
})

test('parent changes clear invalid semester and section placement without altering personal values', () => {
  const previous = record()
  previous.academic = { ...previous.academic, departmentId: 5, semesterId: 6, sectionId: 9 }
  const next = { ...previous, academic: { ...previous.academic, departmentId: 8 } }
  const result = resetAdmissionAcademicDependents(next, previous, 'academic.departmentId')
  expect(result.academic).toMatchObject({ courseId: '', branchId: '', semesterId: '', sectionId: '' })
  expect(result.personal).toBe(previous.personal)
})

test('reviewable admissions expose confirmation and call the existing approval API', async () => {
  state.rows = [record(1,'SUBMITTED')]
  studentAdmissionStatusApi.update.mockResolvedValue({ status: 'APPROVED' })
  mount('/student-management/admissions/1/approval')
  const dialog = await screen.findByRole('dialog', { name: 'Admission Review' })
  await within(dialog).findByText('Student 1 Kumar')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Decision' }))
  const approve = within(dialog).getByRole('button', { name: 'Approve Admission' })
  expect(approve.disabled).toBe(true)
  fireEvent.click(within(dialog).getByRole('checkbox', { name: /I have reviewed/ }))
  fireEvent.click(approve)
  const confirmation = await screen.findByRole('dialog', { name: 'Approve Student Admission?' })
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Approve Admission' }))
  await waitFor(() => expect(studentAdmissionStatusApi.update).toHaveBeenCalledWith('1', { status: 'APPROVED', remarks: '' }))
})

test('no configured fee structure is an unavailable state instead of fabricated amounts', async () => {
  state.rows = [record(1,'APPROVED')]; mount('/student-management/profiles')
  fireEvent.click(await screen.findByRole('button', { name: /View profile for/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Student Details' })
  await waitFor(() => expect(within(dialog).queryByText('Loading complete student details...')).toBeNull())
  fireEvent.click(within(dialog).getByRole('button', { name: 'Fees' }))
  expect(within(dialog).getByText('No applicable active fee structure')).toBeTruthy()
  expect(within(dialog).queryByText('₹54,000')).toBeNull()
})

test('fee API failure is shown explicitly on the student fee tab', async () => {
  state.rows = [record(1,'APPROVED')]
  studentFeeApi.getSummary.mockRejectedValue(new Error('Fees offline'))
  mount('/student-management/profiles')
  fireEvent.click(await screen.findByRole('button', { name: /View profile for/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Student Details' })
  await waitFor(() => expect(within(dialog).queryByText('Loading complete student details...')).toBeNull())
  fireEvent.click(within(dialog).getByRole('button', { name: 'Fees' }))
  expect(within(dialog).getByText('Fee information unavailable')).toBeTruthy()
})

test('submission status-read failure retries the saved submission without creating or submitting again', async () => {
  studentAdmissionApi.submit.mockResolvedValue({ admissionId: 1, studentId: 11, status: 'SUBMITTED' })
  studentAdmissionStatusApi.get.mockRejectedValueOnce(new Error('Status temporarily unavailable')).mockResolvedValue({ status: 'SUBMITTED' })
  mount({ pathname: '/student-management/admissions/1/edit', state: { admissionWizard: { admissionId: 1, step: 6 } } })
  fireEvent.click(await screen.findByRole('checkbox', { name: /Registration Declaration/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }))
  const confirmation = await screen.findByRole('dialog', { name: 'Confirm Registration Submission' })
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm & Submit' }))
  await screen.findByText('Status temporarily unavailable')
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm & Submit' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(studentAdmissionApi.submit).toHaveBeenCalledOnce()
  expect(studentAdmissionApi.create).not.toHaveBeenCalled()
})

test('document download errors stay visible and do not fabricate a URL', async () => {
  studentDocumentApi.download.mockRejectedValue(new Error('Download unavailable'))
  render(<StudentDocumentActions document={{ id: 2, name: 'proof.pdf' }} studentId={11} />)
  expect(screen.queryByRole('link')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Download' }))
  await screen.findByRole('alert')
  expect(screen.getByText('Download unavailable')).toBeTruthy()
  expect(studentDocumentApi.download).toHaveBeenCalledWith(11, 2)
})
