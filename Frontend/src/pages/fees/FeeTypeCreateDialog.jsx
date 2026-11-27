import { useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { feeConfigurationApi } from '../../api/apiEndpoints'

export const STANDARD_FEE_TYPES = [
  { name: 'Tuition Fee', code: 'TF' },
  { name: 'Admission Fee', code: 'ADM' },
  { name: 'Examination Fee', code: 'EXAM' },
  { name: 'Library Fee', code: 'LIB' },
  { name: 'Laboratory Fee', code: 'LAB' },
  { name: 'Hostel Fee', code: 'HOSTEL' },
  { name: 'Transport Fee', code: 'TRF' },
  { name: 'Mess Fee', code: 'MESS' },
  { name: 'Caution Deposit', code: 'CD' },
  { name: 'ID Card Fee', code: 'IDC' },
  { name: 'Placement Fee', code: 'PLACE' },
  { name: 'Sports Fee', code: 'SPORTS' },
  { name: 'Registration Fee', code: 'REG' },
  { name: 'Development Fee', code: 'DEV' },
  { name: 'Other', code: '' }
]

export const slugifyCode = (text) => {
  if (!text) return ''
  return String(text)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

export const generateUniqueCode = (baseCode, existingRows = [], excludeId = null) => {
  if (!baseCode) return ''
  let candidate = baseCode.toUpperCase()
  const existingCodes = new Set(
    existingRows
      .filter(r => String(r.id) !== String(excludeId))
      .map(r => String(r.code || '').trim().toUpperCase())
  )

  if (!existingCodes.has(candidate)) return candidate

  let suffix = 1
  while (existingCodes.has(`${candidate}_${suffix}`)) {
    suffix++
  }
  return `${candidate}_${suffix}`
}

export default function FeeTypeCreateDialog({ rows = [], initialRecord, onClose, onSaved }) {
  const { canAction } = useScreenAccess()
  const editing = initialRecord?.id != null

  const initialIsStandard = STANDARD_FEE_TYPES.some(
    item => item.name !== 'Other' && item.name.toLowerCase() === (initialRecord?.name || '').trim().toLowerCase()
  )

  const [selectedDropdown, setSelectedDropdown] = useState(() => {
    if (!initialRecord?.name) return 'Tuition Fee'
    return initialIsStandard ? initialRecord.name : 'Other'
  })

  const [customName, setCustomName] = useState(() => {
    return (!initialIsStandard && initialRecord?.name) ? initialRecord.name : ''
  })

  const [code, setCode] = useState(() => {
    if (initialRecord?.code) return initialRecord.code
    const base = STANDARD_FEE_TYPES.find(item => item.name === 'Tuition Fee')?.code || 'TF'
    return generateUniqueCode(base, rows)
  })

  const [description, setDescription] = useState(initialRecord?.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  // When dropdown selection changes, auto-generate corresponding code
  const handleDropdownChange = (event) => {
    const nextVal = event.target.value
    setSelectedDropdown(nextVal)

    if (editing) return // Preserve existing code when editing

    if (nextVal === 'Other') {
      const gen = customName.trim() ? generateUniqueCode(slugifyCode(customName), rows) : ''
      setCode(gen)
    } else {
      const match = STANDARD_FEE_TYPES.find(item => item.name === nextVal)
      const gen = match ? generateUniqueCode(match.code, rows) : ''
      setCode(gen)
    }
  }

  // When custom name is typed for 'Other', auto-generate code
  const handleCustomNameChange = (event) => {
    const nextCustom = event.target.value
    setCustomName(nextCustom)

    if (!editing) {
      const gen = nextCustom.trim() ? generateUniqueCode(slugifyCode(nextCustom), rows) : ''
      setCode(gen)
    }
  }

  const effectiveName = selectedDropdown === 'Other' ? customName.trim() : selectedDropdown

  return (
    <ViewDialog
      className="fm-fee-type-dialog"
      title={editing ? 'Edit Fee Type' : 'Add Fee Type'}
      subtitle={editing ? 'Update fee type details.' : 'Configure a new fee type for fee structures.'}
      maxWidth="620px"
      showExport={false}
      busy={saving}
      onClose={onClose}
      footerContent={
        <>
          <button type="button" className="erp-btn erp-btn--secondary" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="add-fee-type-form" className="erp-btn erp-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Fee Type'}
          </button>
        </>
      }
    >
      <form
        id="add-fee-type-form"
        onSubmit={async (event) => {
          event.preventDefault()
          if (lock.current || !canAction('/fees/types', editing ? 'edit' : 'create')) return

          const finalName = effectiveName
          const finalCode = (code.trim() || generateUniqueCode(slugifyCode(finalName), rows, initialRecord?.id)).toUpperCase()

          if (!finalName) {
            setError(selectedDropdown === 'Other' ? 'Enter the custom fee type name.' : 'Select a fee type name.')
            return
          }
          if (!finalCode) {
            setError('Fee type code could not be generated. Please select or enter a fee name.')
            return
          }

          // Duplicate name check within same college
          if (rows.some(row => String(row.id) !== String(initialRecord?.id) && String(row.name).trim().toLowerCase() === finalName.toLowerCase())) {
            setError('A fee type with this name already exists.')
            return
          }

          // Duplicate code check
          if (!editing && rows.some(row => String(row.id) !== String(initialRecord?.id) && String(row.code).trim().toUpperCase() === finalCode)) {
            setError('This fee type code already exists.')
            return
          }

          const payload = {
            code: finalCode,
            name: finalName,
            description: description.trim() || null,
            status: 1
          }

          lock.current = true
          setSaving(true)
          setError('')
          try {
            const saved = editing
              ? await feeConfigurationApi.updateCategory(initialRecord.id, payload)
              : await feeConfigurationApi.createCategory(payload)
            await onSaved(saved)
          } catch (reason) {
            setError(reason.message || 'Unable to save fee type. Your entries are retained.')
          } finally {
            lock.current = false
            setSaving(false)
          }
        }}
      >
        {error && <p role="alert" className="fm-error-banner">{error}</p>}
        <div className="fm-form-grid">
          <label className="fs-field">
            Fee Type Name <b className="required-mark" style={{ color: 'var(--cms-red, #dc2626)' }}>*</b>
            <select
              aria-label="Fee Type Name"
              value={selectedDropdown}
              onChange={handleDropdownChange}
              disabled={saving}
            >
              {STANDARD_FEE_TYPES.map(item => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {selectedDropdown === 'Other' && (
            <label className="fs-field" style={{ gridColumn: '1 / -1' }}>
              Custom Fee Type Name <b className="required-mark" style={{ color: 'var(--cms-red, #dc2626)' }}>*</b>
              <input
                type="text"
                required
                maxLength={150}
                placeholder="e.g. Sports Equipment Fee, Cultural Activity Fee"
                value={customName}
                onChange={handleCustomNameChange}
                disabled={saving}
              />
            </label>
          )}

          <label className="fs-field">
            Fee Type Code
            <input
              type="text"
              readOnly
              maxLength={50}
              placeholder="Auto-generated code"
              value={code}
              disabled={saving}
              style={{ backgroundColor: 'var(--cms-bg-disabled, #f1f5f9)', cursor: 'not-allowed' }}
            />
          </label>

          <label className="fs-field" style={{ gridColumn: '1 / -1' }}>
            Description (Optional)
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Optional notes or details about this fee type..."
              value={description}
              onChange={event => setDescription(event.target.value)}
              disabled={saving}
            />
          </label>
        </div>
      </form>
    </ViewDialog>
  )
}
