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

test('searches, applies and clears directory filters, exports, and paginates real rows', async () => {
  const exams = Array.from({ length: 9 }, (_, index) => ({
    examId: index + 1,
    examName: `Engineering Exam ${index + 1}`,
    examCode: `ENG-${index + 1}`,
    academicYearId: 1,
    examTypeId: index === 0 ? 51 : 50,
    branchName: 'Computer Science',
    semesterName: 'Semester 1',
    startDate: '2026-12-01',
    endDate: '2026-12-10',
    status: 'Scheduled',
  }))
  list.mockImplementation(async path => {
    if (path === 'exam-types') return [{ examTypeId: 50, name: 'Mid Term Examination' }]
    if (path === 'exams') return exams
    return []
  })

  render(<UnifiedExamManagement />)
  await screen.findByText('Engineering Exam 1')
  expect(screen.queryByText('Engineering Exam 9')).toBeNull()
  fireEvent.change(screen.getByLabelText('Search examinations'), { target: { value: 'Engineering Exam 2' } })
  expect(screen.getByText('Engineering Exam 2')).toBeTruthy()
  expect(screen.queryByText('Engineering Exam 3')).toBeNull()
  fireEvent.change(screen.getByLabelText('Search examinations'), { target: { value: '' } })

  fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
  fireEvent.change(screen.getByLabelText('Examination Type'), { target: { value: '50' } })
  fireEvent.change(screen.getByLabelText('Academic Year'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'scheduled' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))
  expect(screen.getByRole('button', { name: /Filters3 filters applied/ })).toBeTruthy()
  expect(screen.getByText('8 records')).toBeTruthy()
  expect(screen.queryByText('Engineering Exam 1')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }))
  expect(screen.getByLabelText('Search examinations').value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Export Examinations' }))
  expect(screen.getByRole('button', { name: 'Download CSV' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(screen.getByText('Engineering Exam 9')).toBeTruthy()
})

test('shows the failed endpoint and a retry action instead of an empty list', async () => {
  const requestError = Object.assign(new Error('The examination service is unavailable.'), { requestPath: '/api/v1/exams', status: 503, backendMessage: 'The examination service is unavailable.' })
  let examRequestCount = 0
  list.mockImplementation(async path => {
    if (path === 'exams') {
      examRequestCount += 1
      if (examRequestCount === 1) throw requestError
      await new Promise(resolve => setTimeout(resolve, 40))
    }
    return []
  })
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})

  render(<UnifiedExamManagement />)
  expect(await screen.findByText('Unable to load examinations')).toBeTruthy()
  expect(screen.getByText("We couldn't fetch examination records. Please try again.")).toBeTruthy()
  expect(screen.queryByText(/\/api\/v1\/exams|service is unavailable|database|SQL/)).toBeNull()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  expect(screen.queryByText('No matching examinations')).toBeNull()
  expect(log).toHaveBeenCalledWith('[Exam Management] Data request failed', expect.objectContaining({ requestPath: '/api/v1/exams', collegeId: 8, academicYearId: 1 }))
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  const retryingButton = await screen.findByRole('button', { name: 'Retrying…' })
  expect(retryingButton.disabled).toBe(true)
  expect(await screen.findByText('No matching examinations')).toBeTruthy()
  log.mockRestore()
})


test('a denied faculty lookup does not discard fetched examinations', async () => {
  list.mockImplementation(async path => path === 'exams' ? [{examId:7,examName:'Saved examination',academicYearId:1,status:true}] : []);
  const original = call.getMockImplementation();
  call.mockImplementation(async (path, options) => { if (path === 'faculty') throw Object.assign(new Error('Forbidden'),{status:403,requestPath:'/api/v1/faculty'}); return original(path,options) });
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  render(<UnifiedExamManagement/>);
  expect(await screen.findByText('Saved examination')).toBeTruthy();
  expect(await screen.findByText(/Faculty directory. Saved examinations remain available/)).toBeTruthy();
  expect(screen.queryByText('Unable to load examinations')).toBeNull();
  expect(screen.getByRole('button',{name:'Retry related information'})).toBeTruthy();
  log.mockRestore();
});
