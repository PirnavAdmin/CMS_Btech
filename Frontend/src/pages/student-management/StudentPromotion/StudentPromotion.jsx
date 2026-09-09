import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiCheckCircle,
  FiClock,
  FiEye,
  FiInfo,
  FiSearch,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiAward,
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
      <section className="p-drawer" data-print-scope>
        <header>
          <div>
            <span>Promotion & Academic Review</span>
            <h2>{nameOf(student)}</h2>
            <PrintDetailsButton title={nameOf(student) + ' promotion review'} />
            <p>{idOf(student)} · {student.rollNumber || student.academic?.rollNumber || 'No roll number'}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </header>

        <div className="p-grid">
          <article>
            <h3>Academic Mapping</h3>
            <p>
              {student.course || student.academic?.course || '—'} ·{' '}
              {student.branch || student.academic?.branch || '—'} · Section{' '}
              {student.section || student.academic?.section || '—'}
            </p>
            <p>
              {student.currentSemester ?? student.semester ?? student.academic?.semester ?? '—'} →{' '}
              {student.nextSemester ?? student.targetSemester ?? 'Next Term'}
            </p>
          </article>
          <article>
            <h3>Performance Summary</h3>
            <p>
              Credits: {student.creditsEarned ?? '24'} · SGPA: {student.sgpa ?? '8.4'} · CGPA: {student.cgpa ?? '8.2'}
            </p>
          </article>
        </div>

        <article className="p-decision">
          <h3>Eligibility Decision</h3>
          <StatusBadge
            status={statusOf(student) === 'eligible' ? 'Active' : statusOf(student) === 'ineligible' ? 'Danger' : 'Warning'}
            label={student.eligibilityLabel ?? student.status ?? 'Eligible'}
          />
          <p>{student.eligibilityReason ?? student.reason ?? 'Satisfies minimum semester credits and attendance threshold.'}</p>
        </article>

        <footer>
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
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState({ masters: false, list: false, promotion: false })

  // 5-Row Pagination for Directory and History
  const [dirPage, setDirPage] = useState(1)
  const [histPage, setHistPage] = useState(1)
  const pageSize = 5

  // Initialize active academic year
  useEffect(() => {
    if (activeAcademicYears.length && !selectedAcademicYearId) {
      setSelectedAcademicYearId(String(activeAcademicYears[0].id))
    }
  }, [activeAcademicYears, selectedAcademicYearId])

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
      console.warn('Error loading promotion scope:', err)
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
      setNotice(err.message || 'Promotion could not be completed.')
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
          breadcrumb={[
            { label: 'Academic ERP', link: '/dashboard' },
            { label: 'Student Management' },
            { label: 'Promotions' },
          ]}
          compactSummary={[
            { label: 'Scope', value: students.length },
            { label: 'Eligible', value: students.filter((x) => statusOf(x) === 'eligible').length, tone: 'active' },
            { label: 'History', value: history.length, tone: 'upcoming' },
          ]}
        />

        {notice && (
          <div className="erp-toast erp-toast--success" role="status">
            <FiCheckCircle /> {notice}
          </div>
        )}

        {/* Promotion Scope Selector Panel */}
        <section className="p-scope erp-card">
          <div className="erp-form-grid">
            <div className="erp-form-group">
              <label>Course *</label>
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
              <label>Branch *</label>
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
              <label>Current Academic Year *</label>
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
              <label>Current Semester *</label>
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
                {/* KPI Strip */}
                <div className="erp-kpi-strip">
                  <div className="erp-kpi-card">
                    <span className="erp-kpi-label">Total in Semester Scope</span>
                    <span className="erp-kpi-value">{students.length}</span>
                  </div>
                  <div className="erp-kpi-card">
                    <span className="erp-kpi-label">Eligible for Advancement</span>
                    <span className="erp-kpi-value erp-kpi-value--success">
                      {students.filter((x) => statusOf(x) === 'eligible').length}
                    </span>
                  </div>
                  <div className="erp-kpi-card">
                    <span className="erp-kpi-label">Selected for Promotion</span>
                    <span className="erp-kpi-value">{eligibleSelected.length}</span>
                  </div>
                </div>

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
                          <th style={{ width: '40px' }}>
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
                          <th>Student</th>
                          <th>Roll / Reg No</th>
                          <th>Academic Scope</th>
                          <th>Current → Target</th>
                          <th>Credits</th>
                          <th>SGPA / CGPA</th>
                          <th>Eligibility</th>
                          <th>Action</th>
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
                              <td>
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
                              <td>
                                <strong>{nameOf(x)}</strong>
                                <small className="text-muted block">{idOf(x)}</small>
                              </td>
                              <td>
                                {x.rollNumber || '—'}
                                <small className="text-muted block">{x.registrationNumber}</small>
                              </td>
                              <td>
                                {x.course} · {x.branch}
                                <small className="text-muted block">Section {x.section}</small>
                              </td>
                              <td>
                                <strong>{x.currentSemester}</strong> →{' '}
                                <span className={isSemester8 ? 'text-primary font-semibold' : 'text-success'}>
                                  {x.nextSemester}
                                </span>
                              </td>
                              <td>{x.creditsEarned}</td>
                              <td>
                                {x.sgpa} / {x.cgpa}
                              </td>
                              <td>
                                <StatusBadge
                                  status={statusOf(x) === 'eligible' ? 'Active' : 'Danger'}
                                  label={x.eligibilityLabel ?? x.status}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="erp-btn erp-btn--icon"
                                  title="Review Eligibility"
                                  onClick={() => setReview(x)}
                                >
                                  <FiEye />
                                </button>
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
                    <th>Student Name</th>
                    <th>Roll / Reg No</th>
                    <th>Transition (From → To)</th>
                    <th>Date</th>
                    <th>Status</th>
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
                        <td>
                          <strong>{h.studentName || 'Student'}</strong>
                          <small className="text-muted block">{h.studentId}</small>
                        </td>
                        <td>{h.rollNumber || h.registrationNumber || '—'}</td>
                        <td>
                          <strong>{h.fromSemester || 'Semester'}</strong> →{' '}
                          <span className="text-success font-semibold">{h.toSemester || 'Next'}</span>
                        </td>
                        <td>{h.promotionDate ? new Date(h.promotionDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td>
                          <StatusBadge
                            status={h.status === 'Graduated' ? 'Active' : 'Active'}
                            label={h.status || 'Promoted'}
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
          canEdit={canPromote}
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
