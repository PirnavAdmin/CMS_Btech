import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout'
import { createCollege, getCollegeById, getCollegeLogoUrl, getColleges, isValidWebsite, normalizeWebsite, readCollegeExtendedDetails, unwrapCollegeRecord, updateCollege, uploadCollegeLogo, WEBSITE_VALIDATION_MESSAGE } from '../../auth/collegeApi'
import './AddCollege.css'

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''
const dateInputValue = (value) => value ? String(value).slice(0, 10) : ''

const TYPES = ['Engineering College', 'University', 'Autonomous College', 'Affiliated College', 'Deemed University', 'Other']
const ACCREDITATION_STATUSES = ['Accredited', 'Not Accredited', 'Under Review', 'Expired']
const FORM_TABS = [
  { id: 'college', label: 'College Information' },
  { id: 'address', label: 'Address' },
  { id: 'contact', label: 'Contact Information' },
  { id: 'administration', label: 'Administration' },
  { id: 'accreditation', label: 'Accreditation Details' },
  { id: 'preview', label: 'Preview & Submit' },
]
const TAB_FIELDS = {
  college: ['collegeName', 'collegeCode', 'collegeType', 'collegeTypeOther', 'universityName'],
  address: ['addressLine1', 'addressLine2', 'area', 'district', 'city', 'state', 'pincode', 'country'],
  contact: ['contactNumber', 'alternateContactNumber', 'email', 'website'],
  administration: ['principalName', 'principalEmail', 'principalContact'],
  accreditation: ['accreditationBody', 'accreditationStatus', 'accreditationGrade', 'accreditationNumber', 'validFrom', 'validUntil'],
}
const initialValues = {
  collegeName: '', collegeCode: '', collegeType: '', collegeTypeOther: '', universityName: '', logo: '', logoName: '',
  addressLine1: '', addressLine2: '', area: '', district: '', city: '', state: '', pincode: '', country: 'India',
  contactNumber: '', alternateContactNumber: '', email: '', website: '',
  principalName: '', principalEmail: '', principalContact: '',
  accreditationBody: '', accreditationStatus: 'Not Accredited', accreditationGrade: '',
  accreditationNumber: '', validFrom: '', validUntil: '',
}

const phonePattern = /^[6-9]\d{9}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const codePattern = /^[A-Z0-9]{2,12}$/

const getApiErrorMessage = (error) => {
  const data = error?.response?.data
  const apiMessage = typeof data === 'string'
    ? data
    : data?.message || data?.error || data?.title || data?.detail
  if (apiMessage) return apiMessage

  const technicalMessage = /<!doctype|<html|ngrok|err_ngrok|failed to fetch|networkerror|https?:\/\//i.test(String(error?.message || ''))
  return technicalMessage || error?.response?.status >= 500
    ? 'College service is temporarily unavailable. Please try again later.'
    : error?.message || 'The college could not be saved. Please try again.'
}

