import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiEye as EyeIcon, FiEdit2 as EditIcon, FiPlus as Plus, FiToggleLeft, FiToggleRight } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import FilterPanel from '../../components/FilterPanel'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import StatusConfirmDialog from '../../components/StatusConfirmDialog'
import {
  createCollegeSettings,
  fetchCollegeLogo,
  getCollegeById,
  getCollegeLogoUrl,
  getCollegeSettings,
  getColleges,
  isValidWebsite,
  normalizeWebsite,
  readCollegeExtendedDetails,
  unwrapCollegeRecord,
  searchColleges,
  updateCollege,
  updateCollegeSettings,
  updateCollegeStatus,
  uploadCollegeLogo,
  WEBSITE_VALIDATION_MESSAGE,
} from '../../auth/collegeApi'
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

// Matches CollegeSettingRequestDto from the Swagger doc
const emptySettingsForm = {
  collegeName: '',
  collegeCode: '',
  collegeEmail: '',
  phoneNumber: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  academicYear: '',
  semester: '',
  institutionType: COLLEGE_TYPES[0],
  dateFormat: 'dd-MM-yyyy',
  timeZone: 'Asia/Kolkata',
  status: 1,
}

function AcademicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function ContactIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
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
  if (values.website.trim() && !isValidWebsite(normalizeWebsite(values.website))) {
    errors.website = WEBSITE_VALIDATION_MESSAGE
  }
  if (!values.principal.trim()) errors.principal = "Principal's name is required."
  return errors
}

function validateSettings(values) {
  const errors = {}
  if (!values.collegeName.trim()) errors.collegeName = 'College name is required.'
  if (!values.collegeCode.trim()) errors.collegeCode = 'College code is required.'
  if (!values.collegeEmail.trim()) {
    errors.collegeEmail = 'College email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.collegeEmail.trim())) {
    errors.collegeEmail = 'Enter a valid email address.'
  }
  return errors
}

const getResponseList = (responseData) => {
  const data = responseData?.data ?? responseData
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.records)) return data.records
  if (data && typeof data === 'object') return [data]
  return []
}

