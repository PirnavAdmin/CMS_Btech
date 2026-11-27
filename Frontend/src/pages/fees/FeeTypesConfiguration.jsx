import ViewDialog from '../../components/ViewDialog'
import { useEffect, useState } from 'react'
import FeeTypeCreateDialog from './FeeTypeCreateDialog'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { FiSearch, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { feeConfigurationApi } from '../../api/apiEndpoints'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import FilterPanel from '../../components/FilterPanel'
import DirectoryEmptyState from '../../components/DirectoryEmptyState'

export default function FeeTypesConfiguration() {
  const { canAction } = useScreenAccess()
  const canEdit = canAction('/fees/types', 'edit')
  const canCreate = canAction('/fees/types', 'create')

  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [detail, setDetail] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setRows([])
    setDetail(null)

    const fetchCategories = async () => {
      try {
        const data = await feeConfigurationApi.manageCategories({ includeInactive: true })
        if (active) setRows(data)
      } catch {
        try {
          const fallback = await feeConfigurationApi.categories()
          if (active) setRows(fallback)
        } catch (reason) {
          if (active) setError(reason.message || 'Unable to load fee types.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchCategories()
    return () => { active = false }
  }, [attempt])

  const handleDelete = async (row) => {
    if (!canEdit || deletingId) return
    const confirmed = window.confirm(`Are you sure you want to delete fee type "${row.name}"?`)
    if (!confirmed) return

    setDeletingId(row.id)
    setError('')
    setNotice('')
    try {
      await feeConfigurationApi.deleteCategory(row.id)
      setRows(prev => prev.filter(item => item.id !== row.id))
      setNotice(`Fee type "${row.name}" deleted successfully.`)
    } catch (err) {
      setError(err.message || `Unable to delete fee type "${row.name}".`)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = rows
    .map(row => ({
      ...row,
      id: row.id ?? row.Id ?? row.feeCategoryId ?? row.fee_category_id,
      code: String(row.code ?? row.Code ?? row.categoryCode ?? row.category_code ?? '').trim(),
      name: String(row.name ?? row.Name ?? row.categoryName ?? row.category_name ?? '').trim(),
      description: row.description ?? row.Description ?? null,
      status: Number(row.status ?? row.Status ?? 1)
    }))
    .filter(row => {
      if (!row.code && !row.name) return false
      const matchesCode = !code || row.code.toUpperCase() === code.toUpperCase()
      const matchesSearch = [row.code, row.name, row.description].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())
      return matchesCode && matchesSearch
    })

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const isFilterActive = Boolean(code || query)

  return (
    <section className="fm-fee-types">
      <PageHeader
        title="Fee Types"
        subtitle="Manage fee types, unique codes, and availability for fee structures."
      />
      {notice && <p role="status" className="fm-success-banner">{notice}</p>}

      <div className="fm-fee-types-directory">
        <FilterPanel
          className="fm-fee-types-filters"
          active={isFilterActive}
          onClear={() => { setCode(''); setQuery(''); setPage(1) }}
          actions={
            <div className="fm-list-toolbar-actions">
              <ExportMenu
                rows={filtered}
                columns={[
                  { label: 'Fee Type Code', value: 'code' },
                  { label: 'Fee Type Name', value: 'name' },
                  { label: 'Description', value: 'description' }
                ]}
                title="Fee Types"
                filename="fee-types"
                loading={loading || Boolean(error)}
              />
              {canCreate && (
                <button
                  type="button"
                  className="fm-btn-context-primary"
                  onClick={() => { setNotice(''); setAdding(true) }}
                >
                  Add Fee Type
                </button>
              )}
            </div>
          }
        >
          <label className="course-search fm-fee-types-search">
            <FiSearch aria-hidden="true" />
            <input
              aria-label="Search fee types"
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1) }}
              placeholder="Search fee type, code or description..."
            />
          </label>

          <label className="fm-fee-types-code-filter">
            Category code
            <select
              aria-label="Filter by category code"
              value={code}
              onChange={event => { setCode(event.target.value); setPage(1) }}
            >
              <option value="">All codes</option>
              {[...new Set(rows.map(row => row.code).filter(Boolean))].sort().map(value => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </FilterPanel>

        <div className="fm-table-wrap">
          <table className="fm-table" aria-label="Fee types">
            <thead>
              <tr>
                <th>Fee Type Code</th>
                <th>Fee Type Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}><span role="status">Loading fee types...</span></td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4}>
                    <div role="alert">
                      <p>{error}</p>
                      <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry fee types</button>
                    </div>
                  </td>
                </tr>
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={4}><DirectoryEmptyState title="No fee types found." /></td>
                </tr>
              ) : (
                filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(row => (
                  <tr key={row.id}>
                    <td><strong>{row.code}</strong></td>
                    <td>{row.name}</td>
                    <td>{row.description || '—'}</td>
                    <td>
                      <div className="fm-fee-type-actions">
                        <button
                          type="button"
                          title="View fee type"
                          aria-label={`View ${row.name}`}
                          onClick={() => setDetail(row)}
                        >
                          <FiEye />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              title="Edit fee type"
                              aria-label={`Edit ${row.name}`}
                              onClick={() => setEditing(row)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              title="Delete fee type"
                              aria-label={`Delete ${row.name}`}
                              disabled={deletingId === row.id}
                              onClick={() => handleDelete(row)}
                              style={{ color: 'var(--cms-red, #dc2626)' }}
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && filtered.length > 0 && (
          <TablePagination page={current} totalPages={pages} onPageChange={setPage} />
        )}
      </div>

      {detail && (
        <ViewDialog
          className="fm-fee-type-dialog"
          maxWidth="520px"
          title={detail.name}
          subtitle="Fee Type Details"
          onClose={() => setDetail(null)}
          showExport={false}
        >
          <dl className="fm-fee-type-details">
            <dt>Fee Type Code</dt>
            <dd><strong>{detail.code || '—'}</strong></dd>
            <dt>Fee Type Name</dt>
            <dd>{detail.name || '—'}</dd>
            <dt>Description</dt>
            <dd>{detail.description || '—'}</dd>
          </dl>
        </ViewDialog>
      )}

      {editing && (
        <FeeTypeCreateDialog
          rows={rows}
          initialRecord={editing}
          onClose={() => setEditing(null)}
          onSaved={(savedRecord) => {
            if (savedRecord) {
              const normalized = {
                id: savedRecord.id ?? savedRecord.Id ?? savedRecord.feeCategoryId ?? editing.id,
                code: String(savedRecord.code ?? savedRecord.Code ?? savedRecord.categoryCode ?? editing.code ?? '').trim(),
                name: String(savedRecord.name ?? savedRecord.Name ?? savedRecord.categoryName ?? editing.name ?? '').trim(),
                description: savedRecord.description ?? savedRecord.Description ?? null,
                status: Number(savedRecord.status ?? savedRecord.Status ?? 1)
              }
              setRows(prev => prev.map(item => item.id === normalized.id ? normalized : item))
            }
            setEditing(null)
            setNotice('Fee type updated successfully.')
            setAttempt(value => value + 1)
          }}
        />
      )}

      {adding && (
        <FeeTypeCreateDialog
          rows={rows}
          onClose={() => setAdding(false)}
          onSaved={(savedRecord) => {
            if (savedRecord) {
              const normalized = {
                id: savedRecord.id ?? savedRecord.Id ?? savedRecord.feeCategoryId ?? Date.now(),
                code: String(savedRecord.code ?? savedRecord.Code ?? savedRecord.categoryCode ?? '').trim(),
                name: String(savedRecord.name ?? savedRecord.Name ?? savedRecord.categoryName ?? '').trim(),
                description: savedRecord.description ?? savedRecord.Description ?? null,
                status: Number(savedRecord.status ?? savedRecord.Status ?? 1)
              }
              setRows(prev => [normalized, ...prev.filter(item => item.id !== normalized.id)])
            }
            setAdding(false)
            setNotice('Fee type saved successfully.')
            setCode('')
            setQuery('')
            setPage(1)
            setAttempt(value => value + 1)
          }}
        />
      )}
    </section>
  )
}
