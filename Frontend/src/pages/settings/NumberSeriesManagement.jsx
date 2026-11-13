import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, ArrowRight, BookOpen, BriefcaseBusiness, FileText, GraduationCap, Hash, Presentation, ReceiptText, Search } from 'lucide-react'
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import './NumberSeriesSettings.css'

const SERIES = [
  { id: 'student-admission', name: 'Student Admission Number', category: 'Students', icon: GraduationCap, description: 'Configure automatic admission numbers assigned to newly admitted students.' },
  { id: 'teaching-staff', name: 'Teaching Staff ID', category: 'Staff', icon: Presentation, description: 'Configure IDs for teaching faculty and academic staff.' },
  { id: 'non-teaching-staff', name: 'Non-Teaching Staff ID', category: 'Staff', icon: BriefcaseBusiness, description: 'Configure IDs for administrative, technical and support staff.' },
  { id: 'examination-code', name: 'Examination Code', category: 'Examinations', icon: BookOpen, description: 'Configure codes for examination schedules and assessments.' },
  { id: 'receipt-number', name: 'Receipt Number', category: 'Finance', icon: ReceiptText, description: 'Configure receipt numbers generated for fee collections.' },
  { id: 'staff-offer-letter', name: 'Staff Offer Letter Number', category: 'Documents', icon: FileText, description: 'Configure serial numbers for staff offer letters.' },
  { id: 'staff-transfer-order', name: 'Staff Transfer Order Number', category: 'Documents', icon: ArrowLeftRight, description: 'Configure serial numbers for staff transfer orders.' },
]

const DIRECTORY_SERIES = SERIES.filter(series => ['student-admission', 'teaching-staff', 'non-teaching-staff'].includes(series.id))

const contextName = (record, keys) => keys.map(key => record?.[key]).find(value => value != null && String(value).trim()) || ''

function SettingsBreadcrumbs({ current }) {
  return <nav className="ns-breadcrumbs" aria-label="Breadcrumb">
    <Link to="/settings">Global Settings</Link><span aria-hidden="true">/</span>
    {current === 'ID & Number Series' ? <span aria-current="page">{current}</span> : <><Link to="/settings/number-series">ID &amp; Number Series</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></>}
  </nav>
}

function WorkingContext() {
  const { selectedCollege, selectedAcademicYear } = useAcademic()
  const college = contextName(selectedCollege, ['name', 'collegeName', 'Name', 'CollegeName'])
  const year = contextName(selectedAcademicYear, ['name', 'academicYearName', 'yearName', 'Name', 'AcademicYearName'])
  return <p className="ns-context">Working context: <strong>{college || 'No college selected'}</strong>{year ? <> · <strong>{year}</strong></> : null}</p>
}

function SeriesDetails({ series, onClose }) {
  if (!series) return null
  return <div className="ns-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="ns-details-dialog" role="dialog" aria-modal="true" aria-labelledby="ns-details-title">
      <header><div><small>{series.category}</small><h2 id="ns-details-title">{series.name}</h2></div><button type="button" className="ns-icon-button" aria-label="Close details" onClick={onClose}>×</button></header>
      <p>{series.description}</p>
      <dl><div><dt>Configuration status</dt><dd>Unavailable from the current API</dd></div><div><dt>Next number / format preview</dt><dd>Not returned by the current API</dd></div></dl>
      <p className="ns-muted">The frontend has no supported number-series configuration endpoint for this series. No number is generated or reserved by this screen.</p>
      <footer><button type="button" className="erp-btn erp-btn--secondary" onClick={onClose}>Close</button></footer>
    </section>
  </div>
}

