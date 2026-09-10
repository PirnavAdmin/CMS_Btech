import { showSuccess, showError } from '../utils/toast'
import { useEffect, useId, useRef, useState } from 'react'
import { FiChevronDown, FiDownload, FiPrinter } from 'react-icons/fi'
import { downloadServerExport, exportToCsv, printEntityDetails, printResults, printSingleRecord } from '../utils/exportUtils'
import { cleanRecordSections, readVisibleRecordSections, singleRecordCsvOptions } from '../utils/singleRecordExport'
import { SCREEN_EXPORT_ENDPOINTS, screenExportsApi } from '../api/apiEndpoints'

const screenAliases = { semesters: 'semester', 'course-structure': 'course-structures', 'fee-structures-academic': 'fee-structures', 'fee-structures-hostel': 'hostel-fees', 'fee-structures-transport': 'transport-fees', 'student-promotions': 'promotions', 'promotion-history': 'promotions' }

export default function ExportMenu({ rows = [], columns, filename, title, loading = false, scope = 'Current filtered results', unavailable = '', screen, exportParams, mode = 'list', recordSections }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const serverScreen = screen || (filename === 'faculty-roster' ? 'faculty' : screenAliases[filename]) || filename
  const single = mode === 'single'
  const supportsServerExport = !single && Object.hasOwn(SCREEN_EXPORT_ENDPOINTS, serverScreen)
  const root = useRef(null), trigger = useRef(null), id = useId()
  const disabled = busy || loading || (!single && !rows.length && !supportsServerExport) || Boolean(unavailable)
  useEffect(() => {
    if (!open) return undefined
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const run = async (action, message) => { setError(''); setOpen(false); setBusy(true); try { await action({ rows, columns, filename, title, scope }); showSuccess(message) } catch (reason) { setError(reason.message || 'Export failed. Please try again.'); showError(reason.message || 'Export failed. Please try again.') } finally { setBusy(false); trigger.current?.focus() } }
  const download = async () => downloadServerExport(await screenExportsApi.save(serverScreen, exportParams), filename)
  const selectedSections = () => recordSections ? cleanRecordSections(recordSections) : readVisibleRecordSections(root.current?.closest('[data-export-record]'))
  const downloadRecord = () => exportToCsv(singleRecordCsvOptions(selectedSections(), filename))
  const printRecord = () => printSingleRecord({ title, sections: selectedSections() })
  return <div className="export-control" ref={root} data-no-print onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }}>
    <button className="export-button" type="button" ref={trigger} disabled={disabled} aria-expanded={open && !disabled} aria-controls={id} aria-label={`Export ${title}`} title={unavailable || (loading ? 'Loading records...' : rows.length ? scope : 'No records available to export.')} onClick={() => setOpen(value => !value)}><FiDownload aria-hidden="true" /> Export <FiChevronDown aria-hidden="true" /></button>
    {open && !disabled && <div className="export-options" id={id}><small>{single ? 'Current record only' : `${scope} (${rows.length})`}</small><button type="button" disabled={!single && !rows.length && !supportsServerExport} onClick={() => run(single ? downloadRecord : supportsServerExport ? download : exportToCsv, single ? 'Record downloaded successfully' : 'CSV downloaded successfully')}><FiDownload aria-hidden="true" /> Download CSV</button><button type="button" disabled={!single && !rows.length} onClick={() => run(single ? printRecord : printResults, 'Print preview opened. Choose Print or Save as PDF in your browser.')}><FiPrinter aria-hidden="true" /> Print / Save as PDF</button></div>}
    {busy && <span role="status">Preparing download...</span>}
    {error && <span className="export-error" role="alert">{error}</span>}
  </div>
}

export function PrintDetailsButton({ title, selector, loading = false }) {
  const [error, setError] = useState('')
  return <span className="print-control" data-no-print><button type="button" className="export-button" disabled={loading} onClick={event => { setError(''); try { const scope = event.currentTarget.closest('[data-print-scope]') || document.querySelector(selector); printEntityDetails({ title, element: scope }); showSuccess('Print preview opened. Choose Print or Save as PDF in your browser.') } catch (reason) { setError(reason.message); showError(reason.message) } }}><FiPrinter aria-hidden="true" /> Print / Save as PDF</button>{error && <span className="export-error" role="alert">{error}</span>}</span>
}
