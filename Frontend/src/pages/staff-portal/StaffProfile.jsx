import { useState } from 'react'
import {
  FiAlertTriangle,
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFileText,
  FiInfo,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { STAFF_PROFILE } from './staffSampleData.js'
import './staff-portal.css'

export default function StaffProfile() {
  // State switcher for review: 'normal' | 'loading' | 'empty' | 'error'
  const [viewState, setViewState] = useState('normal')

  // Contact Information Form Local State
  const [contact, setContact] = useState({
    mobile: STAFF_PROFILE.mobile,
    email: STAFF_PROFILE.email,
    currentAddress: STAFF_PROFILE.currentAddress,
    permanentAddress: STAFF_PROFILE.permanentAddress,
    sameAsCurrent: STAFF_PROFILE.sameAsCurrent,
    emergencyContactName: STAFF_PROFILE.emergencyContactName,
    emergencyContactRelationship: STAFF_PROFILE.emergencyContactRelationship,
    emergencyContactNumber: STAFF_PROFILE.emergencyContactNumber,
  })

  // Draft state while in edit mode
  const [draft, setDraft] = useState({ ...contact })
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [toastMessage, setToastMessage] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)

  // Document status toggle for demo/review: allows toggling Verified / Pending / Missing
  const [documents, setDocuments] = useState(STAFF_PROFILE.documents)

  const showToast = msg => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Validation function
  const validateForm = values => {
    const nextErrors = {}
    const mobilePattern = /^[6-9]\d{9}$/
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/

    // Mobile validation
    if (!values.mobile?.trim()) {
      nextErrors.mobile = 'Mobile number is required.'
    } else if (!mobilePattern.test(values.mobile.trim())) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.'
    }

    // Email validation
    if (!values.email?.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address (e.g. name@college.edu).'
    }

    // Current address validation
    if (!values.currentAddress?.trim()) {
      nextErrors.currentAddress = 'Current address is required.'
    } else if (values.currentAddress.trim().length < 10) {
      nextErrors.currentAddress = 'Please enter a complete address (min 10 characters).'
    }

    // Permanent address validation
    if (!values.sameAsCurrent) {
      if (!values.permanentAddress?.trim()) {
        nextErrors.permanentAddress = 'Permanent address is required.'
      } else if (values.permanentAddress.trim().length < 10) {
        nextErrors.permanentAddress = 'Please enter a complete address (min 10 characters).'
      }
    }

    // Emergency Contact Name
    if (!values.emergencyContactName?.trim()) {
      nextErrors.emergencyContactName = 'Emergency contact name is required.'
    } else if (values.emergencyContactName.trim().length < 2) {
      nextErrors.emergencyContactName = 'Name must be at least 2 characters.'
    }

    // Emergency Contact Relationship
    if (!values.emergencyContactRelationship?.trim()) {
      nextErrors.emergencyContactRelationship = 'Relationship is required.'
    }

    // Emergency Contact Number
    if (!values.emergencyContactNumber?.trim()) {
      nextErrors.emergencyContactNumber = 'Emergency contact number is required.'
    } else if (!mobilePattern.test(values.emergencyContactNumber.trim())) {
      nextErrors.emergencyContactNumber = 'Enter a valid 10-digit mobile number.'
    } else if (values.emergencyContactNumber.trim() === values.mobile?.trim()) {
      nextErrors.emergencyContactNumber = 'Emergency number should be different from your own mobile number.'
    }

    return nextErrors
  }

  // Handle Input Changes
  const handleChange = (field, value) => {
    setDraft(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'currentAddress' && prev.sameAsCurrent) {
        updated.permanentAddress = value
      }
      return updated
    })

    // Clear field error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Handle "Same as current" Checkbox
  const handleSameAddressToggle = checked => {
    setDraft(prev => ({
      ...prev,
      sameAsCurrent: checked,
      permanentAddress: checked ? prev.currentAddress : prev.permanentAddress,
    }))
    if (errors.permanentAddress) {
      setErrors(prev => ({ ...prev, permanentAddress: '' }))
    }
  }

  // Start Editing
  const handleStartEdit = () => {
    setDraft({ ...contact })
    setErrors({})
    setIsEditing(true)
  }

  // Cancel Editing
  const handleCancelEdit = () => {
    setDraft({ ...contact })
    setErrors({})
    setIsEditing(false)
  }

  // Save Contact Form
  const handleSaveContact = e => {
    e.preventDefault()
    const validationErrors = validateForm(draft)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      showToast('Please correct the highlighted form errors.')
      return
    }

    // Commit to local component state
    const savedData = {
      ...draft,
      permanentAddress: draft.sameAsCurrent ? draft.currentAddress : draft.permanentAddress,
    }
    setContact(savedData)
    setIsEditing(false)
    setErrors({})
    showToast('Contact information updated successfully.')
  }

  // Cycle document status for review testing (Verified -> Pending -> Missing -> Verified)
  const cycleDocStatus = docId => {
    setDocuments(prev =>
      prev.map(d => {
        if (d.id === docId) {
          const next =
            d.status === 'Verified'
              ? 'Pending'
              : d.status === 'Pending'
              ? 'Missing'
              : 'Verified'
          return { ...d, status: next }
        }
        return d
      })
    )
    showToast('Document verification status updated for preview.')
  }

  return (
    <div className="sp-page">
      {/* Page Header with Small Label and State Switcher */}
      <header className="sp-heading">
        <div>
          <p className="sp-eyebrow">DIGITAL CAMPUS / NON-TEACHING STAFF</p>
          <h1>My Profile</h1>
          <p>
            Review your employment details, manage contact and emergency information,
            and view verified credential records.
          </p>
        </div>

        {/* State Switcher Bar for Reviewer */}
        <div className="sp-state-bar" role="toolbar" aria-label="Review state toggle">
          <span className="sp-state-label">Preview State:</span>
          {['normal', 'loading', 'empty', 'error'].map(s => (
            <button
              key={s}
              type="button"
              className={`sp-state-btn ${viewState === s ? 'is-active' : ''}`}
              onClick={() => {
                setViewState(s)
                if (s === 'normal') {
                  setDraft({ ...contact })
                  setIsEditing(false)
                }
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Error State Banner */}
      {viewState === 'error' && (
        <div className="sp-error-banner" role="alert">
          <div className="sp-error-content">
            <FiAlertTriangle aria-hidden="true" />
            <div>
              <p className="sp-error-title">Unable to synchronize staff profile records</p>
              <p className="sp-error-desc">
                Could not establish secure connection to the HR record database. Displaying cached profile information.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="sp-retry-btn"
            onClick={() => {
              setViewState('normal')
              showToast('Refreshed profile data successfully.')
            }}
          >
            <FiRefreshCw /> Retry Connection
          </button>
        </div>
      )}

      {/* LOADING SKELETON STATE */}
      {viewState === 'loading' && (
        <div className="sp-dashboard" aria-busy="true" aria-label="Loading profile...">
          {/* Top Card Skeleton */}
          <div className="sp-skeleton" style={{ height: '116px', borderRadius: '14px', marginBottom: '20px' }} />

          {/* Grid Skeleton */}
          <div className="sp-profile-grid">
            <div className="sp-skeleton sp-skeleton-card" style={{ minHeight: '340px' }} />
            <div className="sp-skeleton sp-skeleton-card" style={{ minHeight: '340px' }} />
            <div className="sp-profile-full sp-skeleton sp-skeleton-card" style={{ minHeight: '180px' }} />
          </div>
        </div>
      )}

      {/* NORMAL & EMPTY STATES */}
      {viewState !== 'loading' && (
        <div className="sp-dashboard">
          {/* 1. Top Card: Avatar, Name, Lab Assistant chip, Chemistry Lab · Morning shift, Active status */}
          <section className="sp-profile-top-card">
            <div className="sp-profile-hero-left">
              <div className="sp-profile-avatar" aria-hidden="true">
                {viewState === 'empty' ? '—' : (STAFF_PROFILE.name || 'sirisha').trim().charAt(0).toUpperCase()}
              </div>

              <div className="sp-profile-hero-info">
                <div className="sp-profile-name-row">
                  <h2>{viewState === 'empty' ? 'Staff Member' : STAFF_PROFILE.name}</h2>
                  <span className="sp-chip-role">
                    {viewState === 'empty' ? 'Unassigned' : STAFF_PROFILE.designation}
                  </span>
                  <span className="sp-badge-active">
                    {viewState === 'empty' ? 'Inactive' : STAFF_PROFILE.status}
                  </span>
                </div>

                <div className="sp-profile-subline">
                  <span>
                    <FiMapPin /> {viewState === 'empty' ? 'Department not assigned' : STAFF_PROFILE.department}
                  </span>
                  <span>·</span>
                  <span>
                    <FiClock /> {viewState === 'empty' ? 'No shift scheduled' : 'Morning shift (08:30 AM – 04:30 PM)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="sp-profile-hero-right">
              <span className="sp-profile-id-chip">
                <strong>ID:</strong> {viewState === 'empty' ? '—' : STAFF_PROFILE.employeeId}
              </span>
              <span className="sp-profile-id-chip">
                <strong>Joined:</strong> {viewState === 'empty' ? '—' : STAFF_PROFILE.joiningDate}
              </span>
            </div>
          </section>

          {/* 2-Column Grid: Employment Details & Contact Information */}
          <div className="sp-profile-grid">
            {/* 2. Read-only Section: Employment Details */}
            <section className="sp-card">
              <header className="sp-card-header">
                <div>
                  <h3>
                    <FiBriefcase style={{ color: 'var(--brand)' }} /> Employment Details
                  </h3>
                  <p>Official institutional mapping & reporting structure (Read-only)</p>
                </div>
                <span className="sp-profile-id-chip">Institutional Record</span>
              </header>

              {viewState === 'empty' ? (
                <div className="sp-empty-box">
                  <FiBriefcase />
                  <h4>No Employment Details Found</h4>
                  <p>Institutional record mapping has not been assigned to this account.</p>
                </div>
              ) : (
                <>
                  <div className="sp-kv-grid">
                    <div className="sp-kv-item">
                      <span className="sp-kv-label">Employee ID</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.employeeId}</span>
                    </div>

                    <div className="sp-kv-item">
                      <span className="sp-kv-label">Designation</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.designation}</span>
                    </div>

                    <div className="sp-kv-item">
                      <span className="sp-kv-label">Department</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.department}</span>
                    </div>

                    <div className="sp-kv-item">
                      <span className="sp-kv-label">Employment Type</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.employmentType}</span>
                    </div>

                    <div className="sp-kv-item">
                      <span className="sp-kv-label">Date of Joining</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.joiningDate}</span>
                    </div>

                    <div className="sp-kv-item">
                      <span className="sp-kv-label">Assigned Shift</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.shift}</span>
                    </div>

                    <div className="sp-kv-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="sp-kv-label">Reporting Officer</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.reportingOfficer}</span>
                    </div>

                    <div className="sp-kv-item" style={{ gridColumn: '1 / -1', borderBottom: 'none' }}>
                      <span className="sp-kv-label">Educational Qualification</span>
                      <span className="sp-kv-value">{STAFF_PROFILE.qualification}</span>
                    </div>
                  </div>

                  <div className="sp-info-callout">
                    <FiInfo aria-hidden="true" />
                    <span>
                      Official employment records, designations and reporting hierarchies are
                      authoritative and can only be altered by the HR & Registrar Office.
                    </span>
                  </div>
                </>
              )}
            </section>

            {/* 3. Editable Section: Contact Information */}
            <section className="sp-card">
              <header className="sp-card-header">
                <div>
                  <h3>
                    <FiPhone style={{ color: '#0d9488' }} /> Contact Information
                  </h3>
                  <p>Personal communication details & emergency contacts</p>
                </div>

                {!isEditing && viewState !== 'empty' && (
                  <button
                    type="button"
                    className="sp-btn-secondary"
                    onClick={handleStartEdit}
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                  >
                    <FiEdit2 /> Edit Information
                  </button>
                )}
              </header>

              {viewState === 'empty' ? (
                <div className="sp-empty-box">
                  <FiPhone />
                  <h4>No Contact Information</h4>
                  <p>No address or contact details saved for this staff member.</p>
                </div>
              ) : isEditing ? (
                /* EDIT FORM */
                <form className="sp-contact-form" onSubmit={handleSaveContact} noValidate>
                  <div className="sp-form-grid">
                    {/* Mobile Number */}
                    <div className={`sp-form-group ${errors.mobile ? 'has-error' : ''}`}>
                      <label htmlFor="pf-mobile">
                        <span>Mobile Number <strong className="sp-required">*</strong></span>
                      </label>
                      <input
                        id="pf-mobile"
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit Indian mobile"
                        value={draft.mobile}
                        onChange={e => handleChange('mobile', e.target.value.replace(/\D/g, ''))}
                      />
                      {errors.mobile && <span className="sp-field-error">{errors.mobile}</span>}
                    </div>

                    {/* Email */}
                    <div className={`sp-form-group ${errors.email ? 'has-error' : ''}`}>
                      <label htmlFor="pf-email">
                        <span>Email Address <strong className="sp-required">*</strong></span>
                      </label>
                      <input
                        id="pf-email"
                        type="email"
                        placeholder="name@college.edu"
                        value={draft.email}
                        onChange={e => handleChange('email', e.target.value)}
                      />
                      {errors.email && <span className="sp-field-error">{errors.email}</span>}
                    </div>

                    {/* Current Address */}
                    <div className={`sp-form-group sp-form-full ${errors.currentAddress ? 'has-error' : ''}`}>
                      <label htmlFor="pf-cur-addr">
                        <span>Current Residential Address <strong className="sp-required">*</strong></span>
                      </label>
                      <textarea
                        id="pf-cur-addr"
                        rows={2}
                        placeholder="House/flat, street, city, state and pincode"
                        value={draft.currentAddress}
                        onChange={e => handleChange('currentAddress', e.target.value)}
                      />
                      {errors.currentAddress && (
                        <span className="sp-field-error">{errors.currentAddress}</span>
                      )}
                    </div>

                    {/* Same as Current Address Checkbox */}
                    <div className="sp-form-full">
                      <label className="sp-checkbox-row">
                        <input
                          type="checkbox"
                          checked={draft.sameAsCurrent}
                          onChange={e => handleSameAddressToggle(e.target.checked)}
                        />
                        <span>Permanent address is same as current address</span>
                      </label>
                    </div>

                    {/* Permanent Address */}
                    <div className={`sp-form-group sp-form-full ${errors.permanentAddress ? 'has-error' : ''}`}>
                      <label htmlFor="pf-perm-addr">
                        <span>Permanent Address {!draft.sameAsCurrent && <strong className="sp-required">*</strong>}</span>
                      </label>
                      <textarea
                        id="pf-perm-addr"
                        rows={2}
                        disabled={draft.sameAsCurrent}
                        placeholder={draft.sameAsCurrent ? 'Same as current residential address' : 'Permanent hometown address, state and pincode'}
                        value={draft.sameAsCurrent ? draft.currentAddress : draft.permanentAddress}
                        onChange={e => handleChange('permanentAddress', e.target.value)}
                      />
                      {errors.permanentAddress && (
                        <span className="sp-field-error">{errors.permanentAddress}</span>
                      )}
                    </div>

                    {/* Emergency Contact Name */}
                    <div className={`sp-form-group ${errors.emergencyContactName ? 'has-error' : ''}`}>
                      <label htmlFor="pf-em-name">
                        <span>Emergency Contact Person <strong className="sp-required">*</strong></span>
                      </label>
                      <input
                        id="pf-em-name"
                        type="text"
                        placeholder="Full name"
                        value={draft.emergencyContactName}
                        onChange={e => handleChange('emergencyContactName', e.target.value)}
                      />
                      {errors.emergencyContactName && (
                        <span className="sp-field-error">{errors.emergencyContactName}</span>
                      )}
                    </div>

                    {/* Emergency Contact Relationship */}
                    <div className={`sp-form-group ${errors.emergencyContactRelationship ? 'has-error' : ''}`}>
                      <label htmlFor="pf-em-rel">
                        <span>Relationship <strong className="sp-required">*</strong></span>
                      </label>
                      <select
                        id="pf-em-rel"
                        value={draft.emergencyContactRelationship}
                        onChange={e => handleChange('emergencyContactRelationship', e.target.value)}
                      >
                        <option value="">-- Choose Relationship --</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Son/Daughter">Son/Daughter</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Relative">Relative</option>
                      </select>
                      {errors.emergencyContactRelationship && (
                        <span className="sp-field-error">{errors.emergencyContactRelationship}</span>
                      )}
                    </div>

                    {/* Emergency Contact Number */}
                    <div className={`sp-form-group sp-form-full ${errors.emergencyContactNumber ? 'has-error' : ''}`}>
                      <label htmlFor="pf-em-phone">
                        <span>Emergency Contact Phone Number <strong className="sp-required">*</strong></span>
                      </label>
                      <input
                        id="pf-em-phone"
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={draft.emergencyContactNumber}
                        onChange={e => handleChange('emergencyContactNumber', e.target.value.replace(/\D/g, ''))}
                      />
                      {errors.emergencyContactNumber && (
                        <span className="sp-field-error">{errors.emergencyContactNumber}</span>
                      )}
                    </div>
                  </div>

                  {/* Form Actions: Save & Cancel */}
                  <div className="sp-contact-actions">
                    <button
                      type="button"
                      className="sp-btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="sp-btn-primary">
                      <FiCheck /> Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                /* READ-ONLY VIEW OF CONTACT INFO */
                <div className="sp-kv-grid">
                  <div className="sp-kv-item">
                    <span className="sp-kv-label">Mobile Number</span>
                    <span className="sp-kv-value">{contact.mobile || '—'}</span>
                  </div>

                  <div className="sp-kv-item">
                    <span className="sp-kv-label">Email Address</span>
                    <span className="sp-kv-value">{contact.email || '—'}</span>
                  </div>

                  <div className="sp-kv-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="sp-kv-label">Current Residential Address</span>
                    <span className="sp-kv-value">{contact.currentAddress || '—'}</span>
                  </div>

                  <div className="sp-kv-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="sp-kv-label">Permanent Address</span>
                    <span className="sp-kv-value">
                      {contact.sameAsCurrent
                        ? `${contact.currentAddress} (Same as current)`
                        : contact.permanentAddress || '—'}
                    </span>
                  </div>

                  <div className="sp-kv-item">
                    <span className="sp-kv-label">Emergency Contact Name</span>
                    <span className="sp-kv-value">
                      {contact.emergencyContactName} ({contact.emergencyContactRelationship || 'Contact'})
                    </span>
                  </div>

                  <div className="sp-kv-item">
                    <span className="sp-kv-label">Emergency Phone Number</span>
                    <span className="sp-kv-value">{contact.emergencyContactNumber || '—'}</span>
                  </div>
                </div>
              )}
            </section>

            {/* 4. Documents Summary: ID proof, appointment letter, qualification certificate with status chips */}
            <section className="sp-card sp-profile-full">
              <header className="sp-card-header">
                <div>
                  <h3>
                    <FiFileText style={{ color: '#8b5cf6' }} /> Documents Summary
                  </h3>
                  <p>Identity proof, service contracts, and verified qualification records</p>
                </div>
                <span className="sp-profile-id-chip">
                  {documents.filter(d => d.status === 'Verified').length} of {documents.length} Verified
                </span>
              </header>

              {viewState === 'empty' ? (
                <div className="sp-empty-box">
                  <FiFileText />
                  <h4>No Uploaded Documents</h4>
                  <p>No certificates or institutional proof documents have been registered.</p>
                </div>
              ) : (
                <div className="sp-doc-grid">
                  {documents.map(doc => (
                    <article key={doc.id} className="sp-doc-card">
                      <div className="sp-doc-card-top">
                        <div className="sp-doc-icon">
                          <FiFileText />
                        </div>
                        <div className="sp-doc-title-wrap">
                          <h4>{doc.name}</h4>
                          <span className="sp-doc-meta">
                            {doc.type} · {doc.fileSize}
                          </span>
                          <span className="sp-doc-meta">Uploaded: {doc.uploadDate}</span>
                        </div>
                      </div>

                      <div className="sp-doc-footer">
                        {/* Read-only Document Status Chip */}
                        <span className={`sp-doc-badge is-${doc.status.toLowerCase()}`}>
                          {doc.status === 'Verified' && <FiCheckCircle aria-hidden="true" />}
                          {doc.status === 'Pending' && <FiClock aria-hidden="true" />}
                          {doc.status === 'Missing' && <FiAlertTriangle aria-hidden="true" />}
                          <span>{doc.status}</span>
                        </span>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="sp-doc-action-btn"
                            onClick={() => setPreviewDoc(doc)}
                            title="View Document Details"
                          >
                            <FiEye /> View
                          </button>
                          <button
                            type="button"
                            className="sp-doc-action-btn"
                            onClick={() => showToast(`Simulated download: ${doc.name}.pdf`)}
                            title="Download Document"
                          >
                            <FiDownload /> Download
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <dialog className="portal-dialog" open style={{ zIndex: 9999 }}>
          <header>
            <h2>{previewDoc.name}</h2>
            <button
              type="button"
              onClick={() => setPreviewDoc(null)}
              aria-label="Close dialog"
            >
              <FiX />
            </button>
          </header>

          <div className="portal-profile" style={{ margin: '14px 0' }}>
            <div>
              <dt>Document Classification</dt>
              <dd>{previewDoc.type}</dd>
            </div>
            <div>
              <dt>Verification Status</dt>
              <dd>
                <span className={`sp-doc-badge is-${previewDoc.status.toLowerCase()}`}>
                  {previewDoc.status}
                </span>
              </dd>
            </div>
            <div>
              <dt>File Size & Format</dt>
              <dd>PDF Document · {previewDoc.fileSize}</dd>
            </div>
            <div>
              <dt>Verification Timestamp</dt>
              <dd>{previewDoc.uploadDate} (HR Verified)</dd>
            </div>
          </div>

          <div
            style={{
              padding: '24px',
              border: '1px dashed var(--border)',
              borderRadius: '8px',
              background: 'var(--surface-soft)',
              textAlign: 'center',
              margin: '12px 0 20px',
            }}
          >
            <FiFileText style={{ width: '40px', height: '40px', color: 'var(--brand)', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>
              Official College Digital Record: {previewDoc.name}
            </p>
            <small style={{ color: 'var(--text-muted)' }}>
              Digitally signed and archived in the institutional staff registry.
            </small>
          </div>

          <div className="portal-actions">
            <button
              type="button"
              onClick={() => {
                showToast(`Downloaded: ${previewDoc.name}.pdf`)
                setPreviewDoc(null)
              }}
            >
              <FiDownload /> Download PDF
            </button>
            <button type="button" className="primary" onClick={() => setPreviewDoc(null)}>
              Close
            </button>
          </div>
        </dialog>
      )}

      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className="sp-toast" role="status">
          <FiCheck />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
