// Explicit projections of fields already available in the corresponding detail UI.
// These helpers never spread records or serialize arbitrary API fields.
export function promotionDetailSections(record = {}) {
  const personal = record.personal || {}
  const academic = record.academic || {}
  const fullName =
    record.studentName ??
    record.fullName ??
    [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ') ??
    personal.fullName ??
    record.name ??
    'Student'

  const studentRows = [
    ['Student Name', fullName],
    ['Roll Number', record.rollNumber ?? academic.rollNumber],
    ['Registration Number', record.registrationNumber ?? record.application?.registrationNumber ?? record.application?.number],
    ['Course', record.course ?? record.courseName ?? academic.course],
    ['Branch', record.branch ?? record.branchName ?? academic.branch],
    ['Academic Year', record.academicYear ?? record.currentAcademicYear ?? academic.academicYear],
    ['College', record.college ?? record.admission?.college ?? academic.college],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '')

  const promotionRows = [
    ['Current Semester', record.fromSemester ?? record.currentSemester ?? record.semester ?? academic.semester],
    ['Next Semester', record.toSemester ?? record.nextSemester ?? record.targetSemester],
    ['Current Section', record.fromSection ?? record.currentSection ?? record.section ?? academic.section],
    ['Next Section', record.toSection ?? record.targetSection],
    ['Academic Year', record.academicYear ?? record.currentAcademicYear ?? academic.academicYear],
    ['CGPA', record.cgpa],
    ['SGPA', record.sgpa],
    ['Credits Earned', record.creditsEarned],
    ['Promotion Date', record.promotionDate],
    ['Mode', record.mode ?? record.promotionMode ?? record.promotionType],
    ['Eligibility Status', record.eligibilityLabel ?? record.eligibilityStatus ?? record.status],
    ['Remarks / Reason', record.remarks ?? record.eligibilityReason ?? record.reason],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '')

  return [
    { title: 'Student Details', rows: studentRows },
    { title: 'Promotion Details', rows: promotionRows },
  ]
}

export function admissionDetailSections(data) {
  const personal = data.personal || {}, app = data.application || {}, academic = data.academic || {}, parents = data.parents || {}
  const contact = data.contact || {}, admission = data.admission || {}, education = data.previousEducation || {}, fees = data.fees || {}
  const address = value => [value?.line1, value?.line2, value?.city, value?.district, value?.state, value?.pincode].filter(Boolean).join(', ')
  const parentName = parents.father?.name || parents.guardian?.name || parents.mother?.name || 'Not provided'
  const parentMobile = parents.father?.mobile || parents.guardian?.mobile || parents.mother?.mobile || 'Not provided'
  const parentRel = parents.guardian?.relationshipOther || parents.guardian?.relationship || (parents.father?.name ? 'Father' : parents.mother?.name ? 'Mother' : 'Parent')
  const familyIncome = parents.father?.income || parents.mother?.income || parents.guardian?.income
  const inter = education.intermediate || {}
  const tenth = education.tenth || {}

  return [{ title: 'Student Identity', rows: [
    ['Student Name', [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ') || data.name || ''],
    ['Gender', personal.gender],
    ['Date of Birth', personal.dob],
    ['Aadhaar Number', personal.aadhaar],
  ] }, { title: 'Contact Information', rows: [
    ['Student Mobile', contact.mobile],
    ['Student Email', contact.email],
    ['Current Address', address(contact.currentAddress)],
  ] }, { title: 'Parent / Guardian Contact', rows: [
    ['Parent / Guardian Name', parentName],
    ['Relationship', parentRel],
    ['Parent Mobile', parentMobile],
    ['Annual Family Income', familyIncome ? `₹ ${Number(familyIncome).toLocaleString('en-IN')}` : 'Not specified'],
    ['Emergency Contact', parents.emergencyMobile || parentMobile],
  ] }, { title: 'Academic Enrollment', rows: [
    ['Academic Year', academic.academicYear],
    ['Admission Type', academic.admissionType],
    ['Admission Quota', academic.quotaOther || academic.quota],
    ['Course / Program', academic.course],
    ['Department', academic.department],
    ['Branch / Specialization', academic.branch],
    ['Student Category', academic.studentCategory || 'General'],
  ] }, { title: 'Admission & Services', rows: [
    ['Registration Number', app.registrationNumber || app.number],
    ['Registration Date', app.registrationDate || app.date],
    ['Admission Number', (String(data.status).toUpperCase() === 'APPROVED' ? (app.admissionNumber || 'Allotted') : 'Pending Approval')],
    ['Admission Date', (String(data.status).toUpperCase() === 'APPROVED' ? (app.admissionDate || data.updatedAt) : 'Pending Approval')],
    ['Batch', admission.batch],
    ['Hostel Required', admission.hostel || 'No'],
    ...(admission.hostel === 'Yes' ? [['Hostel Preference', admission.hostelPreference]] : []),
    ['Transportation Required', admission.transport || 'No'],
    ...(admission.transport === 'Yes' ? [['Transport Route', admission.transportRoute]] : []),
    ['Admission Status', data.status],
  ] }, { title: 'Previous Education', rows: [
    ['Qualifying Examination', inter.qualification || 'Intermediate / 12th'],
    ['Board / University', inter.board],
    ['College / Institution', inter.institution],
    ['Hall Ticket / Roll Number', inter.rollNumber],
    ['Passing Year', inter.passingYear],
    ['Stream / Group', inter.streamOther || inter.stream],
    ['Aggregate Score', inter.score ? `${inter.score} ${inter.scoreType || '%'}` : '—'],
    ['10th Board', tenth.board],
    ['10th School Name', tenth.institution],
    ['10th Passing Year & Score', [tenth.passingYear, tenth.score ? `${tenth.score} ${tenth.scoreType || '%'}` : ''].filter(Boolean).join(' | ') || '—'],
  ] }, { title: 'Fee Details', rows: [
    ['Tuition Fee (per year)', fees.tuitionFee],
    ['Admission Fee (one-time)', fees.admissionFee],
    ['Scholarship Deduction', fees.scholarshipAmount ? `- ₹ ${fees.scholarshipAmount}` : 'None'],
    ...(admission.hostel === 'Yes' ? [['Hostel Fee (per year)', fees.hostelFee]] : []),
    ...(admission.transport === 'Yes' ? [['Transportation Fee (per year)', fees.transportFee]] : []),
    ['Estimated First-Year Total', fees.totalFee],
    ['Payment Preference', fees.paymentPlan],
    ['Fee Status', fees.paymentStatus],
  ] }]
}

export const sectionsFromColumns = (title, record, columns) => [{ title, rows: columns.map(column => [column.label, typeof column.value === 'function' ? column.value(record) : record[column.value]]) }]
