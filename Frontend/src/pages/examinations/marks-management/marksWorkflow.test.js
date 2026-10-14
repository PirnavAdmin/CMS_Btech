import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { editableMark, markValueError, marksWorkflowPayload, workflowSummary } from './marksWorkflow.js'
import { validateExam } from '../../../services/examService.js'

test('marks values preserve zero and reject missing/out-of-range/nonfinite values', () => {
  assert.equal(markValueError({ marksObtained: 0, maxMarks: 100 }), '')
  for (const marksObtained of ['', ' ', null, -1, 101, Infinity, 'abc']) assert.ok(markValueError({ marksObtained, maxMarks: 100 }))
  assert.ok(markValueError({ marksObtained: 1, maxMarks: 0 }))
})
test('workflow enforces one exam, server states, valid IDs and correction remarks', () => {
  const row = { markId: 2, examId: 3, workflowStatus: 'DRAFT' }
  assert.equal(editableMark(row), true)
  assert.equal(editableMark({ ...row, workflowStatus: 'APPROVED' }), false)
  assert.deepEqual(marksWorkflowPayload('submit', [row, row]), { examId: 3, markIds: [2], remarks: null })
  assert.throws(() => marksWorkflowPayload('approve', [row]))
  const submitted = { ...row, workflowStatus: 'SUBMITTED' }
  assert.throws(() => marksWorkflowPayload('reject', [submitted], ' '))
  assert.equal(marksWorkflowPayload('reject', [submitted], ' Correct attendance ').remarks, 'Correct attendance')
  assert.throws(() => marksWorkflowPayload('submit', [row, { ...row, examId: 4 }]))
  assert.throws(() => marksWorkflowPayload('submit', [{ ...row, markId: 0 }]))
  assert.throws(() => workflowSummary({}))
  assert.equal(workflowSummary({ processedCount: 2, rejectedCount: 1 }), '2 processed; 1 rejected.')
})
test('preview timetable conflicts follow actual overlapping times, not session labels', () => {
  const a = { id: '1', examName: 'Exam', examType: 'Final', department: 'Engineering', course: 'BTech', branch: 'CSE', batch: '2026', semester: 'I', section: 'A', subjectCode: 'CS1', examDate: '2026-10-20', startTime: '09:00', endTime: '10:00', faculty: 'F1', hallId: 'H1', session: 'FN', status: 'Scheduled' }
  const overlap = { ...a, id: '2', subjectCode: 'CS2', session: 'OTHER', startTime: '09:30', endTime: '10:30' }
  assert.equal(validateExam(overlap, [a]).length, 3)
  assert.deepEqual(validateExam({ ...overlap, startTime: '10:00', endTime: '11:00' }, [a]), [])
  assert.deepEqual(validateExam({ ...overlap, branch: 'ECE', hallId: 'H2', faculty: 'F2' }, [a]), [])
})
const source = (await readFile(new URL('../../../api/apiEndpoints.js', import.meta.url), 'utf8')).replace(/^import .*$/gm, '').replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE_URL: "https://example.test" })')
const { marksApi, studentDocumentApi } = await import(`data:text/javascript;base64,${Buffer.from(`const getAccessToken = () => 'token'; const collegeRequest = (url, options) => ({ url, options });\n${source}`).toString('base64')}`)
test('marks adapter preserves backend contracts and returns partial workflow failures', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.test/api/v1/marks/workflow/approve')
      assert.equal(options.headers.Authorization, 'Bearer token')
      assert.equal(options.method, 'POST')
      assert.deepEqual(JSON.parse(options.body), { examId: 1, markIds: [2, 3], remarks: null })
      return Response.json({ success: true, data: { processedCount: 1, rejectedCount: 1, errors: [{ message: 'Not submitted' }] } })
    }
    const result = await marksApi.workflow('approve', { examId: 1, markIds: [2, 3], remarks: null })
    assert.equal(result.rejectedCount, 1); assert.equal(result.errors[0].message, 'Not submitted')
    await assert.rejects(marksApi.workflow('publish', {}), /Invalid/)
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.test/api/v1/marks')
      assert.equal(JSON.parse(options.body).marksObtained, 0)
      return Response.json({ success: true, data: { mark: { markId: 8, workflowStatus: 'DRAFT' } } })
    }
    assert.equal((await marksApi.create({ examId: 1, studentId: 2, subjectId: 3, marksObtained: 0 })).markId, 8)
  } finally { globalThis.fetch = previous }
})
test('upload validation prevents unsupported file types and uses backend XLSX preview', async () => {
  const previous = globalThis.fetch
  try {
    await assert.rejects(marksApi.upload(new File(['a'], 'marks.csv'), { examId: 2 }), /XLSX/)
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.test/api/v1/marks/bulk/file-preview')
      assert.equal(options.body.get('examId'), '2')
      assert.equal(options.body.get('sectionId'), '3')
      assert.equal(options.body.get('file').name, 'marks.xlsx')
      return Response.json({ success: true, data: { totalRows: 2, validRows: 1, rejectedRows: 1, errors: [{ rowNumber: 2, message: 'Unknown student' }] } })
    }
    assert.equal((await marksApi.upload(new File(['fixture'], 'marks.xlsx'), { examId: 2, sectionId: 3 })).rejectedRows, 1)
  } finally { globalThis.fetch = previous }
})

test('student document metadata uses JSON while file retrieval uses download endpoint', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async url => {
      assert.equal(url, 'https://example.test/api/v1/students/2/documents/5')
      return Response.json({ success: true, data: { documentId: 5, documentType: 'Certificate', fileName: 'certificate.pdf' } })
    }
    const metadata = await studentDocumentApi.get(2, 5)
    assert.equal(metadata.documentId, 5)
    assert.equal(metadata.fileName, 'certificate.pdf')
    assert.equal(metadata instanceof Blob, false)
  } finally { globalThis.fetch = previous }
})