export function NumberSeriesManagement() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [details, setDetails] = useState(null)
  const navigate = useNavigate()
  const categories = useMemo(() => [...new Set(DIRECTORY_SERIES.map(series => series.category))], [])
  const filtered = useMemo(() => DIRECTORY_SERIES.filter(series => {
    const matchesQuery = `${series.name} ${series.description}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesCategory = category === 'all' || series.category === category
    // Status cannot be inferred from definitions; the existing API returns no series status.
    const matchesStatus = status === 'all'
    return matchesQuery && matchesCategory && matchesStatus
  }), [query, category, status])

  return <DashboardLayout><main className="configuration-workspace ns-workspace">
    <SettingsBreadcrumbs current="ID & Number Series" />
    <PageHeader title="ID & Number Series" subtitle="Configure automatic student admission numbers and staff IDs." />
    <WorkingContext />
    <section className="ns-unavailable-banner" role="status"><Hash aria-hidden="true" /><div><strong>Number-series API unavailable</strong><p>The current frontend API service does not provide series configuration, current sequence, or individual ID override operations. Existing student and staff ID generation workflows are unchanged.</p></div></section>
    <section className="ns-directory" aria-label="Number series directory">
      <div className="ns-toolbar">
        <label className="ns-search"><Search aria-hidden="true" /><span className="sr-only">Search by series name</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search series" /></label>
        <label>Category<select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Status<select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </div>
      {filtered.length ? <div className="ns-series-grid">{filtered.map(series => {
        const Icon = series.icon
        return <article className="ns-series-card" key={series.id}>
          <header><span className="ns-series-icon"><Icon aria-hidden="true" /></span><span className="ns-status ns-status-unknown">Not connected</span></header>
          <h2>{series.name}</h2>
          <div className="ns-preview"><small>Current / next example</small><strong>Not available from current API</strong></div>
          <p>{series.description}</p>
          <footer><button type="button" className="erp-btn erp-btn--primary" onClick={() => navigate(`/settings/number-series/${series.id}/edit`)}>Edit <ArrowRight aria-hidden="true" /></button><button type="button" className="erp-btn erp-btn--secondary" onClick={() => setDetails(series)}>Details</button></footer>
        </article>
      })}</div> : <div className="ns-empty" role="status"><h2>No matching number series</h2><p>{status !== 'all' ? 'The current API does not return Active or Inactive status for number series.' : 'Try a different search or category.'}</p><button className="erp-btn erp-btn--secondary" type="button" onClick={() => { setQuery(''); setCategory('all'); setStatus('all') }}>Clear filters</button></div>}
    </section>
    <Link className="erp-btn erp-btn--secondary ns-back-link" to="/settings"><ArrowLeft aria-hidden="true" /> Back to Global Settings</Link>
    <SeriesDetails series={details} onClose={() => setDetails(null)} />
  </main></DashboardLayout>
}

export function NumberSeriesEdit() {
  const { seriesId } = useParams()
  const series = SERIES.find(item => item.id === seriesId)
  if (!series) return <Navigate to="/settings/number-series" replace />
  const Icon = series.icon
  return <DashboardLayout><main className="configuration-workspace ns-workspace">
    <SettingsBreadcrumbs current={`Edit ${series.name}`} />
    <PageHeader title={`Configure ${series.name}`} subtitle="Review the supported configuration fields for this numbering series." />
    <WorkingContext />
    <section className="ns-editor-card">
      <header className="ns-editor-title"><span className="ns-series-icon"><Icon aria-hidden="true" /></span><div><h2>Configuration Form</h2><p>Modify prefix, tokens, sequence length and start number when a supported API is available.</p></div></header>
      <div className="ns-unavailable-banner" role="alert"><Hash aria-hidden="true" /><div><strong>Configuration cannot be loaded or saved</strong><p>No number-series configuration or update operation exists in the current frontend API registry. Inputs remain disabled, and no browser-only values will be presented as saved configuration.</p></div></div>
      <fieldset className="ns-form-grid" disabled>
        <label>Series Name<span><input defaultValue={series.name} readOnly disabled /></span></label>
        <label>Series Status<span><select defaultValue="" disabled><option value="">Unavailable</option></select></span></label>
        <label>Prefix<span><input defaultValue="" placeholder="Unavailable" readOnly disabled /></span></label>
        <label>Format Pattern<span><input defaultValue="" placeholder="Unavailable" readOnly disabled /></span></label>
        <label>Number Length<span><select defaultValue="" disabled><option value="">Unavailable</option></select></span></label>
        <label>Start Number<span><input type="number" defaultValue="" placeholder="Unavailable" readOnly disabled /></span></label>
        <label className="ns-form-wide">Description<span><textarea defaultValue="" placeholder="Unavailable" readOnly disabled /></span></label>
      </fieldset>
      <section className="ns-live-preview" aria-label="Live preview"><small>Live Preview (next number)</small><strong>Unavailable until a saved pattern is returned by the API</strong></section>
      <p className="ns-muted">{series.description} Automatic ID assignment in student and staff workflows remains under the backend's existing contract. Editing a series here cannot alter assigned IDs.</p>
      <footer className="ns-editor-actions"><Link className="erp-btn erp-btn--secondary" to="/settings/number-series">Cancel</Link><button type="button" className="erp-btn erp-btn--secondary" disabled>Reset Changes</button><button type="button" className="erp-btn erp-btn--primary" disabled>Save Configuration</button></footer>
    </section>
    <Link className="erp-btn erp-btn--secondary ns-back-link" to="/settings/number-series"><ArrowLeft aria-hidden="true" /> Back to Number Series</Link>
  </main></DashboardLayout>
}

