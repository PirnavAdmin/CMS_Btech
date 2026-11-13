import React from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { studentFeeAccounts, semesterFeeGroups, feePrincipalBalance } from '../../utils/studentFeeAccounts'
import { FeeManagementModule } from './FeeManagement'
import { feeCollectionApi, studentFeeApi } from '../../api/apiEndpoints'

vi.mock('../../auth/ScreenAccess', () => ({ useScreenAccess: () => ({ canAction: () => true }) }))
vi.mock('../../context/AcademicContext', () => ({ useAcademic: () => ({ selectedCollegeId: '9' }) }))
vi.mock('../../api/apiEndpoints', async original => ({ ...await original(), feeCollectionApi: { allPending: vi.fn(), allHistory: vi.fn(), receipt: vi.fn() }, studentFeeApi: { getStructure: vi.fn() } }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const student = { id: '7', admissionId: 80, name: 'Student A', application: 'ADM-7', academicYearId: '1', courseId: '2', branchId: '3', courseName: 'B.Tech', branchName: 'CSE', quota: 'Management', studentCategory: 'General' }
const obligation = (id, semesterId, extra = {}) => ({ studentFeeId: id, studentId: 7, semesterId, payableAmount: 1000, paidAmount: 100, balanceAmount: 900, feeCategory: 'Tuition', installmentNumber: 1, dueDate: '2099-01-01', ...extra })
test('one student row survives multiple semesters, duplicate roster entries and duplicate obligations', () => {
  const rows = studentFeeAccounts([student, student], [obligation(1, 4), obligation(2, 5), obligation(1, 4)], [])
  expect(rows).toHaveLength(1)
  expect(rows[0].balance).toBe(1800)
  expect(rows[0].semesterIds).toEqual(['4', '5'])
  expect(rows[0].quota).toBe('Management')
  expect(rows[0].totalFee).toBeNull()
})
test('payments never alter a semester balance without its obligation mapping', () => {
  const payments = [{ paymentId: 4, studentId: 7, feeAmount: 8000 }]
  expect(studentFeeAccounts([student], [obligation(1, 4)], payments)[0]).toMatchObject({ paid: 8000, balance: 900, totalFee: null })
  expect(semesterFeeGroups([obligation(1, 4)])[0]).toMatchObject({ paid: 100, balance: 900 })
})
test('categories remain separate and no future semester is generated', () => {
  const groups = semesterFeeGroups([obligation(1, 4), obligation(2, 4, { feeCategory: 'Hostel' })])
  expect(groups.map(row => row.category)).toEqual(['Academic', 'Hostel'])
  expect(groups).toHaveLength(2)
})
test('overdue counts only positive balances and date boundary uses calendar days', () => {
  const groups = semesterFeeGroups([obligation(1, 4, { dueDate: '2026-11-11' }), obligation(2, 4, { dueDate: '2026-11-12' }), obligation(3, 4, { dueDate: '2026-11-10', balanceAmount: 0, paidAmount: 1000 })], '2026-11-12')
  expect(groups[0].overdue).toBe(900)
})
test('fee principal excludes fines, and monetary sums avoid floating point drift', () => {
  expect(feePrincipalBalance(obligation(1, 4, { balanceAmount: 950, finePending: 50 }))).toBe(900)
  expect(semesterFeeGroups([obligation(1, 4, { balanceAmount: .1 }), obligation(2, 4, { balanceAmount: .2 })])[0].balance).toBe(.3)
})
test('same student code does not merge different student IDs, missing obligations do not imply paid', () => {
  const rows = studentFeeAccounts([{ ...student, code: 'same' }, { ...student, id: 8, code: 'same' }], [], [])
  expect(rows).toHaveLength(2)
  expect(rows.every(row => row.balance === null && row.status === 'Balance Unavailable')).toBe(true)
})
test('directory opens all student semesters and saved integration components in one profile', async () => {
  feeCollectionApi.allPending.mockResolvedValue([obligation(1, 4), obligation(2, 5)])
  feeCollectionApi.allHistory.mockResolvedValue([{ paymentId: 10, studentId: 7, receiptId: 12, receiptNumber: 'REC-12', feeAmount: 100, totalAmount: 100, paymentMode: 'CASH' }])
  studentFeeApi.getStructure.mockResolvedValue({ quota: 'Management', feeComponents: [{ code: 'LAB', name: 'Lab fee', amount: 200 }] })
  const academic = { selectedCollegeId: '9', semesters: [{ id: 4, name: 'Semester 1' }, { id: 5, name: 'Semester 2' }] }
  render(<MemoryRouter><FeeManagementModule.StudentFees academic={academic} masters={{ years: [], courses: [], branches: [], semesters: [] }} students={[student]} ledgers={[]} /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'View fee details for Student A' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Student Fee Profile — Student A' }))
  expect(await dialog.findByText('Semester 1')).toBeTruthy()
  expect(dialog.getByText('Semester 2')).toBeTruthy()
  expect(studentFeeApi.getStructure).toHaveBeenCalledWith(80)
  expect(dialog.getByText('Lab fee: ₹200.00')).toBeTruthy()
  expect(dialog.getByText('REC-12')).toBeTruthy()
  expect(dialog.getByRole('button', { name: 'Collect Payment' })).toBeTruthy()
})

test('empty accounts keep directory headers, and other-college obligations never create student rows', async () => {
  feeCollectionApi.allPending.mockResolvedValue([{ ...obligation(1, 4), studentId: 99, studentName: 'Other college' }])
  feeCollectionApi.allHistory.mockResolvedValue([])
  render(<MemoryRouter><FeeManagementModule.StudentFees academic={{ selectedCollegeId: '9' }} masters={{ years: [], courses: [], branches: [], semesters: [] }} students={[]} /></MemoryRouter>)
  expect(await screen.findByText('No records found.')).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: 'Admission Number' })).toBeTruthy()
  expect(screen.queryByText('Other college')).toBeNull()
})

test('fee API failure shows the error instead of a successful empty directory', async () => {
  feeCollectionApi.allPending.mockRejectedValue(new Error('Fee service offline'))
  feeCollectionApi.allHistory.mockResolvedValue([])
  render(<MemoryRouter><FeeManagementModule.StudentFees academic={{ selectedCollegeId: '9' }} masters={{ years: [], courses: [], branches: [], semesters: [] }} students={[student]} /></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Fee service offline')
  expect(screen.queryByRole('button', { name: 'View fee details for Student A' })).toBeNull()
})
