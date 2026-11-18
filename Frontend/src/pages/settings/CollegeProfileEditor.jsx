import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Check, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react'
import ViewDialog from '../../components/ViewDialog.jsx'
import { lookupIndianPostOffices } from '../../api/apiEndpoints.js'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import {
  fetchCollegeLogo,
  getCollegeLogoUrl,
  isValidWebsite,
  normalizeWebsite,
  updateCollegeProfile,
  uploadCollegeLogo,
} from '../../auth/collegeApi.js'
import { showSuccess } from '../../utils/toast.js'
import './CollegeProfileEditor.css'

const steps = [
  { title: 'College', description: 'Identity and affiliation' },
  { title: 'Address', description: 'Official postal address' },
  { title: 'Contact', description: 'Public contact channels' },
  { title: 'Admin', description: 'Principal details' },
  { title: 'Accreditation', description: 'Affiliation and validity' },
  { title: 'Review', description: 'Confirm profile changes' },
]

const stepFields = [
  ['collegeName', 'collegeCode', 'collegeType', 'collegeTypeOther', 'affiliatedUniversity', 'logoFile'],
  ['addressLine1', 'addressLine2', 'country', 'state', 'district', 'city', 'pincode', 'area'],
  ['email', 'mobile', 'alternatePhone', 'website'],
  ['principal', 'principalEmail', 'principalContact'],
  ['accreditationStatus', 'accreditationBody', 'accreditationGrade', 'accreditationNumber', 'validFrom', 'validUntil'],
  [],
]

const fieldStep = {
  ...Object.fromEntries(stepFields.flatMap((fields, index) => fields.map(field => [field, index]))),
}

const accreditationStatuses = ['Accredited', 'Not Accredited', 'Under Review', 'Expired']
const collegeTypes = ['Engineering College', 'Degree College', 'University', 'Autonomous College', 'Affiliated College', 'Deemed University', 'Others']
const requiredFields = [
  { key: 'collegeName', label: 'College Name' },
  { key: 'collegeCode', label: 'College Code' },
]
const profileFieldMap = [
  ['collegeName', 'CollegeName', value => value.trim()],
  ['collegeCode', 'CollegeCode', value => value.trim()],
  ['collegeType', 'CollegeType', value => value.trim()],
  ['affiliatedUniversity', 'UniversityName', value => value.trim()],
  ['email', 'Email', value => value.trim()],
  ['mobile', 'Mobile', value => value.trim()],
  ['alternatePhone', 'AlternateContactNumber', value => value.replace(/\D/g, '')],
  ['principal', 'Principal', value => value.trim()],
  ['principalEmail', 'PrincipalEmail', value => value.trim()],
  ['principalContact', 'PrincipalContact', value => value.replace(/\D/g, '')],
  ['accreditationStatus', 'AccreditationStatus', value => value],
  ['accreditationBody', 'AccreditationBody', value => value.trim()],
  ['accreditationGrade', 'AccreditationGrade', value => value.trim()],
  ['accreditationNumber', 'AccreditationNumber', value => value.trim()],
  ['validFrom', 'ValidFrom', value => value || undefined],
  ['validUntil', 'ValidUntil', value => value || undefined],
  ['addressLine1', 'AddressLine1', value => value.trim()],
  ['addressLine2', 'AddressLine2', value => value.trim()],
  ['city', 'City', value => value.trim()],
  ['area', 'Area', value => value.trim()],
  ['district', 'District', value => value.trim()],
  ['state', 'State', value => value.trim()],
  ['country', 'Country', value => value.trim()],
  ['pincode', 'Pincode', value => value.trim()],
  ['website', 'Website', value => normalizeWebsite(value)],
]

const first = (source, keys, fallback = '') => {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return fallback
}
const text = value => value == null ? '' : String(value)
const cleanId = value => String(value ?? '').trim()
const joinName = value => String(value || '').replace(/\\/g, '/').split('/').pop()

