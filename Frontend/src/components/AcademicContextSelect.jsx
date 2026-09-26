import { useState } from 'react'
import SearchableSelect from './SearchableSelect'
import { useAcademic } from '../context/AcademicContext'
import './AcademicContextSelect.css'

export default function AcademicContextSelect({ kind, compact = false }) {
  const context = useAcademic()
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const isCollege = kind === 'college'
  const label = isCollege ? 'College' : 'Academic year'
  const items = isCollege ? (context.activeColleges || []) : (context.activeAcademicYears || [])
  const value = isCollege ? context.selectedCollegeId : context.selectedAcademicYearId
  const idOf = item => String(item.id ?? (isCollege ? item.collegeId : item.academicYearId))
  const nameOf = item => item.name || item.collegeName || item.academicYearName || label
  const selected = items.find(item => idOf(item) === String(value))
  const disabled = context.loading || applying || !items.length
  const selectedLabel = selected ? nameOf(selected) : context.loading ? 'Loading...' : `Select ${label.toLowerCase()}`

  const change = async event => {
    const next = event.target.value
    if (!next || next === String(value)) return
    setApplying(true)
    setError('')
    try {
      await context.applyAcademicContext(
        isCollege ? next : context.selectedCollegeId,
        isCollege ? context.selectedAcademicYearId : next,
      )
    } catch (cause) {
      setError(cause.message || `Unable to change ${label.toLowerCase()}.`)
    } finally {
      setApplying(false)
    }
  }

  return <div className={`workspace-context-select workspace-context-select--${kind}${compact ? ' workspace-context-select--compact' : ''}${disabled ? ' is-disabled' : ''}`}>
    {compact ? <SearchableSelect
      label={`Change ${label.toLowerCase()}`}
      value={value || ''}
      options={items.map(item => ({ value: idOf(item), label: nameOf(item) }))}
      onChange={next => change({ target: { value: next } })}
      placeholder={selectedLabel}
      disabled={disabled}
      searchPlaceholder={isCollege ? 'Search colleges...' : 'Search academic years...'}
      menuClassName={`workspace-context-menu workspace-context-menu--${kind}`}
    /> : <label>
      <span>{label}</span>
      <select title={selectedLabel} aria-label={`Change ${label.toLowerCase()}`} value={value || ''} onChange={change} disabled={disabled}>
        <option value="" disabled>{context.loading ? 'Loading...' : `Select ${label.toLowerCase()}`}</option>
        {items.map(item => <option key={idOf(item)} value={idOf(item)}>{nameOf(item)}</option>)}
      </select>
    </label>}
    {(error || context.error) && <div className="workspace-context-select__error" role="alert">{error || 'Unable to load options.'}<button type="button" disabled={context.loading} onClick={() => { setError(''); context.refreshHierarchy() }}>Retry</button></div>}
    {!context.loading && !context.error && !items.length && <small>No {isCollege ? 'colleges' : 'academic years'} available.</small>}
    {applying && <small role="status">Updating...</small>}
  </div>
}
