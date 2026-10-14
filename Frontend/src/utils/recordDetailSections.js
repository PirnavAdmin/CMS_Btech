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
  return [{ title: 'Student Basic Details', rows: [
    ['Student Name', [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ')],
    ['First Name', personal.firstName], ['Middle Name', personal.middleName], ['Last Name', personal.lastName],
    ['Gender', personal.gender], ['Date of Birth', personal.dob], ['Blood Group', personal.bloodGroup], ['Nationality', personal.nationality], ['Aadhaar Number', personal.aadhaar],
  ] }, { title: 'Contact Details', rows: [
    ['Student Email', contact.email], ['Alternate Email', contact.alternateEmail], ['Student Mobile', contact.mobile], ['Alternate Mobile', contact.alternateMobile],
    ['Current Address', address(contact.currentAddress)], ['Permanent Address', address(contact.permanentAddress)],
  ] }, { title: 'Admission Details', rows: [
    ['Registration Number', app.registrationNumber || app.number], ['Registration Date', app.registrationDate || app.date],
    ['Admission Number', app.admissionNumber], ['Admission Date', app.admissionDate],
    ['College', admission.college], ['Batch', admission.batch], ['Scholarship', admission.scholarship], ['Hostel', admission.hostel], ['Hostel Preference', admission.hostelPreference], ['Room Type / Beds', admission.hostelRoomType], ['Transportation', admission.transport], ['Transport Route', admission.transportRoute], ['Status', data.status],
  ] }, { title: 'Academic Details', rows: [
    ['Academic Year', academic.academicYear], ['Course', academic.course], ['Course Code', academic.courseCode], ['Department', academic.department], ['Branch', academic.branch], ['Branch Code', academic.branchCode],
    ['Admission Type', academic.admissionType], ['Quota', academic.quotaOther || academic.quota], ['Regulation', academic.regulation], ['Student Category', academic.studentCategory],
  ] }, { title: 'Parent Details', rows: [
    ['Father Name', parents.father?.name], ['Father Mobile', parents.father?.mobile], ['Father Email', parents.father?.email], ['Father Occupation', parents.father?.occupation], ['Father Qualification', parents.father?.qualification], ['Father Annual Income', parents.father?.income],
    ['Mother Name', parents.mother?.name], ['Mother Mobile', parents.mother?.mobile], ['Mother Email', parents.mother?.email], ['Mother Occupation', parents.mother?.occupation], ['Mother Qualification', parents.mother?.qualification], ['Mother Annual Income', parents.mother?.income],
    ['Guardian Name', parents.guardian?.name], ['Guardian Relationship', parents.guardian?.relationshipOther || parents.guardian?.relationship], ['Guardian Mobile', parents.guardian?.mobile], ['Guardian Email', parents.guardian?.email], ['Guardian Occupation', parents.guardian?.occupation], ['Guardian Qualification', parents.guardian?.qualification], ['Guardian Annual Income', parents.guardian?.income], ['Primary Contact', parents.primaryContact], ['Emergency Contact', parents.emergencyMobile],
  ] }, { title: 'Previous Education', rows: [
    ['10th Board', education.tenth?.board], ['10th School Name', education.tenth?.institution], ['10th Roll Number', education.tenth?.rollNumber], ['10th Passing Year', education.tenth?.passingYear], ['10th Score Type', education.tenth?.scoreType], ['10th Score', education.tenth?.score],
    ['Qualification', education.intermediate?.qualification], ['Board / University', education.intermediate?.board], ['College Name', education.intermediate?.institution], ['Passing Year', education.intermediate?.passingYear], ['Stream', education.intermediate?.streamOther || education.intermediate?.stream], ['Score Type', education.intermediate?.scoreType], ['Score', education.intermediate?.score],
  ] }, { title: 'Fee Details', rows: [
    ['Tuition Fee (per year)', fees.tuitionFee], ['Admission Fee (one-time)', fees.admissionFee], ['Scholarship Deduction', fees.scholarshipAmount], ['Hostel Fee (per year)', fees.hostelFee], ['Transportation Fee (per year)', fees.transportFee], ['Estimated First-Year Total', fees.totalFee], ['Payment Preference', fees.paymentPlan], ['Payment Status', fees.paymentStatus],
  ] }]
}

export const sectionsFromColumns = (title, record, columns) => [{ title, rows: columns.map(column => [column.label, typeof column.value === 'function' ? column.value(record) : record[column.value]]) }]