function normalizeCollegeProfile(record = {}) {
  const source = {
    ...(record.addressDetails || record.addressInfo || {}),
    ...(record.contactDetails || record.contactInfo || {}),
    ...(record.administration || record.principalDetails || {}),
    ...(record.accreditationDetails && typeof record.accreditationDetails === 'object' ? record.accreditationDetails : {}),
    ...record,
  }
  return {
    collegeName: text(first(source, ['collegeName', 'CollegeName', 'name', 'Name'])),
    collegeCode: text(first(source, ['collegeCode', 'CollegeCode', 'code', 'Code'])),
    ...(() => {
      const savedType = text(first(source, ['collegeType', 'CollegeType', 'institutionType', 'type', 'Type']))
      const isKnownType = collegeTypes.some(type => type.toLowerCase() === savedType.toLowerCase())
      return {
        collegeType: isKnownType ? savedType : savedType ? 'Others' : '',
        collegeTypeOther: !isKnownType && savedType && savedType.toLowerCase() !== 'other' && savedType.toLowerCase() !== 'others' ? savedType : '',
      }
    })(),
    affiliatedUniversity: text(first(source, ['universityName', 'UniversityName', 'university', 'University'])),
    accreditationStatus: text(first(source, ['accreditationStatus', 'AccreditationStatus'])),
    accreditationBody: text(first(source, ['accreditationBody', 'AccreditationBody'])),
    accreditationGrade: text(first(source, ['accreditationGrade', 'AccreditationGrade'])),
    accreditationNumber: text(first(source, ['accreditationNumber', 'AccreditationNumber'])),
    validFrom: text(first(source, ['validFrom', 'ValidFrom'])).slice(0, 10),
    validUntil: text(first(source, ['validUntil', 'ValidUntil'])).slice(0, 10),
    addressLine1: text(first(source, ['addressLine1', 'AddressLine1', 'address', 'Address'])),
    addressLine2: text(first(source, ['addressLine2', 'AddressLine2'])),
    country: text(first(source, ['country', 'Country'], 'India')),
    state: text(first(source, ['state', 'State'])),
    district: text(first(source, ['district', 'District'])),
    city: text(first(source, ['city', 'City'])),
    pincode: text(first(source, ['pincode', 'Pincode', 'pinCode', 'PinCode'])),
    area: text(first(source, ['area', 'Area', 'postOffice', 'postOfficeArea'])),
    email: text(first(source, ['email', 'Email', 'collegeEmail'])),
    mobile: text(first(source, ['mobile', 'Mobile', 'contactNumber', 'contact', 'phoneNumber', 'phone', 'Phone'])),
    alternatePhone: text(first(source, ['alternateContactNumber', 'AlternateContactNumber', 'alternatePhone'])),
    website: text(first(source, ['website', 'Website'])),
    principal: text(first(source, ['principal', 'Principal', 'principalName'])),
    principalEmail: text(first(source, ['principalEmail', 'PrincipalEmail'])),
    principalContact: text(first(source, ['principalContact', 'PrincipalContact'])),
    logo: text(first(source, ['logoPath', 'LogoPath', 'logoUrl', 'logo', 'Logo'])),
  }
}

const errorStatus = error => Number(error?.status ?? error?.response?.status ?? 0)
const friendlySaveError = error => {
  const status = errorStatus(error)
  if (status === 401) return 'Your session has expired. Sign in again, then retry saving the college profile.'
  if (status === 403) return 'You do not have permission to edit this college profile. The server rejected the request.'
  return error?.message || 'The college profile could not be saved. Check the fields and try again.'
}

