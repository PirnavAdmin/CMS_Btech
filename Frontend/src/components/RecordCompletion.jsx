import { FiPlayCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import './RecordCompletion.css'

export function CircularRingMeter({ percent = 0, size = 26, strokeWidth = 3 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0))
  const strokeDashoffset = circumference - (clamped / 100) * circumference
  const isComplete = clamped >= 100
  const strokeColor = isComplete 
    ? '#10b981' 
    : clamped >= 75 
      ? '#2563eb' 
      : clamped >= 50 
        ? '#f59e0b' 
        : '#ef4444'

  return (
    <div className="record-completion-ring" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="record-ring-bg" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="record-ring-fill"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="record-ring-text" style={{ color: isComplete ? '#059669' : '#1e293b' }}>
        {isComplete ? '✓' : `${clamped}%`}
      </span>
    </div>
  )
}

export function CompletionIndicator({ completion }) {
  if (completion?.percent == null) return <span title="Saved details unavailable">—</span>
  const pending = completion.sections?.filter(section => !section.complete).map(section => section.label) || []
  const title = pending.length ? `Pending: ${pending.join(', ')}` : 'All tracked information is complete'
  return (
    <span className="record-completion" title={title}>
      <CircularRingMeter percent={completion.percent} size={26} strokeWidth={3} />
      <span className="record-completion-percent-label">{completion.percent}%</span>
    </span>
  )
}

export const completionColumn = {
  key: 'completion', label: 'Completion', className: 'record-completion-cell',
  render: row => <CompletionIndicator completion={row.completion} />,
}

export function ResumeSetupAction({ completion, name, onClick, to, inDetails = false }) {
  if (!completion || completion.complete || completion.percent == null || (!onClick && !to)) return null
  const label = inDetails ? 'Continue setup' : 'Resume setup'
  const accessibleLabel = label + ' for ' + name
  const props = { className: inDetails ? 'record-completion-action' : 'table-action-btn record-completion-action', 'aria-label': accessibleLabel, title: accessibleLabel }
  const content = inDetails ? label : <FiPlayCircle aria-hidden="true" />
  return to ? <Link {...props} to={to}>{content}</Link> : <button {...props} type="button" onClick={onClick}>{content}</button>
}

export function CompletionSummary({ completion, name, onClick, to }) {
  if (completion?.percent == null) return null
  const percent = completion.percent
  const isComplete = percent >= 100
  return (
    <section className="record-completion-summary sa-summary-card" aria-label="Information completion">
      <div className="sa-summary-top-row">
        <div className="sa-summary-ring-group">
          <CircularRingMeter percent={percent} size={36} strokeWidth={3.5} />
          <div>
            <div className="sa-summary-title-line">
              <strong>Information Completion</strong>
              <span className={`sa-summary-badge ${isComplete ? 'is-complete' : 'is-progress'}`}>
                {isComplete ? '100% Complete' : `${percent}% Completed`}
              </span>
            </div>
            <p className="sa-summary-subtitle">
              {isComplete ? 'All required admission profile sections are completed.' : 'Review section details below to complete pending fields.'}
            </p>
          </div>
        </div>
        <ResumeSetupAction completion={completion} name={name} onClick={onClick} to={to} inDetails />
      </div>
      <details className="sa-summary-details">
        <summary>Show section breakdown</summary>
        <ul>
          {completion.sections?.map(section => (
            <li key={section.id}>
              <strong>{section.label}:</strong> {section.complete ? <span className="sa-sec-done">Complete ✓</span> : <span className="sa-sec-pending">Incomplete</span>}
              {!section.complete && section.missing?.length > 0 && (
                <span className="sa-sec-missing"> · Missing: {section.missing.map(item => item.label + (item.required ? ' (required)' : '')).join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

export function ProgressiveFormFooter({ canSkip, onSkip, onSaveLater, disabled }) {
  return <>
    {canSkip && <button type="button" className="ac-secondary" onClick={onSkip} disabled={disabled}>Skip</button>}
    <button type="button" className="ac-secondary" onClick={onSaveLater} disabled={disabled}>Save &amp; Continue Later</button>
  </>
}
