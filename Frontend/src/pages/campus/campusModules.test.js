import test from 'node:test'
import assert from 'node:assert/strict'
import { campusModules, validateCampusDraft } from './campusModules.js'

const catalog = campusModules.library.areas[0]
const book = { title: 'Algorithms', author: 'Author', category: 'Computing', isbn: '9780306406157' }
test('catalog checks ISBN checksum instead of accepting any thirteen digits', () => {
  assert.equal(validateCampusDraft(catalog, book), '')
  assert.match(validateCampusDraft(catalog, { ...book, isbn: '9780306406158' }), /valid ISBN/)
  assert.equal(validateCampusDraft(catalog, { ...book, isbn: '0-306-40615-2' }), '')
})
test('whitespace-only required values are rejected', () => {
  assert.match(validateCampusDraft(catalog, { ...book, title: '   ' }), /Title is required/)
})
test('event times, registration deadline and capacity are validated', () => {
  const event = campusModules['meetings-events'].areas[1]
  const values = { title: 'Event', start: '2026-12-10T10:00', end: '2026-12-10T11:00', venue: 'Hall', organizer: 'Office', capacity: '20', deadline: '2026-12-09T10:00', description: 'Description' }
  assert.equal(validateCampusDraft(event, values), '')
  assert.match(validateCampusDraft(event, { ...values, end: values.start }), /End time/)
  assert.match(validateCampusDraft(event, { ...values, capacity: '1.5' }), /whole number/)
  assert.match(validateCampusDraft(event, { ...values, deadline: '2026-12-11T10:00' }), /deadline/)
})
test('recruitment application deadline cannot follow the drive', () => {
  const drive = campusModules.placement.areas[0]
  const values = { title: 'Drive', company: 'Company', role: 'Engineer', date: '2026-12-10', deadline: '2026-12-11', venue: 'Campus', eligibility: 'Approved criteria', description: 'Role' }
  assert.match(validateCampusDraft(drive, values), /deadline/)
})
