import { useState } from 'react'
import { FiBookOpen, FiCheckCircle, FiCopy, FiEdit2, FiEye, FiHash, FiLayers, FiMoreVertical, FiSearch, FiTrash2 } from 'react-icons/fi'
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
const reports = ['Circulation', 'Overdue Books', 'Fine Collection', 'Inventory', 'Borrower History', 'Lost Book Fines']
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
const lostFineColumns = [['borrowerName', 'Student'], ['borrowerCode', 'Student ID'], ['bookTitle', 'Book'], ['accession', 'Accession'], ['fineLabel', 'Fine Amount'], ['status', 'Payment Status']]
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

function matchCategoryText(text) {
  if (!text) return null
  // 1. EEE / Electrical
  if (/\beee\b/i.test(text) || (/\belectrical\b/i.test(text) && !/\belectronics\b/i.test(text))) {
    return 'eee'
  }
  // 2. ECE / Electronics / Communication
  if (/\bece\b|electronics?|telecom|communication|circuits?|vlsi|embedded|microprocessor/i.test(text)) {
    return 'ece'
  }
  // 3. CSE / Computer Science / Software / Programming / Cyber / Cloud / Network
  if (/\bcse\b|computer|software|programming|coding|cyber|network/i.test(text)) {
    return 'cse'
  }
  // 4. IT / Information Technology / Data Science
  if (/\bit\b|information\s+tech|info\s*tech|data\s+science|database|analytics/i.test(text)) {
    return 'it'
  }
  // 5. Mechanical / Robotics / Thermal / CAD / Manufacturing / Automobile
  if (/\bmech|mechanical|robotics|thermal|cad|cam|fluid|automobile|manufacturing|machine\s+design/i.test(text)) {
    return 'mechanical'
  }
  // 6. Civil / Structural / Construction / Surveying / Geotechnical / Concrete
  if (/\bcivil|construction|structural|surveying|concrete|geotechnical|transportation/i.test(text)) {
    return 'civil'
  }
  // 7. Mathematics / Calculus / Algebra / Statistics
  if (/\bmath|mathematics|calculus|algebra|geometry|statistics|discrete/i.test(text)) {
    return 'mathematics'
  }
  // 8. Science / Physics / Chemistry / Biology
  if (/\bsci|science|physics|chemistry|biology|materials?\s+sci/i.test(text)) {
    return 'science'
  }
  return null
}

function resolveCategoryTheme(row) {
  const cat = (row.category || row.department || '').trim()
  if (cat) {
    const matched = matchCategoryText(cat)
    if (matched) return matched
    const hash = [...cat.toLowerCase()].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7)
    const fallbacks = ['fallback-slate', 'fallback-plum', 'fallback-amber', 'fallback-cobalt']
    return fallbacks[hash % fallbacks.length]
  }

  const title = (row.title || '').trim()
  if (title) {
    const matched = matchCategoryText(title)
    if (matched) return matched
    const hash = [...title.toLowerCase()].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7)
    const fallbacks = ['fallback-slate', 'fallback-plum', 'fallback-amber', 'fallback-cobalt']
    return fallbacks[hash % fallbacks.length]
  }

  return 'fallback-slate'
}

