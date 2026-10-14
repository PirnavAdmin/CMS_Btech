import './TablePagination.css'

export const PAGE_SIZE = 5

export default function TablePagination({ page, currentPage, totalPages, onPageChange }) {
  const current = page ?? currentPage ?? 1
  if (totalPages < 1) return null
  return <nav className="table-pagination" aria-label="Table pagination">
    <button type="button" onClick={() => onPageChange(Math.max(1, current - 1))} disabled={current <= 1}>Previous</button>
    <span>Page {current} of {totalPages}</span>
    <button type="button" onClick={() => onPageChange(Math.min(totalPages, current + 1))} disabled={current >= totalPages}>Next</button>
  </nav>
}
