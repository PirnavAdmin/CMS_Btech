// Pages and helpers in this module retain their own isolated scopes.
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external2 from "react-dom";
import * as external3 from "react-icons/fi";
import { academicServiceModule, eventBusModule, collegeScopeModule, authModule, userErrorModule, rolesModule, collegeLogoModule, collegeApiModule, apiEndpointsModule, apiFailureNoticeModule, demoRequestModule } from "../API/apiendpoints.jsx";

export const academicYearUtilsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/academicYearUtils.js
const normalizeStatus = (year = {}) => {
  const statusValue = year?.status ?? year?.academicYearStatus ?? year?.state ?? year?.yearStatus ?? ''
  const rawText = String(statusValue ?? '').trim().toUpperCase()
  const isActiveFlag = year?.isActive === true || year?.active === true || Number(year?.isActive) === 1 || Number(year?.status) === 1
  const isArchivedFlag = year?.isArchived === true || Number(year?.isArchived) === 1 || rawText === 'ARCHIVED'

  if (isActiveFlag || rawText === 'ACTIVE') return 'ACTIVE'
  if (isArchivedFlag || rawText === 'INACTIVE' || rawText === 'ARCHIVED') return 'ARCHIVED'
  const startDate = String(year?.startDate ?? '').slice(0, 10)
  const endDate = String(year?.endDate ?? '').slice(0, 10)
  if (!startDate || !endDate) return rawText === 'UPCOMING' ? 'UPCOMING' : 'ACTIVE'

  const today = new Date();
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59`)

  if (today < start) return 'UPCOMING'
  if (today > end) return 'ARCHIVED'
  return 'ACTIVE'
}

/* export */ const normalizeAcademicYear = (year = {}) => {
  const id = year?.academicYearId ?? year?.id ?? year?.yearId ?? ''
  const name = year?.academicYearName ?? year?.name ?? year?.academicYear ?? year?.code ?? ''
  return {
    ...year,
    id: id === null || id === undefined ? '' : String(id),
    name: String(name ?? '').trim(),
    status: normalizeStatus(year),
  }
}

const sortAcademicYears = (years) => [...years].sort((left, right) => {
  const statusRank = { ACTIVE: 0, UPCOMING: 1, ARCHIVED: 2 }
  const rank = (statusRank[left.status] ?? 3) - (statusRank[right.status] ?? 3)
  if (rank) return rank
  return String(left.startDate || left.name).localeCompare(String(right.startDate || right.name))
})

/* export */ const getSelectableAcademicYears = (years = []) => {
  const rows = Array.isArray(years) ? years : []
  return sortAcademicYears(rows
    .map(normalizeAcademicYear)
    .filter((year) => year.id && year.name && year.status !== 'ARCHIVED'))
}

/* export */ const getActiveAcademicYears = (years = []) => {
  const selectableYears = getSelectableAcademicYears(years)
  const activeYears = selectableYears.filter((year) => year.status === 'ACTIVE')

  // A newly configured college can legitimately have no active year yet. In
  // that case retain upcoming, non-archived years so dependent forms do not
  // render an empty academic-year dropdown.
  return activeYears.length ? activeYears : selectableYears
}

/* export */ const getDefaultAcademicYear = (years = []) => {
  const activeYears = getActiveAcademicYears(years)
  if (!activeYears.length) return null
  return activeYears[0]
}

/* export */ const resolveAcademicYearId = (years = [], selectedId = '') => {
  const activeYears = getActiveAcademicYears(years)
  if (!activeYears.length) return selectedId || ''
  if (selectedId && activeYears.some((year) => String(year.id) === String(selectedId))) {
    return String(selectedId)
  }
  return String(activeYears[0].id)
}

/* export */ const getOperationalAcademicYearOptions = (years = []) => {
  return getActiveAcademicYears(years).map((year) => ({
    id: year.id,
    name: year.name,
    academicYearId: year.id,
    academicYearName: year.name,
  }))
}
// #endregion utils/academicYearUtils.js
return {
  get normalizeAcademicYear() { return normalizeAcademicYear; },
  get getSelectableAcademicYears() { return getSelectableAcademicYears; },
  get getActiveAcademicYears() { return getActiveAcademicYears; },
  get getDefaultAcademicYear() { return getDefaultAcademicYear; },
  get resolveAcademicYearId() { return resolveAcademicYearId; },
  get getOperationalAcademicYearOptions() { return getOperationalAcademicYearOptions; }
};
})();

export const toastModule = (() => {
const { userErrorMessage } = userErrorModule;
/* Imports for isolated regression tests:
import { userErrorMessage } from './userError.js'
*/
// #region utils/toast.js
/* export */ const TOAST_DURATION = 2000
const types = new Set(['success', 'error', 'warning', 'info'])
let nextId = 0
let snapshot = []
const listeners = new Set()
const timers = new Map()
const emit = () => listeners.forEach(listener => listener())

/* export */ const getToasts = () => snapshot
/* export */ const subscribeToToasts = listener => { listeners.add(listener); return () => listeners.delete(listener) }

/* export */ function dismissToast(id) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  snapshot = snapshot.filter(toast => toast.id !== id)
  emit()
}

/* export */ function showToast(value, type = 'info') {
  const message = type === 'error' ? userErrorMessage(value) : String(value?.message || value?.response?.data?.message || value || '').trim()
  if (!message) return undefined
  const tone = types.has(type) ? type : 'info'
  const existing = snapshot.find(toast => toast.message === message && toast.type === tone)
  if (existing) return existing.id
  const id = ++nextId
  snapshot = [...snapshot, { id, message, type: tone }]
  timers.set(id, setTimeout(() => dismissToast(id), TOAST_DURATION))
  emit()
  return id
}

/* export */ const showSuccess = message => showToast(message, 'success')
/* export */ const showError = message => showToast(message, 'error')
/* export */ const showWarning = message => showToast(message, 'warning')
/* export */ const showInfo = message => showToast(message, 'info')
// #endregion utils/toast.js
return {
  get TOAST_DURATION() { return TOAST_DURATION; },
  get getToasts() { return getToasts; },
  get subscribeToToasts() { return subscribeToToasts; },
  get dismissToast() { return dismissToast; },
  get showToast() { return showToast; },
  get showSuccess() { return showSuccess; },
  get showError() { return showError; },
  get showWarning() { return showWarning; },
  get showInfo() { return showInfo; }
};
})();

export const feeNavigationModule = (() => {

/* Imports for isolated regression tests:

*/
// #region pages/fees/feeNavigation.js
/* export */ const feeNavigation = [
  { label: 'Overview', to: '/fees/overview', sections: ['overview'] },
  { label: 'Fee Plans', to: '/fees/structures', sections: ['structures', 'components', 'legacy', 'plans'] },
  { label: 'Student Fees', to: '/fees/students', sections: ['students', 'accounts', 'ledger', 'assignments', 'concessions', 'dues'] },
  { label: 'Payments', to: '/fees/receipts', sections: ['receipts', 'collection', 'refunds', 'payments'] },
  { label: 'Reports', to: '/fees/reports', sections: ['reports'] },
]

/* export */ const studentAccountOperations = [
  { label: 'Assign Fee Plan', to: '/fees/assignments', description: 'Assign published fee plans to eligible students.' },
  { label: 'Adjustments', to: '/fees/concessions', description: 'Manage scholarships, waivers and approved fee reductions.' },
  { label: 'Dues & Penalties', to: '/fees/dues', description: 'Review overdue balances and applicable penalties.' },
]

/* export */ const isFeeRoute = pathname => pathname === '/fees' || pathname.startsWith('/fees/')
/* export */ function feeNavigationItem(pathname) {
  if (!isFeeRoute(pathname)) return null
  const section = pathname.split('/')[2] || 'overview'
  return feeNavigation.find(item => item.sections.includes(section)) || null
}
/* export */ function feeBreadcrumbs(pathname) {
  if (!isFeeRoute(pathname)) return null
  const item = feeNavigationItem(pathname)
  const crumbs = [{ label: 'Finance' }, { label: 'Fee Management', to: '/fees/overview' }]
  if (item) crumbs.push({ label: item.label, to: item.to })
  const facilityEditor = pathname.match(/^\/fees\/structures\/(hostel|transport)\/(create|[^/]+\/edit)\/?$/)
  if (facilityEditor) crumbs.push({ label: `${facilityEditor[2] === 'create' ? 'Create' : 'Edit'} ${facilityEditor[1] === 'hostel' ? 'Hostel' : 'Transport'} Fee Plan` })
  else if (pathname === '/fees/structures/create') crumbs.push({ label: 'Create Fee Plan' })
  else if (/^\/fees\/structures\/[^/]+\/edit\/?$/.test(pathname)) crumbs.push({ label: 'Edit Fee Plan' })
  else if (pathname.startsWith('/fees/structures/') && pathname !== '/fees/structures/') crumbs.push({ label: 'Fee Plan Details' })
  else if (pathname.startsWith('/fees/accounts/')) crumbs.push({ label: 'Student Fee Details' })
  else if (pathname.startsWith('/fees/ledger/')) crumbs.push({ label: 'Student Fee Details' })
  else if (pathname === '/fees/components') crumbs.push({ label: 'Manage Charges' })
  else if (pathname === '/fees/assignments') crumbs.push({ label: 'Assign Fee Plan' })
  else if (pathname === '/fees/concessions') crumbs.push({ label: 'Adjustments' })
  else if (pathname === '/fees/collection') crumbs.push({ label: 'Collect Payment' })
  else if (pathname === '/fees/refunds') crumbs.push({ label: 'Refunds' })
  return crumbs
}
// #endregion pages/fees/feeNavigation.js
return {
  get feeNavigation() { return feeNavigation; },
  get studentAccountOperations() { return studentAccountOperations; },
  get isFeeRoute() { return isFeeRoute; },
  get feeNavigationItem() { return feeNavigationItem; },
  get feeBreadcrumbs() { return feeBreadcrumbs; }
};
})();

export const headerAcademicYearModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/headerAcademicYear.js
// Header selection must use backend status, never the date-based form fallback.
/* export */ function selectHeaderAcademicYear(years = []) {
  const active = years.filter(year => year.isActive === true || year.isActive === 1 || year.isActive === '1' || year.status === 1 || year.status === '1' || String(year.status).toUpperCase() === 'ACTIVE')
  if (active.length > 1) return { state: 'conflict', year: null }
  return { state: active.length ? 'ready' : 'empty', year: active[0] || null }
}

function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return NaN
  const day = value.slice(0, 10)
  const parsed = Date.parse(day + 'T00:00:00Z')
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === day ? parsed : NaN
}

/* export */ function calculateAcademicYearProgress(startDate, endDate, currentDate = new Date()) {
  const start = dateValue(startDate), end = dateValue(endDate)
  const current = currentDate instanceof Date ? currentDate : new Date(currentDate)
  if (!Number.isFinite(current.getTime()) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const now = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)))
}
// #endregion utils/headerAcademicYear.js
return {
  get selectHeaderAcademicYear() { return selectHeaderAcademicYear; },
  get calculateAcademicYearProgress() { return calculateAcademicYearProgress; }
};
})();

export const campusModulesModule = (() => {

/* Imports for isolated regression tests:

*/
// #region pages/campus/campusModules.js
const field = (key, label, type = 'text', required = true, options) => ({ key, label, type, required, options })
const area = (key, label, columns, fields = [], description = '') => ({ key, label, columns, fields, description })
/* export */ const campusModules = {
  library: {
    title: 'Library', subtitle: 'Catalog, physical copies and circulation in one workspace.',
    areas: [
      area('catalog', 'Book Catalog', ['Title', 'ISBN', 'Author', 'Category'], [field('title', 'Title'), field('isbn', 'ISBN'), field('author', 'Author'), field('category', 'Category'), field('publisher', 'Publisher', 'text', false), field('edition', 'Edition', 'text', false), field('subject', 'Subject', 'text', false), field('language', 'Language', 'text', false)]),
      area('copies', 'Book Copies', ['Accession number', 'Book title', 'Barcode', 'Shelf', 'Condition'], [field('accession', 'Accession number'), field('title', 'Book title'), field('barcode', 'Barcode'), field('shelf', 'Shelf / Location'), field('condition', 'Condition', 'select', true, ['Good', 'Worn', 'Damaged'])]),
      area('circulation', 'Issue & Return', ['Borrower', 'Book', 'Accession number', 'Issue date', 'Due date', 'Status'], [], 'Issue and return records will appear when circulation is connected. Borrower eligibility, copy availability and configured loan rules must be verified before issuing a book.'),
      area('borrowers', 'Borrowers', ['Name', 'Student / Faculty ID', 'Type', 'Active loans', 'Status']),
      area('reservations', 'Reservations', ['Borrower', 'Book', 'Requested on', 'Queue position', 'Status']),
      area('fines', 'Fines', ['Borrower', 'Accession number', 'Overdue days', 'Fine', 'Payment status'], [], 'Fines follow the institution’s configured library rules. No fines are calculated in this workspace.'),
      area('reports', 'Reports', ['Report', 'Period', 'Generated on', 'Status']),
    ],
  },
  'meetings-events': {
    title: 'Meetings/Events', subtitle: 'Plan campus meetings, coordinate events and track participation.',
    areas: [
      area('meetings', 'Meetings', ['Title', 'Starts at', 'Ends at', 'Venue'], [field('title', 'Title'), field('start', 'Starts at', 'datetime-local'), field('end', 'Ends at', 'datetime-local'), field('venue', 'Venue'), field('organizer', 'Organizer'), field('audience', 'Audience', 'select', true, ['Faculty', 'Students', 'Faculty and students']), field('agenda', 'Agenda', 'textarea')]),
      area('events', 'Events', ['Title', 'Starts at', 'Ends at', 'Venue'], [field('title', 'Title'), field('start', 'Starts at', 'datetime-local'), field('end', 'Ends at', 'datetime-local'), field('venue', 'Venue'), field('organizer', 'Organizer'), field('capacity', 'Capacity', 'number'), field('deadline', 'Registration deadline', 'datetime-local'), field('description', 'Description', 'textarea')]),
      area('registrations', 'Registrations', ['Event', 'Participant', 'Registration date', 'Status']),
      area('attendance', 'Attendance', ['Meeting / Event', 'Participant', 'Check-in', 'Attendance']),
      area('minutes', 'Minutes & Actions', ['Meeting title', 'Owner', 'Due date', 'Action item'], [field('title', 'Meeting title'), field('owner', 'Owner'), field('due', 'Due date', 'date'), field('action', 'Action item', 'textarea'), field('minutes', 'Minutes', 'textarea', false)]),
    ],
  },
  placement: {
    title: 'Placement', subtitle: 'Coordinate employers, recruitment drives and student opportunities.',
    areas: [
      area('drives', 'Recruitment Drives', ['Title', 'Company', 'Role', 'Drive date'], [field('title', 'Title'), field('company', 'Company'), field('role', 'Role'), field('date', 'Drive date', 'date'), field('deadline', 'Application deadline', 'date'), field('venue', 'Venue / Mode'), field('eligibility', 'Eligibility criteria', 'textarea'), field('description', 'Job description', 'textarea')]),
      area('companies', 'Companies', ['Company', 'Industry', 'Contact name', 'Contact email'], [field('company', 'Company'), field('industry', 'Industry'), field('contact', 'Contact name'), field('email', 'Contact email', 'email'), field('website', 'Website', 'url', false)]),
      area('applications', 'Applications', ['Student', 'Company', 'Role', 'Applied on', 'Status'], [], 'Applications will appear once recruitment services are connected. Eligibility must be checked against the drive’s approved criteria.'),
      area('interviews', 'Interviews', ['Company', 'Role', 'Round', 'Starts at'], [field('company', 'Company'), field('role', 'Role'), field('round', 'Round'), field('start', 'Starts at', 'datetime-local'), field('end', 'Ends at', 'datetime-local'), field('venue', 'Venue / Meeting link')]),
      area('offers', 'Offers', ['Student', 'Company', 'Role', 'Offer date', 'Status']),
      area('reports', 'Reports', ['Program', 'Eligible students', 'Applicants', 'Placed', 'Placement rate']),
    ],
  },
  results: {
    title: 'Official Results', subtitle: 'Published semester results, student statements and academic records.',
    areas: [
      area('semester', 'Semester Results', ['Student', 'Roll number', 'Semester', 'Total marks', 'Percentage', 'Credits', 'SGPA', 'CGPA', 'Result status']),
      area('student', 'Student Results', ['Subject', 'Subject code', 'Marks', 'Credits', 'Grade', 'Pass / Fail']),
      area('backlogs', 'Backlogs', ['Student', 'Roll number', 'Subject', 'Semester', 'Attempts', 'Status']),
      area('memos', 'Marks Memos', ['Student', 'Roll number', 'Semester', 'Published on', 'Memo number']),
    ],
  },
}

/* export */ function validateCampusDraft(area, values) {
  for (const field of area.fields) {
    const value = String(values[field.key] || '').trim()
    if (field.required && !value) return `${field.label} is required.`
    if (field.type === 'number' && value && (!Number.isInteger(Number(value)) || Number(value) < 1)) return `${field.label} must be a positive whole number.`
  }
  if (values.start && values.end && values.end <= values.start) return 'End time must be after start time.'
  if (values.deadline && (values.start || values.date) && values.deadline > (values.start || values.date)) return 'Registration or application deadline must not be after the event or drive starts.'
  if (values.isbn) {
    const isbn = values.isbn.replace(/[-\s]/g, '')
    const valid10 = /^\d{9}[\dX]$/i.test(isbn) && [...isbn.toUpperCase()].reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0
    const valid13 = /^\d{13}$/.test(isbn) && [...isbn].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10 === 0
    if (!valid10 && !valid13) return 'Enter a valid ISBN-10 or ISBN-13, including its check digit.'
  }
  return ''
}
// #endregion pages/campus/campusModules.js
return {
  get campusModules() { return campusModules; },
  get validateCampusDraft() { return validateCampusDraft; }
};
})();

export const exportUtilsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/exportUtils.js
/* export */ const exportValue = (value) => value == null || typeof value === 'object' ? '' : String(value)

/* export */ function sanitizeFilename(value = 'export') {
  const name = String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 120)
  return !name || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(name) ? 'export' : name
}

/* export */ function csvCell(value) {
  let text = exportValue(value)
  // Prevent spreadsheet formula execution, including formulas preceded by whitespace.
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

/* export */ function reportRows(rows, columns) {
  return rows.map(row => columns.map(column => exportValue(typeof column.value === 'function' ? column.value(row) : row[column.value])))
}

/* export */ function toCsv(rows, columns) {
  if (!rows.length || !columns.length) throw new Error('No records available to export.')
  return '\uFEFF' + [columns.map(column => column.label), ...reportRows(rows, columns)].map(row => row.map(csvCell).join(',')).join('\r\n')
}

/* export */ function downloadFile(content, filename, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFilename(filename)
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* export */ const exportToCsv = ({ rows, columns, filename }) => downloadFile(toCsv(rows, columns), `${sanitizeFilename(filename)}.csv`, 'text/csv;charset=utf-8')

/* export */ function downloadServerExport({ blob, contentDisposition, contentType }, fallback = 'export') {
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

/* export */ function reportHtml({ title, scope, rows, columns }) {
  if (!rows.length) throw new Error('No records available to print.')
  return `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(scope)} | ${rows.length} records</p><table><thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${reportRows(rows, columns).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
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
  const closeAfterPrint = () => window.setTimeout(() => { if (!target.closed) target.close() }, 0)
  target.addEventListener('afterprint', closeAfterPrint, { once: true })
  const ready = () => { target.focus(); target.print() }
  if (target.document.readyState === 'complete') ready()
  else target.addEventListener('load', ready, { once: true })
}

/* export */ const printResults = options => printDocument(options.title, reportHtml(options))

/* export */ function singleRecordHtml({ title, sections }) {
  if (!sections?.some(section => section.rows?.length)) throw new Error('No record details available to print.')
  return `<h1>${escapeHtml(title)}</h1>${sections.map(section => `<section><h2>${escapeHtml(section.title)}</h2><table><tbody>${section.rows.map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</tbody></table></section>`).join('')}`
}

/* export */ const printSingleRecord = options => printDocument(options.title, singleRecordHtml(options))

/* export */ function printEntityDetails({ title, element }) {
  if (!element) throw new Error('Details are not available to print.')
  const clone = element.cloneNode(true)
  clone.querySelectorAll('script,style,link,iframe,object,embed,button,input,select,textarea,nav,footer,[data-no-print],.export-control,.print-control').forEach(node => node.remove())
  const emptyValues = new Set(['', '-', '-', 'n/a', 'not provided', 'not available', 'null', 'undefined'])
  clone.querySelectorAll('.erp-view-field,.cm-info-row,.profile-detail,.detail-grid > div,dl > div').forEach(field => {
    const valueNode = field.querySelector('.erp-view-value,.cm-info-val,.profile-detail strong,dd') || field.lastElementChild
    const value = valueNode?.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || ''
    if (emptyValues.has(value)) field.remove()
  })
  clone.querySelectorAll('.erp-view-section,.cm-info-card,.profile-preview-group,.sa-detail-panel').forEach(section => {
    const hasValue = [...section.querySelectorAll('.erp-view-value,.cm-info-val,.profile-detail strong,dd')]
      .some(node => !emptyValues.has(node.textContent.replace(/\s+/g, ' ').trim().toLowerCase()))
    if (!hasValue) section.remove()
  })
  // Use only the rendered detail content. Strip event handlers and external resource URLs.
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of [...node.attributes]) if (!['class', 'colspan', 'rowspan', 'open'].includes(attr.name)) node.removeAttribute(attr.name)
  }
  printDocument(title, `<h1>${escapeHtml(title)}</h1>${clone.outerHTML}`)
}
// #endregion utils/exportUtils.js
return {
  get exportValue() { return exportValue; },
  get sanitizeFilename() { return sanitizeFilename; },
  get csvCell() { return csvCell; },
  get reportRows() { return reportRows; },
  get toCsv() { return toCsv; },
  get downloadFile() { return downloadFile; },
  get exportToCsv() { return exportToCsv; },
  get downloadServerExport() { return downloadServerExport; },
  get reportHtml() { return reportHtml; },
  get printResults() { return printResults; },
  get singleRecordHtml() { return singleRecordHtml; },
  get printSingleRecord() { return printSingleRecord; },
  get printEntityDetails() { return printEntityDetails; }
};
})();

export const singleRecordExportModule = (() => {
const { exportValue } = exportUtilsModule;
/* Imports for isolated regression tests:
import { exportValue } from './exportUtils'
*/
// #region utils/singleRecordExport.js
const excludedLabel = /password|token|secret|aadhaar|aadhar|passport|bank account|internal id/i
const missing = /^(?:-|-|n\/a|null|undefined|not provided|not available|not uploaded)$/i
const text = element => element?.textContent?.replace(/\s+/g, ' ').trim() || ''

// Only labelled display values or explicitly supplied UI sections are eligible.
// Never enumerate an API record, form inputs, data attributes, or link URLs.
/* export */ function cleanRecordSections(sections = []) {
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

/* export */ function readVisibleRecordSections(scope) {
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

/* export */ function singleRecordCsvOptions(sections, filename) {
  const fields = cleanRecordSections(sections).flatMap(section => section.rows.map(([label, value]) => ({ label: `${section.title} / ${label}`, value })))
  if (!fields.length) throw new Error('No record details available to export.')
  return {
    filename,
    rows: [Object.fromEntries(fields.map((field, index) => [index, field.value]))],
    columns: fields.map((field, index) => ({ label: field.label, value: String(index) })),
  }
}
// #endregion utils/singleRecordExport.js
return {
  get cleanRecordSections() { return cleanRecordSections; },
  get readVisibleRecordSections() { return readVisibleRecordSections; },
  get singleRecordCsvOptions() { return singleRecordCsvOptions; }
};
})();

export const exportColumnsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/exportColumns.js
const fields = pairs => pairs.map(([label, value]) => ({ label, value }))
/* export */ const collegeColumns = fields([['College','name'],['Code','code'],['Type','type'],['City','city'],['State','state'],['Email','email'],['Phone','contact'],['Status','status']])
/* export */ const yearColumns = fields([['Academic Year','name'],['Start Date','startDate'],['End Date','endDate'],['Status','status']])
/* export */ const courseColumns = fields([['Course','name'],['Code','code'],['Short Name','shortName'],['Duration (Years)','durationValue'],['Total Semesters','semesters'],['Status','status']])
/* export */ const departmentColumns = fields([['Department','name'],['Code','code'],['College','collegeName'],['Head / In-Charge','hodName'],['Status','status']])
/* export */ const branchColumns = fields([['Branch','branchName'],['Code','branchCode'],['Course','courseName'],['Type','branchType'],['Duration (Years)','duration'],['Total Semesters','totalSemesters'],['Approved Intake','intakeCapacity'],['Status','status']])
/* export */ const semesterColumns = fields([['Semester','semesterName'],['Course','courseName'],['Branch','branchName'],['Academic Year','academicYearName'],['Start Date','startDate'],['End Date','endDate'],['Status','status']])
/* export */ const sectionColumns = fields([['Section','name'],['Code','code'],['Course','course'],['Branch','branch'],['Semester','semester'],['Academic Year','academicYear'],['Capacity','capacity'],['Current Strength','currentStrength'],['Faculty Advisor','advisor'],['Status','status']])
/* export */ const structureColumns = fields([['Year','yearNumber'],['Semester','semesterNumber'],['Name','semesterName'],['Status', row => Number(row.status) === 0 ? 'Inactive' : 'Active']])
const studentName = row => [row.personal?.firstName, row.personal?.middleName, row.personal?.lastName].filter(Boolean).join(' ') || row.name || row.fullName || ''
/* export */ const admissionColumns = fields([['Student',studentName],['Registration Number',row=>row.application?.number],['Admission Number',row=>row.application?.admissionNumber],['Course',row=>row.academic?.course],['Branch',row=>row.academic?.branch],['Academic Year',row=>row.academic?.academicYear],['Semester',row=>row.academic?.semester],['Admission Type',row=>row.academic?.admissionType],['Status','status']])
/* export */ const profileColumns = fields([['Student',studentName],['Registration Number',row=>row.application?.registrationNumber],['Admission Number',row=>row.application?.admissionNumber],['Roll Number',row=>row.academic?.rollNumber],['Course',row=>row.academic?.course],['Branch',row=>row.academic?.branch],['Semester',row=>row.academic?.semester],['Section',row=>row.academic?.section],['Academic Year',row=>row.academic?.academicYear],['Status','status']])
/* export */ const promotionColumns = fields([['Student',row=>row.studentName??row.fullName??row.name],['Roll Number','rollNumber'],['Registration Number','registrationNumber'],['Course',row=>row.courseName??row.course],['Branch',row=>row.branchName??row.branch],['Current Semester',row=>row.currentSemester??row.semester],['Target Semester',row=>row.nextSemester??row.targetSemester],['Credits','creditsEarned'],['SGPA','sgpa'],['CGPA','cgpa'],['Eligibility',row=>row.eligibilityLabel??row.eligibilityStatus??row.status]])
/* export */ const promotionHistoryColumns = fields([['Student',row=>row.studentName??row.fullName??row.name],['Roll Number','rollNumber'],['From Semester','fromSemester'],['To Semester','toSemester'],['Mode',row=>row.mode??row.promotionMode??row.promotionType],['Date','promotionDate'],['Status','status']])
/* export */ const collegeSettingsColumns = fields([['College','collegeName'],['Code','collegeCode'],['Email','collegeEmail'],['City','city'],['State','state'],['Academic Year','academicYear'],['Semester','semester'],['Type','institutionType'],['Status','status']])
/* export */ const feeStructureColumns = fields([['Code','code'],['Version',row=>`Version ${row.version||1}`],['Structure Name','name'],['Department','departmentName'],['Course','courseName'],['Branch','branchName'],['Fee Period','feePeriod'],['Semester / Year',row=>row.semesterName||row.yearOfStudy||''],['Admission Type','admissionType'],['Quota',row=>[row.quota,row.studentCategory].filter(Boolean).join(' / ')],['Mandatory Fee',row=>(row.feeComponents||[]).filter(c=>c.requirement!=='Optional'&&c.refundable!=='Refundable').reduce((s,c)=>s+(Number(c.amount)||0),0)],['Refundable Deposit',row=>(row.feeComponents||[]).filter(c=>c.refundable==='Refundable').reduce((s,c)=>s+(Number(c.amount)||0),0)],['Optional Fee',row=>(row.feeComponents||[]).filter(c=>c.requirement==='Optional').reduce((s,c)=>s+(Number(c.amount)||0),0)],['Effective Period',row=>[row.effectiveFrom,row.effectiveTo||'Open ended'].filter(Boolean).join(' to ')],['Status','status']])
/* export */ const hostelFeeColumns = fields([['Hostel Name','hostelName'],['Hostel Type','hostelType'],['Room Type','roomType'],['AC Type','acType'],['Academic Year','academicYearName'],['Mess Plan','messPlan'],['Fee','fee'],['Effective Period',row=>[row.effectiveFrom,row.effectiveTo||'Open ended'].filter(Boolean).join(' to ')],['Status','status']])
/* export */ const transportFeeColumns = fields([['Route','route'],['Route Code','routeCode'],['Pickup Point','pickupPoint'],['Academic Year','academicYearName'],['Distance',row=>row.distance?`${row.distance} km`:''],['Frequency','frequency'],['Fee','fee'],['Effective Period',row=>[row.effectiveFrom,row.effectiveTo||'Open ended'].filter(Boolean).join(' to ')],['Status','status']])
// #endregion utils/exportColumns.js
return {
  get collegeColumns() { return collegeColumns; },
  get yearColumns() { return yearColumns; },
  get courseColumns() { return courseColumns; },
  get departmentColumns() { return departmentColumns; },
  get branchColumns() { return branchColumns; },
  get semesterColumns() { return semesterColumns; },
  get sectionColumns() { return sectionColumns; },
  get structureColumns() { return structureColumns; },
  get admissionColumns() { return admissionColumns; },
  get profileColumns() { return profileColumns; },
  get promotionColumns() { return promotionColumns; },
  get promotionHistoryColumns() { return promotionHistoryColumns; },
  get collegeSettingsColumns() { return collegeSettingsColumns; },
  get feeStructureColumns() { return feeStructureColumns; },
  get hostelFeeColumns() { return hostelFeeColumns; },
  get transportFeeColumns() { return transportFeeColumns; }
};
})();

