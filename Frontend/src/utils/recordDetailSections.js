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
  return [{ title: 'Student Basic Details', rows: [
    ['Student Name', [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ')],
    ['Gender', personal.gender], ['Date of Birth', personal.dob], ['Nationality', personal.nationality],
    ['Student Email', data.contact?.email], ['Student Mobile', data.contact?.mobile],
  ] }, { title: 'Admission Details', rows: [
    ['Registration Number', app.number], ['Registration Date', app.date],
    ['Admission Number', app.admissionNumber], ['Admission Date', app.admissionDate],
    ['College', data.admission?.college], ['Status', data.status],
  ] }, { title: 'Academic Details', rows: [
    ['Academic Year', academic.academicYear], ['Course', academic.course], ['Branch', academic.branch],
    ['Admission Type', academic.admissionType], ['Regulation', academic.regulation], ['Student Category', academic.studentCategory],
  ] }, { title: 'Parent Details', rows: [
    ['Father Name', parents.father?.name], ['Father Mobile', parents.father?.mobile],
    ['Mother Name', parents.mother?.name], ['Mother Mobile', parents.mother?.mobile],
    ['Guardian Name', parents.guardian?.name], ['Guardian Mobile', parents.guardian?.mobile],
  ] }]
}

export const sectionsFromColumns = (title, record, columns) => [{ title, rows: columns.map(column => [column.label, typeof column.value === 'function' ? column.value(record) : record[column.value]]) }]
