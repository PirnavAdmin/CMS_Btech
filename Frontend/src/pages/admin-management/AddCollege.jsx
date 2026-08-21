import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import './AddCollege.css'

const TYPES = ['Engineering College', 'University', 'Autonomous College', 'Affiliated College', 'Deemed University', 'Other']
const ACCREDITATION_STATUSES = ['Accredited', 'Not Accredited', 'Under Review', 'Expired']
const FORM_TABS = [
  { id: 'college', label: 'College Information' },
  { id: 'address', label: 'Address' },
  { id: 'contact', label: 'Contact Information' },
  { id: 'administration', label: 'Administration' },
  { id: 'accreditation', label: 'Accreditation Details' },
]
const TAB_FIELDS = {
  college: ['collegeName', 'collegeCode', 'collegeType', 'universityName'],
  address: ['addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'country'],
  contact: ['contactNumber', 'alternateContactNumber', 'email', 'website'],
  administration: ['principalName', 'principalEmail', 'principalContact'],
  accreditation: ['accreditationBody', 'accreditationStatus', 'accreditationGrade', 'accreditationNumber', 'validFrom', 'validUntil'],
}
const initialValues = {
  collegeName: '', collegeCode: '', collegeType: '', universityName: '', logo: '', logoName: '',
  addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', country: 'India',
  contactNumber: '', alternateContactNumber: '', email: '', website: '',
  principalName: '', principalEmail: '', principalContact: '',
  accreditationBody: '', accreditationStatus: 'Not Accredited', accreditationGrade: '',
  accreditationNumber: '', validFrom: '', validUntil: '',
}

const phonePattern = /^[6-9]\d{9}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const codePattern = /^[A-Z0-9]{2,12}$/

function validate(values) {
  const errors = {}
  const name = values.collegeName.trim()
  if (!name) errors.collegeName = 'College name is required.'
  else if (name.length < 3 || name.length > 120) errors.collegeName = 'Use between 3 and 120 characters.'
  if (!values.collegeCode) errors.collegeCode = 'College code is required.'
  else if (!codePattern.test(values.collegeCode)) errors.collegeCode = 'Use 2–12 uppercase letters and numbers only.'
  if (!values.collegeType) errors.collegeType = 'Select a college type.'
  if (!values.universityName.trim()) errors.universityName = 'University name is required.'
  if (!values.addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required.'
  if (!values.city.trim()) errors.city = 'City is required.'
  if (!values.state.trim()) errors.state = 'State is required.'
  if (!/^\d{6}$/.test(values.pincode)) errors.pincode = 'Enter exactly 6 digits.'
  if (!values.contactNumber) errors.contactNumber = 'Official contact number is required.'
  else if (!phonePattern.test(values.contactNumber)) errors.contactNumber = 'Enter a valid 10-digit Indian mobile number.'
  if (values.alternateContactNumber && !phonePattern.test(values.alternateContactNumber)) errors.alternateContactNumber = 'Enter a valid 10-digit Indian mobile number.'
  if (!values.email.trim()) errors.email = 'Official email is required.'
  else if (!emailPattern.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (values.website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(values.website)) errors.website = 'Enter a full URL beginning with http:// or https://.'
  if (values.principalEmail && !emailPattern.test(values.principalEmail)) errors.principalEmail = 'Enter a valid email address.'
  if (values.principalContact && !phonePattern.test(values.principalContact)) errors.principalContact = 'Enter a valid 10-digit Indian mobile number.'
  if (values.validFrom && values.validUntil && values.validUntil <= values.validFrom) errors.validUntil = 'Valid until must be after valid from.'
  return errors
}

function Field({ label, name, values, errors, touched, onChange, required, maxLength, ...props }) {
  const error = touched[name] && errors[name]
  return <label className="ac-field" htmlFor={`ac-${name}`}>
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    <input id={`ac-${name}`} name={name} value={values[name]} onChange={onChange} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? `ac-${name}-error` : undefined} {...props} />
    {maxLength && <small className="ac-counter">{values[name].length}/{maxLength}</small>}
    {error && <small id={`ac-${name}-error`} className="ac-error" role="alert">{error}</small>}
  </label>
}

function Dialog({ title, children, actions, labelledBy = 'ac-dialog-title' }) {
  return <div className="ac-dialog-layer" role="presentation"><div className="ac-dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
    <h2 id={labelledBy}>{title}</h2>{children}<div className="ac-dialog-actions">{actions}</div>
  </div></div>
}

export default function AddCollege() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [logoError, setLogoError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('college')
  const [highestUnlockedTab, setHighestUnlockedTab] = useState(0)
  const errors = validate(values)
  const isValid = Object.keys(errors).length === 0 && !logoError

  useEffect(() => {
    const warn = (event) => { if (dirty) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = ({ target: { name, value } }) => {
    let next = value
    if (name === 'collegeCode') next = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (['pincode', 'contactNumber', 'alternateContactNumber', 'principalContact'].includes(name)) next = value.replace(/\D/g, '')
    setValues((current) => ({ ...current, [name]: next }))
    setTouched((current) => ({ ...current, [name]: true }))
    setDirty(true); setNotice('')
  }

  const selectLogo = (file) => {
    setLogoError('')
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setLogoError('Choose a PNG, JPG, JPEG, or WEBP image.')
    if (file.size > 5 * 1024 * 1024) return setLogoError('Logo must be 5 MB or smaller.')
    const reader = new FileReader()
    reader.onload = () => { setValues((current) => ({ ...current, logo: reader.result, logoName: file.name })); setDirty(true) }
    reader.onerror = () => setLogoError('The image could not be read. Please try another file.')
    reader.readAsDataURL(file)
  }

  const touchAll = () => setTouched(Object.keys(initialValues).reduce((all, key) => ({ ...all, [key]: true }), {}))
  const openPreview = () => { touchAll(); if (isValid) setDialog('preview') }
  const reset = () => { setValues(initialValues); setTouched({}); setLogoError(''); setDirty(false); setActiveTab('college'); setHighestUnlockedTab(0); setDialog(null); setNotice('Form reset successfully.') }
  const requestLeave = () => dirty ? setDialog('leave') : navigate('/college-institution-management')
  const saveDraft = () => { setNotice('Draft kept for this session. It has not been sent to a server.'); setDirty(false) }
  const saveAndNext = () => {
    const fields = TAB_FIELDS[activeTab]
    setTouched((current) => fields.reduce((next, field) => ({ ...next, [field]: true }), { ...current }))
    if (fields.some((field) => errors[field])) {
      setNotice('Please correct the highlighted fields before continuing.')
      return
    }
    const currentIndex = FORM_TABS.findIndex((tab) => tab.id === activeTab)
    const nextIndex = currentIndex + 1
    setHighestUnlockedTab((current) => Math.max(current, nextIndex))
    setActiveTab(FORM_TABS[nextIndex].id)
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    touchAll()
    if (!isValid || submitting) { setDialog(null); return }
    setSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 650))
      const current = JSON.parse(localStorage.getItem('btechms_colleges') || '[]')
      const college = {
        id: Date.now(), name: values.collegeName.trim(), code: values.collegeCode, type: values.collegeType,
        university: values.universityName.trim(), address: [values.addressLine1, values.addressLine2].filter(Boolean).join(', '),
        city: values.city.trim(), state: values.state.trim(), pincode: values.pincode, contact: values.contactNumber,
        email: values.email.trim(), website: values.website.trim(), logo: values.logo, principal: values.principalName.trim(),
        accreditation: [values.accreditationBody, values.accreditationGrade, values.accreditationNumber].filter(Boolean).join(' · '), status: 'active',
      }
      localStorage.setItem('btechms_colleges', JSON.stringify([...current, college]))
      setDirty(false); setDialog('success')
    } catch { setNotice('Unexpected error. The college could not be created.'); setDialog(null) }
    finally { setSubmitting(false) }
  }

  const section = (title, subtitle, content) => <section className="ac-section"><header><h2>{title}</h2><p>{subtitle}</p></header><div className="ac-grid">{content}</div></section>

  return <DashboardLayout><main className="add-college">
    <header className="ac-page-header"><div><h1>Add College</h1><p>Create and configure a new institution in the college management system.</p></div><button className="ac-back" type="button" onClick={requestLeave}>College list →</button></header>
    <nav className="ac-tabs" aria-label="College form sections" role="tablist">
      {FORM_TABS.map((tab, index) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} disabled={index > highestUnlockedTab} onClick={() => setActiveTab(tab.id)}><span>{index + 1}</span>{tab.label}</button>)}
    </nav>
    {notice && <div className="ac-notice" role="status">{notice}</div>}
    <form onSubmit={(event) => { event.preventDefault(); submit() }} noValidate>
      {activeTab === 'college' && <>
      {section('College Information', 'Core identity and affiliation details.', <>
        <Field label="College Name" name="collegeName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="e.g. Crescent Institute of Technology" />
        <Field label="College Code" name="collegeCode" values={values} errors={errors} touched={touched} onChange={update} required maxLength={12} placeholder="e.g. CIT2026" />
        <label className="ac-field" htmlFor="ac-collegeType"><span>College Type <b>*</b></span><select id="ac-collegeType" name="collegeType" value={values.collegeType} onChange={update} aria-invalid={Boolean(touched.collegeType && errors.collegeType)}><option value="">Select type</option>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>{touched.collegeType && errors.collegeType && <small className="ac-error" role="alert">{errors.collegeType}</small>}</label>
        <Field label="University Name" name="universityName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="Affiliated university" />
        <div className="ac-upload ac-span-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectLogo(e.dataTransfer.files[0]) }}>
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => selectLogo(e.target.files?.[0])} hidden />
          {values.logo ? <div className="ac-logo-preview"><img src={values.logo} alt="College logo preview" /><div><strong>{values.logoName}</strong><button type="button" onClick={() => { setValues((v) => ({ ...v, logo: '', logoName: '' })); if (fileRef.current) fileRef.current.value = ''; setDirty(true) }}>Remove image</button></div></div> : <button type="button" className="ac-upload-button" onClick={() => fileRef.current?.click()}><strong>Upload college logo</strong><span>Click or drag and drop PNG, JPG, JPEG, or WEBP · Max 5 MB</span></button>}
          {logoError && <small className="ac-error" role="alert">{logoError}</small>}
        </div>
      </>)}
      </>}
      {activeTab === 'address' && <>
      {section('Address', 'Official postal address of the institution.', <>
        <Field label="Address Line 1" name="addressLine1" values={values} errors={errors} touched={touched} onChange={update} required maxLength={150} placeholder="Building, street, locality" />
        <Field label="Address Line 2" name="addressLine2" values={values} errors={errors} touched={touched} onChange={update} maxLength={150} placeholder="Landmark or area (optional)" />
        <Field label="City" name="city" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
        <Field label="State" name="state" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
        <Field label="Pincode" name="pincode" values={values} errors={errors} touched={touched} onChange={update} required maxLength={6} inputMode="numeric" />
        <Field label="Country" name="country" values={values} errors={errors} touched={touched} onChange={update} required readOnly />
      </>)}
      </>}
      {activeTab === 'contact' && section('Contact Information', 'Public institutional contact channels.', <>
        <Field label="Official Contact Number" name="contactNumber" values={values} errors={errors} touched={touched} onChange={update} required maxLength={10} inputMode="tel" placeholder="10-digit mobile number" />
        <Field label="Alternate Contact Number" name="alternateContactNumber" values={values} errors={errors} touched={touched} onChange={update} maxLength={10} inputMode="tel" />
        <Field label="Official Email" name="email" type="email" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="office@college.edu" />
        <Field label="Website" name="website" type="url" values={values} errors={errors} touched={touched} onChange={update} maxLength={160} placeholder="https://college.edu" />
      </>)}
      {activeTab === 'administration' && section('Administration', 'Principal or institutional head details.', <>
        <Field label="Principal Name" name="principalName" values={values} errors={errors} touched={touched} onChange={update} maxLength={100} />
        <Field label="Principal Email" name="principalEmail" type="email" values={values} errors={errors} touched={touched} onChange={update} maxLength={120} />
        <Field label="Principal Contact Number" name="principalContact" values={values} errors={errors} touched={touched} onChange={update} maxLength={10} inputMode="tel" />
      </>)}
      {activeTab === 'accreditation' && section('Accreditation Details', 'Current accreditation standing and validity.', <>
        <label className="ac-field" htmlFor="ac-accreditationStatus"><span>Accreditation Status</span><select id="ac-accreditationStatus" name="accreditationStatus" value={values.accreditationStatus} onChange={update}>{ACCREDITATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <Field label="Accreditation Body" name="accreditationBody" values={values} errors={errors} touched={touched} onChange={update} maxLength={80} placeholder="e.g. NAAC, NBA" />
        <Field label="Accreditation Grade" name="accreditationGrade" values={values} errors={errors} touched={touched} onChange={update} maxLength={20} placeholder="e.g. A+" />
        <Field label="Accreditation Number" name="accreditationNumber" values={values} errors={errors} touched={touched} onChange={update} maxLength={50} />
        <Field label="Valid From" name="validFrom" type="date" values={values} errors={errors} touched={touched} onChange={update} />
        <Field label="Valid Until" name="validUntil" type="date" values={values} errors={errors} touched={touched} onChange={update} />
        {values.accreditationStatus === 'Accredited' && <p className="ac-hint ac-span-2">Complete the accreditation body, grade, number, and validity dates for a comprehensive record.</p>}
      </>)}
      {activeTab !== 'accreditation' ? (
        <footer className="ac-actions ac-next-actions"><button type="button" className="ac-primary" onClick={saveAndNext}>Save &amp; Next →</button></footer>
      ) : (
        <footer className="ac-actions"><button type="button" className="ac-secondary" onClick={() => setDialog('reset')}>Reset Form</button><button type="button" className="ac-secondary" onClick={saveDraft}>Save as Draft</button><button type="button" className="ac-secondary" onClick={openPreview}>Preview College</button><button type="submit" className="ac-primary" disabled={!isValid || submitting}>{submitting ? 'Creating College...' : 'Create College'}</button></footer>
      )}
    </form>

    {dialog === 'reset' && <Dialog title="Reset College Form?" actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Cancel</button><button className="ac-danger-btn" onClick={reset}>Reset</button></>}><p>All entered information will be cleared.</p></Dialog>}
    {dialog === 'leave' && <Dialog title="Unsaved Changes" actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Stay</button><button className="ac-danger-btn" onClick={() => navigate('/college-institution-management')}>Leave</button></>}><p>You have unsaved college information. Leave without saving?</p></Dialog>}
    {dialog === 'preview' && <Dialog title="Preview College" actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Back to Edit</button><button className="ac-primary" onClick={submit} disabled={submitting}>{submitting ? 'Creating College...' : 'Submit'}</button></>}><div className="ac-preview">{values.logo && <img src={values.logo} alt="College logo" />}<h3>{values.collegeName}</h3><p><b>Code:</b> {values.collegeCode} · {values.collegeType}</p><hr/><h4>College Information</h4><p>{values.universityName}</p><h4>Address</h4><p>{[values.addressLine1, values.addressLine2, values.city, values.state, values.pincode, values.country].filter(Boolean).join(', ')}</p><h4>Contact</h4><p>{values.contactNumber} · {values.email}<br/>{values.website || 'No website provided'}</p><h4>Administration</h4><p>{values.principalName || 'Not provided'} {values.principalEmail && `· ${values.principalEmail}`}</p><h4>Accreditation</h4><p>{values.accreditationStatus}{values.accreditationBody && ` · ${values.accreditationBody}`}</p></div></Dialog>}
    {dialog === 'success' && <Dialog title="College Created Successfully" actions={<button className="ac-primary" onClick={() => navigate('/college-institution-management')}>Return to College List</button>}><p><b>College Name:</b><br/>{values.collegeName}</p><p><b>College Code:</b><br/>{values.collegeCode}</p><p className="ac-hint">Saved using frontend/static behavior. No backend database was contacted.</p></Dialog>}
  </main></DashboardLayout>
}