export const semesterUtilsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/semesterUtils.js
// Backend status is an administrative flag, not evidence of a running semester.
/* export */ const dateOnly = (value) => {
  const text = String(value ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return ''
  const date = new Date(`${text}T12:00:00`)
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(text.slice(0, 4)) && date.getMonth() + 1 === Number(text.slice(5, 7)) && date.getDate() === Number(text.slice(8, 10)) ? text : ''
}

/* export */ const deriveLifecycleStatus = (item = {}, fallback = 'Upcoming', now = new Date()) => {
  const start = dateOnly(item.startDate)
  const end = dateOnly(item.endDate)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (start && end && start <= end) {
    if (today < start) return 'Upcoming'
    if (today > end) return 'Completed'
    return 'Active'
  }
  if (end && !start && today > end) return 'Completed'
  // A missing schedule cannot establish that a semester is current.
  // Numeric 0 is ambiguous: older clients used it for future semesters too.
  return 'Upcoming'
}

/* export */ const cohortStart = (item = {}) => {
  const match = String(item.academicYearName ?? '').match(/(\d{4})\D+\d{2,4}/)
  const number = Number(item.semesterNumber)
  return match && Number.isInteger(number) && number > 0 ? Number(match[1]) - Math.floor((number - 1) / 2) : null
}

/* export */ const sameCohort = (left, right) => Boolean(left && right && cohortStart(left) !== null && cohortStart(right) !== null && String(left.courseId) === String(right.courseId) && String(left.branchId) === String(right.branchId) && cohortStart(left) === cohortStart(right))

/* export */ const sameCourseCohort = (left, right) => Boolean(left && right && cohortStart(left) !== null && cohortStart(right) !== null && String(left.courseId) === String(right.courseId) && cohortStart(left) === cohortStart(right))

/* export */ const branchTypeLabel = (branch = {}) => {
  const raw = String(branch.branchType ?? branch.type ?? '').trim()
  if (raw.toLowerCase() === 'core') return 'Core'
  if (raw.toLowerCase() === 'specialization') return 'Specialization'
  return raw || (branch.specialization ? 'Specialization' : '')
}

/* export */ const isActiveBranch = (branch = {}) => {
  const raw = branch.status ?? branch.branchStatus ?? branch.isActive ?? branch.active
  return raw === true || String(raw).trim() === '1' || String(raw).trim().toLowerCase() === 'active'
}

/* export */ const branchAssignments = (plan, branches, existing = []) => branches.flatMap((branch) => plan.map((row) => ({
  ...row, branchId: branch.id, branchName: branch.name, branchCode: branch.code, branchType: branchTypeLabel(branch),
}))).filter((row) => !existing.some((item) => sameCohort(item, row) && Number(item.semesterNumber) === Number(row.semesterNumber)))

/* export */ const validateSchedule = (rows) => {
  let previousEnd = ''
  for (const row of [...rows].sort((a, b) => a.semesterNumber - b.semesterNumber)) {
    const start = dateOnly(row.startDate), end = dateOnly(row.endDate)
    if ((row.startDate && !start) || (row.endDate && !end)) return `${row.semesterName}: enter valid dates.`
    if (Boolean(start) !== Boolean(end)) return `${row.semesterName}: provide both start and end dates, or leave both blank.`
    if (start && start > end) return `${row.semesterName}: end date must be on or after start date.`
    if (start && previousEnd && start <= previousEnd) return `${row.semesterName}: schedule must follow the previous semester without overlap.`
    if (end) previousEnd = end
  }
  return ''
}
// #endregion utils/semesterUtils.js
return {
  get dateOnly() { return dateOnly; },
  get deriveLifecycleStatus() { return deriveLifecycleStatus; },
  get cohortStart() { return cohortStart; },
  get sameCohort() { return sameCohort; },
  get sameCourseCohort() { return sameCourseCohort; },
  get branchTypeLabel() { return branchTypeLabel; },
  get isActiveBranch() { return isActiveBranch; },
  get branchAssignments() { return branchAssignments; },
  get validateSchedule() { return validateSchedule; }
};
})();

export const collegeImpactModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/collegeImpact.js
const fields = ['studentCount', 'facultyCount', 'departmentCount', 'courseCount', 'sectionCount', 'admissionCount']
/* export */ function normalizeCollegeImpact(impact, facultyCount) {
  if (!impact || typeof impact !== 'object') throw new Error('Unable to verify associated college data.')
  const result = Object.fromEntries(fields.map(field => {
    const raw = field === 'facultyCount' ? impact[field] ?? facultyCount : impact[field]
    const value = raw == null ? 0 : Number(raw)
    if (!Number.isFinite(value) || value < 0) throw new Error('Invalid college association count.')
    return [field, value]
  }))
  result.totalCount = Math.max(Number(impact.totalCount) || 0, fields.reduce((sum, field) => sum + result[field], 0))
  return result
}
/* export */ async function countCollegeFaculty(fetchRows, collegeId) {
  const rows = await fetchRows({ collegeId })
  if (!Array.isArray(rows)) throw new Error('Unable to verify associated faculty.')
  return rows.filter(row => String(row.collegeId ?? row.CollegeId ?? row.college_id ?? '') === String(collegeId) && !row.deletedAt && !row.DeletedAt).length
}
// #endregion utils/collegeImpact.js
return {
  get normalizeCollegeImpact() { return normalizeCollegeImpact; },
  get countCollegeFaculty() { return countCollegeFaculty; }
};
})();

export const admissionPreviewModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/admissionPreview.js
// Keep form defaults useful for inputs without presenting them as entered details.
/* export */ const admissionPreview = (data, defaults) => {
  const edited = data.previewEditedFields
  if (!edited) return data // Existing records predate field tracking.
  const project = (value, base, path = '') => {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key, project(item, base?.[key], path ? `${path}.${key}` : key),
      ]))
    }
    if (edited[path] || (path === 'academic.academicYear' && edited['academic.academicYearId'])
      || (path === 'admission.college' && edited['admission.collegeId'])) return value
    if (['fees.hostelFee', 'fees.transportFee', 'fees.scholarshipAmount'].includes(path) && Number(value) === 0) return ''
    if (['application.number', 'application.registrationNumber', 'application.date', 'application.registrationDate',
      'academic.academicYear', 'academic.academicYearId', 'admission.college', 'admission.collegeId'].includes(path)) return ''
    return value === base ? '' : value
  }
  return project(data, defaults)
}
// #endregion utils/admissionPreview.js
return {
  get admissionPreview() { return admissionPreview; }
};
})();

export const recordDetailSectionsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/recordDetailSections.js
// Explicit projections of fields already available in the corresponding detail UI.
// These helpers never spread records or serialize arbitrary API fields.
/* export */ function promotionDetailSections(record = {}) {
  const personal = record.personal || {}
  const academic = record.academic || {}
  const fullName =
    record.studentName ??
    record.fullName ??
    [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ') ??
    personal.fullName ??
    record.name ??
    'Student'

  const studentRows = [
    ['Student Name', fullName],
    ['Roll Number', record.rollNumber ?? academic.rollNumber],
    ['Registration Number', record.registrationNumber ?? record.application?.registrationNumber ?? record.application?.number],
    ['Course', record.course ?? record.courseName ?? academic.course],
    ['Branch', record.branch ?? record.branchName ?? academic.branch],
    ['Academic Year', record.academicYear ?? record.currentAcademicYear ?? academic.academicYear],
    ['College', record.college ?? record.admission?.college ?? academic.college],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '')

  const promotionRows = [
    ['Current Semester', record.fromSemester ?? record.currentSemester ?? record.semester ?? academic.semester],
    ['Next Semester', record.toSemester ?? record.nextSemester ?? record.targetSemester],
    ['Current Section', record.fromSection ?? record.currentSection ?? record.section ?? academic.section],
    ['Next Section', record.toSection ?? record.targetSection],
    ['Academic Year', record.academicYear ?? record.currentAcademicYear ?? academic.academicYear],
    ['CGPA', record.cgpa],
    ['SGPA', record.sgpa],
    ['Credits Earned', record.creditsEarned],
    ['Promotion Date', record.promotionDate],
    ['Mode', record.mode ?? record.promotionMode ?? record.promotionType],
    ['Eligibility Status', record.eligibilityLabel ?? record.eligibilityStatus ?? record.status],
    ['Remarks / Reason', record.remarks ?? record.eligibilityReason ?? record.reason],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '')

  return [
    { title: 'Student Details', rows: studentRows },
    { title: 'Promotion Details', rows: promotionRows },
  ]
}

/* export */ function admissionDetailSections(data) {
  const personal = data.personal || {}, app = data.application || {}, academic = data.academic || {}, parents = data.parents || {}
  const contact = data.contact || {}, admission = data.admission || {}, education = data.previousEducation || {}, fees = data.fees || {}
  const address = value => [value?.line1, value?.line2, value?.city, value?.district, value?.state, value?.pincode].filter(Boolean).join(', ')
  return [{ title: 'Student Basic Details', rows: [
    ['Student Name', [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ')],
    ['First Name', personal.firstName], ['Middle Name', personal.middleName], ['Last Name', personal.lastName],
    ['Gender', personal.gender], ['Date of Birth', personal.dob], ['Blood Group', personal.bloodGroup], ['Nationality', personal.nationality], ['Aadhaar Number', personal.aadhaar],
  ] }, { title: 'Contact Details', rows: [
    ['Student Email', contact.email], ['Alternate Email', contact.alternateEmail], ['Student Mobile', contact.mobile], ['Alternate Mobile', contact.alternateMobile],
    ['Current Address', address(contact.currentAddress)], ['Permanent Address', address(contact.permanentAddress)],
  ] }, { title: 'Admission Details', rows: [
    ['Registration Number', app.registrationNumber || app.number], ['Registration Date', app.registrationDate || app.date],
    ['Admission Number', app.admissionNumber], ['Admission Date', app.admissionDate],
    ['College', admission.college], ['Batch', admission.batch], ['Scholarship', admission.scholarship], ['Hostel', admission.hostel], ['Hostel Preference', admission.hostelPreference], ['Room Type / Beds', admission.hostelRoomType], ['Transportation', admission.transport], ['Transport Route', admission.transportRoute], ['Status', data.status],
  ] }, { title: 'Academic Details', rows: [
    ['Academic Year', academic.academicYear], ['Course', academic.course], ['Course Code', academic.courseCode], ['Department', academic.department], ['Branch', academic.branch], ['Branch Code', academic.branchCode],
    ['Admission Type', academic.admissionType], ['Quota', academic.quotaOther || academic.quota], ['Regulation', academic.regulation], ['Student Category', academic.studentCategory],
  ] }, { title: 'Parent Details', rows: [
    ['Father Name', parents.father?.name], ['Father Mobile', parents.father?.mobile], ['Father Email', parents.father?.email], ['Father Occupation', parents.father?.occupation], ['Father Qualification', parents.father?.qualification], ['Father Annual Income', parents.father?.income],
    ['Mother Name', parents.mother?.name], ['Mother Mobile', parents.mother?.mobile], ['Mother Email', parents.mother?.email], ['Mother Occupation', parents.mother?.occupation], ['Mother Qualification', parents.mother?.qualification], ['Mother Annual Income', parents.mother?.income],
    ['Guardian Name', parents.guardian?.name], ['Guardian Relationship', parents.guardian?.relationshipOther || parents.guardian?.relationship], ['Guardian Mobile', parents.guardian?.mobile], ['Guardian Email', parents.guardian?.email], ['Guardian Occupation', parents.guardian?.occupation], ['Guardian Qualification', parents.guardian?.qualification], ['Guardian Annual Income', parents.guardian?.income], ['Primary Contact', parents.primaryContact], ['Emergency Contact', parents.emergencyMobile],
  ] }, { title: 'Previous Education', rows: [
    ['10th Board', education.tenth?.board], ['10th School Name', education.tenth?.institution], ['10th Roll Number', education.tenth?.rollNumber], ['10th Passing Year', education.tenth?.passingYear], ['10th Score Type', education.tenth?.scoreType], ['10th Score', education.tenth?.score],
    ['Qualification', education.intermediate?.qualification], ['Board / University', education.intermediate?.board], ['College Name', education.intermediate?.institution], ['Passing Year', education.intermediate?.passingYear], ['Stream', education.intermediate?.streamOther || education.intermediate?.stream], ['Score Type', education.intermediate?.scoreType], ['Score', education.intermediate?.score],
  ] }, { title: 'Fee Details', rows: [
    ['Tuition Fee (per year)', fees.tuitionFee], ['Admission Fee (one-time)', fees.admissionFee], ['Scholarship Deduction', fees.scholarshipAmount], ['Hostel Fee (per year)', fees.hostelFee], ['Transportation Fee (per year)', fees.transportFee], ['Estimated First-Year Total', fees.totalFee], ['Payment Preference', fees.paymentPlan], ['Payment Status', fees.paymentStatus],
  ] }]
}

/* export */ const sectionsFromColumns = (title, record, columns) => [{ title, rows: columns.map(column => [column.label, typeof column.value === 'function' ? column.value(record) : record[column.value]]) }]
// #endregion utils/recordDetailSections.js
return {
  get promotionDetailSections() { return promotionDetailSections; },
  get admissionDetailSections() { return admissionDetailSections; },
  get sectionsFromColumns() { return sectionsFromColumns; }
};
})();

export const feeStructureServiceModule = (() => {
const { collegeStorageKey } = collegeScopeModule;
const { selectedCollegeId } = collegeScopeModule;
/* Imports for isolated regression tests:
import { collegeStorageKey, selectedCollegeId } from '../../utils/collegeScope.js'
*/
// #region pages/fees/feeStructureService.js
const ACADEMIC_KEY = 'pirnav-fee-structures-v3'
const LEGACY_KEY = 'pirnav-fee-structures-v2'
const HOSTEL_KEY = 'pirnav-hostel-fee-structures-v1'
const TRANSPORT_KEY = 'pirnav-transport-fee-structures-v1'

const parse = key => {
  const raw = localStorage.getItem(collegeStorageKey(key))
  if (!raw) return []
  const rows = JSON.parse(raw)
  if (!Array.isArray(rows)) throw new Error('Saved fee configuration is invalid. Restore the saved data before making changes.')
  return rows
}
const write = (key, rows, event) => { localStorage.setItem(collegeStorageKey(key), JSON.stringify(rows.map(row => ({ ...row, collegeId: selectedCollegeId() })))); window.dispatchEvent(new Event(event)); return rows }
const number = value => Number(value) || 0
/* export */ const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number(value))
/* export */ const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
/* export */ const feeComponent = () => ({ id: uid('FC'), feeHeadId: '', name: '', category: 'Academic', amount: '', frequency: 'Per Semester', requirement: 'Mandatory', refundable: 'Non-refundable', concessionAllowed: false, fineApplicable: false, dueRule: '', status: 'Active' })
/* export */ const componentTotals = items => (items || []).reduce((totals, component) => {
  const amount = cents(component.amount)
  const category = component.refundable === 'Refundable' ? 'refundable' : component.requirement === 'Optional' ? 'optional' : 'mandatory'
  totals[category] = rupees(cents(totals[category]) + amount)
  totals.total = rupees(cents(totals.total) + amount)
  return totals
}, { mandatory: 0, optional: 0, refundable: 0, total: 0 })

/* export */ const workflowAcademicRow = structure => ({
  ...structure,
  workflowStructure: structure,
  code: structure.code || structure.id,
  feePeriod: structure.cycle === 'Semester-wise' ? 'Per Semester' : 'Per Academic Year',
  feeComponents: structure.components.map(component => ({
    ...component,
    requirement: component.mandatory === false ? 'Optional' : 'Mandatory',
    refundable: component.refundable ? 'Refundable' : 'Non-refundable',
  })),
  quota: structure.category || '',
  effectiveFrom: '',
  effectiveTo: '',
})

const codePart = value => { const words = String(value || '').match(/[A-Za-z0-9]+/g) || []; return (words.length > 1 ? words.map(x => x[0]).join('') : words[0] || '').slice(0, 7).toUpperCase() }
/* export */ const structureName = s => [s.courseName, s.branchName, s.feePeriod === 'Per Semester' ? s.semesterName : s.yearOfStudy, s.quota, s.academicYearName].filter(Boolean).join(' - ')
/* export */ const structureCode = s => ['FS', codePart(s.courseName), codePart(s.branchName), s.feePeriod === 'Per Semester' ? codePart(s.semesterName) : codePart(s.yearOfStudy), codePart(s.quota), String(s.academicYearName || '').replace(/\D/g, '').slice(-4), `V${s.version || 1}`].filter(Boolean).join('-')
/* export */ const blankAcademic = () => ({ id: '', name: '', code: '', version: 1, academicYearId: '', academicYearName: '', departmentId: '', departmentName: '', courseId: '', courseName: '', branchId: '', branchName: '', feePeriod: 'Per Semester', yearOfStudy: '', semesterId: '', semesterName: '', admissionType: 'Regular', quota: 'Convener', studentCategory: '', effectiveFrom: '', effectiveTo: '', feeComponents: [feeComponent()], paymentPlan: { mode: 'Full Payment', allocationMode: 'Amount', dueDate: '', includeRefundable: false, installments: [] }, fineRules: { type: 'No Fine', gracePeriod: '', value: '', maximumFine: '', applicableComponentIds: [] }, concessionPolicy: { allowed: false, eligibleComponentIds: [] }, status: 'Draft', assignedCount: 0 })
const normalizeComponent = x => ({ ...feeComponent(), ...x, category: x.category === 'Academic Fees' ? 'Academic' : x.category })
/* export */ const normalizeAcademic = row => {
  const base = blankAcademic()
  const legacy = [...(row.components || []), ...(row.otherFees || [])]
  let feeComponents = (row.feeComponents?.length ? row.feeComponents : legacy).map(normalizeComponent)
  if (!feeComponents.length && row.branchFees?.[0]?.amount) feeComponents = [{ ...feeComponent(), name: 'Tuition Fee', amount: row.branchFees[0].amount }]
  const paymentPlan = row.paymentPlan && typeof row.paymentPlan === 'object' ? row.paymentPlan : { mode: row.paymentMode || 'Full Payment', dueDate: row.dueDate || '', installments: row.installments || [] }
  const normalized = { ...base, ...row, feeComponents, paymentPlan: { ...base.paymentPlan, ...paymentPlan }, fineRules: { ...base.fineRules, ...(row.fineRules || row.lateFee || {}) }, concessionPolicy: { ...base.concessionPolicy, ...row.concessionPolicy } }
  delete normalized.branchFees; delete normalized.components; delete normalized.otherFees; delete normalized.hostel; delete normalized.transport; delete normalized.installments; delete normalized.lateFee; delete normalized.paymentMode; delete normalized.dueDate
  normalized.name = normalized.name || structureName(normalized); normalized.code = normalized.code || structureCode(normalized)
  return normalized
}
/* export */ const readStructures = () => {
  const current = parse(ACADEMIC_KEY)
  if (current.length) return current.map(normalizeAcademic)
  const legacy = parse(LEGACY_KEY).map(normalizeAcademic)
  if (legacy.length) write(ACADEMIC_KEY, legacy, 'fee-structures-updated')
  return legacy
}
/* export */ const persistStructures = rows => write(ACADEMIC_KEY, rows.map(normalizeAcademic), 'fee-structures-updated')
const same = (a, b) => String(a || '') === String(b || '')
/* export */ const applicabilityKey = s => [s.academicYearId || s.academicYearName, s.departmentId || s.departmentName, s.courseId || s.courseName, s.branchId || s.branchName, s.feePeriod, s.feePeriod === 'Per Semester' ? s.semesterId || s.semesterName : s.yearOfStudy, s.admissionType, s.quota, s.studentCategory || '*'].map(String).join('|')
const dateValue = (value, fallback) => value ? new Date(`${value}T00:00:00`).getTime() : fallback
/* export */ const periodsOverlap = (a, b) => dateValue(a.effectiveFrom, -Infinity) <= dateValue(b.effectiveTo, Infinity) && dateValue(b.effectiveFrom, -Infinity) <= dateValue(a.effectiveTo, Infinity)
/* export */ const findConflict = (rows, candidate) => rows.find(x => x.id !== candidate.id && x.status === 'Active' && candidate.status === 'Active' && applicabilityKey(x) === applicabilityKey(candidate) && periodsOverlap(x, candidate))
/* export */ const matchesStructure = (s, a, onDate = new Date().toISOString().slice(0, 10)) => s.status === 'Active' && same(s.academicYearName, a.academicYear) && same(s.departmentName, a.department) && same(s.courseName, a.course) && same(s.branchName, a.branch) && same(s.admissionType, a.entryType || a.admissionType) && (s.quota === 'Other' ? a.quota === 'Other' : same(s.quota, a.quota)) && (!s.studentCategory || same(s.studentCategory, a.studentCategory)) && (s.feePeriod === 'Per Semester' ? same(s.semesterName, a.semester) : same(s.yearOfStudy, a.yearOfStudy)) && dateValue(s.effectiveFrom, -Infinity) <= dateValue(onDate, Infinity) && dateValue(s.effectiveTo, Infinity) >= dateValue(onDate, -Infinity)
/* export */ const saveAcademic = (rows, value, createVersion = false) => {
  const previous = rows.find(row => row.id === value.id)
  if (previous && !createVersion && (previous.status !== 'Draft' || Number(previous.assignedCount) > 0)) return { error: 'Historical structures cannot be edited. Duplicate as a draft or create a new version.' }
  const nextValue = normalizeAcademic({ ...value, collegeId: selectedCollegeId(), id: createVersion || !value.id ? uid('FS') : value.id, assignedCount: createVersion || !value.id ? 0 : value.assignedCount, version: createVersion ? number(value.version) + 1 : number(value.version) || 1, updatedAt: new Date().toISOString() })
  if (!nextValue.feeComponents.length || nextValue.feeComponents.some(component => !component.name?.trim() || !validAmount(component.amount))) return { error: 'Fee heads require positive amounts with at most two decimal places.' }
  if (!validDate(nextValue.effectiveFrom) || (nextValue.effectiveTo && (!validDate(nextValue.effectiveTo) || nextValue.effectiveTo < nextValue.effectiveFrom))) return { error: 'Enter valid, chronological effective dates.' }
  const plan = nextValue.paymentPlan
  if (plan.mode === 'Full Payment' && !validDate(plan.dueDate)) return { error: 'Enter a valid payment due date.' }
  if (plan.mode !== 'Full Payment') {
    const percentage = plan.allocationMode === 'Percentage'
    const field = percentage ? 'percentage' : 'amount'
    if (!plan.installments.length || plan.installments.some((installment, index) => !validDate(installment.dueDate) || !validAmount(installment[field]) || (index > 0 && installment.dueDate < plan.installments[index - 1].dueDate))) return { error: 'Every installment needs a valid amount and chronological due date.' }
    const totals = componentTotals(nextValue.feeComponents)
    const target = percentage ? 10000 : cents(totals.mandatory + (plan.includeRefundable ? totals.refundable : 0))
    if (plan.installments.reduce((sum, installment) => sum + cents(installment[field]), 0) !== target) return { error: 'Installment allocations must equal the payable fee or 100% exactly.' }
  }
  nextValue.name = structureName(nextValue); nextValue.code = structureCode(nextValue)
  const conflict = findConflict(rows, nextValue); if (conflict) return { error: `Active effective period overlaps ${conflict.code}.` }
  const next = [nextValue, ...rows.filter(x => x.id !== nextValue.id)]
  persistStructures(next); return { rows: next, value: nextValue }
}
/* export */ const readHostelStructures = () => parse(HOSTEL_KEY)
/* export */ const persistHostelStructures = rows => write(HOSTEL_KEY, rows, 'hostel-fees-updated')
/* export */ const readTransportStructures = () => parse(TRANSPORT_KEY)
/* export */ const persistTransportStructures = rows => write(TRANSPORT_KEY, rows, 'transport-fees-updated')

// The new workflow is a separate, explicitly local workspace until matching
// backend write contracts exist. Never mix its preview receipts with server money.
const WORKSPACE_KEY = 'pirnav-fee-workspace-v1'
/* export */ const cents = value => Math.round(Number(value || 0) * 100)
/* export */ const rupees = value => value / 100
/* export */ const feeMoney = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value || 0))
/* export */ const feeToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
/* export */ const emptyFeeWorkspace = () => ({ revision: 0, components: [], structures: [], assignments: [], payments: [], concessions: [], refunds: [] })
/* export */ function readFeeWorkspace(collegeId) {
  const raw = localStorage.getItem(collegeStorageKey(WORKSPACE_KEY, collegeId))
  if (!raw) return emptyFeeWorkspace()
  const state = JSON.parse(raw)
  if (!state || !['components', 'structures', 'assignments', 'payments', 'concessions', 'refunds'].every(key => Array.isArray(state[key]))) throw new Error('Fee workspace could not be read. Restore its saved data before making changes.')
  return state
}
/* export */ function writeFeeWorkspace(state, collegeId) {
  if (!collegeId) throw new Error('Select a college first.')
  const current = readFeeWorkspace(collegeId)
  if (current.revision !== state.revision) throw new Error('Fees changed in another tab. Reload before saving.')
  const next = { ...state, revision: state.revision + 1 }
  localStorage.setItem(collegeStorageKey(WORKSPACE_KEY, collegeId), JSON.stringify(next))
  return next
}
/* export */ const newFeeStructure = (yearId = '') => ({ id: '', name: '', version: 1, status: 'Draft', academicYearId: yearId, courseId: '', branchId: '', batch: '', category: '', applicableTo: 'All Students', cycle: 'Yearly', semesterId: '', components: [], discount: 0, plan: 'Full Payment', dueDate: '', installments: [], grace: 0, penaltyType: 'None', penaltyValue: 0, maximumPenalty: '', audit: [] })
/* export */ const hasSingleStructureFee = structure => !structure.components.length || (structure.components.length === 1 && structure.components[0].masterId === 'structure-total-fee')
/* export */ function structureTotalFeeComponents(structure, amount) {
  if (!hasSingleStructureFee(structure)) throw new Error('Existing fee breakdown and refund rules must be preserved.')
  return [{ masterId: 'structure-total-fee', name: 'Total Fee', category: 'Academic', amount, mandatory: true, refundable: false, recurring: true, frequency: structure.cycle }]
}
/* export */ const academicFeeComponent = component => !['Hostel', 'Transport'].includes(component.domain || component.category)
const structureComponentsActive = (state, structure) => structure.components.every(component =>
  (component.masterId === 'structure-total-fee' && component.name === 'Total Fee' && component.category === 'Academic' && component.mandatory === true && component.refundable === false) ||
  (academicFeeComponent(component) && state.components.some(master => master.id === component.masterId && master.status === 'Active' && academicFeeComponent(master))))
