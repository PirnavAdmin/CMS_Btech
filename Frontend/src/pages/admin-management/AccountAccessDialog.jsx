import { useEffect, useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { MODULE_REGISTRY } from '../../config/moduleRegistry'
import { readAccountAccess, saveAccountAccess } from '../../services/clientOnboardingService'

const actions = ['View', 'Create', 'Edit', 'Delete', 'Export']
const enabled = value => value === true || value === 1
const modules = [...new Map(MODULE_REGISTRY.filter(row => row.permission?.module).map(row => [row.permission.module, { key: row.permission.module, label: row.label }])).values()]

export default function AccountAccessDialog({ user, canEdit, onClose, onSaved }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [verificationOnly, setVerificationOnly] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const acknowledged = useRef(false)
  const lock = useRef(false)
  useEffect(() => {
    let active = true
    readAccountAccess(user).then(saved => {
      if (!active) return
      const allModules = new Map(modules.map(row => [row.key, row]))
      saved.forEach(row => { if (!allModules.has(row.moduleKey)) allModules.set(row.moduleKey, { key: row.moduleKey, label: row.moduleKey }) })
      setRows([...allModules.values()].map(module => ({ moduleKey: module.key, label: module.label, override: saved.some(row => row.moduleKey === module.key), ...saved.find(row => row.moduleKey === module.key) })))
    }).catch(reason => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, attempt])
  const toggle = (key, action) => {
    if (!canEdit || saving || acknowledged.current) return
    setRows(current => current.map(row => {
      if (row.moduleKey !== key) return row
      const field = `can${action}`
      const next = { ...row, [field]: !enabled(row[field]) }
      if (action !== 'View' && next[field]) next.canView = true
      if (action === 'View' && !next.canView) actions.forEach(name => { next[`can${name}`] = false })
      return next
    }))
  }
  const save = async () => {
    if (!canEdit || lock.current || !rows) return
    lock.current = true; setSaving(true); setError('')
    try {
      const permissions = rows.filter(row => row.override).map(row => Object.fromEntries([['moduleKey', row.moduleKey], ...actions.map(action => [`can${action}`, enabled(row[`can${action}`])])]))
      await saveAccountAccess(user, permissions, acknowledged)
      onSaved('Account module permissions verified by the server.')
      onClose()
    } catch (reason) { setVerificationOnly(acknowledged.current); setError(reason.message) }
    finally { lock.current = false; setSaving(false) }
  }
  return (
    <ViewDialog title="Account module access" subtitle={user.fullName + ' · ' + (user.collegeName || user.collegeId)} onClose={onClose} busy={saving} showExport={false} hideFooter maxWidth="920px">
      {loading && <p role="status">Loading account access…</p>}
      {error && <p role="alert">
        {error}
        {!rows && <button type="button" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Retry access</button>}
      </p>}
      {rows && <>
        <p>Enable an override to configure explicit account grants for a module. Modules without an override inherit their role permissions.</p>
        <div className="user-directory__table-wrap account-access-matrix">
          <table className="erp-table account-access-table">
            <thead><tr><th>Module</th><th>Override role defaults</th>{actions.map(action => <th key={action}>{action}</th>)}</tr></thead>
            <tbody>{rows.map(row => (
              <tr key={row.moduleKey}>
                <td>{row.label}</td>
                <td>
                  <input aria-label={row.label + ' override'} type="checkbox" checked={row.override} disabled={!canEdit || saving || verificationOnly}
                    onChange={event => setRows(current => current.map(item => item.moduleKey === row.moduleKey ? { ...item, override: event.target.checked } : item))} />
                </td>
                {actions.map(action => (
                  <td key={action}>
                    <input aria-label={row.label + ' ' + action} type="checkbox" checked={enabled(row['can' + action])}
                      disabled={!row.override || !canEdit || saving || verificationOnly} onChange={() => toggle(row.moduleKey, action)} />
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="user-directory__header-actions">
          <button type="button" className="user-directory__button" disabled={saving} onClick={onClose}>Close</button>
          {canEdit && <button type="button" className="user-directory__button user-directory__button--primary" disabled={saving} onClick={save}>
            {verificationOnly ? 'Retry verification' : 'Save module access'}
          </button>}
        </div>
      </>}
    </ViewDialog>
  )
}
