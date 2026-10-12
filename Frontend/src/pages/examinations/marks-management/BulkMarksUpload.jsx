import { useMemo, useState } from 'react'
import { FiFileText, FiSearch, FiUploadCloud, FiX } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import EmptyState from '../../../components/EmptyState'
import './BulkMarksUpload.css'

const PAGE_SIZE = 10
const normalized = value => String(value ?? '').trim().toLowerCase()

const countDelimiter = (line, delimiter) => {
  let count = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index += 1
      else quoted = !quoted
    } else if (!quoted && line[index] === delimiter) count += 1
  }
  return count
}

const parseDelimitedFile = (text, filename) => {
  const source = text.replace(/^\uFEFF/, '')
  if (!source.trim()) throw new Error('The selected file is empty.')

  const extension = filename.split('.').pop()?.toLowerCase()
  const sample = source.split(/\r?\n/, 1)[0]
  const delimiter = extension === 'tsv'
    ? '\t'
    : [',', '\t', ';'].sort((left, right) => countDelimiter(sample, right) - countDelimiter(sample, left))[0]
  const matrix = []
  let record = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else quoted = !quoted
    } else if (!quoted && character === delimiter) {
      record.push(cell)
      cell = ''
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      record.push(cell)
      matrix.push(record)
      record = []
      cell = ''
    } else cell += character
  }
  if (cell.length || record.length) {
    record.push(cell)
    matrix.push(record)
  }

  const nonEmptyRows = matrix.filter(row => row.some(value => String(value).trim()))
  if (!nonEmptyRows.length) throw new Error('The selected file does not contain a header row.')

  const headerRow = nonEmptyRows[0]
  const usedKeys = new Map()
  const columns = headerRow.map((value, index) => {
    const label = String(value).trim() || `Column ${index + 1}`
    const base = label.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `column_${index + 1}`
    const occurrence = (usedKeys.get(base) || 0) + 1
    usedKeys.set(base, occurrence)
    const key = `field_${index}_${base}${occurrence > 1 ? `_${occurrence}` : ''}`
    return { key, value: key, label }
  })

  const rows = nonEmptyRows.slice(1).map((values, index) => ({
    __bulkRowId: `upload-row-${index}`,
    ...Object.fromEntries(columns.map((column, columnIndex) => [column.key, String(values[columnIndex] ?? '').trim()])),
  }))
  return { columns, rows }
}

