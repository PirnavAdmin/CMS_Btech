import { ProjectSelect } from '../../../components/SearchableSelect'
import useCollegeState from '../../../hooks/useCollegeState'
import { newestFirst } from '../../../utils/newestFirst'
import { promotionDetailSections } from '../../../utils/recordDetailSections'
import { showError } from '../../../utils/toast'
import useToastState from '../../../hooks/useToastState'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from './promotionMotion'
import InfoCard from '../../../components/InfoCard'
import { FiArrowRight, FiCheck, FiClock, FiEye, FiFilter, FiInfo, FiSearch, FiTrendingUp, FiUsers, FiX, FiAward, FiBookOpen, FiUser, FiRefreshCw } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'
import EmptyState from '../../../components/EmptyState'
import TablePagination from '../../../components/TablePagination'
import ExportMenu, { PrintDetailsButton } from '../../../components/ExportMenu'
import FilterPanel from '../../../components/FilterPanel'
import { promotionColumns, promotionHistoryColumns } from '../../../utils/exportColumns'
import { hasRole } from '../../../auth/auth'
import { ROLES } from '../../../auth/roles'
import { useAcademic } from '../../../context/AcademicContext'
import { apiAssetUrl, studentPromotionApi } from '../../../api/apiEndpoints'
import promotionService from '../../../services/promotionService'
import studentService from '../../../services/studentService'
import attendanceService from '../../../services/attendanceService'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import './StudentPromotion.css'

const formatSemesterLabel = (val) => {
  if (val === undefined || val === null || val === '') return '-'
  const str = String(val).trim()
  if (/^sem(ester)?/i.test(str) || /^grad/i.test(str)) return str
  if (/^\d+$/.test(str)) return `Semester ${str}`
  return str
}

