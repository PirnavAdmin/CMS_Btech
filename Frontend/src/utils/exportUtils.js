export const exportValue = (value) => value == null || typeof value === 'object' ? '' : String(value)

export function sanitizeFilename(value = 'export') {
  const name = String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 120)
  return !name || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(name) ? 'export' : name
}

export function csvCell(value) {
  let text = exportValue(value)
  // Prevent spreadsheet formula execution, including formulas preceded by whitespace.
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function reportRows(rows, columns) {
  return rows.map(row => columns.map(column => exportValue(typeof column.value === 'function' ? column.value(row) : row[column.value])))
}

export function toCsv(rows, columns) {
  if (!rows.length || !columns.length) throw new Error('No records available to export.')
  return '\uFEFF' + [columns.map(column => column.label), ...reportRows(rows, columns)].map(row => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadFile(content, filename, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFilename(filename)
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const exportToCsv = ({ rows, columns, filename }) => downloadFile(toCsv(rows, columns), `${sanitizeFilename(filename)}.csv`, 'text/csv;charset=utf-8')

export function downloadServerExport({ blob, contentDisposition, contentType }, fallback = 'export') {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1]
  const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(contentDisposition)
  let filename = plain?.[1] || plain?.[2]?.trim()
  if (encoded) {
    try { filename = decodeURIComponent(encoded) } catch { /* Use the plain filename. */ }
  }
  const extension = /csv/i.test(contentType) ? 'csv' : /pdf/i.test(contentType) ? 'pdf' : /spreadsheetml/i.test(contentType) ? 'xlsx' : /excel/i.test(contentType) ? 'xls' : 'bin'
  downloadFile(blob, filename || `${fallback}.${extension}`, contentType)
}
const escapeHtml = value => exportValue(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

export function reportHtml({ title, scope, rows, columns }) {
  if (!rows.length) throw new Error('No records available to print.')
  return `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(scope)} · ${rows.length} records</p><table><thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${reportRows(rows, columns).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function printDocument(title, html) {
  const target = window.open('', '_blank')
  if (!target) throw new Error('Allow pop-ups to open the print preview.')
  target.opener = null
  target.document.open()
  target.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sanitizeFilename(title))}</title><style>
    body{font:12px/1.5 Arial,sans-serif;color:#172b3a;margin:24px}h1{font-size:22px}h2{font-size:17px}h3{font-size:14px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #bbc6ce;padding:7px;text-align:left;overflow-wrap:anywhere}th{background:#eef2f5}thead{display:table-header-group}tr{break-inside:avoid}section,article{margin:16px 0}dl>div,[class*="info-row"],[class*="detail-row"],[class*="cm-detail"]{padding:8px 0;border-bottom:1px solid #dbe3e8}dt{font-weight:bold}dd{margin:4px 0}small{display:block}svg,img,button,input,select,textarea,nav,footer,[data-no-print]{display:none!important}dialog{position:static;display:block;border:0;width:auto;max-height:none}a{color:inherit;text-decoration:none} @media print{@page{size:auto;margin:12mm}body{margin:0}h1,h2,h3{break-after:avoid}}
  </style></head><body>${html}</body></html>`)
  target.document.close()
  const ready = () => { target.focus(); target.print() }
  if (target.document.readyState === 'complete') ready()
  else target.addEventListener('load', ready, { once: true })
}

export const printResults = options => printDocument(options.title, reportHtml(options))

export function printEntityDetails({ title, element }) {
  if (!element) throw new Error('Details are not available to print.')
  const clone = element.cloneNode(true)
  clone.querySelectorAll('script,style,link,iframe,object,embed,button,input,select,textarea,nav,footer,[data-no-print],.export-control,.print-control').forEach(node => node.remove())
  // Use only the rendered detail content. Strip event handlers and external resource URLs.
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of [...node.attributes]) if (!['class', 'colspan', 'rowspan', 'open'].includes(attr.name)) node.removeAttribute(attr.name)
  }
  printDocument(title, `<h1>${escapeHtml(title)}</h1>${clone.outerHTML}`)
}
