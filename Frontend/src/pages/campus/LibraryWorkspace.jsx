import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ViewDialog from '../../components/ViewDialog'
import ExportMenu from '../../components/ExportMenu'
import TablePagination from '../../components/TablePagination'
import StatusBadge from '../../components/StatusBadge'
import ScopedModuleNotice from '../../components/ScopedModuleNotice'
import { useAcademic } from '../../context/AcademicContext'
import { useScreenAccess } from '../../auth/ScreenAccess'
import useScopedModule from '../../services/useScopedModule'
import { call, loadLibrary, requireId, saveBook } from '../../services/scopedModulesService'
import './LibraryWorkspace.css'

const tabs = ['Books', 'Issue & Return', 'Borrowers', 'Reports']
const reports = ['Circulation', 'Overdue Books', 'Fine Collection', 'Inventory', 'Borrower History']
const empty = { books: [], circulation: [], borrowers: [], fines: [], categories: [] }
const activeLoan = row => ['Issued', 'Overdue'].includes(row.status)
const activeBook = row => ![false, 0, '0'].includes(row.status)
const text = value => value == null || value === '' ? '—' : value
const same = (a, b) => String(a) === String(b)
const norm = value => String(value ?? '').trim().toLowerCase()
const matches = (query, ...values) => values.some(value => norm(value).includes(norm(query)))
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
const money = value => value != null && Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value) : '—'
const isbnKey = value => String(value || '').replace(/[\s-]/g, '').toUpperCase()
const validIsbn = value => {
  if (/^\d{9}[\dX]$/.test(value)) return [...value].reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0
  return /^\d{13}$/.test(value) && [...value].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10 === 0
}
const bookColumns = [['title', 'Book Title / Author'], ['isbn', 'ISBN'], ['category', 'Category'], ['totalCopies', 'Total Copies'], ['availableCopies', 'Available'], ['issuedCopies', 'Issued'], ['displayStatus', 'Status']]
const loanColumns = [['id', 'Issue Ref.'], ['borrowerName', 'Borrower'], ['bookTitle', 'Book'], ['accession', 'Accession'], ['issueDate', 'Issued'], ['dueDate', 'Due'], ['returnDate', 'Returned'], ['overdueDays', 'Overdue Days'], ['fineLabel', 'Fine Balance'], ['status', 'Status']]
const borrowerColumns = [['name', 'Borrower'], ['code', 'Borrower ID'], ['type', 'Type'], ['department', 'Department / Branch'], ['issued', 'Books Issued'], ['overdue', 'Overdue'], ['accountStatus', 'Status']]
const fineColumns = [['borrowerName', 'Borrower'], ['bookTitle', 'Book'], ['dueDate', 'Due'], ['overdueDays', 'Overdue Days'], ['assessedDate', 'Assessed'], ['fineLabel', 'Fine'], ['paidLabel', 'Paid'], ['balanceLabel', 'Balance'], ['status', 'Payment Status']]
const button = 'erp-btn erp-btn--secondary'
const primary = 'erp-btn erp-btn--primary'

function LibraryTable({ rows, columns, actions, emptyMessage = 'No matching records.' }) {
  return <div className="library-table-wrap">
    <table className="erp-table library-table">
      <thead><tr>{columns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}{actions && <th scope="col">Actions</th>}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        {columns.map(([key]) => <td key={key}>{key === 'title' ? <><strong>{row.title}</strong><small>{row.author}</small></>
          : ['status', 'displayStatus', 'accountStatus'].includes(key) && row[key] ? <StatusBadge value={row[key]} /> : text(row[key])}</td>)}
        {actions && <td>{actions(row)}</td>}
      </tr>)}</tbody>
    </table>
    {!rows.length && <p className="library-empty" role="status">{emptyMessage}</p>}
  </div>
}

function Details({ fields }) {
  return <dl className="library-details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl>
}

function LibraryForm({ title, action, busy, error, onClose, onSubmit, children }) {
  return <ViewDialog title={title} busy={busy} onClose={onClose} showExport={false} maxWidth="680px" className="library-dialog"
    footerContent={<>
      <button className={button} type="button" disabled={busy} onClick={onClose}>Cancel</button>
      <button className={primary} type="submit" form="library-operation" disabled={busy}>{busy ? 'Saving…' : action}</button>
    </>}>
    <form id="library-operation" className="library-form" onSubmit={onSubmit}>
      {error && <p className="library-error" role="alert">{error}</p>}
      <fieldset disabled={busy}>{children}</fieldset>
    </form>
  </ViewDialog>
}