export default function CollegeProfileEditor({ editId, college, profile, onDismiss, onSaved }) {
  const { access, canAction } = useScreenAccess()
  const assignedId = cleanId(access?.primaryCollegeId ?? access?.collegeId)
  const collegeId = cleanId(editId)
  const initialValues = useMemo(() => normalizeCollegeProfile(profile ?? college), [profile, college])
  const originalValues = useRef(initialValues)
  const [values, setValues] = useState(initialValues)
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(() => new Set())
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [partialNotice, setPartialNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoFileError, setLogoFileError] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [savedLogoPreview, setSavedLogoPreview] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState('')
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [postOffices, setPostOffices] = useState([])
  const fileInput = useRef(null)

  const logoSource = getCollegeLogoUrl(collegeId, values.logo)
  const dirty = Boolean(logoFile) || JSON.stringify(values) !== JSON.stringify(originalValues.current)
  const isAssignedCollegeAdmin = access?.isCollegeAdmin === true
    && access?.isSuperAdmin !== true
    && Boolean(collegeId)
    && collegeId === assignedId
  const canEditProfile = isAssignedCollegeAdmin && canAction('/college-institution-management', 'edit')

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setSavedLogoPreview('')
    if (!logoSource) return undefined
    fetchCollegeLogo(logoSource).then(blob => {
      objectUrl = URL.createObjectURL(blob)
      if (cancelled) URL.revokeObjectURL(objectUrl)
      else setSavedLogoPreview(objectUrl)
    }).catch(() => {
      if (!cancelled) setSavedLogoPreview('')
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [collegeId, logoSource])

  useEffect(() => {
    const pin = values.pincode.trim()
    setPostOffices([])
    if (values.country.toLowerCase() !== 'india' || !/^[1-9]\d{5}$/.test(pin)) {
      setPincodeLoading(false)
      setPincodeStatus(pin && values.country.toLowerCase() !== 'india' ? 'PIN lookup is available for India only.' : '')
      return undefined
    }
    let active = true
    const timer = window.setTimeout(async () => {
      setPincodeLoading(true)
      setPincodeStatus('Looking up post offices…')
      try {
        const offices = await lookupIndianPostOffices(pin)
        if (!active) return
        setPostOffices(offices)
        const selected = offices.find(office => String(office.name || '').toLowerCase() === values.area.trim().toLowerCase())
          || (offices.length === 1 ? offices[0] : null)
        if (selected) {
          setValues(current => current.pincode.trim() !== pin ? current : ({
            ...current,
            area: selected.name || current.area,
            city: selected.city || selected.district || selected.town || current.city,
            district: selected.district || current.district,
            state: selected.state || current.state,
            country: selected.country || current.country,
          }))
          setPincodeStatus('Location details filled from ' + selected.name + '.')
        } else {
          setPincodeStatus(offices.length ? offices.length + ' post offices found. Select the saved area or enter it manually.' : 'No post offices found. Enter the location manually.')
        }
      } catch (error) {
        if (active) setPincodeStatus(error?.message || 'PIN lookup failed. Enter the address manually.')
      } finally {
        if (active) setPincodeLoading(false)
      }
    }, 300)
    return () => { active = false; window.clearTimeout(timer) }
  }, [values.pincode, values.country])

  const setValue = (key, value) => {
    setValues(current => ({
      ...current,
      [key]: value,
      ...(key === 'collegeType' && value !== 'Others' ? { collegeTypeOther: '' } : {}),
    }))
    setErrors(current => ({ ...current, [key]: '' }))
    setServerError('')
    setPartialNotice('')
    setCompletedSteps(current => {
      const next = new Set(current)
      next.delete(activeStep)
      return next
    })
  }

  const validate = () => {
    const next = {}
    if (!values.collegeName.trim()) next.collegeName = 'College name is required.'
    if (!values.collegeCode.trim()) next.collegeCode = 'College code is required.'
    if (values.collegeType === 'Others' && !values.collegeTypeOther.trim()) next.collegeTypeOther = 'Specify the institution type.'
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    const phoneDigits = value => String(value || '').replace(/\D/g, '')
    if (values.email && !emailPattern.test(values.email.trim())) next.email = 'Enter a valid official email address.'
    if (values.email === '' && originalValues.current.email) next.email = 'Enter a replacement or restore the saved official email.'
    if (values.mobile && (phoneDigits(values.mobile).length < 7 || phoneDigits(values.mobile).length > 15)) next.mobile = 'Enter a valid official phone number.'
    if (values.alternatePhone && !/^\d{10}$/.test(phoneDigits(values.alternatePhone))) next.alternatePhone = 'Enter a 10-digit alternate phone number.'
    if (values.principalEmail && !emailPattern.test(values.principalEmail.trim())) next.principalEmail = 'Enter a valid principal email address.'
    if (values.principalEmail === '' && originalValues.current.principalEmail) next.principalEmail = 'Enter a replacement or restore the saved principal email.'
    if (values.principalContact && !/^\d{10}$/.test(phoneDigits(values.principalContact))) next.principalContact = 'Enter a 10-digit principal phone number.'
    if (values.website && !isValidWebsite(normalizeWebsite(values.website))) next.website = 'Enter a valid website URL, including its domain.'
    if (values.website === '' && originalValues.current.website) next.website = 'Enter a replacement or restore the saved website.'
    if (values.country.toLowerCase() === 'india' && values.pincode && !/^\d{6}$/.test(values.pincode.trim())) next.pincode = 'Enter a valid 6-digit PIN code.'
    if (values.accreditationStatus && !accreditationStatuses.includes(values.accreditationStatus)) next.accreditationStatus = 'Choose a supported accreditation status.'
    if (values.validFrom && values.validUntil && values.validUntil < values.validFrom) next.validUntil = 'Valid until must be on or after valid from.'
    if (!values.validFrom && originalValues.current.validFrom) next.validFrom = 'Restore or replace the saved accreditation start date.'
    if (!values.validUntil && originalValues.current.validUntil) next.validUntil = 'Restore or replace the saved accreditation end date.'
    if (logoFileError) next.logoFile = logoFileError
    return next
  }

  const validateCurrentStep = () => {
    const allErrors = validate()
    const currentKeys = stepFields[activeStep] || []
    const localErrors = Object.fromEntries(currentKeys.filter(key => allErrors[key]).map(key => [key, allErrors[key]]))
    setErrors(current => ({ ...current, ...Object.fromEntries(currentKeys.map(key => [key, ''])), ...localErrors }))
    return Object.keys(localErrors).length === 0
  }

  const moveNext = () => {
    if (!validateCurrentStep()) return
    setCompletedSteps(current => new Set(current).add(activeStep))
    setActiveStep(index => Math.min(steps.length - 1, index + 1))
  }

  const skipCurrentStep = () => {
    setCompletedSteps(current => new Set(current).add(activeStep))
    setActiveStep(index => Math.min(steps.length - 1, index + 1))
  }

  const requestClose = () => {
    if (saving) return
    if (dirty) setConfirmDiscard(true)
    else onDismiss?.()
  }

  const chooseLogo = event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLogoFile(null)
    setLogoPreview('')
    const extension = file.name.split('.').pop()?.toLowerCase()
    const validMime = ['image/jpeg', 'image/png'].includes(file.type.toLowerCase())
    const validExtension = ['jpg', 'jpeg', 'png'].includes(extension)
    if (!validExtension || (file.type && !validMime)) {
      setLogoFileError('Choose a JPG, JPEG or PNG image.')
      setErrors(current => ({ ...current, logoFile: 'Choose a JPG, JPEG or PNG image.' }))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoFileError('The logo must be 2 MB or smaller.')
      setErrors(current => ({ ...current, logoFile: 'The logo must be 2 MB or smaller.' }))
      return
    }
    setLogoFileError('')
    setErrors(current => ({ ...current, logoFile: '' }))
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setServerError('')
    setPartialNotice('')
  }

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
  }, [logoPreview])

  const save = async event => {
    event?.preventDefault?.()
    if (saving) return
    const nextErrors = validate()
    setErrors(nextErrors)
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) {
      setActiveStep(fieldStep[firstInvalid] ?? 0)
      return
    }
    if (!canEditProfile || collegeId !== assignedId) {
      setServerError('This account can edit only its assigned college when the server granted the college edit permission.')
      return
    }

    const payload = {}
    for (const [key, apiField, transform] of profileFieldMap) {
      const current = key === 'collegeType' && values.collegeType === 'Others' && values.collegeTypeOther.trim()
        ? values.collegeTypeOther
        : values[key] ?? ''
      const original = key === 'collegeType' && originalValues.current.collegeType === 'Others' && originalValues.current.collegeTypeOther.trim()
        ? originalValues.current.collegeTypeOther
        : originalValues.current[key] ?? ''
      if (String(current) !== String(original)) payload[apiField] = transform(current)
    }
    if (!Object.keys(payload).length && !logoFile) {
      onDismiss?.()
      return
    }

    setSaving(true)
    setServerError('')
    setPartialNotice('')
    try {
      if (Object.keys(payload).length) {
        await updateCollegeProfile(collegeId, payload)
        originalValues.current = { ...values }
      }
      if (logoFile) {
        try {
          await uploadCollegeLogo(collegeId, logoFile)
        } catch (uploadError) {
          setPartialNotice('College details were saved, but the logo upload failed: ' + friendlySaveError(uploadError) + ' The form is still open so you can retry.')
          return
        }
      }
      showSuccess('College profile updated successfully.')
      onSaved?.()
    } catch (error) {
      setServerError(friendlySaveError(error))
    } finally {
      setSaving(false)
    }
  }

  const field = (key, label, options = {}) => {
    const id = 'college-profile-editor-' + key
    const editable = options.editable !== false && canEditProfile
    const message = errors[key] || options.hint || ''
    const describedBy = message ? id + '-hint' : undefined
    const common = {
      id,
      name: key,
      value: values[key] ?? '',
      disabled: !editable && options.control === 'select',
      readOnly: !editable && options.control !== 'select',
      'aria-invalid': Boolean(errors[key]),
      'aria-describedby': describedBy,
      list: options.datalist?.length ? id + '-options' : undefined,
      onChange: event => editable && setValue(key, event.target.value),
    }
    return <label key={key} className={'college-profile-editor__field' + (options.wide ? ' is-wide' : '') + (!editable ? ' is-readonly' : '')} htmlFor={id}>
      <span>{label}{options.required && <b aria-hidden="true"> *</b>}{!editable && <em title={options.managed ? 'Managed by the Super Admin' : 'Editing is not available'}>{options.managed ? 'Managed' : 'Locked'}</em>}</span>
      {options.control === 'textarea'
        ? <textarea {...common} rows={options.rows || 3} maxLength={options.maxLength} />
        : options.control === 'select'
          ? <select {...common}>{(options.options || []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          : <input {...common} type={options.type || 'text'} maxLength={options.maxLength} inputMode={options.inputMode} autoComplete={options.autoComplete} />}
      {options.datalist?.length > 0 && <datalist id={id + '-options'}>{options.datalist.map(office => <option key={office.name + '-' + office.district} value={office.name}>{[office.city, office.district, office.state].filter(Boolean).join(', ')}</option>)}</datalist>}
      {message && <small id={describedBy} className={errors[key] ? 'is-error' : ''} role={errors[key] ? 'alert' : undefined}>{message}</small>}
    </label>
  }

  const renderLogoPreview = () => <div className="college-profile-editor__logo-preview" aria-label="College logo preview">
    {(logoPreview || savedLogoPreview)
      ? <img src={logoPreview || savedLogoPreview} alt="College logo preview" />
      : <Building2 size={32} aria-hidden="true" />}
  </div>

  const renderLogoCard = () => <section className="college-profile-editor__logo-card" aria-label="College logo">
    {renderLogoPreview()}
    <div className="college-profile-editor__logo-copy">
      <strong>College logo</strong>
      <small className="college-profile-editor__logo-filename">{logoFile ? logoFile.name : values.logo ? joinName(values.logo) : 'No college logo uploaded'}</small>
      <span>JPG or PNG · up to 2 MB</span>
      <div className="college-profile-editor__logo-actions">
        <button type="button" className="erp-btn erp-btn--secondary" onClick={() => fileInput.current?.click()} disabled={saving || !canEditProfile}>
          <Upload size={15} aria-hidden="true" /> {values.logo || logoFile ? 'Replace logo' : 'Upload logo'}
        </button>
      </div>
      {values.logo && <small>Logo removal is not available through the current API.</small>}
      <input ref={fileInput} className="college-profile-editor__file-input" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={chooseLogo} aria-label="Upload college logo" disabled={saving || !canEditProfile} />
      {errors.logoFile && <small className="college-profile-editor__error" role="alert">{errors.logoFile}</small>}
    </div>
  </section>

  const stepContent = () => {
    if (activeStep === 0) return <>
      <div className="college-profile-editor__section-heading"><div><h3>College Details</h3><p>Core identity, affiliation and the logo shown across your portal.</p></div></div>
      <div className="college-profile-editor__identity-layout">
        <div className="college-profile-editor__grid">
          {field('collegeName', 'College Name', { required: true, maxLength: 200 })}
          {field('collegeCode', 'College Code', { required: true, maxLength: 50 })}
          {field('collegeType', 'Institution Type', {
            control: 'select',
            options: [
              { value: '', label: 'Select type' },
              ...collegeTypes.map(type => ({ value: type, label: type })),
              ...(values.collegeType && !collegeTypes.includes(values.collegeType) ? [{ value: values.collegeType, label: values.collegeType }] : []),
            ],
          })}
          {values.collegeType === 'Others' && field('collegeTypeOther', 'Specify Institution Type', { maxLength: 60 })}
          {field('affiliatedUniversity', 'University Name', { maxLength: 200 })}
        </div>
        <aside className="college-profile-editor__identity-logo">{renderLogoCard()}</aside>
      </div>
    </>

    if (activeStep === 1) return <>
      <div className="college-profile-editor__section-heading"><div><h3>Address</h3><p>Official postal address of the college.</p></div></div>
      <div className="college-profile-editor__grid">
        {field('addressLine1', 'Address Line 1', { maxLength: 255, hint: 'Building, street, locality' })}
        {field('addressLine2', 'Land Mark', { maxLength: 255, hint: 'Landmark or area (optional)' })}
        {field('city', 'City', { maxLength: 100, autoComplete: 'address-level2' })}
        {field('state', 'State', { maxLength: 100, autoComplete: 'address-level1' })}
        {field('pincode', 'Pincode', { maxLength: 10, inputMode: 'numeric', autoComplete: 'postal-code', hint: pincodeLoading ? 'Looking up post offices…' : pincodeStatus || '' })}
        {field('country', 'Country', { maxLength: 100, autoComplete: 'country-name' })}
        {field('area', 'Area / Post Office', { maxLength: 150, datalist: postOffices, hint: pincodeLoading ? 'Looking up post offices…' : pincodeStatus || 'Enter pincode first' })}
        {field('district', 'District', { maxLength: 100 })}
      </div>
    </>

    if (activeStep === 2) return <>
      <div className="college-profile-editor__section-heading"><div><h3>Contact Information</h3><p>Public college contact channels.</p></div></div>
      <div className="college-profile-editor__grid">
        {field('mobile', 'Official Contact Number', { type: 'tel', maxLength: 20, autoComplete: 'tel', hint: 'Mobile or landline with STD code' })}
        {field('alternatePhone', 'Alternate Contact Number', { type: 'tel', maxLength: 10, inputMode: 'numeric', hint: 'Optional alternate mobile or landline' })}
        {field('email', 'Official Email', { type: 'email', maxLength: 150, autoComplete: 'email', hint: 'office@college.edu' })}
        {field('website', 'Website', { type: 'url', maxLength: 255, hint: 'https://college.edu' })}
      </div>
    </>

    if (activeStep === 3) return <>
      <div className="college-profile-editor__section-heading"><div><h3>Administration</h3><p>Principal or institutional head details.</p></div></div>
      <div className="college-profile-editor__grid">
        {field('principal', 'Principal Name', { maxLength: 200 })}
        {field('principalEmail', 'Principal Email', { type: 'email', maxLength: 150 })}
        {field('principalContact', 'Principal Contact Number', { type: 'tel', maxLength: 10, inputMode: 'numeric' })}
      </div>
      <p className="college-profile-editor__managed-note">Administrator accounts, role assignments and subscriptions are managed separately.</p>
    </>

    if (activeStep === 4) return <>
      <div className="college-profile-editor__section-heading"><div><h3>Accreditation Details</h3><p>Current accreditation standing and validity.</p></div></div>
      <section className="college-profile-editor__group">
        <div className="college-profile-editor__grid">
          {field('accreditationStatus', 'Accreditation Status', { control: 'select', options: [{ value: '', label: 'Select Accreditation Status' }, ...accreditationStatuses.map(value => ({ value, label: value }))] })}
          {field('accreditationBody', 'Accreditation Body', { maxLength: 80, hint: 'e.g. NAAC or NBA' })}
          {field('accreditationGrade', 'Accreditation Grade', { maxLength: 20, hint: 'e.g. A+' })}
          {field('accreditationNumber', 'Accreditation Number', { maxLength: 50 })}
          {field('validFrom', 'Valid From', { type: 'date' })}
          {field('validUntil', 'Valid Until', { type: 'date' })}
        </div>
      </section>
    </>

    const missingRequired = requiredFields.filter(item => !String(values[item.key] || '').trim())
    const summaries = [
      {
        title: 'College',
        step: 0,
        fields: [['College Name', 'collegeName'], ['College Code', 'collegeCode'], ['Institution Type', values.collegeType === 'Others' && values.collegeTypeOther.trim() ? 'collegeTypeOther' : 'collegeType'], ['University Name', 'affiliatedUniversity']],
      },
      {
        title: 'Address',
        step: 1,
        fields: [['Address Line 1', 'addressLine1'], ['Land Mark', 'addressLine2'], ['City', 'city'], ['State', 'state'], ['Pincode', 'pincode'], ['Country', 'country'], ['Area / Post Office', 'area'], ['District', 'district']],
      },
      {
        title: 'Contact',
        step: 2,
        fields: [['Official Contact Number', 'mobile'], ['Alternate Contact Number', 'alternatePhone'], ['Official Email', 'email'], ['Website', 'website']],
      },
      {
        title: 'Admin',
        step: 3,
        fields: [['Principal Name', 'principal'], ['Principal Email', 'principalEmail'], ['Principal Contact Number', 'principalContact']],
      },
      {
        title: 'Accreditation',
        step: 4,
        fields: [['Accreditation Status', 'accreditationStatus'], ['Accreditation Body', 'accreditationBody'], ['Accreditation Grade', 'accreditationGrade'], ['Accreditation Number', 'accreditationNumber'], ['Valid From', 'validFrom'], ['Valid Until', 'validUntil']],
      },
    ]
    return <>
      <div className="college-profile-editor__section-heading"><div><h3>Review college profile</h3><p>Confirm the supported profile details before saving.</p></div></div>
      <section className={'college-profile-editor__required' + (missingRequired.length ? ' has-missing' : '')} aria-live="polite">
        <strong>{missingRequired.length ? 'Missing required fields' : 'Required fields complete'}</strong>
        {missingRequired.length
          ? <span>{missingRequired.map(item => item.label).join(', ')}</span>
          : <span>All required fields are filled.</span>}
      </section>
      <div className="college-profile-editor__review-list">
        {summaries.map(section => <section className="college-profile-editor__review-section" key={section.title}>
          <header><h4>{section.title}</h4><button type="button" className="college-profile-editor__edit-section" aria-label={'Edit ' + section.title} onClick={() => setActiveStep(section.step)}>Edit Section</button></header>
          <dl>{section.fields.map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{String(values[key] || '').trim() || 'Not provided'}</dd></div>)}</dl>
        </section>)}
        <section className="college-profile-editor__review-section college-profile-editor__review-logo">
          <header><h4>College Logo</h4><button type="button" className="college-profile-editor__edit-section" aria-label="Edit College Identity" onClick={() => setActiveStep(0)}>Edit Section</button></header>
          <div className="college-profile-editor__review-logo-content">{renderLogoPreview()}<span>{logoFile ? logoFile.name : values.logo ? joinName(values.logo) : 'No college logo uploaded'}</span></div>
        </section>
      </div>
    </>
  }

  const footer = <div className="college-profile-editor__footer">
    <span className="college-profile-editor__step-count">Step {activeStep + 1} of {steps.length}</span>
    <div className="college-profile-editor__footer-actions">
      <button type="button" className="erp-btn erp-btn--secondary" onClick={requestClose} disabled={saving}>Cancel</button>
      <button type="button" className="erp-btn erp-btn--secondary" onClick={() => setActiveStep(index => Math.max(0, index - 1))} disabled={activeStep === 0 || saving}><ChevronLeft size={16} /> Previous</button>
      {activeStep < steps.length - 1 && <button type="button" className="erp-btn erp-btn--secondary" onClick={skipCurrentStep} disabled={saving}>Skip</button>}
      <button type="submit" form="college-profile-editor-form" className="erp-btn erp-btn--secondary" disabled={saving || !canEditProfile}>{saving ? 'Saving…' : 'Save & Continue Later'}</button>
      {activeStep < steps.length - 1
        ? <button type="button" className="erp-btn erp-btn--primary" onClick={moveNext} disabled={saving}>Next <ChevronRight size={16} /></button>
        : <button type="submit" form="college-profile-editor-form" className="erp-btn erp-btn--primary" disabled={saving || !canEditProfile}>{saving ? 'Saving…' : 'Save Changes'}</button>}
    </div>
  </div>

  return <ViewDialog
    title="Edit College"
    subtitle="Update college details"
    className="college-profile-editor-dialog"
    maxWidth="980px"
    onClose={requestClose}
    busy={saving}
    showExport={false}
    footerContent={footer}
  >
    <div className="college-profile-editor">
      {!canEditProfile && <div className="college-profile-editor__error" role="alert">Editing is unavailable. Confirm that this is your assigned college and that the server granted the college edit permission.</div>}
      {serverError && <div className="college-profile-editor__error" role="alert">{serverError}</div>}
      {partialNotice && <div className="college-profile-editor__notice" role="alert">{partialNotice}</div>}
      <nav className="college-profile-editor__stepper" aria-label="College profile sections">
        {steps.map((step, index) => {
          const active = index === activeStep
          const complete = completedSteps.has(index)
          return <button key={step.title} type="button" className={'college-profile-editor__step' + (active ? ' is-active' : '') + (complete ? ' is-complete' : '')} onClick={() => setActiveStep(index)} aria-current={active ? 'step' : undefined} aria-label={step.title + ', ' + (active ? 'current step' : complete ? 'completed' : 'incomplete')}>
            <span className="college-profile-editor__step-icon">{complete || active ? <Check size={15} aria-hidden="true" /> : <span>{index + 1}</span>}</span>
            <span className="college-profile-editor__step-label"><strong>{step.title}</strong><small>{step.description}</small></span>
          </button>
        })}
      </nav>
      <form id="college-profile-editor-form" onSubmit={save} noValidate>
        <div className="college-profile-editor__step-content" key={activeStep}>
          {stepContent()}
        </div>
      </form>
      {confirmDiscard && <div className="college-profile-editor__discard-layer"><section role="alertdialog" aria-modal="true" aria-labelledby="college-profile-discard-title"><div className="college-profile-editor__discard-icon"><X size={20} /></div><h3 id="college-profile-discard-title">Discard unsaved changes?</h3><p>Your college profile edits will be lost.</p><footer><button type="button" className="erp-btn erp-btn--secondary" autoFocus onClick={() => setConfirmDiscard(false)}>Continue Editing</button><button type="button" className="erp-btn erp-btn--primary" onClick={() => { setConfirmDiscard(false); onDismiss?.() }}>Discard Changes</button></footer></section></div>}
    </div>
  </ViewDialog>
}