const idOf = (x) => [x?.studentId, x?.id, x?.admissionId, x?.admissionNumber, x?.registrationNumber, x?.rollNumber].find((value) => value !== null && value !== undefined && String(value).trim() !== '')?.toString() || ''
const nameOf = (x) => {
  if (!x) return 'Unnamed Student'
  const personal = x.personal || {}
  const fullNameParts = [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ')
  const cand =
    x.studentName ||
    x.fullName ||
    fullNameParts ||
    personal.fullName ||
    x.name

  if (cand && String(cand).trim().toLowerCase() !== 'student') {
    return String(cand).trim()
  }
  return cand || 'Unnamed Student'
}
const statusOf = (x) => String(x?.eligibilityStatus ?? x?.status ?? 'Pending').toLowerCase()

function ConfirmModal({ rows, busy, onCancel, onConfirm, isDegreeReview }) {
  return (
    <div className="p-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="p-confirm">
        <div className="p-confirm-icon-wrap">
          {isDegreeReview ? <FiAward className="p-confirm-icon" /> : <FiTrendingUp className="p-confirm-icon" />}
        </div>
        <h2>{isDegreeReview ? 'Confirm Degree Completion & Graduation' : 'Confirm Student Promotion'}</h2>
        <p>
          <strong>{rows.length}</strong> eligible student{rows.length === 1 ? '' : 's'} selected for{' '}
          {isDegreeReview ? 'degree conferral & graduation review.' : 'promotion to the next semester term.'}
        </p>
        <footer>
          <button className="erp-btn erp-btn--secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="erp-btn erp-btn--primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Processing...' : isDegreeReview ? 'Confer Degree & Graduate' : 'Confirm Promotion'}
          </button>
        </footer>
      </section>
    </div>
  )
}

function ReviewDrawer({ student, onClose, onStatus, canEdit }) {
  const photo = student?.photo || student?.personal?.photo || student?.personal?.photoUrl || ''
  const photoSrc = photo ? (photo.startsWith('data:') || photo.startsWith('blob:') || photo.startsWith('http') ? photo : apiAssetUrl(photo)) : ''
  const studentName = nameOf(student)
  const initials = (studentName || 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'ST'

  const regNo = student?.registrationNumber || student?.application?.registrationNumber || student?.application?.number || ''
  const rollNo = student?.rollNumber || student?.academic?.rollNumber || ''
  const semText = student?.currentSemester || (student?.academic?.semester ? `Semester ${student.academic.semester}` : '')
  const courseBranchText = [
    student?.course || student?.academic?.course,
    student?.branch || student?.academic?.branch,
    student?.section || student?.academic?.section ? `Section ${student?.section || student?.academic?.section}` : null,
    semText,
  ]
    .filter(Boolean)
    .join(' - ')

  const isEligible = statusOf(student) === 'eligible' || statusOf(student) === 'promoted'

  return (
    <div className="p-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="p-drawer promotion-review-drawer" data-print-scope data-export-record>
        <header className="pr-modal-header">
          <div className="pr-modal-heading">
            <div className="pr-modal-icon-badge">
              <FiTrendingUp />
            </div>
            <div>
              <h2 className="pr-modal-title">Student Promotion & Review</h2>
              <p className="pr-modal-subtitle">Academic standing and promotion eligibility</p>
            </div>
          </div>
          <div className="pr-modal-actions">
            <ExportMenu
              mode="single"
              title="Promotion Details"
              filename={`promotion_${regNo || rollNo || idOf(student)}_${student?.fromSemester || student?.currentSemester || ""}-to-${student?.toSemester || student?.nextSemester || student?.targetSemester || ""}`}
              recordSections={promotionDetailSections(student)}
            />
            <button
              type="button"
              className="pr-close-btn"
              onClick={onClose}
              aria-label="Close modal"
              title="Close"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        <div className="pr-modal-body">
          <div className="pr-banner">
            {photoSrc ? (
              <img src={photoSrc} alt={studentName} className="pr-avatar" />
            ) : (
              <div className="pr-avatar">{initials}</div>
            )}
            <div className="pr-header-info">
              <div className="pr-badges">
                {regNo && <span className="pr-badge">Reg: {regNo}</span>}
                {rollNo && <span className="pr-badge">Roll: {rollNo}</span>}
                <span className={`pr-badge-status ${isEligible ? 'active' : 'inactive'}`}>
                  {student?.eligibilityLabel ?? student?.status ?? (isEligible ? 'Eligible' : 'Ineligible')}
                </span>
              </div>
              <h1 className="pr-title">{studentName}</h1>
              <p className="pr-subtitle">{courseBranchText}</p>
            </div>
          </div>

          <div className="pr-grid">
            <article className="pr-card">
              <div className="pr-card-header">
                <FiUser />
                <h3>Student Information</h3>
              </div>
              <div className="pr-fields">
                <div className="pr-field">
                  <span className="pr-label">Student Name</span>
                  <span className="pr-value">{studentName}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Roll Number</span>
                  <span className="pr-value">{rollNo || '-'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Registration Number</span>
                  <span className="pr-value">{regNo || '-'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Course</span>
                  <span className="pr-value">{student?.course || student?.academic?.course || '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Branch</span>
                  <span className="pr-value">{student?.branch || student?.academic?.branch || '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Current Section</span>
                  <span className="pr-value">{student?.section || student?.academic?.section || '—'}</span>
                </div>
                {(student?.academicYear || student?.academic?.academicYear) && (
                  <div className="pr-field">
                    <span className="pr-label">Academic Year</span>
                    <span className="pr-value">{student?.academicYear || student?.academic?.academicYear}</span>
                  </div>
                )}
                {(student?.college || student?.admission?.college || student?.academic?.college) && (
                  <div className="pr-field">
                    <span className="pr-label">College</span>
                    <span className="pr-value">{student?.college || student?.admission?.college || student?.academic?.college}</span>
                  </div>
                )}
              </div>
            </article>

            <article className="pr-card">
              <div className="pr-card-header">
                <FiTrendingUp />
                <h3>Advancement & Performance</h3>
              </div>
              <div className="pr-fields">
                <div className="pr-field">
                  <span className="pr-label">Current Semester</span>
                  <span className="pr-value">{formatSemesterLabel(student?.fromSemester || student?.currentSemester || student?.academic?.semester)}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Next Semester</span>
                  <span className="pr-value" style={{ color: 'var(--brand, #1769C2)', fontWeight: 700 }}>
                    {formatSemesterLabel(student?.toSemester || student?.nextSemester || student?.targetSemester)}
                  </span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">SGPA</span>
                  <span className="pr-value">{student?.sgpa ?? '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">CGPA</span>
                  <span className="pr-value">{student?.cgpa ?? '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Credits Earned</span>
                  <span className="pr-value">{student?.creditsEarned ?? '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Eligibility Status</span>
                  <span className="pr-value">
                    <span className={`pr-badge-status ${isEligible ? 'active' : 'inactive'}`} style={{ display: 'inline-block' }}>
                      {student?.eligibilityLabel ?? student?.status ?? (isEligible ? 'Eligible' : 'Ineligible')}
                    </span>
                  </span>
                </div>
                {(student?.reason || student?.remarks) && (
                  <div className="pr-field full-width">
                    <span className="pr-label">Remarks / Assessment</span>
                    <span className="pr-value">{student?.reason || student?.remarks}</span>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>

        <footer className="pr-modal-footer">
          {canEdit && (
            <div className="pr-footer-actions">
              <button
                type="button"
                className="erp-btn erp-btn--secondary pr-btn-ineligible"
                onClick={() => onStatus('INELIGIBLE')}
              >
                Mark Ineligible
              </button>
              <button
                type="button"
                className="erp-btn erp-btn--primary pr-btn-eligible"
                onClick={() => onStatus('ELIGIBLE')}
              >
                Mark Eligible
              </button>
            </div>
          )}
        </footer>
      </section>
    </div>
  )
}

export default function StudentPromotion() {
  const canPromote = hasRole([ROLES.ADMIN])
  const shouldReduceMotion = useReducedMotion()
  const {
    activeAcademicYears,
    currentAcademicYear,
    selectedCollegeId,
    activeCourses,
    loading: academicLoading,
    error: academicError,
    refreshHierarchy,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [tab, setTab] = useState('promotion') // 'promotion' | 'history'
  const [wizardStep, setWizardStep] = useState(1)
  const [eligibilityTab, setEligibilityTab] = useState('eligible')
  const [sortBy, setSortBy] = useState('name')
  const [promotionResult, setPromotionResult] = useState(null)
  const promotionBusyRef = useRef(false)
  const [students, setStudents] = useCollegeState([])
  const [history, setHistory] = useCollegeState([])
  const [dashboard, setDashboard] = useState({})

  // Promotion Scope
  const [courseId, setCourseId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('')
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState('')
  const [targetAcademicYearId, setTargetAcademicYearId] = useState('')
  const [targetSectionId, setTargetSectionId] = useState('')

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [review, setReview] = useState(null)
  const [confirmRows, setConfirmRows] = useState(null)
  const [, setNotice] = useToastState('', 'success')
  const [loading, setLoading] = useState({ masters: false, list: false, promotion: false })

  // 5-Row Pagination for Directory and History
  const [dirPage, setDirPage] = useState(1)
  const [histPage, setHistPage] = useState(1)
  const pageSize = 5

  const availableBranches = useMemo(() => {
    return getBranchesForCourse(courseId, true)
  }, [getBranchesForCourse, courseId])

  const availableSemesters = useMemo(() => {
    return getSemestersForCourse(courseId, true)
  }, [getSemestersForCourse, courseId])

  useEffect(() => {
    if (academicLoading) return
    if (courseId && !activeCourses.some((course) => String(course.id) === String(courseId))) {
      setCourseId('')
      setSelectedBranchId('')
      setSelectedSemesterNumber('')
    }
    if (selectedBranchId && !availableBranches.some((branch) => String(branch.id) === String(selectedBranchId))) {
      setSelectedBranchId('')
      setSelectedSemesterNumber('')
    }
    if (selectedSemesterNumber && !availableSemesters.some((semester) => String(semester.semesterNumber || semester.id) === String(selectedSemesterNumber))) {
      setSelectedSemesterNumber('')
    }
    if (selectedAcademicYearId && !activeAcademicYears.some((year) => String(year.id ?? year.academicYearId) === String(selectedAcademicYearId))) {
      setSelectedAcademicYearId('')
    }
  }, [academicLoading, activeCourses, availableBranches, availableSemesters, activeAcademicYears, courseId, selectedBranchId, selectedSemesterNumber, selectedAcademicYearId])

  const targetSections = useMemo(() => {
    return getSectionsForScope({
      academicYearId: targetAcademicYearId || selectedAcademicYearId,
      courseId,
      branchId: selectedBranchId,
      semesterId: Number(selectedSemesterNumber) + 1,
    }, true)
  }, [getSectionsForScope, targetAcademicYearId, selectedAcademicYearId, courseId, selectedBranchId, selectedSemesterNumber])

  const finalSemesterNumber = Math.max(0, ...availableSemesters.map(semester => Number(semester.semesterNumber || semester.id) || 0))
  const isFinalSemester = Boolean(selectedSemesterNumber && finalSemesterNumber && Number(selectedSemesterNumber) >= finalSemesterNumber)
  const isSemester8 = Number(selectedSemesterNumber) >= 8
  const isDegreeReview = isFinalSemester
  const canExecutePromotion = !isFinalSemester || Number(selectedSemesterNumber) === 8
  const promotionType = isFinalSemester ? 'degree' : 'next-semester'

  // Load Promotion Scope Students & History
  const loadPromotionData = useCallback(async (forceRefresh = false) => {
    if (!selectedBranchId || !selectedAcademicYearId || !selectedSemesterNumber) {
      setStudents([])
      return
    }

    try {
      setLoading((x) => ({ ...x, list: true }))
      const selectedCourse = activeCourses.find((c) => String(c.id) === String(courseId))
      const selectedBranch = availableBranches.find((b) => String(b.id) === String(selectedBranchId))
      const selectedSemester = availableSemesters.find((s) => Number(s.semesterNumber || s.id) === Number(selectedSemesterNumber))
      const selectedYear = activeAcademicYears.find((y) => String(y.id) === String(selectedAcademicYearId))

      // Load matching students from studentService
      const profiles = await studentService.getStudentsByScope({
        academicYearId: selectedAcademicYearId,
        academicYear: selectedYear?.name,
        courseId,
        branchId: selectedBranchId,
        semesterId: selectedSemesterNumber,
        course: selectedCourse?.name,
        courseCode: selectedCourse?.code,
        branch: selectedBranch?.name,
        branchCode: selectedBranch?.code,
        semester: selectedSemester?.semesterName,
        forceRefresh,
      })
      const eligibilityRows = await studentPromotionApi.getEligibleStudents({
        branchId: selectedBranchId,
        academicYearId: selectedAcademicYearId,
        semesterNumber: selectedSemesterNumber,
      })
      const eligibilityById = new Map((eligibilityRows || []).map(row => [String(row.studentId || row.id), row]))

      const scopeSections = getSectionsForScope({
        academicYearId: selectedAcademicYearId,
        courseId,
        branchId: selectedBranchId,
        semesterId: selectedSemester?.id ?? selectedSemesterNumber,
      }, true)
      let sectionRosters = []
      try {
        sectionRosters = await Promise.all(scopeSections.map(async section => ({
          section,
          students: await attendanceService.getStudentsForAttendance({
            collegeId: selectedCollegeId,
            sectionId: section.id,
          }),
        })))
      } catch (rosterError) {
        showError(rosterError.message || 'Profiles loaded, but section-assigned students could not be loaded.')
      }

      let attendanceByStudent = new Map()
      try {
        attendanceByStudent = await attendanceService.getStudentAttendanceSummary({
          collegeId: selectedCollegeId,
          academicYearId: selectedAcademicYearId,
          semesterId: selectedSemester?.id ?? selectedSemesterNumber,
          sectionIds: scopeSections.map(section => section.id),
        })
      } catch (attendanceError) {
        showError(attendanceError.message || 'Students loaded, but attendance details could not be loaded.')
      }

      const scopedProfiles = [...profiles]
      const scopedProfileIds = new Set(scopedProfiles.map(profile => String(profile.studentId || profile.id)))
      sectionRosters.forEach(({ section, students: roster }) => {
        roster.forEach(student => {
          const studentId = student.studentId || student.id
          if (!studentId || scopedProfileIds.has(String(studentId))) return
          scopedProfileIds.add(String(studentId))
          scopedProfiles.push({
            id: studentId,
            studentId,
            name: student.name,
            fullName: student.name,
            rollNumber: student.rollNumber,
            registrationNumber: student.registrationNumber,
            status: 'Active',
            academic: {
              course: selectedCourse?.name || '',
              courseId,
              branch: selectedBranch?.name || '',
              branchId: selectedBranchId,
              semester: selectedSemester?.semesterName || `Semester ${selectedSemesterNumber}`,
              semesterId: selectedSemester?.id ?? selectedSemesterNumber,
              section: section.name || section.sectionName || '',
              sectionId: section.id,
              academicYear: selectedYear?.name || '',
              academicYearId: selectedAcademicYearId,
              rollNumber: student.rollNumber,
            },
            personal: { fullName: student.name },
          })
        })
      })

      // Normalize into promotion directory candidate rows
      const promotionCandidates = scopedProfiles.map((p) => {
        const acad = p.academic || {}
        const pers = p.personal || {}
        const semNum = Number(selectedSemesterNumber)
        const attendance = attendanceByStudent.get(String(p.studentId || p.id))
        const profileAttendanceRate = p.attendanceRate === null || p.attendanceRate === undefined || p.attendanceRate === ''
          ? null
          : Number(p.attendanceRate)
        const attendanceRate = attendance?.attendanceRate ?? (Number.isFinite(profileAttendanceRate) ? profileAttendanceRate : null)
        const serverRecord = eligibilityById.get(String(p.studentId || p.id))
        const serverStatus = serverRecord?.eligibilityStatus || serverRecord?.status || ''
        const override = promotionService.getEligibilityOverride(p.studentId || p.id)
        const eligibilityStatus = override || serverStatus || 'Pending Review'

        const fullName =
          pers.fullName ||
          [pers.firstName, pers.middleName, pers.lastName].filter(Boolean).join(' ') ||
          p.studentName ||
          p.fullName ||
          p.name ||
          'Student'
        const rollNo = acad.rollNumber || p.rollNumber || ''
        const regNo = p.registrationNumber || p.application?.registrationNumber || p.application?.number || rollNo || ''

        return {
          id: p.studentId || p.id,
          studentId: p.studentId || p.id,
          ...(serverRecord || {}),
          studentName: serverRecord?.studentName || fullName,
          fullName: serverRecord?.studentName || fullName,
          name: serverRecord?.studentName || fullName,
          rollNumber: rollNo,
          registrationNumber: regNo,
          course: serverRecord?.courseName || acad.course || selectedCourse?.name || '—',
          branch: serverRecord?.branchName || acad.branch || selectedBranch?.name || '—',
          section: serverRecord?.sectionName || acad.section || '',
          currentSemester: serverRecord?.currentSemester ? `Semester ${serverRecord.currentSemester}` : (acad.semester || `Semester ${semNum}`),
          nextSemester: isFinalSemester ? 'Degree completion review' : (serverRecord?.nextSemester ? `Semester ${serverRecord.nextSemester}` : `Semester ${semNum + 1}`),
          attendanceRate,
          attendanceSessions: attendance?.markedSessions ?? 0,
          creditsEarned: serverRecord?.creditsEarned ?? null,
          sgpa: serverRecord?.sgpa ?? null,
          cgpa: serverRecord?.cgpa ?? null,
          eligibilityStatus,
          eligibilityLabel: override ? `${override} (manual review)` : (serverStatus || 'Pending Review'),
          status: eligibilityStatus,
          reason: override === 'INELIGIBLE'
            ? 'Manually marked ineligible for promotion.'
            : (serverRecord?.reason || serverRecord?.eligibilityReason || serverRecord?.remarks || (serverRecord ? 'Eligibility returned by promotion service.' : 'Eligibility review is pending; the promotion service did not return this student as eligible.')),
          academic: acad,
          personal: pers,
          photo: pers.photo || pers.photoUrl || p.photo || '',
          college: p.admission?.college || acad.college || '',
          academicYear: acad.academicYear || selectedYear?.name || '',
        }
      })

      // Load History with student profile enrichment
      const [hist, allProfiles] = await Promise.all([
        promotionService.getHistory(),
        studentService.getAllProfiles(),
      ])
      const profileById = new Map((allProfiles || []).map((p) => [String(p.studentId || p.id), p]))
      const profileByName = new Map(
        (allProfiles || []).map((p) => [
          String(p.studentName || p.fullName || p.name || '').trim().toLowerCase(),
          p,
        ])
      )

      const enrichedHist = (hist || []).map((h) => {
        const matched =
          profileById.get(String(h.studentId || h.id)) ||
          profileByName.get(String(h.studentName || '').trim().toLowerCase())
        const sName =
          (h.studentName && String(h.studentName).toLowerCase() !== 'student' ? h.studentName : '') ||
          matched?.studentName ||
          matched?.fullName ||
          matched?.name ||
          h.studentName ||
          'Student'
        const rollNo =
          h.rollNumber ||
          matched?.rollNumber ||
          matched?.academic?.rollNumber ||
          matched?.application?.admissionNumber ||
          ''
        const regNo =
          h.registrationNumber ||
          matched?.registrationNumber ||
          matched?.application?.registrationNumber ||
          matched?.application?.number ||
          rollNo ||
          ''

        return {
          ...h,
          studentName: sName,
          fullName: sName,
          name: sName,
          rollNumber: rollNo,
          registrationNumber: regNo,
          course: h.course || matched?.course || matched?.academic?.course || '',
          branch: h.branch || matched?.branch || matched?.academic?.branch || '',
          college: h.college || matched?.college || matched?.admission?.college || '',
          fromSemester: formatSemesterLabel(h.fromSemester || h.currentSemester),
          toSemester: formatSemesterLabel(h.toSemester || h.nextSemester),
          personal: matched?.personal || h.personal || {},
          academic: matched?.academic || h.academic || {},
          photo: matched?.photo || matched?.personal?.photo || h.photo || '',
        }
      })
      setHistory(newestFirst('promotions', enrichedHist))

      // Do not offer a student again when this source semester has already
      // been promoted. A prior Semester 1 → 2 record does not block a valid
      // Semester 2 → 3 promotion.
      const selectedSemesterNo = Number(selectedSemesterNumber)
      const historyStudentId = (row) => String(row.studentId ?? row.id ?? row.registrationNumber ?? row.rollNumber ?? '').trim()
      const semesterNo = (value) => Number(String(value ?? '').replace(/\D/g, '')) || 0
      const promotedFromScope = new Set(
        enrichedHist
          .filter((row) => /promoted|graduated/i.test(String(row.status || '')) && semesterNo(row.fromSemester || row.currentSemester) === selectedSemesterNo)
          .map(historyStudentId)
          .filter(Boolean)
      )
      setStudents(newestFirst('student-profiles', promotionCandidates.filter((student) => !promotedFromScope.has(historyStudentId(student)))))
    } catch (err) {
      showError(err.message || 'Unable to load promotion scope.')
      setStudents([])
    } finally {
      setLoading((x) => ({ ...x, list: false }))
    }
  }, [selectedBranchId, selectedAcademicYearId, selectedSemesterNumber, courseId, activeCourses, availableBranches, availableSemesters, activeAcademicYears, getSectionsForScope, selectedCollegeId])

  useEffect(() => {
    loadPromotionData()
  }, [loadPromotionData])

  // Invalidate on event
  useEffect(() => {
    const unsubscribePromotion = eventBus.subscribe(ERP_EVENTS.PROMOTION_EXECUTED, () => {
      loadPromotionData()
    })
    const unsubscribeAttendance = eventBus.subscribe(ERP_EVENTS.ATTENDANCE_RECORDED, () => {
      loadPromotionData(true)
    })
    return () => {
      unsubscribePromotion()
      unsubscribeAttendance()
    }
  }, [loadPromotionData])

  // Directory filter & 5-row pagination
  const filteredCandidates = useMemo(() => {
    const candidates = students.filter((x) =>
      `${nameOf(x)} ${idOf(x)} ${x.rollNumber ?? ''} ${x.registrationNumber ?? ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
    return candidates.sort((left, right) => {
      if (sortBy === 'eligibility') return statusOf(left).localeCompare(statusOf(right)) || nameOf(left).localeCompare(nameOf(right))
      if (sortBy === 'roll') return String(left.rollNumber || left.registrationNumber || '').localeCompare(String(right.rollNumber || right.registrationNumber || ''))
      return nameOf(left).localeCompare(nameOf(right))
    })
  }, [students, query, sortBy])

  const visibleCandidates = useMemo(() => filteredCandidates.filter(row =>
    eligibilityTab === 'eligible' ? statusOf(row) === 'eligible' : statusOf(row) !== 'eligible'
  ), [filteredCandidates, eligibilityTab])

  const eligibleSelected = useMemo(() => {
    return students.filter((x) => selected.includes(idOf(x)) && statusOf(x) === 'eligible')
  }, [students, selected])

  const paginatedCandidates = useMemo(() => {
    const start = (dirPage - 1) * pageSize
    return visibleCandidates.slice(start, start + pageSize)
  }, [visibleCandidates, dirPage])

  const paginatedHistory = useMemo(() => {
    const start = (histPage - 1) * pageSize
    return history.slice(start, start + pageSize)
  }, [history, histPage])

  // Promotion Execution
  const handleExecutePromotion = async () => {
    if (!confirmRows?.length || loading.promotion || promotionBusyRef.current) return
    if (!canExecutePromotion) {
      setNotice('The existing promotion API only supports degree completion at Semester 8. This course’s final semester is not supported for completion by the current integration.', 'error')
      return
    }

    // Re-resolve from current state: a row might have been marked ineligible
    // after the confirmation dialog was opened.
    const currentRows = confirmRows
      .map((row) => students.find((student) => idOf(student) === idOf(row)) || row)
    if (currentRows.some((row) => statusOf(row) !== 'eligible')) {
      setConfirmRows(null)
      setNotice('Ineligible students cannot be promoted. Review the selection and try again.', 'error')
      return
    }

    try {
      promotionBusyRef.current = true
      setLoading((x) => ({ ...x, promotion: true }))

      const selectedYear = activeAcademicYears.find((y) => String(y.id) === String(selectedAcademicYearId))
      const targetYear = activeAcademicYears.find((y) => String(y.id) === String(targetAcademicYearId)) || selectedYear
      const selectedSection = targetSections.find((s) => String(s.id) === String(targetSectionId))

      const currentSemNum = Number(selectedSemesterNumber)
      const isDegreeCompletion = currentSemNum >= 8

      const result = await promotionService.promoteBulk(currentRows, {
        branchId: selectedBranchId,
        currentAcademicYearId: selectedAcademicYearId,
        currentAcademicYear: selectedYear?.name || '2026-2027',
        currentSemesterId: selectedSemesterNumber,
        currentSemester: `Semester ${currentSemNum}`,
        targetAcademicYearId: isDegreeCompletion ? selectedAcademicYearId : (targetAcademicYearId || selectedAcademicYearId),
        targetAcademicYear: isDegreeCompletion ? selectedYear?.name : targetYear?.name,
        targetSemesterId: isDegreeCompletion ? selectedSemesterNumber : currentSemNum + 1,
        targetSemester: isDegreeCompletion ? 'Graduated (Degree Conferred)' : `Semester ${currentSemNum + 1}`,
        targetSectionId: isDegreeCompletion ? null : targetSectionId,
        targetSection: isDegreeCompletion ? null : (selectedSection?.name || ''),
        remarks: isDegreeCompletion ? 'Graduation & Degree Conferred' : 'Semester Batch Promotion',
      })

      setNotice(
        isDegreeCompletion
          ? `${currentRows.length} student(s) successfully graduated with degree conferred!`
          : `${currentRows.length} student(s) successfully promoted to Semester ${currentSemNum + 1}!`
      )
      const successful = Array.isArray(result) ? result.length : (result?.succeeded ?? currentRows.length)
      const failed = Number(result?.failed ?? 0)
      setPromotionResult({ successful, failed, message: failed ? 'Some student promotions need follow-up.' : 'Promotion completed successfully.' })
      setWizardStep(4)

      setSelected([])
      setConfirmRows(null)
      loadPromotionData()
    } catch (err) {
      setNotice(err.message || 'Promotion could not be completed.', 'error')
      setPromotionResult({ successful: 0, failed: confirmRows.length, message: err.message || 'Promotion could not be completed.' })
      setWizardStep(4)
    } finally {
      promotionBusyRef.current = false
      setLoading((x) => ({ ...x, promotion: false }))
    }
  }

  return (
    <DashboardLayout>
      <main className="student-promotion p-module">
        <PageHeader
          breadcrumb={[
            { label: 'Home', link: '/' },
            { label: 'Student Management', link: '/student-management' },
            'Student Promotions',
          ]}
          className="promotion-dashboard-header"
          title="Student Promotion & Degree Completion"
          subtitle="Configure academic advancement, verify server eligibility, and track degree completion."
        >
          <div className="promotion-kpis grid grid-cols-3 gap-2" aria-label="Promotion summary">
            {[
              { label: 'In scope', value: students.length, icon: FiUsers },
              { label: 'Eligible', value: students.filter(x => statusOf(x) === 'eligible').length, icon: FiCheck },
              { label: 'History', value: history.length, icon: FiClock },
            ].map(({ label, value, icon: Icon }, index) => (
              <motion.div key={label} className={`promotion-kpi kpi-${index}`} initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : index * 0.05 }}>
                <span><Icon aria-hidden="true" />{label}</span><motion.strong key={value} initial={shouldReduceMotion ? false : { y: 5, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}>{value}</motion.strong>
              </motion.div>
            ))}
          </div>
        </PageHeader>

        <motion.nav
          className="promotion-wizard-steps grid grid-cols-4 gap-2"
          aria-label="Promotion workflow"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
        >
          {['Configure Promotion', 'Preview Eligible Students', 'Review & Confirm', 'Completion'].map((label, index) => {
            const step = index + 1
            const complete = wizardStep > step
            const current = wizardStep === step
            return (
              <button type="button" key={label} className={`${current ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`} aria-current={current ? 'step' : undefined} onClick={() => { if (step <= wizardStep) setWizardStep(step) }} disabled={step > wizardStep}>
                <span className="promotion-step-indicator">{complete ? <FiCheck aria-hidden="true" /> : step}</span>
                <span>{label}</span>
              </button>
            )
          })}
        </motion.nav>

        <AnimatePresence mode="wait">
        {wizardStep === 4 && promotionResult && (
          <motion.section className={`promotion-result ${promotionResult.failed ? 'has-failures' : ''}`} role="status" initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}>
            <div><FiCheckCircle aria-hidden="true" /><div><h2>{promotionResult.message}</h2><p>{promotionResult.successful} completed · {promotionResult.failed} failed or requiring follow-up</p></div></div>
            <button type="button" className="erp-btn erp-btn--secondary" onClick={() => { setWizardStep(1); setPromotionResult(null); setSelected([]) }}>Start another promotion</button>
          </motion.section>
        )}
        </AnimatePresence>

        <div className="promotion-workspace">
        {/* Promotion Scope Selector Panel */}
        <motion.section className={`p-scope erp-card ${wizardStep > 1 ? 'is-compact' : ''}`} initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.24 }}>
          <div className="promotion-scope-heading">
            <div className="promotion-scope-mark"><FiTrendingUp aria-hidden="true" /></div>
            <div>
              <h2>Promotion scope</h2>
              <p>Choose the cohort and term to load the student roster.</p>
            </div>
            <span className="promotion-scope-target">
              {isDegreeReview
                ? `Semester ${finalSemesterNumber} · Degree review`
                : selectedSemesterNumber
                  ? `Target: Semester ${Number(selectedSemesterNumber) + 1}`
                  : 'Choose a semester'}
            </span>
          </div>
          {(academicLoading || academicError || !activeCourses.length || !activeAcademicYears.length) && (
            <div className={`p-scope-status ${academicError ? 'is-error' : ''}`} role={academicError ? 'alert' : 'status'}>
              <span>
                {academicLoading
                  ? 'Loading courses and academic years…'
                  : academicError || `No active ${[
                    !activeCourses.length ? 'courses' : '',
                    !activeAcademicYears.length ? 'academic years' : '',
                  ].filter(Boolean).join(' or ')} are configured for this college yet.`}
              </span>
              {!academicLoading && (
                <button type="button" onClick={refreshHierarchy} disabled={academicLoading}>
                  <FiRefreshCw aria-hidden="true" /> Retry loading
                </button>
              )}
            </div>
          )}
          <div className="erp-form-grid">
            <div className="erp-form-group">
              <label>Course <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <ProjectSelect
                className="erp-select"
                value={courseId}
                disabled={academicLoading || !activeCourses.length}
                onChange={(e) => {
                  setCourseId(e.target.value)
                  setSelectedBranchId('')
                  setSelectedSemesterNumber('')
                  setQuery('')
                }}
              >
                <option value="">{academicLoading ? 'Loading courses…' : activeCourses.length ? 'Select Course' : 'No active courses available'}</option>
                {activeCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </ProjectSelect>
            </div>

            <div className="erp-form-group">
              <label>Branch <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <ProjectSelect
                className="erp-select"
                value={selectedBranchId}
                disabled={academicLoading || !courseId || !availableBranches.length}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value)
                  setSelectedSemesterNumber('')
                  setQuery('')
                }}
              >
                <option value="">{!courseId ? 'Select a course first' : availableBranches.length ? 'Select Branch' : 'No active branches for this course'}</option>
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </ProjectSelect>
            </div>

            <div className="erp-form-group">
              <label>Current Academic Year <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <ProjectSelect
                className="erp-select"
                value={selectedAcademicYearId}
                disabled={academicLoading || !activeAcademicYears.length}
                onChange={(e) => {
                  setSelectedAcademicYearId(e.target.value)
                  setQuery('')
                }}
              >
                <option value="">{academicLoading ? 'Loading academic years…' : activeAcademicYears.length ? 'Select Academic Year' : 'No active academic years available'}</option>
                {activeAcademicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </ProjectSelect>
            </div>

            <div className="erp-form-group">
              <label>Current Semester <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <ProjectSelect
                className="erp-select"
                value={selectedSemesterNumber}
                disabled={academicLoading || !selectedBranchId || !availableSemesters.length}
                onChange={(e) => {
                  setSelectedSemesterNumber(e.target.value)
                  setQuery('')
                }}
              >
                <option value="">{!selectedBranchId ? 'Select a branch first' : availableSemesters.length ? 'Select Semester' : 'No active semesters for this course'}</option>
                {availableSemesters.map((s) => (
                  <option key={s.id} value={s.semesterNumber || s.id}>
                    {s.semesterName || `Semester ${s.semesterNumber || s.id}`}
                  </option>
                ))}
              </ProjectSelect>
            </div>
            <div className="erp-form-group">
              <label htmlFor="promotion-type">Promotion Type <span className="p-required">*</span></label>
              <select id="promotion-type" className="erp-select" value={promotionType} disabled={!selectedSemesterNumber} onChange={() => {}} aria-describedby="promotion-type-help">
                <option value="next-semester" disabled={isFinalSemester}>Next Semester</option>
                <option value="degree" disabled={!isFinalSemester}>Degree Completion{!isFinalSemester ? ' (final semester only)' : ''}</option>
              </select>
              <small id="promotion-type-help">{isFinalSemester ? `Final configured term: Semester ${finalSemesterNumber}` : `Target: Semester ${Number(selectedSemesterNumber || 0) + 1}`}</small>
            </div>
          </div>
        </motion.section>

        {/* Tab Strip */}
        <div className="promotion-directory-column">
        <nav className="p-tabs" aria-label="Promotion views">
          <button
            type="button"
            className={tab === 'promotion' ? 'active' : ''}
            onClick={() => setTab('promotion')}
          >
            Promotion Directory ({students.length})
          </button>
          <button
            type="button"
            className={tab === 'history' ? 'active' : ''}
            onClick={() => setTab('history')}
          >
            Promotion History ({history.length})
          </button>
        </nav>

        {/* Tab 1: Promotion Directory */}
        {tab === 'promotion' && (
          <>
            {!selectedBranchId || !selectedSemesterNumber ? (
              <section className="p-panel p-empty">
                <EmptyState
                  icon={FiInfo}
                  title="Select Promotion Scope"
                  subtitle="Choose a valid Course, Branch, Academic Year, and Semester above to load eligible student candidates."
                />
              </section>
            ) : (
              <>
                <section className="p-panel erp-card">
                  <header className="erp-card-header">
                    <div>
                      <h2 className="erp-card-title">
                        {isDegreeReview ? `Semester ${finalSemesterNumber} Degree Completion Review` : 'Student Advancement Roster'}
                      </h2>
                      <p className="erp-card-subtitle">
                        {isDegreeReview
                          ? 'Review final-year students for official degree conferral and graduation.'
                          : 'Select eligible students to execute semester advancement.'}
                      </p>
                    </div>

                    <div className="p-header-actions">
                      <ExportMenu
                        rows={filteredCandidates}
                        columns={promotionColumns}
                        title="Student Promotions"
                        filename="student-promotions"
                        loading={loading.list}
                      />

                      {canPromote && <span className="promotion-selected-count" aria-live="polite">{eligibleSelected.length} eligible selected</span>}
                    </div>
                  </header>

                  <div className="p-filters">
                    <div className="erp-input-icon-wrap">
                      <FiSearch className="erp-input-icon" />
                      <input
                        type="text"
                        className="erp-input"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value)
                          setDirPage(1)
                        }}
                        placeholder="Search student name, roll number, or registration..."
                      />
                    </div>
                    <label className="promotion-sort"><span>Sort by</span><select value={sortBy} onChange={event => { setSortBy(event.target.value); setDirPage(1) }}><option value="name">Student name</option><option value="roll">Roll number</option><option value="eligibility">Eligibility</option></select></label>
                  </div>

                  <div className="promotion-eligibility-tabs" role="tablist" aria-label="Eligibility status">
                    <button type="button" role="tab" aria-selected={eligibilityTab === 'eligible'} className={eligibilityTab === 'eligible' ? 'active' : ''} onClick={() => { setEligibilityTab('eligible'); setDirPage(1) }}>Eligible <span>{students.filter(x => statusOf(x) === 'eligible').length}</span></button>
                    <button type="button" role="tab" aria-selected={eligibilityTab === 'ineligible'} className={eligibilityTab === 'ineligible' ? 'active' : ''} onClick={() => { setEligibilityTab('ineligible'); setDirPage(1) }}>Non-Eligible / Pending <span>{students.filter(x => statusOf(x) !== 'eligible').length}</span></button>
                  </div>

                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th className="table-center" style={{ width: '44px' }}>
                            <input
                              type="checkbox"
                              checked={
                                paginatedCandidates.some(x => statusOf(x) === 'eligible') &&
                                paginatedCandidates.filter(x => statusOf(x) === 'eligible').every((x) => selected.includes(idOf(x)))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelected([
                                    ...new Set([...selected, ...paginatedCandidates.filter(x => statusOf(x) === 'eligible').map(idOf)]),
                                  ])
                                } else {
                                  setSelected(
                                    selected.filter(
                                      (id) => !paginatedCandidates.filter(x => statusOf(x) === 'eligible').map(idOf).includes(id)
                                    )
                                  )
                                }
                              }}
                            />
                          </th>
                          <th style={{ minWidth: '160px' }}>Student</th>
                          <th style={{ minWidth: '130px' }}>Roll / Reg No</th>
                          <th style={{ minWidth: '150px' }}>Academic Scope</th>
                          <th style={{ minWidth: '170px' }}>Current → Target</th>
                          <th className="table-center" style={{ width: '90px' }}>Credits</th>
                          <th className="table-center" style={{ width: '120px' }}>SGPA / CGPA</th>
                          <th className="table-center" style={{ width: '110px' }}>Attendance</th>
                          <th className="table-center" style={{ width: '120px' }}>Eligibility</th>
                          <th className="table-center" style={{ width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading.list ? Array.from({ length: 5 }, (_, index) => <tr key={`loading-${index}`} className="promotion-skeleton-row" aria-hidden="true"><td colSpan={10}><span /></td></tr>) : paginatedCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="promotion-empty-cell">
                              <div className="promotion-empty-state" role="status">
                                <span className="promotion-empty-icon"><FiUsers aria-hidden="true" /></span>
                                <strong>{query ? 'No students match your search' : eligibilityTab === 'eligible' ? 'No eligible students in this scope' : 'No students awaiting review'}</strong>
                                <p>{query ? 'Try another name, roll number, or registration number.' : 'Try another academic scope or check the other eligibility tab.'}</p>
                                {query && <button type="button" onClick={() => { setQuery(''); setDirPage(1) }}>Clear search</button>}
                                {!query && students.length > 0 && (
                                  <button type="button" onClick={() => { setEligibilityTab(eligibilityTab === 'eligible' ? 'ineligible' : 'eligible'); setDirPage(1) }}>
                                    View {eligibilityTab === 'eligible' ? 'pending students' : 'eligible students'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedCandidates.map((x) => (
                            <tr key={idOf(x)}>
                              <td className="table-center" style={{ width: '44px' }}>
                                <input
                                  type="checkbox"
                                  disabled={statusOf(x) !== 'eligible'}
                                  checked={selected.includes(idOf(x))}
                                  onChange={() =>
                                    setSelected((v) =>
                                      v.includes(idOf(x))
                                        ? v.filter((id) => id !== idOf(x))
                                        : [...v, idOf(x)]
                                    )
                                  }
                                />
                              </td>
                              <td style={{ minWidth: '160px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameOf(x)}</div>
                              </td>
                              <td style={{ minWidth: '130px' }}>
                                <div>{x.rollNumber || x.registrationNumber || '-'}</div>
                                {x.registrationNumber && x.rollNumber && x.registrationNumber !== x.rollNumber && (
                                  <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>{x.registrationNumber}</div>
                                )}
                              </td>
                              <td style={{ minWidth: '150px' }}>
                                <div>{x.course} | {x.branch}</div>
                              {x.section && <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>Section {x.section}</div>}
                              </td>
                              <td style={{ minWidth: '170px' }}>
                                <span style={{ fontWeight: 600 }}>{x.currentSemester}</span>{' '}
                                <span style={{ color: 'var(--text-muted)' }}>→</span>{' '}
                                <span className={isDegreeReview ? 'text-primary font-semibold' : 'text-success font-semibold'}>
                                  {x.nextSemester}
                                </span>
                              </td>
                              <td className="table-center" style={{ width: '90px' }}>{x.creditsEarned ?? '—'}</td>
                              <td className="table-center" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                                {x.sgpa ?? '—'} / {x.cgpa ?? '—'}
                              </td>
                              <td className="table-center" style={{ width: '110px' }}>
                                {x.attendanceRate == null
                                  ? 'Not recorded'
                                  : `${x.attendanceRate}%${x.attendanceSessions ? ` (${x.attendanceSessions} sessions)` : ''}`}
                              </td>
                              <td className="table-center" style={{ width: '120px' }}>
                                <StatusBadge
                                  value={x.eligibilityLabel || (statusOf(x) === 'eligible' ? 'Eligible' : 'Pending Review')}
                                />
                                {x.reason && <small className="promotion-eligibility-reason">{x.reason}</small>}
                              </td>
                              <td className="table-center" style={{ width: '80px' }}>
                                <div className="table-actions-group">
                                  <button
                                    type="button"
                                    className="table-action-btn action-view"
                                    title="Review Eligibility"
                                    aria-label="Review Eligibility"
                                    onClick={() => setReview(x)}
                                  >
                                    <FiEye />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={dirPage}
                    totalPages={Math.max(1, Math.ceil(visibleCandidates.length / pageSize))}
                    pageSize={pageSize}
                    onPageChange={setDirPage}
                  />
                </section>
              </>
            )}
          </>
        )}

        {/* Tab 2: Promotion History */}
        {tab === 'history' && (
          <section className="p-panel erp-card">
            <header className="erp-card-header">
              <div>
                <h2 className="erp-card-title">Promotion & Graduation Audit History</h2>
                <p className="erp-card-subtitle">Complete ledger of previous batch promotions and degree completions.</p>
              </div>
              <ExportMenu
                rows={history}
                columns={promotionHistoryColumns}
                title="Promotion History"
                filename="promotion-history"
              />
            </header>

            <div className="erp-table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '170px' }}>Student Name</th>
                    <th style={{ minWidth: '140px' }}>Roll / Reg No</th>
                    <th style={{ minWidth: '170px' }}>Transition (From → To)</th>
                    <th className="table-center" style={{ width: '120px' }}>Date</th>
                    <th className="table-center" style={{ width: '120px' }}>Status</th>
                        <th>Administrator</th>
                        <th>Remarks</th>
                    <th className="table-center" style={{ width: '80px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-muted">
                        No promotion history records logged yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((h, i) => (
                      <tr key={h.promotionId || i}>
                        <td style={{ minWidth: '170px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameOf(h) || h.studentName || 'Student'}</div>
                        </td>
                        <td style={{ minWidth: '140px' }}>{h.rollNumber || h.registrationNumber || '-'}</td>
                        <td style={{ minWidth: '170px' }}>
                          <span style={{ fontWeight: 600 }}>{formatSemesterLabel(h.fromSemester)}</span>{' '}
                          <span style={{ color: 'var(--text-muted)' }}>→</span>{' '}
                          <span className="text-success font-semibold">{formatSemesterLabel(h.toSemester)}</span>
                        </td>
                        <td className="table-center" style={{ width: '120px' }}>
                          {h.createdAt || h.updatedAt || h.promotionDate ? new Date(h.createdAt || h.updatedAt || h.promotionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                        </td>
                        <td className="table-center" style={{ width: '120px' }}>
                          <StatusBadge
                            value={h.status || 'Promoted'}
                          />
                        </td>
                        <td>{h.administratorName || h.createdByName || h.adminName || h.createdBy || '—'}</td>
                        <td>{h.remarks || 'Standard promotion'}</td>
                        <td className="table-center" style={{ width: '80px' }}>
                          <div className="table-actions-group">
                            <button
                              type="button"
                              className="table-action-btn action-view"
                              title="View promotion details"
                              aria-label="View promotion details"
                              onClick={() => setReview(h)}
                            >
                              <FiEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={histPage}
              totalPages={Math.max(1, Math.ceil(history.length / pageSize))}
              pageSize={pageSize}
              onPageChange={setHistPage}
            />
          </section>
        )}
        </div>
        </div>

        <AnimatePresence mode="wait">
        {wizardStep === 3 && tab === 'promotion' && (
          <motion.section className="promotion-review-summary" aria-labelledby="promotion-review-title" initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}>
            <div className="promotion-review-summary-head"><div><span className="promotion-eyebrow">Final review</span><h2 id="promotion-review-title">Ready to {isDegreeReview ? 'complete degrees' : 'promote students'}?</h2><p>Review the selected students and destination before confirming.</p></div><strong>{eligibleSelected.length} selected</strong></div>
            {eligibleSelected.length ? <ul>{eligibleSelected.map(student => <li key={idOf(student)}><span>{nameOf(student)}</span><small>{student.registrationNumber || student.rollNumber || 'No registration number'} · {student.currentSemester} → {student.nextSemester}</small></li>)}</ul> : <p className="promotion-inline-error" role="alert">Select at least one student returned as eligible by the promotion service.</p>}
            {!canExecutePromotion && <p className="promotion-inline-error" role="alert">The configured final semester is {finalSemesterNumber}, but the existing promotion API only supports degree completion at Semester 8. Promotion is disabled here to prevent advancing beyond the course limit.</p>}
          </motion.section>
        )}
        </AnimatePresence>

        <footer className="promotion-sticky-actions" aria-label="Promotion wizard actions">
          <div className="promotion-action-context"><strong>{wizardStep < 4 ? ['Configure promotion', 'Preview eligible students', 'Review & confirm'][wizardStep - 1] : 'Promotion completed'}</strong><span>{selected.length} selected · {eligibleSelected.length} eligible to promote</span></div>
          <div className="promotion-action-buttons flex items-center gap-2">
            {wizardStep > 1 && wizardStep < 4 && <button type="button" className="erp-btn erp-btn--secondary" onClick={() => setWizardStep(current => Math.max(1, current - 1))}>Previous</button>}
            {wizardStep === 1 && <button type="button" className="erp-btn erp-btn--primary" disabled={!selectedBranchId || !selectedAcademicYearId || !selectedSemesterNumber || loading.list} onClick={() => setWizardStep(2)}>Preview students <FiArrowRight /></button>}
            {wizardStep === 2 && <button type="button" className="erp-btn erp-btn--primary" disabled={!eligibleSelected.length} onClick={() => setWizardStep(3)}>Review selection <FiArrowRight /></button>}
            {wizardStep === 3 && canPromote && <button type="button" className="erp-btn erp-btn--primary" disabled={!eligibleSelected.length || loading.promotion || !canExecutePromotion} onClick={() => setConfirmRows(eligibleSelected)}>{isDegreeReview ? 'Confirm degree completion' : 'Confirm promotion'} <FiArrowRight /></button>}
            {wizardStep === 4 && <button type="button" className="erp-btn erp-btn--primary" onClick={() => { setWizardStep(1); setPromotionResult(null); setSelected([]) }}>Done</button>}
          </div>
        </footer>
      </main>

      {/* Review Drawer */}
      {review && (
        <ReviewDrawer
          student={review}
          onClose={() => setReview(null)}
          canEdit={canPromote && !review.promotionDate}
          onStatus={async (status) => {
            try {
              const normalized = await promotionService.setEligibilityStatus(review.studentId || review.id, status)
              setStudents((prev) => prev.map((s) => (
                idOf(s) === idOf(review)
                  ? { ...s, eligibilityStatus: normalized, eligibilityLabel: normalized, status: normalized,
                    reason: normalized === 'INELIGIBLE' ? 'Manually marked ineligible for promotion.' : s.reason }
                  : s
              )))
              if (normalized === 'INELIGIBLE') {
                setSelected((prev) => prev.filter((id) => id !== idOf(review)))
                setConfirmRows((prev) => prev?.filter((row) => idOf(row) !== idOf(review)) || null)
              }
              setReview(null)
            } catch (err) {
              setNotice(err.message || 'Could not update promotion eligibility.', 'error')
            }
          }}
        />
      )}

      {/* Confirm Modal */}
      {confirmRows && (
        <ConfirmModal
          rows={confirmRows}
          busy={loading.promotion}
          isDegreeReview={isDegreeReview}
          onCancel={() => setConfirmRows(null)}
          onConfirm={handleExecutePromotion}
        />
      )}
    </DashboardLayout>
  )
}