function BookEditor({ book, books, categories, stockOnly, onSave, ...dialog }) {
  const [form, setForm] = useState({
    title: book?.title ?? '', author: book?.author ?? '', isbn: book?.isbn ?? '', accessionNo: book?.accessionNo ?? '',
    categoryId: book?.categoryId ?? '', totalCopies: book?.totalCopies ?? '', publisher: book?.publisher ?? '',
    edition: book?.edition ?? '', publicationYear: book?.publicationYear ?? '', language: book?.language ?? 'English',
    rack: book?.rack ?? '', description: book?.description ?? '',
  })
  const [validation, setValidation] = useState('')
  const field = (key, label, attrs = {}) => <label>{label}<input className="erp-input" {...attrs} value={form[key]}
    onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>
  const submit = event => {
    event.preventDefault()
    setValidation('')
    const isbn = isbnKey(form.isbn)
    if (!form.title.trim() || !form.author.trim() || !form.accessionNo.trim() || !form.language.trim()) {
      setValidation('Enter a title, author, accession number and language.'); return
    }
    if (isbn && isbn !== isbnKey(book?.isbn) && !validIsbn(isbn)) {
      setValidation('Enter a valid ISBN-10 or ISBN-13, or leave it blank.'); return
    }
    if (books.some(row => row.id !== book?.id && (
      norm(row.accessionNo) === norm(form.accessionNo) || (isbn && isbnKey(row.isbn) === isbn) ||
      (!isbn && !row.isbn && norm(row.title) === norm(form.title) && norm(row.author) === norm(form.author) && norm(row.edition) === norm(form.edition))
    ))) {
      setValidation('A matching catalog record already exists. Manage its stock to add copies.'); return
    }
    if (Number(form.totalCopies) < (book?.issuedCopies || 0)) {
      setValidation('Total copies must cover all copies already issued.'); return
    }
    onSave({ ...form, isbn: form.isbn === book?.isbn ? book.isbn : isbn })
  }
  const stock = field('totalCopies', 'Number of Copies', { required: true, type: 'number', min: Math.max(1, book?.issuedCopies || 0), max: 2147483647 })
  return <LibraryForm {...dialog} title={stockOnly ? 'Manage Copies' : book ? 'Edit Book' : 'Add Book'} action={stockOnly ? 'Save Stock' : 'Save Book'} onSubmit={submit} error={validation || dialog.error}>
    {stockOnly ? <>
      <div className="library-full-field"><Details fields={[[ 'Book', book.title ], [ 'Accession', book.accessionNo ], [ 'Available', book.availableCopies ], [ 'Issued', book.issuedCopies ]]} />
        <p className="library-hint">Stock is tracked per catalog title. Individual copy barcodes are unavailable.</p></div>
      {stock}
    </> : <>
      {field('title', 'Book Title', { required: true, maxLength: 255 })}
      {field('author', 'Author', { required: true, maxLength: 200 })}
      {field('isbn', 'ISBN', { maxLength: 20 })}
      {field('accessionNo', 'Accession Number', { required: true, maxLength: 50 })}
      <label>Category<select className="erp-select" required value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })}>
        <option value="">Select category</option>
        {categories.filter(activeBook).map(row => <option key={row.categoryId} value={row.categoryId}>{row.categoryName}</option>)}
      </select></label>
      {stock}
      {field('publisher', 'Publisher', { maxLength: 200 })}
      {field('edition', 'Edition', { maxLength: 50 })}
      {field('publicationYear', 'Publication Year', { type: 'number', min: 1901, max: 2155 })}
      {field('language', 'Language', { required: true, maxLength: 50 })}
      {field('rack', 'Shelf / Rack', { maxLength: 100 })}
      <label className="library-full-field">Description<textarea className="erp-input" maxLength={1000} rows={2} value={form.description}
        onChange={event => setForm({ ...form, description: event.target.value })} /></label>
    </>}
  </LibraryForm>
}

