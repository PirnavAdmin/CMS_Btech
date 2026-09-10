const key = value => value == null ? '' : String(value).trim()
const approved = value => ['APPROVED', 'APPROVE', 'ENROLLED'].includes(key(value).toUpperCase())

export function approvedStudentProfiles(profiles, admissions) {
  const byAdmission = new Map()
  const byStudent = new Map()
  for (const admission of admissions) {
    const admissionId = key(admission.admissionId ?? admission.id)
    const studentId = key(admission.studentId ?? admission.student?.studentId)
    if (admissionId) byAdmission.set(admissionId, admission)
    if (studentId) byStudent.set(studentId, admission)
  }
  return profiles.filter(profile => {
    const admissionId = key(profile.admissionId ?? profile.application?.admissionId ?? profile.admission?.admissionId)
    const admission = byAdmission.get(admissionId) ?? byStudent.get(key(profile.studentId ?? profile.id))
    return admission && approved(admission.currentStatus ?? admission.admissionStatus ?? admission.applicationStatus ?? admission.status)
  })
}
