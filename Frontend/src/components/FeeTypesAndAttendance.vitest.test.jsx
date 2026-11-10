import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FeeTypesConfiguration from '../pages/fees/FeeTypesConfiguration'
import { feeConfigurationApi } from '../api/apiEndpoints'
import { knownAttendanceRate, attendancePercentage } from '../utils/attendanceMetrics'
vi.mock('../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId:'7' }) }))
vi.mock('../components/ExportMenu', () => ({ default: () => <button>Export</button> }))
vi.mock('../api/apiEndpoints', async original => ({ ...await original(), feeConfigurationApi: { categories:vi.fn() } }))
beforeEach(() => { vi.clearAllMocks(); feeConfigurationApi.categories.mockResolvedValue([{id:1,code:'ACA',name:'Academic'},{id:2,code:'HOST',name:'Hostel'}]) })
afterEach(cleanup)
test('fee types use actual backend records without the unavailable mutation banner', async () => {
  render(<FeeTypesConfiguration />); await screen.findByRole('table',{name:'Fee types'})
  expect(screen.queryByText(/read-only fee category API/)).toBeNull()
  fireEvent.change(screen.getByLabelText('Search fee types'), {target:{value:'Hostel'}})
  expect(screen.queryByText('Academic')).toBeNull(); expect(screen.getByText('Hostel')).toBeTruthy()
})
test('fee category read failure offers retry instead of a fallback list', async () => {
  feeConfigurationApi.categories.mockRejectedValueOnce(new Error('Fee categories offline'))
  render(<FeeTypesConfiguration />); await screen.findByText('Fee categories offline')
  expect(screen.queryByRole('table')).toBeNull(); fireEvent.click(screen.getByRole('button',{name:'Retry fee types'}))
  await screen.findByRole('table',{name:'Fee types'})
})
test('attendance zero is real only when recorded against a nonzero total', () => {
  expect(attendancePercentage(0,10)).toBe(0); expect(attendancePercentage(3,4)).toBe(75)
  expect(attendancePercentage(0,0)).toBeNull(); expect(attendancePercentage(undefined,4)).toBeNull()
  expect(knownAttendanceRate(null)).toBeNull(); expect(knownAttendanceRate('')).toBeNull()
  expect(knownAttendanceRate(0)).toBe(0); expect(knownAttendanceRate(101)).toBeNull()
})