function IssueEditor({ books, borrowers, loans, initialBook, onSave, ...dialog }) {
  const [borrowerQuery, setBorrowerQuery] = useState('')
  const [bookQuery, setBookQuery] = useState('')
  const [studentId, setStudentId] = useState('')
  const [bookId, setBookId] = useState(initialBook?.id ?? '')
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [review, setReview] = useState(false)
  const [validation, setValidation] = useState('')
  const borrower = borrowers.find(row => same(row.id, studentId))
  const book = books.find(row => same(row.id, bookId))
  const borrowed = loans.filter(row => same(row.borrowerId, studentId) && activeLoan(row))
  const submit = event => {
    event.preventDefault()
    setValidation('')
    if (borrowed.some(row => same(row.bookId, bookId))) {
      setValidation('This borrower already has an active issue for this book.'); return
    }
    if (!borrower || !book || !issueDate || !dueDate || dueDate < issueDate) {
      setValidation('Choose an available book, an enrolled borrower and a valid due date.'); return
    }
    if (!review) { setReview(true); return }
    onSave({ studentId: requireId(studentId, 'student'), bookId: requireId(bookId, 'book'), issueDate, dueDate })
  }
  return <LibraryForm {...dialog} title={review ? 'Confirm Issue' : 'Issue Book'} action={review ? 'Confirm Issue' : 'Review Issue'} onSubmit={submit} error={validation || dialog.error}>
    {review ? <div className="library-full-field">
      <Details fields={[[ 'Borrower', borrower?.name ], [ 'Borrower ID', borrower?.code ], [ 'Book', book?.title ], [ 'Accession', book?.accessionNo ], [ 'Issue Date', issueDate ], [ 'Due Date', dueDate ]]} />
      <button type="button" className={button} onClick={() => setReview(false)}>Edit Issue Details</button>
    </div> : <>
      <label>Search Borrowers<input className="erp-input" value={borrowerQuery} onChange={event => setBorrowerQuery(event.target.value)} placeholder="Name, roll or admission number" /></label>
      <label>Borrower<select className="erp-select" required value={studentId} onChange={event => setStudentId(event.target.value)}>
        <option value="">Select student</option>{borrowers.filter(row => same(row.id, studentId) || matches(borrowerQuery, row.name, row.code, row.admissionNumber, row.rollNumber)).map(row =>
          <option key={row.id} value={row.id}>{row.name} · {row.code}</option>)}
      </select></label>
      {borrower && <div className="library-full-field"><Details fields={[[ 'Type', borrower.type ], [ 'Department / Branch', borrower.department ], [ 'Course', borrower.courseName ], [ 'Active Loans', borrowed.length ]]} /></div>}
      <label>Search Books<input className="erp-input" value={bookQuery} onChange={event => setBookQuery(event.target.value)} placeholder="Title, ISBN or accession number" /></label>
      <label>Book<select className="erp-select" required value={bookId} onChange={event => setBookId(event.target.value)}>
        <option value="">Select available book</option>{books.filter(row => same(row.id, bookId) || matches(bookQuery, row.title, row.isbn, row.accessionNo)).map(row =>
          <option key={row.id} value={row.id}>{row.title} · {row.accessionNo} · {row.availableCopies} available</option>)}
      </select></label>
      <label>Issue Date<input className="erp-input" type="date" required max={today()} value={issueDate} onChange={event => setIssueDate(event.target.value)} /></label>
      <label>Due Date<input className="erp-input" type="date" required min={issueDate} value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
    </>}
  </LibraryForm>
}

