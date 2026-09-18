import { normalizeCanonicalStudent, studentFullName } from './studentCanonicalModel.js'
import { approvedStudentProfiles, isApprovedAdmission } from './approvedStudentProfiles.js'

const text = value => value == null || ['undefined', 'null'].includes(String(value).trim().toLowerCase()) ? '' : String(value).trim()
const label = value => text(value).toLowerCase().replace(/\s+/g, ' ')
const sectionLabel = value => label(value).replace(/^section\s+/, '')

export function sectionStudentProfiles(profiles, admissions) {
  const approved = approvedStudentProfiles(profiles.map(row => normalizeCanonicalStudent({ ...row, studentId: row.studentId || row.header?.studentId || row.personalInformation?.studentId || row.id })), admissions)
  const seen = new Set()
  const candidates = [...approved, ...admissions.filter(row => isApprovedAdmission(row.currentStatus ?? row.admissionStatus ?? row.applicationStatus ?? row.status)).map(normalizeCanonicalStudent)]
  return candidates.flatMap(profile => {
    // Admission IDs cannot be submitted as student IDs.
    const id = text(profile.studentId)
    if (!id || seen.has(id)) return []
    seen.add(id)
    const academic = profile.academic
    const registrationNumber = profile.application?.registrationNumber || ''
    const admissionNumber = profile.application?.admissionNumber || ''
    const rollNumber = academic.rollNumber || ''
    return [{ ...academic, id, studentId: id, name: studentFullName(profile), registrationNumber, admissionNumber, rollNumber,
      code: [...new Set([admissionNumber, registrationNumber, rollNumber].filter(Boolean))].join(' / '),
      enrollmentNo: rollNumber || registrationNumber || admissionNumber }]
  })
}

export function matchesSectionStudent(student, section) {
  // IDs are authoritative; labels are used only when an ID is absent.
  const matches = key => {
    const studentId = text(student[`${key}Id`])
    const targetId = text(key === 'section' ? section.id : section[`${key}Id`])
    if (studentId && targetId) return studentId === targetId
    const normalize = key === 'section' ? sectionLabel : label
    const studentName = normalize(student[key])
    const targetName = normalize(key === 'section' ? section.name : section[key])
    return studentName && targetName ? studentName === targetName : null
  }
  if (matches('branch') !== true) return false
  if (['course', 'semester', 'academicYear'].some(key => matches(key) === false)) return false
  if (text(student.sectionId) || text(student.section)) return matches('section') === true
  return true
}
