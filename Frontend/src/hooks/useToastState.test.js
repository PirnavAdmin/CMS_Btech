import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./useToastState.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace('export default function', 'function')
const createHook = new Function('useCallback', 'useRef', 'useState', 'showToast', `${source}; return useToastState`)

function harness(initial, type) {
  let state = initial
  const toasts = []
  const hook = createHook(fn => fn, value => ({ current: value }), value => [value, next => { state = next }], (message, tone) => toasts.push({ message, tone }))
  const [, set] = hook(initial, type)
  return { set, toasts, state: () => state }
}

test('form failures retain state, while field edits and clearing do not replay toasts', () => {
  const form = harness({}, 'error')
  form.set({ form: 'Unable to save section', name: 'Required' })
  assert.deepEqual(form.toasts, [{ message: 'Unable to save section', tone: 'error' }])
  form.set(previous => ({ ...previous, name: '' }))
  assert.equal(form.state().form, 'Unable to save section')
  assert.equal(form.toasts.length, 1)
  form.set({})
  assert.equal(form.toasts.length, 1)
})

test('typed admission feedback and explicit warnings override the default tone', () => {
  const feedback = harness(null, 'success')
  feedback.set({ message: 'Admission rejected', tone: 'error' })
  feedback.set('Academic review required', 'warning')
  feedback.set('Student promoted successfully')
  assert.deepEqual(feedback.toasts.map(toast => toast.tone), ['error', 'warning', 'success'])
})
