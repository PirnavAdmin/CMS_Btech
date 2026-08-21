import { useState, useEffect } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout'
import './CollegeInstitutionManagement.css'

const COLLEGE_TYPES = ['Engineering', 'Arts & Science', 'Medical', 'Management', 'Polytechnic', 'Other']

const emptyCollege = {
  id: null,
  name: '',
  code: '',
  type: COLLEGE_TYPES[0],
  university: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  contact: '',
  email: '',
  website: '',
  logo: '',
  principal: '',
  accreditation: '',
  status: 'active',
}

function validateCollege(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'College name is required.'
  if (!values.code.trim()) errors.code = 'College code is required.'
  if (!values.university.trim()) errors.university = 'University name is required.'
  if (!values.city.trim()) errors.city = 'City is required.'
  if (!values.state.trim()) errors.state = 'State is required.'
  if (!values.pincode.trim()) {
    errors.pincode = 'Pincode is required.'
  } else if (!/^\d{6}$/.test(values.pincode.trim())) {
    errors.pincode = 'Pincode must be exactly 6 digits.'
  }
  if (!values.contact.trim()) {
    errors.contact = 'Contact number is required.'
  } else if (!/^\d{10}$/.test(values.contact.trim())) {
    errors.contact = 'Contact number must be exactly 10 digits.'
  }
  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (values.website.trim() && !/^https?:\/\/.+\..+/.test(values.website.trim())) {
    errors.website = 'Enter a valid website URL (e.g. https://example.edu).'
  }
  if (!values.principal.trim()) errors.principal = "Principal's name is required."
  return errors
}

