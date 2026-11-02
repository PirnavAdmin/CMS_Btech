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

test('admission saves carry the explicit semester selection in the DTO and form snapshot', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      const payload = JSON.parse(options.body)
      assert.equal(payload.academicYearId, 3)
      assert.equal(payload.courseId, 1)
      assert.equal(payload.branchId, 2)
      assert.equal(payload.semesterId, 4)
      assert.equal(payload.formData.semesterId, '4')
      assert.equal(payload.formData.academic.semesterId, '4')
      assert.equal(payload.formData.academic.semester, 'Semester 1')
      return Response.json({ data: { admissionId: 55 } })
    }

    await studentAdmissionApi.update(55, {
      semesterId: '999',
      semester: 'Semester 7',
      academic: {
        academicYearId: '3',
        courseId: '1',
        branchId: '2',
        semesterId: '4',
        semester: 'Semester 1',
      },
    })
  } finally { globalThis.fetch = originalFetch }
})

test('academic details saves submit the selected semester instead of a stale flat ID', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      const payload = JSON.parse(options.body)
      assert.equal(payload.courseId, 1)
      assert.equal(payload.branchId, 2)
      assert.equal(payload.semesterId, 4)
      return Response.json({ data: { admissionId: 55 } })
    }

    await studentAcademicDetailsApi.update(55, {
      semesterId: '999',
      academic: { academicYearId: '3', courseId: '1', branchId: '2', semesterId: '4' },
    })
  } finally { globalThis.fetch = originalFetch }
})

test('edited academic IDs and form data override retained API snapshots', async () => {
  const originalFetch = globalThis.fetch
  const form = {
    firstName: 'Old', courseId: 99, branchId: 98, academicYearId: 97,
    personal: { firstName: 'Updated' },
    academic: { courseId: '1', branchId: '2', academicYearId: '3', semesterId: '4', sectionId: '' },
    formData: { personal: { firstName: 'Old' }, academic: { courseId: 99, branchId: 98 } },
    fees: { feeStructureId: 'FS-STANDARD', structureId: 'FS-STANDARD' },
  }
  const before = structuredClone(form)
  try {
    globalThis.fetch = async (url, options) => {
      const payload = JSON.parse(options.body)
      assert.equal(payload.firstName, 'Updated')
      assert.equal(payload.courseId, 1)
      assert.equal(payload.branchId, 2)
      assert.equal(payload.academicYearId, 3)
      assert.equal(payload.semesterId, 4)
      assert.equal(payload.formData.personal.firstName, 'Updated')
      assert.deepEqual(payload.formData.academic, form.academic)
      assert.equal('formData' in payload.formData, false)
      assert.equal('feeStructureId' in payload, false)
      assert.equal('feeStructureId' in payload.formData.fees, false)
      return Response.json({ data: { admissionId: 56 } })
    }
    await studentAdmissionApi.update(56, form)
    assert.deepEqual(form, before)
  } finally { globalThis.fetch = originalFetch }
})

test('basic information saves preserve enrollment from the server while saving the edited personal fields', async () => {
  const originalFetch = globalThis.fetch
  const methods = []
  try {
    globalThis.fetch = async (url, options) => {
      methods.push(options.method || 'GET')
      if (!options.method) return Response.json({ data: {
        admissionId: 56, collegeId: 9, academicYearId: 3, courseId: 1, branchId: 2, semesterId: 4, sectionId: null,
        formData: { academic: { academicYearId: 90, courseId: 90, branchId: 90, semesterId: 90 } },
      } })
      const payload = JSON.parse(options.body)
      assert.equal(payload.firstName, 'Updated')
      assert.equal(payload.academicYearId, 3)
      assert.equal(payload.courseId, 1)
      assert.equal(payload.branchId, 2)
      assert.equal(payload.semesterId, 4)
      assert.equal('sectionId' in payload, false)
      assert.equal(payload.formData.academic.semesterId, 4)
      return Response.json({ data: { admissionId: 56 } })
    }
    await studentAdmissionApi.update(56, {
      firstName: 'Old', personal: { firstName: 'Updated' },
      academic: { academicYearId: 99, courseId: 99, branchId: 99, semesterId: 99, sectionId: 99 },
    }, { preserveAcademicMapping: true })
    assert.deepEqual(methods, ['GET', 'PUT'])
  } finally { globalThis.fetch = originalFetch }
})

test('a failed enrollment read prevents a basic-information PUT with unverified IDs', async () => {
  const originalFetch = globalThis.fetch
  const methods = []
  try {
    globalThis.fetch = async (url, options) => {
      methods.push(options.method || 'GET')
      return Response.json({ message: 'Admission not found' }, { status: 404 })
    }
    await assert.rejects(studentAdmissionApi.update(56, {}, { preserveAcademicMapping: true }), /Admission not found/)
    assert.deepEqual(methods, ['GET'])
  } finally { globalThis.fetch = originalFetch }
})
