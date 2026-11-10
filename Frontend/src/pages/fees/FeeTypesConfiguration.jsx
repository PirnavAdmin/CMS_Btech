import ViewDialog from '../../components/ViewDialog'
import { useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { useAcademic } from '../../context/AcademicContext'
import { feeConfigurationApi } from '../../api/apiEndpoints'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import FilterPanel from '../../components/FilterPanel'
import FeeWorkspaceTabs from './FeeWorkspaceTabs'

export default function FeeTypesConfiguration({ feeManagementTabs = [] }) {
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
    <FeeWorkspaceTabs tabs={feeManagementTabs} />
    <FilterPanel
      className="fm-fee-types-filters"
      active={Boolean(code)}
      onClear={() => { setCode(''); setQuery(''); setPage(1) }}
      actions={<ExportMenu rows={filtered} columns={[{label:'Code',value:'code'},{label:'Name',value:'name'},{label:'Description',value:'description'}]} title="Fee Types" filename="fee-types" loading={loading || Boolean(error)} />}
    >
      <label className="course-search fm-fee-types-search"><FiSearch aria-hidden="true" /><input aria-label="Search fee types" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search fee type, code or description..." /></label>
      <label className="fm-fee-types-code-filter">Category code<select aria-label="Filter by category code" value={code} onChange={event => { setCode(event.target.value); setPage(1) }}><option value="">All codes</option>{[...new Set(rows.map(row => row.code).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
    </FilterPanel>
    {loading ? <p role="status">Loading fee types...</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry fee types</button></div> : !filtered.length ? <p>No fee types found.</p> : <><div className="fm-table-wrap"><table className="fm-table" aria-label="Fee types"><thead><tr><th>Code</th><th>Fee Type</th><th>Description</th><th>Details</th></tr></thead><tbody>{filtered.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE).map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{row.description || '—'}</td><td><button type="button" aria-label={'View '+row.name} onClick={()=>setDetail(row)}>View</button></td></tr>)}</tbody></table></div><TablePagination page={current} totalPages={pages} onPageChange={setPage} /></>}
    {detail && <ViewDialog title={detail.name} onClose={()=>setDetail(null)} showExport={false}><dl><dt>Code</dt><dd>{detail.code || '—'}</dd><dt>Description</dt><dd>{detail.description || '—'}</dd></dl></ViewDialog>}
  </section>
}
