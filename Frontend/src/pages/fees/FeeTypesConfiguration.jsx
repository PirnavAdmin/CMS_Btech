import ViewDialog from '../../components/ViewDialog'
import { useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { feeConfigurationApi } from '../../api/apiEndpoints'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import FilterPanel from '../../components/FilterPanel'
import DirectoryEmptyState from '../../components/DirectoryEmptyState'

export default function FeeTypesConfiguration() {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [query, setQuery] = useState(''), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setRows([]); setDetail(null); setCode('')
    feeConfigurationApi.categories().then(categories => {
      if (active) setRows(categories)
    }).catch(reason => { if (active) setError(reason.message || 'Unable to load fee types.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const [code, setCode] = useState(''), [detail, setDetail] = useState(null)
  const filtered = rows.filter(row => (!code || row.code === code) && [row.code, row.name, row.description].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), current = Math.min(page, pages)
  return <section className="fm-fee-types">
    <PageHeader title="Fee Types" subtitle="Active fee types shared across colleges and available for fee structures." />
    <p id="fee-type-create-availability">Adding fee types requires backend support for saving to the shared fee type catalog.</p>
    <FilterPanel
      className="fm-fee-types-filters"
      active={Boolean(code)}
      onClear={() => { setCode(''); setQuery(''); setPage(1) }}
      actions={<div className="fm-list-toolbar-actions">
        <ExportMenu rows={filtered} columns={[{label:'Code',value:'code'},{label:'Name',value:'name'},{label:'Description',value:'description'}]} title="Fee Types" filename="fee-types" loading={loading || Boolean(error)} />
        <button type="button" className="fm-btn-context-primary" disabled aria-describedby="fee-type-create-availability">Add Fee Type</button>
      </div>}
    >
      <label className="course-search fm-fee-types-search"><FiSearch aria-hidden="true" /><input aria-label="Search fee types" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search fee type, code or description..." /></label>
      <label className="fm-fee-types-code-filter">Category code<select aria-label="Filter by category code" value={code} onChange={event => { setCode(event.target.value); setPage(1) }}><option value="">All codes</option>{[...new Set(rows.map(row => row.code).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
    </FilterPanel>
    <div className="fm-table-wrap">
      <table className="fm-table" aria-label="Fee types">
        <thead><tr><th>Code</th><th>Fee Type</th><th>Description</th><th>Details</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={4}><span role="status">Loading fee types...</span></td></tr>
            : error ? <tr><td colSpan={4}><div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry fee types</button></div></td></tr>
            : !filtered.length ? <tr><td colSpan={4}><DirectoryEmptyState title="No fee types found." /></td></tr>
            : filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(row => (
              <tr key={row.id}>
                <td>{row.code}</td><td>{row.name}</td><td>{row.description || '—'}</td>
                <td><button type="button" aria-label={`View ${row.name}`} onClick={() => setDetail(row)}>View</button></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
    {!loading && !error && filtered.length > 0 && <TablePagination page={current} totalPages={pages} onPageChange={setPage} />}
    {detail && <ViewDialog title={detail.name} onClose={()=>setDetail(null)} showExport={false}><dl><dt>Code</dt><dd>{detail.code || '—'}</dd><dt>Description</dt><dd>{detail.description || '—'}</dd></dl></ViewDialog>}
  </section>
}
