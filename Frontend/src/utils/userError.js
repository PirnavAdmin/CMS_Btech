export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

// Keep actionable validation messages, but never show infrastructure details.
export function userErrorMessage(value, status) {
  const code = Number(status ?? value?.status ?? value?.response?.status)
  if (code >= 500) return GENERIC_ERROR_MESSAGE
  const message = String(value?.message || value?.response?.data?.message || value || '').trim()
  if (/\b(server|backend|ngrok|exception|stack\s*trace|sqlstate|mysql|ECONNREFUSED|ENOTFOUND)\b|failed to fetch|network\s*error|load failed|<!doctype|<html/i.test(message)) return GENERIC_ERROR_MESSAGE
  return message
}