/* export */ const feeTotal = structure => rupees(structure.components.reduce((sum, row) => sum + cents(row.amount), 0) - cents(structure.discount))
const fail = message => { throw new Error(message) }
const validAmount = (value, zero = false) => Number.isFinite(Number(value)) && (zero ? Number(value) >= 0 : Number(value) > 0) && Number(value) <= 100000000 && Math.abs(Number(value) * 100 - cents(value)) < 0.00001
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
/* export */ function validateFeeStructure(s, step = 3) {
  if (s.domain && s.domain !== 'Academic') return 'Use the service-specific fee workflow; facility allocation is not available in academic assignment.'
  if (!s.name.trim() || !s.academicYearId || !s.courseId || !s.branchId || !s.batch.trim()) return 'Complete the structure name, academic year, course, branch and batch.'
  if (s.applicableTo === 'Selected Category' && !s.category) return 'Select an admission category / quota.'
  if (s.cycle === 'Semester-wise' && !s.semesterId) return 'Select an applicable semester.'
  if (step < 1) return ''
  if (!s.components.length || s.components.some(c => !c.masterId || !validAmount(c.amount))) return 'Select fee components and enter positive amounts with at most two decimal places.'
  if (s.components.some(c => !academicFeeComponent(c))) return 'Hostel and Transport components cannot be included in an academic structure.'
  if (new Set(s.components.map(c => c.masterId)).size !== s.components.length) return 'A fee component can only be added once.'
  if (!validAmount(s.discount, true) || feeTotal(s) <= 0) return 'Concession must be non-negative and less than the subtotal.'
  if (step < 2) return ''
  if (s.plan === 'Full Payment' && !validDate(s.dueDate)) return 'Enter a valid payment due date.'
  if (s.plan === 'Installment Plan') {
    if (!s.installments.length || s.installments.some(i => !validDate(i.dueDate) || !validAmount(i.amount))) return 'Every installment needs a valid due date and positive amount.'
    if (s.installments.some((i, n) => n > 0 && i.dueDate < s.installments[n - 1].dueDate)) return 'Installment due dates must be in chronological order.'
    if (s.installments.reduce((sum, i) => sum + cents(i.amount), 0) !== cents(feeTotal(s))) return 'Installment amounts must equal the total fee exactly.'
  }
  if (!Number.isInteger(Number(s.grace)) || Number(s.grace) < 0 || Number(s.grace) > 365) return 'Grace period must be a whole number from 0 to 365 days.'
  if (s.penaltyType !== 'None' && (!validAmount(s.penaltyValue) || (s.penaltyType === 'Percentage' && Number(s.penaltyValue) > 100))) return 'Enter a valid penalty value (percentage cannot exceed 100).'
  if (s.maximumPenalty !== '' && !validAmount(s.maximumPenalty, true)) return 'Maximum penalty must be a non-negative amount.'
  return ''
}
/* export */ function checkDuplicateStructure(existingStructures = [], candidate) {
  if (!candidate || !candidate.academicYearId || !candidate.courseId || !candidate.branchId || !candidate.batch?.trim()) {
    return null
  }
  return existingStructures.find(s =>
    s.id !== candidate.id &&
    s.status !== 'Archived' &&
    String(s.academicYearId) === String(candidate.academicYearId) &&
    String(s.courseId) === String(candidate.courseId) &&
    String(s.branchId) === String(candidate.branchId) &&
    String(s.batch || '').trim().toLowerCase() === String(candidate.batch || '').trim().toLowerCase() &&
    (s.cycle || 'Yearly') === (candidate.cycle || 'Yearly') &&
    (candidate.cycle !== 'Semester-wise' || String(s.semesterId || '') === String(candidate.semesterId || '')) &&
    (candidate.applicableTo === 'All Students' || s.applicableTo === 'All Students' || String(s.category || '') === String(candidate.category || ''))
  ) || null
}

/* export */ const feeTransitions = { Draft: ['Pending Approval'], 'Pending Approval': ['Approved', 'Draft'], Approved: ['Published', 'Draft'], Published: ['Archived'], Archived: [] }
/* export */ function saveWorkflowStructure(state, value, status, actor) {
  const previous = state.structures.find(s => s.id === value.id)
  if (previous && (previous.status !== 'Draft' || state.assignments.some(a => a.structureId === previous.id))) fail('Only unassigned drafts can be edited. Create a revision instead.')
  if (!value.name.trim()) fail('Structure name is required to save a draft.')
  if (!['Draft', 'Pending Approval'].includes(status)) fail('Submit the draft for approval before publishing.')
  if (status !== 'Draft') {
    const error = validateFeeStructure(value)
    if (error) fail(error)
    if (!structureComponentsActive(state, value)) fail('All selected fee components must be active in the master.')
    if (checkDuplicateStructure(state.structures, value)) fail('An overlapping fee structure already exists. Revise or archive it before submitting another.')
  }
  const saved = { ...structuredClone(value), id: value.id || uid('FS'), status, audit: [...(previous?.audit || []), { status, actor, at: new Date().toISOString() }] }
  return { ...state, structures: [saved, ...state.structures.filter(s => s.id !== saved.id)] }
}
/* export */ function transitionFeeStructure(state, id, status, actor) {
  const s = state.structures.find(row => row.id === id)
  if (!s || !feeTransitions[s.status]?.includes(status)) fail('That status transition is not allowed.')
  if (status !== 'Draft' && status !== 'Archived') {
    const error = validateFeeStructure(s)
    if (error) fail(error)
    if (!structureComponentsActive(state, s)) fail('A component is inactive or missing. Return the structure to draft.')
    if (checkDuplicateStructure(state.structures, s)) fail('An overlapping fee structure already exists. Revise or archive it before submitting another.')
  }
  return { ...state, structures: state.structures.map(row => row.id === id ? { ...row, status, audit: [...row.audit, { status, actor, at: new Date().toISOString() }] } : row) }
}
/* export */ function saveFeeComponent(state, component) {
  if (!component.name.trim() || !component.code.trim() || !component.category) fail('Component name, code and category are required.')
  if (state.components.some(c => c.id !== component.id && c.code.toLowerCase() === component.code.trim().toLowerCase())) fail('Component code must be unique.')
  const row = { ...component, id: component.id || uid('FC'), name: component.name.trim(), code: component.code.trim().toUpperCase() }
  return { ...state, components: [row, ...state.components.filter(c => c.id !== row.id)] }
}
/* export */ const studentMatchesFee = (student, s) => (!s.domain || s.domain === 'Academic') && ['academicYearId', 'courseId', 'branchId', 'batch'].every(k => Boolean(s[k]) && String(student[k] || '') === String(s[k])) && (s.cycle !== 'Semester-wise' || (Boolean(s.semesterId) && String(student.semesterId) === String(s.semesterId))) && (s.applicableTo !== 'Selected Category' || (Boolean(s.category) && student.category === s.category))
/* export */ function assignFeeStructure(state, structureId, students) {
  const s = state.structures.find(row => row.id === structureId)
  if (!s || s.status !== 'Published') fail('Only published structures can be assigned.')
  if (!students.length || new Set(students.map(s => s.id)).size !== students.length) fail('Select students once each.')
  if (students.some(student => !studentMatchesFee(student, s))) fail('One or more students do not match the structure academic scope.')
  if (students.some(student => state.assignments.some(a => a.student.id === student.id && String(a.structure.academicYearId) === String(s.academicYearId) && (s.cycle === 'Yearly' || a.structure.cycle === 'Yearly' || String(a.structure.semesterId) === String(s.semesterId))))) fail('A student already has a fee assignment for this academic period.')
  return { ...state, assignments: [...state.assignments, ...students.map(student => ({ id: uid('FA'), structureId, student: structuredClone(student), structure: structuredClone(s), at: new Date().toISOString() }))] }
}
// Largest-remainder allocation keeps all fee arithmetic exact to the paise.
/* export */ function allocatePaise(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum) return weights.map(() => 0)
  const raw = weights.map(w => total * w / sum), result = raw.map(Math.floor)
  let left = total - result.reduce((a, b) => a + b, 0)
  raw.map((v, i) => ({ i, fraction: v - result[i] })).sort((a, b) => b.fraction - a.fraction).forEach(({ i }) => { if (left > 0) { result[i]++; left-- } })
  return result
}
/* export */ function feeLedger(state, assignment, today = feeToday()) {
  const s = assignment.structure, total = cents(feeTotal(s))
  const components = allocatePaise(total, s.components.map(c => cents(c.amount)))
  const schedule = s.plan === 'Full Payment' ? [{ id: 'full', dueDate: s.dueDate, amount: feeTotal(s) }] : s.installments
  const remaining = [...components], cells = []
  schedule.forEach((installment, n) => {
    const parts = n === schedule.length - 1 ? [...remaining] : allocatePaise(cents(installment.amount), remaining)
    parts.forEach((amount, i) => { remaining[i] -= amount; cells.push({ id: `${installment.id}:${s.components[i].masterId}`, installmentId: installment.id, installment: n + 1, dueDate: installment.dueDate, componentId: s.components[i].masterId, name: s.components[i].name, refundable: s.components[i].refundable, amount, paid: 0, concession: 0 }) })
  })
  const payments = state.payments.filter(p => p.assignmentId === assignment.id)
  const refunds = state.refunds.filter(r => r.assignmentId === assignment.id && r.status === 'Approved')
  const concessions = state.concessions.filter(c => c.assignmentId === assignment.id && c.status === 'Approved')
  cells.forEach(cell => {
    cell.paid = payments.reduce((sum, p) => sum + (p.allocations[cell.id] || 0), 0) - refunds.reduce((sum, r) => sum + (r.allocations?.[cell.id] || 0), 0)
    cell.concession = concessions.reduce((sum, c) => sum + (c.allocations?.[cell.id] || 0), 0)
    cell.balance = cell.amount - cell.concession - cell.paid
    const lateDate = new Date(`${cell.dueDate}T00:00:00Z`)
    lateDate.setUTCDate(lateDate.getUTCDate() + Number(s.grace || 0))
    cell.overdue = cell.balance > 0 && today > lateDate.toISOString().slice(0, 10)
    cell.status = cell.balance === 0 ? 'Paid' : cell.overdue ? 'Overdue' : cell.paid > 0 ? 'Partially Paid' : 'Pending'
  })
  const paid = cells.reduce((sum, c) => sum + c.paid, 0), concession = cells.reduce((sum, c) => sum + c.concession, 0), overdue = cells.filter(c => c.overdue).reduce((sum, c) => sum + c.balance, 0)
  let penalty = overdue && s.penaltyType !== 'None' ? (s.penaltyType === 'Fixed Amount' ? cents(s.penaltyValue) : Math.round(overdue * Number(s.penaltyValue) / 100)) : 0
  if (s.maximumPenalty !== '') penalty = Math.min(penalty, cents(s.maximumPenalty))
  return { cells, total, paid, concession, outstanding: total - concession - paid, overdue, penalty, payments, refunds }
}
function waterfall(cells, amount, key = 'balance') {
  let remaining = amount
  const allocations = {}
  for (const cell of cells) { const part = Math.min(remaining, cell[key]); if (part > 0) allocations[cell.id] = part; remaining -= part }
  if (remaining) fail('Amount exceeds the eligible balance.')
  return allocations
}
/* export */ function collectWorkspacePayment(state, input, actor) {
  const assignment = state.assignments.find(a => a.id === input.assignmentId)
  if (!assignment) fail('Select a fee assignment.')
  if (!validAmount(input.amount)) fail('Enter a positive payment with at most two decimal places.')
  if (!validDate(input.date) || input.date > feeToday()) fail('Payment date must be valid and cannot be in the future.')
  if (!['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Online Gateway'].includes(input.mode)) fail('Select a payment mode.')
  if (input.mode !== 'Cash' && !input.reference?.trim()) fail('Transaction reference is required for non-cash payments.')
  if (input.reference?.trim() && state.payments.some(p => p.reference === input.reference.trim() && p.mode === input.mode)) fail('This transaction reference has already been recorded.')
  const ledger = feeLedger(state, assignment), cells = ledger.cells.filter(c => (!input.installmentId || c.installmentId === input.installmentId) && (!input.componentId || c.componentId === input.componentId))
  const allocations = waterfall(cells, cents(input.amount))
  const payment = { ...input, reference: input.reference?.trim() || '', amount: rupees(cents(input.amount)), allocations, id: uid('PAY'), receipt: `PREVIEW-${String(state.payments.length + 1).padStart(6, '0')}`, actor, at: new Date().toISOString() }
  return { ...state, payments: [payment, ...state.payments] }
}
/* export */ function saveFeeAdjustment(state, kind, input) {
  if (!['concessions', 'refunds'].includes(kind)) fail('Invalid adjustment type.')
  const assignment = state.assignments.find(a => a.id === input.assignmentId)
  if (!assignment || !input.reason?.trim() || !validAmount(input.value)) fail('Select a student, enter a positive value and provide a reason.')
  if (input.unit === 'Percentage' && Number(input.value) > 100) fail('Percentage cannot exceed 100.')
  if (kind === 'refunds' && !state.payments.some(p => p.id === input.paymentId && p.assignmentId === input.assignmentId)) fail('Select the original payment.')
  if (kind === 'refunds' && cents(input.value) > refundablePaymentAmount(state, assignment, input.paymentId)) fail('Refund cannot exceed the remaining refundable amount of the original payment.')
  if (kind === 'concessions') {
    const ledger = feeLedger(state, assignment)
    const amount = input.unit === 'Percentage' ? Math.round(ledger.total * Number(input.value) / 100) : cents(input.value)
    if (amount <= 0 || amount > ledger.outstanding) fail('Concession must be positive and cannot exceed the remaining unpaid fee balance.')
  }
  const row = { ...input, id: uid(kind === 'refunds' ? 'RF' : 'SC'), status: 'Draft', at: new Date().toISOString() }
  return { ...state, [kind]: [row, ...state[kind]] }
}
/* export */ function refundablePaymentAmount(state, assignment, paymentId) {
  const payment = state.payments.find(row => row.id === paymentId && row.assignmentId === assignment.id)
  if (!payment) return 0
  const ledger = feeLedger(state, assignment)
  const prior = ledger.refunds.filter(row => row.paymentId === paymentId)
  return ledger.cells.filter(cell => cell.refundable).reduce((total, cell) =>
    total + Math.max(0, Math.min(cell.paid, (payment.allocations[cell.id] || 0) - prior.reduce((sum, row) => sum + (row.allocations[cell.id] || 0), 0))), 0)
}
/* export */ function transitionFeeAdjustment(state, kind, id, status, actor) {
  const row = state[kind].find(r => r.id === id)
  if (!row || !({ Draft: ['Submitted'], Submitted: ['Approved', 'Rejected'] }[row.status] || []).includes(status)) fail('Invalid approval transition.')
  let allocations = row.allocations, amount = row.amount
  if (status === 'Approved') {
    const assignment = state.assignments.find(a => a.id === row.assignmentId), ledger = feeLedger(state, assignment)
    if (kind === 'concessions') {
      amount = row.unit === 'Percentage' ? Math.round(ledger.total * Number(row.value) / 100) : cents(row.value)
      if (amount <= 0 || amount > ledger.outstanding) fail('Concession must be positive and cannot exceed the remaining unpaid fee balance.')
      allocations = waterfall(ledger.cells, amount)
    } else {
      const payment = state.payments.find(p => p.id === row.paymentId)
      const prior = state.refunds.filter(r => r.paymentId === payment.id && r.status === 'Approved')
      const eligible = ledger.cells.filter(c => c.refundable).map(c => ({ ...c, eligible: Math.min(c.paid, (payment.allocations[c.id] || 0) - prior.reduce((sum, r) => sum + (r.allocations[c.id] || 0), 0)) }))
      amount = cents(row.value)
      allocations = waterfall(eligible, amount, 'eligible')
    }
  }
  return { ...state, [kind]: state[kind].map(r => r.id === id ? { ...r, status, allocations, amount, approvedBy: ['Approved', 'Rejected'].includes(status) ? actor : '', updatedAt: new Date().toISOString() } : r) }
}
// #endregion pages/fees/feeStructureService.js
return {
  get money() { return money; },
  get refundablePaymentAmount() { return refundablePaymentAmount; },
  get uid() { return uid; },
  get feeComponent() { return feeComponent; },
  get componentTotals() { return componentTotals; },
  get workflowAcademicRow() { return workflowAcademicRow; },
  get structureName() { return structureName; },
  get structureCode() { return structureCode; },
  get blankAcademic() { return blankAcademic; },
  get normalizeAcademic() { return normalizeAcademic; },
  get readStructures() { return readStructures; },
  get persistStructures() { return persistStructures; },
  get applicabilityKey() { return applicabilityKey; },
  get periodsOverlap() { return periodsOverlap; },
  get findConflict() { return findConflict; },
  get matchesStructure() { return matchesStructure; },
  get saveAcademic() { return saveAcademic; },
  get readHostelStructures() { return readHostelStructures; },
  get persistHostelStructures() { return persistHostelStructures; },
  get readTransportStructures() { return readTransportStructures; },
  get persistTransportStructures() { return persistTransportStructures; },
  get cents() { return cents; },
  get rupees() { return rupees; },
  get feeMoney() { return feeMoney; },
  get feeToday() { return feeToday; },
  get emptyFeeWorkspace() { return emptyFeeWorkspace; },
  get readFeeWorkspace() { return readFeeWorkspace; },
  get writeFeeWorkspace() { return writeFeeWorkspace; },
  get newFeeStructure() { return newFeeStructure; },
  get hasSingleStructureFee() { return hasSingleStructureFee; },
  get structureTotalFeeComponents() { return structureTotalFeeComponents; },
  get academicFeeComponent() { return academicFeeComponent; },
  get feeTotal() { return feeTotal; },
  get validateFeeStructure() { return validateFeeStructure; },
  get checkDuplicateStructure() { return checkDuplicateStructure; },
  get feeTransitions() { return feeTransitions; },
  get saveWorkflowStructure() { return saveWorkflowStructure; },
  get transitionFeeStructure() { return transitionFeeStructure; },
  get saveFeeComponent() { return saveFeeComponent; },
  get studentMatchesFee() { return studentMatchesFee; },
  get assignFeeStructure() { return assignFeeStructure; },
  get allocatePaise() { return allocatePaise; },
  get feeLedger() { return feeLedger; },
  get collectWorkspacePayment() { return collectWorkspacePayment; },
  get saveFeeAdjustment() { return saveFeeAdjustment; },
  get transitionFeeAdjustment() { return transitionFeeAdjustment; }
};
})();

export const facultyAttendanceModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/facultyAttendance.js
/* export */ const localAttendanceDate = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
/* export */ const attendanceStatusLabel = status => status === 'LOP' ? 'Loss of Pay' : status
/* export */ const attendanceFacultyMap = (faculty = []) => {
  const map = new Map()
  const aliases = new Map()
  // Reserve every faculty primary key before considering IDs from other tables.
  for (const member of faculty) {
    const id = String(member.id ?? member.facultyId ?? '')
    if (!id) continue
    map.set(id, id)
    if (member.facultyId) map.set(String(member.facultyId), id)
    for (const value of [
      member.employeeProfileId,
      member.EmployeeProfileId,
      member.employeeId,
      member.EmployeeId,
      member.facultyCode,
      member.FacultyCode,
      member.employeeCode,
      member.EmployeeCode,
      member.code,
      member.Code,
      member.employeeNo,
      member.EmployeeNo,
    ]) {
      if (!value) continue
      const alias = String(value).trim()
      if (!alias) continue
      if (!aliases.has(alias)) aliases.set(alias, id)
      else if (aliases.get(alias) !== id) aliases.set(alias, null)

      const numMatch = alias.match(/(\d+)$/)
      if (numMatch) {
        const num = String(parseInt(numMatch[1], 10))
        if (!aliases.has(num)) aliases.set(num, id)
      }
    }
  }
  for (const [alias, id] of aliases) if (id && !map.has(alias)) map.set(alias, id)
  return map
}
// Weekly/monthly cells need dated daily records, not aggregate totals.
/* export */ const loadDailyAttendancePeriod = async (getDaily, from, to, lastDate = localAttendanceDate(new Date())) => {
  const dates = []
  const end = to < lastDate ? to : lastDate
  for (const day = new Date(`${from}T00:00:00`); localAttendanceDate(day) <= end; day.setDate(day.getDate() + 1)) {
    dates.push(localAttendanceDate(day))
  }
  const records = []
  for (let offset = 0; offset < dates.length; offset += 4) {
    const batches = await Promise.all(dates.slice(offset, offset + 4).map(async date => {
      const rows = await getDaily({ date })
      return rows.map(row => normalizeAttendanceRow(row, { daily: true, date }))
    }))
    records.push(...batches.flat())
  }
  return records
}
/* export */ const normalizeAttendanceRow = (row, { daily = false, date = '' } = {}) => {
  if (!row || typeof row !== 'object') return row
  const statuses = { p: 'Present', present: 'Present', a: 'Absent', absent: 'Absent', l: 'Late', late: 'Late', hd: 'Half Day', halfday: 'Half Day', ol: 'On Leave', onleave: 'On Leave', leave: 'On Leave', lop: 'LOP', lossofpay: 'LOP', notmarked: 'Not Marked', unmarked: 'Not Marked', pending: 'Not Marked' }
  // A merged/saved canonical status takes precedence over stale API aliases.
  // Numeric API statuses still use the accompanying readable status name.
  const statusValues = [row.status, row.Status, row.statusName, row.StatusName, row.attendanceStatus, row.AttendanceStatus]
  const statusText = String(statusValues.find(value => statuses[String(value ?? '').trim().toLowerCase().replace(/[\s_-]/g, '')]) ?? 'Not Marked').trim()
  const rawFacultyId = row.facultyId ?? row.FacultyId ?? row.faculty?.facultyId ?? row.faculty?.FacultyId ?? row.faculty?.id ?? row.faculty?.Id ?? row.employeeProfileId ?? row.EmployeeProfileId ?? row.facultyProfileId ?? row.FacultyProfileId ?? row.employeeProfile?.id ?? row.employeeProfile?.Id ?? (daily ? (row.id ?? row.Id) : '') ?? ''
  const hasExplicitFacultyId = Boolean(row.facultyId ?? row.FacultyId ?? row.faculty?.facultyId ?? row.faculty?.FacultyId ?? row.faculty?.id ?? row.faculty?.Id ?? row.employeeProfileId ?? row.EmployeeProfileId ?? row.facultyProfileId ?? row.FacultyProfileId ?? row.employeeProfile?.id ?? row.employeeProfile?.Id)
  const attendanceId = row.attendanceId ?? row.AttendanceId ?? row.facultyAttendanceId ?? row.FacultyAttendanceId ?? (hasExplicitFacultyId && row.id && String(row.id) !== String(rawFacultyId) ? (row.id ?? row.Id) : null) ?? (!daily ? (row.id ?? row.Id) : null)
  const time = value => {
    if (!value || value === '-') return ''
    const str = String(value).trim()
    return str.includes('T') ? str.split('T')[1].slice(0, 5) : str.length >= 5 ? str.slice(0, 5) : str
  }
  const attendanceDate = String(row.attendanceDate ?? row.AttendanceDate ?? row.date ?? row.Date ?? date).slice(0, 10)
  const remarks = row.remarks ?? row.Remarks ?? ''

  return {
    ...row,
    id: attendanceId || '',
    attendanceId: attendanceId || null,
    facultyId: String(rawFacultyId),
    date: attendanceDate,
    status: statuses[statusText.toLowerCase().replace(/[\s_-]/g, '')] || statusText,
    checkIn: time(row.checkIn ?? row.CheckIn ?? row.checkInTime ?? row.CheckInTime),
    checkOut: time(row.checkOut ?? row.CheckOut ?? row.checkOutTime ?? row.CheckOutTime),
    remarks: remarks || '-',
    synthetic: !attendanceId,
  }
}
/* export */ const combineAttendance = (...collections) => {
  const statusPriority = { Present: 5, Late: 4, 'Half Day': 4, 'On Leave': 3, LOP: 3, Absent: 2, 'Not Marked': 1 }
  const rows = new Map()
  for (const collection of collections) {
    for (const row of (collection || [])) {
      if (!row || !row.facultyId || !row.date) continue
      const date = String(row.date || row.attendanceDate || '').slice(0, 10)
      const key = `${row.facultyId}:${date}`
      const previous = rows.get(key)
      if (!previous) {
        rows.set(key, { ...row, date })
      } else {
        const nextStatus = (row.status && row.status !== 'Not Marked') ? row.status : (previous.status || row.status || 'Not Marked')
        const attId = row.attendanceId || previous.attendanceId || null
        rows.set(key, {
          ...previous,
          ...row,
          date,
          status: nextStatus,
          attendanceId: attId,
          id: attId || row.id || previous.id || '',
          checkIn: (row.checkIn && row.checkIn !== '-' && row.checkIn !== '') ? row.checkIn : previous.checkIn,
          checkOut: (row.checkOut && row.checkOut !== '-' && row.checkOut !== '') ? row.checkOut : previous.checkOut,
          remarks: (row.remarks && row.remarks !== '-' && row.remarks !== '') ? row.remarks : previous.remarks,
          synthetic: !attId,
        })
      }
    }
  }
  return [...rows.values()]
}
// #endregion utils/facultyAttendance.js
return {
  get localAttendanceDate() { return localAttendanceDate; },
  get attendanceStatusLabel() { return attendanceStatusLabel; },
  get attendanceFacultyMap() { return attendanceFacultyMap; },
  get loadDailyAttendancePeriod() { return loadDailyAttendancePeriod; },
  get normalizeAttendanceRow() { return normalizeAttendanceRow; },
  get combineAttendance() { return combineAttendance; }
};
})();

export const facultyLeaveBalancesModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/facultyLeaveBalances.js
const id = value => value == null ? '' : String(value)
const numeric = (...values) => {
  const value = values.find(value => value !== null && value !== undefined && value !== '')
  return value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null
}
const metrics = row => {
  const entitled = numeric(row.entitled, row.entitlement, row.totalEntitlement, row.totalEntitled, row.entitledDays)
  const used = numeric(row.used, row.usedDays, row.totalUsed)
  const pending = numeric(row.pending, row.pendingDays, row.totalPending)
  const available = numeric(row.available, row.availableDays, row.remainingDays, row.balance, row.totalAvailable)
  return { entitled, used, pending, available: available ?? (entitled !== null && used !== null && pending !== null ? entitled - used - pending : null) }
}
const hasMetrics = row => Object.values(metrics(row)).some(value => value !== null)

