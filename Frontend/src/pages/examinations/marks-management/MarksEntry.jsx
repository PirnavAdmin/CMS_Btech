import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import SearchableSelect from '../../../components/SearchableSelect'
import EmptyState from '../../../components/EmptyState'
import StatusBadge from '../../../components/StatusBadge'
import TablePagination from '../../../components/TablePagination'
import ViewDialog from '../../../components/ViewDialog'
import MarksModuleNav from './MarksModuleNav'
import { useAcademic } from '../../../context/AcademicContext'
import { marksApi } from '../../../api/apiEndpoints'
import { getUserRole } from '../../../auth/auth'
import studentService from '../../../services/studentService'
import subjectService from '../../../services/subjectService'
import { editableMark, markValueError, marksWorkflowPayload, workflowSummary } from './marksWorkflow'
import './MarksManagement.css'

const titles = { entry: 'Marks Entry', approval: 'Marks Approval', upload: 'Bulk Marks Upload', student: 'Student Marks', subject: 'Subject Marks Report' }
const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0
const options = (rows, kind) => rows.map(row => ({ id: String(row[`${kind}Id`] ?? row.id), name: row[`${kind}Name`] || row.name || row.code || String(row.id) })).filter(row => positiveId(row.id))
function Field({ label, ...props }) { return <label className="marks-field"><span>{label}</span><input {...props} /></label> }
export default function MarksEntry({ mode = 'entry' }) {
  const academic = useAcademic()
  return <DashboardLayout><MarksWorkspace key={`${mode}:${academic.selectedCollegeId}`} mode={mode} academic={academic} /></DashboardLayout>
}
function MarksWorkspace({ mode, academic }) {
  const allowed = getUserRole() === 'admin' && Boolean(academic.selectedCollegeId)
  const [filters, setFilters] = useState({ examId: '', sectionId: '', subjectId: '', studentId: '', search: '', workflowStatus: mode === 'approval' ? 'SUBMITTED' : '' })
  const [rows, setRows] = useState([]), [subjects, setSubjects] = useState([]), [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState(1), [drafts, setDrafts] = useState({}), [decision, setDecision] = useState(''), [remarks, setRemarks] = useState(''), [history, setHistory] = useState(null)
  const [adding, setAdding] = useState(false), [newRows, setNewRows] = useState([]), [maximum, setMaximum] = useState('')
  const [file, setFile] = useState(null), [preview, setPreview] = useState(null)
  const lock = useRef(false), generation = useRef(0)
  useEffect(() => {
    if (!allowed) return
    let active = true
    subjectService.getSubjects({ liveOnly: true }).then(data => { if (active) setSubjects(data) }).catch(() => { if (active) setError('Subject catalog unavailable. Retry by reloading this page.') })
    return () => { active = false; generation.current++ }
  }, [allowed])
  const change = patch => { if (Object.keys(drafts).length || newRows.some(row => String(row.marksObtained).trim() !== '')) { setError('Save your entered marks or close the entry grid and discard changes before changing filters.'); return } generation.current++; setFilters(f => ({ ...f, ...patch })); setRows([]); setSelected([]); setDrafts({}); setLoaded(false); setNewRows([]); setPreview(null); setPage(1); setError(''); setLoading(false) }
  const load = async () => {
    if (!allowed || busy || loading) return
    if (Object.keys(drafts).length) { setError('Save or discard changed marks before loading another list.'); return }
    const token = ++generation.current
    if (['student', 'subject'].includes(mode) && !positiveId(filters.examId)) { setError('Select an existing numeric examination ID.'); return }
    if (mode === 'student' && !positiveId(filters.studentId)) { setError('Enter the student ID for this report.'); return }
    setLoading(true); setError(''); setSelected([]); setDrafts({})
    try {
      const result = mode === 'student' ? await marksApi.studentReport(filters) : mode === 'subject' ? await marksApi.subjectReport(filters) : await marksApi.list(filters)
      if (token !== generation.current) return
      setRows(mode === 'student' ? (result?.subjects || []).map(r => ({ ...r, studentName: result.studentName, studentCode: result.studentCode, examName: result.examName })) : result)
      setLoaded(true); setPage(1)
    } catch (e) { if (token === generation.current) { setRows([]); setError(e.message) } }
    finally { if (token === generation.current) setLoading(false) }
  }
  const operate = async fn => {
    if (lock.current || !allowed) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { await fn() } catch (e) { setError(e.message) } finally { lock.current = false; setBusy(false) }
  }
  const saveEdits = () => operate(async () => {
    const entries = Object.entries(drafts)
    for (const [, row] of entries) { const issue = markValueError(row); if (issue) throw new Error(issue) }
    let saved = 0
    for (const [id, row] of entries) {
      try { await marksApi.update(id, { marksObtained: Number(row.marksObtained), maxMarks: Number(row.maxMarks), remarks: row.remarks || null }); saved++; setDrafts(current => { const next = { ...current }; delete next[id]; return next }); setRows(current => current.map(r => String(r.markId) === id ? { ...r, ...row, workflowStatus: 'DRAFT' } : r)) }
      catch (e) { throw new Error(`${saved} saved. Remaining changes retained. ${e.message}`) }
    }
    setNotice(`${saved} mark entries saved. Reload to review the latest server status.`)
  })
  const confirmWorkflow = () => operate(async () => {
    const chosen = rows.filter(row => selected.includes(row.markId))
    const payload = marksWorkflowPayload(decision, chosen, remarks)
    const result = await marksApi.workflow(decision, payload)
    setNotice(workflowSummary(result)); setDecision(''); setSelected([])
    if (result.errors?.length) setError(result.errors.map(item => item.message).join(' '))
    // Do not infer approved states from a successful HTTP response: reload actual records.
    setRows(await marksApi.list(filters)); setPage(1)
  })
  const loadStudents = () => operate(async () => {
    if (newRows.some(row => String(row.marksObtained).trim() !== '')) throw new Error('Save entered marks before loading students again.')
    if (!positiveId(filters.examId) || !positiveId(filters.subjectId) || !positiveId(filters.sectionId)) throw new Error('Select examination, subject and section before loading students.')
    if (!(Number(maximum) > 0)) throw new Error('Enter the configured maximum marks for this assessment.')
    const students = await studentService.getStudentsByScope({ sectionId: filters.sectionId })
    if (!students.length) setNotice('No students found in the selected section.')
    setNewRows(academic.scopeRecords(students).filter(s => positiveId(s.studentId ?? s.id)).map(s => ({ studentId: Number(s.studentId ?? s.id), studentName: s.personal?.fullName || s.studentName || s.name, studentCode: s.academic?.rollNumber || s.rollNumber || s.studentCode, marksObtained: '', maxMarks: maximum, remarks: '' })))
  })
  const createEntries = () => operate(async () => {
    const entered = newRows.filter(row => String(row.marksObtained).trim() !== '')
    if (!entered.length) throw new Error('Enter at least one mark. Unfilled rows are not submitted.')
    for (const row of entered) { const issue = markValueError(row); if (issue) throw new Error(`${row.studentName}: ${issue}`) }
    let saved = 0
    for (const row of entered) {
      try { await marksApi.create({ examId: Number(filters.examId), subjectId: Number(filters.subjectId), sectionId: Number(filters.sectionId), studentId: row.studentId, marksObtained: Number(row.marksObtained), maxMarks: Number(row.maxMarks), remarks: row.remarks || null }); saved++; setNewRows(current => current.filter(r => r.studentId !== row.studentId)) }
      catch (e) { throw new Error(`${saved} entries saved. Remaining rows retained. ${e.message} Verify existing records before retrying an uncertain request.`) }
    }
    setNotice(`${saved} draft marks saved to the server. Load marks to review and submit.`)
  })
  const upload = isPreview => operate(async () => {
    if (!positiveId(filters.examId)) throw new Error('Enter a valid backend examination ID.')
    const result = await marksApi.upload(file, filters, isPreview)
    if (!result || !Number.isInteger(result.totalRows)) throw new Error('The server did not confirm the upload result. Reload records before retrying.')
    setPreview(isPreview ? result : null)
    setNotice(isPreview ? `${result.validRows} valid of ${result.totalRows} rows.` : `${result.insertedRows} inserted; ${result.updatedRows} updated; ${result.rejectedRows} rejected.`)
    if (result.errors?.length) setError(result.errors.map(e => `Row ${e.rowNumber}: ${e.message}`).join('\n'))
  })
  const paged = rows.slice((page - 1) * 10, page * 10)
  const canSelect = mode === 'entry' || mode === 'approval'
  return <section className="marks-workspace"><PageHeader title={titles[mode]} subtitle="Record and review examination marks using institutional records." /><MarksModuleNav />
    {!allowed ? <EmptyState title="Access restricted" message="Select a college and sign in as an authorized examination administrator." /> : <>
      <p className="marks-note">Use the examination ID from the institution's records. The examination catalog and official result-publication integrations are not available yet.</p>
      <fieldset className="marks-filter-row" disabled={busy || loading}><legend className="marks-sr-only">Marks filters</legend>
        <Field label="Examination ID" type="number" min="1" step="1" value={filters.examId} onChange={e => change({ examId: e.target.value })} />
        <SearchableSelect label="Subject" value={filters.subjectId} options={[{ id: '', name: 'All subjects' }, ...options(subjects, 'subject')]} onChange={subjectId => change({ subjectId })} />
        <SearchableSelect label="Section" value={filters.sectionId} options={[{ id: '', name: 'All sections' }, ...options(academic.scopeRecords(academic.sections), 'section')]} onChange={sectionId => change({ sectionId })} />
        {mode === 'student' ? <Field label="Student ID" type="number" min="1" value={filters.studentId} onChange={e => change({ studentId: e.target.value })} /> : canSelect && <Field label="Search" type="search" value={filters.search} onChange={e => change({ search: e.target.value })} placeholder="Student or subject" />}
        {mode !== 'upload' && <SearchableSelect label="Status" value={filters.workflowStatus} options={['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']} onChange={workflowStatus => change({ workflowStatus })} />}
        {mode !== 'upload' && <button className="erp-btn erp-btn--primary" onClick={load}>Load marks</button>}
        <button className="erp-btn erp-btn--secondary" onClick={() => change({ examId: '', sectionId: '', subjectId: '', studentId: '', search: '', workflowStatus: mode === 'approval' ? 'SUBMITTED' : '' })}>Clear</button>
      </fieldset>
      {error && <div className="marks-error" role="alert">{error}{!busy && mode !== 'upload' && <button className="erp-btn erp-btn--secondary" onClick={load}>Retry load</button>}</div>}
      {notice && <p className="marks-note" role="status">{notice}</p>}
      {mode === 'upload' ? <section className="erp-section marks-upload"><h2>Upload marks workbook</h2><p>Use XLSX up to 10 MB. Required columns: StudentCode, SubjectCode, MarksObtained. Optional: MaxMarks, Grade, Remarks. Existing marks are not overwritten.</p><Field label="Workbook" type="file" accept=".xlsx" disabled={busy} onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setNotice(''); setError('') }} /><div className="marks-actions"><button className="erp-btn erp-btn--secondary" disabled={busy || !file} onClick={() => upload(true)}>Validate workbook</button><button className="erp-btn erp-btn--primary" disabled={busy || !preview || preview.rejectedRows > 0 || preview.validRows < 1} onClick={() => upload(false)}>Upload validated marks</button></div></section> : <>
        {mode === 'entry' && <div className="marks-actions"><button className="erp-btn erp-btn--primary" disabled={busy} onClick={() => { if (adding && newRows.some(row => String(row.marksObtained).trim() !== '')) { setError('Save entered marks before closing the grid.'); return } setAdding(v => !v); setNewRows([]) }}>{adding ? 'Close entry grid' : '+ Enter Marks'}</button><button className="erp-btn erp-btn--secondary" disabled={busy || !Object.keys(drafts).length} onClick={saveEdits}>Save changed marks</button><button className="erp-btn erp-btn--secondary" disabled={busy || !Object.keys(drafts).length} onClick={() => { setDrafts({}); setError('') }}>Discard edits</button><button className="erp-btn erp-btn--secondary" disabled={busy || !selected.length || Object.keys(drafts).length > 0} onClick={() => { setDecision('submit'); setRemarks('') }}>Submit selected</button></div>}
        {adding && <section className="erp-section marks-upload"><h2>Section marks entry</h2><p>Select an examination, subject and section above. Enter the institution's maximum marks; no grading rules are inferred.</p><div className="marks-actions"><Field label="Maximum marks" type="number" min="0.01" value={maximum} disabled={busy || newRows.length > 0} onChange={e => setMaximum(e.target.value)} /><button className="erp-btn erp-btn--secondary" disabled={busy} onClick={loadStudents}>Load students</button><button className="erp-btn erp-btn--primary" disabled={busy || !newRows.length} onClick={createEntries}>Save entered marks</button></div><div className="marks-table"><table><thead><tr><th>Student / Roll No.</th><th>Marks</th><th>Maximum</th><th>Remarks</th></tr></thead><tbody>{newRows.map((row, index) => <tr key={row.studentId}><td>{row.studentName}<small>{row.studentCode}</small></td><td><input aria-label={`Marks for ${row.studentName}`} type="number" min="0" max={row.maxMarks} step="0.01" value={row.marksObtained} disabled={busy} onChange={e => setNewRows(current => current.map((r, n) => n === index ? { ...r, marksObtained: e.target.value } : r))} /></td><td>{row.maxMarks}</td><td><input aria-label={`Remarks for ${row.studentName}`} value={row.remarks} disabled={busy} onChange={e => setNewRows(current => current.map((r, n) => n === index ? { ...r, remarks: e.target.value } : r))} /></td></tr>)}</tbody></table></div></section>}
        {mode === 'approval' && <div className="marks-actions"><button className="erp-btn erp-btn--primary" disabled={busy || !selected.length} onClick={() => { setDecision('approve'); setRemarks('') }}>Approve selected</button><button className="erp-btn erp-btn--secondary" disabled={busy || !selected.length} onClick={() => { setDecision('reject'); setRemarks('') }}>Return for correction</button></div>}
        {loading ? <p role="status">Loading marks...</p> : !rows.length ? <EmptyState title={loaded ? 'No matching marks' : 'Select filters and load marks'} message={loaded ? 'Clear filters or enter draft marks for this examination.' : 'Only saved institutional records will be displayed.'} /> : <section className="erp-section"><div className="marks-table"><table><thead><tr>{canSelect && <th>Select</th>}<th>{mode === 'subject' ? 'Subject' : 'Student'}</th><th>{mode === 'subject' ? 'Students' : 'Subject / Examination'}</th><th>Marks</th><th>{mode === 'subject' ? 'Approved' : 'Maximum'}</th><th>{mode === 'subject' ? 'Average %' : 'Status'}</th><th>{mode === 'subject' ? 'Highest / Lowest' : 'Remarks / History'}</th></tr></thead><tbody>{paged.map(row => {
          const value = drafts[row.markId] || row, editable = mode === 'entry' && editableMark(row)
          return <tr key={row.markId ?? row.subjectId}>{canSelect && <td><input type="checkbox" aria-label={`Select ${row.studentName} ${row.subjectName}`} disabled={busy || (mode === 'approval' ? row.workflowStatus !== 'SUBMITTED' : !editableMark(row))} checked={selected.includes(row.markId)} onChange={e => setSelected(current => e.target.checked ? [...current, row.markId] : current.filter(id => id !== row.markId))} /></td>}<td>{mode === 'subject' ? row.subjectName : row.studentName}<small>{mode === 'subject' ? row.subjectCode : row.studentCode}</small></td><td>{mode === 'subject' ? row.totalStudents : <>{row.subjectName}<small>{row.examName} / {row.sectionName}</small></>}</td><td className="marks-number">{editable ? <input aria-label={`Marks for ${row.studentName} ${row.subjectName}`} type="number" min="0" max={row.maxMarks} step="0.01" value={value.marksObtained} disabled={busy} onChange={e => setDrafts(current => ({ ...current, [row.markId]: { ...value, marksObtained: e.target.value } }))} /> : mode === 'subject' ? row.averageMarks : row.marksObtained}</td><td className="marks-number">{mode === 'subject' ? row.approvedCount : row.maxMarks}</td><td>{mode === 'subject' ? row.averagePercentage : <StatusBadge value={row.workflowStatus} />}</td><td>{mode === 'subject' ? `${row.highestMarks} / ${row.lowestMarks}` : <>{row.remarks || '-'}{mode === 'approval' && <button className="erp-btn erp-btn--secondary" disabled={busy} onClick={() => operate(async () => setHistory({ row, items: await marksApi.approvalHistory(row.markId) }))}>History</button>}</>}</td></tr>
        })}</tbody></table></div><TablePagination currentPage={page} totalPages={Math.ceil(rows.length / 10)} onPageChange={setPage} /></section>}
      </>}
      {decision && <ViewDialog title={decision === 'reject' ? 'Return marks for correction' : `${decision === 'approve' ? 'Approve' : 'Submit'} marks`} onClose={() => { if (!busy) setDecision('') }} footerActions={<button className="erp-btn erp-btn--primary" disabled={busy || decision === 'reject' && !remarks.trim()} onClick={confirmWorkflow}>Confirm {decision}</button>}><p>{selected.length} selected entries. The server validates permissions and current status.</p><Field label={decision === 'reject' ? 'Required correction remarks' : 'Remarks'} value={remarks} disabled={busy} onChange={e => setRemarks(e.target.value)} />{error && <p role="alert" className="marks-error">{error}</p>}</ViewDialog>}
      {history && <ViewDialog title={`Approval history - ${history.row.studentName}`} onClose={() => setHistory(null)}><div className="marks-table"><table><thead><tr><th>From</th><th>To</th><th>By</th><th>Date</th><th>Remarks</th></tr></thead><tbody>{history.items.map(item => <tr key={item.historyId}><td>{item.fromStatus}</td><td>{item.toStatus}</td><td>{item.actionBy}</td><td>{item.actionAt}</td><td>{item.remarks}</td></tr>)}</tbody></table>{!history.items.length && <p>No workflow history recorded.</p>}</div></ViewDialog>}
    </>}
  </section>
}