export default function BulkMarksUpload() {
  const [fileName, setFileName] = useState('')
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [fileError, setFileError] = useState('')
  const [reading, setReading] = useState(false)
  const [query, setQuery] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => rows.filter(row => {
    const searchText = query.trim().toLowerCase()
    const searchMatches = !searchText || columns.some(column => normalized(row[column.key]).includes(searchText))
    const valueText = filterValue.trim().toLowerCase()
    const filterColumns = filterColumn ? columns.filter(column => column.key === filterColumn) : columns
    const valueMatches = !valueText || filterColumns.some(column => normalized(row[column.key]).includes(valueText))
    return searchMatches && valueMatches
  }), [rows, columns, query, filterColumn, filterValue])
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = Boolean(query || filterColumn || filterValue)

  const uploadFile = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileError('')
    setReading(true)
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!['csv', 'tsv', 'txt'].includes(extension)) throw new Error('Choose a CSV, TSV, or TXT file. Excel workbooks are not supported yet; save the sheet as CSV first.')
      const parsed = parseDelimitedFile(await file.text(), file.name)
      setColumns(parsed.columns)
      setRows(parsed.rows)
      setFileName(file.name)
      setQuery('')
      setFilterColumn('')
      setFilterValue('')
      setPage(1)
    } catch (error) {
      setFileError(error.message || 'Could not read this file. Check that it is a valid CSV or TSV.')
    } finally {
      setReading(false)
    }
  }

  const clearPreview = () => {
    setFileName('')
    setColumns([])
    setRows([])
    setQuery('')
    setFilterColumn('')
    setFilterValue('')
    setPage(1)
    setFileError('')
  }
  const clearFilters = () => {
    setQuery('')
    setFilterColumn('')
    setFilterValue('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <section className="marks-management-bulk-marks-upload">
        <PageHeader title="Bulk Marks Upload" breadcrumb={[{ label: 'Marks Management', link: '/marks-management' }, 'Bulk Marks Upload']} />
        <MarksModuleNav />

        <article className="erp-card bulk-marks-upload-card">
          <header className="erp-card-header bulk-marks-upload-card__header">
            <div>
              <h2 className="erp-card-title">Upload Marks File</h2>
              <p className="erp-card-subtitle">Upload a CSV, TSV, or TXT file to preview its rows before importing.</p>
            </div>
            {fileName && <button type="button" className="erp-btn erp-btn--secondary bulk-marks-upload-clear" onClick={clearPreview}><FiX /> Clear file</button>}
          </header>

          <label className={`bulk-marks-upload-dropzone${reading ? ' is-reading' : ''}`}>
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={uploadFile} disabled={reading} />
            <span className="bulk-marks-upload-dropzone__icon"><FiUploadCloud /></span>
            <span className="bulk-marks-upload-dropzone__text"><strong>{reading ? 'Reading file…' : fileName || 'Choose a marks file'}</strong><small>{reading ? 'Parsing rows and columns' : 'CSV / TSV / TXT · First row should contain column headings'}</small></span>
            <span className="erp-btn erp-btn--primary bulk-marks-upload-browse">Browse files</span>
          </label>
          {fileError && <p className="bulk-marks-upload-error" role="alert">{fileError}</p>}
          {fileName && !fileError && <p className="bulk-marks-upload-status" role="status"><FiFileText /> Loaded {rows.length} data {rows.length === 1 ? 'row' : 'rows'} and {columns.length} columns from {fileName}.</p>}
        </article>

        <article className="erp-card bulk-marks-preview-card">
          <header className="erp-card-header bulk-marks-preview-card__header">
            <div><h2 className="erp-card-title">Uploaded Data</h2><p className="erp-card-subtitle">{fileName ? `${filteredRows.length} of ${rows.length} rows shown` : 'Upload a file to preview its data in a table.'}</p></div>
          </header>

          <FilterPanel
            active={hasFilters}
            onClear={clearFilters}
            className="bulk-marks-preview-filters"
            actions={<ExportMenu rows={filteredRows} columns={columns} title="Bulk Marks Upload" filename="bulk-marks-upload" scope="All matching rows" allowEmpty />}
          >
            <div className="bulk-marks-search-wrap"><label className="bulk-marks-search"><FiSearch aria-hidden="true" /><input type="search" aria-label="Search uploaded marks" placeholder="Search uploaded data" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /></label></div>
            <label className="bulk-marks-filter"><span>Column</span><select value={filterColumn} onChange={event => { setFilterColumn(event.target.value); setPage(1) }}><option value="">All columns</option>{columns.map(column => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
            <label className="bulk-marks-filter"><span>Value contains</span><input type="search" placeholder="Enter a value" value={filterValue} onChange={event => { setFilterValue(event.target.value); setPage(1) }} /></label>
          </FilterPanel>

          {columns.length > 0 && (
            <div className="bulk-marks-table-wrap">
              <table className="erp-table bulk-marks-table">
                <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.__bulkRowId}>{columns.map(column => <td key={column.key}>{row[column.key] || '—'}</td>)}</tr>)}</tbody>
              </table>
              {filteredRows.length === 0 && <EmptyState title="No matching rows" description="Adjust or clear the filters to see more uploaded data." />}
            </div>
          )}
          {columns.length === 0 && <EmptyState title="No file uploaded" description="Choose a CSV, TSV, or TXT file above to display its contents here." />}
          {filteredRows.length > PAGE_SIZE && <TablePagination currentPage={page} totalPages={Math.ceil(filteredRows.length / PAGE_SIZE)} onPageChange={setPage} />}
        </article>
      </section>
    </DashboardLayout>
  )
}
