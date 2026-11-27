import { useMemo, useState } from 'react'
import { FiAlertCircle, FiBookOpen, FiCheck, FiCheckCircle, FiEdit2, FiPlus, FiSearch, FiTrash2, FiUser } from 'react-icons/fi'
import { getAuthStorage, getUserRoleDisplayName } from '../../auth/auth.js'
import './LibrarianPortal.css'

const titleMap = {
  'book-categories': 'Book Categories', 'authors-publishers': 'Authors & Publishers', reservations: 'Reservation Requests', inventory: 'Inventory Management',
  'damaged-books': 'Damaged Books', 'lost-books': 'Lost Books', 'stock-verification': 'Stock Verification', 'fine-rules': 'Fine Rules', 'faculty-accounts': 'Faculty Library Accounts', 'book-copies': 'Book Copies / Stock',
  notifications: 'Notifications', settings: 'Library Settings', profile: 'My Profile',
}
const seed = {
  'book-categories': [
    { id: 'cat-1', code: 'CS', name: 'Computer Science', description: 'Computing, software, and algorithms' },
    { id: 'cat-2', code: 'MATH', name: 'Mathematics', description: 'Engineering and applied mathematics' },
    { id: 'cat-3', code: 'PHY', name: 'Physics', description: 'Physics and applied science' },
  ],
  'authors-publishers': [
    { id: 'person-1', type: 'Author', name: 'R. S. Salaria', books: 'Programming in C' },
    { id: 'person-2', type: 'Author', name: 'B. S. Grewal', books: 'Higher Engineering Mathematics' },
    { id: 'person-3', type: 'Publisher', name: 'S. Chand Publishing', books: 'Engineering reference collection' },
  ],
  'faculty-accounts': [
    { id: 'faculty-member-1', name: 'Dr. Kavitha Rao', employeeId: 'FAC-018', department: 'Computer Science', membershipStatus: 'Active', borrowLimit: '5' },
    { id: 'faculty-member-2', name: 'Prof. Suresh Bhandari', employeeId: 'FAC-027', department: 'Mathematics', membershipStatus: 'Active', borrowLimit: '5' },
  ],
  reservations: [
    { id: 'res-1001', book: 'Introduction to Algorithms', member: 'Aarav Sharma · 22CSE014', requestDate: '2026-11-25', status: 'Pending' },
    { id: 'res-1002', book: 'Engineering Mathematics', member: 'Priya Singh · 23ECE008', requestDate: '2026-11-24', status: 'Pending' },
    { id: 'res-1003', book: 'Database System Concepts', member: 'Rahul Verma · 22CSE021', requestDate: '2026-11-21', status: 'Approved' },
  ],
  inventory: [
    { id: 'inv-1', accession: 'LIB-01042', book: 'Introduction to Algorithms', shelf: 'CS-A12', condition: 'Available' },
    { id: 'inv-2', accession: 'LIB-01043', book: 'Introduction to Algorithms', shelf: 'CS-A12', condition: 'Available' },
    { id: 'inv-3', accession: 'LIB-00816', book: 'Database System Concepts', shelf: 'CS-B04', condition: 'Damaged' },
    { id: 'inv-4', accession: 'LIB-00493', book: 'Engineering Mathematics', shelf: 'MA-C09', condition: 'Lost' },
  ],
  notifications: [
    { id: 'n-1', title: 'Overdue book needs follow-up', detail: 'Introduction to Algorithms · Aarav Sharma', date: '2026-11-27', read: false },
    { id: 'n-2', title: 'Low stock alert', detail: 'Database System Concepts has one available copy.', date: '2026-11-26', read: false },
    { id: 'n-3', title: 'Reservation request received', detail: 'Engineering Mathematics · Priya Singh', date: '2026-11-24', read: true },
  ],
}
const storageKey = screen => `cms-librarian-${screen}`
function readRows(screen) {
  try { const value = JSON.parse(localStorage.getItem(storageKey(screen))); return Array.isArray(value) ? value : seed[screen] || [] } catch { return seed[screen] || [] }
}
function saveRows(screen, rows) { localStorage.setItem(storageKey(screen), JSON.stringify(rows)) }

function LocalTable({ rows, columns, empty, actions }) {
  if (!rows.length) return <div className="librarian-empty"><FiBookOpen aria-hidden="true" /><strong>{empty}</strong><span>Add or adjust a record to see it here.</span></div>
  return <div className="librarian-local-table"><table><thead><tr>{columns.map(([key, label]) => <th key={key}>{label}</th>)}{actions && <th className="librarian-action-heading">Actions</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{columns.map(([key]) => <td key={key}>{key === 'status' || key === 'condition' || key === 'membershipStatus' ? <span className={`librarian-status is-${String(row[key]).toLowerCase()}`}>{row[key]}</span> : row[key] || '—'}</td>)}{actions && <td className="librarian-action-cell">{actions(row)}</td>}</tr>)}</tbody></table></div>
}