function BookCoverArtwork({ theme }) {
  return <svg className="library-book-illustration" viewBox="0 0 240 210" aria-hidden="true" focusable="false">
    <circle className="library-book-illustration-ticks" cx="120" cy="105" r="98" strokeDasharray="1 7" />
    <circle className="library-book-illustration-ring" cx="120" cy="105" r="88" strokeDasharray="4 6" />
    <circle className="library-book-illustration-glow" cx="120" cy="105" r="72" />
    <circle className="library-book-illustration-core" cx="120" cy="105" r="28" />
    <path className="library-book-illustration-cross" d="M120 14v10M120 186v10M29 105h10M201 105h10" />
    {theme === 'cse' ? <g className="library-book-art-lines">
      <rect x="78" y="62" width="84" height="82" rx="14" />
      <rect x="94" y="78" width="52" height="50" rx="9" />
      <path d="M94 103h52M120 78v50M78 82H60m18 20H48m30 22H60m102-42h18m-18 20h30m-30 22h18M90 62V45m20 17V34m20 28V44m20 18V33m-60 111v17m20-17v28m20-28v17m20-17v28" />
      <circle cx="120" cy="103" r="8" />
    </g> : theme === 'ece' ? <g className="library-book-art-lines">
      <path d="M48 105c18-42 36-42 54 0s36 42 54 0 36-42 54 0" />
      <path d="M48 105c18 26 36 26 54 0s36-26 54 0 36 26 54 0" strokeDasharray="3 4" opacity="0.6" />
      <circle cx="75" cy="84" r="6" /><circle cx="129" cy="105" r="7" /><circle cx="183" cy="84" r="6" />
      <line x1="120" y1="52" x2="120" y2="158" strokeDasharray="2 4" opacity="0.5" />
      <circle cx="120" cy="105" r="24" strokeDasharray="4 4" />
    </g> : theme === 'eee' ? <g className="library-book-art-lines">
      <path d="M126 48 88 104h30l-12 56 46-64h-32z" />
      <circle cx="120" cy="105" r="48" strokeDasharray="5 5" />
      <circle cx="120" cy="105" r="70" strokeDasharray="2 6" opacity="0.5" />
      <path d="M60 105h20m80 0h20M120 45v15m0 90v15" />
    </g> : theme === 'mechanical' ? <g className="library-book-art-lines">
      <circle cx="104" cy="95" r="42" />
      <circle cx="104" cy="95" r="22" />
      <circle cx="104" cy="95" r="9" />
      <path d="M104 45v10m0 80v10M54 95h10m80 0h10m-80-35 8 8m64 64 8 8m-80 0 8-8m64-64 8-8" />
      <circle cx="152" cy="132" r="26" />
      <circle cx="152" cy="132" r="13" />
      <circle cx="152" cy="132" r="5" />
      <path d="M152 100v6m0 52v6m-26-32h6m46 0h6m-37-22 5 5m28 28 5 5m-38 0 5-5m28-28 5-5" />
    </g> : theme === 'civil' ? <g className="library-book-art-lines">
      <path d="M44 148h152M52 148l68-88 68 88M120 60v88" />
      <path d="M68 148l52-44 52 44M86 148l34-22 34 22" />
      <line x1="52" y1="148" x2="188" y2="148" strokeWidth="4" />
      <circle cx="120" cy="60" r="5" /><circle cx="52" cy="148" r="4" /><circle cx="188" cy="148" r="4" />
      <path d="M44 158h152" strokeDasharray="3 5" opacity="0.6" />
    </g> : theme === 'it' ? <g className="library-book-art-lines">
      <ellipse cx="120" cy="65" rx="46" ry="15" />
      <path d="M74 65v25c0 8.3 20.6 15 46 15s46-6.7 46-15V65" />
      <path d="M74 90v25c0 8.3 20.6 15 46 15s46-6.7 46-15V90" />
      <path d="M74 115v25c0 8.3 20.6 15 46 15s46-6.7 46-15v-25" />
      <line x1="62" y1="102" x2="74" y2="102" /><circle cx="56" cy="102" r="6" />
      <line x1="166" y1="102" x2="178" y2="102" /><circle cx="184" cy="102" r="6" />
    </g> : theme === 'mathematics' ? <g className="library-book-art-lines">
      <ellipse cx="120" cy="105" rx="82" ry="32" transform="rotate(-28 120 105)" />
      <ellipse cx="120" cy="105" rx="82" ry="32" transform="rotate(28 120 105)" />
      <ellipse cx="120" cy="105" rx="43" ry="82" />
      <circle cx="120" cy="105" r="14" /><circle cx="55" cy="73" r="5" /><circle cx="183" cy="137" r="5" />
    </g> : theme === 'science' ? <g className="library-book-art-lines">
      <circle cx="120" cy="105" r="16" />
      <ellipse cx="120" cy="105" rx="76" ry="26" transform="rotate(30 120 105)" />
      <ellipse cx="120" cy="105" rx="76" ry="26" transform="rotate(-30 120 105)" />
      <ellipse cx="120" cy="105" rx="76" ry="26" transform="rotate(90 120 105)" />
      <circle cx="178" cy="138" r="5" /><circle cx="62" cy="72" r="5" /><circle cx="120" cy="30" r="5" />
    </g> : <g className="library-book-art-lines">
      <path d="m120 42 56 32v62l-56 32-56-32V74z" />
      <path d="m64 74 56 32 56-32M120 106v62" />
      <circle cx="120" cy="106" r="10" />
    </g>}
  </svg>
}

