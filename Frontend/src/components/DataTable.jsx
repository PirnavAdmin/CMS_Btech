import { useMemo, useState } from 'react'
import TablePagination from './TablePagination'
import AsyncState from './AsyncState'
import './ScreenComponents.css'

const valueFor = (column, row) => column.sortValue ? column.sortValue(row) : column.value ? column.value(row) : row[column.key]
const compare = (left, right) => typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })

// Client-side table: pass the complete filtered rows, never a server-page slice.
// Data ownership, API calls, filtering and action permissions stay with callers.
export default function DataTable({ columns, rows, rowKey = 'id', caption, pagination, loading = false, error, onRetry, emptyState, rowActions, actionsLabel = 'Actions', actionsClassName = 'col-actions table-center', className = '', tableClassName = 'erp-table' }) {
  const [sort, setSort] = useState(null)
  const sorted = useMemo(() => {
    const column = columns.find(entry => entry.key === sort?.key && entry.sortable)
    if (!column) return rows
    return rows.map((row, index) => ({ row, index })).sort((a, b) => {
      const left = valueFor(column, a.row), right = valueFor(column, b.row)
      if (left == null && right != null) return 1
      if (right == null && left != null) return -1
      return (left == null ? 0 : compare(left, right) * (sort.direction === 'ascending' ? 1 : -1)) || a.index - b.index
    }).map(entry => entry.row)
  }, [rows, columns, sort])
  const pageSize = pagination ? Math.max(1, Number(pagination.pageSize) || 5) : Math.max(rows.length, 1)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(totalPages, Math.max(1, Number(pagination?.page) || 1))
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize)
  if (loading) return <AsyncState status="loading" title={typeof loading === 'string' ? loading : undefined} />
  if (error) return <AsyncState status="error" message={error} onRetry={onRetry} />
  if (!rows.length) return emptyState || <AsyncState status="empty" />
  return <>
    <div className={`erp-data-table erp-table-responsive ${className}`} role="region" aria-label={caption || 'Records'} tabIndex={0}>
      <table className={tableClassName}>
        {caption && <caption className="erp-visually-hidden">{caption}</caption>}
        <thead><tr>{columns.map(column => <th key={column.key} scope="col" className={column.className} style={column.width ? { width: column.width } : undefined} aria-sort={column.sortable ? sort?.key === column.key ? sort.direction : 'none' : undefined}>
          {column.sortable ? <button type="button" className="erp-data-table__sort" onClick={() => {
            setSort({ key: column.key, direction: sort?.key === column.key && sort.direction === 'ascending' ? 'descending' : 'ascending' })
            pagination?.onPageChange(1)
          }}>{column.label}<span aria-hidden="true">{sort?.key === column.key ? sort.direction === 'ascending' ? ' ↑' : ' ↓' : ' ↕'}</span></button> : column.label}
        </th>)}{rowActions && <th scope="col" className={actionsClassName}>{actionsLabel}</th>}</tr></thead>
        <tbody>{visible.map(row => <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey]}>{columns.map(column => <td key={column.key} className={column.className}>{column.render ? column.render(row) : column.value ? column.value(row) : row[column.key]}</td>)}{rowActions && <td className={actionsClassName}>{rowActions(row)}</td>}</tr>)}</tbody>
      </table>
    </div>
    {pagination && <div className="erp-table-pagination-wrap"><TablePagination page={page} totalPages={totalPages} onPageChange={pagination.onPageChange} /></div>}
  </>
}
