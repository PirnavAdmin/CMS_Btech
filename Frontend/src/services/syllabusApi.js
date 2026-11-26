import { API_BASE_URL } from '../api/apiEndpoints.js'
import { getAccessToken } from '../auth/auth.js'
import { selectedCollegeId } from '../utils/collegeScope.js'

const root = '/api/v1/syllabi'
const pendingLists = new Map()
const queryString = values => {
  const params = new URLSearchParams()
  Object.entries({ ...values, collegeId: values?.collegeId || selectedCollegeId() }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value))
  })
  return params.toString()
}
const url = (path, params) => API_BASE_URL + path + (params ? '?' + queryString(params) : '')
const responseMessage = (body, status) => {
  const serverMessage = body?.message || body?.title || ''
  if (status === 403 && /no permission mapping exists for this api endpoint/i.test(serverMessage)) {
    return 'The backend has not registered a permission rule for the syllabus API yet. Ask the backend administrator to add the syllabus routes and their syllabus_management permission mapping.'
  }
  return serverMessage || ({
  400: 'The syllabus details were rejected. Check the form and try again.',
  401: 'Your session has expired. Sign in again.',
  403: 'You do not have permission to manage syllabus documents for this college.',
  404: 'The syllabus service is not available on the backend yet (404). See the syllabus backend contract.',
  413: 'The server rejected the upload size (413). Reduce the file size or ask the administrator to configure the upload limit.',
  415: 'The server rejected this file type (415).',
  500: 'The syllabus service encountered a server error (500). Please retry later.',
}[status] || 'The syllabus request failed (HTTP ' + (status || 'network error') + ').')
}
const parseBody = async response => {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('json')) return null
  try { return await response.json() } catch { return null }
}
async function request(path, options = {}) {
  const headers = { 'ngrok-skip-browser-warning': 'true', ...(options.headers || {}) }
  const token = getAccessToken()
  if (token) headers.Authorization = 'Bearer ' + token
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  let response
  try { response = await fetch(url(path, options.params), { ...options, headers }) }
  catch (error) {
    if (error?.name === 'AbortError') throw error
    throw Object.assign(new Error('Syllabus service could not be reached. Check your connection and retry.'), { status: 0 })
  }
  const body = await parseBody(response)
  if (!response.ok || body?.success === false || body?.isSuccess === false) {
    throw Object.assign(new Error(responseMessage(body, response.status)), { status: response.status, details: body?.errors || body?.validationErrors })
  }
  return body?.data ?? body?.result ?? body
}
const normalizeList = data => {
  const rows = Array.isArray(data) ? data : data?.items ?? data?.records ?? data?.results ?? data?.syllabi ?? data?.documents
  return Array.isArray(rows) ? rows : []
}
const dedupedList = (key, fetcher) => {
  if (pendingLists.has(key)) return pendingLists.get(key)
  const pending = Promise.resolve().then(fetcher).finally(() => pendingLists.delete(key))
  pendingLists.set(key, pending)
  return pending
}
const idPath = (syllabusId, suffix = '') => root + '/' + encodeURIComponent(syllabusId) + suffix

export const syllabusApi = {
  list: async params => normalizeList(await dedupedList(url(root, params), () => request(root, { params }))),
  listPublished: async params => {
    const scopedParams = { ...params, collegeId: params?.collegeId || selectedCollegeId() }
    return normalizeList(await dedupedList(url(root + '/published', scopedParams), () => request(root + '/published', { params: scopedParams })))
  },
  get: async (id, params) => request(idPath(id), { params }),
  create: payload => request(root, { method: 'POST', body: JSON.stringify({ ...payload, collegeId: payload.collegeId || selectedCollegeId() }) }),
  update: (id, payload) => request(idPath(id), { method: 'PATCH', body: JSON.stringify(payload) }),
  publish: (id, params) => request(idPath(id, '/publish'), { method: 'POST', params }),
  archive: (id, params) => request(idPath(id, '/archive'), { method: 'POST', params }),
  versions: (id, params) => request(idPath(id, '/versions'), { params }).then(normalizeList),
  activity: (id, params) => request(idPath(id, '/activity'), { params }).then(normalizeList),
  uploadDocument(syllabusId, file, onProgress, replaceDocumentId) {
    const suffix = replaceDocumentId ? '/documents/' + encodeURIComponent(replaceDocumentId) + '/replace' : '/documents'
    const requestUrl = url(idPath(syllabusId, suffix), { collegeId: selectedCollegeId() })
    const xhr = new XMLHttpRequest()
    const promise = new Promise((resolve, reject) => {
      xhr.open(replaceDocumentId ? 'PUT' : 'POST', requestUrl)
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true')
      const token = getAccessToken()
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token)
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100))
      }
      xhr.onerror = () => reject(Object.assign(new Error('The document upload could not reach the syllabus service.'), { status: 0 }))
      xhr.onabort = () => reject(Object.assign(new Error('Upload cancelled.'), { name: 'AbortError' }))
      xhr.onload = () => {
        let body
        try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null } catch { body = null }
        if (xhr.status < 200 || xhr.status >= 300 || body?.success === false || body?.isSuccess === false) {
          reject(Object.assign(new Error(responseMessage(body, xhr.status)), { status: xhr.status }))
          return
        }
        resolve(body?.data ?? body?.result ?? body)
      }
      const formData = new FormData()
      formData.append('file', file)
      formData.append('collegeId', selectedCollegeId())
      xhr.send(formData)
    })
    return { promise, cancel: () => xhr.abort() }
  },
  downloadDocument(documentId, params = {}) {
    return requestBlob('/api/v1/syllabus-documents/' + encodeURIComponent(documentId) + '/download', params)
  },
}

async function requestBlob(path, params) {
  const headers = { 'ngrok-skip-browser-warning': 'true' }
  const token = getAccessToken()
  if (token) headers.Authorization = 'Bearer ' + token
  let response
  try { response = await fetch(url(path, params), { headers }) }
  catch { throw Object.assign(new Error('The document could not be downloaded. Check your connection and retry.'), { status: 0 }) }
  if (!response.ok) {
    const body = await parseBody(response)
    throw Object.assign(new Error(responseMessage(body, response.status)), { status: response.status })
  }
  return { blob: await response.blob(), contentType: response.headers.get('content-type') || '', disposition: response.headers.get('content-disposition') || '' }
}
