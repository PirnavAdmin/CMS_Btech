import ViewDialog from '../../../components/ViewDialog'
import { ProjectSelect } from '../../../components/SearchableSelect'
import useCollegeState from '../../../hooks/useCollegeState'
import { newestFirst } from '../../../utils/newestFirst'
import { promotionDetailSections } from '../../../utils/recordDetailSections'
import { showError } from '../../../utils/toast'
import useToastState from '../../../hooks/useToastState'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from './promotionMotion'
import InfoCard from '../../../components/InfoCard'
import { FiArrowRight, FiClock, FiEye, FiFilter, FiInfo, FiSearch, FiTrendingUp, FiUsers, FiX, FiAward, FiBookOpen, FiUser, FiRefreshCw, FiShield, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
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

function ConfirmModal({ rows, busy, onCancel, onConfirm, isDegreeReview, scope }) {
  const hasNonEligibleStudents = rows.some((row) => statusOf(row) !== 'eligible')
  return <ViewDialog title={isDegreeReview ? 'Confirm Degree Completion' : 'Confirm Student Promotion'}
    busy={busy} showExport={false} onClose={() => { if (!busy) onCancel() }}
    footerActions={<button type="button" className="erp-btn erp-btn--primary" onClick={onConfirm} disabled={busy}>
      {busy ? 'Processing…' : 'Confirm'}
    </button>}>
    <dl className="promotion-confirm-context">
      {[['Selected students', rows.length], ...scope].map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
    </dl>
    {hasNonEligibleStudents && <p className="promotion-confirm-override" role="note">One or more selected students are not marked eligible. Confirming will override their recorded eligibility status and proceed with the administrator-approved promotion.</p>}
  </ViewDialog>
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
                  <span className="pr-value">{student?.creditsEarned ? `${student.creditsEarned}${student.totalCredits ? ` / ${student.totalCredits}` : ''}` : '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Attendance Rate</span>
                  <span className="pr-value">
                    {student?.attendanceRate !== null && student?.attendanceRate !== undefined
                      ? `${student.attendanceRate}%`
                      : '—'}
                  </span>
                </div>
                {student?.backlogs !== undefined && (
                  <div className="pr-field">
                    <span className="pr-label">Active Backlogs</span>
                    <span className="pr-value" style={{ color: student.backlogs === 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {student.backlogs === 0 ? '0 Backlogs' : `${student.backlogs} Backlog${student.backlogs > 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}
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
    selectedCollegeId,
    selectedAcademicYearId: contextAcademicYearId,
    activeCourses,
    loading: academicLoading,
    error: academicError,
    refreshHierarchy,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [tab, setTab] = useState('promotion') // 'promotion' | 'history'
  const [loadedScope, setLoadedScope] = useState('')
  const [loadError, setLoadError] = useState('')
  const loadVersion = useRef(0)
  const [advancementType, setAdvancementType] = useState('next-semester')
  const [eligibilityTab, setEligibilityTab] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [promotionResult, setPromotionResult] = useState(null)
  const promotionBusyRef = useRef(false)
  const [students, setStudents] = useState([])
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [history, setHistory] = useCollegeState([])
  const [historyError, setHistoryError] = useState('')

  // Promotion Scope
  const [courseId, setCourseId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(contextAcademicYearId || '')
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState('')

  // Auto-default academic year from context and course if only 1 active course
  useEffect(() => {
    if (!selectedAcademicYearId && (contextAcademicYearId || activeAcademicYears.length > 0)) {
      const match = activeAcademicYears.find(y => String(y.id ?? y.academicYearId) === String(contextAcademicYearId)) || activeAcademicYears[0]
      if (match) {
        setSelectedAcademicYearId(String(match.id ?? match.academicYearId))
      }
    }
  }, [selectedAcademicYearId, contextAcademicYearId, activeAcademicYears])

  useEffect(() => {
    if (!courseId && activeCourses.length === 1) {
      setCourseId(String(activeCourses[0].id))
    }
  }, [courseId, activeCourses])
  const selectedYear = activeAcademicYears.find(row => String(row.id) === String(selectedAcademicYearId))
  const yearStart = row => String(row?.startDate || row?.startYear || row?.name || '').match(/^\d{4}/)?.[0] || ''
  const nextYear = activeAcademicYears.filter(row => yearStart(selectedYear) && yearStart(row) === String(Number(yearStart(selectedYear)) + 1))
  const crossesAcademicYear = Number(selectedSemesterNumber) > 0 && Number(selectedSemesterNumber) % 2 === 0
  const requiresNextYear = advancementType === 'next-year' || crossesAcademicYear
  const targetAcademicYearId = requiresNextYear && nextYear.length === 1 ? nextYear[0].id : ''
  const scopeKey = [selectedCollegeId, courseId, selectedBranchId, selectedAcademicYearId, selectedSemesterNumber].join('|')
  const currentScope = useRef(scopeKey)
  currentScope.current = scopeKey
  const scopeReady = isDemoMode || (Boolean(loadedScope) && loadedScope === scopeKey)

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
    const list = getBranchesForCourse(courseId, true)
    const invalidPattern = /signal|system|subject|dummy|test|temp|gW2EW|dxasc/i
    return list.filter(b => {
      const name = String(b.name || b.branchName || '').trim()
      const code = String(b.code || b.branchCode || '').trim()
      if (invalidPattern.test(name) || invalidPattern.test(code)) return false
      if (!name) return false
      return true
    })
  }, [getBranchesForCourse, courseId])

  const availableSemesters = useMemo(() => {
    if (!courseId || !selectedBranchId || !selectedAcademicYearId) return []
    return getSemestersForCourse(courseId, false, { branchId: selectedBranchId, academicYearId: selectedAcademicYearId })
  }, [getSemestersForCourse, courseId, selectedBranchId, selectedAcademicYearId])

  const sourceSemester = useMemo(() => {
    return availableSemesters.find(s => Number(s.semesterNumber || s.id) === Number(selectedSemesterNumber))
  }, [availableSemesters, selectedSemesterNumber])

  const nextTerms = useMemo(() => {
    if (!selectedSemesterNumber || !selectedBranchId) return []
    const nextSemNum = Number(selectedSemesterNumber) + 1
    let terms = getSemestersForCourse(courseId, false, { branchId: selectedBranchId, academicYearId: targetAcademicYearId || selectedAcademicYearId })
      .filter(s => Number(s.semesterNumber || s.id) === nextSemNum)
    if (!terms.length) {
      terms = getSemestersForCourse(courseId, false, { branchId: selectedBranchId })
        .filter(s => Number(s.semesterNumber || s.id) === nextSemNum)
    }
    if (!terms.length) {
      terms = getSemestersForCourse(courseId, false)
        .filter(s => Number(s.semesterNumber || s.id) === nextSemNum)
    }
    return terms
  }, [selectedSemesterNumber, selectedBranchId, courseId, targetAcademicYearId, selectedAcademicYearId, getSemestersForCourse])
  const nextSemesterId = nextTerms[0]?.id || ''

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

  const finalSemesterNumber = Number(activeCourses.find(course => String(course.id) === String(courseId))?.totalSemesters) || 0
  const isFinalSemester = Boolean(finalSemesterNumber && Number(selectedSemesterNumber) === finalSemesterNumber)
  const isDegreeReview = isFinalSemester
  const canExecutePromotion = Boolean((sourceSemester || selectedSemesterNumber) && (isFinalSemester || nextSemesterId || students.some(s => s.isDemo)))
  const promotionType = isFinalSemester ? 'degree' : advancementType
  const promotionTypeLabel = { degree: 'Degree Completion', 'next-semester': 'Next Semester', 'next-year': 'Next Academic Year' }[promotionType]

  // Automatically select the correct promotion type based on current semester
  useEffect(() => {
    const sem = Number(selectedSemesterNumber)
    if (!sem) return
    if (finalSemesterNumber && sem === finalSemesterNumber) {
      setAdvancementType('degree')
    } else if (sem % 2 === 0) {
      setAdvancementType('next-year')
    } else {
      setAdvancementType('next-semester')
    }
  }, [selectedSemesterNumber, finalSemesterNumber])

  // Load Realistic Demo Student Batch for testing/previewing
  const handleLoadDemoBatch = useCallback(() => {
    let targetYearId = selectedAcademicYearId
    let targetCourseId = courseId
    let targetBranchId = selectedBranchId
    let targetSem = selectedSemesterNumber

    if (!targetYearId && activeAcademicYears.length > 0) {
      targetYearId = activeAcademicYears[0].id
      setSelectedAcademicYearId(targetYearId)
    }
    if (!targetCourseId && activeCourses.length > 0) {
      targetCourseId = activeCourses[0].id
      setCourseId(targetCourseId)
    }
    const branches = targetCourseId ? getBranchesForCourse(targetCourseId, true) : []
    if (!targetBranchId && branches.length > 0) {
      targetBranchId = branches[0].id
      setSelectedBranchId(targetBranchId)
    }
    if (!targetSem) {
      targetSem = '1'
      setSelectedSemesterNumber('1')
    }

    const c = activeCourses.find(item => String(item.id) === String(targetCourseId))
    const b = branches.find(item => String(item.id) === String(targetBranchId))
    const y = activeAcademicYears.find(item => String(item.id) === String(targetYearId))
    const activeBr = availableBranches.find(item => String(item.id) === String(targetBranchId)) || b
    const branchDisplayName = activeBr?.name || 'Computer Science & Engineering'
    const courseDisplayName = c?.name || 'Bachelor of Technology (BTECH)'
    const yearDisplayName = y?.name || '2026-27'

    const semNum = Number(targetSem) || 1
    const nextSemLabel = isFinalSemester ? 'Degree completion review' : `Semester ${semNum + 1}`

    const demo = [
      {
        id: 'demo-23B91A0501',
        studentId: 'demo-23B91A0501',
        isDemo: true,
        rollNumber: '23B91A0501',
        registrationNumber: 'REG20230501',
        studentName: 'Aarav Sharma',
        fullName: 'Aarav Sharma',
        name: 'Aarav Sharma',
        course: courseDisplayName,
        branch: branchDisplayName,
        section: 'Section A',
        currentSemester: `Semester ${semNum}`,
        nextSemester: nextSemLabel,
        attendanceRate: 88,
        attendanceSessions: 140,
        creditsEarned: 40,
        totalCredits: 40,
        backlogs: 0,
        sgpa: '8.92',
        cgpa: '8.92',
        eligibilityStatus: 'ELIGIBLE',
        eligibilityLabel: 'Eligible',
        status: 'eligible',
        reason: 'Satisfies all requirements: 88% attendance, 100% credits cleared, 0 active backlogs.',
        academic: {
          course: courseDisplayName,
          branch: branchDisplayName,
          semester: `Semester ${semNum}`,
          academicYear: yearDisplayName,
          rollNumber: '23B91A0501',
          section: 'Section A',
        },
        personal: { fullName: 'Aarav Sharma' },
        college: 'Raghavendra Engineering College',
        academicYear: yearDisplayName,
      },
      {
        id: 'demo-23B91A0514',
        studentId: 'demo-23B91A0514',
        isDemo: true,
        rollNumber: '23B91A0514',
        registrationNumber: 'REG20230514',
        studentName: 'Pooja Verma',
        fullName: 'Pooja Verma',
        name: 'Pooja Verma',
        course: courseDisplayName,
        branch: branchDisplayName,
        section: 'Section A',
        currentSemester: `Semester ${semNum}`,
        nextSemester: nextSemLabel,
        attendanceRate: 71,
        attendanceSessions: 112,
        creditsEarned: 34,
        totalCredits: 40,
        backlogs: 1,
        sgpa: '7.15',
        cgpa: '7.15',
        eligibilityStatus: 'ELIGIBLE',
        eligibilityLabel: 'Eligible (Condonation)',
        status: 'eligible',
        reason: 'Attendance 71% in condonation bracket (65%-75%). Medical condonation approved by Principal.',
        academic: {
          course: courseDisplayName,
          branch: branchDisplayName,
          semester: `Semester ${semNum}`,
          academicYear: yearDisplayName,
          rollNumber: '23B91A0514',
          section: 'Section A',
        },
        personal: { fullName: 'Pooja Verma' },
        college: 'Raghavendra Engineering College',
        academicYear: yearDisplayName,
      },
      {
        id: 'demo-23B91A0529',
        studentId: 'demo-23B91A0529',
        isDemo: true,
        rollNumber: '23B91A0529',
        registrationNumber: 'REG20230529',
        studentName: 'Karthik Reddy',
        fullName: 'Karthik Reddy',
        name: 'Karthik Reddy',
        course: courseDisplayName,
        branch: branchDisplayName,
        section: 'Section B',
        currentSemester: `Semester ${semNum}`,
        nextSemester: nextSemLabel,
        attendanceRate: 52,
        attendanceSessions: 84,
        creditsEarned: 28,
        totalCredits: 40,
        backlogs: 3,
        sgpa: '5.80',
        cgpa: '5.80',
        eligibilityStatus: 'INELIGIBLE',
        eligibilityLabel: 'Detained (Attendance)',
        status: 'ineligible',
        reason: 'Detained due to attendance shortage (< 65%). Required to repeat current semester.',
        academic: {
          course: courseDisplayName,
          branch: branchDisplayName,
          semester: `Semester ${semNum}`,
          academicYear: yearDisplayName,
          rollNumber: '23B91A0529',
          section: 'Section B',
        },
        personal: { fullName: 'Karthik Reddy' },
        college: 'Raghavendra Engineering College',
        academicYear: yearDisplayName,
      },
      {
        id: 'demo-23B91A0542',
        studentId: 'demo-23B91A0542',
        isDemo: true,
        rollNumber: '23B91A0542',
        registrationNumber: 'REG20230542',
        studentName: 'Sneha Patil',
        fullName: 'Sneha Patil',
        name: 'Sneha Patil',
        course: courseDisplayName,
        branch: branchDisplayName,
        section: 'Section B',
        currentSemester: `Semester ${semNum}`,
        nextSemester: nextSemLabel,
        attendanceRate: 78,
        attendanceSessions: 124,
        creditsEarned: 16,
        totalCredits: 40,
        backlogs: 5,
        sgpa: '4.60',
        cgpa: '4.60',
        eligibilityStatus: 'INELIGIBLE',
        eligibilityLabel: 'Detained (Credits)',
        status: 'ineligible',
        reason: 'Credit deficit: Earned only 16 of 40 credits (< 50% cutoff) with 5 backlogs.',
        academic: {
          course: courseDisplayName,
          branch: branchDisplayName,
          semester: `Semester ${semNum}`,
          academicYear: yearDisplayName,
          rollNumber: '23B91A0542',
          section: 'Section B',
        },
        personal: { fullName: 'Sneha Patil' },
        college: 'Raghavendra Engineering College',
        academicYear: yearDisplayName,
      },
    ]

    const expectedScopeKey = [selectedCollegeId, targetCourseId, targetBranchId, targetYearId, targetSem].join('|')
    currentScope.current = expectedScopeKey
    setIsDemoMode(true)
    setLoadedScope(expectedScopeKey)
    setStudents(demo)
    setTab('promotion')
    setDirPage(1)
    setNotice('Loaded 4 realistic demo students for Semester Advancement review!', 'success')
  }, [
    selectedAcademicYearId, courseId, selectedBranchId, selectedSemesterNumber,
    activeAcademicYears, activeCourses, getBranchesForCourse, availableBranches, selectedCollegeId, isFinalSemester, setNotice,
  ])

  // Load Promotion Scope Students & History
  const loadPromotionData = useCallback(async (forceRefresh = false) => {
    setIsDemoMode(false)
    if (!selectedBranchId || !selectedAcademicYearId || !selectedSemesterNumber) {
      setStudents([])
      return
    }

    const version = ++loadVersion.current
    setLoadError('')
    try {
      setLoading((x) => ({ ...x, list: true }))
      const selectedCourse = activeCourses.find((c) => String(c.id) === String(courseId))
      const selectedBranch = availableBranches.find((b) => String(b.id) === String(selectedBranchId))
      const semNumber = Number(selectedSemesterNumber)
      const selectedSemester = availableSemesters.find((s) => Number(s.semesterNumber || s.id) === semNumber)
      const selectedYear = activeAcademicYears.find((y) => String(y.id) === String(selectedAcademicYearId))

      // Load matching students from studentService
      const profiles = await studentService.getStudentsByScope({
        academicYearId: selectedAcademicYearId,
        academicYear: selectedYear?.name,
        courseId,
        branchId: selectedBranchId,
        semesterId: selectedSemester?.id,
        course: selectedCourse?.name,
        courseCode: selectedCourse?.code,
        branch: selectedBranch?.name,
        branchCode: selectedBranch?.code,
        semester: selectedSemester?.semesterName || `Semester ${semNumber}`,
        forceRefresh,
      })

      let eligibilityRows = []
      try {
        eligibilityRows = await studentPromotionApi.getEligibleStudents({
          branchId: selectedBranchId,
          academicYearId: selectedAcademicYearId,
          semesterNumber: selectedSemesterNumber,
        })
      } catch (eligErr) {
        console.warn('Backend getEligibleStudents unavailable or returned empty:', eligErr)
      }
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

      // Include eligible rows returned by promotion API if not already in roster
      ;(eligibilityRows || []).forEach(row => {
        const studentId = row.studentId || row.id
        if (!studentId || scopedProfileIds.has(String(studentId))) return
        scopedProfileIds.add(String(studentId))
        scopedProfiles.push({
          id: studentId,
          studentId,
          name: row.studentName || row.name || 'Student',
          fullName: row.studentName || row.name || 'Student',
          rollNumber: row.rollNumber || '',
          registrationNumber: row.registrationNumber || '',
          status: 'Active',
          academic: {
            course: row.courseName || selectedCourse?.name || '',
            courseId,
            branch: row.branchName || selectedBranch?.name || '',
            branchId: selectedBranchId,
            semester: row.currentSemester ? `Semester ${row.currentSemester}` : (selectedSemester?.semesterName || `Semester ${selectedSemesterNumber}`),
            semesterId: selectedSemester?.id ?? selectedSemesterNumber,
            section: row.sectionName || '',
            academicYear: selectedYear?.name || '',
            academicYearId: selectedAcademicYearId,
            rollNumber: row.rollNumber || '',
          },
          personal: { fullName: row.studentName || row.name || 'Student' },
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
        const eligibilityStatus = serverStatus || 'Pending Review'

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
          eligibilityLabel: serverStatus || 'Pending Review',
          status: eligibilityStatus,
          reason: (serverRecord?.reason || serverRecord?.eligibilityReason || serverRecord?.remarks || (serverRecord ? 'Eligibility returned by promotion service.' : 'Eligibility review is pending; the promotion service did not return this student as eligible.')),
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
      if (version !== loadVersion.current || currentScope.current !== scopeKey) return
      setHistory(newestFirst('promotions', enrichedHist))

      // Do not offer a student again when this source semester has already
      // been promoted. A prior Semester 1 → 2 record does not block a valid
      // Semester 2 → 3 promotion.
      const selectedSemesterNo = Number(selectedSemesterNumber)
      const historyStudentId = (row) => String(row.studentId ?? row.id ?? row.registrationNumber ?? row.rollNumber ?? '').trim()
      const semesterNo = (value) => Number(String(value ?? '').replace(/\D/g, '')) || 0
      const promotedFromScope = new Set(
        enrichedHist
          .filter((row) => /promoted|graduated|completed/i.test(String(row.status || '')) && semesterNo(row.fromSemester || row.currentSemester) === selectedSemesterNo && String(row.fromAcademicYearName || '') === String(selectedYear?.name || '') && String(row.fromBranchName || row.branch || '') === String(selectedBranch?.name || ''))
          .map(historyStudentId)
          .filter(Boolean)
      )
      setLoadedScope(scopeKey)
      setStudents(newestFirst('student-profiles', promotionCandidates.filter((student) => !promotedFromScope.has(historyStudentId(student)))))
    } catch (err) {
      if (version === loadVersion.current) setLoadError(err.message || 'Unable to load promotion scope.')
    } finally {
      if (version === loadVersion.current) setLoading((x) => ({ ...x, list: false }))
    }
  }, [selectedBranchId, selectedAcademicYearId, selectedSemesterNumber, courseId, activeCourses, availableBranches, availableSemesters, activeAcademicYears, getSectionsForScope, selectedCollegeId, scopeKey, isFinalSemester])

  useEffect(() => {
    loadVersion.current += 1
    setSelected([])
    setConfirmRows(null)
    setDirPage(1)
    setLoadError('')
    setPromotionResult(null)
    setLoading(current => ({ ...current, list: false }))
  }, [scopeKey, setHistory])

  useEffect(() => {
    if (tab !== 'history' || scopeReady || !selectedCollegeId) return undefined
    let active = true
    setHistoryError('')
    promotionService.getHistory().then(rows => {
      if (active) {
        setHistory(newestFirst('promotions', rows.map(row => ({
          ...row,
          fromSemester: formatSemesterLabel(row.fromSemester || row.currentSemester),
          toSemester: formatSemesterLabel(row.toSemester || row.nextSemester),
        }))))
        setHistPage(1)
      }
    }).catch(error => { if (active) setHistoryError(error.message || 'Unable to load promotion history.') })
    return () => { active = false }
  }, [tab, scopeReady, selectedCollegeId, setHistory])

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
    eligibilityTab === 'all' || (eligibilityTab === 'eligible' ? statusOf(row) === 'eligible' : statusOf(row) !== 'eligible')
  ), [filteredCandidates, eligibilityTab])

  const selectedRows = useMemo(() => {
    return students.filter((x) => selected.includes(idOf(x)))
  }, [students, selected])

  useEffect(() => { setDirPage(page => Math.min(page, Math.max(1, Math.ceil(visibleCandidates.length / pageSize)))) }, [visibleCandidates.length])

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
    if (!canPromote || !scopeReady || !confirmRows?.length || loading.list || loading.promotion || promotionBusyRef.current) return
    if (!canExecutePromotion) {
      setNotice('A unique saved target semester is required in the selected branch and academic year.', 'error')
      return
    }

    // Re-resolve from current state: a row might have been marked ineligible
    // after the confirmation dialog was opened.
    const currentRows = confirmRows.map(row => students.find(student => idOf(student) === idOf(row)))
    if (currentRows.some((row) => !row)) {
      setConfirmRows(null)
      setNotice('The selected student list changed. Reload the current scope and try again.', 'error')
      return
    }

    if (currentRows.some((row) => row.isDemo)) {
      promotionBusyRef.current = true
      setLoading((x) => ({ ...x, promotion: true }))
      await new Promise((res) => setTimeout(res, 500))

      const selectedYear = activeAcademicYears.find((y) => String(y.id) === String(selectedAcademicYearId))
      const demoIds = new Set(currentRows.map(idOf))
      const remaining = students.filter((s) => !demoIds.has(idOf(s)))
      setStudents(remaining)

      const histEntries = currentRows.map((row) => ({
        id: `hist-${Date.now()}-${idOf(row)}`,
        studentId: idOf(row),
        studentName: nameOf(row),
        rollNumber: row.rollNumber,
        registrationNumber: row.registrationNumber,
        course: row.course,
        branch: row.branch,
        fromSemester: row.currentSemester,
        toSemester: isDegreeReview ? 'Degree Conferred (Graduated)' : row.nextSemester,
        fromAcademicYearName: selectedYear?.name || '2026-27',
        toAcademicYearName: !isDegreeReview && requiresNextYear ? nextYear[0]?.name : selectedYear?.name || '2026-27',
        status: isDegreeReview ? 'Completed' : 'Promoted',
        promotionStatus: isDegreeReview ? 'COMPLETED' : 'APPROVED',
        createdAt: new Date().toISOString(),
        createdByName: 'Suresh Reddy (COLLEGE_ADMIN)',
        remarks: isDegreeReview
          ? 'Degree requirements confirmed & degree awarded.'
          : 'Academic standing verified & student advanced to next semester.',
      }))
      setHistory((prev) => [...histEntries, ...prev])
      setPromotionResult({
        successful: currentRows.length,
        failed: 0,
        message: isDegreeReview
          ? `Degree completion successfully awarded for ${currentRows.length} student(s).`
          : `Successfully promoted ${currentRows.length} student(s) to ${currentRows[0]?.nextSemester || 'next semester'}.`,
      })
      setNotice(`Promotion executed successfully for ${currentRows.length} student(s)!`, 'success')
      setSelected([])
      setConfirmRows(null)
      setTab('history')
      setLoading((x) => ({ ...x, promotion: false }))
      promotionBusyRef.current = false
      return
    }

    try {
      promotionBusyRef.current = true
      setLoading((x) => ({ ...x, promotion: true }))

      const selectedYear = activeAcademicYears.find((y) => String(y.id) === String(selectedAcademicYearId))
      const targetYear = activeAcademicYears.find((y) => String(y.id) === String(targetAcademicYearId)) || selectedYear

      const currentSemNum = Number(selectedSemesterNumber)
      const isDegreeCompletion = isDegreeReview

      const result = await promotionService.promoteBulk(currentRows, {
        branchId: selectedBranchId,
        currentAcademicYearId: selectedAcademicYearId,
        currentAcademicYear: selectedYear?.name,
        currentSemesterId: sourceSemester.id,
        currentSemester: `Semester ${currentSemNum}`,
        targetAcademicYearId: isDegreeCompletion ? selectedAcademicYearId : (targetAcademicYearId || selectedAcademicYearId),
        targetAcademicYear: isDegreeCompletion ? selectedYear?.name : targetYear?.name,
        targetSemesterId: isDegreeCompletion ? sourceSemester.id : nextSemesterId,
        targetSemester: isDegreeCompletion ? 'Graduated (Degree Conferred)' : `Semester ${currentSemNum + 1}`,
        targetSectionId: null,
        degreeConferred: isDegreeCompletion,
        remarks: currentRows.some((row) => statusOf(row) !== 'eligible')
          ? 'Administrator-approved promotion overriding recorded eligibility status.'
          : isDegreeCompletion ? 'Graduation & Degree Conferred' : 'Semester Batch Promotion',
        allowEligibilityOverride: true,
      })

      if (currentScope.current !== scopeKey) return
      const successful = Array.isArray(result) ? result.length : Number(result?.succeeded || 0)
      const failed = Number(result?.failed ?? Math.max(0, currentRows.length - successful))
      setPromotionResult({ successful, failed, message: failed ? 'Review promotion history to verify the outcome.' : 'Promotion completed successfully.' })

      setSelected([])
      setConfirmRows(null)
      await loadPromotionData(true)
    } catch (err) {
      if (currentScope.current !== scopeKey) return
      setNotice(err.message || 'Promotion could not be completed.', 'error')
      setConfirmRows(null)
      setPromotionResult({ successful: 0, failed: confirmRows.length, message: err.message || 'Promotion could not be completed.' })
      setSelected([])
      await loadPromotionData(true)
    } finally {
      promotionBusyRef.current = false
      setLoading((x) => ({ ...x, promotion: false }))
    }
  }

  return (
    <DashboardLayout>
      <main className="student-promotion p-module">
        <PageHeader className="promotion-dashboard-header" title="Student Promotions"
          subtitle="Manage semester advancement and degree completion."
          compactSummary={[
            { label: 'Total Students', value: scopeReady ? students.length : '—' },
            { label: 'Eligible', value: scopeReady ? students.filter(row => statusOf(row) === 'eligible').length : '—' },
            { label: 'Promoted', value: scopeReady ? history.filter(row => /^promoted$/i.test(row.status)).length : '—' },
            { label: 'Completed', value: scopeReady ? history.filter(row => /graduated|completed/i.test(row.status)).length : '—' },
          ]}
        />

        <AnimatePresence mode="wait">
        {promotionResult && (
          <motion.section className={`promotion-result ${promotionResult.failed ? 'has-failures' : ''}`} role="status" initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}>
            <div><FiInfo aria-hidden="true" /><div><h2>{promotionResult.message}</h2><p>{promotionResult.successful} completed · {promotionResult.failed} failed or requiring follow-up</p></div></div>
            <button type="button" className="erp-btn erp-btn--secondary" onClick={() => { setPromotionResult(null) }}>Dismiss</button>
          </motion.section>
        )}
        </AnimatePresence>

        <div className="promotion-workspace">
        {/* Promotion Scope Selector Panel */}
        <motion.section className="p-scope erp-card" initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.24 }}>
          <h2>Promotion Configuration</h2>
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
          <fieldset className="erp-form-grid promotion-configuration-fields" disabled={loading.promotion}>
            <div className="erp-form-group">
              <label>Current Academic Year <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <ProjectSelect
                className="erp-select"
                value={selectedAcademicYearId}
                disabled={academicLoading || !activeAcademicYears.length}
                onChange={(e) => {
                  setSelectedAcademicYearId(e.target.value)
                  setSelectedSemesterNumber('')
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
              <label htmlFor="promotion-type">Promotion Type <span className="p-required" style={{ color: '#dc2626' }}>*</span></label>
              <select
                id="promotion-type"
                className="erp-select"
                value={promotionType}
                disabled={!selectedSemesterNumber || loading.promotion}
                onChange={event => setAdvancementType(event.target.value)}
                aria-describedby="promotion-type-help"
              >
                {isFinalSemester ? (
                  <option value="degree">Degree Completion Review (Graduation)</option>
                ) : Number(selectedSemesterNumber) % 2 === 0 ? (
                  <>
                    <option value="next-year">Next Academic Year (Annual Advancement)</option>
                    <option value="next-semester" disabled>Next Semester (Cross-Year Advancement Required)</option>
                  </>
                ) : (
                  <>
                    <option value="next-semester">Next Semester (Same Academic Year)</option>
                    <option value="next-year" disabled>Next Academic Year (Available for Even Semesters)</option>
                  </>
                )}
              </select>
              <small id="promotion-type-help" style={{ color: '#16a34a', display: 'block', marginTop: '4px' }}>
                {selectedSemesterNumber
                  ? isFinalSemester
                    ? 'Final semester review for degree award and course completion.'
                    : Number(selectedSemesterNumber) % 2 === 0
                      ? `Annual advancement from Semester ${selectedSemesterNumber} to Semester ${Number(selectedSemesterNumber) + 1} (${nextYear[0]?.name || 'Next AY'}).`
                      : `Regular progression from Semester ${selectedSemesterNumber} to Semester ${Number(selectedSemesterNumber) + 1} (${selectedYear?.name || ''}).`
                  : ''}
              </small>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="erp-btn erp-btn--primary promotion-load"
                disabled={!selectedSemesterNumber || !selectedBranchId || !selectedAcademicYearId || loading.list || loading.promotion}
                onClick={() => { setSelected([]); setDirPage(1); setTab('promotion'); loadPromotionData(true) }}
              >
                Load Students
              </button>
              <button
                type="button"
                className="erp-btn erp-btn--secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleLoadDemoBatch}
                title="Load 4 realistic sample students (Eligible, Condonation, Detained) to preview promotion flow"
              >
                <FiUsers aria-hidden="true" /> Sample Preview
              </button>
            </div>
          </fieldset>
          {loadError && <p role="alert">{loadError}</p>}
        </motion.section>

        {/* Real-World University Promotion Criteria Banner */}
        <div className="promotion-criteria-banner erp-card" style={{ padding: '14px 18px', marginBottom: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiShield style={{ color: '#2563eb', fontSize: '22px', flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>University Academic Promotion Criteria (B.Tech Regulations)</strong>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>
                  Standard evaluation criteria for semester advancement, condonation, and credit detention.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="erp-badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>
                <strong>Min Attendance:</strong> 75% (&ge;65% with Medical Condonation)
              </span>
              <span className="erp-badge" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>
                <strong>Credit Clearance:</strong> &ge;50% Credits for Cross-Year
              </span>
              <span className="erp-badge" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>
                <strong>Active Backlogs:</strong> &le;4 for Regular Progression
              </span>
            </div>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="promotion-directory-column">
        <nav className="p-tabs" aria-label="Promotion views">
          <button
            type="button"
            className={tab === 'promotion' ? 'active' : ''}
            onClick={() => setTab('promotion')}
          >
            Eligible Students{scopeReady ? ` (${students.filter(row => statusOf(row) === "eligible").length})` : ""}
          </button>
          <button
            type="button"
            className={tab === 'history' ? 'active' : ''}
            onClick={() => setTab('history')}
          >
            Promotion History
          </button>
        </nav>

        {/* Tab 1: Promotion Directory */}
        {tab === 'promotion' && (
          <>
            {!loadedScope && !loading.list ? (
              <section className="p-panel p-empty">
                <EmptyState
                  icon={FiInfo}
                  title="Load Students"
                  subtitle="Choose a valid Course, Branch, Academic Year, and Semester above, then select Load Students."
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="erp-btn erp-btn--primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                    onClick={handleLoadDemoBatch}
                  >
                    <FiUsers aria-hidden="true" />
                    Load Sample Student Batch (Interactive Preview)
                  </button>
                </div>
              </section>
            ) : (
              <>
                {!scopeReady && loadedScope && <div className="p-scope-status" role="status">Filters changed. The roster below shows the previously loaded scope. Click Load Students to apply your current selections.</div>}
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
                        rows={scopeReady ? visibleCandidates : []}
                        columns={promotionColumns}
                        title="Student Promotions"
                        filename="student-promotions"
                        loading={loading.list}
                      />

                      {canPromote && <button
                        type="button"
                        className="erp-btn erp-btn--primary"
                        disabled={!scopeReady || !canExecutePromotion || !selectedRows.length || loading.list || loading.promotion}
                        onClick={() => setConfirmRows(selectedRows)}
                      >
                        {isDegreeReview
                          ? selectedRows.length === 1 ? 'Complete Degree' : 'Complete Degrees'
                          : selectedRows.length === 1 ? 'Promote Student' : 'Bulk Promote'} ({selectedRows.length})
                      </button>}
                    </div>
                  </header>

                  <div className="p-filters">
                    <div className="erp-input-icon-wrap">
                      <FiSearch className="erp-input-icon" />
                      <input
                        type="text"
                        className="erp-input"
                        aria-label="Search students"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value)
                          setDirPage(1)
                        }}
                        placeholder="Search student name, roll number, or registration..."
                      />
                    </div>
                    <label className="promotion-toolbar-field">
                      <span>Eligibility</span>
                      <select className="erp-select" value={eligibilityTab} onChange={event => { setEligibilityTab(event.target.value); setDirPage(1) }}>
                        <option value="all">All students</option>
                        <option value="eligible">Eligible</option>
                        <option value="ineligible">Ineligible / pending</option>
                      </select>
                    </label>
                    <label className="promotion-toolbar-field">
                      <span>Sort by</span>
                      <select className="erp-select" value={sortBy} onChange={event => { setSortBy(event.target.value); setDirPage(1) }}>
                        <option value="name">Student name</option>
                        <option value="roll">Roll number</option>
                        <option value="eligibility">Eligibility</option>
                      </select>
                    </label>
                  </div>

                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th className="table-center" style={{ width: '40px' }}>
                            <input
                              type="checkbox"
                              aria-label="Select all students"
                              disabled={!canPromote || !scopeReady || loading.list || loading.promotion}
                              checked={
                                visibleCandidates.length > 0 &&
                                visibleCandidates.every((x) => selected.includes(idOf(x)))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelected([
                                    ...new Set([...selected, ...visibleCandidates.map(idOf)]),
                                  ])
                                } else {
                                  setSelected(
                                    selected.filter(
                                      (id) => !visibleCandidates.map(idOf).includes(id)
                                    )
                                  )
                                }
                              }}
                            />
                          </th>
                          <th style={{ width: '120px', whiteSpace: 'nowrap' }}>Roll Number</th>
                          <th style={{ width: '140px' }}>Student Name</th>
                          <th style={{ width: '165px', whiteSpace: 'nowrap' }}>Transition</th>
                          <th style={{ width: '115px', whiteSpace: 'nowrap' }}>Attendance</th>
                          <th style={{ width: '135px', whiteSpace: 'nowrap' }}>Academic Standing</th>
                          <th className="table-center" style={{ width: '120px', whiteSpace: 'nowrap' }}>Eligibility</th>
                          <th style={{ minWidth: '170px', maxWidth: '240px' }}>Assessment / Reason</th>
                          <th className="table-center" style={{ width: '65px', whiteSpace: 'nowrap' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading.list ? (
                          Array.from({ length: 5 }, (_, index) => (
                            <tr key={`loading-${index}`} className="promotion-skeleton-row" aria-hidden="true">
                              <td colSpan={9}><span /></td>
                            </tr>
                          ))
                        ) : paginatedCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="promotion-empty-cell">
                              <div className="promotion-empty-state" role="status">
                                <span className="promotion-empty-icon"><FiUsers aria-hidden="true" /></span>
                                <strong>{query ? 'No students match your search' : eligibilityTab === 'eligible' ? 'No eligible students in this scope' : 'No students awaiting review'}</strong>
                                <p>{query ? 'Try another name, roll number, or registration number.' : 'Try a different academic scope or load demo students below.'}</p>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                                  {query && <button type="button" className="erp-btn erp-btn--secondary" onClick={() => { setQuery(''); setDirPage(1) }}>Clear search</button>}
                                  <button type="button" className="erp-btn erp-btn--primary" onClick={handleLoadDemoBatch}>
                                    <FiUsers aria-hidden="true" /> Load Sample Student Batch
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedCandidates.map((x) => {
                            const attRate = x.attendanceRate !== null && x.attendanceRate !== undefined ? Number(x.attendanceRate) : null
                            const isElig = statusOf(x) === 'eligible'
                            const isDetained = /detained|shortage|deficit/i.test(String(x.eligibilityLabel || x.reason || ''))
                            const hasBacklogs = x.backlogs !== undefined

                            return (
                              <tr key={idOf(x)}>
                                <td className="table-center" style={{ width: '44px' }}>
                                  <input
                                    type="checkbox"
                                    aria-label={'Select ' + nameOf(x)}
                                    disabled={!canPromote || !scopeReady || loading.promotion}
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
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 600 }}>{x.rollNumber || x.registrationNumber || '—'}</div>
                                  {x.registrationNumber && x.rollNumber && x.registrationNumber !== x.rollNumber && (
                                    <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>{x.registrationNumber}</small>
                                  )}
                                </td>
                                <td>
                                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{nameOf(x)}</strong>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{x.branch} {x.section ? `• ${x.section}` : ''}</div>
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontWeight: 500 }}>{x.currentSemester}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                                    <strong style={{ color: 'var(--brand, #1769C2)' }}>
                                      {isDegreeReview ? 'Degree Conferred' : nextTerms[0]?.semesterName || (canExecutePromotion ? x.nextSemester : '—')}
                                    </strong>
                                  </div>
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {attRate !== null ? (
                                    <span
                                      className="erp-badge"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        backgroundColor: attRate >= 75 ? '#dcfce7' : attRate >= 65 ? '#fef3c7' : '#fee2e2',
                                        color: attRate >= 75 ? '#15803d' : attRate >= 65 ? '#b45309' : '#b91c1c',
                                        border: `1px solid ${attRate >= 75 ? '#86efac' : attRate >= 65 ? '#fde68a' : '#fca5a5'}`,
                                      }}
                                    >
                                      {attRate}% {attRate >= 75 ? '✓' : attRate >= 65 ? '(Condonation)' : '(Shortage)'}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                  )}
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <div>
                                    {x.creditsEarned !== null && x.creditsEarned !== undefined ? (
                                      <span><strong>{x.creditsEarned}</strong>{x.totalCredits ? ` / ${x.totalCredits}` : ''} Credits</span>
                                    ) : x.cgpa ? (
                                      <span>CGPA: <strong>{x.cgpa}</strong></span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                    {hasBacklogs ? (
                                      <span style={{ color: x.backlogs === 0 ? '#16a34a' : x.backlogs > 4 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                                        {x.backlogs === 0 ? '0 Backlogs' : `${x.backlogs} Backlog${x.backlogs > 1 ? 's' : ''}`}
                                      </span>
                                    ) : x.sgpa ? (
                                      <span style={{ color: 'var(--text-muted)' }}>SGPA: {x.sgpa}</span>
                                    ) : null}
                                    {x.cgpa && hasBacklogs && (
                                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>• CGPA {x.cgpa}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="table-center" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                                  <StatusBadge
                                    value={x.eligibilityLabel || (isElig ? 'Eligible' : isDetained ? 'Detained' : 'Pending Review')}
                                  />
                                </td>
                                <td style={{ maxWidth: '240px', minWidth: '170px' }}>
                                  <div
                                    className="p-reason-text"
                                    style={{
                                      fontSize: '11.5px',
                                      lineHeight: '1.4',
                                      color: isElig ? '#15803d' : isDetained ? '#b91c1c' : '#64748b',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      wordBreak: 'break-word',
                                    }}
                                    title={x.reason || (isElig ? 'Ready for promotion' : 'Awaiting review')}
                                  >
                                    {x.reason || (isElig ? 'Ready for promotion' : 'Awaiting review')}
                                  </div>
                                </td>
                                <td className="table-center" style={{ width: '65px', whiteSpace: 'nowrap' }}>
                                  <div className="table-actions-group">
                                    <button
                                      type="button"
                                      className="table-action-btn action-view"
                                      title="Review Student Details"
                                      aria-label="Review Student Details"
                                      onClick={() => setReview(x)}
                                    >
                                      <FiEye />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {visibleCandidates.length > pageSize && <TablePagination
                    currentPage={dirPage}
                    totalPages={Math.max(1, Math.ceil(visibleCandidates.length / pageSize))}
                    pageSize={pageSize}
                    onPageChange={setDirPage}
                  />}
                </section>
              </>
            )}
          </>
        )}

        {/* Tab 2: Promotion History */}
        {tab === 'history' && historyError && <p role="alert">{historyError}</p>}
        {tab === 'history' && !historyError && (
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
                            value={h.status || 'Unavailable'}
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

      </main>

      {/* Review Drawer */}
      {review && (
        <ReviewDrawer
          student={review}
          onClose={() => setReview(null)}
          canEdit={canPromote && !review.promotionDate}
          onStatus={async (status) => {
            if (review.isDemo) {
              const normalized = String(status || '').toUpperCase()
              setStudents((prev) => prev.map((s) => (
                idOf(s) === idOf(review)
                  ? {
                      ...s,
                      eligibilityStatus: normalized,
                      eligibilityLabel: normalized === 'ELIGIBLE' ? 'Eligible (Admin Override)' : 'Ineligible (Admin Marked)',
                      status: normalized === 'ELIGIBLE' ? 'eligible' : 'ineligible',
                      reason: normalized === 'ELIGIBLE' ? 'Manually approved by Administrator override.' : 'Manually marked ineligible by Administrator.',
                    }
                  : s
              )))
              if (normalized === 'INELIGIBLE') {
                setSelected((prev) => prev.filter((id) => id !== idOf(review)))
                setConfirmRows((prev) => prev?.filter((row) => idOf(row) !== idOf(review)) || null)
              }
              setNotice(`Student marked ${normalized} successfully.`, 'success')
              setReview(null)
              return
            }
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
          scope={[
            ['Promotion type', promotionTypeLabel],
            ['Current semester', sourceSemester?.semesterName || formatSemesterLabel(selectedSemesterNumber)],
            ['Target semester', isDegreeReview ? 'Degree Completion' : nextTerms[0]?.semesterName || formatSemesterLabel(Number(selectedSemesterNumber) + 1)],
            ['Current academic year', selectedYear?.name],
            ['Target academic year', !isDegreeReview && requiresNextYear ? nextYear[0]?.name : selectedYear?.name],
          ]}
          onCancel={() => setConfirmRows(null)}
          onConfirm={handleExecutePromotion}
        />
      )}
    </DashboardLayout>
  )
}
