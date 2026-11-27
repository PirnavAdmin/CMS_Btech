import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenCheck, CheckCircle2, Circle, Download, Eye, FileSpreadsheet, FileText, Info, MoreVertical, Pencil, Plus, Upload, X } from 'lucide-react'
import { formatFileSize, SYLLABUS_ACCEPT, SYLLABUS_MAX_FILE_SIZE, validateSyllabusFile } from './syllabusFiles.js'

export default function SubjectSyllabusTable({ rows, hasMappings, loading, error, heading, tabs, bulkRequest = 0, onBulkSelection, onRetry, canCreate, canEdit, canUpload, canDownload, canPublish, canArchive, onCreate, onUpload, onView, onEdit, onDownload, onDocument, onReplace, onPublish, onArchive, onHistory, onBatch, onBatchComplete }) {
  const [selected, setSelected] = useState(new Set())
  const [batch, setBatch] = useState('')
  const openBatch = (mode, subjects) => setBatch({ mode, subjects })
  const checked = rows.filter(row => selected.has(row.id))
  const uploadRows = canUpload && !loading && !error ? checked.filter(row => !row.unavailable) : []
  const requestedBulk = useRef(0)
  useEffect(() => { onBulkSelection?.(uploadRows.length) }, [onBulkSelection, uploadRows.length])
  useEffect(() => {
    if (!bulkRequest) { requestedBulk.current = 0; return }
    if (bulkRequest === requestedBulk.current || !uploadRows.length) return
    requestedBulk.current = bulkRequest
    setBatch({ mode: 'upload', subjects: uploadRows })
  }, [bulkRequest, uploadRows])
  const toggle = id => setSelected(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const renderTable = () => {
    if (loading) return <div className="syllabus-loading-line" role="status">Loading mapped subjects…</div>
    if (error) return <div className="syllabus-inline-alert" role="alert">{error}{onRetry && <button type="button" onClick={onRetry}>Retry subjects</button>}</div>
    if (!rows.length) return hasMappings ? <div className="syllabus-empty syllabus-empty--compact"><strong>No subjects match the current filters.</strong></div> : <div className="syllabus-empty syllabus-empty--compact"><BookOpenCheck size={24} /><strong>No subjects are mapped to the selected semester. Please configure subjects in Subject Management.</strong><Link className="syllabus-btn syllabus-btn--secondary" to="/subject-management">Go to Subject Management</Link></div>
    return <div className="syllabus-subject-table-wrap">
      <table className="syllabus-subject-table">
        <thead><tr><th><input type="checkbox" aria-label="Select all subjects" checked={rows.length > 0 && checked.length === rows.length} onChange={event => setSelected(event.target.checked ? new Set(rows.map(row => row.id)) : new Set())} /></th><th>S.No</th><th>Subject Code</th><th>Subject Name</th><th>Credits</th><th>Syllabus Status</th><th>Syllabus Document</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id}>
          <td><input type="checkbox" aria-label={'Select ' + row.name} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
          <td data-label="No.">{index + 1}</td><td data-label="Subject code">{row.code}</td><td data-label="Subject name"><strong>{row.name}</strong></td><td data-label="Credits">{row.credits}</td>
          <td data-label="Syllabus status"><span className={'syllabus-status syllabus-status--' + row.status.toLowerCase()}>{row.status === 'Published' ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}{row.status}</span></td>
          <td data-label="Syllabus Document">{row.documents.length ? <SubjectDocument file={row.documents[0]} extra={row.documents.length - 1} canOpen={canDownload} onOpen={onDocument} onMore={() => onView(row)} /> : <span aria-label={row.unavailable ? 'Unavailable' : 'Not Uploaded'}>&mdash;</span>}{row.documentFailed && <small className="syllabus-table-upload-error">Upload Failed</small>}</td>
          <td data-label="Actions"><div className="syllabus-inline-subject-actions">
            <button type="button" disabled={row.unavailable || !(row.target ? canEdit : canCreate)} onClick={() => row.content ? onEdit(row) : onCreate(row)}><Pencil size={14} />Create/Edit Syllabus</button>
            <button type="button" disabled={row.unavailable || !canUpload} onClick={() => onUpload(row)}><Upload size={14} />Upload Syllabus</button>
            <button type="button" aria-label={'View syllabus for ' + row.name} disabled={!row.content && !row.documents.length} onClick={() => onView(row)}><Eye size={15} /></button>
            <details className="syllabus-subject-actions"><summary aria-label={'More actions for ' + row.name}><MoreVertical size={15} /></summary><div onClick={event => { if (event.target.closest('button')) event.currentTarget.parentElement.open = false }}>
              <small>{row.type} &middot; {row.updated}</small>
              {(row.content || row.documents.length > 0) && <button type="button" onClick={() => onView(row)}>Preview Syllabus</button>}
              {canDownload && row.documents.length > 0 && <button type="button" onClick={() => onDownload(row.documents[0], true)}>Download Document</button>}
              {canEdit && row.target && (row.target.documents || row.target.Documents || []).length > 0 && <button type="button" onClick={() => onReplace(row)}>Replace Document</button>}
              {canPublish && row.publishable && <button type="button" onClick={() => onPublish(row)}>Publish Syllabus</button>}
              {(row.target || row.archive) && <button type="button" onClick={() => onHistory(row)}>Version History</button>}
              {canArchive && row.target && <button type="button" onClick={() => onArchive(row)}>Archive Syllabus</button>}
            </div></details>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
  }
  return <section className="syllabus-subject-workspace" aria-label="Mapped subject syllabi">
    <div className="syllabus-subject-toolbar">
      {heading || <strong>{checked.length ? checked.length + ' selected' : rows.length + ' mapped subjects'}</strong>}
      <div>
        {canCreate && <button className="syllabus-btn syllabus-btn--secondary" type="button" disabled={!checked.some(row => !row.content && (!row.target || canEdit) && !row.unavailable)} onClick={() => openBatch('create', checked.filter(row => !row.content && (!row.target || canEdit) && !row.unavailable))}><Plus size={14} /> Create Syllabus (Batch)</button>}
        {canUpload && <button className="syllabus-btn syllabus-btn--primary" type="button" disabled={!checked.some(row => !row.unavailable)} onClick={() => openBatch('upload', checked.filter(row => !row.unavailable))}><Upload size={14} /> Upload Syllabus (Batch)</button>}
        {checked.length > 0 && canDownload && <button className="syllabus-btn syllabus-btn--secondary" type="button" disabled={!rows.some(row => row.documents.length)} onClick={() => openBatch('download', rows.filter(row => row.documents.length))}><Download size={14} /> Download All</button>}
        {checked.length > 0 && canPublish && <button className="syllabus-btn syllabus-btn--secondary" type="button" disabled={!checked.some(row => row.publishable)} onClick={() => openBatch('publish', checked.filter(row => row.publishable))}>Publish Selected</button>}
      </div>
    </div>
    {tabs}
    {renderTable()}
    {heading && <p className="syllabus-subject-note"><Info size={15} aria-hidden="true" /><span><strong>Note:</strong> Subjects are already created in Subject Management. Here you can create syllabus content and upload syllabus documents for each existing subject.</span></p>}
    {batch && <BatchDialog mode={batch.mode} rows={batch.subjects} onClose={() => setBatch('')} onBatch={onBatch} onBatchComplete={onBatchComplete} />}
  </section>
}

