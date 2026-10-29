import test from 'node:test'
import assert from 'node:assert/strict'
import { validateDocument, documentCategories } from './staffDocumentsStore.js'
test('personal document upload accepts supported non-empty files up to 5 MB', () => {
  for (const type of ['application/pdf', 'image/jpeg', 'image/png']) assert.equal(validateDocument({ type, size: 5 * 1024 * 1024 }), '')
})
test('personal document upload rejects empty, oversized and unsupported files', () => {
  assert.match(validateDocument(null), /non-empty/)
  assert.match(validateDocument({ type: 'application/pdf', size: 0 }), /non-empty/)
  assert.match(validateDocument({ type: 'application/pdf', size: 5 * 1024 * 1024 + 1 }), /5 MB/)
  assert.match(validateDocument({ type: 'text/html', size: 100 }), /PDF, JPG or PNG/)
})
test('document categories cover non-teaching employment and payroll records', () => {
  for (const category of ['Employment', 'Payroll', 'Certificates', 'Identity', 'Service records']) assert.ok(documentCategories.includes(category))
})
