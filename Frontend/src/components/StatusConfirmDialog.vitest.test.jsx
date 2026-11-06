import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import StatusConfirmDialog from './StatusConfirmDialog.jsx'

afterEach(cleanup)
test('status changes require confirmation and Escape cancels without invoking the API action', () => {
  const cancel = vi.fn(), confirm = vi.fn()
  render(<StatusConfirmDialog entity="Academic year" name="Configured year" nextStatus="Active" onCancel={cancel} onConfirm={confirm} />)
  const dialog = screen.getByRole('alertdialog')
  expect(dialog.open).toBe(true)
  expect(confirm).not.toHaveBeenCalled()
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(cancel).toHaveBeenCalledOnce()
  expect(confirm).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Activate' }))
  expect(confirm).toHaveBeenCalledOnce()
})
test('a pending operation blocks dismissal and duplicate submission', () => {
  const cancel = vi.fn(), confirm = vi.fn()
  render(<StatusConfirmDialog entity="College" name="Selected college" nextStatus="Inactive" onCancel={cancel} onConfirm={confirm} busy />)
  fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Updating...' }))
  expect(cancel).not.toHaveBeenCalled()
  expect(confirm).not.toHaveBeenCalled()
})
test('closing restores the previous focus and body scroll setting', () => {
  const trigger = document.createElement('button')
  document.body.append(trigger); trigger.focus()
  document.body.style.overflow = 'auto'
  const { unmount } = render(<StatusConfirmDialog entity="Course" name="Course" nextStatus="Active" onCancel={() => {}} onConfirm={() => {}} />)
  expect(document.body.style.overflow).toBe('hidden')
  unmount()
  expect(document.body.style.overflow).toBe('auto')
  expect(document.activeElement).toBe(trigger)
  trigger.remove(); document.body.style.overflow = ''
})
