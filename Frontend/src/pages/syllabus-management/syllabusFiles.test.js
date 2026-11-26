import test from 'node:test'
import assert from 'node:assert/strict'
import { SYLLABUS_ALLOWED_EXTENSIONS, SYLLABUS_MAX_FILE_SIZE, classifySyllabusFile, fileIdentity, formatFileSize, validateSyllabusFile } from './syllabusFiles.js'

test('accepts each configured syllabus document extension and rejects scripts', () => {
  for (const extension of SYLLABUS_ALLOWED_EXTENSIONS) {
    assert.equal(validateSyllabusFile({ name: 'course.' + extension, size: 50 }), '')
  }
  for (const extension of ['exe', 'js', 'bat', 'sh', 'html']) {
    assert.match(validateSyllabusFile({ name: 'unsafe.' + extension, size: 10 }), /not supported/)
  }
})

test('enforces the per-file limit and formats file sizes', () => {
  assert.equal(validateSyllabusFile({ name: 'large.pdf', size: SYLLABUS_MAX_FILE_SIZE }), '')
  assert.match(validateSyllabusFile({ name: 'too-large.pdf', size: SYLLABUS_MAX_FILE_SIZE + 1 }), /25.0 MB or smaller/)
  assert.equal(formatFileSize(1024), '1.0 KB')
  assert.equal(classifySyllabusFile({ name: 'plan.xlsx' }), 'Spreadsheet')
})

test('file identity detects the same selected file without conflating separate same-name uploads', () => {
  assert.equal(fileIdentity({ name: 'plan.pdf', size: 20, lastModified: 5 }), fileIdentity({ name: 'PLAN.PDF', size: 20, lastModified: 5 }))
  assert.notEqual(fileIdentity({ name: 'plan.pdf', size: 20, lastModified: 5 }), fileIdentity({ name: 'plan.pdf', size: 21, lastModified: 5 }))
})
