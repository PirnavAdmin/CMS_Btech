export const CAMPUS_SELECTION_EVENT = 'cms:campus-selection-changed'
const STORAGE_KEY = 'pirnav-campus-selection'

export const getCampusSelection = collegeId => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return stored?.collegeId === String(collegeId) ? String(stored.campusId || '') : ''
  } catch {
    return ''
  }
}

export const saveCampusSelection = (collegeId, campusId) => {
  const selection = { collegeId: String(collegeId), campusId: String(campusId) }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  window.dispatchEvent(new CustomEvent(CAMPUS_SELECTION_EVENT, { detail: selection }))
}
