import { useState, useMemo, useEffect } from 'react'
import {
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUser,
  FiUsers,
  FiCheckCircle,
  FiPlus,
  FiSearch,
  FiGrid,
  FiList,
  FiTrash2,
  FiEdit2,
  FiAward,
  FiFileText,
  FiTrendingUp,
  FiCheckSquare,
  FiX,
  FiExternalLink,
  FiMail,
  FiPhone,
  FiGlobe,
  FiDollarSign,
  FiAlertTriangle
} from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import PageHeader from '../../components/PageHeader'
import ExportMenu from '../../components/ExportMenu'
import FilterPanel from '../../components/FilterPanel'
import TablePagination from '../../components/TablePagination'
import {
  defaultDrives,
  defaultCompanies,
  defaultApplications,
  defaultInterviews,
  defaultOffers,
  defaultPlacementStats,
} from './samplePlacementData'
import './PlacementWorkspace.css'

// Export column definitions
const driveExportColumns = [
  { label: 'Drive Title', value: 'title' },
  { label: 'Company', value: 'company' },
  { label: 'Tier', value: 'tier' },
  { label: 'Role', value: 'role' },
  { label: 'CTC Package', value: 'ctc' },
  { label: 'Drive Date', value: 'driveDate' },
  { label: 'Application Deadline', value: 'deadline' },
  { label: 'Venue / Mode', value: 'venue' },
  { label: 'Eligibility', value: 'eligibility' },
  { label: 'Status', value: 'status' },
  { label: 'Applicants', value: 'applicantsCount' },
  { label: 'Shortlisted', value: 'shortlistedCount' },
  { label: 'Selected', value: 'selectedCount' },
]

const companyExportColumns = [
  { label: 'Company Name', value: 'name' },
  { label: 'Industry Domain', value: 'industry' },
  { label: 'Hiring Tier', value: 'tier' },
  { label: 'HQ Location', value: 'hq' },
  { label: 'HR Contact Person', value: 'contactPerson' },
  { label: 'Contact Email', value: 'contactEmail' },
  { label: 'Contact Phone', value: 'contactPhone' },
  { label: 'Website', value: 'website' },
  { label: 'Past Hires', value: 'pastHires' },
  { label: 'Average CTC', value: 'avgPackage' },
  { label: 'Partner Status', value: 'status' },
]

const applicationExportColumns = [
  { label: 'Student Name', value: 'studentName' },
  { label: 'Roll Number', value: 'rollNo' },
  { label: 'Branch', value: 'branch' },
  { label: 'CGPA', value: 'cgpa' },
  { label: 'Recruiter Company', value: 'company' },
  { label: 'Job Role', value: 'role' },
  { label: 'Applied Date', value: 'appliedDate' },
  { label: 'Current Round', value: 'currentRound' },
  { label: 'Application Status', value: 'status' },
  { label: 'Student Email', value: 'email' },
  { label: 'Student Phone', value: 'phone' },
]

const interviewExportColumns = [
  { label: 'Candidate Name', value: 'candidateName' },
  { label: 'Roll Number', value: 'rollNo' },
  { label: 'Branch', value: 'branch' },
  { label: 'Company', value: 'company' },
  { label: 'Role', value: 'role' },
  { label: 'Round Type', value: 'roundType' },
  { label: 'Start Time', value: 'start' },
  { label: 'End Time', value: 'end' },
  { label: 'Venue / Link', value: 'venue' },
  { label: 'Interviewer', value: 'interviewer' },
  { label: 'Evaluation Status', value: 'status' },
  { label: 'Feedback Notes', value: 'feedback' },
]

const offerExportColumns = [
  { label: 'Student Name', value: 'studentName' },
  { label: 'Roll Number', value: 'rollNo' },
  { label: 'Branch', value: 'branch' },
  { label: 'Company', value: 'company' },
  { label: 'Job Role', value: 'role' },
  { label: 'CTC Package', value: 'ctc' },
  { label: 'Offer Date', value: 'offerDate' },
  { label: 'Acceptance Deadline', value: 'deadline' },
  { label: 'Offer Letter Ref', value: 'offerLetterRef' },
  { label: 'Posting Location', value: 'location' },
  { label: 'Offer Status', value: 'status' },
]