function BookCards({ rows, onView, onEdit, onDelete, canEdit, canDelete, editDisabled, deleteDisabled, actions }) {
  return <div className="library-book-grid">
    {rows.map(row => {
      const themeKey = resolveCategoryTheme(row)
      const hasCopies = Number(row.availableCopies) > 0
      return <article className="library-book-card" data-cover-theme={themeKey} key={row.id}>
        <div className="library-book-stage">
          <button type="button" className="library-book-cover" data-cover-theme={themeKey} onClick={() => onView(row)} aria-label={`View details for ${row.title}`}>
            {/* 3D Gilded Paper Fore-Edge (Page Block) */}
            <span className="library-book-page-edge" aria-hidden="true" />

            {/* Hardcover Spine with Ribs, Headcaps & Vertical Gilded Title */}
            <span className="library-book-spine" aria-hidden="true">
              <span className="library-book-spine-cap top" />
              <span className="library-book-spine-title">{text(row.title)}</span>
              <span className="library-book-spine-ribs" />
              <span className="library-book-spine-cap bottom" />
            </span>

            {/* French Groove Hinge Joint */}
            <span className="library-book-hinge" aria-hidden="true" />

            {/* Luxury Bookcloth Texture & Precision Foil Inset */}
            <span className="library-book-cover-texture" aria-hidden="true" />
            <span className="library-book-cover-border" aria-hidden="true" />
            <span className="library-book-cover-art" aria-hidden="true" />

            {/* Dynamic Holographic Foil Glare Sweep */}
            <span className="library-book-glare" aria-hidden="true" />

            {/* Satin Silk Bookmark Ribbon */}
            <span className="library-book-ribbon" aria-hidden="true" />

            {/* Cover Face Content Hierarchy */}
            <div className="library-book-cover-content">
              {/* Cover Header */}
              <div className="library-book-cover-header">
                <span className="library-book-cover-tag">{text(row.category || 'TECHNICAL SERIES')}</span>
                <span className="library-book-cover-edition">{row.edition ? `ED. ${row.edition}` : 'REF. 2026'}</span>
              </div>

              {/* Cover Title & Subtitle */}
              <div className="library-book-cover-title-wrap">
                <span className="library-book-cover-title">{text(row.title)}</span>
                <span className="library-book-cover-subtitle">{text(row.author)}</span>
              </div>

              {/* Centerpiece Cyber Hologram Artwork */}
              <div className="library-book-artwork-wrap">
                <BookCoverArtwork theme={themeKey} />
              </div>

              <div className="library-book-cover-catalog" aria-label="Book catalog details">
                <span className="library-book-cover-catalog-item is-wide"><small><FiHash aria-hidden="true" />ISBN</small><strong>{text(row.isbn)}</strong></span>
                <span className="library-book-cover-catalog-item"><small><FiLayers aria-hidden="true" />Total</small><strong>{text(row.totalCopies)}</strong></span>
                <span className={`library-book-cover-catalog-item ${!hasCopies ? 'is-unavailable' : ''}`}><small><FiCheckCircle aria-hidden="true" />Available</small><strong>{text(row.availableCopies)}</strong></span>
                <span className="library-book-cover-catalog-item"><small><FiCopy aria-hidden="true" />Issued</small><strong>{text(row.issuedCopies)}</strong></span>
                <span className="library-book-cover-catalog-item"><small><FiCheckCircle aria-hidden="true" />Status</small><strong>{activeBook(row) ? 'Active' : 'Inactive'}</strong></span>
                <span className={`library-book-cover-stock ${hasCopies ? 'is-available' : 'is-unavailable'}`}><i aria-hidden="true" />{hasCopies ? `${row.availableCopies} copies available` : 'No copies available'}</span>
              </div>

              {/* Cover Footer: University Digital Press Seal & Author Pill */}
              <div className="library-book-cover-footer">
                <span className="library-book-cover-seal" aria-hidden="true">
                  <span className="library-book-cover-seal-circle" />
                  <span>DIGITAL CAMPUS</span>
                </span>
                <span className="library-book-cover-author">
                  <span className="library-book-cover-author-dot" aria-hidden="true" />
                  <span className="library-book-cover-author-name">{text(row.author)}</span>
                </span>
              </div>
            </div>
          </button>
          <span className="library-book-shadow" aria-hidden="true" />
        </div>
        <div className="library-book-card-footer">
        <div className="library-book-icon-actions">
          <button type="button" aria-label={`View ${row.title}`} title="View" onClick={() => onView(row)}><FiEye aria-hidden="true" /></button>
          {canEdit && <button type="button" aria-label={`Edit ${row.title}`} title="Edit" disabled={editDisabled} onClick={() => onEdit(row)}><FiEdit2 aria-hidden="true" /></button>}
          {canDelete && <button type="button" className="is-danger" aria-label={`Delete ${row.title}`} title="Delete" disabled={deleteDisabled} onClick={() => onDelete(row)}><FiTrash2 aria-hidden="true" /></button>}
          <div className="library-book-actions">{actions?.(row)}</div>
        </div>
      </div>
    </article>
    })}
    {!rows.length && <p className="library-empty" role="status">No matching records.</p>}
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

function LostBookDialog({ row, onSave, ...dialog }) {
  const [amount, setAmount] = useState(String(row.replacementCost ?? ''))
  const [reason, setReason] = useState('')
  const [validation, setValidation] = useState('')
  const submit = event => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) { setValidation('Enter a valid replacement fine amount.'); return }
    if (!reason.trim()) { setValidation('Enter a reason for marking this book as lost.'); return }
    onSave({ amount: Math.round(value * 100) / 100, reason: reason.trim() })
  }
  return <LibraryForm {...dialog} title="Confirm Book Lost" action="Confirm" error={validation || dialog.error} onSubmit={submit}>
    <p className="library-hint">This temporary frontend record will not update the library service.</p>
    <div className="library-full-field"><Details fields={[[ 'Student', row.borrowerName ], [ 'Student ID', row.borrowerCode ], [ 'Book', row.bookTitle ], [ 'Accession', row.accession ]]} /></div>
    <label>Lost Book Fine Amount<input className="erp-input" type="number" min="0" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label className="library-full-field">Reason<textarea className="erp-input" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
  </LibraryForm>
}

