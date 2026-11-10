import { beforeEach, afterEach, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { FacultyDailyAttendance } from '../pages/faculty/FacultyManagement'
import facultyService from '../services/facultyService'
import { facultyLeaveApi } from '../api/apiEndpoints'
import { localAttendanceDate } from '../utils/facultyAttendance'

vi.mock('../api/apiEndpoints', async original => ({ ...await original(), facultyLeaveApi: { getHistory: vi.fn() } }))
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '7', selectedAcademicYearId: '1' }) }))
vi.mock('../components/ExportMenu', () => ({ default: ({ rows = [], columns = [], title }) =>
  <output aria-label={title + ' export'}>{JSON.stringify(rows.map(row => Object.fromEntries(columns.map(column => [column.label, column.value(row)]))))}</output> }))
vi.mock('../services/facultyService', async original => ({ ...await original(), default: {
  getAttendance: vi.fn(), getDailyAttendance: vi.fn(), getWeeklyAttendance: vi.fn(), getMonthlyAttendance: vi.fn(), createAttendance: vi.fn(),
} }))

const date = localAttendanceDate(new Date())
const faculty = [
  { id: '9', fullName: 'Faculty One', employeeId: 'EMP000009', employeeCategory: 'Teaching', department: 'Engineering' },
  { id: '10', fullName: 'Staff One', employeeId: 'EMP000010', employeeCategory: 'Non-Teaching', department: 'Library' },
]
const record = { attendanceId: 51, facultyId: 9, attendanceDate: date, status: 'Present', checkIn: '09:12', checkOut: '17:04' }

beforeEach(() => {
  vi.clearAllMocks()
  facultyLeaveApi.getHistory.mockResolvedValue([])
  facultyService.getAttendance.mockResolvedValue([record, { ...record, facultyId: 88, checkIn: '08:00' }])
  facultyService.getDailyAttendance.mockResolvedValue([{ facultyId: 10, status: 'On Leave' }])
  facultyService.getWeeklyAttendance.mockImplementation(async ({ weekStart }) => [{ facultyId: 9, days: [{ date: weekStart, status: 'Late' }] }])
  facultyService.getMonthlyAttendance.mockImplementation(async ({ year, month }) => [{ facultyId: 10, days: [{ date: year + '-' + String(month).padStart(2, '0') + '-01', status: 'LOP' }] }])
})
afterEach(cleanup)
const mount = () => render(<FacultyDailyAttendance faculty={faculty} />)

test('daily monitoring shows real check-in, checkout, hours and leave for both categories', async () => {
  mount()
  await screen.findByText('9:12 AM')
  expect(screen.getByText('5:04 PM')).toBeTruthy()
  expect(screen.getByText('7h 52m')).toBeTruthy()
  expect(screen.getByText('On Leave')).toBeTruthy()
  expect(screen.queryByText('8:00 AM')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Record Attendance' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'View attendance for Faculty One' }))
  const dialog = screen.getByRole('dialog', { name: 'Faculty Attendance Details' })
  expect(within(dialog).getByText('7h 52m')).toBeTruthy()
  expect(within(dialog).queryByRole('button', { name: /save|edit/i })).toBeNull()
  expect(facultyService.createAttendance).not.toHaveBeenCalled()
})

test('missing marks stay unmarked and pending checkout is labeled', async () => {
  facultyService.getAttendance.mockResolvedValue([{ ...record, checkOut: '' }])
  facultyService.getDailyAttendance.mockResolvedValue([])
  mount()
  await screen.findAllByText('Not checked out', { selector: 'td' })
  expect(screen.getByText('Not Marked', { selector: 'span.fm-monitor-status' })).toBeTruthy()
})

test('category updates roster, available departments, summary and export', async () => {
  mount()
  await screen.findByText('9:12 AM')
  fireEvent.change(screen.getByLabelText('Staff Category'), { target: { value: 'Non-Teaching' } })
  expect(screen.queryByText('Faculty One', { selector: 'td' })).toBeNull()
  expect(screen.getByLabelText('Attendance export').textContent).toContain('Staff One')
  expect(screen.getByLabelText('Attendance export').textContent).not.toContain('Faculty One')
  expect(within(screen.getByLabelText('Summary')).getByText('Total Staff').parentElement.textContent).toBe('1Total Staff')
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
  expect(screen.queryByRole('option', { name: 'Engineering' })).toBeNull()
  fireEvent.change(screen.getByLabelText('Department'), { target: { value: 'Library' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  fireEvent.change(screen.getByLabelText('Search Employee'), { target: { value: 'missing' } })
  expect(screen.getByLabelText('Attendance export').textContent).toBe('[]')
})

test('weekly and monthly reports use dated backend marks and offer period details', async () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Weekly Report' }))
  await screen.findByText('L', { selector: 'td span' })
  expect(screen.getByLabelText('Weekly Report export').textContent).toContain('Late')
  fireEvent.click(screen.getByRole('button', { name: 'Monthly Report' }))
  await screen.findByText('LOP', { selector: 'td span' })
  fireEvent.click(screen.getByRole('button', { name: 'View attendance for Staff One' }))
  expect(within(screen.getByRole('dialog')).getByText('Loss of Pay')).toBeTruthy()
})

test('attendance API failure shows retry and clears export', async () => {
  facultyService.getAttendance.mockRejectedValueOnce(Error('Faculty attendance offline')).mockResolvedValue([record])
  mount()
  await screen.findByRole('alert')
  expect(screen.getByLabelText('Attendance export').textContent).toBe('[]')
  fireEvent.click(screen.getByRole('button', { name: 'Retry attendance' }))
  await screen.findByText('9:12 AM')
})

test('approved full-day leave supplements missing marks without overwriting recorded attendance', async () => {
  facultyService.getDailyAttendance.mockResolvedValue([])
  facultyLeaveApi.getHistory.mockResolvedValue([
    { facultyId: 9, status: 'Approved', from: date, to: date, days: 1 },
    { facultyId: 10, status: 'Approved', from: date, to: date, days: 1 },
  ])
  mount()
  await screen.findByText('On Leave', { selector: 'td span' })
  expect(screen.getByText('Present', { selector: 'td span' })).toBeTruthy()
  expect(facultyLeaveApi.getHistory).toHaveBeenCalledWith({ status: 'Approved' })
})
