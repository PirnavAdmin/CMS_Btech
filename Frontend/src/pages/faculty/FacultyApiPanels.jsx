import { useEffect, useState } from 'react'
import facultyService from '../../services/facultyService'
import { academicYearApi, branchApi, courseApi, sectionApi, facultyMasterApi } from '../../api/apiEndpoints'
import { FiFileText, FiUploadCloud, FiTrash2, FiClock, FiActivity, FiBriefcase, FiX, FiCheck, FiPlus, FiAlertCircle } from 'react-icons/fi'

export function FacultyDocuments({ facultyId }) {
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
          <select value={type} onChange={e => setType(e.target.value)}>
            {['Certificate', 'Degree', 'Experience', 'ID Proof', 'Resume', 'Joining Letter', 'Other'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
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
                    <p className="fm-muted">{docType} {row.uploadedOn ? `· ${new Date(row.uploadedOn).toLocaleDateString()}` : ''}</p>
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

export function FacultyStatus({ faculty, onChanged }) {
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
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {['Working', 'On Leave', 'Resigned', 'Retired', 'Inactive'].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
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
                <small className="fm-history-date"><FiClock /> {row.changedAt ?? row.createdAt ? new Date(row.changedAt ?? row.createdAt).toLocaleString('en-GB') : '—'}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

export function ApiAssignmentDialog({ faculty, onClose, onChanged }) {
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
            <h2 id="fm-assignment-modal-title">{faculty.fullName} — Subject Allocations</h2>
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
                  <select
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
                  </select>
                </label>
              ))}
              <label>
                <span>Assignment Type</span>
                <select value={form.assignmentType} onChange={e => setForm({ ...form, assignmentType: e.target.value })}>
                  {['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'].map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
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
                <FiPlus /> {busy ? 'Saving…' : editing ? 'Update Assignment' : 'Add Allocation'}
              </button>
            </div>
          </form>
        ) : !error && (
          <p className="fm-muted">Loading academic options…</p>
        )}

        <div className="fm-current-assignments" style={{ marginTop: '18px' }}>
          <h2>Allocated Responsibilities <span className="fm-muted">({faculty?.assignments?.length || 0})</span></h2>
          {(faculty?.assignments || []).length ? (
            <div className="fm-assignment-list">
              {faculty.assignments.map(row => (
                <article key={row.id} className="fm-assignment-card">
                  <div>
                    <strong>{row.subjectName || row.assignmentType}</strong>
                    <p>{row.course || 'B.Tech'} · {row.branch || faculty.department} · {row.semester} · {row.section}</p>
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

