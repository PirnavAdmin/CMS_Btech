import { FiAlertCircle, FiCheckCircle, FiClock, FiFileText, FiSearch, FiShield, FiUploadCloud } from 'react-icons/fi'
import './staff-documents.css'

const summaries = [
  ['Required documents', '—', FiFileText],
  ['Uploaded', '—', FiUploadCloud],
  ['Verified', '—', FiCheckCircle],
  ['Pending review', '—', FiClock],
  ['Rejected', '—', FiAlertCircle],
  ['Missing', '—', FiShield],
]

const columns = ['Document name', 'Category', 'Required', 'Uploaded file', 'Upload date', 'Expiry date', 'Verification status', 'Remarks', 'Actions']

export default function StaffDocuments() {
  return (
    <main className="sp-page sd-page">
      <header className="sp-heading sd-heading">
        <div>
          <p className="sp-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>My Documents</h1>
          <p>Manage your employment records, certificates, identity documents, and other required files.</p>
        </div>
        <button className="sp-btn-primary sd-upload-button" type="button" disabled aria-describedby="sd-upload-help">
          <FiUploadCloud aria-hidden="true" /> Upload Document
        </button>
      </header>

      <section className="sd-service-notice" role="status" aria-labelledby="sd-service-title">
        <span className="sd-notice-icon"><FiAlertCircle aria-hidden="true" /></span>
        <div>
          <h2 id="sd-service-title">Staff document service is not connected</h2>
          <p>
            The current backend has document storage for faculty and students, but no staff-owned document
            checklist, upload, or secure download API. This page will not show sample records or send staff
            documents through the faculty API.
          </p>
          <p className="sd-service-next-step">Ask your administrator to configure the staff document checklist and enable the staff document service.</p>
        </div>
      </section>

      <section className="sd-summary-grid" aria-label="Document summary">
        {summaries.map(([label, value, Icon]) => (
          <article className="sd-summary-card" key={label}>
            <span className="sd-summary-icon"><Icon aria-hidden="true" /></span>
            <div><span>{label}</span><strong aria-label={`${label}: unavailable`}>{value}</strong></div>
          </article>
        ))}
      </section>

      <section className="sd-progress-card" aria-label="Document completion">
        <div>
          <div><h2>Document completion</h2><span className="sd-unavailable-pill">Unavailable</span></div>
          <p>Completion will be calculated from the institution’s mandatory checklist once it is connected.</p>
        </div>
        <strong className="sd-progress-value" aria-label="Completion percentage unavailable">—%</strong>
        <div className="sd-progress-track" aria-hidden="true"><span /></div>
      </section>

      <section className="sd-documents-card" aria-labelledby="sd-checklist-title">
        <header className="sd-card-heading">
          <div>
            <p className="sp-eyebrow">PERSONAL REPOSITORY</p>
            <h2 id="sd-checklist-title">Document checklist</h2>
            <p>Only documents assigned to your staff account should appear here.</p>
          </div>
          <span className="sd-private-label"><FiShield aria-hidden="true" /> Private to your account</span>
        </header>

        <div className="sd-toolbar">
          <label className="sd-search">
            <FiSearch aria-hidden="true" />
            <input type="search" placeholder="Search documents" aria-label="Search documents" disabled />
          </label>
          <label className="sd-filter-label">Category
            <select aria-label="Filter by category" disabled><option>All categories</option></select>
          </label>
          <label className="sd-filter-label">Status
            <select aria-label="Filter by verification status" disabled><option>All statuses</option></select>
          </label>
          <button type="button" className="sd-clear-button" disabled>Clear filters</button>
        </div>

        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
            <tbody>
              <tr><td colSpan={columns.length}>
                <div className="sd-empty-state">
                  <span><FiFileText aria-hidden="true" /></span>
                  <h3>No configured checklist is available</h3>
                  <p id="sd-upload-help">Documents, upload actions, and verification details will appear after HR connects the staff checklist and secure document service.</p>
                </div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
