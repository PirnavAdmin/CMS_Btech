import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCanonicalStudent } from '../utils/studentCanonicalModel.js'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8'))
  .replace(/^\uFEFF/, '').replace(/^import .*$/gm, '')
  .replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { studentAdmissionApi, studentAdmissionStatusApi, canonicalAdmissionStatus } = await import(`data:text/javascript;base64,${Buffer.from(
  `const getAccessToken = () => 'test'; const collegeRequest = (url, options) => ({ url, options });\n${source}`
).toString('base64')}`)

for (const method of ['create', 'update']) {
  test(`${method} preserves uploaded photo without sending base64 to legacy photo columns`, async () => {
    const photo = 'data:image/png;base64,' + 'A'.repeat(2048)
    const form = { personal: { firstName: 'Test', photo }, previewEditedFields: { 'personal.photo': true } }
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = async (url, options) => {
        assert.equal(options.method, method === 'create' ? 'POST' : 'PUT')
        const payload = JSON.parse(options.body)
        assert.equal(payload.photo, '')
        assert.equal(payload.studentPhoto, '')
        assert.equal(payload.formData.personal.photo, photo)
        assert.deepEqual(payload.formData.previewEditedFields, form.previewEditedFields)
        return Response.json({ data: { admissionId: 123, studentPhoto: null, formData: payload.formData } })
      }
      const result = method === 'create' ? await studentAdmissionApi.create(form) : await studentAdmissionApi.update(123, form)
      assert.equal(normalizeCanonicalStudent(result).personal.photo, photo)
    } finally { globalThis.fetch = originalFetch }
  })
}

test('existing photo URLs are retained in legacy fields', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      const payload = JSON.parse(options.body)
      assert.equal(payload.photo, '/uploads/student.png')
      assert.equal(payload.studentPhoto, '/uploads/student.png')
      return Response.json({ data: { admissionId: 123 } })
    }
    await studentAdmissionApi.update(123, { personal: { photo: '/uploads/student.png' } })
  } finally { globalThis.fetch = originalFetch }
})

test('canonicalAdmissionStatus correctly normalizes statuses', () => {
  assert.equal(canonicalAdmissionStatus('APPROVED'), 'Approved')
  assert.equal(canonicalAdmissionStatus('approved'), 'Approved')
  assert.equal(canonicalAdmissionStatus('REJECTED'), 'Rejected')
  assert.equal(canonicalAdmissionStatus('UNDER_REVIEW'), 'Under Review')
  assert.equal(canonicalAdmissionStatus('SUBMITTED'), 'Application Submitted')
  assert.equal(canonicalAdmissionStatus('DRAFT'), 'Draft')
})

test('studentAdmissionStatusApi.update calls canonical student-admissions status endpoint and returns approved record', async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options = {}) => {
      const method = options.method || 'GET'
      calls.push({ url, method, body: options.body ? JSON.parse(options.body) : null })

      if (url.includes('/status') && method === 'GET') {
        return Response.json({
          success: true,
          data: { admissionId: 99, currentStatus: 'Application Submitted' }
        })
      }
      if (url.includes('/status') && method === 'POST') {
        return Response.json({
          success: true,
          data: {
            admissionId: 99,
            previousStatus: 'Application Submitted',
            newStatus: 'Approved',
            studentId: 777
          }
        })
      }
      if (url.includes('/student-admissions/99') && method === 'GET') {
        return Response.json({
          success: true,
          data: {
            admissionId: 99,
            admissionStatus: 'Approved',
            admissionNo: 'ADM2026099',
            studentId: 777,
            isApproved: true
          }
        })
      }
      return Response.json({ success: true, data: {} })
    }

    const result = await studentAdmissionStatusApi.update(99, { status: 'APPROVED', remarks: 'Docs verified' })

    // Verify canonical POST endpoint was called with title-cased 'Approved'
    const postCall = calls.find(c => c.method === 'POST')
    assert.ok(postCall, 'POST call should be made')
    assert.match(postCall.url, /\/api\/v1\/student-admissions\/99\/status/)
    assert.equal(postCall.body.newStatus, 'Approved')
    assert.equal(postCall.body.remarks, 'Docs verified')

    // Verify returned record
    assert.equal(result.admissionId, 99)
    assert.equal(result.status, 'Approved')
    assert.equal(result.admissionNo, 'ADM2026099')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('studentAdmissionStatusApi.update auto-advances Draft admission before approving', async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options = {}) => {
      const method = options.method || 'GET'
      calls.push({ url, method, body: options.body ? JSON.parse(options.body) : null })

      if (url.includes('/status') && method === 'GET') {
        return Response.json({
          success: true,
          data: { admissionId: 101, currentStatus: 'Draft' }
        })
      }
      if (url.includes('/status') && method === 'POST') {
        const body = JSON.parse(options.body)
        return Response.json({
          success: true,
          data: {
            admissionId: 101,
            newStatus: body.newStatus,
            studentId: 888
          }
        })
      }
      if (url.includes('/student-admissions/101') && method === 'GET') {
        return Response.json({
          success: true,
          data: {
            admissionId: 101,
            admissionStatus: 'Approved',
            admissionNo: 'ADM2026101',
            studentId: 888,
            isApproved: true
          }
        })
      }
      return Response.json({ success: true, data: {} })
    }

    const result = await studentAdmissionStatusApi.update(101, { status: 'APPROVED', remarks: 'Direct approve from draft' })

    const postCalls = calls.filter(c => c.method === 'POST')
    assert.equal(postCalls.length, 2, 'Should execute 2 POST calls: auto-promote to Submitted, then Approve')
    assert.equal(postCalls[0].body.newStatus, 'Application Submitted')
    assert.equal(postCalls[1].body.newStatus, 'Approved')
    assert.equal(result.status, 'Approved')
  } finally {
    globalThis.fetch = originalFetch
  }
})
