import * as pageDependency0 from '../../components/SearchableSelect'
import * as pageDependency1 from 'react'
import * as pageDependency2 from '../../services/facultyService'
import * as pageDependency3 from '../../api/apiEndpoints'
import * as pageDependency4 from 'react-icons/fi'
import * as pageDependency5 from '../../components/DirectoryEmptyState'
import * as pageDependency6 from '../../utils/collegeScope.js'
import * as pageDependency7 from '../../hooks/useCollegeState'
import * as pageDependency8 from '../../layouts/DashboardLayout'
import * as pageDependency9 from '../../components/ExportMenu'
import * as pageDependency10 from '../../components/ViewDialog'
import * as pageDependency11 from '../../components/TablePagination'
import * as pageDependency12 from '../../services/facultyContracts'
import * as pageDependency13 from '../../utils/newestFirst'
import * as pageDependency14 from '../../utils/facultyLeaveBalances'
import * as pageDependency15 from '../../utils/toast'
import * as pageDependency16 from '../../services/eventBus'
import * as pageDependency17 from '../../context/AcademicContext'
import * as pageDependency18 from 'react-router-dom'
import * as pageDependency19 from '../../components/FilterPanel'
import * as pageDependency20 from '../../components/StatusBadge'
import * as pageDependency21 from '../../components/CompactSummary'
import * as pageDependency22 from '../../components/InfoCard'
import * as pageDependency23 from '../../utils/exportUtils'
import * as pageDependency24 from '../../utils/academicYearUtils'
import * as pageDependency25 from '../../services/subjectService'
import * as pageDependency26 from '../../utils/facultyAttendance'
import './FacultyManagement.css'

// FacultyApiPanels screen and private helpers.
const FacultyApiPanelsScreen = (() => {
const { ProjectSelect } = pageDependency0
const { useEffect, useState } = pageDependency1
const facultyService = pageDependency2.default
const { academicYearApi, branchApi, courseApi, sectionApi, facultyMasterApi } = pageDependency3
const { FiFileText, FiUploadCloud, FiTrash2, FiClock, FiActivity, FiBriefcase, FiX, FiCheck, FiPlus, FiAlertCircle } = pageDependency4

function FacultyDocuments({ facultyId }) {
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('Certificate')
  const [pending, setPending] = useState(null)

  const load = async () => {
    try {
      const data = await facultyService.getDocuments(facultyId)
      setDocuments(Array.isArray(data) ? data : [])
    } catch (reason) {
      setError(reason.message)
    }
  }

  useEffect(() => {
    load()
  }, [facultyId])

  const upload = async event => {
    event.preventDefault()
    if (busy || !file) return
    setBusy(true)
    setError('')
    try {
      await facultyService.uploadDocument(facultyId, file, { DocumentName: name || file.name, DocumentType: type })
      setFile(null)
      setName('')
      await load()
      event.target.reset()
    } catch (reason) {
      setError(reason.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async id => {
    setBusy(true)
    setError('')
    try {
      await facultyService.deleteDocument(id)
      setPending(null)
      await load()
    } catch (reason) {
      setError(reason.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="fm-panel fm-docs-panel">
      <div className="fm-section-bar">
        <h2><FiFileText /> Uploaded Documents <span className="fm-muted">({documents.length})</span></h2>
      </div>
      {error && <p role="alert" className="fm-error">{error}</p>}
      <form className="fm-form-grid fm-doc-upload-grid" onSubmit={upload}>
        <label>
          <span>Document Title</span>
          <input required placeholder="e.g. Master's Degree Certificate" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          <span>Document Type</span>
          <ProjectSelect value={type} onChange={e => setType(e.target.value)}>
            {['Certificate', 'Degree', 'Experience', 'ID Proof', 'Resume', 'Joining Letter', 'Other'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </ProjectSelect>
        </label>
        <label className="fm-file-label">
          <span>Select File</span>
          <input required type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <div className="fm-upload-action">
          <button type="submit" className="fm-button" disabled={busy || !file}>
            <FiUploadCloud /> {busy ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>

      {documents.length ? (
        <div className="fm-uploaded-docs-list">
          {documents.map(row => {
            const id = row.facultyDocumentId ?? row.documentId ?? row.id
            const docName = row.documentName ?? row.name ?? 'Faculty Document'
            const docType = row.documentType ?? row.type ?? 'Document'
            return (
              <article className="fm-uploaded-doc-item" key={id}>
                <div className="fm-doc-leading">
                  <div className="fm-doc-icon-badge"><FiFileText /></div>
                  <div>
                    <strong>{docName}</strong>
                    <p className="fm-muted">{docType} {row.uploadedOn ? `| ${new Date(row.uploadedOn).toLocaleDateString()}` : ''}</p>
                  </div>
                </div>
                <div className="fm-doc-trailing">
                  {pending === id ? (
                    <div className="fm-confirm" role="group">
                      <span>Remove document?</span>
                      <button type="button" className="fm-button danger" disabled={busy} onClick={() => remove(id)}>Delete</button>
                      <button type="button" className="fm-button secondary" onClick={() => setPending(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="fm-icon-button" title="Delete document" onClick={() => setPending(id)}>
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="fm-muted" style={{ margin: '14px 0 0' }}>No uploaded documents available for this faculty.</p>
      )}
    </section>
  )
}

function FacultyStatus({ faculty, onChanged }) {
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState(faculty.employmentStatus)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const data = await facultyService.getStatusHistory(faculty.id)
      setHistory(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [faculty.id])

  const save = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await facultyService.updateStatus(faculty.id, { status, reason })
      onChanged(status)
      await load()
      setReason('')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="fm-panel fm-status-panel">
      <div className="fm-section-bar">
        <h2><FiActivity /> Employment Status Management</h2>
      </div>
      {error && <p className="fm-error" role="alert">{error}</p>}
      <form className="fm-form-grid fm-status-form-grid" onSubmit={save}>
        <label>
          <span>Change Status</span>
          <ProjectSelect value={status} onChange={e => setStatus(e.target.value)}>
            {['Working', 'On Leave', 'Resigned', 'Retired', 'Inactive'].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </ProjectSelect>
        </label>
        <label className="fm-wide">
          <span>Reason for Status Change</span>
          <input required placeholder="Provide reason or remarks for audit trail" value={reason} onChange={e => setReason(e.target.value)} />
        </label>
        <div className="fm-status-action">
          <button type="submit" className="fm-button" disabled={busy || status === faculty.employmentStatus}>
            <FiCheck /> {busy ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </form>

      {history.length ? (
        <div className="fm-status-history-wrap">
          <h3 style={{ fontSize: '13px', margin: '14px 0 8px', color: 'var(--text-secondary)' }}>Status History Timeline</h3>
          <ul className="fm-status-history-list">
            {history.map((row, index) => (
              <li className="fm-status-history-item" key={row.statusHistoryId ?? row.id ?? index}>
                <span className={`fm-status-pill ${String(row.status ?? row.newStatus).toLowerCase()}`}>{row.status ?? row.newStatus}</span>
                <span className="fm-history-reason">{row.reason || 'No remarks recorded'}</span>
                <small className="fm-history-date"><FiClock /> {row.changedAt ?? row.createdAt ? new Date(row.changedAt ?? row.createdAt).toLocaleString('en-GB') : '-'}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function ApiAssignmentDialog({ faculty, onClose, onChanged }) {
  const [masters, setMasters] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const blank = { academicYearId: '', courseId: '', branchId: '', semesterId: '', sectionId: '', subjectId: '', assignmentType: 'Subject Faculty', weeklyHours: 0, isPrimaryFaculty: false, remarks: '' }
  const [form, setForm] = useState(blank)
  const [pending, setPending] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([
      academicYearApi.getAll(),
      courseApi.getAll(),
      branchApi.getAll(),
      facultyMasterApi.getSemesters(),
      sectionApi.getAll(),
      facultyMasterApi.getSubjects(),
    ]).then(([years, courses, branches, semesters, sections, subjects]) => {
      if (active) setMasters({ years, courses, branches, semesters, sections, subjects })
    }).catch(e => {
      if (active) setError(e.message)
    })
    return () => { active = false }
  }, [])

  const save = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const payload = { ...form, facultyId: faculty.id }
      if (editing) await facultyService.updateSubjectAllocation(editing, payload)
      else await facultyService.createSubjectAllocation(payload)
      await onChanged()
      setEditing(null)
      setForm(blank)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async id => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await facultyService.deleteSubjectAllocation(id)
      await onChanged()
      setPending(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fm-modal-backdrop">
      <section className="fm-attendance-editor fm-assignment-modal" role="dialog" aria-modal="true" aria-labelledby="fm-assignment-modal-title">
        <header>
          <div>
            <p className="fm-eyebrow">ACADEMIC RESPONSIBILITIES</p>
            <h2 id="fm-assignment-modal-title">{faculty.fullName} - Subject Allocations</h2>
          </div>
          <button type="button" className="fm-icon-button" onClick={onClose} disabled={busy} aria-label="Close dialog"><FiX /></button>
        </header>
        {error && <p role="alert" className="fm-error">{error}</p>}
        {masters ? (
          <form onSubmit={save}>
            <div className="fm-form-grid">
              {[
                ['academicYearId', 'Academic Year', 'years', 'academicYearId', 'academicYearName'],
                ['courseId', 'Course', 'courses', 'courseId', 'courseName'],
                ['branchId', 'Branch', 'branches', 'branchId', 'branchName'],
                ['semesterId', 'Semester', 'semesters', 'semesterId', 'semesterName'],
                ['sectionId', 'Section', 'sections', 'sectionId', 'sectionName'],
                ['subjectId', 'Subject', 'subjects', 'subjectId', 'subjectName'],
              ].map(([key, label, collection, idKey, nameKey]) => (
                <label key={key}>
                  <span>{label}</span>
                  <ProjectSelect
                    required={['branchId', 'semesterId'].includes(key)}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  >
                    <option value="">Select {label}</option>
                    {(masters[collection] || []).filter(row => !(key === 'branchId' && form.courseId && row.courseId && String(row.courseId) !== String(form.courseId)) && !(['semesterId', 'sectionId', 'subjectId'].includes(key) && form.branchId && row.branchId && String(row.branchId) !== String(form.branchId))).map(row => {
                      const optionId = row[idKey] ?? row.id ?? (key === 'subjectId' ? row.subjectMasterId ?? row.courseSubjectId : undefined)
                      const optionLabel = key === 'subjectId'
                        ? [row.subjectCode ?? row.code ?? row.subject_code, row.subjectName ?? row.name ?? row.subject ?? row.title ?? row.subjectTitle ?? row.subject_name ?? row.courseName].filter(value => value !== undefined && value !== null && String(value).trim() !== '').join(' - ') || 'Unnamed subject'
                        : row[nameKey] ?? row.name ?? row.code ?? 'Unnamed option'
                      return optionId == null ? null : <option key={optionId} value={optionId}>{optionLabel}</option>
                    })}
                  </ProjectSelect>
                </label>
              ))}
              <label>
                <span>Assignment Type</span>
                <ProjectSelect value={form.assignmentType} onChange={e => setForm({ ...form, assignmentType: e.target.value })}>
                  {['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'].map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </ProjectSelect>
              </label>
              <label>
                <span>Periods Per Week</span>
                <input type="number" min="0" max="60" value={form.weeklyHours} onChange={e => setForm({ ...form, weeklyHours: e.target.value })} />
              </label>
              <label className="fm-wide">
                <span>Remarks</span>
                <input placeholder="Optional allocation notes" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </label>
            </div>
            <div className="fm-assignment-submit" style={{ marginTop: '12px' }}>
              <button type="submit" className="fm-button" disabled={busy}>
                <FiPlus /> {busy ? 'Saving...' : editing ? 'Update Assignment' : 'Add Allocation'}
              </button>
            </div>
          </form>
        ) : !error && (
          <p className="fm-muted">Loading academic options...</p>
        )}

        <div className="fm-current-assignments" style={{ marginTop: '18px' }}>
          <h2>Allocated Responsibilities <span className="fm-muted">({faculty?.assignments?.length || 0})</span></h2>
          {(faculty?.assignments || []).length ? (
            <div className="fm-assignment-list">
              {faculty.assignments.map(row => (
                <article key={row.id} className="fm-assignment-card">
                  <div>
                    <strong>{row.subjectName || row.assignmentType}</strong>
                    <p>{row.course || 'B.Tech'} | {row.branch || faculty.department} | {row.semester} | {row.section}</p>
                    <p className="fm-muted">{row.assignmentType}</p>
                  </div>
                  <div className="fm-assignment-end">
                    <strong>{row.weeklyHours || row.periodsPerWeek || 0} Hrs / Wk</strong>
                    {pending === row.id ? (
                      <div className="fm-confirm" role="group">
                        <span>Remove?</span>
                        <button type="button" className="fm-button danger" disabled={busy} onClick={() => remove(row.id)}>Delete</button>
                        <button type="button" className="fm-button secondary" onClick={() => setPending(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="fm-actions">
                        <button type="button" className="fm-icon-button" title="Edit allocation" onClick={() => { setEditing(row.id); setForm({ ...blank, ...row }) }}>
                          <FiBriefcase />
                        </button>
                        <button type="button" className="fm-icon-button" title="Remove allocation" onClick={() => setPending(row.id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="fm-muted">No subject allocations found.</p>
          )}
        </div>
      </section>
    </div>
  )
}

return { FacultyDocuments, FacultyStatus, ApiAssignmentDialog }
})()

// FacultyLeaveManagement screen and private helpers.
const FacultyLeaveManagementScreen = (() => {
const { ProjectSelect } = pageDependency0
const DirectoryEmptyState = pageDependency5.default
const { collegeStorageKey, selectedCollegeId } = pageDependency6
const useCollegeState = pageDependency7.default
const { useCallback, useEffect, useMemo, useRef, useState } = pageDependency1
const { FiArrowLeft, FiBriefcase, FiCheck, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiFilter, FiPlus, FiPower, FiSearch, FiSlash, FiX } = pageDependency4
const DashboardLayout = pageDependency8.default
const ExportMenu = pageDependency9.default
const SharedViewDialog = pageDependency10.default
const TablePagination = pageDependency11.default
const { academicYearApi, facultyLeaveApi } = pageDependency3
const { normalizeFaculty } = pageDependency2
const facultyService = pageDependency2.default
const { normalizeLeaveType, normalizeLeavePolicy, normalizeLeaveRequest, leavePolicyPayload } = pageDependency12
const { newestFirst, rememberCreated } = pageDependency13
const { employeeLeaveBalances, leaveBalanceRules } = pageDependency14
const { showError } = pageDependency15
const { ERP_EVENTS } = pageDependency16
const eventBus = pageDependency16.default

const PAGE_SIZE = 5
const TABS = ['Leave Requests', 'Leave History', 'Leave Balances', 'Leave Types', 'Leave Policies']
const today = () => { const date = new Date(); return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-') }
const typeOf = employee => employee?.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'
const branchOf = employee => employee?.branch || employee?.branchName || employee?.department || '-'
const statusClass = value => String(value || '').toLowerCase().replace(/\s+/g, '-')
const dateLabel = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const range = (from, to) => !from || !to ? '?' : from === to ? dateLabel(from) : `${new Date(`${from}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${dateLabel(to)}`
const initials = value => String(value || 'Employee').replace(/^(Dr|Prof|Mr|Ms|Mrs)\.\s*/i, '').split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
const genderRestrictedLeave = type => {
  const scope = String(type?.applicableGender ?? type?.gender ?? type?.genderEligibility ?? '').trim().toLowerCase()
  if (['female', 'women', 'woman', 'female only'].includes(scope)) return 'female'
  if (['male', 'men', 'man', 'male only'].includes(scope)) return 'male'
  const text = `${type?.name || ''} ${type?.code || ''} ${type?.category || ''}`
  if (/maternity|pregnancy|miscarriage|adoption leave/i.test(text)) return 'female'
  if (/paternity|paternal/i.test(text)) return 'male'
  return null
}
const eligibleLeaveTypes = (types, employee) => {
  const gender = String(employee?.gender || '').trim().toLowerCase()
  return types.filter(type => {
    if (type.status !== 'Active') return false
    const requiredGender = genderRestrictedLeave(type)
    return !requiredGender || gender === requiredGender
  })
}
const hasOverlap = (left, right) => left.from <= right.to && left.to >= right.from
const policyScopesOverlap = (left, right) => {
  const categoryOverlaps = left.applicableTo === 'Both' || right.applicableTo === 'Both' || left.applicableTo === right.applicableTo
  const departmentOverlaps = !left.departments?.length || !right.departments?.length || left.departments.some(department => right.departments.includes(department))
  return categoryOverlaps && departmentOverlaps && hasOverlap(left, right)
}
const exportColumns = [{ label: 'Employee ID', value: 'employeeId' }, { label: 'Employee', value: 'employee' }, { label: 'Branch', value: row => branchOf(row.employee || row) }, { label: 'Status', value: 'status' }]
const LOCAL_LEAVE_DECISIONS_KEY = 'pirnav-faculty-local-leave-decisions-v1'
const LOCAL_LEAVE_POLICIES_KEY = 'pirnav-faculty-local-leave-policies-v1'
const LOCAL_LEAVE_TYPES_KEY = 'pirnav-faculty-local-leave-types-v1'

const getLocalDecisions = () => {
  try { return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_LEAVE_DECISIONS_KEY))) || {} } catch { return {} }
}
const saveLocalDecision = (requestId, status, reason = '') => {
  try {
    const decisions = getLocalDecisions()
    decisions[String(requestId)] = { status, reason, decidedAt: new Date().toISOString() }
    localStorage.setItem(collegeStorageKey(LOCAL_LEAVE_DECISIONS_KEY), JSON.stringify(decisions))
  } catch { /* ignore */ }
}

const getLocalPolicies = () => {
  try { return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_LEAVE_POLICIES_KEY))) || {} } catch { return {} }
}
const saveLocalPolicy = (policy, previousId = '') => {
  try {
    const policies = getLocalPolicies()
    const id = String(policy.id || policy.policyId || '')
    if (id) {
      if (previousId && String(previousId) !== id) delete policies[String(previousId)]
      policies[id] = { ...policy, id, collegeId: selectedCollegeId() }
      localStorage.setItem(collegeStorageKey(LOCAL_LEAVE_POLICIES_KEY), JSON.stringify(policies))
    }
  } catch { /* ignore */ }
}

const getLocalTypes = () => {
  try { return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_LEAVE_TYPES_KEY))) || {} } catch { return {} }
}
const saveLocalType = (type) => {
  try {
    const types = getLocalTypes()
    const id = String(type.id || type.leaveTypeId || '')
    if (id) {
      types[id] = { ...type, id, collegeId: selectedCollegeId() }
      localStorage.setItem(collegeStorageKey(LOCAL_LEAVE_TYPES_KEY), JSON.stringify(types))
    }
  } catch { /* ignore */ }
}


function FacultyLeaveManagement() {
  const [faculty, setFaculty] = useCollegeState([])
  const [balances, setBalances] = useCollegeState([], { faculty })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const mutationLock = useRef(false)
  const [tab, setTab] = useState(TABS[0])
  // The current leave-type and leave-policy endpoints return shared master
  // records without a collegeId, so they cannot pass useCollegeState's owner
  // filter. Keep them as the direct backend lists; employee-owned data below
  // remains college scoped.
  const [leaveTypes, setLeaveTypes] = useState([])
  const [policies, setPolicies] = useState([])
  const [pendingRequests, setPendingRequests] = useCollegeState([], { faculty })
  const [historyRequests, setHistoryRequests] = useCollegeState([], { faculty })
  const reloadVersion = useRef(0)
  const requests = useMemo(() => {
    const decisions = getLocalDecisions()
    const map = new Map()
    for (const r of [...pendingRequests, ...historyRequests]) {
      const decision = decisions[String(r.id)]
      const item = decision ? { ...r, status: decision.status, rejectionReason: decision.reason || r.rejectionReason } : r
      map.set(String(item.id), item)
    }
    return newestFirst('leave-requests', [...map.values()])
  }, [pendingRequests, historyRequests])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ type: 'Teaching', department: '', status: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [academicYears, setAcademicYears] = useState([])

  const reload = useCallback(async () => {
    const version = ++reloadVersion.current
    setLoading(true)
    const optionalFetchOptions = { suppressApiFailureNotice: true }
    const resources = [
      ['Faculty', () => facultyService.list(undefined, optionalFetchOptions), setFaculty],
      ['Leave types', () => facultyLeaveApi.getTypes(undefined, optionalFetchOptions), rows => {
        const localTypes = getLocalTypes()
        const normalized = rows.map(normalizeLeaveType).map(r => ({ ...r, ...(localTypes[String(r.id)] || {}) }))
        setLeaveTypes(newestFirst('leave-types', normalized))
      }],
      ['Leave policies', () => facultyLeaveApi.getPolicies(undefined, optionalFetchOptions), rows => {
        const localPolicies = getLocalPolicies()
        const normalized = rows.map(normalizeLeavePolicy).map(r => {
          const local = localPolicies[String(r.id)]
          return {
            ...r,
            ...(local || {}),
            entitlements: (local?.entitlements && local.entitlements.length > 0) ? local.entitlements : r.entitlements
          }
        })
        setPolicies(newestFirst('leave-policies', normalized))
      }],
      ['Leave requests', () => facultyLeaveApi.getRequests(), rows => setPendingRequests(rows.map(normalizeLeaveRequest))],
      ['Leave history', () => facultyLeaveApi.getHistory(undefined, optionalFetchOptions), rows => setHistoryRequests(rows.map(normalizeLeaveRequest))],
      ['Leave balances', () => facultyLeaveApi.getBalances(undefined, optionalFetchOptions), setBalances],
    ]
    await Promise.allSettled(resources.map(async ([name, fetchRows, saveRows]) => {
      try {
        const rows = await fetchRows()
        if (version === reloadVersion.current) {
          saveRows(rows)
        }
      } catch (error) {
        if (version === reloadVersion.current) {
          const message = error?.message || 'Could not load this list.'
          if (name === 'Leave types' || name === 'Leave policies') setNotice(`Unable to load ${name.toLowerCase()}: ${message}`)
        }
      }
    }))
    if (version === reloadVersion.current) {
      setLoading(false)
    }
  }, [])
  useEffect(() => { reload(); return () => { reloadVersion.current += 1 } }, [reload])
  useEffect(() => {
    let active = true
    academicYearApi.getAll({ suppressApiFailureNotice: true }).then(rows => {
      if (!active) return
      const activeRows = rows.filter(row => row.isActive === true || row.isActive === 1 || row.isActive === '1' || row.status === 1 || row.status === '1' || String(row.status).toUpperCase() === 'ACTIVE')
      setAcademicYears(activeRows.map(row => ({
        name: row.academicYearName || row.name,
        from: String(row.startDate || '').slice(0, 10),
        to: String(row.endDate || '').slice(0, 10),
    })).filter(year => year.name))
    }).catch(() => { /* Academic year lookup is optional on this page. */ })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2000)
    return () => clearTimeout(timer)
  }, [notice])
  const mutate = async (action, message, module) => {
    if (mutationLock.current) return
    mutationLock.current = true; setBusy(true)
    try {
      const saved = await action()
      if (module) { rememberCreated(module, saved); setPage(1); setQuery(''); setFilters({ type: '', department: '', status: '' }) }
      setDialog(null); setNotice(message)
      await reload().catch(() => {})
    } catch (error) { showError(error) }
    finally { mutationLock.current = false; setBusy(false) }
  }
  const getApplicablePolicy = (employee, targetDate = today()) => {
    if (!employee) return null
    const matches = policies.filter(policy => policy.status === 'Active' && (!policy.from || policy.from <= targetDate) && (!policy.to || policy.to >= targetDate) && (policy.applicableTo === 'Both' || policy.applicableTo === typeOf(employee)) && (!policy.departments?.length || policy.departments.includes(employee?.department)))
    return matches.length === 1 ? matches[0] : (matches[0] || null)
  }
  const getBalance = useCallback((employee, policy, typeId) => {
    const rawBalance = employeeLeaveBalances(balances, employee, policy)
    if (typeId !== undefined) {
      const match = rawBalance.details.find(row => String(row.typeId) === String(typeId))
      if (match && match.entitled !== null) return match
      const policyRule = policy?.entitlements?.find(r => String(r.typeId) === String(typeId))
      const empRequests = requests.filter(r => (String(r.facultyId) === String(employee?.id) || String(r.facultyId) === String(employee?.employeeId)) && String(r.typeId) === String(typeId))
      const used = empRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + (Number(r.days) || 1), 0)
      const pending = empRequests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (Number(r.days) || 1), 0)
      const entitled = match?.entitled ?? (policyRule?.entitlement != null ? Number(policyRule.entitlement) : (policy ? 12 : 0))
      return {
        typeId: String(typeId),
        entitled,
        used: match?.used ?? used,
        pending: match?.pending ?? pending,
        available: match?.available ?? Math.max(0, entitled - (match?.used ?? used) - (match?.pending ?? pending))
      }
    }

    const empRequests = requests.filter(r => String(r.facultyId) === String(employee?.id) || String(r.facultyId) === String(employee?.employeeId))
    const calcUsed = empRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + (Number(r.days) || 1), 0)
    const calcPending = empRequests.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (Number(r.days) || 1), 0)

    let entitledTotal = rawBalance.totals.entitled
    if (entitledTotal == null && policy) {
      if (policy.entitlements && policy.entitlements.length > 0) {
        entitledTotal = policy.entitlements.reduce((sum, r) => sum + (Number(r.entitlement) || Number(r.maxDays) || 0), 0)
      } else if (leaveTypes.length > 0) {
        const activeTypes = eligibleLeaveTypes(leaveTypes, employee)
        entitledTotal = activeTypes.length * 12
      } else {
        entitledTotal = 12
      }
    }

    const usedTotal = rawBalance.totals.used ?? calcUsed
    const pendingTotal = rawBalance.totals.pending ?? calcPending
    const finalEntitled = entitledTotal ?? (policy ? 12 : 0)
    const availableTotal = rawBalance.totals.available ?? Math.max(0, finalEntitled - usedTotal - pendingTotal)

    return {
      ...rawBalance,
      totals: {
        entitled: policy ? finalEntitled : 0,
        used: usedTotal,
        pending: pendingTotal,
        available: policy ? availableTotal : 0
      }
    }
  }, [balances, requests, leaveTypes])

  const requestRows = requests.map(request => ({ ...request, employee: faculty.find(item => String(item.id) === String(request.facultyId)) || normalizeFaculty(request.employee || { ...request, facultyName: request.facultyName || request.employeeName, facultyId: request.facultyId }) })).filter(row => row.employee)
  const sourceRows = tab === 'Leave Requests' ? requestRows.filter(row => row.status === 'Pending') : tab === 'Leave History' ? requestRows.filter(row => ['Approved', 'Rejected', 'Cancelled'].includes(row.status)) : tab === 'Leave Balances' ? faculty.filter(Boolean).map(employee => ({ employee, policy: getApplicablePolicy(employee) })).filter(row => Boolean(row.employee)) : tab === 'Leave Types' ? leaveTypes : policies
  // Keep legacy table markup compatible while supplying Branch as its display
  // field throughout Leave Management.
  const leaveRows = sourceRows.map(item => item?.employee ? {
    ...item,
    employee: { ...item.employee, department: branchOf(item.employee) }
  } : item)
  const filtered = leaveRows.filter(item => {
    const employee = item.employee?.fullName ? item.employee : item.employee || item
    const text = `${item.id || ''} ${item.name || ''} ${item.code || ''} ${employee?.fullName || ''} ${employee?.employeeId || ''} ${branchOf(employee)}`.toLowerCase()
    const usesFacultyFilters = ['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab)
    return (!query || text.includes(query.toLowerCase())) && (!usesFacultyFilters || !filters.type || typeOf(employee) === filters.type) && (!usesFacultyFilters || !filters.department || branchOf(employee) === filters.department) && (!filters.status || item.status === filters.status)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const branches = [...new Set(faculty.map(branchOf).filter(value => value && value !== '-'))]
  const departments = branches
  const summary = [['Total Requests', requests.length], ['Pending', requests.filter(item => item.status === 'Pending').length], ['Approved', requests.filter(item => item.status === 'Approved').length], ['On Leave', requests.filter(item => item.status === 'Approved' && item.from <= today() && item.to >= today()).length]]
  const title = tab.toUpperCase()
  const description = { 'Leave Requests': 'Review pending faculty and staff leave requests.', 'Leave History': 'Review completed leave decisions.', 'Leave Balances': 'Review individual employee leave entitlement and usage.', 'Leave Types': 'Configure leave categories available to college employees.', 'Leave Policies': 'Configure leave entitlement and employee eligibility rules.' }[tab]
  const switchTab = value => { setTab(value); setPage(1); setQuery(''); setFilters({ type: 'Teaching', department: '', status: '' }); setShowFilters(false) }
  const changeFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const saveType = value => {
    const payload = { name: value.name.trim(), code: value.code.trim().toUpperCase(), category: value.category || 'Regular', payCategory: value.payCategory, description: value.description, status: value.status }
    if (!payload.name || !payload.code || !payload.payCategory || !payload.status) { showError('Leave Type Name, Leave Code, Pay Category, and Status are required.'); return }
    const updatedType = { ...value, ...payload, id: String(value.id || `lt-${Date.now()}`) }
    saveLocalType(updatedType)
    setLeaveTypes(prev => {
      const exists = prev.some(t => String(t.id) === String(updatedType.id))
      return exists ? prev.map(t => String(t.id) === String(updatedType.id) ? { ...t, ...updatedType } : t) : [updatedType, ...prev]
    })
    return mutate(() => value.id ? facultyLeaveApi.updateType(value.id, payload) : facultyLeaveApi.createType(payload), 'Leave type saved.', value.id ? null : 'leave-types')
  }
  const toggleType = type => {
    const isActivating = type.status === 'Inactive'
    const newStatus = isActivating ? 'Active' : 'Inactive'
    const payload = {
      name: type.name.trim(),
      code: type.code.trim().toUpperCase(),
      category: type.category || 'Regular',
      payCategory: type.payCategory || 'Paid Leave',
      description: type.description || '',
      status: newStatus
    }
    const updatedType = { ...type, ...payload }
    saveLocalType(updatedType)
    setLeaveTypes(prev => prev.map(t => String(t.id) === String(type.id) ? updatedType : t))
    return mutate(
      () => facultyLeaveApi.updateType(type.id, payload),
      `Leave type "${type.name}" ${isActivating ? 'activated' : 'deactivated / deleted'}.`,
      'leave-types'
    )
  }
  const savePolicy = policy => {
    const selectedYear = academicYears.find(year => year.name === policy.academicYear)
    const updatedPolicy = {
      ...policy,
      id: String(policy.id || `lp-${Date.now()}`),
      collegeId: selectedCollegeId(),
      name: policy.name.trim(),
      academicYear: policy.academicYear,
      applicableTo: policy.applicableTo,
      from: policy.from || selectedYear?.from || '',
      to: policy.to || selectedYear?.to || '',
      status: policy.status || 'Active',
      entitlements: policy.entitlements || []
    }
    saveLocalPolicy(updatedPolicy)
    setPolicies(prev => {
      const exists = prev.some(p => String(p.id) === String(updatedPolicy.id))
      return exists ? prev.map(p => String(p.id) === String(updatedPolicy.id) ? { ...p, ...updatedPolicy } : p) : [updatedPolicy, ...prev]
    })
    return mutate(async () => {
      const saved = policy.id
        ? await facultyLeaveApi.updatePolicy(policy.id, leavePolicyPayload(updatedPolicy))
        : await facultyLeaveApi.createPolicy(leavePolicyPayload(updatedPolicy))
      const savedId = String(saved?.policyId ?? saved?.id ?? updatedPolicy.id)
      const savedStatus = saved?.status ?? updatedPolicy.status
      saveLocalPolicy({ ...updatedPolicy, ...saved, id: savedId, status: savedStatus, collegeId: selectedCollegeId() }, updatedPolicy.id)
      return saved
    }, 'Leave policy saved.', policy.id ? null : 'leave-policies')
  }
  const setPolicyStatus = (policy, status) => {
    const activate = status === 'Active'
    return mutate(
      () => activate ? facultyLeaveApi.activatePolicy(policy.id) : facultyLeaveApi.deactivatePolicy(policy.id),
      `Leave policy ${activate ? 'activated' : 'deactivated'}.`,
    )
  }
  const decideRequest = async (request, status, reason = '') => {
    saveLocalDecision(request.id, status, reason)
    const updatedRequest = { ...request, status, rejectionReason: reason || null }
    setPendingRequests(prev => prev.filter(r => String(r.id) !== String(request.id)))
    setHistoryRequests(prev => [updatedRequest, ...prev.filter(r => String(r.id) !== String(request.id))])
    eventBus.emit(ERP_EVENTS.LEAVE_UPDATED, { request: updatedRequest, status })
    return mutate(async () => {
      try {
        if (status === 'Approved') {
          return await facultyLeaveApi.approve(request.id)
        } else {
          return await facultyLeaveApi.reject(request.id, reason.trim())
        }
      } catch (err) {
        if (String(err.message || '').toLowerCase().includes('profile not found') && request.facultyId) {
          try {
            await facultyService.createProfile(request.facultyId, {
              fullName: request.employee?.fullName || request.facultyName || 'Faculty Member',
              email: request.employee?.email || '',
              status: 1
            })
            if (status === 'Approved') {
              return await facultyLeaveApi.approve(request.id)
            } else {
              return await facultyLeaveApi.reject(request.id, reason.trim())
            }
          } catch {
            // Handled via local decision
          }
        }
        return updatedRequest
      }
    }, 'Leave request ' + status.toLowerCase() + '.')
  }
  const saveRequest = req => {
    const employee = faculty.find(item => String(item.id) === String(req.facultyId))
    const leaveType = leaveTypes.find(item => String(item.id) === String(req.leaveTypeId))
    if (!employee || !leaveType || !eligibleLeaveTypes([leaveType], employee).length) {
      showError('This leave type is not available for the selected employee.')
      return
    }
    return mutate(async () => {
    const res = await facultyLeaveApi.createRequest({
      facultyId: Number(req.facultyId),
      leaveTypeId: String(req.leaveTypeId),
      policyId: String(req.policyId),
      fromDate: req.fromDate,
      toDate: req.toDate,
      reason: req.reason.trim(),
      days: Number(req.days) || 1,
    })
    eventBus.emit(ERP_EVENTS.LEAVE_UPDATED, { request: req })
    return res
    }, 'Leave request submitted.', 'leave-requests')
  }
  const viewRecord = item => {
    if (item?.applicableTo || item?.academicYear || Array.isArray(item?.entitlements)) {
      const local = getLocalPolicies()[String(item.id)]
      setDialog({ kind: 'view', item: { ...item, ...(local || {}), entitlements: (local?.entitlements && local.entitlements.length > 0) ? local.entitlements : (item.entitlements || []) } })
      return
    }
    if (item?.payCategory || item?.category) {
      const local = getLocalTypes()[String(item.id)]
      setDialog({ kind: 'view', item: { ...item, ...(local || {}) } })
      return
    }
    setDialog({ kind: 'view', item })
  }
  if (dialog?.kind === 'type') {
    return (
      <DashboardLayout>
        <main className="flm-page">

          <header className="flm-type-page-header">
            <div>
              <h1>{dialog.item?.id ? 'Edit Leave Type' : 'Add Leave Type'}</h1>
              <p>Leave type configuration and eligibility details.</p>
            </div>
            <button type="button" className="flm-filter-toggle" onClick={() => setDialog(null)}><FiArrowLeft /> Back</button>
          </header>
          <fieldset disabled={busy} className="flm-type-page-fieldset">
            <TypeDialog page item={dialog.item} onClose={() => setDialog(null)} onSave={saveType} />
          </fieldset>
          {notice && <div className="flm-toast">{notice}<button type="button" onClick={() => setNotice('')}><FiX /></button></div>}
        </main>
      </DashboardLayout>
    )
  }
  return <DashboardLayout><main className="flm-page">{loading && <p role="status">Loading leave records...</p>}<header className="flm-header"><div><h1>Faculty Leave Management</h1><span>Configure leave policies, manage employee balances and process faculty and staff leave requests.</span></div><div className="flm-summary">{summary.map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header><section className="flm-card"><header className="flm-card-header"><div><p>{title}</p><h2>{description}</h2></div><div className="flm-header-actions">{['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab) && <div className="flm-category-toggle" role="group" aria-label="Filter by Faculty Type"><button type="button" className={`flm-cat-btn ${filters.type === 'Teaching' ? 'active' : ''}`} onClick={() => changeFilter('type', 'Teaching')}>Teaching Faculty</button><button type="button" className={`flm-cat-btn ${filters.type === 'Non-Teaching' ? 'active' : ''}`} onClick={() => changeFilter('type', 'Non-Teaching')}>Non-Teaching Staff</button></div>}<button type="button" className="flm-filter-toggle" aria-expanded={showFilters} aria-controls="faculty-leave-filters" onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button><ExportMenu rows={filtered} columns={exportColumns} screen="faculty-leave-local" filename={`faculty-leave-${tab.toLowerCase().replace(/\s+/g, '-')}`} title={tab} scope="All filtered results" />{tab === 'Leave Types' && <button className="flm-primary" onClick={() => setDialog({ kind: 'type' })}><FiPlus /> Add Leave Type</button>}{tab === 'Leave Policies' && <button className="flm-primary" onClick={() => setDialog({ kind: 'policy' })}><FiPlus /> Create Leave Policy</button>}</div></header><nav className="flm-tabs" aria-label="Leave management sections">{TABS.map(value => <button key={value} className={tab === value ? 'active' : ''} aria-current={tab === value ? 'page' : undefined} onClick={() => switchTab(value)}>{value}</button>)}</nav><div className="flm-toolbar"><label className="flm-search"><FiSearch /><input aria-label="Search leave records" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder={tab === 'Leave Types' ? 'Search leave type or code...' : tab === 'Leave Policies' ? 'Search leave policy...' : tab === 'Leave Balances' ? 'Search employee...' : 'Search request, employee or leave type...'} /></label></div>{showFilters && <div id="faculty-leave-filters" className="flm-filter-panel">{['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab) && <><FilterSelect label="Faculty Type" value={filters.type} values={['Teaching', 'Non-Teaching']} onChange={value => changeFilter('type', value)} /><FilterSelect label="Department" value={filters.department} values={departments} onChange={value => changeFilter('department', value)} /></>}{['Leave History', 'Leave Types', 'Leave Policies'].includes(tab) && <FilterSelect label="Status" value={filters.status} values={tab === 'Leave Types' ? ['Active', 'Inactive'] : tab === 'Leave Policies' ? ['Draft', 'Active', 'Inactive', 'Expired'] : ['Approved', 'Rejected', 'Cancelled']} onChange={value => changeFilter('status', value)} />}<button className="flm-clear" onClick={() => { setQuery(''); setFilters({ type: 'Teaching', department: '', status: '' }); setPage(1) }}>Clear Filters</button></div>}<p className="flm-count">Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records</p><LeaveList onCreate={() => setDialog({ kind: tab === 'Leave Types' ? 'type' : 'policy' })} tab={tab} rows={visible} leaveTypes={leaveTypes} getBalance={getBalance} onView={viewRecord} onEdit={item => {
    if (tab === 'Leave Policies') {
      const local = getLocalPolicies()[String(item.id)]
      setDialog({ kind: 'policy', item: { ...item, ...(local || {}), entitlements: (local?.entitlements && local.entitlements.length > 0) ? local.entitlements : (item.entitlements || []) } })
    } else {
      const local = getLocalTypes()[String(item.id)]
      setDialog({ kind: 'type', item: { ...item, ...(local || {}) } })
    }
  }} onActivate={(item, status = 'Active') => setDialog({ kind: 'activate', item, status })} onDecision={(item, status) => setDialog({ kind: 'decision', item, status })} onToggleType={item => setDialog({ kind: 'toggleType', item })} />{filtered.length > PAGE_SIZE && <TablePagination currentPage={currentPage} totalPages={pages} onPageChange={setPage} />}</section>{dialog && <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><LeaveDialog dialog={dialog} faculty={faculty} leaveTypes={leaveTypes} policies={policies} requests={requests} academicYears={academicYears} getBalance={getBalance} onClose={() => setDialog(null)} onSaveType={saveType} onToggleType={toggleType} onSavePolicy={savePolicy} onActivate={setPolicyStatus} onDecision={decideRequest} onSaveRequest={saveRequest} /></fieldset>}{notice && <div className="flm-toast">{notice}<button onClick={() => setNotice('')}><FiX /></button></div>}</main></DashboardLayout>
}

function LeaveList({ onCreate, tab, rows, leaveTypes, getBalance, onView, onEdit, onActivate, onDecision, onToggleType }) {
  if (!rows.length && ['Leave Types', 'Leave Policies'].includes(tab)) return <DirectoryEmptyState title={tab === 'Leave Types' ? 'No leave types found.' : 'No leave policies found.'} actionLabel={tab === 'Leave Types' ? 'Add Leave Type' : 'Create Leave Policy'} onAction={onCreate} />
  if (!rows.length) return <div className="flm-empty"><FiFilter /><h3>No Records Found</h3><p>{tab === 'Leave Requests' ? 'No pending leave requests.' : tab === 'Leave History' ? 'No completed leave decisions match these filters.' : tab === 'Leave Balances' ? 'No employee balances are available.' : 'No configuration records match these filters.'}</p></div>
  if (tab === 'Leave Types') return (
    <DataTable headers={['Leave Type', 'Code', 'Category', 'Pay Type', 'Description', 'Status', 'Action']}>
      {rows.map(row => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.code}</td>
          <td>{row.category || 'Regular'}</td>
          <td>{row.payCategory}</td>
          <td>{row.description || '-'}</td>
          <td><Status value={row.status} /></td>
          <td>
            <Actions>
              <Action title="View leave type" onClick={() => onView(row)}><FiEye /></Action>
              <Action title="Edit leave type" onClick={() => onEdit(row)}><FiEdit2 /></Action>
              {row.status === 'Active' ? (
                <Action title="Deactivate / Delete leave type" onClick={() => onToggleType(row)}>
                  <FiSlash style={{ color: '#dc2626' }} />
                </Action>
              ) : (
                <Action title="Activate leave type" onClick={() => onToggleType(row)}>
                  <FiCheck style={{ color: '#1769C2' }} />
                </Action>
              )}
            </Actions>
          </td>
        </tr>
      ))}
    </DataTable>
  )
  if (tab === 'Leave Policies') return <DataTable headers={['Policy Name', 'Academic Year', 'Applicable To', 'Effective Period', 'Leave Types', 'Status', 'Action']}>{rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.academicYear}</td><td>{row.applicableTo}</td><td>{range(row.from, row.to)}</td><td>{row.leaveTypes ?? row.entitlements?.length ?? 0}</td><td><Status value={row.status} /></td><td><Actions><Action title="View leave policy" onClick={() => onView(row)}><FiEye /></Action><Action title="Edit leave policy" onClick={() => onEdit(row)}><FiEdit2 /></Action><Action title={row.status === 'Active' ? 'Deactivate leave policy' : 'Activate leave policy'} onClick={() => onActivate(row, row.status === 'Active' ? 'Inactive' : 'Active')}>{row.status === 'Active' ? <FiPower style={{ color: '#dc2626' }} /> : <FiCheck style={{ color: '#16a34a' }} />}</Action></Actions></td></tr>)}</DataTable>
  if (tab === 'Leave Balances') return <DataTable headers={['Employee ID', 'Employee', 'Faculty Type', 'Department', 'Applicable Policy', 'Entitled', 'Used', 'Pending', 'Available', 'Action']}>{rows.map(({ employee, policy }) => {
    if (!employee) return null
    const { totals } = getBalance(employee, policy)
    return <tr key={employee.id}><td>{employee.employeeId || employee.id}</td><td><Employee employee={employee} /></td><td>{typeOf(employee)}</td><td>{employee.department || '-'}</td><td>{policy ? policy.name : <span className="flm-unassigned">Not Assigned</span>}</td>{['entitled', 'used', 'pending', 'available'].map(key => <td key={key}>{totals[key] ?? 0}</td>)}<td><Actions><Action title="View leave balance" onClick={() => onView({ employee, policy })}><FiEye /></Action></Actions></td></tr>
  })}</DataTable>
  return <DataTable headers={['Request ID', 'Employee', 'Faculty Type', 'Department', 'Leave Type', 'Duration', 'Days', 'Applied On', 'Status', 'Action']}>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td><Employee employee={row.employee || {}} /></td><td>{typeOf(row.employee)}</td><td>{row.employee?.department || '-'}</td><td>{leaveTypes.find(type => type.id === row.typeId)?.name || row.leaveTypeName || 'Unavailable'}</td><td>{range(row.from, row.to)}</td><td>{row.days ?? 1}</td><td>{dateLabel(row.applied)}</td><td><Status value={row.status} /></td><td><Actions><Action title="View request" onClick={() => onView(row)}><FiEye /></Action>{row.status === 'Pending' && onDecision && <><Action title="Reject leave request" onClick={() => onDecision(row, 'Rejected')}><FiX style={{ color: '#dc2626' }} /></Action><Action title="Approve leave request" onClick={() => onDecision(row, 'Approved')}><FiCheck style={{ color: '#16a34a' }} /></Action></>}</Actions></td></tr>)}</DataTable>
}

function LeaveDialog({ dialog, faculty, leaveTypes, policies, academicYears, getBalance, onClose, onSaveType, onToggleType, onSavePolicy, onActivate, onDecision, onSaveRequest }) {
  if (dialog.kind === 'view') return <ViewDialog item={dialog.item} leaveTypes={leaveTypes} policies={policies} getBalance={getBalance} onClose={onClose} onDecision={onDecision} />
  if (dialog.kind === 'type') return <TypeDialog item={dialog.item} onClose={onClose} onSave={onSaveType} />
  if (dialog.kind === 'toggleType') return <ToggleTypeDialog item={dialog.item} onClose={onClose} onConfirm={onToggleType} />
  if (dialog.kind === 'policy') return <PolicyDialog item={dialog.item} leaveTypes={leaveTypes} academicYears={academicYears} onClose={onClose} onSave={onSavePolicy} />
  if (dialog.kind === 'activate') return <ActivationDialog policy={dialog.item} status={dialog.status} onClose={onClose} onActivate={onActivate} />
  if (dialog.kind === 'request') return <RequestLeaveDialog faculty={faculty} leaveTypes={leaveTypes} policies={policies} onClose={onClose} onSave={onSaveRequest} />
  return <DecisionDialog request={dialog.item} status={dialog.status} onClose={onClose} onSave={onDecision} />
}

function ViewDialog({ item, leaveTypes, policies, getBalance, onClose, onDecision }) {
  const isBalance = item.employee && Object.hasOwn(item, 'policy')
  const isPolicy = Array.isArray(item.entitlements) || item.leaveTypes !== undefined || Object.hasOwn(item, 'applicableTo')
  const isType = Object.hasOwn(item, 'payCategory')
  const employee = item.employee
  const policyEntitlements = item.entitlements || []

  return (
    <View title={isBalance ? 'Leave Balance Details' : isPolicy ? 'Leave Policy Details' : isType ? 'Leave Type Details' : 'Leave Request Details'} onClose={onClose}>
      {employee && <Identity employee={employee} status={item.status} />}
      {isBalance ? (
        <>
          {item.policy ? (
            <>
              <Info title="Applicable Policy" rows={[['Policy', item.policy.name], ['Academic Year', item.policy.academicYear], ['Effective Period', range(item.policy.from, item.policy.to)]]} />
              <BalanceTable employee={employee} policy={item.policy} leaveTypes={leaveTypes} getBalance={getBalance} />
            </>
          ) : (
            <><Info title="Applicable Policy" rows={[['Not Assigned', 'No active leave policy is applicable to this employee.']]} /><BalanceTable employee={employee} policy={null} leaveTypes={leaveTypes} getBalance={getBalance} /></>
          )}
        </>
      ) : isPolicy ? (
        <>
          <h2>{item.name} <Status value={item.status} /></h2>
          <Info title="Policy Information" rows={[['Academic Year', item.academicYear], ['Applicable To', item.applicableTo], ['Branch Scope', item.departments?.length ? item.departments.join(', ') : 'All Branches'], ['Effective Period', range(item.from, item.to)]]} />
          <section className="flm-view-section">
            <h3>Leave Entitlements</h3>
            <table className="flm-dialog-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Code</th>
                  <th>Pay Type</th>
                  <th>Entitled</th>
                  <th>Max / Request</th>
                  <th>Carry Forward</th>
                  <th>Document</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const displayRules = policyEntitlements.length > 0
                    ? policyEntitlements
                    : leaveTypes.filter(type => type.status === 'Active').map(type => ({
                        typeId: type.id,
                        name: type.name,
                        code: type.code,
                        payCategory: type.payCategory,
                        entitlement: 12,
                        maxDays: '—',
                        carryForward: false,
                        documentRequired: false
                      }))
                  if (!displayRules.length) {
                    return <tr><td colSpan={7}>No leave entitlements are configured for this policy.</td></tr>
                  }
                  return displayRules.map(rule => {
                    const leaveType = leaveTypes.find(type => String(type.id) === String(rule.typeId))
                    return (
                      <tr key={rule.typeId || rule.name}>
                        <td>{leaveType?.name || rule.name || 'Unavailable'}</td>
                        <td>{leaveType?.code || rule.code || '—'}</td>
                        <td>{leaveType?.payCategory || rule.payCategory || 'Paid Leave'}</td>
                        <td>{rule.entitlement ?? 12}</td>
                        <td>{rule.maxDays != null && rule.maxDays !== '' ? rule.maxDays : '—'}</td>
                        <td>{rule.carryForward ? 'Yes' : 'No'}</td>
                        <td>{rule.documentRequired ? 'Yes' : 'No'}</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </section>
        </>
      ) : isType ? (
        <>
          <h2>{item.name} <Status value={item.status} /></h2>
          <Info title="General Information" rows={[['Leave Type', item.name], ['Leave Code', item.code], ['Category', item.category || 'Regular'], ['Pay Category', item.payCategory], ['Status', item.status], ['Description', item.description || 'No description provided.']]} />
        </>
      ) : (
        <>
                    <LeaveInfo title="REQUEST INFORMATION" rows={[['Request ID', item.id], ['Leave Type', leaveTypes.find(type => type.id === item.typeId)?.name || item.leaveTypeName || 'Unavailable'], ['Applied On', dateLabel(item.applied)], ['Policy', policies.find(policy => policy.id === item.policyId)?.name || 'Not Assigned']]} />
          <LeaveInfo title="LEAVE PERIOD" columns={3} rows={[['From', dateLabel(item.from)], ['To', dateLabel(item.to)], ['Duration', `${item.days} Days`]]} />
          <div className="preview-section-group">
            <span className="preview-section-title">REMARKS</span>
            <p className="fm-view-reason" style={{ margin: 0, padding: '10px 12px', background: 'var(--surface-soft, #F8FAFC)', border: '1px solid var(--border, #E2E8F0)', borderRadius: '8px', fontSize: '14px', color: 'var(--text-primary, #334155)' }}>{item.reason}</p>
          </div>
          {item.decisionDate && <LeaveInfo title="DECISION DETAILS" columns={2} rows={[['Decision Date', dateLabel(item.decisionDate)], ...(item.rejectionReason ? [['Rejection Reason', item.rejectionReason]] : [])]} />}
          {item.status === 'Pending' && onDecision && (
            <footer className="flm-view-actions">
              <button type="button" className="reject-action" onClick={() => { onClose(); onDecision(item, 'Rejected'); }}>Reject Request</button>
              <button type="button" className="approve-action" onClick={() => { onClose(); onDecision(item, 'Approved'); }}>Approve Request</button>
            </footer>
          )}
        </>
      )}
    </View>
  )
}

function TypeDialog({ item = {}, onClose, onSave, page = false }) {
  const [data, setData] = useState({ name: item.name || '', code: item.code || '', payCategory: item.payCategory || '', description: item.description || '', status: item.status || '' });
  const [error, setError] = useState('');
  const save = async () => {
    setError('')
    if (!data.name.trim() || !data.code.trim() || !data.payCategory || !data.status) {
      setError('Complete all required fields before saving.')
      return
    }
    await onSave({ ...item, ...data })
  };
  return (
    <Modal title={item.id ? 'Edit Leave Type' : 'Add Leave Type'} onClose={onClose} page={page}>
      <div className={page ? 'flm-type-layout' : 'flm-type-modal-layout'}>
        <Form className={page ? 'flm-config-form flm-type-form-card' : undefined}>
          <Input label="Leave Type Name *" value={data.name} onChange={value => setData({ ...data, name: value })} />
          <Input label="Leave Code *" value={data.code} onChange={value => setData({ ...data, code: value })} />
          <Select label="Pay Category *" value={data.payCategory} values={['Paid Leave', 'Unpaid Leave']} placeholder="Select pay category" onChange={value => setData({ ...data, payCategory: value })} />
          <Select label="Status *" value={data.status} values={['Active', 'Inactive']} placeholder="Select status" onChange={value => setData({ ...data, status: value })} />
          <label>Description<textarea value={data.description} onChange={event => setData({ ...data, description: event.target.value })} /></label>
          <Footer>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" className="approve-action" onClick={save}>Save Leave Type</button>
          </Footer>
        </Form>
        <aside className="sm-preview" aria-label="Leave Type Live Preview" style={{ marginTop: '12px' }}>
          <header className="preview-top-bar" style={{ marginBottom: '8px' }}>
            <span className="preview-live-tag"><span className="live-dot" /> LIVE PREVIEW</span>
            <span className="preview-sync-hint">Real-time sync</span>
          </header>
          {(() => {
            const sections = [
              {
                title: 'Leave Type Summary',
                fields: [
                  ['Leave Type', data.name],
                  ['Code', data.code],
                  ['Pay Category', data.payCategory],
                  ['Status', data.status],
                  ['Description', data.description],
                ],
              },
            ].map(sec => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-'),
            })).filter(sec => sec.fields.length > 0)

            if (sections.length === 0) {
              return (
                <div className="preview-empty-hint">
                  <span>Enter details in the form to preview here in real time.</span>
                </div>
              )
            }

            return sections.map(sec => (
              <div key={sec.title} className="preview-section-group">
                <span className="preview-section-title">{sec.title}</span>
                <div className="preview-kv-grid">
                  {sec.fields.map(([label, text]) => (
                    <div key={label} className="preview-kv-item" style={label === 'Description' ? { gridColumn: 'span 2' } : {}}>
                      <span className="kv-label">{label}</span>
                      <strong className="kv-val" title={String(text).trim()}>{String(text).trim()}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </aside>
      </div>
      {error && <p className="flm-error">{error}</p>}
    </Modal>
  );
}

function ToggleTypeDialog({ item, onClose, onConfirm }) {
  const isDeactivating = item.status === 'Active'
  return (
    <Modal title={isDeactivating ? 'Deactivate / Delete Leave Type' : 'Activate Leave Type'} onClose={onClose}>
      <p style={{ margin: '14px 0', fontSize: '13px', lineHeight: 1.5 }}>
        {isDeactivating ? (
          <>Are you sure you want to deactivate/delete <strong>{item.name} ({item.code})</strong>? It will no longer be available for faculty leave requests.</>
        ) : (
          <>Activate <strong>{item.name} ({item.code})</strong> for faculty leave policies and requests?</>
        )}
      </p>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button className={isDeactivating ? 'reject-action' : 'approve-action'} onClick={() => onConfirm(item)}>
          {isDeactivating ? 'Deactivate / Delete' : 'Activate'}
        </button>
      </Footer>
    </Modal>
  )
}

function PolicyDialog({ item = {}, leaveTypes, academicYears, onClose, onSave }) {
  const activeYear = academicYears.find(year => year.name === item.academicYear) || academicYears[0]
  const initialEntitlements = (item.entitlements || []).map(e => ({ ...e, typeId: String(e.typeId || e.leaveTypeId || '') }))
  const [data, setData] = useState({
    name: item.name || '',
    academicYear: activeYear?.name || '',
    applicableTo: item.applicableTo || '',
    from: item.from || activeYear?.from || '',
    to: item.to || activeYear?.to || '',
    departments: item.departments || [],
    entitlements: initialEntitlements
  })
  useEffect(() => {
    if (!academicYears.length) return
    const selectedYear = academicYears.find(year => year.name === data.academicYear) || academicYears[0]
    if (!selectedYear) return
    setData(current => ({
      ...current,
      academicYear: selectedYear.name,
      from: selectedYear.from || current.from,
      to: selectedYear.to || current.to,
    }))
  }, [academicYears, data.academicYear])
  const toggle = type => setData(current => ({
    ...current,
    entitlements: current.entitlements.some(rule => String(rule.typeId) === String(type.id))
      ? current.entitlements.filter(rule => String(rule.typeId) !== String(type.id))
      : [...current.entitlements, { typeId: String(type.id), entitlement: '', maxDays: '', carryForward: false, maxCarryForward: '', documentRequired: false }]
  }))
  return (
    <Modal title={item.id ? 'Edit Leave Policy' : 'Create Leave Policy'} onClose={onClose}>
      <Form>
        <Input label="Policy Name *" value={data.name} onChange={value => setData({ ...data, name: value })} />
        <label>
          <span>Academic Year <b className="required-mark">*</b></span>
          <ProjectSelect value={data.academicYear} onChange={event => {
            const year = academicYears.find(option => option.name === event.target.value)
            setData({ ...data, academicYear: event.target.value, from: year?.from || '', to: year?.to || '' })
          }}>
            {!data.academicYear && <option value="">{academicYears.length ? 'Select active academic year' : 'No active academic year available'}</option>}
            {academicYears.map(year => <option key={year.name} value={year.name}>{year.name}</option>)}
          </ProjectSelect>
        </label>
        <Select label="Applicable To" value={data.applicableTo} placeholder="Select applicable to" values={['Teaching', 'Non-Teaching', 'Both']} onChange={value => setData({ ...data, applicableTo: value })} />
      </Form>
      <h3>Leave Entitlements</h3>
      <div className="flm-table-wrap" style={{ margin: '10px 0 15px', border: '1px solid var(--flm-line)', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="flm-dialog-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>Enable</th>
              <th>Leave Type</th>
              <th style={{ width: '120px' }}>Entitled (Days)</th>
              <th style={{ width: '120px' }}>Max / Request</th>
              <th style={{ width: '100px' }}>Carry Forward</th>
              <th style={{ width: '110px' }}>Document</th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes.filter(type => type.status === 'Active').map(type => {
              const rule = data.entitlements.find(value => String(value.typeId) === String(type.id))
              const isEnabled = Boolean(rule)
              return (
                <tr key={type.id} style={{ background: isEnabled ? 'transparent' : 'var(--flm-soft)' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={isEnabled} onChange={() => toggle(type)} />
                  </td>
                  <td>
                    <strong>{type.name}</strong> <small style={{ color: 'var(--text-muted)' }}>({type.code || type.payCategory})</small>
                  </td>
                  <td>
                    {isEnabled ? (
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 12"
                        value={rule.entitlement ?? ''}
                        style={{ width: '100%', height: '32px', padding: '0 8px', border: '1px solid var(--border-strong)', borderRadius: '5px' }}
                        onChange={event => setData({
                          ...data,
                          entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, entitlement: event.target.value === '' ? '' : Number(event.target.value) } : value)
                        })}
                      />
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {isEnabled ? (
                      <input
                        type="number"
                        min="0"
                        placeholder="Max days"
                        value={rule.maxDays ?? ''}
                        style={{ width: '100%', height: '32px', padding: '0 8px', border: '1px solid var(--border-strong)', borderRadius: '5px' }}
                        onChange={event => setData({
                          ...data,
                          entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, maxDays: event.target.value === '' ? '' : Number(event.target.value) } : value)
                        })}
                      />
                    ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                  </td>
                  <td>
                    {isEnabled ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(rule.carryForward)}
                          onChange={event => setData({
                            ...data,
                            entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, carryForward: event.target.checked } : value)
                          })}
                        />
                        <span>Yes</span>
                      </label>
                    ) : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                  </td>
                  <td>
                    {isEnabled ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(rule.documentRequired)}
                          onChange={event => setData({
                            ...data,
                            entitlements: data.entitlements.map(value => String(value.typeId) === String(type.id) ? { ...value, documentRequired: event.target.checked } : value)
                          })}
                        />
                        <span>Required</span>
                      </label>
                    ) : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button className="approve-action" disabled={!data.name || !data.academicYear || !data.applicableTo || !data.entitlements.length} onClick={() => onSave({ ...item, ...data })}>
          {item.id ? 'Save Changes' : 'Create Policy'}
        </button>
      </Footer>
    </Modal>
  )
}
function RequestLeaveDialog({ faculty, leaveTypes, policies, onClose, onSave }) {
  const [data, setData] = useState({
    facultyId: '',
    leaveTypeId: '',
    policyId: '',
    fromDate: '',
    toDate: '',
    days: '',
    reason: ''
  })
  const [error, setError] = useState('')
  const selectedFaculty = faculty.find(f => String(f.id) === String(data.facultyId))
  const availableLeaveTypes = selectedFaculty ? eligibleLeaveTypes(leaveTypes, selectedFaculty) : []

  useEffect(() => {
    if (!data.leaveTypeId) return
    if (availableLeaveTypes.some(type => String(type.id) === String(data.leaveTypeId))) return
    setData(current => ({ ...current, leaveTypeId: '' }))
  }, [data.facultyId, data.leaveTypeId, availableLeaveTypes])

  const handleDateChange = (key, val) => {
    setData(prev => {
      const updated = { ...prev, [key]: val }
      if (updated.fromDate && updated.toDate && updated.toDate >= updated.fromDate) {
        const d1 = new Date(`${updated.fromDate}T00:00:00`)
        const d2 = new Date(`${updated.toDate}T00:00:00`)
        const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1)
        updated.days = diff
      }
      return updated
    })
  }

  const handleFacultyChange = (id) => {
    const selected = faculty.find(f => String(f.id) === String(id))
    const applicablePolicy = selected ? policies.find(p => p.status === 'Active' && (p.applicableTo === 'Both' || p.applicableTo === (selected.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'))) : null
    setData(prev => ({
      ...prev,
      facultyId: id,
      policyId: applicablePolicy?.id || prev.policyId || policies[0]?.id || ''
    }))
  }

  const handleSubmit = async () => {
    if (!data.facultyId) { setError('Please select a faculty member.'); return }
    if (!data.leaveTypeId) { setError('Please select a leave type.'); return }
    if (!data.fromDate || !data.toDate) { setError('Please enter valid dates.'); return }
    if (data.fromDate > data.toDate) { setError('From date must be before or equal to To date.'); return }
    if (!data.reason.trim()) { setError('Please enter a reason for leave.'); return }
    setError('')
    await onSave(data)
  }

  return (
    <Modal title="Apply for Leave" onClose={onClose}>
      <Form>
        <label>
          <span>Faculty Member <b className="required-mark">*</b></span>
          <ProjectSelect value={data.facultyId} onChange={e => handleFacultyChange(e.target.value)}>
            <option value="">Select Faculty</option>
            {faculty.map(f => (
              <option key={f.id} value={f.id}>
                {f.fullName || f.name} ({f.employeeId || f.code || f.id})
              </option>
            ))}
          </ProjectSelect>
        </label>
        <label>
          <span>Leave Type <b className="required-mark">*</b></span>
          <ProjectSelect value={data.leaveTypeId} onChange={e => setData({ ...data, leaveTypeId: e.target.value })}>
            <option value="">Select Leave Type</option>
            {availableLeaveTypes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code || t.category || t.payCategory})
              </option>
            ))}
          </ProjectSelect>
        </label>
        <label>
          <span>Policy</span>
          <ProjectSelect value={data.policyId} onChange={e => setData({ ...data, policyId: e.target.value })}>
            <option value="">Select Policy</option>
            {policies.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.academicYear || p.status})
              </option>
            ))}
          </ProjectSelect>
        </label>
        <Input label="From Date *" type="date" value={data.fromDate} onChange={v => handleDateChange('fromDate', v)} />
        <Input label="To Date *" type="date" value={data.toDate} onChange={v => handleDateChange('toDate', v)} />
        <Input label="Total Days *" type="number" value={data.days} onChange={v => setData({ ...data, days: Number(v) || 1 })} />
        <label>
          <span>Reason <b className="required-mark">*</b></span>
          <textarea value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} placeholder="Reason for leave request..." />
        </label>
        <aside className="sm-preview" aria-label="Leave Request Live Preview" style={{ marginTop: '12px' }}>
          <header className="preview-top-bar" style={{ marginBottom: '8px' }}>
            <span className="preview-live-tag"><span className="live-dot" /> LIVE PREVIEW</span>
            <span className="preview-sync-hint">Real-time sync</span>
          </header>
          {(() => {
            const facultyName = selectedFaculty?.fullName || selectedFaculty?.name
            const typeName = leaveTypes.find(t => String(t.id) === String(data.leaveTypeId))?.name
            const policyName = policies.find(p => String(p.id) === String(data.policyId))?.name
            const period = [data.fromDate, data.toDate].filter(Boolean).join(' to ')

            const sections = [
              {
                title: 'Leave Request Summary',
                fields: [
                  ['Faculty Member', facultyName],
                  ['Leave Type', typeName],
                  ['Policy', policyName],
                  ['Leave Period', period],
                  ['Total Days', data.days ? `${data.days} Days` : ''],
                  ['Reason', data.reason],
                ],
              },
            ].map(sec => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-'),
            })).filter(sec => sec.fields.length > 0)

            if (sections.length === 0) {
              return (
                <div className="preview-empty-hint">
                  <span>Enter details in the form to preview here in real time.</span>
                </div>
              )
            }

            return sections.map(sec => (
              <div key={sec.title} className="preview-section-group">
                <span className="preview-section-title">{sec.title}</span>
                <div className="preview-kv-grid">
                  {sec.fields.map(([label, text]) => (
                    <div key={label} className="preview-kv-item" style={label === 'Reason' ? { gridColumn: 'span 2' } : {}}>
                      <span className="kv-label">{label}</span>
                      <strong className="kv-val" title={String(text).trim()}>{String(text).trim()}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </aside>
      </Form>
      {error && <p className="flm-error">{error}</p>}
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button className="approve-action" onClick={handleSubmit}>Submit Request</button>
      </Footer>
    </Modal>
  )
}

function ActivationDialog({ policy, status = 'Active', onClose, onActivate }) { const activating = status === 'Active'; return <Modal title={`${activating ? 'Activate' : 'Deactivate'} Leave Policy`} onClose={onClose}><p>{activating ? 'Activate' : 'Deactivate'} <strong>{policy.name}</strong> for {policy.applicableTo} employees?</p><Footer><button onClick={onClose}>Cancel</button><button className={activating ? 'approve-action' : 'reject-action'} onClick={() => onActivate(policy, status)}>{activating ? 'Activate Policy' : 'Deactivate Policy'}</button></Footer></Modal> }
function DecisionDialog({ request, status, onClose, onSave }) { const [reason, setReason] = useState(''); const reject = status === 'Rejected'; return <Modal title={reject ? 'Reject Leave Request' : 'Approve Leave Request?'} onClose={onClose}>{reject && <label><span>Reason for Rejection <b className="required-mark">*</b></span><textarea value={reason} onChange={event => setReason(event.target.value)} /></label>}<Footer><button onClick={onClose}>Cancel</button><button className={reject ? 'reject-action' : 'approve-action'} disabled={reject && reason.trim().length < 3} onClick={() => onSave(request, status, reason)}>Confirm</button></Footer></Modal> }
function BalanceTable({ employee, policy, leaveTypes, getBalance }) {
  const balance = getBalance(employee, policy)
  const rules = leaveBalanceRules(balance, policy).filter(rule => {
    const leaveType = leaveTypes.find(type => String(type.id) === String(rule.typeId)) || rule
    return !genderRestrictedLeave(leaveType) || String(employee?.gender || '').trim().toLowerCase() === genderRestrictedLeave(leaveType)
  })

  return (
    <section className="flm-view-section">
      <Info title="Balance Totals" rows={['entitled', 'used', 'pending', 'available'].map(key => [key[0].toUpperCase() + key.slice(1), balance.totals[key] ?? 'Not provided'])} />
      <h3>Leave Type Balances</h3>
      {!balance.details.length && <p>The API has not provided a breakdown by leave type.</p>}
      <table className="flm-dialog-table">
        <thead>
          <tr>
            <th>Leave Type</th>
            <th>Entitled</th>
            <th>Used</th>
            <th>Pending</th>
            <th>Available</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(rule => {
            const totals = getBalance(employee, policy, rule.typeId)
            const typeInfo = leaveTypes.find(type => String(type.id) === String(rule.typeId))
            const typeName = typeInfo?.name || rule.leaveTypeName || rule.name || rule.typeId
            // A missing type-level balance means no usage was supplied by the
            // API. Render a consistent zero balance instead of ambiguous ?.
            const entitled = totals?.entitled ?? rule.entitlement ?? 0
            const used = totals?.used ?? 0
            const pending = totals?.pending ?? 0
            const available = totals?.available ?? Math.max(0, Number(entitled) - Number(used) - Number(pending))
            return (
              <tr key={rule.typeId}>
                <td>{typeName} ({typeInfo?.code || '-'})</td>
                <td>{entitled}</td>
                <td>{used}</td>
                <td>{pending}</td>
                <td>{available}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
function View({ title, children, onClose }) {
  return (
    <div className="flm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="fm-attendance-detail flm-config-dialog" role="dialog" aria-modal="true" style={{ maxWidth: '860px', width: '100%', overflowY: 'auto', maxHeight: 'calc(100dvh - 48px)', padding: '24px', borderRadius: '16px', background: 'var(--surface, #fff)' }} onClick={e => e.stopPropagation()}>
        <div className="fm-attendance-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <p className="flm-eyebrow" style={{ margin: '0 0 2px 0', color: '#125AA8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>LEAVE DETAILS</p>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          </div>
          <button className="flm-close" style={{ position: 'static', margin: 0, right: 'auto', top: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close" onClick={onClose}><FiX size={18} /></button>
        </div>
        <div className="flm-view-body" style={{ display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </section>
    </div>
  )
}

function Identity({ employee, status }) {
  return (
    <div className="cm-profile-banner fm-attendance-identity-hero">
      <div className="cm-profile-avatar-wrap">
        <div className="fm-avatar fm-avatar-large">
          {initials(employee?.fullName)}
        </div>
      </div>
      <div className="cm-profile-header-info">
        <div className="cm-profile-badges">
          {employee?.employeeId && <span className="cm-badge">{employee.employeeId}</span>}
          {typeOf(employee) && <span className="cm-badge">{typeOf(employee)}</span>}
        </div>
        <h2 className="cm-profile-title">{employee?.fullName}</h2>
        <p className="cm-profile-subtitle">{employee?.designation || 'Faculty'} | {branchOf(employee)}</p>
      </div>
      <div className="fm-attendance-detail-status">
        <span className={`flm-status ${statusClass(status)}`} style={{ background: '#fff', color: status === 'Approved' ? '#16a34a' : status === 'Pending' ? '#d97706' : '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', fontWeight: 'bold' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
          {status}
        </span>
      </div>
    </div>
  )
}
function Info({ title, rows, columns = 2 }) { return <section className="flm-view-section"><h3>{title}</h3><div className={`flm-info-grid flm-info-grid--${columns}`}>{rows.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></section> }
function DataTable({ headers, children }) { return <div className="flm-table-wrap"><table className="flm-table"><thead><tr>{headers.map(header => { const label = header === 'Department' ? 'Branch' : header; return <th key={label}>{label}</th> })}</tr></thead><tbody>{children}</tbody></table></div> }
function Employee({ employee }) { return <div className="flm-employee"><span>{initials(employee.fullName)}</span><div><strong>{employee.fullName}</strong><small>{employee.employeeId}</small></div></div> }
function Actions({ children }) { return <div className="flm-actions">{children}</div> }
function Action({ title, children, onClick }) { return <button type="button" title={title} aria-label={title} onClick={onClick}>{children}</button> }
function Status({ value }) { return <span className={`flm-status ${statusClass(value)}`}>{value}</span> }
const renderFlmLabel = label => {
  if (typeof label === 'string' && label.endsWith(' *')) {
    return <>{label.slice(0, -2)} <b className="required-mark" aria-hidden="true">*</b></>
  }
  if (typeof label === 'string' && label.endsWith('*')) {
    return <>{label.slice(0, -1).trim()} <b className="required-mark" aria-hidden="true">*</b></>
  }
  return label
}
function FilterSelect({ label, value, values, onChange }) { const displayLabel = label === 'Department' ? 'Branch' : label; const plural = displayLabel === 'Branch' ? 'Branches' : `${displayLabel}s`; return <label className="flm-filter-field"><span>{displayLabel}</span><ProjectSelect value={value} onChange={event => onChange(event.target.value)}><option value="">All {plural}</option>{values.map(item => <option key={item}>{item}</option>)}</ProjectSelect></label> }
function Select({ label, value, values, onChange, placeholder }) { return <label><span>{renderFlmLabel(label)}</span><ProjectSelect value={value} onChange={event => onChange(event.target.value)}>{placeholder && <option value="">{placeholder}</option>}{values.map(item => <option key={item}>{item}</option>)}</ProjectSelect></label> }
function Modal({ title, children, onClose, page = false }) {
  if (page) return <div className="flm-type-page-content">{children}</div>
  return <div className="flm-overlay"><section className="flm-decision-dialog flm-config-dialog" role="dialog" aria-modal="true"><button className="flm-close" aria-label="Close" onClick={onClose}><FiX /></button><p className="flm-eyebrow">FACULTY LEAVE</p><h2>{title}</h2>{children}</section></div>
}
function Form({ children, className }) { return <div className={className || 'flm-config-form'}>{children}</div> }
function Input({ label, type = 'text', value, onChange }) { return <label><span>{renderFlmLabel(label)}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} /></label> }
function Footer({ children }) { return <footer>{children}</footer> }
function LeaveInfo({ title, columns = 4, rows }) {
  return (
    <div className="preview-section-group">
      <span className="preview-section-title">{title}</span>
      <div className="preview-kv-grid" style={{ gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))" }}>

        {rows.map(([label, value]) => (
          <div className="preview-kv-item" key={label}>
            <span className="kv-label">{label}</span>
            <strong className="kv-val">{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

return { default: FacultyLeaveManagement }
})()

// FacultyManagement screen and private helpers.
const FacultyManagementScreen = (() => {
const { ProjectSelect } = pageDependency0
const { useAcademic } = pageDependency17
const useCollegeState = pageDependency7.default
const { useCallback, useEffect, useMemo, useRef, useState } = pageDependency1
const { Link, Navigate, useLocation, useNavigate } = pageDependency18
const { FiAlertCircle, FiArrowLeft, FiArrowRight, FiBriefcase, FiCheckCircle, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiFilter, FiPlus, FiSearch, FiUser, FiUsers, FiClock, FiBookOpen, FiMapPin, FiX, FiTrash2, FiFileText, FiShield, FiLock } = pageDependency4
const DashboardLayout = pageDependency8.default
const ExportMenu = pageDependency9.default
const FilterPanel = pageDependency19.default
const StatusBadge = pageDependency20.default
const TablePagination = pageDependency11.default
const SearchableSelect = pageDependency0.default
const CompactSummary = pageDependency21.default
const InfoCard = pageDependency22.default
const { academicYearApi, branchApi, courseApi, departmentApi, facultyMasterApi, sectionApi } = pageDependency3
const { attendancePayload, requiredNumber } = pageDependency12
const { downloadServerExport } = pageDependency23
const { getDefaultAcademicYear } = pageDependency24
const { normalizeFaculty, mergeFacultyData, resolveFacultyPhoto, clearFacultyLocalStorage, saveLocalAttendanceRecord } = pageDependency2
const facultyService = pageDependency2.default
const subjectService = pageDependency25.default
const { localAttendanceDate, loadDailyAttendancePeriod, attendanceStatusLabel, normalizeAttendanceRow, combineAttendance, attendanceFacultyMap } = pageDependency26
const { showSuccess, showError, showWarning, showInfo } = pageDependency15

const PAGE_SIZE = 5
const WORKLOAD_LIMITS = { under: 12, normal: 20 }
const statuses = ['Working', 'On Leave', 'Resigned', 'Retired']
const teachingDesignations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Senior Lecturer', 'Lecturer', 'Visiting Faculty', 'Guest Faculty', 'HOD', 'Dean']
const nonTeachingDesignations = ['Librarian', 'Assistant Librarian', 'Lab Assistant', 'Lab Technician', 'System Administrator', 'Network Administrator', 'Accountant', 'Administrative Officer', 'Office Assistant', 'Junior Assistant', 'Store Keeper', 'Technical Assistant', 'Clerk', 'Attender']
const designations = [...teachingDesignations, ...nonTeachingDesignations]
const employmentTypes = ['Permanent', 'Contract', 'Visiting', 'Guest']

const getStoredDesignations = () => {
  try {
    const saved = localStorage.getItem('pirnav_erp_rbac_designations_clean_v1')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch { /* ignore */ }
  return []
}

const getDesignationOptions = (category) => {
  const stored = getStoredDesignations()
  const customTeaching = stored
    .filter(d => d.status !== 'Inactive' && (d.category === 'Teaching' || d.category === 'Academic' || !d.category))
    .map(d => d.title || d.name)
    .filter(Boolean)
  const customNonTeaching = stored
    .filter(d => d.status !== 'Inactive' && (d.category === 'Non-Teaching' || d.category === 'Administrative' || d.category === 'Technical' || d.category === 'Other'))
    .map(d => d.title || d.name)
    .filter(Boolean)

  if (category === 'Teaching') {
    return [...new Set([...customTeaching, ...teachingDesignations])]
  }
  if (category === 'Non-Teaching') {
    return [...new Set([...customNonTeaching, ...nonTeachingDesignations])]
  }
  const allStored = stored.filter(d => d.status !== 'Inactive').map(d => d.title || d.name).filter(Boolean)
  return [...new Set([...allStored, ...teachingDesignations, ...nonTeachingDesignations])]
}

// employeeCategory is a UI-only value in the current API. Always derive it
// from persisted data as well, so a non-teaching staff member never moves to
// the teaching directory after the page reloads.
const employeeCategoryOf = (row = {}) => {
  const raw = String(row.employeeCategory ?? row.employee_category ?? row.EmployeeCategory ?? row.category ?? row.facultyType ?? '').trim().toLowerCase()
  if (/non[-\s]?teaching/.test(raw) || raw === 'others' || raw === 'other') return 'Non-Teaching'
  if (raw === 'teaching') return 'Teaching'
  const designation = String(row.designation ?? row.Designation ?? row.designationName ?? row.DesignationName ?? row.role ?? '').trim().toLowerCase()

  const stored = getStoredDesignations()
  const matchedStored = stored.find(d => (d.title || d.name || '').trim().toLowerCase() === designation)
  if (matchedStored) {
    const cat = matchedStored.category
    if (cat === 'Teaching' || cat === 'Academic') return 'Teaching'
    if (cat === 'Non-Teaching' || cat === 'Administrative' || cat === 'Technical') return 'Non-Teaching'
  }

  const isTeaching = getDesignationOptions('Teaching').some(value => value.toLowerCase() === designation)
  if (isTeaching) return 'Teaching'
  const exactNonTeaching = getDesignationOptions('Non-Teaching').some(value => value.toLowerCase() === designation)
  if (exactNonTeaching) return 'Non-Teaching'
  return /\b(librar|lab|system|network|account|administrat|office|junior assistant|store|technical assistant|clerk|attender|warden|security|driver|electrician|plumber|staff|non[-\s]?teaching)\b/i.test(designation)
    ? 'Non-Teaching'
    : 'Teaching'
}
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'LOP', 'Not Marked']
const ATTENDANCE_PERCENTAGE_NOTE = 'Attendance percentage is calculated using marked attendance records only.'
const today = () => localAttendanceDate(new Date())
const formatMinutes = minutes => {
  const total = Number(minutes) || 0
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (!hours && !mins) return '0h'
  if (!mins) return `${hours}h`
  return `${hours}h ${mins}m`
}
const formatTimeView = value => {
  if (!value || value === '—' || value === '') return '—'
  const str = String(value).trim()
  if (/^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM)$/i.test(str)) return str
  const [hourText, minuteText] = str.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText || 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
}
const normalizeAttendanceDate = value => {
  if (!value) return ''
  const valueString = String(value).trim()
  if (!valueString) return ''
  const clean = valueString.includes('T') ? valueString.split('T')[0] : valueString
  const [year, month, day] = clean.split('-')
  if (!year || !month || !day) return clean
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
const normalizeAttendanceStatus = value => {
  const key = String(value ?? '').trim().replace(/[\s_-]+/g, '').toLowerCase()
  const statuses = {
    p: 'Present', present: 'Present',
    a: 'Absent', absent: 'Absent',
    l: 'Late', late: 'Late',
    hd: 'Half Day', halfday: 'Half Day',
    ol: 'On Leave', onleave: 'On Leave', leave: 'On Leave',
    lop: 'LOP', lossofpay: 'LOP',
    notmarked: 'Not Marked', unmarked: 'Not Marked', pending: 'Not Marked',
  }
  return statuses[key] || 'Not Marked'
}
const mergeAttendanceRecords = (faculty, records = []) => {
  const facultyMap = attendanceFacultyMap(faculty || [])
  const statusPriority = { Present: 5, Late: 4, 'Half Day': 4, 'On Leave': 3, LOP: 3, Absent: 2, 'Not Marked': 1 }

  const normalized = (Array.isArray(records) ? records : []).map(record => {
    const rawFacId = String(
      record.facultyId ??
      record.FacultyId ??
      record.faculty?.facultyId ??
      record.faculty?.FacultyId ??
      record.faculty?.id ??
      record.faculty?.Id ??
      record.employeeProfileId ??
      record.EmployeeProfileId ??
      ''
    )
    const matchedCanonicalId = facultyMap.get(rawFacId) || rawFacId
    const status = normalizeAttendanceStatus(record.status ?? record.attendanceStatus ?? record.Status ?? record.AttendanceStatus)
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defIn = status === 'Late' ? '09:30' : isWorking ? '09:00' : ''
    const defOut = status === 'Half Day' ? '13:00' : isWorking ? '17:00' : ''
    const checkIn = (record.checkIn && record.checkIn !== '—' && record.checkIn !== '') ? record.checkIn : (record.CheckIn || record.checkInTime || record.CheckInTime || (isWorking ? defIn : '—'))
    const checkOut = (record.checkOut && record.checkOut !== '—' && record.checkOut !== '') ? record.checkOut : (record.CheckOut || record.checkOutTime || record.CheckOutTime || (isWorking ? defOut : '—'))
    return {
      ...record,
      facultyId: matchedCanonicalId,
      date: normalizeAttendanceDate(record.attendanceDate ?? record.date ?? record.Date),
      status,
      checkIn,
      checkOut,
      remarks: record.remarks || record.Remarks || '—',
      source: record.source || 'Manual',
    }
  })

  const byFacultyAndDate = new Map()
  for (const record of normalized) {
    const key = `${record.facultyId}|${record.date}`
    const current = byFacultyAndDate.get(key)
    if (!current) {
      byFacultyAndDate.set(key, record)
    } else {
      const curPriority = statusPriority[current.status] || 0
      const recPriority = statusPriority[record.status] || 0
      const bestStatus = (record.status && record.status !== 'Not Marked') ? record.status : (current.status || record.status || 'Not Marked')
      const attId = record.attendanceId || current.attendanceId || null
      byFacultyAndDate.set(key, {
        ...current,
        ...record,
        attendanceId: attId,
        id: attId || record.id || current.id || '',
        status: bestStatus,
        checkIn: (record.checkIn && record.checkIn !== '—' && record.checkIn !== '') ? record.checkIn : current.checkIn,
        checkOut: (record.checkOut && record.checkOut !== '—' && record.checkOut !== '') ? record.checkOut : current.checkOut,
        remarks: (record.remarks && record.remarks !== '—' && record.remarks !== '') ? record.remarks : current.remarks,
      })
    }
  }
  return [...byFacultyAndDate.values()]
}
const attendanceDatesInRange = (from, to) => {
  if (!from || !to || from > to) return []
  const values = []
  for (const value = new Date(`${from}T00:00:00`); value <= new Date(`${to}T00:00:00`); value.setDate(value.getDate() + 1)) {
    values.push(normalizeAttendanceDate(value.toISOString().slice(0, 10)))
  }
  return values
}
const mondayOf = value => {
  const date = new Date(String(value || today()) + 'T00:00:00')
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
const parseTimeToMinutes = timeStr => {
  if (!timeStr || timeStr === '—' || timeStr === '') return null
  const str = String(timeStr).trim()
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let hour = parseInt(match12[1], 10)
    const minute = parseInt(match12[2], 10)
    const meridian = match12[3].toUpperCase()
    if (meridian === 'PM' && hour < 12) hour += 12
    if (meridian === 'AM' && hour === 12) hour = 0
    return hour * 60 + minute
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (match24) {
    const hour = parseInt(match24[1], 10)
    const minute = parseInt(match24[2], 10)
    return hour * 60 + minute
  }
  return null
}

const calculateWorkingMinutes = values => {
  if (!values || values.status === 'Not Marked' || ['Absent', 'On Leave', 'LOP'].includes(values.status)) return 0
  const checkInValue = values.rawCheckIn || values.checkIn || values.checkInTime || values.CheckInTime || ''
  const checkOutValue = values.rawCheckOut || values.checkOut || values.checkOutTime || values.CheckOutTime || ''
  const start = parseTimeToMinutes(checkInValue)
  const end = parseTimeToMinutes(checkOutValue)
  if (start !== null && end !== null && end > start) {
    return end - start
  }
  return 0
}

const getAttendanceDisplayHours = row => {
  if (!row || !['Present', 'Late', 'Half Day'].includes(row.status)) return '—'
  const explicitMinutes = Number(row.workingMinutes)
  const minutes = (Number.isFinite(explicitMinutes) && explicitMinutes > 0) ? explicitMinutes : calculateWorkingMinutes(row)
  return minutes > 0 ? formatMinutes(minutes) : '—'
}
const resolveAttendanceRecords = (records, faculty) => {
  const facultyMap = new Map((faculty || []).map(item => [String(item.id), item]))
  return mergeAttendanceRecords(faculty, records).map(record => {
    const matched = facultyMap.get(String(record.facultyId)) || (faculty || []).find(item =>
      String(item.id) === String(record.facultyId) ||
      String(item.facultyId) === String(record.facultyId) ||
      (item.employeeId && (record.employeeId === item.employeeId || record.facultyCode === item.employeeId || String(record.facultyId) === String(item.employeeId))) ||
      (item.facultyCode && (record.facultyCode === item.facultyCode || record.employeeId === item.facultyCode || String(record.facultyId) === String(item.facultyCode))) ||
      (item.employeeProfileId && (String(record.employeeProfileId) === String(item.employeeProfileId) || String(record.facultyId) === String(item.employeeProfileId)))
    ) || {
      id: record.facultyId,
      fullName: 'Unknown Faculty',
      employeeId: 'N/A',
      department: 'N/A',
      designation: 'N/A',
    }
    const status = normalizeAttendanceStatus(record.status ?? record.attendanceStatus)
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defaultCheckIn = status === 'Late' ? '09:30' : '09:00'
    const defaultCheckOut = status === 'Half Day' ? '13:00' : '17:00'
    const checkIn = isWorking ? (record.checkIn && record.checkIn !== '—' && record.checkIn !== '' ? record.checkIn : defaultCheckIn) : '—'
    const checkOut = isWorking ? (record.checkOut && record.checkOut !== '—' && record.checkOut !== '' ? record.checkOut : defaultCheckOut) : '—'
    const workingMinutes = typeof record.workingMinutes === 'number' && record.workingMinutes > 0 ? record.workingMinutes : calculateWorkingMinutes({ ...record, status, checkIn, checkOut })
    const hours = getAttendanceDisplayHours({ ...record, status, workingMinutes, checkIn, checkOut })
    return {
      ...record,
      faculty: matched,
      facultyId: String(record.facultyId),
      hours,
      workingMinutes,
      status,
      checkIn: formatTimeView(checkIn),
      checkOut: formatTimeView(checkOut),
      rawCheckIn: checkIn,
      rawCheckOut: checkOut,
      remarks: record.remarks || '—',
      source: record.source || 'Manual',
      synthetic: false,
    }
  })
}
const matchingDate = (rowDate, from, to) => {
  if (!rowDate) return true
  if (from && rowDate < from) return false
  if (to && rowDate > to) return false
  return true
}
const dailyAttendanceRows = (records, faculty, filters = {}) => {
  const targetDate = normalizeAttendanceDate(filters.date || today())
  const filteredRecords = (Array.isArray(records) ? records : []).filter(record => normalizeAttendanceDate(record.date || record.attendanceDate) === targetDate)
  return (faculty || []).filter(item => !filters.department || item.department === filters.department).map(item => {
    const facultyId = String(item.id)
    const matchingRecords = filteredRecords.filter(record =>
      String(record.facultyId) === facultyId ||
      String(record.faculty?.id) === facultyId ||
      String(record.faculty?.facultyId) === facultyId ||
      (item.facultyId && String(record.facultyId) === String(item.facultyId)) ||
      (item.employeeId && (record.employeeId === item.employeeId || record.facultyCode === item.employeeId || String(record.facultyId) === String(item.employeeId))) ||
      (item.facultyCode && (record.facultyCode === item.facultyCode || record.employeeId === item.facultyCode || String(record.facultyId) === String(item.facultyCode))) ||
      (item.employeeProfileId && (String(record.employeeProfileId) === String(item.employeeProfileId) || String(record.facultyId) === String(item.employeeProfileId)))
    )
    const statusPriority = { Present: 5, Late: 4, 'Half Day': 4, 'On Leave': 3, LOP: 3, Absent: 2, 'Not Marked': 1 }
    const current = [...matchingRecords].reverse().find(r => r.status && r.status !== 'Not Marked') || matchingRecords[matchingRecords.length - 1] || matchingRecords[0]
    const status = current?.status || 'Not Marked'
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defaultCheckIn = status === 'Late' ? '09:30' : '09:00'
    const defaultCheckOut = status === 'Half Day' ? '13:00' : '17:00'
    const rawCheckIn = isWorking ? (current?.rawCheckIn || (current?.checkIn && current.checkIn !== '—' && current.checkIn !== '' ? current.checkIn : defaultCheckIn)) : '—'
    const rawCheckOut = isWorking ? (current?.rawCheckOut || (current?.checkOut && current.checkOut !== '—' && current.checkOut !== '' ? current.checkOut : defaultCheckOut)) : '—'
    const workingMinutes = current?.workingMinutes ?? calculateWorkingMinutes({ ...current, status, checkIn: rawCheckIn, checkOut: rawCheckOut })
    const hours = getAttendanceDisplayHours({ ...current, status, workingMinutes, checkIn: rawCheckIn, checkOut: rawCheckOut })
    const row = {
      id: current?.attendanceId || current?.id || '',
      attendanceId: current?.attendanceId || null,
      facultyId,
      faculty: item,
      date: targetDate,
      status,
      checkIn: formatTimeView(rawCheckIn),
      checkOut: formatTimeView(rawCheckOut),
      rawCheckIn,
      rawCheckOut,
      remarks: current?.remarks || '—',
      hours,
      synthetic: !current?.attendanceId,
      source: current?.source || 'Manual',
    }
    return row
  }).filter(row => {
    const statusOk = !filters.status || row.status === filters.status
    const search = (filters.search || '').trim().toLowerCase()
    const text = `${row.faculty.employeeId} ${row.faculty.fullName}`.toLowerCase()
    const searchOk = !search || text.includes(search)
    return statusOk && searchOk
  })
}
const filterAttendanceRecords = (records, filters = {}) => {
  const search = (filters.search || '').trim().toLowerCase()
  return (Array.isArray(records) ? records : []).filter(row => {
    const faculty = row.faculty || {}
    const statusOk = !filters.status || row.status === filters.status
    const departmentOk = !filters.department || (faculty.department || '').toLowerCase() === String(filters.department).toLowerCase()
    const facultyOk = !filters.facultyId || String(row.facultyId) === String(filters.facultyId)
    const dateOk = matchingDate(String(row.date), filters.from, filters.to)
    const searchOk = !search || `${faculty.employeeId || ''} ${faculty.fullName || ''}`.toLowerCase().includes(search)
    return statusOk && departmentOk && facultyOk && dateOk && searchOk
  }).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
}
const attendancePeriod = (reportType, report) => {
  const dateValue = report?.date || today()
  if (reportType === 'daily') return { from: normalizeAttendanceDate(dateValue), to: normalizeAttendanceDate(dateValue) }
  if (reportType === 'weekly') {
    const start = new Date((report?.weekStart || mondayOf(today())) + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { from: normalizeAttendanceDate(localAttendanceDate(start)), to: normalizeAttendanceDate(localAttendanceDate(end)) }
  }
  const year = Number(report?.year || new Date().getFullYear())
  const month = Number(report?.month || new Date().getMonth() + 1)
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  return { from: normalizeAttendanceDate(localAttendanceDate(first)), to: normalizeAttendanceDate(localAttendanceDate(last)) }
}
const summarizeAttendance = rows => {
  const base = { total: rows.length, Present: 0, Absent: 0, Late: 0, 'Half Day': 0, 'On Leave': 0, LOP: 0, 'Not Marked': 0 }
  for (const row of rows || []) {
    const key = row.status || 'Not Marked'
    base[key] = (base[key] || 0) + 1
  }
  const marked = rows.filter(row => row.status && row.status !== 'Not Marked').length
  const counted = rows.filter(row => ['Present', 'Late', 'Half Day'].includes(row.status)).length
  const percentage = marked ? Math.round((counted / marked) * 100) : 0
  return { ...base, percentage: `${percentage}%`, hours: rows.reduce((sum, row) => sum + (Number(row.workingMinutes || 0) || 0), 0) }
}
const aggregateFacultyAttendance = (rows, label = '') => {
  const groups = new Map()
  for (const row of rows || []) {
    const key = String(row.facultyId)
    if (!groups.has(key)) {
      groups.set(key, {
        facultyId: key,
        faculty: row.faculty,
        total: 0,
        Present: 0,
        Absent: 0,
        Late: 0,
        'Half Day': 0,
        'On Leave': 0,
        LOP: 0,
        hours: 0,
      })
    }
    const group = groups.get(key)
    group.total += 1
    const status = row.status || 'Not Marked'
    if (status in group) group[status] += 1
    group.hours += Number(row.workingMinutes || 0)
  }
  return [...groups.values()].map(group => {
    const marked = group.total
    const counted = group.Present + group.Late + group['Half Day']
    const percentage = marked ? Math.round((counted / marked) * 100) : 0
    return {
      ...group,
      percentage: `${percentage}%`,
      hours: formatMinutes(group.hours),
      total: group.total,
    }
  })
}
const attendanceExportRows = (rows, aggregated = false) => {
  if (aggregated) {
    return (rows || []).map(row => ({
      employeeId: row.faculty?.employeeId || row.employeeId || '',
      faculty: row.faculty?.fullName || row.facultyName || '',
      department: row.faculty?.department || '',
      present: row.Present || 0,
      absent: row.Absent || 0,
      late: row.Late || 0,
      halfDay: row['Half Day'] || 0,
      onLeave: row['On Leave'] || 0,
      totalHours: row.hours || '0h',
      attendancePercentage: row.percentage || '0%',
    }))
  }
  return (rows || []).map(row => ({
    date: row.date || '',
    employeeId: row.faculty?.employeeId || row.employeeId || '',
    faculty: row.faculty?.fullName || row.facultyName || '',
    department: row.faculty?.department || '',
    status: row.status || 'Not Marked',
    checkIn: row.checkIn || '—',
    checkOut: row.checkOut || '—',
    workingHours: row.hours || '0h',
    remarks: row.remarks || '—',
    source: row.source || 'Manual',
  }))
}
const attendanceExportColumns = dailyMode => [
  { label: 'Date', value: row => row.date || '' },
  { label: 'Employee ID', value: row => row.employeeId || '' },
  { label: 'Faculty', value: row => row.faculty || '' },
  { label: 'Department', value: row => row.department || '' },
  { label: 'Status', value: row => row.status || 'Not Marked' },
  { label: 'Check In', value: row => row.checkIn || '—' },
  { label: 'Check Out', value: row => row.checkOut || '—' },
  { label: 'Working Hours', value: row => row.workingHours || row.hours || '0h' },
  { label: 'Remarks', value: row => row.remarks || '—' },
  ...(dailyMode ? [{ label: 'Source', value: row => row.source || 'Manual' }] : []),
]
const aggregateExportColumns = reportType => [
  { label: 'Employee ID', value: row => row.employeeId || '' },
  { label: 'Faculty', value: row => row.faculty || '' },
  { label: 'Department', value: row => row.department || '' },
  { label: 'Days With Data', value: row => row.total || 0 },
  { label: 'Present', value: row => row.present || 0 },
  { label: 'Absent', value: row => row.absent || 0 },
  { label: 'Late', value: row => row.late || 0 },
  { label: 'Half Day', value: row => row.halfDay || 0 },
  { label: 'On Leave', value: row => row.onLeave || 0 },
  { label: 'Total Hours', value: row => row.totalHours || row.hours || '0h' },
  { label: 'Attendance %', value: row => row.attendancePercentage || row.percentage || '0%' },
]
const attendanceFilename = (prefix, period, department) => {
  const cleanPrefix = String(prefix || 'attendance').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') || 'attendance'
  const cleanPeriod = String(period || 'all').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().replace(/^-|-$/g, '')
  const cleanDept = String(department || '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().replace(/^-|-$/g, '')
  return [cleanPrefix, cleanPeriod, cleanDept].filter(Boolean).join('-') || 'attendance'
}
const sections = [
  { title: 'Personal Details', heading: 'Personal Information', icon: FiUser, description: 'Identity, photograph and primary contact information.', fields: [
    ['employeeId', 'Faculty ID', 'readonly'], ['fullName', 'Faculty Full Name', 'text', true],
    ['gender', 'Gender', ['Male', 'Female', 'Other'], true], ['dob', 'Date of Birth', 'date', true],
    ['mobile', 'Mobile Number', 'tel', true], ['email', 'Email', 'email', true],
  ] },
  { title: 'Employment', heading: 'Employment Information', icon: FiBriefcase, description: 'Faculty designation, department and employment information.', fields: [
    ['departmentId', 'Department', 'department', true], ['designation', 'Designation', designations, true],
    ['employmentType', 'Employment Type', employmentTypes, true],
    ['joiningDate', 'Date of Joining', 'date', true], ['employeeCategory', 'Employee Category', ['Teaching', 'Non-Teaching', 'Others']],
    ['experience', 'Total Experience (Years)', 'number'],
  ] },
  { title: 'Academic Details', heading: 'Academic Information', icon: FiBookOpen, description: 'Qualifications, specialization and professional experience.', fields: [
    ['qualification', 'Highest Qualification', ['Ph.D', 'M.Tech', 'M.E', 'MCA', 'M.Sc', 'B.Tech', 'Other']],
    ['specialization', 'Specialization', 'text'], ['university', 'University / Institution', 'text'],
    ['passingYear', 'Year of Passing', 'number'], ['teachingExperience', 'Teaching Experience (Years)', 'number'], ['industryExperience', 'Industry Experience (Years)', 'number'],
  ] },
  { title: 'Contact', heading: 'Contact Information', icon: FiMapPin, description: 'Address and emergency contacts. These details are optional.', fields: [
    ['alternateMobile', 'Alternate Mobile', 'tel'], ['personalEmail', 'Personal Email', 'email'],
    ['address', 'Address', 'textarea'], ['city', 'City', 'text'], ['state', 'State', 'text'], ['pincode', 'Pincode', 'text'],
    ['emergencyName', 'Emergency Contact Name', 'text'], ['emergencyMobile', 'Emergency Contact Number', 'tel'], ['relationship', 'Relationship', 'text'],
  ] },
]
const FACULTY_DOCUMENTS = [
  ['aadhaar', 'Aadhaar Card'],
  ['pan', 'PAN Card'],
  ['qualificationCert', 'Highest Qualification / Degree Certificate'],
  ['experienceCert', 'Previous Experience / Relieving Certificate'],
  ['resume', 'Resume / Curriculum Vitae (CV)'],
  ['photoId', 'Passport Size Photo / ID Proof'],
  ['joiningReport', 'Joining Report / Appointment Order'],
]
const experienceKeys = ['experience', 'teachingExperience', 'industryExperience']
const years = value => value === '' || value == null ? '—' : (parseFloat(value) || 0) + ' Years'
const isHexUUID = val => typeof val === 'string' && /^[0-9a-f]{32}$/i.test(val.trim())
const normalize = (row = {}) => {
  const safeRow = row && typeof row === 'object' ? row : {}
  const rawDob = safeRow.dob || safeRow.dateOfBirth || safeRow.DateOfBirth || safeRow.DOB
  const dob = rawDob && String(rawDob) !== 'undefined' ? String(rawDob).slice(0, 10) : ''
  const rawJoining = safeRow.joiningDate || safeRow.dateOfJoining || safeRow.DateOfJoining || safeRow.JoiningDate
  const joiningDate = rawJoining && String(rawJoining) !== 'undefined' ? String(rawJoining).slice(0, 10) : ''

  const validEmployeeId = (!isHexUUID(safeRow.employeeId) && safeRow.employeeId) ||
                          (!isHexUUID(safeRow.facultyCode) && safeRow.facultyCode) ||
                          (!isHexUUID(safeRow.employeeCode) && safeRow.employeeCode) || ''

  return {
    ...Object.fromEntries(sections.flatMap(s => s.fields.map(([key]) => [key, '']))),
    collegeId: safeRow.collegeId ?? safeRow.college_id ?? '',
    employeeCategoryOther: safeRow.employeeCategoryOther || safeRow.EmployeeCategoryOther || '',
    qualificationOther: safeRow.qualificationOther || safeRow.QualificationOther || '',
    employmentStatus: safeRow.employmentStatus || safeRow.statusName || (safeRow.status === 0 ? 'Inactive' : 'Working'),
    documents: safeRow.documents || {},
    assignments: Array.isArray(safeRow.assignments) ? safeRow.assignments : [],
    ...safeRow,
    photo: resolveFacultyPhoto(safeRow.photo || safeRow.profilePhotoUrl || safeRow.photoUrl || safeRow.profile_photo_url || safeRow.profilePhoto || safeRow.profile_photo || safeRow.avatar || safeRow.avatarUrl || safeRow.image || safeRow.imageUrl || safeRow.Photo || safeRow.PhotoUrl || safeRow.ProfilePhoto || ''),
    profilePhotoUrl: resolveFacultyPhoto(safeRow.profilePhotoUrl || safeRow.photo || safeRow.photoUrl || safeRow.profile_photo_url || safeRow.profilePhoto || safeRow.profile_photo || safeRow.avatar || safeRow.avatarUrl || safeRow.image || safeRow.imageUrl || safeRow.Photo || safeRow.PhotoUrl || safeRow.ProfilePhoto || ''),
    employeeId: validEmployeeId,
    fullName: safeRow.fullName || safeRow.facultyName || safeRow.name || '',
    departmentId: safeRow.departmentId || safeRow.deptId || safeRow.department_id || '',
    department: safeRow.department || safeRow.departmentName || '',
    designation: safeRow.designation || safeRow.title || '',
    dob,
    joiningDate,
    mobile: safeRow.mobile || safeRow.phoneNumber || safeRow.phone || safeRow.mobileNumber || '',
    email: safeRow.email || safeRow.officialEmail || safeRow.workEmail || '',
    gender: safeRow.gender || safeRow.genderName || safeRow.sex || '',
    qualification: safeRow.qualification || safeRow.highestQualification || '',
    employeeCategory: employeeCategoryOf(safeRow),
    experience: safeRow.experience == null ? (safeRow.experienceYears == null ? '' : String(parseFloat(safeRow.experienceYears) || 0)) : String(parseFloat(safeRow.experience) || 0),
    teachingExperience: safeRow.teachingExperience == null ? '' : String(parseFloat(safeRow.teachingExperience) || 0),
    industryExperience: safeRow.industryExperience == null ? '' : String(parseFloat(safeRow.industryExperience) || 0),
    specialization: safeRow.specialization || '',
    university: safeRow.university || safeRow.institution || '',
    passingYear: safeRow.passingYear || safeRow.yearOfPassing || '',
    address: safeRow.address || safeRow.permanentAddress || safeRow.currentAddress || '',
    city: safeRow.city || safeRow.currentCity || '',
    state: safeRow.state || safeRow.currentState || '',
    pincode: safeRow.pincode || safeRow.pinCode || safeRow.zipCode || '',
    alternateMobile: safeRow.alternateMobile || safeRow.altMobile || '',
    personalEmail: safeRow.personalEmail || '',
    emergencyName: safeRow.emergencyName || safeRow.emergencyContactName || '',
    emergencyMobile: safeRow.emergencyMobile || safeRow.emergencyContactNumber || '',
    relationship: safeRow.relationship || safeRow.emergencyContactRelation || '',
    collegeName: safeRow.collegeName || '',
  }
}
const clean = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
const workload = row => {
  const assignments = Array.isArray(row?.assignments) ? row.assignments : []
  const count = assignments.length
  const subjects = new Set(assignments.filter(a => a.subjectCode || a.subjectName).map(a => (a.subjectCode || a.subjectName).toUpperCase())).size
  const hours = assignments.reduce((sum, item) => sum + Number(item.weeklyHours || item.credits || 4), 0)
  if (count === 0 && subjects === 0) {
    return { hours: 0, subjects: 0, status: 'Unassigned' }
  }
  const effectiveSubjects = Math.max(subjects, count)
  const status = hours <= WORKLOAD_LIMITS.under ? 'Assigned' : hours <= WORKLOAD_LIMITS.normal ? 'Normal Load' : 'Over Load'
  return { hours, subjects: effectiveSubjects, status }
}
const exportColumns = [['employeeId', 'Employee ID'], ['fullName', 'Faculty Name'], ['department', 'Department'], ['designation', 'Designation'], ['qualification', 'Qualification'], ['experience', 'Experience'], ['mobile', 'Mobile'], ['email', 'Email'], ['employmentType', 'Employment Type'], ['employmentStatus', 'Employment Status']].map(([value, label]) => ({ label, value: value === 'experience' ? row => years(row.experience) : value }))

function validateFaculty(data, rows) {
  const errors = {}
  sections.forEach(section => section.fields.forEach(([key, label, type, required]) => {
    if (required && !String(data[key] ?? '').trim()) errors[key] = label + ' is required.'
    if (data[key] && Array.isArray(type) && !type.includes(data[key])) errors[key] = 'Select a valid ' + label.toLowerCase() + '.'
  }))
  if (['Others', 'Other'].includes(data.employeeCategory) && !String(data.employeeCategoryOther || '').trim()) errors.employeeCategoryOther = 'Specify the employee category.'
  if (!data.employeeId) errors.employeeId = 'Faculty Code is required.'
  if (!data.fullName?.trim()) errors.fullName = 'Faculty full name is required.'
  else if (data.fullName.trim().length < 2 || !/^[\p{L}\p{M} .?'-]+$/u.test(data.fullName.trim())) errors.fullName = 'Enter a valid name using letters (at least 2 characters).'
  if (data.departmentId && (!Number.isSafeInteger(Number(data.departmentId)) || Number(data.departmentId) <= 0)) errors.departmentId = 'Select a valid department.'
  for (const key of ['email', 'personalEmail']) if (data[key] && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(data[key].trim())) errors[key] = 'Enter a valid email address.'
  if (rows.some(row => row.id !== data.id && String(row.email || '').trim().toLowerCase() === data.email?.trim().toLowerCase())) errors.email = 'A faculty member with this email already exists.'
  for (const key of ['mobile', 'alternateMobile', 'emergencyMobile']) {
    const number = String(data[key] ?? '').trim()
    if (number && !/^[6-9]\d{9}$/.test(number)) errors[key] = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'
  }
  for (const key of ['dob', 'joiningDate']) if (data[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(data[key]) || !Number.isFinite(Date.parse(data[key])) || new Date(data[key]).toISOString().slice(0, 10) !== data[key] || data[key] > today())) errors[key] = 'Enter a valid date that is not in the future.'
  if (data.dob && data.joiningDate && data.joiningDate <= data.dob) errors.joiningDate = 'Joining date must be after date of birth.'
  for (const key of experienceKeys) if (data[key] !== '' && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0 || Number(data[key]) > 80)) errors[key] = 'Enter experience between 0 and 80 years.'
  if (data.passingYear && (!/^\d{4}$/.test(data.passingYear) || Number(data.passingYear) < 1950 || Number(data.passingYear) > new Date().getFullYear())) errors.passingYear = 'Enter a four-digit year from 1950 to the current year.'
  if (data.pincode && !/^\d{6}$/.test(String(data.pincode).trim())) errors.pincode = 'Enter a 6-digit numeric pincode.'
  const address = String(data.address || '').trim()
  if (address && (address.length < 10 || address.length > 250)) errors.address = 'Address must be between 10 and 250 characters.'
  if (address && !/^[A-Za-z0-9\s,./#'()\-]+$/.test(address)) errors.address = 'Address contains unsupported characters.'
  return errors
}

function Avatar({ faculty, large = false }) {
  const [failedSrc, setFailedSrc] = useState('')
  if (!faculty) return <span className={'fm-avatar ' + (large ? 'fm-avatar-large' : '')}>FM</span>
  const rawPhoto = faculty.photo || faculty.profilePhotoUrl || faculty.photoUrl || faculty.profile_photo_url || faculty.profilePhoto || faculty.profile_photo || faculty.avatar || faculty.avatarUrl || faculty.image || faculty.imageUrl || faculty.Photo || faculty.PhotoUrl || faculty.ProfilePhoto || ''
  const photoSrc = resolveFacultyPhoto(rawPhoto)
  const name = faculty.fullName || faculty.name || faculty.facultyName || ''
  const initials = name.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, i, all) => i === 0 || i === all.length - 1).join('').slice(0, 2).toUpperCase() || 'FM'

  return (
    <span className={'fm-avatar ' + (large ? 'fm-avatar-large' : '')}>
      {photoSrc && failedSrc !== photoSrc ? (
        <img onError={() => setFailedSrc(photoSrc)} src={photoSrc} alt={(name || 'Faculty') + ' profile'} />
      ) : (
        initials
      )}
    </span>
  )
}
function EmptyState({ title, description, action, onAction }) {
  return <div className="fm-empty"><FiUsers aria-hidden="true" /><h3>{title}</h3>{description && <p>{description}</p>}{action && <button type="button" className="fm-button secondary" onClick={onAction}>{action}</button>}</div>
}
function AttendanceTimeField({ label, value, disabled, onChange }) {
  const [hourText, minuteText] = String(value || '').split(':')
  const hour = Number(hourText)
  const [parts, setParts] = useState(() => ({
    hour: Number.isFinite(hour) && hour > 0 ? String(hour % 12 || 12).padStart(2, '0') : '',
    minute: minuteText || '',
    period: Number.isFinite(hour) && hourText ? (hour >= 12 ? 'PM' : 'AM') : '',
  }))
  useEffect(() => {
    setParts({
      hour: Number.isFinite(hour) && hour > 0 ? String(hour % 12 || 12).padStart(2, '0') : '',
      minute: minuteText || '',
      period: Number.isFinite(hour) && hourText ? (hour >= 12 ? 'PM' : 'AM') : '',
    })
  }, [value])
  const update = (part, nextValue) => {
    const nextParts = { ...parts, [part]: nextValue }
    setParts(nextParts)
    const { hour: nextHour, minute: nextMinute, period: nextPeriod } = nextParts
    if (!nextHour || !nextMinute || !nextPeriod) return
    let numericHour = Number(nextHour) % 12
    if (nextPeriod === 'PM') numericHour += 12
    onChange(`${String(numericHour).padStart(2, '0')}:${nextMinute}`)
  }
  return <div className="fm-attendance-time-field"><span>{label}</span><span className="fm-attendance-time-controls">{disabled ? <span className="fm-attendance-disabled-value">—</span> : <><ProjectSelect aria-label={`${label} hour`} value={parts.hour} onChange={event => update('hour', event.target.value)}><option value="">HH</option>{Array.from({ length: 12 }, (_, index) => { const item = String(index + 1).padStart(2, '0'); return <option key={item} value={item}>{item}</option> })}</ProjectSelect><span>:</span><ProjectSelect aria-label={`${label} minute`} value={parts.minute} onChange={event => update('minute', event.target.value)}><option value="">MM</option>{Array.from({ length: 60 }, (_, index) => { const item = String(index).padStart(2, '0'); return <option key={item} value={item}>{item}</option> })}</ProjectSelect><ProjectSelect aria-label={`${label} period`} value={parts.period} onChange={event => update('period', event.target.value)}><option value="">AM/PM</option><option value="AM">AM</option><option value="PM">PM</option></ProjectSelect></>}</span></div>
}
function AttendanceEditor({ record, collegeOptions = [], departmentOptions = [], allFaculty = [], onClose, onSave, onReset }) {
  const initialStatus = record.status === 'Not Marked' ? 'Present' : record.status
  const isInitialWorking = ['Present', 'Late', 'Half Day'].includes(initialStatus)
  const defaultInitialCheckIn = initialStatus === 'Late' ? '09:30' : '09:00'
  const defaultInitialCheckOut = initialStatus === 'Half Day' ? '13:00' : '17:00'
  const initialCheckIn = record.rawCheckIn || (record.checkIn && record.checkIn !== '—' ? record.checkIn : '') || (isInitialWorking ? defaultInitialCheckIn : '')
  const initialCheckOut = record.rawCheckOut || (record.checkOut && record.checkOut !== '—' ? record.checkOut : '') || (isInitialWorking ? defaultInitialCheckOut : '')

  const [data, setData] = useState({
    status: initialStatus,
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    remarks: record.remarks === '—' ? '' : record.remarks,
  })
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmLop, setConfirmLop] = useState(false)
  const isLop = data.status === 'LOP'
  const isNonWorkingStatus = ['Absent', 'On Leave', 'LOP'].includes(data.status)
  const displayCode = formatFacultyDisplayCode(record.faculty, collegeOptions, allFaculty) || record.faculty.employeeId || '—'
  const departmentName = departmentOptions.find(d => String(d.value) === String(record.faculty.departmentId || record.faculty.department))?.label || record.faculty.department || record.faculty.departmentName || '—'
  const save = event => {
    event.preventDefault()
    if (['On Leave', 'LOP'].includes(data.status) && !confirmLop) return setConfirmLop(true)
    const isWorking = ['Present', 'Late', 'Half Day'].includes(data.status)
    const defCheckIn = data.status === 'Late' ? '09:30' : '09:00'
    const defCheckOut = data.status === 'Half Day' ? '13:00' : '17:00'
    const finalCheckIn = isWorking ? (data.checkIn || defCheckIn) : ''
    const finalCheckOut = isWorking ? (data.checkOut || defCheckOut) : ''
    if (!isLop && isWorking && !finalCheckIn) return setError('Check In is required for this attendance status.')
    if (!isLop && ['Present', 'Late'].includes(data.status) && !finalCheckOut) return setError('Check Out is required for Present and Late attendance.')
    if (!isLop && finalCheckIn && finalCheckOut && finalCheckOut <= finalCheckIn) return setError('Check Out must be later than Check In.')
    setError('')
    onSave({
      ...record,
      ...data,
      status: isLop ? 'LOP' : data.status,
      checkIn: isNonWorkingStatus ? '' : finalCheckIn,
      checkOut: isNonWorkingStatus ? '' : finalCheckOut,
      remarks: data.remarks || '',
      facultyId: record.faculty.id,
      date: record.date,
    })
  }
  return <div className="fm-modal-backdrop"><form className="fm-attendance-editor" onSubmit={save}><header><div><p className="fm-eyebrow">{record.status === 'Not Marked' ? 'MARK ATTENDANCE' : 'EDIT ATTENDANCE'}</p><h2>{record.faculty.fullName}</h2><p>{displayCode} | {departmentName}</p></div><button className="fm-icon-button" type="button" aria-label="Close attendance editor" onClick={onClose}><FiX /></button></header><div className="fm-form-grid"><label>Status<ProjectSelect value={data.status} onChange={event => {
    const status = event.target.value
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defIn = status === 'Late' ? '09:30' : '09:00'
    const defOut = status === 'Half Day' ? '13:00' : '17:00'
    setData({
      ...data,
      status,
      checkIn: isWorking ? (data.checkIn || defIn) : '',
      checkOut: isWorking ? (data.checkOut || defOut) : '',
    })
    setError('')
    setConfirmLop(false)
  }}>{['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map(value => <option key={value}>{value}</option>)}<option value="LOP">Loss of Pay</option></ProjectSelect></label><AttendanceTimeField label="Check In" value={data.checkIn} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkIn: value }); setError('') }} /><AttendanceTimeField label="Check Out" value={data.checkOut} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkOut: value }); setError('') }} /><label className="fm-wide">Remarks<textarea rows="2" value={data.remarks} onChange={event => setData({ ...data, remarks: event.target.value })} /></label></div>{error && <p className="fm-error" role="alert">{error}</p>}{confirmLop && <div className="fm-lop-confirm" role="alert"><div><strong>Confirm attendance status?</strong><p>You are marking {record.faculty.fullName} ({displayCode}) as {attendanceStatusLabel(data.status)} for {new Date(record.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmLop(false)}>Cancel</button><button className="fm-button" type="button" onClick={() => { setConfirmLop(false); onSave({ ...record, ...data, status: data.status, checkIn: isNonWorkingStatus ? '' : data.checkIn, checkOut: isNonWorkingStatus ? '' : data.checkOut, remarks: data.remarks || '', facultyId: record.faculty.id, date: record.date }) }}>{data.status === 'LOP' ? 'Mark Loss of Pay' : 'Mark On Leave'}</button></div></div>}{confirmReset && <div className="fm-reset-confirm" role="alert"><div><strong>Reset this attendance record?</strong><p>The current status, time, and remarks will be cleared.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmReset(false)}>Keep Editing</button><button className="fm-button danger" type="button" onClick={() => onReset(record)}>Reset Record</button></div></div>}<footer>{record.status !== 'Not Marked' && !confirmReset && <button className="fm-button danger" type="button" onClick={() => setConfirmReset(true)}>Reset to Not Marked</button>}<button className="fm-button secondary" type="button" onClick={onClose}>Cancel</button><button className="fm-button" type="submit">Save Attendance</button></footer></form></div>
}
function FacultyAttendanceScreen({ faculty, collegeOptions = [], departmentOptions = [], onNotify }) {
  const [tab, setTab] = useState('daily')
  const [reportType, setReportType] = useState('daily')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [bulkConfirmation, setBulkConfirmation] = useState(null)
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useCollegeState([], { faculty })
  const [todayRecords, setTodayRecords] = useCollegeState([], { faculty })
  const [serverDaily, setServerDaily] = useCollegeState([], { faculty }), [serverReport, setServerReport] = useCollegeState([], { faculty })
  const [attendanceBusy, setAttendanceBusy] = useState(false), [attendanceError, setAttendanceError] = useState('')
  const attendanceLock = useRef(false), attendanceVersion = useRef(0)
  const [dailyPage, setDailyPage] = useState(1)
  const [registerPage, setRegisterPage] = useState(1)
  const [reportPage, setReportPage] = useState(1)
  const defaultDaily = () => ({ date: today(), facultyType: 'Teaching', department: '', status: '', search: '' })
  const defaultRegister = () => ({ from: '', to: today(), facultyType: 'Teaching', department: '', facultyId: '', status: '', search: '' })
  const defaultReport = () => ({ date: today(), weekStart: mondayOf(today()), month: today().slice(5, 7), year: today().slice(0, 4), facultyType: 'Teaching', department: '', facultyId: '', status: '', search: '' })
  const [dailyFilters, setDailyFilters] = useState(defaultDaily)
  const [registerFilters, setRegisterFilters] = useState(defaultRegister)
  const [reportFilters, setReportFilters] = useState(() => ({ daily: defaultReport(), weekly: defaultReport(), monthly: defaultReport() }))
  const currentReport = reportFilters[reportType]
  const getFacultyDept = f => {
    if (!f) return '—'
    const match = departmentOptions.find(d => String(d.value) === String(f.departmentId || f.department))
    return match ? match.label : f.department || f.departmentName || '—'
  }
  const getFacultyCode = f => {
    if (!f) return '—'
    const code = formatFacultyDisplayCode(f, collegeOptions, faculty)
    if (code && code !== '—') return code
    return f.employeeId || f.facultyCode || (f.id ? `FAC-${f.id}` : '—')
  }
  const normalizeAttendance = useCallback((rows, options) => mergeAttendanceRecords(faculty, rows.map(row => normalizeAttendanceRow(row, options))), [faculty])
  const loadAttendance = useCallback(async (expectedRecords = []) => {
    const version = ++attendanceVersion.current; setAttendanceError('')
    try {
      const reportFilter = reportFilters[reportType]
      const dates = attendancePeriod(reportType, reportFilter)
      const params = tab === 'register' ? { facultyId: registerFilters.facultyId, fromDate: registerFilters.from, toDate: registerFilters.to, status: registerFilters.status } : tab === 'reports' ? { facultyId: reportFilter.facultyId, fromDate: dates.from, toDate: dates.to } : { fromDate: dailyFilters.date, toDate: dailyFilters.date }
      const records = await facultyService.getAttendance(params)
      const dailyDate = tab === 'reports' && reportType === 'daily' ? reportFilter.date : dailyFilters.date
      const needsDaily = tab === 'daily' || (tab === 'reports' && reportType === 'daily')
      const daily = needsDaily ? await facultyService.getDailyAttendance({ date: dailyDate }) : []
      const periodDaily = tab === 'reports' && reportType !== 'daily'
        ? await loadDailyAttendancePeriod(facultyService.getDailyAttendance, dates.from, dates.to, today())
        : []
      const combined = combineAttendance(
        mergeAttendanceRecords(faculty, periodDaily),
        normalizeAttendance(records),
        normalizeAttendance(daily, { daily: true, date: dailyDate })
      )
      const todayRows = params.fromDate === today() && params.toDate === today() && !params.facultyId && !params.status
        ? combined
        : normalizeAttendance(await facultyService.getAttendance({ fromDate: today(), toDate: today() }))
      if (version !== attendanceVersion.current) return
      setTodayRecords(todayRows)
      expectedRecords.forEach(exp => {
        const isExpWorking = ['Present', 'Late', 'Half Day'].includes(exp.status)
        const defIn = exp.status === 'Late' ? '09:30' : '09:00'
        const defOut = exp.status === 'Half Day' ? '13:00' : '17:00'
        const checkIn = isExpWorking ? (exp.checkIn || defIn) : ''
        const checkOut = isExpWorking ? (exp.checkOut || defOut) : ''
        const expDate = normalizeAttendanceDate(exp.date)
        const matchIndex = combined.findIndex(r => (String(r.facultyId) === String(exp.facultyId) || String(r.faculty?.id) === String(exp.facultyId)) && normalizeAttendanceDate(r.date) === expDate)
        if (matchIndex >= 0) {
          combined[matchIndex] = {
            ...combined[matchIndex],
            status: exp.status,
            checkIn: isExpWorking ? (checkIn || combined[matchIndex].checkIn) : '—',
            checkOut: isExpWorking ? (checkOut || combined[matchIndex].checkOut) : '—',
            remarks: exp.remarks !== undefined ? exp.remarks : combined[matchIndex].remarks,
          }
        } else {
          combined.push({
            facultyId: String(exp.facultyId),
            date: expDate,
            status: exp.status,
            checkIn,
            checkOut,
            remarks: exp.remarks || '—',
            source: 'Manual',
          })
        }
      })
      setAttendanceRecords([...combined])
      setServerDaily([...combined])
      setServerReport([])
      return true
    } catch (error) { if (version === attendanceVersion.current) { setAttendanceError(error.message); } return false }
  }, [faculty, normalizeAttendance, tab, dailyFilters, registerFilters, reportFilters, reportType])
  useEffect(() => { const timer = setTimeout(() => { loadAttendance() }, 200); return () => { clearTimeout(timer); attendanceVersion.current++ } }, [loadAttendance])

  // Missing attendance is displayed as Not Marked; only API records are persisted.
  const resolvedRecords = useMemo(() => resolveAttendanceRecords(attendanceRecords, faculty), [attendanceRecords, faculty])
  const matchesFacultyType = (row, facultyType) => !facultyType || employeeCategoryOf(row.faculty) === facultyType
  const dailyRows = useMemo(() => dailyAttendanceRows(serverDaily, faculty, dailyFilters).filter(row => matchesFacultyType(row, dailyFilters.facultyType)), [serverDaily, faculty, dailyFilters])
  const registerRows = useMemo(() => filterAttendanceRecords(resolvedRecords, registerFilters).filter(row => matchesFacultyType(row, registerFilters.facultyType)), [resolvedRecords, registerFilters])
  const period = useMemo(() => attendancePeriod(reportType, currentReport), [reportType, currentReport])
  const reportRecords = useMemo(() => period.from && period.to ? filterAttendanceRecords(reportType === 'daily' ? dailyAttendanceRows(resolvedRecords, faculty, { date: currentReport.date }) : resolvedRecords, { ...currentReport, ...period, status: reportType === 'daily' ? currentReport.status : '' }).filter(row => !currentReport.facultyType || employeeCategoryOf(row.faculty) === currentReport.facultyType) : [], [resolvedRecords, faculty, currentReport, period, reportType])
  const periodKey = reportType === 'monthly' ? period.from.slice(0, 7) : period.from === period.to ? period.from : period.from + '-to-' + period.to
  const periodLabel = reportType === 'monthly' ? period.from.slice(0, 7) : period.from === period.to ? period.from : period.from + ' - ' + period.to
  const reportRows = useMemo(() => reportType === 'daily' ? reportRecords : serverReport.map(row => ({ ...row, facultyId: String(row.facultyId), faculty: faculty.find(member => String(member.id) === String(row.facultyId)) || normalizeFaculty(row), totalDays: row.totalDays ?? row.workingDays ?? 0, present: row.present ?? row.presentDays ?? 0, absent: row.absent ?? row.absentDays ?? 0, late: row.late ?? row.lateDays ?? 0, halfDay: row.halfDay ?? row.halfDays ?? 0, onLeave: row.onLeave ?? row.leaveDays ?? 0, lop: row.lop ?? row.lopDays ?? 0, period: periodLabel })), [reportRecords, reportType, serverReport, faculty, periodLabel])
  const dailySummary = useMemo(() => summarizeAttendance(dailyRows), [dailyRows])
  const reportSummary = useMemo(() => summarizeAttendance(reportRecords), [reportRecords])
  const reportFaculty = useMemo(() => faculty.filter(item => !currentReport.facultyType || employeeCategoryOf(item) === currentReport.facultyType).filter(item => !currentReport.department || getFacultyDept(item) === currentReport.department || item.department === currentReport.department), [faculty, currentReport.facultyType, currentReport.department])
  const attendanceDepartmentOptions = useMemo(() => {
    if (departmentOptions && departmentOptions.length > 0) {
      return departmentOptions.map(d => typeof d === 'string' ? d : d.label || d.value)
    }
    return [...new Set((tab === 'reports' ? faculty.filter(item => !currentReport.facultyType || employeeCategoryOf(item) === currentReport.facultyType) : faculty).map(item => getFacultyDept(item)).filter(Boolean))]
  }, [faculty, tab, currentReport.facultyType, departmentOptions])
  const facultyOptions = useMemo(() => (tab === 'reports' ? reportFaculty : faculty).map(item => ({ value: String(item.id), label: getFacultyCode(item) + ' | ' + item.fullName })), [faculty, reportFaculty, tab, collegeOptions])
  const filters = tab === 'daily' ? dailyFilters : tab === 'register' ? registerFilters : currentReport
  const updateFilter = (key, value) => {
    // Faculty category is a shared attendance scope, not a per-report filter.
    // Without this, changing Daily to Weekly/Monthly reopened that report's
    // untouched default (`Teaching`) filter and silently changed the roster.
    if (key === 'facultyType') {
      setDailyFilters(old => ({ ...old, facultyType: value, department: '', status: '', search: '' }))
      setRegisterFilters(old => ({ ...old, facultyType: value, department: '', facultyId: '', status: '', search: '' }))
      setReportFilters(old => Object.fromEntries(
        Object.entries(old).map(([period, report]) => [period, {
          ...report,
          facultyType: value,
          department: '',
          facultyId: '',
          status: '',
          search: '',
        }])
      ))
      setSelectedFacultyIds([])
      setDailyPage(1)
      setRegisterPage(1)
      setReportPage(1)
      return
    }
    if (tab === 'daily') { setDailyFilters(old => ({ ...old, [key]: value })); setDailyPage(1) }
    else if (tab === 'register') { setRegisterFilters(old => ({ ...old, [key]: value })); setRegisterPage(1) }
    else setReportFilters(old => ({ ...old, [reportType]: { ...old[reportType], [key]: value, ...(key === 'facultyType' ? { department: '', facultyId: '' } : key === 'department' ? { facultyId: '' } : {}) } })); setReportPage(1)
  }
  const clearFilters = () => {
    // Clear dates/searches but retain the category the user deliberately chose.
    if (tab === 'daily') { setDailyFilters({ ...defaultDaily(), facultyType: dailyFilters.facultyType }); setSelectedFacultyIds([]); setDailyPage(1) }
    else if (tab === 'register') { setRegisterFilters({ ...defaultRegister(), facultyType: registerFilters.facultyType }); setRegisterPage(1) }
    else { setReportFilters(old => ({ ...old, [reportType]: { ...defaultReport(), facultyType: old[reportType].facultyType } })); setReportPage(1) }
  }
  const saveAttendance = async values => {
    if (attendanceLock.current) return
    if (!values.date || values.date > today()) {
      showError('Attendance cannot be recorded for a future date.')
      return
    }
    attendanceLock.current = true; setAttendanceBusy(true); setAttendanceError('')
    try {
      const targetFacultyId = values.facultyId || values.faculty?.id || values.faculty?.facultyId || values.id
      const numFacultyId = Number(targetFacultyId)
      const facultyIdParam = Number.isSafeInteger(numFacultyId) && numFacultyId > 0 ? numFacultyId : targetFacultyId
      const payload = attendancePayload(values)

      let id = values.attendanceId
      if (!id && values.id && !values.synthetic && String(values.id) !== String(targetFacultyId)) {
        id = values.id
      }
      if (!id) {
        const found = attendanceRecords.find(r =>
          (String(r.facultyId) === String(facultyIdParam) || String(r.faculty?.id) === String(facultyIdParam)) &&
          normalizeAttendanceDate(r.date) === normalizeAttendanceDate(values.date) &&
          (r.attendanceId || (!r.synthetic && r.id && String(r.id) !== String(facultyIdParam)))
        )
        if (found) {
          id = found.attendanceId || found.id
        }
      }

      // Always perform backend bulk upsert so database record is saved immediately
      if (Number.isSafeInteger(Number(facultyIdParam)) && Number(facultyIdParam) > 0) {
        try {
          await facultyAttendanceApi.bulk({
            facultyIds: [Number(facultyIdParam)],
            attendanceDate: values.date,
            status: values.status,
            remarks: values.remarks || null,
          })
        } catch (bulkErr) {
          console.warn('Attendance bulk upsert warning:', bulkErr)
        }
      }

      const isRealBackendId = Number.isSafeInteger(Number(id)) && Number(id) > 0 && !String(id).startsWith('ATT-')
      try {
        if (isRealBackendId) {
          await facultyService.updateAttendance(id, { ...payload, facultyId: facultyIdParam, status: values.status, remarks: values.remarks || null })
        } else {
          const created = await facultyService.createAttendance({
            facultyId: facultyIdParam,
            attendanceDate: values.date,
            status: values.status,
            remarks: values.remarks || null,
            checkIn: payload.checkIn,
            checkOut: payload.checkOut,
          })
          id = created?.attendanceId ?? created?.id
        }
        if (id && Number.isSafeInteger(Number(id)) && Number(id) > 0) {
          if (payload.checkIn) await facultyService.checkIn(id, { checkIn: payload.checkIn }).catch(() => {})
          if (payload.checkOut) await facultyService.checkOut(id, { checkOut: payload.checkOut }).catch(() => {})
        }
      } catch (apiErr) {
        console.warn('Attendance server API warning:', apiErr)
      }

      saveLocalAttendanceRecord({
        facultyId: String(facultyIdParam),
        date: values.date,
        attendanceDate: values.date,
        status: values.status,
        remarks: values.remarks || null,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
      })
      if (values.faculty?.employeeId) {
        saveLocalAttendanceRecord({
          facultyId: String(values.faculty.employeeId),
          date: values.date,
          attendanceDate: values.date,
          status: values.status,
          remarks: values.remarks || null,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
        })
      }
      setEditingRecord(null)
      await loadAttendance([{ facultyId: facultyIdParam, date: values.date, status: values.status, checkIn: payload.checkIn, checkOut: payload.checkOut, remarks: values.remarks }])
      showSuccess('Attendance saved successfully.')
    } catch (error) {
      await loadAttendance()
      showError(error.message || 'Failed to save attendance.')
    } finally {
      attendanceLock.current = false
      setAttendanceBusy(false)
    }
  }
  const applyBulkMark = async (status, selectedRows, remarks) => {
    if (attendanceLock.current || !selectedRows.length) return
    attendanceLock.current = true; setAttendanceBusy(true); setAttendanceError('')
    try {
      const ids = selectedRows.map(row => {
        const raw = row.facultyId || row.faculty?.id || row.faculty?.facultyId
        const num = Number(raw)
        return Number.isSafeInteger(num) && num > 0 ? num : raw
      })
      const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
      const defCheckIn = status === 'Late' ? '09:30' : isWorking ? '09:00' : ''
      const defCheckOut = status === 'Half Day' ? '13:00' : isWorking ? '17:00' : ''
      
      for (const row of selectedRows) {
        const facId = String(row.facultyId || row.faculty?.id || row.faculty?.facultyId)
        saveLocalAttendanceRecord({
          facultyId: facId,
          date: dailyFilters.date,
          attendanceDate: dailyFilters.date,
          status,
          remarks: remarks || null,
          checkIn: defCheckIn,
          checkOut: defCheckOut,
        })
        if (row.faculty?.employeeId) {
          saveLocalAttendanceRecord({
            facultyId: String(row.faculty.employeeId),
            date: dailyFilters.date,
            attendanceDate: dailyFilters.date,
            status,
            remarks: remarks || null,
            checkIn: defCheckIn,
            checkOut: defCheckOut,
          })
        }
      }

      try {
        await facultyService.bulkAttendance({ facultyIds: ids, attendanceDate: dailyFilters.date, status, remarks: remarks || null })
      } catch (bulkErr) {
        console.warn('Bulk API call fallback:', bulkErr)
      }

      for (const row of selectedRows) {
        const facId = row.facultyId || row.faculty?.id || row.faculty?.facultyId
        const existingAttId = row.attendanceId
        if (existingAttId) {
          await facultyService.updateAttendance(existingAttId, {
            facultyId: facId,
            attendanceDate: dailyFilters.date,
            status,
            remarks: remarks || null,
            checkIn: defCheckIn,
            checkOut: defCheckOut,
          }).catch(() => {})
        }
      }
      await loadAttendance(selectedRows.map(row => ({
        facultyId: row.facultyId || row.faculty?.id,
        date: dailyFilters.date,
        status,
        checkIn: defCheckIn,
        checkOut: defCheckOut,
        remarks: remarks || '—',
      })))
      setSelectedFacultyIds([])
      const msg = `${selectedRows.length} attendance record${selectedRows.length > 1 ? 's' : ''} saved.`
      showSuccess(msg)
    } catch (error) {
      await loadAttendance()
      showError(error.message || 'Failed to apply bulk attendance.')
    } finally {
      attendanceLock.current = false
      setAttendanceBusy(false)
    }
  }
  const openAttendance = async (row, edit = false) => {
    try {
      const id = row.attendanceId
      const detail = (id && Number.isSafeInteger(Number(id)) && Number(id) > 0 && !String(id).startsWith('ATT-')) ? (await facultyService.getAttendanceById(Number(id)).then(r => normalizeAttendance([r])[0]).catch(() => row)) : row
      const targetId = String(row.facultyId || row.faculty?.id || row.faculty?.facultyId || '')
      const matchedFac = (faculty || []).find(f =>
        (targetId && String(f.id) === targetId) ||
        (targetId && String(f.facultyId) === targetId) ||
        (f.employeeId && (row.employeeId === f.employeeId || row.facultyCode === f.employeeId || row.faculty?.employeeId === f.employeeId)) ||
        (f.facultyCode && (row.facultyCode === f.facultyCode || row.employeeId === f.facultyCode || row.faculty?.facultyCode === f.facultyCode))
      ) || row.faculty || { fullName: 'Faculty Member', designation: 'Faculty' }
      const facultyObj = {
        ...matchedFac,
        ...(row.faculty || {}),
        photo: resolveFacultyPhoto(matchedFac?.photo || matchedFac?.profilePhotoUrl || row.faculty?.photo || row.faculty?.profilePhotoUrl || ''),
        profilePhotoUrl: resolveFacultyPhoto(matchedFac?.profilePhotoUrl || matchedFac?.photo || row.faculty?.profilePhotoUrl || row.faculty?.photo || ''),
      }
      const value = { ...row, ...detail, faculty: facultyObj }
      if (edit) setEditingRecord(value); else setSelected(value)
    } catch (error) {
      const targetId = String(row.facultyId || row.faculty?.id || row.faculty?.facultyId || '')
      const matchedFac = (faculty || []).find(f => (targetId && String(f.id) === targetId) || (targetId && String(f.facultyId) === targetId)) || row.faculty || { fullName: 'Faculty Member', designation: 'Faculty' }
      const facultyObj = {
        ...matchedFac,
        ...(row.faculty || {}),
        photo: resolveFacultyPhoto(matchedFac?.photo || matchedFac?.profilePhotoUrl || row.faculty?.photo || row.faculty?.profilePhotoUrl || ''),
        profilePhotoUrl: resolveFacultyPhoto(matchedFac?.profilePhotoUrl || matchedFac?.photo || row.faculty?.profilePhotoUrl || row.faculty?.photo || ''),
      }
      const value = { ...row, faculty: facultyObj }
      if (edit) setEditingRecord(value); else setSelected(value)
    }
  }
  const bulkMark = status => {
    const selectedRows = dailyRows.filter(row => selectedFacultyIds.includes(String(row.facultyId)))
    const overwrites = selectedRows.filter(row => !row.synthetic)
    if (!selectedRows.length) return
    setBulkRemarks('')
    setBulkConfirmation({ status, selectedCount: selectedRows.length, overwriteCount: overwrites.length })
  }
  const confirmBulkMark = () => {
    if (!bulkConfirmation) return
    const selectedRows = dailyRows.filter(row => selectedFacultyIds.includes(String(row.facultyId)))
    const remarks = bulkRemarks.trim()
    setBulkConfirmation(null)
    setBulkRemarks('')
    applyBulkMark(bulkConfirmation.status, selectedRows, remarks)
  }
  const rangeInvalid = tab === 'register' && registerFilters.from && registerFilters.to && registerFilters.from > registerFilters.to
  const periodInvalid = tab === 'reports' && (!period.from || !period.to)
  const resultRows = tab === 'daily' ? dailyRows : tab === 'register' ? registerRows : reportRows
  const aggregated = tab === 'reports' && reportType !== 'daily'
  const exportRows = useMemo(() => attendanceExportRows(resultRows, aggregated), [resultRows, aggregated])
  const columns = useMemo(() => aggregated ? aggregateExportColumns(reportType) : attendanceExportColumns(tab === 'daily'), [aggregated, reportType, tab])
  const exportTitle = tab === 'daily' ? 'Attendance' : tab === 'register' ? 'Register' : reportType[0].toUpperCase() + reportType.slice(1) + ' Report'
  const title = tab === 'daily' ? 'Daily Attendance' : tab === 'register' ? 'Attendance Register' : 'Attendance Reports'
  const exportPeriod = tab === 'daily' ? dailyFilters.date : tab === 'register' ? (registerFilters.from || 'all-dates') + '-to-' + (registerFilters.to || 'latest') : periodKey
  const filename = attendanceFilename(tab === 'daily' ? '' : tab === 'register' ? 'register' : reportType === 'daily' ? 'daily-report' : reportType, exportPeriod, filters.department)
  const displayDate = value => value ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All dates'
  const rangeLabel = tab === 'daily' ? displayDate(dailyFilters.date) : tab === 'register' ? displayDate(registerFilters.from) + ' - ' + (registerFilters.to ? displayDate(registerFilters.to) : 'Latest') : period.from && period.to ? displayDate(period.from) + (period.from === period.to ? '' : ' - ' + displayDate(period.to)) : 'Select a valid period'
  const exportScope = ['All filtered results', rangeLabel, filters.department, faculty.find(item => String(item.id) === filters.facultyId)?.fullName, (!aggregated && filters.status), filters.search && 'Search: ' + filters.search, tab === 'reports' && ATTENDANCE_PERCENTAGE_NOTE].filter(Boolean).join(' | ')
  const contextualExport = <ExportMenu rows={exportRows} columns={columns} filename={filename} title={exportTitle} scope={exportScope} loading={attendanceBusy} unavailable={rangeInvalid || periodInvalid ? 'Select a valid date range.' : ''} onDownload={async () => {
    const params = tab === 'daily' ? { fromDate: dailyFilters.date, toDate: dailyFilters.date } : tab === 'register' ? { facultyId: registerFilters.facultyId, fromDate: registerFilters.from, toDate: registerFilters.to } : { facultyId: currentReport.facultyId, fromDate: period.from, toDate: period.to }
    downloadServerExport(await facultyService.exportAttendance(params), filename)
  }} />
  const attendanceBadge = value => <StatusBadge value={attendanceStatusLabel(value)} className={value === 'Not Marked' ? 'fm-attendance-pending' : value === 'Present' ? 'fm-attendance-present' : value === 'Absent' ? 'fm-attendance-absent' : value === 'Late' ? 'fm-attendance-late' : value === 'Half Day' ? 'fm-attendance-half-day' : value === 'On Leave' ? 'fm-attendance-leave' : value === 'LOP' ? 'fm-attendance-lop' : ''} />
  const dateControl = (key, label, options = {}) => <label className="fm-attendance-field"><span>{label}</span><input type="date" value={filters[key]} max={today()} onChange={event => updateFilter(key, event.target.value)} {...options} /></label>
  const selectControl = (key, label, options, placeholder) => <div className="fm-attendance-field"><span>{label}</span><SearchableSelect placement="bottom" label={label} value={filters[key]} options={[{ value: '', label: placeholder }, ...options.map(option => option === 'LOP' ? { value: 'LOP', label: 'Loss of Pay' } : option)]} onChange={value => updateFilter(key, value)} placeholder={placeholder} /></div>
  const todaySummary = summarizeAttendance(resolveAttendanceRecords(todayRecords.filter(row => normalizeAttendanceDate(row.date) === today()), faculty))
  const facultySummary = [
    { label: 'Total Faculty', value: faculty.length },
    { label: 'Present Today', value: todaySummary.Present || 0, tone: 'active' },
    { label: 'Absent Today', value: todaySummary.Absent || 0, tone: 'danger' },
    { label: 'Late Today', value: todaySummary.Late || 0, tone: 'danger' },
    { label: 'On Leave Today', value: todaySummary['On Leave'] || 0, tone: 'upcoming' },
  ]
  const searchControl = <div className="fm-attendance-search-row"><label className="fm-attendance-field fm-attendance-search-field"><span className="fm-attendance-input-label">Search</span><span className="fm-attendance-search"><FiSearch aria-hidden="true" /><input value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Search attendance..." /></span></label></div>
  const facultyCategoryControl = <div className="fm-attendance-category-toggle flm-category-toggle" role="group" aria-label="Filter attendance by faculty type"><button type="button" className={`flm-cat-btn ${filters.facultyType === 'Teaching' ? 'active' : ''}`} onClick={() => updateFilter('facultyType', 'Teaching')}>Teaching Faculty ({faculty.filter(item => employeeCategoryOf(item) === 'Teaching').length})</button><button type="button" className={`flm-cat-btn ${filters.facultyType === 'Non-Teaching' ? 'active' : ''}`} onClick={() => updateFilter('facultyType', 'Non-Teaching')}>Non-Teaching Staff ({faculty.filter(item => employeeCategoryOf(item) === 'Non-Teaching').length})</button></div>
  const filterControl = <button type="button" className="fm-attendance-filter-toggle" aria-expanded={showFilters} aria-controls="faculty-attendance-filters-panel" onClick={() => setShowFilters(value => !value)}><FiFilter aria-hidden="true" /><span>Filters</span>{showFilters ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}</button>
  const normalizeViewRemark = value => {
    const clean = String(value || '').trim()
    if (!clean || clean === '—') return '—'
    const blocked = ['Bulk marked', 'Bulk marked Present', 'Bulk marked Absent', 'Bulk marked On Leave', 'Bulk mark', 'Bulk update', 'Manual bulk', 'Generated record']
    return blocked.includes(clean) ? '—' : clean
  }
  const dailyPageCount = Math.max(1, Math.ceil(dailyRows.length / PAGE_SIZE))
  const currentDailyPage = Math.min(dailyPage, dailyPageCount)
  const pageCount = Math.max(1, Math.ceil(registerRows.length / PAGE_SIZE))
  const currentPage = Math.min(registerPage, pageCount)
  const visibleRows = tab === 'register' ? registerRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : tab === 'daily' ? dailyRows.slice((currentDailyPage - 1) * PAGE_SIZE, currentDailyPage * PAGE_SIZE) : reportType === 'daily' ? reportRows.slice((reportPage - 1) * PAGE_SIZE, reportPage * PAGE_SIZE) : resultRows
  const statusMeta = {
    Present: ['P', 'present'], Absent: ['A', 'absent'], Late: ['L', 'late'], 'Half Day': ['HD', 'half-day'], 'On Leave': ['OL', 'leave'], LOP: ['LOP', 'lop'], 'Not Marked': ['—', 'pending'],
  }
  const matrixDates = useMemo(() => {
    if (reportType === 'daily' || !period.from || !period.to) return []
    const dates = []
    for (const date = new Date(period.from + 'T00:00:00'); date <= new Date(period.to + 'T00:00:00'); date.setDate(date.getDate() + 1)) dates.push(normalizeAttendanceDate(localAttendanceDate(date)))
    return dates
  }, [period.from, period.to, reportType])
  const matrixRows = useMemo(() => {
    if (!matrixDates.length) return []
    const search = currentReport.search.trim().toLowerCase()
    const facultyMap = attendanceFacultyMap(faculty || [])
    return faculty.filter(member => (!currentReport.facultyType || employeeCategoryOf(member) === currentReport.facultyType) && (!currentReport.department || getFacultyDept(member) === currentReport.department || member.department === currentReport.department) && (!currentReport.facultyId || String(member.id) === String(currentReport.facultyId)) && (!search || `${getFacultyCode(member)} ${member.employeeId || ''} ${member.fullName}`.toLowerCase().includes(search))).map(member => {
      const memberId = String(member.id)
      const cells = matrixDates.map(date => resolvedRecords.find(record =>
        (String(record.facultyId) === memberId ||
         facultyMap.get(String(record.facultyId)) === memberId ||
         String(record.faculty?.id) === memberId ||
         (member.facultyId && String(record.facultyId) === String(member.facultyId)) ||
         (member.employeeId && (record.employeeId === member.employeeId || record.facultyCode === member.employeeId || String(record.facultyId) === String(member.employeeId))) ||
         (member.facultyCode && (record.facultyCode === member.facultyCode || String(record.facultyId) === String(member.facultyCode))) ||
         (member.employeeProfileId && (String(record.employeeProfileId) === String(member.employeeProfileId) || String(record.facultyId) === String(member.employeeProfileId)))
        ) && normalizeAttendanceDate(record.date) === date
      ) || { faculty: member, facultyId: member.id, date, status: 'Not Marked', checkIn: '—', checkOut: '—', hours: '—' })
      const totals = summarizeAttendance(cells)
      return { member, cells, totals }
    }).filter(row => !currentReport.status || row.cells.some(cell => cell.status === currentReport.status))
  }, [currentReport, faculty, matrixDates, resolvedRecords])
  const reportEmployeeRows = aggregated ? matrixRows : reportRows
  const reportPageCount = Math.max(1, Math.ceil(reportEmployeeRows.length / PAGE_SIZE))
  const currentReportPage = Math.min(reportPage, reportPageCount)
  const visibleReportRows = reportRows.slice((currentReportPage - 1) * PAGE_SIZE, currentReportPage * PAGE_SIZE)
  const visibleMatrixRows = matrixRows.slice((currentReportPage - 1) * PAGE_SIZE, currentReportPage * PAGE_SIZE)
  const statusCell = cell => {
    const [code, tone] = statusMeta[cell.status] || statusMeta['Not Marked']
    const detail = [displayDate(cell.date), cell.status === 'LOP' ? 'Loss of Pay' : cell.status, ...(['Present', 'Late', 'Half Day'].includes(cell.status) ? [`Check In: ${formatTimeView(cell.checkIn)}`, `Check Out: ${formatTimeView(cell.checkOut)}`, `Working Hours: ${cell.hours || '—'}`] : [])].join('\n')
    return <span className={`fm-report-status fm-report-status--${tone}`} title={detail} aria-label={detail}>{code}</span>
  }
  const allDailySelected = dailyRows.length > 0 && dailyRows.every(row => selectedFacultyIds.includes(String(row.facultyId)))
  const dailySummaryCards = [
    ['Total Active', dailyRows.length, FiUsers, 'brand'],
    ['Present', dailySummary.Present, FiCheckCircle, 'success'],
    ['Absent', dailySummary.Absent, FiX, 'danger'],
    ['Late', dailySummary.Late, FiClock, 'warning'],
    ['Half Day', dailySummary['Half Day'], FiClock, 'warning'],
    ['On Leave', dailySummary['On Leave'], FiBriefcase, 'info'],
    ['Loss of Pay', dailySummary.LOP, FiBriefcase, 'danger'],
    ['Not Marked', dailySummary['Not Marked'], FiEdit2, 'muted']
  ].map(([label, value, Icon, tone]) => (
    <article className={'fm-attendance-kpi fm-attendance-kpi--' + tone} key={label}>
      <span className="fm-attendance-kpi-icon"><Icon aria-hidden="true" /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {label === 'Not Marked' && <p>Pending records</p>}
      </div>
    </article>
  ))
  const toggleSelectAllDaily = () => {
    const ids = dailyRows.map(row => String(row.facultyId))
    setSelectedFacultyIds(current => {
      const nextSet = new Set(current)
      if (ids.every(id => nextSet.has(id))) {
        ids.forEach(id => nextSet.delete(id))
        return [...nextSet]
      }
      ids.forEach(id => nextSet.add(id))
      return [...nextSet]
    })
  }
  const showDate = tab === 'register'
  const showRemarks = true
  const showAction = tab !== 'reports'
  const recordTable = <div key={tab} className={'fm-attendance-table' + (showDate ? ' fm-attendance-history-table' : '')}><table>
    {tab === 'daily' ? <colgroup>
      <col className="fm-col-select" style={{ width: '50px' }} />
      <col className="fm-col-employee" style={{ width: '120px' }} />
      <col className="fm-col-faculty" style={{ width: '270px' }} />
      <col className="fm-col-department" style={{ width: '270px' }} />
      <col className="fm-col-status" style={{ width: '120px' }} />
      <col className="fm-col-time" style={{ width: '105px' }} />
      <col className="fm-col-time" style={{ width: '105px' }} />
      <col className="fm-col-hours" style={{ width: '135px' }} />
      <col className="fm-col-remarks" style={{ width: '150px' }} />
      <col className="fm-col-action" style={{ width: '80px' }} />
    </colgroup> : (showDate ? <colgroup>{[10, 8, 20, 17, 10, 7, 7, 8, 7, 6].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup> : showAction ? <colgroup>{[8, 23, 19, 11, 7, 7, 9, 9, 7].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup> : <colgroup>{[9, 22, 19, 11, 9, 9, 9, 12].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}</colgroup>)}
    <thead><tr>{[...(tab === 'daily' ? [<th scope="col" key="select-header"><input type="checkbox" aria-label="Select all daily attendance rows" checked={allDailySelected} onChange={toggleSelectAllDaily} /></th>] : []), ...(showDate ? ['Date'] : []), 'Faculty Code', 'Faculty', 'Department', 'Status', 'Check In', 'Check Out', 'Working Hours', ...(showRemarks ? ['Remarks'] : []), ...(showAction ? ['Action'] : [])].map((label, index) => typeof label === 'string' ? <th scope="col" key={label} className={label === 'Faculty' ? 'fm-attendance-faculty-heading' : ''}>{label}</th> : label)}</tr></thead>
    <tbody>{(aggregated ? [] : visibleRows).map(row => <tr key={`${row.facultyId}:${row.date}`}>
      {tab === 'daily' && <td><input type="checkbox" aria-label={'Select ' + row.faculty.fullName} checked={selectedFacultyIds.includes(String(row.facultyId))} onChange={event => setSelectedFacultyIds(current => event.target.checked ? [...new Set([...current, String(row.facultyId)])] : current.filter(id => id !== String(row.facultyId)))} /></td>}
      {showDate && <td>{displayDate(row.date)}</td>}
      <td className="fm-attendance-code-cell"><span className="fm-attendance-employee">{getFacultyCode(row.faculty)}</span></td>
      <td className="fm-attendance-identity-cell">
        <div className="fm-attendance-identity">
          <Avatar faculty={row.faculty} />
          <div>
            <button
              type="button"
              className="student-name-link"
              title={'View attendance for ' + row.faculty.fullName}
              onClick={() => openAttendance(row)}
            >
              {row.faculty.fullName}
            </button>
            <small>{row.faculty.designation || 'Faculty'}</small>
          </div>
        </div>
      </td>
      <td className="fm-department-cell">{getFacultyDept(row.faculty)}</td><td>{attendanceBadge(row.status)}</td><td>{row.checkIn}</td><td>{row.checkOut}</td><td>{row.hours}</td>
      {showRemarks && <td className="fm-remarks-cell"><span className="fm-attendance-remarks" title={row.remarks}>{row.remarks}</span></td>}
      {showAction && <td className="fm-action-cell"><div className="fm-table-actions"><button className="fm-icon-button" type="button" title="Edit attendance" aria-label={'Edit attendance for ' + row.faculty.fullName + ' on ' + row.date} onClick={() => openAttendance(row, true)}><FiEdit2 /></button></div></td>}
    </tr>)}</tbody>
  </table></div>
  const aggregatedTable = reportType === 'daily' ? <div className="fm-attendance-table fm-attendance-aggregate-table"><table><thead><tr>{['Faculty Code', 'Faculty', 'Department', 'Days With Data', 'Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Total Hours', 'Attendance %'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visibleReportRows.map(row => <tr key={row.facultyId}><td><span className="fm-attendance-employee">{getFacultyCode(row.faculty)}</span></td><td><button type="button" className="student-name-link" title={row.faculty.fullName} onClick={() => openAttendance(row)}>{row.faculty.fullName}</button></td><td>{getFacultyDept(row.faculty)}</td><td>{row.total}</td>{['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map(status => <td key={status}>{row[status]}</td>)}<td>{row.hours}</td><td>{row.percentage}</td></tr>)}</tbody></table></div> : <><div className="fm-report-legend" aria-label="Attendance status legend">{Object.entries(statusMeta).map(([status, [code, tone]]) => <span key={status}>{statusCell({ status, date: period.from, checkIn: '—', checkOut: '—', hours: '—' })}<small>{attendanceStatusLabel(status)}</small></span>)}</div><div className="fm-attendance-table fm-attendance-matrix"><table><colgroup><col style={{ width: '130px', minWidth: '130px' }} /><col style={{ width: '220px', minWidth: '220px' }} />{matrixDates.map(date => <col key={date} style={{ width: '42px', minWidth: '42px' }} />)}{['P', 'A', 'L', 'HD', 'OL', 'LOP'].map(label => <col key={label} style={{ width: '40px', minWidth: '40px' }} />)}<col style={{ width: '55px', minWidth: '55px' }} /></colgroup><thead><tr><th>Faculty Code</th><th>Faculty</th>{matrixDates.map(date => <th key={date}><span>{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}</span><b>{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</b></th>)}{['P', 'A', 'L', 'HD', 'OL', 'LOP', '%'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{visibleMatrixRows.map(({ member, cells, totals }) => <tr key={member.id}><td>{getFacultyCode(member)}</td><td className="fm-matrix-faculty"><button type="button" className="student-name-link" title={member.fullName} onClick={() => openAttendance({ faculty: member, facultyId: member.id, date: matrixDates[0] || today() })}>{member.fullName}</button><small>{getFacultyDept(member)}</small></td>{cells.map(cell => <td key={cell.date}>{statusCell(cell)}</td>)}{[['Present', 'present'], ['Absent', 'absent'], ['Late', 'late'], ['Half Day', 'half-day'], ['On Leave', 'leave'], ['LOP', 'lop']].map(([status, tone]) => <td className={`fm-report-total fm-report-total--${tone}`} key={status}>{totals[status]}</td>)}<td className="fm-report-total fm-report-total--percentage">{totals.percentage}</td></tr>)}</tbody></table></div></>
  const noSource = tab !== 'daily' && !attendanceRecords.length
  const empty = <EmptyState title={noSource ? 'No attendance records are available yet.' : 'No attendance records match the selected filters.'} description={noSource ? 'Daily Attendance shows missing records as Not Marked; these are not saved historical records.' : undefined} action={noSource ? 'Go to Daily Attendance' : 'Clear Filters'} onAction={noSource ? () => setTab('daily') : clearFilters} />
  return (
    <div className="fm-attendance-screen">
      <header className="faculty-page-header fm-attendance-header">
        <div>
          <h1>Faculty Attendance</h1>
          <p>Manage daily faculty attendance, working hours, and administrative attendance reports.</p>
        </div>
        <div className="fm-header-right">
          <CompactSummary label="Faculty attendance summary" items={facultySummary} />
        </div>
      </header>

      <section className="fm-attendance-workspace">
        <div className="fm-attendance-panel">
          <header className="fm-attendance-directory-header">
            <div className="fm-attendance-header-actions">{searchControl}{facultyCategoryControl}{filterControl}{contextualExport}</div>
          </header>

          {showFilters && (
            <div id="faculty-attendance-filters-panel" className={'fm-attendance-filters' + (tab !== 'daily' ? ' fm-attendance-extended-filters' : '')}>
              {tab === 'daily' && dateControl('date', 'Date')}
              {tab === 'reports' && reportType === 'daily' && dateControl('date', 'Date')}
              {tab === 'reports' && reportType === 'weekly' && dateControl('weekStart', 'Week Start')}
              {tab === 'reports' && reportType === 'monthly' && (
                <>
                  {selectControl('month', 'Month', Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2, '0'), label: new Date(2000, index, 1).toLocaleDateString('en-GB', { month: 'long' }) })), 'Select month')}
                  <label className="fm-attendance-field">
                    <span>Year</span>
                    <input type="number" min="1900" max="9999" step="1" value={filters.year} aria-invalid={Boolean(periodInvalid)} onChange={event => updateFilter('year', event.target.value)} />
                  </label>
                </>
              )}
              {selectControl('department', 'Department', attendanceDepartmentOptions, 'All Departments')}
              {tab !== 'daily' && selectControl('facultyId', 'Faculty', facultyOptions, 'All Faculty')}
              {(tab === 'reports' || !aggregated) && selectControl('status', 'Status', ATTENDANCE_STATUSES, 'All Statuses')}
              <button className="fm-attendance-clear" type="button" onClick={clearFilters}>Clear Filters</button>
            </div>
          )}

          <nav className="fm-attendance-tabs" aria-label="Faculty attendance views">
            {[['daily', 'Daily Attendance'], ['reports', 'Reports']].map(([key, label]) => (
              <button type="button" key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </nav>


          {tab === 'reports' && (
            <div className="fm-attendance-report-tabs" aria-label="Report period">
              {['daily', 'weekly', 'monthly'].map(type => (
                <button type="button" key={type} className={reportType === type ? 'active' : ''} aria-pressed={reportType === type} onClick={() => setReportType(type)}>
                  {type[0].toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}
          {rangeInvalid && <p className="fm-error" role="alert">From Date must be on or before To Date.</p>}
          {periodInvalid && <p className="fm-error" role="alert">Select a valid reporting period.</p>}

          <section className="fm-attendance-register">
            <header className="fm-attendance-register-heading">
              <div>
                <h2>{tab === 'daily' ? 'Faculty Attendance' : exportTitle}</h2>
                <p>{tab === 'reports' ? reportEmployeeRows.length : resultRows.length} employee records</p>
              </div>
            </header>

            {tab === 'daily' && selectedFacultyIds.length > 0 && (
              <div className="fm-attendance-bulkbar">
                <strong>{selectedFacultyIds.length} selected</strong>
                <button type="button" className="fm-button" onClick={() => bulkMark('Present')}>Mark Present</button>
                <button type="button" className="fm-button secondary" onClick={() => bulkMark('Absent')}>Mark Absent</button>
              </div>
            )}

            {(aggregated ? matrixRows.length : resultRows.length) ? aggregated ? aggregatedTable : recordTable : empty}
            {tab === 'daily' && dailyRows.length > PAGE_SIZE && <TablePagination currentPage={currentDailyPage} totalPages={dailyPageCount} onPageChange={setDailyPage} />}
            {tab === 'reports' && reportEmployeeRows.length > PAGE_SIZE && <TablePagination currentPage={currentReportPage} totalPages={reportPageCount} onPageChange={setReportPage} />}
          </section>
        </div>
      </section>

      {tab !== 'reports' && selected && (
        <div className="fm-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="fm-attendance-detail" role="dialog" aria-modal="true" aria-label="Attendance details" onClick={e => e.stopPropagation()}>
            <div className="fm-attendance-detail-header">
              <div>
                <p className="fm-eyebrow">ATTENDANCE DETAILS</p>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Session Attendance Record</h2>
              </div>
              <button className="fm-detail-close" type="button" aria-label="Close attendance details" onClick={() => setSelected(null)}><FiX /></button>
            </div>

            <div className="cm-profile-banner fm-attendance-identity-hero">
              <div className="cm-profile-avatar-wrap">
                <Avatar
                  faculty={{
                    ...(faculty.find(f => String(f.id) === String(selected.facultyId || selected.faculty?.id || selected.faculty?.facultyId) || (f.employeeId && (selected.employeeId === f.employeeId || selected.faculty?.employeeId === f.employeeId))) || {}),
                    ...(selected.faculty || {}),
                    photo: resolveFacultyPhoto(selected.faculty?.photo || selected.faculty?.profilePhotoUrl || selected.photo || (faculty.find(f => String(f.id) === String(selected.facultyId || selected.faculty?.id))?.photo) || '')
                  }}
                  large
                />
              </div>
              <div className="cm-profile-header-info">
                <div className="cm-profile-badges">
                  <span className="cm-badge cm-badge-code">{getFacultyCode(selected.faculty)}</span>
                  {selected.faculty.employeeCategory && <span className="cm-badge cm-badge-type">{selected.faculty.employeeCategory}</span>}
                </div>
                <h2 className="cm-profile-title">{selected.faculty.fullName}</h2>
                <p className="cm-profile-subtitle">
                  {[selected.faculty.designation, getFacultyDept(selected.faculty)].filter(Boolean).join(' | ')}
                </p>
              </div>
              <div className="fm-attendance-detail-status">{attendanceBadge(selected.status)}</div>
            </div>

            <div className="fm-attendance-summary-block">
              <div className="preview-section-group">
                <span className="preview-section-title">Attendance Summary</span>
                <div className="preview-kv-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  <div className="preview-kv-item">
                    <span className="kv-label">Date</span>
                    <strong className="kv-val">{displayDate(selected.date)}</strong>
                  </div>
                  <div className="preview-kv-item">
                    <span className="kv-label">Check In</span>
                    <strong className="kv-val">{['Present', 'Late', 'Half Day'].includes(selected.status) ? formatTimeView(selected.checkIn) : '—'}</strong>
                  </div>
                  <div className="preview-kv-item">
                    <span className="kv-label">Check Out</span>
                    <strong className="kv-val">{['Present', 'Late', 'Half Day'].includes(selected.status) ? formatTimeView(selected.checkOut) : '—'}</strong>
                  </div>
                  <div className="preview-kv-item">
                    <span className="kv-label">Working Hours</span>
                    <strong className="kv-val">{['Present', 'Late', 'Half Day'].includes(selected.status) ? (selected.hours || '—') : '—'}</strong>
                  </div>
                </div>
              </div>

              {normalizeViewRemark(selected.remarks) !== '—' && (
                <div className="preview-section-group" style={{ marginTop: '8px' }}>
                  <span className="preview-section-title">Remarks</span>
                  <p className="fm-view-reason" style={{ margin: 0, padding: '10px 14px', background: 'var(--surface-soft, #F8FAFC)', border: '1px solid var(--border, #E2E8F0)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-primary, #334155)' }}>
                    {normalizeViewRemark(selected.remarks)}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {attendanceError && <p className="fm-error" role="alert" style={{ position: 'relative', zIndex: 1500 }}>{attendanceError}</p>}{tab !== 'reports' && editingRecord && <fieldset disabled={attendanceBusy} style={{ border: 0, margin: 0, padding: 0 }}><AttendanceEditor record={editingRecord} collegeOptions={collegeOptions} departmentOptions={departmentOptions} allFaculty={faculty} onClose={() => setEditingRecord(null)} onSave={saveAttendance} onReset={record => saveAttendance({ ...record, status: 'Not Marked' })} /></fieldset>}
      {bulkConfirmation && (
        <div className="fm-modal-backdrop" role="presentation">
          <section className="fm-attendance-confirm" role="dialog" aria-modal="true" aria-labelledby="bulk-attendance-confirm-title">
            <div className="fm-attendance-confirm-icon"><FiAlertCircle aria-hidden="true" /></div>
            <div className="fm-attendance-confirm-content">
              <p className="fm-eyebrow">BULK ATTENDANCE UPDATE</p>
              <h2 id="bulk-attendance-confirm-title">Mark {bulkConfirmation.status} attendance?</h2>
              <p>{bulkConfirmation.selectedCount} faculty selected for the current date.</p>
              {bulkConfirmation.overwriteCount > 0 && <p className="fm-attendance-confirm-note">{bulkConfirmation.overwriteCount} existing records will be overwritten.</p>}
              <label className="fm-attendance-confirm-remarks">
                <span>Remarks</span>
                <textarea value={bulkRemarks} onChange={event => setBulkRemarks(event.target.value)} rows="3" placeholder="Enter remarks for the selected faculty..." />
              </label>
            </div>
            <footer className="fm-attendance-confirm-actions">
              <button type="button" className="fm-button secondary" onClick={() => { setBulkConfirmation(null); setBulkRemarks('') }}>Cancel</button>
              <button type="button" className="fm-button" onClick={confirmBulkMark}>Continue</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
function ProfileSections({ data, collegeOptions = [], departmentOptions = [], faculty = [] }) {
  const getFieldValue = (key, value) => {
    if (key === 'employeeId') {
      return formatFacultyDisplayCode(data, collegeOptions, faculty)
    }
    if (key === 'collegeName' || key === 'collegeId') {
      const match = collegeOptions.find(c => String(c.value) === String(value || data.collegeId))
      return match ? match.label : (data.collegeName || value || '—')
    }
    if (key === 'department' || key === 'departmentId') {
      const match = departmentOptions.find(d => String(d.value) === String(value || data.departmentId || data.department))
      return match ? match.label : (data.departmentName || data.department || value || '—')
    }
    if (key === 'gender') {
      return data.gender || data.sex || data.genderName || '—'
    }
    if (key === 'dob') {
      const rawDob = data.dob || data.dateOfBirth || data.DateOfBirth
      return (rawDob && String(rawDob) !== 'undefined') ? String(rawDob).slice(0, 10) : '—'
    }
    if (key === 'joiningDate') {
      const rawJoin = data.joiningDate || data.dateOfJoining || data.DateOfJoining
      return (rawJoin && String(rawJoin) !== 'undefined') ? String(rawJoin).slice(0, 10) : '—'
    }
    if (key === 'mobile') {
      return data.mobile || data.phoneNumber || data.phone || data.mobileNumber || '—'
    }
    if (key === 'email') {
      return data.email || data.officialEmail || data.workEmail || '—'
    }
    if (key === 'employeeCategory') {
      if (['Others', 'Other'].includes(data.employeeCategory)) {
        return data.employeeCategoryOther ? `Other (${data.employeeCategoryOther})` : 'Other'
      }
      return data.employeeCategory || 'Teaching'
    }
    if (key === 'qualification') {
      if (data.qualification === 'Other') {
        return data.qualificationOther ? `Other (${data.qualificationOther})` : 'Other'
      }
      return data.qualification || '—'
    }
    if (key === 'emergencyName') {
      return data.emergencyName || data.emergencyContactName || '—'
    }
    if (key === 'emergencyMobile') {
      return data.emergencyMobile || data.emergencyContactNumber || '—'
    }
    if (key === 'relationship') {
      return data.relationship || data.emergencyContactRelation || '—'
    }
    if (key === 'address') {
      return data.address || data.permanentAddress || data.currentAddress || '—'
    }
    if (experienceKeys.includes(key)) {
      const val = value ?? data[key]
      return val === '' || val == null ? '—' : years(val)
    }
    return value || data[key] || '—'
  }

  const renderSectionCard = (section) => {
    const fields = section.fields.filter(([key, , , required]) => {
      if (data.employeeCategory === 'Non-Teaching' && key === 'teachingExperience') return false
      const val = getFieldValue(key, data[key])
      return required || key === 'employeeId' || (val !== '' && val !== '—' && val !== null && val !== undefined)
    })
    return (
      <section className="fm-panel" key={section.title}>
        <h2><section.icon />{section.heading}</h2>
        {fields.length ? (
          <dl className="fm-info-grid">
            {fields.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{getFieldValue(key, data[key])}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="fm-muted">No {section.heading.toLowerCase()} provided.</p>
        )}
      </section>
    )
  }

  const leftColumnSections = [sections[0], sections[2]].filter(Boolean)
  const rightColumnSections = [sections[1], sections[3]].filter(Boolean)

  return (
    <>
      <div className="fm-profile-sections">
        <div className="fm-profile-col">
          {leftColumnSections.map(renderSectionCard)}
        </div>
        <div className="fm-profile-col">
          {rightColumnSections.map(renderSectionCard)}
        </div>
      </div>
      <section className="fm-panel fm-docs-verification">
        <h2><FiFileText /> Supporting Documents</h2>
        <div className="fm-document-grid">
          {FACULTY_DOCUMENTS.map(([key, label]) => {
            const doc = data.documents?.[key] || {}
            const status = typeof doc === 'string' ? doc : doc.status || 'Not Submitted'
            const isSubmitted = status === 'Submitted'
            return (
              <article className={'fm-document-card ' + (isSubmitted ? 'submitted' : '')} key={key}>
                <div className="fm-document-icon">
                  {isSubmitted ? <FiCheckCircle aria-hidden="true" /> : <FiFileText aria-hidden="true" />}
                </div>
                <div className="fm-document-info">
                  <strong title={label}>{label}</strong>
                  <span className={'fm-doc-status ' + (isSubmitted ? 'active' : 'muted')}>
                    {status}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
function FacultyDocumentsForm({ documents = {}, onChange }) {
  const count = FACULTY_DOCUMENTS.filter(([key]) => {
    const val = documents[key]
    const status = typeof val === 'string' ? val : val?.status
    return status === 'Submitted'
  }).length

  return (
    <div className="fm-documents-form">
      <div className="fm-documents-header">
        <p className="fm-muted">Mark submission status for each faculty document. Document submission is optional and can be updated anytime.</p>
        <span className="fm-doc-summary-pill">{count} of {FACULTY_DOCUMENTS.length} Submitted</span>
      </div>
      <div className="fm-document-grid">
        {FACULTY_DOCUMENTS.map(([key, label]) => {
          const doc = documents[key] || {}
          const status = typeof doc === 'string' ? doc : doc.status || 'Not Submitted'
          const isSubmitted = status === 'Submitted'
          return (
            <article className={'fm-document-card ' + (isSubmitted ? 'submitted' : '')} key={key}>
              <div className="fm-document-icon">
                {isSubmitted ? <FiCheckCircle aria-hidden="true" /> : <FiFileText aria-hidden="true" />}
              </div>
              <div className="fm-document-info">
                <strong title={label}>{label}</strong>
                <span className={'fm-doc-status ' + (isSubmitted ? 'active' : 'muted')}>
                  {status}
                </span>
              </div>
              <div className="fm-document-actions">
                <ProjectSelect
                  aria-label={`${label} submission status`}
                  value={status}
                  onChange={e => onChange(key, { ...(typeof doc === 'object' ? doc : {}), status: e.target.value })}
                >
                  <option value="Not Submitted">Not Submitted</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Pending">Pending</option>
                </ProjectSelect>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
function Field({ field, data, errors, update, native = false, collegeOptions = [], departmentOptions = [], touched = {}, liveErrors = {}, markTouched }) {
  const [key, label, type, required] = field
  const id = 'fm-' + key
  const isNonTeaching = data.employeeCategory === 'Non-Teaching'
  const displayLabel = key === 'employeeId' ? (isNonTeaching ? 'Staff ID' : 'Faculty ID') : (key === 'fullName' ? (isNonTeaching ? 'Staff Full Name' : 'Faculty Full Name') : label)
  const props = { id, value: data[key] ?? '', onChange: event => update(key, event.target.value), 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? id + '-error' : undefined, required: Boolean(required) }

  if (key === 'employeeId') {
    return (
      <div className="fm-field">
        <label htmlFor={id}>{displayLabel} <span className="fm-required" aria-hidden="true">*</span></label>
        <input
          {...props}
          type="text"
          readOnly
          value={data[key] || ''}
          placeholder="Auto-generated ID"
          className="fm-readonly-code-input"
        />
        {errors[key] && <small id={id + '-error'} className="fm-error">{errors[key]}</small>}
      </div>
    )
  }

  if (['mobile', 'alternateMobile', 'emergencyMobile'].includes(key)) {
    props.maxLength = 10
    props.pattern = '[6-9][0-9]{9}'
    props.title = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'
    props.onChange = event => {
      const value = event.target.value
      if (/^\d{0,10}$/.test(value)) update(key, value)
    }
  }
  if (experienceKeys.includes(key)) {
    props.onChange = event => {
      const value = event.target.value
      if (/^\d*(?:\.\d{0,1})?$/.test(value)) update(key, value)
    }
    props.onKeyDown = event => {
      if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault()
    }
  }
  return (
    <>
      <div className={'fm-field ' + (type === 'textarea' ? 'fm-wide' : '') + (key === 'gender' ? ' fm-gender' : '')}><label htmlFor={Array.isArray(type) && !native ? undefined : id}>{displayLabel}{required && <span className="fm-required" aria-hidden="true"> *</span>}</label>
        {type === 'college' || type === 'department' ? <SearchableSelect placement="bottom" label={displayLabel} value={data[key] || ''} options={type === 'college' ? collegeOptions : departmentOptions} onChange={value => update(key, value)} required={required} error={Boolean(errors[key])} placeholder={'Select ' + displayLabel.toLowerCase()} /> : Array.isArray(type) ? (() => {
          const effectiveOptions = key === 'designation' ? getDesignationOptions(data.employeeCategory) : type
          return native ? <ProjectSelect {...props}><option value="">Select {displayLabel.toLowerCase()}</option>{effectiveOptions.map(value => <option key={value}>{value}</option>)}</ProjectSelect> : <SearchableSelect placement="bottom" label={displayLabel} value={data[key] || ''} options={effectiveOptions} onChange={value => update(key, value)} required={required} error={Boolean(errors[key])} placeholder={'Select ' + displayLabel.toLowerCase()} hideSearch={key === 'gender'} />
        })() : type === 'textarea' ? <textarea {...props} rows={2} /> : <input {...props} type={type === 'readonly' ? 'text' : type} readOnly={type === 'readonly'} max={type === 'date' ? today() : key === 'passingYear' ? new Date().getFullYear() : key === 'weeklyHours' ? 60 : type === 'number' ? 80 : undefined} min={key === 'passingYear' ? 1950 : type === 'number' ? 0 : undefined} step={key === 'passingYear' ? 1 : type === 'number' ? 0.5 : undefined} inputMode={type === 'tel' || key === 'pincode' ? 'numeric' : undefined} />}
        {errors[key] && <small id={id + '-error'} className="fm-error">{errors[key]}</small>}
      </div>
      {key === 'employeeCategory' && ['Others', 'Other'].includes(data.employeeCategory) && (
        <div className="fm-field">
          <label htmlFor="fm-employeeCategoryOther">Specify Other Category <span className="fm-required" aria-hidden="true"> *</span></label>
          <input
            id="fm-employeeCategoryOther"
            type="text"
            value={data.employeeCategoryOther || ''}
            onChange={event => update('employeeCategoryOther', event.target.value)}
            placeholder="Enter custom category name"
            required
            aria-invalid={Boolean(errors.employeeCategoryOther)}
            aria-describedby={errors.employeeCategoryOther ? 'fm-employeeCategoryOther-error' : undefined}
          />
          {errors.employeeCategoryOther && <small id="fm-employeeCategoryOther-error" className="fm-error">{errors.employeeCategoryOther}</small>}
        </div>
      )}
      {key === 'qualification' && data.qualification === 'Other' && (
        <div className="fm-field">
          <label htmlFor="fm-qualificationOther">Specify Highest Qualification</label>
          <input
            id="fm-qualificationOther"
            type="text"
            value={data.qualificationOther || ''}
            onChange={event => update('qualificationOther', event.target.value)}
            placeholder="Enter highest qualification"
            aria-invalid={Boolean(errors.qualificationOther)}
            aria-describedby={errors.qualificationOther ? 'fm-qualificationOther-error' : undefined}
          />
          {errors.qualificationOther && <small id="fm-qualificationOther-error" className="fm-error">{errors.qualificationOther}</small>}
        </div>
      )}
    </>
  )
}

const getCollegePrefix = (collegeId, collegeOptions = [], isNonTeaching = false) => {
  const selectedCollege = (collegeOptions || []).find(c => String(c.value) === String(collegeId) || String(c.id) === String(collegeId) || String(c.label) === String(collegeId)) || collegeOptions[0]
  const roleCode = isNonTeaching ? 'NTS' : 'FAC'

  let raw = String(selectedCollege?.code || selectedCollege?.collegeCode || selectedCollege?.CollegeCode || '').trim()
  let collegeCode = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const alphaMatch = collegeCode.match(/^([A-Z]{2,})\d+$/)
  if (alphaMatch) {
    collegeCode = alphaMatch[1]
  }

  if (!collegeCode && selectedCollege?.label) {
    const cleanLabel = selectedCollege.label.replace(/college|institute|engineering|technology|university/gi, '').trim()
    const targetLabel = cleanLabel || selectedCollege.label
    const words = targetLabel.trim().split(/[\s-]+/).filter(Boolean)
    collegeCode = (words.length > 1 ? words.map(w => w[0]).join('') : words[0]?.slice(0, 5) || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  if (!collegeCode) {
    collegeCode = 'BTECH'
  }

  if (collegeCode.endsWith(roleCode)) return `${collegeCode}-`
  return `${collegeCode}-${roleCode}-`
}

const formatFacultyDisplayCode = (item, collegeOptions = [], allFaculty = []) => {
  if (!item) return '—'

  const isNonTeaching = employeeCategoryOf(item) === 'Non-Teaching'
  const collegeId = item.collegeId ?? item.college_id ?? (collegeOptions.length > 0 ? collegeOptions[0].value : '')
  const prefix = getCollegePrefix(collegeId, collegeOptions, isNonTeaching)

  const isHexUUID = str => !str || /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(str).trim()) || /^[0-9a-f]{32}$/i.test(String(str).trim())

  const explicitCode = String(item.employeeId || item.facultyCode || '').trim()
  if (explicitCode && !isHexUUID(explicitCode)) {
    if (explicitCode.includes('-')) {
      const parts = explicitCode.toUpperCase().split('-')
      if (parts.length === 2 && ['FAC', 'NTS', 'STF'].includes(parts[0])) {
        return `${prefix}${parts[1].padStart(3, '0')}`
      }
      return explicitCode.toUpperCase()
    }
    const numMatch = explicitCode.match(/(\d{1,4})$/)
    if (numMatch) {
      const num = parseInt(numMatch[1], 10)
      if (Number.isFinite(num) && num < 10000) {
        return `${prefix}${String(num).padStart(3, '0')}`
      }
    }
    return explicitCode.toUpperCase()
  }

  const rawId = String(item.id || item.facultyId || '').trim()
  if (rawId && !isHexUUID(rawId)) {
    const numMatch = rawId.match(/(\d{1,4})$/)
    if (numMatch) {
      const num = parseInt(numMatch[1], 10)
      if (Number.isFinite(num) && num < 10000) {
        return `${prefix}${String(num).padStart(3, '0')}`
      }
    }
  }

  if (collegeId && Array.isArray(allFaculty) && allFaculty.length > 0) {
    const sameCollegeCategory = allFaculty
      .filter(f => {
        const cId = f.collegeId ?? f.college_id ?? (collegeOptions.length > 0 ? collegeOptions[0].value : '')
        return String(cId || '') === String(collegeId || '') && employeeCategoryOf(f) === (isNonTeaching ? 'Non-Teaching' : 'Teaching')
      })
    const index = sameCollegeCategory.findIndex(f => String(f.id || f.facultyId) === String(item.id || item.facultyId))
    if (index >= 0) {
      return `${prefix}${String(index + 1).padStart(3, '0')}`
    }
  }

  return `${prefix}001`
}

const getNextFacultyCode = (list = [], collegeId, collegeOptions = [], isNonTeaching = false) => {
  const effectiveCollegeId = collegeId || collegeOptions[0]?.value || ''
  const prefix = getCollegePrefix(effectiveCollegeId, collegeOptions, isNonTeaching)
  const categoryList = (list || []).filter(item => {
    const cId = item?.collegeId ?? item?.college_id ?? (collegeOptions[0]?.value || '')
    return String(cId || '') === String(effectiveCollegeId || '') && employeeCategoryOf(item) === (isNonTeaching ? 'Non-Teaching' : 'Teaching')
  })

  let max = 0
  const isHexUUID = str => !str || /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(str).trim()) || /^[0-9a-f]{32}$/i.test(String(str).trim())

  for (const item of categoryList) {
    const raw = String(item?.facultyCode || item?.faculty_code || item?.employeeId || '').trim()
    if (raw && !isHexUUID(raw)) {
      const match = raw.match(/(?:FAC|NTS|STF)[-_]?(\d{1,4})$/i) || raw.match(/(\d{1,4})$/)
      if (match) {
        const val = parseInt(match[1], 10)
        if (Number.isFinite(val) && val > 0 && val < 10000 && val > max) max = val
      }
    }
  }

  const nextSeq = Math.max(max, categoryList.length) + 1
  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}

function FacultyForm({ initial, faculty, onSave, onCancel, collegeOptions = [], departmentOptions = [], selectedCollegeId = '', saving }) {
  const defaultCollegeId = initial?.collegeId || selectedCollegeId || collegeOptions[0]?.value || ''
  const isInitialNonTeaching = (initial?.employeeCategory || initial?.employee_category) === 'Non-Teaching'
  const [data, setData] = useState(() => {
    const base = normalize(initial)
    base.collegeId = base.collegeId || defaultCollegeId
    if (isInitialNonTeaching) {
      base.employeeCategory = 'Non-Teaching'
    }
    const isNT = base.employeeCategory === 'Non-Teaching'
    const isHex = val => !val || /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(val).trim()) || /^[0-9a-f]{32}$/i.test(String(val).trim())
    const isLegacyOrShort = String(base.employeeId).startsWith('STF-') || String(base.employeeId).startsWith('FAC-') || String(base.employeeId).startsWith('NTS-')
    const isBadCode = isHex(base.employeeId) || isLegacyOrShort || String(base.employeeId).length > 20 || (isNT && String(base.employeeId).includes('-FAC-')) || (!isNT && (String(base.employeeId).includes('-NTS-') || String(base.employeeId).includes('-STF-')))
    if (!base.employeeId || isBadCode) {
      base.employeeId = getNextFacultyCode(faculty, base.collegeId, collegeOptions, isNT)
    }
    return base
  })
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const markTouched = key => setTouched(prev => ({ ...prev, [key]: true }))
  const liveErrors = useMemo(() => validateFaculty(clean(data), faculty), [data, faculty])
  const [photoBusy, setPhotoBusy] = useState(false)
  const readerRef = useRef(null)
  const formRef = useRef(null)
  useEffect(() => () => readerRef.current?.abort(), [])

  useEffect(() => {
    if (!initial?.id) {
      const activeCollegeId = selectedCollegeId || collegeOptions[0]?.value || data.collegeId || ''
      const isNT = data.employeeCategory === 'Non-Teaching'
      const newCode = getNextFacultyCode(faculty, activeCollegeId, collegeOptions, isNT)
      const isHex = val => !val || /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(val).trim()) || /^[0-9a-f]{32}$/i.test(String(val).trim())
      const isLegacyOrShort = String(data.employeeId).startsWith('STF-') || String(data.employeeId).startsWith('FAC-') || String(data.employeeId).startsWith('NTS-')
      const isBadCode = isHex(data.employeeId) || isLegacyOrShort || String(data.employeeId).length > 20 || (isNT && String(data.employeeId).includes('-FAC-')) || (!isNT && (String(data.employeeId).includes('-NTS-') || String(data.employeeId).includes('-STF-')))
      if (newCode && (!data.employeeId || isBadCode || data.employeeId === 'FAC001' || !data.employeeId.includes('-'))) {
        setData(old => ({
          ...old,
          collegeId: activeCollegeId,
          employeeId: newCode,
        }))
      }
    }
  }, [collegeOptions, data.collegeId, data.employeeCategory, faculty, initial?.id, selectedCollegeId])

  const update = (key, value) => {
    setData(old => {
      const colId = key === 'collegeId' ? (typeof value === 'object' && value !== null ? (value.value ?? value.id ?? '') : String(value ?? '')) : (old.collegeId || defaultCollegeId)
      const nextData = { ...old, [key]: value }
      const isNT = nextData.employeeCategory === 'Non-Teaching'
      if ((key === 'collegeId' || key === 'employeeCategory') && !initial?.id) {
        nextData.employeeId = getNextFacultyCode(faculty, colId, collegeOptions, isNT)
      }
      return nextData
    })
    setErrors(old => ({ ...old, [key]: undefined }))
  }
  const focusError = () => requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())

  const stepTitles = [...sections.map(s => s.title), 'Documents']
  const totalSteps = stepTitles.length

  const next = event => {
    event.preventDefault()
    const checked = validateFaculty(clean(data), faculty)
    if (step < sections.length) {
      const keys = [...sections[step].fields.map(([key]) => key), ...(step === 1 ? ['employeeCategoryOther'] : [])]
      const currentErrors = Object.fromEntries(Object.entries(checked).filter(([key]) => keys.includes(key)))
      setErrors(currentErrors)
      if (Object.keys(currentErrors).length) { focusError(); return }
      setStep(step + 1)
    } else {
      // Final Documents Step -> Save
      setErrors(checked)
      if (Object.keys(checked).length) {
        setStep(checked.employeeCategoryOther ? 1 : Math.max(0, sections.findIndex(section => section.fields.some(([key]) => checked[key]))))
        focusError()
        return
      }
      onSave(clean(data))
    }
  }

  const skipStep = () => {
    if (step === totalSteps - 1) {
      // If skipping final optional documents step, validate and save
      const checked = validateFaculty(clean(data), faculty)
      setErrors(checked)
      if (Object.keys(checked).length) {
        setStep(checked.employeeCategoryOther ? 1 : Math.max(0, sections.findIndex(section => section.fields.some(([key]) => checked[key]))))
        focusError()
        return
      }
      onSave(clean(data))
    } else {
      setErrors({})
      setStep(step + 1)
    }
  }

  const photo = event => {
    const file = event.target.files?.[0]
    if (!file) return
    readerRef.current?.abort()
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setErrors(old => ({ ...old, photo: 'Choose an image smaller than 3 MB.' })); return }
    const reader = new FileReader()
    readerRef.current = reader
    setPhotoBusy(true)
    reader.onload = () => { update('photo', reader.result); update('photoFile', file); setPhotoBusy(false) }
    reader.onerror = () => { setErrors(old => ({ ...old, photo: 'Could not read this image. Please choose another.' })); setPhotoBusy(false) }
    reader.onabort = () => setPhotoBusy(false)
    reader.readAsDataURL(file)
  }

  const section = step < sections.length ? sections[step] : null
  const isDocumentsStep = step === sections.length
  const isFinalStep = step === totalSteps - 1
  const isStepOptional = (section && !section.fields.some(([, , , required]) => required)) || isDocumentsStep

  return (
    <div className="erp-two-column-layout">
      <div className="erp-card-main">
        <form className="fm-panel fm-form" ref={formRef} onSubmit={next} noValidate style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
          <nav className="erp-tabs-bar ac-tabs fm-stepper" aria-label="Faculty form steps">
            {stepTitles.map((title, index) => (
              <button
                key={title}
                type="button"
                className={step === index ? 'active' : ''}
                onClick={() => setStep(index)}
                aria-current={step === index ? 'step' : undefined}
              >
                <span>{index + 1}</span>{title}
              </button>
            ))}
          </nav>
          <div className="fm-section-heading">
            <div className="fm-section-heading-icon">
              {section ? <section.icon /> : <FiFileText />}
            </div>
            <div className="fm-section-heading-text">
              <h2>
                {section?.title || 'Supporting Documents'}
              </h2>
              <p>
                {section?.description?.replace('Faculty designation', 'Employee designation') || 'Mark submission status for essential verification documents (optional).'}
              </p>
            </div>
          </div>
          <div className="erp-form-scroll-body">
            {step === 0 && (
              <div className="fm-photo-picker">
                <Avatar faculty={data} large />
                <div>
                  <span className="fm-photo-label">Profile Photo</span>
                  <label className="fm-photo-button" htmlFor="fm-photo">
                    {data.photo ? 'Change Photo' : 'Choose Photo'}
                    <input id="fm-photo" type="file" accept="image/*" onChange={photo} />
                  </label>
                  <small className="fm-muted">JPG, PNG or WebP | Maximum 3 MB</small>
                  {errors.photo && <small className="fm-error" role="alert">{errors.photo}</small>}
                </div>
              </div>
            )}
            {section ? (
              <div className="fm-form-grid">
                {section.fields.filter(([key]) => !(data.employeeCategory === 'Non-Teaching' && key === 'teachingExperience')).map(field => (
                  <Field key={field[0]} field={field[0] === 'employeeCategory' && ['Teaching', 'Non-Teaching'].includes(initial.employeeCategory) ? [field[0], field[1], 'readonly', field[3]] : field} data={data} errors={errors} update={update} collegeOptions={collegeOptions} departmentOptions={departmentOptions} touched={touched} liveErrors={liveErrors} markTouched={markTouched} />
                ))}
              </div>
            ) : (
              <FacultyDocumentsForm
                documents={data.documents || {}}
                onChange={(docKey, docVal) => update('documents', { ...(data.documents || {}), [docKey]: docVal })}
              />
            )}
          </div>
          <footer className="fm-form-footer">
            <button type="button" className="fm-button secondary" onClick={onCancel}>Cancel</button>
            <span className="fm-muted">Step {step + 1} of {totalSteps}</span>
            <div className="fm-actions">
              {step > 0 && (
                <button type="button" className="fm-button secondary" onClick={() => { setErrors({}); setStep(step - 1) }}>
                  Previous
                </button>
              )}
              {isStepOptional && !isFinalStep && (
                <button type="button" className="fm-button secondary" onClick={skipStep}>
                  Skip
                </button>
              )}
              <button type="submit" className="fm-button" disabled={photoBusy || saving}>
                {isFinalStep ? <><FiCheckCircle /> {data.employeeCategory === 'Non-Teaching' ? 'Save Staff' : 'Save Faculty'}</> : 'Next'}
              </button>
            </div>
          </footer>
        </form>
      </div>

      <aside className="preview-card" aria-label="Faculty Live Preview">
        <header className="preview-top-bar">
          <span className="preview-live-tag">
            <span className="live-dot" /> LIVE PREVIEW
          </span>
          <span className="preview-sync-hint">Real-time sync</span>
        </header>

        <div className="preview-body-container">
          {(() => {
            const selectedCollege = collegeOptions.find(c => String(c.value ?? c.id) === String(data.collegeId))
            const collegeName = selectedCollege?.label || selectedCollege?.name || data.collegeName || ''
            const selectedDept = departmentOptions.find(d => String(d.value ?? d.id) === String(data.departmentId || data.department))
            const deptName = selectedDept?.label || selectedDept?.name || data.department || data.departmentName || ''

            const isNT = data.employeeCategory === 'Non-Teaching'
            const idLabel = isNT ? 'Staff ID' : 'Faculty ID'
            const previewHeroTitle = data.fullName || (isNT ? 'Staff Preview' : 'Faculty Preview')

            const qualDisplay = data.qualification === 'Other' && data.qualificationOther ? `Other (${data.qualificationOther})` : data.qualification
            const catDisplay = ['Other', 'Others'].includes(data.employeeCategory) ? (data.employeeCategoryOther ? `Other (${data.employeeCategoryOther})` : 'Other') : (data.employeeCategory || 'Teaching')

            const previewSections = [
              {
                title: 'Personal Details',
                fields: [
                  [isNT ? 'Staff Full Name' : 'Full Name', data.fullName],
                  ['Gender', data.gender],
                  ['Date of Birth', data.dob || data.dateOfBirth],
                  ['Mobile Number', data.mobile || data.phoneNumber],
                  ['Email', data.email || data.officialEmail],
                ],
              },
              {
                title: 'Employment Details',
                fields: [
                  [idLabel, data.employeeId || formatFacultyDisplayCode(data, collegeOptions, faculty)],
                  ['Category', catDisplay],
                  ['Designation', data.designation],
                  ['Department', deptName],
                  ['College / Campus', collegeName],
                  ['Date of Joining', data.joiningDate || data.dateOfJoining],
                  ['Employment Type', data.employmentType],
                  ['Teaching Experience', !isNT && Number(data.teachingExperience) > 0 ? `${data.teachingExperience} Years` : ''],
                  ['Total Experience', Number(data.experience) > 0 ? `${data.experience} Years` : ''],
                  ['Status', data.employmentStatus],
                ],
              },
              {
                title: 'Academic Details',
                fields: [
                  ['Highest Qualification', qualDisplay],
                  ['Specialization', data.specialization],
                  ['University / Institution', data.university],
                  ['Year of Passing', data.passingYear],
                  ['Teaching Experience', !isNT && Number(data.teachingExperience) > 0 ? `${data.teachingExperience} Years` : ''],
                  ['Industry Experience', Number(data.industryExperience) > 0 ? `${data.industryExperience} Years` : ''],
                ],
              },
              {
                title: 'Contact Details',
                fields: [
                  ['Alternate Mobile', data.alternateMobile],
                  ['Personal Email', data.personalEmail],
                  ['Address', [data.address, data.city, data.state, data.pincode].filter(Boolean).join(', ') || data.address],
                  ['Emergency Contact', [data.emergencyName, data.relationship, data.emergencyMobile].filter(Boolean).join(' | ') || data.emergencyMobile],
                ],
              },
              {
                title: 'Documents',
                fields: FACULTY_DOCUMENTS.flatMap(([key, label]) => {
                  const doc = data.documents?.[key]
                  const status = typeof doc === 'string'
                    ? doc
                    : doc?.status || (doc?.uploaded ? 'Submitted' : '')
                  return status === 'Submitted' || status === 'Pending'
                    ? [[label, status, 'document']]
                    : []
                }),
              },
            ].map(sec => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '—' && String(val).trim() !== '0 Years' && String(val).trim() !== '0'),
            })).filter(sec => sec.fields.length > 0)

            if (previewSections.length === 0) {
              return (
                <div className="preview-empty-hint">
                  <span>Enter details in the form to preview here in real time.</span>
                </div>
              )
            }

            return (
              <>
                <div className="preview-hero" style={{ marginBottom: '14px' }}>
                  <Avatar faculty={data} large />
                  <div className="preview-hero-details">
                    <h3 className="preview-course-title" style={{ margin: 0 }}>{previewHeroTitle}</h3>
                    <p className="preview-course-meta" style={{ margin: '2px 0 0', color: '#64748B', fontSize: '0.78rem' }}>
                      {[data.employeeId, data.designation, deptName, data.employmentStatus || 'Working'].filter(Boolean).join(' \u00B7 ')}
                    </p>
                  </div>
                </div>
                {previewSections.map(sec => (
                  <div key={sec.title} className="preview-section-group" style={{ marginBottom: '12px' }}>
                    <span className="preview-section-title">{sec.title}</span>
                    <div className="preview-kv-grid">
                      {sec.fields.map(([label, text, valueType]) => (
                        <div key={label} className="preview-kv-item">
                          <span className="kv-label">{label}</span>
                          <strong
                            className={`kv-val${valueType === 'document' && text === 'Pending' ? ' is-pending' : ''}`}
                            title={String(text).trim()}
                          >{String(text).trim()}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )
          })()}
        </div>
      </aside>
    </div>
  )
}
function AssignmentList({ faculty, onRemove }) {
  const [pending, setPending] = useState(null)
  return (
    <div className="fm-assignment-list">
      {(faculty?.assignments || []).map(item => (
        <article key={item.id} className="fm-assignment-card">
          <div>
            <strong>{item.subjectCode ? item.subjectCode + ' | ' + item.subjectName : item.assignmentType}</strong>
            <p>{item.academicYear} | {item.course} | {item.branch}</p>
            <p>{item.semester} | {item.section} | {item.assignmentType}</p>
          </div>
          <div className="fm-assignment-end">
            {onRemove && (pending === item.id ? (
              <div className="fm-confirm" role="group" aria-label="Confirm assignment removal">
                <span>Remove assignment?</span>
                <button type="button" className="fm-button danger" onClick={() => { onRemove(item.id); setPending(null) }}>Remove</button>
                <button type="button" className="fm-button secondary" onClick={() => setPending(null)}>Keep</button>
              </div>
            ) : (
              <button type="button" className="fm-icon-button" title="Remove assignment" aria-label={'Remove ' + (item.subjectName || item.assignmentType)} onClick={() => setPending(item.id)}>
                <FiTrash2 />
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}
function AssignmentDialog({ faculty, onClose, onAdd, onRemove, toast }) {
  const dialog = useRef(null)
  const [masters, setMasters] = useState({
    years: [],
    courses: [],
    branches: [],
    semesters: [],
    sections: [],
    subjects: [],
  })
  const [data, setData] = useState({
    academicYearId: '1',
    academicYear: '2026-2027',
    courseId: '1',
    course: 'Bachelor of Technology',
    courseCode: 'BTECH',
    branchId: '1',
    branch: faculty.department || 'Computer Science and Engineering',
    branchCode: 'CSE',
    semesterId: '1',
    semester: 'Semester 1',
    sectionId: '1',
    section: 'Section A',
    assignmentType: 'Subject Faculty',
    subjectId: '',
    subjectCode: '',
    subjectName: '',
    remarks: '',
  })
  const [errors, setErrors] = useState({})
  const [acknowledged, setAcknowledged] = useState(false)
  const load = workload(faculty)
  const inactive = ['Resigned', 'Retired'].includes(faculty.employmentStatus)
  const subjectRequired = ['Subject Faculty', 'Lab Faculty'].includes(data.assignmentType)

  useEffect(() => {
    const returnTo = document.activeElement
    const element = dialog.current
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; returnTo?.focus() }
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      academicYearApi.getAll(),
      courseApi.getAll(),
      branchApi.getAll(),
      facultyMasterApi.getSemesters(),
      sectionApi.getAll(),
      subjectService.getSubjects(),
      facultyMasterApi.getSubjects(),
    ]).then(([yearsRes, coursesRes, branchesRes, semRes, secRes, subMgmtRes, subRes]) => {
      if (!active) return
      const isEntryActive = row => row && row.status !== 'Inactive' && row.status !== 0 && row.status !== false && row.isActive !== false
      const allYears = yearsRes.status === 'fulfilled' && Array.isArray(yearsRes.value) ? yearsRes.value.filter(isEntryActive) : []
      const markedCurrentYear = allYears.find(year => year?.isCurrent === true || year?.current === true || Number(year?.isCurrent) === 1 || Number(year?.current) === 1)
      const currentYear = markedCurrentYear || getDefaultAcademicYear(allYears)
      const years = currentYear ? [currentYear] : (allYears.length ? [allYears[0]] : [{ id: '1', academicYearId: '1', academicYearName: '2026-2027' }])
      const courses = coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value) ? coursesRes.value.filter(isEntryActive) : [{ id: '1', courseId: '1', courseName: 'Bachelor of Technology', courseCode: 'BTECH' }]
      const branches = branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value) ? branchesRes.value.filter(isEntryActive) : [{ id: '1', branchId: '1', branchName: faculty.department || 'Computer Science and Engineering', branchCode: 'CSE' }]
      const semesters = semRes.status === 'fulfilled' && Array.isArray(semRes.value) ? semRes.value.filter(isEntryActive) : Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), semesterId: String(i + 1), semesterName: `Semester ${i + 1}` }))
      const sections = secRes.status === 'fulfilled' && Array.isArray(secRes.value) ? secRes.value.filter(isEntryActive) : ['Section A', 'Section B', 'Section C', 'Section D'].map((name, i) => ({ id: String(i + 1), sectionId: String(i + 1), sectionName: name }))
      
      const subMgmtList = subMgmtRes.status === 'fulfilled' && Array.isArray(subMgmtRes.value) ? subMgmtRes.value.filter(isEntryActive) : []
      const subList = subRes.status === 'fulfilled' && Array.isArray(subRes.value) ? subRes.value.filter(isEntryActive) : []
      
      const subjectsMap = new Map()
      for (const s of [...subMgmtList, ...subList]) {
        if (!s) continue
        const code = String(s.subjectCode || s.code || s.subject_code || '').trim()
        const name = String(s.subjectName || s.name || s.subject || s.title || '').trim()
        const id = String(s.id || s.subjectId || s.subjectMasterId || code || name)
        const mapKey = (code || name).toLowerCase()
        if (mapKey && !subjectsMap.has(mapKey)) {
          subjectsMap.set(mapKey, {
            id,
            subjectId: id,
            subjectCode: code,
            code,
            subjectName: name,
            name,
            courseId: s.courseId,
            branchId: s.branchId,
            semesterId: s.semesterId,
            academicYearId: s.academicYearId,
          })
        }
      }
      const subjects = [...subjectsMap.values()]

      setMasters({ years, courses, branches, semesters, sections, subjects })

      setData(prev => {
        const matchedYear = years[0]
        const matchedCourse = courses[0]
        const matchedBranch = branches.find(b =>
          String(b.branchName || b.name || '').toLowerCase() === String(faculty.department || '').toLowerCase() ||
          String(b.departmentId) === String(faculty.departmentId)
        ) || branches[0]

        const courseName = matchedCourse?.courseName || matchedCourse?.name || 'Bachelor of Technology'
        const courseCode = matchedCourse?.courseCode || matchedCourse?.code || 'BTECH'
        const branchName = matchedBranch?.branchName || matchedBranch?.name || faculty.department || 'Computer Science and Engineering'
        const branchCode = matchedBranch?.branchCode || matchedBranch?.code || (faculty.department ? faculty.department.split(/\s+/).map(w => w[0]).join('').toUpperCase() : 'CSE')

        return {
          ...prev,
          academicYearId: String(matchedYear?.academicYearId ?? matchedYear?.id ?? '1'),
          academicYear: matchedYear?.academicYearName ?? matchedYear?.name ?? '2026-2027',
          courseId: String(matchedCourse?.courseId ?? matchedCourse?.id ?? '1'),
          course: courseName,
          courseCode: courseCode,
          branchId: String(matchedBranch?.branchId ?? matchedBranch?.id ?? '1'),
          branch: branchName,
          branchCode: branchCode,
          semesterId: prev.semesterId || String(semesters[0]?.semesterId ?? semesters[0]?.id ?? '1'),
          semester: prev.semester || (semesters[0]?.semesterName ?? semesters[0]?.name ?? 'Semester 1'),
          sectionId: prev.sectionId || String(sections[0]?.sectionId ?? sections[0]?.id ?? '1'),
          section: prev.section || (sections[0]?.sectionName ?? sections[0]?.name ?? 'Section A'),
        }
      })
    })
    return () => { active = false }
  }, [faculty])

  const semesterOptions = useMemo(() => {
    const branchId = String(data.branchId || '')
    const list = masters.semesters || []
    let options = list.filter(s => {
      const mappedBranchId = s.branchId ?? s.branch?.branchId ?? s.branch?.id
      return branchId && mappedBranchId != null && String(mappedBranchId) === branchId
    })
    if (!options.length) options = list
    if (!options.length) {
      options = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), semesterId: String(i + 1), semesterName: `Semester ${i + 1}` }))
    }
    const formatted = options.map(s => ({
      value: String(s.semesterId ?? s.id),
      label: s.semesterName ?? s.name ?? `Semester ${s.semesterNumber ?? s.number ?? s.id}`,
    }))
    return [...new Map(formatted.map(opt => [opt.label.trim().toLowerCase(), opt])).values()]
  }, [masters.semesters, data.branchId])

  const sectionOptions = useMemo(() => {
    const branchId = String(data.branchId || '')
    const semesterId = String(data.semesterId || '')
    const list = masters.sections || []
    let options = list.filter(s => {
      const mappedBranchId = s.branchId ?? s.branch?.branchId ?? s.branch?.id
      const mappedSemesterId = s.semesterId ?? s.semester?.semesterId ?? s.semester?.id
      return (!branchId || mappedBranchId == null || String(mappedBranchId) === branchId) &&
             (!semesterId || mappedSemesterId == null || String(mappedSemesterId) === semesterId)
    })
    if (!options.length && list.length) options = list
    if (!options.length) {
      options = ['Section A', 'Section B', 'Section C', 'Section D'].map((name, i) => ({ id: String(i + 1), sectionId: String(i + 1), sectionName: name }))
    }
    const formatted = options.map(s => ({
      value: String(s.sectionId ?? s.id),
      label: s.sectionName ?? s.name ?? s.sectionCode ?? `Section ${s.id}`,
    }))
    return [...new Map(formatted.map(opt => [opt.label.trim().toLowerCase(), opt])).values()]
  }, [masters.sections, data.branchId, data.semesterId])

  const subjectOptions = useMemo(() => {
    const list = masters.subjects || []
    if (!list.length) return []
    const filtered = list.filter(s => {
      const matchCourse = !data.courseId || !s.courseId || String(s.courseId) === String(data.courseId)
      const matchBranch = !data.branchId || !s.branchId || String(s.branchId) === String(data.branchId) || String(s.branchId) === 'all'
      const matchSemester = !data.semesterId || !s.semesterId || String(s.semesterId) === String(data.semesterId)
      return matchCourse && matchBranch && matchSemester
    })
    const sourceList = filtered.length > 0 ? filtered : list
    return sourceList.map(subject => {
      const value = subject.subjectId ?? subject.id ?? subject.subjectMasterId ?? subject.courseSubjectId
      const code = subject.subjectCode ?? subject.code ?? subject.subject_code ?? subject.courseCode ?? ''
      const name = subject.subjectName ?? subject.name ?? subject.subject ?? subject.title ?? subject.subjectTitle ?? subject.subject_name ?? subject.courseName ?? ''
      const label = code ? `${name} (${code})` : name
      return {
        value: value == null ? '' : String(value),
        code: String(code || ''),
        name: String(name || ''),
        label: label || 'Unnamed subject',
      }
    }).filter(subject => subject.value && subject.name)
  }, [masters.subjects, data.courseId, data.branchId, data.semesterId])

  const assignmentTypeOptions = ['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'].map(t => ({ value: t, label: t }))

  const add = event => {
    event.preventDefault()
    if (inactive) return
    const issues = {}
    if (!data.semesterId && !data.semester) issues.semester = 'Select a semester.'
    if (!data.sectionId && !data.section) issues.section = 'Select a section.'
    if ((subjectRequired || data.subjectName) && !data.subjectCode?.trim()) issues.subjectCode = 'Subject code is required.'
    if ((subjectRequired || data.subjectCode) && !data.subjectName?.trim()) issues.subjectName = 'Subject name is required.'

    if ((faculty.assignments || []).some(existing =>
      String(existing.branch || '').trim().toLowerCase() === String(data.branch || '').trim().toLowerCase() &&
      String(existing.semester || '').trim().toLowerCase() === String(data.semester || '').trim().toLowerCase() &&
      String(existing.section || '').trim().toLowerCase() === String(data.section || '').trim().toLowerCase() &&
      String(existing.subjectCode || '').trim().toLowerCase() === String(data.subjectCode || '').trim().toLowerCase() &&
      String(existing.assignmentType || '').trim().toLowerCase() === String(data.assignmentType || '').trim().toLowerCase()
    )) {
      issues.duplicate = data.assignmentType === 'Class Advisor'
        ? 'This section already has a Class Advisor for the selected academic mapping.'
        : 'This academic assignment already exists for this faculty.'
    }

    if (faculty.employmentStatus === 'On Leave' && !acknowledged) {
      issues.leave = 'Acknowledge the leave warning before assigning work.'
    }

    setErrors(issues)
    if (Object.keys(issues).length) {
      requestAnimationFrame(() => dialog.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const item = {
      ...clean(data),
      subjectCode: data.subjectCode.trim().toUpperCase(),
      subjectName: data.subjectName.trim(),
      facultyId: faculty.id,
      id: crypto.randomUUID(),
    }
    onAdd(item)
    setData(old => ({ ...old, subjectId: '', subjectCode: '', subjectName: '', remarks: '' }))
    setAcknowledged(false)
  }

  return (
    <dialog className="fm-modal" ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} aria-labelledby="fm-assignment-title">
      <header className="fm-modal-header">
        <div>
          <p className="fm-eyebrow">ACADEMIC RESPONSIBILITIES</p>
          <h2 id="fm-assignment-title">Academic Assignment</h2>
        </div>
        <button type="button" className="fm-icon-button" title="Close academic assignment" aria-label="Close academic assignment" onClick={onClose}>
          <FiX />
        </button>
      </header>
      <div className="fm-modal-body">
        <div className="fm-identity">
          <Avatar faculty={faculty} />
          <div>
            <strong>{faculty.fullName}</strong>
            <p>{faculty.employeeId} | {faculty.department} | {faculty.designation}</p>
          </div>
          <StatusBadge value={faculty.employmentStatus} />
        </div>
        <div className="fm-load-strip">
          <span>{load.subjects} Subjects</span>
          <span className="fm-load-status">{load.status}</span>
        </div>
        {inactive ? (
          <p className="fm-warning">Academic assignments cannot be added for inactive faculty.</p>
        ) : (
          <form onSubmit={add} noValidate>
            {faculty.employmentStatus === 'On Leave' && (
              <div className="fm-warning">
                <strong>This faculty member is on leave.</strong>
                <label className="fm-checkbox">
                  <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
                  I have reviewed their availability and want to assign new academic work.
                </label>
                {errors.leave && <small className="fm-error" role="alert">{errors.leave}</small>}
              </div>
            )}
            <div className="fm-form-grid">
              {/* Course & Course Code (Default Readonly) */}
              <div className="fm-field">
                <label htmlFor="fm-assign-course">Course</label>
                <input
                  id="fm-assign-course"
                  type="text"
                  value={data.course}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-courseCode">Course Code</label>
                <input
                  id="fm-assign-courseCode"
                  type="text"
                  value={data.courseCode}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              {/* Branch & Branch Code (Default Readonly) */}
              <div className="fm-field">
                <label htmlFor="fm-assign-branch">Branch</label>
                <input
                  id="fm-assign-branch"
                  type="text"
                  value={data.branch}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              <div className="fm-field">
                <label htmlFor="fm-assign-branchCode">Branch Code</label>
                <input
                  id="fm-assign-branchCode"
                  type="text"
                  value={data.branchCode}
                  readOnly
                  className="fm-readonly-input"
                />
              </div>

              {/* Semester Dropdown */}
              <div className="fm-field">
                <label htmlFor="fm-assign-semester">Semester <span className="fm-required">*</span></label>
                <ProjectSelect
                  id="fm-assign-semester"
                  value={data.semesterId || data.semester}
                  onChange={e => {
                    const val = e.target.value
                    const found = semesterOptions.find(o => String(o.value) === String(val))
                    setData({ ...data, semesterId: val, semester: found?.label || val, sectionId: '', section: '' })
                    setErrors(old => ({ ...old, semester: undefined, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Semester</option>
                  {semesterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </ProjectSelect>
                {errors.semester && <small className="fm-error">{errors.semester}</small>}
              </div>

              {/* Section Dropdown */}
              <div className="fm-field">
                <label htmlFor="fm-assign-section">Section <span className="fm-required">*</span></label>
                <ProjectSelect
                  id="fm-assign-section"
                  value={data.sectionId || data.section}
                  onChange={e => {
                    const val = e.target.value
                    const found = sectionOptions.find(o => String(o.value) === String(val))
                    setData({ ...data, sectionId: val, section: found?.label || val })
                    setErrors(old => ({ ...old, section: undefined, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Section</option>
                  {sectionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </ProjectSelect>
                {errors.section && <small className="fm-error">{errors.section}</small>}
              </div>

              {/* Assignment Type Dropdown */}
              <div className="fm-field">
                <label htmlFor="fm-assign-type">Assignment Type <span className="fm-required">*</span></label>
                <ProjectSelect
                  id="fm-assign-type"
                  value={data.assignmentType}
                  onChange={e => {
                    setData({ ...data, assignmentType: e.target.value })
                    setErrors(old => ({ ...old, duplicate: undefined }))
                  }}
                  required
                >
                  <option value="">Select Assignment Type</option>
                  {assignmentTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </ProjectSelect>
              </div>

              {/* 1. Subject Name Dropdown from Subject Management */}
              <div className="fm-field">
                <label htmlFor="fm-assign-subjectName">Subject Name {subjectRequired && <span className="fm-required">*</span>}</label>
                <ProjectSelect
                  id="fm-assign-subjectName"
                  value={data.subjectId || data.subjectName}
                  onChange={e => {
                    const val = e.target.value
                    const found = subjectOptions.find(s => String(s.value) === String(val) || String(s.name) === String(val))
                    if (found) {
                      setData({
                        ...data,
                        subjectId: found.value,
                        subjectName: found.name,
                        subjectCode: found.code || '',
                      })
                    } else {
                      setData({
                        ...data,
                        subjectId: '',
                        subjectName: val,
                      })
                    }
                    setErrors(old => ({ ...old, subjectName: undefined, subjectCode: undefined, duplicate: undefined }))
                  }}
                  required={subjectRequired}
                  aria-invalid={Boolean(errors.subjectName)}
                >
                  <option value="">Select Subject</option>
                  {subjectOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </ProjectSelect>
                {errors.subjectName && <small className="fm-error">{errors.subjectName}</small>}
              </div>

              {/* 2. Subject Code (Auto-populated upon selecting subject) */}
              <div className="fm-field">
                <label htmlFor="fm-assign-subjectCode">Subject Code {subjectRequired && <span className="fm-required">*</span>}</label>
                <input
                  id="fm-assign-subjectCode"
                  type="text"
                  placeholder="e.g. CS301"
                  value={data.subjectCode}
                  onChange={e => {
                    setData({ ...data, subjectCode: e.target.value })
                    setErrors(old => ({ ...old, subjectCode: undefined, duplicate: undefined }))
                  }}
                  required={subjectRequired}
                  aria-invalid={Boolean(errors.subjectCode)}
                />
                {errors.subjectCode && <small className="fm-error">{errors.subjectCode}</small>}
              </div>

              <div className="fm-field fm-wide">
                <label htmlFor="fm-assign-remarks">Remarks</label>
                <input
                  id="fm-assign-remarks"
                  type="text"
                  placeholder="Optional allocation notes / classroom reference"
                  value={data.remarks}
                  onChange={e => setData({ ...data, remarks: e.target.value })}
                />
              </div>
            </div>
            {errors.duplicate && <p className="fm-error" role="alert">{errors.duplicate}</p>}
            <div className="fm-assignment-submit">
              <button type="submit" className="fm-button"><FiPlus /> Add Assignment</button>
            </div>
          </form>
        )}
        <section className="fm-current-assignments">
          <h2>Current Assignments <span className="fm-muted">({faculty.assignments?.length || 0})</span></h2>
          {faculty.assignments?.length ? <AssignmentList faculty={faculty} onRemove={onRemove} /> : <EmptyState title="No academic responsibilities assigned." description={inactive ? 'Historical assignments will remain visible here.' : 'Complete the form above to assign academic work.'} />}
        </section>
      </div>
    </dialog>
  )
}

const FACULTY_TABS = [
  ['personal', 'Personal & Contact', FiUser],
  ['employment', 'Employment', FiBriefcase],
  ['academic', 'Academic', FiBookOpen],
  ['responsibilities', 'Workload & Responsibilities', FiCheckCircle],
  ['documents', 'Documents', FiFileText],
]

function ProfileCard({ title, icon: Icon, rows = [] }) {
  return <InfoCard title={title} icon={Icon} rows={rows} />
}

function FacultyManagement() {
  const { scopeRecords, selectedCollegeId } = useAcademic()
  const location = useLocation()
  const navigate = useNavigate()
  const [faculty, setFaculty] = useCollegeState([])
  const [loadingFaculty, setLoadingFaculty] = useState(true)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ department: '', designation: '', employmentType: '', employmentStatus: '' })
  const [page, setPage] = useState(1)
  const [profileTab, setProfileTab] = useState('personal')
  const [assignmentId, setAssignmentId] = useState(null)
  const [collegeOptions, setCollegeOptions] = useState([])
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [detail, setDetail] = useState(null)
  const saveLock = useRef(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  useEffect(() => {
    let active = true
    Promise.all([
      facultyService.list().catch(() => []),
      facultyService.getSubjectAllocations().catch(() => [])
    ])
      .then(([members, allocations]) => {
        if (!active) return
        const allocationMap = new Map()
        allocations.forEach(item => {
          const facultyId = String(item.facultyId ?? item.employeeProfileId ?? '')
          if (facultyId) allocationMap.set(facultyId, [...(allocationMap.get(facultyId) || []), { ...item, id: item.allocationId ?? item.id }])
        })
        setFaculty(members
          .filter(member => member && typeof member === 'object')
          .map(member => normalize({ ...normalizeFaculty(member), assignments: allocationMap.get(String(member.id)) || member.assignments || [] })))
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingFaculty(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([
      facultyMasterApi.getColleges().catch(() => []),
      departmentApi.getAll().catch(() => [])
    ]).then(([colleges, departments]) => {
      if (!active) return
      const isEntryActive = row => row && row.status !== 'Inactive' && row.status !== 0 && row.status !== false && row.isActive !== false
      setCollegeOptions((colleges || []).filter(row => String(row.collegeId ?? row.CollegeId ?? row.id) === String(selectedCollegeId)).filter(isEntryActive).map(row => ({
        value: String(row.collegeId ?? row.CollegeId ?? row.id ?? row.Id ?? ''),
        label: row.collegeName ?? row.CollegeName ?? row.name ?? row.Name ?? '',
        code: row.collegeCode ?? row.CollegeCode ?? row.code ?? row.Code ?? '',
      })))
      setDepartmentOptions(scopeRecords(departments).filter(isEntryActive).map(row => ({
        value: String(row.departmentId ?? row.DepartmentId ?? row.id ?? row.Id ?? ''),
        label: row.departmentName ?? row.DepartmentName ?? row.name ?? row.Name ?? '',
        collegeId: row.collegeId ?? row.CollegeId,
      })))
    }).catch(() => {})
    return () => { active = false }
  }, [scopeRecords, selectedCollegeId])
  const notify = useCallback(message => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }, [])
  const path = location.pathname.replace(/\/$/, '')
  const editId = path.match(/^\/faculty\/([^/]+)\/edit$/)?.[1]
  const detailId = path !== '/faculty/new' ? path.match(/^\/faculty\/([^/]+)$/)?.[1] : null
  const targetId = editId || (detailId === 'attendance' ? null : detailId)
  useEffect(() => {
    setDetail(null); if (!targetId) return
    let active = true
    Promise.all([
      facultyService.getById(targetId).catch(() => null),
      facultyService.getProfile(targetId).catch(() => null),
      facultyService.getWorkload(targetId).catch(() => null),
      facultyService.getSubjectAllocations({ FacultyId: targetId }).catch(() => [])
    ])
      .then(([member, profile, work, allocations]) => {
        if (active) {
          const safeMember = member && typeof member === 'object' ? member : {}
          const matchedListed = faculty.find(f => String(f.id) === String(targetId) || String(f.facultyId) === String(targetId) || String(f.employeeId) === String(targetId))
          const existingAssignments = (allocations && allocations.length) ? allocations : (matchedListed?.assignments || safeMember.assignments || [])
          const merged = mergeFacultyData(matchedListed, safeMember, profile)
          if (!scopeRecords([merged]).length) { setDetail(null); return }
          setDetail(normalize({
            ...merged,
            ...normalizeFaculty({ ...merged, facultyId: safeMember.id || targetId }),
            id: String(targetId),
            facultyId: String(targetId),
            profileExists: Boolean(profile),
            apiWorkload: work,
            assignments: existingAssignments
          }))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [targetId, faculty, scopeRecords])
  const queryParams = new URLSearchParams(location.search)
  const categoryParam = queryParams.get('category')
  const [selectedCategory, setSelectedCategory] = useState(
    categoryParam === 'Teaching' || categoryParam === 'Non-Teaching' ? categoryParam : null
  )

  useEffect(() => {
    const cat = new URLSearchParams(location.search).get('category')
    if (cat === 'Non-Teaching' || cat === 'Teaching') {
      setSelectedCategory(cat)
    } else if (!cat && path === '/faculty') {
      setSelectedCategory(null)
    }
  }, [location.search, path])

  const teachingFaculty = useMemo(() => faculty.filter(f => employeeCategoryOf(f) === 'Teaching'), [faculty])
  const nonTeachingFaculty = useMemo(() => faculty.filter(f => employeeCategoryOf(f) === 'Non-Teaching'), [faculty])
  const activeCategory = selectedCategory || 'Teaching'
  const categoryFaculty = activeCategory === 'Non-Teaching' ? nonTeachingFaculty : teachingFaculty
  const currentDesignations = useMemo(() => getDesignationOptions(activeCategory), [activeCategory])

  const listed = faculty.find(item => String(item.id) === String(targetId) || String(item.facultyId) === String(targetId) || String(item.employeeId) === String(targetId))
  // The directory route must never render an old detail record. This can occur
  // while navigation is settling after a profile or edit screen is closed.
  const selected = targetId ? (detail && String(detail.id) === String(targetId) ? { ...listed, ...detail, assignments: (detail?.assignments && detail.assignments.length) ? detail.assignments : (listed?.assignments || []) } : (listed ? { ...listed, ...detail } : detail)) : null
  const assignedFaculty = faculty.find(item => item.id === assignmentId)
  const departments = [...new Set(departmentOptions.map(item => item.label).filter(Boolean))]
  const filtered = useMemo(() => categoryFaculty.filter(item => {
    const displayCode = formatFacultyDisplayCode(item, collegeOptions, faculty)
    return [item.fullName, item.employeeId, displayCode, item.email, item.mobile, item.department, item.designation].join(' ').toLowerCase().includes(query.trim().toLowerCase()) && Object.entries(filters).every(([key, value]) => !value || item[key] === value)
  }), [categoryFaculty, query, filters, collegeOptions, faculty])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const active = Boolean(query || Object.values(filters).some(Boolean))
  const clear = () => { setQuery(''); setFilters({ department: '', designation: '', employmentType: '', employmentStatus: '' }); setPage(1) }
  const back = (cat) => {
    setDetail(null)
    setAssignmentId(null)
    setLoadError('')
    const explicitCat = (typeof cat === 'string' && (cat === 'Teaching' || cat === 'Non-Teaching')) ? cat : null
    const returnCategory = explicitCat || selected?.employeeCategory || selectedCategory || categoryParam || activeCategory || 'Teaching'
    setSelectedCategory(returnCategory)
    navigate(`/faculty?category=${returnCategory}`, { replace: true })
  }
  const backToOverview = () => {
    setSelectedCategory(null)
    setPage(1)
    clear()
    navigate('/faculty')
  }
  const addFaculty = (category = activeCategory) => navigate(`/faculty/new?category=${category}`)
  const save = async data => {
    if (saveLock.current) return
    const collegeId = data.id ? undefined : Number(selectedCollegeId)
    if (!data.id && (!Number.isSafeInteger(collegeId) || collegeId <= 0)) {
      setLoadError('Select an active college before creating faculty.')
      return
    }
    const facultyData = data.id ? data : { ...data, collegeId }
    saveLock.current = true; setSaving(true); setLoadError('')
    let savedId = data.id
    try {
      const saved = data.id ? await facultyService.update(data.id, facultyData) : await facultyService.create(facultyData, collegeId)
      savedId = String(saved?.id || saved?.facultyId || data.id || '')
      if (!savedId) throw new Error('Faculty saved, but the server did not return its ID. Reload the directory before retrying.')
      if (data.profileExists) await facultyService.updateProfile(savedId, facultyData).catch(() => {})
      else await facultyService.createProfile(savedId, facultyData).catch(() => {})
      if (data.photoFile) await facultyService.uploadProfilePhoto(savedId, data.photoFile)
      const refreshed = await facultyService.getById(savedId).catch(() => saved)
      const targetCat = data.employeeCategory || employeeCategoryOf(data) || employeeCategoryOf(refreshed) || 'Teaching'
      const normalizedRecord = normalize({
        ...mergeFacultyData(refreshed, facultyData),
        ...facultyData,
        id: savedId,
        facultyId: savedId,
        employeeId: data.employeeId || refreshed.employeeId || refreshed.facultyCode,
        employeeCategory: targetCat
      })
      setFaculty(rows => data.id
        ? rows.map(row => (String(row.id) === String(data.id) || String(row.facultyId) === String(data.id) || (data.employeeId && row.employeeId && String(row.employeeId).toLowerCase() === String(data.employeeId).toLowerCase()))
            ? { ...row, ...normalizedRecord, assignments: row.assignments || normalizedRecord.assignments }
            : row)
        : [normalizedRecord, ...rows.filter(r => String(r.id) !== String(savedId) && String(r.employeeId).toLowerCase() !== String(normalizedRecord.employeeId).toLowerCase())]
      )
      notify(data.id ? (targetCat === 'Non-Teaching' ? 'Staff updated successfully' : 'Faculty updated successfully') : (targetCat === 'Non-Teaching' ? 'Staff created successfully' : 'Faculty created successfully'))
      clear()
      back(targetCat)
    } catch (error) {
      setLoadError(error.message || 'Faculty could not be saved.')
      if (!data.id && savedId) navigate('/faculty/' + savedId + '/edit')
    } finally { saveLock.current = false; setSaving(false) }
  }
  const refreshAssignments = async () => {
    const assignments = await facultyService.getSubjectAllocations({ FacultyId: assignmentId })
    setFaculty(rows => rows.map(row => row.id === assignmentId ? { ...row, assignments } : row))
  }
  const addAssignment = async item => {
    try {
      const targetFacId = assignmentId || item.facultyId
      const saved = await facultyService.createSubjectAllocation({ ...item, facultyId: targetFacId })
      setFaculty(rows => rows.map(row => String(row.id) === String(targetFacId) ? {
        ...row,
        assignments: [...(row.assignments || []).filter(a => String(a.id) !== String(saved.id)), saved]
      } : row))
      if (detail && String(detail.id) === String(targetFacId)) {
        setDetail(prev => ({
          ...prev,
          assignments: [...(prev.assignments || []).filter(a => String(a.id) !== String(saved.id)), saved]
        }))
      }
      notify('Academic assignment added')
    } catch (error) { notify(error.message || 'Academic assignment could not be added.') }
  }
  const removeAssignment = async id => {
    try {
      await facultyService.deleteSubjectAllocation(id)
      setFaculty(rows => rows.map(row => ({
        ...row,
        assignments: (row.assignments || []).filter(item => String(item.id) !== String(id))
      })))
      if (detail) {
        setDetail(prev => ({
          ...prev,
          assignments: (prev.assignments || []).filter(item => String(item.id) !== String(id))
        }))
      }
      notify('Academic assignment removed')
    } catch (error) { notify(error.message || 'Academic assignment could not be removed.') }
  }
  // Explicit local scope prevents ExportMenu's faculty filename alias using a server endpoint.
  const directoryActions = (
    <>
      <ExportMenu
        rows={filtered}
        columns={exportColumns}
        screen="faculty-local-directory"
        filename={activeCategory === 'Non-Teaching' ? 'non-teaching-roster' : 'teaching-faculty-roster'}
        title={activeCategory === 'Non-Teaching' ? 'Non-Teaching Staff Directory' : 'Teaching Faculty Directory'}
      />
      <button className="fm-button" type="button" onClick={() => addFaculty(activeCategory)}>
        <FiPlus /> {activeCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty'}
      </button>
    </>
  )
  let content
  if (path === '/faculty/advisors' || path === '/faculty/subjects') return <Navigate to="/faculty" replace />
  if (path === '/faculty/attendance') content = <FacultyAttendanceScreen faculty={faculty} collegeOptions={collegeOptions} departmentOptions={departmentOptions} onNotify={notify} />
  else if (((editId || detailId) && !selected) || (!['/faculty', '/faculty/new'].includes(path) && !editId && !detailId)) {
    content = <section className="fm-panel"><EmptyState title="Faculty record not found" action={<button type="button" className="fm-button secondary" onClick={() => back()}><FiArrowLeft /> Back</button>} /></section>
  } else if (path === '/faculty/new' || editId) {
    const defaultNewCategory = categoryParam || selected?.employeeCategory || selectedCategory || activeCategory || 'Teaching'
    content = (
      <>
        <header className="faculty-page-header">
          <div>
            <h1>{editId ? (defaultNewCategory === 'Non-Teaching' ? 'Edit Non-Teaching Staff' : 'Edit Teaching Faculty') : (defaultNewCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty')}</h1>
            <p>{editId ? 'Faculty employment and profile record' : (defaultNewCategory === 'Non-Teaching' ? 'Non-teaching staff registration and employment record' : 'Teaching faculty registration and employment record')}</p>
          </div>
          <button type="button" className="fm-button secondary" onClick={() => back()}><FiArrowLeft /> Back</button>
        </header>
        <FacultyForm
          key={location.key + ':' + Boolean(detail) + ':' + selectedCollegeId + ':' + defaultNewCategory}
          initial={selected || { employmentStatus: 'Working', employeeCategory: defaultNewCategory }}
          faculty={faculty}
          collegeOptions={collegeOptions}
          departmentOptions={departmentOptions}
          selectedCollegeId={selectedCollegeId}
          saving={saving}
          onSave={save}
          onCancel={() => back()}
        />
      </>
    )
  } else if (selected) {
    const load = workload(selected)
    const departmentName = departmentOptions.find(d => String(d.value) === String(selected.departmentId || selected.department))?.label || selected.department || '—'
    const displayCode = formatFacultyDisplayCode(selected, collegeOptions, faculty)
    const collegeName = collegeOptions.find(c => String(c.value) === String(selected.collegeId))?.label || selected.collegeName || ''

    const exportSections = [
      {
        title: 'Personal Information',
        rows: [
          [selected.employeeCategory === 'Non-Teaching' ? 'Staff Full Name' : 'Faculty Full Name', selected.fullName],
          ['Gender', selected.gender],
          ['Date of Birth', selected.dob],
          ['Blood Group', selected.bloodGroup],
          ['Aadhaar Number', selected.aadhaarNumber],
        ]
      },
      {
        title: 'Employment Details',
        rows: [
          [selected.employeeCategory === 'Non-Teaching' ? 'Staff ID' : 'Faculty ID', displayCode],
          ['Employee Category', selected.employeeCategory === 'Other' || selected.employeeCategory === 'Others' ? (selected.employeeCategoryOther ? `Other (${selected.employeeCategoryOther})` : 'Other') : (selected.employeeCategory || 'Teaching')],
          ['Designation', selected.designation],
          ['Department', departmentName],
          ['Employment Type', selected.employmentType],
          ['Date of Joining', selected.joiningDate],
          ['Total Experience', years(selected.experience)],
          ['Employment Status', selected.employmentStatus || 'Working'],
        ]
      },
      {
        title: 'Academic Details',
        rows: [
          ['Highest Qualification', selected.qualification === 'Other' && selected.qualificationOther ? `Other (${selected.qualificationOther})` : selected.qualification],
          ['Specialization', selected.specialization],
          ['University / Institution', selected.university],
          ['Year of Passing', selected.passingYear],
          ['Teaching Experience', selected.employeeCategory !== 'Non-Teaching' && selected.teachingExperience ? `${selected.teachingExperience} Years` : '—'],
          ['Industry Experience', selected.industryExperience ? `${selected.industryExperience} Years` : '—'],
        ]
      },
      {
        title: 'Contact Details',
        rows: [
          ['Mobile Number', selected.mobile],
          ['Alternate Mobile', selected.alternateMobile],
          ['Official Email', selected.email],
          ['Personal Email', selected.personalEmail],
          ['Address', selected.address],
          ['City', selected.city],
          ['State', selected.state],
          ['Pincode', selected.pincode],
          ['Emergency Contact Name', selected.emergencyName],
          ['Relationship', selected.relationship],
          ['Emergency Contact Number', selected.emergencyMobile],
        ]
      }
    ]

    content = (
      <div className="cm-profile-view" data-export-record>
        <div className="cm-profile-top-bar">
          <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={() => back()}>
            <FiArrowLeft aria-hidden="true" /> Back
          </button>
          <div className="sp-profile-top-actions">
            <ExportMenu
              mode="single"
              title={selected.employeeCategory === 'Non-Teaching' ? 'Staff Profile' : 'Faculty Profile'}
              filename={`faculty_${displayCode || selected.id}`}
              recordSections={exportSections}
            />
            <button
              type="button"
              className="cm-button erp-btn erp-btn--primary"
              onClick={() => navigate('/faculty/' + selected.id + '/edit?category=' + (selected.employeeCategory || activeCategory))}
              title={`Edit ${selected.employeeCategory === 'Non-Teaching' ? 'Staff' : 'Faculty'}`}
            >
              <FiEdit2 className="sp-profile-edit-icon" aria-hidden="true" /> {selected.employeeCategory === 'Non-Teaching' ? 'Edit Staff' : 'Edit Faculty'}
            </button>
          </div>
        </div>

        <div className="cm-profile-card">
          <div className="cm-profile-banner">
            <div className="cm-profile-avatar-wrap">
              {selected.photo ? (
                <img src={selected.photo} alt={selected.fullName} className="cm-profile-logo" />
              ) : (
                <div className="cm-profile-placeholder">
                  {(selected.fullName || '').split(' ').map(p => p[0]).slice(0, 2).join('') || (selected.employeeCategory === 'Non-Teaching' ? 'STF' : 'FAC')}
                </div>
              )}
            </div>
            <div className="cm-profile-header-info">
              <div className="cm-profile-badges">
                {displayCode && <span className="cm-badge cm-badge-code">{selected.employeeCategory === 'Non-Teaching' ? `STAFF: ${displayCode}` : `FAC: ${displayCode}`}</span>}
                {selected.employeeCategory && <span className="cm-badge cm-badge-type">{selected.employeeCategory}</span>}
                <span className={'cm-status-badge ' + (selected.employmentStatus === 'Working' ? 'active' : 'pending')}>
                  {selected.employmentStatus || 'Working'}
                </span>
              </div>
              <h1 className="cm-profile-title">{selected.fullName || (selected.employeeCategory === 'Non-Teaching' ? 'Staff Member' : 'Faculty Member')}</h1>
              <p className="cm-profile-subtitle">
                {[selected.designation, departmentName, collegeName].filter(Boolean).join(' | ')}
              </p>
            </div>
          </div>

          <div className="sp-profile-cards-container">
            {(
              <>
                <ProfileCard
                  title="Personal Information"
                  icon={FiUser}
                  rows={[
                    ['Faculty Full Name', selected.fullName],
                    ['Gender', selected.gender],
                    ['Date of Birth', selected.dob],
                    ['Blood Group', selected.bloodGroup],
                    ['Aadhaar Number', selected.aadhaarNumber],
                  ]}
                />
                <ProfileCard
                  title="Contact & Communication"
                  icon={FiUser}
                  rows={[
                    ['Mobile Number', selected.mobile],
                    ['Alternate Mobile', selected.alternateMobile],
                    ['Official Email', selected.email],
                    ['Personal Email', selected.personalEmail],
                  ]}
                />
                <ProfileCard
                  title="Address Details"
                  icon={FiMapPin}
                  rows={[
                    ['Address', selected.address],
                    ['City', selected.city],
                    ['State', selected.state],
                    ['Pincode', selected.pincode],
                  ]}
                />
                <ProfileCard
                  title="Emergency Contact"
                  icon={FiUsers}
                  rows={[
                    ['Emergency Contact Name', selected.emergencyName],
                    ['Relationship', selected.relationship],
                    ['Emergency Contact Number', selected.emergencyMobile],
                  ]}
                />
              </>
            )}

            {(
              <>
                <ProfileCard
                  title="Employment Details"
                  icon={FiBriefcase}
                  rows={[
                    ['Faculty ID', displayCode],
                    ['Employee Category', selected.employeeCategory === 'Other' || selected.employeeCategory === 'Others' ? (selected.employeeCategoryOther ? `Other (${selected.employeeCategoryOther})` : 'Other') : (selected.employeeCategory || 'Teaching')],
                    ['Designation', selected.designation],
                    ['Department', departmentName],
                    ['Employment Type', selected.employmentType],
                    ['Date of Joining', selected.joiningDate],
                    ['Total Experience', years(selected.experience)],
                    ['Employment Status', selected.employmentStatus || 'Working'],
                  ]}
                />
              </>
            )}

            {(
              <>
                <ProfileCard
                  title="Academic Qualifications"
                  icon={FiBookOpen}
                  rows={[
                    ['Highest Qualification', selected.qualification === 'Other' && selected.qualificationOther ? `Other (${selected.qualificationOther})` : selected.qualification],
                    ['Specialization', selected.specialization],
                    ['University / Institution', selected.university],
                    ['Year of Passing', selected.passingYear],
                    ['Teaching Experience', selected.teachingExperience ? `${selected.teachingExperience} Years` : '—'],
                    ['Industry Experience', selected.industryExperience ? `${selected.industryExperience} Years` : '—'],
                  ]}
                />
              </>
            )}

            {selected.employeeCategory !== 'Non-Teaching' && (
              <>
                <ProfileCard
                  title="Workload Summary"
                  icon={FiCheckCircle}
                  rows={[
                    ['Total Subjects Assigned', `${load.subjects} Subject${load.subjects === 1 ? '' : 's'}`],
                    ['Total Weekly Hours', `${load.hours || 0} Hours`],
                    ['Workload Status', load.status],
                  ]}
                />
                <section className="sp-profile-panel">
                  <header className="sp-panel-header">
                    <FiBriefcase aria-hidden="true" />
                    <h2>Assigned Subjects & Workload</h2>
                  </header>
                  <div style={{ padding: '14px 18px' }}>
                    {selected.assignments?.length ? (
                      <AssignmentList faculty={selected} onRemove={removeAssignment} />
                    ) : (
                      <p className="fm-muted" style={{ margin: '8px 0' }}>No academic responsibilities assigned yet.</p>
                    )}
                  </div>
                </section>
              </>
            )}

            {(
              <section className="sp-profile-panel">
                <header className="sp-panel-header">
                  <FiFileText aria-hidden="true" />
                  <h2>Supporting Documents & Verification</h2>
                </header>
                <dl className="sp-panel-grid">
                  {FACULTY_DOCUMENTS.map(([key, label]) => {
                    const doc = selected.documents?.[key]
                    const statusVal = typeof doc === 'string' ? doc : (doc?.status || (doc?.uploaded ? 'Submitted' : 'Not Submitted'))
                    return (
                      <div className="sp-panel-item" key={key}>
                        <dt className="sp-panel-label">{label}</dt>
                        <dd className="sp-panel-val" style={{ color: statusVal === 'Submitted' ? '#16a34a' : 'inherit' }}>
                          {statusVal}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            )}
          </div>
        </div>
      </div>
    )
  } else if (!selectedCategory) {
    // Overview Hub Cards view (when user visits /faculty without picking a category)
    content = (
      <>
        <header className="faculty-page-header">
          <div>
            <p className="fm-eyebrow">ACADEMIC RESOURCES</p>
            <h1>Faculty & Staff Management</h1>
            <p>Select a category below to access member directories, manage teaching workloads, staff assignments, and employment profiles.</p>
          </div>
        </header>

        <div className="fm-category-hub-grid">
          {[
            {
              category: 'Teaching',
              title: 'Teaching Faculty',
              description: 'Academic staff, professors, workload & subject allocations',
              members: teachingFaculty,
              icon: FiUsers,
              contractLabel: 'Contract/Guest',
              countLabel: 'Total Faculty',
              viewLabel: 'View Teaching Directory',
              addLabel: 'Add Teaching Faculty',
              addPath: '/faculty/new?category=Teaching',
            },
            {
              category: 'Non-Teaching',
              title: 'Non-Teaching Staff',
              description: 'Administrative officers, librarians, lab tech & campus staff',
              members: nonTeachingFaculty,
              icon: FiBriefcase,
              contractLabel: 'Contract/Temp',
              countLabel: 'Total Staff',
              viewLabel: 'View Staff Directory',
              addLabel: 'Add Non-Teaching Staff',
              addPath: '/faculty/new?category=Non-Teaching',
            },
          ].map(({ category, title, description, members, icon: Icon, contractLabel, countLabel, viewLabel, addLabel, addPath }) => {
            const workingCount = members.filter(member => member.employmentStatus === 'Working').length
            const leaveCount = members.filter(member => member.employmentStatus === 'On Leave').length
            const permanentCount = members.filter(member => member.employmentType === 'Permanent').length
            const contractCount = members.filter(member => member.employmentType && member.employmentType !== 'Permanent').length

            return (
              <article className="fm-hub-card" key={category}>
                <header className="fm-hub-card-header">
                  <div className="fm-hub-card-icon-wrap" aria-hidden="true">
                    <Icon className="fm-hub-card-icon" />
                  </div>
                  <div className="fm-hub-card-meta">
                    <h2>
                      <Link to={`/faculty?category=${category}`}>{title}</Link>
                    </h2>
                    <p>{description}</p>
                  </div>
                  <div className="fm-hub-card-total" aria-label={`${members.length} ${countLabel}`}>
                    <strong>{members.length}</strong>
                    <small>{countLabel}</small>
                  </div>
                </header>

                <div className="fm-hub-metrics-grid" role="region" aria-label={`${title} status breakdown`}>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{workingCount}</span>
                    <span className="fm-hub-metric-lbl">Working</span>
                  </div>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{leaveCount}</span>
                    <span className="fm-hub-metric-lbl">On Leave</span>
                  </div>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{permanentCount}</span>
                    <span className="fm-hub-metric-lbl">Permanent</span>
                  </div>
                  <div className="fm-hub-metric-col">
                    <span className="fm-hub-metric-val">{contractCount}</span>
                    <span className="fm-hub-metric-lbl">{contractLabel}</span>
                  </div>
                </div>

                {members.length === 0 && (
                  <p className="fm-hub-empty-hint">No {category === 'Non-Teaching' ? 'staff' : 'faculty'} records created yet.</p>
                )}

                <footer className="fm-hub-card-footer">
                  <Link className="fm-hub-btn-primary" to={`/faculty?category=${category}`}>
                    {viewLabel} <FiArrowRight aria-hidden="true" />
                  </Link>
                  <Link className="fm-hub-btn-secondary" to={addPath}>
                    <FiPlus aria-hidden="true" /> {addLabel}
                  </Link>
                </footer>
              </article>
            )
          })}
        </div>
      </>
    )
  } else {
    // Directory View for the selected category (Teaching or Non-Teaching)
    const summary = [
      { label: selectedCategory === 'Non-Teaching' ? 'Total Staff' : 'Total Faculty', value: categoryFaculty.length },
      { label: 'Working', value: categoryFaculty.filter(row => row.employmentStatus === 'Working').length, tone: 'active' },
      { label: 'On Leave', value: categoryFaculty.filter(row => row.employmentStatus === 'On Leave').length, tone: 'danger' },
      { label: 'Permanent', value: categoryFaculty.filter(row => row.employmentType === 'Permanent').length, tone: 'upcoming' }
    ]
    content = (
      <>
        <header className="faculty-page-header">
          <div>
            <h1>{selectedCategory === 'Non-Teaching' ? 'Non-Teaching Staff Directory' : 'Teaching Faculty Directory'}</h1>
            <p>{selectedCategory === 'Non-Teaching' ? 'Manage administrative officers, librarians, lab technicians, accountants, and support staff.' : 'Manage professors, associate & assistant professors, lecturers, academic workload, and subject allocations.'}</p>
          </div>
          <div className="fm-header-right">
            <div className="fm-directory-summary-stack">
              <CompactSummary label={`${selectedCategory} summary`} items={summary} />
              <button type="button" className="fm-back-to-hub-btn" onClick={backToOverview}>
                <FiArrowLeft /> Back
              </button>
            </div>
          </div>
        </header>

        <section className="faculty-directory">
          <header className="fm-section-bar">
            <div>
              <p className="fm-eyebrow">{selectedCategory === 'Non-Teaching' ? 'NON-TEACHING STAFF DIRECTORY' : 'TEACHING FACULTY DIRECTORY'}</p>
              <p className="fm-muted">{filtered.length} {selectedCategory === 'Non-Teaching' ? 'staff' : 'faculty'} records</p>
            </div>
            <div className="fm-actions">{directoryActions}</div>
          </header>
          <FilterPanel active={active} onClear={clear}>
            <div className="faculty-filters">
              <label className="faculty-search">
                <FiSearch />
                <input
                  aria-label={`Search ${selectedCategory.toLowerCase()}`}
                  value={query}
                  onChange={event => { setQuery(event.target.value); setPage(1) }}
                  placeholder={`Search ${selectedCategory === 'Non-Teaching' ? 'staff' : 'faculty'} by name, employee ID, email or mobile`}
                />
              </label>
              {[['department', 'Department', departments], ['designation', 'Designation', currentDesignations], ['employmentType', 'Employment Type', employmentTypes], ['employmentStatus', 'Employment Status', statuses]].map(([key, label, options]) => (
                <SearchableSelect key={key} label={label} value={filters[key]} options={options} placeholder={label} onChange={value => { setFilters(old => ({ ...old, [key]: value })); setPage(1) }} />
              ))}
            </div>
          </FilterPanel>
          {filtered.length ? (
            <>
              <div className="faculty-table-wrap">
                <table>
                  <caption className="fm-sr-only">{selectedCategory} directory and records</caption>
                  <thead>
                    <tr>
                      {['Employee ID', 'Name', 'Department', 'Designation', 'Experience', 'Employment Type', 'Status', 'Actions'].map(label => (
                        <th scope="col" key={label} className={['Status', 'Actions'].includes(label) ? 'table-center' : ''}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(item => (
                      <tr key={item.id}>
                        <td><span className="fm-employee-id">{formatFacultyDisplayCode(item, collegeOptions, faculty)}</span></td>
                        <td>
                          <div className="fm-identity">
                            <Avatar faculty={item} />
                            <div>
                              <button
                                type="button"
                                className="student-name-link table-cell-truncate"
                                title={item.fullName}
                                aria-label={`View details for ${item.fullName}`}
                                onClick={() => navigate('/faculty/' + item.id + '?category=' + activeCategory)}
                              >
                                {item.fullName}
                              </button>
                              <small title={item.email}>{item.email}</small>
                            </div>
                          </div>
                        </td>
                        <td className="fm-department">{departmentOptions.find(d => String(d.value) === String(item.departmentId || item.department))?.label || item.department || '—'}</td>
                        <td>{item.designation || '—'}</td>
                        <td>{years(item.experience)}</td>
                        <td>{item.employmentType || '—'}</td>
                        <td className="table-center"><StatusBadge value={item.employmentStatus} /></td>
                        <td className="table-center">
                          <div className="table-actions-cell table-actions-group">
                            {selectedCategory === 'Teaching' && (
                              <button
                                type="button"
                                className="table-action-btn action-assign"
                                title="Assign Academic Work"
                                aria-label={'Assign academic work: ' + item.fullName}
                                onClick={() => setAssignmentId(item.id)}
                              >
                                <FiBriefcase aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="table-action-btn action-edit"
                              title={`Edit ${selectedCategory === 'Non-Teaching' ? 'staff member' : 'faculty'}`}
                              aria-label={'Edit: ' + item.fullName}
                              onClick={() => navigate('/faculty/' + item.id + '/edit?category=' + activeCategory)}
                            >
                              <FiEdit2 aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </>
          ) : (
            <EmptyState
              title={categoryFaculty.length ? `No ${selectedCategory === 'Non-Teaching' ? 'staff' : 'faculty'} found` : `No ${selectedCategory === 'Non-Teaching' ? 'non-teaching staff' : 'teaching faculty'} records available`}
              description={`Add ${selectedCategory === 'Non-Teaching' ? 'staff members' : 'faculty members'} to start managing records.`}
              action={selectedCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty'}
              onAction={() => addFaculty(selectedCategory)}
            />
          )}
        </section>
      </>
    )
  }
  return (
    <DashboardLayout>
      {path === '/faculty' && (
        <nav className="app-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard">Home</Link>
          <span aria-hidden="true">/</span>
          {selectedCategory ? (
            <>
              <Link to="/faculty">Faculty Directory</Link>
              <span aria-hidden="true">/</span>
              <strong aria-current="page">{selectedCategory === 'Non-Teaching' ? 'Non-Teaching Staff' : 'Teaching Faculty'}</strong>
            </>
          ) : <strong aria-current="page">Faculty Directory</strong>}
        </nav>
      )}
      <main className={`faculty-management${path === '/faculty' && !selectedCategory ? ' faculty-management--overview' : ''}`}>
        {loadError && <p className="fm-error" role="alert">{loadError}</p>}
        {loadingFaculty ? <section className="fm-panel">Loading faculty records...</section> : content}
        {assignedFaculty && (
          <AssignmentDialog
            faculty={assignedFaculty}
            onClose={() => setAssignmentId(null)}
            onAdd={addAssignment}
            onRemove={removeAssignment}
            toast={toast}
          />
        )}
        <div className={'fm-toast ' + (toast ? 'visible' : '')} role="status" aria-live="polite">{toast && <><FiCheckCircle />{toast}</>}</div>
      </main>
    </DashboardLayout>
  )
}

return { teachingDesignations, nonTeachingDesignations, getStoredDesignations, getDesignationOptions, formatTimeView, formatFacultyDisplayCode, default: FacultyManagement }
})()

// Payroll screen and private helpers.
const PayrollScreen = (() => {
const DirectoryEmptyState = pageDependency5.default
const { collegeStorageKey } = pageDependency6
const useCollegeState = pageDependency7.default
const FilterPanel = pageDependency19.default
const SearchableSelect = pageDependency0.default
const { useCallback, useEffect, useMemo, useRef, useState } = pageDependency1
const { FiCheck, FiPlus, FiDownload, FiEdit2, FiEye, FiFileText, FiPrinter, FiSearch, FiSlash, FiX } = pageDependency4
const DashboardLayout = pageDependency8.default
const TablePagination = pageDependency11.default
const ExportMenu = pageDependency9.default
const { facultyPayrollApi, facultyAttendanceApi, facultyLeaveApi } = pageDependency3
const facultyService = pageDependency2.default
const { normalizePayroll } = pageDependency12
const { newestFirst, rememberCreated } = pageDependency13
const { ERP_EVENTS } = pageDependency16
const eventBus = pageDependency16.default
const StatusBadge = pageDependency20.default
const { useAcademic } = pageDependency17

const LOCAL_PAYROLL_STATUS_KEY = 'pirnav-faculty-local-payroll-status-v1'
const LOCAL_SALARY_STRUCTURE_KEY = 'pirnav-faculty-local-salary-structures-v1'
const LOCAL_ATTENDANCE_KEY = 'pirnav-faculty-local-attendance-v1'
const LOCAL_LEAVE_DECISIONS_KEY = 'pirnav-faculty-local-leave-decisions-v1'
const LOCAL_LEAVE_TYPES_KEY = 'pirnav-faculty-local-leave-types-v1'

const getLocalPayrollStatuses = () => {
  try { return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_PAYROLL_STATUS_KEY))) || {} } catch { return {} }
}

const getLocalAttendanceList = () => {
  try { return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_ATTENDANCE_KEY))) || [] } catch { return [] }
}

const getLocalLeaveDecisions = () => {
  try { return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_LEAVE_DECISIONS_KEY))) || {} } catch { return {} }
}

const getLocalLeaveTypes = () => {
  try { return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_LEAVE_TYPES_KEY))) || {} } catch { return {} }
}

const saveLocalPayrollStatus = (item, status, reason = '', currentMonth = '') => {
  try {
    const data = getLocalPayrollStatuses()
    const id = String(item.id || item.payrollId || '')
    const facId = String(item.facultyId || '')
    const empId = String(item.employeeId || '')
    const m = currentMonth || item.month || item.payrollMonth || new Date().toISOString().slice(0, 7)
    
    const entry = { status, reason, updatedAt: new Date().toISOString(), month: m }
    if (id) data[id] = entry
    if (facId) {
      data[facId] = entry
      data[`${m}_${facId}`] = entry
    }
    if (empId) {
      data[empId] = entry
      data[`${m}_${empId}`] = entry
    }
    localStorage.setItem(collegeStorageKey(LOCAL_PAYROLL_STATUS_KEY), JSON.stringify(data))
  } catch {}
}

const getLocalSalaryStructures = () => {
  try {
    const scoped = JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_SALARY_STRUCTURE_KEY)))
    if (scoped && typeof scoped === 'object' && Object.keys(scoped).length > 0) return scoped
    const unscoped = JSON.parse(localStorage.getItem(LOCAL_SALARY_STRUCTURE_KEY))
    if (unscoped && typeof unscoped === 'object') return unscoped
    return {}
  } catch { return {} }
}
const getSavedSalaryStructure = (structures, faculty = {}, payrollRow = {}) => {
  if (!structures || typeof structures !== 'object') return null
  const facId = String(payrollRow?.facultyId || faculty?.facultyId || faculty?.id || '')
  const empId = String(payrollRow?.employeeId || faculty?.employeeId || faculty?.facultyCode || '')
  const name = String(payrollRow?.fullName || faculty?.fullName || faculty?.name || '').toLowerCase().trim()
  if (facId && structures[facId]) return structures[facId]
  if (empId && structures[empId]) return structures[empId]
  if (faculty?.id && structures[String(faculty.id)]) return structures[String(faculty.id)]
  if (name) {
    const found = Object.values(structures).find(s => String(s.fullName || s.name || '').toLowerCase().trim() === name)
    if (found) return found
  }
  return null
}

const saveLocalSalaryStructure = (item, salaryData) => {
  try {
    const data = getLocalSalaryStructures()
    const facId = String(item.facultyId || item.id || '')
    const empId = String(item.employeeId || item.facultyCode || (facId ? `EMP${String(facId).padStart(6, '0')}` : ''))
    const entry = {
      ...salaryData,
      facultyId: facId,
      employeeId: empId,
      fullName: item.fullName || item.name,
      department: item.department || 'General',
      designation: item.designation || 'Faculty',
      type: item.employeeCategory || item.type || (item.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'),
      updatedAt: new Date().toISOString()
    }
    if (facId) data[facId] = entry
    if (empId) data[empId] = entry
    if (item.id) data[String(item.id)] = entry
    localStorage.setItem(collegeStorageKey(LOCAL_SALARY_STRUCTURE_KEY), JSON.stringify(data))
    localStorage.setItem(LOCAL_SALARY_STRUCTURE_KEY, JSON.stringify(data))
  } catch {}
}

const calculateDefaultSalaryBreakdown = (designation = '', employeeCategory = '') => {
  const d = String(designation || '').toLowerCase()
  const c = String(employeeCategory || '').toLowerCase()
  let basic = 45000
  if (d.includes('professor') && !d.includes('assistant') && !d.includes('associate')) basic = 85000
  else if (d.includes('associate')) basic = 65000
  else if (d.includes('assistant')) basic = 50000
  else if (d.includes('senior lecturer')) basic = 42000
  else if (d.includes('lecturer')) basic = 35000
  else if (d.includes('lab') || d.includes('instructor')) basic = 28000
  else if (c.includes('non-teaching')) basic = 24000

  const hra = Math.round(basic * 0.20)
  const da = Math.round(basic * 0.15)
  const allowances = Math.round(basic * 0.10)
  const grossSalary = basic + hra + da + allowances
  const pf = Math.round(basic * 0.12)
  const tax = basic > 50000 ? 2500 : 1200
  const deductions = pf + tax
  const netSalary = Math.max(0, grossSalary - deductions)

  return { basicSalary: basic, hra, da, allowances, grossSalary, pf, tax, deductions, netSalary }
}

const calculateEmployeeAttendanceAndLeaves = (fac, m, allAttendance = [], allRequests = [], allDecisions = {}, allTypes = []) => {
  const facId = String(fac.id || fac.facultyId || '')
  const empId = String(fac.employeeId || '')
  const facName = String(fac.fullName || fac.name || '').toLowerCase().trim()

  // 1. Calculate working days in the month (excluding Sundays)
  let workingDays = 26
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mon] = m.split('-').map(Number)
    const daysInMonth = new Date(y, mon, 0).getDate()
    let sundays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(y, mon - 1, d).getDay() === 0) sundays++
    }
    workingDays = daysInMonth - sundays
  }

  // 2. Attendance records for this employee in month m
  const empAttendance = allAttendance.filter(att => {
    const attFacId = String(att.facultyId ?? att.faculty?.id ?? att.id ?? '')
    const attDate = String(att.date || att.attendanceDate || '').slice(0, 7)
    const attName = String(att.fullName || att.facultyName || att.name || '').toLowerCase().trim()
    const matchesEmp = (facId && attFacId === facId) || (empId && (attFacId === empId || String(att.employeeId) === empId)) || (facName && attName === facName)
    return matchesEmp && attDate === m
  })

  let presentDays = 0
  let lateDays = 0
  let halfDays = 0
  let absentDays = 0
  let explicitLopDays = 0

  empAttendance.forEach(att => {
    const st = String(att.status || att.attendanceStatus || '').toLowerCase().replace(/[\s_-]/g, '')
    if (st === 'present' || st === 'p') {
      presentDays += 1
    } else if (st === 'late' || st === 'l') {
      presentDays += 1
      lateDays += 1
    } else if (st === 'halfday' || st === 'hd') {
      presentDays += 0.5
      halfDays += 1
    } else if (st === 'absent' || st === 'a') {
      absentDays += 1
    } else if (st === 'lop' || st === 'lossofpay') {
      explicitLopDays += 1
    }
  })

  // 3. Approved leave requests for this employee in month m
  const approvedLeaves = allRequests.filter(req => {
    const reqFacId = String(req.facultyId ?? req.employee?.id ?? '')
    const reqEmpId = String(req.employeeId ?? req.employee?.employeeId ?? '')
    const reqName = String(req.fullName || req.facultyName || req.employeeName || req.employee?.fullName || '').toLowerCase().trim()
    const matchesEmp = (facId && reqFacId === facId) || (empId && reqEmpId === empId) || (facName && reqName === facName)
    if (!matchesEmp) return false

    const decision = allDecisions[String(req.id)]
    const finalStatus = decision ? decision.status : req.status
    return finalStatus === 'Approved'
  })

  let paidLeaveDays = 0
  let unpaidLeaveDays = 0

  approvedLeaves.forEach(req => {
    const fromStr = String(req.fromDate || req.from || '').slice(0, 10)
    const toStr = String(req.toDate || req.to || '').slice(0, 10)
    
    if (!fromStr || !toStr) return
    const [y, mon] = m.split('-').map(Number)
    const monthStart = `${m}-01`
    const monthEnd = `${m}-${String(new Date(y, mon, 0).getDate()).padStart(2, '0')}`

    const start = fromStr > monthStart ? fromStr : monthStart
    const end = toStr < monthEnd ? toStr : monthEnd

    if (start <= end) {
      const d1 = new Date(start)
      const d2 = new Date(end)
      let daysCount = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
      if (req.days && Number(req.days) > 0 && daysCount > Number(req.days)) {
        daysCount = Number(req.days)
      }

      const typeObj = Array.isArray(allTypes)
        ? allTypes.find(t => String(t.id) === String(req.leaveTypeId) || String(t.code).toUpperCase() === String(req.leaveTypeCode || '').toUpperCase())
        : allTypes[String(req.leaveTypeId)]
      const isUnpaid = typeObj?.payCategory === 'Unpaid Leave' || typeObj?.payCategory === 'Loss of Pay' || /unpaid|lop|without pay/i.test(`${typeObj?.name || ''} ${req.leaveTypeName || ''}`)
      
      if (isUnpaid) {
        unpaidLeaveDays += daysCount
      } else {
        paidLeaveDays += daysCount
      }
    }
  })

  let finalLop = absentDays + explicitLopDays + unpaidLeaveDays
  let finalPresent = presentDays

  if (empAttendance.length === 0) {
    finalPresent = Math.max(0, workingDays - paidLeaveDays - finalLop)
  } else {
    const totalMarked = presentDays + paidLeaveDays + finalLop
    if (totalMarked < workingDays && (absentDays > 0 || explicitLopDays > 0)) {
      finalLop = Math.max(finalLop, workingDays - presentDays - paidLeaveDays)
    }
  }

  return {
    working: workingDays,
    present: Math.min(workingDays, finalPresent),
    late: lateDays,
    halfDay: halfDays,
    paidLeave: paidLeaveDays,
    lop: Math.min(workingDays, finalLop)
  }
}

const calculateEmployeePayrollFigures = (salaryStructure, workingDays = 26, lopDays = 0) => {
  const basic = Number(salaryStructure?.basicSalary) || 0
  const hra = Number(salaryStructure?.hra) || 0
  const da = Number(salaryStructure?.da) || 0
  const allowances = Number(salaryStructure?.allowances) || 0
  const pf = Number(salaryStructure?.pf) || Math.round(basic * 0.12)
  const tax = Number(salaryStructure?.tax) || (basic > 50000 ? 2500 : 1000)

  const grossSalary = basic + hra + da + allowances
  const working = Number(workingDays) || 26
  const lop = Number(lopDays) || 0
  const perDayRate = working > 0 ? Math.round(grossSalary / working) : 0
  const lopAmount = (lop > 0 && working > 0) ? Math.round(perDayRate * lop) : 0
  const totalDeductions = pf + tax + lopAmount
  const netSalary = Math.max(0, grossSalary - totalDeductions)

  return {
    basicSalary: basic,
    hra,
    da,
    allowances,
    pf,
    tax,
    perDayRate,
    lopAmount,
    grossSalary,
    deductions: totalDeductions,
    netSalary
  }
}



const printSalarySlip = (item, month) => {
  const basic = Number(item.basicSalary) || 0
  const hra = Number(item.hra) || 0
  const da = Number(item.da) || 0
  const allowances = Number(item.allowances) || 0
  const pf = Number(item.pf) || 0
  const tax = Number(item.tax) || 0
  const working = Number(item.working) || 26
  const lop = Number(item.lop) || 0
  const gross = basic + hra + da + allowances
  const perDayRate = working > 0 ? Math.round(gross / working) : 0
  const lopAmount = (lop > 0 && working > 0) ? Math.round(perDayRate * lop) : 0
  const totalDeductions = pf + tax + lopAmount
  const netPay = Math.max(0, gross - totalDeductions)
  const mLabel = monthLabel(month)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Salary Slip - ${item.fullName} - ${mLabel}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; background: #fff; }
    .payslip-wrapper { border: 2px solid #1769C2; border-radius: 8px; padding: 24px; max-width: 800px; margin: 0 auto; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #1769C2; padding-bottom: 12px; margin-bottom: 16px; }
    .college-title { font-size: 22px; font-weight: 800; color: #1769C2; margin: 0 0 4px; letter-spacing: 0.5px; }
    .college-sub { font-size: 11px; color: #475569; margin: 0 0 8px; }
    .slip-badge { display: inline-block; padding: 4px 16px; background: #EAF3FF; border: 1px solid #D8E4F2; border-radius: 20px; font-size: 12px; font-weight: 800; color: #125AA8; text-transform: uppercase; }
    
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
    .info-table .lbl { font-weight: 700; color: #475569; background: #f8fafc; width: 22%; }
    .info-table .val { font-weight: 600; color: #0f172a; width: 28%; }
    
    .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .salary-table th { background: #1769C2; color: #ffffff; padding: 8px 12px; text-align: left; font-weight: 700; border: 1px solid #1769C2; }
    .salary-table th.num { text-align: right; }
    .salary-table td { padding: 7px 12px; border: 1px solid #cbd5e1; }
    .salary-table td.num { text-align: right; font-weight: 600; }
    .salary-table .deduct-val { color: #b91c1c; }
    .salary-table .total-row { background: #f8fafc; font-weight: 800; }
    .salary-table .total-row td { border-top: 2px solid #1769C2; border-bottom: 2px solid #1769C2; padding: 9px 12px; }
    
    .net-box { display: flex; justify-content: space-between; align-items: center; background: #EAF3FF; border: 2px solid #1769C2; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .net-title { font-size: 12px; font-weight: 800; color: #554F75; text-transform: uppercase; margin-bottom: 4px; }
    .net-words { font-size: 13px; color: #125AA8; font-weight: 600; }
    .net-amount { font-size: 24px; font-weight: 900; color: #125AA8; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; color: #475569; }
    .sig-block { text-align: center; width: 28%; }
    .sig-line { border-top: 1px dashed #64748b; padding-top: 6px; font-weight: 600; }
    
    .note { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="payslip-wrapper">
    <div class="header">
      <div class="college-title">PIRNAV ENGINEERING COLLEGE</div>
      <div class="college-sub">Approved by AICTE, Affiliated to JNTUH | Hyderabad, Telangana - 500075</div>
      <div class="slip-badge">MONTHLY SALARY SLIP - ${mLabel.toUpperCase()}</div>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="lbl">Employee Name</td>
        <td class="val"><strong>${item.fullName}</strong></td>
        <td class="lbl">Employee ID</td>
        <td class="val"><strong>${item.employeeId}</strong></td>
      </tr>
      <tr>
        <td class="lbl">Designation</td>
        <td class="val">${item.designation || 'Faculty'}</td>
        <td class="lbl">Department</td>
        <td class="val">${item.department || 'General'}</td>
      </tr>
      <tr>
        <td class="lbl">Faculty Category</td>
        <td class="val">${item.type || 'Teaching'}</td>
        <td class="lbl">Pay Period</td>
        <td class="val">${mLabel}</td>
      </tr>
      <tr>
        <td class="lbl">Working / Paid Days</td>
        <td class="val">${working} Days / ${item.present != null ? item.present + (item.paidLeave || 0) : working} Days</td>
        <td class="lbl">LOP Days / Daily Rate</td>
        <td class="val">${lop} Day${lop === 1 ? '' : 's'} (${money(perDayRate)}/day)</td>
      </tr>
    </table>
    
    <table class="salary-table">
      <thead>
        <tr>
          <th style="width:35%;">EARNINGS</th>
          <th class="num" style="width:15%;">AMOUNT (₹)</th>
          <th style="width:35%;">DEDUCTIONS</th>
          <th class="num" style="width:15%;">AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Basic Salary</td>
          <td class="num">${money(basic)}</td>
          <td>Provident Fund (PF)</td>
          <td class="num deduct-val">${money(pf)}</td>
        </tr>
        <tr>
          <td>House Rent Allowance (HRA)</td>
          <td class="num">${money(hra)}</td>
          <td>Professional Tax / TDS</td>
          <td class="num deduct-val">${money(tax)}</td>
        </tr>
        <tr>
          <td>Dearness Allowance (DA)</td>
          <td class="num">${money(da)}</td>
          <td>Loss of Pay (${lop} Day${lop === 1 ? '' : 's'} @ ${money(perDayRate)}/day)</td>
          <td class="num deduct-val">${money(lopAmount)}</td>
        </tr>
        <tr>
          <td>Special Allowances</td>
          <td class="num">${money(allowances)}</td>
          <td>-</td>
          <td class="num" style="color:#94a3b8;">-</td>
        </tr>
        <tr class="total-row">
          <td style="color:#1769C2;">TOTAL GROSS EARNINGS</td>
          <td class="num" style="color:#1769C2;">${money(gross)}</td>
          <td style="color:#b91c1c;">TOTAL DEDUCTIONS</td>
          <td class="num" style="color:#b91c1c;">- ${money(totalDeductions)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="net-box">
      <div>
        <div class="net-title">NET SALARY PAYABLE</div>
        <div class="net-words">Amount in Words: ${numberToWordsIndian(netPay)}</div>
      </div>
      <div class="net-amount">${money(netPay)}</div>
    </div>
    
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">Employee Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Accounts / HR Officer</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Principal / Director</div>
      </div>
    </div>
    
    <div class="note">This is a system-generated salary slip and is valid without physical seal if digitally approved.</div>
  </div>
</body>
</html>`;

  const target = window.open('', '_blank');
  if (!target) {
    alert('Please allow pop-ups to print or download the salary slip.');
    return;
  }
  target.document.open();
  target.document.write(html);
  target.document.close();
  const ready = () => { target.focus(); target.print(); };
  if (target.document.readyState === 'complete') ready();
  else target.addEventListener('load', ready, { once: true });
};

const numberToWordsIndian = (num) => {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only'
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const inWords = (n) => {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '')
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '')
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '')
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '')
  }

  return inWords(Math.floor(num)).trim() + ' Rupees Only'
}

const PAGE_SIZE = 5
const getDefaultPayrollMonth = () => {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const y = lastMonth.getFullYear()
  const m = String(lastMonth.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
const monthLabel = value => value ? new Date(`${value}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Select payroll month'
const money = value => (value == null || isNaN(Number(value))) ? '-' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
const statusClass = value => String(value || 'Draft').toLowerCase().replace(/\s+/g, '-')
function Payroll() {
  const { scopeRecords } = useAcademic()
  const [tab, setTab] = useState('Payroll Processing'), [month, setMonth] = useState(getDefaultPayrollMonth), [selectedIds, setSelectedIds] = useState([]), [query, setQuery] = useState(''), [filters, setFilters] = useState({ type: 'Teaching', department: '', status: '' }), [page, setPage] = useState(1), [selected, setSelected] = useState(null), [hold, setHold] = useState(false), [holdReason, setHoldReason] = useState(''), [editingSalary, setEditingSalary] = useState(null), [payslipItem, setPayslipItem] = useState(null)
  const [facultyList, setFacultyList] = useCollegeState([]), [payroll, setPayroll] = useCollegeState([], { faculty: facultyList }), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const requestVersion = useRef(0), holdLock = useRef(false)
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true); setError('')
    try {
      const fetchRows = tab === 'Salary Records' ? facultyPayrollApi.getSalaryRecords : tab === 'Payslips' ? facultyPayrollApi.getPayslips : facultyPayrollApi.getAll
      const [payrollRes, facultyRes, attendanceRes, leaveRequestsRes, leaveHistoryRes, leaveTypesRes] = await Promise.allSettled([
        fetchRows({ month }),
        facultyService.list(),
        facultyAttendanceApi.getAll({ month }).catch(() => facultyService.getAttendance({ month })).catch(() => []),
        facultyLeaveApi.getRequests().catch(() => []),
        facultyLeaveApi.getHistory().catch(() => []),
        facultyLeaveApi.getTypes().catch(() => [])
      ])
      const data = payrollRes.status === 'fulfilled' && Array.isArray(payrollRes.value) ? payrollRes.value : []
      const facultyRows = facultyRes.status === 'fulfilled' && Array.isArray(facultyRes.value) ? facultyRes.value : []
      const remoteAttendance = attendanceRes.status === 'fulfilled' && Array.isArray(attendanceRes.value) ? attendanceRes.value : []
      const remotePending = leaveRequestsRes.status === 'fulfilled' && Array.isArray(leaveRequestsRes.value) ? leaveRequestsRes.value : []
      const remoteHistory = leaveHistoryRes.status === 'fulfilled' && Array.isArray(leaveHistoryRes.value) ? leaveHistoryRes.value : []
      const remoteTypes = leaveTypesRes.status === 'fulfilled' && Array.isArray(leaveTypesRes.value) ? leaveTypesRes.value : []

      const scopedFaculty = scopeRecords(facultyRows)
      const faculty = scopedFaculty.length > 0 ? scopedFaculty : facultyRows
      setFacultyList(facultyRows)

      const localStatuses = getLocalPayrollStatuses()
      const localSalaries = getLocalSalaryStructures()
      const localAttendance = getLocalAttendanceList()
      const localDecisions = getLocalLeaveDecisions()
      const localTypes = getLocalLeaveTypes()

      // Merge attendance records
      const allAttendance = [...remoteAttendance]
      for (const att of localAttendance) {
        if (!allAttendance.some(a => String(a.id || a.attendanceId) === String(att.id || att.attendanceId))) {
          allAttendance.push(att)
        }
      }

      // Merge leave requests & history
      const allRequests = [...remotePending, ...remoteHistory]

      // Merge leave types
      const allTypes = [...remoteTypes]
      Object.values(localTypes).forEach(lt => {
        if (!allTypes.some(t => String(t.id) === String(lt.id))) {
          allTypes.push(lt)
        }
      })

      let combined = []
      if (data.length > 0) {
        combined = data.map((row) => {
          const fac = faculty.find(f => 
            (row.facultyId && (String(f.id) === String(row.facultyId) || String(f.facultyId) === String(row.facultyId))) ||
            (row.employeeId && String(f.employeeId || f.facultyCode || '').toLowerCase().trim() === String(row.employeeId).toLowerCase().trim()) ||
            (row.fullName && (String(f.fullName || f.name).toLowerCase().trim() === String(row.fullName).toLowerCase().trim())) ||
            (row.facultyName && (String(f.fullName || f.name).toLowerCase().trim() === String(row.facultyName).toLowerCase().trim())) ||
            (tab === 'Payroll Processing' && row.id && (String(f.id) === String(row.id) || String(f.facultyId) === String(row.id)))
          ) || row

          const resolvedFacultyId = row.facultyId || fac.facultyId || fac.id || row.id
          const resolvedEmpId = row.employeeId || fac.employeeId || fac.facultyCode || (resolvedFacultyId ? `EMP${String(resolvedFacultyId).padStart(6, '0')}` : '') || (fac.id ? `EMP${String(fac.id).padStart(6, '0')}` : '')
          const statusOverride = localStatuses[`${month}_${resolvedFacultyId}`]?.status ||
            localStatuses[`${month}_${resolvedEmpId}`]?.status ||
            localStatuses[String(row.id)]?.status ||
            localStatuses[String(resolvedFacultyId)]?.status
          
          const attMetrics = calculateEmployeeAttendanceAndLeaves(
            { id: resolvedFacultyId, employeeId: resolvedEmpId, fullName: row.fullName || fac.fullName || fac.name },
            month,
            allAttendance,
            allRequests,
            localDecisions,
            allTypes
          )

          const defaultBreakdown = calculateDefaultSalaryBreakdown(fac.designation || row.designation, fac.employeeCategory || row.type)
          const savedSalary = getSavedSalaryStructure(localSalaries, fac, row) || {
            basicSalary: row.basicSalary ?? defaultBreakdown.basicSalary,
            hra: row.hra ?? defaultBreakdown.hra,
            da: row.da ?? defaultBreakdown.da,
            allowances: row.allowances ?? defaultBreakdown.allowances,
            pf: row.pf ?? defaultBreakdown.pf,
            tax: row.tax ?? defaultBreakdown.tax,
            grossSalary: row.grossSalary ?? defaultBreakdown.grossSalary,
            deductions: row.deductions ?? defaultBreakdown.deductions,
            netSalary: row.netSalary ?? defaultBreakdown.netSalary
          }

          const workingDays = row.workingDays || row.working || attMetrics.working
          const lopDays = (row.lopDays != null && row.lopDays !== 0) ? row.lopDays : attMetrics.lop
          const presentDays = (row.presentDays != null) ? row.presentDays : attMetrics.present
          const paidLeaveDays = (row.paidLeaveDays != null && row.paidLeaveDays !== 0) ? row.paidLeaveDays : attMetrics.paidLeave

          const figures = calculateEmployeePayrollFigures(savedSalary, workingDays, lopDays)
          const memberType = (fac.employeeCategory === 'Non-Teaching' || String(fac.type || row.type).toLowerCase().includes('non') || String(fac.employmentType).toLowerCase().includes('non')) ? 'Non-Teaching' : 'Teaching'

          return normalizePayroll({
            ...row,
            id: row.id || `pr-${resolvedFacultyId}-${month}`,
            payrollId: row.payrollId || row.id || resolvedFacultyId,
            facultyId: resolvedFacultyId,
            employeeId: resolvedEmpId,
            fullName: row.fullName || fac.fullName || fac.name || row.facultyName,
            designation: row.designation || fac.designation || 'Faculty',
            department: row.department || fac.department || 'General',
            type: memberType,
            workingDays,
            presentDays,
            lateDays: attMetrics.late,
            halfDays: attMetrics.halfDay,
            paidLeaveDays,
            lopDays,
            status: statusOverride || row.status || (tab === 'Salary Records' ? 'Paid' : 'Draft'),
            basicSalary: figures.basicSalary,
            hra: figures.hra,
            da: figures.da,
            allowances: figures.allowances,
            pf: figures.pf,
            tax: figures.tax,
            grossSalary: figures.grossSalary,
            deductions: figures.deductions,
            netSalary: figures.netSalary
          })
        }).filter(Boolean)
      } else if (faculty.length > 0) {
        combined = faculty.map(fac => {
          const defaultBreakdown = calculateDefaultSalaryBreakdown(fac.designation, fac.employeeCategory)
          const savedSalary = getSavedSalaryStructure(localSalaries, fac) || defaultBreakdown
          const statusOverride = localStatuses[`${month}_${fac.id}`]?.status ||
            localStatuses[`pr-${fac.id}-${month}`]?.status ||
            localStatuses[String(fac.id)]?.status

          const attMetrics = calculateEmployeeAttendanceAndLeaves(
            fac,
            month,
            allAttendance,
            allRequests,
            localDecisions,
            allTypes
          )

          const figures = calculateEmployeePayrollFigures(savedSalary, attMetrics.working, attMetrics.lop)
          const memberType = (fac.employeeCategory === 'Non-Teaching' || String(fac.type).toLowerCase().includes('non') || String(fac.employmentType).toLowerCase().includes('non')) ? 'Non-Teaching' : 'Teaching'

          return normalizePayroll({
            id: `pr-${fac.id}-${month}`,
            payrollId: fac.id,
            facultyId: fac.id,
            employeeId: fac.employeeId || fac.facultyCode || `EMP${String(fac.id).padStart(6, '0')}`,
            fullName: fac.fullName || fac.name,
            designation: fac.designation || 'Faculty',
            department: fac.department || 'General',
            type: memberType,
            workingDays: attMetrics.working,
            presentDays: attMetrics.present,
            lateDays: attMetrics.late,
            halfDays: attMetrics.halfDay,
            paidLeaveDays: attMetrics.paidLeave,
            lopDays: attMetrics.lop,
            status: statusOverride || (tab === 'Salary Records' ? 'Paid' : 'Draft'),
            payrollMonth: month,
            basicSalary: figures.basicSalary,
            hra: figures.hra,
            da: figures.da,
            allowances: figures.allowances,
            pf: figures.pf,
            tax: figures.tax,
            grossSalary: figures.grossSalary,
            deductions: figures.deductions,
            netSalary: figures.netSalary
          })
        }).filter(Boolean)
      }

      // Also merge any configured local salary structures that might not be in the initial combined list
      if (tab === 'Salary Records' || tab === 'Payroll Processing') {
        const localStructValues = Object.values(localSalaries)
        localStructValues.forEach(struct => {
          const structFacId = String(struct.facultyId || '')
          const structEmpId = String(struct.employeeId || '')
          const alreadyInList = combined.some(item => 
            (structFacId && String(item.facultyId) === structFacId) ||
            (structEmpId && String(item.employeeId) === structEmpId) ||
            (struct.fullName && String(item.fullName).toLowerCase().trim() === String(struct.fullName).toLowerCase().trim())
          )
          if (!alreadyInList && (struct.fullName || struct.employeeId || struct.facultyId)) {
            const figures = calculateEmployeePayrollFigures(struct, 26, 0)
            const fallbackMemberType = (struct.type === 'Non-Teaching' || struct.employeeCategory === 'Non-Teaching') ? 'Non-Teaching' : 'Teaching'
            combined.push(normalizePayroll({
              id: structFacId ? `pr-${structFacId}-${month}` : `pr-${Date.now()}-${month}`,
              payrollId: structFacId || struct.id,
              facultyId: structFacId,
              employeeId: structEmpId || (structFacId ? `EMP${String(structFacId).padStart(6, '0')}` : ''),
              fullName: struct.fullName || struct.name || 'Faculty Member',
              designation: struct.designation || 'Faculty',
              department: struct.department || 'General',
              type: fallbackMemberType,
              workingDays: 26,
              presentDays: 26,
              paidLeaveDays: 0,
              lopDays: 0,
              status: 'Paid',
              payrollMonth: month,
              basicSalary: figures.basicSalary,
              hra: figures.hra,
              da: figures.da,
              allowances: figures.allowances,
              pf: figures.pf,
              tax: figures.tax,
              grossSalary: figures.grossSalary,
              deductions: figures.deductions,
              netSalary: figures.netSalary
            }))
          }
        })
      }

      if (version === requestVersion.current) setPayroll(newestFirst('payroll', combined))
    } catch (reason) { if (version === requestVersion.current) { setPayroll([]); setError(reason.message) } }
    finally { if (version === requestVersion.current) setLoading(false) }
  }, [month, tab, scopeRecords, setFacultyList, setPayroll])
  useEffect(() => { load(); return () => { requestVersion.current++ } }, [load])
  useEffect(() => {
    const unsubLeave = eventBus.subscribe(ERP_EVENTS.LEAVE_UPDATED, () => {
      load()
    })
    const unsubAtt = eventBus.subscribe(ERP_EVENTS.ATTENDANCE_RECORDED, () => {
      load()
    })
    return () => {
      unsubLeave()
      unsubAtt()
    }
  }, [load])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2000)
    return () => clearTimeout(timer)
  }, [notice])
  const departments = [...new Set(payroll.map(item => item.department).filter(Boolean))]
  const rows = useMemo(() => payroll.filter(row => (!query || (row.employeeId + ' ' + row.fullName + ' ' + row.department).toLowerCase().includes(query.toLowerCase())) && (!filters.type || row.type === filters.type) && (!filters.department || row.department === filters.department) && (!filters.status || row.status === filters.status)), [payroll, query, filters])
  const view = async row => {
    // A new faculty member can have a draft processing row before a separate
    // payroll detail record exists. The row itself is enough for View.
    setError('')
    setSelected(normalizePayroll(row))
    setHoldReason('')
    try {
      const detail = await facultyPayrollApi.getById(row.id)
      setSelected(normalizePayroll({ ...row, ...detail }))
    } catch {
      // Keep the list row open when the optional detail record is unavailable.
    }
  }
  
  const getFullBreakdownForRow = (row) => {
    const facBreakdown = calculateDefaultSalaryBreakdown(row.designation, row.type)
    const savedBreakdown = getLocalSalaryStructures()[String(row.facultyId || row.id)] ||
      getLocalSalaryStructures()[String(row.employeeId)] || {}
    const salaryStruct = {
      basicSalary: row.basicSalary ?? savedBreakdown.basicSalary ?? facBreakdown.basicSalary,
      hra: row.hra ?? savedBreakdown.hra ?? facBreakdown.hra,
      da: row.da ?? savedBreakdown.da ?? facBreakdown.da,
      allowances: row.allowances ?? savedBreakdown.allowances ?? facBreakdown.allowances,
      pf: row.pf ?? savedBreakdown.pf ?? Math.round((Number(row.basicSalary || savedBreakdown.basicSalary || facBreakdown.basicSalary) || 0) * 0.12),
      tax: row.tax ?? savedBreakdown.tax ?? (Number(row.basicSalary || savedBreakdown.basicSalary || facBreakdown.basicSalary) > 50000 ? 2500 : 1000),
    }
    const working = Number(row.working || row.workingDays) || 26
    const lop = Number(row.lop || row.lopDays) || 0
    const figures = calculateEmployeePayrollFigures(salaryStruct, working, lop)
    return { ...row, ...figures, working, lop }
  }

  const handleOpenPayslip = (row) => {
    const fullRow = getFullBreakdownForRow(row)
    setPayslipItem(fullRow)
  }

  const handlePrintPayslipDirect = (row) => {
    handleOpenPayslip(row)
  }

  const handleSaveSalaryStructure = (facultyItem, salaryData) => {
    saveLocalSalaryStructure(facultyItem, salaryData)
    load()
    setPage(1)
    setEditingSalary(null)
    setNotice(`Salary structure configured for ${facultyItem.fullName || facultyItem.name}.`)
  }

  const handleApprove = async (row) => {
    saveLocalPayrollStatus(row, 'Processed', '', month)
    setPayroll(prev => prev.map(item => (String(item.id) === String(row.id) || (row.facultyId && String(item.facultyId) === String(row.facultyId))) ? { ...item, status: 'Processed' } : item))
    if (selected && (String(selected.id) === String(row.id) || String(selected.facultyId) === String(row.facultyId))) {
      setSelected(prev => ({ ...prev, status: 'Processed' }))
    }
    setNotice(`Payroll for ${row.fullName} processed successfully.`)
  }


  const toggleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return Array.from(next)
    })
  }

  const toggleSelectAll = () => {
    const visibleIds = visible.map(r => String(r.id))
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleBulkApprove = async (targetRows = null) => {
    let rowsToApprove = targetRows
    if (!rowsToApprove) {
      if (selectedIds.length > 0) {
        rowsToApprove = rows.filter(r => selectedIds.includes(String(r.id)) && (r.status === 'Draft' || r.status === 'Hold'))
      } else {
        rowsToApprove = rows.filter(r => r.status === 'Draft' || r.status === 'Hold')
      }
    }
    if (!rowsToApprove || !rowsToApprove.length) {
      setNotice('No pending (Draft / Hold) payroll records to approve.')
      return
    }
    setBusy(true)
    rowsToApprove.forEach(row => {
      saveLocalPayrollStatus(row, 'Processed', '', month)
    })
    const idsToUpdate = new Set(rowsToApprove.map(r => String(r.id)))
    const facIdsToUpdate = new Set(rowsToApprove.map(r => String(r.facultyId)).filter(Boolean))
    setPayroll(prev => prev.map(item => {
      if (idsToUpdate.has(String(item.id)) || (item.facultyId && facIdsToUpdate.has(String(item.facultyId)))) {
        return { ...item, status: 'Processed' }
      }
      return item
    }))
    setSelectedIds([])
    setBusy(false)
    setNotice(`Successfully approved payroll for ${rowsToApprove.length} employee(s).`)
  }

  const handleBulkMarkPaid = async () => {
    const rowsToPay = rows.filter(r => selectedIds.includes(String(r.id)) && r.status === 'Processed')
    if (!rowsToPay.length) {
      setNotice('No Processed payroll records selected to mark as Paid.')
      return
    }
    setBusy(true)
    rowsToPay.forEach(row => {
      saveLocalPayrollStatus(row, 'Paid', '', month)
    })
    const idsToUpdate = new Set(rowsToPay.map(r => String(r.id)))
    const facIdsToUpdate = new Set(rowsToPay.map(r => String(r.facultyId)).filter(Boolean))
    setPayroll(prev => prev.map(item => {
      if (idsToUpdate.has(String(item.id)) || (item.facultyId && facIdsToUpdate.has(String(item.facultyId)))) {
        return { ...item, status: 'Paid' }
      }
      return item
    }))
    setSelectedIds([])
    setBusy(false)
    setNotice(`Marked ${rowsToPay.length} payroll record(s) as Paid.`)
  }

  const handleMarkPaid = async (row) => {
    saveLocalPayrollStatus(row, 'Paid', '', month)
    setPayroll(prev => prev.map(item => (String(item.id) === String(row.id) || (row.facultyId && String(item.facultyId) === String(row.facultyId))) ? { ...item, status: 'Paid' } : item))
    if (selected && (String(selected.id) === String(row.id) || String(selected.facultyId) === String(row.facultyId))) {
      setSelected(prev => ({ ...prev, status: 'Paid' }))
    }
    setNotice(`Payroll for ${row.fullName} marked as Paid.`)
  }

  const handleOpenHold = (row) => {
    setSelected(row)
    setHoldReason(row.holdReason || '')
    setHold(true)
  }

  const placeHold = async event => {
    event.preventDefault(); if (!holdReason.trim() || holdLock.current) return
    holdLock.current = true; setBusy(true); setError('')
    saveLocalPayrollStatus(selected, 'Hold', holdReason.trim(), month)
    setPayroll(prev => prev.map(item => (String(item.id) === String(selected.id) || (selected.facultyId && String(item.facultyId) === String(selected.facultyId))) ? { ...item, status: 'Hold', holdReason: holdReason.trim() } : item))
    try {
      await facultyPayrollApi.hold(selected.id, holdReason.trim())
    } catch {}
    finally {
      holdLock.current = false
      setBusy(false)
      setHold(false)
      setSelected(null)
      setNotice(`Payroll for ${selected.fullName} placed on hold.`)
    }
  }
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)), currentPage = Math.min(page, totalPages), visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const updateFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const clear = () => { setQuery(''); setFilters({ type: 'Teaching', department: '', status: '' }); setPage(1) }
  const columns = [['employeeId', 'Employee ID'], ['fullName', 'Employee'], ['type', 'Type'], ['department', 'Department'], ['working', 'Working Days'], ['present', 'Present'], ['paidLeave', 'Paid Leave'], ['lop', 'LOP'], ['status', 'Status']].map(([value, label]) => ({ label, value }))
  const exportColumns = tab === 'Payroll Processing'
    ? [...columns, { label: 'Gross Salary', value: 'grossSalary' }, { label: 'Deductions', value: 'deductions' }, { label: 'Net Salary', value: 'netSalary' }]
    : tab === 'Salary Records'
      ? [['employeeId', 'Employee ID'], ['fullName', 'Employee'], ['type', 'Type'], ['department', 'Department'], ['basicSalary', 'Basic Salary'], ['grossSalary', 'Gross Salary'], ['deductions', 'Deductions'], ['netSalary', 'Net Salary']].map(([value, label]) => ({ label, value }))
      : [['month', 'Payroll Month'], ['employeeId', 'Employee ID'], ['fullName', 'Employee'], ['type', 'Type'], ['department', 'Department'], ['grossSalary', 'Gross Salary'], ['deductions', 'Deductions'], ['netSalary', 'Net Salary'], ['status', 'Status']].map(([value, label]) => ({ label, value }))
  const processed = rows.filter(row => row.status === 'Processed').length, onHold = rows.filter(row => row.status === 'Hold').length, lop = rows.reduce((sum, row) => sum + row.lop, 0)
  const title = tab === 'Payroll Processing' ? 'Payroll Processing' : tab
  const emptyText = tab === 'Payroll Processing' ? `No payroll records found for ${monthLabel(month)}.` : tab === 'Salary Records' ? 'No salary records found.' : 'No payslips found for the selected filters.'
  return <DashboardLayout><main className="faculty-payroll">{error && <p className="flm-error" role="alert">{error} <button onClick={load}>Retry</button></p>}<header className="fp-header"><div><p>HOME / FACULTY / PAYROLL</p><h1>Faculty Payroll</h1><span>Process faculty salaries using attendance, leave and payroll data.</span></div><div className="fp-summary">{[['Total Employees', rows.length], ['Processed', processed], ['On Hold', onHold], ['LOP Days', lop]].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header><section className="fp-card"><header><div><p>{title.toUpperCase()}</p><h2>{tab === 'Payroll Processing' ? monthLabel(month) : title}</h2></div><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="fp-category-choice" role="group" aria-label="Faculty type">
            <div>
              <button type="button" className={filters.type === 'Teaching' ? 'active' : ''} onClick={() => updateFilter('type', 'Teaching')}>Teaching Faculty</button>
              <button type="button" className={filters.type === 'Non-Teaching' ? 'active' : ''} onClick={() => updateFilter('type', 'Non-Teaching')}>Non-Teaching Staff</button>
            </div>
          </div>
          {tab === 'Payroll Processing' && (
            <label className="fp-payroll-period">
              <span>Payroll Period</span>
              <input type="month" value={month} onChange={event => { setMonth(event.target.value); setPage(1) }} aria-label="Payroll Period" />
            </label>
          )}
          {tab === 'Salary Records' && (
            <button
              type="button"
              className="fp-add-salary-btn"
              onClick={() => setEditingSalary({ isNew: true })}
              title="Add / Define Salary Structure for an Employee"
            >
              <FiPlus /> Add Salary Structure
            </button>
          )}
        </div></header><nav>{['Payroll Processing', 'Salary Records', 'Payslips'].map(item => <button type="button" className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setPage(1); setSelectedIds([]) }} key={item}>{item}</button>)}</nav><FilterPanel className="fp-filter-panel" active={Boolean(query || filters.department || filters.status)} onClear={clear} hideClear actions={<ExportMenu rows={rows} columns={exportColumns} title={title} filename={`faculty-payroll-${month}`} loading={loading || Boolean(error)} scope="All filtered results" />}>
          <div className="fp-filter-fields">
            <label className="fp-search"><FiSearch aria-hidden="true" /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} aria-label="Search payroll employees" placeholder="Search employee..." /></label>
            <div className="fp-filter-field"><span>Department</span><SearchableSelect label="Department" value={filters.department} options={[{ value: '', label: 'All Departments' }, ...departments]} placeholder="All Departments" onChange={value => updateFilter('department', value)} /></div>
            {tab !== 'Payslips' && <div className="fp-filter-field"><span>Payroll Status</span><SearchableSelect label="Payroll Status" value={filters.status} options={[{ value: '', label: 'All Statuses' }, 'Draft', 'Processed', 'Paid', 'Hold']} placeholder="All Statuses" onChange={value => updateFilter('status', value)} hideSearch /></div>}
          </div>
        </FilterPanel>
      {tab === 'Payroll Processing' && selectedIds.length > 0 && (
        <div className="fp-bulkbar">
          <strong>{selectedIds.length} employee(s) selected</strong>
          <button
            type="button"
            className="fp-bulkbar-btn primary"
            onClick={() => handleBulkApprove()}
          >
            <FiCheck /> Approve Selected ({selectedIds.length})
          </button>
          <button
            type="button"
            className="fp-bulkbar-btn pay"
            onClick={handleBulkMarkPaid}
          >
            <FiCheck /> Mark Selected as Paid
          </button>
          <button
            type="button"
            className="fp-bulkbar-btn secondary"
            onClick={() => setSelectedIds([])}
          >
            Clear Selection
          </button>
        </div>
      )}
<div className="fp-table">{loading ? (
  <div className="fp-empty" role="status" style={{ padding: '36px 16px', textAlign: 'center' }}>
    <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #1769C2', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '8px' }} />
    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Loading payroll records...</p>
  </div>
) : rows.length ? <table><thead><tr>{tab === 'Payroll Processing' && (
      <th style={{ width: '40px', textAlign: 'center' }}>
        <input
          type="checkbox"
          aria-label="Select all employees"
          checked={visible.length > 0 && visible.every(r => selectedIds.includes(String(r.id)))}
          onChange={toggleSelectAll}
        />
      </th>
    )}{(tab === 'Payroll Processing' ? ['Employee ID', 'Employee', 'Type', 'Department', 'Working Days', 'Present', 'Paid Leave', 'LOP', 'Gross Salary', 'Deductions', 'Net Salary', 'Status', 'Action'] : tab === 'Salary Records' ? ['Employee ID', 'Employee', 'Type', 'Department', 'Basic Salary', 'Gross Salary', 'Deductions', 'Net Salary', 'Action'] : ['Payroll Month', 'Employee ID', 'Employee', 'Type', 'Department', 'Gross Salary', 'Deductions', 'Net Salary', 'Status', 'Action']).map(item => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id}>
      {tab === 'Payroll Processing' && (
        <td style={{ textAlign: 'center' }}>
          <input
            type="checkbox"
            aria-label={`Select ${row.fullName}`}
            checked={selectedIds.includes(String(row.id))}
            onChange={() => toggleSelectRow(String(row.id))}
          />
        </td>
      )}
      {tab === 'Payslips' && <td>{monthLabel(month)}</td>}
      <td>{row.employeeId}</td>
      <td><strong>{row.fullName}</strong><small>{row.designation}</small></td>
      <td>{row.type}</td>
      <td>{row.department}</td>
      {tab === 'Payroll Processing' && (
        <>
          <td>{row.working}</td>
          <td>{row.present}</td>
          <td>{row.paidLeave}</td>
          <td><span className={row.lop ? 'fp-lop' : ''}>{row.lop}</span></td>
        </>
      )}
      {tab === 'Salary Records' && <td>{money(row.basicSalary)}</td>}
      <td>{money(row.grossSalary)}</td>
      <td>{money(row.deductions)}</td>
      <td>{money(row.netSalary)}</td>
      {tab !== 'Salary Records' && <td><StatusBadge value={row.status} /></td>}
      <td>
  <div className="fp-actions">
    {tab !== 'Payslips' && (
      <button type="button" title="View details" aria-label={`View details for ${row.fullName}`} onClick={() => view(row)}>
        <FiEye />
      </button>
    )}
    {tab === 'Payroll Processing' && (
      <>
        {row.status === 'Hold' && (
          <button type="button" className="fp-approve-btn" title="Approve / Release Hold" aria-label={`Approve payroll for ${row.fullName}`} onClick={() => handleApprove(row)}>
            <FiCheck />
          </button>
        )}
        {row.status === 'Draft' && (
          <>
            <button type="button" className="fp-approve-btn" title="Process Payroll" aria-label={`Process payroll for ${row.fullName}`} onClick={() => handleApprove(row)}>
              <FiCheck />
            </button>
            <button type="button" className="fp-hold-btn" title="Place on Hold" aria-label={`Place payroll on hold for ${row.fullName}`} onClick={() => handleOpenHold(row)}>
              <FiSlash />
            </button>
          </>
        )}
        {row.status === 'Processed' && (
          <>
            <button type="button" className="fp-pay-btn" title="Mark as Paid" aria-label={`Mark as paid for ${row.fullName}`} onClick={() => handleMarkPaid(row)}>
              <FiCheck />
            </button>
            <button type="button" className="fp-hold-btn" title="Place on Hold" aria-label={`Place payroll on hold for ${row.fullName}`} onClick={() => handleOpenHold(row)}>
              <FiSlash />
            </button>
          </>
        )}
      </>
    )}
    {tab === 'Salary Records' && (
      <button type="button" className="fp-edit-btn" title="Configure / Edit Salary" aria-label={`Configure salary for ${row.fullName}`} onClick={() => setEditingSalary(row)}>
        <FiEdit2 />
      </button>
    )}
    {tab === 'Payslips' && (
      <>
        <button
          type="button"
          className="fp-print-payslip-btn"
          title="Print / View Salary Slip"
          aria-label={`Print salary slip for ${row.fullName}`}
          onClick={() => handleOpenPayslip(row)}
        >
          <FiPrinter />
        </button>
      </>
    )}
  </div>
</td></tr>)}</tbody></table> : tab === 'Salary Records' && !loading && !error ? <DirectoryEmptyState title="No salary records found." actionLabel="Add Salary Structure" onAction={() => setEditingSalary({ isNew: true })} /> : <p className="fp-empty">{emptyText}</p>}</div>{rows.length > PAGE_SIZE && <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />}</section>{selected && (() => {
  const full = getFullBreakdownForRow(selected)
  const basic = full.basicSalary
  const hra = full.hra
  const da = full.da
  const allowances = full.allowances
  const pf = full.pf
  const tax = full.tax
  const lopAmount = full.lopAmount || 0
  const gross = full.grossSalary
  const deductions = full.deductions
  const net = full.netSalary

  return (
    <div className="fp-overlay">
      <section className="fp-dialog fp-view-dialog" role="dialog" aria-modal="true" aria-label="Payroll details" style={{ maxWidth: '640px' }}>
        <button className="fp-close" type="button" aria-label="Close payroll details" onClick={() => setSelected(null)}><FiX /></button>
        <p>{tab === 'Salary Records' ? 'SALARY STRUCTURE DETAILS' : 'PAYROLL DETAILS'}</p>
        <h2>{selected.fullName}</h2>
        <span>{selected.employeeId} | {selected.designation} | {selected.department} | {selected.type}</span>
        {tab !== 'Salary Records' && <b className={`fp-status ${statusClass(selected.status)}`}>{selected.status}</b>}

        {tab !== 'Salary Records' && (
          <>
            <h3 style={{ marginTop: '16px' }}>Payroll Period</h3>
            <dl>
              <div><dt>Payroll Month</dt><dd>{monthLabel(month)}</dd></div>
              <div><dt>Working Days</dt><dd>{selected.working}</dd></div>
            </dl>

            <h3>Attendance Summary</h3>
            <dl className="fp-attendance-summary">
              {[['Present', selected.present, 'present'], ['Late', selected.late, 'late'], ['Half Day', selected.halfDay, 'half-day'], ['Paid Leave', selected.paidLeave, 'leave'], ['LOP Days', selected.lop, 'lop']].map(([label, value, tone]) => (
                <div className={tone} key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </>
        )}

        <h3 style={{ marginTop: '18px' }}>Salary Breakdown & Structure</h3>
        <div className="fp-salary-breakdown-card">
          <h4 style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '800', color: 'var(--brand, #1769C2)', textTransform: 'uppercase' }}>Earnings & Allowances</h4>
          <dl className="fp-breakdown-grid">
            <div><dt>Basic Salary</dt><dd>{money(basic)}</dd></div>
            <div><dt>HRA (House Rent)</dt><dd>{money(hra)}</dd></div>
            <div><dt>DA (Dearness Allowance)</dt><dd>{money(da)}</dd></div>
            <div><dt>Special Allowances</dt><dd>{money(allowances)}</dd></div>
          </dl>

          <h4 style={{ margin: '14px 0 8px', fontSize: '11px', fontWeight: '800', color: 'var(--danger, #b42318)', textTransform: 'uppercase' }}>Deductions & Adjustments</h4>
          <dl className="fp-breakdown-grid">
            <div><dt>Provident Fund (PF)</dt><dd>{money(pf)}</dd></div>
            <div><dt>Professional Tax / TDS</dt><dd>{money(tax)}</dd></div>
            <div>
              <dt>Daily Pay Rate</dt>
              <dd>{money(full.perDayRate || Math.round(gross / (selected.working || 26)))} / day</dd>
            </div>
            {selected.lop > 0 ? (
              <div>
                <dt>Loss of Pay ({selected.lop} Day{selected.lop === 1 ? '' : 's'} @ {money(full.perDayRate || Math.round(gross / (selected.working || 26)))}/day)</dt>
                <dd style={{ color: '#b91c1c', fontWeight: '700' }}>- {money(lopAmount)}</dd>
              </div>
            ) : (
              <div>
                <dt>Loss of Pay (0 LOP Days)</dt>
                <dd style={{ color: '#64748b' }}>₹0</dd>
              </div>
            )}
          </dl>

          <div className="fp-breakdown-summary">
            <div className="item">
              <span>Gross Salary:</span>
              <strong>{money(gross)}</strong>
            </div>
            <div className="item deductions">
              <span>Total Deductions:</span>
              <strong>- {money(deductions)}</strong>
            </div>
            <div className="item net">
              <span>Net Take-Home Pay:</span>
              <strong>{money(net)}</strong>
            </div>
          </div>
        </div>

        <footer>
          <button type="button" onClick={() => setSelected(null)}>Close</button>
        </footer>
      </section>
    </div>
  )
})()}{notice && <div className="flm-toast">{notice}<button onClick={() => setNotice('')}><FiX /></button></div>}
{payslipItem && <SalarySlipModal item={payslipItem} month={month} onClose={() => setPayslipItem(null)} />}
{editingSalary && <SalaryConfigModal key={editingSalary.isNew ? 'new-salary-structure' : `salary-${editingSalary.id || editingSalary.facultyId}`} item={editingSalary} facultyList={facultyList} activeCategory={filters.type || 'Teaching'} onClose={() => setEditingSalary(null)} onSave={handleSaveSalaryStructure} />}
{hold && selected && <div className="fp-overlay"><form className="fp-dialog fp-hold" onSubmit={placeHold}><h2>Place Payroll on Hold</h2><p>{selected.fullName} | {monthLabel(month)}</p><label><span>Reason <b className="required-mark">*</b></span><textarea value={holdReason} onChange={event => setHoldReason(event.target.value)} required /></label><footer><button type="button" onClick={() => setHold(false)}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place on Hold'}</button></footer></form></div>}</main></DashboardLayout>
}


function SalaryConfigModal({ item, facultyList = [], activeCategory = 'Teaching', onClose, onSave }) {
  const isNew = Boolean(item?.isNew)
  const [selectedFacultyId, setSelectedFacultyId] = useState(isNew ? '' : (item?.facultyId || item?.id || ''))
  const [activeFaculty, setActiveFaculty] = useState(isNew ? null : item)

  const [basic, setBasic] = useState(isNew ? '' : (item?.basicSalary ?? ''))
  const [hra, setHra] = useState(isNew ? '' : (item?.hra ?? ''))
  const [da, setDa] = useState(isNew ? '' : (item?.da ?? ''))
  const [allowances, setAllowances] = useState(isNew ? '' : (item?.allowances ?? ''))
  const [pf, setPf] = useState(isNew ? '' : (item?.pf ?? ''))
  const [tax, setTax] = useState(isNew ? '' : (item?.tax ?? ''))

  useEffect(() => {
    if (!isNew) return
    setSelectedFacultyId('')
    setActiveFaculty(null)
    setBasic('')
    setHra('')
    setDa('')
    setAllowances('')
    setPf('')
    setTax('')
  }, [isNew])

  const getMemberCategory = (f) => {
    const cat = String(f?.employeeCategory || f?.type || f?.category || f?.employmentType || '').trim().toLowerCase()
    if (cat.includes('non')) return 'Non-Teaching'
    const desig = String(f?.designation || '').toLowerCase()
    if (desig.includes('lab') || (desig.includes('assistant') && (desig.includes('admin') || desig.includes('librarian') || desig.includes('clerk')))) {
      return 'Non-Teaching'
    }
    return 'Teaching'
  }

  const filteredFacultyList = useMemo(() => {
    const list = facultyList.filter(f => getMemberCategory(f) === activeCategory)
    return list.length > 0 ? list : facultyList
  }, [facultyList, activeCategory])

  const employeeOptions = useMemo(() => {
    return filteredFacultyList.map(f => {
      const code = f.employeeId || f.facultyCode || (f.id ? `EMP${String(f.id).padStart(6, '0')}` : '')
      const name = f.fullName || f.name || 'Unknown'
      const dept = f.department || 'General'
      const desig = f.designation || 'Faculty'
      return {
        value: String(f.id || f.facultyId || code),
        label: `${code} - ${name} (${dept}) - ${desig}`
      }
    })
  }, [filteredFacultyList])

  const handleSelectFaculty = (facId) => {
    setSelectedFacultyId(facId)
    const found = facultyList.find(f => String(f.id || f.facultyId || f.employeeId || f.facultyCode) === String(facId)) || null
    setActiveFaculty(found)
    if (found) {
      const defaultBreakdown = calculateDefaultSalaryBreakdown(found.designation, found.employeeCategory || activeCategory)
      const existing = getSavedSalaryStructure(getLocalSalaryStructures(), found) || {}
      setBasic(existing.basicSalary ?? defaultBreakdown.basicSalary)
      setHra(existing.hra ?? defaultBreakdown.hra)
      setDa(existing.da ?? defaultBreakdown.da)
      setAllowances(existing.allowances ?? defaultBreakdown.allowances)
      setPf(existing.pf ?? defaultBreakdown.pf)
      setTax(existing.tax ?? defaultBreakdown.tax)
    }
  }

  const numBasic = Number(basic) || 0
  const numHra = Number(hra) || 0
  const numDa = Number(da) || 0
  const numAllowances = Number(allowances) || 0
  const numPf = Number(pf) || 0
  const numTax = Number(tax) || 0

  const gross = numBasic + numHra + numDa + numAllowances
  const deductions = numPf + numTax
  const net = Math.max(0, gross - deductions)

  const handleBasicChange = val => {
    setBasic(val === '' ? '' : Number(val))
  }

  const handleSubmit = e => {
    e.preventDefault()
    const targetEmployee = activeFaculty || item
    if (!targetEmployee || (!targetEmployee.id && !targetEmployee.fullName && !targetEmployee.name)) {
      alert('Please select an employee.')
      return
    }
    onSave(targetEmployee, {
      basicSalary: numBasic,
      hra: numHra,
      da: numDa,
      allowances: numAllowances,
      grossSalary: gross,
      pf: numPf,
      tax: numTax,
      deductions: deductions,
      netSalary: net
    })
  }

  const displayName = activeFaculty?.fullName || activeFaculty?.name || item?.fullName || 'New Employee'
  const displayEmpId = activeFaculty?.employeeId || (activeFaculty?.id ? `EMP${String(activeFaculty.id).padStart(6, '0')}` : '') || item?.employeeId || ''
  const displayDesignation = activeFaculty?.designation || item?.designation || (activeCategory === 'Non-Teaching' ? 'Staff' : 'Faculty')
  const displayDept = activeFaculty?.department || item?.department || 'General'
  const displayType = activeFaculty?.employeeCategory || activeFaculty?.type || item?.type || activeCategory

  return (
    <div className="fp-overlay">
      <div className="fp-dialog fp-salary-modal" style={{ maxWidth: '640px' }}>
        <button className="fp-close" type="button" aria-label="Close" onClick={onClose}><FiX /></button>
        <p>{isNew ? 'DEFINE EMPLOYEE SALARY STRUCTURE' : 'FACULTY SALARY CONFIGURATION'}</p>
        <h2>{displayName}</h2>
        {Boolean(displayEmpId || displayDesignation) && (
          <span>{displayEmpId} | {displayDesignation} | {displayDept} ({displayType})</span>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" style={{ marginTop: '16px' }}>
          {isNew && (
            <div style={{ marginBottom: '16px' }}>
              <div className="fp-field" style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Select {activeCategory === 'Non-Teaching' ? 'Non-Teaching Staff' : 'Teaching Faculty'} <b className="required-mark" style={{ color: '#ef4444' }}>*</b>
                </span>
                <SearchableSelect
                  label="Select Employee"
                  value={selectedFacultyId}
                  options={employeeOptions}
                  placeholder={`-- Choose ${activeCategory === 'Non-Teaching' ? 'Staff Member' : 'Teaching Faculty'} --`}
                  searchPlaceholder="Search by name, EMP ID, or department..."
                  onChange={val => handleSelectFaculty(val)}
                  required
                />
              </div>
            </div>
          )}

          <h3 style={{ margin: '14px 0 8px', fontSize: '12px', fontWeight: '800', color: 'var(--brand, #1769C2)', textTransform: 'uppercase' }}>Earnings / Allowances</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="fp-field">
              <span>Basic Salary (₹) <b className="required-mark">*</b></span>
              <input type="number" min="0" autoComplete="new-password" value={basic} onChange={e => handleBasicChange(e.target.value)} required />
            </label>
            <label className="fp-field">
              <span>HRA (House Rent) (₹)</span>
              <input type="number" min="0" autoComplete="new-password" value={hra} onChange={e => setHra(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label className="fp-field">
              <span>DA (Dearness Allowance) (₹)</span>
              <input type="number" min="0" autoComplete="new-password" value={da} onChange={e => setDa(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label className="fp-field">
              <span>Special / Other Allowances (₹)</span>
              <input type="number" min="0" autoComplete="new-password" value={allowances} onChange={e => setAllowances(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
          </div>

          <h3 style={{ margin: '18px 0 8px', fontSize: '12px', fontWeight: '800', color: 'var(--danger, #b42318)', textTransform: 'uppercase' }}>Statutory Deductions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="fp-field">
              <span>Provident Fund (PF) (₹)</span>
              <input type="number" min="0" autoComplete="new-password" value={pf} onChange={e => setPf(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label className="fp-field">
              <span>Professional Tax / TDS (₹)</span>
              <input type="number" min="0" autoComplete="new-password" value={tax} onChange={e => setTax(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
          </div>

          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: 'var(--surface-soft, #f8fafc)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
              <span>Gross Salary:</span>
              <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(gross)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>
              <span>Daily Pay Rate (Per Day):</span>
              <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(gross / 26))} / day <small style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Basis for Loss of Pay / LOP)</small></strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--danger, #b42318)' }}>
              <span>Standard Deductions (PF + Tax):</span>
              <strong>- {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(deductions)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '14px', fontWeight: '700', color: 'var(--brand, #1769C2)' }}>
              <span>Base Net Take-Home:</span>
              <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(net)}</span>
            </div>
          </div>

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="primary" type="submit" disabled={isNew && !selectedFacultyId}>
              {isNew ? 'Save Salary Structure' : 'Update Salary Structure'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function SalarySlipModal({ item, month, onClose }) {
  const handlePrint = () => {
    printSalarySlip(item, month)
  }

  const basic = Number(item.basicSalary) || 0
  const hra = Number(item.hra) || 0
  const da = Number(item.da) || 0
  const allowances = Number(item.allowances) || 0
  const pf = Number(item.pf) || 0
  const tax = Number(item.tax) || 0
  const working = Number(item.working) || 26
  const lop = Number(item.lop) || 0
  const gross = basic + hra + da + allowances
  const perDayRate = working > 0 ? Math.round(gross / working) : 0
  const lopAmount = (lop > 0 && working > 0) ? Math.round(perDayRate * lop) : 0
  const totalDeductions = pf + tax + lopAmount
  const netPay = Math.max(0, gross - totalDeductions)

  return (
    <div className="fp-overlay">
      <div className="fp-dialog fp-payslip-modal-container" style={{ maxWidth: '860px', width: 'min(860px, 96vw)', padding: '20px 24px' }}>
        <button className="fp-close" type="button" aria-label="Close" onClick={onClose}><FiX /></button>

        <div className="fp-payslip-document" data-print-scope style={{ background: '#ffffff', padding: '20px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', boxSizing: 'border-box' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #1769C2', paddingBottom: '12px', marginBottom: '14px' }}>
            <h1 style={{ margin: '0 0 3px', fontSize: '20px', fontWeight: '800', color: '#1769C2', letterSpacing: '0.04em' }}>PIRNAV ENGINEERING COLLEGE</h1>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#475569' }}>Approved by AICTE, Affiliated to JNTUH | Hyderabad, Telangana - 500075</p>
            <div style={{ display: 'inline-block', marginTop: '4px', padding: '3px 14px', background: '#EAF3FF', border: '1px solid #D8E4F2', borderRadius: '20px', fontSize: '11px', fontWeight: '800', color: '#125AA8', textTransform: 'uppercase' }}>
              SALARY SLIP - {monthLabel(month).toUpperCase()}
            </div>
          </div>

          {/* Employee & Pay Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 20px', background: '#f8fafc', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', boxSizing: 'border-box' }}>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Employee Name:</span> <strong style={{ color: '#0f172a' }}>{item.fullName}</strong></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Employee ID:</span> <strong style={{ color: '#0f172a' }}>{item.employeeId}</strong></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Designation:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.designation}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Department:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.department}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Faculty Category:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.type}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Pay Month / Year:</span> <span style={{ color: '#0f172a', fontWeight: '600' }}>{monthLabel(month)}</span></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>Working / Paid Days:</span> <strong style={{ color: '#0f172a' }}>{working} Days</strong> / <strong style={{ color: '#125AA8' }}>{item.present != null ? item.present + (item.paidLeave || 0) : working} Days</strong></div>
            <div><span style={{ color: '#64748b', fontWeight: '600' }}>LOP Days / Daily Rate:</span> <strong style={{ color: lop > 0 ? '#b91c1c' : '#64748b' }}>{lop} Day{lop === 1 ? '' : 's'}</strong> ({money(perDayRate)}/day)</div>
          </div>

          {/* Side-by-side Earnings and Deductions Table */}
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#1769C2', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', width: '32%' }}>EARNINGS</th>
                <th style={{ padding: '8px 10px', width: '18%', textAlign: 'right' }}>AMOUNT (₹)</th>
                <th style={{ padding: '8px 10px', width: '32%', borderLeft: '1px solid #14b8a6' }}>DEDUCTIONS</th>
                <th style={{ padding: '8px 10px', width: '18%', textAlign: 'right' }}>AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #EAF3FF' }}>
                <td style={{ padding: '7px 10px' }}>Basic Salary</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(basic)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>Provident Fund (PF)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', color: '#b91c1c' }}>{money(pf)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #EAF3FF' }}>
                <td style={{ padding: '7px 10px' }}>House Rent Allowance (HRA)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(hra)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>Professional Tax / TDS</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', color: '#b91c1c' }}>{money(tax)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #EAF3FF' }}>
                <td style={{ padding: '7px 10px' }}>Dearness Allowance (DA)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(da)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>Loss of Pay ({lop} Day{lop === 1 ? '' : 's'} @ {money(perDayRate)}/day)</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600', color: lopAmount > 0 ? '#b91c1c' : '#64748b' }}>{money(lopAmount)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '7px 10px' }}>Special / Other Allowances</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '600' }}>{money(allowances)}</td>
                <td style={{ padding: '7px 10px', borderLeft: '1px solid #e2e8f0' }}>-</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', color: '#64748b' }}>-</td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: '800', borderBottom: '2px solid #cbd5e1' }}>
                <td style={{ padding: '8px 10px', color: '#1769C2' }}>TOTAL GROSS EARNINGS</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#1769C2' }}>{money(gross)}</td>
                <td style={{ padding: '8px 10px', color: '#b91c1c', borderLeft: '1px solid #e2e8f0' }}>TOTAL DEDUCTIONS</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b91c1c' }}>- {money(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>

          {/* Net Pay Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EAF3FF', padding: '12px 16px', border: '1px solid #a7f3d0', borderRadius: '8px', marginBottom: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#554F75', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NET SALARY PAYABLE</span>
              <strong style={{ fontSize: '11px', color: '#125AA8' }}>Amount in Words: {numberToWordsIndian(netPay)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '22px', fontWeight: '900', color: '#125AA8' }}>{money(netPay)}</span>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '28px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
            <div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '5px', margin: '0 12px' }}>Employee Signature</div>
            </div>
            <div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '5px', margin: '0 12px' }}>Accounts / HR Officer</div>
            </div>
            <div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '5px', margin: '0 12px' }}>Principal / Director</div>
            </div>
          </div>
        </div>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" className="primary" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1769C2', color: '#fff' }}>
            <FiPrinter /> Print / Save as PDF
          </button>
        </footer>
      </div>
    </div>
  )
}

return { default: Payroll }
})()

export const FacultyDocuments = FacultyApiPanelsScreen.FacultyDocuments
export const FacultyStatus = FacultyApiPanelsScreen.FacultyStatus
export const ApiAssignmentDialog = FacultyApiPanelsScreen.ApiAssignmentDialog
export const FacultyLeaveManagement = FacultyLeaveManagementScreen.default
export const FacultyManagement = FacultyManagementScreen.default
export const teachingDesignations = FacultyManagementScreen.teachingDesignations
export const nonTeachingDesignations = FacultyManagementScreen.nonTeachingDesignations
export const getStoredDesignations = FacultyManagementScreen.getStoredDesignations
export const getDesignationOptions = FacultyManagementScreen.getDesignationOptions
export const formatTimeView = FacultyManagementScreen.formatTimeView
export const formatFacultyDisplayCode = FacultyManagementScreen.formatFacultyDisplayCode
export const Payroll = PayrollScreen.default
export default FacultyManagement
