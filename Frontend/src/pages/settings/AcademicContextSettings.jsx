import { useState, useEffect, useMemo } from 'react'
import { FiHome, FiCalendar, FiCheck, FiSliders, FiInfo, FiArrowRight, FiShield, FiAlertCircle } from 'react-icons/fi'
import { useAcademic } from '../../context/AcademicContext'
import SearchableSelect from '../../components/SearchableSelect'
import StatusBadge from '../../components/StatusBadge'
import { showSuccess, showError, showWarning } from '../../utils/toast'
import './AcademicContextSettings.css'

export default function AcademicContextSettings() {
  const {
    colleges = [],
    academicYears = [],
    selectedCollegeId,
    selectedCollege,
    selectedAcademicYearId,
    selectedAcademicYear,
    applyAcademicContext,
    loading,
    refreshHierarchy,
  } = useAcademic()

  const [draftCollegeId, setDraftCollegeId] = useState('')
  const [draftAcademicYearId, setDraftAcademicYearId] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  // Initialize draft selections from current global context
  useEffect(() => {
    if (selectedCollegeId) {
      setDraftCollegeId(String(selectedCollegeId))
    } else if (colleges.length > 0) {
      const defaultCol = colleges.find(c => c.status === 'Active' || c.isActive) || colleges[0]
      if (defaultCol) {
        setDraftCollegeId(String(defaultCol.id ?? defaultCol.collegeId))
      }
    }

    if (selectedAcademicYearId) {
      setDraftAcademicYearId(String(selectedAcademicYearId))
    } else if (academicYears.length > 0) {
      const defaultYr = academicYears.find(y => y.isCurrent || y.status === 'Active' || y.isActive) || academicYears[0]
      if (defaultYr) {
        setDraftAcademicYearId(String(defaultYr.id ?? defaultYr.academicYearId))
      }
    }
  }, [selectedCollegeId, selectedAcademicYearId, colleges, academicYears])

  // Resolve draft objects for preview
  const draftCollege = useMemo(() => {
    return colleges.find(c => String(c.id ?? c.collegeId) === String(draftCollegeId)) || colleges[0] || null
  }, [colleges, draftCollegeId])

  const draftAcademicYear = useMemo(() => {
    return academicYears.find(y => String(y.id ?? y.academicYearId) === String(draftAcademicYearId)) || academicYears[0] || null
  }, [academicYears, draftAcademicYearId])

  const hasChanges = (
    String(draftCollegeId) !== String(selectedCollegeId) ||
    String(draftAcademicYearId) !== String(selectedAcademicYearId)
  )

  const handleApply = async (e) => {
    e.preventDefault()

    const colToApply = draftCollegeId || (colleges[0] ? String(colleges[0].id ?? colleges[0].collegeId) : '')
    const yearToApply = draftAcademicYearId || (academicYears[0] ? String(academicYears[0].id ?? academicYears[0].academicYearId) : '')

    if (!colToApply) {
      showWarning('Please select a College to establish the academic context.')
      return
    }

    if (!yearToApply) {
      showWarning('Please select an Academic Year to establish the academic context.')
      return
    }

    setIsApplying(true)
    try {
      const result = await applyAcademicContext(colToApply, yearToApply)
      if (result?.success) {
        showSuccess('Academic context updated successfully')
      }
    } catch (err) {
      showError(err.message || 'Failed to update academic context. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  const collegeOptions = useMemo(() => {
    return colleges.map(c => ({
      id: String(c.id ?? c.collegeId),
      value: String(c.id ?? c.collegeId),
      name: c.name || c.collegeName || 'Unnamed College',
      code: c.code || c.collegeCode || '',
    })).filter(opt => opt.name && opt.name !== 'Unnamed College')
  }, [colleges])

  const academicYearOptions = useMemo(() => {
    return academicYears.map(y => {
      const yearName = y.name || y.academicYearName || 'Unnamed Year'
      const start = y.startDate ? String(y.startDate).slice(0, 10) : ''
      const end = y.endDate ? String(y.endDate).slice(0, 10) : ''
      const dates = start && end ? `(${start} – ${end})` : ''
      return {
        id: String(y.id ?? y.academicYearId),
        value: String(y.id ?? y.academicYearId),
        name: `${yearName} ${dates}`.trim(),
        code: y.isCurrent ? 'Active' : (y.status || 'Archived'),
      }
    })
  }, [academicYears])

  return (
    <div className="academic-context-settings">
      <form className="acs-form" onSubmit={handleApply} noValidate>
        <div className="acs-card">
          <div className="acs-card-header">
            <h3>Select College & Academic Year</h3>
            <span className="acs-badge">Global Setting</span>
          </div>

          <div className="acs-fields-grid">
            <div className="acs-field-group">
              <label className="acs-label">
                <FiHome aria-hidden="true" />
                <span>College / Institution <b className="acs-req">*</b></span>
              </label>
              <SearchableSelect
                label="College"
                value={draftCollegeId}
                options={collegeOptions}
                onChange={(val) => setDraftCollegeId(val)}
                placeholder="Select College"
                searchPlaceholder="Search college name or code..."
                disabled={loading || isApplying}
              />
              <small className="acs-hint">
                Choose the college institution to work on.
              </small>
            </div>

            <div className="acs-field-group">
              <label className="acs-label">
                <FiCalendar aria-hidden="true" />
                <span>Academic Year <b className="acs-req">*</b></span>
              </label>
              <SearchableSelect
                label="Academic Year"
                value={draftAcademicYearId}
                options={academicYearOptions}
                onChange={(val) => setDraftAcademicYearId(val)}
                placeholder="Select Academic Year"
                searchPlaceholder="Search academic year..."
                disabled={loading || isApplying}
              />
              <small className="acs-hint">
                Choose the academic year to load records and curriculum.
              </small>
            </div>
          </div>

          {/* Context Preview Box */}
          <div className="acs-preview-box">
            <div className="acs-preview-heading">
              <FiInfo aria-hidden="true" />
              <span>Selection Preview</span>
            </div>
            <div className="acs-preview-content">
              <div className="acs-preview-entity">
                <small>College</small>
                <strong>{draftCollege?.name || draftCollege?.collegeName || 'No College Selected'}</strong>
                {draftCollege?.code && <span className="acs-tag">{draftCollege.code}</span>}
              </div>
              <div className="acs-preview-divider">•</div>
              <div className="acs-preview-entity">
                <small>Academic Year</small>
                <strong>{draftAcademicYear?.name || draftAcademicYear?.academicYearName || 'No Year Selected'}</strong>
                {draftAcademicYear?.status && <StatusBadge value={draftAcademicYear.status} />}
              </div>
            </div>
          </div>

          <div className="acs-actions">
            <button
              type="submit"
              className="acs-apply-btn"
              disabled={loading || isApplying || (!hasChanges && selectedCollegeId && selectedAcademicYearId)}
            >
              {isApplying ? 'Applying Context...' : 'Apply Context'}
            </button>
            {!hasChanges && selectedCollegeId && selectedAcademicYearId && (
              <span className="acs-applied-note">
                <FiCheck aria-hidden="true" /> Context is currently active across ERP
              </span>
            )}
          </div>
        </div>

        {/* Current Active Context Summary */}
        <div className="acs-active-summary-card">
          <div className="acs-summary-header">
            <h4>Current Active Context</h4>
            <span className="acs-active-indicator">Active</span>
          </div>
          <dl className="acs-summary-dl">
            <div>
              <dt>College</dt>
              <dd>{selectedCollege?.name || selectedCollege?.collegeName || 'Not Set'}</dd>
            </div>
            <div>
              <dt>College Code</dt>
              <dd>{selectedCollege?.code || selectedCollege?.collegeCode || '—'}</dd>
            </div>
            <div>
              <dt>Academic Year</dt>
              <dd>{selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || 'Not Set'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{selectedAcademicYear?.status || 'Active'}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>
                {selectedAcademicYear?.startDate && selectedAcademicYear?.endDate
                  ? `${String(selectedAcademicYear.startDate).slice(0, 10)} to ${String(selectedAcademicYear.endDate).slice(0, 10)}`
                  : 'Full Academic Year'}
              </dd>
            </div>
          </dl>
        </div>
      </form>
    </div>
  )
}
