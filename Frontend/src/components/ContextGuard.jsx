import React, { useState } from 'react'
import { FiHome, FiCalendar, FiCheckCircle, FiArrowRight } from 'react-icons/fi'
import { useAcademic } from '../context/AcademicContext'
import './ContextGuard.css'

export default function ContextGuard({ children }) {
  const {
    loading,
    colleges,
    academicYears,
    selectedCollegeId,
    selectedAcademicYearId,
    selectedCollege,
    selectedAcademicYear,
    applyAcademicContext,
  } = useAcademic()

  const [tempCollegeId, setTempCollegeId] = useState('')
  const [tempYearId, setTempYearId] = useState('')
  const [saving, setSaving] = useState(false)

  // Context is valid if both college and academic year are resolved
  const hasValidContext = Boolean(
    selectedCollegeId &&
    selectedAcademicYearId &&
    selectedCollege &&
    selectedAcademicYear
  )

  if (loading) {
    return (
      <div className="context-guard-loading">
        <div className="context-guard-spinner" />
        <p>Initializing Academic Context...</p>
      </div>
    )
  }

  if (hasValidContext) {
    return children
  }

  // If no valid context is available, show the setup experience
  const handleProceed = async (e) => {
    e.preventDefault()
    const targetColId = tempCollegeId || (colleges[0] ? String(colleges[0].id ?? colleges[0].collegeId) : '')
    const targetYearId = tempYearId || (academicYears[0] ? String(academicYears[0].id ?? academicYears[0].academicYearId) : '')

    if (!targetColId || !targetYearId) return

    setSaving(true)
    try {
      await applyAcademicContext(targetColId, targetYearId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="context-guard-overlay">
      <div className="context-guard-card">
        <div className="context-guard-header">
          <div className="context-guard-icon">
            <FiHome />
          </div>
          <div>
            <span className="context-guard-eyebrow">Welcome to Pirnav Digital Campus</span>
            <h2>Select Working Context</h2>
            <p>Choose your active College and Academic Year to configure your operational workspace.</p>
          </div>
        </div>

        <form onSubmit={handleProceed} className="context-guard-form">
          <label className="context-guard-field">
            <span>
              <FiHome aria-hidden="true" /> College / Institution
            </span>
            <select
              value={tempCollegeId || selectedCollegeId || (colleges[0] ? String(colleges[0].id ?? colleges[0].collegeId) : '')}
              onChange={(e) => setTempCollegeId(e.target.value)}
              required
            >
              {colleges.map((c) => {
                const id = String(c.id ?? c.collegeId)
                return (
                  <option key={id} value={id}>
                    {c.name || c.collegeName || 'College'}
                  </option>
                )
              })}
            </select>
          </label>

          <label className="context-guard-field">
            <span>
              <FiCalendar aria-hidden="true" /> Academic Year
            </span>
            <select
              value={tempYearId || selectedAcademicYearId || (academicYears[0] ? String(academicYears[0].id ?? academicYears[0].academicYearId) : '')}
              onChange={(e) => setTempYearId(e.target.value)}
              required
            >
              {academicYears.map((y) => {
                const id = String(y.id ?? y.academicYearId)
                return (
                  <option key={id} value={id}>
                    {y.academicYearName || y.name || 'Academic Year'} {y.isCurrent ? '(Current)' : ''}
                  </option>
                )
              })}
            </select>
          </label>

          <div className="context-guard-hint">
            <FiCheckCircle />
            <span>You can switch working context anytime from <strong>Settings &rarr; Global Academic Context</strong>.</span>
          </div>

          <button
            type="submit"
            className="context-guard-btn"
            disabled={saving || !colleges.length || !academicYears.length}
          >
            {saving ? 'Setting up workspace...' : 'Continue to Dashboard'} <FiArrowRight />
          </button>
        </form>
      </div>
    </div>
  )
}
