import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, Download, FileText, RefreshCw, Search } from 'lucide-react'
import { syllabusApi } from '../../services/syllabusApi.js'
import { selectedCollegeId } from '../../utils/collegeScope.js'
import './SyllabusPortalView.css'

const field = (row, ...keys) => {
  for (const key of keys) {
    const value = row?.[key] ?? row?.[key[0]?.toUpperCase() + key.slice(1)]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return ''
}
const docsFor = row => {
  const docs = field(row, 'documents', 'files', 'attachments')
  return Array.isArray(docs) ? docs : []
}
const isPublished = row => String(field(row, 'status', 'publicationStatus')).toLowerCase() === 'published'
const date = value => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed)
}
const errorText = error => error?.status === 404
  ? 'This syllabus document is no longer available. Refresh the library and try again.'
  : error?.status === 403
    ? 'Your account cannot view these syllabus documents.'
    : error?.status === 401
      ? 'Your session has expired. Sign in again.'
      : error?.message || 'Syllabus documents could not be loaded.'

export default function SyllabusPortalView({ role }) {
  const collegeId = selectedCollegeId()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await syllabusApi.listPublished({ collegeId })
      setRecords(rows.filter(isPublished))
    } catch (reason) {
      setRecords([])
      setError(errorText(reason))
    } finally { setLoading(false) }
  }, [collegeId])
  useEffect(() => { load() }, [load])

  const download = async document => {
    const id = field(document, 'documentId', 'id', 'fileId')
    if (!id) return
    setDownloading(String(id))
    try {
      const { blob } = await syllabusApi.downloadDocument(id, { collegeId, portal: true })
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = field(document, 'fileName', 'originalFileName', 'name') || 'syllabus-document'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (reason) { setError(errorText(reason)) }
    finally { setDownloading('') }
  }
  const visible = records.filter(row => [field(row, 'title', 'syllabusTitle'), field(row, 'courseName'), field(row, 'branchName'), field(row, 'semesterName')].join(' ').toLowerCase().includes(search.trim().toLowerCase()))

  return <section className="portal-card syllabus-portal-library" aria-labelledby="portal-syllabus-title">
    <header className="portal-section-heading">
      <div><h1 id="portal-syllabus-title">Published syllabus library</h1><p>Documents shared with your assigned courses and semesters.</p></div>
      <button type="button" className="portal-syllabus-refresh" onClick={load} disabled={loading} aria-label="Refresh syllabus library"><RefreshCw size={16} /> Refresh</button>
    </header>
    <label className="portal-syllabus-search"><Search size={16} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search published syllabi" aria-label="Search published syllabi" /></label>
    {error && <p className="portal-feedback error" role="alert">{error} <button type="button" onClick={load}>Retry</button></p>}
    {loading ? <p role="status">Loading published syllabi…</p> : !error && !visible.length
      ? <div className="portal-syllabus-empty"><BookOpenCheck size={25} /><strong>{records.length ? 'No syllabi match your search' : 'No published syllabi available'}</strong><span>{records.length ? 'Try another search.' : 'Published course documents will appear here when your college shares them.'}</span></div>
      : <div className="portal-syllabus-list">{visible.map((record, index) => {
        const documents = docsFor(record)
        return <article className="portal-syllabus-record" key={field(record, 'syllabusId', 'id') || index}>
          <div className="portal-syllabus-record__heading"><span><FileText size={18} /></span><div><strong>{field(record, 'title', 'syllabusTitle', 'name') || 'Semester syllabus'}</strong><small>{field(record, 'courseName', 'programName')} {field(record, 'branchName') ? '· ' + field(record, 'branchName') : ''} · {field(record, 'semesterName') || 'Semester'}</small></div><span className="portal-syllabus-published">Published</span></div>
          <div className="portal-syllabus-record__meta"><span>Version {field(record, 'version', 'versionNumber') || '1.0'}</span><span>Effective {date(field(record, 'effectiveDate', 'publishedAt'))}</span><span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span></div>
          {field(record, 'description') && <p className="portal-syllabus-record__description">{field(record, 'description')}</p>}
          {documents.length > 0 && <ul>{documents.map((document, documentIndex) => {
            const id = String(field(document, 'documentId', 'id', 'fileId') || documentIndex)
            const name = field(document, 'fileName', 'originalFileName', 'name') || 'Syllabus document'
            return <li key={id}><span><FileText size={15} />{name}</span><button type="button" onClick={() => download(document)} disabled={downloading === id} aria-label={'Download ' + name}>{downloading === id ? 'Preparing…' : <><Download size={15} /> Download</>}</button></li>
          })}</ul>}
        </article>
      })}</div>}
    <span className="portal-syllabus-role-note">Showing published documents available to this {role} account.</span>
  </section>
}
