import {
  studentProfilesApi,
  studentApi,
  studentAdmissionApi,
  sectionAssignmentApi,
} from '../api/apiEndpoints'
import { normalizeCanonicalStudent, studentFullName } from '../utils/studentCanonicalModel'
import eventBus, { ERP_EVENTS } from './eventBus'

const normalizeAcademicTerm = (str) => {
  if (!str) return ''
  const clean = String(str).trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
  const known = {
    computerscienceandengineering: 'cse',
    computerscienceengineering: 'cse',
    computerscience: 'cse',
    cs: 'cse',
    cse: 'cse',
    electronicsandcommunicationengineering: 'ece',
    electronicscommunicationengineering: 'ece',
    electronicsandcommunication: 'ece',
    electronicscommunication: 'ece',
    electronics: 'ece',
    ece: 'ece',
    electricalandelectronicsengineering: 'eee',
    electricalelectronicsengineering: 'eee',
    electricalandelectronics: 'eee',
    electricalelectronics: 'eee',
    electrical: 'eee',
    eee: 'eee',
    mechanicalengineering: 'me',
    mechanical: 'me',
    me: 'me',
    mech: 'me',
    civilengineering: 'ce',
    civil: 'ce',
    ce: 'ce',
    informationtechnology: 'it',
    it: 'it',
    artificialintelligenceanddatascience: 'aids',
    artificialintelligencedatascience: 'aids',
    artificialintelligenceandmachinelearning: 'aiml',
    artificialintelligencemachinelearning: 'aiml',
    bacheloroftechnology: 'btech',
    btech: 'btech',
    masteroftechnology: 'mtech',
    mtech: 'mtech',
  }
  return known[clean] || clean
}

/**
 * Student Service
 * Centralizes student profile queries, section allocations, admissions,
 * and unified student data model across Pirnav ERP.
 */

class StudentService {
  constructor() {
    this._cache = new Map()
    this._ttl = 20000 // 20s

    eventBus.subscribe(ERP_EVENTS.STUDENT_UPDATED, () => this.clearCache())
    eventBus.subscribe(ERP_EVENTS.PROMOTION_EXECUTED, () => this.clearCache())
  }

  clearCache() {
    this._cache.clear()
  }

