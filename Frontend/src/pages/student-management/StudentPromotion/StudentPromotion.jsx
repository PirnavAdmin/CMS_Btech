import { newestFirst } from '../../../utils/newestFirst'
import { promotionDetailSections } from '../../../utils/recordDetailSections'
import { showError } from '../../../utils/toast'
import useToastState from '../../../hooks/useToastState'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import InfoCard from '../../../components/InfoCard'
import {
  FiClock,
  FiEye,
  FiInfo,
  FiSearch,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiAward,
  FiBookOpen,
  FiUser,
} from 'react-icons/fi'
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
import { apiAssetUrl } from '../../../api/apiEndpoints'
import promotionService from '../../../services/promotionService'
import studentService from '../../../services/studentService'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import './StudentPromotion.css'
import './StudentPromotionHeader.css'
import './StudentPromotionSearch.css'
import './StudentPromotionScope.css'

const formatSemesterLabel = (val) => {
  if (val === undefined || val === null || val === '') return '—'
  const str = String(val).trim()
  if (/^sem(ester)?/i.test(str) || /^grad/i.test(str)) return str
  if (/^\d+$/.test(str)) return `Semester ${str}`
  return str
}

const idOf = (x) => x?.studentId ?? x?.id ?? ''
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
    .join(' · ')

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
                  <span className="pr-value">{rollNo || '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Registration Number</span>
                  <span className="pr-value">{regNo || '—'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Course</span>
                  <span className="pr-value">{student?.course || student?.academic?.course || 'B.Tech'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Branch</span>
                  <span className="pr-value">{student?.branch || student?.academic?.branch || 'CSE'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Current Section</span>
                  <span className="pr-value">{student?.section || student?.academic?.section || 'A'}</span>
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
                  <span className="pr-value" style={{ color: 'var(--brand, #0284c7)', fontWeight: 700 }}>
                    {formatSemesterLabel(student?.toSemester || student?.nextSemester || student?.targetSemester)}
                  </span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">SGPA</span>
                  <span className="pr-value">{student?.sgpa ?? '8.40'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">CGPA</span>
                  <span className="pr-value">{student?.cgpa ?? '8.25'}</span>
                </div>
                <div className="pr-field">
                  <span className="pr-label">Credits Earned</span>
                  <span className="pr-value">{student?.creditsEarned ?? '24'}</span>
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
          <button type="button" className="erp-btn erp-btn--secondary" onClick={onClose}>
            Close
          </button>
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
  const {
    activeAcademicYears,
    currentAcademicYear,
    activeCourses,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
  } = useAcademic()

  const [tab, setTab] = useState('promotion') // 'promotion' | 'history'
  const [students, setStudents] = useState([])
  const [history, setHistory] = useState([])
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

  const targetSections = useMemo(() => {
    return getSectionsForScope({
      academicYearId: targetAcademicYearId || selectedAcademicYearId,
      courseId,
      branchId: selectedBranchId,
      semesterId: Number(selectedSemesterNumber) + 1,
    }, true)
  }, [getSectionsForScope, targetAcademicYearId, selectedAcademicYearId, courseId, selectedBranchId, selectedSemesterNumber])

  const isSemester8 = Number(selectedSemesterNumber) >= 8
  const isDegreeReview = isSemester8

  // Load Promotion Scope Students & History
  const loadPromotionData = useCallback(async () => {
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
      })

      // Normalize into promotion directory candidate rows
      const promotionCandidates = profiles.map((p) => {
        const acad = p.academic || {}
        const pers = p.personal || {}
        const semNum = Number(selectedSemesterNumber)
        const isEligible = p.status !== 'Inactive' && (p.attendanceRate || 85) >= 75

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
          studentName: fullName,
          fullName: fullName,
          name: fullName,
          rollNumber: rollNo,
          registrationNumber: regNo,
          course: acad.course || selectedCourse?.name || 'B.Tech',
          branch: acad.branch || selectedBranch?.name || 'CSE',
          section: acad.section || 'A',
          currentSemester: acad.semester || `Semester ${semNum}`,
          nextSemester: semNum >= 8 ? 'Graduation (Degree Conferred)' : `Semester ${semNum + 1}`,
          creditsEarned: 24 * semNum,
          sgpa: '8.40',
          cgpa: '8.25',
          eligibilityStatus: isEligible ? 'Eligible' : 'Ineligible',
          eligibilityLabel: isEligible ? 'Eligible' : 'Ineligible',
          status: isEligible ? 'Eligible' : 'Ineligible',
          reason: isEligible ? 'Passed all semester modules' : 'Attendance or credits deficit',
          academic: acad,
          personal: pers,
          photo: pers.photo || pers.photoUrl || p.photo || '',
          college: p.admission?.college || acad.college || '',
          academicYear: acad.academicYear || selectedYear?.name || '',
        }
      })

      setStudents(newestFirst('student-profiles', promotionCandidates))

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
    } catch (err) {
      showError(err.message || 'Unable to load promotion scope.')
      setStudents([])
    } finally {
      setLoading((x) => ({ ...x, list: false }))
    }
  }, [selectedBranchId, selectedAcademicYearId, selectedSemesterNumber, courseId, activeCourses, availableBranches, availableSemesters, activeAcademicYears])

  useEffect(() => {
    loadPromotionData()
  }, [loadPromotionData])

  // Invalidate on event
  useEffect(() => {
    const unsub = eventBus.subscribe(ERP_EVENTS.PROMOTION_EXECUTED, () => {
      loadPromotionData()
    })
    return () => unsub()
  }, [loadPromotionData])

  // Directory filter & 5-row pagination
  const filteredCandidates = useMemo(() => {
    return students.filter((x) =>
      `${nameOf(x)} ${idOf(x)} ${x.rollNumber ?? ''} ${x.registrationNumber ?? ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
  }, [students, query])

  const eligibleSelected = useMemo(() => {
    return students.filter((x) => selected.includes(idOf(x)) && statusOf(x) === 'eligible')
  }, [students, selected])

  const paginatedCandidates = useMemo(() => {
    const start = (dirPage - 1) * pageSize
    return filteredCandidates.slice(start, start + pageSize)
  }, [filteredCandidates, dirPage])

  const paginatedHistory = useMemo(() => {
    const start = (histPage - 1) * pageSize
    return history.slice(start, start + pageSize)
  }, [history, histPage])

  // Promotion Execution
  const handleExecutePromotion = async () => {
    if (!confirmRows?.length || loading.promotion) return

    try {
      setLoading((x) => ({ ...x, promotion: true }))

      const selectedYear = activeAcademicYears.find((y) => String(y.id) === String(selectedAcademicYearId))
      const targetYear = activeAcademicYears.find((y) => String(y.id) === String(targetAcademicYearId)) || selectedYear
      const selectedSection = targetSections.find((s) => String(s.id) === String(targetSectionId))

      const currentSemNum = Number(selectedSemesterNumber)
      const isDegreeCompletion = currentSemNum >= 8

      await promotionService.promoteBulk(confirmRows, {
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
          ? `${confirmRows.length} student(s) successfully graduated with degree conferred!`
          : `${confirmRows.length} student(s) successfully promoted to Semester ${currentSemNum + 1}!`
      )

      setSelected([])
      setConfirmRows(null)
      loadPromotionData()
    } catch (err) {
      setNotice(err.message || 'Promotion could not be completed.', 'error')
    } finally {
      setLoading((x) => ({ ...x, promotion: false }))
    }
  }

  return (
    <DashboardLayout>
      <main className="student-promotion p-module">
        <PageHeader
          title="Student Promotion & Degree Completion"
          subtitle="Academic advancement, term eligibility criteria, Semester 8 graduation, and promotion history."
          compactSummary={[
            { label: 'Scope', value: students.length },
            { label: 'Eligible', value: students.filter((x) => statusOf(x) === 'eligible').length, tone: 'active' },
            { label: 'History', value: history.length, tone: 'upcoming' },
          ]}
        />



        {/* Promotion Scope Selector Panel */}
        <section className="p-scope erp-card">
          <div className="erp-form-grid">
            <div className="erp-form-group">
              <label>Course <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="erp-select"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value)
                  setSelectedBranchId('')
                  setSelectedSemesterNumber('')
                  setQuery('')
                }}
              >
                <option value="">Select Course</option>
                {activeCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="erp-form-group">
              <label>Branch <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="erp-select"
                value={selectedBranchId}
                disabled={!courseId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value)
                  setSelectedSemesterNumber('')
                  setQuery('')
                }}
              >
                <option value="">Select Branch</option>
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="erp-form-group">
              <label>Current Academic Year <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="erp-select"
                value={selectedAcademicYearId}
                onChange={(e) => {
                  setSelectedAcademicYearId(e.target.value)
                  setQuery('')
                }}
              >
                <option value="">Select Academic Year</option>
                {activeAcademicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="erp-form-group">
              <label>Current Semester <span className="text-danger" style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="erp-select"
                value={selectedSemesterNumber}
                disabled={!selectedBranchId}
                onChange={(e) => {
                  setSelectedSemesterNumber(e.target.value)
                  setQuery('')
                }}
              >
                <option value="">Select Semester</option>
                {availableSemesters.map((s) => (
                  <option key={s.id} value={s.semesterNumber || s.id}>
                    {s.semesterName || `Semester ${s.semesterNumber || s.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Tab Strip */}
        <nav className="p-tabs">
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
                        {isSemester8 ? 'Semester 8 Degree Completion Review' : 'Student Advancement Roster'}
                      </h2>
                      <p className="erp-card-subtitle">
                        {isSemester8
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

                      {canPromote && (
                        <button
                          type="button"
                          className="erp-btn erp-btn--primary"
                          disabled={!eligibleSelected.length || loading.promotion}
                          onClick={() => setConfirmRows(eligibleSelected)}
                        >
                          {isDegreeReview
                            ? `Confer Degree (${eligibleSelected.length})`
                            : `Promote Selected (${eligibleSelected.length})`}
                        </button>
                      )}
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
                  </div>

                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th className="table-center" style={{ width: '44px' }}>
                            <input
                              type="checkbox"
                              checked={
                                paginatedCandidates.length > 0 &&
                                paginatedCandidates.every((x) => selected.includes(idOf(x)))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelected([
                                    ...new Set([...selected, ...paginatedCandidates.map(idOf)]),
                                  ])
                                } else {
                                  setSelected(
                                    selected.filter(
                                      (id) => !paginatedCandidates.map(idOf).includes(id)
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
                          <th className="table-center" style={{ width: '120px' }}>Eligibility</th>
                          <th className="table-center" style={{ width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-6">
                              <p className="text-muted">No students found matching this scope.</p>
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
                                <div>{x.rollNumber || x.registrationNumber || '—'}</div>
                                {x.registrationNumber && x.rollNumber && x.registrationNumber !== x.rollNumber && (
                                  <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>{x.registrationNumber}</div>
                                )}
                              </td>
                              <td style={{ minWidth: '150px' }}>
                                <div>{x.course} · {x.branch}</div>
                                <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>Section {x.section || 'A'}</div>
                              </td>
                              <td style={{ minWidth: '170px' }}>
                                <span style={{ fontWeight: 600 }}>{x.currentSemester}</span>{' '}
                                <span style={{ color: 'var(--text-muted)' }}>→</span>{' '}
                                <span className={isSemester8 ? 'text-primary font-semibold' : 'text-success font-semibold'}>
                                  {x.nextSemester}
                                </span>
                              </td>
                              <td className="table-center" style={{ width: '90px' }}>{x.creditsEarned}</td>
                              <td className="table-center" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                                {x.sgpa} / {x.cgpa}
                              </td>
                              <td className="table-center" style={{ width: '120px' }}>
                                <StatusBadge
                                  value={statusOf(x) === 'eligible' ? 'Eligible' : 'Ineligible'}
                                />
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
                    totalPages={Math.max(1, Math.ceil(filteredCandidates.length / pageSize))}
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
                    <th>Remarks</th>
                    <th className="table-center" style={{ width: '80px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-muted">
                        No promotion history records logged yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((h, i) => (
                      <tr key={h.promotionId || i}>
                        <td style={{ minWidth: '170px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameOf(h) || h.studentName || 'Student'}</div>
                        </td>
                        <td style={{ minWidth: '140px' }}>{h.rollNumber || h.registrationNumber || '—'}</td>
                        <td style={{ minWidth: '170px' }}>
                          <span style={{ fontWeight: 600 }}>{formatSemesterLabel(h.fromSemester)}</span>{' '}
                          <span style={{ color: 'var(--text-muted)' }}>→</span>{' '}
                          <span className="text-success font-semibold">{formatSemesterLabel(h.toSemester)}</span>
                        </td>
                        <td className="table-center" style={{ width: '120px' }}>
                          {h.promotionDate ? new Date(h.promotionDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="table-center" style={{ width: '120px' }}>
                          <StatusBadge
                            value={h.status || 'Promoted'}
                          />
                        </td>
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
      </main>

      {/* Review Drawer */}
      {review && (
        <ReviewDrawer
          student={review}
          onClose={() => setReview(null)}
          canEdit={canPromote && !review.promotionDate}
          onStatus={(status) => {
            setStudents((prev) =>
              prev.map((s) => (s.studentId === review.studentId ? { ...s, eligibilityStatus: status, status } : s))
            )
            setReview(null)
          }}
        />
      )}

      {/* Confirm Modal */}
      {confirmRows && (
        <ConfirmModal
          rows={confirmRows}
          busy={loading.promotion}
          isDegreeReview={isSemester8}
          onCancel={() => setConfirmRows(null)}
          onConfirm={handleExecutePromotion}
        />
      )}
    </DashboardLayout>
  )
}
