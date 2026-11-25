import { ProjectSelect } from './SearchableSelect'
import { useState, useMemo } from 'react'
import SearchableSelect from './SearchableSelect'
import { useAcademic } from '../context/AcademicContext'
import { normalizeAcademicYear } from '../utils/academicYearUtils'
import './AcademicContextSelect.css'

export default function AcademicContextSelect({ kind, compact = false, activeOnly = false }) {
  const context = useAcademic()
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const isCollege = kind === 'college'
  const label = isCollege ? 'College' : 'Academic year'
  const sourceItems = isCollege ? (context.activeColleges || []) : (context.academicYears || [])
  const rawItems = !isCollege && activeOnly
    ? sourceItems.map(normalizeAcademicYear).filter(item => item.status === 'ACTIVE')
    : sourceItems
  const idOf = item => {
    const id = item.id ?? (isCollege ? item.collegeId : item.academicYearId)
    return id == null ? '' : String(id)
  }
  const nameOf = item => item.name || item.collegeName || item.academicYearName || label

  const items = useMemo(() => {
    const seen = new Set()
    return (rawItems || []).filter(item => {
      const id = idOf(item)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [rawItems, isCollege])

  const value = isCollege ? context.selectedCollegeId : context.selectedAcademicYearId
  const selected = items.find(item => idOf(item) === String(value))
  const disabled = context.loading || applying || !items.length
  const selectedLabel = selected ? nameOf(selected) : context.loading ? 'Loading...' : context.error ? `${label} unavailable` : `Select ${label.toLowerCase()}`

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

  return <div className={`workspace-context-select workspace-context-select--${kind}${compact ? ' workspace-context-select--compact' : ''}${disabled ? ' is-disabled' : ''}${error || context.error ? ' has-notice' : ''}`}>
    {compact ? <SearchableSelect
      label={`Change ${label.toLowerCase()}`}
      value={value || ''}
      options={items.map(item => ({ value: idOf(item), label: nameOf(item) }))}
      onChange={next => change({ target: { value: next } })}
      placeholder={selectedLabel}
      disabled={disabled}
      searchPlaceholder={isCollege ? 'Search colleges...' : 'Search academic years...'}
      menuClassName={`workspace-context-menu workspace-context-menu--${kind}`}
      triggerProps={{ title: selectedLabel }}
    /> : <label>
      <span>{label}</span>
      <ProjectSelect title={selectedLabel} aria-label={`Change ${label.toLowerCase()}`} value={value || ''} onChange={change} disabled={disabled}>
        <option value="" disabled hidden>{`Select ${label.toLowerCase()}`}</option>
        {items.map(item => <option key={idOf(item)} value={idOf(item)}>{nameOf(item)}</option>)}
      </ProjectSelect>
    </label>}
    {(error || context.error) && <details className="workspace-context-select__notice">
      <summary aria-label={`${label} selection help`} title={error || context.error}>!</summary>
      <div role="alert"><strong>{isCollege ? 'College selection unavailable' : 'Academic year unavailable'}</strong><p>{error || context.error}</p></div>
    </details>}
    {!context.loading && !context.error && !items.length && <small>{!isCollege && activeOnly ? 'No active academic years available.' : `No ${isCollege ? 'colleges' : 'academic years'} available.`}</small>}
    {applying && <small role="status">Updating...</small>}
  </div>
}
