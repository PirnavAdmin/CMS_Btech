import React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ResultReview from './ResultReview'
import { loadResultCandidates, loadResultExaminations, loadStudentResultHistory, reviewExamResult } from '../../../services/scopedModulesService'

vi.mock('../../../services/scopedModulesService', () => ({
  loadResultCandidates: vi.fn(), loadResultExaminations: vi.fn(), loadStudentResultHistory: vi.fn(), reviewExamResult: vi.fn(),
}))
vi.mock('../../../components/SearchableSelect', () => ({ ProjectSelect: props => <select {...props} /> }))
vi.mock('../../../components/ViewDialog', () => ({ default: ({ children, onClose }) => <div role="dialog">{children}<button onClick={onClose}>Close</button></div> }))
beforeEach(() => {
  vi.resetAllMocks()
  loadResultExaminations.mockResolvedValue([{ examId: 7, examName: 'Semester I' }])
  loadResultCandidates.mockResolvedValue([{ studentId: 5, studentName: 'Asha' }])
  loadStudentResultHistory.mockResolvedValue([])
})
afterEach(cleanup)

test('reviews authoritative grades, shows validation issues, retries errors and cancels without writes', async () => {
  loadStudentResultHistory.mockRejectedValueOnce(new Error('History unavailable'))
  reviewExamResult.mockRejectedValueOnce(new Error('Result unavailable')).mockResolvedValue({
    result: { studentId: 5, examId: 7, sgpa: 0, cgpa: null, subjects: [{ resultId: 1, subjectName: 'Math', marksObtained: 0, maximumMarks: 100, grade: 'F', gradePoint: 0 }] },
    validation: { isValid: false, validations: [{ rule: 'Grade', isValid: false, message: 'Memo mismatch' }] },
  })
  render(<ResultReview collegeId={1} academicYearId={10} />)
  await screen.findByRole('option', { name: 'Semester I' })
  fireEvent.change(screen.getByLabelText('Examination'), { target: { value: '7' } })
  await screen.findByRole('option', { name: 'Asha' })
  fireEvent.change(screen.getByLabelText('Student'), { target: { value: '5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Review result' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Result unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Retry review' }))
  expect((await screen.findByRole('dialog')).textContent).toContain('Memo mismatch')
  expect(screen.getByRole('dialog').textContent).toContain('0 / 100')
  expect((await screen.findByRole('alert')).textContent).toContain('History unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Retry history' }))
  await screen.findByText('No calculated results for this academic year.')
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(reviewExamResult).toHaveBeenCalledTimes(2)
})

test('ignores a stale roster after changing examination', async () => {
  let resolveOld
  loadResultExaminations.mockResolvedValue([{ examId: 7, examName: 'Semester I' }, { examId: 8, examName: 'Semester II' }])
  loadResultCandidates.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve })).mockResolvedValue([])
  render(<ResultReview collegeId={1} academicYearId={10} />)
  await screen.findByRole('option', { name: 'Semester I' })
  fireEvent.change(screen.getByLabelText('Examination'), { target: { value: '7' } })
  await waitFor(() => expect(loadResultCandidates).toHaveBeenCalledOnce())
  fireEvent.change(screen.getByLabelText('Examination'), { target: { value: '8' } })
  await screen.findByText('No approved marks for this examination.')
  resolveOld([{ studentId: 5, studentName: 'Old roster' }])
  await waitFor(() => expect(screen.queryByRole('option', { name: 'Old roster' })).toBeNull())
  expect(screen.getByRole('button', { name: 'Review result' }).disabled).toBe(true)
})

test('opens the linked examination and selects the approved student before review', async () => {
  reviewExamResult.mockRejectedValue(Object.assign(new Error('Result not found'), { status: 404 }))
  render(<ResultReview collegeId={1} academicYearId={10} initialExamId="7" initialStudentId="5" />)
  await screen.findByRole('option', { name: 'Asha' })
  expect(screen.getByLabelText('Examination').value).toBe('7')
  expect(screen.getByLabelText('Student').value).toBe('5')
  expect(reviewExamResult).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Review result' }))
  expect((await screen.findByRole('alert')).textContent).toContain('server has no calculated result')
})

test('a linked examination outside the active scope cannot load candidates', async () => {
  render(<ResultReview collegeId={1} academicYearId={10} initialExamId="99" initialStudentId="5" />)
  expect(await screen.findByText(/linked examination is outside/)).toBeTruthy()
  expect(loadResultCandidates).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Review result' }).disabled).toBe(true)
})