  async getAllProfiles(params = {}) {
    // Attendance must be able to see a profile immediately after it is saved.
    // `forceRefresh` is client-only and must never be sent as an API query.
    const { forceRefresh = false, ...apiParams } = params
    const key = `profiles:${JSON.stringify(apiParams)}`
    if (!forceRefresh && this._cache.has(key)) {
      const entry = this._cache.get(key)
      if (Date.now() - entry.timestamp < this._ttl) return entry.data
    }

    try {
      const [profilesRes, admissionsRes] = await Promise.allSettled([
        studentProfilesApi.getAll(apiParams),
        studentAdmissionApi.getAll(),
      ])
      const profiles = profilesRes.status === 'fulfilled' && Array.isArray(profilesRes.value) ? profilesRes.value : []
      const admissions = admissionsRes.status === 'fulfilled' && Array.isArray(admissionsRes.value) ? admissionsRes.value : []

      const byAdmission = new Map()
      const byStudent = new Map()
      const byRegNo = new Map()

      for (const adm of admissions) {
        const canonicalAdm = normalizeCanonicalStudent(adm)
        const admId = String(canonicalAdm.admissionId || adm.admissionId || adm.id || '').trim()
        const sId = String(canonicalAdm.studentId || adm.studentId || adm.student?.studentId || adm.student?.id || '').trim()
        const regNo = String(canonicalAdm.application?.registrationNumber || adm.application?.registrationNumber || adm.application?.number || '').trim()

        if (admId) byAdmission.set(admId, { raw: adm, canonical: canonicalAdm })
        if (sId) byStudent.set(sId, { raw: adm, canonical: canonicalAdm })
        if (regNo) byRegNo.set(regNo, { raw: adm, canonical: canonicalAdm })
      }

      const mergedProfiles = profiles.map(p => {
        const canonicalProf = normalizeCanonicalStudent(p)
        const admId = String(canonicalProf.admissionId || p.admissionId || p.application?.admissionId || p.admission?.admissionId || '').trim()
        const sId = String(canonicalProf.studentId || p.studentId || p.id || '').trim()
        const regNo = String(canonicalProf.application?.registrationNumber || p.application?.registrationNumber || p.registrationNumber || '').trim()

        const matched = (admId ? byAdmission.get(admId) : null) || (sId ? byStudent.get(sId) : null) || (regNo ? byRegNo.get(regNo) : null)
        const matchedCanonical = matched?.canonical || {}
        const matchedRaw = matched?.raw || {}

        const finalPersonal = {
          ...matchedCanonical.personal,
          ...canonicalProf.personal,
          firstName: canonicalProf.personal?.firstName || matchedCanonical.personal?.firstName || matchedRaw.firstName || '',
          lastName: canonicalProf.personal?.lastName || matchedCanonical.personal?.lastName || matchedRaw.lastName || '',
          middleName: canonicalProf.personal?.middleName || matchedCanonical.personal?.middleName || matchedRaw.middleName || '',
          fullName:
            studentFullName(canonicalProf) ||
            studentFullName(matchedCanonical) ||
            matchedRaw.fullName ||
            matchedRaw.studentName ||
            p.studentName ||
            p.fullName ||
            '',
          photo: canonicalProf.personal?.photo || matchedCanonical.personal?.photo || '',
        }

        const finalName =
          finalPersonal.fullName ||
          [finalPersonal.firstName, finalPersonal.middleName, finalPersonal.lastName].filter(Boolean).join(' ') ||
          p.studentName ||
          p.fullName ||
          p.name ||
          'Student'

        const finalAcademic = {
          ...matchedRaw.academic,
          ...matchedCanonical.academic,
          ...canonicalProf.academic,
          course: canonicalProf.academic?.course || matchedCanonical.academic?.course || matchedRaw.academic?.course || p.course || '',
          courseId: canonicalProf.academic?.courseId || matchedCanonical.academic?.courseId || matchedRaw.academic?.courseId || p.courseId || '',
          branch: canonicalProf.academic?.branch || matchedCanonical.academic?.branch || matchedRaw.academic?.branch || p.branch || '',
          branchId: canonicalProf.academic?.branchId || matchedCanonical.academic?.branchId || matchedRaw.academic?.branchId || p.branchId || '',
          semester: canonicalProf.academic?.semester || matchedCanonical.academic?.semester || matchedRaw.academic?.semester || p.semester || '',
          semesterId: canonicalProf.academic?.semesterId || matchedCanonical.academic?.semesterId || matchedRaw.academic?.semesterId || p.semesterId || '',
          section: canonicalProf.academic?.section || matchedCanonical.academic?.section || matchedRaw.academic?.section || p.section || '',
          sectionId: canonicalProf.academic?.sectionId || matchedCanonical.academic?.sectionId || matchedRaw.academic?.sectionId || p.sectionId || '',
          academicYear: canonicalProf.academic?.academicYear || matchedCanonical.academic?.academicYear || matchedRaw.academic?.academicYear || p.academicYear || '',
          academicYearId: canonicalProf.academic?.academicYearId || matchedCanonical.academic?.academicYearId || matchedRaw.academic?.academicYearId || p.academicYearId || '',
          rollNumber: canonicalProf.academic?.rollNumber || matchedCanonical.academic?.rollNumber || matchedRaw.academic?.rollNumber || p.rollNumber || '',
        }

        const finalApp = {
          ...matchedCanonical.application,
          ...canonicalProf.application,
          number: canonicalProf.application?.number || matchedCanonical.application?.number || p.number || '',
          registrationNumber: canonicalProf.application?.registrationNumber || matchedCanonical.application?.registrationNumber || p.registrationNumber || '',
          admissionNumber: canonicalProf.application?.admissionNumber || matchedCanonical.application?.admissionNumber || p.admissionNumber || '',
        }

        return {
          ...canonicalProf,
          id: sId || admId || canonicalProf.id,
          studentId: sId || admId || canonicalProf.studentId,
          studentName: finalName,
          fullName: finalName,
          name: finalName,
          rollNumber: finalAcademic.rollNumber || finalApp.admissionNumber || '',
          registrationNumber: finalApp.registrationNumber || finalApp.number || finalAcademic.rollNumber || '',
          personal: finalPersonal,
          academic: finalAcademic,
          application: finalApp,
          admission: {
            ...matchedCanonical.admission,
            ...canonicalProf.admission,
            college: canonicalProf.admission?.college || matchedCanonical.admission?.college || '',
          },
          contact: {
            ...matchedCanonical.contact,
            ...canonicalProf.contact,
          },
          status: p.status || canonicalProf.status || 'Active',
        }
      })

      const existingProfileStudentIds = new Set(mergedProfiles.map(p => String(p.studentId || p.id)))
      const existingProfileAdmIds = new Set(mergedProfiles.map(p => String(p.admissionId || '')).filter(Boolean))

      const approvedAdditionalAdmissions = admissions.filter(a => {
        const canonical = normalizeCanonicalStudent(a)
        const stat = String(a.status || a.currentStatus || a.admissionStatus || canonical.status || '').toUpperCase()
        const sId = String(canonical.studentId || a.studentId || a.student?.studentId || a.student?.id || '')
        const admId = String(canonical.admissionId || a.admissionId || a.id || '')
        const isAppr = stat === 'APPROVED' || stat === 'ENROLLED' || stat === 'ACTIVE'
        return isAppr && (!sId || !existingProfileStudentIds.has(sId)) && (!admId || !existingProfileAdmIds.has(admId))
      }).map(a => {
        const canonical = normalizeCanonicalStudent(a)
        const name = studentFullName(canonical) || a.name || 'Student'
        return {
          ...canonical,
          id: canonical.studentId || canonical.admissionId || a.id,
          studentId: canonical.studentId || canonical.admissionId || a.id,
          studentName: name,
          fullName: name,
          name: name,
          rollNumber: canonical.academic?.rollNumber || canonical.application?.admissionNumber || a.academic?.rollNumber || '',
          registrationNumber: canonical.application?.registrationNumber || canonical.application?.number || a.application?.registrationNumber || '',
          academic: {
            ...a.academic,
            ...canonical.academic,
          },
          status: 'Active',
        }
      })

      const combined = [...mergedProfiles, ...approvedAdditionalAdmissions]
      this._cache.set(key, { data: combined, timestamp: Date.now() })
      return combined
    } catch (err) {
      console.warn('Fallback fetching student profiles:', err)
      return []
    }
  }

