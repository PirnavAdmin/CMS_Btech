export function isRenderableDetailValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized !== '' && !['null', 'undefined', 'n/a', 'not provided', 'not available', '—', '-'].includes(normalized)
  }
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}