export default function CollegeInstitutionManagement() {
  const [colleges, setColleges] = useState(() => {
    try {
      const saved = localStorage.getItem('btechms_colleges')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('btechms_colleges', JSON.stringify(colleges))
  }, [colleges])

  const [viewMode, setViewMode] = useState('list') // list | add | edit | details | settings
  const [activeId, setActiveId] = useState(null)
  const [formValues, setFormValues] = useState(emptyCollege)
  const [errors, setErrors] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [settings, setSettings] = useState({
    allowMultipleColleges: false,
    defaultCollegeType: COLLEGE_TYPES[0],
  })

  const activeCollege = colleges.find((c) => c.id === activeId) || null

  const filteredColleges = colleges.filter((c) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term)
    )
  })

  const updateField = ({ target: { name, value } }) => {
    setFormValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setFormValues((current) => ({ ...current, logo: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const openAdd = () => {
    setFormValues(emptyCollege)
    setErrors({})
    setViewMode('add')
  }

  const openEdit = (college) => {
    setFormValues(college)
    setErrors({})
    setActiveId(college.id)
    setViewMode('edit')
  }

  const openDetails = (college) => {
    setActiveId(college.id)
    setViewMode('details')
  }

  const backToList = () => {
    setViewMode('list')
    setActiveId(null)
    setErrors({})
  }

  const handleSave = (e) => {
    e.preventDefault()
    const nextErrors = validateCollege(formValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (viewMode === 'edit' && activeId) {
      // TODO: replace with API call, e.g. await updateCollege(activeId, formValues)
      setColleges((current) => current.map((c) => (c.id === activeId ? { ...formValues, id: activeId } : c)))
    } else {
      // TODO: replace with API call, e.g. await createCollege(formValues)
      const newCollege = { ...formValues, id: Date.now() }
      setColleges((current) => [...current, newCollege])
    }
    backToList()
  }

  const handleDelete = (college) => {
    const confirmed = window.confirm(`Delete "${college.name}"? This cannot be undone.`)
    if (!confirmed) return
    // TODO: replace with API call, e.g. await deleteCollege(college.id)
    setColleges((current) => current.filter((c) => c.id !== college.id))
  }

  const toggleStatus = (college) => {
    setColleges((current) =>
      current.map((c) => (c.id === college.id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c))
    )
  }

  return (
    <DashboardLayout>
      <div className="college-management">
        {viewMode === 'list' && (
          <>
            <header className="cm-header">
              <div>
                <h1>College / Institution Management</h1>
                <p>Manage complete information for every college under your institution.</p>
              </div>
              <button type="button" className="cm-primary-btn" onClick={openAdd}>
                + Add College
              </button>
            </header>

            <div className="cm-toolbar">
              <input
                type="text"
                className="cm-search"
                placeholder="Search by name, code or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="button" className="cm-secondary-btn" onClick={() => setViewMode('settings')}>
                College Settings
              </button>
            </div>

            {filteredColleges.length === 0 ? (
              <div className="cm-empty">
                <p>No colleges added yet.</p>
                <button type="button" className="cm-primary-btn" onClick={openAdd}>
                  + Add your first college
                </button>
              </div>
            ) : (
              <div className="cm-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Logo</th>
                      <th>College Name</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>City</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredColleges.map((college) => (
                      <tr key={college.id}>
                        <td>
                          {college.logo ? (
                            <img src={college.logo} alt={college.name} className="cm-logo-thumb" />
                          ) : (
                            <span className="cm-logo-placeholder">{college.name.charAt(0).toUpperCase()}</span>
                          )}
                        </td>
                        <td>{college.name}</td>
                        <td>{college.code}</td>
                        <td>{college.type}</td>
                        <td>{college.city}</td>
                        <td>{college.contact}</td>
                        <td>
                          <button
                            type="button"
                            className={`cm-status-badge ${college.status}`}
                            onClick={() => toggleStatus(college)}
                          >
                            {college.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="cm-actions">
                          <button type="button" onClick={() => openDetails(college)}>View</button>
                          <button type="button" onClick={() => openEdit(college)}>Edit</button>
                          <button type="button" className="cm-danger" onClick={() => handleDelete(college)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {(viewMode === 'add' || viewMode === 'edit') && (
          <form className="cm-form" onSubmit={handleSave} noValidate>
            <header className="cm-header">
              <div>
                <h1>{viewMode === 'edit' ? 'Edit College' : 'Add College'}</h1>
                <p>Fill in the college's details below.</p>
              </div>
              <button type="button" className="cm-secondary-btn" onClick={backToList}>
                &larr; Back to list
              </button>
            </header>

            <div className="cm-form-grid">
              <label>
                <span>College Name *</span>
                <input type="text" name="name" value={formValues.name} onChange={updateField} placeholder="e.g. ABC College of Engineering" />
                {errors.name && <p className="cm-field-error">{errors.name}</p>}
              </label>

              <label>
                <span>College Code *</span>
                <input type="text" name="code" value={formValues.code} onChange={updateField} placeholder="e.g. ABCE001" />
                {errors.code && <p className="cm-field-error">{errors.code}</p>}
              </label>

              <label>
                <span>College Type *</span>
                <select name="type" value={formValues.type} onChange={updateField}>
                  {COLLEGE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>University Name *</span>
                <input type="text" name="university" value={formValues.university} onChange={updateField} placeholder="Affiliated university" />
                {errors.university && <p className="cm-field-error">{errors.university}</p>}
              </label>

              <label className="cm-span-2">
                <span>Address *</span>
                <textarea name="address" value={formValues.address} onChange={updateField} rows={2} placeholder="Street, area, landmark" />
              </label>

              <label>
                <span>City *</span>
                <input type="text" name="city" value={formValues.city} onChange={updateField} />
                {errors.city && <p className="cm-field-error">{errors.city}</p>}
              </label>

              <label>
                <span>State *</span>
                <input type="text" name="state" value={formValues.state} onChange={updateField} />
                {errors.state && <p className="cm-field-error">{errors.state}</p>}
              </label>

              <label>
                <span>Pincode *</span>
                <input type="text" name="pincode" value={formValues.pincode} onChange={updateField} maxLength={6} placeholder="6-digit pincode" />
                {errors.pincode && <p className="cm-field-error">{errors.pincode}</p>}
              </label>

              <label>
                <span>Contact Number *</span>
                <input type="text" name="contact" value={formValues.contact} onChange={updateField} maxLength={10} placeholder="10-digit mobile number" />
                {errors.contact && <p className="cm-field-error">{errors.contact}</p>}
              </label>

              <label>
                <span>Email *</span>
                <input type="text" name="email" value={formValues.email} onChange={updateField} placeholder="college@example.edu" />
                {errors.email && <p className="cm-field-error">{errors.email}</p>}
              </label>

              <label>
                <span>Website</span>
                <input type="text" name="website" value={formValues.website} onChange={updateField} placeholder="https://college.edu" />
                {errors.website && <p className="cm-field-error">{errors.website}</p>}
              </label>

              <label>
                <span>Principal Name *</span>
                <input type="text" name="principal" value={formValues.principal} onChange={updateField} />
                {errors.principal && <p className="cm-field-error">{errors.principal}</p>}
              </label>

              <label className="cm-span-2">
                <span>Accreditation Details</span>
                <textarea name="accreditation" value={formValues.accreditation} onChange={updateField} rows={2} placeholder="e.g. NAAC A+, NBA accredited programs" />
              </label>

              <label className="cm-span-2">
                <span>College Logo</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
                {formValues.logo && <img src={formValues.logo} alt="Logo preview" className="cm-logo-preview" />}
              </label>
            </div>

            <div className="cm-form-actions">
              <button type="button" className="cm-secondary-btn" onClick={backToList}>Cancel</button>
              <button type="submit" className="cm-primary-btn">{viewMode === 'edit' ? 'Save Changes' : 'Add College'}</button>
            </div>
          </form>
        )}

        {viewMode === 'details' && activeCollege && (
          <div className="cm-college-details">
            <header className="cm-header">
              <div>
                <h1>{activeCollege.name}</h1>
                <p>College Code: {activeCollege.code}</p>
              </div>
              <button type="button" className="cm-secondary-btn" onClick={backToList}>
                &larr; Back to list
              </button>
            </header>

            <div className="cm-details-card">
              {activeCollege.logo && <img src={activeCollege.logo} alt={activeCollege.name} className="cm-logo-preview" />}
              <dl className="cm-details-grid">
                <div><dt>College Type</dt><dd>{activeCollege.type}</dd></div>
                <div><dt>University Name</dt><dd>{activeCollege.university}</dd></div>
                <div><dt>Address</dt><dd>{activeCollege.address || '—'}</dd></div>
                <div><dt>City</dt><dd>{activeCollege.city}</dd></div>
                <div><dt>State</dt><dd>{activeCollege.state}</dd></div>
                <div><dt>Pincode</dt><dd>{activeCollege.pincode}</dd></div>
                <div><dt>Contact Number</dt><dd>{activeCollege.contact}</dd></div>
                <div><dt>Email</dt><dd>{activeCollege.email}</dd></div>
                <div><dt>Website</dt><dd>{activeCollege.website || '—'}</dd></div>
                <div><dt>Principal Name</dt><dd>{activeCollege.principal}</dd></div>
                <div className="cm-span-2"><dt>Accreditation Details</dt><dd>{activeCollege.accreditation || '—'}</dd></div>
              </dl>
            </div>

            <div className="cm-form-actions">
              <button type="button" className="cm-primary-btn" onClick={() => openEdit(activeCollege)}>Edit College</button>
            </div>
          </div>
        )}

        {viewMode === 'settings' && (
          <div className="cm-settings">
            <header className="cm-header">
              <div>
                <h1>College Settings</h1>
                <p>General settings for how colleges are managed.</p>
              </div>
              <button type="button" className="cm-secondary-btn" onClick={backToList}>
                &larr; Back to list
              </button>
            </header>

            <div className="cm-settings-card">
              <label className="cm-toggle-row">
                <div>
                  <strong>Support multiple colleges</strong>
                  <p>Allow this Super Admin account to manage more than one college/institution.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowMultipleColleges}
                  onChange={(e) => setSettings((current) => ({ ...current, allowMultipleColleges: e.target.checked }))}
                />
              </label>

              <label className="cm-select-row">
                <span>Default College Type</span>
                <select
                  value={settings.defaultCollegeType}
                  onChange={(e) => setSettings((current) => ({ ...current, defaultCollegeType: e.target.value }))}
                >
                  {COLLEGE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cm-form-actions">
              {/* TODO: wire up to a saveSettings() API call */}
              <button type="button" className="cm-primary-btn" onClick={backToList}>Save Settings</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