function RecordOperation({ kind, row, onSave, ...dialog }) {
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState(row.balance ?? '')
  const [receiptNo, setReceiptNo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [reason, setReason] = useState('')
  const names = { return: 'Confirm Return', payment: 'Record Fine Payment', waive: 'Waive Fine Balance', archive: 'Archive Book', restore: 'Restore Book', delete: 'Delete Book' }
  const submit = event => {
    event.preventDefault()
    onSave(kind === 'return' ? { returnDate: date, remarks: reason.trim() || null }
      : kind === 'payment' ? { amount: Number(amount), receiptNo: receiptNo.trim(), paymentMethod, paymentDate: date }
      : kind === 'waive' ? { reason: reason.trim() } : {})
  }
  return <LibraryForm {...dialog} title={names[kind]} action={names[kind]} onSubmit={submit}>
    <div className="library-full-field"><Details fields={kind === 'return'
      ? [['Borrower', row.borrowerName], ['Book', row.bookTitle], ['Accession', row.accession], ['Issue Date', row.issueDate], ['Due Date', row.dueDate], ['Overdue Days', row.overdueDays], ['Recorded Fine Balance', row.fineLabel]]
      : kind === 'payment' || kind === 'waive' ? [['Borrower', row.borrowerName], ['Book', row.bookTitle], ['Outstanding Balance', row.balanceLabel]]
      : [['Book', row.title], ['Accession', row.accessionNo]]} /></div>
    {kind === 'return' && <>
      <label>Return Date<input className="erp-input" type="date" min={row.issueDate} max={today()} required value={date} onChange={event => setDate(event.target.value)} /></label>
      <label>Remarks<input className="erp-input" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
    </>}
    {kind === 'payment' && <>
      <label>Payment Amount<input className="erp-input" type="number" step="0.01" min="0.01" max={row.balance} required value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>Receipt Number<input className="erp-input" required maxLength={100} value={receiptNo} onChange={event => setReceiptNo(event.target.value)} /></label>
      <label>Payment Method<select className="erp-select" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>{['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'].map(method => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}</select></label>
      <label>Payment Date<input className="erp-input" type="date" min={row.assessedDate} max={today()} required value={date} onChange={event => setDate(event.target.value)} /></label>
    </>}
    {kind === 'waive' && <label className="library-full-field">Reason<textarea className="erp-input" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>}
  </LibraryForm>
}

function LibraryScreen({ collegeId }) {
  const { canAction } = useScreenAccess()
  const canCreate = canAction('/library', 'create')
  const canEdit = canAction('/library', 'edit')
  const canDelete = canAction('/library', 'delete')
  const canExport = canAction('/library', 'export')
  const scope = { collegeId, enabled: Boolean(collegeId) }
  const { data, state, reload, mutate } = useScopedModule(loadLibrary, scope, empty)
  const [tab, setTab] = useState('Books')
  const [mode, setMode] = useState('Issue Book')
  const [report, setReport] = useState('Circulation')
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const errors = data.resourceErrors || {}
  const ready = key => !state.loading && !state.error && !state.waitingForContext && !errors[key]
  const writable = key => ready(key) && !state.saving
  const catalog = data.books.map(book => ({ ...book, displayStatus: activeBook(book) ? 'Active' : 'Archived' }))
  const finesByIssue = new Map(data.fines.map(row => [String(row.issueId), row]))
  const loans = data.circulation.map(row => ({ ...row, fineLabel: ready('fines') ? money(finesByIssue.get(row.id)?.balance) : 'Unavailable' }))
  const borrowers = data.borrowers.map(row => {
    const current = loans.filter(loan => same(loan.borrowerId, row.id) && activeLoan(loan))
    return { ...row, issued: ready('issues') ? current.length : 'Unavailable', overdue: ready('issues') ? current.filter(loan => loan.status === 'Overdue').length : 'Unavailable',
      accountStatus: row.studentStatus || (typeof row.status === 'string' ? row.status : row.status === true || row.status === 1 ? 'Active' : row.status === false || row.status === 0 ? 'Inactive' : undefined) }
  })
  const fines = data.fines.map(row => ({ ...row, fineLabel: money(row.amount), paidLabel: money(row.paidAmount), balanceLabel: money(row.balance) }))
  const eligibleBorrowers = borrowers.filter(row => !['inactive', 'suspended', 'deactivated'].includes(norm(row.accountStatus)))
  const availableBooks = catalog.filter(row => activeBook(row) && row.availableCopies > 0 &&
    data.categories.some(category => same(category.categoryId, row.categoryId) && activeBook(category)))
  const canIssue = canCreate && ['books', 'issues', 'students', 'categories'].every(writable) && eligibleBorrowers.length > 0
  const isBooks = tab === 'Books' || (tab === 'Reports' && report === 'Inventory')
  const isFines = tab === 'Reports' && report === 'Fine Collection'
  const isBorrowers = tab === 'Borrowers'
  const resource = isBooks ? 'books' : isFines ? 'fines' : isBorrowers ? 'students' : 'issues'
  const records = isBooks ? catalog : isFines ? fines : isBorrowers ? borrowers : loans
  const columns = isBooks ? bookColumns : isFines ? fineColumns : isBorrowers ? borrowerColumns : loanColumns
  const filtered = records.filter(row => {
    const date = row.issueDate || row.assessedDate
    return matches(filters.query, row.title, row.author, row.isbn, row.bookTitle, row.accessionNo, row.accession,
      row.borrowerName, row.borrowerCode, row.admissionNumber, row.rollNumber, row.name, row.code, row.id) &&
      (!filters.category || row.category === filters.category) &&
      (!filters.department || row.department === filters.department) &&
      (!filters.type || (row.borrowerType || row.type) === filters.type) &&
      (!filters.status || (row.displayStatus || row.accountStatus || row.status) === filters.status) &&
      (!filters.availability || (filters.availability === 'available' ? row.availableCopies > 0 : row.availableCopies === 0)) &&
      (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to) &&
      (tab !== 'Issue & Return' || activeLoan(row)) &&
      (tab !== 'Reports' || report !== 'Overdue Books' || row.status === 'Overdue') &&
      (tab !== 'Reports' || report !== 'Borrower History' || !filters.borrower || same(row.borrowerId, filters.borrower))
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(totalPages, page)
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size)
  const choose = (setter, value) => { setter(value); setPage(1); setFilters({}) }
  const filter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }
  const open = (kind, row) => { setError(''); setModal({ kind, row }) }
  const close = () => { if (!state.saving) setModal(null) }
  const commit = async (allowed, key, operation, message) => {
    if (!allowed || !writable(key)) return
    setError('')
    setNotice('')
    const saved = await mutate(operation, { onError: reason => setError(reason.message || 'Library operation could not be completed.') })
    if (saved) { setModal(null); setNotice(message) }
  }
  const college = () => requireId(collegeId, 'college')
  const saveRecordOperation = body => {
    const { kind, row } = modal
    const query = { collegeId: college() }
    if (kind === 'return') return commit(canCreate, 'issues', () => call('library/issues/' + requireId(row.id) + '/return', { method: 'POST', query, body }), 'Book returned.')
    if (kind === 'payment' || kind === 'waive') {
      if ((kind === 'payment' && !body.receiptNo) || (kind === 'waive' && !body.reason)) { setError('Enter the required receipt number or reason.'); return }
      return commit(kind === 'payment' ? canCreate : canEdit, 'fines', () => call('library/fines/' + requireId(row.id) + (kind === 'payment' ? '/payments' : '/waive'),
        { method: kind === 'payment' ? 'POST' : 'PATCH', query, body }), kind === 'payment' ? 'Fine payment recorded.' : 'Fine balance waived.')
    }
    return commit(kind === 'delete' ? canDelete : canEdit, 'books', () => call('library/books/' + requireId(row.id) + (kind === 'delete' ? '' : '/status'),
      { method: kind === 'delete' ? 'DELETE' : 'PATCH', query, ...(kind !== 'delete' && { body: { status: kind === 'restore' } }) }), kind === 'delete' ? 'Book deleted.' : kind === 'restore' ? 'Book restored.' : 'Book archived.')
  }
  const dialog = { busy: state.saving, error, onClose: close }
  const options = (label, key, values) => <label>{label}<select className="erp-select" value={filters[key] || ''} onChange={event => filter(key, event.target.value)}>
    <option value="">All</option>{[...new Set(values.filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}
  </select></label>
  const actions = tab === 'Books' ? row => <select className="erp-select" aria-label={'Actions for ' + row.title} value="" onChange={event => open(event.target.value, row)}>
    <option value="" disabled>Actions</option><option value="book">View</option>
    {canEdit && <option value="edit" disabled={!writable('books') || !ready('categories')}>Edit</option>}
    {canEdit && <option value="copies" disabled={!writable('books') || !ready('categories')}>Manage Copies</option>}
    {canCreate && <option value="issue" disabled={!canIssue || !availableBooks.some(book => book.id === row.id)}>Issue Book</option>}
    {canEdit && <option value={activeBook(row) ? 'archive' : 'restore'} disabled={!writable('books')}>{activeBook(row) ? 'Archive' : 'Restore'}</option>}
    {canDelete && <option value="delete" disabled={!writable('books')}>Delete</option>}
  </select> : isBorrowers ? row => <button className={button} onClick={() => open('borrower', row)}>View</button>
    : tab === 'Issue & Return' && mode === 'Return / Renew' && canCreate ? row => <button className={button} disabled={!writable('issues')} onClick={() => open('return', row)}>Return</button>
    : isFines && (canCreate || canEdit) ? row => <div className="library-row-actions">
      {canCreate && <button className={button} disabled={!writable('fines') || !(row.balance > 0)} onClick={() => open('payment', row)}>Pay</button>}
      {canEdit && <button className={button} disabled={!writable('fines') || !(row.balance > 0)} onClick={() => open('waive', row)}>Waive</button>}
    </div> : undefined
  const stat = (label, key, value) => ({ label, value: ready(key) ? value : '—' })
  return <DashboardLayout><main className="library-workspace">
    <PageHeader title="Library Management" subtitle="Manage books, borrowing, returns and library records." compactSummary={[
      stat('Total Books', 'books', catalog.length), stat('Issued Books', 'issues', loans.filter(activeLoan).length),
      stat('Available Copies', 'books', catalog.reduce((sum, book) => sum + book.availableCopies, 0)),
      stat('Overdue Books', 'issues', loans.filter(row => row.status === 'Overdue').length),
    ]} />
    <ScopedModuleNotice state={state} data={data} resource={resource} onRetry={reload} />
    {notice && <p className="library-notice" role="status">{notice}</p>}
    <nav className="library-tabs" aria-label="Library views">{tabs.map(item => <button key={item} type="button" aria-current={tab === item ? 'page' : undefined}
      onClick={() => choose(setTab, item)}>{item}</button>)}</nav>
    <section className="library-panel" aria-label={tab}>
      {tab === 'Issue & Return' && <div className="library-mode-bar">
        <div className="library-tabs" role="group" aria-label="Circulation mode">{['Issue Book', 'Return / Renew'].map(item =>
          <button key={item} type="button" aria-pressed={mode === item} onClick={() => choose(setMode, item)}>{item}</button>)}</div>
        {mode === 'Issue Book' && canCreate && <button type="button" className={primary} disabled={!canIssue || !availableBooks.length || !eligibleBorrowers.length} onClick={() => open('issue')}>Start Issue</button>}
      </div>}
      {isFines && <p className="library-hint">Date filters apply to assessment dates. Paid amounts and balances come from the library service.</p>}
      {tab === 'Issue & Return' && <p className="library-hint">{mode === 'Issue Book' ? 'Select a student and an available catalog title to issue a book.' : 'Find an active loan to record its return. Renewal is unavailable in the current library service.'}</p>}
      <div className="library-toolbar">
        {tab === 'Reports' && <label>Report Type<select className="erp-select" value={report} onChange={event => choose(setReport, event.target.value)}>{reports.map(item => <option key={item}>{item}</option>)}</select></label>}
        <label className="library-search">Search
          <span className="library-search-control">
            <FiSearch aria-hidden="true" />
            <input type="search" className="erp-input" value={filters.query || ''} onChange={event => filter('query', event.target.value)}
              placeholder={isBooks ? 'Search title, author, ISBN or accession' : 'Search borrower, book or reference'} />
          </span>
        </label>
        {(isBooks || tab === 'Reports') && options('Category', 'category', records.map(row => row.category))}
        {isBooks && <label>Availability<select className="erp-select" value={filters.availability || ''} onChange={event => filter('availability', event.target.value)}>
          <option value="">All</option><option value="available">Available</option><option value="unavailable">Out of stock</option>
        </select></label>}
        {(isBorrowers || (tab === 'Reports' && !isBooks)) && options('Department', 'department', records.map(row => row.department))}
        {tab === 'Reports' && !isBooks && options('Borrower Type', 'type', records.map(row => row.borrowerType))}
        {tab === 'Reports' && report === 'Borrower History' && <label>Borrower<select className="erp-select" value={filters.borrower || ''} onChange={event => filter('borrower', event.target.value)}>
          <option value="">All borrowers</option>{borrowers.map(row => <option key={row.id} value={row.id}>{row.name} · {row.code}</option>)}
        </select></label>}
        {tab !== 'Books' && options('Status', 'status', records.map(row => row.displayStatus || row.accountStatus || row.status))}
        {tab === 'Reports' && !isBooks && ['from', 'to'].map(key => <label key={key}>{key === 'from' ? 'From' : 'To'}
          <input className="erp-input" type="date" value={filters[key] || ''} min={key === 'to' ? filters.from : undefined} max={key === 'from' ? filters.to : undefined} onChange={event => filter(key, event.target.value)} />
        </label>)}
        {canExport && ready(resource) && <ExportMenu rows={filtered} columns={columns.map(([key, label]) => ({ key, label }))} title={tab === 'Reports' ? report : tab} filename={'library-' + (tab === 'Reports' ? report : tab).toLowerCase().replaceAll(' ', '-')} />}
        {tab === 'Books' && canCreate && <button className={primary} disabled={!writable('books') || !ready('categories') || !data.categories.some(activeBook)} onClick={() => open('edit')}>+ Add Book</button>}
      </div>
      {ready(resource) && <>
        <LibraryTable rows={visible} columns={columns} actions={actions} />
        <footer className="library-pagination"><span>{filtered.length} matching records</span><label>Rows per page <select className="erp-select" value={size} onChange={event => { setSize(Number(event.target.value)); setPage(1) }}>
          {[10, 25, 50].map(value => <option key={value}>{value}</option>)}
        </select></label>{totalPages > 1 && <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />}</footer>
      </>}
    </section>
    {(modal?.kind === 'edit' || modal?.kind === 'copies') && <BookEditor {...dialog} stockOnly={modal.kind === 'copies'} book={modal.row} books={catalog} categories={data.categories}
      onSave={form => commit((modal.row ? canEdit : canCreate) && ready('categories'), 'books', () => saveBook(form, modal.row, scope, data.categories), modal.kind === 'copies' ? 'Copy stock updated.' : 'Book saved.')} />}
    {modal?.kind === 'issue' && <IssueEditor {...dialog} books={availableBooks} borrowers={eligibleBorrowers} loans={loans} initialBook={modal.row}
      onSave={body => commit(canIssue, 'issues', () => call('library/issues', { method: 'POST', body: { collegeId: college(), ...body } }), 'Book issued.')} />}
    {modal && ['return', 'payment', 'waive', 'archive', 'restore', 'delete'].includes(modal.kind) && <RecordOperation {...dialog} kind={modal.kind} row={modal.row} onSave={saveRecordOperation} />}
    {modal?.kind === 'book' && <ViewDialog title="Book Details" subtitle={modal.row.title} onClose={close} showExport={false} maxWidth="1000px">
      <Details fields={[[ 'Author', modal.row.author ], [ 'ISBN', modal.row.isbn ], [ 'Category', modal.row.category ], [ 'Accession', modal.row.accessionNo ],
        [ 'Shelf / Rack', modal.row.rack ], [ 'Publisher', modal.row.publisher ], [ 'Edition', modal.row.edition ], [ 'Publication Year', modal.row.publicationYear ],
        [ 'Language', modal.row.language ], [ 'Total Copies', modal.row.totalCopies ], [ 'Available', modal.row.availableCopies ], [ 'Issued', modal.row.issuedCopies ], [ 'Description', modal.row.description ]]} />
      <h3>Circulation History</h3>{ready('issues') ? <LibraryTable columns={loanColumns} rows={loans.filter(row => same(row.bookId, modal.row.id))} emptyMessage="No circulation history for this book." /> : <p>Circulation history is unavailable.</p>}
    </ViewDialog>}
    {modal?.kind === 'borrower' && <ViewDialog title="Borrower Details" subtitle={modal.row.name} onClose={close} showExport={false} maxWidth="1000px">
      <Details fields={[[ 'Borrower ID', modal.row.code ], [ 'Type', modal.row.type ], [ 'Department / Branch', modal.row.department ], [ 'Course', modal.row.courseName ],
        [ 'Status', modal.row.accountStatus ], [ 'Books Issued', modal.row.issued ], [ 'Overdue', modal.row.overdue ]]} />
      <h3>Loan History</h3>{ready('issues') ? <LibraryTable columns={loanColumns} rows={loans.filter(row => same(row.borrowerId, modal.row.id))} emptyMessage="No loans for this borrower." /> : <p>Loan history is unavailable.</p>}
      <h3>Outstanding Fines</h3>{ready('fines') ? <LibraryTable columns={fineColumns} rows={fines.filter(row => same(row.borrowerId, modal.row.id) && row.balance > 0)} emptyMessage="No outstanding fines." /> : <p>Fine records are unavailable.</p>}
    </ViewDialog>}
  </main></DashboardLayout>
}

export default function LibraryWorkspace() {
  const { selectedCollegeId } = useAcademic()
  return <LibraryScreen key={selectedCollegeId || 'unselected'} collegeId={selectedCollegeId} />
}
