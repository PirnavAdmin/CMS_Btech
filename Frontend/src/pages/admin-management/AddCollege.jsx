import { collegeLogoValue } from '../../utils/collegeLogo'
import { rememberCreated } from '../../utils/newestFirst'
import useToastState from '../../hooks/useToastState'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiCheck } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import SearchableSelect from '../../components/SearchableSelect'
import { cacheCollegeLogo, createCollege, fetchCollegeLogo, getCollegeById, getCollegeLogoUrl, getColleges, isBackendCollegeLogo, isValidWebsite, normalizeWebsite, readCachedCollegeLogo, readCollegeExtendedDetails, unwrapCollegeRecord, updateCollege, uploadCollegeLogo, WEBSITE_VALIDATION_MESSAGE } from '../../auth/collegeApi'
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
  accreditationBody: '', accreditationStatus: '', accreditationGrade: '',
  accreditationNumber: '', validFrom: '', validUntil: '', startDate: '', endDate: '',
}
const requiredDraftFields = ['collegeName', 'collegeCode', 'collegeType', 'universityName', 'addressLine1', 'city', 'state', 'pincode', 'contactNumber', 'email', 'principalName']
const draftKey = (editId) => `pirnav-college-draft-${editId || 'new'}`
const draftProgress = (values) => Math.round(requiredDraftFields.filter((field) => String(values[field] || '').trim()).length / requiredDraftFields.length * 100)

