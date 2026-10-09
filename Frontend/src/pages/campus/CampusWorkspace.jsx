import { useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { FiPlus, FiSearch, FiFileText } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import TablePagination from '../../components/TablePagination'
import { useAcademic } from '../../context/AcademicContext'
import { getUserRole } from '../../auth/auth'
import { ROLES } from '../../auth/roles'
import { campusModules, validateCampusDraft } from './campusModules'
import './CampusWorkspace.css'

export default function CampusWorkspace({ module }) {
  const { selectedCollegeId, selectedAcademicYearId } = useAcademic()
  return <DashboardLayout><Workspace key={`${module}:${selectedCollegeId}:${selectedAcademicYearId}`} module={module} collegeId={selectedCollegeId} /></DashboardLayout>
}

function Workspace({ module, collegeId }) {
  const definition = campusModules[module]
  const [params] = useSearchParams()
  const area = definition.areas.find(item => item.key === params.get('tab')) || definition.areas[0]
  const admin = getUserRole() === ROLES.ADMIN
  const [drafts, setDrafts] = useState({})
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleting, setDeleting] = useState(null)
  const records = drafts[area.key] || []
  const filtered = records.filter(row => status !== 'official' && Object.values(row.values).some(value => String(value).toLowerCase().includes(query.toLowerCase().trim())))
  const reset = () => { setQuery(''); setStatus('all'); setPage(1); setEditor(null); setDetail(null); setError(''); setNotice(''); setDeleting(null) }
  function save(event) {
    event.preventDefault()
    const values = Object.fromEntries(Object.entries(editor.values).map(([key, value]) => [key, String(value).trim()]))
    const validation = validateCampusDraft(area, values)
    const duplicate = area.key === 'copies' && records.some(row => row.id !== editor.id && (row.values.accession.toLowerCase() === values.accession?.toLowerCase() || row.values.barcode.toLowerCase() === values.barcode?.toLowerCase()))
    if (validation || duplicate) { setError(validation || 'Accession number and barcode must be unique among these drafts.'); return }
    const record = { id: editor.id || crypto.randomUUID(), values }
    setDrafts(previous => ({ ...previous, [area.key]: editor.id ? records.map(row => row.id === editor.id ? record : row) : [...records, record] }))
    setEditor(null); setError(''); setQuery(''); setStatus('all'); setPage(1)
    setNotice('Draft prepared for review. It has not been submitted and will be cleared when you leave this page or change academic context.')
  }
  return <div className="campus-workspace">
    <PageHeader breadcrumb={['Campus Services', definition.title]} title={definition.title} subtitle={definition.subtitle} />
    <div className="campus-notice"><FiFileText aria-hidden="true" /><span>{module === 'results' ? 'Published institutional results are not connected yet. Official grades and marks memos will be shown only after publication is available.' : 'Planning workspace · Drafts stay on this page only. Institutional records and submission are not connected yet.'}</span></div>
    <nav className="campus-tabs" aria-label={`${definition.title} sections`}>
      {definition.areas.map(item => <NavLink key={item.key} to={`/${module}?tab=${item.key}`} onClick={reset} className={area.key === item.key ? 'is-selected' : ''} aria-current={area.key === item.key ? 'page' : undefined}>{item.label}</NavLink>)}
    </nav>
    <div className="campus-summary">
      <div><span>Workspace</span><strong>{area.label}</strong></div>
      <div><span>{module === 'results' ? 'Publication' : 'Institutional records'}</span><strong>Not connected</strong></div>
      <div><span>{module === 'results' ? 'Grading policy' : 'Drafts on this page'}</span><strong>{module === 'results' ? 'Institution approved only' : records.length}</strong></div>
    </div>
    {notice && <p className="campus-notice" role="status">{notice}</p>}
    {!collegeId && <p className="campus-notice">Select a college from the sidebar to prepare drafts.</p>}
    {editor ? <section className="campus-panel">
      <h2>{editor.id ? 'Edit' : 'Prepare'} {area.label.toLowerCase()} draft</h2>
      <p className="campus-muted">Review the details below. This form does not create an institutional record.</p>
      <form onSubmit={save}>
        <div className="campus-form">
          {area.fields.map(field => <label key={field.key}>{field.label}{field.required ? ' *' : ''}
            {field.type === 'select' ? <select required={field.required} value={editor.values[field.key] || ''} onChange={e => setEditor({ ...editor, values: { ...editor.values, [field.key]: e.target.value } })}><option value="">Select {field.label.toLowerCase()}</option>{field.options.map(option => <option key={option}>{option}</option>)}</select>
              : field.type === 'textarea' ? <textarea required={field.required} maxLength={4000} value={editor.values[field.key] || ''} onChange={e => setEditor({ ...editor, values: { ...editor.values, [field.key]: e.target.value } })} />
                : <input type={field.type} required={field.required} min={field.type === 'number' ? 1 : undefined} step={field.type === 'number' ? 1 : undefined} maxLength={250} value={editor.values[field.key] || ''} onChange={e => setEditor({ ...editor, values: { ...editor.values, [field.key]: e.target.value } })} />}
          </label>)}
        </div>
        {error && <p role="alert" className="campus-error">{error}</p>}
        <div className="campus-actions"><button className="erp-btn erp-btn--secondary" type="button" onClick={() => { setEditor(null); setError('') }}>Cancel</button><button className="erp-btn erp-btn--primary" type="submit">Keep draft on this page</button></div>
      </form>
    </section> : detail ? <section className="campus-panel">
      <div className="campus-panel-heading"><h2>Draft details</h2><button className="erp-btn erp-btn--secondary" onClick={() => setDetail(null)}>Back to list</button></div>
      <p className="campus-muted">Unsubmitted draft · Not an institutional record</p>
      <dl className="campus-form">{area.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{detail.values[field.key] || '—'}</dd></div>)}</dl>
    </section> : <section className="campus-panel">
      <div className="campus-panel-heading"><div><h2>{area.label}</h2><p className="campus-muted">{area.description || (module === 'results' ? 'Only approved and published institutional records belong in this view.' : 'Review records and prepare details for your institution.')}</p></div>
        {admin && area.fields.length > 0 && <button disabled={!collegeId} className="erp-btn erp-btn--primary" onClick={() => { setEditor({ values: {} }); setError(''); setNotice('') }}><FiPlus /> Prepare draft</button>}
      </div>
      <div className="campus-filters"><label><span>Search {area.label.toLowerCase()}</span><div className="campus-search"><FiSearch aria-hidden="true" /><input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder={module === 'results' ? 'Student, roll number or subject' : 'Search by name or reference'} /></div></label>
        <label>Record type<select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="all">All records</option>{module !== 'results' && <option value="draft">Page drafts</option>}<option value="official">Institutional records</option></select></label>
        <button className="erp-btn erp-btn--secondary" onClick={() => { setQuery(''); setStatus('all'); setPage(1) }}>Reset filters</button>
      </div>
      {deleting && <div className="campus-notice" role="alert"><span>Remove this unsubmitted draft?</span><button className="erp-btn erp-btn--secondary" onClick={() => setDeleting(null)}>Keep</button><button className="erp-btn erp-btn--secondary" onClick={() => { setDrafts(previous => ({ ...previous, [area.key]: records.filter(row => row.id !== deleting) })); setDeleting(null); setPage(1) }}>Remove draft</button></div>}
      <div className="campus-table"><table><caption className="campus-muted">{filtered.length} page drafts · Institutional records unavailable</caption><thead><tr>{area.columns.map(column => <th key={column}>{column}</th>)}{area.fields.length > 0 && <><th>Status</th><th>Actions</th></>}</tr></thead><tbody>
        {filtered.slice((page - 1) * 10, page * 10).map(row => <tr key={row.id}>{area.fields.slice(0, area.columns.length).map(field => <td key={field.key}>{row.values[field.key] || '—'}</td>)}<td><span className="campus-badge">Unsubmitted draft</span></td><td><div className="campus-actions"><button onClick={() => setDetail(row)}>View</button>{admin && <><button onClick={() => setEditor(row)}>Edit</button><button onClick={() => setDeleting(row.id)}>Remove</button></>}</div></td></tr>)}
      </tbody></table></div>
      {!filtered.length && <EmptyState title={query || status !== 'all' ? 'No matching records' : `No ${area.label.toLowerCase()} to display`} message={module === 'results' ? 'Published results are not yet available in this portal. Contact the examination office for your official statement.' : records.length ? 'Try another search or reset the filters.' : area.fields.length && admin ? 'Prepare a draft to review the details here. Submission will be available when institutional services are connected.' : 'Institutional records will appear here once this service is connected.'} />}
      <TablePagination page={page} totalPages={Math.ceil(filtered.length / 10)} onPageChange={setPage} />
    </section>}
  </div>
}
