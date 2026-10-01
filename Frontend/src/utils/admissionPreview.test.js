import { test } from 'node:test'
import assert from 'node:assert/strict'
import { admissionPreview } from './admissionPreview.js'
import { createEmptyCanonicalStudent } from './studentCanonicalModel.js'

test('new preview hides generated values, global context and unselected defaults', () => {
  const data = createEmptyCanonicalStudent()
  data.previewEditedFields = {}
  data.academic.academicYear = '2026-2027'
  data.admission.college = 'Example College'
  const preview = admissionPreview(data, createEmptyCanonicalStudent())
  for (const value of [preview.personal.nationality, preview.parents.primaryContact,
    preview.academic.academicYear, preview.admission.college, preview.application.number,
    preview.application.date, preview.admission.hostel, preview.fees.tuitionFee,
    preview.contact.currentAddress.country]) assert.equal(value, '')
})

test('entered values appear, explicitly selected defaults appear, cleared values disappear', () => {
  const data = createEmptyCanonicalStudent()
  data.personal.firstName = 'Test'
  data.previewEditedFields = { 'personal.firstName': true, 'admission.hostel': true }
  data.fees.transportFee = '0'
  let preview = admissionPreview(data, createEmptyCanonicalStudent())
  assert.equal(preview.personal.firstName, 'Test')
  assert.equal(preview.admission.hostel, 'No')
  assert.equal(preview.admission.transport, '')
  assert.equal(preview.fees.transportFee, '')
  data.personal.firstName = ''
  preview = admissionPreview(data, createEmptyCanonicalStudent())
  assert.equal(preview.personal.firstName, '')
})

test('saved tracking survives serialization and legacy records remain visible', () => {
  const data = createEmptyCanonicalStudent()
  assert.equal(admissionPreview(data, createEmptyCanonicalStudent()), data)
  data.previewEditedFields = { 'academic.academicYearId': true }
  data.academic.academicYear = '2026-2027'
  const preview = admissionPreview(JSON.parse(JSON.stringify(data)), createEmptyCanonicalStudent())
  assert.equal(preview.academic.academicYear, '2026-2027')
  assert.equal(preview.parents.primaryContact, '')
})