const phonePattern = /^[6-9]\d{9}$/
const contactPattern = /^(?:[6-9]\d{9}|0[1-9]\d{7,9}|[1-9]\d{7,10})$/
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/
const codePattern = /^[A-Z0-9]{2,12}$/
const personNamePattern = /^[a-zA-Z\s.'-]+$/
const institutionNamePattern = /^[a-zA-Z\s.,&'()-]+$/

const getApiErrorMessage = (error) => {
  const data = error?.response?.data
  let parsedData = data
  if (typeof data === 'string') {
    try { parsedData = JSON.parse(data) } catch { parsedData = null }
  }
  const rawError = `${typeof data === 'string' ? data : ''} ${error?.message || ''}`
  const validationFields = parsedData && typeof parsedData === 'object' ? Object.keys(parsedData.errors || {}) : []
  if (/PrincipalEmail/i.test(rawError)) return 'Please enter a valid principal email address.'
  if (validationFields.some((field) => field.toLowerCase() === 'principalemail')) return 'Please enter a valid principal email address.'
  if (validationFields.length) return 'Please check the entered college details and try again.'
  const apiMessage = parsedData && typeof parsedData === 'object'
    ? parsedData.message || parsedData.error || (parsedData.title === 'One or more validation errors occurred.' ? '' : parsedData.title) || parsedData.detail
    : typeof data === 'string' && !/^\s*[{[]/.test(data) ? data : ''
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
  else if (/\d/.test(name) || !institutionNamePattern.test(name)) errors.collegeName = 'College name cannot contain numbers.'
  else if (name.length < 3 || name.length > 120) errors.collegeName = 'Use between 3 and 120 characters.'
  if (!values.collegeCode) errors.collegeCode = 'College code is required.'
  else if (!codePattern.test(values.collegeCode)) errors.collegeCode = 'Use 2–12 uppercase letters and numbers only.'
  if (!values.collegeType) errors.collegeType = 'Select a college type.'
  else if (values.collegeType === 'Other' && !values.collegeTypeOther.trim()) errors.collegeTypeOther = 'Enter the college type.'
  const university = values.universityName.trim()
  if (!university) errors.universityName = 'University name is required.'
  else if (/\d/.test(university) || !institutionNamePattern.test(university)) errors.universityName = 'University name cannot contain numbers.'
  else if (university.length < 3 || university.length > 120) errors.universityName = 'Use between 3 and 120 characters.'
  if (!values.addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required.'
  if (!values.city.trim()) errors.city = 'City is required.'
  else if (!personNamePattern.test(values.city.trim())) errors.city = 'City can only contain letters and spaces.'
  if (!values.state.trim()) errors.state = 'State is required.'
  else if (!personNamePattern.test(values.state.trim())) errors.state = 'State can only contain letters and spaces.'
  if (!/^[1-9]\d{5}$/.test(values.pincode.trim())) errors.pincode = 'Enter a valid 6-digit Indian pincode (cannot start with 0).'
  const cleanContact = String(values.contactNumber || '').replace(/\D/g, '')
  if (!cleanContact) errors.contactNumber = 'Official contact number is required.'
  else if (!contactPattern.test(cleanContact)) errors.contactNumber = 'Enter a valid 10-digit mobile number or landline number with STD code.'
  const cleanAltContact = String(values.alternateContactNumber || '').replace(/\D/g, '')
  if (values.alternateContactNumber && !contactPattern.test(cleanAltContact)) errors.alternateContactNumber = 'Enter a valid 10-digit mobile number or landline number with STD code.'
  if (!values.email.trim()) errors.email = 'Official email is required.'
  else if (!emailPattern.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!values.principalName.trim()) errors.principalName = 'Principal name is required.'
  else if (!personNamePattern.test(values.principalName.trim())) errors.principalName = 'Principal name can only contain letters, spaces, and dots.'
  else if (values.principalName.trim().length < 2) errors.principalName = 'Principal name must be at least 2 characters.'
  const website = normalizeWebsite(values.website)
  if (values.website.trim() && !isValidWebsite(website)) errors.website = WEBSITE_VALIDATION_MESSAGE
  if (!values.principalEmail.trim()) errors.principalEmail = 'Principal email is required.'
  else if (!emailPattern.test(values.principalEmail.trim())) errors.principalEmail = 'Enter a valid email address.'
  if (!values.principalContact) errors.principalContact = 'Principal contact number is required.'
  else if (!phonePattern.test(values.principalContact)) errors.principalContact = 'Enter a valid 10-digit Indian mobile number.'
  if (values.validFrom && values.validUntil && values.validUntil <= values.validFrom) errors.validUntil = 'Valid until must be after valid from.'
  return errors
}

function Field({ label, name, values, errors, touched, onChange, required, maxLength, ...props }) {
  const error = (touched?.[name] || Boolean(values?.[name])) && errors?.[name]
  return <label className="ac-field" htmlFor={`ac-${name}`}>
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    <input id={`ac-${name}`} name={name} value={values[name]} onChange={onChange} required={required} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? `ac-${name}-error` : undefined} {...props} />
    {maxLength && <small className="ac-counter">{values[name].length}/{maxLength}</small>}
    {error && <small id={`ac-${name}-error`} className="ac-error" role="alert">{error}</small>}
  </label>
}

function Dialog({ title, children, actions, onClose, labelledBy = 'ac-dialog-title' }) {
  return <div className="ac-dialog-layer" role="presentation"><div className="ac-dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
    <button type="button" className="ac-dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
    <h2 id={labelledBy}>{title}</h2>{children}<div className="ac-dialog-actions">{actions}</div>
  </div></div>
}

export default function AddCollege() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const fileRef = useRef(null)
  const logoObjectUrlRef = useRef('')
  const tabsNavRef = useRef(null)
  const [storedValues, setValues] = useState(initialValues)
  const values = storedValues.collegeType === 'Deemed University'
    ? { ...storedValues, universityName: storedValues.collegeName }
    : storedValues
  const [logoFile, setLogoFile] = useState(null)
  const [removeExistingLogo, setRemoveExistingLogo] = useState(false)
  const [pendingLogoCollegeId, setPendingLogoCollegeId] = useState(null)
  const [existingCollegeCodes, setExistingCollegeCodes] = useState([])
  const [existingColleges, setExistingColleges] = useState([])
  const [touched, setTouched] = useState({})
  const [logoError, setLogoError] = useToastState('', 'error')
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [, setNotice] = useToastState('', 'success')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState(editId ? 'college' : 'college')
  const [highestUnlockedTab, setHighestUnlockedTab] = useState(editId ? FORM_TABS.length - 1 : 0)
  const [loadingCollege, setLoadingCollege] = useState(Boolean(editId))
  const [postOffices, setPostOffices] = useState([])
  const [pincodeStatus, setPincodeStatus] = useState('')
  const [saved, setSaved] = useState(false)
  const redirectTimer = useRef(null)
  const originalEditValues = useRef(null)
  const errors = validate(values)
  const normalizeDuplicate = (value) => String(value || '').trim().toLowerCase()
  const currentId = normalizeDuplicate(editId)
  const currentCode = normalizeDuplicate(values.collegeCode)
  const original = originalEditValues.current || {}
  const changedFromOriginal = (field) => !editId || normalizeDuplicate(values[field]) !== normalizeDuplicate(original[field])
  const duplicateCandidates = existingColleges.filter((college) => {
    const collegeId = normalizeDuplicate(college.id ?? college.collegeId ?? college.CollegeId ?? college.Id)
    const collegeCode = normalizeDuplicate(college.code ?? college.collegeCode ?? college.CollegeCode)
    const isCurrentById = currentId && collegeId === currentId
    const isCurrentByCode = editId && currentCode && collegeCode === currentCode
    return !isCurrentById && !isCurrentByCode
  })
  const duplicateCode = normalizeDuplicate(values.collegeCode) && duplicateCandidates.some((college) => normalizeDuplicate(college.code ?? college.collegeCode) === normalizeDuplicate(values.collegeCode))
  const duplicateName = changedFromOriginal('collegeName') && normalizeDuplicate(values.collegeName) && duplicateCandidates.some((college) => normalizeDuplicate(college.name ?? college.collegeName) === normalizeDuplicate(values.collegeName))
  const duplicateEmail = changedFromOriginal('email') && normalizeDuplicate(values.email) && duplicateCandidates.some((college) => normalizeDuplicate(college.email ?? college.collegeEmail) === normalizeDuplicate(values.email))
  const duplicateContact = changedFromOriginal('contactNumber') && normalizeDuplicate(values.contactNumber) && duplicateCandidates.some((college) => normalizeDuplicate(college.contact ?? college.contactNumber ?? college.phoneNumber) === normalizeDuplicate(values.contactNumber))
  const identityChanged = ['collegeName', 'addressLine1', 'city', 'state', 'pincode'].some(changedFromOriginal)
  const duplicateIdentity = identityChanged && [values.collegeName, values.addressLine1, values.city, values.state, values.pincode].every((value) => normalizeDuplicate(value)) && duplicateCandidates.some((college) => [college.name ?? college.collegeName, college.addressLine1 ?? college.address, college.city, college.state, college.pincode].map(normalizeDuplicate).join('|') === [values.collegeName, values.addressLine1, values.city, values.state, values.pincode].map(normalizeDuplicate).join('|'))
  const duplicateReason = duplicateName ? 'A college with this name already exists.' : duplicateCode ? 'This college code already exists.' : duplicateEmail ? 'This college email already exists.' : duplicateContact ? 'This college contact number already exists.' : duplicateIdentity ? 'A college with the same name and address already exists.' : ''
  const duplicateTab = duplicateName || duplicateCode ? 'college' : duplicateIdentity ? 'address' : duplicateEmail || duplicateContact ? 'contact' : ''
  const duplicateReasonForTab = activeTab === 'college'
    ? (duplicateName ? 'A college with this name already exists.' : duplicateCode ? 'This college code already exists.' : '')
    : activeTab === 'address'
      ? (duplicateIdentity ? 'A college with the same name, university, and address already exists.' : '')
      : activeTab === 'contact'
        ? (duplicateEmail ? 'This college email already exists.' : duplicateContact ? 'This college contact number already exists.' : '')
        : ''
  const hasDuplicate = Boolean(duplicateReason)
  const isValid = Object.keys(errors).length === 0 && !logoError && !hasDuplicate
  const firstInvalidTab = duplicateTab || FORM_TABS.find((tab) => TAB_FIELDS[tab.id]?.some((field) => errors[field]))?.id || ''
  const invalidMessage = duplicateReason || Object.values(errors)[0] || logoError || 'Please complete the highlighted fields before continuing.'
  const progress = draftProgress(values)

  useEffect(() => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current)
      logoObjectUrlRef.current = ''
    }
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
    if (!editId) {
      originalEditValues.current = null
      setValues({ ...initialValues })
      return undefined
    }
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
      const loadedLogo = collegeLogoValue(record) || readCachedCollegeLogo(editId) || (record.code ? readCachedCollegeLogo(record.code) : '') || (record.collegeCode ? readCachedCollegeLogo(record.collegeCode) : '') || (record.name ? readCachedCollegeLogo(record.name) : '') || (record.collegeName ? readCachedCollegeLogo(record.collegeName) : '') || ''
      const logoUrl = getCollegeLogoUrl(editId, loadedLogo)
      // Backend logo URLs need an authorization header, which an <img> element
      // cannot send. They are fetched below and displayed as a blob URL.
      const resolvedLogo = logoUrl && !isBackendCollegeLogo(logoUrl) ? logoUrl : ''
      const loadedValues = { ...initialValues, collegeName: record.name ?? record.collegeName ?? record.CollegeName ?? '', collegeCode: record.code ?? record.collegeCode ?? record.CollegeCode ?? '', collegeType: rawType && !isKnownType ? 'Other' : rawType, collegeTypeOther: rawType && !isKnownType ? rawType : '', universityName: record.university ?? record.universityName ?? record.UniversityName ?? '', addressLine1: record.addressLine1 ?? addressRecord.addressLine1 ?? addressParts[0] ?? '', addressLine2: record.addressLine2 ?? addressRecord.addressLine2 ?? addressParts.slice(1).join(', '), area: record.area ?? addressRecord.area ?? extended.area ?? '', district: record.district ?? addressRecord.district ?? extended.district ?? '', city: record.city ?? addressRecord.city ?? record.City ?? '', state: record.state ?? addressRecord.state ?? record.State ?? '', pincode: String(record.pincode ?? addressRecord.pincode ?? record.Pincode ?? ''), country: record.country ?? addressRecord.country ?? 'India', contactNumber: String(record.contact ?? record.contactNumber ?? record.phoneNumber ?? record.mobile ?? record.phone ?? contactRecord.contactNumber ?? contactRecord.phoneNumber ?? contactRecord.mobile ?? contactRecord.phone ?? record.Contact ?? ''), alternateContactNumber: String(record.alternateContact ?? record.alternateContactNumber ?? record.alternatePhoneNumber ?? contactRecord.alternateContactNumber ?? extended.alternateContactNumber ?? ''), email: record.email ?? record.collegeEmail ?? contactRecord.email ?? record.Email ?? '', website: record.website ?? record.Website ?? contactRecord.website ?? contactRecord.Website ?? '', principalName: record.principal ?? record.principalName ?? principalRecord.principalName ?? record.PrincipalName ?? '', principalEmail: record.principalEmail ?? principalRecord.principalEmail ?? extended.principalEmail ?? '', principalContact: String(record.principalContact ?? record.principalPhone ?? principalRecord.principalContact ?? extended.principalContact ?? ''), accreditationBody: record.accreditationBody ?? accreditationRecord.body ?? accreditationRecord.accreditationBody ?? extended.accreditationBody ?? '', accreditationStatus: record.accreditationStatus ?? accreditationRecord.status ?? '', accreditationGrade: record.accreditationGrade ?? accreditationRecord.grade ?? extended.accreditationGrade ?? '', accreditationNumber: record.accreditationNumber ?? accreditationRecord.number ?? extended.accreditationNumber ?? '', validFrom: dateInputValue(record.validFrom ?? record.accreditationValidFrom ?? accreditationRecord.validFrom ?? extended.validFrom), validUntil: dateInputValue(record.validUntil ?? record.accreditationValidUntil ?? accreditationRecord.validUntil ?? extended.validUntil), logo: resolvedLogo, logoName: record.logoName ?? extended.logoName ?? '' }
      setValues(loadedValues)
      originalEditValues.current = loadedValues
      if (logoUrl && isBackendCollegeLogo(logoUrl)) {
        fetchCollegeLogo(logoUrl).then((blob) => {
          if (!active) return
          const objectUrl = URL.createObjectURL(blob)
          logoObjectUrlRef.current = objectUrl
          setValues((current) => ({ ...current, logo: objectUrl }))
          originalEditValues.current = { ...originalEditValues.current, logo: objectUrl }
        }).catch(() => {
          // Some deployments expose the logo URL to the browser but reject a
          // cross-origin fetch. Let the image element make that final request
          // instead of hiding an existing saved logo.
          if (active) setValues((current) => ({ ...current, logo: logoUrl }))
        })
      }
    }).catch((error) => { if (active) setNotice(error.message || 'Unable to load college details.', 'error') }).finally(() => { if (active) setLoadingCollege(false) })
    return () => {
      active = false
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current)
        logoObjectUrlRef.current = ''
      }
    }
  }, [editId, setNotice])

  useEffect(() => {
    if (!dirty) return
    localStorage.setItem(draftKey(editId), JSON.stringify({ values, activeTab, progress: draftProgress(values), savedAt: new Date().toISOString() }))
  }, [values, activeTab, dirty, editId])

  useEffect(() => {
    getColleges()
      .then((response) => {
        const records = response?.data?.data ?? response?.data ?? response
        const colleges = Array.isArray(records) ? records : Array.isArray(records?.items) ? records.items : []
        setExistingColleges(colleges)
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
        setValues((current) => ({ ...current, area: current.area || first.Name || '', district: current.district || first.District || '', city: current.city || first.Block || first.District || '', state: current.state || first.State || '', country: current.country || first.Country || 'India' }))
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
    if (['pincode', 'principalContact'].includes(name)) next = value.replace(/\D/g, '').slice(0, name === 'pincode' ? 6 : 10)
    if (['contactNumber', 'alternateContactNumber'].includes(name)) next = value.replace(/\D/g, '').slice(0, 12)
    if (['principalName', 'city', 'state', 'district'].includes(name)) next = value.replace(/[^a-zA-Z\s.'-]/g, '')
    if (['collegeName', 'universityName'].includes(name)) next = value.replace(/[0-9]/g, '')
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
    if (file.size > 2 * 1024 * 1024) {
      setLogoFile(null)
      setValues((current) => ({ ...current, logo: '', logoName: '' }))
      if (fileRef.current) fileRef.current.value = ''
      setLogoError('Logo must be 2 MB or smaller. Save was stopped.')
      setDirty(true)
      return
    }
    setLogoFile(file)
    setRemoveExistingLogo(false)
    const reader = new FileReader()
    reader.onload = () => { setValues((current) => ({ ...current, logo: reader.result, logoName: file.name })); setDirty(true) }
    reader.onerror = () => { setLogoFile(null); setLogoError('The image could not be read. Please try another file.') }
    reader.readAsDataURL(file)
  }

  const touchAll = () => setTouched(Object.keys(initialValues).reduce((all, key) => ({ ...all, [key]: true }), {}))
  const reset = () => { setValues(initialValues); setLogoFile(null); setRemoveExistingLogo(false); setPendingLogoCollegeId(null); setTouched({}); setLogoError(''); setDirty(false); setActiveTab('college'); setHighestUnlockedTab(0); setDialog(null); setNotice('Form reset successfully.') }
  const saveDraft = () => { localStorage.setItem(draftKey(editId), JSON.stringify({ values, activeTab, progress: draftProgress(values), savedAt: new Date().toISOString() })) }
  const requestLeave = () => { if (dirty) { saveDraft(); setNotice(`Draft saved · ${progress}% complete.`); setDialog('leave'); return } navigate('/college-institution-management') }
  const showTab = (tabId) => {
    setActiveTab(tabId)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  const goPrevious = () => {
    const currentIndex = FORM_TABS.findIndex((tab) => tab.id === activeTab)
    if (currentIndex > 0) {
      showTab(FORM_TABS[currentIndex - 1].id)
    }
  }

  useEffect(() => {
    if (tabsNavRef.current) {
      const navContainer = tabsNavRef.current
      const activeButton = navContainer.querySelector('button.active')
      if (activeButton) {
        const offsetLeft = activeButton.offsetLeft
        const buttonWidth = activeButton.offsetWidth
        const containerWidth = navContainer.clientWidth
        const targetScrollLeft = offsetLeft - (containerWidth / 2) + (buttonWidth / 2)

        navContainer.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth',
        })
      }
    }
  }, [activeTab])
  const saveAndNext = () => {
    const fields = TAB_FIELDS[activeTab]
    setTouched((current) => fields.reduce((next, field) => ({ ...next, [field]: true }), { ...current }))
    if (duplicateReasonForTab) {
      setNotice(duplicateReasonForTab, 'warning')
      return
    }
    if (fields.some((field) => errors[field])) {
      setNotice(errors[fields.find((field) => errors[field])] || 'Please correct the highlighted fields before continuing.', 'warning')
      return
    }
    const currentIndex = FORM_TABS.findIndex((tab) => tab.id === activeTab)
    const nextIndex = currentIndex + 1
    if (nextIndex < FORM_TABS.length) {
      setHighestUnlockedTab((current) => Math.max(current, nextIndex))
      setActiveTab(FORM_TABS[nextIndex].id)
      setNotice('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const submit = async () => {
    touchAll()
    if (logoError || !isValid || submitting) { setDialog(null); return }
    setSubmitting(true)
    let collegeId = editId || pendingLogoCollegeId
    try {
      // Re-read the directory immediately before writing.  The form-level
      // checks are useful feedback, but this closes the gap when another user
      // creates the same college while this form is open.
      const latestResponse = await getColleges()
      const latestData = latestResponse?.data?.data ?? latestResponse?.data ?? latestResponse
      const latestColleges = Array.isArray(latestData) ? latestData : Array.isArray(latestData?.items) ? latestData.items : []
      const normalized = (item) => String(item || '').trim().toLowerCase()
      const duplicate = latestColleges.find((item) => {
        const itemId = normalized(item.id ?? item.collegeId)
        if (editId && itemId === normalized(editId)) return false
        return normalized(item.code ?? item.collegeCode) === normalized(values.collegeCode)
          || normalized(item.name ?? item.collegeName) === normalized(values.collegeName)
          || normalized(item.email ?? item.collegeEmail) === normalized(values.email)
          || normalized(item.contact ?? item.contactNumber ?? item.phoneNumber) === normalized(values.contactNumber)
      })
      if (duplicate) throw new Error('A college with the same name, code, email, or contact number already exists.')
      const website = normalizeWebsite(values.website)
      const college = {
        name: values.collegeName.trim(), code: values.collegeCode, type: values.collegeType === 'Other' ? values.collegeTypeOther.trim() : values.collegeType,
        university: values.universityName.trim(), address: [values.addressLine1, values.addressLine2].map(part => part.trim()).filter(Boolean).join(', '),
        addressLine1: values.addressLine1.trim(), addressLine2: values.addressLine2.trim(),
        area: values.area.trim(), district: values.district.trim(), country: values.country.trim(),
        city: values.city.trim(), state: values.state.trim(), pincode: values.pincode.trim(), contact: values.contactNumber,
        email: values.email.trim(), logo: values.logo || '', clearLogo: Boolean(editId && removeExistingLogo && !logoFile), logoName: values.logoName, principal: values.principalName.trim(),
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
      if (values.logo) {
        if (logoFile) {
          try {
            await uploadCollegeLogo(collegeId, logoFile)
          } catch (logoErr) {
            console.warn('Backend logo upload notice:', logoErr.message)
          }
        }
        // Persist the authenticated API endpoint, not the temporary data URL.
        // This keeps the sidebar logo working after a refresh or a new session.
        cacheCollegeLogo(collegeId, getCollegeLogoUrl(collegeId, ''), [values.collegeCode, values.collegeName, college?.code, college?.name])
      } else if (editId && removeExistingLogo) {
        cacheCollegeLogo(collegeId, '', [values.collegeCode, values.collegeName])
      }

      // The list route fetches from the backend when it mounts, so navigating
      // after the success message ensures the new row uses server data and the
      // list's established ordering and pagination rules.
      if (!editId) rememberCreated('colleges', collegeId)
      setDirty(false)
      localStorage.removeItem(draftKey(editId))
      setDialog(null)
      setSaved(true)
      setNotice(editId ? 'College updated successfully.' : 'College added successfully!')
      setPendingLogoCollegeId(null)
      if (!editId) {
        // Reset the wizard to its first step before clearing values. Otherwise
        // the Preview-tab validation sees the fresh blank form and incorrectly
        // raises a "College name is required" toast after a successful save.
        setActiveTab('college')
        setHighestUnlockedTab(0)
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
        : getApiErrorMessage(error), 'error')
      setDialog(null)
    }
    finally { setSubmitting(false) }
  }

  const section = (title, subtitle, content) => <section className="ac-section"><header><h2>{title}</h2><p>{subtitle}</p></header><div className="ac-grid">{content}</div></section>

  return <DashboardLayout><main className="add-college">
    <header className="ac-page-header"><div><h1>{editId ? 'Edit College' : 'Add College'}</h1><p>{editId ? 'Update the college information below.' : 'Create and configure a new college in the college management system.'}</p><span className="ac-draft-progress">Draft progress: <b>{progress}%</b></span></div><button className="ac-back" type="button" onClick={requestLeave}>College list →</button></header>
    {loadingCollege && <div className="ac-notice" role="status">Loading college details...</div>}
    <div className="college-form-layout">
      <form className="college-form-main" onSubmit={(event) => event.preventDefault()} noValidate>
        <nav ref={tabsNavRef} className="ac-tabs erp-tabs-bar" aria-label="College form sections" role="tablist">
          {FORM_TABS.map((tab, index) => {
            const isCompleted = index < highestUnlockedTab
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={index > highestUnlockedTab}
                disabled={index > highestUnlockedTab}
                className={isActive ? 'active' : isCompleted ? 'completed' : ''}
                onClick={() => showTab(tab.id)}
              >
                <span>{isCompleted ? <FiCheck /> : index + 1}</span>
                {tab.label}
              </button>
            )
          })}
        </nav>
        {activeTab === 'college' && <>
        {section('College Information', 'Core identity and affiliation details.', <>
          <Field label="College Name" name="collegeName" values={values} errors={{ ...errors, ...(duplicateName ? { collegeName: 'A college with this name already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={120} placeholder="e.g. Crescent Institute of Technology" />
          <Field label="College Code" name="collegeCode" values={values} errors={{ ...errors, ...(duplicateCode ? { collegeCode: 'This college code already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={12} placeholder="e.g. CIT2026" />
          <label className="ac-field" htmlFor="ac-collegeType"><span>College Type <b>*</b></span><select id="ac-collegeType" name="collegeType" value={values.collegeType} onChange={update} onBlur={() => setTouched((current) => ({ ...current, collegeType: true }))} aria-invalid={Boolean((touched.collegeType || Boolean(values.collegeType)) && errors.collegeType)}><option value="">Select type</option>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>{(touched.collegeType || Boolean(values.collegeType)) && errors.collegeType && <small className="ac-error" role="alert">{errors.collegeType}</small>}</label>
          {values.collegeType === 'Other' && <Field label="Specify College Type" name="collegeTypeOther" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} placeholder="e.g. Community College" />}
          <Field label="University Name" name="universityName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="Affiliated university" readOnly={values.collegeType === 'Deemed University'} />
          <Field label="Start Date" name="startDate" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          <Field label="End Date" name="endDate" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          <div className="ac-upload ac-span-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectLogo(e.dataTransfer.files[0]) }}>
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => selectLogo(e.target.files?.[0])} hidden />
            {values.logo ? (
              <div className="ac-logo-preview">
                <img src={values.logo} alt="College logo preview" onError={() => setValues((v) => ({ ...v, logo: '' }))} />
                <div>
                  <strong>{values.logoName || (logoFile ? logoFile.name : 'College logo')}</strong>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button type="button" className="ac-change-btn" onClick={() => fileRef.current?.click()}>Change image</button>
                    <button type="button" onClick={() => { setLogoFile(null); setRemoveExistingLogo(Boolean(editId)); setValues((v) => ({ ...v, logo: '', logoName: '' })); if (fileRef.current) fileRef.current.value = ''; setDirty(true) }}>Remove image</button>
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" className="ac-upload-button" onClick={() => fileRef.current?.click()}>
                <strong>Upload college logo</strong>
                <span>Click or drag and drop PNG, JPG, JPEG, or WEBP · Max 2 MB</span>
              </button>
            )}
            {logoError && <small className="ac-error" role="alert">{logoError}</small>}
          </div>
        </>)}
        </>}
        {activeTab === 'address' && <>
        {section('Address', 'Official postal address of the college.', <>
          <Field label="Address Line 1" name="addressLine1" values={values} errors={errors} touched={touched} onChange={update} required maxLength={150} placeholder="Building, street, locality" />
          <Field label="Land Mark" name="addressLine2" values={values} errors={errors} touched={touched} onChange={update} maxLength={150} placeholder="Landmark or area (optional)" />
          <Field label="City" name="city" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
          <Field label="State" name="state" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
          <Field label="Pincode" name="pincode" values={values} errors={errors} touched={touched} onChange={update} required maxLength={6} inputMode="numeric" />
          <Field label="Country" name="country" values={values} errors={errors} touched={touched} onChange={update} readOnly />
          <label className="ac-field" htmlFor="ac-area"><span>Area / Post Office</span><SearchableSelect label="Area / Post Office" value={values.area} options={postOffices.map((office) => ({ id: office.Name, name: office.Name, code: office.BranchType || '' }))} onChange={(value) => update({ target: { name: 'area', value } })} placeholder={postOffices.length ? 'Select area' : 'Enter pincode first'} searchPlaceholder="Search area..." noOptionsMessage="No area found." disabled={!postOffices.length} /></label>
          <Field label="District" name="district" values={values} errors={errors} touched={touched} onChange={update} maxLength={60} />
          {pincodeStatus && <p className="ac-lookup-status ac-span-2" role="status">{pincodeStatus}</p>}
        </>)}
        </>}
        {activeTab === 'contact' && section('Contact Information', 'Public college contact channels.', <>
          <Field label="Official Contact Number" name="contactNumber" values={values} errors={{ ...errors, ...(duplicateContact ? { contactNumber: 'This contact number already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={12} inputMode="tel" placeholder="Mobile or Landline with STD code" />
          <Field label="Alternate Contact Number" name="alternateContactNumber" values={values} errors={errors} touched={touched} onChange={update} maxLength={12} inputMode="tel" placeholder="Optional alternate mobile or landline" />
          <Field label="Official Email" name="email" type="email" values={values} errors={{ ...errors, ...(duplicateEmail ? { email: 'This college email already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={120} placeholder="office@college.edu" />
          <Field label="Website" name="website" type="url" values={values} errors={errors} touched={touched} onChange={update} onBlur={normalizeWebsiteField} maxLength={160} placeholder="https://college.edu" />
        </>)}
        {activeTab === 'administration' && section('Administration', 'Principal or institutional head details.', <>
          <Field label="Principal Name" name="principalName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={100} />
          <Field label="Principal Email" name="principalEmail" type="email" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} />
          <Field label="Principal Contact Number" name="principalContact" values={values} errors={errors} touched={touched} onChange={update} required maxLength={10} inputMode="tel" />
        </>)}
        {activeTab === 'accreditation' && section('Accreditation Details', 'Current accreditation standing and validity.', <>
          <label className="ac-field" htmlFor="ac-accreditationStatus"><span>Accreditation Status</span><select id="ac-accreditationStatus" name="accreditationStatus" value={values.accreditationStatus} onChange={update}><option value="">Select Accreditation Status</option>{ACCREDITATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <Field label="Accreditation Grade" name="accreditationGrade" values={values} errors={errors} touched={touched} onChange={update} maxLength={20} placeholder="e.g. A+" />
          <Field label="Accreditation Number" name="accreditationNumber" values={values} errors={errors} touched={touched} onChange={update} maxLength={50} />
          <Field label="Valid From" name="validFrom" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          <Field label="Valid Until" name="validUntil" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          {values.accreditationStatus === 'Accredited' && <p className="ac-hint ac-span-2">Complete the accreditation grade, number, and validity dates for a comprehensive record.</p>}
        </>)}
        <footer className="ac-actions ac-next-actions">
          {FORM_TABS.findIndex((tab) => tab.id === activeTab) > 0 && (
            <button type="button" className="ac-secondary" onClick={goPrevious}>
              ← Previous
            </button>
          )}
          {activeTab !== 'accreditation' ? (
            <button type="button" className="ac-primary" onClick={saveAndNext}>
              Save &amp; Next →
            </button>
          ) : (
            <button
              type="button"
              className="ac-primary"
              onClick={submit}
              disabled={!isValid || submitting || loadingCollege || saved}
            >
              {submitting ? 'Saving...' : saved ? 'Saved. Redirecting...' : editId ? 'Save Changes' : 'Submit College'}
            </button>
          )}
        </footer>
      </form>

      <aside className="college-live-preview" aria-label="College live preview">
        <header className="preview-top-bar">
          <span className="preview-live-tag">
            <span className="live-dot" /> LIVE PREVIEW
          </span>
          <span className="preview-sync-hint">Real-time sync</span>
        </header>
        <div className="preview-body-container">
          <div className="preview-hero">
            {values.logo ? (
              <img src={values.logo} alt="College Logo" className="college-preview-logo" />
            ) : (
              <div className="preview-hero-badge">
                {values.collegeCode ? values.collegeCode.slice(0, 4).toUpperCase() : (values.collegeName ? values.collegeName.slice(0, 4).toUpperCase() : 'COL')}
              </div>
            )}
            <div className="preview-hero-details">
              <h3 className="preview-course-title">{values.collegeName.trim() || 'College Preview'}</h3>
              <p className="preview-course-meta">{[values.collegeCode, values.collegeType === 'Other' ? values.collegeTypeOther : values.collegeType, values.universityName].filter(Boolean).join(' • ') || 'Affiliation & type details'}</p>
            </div>
          </div>

          {(() => {
            const collegeTypeDisplay = values.collegeType === 'Other' ? values.collegeTypeOther : values.collegeType
            const hasAddressInput = [values.addressLine1, values.addressLine2, values.area, values.district, values.city, values.state, values.pincode].some((v) => String(v || '').trim())
            const sections = [
              {
                title: 'College Information',
                fields: [
                  ['College Name', values.collegeName],
                  ['College Code', values.collegeCode],
                  ['College Type', collegeTypeDisplay],
                  ['University', values.universityName],
                  ['Start Date', values.startDate],
                  ['End Date', values.endDate],
                ],
              },
              {
                title: 'Address & Location',
                fields: [
                  ['Address Line 1', values.addressLine1],
                  ['Landmark', values.addressLine2],
                  ['Area / Post Office', values.area],
                  ['District', values.district],
                  ['City', values.city],
                  ['State', values.state],
                  ['Pincode', values.pincode],
                  ['Country', hasAddressInput ? values.country : ''],
                ],
              },
              {
                title: 'Contact Information',
                fields: [
                  ['Official Contact', values.contactNumber],
                  ['Alternate Contact', values.alternateContactNumber],
                  ['Official Email', values.email],
                  ['Website', values.website],
                ],
              },
              {
                title: 'Administration',
                fields: [
                  ['Principal Name', values.principalName],
                  ['Principal Email', values.principalEmail],
                  ['Principal Contact', values.principalContact],
                ],
              },
              {
                title: 'Accreditation Details',
                fields: [
                  ['Accreditation Status', values.accreditationStatus],
                  ['Accreditation Body', values.accreditationBody],
                  ['Accreditation Grade', values.accreditationGrade],
                  ['Accreditation Number', values.accreditationNumber],
                  ['Valid From', values.validFrom],
                  ['Valid Until', values.validUntil],
                ],
              },
            ].map((sec) => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== ''),
            })).filter((sec) => sec.fields.length > 0)

            if (sections.length === 0) {
              return (
                <div className="preview-empty-hint">
                  <span>Enter details in the form to preview here in real time.</span>
                </div>
              )
            }

            return sections.map((sec) => (
              <div key={sec.title} className="preview-section-group">
                <span className="preview-section-title">{sec.title}</span>
                <div className="preview-kv-grid">
                  {sec.fields.map(([label, text]) => (
                    <div key={label} className="preview-kv-item">
                      <span className="kv-label">{label}</span>
                      <strong className="kv-val" title={String(text).trim()}>{String(text).trim()}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      </aside>
    </div>

    {dialog === 'reset' && <Dialog title="Reset College Form?" onClose={() => setDialog(null)} actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Cancel</button><button className="ac-danger-btn" onClick={reset}>Reset</button></>}><p>All entered information will be cleared.</p></Dialog>}
    {dialog === 'leave' && <Dialog title="Unsaved Changes" onClose={() => setDialog(null)} actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Stay</button><button className="ac-danger-btn" onClick={() => navigate('/college-institution-management')}>Leave</button></>}><p>You have unsaved college information. Leave without saving?</p></Dialog>}
  </main></DashboardLayout>
}
