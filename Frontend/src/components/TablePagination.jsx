import './TablePagination.css'

export const PAGE_SIZE = 5

export default function TablePagination({ page, totalPages, onPageChange }) {
  if (totalPages < 1) return null
  return <nav className="table-pagination" aria-label="Table pagination">
    <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
    <span>Page {page} of {totalPages}</span>
    <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
  </nav>
}