  async getProfileById(id) {
    if (!id) return null
    try {
      return await studentProfilesApi.preview(id)
    } catch (err) {
      console.warn(`Fallback fetching profile for ID ${id}:`, err)
      return null
    }
  }

  async updateProfile(id, payload) {
    const result = await studentProfilesApi.update(id, payload)
    eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { studentId: id, payload: result })
    return result
  }

  // Query students matching academic scope (for Section Allocation, Attendance, Marks/Results, Promotions)
  async getStudentsByScope({
    academicYearId,
    academicYear,
    courseId,
    course,
    courseCode,
    branchId,
    branch,
    branchCode,
    semesterId,
    semester,
    sectionId,
    section,
    forceRefresh = false,
  } = {}) {
    const all = await this.getAllProfiles({ forceRefresh })

    const parseNum = (val) => {
      if (val === undefined || val === null || val === '') return null
      const m = String(val).match(/\d+/)
      return m ? Number(m[0]) : null
    }

    const normYear = (val) => String(val || '').replace(/[^0-9]/g, '')

    const targetCourseNorm = normalizeAcademicTerm(course || courseCode)
    const targetBranchNorm = normalizeAcademicTerm(branch || branchCode)
    const targetSemNum = parseNum(semesterId) ?? parseNum(semester)
    const targetYearNorm = normYear(academicYear)

    return all.filter((s) => {
      const acad = s.academic || {}

      // Academic Year matching
      if (academicYearId || academicYear) {
        const studentYearId = acad.academicYearId ? String(acad.academicYearId) : ''
        const studentYearNorm = normYear(acad.academicYear)

        if (academicYearId && studentYearId && String(academicYearId) === studentYearId) {
          // ID matched
        } else if (targetYearNorm && studentYearNorm) {
          const match =
            studentYearNorm.includes(targetYearNorm) ||
            targetYearNorm.includes(studentYearNorm) ||
            studentYearNorm.slice(0, 4) === targetYearNorm.slice(0, 4)
          if (!match && (acad.academicYearId || acad.academicYear)) return false
        } else if (academicYearId && (acad.academicYearId || acad.academicYear)) {
          return false
        }
      }

      // Course matching
      if (courseId || course || courseCode) {
        const studentCourseId = acad.courseId ? String(acad.courseId) : ''
        const studentCourseNorm = normalizeAcademicTerm(acad.course || acad.courseName || acad.courseCode)

        if (courseId && studentCourseId && String(courseId) === studentCourseId) {
          // ID matched
        } else if (targetCourseNorm && studentCourseNorm) {
          const match =
            targetCourseNorm === studentCourseNorm ||
            targetCourseNorm.includes(studentCourseNorm) ||
            studentCourseNorm.includes(targetCourseNorm)
          if (!match && (acad.courseId || acad.course)) return false
        } else if (courseId && (acad.courseId || acad.course)) {
          return false
        }
      }

      // Branch matching
      if (branchId || branch || branchCode) {
        const studentBranchId = acad.branchId ? String(acad.branchId) : ''
        const studentBranchNorm = normalizeAcademicTerm(acad.branch || acad.branchName || acad.branchCode)

        if (branchId && studentBranchId && String(branchId) === studentBranchId) {
          // ID matched
        } else if (targetBranchNorm && studentBranchNorm) {
          const match =
            targetBranchNorm === studentBranchNorm ||
            targetBranchNorm.includes(studentBranchNorm) ||
            studentBranchNorm.includes(targetBranchNorm)
          if (!match && (acad.branchId || acad.branch)) return false
        } else if (branchId && (acad.branchId || acad.branch)) {
          return false
        }
      }

      // Semester matching
      const studentSemNum = parseNum(acad.semesterId) ?? parseNum(acad.semester || acad.semesterName)
      if (targetSemNum !== null && studentSemNum !== null) {
        if (targetSemNum !== studentSemNum) return false
      } else if (semester && acad.semester) {
        const tSem = String(semester).trim().toLowerCase()
        const sSem = String(acad.semester).trim().toLowerCase()
        if (!sSem.includes(tSem) && !tSem.includes(sSem)) return false
      }

      // Section matching
      const studentSectionId = acad.sectionId ?? acad.section_id ?? acad.section?.id
      const studentSection = acad.sectionName || acad.section_name || (typeof acad.section === 'string' ? acad.section : '') || acad.sectionCode
      if (sectionId && studentSectionId && String(studentSectionId) !== String(sectionId)) return false
      if (section && studentSection) {
        const normalizeSection = value => String(value).trim().toLowerCase().replace(/^section\s*/, '').replace(/[^a-z0-9]/g, '')
        if (normalizeSection(studentSection) !== normalizeSection(section)) return false
      }

      return true
    })
  }

  // Get students assigned to a specific section ID
  async getStudentsForSection(sectionId) {
    if (!sectionId) return []
    try {
      // First check backend section assignment endpoint
      const list = await sectionAssignmentApi.listBySection(sectionId)
      if (Array.isArray(list) && list.length > 0) return list
    } catch (err) {
      console.warn(`Section assignment endpoint fallback for section ${sectionId}:`, err)
    }
    // Fallback to searching profiles by sectionId
    return this.getStudentsByScope({ sectionId })
  }
}

export const studentService = new StudentService()
export default studentService
