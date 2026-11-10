import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import UnifiedExamManagement from './UnifiedExamManagement'
import { call, list } from '../../services/scopedModulesService'
import { showSuccess } from '../../utils/toast'

vi.mock('../../layouts/DashboardLayout', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/PageHeader', () => ({ default: ({ title, subtitle, primaryAction }) => <header><h1>{title}</h1><p>{subtitle}</p>{primaryAction}</header> }))
vi.mock('../../components/ViewDialog', () => ({ default: ({ title, subtitle, children, footerContent, onClose }) => <section role="dialog" aria-label={title}><header><h2>{title}</h2><p>{subtitle}</p><button type="button" aria-label="Close details" onClick={onClose}>Close</button></header><div>{children}</div>{footerContent && <footer>{footerContent}</footer>}</section> }))
vi.mock('../../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: 8, selectedAcademicYearId: 1, academicYears: [], loading: false }) }))
vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => true }) }))
vi.mock('../../services/examinationWorkspaceService', () => ({ predefinedExamTypes: ['Mid Term Examination', 'Others'], ensureExamTypeId: vi.fn(async () => 9) }))
vi.mock('../../utils/toast', () => ({ showSuccess: vi.fn() }))
vi.mock('../../services/scopedModulesService', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, call: vi.fn(), list: vi.fn() }
})

const lookups = {
  courses: [{ id: 2, name: 'BTech' }],
  branches: [{ id: 3, courseId: 2, name: 'Computer Science' }],
  semesters: [{ id: 4, courseId: 2, branchId: 3, name: 'Semester 1' }],
  sections: [],
  subjects: [{ id: 5, courseId: 2, branchId: 3, semesterId: 4, name: 'Data Structures', code: 'CS101' }],
  classrooms: [],
  academicYears: [{ id: 1, name: '2026–27' }],
}

beforeEach(() => {
  call.mockImplementation(async (path, options = {}) => {
    if (path === 'exams/lookups') return { data: lookups }
    if (path === 'faculty') return []
    if (path === 'exams' && options.method === 'POST') return { data: { examId: 100 } }
    if (path === 'exams/100/schedules' && options.method === 'POST') return { data: { examScheduleId: 501 } }
    return { data: [] }
  })
  list.mockImplementation(async path => {
    if (path === 'exam-types') return []
    if (path === 'exams') return []
    if (path === 'exam-schedules/hall-allocations') return []
    if (path.endsWith('/schedules')) return []
    return []
  })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

test('shows the form in a modal and only creates after confirmation', async () => {
  render(<UnifiedExamManagement />)
  await screen.findByRole('heading', { name: 'All Examinations' })
  expect(screen.queryByLabelText('Examination Name')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Create Examination' }))
  const formDialog = screen.getByRole('dialog', { name: 'Create Examination' })
  expect(within(formDialog).getByText('Examination Information')).toBeTruthy()
  expect(within(formDialog).getByText('Academic Information')).toBeTruthy()
  expect(within(formDialog).getByText('Examination Schedule')).toBeTruthy()
  expect(within(formDialog).getByText('Allocate Subjects & Set Timetable')).toBeTruthy()

  fireEvent.click(within(formDialog).getByRole('button', { name: 'Create Examination' }))
  expect(await within(formDialog).findByText('Enter an examination name.')).toBeTruthy()
  expect(call).not.toHaveBeenCalledWith('exams', expect.objectContaining({ method: 'POST' }))

  fireEvent.change(within(formDialog).getByLabelText(/Examination Name/), { target: { value: 'Mid Term 2026' } })
  fireEvent.change(within(formDialog).getByLabelText(/Academic Year/), { target: { value: '1' } })
  fireEvent.change(within(formDialog).getByLabelText(/Examination Type/), { target: { value: '__predefined__:Mid Term Examination' } })
  fireEvent.change(within(formDialog).getByLabelText(/Course/), { target: { value: '2' } })
  fireEvent.change(within(formDialog).getByLabelText(/Department/), { target: { value: '3' } })
  fireEvent.change(within(formDialog).getByLabelText(/Semester/), { target: { value: '4' } })
  fireEvent.change(within(formDialog).getByLabelText(/Examination Start Date/), { target: { value: '2026-12-01' } })
  fireEvent.change(within(formDialog).getByLabelText(/Examination End Date/), { target: { value: '2026-12-10' } })
  fireEvent.click(within(formDialog).getByRole('button', { name: 'Add Subject' }))

  const subjectDialog = screen.getByRole('dialog', { name: 'Subject & Timetable' })
  fireEvent.change(within(subjectDialog).getByLabelText(/Subject Name/), { target: { value: '5' } })
  fireEvent.change(within(subjectDialog).getByLabelText(/Exam Date/), { target: { value: '2026-12-03' } })
  fireEvent.change(within(subjectDialog).getByLabelText(/Start Time/), { target: { value: '09:00' } })
  fireEvent.change(within(subjectDialog).getByLabelText(/End Time/), { target: { value: '12:00' } })
  fireEvent.click(within(subjectDialog).getByRole('button', { name: 'Save Subject' }))

  fireEvent.click(within(formDialog).getByRole('button', { name: 'Create Examination' }))
  const confirmation = await screen.findByRole('dialog', { name: 'Confirm Examination Creation' })
  expect(within(confirmation).getByText('Mid Term 2026')).toBeTruthy()
  expect(within(confirmation).getByText('2026–27')).toBeTruthy()
  expect(within(confirmation).getByText('1', { selector: 'dd' })).toBeTruthy()
  expect(call).not.toHaveBeenCalledWith('exams', expect.objectContaining({ method: 'POST' }))

  fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirm & Create' }))
  await waitFor(() => expect(call).toHaveBeenCalledWith('exams', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ examName: 'Mid Term 2026', academicYearId: 1, examTypeId: 9 }) })))
  expect(call.mock.calls.filter(([path, options]) => path === 'exams' && options.method === 'POST')).toHaveLength(1)
  expect(call).toHaveBeenCalledWith('exams/100/schedules', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ subjectId: 5, examDate: '2026-12-03', startTime: '09:00', endTime: '12:00' }) }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create Examination' })).toBeNull())
  expect(screen.getByRole('heading', { name: 'All Examinations' })).toBeTruthy()
  expect(showSuccess).toHaveBeenCalledWith('Examination created successfully')
})