/* export */ function employeeLeaveBalances(rows, employee, policy) {
  const matches = rows.filter(row => {
    const facultyId = row.facultyId ?? row.employee?.facultyId ?? row.employee?.id ?? row.faculty?.facultyId ?? row.faculty?.id
    const employeeCode = row.employeeId ?? row.facultyCode ?? row.employee?.employeeId
    const sameEmployee = facultyId != null ? id(facultyId) === id(employee.id)
      : employeeCode != null ? id(employeeCode) === id(employee.employeeId)
        : id(row.id) === id(employee.id)
    return sameEmployee && (!policy?.id || !row.policyId || id(row.policyId) === id(policy.id))
  })
  const details = matches.flatMap(row => {
    const children = row.balances ?? row.leaveBalances ?? row.leaveTypes ?? row.details
    return Array.isArray(children) ? children : row.leaveTypeId != null || row.typeId != null ? [row] : []
  }).filter(row => !policy?.id || !row.policyId || id(row.policyId) === id(policy.id))
    .map(row => ({ ...row, typeId: id(row.leaveTypeId ?? row.typeId ?? row.leaveType?.id), ...metrics(row) }))
  const summary = matches.find(row => row.leaveTypeId == null && row.typeId == null && hasMetrics(row.totals ?? row.summary ?? row))
  const totals = summary ? metrics(summary.totals ?? summary.summary ?? summary) : Object.fromEntries(
    ['entitled', 'used', 'pending', 'available'].map(key => [key, details.length && details.every(row => row[key] !== null) ? details.reduce((sum, row) => sum + row[key], 0) : null])
  )
  return { details, totals }
}

/* export */ function leaveBalanceRules(balance, policy) {
  const configuredTypes = new Set((policy?.entitlements ?? [])
    .map(row => id(row.typeId ?? row.leaveTypeId))
    .filter(Boolean))
  const rules = new Map()
  for (const row of policy?.entitlements ?? []) {
    const typeId = id(row.typeId ?? row.leaveTypeId)
    if (typeId) rules.set(typeId, { ...rules.get(typeId), ...row, typeId })
  }
  for (const row of balance.details ?? []) {
    const typeId = id(row.typeId ?? row.leaveTypeId)
    if (configuredTypes.has(typeId)) rules.set(typeId, { ...rules.get(typeId), ...row, typeId })
  }
  return [...rules.values()]
}
// #endregion utils/facultyLeaveBalances.js
return {
  get employeeLeaveBalances() { return employeeLeaveBalances; },
  get leaveBalanceRules() { return leaveBalanceRules; }
};
})();

export const gradeScreensModule = (() => {

/* Imports for isolated regression tests:

*/
// #region pages/examinations/grade-result-management/gradeScreens.js
/* export */ const gradeScreens = [
  {
    "name": "GradeConfiguration",
    "label": "Grade Management",
    "slug": "grade-configuration"
  },
  {
    "name": "ResultGeneration",
    "label": "Result Generation",
    "slug": "result-generation"
  },
  {
    "name": "StudentResult",
    "label": "Student Result",
    "slug": "student-result"
  },
  {
    "name": "SemesterResult",
    "label": "Semester Result",
    "slug": "semester-result"
  },
  {
    "name": "DepartmentResult",
    "label": "Department Result",
    "slug": "department-result"
  },
  {
    "name": "ConsolidatedMarksMemo",
    "label": "Consolidated Marks Memo",
    "slug": "consolidated-marks-memo"
  },
  {
    "name": "BacklogReport",
    "label": "Backlog Report",
    "slug": "backlog-report"
  }
]
// #endregion pages/examinations/grade-result-management/gradeScreens.js
return {
  get gradeScreens() { return gradeScreens; }
};
})();

export const gradeResultModelModule = (() => {

/* Imports for isolated regression tests:

*/
// #region pages/examinations/grade-result-management/gradeResultModel.js
/* export */ const defaultBands = [
  { grade: 'O', min: 90, max: 100, points: 10, pass: true },
  { grade: 'A+', min: 80, max: 90, points: 9, pass: true },
  { grade: 'A', min: 70, max: 80, points: 8, pass: true },
  { grade: 'B+', min: 60, max: 70, points: 7, pass: true },
  { grade: 'B', min: 50, max: 60, points: 6, pass: true },
  { grade: 'C', min: 40, max: 50, points: 5, pass: true },
  { grade: 'F', min: 0, max: 40, points: 0, pass: false },
]

/* export */ const gradingPresets = [
  {
    id: 'ugc10',
    label: 'UGC / AICTE 10-Point',
    description: 'Standard 10-point letter grading system used across Indian universities.',
    bands: defaultBands,
  },
  {
    id: 'autonomous7',
    label: 'Autonomous 7-Point',
    description: 'Traditional 7-grade scale for autonomous colleges and state universities.',
    bands: [
      { grade: 'A', min: 85, max: 100, points: 10, pass: true },
      { grade: 'B', min: 75, max: 85, points: 8, pass: true },
      { grade: 'C', min: 65, max: 75, points: 7, pass: true },
      { grade: 'D', min: 55, max: 65, points: 6, pass: true },
      { grade: 'E', min: 50, max: 55, points: 5, pass: true },
      { grade: 'P', min: 40, max: 50, points: 4, pass: true },
      { grade: 'F', min: 0, max: 40, points: 0, pass: false },
    ],
  },
  {
    id: 'gpa4',
    label: 'International 4.0 Scale',
    description: '4.0 GPA scale standard for global transcripts and exchange programs.',
    bands: [
      { grade: 'A', min: 90, max: 100, points: 4, pass: true },
      { grade: 'B', min: 80, max: 90, points: 3, pass: true },
      { grade: 'C', min: 70, max: 80, points: 2, pass: true },
      { grade: 'D', min: 60, max: 70, points: 1, pass: true },
      { grade: 'F', min: 0, max: 60, points: 0, pass: false },
    ],
  },
]

/* export */ function cgpaToPercentage(cgpa, formula = 'aicte') {
  const val = Number(cgpa)
  if (!Number.isFinite(val) || val <= 0) return null
  if (formula === 'aicte') {
    return Math.max(0, Math.min(100, Number(((val - 0.75) * 10).toFixed(2))))
  }
  // Standard 9.5x formula
  return Math.max(0, Math.min(100, Number((val * 9.5).toFixed(2))))
}

/* export */ function academicDivision(cgpa) {
  const val = Number(cgpa)
  if (!Number.isFinite(val) || val <= 0) return null
  if (val >= 7.5) return { division: 'First Class with Distinction', badge: 'distinction', color: '#166534', bg: '#dcfce7' }
  if (val >= 6.5) return { division: 'First Class', badge: 'first', color: '#1e40af', bg: '#dbeafe' }
  if (val >= 5.5) return { division: 'Second Class', badge: 'second', color: '#6b21a8', bg: '#f3e8ff' }
  if (val >= 5.0) return { division: 'Pass Class', badge: 'pass', color: '#92400e', bg: '#fef3c7' }
  return { division: 'Needs Improvement / Fail', badge: 'fail', color: '#991b1b', bg: '#fee2e2' }
}

/* export */ function validateBands(bands) {
  if (!bands.length) return 'Add at least one grade band.'
  const sorted = [...bands].sort((a, b) => Number(a.min) - Number(b.min))
  const names = new Set()
  for (const [i, band] of sorted.entries()) {
    if (!band.grade.trim() || names.has(band.grade.trim().toUpperCase())) return 'Grade names must be unique and non-empty.'
    names.add(band.grade.trim().toUpperCase())
    if ([band.min, band.max, band.points].some(value => value === '' || !Number.isFinite(Number(value)))) return 'Complete all numeric fields.'
    if (Number(band.min) < 0 || Number(band.max) > 100 || Number(band.min) >= Number(band.max) || Number(band.points) < 0 || Number(band.points) > 10) return 'Use percentage ranges within 0-100 and grade points within 0-10.'
    if (i && Number(sorted[i - 1].max) !== Number(band.min)) return 'Grade bands must cover 0-100 without gaps or overlaps.'
  }
  if (Number(sorted[0].min) !== 0 || Number(sorted.at(-1).max) !== 100) return 'Grade bands must cover the entire range from 0 to 100.'
  return ''
}
/* export */ function gradeFor(percentage, bands) {
  return bands.find(band => percentage >= Number(band.min) && (percentage < Number(band.max) || percentage === 100 && Number(band.max) === 100))
}
const text = value => typeof value === 'object' && value ? String(value.name || value.label || '') : String(value ?? '')
const number = value => value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value)
/* export */ function flattenResults(sheets) {
  return sheets.flatMap((sheet, sheetIndex) => (Array.isArray(sheet.records) ? sheet.records : [sheet]).map((record, index) => {
    const max = number(record.maximumMarks ?? sheet.maximumMarks ?? sheet.maxMarks) ?? ((number(sheet.maxInternal) !== null && number(sheet.maxExternal) !== null) ? Number(sheet.maxInternal) + Number(sheet.maxExternal) : null)
    const total = number(record.totalMarks ?? record.marksObtained) ?? ((number(record.internalMarks) !== null && number(record.externalMarks) !== null) ? Number(record.internalMarks) + Number(record.externalMarks) : null)
    return { id: `${sheet.id || sheetIndex}:${record.studentId || index}:${index}`, collegeId: record.collegeId ?? sheet.collegeId, academicYearId: record.academicYearId ?? sheet.academicYearId, studentId: text(record.studentId ?? record.id), studentName: text(record.studentName ?? record.name), registrationNumber: text(record.registrationNumber ?? record.rollNumber), department: text(record.departmentName ?? sheet.departmentName ?? sheet.department ?? sheet.branchName ?? sheet.branch), semester: text(record.semesterName ?? sheet.semesterName ?? sheet.semester), subjectCode: text(record.subjectCode ?? sheet.subjectCode), subjectName: text(record.subjectName ?? sheet.subjectName), examType: text(record.examType ?? sheet.examType), totalMarks: total, maximumMarks: max, percentage: max > 0 && total !== null ? total / max * 100 : null, credits: number(record.credits ?? sheet.credits), grade: text(record.grade), gradePoint: number(record.gradePoint), status: text(record.status ?? record.resultStatus ?? 'Pending'), examDate: text(record.examDate ?? sheet.examDate ?? sheet.updatedAt ?? sheet.createdAt) }
  }))
}
/* export */ function summarize(rows, key) {
  const groups = new Map()
  rows.forEach(row => { const value = row[key] || 'Unassigned'; if (!groups.has(value)) groups.set(value, []); groups.get(value).push(row) })
  return [...groups].map(([group, records]) => {
    const graded = records.filter(row => /^(passed|failed)$/i.test(row.status))
    const passed = graded.filter(row => /^passed$/i.test(row.status)).length
    return { group, students: new Set(records.map(row => row.studentId || row.registrationNumber).filter(Boolean)).size, subjects: records.length, passed, failed: graded.length - passed, pending: records.length - graded.length, passRate: graded.length ? `${(passed / graded.length * 100).toFixed(1)}%` : '-', }
  })
}
/* export */ function weightedGpa(rows) {
  if (!rows.length || rows.some(row => !(row.credits > 0) || !Number.isFinite(row.gradePoint) || row.gradePoint < 0 || row.gradePoint > 10)) return null
  const credits = rows.reduce((sum, row) => sum + row.credits, 0)
  return rows.reduce((sum, row) => sum + row.credits * row.gradePoint, 0) / credits
}
/* export */ function backlogRows(rows) {
  // Preserve exam types as separate assessments; a pass in another assessment cannot clear a backlog.
  const latest = new Map()
  rows.forEach(row => {
    if (!(row.studentId || row.registrationNumber) || !row.subjectCode) return
    const key = JSON.stringify([row.studentId || row.registrationNumber, row.semester, row.subjectCode, row.examType])
    const old = latest.get(key)
    if (!old || (Date.parse(row.examDate) || 0) > (Date.parse(old.examDate) || 0)) latest.set(key, row)
  })
  return [...latest.values()].filter(row => /^failed$/i.test(row.status) || row.grade === 'F')
}

/* export */ function resultIssues(row) {
  const issues = []
  if (!row.studentId && !row.registrationNumber) issues.push('Missing student ID')
  if (!row.subjectCode) issues.push('Missing subject code')
  if (row.totalMarks === null || !Number.isFinite(row.totalMarks)) issues.push('Missing marks')
  if (!(row.maximumMarks > 0)) issues.push('Missing maximum marks')
  if (row.totalMarks !== null && (row.totalMarks < 0 || row.maximumMarks > 0 && row.totalMarks > row.maximumMarks)) issues.push('Marks outside range')
  if (!(row.credits > 0)) issues.push('Missing credits')
  return issues
}
/* export */ function resultAnalytics(rows) {
  const valid = rows.filter(row => Number.isFinite(row.percentage) && row.percentage >= 0 && row.percentage <= 100)
  const passed = rows.filter(row => /^passed$/i.test(row.status)).length
  const failed = rows.filter(row => /^failed$/i.test(row.status)).length
  const distribution = new Map()
  rows.forEach(row => { const grade = row.grade || 'Ungraded'; distribution.set(grade, (distribution.get(grade) || 0) + 1) })
  return { passed, failed, pending: rows.length - passed - failed, average: valid.length ? valid.reduce((sum, row) => sum + row.percentage, 0) / valid.length : null, highest: valid.length ? valid.reduce((highest, row) => Math.max(highest, row.percentage), 0) : null, passRate: passed + failed ? passed / (passed + failed) * 100 : null, distribution: [...distribution].map(([grade, count]) => ({ grade, count })), issues: rows.filter(row => resultIssues(row).length).length }
}
/* export */ function sortResultRows(rows, sort) {
  return [...rows].sort((a, b) => {
    if (sort === 'score-desc' || sort === 'score-asc') {
      if (a.percentage === null || a.percentage === undefined) return b.percentage == null ? 0 : 1
      if (b.percentage === null || b.percentage === undefined) return -1
      return sort === 'score-desc' ? b.percentage - a.percentage : a.percentage - b.percentage
    }
    if (sort === 'name') return String(a.studentName || a.group || '').localeCompare(String(b.studentName || b.group || ''), undefined, { numeric: true })
    return 0
  })
}
// #endregion pages/examinations/grade-result-management/gradeResultModel.js
return {
  get defaultBands() { return defaultBands; },
  get gradingPresets() { return gradingPresets; },
  get cgpaToPercentage() { return cgpaToPercentage; },
  get academicDivision() { return academicDivision; },
  get validateBands() { return validateBands; },
  get gradeFor() { return gradeFor; },
  get flattenResults() { return flattenResults; },
  get summarize() { return summarize; },
  get weightedGpa() { return weightedGpa; },
  get backlogRows() { return backlogRows; },
  get resultIssues() { return resultIssues; },
  get resultAnalytics() { return resultAnalytics; },
  get sortResultRows() { return sortResultRows; }
};
})();

export function detailValuesModule() {

/* Imports for isolated regression tests:

*/
// #region utils/detailValues.js
/* export */ function isRenderableDetailValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized !== '' && !['null', 'undefined', 'n/a', 'not provided', 'not available', '-', '-'].includes(normalized)
  }
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}
// #endregion utils/detailValues.js
return {
  get isRenderableDetailValue() { return isRenderableDetailValue; }
};
}

