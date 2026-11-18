import { useEffect, useMemo, useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { collegeUserMappingsApi, lookupIndianPostOffices, userDirectoryApi } from '../../api/apiEndpoints'
import {
  createCollege,
  createCollegeSettings,
  getCollegeById,
  getCollegeSettingsByCollegeId,
  getColleges,
  updateCollege,
  updateCollegeStatus,
  unwrapCollegeRecord,
} from '../../auth/collegeApi'
import { useScreenAccess } from '../../auth/ScreenAccess'
import academicService from '../../services/academicService'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import { rememberCreated } from '../../utils/newestFirst'
import { showSuccess } from '../../utils/toast'
import SearchableSelect from '../../components/SearchableSelect.jsx'
import './AdminManagement.css'

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s.'’-]+$/u
const LOCATION_NAME_PATTERN = /^[\p{L}\p{M}\d\s.,&'’()/-]+$/u
const ORGANIZATION_NAME_PATTERN = /^[\p{L}\p{M}\d\s.,&'’()/-]+$/u
const ORGANIZATION_CODE_PATTERN = /^[A-Z0-9]{2,10}$/i
const isValidIndianMobile = value => {
  const phone = String(value || '').trim()
  if (!/^\+?[\d\s()-]+$/.test(phone)) return false
  const compactPhone = phone.replace(/[\s()-]/g, '')
  const nationalNumber = compactPhone.startsWith('+91')
    ? compactPhone.slice(3)
    : compactPhone.length === 12 && compactPhone.startsWith('91')
      ? compactPhone.slice(2)
      : compactPhone
  return /^[6-9]\d{9}$/.test(nationalNumber)
}
const normalizedIndianState = value => {
  const state = String(value || '').trim()
  const key = state.toLowerCase().replace(/\s+/g, ' ')
  const aliases = { orissa: 'Odisha', pondicherry: 'Puducherry', uttaranchal: 'Uttarakhand', 'jammu & kashmir': 'Jammu and Kashmir' }
  return INDIA_STATES.find(item => item.toLowerCase() === key) || aliases[key] || state
}
const normalizedCountry = value => {
  const country = String(value || '').trim()
  if (country.toLowerCase().includes('india')) return 'India'
  return COUNTRIES.find(item => item.toLowerCase() === country.toLowerCase()) || country || 'India'
}
let nextAdminRowId = 0

const newAdminRow = () => ({
  id: `pending-admin-${++nextAdminRowId}`,
  kind: 'new',
  fullName: '',
  email: '',
  phone: '',
  initialPassword: '',
  status: '1',
  userId: '',
  currentStatus: '1',
})

const isActive = value => value === true || value === 1 || String(value).toLowerCase() === '1' || String(value).toLowerCase() === 'active'
const isCollegeAdmin = user => {
  const roles = [
    ...(Array.isArray(user.roleCodes) ? user.roleCodes : []),
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.roleName,
  ].filter(Boolean).map(value => String(value).trim().toUpperCase().replace(/[\s-]+/g, '_'))
  return roles.some(role => role === 'COLLEGE_ADMIN' || role === 'COLLEGE_ADMINISTRATOR')
}
const identifier = value => value?.collegeSettingId ?? value?.settingId ?? value?.id
const userIdentifier = response => {
  const body = response?.data ?? response
  const record = body?.data ?? body?.user ?? body
  return record?.userId ?? record?.id ?? record?.user?.userId
}
const settingIdentifier = response => {
  const body = response?.data ?? response
  return identifier(body?.data ?? body?.setting ?? body)
}
const roleIdentifier = lookups => {
  const roles = Array.isArray(lookups?.roles) ? lookups.roles : []
  const role = roles.find(item => {
    const roleCode = String(item.roleCode ?? item.code ?? '').toUpperCase()
    const roleName = String(item.roleName ?? item.name ?? '').toUpperCase()
    const isGlobal = item.collegeId == null || Number(item.collegeId) === 0
    return isGlobal && (roleCode === 'COLLEGE_ADMIN' || roleName === 'COLLEGE ADMIN' || roleName === 'COLLEGE ADMINISTRATOR')
  })
  return role?.roleId ?? role?.id
}
const activeMapping = mapping => isActive(mapping.status) && !mapping.removedAt

async function loadAllUsers() {
  const rows = []
  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    const page = await userDirectoryApi.getAll({ pageNumber, pageSize: 200 })
    rows.push(...page)
    if (page.length < 200) return rows
  }
  throw new Error('The user directory is too large to search safely. Narrow the administrator list in User Access Management.')
}

function collegeIdFromResponse(response) {
  const created = unwrapCollegeRecord(response)
  return created?.id ?? created?.collegeId ?? response?.data?.id ?? response?.data?.collegeId
}

export default function CreateCollegeForm({ editId, onDismiss, onSaved }) {
  const { access, loading: accessLoading } = useScreenAccess()
  const [values, setValues] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    status: '1',
    address: '',
    area: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pincode: '',
  })
  const [pincodeStatus, setPincodeStatus] = useState('')
  const [postOffices, setPostOffices] = useState([])
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const pincodeLookupRef = useRef(0)
  const [admins, setAdmins] = useState([])
  const [errors, setErrors] = useState({})
  const [adminErrors, setAdminErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)
  const [adminMode, setAdminMode] = useState('none')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignSearch, setAssignSearch] = useState('')
  const [existingAdmins, setExistingAdmins] = useState([])
  const [adminRoleId, setAdminRoleId] = useState(null)
  const [createdCollegeId, setCreatedCollegeId] = useState(null)
  const [collegeSettingId, setCollegeSettingId] = useState(null)
  const [adminProgress, setAdminProgress] = useState({})
  const [collegeStatusSaved, setCollegeStatusSaved] = useState(false)
  const [creationUnconfirmed, setCreationUnconfirmed] = useState(false)
  const [formLoading, setFormLoading] = useState(Boolean(editId))
  const [formLoadError, setFormLoadError] = useState('')
  const originalCollegeRef = useRef(null)
  const originalStatusRef = useRef('1')

  useEffect(() => {
    if (!editId) return undefined
    let active = true
    const loadOrganization = async () => {
      try {
        const [collegeResponse, settingsResult, users, mappings] = await Promise.all([
          getCollegeById(editId),
          getCollegeSettingsByCollegeId(editId).catch(error => {
            if (Number(error?.status ?? error?.response?.status) === 404) return null
            throw error
          }),
          loadAllUsers(),
          collegeUserMappingsApi.getAll(),
        ])
        if (!active) return
        const college = unwrapCollegeRecord(collegeResponse)
        originalCollegeRef.current = college
        const settingId = settingsResult ? settingIdentifier(settingsResult) : null
        setCollegeSettingId(settingId)
        const rawStatus = college.status ?? college.isActive
        const status = rawStatus == null || rawStatus === '' ? '1' : isActive(rawStatus) ? '1' : '0'
        originalStatusRef.current = status
        setValues({
          name: String(college.name ?? college.collegeName ?? ''),
          code: String(college.code ?? college.collegeCode ?? ''),
          contactPerson: String(college.contactPerson ?? college.principalName ?? college.principal ?? ''),
          email: String(college.email ?? college.collegeEmail ?? ''),
          phone: String(college.contactNumber ?? college.phoneNumber ?? college.contact ?? ''),
          status,
          address: String(college.address ?? college.addressLine1 ?? ''),
          area: String(college.area ?? ''),
          city: String(college.city ?? ''),
          district: String(college.district ?? ''),
          state: String(college.state ?? ''),
          country: normalizedCountry(college.country),
          pincode: String(college.pincode ?? college.pinCode ?? ''),
        })

        const userById = new Map(users.map(user => [String(user.userId ?? user.id), user]))
        const matchesOrganization = mapping =>
          (settingId != null && String(mapping.collegeSettingId ?? mapping.settingId ?? '') === String(settingId))
          || String(mapping.collegeId ?? '') === String(editId)
        const mappedUserIds = new Set(mappings.filter(activeMapping).filter(matchesOrganization).map(mapping => String(mapping.userId)))
        const assignedUsers = users.filter(user => {
          const userId = String(user.userId ?? user.id)
          return isCollegeAdmin(user) && (mappedUserIds.has(userId)
            || String(user.collegeId ?? user.primaryCollegeId ?? '') === String(editId))
        })
        const rowsById = new Map()
        assignedUsers.forEach(user => {
          const userId = user.userId ?? user.id
          if (userId == null || rowsById.has(String(userId))) return
          const currentStatus = isActive(user.status ?? user.accountStatus) ? '1' : '0'
          rowsById.set(String(userId), {
            id: `assigned-admin-${userId}`,
            kind: 'existing',
            fullName: user.fullName ?? user.name ?? '',
            email: user.email ?? '',
            phone: user.mobile ?? user.phone ?? '',
            status: currentStatus,
            currentStatus,
            userId,
            alreadyAssigned: true,
          })
        })
        mappedUserIds.forEach(userId => {
          const user = userById.get(userId)
          if (!user || !isCollegeAdmin(user) || rowsById.has(userId)) return
          const currentStatus = isActive(user.status ?? user.accountStatus) ? '1' : '0'
          rowsById.set(userId, {
            id: `assigned-admin-${userId}`,
            kind: 'existing',
            fullName: user.fullName ?? user.name ?? '',
            email: user.email ?? '',
            phone: user.mobile ?? user.phone ?? '',
            status: currentStatus,
            currentStatus,
            userId: user.userId ?? user.id,
            alreadyAssigned: true,
          })
        })
        const assignedRows = [...rowsById.values()]
        setAdmins(assignedRows)
        setAdminProgress(Object.fromEntries(assignedRows.map(row => [row.id, {
          userId: row.userId,
          assigned: true,
          statusSaved: false,
        }])))
      } catch (error) {
        if (active) setFormLoadError(error?.message || 'Could not load the organization and its administrator assignments.')
      } finally {
        if (active) setFormLoading(false)
      }
    }
    loadOrganization()
    return () => { active = false }
  }, [editId])

  useEffect(() => {
    const pincode = values.pincode.trim()
    const lookupId = ++pincodeLookupRef.current
    setPostOffices([])
    if (values.country !== 'India') {
      setPincodeLoading(false)
      setPincodeStatus('Post office lookup is available for India PIN codes.')
      return undefined
    }
    if (!pincode) {
      setPincodeLoading(false)
      setPincodeStatus('')
      return undefined
    }
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      setPincodeLoading(false)
      setPincodeStatus('Enter a valid 6-digit PIN code to find post offices.')
      return undefined
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setPincodeLoading(true)
      setPincodeStatus('Finding address details…')
      try {
        const offices = await lookupIndianPostOffices(pincode)
        if (!active || lookupId !== pincodeLookupRef.current) return
        setPostOffices(offices)
        const savedPostOffice = values.area.trim().toLocaleLowerCase()
        const selectedOffice = offices.find(office => office.name.trim().toLocaleLowerCase() === savedPostOffice)
          || (offices.length === 1 ? offices[0] : null)
        if (selectedOffice) {
          setValues(current => current.pincode.trim() !== pincode || current.country !== 'India' ? current : ({
            ...current,
            area: selectedOffice.name,
            city: selectedOffice.city || selectedOffice.district || selectedOffice.town || '',
            district: selectedOffice.district || '',
            state: normalizedIndianState(selectedOffice.state) || '',
            country: normalizedCountry(selectedOffice.country),
          }))
          setErrors(current => ({ ...current, area: '', city: '', district: '', state: '' }))
          setPincodeStatus(offices.length === 1 ? `Post office ${selectedOffice.name} selected; address details filled.` : `Saved post office ${selectedOffice.name} restored; address details filled.`)
        } else {
          setPincodeStatus(`${offices.length} post offices found. Select the correct post office.`)
        }
      } catch (lookupError) {
        if (active && lookupId === pincodeLookupRef.current) {
          setPostOffices([])
          setPincodeStatus(lookupError?.message || 'Post office lookup failed. Please try again.')
        }
      } finally {
        if (active && lookupId === pincodeLookupRef.current) {
          setPincodeLoading(false)
        }
      }
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [values.pincode, values.country])

  const postOfficeOptions = useMemo(() => {
    const savedName = values.area.trim()
    const hasSavedOffice = savedName && !postOffices.some(office => office.name.trim().toLocaleLowerCase() === savedName.toLocaleLowerCase())
    return [
      ...(hasSavedOffice ? [{ id: savedName, name: savedName, code: 'Saved selection', disabled: true }] : []),
      ...postOffices.map(office => ({ id: office.name, name: office.name })),
    ]
  }, [postOffices, values.area])

  const selectPostOffice = name => {
    const office = postOffices.find(item => item.name === name)
    if (!office) return
    setValues(current => ({
      ...current,
      area: office.name,
      city: office.city || office.district || office.town || '',
      district: office.district || '',
      state: normalizedIndianState(office.state) || '',
      country: normalizedCountry(office.country),
    }))
    setErrors(current => ({ ...current, area: '', city: '', district: '', state: '' }))
    setPincodeStatus(`Address details filled for ${office.name}.`)
    setSubmitError('')
  }

  const filteredEligibleAdmins = useMemo(() => {
    const term = assignSearch.trim().toLowerCase()
    const selectedIds = new Set(admins.filter(row => row.kind === 'existing').map(row => String(row.userId)))
    return existingAdmins.filter(user => {
      if (!user.eligible || selectedIds.has(String(user.userId))) return false
      return !term || `${user.fullName} ${user.email}`.toLowerCase().includes(term)
    })
  }, [admins, assignSearch, existingAdmins])

  const updateValue = (field, value) => {
    if (field === 'pincode') {
      pincodeLookupRef.current++
      setPostOffices([])
      setPincodeLoading(false)
      setPincodeStatus(value && value.length < 6 ? 'Enter a valid 6-digit PIN code to find post offices.' : '')
      setValues(current => ({ ...current, pincode: value, area: '', city: '', district: '', state: '' }))
      setErrors(current => ({ ...current, pincode: '', area: '', city: '', district: '', state: '' }))
      setSubmitError('')
      return
    }
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: '' }))
    setSubmitError('')
  }

  const updateAdmin = (rowId, field, value) => {
    setAdmins(current => current.map(row => row.id === rowId ? { ...row, [field]: value } : row))
    setAdminErrors(current => ({ ...current, [rowId]: { ...current[rowId], [field]: '' } }))
    setSubmitError('')
  }

  const toggleAddAdmin = () => {
    if (adminMode === 'new') {
      setAdminMode('none')
      return
    }
    setAssignOpen(false)
    setAdminMode('new')
    if (!admins.some(row => row.kind === 'new')) setAdmins(current => [...current, newAdminRow()])
    setErrors(current => ({ ...current, admins: '' }))
    setSubmitError('')
  }

  const addAnotherAdmin = () => setAdmins(current => [...current, newAdminRow()])

  const removeAdmin = rowId => {
    setAdmins(current => current.filter(item => item.id !== rowId))
    setAdminErrors(current => { const next = { ...current }; delete next[rowId]; return next })
  }

  const validate = () => {
    const fieldErrors = {}
    const rowErrors = {}
    const organizationName = values.name.trim()
    const organizationCode = values.code.trim()
    const contactPerson = values.contactPerson.trim()
    const email = values.email.trim()
    const address = values.address.trim()
    if (!organizationName) fieldErrors.name = 'Organization name is required.'
    else if (organizationName.length < 3 || organizationName.length > 30) fieldErrors.name = 'Use between 3 and 30 characters.'
    else if (!ORGANIZATION_NAME_PATTERN.test(organizationName)) fieldErrors.name = 'Use letters, numbers, spaces, and standard punctuation.'
    if (!organizationCode) fieldErrors.code = 'Organization code is required.'
    else if (!ORGANIZATION_CODE_PATTERN.test(organizationCode)) fieldErrors.code = 'Use 2-10 letters and numbers only.'
    if (contactPerson && (contactPerson.length < 2 || contactPerson.length > 30 || !PERSON_NAME_PATTERN.test(contactPerson))) fieldErrors.contactPerson = 'Enter a valid contact person name (2-30 letters).'
    if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) fieldErrors.email = 'Enter a valid email address (maximum 254 characters).'
    if (values.phone.trim() && !isValidIndianMobile(values.phone)) fieldErrors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6-9.'
    if (address && address.length > 250) fieldErrors.address = 'Address must not exceed 250 characters.'
    for (const name of ['area', 'city', 'district', 'state']) {
      const location = values[name].trim()
      if (location && (location.length < 2 || location.length > 100 || !LOCATION_NAME_PATTERN.test(location))) {
        fieldErrors[name] = 'Use 2-100 letters, numbers, spaces, or standard punctuation.'
      }
    }
    if (values.country === 'India' && values.pincode.trim() && !/^[1-9]\d{5}$/.test(values.pincode.trim())) fieldErrors.pincode = 'Enter a valid 6-digit Indian PIN code starting with 1-9.'
    else if (values.country !== 'India' && values.pincode.trim() && !/^[\p{L}\p{N}][\p{L}\p{N}\s-]{1,11}$/u.test(values.pincode.trim())) fieldErrors.pincode = 'Enter a valid postal code (2-12 letters or numbers).'
    if (!admins.length) fieldErrors.admins = 'Add or assign at least one College Admin.'

    const seenEmails = new Map()
    const seenUsers = new Map()
    admins.forEach(row => {
      const current = {}
      const fullName = row.fullName.trim()
      if (row.kind === 'new' && !fullName) current.fullName = 'Full name is required.'
      else if (row.kind === 'new' && (fullName.length < 2 || fullName.length > 30 || !PERSON_NAME_PATTERN.test(fullName))) current.fullName = 'Enter a valid full name (2-30 letters).'
      if (row.kind === 'new' && row.initialPassword.length < 12) current.initialPassword = 'Password must be at least 12 characters.'
      else if (row.kind === 'new' && new TextEncoder().encode(row.initialPassword).length > 72) current.initialPassword = 'Password must not exceed 72 UTF-8 bytes.'
      if (!row.email.trim()) current.email = 'Admin email is required.'
      else if (row.email.trim().length > 254 || !EMAIL_PATTERN.test(row.email.trim())) current.email = 'Enter a valid email address (maximum 254 characters).'
      if (row.kind === 'new' && !row.phone.trim()) current.phone = 'Phone number is required.'
      else if (row.kind === 'new' && !isValidIndianMobile(row.phone)) current.phone = 'Enter a valid 10-digit Indian mobile number starting with 6-9.'
      if (row.kind === 'existing' && !row.userId) current.selection = 'Select an existing administrator.'

      const normalizedEmail = row.email.trim().toLowerCase()
      if (normalizedEmail && seenEmails.has(normalizedEmail)) {
        current.email = 'This administrator is already listed.'
        rowErrors[seenEmails.get(normalizedEmail)] = {
          ...rowErrors[seenEmails.get(normalizedEmail)],
          email: 'This administrator is already listed.',
        }
      } else if (normalizedEmail) seenEmails.set(normalizedEmail, row.id)
      if (row.userId && seenUsers.has(String(row.userId))) {
        current.selection = 'This administrator is already selected.'
        rowErrors[seenUsers.get(String(row.userId))] = {
          ...rowErrors[seenUsers.get(String(row.userId))],
          selection: 'This administrator is already selected.',
        }
      } else if (row.userId) seenUsers.set(String(row.userId), row.id)
      if (Object.keys(current).length) rowErrors[row.id] = { ...rowErrors[row.id], ...current }
    })

    setErrors(fieldErrors)
    setAdminErrors(rowErrors)
    return !Object.keys(fieldErrors).length && !Object.keys(rowErrors).length
  }

  const openAssignAdmin = async () => {
    if (assignOpen) {
      setAssignOpen(false)
      setAdminMode('none')
      return
    }
    setAdminMode('assign')
    setAssignOpen(true)
    setAssignSearch('')
    setAssignError('')
    setAssignLoading(true)
    try {
      const [users, mappings] = await Promise.all([
        loadAllUsers(),
        collegeUserMappingsApi.getAll(),
      ])
      const activeMappingsByUserId = new Map()
      mappings.filter(activeMapping).forEach(mapping => {
        activeMappingsByUserId.set(String(mapping.userId), mapping)
      })
      setExistingAdmins(users
        .filter(user => isCollegeAdmin(user) && isActive(user.status ?? user.accountStatus))
        .map(user => {
          const userId = user.userId ?? user.id
          const primaryCollegeId = user.collegeId ?? user.primaryCollegeId
          const mapping = activeMappingsByUserId.get(String(userId))
          const hasPrimaryCollege = primaryCollegeId != null && Number(primaryCollegeId) > 0
          const eligible = !hasPrimaryCollege && !mapping
          return {
            userId,
            fullName: user.fullName ?? user.name ?? '',
            email: user.email ?? '',
            phone: user.mobile ?? user.phone ?? '',
            status: isActive(user.status ?? user.accountStatus) ? '1' : '0',
            eligible,
          }
        })
        .filter(user => user.userId && user.fullName && user.email && user.eligible))
    } catch (error) {
      setAssignError(error?.message || 'Could not load eligible administrators.')
    } finally {
      setAssignLoading(false)
    }
  }

  const selectExistingAdmin = user => {
    if (!user.eligible) return
    const blankIndex = admins.findIndex(row => row.kind === 'new'
      && !row.fullName.trim()
      && !row.email.trim()
      && !row.phone.trim()
      && !row.initialPassword.trim())
    const selected = {
      id: blankIndex >= 0 ? admins[blankIndex].id : `pending-admin-${++nextAdminRowId}`,
      kind: 'existing',
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      currentStatus: user.status,
      userId: user.userId,
    }
    setAdmins(current => blankIndex >= 0
      ? current.map((row, index) => index === blankIndex ? selected : row)
      : [...current, selected])
    setAdminErrors(current => ({ ...current, [selected.id]: {} }))
    setAssignOpen(false)
    setAdminMode('none')
    setAssignError('')
    setErrors(current => ({ ...current, admins: '' }))
    setSubmitError('')
  }

  const ensureCollegeSetting = async collegeId => {
    if (collegeSettingId) return collegeSettingId
    try {
      const response = await getCollegeSettingsByCollegeId(collegeId)
      const id = settingIdentifier(response)
      if (!id) throw new Error('Organization settings were returned without an identifier.')
      setCollegeSettingId(id)
      return id
    } catch (error) {
      if (Number(error?.status ?? error?.response?.status) !== 404) throw error
      const response = await createCollegeSettings({
        collegeId,
        collegeName: values.name.trim(),
        collegeCode: values.code.trim(),
        collegeEmail: values.email.trim(),
        phoneNumber: values.phone.trim(),
        addressLine1: values.address.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
        status: 1,
      })
      const id = settingIdentifier(response)
      if (!id) throw new Error('Organization settings were created, but their identifier was not returned.')
      setCollegeSettingId(id)
      return id
    }
  }

  const submit = async event => {
    event.preventDefault()
    if (submitting || submitLock.current || !validate()) return
    if (access?.isSuperAdmin !== true) {
      setSubmitError(`Only the platform Super Admin can ${editId ? 'edit an organization' : 'create an organization'}.`)
      return
    }
    submitLock.current = true
    setSubmitting(true)
    setSubmitError('')
    let collegeId = editId || createdCollegeId
    let progress = { ...adminProgress }
    try {
      if (editId) {
        const original = originalCollegeRef.current || {}
        const organization = {
          ...original,
          name: values.name.trim(),
          collegeName: values.name.trim(),
          code: values.code.trim(),
          collegeCode: values.code.trim(),
          address: values.address.trim(),
          addressLine1: values.address.trim(),
          area: values.area.trim(),
          city: values.city.trim(),
          district: values.district.trim(),
          state: values.state.trim(),
          country: values.country,
          pincode: values.pincode.trim(),
          contact: values.phone.trim(),
          contactNumber: values.phone.trim(),
          phoneNumber: values.phone.trim(),
          email: values.email.trim(),
          collegeEmail: values.email.trim(),
          principal: values.contactPerson.trim(),
          principalName: values.contactPerson.trim(),
        }
        const response = await updateCollege(editId, organization)
        const updated = unwrapCollegeRecord(response)
        academicService?.clearCache?.()
        eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, {
          collegeId,
          college: { ...original, ...updated, ...organization, id: collegeId, collegeId },
        })
      } else if (!collegeId) {
        if (creationUnconfirmed) throw new Error('Organization creation could not be confirmed. Refresh the Organization directory before trying again.')
        const latestResponse = await getColleges()
        const latestData = latestResponse?.data?.data ?? latestResponse?.data ?? latestResponse
        const rows = Array.isArray(latestData) ? latestData : Array.isArray(latestData?.items) ? latestData.items : []
        const normalized = value => String(value || '').trim().toLowerCase()
        const duplicate = rows.find(row =>
          normalized(row.code ?? row.collegeCode) === normalized(values.code)
          || normalized(row.name ?? row.collegeName) === normalized(values.name))
        if (duplicate) throw new Error('An organization with the same name or code already exists.')

        let response
        try {
          response = await createCollege({
            name: values.name.trim(),
            code: values.code.trim(),
            address: values.address.trim(),
            addressLine1: values.address.trim(),
            area: values.area.trim(),
            city: values.city.trim(),
            district: values.district.trim(),
            state: values.state.trim(),
            country: values.country,
            pincode: values.pincode.trim(),
            contact: values.phone.trim(),
            email: values.email.trim(),
            principal: values.contactPerson.trim(),
          })
        } catch (error) {
          const status = Number(error?.status ?? error?.response?.status)
          if (status === 0 || status >= 500) setCreationUnconfirmed(true)
          throw error
        }
        collegeId = collegeIdFromResponse(response)
        if (!collegeId) throw new Error('Organization creation was confirmed, but the API did not return its identifier.')
        setCreatedCollegeId(collegeId)
        rememberCreated('colleges', collegeId)
        const created = unwrapCollegeRecord(response)
        academicService?.registerNewCollege?.({
          ...created,
          id: collegeId,
          collegeId,
          name: values.name.trim(),
          collegeName: values.name.trim(),
          code: values.code.trim(),
          collegeCode: values.code.trim(),
          status: 'Active',
        })
        academicService?.clearCache?.()
        eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { collegeId, college: created })
      }

      const settingId = await ensureCollegeSetting(collegeId)
      const hasNewAdmin = admins.some(row => row.kind === 'new' && !progress[row.id]?.userId)
      let collegeAdminRoleId = adminRoleId
      if (hasNewAdmin && !collegeAdminRoleId) {
        collegeAdminRoleId = roleIdentifier(await userDirectoryApi.lookups())
        if (!collegeAdminRoleId) throw new Error('The global College Admin role is not available in role lookups.')
        setAdminRoleId(collegeAdminRoleId)
      }

      for (const row of admins) {
        const current = { ...(progress[row.id] || {}) }
        let userId = current.userId ?? (row.kind === 'existing' ? row.userId : null)
        if (row.kind === 'new' && !userId) {
          if (current.invitationUnconfirmed) throw new Error(`The invitation for ${row.email} could not be confirmed. Refresh the user directory before retrying to avoid a duplicate account.`)
          let invitationError
          try {
            const response = await userDirectoryApi.create({
              collegeId,
              fullName: row.fullName.trim(),
              email: row.email.trim(),
              roleIds: [collegeAdminRoleId],
              mobile: row.phone.trim(),
              initialPassword: row.initialPassword,
            })
            userId = userIdentifier(response)
          } catch (error) {
            invitationError = error
          }
          if (!userId) {
            let users
            try {
              users = await loadAllUsers()
            } catch (recoveryError) {
              current.invitationUnconfirmed = true
              progress = { ...progress, [row.id]: current }
              setAdminProgress(progress)
              throw new Error(`${invitationError?.message || 'The invitation response did not include a user ID.'} Its result could not be confirmed: ${recoveryError?.message || 'user lookup failed'}. Refresh User Access Management before retrying.`)
            }
            const recovered = users.find(user =>
              String(user.email || '').trim().toLowerCase() === row.email.trim().toLowerCase()
              && String(user.collegeId ?? '') === String(collegeId)
              && isCollegeAdmin(user))
            userId = recovered?.userId ?? recovered?.id
            if (userId && invitationError) {
              current.userId = userId
              current.assigned = true
              progress = { ...progress, [row.id]: current }
              setAdminProgress(progress)
              throw new Error(`The College Admin account was saved, but the invitation request failed: ${invitationError?.message || 'delivery could not be confirmed'}. The account will not be recreated; use Resend Invitation in User Access Management if needed.`)
            }
            if (!userId && invitationError) throw invitationError
            if (!userId) {
              current.invitationUnconfirmed = true
              progress = { ...progress, [row.id]: current }
              setAdminProgress(progress)
              throw new Error(`The invitation for ${row.email} was submitted, but neither the response nor user lookup returned its ID. Refresh User Access Management before retrying.`)
            }
          }
          current.userId = userId
          current.assigned = true
          progress = { ...progress, [row.id]: current }
          setAdminProgress(progress)
        }

        if (row.kind === 'existing' && !current.assigned) {
          try {
            await collegeUserMappingsApi.assign({ userId, collegeSettingId: settingId })
          } catch (error) {
            const mappings = await collegeUserMappingsApi.getByUser(userId)
            const alreadyAssigned = mappings.some(mapping =>
              String(mapping.collegeSettingId) === String(settingId) && activeMapping(mapping))
            if (!alreadyAssigned) throw error
          }
          current.userId = userId
          current.assigned = true
          progress = { ...progress, [row.id]: current }
          setAdminProgress(progress)
        }

        const currentStatus = row.kind === 'existing' ? row.currentStatus : '1'
        if (!current.statusSaved && String(currentStatus) !== String(row.status)) {
          await userDirectoryApi.setStatus(userId, Number(row.status))
          current.statusSaved = true
          progress = { ...progress, [row.id]: current }
          setAdminProgress(progress)
        } else if (!current.statusSaved) {
          current.statusSaved = true
          progress = { ...progress, [row.id]: current }
          setAdminProgress(progress)
        }
      }

      if (!collegeStatusSaved && (editId
        ? String(values.status) !== String(originalStatusRef.current)
        : String(values.status) === '0')) {
        await updateCollegeStatus(collegeId, Number(values.status))
        setCollegeStatusSaved(true)
      } else if (!collegeStatusSaved) {
        setCollegeStatusSaved(true)
      }

      showSuccess(editId ? 'Organization and administrators updated successfully.' : 'Organization created and administrators assigned successfully.')
      if (onSaved) onSaved({ created: !editId })
      else onDismiss?.()
    } catch (error) {
      const apiDetails = error?.validationErrors && typeof error.validationErrors === 'object'
        ? Object.values(error.validationErrors).flat().filter(Boolean).join(' ')
        : ''
      setSubmitError([error?.message, apiDetails].filter((message, index, list) => message && list.indexOf(message) === index).join(' ') || `Organization ${editId ? 'update' : 'creation'} could not be completed. Your form values have been retained.`)
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  const formTitle = editId ? 'Edit Organization' : 'Create Organization'
  const submitLabel = editId ? 'Save Organization' : 'Create Organization'
  if (accessLoading) return <ViewDialog title={formTitle} onClose={onDismiss} maxWidth="1040px" showExport={false}><p role="status">Loading account access…</p></ViewDialog>
  if (access?.isSuperAdmin !== true) return <ViewDialog title={formTitle} onClose={onDismiss} maxWidth="1040px" showExport={false}><p role="alert">Only the platform Super Admin can access organization management.</p></ViewDialog>

  const field = (label, name, type = 'text', options = {}) => (
    <div className={`college-create-field${options.full ? ' college-create-field--full' : ''}`} key={name}>
      <label htmlFor={`college-create-${name}`}>{label}{options.required && <span aria-hidden="true"> *</span>}</label>
      {options.multiline
        ? <textarea id={`college-create-${name}`} rows="3" maxLength={options.maxLength} value={values[name]} onChange={event => updateValue(name, event.target.value)} aria-invalid={Boolean(errors[name])} />
        : options.select
        ? <select id={`college-create-${name}`} value={values[name]} onChange={event => updateValue(name, event.target.value)} aria-invalid={Boolean(errors[name])}>
          {options.select.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        : <input id={`college-create-${name}`} type={type} maxLength={options.maxLength} inputMode={options.inputMode} value={values[name]} onChange={event => updateValue(name, event.target.value)} aria-invalid={Boolean(errors[name])} />}
      {options.hint && <small>{options.hint}</small>}
      {errors[name] && <small className="college-create-error" role="alert">{errors[name]}</small>}
    </div>
  )

  const form = <form className="college-create-form" onSubmit={submit} noValidate>
    {submitError && <div className="college-create-alert" role="alert">{submitError}{createdCollegeId && <span> Organization #{createdCollegeId} is already saved; retry to finish pending assignments.</span>}{creationUnconfirmed && <span> Refresh the Organization directory before retrying to avoid a duplicate.</span>}</div>}
    {formLoading && <p role="status">Loading organization and administrator assignments…</p>}
    {formLoadError && <div className="college-create-alert" role="alert">{formLoadError}</div>}
    <section className="college-create-section" aria-labelledby="college-create-contact-title">
      <header><div><h2 id="college-create-contact-title">Organization Details</h2><p>Organization identity and primary contact information</p></div></header>
      <div className="college-create-grid">
        {field('Organization Name', 'name', 'text', { required: true, maxLength: 30 })}
        {field('Organization Code', 'code', 'text', { required: true, maxLength: 10 })}
        {field('Contact Person', 'contactPerson', 'text', { maxLength: 30 })}
        {field('Email', 'email', 'email', { maxLength: 254 })}
        {field('Phone Number', 'phone', 'tel', { maxLength: 20, hint: '10-digit Indian mobile number starting with 6-9.' })}
        {field('Status', 'status', 'text', { select: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] })}
      </div>
      <p className="college-create-note">Contact Person is saved to the organization record’s existing Principal field.</p>
    </section>

    <section className="college-create-section" aria-labelledby="college-create-address-title">
      <header><div><h2 id="college-create-address-title">Address Details</h2><p>Enter a PIN code to fill its area, city, district, and state.</p></div></header>
      <div className="college-create-grid">
        {field('Address', 'address', 'text', { full: true, multiline: true, maxLength: 250 })}
        {field('City', 'city', 'text', { maxLength: 100 })}
        {field('District', 'district', 'text', { maxLength: 100 })}
        {field('State', 'state')}
        {field('Country', 'country')}
        <div className="college-create-field" key="pincode">
          <label htmlFor="college-create-pincode">{values.country === 'India' ? 'PIN Code' : 'Postal Code'}</label>
          <input id="college-create-pincode" name="pincode" type="text" inputMode={values.country === 'India' ? 'numeric' : 'text'} autoComplete="postal-code" maxLength={values.country === 'India' ? 6 : 12} value={values.pincode}
            placeholder={values.country === 'India' ? '6-digit PIN code' : 'Enter postal code'}
            onChange={event => updateValue('pincode', values.country === 'India' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value.slice(0, 12))}
            aria-invalid={Boolean(errors.pincode)} aria-describedby={errors.pincode ? 'college-create-pincode-error college-create-pincode-hint' : 'college-create-pincode-hint'} />
          {errors.pincode && <small id="college-create-pincode-error" className="college-create-error" role="alert">{errors.pincode}</small>}
          <small id="college-create-pincode-hint" className={`college-create-pincode-status${/filled|selected|restored/i.test(pincodeStatus) ? ' is-success' : /could not|failed|no post offices|valid 6-digit/i.test(pincodeStatus) ? ' is-error' : pincodeStatus ? ' is-pending' : ''}`} role="status">
            {pincodeLoading ? 'Loading post offices…' : pincodeStatus || (values.country === 'India' ? 'Enter 6 digits to find post offices.' : 'Enter the postal code for this location.')}
          </small>
        </div>
        <div className="college-create-field" key="post-office">
          <label htmlFor="college-create-post-office">Post Office / Area</label>
          <SearchableSelect
            label="Post Office / Area"
            value={values.area}
            options={postOfficeOptions}
            onChange={selectPostOffice}
            placeholder={pincodeLoading ? 'Loading post offices…' : postOffices.length ? 'Select a post office' : values.area || 'Enter a valid PIN code first'}
            searchPlaceholder="Search post offices…"
            noOptionsMessage={pincodeStatus.toLowerCase().includes('no post offices') ? pincodeStatus : 'No post offices found for this PIN code.'}
            loading={pincodeLoading}
            disabled={values.country !== 'India' || !/^\d{6}$/.test(values.pincode.trim()) || pincodeLoading || (!postOffices.length && !values.area)}
            error={Boolean(errors.area)}
            triggerProps={{ id: 'college-create-post-office', 'aria-describedby': errors.area ? 'college-create-post-office-error' : undefined }}
          />
          {errors.area && <small id="college-create-post-office-error" className="college-create-error" role="alert">{errors.area}</small>}
          {postOffices.length > 1 && !values.area && <small className="college-create-pincode-status is-pending" role="status">Select the correct post office to fill the address.</small>}
        </div>
      </div>
    </section>

    <section className="college-create-section" aria-labelledby="college-create-admin-title">
      <header className="college-create-section-heading">
        <div><h2 id="college-create-admin-title">Administrators</h2><p>Add a new admin or assign an existing unassigned account</p></div>
        <div className="college-create-inline-actions">
          <div className="college-create-assign-trigger">
            <button type="button" className="college-create-secondary" onClick={openAssignAdmin} disabled={submitting || assignLoading} aria-expanded={assignOpen} aria-controls="college-create-admin-dropdown">Assign Admin</button>
            {assignOpen && <div id="college-create-admin-dropdown" className="college-create-assignment" role="region" aria-label="Assign existing College Admin">
              <div className="college-create-assignment-heading"><h3>Assign Existing Admin</h3><button type="button" className="college-create-link" onClick={() => { setAssignOpen(false); setAdminMode('none') }}>Close</button></div>
              <label htmlFor="college-create-admin-search">Search unassigned College Admins</label>
              <input id="college-create-admin-search" type="search" value={assignSearch} onChange={event => setAssignSearch(event.target.value)} placeholder="Search by name or email" />
              {assignLoading && <p role="status">Loading active administrators…</p>}
              {assignError && <p className="college-create-error" role="alert">{assignError}</p>}
              {!assignLoading && !assignError && !filteredEligibleAdmins.length && <p>No unassigned active College Admins match your search.</p>}
              {filteredEligibleAdmins.length > 0 && <ul className="college-create-admin-options" aria-label="Unassigned active College Admins">
                {filteredEligibleAdmins.map(user => <li key={user.userId}>
                  <button type="button" onClick={() => selectExistingAdmin(user)} title={`Assign ${user.fullName}`}>
                    <strong>{user.fullName}</strong><span>{user.email}</span>
                  </button>
                </li>)}
              </ul>}
            </div>}
          </div>
          <button type="button" className={`college-create-secondary${adminMode === 'new' ? ' is-active' : ''}`} onClick={toggleAddAdmin} disabled={submitting} aria-expanded={adminMode === 'new'}>
            {adminMode === 'new' ? 'Hide Admin Form' : 'Add Admin'}
          </button>
        </div>
      </header>
      {adminMode === 'new' && <p className="college-create-note">New administrators receive a secure account-setup email. The password below is temporary; the administrator must choose a new password using that link. Admin Status changes the user account status.</p>}
      {adminMode === 'assign' && <p className="college-create-note">Only active College Admin accounts without an existing College assignment are available here.</p>}
      {errors.admins && <p className="college-create-error" role="alert">{errors.admins}</p>}
      {!assignOpen && admins.length === 0 && <p className="college-create-note">Choose Add Admin to enter administrator credentials, or Assign Admin to select an unassigned account.</p>}
      {adminMode === 'new' && admins.filter(row => row.kind === 'new').map((row, index) => <fieldset className="college-create-admin-row" key={row.id}>
        <legend>New administrator {index + 1}</legend>
        <div className="college-create-grid">
          <div className="college-create-field">
            <label htmlFor={`${row.id}-name`}>Full Name <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-name`} maxLength="30" value={row.fullName} onChange={event => updateAdmin(row.id, 'fullName', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.fullName)} />
            {adminErrors[row.id]?.fullName && <small className="college-create-error">{adminErrors[row.id].fullName}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-phone`}>Phone Number <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-phone`} type="tel" inputMode="tel" maxLength="20" value={row.phone} onChange={event => updateAdmin(row.id, 'phone', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.phone)} />
            {adminErrors[row.id]?.phone && <small className="college-create-error">{adminErrors[row.id].phone}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-email`}>Admin Email <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-email`} type="email" maxLength="254" value={row.email} onChange={event => updateAdmin(row.id, 'email', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.email)} />
            {adminErrors[row.id]?.email && <small className="college-create-error">{adminErrors[row.id].email}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-password`}>Admin Password <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-password`} type="password" autoComplete="new-password" maxLength="72" value={row.initialPassword} onChange={event => updateAdmin(row.id, 'initialPassword', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.initialPassword)} />
            {adminErrors[row.id]?.initialPassword && <small className="college-create-error">{adminErrors[row.id].initialPassword}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-status`}>Admin Status</label>
            <select id={`${row.id}-status`} value={row.status} onChange={event => updateAdmin(row.id, 'status', event.target.value)}>
              <option value="1">Active</option><option value="0">Inactive</option>
            </select>
          </div>
          <div className="college-create-row-actions">
            <button type="button" className="college-create-remove" onClick={() => removeAdmin(row.id)} disabled={submitting}>Remove</button>
          </div>
        </div>
      </fieldset>)}
      {adminMode === 'new' && <button type="button" className="college-create-link college-create-add-another" onClick={addAnotherAdmin} disabled={submitting}>Add another administrator</button>}
      {admins.filter(row => row.kind === 'existing').length > 0 && <div className="college-create-assigned-admins" aria-label="Assigned administrators">
        {admins.filter(row => row.kind === 'existing').map((row, index) => <div className="college-create-assigned-admin" key={row.id}>
          <span><strong>{row.alreadyAssigned ? 'Current administrator' : `Assigned administrator ${index + 1}`}</strong><small>{row.fullName} · {row.email}</small></span>
          {!row.alreadyAssigned && <button type="button" className="college-create-remove" onClick={() => removeAdmin(row.id)} disabled={submitting}>Remove</button>}
        </div>)}
      </div>}
      {adminMode !== 'new' && admins.filter(row => row.kind === 'new').length > 0 && <div className="college-create-assigned-admins" aria-label="New administrator drafts">
        {admins.filter(row => row.kind === 'new').map((row, index) => <div className="college-create-assigned-admin" key={row.id}>
          <span><strong>New administrator draft {index + 1}</strong><small>{row.fullName || 'Name not entered'}{row.email ? ` · ${row.email}` : ''}</small>{Object.values(adminErrors[row.id] || {}).filter(Boolean).map((message, errorIndex) => <small className="college-create-error" key={`${row.id}-error-${errorIndex}`}>{message}</small>)}</span>
          <button type="button" className="college-create-link" onClick={() => setAdminMode('new')}>Edit details</button>
        </div>)}
      </div>}

    </section>

    <footer className="college-create-footer">
      <button type="button" className="college-create-secondary" onClick={onDismiss} disabled={submitting}>Cancel</button>
      <button type="submit" className="college-create-primary" disabled={submitting || creationUnconfirmed || formLoading || Boolean(formLoadError)}>{submitting ? (editId ? 'Saving Organization…' : 'Creating Organization…') : submitLabel}</button>
    </footer>
  </form>

  return <ViewDialog title={formTitle} subtitle={editId ? 'Update organization information and administrator assignments' : 'Create an organization and configure its administrators'} className="college-create-dialog" maxWidth="1040px" onClose={onDismiss} busy={submitting} showExport={false} hideFooter>
    {form}
  </ViewDialog>
}