const getApiErrorMessage = (error, fallback) => {
  if (error?.response?.status === 401) return 'Your session has expired. Please sign in again.'
  if (error?.response?.status === 403) return "You don't have permission to manage colleges."
  const responseData = error?.response?.data
  let parsedData = responseData
  if (typeof responseData === 'string') {
    try { parsedData = JSON.parse(responseData) } catch { parsedData = null }
  }
  const rawError = `${typeof responseData === 'string' ? responseData : ''} ${error?.message || ''}`
  const validationFields = Object.keys(parsedData?.errors || {})
  if (/PrincipalEmail/i.test(rawError)) return 'Please enter a valid principal email address.'
  if (validationFields.some((field) => field.toLowerCase() === 'principalemail')) return 'Please enter a valid principal email address.'
  if (validationFields.length) return 'Please check the entered college details and try again.'
  const responseMessage = parsedData?.message || parsedData?.error || (parsedData?.title === 'One or more validation errors occurred.' ? '' : parsedData?.title)
  const errorMessage = /^\s*[{[]/.test(String(error?.message || '')) ? '' : error?.message
  return responseMessage || errorMessage || fallback
}

const getCollegeRecords = (responseData) => {
  const data = responseData?.data ?? responseData
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.colleges)) return data.colleges
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.result)) return data.result
  if (Array.isArray(data?.data)) return data.data
  return data && typeof data === 'object' ? [data] : []
}

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''
const displayValue = (value) => hasValue(value) ? value : 'Not provided'
const mapCollege = (record) => {
  const address = record.addressDetails ?? record.addressInfo ?? {}
  const contact = record.contactDetails ?? record.contactInfo ?? {}
  const administration = record.administration ?? record.principalDetails ?? {}
  const accreditation = record.accreditationDetails && typeof record.accreditationDetails === 'object' ? record.accreditationDetails : {}
  const extended = readCollegeExtendedDetails(record)
  return ({
  id: record.id ?? record.collegeId,
  name: record.name ?? record.collegeName ?? '',
  code: record.code ?? record.collegeCode ?? '',
  type: record.type ?? record.collegeType ?? record.institutionType ?? COLLEGE_TYPES[0],
  university: record.university ?? record.universityName ?? '',
  address: record.address ?? record.addressLine1 ?? '',
  addressLine1: record.addressLine1 ?? address.addressLine1 ?? record.address ?? '',
  addressLine2: record.addressLine2 ?? address.addressLine2 ?? '',
  area: record.area ?? address.area ?? extended.area ?? '',
  district: record.district ?? address.district ?? extended.district ?? '',
  country: record.country ?? address.country ?? '',
  city: record.city ?? address.city ?? '',
  state: record.state ?? address.state ?? '',
  pincode: String(record.pincode ?? address.pincode ?? ''),
  contact: String(record.contact ?? record.contactNumber ?? record.phoneNumber ?? record.mobile ?? record.phone ?? contact.contactNumber ?? contact.phoneNumber ?? contact.mobile ?? contact.phone ?? ''),
  alternateContact: String(record.alternateContact ?? record.alternateContactNumber ?? record.alternatePhoneNumber ?? contact.alternateContactNumber ?? extended.alternateContactNumber ?? ''),
  email: record.email ?? record.collegeEmail ?? contact.email ?? '',
  website: record.website ?? record.Website ?? contact.website ?? contact.Website ?? '',
  logo: getCollegeLogoUrl(record.id ?? record.collegeId, record.logo ?? record.logoUrl ?? record.collegeLogo ?? record.collegeLogoUrl ?? record.logoPath ?? ''),
  principal: record.principal ?? record.principalName ?? administration.principalName ?? '',
  principalEmail: record.principalEmail ?? administration.principalEmail ?? extended.principalEmail ?? '',
  principalContact: record.principalContact ?? record.principalPhone ?? administration.principalContact ?? extended.principalContact ?? '',
  accreditation: extended.accreditationSummary ?? '',
  accreditationStatus: record.accreditationStatus ?? accreditation.status ?? extended.accreditationStatus ?? '',
  accreditationBody: record.accreditationBody ?? accreditation.body ?? accreditation.accreditationBody ?? extended.accreditationBody ?? '',
  accreditationGrade: record.accreditationGrade ?? accreditation.grade ?? extended.accreditationGrade ?? '',
  accreditationNumber: record.accreditationNumber ?? accreditation.number ?? extended.accreditationNumber ?? '',
  validFrom: record.validFrom ?? record.accreditationValidFrom ?? accreditation.validFrom ?? extended.validFrom ?? '',
  validUntil: record.validUntil ?? record.accreditationValidUntil ?? accreditation.validUntil ?? extended.validUntil ?? '',
  status: String(record.status ?? (record.isActive === false ? 'inactive' : 'active')).toLowerCase() === 'active' || record.isActive === true || Number(record.status) === 1 ? 'active' : 'inactive',
  })
}

function CollegeLogoImage({ src, alt, className, onError }) {
  const [objectUrl, setObjectUrl] = useState('')
  const onErrorRef = useRef(onError)
  const isProtectedLogo = String(src ?? '').includes('/api/College/logo/')

  useEffect(() => { onErrorRef.current = onError }, [onError])

  useEffect(() => {
    if (!isProtectedLogo) {
      setObjectUrl('')
      return undefined
    }

    let active = true
    let nextObjectUrl = ''
    fetchCollegeLogo(src)
      .then((image) => {
        nextObjectUrl = URL.createObjectURL(image)
        if (active) setObjectUrl(nextObjectUrl)
      })
      .catch(() => { if (active) onErrorRef.current() })

    return () => {
      active = false
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl)
    }
  }, [src, isProtectedLogo])

  if (isProtectedLogo && !objectUrl) return null
  return <img src={isProtectedLogo ? objectUrl : src} alt={alt} className={className} onError={onError} />
}

const collegePayload = (college, hasNewLogo = false) => ({
  name: college.name.trim(),
  code: college.code.trim(),
  type: college.type,
  university: college.university.trim(),
  address: college.address.trim(),
  city: college.city.trim(),
  state: college.state.trim(),
  pincode: college.pincode.trim(),
  contact: college.contact.trim(),
  email: college.email.trim(),
  ...(normalizeWebsite(college.website) ? { Website: normalizeWebsite(college.website) } : {}),
  logo: hasNewLogo ? '' : college.logo || '',
  principal: college.principal.trim(),
  accreditation: college.accreditation.trim(),
})

