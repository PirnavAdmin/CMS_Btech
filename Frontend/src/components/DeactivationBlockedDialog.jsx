import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import './DeactivationBlockedDialog.css'

export const showDeactivationBlocked = (message, details = {}) => {
  const payload = typeof message === 'object' && message !== null
    ? message
    : { message, ...details }
  window.dispatchEvent(new CustomEvent('btech:deactivation-blocked', { detail: payload }))
}

export default function DeactivationBlockedDialog() {
  const [details, setDetails] = useState(null)

  useEffect(() => {
    const open = event => setDetails({
      message: event.detail?.message || 'This item cannot be deactivated while records are associated with it.',
      count: event.detail?.count,
      facultyCount: event.detail?.facultyCount,
      studentCount: event.detail?.studentCount,
      branchCount: event.detail?.branchCount,
      sectionCount: event.detail?.sectionCount,
      courseCount: event.detail?.courseCount,
      name: event.detail?.name,
      entity: event.detail?.entity,
      reason: event.detail?.reason,
    })
    window.addEventListener('btech:deactivation-blocked', open)
    return () => window.removeEventListener('btech:deactivation-blocked', open)
  }, [])

  if (!details) return null
  const { message, facultyCount, studentCount, branchCount, sectionCount, courseCount } = details
  const parsedCount = Number(message.match(/(\d+)\s+students?\b/i)?.[1])
  const count = Number.isFinite(Number(details.count)) ? Number(details.count) : Number.isFinite(parsedCount) ? parsedCount : undefined
  const name = details.name || message.match(/cannot deactivate\s+(.+?)\./i)?.[1] || 'This item'
  const entity = details.entity || message.match(/this\s+(college|department|course|branch|academic year|semester|section)/i)?.[1] || 'item'
  const entityLabel = entity.replace(/\b\w/g, letter => letter.toUpperCase())
  const close = () => setDetails(null)

  const statItems = [
    Number(branchCount) > 0 && { label: 'Active Branches', count: branchCount, unit: branchCount === 1 ? 'branch' : 'branches' },
    Number(studentCount) > 0 && { label: 'Enrolled Students', count: studentCount, unit: studentCount === 1 ? 'student' : 'students' },
    Number(facultyCount) > 0 && { label: 'Assigned Faculty', count: facultyCount, unit: facultyCount === 1 ? 'member' : 'members' },
    Number(sectionCount) > 0 && { label: 'Active Sections', count: sectionCount, unit: sectionCount === 1 ? 'section' : 'sections' },
    Number(courseCount) > 0 && { label: 'Associated Courses', count: courseCount, unit: courseCount === 1 ? 'course' : 'courses' },
  ].filter(Boolean)

  const hasSpecificCounts = statItems.length > 0

  let summaryText = `has associated records.`
  if (statItems.length > 0) {
    summaryText = `has ${statItems.map(s => `${s.count} ${s.unit}`).join(', ')}.`
  }

  let helpText = `Deactivate is unavailable until all associated records are moved or reassigned from this ${entity}.`

  return <div className="deactivation-blocked-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="deactivation-blocked-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivation-blocked-title">
      <button type="button" className="deactivation-blocked-close" aria-label="Close dialog" onClick={close}><FiX /></button>
      <span className="deactivation-blocked-icon"><FiAlertTriangle /></span>
      <h2 id="deactivation-blocked-title">{entityLabel} cannot be deactivated</h2>
      <p><strong>{name}</strong> {summaryText}</p>

      {hasSpecificCounts ? (
        <div className="deactivation-blocked-stats-grid" style={{ display: 'grid', gridTemplateColumns: statItems.length > 1 ? 'repeat(auto-fit, minmax(130px, 1fr))' : '1fr', gap: '12px', margin: '0 0 16px' }}>
          {statItems.map((item, index) => (
            <dl key={index} className="deactivation-blocked-count" style={{ margin: 0, padding: '12px 14px', background: 'var(--surface-soft, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border, #e2e8f0)', textAlign: 'center' }}>
              <dt style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</dt>
              <dd style={{ margin: '4px 0 0', color: 'var(--text-primary, #0f172a)', fontSize: '18px', fontWeight: 800 }}>{item.count} {item.unit}</dd>
            </dl>
          ))}
        </div>
      ) : (
        <dl className="deactivation-blocked-count"><div><dt>Associated Records</dt><dd>{count === undefined ? 'Associated records' : `${count} ${count === 1 ? 'record' : 'records'}`}</dd></div></dl>
      )}

      <p className="deactivation-blocked-help">{helpText}</p>
      <button type="button" className="deactivation-blocked-button" onClick={close}>Close</button>
    </section>
  </div>
}