function SubjectDocument({ file, extra, canOpen, onOpen, onMore }) {
  const name = file.fileName || file.FileName || file.name || 'Document'
  const size = file.fileSize ?? file.FileSize
  const extension = name.split('.').pop()?.toLowerCase()
  const Icon = ['xls', 'xlsx', 'csv', 'ods'].includes(extension) ? FileSpreadsheet : FileText
  const content = <><Icon size={20} data-format={extension} aria-hidden="true" /><span><strong>{name}</strong>{size != null && <small>({formatFileSize(size)})</small>}</span></>
  return <div className="syllabus-table-document">{canOpen ? <button className="syllabus-table-file" type="button" onClick={() => onOpen(file)}>{content}</button> : <span className="syllabus-table-file">{content}</span>}{extra > 0 && <button type="button" className="syllabus-table-more-files" aria-label={'View ' + extra + ' more documents'} onClick={onMore}>+{extra}</button>}</div>
}

const operationLabels = { create: 'Create Syllabus (Batch)', upload: 'Upload Syllabus (Batch)', download: 'Download All', publish: 'Publish Selected' }

function BatchDialog({ mode, rows, onClose, onBatch, onBatchComplete }) {
  const [entries, setEntries] = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const [running, setRunning] = useState(false)
  const inProgress = useRef(false)
  const [results, setResults] = useState({})
  const title = operationLabels[mode]
  const update = (id, change) => {
    setEntries(current => ({ ...current, [id]: { ...current[id], ...change } }))
    setConfirmed(false)
  }
  const validation = row => {
    const entry = entries[row.id]
    if (mode === 'upload') return entry?.files?.length ? entry.files.map(file => validateSyllabusFile(file, SYLLABUS_MAX_FILE_SIZE)).filter(Boolean).join(' ') : 'Choose at least one file'
    if (mode === 'create') return entry?.title?.trim() ? '' : 'Enter a title'
    return ''
  }
  const submit = async event => {
    event.preventDefault()
    if (!confirmed || inProgress.current || rows.some(row => validation(row))) return
    inProgress.current = true
    setRunning(true)
    try {
      for (const row of rows) {
        if (results[row.id]?.ok) continue
        setResults(current => ({ ...current, [row.id]: { message: 'Processing…' } }))
        try {
          await onBatch(mode, row, entries[row.id], (file, position, percent) => setResults(current => ({ ...current, [row.id]: { message: file + ' (' + position + '/' + entries[row.id].files.length + '): ' + Math.round(percent) + '%' } })))
          setResults(current => ({ ...current, [row.id]: { ok: true, message: 'Completed' } }))
        } catch (error) {
          setResults(current => ({ ...current, [row.id]: { ok: false, message: error.message || 'Failed' } }))
        }
      }
    } finally {
      if (mode !== 'download') await onBatchComplete()
      inProgress.current = false
      setRunning(false)
    }
  }
  return <div className="syllabus-modal-backdrop"><section className="syllabus-modal" role="dialog" aria-modal="true" aria-label={title}>
    <header className="syllabus-modal__header"><div><h2>{title}</h2></div><button type="button" className="syllabus-icon-button" disabled={running} aria-label="Close batch dialog" onClick={onClose}><X size={18} /></button></header>
    <form className="syllabus-form" onSubmit={submit}>
      <ul className="syllabus-batch-list">{rows.map(row => <li key={row.id}>
        <div><strong>{row.name}</strong><small>{row.code}</small></div>
        {mode === 'create' && <div><label className="syllabus-field"><span>Syllabus title</span><input required maxLength={160} value={entries[row.id]?.title || ''} disabled={running || results[row.id]?.ok} onChange={event => update(row.id, { title: event.target.value })} /></label><label className="syllabus-field"><span>Description</span><textarea maxLength={2000} value={entries[row.id]?.description || ''} disabled={running || results[row.id]?.ok} onChange={event => update(row.id, { description: event.target.value })} /></label></div>}
        {mode === 'upload' && <label className="syllabus-field"><span>Document for {row.code}</span><input type="file" multiple accept={SYLLABUS_ACCEPT} disabled={running || results[row.id]?.ok} onChange={event => update(row.id, { files: Array.from(event.target.files || []) })} />{entries[row.id]?.file && <small>{entries[row.id].file.name} • {formatFileSize(entries[row.id].file.size)} • Mapped to {row.code}</small>}</label>}
        <span role="status">{results[row.id]?.message || validation(row) || 'Ready'}</span>
      </li>)}</ul>
      <label><input type="checkbox" checked={confirmed} disabled={running} onChange={event => setConfirmed(event.target.checked)} /> {mode === 'upload' ? 'I confirm each file is mapped to the correct subject.' : 'I confirm the listed subjects.'}</label>
      <footer className="syllabus-modal__footer"><button type="button" className="syllabus-btn syllabus-btn--quiet" disabled={running} onClick={onClose}>{Object.keys(results).length ? 'Close' : 'Cancel'}</button><button type="submit" className="syllabus-btn syllabus-btn--primary" disabled={!confirmed || running || rows.every(row => results[row.id]?.ok) || rows.some(row => validation(row))}><FileText size={15} />{running ? 'Processing…' : title}</button></footer>
    </form>
  </section></div>
}