function DirectoryWorkspace({ screen }) {
  const [rows, setRows] = useState(() => readRows(screen))
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const filtered = useMemo(() => rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(query.toLowerCase().trim()))), [rows, query])
  const setRecord = next => { setRows(next); saveRows(screen, next) }
  const isFacultyDirectory = screen === 'faculty-accounts'
  const fields = screen === 'book-categories' ? [['code', 'Category code'], ['name', 'Category name'], ['description', 'Description']] : isFacultyDirectory ? [['name', 'Faculty name'], ['employeeId', 'Employee ID'], ['department', 'Department'], ['membershipStatus', 'Membership status'], ['borrowLimit', 'Borrowing limit']] : [['type', 'Record type'], ['name', 'Name'], ['books', 'Associated titles']]
  const columns = screen === 'book-categories' ? [['code', 'Code'], ['name', 'Category'], ['description', 'Description']] : isFacultyDirectory ? [['employeeId', 'Employee ID'], ['name', 'Faculty member'], ['department', 'Department'], ['membershipStatus', 'Membership status'], ['borrowLimit', 'Borrow limit']] : [['type', 'Type'], ['name', 'Author / Publisher'], ['books', 'Associated books']]
  const submit = event => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    if (fields.some(([key]) => !String(values[key] || '').trim())) { setError('Complete all fields before saving.'); return }
    if (screen === 'book-categories' && rows.some(row => row.id !== editor?.id && row.code.toLowerCase() === values.code.trim().toLowerCase())) { setError('That category code already exists.'); return }
    const record = { id: editor?.id || crypto.randomUUID(), ...values }
    const next = editor ? rows.map(row => row.id === editor.id ? record : row) : [record, ...rows]
    setRecord(next); setEditor(null); setError(''); setNotice(editor ? 'Record updated in this browser.' : 'Record added in this browser.')
  }
  return <>
    <header className="librarian-content-heading"><div><p className="librarian-eyebrow">{isFacultyDirectory ? 'MEMBER SERVICES' : 'LIBRARY CATALOG'}</p><h1>{titleMap[screen]}</h1><p>{screen === 'book-categories' ? 'Organize the catalog into clear subject collections.' : isFacultyDirectory ? 'Maintain library borrowing accounts for faculty members.' : 'Maintain a reference directory for catalog contributors.'}</p></div><button type="button" className="librarian-primary-button" onClick={() => { setEditor({}); setError('') }}><FiPlus />Add {isFacultyDirectory ? 'faculty account' : screen === 'book-categories' ? 'category' : 'record'}</button></header>
    <p className="librarian-local-note"><FiAlertCircle />{isFacultyDirectory ? 'Faculty membership records are local sample data. The current circulation service supports student member IDs only.' : 'These supporting records are stored in this browser only; the current library service does not provide these management operations.'}</p>
    {notice && <p className="librarian-inline-success" role="status"><FiCheckCircle />{notice}</p>}
    <section className="librarian-card"><div className="librarian-toolbar"><label><FiSearch /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search records" aria-label="Search records" /></label><span>{filtered.length} records</span></div>
      <LocalTable rows={filtered} columns={columns} empty="No matching records" actions={row => <div className="librarian-row-actions"><button type="button" aria-label={`Edit ${row.name}`} onClick={() => { setEditor(row); setError('') }}><FiEdit2 /></button><button type="button" aria-label={`Delete ${row.name}`} onClick={() => setDeleteTarget(row)}><FiTrash2 /></button></div>} />
    </section>
    {editor && <div className="librarian-modal-backdrop"><section className="librarian-modal" role="dialog" aria-modal="true" aria-labelledby="librarian-editor-title"><h2 id="librarian-editor-title">{editor.id ? 'Edit' : 'Add'} {screen === 'book-categories' ? 'category' : 'author or publisher'}</h2><form onSubmit={submit}>
      {fields.map(([key, label]) => <label key={key}>{label}{key === 'type' ? <select name={key} defaultValue={editor[key] || 'Author'}><option>Author</option><option>Publisher</option></select> : key === 'membershipStatus' ? <select name={key} defaultValue={editor[key] || 'Active'}><option>Active</option><option>Suspended</option><option>Inactive</option></select> : <input name={key} required defaultValue={editor[key] || ''} />}</label>)}
      {error && <p className="librarian-inline-error" role="alert">{error}</p>}<div className="librarian-modal-actions"><button type="button" onClick={() => setEditor(null)}>Cancel</button><button type="submit" className="is-primary"><FiCheck />Save record</button></div>
    </form></section></div>}
    {deleteTarget && <div className="librarian-modal-backdrop"><section className="librarian-modal" role="alertdialog" aria-modal="true" aria-labelledby="librarian-delete-title"><h2 id="librarian-delete-title">Delete this local record?</h2><p>{deleteTarget.name || deleteTarget.book || deleteTarget.code} will be removed from this browser.</p><div className="librarian-modal-actions"><button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="is-danger" onClick={() => { setRecord(rows.filter(item => item.id !== deleteTarget.id)); setDeleteTarget(null); setNotice('Record removed from this browser.') }}>Delete record</button></div></section></div>}
  </>
}

