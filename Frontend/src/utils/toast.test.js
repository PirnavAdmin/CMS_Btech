import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { TOAST_DURATION, getToasts, subscribeToToasts, dismissToast, showSuccess, showError, showWarning, showInfo } from './toast.js'

afterEach(() => getToasts().forEach(toast => dismissToast(toast.id)))

test('each stacked notification expires independently after exactly 2000ms', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  assert.equal(TOAST_DURATION, 2000)
  showSuccess('Course created')
  context.mock.timers.tick(500)
  showError('Branch update failed')
  context.mock.timers.tick(1499)
  assert.equal(getToasts().length, 2)
  context.mock.timers.tick(1)
  assert.deepEqual(getToasts().map(toast => toast.message), ['Branch update failed'])
  context.mock.timers.tick(500)
  assert.equal(getToasts().length, 0)
})

test('duplicate notifications do not stack or extend the original lifetime', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const first = showSuccess('Saved')
  context.mock.timers.tick(1500)
  assert.equal(showSuccess('Saved'), first)
  assert.equal(getToasts().length, 1)
  context.mock.timers.tick(500)
  assert.equal(getToasts().length, 0)
})

test('success, error, warning and info remain distinct and preserve backend errors', () => {
  showSuccess('Saved')
  showError({ response: { data: { message: 'A valid branch ID is required' } }, message: 'Fallback' })
  showWarning('Please select a branch first')
  showInfo('No records available to export')
  assert.deepEqual(getToasts().map(toast => toast.type), ['success', 'error', 'warning', 'info'])
  assert.equal(getToasts()[1].message, 'A valid branch ID is required')
})

test('manual dismissal cancels only its own timer', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const first = showInfo('First')
  const second = showInfo('Second')
  dismissToast(first)
  assert.deepEqual(getToasts().map(toast => toast.id), [second])
  context.mock.timers.tick(2000)
  assert.equal(getToasts().length, 0)
})

test('subscriptions can remount across navigation without losing or replaying toasts', () => {
  let updates = 0
  const unsubscribe = subscribeToToasts(() => updates++)
  showSuccess('Admission completed')
  unsubscribe()
  const snapshot = getToasts()
  const cleanup = subscribeToToasts(() => updates++)
  assert.equal(updates, 1)
  assert.equal(getToasts(), snapshot)
  cleanup()
})

test('clearing feedback does not produce an empty notification', () => {
  showInfo('')
  showError(null)
  assert.deepEqual(getToasts(), [])
})