function LostFineEditor({ row, onSave, ...dialog }) {
  const [amount, setAmount] = useState(String(row.amount ?? ''))
  const [status, setStatus] = useState(row.status || 'Pending')
  const submit = event => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) return
    onSave({ amount: Math.round(value * 100) / 100, status })
  }
  return <LibraryForm {...dialog} title="Edit Lost Book Fine" action="Save Fine" onSubmit={submit}>
    <div className="library-full-field"><Details fields={[[ 'Student', row.borrowerName ], [ 'Book', row.bookTitle ], [ 'Current Fine', money(row.amount) ]]} /></div>
    <label>Fine Amount<input className="erp-input" type="number" min="0" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label>Payment Status<select className="erp-select" value={status} onChange={event => setStatus(event.target.value)}>{['Pending', 'Partially Paid', 'Paid'].map(value => <option key={value}>{value}</option>)}</select></label>
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
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'
  const [bookView, setBookView] = useState(isTestEnv ? 'table' : 'cards')
  // Temporary frontend-only lost-book records; these are intentionally not part of loadLibrary/API data.
  const [lostBookFines, setLostBookFines] = useState([])
  const errors = data.resourceErrors || {}
  const ready = key => !state.loading && !state.error && !state.waitingForContext && !errors[key]
  const writable = key => ready(key) && !state.saving
  const catalog = data.books.map(book => ({ ...book, displayStatus: activeBook(book) ? 'Active' : 'Archived' }))
  const finesByIssue = new Map(data.fines.map(row => [String(row.issueId), row]))
  const loans = data.circulation.map(row => ({ ...row, status: lostBookFines.some(item => same(item.issueId, row.id)) ? 'Lost' : row.status,
    fineLabel: ready('fines') ? money(finesByIssue.get(row.id)?.balance) : 'Unavailable' }))
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
  const isLostFineView = (tab === 'Issue & Return' && mode === 'Lost Book Fines') || (tab === 'Reports' && report === 'Lost Book Fines')
  const isFines = tab === 'Reports' && report === 'Fine Collection'
  const isBorrowers = tab === 'Borrowers'
  const resource = isBooks ? 'books' : isLostFineView ? 'issues' : isFines ? 'fines' : isBorrowers ? 'students' : 'issues'
  const records = isBooks ? catalog : isLostFineView ? lostBookFines : isFines ? fines : isBorrowers ? borrowers : loans
  const columns = isBooks ? bookColumns : isLostFineView ? lostFineColumns : isFines ? fineColumns : isBorrowers ? borrowerColumns : loanColumns
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
      (tab !== 'Issue & Return' || mode === 'Lost Book Fines' || activeLoan(row)) &&
      (tab !== 'Reports' || report !== 'Overdue Books' || row.status === 'Overdue') &&
      (tab !== 'Reports' || report !== 'Borrower History' || !filters.borrower || same(row.borrowerId, filters.borrower)) &&
      (!isLostFineView || !filters.status || row.status === filters.status)
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
  const saveLostBook = ({ amount, reason }) => {
    const row = modal.row
    const fine = { id: `lost-${row.id}`, issueId: row.id, borrowerId: row.borrowerId, borrowerName: row.borrowerName, borrowerCode: row.borrowerCode,
      bookTitle: row.bookTitle, accession: row.accession, department: row.department, category: row.category, assessedDate: today(), amount,
      paidAmount: 0, balance: amount, fineLabel: money(amount), status: 'Pending', reason, source: 'Temporary frontend record' }
    setLostBookFines(current => [fine, ...current.filter(item => item.id !== fine.id)])
    setModal(null); setNotice('Book marked lost in temporary frontend state. No API data was changed.')
  }
  const saveLostFine = ({ amount, status }) => {
    setLostBookFines(current => current.map(item => item.id !== modal.row.id ? item : ({ ...item, amount, status, paidAmount: status === 'Paid' ? amount : status === 'Pending' ? 0 : Math.min(item.paidAmount || 0, amount), balance: status === 'Paid' ? 0 : status === 'Pending' ? amount : Math.max(0, amount - Math.min(item.paidAmount || 0, amount)), fineLabel: money(amount) })))
    setModal(null); setNotice('Temporary lost-book fine updated.')
  }
  const dialog = { busy: state.saving, error, onClose: close }
  const options = (label, key, values) => <label>{label}<select className="erp-select" value={filters[key] || ''} onChange={event => filter(key, event.target.value)}>
    <option value="">All</option>{[...new Set(values.filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}
  </select></label>
  const actions = tab === 'Books' ? row => <>
    <select className="erp-select library-book-select-action" aria-label={'Actions for ' + row.title} value="" onChange={event => open(event.target.value, row)}>
      <option value="" disabled>Actions</option>
      <option value="book">View</option>
      {canEdit && <option value="edit" disabled={!writable('books') || !ready('categories')}>Edit</option>}
      {canEdit && <option value="copies" disabled={!writable('books') || !ready('categories')}>Manage Copies</option>}
      {canCreate && <option value="issue" disabled={!canIssue || !availableBooks.some(book => book.id === row.id)}>Issue Book</option>}
      {canEdit && <option value={activeBook(row) ? 'archive' : 'restore'} disabled={!writable('books')}>{activeBook(row) ? 'Archive' : 'Restore'}</option>}
      {canDelete && <option value="delete" disabled={!writable('books')}>Delete</option>}
    </select>
    <details className="library-book-menu">
      <summary aria-label={'Actions menu for ' + row.title} title="Book actions"><FiMoreVertical aria-hidden="true" /></summary>
      <div className="library-book-menu-items" role="group" aria-label={'Book actions for ' + row.title}>
        <button type="button" onClick={event => { event.currentTarget.closest('details').open = false; open('book', row) }}>View</button>
        {canEdit && <button type="button" disabled={!writable('books') || !ready('categories')} onClick={event => { event.currentTarget.closest('details').open = false; open('edit', row) }}>Edit</button>}
        {canEdit && <button type="button" disabled={!writable('books') || !ready('categories')} onClick={event => { event.currentTarget.closest('details').open = false; open('copies', row) }}>Manage Copies</button>}
        {canCreate && <button type="button" disabled={!canIssue || !availableBooks.some(book => book.id === row.id)} onClick={event => { event.currentTarget.closest('details').open = false; open('issue', row) }}>Issue Book</button>}
        {canEdit && <button type="button" disabled={!writable('books')} onClick={event => { event.currentTarget.closest('details').open = false; open(activeBook(row) ? 'archive' : 'restore', row) }}>{activeBook(row) ? 'Archive' : 'Restore'}</button>}
        {canDelete && <button type="button" className="is-danger" disabled={!writable('books')} onClick={event => { event.currentTarget.closest('details').open = false; open('delete', row) }}>Delete</button>}
      </div>
    </details>
  </> : isBorrowers ? row => <button className={button} onClick={() => open('borrower', row)}>View</button>
    : tab === 'Issue & Return' && mode === 'Return / Renew' && canCreate ? row => <div className="library-row-actions"><button className={button} disabled={!writable('issues')} onClick={() => open('return', row)}>Return</button>{!lostBookFines.some(item => same(item.issueId, row.id)) && <button className={button} disabled={!writable('issues')} onClick={() => open('mark-lost', row)}>Mark as Lost</button>}</div>
    : isLostFineView && canEdit ? row => <button className={button} onClick={() => open('edit-lost-fine', row)}>Edit Fine</button>
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
        <div className="library-tabs" role="group" aria-label="Circulation mode">{['Issue Book', 'Return / Renew', 'Lost Book Fines'].map(item =>
          <button key={item} type="button" aria-pressed={mode === item} onClick={() => choose(setMode, item)}>{item}</button>)}</div>
        {mode === 'Issue Book' && canCreate && <button type="button" className={primary} disabled={!canIssue || !availableBooks.length || !eligibleBorrowers.length} onClick={() => open('issue')}>Start Issue</button>}
      </div>}
      {isFines && <p className="library-hint">Date filters apply to assessment dates. Paid amounts and balances come from the library service.</p>}
      {tab === 'Issue & Return' && <p className="library-hint">{mode === 'Issue Book' ? 'Select a student and an available catalog title to issue a book.' : mode === 'Return / Renew' ? 'Find an active loan to record its return. Renewal is unavailable in the current library service.' : 'Lost-book fines shown here are temporary frontend records and are not saved to the library service.'}</p>}
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
        {tab === 'Books' && <div className="library-view-switcher" role="group" aria-label="Book view layout">
          <button type="button" className={`erp-btn ${bookView === 'cards' ? 'erp-btn--primary' : 'erp-btn--secondary'}`} onClick={() => setBookView('cards')} aria-pressed={bookView === 'cards'}>Grid View</button>
          <button type="button" className={`erp-btn ${bookView === 'table' ? 'erp-btn--primary' : 'erp-btn--secondary'}`} onClick={() => setBookView('table')} aria-pressed={bookView === 'table'}>Table View</button>
        </div>}
        {tab === 'Books' && canCreate && <button className={primary} disabled={!writable('books') || !ready('categories') || !data.categories.some(activeBook)} onClick={() => open('edit')}>+ Add Book</button>}
      </div>
      {ready(resource) && <>
        {tab === 'Books' && bookView === 'cards' ? (
          <BookCards rows={visible} onView={row => open('book', row)} onEdit={row => open('edit', row)} onDelete={row => open('delete', row)}
            canEdit={canEdit} canDelete={canDelete} editDisabled={!writable('books') || !ready('categories')} deleteDisabled={!writable('books')} actions={actions} />
        ) : (
          <LibraryTable rows={visible} columns={columns} actions={actions} />
        )}
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
    {modal?.kind === 'mark-lost' && <LostBookDialog {...dialog} row={{ ...modal.row, replacementCost: catalog.find(book => same(book.id, modal.row.bookId))?.price }} onSave={saveLostBook} />}
    {modal?.kind === 'edit-lost-fine' && <LostFineEditor {...dialog} row={modal.row} onSave={saveLostFine} />}
    {modal?.kind === 'book' && <ViewDialog title="Book Details" subtitle={modal.row.title} onClose={close} showExport={false} maxWidth="1000px">
      <Details fields={[[ 'Author', modal.row.author ], [ 'ISBN', modal.row.isbn ], [ 'Category', modal.row.category ], [ 'Accession', modal.row.accessionNo ],
        [ 'Shelf / Rack', modal.row.rack ], [ 'Publisher', modal.row.publisher ], [ 'Edition', modal.row.edition ], [ 'Publication Year', modal.row.publicationYear ],
        [ 'Language', modal.row.language ], [ 'Total Copies', modal.row.totalCopies ], [ 'Available', modal.row.availableCopies ], [ 'Issued', modal.row.issuedCopies ], [ 'Description', modal.row.description ]]} />
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
