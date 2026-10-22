import { cloneElement, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import EmptyState from '../EmptyState.jsx'

export function MockNotice() { return <div className="portal-mock-notice" role="note"><strong>Mock workspace</strong> Sample/local records only. Accounts, password resets and submissions do not update the live college system.</div> }
export function PortalDialog({ title, onClose, children }) {
  const ref = useRef(null), id = useId()
  useEffect(() => {
    const previous = document.activeElement
    ref.current.showModal()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  return createPortal(<dialog className="portal-dialog" ref={ref} aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === ref.current) onClose() }}><header><h2 id={id}>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}><FiX /></button></header>{children}</dialog>, document.body)
}
export function DataTable({ columns, rows, empty = 'No records available', caption }) {
  return rows.length ? <div className="portal-table-wrap"><table className="portal-table"><caption>{caption}</caption><thead><tr>{columns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id || i}>{columns.map(([key, , render]) => <td key={key}>{render ? render(row) : row[key] ?? '—'}</td>)}</tr>)}</tbody></table></div> : <EmptyState title={empty} message="Records will appear here when they are available in this mock workspace." />
}
export function Status({ children }) { return <span className={`portal-status portal-status--${String(children).toLowerCase()}`}>{children}</span> }
export function Field({ label, children }) {
  const id = useId()
  return <div className="portal-field"><label htmlFor={id} id={`${id}-label`}>{label}</label>{cloneElement(children, { id, 'aria-labelledby': `${id}-label` })}</div>
}
export function Stats({ items }) { return <div className="portal-stats">{items.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>)}</div> }
export function Feedback({ error, notice }) { return <>{error && <p className="portal-feedback error" role="alert">{error}</p>}{notice && <p className="portal-feedback success" role="status">{notice}</p>}</> }