function ReservationsWorkspace() {
  const [rows, setRows] = useState(() => readRows('reservations'))
  const [notice, setNotice] = useState('')
  const update = (id, status) => { const next = rows.map(row => row.id === id ? { ...row, status } : row); setRows(next); saveRows('reservations', next); setNotice(`Reservation ${status.toLowerCase()} in this browser.`) }
  return <><header className="librarian-content-heading"><div><p className="librarian-eyebrow">CIRCULATION</p><h1>Reservation Requests</h1><p>Review and update the sample reservation queue.</p></div></header><p className="librarian-local-note"><FiAlertCircle />Reservation endpoints are not available; decisions are saved in this browser only.</p>{notice && <p className="librarian-inline-success" role="status"><FiCheckCircle />{notice}</p>}<section className="librarian-card"><LocalTable rows={rows} columns={[[ 'id', 'Reservation ID' ], [ 'book', 'Book' ], [ 'member', 'Member' ], [ 'requestDate', 'Requested' ], [ 'status', 'Status' ]]} empty="No reservations" actions={row => row.status === 'Pending' ? <div className="librarian-row-actions librarian-row-actions--decision"><button type="button" onClick={() => update(row.id, 'Approved')}>Approve</button><button type="button" onClick={() => update(row.id, 'Rejected')}>Decline</button></div> : <span className="librarian-action-complete">Reviewed</span>} /></section></>
}

function InventoryWorkspace({ screen }) {
  const [rows, setRows] = useState(() => readRows('inventory'))
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState(screen === 'damaged-books' ? 'Damaged' : screen === 'lost-books' ? 'Lost' : '')
  const filtered = rows.filter(row => !filter || row.condition === filter)
  const change = (id, condition) => { const next = rows.map(row => row.id === id ? { ...row, condition } : row); setRows(next); saveRows('inventory', next); setNotice(`Copy marked ${condition.toLowerCase()} in this browser.`) }
  return <><header className="librarian-content-heading"><div><p className="librarian-eyebrow">COLLECTION CONTROL</p><h1>{titleMap[screen] || 'Inventory Management'}</h1><p>Track individual sample copies and record condition changes.</p></div></header><p className="librarian-local-note"><FiAlertCircle />These are sample copy records stored in this browser; stock changes are not synchronized with the institutional catalog.</p>{notice && <p className="librarian-inline-success" role="status"><FiCheckCircle />{notice}</p>}<section className="librarian-card"><div className="librarian-toolbar"><label>Condition<select value={filter} onChange={event => setFilter(event.target.value)}><option value="">All conditions</option>{['Available', 'Damaged', 'Lost', 'Missing', 'Withdrawn'].map(value => <option key={value}>{value}</option>)}</select></label><span>{filtered.length} copies</span></div><LocalTable rows={filtered} columns={[[ 'accession', 'Accession number' ], [ 'book', 'Book title' ], [ 'shelf', 'Shelf / Rack' ], [ 'condition', 'Condition' ]]} empty="No copies in this filter" actions={row => <select className="librarian-condition-select" aria-label={`Condition for ${row.accession}`} value={row.condition} onChange={event => change(row.id, event.target.value)}>{['Available', 'Damaged', 'Lost', 'Missing', 'Withdrawn'].map(value => <option key={value}>{value}</option>)}</select>} /></section></>
}

