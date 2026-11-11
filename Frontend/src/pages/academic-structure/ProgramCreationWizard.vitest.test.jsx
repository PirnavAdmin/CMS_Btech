import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ProgramCreationWizard from './ProgramCreationWizard'
import * as api from '../../auth/collegeApi'
import { saveSemesterSchedules, validateSemesterSchedules, scheduleYear } from './programCreation'

vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => true }) }))
vi.mock('../admin-management/AdminManagement', () => ({ DepartmentManagement: ({ onCreated }) => <div role="dialog" aria-label="Add Department"><button onClick={() => onCreated(2)}>Create Department</button></div> }))
vi.mock('../../auth/collegeApi', () => ({ createCourse: vi.fn(), updateCourse: vi.fn(), getCourses: vi.fn(), createBranch: vi.fn(), updateBranch: vi.fn(), getBranches: vi.fn(), getDepartments: vi.fn(), getSemesters: vi.fn(), createSemester: vi.fn(), updateSemester: vi.fn() }))
let courses, branches, terms, complete
const years = [{ academicYearId: 5, academicYearName: '2026–2027', startDate: '2026-06-01', endDate: '2027-05-31' }]
beforeEach(() => {
  vi.clearAllMocks(); courses = []; branches = []; terms = []; complete = vi.fn()
  api.getCourses.mockImplementation(async () => ({ data: courses }))
  api.getBranches.mockImplementation(async () => ({ data: branches }))
  api.getSemesters.mockImplementation(async () => ({ data: terms }))
  api.getDepartments.mockResolvedValue({ data: [{ departmentId: 2, departmentName: 'Engineering' }] })
  api.createCourse.mockImplementation(async data => { courses.push({ ...data, courseId: 10 }); return { data: courses[0] } })
  api.createBranch.mockImplementation(async data => { branches.push({ ...data, branchId: 100 + branches.length }); return { data: branches.at(-1) } })
  api.createSemester.mockImplementation(async data => { terms.push({ ...data, semesterId: 1000 + terms.length }); return { data: terms.at(-1) } })
  api.updateSemester.mockImplementation(async (id, data) => { terms = terms.map(row => row.semesterId === id ? { ...row, ...data } : row) })
})
afterEach(cleanup)
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const next = async legend => { fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' })); await waitFor(() => expect(screen.getByText(legend, { selector: 'legend' })).toBeTruthy()) }
async function start() {
  render(<ProgramCreationWizard collegeId="7" currentCollege={{ current: '7' }} courses={[]} departments={[]} academicYears={years} onClose={vi.fn()} onComplete={complete} />)
  change('Program Name', 'new')
  for (const [label, value] of [['New Program Name', 'B.Tech'], ['Program Code', 'BTECH'], ['Duration in Years', '1'], ['Total Semesters', '2'], ['Academic Level', 'Undergraduate'], ['Status', 'Active']]) change(label, value)
  await next('Department')
  change('Department', '__new')
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Add Department' })).getByRole('button'))
  await waitFor(() => expect(screen.getByLabelText('Department').value).toBe('2'))
}
async function addBranches() {
  await next('Branch')
  for (const code of ['CSE', 'EEE']) {
    change('Branch Name', code); change('Branch Code', code); change('Branch Status', 'Active')
    fireEvent.click(screen.getByRole('button', { name: 'Add Branch' }))
  }
  await next('Semester Schedule')
}
test('department creation retains the same wizard, saved IDs, back navigation and multiple branches until final submit', async () => {
  await start()
  const dialog = screen.getByRole('dialog', { name: 'Add Program' })
  expect(screen.queryByRole('dialog', { name: 'Add Department' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByLabelText('New Program Name').value).toBe('B.Tech')
  await next('Department'); expect(screen.getByLabelText('Department').value).toBe('2')
  await addBranches()
  expect(screen.queryByLabelText('Academic Year')).toBeNull()
  expect(screen.queryByLabelText('Schedule Status')).toBeNull()
  expect(screen.getAllByLabelText('Status').every(input => input.readOnly && input.value === 'Schedule Not Configured')).toBe(true)
  const dates = screen.getAllByLabelText('Start Date'), ends = screen.getAllByLabelText('End Date')
  for (let i = 0; i < 4; i++) { fireEvent.change(dates[i], { target: { value: i % 2 ? '2026-10-01' : '2026-06-01' } }); fireEvent.change(ends[i], { target: { value: i % 2 ? '2027-03-01' : '2026-09-01' } }) }
  await next('Review & Submit')
  expect(screen.getByRole('dialog', { name: 'Add Program' })).toBe(dialog)
  expect(complete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getAllByLabelText('Start Date')[0].value).toBe('2026-06-01')
  await next('Review & Submit')
  fireEvent.click(screen.getByRole('button', { name: 'Submit Program' }))
  await waitFor(() => expect(complete).toHaveBeenCalledTimes(1))
  expect(api.createCourse).toHaveBeenCalledTimes(1)
  expect(api.createBranch).toHaveBeenCalledTimes(2)
  expect(terms).toHaveLength(4)
  expect(terms.every(row => row.academicYearId === 5 && row.startDate && row.endDate)).toBe(true)
})
test('partial semester failure retains entries and retries only missing records', async () => {
  await start(); await addBranches(); await next('Review & Submit')
  api.createSemester.mockImplementationOnce(async data => { terms.push({ ...data, semesterId: 1 }); return { data: terms[0] } }).mockRejectedValueOnce(new Error('Service unavailable'))
  fireEvent.click(screen.getByRole('button', { name: 'Submit Program' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Service unavailable')
  expect(complete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Submit Program' }))
  await waitFor(() => expect(complete).toHaveBeenCalledOnce())
  expect(api.createCourse).toHaveBeenCalledTimes(1)
  expect(api.createBranch).toHaveBeenCalledTimes(2)
  expect(new Set(terms.map(row => row.branchId + ':' + row.semesterNumber)).size).toBe(4)
})
test('schedule validation rejects missing enabled dates, equal dates, overlap and calendar violations', () => {
  const term = { semesterNumber: 1, semesterName: 'Semester 1', academicYearId: 5, startDate: '', endDate: '', status: '1' }
  const validate = terms => validateSemesterSchedules([{ name: 'CSE', terms }], years)
  expect(validate([term])).toMatch(/both dates/)
  expect(validate([{ ...term, startDate: '2026-06-01', endDate: '2026-06-01' }])).toMatch(/after/)
  expect(validate([{ ...term, startDate: '2025-01-01', endDate: '2026-07-01' }])).toMatch(/academic year/)
  expect(validate([{ ...term, startDate: '2026-06-01', endDate: '2026-09-01' }, { ...term, semesterNumber: 2, startDate: '2026-08-01', endDate: '2027-02-01' }])).toMatch(/overlap/)
  expect(validate([{ ...term, status: '0' }])).toBe('')
})
test('saved schedules require confirmation and are not recreated', async () => {
  terms = [{ semesterId: 5, branchId: 1, courseId: 10, academicYearId: 5, semesterNumber: 1, semesterName: 'Semester 1', startDate: '2026-06-01', endDate: '2026-08-01', status: 0 }]
  const config = { courseId: 10, branches: [{ id: 1, terms: [{ ...terms[0], endDate: '2026-09-01' }] }], list: api.getSemesters, create: api.createSemester, update: api.updateSemester, assertScope: () => {}, confirmOverwrite: () => false }
  await expect(saveSemesterSchedules(config)).rejects.toThrow(/retained/)
  expect(api.updateSemester).not.toHaveBeenCalled()
  await saveSemesterSchedules({ ...config, confirmOverwrite: () => true })
  expect(api.updateSemester).toHaveBeenCalledTimes(1)
  expect(api.createSemester).not.toHaveBeenCalled()
})
test('saved program and department dropdowns reuse their IDs without creating or modifying the program', async () => {
  courses = [{ courseId: 10, collegeId: 7, courseName: 'B.Tech', courseCode: 'BTECH', courseType: 'Undergraduate', durationYears: 1, totalSemesters: 2, departmentId: 2, status: 1 }]
  render(<ProgramCreationWizard collegeId="7" currentCollege={{ current: '7' }} courses={courses} departments={[{ departmentId: 2, departmentName: 'Engineering' }, { departmentId: 3, departmentName: 'Other department' }]} academicYears={years} onClose={vi.fn()} onComplete={complete} />)
  change('Program Name', '10')
  expect(screen.getByLabelText('Program Code').value).toBe('BTECH')
  await next('Department')
  expect(screen.getByLabelText('Department').value).toBe('2')
  expect(within(screen.getByLabelText('Department')).getByRole('option', { name: 'Other department' })).toBeTruthy()
  await next('Branch')
  change('Branch Name', 'CSE'); change('Branch Code', 'CSE'); change('Branch Status', 'Active')
  fireEvent.click(screen.getByRole('button', { name: 'Add Branch' }))
  await next('Semester Schedule')
  expect(api.createBranch).toHaveBeenCalledWith(expect.objectContaining({ courseId: 10, departmentId: 2 }))
  expect(api.createCourse).not.toHaveBeenCalled()
  expect(api.updateCourse).not.toHaveBeenCalled()
})
test('existing programs accept another department and new departments while preserving program identity and metadata', async () => {
  courses = [{ courseId: 10, collegeId: 7, departmentId: 2, courseName: 'B.Tech', courseCode: 'BTECH', courseType: 'Undergraduate', durationYears: 1, totalSemesters: 2, status: 1, description: 'Saved description', eligibility: 'Saved eligibility', courseShortName: 'BT' }]
  api.updateCourse.mockImplementation(async (id, payload) => { courses = courses.map(row => row.courseId === id ? { ...row, ...payload } : row); return { data: courses[0] } })
  render(<ProgramCreationWizard collegeId="7" currentCollege={{ current: '7' }} courses={courses} departments={[{ departmentId: 2, departmentName: 'CSE' }, { departmentId: 3, departmentName: 'ECE' }]} academicYears={years} onClose={vi.fn()} onComplete={complete} />)
  change('Program Name', '10'); await next('Department')
  expect(within(screen.getByLabelText('Department')).getByRole('option', { name: '+ Add New Department' })).toBeTruthy()
  change('Department', '3'); await next('Branch')
  expect(api.updateCourse).toHaveBeenCalledWith(10, expect.objectContaining({ departmentId: null, courseCode: 'BTECH', description: 'Saved description', eligibility: 'Saved eligibility', courseShortName: 'BT' }))
  change('Branch Name', 'Electronics'); change('Branch Code', 'ECE'); change('Branch Status', 'Active')
  fireEvent.click(screen.getByRole('button', { name: 'Add Branch' }))
  await next('Semester Schedule')
  expect(api.createBranch).toHaveBeenCalledWith(expect.objectContaining({ courseId: 10, departmentId: 3 }))
  expect(api.createCourse).not.toHaveBeenCalled()
  await next('Review & Submit')
  fireEvent.click(screen.getByRole('button', { name: 'Submit Program' }))
  await waitFor(() => expect(complete).toHaveBeenCalledOnce())
  expect(terms.every(row => row.courseId === 10 && row.branchId === 100)).toBe(true)
})
test('year mapping uses saved calendar dates, then selected context, and never invents a year', () => {
  const calendars = [...years, { academicYearId: 6, startDate: '2027-06-01', endDate: '2028-05-31' }]
  expect(scheduleYear({ startDate: '2027-07-01', endDate: '2027-12-01' }, calendars, 5)).toBe('6')
  expect(scheduleYear({}, calendars, 5)).toBe('5')
  expect(scheduleYear({}, calendars)).toBe('')
})
test('submission completes with one scheduled semester and remaining semesters left blank', async () => {
  await start(); await addBranches()
  fireEvent.change(screen.getAllByLabelText('Start Date')[0], { target: { value: '2026-11-11' } })
  fireEvent.change(screen.getAllByLabelText('End Date')[0], { target: { value: '2027-03-11' } })
  await next('Review & Submit')
  fireEvent.click(screen.getByRole('button', { name: 'Submit Program' }))
  await waitFor(() => expect(complete).toHaveBeenCalledOnce())
  expect(terms).toHaveLength(4)
  expect(terms.filter(row => !row.startDate && !row.endDate)).toHaveLength(3)
  expect(api.getSemesters.mock.calls.length).toBeLessThanOrEqual(5)
})
test('idempotent POST returning an unscheduled definition is updated using its saved ID', async () => {
  const term = { semesterNumber: 1, yearNumber: 1, semesterName: 'Semester 1', academicYearId: 5, startDate: '2026-11-11', endDate: '2027-03-11', status: '1' }
  api.createSemester.mockImplementationOnce(async data => {
    const existing = { ...data, semesterId: 91, startDate: null, endDate: null, status: 0 }
    terms.push(existing)
    return { data: { data: existing } }
  })
  await saveSemesterSchedules({ courseId: 10, branches: [{ id: 100, terms: [term] }], list: api.getSemesters, create: api.createSemester, update: api.updateSemester, assertScope: () => {}, confirmOverwrite: () => true })
  expect(api.createSemester).toHaveBeenCalledOnce()
  expect(api.updateSemester).toHaveBeenCalledWith(91, expect.objectContaining({ startDate: term.startDate, endDate: term.endDate, status: 1 }))
  expect(terms).toHaveLength(1)
})
test('verification accepts equivalent API status and field casing while preserving date checks', async () => {
  const term = { semesterNumber: 1, semesterName: 'Semester 1', academicYearId: 5, startDate: '2026-11-11', endDate: '2027-03-11', status: '1' }
  const list = vi.fn(async () => ({ data: [{ SemesterId: 91, CourseId: 10, BranchId: 100, AcademicYearId: 5, SemesterNumber: 1, SemesterName: 'Semester 1 ', StartDate: '2026-11-11T00:00:00', EndDate: '2027-03-11T00:00:00', Status: true }] }))
  await saveSemesterSchedules({ courseId: 10, branches: [{ id: 100, terms: [term] }], list, create: api.createSemester, update: api.updateSemester, assertScope: () => {}, confirmOverwrite: () => true })
  expect(api.createSemester).not.toHaveBeenCalled()
  expect(api.updateSemester).not.toHaveBeenCalled()
})
