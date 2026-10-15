import './fees.css'
export { FeeManagement as default } from './fees.jsx'

function structureDraftAssigned(state, id) {
  return state.assignments.some(a => a.structureId === id || a.structure?.id === id)
}
function structureDraftDeleteBlocked(state, id) {
  const s = state.structures.find(s => s.id === id)
  if (!s) return 'Fee structure not found.'
  if (s.status !== 'Draft') return 'Only drafts can be deleted.'
  if (structureDraftAssigned(state, id)) return 'Drafts with student assignments cannot be deleted.'
  if (state.structures.some(s => s.parentId === id)) return 'Drafts referenced by revisions cannot be deleted.'
  return ''
}
function deleteStructureDraft(state, id) {
  const reason = structureDraftDeleteBlocked(state, id)
  if (reason) throw new Error(reason)
  return { ...state, structures: state.structures.filter(s => s.id !== id) }
}
function StructureRowActions() {}

