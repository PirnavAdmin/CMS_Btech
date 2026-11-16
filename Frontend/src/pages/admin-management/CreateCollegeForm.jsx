import { useMemo, useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { collegeUserMappingsApi, userDirectoryApi } from '../../api/apiEndpoints'
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
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
]
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other']
const COLLEGE_TYPES = ['Engineering College', 'Degree College', 'University', 'Autonomous College', 'Affiliated College', 'Deemed University', 'Others']
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
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    collegeType: '',
    collegeTypeOther: '',
    universityName: '',
  })
  const [admins, setAdmins] = useState([newAdminRow()])
  const [errors, setErrors] = useState({})
  const [adminErrors, setAdminErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)
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

  const filteredEligibleAdmins = useMemo(() => {
    const term = assignSearch.trim().toLowerCase()
    const selectedIds = new Set(admins.filter(row => row.kind === 'existing').map(row => String(row.userId)))
    return existingAdmins.filter(user => {
      if (selectedIds.has(String(user.userId))) return false
      return !term || `${user.fullName} ${user.email}`.toLowerCase().includes(term)
    })
  }, [admins, assignSearch, existingAdmins])

  const updateValue = (field, value) => {
    setValues(current => ({
      ...current,
      [field]: value,
      ...(field === 'collegeType' && !['Other', 'Others'].includes(value) ? { collegeTypeOther: '' } : {}),
    }))
    setErrors(current => ({ ...current, [field]: '' }))
    setSubmitError('')
  }

  const updateAdmin = (rowId, field, value) => {
    setAdmins(current => current.map(row => row.id === rowId ? { ...row, [field]: value } : row))
    setAdminErrors(current => ({ ...current, [rowId]: { ...current[rowId], [field]: '' } }))
    setSubmitError('')
  }

  const validate = () => {
    const fieldErrors = {}
    const rowErrors = {}
    if (!values.name.trim()) fieldErrors.name = 'College name is required.'
    if (!values.code.trim()) fieldErrors.code = 'College code is required.'
    if (['Other', 'Others'].includes(values.collegeType) && !values.collegeTypeOther.trim()) fieldErrors.collegeTypeOther = 'Enter the college type.'
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) fieldErrors.email = 'Enter a valid email address.'
    if (values.phone.trim() && !/^[0-9+()\-\s]{7,20}$/.test(values.phone.trim())) fieldErrors.phone = 'Enter a valid phone number.'
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
      return
    }
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
            unavailableReason: mapping
              ? `Already assigned to ${mapping.collegeName || 'another College'}`
              : hasPrimaryCollege ? 'Already scoped to another College' : '',
          }
        })
        .filter(user => user.userId && user.fullName && user.email))
    } catch (error) {
      setAssignError(error?.message || 'Could not load eligible administrators.')
    } finally {
      setAssignLoading(false)
    }
  }

  const selectExistingAdmin = user => {
    if (!user.eligible) return
    const blankIndex = admins.findIndex(row => row.kind === 'new' && !row.fullName.trim() && !row.email.trim() && !row.phone.trim())
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
    setAssignError('')
    setSubmitError('')
  }

  const ensureCollegeSetting = async collegeId => {
    if (collegeSettingId) return collegeSettingId
    try {
      const response = await getCollegeSettingsByCollegeId(collegeId)
      const id = settingIdentifier(response)
      if (!id) throw new Error('College settings were returned without an identifier.')
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
        institutionType: values.collegeType.trim(),
        status: 1,
      })
      const id = settingIdentifier(response)
      if (!id) throw new Error('College settings were created, but their identifier was not returned.')
      setCollegeSettingId(id)
      return id
    }
  }

  const submit = async event => {
    event.preventDefault()
    if (submitting || submitLock.current || !validate()) return
    if (access?.isSuperAdmin !== true) {
      setSubmitError('Only the platform Super Admin can create a college.')
      return
    }
    submitLock.current = true
    setSubmitting(true)
    setSubmitError('')
    let collegeId = createdCollegeId
    let progress = { ...adminProgress }
    try {
      if (!collegeId) {
        if (creationUnconfirmed) throw new Error('College creation could not be confirmed. Refresh the College directory before trying again.')
        const latestResponse = await getColleges()
        const latestData = latestResponse?.data?.data ?? latestResponse?.data ?? latestResponse
        const rows = Array.isArray(latestData) ? latestData : Array.isArray(latestData?.items) ? latestData.items : []
        const normalized = value => String(value || '').trim().toLowerCase()
        const duplicate = rows.find(row =>
          normalized(row.code ?? row.collegeCode) === normalized(values.code)
          || normalized(row.name ?? row.collegeName) === normalized(values.name))
        if (duplicate) throw new Error('A college with the same name or code already exists.')

        let response
        try {
          response = await createCollege({
            name: values.name.trim(),
            code: values.code.trim(),
            type: ['Other', 'Others'].includes(values.collegeType) ? values.collegeTypeOther.trim() : values.collegeType.trim(),
            university: values.universityName.trim(),
            address: values.address.trim(),
            addressLine1: values.address.trim(),
            city: values.city.trim(),
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
        if (!collegeId) throw new Error('College creation was confirmed, but the API did not return its identifier.')
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

      showSuccess('College created and administrators assigned successfully.')
      if (onSaved) onSaved({ created: true })
      else onDismiss?.()
    } catch (error) {
      const apiDetails = error?.validationErrors && typeof error.validationErrors === 'object'
        ? Object.values(error.validationErrors).flat().filter(Boolean).join(' ')
        : ''
      setSubmitError([error?.message, apiDetails].filter((message, index, list) => message && list.indexOf(message) === index).join(' ') || 'College creation could not be completed. Your form values have been retained.')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  if (accessLoading) return <ViewDialog title="Create College" onClose={onDismiss} maxWidth="1040px" showExport={false}><p role="status">Loading account access…</p></ViewDialog>
  if (access?.isSuperAdmin !== true) return <ViewDialog title="Create College" onClose={onDismiss} maxWidth="1040px" showExport={false}><p role="alert">Only the platform Super Admin can access college creation.</p></ViewDialog>

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
    {submitError && <div className="college-create-alert" role="alert">{submitError}{createdCollegeId && <span> College #{createdCollegeId} is already saved; retry to finish pending assignments.</span>}{creationUnconfirmed && <span> Refresh the College directory before retrying to avoid a duplicate.</span>}</div>}
    <section className="college-create-section" aria-labelledby="college-create-contact-title">
      <header><div><h2 id="college-create-contact-title">Contact Details</h2><p>College identity and primary contact information</p></div></header>
      <div className="college-create-grid">
        {field('College Name', 'name', 'text', { required: true })}
        {field('College Code', 'code', 'text', { required: true })}
        {field('Contact Person', 'contactPerson')}
        {field('Email', 'email', 'email')}
        {field('Phone Number', 'phone', 'tel')}
        {field('Status', 'status', 'text', { select: [{ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }] })}
      </div>
      <p className="college-create-note">Contact Person is saved to the College record’s existing Principal field.</p>
    </section>

    <section className="college-create-section" aria-labelledby="college-create-address-title">
      <header><div><h2 id="college-create-address-title">Address Details</h2><p>College location and mailing address</p></div></header>
      <div className="college-create-grid">
        {field('Address', 'address', 'text', { full: true, multiline: true })}
        {field('City', 'city')}
        {values.country === 'India'
          ? <div className="college-create-field" key="state"><label htmlFor="college-create-state">State</label><select id="college-create-state" value={values.state} onChange={event => updateValue('state', event.target.value)}><option value="">Select state</option>{INDIA_STATES.map(state => <option key={state} value={state}>{state}</option>)}</select></div>
          : field('State', 'state')}
        {field('Country', 'country', 'text', { select: COUNTRIES.map(country => ({ value: country, label: country })) })}
        {field('PIN Code', 'pincode')}
      </div>
    </section>

    <section className="college-create-section" aria-labelledby="college-create-admin-title">
      <header className="college-create-section-heading">
        <div><h2 id="college-create-admin-title">Administrators</h2><p>Invite new College Admins or assign an unassigned existing account</p></div>
        <div className="college-create-inline-actions">
          <div className="college-create-assign-trigger">
            <button type="button" className="college-create-secondary" onClick={openAssignAdmin} disabled={submitting || assignLoading} aria-expanded={assignOpen} aria-controls="college-create-admin-dropdown">Assign Admin</button>
            {assignOpen && <div id="college-create-admin-dropdown" className="college-create-assignment" role="region" aria-label="Assign existing College Admin">
              <div className="college-create-assignment-heading"><h3>Assign Existing Admin</h3><button type="button" className="college-create-link" onClick={() => setAssignOpen(false)}>Close</button></div>
              <label htmlFor="college-create-admin-search">Search active College Admins</label>
              <input id="college-create-admin-search" type="search" value={assignSearch} onChange={event => setAssignSearch(event.target.value)} placeholder="Search by name or email" />
              {assignLoading && <p role="status">Loading active administrators…</p>}
              {assignError && <p className="college-create-error" role="alert">{assignError}</p>}
              {!assignLoading && !assignError && !filteredEligibleAdmins.length && <p>No additional active College Admins match your search.</p>}
              {filteredEligibleAdmins.length > 0 && <ul className="college-create-admin-options" aria-label="Active College Admins">
                {filteredEligibleAdmins.map(user => <li key={user.userId}>
                  <button type="button" onClick={() => selectExistingAdmin(user)} disabled={!user.eligible} title={user.unavailableReason || `Assign ${user.fullName}`}>
                    <strong>{user.fullName}</strong><span>{user.email}</span>
                    {!user.eligible && <small>{user.unavailableReason}</small>}
                  </button>
                </li>)}
              </ul>}
            </div>}
          </div>
          <button type="button" className="college-create-secondary" onClick={() => setAdmins(current => [...current, newAdminRow()])} disabled={submitting}>Add Admin</button>
        </div>
      </header>
      <p className="college-create-note">New administrators receive a secure account-setup email. The password below is temporary; the administrator must choose a new password using that link. Admin Status changes the user account status.</p>
      <p className="college-create-note">Active College Admins are listed; accounts already assigned to a College cannot be selected with the current assignment API.</p>
      {errors.admins && <p className="college-create-error" role="alert">{errors.admins}</p>}
      {admins.map((row, index) => <fieldset className="college-create-admin-row" key={row.id}>
        <legend>{row.kind === 'existing' ? `Assigned administrator ${index + 1}` : `New administrator ${index + 1}`}</legend>
        {row.kind === 'existing' && <p className="college-create-selected" role="status">Selected: <strong>{row.fullName}</strong> · {row.email}</p>}
        <div className="college-create-grid">
          <div className="college-create-field">
            <label htmlFor={`${row.id}-name`}>Full Name{row.kind === 'new' && <span aria-hidden="true"> *</span>}</label>
            <input id={`${row.id}-name`} value={row.fullName} readOnly={row.kind === 'existing'} onChange={event => updateAdmin(row.id, 'fullName', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.fullName)} />
            {adminErrors[row.id]?.fullName && <small className="college-create-error">{adminErrors[row.id].fullName}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-phone`}>Phone Number{row.kind === 'new' && <span aria-hidden="true"> *</span>}</label>
            <input id={`${row.id}-phone`} type="tel" value={row.phone} readOnly={row.kind === 'existing'} onChange={event => updateAdmin(row.id, 'phone', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.phone)} />
            {adminErrors[row.id]?.phone && <small className="college-create-error">{adminErrors[row.id].phone}</small>}
          </div>
          <div className="college-create-field">
            <label htmlFor={`${row.id}-email`}>Admin Email <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-email`} type="email" value={row.email} readOnly={row.kind === 'existing'} onChange={event => updateAdmin(row.id, 'email', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.email)} />
            {adminErrors[row.id]?.email && <small className="college-create-error">{adminErrors[row.id].email}</small>}
          </div>
          {row.kind === 'new' && <div className="college-create-field">
            <label htmlFor={`${row.id}-password`}>Admin Password <span aria-hidden="true">*</span></label>
            <input id={`${row.id}-password`} type="password" autoComplete="new-password" maxLength="72" value={row.initialPassword} onChange={event => updateAdmin(row.id, 'initialPassword', event.target.value)} aria-invalid={Boolean(adminErrors[row.id]?.initialPassword)} aria-describedby={`${row.id}-password-hint`} />
            <small id={`${row.id}-password-hint`}>At least 12 characters; maximum 72 UTF-8 bytes.</small>
            {adminErrors[row.id]?.initialPassword && <small className="college-create-error">{adminErrors[row.id].initialPassword}</small>}
          </div>}
          <div className="college-create-field">
            <label htmlFor={`${row.id}-status`}>Admin Status</label>
            <select id={`${row.id}-status`} value={row.status} onChange={event => updateAdmin(row.id, 'status', event.target.value)}>
              <option value="1">Active</option><option value="0">Inactive</option>
            </select>
          </div>
          {adminErrors[row.id]?.selection && <p className="college-create-error college-create-field--full">{adminErrors[row.id].selection}</p>}
          <div className="college-create-row-actions">
            {row.kind === 'new' && <button type="button" className="college-create-link" onClick={openAssignAdmin} disabled={submitting || assignLoading}>Assign Existing Admin</button>}
            <button type="button" className="college-create-remove" onClick={() => { setAdmins(current => current.filter(item => item.id !== row.id)); setAdminErrors(current => { const next = { ...current }; delete next[row.id]; return next }) }} disabled={submitting}>Remove</button>
          </div>
        </div>
      </fieldset>)}

    </section>

    <section className="college-create-section" aria-labelledby="college-create-extra-title">
      <header><div><h2 id="college-create-extra-title">College Details</h2><p>Additional fields retained from College management</p></div></header>
      <div className="college-create-grid">
        {field('College Type', 'collegeType', 'text', { select: [{ value: '', label: 'Select type' }, ...COLLEGE_TYPES.map(type => ({ value: type, label: type }))] })}
        {['Other', 'Others'].includes(values.collegeType) && field('Specify College Type', 'collegeTypeOther', 'text', { required: true })}
        {field('University Name', 'universityName')}
      </div>
    </section>

    <footer className="college-create-footer">
      <button type="button" className="college-create-secondary" onClick={onDismiss} disabled={submitting}>Cancel</button>
      <button type="submit" className="college-create-primary" disabled={submitting || creationUnconfirmed}>{submitting ? 'Creating College…' : 'Create College'}</button>
    </footer>
  </form>

  return <ViewDialog title="Create College" subtitle="Create a College and configure its administrators" className="college-create-dialog" maxWidth="1040px" onClose={onDismiss} busy={submitting} showExport={false} hideFooter>
    {form}
  </ViewDialog>
}
