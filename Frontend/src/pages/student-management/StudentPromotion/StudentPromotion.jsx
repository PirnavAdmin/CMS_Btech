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
import promotionService from '../../../services/promotionService'
import studentService from '../../../services/studentService'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import './StudentPromotion.css'
import './StudentPromotionHeader.css'
import './StudentPromotionSearch.css'
import './StudentPromotionScope.css'

const idOf = (x) => x.studentId ?? x.id
const nameOf = (x) => x.studentName ?? x.fullName ?? x.name ?? x.personal?.fullName ?? 'Unnamed student'
const statusOf = (x) => String(x.eligibilityStatus ?? x.status ?? 'Pending').toLowerCase()

function ConfirmModal({ rows, busy, onCancel, onConfirm, isDegreeReview }) {
  return (
    <div className="p-overlay">
      <section className="p-confirm">
        {isDegreeReview ? <FiAward className="text-primary text-3xl" /> : <FiTrendingUp className="text-primary text-3xl" />}
        <h2>{isDegreeReview ? 'Confirm Degree Completion & Graduation' : 'Confirm Student Promotion'}</h2>
        <p>
          {rows.length} eligible student{rows.length === 1 ? '' : 's'} selected for{' '}
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
  return (
    <div className="p-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="p-drawer cm-profile-view" data-print-scope data-export-record style={{ maxWidth: '780px', width: '92vw', padding: '20px' }}>
        <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="Promotion Details" filename={`promotion_${student.registrationNumber || student.rollNumber || idOf(student)}_${student.fromSemester || student.currentSemester || ""}-to-${student.toSemester || student.nextSemester || student.targetSemester || ""}`} recordSections={promotionDetailSections(student)} />
          <button className="erp-btn erp-btn--secondary" onClick={onClose} aria-label="Close">
            <FiX /> Close
          </button>
        </div>

        <div className="cm-profile-card">
          <div className="cm-profile-banner">
            <div className="cm-profile-avatar-wrap">
              <div className="cm-profile-placeholder">
                <FiUser />
              </div>
            </div>
            <div className="cm-profile-header-info">
              <div className="cm-profile-badges">
                <span className="cm-badge cm-badge-code">{idOf(student)}</span>
                <span className="cm-badge cm-badge-type">{student.rollNumber || student.academic?.rollNumber || 'Student'}</span>
                <span className={`cm-status-badge ${statusOf(student) === 'eligible' ? 'active' : 'inactive'}`}>
                  {student.eligibilityLabel ?? student.status ?? 'Eligible'}
                </span>
              </div>
              <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{nameOf(student)}</span></h1>
              <p className="cm-profile-subtitle">
                <span style={{ color: '#fff' }}>{[student.course || student.academic?.course, student.branch || student.academic?.branch, student.section ? `Section ${student.section}` : null].filter(Boolean).join(' · ')}</span>
              </p>
            </div>
          </div>

          <div className="cm-profile-grid">
            {promotionDetailSections(student).map(section => <InfoCard key={section.title} title={section.title} rows={section.rows} />)}
          </div>
        </div>

        <footer style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {canEdit && (
            <>
              <button className="erp-btn erp-btn--secondary" onClick={() => onStatus('ELIGIBLE')}>
                Mark Eligible
              </button>
              <button className="erp-btn erp-btn--secondary" onClick={() => onStatus('INELIGIBLE')}>
                Mark Ineligible
              </button>
            </>
          )}
          <button className="erp-btn erp-btn--secondary" onClick={onClose}>
            Close
          </button>
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

  // Initialize active academic year
  useEffect(() => {
    if (!selectedAcademicYearId) {
      const preferred = currentAcademicYear || activeAcademicYears[0]
      const id = preferred?.id ?? preferred?.academicYearId
      if (id !== undefined && id !== null && id !== '') setSelectedAcademicYearId(String(id))
    }
  }, [activeAcademicYears, currentAcademicYear, selectedAcademicYearId])

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

      // Load matching students from studentService
      const profiles = await studentService.getStudentsByScope({
        academicYearId: selectedAcademicYearId,
        courseId,
        branchId: selectedBranchId,
        semesterId: selectedSemesterNumber,
        course: selectedCourse?.name,
        branch: selectedBranch?.name,
        semester: selectedSemester?.semesterName,
      })

      // Normalize into promotion directory candidate rows
      const promotionCandidates = profiles.map((p) => {
        const acad = p.academic || {}
        const pers = p.personal || {}
        const semNum = Number(selectedSemesterNumber)
        const isEligible = p.status !== 'Inactive' && (p.attendanceRate || 85) >= 75

        return {
          id: p.studentId || p.id,
          studentId: p.studentId || p.id,
          studentName: pers.fullName || p.name || 'Student',
          name: pers.fullName || p.name || 'Student',
          rollNumber: acad.rollNumber || p.rollNumber || '',
          registrationNumber: p.registrationNumber || acad.rollNumber || '',
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
        }
      })

      setStudents(promotionCandidates)

      // Load History
      const hist = await promotionService.getHistory()
      setHistory(hist || [])
    } catch (err) {
      showError(err.message || 'Unable to load promotion scope.')
      setStudents([])
    } finally {
      setLoading((x) => ({ ...x, list: false }))
    }
  }, [selectedBranchId, selectedAcademicYearId, selectedSemesterNumber, courseId, activeCourses, availableBranches, availableSemesters])

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

            {!isSemester8 && (
              <>
                <div className="erp-form-group">
                  <label>Target Academic Year</label>
                  <select
                    className="erp-select"
                    value={targetAcademicYearId}
                    onChange={(e) => setTargetAcademicYearId(e.target.value)}
                  >
                    <option value="">Same / Default Next Academic Year</option>
                    {activeAcademicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label>Target Section Allocation</label>
                  <select
                    className="erp-select"
                    value={targetSectionId}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                  >
                    <option value="">Auto-Retain / Unassigned</option>
                    {targetSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({sec.code})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
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
                                {idOf(x) && idOf(x) !== nameOf(x) && (
                                  <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                                    {String(idOf(x)).startsWith('STU') ? idOf(x) : `ID: ${idOf(x)}`}
                                  </div>
                                )}
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
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-muted">
                        No promotion history records logged yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((h, i) => (
                      <tr key={h.promotionId || i}>
                        <td style={{ minWidth: '170px' }}>
                          <button type="button" className="erp-btn erp-btn--secondary" title="View promotion details" onClick={() => setReview(h)}>{h.studentName || 'Student'} <FiEye /></button>
                          {h.studentId && (
                            <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                              {String(h.studentId).startsWith('STU') ? h.studentId : `ID: ${h.studentId}`}
                            </div>
                          )}
                        </td>
                        <td style={{ minWidth: '140px' }}>{h.rollNumber || h.registrationNumber || '—'}</td>
                        <td style={{ minWidth: '170px' }}>
                          <span style={{ fontWeight: 600 }}>{h.fromSemester || 'Semester'}</span>{' '}
                          <span style={{ color: 'var(--text-muted)' }}>→</span>{' '}
                          <span className="text-success font-semibold">{h.toSemester || 'Next'}</span>
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
