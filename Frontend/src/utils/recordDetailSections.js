// Explicit projections of fields already available in the corresponding detail UI.
// These helpers never spread records or serialize arbitrary API fields.
export function promotionDetailSections(record) {
  return [{ title: 'Student', rows: [
    ['Student', record.studentName ?? record.fullName ?? record.name ?? record.personal?.fullName],
    ['Roll Number', record.rollNumber ?? record.academic?.rollNumber],
    ['Registration Number', record.registrationNumber],
    ['Course', record.courseName ?? record.course ?? record.academic?.course],
    ['Branch', record.branchName ?? record.branch ?? record.academic?.branch],
  ] }, { title: 'Promotion', rows: [
    ['Previous Semester', record.fromSemester ?? record.currentSemester ?? record.semester ?? record.academic?.semester],
    ['New Semester', record.toSemester ?? record.nextSemester ?? record.targetSemester],
    ['Previous Section', record.fromSection ?? record.currentSection ?? record.section ?? record.academic?.section],
    ['New Section', record.toSection ?? record.targetSection],
    ['Academic Year', record.academicYear ?? record.currentAcademicYear ?? record.academic?.academicYear],
    ['CGPA', record.cgpa], ['SGPA', record.sgpa], ['Credits', record.creditsEarned],
    ['Promotion Date', record.promotionDate], ['Mode', record.mode ?? record.promotionMode ?? record.promotionType],
    ['Status', record.eligibilityLabel ?? record.eligibilityStatus ?? record.status],
    ['Remarks', record.remarks ?? record.eligibilityReason ?? record.reason],
  ] }]
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
