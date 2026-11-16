import { useEffect, useState } from 'react'
import { useAcademic } from '../context/AcademicContext'
import { campusApi } from '../api/apiEndpoints'
import { getCampusSelection, saveCampusSelection } from '../utils/campusSelection'
import SearchableSelect from './SearchableSelect'

const isActiveCampus = campus => {
  const active = campus?.isActive ?? campus?.IsActive
  if (active != null) return active === true || active === 1 || String(active).toLowerCase() === 'true'
  const status = String(campus?.status ?? campus?.Status ?? '').trim().toLowerCase()
  return !status || status === 'active'
}

export default function CampusContextSelect() {
  const { selectedCollegeId, isSuperAdmin, loading: contextLoading, refreshHierarchy } = useAcademic()
  const [campusState, setCampusState] = useState({ collegeId: '', items: [], error: '' })
  const [selection, setSelection] = useState({ collegeId: '', campusId: '' })

  useEffect(() => {
    if (!selectedCollegeId || contextLoading) return undefined

    let active = true
    const loadCampuses = async () => {
      try {
        const rows = []
        let pageNumber = 1
        let hasNext
        do {
          const result = await campusApi.list({
            collegeId: selectedCollegeId,
            isSuperAdmin,
            pageNumber,
            pageSize: 100,
            isActive: true,
          })
          rows.push(...result.items.filter(isActiveCampus))
          hasNext = result.hasNext
          pageNumber += 1
        } while (hasNext)

        if (!active) return
        setCampusState({ collegeId: selectedCollegeId, items: rows, error: '' })
        const savedCampusId = getCampusSelection(selectedCollegeId)
        const campusId = rows.some(row => String(row.campusId ?? row.id) === savedCampusId)
          ? savedCampusId
          : String(rows[0]?.campusId ?? rows[0]?.id ?? '')
        setSelection({ collegeId: selectedCollegeId, campusId })
      } catch (reason) {
        if (!active) return
        setCampusState({ collegeId: selectedCollegeId, items: [], error: reason.message || 'Active campuses could not be loaded.' })
      }
    }
    loadCampuses()
    return () => { active = false }
  }, [selectedCollegeId, isSuperAdmin, contextLoading])

  const hasCurrentCampuses = campusState.collegeId === selectedCollegeId
  const campuses = hasCurrentCampuses ? campusState.items : []
  const loading = Boolean(selectedCollegeId && !contextLoading && !hasCurrentCampuses)
  const error = hasCurrentCampuses ? campusState.error : ''
  const selectedCampusId = selection.collegeId === selectedCollegeId ? selection.campusId : ''
  const options = campuses.map(campus => ({
    value: String(campus.campusId ?? campus.id),
    label: campus.name ?? campus.campusName ?? 'Campus',
    code: campus.code ?? campus.campusCode,
  })).filter(option => option.value && option.value !== 'undefined')
  const changeCampus = async value => {
    const campusId = String(value ?? '')
    if (!campusId || campusId === selectedCampusId) return
    setSelection({ collegeId: selectedCollegeId, campusId })
    saveCampusSelection(selectedCollegeId, campusId)
    await refreshHierarchy()
  }

  return <div className="workspace-context-select">
    <SearchableSelect
      label="Campus"
      value={selectedCampusId}
      options={options}
      onChange={changeCampus}
      placeholder={loading || contextLoading ? 'Loading campuses...' : options.length ? 'Select campus' : 'No active campuses'}
      searchPlaceholder="Search campuses..."
      disabled={contextLoading || loading || !selectedCollegeId || !options.length}
      loading={loading}
      triggerProps={{ title: error || 'Select an active campus' }}
      noOptionsMessage="No active campuses found."
    />
    {error && <small role="alert">{error}</small>}
  </div>
}
