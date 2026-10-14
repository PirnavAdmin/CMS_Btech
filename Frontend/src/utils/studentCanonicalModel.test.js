import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createEmptyCanonicalStudent,
  normalizeCanonicalStudent,
  studentFullName,
  studentInitials,
  studentQuotaDisplay,
  formatAddress,
  formatMoney,
  normalizeAddressObj,
  dateInputValue,
  tenDigitMobile,
  apiAssetUrl,
  REQUIRED_FIELDS,
  DOCUMENTS_CONFIG,
} from './studentCanonicalModel.js'

test('canonical student factory creates expected full structure without missing sections', () => {
  const empty = createEmptyCanonicalStudent()
  assert.ok(empty.application)
  assert.ok(empty.personal)
  assert.ok(empty.contact)
  assert.ok(empty.parents)
  assert.ok(empty.academic)
  assert.ok(empty.previousEducation)
  assert.ok(empty.admission)
  assert.ok(empty.fees)
  assert.ok(empty.documents)
  assert.equal(typeof empty.application.registrationNumber, 'string')
  assert.equal(empty.personal.nationality, 'Indian')
  assert.equal(empty.admission.hostel, 'No')
  assert.equal(empty.admission.transport, 'No')
})

test('normalizes flat and nested student data seamlessly', () => {
  const apiStudent = {
    admissionId: 'ADM-101',
    studentId: 'STU-202',
    status: 'APPROVED',
    firstName: 'Arun',
    middleName: 'Kumar',
    lastName: 'Reddy',
    studentMobile: '9876543210',
    email: 'arun.reddy@example.com',
    currentAddressLine1: 'Flat 402, Green Towers',
    city: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    fatherName: 'Venkata Reddy',
    fatherMobile: '9876500001',
    academicYear: '2024-2025',
    course: 'B.Tech',
    department: 'Computer Science',
    branch: 'CSE',
    section: 'A',
    semester: '1',
    quota: 'Convenor',
    tenthBoard: 'State Board',
    tenthInstitution: 'Model High School',
    tuitionFee: '75000',
    admissionFee: '5000',
  }

  const normalized = normalizeCanonicalStudent(apiStudent)

  assert.equal(normalized.id, 'STU-202')
  assert.equal(normalized.admissionId, 'ADM-101')
  assert.equal(normalized.studentId, 'STU-202')
  assert.equal(normalized.status, 'APPROVED')
  assert.equal(studentFullName(normalized), 'Arun Kumar Reddy')
  assert.equal(studentInitials(normalized), 'AK')
  assert.equal(studentQuotaDisplay(normalized), 'Convenor')
  assert.equal(normalized.contact.mobile, '9876543210')
  assert.equal(normalized.contact.currentAddress.line1, 'Flat 402, Green Towers')
  assert.equal(normalized.contact.currentAddress.city, 'Hyderabad')
  assert.equal(normalized.contact.currentAddress.pincode, '500081')
  assert.equal(normalized.parents.father.name, 'Venkata Reddy')
  assert.equal(normalized.parents.father.mobile, '9876500001')
  assert.equal(normalized.academic.section, 'A')
  assert.equal(normalized.academic.semester, '1')
  assert.equal(normalized.previousEducation.tenth.board, 'State Board')
  assert.equal(normalized.previousEducation.tenth.institution, 'Model High School')
  assert.equal(normalized.fees.tuitionFee, '75000')
})

test('formats address correctly and handles object unwrapping', () => {
  const addr = {
    line1: 'Road No 12',
    line2: 'Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    country: 'India',
  }
  const formatted = formatAddress(addr)
  assert.equal(formatted, 'Road No 12, Banjara Hills, Hyderabad, Telangana, 500034')

  const normalized = normalizeAddressObj('Main Road, Vijayawada')
  assert.equal(normalized.line1, 'Main Road, Vijayawada')
  assert.equal(normalized.country, 'India')
})

test('formats currency in Indian Rupees format', () => {
  assert.equal(formatMoney('50000').replace(/\s+/g, ' '), '₹50,000')
  assert.equal(formatMoney(75000).replace(/\s+/g, ' '), '₹75,000')
})

test('parses and standardizes 10-digit mobile and date formats', () => {
  assert.equal(tenDigitMobile('+91 98765 43210'), '9876543210')
  assert.equal(tenDigitMobile('9876543210'), '9876543210')
  assert.equal(dateInputValue('2024-08-15T10:30:00Z'), '2024-08-15')
  assert.equal(dateInputValue('15/08/2024'), '2024-08-15')
})
