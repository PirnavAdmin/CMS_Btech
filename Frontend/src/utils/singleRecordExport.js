import { exportValue } from './exportUtils'

const excludedLabel = /password|token|secret|aadhaar|aadhar|passport|bank account|internal id/i
const missing = /^(?:-|—|n\/a|null|undefined|not provided|not available|not uploaded)$/i
const text = element => element?.textContent?.replace(/\s+/g, ' ').trim() || ''

// Only labelled display values or explicitly supplied UI sections are eligible.
// Never enumerate an API record, form inputs, data attributes, or link URLs.
export function cleanRecordSections(sections = []) {
  return sections.map(section => ({
    title: section.title || 'Details',
    rows: (section.rows || []).map(([label, value]) => [String(label || '').trim(), exportValue(value).trim()])
      .filter(([label, value]) => label && value && !excludedLabel.test(label) && !missing.test(value)),
  })).filter(section => section.rows.length)
}

function visible(element, scope) {
  for (let node = element; node; node = node.parentElement) {
    if (node.matches('[hidden], [aria-hidden="true"], [data-no-export], [data-no-print], button, input, select, textarea, nav, footer')) return false
    const style = node.ownerDocument.defaultView.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    if (node === scope) return true
  }
  return false
}

export function readVisibleRecordSections(scope) {
  if (!scope) throw new Error('Record details are not available to export.')
  const sections = new Map()
  const add = (title, label, value) => {
    if (!sections.has(title)) sections.set(title, [])
    const rows = sections.get(title)
    if (!rows.some(row => row[0] === label && row[1] === value)) rows.push([label, value])
  }
  const recordTitle = scope.querySelector('.cm-profile-title, .profile-name')
  if (recordTitle && visible(recordTitle, scope)) add('Record', 'Name', text(recordTitle))
  for (const field of scope.querySelectorAll('.cm-info-row, .erp-view-field, .profile-detail, dl > div')) {
    if (!visible(field, scope)) continue
    const label = field.querySelector('.cm-info-label, .erp-view-label, dt, :scope > span')
    const value = field.querySelector('.cm-info-val, .erp-view-value, dd, :scope > strong')
    if (!label || !value || !visible(value, scope)) continue
    const group = field.closest('.cm-info-card, .profile-preview-group, .sa-detail-panel, .sa-review-section, .sa-review-block, section')
    add(text(group?.querySelector('h2, h3')) || 'Details', text(label), text(value))
  }
  // Child rows belong to the opened attendance/result/fee record, not the directory.
  for (const table of scope.querySelectorAll('table')) {
    if (!visible(table, scope)) continue
    const headers = [...table.querySelectorAll('thead th')].map(text)
    const title = text(table.closest('section, .erp-detail-section')?.querySelector('h2, h3')) || 'Record items'
    for (const [index, row] of [...table.querySelectorAll('tbody tr')].entries()) {
      if (!visible(row, scope)) continue
      ;[...row.querySelectorAll('td')].forEach((cell, column) => {
        if (visible(cell, scope) && !cell.querySelector('button, input, select') && headers[column]) add(`${title} ${index + 1}`, headers[column], text(cell))
      })
    }
  }
  return cleanRecordSections([...sections].map(([title, rows]) => ({ title, rows })))
}

export function singleRecordCsvOptions(sections, filename) {
  const fields = cleanRecordSections(sections).flatMap(section => section.rows.map(([label, value]) => ({ label: `${section.title} / ${label}`, value })))
  if (!fields.length) throw new Error('No record details available to export.')
  return {
    filename,
    rows: [Object.fromEntries(fields.map((field, index) => [index, field.value]))],
    columns: fields.map((field, index) => ({ label: field.label, value: String(index) })),
  }
}
