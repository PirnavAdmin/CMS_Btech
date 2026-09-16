import { useEffect, useState } from 'react'
import facultyService from '../../services/facultyService'
import { academicYearApi, branchApi, courseApi, sectionApi, facultyMasterApi } from '../../api/apiEndpoints'

export function FacultyDocuments({ facultyId }) {
  const [documents, setDocuments] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null), [name, setName] = useState(''), [type, setType] = useState(''), [pending, setPending] = useState(null)
  const load = async () => setDocuments(await facultyService.getDocuments(facultyId))
  useEffect(() => { load().catch(reason => setError(reason.message)) }, [facultyId])
  const upload = async event => {
    event.preventDefault(); if (busy || !file) return
    setBusy(true); setError('')
    try { await facultyService.uploadDocument(facultyId, file, { DocumentName: name, DocumentType: type }); setFile(null); await load(); event.target.reset() }
    catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  const remove = async id => {
    setBusy(true); setError('')
    try { await facultyService.deleteDocument(id); setPending(null); await load() }
    catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  return <section className="fm-panel"><h2>Faculty Documents</h2>{error && <p role="alert" className="fm-error">{error}</p>}<form className="fm-form-grid" onSubmit={upload}><label>Document name<input required value={name} onChange={e => setName(e.target.value)} /></label><label>Document type<input required value={type} onChange={e => setType(e.target.value)} /></label><label>File<input required type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></label><button className="fm-button" disabled={busy || !file}>Upload document</button></form><ul>{documents.map(row => { const id = row.facultyDocumentId ?? row.documentId ?? row.id; return <li key={id}>{row.documentName ?? row.name}{pending === id ? <><span> Remove this document?</span><button disabled={busy} onClick={() => remove(id)}>Remove</button><button onClick={() => setPending(null)}>Cancel</button></> : <button onClick={() => setPending(id)}>Remove</button>}</li> })}</ul>{!documents.length && <p>No documents found.</p>}</section>
}

export function FacultyStatus({ faculty, onChanged }) {
  const [history, setHistory] = useState([]), [status, setStatus] = useState(faculty.employmentStatus), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const load = async () => setHistory(await facultyService.getStatusHistory(faculty.id))
  useEffect(() => { load().catch(e => setError(e.message)) }, [faculty.id])
  const save = async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await facultyService.updateStatus(faculty.id, { status, reason }); onChanged(status); await load(); setReason('') } catch (e) { setError(e.message) } finally { setBusy(false) } }
  return <section className="fm-panel"><h2>Employment Status</h2>{error && <p className="fm-error" role="alert">{error}</p>}<form className="fm-form-grid" onSubmit={save}><label>Status<select value={status} onChange={e => setStatus(e.target.value)}>{['Working', 'On Leave', 'Resigned', 'Retired', 'Inactive'].map(value => <option key={value}>{value}</option>)}</select></label><label>Reason<input required value={reason} onChange={e => setReason(e.target.value)} /></label><button className="fm-button" disabled={busy || status === faculty.employmentStatus}>Update status</button></form><ul>{history.map((row, index) => <li key={row.statusHistoryId ?? row.id ?? index}>{row.status ?? row.newStatus} — {row.reason} — {row.changedAt ?? row.createdAt}</li>)}</ul></section>
}

export function ApiAssignmentDialog({ faculty, onClose, onChanged }) {
  const [masters, setMasters] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [editing, setEditing] = useState(null)
  const blank = { academicYearId: '', courseId: '', branchId: '', semesterId: '', sectionId: '', subjectId: '', assignmentType: 'Subject Faculty', weeklyHours: 0, isPrimaryFaculty: false, remarks: '' }
  const [form, setForm] = useState(blank)
  useEffect(() => { let active = true; Promise.all([academicYearApi.getAll(), courseApi.getAll(), branchApi.getAll(), facultyMasterApi.getSemesters(), sectionApi.getAll(), facultyMasterApi.getSubjects()]).then(([years, courses, branches, semesters, sections, subjects]) => { if (active) setMasters({ years, courses, branches, semesters, sections, subjects }) }).catch(e => { if (active) setError(e.message) }); return () => { active = false } }, [])
  const save = async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const payload = { ...form, facultyId: faculty.id }
      if (editing) await facultyService.updateSubjectAllocation(editing, payload)
      else await facultyService.createSubjectAllocation(payload)
      await onChanged(); setEditing(null); setForm(blank)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const remove = async id => { if (busy) return; setBusy(true); setError(''); try { await facultyService.deleteSubjectAllocation(id); await onChanged() } catch (e) { setError(e.message) } finally { setBusy(false) } }
  const [pending, setPending] = useState(null)
  return <div className="fm-modal-backdrop"><section className="fm-attendance-editor" role="dialog" aria-modal="true" aria-label="Academic assignments"><header><h2>{faculty.fullName} — Academic Assignments</h2><button onClick={onClose} disabled={busy}>Close</button></header>{error && <p role="alert" className="fm-error">{error}</p>}{masters ? <form onSubmit={save}><div className="fm-form-grid">{[['academicYearId', 'Academic Year', 'years', 'academicYearId', 'academicYearName'], ['courseId', 'Course', 'courses', 'courseId', 'courseName'], ['branchId', 'Branch', 'branches', 'branchId', 'branchName'], ['semesterId', 'Semester', 'semesters', 'semesterId', 'semesterName'], ['sectionId', 'Section', 'sections', 'sectionId', 'sectionName'], ['subjectId', 'Subject', 'subjects', 'subjectId', 'subjectName']].map(([key, label, collection, idKey, nameKey]) => <label key={key}>{label}<select required={['branchId', 'semesterId'].includes(key)} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}><option value="">Select {label}</option>{masters[collection].filter(row => !(key === 'branchId' && form.courseId && row.courseId && String(row.courseId) !== String(form.courseId)) && !(['semesterId', 'sectionId', 'subjectId'].includes(key) && form.branchId && row.branchId && String(row.branchId) !== String(form.branchId))).map(row => <option key={row[idKey] ?? row.id} value={row[idKey] ?? row.id}>{row[nameKey] ?? row.name ?? row.code}</option>)}</select></label>)}<label>Assignment type<select value={form.assignmentType} onChange={e => setForm({ ...form, assignmentType: e.target.value })}>{['Subject Faculty', 'Lab Faculty', 'Class Advisor', 'Mentor', 'Project Guide'].map(value => <option key={value}>{value}</option>)}</select></label>{editing && <label>Periods per week<input type="number" min="0" max="60" value={form.weeklyHours} onChange={e => setForm({ ...form, weeklyHours: e.target.value })} /></label>}<label>Remarks<input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></label></div><button className="fm-button" disabled={busy}>{busy ? 'Saving…' : editing ? 'Update assignment' : 'Add assignment'}</button></form> : !error && <p>Loading academic options…</p>}<ul>{(faculty?.assignments || []).map(row => <li key={row.id}>{row.subjectName || row.assignmentType} — {row.semester} — {row.section}<button disabled={busy} onClick={() => { setEditing(row.id); setForm({ ...blank, ...row }) }}>Edit</button>{pending === row.id ? <><button disabled={busy} onClick={() => remove(row.id)}>Confirm removal</button><button onClick={() => setPending(null)}>Cancel</button></> : <button onClick={() => setPending(row.id)}>Remove</button>}</li>)}</ul></section></div>
}