function validate(values) {
  const errors = {}
  const name = values.collegeName.trim()
  if (!name) errors.collegeName = 'College name is required.'
  else if (name.length < 3 || name.length > 120) errors.collegeName = 'Use between 3 and 120 characters.'
  if (!values.collegeCode) errors.collegeCode = 'College code is required.'
  else if (!codePattern.test(values.collegeCode)) errors.collegeCode = 'Use 2–12 uppercase letters and numbers only.'
  if (!values.collegeType) errors.collegeType = 'Select a college type.'
  else if (values.collegeType === 'Other' && !values.collegeTypeOther.trim()) errors.collegeTypeOther = 'Enter the college type.'
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
  const website = normalizeWebsite(values.website)
  if (values.website.trim() && !isValidWebsite(website)) errors.website = WEBSITE_VALIDATION_MESSAGE
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
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const fileRef = useRef(null)
  const [values, setValues] = useState(initialValues)
  const [logoFile, setLogoFile] = useState(null)
  const [removeExistingLogo, setRemoveExistingLogo] = useState(false)
  const [pendingLogoCollegeId, setPendingLogoCollegeId] = useState(null)
  const [existingCollegeCodes, setExistingCollegeCodes] = useState([])
  const [touched, setTouched] = useState({})
  const [logoError, setLogoError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState(editId ? 'college' : 'college')
  const [highestUnlockedTab, setHighestUnlockedTab] = useState(editId ? FORM_TABS.length - 1 : 0)
  const [loadingCollege, setLoadingCollege] = useState(Boolean(editId))
  const [postOffices, setPostOffices] = useState([])
  const [pincodeStatus, setPincodeStatus] = useState('')
  const [saved, setSaved] = useState(false)
  const redirectTimer = useRef(null)
  const errors = validate(values)
  const duplicateCode = values.collegeCode && existingCollegeCodes.includes(values.collegeCode.trim().toUpperCase()) && !editId
  const isValid = Object.keys(errors).length === 0 && !logoError && !duplicateCode

  useEffect(() => {
    // Reset wizard state whenever the edited college changes so a previous save/preview doesn't carry over.
    window.clearTimeout(redirectTimer.current)
    setActiveTab('college')
    setHighestUnlockedTab(editId ? FORM_TABS.length - 1 : 0)
    setTouched({})
    setDirty(false)
    setNotice('')
    setSaved(false)
    setDialog(null)
    setLoadingCollege(Boolean(editId))
    setLogoFile(null)
    setRemoveExistingLogo(false)
    setPendingLogoCollegeId(null)
    if (!editId) { setValues(initialValues); return undefined }
    let active = true
    getCollegeById(editId).then((response) => {
      if (!active) return
      const record = unwrapCollegeRecord(response)
      const addressRecord = record.addressDetails ?? record.addressInfo ?? {}
      const contactRecord = record.contactDetails ?? record.contactInfo ?? {}
      const principalRecord = record.administration ?? record.principalDetails ?? {}
      const accreditationRecord = record.accreditationDetails && typeof record.accreditationDetails === 'object' ? record.accreditationDetails : {}
      const extended = readCollegeExtendedDetails(record)
      const addressParts = String(record.address ?? '').split(',').map((part) => part.trim())
      const rawType = record.type ?? record.collegeType ?? record.institutionType ?? ''
      const isKnownType = TYPES.includes(rawType)
      setValues({ ...initialValues, collegeName: record.name ?? record.collegeName ?? '', collegeCode: record.code ?? record.collegeCode ?? '', collegeType: rawType && !isKnownType ? 'Other' : rawType, collegeTypeOther: rawType && !isKnownType ? rawType : '', universityName: record.university ?? record.universityName ?? '', addressLine1: record.addressLine1 ?? addressRecord.addressLine1 ?? addressParts[0] ?? '', addressLine2: record.addressLine2 ?? addressRecord.addressLine2 ?? addressParts.slice(1).join(', '), area: record.area ?? addressRecord.area ?? extended.area ?? '', district: record.district ?? addressRecord.district ?? extended.district ?? '', city: record.city ?? addressRecord.city ?? '', state: record.state ?? addressRecord.state ?? '', pincode: String(record.pincode ?? addressRecord.pincode ?? ''), country: record.country ?? addressRecord.country ?? 'India', contactNumber: String(record.contact ?? record.contactNumber ?? record.phoneNumber ?? record.mobile ?? record.phone ?? contactRecord.contactNumber ?? contactRecord.phoneNumber ?? contactRecord.mobile ?? contactRecord.phone ?? ''), alternateContactNumber: String(record.alternateContact ?? record.alternateContactNumber ?? record.alternatePhoneNumber ?? contactRecord.alternateContactNumber ?? extended.alternateContactNumber ?? ''), email: record.email ?? record.collegeEmail ?? contactRecord.email ?? '', website: record.website ?? record.Website ?? contactRecord.website ?? contactRecord.Website ?? '', principalName: record.principal ?? record.principalName ?? principalRecord.principalName ?? '', principalEmail: record.principalEmail ?? principalRecord.principalEmail ?? extended.principalEmail ?? '', principalContact: String(record.principalContact ?? record.principalPhone ?? principalRecord.principalContact ?? extended.principalContact ?? ''), accreditationBody: record.accreditationBody ?? accreditationRecord.body ?? accreditationRecord.accreditationBody ?? extended.accreditationBody ?? '', accreditationStatus: record.accreditationStatus ?? accreditationRecord.status ?? extended.accreditationStatus ?? 'Not Accredited', accreditationGrade: record.accreditationGrade ?? accreditationRecord.grade ?? extended.accreditationGrade ?? '', accreditationNumber: record.accreditationNumber ?? accreditationRecord.number ?? extended.accreditationNumber ?? '', validFrom: dateInputValue(record.validFrom ?? record.accreditationValidFrom ?? accreditationRecord.validFrom ?? extended.validFrom), validUntil: dateInputValue(record.validUntil ?? record.accreditationValidUntil ?? accreditationRecord.validUntil ?? extended.validUntil), logo: record.logo ?? record.logoUrl ?? record.collegeLogo ?? record.collegeLogoUrl ?? record.logoPath ?? '', logoName: record.logoName ?? extended.logoName ?? '' })
    }).catch((error) => { if (active) setNotice(error.message || 'Unable to load college details.') }).finally(() => { if (active) setLoadingCollege(false) })
    return () => { active = false }
  }, [editId])

  useEffect(() => {
    getColleges()
      .then((response) => {
        const records = response?.data?.data ?? response?.data ?? response
        const colleges = Array.isArray(records) ? records : Array.isArray(records?.items) ? records.items : []
        setExistingCollegeCodes(colleges.map((college) => String(college.code ?? college.collegeCode ?? '').trim().toUpperCase()).filter(Boolean))
      })
      .catch(() => setExistingCollegeCodes([]))
  }, [])

  useEffect(() => {
    const warn = (event) => { if (dirty) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => () => window.clearTimeout(redirectTimer.current), [])

  useEffect(() => {
    if (values.pincode.length !== 6) return undefined
    const controller = new AbortController()
    setPincodeStatus('Looking up location...')
    fetch(`https://api.postalpincode.in/pincode/${values.pincode}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Lookup failed'); return response.json() })
      .then(([result]) => {
        const offices = result?.Status === 'Success' && Array.isArray(result.PostOffice) ? result.PostOffice : []
        if (!offices.length) throw new Error('Not found')
        const first = offices[0]
        setPostOffices(offices)
        setValues((current) => ({ ...current, area: first.Name || '', district: first.District || '', city: first.Block || first.District || '', state: first.State || '', country: first.Country || 'India' }))
        setPincodeStatus('Location found. Select the area if required; all fields remain editable.')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') { setPostOffices([]); setPincodeStatus('Location not found. Enter the address manually.') }
      })
    return () => controller.abort()
  }, [values.pincode])

  const update = ({ target: { name, value } }) => {
    let next = value
    if (name === 'collegeCode') next = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (['pincode', 'contactNumber', 'alternateContactNumber', 'principalContact'].includes(name)) next = value.replace(/\D/g, '')
    setValues((current) => name === 'pincode' ? { ...current, pincode: next, area: '', district: '', city: '', state: '' } : { ...current, [name]: next })
    if (name === 'pincode') { setPostOffices([]); setPincodeStatus('') }
    setTouched((current) => ({ ...current, [name]: true }))
    setDirty(true); setNotice(''); setSaved(false)
  }

  const normalizeWebsiteField = () => {
    setValues((current) => {
      const website = normalizeWebsite(current.website)
      return website === current.website ? current : { ...current, website }
    })
  }

  const selectLogo = (file) => {
    setLogoError('')
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setLogoError('Choose a PNG, JPG, JPEG, or WEBP image.')
    if (file.size > 5 * 1024 * 1024) return setLogoError('Logo must be 5 MB or smaller.')
    setLogoFile(file)
    setRemoveExistingLogo(false)
    const reader = new FileReader()
    reader.onload = () => { setValues((current) => ({ ...current, logo: reader.result, logoName: file.name })); setDirty(true) }
    reader.onerror = () => { setLogoFile(null); setLogoError('The image could not be read. Please try another file.') }
    reader.readAsDataURL(file)
  }

  const touchAll = () => setTouched(Object.keys(initialValues).reduce((all, key) => ({ ...all, [key]: true }), {}))
  const reset = () => { setValues(initialValues); setLogoFile(null); setRemoveExistingLogo(false); setPendingLogoCollegeId(null); setTouched({}); setLogoError(''); setDirty(false); setActiveTab('college'); setHighestUnlockedTab(0); setDialog(null); setNotice('Form reset successfully.') }
  const requestLeave = () => dirty ? setDialog('leave') : navigate('/college-institution-management')
  const showTab = (tabId) => {
    setActiveTab(tabId)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }
  const saveAndNext = () => {
    const fields = TAB_FIELDS[activeTab]
    setTouched((current) => fields.reduce((next, field) => ({ ...next, [field]: true }), { ...current }))
    if (activeTab === 'college' && duplicateCode) {
      setNotice('This college code already exists. Enter a unique code before continuing.')
      return
    }
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
    let collegeId = editId || pendingLogoCollegeId
    try {
      const website = normalizeWebsite(values.website)
      const college = {
        name: values.collegeName.trim(), code: values.collegeCode, type: values.collegeType === 'Other' ? values.collegeTypeOther.trim() : values.collegeType,
        university: values.universityName.trim(), address: [values.addressLine1, values.addressLine2].filter(Boolean).join(', '),
        addressLine1: values.addressLine1.trim(), addressLine2: values.addressLine2.trim(),
        area: values.area.trim(), district: values.district.trim(), country: values.country.trim(),
        city: values.city.trim(), state: values.state.trim(), pincode: values.pincode, contact: values.contactNumber,
        email: values.email.trim(), logo: logoFile ? '' : values.logo, clearLogo: Boolean(editId && removeExistingLogo && !logoFile), logoName: values.logoName, principal: values.principalName.trim(),
        accreditation: [values.accreditationBody, values.accreditationGrade, values.accreditationNumber].filter(Boolean).join(' · '),
        accreditationStatus: values.accreditationStatus, accreditationBody: values.accreditationBody.trim(),
        accreditationGrade: values.accreditationGrade.trim(), accreditationNumber: values.accreditationNumber.trim(),
        ...(website ? { Website: website } : {}),
        ...(values.alternateContactNumber ? { alternateContactNumber: values.alternateContactNumber } : {}),
        ...(values.principalEmail.trim() ? { principalEmail: values.principalEmail.trim() } : {}),
        ...(values.principalContact ? { principalContact: values.principalContact } : {}),
        ...(values.validFrom ? { validFrom: values.validFrom } : {}),
        ...(values.validUntil ? { validUntil: values.validUntil } : {}),
      }
      if (!collegeId) {
        const response = await createCollege(college)
        const created = unwrapCollegeRecord(response)
        collegeId = created.id ?? created.collegeId ?? response?.data?.id ?? response?.data?.collegeId
        if (!collegeId) throw new Error('College was created, but its identifier was not returned for logo upload.')
        setPendingLogoCollegeId(collegeId)
      } else if (editId) {
        await updateCollege(editId, college)
      }
      if (logoFile) await uploadCollegeLogo(collegeId, logoFile)

      // The list route fetches from the backend when it mounts, so navigating
      // after the success message ensures the new row uses server data and the
      // list's established ordering and pagination rules.
      setDirty(false)
      setDialog(null)
      setSaved(true)
      setNotice(editId ? 'College updated successfully.' : 'College added successfully!')
      setPendingLogoCollegeId(null)
      if (!editId) {
        setValues(initialValues)
        setLogoFile(null)
        setRemoveExistingLogo(false)
        setTouched({})
        setLogoError('')
        if (fileRef.current) fileRef.current.value = ''
      }
      window.clearTimeout(redirectTimer.current)
      redirectTimer.current = window.setTimeout(() => navigate('/college-institution-management'), 1000)
    } catch (error) {
      const partialSave = !editId && collegeId
      setNotice(partialSave
        ? `College was created, but the logo upload failed: ${getApiErrorMessage(error)} Submit again to retry the logo upload.`
        : getApiErrorMessage(error))
      setDialog(null)
    }
    finally { setSubmitting(false) }
  }

  const section = (title, subtitle, content) => <section className="ac-section"><header><h2>{title}</h2><p>{subtitle}</p></header><div className="ac-grid">{content}</div></section>

  return <DashboardLayout><main className="add-college">
    <header className="ac-page-header"><div><h1>{editId ? 'Edit College' : 'Add College'}</h1><p>{editId ? 'Update the college information below.' : 'Create and configure a new college in the college management system.'}</p></div><button className="ac-back" type="button" onClick={requestLeave}>College list →</button></header>
    <nav className="ac-tabs" aria-label="College form sections" role="tablist">
      {FORM_TABS.map((tab, index) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-disabled={index > highestUnlockedTab} disabled={index > highestUnlockedTab} className={activeTab === tab.id ? 'active' : ''} onClick={() => showTab(tab.id)}><span>{index + 1}</span>{tab.label}</button>)}
    </nav>
    {loadingCollege && <div className="ac-notice" role="status">Loading college details...</div>}{notice && <div className={`ac-notice${notice === 'College added successfully!' ? ' ac-notice-success' : ''}`} role="status">{notice}</div>}
    <form onSubmit={(event) => event.preventDefault()} noValidate>
      {activeTab === 'college' && <>
      {section('College Information', 'Core identity and affiliation details.', <>
        <Field label="College Name" name="collegeName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="e.g. Crescent Institute of Technology" />
        <Field label="College Code" name="collegeCode" values={values} errors={{ ...errors, ...(duplicateCode ? { collegeCode: 'This college code already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={12} placeholder="e.g. CIT2026" />
        <label className="ac-field" htmlFor="ac-collegeType"><span>College Type <b>*</b></span><select id="ac-collegeType" name="collegeType" value={values.collegeType} onChange={update} aria-invalid={Boolean(touched.collegeType && errors.collegeType)}><option value="">Select type</option>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>{touched.collegeType && errors.collegeType && <small className="ac-error" role="alert">{errors.collegeType}</small>}</label>
        {values.collegeType === 'Other' && <Field label="Specify College Type" name="collegeTypeOther" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} placeholder="e.g. Community College" />}
        <Field label="University Name" name="universityName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="Affiliated university" />
        <div className="ac-upload ac-span-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectLogo(e.dataTransfer.files[0]) }}>
          <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => selectLogo(e.target.files?.[0])} hidden />
          {values.logo || (editId && !removeExistingLogo) ? <div className="ac-logo-preview"><img src={logoFile ? values.logo : getCollegeLogoUrl(editId, values.logo)} alt="College logo preview" /><div><strong>{values.logoName || (logoFile ? logoFile.name : 'Current college logo')}</strong><button type="button" onClick={() => { setLogoFile(null); setRemoveExistingLogo(Boolean(editId)); setValues((v) => ({ ...v, logo: '', logoName: '' })); if (fileRef.current) fileRef.current.value = ''; setDirty(true) }}>Remove image</button></div></div> : <button type="button" className="ac-upload-button" onClick={() => fileRef.current?.click()}><strong>Upload college logo</strong><span>Click or drag and drop PNG, JPG, JPEG, or WEBP · Max 5 MB</span></button>}
          {logoError && <small className="ac-error" role="alert">{logoError}</small>}
        </div>
      </>)}
      </>}
      {activeTab === 'address' && <>
      {section('Address', 'Official postal address of the college.', <>
        <Field label="Address Line 1" name="addressLine1" values={values} errors={errors} touched={touched} onChange={update} required maxLength={150} placeholder="Building, street, locality" />
        <Field label="Address Line 2" name="addressLine2" values={values} errors={errors} touched={touched} onChange={update} maxLength={150} placeholder="Landmark or area (optional)" />
        <Field label="City" name="city" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
        <Field label="State" name="state" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
        <Field label="Pincode" name="pincode" values={values} errors={errors} touched={touched} onChange={update} required maxLength={6} inputMode="numeric" />
        <Field label="Country" name="country" values={values} errors={errors} touched={touched} onChange={update} required readOnly />
        <label className="ac-field" htmlFor="ac-area"><span>Area / Post Office</span><select id="ac-area" name="area" value={values.area} onChange={update} disabled={!postOffices.length}><option value="">{postOffices.length ? 'Select area' : 'Enter pincode first'}</option>{postOffices.map((office) => <option key={`${office.Name}-${office.BranchType}`} value={office.Name}>{office.Name}</option>)}</select></label>
        <Field label="District" name="district" values={values} errors={errors} touched={touched} onChange={update} maxLength={60} />
        {pincodeStatus && <p className="ac-lookup-status ac-span-2" role="status">{pincodeStatus}</p>}
      </>)}
      </>}
      {activeTab === 'contact' && section('Contact Information', 'Public college contact channels.', <>
        <Field label="Official Contact Number" name="contactNumber" values={values} errors={errors} touched={touched} onChange={update} required maxLength={10} inputMode="tel" placeholder="10-digit mobile number" />
        <Field label="Alternate Contact Number" name="alternateContactNumber" values={values} errors={errors} touched={touched} onChange={update} maxLength={10} inputMode="tel" />
        <Field label="Official Email" name="email" type="email" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="office@college.edu" />
        <Field label="Website" name="website" type="url" values={values} errors={errors} touched={touched} onChange={update} onBlur={normalizeWebsiteField} maxLength={160} placeholder="https://college.edu" />
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
      {activeTab === 'preview' && <section className="ac-preview ac-final-preview"><h2>Preview &amp; Submit</h2><p>Review all college fields before submitting.</p>{values.logo && <img src={values.logo} alt="College logo preview" />}<dl>{Object.entries({ 'College Name': values.collegeName, 'College Code': values.collegeCode, 'College Type': values.collegeType === 'Other' ? values.collegeTypeOther : values.collegeType, 'University Name': values.universityName, 'Logo File Name': values.logoName, 'Address Line 1': values.addressLine1, 'Address Line 2': values.addressLine2, Area: values.area, District: values.district, City: values.city, State: values.state, Country: values.country, Pincode: values.pincode, 'Contact Number': values.contactNumber, 'Alternate Contact Number': values.alternateContactNumber, 'Official Email': values.email, Website: values.website, 'Principal Name': values.principalName, 'Principal Email': values.principalEmail, 'Principal Contact Number': values.principalContact, 'Accreditation Status': values.accreditationStatus, 'Accreditation Body': values.accreditationBody, 'Accreditation Grade': values.accreditationGrade, 'Accreditation Number': values.accreditationNumber, 'Valid From': values.validFrom, 'Valid Until': values.validUntil }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={!hasValue(value) ? 'ac-not-provided' : ''}>{hasValue(value) ? value : 'Not provided'}</dd></div>)}</dl></section>}
      {activeTab !== 'accreditation' && activeTab !== 'preview' ? (
        <footer className="ac-actions ac-next-actions"><button type="button" className="ac-primary" onClick={saveAndNext}>Save &amp; Next →</button></footer>
      ) : activeTab === 'accreditation' ? (
        <footer className="ac-actions"><button type="button" className="ac-secondary" onClick={() => showTab('college')}>Start Over</button><button type="button" className="ac-primary" onClick={() => { if (isValid) showTab('preview'); else { touchAll(); setNotice('Please correct the highlighted fields before continuing.') } }}>Next: Preview</button></footer>
      ) : (
        <footer className="ac-actions"><button type="button" className="ac-secondary" onClick={() => showTab('accreditation')}>← Previous</button><button type="button" className="ac-primary" onClick={submit} disabled={!isValid || submitting || loadingCollege || saved}>{submitting ? 'Saving...' : saved ? 'Saved. Redirecting...' : editId ? 'Save Changes' : 'Submit College'}</button></footer>
      )}
    </form>

    {dialog === 'reset' && <Dialog title="Reset College Form?" actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Cancel</button><button className="ac-danger-btn" onClick={reset}>Reset</button></>}><p>All entered information will be cleared.</p></Dialog>}
    {dialog === 'leave' && <Dialog title="Unsaved Changes" actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Stay</button><button className="ac-danger-btn" onClick={() => navigate('/college-institution-management')}>Leave</button></>}><p>You have unsaved college information. Leave without saving?</p></Dialog>}
  </main></DashboardLayout>
}
