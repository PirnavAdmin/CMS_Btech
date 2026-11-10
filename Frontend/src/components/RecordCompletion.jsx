import { FiPlayCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import './RecordCompletion.css'

export function CompletionIndicator({ completion }) {
  if (completion?.percent == null) return <span title="Saved details unavailable">—</span>
  const pending = completion.sections.filter(section => !section.complete).map(section => section.label)
  const title = pending.length ? `Pending: ${pending.join(', ')}` : 'All tracked information is complete'
  return <span className="record-completion" title={title}>
    <progress value={completion.percent} max={100} aria-label="Information completion" aria-valuetext={`${completion.percent}%. ${title}`} />
    <span>{completion.percent}%</span>
  </span>
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
  return <section className="record-completion-summary" aria-label="Information completion">
    <div><strong>Information completion</strong><CompletionIndicator completion={completion} />
      <ResumeSetupAction completion={completion} name={name} onClick={onClick} to={to} inDetails />
    </div>
    <details>
      <summary>Show section details</summary>
      <ul>{completion.sections.map(section => <li key={section.id}>
        <strong>{section.label}</strong> {section.complete ? 'Complete' : 'Incomplete'}
        {!section.complete && <span> · Missing: {section.missing.map(item => item.label + (item.required ? ' (required)' : '')).join(', ')}</span>}
      </li>)}</ul>
    </details>
  </section>
}

export function ProgressiveFormFooter({ canSkip, onSkip, onSaveLater, disabled }) {
  return <>
    {canSkip && <button type="button" className="ac-secondary" onClick={onSkip} disabled={disabled}>Skip</button>}
    <button type="button" className="ac-secondary" onClick={onSaveLater} disabled={disabled}>Save &amp; Continue Later</button>
  </>
}
