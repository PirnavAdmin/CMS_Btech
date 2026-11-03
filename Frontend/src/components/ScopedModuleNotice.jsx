import { Link } from 'react-router-dom'
import { FiAlertCircle, FiInfo, FiRefreshCw } from 'react-icons/fi'
import { useAcademic } from '../context/AcademicContext'
import { getUserCollegeId } from '../auth/auth'
import { GENERIC_ERROR_MESSAGE } from '../utils/userError'
import './ToastProvider.css'
import './ScopedModuleNotice.css'

export default function ScopedModuleNotice({ state, data = {}, resource, onRetry }) {
  const academic = useAcademic()
  const currentError = data.resourceErrors?.[resource]
  const message = state.error || currentError?.message || ''
  const assignedCollege = getUserCollegeId()
  const collegeName = academic.selectedCollege?.name || academic.selectedCollege?.collegeName || 'the selected college'
  const assignmentError = /cross.college|college assignment|college.scoped|signed.in college/i.test(message)
  const related = Object.entries(data.resourceErrors || {}).filter(([key]) => key !== resource)
  if (!message && !state.saveError && !state.waitingForContext && !state.loading && !state.saving && !related.length) return null
  const failed = Boolean(message || state.saveError)
  const Icon = failed ? FiAlertCircle : FiInfo
  return <div className={failed ? 'page-error-notice scoped-module-notice' : 'scoped-module-status'} role={failed ? 'alert' : 'status'} data-message-tone={failed ? 'error' : undefined}>
    <Icon aria-hidden="true" />
    <span>
      {message ? assignmentError ? `Your account needs an active assignment for ${collegeName}. Choose an assigned college.` : GENERIC_ERROR_MESSAGE : state.saveError ? 'Changes were not saved. Check the entered details and try again.' : state.waitingForContext ? 'Select a college to load records.' : state.loading ? 'Loading records…' : state.saving ? 'Saving…' : 'Some related information is unavailable'}
      {assignmentError && assignedCollege && String(assignedCollege) !== String(academic.selectedCollegeId) && academic.applyAcademicContext && <button type="button" className="scoped-module-notice__action" onClick={() => academic.applyAcademicContext(assignedCollege,'')}>Use my assigned college</button>}
      {assignmentError && <Link className="scoped-module-notice__action" to="/login">Sign in again</Link>}
    </span>
    {(message || related.length > 0) && <button type="button" aria-label="Retry" title="Retry" disabled={state.loading || state.saving} onClick={() => onRetry().catch(() => {})}><FiRefreshCw aria-hidden="true" /></button>}
  </div>
}
