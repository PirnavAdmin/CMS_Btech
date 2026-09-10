export const TOAST_DURATION = 2000
const types = new Set(['success', 'error', 'warning', 'info'])
let nextId = 0
let snapshot = []
const listeners = new Set()
const timers = new Map()
const emit = () => listeners.forEach(listener => listener())

export const getToasts = () => snapshot
export const subscribeToToasts = listener => { listeners.add(listener); return () => listeners.delete(listener) }

export function dismissToast(id) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  snapshot = snapshot.filter(toast => toast.id !== id)
  emit()
}

export function showToast(value, type = 'info') {
  const message = String(value?.response?.data?.message || value?.message || value || '').trim()
  if (!message) return undefined
  const tone = types.has(type) ? type : 'info'
  const existing = snapshot.find(toast => toast.message === message && toast.type === tone)
  if (existing) return existing.id
  const id = ++nextId
  snapshot = [...snapshot, { id, message, type: tone }]
  timers.set(id, setTimeout(() => dismissToast(id), TOAST_DURATION))
  emit()
  return id
}

export const showSuccess = message => showToast(message, 'success')
export const showError = message => showToast(message, 'error')
export const showWarning = message => showToast(message, 'warning')
export const showInfo = message => showToast(message, 'info')
