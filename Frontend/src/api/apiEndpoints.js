const normalizeBaseUrl = (value = '') => value.trim().replace(/\/+$/, '')

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
)

const endpoint = (path) => `${API_BASE_URL}${path}`

export const API_ENDPOINTS = Object.freeze({
  auth: Object.freeze({
    login: endpoint('/api/v1/auth/login'),
    refresh: endpoint('/api/v1/auth/refresh'),
  }),
  profile: Object.freeze({
    get: endpoint('/api/v1/profile'),
    update: endpoint('/api/v1/profile'),
  }),
})

export default API_ENDPOINTS
