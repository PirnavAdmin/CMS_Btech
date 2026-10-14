import { useState, useMemo, useEffect } from 'react'
import {
  FiBook,
  FiBookOpen,
  FiSearch,
  FiPlus,
  FiGrid,
  FiList,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiUser,
  FiUsers,
  FiTag,
  FiDownload,
  FiTrash2,
  FiEdit3,
  FiEye,
  FiMapPin,
  FiX,
  FiCheck,
  FiBookmark,
  FiBarChart2,
  FiTrendingUp,
  FiDollarSign,
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import TablePagination from '../../components/TablePagination'
import { useAcademic } from '../../context/AcademicContext'
import { getUserRole } from '../../auth/auth'
import { ROLES } from '../../auth/roles'
import {
  defaultBooks,
  defaultCopies,
  defaultCirculation,
  defaultBorrowers,
  defaultReservations,
  defaultFines,
  defaultReports,
  libraryCategories,
  libraryDepartments,
} from './sampleLibraryData'
import './LibraryWorkspace.css'

export default function LibraryWorkspace() {
  const { selectedCollegeId, selectedAcademicYearId, selectedCollege } = useAcademic()
  const userRole = getUserRole()
  const isAdmin = userRole === ROLES.ADMIN

  const scopeKey = `${selectedCollegeId || 'default'}:${selectedAcademicYearId || '2026-2027'}`
  const storageKey = `cms-library-advanced-data:${scopeKey}`

  // Persistent Library state
  const [libraryData, setLibraryData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      books: defaultBooks,
      copies: defaultCopies,
      circulation: defaultCirculation,
      borrowers: defaultBorrowers,
      reservations: defaultReservations,
      fines: defaultFines,
      reports: defaultReports,
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(libraryData))
    } catch {
      // ignore quota
    }
  }, [libraryData, storageKey])

  // Active sub-module tab matching original tabs:
  // 'catalog' | 'copies' | 'circulation' | 'borrowers' | 'reservations' | 'fines' | 'reports'
  const [activeTab, setActiveTab] = useState('catalog')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [availabilityFilter, setAvailabilityFilter] = useState('all') // 'all' | 'available' | 'low' | 'out'
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = viewMode === 'grid' ? 6 : 10

  // Notification Banner & Toasts
  const [toastMessage, setToastMessage] = useState('')
  const [workspaceMode, setWorkspaceMode] = useState('live') // 'live' | 'draft'

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  // Modals
  const [bookDetailModal, setBookDetailModal] = useState(null)
  const [addBookModal, setAddBookModal] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [issueModalBook, setIssueModalBook] = useState(null)
  const [deleteBookTarget, setDeleteBookTarget] = useState(null)

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, selectedCategory, selectedDepartment, availabilityFilter, viewMode])

  // Top KPI Metrics
  const totalBooksCount = libraryData.books.length
  const totalPhysicalCopies = useMemo(
    () => libraryData.books.reduce((sum, b) => sum + (b.totalCopies || 0), 0),
    [libraryData.books]
  )
  const activeCirculationCount = libraryData.circulation.length
  const overdueCirculationCount = useMemo(
    () => libraryData.circulation.filter((c) => c.status === 'Overdue' || c.fineAccrued > 0).length,
    [libraryData.circulation]
  )
  const pendingFinesTotal = useMemo(
    () =>
      libraryData.fines
        .filter((f) => f.paymentStatus === 'Pending')
        .reduce((sum, f) => sum + (f.fineAmount || 0), 0),
    [libraryData.fines]
  )
  const activeBorrowersCount = libraryData.borrowers.length

  // Filtered Book Catalog
  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return libraryData.books.filter((book) => {
      const matchQuery =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q) ||
        book.subject?.toLowerCase().includes(q) ||
        book.callNumber?.toLowerCase().includes(q)

      const matchCategory =
        selectedCategory === 'All Categories' || book.category === selectedCategory

      const matchDepartment =
        selectedDepartment === 'All Departments' || book.department === selectedDepartment

      let matchAvailability = true
      if (availabilityFilter === 'available') matchAvailability = book.availableCopies > 0
      else if (availabilityFilter === 'low') matchAvailability = book.availableCopies <= 2 && book.availableCopies > 0
      else if (availabilityFilter === 'out') matchAvailability = book.availableCopies === 0

      return matchQuery && matchCategory && matchDepartment && matchAvailability
    })
  }, [libraryData.books, searchQuery, selectedCategory, selectedDepartment, availabilityFilter])

  // Filtered Copies
  const filteredCopies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return libraryData.copies.filter((copy) => {
      return (
        !q ||
        copy.accession.toLowerCase().includes(q) ||
        copy.barcode.toLowerCase().includes(q) ||
        copy.bookTitle.toLowerCase().includes(q) ||
        copy.shelf.toLowerCase().includes(q) ||
        (copy.borrower && copy.borrower.toLowerCase().includes(q))
      )
    })
  }, [libraryData.copies, searchQuery])

  // Filtered Circulation
  const filteredCirculation = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return libraryData.circulation.filter((c) => {
      return (
        !q ||
        c.borrowerName.toLowerCase().includes(q) ||
        c.borrowerId.toLowerCase().includes(q) ||
        c.bookTitle.toLowerCase().includes(q) ||
        c.accession.toLowerCase().includes(q)
      )
    })
  }, [libraryData.circulation, searchQuery])

  // Filtered Borrowers
  const filteredBorrowers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return libraryData.borrowers.filter((b) => {
      return (
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.department.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q)
      )
    })
  }, [libraryData.borrowers, searchQuery])

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return libraryData.reservations.filter((r) => {
      return (
        !q ||
        r.borrowerName.toLowerCase().includes(q) ||
        r.borrowerId.toLowerCase().includes(q) ||
        r.bookTitle.toLowerCase().includes(q)
      )
    })
  }, [libraryData.reservations, searchQuery])

  // Filtered Fines
  const filteredFines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return libraryData.fines.filter((f) => {
      return (
        !q ||
        f.borrowerName.toLowerCase().includes(q) ||
        f.borrowerId.toLowerCase().includes(q) ||
        f.bookTitle.toLowerCase().includes(q) ||
        f.accession.toLowerCase().includes(q)
      )
    })
  }, [libraryData.fines, searchQuery])

  // Active items for pagination
  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'catalog':
        return filteredBooks
      case 'copies':
        return filteredCopies
      case 'circulation':
        return filteredCirculation
      case 'borrowers':
        return filteredBorrowers
      case 'reservations':
        return filteredReservations
      case 'fines':
        return filteredFines
      case 'reports':
        return libraryData.reports
      default:
        return []
    }
  }, [
    activeTab,
    filteredBooks,
    filteredCopies,
    filteredCirculation,
    filteredBorrowers,
    filteredReservations,
    filteredFines,
    libraryData.reports,
  ])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return currentList.slice(start, start + pageSize)
  }, [currentList, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize))

  // Handlers
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('All Categories')
    setSelectedDepartment('All Departments')
    setAvailabilityFilter('all')
    setCurrentPage(1)
  }

  const handleReturnBook = (circId) => {
    const target = libraryData.circulation.find((c) => c.id === circId)
    if (!target) return

    setLibraryData((prev) => {
      // 1. Remove from circulation
      const updatedCirc = prev.circulation.filter((c) => c.id !== circId)

      // 2. Increment book availableCopies
      const updatedBooks = prev.books.map((b) => {
        if (b.title === target.bookTitle) {
          return {
            ...b,
            availableCopies: Math.min(b.totalCopies, b.availableCopies + 1),
            issuedCopies: Math.max(0, b.issuedCopies - 1),
          }
        }
        return b
      })

      // 3. Mark copy available
      const updatedCopies = prev.copies.map((cp) => {
        if (cp.accession === target.accession) {
          return { ...cp, status: 'Available', borrower: null }
        }
        return cp
      })

      // 4. Update borrower active loans
      const updatedBorrowers = prev.borrowers.map((bor) => {
        if (bor.code === target.borrowerId) {
          return { ...bor, activeLoans: Math.max(0, bor.activeLoans - 1) }
        }
        return bor
      })

      return {
        ...prev,
        circulation: updatedCirc,
        books: updatedBooks,
        copies: updatedCopies,
        borrowers: updatedBorrowers,
      }
    })

    showToast(`Book "${target.bookTitle}" (${target.accession}) marked as returned successfully!`)
  }

  const handleRenewBook = (circId) => {
    setLibraryData((prev) => {
      const updatedCirc = prev.circulation.map((c) => {
        if (c.id === circId) {
          const currentDue = new Date(c.dueDate)
          currentDue.setDate(currentDue.getDate() + 14)
          return {
            ...c,
            dueDate: currentDue.toISOString().split('T')[0],
            renewCount: (c.renewCount || 0) + 1,
            status: 'Active',
            fineAccrued: 0,
          }
        }
        return c
      })
      return { ...prev, circulation: updatedCirc }
    })
    showToast('Book loan extended by 14 days.')
  }

  const handlePayFine = (fineId) => {
    setLibraryData((prev) => {
      const updatedFines = prev.fines.map((f) => {
        if (f.id === fineId) {
          return { ...f, paymentStatus: 'Paid' }
        }
        return f
      })
      return { ...prev, fines: updatedFines }
    })
    showToast('Fine marked as paid and receipt generated.')
  }

  const handleSaveBook = (bookForm) => {
    if (editingBook) {
      // Edit
      setLibraryData((prev) => {
        const updatedBooks = prev.books.map((b) => (b.id === editingBook.id ? { ...b, ...bookForm } : b))
        return { ...prev, books: updatedBooks }
      })
      showToast(`Updated "${bookForm.title}" successfully.`)
    } else {
      // Create New
      const newBookId = `book-${Date.now().toString().slice(-4)}`
      const newBook = {
        id: newBookId,
        ...bookForm,
        rating: 4.8,
        coverColor: '#1e3a8a',
        accentColor: '#3b82f6',
        issuedCopies: 0,
        availableCopies: Number(bookForm.totalCopies || 1),
        totalCopies: Number(bookForm.totalCopies || 1),
      }

      // Automatically generate copies
      const newCopies = []
      for (let i = 1; i <= newBook.totalCopies; i++) {
        newCopies.push({
          id: `copy-${Date.now().toString().slice(-4)}-${i}`,
          bookId: newBookId,
          accession: `ACC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: `BC${Math.floor(9000000 + Math.random() * 1000000)}`,
          bookTitle: newBook.title,
          shelf: newBook.rack || 'General Stacks',
          condition: 'Mint',
          status: 'Available',
          cost: 1500,
        })
      }

      setLibraryData((prev) => ({
        ...prev,
        books: [newBook, ...prev.books],
        copies: [...newCopies, ...prev.copies],
      }))
      showToast(`Added "${newBook.title}" with ${newBook.totalCopies} physical copies to the catalog!`)
    }

    setAddBookModal(false)
    setEditingBook(null)
  }

  const handleDeleteBook = (bookId) => {
    setLibraryData((prev) => {
      const target = prev.books.find((b) => b.id === bookId)
      return {
        ...prev,
        books: prev.books.filter((b) => b.id !== bookId),
        copies: prev.copies.filter((cp) => cp.bookId !== bookId && cp.bookTitle !== target?.title),
      }
    })
    setDeleteBookTarget(null)
    showToast('Book removed from library catalog.')
  }

  const handleIssueBook = (issueForm) => {
    const book = libraryData.books.find((b) => b.id === issueForm.bookId)
    if (!book || book.availableCopies <= 0) {
      showToast('No copies available to issue.')
      return
    }

    const availableCopy = libraryData.copies.find(
      (c) => c.bookTitle === book.title && c.status === 'Available'
    ) || {
      accession: `ACC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: `BC${Math.floor(9000000 + Math.random() * 1000000)}`,
    }

    const today = new Date()
    const due = new Date()
    due.setDate(today.getDate() + (issueForm.borrowerType === 'Faculty' ? 30 : 14))

    const newCirc = {
      id: `circ-${Date.now()}`,
      borrowerName: issueForm.borrowerName,
      borrowerId: issueForm.borrowerId,
      borrowerType: issueForm.borrowerType,
      bookTitle: book.title,
      accession: availableCopy.accession,
      barcode: availableCopy.barcode,
      issueDate: today.toISOString().split('T')[0],
      dueDate: due.toISOString().split('T')[0],
      status: 'Active',
      renewCount: 0,
      fineAccrued: 0,
    }

    setLibraryData((prev) => {
      const updatedBooks = prev.books.map((b) => {
        if (b.id === book.id) {
          return {
            ...b,
            availableCopies: Math.max(0, b.availableCopies - 1),
            issuedCopies: b.issuedCopies + 1,
          }
        }
        return b
      })

      const updatedCopies = prev.copies.map((cp) => {
        if (cp.accession === availableCopy.accession) {
          return {
            ...cp,
            status: 'Issued',
            borrower: `${issueForm.borrowerName} (${issueForm.borrowerId})`,
          }
        }
        return cp
      })

      const updatedBorrowers = prev.borrowers.map((bor) => {
        if (bor.code === issueForm.borrowerId) {
          return { ...bor, activeLoans: bor.activeLoans + 1 }
        }
        return bor
      })

      return {
        ...prev,
        circulation: [newCirc, ...prev.circulation],
        books: updatedBooks,
        copies: updatedCopies,
        borrowers: updatedBorrowers,
      }
    })

    setIssueModalBook(null)
    showToast(`Book issued to ${issueForm.borrowerName}. Due on ${newCirc.dueDate}.`)
  }

  const handleExportData = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentList, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `library-${activeTab}-export.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    showToast(`Exported ${currentList.length} records to JSON.`)
  }

  return (
    <DashboardLayout>
      <div className="adv-library-workspace">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="adv-toast" role="status">
            <FiCheckCircle className="adv-toast__icon" />
            <span>{toastMessage}</span>
            <button
              type="button"
              className="adv-toast__close"
              onClick={() => setToastMessage('')}
            >
              <FiX />
            </button>
          </div>
        )}

        {/* Top Header & Context */}
        <div className="adv-library-header">
          <PageHeader
            breadcrumb={[
              { label: 'Campus Services', link: '/dashboard' },
              { label: 'Digital Library' },
            ]}
            title="Digital Library & Circulation Workspace"
            subtitle="Centralized catalog, physical copy tracking, circulation desk, borrower records, and analytics."
          />

          <div className="adv-library-header__actions">
            <button
              type="button"
              className="adv-btn adv-btn--secondary"
              onClick={handleExportData}
              title="Export Current Tab Data"
            >
              <FiDownload />
              <span>Export</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className="adv-btn adv-btn--primary"
                onClick={() => {
                  setEditingBook(null)
                  setAddBookModal(true)
                }}
              >
                <FiPlus />
                <span>Add Book to Catalog</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive KPI Stat Cards */}
        <div className="adv-kpi-grid">
          <div className="adv-kpi-card adv-kpi-card--blue">
            <div className="adv-kpi-card__icon">
              <FiBook />
            </div>
            <div className="adv-kpi-card__body">
              <span className="adv-kpi-card__label">Catalog Volumes</span>
              <div className="adv-kpi-card__value">
                <strong>{totalBooksCount}</strong>
                <small className="adv-kpi-card__sub">{totalPhysicalCopies} Total Copies</small>
              </div>
              <div className="adv-kpi-card__badge">
                <FiTrendingUp /> +14 added this term
              </div>
            </div>
          </div>

          <div className="adv-kpi-card adv-kpi-card--emerald">
            <div className="adv-kpi-card__icon">
              <FiRefreshCw />
            </div>
            <div className="adv-kpi-card__body">
              <span className="adv-kpi-card__label">Active Circulation</span>
              <div className="adv-kpi-card__value">
                <strong>{activeCirculationCount}</strong>
                <small className="adv-kpi-card__sub">Currently On Loan</small>
              </div>
              <div className="adv-kpi-card__badge">
                <FiCheckCircle /> 94.2% Return Rate
              </div>
            </div>
          </div>

          <div className="adv-kpi-card adv-kpi-card--amber">
            <div className="adv-kpi-card__icon">
              <FiClock />
            </div>
            <div className="adv-kpi-card__body">
              <span className="adv-kpi-card__label">Overdue & Fines</span>
              <div className="adv-kpi-card__value">
                <strong>{overdueCirculationCount}</strong>
                <small className="adv-kpi-card__sub">₹{pendingFinesTotal} Pending</small>
              </div>
              <div className="adv-kpi-card__badge adv-kpi-card__badge--warn">
                <FiAlertTriangle /> Attention Required
              </div>
            </div>
          </div>

          <div className="adv-kpi-card adv-kpi-card--indigo">
            <div className="adv-kpi-card__icon">
              <FiUsers />
            </div>
            <div className="adv-kpi-card__body">
              <span className="adv-kpi-card__label">Registered Borrowers</span>
              <div className="adv-kpi-card__value">
                <strong>{activeBorrowersCount}</strong>
                <small className="adv-kpi-card__sub">Students & Faculty</small>
              </div>
              <div className="adv-kpi-card__badge">
                <FiUser /> Active Members
              </div>
            </div>
          </div>
        </div>

        {/* Informative Workspace Mode Banner */}
        <div className={`adv-notice-banner ${workspaceMode === 'draft' ? 'adv-notice-banner--draft' : ''}`}>
          <div className="adv-notice-banner__left">
            <span className={`adv-notice-banner__pulse ${workspaceMode === 'draft' ? 'adv-notice-banner__pulse--draft' : ''}`} />
            <div>
              <strong>
                {workspaceMode === 'live'
                  ? 'Digital Library Management System (ILMS Active)'
                  : 'Planning & Acquisition Sandbox Mode'}
              </strong>
              <p>
                {workspaceMode === 'live'
                  ? 'Connected to Central Campus Repository · Real-time inventory sync with Barcode & Accession Tracking.'
                  : 'Local drafting workspace · Prepare catalog entries, simulate accession tags, and verify shelf allocation.'}
              </p>
            </div>
          </div>
          <div className="adv-notice-banner__right">
            <button
              type="button"
              className="adv-mode-toggle-btn"
              onClick={() => {
                const nextMode = workspaceMode === 'live' ? 'draft' : 'live'
                setWorkspaceMode(nextMode)
                showToast(`Switched to ${nextMode === 'live' ? 'Live ILMS' : 'Draft Sandbox'} mode.`)
              }}
              title="Toggle between Live ILMS and Sandbox mode"
            >
              Mode: <strong>{workspaceMode === 'live' ? 'Central ILMS' : 'Draft Sandbox'}</strong>
            </button>
            <span className="adv-pill-badge">
              <FiMapPin /> {selectedCollege?.name || 'Main Campus Library (Block C)'}
            </span>
            <button
              type="button"
              className="adv-btn-text"
              onClick={() => {
                localStorage.removeItem(storageKey)
                window.location.reload()
              }}
              title="Reset records to default catalog"
            >
              Reset Sample Data
            </button>
          </div>
        </div>

        {/* 7 Navigation Tabs with Badges */}
        <nav className="adv-tabs-bar" aria-label="Library workspace navigation">
          <button
            type="button"
            className={`adv-tab-btn ${activeTab === 'catalog' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <FiBook />
            <span>Book Catalog</span>
            <span className="adv-tab-count">{totalBooksCount}</span>
          </button>

          <button
            type="button"
            className={`adv-tab-btn ${activeTab === 'copies' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('copies')}
          >
            <FiTag />
            <span>Book Copies</span>
            <span className="adv-tab-count">{libraryData.copies.length}</span>
          </button>

          <button
            type="button"
            className={`adv-tab-btn ${activeTab === 'circulation' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('circulation')}
          >
            <FiRefreshCw />
            <span>Issue & Return</span>
            <span className="adv-tab-count">{activeCirculationCount}</span>
          </button>

          <button
            type="button"
            className={`adv-tab-btn ${activeTab === 'borrowers' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('borrowers')}
          >
            <FiUsers />
            <span>Borrowers</span>
            <span className="adv-tab-count">{activeBorrowersCount}</span>
          </button>

          <button
            type="button"
            className={`adv-tab-btn ${activeTab === 'reservations' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <FiBookmark />
            <span>Reservations</span>
            <span className="adv-tab-count">{libraryData.reservations.length}</span>
          </button>

          <button
            type="button"
            className={`adv-tab-btn ${activeTab === 'fines' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('fines')}
          >
            <FiDollarSign />
            <span>Fines & Overdues</span>
            <span className="adv-tab-count">{libraryData.fines.length}</span>
          </button>

          <button
            type="button"
            className={`adv-tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FiBarChart2 />
            <span>Reports & Analytics</span>
            <span className="adv-tab-count">{libraryData.reports.length}</span>
          </button>
        </nav>

        {/* Filter and Control Bar */}
        <div className="adv-control-bar">
          <div className="adv-control-bar__search">
            <FiSearch className="adv-control-bar__search-icon" />
            <input
              type="search"
              placeholder={
                activeTab === 'catalog'
                  ? 'Search title, author, ISBN or subject...'
                  : activeTab === 'copies'
                  ? 'Search by accession number, barcode or book title...'
                  : activeTab === 'circulation'
                  ? 'Search by borrower name, roll number, book title...'
                  : 'Search records...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="adv-control-bar__clear"
                onClick={() => setSearchQuery('')}
              >
                <FiX />
              </button>
            )}
          </div>

          {activeTab === 'catalog' && (
            <>
              <div className="adv-control-bar__select-group">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by Category"
                >
                  {libraryCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  aria-label="Filter by Department"
                >
                  {libraryDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  aria-label="Filter by Availability"
                >
                  <option value="all">All Availability</option>
                  <option value="available">In Stock (Available)</option>
                  <option value="low">Low Stock (≤ 2)</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="adv-view-switcher">
                <button
                  type="button"
                  className={`adv-view-btn ${viewMode === 'grid' ? 'is-selected' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid Cards View"
                  aria-label="Grid View"
                >
                  <FiGrid />
                </button>
                <button
                  type="button"
                  className={`adv-view-btn ${viewMode === 'table' ? 'is-selected' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Data Table View"
                  aria-label="Table View"
                >
                  <FiList />
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            className="adv-btn adv-btn--ghost"
            onClick={handleResetFilters}
          >
            Reset Filters
          </button>
        </div>

        {/* MAIN CONTENT AREA BY TAB */}

        {/* TAB 1: BOOK CATALOG */}
        {activeTab === 'catalog' && (
          <div className="adv-content-section">
            <div className="adv-section-meta">
              <span>
                Showing <strong>{filteredBooks.length}</strong> of {totalBooksCount} catalog titles
              </span>
              {selectedCategory !== 'All Categories' && (
                <span className="adv-filter-chip">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('All Categories')}>×</button>
                </span>
              )}
            </div>

            {filteredBooks.length === 0 ? (
              <div className="adv-empty-state">
                <FiBookOpen className="adv-empty-state__icon" />
                <h3>No Books Match Your Search</h3>
                <p>Try searching with another keyword, clearing filters, or add a new book to the catalog.</p>
                <button
                  type="button"
                  className="adv-btn adv-btn--secondary"
                  onClick={handleResetFilters}
                >
                  Reset All Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* CARD GRID VIEW */
              <div className="adv-book-grid">
                {paginatedItems.map((book) => {
                  const percentAvailable = Math.round(
                    (book.availableCopies / (book.totalCopies || 1)) * 100
                  )
                  const isOutOfStock = book.availableCopies === 0

                  return (
                    <div key={book.id} className="adv-book-card">
                      <div
                        className="adv-book-card__cover"
                        style={{ background: book.coverColor || '#1e3a8a' }}
                      >
                        <div className="adv-book-card__spine" />
                        <div className="adv-book-card__cover-content">
                          <span className="adv-book-card__dept-tag">{book.department || 'ENG'}</span>
                          <h4 className="adv-book-card__cover-title">{book.title}</h4>
                          <p className="adv-book-card__cover-author">{book.author.split(',')[0]}</p>
                          <div className="adv-book-card__cover-footer">
                            <span>{book.edition}</span>
                            <span className="adv-book-card__call">{book.callNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="adv-book-card__body">
                        <div className="adv-book-card__header">
                          <span className="adv-category-badge">{book.category}</span>
                          <span
                            className={`adv-stock-badge ${
                              isOutOfStock
                                ? 'adv-stock-badge--out'
                                : book.availableCopies <= 2
                                ? 'adv-stock-badge--low'
                                : 'adv-stock-badge--avail'
                            }`}
                          >
                            {isOutOfStock
                              ? 'Out of Stock'
                              : `${book.availableCopies}/${book.totalCopies} Available`}
                          </span>
                        </div>

                        <h3
                          className="adv-book-card__title"
                          onClick={() => setBookDetailModal(book)}
                          title={book.title}
                        >
                          {book.title}
                        </h3>
                        <p className="adv-book-card__author">By {book.author}</p>

                        <div className="adv-book-card__details">
                          <div className="adv-book-card__detail-row">
                            <span className="adv-muted">ISBN:</span>
                            <code>{book.isbn}</code>
                          </div>
                          <div className="adv-book-card__detail-row">
                            <span className="adv-muted">Rack / Shelf:</span>
                            <span className="adv-location-tag">
                              <FiMapPin /> {book.rack}
                            </span>
                          </div>
                          <div className="adv-book-card__detail-row">
                            <span className="adv-muted">Publisher:</span>
                            <span>{book.publisher}</span>
                          </div>
                        </div>

                        {/* Availability Bar */}
                        <div className="adv-availability-meter">
                          <div className="adv-availability-meter__info">
                            <span>Stock Availability</span>
                            <strong>{percentAvailable}%</strong>
                          </div>
                          <div className="adv-availability-meter__bar">
                            <div
                              className="adv-availability-meter__fill"
                              style={{
                                width: `${percentAvailable}%`,
                                background:
                                  percentAvailable === 0
                                    ? '#ef4444'
                                    : percentAvailable < 30
                                    ? '#f59e0b'
                                    : '#10b981',
                              }}
                            />
                          </div>
                        </div>

                        <div className="adv-book-card__actions">
                          <button
                            type="button"
                            className="adv-btn adv-btn--sm adv-btn--secondary"
                            onClick={() => setBookDetailModal(book)}
                          >
                            <FiEye /> View Details
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                className="adv-btn adv-btn--sm adv-btn--primary"
                                disabled={isOutOfStock}
                                onClick={() => setIssueModalBook(book)}
                                title={isOutOfStock ? 'No copies available' : 'Quick Issue'}
                              >
                                <FiRefreshCw /> Quick Issue
                              </button>
                              <button
                                type="button"
                                className="adv-icon-btn"
                                onClick={() => {
                                  setEditingBook(book)
                                  setAddBookModal(true)
                                }}
                                title="Edit Book Details"
                              >
                                <FiEdit3 />
                              </button>
                              <button
                                type="button"
                                className="adv-icon-btn adv-icon-btn--danger"
                                onClick={() => setDeleteBookTarget(book)}
                                title="Delete Book"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* DENSE ERP TABLE VIEW */
              <div className="adv-table-card">
                <div className="adv-table-responsive">
                  <table className="adv-table">
                    <thead>
                      <tr>
                        <th>Book Title & Author</th>
                        <th>Category</th>
                        <th>ISBN</th>
                        <th>Rack / Shelf</th>
                        <th>Available Copies</th>
                        <th>Rating</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((book) => (
                        <tr key={book.id}>
                          <td>
                            <div className="adv-table-book">
                              <div
                                className="adv-table-book__spine"
                                style={{ background: book.coverColor }}
                              />
                              <div>
                                <strong
                                  className="adv-table-book__title"
                                  onClick={() => setBookDetailModal(book)}
                                >
                                  {book.title}
                                </strong>
                                <small>{book.author}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="adv-category-badge">{book.category}</span>
                          </td>
                          <td>
                            <code>{book.isbn}</code>
                          </td>
                          <td>
                            <span className="adv-location-tag">
                              <FiMapPin /> {book.rack}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`adv-stock-badge ${
                                book.availableCopies === 0
                                  ? 'adv-stock-badge--out'
                                  : book.availableCopies <= 2
                                  ? 'adv-stock-badge--low'
                                  : 'adv-stock-badge--avail'
                              }`}
                            >
                              {book.availableCopies} of {book.totalCopies} Available
                            </span>
                          </td>
                          <td>★ {book.rating}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="adv-table-actions">
                              <button
                                type="button"
                                className="adv-icon-btn"
                                onClick={() => setBookDetailModal(book)}
                                title="View Details"
                              >
                                <FiEye />
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    className="adv-icon-btn"
                                    disabled={book.availableCopies === 0}
                                    onClick={() => setIssueModalBook(book)}
                                    title="Issue Book"
                                  >
                                    <FiRefreshCw />
                                  </button>
                                  <button
                                    type="button"
                                    className="adv-icon-btn"
                                    onClick={() => {
                                      setEditingBook(book)
                                      setAddBookModal(true)
                                    }}
                                    title="Edit"
                                  >
                                    <FiEdit3 />
                                  </button>
                                  <button
                                    type="button"
                                    className="adv-icon-btn adv-icon-btn--danger"
                                    onClick={() => setDeleteBookTarget(book)}
                                    title="Delete"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* TAB 2: BOOK COPIES */}
        {activeTab === 'copies' && (
          <div className="adv-content-section">
            <div className="adv-section-meta">
              <span>
                Showing <strong>{filteredCopies.length}</strong> physical item barcodes & accession numbers
              </span>
            </div>

            <div className="adv-table-card">
              <div className="adv-table-responsive">
                <table className="adv-table">
                <thead>
                  <tr>
                    <th>Accession No</th>
                    <th>Barcode</th>
                    <th>Book Title</th>
                    <th>Shelf Location</th>
                    <th>Condition</th>
                    <th>Circulation Status</th>
                    <th>Current Holder</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((copy) => (
                    <tr key={copy.id}>
                      <td>
                        <strong>{copy.accession}</strong>
                      </td>
                      <td>
                        <span className="adv-barcode-tag">
                          <FiTag /> {copy.barcode}
                        </span>
                      </td>
                      <td>
                        <strong>{copy.bookTitle}</strong>
                      </td>
                      <td>
                        <span className="adv-location-tag">
                          <FiMapPin /> {copy.shelf}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`adv-condition-pill adv-condition-pill--${copy.condition.toLowerCase()}`}
                        >
                          {copy.condition}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`adv-status-pill ${
                            copy.status === 'Available'
                              ? 'adv-status-pill--green'
                              : copy.status === 'Issued'
                              ? 'adv-status-pill--blue'
                              : 'adv-status-pill--orange'
                          }`}
                        >
                          {copy.status}
                        </span>
                      </td>
                      <td>
                        {copy.borrower ? (
                          <span className="adv-borrower-chip">
                            <FiUser /> {copy.borrower}
                          </span>
                        ) : (
                          <span className="adv-muted">In Stacks</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* TAB 3: ISSUE & RETURN (CIRCULATION DESK) */}
        {activeTab === 'circulation' && (
          <div className="adv-content-section">
            <div className="adv-section-meta">
              <span>
                Active Loans: <strong>{filteredCirculation.length}</strong> books currently checked out
              </span>
            </div>

            <div className="adv-table-card">
              <div className="adv-table-responsive">
                <table className="adv-table">
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Role</th>
                    <th>Book Title</th>
                    <th>Accession & Barcode</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Loan Status</th>
                    <th style={{ textAlign: 'right' }}>Circulation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((circ) => {
                    const isOverdue = circ.status === 'Overdue' || circ.fineAccrued > 0
                    return (
                      <tr key={circ.id} className={isOverdue ? 'adv-row--warn' : ''}>
                        <td>
                          <div>
                            <strong>{circ.borrowerName}</strong>
                            <small className="adv-block adv-muted">{circ.borrowerId}</small>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`adv-role-badge ${
                              circ.borrowerType === 'Faculty'
                                ? 'adv-role-badge--faculty'
                                : 'adv-role-badge--student'
                            }`}
                          >
                            {circ.borrowerType}
                          </span>
                        </td>
                        <td>
                          <strong>{circ.bookTitle}</strong>
                        </td>
                        <td>
                          <code>{circ.accession}</code>
                          <small className="adv-block adv-muted">{circ.barcode}</small>
                        </td>
                        <td>{circ.issueDate}</td>
                        <td>
                          <strong>{circ.dueDate}</strong>
                          {isOverdue && (
                            <small className="adv-overdue-alert">
                              Fine: ₹{circ.fineAccrued}
                            </small>
                          )}
                        </td>
                        <td>
                          <span
                            className={`adv-status-pill ${
                              isOverdue
                                ? 'adv-status-pill--red'
                                : circ.status === 'Due Today'
                                ? 'adv-status-pill--orange'
                                : 'adv-status-pill--green'
                            }`}
                          >
                            {circ.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="adv-table-actions">
                            <button
                              type="button"
                              className="adv-btn adv-btn--sm adv-btn--primary"
                              onClick={() => handleReturnBook(circ.id)}
                            >
                              <FiCheck /> Return
                            </button>
                            <button
                              type="button"
                              className="adv-btn adv-btn--sm adv-btn--secondary"
                              onClick={() => handleRenewBook(circ.id)}
                              title="Extend loan by 14 days"
                            >
                              Renew (+14d)
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* TAB 4: BORROWERS DIRECTORY */}
        {activeTab === 'borrowers' && (
          <div className="adv-content-section">
            <div className="adv-section-meta">
              <span>
                Registered Members: <strong>{filteredBorrowers.length}</strong> active patrons
              </span>
            </div>

            <div className="adv-table-card">
              <div className="adv-table-responsive">
                <table className="adv-table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>ID / Roll Number</th>
                    <th>Type</th>
                    <th>Department</th>
                    <th>Contact Email</th>
                    <th>Active Loans / Limit</th>
                    <th>Fines Pending</th>
                    <th>Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((bor) => (
                    <tr key={bor.id}>
                      <td>
                        <strong>{bor.name}</strong>
                      </td>
                      <td>
                        <code>{bor.code}</code>
                      </td>
                      <td>
                        <span
                          className={`adv-role-badge ${
                            bor.type === 'Faculty'
                              ? 'adv-role-badge--faculty'
                              : 'adv-role-badge--student'
                          }`}
                        >
                          {bor.type}
                        </span>
                      </td>
                      <td>{bor.department}</td>
                      <td>{bor.email}</td>
                      <td>
                        <div className="adv-loan-meter">
                          <span>
                            {bor.activeLoans} of {bor.maxLimit} Books
                          </span>
                          <div className="adv-loan-meter__bar">
                            <div
                              className="adv-loan-meter__fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (bor.activeLoans / bor.maxLimit) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        {bor.finesPending > 0 ? (
                          <span className="adv-fine-tag">₹{bor.finesPending} Pending</span>
                        ) : (
                          <span className="adv-fine-tag adv-fine-tag--clear">₹0 Clear</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`adv-status-pill ${
                            bor.status.includes('Overdue')
                              ? 'adv-status-pill--orange'
                              : 'adv-status-pill--green'
                          }`}
                        >
                          {bor.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* TAB 5: RESERVATIONS */}
        {activeTab === 'reservations' && (
          <div className="adv-content-section">
            <div className="adv-section-meta">
              <span>
                Active Queue: <strong>{filteredReservations.length}</strong> hold reservations
              </span>
            </div>

            <div className="adv-table-card">
              <div className="adv-table-responsive">
                <table className="adv-table">
                <thead>
                  <tr>
                    <th>Borrower Name</th>
                    <th>ID / Roll No</th>
                    <th>Requested Book</th>
                    <th>Requested On</th>
                    <th>Queue Rank</th>
                    <th>Priority</th>
                    <th>Hold Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((res) => (
                    <tr key={res.id}>
                      <td>
                        <strong>{res.borrowerName}</strong>
                      </td>
                      <td>
                        <code>{res.borrowerId}</code>
                      </td>
                      <td>
                        <strong>{res.bookTitle}</strong>
                      </td>
                      <td>{res.requestedOn}</td>
                      <td>
                        <span className="adv-queue-tag">#{res.queuePosition} in line</span>
                      </td>
                      <td>{res.priority}</td>
                      <td>
                        <span
                          className={`adv-status-pill ${
                            res.status === 'Ready for Pickup'
                              ? 'adv-status-pill--green'
                              : 'adv-status-pill--blue'
                          }`}
                        >
                          {res.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="adv-btn adv-btn--sm adv-btn--secondary"
                          onClick={() => {
                            setLibraryData((prev) => ({
                              ...prev,
                              reservations: prev.reservations.filter((r) => r.id !== res.id),
                            }))
                            showToast('Hold request fulfilled / cancelled.')
                          }}
                        >
                          Fulfill / Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* TAB 6: FINES & OVERDUES */}
        {activeTab === 'fines' && (
          <div className="adv-content-section">
            <div className="adv-section-meta">
              <span>
                Overdue Ledger: <strong>{filteredFines.length}</strong> fine records
              </span>
            </div>

            <div className="adv-table-card">
              <div className="adv-table-responsive">
                <table className="adv-table">
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Accession No</th>
                    <th>Book Title</th>
                    <th>Overdue Days</th>
                    <th>Calculated Fine</th>
                    <th>Calculated Date</th>
                    <th>Payment Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((fine) => (
                    <tr key={fine.id}>
                      <td>
                        <strong>{fine.borrowerName}</strong>
                        <small className="adv-block adv-muted">{fine.borrowerId}</small>
                      </td>
                      <td>
                        <code>{fine.accession}</code>
                      </td>
                      <td>{fine.bookTitle}</td>
                      <td>
                        <span className="adv-overdue-days">{fine.overdueDays} Days</span>
                      </td>
                      <td>
                        <strong>₹{fine.fineAmount}</strong>
                        <small className="adv-block adv-muted">(₹5 / day rate)</small>
                      </td>
                      <td>{fine.calculatedOn}</td>
                      <td>
                        <span
                          className={`adv-status-pill ${
                            fine.paymentStatus === 'Paid'
                              ? 'adv-status-pill--green'
                              : 'adv-status-pill--red'
                          }`}
                        >
                          {fine.paymentStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {fine.paymentStatus === 'Pending' ? (
                          <button
                            type="button"
                            className="adv-btn adv-btn--sm adv-btn--primary"
                            onClick={() => handlePayFine(fine.id)}
                          >
                            Collect Payment
                          </button>
                        ) : (
                          <span className="adv-receipt-tag">Receipt #REC-{fine.id.slice(-3)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* TAB 7: REPORTS & ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="adv-content-section">
            <div className="adv-analytics-grid">
              <div className="adv-analytics-card">
                <h4>Top Borrowed Engineering Titles</h4>
                <div className="adv-analytics-list">
                  <div className="adv-analytics-item">
                    <div className="adv-analytics-item__meta">
                      <span>Introduction to Algorithms (CLRS)</span>
                      <strong>142 Loans</strong>
                    </div>
                    <div className="adv-analytics-bar">
                      <div className="adv-analytics-bar__fill" style={{ width: '92%' }} />
                    </div>
                  </div>
                  <div className="adv-analytics-item">
                    <div className="adv-analytics-item__meta">
                      <span>Operating System Concepts (Silberschatz)</span>
                      <strong>118 Loans</strong>
                    </div>
                    <div className="adv-analytics-bar">
                      <div className="adv-analytics-bar__fill" style={{ width: '78%' }} />
                    </div>
                  </div>
                  <div className="adv-analytics-item">
                    <div className="adv-analytics-item__meta">
                      <span>Artificial Intelligence: A Modern Approach</span>
                      <strong>95 Loans</strong>
                    </div>
                    <div className="adv-analytics-bar">
                      <div className="adv-analytics-bar__fill" style={{ width: '64%' }} />
                    </div>
                  </div>
                  <div className="adv-analytics-item">
                    <div className="adv-analytics-item__meta">
                      <span>Database System Concepts (Korth)</span>
                      <strong>82 Loans</strong>
                    </div>
                    <div className="adv-analytics-bar">
                      <div className="adv-analytics-bar__fill" style={{ width: '56%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="adv-analytics-card">
                <h4>Department Utilization Breakdown</h4>
                <div className="adv-dept-stats">
                  <div className="adv-dept-stat-box">
                    <span>CSE & AIML</span>
                    <strong>48.4%</strong>
                    <small>1,750 Loans</small>
                  </div>
                  <div className="adv-dept-stat-box">
                    <span>ECE</span>
                    <strong>22.1%</strong>
                    <small>800 Loans</small>
                  </div>
                  <div className="adv-dept-stat-box">
                    <span>MECH & CIVIL</span>
                    <strong>16.5%</strong>
                    <small>600 Loans</small>
                  </div>
                  <div className="adv-dept-stat-box">
                    <span>EEE & H&S</span>
                    <strong>13.0%</strong>
                    <small>470 Loans</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="adv-table-card" style={{ marginTop: '24px' }}>
              <div className="adv-table-card__header">
                <h3>Institutional Circulation & Audit Reports</h3>
              </div>
              <div className="adv-table-responsive">
                <table className="adv-table">
                <thead>
                  <tr>
                    <th>Report Title</th>
                    <th>Classification</th>
                    <th>Audit Period</th>
                    <th>Generated Date</th>
                    <th>Issues / Returns</th>
                    <th>Compliance / Overdue</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {libraryData.reports.map((rep) => (
                    <tr key={rep.id}>
                      <td>
                        <strong>{rep.title}</strong>
                        <small className="adv-block adv-muted">Auditor: {rep.generatedBy}</small>
                      </td>
                      <td>
                        <span className="adv-category-badge">{rep.type}</span>
                      </td>
                      <td>{rep.period}</td>
                      <td>{rep.generatedOn}</td>
                      <td>
                        {rep.totalIssues} Issues / {rep.totalReturns} Returns
                      </td>
                      <td>
                        <span className="adv-badge-soft">{rep.overdueRate}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="adv-btn adv-btn--sm adv-btn--secondary"
                          onClick={() => showToast(`Report "${rep.title}" downloaded (PDF format).`)}
                        >
                          <FiDownload /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: BOOK DETAILS DRAWER / MODAL */}
        {bookDetailModal && (
          <div
            className="adv-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setBookDetailModal(null)
            }}
          >
            <div className="adv-modal adv-modal--lg" role="dialog" aria-modal="true">
              <div className="adv-modal__header">
                <div>
                  <span className="adv-category-badge">{bookDetailModal.category}</span>
                  <h2>{bookDetailModal.title}</h2>
                </div>
                <button
                  type="button"
                  className="adv-modal__close"
                  onClick={() => setBookDetailModal(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="adv-modal__body">
                <div className="adv-detail-hero">
                  <div
                    className="adv-detail-cover"
                    style={{ background: bookDetailModal.coverColor }}
                  >
                    <div className="adv-detail-cover__spine" />
                    <div className="adv-detail-cover__content">
                      <span>{bookDetailModal.department}</span>
                      <h4>{bookDetailModal.title}</h4>
                      <small>{bookDetailModal.author.split(',')[0]}</small>
                    </div>
                  </div>

                  <div className="adv-detail-info">
                    <p className="adv-detail-desc">{bookDetailModal.description}</p>

                    <div className="adv-meta-grid">
                      <div>
                        <span className="adv-muted">Primary Author(s):</span>
                        <strong>{bookDetailModal.author}</strong>
                      </div>
                      <div>
                        <span className="adv-muted">ISBN-13:</span>
                        <code>{bookDetailModal.isbn}</code>
                      </div>
                      <div>
                        <span className="adv-muted">Publisher & Edition:</span>
                        <span>
                          {bookDetailModal.publisher} · {bookDetailModal.edition}
                        </span>
                      </div>
                      <div>
                        <span className="adv-muted">Call Number:</span>
                        <code>{bookDetailModal.callNumber}</code>
                      </div>
                      <div>
                        <span className="adv-muted">Rack / Physical Location:</span>
                        <strong className="adv-location-tag">
                          <FiMapPin /> {bookDetailModal.rack}
                        </strong>
                      </div>
                      <div>
                        <span className="adv-muted">Language:</span>
                        <span>{bookDetailModal.language}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="adv-detail-copies-section">
                  <h3>Physical Copies Status</h3>
                  <div className="adv-copies-chips">
                    {libraryData.copies
                      .filter((c) => c.bookTitle === bookDetailModal.title)
                      .map((copy) => (
                        <div key={copy.id} className="adv-copy-badge-item">
                          <div>
                            <strong>{copy.accession}</strong>
                            <small>{copy.shelf}</small>
                          </div>
                          <span
                            className={`adv-status-pill ${
                              copy.status === 'Available'
                                ? 'adv-status-pill--green'
                                : 'adv-status-pill--blue'
                            }`}
                          >
                            {copy.status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="adv-modal__footer">
                <button
                  type="button"
                  className="adv-btn adv-btn--secondary"
                  onClick={() => setBookDetailModal(null)}
                >
                  Close
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="adv-btn adv-btn--primary"
                    disabled={bookDetailModal.availableCopies === 0}
                    onClick={() => {
                      const b = bookDetailModal
                      setBookDetailModal(null)
                      setIssueModalBook(b)
                    }}
                  >
                    <FiRefreshCw /> Issue This Book
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT BOOK */}
        {addBookModal && (
          <BookFormModal
            initialData={editingBook}
            onClose={() => {
              setAddBookModal(false)
              setEditingBook(null)
            }}
            onSave={handleSaveBook}
          />
        )}

        {/* MODAL: QUICK ISSUE BOOK */}
        {issueModalBook && (
          <IssueBookModal
            book={issueModalBook}
            borrowers={libraryData.borrowers}
            onClose={() => setIssueModalBook(null)}
            onIssue={handleIssueBook}
          />
        )}

        {/* MODAL: DELETE CONFIRMATION */}
        {deleteBookTarget && (
          <div
            className="adv-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteBookTarget(null)
            }}
          >
            <div className="adv-modal adv-modal--sm" role="dialog" aria-modal="true">
              <div className="adv-modal__header">
                <h2>Delete Book from Catalog?</h2>
                <button
                  type="button"
                  className="adv-modal__close"
                  onClick={() => setDeleteBookTarget(null)}
                >
                  <FiX />
                </button>
              </div>
              <div className="adv-modal__body">
                <p>
                  Are you sure you want to delete <strong>{deleteBookTarget.title}</strong>? All
                  associated accession barcodes and physical copies will also be removed.
                </p>
              </div>
              <div className="adv-modal__footer">
                <button
                  type="button"
                  className="adv-btn adv-btn--secondary"
                  onClick={() => setDeleteBookTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="adv-btn adv-btn--danger"
                  onClick={() => handleDeleteBook(deleteBookTarget.id)}
                >
                  Delete Book
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// SUB-COMPONENT: ADD/EDIT BOOK MODAL FORM
function BookFormModal({ initialData, onClose, onSave }) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [author, setAuthor] = useState(initialData?.author || '')
  const [isbn, setIsbn] = useState(initialData?.isbn || '')
  const [category, setCategory] = useState(initialData?.category || 'Computer Science & AI')
  const [department, setDepartment] = useState(initialData?.department || 'CSE')
  const [publisher, setPublisher] = useState(initialData?.publisher || '')
  const [edition, setEdition] = useState(initialData?.edition || '1st Edition')
  const [rack, setRack] = useState(initialData?.rack || 'Rack CS-01 / Shelf A')
  const [totalCopies, setTotalCopies] = useState(initialData?.totalCopies || 5)
  const [callNumber, setCallNumber] = useState(initialData?.callNumber || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !author.trim() || !isbn.trim()) {
      setError('Title, Author, and ISBN are required.')
      return
    }

    onSave({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      category,
      department,
      publisher: publisher.trim() || 'Academic Press',
      edition: edition.trim(),
      rack: rack.trim(),
      totalCopies: Number(totalCopies) || 1,
      callNumber: callNumber.trim() || 'QA76.0 .GEN',
      description: description.trim() || 'Comprehensive academic textbook for undergraduate and postgraduate courses.',
    })
  }

  return (
    <div
      className="adv-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="adv-modal adv-modal--md" role="dialog" aria-modal="true">
        <div className="adv-modal__header">
          <h2>{initialData ? 'Edit Catalog Book' : 'Add New Book to Catalog'}</h2>
          <button type="button" className="adv-modal__close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="adv-modal__body adv-form-grid">
            {error && <div className="adv-form-error">{error}</div>}

            <div className="adv-form-field adv-form-field--full">
              <label>Book Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Algorithms"
              />
            </div>

            <div className="adv-form-field adv-form-field--full">
              <label>Author(s) *</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Thomas H. Cormen, Charles E. Leiserson"
              />
            </div>

            <div className="adv-form-field">
              <label>ISBN-10 / ISBN-13 *</label>
              <input
                type="text"
                required
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 978-0262046305"
              />
            </div>

            <div className="adv-form-field">
              <label>Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {libraryDepartments
                  .filter((d) => d !== 'All Departments')
                  .map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
            </div>

            <div className="adv-form-field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {libraryCategories
                  .filter((c) => c !== 'All Categories')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>

            <div className="adv-form-field">
              <label>Publisher</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. MIT Press"
              />
            </div>

            <div className="adv-form-field">
              <label>Edition</label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="e.g. 4th Edition (2022)"
              />
            </div>

            <div className="adv-form-field">
              <label>Rack / Shelf Location</label>
              <input
                type="text"
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                placeholder="e.g. Rack CS-04 / Shelf B"
              />
            </div>

            <div className="adv-form-field">
              <label>Number of Physical Copies</label>
              <input
                type="number"
                min="1"
                max="100"
                value={totalCopies}
                onChange={(e) => setTotalCopies(e.target.value)}
              />
            </div>

            <div className="adv-form-field">
              <label>Call / Classification Number</label>
              <input
                type="text"
                value={callNumber}
                onChange={(e) => setCallNumber(e.target.value)}
                placeholder="e.g. QA76.6 .C662"
              />
            </div>

            <div className="adv-form-field adv-form-field--full">
              <label>Book Description / Syllabus Context</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary or relevant subjects..."
              />
            </div>
          </div>

          <div className="adv-modal__footer">
            <button type="button" className="adv-btn adv-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adv-btn adv-btn--primary">
              {initialData ? 'Save Changes' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// SUB-COMPONENT: QUICK ISSUE MODAL FORM
function IssueBookModal({ book, borrowers, onClose, onIssue }) {
  const [selectedBorrowerId, setSelectedBorrowerId] = useState(borrowers[0]?.code || '')
  const [borrowerType, setBorrowerType] = useState('Student')

  const borrower = borrowers.find((b) => b.code === selectedBorrowerId) || borrowers[0]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!borrower) return
    onIssue({
      bookId: book.id,
      borrowerName: borrower.name,
      borrowerId: borrower.code,
      borrowerType: borrower.type,
    })
  }

  return (
    <div
      className="adv-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="adv-modal adv-modal--sm" role="dialog" aria-modal="true">
        <div className="adv-modal__header">
          <h2>Circulation Desk: Quick Issue</h2>
          <button type="button" className="adv-modal__close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="adv-modal__body">
            <div className="adv-issue-book-card">
              <span className="adv-category-badge">{book.category}</span>
              <h4>{book.title}</h4>
              <p className="adv-muted">By {book.author}</p>
              <div className="adv-stock-badge adv-stock-badge--avail">
                {book.availableCopies} Copies Available in Stacks
              </div>
            </div>

            <div className="adv-form-field" style={{ marginTop: '16px' }}>
              <label>Select Registered Member / Patron</label>
              <select
                value={selectedBorrowerId}
                onChange={(e) => {
                  setSelectedBorrowerId(e.target.value)
                  const b = borrowers.find((x) => x.code === e.target.value)
                  if (b) setBorrowerType(b.type)
                }}
              >
                {borrowers.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name} ({b.code}) - {b.type} · {b.department}
                  </option>
                ))}
              </select>
            </div>

            {borrower && (
              <div className="adv-borrower-summary-box">
                <div>
                  <span className="adv-muted">Active Loans:</span>
                  <strong>
                    {borrower.activeLoans} / {borrower.maxLimit}
                  </strong>
                </div>
                <div>
                  <span className="adv-muted">Loan Period:</span>
                  <strong>{borrower.type === 'Faculty' ? '30 Days' : '14 Days'}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="adv-modal__footer">
            <button type="button" className="adv-btn adv-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adv-btn adv-btn--primary">
              <FiCheck /> Confirm & Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
