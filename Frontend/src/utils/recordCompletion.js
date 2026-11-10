const placeholder = /^(?:[-–—]+|n\/?a|none|null|undefined|unknown|string|not (?:provided|available|configured)|select(?:\s+.*)?)$/i
export const meaningfulText = value => typeof value === 'string' && Boolean(value.trim()) && !placeholder.test(value.trim())
const positive = value => ['string', 'number'].includes(typeof value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
const email = value => meaningfulText(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
const phone = value => /^[1-9]\d{9,10}$/.test(String(value ?? '').replace(/[\s()+-]/g, ''))
const date = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return false
  const iso = value.slice(0, 10)
  const parsed = new Date(iso)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === iso
}
const website = value => {
  if (!meaningfulText(value)) return false
  try {
    const parsed = new URL(value)
    return ['https:', 'http:'].includes(parsed.protocol) && parsed.hostname.includes('.')
  } catch { return false }
}
const field = (key, label, options = {}) => ({ key, label, ...options })
const section = (id, label, ...fields) => ({ id, label, fields })
const required = { required: true }
const requiredId = { required: true, validate: positive }
const accreditationRequired = record => ['accredited', 'expired'].includes(String(record.accreditationStatus).toLowerCase())

// Only fields returned by the saved-record contracts belong in these schemas.
export const completionSchemas = {
  college: [
    section('college', 'College information',
      field('collegeName', 'College name', { ...required, aliases: ['name'] }),
      field('collegeCode', 'College code', { ...required, aliases: ['code'] }),
      field('type', 'College type', { aliases: ['collegeType'] }),
      field('university', 'University', { aliases: ['universityName'] }),
      field('logoPath', 'College logo', { aliases: ['logo'] })),
    section('address', 'Address',
      field('addressLine1', 'Address', { aliases: ['address'] }), field('city', 'City'), field('state', 'State'),
      field('pincode', 'Pincode', { validate: value => /^[1-9]\d{5}$/.test(String(value ?? '')) })),
    section('contact', 'Contact',
      field('email', 'Official email', { validate: email }),
      field('contact', 'Official phone', { aliases: ['mobile', 'phone', 'contactNumber'], validate: phone }),
      field('website', 'Website', { validate: website })),
    section('administration', 'Administration',
      field('principal', 'Principal name', { aliases: ['principalName'] }),
      field('principalEmail', 'Principal email', { validate: email }),
      field('principalContact', 'Principal phone', { validate: phone })),
    section('accreditation', 'Accreditation',
      field('accreditationStatus', 'Accreditation status', { validate: value => ['Accredited', 'Not Accredited', 'Under Review', 'Expired'].includes(value) }),
      field('accreditationBody', 'Accreditation body', { applies: accreditationRequired }),
      field('accreditationGrade', 'Accreditation grade', { applies: accreditationRequired }),
      field('accreditationNumber', 'Accreditation number', { applies: accreditationRequired }),
      field('validFrom', 'Accreditation start', { applies: accreditationRequired, validate: date }),
      field('validUntil', 'Accreditation end', { applies: accreditationRequired, validate: (value, record) => date(value) && (!date(record.validFrom) || value >= record.validFrom) })),
  ],
  department: [
    section('identity', 'Department information', field('departmentName', 'Department name', { ...required, aliases: ['name'] }),
      field('departmentCode', 'Department code', { ...required, aliases: ['code'] }), field('collegeId', 'College', requiredId)),
    section('profile', 'Department profile', field('description', 'Description')),
  ],
  course: [
    section('identity', 'Course information', field('courseName', 'Course name', { ...required, aliases: ['name'] }),
      field('courseCode', 'Course code', { ...required, aliases: ['code'] }), field('collegeId', 'College', requiredId),
      field('courseShortName', 'Short name', { aliases: ['shortName'] }), field('courseType', 'Type', { aliases: ['type'] })),
    section('structure', 'Academic structure', field('durationYears', 'Duration', { ...requiredId, aliases: ['durationValue'] }),
      field('totalSemesters', 'Semesters', { ...requiredId, aliases: ['semesters'] })),
    section('profile', 'Course profile', field('eligibility', 'Eligibility'), field('description', 'Description')),
  ],
  academicFeePlan: [
    section('applicability', 'Fee plan applicability', field('name', 'Plan name', required),
      field('academicYearId', 'Academic year', requiredId), field('courseId', 'Course', requiredId),
      field('cycle', 'Fee cycle'), field('semesterId', 'Semester', { ...requiredId, applies: record => record.cycle === 'SEMESTER' }),
      field('effectiveFrom', 'Effective from', { validate: date }), field('effectiveTo', 'Effective to', { validate: date })),
    section('charges', 'Fee components', field('components', 'Fee components', {
      required: true, validate: value => Array.isArray(value) && value.length > 0 &&
        value.every(item => meaningfulText(item.name) && Number(item.amount) > 0 && Number.isFinite(Number(item.amount))),
    })),
    section('schedule', 'Payment schedule', field('paymentMode', 'Payment mode', required),
      field('dueDate', 'Due date', { applies: record => record.paymentMode && record.paymentMode !== 'INSTALLMENTS', validate: date }),
      field('installments', 'Installments', { applies: record => record.paymentMode === 'INSTALLMENTS',
        validate: value => Array.isArray(value) && value.length > 0 &&
          value.every(item => date(item.dueDate) && Number(item.amount) > 0 && Number.isFinite(Number(item.amount))),
      })),
  ],
  studentProfile: [
    section('identity', 'Student information', field('studentName', 'Name', { ...required, aliases: ['personalFullName'] }),
      field('profilePhoto', 'Photo'), field('admissionNumber', 'Admission number', required)),
    section('enrollment', 'Academic enrollment', field('courseId', 'Course', requiredId),
      field('academicYearId', 'Academic year', requiredId), field('branchId', 'Branch', { validate: positive }),
      field('sectionId', 'Section', { validate: positive })),
    section('contact', 'Student contact', field('email', 'Email', { validate: email }), field('mobile', 'Mobile', { validate: phone })),
  ],
  admission: [
    section('identity', 'Student information', field('firstName', 'First name', required),
      field('lastName', 'Last name'), field('gender', 'Gender', required),
      field('dateOfBirth', 'Date of birth', { ...required, aliases: ['dob'], validate: date }),
      field('bloodGroup', 'Blood group')),
    section('contact', 'Student contact', field('email', 'Email', { aliases: ['studentEmail'], validate: email }),
      field('mobile', 'Mobile', { aliases: ['mobileNumber'], validate: phone }),
      field('alternateEmail', 'Alternate email', { validate: email }),
      field('alternateMobile', 'Alternate mobile', { validate: phone })),
    section('family', 'Parent / guardian',
      field('fatherName', 'Parent or guardian name', { aliases: ['motherName', 'guardianName'] }),
      field('guardianMobile', 'Guardian mobile', { validate: phone })),
  ],
  faculty: [
    section('identity', 'Employee information', field('fullName', 'Name', required),
      field('collegeId', 'College', requiredId), field('departmentId', 'Department', requiredId)),
    section('contact', 'Official contact', field('email', 'Official email', { ...required, validate: email }),
      field('mobile', 'Mobile', { ...required, validate: phone })),
    section('employment', 'Employment', field('employmentType', 'Employment type', required),
      field('designation', 'Designation'), field('joiningDate', 'Joining date', { validate: date })),
    section('education', 'Qualifications', field('qualification', 'Qualification'), field('specialization', 'Specialization')),
  ],
  branch: [
    section('identity', 'Branch information', field('branchName', 'Branch name', { ...required, aliases: ['name'] }),
      field('branchCode', 'Branch code', { ...required, aliases: ['code'] }), field('courseId', 'Course', requiredId),
      field('branchType', 'Branch type', { required: true, validate: value => ['core', 'specialization'].includes(String(value).toLowerCase()) }),
      field('specialization', 'Specialization', { required: true, applies: record => String(record.branchType).toLowerCase() === 'specialization' })),
    section('profile', 'Branch profile', field('shortName', 'Short name'), field('description', 'Description'),
      field('intakeCapacity', 'Approved intake', { aliases: ['intake'], validate: positive }),
      field('startingAcademicYearId', 'Starting academic year', { validate: positive })),
  ],
  section: [
    section('mapping', 'Academic mapping',
      field('courseId', 'Course', requiredId), field('branchId', 'Branch', requiredId),
      field('semesterId', 'Semester', requiredId), field('academicYearId', 'Academic year', requiredId)),
    section('identity', 'Section information',
      field('name', 'Section name', { ...required, aliases: ['sectionName'] }),
      field('code', 'Section code', { ...required, aliases: ['sectionCode'] }),
      field('capacity', 'Capacity', requiredId)),
    section('assignments', 'Assignments',
      field('room', 'Room / classroom'),
      field('advisor', 'Faculty advisor', { aliases: ['facultyAdvisorName'] })),
  ],
}

export function calculateCompletion(schema, record) {
  let earned = 0
  let possible = 0
  const sections = schema.flatMap(group => {
    const applicable = group.fields.filter(item => !item.applies || item.applies(record))
    if (!applicable.length) return []
    const missing = applicable.filter(item => {
      const value = [item.key, ...(item.aliases || [])].map(key => record[key]).find(value => value != null)
      const weight = item.weight ?? 1
      possible += weight
      if (!(item.validate || meaningfulText)(value, record)) return true
      earned += weight
      return false
    })
    return [{ id: group.id, label: group.label, complete: !missing.length, missing }]
  })
  const percent = possible ? (earned === possible ? 100 : Math.min(99, Math.round(earned / possible * 100))) : null
  return { percent, sections, complete: percent === 100 }
}

// Program setup uses the same scoring as other directories. Calendar dates
// and optional profile fields do not block completion of the structure.
export function programCompletion(record, branches, plannedTerms) {
  const identity = completionSchemas.course[0]
  const structure = completionSchemas.course[1]
  return calculateCompletion([
    { ...identity, fields: identity.fields.filter(item => item.key !== 'courseShortName') },
    structure,
    section('department', 'Department mapping', field('mapped', 'Linked department', { required: true, validate: Boolean })),
    section('branch', 'Branches',
      ...branches.map((branch, index) => field('branch' + index, branch.name, {
        required: true, weight: 1 / branches.length, validate: () => branch.configured,
      })),
      field('hasBranches', 'At least one saved branch', { required: true, applies: () => !branches.length, validate: () => false })),
    section('semester', 'Semester definitions',
      ...branches.flatMap((branch, index) => plannedTerms.map(term =>
        field('semester' + index + '-' + term.semesterNumber, branch.name + ' · ' + term.semesterName, {
          required: true, weight: 1 / (branches.length * plannedTerms.length),
          validate: () => branch.terms.has(term.semesterNumber),
        }))),
      field('hasDefinitions', 'Saved semester definitions', {
        required: true, applies: () => !branches.length || !plannedTerms.length, validate: () => false,
      })),
  ], record)
}

export function departmentDirectoryCompletion(record) {
  return calculateCompletion(completionSchemas.department, record)
}