const mapRecordToForm = (record) => ({
  collegeName: record.collegeName ?? '',
  collegeCode: record.collegeCode ?? '',
  collegeEmail: record.collegeEmail ?? '',
  phoneNumber: record.phoneNumber ?? '',
  website: record.website ?? record.Website ?? '',
  addressLine1: record.addressLine1 ?? '',
  addressLine2: record.addressLine2 ?? '',
  city: record.city ?? '',
  state: record.state ?? '',
  pincode: record.pincode ?? '',
  academicYear: record.academicYear ?? '',
  semester: record.semester ?? '',
  institutionType: record.institutionType || COLLEGE_TYPES[0],
  dateFormat: record.dateFormat ?? 'dd-MM-yyyy',
  timeZone: record.timeZone ?? 'Asia/Kolkata',
  status: record.status ?? 1,
})

export default function CollegeInstitutionManagement({ initialView = 'list' }) {
  const navigate = useNavigate()
  const [colleges, setColleges] = useState([])
  const [isCollegesLoading, setIsCollegesLoading] = useState(true)
  const [collegeError, setCollegeError] = useState('')
  const [isCollegeSaving, setIsCollegeSaving] = useState(false)
  const [isCollegeDetailsLoading, setIsCollegeDetailsLoading] = useState(false)

  const [viewMode, setViewMode] = useState(initialView) // list | edit | details | settings | settings-form
  const [activeId, setActiveId] = useState(null)
  const [formValues, setFormValues] = useState(emptyCollege)
  const [editLogoFile, setEditLogoFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // College Settings state — real list from the backend
  const [settingsList, setSettingsList] = useState([])
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [settingsListError, setSettingsListError] = useState('')

  const [settingsForm, setSettingsForm] = useState(emptySettingsForm)
  const [settingsErrors, setSettingsErrors] = useState({})
  const [activeSettingsId, setActiveSettingsId] = useState(null)
  const [isSettingsSaving, setIsSettingsSaving] = useState(false)
  const [settingsSubmitError, setSettingsSubmitError] = useState('')
  const [settingsPage, setSettingsPage] = useState(1)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [isStatusSaving, setIsStatusSaving] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Logos that failed to load (broken/invalid URLs) fall back to the initial-letter avatar
  const [brokenLogoIds, setBrokenLogoIds] = useState(() => new Set())
  const markLogoBroken = (id) => setBrokenLogoIds((current) => new Set(current).add(id))

  const activeCollege = colleges.find((c) => c.id === activeId) || null

  const filteredColleges = colleges.filter((college) =>
    (!typeFilter || college.type === typeFilter) &&
    (!statusFilter || college.status === statusFilter)
  )
  const availableCollegeTypes = [...new Set(colleges.map((college) => college.type).filter(Boolean))]

  // Calculate pagination details
  const totalPages = Math.max(1, Math.ceil(filteredColleges.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredColleges.length)
  const displayedColleges = filteredColleges.slice(startIndex, endIndex)
  const settingsTotalPages = Math.max(1, Math.ceil(settingsList.length / PAGE_SIZE))
  const currentSettingsPage = Math.min(settingsPage, settingsTotalPages)
  const displayedSettings = settingsList.slice((currentSettingsPage - 1) * PAGE_SIZE, currentSettingsPage * PAGE_SIZE)

  const loadColleges = async (term = '') => {
    setIsCollegesLoading(true)
    setCollegeError('')
    try {
      const response = term.trim() ? await searchColleges(term.trim()) : await getColleges()
      setColleges(getCollegeRecords(response.data).map(mapCollege))
    } catch (error) {
      setColleges([])
      setCollegeError(getApiErrorMessage(error, 'Unable to load colleges. Please try again.'))
    } finally {
      setIsCollegesLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadColleges(searchTerm), searchTerm.trim() ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const updateField = ({ target: { name, value } }) => {
    setFormValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const normalizeEditWebsite = () => {
    setFormValues((current) => ({ ...current, website: normalizeWebsite(current.website) }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setFormValues((current) => ({ ...current, logo: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const openAdd = () => {
    navigate('/college-institution-management/add')
  }

  const openEdit = async (college) => {
    navigate(`/college-institution-management/add?edit=${encodeURIComponent(college.id)}`)
  }

  const openDetails = async (college) => {
    setIsCollegeDetailsLoading(true)
    setCollegeError('')
    setActiveId(college.id)
    setViewMode('details')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    try {
      const response = await getCollegeById(college.id)
      const detailRecord = unwrapCollegeRecord(response)
      const detail = mapCollege(Object.keys(detailRecord).length ? detailRecord : college)
      setColleges((current) => current.map((item) => (item.id === detail.id ? detail : item)))
    } catch (error) {
      setCollegeError(getApiErrorMessage(error, 'Unable to load college details. Please try again.'))
    } finally {
      setIsCollegeDetailsLoading(false)
    }
  }

  const backToList = () => {
    if (initialView === 'settings') {
      navigate('/college-institution-management')
      return
    }
    setViewMode('list')
    setActiveId(null)
    setErrors({})
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const nextErrors = validateCollege(formValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (!activeId || isCollegeSaving) return

    setIsCollegeSaving(true)
    setCollegeError('')
    try {
      const response = await updateCollege(activeId, collegePayload(formValues, Boolean(editLogoFile)))
      if (editLogoFile) {
        await uploadCollegeLogo(activeId, editLogoFile)
        setBrokenLogoIds((current) => { const next = new Set(current); next.delete(activeId); return next })
      }
      const updated = mapCollege((response.data?.data ?? response.data) || { ...formValues, id: activeId })
      setColleges((current) => current.map((college) => (college.id === activeId ? updated : college)))
      backToList()
      await loadColleges(searchTerm)
    } catch (error) {
      setCollegeError(getApiErrorMessage(error, 'Unable to update this college. Please try again.'))
    } finally {
      setIsCollegeSaving(false)
    }
  }

  const toggleStatus = (college) => setPendingStatus({ college, nextStatus: college.status === 'active' ? 'inactive' : 'active' })
  const confirmStatusChange = async () => {
    if (!pendingStatus || isStatusSaving) return
    const { college, nextStatus } = pendingStatus
    setIsStatusSaving(true)
    setCollegeError('')
    try {
      const response = await updateCollegeStatus(college.id, nextStatus === 'active' ? 1 : 0)
      const updated = mapCollege((response.data?.data ?? response.data) || { ...college, status: nextStatus })
      setColleges((current) => current.map((item) => (item.id === college.id ? updated : item)))
      setPendingStatus(null)
    } catch (error) {
      setCollegeError(getApiErrorMessage(error, 'Unable to update college status. Please try again.'))
    } finally { setIsStatusSaving(false) }
  }


  // ── College Settings: list ──
  const fetchSettingsList = async () => {
    setIsSettingsLoading(true)
    setSettingsListError('')
    try {
      const response = await getCollegeSettings()
      setSettingsList(getResponseList(response.data))
      setSettingsPage(1)
    } catch (error) {
      setSettingsListError(getApiErrorMessage(error, 'Unable to load college settings. Please try again.'))
    } finally {
      setIsSettingsLoading(false)
    }
  }

  useEffect(() => {
    if (initialView === 'settings') fetchSettingsList()
  }, [initialView])

  const backToSettingsList = () => {
    setViewMode('settings')
    setActiveSettingsId(null)
    setSettingsErrors({})
    setSettingsSubmitError('')
  }

  const openAddSettings = () => {
    setSettingsForm(emptySettingsForm)
    setActiveSettingsId(null)
    setSettingsErrors({})
    setSettingsSubmitError('')
    setViewMode('settings-form')
  }

  const openEditSettings = (record) => {
    setSettingsForm(mapRecordToForm(record))
    setActiveSettingsId(record.id ?? null)
    setSettingsErrors({})
    setSettingsSubmitError('')
    setViewMode('settings-form')
  }

  const updateSettingsField = ({ target: { name, value } }) => {
    setSettingsForm((current) => ({
      ...current,
      [name]: name === 'status' ? Number(value) : value,
    }))
    setSettingsErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    const nextErrors = validateSettings(settingsForm)
    setSettingsErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSettingsSaving(true)
    setSettingsSubmitError('')
    try {
      if (activeSettingsId) {
        await updateCollegeSettings(activeSettingsId, settingsForm)
      } else {
        await createCollegeSettings(settingsForm)
      }
      await fetchSettingsList()
      setViewMode('settings')
    } catch (error) {
      setSettingsSubmitError(getApiErrorMessage(error, 'Unable to save college settings. Please try again.'))
    } finally {
      setIsSettingsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="college-management">
        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <>
            <header className="cm-header">
              <div>
                <h1>College Management</h1>
                <p>Manage colleges, institutional details, and academic configurations.</p>
              </div>
              <button type="button" className="cm-primary-btn" onClick={openAdd}>
                <Plus aria-hidden="true" /> Add College
              </button>
            </header>

            <FilterPanel active={Boolean(searchTerm || typeFilter || statusFilter)}><div className="cm-toolbar">
              <input
                type="text"
                className="cm-search"
                placeholder="Search by name, code or city..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <select aria-label="Filter colleges by type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setCurrentPage(1) }}>
                <option value="">Select Type</option>
                {availableCollegeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select aria-label="Filter colleges by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1) }}>
                <option value="">Select Status</option><option value="active">Active</option><option value="inactive">Deactive</option>
              </select>
            </div></FilterPanel>

            {isCollegesLoading ? (
              <div className="cm-empty">
                <p>Loading colleges...</p>
              </div>
            ) : collegeError ? (
              <div className="cm-empty">
                <p className="cm-field-error" role="alert">{collegeError}</p>
                <button type="button" className="cm-secondary-btn" onClick={() => loadColleges(searchTerm)}>
                  Retry
                </button>
              </div>
            ) : filteredColleges.length === 0 ? (
              <div className="cm-empty">
                <p>No colleges found.</p>
                <button type="button" className="cm-primary-btn" onClick={openAdd}>
                  <Plus aria-hidden="true" /> Add your first college
                </button>
              </div>
            ) : (
              <>
                <div className="cm-table-wrap">
                  <table className="cm-table">
                    <thead>
                      <tr>
                        <th><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>Logo</span></th>
                        <th><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>College Name</span></th>
                        <th><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>Code</span></th>
                        <th><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>Type</span></th>
                        <th><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>City</span></th>
                        <th><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>Contact</span></th>
                        <th><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>Status</span></th>
                        <th className="cm-actions-header"><span className="cm-table-heading" style={{ display: 'flex', justifyContent: 'center' }}>Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedColleges.map((college) => (
                        <tr key={college.id}>
                          <td>
                            {college.logo && !brokenLogoIds.has(college.id) ? (
                              <CollegeLogoImage
                                src={college.logo}
                                alt={college.name}
                                className="cm-logo-thumb"
                                onError={() => markLogoBroken(college.id)}
                              />
                            ) : (
                              <span className="cm-logo-placeholder">{college.name.charAt(0).toUpperCase()}</span>
                            )}
                          </td>
                          <td><span className="cm-college-name">{college.name}</span></td>
                          <td>{college.code}</td>
                          <td>{college.type}</td>
                          <td>{college.city}</td>
                          <td>{college.contact}</td>
                          <td>
                            <span className={`cm-status-badge ${college.status}`}>
                              {college.status === 'active' ? 'Active' : 'Deactive'}
                            </span>
                          </td>
                          <td className="cm-actions-cell">
                            <div className="cm-actions">
                              <button
                                type="button"
                                className="cm-action-icon-btn cm-view-action"
                                title="View Details"
                                aria-label="View Details"
                                onClick={() => openDetails(college)}
                              >
                                <EyeIcon />
                              </button>
                              <button
                                type="button"
                                className="cm-action-icon-btn cm-edit-action"
                                title="Edit College"
                                aria-label="Edit College"
                                onClick={() => openEdit(college)}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className={`cm-action-icon-btn cm-status-action ${college.status === 'active' ? 'cm-danger' : 'cm-success'}`}
                                title={college.status === 'active' ? 'Deactivate college' : 'Activate college'}
                                aria-label={college.status === 'active' ? 'Deactivate college' : 'Activate college'}
                                onClick={() => toggleStatus(college)}
                              >
                                {college.status === 'active' ? <FiToggleRight /> : <FiToggleLeft />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Controls */}
                <div className="cm-pagination">
                  <div className="cm-pagination-info">
                    <label htmlFor="college-page-size">Show
                      <select id="college-page-size" value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1) }}>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="100">100</option>
                      </select>
                      entries
                    </label>
                  </div>
                  <div className="cm-pagination-controls">
                    <button
                      type="button"
                      className="cm-page-btn"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={safeCurrentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="cm-page-indicator">Page {safeCurrentPage} of {totalPages}</span>
                    <button
                      type="button"
                      className="cm-page-btn"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={safeCurrentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* EDIT COLLEGE FORM MODAL */}
        {viewMode === 'edit' && (
          <>
            <button type="button" className="cm-modal-backdrop" aria-label="Close form dialog" onClick={backToList} />
            <form className="cm-form cm-modal-card" onSubmit={handleSave} noValidate>
              <header className="cm-header">
                <div>
                  <h1>Edit College</h1>
                  <p>Fill in the college's details below.</p>
                </div>
                <button type="button" className="cm-secondary-btn" onClick={backToList}>
                  &larr; Back to list
                </button>
              </header>

              {isCollegeDetailsLoading && <p>Loading college details...</p>}
              {collegeError && <p className="cm-field-error" role="alert">{collegeError}</p>}

              <div className="cm-form-grid">
                <label>
                  <span>College Name *</span>
                  <input type="text" name="name" value={formValues.name} onChange={updateField} placeholder="e.g. Engineering College Name" />
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
                  <input type="text" name="website" value={formValues.website} onChange={updateField} onBlur={normalizeEditWebsite} placeholder="https://college.edu" />
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
                <button type="submit" className="cm-primary-btn" disabled={isCollegeDetailsLoading || isCollegeSaving}>
                  {isCollegeSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* FULL COLLEGE DETAILS / PROFILE SCREEN */}
        {viewMode === 'details' && activeCollege && (
          <div className="cm-profile-view">
            <div className="cm-profile-top-bar">
              <button type="button" className="cm-secondary-btn" onClick={backToList}>
                &larr; Back to Colleges List
              </button>
            </div>

            {isCollegeDetailsLoading && <p>Loading college details...</p>}
            {collegeError && <p className="cm-field-error" role="alert">{collegeError}</p>}

            <div className="cm-profile-card">
              {/* Header Profile Banner */}
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  {activeCollege.logo && !brokenLogoIds.has(activeCollege.id) ? (
                    <CollegeLogoImage
                      src={activeCollege.logo}
                      alt={activeCollege.name}
                      className="cm-profile-logo"
                      onError={() => markLogoBroken(activeCollege.id)}
                    />
                  ) : (
                    <div className="cm-profile-placeholder">
                      {activeCollege.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">Code: {activeCollege.code}</span>
                    <span className="cm-badge cm-badge-type">{activeCollege.type}</span>
                    <span className={`cm-status-badge ${activeCollege.status}`}>
                      {activeCollege.status === 'active' ? 'Active' : 'Deactive'}
                    </span>
                  </div>
                  <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{activeCollege.name}</span></h1>
                  <p className="cm-profile-subtitle"><span style={{ color: '#fff' }}>Affiliated with </span><strong style={{ color: '#fff' }}>{activeCollege.university}</strong></p>
                </div>
              </div>

              {/* Profile Information Cards Grid */}
              <div className="cm-profile-grid">
                <div className="cm-info-card">
                  <div className="cm-info-card-header"><AcademicIcon /><h2>Basic College Information</h2></div>
                  <div className="cm-info-rows">
                    <div className="cm-info-row"><span className="cm-info-label">College Name</span><span className="cm-info-val">{displayValue(activeCollege.name)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">College Code</span><span className="cm-info-val">{displayValue(activeCollege.code)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">College Type</span><span className="cm-info-val">{displayValue(activeCollege.type)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">University Name</span><span className="cm-info-val">{displayValue(activeCollege.university)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Status</span><span className="cm-info-val">{activeCollege.status === 'active' ? 'Active' : 'Deactive'}</span></div>
                  </div>
                </div>

                <div className="cm-info-card">
                  <div className="cm-info-card-header"><ContactIcon /><h2>Address Details</h2></div>
                  <div className="cm-info-rows">
                    <div className="cm-info-row"><span className="cm-info-label">Address Line 1</span><span className="cm-info-val">{displayValue(activeCollege.addressLine1)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Address Line 2</span><span className="cm-info-val">{displayValue(activeCollege.addressLine2)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Area</span><span className="cm-info-val">{displayValue(activeCollege.area)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">District</span><span className="cm-info-val">{displayValue(activeCollege.district)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">City</span><span className="cm-info-val">{displayValue(activeCollege.city)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">State</span><span className="cm-info-val">{displayValue(activeCollege.state)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Pincode</span><span className="cm-info-val">{displayValue(activeCollege.pincode)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Country</span><span className="cm-info-val">{displayValue(activeCollege.country)}</span></div>
                  </div>
                </div>

                <div className="cm-info-card">
                  <div className="cm-info-card-header"><ContactIcon /><h2>Contact Details</h2></div>
                  <div className="cm-info-rows">
                    <div className="cm-info-row"><span className="cm-info-label">Contact Number</span><span className="cm-info-val">{displayValue(activeCollege.contact)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Alternate Contact Number</span><span className="cm-info-val">{displayValue(activeCollege.alternateContact)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Email</span><span className="cm-info-val">{displayValue(activeCollege.email)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Website</span><span className="cm-info-val">{displayValue(activeCollege.website)}</span></div>
                  </div>
                </div>

                <div className="cm-info-card">
                  <div className="cm-info-card-header"><AcademicIcon /><h2>Administration</h2></div>
                  <div className="cm-info-rows">
                    <div className="cm-info-row"><span className="cm-info-label">Principal Name</span><span className="cm-info-val">{displayValue(activeCollege.principal)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Principal Email</span><span className="cm-info-val">{displayValue(activeCollege.principalEmail)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Principal Contact</span><span className="cm-info-val">{displayValue(activeCollege.principalContact)}</span></div>
                  </div>
                </div>

                <div className="cm-info-card">
                  <div className="cm-info-card-header"><AcademicIcon /><h2>Accreditation Details</h2></div>
                  <div className="cm-info-rows">
                    <div className="cm-info-row"><span className="cm-info-label">Accreditation Status</span><span className="cm-info-val">{displayValue(activeCollege.accreditationStatus)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Accreditation Body</span><span className="cm-info-val">{displayValue(activeCollege.accreditationBody)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Accreditation Grade</span><span className="cm-info-val">{displayValue(activeCollege.accreditationGrade)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Accreditation Number</span><span className="cm-info-val">{displayValue(activeCollege.accreditationNumber)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Valid From</span><span className="cm-info-val">{displayValue(activeCollege.validFrom)}</span></div>
                    <div className="cm-info-row"><span className="cm-info-label">Valid Until</span><span className="cm-info-val">{displayValue(activeCollege.validUntil)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COLLEGE SETTINGS — LIST VIEW, backed by /api/college-settings */}
        {viewMode === 'settings' && (
          <div className="cm-settings">
            <header className="cm-header">
              <div>
                <h1>College Settings</h1>
                <p>Manage academic and college settings for every college.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="cm-primary-btn" onClick={openAddSettings}>
                  + Add Settings
                </button>
                <button type="button" className="cm-secondary-btn" onClick={backToList}>
                  &larr; Back to list
                </button>
              </div>
            </header>

            {isSettingsLoading && <p>Loading college settings...</p>}

            {!isSettingsLoading && settingsListError && (
              <div className="cm-empty">
                <p className="cm-field-error">{settingsListError}</p>
                <button type="button" className="cm-secondary-btn" onClick={fetchSettingsList}>
                  Retry
                </button>
              </div>
            )}

            {!isSettingsLoading && !settingsListError && settingsList.length === 0 && (
              <div className="cm-empty">
                <p>No college settings found.</p>
                <button type="button" className="cm-primary-btn" onClick={openAddSettings}>
                  + Add your first settings record
                </button>
              </div>
            )}

            {!isSettingsLoading && !settingsListError && settingsList.length > 0 && (
              <div className="cm-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>College Name</th>
                      <th>Code</th>
                      <th>Email</th>
                      <th>City / State</th>
                      <th>Academic Year</th>
                      <th>Semester</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="cm-actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSettings.map((item) => (
                      <tr key={item.id}>
                        <td>{item.collegeName}</td>
                        <td>{item.collegeCode}</td>
                        <td>{item.collegeEmail}</td>
                        <td>{item.city}, {item.state}</td>
                        <td>{item.academicYear}</td>
                        <td>{item.semester}</td>
                        <td>{item.institutionType}</td>
                        <td>
                          <span className={`cm-status-badge ${item.status === 1 ? 'active' : 'inactive'}`}>
                            {item.status === 1 ? 'Active' : 'Deactive'}
                          </span>
                        </td>
                        <td className="cm-actions-cell">
                          <div className="cm-actions">
                            <button
                              type="button"
                              className="cm-action-icon-btn"
                              title="Edit Settings"
                              aria-label="Edit Settings"
                              onClick={() => openEditSettings(item)}
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination page={currentSettingsPage} totalPages={settingsTotalPages} onPageChange={setSettingsPage} />
              </div>
            )}
          </div>
        )}

        {/* COLLEGE SETTINGS — ADD / EDIT FORM MODAL */}
        {viewMode === 'settings-form' && (
          <>
            <button type="button" className="cm-modal-backdrop" aria-label="Close form dialog" onClick={backToSettingsList} />
            <form className="cm-form cm-modal-card" onSubmit={handleSaveSettings} noValidate>
              <header className="cm-header">
                <div>
                  <h1>{activeSettingsId ? 'Edit College Settings' : 'Add College Settings'}</h1>
                  <p>Fill in the settings details below.</p>
                </div>
                <button type="button" className="cm-secondary-btn" onClick={backToSettingsList}>
                  &larr; Back to list
                </button>
              </header>

              <div className="cm-form-grid">
                <label>
                  <span>College Name *</span>
                  <input type="text" name="collegeName" value={settingsForm.collegeName} onChange={updateSettingsField} />
                  {settingsErrors.collegeName && <p className="cm-field-error">{settingsErrors.collegeName}</p>}
                </label>

                <label>
                  <span>College Code *</span>
                  <input type="text" name="collegeCode" value={settingsForm.collegeCode} onChange={updateSettingsField} />
                  {settingsErrors.collegeCode && <p className="cm-field-error">{settingsErrors.collegeCode}</p>}
                </label>

                <label>
                  <span>College Email *</span>
                  <input type="text" name="collegeEmail" value={settingsForm.collegeEmail} onChange={updateSettingsField} />
                  {settingsErrors.collegeEmail && <p className="cm-field-error">{settingsErrors.collegeEmail}</p>}
                </label>

                <label>
                  <span>Phone Number</span>
                  <input type="text" name="phoneNumber" value={settingsForm.phoneNumber} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>Website</span>
                  <input type="text" name="website" value={settingsForm.website} onChange={updateSettingsField} placeholder="https://college.edu" />
                </label>

                <label>
                  <span>College Type</span>
                  <select name="institutionType" value={settingsForm.institutionType} onChange={updateSettingsField}>
                    {COLLEGE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="cm-span-2">
                  <span>Address Line 1</span>
                  <input type="text" name="addressLine1" value={settingsForm.addressLine1} onChange={updateSettingsField} />
                </label>

                <label className="cm-span-2">
                  <span>Address Line 2</span>
                  <input type="text" name="addressLine2" value={settingsForm.addressLine2} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>City</span>
                  <input type="text" name="city" value={settingsForm.city} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>State</span>
                  <input type="text" name="state" value={settingsForm.state} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>Pincode</span>
                  <input type="text" name="pincode" value={settingsForm.pincode} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>Academic Year</span>
                  <input type="text" name="academicYear" value={settingsForm.academicYear} onChange={updateSettingsField} placeholder="e.g. 2026-27" />
                </label>

                <label>
                  <span>Semester</span>
                  <input type="text" name="semester" value={settingsForm.semester} onChange={updateSettingsField} placeholder="e.g. Semester 2" />
                </label>

                <label>
                  <span>Date Format</span>
                  <input type="text" name="dateFormat" value={settingsForm.dateFormat} onChange={updateSettingsField} placeholder="e.g. dd-MM-yyyy" />
                </label>

                <label>
                  <span>Time Zone</span>
                  <input type="text" name="timeZone" value={settingsForm.timeZone} onChange={updateSettingsField} placeholder="e.g. Asia/Kolkata" />
                </label>

                <label>
                  <span>Status</span>
                  <select name="status" value={settingsForm.status} onChange={updateSettingsField}>
                    <option value={1}>Active</option>
                    <option value={0}>Deactive</option>
                  </select>
                </label>
              </div>

              {settingsSubmitError && <p className="cm-field-error" role="alert">{settingsSubmitError}</p>}

              <div className="cm-form-actions">
                <button type="button" className="cm-secondary-btn" onClick={backToSettingsList}>Cancel</button>
                <button type="submit" className="cm-primary-btn" disabled={isSettingsSaving}>
                  {isSettingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      {pendingStatus && <StatusConfirmDialog entity="College" name={`${pendingStatus.college.name} (${pendingStatus.college.code})`} nextStatus={pendingStatus.nextStatus} onCancel={() => setPendingStatus(null)} onConfirm={confirmStatusChange} busy={isStatusSaving} />}
    </DashboardLayout>
  )
}
