import { normalizeCanonicalStudent, studentFullName } from './studentCanonicalModel.js'
import { approvedStudentProfiles, isApprovedAdmission } from './approvedStudentProfiles.js'

const text = value => value == null || ['undefined', 'null'].includes(String(value).trim().toLowerCase()) ? '' : String(value).trim()
const label = value => text(value).toLowerCase().replace(/\s+/g, ' ')
const sectionLabel = value => label(value).replace(/^section\s+/, '')

export function sectionStudentProfiles(profiles, admissions) {
  const normalizedAdmissions = admissions.filter(row => isApprovedAdmission(row.currentStatus ?? row.admissionStatus ?? row.applicationStatus ?? row.status)).map(normalizeCanonicalStudent)
  const approved = approvedStudentProfiles(profiles.map(row => normalizeCanonicalStudent({ ...row, studentId: row.studentId || row.header?.studentId || row.personalInformation?.studentId || row.id })), admissions)
  const profileByStudentId = new Map(approved.map(profile => [text(profile.studentId), profile]))
  const admissionByStudentId = new Map(admissions.map(row => {
    const canonical = normalizeCanonicalStudent(row)
    return [text(canonical.studentId || row.studentId || row.student?.studentId || row.student?.id), row]
  }).filter(([id]) => id))
  // Student profiles can be created directly after enrollment and may not have
  // an admission row. Include those real, academically mapped profiles while
  // keeping drafts, rejected applications, and incomplete profiles out.
  const standaloneProfiles = profiles.flatMap(row => {
    const studentId = text(row.studentId || row.header?.studentId || row.personalInformation?.studentId || row.id)
    if (!/^\d+$/.test(studentId)) return []
    const relatedAdmission = admissionByStudentId.get(studentId)
    if (relatedAdmission && !isApprovedAdmission(relatedAdmission.currentStatus ?? relatedAdmission.admissionStatus ?? relatedAdmission.applicationStatus ?? relatedAdmission.status)) return []
    if (relatedAdmission) return []
    const status = text(row.studentStatus ?? row.status ?? row.currentStatus ?? row.profileStatus).toUpperCase()
    if (row.isActive === false || row.isDeleted === true || ['0', 'DRAFT', 'PENDING', 'REJECTED', 'INACTIVE', 'DELETED', 'WITHDRAWN'].includes(status)) return []
    const canonical = normalizeCanonicalStudent({ ...row, studentId })
    if (!text(canonical.academic.branchId || canonical.academic.branch)) return []
    return [canonical]
  })
  const seen = new Set()
  // Admissions are authoritative for eligibility and academic mapping. Profiles only enrich records not already represented by an admission.
  const candidates = [...normalizedAdmissions, ...approved, ...standaloneProfiles]
  return candidates.flatMap(profile => {
    // Admission IDs cannot be submitted as student IDs.
    const id = text(profile.studentId)
    if (!id || seen.has(id)) return []
    seen.add(id)
    const enrichment = profileByStudentId.get(id)
    const academic = Object.fromEntries(Object.keys(profile.academic).map(key => [key, text(profile.academic[key]) || enrichment?.academic?.[key] || '']))
    const registrationNumber = profile.application?.registrationNumber || enrichment?.application?.registrationNumber || ''
    const admissionNumber = profile.application?.admissionNumber || enrichment?.application?.admissionNumber || ''
    const rollNumber = academic.rollNumber || enrichment?.academic?.rollNumber || ''
    return [{ ...academic, id, studentId: id, name: studentFullName(profile) || studentFullName(enrichment), registrationNumber, admissionNumber, rollNumber,
      code: [...new Set([admissionNumber, registrationNumber, rollNumber].filter(Boolean))].join(' / '),
      enrollmentNo: rollNumber || registrationNumber || admissionNumber }]
  })
}

const normalizeBranchKey = (name = '') => {
  const s = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (/mech|mechanical/i.test(s)) return 'mech'
  if (/cse|computerscience|computer/i.test(s)) return 'cse'
  if (/ece|electronicsandcommunication|electronicscommunication/i.test(s)) return 'ece'
  if (/eee|electricalandelectronics|electricalelectronics/i.test(s)) return 'eee'
  if (/civil/i.test(s)) return 'civil'
  if (/aiml|artificialintelligenceandmachinelearning/i.test(s)) return 'aiml'
  if (/aids|artificialintelligenceanddatascience/i.test(s)) return 'aids'
  if (/it|informationtechnology/i.test(s)) return 'it'
  return s
}

const normSemNum = value => String(value || '').match(/\d+/)?.[0] || ''
const normYearStr = value => String(value || '').replace(/[^0-9]/g, '').slice(0, 4)

export function matchesSectionStudent(student, section) {
  // IDs are authoritative; labels/normalized keys are used only when an ID is absent.
  const matches = key => {
    const studentId = text(student[`${key}Id`])
    const targetId = text(key === 'section' ? section.id : section[`${key}Id`])
    if (studentId && targetId) return studentId === targetId

    if (key === 'branch') {
      const sBranch = normalizeBranchKey(student.branch || student.branchName || student.branchCode)
      const tBranch = normalizeBranchKey(section.branch || section.branchName || section.branchCode)
      if (sBranch && tBranch) return sBranch === tBranch || sBranch.includes(tBranch) || tBranch.includes(sBranch)
    }
    if (key === 'semester') {
      const sSem = normSemNum(student.semester || student.semesterName || student.semesterId)
      const tSem = normSemNum(section.semester || section.semesterName || section.semesterId || section.semesterNumber)
      if (sSem && tSem) return sSem === tSem
    }
    if (key === 'academicYear') {
      const sYear = normYearStr(student.academicYear || student.academicYearName)
      const tYear = normYearStr(section.academicYear || section.academicYearName)
      if (sYear && tYear) return sYear === tYear
    }

    const normalize = key === 'section' ? sectionLabel : label
    const studentName = normalize(student[key] || student[`${key}Name`])
    const targetName = normalize(key === 'section' ? section.name : section[key] || section[`${key}Name`])
    if (studentName && targetName) return studentName === targetName
    return null
  }
  if (matches('branch') !== true) return false
  if (['course', 'semester', 'academicYear'].some(key => matches(key) === false)) return false
  if (text(student.sectionId) || text(student.section)) return matches('section') === true
  return true
}


