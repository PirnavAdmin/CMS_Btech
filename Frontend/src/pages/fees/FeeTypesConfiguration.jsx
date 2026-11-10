import ViewDialog from '../../components/ViewDialog'
import { useEffect, useState } from 'react'
import { useAcademic } from '../../context/AcademicContext'
import { feeConfigurationApi } from '../../api/apiEndpoints'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'

export default function FeeTypesConfiguration() {
  const { selectedCollegeId } = useAcademic()
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setRows([]); setDetail(null); setCode('')
    feeConfigurationApi.categories().then(result => { if (active) setRows(result) }).catch(reason => { if (active) setError(reason.message || 'Unable to load fee types.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedCollegeId, attempt])
  const [code, setCode] = useState(''), [detail, setDetail] = useState(null)
  const filtered = rows.filter(row => (!code || row.code === code) && [row.code, row.name, row.description].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), current = Math.min(page, pages)
  return <section className="fm-fee-types">
    <PageHeader title="Fee Types" subtitle="Backend fee categories available for fee structures and student assignments." />
    <div className="fm-fee-types__notice" role="status">
      <strong>Fee types are read-only</strong>
      <span>The current backend provides fee categories for viewing only. Category creation and editing need backend support.</span>
    </div>
    <section className="fm-fee-types__directory" aria-label="Fee type directory">
      <header className="fm-fee-types__directory-heading">
        <div><h2>Fee Type Directory</h2><p>{loading ? 'Loading fee types…' : `${filtered.length} ${filtered.length === 1 ? 'fee type' : 'fee types'}`}</p></div>
        <ExportMenu rows={filtered} columns={[{label:'Code',value:'code'},{label:'Name',value:'name'},{label:'Description',value:'description'}]} title="Fee Types" filename="fee-types" loading={loading || Boolean(error)} />
      </header>
      <div className="fm-fee-types__toolbar">
        <label className="fm-fee-types__search">Search fee types<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search by code, name, or description" /></label>
        <label className="fm-fee-types__category">Category code<select value={code} onChange={event => { setCode(event.target.value); setPage(1) }}><option value="">All category codes</option>{[...new Set(rows.map(row => row.code).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      {loading ? <div className="fm-fee-types__state" role="status">Loading fee types…</div> : error ? <div className="fm-fee-types__state fm-fee-types__state--error" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : !filtered.length ? <div className="fm-fee-types__state">No fee types match your search.</div> : <><div className="fm-table-wrap fm-fee-types__table-wrap"><table className="fm-table" aria-label="Fee types"><thead><tr><th>Code</th><th>Fee Type</th><th>Description</th><th>Details</th></tr></thead><tbody>{filtered.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE).map(row => <tr key={row.id}><td><span className="fm-fee-types__code">{row.code || '—'}</span></td><td><strong>{row.name || '—'}</strong></td><td>{row.description || '—'}</td><td><button type="button" aria-label={'View '+row.name} onClick={()=>setDetail(row)}>View details</button></td></tr>)}</tbody></table></div><TablePagination page={current} totalPages={pages} onPageChange={setPage} /></>}
    </section>
    {detail && <ViewDialog title={detail.name} subtitle="Fee type details" onClose={()=>setDetail(null)} showExport={false}><dl className="fm-fee-type-details"><div><dt>Category code</dt><dd>{detail.code || '—'}</dd></div><div><dt>Description</dt><dd>{detail.description || 'No description provided.'}</dd></div></dl></ViewDialog>}
  </section>
}
