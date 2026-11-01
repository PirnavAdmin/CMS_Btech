import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCanonicalStudent } from '../utils/studentCanonicalModel.js'

const source = (await readFile(new URL('./apiEndpoints.js', import.meta.url), 'utf8'))
  .replace(/^\uFEFF/, '').replace(/^import .*$/gm, '')
  .replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { studentAdmissionApi, studentAcademicDetailsApi } = await import(`data:text/javascript;base64,${Buffer.from(
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

test('admission saves omit semester mapping that the admission form does not manage', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      const payload = JSON.parse(options.body)
      assert.equal(payload.academicYearId, 3)
      assert.equal(payload.courseId, 1)
      assert.equal(payload.branchId, 2)
      assert.equal('semesterId' in payload, false)
      assert.equal('semester' in payload, false)
      assert.equal('semesterId' in payload.formData, false)
      assert.equal('semester' in payload.formData, false)
      assert.equal('semesterId' in payload.formData.academic, false)
      assert.equal('semester' in payload.formData.academic, false)
      return Response.json({ data: { admissionId: 55 } })
    }

    await studentAdmissionApi.update(55, {
      semesterId: '999',
      semester: 'Semester 7',
      academic: {
        academicYearId: '3',
        courseId: '1',
        branchId: '2',
        semesterId: '999',
        semester: 'Semester 7',
      },
    })
  } finally { globalThis.fetch = originalFetch }
})

test('academic details saves omit an unmanaged semester ID', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      const payload = JSON.parse(options.body)
      assert.equal(payload.courseId, 1)
      assert.equal(payload.branchId, 2)
      assert.equal('semesterId' in payload, false)
      return Response.json({ data: { admissionId: 55 } })
    }

    await studentAcademicDetailsApi.update(55, {
      academic: { academicYearId: '3', courseId: '1', branchId: '2', semesterId: '999' },
    })
  } finally { globalThis.fetch = originalFetch }
})
