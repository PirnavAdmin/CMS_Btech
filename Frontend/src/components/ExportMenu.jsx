import { useEffect, useId, useRef, useState } from 'react'
import { FiChevronDown, FiDownload, FiPrinter } from 'react-icons/fi'
import { exportToCsv, printEntityDetails, printResults } from '../utils/exportUtils'

export default function ExportMenu({ rows = [], columns, filename, title, loading = false, scope = 'Current filtered results', unavailable = '' }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const root = useRef(null), trigger = useRef(null), id = useId()
  const disabled = loading || !rows.length || Boolean(unavailable)
  useEffect(() => {
    if (!open) return undefined
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const run = action => { setError(''); setOpen(false); try { action({ rows, columns, filename, title, scope }) } catch (reason) { setError(reason.message) } trigger.current?.focus() }
  return <div className="export-control" ref={root} data-no-print onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }}>
    <button className="export-button" type="button" ref={trigger} disabled={disabled} aria-expanded={open && !disabled} aria-controls={id} aria-label={`Export ${title}`} title={unavailable || (loading ? 'Loading records...' : rows.length ? scope : 'No records available to export.')} onClick={() => setOpen(value => !value)}><FiDownload aria-hidden="true" /> Export <FiChevronDown aria-hidden="true" /></button>
    {open && !disabled && <div className="export-options" id={id}><small>{scope} ({rows.length})</small><button type="button" onClick={() => run(exportToCsv)}><FiDownload aria-hidden="true" /> Download CSV</button><button type="button" onClick={() => run(printResults)}><FiPrinter aria-hidden="true" /> Print / Save as PDF</button></div>}
    {error && <span className="export-error" role="alert">{error}</span>}
  </div>
}

export function PrintDetailsButton({ title, selector, loading = false }) {
  const [error, setError] = useState('')
  return <span className="print-control" data-no-print><button type="button" className="export-button" disabled={loading} onClick={event => { setError(''); try { const scope = event.currentTarget.closest('[data-print-scope]') || document.querySelector(selector); printEntityDetails({ title, element: scope }) } catch (reason) { setError(reason.message) } }}><FiPrinter aria-hidden="true" /> Print / Save as PDF</button>{error && <span className="export-error" role="alert">{error}</span>}</span>
}
