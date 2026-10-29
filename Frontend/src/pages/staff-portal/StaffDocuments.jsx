import { useEffect, useState } from 'react'
import { FiFileText, FiUpload, FiDownload, FiEye, FiSearch, FiPlus, FiCheckCircle, FiClock } from 'react-icons/fi'
import { getAuthStorage } from '../../auth/auth.js'
import { Field, PortalDialog, Feedback } from '../../components/portals/PortalUI.jsx'
import { documentCategories, validateDocument, documentFile } from './staffDocumentsStore.js'
import './staff-documents.css'

const sampleDocuments = [
  { id: 'sample-appointment', title: 'Appointment letter', category: 'Employment', date: '2024-06-10', status: 'Issued', issuer: 'Human Resources', description: 'Appointment terms, designation and reporting department.', sample: true },
  { id: 'sample-payslip', title: 'September 2026 payslip', category: 'Payroll', date: '2026-10-01', status: 'Issued', issuer: 'Accounts Department', description: 'Monthly payroll statement. Request an official copy from Accounts.', sample: true },
  { id: 'sample-service', title: 'Service confirmation letter', category: 'Service records', date: '2026-07-12', status: 'Issued', issuer: 'Administration', description: 'Confirmation of employment and service period.', sample: true },
  { id: 'sample-training', title: 'Workplace safety training', category: 'Certificates', date: '2026-08-18', status: 'Issued', issuer: 'Campus Safety Office', description: 'Certificate for laboratory and workplace safety orientation.', sample: true },
  { id: 'sample-id', title: 'Employee ID acknowledgement', category: 'Identity', date: '2024-06-12', status: 'Issued', issuer: 'Administration', description: 'Acknowledgement of employee identity card issuance.', sample: true },
  { id: 'sample-policy', title: 'Duty allocation order', category: 'Service records', date: '2026-10-01', status: 'Issued', issuer: 'Department Office', description: 'Department assignment and operational responsibilities for this term.', sample: true },
]
const dateToday = () => new Date().toLocaleDateString('en-CA')
function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function Preview({ item, fileKey, onClose }) {
  const [url, setUrl] = useState(''), [error, setError] = useState('')
  useEffect(() => {
    let active = true, objectUrl = ''
    if (!item.sample) documentFile('get', fileKey).then(blob => {
      if (!blob) throw new Error('The uploaded file is no longer available in this browser.')
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [item, fileKey])
  return <PortalDialog title={item.title} onClose={onClose}><dl className="sd-details">{[['Category', item.category], ['Date', item.date], ['Status', item.status], ['Issued / uploaded by', item.issuer]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{item.sample ? <div className="sd-sample-preview"><FiFileText /><h3>Sample document record</h3><p>{item.description}</p><p>This preview contains sample metadata. The original official document is not connected.</p></div> : error ? <Feedback error={error} /> : !url ? <p role="status">Preparing document preview...</p> : item.type === 'application/pdf' ? <iframe className="sd-preview" src={url} title={item.title} /> : <img className="sd-preview-image" src={url} alt={item.title} />}<div className="portal-actions"><button onClick={onClose}>Close</button></div></PortalDialog>
}
export default function StaffDocuments() {
  const storage = getAuthStorage(), identity = `${storage?.getItem('btech-user-college-id') || 'college'}:${storage?.getItem('btech-user-id') || storage?.getItem('btech-user-name') || 'staff'}`
  const key = `staff-documents:${identity}`
  const [state, setState] = useState(() => { try { const stored = JSON.parse(localStorage.getItem(key)); return stored && Array.isArray(stored.documents) && Array.isArray(stored.requests) ? stored : { documents: sampleDocuments, requests: [] } } catch { return { documents: sampleDocuments, requests: [] } } })
  const [tab, setTab] = useState('documents'), [query, setQuery] = useState(''), [category, setCategory] = useState('All'), [status, setStatus] = useState('All'), [page, setPage] = useState(1), [size, setSize] = useState(5)
  const [modal, setModal] = useState(''), [selected, setSelected] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const blank = { title: '', category: 'Certificates', description: '' }, [form, setForm] = useState(blank), [file, setFile] = useState(null)
  const save = next => { localStorage.setItem(key, JSON.stringify(next)); setState(next) }
  const filtered = (tab === 'documents' ? state.documents : state.requests).filter(row => (category === 'All' || row.category === category) && (status === 'All' || row.status === status) && `${row.title} ${row.category} ${row.issuer || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages), rows = filtered.slice((current - 1) * size, current * size)
  const fileKey = id => `${identity}:${id}`
  const resetFilters = () => { setQuery(''); setCategory('All'); setStatus('All'); setPage(1) }
  const open = value => { setModal(value); setForm(blank); setFile(null); setError('') }
  const upload = async event => {
    event.preventDefault(); setError('')
    const issue = validateDocument(file)
    if (issue) { setError(issue); return }
    if (!form.title.trim()) { setError('Enter a document title.'); return }
    setBusy(true)
    const id = crypto.randomUUID()
    try {
      await documentFile('put', fileKey(id), file)
      try { save({ ...state, documents: [{ ...form, title: form.title.trim(), id, date: dateToday(), status: 'Personal upload', issuer: storage?.getItem('btech-user-name') || 'You', fileName: file.name, type: file.type, bytes: file.size }, ...state.documents] }) } catch (e) { await documentFile('delete', fileKey(id)); throw e }
      setModal(''); setTab('documents'); resetFilters(); setNotice('Document saved in this browser. It has not been sent for HR verification.')
    } catch { setError('Unable to save the document. Check browser storage and try again.') } finally { setBusy(false) }
  }
  const getDownload = async item => {
    setError('')
    try {
      if (item.sample) { download(new Blob([`SAMPLE DOCUMENT RECORD\n\n${item.title}\nCategory: ${item.category}\nDate: ${item.date}\nIssuer: ${item.issuer}\n\n${item.description}\n\nThis is sample metadata, not an official document.`], { type: 'text/plain' }), `${item.id}.txt`); setNotice('Downloaded sample record details. Original official files are not connected.'); return }
      const blob = await documentFile('get', fileKey(item.id)); if (!blob) throw Error('File not found in this browser. Please upload it again.'); download(blob, item.fileName)
    } catch (e) { setError(e.message) }
  }
  return <main className="sd-page"><header className="sd-heading"><div><p className="sd-eyebrow">STAFF PORTAL / PERSONAL RECORDS</p><h1>My Documents</h1><p>Your employment records, payroll statements and professional certificates.</p></div><div className="sd-summary">{[['Documents', state.documents.length], ['Issued samples', state.documents.filter(r => r.sample).length], ['My uploads', state.documents.filter(r => !r.sample).length], ['Draft requests', state.requests.length]].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></header>
    <div className="sd-local-note">Sample official records and personal uploads are stored locally for this account. HR document services are not connected.</div><Feedback error={!modal ? error : ''} notice={notice} />
    <section className="sd-card"><header className="sd-directory-header"><div className="sd-tabs" role="group" aria-label="Document views"><button aria-pressed={tab === 'documents'} onClick={() => { setTab('documents'); resetFilters() }}>Document library</button><button aria-pressed={tab === 'requests'} onClick={() => { setTab('requests'); resetFilters() }}>My requests <span>{state.requests.length}</span></button></div><div className="sd-actions"><button onClick={() => open('request')}><FiPlus /> Request document</button><button className="primary" onClick={() => open('upload')}><FiUpload /> Upload document</button></div></header>
      <div className="sd-toolbar"><label className="sd-search"><FiSearch /><input type="search" aria-label="Search documents" placeholder="Search title, category or issuer..." value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label><select aria-label="Document category" value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>{['All', ...documentCategories].map(v => <option key={v}>{v}</option>)}</select><select aria-label="Document status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>{(tab === 'documents' ? ['All', 'Issued', 'Personal upload'] : ['All', 'Draft']).map(v => <option key={v}>{v}</option>)}</select>{(query || category !== 'All' || status !== 'All') && <button onClick={resetFilters}>Clear filters</button>}</div>
      <div className="sd-table-wrap"><table><thead><tr><th>Document</th><th>Category</th><th>Date</th><th>Status</th><th>{tab === 'documents' ? 'Issuer / Owner' : 'Purpose'}</th><th>Actions</th></tr></thead><tbody>{rows.length ? rows.map(item => <tr key={item.id}><td><div className="sd-document-name"><span><FiFileText /></span><div><strong>{item.title}</strong><small>{item.sample ? 'Sample record · TXT details' : item.fileName || 'Local request draft'}</small></div></div></td><td>{item.category}</td><td>{item.date}</td><td><span className={`sd-status ${item.status === 'Issued' ? 'issued' : ''}`}>{item.status === 'Issued' ? <FiCheckCircle /> : <FiClock />}{item.status}</span></td><td>{tab === 'documents' ? item.issuer : item.description}</td><td><div className="sd-row-actions">{tab === 'documents' ? <><button aria-label={`Preview ${item.title}`} title="Preview" onClick={() => setSelected(item)}><FiEye /></button><button aria-label={`Download ${item.title}`} title={item.sample ? 'Download sample details' : 'Download file'} onClick={() => getDownload(item)}><FiDownload /></button></> : <button onClick={() => { setSelected(item); setModal('request-detail') }}>View draft</button>}</div></td></tr>) : <tr><td colSpan={6}><div className="sd-empty"><FiFileText /><strong>{tab === 'requests' ? 'No document requests' : 'No matching documents'}</strong><p>{tab === 'requests' ? 'Create a request draft for an experience letter, payslip or service certificate.' : 'Try another filter or upload a personal document.'}</p></div></td></tr>}</tbody></table></div>
      <footer className="sd-pagination"><div><label>Rows <select aria-label="Rows per page" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1) }}>{[5, 10, 20].map(v => <option key={v}>{v}</option>)}</select></label><span>{filtered.length ? (current - 1) * size + 1 : 0}–{Math.min(current * size, filtered.length)} of {filtered.length}</span></div><nav aria-label="Document pages"><button disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button><span>{current} / {pages}</span><button disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button></nav></footer>
    </section>
    {selected && !modal && <Preview item={selected} fileKey={fileKey(selected.id)} onClose={() => setSelected(null)} />}
    {modal === 'request-detail' && selected && <PortalDialog title={selected.title} onClose={() => { setModal(''); setSelected(null) }}><p><strong>Draft request · {selected.date}</strong></p><p>{selected.description}</p><p>This request is saved locally and has not been sent to HR.</p><div className="portal-actions"><button onClick={() => { setModal(''); setSelected(null) }}>Close</button></div></PortalDialog>}
    {['upload', 'request'].includes(modal) && <PortalDialog title={modal === 'upload' ? 'Upload personal document' : 'Request an official document'} onClose={() => { if (!busy) setModal('') }}><form onSubmit={modal === 'upload' ? upload : event => { event.preventDefault(); if (!form.title.trim() || !form.description.trim()) { setError('Enter a title and purpose.'); return } try { save({ ...state, requests: [{ ...form, title: form.title.trim(), id: crypto.randomUUID(), date: dateToday(), status: 'Draft' }, ...state.requests] }); setModal(''); setTab('requests'); resetFilters(); setNotice('Request draft saved locally. Contact HR to submit the official request.') } catch { setError('Unable to save this request draft.') } }}><p className="sd-dialog-note">{modal === 'upload' ? 'PDF, JPG or PNG, up to 5 MB. Personal uploads are stored in this browser.' : 'Prepare an experience letter, salary statement or employment certificate request. This saves a draft only.'}</p><Field label="Document title"><input required maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={modal === 'upload' ? 'e.g. Technical training certificate' : 'e.g. Experience certificate'} /></Field><Field label="Category"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{documentCategories.map(v => <option key={v}>{v}</option>)}</select></Field>{modal === 'upload' && <Field label="Select file"><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>}<Field label={modal === 'upload' ? 'Notes (optional)' : 'Purpose of request'}><textarea rows={3} required={modal === 'request'} maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field><Feedback error={error} /><div className="portal-actions"><button type="button" disabled={busy} onClick={() => setModal('')}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving...' : modal === 'upload' ? 'Save document' : 'Save request draft'}</button></div></form></PortalDialog>}
  </main>
}
