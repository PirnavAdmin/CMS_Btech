// Track successful API results without changing their shape or serializing metadata.
const apiResults = new WeakSet()
export function markApiResult(value) {
  if (value && typeof value === 'object') apiResults.add(value)
  return value
}
export const isApiResult = value => Boolean(value && typeof value === 'object' && apiResults.has(value))
