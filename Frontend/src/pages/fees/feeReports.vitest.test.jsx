import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ServerFeeCollection } from './FeeManagement'
import { feeCollectionApi } from '../../api/apiEndpoints'

vi.mock('../../api/apiEndpoints', async original => ({
  ...await original(),
  feeCollectionApi: { allPending: vi.fn() }
}))
vi.mock('../../components/ExportMenu', () => ({
  default: ({ rows }) => <output aria-label="Exported students">{rows.map(row => row.studentName).join(', ')}</output>
}))

afterEach(cleanup)

test('the Overdues screen requests scoped outstanding balances and filters the export with the table', async () => {
  feeCollectionApi.allPending.mockResolvedValue([
    { studentFeeId: 21, studentName: 'Asha', feeCategory: 'Tuition', payableAmount: 100, paidAmount: 25, balanceAmount: 75 },
    { studentFeeId: 22, studentName: 'Bina', feeCategory: 'Library', payableAmount: 50, paidAmount: 0, balanceAmount: 50 }
  ])
  render(<MemoryRouter><ServerFeeCollection page="dues" academic={{ selectedCollegeId: '7', selectedAcademicYearId: '3' }} /></MemoryRouter>)
  await screen.findByText('Asha')
  expect(feeCollectionApi.allPending).toHaveBeenCalledWith(expect.objectContaining({ academicYearId: '3', overdueOnly: true }))
  fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
  fireEvent.change(screen.getByLabelText('Fee category'), { target: { value: 'Tuition' } })
  expect(screen.getByLabelText('Exported students').textContent).toBe('Asha')
  expect(screen.queryByText('Bina')).toBeNull()
  expect(screen.getByText(/75\.00/)).toBeTruthy()
})
