import { useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { feeConfigurationApi } from '../../api/apiEndpoints'

export default function FeeTypeCreateDialog({ rows = [], onClose, onSaved }) {
  const { canAction } = useScreenAccess()
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  return <ViewDialog title="Add Fee Type" subtitle="Create a fee category for fee structures." maxWidth="620px" showExport={false} busy={saving} onClose={onClose}
    footerContent={<><button type="button" className="erp-btn erp-btn--secondary" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" form="add-fee-type-form" className="erp-btn erp-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save Fee Type'}</button></>}>
    <form id="add-fee-type-form" onSubmit={async event => {
      event.preventDefault()
      if (lock.current || !canAction('/fees/types', 'create')) return
      const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim() || null }
      if (!payload.code || !payload.name) { setError('Enter the fee type code and name.'); return }
      if (rows.some(row => String(row.code).trim().toUpperCase() === payload.code)) { setError('This fee type code already exists.'); return }
      lock.current = true; setSaving(true); setError('')
      try {
        const saved = await feeConfigurationApi.createCategory(payload)
        await onSaved(saved)
      } catch (reason) { setError(reason.message || 'Unable to save fee type. Your entries are retained.') }
      finally { lock.current = false; setSaving(false) }
    }}>
      {error && <p role="alert">{error}</p>}
      <div className="fm-form-grid">
        <label className="fs-field">Fee Type Code<input required maxLength={50} value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} disabled={saving} /></label>
        <label className="fs-field">Fee Type Name<input required maxLength={150} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} disabled={saving} /></label>
        <label className="fs-field">Description<textarea rows={3} maxLength={500} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} disabled={saving} /></label>
      </div>
    </form>
  </ViewDialog>
}
