import { useEffect, useRef, useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { academicYearApi } from '../api/apiEndpoints'
import { calculateAcademicYearProgress, selectHeaderAcademicYear } from '../utils/headerAcademicYear'
import eventBus, { ERP_EVENTS } from '../services/eventBus'
import './HeaderAcademicYear.css'

export default function HeaderAcademicYear() {
  const [result, setResult] = useState({ state: 'loading', year: null })
  const [now, setNow] = useState(() => new Date())
  const root = useRef(null)
  useEffect(() => {
    let disposed = false, request = 0
    const refresh = async () => {
      const currentRequest = ++request
      setNow(new Date())
      try {
        const next = selectHeaderAcademicYear(await academicYearApi.getAll())
        if (!disposed && currentRequest === request) setResult(next)
      } catch {
        if (!disposed && currentRequest === request) setResult({ state: 'error', year: null })
      }
    }
    refresh()
    const unsubscribe = eventBus.subscribe(ERP_EVENTS.ACADEMIC_UPDATED, refresh)
    const timer = window.setInterval(() => { if (!document.hidden) refresh() }, 60000)
    window.addEventListener('focus', refresh)
    const close = event => { if (root.current && !root.current.contains(event.target)) root.current.open = false }
    document.addEventListener('pointerdown', close)
    return () => {
      disposed = true
      unsubscribe()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('pointerdown', close)
    }
  }, [])
  const { year, state } = result
  const label = year ? (year.academicYearName || year.name || 'Unnamed academic year') : ({ loading: 'Loading...', empty: 'Not Configured', conflict: 'Configuration issue', error: 'Unavailable' })[state]
  const progress = year ? calculateAcademicYearProgress(year.startDate, year.endDate, now) : null
  const shortLabel = label.replace(/(\d{4})\s*[-–]\s*\d{2}(\d{2})/, '$1–$2')
  const dateLabel = value => value ? String(value).slice(0, 10) : 'Unavailable'
  return <details className="header-academic-year" ref={root} onKeyDown={event => {
    if (event.key === 'Escape') { root.current.open = false; root.current.querySelector('summary')?.focus() }
  }}>
    <summary aria-label={`Active Academic Year: ${label}${progress === null ? '' : `, ${progress}%`} `}>
      <FiCalendar aria-hidden="true" />
      <div className="header-academic-year__content">
        <div className="header-academic-year__heading"><small>Active Academic Year</small><strong className="header-academic-year__full">{label}</strong><strong className="header-academic-year__short">{shortLabel}</strong></div>
        {progress !== null && <div className="header-academic-year__progress"><span role="progressbar" aria-label="Academic Year Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></span><b>{progress}%</b></div>}
      </div>
    </summary>
    <div className="header-academic-year__details">
      <strong>Active Academic Year</strong>
      {year ? <dl><dt>Academic Year</dt><dd>{label}</dd><dt>Status</dt><dd>Active</dd><dt>Start</dt><dd>{dateLabel(year.startDate)}</dd><dt>End</dt><dd>{dateLabel(year.endDate)}</dd><dt>Academic Year Progress</dt><dd>{progress === null ? 'Unavailable — check year dates' : `${progress}%`}</dd></dl> : <p>{state === 'conflict' ? 'Multiple active academic years found. Review Academic Year Management.' : state === 'error' ? 'Unable to load academic year. Retrying automatically.' : label}</p>}
    </div>
  </details>
}
