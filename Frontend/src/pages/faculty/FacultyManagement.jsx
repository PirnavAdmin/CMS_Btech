import { calculateCompletion, completionSchemas } from '../../utils/recordCompletion'
import { CompletionIndicator, CompletionSummary, ResumeSetupAction } from '../../components/RecordCompletion'
import PayrollWorkspace from './PayrollWorkspace'
import { saveFacultyRecord } from '../../services/facultySaveWorkflow'
import { useAcademic as useWorkingAcademic } from '../../context/AcademicContext'
import ReferencePageHeader from '../../components/PageHeader'
import ReferenceViewDialog from '../../components/ViewDialog'
import { useScreenAccess } from '../../auth/ScreenAccess'
import * as pageDependency0 from '../../components/SearchableSelect'
import { facultyDateErrors, joiningDateMinimum } from '../../utils/facultyDates.js'
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
import * as pageDependency22 from '../../components/InfoCard'
import * as pageDependency24 from '../../utils/academicYearUtils'
import * as pageDependency25 from '../../services/subjectService'
import * as pageDependency26 from '../../utils/facultyAttendance'
import { exportToExcelXml } from '../../utils/exportUtils'
import './FacultyManagement.css'

// FacultyApiPanels screen and private helpers.
const FacultyApiPanelsScreen = (() => {
const { ProjectSelect } = pageDependency0
const { useCallback, useEffect, useRef, useState } = pageDependency1
const facultyService = pageDependency2.default
const { academicYearApi, branchApi, courseApi, sectionApi, facultyMasterApi } = pageDependency3
const { FiFileText, FiUploadCloud, FiTrash2, FiClock, FiActivity, FiBriefcase, FiCheck, FiPlus } = pageDependency4

function FacultyDocuments({ facultyId, canEdit = false }) {
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('Certificate')
  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await facultyService.getDocuments(facultyId)
      setDocuments(Array.isArray(data) ? data : [])
    } catch (reason) {
      setError(reason.message)
    } finally { setLoading(false) }
  }, [facultyId])

  useEffect(() => { load() }, [load])

  const upload = async event => {
    event.preventDefault()
    if (!canEdit || busy || !file) return
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
    if (!canEdit || busy) return
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
      {error && <p role="alert" className="fm-error">{error} <button type="button" onClick={load}>Retry documents</button></p>}{loading && <p role="status">Loading documents...</p>}
      <form hidden={!canEdit} className="fm-form-grid fm-doc-upload-grid" onSubmit={upload}>
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
                <div className="fm-doc-trailing">{(row.fileUrl || row.documentUrl) && <a href={pageDependency2.resolveFacultyPhoto(row.fileUrl || row.documentUrl)} target="_blank" rel="noreferrer">Preview</a>}
                  {pending === id ? (
                    <div className="fm-confirm" role="group">
                      <span>Remove document?</span>
                      <button type="button" className="fm-button danger" disabled={busy} onClick={() => remove(id)}>Delete</button>
                      <button type="button" className="fm-button secondary" onClick={() => setPending(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="fm-icon-button" hidden={!canEdit} title="Delete document" onClick={() => setPending(id)}>
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

function FacultyStatus({ faculty, onChanged, canEdit = false }) {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState(faculty.employmentStatus)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await facultyService.getStatusHistory(faculty.id)
      setHistory(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }, [faculty.id])

  useEffect(() => { load() }, [load])

  const save = async event => {
    event.preventDefault()
    if (!canEdit || busy) return
    setBusy(true)
    setError('')
    try {
      await facultyService.updateStatus(faculty.id, { status, reason })
      await onChanged(status)
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
      {error && <p className="fm-error" role="alert">{error} <button type="button" onClick={load}>Retry history</button></p>}{loading && <p role="status">Loading status history...</p>}
      <form hidden={!canEdit} className="fm-form-grid fm-status-form-grid" onSubmit={save}>
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
  const { canAction } = useScreenAccess()
  const canManage = canAction("/faculty", "edit")
  const { selectedAcademicYearId } = useWorkingAcademic()
  const lock = useRef(false), savedWrite = useRef(null), removed = useRef(new Set())
  const [attempt, setAttempt] = useState(0)
  const [masters, setMasters] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [uncertain, setUncertain] = useState(false)
  const blank = { academicYearId: selectedAcademicYearId || '', courseId: '', branchId: '', semesterId: '', sectionId: '', subjectId: '', assignmentType: 'Subject Faculty', weeklyHours: 0, isPrimaryFaculty: false, remarks: '' }
  const [form, setForm] = useState(blank)
  const [pending, setPending] = useState(null)

  useEffect(() => {
    let active = true
    setError(''); setMasters(null)
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
  }, [attempt, faculty.collegeId])

  const optionsFor = (collection) => (masters?.[collection] || []).filter(row => {
    if (row.collegeId != null && String(row.collegeId) !== String(faculty.collegeId)) return false
    if (collection === 'branches') return form.courseId && String(row.courseId) === String(form.courseId)
    if (collection === 'semesters') return form.branchId && String(row.branchId) === String(form.branchId) && (!row.courseId || String(row.courseId) === String(form.courseId)) && (!row.academicYearId || String(row.academicYearId) === String(form.academicYearId))
    if (collection === 'sections') return form.semesterId && String(row.semesterId) === String(form.semesterId) && (!row.branchId || String(row.branchId) === String(form.branchId))
    if (collection === 'subjects') return form.branchId && ['courseId','branchId','semesterId','academicYearId'].every(key => !row[key] || String(row[key]) === String(form[key]))
    return true
  })
  const changeParent = (key,value) => setForm(current => {
    const order = ['academicYearId','courseId','branchId','semesterId','sectionId','subjectId']
    const next = { ...current, [key]:value }
    order.slice(order.indexOf(key)+1).forEach(child => { next[child] = '' })
    return next
  })
  const save = async event => {
    event.preventDefault()
    if (!canManage || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (uncertain) throw new Error('Verify the saved allocation in the directory before another submission.')
      for (const [key, collection] of [['academicYearId','years'],['courseId','courses'],['branchId','branches'],['semesterId','semesters'],['sectionId','sections'],['subjectId','subjects']]) {
        if (form[key] && !optionsFor(collection).some(row => String(row[key] ?? row.id ?? (key === 'subjectId' ? row.subjectMasterId ?? row.courseSubjectId : '')) === String(form[key]))) throw new Error('Select a valid '+collection+' option for this academic scope.')
      }
      if (!form.academicYearId || !form.courseId || !form.branchId || !form.semesterId) throw new Error('Academic year, course, branch and semester are required.')
      if (['Subject Faculty','Lab Faculty'].includes(form.assignmentType) && !form.subjectId) throw new Error('Select a subject for this assignment type.')
      const duplicate = (faculty.assignments || []).some(row => String(row.id) !== String(editing) && ['academicYearId','courseId','branchId','semesterId','sectionId','subjectId','assignmentType'].every(key => String(row[key] ?? '') === String(form[key] ?? '')))
      if (!editing && !savedWrite.current && duplicate) throw new Error('This faculty allocation already exists. Edit the existing allocation.')
      const payload = { ...form, facultyId: faculty.id }
      const signature = JSON.stringify(payload)
      if (savedWrite.current?.signature !== signature) {
      if (editing) await facultyService.updateSubjectAllocation(editing, payload)
      else {
        const saved = await facultyService.createSubjectAllocation(payload)
        const id = saved?.id ?? saved?.allocationId ?? saved?.facultySubjectAllocationId
        if (!id) { setUncertain(true); throw new Error('Allocation was saved without an identity. Refresh allocations before submitting again.') }
        setEditing(id)
      }
        savedWrite.current = { signature }
      }
      await onChanged()
      savedWrite.current = null
      setEditing(null)
      setForm(blank)
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false; setBusy(false)
    }
  }

  const remove = async id => {
    if (!canManage || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (!removed.current.has(String(id))) { await facultyService.deleteSubjectAllocation(id); removed.current.add(String(id)) }
      await onChanged()
      setPending(null)
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false; setBusy(false)
    }
  }

  return (
<ReferenceViewDialog
      title={`${faculty.fullName} · Subject Allocations`}
      subtitle="Configure academic scope and weekly teaching load."
      icon={FiBriefcase}
      onClose={onClose}
      busy={busy}
      showExport={false}
      maxWidth="920px"
      className="fm-allocation-dialog shared-view-dialog--form"
    >
      <section className="fm-assignment-modal">
        {error && <p role="alert" className="fm-error">{error} {!masters && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry options</button>}</p>}
        {masters ? (
          <form hidden={!canManage} className="fm-allocation-form" onSubmit={save}>
            <div className="fm-form-grid fm-allocation-grid">
              {[
                ['academicYearId', 'Academic Year', 'years', 'academicYearId', 'academicYearName'],
                ['courseId', 'Course', 'courses', 'courseId', 'courseName'],
                ['branchId', 'Branch', 'branches', 'branchId', 'branchName'],
                ['semesterId', 'Semester', 'semesters', 'semesterId', 'semesterName'],
                ['sectionId', 'Section', 'sections', 'sectionId', 'sectionName'],
                ['subjectId', 'Subject', 'subjects', 'subjectId', 'subjectName'],
              ].map(([key, label, collection, idKey, nameKey]) => (
                <label key={key} className="fm-field fm-allocation-field">
                  <span>{label}</span>
                  <ProjectSelect
                    required={['academicYearId','courseId','branchId','semesterId'].includes(key)}
                    value={form[key]}
                    onChange={e => changeParent(key,e.target.value)}
                  >
                    <option value="">Select {label}</option>
                    {optionsFor(collection).map(row => {
                      const optionId = row[idKey] ?? row.id ?? (key === 'subjectId' ? row.subjectMasterId ?? row.courseSubjectId : undefined)
                      const optionLabel = key === 'subjectId'
                        ? [row.subjectCode ?? row.code ?? row.subject_code, row.subjectName ?? row.name ?? row.subject ?? row.title ?? row.subjectTitle ?? row.subject_name ?? row.courseName].filter(value => value !== undefined && value !== null && String(value).trim() !== '').join(' - ') || 'Unnamed subject'
                        : row[nameKey] ?? row.name ?? row.code ?? 'Unnamed option'
                      return optionId == null ? null : <option key={optionId} value={optionId}>{optionLabel}</option>
                    })}
                  </ProjectSelect>
                </label>
              ))}
              <label className="fm-field fm-allocation-field">
                <span>Assignment Type</span>
                <ProjectSelect value={form.assignmentType} onChange={e => setForm({ ...form, assignmentType: e.target.value })}>
                  {['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'].map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </ProjectSelect>
              </label>
              <label className="fm-field fm-allocation-field">
                <span>Periods Per Week</span>
                <input type="number" min="0" max="60" value={form.weeklyHours} onChange={e => setForm({ ...form, weeklyHours: e.target.value })} />
              </label>
              <label className="fm-field fm-wide fm-allocation-field">
                <span>Remarks</span>
                <input placeholder="Optional allocation notes" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </label>
            </div>
            <div className="fm-assignment-submit">
              <button type="submit" className="fm-button" disabled={busy}>
                <FiPlus /> {busy ? 'Saving...' : editing ? 'Update Assignment' : 'Add Allocation'}
              </button>
            </div>
          </form>
        ) : !error && (
          <p className="fm-muted">Loading academic options...</p>
        )}

        <div className="fm-current-assignments">
          <div className="fm-allocation-heading">
            <div>
              <h2>Allocated Responsibilities</h2>
              <p>Current subjects, sections and weekly teaching load.</p>
            </div>
            <span className="fm-allocation-count">{faculty?.assignments?.length || 0}</span>
          </div>
          {(faculty?.assignments || []).length ? (
            <div className="fm-assignment-list">
              {faculty.assignments.map(row => (
                <article key={row.id} className="fm-assignment-card">
                  <div>
                    <strong>{row.subjectName || row.assignmentType}</strong>
                    <p>{row.course || '—'} | {row.branch || faculty.department} | {row.semester} | {row.section}</p>
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
                        <button hidden={!canManage} type="button" className="fm-icon-button" title="Edit allocation" onClick={() => { savedWrite.current = null; setEditing(row.id); setForm({ ...blank, ...row }) }}>
                          <FiBriefcase />
                        </button>
                        <button hidden={!canManage} type="button" className="fm-icon-button" title="Remove allocation" onClick={() => setPending(row.id)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="fm-allocation-empty"><FiBriefcase /><span>No subject allocations found.</span></div>
          )}
        </div>
      </section>
    </ReferenceViewDialog>
  )
}

return { FacultyDocuments, FacultyStatus, ApiAssignmentDialog }
})()

// FacultyLeaveManagement screen and private helpers.
const FacultyLeaveManagementScreen = (() => {
const { ProjectSelect } = pageDependency0
const DirectoryEmptyState = pageDependency5.default
const { selectedCollegeId } = pageDependency6
const useCollegeState = pageDependency7.default
const { useCallback, useEffect, useMemo, useRef, useState } = pageDependency1
const { FiArrowLeft, FiCheck, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiFilter, FiPlus, FiPower, FiSearch, FiSlash, FiX } = pageDependency4
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
function FacultyLeaveManagement() {
  const { canAction } = useScreenAccess()
  const canManage = canAction("/faculty/leave-management", "edit") || canAction("/faculty/leave-management", "create")
  const [loadErrors, setLoadErrors] = useState({})
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
    const map = new Map()
    for (const r of [...pendingRequests, ...historyRequests]) {
      const item = r
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
    setLoading(true); setLoadErrors({})
    const optionalFetchOptions = { suppressApiFailureNotice: true }
    const resources = [
      ['Faculty', () => facultyService.list(undefined, optionalFetchOptions), setFaculty],
      ['Leave types', () => facultyLeaveApi.getTypes(undefined, optionalFetchOptions), rows => setLeaveTypes(newestFirst('leave-types', rows.map(normalizeLeaveType)))],
      ['Leave policies', () => facultyLeaveApi.getPolicies(undefined, optionalFetchOptions), rows => setPolicies(newestFirst('leave-policies', rows.map(normalizeLeavePolicy)))],
      ['Leave requests', () => facultyLeaveApi.getRequests(undefined, optionalFetchOptions), rows => setPendingRequests(rows.map(normalizeLeaveRequest))],
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
          saveRows([])
          const reference = error?.correlationId ? ` Reference: ${error.correlationId}.` : ''
          setLoadErrors(current => ({ ...current, [name]: `Unable to load ${name.toLowerCase()}: ${message}${reference}` }))
        }
      }
    }))
    if (version === reloadVersion.current) {
      setLoading(false)
    }
  }, [setFaculty, setPendingRequests, setHistoryRequests, setBalances])
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
    if (!canManage || mutationLock.current) return
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
  const getBalance = useCallback((employee, policy) => employeeLeaveBalances(balances, employee, policy), [balances])

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
      id: policy.id,
      collegeId: selectedCollegeId(),
      name: policy.name.trim(),
      academicYear: policy.academicYear,
      applicableTo: policy.applicableTo,
      from: policy.from || selectedYear?.from || '',
      to: policy.to || selectedYear?.to || '',
      status: policy.status || 'Active',
      entitlements: policy.entitlements || []
    }
    return mutate(async () => {
      const saved = policy.id
        ? await facultyLeaveApi.updatePolicy(policy.id, leavePolicyPayload(updatedPolicy))
        : await facultyLeaveApi.createPolicy(leavePolicyPayload(updatedPolicy))
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
  const decideRequest = (request, status, reason = '') => mutate(async () => {
    if (!['Approved','Rejected'].includes(status) || request.status !== 'Pending') throw new Error('Only pending leave requests can be approved or rejected.')
    if (status === 'Rejected' && !reason.trim()) throw new Error('Enter a rejection reason.')
    const saved = status === 'Approved' ? await facultyLeaveApi.approve(request.id) : await facultyLeaveApi.reject(request.id, reason.trim())
    eventBus.emit(ERP_EVENTS.LEAVE_UPDATED, { request, status })
    return saved
  }, 'Leave request ' + status.toLowerCase() + '.')
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
      setDialog({ kind: 'view', item: { ...item, entitlements: item.entitlements || [] } })
      return
    }
    if (item?.payCategory || item?.category) {
      setDialog({ kind: 'view', item: { ...item,  } })
      return
    }
    setDialog({ kind: 'view', item })
  }
  const tabDependencies = {
    'Leave Requests': ['Leave requests'], 'Leave History': ['Leave history'],
    'Leave Balances': ['Faculty', 'Leave policies', 'Leave balances'],
    'Leave Types': ['Leave types'], 'Leave Policies': ['Leave policies'],
  }
  const tabErrors = tabDependencies[tab].map(resource => loadErrors[resource]).filter(Boolean)
  return <DashboardLayout><main className="flm-page">{!canManage && <p>Read-only access. Configuration and leave decisions require permission.</p>}{loading && <p role="status">Loading leave records...</p>}<header className="flm-header"><div><h1>Faculty Leave Management</h1><span>Configure leave policies, manage employee balances and process faculty and staff leave requests.</span></div><div className="flm-summary">{summary.map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header><section className="flm-card"><header className="flm-card-header"><div><p>{title}</p><h2>{description}</h2></div><div className="flm-header-actions">{['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab) && <div className="flm-category-toggle" role="group" aria-label="Filter by Faculty Type"><button type="button" className={`flm-cat-btn ${filters.type === 'Teaching' ? 'active' : ''}`} onClick={() => changeFilter('type', 'Teaching')}>Teaching Faculty</button><button type="button" className={`flm-cat-btn ${filters.type === 'Non-Teaching' ? 'active' : ''}`} onClick={() => changeFilter('type', 'Non-Teaching')}>Non-Teaching Staff</button></div>}<button type="button" className="flm-filter-toggle" aria-expanded={showFilters} aria-controls="faculty-leave-filters" onClick={() => setShowFilters(value => !value)}><FiFilter /> Filters {showFilters ? <FiChevronUp /> : <FiChevronDown />}</button><ExportMenu rows={tabErrors.length ? [] : filtered} columns={exportColumns} screen="faculty-leave-local" filename={`faculty-leave-${tab.toLowerCase().replace(/\s+/g, '-')}`} title={tab} scope="All filtered results" />{canManage && tab === 'Leave Types' && <button className="flm-primary" onClick={() => setDialog({ kind: 'type' })}><FiPlus /> Add Leave Type</button>}{canManage && tab === 'Leave Policies' && <button className="flm-primary" onClick={() => setDialog({ kind: 'policy' })}><FiPlus /> Create Leave Policy</button>}</div></header><nav className="flm-tabs" aria-label="Leave management sections">{TABS.map(value => <button key={value} className={tab === value ? 'active' : ''} aria-current={tab === value ? 'page' : undefined} onClick={() => switchTab(value)}>{value}</button>)}</nav><div className="flm-toolbar"><label className="flm-search"><FiSearch /><input aria-label="Search leave records" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder={tab === 'Leave Types' ? 'Search leave type or code...' : tab === 'Leave Policies' ? 'Search leave policy...' : tab === 'Leave Balances' ? 'Search employee...' : 'Search request, employee or leave type...'} /></label></div>{showFilters && <div id="faculty-leave-filters" className="flm-filter-panel">{['Leave Requests', 'Leave History', 'Leave Balances'].includes(tab) && <><FilterSelect label="Faculty Type" value={filters.type} values={['Teaching', 'Non-Teaching']} onChange={value => changeFilter('type', value)} /><FilterSelect label="Department" value={filters.department} values={departments} onChange={value => changeFilter('department', value)} /></>}{['Leave History', 'Leave Types', 'Leave Policies'].includes(tab) && <FilterSelect label="Status" value={filters.status} values={tab === 'Leave Types' ? ['Active', 'Inactive'] : tab === 'Leave Policies' ? ['Draft', 'Active', 'Inactive', 'Expired'] : ['Approved', 'Rejected', 'Cancelled']} onChange={value => changeFilter('status', value)} />}<button className="flm-clear" onClick={() => { setQuery(''); setFilters({ type: 'Teaching', department: '', status: '' }); setPage(1) }}>Clear Filters</button></div>}{tabErrors.length > 0 ? <div className="flm-empty" role="alert"><p>{tabErrors.join(" ")}</p><button type="button" className="erp-btn erp-btn--secondary" onClick={reload}>Retry leave records</button></div> : !loading && <><p className="flm-count">Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records</p><LeaveList canManage={canManage} onCreate={() => setDialog({ kind: tab === 'Leave Types' ? 'type' : 'policy' })} tab={tab} rows={visible} leaveTypes={leaveTypes} getBalance={getBalance} onView={viewRecord} onEdit={item => {
    if (tab === 'Leave Policies') {
      setDialog({ kind: 'policy', item: { ...item, entitlements: item.entitlements || [] } })
    } else {
      setDialog({ kind: 'type', item: { ...item,  } })
    }
  }} onActivate={(item, status = 'Active') => setDialog({ kind: 'activate', item, status })} onDecision={(item, status) => setDialog({ kind: 'decision', item, status })} onToggleType={item => setDialog({ kind: 'toggleType', item })} />{filtered.length > PAGE_SIZE && <TablePagination currentPage={currentPage} totalPages={pages} onPageChange={setPage} />}</>}</section>{dialog && <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><LeaveDialog dialog={dialog} faculty={faculty} leaveTypes={leaveTypes} policies={policies} requests={requests} academicYears={academicYears} getBalance={getBalance} onClose={() => setDialog(null)} onSaveType={saveType} onToggleType={toggleType} onSavePolicy={savePolicy} onActivate={setPolicyStatus} onDecision={decideRequest} onSaveRequest={saveRequest} /></fieldset>}{notice && <div className="flm-toast">{notice}<button onClick={() => setNotice('')}><FiX /></button></div>}</main></DashboardLayout>
}

function LeaveList({ canManage, onCreate, tab, rows, leaveTypes, getBalance, onView, onEdit, onActivate, onDecision, onToggleType }) {
  const Action = ({title,children,onClick}) => <button type="button" title={title} aria-label={title} disabled={!canManage && !title.startsWith('View')} onClick={onClick}>{children}</button>
  if (!rows.length && ['Leave Types', 'Leave Policies'].includes(tab)) return <DirectoryEmptyState title={tab === 'Leave Types' ? 'No leave types found.' : 'No leave policies found.'} actionLabel={tab === 'Leave Types' ? 'Add Leave Type' : 'Create Leave Policy'} onAction={canManage ? onCreate : undefined} />
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
    return <tr key={employee.id}><td>{employee.employeeId || employee.id}</td><td><Employee employee={employee} /></td><td>{typeOf(employee)}</td><td>{employee.department || '-'}</td><td>{policy ? policy.name : <span className="flm-unassigned">Not Assigned</span>}</td>{['entitled', 'used', 'pending', 'available'].map(key => <td key={key}>{totals[key] ?? 'Not provided'}</td>)}<td><Actions><Action title="View leave balance" onClick={() => onView({ employee, policy })}><FiEye /></Action></Actions></td></tr>
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

function TypeDialog({ item = {}, onClose, onSave }) {
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
    <SharedViewDialog title={item.id ? 'Edit Leave Type' : 'Add Leave Type'}
      subtitle="Configure the leave code, pay category, and status."
      onClose={onClose} showExport={false} maxWidth="620px" className="flm-editor-dialog"
      footerContent={<>
        <button type="button" className="erp-btn erp-btn--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="leave-type-editor" className="erp-btn erp-btn--primary">Save Leave Type</button>
      </>}
    >
        <form id="leave-type-editor" className="flm-config-form" onSubmit={event => { event.preventDefault(); save() }}>
          <Input label="Leave Type Name *" value={data.name} onChange={value => setData({ ...data, name: value })} />
          <Input label="Leave Code *" value={data.code} onChange={value => setData({ ...data, code: value })} />
          <Select label="Pay Category *" value={data.payCategory} values={['Paid Leave', 'Unpaid Leave']} placeholder="Select pay category" onChange={value => setData({ ...data, payCategory: value })} />
          <Select label="Status *" value={data.status} values={['Active', 'Inactive']} placeholder="Select status" onChange={value => setData({ ...data, status: value })} />
          <label>Description<textarea value={data.description} onChange={event => setData({ ...data, description: event.target.value })} /></label>
          {error && <div className="flm-error" role="alert">{error}</div>}
        </form>
    </SharedViewDialog>
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
    <SharedViewDialog title={item.id ? 'Edit Leave Policy' : 'Create Leave Policy'} onClose={onClose}
      showExport={false} maxWidth="760px" className="flm-editor-dialog"
      footerContent={<>
        <button type="button" className="erp-btn erp-btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="erp-btn erp-btn--primary"
          disabled={!data.name.trim() || !data.academicYear || !data.applicableTo || !data.entitlements.length}
          onClick={() => onSave({ ...item, ...data })}>
          {item.id ? 'Save Changes' : 'Create Policy'}
        </button>
      </>}
    >
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
      <div className="flm-table-wrap flm-entitlements-table">
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
    </SharedViewDialog>
  )
}
function RequestLeaveDialog({ faculty, leaveTypes, policies, onClose }) {
  const [data, setData] = useState({
    facultyId: '',
    leaveTypeId: '',
    policyId: '',
    reason: ''
  })
  const selectedFaculty = faculty.find(f => String(f.id) === String(data.facultyId))
  const availableLeaveTypes = useMemo(() => selectedFaculty ? eligibleLeaveTypes(leaveTypes, selectedFaculty) : [], [leaveTypes, selectedFaculty])

  useEffect(() => {
    if (!data.leaveTypeId) return
    if (availableLeaveTypes.some(type => String(type.id) === String(data.leaveTypeId))) return
    setData(current => ({ ...current, leaveTypeId: '' }))
  }, [data.facultyId, data.leaveTypeId, availableLeaveTypes])

  const handleFacultyChange = (id) => {
    const selected = faculty.find(f => String(f.id) === String(id))
    const applicablePolicy = selected ? policies.find(p => p.status === 'Active' && (p.applicableTo === 'Both' || p.applicableTo === (selected.employeeCategory === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'))) : null
    setData(prev => ({
      ...prev,
      facultyId: id,
      policyId: applicablePolicy?.id || prev.policyId || policies[0]?.id || ''
    }))
  }

  return (
    <Modal title="Apply for Leave" onClose={onClose}>
      <Form>
        <p role="status" className="flm-error">Leave requests cannot be submitted because the date fields have been removed. Contact HR or an administrator to arrange leave.</p>
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
        <label>
          <span>Reason <b className="required-mark">*</b></span>
          <textarea value={data.reason} onChange={e => setData({ ...data, reason: e.target.value })} placeholder="Reason for leave request..." />
        </label>
        <></>
      </Form>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button className="approve-action" disabled>Submit Request</button>
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
            const totals = balance.details.find(row => String(row.typeId) === String(rule.typeId))
            const typeInfo = leaveTypes.find(type => String(type.id) === String(rule.typeId))
            const typeName = typeInfo?.name || rule.leaveTypeName || rule.name || rule.typeId
            // Missing backend balances remain unavailable.
            const entitled = totals?.entitled ?? 'Not provided'
            const used = totals?.used ?? 'Not provided'
            const pending = totals?.pending ?? 'Not provided'
            const available = totals?.available ?? 'Not provided'
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
  return <SharedViewDialog title={title} onClose={onClose} showExport={false}><div className="flm-view-body">{children}</div></SharedViewDialog>
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
  return <SharedViewDialog title={title} onClose={onClose} showExport={false} hideFooter>{children}</SharedViewDialog>
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
const { FiAlertCircle, FiArrowLeft, FiBriefcase, FiCheckCircle, FiChevronDown, FiChevronUp, FiEdit2, FiFilter, FiPlus, FiSearch, FiUser, FiUsers, FiClock, FiBookOpen, FiMapPin, FiX, FiTrash2, FiFileText, FiCalendar, FiBarChart2, FiTrendingUp } = pageDependency4
const DashboardLayout = pageDependency8.default
const ExportMenu = pageDependency9.default
const FilterPanel = pageDependency19.default
const StatusBadge = pageDependency20.default
const TablePagination = pageDependency11.default
const SearchableSelect = pageDependency0.default
const InfoCard = pageDependency22.default
const { departmentApi, facultyMasterApi } = pageDependency3
const { attendancePayload } = pageDependency12
const { getDefaultAcademicYear } = pageDependency24
const { normalizeFaculty, mergeFacultyData, resolveFacultyPhoto } = pageDependency2
const facultyService = pageDependency2.default

const { localAttendanceDate, attendanceStatusLabel, normalizeAttendanceRow, combineAttendance } = pageDependency26
const { showSuccess, showError } = pageDependency15

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
const today = () => localAttendanceDate(new Date())
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
const mondayOf = value => {
  const date = new Date(String(value || today()) + 'T00:00:00')
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
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

const optionalTeachingCreateFields = new Set(['gender', 'dob', 'designation', 'employmentType', 'joiningDate'])

function validateFaculty(data, rows, basicTeaching = false) {
  const errors = {}
  sections.forEach(section => section.fields.forEach(([key, label, type, required]) => {
    if (required && !(basicTeaching && optionalTeachingCreateFields.has(key)) && !String(data[key] ?? '').trim()) errors[key] = label + ' is required.'
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
  Object.assign(errors, facultyDateErrors(data, today()))
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
function EmptyState({ title, description, action, onAction, className = '' }) {
  return <div className={`fm-empty ${className}`.trim()}><FiUsers aria-hidden="true" /><h3>{title}</h3>{description && <p>{description}</p>}{action && <button type="button" className="fm-button secondary" onClick={onAction}>{action}</button>}</div>
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
  }, [hourText,minuteText,hour])
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
function AttendanceEditor({ busy = false, record, collegeOptions = [], departmentOptions = [], allFaculty = [], onClose, onSave, onReset }) {
  const initialStatus = record.status === 'Not Marked' ? 'Present' : record.status
  const isInitialWorking = ['Present', 'Late', 'Half Day'].includes(initialStatus)
  const defaultInitialCheckIn = ''
  const defaultInitialCheckOut = ''
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
    if (busy) return
    if (['On Leave', 'LOP'].includes(data.status) && !confirmLop) return setConfirmLop(true)
    const isWorking = ['Present', 'Late', 'Half Day'].includes(data.status)
    const defCheckIn = ''
    const defCheckOut = ''
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
  return <ReferenceViewDialog title={record.status === 'Not Marked' ? 'Mark Faculty Attendance' : 'Edit Faculty Attendance'} subtitle={record.faculty.fullName+' · '+displayCode+' · '+departmentName} onClose={onClose} busy={busy} showExport={false} hideFooter><form className="fm-attendance-editor" onSubmit={save}><fieldset disabled={busy} style={{border:0,padding:0,margin:0}}><div className="fm-form-grid"><label>Status<ProjectSelect value={data.status} onChange={event => {
    const status = event.target.value
    const isWorking = ['Present', 'Late', 'Half Day'].includes(status)
    const defIn = ''
    const defOut = ''
    setData({
      ...data,
      status,
      checkIn: isWorking ? (data.checkIn || defIn) : '',
      checkOut: isWorking ? (data.checkOut || defOut) : '',
    })
    setError('')
    setConfirmLop(false)
  }}>{['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map(value => <option key={value}>{value}</option>)}<option value="LOP">Loss of Pay</option></ProjectSelect></label><AttendanceTimeField label="Check In" value={data.checkIn} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkIn: value }); setError('') }} /><AttendanceTimeField label="Check Out" value={data.checkOut} disabled={isNonWorkingStatus} onChange={value => { setData({ ...data, checkOut: value }); setError('') }} /><label className="fm-wide">Remarks<textarea rows="2" value={data.remarks} onChange={event => setData({ ...data, remarks: event.target.value })} /></label></div>{error && <p className="fm-error" role="alert">{error}</p>}{confirmLop && <div className="fm-lop-confirm" role="alert"><div><strong>Confirm attendance status?</strong><p>You are marking {record.faculty.fullName} ({displayCode}) as {attendanceStatusLabel(data.status)} for {new Date(record.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmLop(false)}>Cancel</button><button className="fm-button" type="button" onClick={() => { setConfirmLop(false); onSave({ ...record, ...data, status: data.status, checkIn: isNonWorkingStatus ? '' : data.checkIn, checkOut: isNonWorkingStatus ? '' : data.checkOut, remarks: data.remarks || '', facultyId: record.faculty.id, date: record.date }) }}>{data.status === 'LOP' ? 'Mark Loss of Pay' : 'Mark On Leave'}</button></div></div>}{confirmReset && <div className="fm-reset-confirm" role="alert"><div><strong>Reset this attendance record?</strong><p>The current status, time, and remarks will be cleared.</p></div><div><button className="fm-button secondary" type="button" onClick={() => setConfirmReset(false)}>Keep Editing</button><button className="fm-button danger" type="button" onClick={() => onReset(record)}>Reset Record</button></div></div>}<footer>{record.status !== 'Not Marked' && !confirmReset && <button className="fm-button danger" type="button" onClick={() => setConfirmReset(true)}>Reset to Not Marked</button>}<button className="fm-button secondary" type="button" onClick={onClose}>Cancel</button><button className="fm-button" type="submit">Save Attendance</button></footer></fieldset></form></ReferenceViewDialog>
}
function FacultyAttendanceScreen({ faculty, departmentOptions = [], directoryUnavailable = false }) {
  const { selectedCollegeId } = useWorkingAcademic()
  const [view, setView] = useState('daily')
  const [date, setDate] = useState(today)
  const [weekStart, setWeekStart] = useState(() => mondayOf(today()))
  const [month, setMonth] = useState(() => today().slice(0, 7))
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ department: '', status: '', checkIn: '' })
  const [draftFilters, setDraftFilters] = useState(null)
  const [detail, setDetail] = useState(null)
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [leaveResult, setLeaveResult] = useState(null)
  const period = (view === 'daily' && !date) || (view === 'monthly' && !month) ? { from: '', to: '' }
    : attendancePeriod(view, { date, weekStart, year: month.slice(0, 4), month: month.slice(5) })
  useEffect(() => {
    if (!selectedCollegeId) return undefined
    let active = true
    pageDependency3.facultyLeaveApi.getHistory({ status: 'Approved' })
      .then(rows => {
        if (!active) return
        const leave = rows.map(pageDependency12.normalizeLeaveRequest).filter(row => {
          const span = (Date.parse(row.to) - Date.parse(row.from)) / 86400000 + 1
          return row.status === 'Approved' && span > 0 && row.days === span
        })
        setLeaveResult({ collegeId: selectedCollegeId, rows: leave })
      })
      .catch(() => { if (active) setLeaveResult({ collegeId: selectedCollegeId, error: true }) })
    return () => { active = false }
  }, [selectedCollegeId, attempt])
  const currentLeave = leaveResult?.collegeId === selectedCollegeId ? leaveResult : null
  const requestKey = [selectedCollegeId, view, period.from, period.to, attempt].join('|')
  const currentResult = result?.key === requestKey ? result : null
  const loading = Boolean(selectedCollegeId && period.from && !currentResult)
  const error = currentResult?.error
  const report = view !== 'daily'
  useEffect(() => {
    if (!selectedCollegeId || !period.from) return undefined
    let active = true
    const load = async () => {
      const normalizeMark = (row, options) => {
        const record = normalizeAttendanceRow(row, options)
        return String(row.status ?? row.attendanceStatus ?? '').toLowerCase() === 'holiday'
          ? { ...record, status: 'Holiday' }
          : record
      }
      try {
        let rows
        if (view === 'daily') {
          const [records, daily] = await Promise.all([
            facultyService.getAttendance({ fromDate: period.from, toDate: period.to }),
            facultyService.getDailyAttendance({ date: period.from }),
          ])
          rows = combineAttendance(
            records.map(row => normalizeMark(row)),
            daily.map(row => normalizeMark(row, { daily: true, date: period.from })),
          )
        } else {
          const reports = view === 'weekly'
            ? await facultyService.getWeeklyAttendance({ weekStart: period.from })
            : await facultyService.getMonthlyAttendance({ year: Number(period.from.slice(0, 4)), month: Number(period.from.slice(5, 7)) })
          rows = reports.flatMap(employee => (employee.days || []).map(day => normalizeMark({ ...day, facultyId: employee.facultyId })))
        }
        if (active) setResult({ key: requestKey, rows })
      } catch (reason) {
        if (active) setResult({ key: requestKey, error: reason.message || 'Unable to load attendance.' })
      }
    }
    load()
    return () => { active = false }
  }, [selectedCollegeId, view, period.from, period.to, requestKey])

  const staff = faculty.filter(member => !category || employeeCategoryOf(member) === category)
  const departmentOf = member => departmentOptions.find(option => String(option.value) === String(member.departmentId))?.label
    || member.departmentName || member.department || '—'
  const employeeCode = member => member.employeeId || member.facultyCode || '—'
  const departments = [...new Set(staff.map(departmentOf).filter(name => name !== '—'))].sort()
  const dates = []
  if (report) for (const day = new Date(period.from + 'T00:00:00'); localAttendanceDate(day) <= period.to; day.setDate(day.getDate() + 1)) {
    dates.push(localAttendanceDate(day))
  }
  const records = new Map((currentResult?.rows || []).map(row => [row.facultyId + '|' + row.date, row]))
  const recordFor = (member, day) => {
    const id = String(member.facultyId ?? member.id)
    const record = records.get(id + '|' + day) || records.get(String(member.id) + '|' + day)
    if (record && (record.status !== 'Not Marked' || record.checkIn)) return record
    const leave = currentLeave?.rows?.find(row => row.facultyId === id && row.from <= day && row.to >= day)
    return leave ? { date: day, status: 'On Leave' } : record || { date: day, status: 'Not Marked' }
  }
  const staffRows = staff.map(member => ({
    member,
    cells: (report ? dates : [date]).map(day => recordFor(member, day)),
  }))
  const hours = row => {
    const toMinutes = value => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
      const [hour, minute] = value.split(':').map(Number)
      return hour * 60 + minute
    }
    const start = toMinutes(row.checkIn), end = toMinutes(row.checkOut)
    if (start == null) return '—'
    if (!row.checkOut) return 'Not checked out'
    if (end == null) return '—'
    const reported = Number(row.workingMinutes)
    const minutes = Number.isFinite(reported) && reported > 0 ? reported : end - start
    if (minutes < 0) return '—'
    return Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm'
  }
  const totals = cells => {
    const counts = summarizeAttendance(cells.filter(row => row.status !== 'Holiday'))
    const recorded = counts.total - counts['Not Marked']
    return { counts, recorded, percentage: recorded ? counts.percentage : '—' }
  }
  const query = search.trim().toLowerCase()
  const filtered = staffRows.filter(({ member, cells }) =>
    (!query || [employeeCode(member), member.fullName, departmentOf(member)].join(' ').toLowerCase().includes(query))
    && (!filters.department || departmentOf(member) === filters.department)
    && (!filters.status || cells.some(row => row.status === filters.status))
    && (report || !filters.checkIn || Boolean(cells[0].checkIn) === (filters.checkIn === 'checked'))
  )
  const statusCodes = { Present: 'P', Absent: 'A', Late: 'L', 'On Leave': 'OL', 'Half Day': 'HD', Holiday: 'H', LOP: 'LOP', 'Not Marked': '—' }
  const status = row => attendanceStatusLabel(row.status)
  const showStatus = (row, abbreviated = false) => <span className="fm-monitor-status" data-status={row.status} title={status(row)} aria-label={status(row)}>
    {abbreviated ? statusCodes[row.status] : status(row)}
  </span>
  const counts = summarizeAttendance(staffRows.map(row => row.cells[0]).filter(Boolean))
  const summaryAvailable = Boolean(currentResult?.rows && !directoryUnavailable)
  const summary = [
    { label: 'Total Staff', value: directoryUnavailable ? '—' : staff.length },
    ...(!report ? ['Present', 'Absent', 'Late', 'On Leave'].map(name => ({
      label: name + (date === today() ? ' Today' : ' · ' + date.slice(5)),
      value: summaryAvailable && (name !== 'On Leave' || currentLeave?.rows) ? counts[name] : '—',
    })) : []),
  ]
  const identityColumns = [
    { label: 'Employee ID', value: ({ member }) => employeeCode(member) },
    { label: 'Faculty / Staff Name', value: ({ member }) => member.fullName },
    { label: 'Department', value: ({ member }) => departmentOf(member) },
    { label: 'Category', value: ({ member }) => employeeCategoryOf(member) },
  ]
  const dailyColumns = [
    { label: 'Check-In', value: ({ cells }) => formatTimeView(cells[0].checkIn) },
    { label: 'Check-Out', value: ({ cells }) => cells[0].checkIn && !cells[0].checkOut ? 'Not checked out' : formatTimeView(cells[0].checkOut) },
    { label: 'Working Hours', value: ({ cells }) => hours(cells[0]) },
    { label: 'Attendance Status', value: ({ cells }) => status(cells[0]) },
  ]
  const periodColumns = [
    ...dates.map((day, index) => ({ label: day, value: ({ cells }) => status(cells[index]) })),
    { label: 'Working Days', value: () => '—' },
    { label: 'Present', value: ({ cells }) => totals(cells).counts.Present },
    { label: 'Absent', value: ({ cells }) => totals(cells).counts.Absent },
    { label: 'Leave', value: ({ cells }) => totals(cells).counts['On Leave'] },
    { label: 'LOP', value: ({ cells }) => totals(cells).counts.LOP },
    { label: 'Attendance %', value: ({ cells }) => totals(cells).percentage },
  ]
  const columns = [...identityColumns, ...(report ? periodColumns : dailyColumns)]
  const count = Object.values(filters).filter(Boolean).length
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const selectPeriod = setter => event => { setter(event.target.value); setPage(1); setDetail(null) }
  const visibleDetail = detail?.key === requestKey ? detail.row : null
  return <section className="fm-attendance-monitor">
    <ReferencePageHeader title="Faculty Attendance" subtitle="Review employee check-ins, check-outs and recorded attendance." compactSummary={summary} />
    <nav className="fm-monitor-tabs" aria-label="Attendance views">
      {Object.entries({ daily: 'Daily Attendance', weekly: 'Weekly Report', monthly: 'Monthly Report' }).map(([key, label]) =>
        <button key={key} type="button" className="fm-button secondary" aria-pressed={view === key} onClick={() => {
          setView(key); setPage(1); setDetail(null); setDraftFilters(null); setFilters(current => ({ ...current, checkIn: '' }))
        }}>{label}</button>)}
    </nav>
    <section className="fm-monitor-card" aria-label="Employee attendance">
      <div className="fm-monitor-toolbar">
        <label><span className="sr-only">Search Employee</span><input type="search" placeholder="Search Employee" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
        <label><span className="sr-only">Staff Category</span><select value={category} onChange={event => {
          setCategory(event.target.value); setFilters(current => ({ ...current, department: '' })); setDraftFilters(null); setPage(1)
        }}><option value="">All Staff</option><option>Teaching</option><option>Non-Teaching</option></select></label>
        {view === 'daily' && <label><span className="sr-only">Attendance date</span><input type="date" value={date} max={today()} onChange={selectPeriod(setDate)} /></label>}
        {view === 'weekly' && <label><span className="sr-only">Week starting</span><input type="date" value={weekStart} max={today()} onChange={event => {
          if (event.target.value) { setWeekStart(mondayOf(event.target.value)); setPage(1); setDetail(null) }
        }} /></label>}
        {view === 'monthly' && <label><span className="sr-only">Attendance month</span><input type="month" value={month} max={today().slice(0, 7)} onChange={selectPeriod(setMonth)} /></label>}
        <div className="fm-monitor-actions">
          <button type="button" className="fm-button secondary" aria-expanded={Boolean(draftFilters)} aria-controls="fm-monitor-filters" onClick={() => setDraftFilters(draftFilters ? null : filters)}>
            <FiFilter aria-hidden="true" /> Filters{count ? ' (' + count + ')' : ''}
          </button>
          <ExportMenu rows={summaryAvailable ? filtered : []} columns={columns} title={view === 'daily' ? 'Attendance' : view === 'weekly' ? 'Weekly Report' : 'Monthly Report'}
            filename={'faculty-attendance-' + period.from} scope={period.from + (report ? ' to ' + period.to : '')} onDownload={exportToExcelXml} reportType="Excel"
            loading={loading} unavailable={error || (directoryUnavailable ? 'Employee directory unavailable.' : '')} />
        </div>
      </div>
      {draftFilters && <form id="fm-monitor-filters" className="fm-monitor-filters" onSubmit={event => {
        event.preventDefault(); setFilters(draftFilters); setDraftFilters(null); setPage(1)
      }}>
        <label>Department<select value={draftFilters.department} onChange={event => setDraftFilters({ ...draftFilters, department: event.target.value })}>
          <option value="">All departments</option>{departments.map(name => <option key={name}>{name}</option>)}
        </select></label>
        <label>Attendance Status<select value={draftFilters.status} onChange={event => setDraftFilters({ ...draftFilters, status: event.target.value })}>
          <option value="">All statuses</option>{Object.keys(statusCodes).map(name => <option key={name} value={name}>{attendanceStatusLabel(name)}</option>)}
        </select></label>
        {!report && <label>Check-in Status<select value={draftFilters.checkIn} onChange={event => setDraftFilters({ ...draftFilters, checkIn: event.target.value })}>
          <option value="">Any check-in status</option><option value="checked">Checked in</option><option value="missing">No check-in</option>
        </select></label>}
        <button className="fm-button secondary" type="button" onClick={() => setDraftFilters({ department: '', status: '', checkIn: '' })}>Reset</button>
        <button className="fm-button" type="submit">Apply</button>
      </form>}
      {error ? <p className="fm-monitor-message" role="alert">{error} <button type="button" className="fm-button secondary" onClick={() => setAttempt(value => value + 1)}>Retry attendance</button></p>
        : loading ? <p className="fm-monitor-message" role="status">Loading faculty attendance…</p>
        : directoryUnavailable ? <p className="fm-monitor-message">Employee directory unavailable.</p>
        : !selectedCollegeId || !period.from ? <p className="fm-monitor-message">Select a college and reporting period.</p>
        : <>
          {currentLeave?.error && <p className="fm-monitor-message" role="status">Approved leave history is unavailable. Recorded attendance statuses are shown.</p>}
          {report && <div className="fm-monitor-legend" aria-label="Attendance status legend">
            {Object.keys(statusCodes).map(name => <span key={name}>{showStatus({ status: name }, true)} {attendanceStatusLabel(name)}</span>)}
            <small>Working days are unavailable in the attendance report.</small>
          </div>}
          <div className={report ? 'fm-monitor-period-grid' : 'fm-monitor-scroll'}>
            {(report ? [
              { label: 'Employees', fields: identityColumns, offset: 0, actions: false },
              { label: 'Attendance dates and totals', fields: periodColumns, offset: identityColumns.length, actions: true },
            ] : [{ label: 'Attendance table', fields: columns, offset: 0, actions: true }]).map(group => (
              <div key={group.label} className={group.offset ? 'fm-monitor-period-scroll' : undefined}
                role={group.offset ? 'region' : undefined} aria-label={group.offset ? group.label : undefined} tabIndex={group.offset ? 0 : undefined}>
                <table className="erp-table" aria-label={group.label}>
                  <thead><tr>{group.fields.map((column, index) => <th scope="col" key={column.label}>
                    {group.offset && index < dates.length
                      ? new Date(column.label + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
                      : column.label}
                  </th>)}{group.actions && <th scope="col">Actions</th>}</tr></thead>
                  <tbody>{filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(row => <tr key={row.member.id}>
                    {group.fields.map((column, index) => <td key={column.label} title={group.offset + index < identityColumns.length ? column.value(row) : undefined}>
                      {group.offset && index < dates.length ? showStatus(row.cells[index], true)
                        : column.label === 'Attendance Status' ? showStatus(row.cells[0]) : column.value(row)}
                    </td>)}
                    {group.actions && <td><button type="button" className="fm-button secondary" aria-label={'View attendance for ' + row.member.fullName} onClick={() => setDetail({ key: requestKey, row })}>View</button></td>}
                  </tr>)}</tbody>
                </table>
              </div>
            ))}
          </div>
          {!filtered.length && <p className="fm-monitor-message">No employees match the selected filters.</p>}
          {pageCount > 1 && <TablePagination page={currentPage} totalPages={pageCount} onPageChange={setPage} />}
        </>}
    </section>
    {visibleDetail && <ReferenceViewDialog title="Faculty Attendance Details" subtitle={visibleDetail.member.fullName + ' · ' + employeeCode(visibleDetail.member)} onClose={() => setDetail(null)} showExport={false}>
      <div className="fm-monitor-scroll"><table className="erp-table"><thead><tr>{['Date', ...dailyColumns.map(column => column.label)].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{visibleDetail.cells.map(row => <tr key={row.date}><td>{row.date}</td>{dailyColumns.map(column => <td key={column.label}>{column.value({ cells: [row] })}</td>)}</tr>)}</tbody>
      </table></div>
    </ReferenceViewDialog>}
  </section>
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
        })() : type === 'textarea' ? <textarea {...props} rows={2} /> : <input {...props} type={type === 'readonly' ? 'text' : type} readOnly={type === 'readonly'} max={type === 'date' ? today() : key === 'passingYear' ? new Date().getFullYear() : key === 'weeklyHours' ? 60 : type === 'number' ? 80 : undefined} min={key === 'joiningDate' ? joiningDateMinimum(data.dob) : key === 'passingYear' ? 1950 : type === 'number' ? 0 : undefined} step={key === 'passingYear' ? 1 : type === 'number' ? 0.5 : undefined} inputMode={type === 'tel' || key === 'pincode' ? 'numeric' : undefined} />}
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

function FacultyForm({ initial, faculty, onSave, onCancel, collegeOptions = [], departmentOptions = [], selectedCollegeId = '', saving, saveError = '' }) {
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
  const basicTeaching = !initial?.id && isInitialNonTeaching === false && data.employeeCategory === 'Teaching'
  const formSections = sections.map(section => ({
    ...section,
    fields: section.fields.map(field => basicTeaching && optionalTeachingCreateFields.has(field[0])
      ? [field[0], field[1], field[2], false] : field),
  }))
  const liveErrors = useMemo(() => validateFaculty(clean(data), faculty, basicTeaching), [data, faculty, basicTeaching])
  useEffect(() => {
    // Recheck only errors already displayed, including dependent date fields.
    // Do not show untouched required fields merely because another field changed.
    setErrors(previous => {
      const next = Object.fromEntries(Object.keys(previous).filter(key => liveErrors[key]).map(key => [key, liveErrors[key]]))
      return JSON.stringify(next) === JSON.stringify(previous) ? previous : next
    })
  }, [liveErrors])
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

  const next = async event => {
    event.preventDefault()
    if (saving || photoBusy) return
    const checked = validateFaculty(clean(data), faculty, basicTeaching)
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
      await onSave(clean(data))
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

  const section = formSections[step] ?? null
  const isDocumentsStep = step === sections.length
  const isFinalStep = step === totalSteps - 1
  const isStepOptional = (section && !section.fields.some(([, , , required]) => required)) || isDocumentsStep
  const validationMessage = Object.values(errors).filter(value => typeof value === 'string' && value.trim()).join(' ')

  return (
    <div className="erp-two-column-layout" data-without-live-preview="true">
      <div className="erp-card-main">
        <form className="fm-panel fm-form" ref={formRef} onSubmit={next} noValidate style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
          <nav className="ac-tabs faculty-form-tabs" aria-label="Faculty form steps">
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
          <div className="erp-form-scroll-body fm-registration-scroll">
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
          {validationMessage && <div className="page-error-notice fm-registration-notice" role="alert" data-message-tone="error"><FiAlertCircle aria-hidden="true" /><span>{validationMessage}</span></div>}
          {saveError && <div className="page-error-notice fm-registration-notice" role="alert" data-message-tone="error"><FiAlertCircle aria-hidden="true" /><span>{saveError}</span></div>}
          <footer className="fm-form-footer">
            <button type="button" className="fm-button secondary" onClick={onCancel}>Cancel</button>
            <span className="fm-muted">Step {step + 1} of {totalSteps}</span>
            <div className="fm-actions">
              {step > 0 && (
                <button type="button" className="fm-button secondary" onClick={() => { setErrors({}); setStep(step - 1) }}>
                  Previous
                </button>
              )}
              {isStepOptional && (
                <button type="button" className="fm-button secondary" onClick={next} disabled={saving || photoBusy}>
                  {isFinalStep ? 'Skip Documents & Save' : 'Skip for Now'}
                </button>
              )}
              <button type="submit" className="fm-button" disabled={photoBusy || saving}>
                {saving ? 'Saving…' : isFinalStep ? <><FiCheckCircle /> {basicTeaching ? 'Create & Send Invitation' : data.employeeCategory === 'Non-Teaching' ? 'Save Staff' : 'Save Faculty'}</> : 'Next'}
              </button>
            </div>
          </footer>
        </form>
      </div>

      <></>
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
function ProfileCard({ title, icon: Icon, rows = [] }) {
  return <InfoCard title={title} icon={Icon} rows={rows} />
}

function FacultyManagement() {
  const [sort, setSort] = useState('name')
  const { canAction } = useScreenAccess()
  const canCreate = canAction('/faculty','create'), canEdit = canAction('/faculty','edit')
  const pendingFaculty = useRef(null)
  const [reloadDirectory, setReloadDirectory] = useState(0)
  const { scopeRecords, selectedCollegeId } = useAcademic()
  const location = useLocation()
  const navigate = useNavigate()
  const [faculty, setFaculty] = useCollegeState([])
  const [loadingFaculty, setLoadingFaculty] = useState(true)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ department: '', designation: '', employmentType: '', employmentStatus: '' })
  const [page, setPage] = useState(1)

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
    setLoadingFaculty(true); setLoadError('')
    Promise.all([
      facultyService.list(),
      facultyService.getSubjectAllocations().catch(() => [])
    ])
      .then(([members, allocations]) => {
        if (!active) return
        const allocationMap = new Map()
        allocations.forEach(item => {
          const facultyId = String(item.facultyId ?? item.employeeProfileId ?? '')
          if (facultyId) allocationMap.set(facultyId, [...(allocationMap.get(facultyId) || []), { ...item, id: item.allocationId ?? item.id }])
        })
        setFaculty(scopeRecords(members)
          .filter(member => member && typeof member === 'object')
          .map(member => {
            const saved = normalizeFaculty(member)
            return normalize({ ...saved, completion: calculateCompletion(completionSchemas.faculty, saved), assignments: allocationMap.get(String(member.id)) || member.assignments || [] })
          }))
      })
      .catch(error => { if(active) setLoadError(error.message || 'Unable to load faculty records.') })
      .finally(() => { if (active) setLoadingFaculty(false) })
    return () => { active = false }
  }, [selectedCollegeId, reloadDirectory, scopeRecords, setFaculty])
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
            completion: member ? calculateCompletion(completionSchemas.faculty, normalizeFaculty(safeMember)) : matchedListed?.completion,
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
    categoryParam === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching'
  )

  useEffect(() => {
    const cat = new URLSearchParams(location.search).get('category')
    if (cat === 'Non-Teaching' || cat === 'Teaching') {
      setSelectedCategory(cat)
    } else if (!cat && path === '/faculty') {
      setSelectedCategory('Teaching')
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
  }).sort((a,b) => sort === 'name' ? a.fullName.localeCompare(b.fullName) : String(a.employeeId).localeCompare(String(b.employeeId), undefined, { numeric:true })), [categoryFaculty, query, filters, collegeOptions, faculty, sort])
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
    if (!(data.id || pendingFaculty.current?.id ? canEdit : canCreate)) { setLoadError('You do not have permission to save this employee.'); return }
    if (!data.id && pendingFaculty.current?.id) data = { ...data, id:pendingFaculty.current.id, profileExists:pendingFaculty.current.profileExists }
    const collegeId = data.id ? undefined : Number(selectedCollegeId)
    if (!data.id && (!Number.isSafeInteger(collegeId) || collegeId <= 0)) {
      setLoadError('Select an active college before creating faculty.')
      return
    }
    const facultyData = data.id ? data : { ...data, collegeId }
    saveLock.current = true; setSaving(true); setLoadError('')
    let savedId = data.id
    try {
      pendingFaculty.current ||= {}
      const result = await saveFacultyRecord(facultyService, facultyData, collegeId, pendingFaculty.current)
      const saved = result.saved
      savedId = result.id
      const refreshed = (await facultyService.getById(savedId).catch(() => null)) || saved
      const targetCat = data.employeeCategory || employeeCategoryOf(data) || employeeCategoryOf(refreshed) || 'Teaching'
      const normalizedRecord = normalize({
        ...mergeFacultyData(refreshed, facultyData),
        ...facultyData,
        id: savedId,
        facultyId: savedId,
        employeeId: data.employeeId || refreshed.employeeId || refreshed.facultyCode,
        employeeCategory: targetCat
      })
      setFaculty(rows => rows.some(row => String(row.id) === savedId)
        ? rows.map(row => (String(row.id) === String(data.id) || String(row.facultyId) === String(data.id) || (data.employeeId && row.employeeId && String(row.employeeId).toLowerCase() === String(data.employeeId).toLowerCase()))
            ? { ...row, ...normalizedRecord, assignments: row.assignments || normalizedRecord.assignments }
            : row)
        : [normalizedRecord, ...rows.filter(r => String(r.id) !== String(savedId) && String(r.employeeId).toLowerCase() !== String(normalizedRecord.employeeId).toLowerCase())]
      )
      pendingFaculty.current = null
      const employeeLabel = targetCat === 'Non-Teaching' ? 'Staff' : 'Faculty'
      notify(data.id ? `${employeeLabel} updated successfully` : saved.emailSent === true
        ? `${employeeLabel} created. Setup email accepted for delivery.`
        : `${employeeLabel} created. Setup email delivery was not confirmed.`)
      clear()
      back(targetCat)
    } catch (error) {
      setLoadError(pageDependency12.facultySaveErrorMessage(error))
      // Retain entered fields and photo while retrying the saved employee ID.
    } finally { saveLock.current = false; setSaving(false) }
  }
  const refreshAssignments = async () => {
    const assignments = await facultyService.getSubjectAllocations({ FacultyId: assignmentId })
    setFaculty(rows => rows.map(row => row.id === assignmentId ? { ...row, assignments } : row))
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
      <button hidden={!canCreate} className="fm-button" type="button" onClick={() => addFaculty(activeCategory)}>
        <FiPlus /> {activeCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty'}
      </button>
    </>
  )
  let content
  if (path === '/faculty/advisors' || path === '/faculty/subjects') return <Navigate to="/faculty" replace />
  if (path === '/faculty/attendance') content = <FacultyAttendanceScreen faculty={faculty} departmentOptions={departmentOptions} directoryUnavailable={Boolean(loadError)} />
  else if (((editId || detailId) && !selected) || (!['/faculty', '/faculty/new'].includes(path) && !editId && !detailId)) {
    content = <section className="fm-panel"><EmptyState title="Faculty record not found" action={<button type="button" className="fm-button secondary" onClick={() => back()}><FiArrowLeft /> Back</button>} /></section>
  } else if (path === '/faculty/new' || editId) {
    if (!(editId ? canEdit : canCreate)) return <DashboardLayout><main className="faculty-management"><p role="alert">You do not have permission to change employee records.</p></main></DashboardLayout>
    const defaultNewCategory = categoryParam || selected?.employeeCategory || selectedCategory || activeCategory || 'Teaching'
    content = (
      <ReferenceViewDialog
        title={editId ? (defaultNewCategory === 'Non-Teaching' ? 'Edit Non-Teaching Staff' : 'Edit Teaching Faculty') : (defaultNewCategory === 'Non-Teaching' ? 'Add Non-Teaching Staff' : 'Add Teaching Faculty')}
        subtitle={editId ? 'Faculty employment and profile record' : (defaultNewCategory === 'Non-Teaching' ? 'Non-teaching staff registration and employment record' : 'Teaching faculty registration and employment record')}
        onClose={() => back()}
        busy={saving}
        showExport={false}
        hideFooter
        maxWidth="820px"
        className="faculty-form-dialog"
      >
        <div className="faculty-management faculty-form-dialog-content">
          <FacultyForm
          key={location.key + ':' + Boolean(detail) + ':' + selectedCollegeId + ':' + defaultNewCategory}
          initial={selected || { employmentStatus: 'Working', employeeCategory: defaultNewCategory }}
          faculty={faculty}
          collegeOptions={collegeOptions}
          departmentOptions={departmentOptions}
          selectedCollegeId={selectedCollegeId}
          saving={saving}
          saveError={loadError}
          onSave={save}
          onCancel={() => back()}
          />
        </div>
      </ReferenceViewDialog>
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
      <ReferenceViewDialog title={selected.employeeCategory === 'Non-Teaching' ? 'Staff Details' : 'Faculty Details'} onClose={() => back()} showExport={false} maxWidth="1080px"><div className="cm-profile-view" data-export-record>
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
              hidden={!canEdit}
              onClick={() => navigate('/faculty/' + selected.id + '/edit?category=' + (selected.employeeCategory || activeCategory))}
              title={`Edit ${selected.employeeCategory === 'Non-Teaching' ? 'Staff' : 'Faculty'}`}
            >
              <FiEdit2 className="sp-profile-edit-icon" aria-hidden="true" /> {selected.employeeCategory === 'Non-Teaching' ? 'Edit Staff' : 'Edit Faculty'}
            </button>
          </div>
        </div>

        <CompletionSummary completion={selected.completion} name={selected.fullName} onClick={canEdit ? () => navigate('/faculty/' + selected.id + '/edit?category=' + activeCategory) : undefined} />
        <div className="cm-profile-card">
          <div className="fm-reference-identity"><Avatar faculty={selected} /><div><h3>{selected.fullName}</h3><p>{[displayCode,selected.designation,departmentName,collegeName].filter(Boolean).join(' · ')}</p></div><StatusBadge value={selected.employmentStatus || 'Working'} /></div>
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
<FacultyDocuments facultyId={selected.id} canEdit={canEdit} />
<FacultyStatus faculty={selected} canEdit={canEdit} onChanged={status => { setDetail(current => ({ ...current, employmentStatus: status })); setFaculty(rows => rows.map(row => String(row.id) === String(selected.id) ? { ...row, employmentStatus: status } : row)) }} />
</ReferenceViewDialog>
    )
  } else {
    // Directory View for the selected category (Teaching or Non-Teaching)
    const isCategoryDirectory = categoryParam === 'Teaching' || categoryParam === 'Non-Teaching'
    const summary = [
      { label: selectedCategory === 'Non-Teaching' ? 'Total Staff' : 'Total Faculty', value: categoryFaculty.length },
      { label: 'Working', value: categoryFaculty.filter(row => row.employmentStatus === 'Working').length, tone: 'active' },
      { label: 'On Leave', value: categoryFaculty.filter(row => row.employmentStatus === 'On Leave').length, tone: 'danger' },
      { label: 'Permanent', value: categoryFaculty.filter(row => row.employmentType === 'Permanent').length, tone: 'upcoming' }
    ]
    content = (
      <>
        {isCategoryDirectory && <button type="button" className="fm-directory-back" onClick={() => navigate('/faculty')}>
          <FiArrowLeft aria-hidden="true" /> Back to Faculty &amp; Staff
        </button>}
        <ReferencePageHeader
          title="Faculty & Staff Management"
          subtitle="Choose a workspace to manage teaching faculty or non-teaching staff."
          compactSummary={isCategoryDirectory ? summary : undefined}
        />
        {!isCategoryDirectory ? <section className="fm-directory-category-cards" aria-label="Faculty category configuration">
          {[
            ['Teaching', 'Teaching Faculty', 'Academic team', FiUsers, 'Manage faculty profiles, department assignments, subjects and workload.'],
            ['Non-Teaching', 'Non-Teaching Staff', 'Campus operations', FiBriefcase, 'Manage office, lab, library and support staff profiles.']
          ].map(([value, label, kicker, Icon, description]) => <article key={value} className="fm-directory-category-card">
            <header>
              <span className="fm-directory-category-card__icon"><Icon aria-hidden="true" /></span>
              <div className="fm-directory-category-card__content">
                <em>{kicker}</em>
                <strong>{label}</strong>
                <small>{description}</small>
              </div>
            </header>
            <footer>
              <button type="button" className="fm-directory-configure" aria-label={label} onClick={() => { clear(); setPage(1); navigate('/faculty?category=' + value) }}>
                Open directory <span aria-hidden="true">→</span>
              </button>
              {canCreate && <button type="button" className="fm-directory-add" onClick={() => addFaculty(value)}>
                Add {value === 'Non-Teaching' ? 'staff member' : 'faculty member'}
              </button>}
            </footer>
          </article>)}
        </section> : <section className="faculty-directory">

          <header className="fm-section-bar">
            <div>
              <p className="fm-eyebrow">{selectedCategory === 'Non-Teaching' ? 'NON-TEACHING STAFF DIRECTORY' : 'TEACHING FACULTY DIRECTORY'}</p>
              <p className="fm-muted">{filtered.length} {selectedCategory === 'Non-Teaching' ? 'staff' : 'faculty'} records</p>
            </div>
            <div className="fm-actions">{directoryActions}</div>
          </header>
          <FilterPanel active={active} onClear={clear} leadingActions={<label>Sort by<select aria-label="Sort employees" value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}><option value="name">Employee name</option><option value="id">Employee ID</option></select></label>}>
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
                      {['Employee ID', 'Name', 'Department', 'Designation', 'Experience', 'Employment Type', 'Status', 'Completion', 'Actions'].map(label => (
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
                        <td className="fm-department" title={departmentOptions.find(d => String(d.value) === String(item.departmentId || item.department))?.label || item.department || ''}>{departmentOptions.find(d => String(d.value) === String(item.departmentId || item.department))?.label || item.department || '—'}</td>
                        <td className="fm-designation" title={item.designation || ''}>{item.designation || '—'}</td>
                        <td>{years(item.experience)}</td>
                        <td>{item.employmentType || '—'}</td>
                        <td className="table-center"><StatusBadge value={item.employmentStatus} /></td>
                        <td><CompletionIndicator completion={item.completion} /></td>
                        <td className="table-center">
                          <div className="table-actions-cell table-actions-group">
                            {canEdit && <ResumeSetupAction completion={item.completion} name={item.fullName} onClick={() => navigate('/faculty/' + item.id + '/edit?category=' + activeCategory)} />}
                            {selectedCategory === 'Teaching' && (
                              <button
                                type="button"
                                hidden={!canEdit}
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
                              hidden={!canEdit}
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
            />
          )}
        </section>}
      </>
    )
  }
  return (
    <DashboardLayout>
      {path === '/faculty' && (
        <nav className="app-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard">Home</Link>
          <span aria-hidden="true">/</span>
          {categoryParam === 'Teaching' || categoryParam === 'Non-Teaching' ? (
            <>
              <Link to="/faculty">Faculty Directory</Link>
              <span aria-hidden="true">/</span>
              <strong aria-current="page">{selectedCategory === 'Non-Teaching' ? 'Non-Teaching Staff' : 'Teaching Faculty'}</strong>
            </>
          ) : <strong aria-current="page">Faculty Directory</strong>}
        </nav>
      )}
      <main className={`faculty-management${path === '/faculty' && !(categoryParam === 'Teaching' || categoryParam === 'Non-Teaching') ? ' faculty-management--overview' : ''}${path === '/faculty' && (categoryParam === 'Teaching' || categoryParam === 'Non-Teaching') ? ' faculty-management--directory' : ''}`}>
        {loadError && path !== '/faculty/new' && !editId && <p className="fm-error" role="alert">{loadError} <button type="button" onClick={() => setReloadDirectory(value => value + 1)}>Retry</button></p>}
        {loadingFaculty ? <section className="fm-panel">Loading faculty records...</section> : content}
        {assignedFaculty && (
<ApiAssignmentDialog faculty={assignedFaculty} onClose={() => setAssignmentId(null)} onChanged={refreshAssignments} />
        )}
        <div className={'fm-toast ' + (toast ? 'visible' : '')} role="status" aria-live="polite">{toast && <><FiCheckCircle />{toast}</>}</div>
      </main>
    </DashboardLayout>
  )
}

return { FacultyAttendanceScreen, AttendanceEditor, teachingDesignations, nonTeachingDesignations, getStoredDesignations, getDesignationOptions, formatTimeView, formatFacultyDisplayCode, default: FacultyManagement }
})()

const PayrollScreen = { default: PayrollWorkspace }

export const FacultyDailyAttendance = FacultyManagementScreen.FacultyAttendanceScreen
export const FacultyAttendanceEditor = FacultyManagementScreen.AttendanceEditor
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
