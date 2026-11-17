import { useEffect, useMemo, useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { collegeUserMappingsApi, lookupIndianPincode, userDirectoryApi } from '../../api/apiEndpoints'
import {
  createCollege,
  createCollegeSettings,
  getCollegeSettingsByCollegeId,
  getColleges,
  updateCollegeStatus,
  unwrapCollegeRecord,
} from '../../auth/collegeApi'
import { useScreenAccess } from '../../auth/ScreenAccess'
import academicService from '../../services/academicService'
import eventBus, { ERP_EVENTS } from '../../services/eventBus'
import { rememberCreated } from '../../utils/newestFirst'
import { showSuccess } from '../../utils/toast'
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

export default function CreateCollegeForm({ onDismiss, onSaved }) {
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

  useEffect(() => {
    const pincode = values.pincode.trim()
    const lookupId = ++pincodeLookupRef.current
    if (values.country !== 'India' || !/^\d{6}$/.test(pincode)) {
      setPincodeStatus('')
      return undefined
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setPincodeStatus('Finding address details…')
      try {
        const location = await lookupIndianPincode(pincode)
        if (!active || lookupId !== pincodeLookupRef.current) return
        const country = normalizedCountry(location.country)
        const state = normalizedIndianState(location.state)
        setValues(current => {
          if (current.pincode.trim() !== pincode || current.country !== 'India') return current
          return {
            ...current,
            area: location.town || current.area,
            city: location.city || location.district || location.town || current.city,
            district: location.district || current.district,
            state: state || current.state,
            country,
          }
        })
        setErrors(current => ({ ...current, area: '', city: '', district: '', state: '' }))
        setPincodeStatus('Location details filled from this PIN code.')
      } catch (lookupError) {
        if (active && lookupId === pincodeLookupRef.current) {
          setPincodeStatus(lookupError?.message || 'Location lookup failed. Enter the address details manually.')
        }
      }
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [values.pincode, values.country])

  const filteredEligibleAdmins = useMemo(() => {
    const term = assignSearch.trim().toLowerCase()
    const selectedIds = new Set(admins.filter(row => row.kind === 'existing').map(row => String(row.userId)))
    return existingAdmins.filter(user => {
      if (!user.eligible || selectedIds.has(String(user.userId))) return false
      return !term || `${user.fullName} ${user.email}`.toLowerCase().includes(term)
    })
  }, [admins, assignSearch, existingAdmins])

  const updateValue = (field, value) => {
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
    if (!values.name.trim()) fieldErrors.name = 'Organization name is required.'
    if (!values.code.trim()) fieldErrors.code = 'Organization code is required.'
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) fieldErrors.email = 'Enter a valid email address.'
    if (values.phone.trim() && !/^[0-9+()\-\s]{7,20}$/.test(values.phone.trim())) fieldErrors.phone = 'Enter a valid phone number.'
    if (values.country === 'India' && values.pincode.trim() && !/^\d{6}$/.test(values.pincode.trim())) fieldErrors.pincode = 'Enter a valid 6-digit PIN code.'
    if (!admins.length) fieldErrors.admins = 'Add or assign at least one College Admin.'

    const seenEmails = new Map()
    const seenUsers = new Map()
    admins.forEach(row => {
      const current = {}
      if (row.kind === 'new' && !row.fullName.trim()) current.fullName = 'Full name is required.'
      if (row.kind === 'new' && row.initialPassword.length < 12) current.initialPassword = 'Password must be at least 12 characters.'
      else if (row.kind === 'new' && new TextEncoder().encode(row.initialPassword).length > 72) current.initialPassword = 'Password must not exceed 72 UTF-8 bytes.'
      if (!row.email.trim()) current.email = 'Admin email is required.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) current.email = 'Enter a valid email address.'
      if (row.kind === 'new' && !row.phone.trim()) current.phone = 'Phone number is required.'
      else if (row.phone.trim() && !/^[0-9+()\-\s]{7,20}$/.test(row.phone.trim())) current.phone = 'Enter a valid phone number.'
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
      setSubmitError('Only the platform Super Admin can create an organization.')
      return
    }
    submitLock.current = true
    setSubmitting(true)
    setSubmitError('')
    let collegeId = createdCollegeId
    let progress = { ...adminProgress }
    try {
      if (!collegeId) {
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

      if (!collegeStatusSaved && String(values.status) === '0') {
        await updateCollegeStatus(collegeId, 0)
        setCollegeStatusSaved(true)
      } else if (!collegeStatusSaved) {
        setCollegeStatusSaved(true)
      }

      showSuccess('Organization created and administrators assigned successfully.')
      if (onSaved) onSaved({ created: true })
      else onDismiss?.()
    } catch (error) {
      const apiDetails = error?.validationErrors && typeof error.validationErrors === 'object'
        ? Object.values(error.validationErrors).flat().filter(Boolean).join(' ')
        : ''
      setSubmitError([error?.message, apiDetails].filter((message, index, list) => message && list.indexOf(message) === index).join(' ') || 'Organization creation could not be completed. Your form values have been retained.')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  if (accessLoading) return <ViewDialog title="Create Organization" onClose={onDismiss} maxWidth="1040px" showExport={false}><p role="status">Loading account access…</p></ViewDialog>
  if (access?.isSuperAdmin !== true) return <ViewDialog title="Create Organization" onClose={onDismiss} maxWidth="1040px" showExport={false}><p role="alert">Only the platform Super Admin can access organization creation.</p></ViewDialog>

  const field = (label, name, type = 'text', options = {}) => (
    <div className={`college-create-field${options.full ? ' college-create-field--full' : ''}`} key={name}>
      <label htmlFor={`college-create-${name}`}>{label}{options.required && <span aria-hidden="true"> *</span>}</label>
      {options.multiline
        ? <textarea id={`college-create-${name}`} rows="3" value={values[name]} onChange={event => updateValue(name, event.target.value)} aria-invalid={Boolean(errors[name])} />
        : options.select
        ? <select id={`college-create-${name}`} value={values[name]} onChange={event => updateValue(name, event.target.value)} aria-invalid={Boolean(errors[name])}>
          {options.select.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        : <input id={`college-create-${name}`} type={type} value={values[name]} onChange={event => updateValue(name, event.target.value)} aria-invalid={Boolean(errors[name])} />}
      {errors[name] && <small className="college-create-error">{errors[name]}</small>}
    </div>
  )

  const form = <form className="college-create-form" onSubmit={submit} noValidate>
    {submitError && <div className="college-create-alert" role="alert">{submitError}{createdCollegeId && <span> Organization #{createdCollegeId} is already saved; retry to finish pending assignments.</span>}{creationUnconfirmed && <span> Refresh the Organization directory before retrying to avoid a duplicate.</span>}</div>}
    <section className="college-create-section" aria-labelledby="college-create-contact-title">
      <header><div><h2 id="college-create-contact-title">Contact Details</h2><p>Organization identity and primary contact information</p></div></header>
      <div className="college-create-grid">
        {field('Organization Name', 'name', 'text', { required: true })}
        {field('Organization Code', 'code', 'text', { required: true })}
        {field('Contact Person', 'contactPerson')}
        {field('Email', 'email', 'email')}
        {field('Phone Number', 'phone', 'tel')}
        {field('Status', 'status', 'text', { select: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] })}
      </div>
      <p className="college-create-note">Contact Person is saved to the organization record’s existing Principal field.</p>
    </section>

    <section className="college-create-section" aria-labelledby="college-create-address-title">
      <header><div><h2 id="college-create-address-title">Address Details</h2><p>Enter a PIN code to fill its area, city, district, and state.</p></div></header>
      <div className="college-create-grid">
        {field('Address', 'address', 'text', { full: true, multiline: true })}
        {field('Area / Post Office', 'area')}
        {field('City', 'city')}
        {field('District', 'district')}
        {values.country === 'India'
          ? <div className="college-create-field" key="state"><label htmlFor="college-create-state">State</label><select id="college-create-state" value={values.state} onChange={event => updateValue('state', event.target.value)}><option value="">Select state</option>{values.state && !INDIA_STATES.includes(values.state) && <option value={values.state}>{values.state}</option>}{INDIA_STATES.map(state => <option key={state} value={state}>{state}</option>)}</select></div>
          : field('State', 'state')}
        {field('Country', 'country', 'text', { select: [...(values.country && !COUNTRIES.includes(values.country) ? [{ value: values.country, label: values.country }] : []), ...COUNTRIES.map(country => ({ value: country, label: country }))] })}
        <div className="college-create-field" key="pincode">
          <label htmlFor="college-create-pincode">{values.country === 'India' ? 'PIN Code' : 'Postal Code'}</label>
          <input id="college-create-pincode" name="pincode" type="text" inputMode={values.country === 'India' ? 'numeric' : 'text'} autoComplete="postal-code" maxLength={values.country === 'India' ? 6 : 12} value={values.pincode}
            placeholder={values.country === 'India' ? '6-digit PIN code' : 'Enter postal code'}
            onChange={event => updateValue('pincode', values.country === 'India' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value.slice(0, 12))}
            aria-invalid={Boolean(errors.pincode)} aria-describedby={errors.pincode ? 'college-create-pincode-error college-create-pincode-hint' : 'college-create-pincode-hint'} />
          {errors.pincode && <small id="college-create-pincode-error" className="college-create-error" role="alert">{errors.pincode}</small>}
          <small id="college-create-pincode-hint" className={`college-create-pincode-status${pincodeStatus.startsWith('Location details') ? ' is-success' : /could not|failed/i.test(pincodeStatus) ? ' is-error' : pincodeStatus ? ' is-pending' : ''}`} role="status">
            {pincodeStatus || (values.country === 'India' ? 'Enter 6 digits to fill area, city, district, and state.' : 'Enter the postal code for this location.')}
          </small>
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
            <input id={`${row.id}-name`} value={row.fullName} onChange={event => updateAdmin(row.id, 'fullName', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.fullName)} />
            {adminErrors[row.id]?.fullName && <small className="college-create-error">{adminErrors[row.id].fullName}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-phone`}>Phone Number <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-phone`} type="tel" value={row.phone} onChange={event => updateAdmin(row.id, 'phone', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.phone)} />
            {adminErrors[row.id]?.phone && <small className="college-create-error">{adminErrors[row.id].phone}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-email`}>Admin Email <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-email`} type="email" value={row.email} onChange={event => updateAdmin(row.id, 'email', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.email)} />
            {adminErrors[row.id]?.email && <small className="college-create-error">{adminErrors[row.id].email}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-password`}>Admin Password <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-password`} type="password" autoComplete="new-password" maxLength="72" value={row.initialPassword} onChange={event => updateAdmin(row.id, 'initialPassword', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.initialPassword)} aria-describedby={`${row.id}-password-hint`} />
            <small id={`${row.id}-password-hint`}>At least 12 characters; maximum 72 UTF-8 bytes.</small>
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
          <span><strong>Assigned administrator {index + 1}</strong><small>{row.fullName} · {row.email}</small></span>
          <button type="button" className="college-create-remove" onClick={() => removeAdmin(row.id)} disabled={submitting}>Remove</button>
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
      <button type="submit" className="college-create-primary" disabled={submitting || creationUnconfirmed}>{submitting ? 'Creating Organization…' : 'Create Organization'}</button>
    </footer>
  </form>

  return <ViewDialog title="Create Organization" subtitle="Create an organization and configure its administrators" className="college-create-dialog" maxWidth="1040px" onClose={onDismiss} busy={submitting} showExport={false} hideFooter>
    {form}
  </ViewDialog>
}