export function dashboardDataModule() {

/* Imports for isolated regression tests:

*/
// #region pages/dashboardData.js
/* export */ const sameId = (a, b) => a != null && b != null && String(a) === String(b)
/* export */ const recordId = row => row.id ?? row.admissionId ?? row.applicationNumber ?? row.applicationNo
/* export */ const field = (row, key) => row[key] ?? row.academic?.[key] ?? row.admission?.[key]
/* export */ const statusOf = row => String(row.status ?? row.currentStatus ?? '').trim().toUpperCase().replace(/[ -]+/g, '_')
/* export */ const isEnrolled = row => ['APPROVED', 'ADMITTED'].includes(statusOf(row))
/* export */ const isPending = row => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(statusOf(row))
/* export */ const STATUS_GROUPS = [
  { label: 'Approved / Admitted', statuses: ['APPROVED', 'ADMITTED'], color: '#16815d', tone: 'success' },
  { label: 'Pending', statuses: ['PENDING'], color: '#b77913', tone: 'warning' },
  { label: 'Submitted', statuses: ['SUBMITTED'], color: '#2563eb', tone: 'info' },
  { label: 'Under Review', statuses: ['UNDER_REVIEW'], color: '#e49a21', tone: 'warning' },
  { label: 'Verified', statuses: ['VERIFIED'], color: '#7c60b3', tone: 'info' },
  { label: 'Rejected', statuses: ['REJECTED'], color: '#c24155', tone: 'danger' },
  { label: 'Other', statuses: [], color: '#64748b', tone: 'neutral' },
]
/* export */ const statusGroup = row => STATUS_GROUPS.find(group => group.statuses.includes(statusOf(row))) ?? STATUS_GROUPS.at(-1)
/* export */ function admissionDate(row) {
  for (const key of ['applicationDate', 'submittedAt', 'createdAt', 'admissionDate', 'registrationDate']) {
    const value = field(row, key)
    if (!value || String(value).startsWith('0001-')) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}
/* export */ function admissionsInScope(rows, collegeId, yearId, yearName) {
  return rows.filter(row => {
    if (collegeId && !sameId(field(row, 'collegeId'), collegeId)) return false
    if (!yearId) return true
    const id = field(row, 'academicYearId')
    if (id != null && id !== '') return sameId(id, yearId)
    const name = field(row, 'academicYearName') ?? field(row, 'academicYear')
    return typeof name === 'string' && !!yearName && name.trim().toLowerCase() === yearName.trim().toLowerCase()
  })
}
// Fixed calendar windows, anchored to today. Zero buckets represent real absence of records.
/* export */ function buildTrend(rows, timeframe, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const count = timeframe === 'Month' ? 12 : timeframe === 'Week' ? 8 : 14
  if (timeframe === 'Month') end.setDate(1)
  if (timeframe === 'Week') end.setDate(end.getDate() - (end.getDay() + 6) % 7)
  const buckets = Array.from({ length: count }, (_, index) => {
    const start = new Date(end)
    if (timeframe === 'Month') start.setMonth(start.getMonth() - count + index + 1)
    else start.setDate(start.getDate() - (count - index - 1) * (timeframe === 'Week' ? 7 : 1))
    const until = new Date(start)
    if (timeframe === 'Month') until.setMonth(until.getMonth() + 1)
    else until.setDate(until.getDate() + (timeframe === 'Week' ? 7 : 1))
    return { start, until, label: start.toLocaleDateString(undefined, timeframe === 'Month' ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' }), value: 0 }
  })
  let dated = 0
  rows.forEach(row => {
    const date = admissionDate(row)
    if (!date) return
    dated++
    const bucket = buckets.find(item => date >= item.start && date < item.until && date <= now)
    if (bucket) bucket.value++
  })
  return { buckets, dated, undated: rows.length - dated }
}
/* export */ function branchFor(row, branches) {
  const id = field(row, 'branchId')
  const match = branches.find(branch => sameId(branch.id ?? branch.branchId, id))
  const name = match?.name ?? match?.branchName ?? field(row, 'branchName') ?? field(row, 'branch')
  return { key: id != null ? `id:${id}` : `name:${name || 'Unassigned'}`, name: typeof name === 'string' ? name : 'Unassigned', id }
}
/* export */ function branchDistribution(rows, branches) {
  const groups = new Map()
  rows.filter(isEnrolled).forEach(row => {
    const branch = branchFor(row, branches)
    const existing = groups.get(branch.key)
    if (existing) existing.value++
    else groups.set(branch.key, { ...branch, value: 1 })
  })
  return [...groups.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}
/* export */ function departmentMetrics(dept, courses, branches, admissions) {
  const id = dept.id ?? dept.departmentId
  const deptCourses = courses.filter(row => sameId(row.departmentId, id))
  const deptBranches = branches.filter(row => sameId(row.departmentId, id) || deptCourses.some(course => sameId(course.id ?? course.courseId, row.courseId)))
  const capacities = deptBranches.map(row => row.intakeCapacity ?? row.intake)
  const capacity = capacities.length && capacities.every(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) ? capacities.reduce((sum, value) => sum + Number(value), 0) : null
  const enrolled = admissions.filter(isEnrolled)
  const belongs = row => sameId(field(row, 'departmentId'), id) || deptBranches.some(branch => sameId(branch.id ?? branch.branchId, field(row, 'branchId'))) || deptCourses.some(course => sameId(course.id ?? course.courseId, field(row, 'courseId')))
  const canResolve = row => {
    if (field(row, 'departmentId') != null) return true
    const branch = branches.find(item => sameId(item.id ?? item.branchId, field(row, 'branchId')))
    if (branch?.departmentId != null) return true
    const course = courses.find(item => sameId(item.id ?? item.courseId, field(row, 'courseId') ?? branch?.courseId))
    return course?.departmentId != null
  }
  const enrollment = enrolled.every(canResolve) ? enrolled.filter(belongs).length : null
  return { courses: deptCourses.length, branches: deptBranches.length, capacity, enrollment, utilization: capacity > 0 && enrollment !== null ? Math.round(enrollment / capacity * 100) : null }
}
// #endregion pages/dashboardData.js
return {
  get sameId() { return sameId; },
  get recordId() { return recordId; },
  get field() { return field; },
  get statusOf() { return statusOf; },
  get isEnrolled() { return isEnrolled; },
  get isPending() { return isPending; },
  get STATUS_GROUPS() { return STATUS_GROUPS; },
  get statusGroup() { return statusGroup; },
  get admissionDate() { return admissionDate; },
  get admissionsInScope() { return admissionsInScope; },
  get buildTrend() { return buildTrend; },
  get branchFor() { return branchFor; },
  get branchDistribution() { return branchDistribution; },
  get departmentMetrics() { return departmentMetrics; }
};
}

export function marksWorkflowModule() {

/* Imports for isolated regression tests:

*/
// #region pages/examinations/marks-management/marksWorkflow.js
/* export */ const editableMark = row => ['DRAFT', 'REJECTED'].includes(row.workflowStatus)
/* export */ function markValueError(row) {
  if (String(row.marksObtained ?? '').trim() === '') return 'Enter marks; blank is not zero.'
  const marks = Number(row.marksObtained), maximum = Number(row.maxMarks)
  if (!Number.isFinite(marks) || !Number.isFinite(maximum) || maximum <= 0 || marks < 0 || marks > maximum) return 'Marks must be between zero and the positive maximum.'
  return ''
}
/* export */ function marksWorkflowPayload(action, rows, remarks = '') {
  if (!rows.length) throw new Error('Select at least one mark.')
  const allowed = action === 'submit' ? ['DRAFT', 'REJECTED'] : ['SUBMITTED']
  if (!['submit', 'approve', 'reject'].includes(action) || rows.some(row => !allowed.includes(row.workflowStatus))) throw new Error('Selection contains marks that cannot enter this transition. Reload and review their status.')
  const examId = Number(rows[0].examId)
  if (!Number.isSafeInteger(examId) || examId <= 0 || rows.some(row => Number(row.examId) !== examId)) throw new Error('Select marks from one examination.')
  if (action === 'reject' && !remarks.trim()) throw new Error('Remarks are required when returning marks for correction.')
  const markIds = [...new Set(rows.map(row => Number(row.markId)))]
  if (markIds.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('The selected marks have invalid identifiers.')
  return { examId, markIds, remarks: remarks.trim() || null }
}
/* export */ function workflowSummary(result) {
  if (!result || !Number.isInteger(result.processedCount)) throw new Error('The server did not confirm the workflow result. Reload before retrying.')
  return `${result.processedCount} processed; ${result.rejectedCount || 0} rejected.`
}
// #endregion pages/examinations/marks-management/marksWorkflow.js
return {
  get editableMark() { return editableMark; },
  get markValueError() { return markValueError; },
  get marksWorkflowPayload() { return marksWorkflowPayload; },
  get workflowSummary() { return workflowSummary; }
};
}

export function promotionEligibilityModule() {

/* Imports for isolated regression tests:

*/
// #region pages/student-management/StudentPromotion/promotionEligibility.js
/* export */ const semester = value => Number(String(value || '').match(/\d+/)?.[0]) || 0
/* export */ const targetSemester = value => semester(value) === 8 ? 'Degree Completion Review' : semester(value) ? `Semester ${semester(value) + 1}` : 'Not available'
/* export */ const requiredCgpa = value => semester(value) === 1 ? 3 : semester(value) === 2 ? 3.5 : 4
/* export */ const evaluate = student => {
  if (student.promotionStatus === 'Promoted') return { status:'promoted',label:'Already Promoted',tone:'success',reason:'This student has already been promoted for the current academic mapping.' }
  if (semester(student.currentSemester) === 8) return { status:'degree',label:'Eligible for Degree Completion Review',tone:'success',reason:'Final semester requires degree-completion review, not promotion.' }
  if (!student.resultsAvailable || student.cgpa == null || student.creditsEarned == null) return { status:'pending',label:'Pending Academic Review',tone:'warning',reason:'Semester results or academic credits are unavailable.' }
  if (student.prerequisiteIssues.length) return { status:'ineligible',label:'Not Eligible',tone:'danger',reason:'A target-semester prerequisite has not been cleared.' }
  if (student.cgpa < requiredCgpa(student.currentSemester)) return { status:'ineligible',label:'Not Eligible',tone:'danger',reason:`CGPA ${student.cgpa.toFixed(2)} is below the required ${requiredCgpa(student.currentSemester).toFixed(2)}.` }
  if (student.failedSubjects.length) return { status:'pending',label:'Pending Academic Review',tone:'warning',reason:'Backlogs require an institution-specific academic decision.' }
  return { status:'eligible',label:'Eligible',tone:'success',reason:'Eligible for promotion. Academic requirements are satisfied.' }
}
/* export */ const backlogAction = item => item.courseType === 'CORE' ? 'Repeat Required' : 'Equivalent/Similar Elective may be permitted'
// #endregion pages/student-management/StudentPromotion/promotionEligibility.js
return {
  get semester() { return semester; },
  get targetSemester() { return targetSemester; },
  get requiredCgpa() { return requiredCgpa; },
  get evaluate() { return evaluate; },
  get backlogAction() { return backlogAction; }
};
}




export const AcademicContextModule = (() => {
const { default: React } = external0;
const { createContext } = external0;
const { useContext } = external0;
const { useState } = external0;
const { useEffect } = external0;
const { useCallback } = external0;
const { useMemo } = external0;
const { default: academicService } = academicServiceModule;
const { filterActiveOnly } = academicServiceModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
const { getActiveAcademicYears } = academicYearUtilsModule;
const { createCollegeScope } = collegeScopeModule;
/* Imports for isolated regression tests:
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import academicService, { filterActiveOnly } from '../services/academicService'
import eventBus, { ERP_EVENTS } from '../services/eventBus'
import { getActiveAcademicYears } from '../utils/academicYearUtils'
import { createCollegeScope } from '../utils/collegeScope'
*/
// #region context/AcademicContext.jsx
const CONTEXT_STORAGE_KEY = 'pirnav_academic_context'

const AcademicContext = createContext(null)

const readStoredContext = () => {
  try {
    const raw = localStorage.getItem(CONTEXT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return {
          collegeId: parsed.collegeId ? String(parsed.collegeId) : '',
          academicYearId: parsed.academicYearId ? String(parsed.academicYearId) : '',
        }
      }
    }
    // Fallback to legacy single-key storage if available
    const legacyYear = localStorage.getItem('pirnav-selected-academic-year-id')
    const legacyCollege = localStorage.getItem('selected_college_id') || localStorage.getItem('pirnav-selected-college-id')
    return {
      collegeId: legacyCollege ? String(legacyCollege) : '',
      academicYearId: legacyYear ? String(legacyYear) : '',
    }
  } catch {
    return { collegeId: '', academicYearId: '' }
  }
}

const saveStoredContext = (collegeId, academicYearId) => {
  try {
    const payload = {
      collegeId: collegeId ? String(collegeId) : '',
      academicYearId: academicYearId ? String(academicYearId) : '',
    }
    localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(payload))
    if (collegeId) localStorage.setItem('pirnav-selected-college-id', String(collegeId))
    else {
      localStorage.removeItem('pirnav-selected-college-id')
      localStorage.removeItem('selected_college_id')
    }
    if (academicYearId) localStorage.setItem('pirnav-selected-academic-year-id', String(academicYearId))
  } catch {}
}

/* export */ const AcademicProvider = ({ children }) => {
  const [colleges, setColleges] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [branches, setBranches] = useState([])
  const [semesters, setSemesters] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Stored working context IDs
  const [selectedCollegeId, setSelectedCollegeId] = useState(() => readStoredContext().collegeId)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(() => readStoredContext().academicYearId)

  const loadHierarchy = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [cols, years, depts, crss, brns, sems, secs] = await Promise.all([
        academicService.getColleges(false),
        academicService.getAcademicYears(false),
        academicService.getDepartments(false),
        academicService.getCourses({}, false),
        academicService.getBranches(null, false),
        academicService.getSemesters(null, false),
        academicService.getSections({}, false),
      ])

      if ([cols, years, depts, crss, brns, sems, secs].some(list => list?.loadError)) {
        throw new Error('Academic configuration could not be loaded. Please retry.')
      }
      const safeColleges = cols || []
      const safeYears = years || []

      setColleges(safeColleges)
      setAcademicYears(safeYears)
      setDepartments(depts || [])
      setCourses(crss || [])
      setBranches(brns || [])
      setSemesters(sems || [])
      setSections(secs || [])

      // Validate or resolve default College
      const stored = readStoredContext()
      const availableColleges = filterActiveOnly(safeColleges)
      let resolvedColId = ''
      if (stored.collegeId && availableColleges.some(c => String(c.id ?? c.collegeId) === String(stored.collegeId))) {
        resolvedColId = String(stored.collegeId)
      } else {
        const defaultCol = availableColleges[0]
        resolvedColId = defaultCol ? String(defaultCol.id ?? defaultCol.collegeId) : ''
      }
      setSelectedCollegeId(resolvedColId)

      // Validate or resolve default Academic Year
      let resolvedYearId = ''
      if (stored.academicYearId && safeYears.some(y => String(y.id ?? y.academicYearId) === String(stored.academicYearId))) {
        resolvedYearId = String(stored.academicYearId)
      } else {
        const defaultYear = safeYears.find(y => y.isCurrent || String(y.status).toLowerCase() === 'active' || y.isActive) || safeYears[0]
        resolvedYearId = defaultYear ? String(defaultYear.id ?? defaultYear.academicYearId) : ''
      }
      setSelectedAcademicYearId(resolvedYearId)

      // Persist validated context
      saveStoredContext(resolvedColId, resolvedYearId)
    } catch (err) {
      setError('Academic configuration could not be loaded. Please retry.')
      console.warn('Error loading academic hierarchy context:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHierarchy()
    const unsubscribe = eventBus.subscribe(ERP_EVENTS.ACADEMIC_UPDATED, () => {
      loadHierarchy()
    })
    return () => unsubscribe()
  }, [loadHierarchy])

  const scopeRecords = useMemo(() => {
    const hierarchy = { departments, courses, branches, semesters, sections }
    const filter = createCollegeScope(selectedCollegeId, hierarchy)
    return (rows, related) => related
      ? createCollegeScope(selectedCollegeId, { ...hierarchy, ...related })(rows)
      : filter(rows)
  }, [selectedCollegeId, departments, courses, branches, semesters, sections])

  // Active items helpers
  const activeColleges = filterActiveOnly(colleges)
  const activeAcademicYears = getActiveAcademicYears(academicYears)
  const activeDepartments = filterActiveOnly(scopeRecords(departments))
  const activeCourses = filterActiveOnly(scopeRecords(courses))
  const activeBranches = filterActiveOnly(scopeRecords(branches))
  const activeSemesters = filterActiveOnly(scopeRecords(semesters))
  const activeSections = filterActiveOnly(scopeRecords(sections))

  const currentAcademicYear = useMemo(() => {
    return academicYears.find(y => y.isCurrent) || activeAcademicYears[0] || academicYears[0] || null
  }, [academicYears, activeAcademicYears])

  const selectedCollege = useMemo(() => {
    const availableColleges = filterActiveOnly(colleges)
    return availableColleges.find(c => String(c.id ?? c.collegeId) === String(selectedCollegeId)) || availableColleges[0] || null
  }, [colleges, selectedCollegeId])

  const selectedAcademicYear = useMemo(() => {
    return academicYears.find(y => String(y.id ?? y.academicYearId) === String(selectedAcademicYearId)) || currentAcademicYear
  }, [academicYears, selectedAcademicYearId, currentAcademicYear])

  const isHistoricalYear = Boolean(
    currentAcademicYear &&
    selectedAcademicYear &&
    String(selectedAcademicYear.id ?? selectedAcademicYear.academicYearId) !== String(currentAcademicYear.id ?? currentAcademicYear.academicYearId) &&
    (selectedAcademicYear.name || '').replace(/\s+/g, '') !== (currentAcademicYear.name || '').replace(/\s+/g, '')
  )

  const isContextReady = Boolean(selectedCollege && selectedAcademicYear)

  // Atomically apply a new Global Academic Context
  const applyAcademicContext = useCallback(async (newCollegeId, newAcademicYearId) => {
    const colId = String(newCollegeId ?? '')
    const yrId = String(newAcademicYearId ?? '')

    setSelectedCollegeId(colId)
    setSelectedAcademicYearId(yrId)
    saveStoredContext(colId, yrId)

    const targetCol = colleges.find(c => String(c.id ?? c.collegeId) === colId) || null
    const targetYr = academicYears.find(y => String(y.id ?? y.academicYearId) === yrId) || null

    // Clear stale memory caches if needed
    academicService.clearCache?.()

    // Broadcast change
    eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, {
      collegeId: colId,
      college: targetCol,
      academicYearId: yrId,
      academicYear: targetYr,
    })
    eventBus.emit(ERP_EVENTS.ACADEMIC_YEAR_CHANGED, {
      academicYearId: yrId,
      academicYear: targetYr,
    })

    return {
      success: true,
      college: targetCol,
      academicYear: targetYr,
    }
  }, [colleges, academicYears])

  // Context-scoped Cascading helpers
  const getCoursesForDepartment = useCallback((departmentId, activeOnly = true) => {
    const list = activeOnly ? activeCourses : scopeRecords(courses)
    if (!departmentId) return list
    return list.filter(c => String(c.departmentId) === String(departmentId))
  }, [scopeRecords, courses, activeCourses])

  const getBranchesForCourse = useCallback((courseId, activeOnly = true) => {
    const list = activeOnly ? activeBranches : scopeRecords(branches)
    if (!courseId) return list
    return list.filter(b => String(b.courseId) === String(courseId))
  }, [scopeRecords, branches, activeBranches])

  const getSemestersForCourse = useCallback((courseId, activeOnly = true) => {
    const list = activeOnly ? activeSemesters : scopeRecords(semesters)
    const filtered = !courseId ? list : list.filter(s => !s.courseId || String(s.courseId) === String(courseId))
    const map = new Map()
    filtered.forEach(s => {
      const num = Number(s.semesterNumber ?? String(s.semesterName || s.name || s.id).match(/\d+/)?.[0] ?? s.id)
      const name = s.semesterName || s.name || (num ? `Semester ${num}` : `Semester ${s.id}`)
      const key = num || name
      if (!map.has(key)) {
        map.set(key, {
          ...s,
          id: s.id ?? key,
          semesterNumber: num || s.semesterNumber || key,
          semesterName: name,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => (Number(a.semesterNumber) || 0) - (Number(b.semesterNumber) || 0))
  }, [scopeRecords, semesters, activeSemesters])

  const getSectionsForScope = useCallback((scope = {}, activeOnly = true) => {
    const list = activeOnly ? activeSections : scopeRecords(sections)
    return list.filter(sec => {
      const secYearId = String(sec.academicYearId ?? sec.academicYear ?? '')
      const targetYearId = String(scope.academicYearId || selectedAcademicYearId || '')
      if (targetYearId && secYearId && secYearId !== targetYearId) return false
      if (scope.departmentId && String(sec.departmentId) !== String(scope.departmentId)) return false
      if (scope.courseId && String(sec.courseId) !== String(scope.courseId)) return false
      if (scope.branchId && String(sec.branchId) !== String(scope.branchId)) return false
      if (scope.semesterId && String(sec.semesterId) !== String(scope.semesterId)) return false
      return true
    })
  }, [scopeRecords, sections, activeSections, selectedAcademicYearId])

  const resolveNames = useCallback((ids) => {
    return academicService.resolveHierarchyNames(ids)
  }, [])

  const value = {
    scopeRecords,
    loading,
    error,
    isContextReady,
    // Colleges
    colleges,
    activeColleges,
    selectedCollegeId,
    selectedCollege,
    college: selectedCollege,
    collegeId: selectedCollegeId,
    // Academic Years
    academicYears,
    activeAcademicYears,
    currentAcademicYear,
    selectedAcademicYear,
    selectedAcademicYearId,
    academicYear: selectedAcademicYear,
    academicYearId: selectedAcademicYearId,
    isHistoricalYear,
    // Actions
    applyAcademicContext,
    setContext: applyAcademicContext,
    setAcademicContext: applyAcademicContext,
    selectAcademicYear: (yearOrId) => {
      const yrId = typeof yearOrId === 'object' ? String(yearOrId?.id ?? yearOrId?.academicYearId ?? '') : String(yearOrId)
      applyAcademicContext(selectedCollegeId, yrId)
    },
    resetToActiveAcademicYear: () => {
      if (currentAcademicYear) {
        const yrId = String(currentAcademicYear.id ?? currentAcademicYear.academicYearId ?? '')
        applyAcademicContext(selectedCollegeId, yrId)
      }
    },
    // Hierarchy Entities
    departments: scopeRecords(departments),
    activeDepartments,
    courses: scopeRecords(courses),
    activeCourses,
    branches: scopeRecords(branches),
    activeBranches,
    semesters: scopeRecords(semesters),
    activeSemesters,
    sections: scopeRecords(sections),
    activeSections,
    // Helpers
    getCoursesForDepartment,
    getBranchesForCourse,
    getSemestersForCourse,
    getSectionsForScope,
    resolveNames,
    refreshHierarchy: loadHierarchy,
  }

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  )
}

/* export */ const useAcademic = () => {
  const context = useContext(AcademicContext)
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider')
  }
  return context
}

/* export */ const useAcademicContext = useAcademic

/* export default AcademicContext */
// #endregion context/AcademicContext.jsx
return {
  get AcademicProvider() { return AcademicProvider; },
  get useAcademic() { return useAcademic; },
  get useAcademicContext() { return useAcademicContext; },
  get default() { return AcademicContext; }
};
})();

export const ProtectedRouteModule = (() => {
const { Navigate } = external1;
const { Outlet } = external1;
const { useLocation } = external1;
const { getUserRole } = authModule;
const { isAuthenticated } = authModule;
const { useAcademic } = AcademicContextModule;
/* Imports for isolated regression tests:
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getUserRole, isAuthenticated } from '../auth/auth'
import { useAcademic } from '../context/AcademicContext'
*/
// #region components/ProtectedRoute.jsx
/* export default */ function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation()
  const { selectedCollegeId } = useAcademic()

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  const userRole = getUserRole()

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet key={selectedCollegeId} />
}
// #endregion components/ProtectedRoute.jsx
return {
  get default() { return ProtectedRoute; }
};
})();

export const useToastStateModule = (() => {
const { userErrorMessage } = userErrorModule;
const { useCallback } = external0;
const { useRef } = external0;
const { useState } = external0;
const { showToast } = toastModule;
/* Imports for isolated regression tests:
import { userErrorMessage } from '../utils/userError.js'
import { useCallback, useRef, useState } from 'react'
import { showToast } from '../utils/toast'
*/
// #region hooks/useToastState.js
// Preserve the local form/page state and publish feedback through the shared
// notification store. The UI host decides where each notification is shown.
/* export default */ function useToastState(initial, defaultType = 'info') {
  const [value, setValue] = useState(initial)
  const current = useRef(value)
  const setFeedback = useCallback((next, type = defaultType) => {
    const raw = typeof next === 'function' ? next(current.current) : next
    const resolved = type === 'error' && typeof raw === 'string' ? userErrorMessage(raw) : raw
    const previousMessage = current.current?.message || current.current?.form
    current.current = resolved
    setValue(resolved)
    const message = typeof resolved === 'string' ? resolved : resolved?.message || resolved?.form
    if (message && (typeof next !== 'function' || message !== previousMessage)) showToast(message, resolved?.tone || resolved?.type || type)
  }, [defaultType])
  return [value, setFeedback]
}
// #endregion hooks/useToastState.js
return {
  get default() { return useToastState; }
};
})();

export const SearchableSelectModule = (() => {
const { useEffect } = external0;
const { useId } = external0;
const { useLayoutEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { createPortal } = external2;
const { FiSearch } = external3;
/* Imports for isolated regression tests:
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch } from 'react-icons/fi'
import './SearchableSelect.css'
*/
// #region components/SearchableSelect.jsx
const normalize = (option, getOptionLabel, getOptionValue) => {
  if (typeof option === 'string' || typeof option === 'number') {
    const value = String(option)
    return { value, label: value, code: '', subLabel: '', fullLabel: value, raw: option }
  }

  const rawValue = getOptionValue(option)
  const label = getOptionLabel(option)
  const code = option?.code || option?.shortCode || option?.shortName || option?.departmentCode || option?.courseCode || option?.branchCode || option?.academicYearCode || ''
  const subLabel = option?.subLabel || option?.subtitle || ''
  const resolvedLabel = label == null || String(label).trim() === '' ? String(option?.name || option?.label || '') : String(label)
  const fullLabel = option?.fullLabel || (resolvedLabel ? (code ? `${resolvedLabel} - ${code}` : resolvedLabel) : '')

  return {
    value: rawValue == null ? '' : String(rawValue),
    label: resolvedLabel,
    code: code == null ? '' : String(code),
    subLabel: String(subLabel || ''),
    fullLabel: String(fullLabel || resolvedLabel),
    raw: option,
  }
}

/* export default */ function SearchableSelect({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  hideSearch = false,
  placement = 'auto',
  disabled = false,
  loading = false,
  error = false,
  required = false,
  className = '',
  menuClassName = '',
  noOptionsMessage = 'No matching options found.',
  getOptionLabel = (option) => typeof option === 'string' || typeof option === 'number' ? String(option) : option?.label || option?.name || option?.title || '',
  getOptionValue = (option) => typeof option === 'string' || typeof option === 'number' ? String(option) : option?.value ?? option?.id ?? option?.code ?? option?.name ?? option?.label ?? '',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 })
  const wrapperRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const inputRef = useRef(null)
  const id = useId()

  const normalizedOptions = useMemo(
    () => options.map((option) => normalize(option, getOptionLabel, getOptionValue)),
    [options, getOptionLabel, getOptionValue],
  )

  const selectedOption = useMemo(
    () => value == null || value === '' ? null : normalizedOptions.find((option) => option.value === String(value)) || null,
    [normalizedOptions, value],
  )

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return normalizedOptions
    return normalizedOptions.filter((option) => {
      const haystack = `${option.label} ${option.code} ${option.subLabel} ${option.fullLabel}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [normalizedOptions, query])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const position = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewport = window.visualViewport
      const viewportTop = viewport?.offsetTop || 0
      const viewportLeft = viewport?.offsetLeft || 0
      const viewportHeight = viewport?.height || window.innerHeight
      const viewportWidth = viewport?.width || window.innerWidth
      const padding = 8, gap = 4;
      const below = Math.max(0, viewportTop + viewportHeight - rect.bottom - padding - gap);
      const above = Math.max(0, rect.top - viewportTop - padding - gap);
      const flip = placement === 'top' || (placement !== 'bottom' && below < 130 && above > below);
      const maxHeight = Math.min(240, flip ? above : below);
      const width = Math.min(Math.max(rect.width, 280), viewportWidth - padding * 2);
      setMenuStyle({
        top: flip ? undefined : Math.round(rect.bottom + gap),
        bottom: flip ? Math.round(window.innerHeight - rect.top + gap) : undefined,
        left: Math.max(viewportLeft + padding, Math.min(rect.left, viewportLeft + viewportWidth - width - padding)),
        width,
        maxHeight,
      });
    }
    const onScroll = event => {
      if (!menuRef.current?.contains(event.target)) position()
    }
    position()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', position)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
    }
  }, [open, options, query, loading, placement])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      const target = event.target
      const insideMenu = menuRef.current && menuRef.current.contains(target)
      const insideTrigger = wrapperRef.current && wrapperRef.current.contains(target)
      if (!insideMenu && !insideTrigger) {
        setOpen(false)
      }
    }


    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
        triggerRef.current?.focus({ preventScroll: true })
      }
      if (event.key === 'Tab') {
        triggerRef.current?.focus({ preventScroll: true })
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
      return () => cancelAnimationFrame(frame)
    }
  }, [open])

  const handleSelect = (next) => {
    setOpen(false)
    setQuery('')
    const selectedValue = next?.raw?.value ?? next?.raw?.id ?? next?.raw?.courseId ?? next?.value ?? next?.id ?? next?.courseId ?? ''
    onChange?.(selectedValue)
    triggerRef.current?.focus({ preventScroll: true })
  }

  const triggerLabel = selectedOption
    ? (selectedOption.fullLabel || (selectedOption.code ? `${selectedOption.label} - ${selectedOption.code}` : selectedOption.label))
    : placeholder

  const handleKeyDown = (event) => {
    if (disabled) return
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      setQuery('')
      setOpen((current) => !current)
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const menu = open && !disabled ? createPortal(
    <div ref={menuRef} id={id} className={`searchable-select__menu ${menuClassName}`} onKeyDown={(event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      if (event.target === inputRef.current && ['Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const buttons = Array.from(menuRef.current.querySelectorAll('[role=option]'))
      const current = buttons.indexOf(document.activeElement)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (current + 1) % buttons.length : (current <= 0 ? buttons.length - 1 : current - 1)
      buttons[index]?.focus({ preventScroll: true })
      buttons[index]?.scrollIntoView({ block: 'nearest' })
    }} style={{ position: 'fixed', top: menuStyle.top, bottom: menuStyle.bottom, left: menuStyle.left, width: menuStyle.width, maxHeight: menuStyle.maxHeight, zIndex: 2000 }}>
      {!hideSearch && <label className="searchable-select__search">
        <FiSearch aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </label>}
      <div className="searchable-select__options" role="listbox" aria-label={label || 'Options'}>
        {loading ? (
          <div className="searchable-select__empty">Loading options...</div>
        ) : filteredOptions.length ? (
          filteredOptions.map((option) => {
            const active = String(option.value) === String(value ?? '')
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                className={`searchable-select__option ${active ? 'is-active' : ''}`}
                role="option"
                aria-selected={active}
                tabIndex={-1}
                onClick={() => handleSelect(option)}
              >
                <div className="searchable-select__option-content">
                  <div className="searchable-select__option-top">
                    <span className="searchable-select__option-label">{option.label}</span>
                    {option.code && <span className="searchable-select__option-code">{option.code}</span>}
                  </div>
                  {option.subLabel && <div className="searchable-select__option-sub">{option.subLabel}</div>}
                </div>
              </button>
            )
          })
        ) : (
          <div className="searchable-select__empty">{noOptionsMessage}</div>
        )}
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <div ref={wrapperRef} className={`searchable-select ${className} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`} data-required={required ? 'true' : undefined} data-empty={!selectedOption ? 'true' : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className="searchable-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-controls={id}
        aria-invalid={error}
        aria-label={label || placeholder}
        disabled={disabled}
        onClick={() => { if (!disabled) { setQuery(''); setOpen((current) => !current) } }}
        onKeyDown={handleKeyDown}
      >
        <span className={`searchable-select__trigger-text${selectedOption ? '' : ' is-placeholder'}`}>{triggerLabel}</span>
        <span className="searchable-select__caret" aria-hidden="true">▾</span>
      </button>
      {menu}
      {required && !selectedOption && !placeholder && <span className="searchable-select__required">Required</span>}
    </div>
  )
}
// #endregion components/SearchableSelect.jsx
return {
  get default() { return SearchableSelect; }
};
})();

export const AcademicContextSelectModule = (() => {
const { useState } = external0;
const { default: SearchableSelect } = SearchableSelectModule;
const { useAcademic } = AcademicContextModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import SearchableSelect from './SearchableSelect'
import { useAcademic } from '../context/AcademicContext'
import './AcademicContextSelect.css'
*/
// #region components/AcademicContextSelect.jsx
/* export default */ function AcademicContextSelect({ kind, compact = false }) {
  const context = useAcademic()
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const isCollege = kind === 'college'
  const label = isCollege ? 'College' : 'Academic year'
  const items = isCollege ? (context.activeColleges || []) : (context.academicYears || [])
  const value = isCollege ? context.selectedCollegeId : context.selectedAcademicYearId
  const idOf = item => String(item.id ?? (isCollege ? item.collegeId : item.academicYearId))
  const nameOf = item => item.name || item.collegeName || item.academicYearName || label
  const selected = items.find(item => idOf(item) === String(value))
  const disabled = context.loading || applying || !items.length
  const selectedLabel = selected ? nameOf(selected) : context.loading ? 'Loading...' : `Select ${label.toLowerCase()}`

  const change = async event => {
    const next = event.target.value
    if (!next || next === String(value)) return
    setApplying(true)
    setError('')
    try {
      await context.applyAcademicContext(
        isCollege ? next : context.selectedCollegeId,
        isCollege ? context.selectedAcademicYearId : next,
      )
    } catch (cause) {
      setError(cause.message || `Unable to change ${label.toLowerCase()}.`)
    } finally {
      setApplying(false)
    }
  }

  return <div className={`workspace-context-select workspace-context-select--${kind}${compact ? ' workspace-context-select--compact' : ''}${disabled ? ' is-disabled' : ''}`}>
    {compact ? <SearchableSelect
      label={`Change ${label.toLowerCase()}`}
      value={value || ''}
      options={items.map(item => ({ value: idOf(item), label: nameOf(item) }))}
      onChange={next => change({ target: { value: next } })}
      placeholder={selectedLabel}
      disabled={disabled}
      searchPlaceholder={isCollege ? 'Search colleges...' : 'Search academic years...'}
      menuClassName={`workspace-context-menu workspace-context-menu--${kind}`}
    /> : <label>
      <span>{label}</span>
      <select title={selectedLabel} aria-label={`Change ${label.toLowerCase()}`} value={value || ''} onChange={change} disabled={disabled}>
        <option value="" disabled>{context.loading ? 'Loading...' : `Select ${label.toLowerCase()}`}</option>
        {items.map(item => <option key={idOf(item)} value={idOf(item)}>{nameOf(item)}</option>)}
      </select>
    </label>}
    {(error || context.error) && <div className={isCollege ? 'workspace-context-select__sidebar-error' : 'workspace-context-select__error'} role="alert">
      {!isCollege && <span>{context.error ? 'Academic years unavailable' : `Unable to update ${label.toLowerCase()}`}</span>}
      <button
        className="workspace-context-select__retry"
        type="button"
        aria-label={context.loading ? `Loading ${label.toLowerCase()} options` : `Retry loading ${label.toLowerCase()} options`}
        title={context.loading ? `Loading ${label.toLowerCase()} options` : `${label} options unavailable · Retry`}
        disabled={context.loading}
        onClick={() => { setError(''); context.refreshHierarchy() }}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 8a6.7 6.7 0 0 0-12.2-2L2.8 7.5M2.8 3.7v3.8h3.8M3.5 12a6.7 6.7 0 0 0 12.2 2l1.5-1.5M17.2 16.3v-3.8h-3.8" /></svg>
      </button>
    </div>}
    {!context.loading && !context.error && !items.length && <small>No {isCollege ? 'colleges' : 'academic years'} available.</small>}
    {applying && <small role="status">Updating...</small>}
  </div>
}
// #endregion components/AcademicContextSelect.jsx
return {
  get default() { return AcademicContextSelect; }
};
})();

export const SidebarModule = (() => {
const { useEffect } = external0;
const { useRef } = external0;
const { useState } = external0;
const { Link } = external1;
const { NavLink } = external1;
const { useLocation } = external1;
const { FiAward } = external3;
const { FiBook } = external3;
const { FiBookOpen } = external3;
const { FiBriefcase } = external3;
const { FiCalendar } = external3;
const { FiCheckCircle } = external3;
const { FiCheckSquare } = external3;
const { FiChevronDown } = external3;
const { FiChevronLeft } = external3;
const { FiChevronRight } = external3;
const { FiCreditCard } = external3;
const { FiEdit3 } = external3;
const { FiFileText } = external3;
const { FiGitBranch } = external3;
const { FiGrid } = external3;
const { FiHome } = external3;
const { FiLayers } = external3;
const { FiShield } = external3;
const { FiTrendingUp } = external3;
const { FiUser } = external3;
const { FiUserPlus } = external3;
const { FiUsers } = external3;
const { FiX } = external3;
const { getUserRole } = authModule;
const { ROLES } = rolesModule;
const { useAcademic } = AcademicContextModule;
const { default: AcademicContextSelect } = AcademicContextSelectModule;
const { feeNavigation } = feeNavigationModule;
const { feeNavigationItem } = feeNavigationModule;
const { isFeeRoute } = feeNavigationModule;
const { collegeLogoValue } = collegeLogoModule;
const { cacheCollegeLogo } = collegeApiModule;
const { fetchCollegeLogo } = collegeApiModule;
const { getCollegeById } = collegeApiModule;
const { getCollegeLogoUrl } = collegeApiModule;
const { getColleges } = collegeApiModule;
const { isBackendCollegeLogo } = collegeApiModule;
const { readCachedCollegeLogo } = collegeApiModule;
const { unwrapCollegeRecord } = collegeApiModule;
/* Imports for isolated regression tests:
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { FiAward, FiBook, FiBookOpen, FiBriefcase, FiCalendar, FiCheckCircle, FiCheckSquare, FiChevronDown, FiChevronLeft, FiChevronRight, FiCreditCard, FiEdit3, FiFileText, FiGitBranch, FiGrid, FiHome, FiLayers, FiShield, FiTrendingUp, FiUser, FiUserPlus, FiUsers, FiX } from 'react-icons/fi'
import { getUserRole } from '../auth/auth'
import { ROLES } from '../auth/roles'
import { useAcademic } from '../context/AcademicContext'
import AcademicContextSelect from './AcademicContextSelect'
import './Sidebar.css'
import { feeNavigation, feeNavigationItem, isFeeRoute } from '../pages/fees/feeNavigation'
import { collegeLogoValue } from '../utils/collegeLogo'
import { cacheCollegeLogo, fetchCollegeLogo, getCollegeById, getCollegeLogoUrl, getColleges, isBackendCollegeLogo, readCachedCollegeLogo, unwrapCollegeRecord } from '../auth/collegeApi'
*/
// #region components/Sidebar.jsx
const academicLinks = [
  { label: 'Colleges', to: '/college-institution-management', icon: FiHome, tone: 'gold' },
  { label: 'Academic Years', to: '/academic-year-management', icon: FiCalendar, tone: 'green' },
  { label: 'Courses', to: '/courses', icon: FiBookOpen, tone: 'blue' },
  { label: 'Departments', to: '/department-management', icon: FiGrid, tone: 'cyan' },
  { label: 'Branches', to: '/branches', icon: FiGitBranch, tone: 'purple' },
  { label: 'Semesters', to: '/semester-management', icon: FiLayers, tone: 'orange' },
  { label: 'Sections', to: '/section-management', icon: FiUsers, tone: 'pink' },
  { label: 'Rooms & Classrooms', to: '/rooms-management', icon: FiGrid, tone: 'cyan' },
]

const curriculumLinks = [
  { label: 'Timetable Management', to: '/timetable', icon: FiCalendar, tone: 'orange' },
  { label: 'Subject Management', to: '/subject-management', icon: FiBook, tone: 'blue' },
  { label: 'Credits Management', to: '/credits-management', icon: FiAward, tone: 'green' },
  { label: 'Elective Management', to: '/elective-management', icon: FiCheckCircle, tone: 'purple' },
]

function Item({ to, icon: Icon, children, onNavigate, tone = 'blue', activeWhen }) {
  const location = useLocation()
  return <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `sidebar-link sidebar-link--${tone} ${(activeWhen ? activeWhen(location.pathname) : isActive) ? 'active' : ''}`}><Icon aria-hidden="true" /><span>{children}</span></NavLink>
}

/* export default */ function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
  const userRole = getUserRole()
  const { pathname } = useLocation()
  const navigationRef = useRef(null)
  const { selectedCollege, selectedCollegeId, colleges = [] } = useAcademic()

  const collegeDisplayName = selectedCollege?.name || selectedCollege?.collegeName || 'Pirnav Engineering College'
  const matchingCollege = colleges.find(college => {
    const name = String(college?.name || college?.collegeName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const current = String(collegeDisplayName).toLowerCase().replace(/[^a-z0-9]/g, '')
    return name && current && (name === current || name.includes(current) || current.includes(name))
  }) || (String(collegeDisplayName).toLowerCase().includes('btech') ? colleges.find(college => /btech.*college.*engineering/i.test(String(college?.name || college?.collegeName || ''))) : null)
  const selectedCollegeHasId = Boolean(selectedCollege?.id ?? selectedCollege?.collegeId ?? selectedCollege?.CollegeId ?? selectedCollegeId)
  const activeCollege = selectedCollegeHasId ? selectedCollege : (matchingCollege || selectedCollege)
  const collegeId = activeCollege?.id ?? activeCollege?.collegeId ?? activeCollege?.CollegeId ?? selectedCollegeId
  const [collegeLogo, setCollegeLogo] = useState('')
  const examRoutesActive = pathname.startsWith('/examination-setup') || pathname.startsWith('/exam-timetable')
  const [examManagementOpen, setExamManagementOpen] = useState(examRoutesActive)
  const gradeResultsActive = pathname.startsWith('/grade-result-management') || pathname.startsWith('/results')
  const [gradeResultsOpen, setGradeResultsOpen] = useState(gradeResultsActive)
  const feeRoutesActive = isFeeRoute(pathname)
  const activeFeeItem = feeNavigationItem(pathname)
  const [feeExpansion, setFeeExpansion] = useState(() => ({ pathname, open: feeRoutesActive }))
  const feeManagementOpen = (feeRoutesActive && feeExpansion.pathname !== pathname) || feeExpansion.open
  if (feeExpansion.pathname !== pathname) {
    setFeeExpansion({ pathname, open: feeManagementOpen })
  }

  useEffect(() => {
    if (examRoutesActive) setExamManagementOpen(true)
  }, [examRoutesActive])

  useEffect(() => {
    if (gradeResultsActive) setGradeResultsOpen(true)
  }, [gradeResultsActive])

  useEffect(() => {
    let active = true
    let objectUrl = ''
    const loadLogo = async () => {
      // The context list can omit logo fields. Load the selected college detail
      // once so the same uploaded asset used in College Management is available
      // in the persistent sidebar too.
      let record = activeCollege || {}
      let targetCollegeId = collegeId
      let logoValue = collegeLogoValue(record)
        || readCachedCollegeLogo(collegeId)
        || readCachedCollegeLogo(record?.code || record?.collegeCode)
        || readCachedCollegeLogo(collegeDisplayName)
      if (!logoValue) {
        try {
          const response = await getColleges()
          const raw = response?.data ?? response
          const list = Array.isArray(raw) ? raw : raw?.colleges || raw?.items || raw?.records || raw?.data || []
          const requested = String(collegeDisplayName).toLowerCase().replace(/[^a-z0-9]/g, '')
          const listMatch = list.map(unwrapCollegeRecord).find(item => {
            const name = String(item?.name || item?.collegeName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
            const code = String(item?.code || item?.collegeCode || '').toLowerCase()
            return (name && requested && (name === requested || name.includes(requested) || requested.includes(name)))
          })
          if (listMatch) {
            record = listMatch
            targetCollegeId = record.id ?? record.collegeId ?? record.CollegeId ?? targetCollegeId
            logoValue = collegeLogoValue(record)
          }
        } catch { /* The logo endpoint below remains the fallback. */ }
      }
      if (!logoValue && targetCollegeId) {
        try {
          const response = await getCollegeById(targetCollegeId)
          record = unwrapCollegeRecord(response?.data ?? response)
          targetCollegeId = record.id ?? record.collegeId ?? record.CollegeId ?? targetCollegeId
          logoValue = collegeLogoValue(record)
          if (logoValue) cacheCollegeLogo(targetCollegeId, logoValue, [record.code, record.collegeCode, record.name, record.collegeName])
        } catch { /* The logo endpoint below remains the fallback. */ }
      }
      // Always prefer the current academic-context college and its uploaded
      // asset. A fixed institution ID would show a stale logo after an admin
      // changes the selected college or uploads a replacement.
      const logoUrl = getCollegeLogoUrl(targetCollegeId, logoValue, [record?.code, record?.collegeCode, collegeDisplayName])
      if (!logoUrl) {
        if (active) setCollegeLogo('')
        return
      }
      if (!isBackendCollegeLogo(logoUrl)) {
        if (active) setCollegeLogo(logoUrl)
        return
      }
      if (active) setCollegeLogo('')
      try {
        const blob = await fetchCollegeLogo(logoUrl)
        objectUrl = URL.createObjectURL(blob)
        if (active) setCollegeLogo(objectUrl)
      } catch {
        // Some deployments permit the browser to render the image endpoint but
        // reject the authenticated blob request. Keep the direct image URL as
        // a final fallback instead of reverting to the placeholder mark.
        if (active) setCollegeLogo(logoUrl)
      }
    }
    loadLogo()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [collegeId, collegeDisplayName, activeCollege, colleges])

  useEffect(() => {
    const navigation = navigationRef.current
    if (!navigation) return
    navigation.scrollTop = Number(sessionStorage.getItem('pirnav-sidebar-scroll') || 0)
  }, [])

  const rememberScrollPosition = (event) => {
    sessionStorage.setItem('pirnav-sidebar-scroll', String(event.currentTarget.scrollTop))
  }

  return <>
    <button className={`sidebar-scrim ${open ? 'is-visible' : ''}`} onClick={onClose} aria-label="Close navigation" tabIndex={open ? 0 : -1} />
    <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="sidebar-brand__mark" aria-hidden="true">
          {collegeLogo ? <img src={collegeLogo} alt="" onError={() => setCollegeLogo('')} /> : <svg viewBox="0 0 32 32"><path d="M4 12 16 5l12 7H4Z"/><path d="M7 14v10M12 14v10M20 14v10M25 14v10"/><path d="M4 25h24M2.5 28h27"/></svg>}
        </span>
        <div className="sidebar-brand__copy">
          <AcademicContextSelect kind="college" compact />
          <span className="sidebar-brand__subtitle">Digital Campus</span>
        </div>
        <button className="sidebar-collapse" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}</button>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><FiX /></button>
      </div>
      <div className="sidebar-context">
        <button type="button" className="sidebar-context-expand" onClick={onToggleCollapse} aria-label="Expand navigation to change college" title="Change college"><FiHome /></button>
      </div>
      <nav ref={navigationRef} onScroll={rememberScrollPosition} className="sidebar-navigation">
        <p className="sidebar-section-label">Overview</p>
        <Item to="/dashboard" icon={FiHome} tone="blue" onNavigate={onClose}>Dashboard</Item>
        {userRole === ROLES.ADMIN && <>
          <p className="sidebar-section-label">Academic Management</p>
          {academicLinks.map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Student Management</p>
          <Item to="/student-management/admissions" icon={FiUserPlus} tone="orange" onNavigate={onClose}>Student Admissions</Item>
          <Item to="/student-management/profiles" icon={FiUser} tone="cyan" onNavigate={onClose}>Student Profiles</Item>
          <Item to="/student-management/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Student Attendance</Item>
          <Item to="/student-management/promotions" icon={FiTrendingUp} tone="green" onNavigate={onClose}>Student Promotions</Item>
          <p className="sidebar-section-label">Faculty Management</p>
          <Item to="/faculty" icon={FiBriefcase} tone="cyan" onNavigate={onClose} activeWhen={pathname => !['attendance', 'leave-management', 'payroll', 'advisors', 'subjects'].includes(pathname.split('/')[2]) && pathname.startsWith('/faculty')}>Faculty Directory</Item>
          <Item to="/faculty/attendance" icon={FiCheckSquare} tone="green" onNavigate={onClose} activeWhen={pathname => pathname === '/faculty/attendance' || pathname.startsWith('/faculty/attendance/')}>Faculty Attendance</Item>
          <Item to="/faculty/leave-management" icon={FiCalendar} tone="orange" onNavigate={onClose}>Leave Management</Item>
          <Item to="/faculty/payroll" icon={FiCreditCard} tone="gold" onNavigate={onClose}>Faculty Payroll</Item>
          <p className="sidebar-section-label">Curriculum & Subjects</p>
          {curriculumLinks.map(link => <Item {...link} key={link.to} onNavigate={onClose}>{link.label}</Item>)}
          <p className="sidebar-section-label">Examinations & Results</p>
          <button type="button" className={`sidebar-link sidebar-link--blue sidebar-disclosure sidebar-exam-parent ${examRoutesActive ? 'is-module-active' : ''}`} onClick={() => setExamManagementOpen(open => !open)} aria-expanded={examManagementOpen} aria-controls="exam-management-links">
            <FiFileText aria-hidden="true" /><span>Exam Management</span><FiChevronDown className="sidebar-disclosure__chevron" aria-hidden="true" />
          </button>
          {examManagementOpen && <div className="sidebar-submenu sidebar-exam-submenu" id="exam-management-links">
            <Item to="/examination-setup" icon={FiFileText} tone="blue" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/examination-setup')}>Examination Setup</Item>
            <Item to="/exam-timetable" icon={FiCalendar} tone="orange" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/exam-timetable')}>Exam Timetable</Item>
          </div>}
          <Item to="/marks-management/marks-entry" icon={FiEdit3} tone="green" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/marks-management')}>Marks Management</Item>
          <button type="button" className={`sidebar-link sidebar-link--purple sidebar-disclosure sidebar-grade-parent ${gradeResultsActive ? 'is-module-active' : ''}`} onClick={() => setGradeResultsOpen(open => !open)} aria-expanded={gradeResultsOpen} aria-controls="grade-results-links">
            <FiAward aria-hidden="true" /><span>Grades System and Results</span><FiChevronDown className="sidebar-disclosure__chevron" aria-hidden="true" />
          </button>
          {gradeResultsOpen && <div className="sidebar-submenu sidebar-grade-submenu" id="grade-results-links">
            <Item to="/grade-result-management/grade-configuration" icon={FiAward} tone="purple" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/grade-result-management')}>Grade Management</Item>
            <Item to="/results" icon={FiFileText} tone="blue" onNavigate={onClose} activeWhen={pathname => pathname.startsWith('/results')}>Official Results</Item>
          </div>}
          <p className="sidebar-section-label">Finance</p>
          <button type="button" className={`sidebar-link sidebar-link--gold sidebar-disclosure sidebar-fee-parent ${feeRoutesActive ? 'is-module-active' : ''}`} title="Fee Management" aria-label="Fee Management" onClick={() => { if (collapsed) onToggleCollapse(); setFeeExpansion({ pathname, open: collapsed || !feeManagementOpen }) }} aria-expanded={!collapsed && feeManagementOpen} aria-controls="fee-management-links">
            <FiCreditCard aria-hidden="true" /><span>Fee Management</span><FiChevronDown className="sidebar-disclosure__chevron" aria-hidden="true" />
          </button>
          {!collapsed && feeManagementOpen && <div className="sidebar-submenu sidebar-fee-submenu" id="fee-management-links">
            {feeNavigation.map(item => <Link key={item.to} to={item.to} className={`sidebar-link ${activeFeeItem === item ? 'active' : ''}`} aria-current={activeFeeItem === item ? 'page' : undefined} onClick={onClose}><span>{item.label}</span></Link>)}
          </div>}
        </>}
        {[ROLES.FACULTY, ROLES.STUDENT].includes(userRole) && <><p className="sidebar-section-label">Academics</p><Item to="/my-subjects" icon={FiBookOpen} tone="blue" onNavigate={onClose}>My Subjects</Item>{userRole===ROLES.FACULTY&&<><Item to="/timetable" icon={FiCalendar} tone="orange" onNavigate={onClose}>My Timetable</Item><Item to="/student-management/attendance/take" icon={FiCheckSquare} tone="green" onNavigate={onClose}>Record Attendance</Item></>}</>}
        <p className="sidebar-section-label">Campus Services</p>
        <Item to="/library" icon={FiBookOpen} tone="blue" onNavigate={onClose}>Library</Item>
        <Item to="/meetings-events" icon={FiCalendar} tone="orange" onNavigate={onClose}>Meetings/Events</Item>
        <Item to="/placement" icon={FiBriefcase} tone="green" onNavigate={onClose}>Placement</Item>
        {userRole === ROLES.ADMIN && <>
          <p className="sidebar-section-label">Settings & Access</p>
          <Item to="/roles-designations" icon={FiShield} tone="purple" onNavigate={onClose}>Roles & Designations</Item>
        </>}
      </nav>
    </aside>
  </>
}
// #endregion components/Sidebar.jsx
return {
  get default() { return Sidebar; }
};
})();

export const HeaderAcademicYearModule = (() => {
const { useEffect } = external0;
const { useRef } = external0;
const { useState } = external0;
const { FiCalendar } = external3;
const { FiChevronDown } = external3;
const { default: AcademicContextSelect } = AcademicContextSelectModule;
const { calculateAcademicYearProgress } = headerAcademicYearModule;
const { useAcademic } = AcademicContextModule;
/* Imports for isolated regression tests:
import { useEffect, useRef, useState } from 'react'
import { FiCalendar, FiChevronDown } from 'react-icons/fi'
import AcademicContextSelect from './AcademicContextSelect'
import { calculateAcademicYearProgress } from '../utils/headerAcademicYear'
import { useAcademic } from '../context/AcademicContext'
import './HeaderAcademicYear.css'
*/
// #region components/HeaderAcademicYear.jsx
/* export default */ function HeaderAcademicYear() {
  const {
    selectedAcademicYear,
    currentAcademicYear,
    academicYears = [],
    isHistoricalYear,
    loading,
  } = useAcademic()

  const [now, setNow] = useState(() => new Date())
  const root = useRef(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setNow(new Date())
    }, 60000)

    const close = (event) => {
      if (root.current && !root.current.contains(event.target) && !event.target.closest('.workspace-context-menu--year')) {
        root.current.open = false
      }
    }

    document.addEventListener('pointerdown', close)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('pointerdown', close)
    }
  }, [])

  const year = selectedAcademicYear || currentAcademicYear || academicYears[0] || null
  const label = year ? (year.academicYearName || year.name || 'Unnamed academic year') : (loading ? 'Loading...' : 'Not Configured')
  const progress = year ? calculateAcademicYearProgress(year.startDate, year.endDate, now) : null
  const shortLabel = label.replace(/(\d{4})\s*[--]\s*\d{2}(\d{2})/, '$1-$2')
  const dateLabel = (value) => (value ? String(value).slice(0, 10) : '-')

  return (
    <details
      className={`header-academic-year ${isHistoricalYear ? 'is-historical' : ''}`}
      ref={root}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          root.current.open = false
          root.current.querySelector('summary')?.focus()
        }
      }}
    >
      <summary aria-label={`Active Academic Year: ${label}${progress === null ? '' : `, ${progress}%`}`}>
        <FiCalendar aria-hidden="true" />
        <div className="header-academic-year__content">
          <div className="header-academic-year__heading">
            <small>{isHistoricalYear ? 'Working Context' : 'Active Academic Year'}</small>
            <strong className="header-academic-year__full">{label}</strong>
            <strong className="header-academic-year__short">{shortLabel}</strong>
          </div>
          {progress !== null && (
            <div className="header-academic-year__progress">
              <span role="progressbar" aria-label="Academic Year Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <i style={{ width: `${progress}%` }} />
              </span>
              <b>{progress}%</b>
            </div>
          )}
        </div>
        <FiChevronDown aria-hidden="true" />
      </summary>

      <div className="header-academic-year__details">
        <div className="header-academic-year__pop-header">
          <strong>Change academic year</strong>
        </div>
        <AcademicContextSelect kind="year" compact />

        {year ? (
          <dl>
            <dt>Status</dt>
            <dd><span className="header-academic-year__status">{isHistoricalYear ? 'Historical' : 'Active'}</span></dd>
            <dt>Start Date</dt>
            <dd>{dateLabel(year.startDate)}</dd>
            <dt>End Date</dt>
            <dd>{dateLabel(year.endDate)}</dd>
            <dt>Cycle Progress</dt>
            <dd>{progress === null ? 'Unavailable - check year dates' : `${progress}%`}</dd>
          </dl>
        ) : (
          <p>{loading ? 'Loading academic years...' : 'Select an academic year above.'}</p>
        )}

      </div>
    </details>
  )
}
// #endregion components/HeaderAcademicYear.jsx
return {
  get default() { return HeaderAcademicYear; }
};
})();

export const DeactivationBlockedDialogModule = (() => {
const { useEffect } = external0;
const { useState } = external0;
const { FiAlertTriangle } = external3;
const { FiX } = external3;
/* Imports for isolated regression tests:
import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiX } from 'react-icons/fi'
import './DeactivationBlockedDialog.css'
*/
// #region components/DeactivationBlockedDialog.jsx
/* export */ const showDeactivationBlocked = (message, details = {}) => {
  const payload = typeof message === 'object' && message !== null
    ? message
    : { message, ...details }
  window.dispatchEvent(new CustomEvent('btech:deactivation-blocked', { detail: payload }))
}

/* export default */ function DeactivationBlockedDialog() {
  const [details, setDetails] = useState(null)

  useEffect(() => {
    const open = event => setDetails({
      message: event.detail?.message || 'This item cannot be deactivated while records are associated with it.',
      count: event.detail?.count,
      facultyCount: event.detail?.facultyCount,
      studentCount: event.detail?.studentCount,
      branchCount: event.detail?.branchCount,
      sectionCount: event.detail?.sectionCount,
      courseCount: event.detail?.courseCount,
      departmentCount: event.detail?.departmentCount,
      admissionCount: event.detail?.admissionCount,
      name: event.detail?.name,
      entity: event.detail?.entity,
      reason: event.detail?.reason,
    })
    window.addEventListener('btech:deactivation-blocked', open)
    return () => window.removeEventListener('btech:deactivation-blocked', open)
  }, [])

  if (!details) return null
  const { message, facultyCount, studentCount, branchCount, sectionCount, courseCount, departmentCount, admissionCount } = details
  const parsedCount = Number(message.match(/(\d+)\s+students?\b/i)?.[1])
  const count = Number.isFinite(Number(details.count)) ? Number(details.count) : Number.isFinite(parsedCount) ? parsedCount : undefined
  const name = details.name || message.match(/cannot deactivate\s+(.+?)\./i)?.[1] || 'This item'
  const entity = details.entity || message.match(/this\s+(college|department|course|branch|academic year|semester|section)/i)?.[1] || 'item'
  const entityLabel = entity.replace(/\b\w/g, letter => letter.toUpperCase())
  const close = () => setDetails(null)

  const statItems = [
    Number(admissionCount) > 0 && { label: 'Admissions', count: admissionCount, unit: admissionCount === 1 ? 'admission' : 'admissions' },
    Number(departmentCount) > 0 && { label: 'Departments', count: departmentCount, unit: departmentCount === 1 ? 'department' : 'departments' },
    Number(branchCount) > 0 && { label: 'Active Branches', count: branchCount, unit: branchCount === 1 ? 'branch' : 'branches' },
    Number(studentCount) > 0 && { label: 'Students', count: studentCount, unit: studentCount === 1 ? 'student' : 'students' },
    Number(facultyCount) > 0 && { label: 'Faculty', count: facultyCount, unit: facultyCount === 1 ? 'faculty member' : 'faculty members' },
    Number(sectionCount) > 0 && { label: 'Active Sections', count: sectionCount, unit: sectionCount === 1 ? 'section' : 'sections' },
    Number(courseCount) > 0 && { label: 'Associated Courses', count: courseCount, unit: courseCount === 1 ? 'course' : 'courses' },
  ].filter(Boolean)

  const hasSpecificCounts = statItems.length > 0

  let summaryText = `has associated records.`
  if (statItems.length > 0) {
    summaryText = `has ${statItems.map(s => `${s.count} ${s.unit}`).join(', ')}.`
  }

  let helpText = `Deactivate is unavailable until all associated records are moved or reassigned from this ${entity}.`

  return <div className="deactivation-blocked-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="deactivation-blocked-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivation-blocked-title">
      <button type="button" className="deactivation-blocked-close" aria-label="Close dialog" onClick={close}><FiX /></button>
      <span className="deactivation-blocked-icon"><FiAlertTriangle /></span>
      <h2 id="deactivation-blocked-title">{entityLabel} cannot be deactivated</h2>
      <p><strong>{name}</strong> {summaryText}</p>
      {!hasSpecificCounts && <p>{message}</p>}

      {hasSpecificCounts ? (
        <div className="deactivation-blocked-stats-grid" style={{ display: 'grid', gridTemplateColumns: statItems.length > 1 ? 'repeat(auto-fit, minmax(130px, 1fr))' : '1fr', gap: '12px', margin: '0 0 16px' }}>
          {statItems.map((item, index) => (
            <dl key={index} className="deactivation-blocked-count" style={{ margin: 0, padding: '12px 14px', background: 'var(--surface-soft, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border, #e2e8f0)', textAlign: 'center' }}>
              <dt style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</dt>
              <dd style={{ margin: '4px 0 0', color: 'var(--text-primary, #0f172a)', fontSize: '18px', fontWeight: 800 }}>{item.count} {item.unit}</dd>
            </dl>
          ))}
        </div>
      ) : (
        <dl className="deactivation-blocked-count"><div><dt>Associated Records</dt><dd>{count === undefined ? 'Associated records' : `${count} ${count === 1 ? 'record' : 'records'}`}</dd></div></dl>
      )}

      <p className="deactivation-blocked-help">{helpText}</p>
      <button type="button" className="deactivation-blocked-button" onClick={close}>Close</button>
    </section>
  </div>
}
// #endregion components/DeactivationBlockedDialog.jsx
return {
  get showDeactivationBlocked() { return showDeactivationBlocked; },
  get default() { return DeactivationBlockedDialog; }
};
})();

export const DashboardLayoutModule = (() => {
const { default: useToastState } = useToastStateModule;
const { useEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { useSyncExternalStore } = external0;
const { Link } = external1;
const { useLocation } = external1;
const { useNavigate } = external1;
const { FiAlertCircle } = external3;
const { FiLock } = external3;
const { FiLogOut } = external3;
const { FiMenu } = external3;
const { FiMoon } = external3;
const { FiSearch } = external3;
const { FiSun } = external3;
const { FiUser } = external3;
const { FiX } = external3;
const { getUserRole } = authModule;
const { signOut } = authModule;
const { changePassword } = apiEndpointsModule;
const { profileApi } = apiEndpointsModule;
const { default: Sidebar } = SidebarModule;
const { feeBreadcrumbs } = feeNavigationModule;
const { default: HeaderAcademicYear } = HeaderAcademicYearModule;
const { default: DeactivationBlockedDialog } = DeactivationBlockedDialogModule;
const { API_FAILURE_EVENT } = apiFailureNoticeModule;
const { dismissToast } = toastModule;
const { getToasts } = toastModule;
const { subscribeToToasts } = toastModule;
/* Imports for isolated regression tests:
import useToastState from '../hooks/useToastState'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiAlertCircle, FiLock, FiLogOut, FiMenu, FiMoon, FiSearch, FiSun, FiUser, FiX } from 'react-icons/fi'
import { getUserRole, signOut } from '../auth/auth'
import { changePassword, profileApi } from '../api/apiEndpoints'
import Sidebar from '../components/Sidebar'
import { feeBreadcrumbs } from '../pages/fees/feeNavigation'
import HeaderAcademicYear from '../components/HeaderAcademicYear'
import DeactivationBlockedDialog from '../components/DeactivationBlockedDialog'
import { API_FAILURE_EVENT } from '../api/apiFailureNotice'
import { dismissToast, getToasts, subscribeToToasts } from '../utils/toast'
import './DashboardLayout.css'
import './AccountMenu.css'
*/
// #region layouts/DashboardLayout.jsx
const empty = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const requirements = (password) => [
  ['At least 8 characters', password.length >= 8],
  ['One uppercase letter', /[A-Z]/.test(password)],
  ['One lowercase letter', /[a-z]/.test(password)],
  ['One number', /\d/.test(password)],
  ['One special character', /[^A-Za-z0-9]/.test(password)],
]

function PageErrorNotices({ pathname }) {
  const toasts = useSyncExternalStore(subscribeToToasts, getToasts, getToasts)
  const [duplicates, setDuplicates] = useState([])
  const [apiFailure, setApiFailure] = useState(null)
  const [hasInlineError, setHasInlineError] = useState(false)
  const errors = toasts.filter((toast) => toast.type === 'error')
  const apiFailureTimer = useRef(null)

  useEffect(() => {
    const onApiFailure = (event) => {
      if (apiFailureTimer.current) return
      const failure = { ...event.detail, id: `${Date.now()}-${Math.random()}` }
      setApiFailure(failure)
      apiFailureTimer.current = window.setTimeout(() => {
        setApiFailure(null)
        apiFailureTimer.current = null
      }, 2000)
    }
    window.addEventListener(API_FAILURE_EVENT, onApiFailure)
    return () => {
      window.removeEventListener(API_FAILURE_EVENT, onApiFailure)
      window.clearTimeout(apiFailureTimer.current)
    }
  }, [])

  useEffect(() => {
    setApiFailure(null)
    window.clearTimeout(apiFailureTimer.current)
    apiFailureTimer.current = null
  }, [pathname])

  useEffect(() => {
    const checkAlerts = () => {
      const existingAlerts = Array.from(document.querySelectorAll([
        '[role="alert"]:not(.page-error-notice):not(.fm-lop-confirm):not(.fm-reset-confirm)',
        '[data-message-tone="error"]',
        '.sm-error', '.tt-error', '.em-alert', '.flm-error', '.fm-error',
        '.branch-api-error', '.course-api-error', '.cm-summary-error',
        '.hod-error-banner', '.rbac-load-error-strip', '.department-error',
        '.cm-empty--error', '.course-empty--error', '.workspace-context-select__error',
      ].join(',')))
        .filter((element) => element.getClientRects().length > 0)
      const messages = existingAlerts.map((element) => (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase())
      const nextDuplicates = toasts.filter((toast) => toast.type === 'error' && messages.some((message) => message.includes(toast.message.toLowerCase()))).map((toast) => toast.id)
      setDuplicates((current) => current.length === nextDuplicates.length && current.every((id, index) => id === nextDuplicates[index]) ? current : nextDuplicates)
      setHasInlineError((current) => current === (existingAlerts.length > 0) ? current : existingAlerts.length > 0)
    }
    checkAlerts()
    const observer = new MutationObserver(checkAlerts)
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [toasts, apiFailure])

  const visibleErrors = hasInlineError ? [] : errors.filter((toast) => !duplicates.includes(toast.id))
  const showApiFailure = apiFailure && !hasInlineError && !errors.length
  if (!visibleErrors.length && !showApiFailure) return null

  return <aside className="page-error-notices" aria-label="Page errors" data-no-print>
    {visibleErrors.map((toast) => <div className="page-error-notice" key={toast.id} role="alert">
      <FiAlertCircle aria-hidden="true" />
      <span>{toast.message}</span>
      <button type="button" aria-label="Dismiss error" onClick={() => dismissToast(toast.id)}><FiX aria-hidden="true" /></button>
    </div>)}
    {showApiFailure && <div className="page-error-notice" key={apiFailure.id} role="alert">
      <FiAlertCircle aria-hidden="true" />
      <span>{apiFailure.message}</span>
      <button type="button" aria-label="Dismiss error" onClick={() => setApiFailure(null)}><FiX aria-hidden="true" /></button>
    </div>}
  </aside>
}

/* export default */ function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('pirnav-sidebar-collapsed') === 'true')
  const [globalQuery, setGlobalQuery] = useState('')
  const [account, setAccount] = useState(() => ({
    name: localStorage.getItem('btech-user-name') || sessionStorage.getItem('btech-user-name') || '',
    identifier: localStorage.getItem('btech-user-id') || sessionStorage.getItem('btech-user-id') || '',
  }))
  const [theme, setTheme] = useState(() => localStorage.getItem('pirnav-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

  const userRole = getUserRole() || 'user'
  const roleLabel = ['admin', 'college_admin', 'super_admin'].includes(String(userRole).toLowerCase())
    ? 'Administrator'
    : userRole.charAt(0).toUpperCase() + userRole.slice(1)
  const pageName = ({
    '/dashboard': 'Dashboard', '/my-profile': 'My Profile', '/settings': 'Settings',
    '/college-institution-management': 'College', '/academic-year-management': 'Academic Years',
    '/department-management': 'Departments', '/semester-management': 'Semesters', '/section-management': 'Sections',
    '/student-management/admissions': 'Student Admissions',
    '/student-management/profiles': 'Student Profiles', '/student-management/promotions': 'Student Promotions',
  })[pathname] || (pathname.startsWith('/semester-management') ? 'Semesters' : pathname.startsWith('/section-management') ? 'Sections' : pathname.startsWith('/student-management/admissions') ? 'Student Admissions' : pathname.startsWith('/student-management/profiles') ? 'Student Profiles' : pathname.startsWith('/student-management/promotions') ? 'Student Promotions' : pathname.startsWith('/faculty/') ? pathname.startsWith('/faculty/attendance') ? 'Faculty Attendance' : 'Faculty Management' : pathname.startsWith('/courses') ? 'Courses' : pathname.startsWith('/branches') ? 'Branches' : 'Digital Campus')
  const breadcrumbSection = ['My Profile', 'Settings'].includes(pageName) ? 'Account' : pageName === 'Dashboard' ? 'Digital Campus' : pageName.startsWith('Student ') ? 'Student Management' : pageName.startsWith('Faculty ') ? 'Faculty' : 'Academic Configuration'
  const financeBreadcrumbs = feeBreadcrumbs(pathname)

  // Logout confirmation state
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const accountMenuRef = useRef(null)

  // Change password state
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useToastState({}, 'error')
  const [visible, setVisible] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pirnav-theme', theme)
  }, [theme])

  useEffect(() => {
    if (pathname.startsWith('/faculty')) return undefined
    let active = true
    profileApi.getProfile()
      .then((profile) => { if (active) setAccount({ name: profile.fullName || '', identifier: profile.identifier || profile.admissionNumber || '' }) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const globalLinks = [['Dashboard', '/dashboard'], ['Student Admissions', '/student-management/admissions'], ['Student Profiles', '/student-management/profiles'], ['Student Promotions', '/student-management/promotions'], ['Faculty Management', '/faculty'], ['College', '/college-institution-management'], ['Academic Years', '/academic-year-management'], ['Courses', '/courses'], ['Departments', '/department-management'], ['Branches', '/branches'], ['Semesters', '/semester-management'], ['Sections', '/section-management'], ['My Profile', '/my-profile']]
  const globalResults = globalQuery.trim() ? globalLinks.filter(([label]) => label.toLowerCase().includes(globalQuery.trim().toLowerCase())) : []
  const rules = useMemo(
    () => requirements(values.newPassword),
    [values.newPassword]
  )

  const met = rules.filter((item) => item[1]).length

  const strength = !values.newPassword
    ? 'Not set'
    : met <= 2
      ? 'Weak'
      : met === 3
        ? 'Fair'
        : met === 4
          ? 'Good'
          : 'Strong'

  // -------------------------
  // Logout Actions
  // -------------------------
  const requestSignOut = () => {
    accountMenuRef.current?.removeAttribute('open')
    setShowLogoutConfirmation(true)
  }

  const handleSignOut = () => {
    signOut()
    sessionStorage.setItem('btech-logout-message', 'You have been signed out successfully.')
    navigate('/login', { replace: true })
  }

  // -------------------------
  // Change Password Actions
  // -------------------------
  const validate = (data = values) => {
    const next = {}

    if (!data.currentPassword) {
      next.currentPassword = 'Current password is required.'
    }

    if (!data.newPassword) {
      next.newPassword = 'New password is required.'
    } else if (!requirements(data.newPassword).every((item) => item[1])) {
      next.newPassword = 'Use all password requirements.'
    } else if (data.newPassword === data.currentPassword) {
      next.newPassword = 'New password must be different from current password.'
    }

    if (!data.confirmPassword) {
      next.confirmPassword = 'Confirm your new password.'
    } else if (data.confirmPassword !== data.newPassword) {
      next.confirmPassword = 'Passwords do not match.'
    }

    return next
  }

  const closeModal = () => {
    if (submitting) return

    setOpen(false)
    setValues(empty)
    setErrors({})
    setVisible({})
    setSuccess(false)

    setTimeout(() => {
      triggerRef.current?.focus()
    }, 0)
  }

  useEffect(() => {
    if (!open && !showLogoutConfirmation) return undefined

    if (open) closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (open) closeModal()
        if (showLogoutConfirmation) setShowLogoutConfirmation(false)
      }
    }


    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, showLogoutConfirmation, submitting])

  const update = (event) => {
    const next = {
      ...values,
      [event.target.name]: event.target.value,
    }

    setValues(next)
    setErrors(previous => ({ ...previous, [event.target.name]: undefined }))
  }

  const submit = async (event) => {
    event.preventDefault()

    const next = validate()
    setErrors(next)

    if (Object.keys(next).length) return

    setSubmitting(true)
    setErrors({})
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmPassword,
      })
      setValues(empty)
      signOut()
      sessionStorage.setItem('btech-logout-message', 'Password changed successfully. Please sign in with your new password.')
      navigate('/login', { replace: true })
    } catch (error) {
      setErrors({ currentPassword: error.message || 'Unable to change password. Please try again.' })
      setSuccess(false)
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name, label, placeholder) => (
    <label className="password-modal__field">
      <span>{label}</span>

      <div>
        <input
          id={name}
          name={name}
          type={visible[name] ? 'text' : 'password'}
          value={values[name]}
          onChange={update}
          placeholder={placeholder}
          autoComplete={
            name === 'currentPassword' ? 'current-password' : 'new-password'
          }
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        />

        <button
          type="button"
          onClick={() =>
            setVisible((current) => ({
              ...current,
              [name]: !current[name],
            }))
          }
          aria-label={`${visible[name] ? 'Hide' : 'Show'} ${label}`}
        >
          {visible[name] ? 'Hide' : 'Show'}
        </button>
      </div>

      {errors[name] && (
        <small id={`${name}-error`} role="alert">
          {errors[name]}
        </small>
      )}
    </label>
  )

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(value => { const next = !value; localStorage.setItem('pirnav-sidebar-collapsed', String(next)); return next })} />

      <main>
        <header className="dashboard-header">
          <div className="dashboard-header__context"><button className="mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><FiMenu /></button></div>

          <div className="global-search"><FiSearch aria-hidden="true" /><input aria-label="Search modules" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search" />{globalResults.length > 0 && <div className="global-search-results">{globalResults.map(([label, to]) => <Link to={to} key={to} onClick={() => setGlobalQuery('')}>{label}</Link>)}</div>}</div>

          <div className="dashboard-header__actions">
          <HeaderAcademicYear />
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>

          <details className="account-menu" ref={accountMenuRef}>
            <summary aria-label="Open account menu">
              <span className="account-avatar">
                <FiUser aria-hidden="true" />
              </span>

              <span>
                <strong>{account.name || roleLabel}</strong>
                <small>{roleLabel}</small>
              </span>

              <i className="account-menu__chevron" aria-hidden="true" />
            </summary>

            <div className="account-menu__panel">
              <button type="button" onClick={() => navigate('/my-profile')}>
                <FiUser aria-hidden="true" />
                My Profile
              </button>

              <button
                ref={triggerRef}
                type="button"
                onClick={(event) => {
                  event.currentTarget
                    .closest('details')
                    ?.removeAttribute('open')
                  setOpen(true)
                }}
              >
                <FiLock aria-hidden="true" />
                Change Password
              </button>

              <button
                type="button"
                className="account-menu__signout"
                onClick={requestSignOut}
              >
                <FiLogOut aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </details>
          </div>
        </header>

        <section className="page-content"><PageErrorNotices pathname={pathname} />{!(pathname === '/faculty' || pathname.startsWith('/faculty/')) && <nav className="app-breadcrumb" aria-label="Breadcrumb"><Link to="/dashboard">Home</Link>{financeBreadcrumbs ? financeBreadcrumbs.map((crumb, index) => <span className="app-breadcrumb__item" key={`${crumb.label}:${index}`}><span aria-hidden="true">/</span>{index === financeBreadcrumbs.length - 1 ? <strong>{crumb.label}</strong> : crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}</span>) : <><span aria-hidden="true">/</span><span>{breadcrumbSection}</span>{pageName !== breadcrumbSection && <><span aria-hidden="true">/</span><strong>{pageName}</strong></>}</>}</nav>}{children}</section>
        <DeactivationBlockedDialog />

        {/* Logout Confirmation Modal */}
        {showLogoutConfirmation && (
          <div
            className="logout-confirmation-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowLogoutConfirmation(false)
              }
            }}
          >
            <section
              className="logout-confirmation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirmation-title"
              aria-describedby="logout-confirmation-description"
            >
              <div className="logout-confirmation__icon" aria-hidden="true">
                <FiLogOut aria-hidden="true" />
              </div>

              <p className="logout-confirmation__eyebrow">Account access</p>
              <h2 id="logout-confirmation-title">Sign out of your account?</h2>
              <p id="logout-confirmation-description">
                You’ll need to sign in again to access your dashboard.
              </p>

              <div className="logout-confirmation__actions">
                <button
                  type="button"
                  className="logout-confirmation__cancel"
                  onClick={() => setShowLogoutConfirmation(false)}
                >
                  Stay signed in
                </button>

                <button
                  type="button"
                  className="logout-confirmation__confirm"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Change Password Modal */}
        {open && (
          <div
            className="password-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal()
              }
            }}
          >
            <section
              className="password-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-modal-title"
            >
              <button
                ref={closeRef}
                className="password-modal__close"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close change password dialog"
              >
                ×
              </button>

              {success ? (
                <div className="password-modal__success">
                  <span aria-hidden="true">✓</span>
                  <p>Security Settings</p>
                  <h2>Password Updated</h2>
                  <div>Your password has been changed successfully.</div>
                  <button
                    className="password-modal__primary"
                    onClick={closeModal}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="password-modal__eyebrow">Security Settings</p>
                  <h2 id="password-modal-title">Change Password</h2>
                  <p className="password-modal__subtitle">
                    Keep your account secure by creating a strong new password.
                  </p>

                  <form onSubmit={submit} noValidate>
                    {field(
                      'currentPassword',
                      'Current Password',
                      'Enter current password'
                    )}

                    {field(
                      'newPassword',
                      'New Password',
                      'Create a new password'
                    )}

                    <div className="password-modal__strength">
                      <div>
                        <span>Password Strength</span>
                        <strong>{strength}</strong>
                      </div>
                      <i className={`level-${met}`} />
                      <ul>
                        {rules.map((item) => (
                          <li className={item[1] ? 'met' : ''} key={item[0]}>
                            <b>{item[1] ? '✓' : '○'}</b> {item[0]}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {field(
                      'confirmPassword',
                      'Confirm New Password',
                      'Confirm the new password'
                    )}

                    <footer>
                      <button
                        type="button"
                        onClick={closeModal}
                        disabled={submitting}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="password-modal__primary"
                        disabled={submitting}
                      >
                        {submitting
                          ? 'Updating Password...'
                          : 'Update Password'}
                      </button>
                    </footer>
                  </form>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
// #endregion layouts/DashboardLayout.jsx
return {
  get default() { return DashboardLayout; }
};
})();

export const CompactSummaryModule = (() => {

/* Imports for isolated regression tests:
import './CompactSummary.css'
*/
// #region components/CompactSummary.jsx
/* export default */ function CompactSummary({ items = [], label = 'Summary' }) {
  return (
    <div className="compact-summary" aria-label={label}>
      {items.map((item) => (
        <div key={item.label} className={`compact-summary__item compact-summary__item--${item.tone || 'default'}`}>
          <strong>{item.value ?? '0'}</strong>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  )
}
// #endregion components/CompactSummary.jsx
return {
  get default() { return CompactSummary; }
};
})();

export const PageHeaderModule = (() => {
const { Link } = external1;
const { default: CompactSummary } = CompactSummaryModule;
/* Imports for isolated regression tests:
import { Link } from 'react-router-dom'
import CompactSummary from './CompactSummary'
import './PageHeader.css'
*/
// #region components/PageHeader.jsx
/* export default */ function PageHeader({
  breadcrumb,
  title,
  subtitle,
  compactSummary,
  children,
  className = '',
}) {
  const renderBreadcrumb = () => {
    if (!breadcrumb) return null
    if (typeof breadcrumb === 'string') return breadcrumb
    if (Array.isArray(breadcrumb)) {
      return breadcrumb.map((item, index) => {
        const isLast = index === breadcrumb.length - 1
        const label = typeof item === 'string' ? item : item.label
        const link = typeof item === 'object' ? item.link : null

        return (
          <span key={index} className="erp-page-header__breadcrumb-item">
            {index > 0 && <span className="erp-page-header__breadcrumb-sep"> / </span>}
            {link && !isLast ? (
              <Link to={link}>{label}</Link>
            ) : (
              <span>{label}</span>
            )}
          </span>
        )
      })
    }
    return breadcrumb
  }

  return (
    <header className={`erp-page-header ${className}`}>
      <div className="erp-page-header__left">
        {breadcrumb && <div className="erp-page-header__breadcrumb">{renderBreadcrumb()}</div>}
        <h1 className="erp-page-header__title">{title}</h1>
        {subtitle && <p className="erp-page-header__subtitle">{subtitle}</p>}
      </div>

      <div className="erp-page-header__right">
        {Array.isArray(compactSummary) ? (
          <CompactSummary items={compactSummary} />
        ) : (
          compactSummary
        )}
        {children && <div className="erp-page-header__actions">{children}</div>}
      </div>
    </header>
  )
}
// #endregion components/PageHeader.jsx
return {
  get default() { return PageHeader; }
};
})();

export const EmptyStateModule = (() => {
const { FiInbox } = external3;
/* Imports for isolated regression tests:
import { FiInbox } from 'react-icons/fi'
import './EmptyState.css'
*/
// #region components/EmptyState.jsx
/* export default */ function EmptyState({
  icon: Icon = FiInbox,
  title = 'No records found',
  message,
  description,
  subtitle,
  action,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`erp-empty-state ${className}`}>
      <div className="erp-empty-state__icon" aria-hidden="true">
        <Icon />
      </div>
      <h3 className="erp-empty-state__title">{title}</h3>
      {(message || description || subtitle) && <p className="erp-empty-state__message">{message || description || subtitle}</p>}
      {(action || actionLabel) && <div className="erp-empty-state__action">
        {onAction ? <button type="button" className="erp-btn erp-btn--primary" onClick={onAction}>{actionLabel || action}</button> : action}
      </div>}
    </div>
  )
}
// #endregion components/EmptyState.jsx
return {
  get default() { return EmptyState; }
};
})();

export const TablePaginationModule = (() => {

/* Imports for isolated regression tests:
import './TablePagination.css'
*/
// #region components/TablePagination.jsx
/* export */ const PAGE_SIZE = 5

/* export default */ function TablePagination({ page, currentPage, totalPages, onPageChange }) {
  const current = page ?? currentPage ?? 1
  if (totalPages < 1) return null
  return <nav className="table-pagination" aria-label="Table pagination">
    <button type="button" onClick={() => onPageChange(Math.max(1, current - 1))} disabled={current <= 1}>Previous</button>
    <span>Page {current} of {totalPages}</span>
    <button type="button" onClick={() => onPageChange(Math.min(totalPages, current + 1))} disabled={current >= totalPages}>Next</button>
  </nav>
}
// #endregion components/TablePagination.jsx
return {
  get PAGE_SIZE() { return PAGE_SIZE; },
  get default() { return TablePagination; }
};
})();

export const useCollegeStateModule = (() => {
const { useMemo } = external0;
const { useState } = external0;
const { useAcademic } = AcademicContextModule;
/* Imports for isolated regression tests:
import { useMemo, useState } from 'react'
import { useAcademic } from '../context/AcademicContext'
*/
// #region hooks/useCollegeState.js
/* export default */ function useCollegeState(initial = [], related) {
  const [rows, setRows] = useState(initial)
  const { scopeRecords } = useAcademic()
  const { faculty, students, subjects, groups } = related || {}
  const visible = useMemo(() => scopeRecords(rows, { faculty: faculty || [], students: students || [], subjects: subjects || [], groups: groups || [] }), [rows, scopeRecords, faculty, students, subjects, groups])
  return [visible, setRows]
}
// #endregion hooks/useCollegeState.js
return {
  get default() { return useCollegeState; }
};
})();

export const RequestDemoModule = (() => {
const { showSuccess } = toastModule;
const { showError } = toastModule;
const { showWarning } = toastModule;
const { useEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { FiBookOpen } = external3;
const { FiCheckCircle } = external3;
const { FiShield } = external3;
const { FiTrendingUp } = external3;
const { FiX } = external3;
const { demoRoles } = demoRequestModule;
const { emptyDemo } = demoRequestModule;
const { normalizeDemo } = demoRequestModule;
const { validateDemo } = demoRequestModule;
const { submitDemoRequest } = demoRequestModule;
/* Imports for isolated regression tests:
import { showSuccess, showError, showWarning } from '../utils/toast'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FiBookOpen, FiCheckCircle, FiShield, FiTrendingUp, FiX } from 'react-icons/fi'
import { demoRoles, emptyDemo, normalizeDemo, validateDemo, submitDemoRequest } from '../api/demoRequest'
import './RequestDemo.css'
*/
// #region components/RequestDemo.jsx
/* export default */ function RequestDemo({ onClose }) {
  const dialog = useRef(null), lock = useRef(false), mounted = useRef(true)
  const [values, setValues] = useState(emptyDemo), [errors, setErrors] = useState({}), [touched, setTouched] = useState({})
  const markTouched = (name) => setTouched(prev => ({ ...prev, [name]: true }))
  const liveErrors = useMemo(() => validateDemo(values), [values]), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [failure, setFailure] = useState('')
  useEffect(() => {
    mounted.current = true
    const previous = document.activeElement, overflow = document.body.style.overflow
    dialog.current.showModal()
    document.body.style.overflow = 'hidden'
    return () => { mounted.current = false; document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  useEffect(() => { if (result) dialog.current.querySelector('[data-success]')?.focus() }, [result])
  const update = e => {
    const { name, value, checked, type } = e.target
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : name === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : value }))
    setErrors(v => ({ ...v, [name]: undefined })); setFailure('')
  }
  const field = (name, label, { required = false, options, ...props } = {}) => {
    const isTouched = Boolean(touched[name])
    const rawVal = typeof values[name] === 'string' ? values[name].trim() : values[name]
    const hasVal = Boolean(rawVal)
    const err = (isTouched || hasVal) ? (liveErrors[name] || errors[name]) : errors[name]
    return (
      <label className="rd-field" key={name} htmlFor={`rd-${name}`}>
        <span>{label}{required && <b> *</b>}</span>
        {options ? (
          <select id={`rd-${name}`} name={name} value={values[name]} onBlur={() => markTouched(name)} onChange={e => { update(e); markTouched(name); }} required={required} aria-invalid={Boolean(err)} aria-describedby={err ? `rd-${name}-error` : undefined}>
            <option value="">Select {label.toLowerCase()}</option>
            {options.map(x => <option key={x}>{x}</option>)}
          </select>
        ) : (
          <input id={`rd-${name}`} name={name} value={values[name]} onBlur={() => markTouched(name)} onChange={e => { update(e); markTouched(name); }} required={required} maxLength={120} aria-invalid={Boolean(err)} aria-describedby={err ? `rd-${name}-error` : undefined} {...props} />
        )}
        {err && <small id={`rd-${name}-error`} className="rd-error">{err}</small>}
      </label>
    )
  }
  async function submit(e) {
    e.preventDefault()
    if (lock.current) return
    const next = validateDemo(values); setErrors(next)
    if (Object.keys(next).length) { showWarning('Correct the highlighted fields before submitting.'); requestAnimationFrame(() => dialog.current.querySelector('[aria-invalid="true"]')?.focus()); return }
    lock.current = true; setBusy(true); setFailure('')
    try {
      const response = await submitDemoRequest(normalizeDemo(values))
      if (!response || response.success === false) throw new Error('Your request could not be confirmed. Please try again.')
      if (mounted.current) { setResult(response); setValues(emptyDemo); showSuccess('Your enquiry was submitted successfully.') }
    }
    catch (error) { showError(error.message || 'Unable to submit your enquiry.'); if (mounted.current) setFailure(error.message || 'We couldn’t submit your demo request. Please try again.') }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  return <dialog ref={dialog} className={`rd-dialog${result ? " rd-dialog--success" : ""}`} aria-labelledby="rd-title" onCancel={e => { e.preventDefault(); if (!lock.current) onClose() }}>
    <header className="rd-header"><span><FiBookOpen /> Pirnav Digital Campus</span><button type="button" aria-label="Close demo request" onClick={onClose} disabled={busy}><FiX /></button></header>
    <div className="rd-layout"><aside className="rd-brand"><p className="lp-eyebrow">CONNECT WITH THE COLLEGE</p><h2>Your campus.<br />Connected possibilities.</h2><p>Ask about engineering programs, campus life or the digital campus. Share your interests so we can understand your enquiry.</p><ul>{[[FiBookOpen, 'Centralized academic management'], [FiTrendingUp, 'Student lifecycle and promotion tracking'], [FiCheckCircle, 'Admissions, examinations and results'], [FiShield, 'Secure role-based administration']].map(([Icon, text]) => <li key={text}><Icon /><span>{text}</span></li>)}</ul><p className="rd-support">For a digital campus walkthrough, include your organization and the areas you would like to explore.</p></aside>
    <section className="rd-main">{result ? <div className="rd-success" role="status"><FiCheckCircle /><h1 id="rd-title" tabIndex={-1} data-success>Request submitted</h1><p>Thank you for contacting the college.</p><p>Your enquiry has been submitted successfully.</p>{result.reference && <div className="rd-reference"><small>Reference ID</small><strong>{result.reference}</strong></div>}<div className="rd-footer"><button className="lp-button" onClick={() => { onClose(); document.getElementById('home')?.scrollIntoView() }}>Return to Homepage</button><button className="rd-secondary" onClick={onClose}>Close</button></div></div> : <><p className="lp-eyebrow">LET’S EXPLORE YOUR CAMPUS NEEDS</p><h1 id="rd-title">Request information or a demo</h1><p className="rd-intro">Share your contact and institution details. Fields marked <b>*</b> are required.</p>
      <form onSubmit={submit} noValidate aria-busy={busy}><fieldset disabled={busy}><legend>Contact information</legend><div className="rd-grid">{field('fullName', 'Full Name', { required: true, autoComplete: 'name' })}{field('email', 'Email Address', { required: true, type: 'email', autoComplete: 'email' })}{field('mobile', 'Mobile Number (+91)', { required: true, type: 'tel', inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' })}</div></fieldset>
      <fieldset disabled={busy}><legend>Your enquiry</legend><div className="rd-grid">{field('institution', 'Organization / College', { required: true, autoComplete: 'organization', maxLength: 255 })}{field('role', 'Role / Designation', { required: true, options: demoRoles })}{values.role === 'Other' && field('otherRole', 'Your Designation', { required: true, maxLength: 100 })}</div></fieldset>
      <label className="rd-consent"><input type="checkbox" name="consent" checked={values.consent} onChange={update} disabled={busy} required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'rd-consent-error' : undefined} /><span>I agree to be contacted about my enquiry. <b>*</b></span></label>{errors.consent && <p id="rd-consent-error" className="rd-error">{errors.consent}</p>}{failure && <p role="alert" className="rd-error">{failure}</p>}<footer className="rd-footer"><span role="status">{busy ? 'Submitting your request…' : 'A walkthrough shaped around your institution.'}</span><button type="submit" className="lp-button" disabled={busy}>{busy ? 'Submitting Request...' : 'Submit Request'}</button></footer></form></>}</section></div>
  </dialog>
}
// #endregion components/RequestDemo.jsx
return {
  get default() { return RequestDemo; }
};
})();

export const ThemeToggleModule = (() => {
const { useEffect } = external0;
const { useState } = external0;
const { FiMoon } = external3;
const { FiSun } = external3;
/* Imports for isolated regression tests:
import { useEffect, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'
*/
// #region components/ThemeToggle.jsx
const getInitialTheme = () => {
  const stored = localStorage.getItem('pirnav-theme')
  const theme = stored === 'dark' || stored === 'light'
    ? stored
    : window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  // Apply before the first paint so public-page headings never flash with
  // the opposite OS color scheme.
  document.documentElement.dataset.theme = theme
  return theme
}

/* export default */ function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getInitialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pirnav-theme', theme)
  }, [theme])
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return <button type="button" className={`theme-toggle public-theme-toggle ${className}`} onClick={() => setTheme(nextTheme)} aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`}>{theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}</button>
}
// #endregion components/ThemeToggle.jsx
return {
  get default() { return ThemeToggle; }
};
})();

export const DirectoryEmptyStateModule = (() => {
const { Link } = external1;
const { default: EmptyState } = EmptyStateModule;
/* Imports for isolated regression tests:
import { Link } from 'react-router-dom'
import EmptyState from './EmptyState'
*/
// #region components/DirectoryEmptyState.jsx
/* export default */ function DirectoryEmptyState({ title, actionLabel, to, onAction }) {
  return <EmptyState
    title={title}
    action={to
      ? <Link className="erp-btn erp-btn--primary" to={to}>{actionLabel}</Link>
      : <button type="button" className="erp-btn erp-btn--primary" onClick={onAction}>{actionLabel}</button>}
  />
}
// #endregion components/DirectoryEmptyState.jsx
return {
  get default() { return DirectoryEmptyState; }
};
})();

export const ExportMenuModule = (() => {
const { showSuccess } = toastModule;
const { showError } = toastModule;
const { useEffect } = external0;
const { useId } = external0;
const { useRef } = external0;
const { useState } = external0;
const { FiChevronDown } = external3;
const { FiDownload } = external3;
const { FiPrinter } = external3;
const { exportToCsv } = exportUtilsModule;
const { printEntityDetails } = exportUtilsModule;
const { printResults } = exportUtilsModule;
const { printSingleRecord } = exportUtilsModule;
const { cleanRecordSections } = singleRecordExportModule;
const { readVisibleRecordSections } = singleRecordExportModule;
const { singleRecordCsvOptions } = singleRecordExportModule;
/* Imports for isolated regression tests:
import { showSuccess, showError } from '../utils/toast'
import { useEffect, useId, useRef, useState } from 'react'
import { FiChevronDown, FiDownload, FiPrinter } from 'react-icons/fi'
import { exportToCsv, printEntityDetails, printResults, printSingleRecord } from '../utils/exportUtils'
import { cleanRecordSections, readVisibleRecordSections, singleRecordCsvOptions } from '../utils/singleRecordExport'
*/
// #region components/ExportMenu.jsx
const columnsFromSections = (rows, sectionsForRecord) => {
  const definitions = new Map()
  rows.forEach(row => sectionsForRecord(row).forEach(section => section.rows.forEach(([label]) => {
    const key = `${section.title}\u0000${label}`
    if (!definitions.has(key)) definitions.set(key, { section: section.title, label })
  })))
  return [...definitions.values()].map(({ section, label }) => ({
    label: `${section} - ${label}`,
    value: row => sectionsForRecord(row)
      .find(item => item.title === section)?.rows
      .find(([field]) => field === label)?.[1]
  }))
}

/* export default */ function ExportMenu({ rows = [], columns, filename, title, loading = false, scope = 'Current filtered results', unavailable = '', mode = 'list', recordSections, reportType = '', onDownload, allowEmpty = false, printLabel = 'Print / Save as PDF' }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const single = mode === 'single'
  const exportColumns = !single && typeof recordSections === 'function'
    ? columnsFromSections(rows, recordSections)
    : columns
  const hasMappedRows = Boolean(rows.length && exportColumns?.length)
  const hasListDownload = Boolean(onDownload || hasMappedRows)
  const reportLabel = reportType ? `${reportType[0].toUpperCase()}${reportType.slice(1)} Sheet` : ''
  const root = useRef(null), trigger = useRef(null), id = useId()
  const disabled = busy || loading || (!single && !hasListDownload && !allowEmpty) || Boolean(unavailable)
  useEffect(() => {
    if (!open) return undefined
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const run = async (action, message) => { setError(''); setOpen(false); setBusy(true); try { await action({ rows, columns: exportColumns, filename, title, scope }); showSuccess(message) } catch (reason) { setError(reason.message || 'Export failed. Please try again.'); showError(reason.message || 'Export failed. Please try again.') } finally { setBusy(false); trigger.current?.focus() } }
  const selectedSections = () => Array.isArray(recordSections) ? cleanRecordSections(recordSections) : readVisibleRecordSections(root.current?.closest('[data-export-record]'))
  const downloadRecord = () => exportToCsv(singleRecordCsvOptions(selectedSections(), filename))
  const printRecord = () => printSingleRecord({ title, sections: selectedSections() })
  const csvLabel = reportLabel || 'CSV'
  return <div className="export-control" ref={root} data-no-print onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }}>
    <button className="export-button" type="button" ref={trigger} disabled={disabled} aria-expanded={open && !disabled} aria-controls={id} aria-label={`Export ${title}`} title={unavailable || (loading ? 'Loading records...' : rows.length ? scope : 'No records available to export.')} onClick={() => setOpen(value => !value)}><FiDownload aria-hidden="true" /> Export <FiChevronDown aria-hidden="true" /></button>
    {open && !disabled && <div className="export-options" id={id}><small>{single ? 'Current record only' : `${scope} (${rows.length})`}</small><button type="button" disabled={!single && !onDownload && !hasMappedRows} onClick={() => run(single ? downloadRecord : onDownload || exportToCsv, single ? 'Record downloaded successfully' : `${csvLabel} downloaded successfully`)}><FiDownload aria-hidden="true" /> {reportLabel ? `Download ${reportLabel}` : 'Download CSV'}</button><button type="button" disabled={!single && (!rows.length || !exportColumns?.length)} onClick={() => run(single ? printRecord : printResults, 'Print preview opened. Choose Print or Save as PDF in your browser.')}><FiPrinter aria-hidden="true" /> {printLabel}</button></div>}
    {busy && <span role="status">Preparing download...</span>}
    {error && <span className="export-error" role="alert">{error}</span>}
  </div>
}

/* export */ function PrintDetailsButton({ title, selector, loading = false }) {
  const [error, setError] = useState('')
  return <span className="print-control" data-no-print><button type="button" className="export-button" disabled={loading} onClick={event => { setError(''); try { const scope = event.currentTarget.closest('[data-print-scope]') || document.querySelector(selector); printEntityDetails({ title, element: scope }); showSuccess('Print preview opened. Choose Print or Save as PDF in your browser.') } catch (reason) { setError(reason.message); showError(reason.message) } }}><FiPrinter aria-hidden="true" /> Print / Save as PDF</button>{error && <span className="export-error" role="alert">{error}</span>}</span>
}
// #endregion components/ExportMenu.jsx
return {
  get default() { return ExportMenu; },
  get PrintDetailsButton() { return PrintDetailsButton; }
};
})();

export const FilterPanelModule = (() => {
const { Children } = external0;
const { cloneElement } = external0;
const { isValidElement } = external0;
const { useState } = external0;
const { FiChevronDown } = external3;
const { FiFilter } = external3;
const { FiRotateCcw } = external3;
/* Imports for isolated regression tests:
import { Children, cloneElement, isValidElement, useState } from 'react'
import { FiChevronDown, FiFilter, FiRotateCcw } from 'react-icons/fi'
import './FilterPanel.css'
*/
// #region components/FilterPanel.jsx
/* export default */ function FilterPanel({
  children,
  active = false,
  onClear,
  showClearWhenOpen = false,
  className = '',
  actions = null,
  leadingActions = null,
  hideClear = false
}) {
  const [open, setOpen] = useState(false)
  const nodes = Children.toArray(children)
  const primary = nodes[0]
  const primaryChildren = isValidElement(primary) ? Children.toArray(primary.props.children) : []
  const search = isValidElement(primary) && primaryChildren.length
    ? cloneElement(primary, {}, primaryChildren[0])
    : primary
  const filterNodes = [
    ...(isValidElement(primary) && primaryChildren.length > 1
      ? [cloneElement(primary, {}, primaryChildren.slice(1))]
      : []),
    ...nodes.slice(1),
  ]
  const hasFilterFields = filterNodes.length > 0

  return (
    <section className={`filter-disclosure ${open ? 'open' : ''} ${className}`}>
      <div className="filter-disclosure__bar">
        <div className="filter-disclosure__search">{search}</div>
        {leadingActions}
        {hasFilterFields && (
          <button
            type="button"
            className="filter-disclosure__toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <FiFilter /> Filters{active && <i aria-label="Filters applied" />}
            <FiChevronDown className="filter-disclosure__chevron" />
          </button>
        )}
        {actions}
      </div>
      {open && hasFilterFields && (
        <div className="filter-disclosure__content">
          <div className="filter-disclosure__content-inner">
            {filterNodes}
            {!hideClear && onClear && active && (
              <button
                type="button"
                className="filter-disclosure__clear-btn"
                onClick={onClear}
                title="Clear all filters"
              >
                <FiRotateCcw aria-hidden="true" /> Clear Filters
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
// #endregion components/FilterPanel.jsx
return {
  get default() { return FilterPanel; }
};
})();

export const StatusConfirmDialogModule = (() => {

/* Imports for isolated regression tests:
import './StatusConfirmDialog.css'
*/
// #region components/StatusConfirmDialog.jsx
/* export default */ function StatusConfirmDialog({ entity, name, nextStatus, onCancel, onConfirm, busy = false, blocked = false, description = '', error = '', details = [], confirmLabel = '' }) {
  const activate = String(nextStatus).toLowerCase() === 'active'
  const action = activate ? 'Activate' : 'Deactivate'
  return <div className="status-confirm-backdrop" onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}>
    <section className="status-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="status-confirm-title" aria-describedby="status-confirm-description">
      <button type="button" className="status-confirm-close" aria-label="Close dialog" onClick={onCancel} disabled={busy}>×</button>
      <i aria-hidden="true">!</i>
      <h2 id="status-confirm-title">{blocked ? `${entity} cannot be deactivated` : `${action} ${entity}?`}</h2>
      <p id="status-confirm-description">{blocked ? <><strong>{name}</strong> has associated student records.</> : <>Are you sure you want to {action.toLowerCase()} <strong>{name}</strong>?</>}</p>
      {details.length > 0 && <dl className="status-confirm-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      {description && <p>{description}</p>}
      {error && <p role="alert">{error}</p>}
      <footer>
        <button type="button" onClick={onCancel} disabled={busy}>{blocked ? 'Close' : 'Cancel'}</button>
        {!blocked && <button type="button" className={activate ? 'confirm-active' : 'confirm-inactive'} onClick={onConfirm} disabled={busy}>{busy ? 'Updating...' : confirmLabel || action}</button>}
      </footer>
    </section>
  </div>
}
// #endregion components/StatusConfirmDialog.jsx
return {
  get default() { return StatusConfirmDialog; }
};
})();

export const StatusBadgeModule = (() => {

/* Imports for isolated regression tests:
import './StatusBadge.css'
*/
// #region components/StatusBadge.jsx
const normalizeStatusKey = (val) => {
  if (val === null || val === undefined) return 'unknown'
  const str = String(val).trim().toLowerCase().replace(/[_\s-]+/g, '-')
  if (['1', 'true', 'active', 'admitted', 'success', 'successful', 'eligible', 'working', 'permanent', 'regular', 'confirmed', 'available', 'present', 'passed', 'pass', 'open', 'enabled', 'allocated'].includes(str)) return 'active'
  if (['paid'].includes(str)) return 'paid'
  if (['0', 'false', 'inactive', 'deactive', 'archived', 'ineligible', 'resigned', 'relieved', 'terminated', 'retired', 'unpaid', 'unavailable', 'rejected', 'failed', 'fail', 'expired', 'shortage', 'suspended', 'absent', 'closed', 'disabled'].includes(str)) return 'inactive'
  if (['warning', 'upcoming', 'probation', 'on-probation', 'notice-period', 'contract'].includes(str)) return 'warning'
  if (['hold', 'on-hold'].includes(str)) return 'hold'
  if (['processed', 'processing', 'completed', 'transferred'].includes(str)) return 'processed'
  if (['pending', 'submitted', 'under-review', 'application-submitted', 'partial', 'in-progress'].includes(str)) return 'pending'
  if (['approved', 'verified'].includes(str)) return 'approved'
  if (['on-leave', 'leave'].includes(str)) return 'on-leave'
  if (['draft'].includes(str)) return 'draft'
  if (['correction-required'].includes(str)) return 'correction-required'
  return str
}

/* export default */ function StatusBadge({
  value,
  status,
  children,
  tone,
  className = '',
}) {
  const displayVal = children ?? value ?? status ?? ''
  if (!displayVal && displayVal !== 0) return null

  const key = tone ? String(tone).toLowerCase() : normalizeStatusKey(displayVal)
  const label = typeof displayVal === 'boolean'
    ? (displayVal ? 'Active' : 'Inactive')
    : String(displayVal)

  return (
    <span className={`erp-status-badge erp-status-badge--${key} ${className}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  )
}
// #endregion components/StatusBadge.jsx
return {
  get default() { return StatusBadge; }
};
})();

export const InfoCardModule = (() => {
const { default: StatusBadge } = StatusBadgeModule;
/* Imports for isolated regression tests:
import './InfoCard.css'
import StatusBadge from './StatusBadge'
*/
// #region components/InfoCard.jsx
const isCleanValue = (val) => {
  if (val === null || val === undefined) return false
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed === '' || trimmed === '-' || trimmed === '-' || trimmed.toLowerCase() === 'not provided' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return false
    }
    return true
  }
  if (typeof val === 'number' || typeof val === 'boolean') return true
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === 'object') return Object.keys(val).length > 0
  return true
}

const isStatusLabel = (label = '') => /\b(status|eligibility)\b/i.test(String(label))

function DetailsValue({ label, value }) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && isStatusLabel(label)) {
    return <StatusBadge value={value} />
  }
  return value
}

/* export default */ function InfoCard({
  icon: Icon,
  title,
  rows = [],
  items = [],
  children,
  className = '',
}) {
  const combinedRows = rows.length > 0 ? rows : items
  const visibleRows = combinedRows.filter((item) => {
    if (!item) return false
    if (Array.isArray(item)) {
      return isCleanValue(item[1])
    }
    return isCleanValue(item.value)
  })

  if (!visibleRows.length && !children) {
    return null
  }

  return (
    <section className={`cm-info-card sa-detail-panel sa-modern-panel erp-view-section ${className}`}>
      {(Icon || title) && (
        <div className="cm-info-card-header sa-panel-header">
          <div className="sa-panel-title-wrap">
            {Icon && <span className="sa-panel-icon"><Icon aria-hidden="true" /></span>}
            {title && <h2>{title}</h2>}
          </div>
          {visibleRows.length > 0 && <span className="sa-card-count-badge">{visibleRows.length} items</span>}
        </div>
      )}

      {visibleRows.length > 0 && (
        <div className="cm-info-rows sa-detail-kv-grid erp-view-grid">
          {visibleRows.map((item, idx) => {
            const label = Array.isArray(item) ? item[0] : item.label
            const val = Array.isArray(item) ? item[1] : item.value
            return (
              <div className="cm-info-row sa-kv-cell erp-view-field" key={label || idx}>
                <span className="cm-info-label sa-kv-label erp-view-label">{label}</span>
                <strong className="cm-info-val sa-kv-val erp-view-value"><DetailsValue label={label} value={val} /></strong>
              </div>
            )
          })}
        </div>
      )}

      {children}
    </section>
  )
}
// #endregion components/InfoCard.jsx
return {
  get default() { return InfoCard; }
};
})();

export const ViewDialogModule = (() => {
const { default: ExportMenu } = ExportMenuModule;
const { useEffect } = external0;
const { useRef } = external0;
const { FiX } = external3;
/* Imports for isolated regression tests:
import ExportMenu from './ExportMenu'
import { useEffect, useRef } from 'react'
import { FiX } from 'react-icons/fi'
import './ViewDialog.css'
*/
// #region components/ViewDialog.jsx
/* export default */ function ViewDialog({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  exportFilename,
  recordSections,
  footerActions,
  maxWidth = '860px',
  hideFooter = false,
}) {
  const dialog = useRef(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousFocus = document.activeElement
    if (!element.open) {
      element.showModal()
    }
    return () => {
      element.close()
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      className="shared-view-dialog"
      data-export-record
      aria-label={title}
      style={{ maxWidth }}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose?.()
      }}
    >
      <header className="shared-view-dialog__header">
        <div className="shared-view-dialog__heading">
          {Icon && (
            <div className="shared-view-dialog__icon-badge">
              <Icon />
            </div>
          )}
          <div>
            <h2 className="shared-view-dialog__title">{title}</h2>
            {subtitle && <p className="shared-view-dialog__subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="shared-view-dialog__actions">
          <ExportMenu
            mode="single"
            title={title}
            filename={exportFilename || title}
            recordSections={recordSections}
          />
          <button
            type="button"
            className="shared-view-dialog__close-btn"
            aria-label="Close details"
            title="Close"
            onClick={onClose}
          >
            <FiX size={18} />
          </button>
        </div>
      </header>

      <div className="shared-view-dialog__body">
        {children}
      </div>

      {!hideFooter && (
        <footer className="shared-view-dialog__footer">
          <button
            type="button"
            className="erp-btn erp-btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
          {footerActions && (
            <div className="shared-view-dialog__footer-actions">
              {footerActions}
            </div>
          )}
        </footer>
      )}
    </dialog>
  )
}
// #endregion components/ViewDialog.jsx
return {
  get default() { return ViewDialog; }
};
})();

export const TableActionButtonModule = (() => {
const { default: React } = external0;
const { Link } = external1;
const { FiEye } = external3;
const { FiEdit2 } = external3;
const { FiUserPlus } = external3;
const { FiToggleLeft } = external3;
const { FiToggleRight } = external3;
const { FiCheckCircle } = external3;
/* Imports for isolated regression tests:
import React from 'react'
import { Link } from 'react-router-dom'
import {
  FiEye,
  FiEdit2,
  FiUserPlus,
  FiToggleLeft,
  FiToggleRight,
  FiCheckCircle,
} from 'react-icons/fi'
*/
// #region components/TableActionButton.jsx
const DEFAULT_ICONS = {
  view: FiEye,
  edit: FiEdit2,
  assign: FiUserPlus,
  activate: FiToggleLeft,
  deactivate: FiToggleRight,
  review: FiCheckCircle,
}

const DEFAULT_TITLES = {
  view: 'View Details',
  edit: 'Edit',
  assign: 'Assign',
  activate: 'Activate',
  deactivate: 'Deactivate',
  review: 'Review / Approve',
}

/**
 * Standardized compact ERP table action button
 */
/* export */ function TableActionButton({
  type = 'view',
  to,
  onClick,
  title,
  ariaLabel,
  disabled = false,
  icon: CustomIcon,
  className = '',
  children,
  ...props
}) {
  const IconComponent = CustomIcon || DEFAULT_ICONS[type] || FiEye
  const actionTitle = title || DEFAULT_TITLES[type] || ''
  const actionAriaLabel = ariaLabel || actionTitle || type

  const classNames = [
    'table-action-btn',
    `action-${type}`,
    className,
  ].filter(Boolean).join(' ')

  if (to && !disabled) {
    return (
      <Link
        to={to}
        className={classNames}
        title={actionTitle}
        aria-label={actionAriaLabel}
        {...props}
      >
        {children || (IconComponent && <IconComponent className="table-action-icon" />)}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      title={actionTitle}
      aria-label={actionAriaLabel}
      disabled={disabled}
      {...props}
    >
      {children || (IconComponent && <IconComponent className="table-action-icon" />)}
    </button>
  )
}

/**
 * Container for grouping table actions with consistent gap and alignment
 */
/* export */ function TableActionsGroup({ children, className = '', ...props }) {
  return (
    <div className={`table-actions-group ${className}`} {...props}>
      {children}
    </div>
  )
}

/* export default TableActionButton */
// #endregion components/TableActionButton.jsx
return {
  get TableActionButton() { return TableActionButton; },
  get TableActionsGroup() { return TableActionsGroup; },
  get default() { return TableActionButton; }
};
})();

export const ModuleAvailabilityModule = (() => {
const { useState } = external0;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: PageHeader } = PageHeaderModule;
const { default: EmptyState } = EmptyStateModule;
/* Imports for isolated regression tests:
import { useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import PageHeader from './PageHeader'
import EmptyState from './EmptyState'
*/
// #region components/ModuleAvailability.jsx
// Development opens the existing designs, but never represents local data as official.
/* export default */ function ModuleAvailability({ title, dependency, children }) {
  const [preview, setPreview] = useState(() => import.meta.env.DEV && Boolean(children))
  if (import.meta.env.DEV && preview) return <><div role="status" style={{ padding: '12px 24px', background: 'var(--surface-soft)', color: 'var(--text-primary)' }}>Local design preview only. Records, approvals and publication here are not institutional records. <button type="button" onClick={() => setPreview(false)}>Close preview</button></div>{children}</>
  return <DashboardLayout><PageHeader title={title} subtitle="Institutional integration is not available." /><EmptyState title="Backend integration required" message={dependency} />{import.meta.env.DEV && children && <details><summary>Development preview</summary><p>Uses browser-local data. It does not create official records or publish results.</p><button className="erp-btn erp-btn--secondary" onClick={() => setPreview(true)}>Open local design preview</button></details>}</DashboardLayout>
}
// #endregion components/ModuleAvailability.jsx
return {
  get default() { return ModuleAvailability; }
};
})();

export const ToastProviderModule = (() => {
const { useSyncExternalStore } = external0;
const { createPortal } = external2;
const { FiCheckCircle } = external3;
const { FiAlertCircle } = external3;
const { FiAlertTriangle } = external3;
const { FiInfo } = external3;
const { FiX } = external3;
const { dismissToast } = toastModule;
const { getToasts } = toastModule;
const { subscribeToToasts } = toastModule;
/* Imports for isolated regression tests:
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi'
import { dismissToast, getToasts, subscribeToToasts } from '../utils/toast'
import './ToastProvider.css'
*/
// #region components/ToastProvider.jsx
const icons = { success: FiCheckCircle, error: FiAlertCircle, warning: FiAlertTriangle, info: FiInfo }

/* export default */ function ToastProvider({ children }) {
  const toasts = useSyncExternalStore(subscribeToToasts, getToasts, getToasts)
  // Errors are rendered inside the active screen by DashboardLayout so they
  // never cover the header or compete with a screen's own inline error.
  return <>{children}{createPortal(<aside className="global-toasts" aria-label="Notifications" data-no-print>
    {toasts.filter(toast => toast.type !== 'error').map(toast => {
      const Icon = icons[toast.type]
      return <div key={toast.id} className={`global-toast global-toast--${toast.type}`}>
        <Icon aria-hidden="true" />
        <span role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'} aria-atomic="true">{toast.message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}><FiX aria-hidden="true" /></button>
      </div>
    })}
  </aside>, document.body)}</>
}
// #endregion components/ToastProvider.jsx
return {
  get default() { return ToastProvider; }
};
})();

export function ContextGuardModule() {
const { default: React } = external0;
const { useState } = external0;
const { Link } = external1;
const { useLocation } = external1;
const { FiHome } = external3;
const { FiCalendar } = external3;
const { FiCheckCircle } = external3;
const { FiArrowRight } = external3;
const { FiPlusCircle } = external3;
const { useAcademic } = AcademicContextModule;
/* Imports for isolated regression tests:
import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiCalendar, FiCheckCircle, FiArrowRight, FiPlusCircle } from 'react-icons/fi'
import { useAcademic } from '../context/AcademicContext'
import './ContextGuard.css'
*/
// #region components/ContextGuard.jsx
const SETUP_ROUTES = [
  '/college-institution-management',
  '/academic-year-management',
  '/department-management',
  '/settings',
]

/* export default */ function ContextGuard({ children }) {
  const location = useLocation()
  const {
    loading,
    colleges,
    academicYears,
    selectedCollegeId,
    selectedAcademicYearId,
    selectedCollege,
    selectedAcademicYear,
    applyAcademicContext,
  } = useAcademic()

  const [tempCollegeId, setTempCollegeId] = useState('')
  const [tempYearId, setTempYearId] = useState('')
  const [saving, setSaving] = useState(false)

  // Allow administrative management routes to be accessed even without established context
  const isSetupRoute = SETUP_ROUTES.some((route) => location.pathname.startsWith(route))
  if (isSetupRoute) {
    return children
  }

  // Context is valid if both college and academic year are resolved
  const hasValidContext = Boolean(
    selectedCollegeId &&
    selectedAcademicYearId &&
    selectedCollege &&
    selectedAcademicYear
  )

  if (loading) {
    return (
      <div className="context-guard-loading">
        <div className="context-guard-spinner" />
        <p>Initializing Academic Context...</p>
      </div>
    )
  }

  if (hasValidContext) {
    return children
  }

  const hasColleges = Array.isArray(colleges) && colleges.length > 0
  const hasYears = Array.isArray(academicYears) && academicYears.length > 0

  // If no valid context is available, show the setup experience
  const handleProceed = async (e) => {
    e.preventDefault()
    const targetColId = tempCollegeId || (colleges[0] ? String(colleges[0].id ?? colleges[0].collegeId) : '')
    const targetYearId = tempYearId || (academicYears[0] ? String(academicYears[0].id ?? academicYears[0].academicYearId) : '')

    if (!targetColId || !targetYearId) return

    setSaving(true)
    try {
      await applyAcademicContext(targetColId, targetYearId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="context-guard-overlay">
      <div className="context-guard-card">
        <div className="context-guard-header">
          <div className="context-guard-icon">
            <FiHome />
          </div>
          <div>
            <span className="context-guard-eyebrow">Welcome to Pirnav Digital Campus</span>
            <h2>Select Working Context</h2>
            <p>Choose your active College and Academic Year to configure your operational workspace.</p>
          </div>
        </div>

        <form onSubmit={handleProceed} className="context-guard-form">
          <label className="context-guard-field">
            <span>
              <FiHome aria-hidden="true" /> College / Institution
            </span>
            {hasColleges ? (
              <select
                value={tempCollegeId || selectedCollegeId || (colleges[0] ? String(colleges[0].id ?? colleges[0].collegeId) : '')}
                onChange={(e) => setTempCollegeId(e.target.value)}
                required
              >
                {colleges.map((c) => {
                  const id = String(c.id ?? c.collegeId)
                  return (
                    <option key={id} value={id}>
                      {c.name || c.collegeName || 'College'}
                    </option>
                  )
                })}
              </select>
            ) : (
              <div className="context-guard-empty-box">
                <span>No colleges found.</span>
                <Link to="/college-institution-management/add" className="context-guard-link-btn">
                  <FiPlusCircle /> Add College
                </Link>
              </div>
            )}
          </label>

          <label className="context-guard-field">
            <span>
              <FiCalendar aria-hidden="true" /> Academic Year
            </span>
            {hasYears ? (
              <select
                value={tempYearId || selectedAcademicYearId || (academicYears[0] ? String(academicYears[0].id ?? academicYears[0].academicYearId) : '')}
                onChange={(e) => setTempYearId(e.target.value)}
                required
              >
                {academicYears.map((y) => {
                  const id = String(y.id ?? y.academicYearId)
                  return (
                    <option key={id} value={id}>
                      {y.academicYearName || y.name || 'Academic Year'} {y.isCurrent ? '(Current)' : ''}
                    </option>
                  )
                })}
              </select>
            ) : (
              <div className="context-guard-empty-box">
                <span>No academic years found.</span>
                <Link to="/academic-year-management" className="context-guard-link-btn">
                  <FiPlusCircle /> Manage Academic Years
                </Link>
              </div>
            )}
          </label>

          <div className="context-guard-hint">
            <FiCheckCircle />
            <span>Change your college from the <strong>dropdown at the top of the sidebar</strong> and your year from the <strong>academic year menu in the header</strong>.</span>
          </div>

          <button
            type="submit"
            className="context-guard-btn"
            disabled={saving || !hasColleges || !hasYears}
          >
            {saving ? 'Setting up workspace...' : 'Continue to Dashboard'} <FiArrowRight />
          </button>
        </form>
      </div>
    </div>
  )
}
// #endregion components/ContextGuard.jsx
return {
  get default() { return ContextGuard; }
};
}

export function EntityDetailsModule() {
const { isRenderableDetailValue } = detailValuesModule;
/* Imports for isolated regression tests:
import { isRenderableDetailValue } from '../utils/detailValues'
*/
// #region components/EntityDetails.jsx
/* export */ function DetailsField({ label, value, className = '' }) {
  if (!isRenderableDetailValue(value)) return null
  return <div className={`erp-view-field ${className}`.trim()}><span className="erp-view-label">{label}</span><strong className="erp-view-value">{value}</strong></div>
}

/* export */ function DetailsGrid({ children, className = '' }) {
  const fields = Array.isArray(children) ? children.filter(Boolean) : children
  if (!fields) return null
  return <div className={`erp-view-grid ${className}`.trim()}>{fields}</div>
}

/* export */ function DetailsSection({ icon: Icon, title, description, children, className = '' }) {
  if (!children) return null
  return <section className={`erp-view-section ${className}`.trim()}><header className="erp-view-section-header">{Icon && <Icon aria-hidden="true" />}<div><h2>{title}</h2>{description && <p>{description}</p>}</div></header>{children}</section>
}

/* export */ function EntityDetailsPage({ children, className = '' }) {
  return <main className={`erp-view ${className}`.trim()}>{children}</main>
}

/* export */ function EntityHero({ avatar, title, meta, status, actions, children }) {
  return <section className="erp-view-hero"><div className="erp-view-avatar">{avatar}</div><div className="erp-view-identity"><h1>{title}</h1>{meta && <p>{meta}</p>}{children}</div>{(status || actions) && <div className="erp-view-hero-side">{status && <span className="erp-view-status">{status}</span>}{actions && <div className="erp-view-actions">{actions}</div>}</div>}</section>
}

/* export */ function EntityTabs({ children }) {
  return <nav className="erp-view-tabs" aria-label="Details sections">{children}</nav>
}
// #endregion components/EntityDetails.jsx
return {
  get DetailsField() { return DetailsField; },
  get DetailsGrid() { return DetailsGrid; },
  get DetailsSection() { return DetailsSection; },
  get EntityDetailsPage() { return EntityDetailsPage; },
  get EntityHero() { return EntityHero; },
  get EntityTabs() { return EntityTabs; }
};
}