export default function PlacementWorkspace() {
  const [activeTab, setActiveTab] = useState('drives') // drives | companies | applications | interviews | offers | reports
  const [viewMode, setViewMode] = useState('grid') // grid | table (for drives)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [notice, setNotice] = useState('')

  // Local Storage persistence
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('CMS_BTECH_PLACEMENT_DATA_V1')
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return {
      drives: defaultDrives,
      companies: defaultCompanies,
      applications: defaultApplications,
      interviews: defaultInterviews,
      offers: defaultOffers,
      stats: defaultPlacementStats,
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('CMS_BTECH_PLACEMENT_DATA_V1', JSON.stringify(data))
    } catch {
      // ignore
    }
  }, [data])

  // Modals state
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit'
  const [modalType, setModalType] = useState(null) // 'drive' | 'company' | 'application' | 'interview' | 'offer'
  const [activeItem, setActiveItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Tab switcher
  const handleSwitchTab = (tabKey) => {
    setActiveTab(tabKey)
    setSearchQuery('')
    setStatusFilter('ALL')
    setTierFilter('ALL')
    setBranchFilter('ALL')
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(
    (statusFilter && statusFilter !== 'ALL') ||
    (tierFilter && tierFilter !== 'ALL') ||
    (branchFilter && branchFilter !== 'ALL')
  )

  const handleClearFilters = () => {
    setStatusFilter('ALL')
    setTierFilter('ALL')
    setBranchFilter('ALL')
    setSearchQuery('')
    setCurrentPage(1)
  }

  // Filtered lists
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    if (activeTab === 'drives') {
      return data.drives.filter(item => {
        const matchQ = !q ||
          item.title.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q) ||
          item.venue.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchTier = tierFilter === 'ALL' || item.tier === tierFilter
        return matchQ && matchStatus && matchTier
      })
    }

    if (activeTab === 'companies') {
      return data.companies.filter(item => {
        const matchQ = !q ||
          item.name.toLowerCase().includes(q) ||
          item.industry.toLowerCase().includes(q) ||
          item.contactPerson.toLowerCase().includes(q) ||
          item.contactEmail.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchTier = tierFilter === 'ALL' || item.tier === tierFilter
        return matchQ && matchStatus && matchTier
      })
    }

    if (activeTab === 'applications') {
      return data.applications.filter(item => {
        const matchQ = !q ||
          item.studentName.toLowerCase().includes(q) ||
          item.rollNo.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchBranch = branchFilter === 'ALL' || item.branch === branchFilter
        return matchQ && matchStatus && matchBranch
      })
    }

    if (activeTab === 'interviews') {
      return data.interviews.filter(item => {
        const matchQ = !q ||
          item.candidateName.toLowerCase().includes(q) ||
          item.rollNo.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.roundType.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchBranch = branchFilter === 'ALL' || item.branch === branchFilter
        return matchQ && matchStatus && matchBranch
      })
    }

    if (activeTab === 'offers') {
      return data.offers.filter(item => {
        const matchQ = !q ||
          item.studentName.toLowerCase().includes(q) ||
          item.rollNo.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q) ||
          item.offerLetterRef.toLowerCase().includes(q)
        const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
        const matchBranch = branchFilter === 'ALL' || item.branch === branchFilter
        return matchQ && matchStatus && matchBranch
      })
    }

    return []
  }, [activeTab, data, searchQuery, statusFilter, tierFilter, branchFilter])

  // Pagination slice
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))

  // Export Columns based on active tab
  const currentExportColumns = useMemo(() => {
    switch (activeTab) {
      case 'drives': return driveExportColumns
      case 'companies': return companyExportColumns
      case 'applications': return applicationExportColumns
      case 'interviews': return interviewExportColumns
      case 'offers': return offerExportColumns
      default: return driveExportColumns
    }
  }, [activeTab])

  // Modal Handlers
  const openCreateModal = (type) => {
    setModalType(type)
    setModalMode('create')
    if (type === 'drive') {
      setActiveItem({
        id: `DRV-${Date.now().toString().slice(-4)}`,
        title: '',
        company: '',
        tier: 'Super Dream',
        role: '',
        ctc: '₹ 12.0 LPA',
        ctcNum: 12.0,
        driveDate: new Date().toISOString().slice(0, 10),
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        venue: 'Campus Auditorium & Virtual',
        eligibility: 'B.Tech CSE, IT, ECE · Min 7.5 CGPA',
        rounds: 'Online Coding Test, Technical Interview, HR Round',
        status: 'Upcoming',
        eligibleBranches: ['CSE', 'IT'],
        applicantsCount: 0,
        shortlistedCount: 0,
        selectedCount: 0,
        minCgpa: 7.5,
        description: '',
      })
    } else if (type === 'company') {
      setActiveItem({
        id: `CMP-${Date.now().toString().slice(-4)}`,
        name: '',
        industry: 'Software & Technology',
        tier: 'Dream',
        hq: 'Hyderabad',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        website: 'https://',
        mouSigned: true,
        pastHires: 0,
        avgPackage: '₹ 8.5 LPA',
        status: 'Active Partner',
        notes: '',
      })
    } else if (type === 'application') {
      setActiveItem({
        id: `APP-${Date.now().toString().slice(-4)}`,
        studentName: '',
        rollNo: '21B81A0501',
        branch: 'CSE',
        cgpa: 8.0,
        driveId: data.drives[0]?.id || 'DRV-101',
        company: data.drives[0]?.company || 'Microsoft',
        role: data.drives[0]?.role || 'Software Engineer',
        appliedDate: new Date().toISOString().slice(0, 10),
        status: 'Applied',
        email: '',
        phone: '',
        resumeUrl: 'Resume.pdf',
        currentRound: 'Aptitude Test',
      })
    } else if (type === 'interview') {
      setActiveItem({
        id: `INT-${Date.now().toString().slice(-4)}`,
        candidateName: '',
        rollNo: '',
        branch: 'CSE',
        company: data.companies[0]?.name || 'Microsoft',
        role: 'Software Development Engineer',
        roundType: 'Technical Round 1',
        start: new Date().toISOString().slice(0, 16),
        end: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        venue: 'Placement Cell Lab 1 & G-Meet',
        interviewer: '',
        meetLink: 'https://meet.google.com/new',
        status: 'Scheduled',
        feedback: '',
      })
    } else if (type === 'offer') {
      setActiveItem({
        id: `OFR-${Date.now().toString().slice(-4)}`,
        studentName: '',
        rollNo: '',
        branch: 'CSE',
        company: data.companies[0]?.name || 'Amazon',
        role: 'Software Development Engineer',
        ctc: '₹ 14.0 LPA',
        ctcNum: 14.0,
        offerDate: new Date().toISOString().slice(0, 10),
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        offerLetterRef: `OFF-${Date.now().toString().slice(-6)}`,
        status: 'Pending',
        location: 'Hyderabad',
      })
    }
  }

  const openEditModal = (item, type) => {
    setModalType(type)
    setModalMode('edit')
    setActiveItem({ ...item })
  }

  const handleSaveModal = (e) => {
    e.preventDefault()
    if (!activeItem) return

    if (modalType === 'drive') {
      setData(prev => {
        const exists = prev.drives.some(d => d.id === activeItem.id)
        return {
          ...prev,
          drives: exists
            ? prev.drives.map(d => d.id === activeItem.id ? activeItem : d)
            : [activeItem, ...prev.drives],
        }
      })
      setNotice(`Recruitment drive "${activeItem.title}" saved successfully.`)
    } else if (modalType === 'company') {
      setData(prev => {
        const exists = prev.companies.some(c => c.id === activeItem.id)
        return {
          ...prev,
          companies: exists
            ? prev.companies.map(c => c.id === activeItem.id ? activeItem : c)
            : [activeItem, ...prev.companies],
        }
      })
      setNotice(`Partner company "${activeItem.name}" updated successfully.`)
    } else if (modalType === 'application') {
      setData(prev => {
        const exists = prev.applications.some(a => a.id === activeItem.id)
        return {
          ...prev,
          applications: exists
            ? prev.applications.map(a => a.id === activeItem.id ? activeItem : a)
            : [activeItem, ...prev.applications],
        }
      })
      setNotice(`Student application for "${activeItem.studentName}" updated successfully.`)
    } else if (modalType === 'interview') {
      setData(prev => {
        const exists = prev.interviews.some(i => i.id === activeItem.id)
        return {
          ...prev,
          interviews: exists
            ? prev.interviews.map(i => i.id === activeItem.id ? activeItem : i)
            : [activeItem, ...prev.interviews],
        }
      })
      setNotice(`Interview round for "${activeItem.candidateName}" updated.`)
    } else if (modalType === 'offer') {
      setData(prev => {
        const exists = prev.offers.some(o => o.id === activeItem.id)
        return {
          ...prev,
          offers: exists
            ? prev.offers.map(o => o.id === activeItem.id ? activeItem : o)
            : [activeItem, ...prev.offers],
        }
      })
      setNotice(`Job offer for "${activeItem.studentName}" saved successfully.`)
    }

    setModalMode(null)
    setActiveItem(null)
    setTimeout(() => setNotice(''), 4000)
  }

  // Delete Handlers
  const requestDelete = (id, type, label) => {
    setDeleteTarget({ id, type, label })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const { id, type, label } = deleteTarget

    if (type === 'drive') {
      setData(prev => ({ ...prev, drives: prev.drives.filter(d => d.id !== id) }))
    } else if (type === 'company') {
      setData(prev => ({ ...prev, companies: prev.companies.filter(c => c.id !== id) }))
    } else if (type === 'application') {
      setData(prev => ({ ...prev, applications: prev.applications.filter(a => a.id !== id) }))
    } else if (type === 'interview') {
      setData(prev => ({ ...prev, interviews: prev.interviews.filter(i => i.id !== id) }))
    } else if (type === 'offer') {
      setData(prev => ({ ...prev, offers: prev.offers.filter(o => o.id !== id) }))
    }

    setDeleteTarget(null)
    setNotice(`"${label || 'Record'}" deleted successfully.`)
    setTimeout(() => setNotice(''), 4000)
  }

  // Direct status setters
  const handleSetInterviewStatus = (intId, newStatus) => {
    setData(prev => ({
      ...prev,
      interviews: prev.interviews.map(i => i.id === intId ? { ...i, status: newStatus } : i)
    }))
  }

  const markAllInterviews = (statusToSet) => {
    setData(prev => ({
      ...prev,
      interviews: prev.interviews.map(i => ({ ...i, status: statusToSet }))
    }))
    setNotice(`All interviews marked as "${statusToSet}".`)
    setTimeout(() => setNotice(''), 4000)
  }

  const handleSetOfferStatus = (offerId, newStatus) => {
    setData(prev => ({
      ...prev,
      offers: prev.offers.map(o => o.id === offerId ? { ...o, status: newStatus } : o)
    }))
  }

  const markAllOffers = (statusToSet) => {
    setData(prev => ({
      ...prev,
      offers: prev.offers.map(o => ({ ...o, status: statusToSet }))
    }))
    setNotice(`All job offers marked as "${statusToSet}".`)
    setTimeout(() => setNotice(''), 4000)
  }

  // KPI Calculations
  const totalDrives = data.drives.length
  const activeDrivesCount = data.drives.filter(d => d.status === 'Active' || d.status === 'Upcoming').length
  const totalCompaniesCount = data.companies.length
  const totalOffersCount = data.offers.length
  const acceptedOffersCount = data.offers.filter(o => o.status === 'Accepted').length

  return (
    <DashboardLayout>
      <div className="plw-workspace">
        {/* Page Header (Stats in compactSummary top-right corner) */}
        <PageHeader
          title="Campus Placements & Corporate Relations"
          subtitle="Coordinate campus recruitment drives, manage partner employers, monitor student applications & interview rounds, and record verified job offers."
          breadcrumb={[
            { label: 'Digital Campus', link: '/placement' },
            'Training & Placement Cell'
          ]}
          compactSummary={[
            { label: 'Active Drives', value: activeDrivesCount },
            { label: 'Corporate Partners', value: totalCompaniesCount },
            { label: 'Offers Recorded', value: totalOffersCount },
            { label: 'Placement Rate', value: `${data.stats.placementRate}%` },
            { label: 'Highest Package', value: data.stats.highestPackage },
          ]}
        />

        {notice && (
          <div className="campus-notice" role="status">
            <FiCheckCircle style={{ color: 'var(--brand)' }} />
            <span>{notice}</span>
          </div>
        )}

        {/* Segmented Sub-navigation Tabs with Badge Counts */}
        <div className="plw-top-bar">
          <nav className="plw-nav" aria-label="Placement workspace views">
            <button
              type="button"
              className={activeTab === 'drives' ? 'active' : ''}
              onClick={() => handleSwitchTab('drives')}
            >
              <FiBriefcase />
              <span>Drives</span>
              <span className="plw-badge-count">{data.drives.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'companies' ? 'active' : ''}
              onClick={() => handleSwitchTab('companies')}
            >
              <FiGlobe />
              <span>Companies</span>
              <span className="plw-badge-count">{data.companies.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'applications' ? 'active' : ''}
              onClick={() => handleSwitchTab('applications')}
            >
              <FiUsers />
              <span>Applications</span>
              <span className="plw-badge-count">{data.applications.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'interviews' ? 'active' : ''}
              onClick={() => handleSwitchTab('interviews')}
            >
              <FiClock />
              <span>Interviews</span>
              <span className="plw-badge-count">{data.interviews.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'offers' ? 'active' : ''}
              onClick={() => handleSwitchTab('offers')}
            >
              <FiAward />
              <span>Job Offers</span>
              <span className="plw-badge-count">{data.offers.length}</span>
            </button>

            <button
              type="button"
              className={activeTab === 'reports' ? 'active' : ''}
              onClick={() => handleSwitchTab('reports')}
            >
              <FiTrendingUp />
              <span>Analytics</span>
            </button>
          </nav>

          <div className="plw-actions">
            {activeTab === 'drives' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('drive')}
              >
                <FiPlus /> Schedule Recruitment Drive
              </button>
            )}

            {activeTab === 'companies' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('company')}
              >
                <FiPlus /> Add Partner Company
              </button>
            )}

            {activeTab === 'applications' && (
              <button
                type="button"
                className="grm-button grm-button--primary"
                onClick={() => openCreateModal('application')}
              >
                <FiPlus /> New Student Application
              </button>
            )}

            {activeTab === 'interviews' && (
              <>
                <button
                  type="button"
                  className="grm-button grm-button--secondary"
                  onClick={() => markAllInterviews('Cleared')}
                  title="Mark all participants as Cleared"
                >
                  ✓ Mark All Cleared
                </button>
                <button
                  type="button"
                  className="grm-button grm-button--primary"
                  onClick={() => openCreateModal('interview')}
                >
                  <FiPlus /> Schedule Interview
                </button>
              </>
            )}

            {activeTab === 'offers' && (
              <>
                <button
                  type="button"
                  className="grm-button grm-button--secondary"
                  onClick={() => markAllOffers('Accepted')}
                  title="Mark all candidates as Accepted"
                >
                  ✓ Mark All Accepted
                </button>
                <button
                  type="button"
                  className="grm-button grm-button--primary"
                  onClick={() => openCreateModal('offer')}
                >
                  <FiPlus /> Record Job Offer
                </button>
              </>
            )}

            {/* Standard ERP ExportMenu component with CSV and Print / PDF options */}
            {activeTab !== 'reports' && (
              <ExportMenu
                rows={filteredList}
                columns={currentExportColumns}
                filename={`placement_${activeTab}`}
                title={`Campus Placements - ${activeTab.toUpperCase()}`}
              />
            )}
          </div>
        </div>

        {/* Collapsible FilterPanel with Filters toggle button (Standard ERP) */}
        {activeTab !== 'reports' && (
          <FilterPanel
            active={hasActiveFilters}
            onClear={handleClearFilters}
            className="plw-filter-panel"
            actions={
              <div className="plw-toolbar-right">
                {activeTab === 'drives' && (
                  <div className="plw-view-switch">
                    <button
                      type="button"
                      className={viewMode === 'grid' ? 'active' : ''}
                      onClick={() => setViewMode('grid')}
                      title="Card Grid View"
                      aria-label="Card Grid View"
                    >
                      <FiGrid />
                    </button>
                    <button
                      type="button"
                      className={viewMode === 'table' ? 'active' : ''}
                      onClick={() => setViewMode('table')}
                      title="Table View"
                      aria-label="Table View"
                    >
                      <FiList />
                    </button>
                  </div>
                )}

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Rows:
                  <select
                    className="plw-filter-select"
                    style={{ minWidth: '60px', height: '34px', padding: '0 6px' }}
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>

                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {filteredList.length > 0
                    ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredList.length)} of ${filteredList.length} shown`
                    : '0 records'}
                </span>
              </div>
            }
          >
            <div className="course-toolbar">
              <label className="course-search">
                <FiSearch />
                <input
                  type="search"
                  placeholder={
                    activeTab === 'drives' ? 'Search drive title, company or role...' :
                    activeTab === 'companies' ? 'Search company name, industry, HR contact...' :
                    activeTab === 'applications' ? 'Search student name, roll no, company...' :
                    activeTab === 'interviews' ? 'Search candidate name, roll no, company...' :
                    'Search student name, roll no, company or offer ref...'
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  aria-label="Search"
                />
              </label>

              {/* Status Filter */}
              <select
                className="plw-filter-select"
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">All Statuses</option>
                {activeTab === 'drives' && (
                  <>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </>
                )}
                {activeTab === 'companies' && (
                  <>
                    <option value="Active Partner">Active Partner</option>
                    <option value="Prospective">Prospective</option>
                  </>
                )}
                {activeTab === 'applications' && (
                  <>
                    <option value="Applied">Applied</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
                {activeTab === 'interviews' && (
                  <>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Eliminated">Eliminated</option>
                  </>
                )}
                {activeTab === 'offers' && (
                  <>
                    <option value="Accepted">Accepted</option>
                    <option value="Pending">Pending</option>
                    <option value="Declined">Declined</option>
                  </>
                )}
              </select>

              {/* Tier Filter for Drives and Companies */}
              {(activeTab === 'drives' || activeTab === 'companies') && (
                <select
                  className="plw-filter-select"
                  aria-label="Filter by Tier"
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="ALL">All Tiers</option>
                  <option value="Super Dream">Super Dream (&gt; 15 LPA)</option>
                  <option value="Dream">Dream (8 - 15 LPA)</option>
                  <option value="Core">Core / Standard (4 - 8 LPA)</option>
                </select>
              )}

              {/* Branch Filter for Applications, Interviews, Offers */}
              {(activeTab === 'applications' || activeTab === 'interviews' || activeTab === 'offers') && (
                <select
                  className="plw-filter-select"
                  aria-label="Filter by Branch"
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="ALL">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="EEE">EEE</option>
                </select>
              )}
            </div>
          </FilterPanel>
        )}

        {/* TAB 1: Recruitment Drives */}
        {activeTab === 'drives' && (
          viewMode === 'grid' ? (
            <>
              <div className="plw-card-grid">
                {paginatedList.map(drive => (
                  <div key={drive.id} className="plw-card">
                    <div className="plw-card-header">
                      <div className="plw-card-company-group">
                        <div className="plw-company-avatar">
                          {drive.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="plw-card-title-group">
                          <h4 className="plw-card-title">{drive.company}</h4>
                          <p className="plw-card-role">{drive.role}</p>
                        </div>
                      </div>
                      <span className={`plw-tier-chip plw-tier--${drive.tier.toLowerCase().replace(' ', '-')}`}>
                        {drive.tier}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span className="plw-ctc-pill">
                        <FiDollarSign /> {drive.ctc}
                      </span>
                      <span className={`plw-status-chip plw-status--${drive.status.toLowerCase()}`}>
                        {drive.status}
                      </span>
                    </div>

                    <div className="plw-card-details">
                      <div className="plw-card-detail-item">
                        <FiCalendar />
                        <span>Drive Date: <strong>{drive.driveDate}</strong></span>
                      </div>
                      <div className="plw-card-detail-item">
                        <FiClock />
                        <span>Deadline: <strong>{drive.deadline}</strong></span>
                      </div>
                      <div className="plw-card-detail-item">
                        <FiMapPin />
                        <span>Venue: {drive.venue}</span>
                      </div>
                      <div className="plw-card-detail-item">
                        <FiCheckSquare />
                        <span title={drive.eligibility}>Eligibility: {drive.eligibility}</span>
                      </div>
                    </div>

                    {/* Funnel conversion stats */}
                    <div className="plw-funnel-bar">
                      <div className="plw-funnel-labels">
                        <span>Applicants: <strong>{drive.applicantsCount}</strong></span>
                        <span>Shortlisted: <strong>{drive.shortlistedCount}</strong></span>
                        <span>Selected: <strong style={{ color: '#047857' }}>{drive.selectedCount}</strong></span>
                      </div>
                    </div>

                    <div className="plw-card-footer">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {drive.id}</span>
                      <div className="plw-card-actions">
                        <button
                          type="button"
                          className="plw-btn-icon plw-btn-icon--edit action-edit"
                          onClick={() => openEditModal(drive, 'drive')}
                          title="Edit Recruitment Drive"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="plw-btn-icon plw-btn-icon--danger action-delete"
                          onClick={() => requestDelete(drive.id, 'drive', `${drive.company} - ${drive.role}`)}
                          title="Remove Recruitment Drive"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!filteredList.length && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <FiBriefcase style={{ fontSize: '32px', marginBottom: '8px' }} />
                    <p>No recruitment drives matching current filters.</p>
                  </div>
                )}
              </div>

              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <>
              <div className="plw-table-wrap">
                <table className="plw-table">
                  <thead>
                    <tr>
                      <th>Company & Drive</th>
                      <th>Tier & Role</th>
                      <th>CTC Package</th>
                      <th>Drive Date</th>
                      <th>Deadline</th>
                      <th>Applicants / Shortlisted / Selected</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(drive => (
                      <tr key={drive.id}>
                        <td>
                          <strong>{drive.company}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{drive.title}</div>
                        </td>
                        <td>
                          <div><strong>{drive.role}</strong></div>
                          <span className={`plw-tier-chip plw-tier--${drive.tier.toLowerCase().replace(' ', '-')}`}>
                            {drive.tier}
                          </span>
                        </td>
                        <td>
                          <span className="plw-ctc-pill">{drive.ctc}</span>
                        </td>
                        <td>{drive.driveDate}</td>
                        <td>{drive.deadline}</td>
                        <td>
                          <div style={{ fontSize: '12px' }}>
                            <span>App: <strong>{drive.applicantsCount}</strong></span> ·{' '}
                            <span>Shortlist: <strong>{drive.shortlistedCount}</strong></span> ·{' '}
                            <span style={{ color: '#047857' }}>Select: <strong>{drive.selectedCount}</strong></span>
                          </div>
                        </td>
                        <td>
                          <span className={`plw-status-chip plw-status--${drive.status.toLowerCase()}`}>
                            {drive.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="plw-btn-icon plw-btn-icon--edit action-edit"
                              onClick={() => openEditModal(drive, 'drive')}
                              title="Edit Drive"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="plw-btn-icon plw-btn-icon--danger action-delete"
                              onClick={() => requestDelete(drive.id, 'drive', `${drive.company} - ${drive.role}`)}
                              title="Remove Drive"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredList.length && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                          No recruitment drives matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredList.length > 0 && (
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )
        )}

        {/* TAB 2: Partner Companies */}
        {activeTab === 'companies' && (
          <>
            <div className="plw-table-wrap">
              <table className="plw-table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Industry Domain</th>
                    <th>Hiring Tier</th>
                    <th>HR Contact Person</th>
                    <th>Contact Email / Phone</th>
                    <th>Past Hires</th>
                    <th>Avg Package</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(comp => (
                    <tr key={comp.id}>
                      <td>
                        <strong>{comp.name}</strong>
                        {comp.website && (
                          <div style={{ fontSize: '11px' }}>
                            <a href={comp.website} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              Visit Website <FiExternalLink style={{ fontSize: '10px' }} />
                            </a>
                          </div>
                        )}
                      </td>
                      <td>{comp.industry}</td>
                      <td>
                        <span className={`plw-tier-chip plw-tier--${comp.tier.toLowerCase().replace(' ', '-')}`}>
                          {comp.tier}
                        </span>
                      </td>
                      <td>
                        <div><strong>{comp.contactPerson}</strong></div>
                        <small style={{ color: 'var(--text-muted)' }}>{comp.hq}</small>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}><FiMail style={{ verticalAlign: 'middle', marginRight: '4px' }} />{comp.contactEmail}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}><FiPhone style={{ verticalAlign: 'middle', marginRight: '4px' }} />{comp.contactPhone}</div>
                      </td>
                      <td>
                        <strong>{comp.pastHires}</strong> hires
                      </td>
                      <td>
                        <span className="plw-ctc-pill">{comp.avgPackage}</span>
                      </td>
                      <td>
                        <span className="plw-status-chip plw-status--active">
                          {comp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--edit action-edit"
                            onClick={() => openEditModal(comp, 'company')}
                            title="Edit Company Details"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--danger action-delete"
                            onClick={() => requestDelete(comp.id, 'company', comp.name)}
                            title="Remove Company"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No partner companies found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

        {/* TAB 3: Student Applications */}
        {activeTab === 'applications' && (
          <>
            <div className="plw-table-wrap">
              <table className="plw-table">
                <thead>
                  <tr>
                    <th>Student Name & Roll No</th>
                    <th>Branch</th>
                    <th>CGPA</th>
                    <th>Company & Role</th>
                    <th>Applied Date</th>
                    <th>Current Round</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(app => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.studentName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{app.rollNo}</div>
                      </td>
                      <td><span className="campus-badge">{app.branch}</span></td>
                      <td><strong>{app.cgpa}</strong></td>
                      <td>
                        <div><strong>{app.company}</strong></div>
                        <small style={{ color: 'var(--text-secondary)' }}>{app.role}</small>
                      </td>
                      <td>{app.appliedDate}</td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af' }}>{app.currentRound}</span>
                      </td>
                      <td>
                        <span className={`plw-status-chip plw-status--${app.status.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--edit action-edit"
                            onClick={() => openEditModal(app, 'application')}
                            title="Edit Application Status"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--danger action-delete"
                            onClick={() => requestDelete(app.id, 'application', `${app.studentName} - ${app.company}`)}
                            title="Remove Application"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No student applications matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

        {/* TAB 4: Interviews & Assessments */}
        {activeTab === 'interviews' && (
          <>
            <div className="plw-table-wrap">
              <table className="plw-table">
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Company & Role</th>
                    <th>Assessment Round</th>
                    <th>Schedule Window</th>
                    <th>Venue / Meeting Link</th>
                    <th>Interviewer</th>
                    <th className="plw-th-status">Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(intw => (
                    <tr key={intw.id}>
                      <td>
                        <strong>{intw.candidateName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{intw.rollNo} ({intw.branch})</div>
                      </td>
                      <td>
                        <div><strong>{intw.company}</strong></div>
                        <small style={{ color: 'var(--text-secondary)' }}>{intw.role}</small>
                      </td>
                      <td>
                        <span className="campus-badge" style={{ fontWeight: '600' }}>{intw.roundType}</span>
                      </td>
                      <td>
                        <div>{new Date(intw.start).toLocaleDateString()}</div>
                        <small style={{ color: 'var(--text-secondary)' }}>
                          {new Date(intw.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(intw.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>{intw.venue}</div>
                        {intw.meetLink && intw.meetLink !== '—' && (
                          <a href={intw.meetLink} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--brand)' }}>
                            Join Call <FiExternalLink style={{ fontSize: '10px' }} />
                          </a>
                        )}
                      </td>
                      <td>{intw.interviewer || 'TBA'}</td>
                      <td className="plw-td-status">
                        <div className="plw-status-radio-group" role="radiogroup" aria-label={`Status for ${intw.candidateName}`}>
                          {['Scheduled', 'Cleared', 'Eliminated'].map((option) => (
                            <label
                              key={option}
                              className={`plw-radio-chip plw-radio-chip--${option.toLowerCase()} ${intw.status === option ? 'is-selected' : ''}`}
                              title={`Mark as ${option}`}
                            >
                              <input
                                type="radio"
                                name={`interview-status-${intw.id}`}
                                value={option}
                                checked={intw.status === option}
                                onChange={() => handleSetInterviewStatus(intw.id, option)}
                              />
                              <span className="plw-radio-circle" />
                              <span className="plw-radio-text">{option}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--edit action-edit"
                            onClick={() => openEditModal(intw, 'interview')}
                            title="Edit Interview"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--danger action-delete"
                            onClick={() => requestDelete(intw.id, 'interview', `${intw.candidateName} (${intw.roundType})`)}
                            title="Remove Round"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No interview rounds matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

        {/* TAB 5: Job Offers & Placements */}
        {activeTab === 'offers' && (
          <>
            <div className="plw-table-wrap">
              <table className="plw-table">
                <thead>
                  <tr>
                    <th>Student Name & Roll No</th>
                    <th>Branch</th>
                    <th>Recruiter Company</th>
                    <th>Offered Role</th>
                    <th>CTC Package</th>
                    <th>Offer Date & Deadline</th>
                    <th>Offer Letter Ref</th>
                    <th className="plw-th-status">Offer Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map(off => (
                    <tr key={off.id}>
                      <td>
                        <strong>{off.studentName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{off.rollNo}</div>
                      </td>
                      <td><span className="campus-badge">{off.branch}</span></td>
                      <td><strong>{off.company}</strong></td>
                      <td>{off.role}</td>
                      <td>
                        <span className="plw-ctc-pill">{off.ctc}</span>
                      </td>
                      <td>
                        <div>Issued: {off.offerDate}</div>
                        <small style={{ color: 'var(--text-muted)' }}>Accept by: {off.deadline}</small>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', background: 'var(--surface-soft)', padding: '2px 5px', borderRadius: '4px' }}>
                          {off.offerLetterRef}
                        </code>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{off.location}</div>
                      </td>
                      <td className="plw-td-status">
                        <div className="plw-status-radio-group" role="radiogroup" aria-label={`Offer status for ${off.studentName}`}>
                          {['Accepted', 'Pending', 'Declined'].map((option) => (
                            <label
                              key={option}
                              className={`plw-radio-chip plw-radio-chip--${option.toLowerCase()} ${off.status === option ? 'is-selected' : ''}`}
                              title={`Mark as ${option}`}
                            >
                              <input
                                type="radio"
                                name={`offer-status-${off.id}`}
                                value={option}
                                checked={off.status === option}
                                onChange={() => handleSetOfferStatus(off.id, option)}
                              />
                              <span className="plw-radio-circle" />
                              <span className="plw-radio-text">{option}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="plw-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--edit action-edit"
                            onClick={() => openEditModal(off, 'offer')}
                            title="Edit Job Offer"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="plw-btn-icon plw-btn-icon--danger action-delete"
                            onClick={() => requestDelete(off.id, 'offer', `${off.studentName} - ${off.company}`)}
                            title="Remove Offer"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredList.length && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No job offers found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredList.length > 0 && (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

        {/* TAB 6: Placement Analytics & Insights */}
        {activeTab === 'reports' && (
          <div className="plw-analytics-grid">
            <div className="plw-panel">
              <div className="plw-panel-header">
                <div>
                  <h3>Branch-wise Placement Performance</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Eligible student cohort vs verified job offers</small>
                </div>
                <span className="campus-badge" style={{ fontWeight: '700' }}>Overall: {data.stats.placementRate}% Placed</span>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {data.stats.branchStats.map(bs => (
                  <div key={bs.branch} style={{ display: 'grid', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span>
                        <strong>{bs.branch} Engineering</strong> ({bs.placed}/{bs.eligible} students)
                      </span>
                      <span>
                        Avg: <strong>{bs.avg}</strong> · Highest: <strong style={{ color: '#047857' }}>{bs.highest}</strong> · <strong>{bs.rate}%</strong>
                      </span>
                    </div>
                    <div className="plw-branch-bar">
                      <div className="plw-progress-track">
                        <div className="plw-progress-fill" style={{ width: `${bs.rate}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="plw-panel">
              <div className="plw-panel-header">
                <h3>CTC Package Tier Distribution</h3>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {data.stats.tierBreakdown.map(tb => (
                  <div key={tb.tier} className="plw-tier-item">
                    <div className="plw-tier-header">
                      <span>{tb.tier}</span>
                      <strong>{tb.offers} offers ({tb.percentage}%)</strong>
                    </div>
                    <div className="plw-tier-bar">
                      <div className="plw-tier-progress" style={{ width: `${tb.percentage}%`, background: tb.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
                <strong>Median Compensation:</strong> {data.stats.medianPackage} · <strong>Multiple Offers:</strong> 69 students hold &gt;1 offer.
              </div>
            </div>
          </div>
        )}

        {/* Modal Dialog for Create/Edit */}
        {modalMode && activeItem && (
          <div className="plw-modal-backdrop" onClick={() => setModalMode(null)}>
            <div className="plw-modal" onClick={(e) => e.stopPropagation()}>
              <div className="plw-modal-header">
                <h3>
                  {modalMode === 'create' ? 'Schedule New' : 'Edit'}{' '}
                  {modalType === 'drive' ? 'Recruitment Drive' :
                   modalType === 'company' ? 'Partner Company' :
                   modalType === 'application' ? 'Student Application' :
                   modalType === 'interview' ? 'Interview Round' : 'Job Offer'}
                </h3>
                <button
                  type="button"
                  className="plw-modal-close"
                  onClick={() => setModalMode(null)}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSaveModal}>
                <div className="plw-modal-body">
                  {/* DRIVE FORM */}
                  {modalType === 'drive' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Drive Title *
                          <input
                            required
                            type="text"
                            value={activeItem.title}
                            onChange={e => setActiveItem({ ...activeItem, title: e.target.value })}
                            placeholder="e.g. Microsoft Campus Hiring 2026-27"
                          />
                        </label>
                        <label className="plw-form-field">
                          Company Name *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                            placeholder="e.g. Microsoft India"
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Role Title *
                          <input
                            required
                            type="text"
                            value={activeItem.role}
                            onChange={e => setActiveItem({ ...activeItem, role: e.target.value })}
                            placeholder="e.g. Software Engineer - Cloud & AI"
                          />
                        </label>
                        <label className="plw-form-field">
                          Hiring Tier *
                          <select
                            value={activeItem.tier}
                            onChange={e => setActiveItem({ ...activeItem, tier: e.target.value })}
                          >
                            <option value="Super Dream">Super Dream (&gt; 15 LPA)</option>
                            <option value="Dream">Dream (8 - 15 LPA)</option>
                            <option value="Core">Core (4 - 8 LPA)</option>
                          </select>
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          CTC Package (LPA) *
                          <input
                            required
                            type="text"
                            value={activeItem.ctc}
                            onChange={e => setActiveItem({ ...activeItem, ctc: e.target.value })}
                            placeholder="e.g. ₹ 44.0 LPA"
                          />
                        </label>
                        <label className="plw-form-field">
                          Drive Date *
                          <input
                            required
                            type="date"
                            value={activeItem.driveDate}
                            onChange={e => setActiveItem({ ...activeItem, driveDate: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Application Deadline *
                          <input
                            required
                            type="date"
                            value={activeItem.deadline}
                            onChange={e => setActiveItem({ ...activeItem, deadline: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Drive Status *
                          <select
                            value={activeItem.status}
                            onChange={e => setActiveItem({ ...activeItem, status: e.target.value })}
                          >
                            <option value="Upcoming">Upcoming</option>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </label>
                      </div>

                      <label className="plw-form-field">
                        Venue / Mode
                        <input
                          type="text"
                          value={activeItem.venue}
                          onChange={e => setActiveItem({ ...activeItem, venue: e.target.value })}
                          placeholder="e.g. Virtual Assessment & Campus Auditorium"
                        />
                      </label>

                      <label className="plw-form-field">
                        Eligibility Criteria
                        <textarea
                          rows={2}
                          value={activeItem.eligibility}
                          onChange={e => setActiveItem({ ...activeItem, eligibility: e.target.value })}
                          placeholder="e.g. B.Tech CSE, IT, ECE · Min 8.0 CGPA · No active backlogs"
                        />
                      </label>
                    </>
                  )}

                  {/* COMPANY FORM */}
                  {modalType === 'company' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Company Name *
                          <input
                            required
                            type="text"
                            value={activeItem.name}
                            onChange={e => setActiveItem({ ...activeItem, name: e.target.value })}
                            placeholder="e.g. Google India"
                          />
                        </label>
                        <label className="plw-form-field">
                          Industry Domain *
                          <input
                            required
                            type="text"
                            value={activeItem.industry}
                            onChange={e => setActiveItem({ ...activeItem, industry: e.target.value })}
                            placeholder="e.g. Cloud & AI / Fintech"
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Tier *
                          <select
                            value={activeItem.tier}
                            onChange={e => setActiveItem({ ...activeItem, tier: e.target.value })}
                          >
                            <option value="Super Dream">Super Dream</option>
                            <option value="Dream">Dream</option>
                            <option value="Core">Core</option>
                          </select>
                        </label>
                        <label className="plw-form-field">
                          Average Package (LPA)
                          <input
                            type="text"
                            value={activeItem.avgPackage}
                            onChange={e => setActiveItem({ ...activeItem, avgPackage: e.target.value })}
                            placeholder="e.g. ₹ 42.0 LPA"
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          HR Contact Person
                          <input
                            type="text"
                            value={activeItem.contactPerson}
                            onChange={e => setActiveItem({ ...activeItem, contactPerson: e.target.value })}
                            placeholder="e.g. Radhika Sharma"
                          />
                        </label>
                        <label className="plw-form-field">
                          Contact Email
                          <input
                            type="email"
                            value={activeItem.contactEmail}
                            onChange={e => setActiveItem({ ...activeItem, contactEmail: e.target.value })}
                            placeholder="e.g. hr@company.com"
                          />
                        </label>
                      </div>

                      <label className="plw-form-field">
                        Careers Website
                        <input
                          type="url"
                          value={activeItem.website}
                          onChange={e => setActiveItem({ ...activeItem, website: e.target.value })}
                          placeholder="https://careers.google.com"
                        />
                      </label>
                    </>
                  )}

                  {/* APPLICATION FORM */}
                  {modalType === 'application' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Student Full Name *
                          <input
                            required
                            type="text"
                            value={activeItem.studentName}
                            onChange={e => setActiveItem({ ...activeItem, studentName: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Roll Number *
                          <input
                            required
                            type="text"
                            value={activeItem.rollNo}
                            onChange={e => setActiveItem({ ...activeItem, rollNo: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Branch *
                          <select
                            value={activeItem.branch}
                            onChange={e => setActiveItem({ ...activeItem, branch: e.target.value })}
                          >
                            <option value="CSE">CSE</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                            <option value="EEE">EEE</option>
                          </select>
                        </label>
                        <label className="plw-form-field">
                          CGPA *
                          <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            value={activeItem.cgpa}
                            onChange={e => setActiveItem({ ...activeItem, cgpa: parseFloat(e.target.value) || 0 })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Recruiter Company *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Status *
                          <select
                            value={activeItem.status}
                            onChange={e => setActiveItem({ ...activeItem, status: e.target.value })}
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interviewing">Interviewing</option>
                            <option value="Selected">Selected</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </label>
                      </div>
                    </>
                  )}

                  {/* INTERVIEW FORM */}
                  {modalType === 'interview' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Candidate Name *
                          <input
                            required
                            type="text"
                            value={activeItem.candidateName}
                            onChange={e => setActiveItem({ ...activeItem, candidateName: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Roll Number *
                          <input
                            required
                            type="text"
                            value={activeItem.rollNo}
                            onChange={e => setActiveItem({ ...activeItem, rollNo: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Company *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Round Type *
                          <select
                            value={activeItem.roundType}
                            onChange={e => setActiveItem({ ...activeItem, roundType: e.target.value })}
                          >
                            <option value="Online Coding Test">Online Coding Test</option>
                            <option value="Technical Round 1">Technical Round 1</option>
                            <option value="Technical Round 2">Technical Round 2</option>
                            <option value="System Design Round">System Design Round</option>
                            <option value="Managerial Round">Managerial Round</option>
                            <option value="HR & Leadership">HR & Leadership</option>
                          </select>
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Start Date & Time *
                          <input
                            required
                            type="datetime-local"
                            value={activeItem.start}
                            onChange={e => setActiveItem({ ...activeItem, start: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          End Date & Time *
                          <input
                            required
                            type="datetime-local"
                            value={activeItem.end}
                            onChange={e => setActiveItem({ ...activeItem, end: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Venue / Link
                          <input
                            type="text"
                            value={activeItem.venue}
                            onChange={e => setActiveItem({ ...activeItem, venue: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Interviewer Name
                          <input
                            type="text"
                            value={activeItem.interviewer}
                            onChange={e => setActiveItem({ ...activeItem, interviewer: e.target.value })}
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {/* OFFER FORM */}
                  {modalType === 'offer' && (
                    <>
                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Student Name *
                          <input
                            required
                            type="text"
                            value={activeItem.studentName}
                            onChange={e => setActiveItem({ ...activeItem, studentName: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Roll Number *
                          <input
                            required
                            type="text"
                            value={activeItem.rollNo}
                            onChange={e => setActiveItem({ ...activeItem, rollNo: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Recruiter Company *
                          <input
                            required
                            type="text"
                            value={activeItem.company}
                            onChange={e => setActiveItem({ ...activeItem, company: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Job Role *
                          <input
                            required
                            type="text"
                            value={activeItem.role}
                            onChange={e => setActiveItem({ ...activeItem, role: e.target.value })}
                          />
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Offered CTC (LPA) *
                          <input
                            required
                            type="text"
                            value={activeItem.ctc}
                            onChange={e => setActiveItem({ ...activeItem, ctc: e.target.value })}
                            placeholder="e.g. ₹ 16.5 LPA"
                          />
                        </label>
                        <label className="plw-form-field">
                          Offer Status *
                          <select
                            value={activeItem.status}
                            onChange={e => setActiveItem({ ...activeItem, status: e.target.value })}
                          >
                            <option value="Accepted">Accepted</option>
                            <option value="Pending">Pending</option>
                            <option value="Declined">Declined</option>
                          </select>
                        </label>
                      </div>

                      <div className="plw-form-row">
                        <label className="plw-form-field">
                          Offer Letter Reference *
                          <input
                            required
                            type="text"
                            value={activeItem.offerLetterRef}
                            onChange={e => setActiveItem({ ...activeItem, offerLetterRef: e.target.value })}
                          />
                        </label>
                        <label className="plw-form-field">
                          Posting Location
                          <input
                            type="text"
                            value={activeItem.location}
                            onChange={e => setActiveItem({ ...activeItem, location: e.target.value })}
                            placeholder="e.g. Hyderabad"
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="plw-modal-footer">
                  <button
                    type="button"
                    className="grm-button grm-button--secondary"
                    onClick={() => setModalMode(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="grm-button grm-button--primary"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Custom Confirmation Popup Modal for Delete (NO window.confirm) */}
        {deleteTarget && (
          <div className="plw-modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="plw-modal plw-modal--sm" onClick={(e) => e.stopPropagation()}>
              <div className="plw-modal-header" style={{ borderBottomColor: '#fee2e2' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
                  <FiAlertTriangle /> Confirm Deletion
                </h3>
                <button
                  type="button"
                  className="plw-modal-close"
                  onClick={() => setDeleteTarget(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="plw-modal-body">
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                  Are you sure you want to permanently remove this record?
                </p>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
                  <strong>Record:</strong> {deleteTarget.label}
                </div>
                <small style={{ color: 'var(--text-muted)' }}>
                  This action cannot be undone. Placement stats and reports will update accordingly.
                </small>
              </div>

              <div className="plw-modal-footer">
                <button
                  type="button"
                  className="grm-button grm-button--secondary"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="grm-button"
                  style={{ background: '#dc2626', color: '#ffffff', borderColor: '#dc2626' }}
                  onClick={confirmDelete}
                >
                  <FiTrash2 /> Yes, Delete Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