function ConfigWorkspace({ screen }) {
  const key = storageKey(screen)
  const defaults = screen === 'fine-rules' ? { finePerDay: '5', gracePeriod: '0', maximumFine: '500', lostBookCharge: '1200', damagedBookCharge: '300' }
    : { libraryName: 'Central Library', openingTime: '08:00', closingTime: '18:00', maxStudentBooks: '3', maxFacultyBooks: '5', borrowingDays: '14', renewalLimit: '2', reservationLimit: '2' }
  const [values, setValues] = useState(() => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { return defaults } })
  const [notice, setNotice] = useState('')
  const save = event => { event.preventDefault(); localStorage.setItem(key, JSON.stringify(values)); setNotice('Saved in this browser. These settings do not affect the library service.') }
  const fieldLabels = screen === 'fine-rules' ? [['finePerDay', 'Fine per overdue day (₹)'], ['gracePeriod', 'Grace period (days)'], ['maximumFine', 'Maximum fine (₹)'], ['lostBookCharge', 'Lost book charge (₹)'], ['damagedBookCharge', 'Damaged book charge (₹)']] : [['libraryName', 'Library name'], ['openingTime', 'Opening time'], ['closingTime', 'Closing time'], ['maxStudentBooks', 'Maximum books per student'], ['maxFacultyBooks', 'Maximum books per faculty'], ['borrowingDays', 'Default borrowing period (days)'], ['renewalLimit', 'Renewal limit'], ['reservationLimit', 'Reservation limit']]
  return <><header className="librarian-content-heading"><div><p className="librarian-eyebrow">LIBRARY ADMINISTRATION</p><h1>{titleMap[screen]}</h1><p>{screen === 'fine-rules' ? 'Review the proposed fine schedule for the local preview.' : 'Configure local library preferences for this browser.'}</p></div></header><p className="librarian-local-note"><FiAlertCircle />These preferences are local preview settings. The library service does not expose a configuration endpoint.</p>{notice && <p className="librarian-inline-success" role="status"><FiCheckCircle />{notice}</p>}<form className="librarian-card librarian-settings-form" onSubmit={save}><div className="librarian-settings-grid">{fieldLabels.map(([key, label]) => <label key={key}>{label}<input type={key.includes('Time') ? 'time' : 'number'} min={key.includes('Time') ? undefined : '0'} required value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div><button type="submit" className="librarian-primary-button"><FiCheck />Save settings</button></form></>
}

function NotificationsWorkspace() {
  const [rows, setRows] = useState(() => readRows('notifications'))
  const update = next => { setRows(next); saveRows('notifications', next) }
  const unread = rows.filter(row => !row.read).length
  return <><header className="librarian-content-heading"><div><p className="librarian-eyebrow">LIBRARY OPERATIONS</p><h1>Notifications</h1><p>{unread} unread notifications in this browser.</p></div><button type="button" className="librarian-primary-button" disabled={!unread} onClick={() => update(rows.map(row => ({ ...row, read: true })))}><FiCheckCircle />Mark all read</button></header><p className="librarian-local-note"><FiAlertCircle />This notification center uses sample browser-local items. Live notifications require a library notification service.</p><section className="librarian-card librarian-notification-list">{rows.map(row => <article className={!row.read ? 'is-unread' : ''} key={row.id}><span className="librarian-notification-icon"><FiAlertCircle /></span><div><strong>{row.title}</strong><p>{row.detail}</p><small>{row.date}</small></div>{!row.read && <button type="button" onClick={() => update(rows.map(item => item.id === row.id ? { ...item, read: true } : item))}>Mark read</button>}</article>)}</section></>
}

function ProfileWorkspace() {
  const storage = getAuthStorage()
  const details = [['Name', storage?.getItem('btech-user-name') || 'Librarian'], ['Employee ID', storage?.getItem('btech-user-id') || 'Not provided'], ['Role', getUserRoleDisplayName()], ['Designation', storage?.getItem('btech-user-designation') || 'Librarian'], ['College ID', storage?.getItem('btech-user-college-id') || 'Not provided']]
  return <><header className="librarian-content-heading"><div><p className="librarian-eyebrow">ACCOUNT</p><h1>My Profile</h1><p>Your account details from the existing sign-in session.</p></div></header><section className="librarian-card librarian-profile"><span><FiUser /></span><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Profile details are read from your existing authenticated account.</p></section></>
}

export default function LibrarianLocalWorkspace({ screen }) {
  if (['book-categories', 'authors-publishers', 'faculty-accounts'].includes(screen)) return <DirectoryWorkspace screen={screen} />
  if (screen === 'reservations') return <ReservationsWorkspace />
  if (['inventory', 'book-copies', 'damaged-books', 'lost-books', 'stock-verification'].includes(screen)) return <InventoryWorkspace screen={screen} />
  if (['fine-rules', 'settings'].includes(screen)) return <ConfigWorkspace screen={screen} />
  if (screen === 'notifications') return <NotificationsWorkspace />
  if (screen === 'profile') return <ProfileWorkspace />
  return <DirectoryWorkspace screen="book-categories" />
}
