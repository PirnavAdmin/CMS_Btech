import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCalendar, FiSliders, FiArrowRight } from 'react-icons/fi'
import { calculateAcademicYearProgress } from '../utils/headerAcademicYear'
import { useAcademic } from '../context/AcademicContext'
import './HeaderAcademicYear.css'

export default function HeaderAcademicYear() {
  const {
    selectedAcademicYear,
    currentAcademicYear,
    academicYears = [],
    selectedCollege,
    isHistoricalYear,
    loading,
  } = useAcademic()

  const [now, setNow] = useState(() => new Date())
  const root = useRef(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setNow(new Date())
    }, 60000)

    const close = (event) => {
      if (root.current && !root.current.contains(event.target)) {
        root.current.open = false
      }
    }

    document.addEventListener('pointerdown', close)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('pointerdown', close)
    }
  }, [])

  const year = selectedAcademicYear || currentAcademicYear || academicYears[0] || null
  const label = year ? (year.academicYearName || year.name || 'Unnamed academic year') : (loading ? 'Loading...' : 'Not Configured')
  const progress = year ? calculateAcademicYearProgress(year.startDate, year.endDate, now) : null
  const shortLabel = label.replace(/(\d{4})\s*[-–]\s*\d{2}(\d{2})/, '$1–$2')
  const dateLabel = (value) => (value ? String(value).slice(0, 10) : '—')

  return (
    <details
      className={`header-academic-year ${isHistoricalYear ? 'is-historical' : ''}`}
      ref={root}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          root.current.open = false
          root.current.querySelector('summary')?.focus()
        }
      }}
    >
      <summary aria-label={`Active Academic Year: ${label}${progress === null ? '' : `, ${progress}%`}`}>
        <FiCalendar aria-hidden="true" />
        <div className="header-academic-year__content">
          <div className="header-academic-year__heading">
            <small>{isHistoricalYear ? 'Working Context' : 'Active Academic Year'}</small>
            <strong className="header-academic-year__full">{label}</strong>
            <strong className="header-academic-year__short">{shortLabel}</strong>
          </div>
          {progress !== null && (
            <div className="header-academic-year__progress">
              <span role="progressbar" aria-label="Academic Year Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <i style={{ width: `${progress}%` }} />
              </span>
              <b>{progress}%</b>
            </div>
          )}
        </div>
      </summary>

      <div className="header-academic-year__details">
        <div className="header-academic-year__pop-header">
          <strong>Global Academic Context</strong>
          <small>Configured via Settings</small>
        </div>

        {year ? (
          <dl>
            <dt>College</dt>
            <dd>{selectedCollege?.name || selectedCollege?.collegeName || 'Default Institution'}</dd>
            <dt>Academic Year</dt>
            <dd>{label}</dd>
            <dt>Status</dt>
            <dd>{isHistoricalYear ? 'Historical (Archive)' : 'Active'}</dd>
            <dt>Start Date</dt>
            <dd>{dateLabel(year.startDate)}</dd>
            <dt>End Date</dt>
            <dd>{dateLabel(year.endDate)}</dd>
            <dt>Cycle Progress</dt>
            <dd>{progress === null ? 'Unavailable — check year dates' : `${progress}%`}</dd>
          </dl>
        ) : (
          <p>{loading ? 'Loading academic year context...' : 'No academic year configured. Configure in Settings.'}</p>
        )}

        <div className="header-academic-year__footer">
          <Link
            to="/settings?tab=context"
            onClick={() => {
              if (root.current) root.current.open = false
            }}
          >
            <FiSliders aria-hidden="true" /> Change Context in Settings <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </details>
  )
}
